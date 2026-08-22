<?php

declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8');

// API de e-mail central do ecossistema. Autentica (Bearer por app) -> renderiza
// (renderizador da marca em src/) -> envia pela Resend. Único lugar com a chave da Resend.
//
// Layout: este index.php vive em public_html/api/email/ dentro do monorepo do site.
// src/ é subpasta (bloqueada pelo .htaccess). Segredos (.env, apps.json) e .ratelimit/
// ficam TRÊS NÍVEIS ACIMA, ao lado do public_html (fora da web) -> daí os
// `__DIR__ . '/../../../...'` abaixo.
require_once __DIR__ . '/src/EmailRenderer.php';
require_once __DIR__ . '/src/email.php';   // lógica pura (testável)

function jsonOut(int $code, array $data): void
{
    http_response_code($code);
    echo json_encode($data);
    exit;
}

// Lê o header Authorization do request (com fallback — LiteSpeed/Apache às vezes
// não repassam) e delega a extração do token pra parse_bearer (src/email.php).
function bearerToken(): string
{
    $h = $_SERVER['HTTP_AUTHORIZATION'] ?? ($_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '');
    if ($h === '' && function_exists('getallheaders')) {
        foreach (getallheaders() as $k => $v) {
            if (strcasecmp($k, 'Authorization') === 0) {
                $h = $v;
                break;
            }
        }
    }
    return parse_bearer($h);
}

// Rate limit por chave: lê/atualiza o estado num arquivo (um por app) sob flock,
// delegando a decisão a rate_limit_check (pura). fail-open se o arquivo não abrir
// (o freio é defesa em profundidade — não deve derrubar o envio por erro de FS).
// ponytail: janela fixa por arquivo com flock, não-distribuída; APCu/Redis só se
// o volume exigir.
function rate_limit_hit(string $dir, string $key, int $now, int $limit): array
{
    if (! is_dir($dir)) {
        @mkdir($dir, 0700, true);
    }
    $file = $dir . '/' . hash('sha256', $key);
    $fh   = @fopen($file, 'c+');
    if ($fh === false) {
        return ['allowed' => true, 'retry' => 0];
    }
    flock($fh, LOCK_EX);
    $raw   = (string) stream_get_contents($fh);
    $parts = $raw === '' ? [] : explode(' ', trim($raw));
    $state = ['windowStart' => (int) ($parts[0] ?? 0), 'count' => (int) ($parts[1] ?? 0)];

    $res = rate_limit_check($state, $now, $limit);

    ftruncate($fh, 0);
    rewind($fh);
    fwrite($fh, $res['windowStart'] . ' ' . $res['count']);
    fflush($fh);
    flock($fh, LOCK_UN);
    fclose($fh);

    return ['allowed' => $res['allowed'], 'retry' => $res['retry']];
}

// --- Config (do .env acima do docroot: __DIR__ é o docroot -> um nível acima) ---
$env = load_env(__DIR__ . '/../../../.env');
$cfg = static function (string $key, string $default = '') use ($env): string {
    $sys = getenv($key);
    if ($sys !== false && $sys !== '') {
        return $sys;
    }
    return $env[$key] ?? $default;
};

$RESEND_API_KEY  = $cfg('RESEND_API_KEY');
$DEFAULT_FROM    = $cfg('MAIL_FROM', 'Nikolas Leme <formulario@nikolasleme.com.br>');
$FALLBACK_TO     = $cfg('MAIL_TO'); // fallback legado; o normal é `to` na request

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    jsonOut(405, ['ok' => false, 'error' => 'Método não permitido']);
}

// --- Auth: Bearer contra o apps.json (chave -> identidade), tempo constante ---
$apps = read_apps(__DIR__ . '/../../../apps.json');
if ($apps === []) {
    jsonOut(500, ['ok' => false, 'error' => 'Servidor sem apps configurados']);
}
$app = match_app($apps, bearerToken());
if ($app === null) {
    jsonOut(401, ['ok' => false, 'error' => 'Não autorizado']);
}

// --- Rate limit por app (override `rpm` no apps.json, senão RATE_LIMIT_PER_MIN) ---
$limit = $app['rpm'] ?? (int) $cfg('RATE_LIMIT_PER_MIN', '60');
$rl    = rate_limit_hit(__DIR__ . '/../../../.ratelimit', $app['name'], time(), $limit);
if (! $rl['allowed']) {
    header('Retry-After: ' . $rl['retry']);
    jsonOut(429, ['ok' => false, 'error' => 'Rate limit']);
}

if ($RESEND_API_KEY === '') {
    jsonOut(500, ['ok' => false, 'error' => 'Servidor sem chave configurada']);
}

// --- Corpo ---
$raw = file_get_contents('php://input');
if ($raw === false || strlen($raw) > 200000) {
    jsonOut(413, ['ok' => false, 'error' => 'Payload inválido']);
}
$data = json_decode($raw, true);
if (! is_array($data)) {
    jsonOut(400, ['ok' => false, 'error' => 'JSON inválido']);
}

$in = normalize_input($data);
if ($in['empty']) {
    jsonOut(400, ['ok' => false, 'error' => 'Conteúdo vazio']);
}
$subject = $in['subject'];

// Destinatário vem na request (fallback MAIL_TO legado); remetente é do app.
$to = resolve_to($data, $FALLBACK_TO);
if ($to === null) {
    jsonOut(400, ['ok' => false, 'error' => 'Destinatário inválido']);
}
$from    = resolve_from($app, $DEFAULT_FROM);
$replyTo = trim((string) ($data['replyTo'] ?? ''));

$opts = ['title' => $subject, 'preheader' => $in['preheader']];
$html = $in['mode'] === 'blocks'
    ? render_email_blocks($in['blocks'], $opts)
    : render_email_html($in['markdown'], $opts);

// --- Envia via Resend ---
$payload = ['from' => $from, 'to' => [$to], 'subject' => $subject, 'html' => $html];
if (filter_var($replyTo, FILTER_VALIDATE_EMAIL)) {
    $payload['reply_to'] = $replyTo;
}

$ch = curl_init('https://api.resend.com/emails');
curl_setopt_array($ch, [
    CURLOPT_POST           => true,
    CURLOPT_HTTPHEADER     => ['Authorization: Bearer ' . $RESEND_API_KEY, 'Content-Type: application/json'],
    CURLOPT_POSTFIELDS     => json_encode($payload),
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_TIMEOUT        => 15,
]);
$resp = curl_exec($ch);
$code = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
$err  = curl_error($ch);
curl_close($ch);

$result = map_resend_response($code, is_string($resp) ? $resp : null);
if ($result['ok']) {
    jsonOut(200, $result);
}

error_log('Resend falhou: ' . $code . ' ' . $err . ' ' . (string) $resp);
jsonOut(502, $result);
