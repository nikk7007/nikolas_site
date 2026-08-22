# API de E-mail — Documentação

Serviço central de envio de e-mail do ecossistema. Um único endpoint: autentica
por app (Bearer), renderiza o HTML com a identidade da marca e envia pela Resend.

> **Privada.** Esta pasta (`docs/`) e arquivos `.md` são bloqueados pelo `.htaccess` —
> não são servidos na web. Só existe no repositório.

- **Base URL:** `https://<seu-dominio>/`
- **Endpoint:** `POST /`  (é o único; qualquer outro método → 405)
- **Content-Type:** `application/json`
- **Auth:** `Authorization: Bearer <API_KEY>`

---

## Autenticação

Cada app tem uma chave no `apps.json` (fica acima do docroot, fora da web). A chave
mapeia para uma identidade `{ name, from?, rpm? }`. A comparação é em tempo constante.

```
Authorization: Bearer <API_KEY_DO_APP>
```

Sem header válido → `401 Não autorizado`. Gere chaves com `openssl rand -hex 32`
(ou use `bin/newkey.php`).

---

## Corpo da requisição

| Campo       | Tipo             | Obrigatório | Descrição |
|-------------|------------------|-------------|-----------|
| `to`        | string (email)   | ⚠️          | Destinatário. Se ausente/inválido, usa o `MAIL_TO` de fallback; sem os dois → 400. |
| `subject`   | string           | não         | Assunto. Default `"Mensagem"`. CRLF removido, cortado em 200 chars. |
| `preheader` | string           | não         | Texto de preview. Default = `subject`. |
| `replyTo`   | string (email)   | não         | Reply-To. Ignorado se não for e-mail válido. |
| `markdown`  | string           | ⚠️\*        | Conteúdo em Markdown. |
| `blocks`    | array            | ⚠️\*        | Conteúdo estruturado (tem prioridade sobre `markdown`). |

\* É preciso **um** dos dois: `blocks` (se vier array não-vazio) **ou** `markdown`.
Nenhum conteúdo → `400 Conteúdo vazio`.

O **remetente (`from`) não vem na requisição** — é a identidade do app no `apps.json`
(ou o `MAIL_FROM` default). O domínio precisa estar verificado na Resend.

Payload máximo: **200 KB**.

---

## Conteúdo: `markdown`

Markdown completo, renderizado com o estilo da marca. Extra: um link com title `btn`
(ou `button`) vira botão:

```markdown
[Fale comigo](https://exemplo.com "btn")
```

Exemplo:

```json
{
  "to": "cliente@exemplo.com",
  "subject": "Bem-vindo",
  "markdown": "# Olá!\n\nObrigado por se cadastrar.\n\n[Acessar](https://app.exemplo.com \"btn\")"
}
```

## Conteúdo: `blocks`

Array de blocos estruturados. Vocabulário de `type`:

| `type`   | Campos                          | Notas |
|----------|---------------------------------|-------|
| `h1` `h2` `h3` `p` | `text` **ou** `md`    | `text` = literal escapado; `md` = markdown inline (negrito, itálico, link). |
| `quote`  | `text` ou `md`                  | Citação. |
| `list`   | `items[]`, `ordered?` (bool)    | Cada item: string, ou `{text}` / `{md}`. `ordered:true` → `<ol>`. |
| `button` | `text`, `href`                  | Botão. `href` só aceita `http(s)://` ou `mailto:`. |
| `hr`     | —                               | Linha divisória. |

`type` desconhecido é tratado como `p` (não quebra a API).

Exemplo:

```json
{
  "to": "cliente@exemplo.com",
  "subject": "Seu pedido",
  "blocks": [
    { "type": "h1", "text": "Pedido confirmado" },
    { "type": "p", "md": "Obrigado, **João**! Segue o resumo:" },
    { "type": "list", "items": ["Item A", "Item B"] },
    { "type": "button", "text": "Rastrear", "href": "https://exemplo.com/track" },
    { "type": "hr" }
  ]
}
```

---

## Respostas

Sempre JSON.

| HTTP | Corpo | Quando |
|------|-------|--------|
| `200` | `{ "ok": true, "id": "<resend_id>" }` | Enviado. `id` é o ID da Resend. |
| `400` | `{ "ok": false, "error": "JSON inválido" }` | Corpo não é JSON. |
| `400` | `{ "ok": false, "error": "Conteúdo vazio" }` | Sem `blocks` nem `markdown`. |
| `400` | `{ "ok": false, "error": "Destinatário inválido" }` | `to` e fallback ausentes/inválidos. |
| `401` | `{ "ok": false, "error": "Não autorizado" }` | Bearer ausente ou não confere. |
| `405` | `{ "ok": false, "error": "Método não permitido" }` | Não foi POST. |
| `413` | `{ "ok": false, "error": "Payload inválido" }` | Corpo > 200 KB. |
| `429` | `{ "ok": false, "error": "Rate limit" }` | Estourou o limite. Header `Retry-After` em segundos. |
| `500` | `{ "ok": false, "error": "Servidor sem apps configurados" }` | `apps.json` ausente/vazio. |
| `500` | `{ "ok": false, "error": "Servidor sem chave configurada" }` | `RESEND_API_KEY` vazio. |
| `502` | `{ "ok": false, "error": "Falha ao enviar" }` | Resend recusou (veja o `error_log`). |

---

## Rate limit

Janela fixa de **60s por app**. Limite = `rpm` do app no `apps.json`, senão
`RATE_LIMIT_PER_MIN` do `.env` (default 60). `0` desativa. Ao estourar: `429` +
header `Retry-After`.

---

## Exemplo com cURL

```bash
curl -X POST https://seu-dominio/ \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "cliente@exemplo.com",
    "subject": "Olá",
    "markdown": "# Oi!\n\nMensagem de teste."
  }'
```

## Exemplo com fetch (JS)

```js
await fetch("https://seu-dominio/", {
  method: "POST",
  headers: {
    "Authorization": `Bearer ${API_KEY}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    to: "cliente@exemplo.com",
    subject: "Olá",
    blocks: [{ type: "h1", text: "Oi!" }],
  }),
});
```

---

## Config do servidor (referência)

Fora do docroot (na home, não servidos): `.env` e `apps.json`. Runtime: `.ratelimit/`.

**`.env`** — `RESEND_API_KEY`, `MAIL_FROM` (remetente default), `MAIL_TO` (destinatário
fallback), `RATE_LIMIT_PER_MIN`.

**`apps.json`** — mapa `chave → { name, from?, rpm? }`. Ver `apps.json.example`.
