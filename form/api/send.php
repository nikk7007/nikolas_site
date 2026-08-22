<?php
declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8');

// ---- Config sensível (NUNCA no código versionado) ----
// Vem do .env.form ao lado do public_html (public_html/form/api -> três níveis
// acima), FORA da raiz web (não é servido). O sufixo .form evita colisão com o
// .env da API de e-mail central, que mora no mesmo nível com as mesmas chaves.
// Env var do sistema tem prioridade.

// Lê um .env simples (KEY=valor, # comenta, aspas opcionais) num array.
function loadEnv(string $file): array
{
    $out = [];
    if (! is_file($file) || ! is_readable($file)) {
        return $out;
    }
    foreach (file($file, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $line) {
        $line = trim($line);
        if ($line === '' || $line[0] === '#') {
            continue;
        }
        $pos = strpos($line, '=');
        if ($pos === false) {
            continue;
        }
        $key = trim(substr($line, 0, $pos));
        if ($key === '') {
            continue;
        }
        $val = trim(substr($line, $pos + 1));
        if (strlen($val) >= 2 && ($val[0] === '"' || $val[0] === "'") && $val[strlen($val) - 1] === $val[0]) {
            $val = substr($val, 1, -1); // tira aspas envolventes
        }
        $out[$key] = $val;
    }
    return $out;
}

$env = loadEnv(__DIR__ . '/../../../.env.form');
$cfg = static function (string $key, string $default = '') use ($env): string {
    $sys = getenv($key);
    if ($sys !== false && $sys !== '') {
        return $sys;
    }
    return $env[$key] ?? $default;
};

$RESEND_API_KEY = $cfg('RESEND_API_KEY');
if ($RESEND_API_KEY === '' && is_file(__DIR__ . '/secrets.php')) {
    $RESEND_API_KEY = (string) (require __DIR__ . '/secrets.php');
}

// Remetente precisa estar num domínio verificado na Resend; destino é quem recebe.
$FROM = $cfg('MAIL_FROM', 'Formulário Nikolas Leme <formulario@nikolasleme.com.br>');
$DEST = $cfg('MAIL_TO', 'contato@nikolasleme.com.br');

// Rate limit por IP em janela deslizante, guardado em arquivo.
// ponytail: fail-open — se o dir temp não for gravável, não bloqueia (não quebra
// envio legítimo por causa da proteção anti-spam). Endurecer só se virar problema.
function rateLimited(string $ip, int $max, int $window): bool
{
    $dir = sys_get_temp_dir() . '/nls_rate';
    if (!is_dir($dir)) @mkdir($dir, 0700, true);
    $file = $dir . '/' . hash('sha256', $ip);
    $fp = @fopen($file, 'c+');
    if ($fp === false) {
        return false;
    }
    $limited = false;
    if (flock($fp, LOCK_EX)) {
        $now = time();
        $raw = stream_get_contents($fp);
        $times = $raw ? array_filter(
            array_map('intval', explode("\n", trim($raw))),
            static fn (int $t): bool => $t > $now - $window
        ) : [];
        $limited = count($times) >= $max;
        if (!$limited) {
            $times[] = $now;
            ftruncate($fp, 0);
            rewind($fp);
            fwrite($fp, implode("\n", $times));
        }
        flock($fp, LOCK_UN);
    }
    fclose($fp);
    return $limited;
}

// Só aceita POST.
if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    http_response_code(405);
    echo json_encode(['ok' => false, 'error' => 'Método não permitido']);
    exit;
}

// Máx. 10 envios por hora por IP (anti-flood / mailbomb / cota).
// REMOTE_ADDR é o IP confiável aqui; X-Forwarded-For seria falsificável.
$ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
if (rateLimited($ip, 10, 3600)) {
    http_response_code(429);
    echo json_encode(['ok' => false, 'error' => 'Muitas tentativas. Tente de novo mais tarde.']);
    exit;
}

if ($RESEND_API_KEY === '') {
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => 'Servidor sem chave configurada']);
    exit;
}

// Lê o corpo, com teto de tamanho.
$raw = file_get_contents('php://input');
if ($raw === false || strlen($raw) > 200000) {
    http_response_code(413);
    echo json_encode(['ok' => false, 'error' => 'Payload inválido']);
    exit;
}
$data = json_decode($raw, true);
if (!is_array($data)) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'JSON inválido']);
    exit;
}

// Honeypot: campo escondido preenchido = bot. Finge sucesso e não envia.
if (!empty($data['website'])) {
    echo json_encode(['ok' => true]);
    exit;
}

$subject   = trim(str_replace(["\r", "\n"], '', (string) ($data['subject'] ?? 'Briefing')));
$subject   = mb_substr($subject, 0, 200);
$preheader = mb_substr(trim(str_replace(["\r", "\n"], '', (string) ($data['preheader'] ?? $subject))), 0, 200);
$replyTo   = trim((string) ($data['replyTo'] ?? ''));

// Aceita conteúdo estruturado (blocks, pensado pra API futura) OU markdown.
$hasBlocks = isset($data['blocks']) && is_array($data['blocks']) && count($data['blocks']) > 0;
$markdown  = (string) ($data['markdown'] ?? '');

if (! $hasBlocks && trim($markdown) === '') {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'Conteúdo vazio']);
    exit;
}

// O HTML da marca é gerado AQUI (safe mode ligado) — o cliente nunca manda html.
// A lib canônica vive em /email-php e é copiada pra ./lib no build (copy-email-lib.mjs).
require_once __DIR__ . '/lib/EmailRenderer.php';
$opts = ['title' => $subject, 'preheader' => $preheader];
$html = $hasBlocks
    ? render_email_blocks($data['blocks'], $opts)
    : render_email_html($markdown, $opts);

// Monta o payload da Resend.
$payload = [
    'from' => $FROM,
    'to' => [$DEST],
    'subject' => $subject,
    'html' => $html,
];
if (filter_var($replyTo, FILTER_VALIDATE_EMAIL)) {
    $payload['reply_to'] = $replyTo;
}

$ch = curl_init('https://api.resend.com/emails');
curl_setopt_array($ch, [
    CURLOPT_POST => true,
    CURLOPT_HTTPHEADER => [
        'Authorization: Bearer ' . $RESEND_API_KEY,
        'Content-Type: application/json',
    ],
    CURLOPT_POSTFIELDS => json_encode($payload),
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_TIMEOUT => 15,
]);
$resp = curl_exec($ch);
$code = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
$err = curl_error($ch);
curl_close($ch);

if ($code >= 200 && $code < 300) {
    echo json_encode(['ok' => true]);
} else {
    http_response_code(502);
    error_log('Resend falhou: ' . $code . ' ' . $err . ' ' . (string) $resp);
    echo json_encode(['ok' => false, 'error' => 'Falha ao enviar']);
}
