// Vitrine de projetos da página principal.
// Pra adicionar um projeto: acrescente um objeto aqui — nada mais.
//   cover: caminho de imagem (16:9). Sem imagem ainda? Use null que o site
//          gera uma capa tipográfica na identidade da marca.
//   link:  null = card sem link (ex.: código privado).
window.NLS_PROJECTS = [
  {
    title: "Lemecc",
    description:
      "Site institucional de cliente: presença sóbria, rápida e fácil de manter, do domínio ao deploy.",
    cover: null,
    link: "https://lemecc.com.br",
    tags: ["Site", "Cliente"],
  },
  {
    title: "Vipax",
    description:
      "Landing page de produto — estrutura enxuta, foco em conversão e carregamento instantâneo.",
    cover: null,
    link: "https://vipax.eco.br",
    tags: ["Landing page", "Cliente"],
  },
  {
    title: "Formulário de briefing",
    description:
      "Formulário que envio a clientes no início de cada projeto: as respostas chegam formatadas no meu e-mail e alimentam a proposta.",
    cover: null,
    link: "/form/",
    tags: ["Vue", "Produto próprio"],
  },
  {
    title: "API de e-mail central",
    description:
      "Serviço PHP que autentica por app, renderiza e-mails na identidade da marca e envia — com testes e rate limit. Código privado.",
    cover: null,
    link: null,
    tags: ["PHP", "API", "Infra"],
  },
];
