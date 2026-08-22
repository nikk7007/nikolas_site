/* app.js — wires everything together */
(function () {
  "use strict";

  // ---------- state ----------
  let items = [];
  let history = [];
  let tweaks = Object.assign({}, window.TWEAK_DEFAULTS);
  let wheel, spinner, fx;
  let lastWinnerId = null;
  let selectedPresetId = null;
  let trollActive = false;
  let trollStartTime = 0;
  let trollRafId = null;
  const TROLL_DURATION = 30000;

  const PRESETS = [
    {
      id: "comida",
      icon: "🍕",
      name: "Comida",
      items: [
        "Pizza",
        "Sushi",
        "Hambúrguer",
        "Salada",
        "Pastel",
        "Açaí",
        "Churrasco",
        "Tapioca",
        "Hot dog",
        "Frango frito",
      ],
    },
    {
      id: "semana",
      icon: "📅",
      name: "Dias da semana",
      items: [
        "Segunda",
        "Terça",
        "Quarta",
        "Quinta",
        "Sexta",
        "Sábado",
        "Domingo",
      ],
    },
    { id: "simnao", icon: "✅", name: "Sim ou Não", items: ["Sim", "Não"] },
    {
      id: "numeros",
      icon: "🎲",
      name: "Números 1–6",
      items: ["1", "2", "3", "4", "5", "6"],
    },
    {
      id: "cores",
      icon: "🎨",
      name: "Cores",
      items: [
        "Vermelho",
        "Azul",
        "Verde",
        "Amarelo",
        "Laranja",
        "Roxo",
        "Rosa",
        "Branco",
        "Preto",
      ],
    },
    {
      id: "filmes",
      icon: "🎬",
      name: "Gêneros de filme",
      items: [
        "Ação",
        "Comédia",
        "Terror",
        "Romance",
        "Ficção científica",
        "Drama",
        "Animação",
        "Suspense",
      ],
    },
    {
      id: "esportes",
      icon: "🏆",
      name: "Esportes",
      items: [
        "Futebol",
        "Vôlei",
        "Basquete",
        "Natação",
        "Corrida",
        "Ciclismo",
        "Tênis",
        "Surf",
      ],
    },
    {
      id: "musica",
      icon: "🎵",
      name: "Ritmos",
      items: [
        "Funk",
        "Sertanejo",
        "Pagode",
        "Rock",
        "Pop",
        "MPB",
        "Eletrônico",
        "Forró",
      ],
    },
    {
      id: "materias",
      icon: "📚",
      name: "Matérias",
      items: [
        "Matemática",
        "Português",
        "História",
        "Geografia",
        "Ciências",
        "Inglês",
        "Física",
        "Química",
      ],
    },
    {
      id: "paises",
      icon: "🌍",
      name: "Países",
      items: [
        "Brasil",
        "Estados Unidos",
        "França",
        "Japão",
        "Itália",
        "Espanha",
        "Portugal",
        "Argentina",
        "México",
        "Alemanha",
      ],
    },
  ];

  // Apply URL params on first load (overrides storage)
  const urlLabels = window.SpinStorage.itemsFromURL();
  const urlPalette = window.SpinStorage.paletteFromURL();

  // ---------- init ----------
  document.addEventListener("DOMContentLoaded", init);

  function init() {
    // Theme
    const savedTheme = window.SpinStorage.loadTheme();
    document.body.setAttribute("data-theme", savedTheme || "dark");

    // Tweaks
    const savedTweaks = window.SpinStorage.loadTweaks();
    if (savedTweaks) tweaks = Object.assign({}, tweaks, savedTweaks);
    const urlTweaks = window.SpinStorage.tweaksFromURL();
    if (urlTweaks) tweaks = Object.assign({}, tweaks, urlTweaks);
    // backward compat: old links usam ?palette=
    if (urlPalette && window.Utils.PALETTES[urlPalette]) {
      tweaks.palette = urlPalette;
    }
    applyTweaks();

    // History
    history = window.SpinStorage.loadHistory();

    // Items
    if (urlLabels) {
      items = urlLabels.map((label, i) => ({
        id: window.Utils.uid(),
        label,
        color: window.Utils.colorForIndex(tweaks.palette, i),
      }));
      window.SpinStorage.saveItems(items);
      window.SpinStorage.clearURL();
      window.Utils.toast("Roleta importada do link");
    } else {
      const saved = window.SpinStorage.loadItems();
      if (saved && saved.length) items = saved;
      else items = sampleItems();
    }

    // Canvas + spin
    const canvas = document.getElementById("wheel");
    wheel = new window.Wheel(canvas);
    wheel.setPalette(tweaks.palette);
    wheel.setStyle(tweaks.wheelStyle);
    refreshColors();
    wheel.setItems(items);

    spinner = new window.Spinner(wheel, {
      onStart: () => {
        setStatus("girando…", "spinning");
        setLocked(true);
        document.getElementById("btn-spin").disabled = true;
        document.querySelector(".wheel-wrap").classList.add("is-spinning");
        document.getElementById("spin-sub").textContent = "boa sorte";
      },
      onTick: (idx, intensity) => {
        window.Utils.sound.tick(intensity);
        const ptr = document.getElementById("pointer");
        ptr.classList.remove("is-ticking");
        // force reflow to restart animation
        void ptr.offsetWidth;
        ptr.classList.add("is-ticking");
      },
      onStop: (winnerIdx) => {
        setLocked(false);
        document.getElementById("btn-spin").disabled = false;
        document.querySelector(".wheel-wrap").classList.remove("is-spinning");
        document.getElementById("spin-sub").textContent = "toque pra rodar";
        setStatus("parado", "done");
        const winner = items[winnerIdx];
        if (winner) showResult(winner);
      },
    });
    spinner.setSpinPower(tweaks.spinPower);

    // FX
    const fxCanvas = document.getElementById("fx");
    fx = new window.FX(fxCanvas);

    // Render
    renderList();
    renderHistory();
    updateCount();

    // resize obs to keep canvas DPR-correct
    if ("ResizeObserver" in window) {
      const ro = new ResizeObserver(() => wheel._handleResize());
      ro.observe(canvas);
    }

    bindEvents();
    bindTweaks();
  }

  function sampleItems() {
    const labels = ["Pizza", "Sushi", "Hambúrguer", "Salada", "Pastel", "Açaí"];
    return labels.map((label, i) => ({
      id: window.Utils.uid(),
      label,
      color: window.Utils.colorForIndex(tweaks.palette, i),
    }));
  }

  // ---------- events ----------
  function bindEvents() {
    const triggerSpin = () => {
      if (!items.length) {
        window.Utils.toast("Adicione itens primeiro");
        return;
      }
      if (spinner.spinning || trollActive) return;
      window.Utils.sound.click();
      if (tweaks.troll) {
        startTrollMode();
      } else {
        spinner.spin();
      }
    };
    document.getElementById("btn-spin").addEventListener("click", triggerSpin);
    // make the whole wheel clickable too
    document.querySelector(".wheel-wrap").addEventListener("click", (e) => {
      // ignore clicks that originated on the hub button (already handled)
      if (e.target.closest("#btn-spin")) return;
      triggerSpin();
    });

    document.getElementById("add-form").addEventListener("submit", (e) => {
      e.preventDefault();
      if (spinner.spinning) return;
      const input = document.getElementById("add-input");
      const v = input.value.trim();
      if (!v) return;
      addItem(v);
      input.value = "";
      input.focus();
    });

    document.getElementById("btn-shuffle").addEventListener("click", () => {
      if (spinner.spinning) return;
      if (items.length < 2) return;
      // Fisher–Yates
      for (let i = items.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [items[i], items[j]] = [items[j], items[i]];
      }
      refreshColors();
      wheel.setItems(items);
      window.SpinStorage.saveItems(items);
      renderList();
      window.Utils.sound.click();
    });

    document.getElementById("btn-clear").addEventListener("click", () => {
      if (spinner.spinning) return;
      if (!items.length) return;
      if (!confirm("Remover todos os itens?")) return;
      items = [];
      window.SpinStorage.saveItems(items);
      wheel.setItems(items);
      renderList();
      updateCount();
    });

    document
      .getElementById("btn-demo")
      .addEventListener("click", openPresetsModal);

    document.getElementById("btn-share").addEventListener("click", share);

    document.getElementById("btn-theme").addEventListener("click", () => {
      const cur = document.body.getAttribute("data-theme");
      const next = cur === "dark" ? "light" : "dark";
      document.body.setAttribute("data-theme", next);
      window.SpinStorage.saveTheme(next);
      // re-color items for the new theme's palette variant
      refreshColors();
      window.SpinStorage.saveItems(items);
      wheel.setItems(items);
      renderList();
      // also re-render Tweaks swatches if panel is open
      if (!document.getElementById("tweaks-panel").hidden) renderTweaks();
    });

    document
      .getElementById("btn-result-close")
      .addEventListener("click", closeResult);
    document
      .getElementById("btn-result-again")
      .addEventListener("click", () => {
        closeResult();
        setTimeout(() => {
          if (items.length) spinner.spin();
        }, 220);
      });
    document
      .getElementById("btn-result-remove")
      .addEventListener("click", () => {
        if (lastWinnerId) {
          removeItem(lastWinnerId);
          closeResult();
        }
      });

    document.getElementById("result-overlay").addEventListener("click", (e) => {
      if (e.target === e.currentTarget) closeResult();
    });

    document
      .getElementById("btn-history-clear")
      .addEventListener("click", () => {
        history = [];
        window.SpinStorage.clearHistory();
        renderHistory();
      });

    document
      .getElementById("btn-presets")
      .addEventListener("click", openPresetsModal);
    document
      .getElementById("btn-presets-close")
      .addEventListener("click", closePresetsModal);
    document
      .getElementById("presets-overlay")
      .addEventListener("click", (e) => {
        if (e.target === e.currentTarget) closePresetsModal();
      });
    document
      .getElementById("btn-presets-replace")
      .addEventListener("click", () => applyPreset("replace"));
    document
      .getElementById("btn-presets-append")
      .addEventListener("click", () => applyPreset("append"));

    document
      .getElementById("btn-bulk")
      .addEventListener("click", openBulkModal);
    document
      .getElementById("btn-bulk-close")
      .addEventListener("click", closeBulkModal);
    document.getElementById("bulk-overlay").addEventListener("click", (e) => {
      if (e.target === e.currentTarget) closeBulkModal();
    });
    document
      .getElementById("bulk-input")
      .addEventListener("input", updateBulkPreview);
    document
      .getElementById("btn-bulk-replace")
      .addEventListener("click", () => applyBulk("replace"));
    document
      .getElementById("btn-bulk-append")
      .addEventListener("click", () => applyBulk("append"));

    // keyboard
    document.addEventListener("keydown", (e) => {
      if (e.target.tagName === "INPUT") return;
      if (e.code === "Space") {
        e.preventDefault();
        document.getElementById("btn-spin").click();
      }
      if (e.key === "Escape") closeResult();
    });
  }

  function bindTweaks() {
    const fab = document.getElementById("tweaks-fab");
    const panel = document.getElementById("tweaks-panel");
    const close = document.getElementById("tweaks-close");

    // Listen BEFORE announcing availability
    window.addEventListener("message", (e) => {
      const d = e.data || {};
      if (d.type === "__activate_edit_mode") openTweaks();
      if (d.type === "__deactivate_edit_mode") closeTweaks();
    });

    fab.addEventListener("click", openTweaks);
    close.addEventListener("click", () => {
      closeTweaks();
      window.parent.postMessage({ type: "__edit_mode_dismissed" }, "*");
    });

    // Show FAB regardless (also let toolbar toggle work)
    fab.hidden = false;
    window.parent.postMessage({ type: "__edit_mode_available" }, "*");
  }

  function openTweaks() {
    const panel = document.getElementById("tweaks-panel");
    panel.hidden = false;
    document.getElementById("tweaks-fab").hidden = true;
    renderTweaks();
  }
  function closeTweaks() {
    document.getElementById("tweaks-panel").hidden = true;
    document.getElementById("tweaks-fab").hidden = false;
  }

  function renderTweaks() {
    window.SpinTweaks.build(tweaks, (key, value) => {
      tweaks[key] = value;
      applyTweaks();
      window.SpinStorage.saveTweaks(tweaks);
      // tell host so it can persist into TWEAK_DEFAULTS block
      try {
        window.parent.postMessage(
          { type: "__edit_mode_set_keys", edits: { [key]: value } },
          "*",
        );
      } catch (e) {}
      if (key !== 'spinPower') renderTweaks(); // re-render to reflect active states (skip for slider — re-render breaks drag)
    });
  }

  function applyTweaks() {
    // palette
    wheel && wheel.setPalette(tweaks.palette);
    wheel && wheel.setStyle(tweaks.wheelStyle);

    // pointer (always top — side removed)
    document.body.setAttribute("data-pointer", "top");

    // sound
    window.Utils.sound.enabled = !!tweaks.sound;

    // spin power
    if (spinner) spinner.setSpinPower(tweaks.spinPower);

    // history panel visibility
    const histPanel = document.getElementById("history-panel");
    if (histPanel)
      histPanel.hidden = !tweaks.showHistory || history.length === 0;

    // re-color items to match palette
    if (items && items.length) {
      refreshColors();
      wheel && wheel.setItems(items);
      window.SpinStorage.saveItems(items);
      renderList();
    }
  }

  // ---------- troll mode ----------
  function startTrollMode() {
    trollActive = true;
    trollStartTime = Date.now();
    spinner.spinning = true;
    spinner._lastSegment = wheel.indexAtPointer();
    spinner.onStart(); // UI normal: "girando…", lock, etc.
    trollLoop();
  }

  function trollLoop() {
    if (!trollActive) return;
    const elapsed = Date.now() - trollStartTime;
    if (elapsed >= TROLL_DURATION) {
      trollActive = false;
      spinner.velocity = 0.06 * Math.pow(30, elapsed / TROLL_DURATION);
      spinner.friction = 0.982;
      spinner._loop(); // entrega para desaceleração normal
      return;
    }
    const progress = elapsed / TROLL_DURATION;
    const velocity = 0.06 * Math.pow(30, progress);
    const TAU = Math.PI * 2;
    spinner.rotation = ((spinner.rotation || 0) + velocity) % TAU;
    wheel.setRotation(spinner.rotation);
    const idx = wheel.indexAtPointer();
    if (idx !== spinner._lastSegment && idx !== -1) {
      spinner._lastSegment = idx;
      spinner.onTick(idx, Math.min(1.5, velocity / 0.2));
    }
    trollRafId = requestAnimationFrame(trollLoop);
  }

  // ---------- presets ----------
  function openPresetsModal() {
    selectedPresetId = null;
    renderPresetsGrid();
    document.getElementById("presets-preview").hidden = true;
    document.getElementById("btn-presets-replace").disabled = true;
    document.getElementById("btn-presets-append").disabled = true;
    document.getElementById("presets-overlay").hidden = false;
  }

  function closePresetsModal() {
    document.getElementById("presets-overlay").hidden = true;
  }

  function renderPresetsGrid() {
    const grid = document.getElementById("presets-grid");
    grid.innerHTML = "";
    PRESETS.forEach((p) => {
      const btn = document.createElement("button");
      btn.className =
        "preset-chip" + (p.id === selectedPresetId ? " is-selected" : "");
      btn.innerHTML =
        `<span class="preset-chip-icon">${p.icon}</span>` +
        `<span class="preset-chip-name">${p.name}</span>` +
        `<span class="preset-chip-count">${p.items.length} itens</span>`;
      btn.addEventListener("click", () => selectPreset(p.id));
      grid.appendChild(btn);
    });
  }

  function selectPreset(id) {
    selectedPresetId = id;
    const preset = PRESETS.find((p) => p.id === id);
    renderPresetsGrid();
    document.getElementById("presets-preview-label").textContent =
      `${preset.icon} ${preset.name} — ${preset.items.length} itens`;
    document.getElementById("presets-preview-items").textContent =
      preset.items.join(" · ");
    document.getElementById("presets-preview").hidden = false;
    document.getElementById("btn-presets-replace").disabled = false;
    document.getElementById("btn-presets-append").disabled = false;
  }

  function applyPreset(mode) {
    const preset = PRESETS.find((p) => p.id === selectedPresetId);
    if (!preset) return;
    const labels = preset.items;
    if (mode === "replace") {
      items = labels.map((label, i) => ({
        id: window.Utils.uid(),
        label,
        color: window.Utils.colorForIndex(tweaks.palette, i),
      }));
    } else {
      const start = items.length;
      items = [
        ...items,
        ...labels.map((label, i) => ({
          id: window.Utils.uid(),
          label,
          color: window.Utils.colorForIndex(tweaks.palette, start + i),
        })),
      ];
    }
    window.SpinStorage.saveItems(items);
    wheel.setItems(items);
    renderList();
    updateCount();
    closePresetsModal();
    window.Utils.toast(`${labels.length} itens carregados`);
  }

  // ---------- bulk add ----------
  function openBulkModal() {
    document.getElementById("bulk-input").value = "";
    updateBulkPreview();
    document.getElementById("bulk-overlay").hidden = false;
    document.getElementById("bulk-input").focus();
  }

  function closeBulkModal() {
    document.getElementById("bulk-overlay").hidden = true;
  }

  function parseBulkInput() {
    const raw = document.getElementById("bulk-input").value;
    return raw
      .split(/[\n,]/)
      .map((s) => s.trim().slice(0, 40))
      .filter(Boolean);
  }

  function updateBulkPreview() {
    const count = parseBulkInput().length;
    const el = document.getElementById("bulk-preview");
    el.textContent =
      count === 0
        ? "0 itens encontrados"
        : count === 1
          ? "1 item encontrado"
          : `${count} itens encontrados`;
    document.getElementById("btn-bulk-replace").disabled = count === 0;
    document.getElementById("btn-bulk-append").disabled = count === 0;
  }

  function applyBulk(mode) {
    const labels = parseBulkInput();
    if (!labels.length) return;
    if (mode === "replace") {
      items = labels.map((label, i) => ({
        id: window.Utils.uid(),
        label,
        color: window.Utils.colorForIndex(tweaks.palette, i),
      }));
    } else {
      const start = items.length;
      const newItems = labels.map((label, i) => ({
        id: window.Utils.uid(),
        label,
        color: window.Utils.colorForIndex(tweaks.palette, start + i),
      }));
      items = [...items, ...newItems];
    }
    window.SpinStorage.saveItems(items);
    wheel.setItems(items);
    renderList();
    updateCount();
    closeBulkModal();
    window.Utils.toast(
      `${labels.length} ${labels.length === 1 ? "item adicionado" : "itens adicionados"}`,
    );
  }

  // ---------- lock during spin ----------
  function setLocked(spinning) {
    document.querySelector(".sidebar").classList.toggle("is-locked", spinning);
  }

  // ---------- item ops ----------
  function addItem(label) {
    const it = {
      id: window.Utils.uid(),
      label,
      color: window.Utils.colorForIndex(tweaks.palette, items.length),
    };
    items.push(it);
    window.SpinStorage.saveItems(items);
    wheel.setItems(items);
    renderList();
    updateCount();
  }

  function removeItem(id) {
    items = items.filter((it) => it.id !== id);
    refreshColors();
    window.SpinStorage.saveItems(items);
    wheel.setItems(items);
    renderList();
    updateCount();
  }

  function editItem(id, newLabel) {
    const it = items.find((x) => x.id === id);
    if (!it) return;
    it.label = newLabel;
    window.SpinStorage.saveItems(items);
    wheel.setItems(items);
  }

  function cycleColor(id) {
    const it = items.find((x) => x.id === id);
    if (!it) return;
    const palette = window.Utils.paletteColors(tweaks.palette);
    const cur = palette.indexOf(it.color);
    it.color = palette[(cur + 1) % palette.length];
    window.SpinStorage.saveItems(items);
    wheel.setItems(items);
    renderList();
  }

  function refreshColors() {
    const palette = window.Utils.paletteColors(tweaks.palette);
    items.forEach((it, i) => {
      // re-assign if color isn't in current palette (e.g. theme/palette changed)
      if (!palette.includes(it.color)) {
        it.color = palette[i % palette.length];
      }
    });
  }

  // ---------- render ----------
  function renderList() {
    const list = document.getElementById("item-list");
    const empty = document.getElementById("empty-state");
    list.innerHTML = "";

    if (!items.length) {
      empty.hidden = false;
      list.hidden = true;
      return;
    }
    empty.hidden = true;
    list.hidden = false;

    items.forEach((it) => {
      const li = document.createElement("li");
      li.className = "item";
      if (it.id === lastWinnerId) li.classList.add("is-winner");
      li.dataset.id = it.id;

      const sw = document.createElement("span");
      sw.className = "item-swatch";
      sw.style.background = it.color;
      sw.title = "trocar cor";
      sw.addEventListener("click", () => {
        if (!spinner.spinning) cycleColor(it.id);
      });

      const input = document.createElement("input");
      input.type = "text";
      input.className = "item-label";
      input.value = it.label;
      input.maxLength = 40;
      input.addEventListener("change", () => {
        if (spinner.spinning) {
          input.value = it.label;
          return;
        }
        const v = input.value.trim();
        if (!v) {
          input.value = it.label;
          return;
        }
        editItem(it.id, v);
      });
      input.addEventListener("blur", () => (input.scrollLeft = 0));

      const rm = document.createElement("button");
      rm.className = "item-remove";
      rm.title = "remover";
      rm.innerHTML =
        '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>';
      rm.addEventListener("click", () => {
        if (!spinner.spinning) removeItem(it.id);
      });

      li.appendChild(sw);
      li.appendChild(input);
      li.appendChild(rm);
      list.appendChild(li);
    });
  }

  function renderHistory() {
    const list = document.getElementById("history-list");
    const panel = document.getElementById("history-panel");
    list.innerHTML = "";

    if (!history.length || !tweaks.showHistory) {
      panel.hidden = true;
      return;
    }
    panel.hidden = false;

    history.forEach((h) => {
      const li = document.createElement("li");
      li.className = "history-item";
      const sw = document.createElement("span");
      sw.className = "history-swatch";
      sw.style.background = h.color;
      const name = document.createElement("span");
      name.className = "history-name";
      name.textContent = h.label;
      const time = document.createElement("span");
      time.className = "history-time";
      time.textContent = relTime(h.at);
      li.appendChild(sw);
      li.appendChild(name);
      li.appendChild(time);
      list.appendChild(li);
    });
  }

  function relTime(t) {
    const diff = Math.floor((Date.now() - t) / 1000);
    if (diff < 5) return "agora";
    if (diff < 60) return diff + "s";
    if (diff < 3600) return Math.floor(diff / 60) + "m";
    if (diff < 86400) return Math.floor(diff / 3600) + "h";
    return Math.floor(diff / 86400) + "d";
  }

  function updateCount() {
    const el = document.getElementById("count-pill");
    el.textContent = items.length === 1 ? "1 item" : `${items.length} itens`;
  }

  function setStatus(text, mod) {
    const pill = document.getElementById("status-pill");
    const t = document.getElementById("status-text");
    t.textContent = text;
    pill.className = "status-pill" + (mod ? " is-" + mod : "");
  }

  // ---------- result ----------
  function showResult(winner) {
    lastWinnerId = winner.id;
    document.getElementById("result-name").textContent = winner.label;
    document.getElementById("result-swatch").style.background = winner.color;
    document.getElementById("result-meta").textContent =
      `${items.length} concorrentes · ${new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;
    document.getElementById("result-overlay").hidden = false;

    if (tweaks.confetti) fx.burst(winner.color);
    window.Utils.sound.win();

    // history
    history.unshift({
      label: winner.label,
      color: winner.color,
      at: Date.now(),
    });
    history = history.slice(0, 20);
    window.SpinStorage.saveHistory(history);
    renderHistory();

    // highlight in list
    renderList();

    if (tweaks.removeOnWin) {
      // small delay so user can read
      setTimeout(() => removeItem(winner.id), 800);
    }
  }

  function closeResult() {
    document.getElementById("result-overlay").hidden = true;
    fx && fx.clear();
  }

  // ---------- share ----------
  async function share() {
    if (!items.length) {
      window.Utils.toast("Adicione itens primeiro");
      return;
    }
    const url = window.SpinStorage.buildShareURL(items, tweaks);
    try {
      if (navigator.share && /Mobi|Android/i.test(navigator.userAgent)) {
        await navigator.share({ title: "Spin", text: "minha roleta", url });
        return;
      }
      await navigator.clipboard.writeText(url);
      window.Utils.toast("Link copiado!");
    } catch (e) {
      // fallback
      prompt("Copie o link:", url);
    }
  }
})();
