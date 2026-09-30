# Formulário de briefing

Briefing que o cliente preenche antes da proposta; as respostas chegam
formatadas por e-mail (via Resend).

HTML/CSS/JS puro, como o resto do site (antes era um build Vue do repo
`nls_form`, aposentado em set/2026):

- `index.html` — as perguntas, em 5 passos (`fieldset.bf-step`). Campo
  condicional: `data-show-if="nome=valor"`.
- `form.js` — navegação, validação inline, salva no localStorage
  (`briefing-v2`), monta o markdown e faz POST em `api/send.php`.
- `form.css` — layout; tokens e fontes vêm de `/css/site.css`.
- `api/send.php` — recebe `{subject, markdown, replyTo, website}` e envia o
  e-mail; segredos vêm do `.env.form` três níveis acima (fora da web) — ver
  `ops/DEPLOY.md` na raiz. `website` é honeypot.

Mudou `form.css`/`form.js`? Suba o `?v=` no `index.html` (Cloudflare).
