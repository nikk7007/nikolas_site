/* fx.js — confetti particles on a full-viewport canvas */
(function () {
  'use strict';

  class FX {
    constructor(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.particles = [];
      this._rafId = null;
      this._resize();
      window.addEventListener('resize', () => this._resize());
    }

    _resize() {
      const dpr = window.devicePixelRatio || 1;
      this.canvas.width = window.innerWidth * dpr;
      this.canvas.height = window.innerHeight * dpr;
      this.canvas.style.width = window.innerWidth + 'px';
      this.canvas.style.height = window.innerHeight + 'px';
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    burst(originColor) {
      const colors = [originColor || '#D9622B', '#E8A34F', '#F2D479', '#3C7A4D', '#2E5C8A', '#E85E8C'];
      const count = 140;
      const cx = window.innerWidth / 2;
      const cy = window.innerHeight / 2;

      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 4 + Math.random() * 9;
        this.particles.push({
          x: cx + (Math.random() - 0.5) * 40,
          y: cy + (Math.random() - 0.5) * 40,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 3,
          gravity: 0.18 + Math.random() * 0.1,
          rot: Math.random() * Math.PI * 2,
          vr: (Math.random() - 0.5) * 0.35,
          size: 5 + Math.random() * 7,
          color: colors[Math.floor(Math.random() * colors.length)],
          life: 1,
          decay: 0.008 + Math.random() * 0.006,
          shape: Math.random() < 0.5 ? 'rect' : 'circle'
        });
      }

      if (!this._rafId) this._loop();
    }

    _loop() {
      const ctx = this.ctx;
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

      for (let i = this.particles.length - 1; i >= 0; i--) {
        const p = this.particles[i];
        p.vy += p.gravity;
        p.vx *= 0.995;
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.vr;
        p.life -= p.decay;

        if (p.life <= 0 || p.y > window.innerHeight + 40) {
          this.particles.splice(i, 1);
          continue;
        }

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.globalAlpha = Math.max(0, p.life);
        ctx.fillStyle = p.color;
        if (p.shape === 'rect') {
          ctx.fillRect(-p.size / 2, -p.size / 3, p.size, p.size * 0.66);
        } else {
          ctx.beginPath();
          ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }

      if (this.particles.length) {
        this._rafId = requestAnimationFrame(() => this._loop());
      } else {
        ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
        this._rafId = null;
      }
    }

    clear() {
      this.particles = [];
      this.ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      if (this._rafId) { cancelAnimationFrame(this._rafId); this._rafId = null; }
    }
  }

  window.FX = FX;
})();
