/* state.js — shared mutable state for all spin modules */
(function () {
  'use strict';

  window.SpinState = {
    items: [],
    history: [],
    tweaks: {},
    wheel: null,
    spinner: null,
    fx: null,
    lastWinnerId: null,
    selectedPresetId: null,
    trollActive: false,
    trollStartTime: 0,
    trollRafId: null,
    TROLL_DURATION: 30000
  };
})();
