/* modals.js — result modal + bulk add modal */
(function () {
  'use strict';

  // ---------- result modal ----------

  function showResult(winner) {
    const S = window.SpinState;
    S.lastWinnerId = winner.id;
    document.getElementById('result-name').textContent = winner.label;
    document.getElementById('result-swatch').style.background = winner.color;
    document.getElementById('result-meta').textContent =
      `${S.items.length} concorrentes · ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
    document.getElementById('result-overlay').hidden = false;

    if (S.tweaks.confetti) S.fx.burst(winner.color);
    window.Utils.sound.win();

    S.history.unshift({ label: winner.label, color: winner.color, at: Date.now() });
    S.history = S.history.slice(0, 20);
    window.SpinStorage.saveHistory(S.history);
    window.SpinRender.renderHistory();
    window.SpinRender.renderList();

    document.getElementById('btn-result-disable-troll').hidden = !S.tweaks.troll;

    if (S.tweaks.removeOnWin) {
      setTimeout(() => window.SpinItems.removeItem(winner.id), 800);
    }
  }

  function closeResult() {
    const S = window.SpinState;
    document.getElementById('result-overlay').hidden = true;
    S.fx && S.fx.clear();
  }

  // ---------- bulk add modal ----------

  function parseBulkInput() {
    const raw = document.getElementById('bulk-input').value;
    return raw
      .split(/[\n,]/)
      .map((s) => s.trim().slice(0, 40))
      .filter(Boolean);
  }

  function openBulkModal() {
    document.getElementById('bulk-input').value = '';
    updateBulkPreview();
    document.getElementById('bulk-overlay').hidden = false;
    document.getElementById('bulk-input').focus();
  }

  function closeBulkModal() {
    document.getElementById('bulk-overlay').hidden = true;
  }

  function updateBulkPreview() {
    const count = parseBulkInput().length;
    const el = document.getElementById('bulk-preview');
    el.textContent =
      count === 0
        ? '0 itens encontrados'
        : count === 1
          ? '1 item encontrado'
          : `${count} itens encontrados`;
    document.getElementById('btn-bulk-replace').disabled = count === 0;
    document.getElementById('btn-bulk-append').disabled = count === 0;
  }

  function applyBulk(mode) {
    const S = window.SpinState;
    const labels = parseBulkInput();
    if (!labels.length) return;
    if (mode === 'replace') {
      S.items = labels.map((label, i) => ({
        id: window.Utils.uid(),
        label,
        color: window.Utils.colorForIndex(S.tweaks.palette, i),
      }));
    } else {
      const start = S.items.length;
      S.items = [
        ...S.items,
        ...labels.map((label, i) => ({
          id: window.Utils.uid(),
          label,
          color: window.Utils.colorForIndex(S.tweaks.palette, start + i),
        })),
      ];
    }
    window.SpinStorage.saveItems(S.items);
    S.wheel.setItems(S.items);
    window.SpinRender.renderList();
    window.SpinRender.updateCount();
    closeBulkModal();
    window.Utils.toast(
      `${labels.length} ${labels.length === 1 ? 'item adicionado' : 'itens adicionados'}`
    );
  }

  window.SpinModals = { showResult, closeResult, openBulkModal, closeBulkModal, updateBulkPreview, applyBulk };
})();
