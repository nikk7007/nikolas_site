# nikolasleme.com.br

Ecossistema completo do site — este repo **é** o docroot da Hostinger.
Um push + `./ops/deploy.sh --go` e o site inteiro está atualizado.

```
├── index.html            landing: sobre, história, vitrine, contato
├── minisites/
│   ├── index.html        catálogo (renderiza js/data/minisites.js)
│   ├── roleta/           Spin — roleta online (ex-repo spin)
│   ├── quem-sou-eu/      PWA de adivinhação (ex-repo quem_sou_eu)
│   └── juros-compostos/  calculadora de juros (build React; fonte em apps/)
├── apps/                 fontes dos apps buildados (não sobem no deploy)
│   └── juros-compostos/  Vite + React + Recharts → builda pra minisites/
├── form/                 formulário de briefing (build Vue; fonte no repo nls_form)
│   └── api/send.php      envia respostas por e-mail (Resend)
├── api/email/            API de e-mail central (ex-repo nls_email_api)
├── js/data/
│   ├── projects.js       ← adicionar projeto na vitrine = 1 entrada aqui
│   └── minisites.js      ← publicar minisite = pasta em minisites/ + 1 entrada aqui
├── css/site.css          identidade NLS (tokens do brandbook)
└── ops/                  deploy (rsync), redirects 301, guia de migração
```

## Como adicionar coisas

- **Projeto na vitrine**: uma entrada em `js/data/projects.js` (sem imagem?
  `cover: null` gera capa tipográfica na identidade).
- **Jogo/minisite**: pasta nova em `minisites/<slug>/` + entrada em `js/data/minisites.js`.
  Caminhos internos do jogo devem ser **relativos** (ele vive em subpasta).
- **Artigo**: pasta `artigos/<slug>/index.html` (copiar um artigo existente;
  caminhos **absolutos**) + card em `artigos/index.html` + URL no `sitemap.xml`.
- **Mexeu em `css/site.css` ou `js/site.js`?** Suba o `?v=` em todo HTML que
  carrega o arquivo: o Cloudflare segura css/js por semanas.

## Segredos

Nunca no repo. No servidor, vivem **acima** do docroot
(`domains/nikolasleme.com.br/`): `.env` (API de e-mail), `.env.form`
(formulário) e `apps.json` (tokens). Ver `ops/DEPLOY.md`.

## Desenvolvimento local

```bash
php -S localhost:8080          # na raiz do repo
```

## Testes da API de e-mail

```bash
cd api/email && composer install && composer test
```

## O que mora onde

| URL | Conteúdo |
|---|---|
| nikolasleme.com.br | landing (este repo, raiz) |
| /minisites, /minisites/roleta, /minisites/quem-sou-eu | jogos |
| /minisites/juros-compostos | calculadora de juros compostos |
| /artigos | artigos pra cliente leigo (por que ter site, tipos de site) |
| /form | briefing de clientes |
| /api/email | API de e-mail central |
| links.nikolasleme.com.br | app de links (repo próprio, com banco) |
| lemecc.com.br, vipax.eco.br | sites de cliente (repos próprios) |

Subdomínios antigos (`spin.`, `qse.`, `form.`, `mail.`) só redirecionam (301).
