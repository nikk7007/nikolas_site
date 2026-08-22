/* storage.js — localStorage + URL sharing */
(function () {
  'use strict';

  const ITEMS_KEY = 'spin.items.v1';
  const TWEAKS_KEY = 'spin.tweaks.v1';
  const THEME_KEY = 'spin.theme.v1';
  const HISTORY_KEY = 'spin.history.v1';

  const Storage = {};

  // ---- items ----
  Storage.loadItems = () => {
    try {
      const raw = localStorage.getItem(ITEMS_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return null;
      return parsed;
    } catch (e) { return null; }
  };

  Storage.saveItems = (items) => {
    try { localStorage.setItem(ITEMS_KEY, JSON.stringify(items)); } catch (e) {}
  };

  // ---- tweaks ----
  Storage.loadTweaks = () => {
    try {
      const raw = localStorage.getItem(TWEAKS_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  };
  Storage.saveTweaks = (tweaks) => {
    try { localStorage.setItem(TWEAKS_KEY, JSON.stringify(tweaks)); } catch (e) {}
  };

  // ---- theme ----
  Storage.loadTheme = () => localStorage.getItem(THEME_KEY);
  Storage.saveTheme = (t) => localStorage.setItem(THEME_KEY, t);

  // ---- history ----
  Storage.loadHistory = () => {
    try {
      const raw = localStorage.getItem(HISTORY_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) { return []; }
  };
  Storage.saveHistory = (h) => {
    try { localStorage.setItem(HISTORY_KEY, JSON.stringify(h.slice(0, 20))); } catch (e) {}
  };
  Storage.clearHistory = () => { try { localStorage.removeItem(HISTORY_KEY); } catch (e) {} };

  // ---- URL sharing ----
  // Encode items as query string. Format: ?items=banana,maca,uva (URI encoded)
  // For richer share, support &palette=ember
  Storage.itemsFromURL = () => {
    const params = new URLSearchParams(window.location.search);
    const raw = params.get('items');
    if (!raw) return null;
    const labels = raw.split(',')
      .map(s => decodeURIComponent(s.trim()))
      .filter(Boolean);
    if (!labels.length) return null;
    return labels;
  };

  Storage.paletteFromURL = () => {
    const params = new URLSearchParams(window.location.search);
    return params.get('palette');
  };

  Storage.tweaksFromURL = () => {
    try {
      const params = new URLSearchParams(window.location.search);
      const cfg = params.get('cfg');
      if (!cfg) return null;
      return JSON.parse(cfg);
    } catch (e) { return null; }
  };

  Storage.buildShareURL = (items, tweaks) => {
    const url = new URL(window.location.href);
    url.search = '';
    const labels = items.map(it => encodeURIComponent(it.label)).join(',');
    url.searchParams.set('items', labels);
    if (tweaks) url.searchParams.set('cfg', JSON.stringify(tweaks));
    return url.toString();
  };

  Storage.clearURL = () => {
    if (window.location.search) {
      const url = window.location.pathname + window.location.hash;
      window.history.replaceState({}, '', url);
    }
  };

  window.SpinStorage = Storage;
})();
