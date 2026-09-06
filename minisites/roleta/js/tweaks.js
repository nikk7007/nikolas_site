/* tweaks.js — Tweaks panel UI (palette, pointer, sound, etc.) */
(function () {
  'use strict';

  function el(tag, attrs = {}, children = []) {
    const e = document.createElement(tag);
    for (const k in attrs) {
      if (k === 'class') e.className = attrs[k];
      else if (k === 'on') {
        for (const ev in attrs.on) e.addEventListener(ev, attrs.on[ev]);
      } else if (k === 'html') e.innerHTML = attrs[k];
      else e.setAttribute(k, attrs[k]);
    }
    (Array.isArray(children) ? children : [children]).forEach(c => {
      if (c == null) return;
      e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    });
    return e;
  }

  function build(state, onChange) {
    const body = document.getElementById('tweaks-body');
    body.innerHTML = '';

    // palette
    const paletteGroup = el('div', { class: 'tweak-group' });
    paletteGroup.appendChild(el('div', { class: 'tweak-label' }, 'Paleta de cores'));
    const swatchGrid = el('div', { class: 'tweak-swatches' });
    Object.entries(window.Utils.PALETTES).forEach(([name]) => {
      const colors = window.Utils.paletteColors(name);
      const sw = el('button', {
        class: 'tweak-swatch' + (state.palette === name ? ' is-active' : ''),
        title: name,
        on: { click: () => onChange('palette', name) }
      });
      // use the first 4 colors
      for (let i = 0; i < 4; i++) {
        const s = el('span');
        s.style.background = colors[i];
        sw.appendChild(s);
      }
      swatchGrid.appendChild(sw);
    });
    paletteGroup.appendChild(swatchGrid);
    body.appendChild(paletteGroup);

    // spin power
    body.appendChild(buildSlider('Força do giro', state.spinPower, 20, 100, 1, (v) => onChange('spinPower', v)));

    // toggles
    body.appendChild(buildToggle('Som', state.sound, (v) => onChange('sound', v)));
    body.appendChild(buildToggle('Confete ao vencer', state.confetti, (v) => onChange('confetti', v)));
    body.appendChild(buildToggle('Histórico', state.showHistory, (v) => onChange('showHistory', v)));
    body.appendChild(buildToggle('Remover vencedor automaticamente', state.removeOnWin, (v) => onChange('removeOnWin', v)));
    body.appendChild(buildToggle('Modo Troll 😈', state.troll, (v) => onChange('troll', v)));
  }

  function buildRadio(label, value, options, onChange) {
    const g = el('div', { class: 'tweak-group' });
    g.appendChild(el('div', { class: 'tweak-label' }, label));
    const radio = el('div', { class: 'tweak-radio' });
    options.forEach(opt => {
      const b = el('button', {
        class: opt.value === value ? 'is-active' : '',
        on: { click: () => onChange(opt.value) }
      }, opt.label);
      radio.appendChild(b);
    });
    g.appendChild(radio);
    return g;
  }

  function buildSlider(label, value, min, max, step, onChange) {
    const g = el('div', { class: 'tweak-group tweak-slider' });
    g.appendChild(el('div', { class: 'tweak-label' }, label));
    const row = el('div', { class: 'tweak-slider-row' });
    const input = el('input', { type: 'range', min, max, step, value });
    const val = el('span', { class: 'tweak-slider-val' }, String(value));
    input.addEventListener('input', () => {
      val.textContent = input.value;
      onChange(Number(input.value));
    });
    row.appendChild(input);
    row.appendChild(val);
    g.appendChild(row);
    return g;
  }

  function buildToggle(label, value, onChange) {
    const g = el('div', { class: 'tweak-toggle' });
    g.appendChild(el('span', {}, label));
    const sw = el('button', {
      class: 'toggle-switch' + (value ? ' is-on' : ''),
      'aria-pressed': String(!!value)
    });
    sw.addEventListener('click', () => {
      const next = !sw.classList.contains('is-on');
      sw.classList.toggle('is-on', next);
      sw.setAttribute('aria-pressed', String(next));
      onChange(next);
    });
    g.appendChild(sw);
    return g;
  }

  window.SpinTweaks = { build };
})();
