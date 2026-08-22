# Deploy — nikolasleme.com.br

O repo inteiro é o docroot de `nikolasleme.com.br`. Deploy é um rsync via SSH
(host `Hostinger` já configurado no `~/.ssh/config`).

## Rotina (depois da primeira vez)

```bash
./ops/deploy.sh        # dry-run: confere o que vai mudar
./ops/deploy.sh --go   # sobe
```

## Primeira migração (uma vez só)

A ordem importa: primeiro os segredos, depois o site, depois os redirects.

### 1. Segredos — acima do docroot

Os apps esperam os segredos em `domains/nikolasleme.com.br/` (fora da web):

```bash
ssh Hostinger
cd ~/domains
cp mail.nikolasleme.com.br/.env       nikolasleme.com.br/.env        # API de e-mail
cp mail.nikolasleme.com.br/apps.json  nikolasleme.com.br/apps.json   # tokens por app
cp form.nikolasleme.com.br/.env       nikolasleme.com.br/.env.form   # formulário
```

(`.env` e `.env.form` têm as mesmas chaves com valores próprios — por isso o sufixo.)

### 2. Backup do que está no ar hoje

O docroot atual tem o app **links**, que vai pro subdomínio próprio:

```bash
ssh Hostinger 'cd ~/domains/nikolasleme.com.br && tar czf ~/backup-links-$(date +%F).tgz public_html'
```

### 3. Subdomínio novo pro links

No hPanel: **Domínios → Subdomínios → criar `links.nikolasleme.com.br`**, depois:

```bash
ssh Hostinger 'cp -a ~/domains/nikolasleme.com.br/public_html/. ~/domains/links.nikolasleme.com.br/public_html/'
```

O `.env`/config do links continua onde ele já espera (conferir `api/config.php` dele).

### 4. Site novo no ar

```bash
./ops/deploy.sh --go
```

### 5. Redirects 301 nos subdomínios antigos

Cada subdomínio antigo passa a ser só um `.htaccess` de redirect
(arquivos prontos em `ops/redirects/`):

```bash
for s in spin qse form mail; do
  scp ops/redirects/$s.htaccess Hostinger:domains/$s.nikolasleme.com.br/public_html/.htaccess
done
# qse era PWA: sobe também o service worker kill-switch (ver comentário no htaccess)
scp ops/redirects/qse-sw.js Hostinger:domains/qse.nikolasleme.com.br/public_html/sw.js
```

Depois de confirmar que os redirects funcionam, o conteúdo antigo desses
subdomínios pode ser removido (no qse ficam `.htaccess` **e** `sw.js`; nos
outros, só o `.htaccess`).

### 6. Conferência

- https://nikolasleme.com.br — landing
- /games/ , /games/roleta/ , /games/quem-sou-eu/ (PWA: instalar e testar offline)
- /form/ — enviar um briefing de teste e ver o e-mail chegar
- /api/email/ — `curl -X POST` com Bearer de teste (ver `api/email/docs/API.md`)
- https://spin.nikolasleme.com.br → deve cair em /games/roleta/

## Repos antigos no GitHub

Depois que tudo estiver no ar: arquivar `spin`, `quem_sou_eu`, `nls_form` e
`nls_email_api` (Settings → Archive) com uma nota no README apontando pra cá.
O fonte Vue do formulário mora no `nls_form` — aqui só entra o build (`form/`).
