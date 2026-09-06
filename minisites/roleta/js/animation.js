/* animation.js — spin physics. Friction-based deceleration with tick callback. */
(function () {
  'use strict';

  class Spinner {
    constructor(wheel, opts) {
      this.wheel = wheel;
      this.rotation = 0;
      this.velocity = 0;
      this.spinning = false;
      this._lastSegment = -1;
      this._rafId = null;
      this.onTick = opts.onTick || (() => {});
      this.onStop = opts.onStop || (() => {});
      this.onStart = opts.onStart || (() => {});
      this.friction = 0.985;  // current friction, set per-spin
      this.minVelocity = 0.0008;
      this.spinPower = 60;    // user setting; 0–100
    }

    setSpinPower(p) { this.spinPower = p; }

    spin() {
      if (this.spinning) return;
      if (!this.wheel.items.length) return;

      // Map spinPower 0–100 to BOTH velocity and friction so the
      // difference is dramatic: low power = weak push + quick stop,
      // high power = strong push + long glide.
      const t = Math.max(0, Math.min(1, this.spinPower / 100));

      // velocity: 0.18 → 0.62 (rad/frame)
      const minV = 0.18;
      const maxV = 0.62;
      const baseV = minV + (maxV - minV) * t;
      const variance = 0.06 + 0.06 * t;
      this.velocity = baseV + Math.random() * variance;

      // friction: 0.975 (quick decay, ~2–3s) → 0.993 (long glide, ~14s)
      this.friction = 0.975 + 0.018 * t;

      this.spinning = true;
      this._lastSegment = this.wheel.indexAtPointer();
      this.onStart();
      this._loop();
    }

    _loop() {
      if (!this.spinning) return;
      this.rotation += this.velocity;
      this.velocity *= this.friction;

      // normalize rotation to keep numbers bounded
      const TAU = Math.PI * 2;
      if (this.rotation > TAU) this.rotation -= TAU;
      if (this.rotation < -TAU) this.rotation += TAU;

      this.wheel.setRotation(this.rotation);

      // detect segment crossings for tick sound + pointer twitch
      const idx = this.wheel.indexAtPointer();
      if (idx !== this._lastSegment && idx !== -1) {
        this._lastSegment = idx;
        // intensity scales with current speed; faster = louder
        const intensity = Math.min(1.5, this.velocity / 0.2);
        this.onTick(idx, intensity);
      }

      if (this.velocity < this.minVelocity) {
        this.spinning = false;
        this.velocity = 0;
        this.onStop(this.wheel.indexAtPointer());
        return;
      }

      this._rafId = requestAnimationFrame(() => this._loop());
    }

    stop() {
      this.spinning = false;
      if (this._rafId) cancelAnimationFrame(this._rafId);
    }
  }

  window.Spinner = Spinner;
})();
