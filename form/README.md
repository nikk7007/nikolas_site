# Formulário de briefing

Formulário que o Nikolas envia a clientes no início de cada projeto; as
respostas chegam formatadas por e-mail (via Resend) e alimentam a proposta.

**Esta pasta é só o build.** O fonte (Vue + Vite) mora no repo privado
[`nls_form`](https://github.com/nikk7007/nls_form) — pra alterar o formulário:
alterar lá, `npm run build` e copiar o `dist/` pra cá (mantendo `api/`).

- `index.html` + `assets/` — build Vue (chama `api/send.php` com caminho relativo)
- `api/send.php` — recebe as respostas e envia o e-mail; segredos vêm do
  `.env.form` três níveis acima (fora da web) — ver `ops/DEPLOY.md` na raiz
