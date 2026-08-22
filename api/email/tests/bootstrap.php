<?php

declare(strict_types=1);

// Carrega a lógica pura e o renderizador REAL (código local, sem lib externa
// e sem stub) — os testes de renderização exercem o renderer de verdade.
require_once __DIR__ . '/../src/email.php';
require_once __DIR__ . '/../src/EmailRenderer.php';
