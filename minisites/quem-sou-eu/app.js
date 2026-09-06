// Quem sou eu? — máquina de estados + timers + persistência.
// Estados: 'categoria' | 'pronto' | 'preparar' | 'revelar' | 'oculto'

(function () {
  "use strict";

  // --- Constantes de tempo ---
  const PREP_MS = 3000; // contagem antes de revelar
  const REVEAL_MS = 5000; // tempo que a palavra fica na tela
  const MAX_USADAS = 10; // quantas palavras recentes lembrar (anti-repetição)

  // --- Chaves de localStorage ---
  const K_ATUAL = "quemSouEu:atual"; // { categoria, palavra }
  const K_USADAS = "quemSouEu:usadas"; // { [categoria]: [palavras...] }
  const PERSONALIZADO = "personalizado"; // modo: o jogador digita a palavra

  // --- Estado em memória ---
  let estado = "categoria";
  let atual = null; // { categoria, palavra }
  let timers = []; // ids de setTimeout/Interval ativos

  // --- Helpers de persistência ---
  function lerJSON(chave, fallback) {
    try {
      const raw = localStorage.getItem(chave);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
      return fallback;
    }
  }

  function salvarJSON(chave, valor) {
    try {
      localStorage.setItem(chave, JSON.stringify(valor));
    } catch (e) {
      /* armazenamento indisponível — segue sem persistir */
    }
  }

  function registrarUsada(categoria, palavra) {
    const mapa = lerJSON(K_USADAS, {});
    const lista = mapa[categoria] || [];
    lista.push(palavra);
    mapa[categoria] = lista.slice(-MAX_USADAS);
    salvarJSON(K_USADAS, mapa);
  }

  function usadasDe(categoria) {
    const mapa = lerJSON(K_USADAS, {});
    return mapa[categoria] || [];
  }

  // --- Timers (limpos a cada troca de tela) ---
  function limparTimers() {
    timers.forEach((id) => {
      clearTimeout(id);
      clearInterval(id);
    });
    timers = [];
  }

  // --- Wake lock (opcional, com fallback silencioso) ---
  let wakeLock = null;
  async function pedirWakeLock() {
    try {
      if ("wakeLock" in navigator) {
        wakeLock = await navigator.wakeLock.request("screen");
      }
    } catch (e) {
      /* indisponível ou negado — ignora */
    }
  }
  function soltarWakeLock() {
    try {
      if (wakeLock) {
        wakeLock.release();
        wakeLock = null;
      }
    } catch (e) {
      /* ignora */
    }
  }

  // --- Render: mostra a <section> do estado atual ---
  const screens = {};
  document.querySelectorAll("[data-screen]").forEach((el) => {
    screens[el.dataset.screen] = el;
  });

  function render() {
    Object.entries(screens).forEach(([nome, el]) => {
      el.classList.toggle("is-active", nome === estado);
    });
  }

  // Nome amigável da categoria para exibição.
  function nomeCategoria(cat) {
    if (cat === "todas") return "Todas as categorias";
    if (cat === PERSONALIZADO) return "Personalizado";
    return cat;
  }

  // --- Sortear e salvar a palavra atual ---
  function novaPalavra(categoria) {
    const palavra = sortearPalavra(categoria, usadasDe(categoria));
    if (!palavra) {
      alert("Ops! Não há palavras disponíveis nesta categoria. Escolha outra.");
      irPara("categoria");
      return;
    }
    atual = { categoria, palavra };
    salvarJSON(K_ATUAL, atual);
    registrarUsada(categoria, palavra);
  }

  // --- Transições de estado ---
  function irPara(novo) {
    limparTimers();
    estado = novo;
    render();
  }

  function entrarPronto() {
    soltarWakeLock();
    const el = document.getElementById("readyCat");
    el.textContent = nomeCategoria(atual.categoria);
    irPara("pronto");
  }

  function iniciarPartida() {
    pedirWakeLock();
    irPara("preparar");
    document.getElementById("preparaCat").textContent = nomeCategoria(atual.categoria);
    let n = Math.round(PREP_MS / 1000);
    const cd = document.getElementById("countdown");
    cd.textContent = String(n);
    const intervalo = setInterval(() => {
      n -= 1;
      if (n > 0) cd.textContent = String(n);
    }, 1000);
    timers.push(intervalo);
    timers.push(setTimeout(revelar, PREP_MS));
  }

  function revelar() {
    limparTimers();
    estado = "revelar";

    // Insere a palavra no DOM só agora (anti-vazamento).
    const word = document.getElementById("word");
    word.textContent = atual.palavra;

    // Reinicia a animação de bloom e da barra de progresso.
    const screenEl = screens.revelar;
    screenEl.classList.remove("is-revealing");
    const bar = document.getElementById("progressBar");
    bar.style.transition = "none";
    bar.style.transform = "scaleX(1)";

    render();

    // Força reflow e dispara as animações no próximo frame.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        screenEl.classList.add("is-revealing");
        bar.style.transition = "transform " + REVEAL_MS + "ms linear";
        bar.style.transform = "scaleX(0)";
      });
    });

    timers.push(setTimeout(ocultar, REVEAL_MS));
  }

  function ocultar() {
    limparTimers();
    soltarWakeLock();
    // Remove a palavra do DOM ao sair da revelação.
    document.getElementById("word").textContent = "";
    document.getElementById("ocultosCat").textContent = nomeCategoria(atual.categoria);
    estado = "oculto";
    render();
  }

  // --- Tela de categorias: monta os cards ---
  function montarCategorias() {
    const cont = document.getElementById("cats");
    cont.innerHTML = "";

    // Card destacado: todas as categorias.
    const todas = document.createElement("button");
    todas.className = "cat cat-todas";
    todas.innerHTML =
      '<span class="cat-todas-text">' +
        '<span class="cat-name">Todas as categorias</span>' +
        '<span class="cat-sub">sorteio misturado</span>' +
      '</span>';
    todas.addEventListener("click", () => escolherCategoria("todas"));
    cont.appendChild(todas);

    CATEGORIAS.forEach((c) => {
      const btn = document.createElement("button");
      btn.className = "cat";
      btn.innerHTML = '<span class="cat-name">' + c + "</span>";
      btn.addEventListener("click", () => escolherCategoria(c));
      cont.appendChild(btn);
    });

    // Card destacado: modo personalizado (o jogador escreve a palavra).
    const custom = document.createElement("button");
    custom.className = "cat cat-custom";
    custom.innerHTML =
      '<span class="cat-todas-text">' +
        '<span class="cat-name">Personalizado</span>' +
        '<span class="cat-sub">você escreve a palavra</span>' +
      "</span>";
    custom.addEventListener("click", abrirPersonalizado);
    cont.appendChild(custom);
  }

  function escolherCategoria(categoria) {
    novaPalavra(categoria);
    entrarPronto();
  }

  // --- Modo personalizado: o jogador digita a própria palavra ---
  function abrirPersonalizado() {
    const input = document.getElementById("inputPalavra");
    input.value = "";
    irPara("personalizado");
    setTimeout(() => input.focus(), 60); // abre o teclado após a transição
  }

  function confirmarPersonalizado(texto) {
    const palavra = (texto || "").trim();
    if (!palavra) return; // ignora envio vazio
    atual = { categoria: PERSONALIZADO, palavra: palavra };
    salvarJSON(K_ATUAL, atual);
    document.getElementById("inputPalavra").value = "";
    entrarPronto();
  }

  // --- Ligações de botões ---
  function ligarBotoes() {
    document.getElementById("btnIniciar").addEventListener("click", iniciarPartida);

    document.getElementById("btnTrocarCategoria").addEventListener("click", () => {
      atual = null;
      localStorage.removeItem(K_ATUAL);
      irPara("categoria");
    });

    document.getElementById("btnCancelar").addEventListener("click", entrarPronto);

    document.getElementById("btnLerDeNovo").addEventListener("click", iniciarPartida);

    document.getElementById("btnNovaPalavra").addEventListener("click", () => {
      if (atual.categoria === PERSONALIZADO) {
        abrirPersonalizado(); // no modo custom, digita outra palavra
        return;
      }
      novaPalavra(atual.categoria);
      entrarPronto();
    });

    document.getElementById("formPersonalizado").addEventListener("submit", (e) => {
      e.preventDefault();
      confirmarPersonalizado(document.getElementById("inputPalavra").value);
    });

    document.getElementById("btnCancelarCustom").addEventListener("click", () => {
      atual = null;
      localStorage.removeItem(K_ATUAL);
      irPara("categoria");
    });
  }

  // --- Boot: retoma a palavra salva, se houver ---
  function iniciar() {
    montarCategorias();
    ligarBotoes();

    const salvo = lerJSON(K_ATUAL, null);
    if (salvo && salvo.palavra) {
      atual = salvo;
      entrarPronto();
    } else {
      irPara("categoria");
    }
  }

  iniciar();
})();
