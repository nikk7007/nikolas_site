// Catálogo de minisites (nikolasleme.com.br/minisites).
// Pra publicar um minisite novo: crie a pasta minisites/<slug>/ e acrescente a entrada.
//   slug:  vira o link minisites/<slug>/
//   cover: imagem 16:9 (caminho relativo à RAIZ do site) ou null pra capa gerada.
window.NLS_MINISITES = [
  {
    slug: "roleta",
    title: "Spin — Roleta online",
    description:
      "Adicione qualquer lista de itens, personalize e gire. Perfeita pra sorteios e decisões difíceis entre amigos.",
    cover: "minisites/roleta/og-image.png",
    tags: ["Sorteio", "Grupo"],
  },
  {
    slug: "quem-sou-eu",
    title: "Quem sou eu?",
    description:
      "O app sorteia uma palavra, você encosta o celular na testa e os amigos dão as dicas. Funciona até offline.",
    cover: "minisites/quem-sou-eu/assets/og-image.png",
    tags: ["Festa", "Offline"],
  },
  {
    slug: "juros-compostos",
    title: "Juros compostos — calculadora",
    description:
      "Simule aportes mensais e veja o patrimônio crescer, ou diga sua meta e descubra quanto guardar por mês.",
    cover: null,
    tags: ["Ferramenta", "Finanças"],
  },
];
