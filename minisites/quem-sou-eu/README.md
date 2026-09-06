# Quem sou eu?

Jogo de adivinhação para grupos — versão web, sem instalação, funciona offline.

O app sorteia uma palavra e a exibe brevemente na tela. O jogador encosta o celular na testa antes da contagem, vê a palavra pelos segundos que a barra permite, e tenta adivinhar com as dicas dos outros.

---

## Como jogar

1. Escolha uma categoria (ou "Todas", ou **Personalizado** para digitar a palavra).
2. Encoste o celular na testa.
3. Toque em **Visualizar palavra** — contagem de 3 s começa.
4. A palavra aparece por 5 s e some.
5. Os outros jogadores dão dicas; você tenta adivinhar.
6. **Nova palavra** para o próximo jogador. **Ler de novo** reexibe (com a contagem) se alguém não viu.

---

## Categorias

| Categoria    | Exemplos                              |
|--------------|---------------------------------------|
| Animais      | Capivara, Pinguim, Jacaré…            |
| Famosos      | Pelé, Anitta, Casimiro, Endrick…      |
| Objetos      | Guarda-chuva, Videogame, Skate…       |
| Filmes       | Cidade de Deus, Barbie, Coringa…      |
| Comidas      | Açaí, Coxinha, Ramen, Fondue…         |
| Profissões   | Streamer, Barista, Astronauta…        |
| Lugares      | Baile funk, Lan house, Cachoeira…     |

Há ainda o modo **Personalizado**: em vez de sortear, uma pessoa digita a palavra
(o jogador da vez não olha) e o jogo segue o fluxo normal — contagem, revelação e ocultação.

---

## Stack

- HTML / CSS / JS puro — zero dependências, zero build step.
- Fonte display: **Archivo Black**; mono: **IBM Plex Mono** (Google Fonts).
- Visual: dark industrial brutalist, substrate CRT, accent vermelho hazard.
- Persistência via `localStorage` — retoma a palavra se o app for fechado.
- Wake Lock API (quando disponível) — tela não apaga durante a revelação.
- PWA: `manifest.webmanifest` (instalável no celular) + service worker (`sw.js`) para uso **offline**.

---

## Rodar localmente

```bash
# qualquer servidor estático funciona, ex:
npx serve .
# ou
python -m http.server
```

Abre `http://localhost:3000` (ou a porta que o servidor indicar).

> Não funciona via `file://` — a Wake Lock API e o service worker exigem `https` ou `localhost`. Use um servidor local.

---

## Adicionar palavras

Edite [words.js](words.js). Cada categoria é uma chave em `WORDS`:

```js
Animais: [
  "Cachorro",
  "MinhaNovaAnimal", // <-- adicione aqui
  ...
]
```

Para criar uma nova categoria, adicione uma nova chave. O app a exibe automaticamente na tela inicial.

---

## Estrutura

```
quem_sou_eu/
├── index.html   — estrutura e telas (5 states)
├── app.js       — máquina de estados, timers, persistência
├── words.js     — banco de palavras por categoria
└── styles.css   — tema industrial / CRT
```
