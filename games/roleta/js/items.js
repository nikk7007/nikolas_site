/* items.js — item CRUD operations */
(function () {
  'use strict';

  function sampleItems() {
    const S = window.SpinState;
    const labels = ['Pizza', 'Sushi', 'Hambúrguer', 'Salada', 'Pastel', 'Açaí'];
    return labels.map((label, i) => ({
      id: window.Utils.uid(),
      label,
      color: window.Utils.colorForIndex(S.tweaks.palette, i),
    }));
  }

  function addItem(label) {
    const S = window.SpinState;
    const it = {
      id: window.Utils.uid(),
      label,
      color: window.Utils.colorForIndex(S.tweaks.palette, S.items.length),
    };
    S.items.push(it);
    window.SpinStorage.saveItems(S.items);
    S.wheel.setItems(S.items);
    window.SpinRender.renderList();
    window.SpinRender.updateCount();
  }

  function removeItem(id) {
    const S = window.SpinState;
    S.items = S.items.filter((it) => it.id !== id);
    refreshColors();
    window.SpinStorage.saveItems(S.items);
    S.wheel.setItems(S.items);
    window.SpinRender.renderList();
    window.SpinRender.updateCount();
  }

  function editItem(id, newLabel) {
    const S = window.SpinState;
    const it = S.items.find((x) => x.id === id);
    if (!it) return;
    it.label = newLabel;
    window.SpinStorage.saveItems(S.items);
    S.wheel.setItems(S.items);
  }

  function cycleColor(id) {
    const S = window.SpinState;
    const it = S.items.find((x) => x.id === id);
    if (!it) return;
    const palette = window.Utils.paletteColors(S.tweaks.palette);
    const cur = palette.indexOf(it.color);
    it.color = palette[(cur + 1) % palette.length];
    window.SpinStorage.saveItems(S.items);
    S.wheel.setItems(S.items);
    window.SpinRender.renderList();
  }

  function refreshColors() {
    const S = window.SpinState;
    const palette = window.Utils.paletteColors(S.tweaks.palette);
    S.items.forEach((it, i) => {
      if (!palette.includes(it.color)) {
        it.color = palette[i % palette.length];
      }
    });
  }

  window.SpinItems = { sampleItems, addItem, removeItem, editItem, cycleColor, refreshColors };
})();
