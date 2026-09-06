# Calculadora de juros compostos — fonte

App React (Vite + TypeScript + Recharts) da página `/games/juros-compostos/`.
Esta pasta é **só o fonte** — ela não sobe no deploy (`--exclude 'apps/'` no
`ops/deploy.sh`). O que vai pro ar é o build commitado em
`games/juros-compostos/`.

## Fluxo

```bash
# Node via nvm (a máquina não tem Node global)
. "$HOME/.nvm/nvm.sh"

npm install        # primeira vez
npm run dev        # desenvolvimento (o vite.config serve /css, /js e /assets
                   # da raiz do repo, então o shell do site funciona)
npm run build      # typecheck + build → ../../games/juros-compostos/
```

Depois do build, **commitar o dist junto** — o servidor não tem Node e o
deploy é rsync do que está no repo (mesmo esquema do `form/`).

## Estrutura

- `index.html` — shell do site (header/footer copiados de `games/index.html`,
  caminhos absolutos como no `404.html`) + `#calc-root` onde o React monta.
- `src/lib/finance.ts` — matemática pura (anuidade ordinária: aporte no fim
  do mês). `nice.ts` escolhe os "bons números" da matriz do modo meta.
- `src/components/` — dois modos: `SimPanel` (simulação com gráfico + tabela
  anual) e `MetaPanel` (matriz aporte × tempo; célula clicada abre
  `ScenarioDetail`).
- `src/app.css` — usa os tokens de `/css/site.css`. Regra da marca: um ponto
  quente (areia) por tela — aqui é a série de juros do gráfico ou as células
  que batem a meta.
