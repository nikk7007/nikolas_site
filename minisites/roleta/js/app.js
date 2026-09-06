/* app.js — orchestrator: init, event binding, tweaks, share */
(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', init);

  function init() {
    const S = window.SpinState;

    // Theme
    const savedTheme = window.SpinStorage.loadTheme();
    document.body.setAttribute('data-theme', savedTheme || 'dark');

    // Tweaks
    S.tweaks = Object.assign({}, window.TWEAK_DEFAULTS);
    const savedTweaks = window.SpinStorage.loadTweaks();
    if (savedTweaks) S.tweaks = Object.assign({}, S.tweaks, savedTweaks);
    const urlTweaks = window.SpinStorage.tweaksFromURL();
    if (urlTweaks) S.tweaks = Object.assign({}, S.tweaks, urlTweaks);
    const urlPalette = window.SpinStorage.paletteFromURL();
    if (urlPalette && window.Utils.PALETTES[urlPalette]) S.tweaks.palette = urlPalette;

    // History
    S.history = window.SpinStorage.loadHistory();

    // Items
    const urlLabels = window.SpinStorage.itemsFromURL();
    if (urlLabels) {
      S.items = urlLabels.map((label, i) => ({
        id: window.Utils.uid(),
        label,
        color: window.Utils.colorForIndex(S.tweaks.palette, i),
      }));
      window.SpinStorage.saveItems(S.items);
      window.SpinStorage.clearURL();
      window.Utils.toast('Roleta importada do link');
    } else {
      const saved = window.SpinStorage.loadItems();
      if (saved && saved.length) S.items = saved;
      else S.items = window.SpinItems.sampleItems();
    }

    // Canvas + spin
    const canvas = document.getElementById('wheel');
    S.wheel = new window.Wheel(canvas);
    S.wheel.setPalette(S.tweaks.palette);
    S.wheel.setStyle(S.tweaks.wheelStyle);
    window.SpinItems.refreshColors();
    S.wheel.setItems(S.items);

    S.spinner = new window.Spinner(S.wheel, {
      onStart: () => {
        window.SpinRender.setStatus('girando…', 'spinning');
        setLocked(true);
        document.getElementById('btn-spin').disabled = true;
        document.querySelector('.wheel-wrap').classList.add('is-spinning');
        document.getElementById('spin-sub').textContent = 'boa sorte';
      },
      onTick: (idx, intensity) => {
        window.Utils.sound.tick(intensity);
        const ptr = document.getElementById('pointer');
        ptr.classList.remove('is-ticking');
        void ptr.offsetWidth;
        ptr.classList.add('is-ticking');
      },
      onStop: (winnerIdx) => {
        setLocked(false);
        document.getElementById('btn-spin').disabled = false;
        document.querySelector('.wheel-wrap').classList.remove('is-spinning');
        document.getElementById('spin-sub').textContent = 'toque pra rodar';
        window.SpinRender.setStatus('parado', 'done');
        const winner = S.items[winnerIdx];
        if (winner) window.SpinModals.showResult(winner);
      },
    });
    S.spinner.setSpinPower(S.tweaks.spinPower);

    // FX
    const fxCanvas = document.getElementById('fx');
    S.fx = new window.FX(fxCanvas);

    // Render initial state
    applyTweaks();
    window.SpinRender.renderList();
    window.SpinRender.renderHistory();
    window.SpinRender.updateCount();

    // Resize observer
    if ('ResizeObserver' in window) {
      const ro = new ResizeObserver(() => S.wheel._handleResize());
      ro.observe(canvas);
    }

    bindEvents();
    bindTweaks();
  }

  // ---------- events ----------

  function triggerSpin() {
    const S = window.SpinState;
    if (!S.items.length) { window.Utils.toast('Adicione itens primeiro'); return; }
    if (S.spinner.spinning || S.trollActive) return;
    window.Utils.sound.click();
    if (S.tweaks.troll) {
      window.SpinTroll.startTrollMode();
    } else {
      S.spinner.spin();
    }
  }

  function bindEvents() {
    const S = window.SpinState;

    document.getElementById('btn-spin').addEventListener('click', triggerSpin);
    document.querySelector('.wheel-wrap').addEventListener('click', (e) => {
      if (e.target.closest('#btn-spin')) return;
      triggerSpin();
    });

    document.getElementById('add-form').addEventListener('submit', (e) => {
      e.preventDefault();
      if (S.spinner.spinning) return;
      const input = document.getElementById('add-input');
      const v = input.value.trim();
      if (!v) return;
      window.SpinItems.addItem(v);
      input.value = '';
      input.focus();
    });

    document.getElementById('btn-shuffle').addEventListener('click', () => {
      if (S.spinner.spinning || S.items.length < 2) return;
      for (let i = S.items.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [S.items[i], S.items[j]] = [S.items[j], S.items[i]];
      }
      window.SpinItems.refreshColors();
      S.wheel.setItems(S.items);
      window.SpinStorage.saveItems(S.items);
      window.SpinRender.renderList();
      window.Utils.sound.click();
    });

    document.getElementById('btn-clear').addEventListener('click', () => {
      if (S.spinner.spinning || !S.items.length) return;
      if (!confirm('Remover todos os itens?')) return;
      S.items = [];
      window.SpinStorage.saveItems(S.items);
      S.wheel.setItems(S.items);
      window.SpinRender.renderList();
      window.SpinRender.updateCount();
    });

    document.getElementById('btn-demo').addEventListener('click', window.SpinPresets.openModal);
    document.getElementById('btn-share').addEventListener('click', share);

    document.getElementById('btn-theme').addEventListener('click', () => {
      const cur = document.body.getAttribute('data-theme');
      const next = cur === 'dark' ? 'light' : 'dark';
      document.body.setAttribute('data-theme', next);
      window.SpinStorage.saveTheme(next);
      window.SpinItems.refreshColors();
      window.SpinStorage.saveItems(S.items);
      S.wheel.setItems(S.items);
      window.SpinRender.renderList();
      if (!document.getElementById('tweaks-panel').hidden) renderTweaks();
    });

    document.getElementById('btn-result-close').addEventListener('click', window.SpinModals.closeResult);
    document.getElementById('btn-result-again').addEventListener('click', () => {
      window.SpinModals.closeResult();
      setTimeout(() => { if (S.items.length) S.spinner.spin(); }, 220);
    });
    document.getElementById('btn-result-remove').addEventListener('click', () => {
      if (S.lastWinnerId) { window.SpinItems.removeItem(S.lastWinnerId); window.SpinModals.closeResult(); }
    });
    document.getElementById('btn-result-disable-troll').addEventListener('click', () => {
      S.tweaks.troll = false;
      window.SpinStorage.saveTweaks(S.tweaks);
      document.getElementById('btn-result-disable-troll').hidden = true;
      if (!document.getElementById('tweaks-panel').hidden) renderTweaks();
    });
    document.getElementById('result-overlay').addEventListener('click', (e) => {
      if (e.target === e.currentTarget) window.SpinModals.closeResult();
    });

    document.getElementById('btn-history-clear').addEventListener('click', () => {
      S.history = [];
      window.SpinStorage.clearHistory();
      window.SpinRender.renderHistory();
    });

    document.getElementById('btn-presets').addEventListener('click', window.SpinPresets.openModal);
    document.getElementById('btn-presets-close').addEventListener('click', window.SpinPresets.closeModal);
    document.getElementById('presets-overlay').addEventListener('click', (e) => {
      if (e.target === e.currentTarget) window.SpinPresets.closeModal();
    });
    document.getElementById('btn-presets-replace').addEventListener('click', () => window.SpinPresets.applyPreset('replace'));
    document.getElementById('btn-presets-append').addEventListener('click', () => window.SpinPresets.applyPreset('append'));

    document.getElementById('btn-bulk').addEventListener('click', window.SpinModals.openBulkModal);
    document.getElementById('btn-bulk-close').addEventListener('click', window.SpinModals.closeBulkModal);
    document.getElementById('bulk-overlay').addEventListener('click', (e) => {
      if (e.target === e.currentTarget) window.SpinModals.closeBulkModal();
    });
    document.getElementById('bulk-input').addEventListener('input', window.SpinModals.updateBulkPreview);
    document.getElementById('btn-bulk-replace').addEventListener('click', () => window.SpinModals.applyBulk('replace'));
    document.getElementById('btn-bulk-append').addEventListener('click', () => window.SpinModals.applyBulk('append'));

    document.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT') return;
      if (e.code === 'Space') { e.preventDefault(); triggerSpin(); }
      if (e.key === 'Escape') window.SpinModals.closeResult();
    });
  }

  // ---------- tweaks panel ----------

  function bindTweaks() {
    const fab = document.getElementById('tweaks-fab');
    const close = document.getElementById('tweaks-close');

    window.addEventListener('message', (e) => {
      const d = e.data || {};
      if (d.type === '__activate_edit_mode') openTweaks();
      if (d.type === '__deactivate_edit_mode') closeTweaks();
    });

    fab.addEventListener('click', openTweaks);
    close.addEventListener('click', () => {
      closeTweaks();
      window.parent.postMessage({ type: '__edit_mode_dismissed' }, '*');
    });

    fab.hidden = false;
    window.parent.postMessage({ type: '__edit_mode_available' }, '*');
  }

  function openTweaks() {
    document.getElementById('tweaks-panel').hidden = false;
    document.getElementById('tweaks-fab').hidden = true;
    renderTweaks();
  }

  function closeTweaks() {
    document.getElementById('tweaks-panel').hidden = true;
    document.getElementById('tweaks-fab').hidden = false;
  }

  function renderTweaks() {
    const S = window.SpinState;
    window.SpinTweaks.build(S.tweaks, (key, value) => {
      S.tweaks[key] = value;
      applyTweaks();
      window.SpinStorage.saveTweaks(S.tweaks);
      try {
        window.parent.postMessage({ type: '__edit_mode_set_keys', edits: { [key]: value } }, '*');
      } catch (e) {}
      if (key !== 'spinPower') renderTweaks();
    });
  }

  // ---------- apply tweaks ----------

  function applyTweaks() {
    const S = window.SpinState;
    S.wheel && S.wheel.setPalette(S.tweaks.palette);
    S.wheel && S.wheel.setStyle(S.tweaks.wheelStyle);

    document.body.setAttribute('data-pointer', 'top');

    window.Utils.sound.enabled = !!S.tweaks.sound;

    if (S.spinner) S.spinner.setSpinPower(S.tweaks.spinPower);

    const histPanel = document.getElementById('history-panel');
    if (histPanel) histPanel.hidden = !S.tweaks.showHistory || S.history.length === 0;

    if (S.items && S.items.length) {
      window.SpinItems.refreshColors();
      S.wheel && S.wheel.setItems(S.items);
      window.SpinStorage.saveItems(S.items);
      window.SpinRender.renderList();
    }
  }

  // ---------- helpers ----------

  function setLocked(spinning) {
    document.querySelector('.sidebar').classList.toggle('is-locked', spinning);
  }

  async function share() {
    const S = window.SpinState;
    if (!S.items.length) { window.Utils.toast('Adicione itens primeiro'); return; }
    const url = window.SpinStorage.buildShareURL(S.items, S.tweaks);
    try {
      if (navigator.share && /Mobi|Android/i.test(navigator.userAgent)) {
        await navigator.share({ title: 'Spin', text: 'minha roleta', url });
        return;
      }
      await navigator.clipboard.writeText(url);
      window.Utils.toast('Link copiado!');
    } catch (e) {
      prompt('Copie o link:', url);
    }
  }
})();
