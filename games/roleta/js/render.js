/* render.js — DOM rendering functions */
(function () {
  'use strict';

  function relTime(t) {
    const diff = Math.floor((Date.now() - t) / 1000);
    if (diff < 5) return 'agora';
    if (diff < 60) return diff + 's';
    if (diff < 3600) return Math.floor(diff / 60) + 'm';
    if (diff < 86400) return Math.floor(diff / 3600) + 'h';
    return Math.floor(diff / 86400) + 'd';
  }

  function renderList() {
    const S = window.SpinState;
    const list = document.getElementById('item-list');
    const empty = document.getElementById('empty-state');
    list.innerHTML = '';

    if (!S.items.length) {
      empty.hidden = false;
      list.hidden = true;
      return;
    }
    empty.hidden = true;
    list.hidden = false;

    S.items.forEach((it) => {
      const li = document.createElement('li');
      li.className = 'item';
      if (it.id === S.lastWinnerId) li.classList.add('is-winner');
      li.dataset.id = it.id;

      const sw = document.createElement('span');
      sw.className = 'item-swatch';
      sw.style.background = it.color;
      sw.title = 'trocar cor';
      sw.addEventListener('click', () => {
        if (!S.spinner.spinning) window.SpinItems.cycleColor(it.id);
      });

      const input = document.createElement('input');
      input.type = 'text';
      input.className = 'item-label';
      input.value = it.label;
      input.maxLength = 40;
      input.addEventListener('change', () => {
        if (S.spinner.spinning) { input.value = it.label; return; }
        const v = input.value.trim();
        if (!v) { input.value = it.label; return; }
        window.SpinItems.editItem(it.id, v);
      });
      input.addEventListener('blur', () => (input.scrollLeft = 0));

      const rm = document.createElement('button');
      rm.className = 'item-remove';
      rm.title = 'remover';
      rm.innerHTML = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>';
      rm.addEventListener('click', () => {
        if (!S.spinner.spinning) window.SpinItems.removeItem(it.id);
      });

      li.appendChild(sw);
      li.appendChild(input);
      li.appendChild(rm);
      list.appendChild(li);
    });
  }

  function renderHistory() {
    const S = window.SpinState;
    const list = document.getElementById('history-list');
    const panel = document.getElementById('history-panel');
    list.innerHTML = '';

    if (!S.history.length || !S.tweaks.showHistory) {
      panel.hidden = true;
      return;
    }
    panel.hidden = false;

    S.history.forEach((h) => {
      const li = document.createElement('li');
      li.className = 'history-item';
      const sw = document.createElement('span');
      sw.className = 'history-swatch';
      sw.style.background = h.color;
      const name = document.createElement('span');
      name.className = 'history-name';
      name.textContent = h.label;
      const time = document.createElement('span');
      time.className = 'history-time';
      time.textContent = relTime(h.at);
      li.appendChild(sw);
      li.appendChild(name);
      li.appendChild(time);
      list.appendChild(li);
    });
  }

  function updateCount() {
    const S = window.SpinState;
    const el = document.getElementById('count-pill');
    el.textContent = S.items.length === 1 ? '1 item' : `${S.items.length} itens`;
  }

  function setStatus(text, mod) {
    const pill = document.getElementById('status-pill');
    const t = document.getElementById('status-text');
    t.textContent = text;
    pill.className = 'status-pill' + (mod ? ' is-' + mod : '');
  }

  window.SpinRender = { renderList, renderHistory, updateCount, setStatus };
})();
