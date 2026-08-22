<?php

declare(strict_types=1);

/**
 * Lógica pura da API de e-mail — sem rede, sem estado global, sem I/O.
 * É o que os testes exercem; o index.php (na raiz) é só a casca de I/O que chama daqui.
 */

/** Lê um .env simples (KEY=valor, # comenta, aspas opcionais, tolera BOM). */
function load_env(string $file): array
{
    $out = [];
    if (! is_file($file) || ! is_readable($file)) {
        return $out;
    }
    $lines = file($file, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    if (isset($lines[0])) {
        $lines[0] = preg_replace('/^\xEF\xBB\xBF/', '', $lines[0]);
    }
    foreach ($lines as $line) {
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
            $val = substr($val, 1, -1);
        }
        $out[$key] = $val;
    }
    return $out;
}

/** Extrai o token de um header Authorization ("Bearer xxx" -> "xxx"). */
function parse_bearer(string $header): string
{
    return preg_match('/Bearer\s+(\S+)/i', $header, $m) === 1 ? $m[1] : '';
}

/**
 * Normaliza o corpo do request no que interessa pra renderização:
 * subject/preheader saneados (sem CRLF, cortados em 200) e o conteúdo
 * (blocks estruturado OU markdown). `empty` sinaliza conteúdo ausente (-> 400).
 *
 * @param array<string,mixed> $data
 * @return array{subject:string,preheader:string,mode:string,blocks:array,markdown:string,empty:bool}
 */
function normalize_input(array $data): array
{
    $strip = static fn ($s): string => mb_substr(trim(str_replace(["\r", "\n"], '', (string) $s)), 0, 200);

    $subject   = $strip($data['subject'] ?? 'Mensagem');
    $preheader = $strip($data['preheader'] ?? $subject);

    $hasBlocks = isset($data['blocks']) && is_array($data['blocks']) && count($data['blocks']) > 0;
    $markdown  = (string) ($data['markdown'] ?? '');

    return [
        'subject'   => $subject,
        'preheader' => $preheader,
        'mode'      => $hasBlocks ? 'blocks' : 'markdown',
        'blocks'    => $hasBlocks ? $data['blocks'] : [],
        'markdown'  => $markdown,
        'empty'     => ! $hasBlocks && trim($markdown) === '',
    ];
}

/**
 * Lê o apps.json (mapa chave -> {name, from?, rpm?}) e devolve só as entradas
 * válidas (com `name` não-vazio). Arquivo ausente/JSON inválido/não-objeto -> [].
 * O caller trata `[]` como "servidor sem apps" (500).
 *
 * @return array<string,array{name:string,from:string,rpm:?int}>
 */
function read_apps(string $file): array
{
    if (! is_file($file) || ! is_readable($file)) {
        return [];
    }
    $json = json_decode((string) file_get_contents($file), true);
    if (! is_array($json)) {
        return [];
    }
    $out = [];
    foreach ($json as $key => $app) {
        if (! is_string($key) || $key === '' || ! is_array($app)) {
            continue;
        }
        $name = isset($app['name']) && is_scalar($app['name']) ? trim((string) $app['name']) : '';
        if ($name === '') {
            continue; // identidade sem nome é inválida
        }
        $out[$key] = [
            'name' => $name,
            'from' => isset($app['from']) && is_scalar($app['from']) ? trim((string) $app['from']) : '',
            'rpm'  => isset($app['rpm']) && is_numeric($app['rpm']) ? (int) $app['rpm'] : null,
        ];
    }
    return $out;
}

/**
 * Autentica o token contra o mapa de apps em tempo constante (hash_equals).
 * Retorna a identidade do app ou null (token vazio/sem match).
 *
 * @param array<string,array> $apps
 */
function match_app(array $apps, string $token): ?array
{
    if ($token === '') {
        return null;
    }
    foreach ($apps as $key => $app) {
        if (hash_equals($key, $token)) {
            return $app;
        }
    }
    return null;
}

/** Remetente: o `from` do app, ou o default global quando o app não define. */
function resolve_from(?array $app, string $default): string
{
    $from = $app['from'] ?? '';
    return $from !== '' ? $from : $default;
}

/**
 * Destinatário: o `to` do request (validado), senão o fallback (validado),
 * senão null — que o caller traduz em 400.
 *
 * @param array<string,mixed> $data
 */
function resolve_to(array $data, string $fallback): ?string
{
    $to = trim((string) ($data['to'] ?? ''));
    if (filter_var($to, FILTER_VALIDATE_EMAIL)) {
        return $to;
    }
    if (filter_var($fallback, FILTER_VALIDATE_EMAIL)) {
        return $fallback;
    }
    return null;
}

/**
 * Decisão de rate limit por janela fixa de 60s (PURA — o I/O fica no wrapper).
 * Recebe o estado atual {windowStart,count} e devolve se libera + o novo estado
 * + `retry` (segundos até a janela reabrir, pro header Retry-After).
 * `limit <= 0` desativa o freio (libera sempre).
 *
 * @param array{windowStart?:int,count?:int} $state
 * @return array{allowed:bool,windowStart:int,count:int,retry:int}
 */
function rate_limit_check(array $state, int $now, int $limit): array
{
    $windowStart = (int) ($state['windowStart'] ?? 0);
    $count       = (int) ($state['count'] ?? 0);

    if ($limit <= 0) {
        return ['allowed' => true, 'windowStart' => $windowStart, 'count' => $count, 'retry' => 0];
    }
    if ($now - $windowStart >= 60) {   // janela expirou -> reseta
        $windowStart = $now;
        $count = 0;
    }
    if ($count >= $limit) {
        return ['allowed' => false, 'windowStart' => $windowStart, 'count' => $count, 'retry' => max(1, 60 - ($now - $windowStart))];
    }
    return ['allowed' => true, 'windowStart' => $windowStart, 'count' => $count + 1, 'retry' => 0];
}

/**
 * Traduz a resposta da Resend: 2xx -> {ok:true,id}, senão {ok:false}.
 * Isola o mapeamento (testável) do cURL (I/O, fica no index.php).
 */
function map_resend_response(int $code, ?string $resp): array
{
    if ($code >= 200 && $code < 300) {
        $id = '';
        $j  = json_decode((string) $resp, true);
        if (is_array($j) && isset($j['id'])) {
            $id = (string) $j['id'];
        }
        return ['ok' => true, 'id' => $id];
    }
    return ['ok' => false, 'error' => 'Falha ao enviar'];
}
