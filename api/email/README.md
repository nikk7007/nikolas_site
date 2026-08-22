# API de e-mail central

> Ex-repo `nls_email_api`, hoje parte do monorepo do site em `api/email/`
> (endpoint: `https://nikolasleme.com.br/api/email/`; o subdomínio antigo
> `mail.` só redireciona). Deploy e segredos: ver `ops/DEPLOY.md` na raiz.

API de e-mail central do ecossistema do Nikolas. Os apps **não** mandam e-mail
sozinhos — eles chamam este serviço, que **autentica → renderiza → envia**.
Serviço **autossuficiente**: o renderizador da marca vive aqui (em `src/`), sem
dependência externa.

## Por que existe (o plano)

Antes, cada app renderizava o e-mail e chamava a Resend direto. Isso espalha a
chave da Resend por todos os apps e obriga a atualizar/redeployar cada um quando
a marca muda. Centralizar num serviço resolve:

- **Uma chave Resend só** — vive aqui, não no `.env` de cada app.
- **Marca/template num lugar** — muda o `src/brand.php` aqui, todos os apps pegam na
  hora (sem redeploy dos apps).
- **Apps magros** — cada app só faz um `POST` autenticado, sem lib e sem chave da Resend.

Custo assumido: é um serviço **sempre-ligado** (se cair, ninguém manda e-mail) e
com **auth própria**. Vale a partir de ~2-3 apps mandando e-mail.

## Os 2 repositórios

```
┌─────────────┐     POST + Bearer      ┌──────────────────────────┐   Resend API
│  nls_form   │ ─────────────────────▶ │      nls_email_api       │ ───────────▶  📧
│ (e outros   │  {subject, to, ...}    │       (este repo)        │
│  apps)      │                        │  auth + render + envio   │
└─────────────┘                        │  renderer da marca em    │
                                       │  src/ (autossuficiente)  │
                                       └──────────────────────────┘
```

- **nls_email_api** (este) — o serviço completo: auth + render + Resend. Único com a
  chave da Resend. O renderizador (`src/EmailRenderer.php` + `Parsedown.php` + `brand.php`)
  é **interno**.
- **[nls_form](https://github.com/nikk7007/nls_form)** e futuros apps — chamam a API.
  O `send.php` do form é um **proxy fino** (honeypot + rate-limit na borda pública)
  que repassa pra cá com a chave interna.

> A antiga lib `nls_email` (renderização via Composer) foi **absorvida** por este repo
> e está **descontinuada**. Não há mais dependência privada nem token de Composer.

## Contrato

```http
POST https://<seu-subdominio>/
Authorization: Bearer <CHAVE_INTERNA_DO_APP>
Content-Type: application/json

{
  "subject":  "Assunto",
  "markdown": "# Conteúdo\n\nem **markdown**",   // OU "blocks": [ ... ]
  "to":       "destino@exemplo.com",             // normal: destino vem na request
  "replyTo":  "cliente@exemplo.com",             // opcional
  "preheader":"resumo curto"                     // opcional (default: subject)
}
```

`to` é o caminho normal. Se omitido, cai no `MAIL_TO` do `.env` (fallback legado); sem
nenhum e-mail válido → `400`. Botão no markdown: `[Texto](https://url "btn")`. Resposta:

```json
{ "ok": true,  "id": "<id da Resend>" }
{ "ok": false, "error": "..." }
```

Códigos: `401` sem/errada a chave · `429` rate limit (+ header `Retry-After`) ·
`400/413` corpo · `502` falha no envio · `405` método · `500` serviço mal configurado.

## Autenticação e identidade (`apps.json`)

Cada app tem uma chave que mapeia pra sua **identidade** (`name` + `from`) no
`apps.json` — que fica **acima do docroot** (ao lado do `.env`, fora da web). Comparação
em tempo constante (`hash_equals`).

```json
{
  "<chave_gerada>": { "name": "form", "from": "Nikolas Leme <formulario@nikolasleme.com.br>" },
  "<outra_chave>":  { "name": "blog", "from": "Blog <blog@nikolasleme.com.br>", "rpm": 30 }
}
```

- `from` opcional → cai no `MAIL_FROM` do `.env`. `rpm` opcional → override do rate limit.
- O **destinatário** vem sempre na requisição (`to`), não no `apps.json`.

### Adicionar um app novo

1. Gera uma chave: `openssl rand -hex 32`.
2. Adiciona uma entrada no `apps.json` do serviço com `name` e (opcional) `from`.
3. Põe a mesma chave no `.env` do app novo; ele faz `POST` no contrato acima.

Sem redeploy do serviço — só recarregar o `apps.json` (é lido a cada request).

## Rate limit

Freio por app: `RATE_LIMIT_PER_MIN` requisições/minuto (`.env`, default 60; `0` desativa),
com override por app via `"rpm"` no `apps.json`. Janela fixa de 60s, estado em arquivo
sob `flock`, em `../.ratelimit/`. Estourou → `429` + `Retry-After`. É **defesa em
profundidade** (a borda pública dos apps também deve limitar).

## Segurança

- **Chaves** por app, revogáveis individualmente; comparação em tempo constante.
- **Safe-mode do renderer**: markdown de form público tem HTML/script **escapado**
  (vira texto inerte) e URLs perigosas neutralizadas.
- **Layout**: só o `index.php` é servido; `.htaccess` bloqueia `.git/`/`src/`/etc., e
  `.env`/`apps.json`/`.ratelimit/` ficam acima do docroot (na home).
- **Subdomínio "difícil" não é segurança.** `nmap` varre portas/IPs; subdomínio vaza por
  DNS enumeration e sobretudo pelos **Certificate Transparency logs** (o nome vira público
  ao emitir o SSL). A defesa real são as chaves + rate limit + safe-mode. Usar um
  subdomínio obscuro não custa nada, mas não substitui nada.

## Estrutura e deploy

Layout *front-controller*: o repo é clonado **na raiz do domínio** (o docroot) e só o
`index.php` é ponto de entrada — o `.htaccess` **bloqueia** `.git/`, `src/`, `tests/`,
`composer.*` etc. Os segredos ficam **acima** do docroot (na home), fora da web.

```
<home do usuário>/
├── .env                            ← só no servidor, ACIMA do docroot (não versionado)
├── apps.json                       ← só no servidor, ACIMA do docroot (não versionado)
├── .ratelimit/                     ← runtime, ACIMA do docroot (gitignored)
└── public_html/                    ← DOCROOT (o git pull cai aqui)
    ├── index.php                   ← a API (ponto de entrada)
    ├── .htaccess                   ← passa Authorization + bloqueia o resto
    ├── src/                        ← renderer + lógica pura (bloqueado na web)
    │   ├── email.php  EmailRenderer.php  Parsedown.php  brand.php
    ├── tests/  composer.json  phpunit.xml  ...  ← bloqueados na web
    └── .git/                       ← bloqueado na web
```

> **Por que os segredos ficam fora do docroot:** o docroot é servido pela web.
> No monorepo, este app vive em `public_html/api/email/`, e `.env`/`apps.json`
> ficam ao lado do `public_html` (três níveis acima) pra nunca serem serváveis,
> nem se o `.htaccess` falhar. O `index.php` os lê via `__DIR__ . '/../../../.env'`.

**Deploy:** junto com o site inteiro — `./ops/deploy.sh --go` na raiz do monorepo
(ver `ops/DEPLOY.md`). Não precisa de Composer no servidor: não há deps de runtime,
o renderer é interno. Lembretes que continuam valendo:

- Domínio verificado na Resend (SPF/DKIM) pro `MAIL_FROM`.
- **Blindagem:** `https://nikolasleme.com.br/api/email/src/email.php` e
  `/api/email/composer.json` devem dar **403**.

## Dev / teste

Testes (via Docker, sem PHP local):

```bash
docker run --rm -v "$PWD:/app" -w /app composer:2 install
docker run --rm -v "$PWD:/app" -w /app php:8.2-cli php vendor/bin/phpunit
```

Servidor local (o docroot é a raiz do repo; `.env`/`apps.json` ficam **um nível acima**,
ou seja, na pasta-pai do repo — como no servidor ficam acima do docroot):

```bash
php -S 127.0.0.1:8080     # docroot = pasta atual; ou um container php:8.2-cli

# sem chave -> 401
curl -si -XPOST localhost:8080/ -d '{"markdown":"# oi","to":"a@x.com"}' | head -1

# com chave -> renderiza e tenta enviar
curl -s -XPOST localhost:8080/ \
  -H "Authorization: Bearer <sua_chave>" \
  -H "Content-Type: application/json" \
  -d '{"subject":"Teste","markdown":"# Olá\n\ntexto **forte**","to":"destino@x.com"}'
```

CI (GitHub Actions) roda lint + PHPUnit em PHP 8.2/8.3 a cada push — sem secret.
