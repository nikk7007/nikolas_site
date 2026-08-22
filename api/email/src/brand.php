<?php

declare(strict_types=1);

// Identidade visual do Nikolas, adaptada pra e-mail (fonte única em PHP).
// Fontes reais (Author/Martian Mono) não carregam na maioria dos clientes de
// e-mail, então uso fallbacks seguros — a paleta e o layout carregam a marca.
return [
    'ink'    => '#1c1e22',   // fundo grafite
    'ink2'   => '#24272c',   // superfície do card
    'ink3'   => '#2d3138',   // blocos (citação, código)
    'border' => '#33373d',   // bordas
    'paper'  => '#f4f2ee',   // texto principal
    'stone'  => '#8b93a1',   // texto secundário
    'sand'   => '#d8cbb8',   // acento (único ponto quente)
    'slate2' => '#7c93ac',   // links / detalhes azul-ardósia

    'sans' => "-apple-system, 'Segoe UI', Arial, Helvetica, sans-serif",
    'mono' => "'SFMono-Regular', Consolas, 'Liberation Mono', monospace",

    'maxWidth'    => 600,
    'sender'      => 'Nikolas Leme Santos',
    'senderEmail' => 'contato@nikolasleme.com.br',
];
