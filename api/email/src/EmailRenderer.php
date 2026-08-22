<?php

declare(strict_types=1);

require_once __DIR__ . '/Parsedown.php';

/**
 * Renderizador de e-mail com a identidade do Nikolas.
 *
 * Um estilo inline por elemento (mapa por tag, em styleFor) — o análogo ao
 * "um renderizador por elemento". Botão e código inline têm override próprio
 * porque não são só estilo (viram HTML dedicado).
 *
 * Safe mode + markup escaped ligados: o markdown pode chegar de um form
 * público, então HTML/script embutido vira texto e URLs perigosas são neutralizadas.
 */
final class EmailRenderer extends Parsedown
{
    /** @var array<string,mixed> */
    private $b;

    /** @param array<string,mixed> $brand */
    public function __construct(array $brand)
    {
        $this->b = $brand;
        $this->setSafeMode(true);       // derruba on*, neutraliza urls fora da whitelist
        $this->setMarkupEscaped(true);  // HTML embutido no markdown vira texto
        $this->setBreaksEnabled(false);
    }

    /** Estilo inline por tag. Editar aqui muda o visual daquele elemento. */
    private function styleFor(string $name): ?string
    {
        $b = $this->b;
        $map = [
            'h1' => "margin:0 0 16px;font-family:{$b['sans']};font-size:26px;line-height:1.2;font-weight:800;letter-spacing:-0.02em;color:{$b['paper']};",
            'h2' => "margin:26px 0 12px;padding-left:12px;border-left:3px solid {$b['sand']};font-family:{$b['sans']};font-size:19px;line-height:1.3;font-weight:700;color:{$b['paper']};",
            'h3' => "margin:22px 0 8px;font-family:{$b['sans']};font-size:16px;line-height:1.4;font-weight:700;color:{$b['sand']};",
            'p'  => "margin:0 0 16px;font-family:{$b['sans']};font-size:16px;line-height:1.6;color:{$b['paper']};",
            'strong' => "font-weight:700;color:{$b['paper']};",
            'em'     => "font-style:italic;",
            'del'    => "text-decoration:line-through;color:{$b['stone']};",
            'a'      => "color:{$b['slate2']};text-decoration:underline;",
            'ul' => "margin:0 0 16px;padding-left:22px;font-family:{$b['sans']};font-size:16px;line-height:1.6;color:{$b['paper']};",
            'ol' => "margin:0 0 16px;padding-left:22px;font-family:{$b['sans']};font-size:16px;line-height:1.6;color:{$b['paper']};",
            'li' => "margin:0 0 7px;",
            // ponytail: citação como <blockquote> estilizado, não tabela. Vale
            // pra Gmail/Apple Mail; virar tabela só se precisar de fidelidade no Outlook.
            'blockquote' => "margin:0 0 16px;padding:12px 16px;background:{$b['ink3']};border-left:3px solid {$b['sand']};font-family:{$b['sans']};font-size:15px;line-height:1.55;color:{$b['stone']};",
            'pre' => "margin:0 0 16px;padding:14px 16px;background:{$b['ink3']};border:1px solid {$b['border']};font-family:{$b['mono']};font-size:13px;line-height:1.5;color:{$b['paper']};white-space:pre-wrap;word-break:break-word;",
            'hr'  => "border:0;border-top:1px solid {$b['border']};margin:24px 0;",
            'img' => "max-width:100%;height:auto;display:block;margin:0 0 16px;border-radius:2px;",
        ];

        return $map[$name] ?? null;
    }

    // Injeta o estilo inline (e target nos links) antes do parent montar o markup.
    // O parent sanitiza em safe mode e mantém o atributo style.
    protected function element(array $Element)
    {
        if (isset($Element['name'])) {
            $name = $Element['name'];
            if ($name === 'a' && ! isset($Element['attributes']['target'])) {
                $Element['attributes']['target'] = '_blank';
            }
            if (empty($Element['attributes']['style'])) {
                $style = $this->styleFor($name);
                if ($style !== null) {
                    $Element['attributes']['style'] = $style;
                }
            }
        }

        return parent::element($Element);
    }

    // Link com title "btn" vira botão bulletproof (tabela). Uso: [Texto](url "btn")
    protected function inlineLink($Excerpt)
    {
        $Link = parent::inlineLink($Excerpt);
        if ($Link === null) {
            return null;
        }

        $title = $Link['element']['attributes']['title'] ?? '';
        if ($title === 'btn' || $title === 'button') {
            $href  = (string) ($Link['element']['attributes']['href'] ?? '');
            $label = (string) ($Link['element']['handler']['argument'] ?? '');
            $Link['element'] = [
                'rawHtml'                => $this->ctaButton($href, $label),
                'allowRawHtmlInSafeMode' => true, // HTML que EU gero (inputs já escapados)
            ];
        }

        return $Link;
    }

    // Código inline estilizado. Fica separado do <code> dentro de <pre> (esse
    // herda o estilo do <pre> e não leva estilo próprio).
    protected function inlineCode($Excerpt)
    {
        $Inline = parent::inlineCode($Excerpt);
        if ($Inline === null) {
            return null;
        }

        $b     = $this->b;
        $code  = (string) ($Inline['element']['text'] ?? '');
        $style = "font-family:{$b['mono']};font-size:0.92em;background:{$b['ink3']};padding:2px 5px;border-radius:2px;color:{$b['paper']};";
        $Inline['element'] = [
            'rawHtml'                => '<code style="' . htmlspecialchars($style, ENT_QUOTES) . '">' . self::escape($code) . '</code>',
            'allowRawHtmlInSafeMode' => true,
        ];

        return $Inline;
    }

    // Botão "bulletproof" (tabela) — renderiza inclusive no Outlook.
    // href passa por whitelist de esquema porque aqui eu emito rawHtml (fora do safe mode do parser).
    private function ctaButton(string $href, string $label): string
    {
        $b    = $this->b;
        $safe = preg_match('#^(https?://|mailto:)#i', $href) === 1 ? $href : '#';
        $h    = htmlspecialchars($safe, ENT_QUOTES);
        $l    = htmlspecialchars($label, ENT_QUOTES);

        return '<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:6px 0 20px;">'
            . '<tr><td align="center" bgcolor="' . $b['sand'] . '" style="background:' . $b['sand'] . ';border-radius:2px;">'
            . '<a href="' . $h . '" target="_blank" style="display:inline-block;padding:13px 28px;font-family:' . $b['sans'] . ';font-size:15px;font-weight:700;line-height:1;color:' . $b['ink'] . ';text-decoration:none;">' . $l . '</a>'
            . '</td></tr></table>';
    }

    // Conteúdo de um bloco: por padrão texto escapado literal ('text'). Se vier
    // 'md', passa pelo parser INLINE (negrito, itálico, link) — mas nunca
    // markdown de bloco (# títulos etc.). Safe mode continua valendo no inline.
    private function inlineContent(array $blk): array
    {
        if (isset($blk['md']) && is_scalar($blk['md'])) {
            return ['rawHtml' => $this->line((string) $blk['md']), 'allowRawHtmlInSafeMode' => true];
        }
        $text = isset($blk['text']) && is_scalar($blk['text']) ? (string) $blk['text'] : '';
        return ['text' => $text];
    }

    // Renderiza um bloco estruturado (JSON) reusando o MESMO estilo por tag do
    // markdown. Texto vem escapado (dado é dado); use 'md' pra rich-text inline.
    // Vocabulário: h1/h2/h3, p, list (items[], ordered?), quote, button (text, href), hr.
    public function block(array $blk): string
    {
        $type = (string) ($blk['type'] ?? 'p');

        switch ($type) {
            case 'h1':
            case 'h2':
            case 'h3':
            case 'p':
                return $this->element(['name' => $type] + $this->inlineContent($blk));

            case 'quote':
                return $this->element(['name' => 'blockquote'] + $this->inlineContent($blk));

            case 'button':
                $text = isset($blk['text']) && is_scalar($blk['text']) ? (string) $blk['text'] : '';
                $href = isset($blk['href']) && is_scalar($blk['href']) ? (string) $blk['href'] : '';
                return $this->ctaButton($href, $text);

            case 'hr':
                return $this->element(['name' => 'hr']);

            case 'list':
                $items = isset($blk['items']) && is_array($blk['items']) ? $blk['items'] : [];
                $li = '';
                foreach ($items as $it) {
                    // item pode ser string (literal) ou objeto {text} / {md} (inline)
                    if (is_array($it)) {
                        $li .= $this->element(['name' => 'li'] + $this->inlineContent($it));
                    } elseif (is_scalar($it)) {
                        $li .= $this->element(['name' => 'li', 'text' => (string) $it]);
                    }
                }
                $tag = ! empty($blk['ordered']) ? 'ol' : 'ul';
                return $this->element([
                    'name'                   => $tag,
                    'rawHtml'                => $li, // <li> já produzidos por mim
                    'allowRawHtmlInSafeMode' => true,
                ]);

            default: // tipo desconhecido: trata como parágrafo (não quebra a API)
                return $this->element(['name' => 'p'] + $this->inlineContent($blk));
        }
    }
}

/**
 * Markdown → HTML de e-mail completo com a identidade do Nikolas.
 * Retorna o HTML pronto pra passar no campo `html` do Resend.
 *
 * @param array{title?:string,preheader?:string} $opts
 */
function render_email_html(string $markdown, array $opts = []): string
{
    $b    = require __DIR__ . '/brand.php';
    $body = (new EmailRenderer($b))->text($markdown);

    return nls_email_document($body, $opts, $b);
}

/**
 * Blocos estruturados (JSON) → HTML de e-mail completo. Pensado pra API: o
 * consumidor manda dados, não markdown. Mesmo estilo por elemento do markdown.
 *
 * @param array<int,array<string,mixed>> $blocks vide EmailRenderer::block()
 * @param array{title?:string,preheader?:string} $opts
 */
function render_email_blocks(array $blocks, array $opts = []): string
{
    $b        = require __DIR__ . '/brand.php';
    $renderer = new EmailRenderer($b);

    $body = '';
    foreach ($blocks as $blk) {
        if (is_array($blk)) {
            $body .= $renderer->block($blk) . "\n";
        }
    }

    return nls_email_document($body, $opts, $b);
}

/**
 * Embrulha o corpo (já em HTML) no documento da marca: cabeçalho, rodapé,
 * preheader e metas de dark mode. Compartilhado pelos dois modos (md e blocks).
 *
 * @param array{title?:string,preheader?:string} $opts
 * @param array<string,mixed> $b brand
 */
function nls_email_document(string $body, array $opts, array $b): string
{
    $title     = $opts['title'] ?? $b['sender'];
    $preheader = $opts['preheader'] ?? '';
    $esc       = static fn ($s): string => htmlspecialchars((string) $s, ENT_QUOTES, 'UTF-8');

    return '<!DOCTYPE html>
<html lang="pt-BR" xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<meta name="x-apple-disable-message-reformatting">
<meta name="color-scheme" content="dark">
<meta name="supported-color-schemes" content="dark">
<title>' . $esc($title) . '</title>
</head>
<body style="margin:0;padding:0;background:' . $b['ink'] . ';-webkit-font-smoothing:antialiased;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;">' . $esc($preheader) . '</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:' . $b['ink'] . ';">
<tr><td align="center" style="padding:24px 12px;">
<table role="presentation" width="' . $b['maxWidth'] . '" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:' . $b['maxWidth'] . 'px;background:' . $b['ink2'] . ';border:1px solid ' . $b['border'] . ';">

<tr><td style="padding:24px 28px 4px;">
<div style="width:26px;height:2px;background:' . $b['sand'] . ';margin:0 0 10px;font-size:0;line-height:0;">&nbsp;</div>
<div style="font-family:' . $b['mono'] . ';font-size:12px;letter-spacing:2px;text-transform:uppercase;color:' . $b['slate2'] . ';">' . $esc($b['sender']) . '</div>
</td></tr>

<tr><td style="padding:16px 28px 26px;">
' . $body . '
</td></tr>

<tr><td style="padding:16px 28px 22px;border-top:1px solid ' . $b['border'] . ';">
<div style="font-family:' . $b['mono'] . ';font-size:11px;line-height:1.7;color:' . $b['stone'] . ';">
' . $esc($b['sender']) . '<br>
<a href="mailto:' . $b['senderEmail'] . '" style="color:' . $b['stone'] . ';text-decoration:none;">' . $esc($b['senderEmail']) . '</a>
</div>
</td></tr>

</table>
</td></tr>
</table>
</body>
</html>';
}
