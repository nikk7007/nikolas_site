// Catálogo de games & minisites (nikolasleme.com.br/games).
// Pra publicar um jogo novo: crie a pasta games/<slug>/ e acrescente a entrada.
//   slug:  vira o link games/<slug>/
//   cover: imagem 16:9 (caminho relativo à RAIZ do site) ou null pra capa gerada.
window.NLS_GAMES = [
  {
    slug: "roleta",
    title: "Spin — Roleta online",
    description:
      "Adicione qualquer lista de itens, personalize e gire. Perfeita pra sorteios e decisões difíceis entre amigos.",
    cover: "games/roleta/og-image.png",
    tags: ["Sorteio", "Grupo"],
  },
  {
    slug: "quem-sou-eu",
    title: "Quem sou eu?",
    description:
      "O app sorteia uma palavra, você encosta o celular na testa e os amigos dão as dicas. Funciona até offline.",
    cover: "games/quem-sou-eu/assets/og-image.png",
    tags: ["Festa", "Offline"],
  },
];
