<?php

declare(strict_types=1);

use PHPUnit\Framework\TestCase;

/**
 * Exercita o renderizador REAL (src/EmailRenderer.php) — a marca e, sobretudo,
 * o safe-mode que neutraliza HTML/script vindo de markdown de form público.
 */
final class RendererTest extends TestCase
{
    public function testMarkdownProducesBrandedDocument(): void
    {
        $html = render_email_html('# Título', ['title' => 'T', 'preheader' => 'resumo']);
        $this->assertStringContainsString('<!DOCTYPE', $html);
        $this->assertStringContainsString('<h1', $html);
        $this->assertStringContainsString('resumo', $html);   // preheader no documento
    }

    public function testSafeModeNeutralizesScript(): void
    {
        $html = render_email_html("texto\n\n<script>alert(1)</script>", []);
        $this->assertStringNotContainsString('<script>', $html);
    }

    public function testSafeModeEscapesEmbeddedHtmlToInertText(): void
    {
        // HTML embutido no markdown vira TEXTO escapado (não uma tag <a> ativa
        // com on*-handler). "onerror" pode aparecer, mas como &lt;a...&gt; inerte.
        $html = render_email_html('<a href="x" onerror="hack()">y</a>', []);
        $this->assertStringContainsString('&lt;a', $html);              // foi escapado
        $this->assertStringNotContainsString('<a href="x"', $html);    // não virou tag ativa
    }

    public function testLinkRendersAnchor(): void
    {
        $html = render_email_html('[x](https://y)', []);
        $this->assertStringContainsString('<a', $html);
    }

    public function testButtonSyntaxRendersBulletproofTable(): void
    {
        $html = render_email_html('[Ir](https://exemplo.com "btn")', []);
        $this->assertStringContainsString('role="presentation"', $html);
        $this->assertStringContainsString('https://exemplo.com', $html);
    }

    public function testBlocksRenderButtonAndList(): void
    {
        $html = render_email_blocks([
            ['type' => 'h1', 'text' => 'Olá'],
            ['type' => 'button', 'text' => 'Ir', 'href' => 'https://exemplo.com'],
            ['type' => 'list', 'items' => ['um', 'dois']],
        ], ['title' => 'B']);
        $this->assertStringContainsString('<ul', $html);
        $this->assertStringContainsString('role="presentation"', $html);
        $this->assertStringContainsString('dois', $html);
    }

    public function testUnknownBlockTypeFallsBackToParagraph(): void
    {
        $html = render_email_blocks([['type' => 'inexistente', 'text' => 'conteúdo']], []);
        $this->assertStringContainsString('<p', $html);
        $this->assertStringContainsString('conteúdo', $html);
    }
}
