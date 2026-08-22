#!/usr/bin/env php
<?php

declare(strict_types=1);

// Gera uma chave de API nova (256 bits, CSPRNG). NUNCA acessível pela web —
// só CLI (e o .htaccess bloqueia bin/).
//
// Uso:
//   php bin/newkey.php                                  -> só a chave
//   php bin/newkey.php <name> ["<from>"]                -> imprime a entrada do apps.json
//   php bin/newkey.php <name> ["<from>"] --write <path> -> mescla a entrada no apps.json
//
// Ex.: php bin/newkey.php form "Nikolas <formulario@nikolasleme.com.br>" --write ../apps.json

if (PHP_SAPI !== 'cli') {
    http_response_code(403);
    exit("Só via linha de comando.\n");
}

// --- parse dos argumentos (extrai --write/-w PATH; resto é name, from) ---
$args  = array_slice($argv, 1);
$write = null;
foreach ($args as $i => $a) {
    if (($a === '--write' || $a === '-w') && isset($args[$i + 1])) {
        $write = $args[$i + 1];
        unset($args[$i], $args[$i + 1]);
        break;
    }
    if (str_starts_with($a, '--write=')) {
        $write = substr($a, 8);
        unset($args[$i]);
        break;
    }
}
$args = array_values($args);
$name = $args[0] ?? '';
$from = $args[1] ?? '';

$key = bin2hex(random_bytes(32));   // 64 hex chars

// Modo simples: sem nome -> só a chave.
if ($name === '') {
    if ($write !== null) {
        fwrite(STDERR, "Erro: --write exige um <name> pra montar a entrada.\n");
        exit(1);
    }
    echo $key . PHP_EOL;
    exit(0);
}

$entry = ['name' => $name];
if ($from !== '') {
    $entry['from'] = $from;
}

// --- Modo --write: mescla no apps.json (preserva o que já existe) ---
if ($write !== null) {
    $apps = [];
    if (is_file($write)) {
        $decoded = json_decode((string) file_get_contents($write), true);
        if (! is_array($decoded)) {
            fwrite(STDERR, "Erro: '$write' existe mas não é JSON válido. Não vou sobrescrever.\n");
            exit(1);
        }
        $apps = $decoded;
    }
    $apps[$key] = $entry;
    $json = json_encode($apps, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    if (file_put_contents($write, $json . "\n", LOCK_EX) === false) {
        fwrite(STDERR, "Erro: não consegui escrever em '$write'.\n");
        exit(1);
    }
    $total = count(array_filter($apps, 'is_array'));
    echo "Chave do app \"$name\" adicionada em $write ($total app(s) no total).\n\n";
    echo "Guarde a MESMA chave no app; ele manda no header:\n";
    echo "  Authorization: Bearer $key\n";
    exit(0);
}

// --- Modo padrão: imprime a entrada pra colar ---
$json = json_encode($entry, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
echo "Chave gerada para o app \"$name\".\n\n";
echo "1) Cole esta entrada no apps.json (acima do docroot):\n\n";
echo '  ' . json_encode($key) . ': ' . $json . "\n\n";
echo "2) Guarde a MESMA chave no app; ele manda no header:\n";
echo "     Authorization: Bearer $key\n\n";
echo "Dica: use --write <caminho/apps.json> pra já mesclar automaticamente.\n";
