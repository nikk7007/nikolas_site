// Renderização da vitrine/catálogo e micro-interações da página.
// Sem dependências: os dados vêm de js/data/*.js (window.NLS_PROJECTS/NLS_GAMES).
(function () {
  "use strict";

  // Capa tipográfica gerada na identidade (grafite + linhas ardósia + título),
  // usada enquanto um projeto não tem imagem própria.
  function coverSVG(title) {
    var initial = (title || "?").trim().charAt(0).toUpperCase();
    return (
      '<svg viewBox="0 0 640 360" role="img" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">' +
      '<rect width="640" height="360" fill="#1c1e22"/>' +
      '<path d="M-20 260C140 250 210 140 400 150 590 160 620 90 700 80" stroke="rgba(124,147,172,.35)" stroke-width="2" fill="none"/>' +
      '<path d="M-20 300C180 295 260 200 460 210 620 218 640 170 700 160" stroke="rgba(124,147,172,.22)" stroke-width="2" fill="none"/>' +
      '<text x="48" y="212" font-family="Inter, system-ui, sans-serif" font-size="120" font-weight="700" fill="#f4f2ee">' +
      initial +
      "</text>" +
      '<path d="M46 250l84 -18" stroke="#d8cbb8" stroke-width="5" stroke-linecap="round"/>' +
      "</svg>"
    );
  }

  function el(tag, cls, html) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  }

  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }

  // root: prefixo até a raiz do site ("" na home, "../" dentro de /games).
  function renderCards(mount, items, root, linkHint) {
    items.forEach(function (item) {
      var href = item.slug ? root + "games/" + item.slug + "/" : item.link;
      var card = el(href ? "a" : "article", "card reveal");
      if (href) {
        card.href = href;
        // Link externo abre em nova aba; navegação interna fica na mesma.
        if (/^https?:\/\//i.test(href)) {
          card.target = "_blank";
          card.rel = "noopener";
        }
      }

      var cover = el("div", "card-cover");
      if (item.cover) {
        cover.innerHTML =
          '<img src="' + esc(root + item.cover) + '" alt="" loading="lazy" width="640" height="360">';
      } else {
        cover.innerHTML = coverSVG(item.title);
      }
      card.appendChild(cover);

      var body = el("div", "card-body");
      body.appendChild(el("h3", null, esc(item.title)));
      body.appendChild(el("p", null, esc(item.description)));
      if (item.tags && item.tags.length) {
        var tags = el("div", "card-tags");
        item.tags.forEach(function (t) {
          tags.appendChild(el("span", "tag", esc(t)));
        });
        body.appendChild(tags);
      }
      if (href) body.appendChild(el("span", "card-link-hint", linkHint));
      card.appendChild(body);
      mount.appendChild(card);
    });
  }

  var projectsMount = document.getElementById("projects-cards");
  if (projectsMount && window.NLS_PROJECTS) {
    renderCards(projectsMount, window.NLS_PROJECTS, "", "Visitar →");
  }

  var gamesMount = document.getElementById("games-cards");
  if (gamesMount && window.NLS_GAMES) {
    var root = gamesMount.getAttribute("data-root") || "";
    renderCards(gamesMount, window.NLS_GAMES, root, "Jogar →");
  }

  // Header flutuante — depois de rolar, descola do topo e das laterais.
  // Limiares diferentes pra entrar/sair evitam tremida perto do topo.
  var head = document.querySelector(".site-head");
  if (head) {
    var floating = false;
    var headTick = false;
    var updateHead = function () {
      var y = window.scrollY;
      if (!floating && y > 32) {
        floating = true;
        head.classList.add("is-floating");
      } else if (floating && y < 8) {
        floating = false;
        head.classList.remove("is-floating");
      }
    };
    window.addEventListener(
      "scroll",
      function () {
        if (headTick) return;
        headTick = true;
        requestAnimationFrame(function () {
          headTick = false;
          updateHead();
        });
      },
      { passive: true }
    );
    updateHead();
  }

  // Revelação no scroll — desligada se o sistema pedir menos movimento.
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Menu mobile — hamburguer abre o card que desce de trás do header.
  var toggle = document.querySelector(".nav-toggle");
  if (head && toggle) {
    var setMenu = function (open) {
      head.classList.toggle("menu-open", open);
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
      toggle.setAttribute("aria-label", open ? "Fechar menu" : "Abrir menu");
    };
    toggle.addEventListener("click", function () {
      setMenu(!head.classList.contains("menu-open"));
    });
    document.querySelectorAll(".site-menu a").forEach(function (a) {
      a.addEventListener("click", function () { setMenu(false); });
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && head.classList.contains("menu-open")) {
        setMenu(false);
        toggle.focus();
      }
    });
  }

  // Links do menu e do footer — troca de letras no hover, em ordem
  // aleatória por letra. Com menos movimento, ficam como texto simples.
  if (!reduced) {
    document.querySelectorAll(".site-nav a, .site-foot nav a").forEach(function (link) {
      var text = link.textContent.trim();
      if (!text) return;
      link.setAttribute("aria-label", text);

      var order = [];
      for (var i = 0; i < text.length; i++) order.push(i);
      for (var j = order.length - 1; j > 0; j--) {
        var k = Math.floor(Math.random() * (j + 1));
        var tmp = order[j];
        order[j] = order[k];
        order[k] = tmp;
      }

      var html = "";
      text.split("").forEach(function (ch, n) {
        var letter = ch === " " ? "&nbsp;" : esc(ch);
        html +=
          '<span class="lswap"><span class="lswap-col" style="transition-delay:' +
          (order.indexOf(n) * 0.025).toFixed(3) +
          's"><span>' + letter + "</span><span>" + letter + "</span></span></span>";
      });
      link.innerHTML = '<span aria-hidden="true">' + html + "</span>";
    });
  }
  var targets = document.querySelectorAll(".reveal");
  if (reduced || !("IntersectionObserver" in window)) {
    targets.forEach(function (t) { t.classList.add("is-in"); });
  } else {
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) {
            e.target.classList.add("is-in");
            io.unobserve(e.target);
          }
        });
      },
      { rootMargin: "0px 0px -8% 0px" }
    );
    targets.forEach(function (t) { io.observe(t); });
  }
})();
