# Spin — Roleta Online

Roleta online grátis para sortear nomes, itens e tomar decisões. Parte do
monorepo do site — vive em **https://nikolasleme.com.br/games/roleta/**
(o subdomínio antigo `spin.` só redireciona).

## Estrutura

- `index.html` — a roleta (app)
- `css/`, `js/` — estilos e lógica
- `404.html` — redireciona pra raiz
- `.htaccess` — força HTTPS, página 404, compressão e cache (Apache/LiteSpeed)
- `robots.txt`, `sitemap.xml` — SEO / indexação
- `favicon.svg`, `site.webmanifest` — ícone e PWA
- `og-image.png` — imagem de compartilhamento (1200×630, WhatsApp/Twitter/etc.)

## Como publicar na Hostinger

1. **Subdomínio**: no hPanel, em _Domínios → Subdomínios_, crie `spin`
   (resultando em `spin.nikolasleme.com.br`). Anote a pasta que ele criar
   (ex.: `public_html/spin`).

2. **Upload**: pelo _Gerenciador de Arquivos_ (ou FTP), envie **todo o conteúdo
   da pasta** para dentro dessa pasta do subdomínio — incluindo os arquivos
   ocultos `.htaccess` e `404.html`. Não suba a pasta `.git`.

3. **SSL**: no hPanel, em _Segurança → SSL_, ative o certificado para o
   subdomínio. O `.htaccess` já redireciona HTTP → HTTPS.

## SEO — o que já está configurado

- `<title>`, `description` e `keywords` focados em "roleta online" e "sortear nomes"
- `<h1>` e seção de conteúdo indexável (a app é um `<canvas>`, então o texto do
  rodapé é o que o Google lê)
- Open Graph + Twitter Card com `og-image.png` para os compartilhamentos
- Dados estruturados (`WebApplication` + `FAQPage`) em JSON-LD
- `canonical`, `robots`, `sitemap.xml` e `robots.txt`

### Próximos passos (manuais)

- Registrar o site no [Google Search Console](https://search.google.com/search-console)
  e enviar o `sitemap.xml` para acelerar a indexação.
- Anúncios: removidos em ago/2026 (blocos AdSense, `ads.css` e `ads.txt`) —
  se um dia voltarem, é recriar os blocos no `index.html` e o `ads.txt` na
  raiz do domínio.

### Regerar a imagem de compartilhamento

O `og-image.png` foi gerado a partir de um template HTML com o Edge headless. Se
quiser mudar, recrie o HTML 1200×630 e rode:

```powershell
& "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" `
  --headless=new --disable-gpu --window-size=1200,630 `
  --screenshot="og-image.png" "file:///caminho/para/og-image.html"
```
