/* utils.js — helpers + color palettes + sound */
(function () {
  'use strict';

  const Utils = {};

  Utils.uid = () => Math.random().toString(36).slice(2, 9);

  Utils.clamp = (n, min, max) => Math.max(min, Math.min(max, n));

  Utils.lerp = (a, b, t) => a + (b - a) * t;

  Utils.mod = (n, m) => ((n % m) + m) % m;

  // ---------- palettes ----------
  // Each palette has a `light` and `dark` variant — tuned to harmonize with the
  // current theme background. `light` variants are softer/pastel; `dark` deeper.
  Utils.PALETTES = {
    ember: {
      dark:  ['#D9622B', '#E8A34F', '#F2D479', '#A33D2A', '#7A1F1F', '#C24C3B', '#E9B663', '#5C2018'],
      light: ['#E8826B', '#F2B07C', '#F5D58D', '#C46A4E', '#A3553E', '#E89A6B', '#F0CB85', '#D17B5C']
    },
    forest: {
      dark:  ['#3C7A4D', '#7BAF6F', '#C3D08A', '#1F4B36', '#5D8C5A', '#A2BE82', '#264F3E', '#92A876'],
      light: ['#7BA378', '#A8C798', '#D3DBA8', '#5A8466', '#8DAF7C', '#BEC992', '#6E9670', '#C1D2A5']
    },
    bay: {
      dark:  ['#2E5C8A', '#5C8FB3', '#9FBED4', '#1B3D5C', '#4076A2', '#7AA8C7', '#274E73', '#B9D2E2'],
      light: ['#7BA8C4', '#A8C8DD', '#C8DCE9', '#5A8AAC', '#92B5CE', '#B6CCD9', '#6699B8', '#D5E1EB']
    },
    candy: {
      dark:  ['#E85E8C', '#F7B2C6', '#7B4FA8', '#E8B33D', '#F47E3E', '#54B3C4', '#E04162', '#A4C77A'],
      light: ['#F4A0B8', '#FAC6D2', '#B895C7', '#F5D177', '#F8B58A', '#90C9D4', '#EE8DA5', '#C5D9A4']
    },
    mono: {
      dark:  ['#f3ede1', '#d9d2c4', '#b6b0a3', '#8a857c', '#5a5750', '#3a3631', '#221f1c', '#161412'],
      light: ['#1c1a17', '#3a3631', '#5a5750', '#8a857c', '#b6b0a3', '#d9d2c4', '#ece6db', '#fbf8f2']
    },
    sunset: {
      dark:  ['#7E1B5A', '#C2236D', '#E85C4A', '#F39C44', '#FAD06C', '#5A186E', '#A8264B', '#EF7748'],
      light: ['#B45782', '#D67098', '#E08F7C', '#F2B47B', '#F8D29A', '#A05990', '#C97A8E', '#EA9F84']
    }
  };

  Utils.PALETTE_LIST = Object.keys(Utils.PALETTES);

  Utils.currentTheme = () =>
    (document.body && document.body.getAttribute('data-theme')) === 'dark' ? 'dark' : 'light';

  Utils.paletteColors = (paletteName, theme) => {
    const p = Utils.PALETTES[paletteName] || Utils.PALETTES.ember;
    const t = theme || Utils.currentTheme();
    return p[t] || p.light;
  };

  Utils.colorForIndex = (paletteName, i, theme) => {
    const colors = Utils.paletteColors(paletteName, theme);
    return colors[i % colors.length];
  };

  // contrasty text color for a hex bg
  Utils.contrastText = (hex) => {
    const c = hex.replace('#', '');
    const r = parseInt(c.slice(0, 2), 16);
    const g = parseInt(c.slice(2, 4), 16);
    const b = parseInt(c.slice(4, 6), 16);
    // perceived luminance
    const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return lum > 0.62 ? '#1c1a17' : '#fbf8f2';
  };

  // mix two hex colors
  Utils.mix = (a, b, t) => {
    const pa = parseInt(a.replace('#',''), 16);
    const pb = parseInt(b.replace('#',''), 16);
    const ar = (pa >> 16) & 0xff, ag = (pa >> 8) & 0xff, ab = pa & 0xff;
    const br = (pb >> 16) & 0xff, bg = (pb >> 8) & 0xff, bb = pb & 0xff;
    const r = Math.round(Utils.lerp(ar, br, t));
    const g = Math.round(Utils.lerp(ag, bg, t));
    const b2 = Math.round(Utils.lerp(ab, bb, t));
    return '#' + [r, g, b2].map(x => x.toString(16).padStart(2, '0')).join('');
  };

  // ---------- sound (WebAudio, no assets) ----------
  let _ctx = null;
  const getCtx = () => {
    if (!_ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      _ctx = new AC();
    }
    return _ctx;
  };

  Utils.sound = {
    enabled: true,
    tick(intensity = 1) {
      if (!this.enabled) return;
      const ctx = getCtx();
      if (!ctx) return;
      const t = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(900 + Math.random() * 200, t);
      osc.frequency.exponentialRampToValueAtTime(450, t + 0.04);
      const vol = 0.04 * Math.min(1.4, intensity);
      gain.gain.setValueAtTime(vol, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.07);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.08);
    },
    win() {
      if (!this.enabled) return;
      const ctx = getCtx();
      if (!ctx) return;
      const t = ctx.currentTime;
      const notes = [523.25, 659.25, 783.99, 1046.5]; // C E G C
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, t + i * 0.09);
        gain.gain.setValueAtTime(0.0001, t + i * 0.09);
        gain.gain.exponentialRampToValueAtTime(0.15, t + i * 0.09 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.09 + 0.45);
        osc.connect(gain).connect(ctx.destination);
        osc.start(t + i * 0.09);
        osc.stop(t + i * 0.09 + 0.5);
      });
    },
    click() {
      if (!this.enabled) return;
      const ctx = getCtx();
      if (!ctx) return;
      const t = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(420, t);
      gain.gain.setValueAtTime(0.05, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.06);
    }
  };

  // ---------- toast ----------
  let toastTimer;
  Utils.toast = (msg, ms = 1800) => {
    const el = document.getElementById('toast');
    if (!el) return;
    el.textContent = msg;
    el.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { el.hidden = true; }, ms);
  };

  window.Utils = Utils;
})();
