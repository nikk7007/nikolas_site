# Como funciona (fluxo em runtime)

Passo a passo do que acontece **dentro de uma requisição**, arquivo por arquivo.
Para visão geral do projeto veja o [README](../README.md); para o contrato da API
veja [API.md](API.md).

> **Privada.** `docs/` e `.md` são bloqueados pelo `.htaccess` — não são servidos na web.

## O caminho de uma requisição

Um app faz `POST /` com `Authorization: Bearer <chave>` e um corpo JSON. Tudo passa
por [`index.php`](../index.php), o único ponto de entrada. Na ordem:

1. **Método** — não-`POST` → `405`.
2. **Token** (`bearerToken()`) — lê o header `Authorization`. Como LiteSpeed/Apache às
   vezes não repassam o header, há fallback via `REDIRECT_HTTP_AUTHORIZATION` e
   `getallheaders()`. A extração do `Bearer <x>` fica em `parse_bearer()` (`src/email.php`).
3. **Auth** (`match_app()`) — carrega o `apps.json` (de **um nível acima do docroot**) e
   compara a chave em **tempo constante** (`hash_equals`). Sem match → `401`. Com match,
   temos a identidade do app: `{ name, from?, rpm? }`.
4. **Rate limit** (`rate_limit_hit()`) — janela fixa de 60s por app, estado num arquivo
   sob `flock` em `../.ratelimit/`. A decisão pura fica em `rate_limit_check()`. Estourou
   → `429` + header `Retry-After`. **Fail-open**: se o arquivo não abrir, deixa passar (o
   freio é defesa em profundidade, não pode derrubar envio por erro de disco).
5. **Corpo** — lê `php://input`; > 200 KB → `413`; não-JSON → `400`.
6. **Normalização** (`normalize_input()`) — resolve `subject` (CRLF removido, cortado em
   200), `preheader`, e escolhe o modo: `blocks` (array não-vazio) tem prioridade sobre
   `markdown`. Sem conteúdo → `400 Conteúdo vazio`.
7. **Destinatário / remetente** — `to` vem na request (`resolve_to()`, com fallback
   `MAIL_TO` legado); o `from` vem da **identidade do app** (`resolve_from()`, com fallback
   `MAIL_FROM`). O app **não** escolhe o remetente.
8. **Render** — `render_email_blocks()` ou `render_email_html()` gera o HTML com a marca.
9. **Envio** — monta o payload e faz `POST` na Resend via cURL (timeout 15s). A resposta é
   traduzida por `map_resend_response()`: `200 {ok:true,id}` no sucesso, senão `502` (o erro
   real vai pro `error_log`, não pro cliente).

## Quem faz o quê (`src/`)

| Arquivo | Responsabilidade |
|---------|------------------|
| `index.php` | Orquestra o fluxo acima: I/O, auth, rate-limit stateful, cURL. |
| `src/email.php` | **Lógica pura e testável**: `parse_bearer`, `match_app`, `read_apps`, `normalize_input`, `resolve_to/from`, `rate_limit_check`, `map_resend_response`, `load_env`. |
| `src/EmailRenderer.php` | Converte markdown/blocks → HTML com a identidade da marca. |
| `src/Parsedown.php` | Parser de Markdown (vendorizado). |
| `src/brand.php` | Cores, logo, template do e-mail. **Muda aqui → todos os apps pegam na hora.** |

A separação I/O (`index.php`) vs. pura (`src/email.php`) é o que deixa a suíte do PHPUnit
testar auth, rate limit e parsing sem rede nem sistema de arquivos.

## Onde ficam os segredos

`.env` e `apps.json` ficam **acima do docroot** (na home), fora da web — lidos via
`__DIR__ . '/../...'`. `.ratelimit/` é runtime, também acima. Detalhes de layout e deploy
no [README](../README.md#estrutura-e-deploy).

## O que muda sem redeploy

- **Novo app / revogar chave** → editar `apps.json` (lido a cada request).
- **Marca / template** → editar `src/brand.php`.
- **Limite global** → `RATE_LIMIT_PER_MIN` no `.env`.

Nenhum desses exige `git pull` nos apps — eles só chamam o endpoint.
