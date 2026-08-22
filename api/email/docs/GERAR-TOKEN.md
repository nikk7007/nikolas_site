# Gerar um token (chave de API de um app)

Cada app que manda e-mail tem uma **chave** própria. A chave mapeia pra uma identidade
`{ name, from?, rpm? }` no `apps.json` (que fica **acima do docroot**, fora da web). Para o
que cada campo faz, veja [API.md](API.md#autenticação).

> **Privada.** `docs/` e `.md` são bloqueados pelo `.htaccess` — não são servidos na web.

## Jeito recomendado: `bin/newkey.php`

O script [`bin/newkey.php`](../bin/newkey.php) gera uma chave de 256 bits (CSPRNG) e monta
a entrada do `apps.json`. É **só CLI** — o `.htaccess` bloqueia `bin/` na web.

### 1 comando (gera + mescla no `apps.json`)

No servidor, a partir do docroot:

```bash
php bin/newkey.php blog "Blog <blog@nikolasleme.com.br>" --write ../apps.json
```

Isso gera a chave, adiciona a entrada ao `apps.json` (**preservando os apps que já
existem**) e imprime a chave **uma única vez**:

```
Chave do app "blog" adicionada em ../apps.json (2 app(s) no total).

Guarde a MESMA chave no app; ele manda no header:
  Authorization: Bearer <chave>
```

- **`name`** (obrigatório): identifica o app nos logs e no rate limit.
- **`from`** (opcional): remetente desse app. Omitido → cai no `MAIL_FROM` do `.env`.
  O domínio precisa estar verificado na Resend.
- **`--write <path>`**: caminho do `apps.json`. Se o arquivo não for JSON válido, o script
  **aborta sem sobrescrever**.

### Sem `--write` (imprime a entrada pra colar à mão)

```bash
php bin/newkey.php blog "Blog <blog@nikolasleme.com.br>"
```

Imprime a chave e a linha `"…": { "name": "blog", "from": "…" }` pra colar você mesmo no
`apps.json`.

### Só a chave (sem entrada)

```bash
php bin/newkey.php
```

## Alternativa sem PHP

```bash
openssl rand -hex 32
```

Gera a chave; a entrada no `apps.json` você monta à mão (veja
[o exemplo no README](../README.md#autenticação-e-identidade-appsjson)).

## Passo final: dar a chave ao app

Ponha a **mesma chave** no `.env` (ou config) do app novo. Ele manda em toda requisição:

```http
Authorization: Bearer <chave>
```

O `apps.json` é lido a cada request — **não precisa de redeploy** do serviço. Um `rpm` por
app pode ser adicionado à entrada pra sobrescrever o rate limit global.

## Revogar / trocar

- **Revogar**: apague a linha daquele app no `apps.json`. A chave para de funcionar na
  próxima requisição.
- **Rotacionar**: gere uma nova (`--write` adiciona uma entrada nova), atualize o app, e
  apague a entrada antiga.

## Regras de ouro

- A chave aparece **uma vez**. Se perder, gere outra — não dá pra recuperar.
- **Nunca** commite `apps.json` nem a chave. Ambos ficam só no servidor, acima do docroot.
- Uma chave por app → dá pra revogar um sem afetar os outros.
