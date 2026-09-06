/* troll.js — troll mode: 30s of accelerating spin before stopping */
(function () {
  'use strict';

  function trollLoop() {
    const S = window.SpinState;
    if (!S.trollActive) return;
    const elapsed = Date.now() - S.trollStartTime;
    if (elapsed >= S.TROLL_DURATION) {
      S.trollActive = false;
      S.spinner.velocity = 0.06 * Math.pow(30, elapsed / S.TROLL_DURATION);
      S.spinner.friction = 0.982;
      S.spinner._loop();
      return;
    }
    const progress = elapsed / S.TROLL_DURATION;
    const velocity = 0.06 * Math.pow(30, progress);
    const TAU = Math.PI * 2;
    S.spinner.rotation = ((S.spinner.rotation || 0) + velocity) % TAU;
    S.wheel.setRotation(S.spinner.rotation);
    const idx = S.wheel.indexAtPointer();
    if (idx !== S.spinner._lastSegment && idx !== -1) {
      S.spinner._lastSegment = idx;
      S.spinner.onTick(idx, Math.min(1.5, velocity / 0.2));
    }
    S.trollRafId = requestAnimationFrame(trollLoop);
  }

  function startTrollMode() {
    const S = window.SpinState;
    S.trollActive = true;
    S.trollStartTime = Date.now();
    S.spinner.spinning = true;
    S.spinner._lastSegment = S.wheel.indexAtPointer();
    S.spinner.onStart();
    trollLoop();
  }

  window.SpinTroll = { startTrollMode };
})();
