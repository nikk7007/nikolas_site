/* wheel.js — canvas renderer */
(function () {
  'use strict';

  class Wheel {
    constructor(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.rotation = 0;             // radians
      this.items = [];
      this.palette = 'ember';
      this.style = 'solid';          // 'solid' | 'alternating' | 'ringed'
      this.highlightIndex = -1;      // for tick visual feedback
      this._dprScale = 1;
      this._handleResize();
      window.addEventListener('resize', () => this._handleResize());
    }

    _handleResize() {
      const dpr = window.devicePixelRatio || 1;
      // canvas attribute is fixed 900; we use CSS sizing.
      // Render at DPR for crispness.
      const rect = this.canvas.getBoundingClientRect();
      const size = Math.round(rect.width * dpr);
      if (size > 0 && this.canvas.width !== size) {
        this.canvas.width = size;
        this.canvas.height = size;
      }
      this._dprScale = dpr;
      this.draw();
    }

    setItems(items) {
      this.items = items;
      this.draw();
    }

    setPalette(name) {
      this.palette = name;
      this.draw();
    }

    setStyle(style) {
      this.style = style;
      this.draw();
    }

    setRotation(r) {
      this.rotation = r;
      this.draw();
    }

    setHighlight(i) {
      this.highlightIndex = i;
      this.draw();
    }

    // returns the item index currently under the pointer (top, 12 o'clock)
    indexAtPointer() {
      if (!this.items.length) return -1;
      // pointer is at top => -PI/2 in canvas coords. Segments start at -PI/2 + rotation.
      // angle from segment-zero-start to pointer:
      const arc = (Math.PI * 2) / this.items.length;
      // We draw such that the first segment starts at the top and proceeds clockwise.
      // After rotation r, segment i occupies [r + i*arc, r + (i+1)*arc) relative to top.
      // The pointer is at angle 0 from top. So index = floor((0 - r) / arc) mod N.
      const norm = ((-this.rotation) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
      const idx = Math.floor(norm / arc) % this.items.length;
      return idx;
    }

    draw() {
      const c = this.canvas;
      const ctx = this.ctx;
      const W = c.width;
      const H = c.height;
      ctx.clearRect(0, 0, W, H);

      const cx = W / 2;
      const cy = H / 2;
      const R = Math.min(W, H) / 2 - 4 * this._dprScale;

      // backplate
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, R + 2, 0, Math.PI * 2);
      ctx.fillStyle = this._cssVar('--bg-elev') || '#fff';
      ctx.fill();
      ctx.restore();

      if (!this.items.length) {
        this._drawEmpty(ctx, cx, cy, R);
        return;
      }

      const N = this.items.length;
      const arc = (Math.PI * 2) / N;

      // Rotation: we want segment 0 to start at the TOP (12 o'clock) when rotation=0.
      // Canvas angle 0 = right (3 o'clock). So top = -PI/2.
      const startBase = -Math.PI / 2 + this.rotation;

      for (let i = 0; i < N; i++) {
        const a0 = startBase + i * arc;
        const a1 = a0 + arc;
        const color = this.items[i].color || window.Utils.colorForIndex(this.palette, i);

        ctx.save();
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, R, a0, a1);
        ctx.closePath();

        // segment fill
        if (this.style === 'alternating') {
          ctx.fillStyle = i % 2 === 0 ? color : window.Utils.mix(color, '#000000', 0.18);
        } else if (this.style === 'ringed') {
          // radial gradient from center to edge
          const grd = ctx.createRadialGradient(cx, cy, R * 0.15, cx, cy, R);
          grd.addColorStop(0, window.Utils.mix(color, '#ffffff', 0.18));
          grd.addColorStop(1, color);
          ctx.fillStyle = grd;
        } else {
          ctx.fillStyle = color;
        }
        ctx.fill();

        // highlight wash for under-pointer
        if (i === this.highlightIndex) {
          ctx.fillStyle = 'rgba(255,255,255,0.10)';
          ctx.fill();
        }

        // segment edge
        ctx.lineWidth = 1.5 * this._dprScale;
        ctx.strokeStyle = 'rgba(0,0,0,0.10)';
        ctx.stroke();
        ctx.restore();

        // label
        this._drawLabel(ctx, cx, cy, R, a0 + arc / 2, this.items[i].label, color, arc, N);
      }

      // outer ring
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.lineWidth = 2 * this._dprScale;
      ctx.strokeStyle = this._cssVar('--ink') || '#000';
      ctx.globalAlpha = 0.12;
      ctx.stroke();
      ctx.restore();

      // inner hub ring (visual under the spin button)
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, R * 0.18, 0, Math.PI * 2);
      ctx.fillStyle = this._cssVar('--bg-elev') || '#fff';
      ctx.fill();
      ctx.lineWidth = 1.5 * this._dprScale;
      ctx.strokeStyle = this._cssVar('--line') || '#ddd';
      ctx.stroke();
      ctx.restore();

      // tick marks on outer rim
      ctx.save();
      for (let i = 0; i < N; i++) {
        const a = startBase + i * arc;
        const x1 = cx + Math.cos(a) * (R - 8 * this._dprScale);
        const y1 = cy + Math.sin(a) * (R - 8 * this._dprScale);
        const x2 = cx + Math.cos(a) * R;
        const y2 = cy + Math.sin(a) * R;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.strokeStyle = 'rgba(0,0,0,0.18)';
        ctx.lineWidth = 1 * this._dprScale;
        ctx.stroke();
      }
      ctx.restore();
    }

    _drawLabel(ctx, cx, cy, R, angle, label, segColor, arc, N) {
      const text = this._truncate(label, N);
      const textColor = window.Utils.contrastText(segColor);

      // base font size scales with segment count and canvas size
      const base = R / 16;
      let size = base * (1 - Math.min(0.4, N / 60));
      size = Math.max(11 * this._dprScale, Math.min(size, R / 8));

      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(angle);

      // text along radius, anchored near outer edge
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = textColor;
      ctx.font = `500 ${size}px Geist, system-ui, sans-serif`;

      // subtle shadow for legibility
      ctx.shadowColor = 'rgba(0,0,0,0.15)';
      ctx.shadowBlur = 2 * this._dprScale;
      ctx.shadowOffsetY = 1 * this._dprScale;

      const tx = R - R * 0.08;
      ctx.fillText(text, tx, 0);
      ctx.restore();
    }

    _truncate(label, N) {
      // approximate cap based on item count
      const maxChars = N <= 6 ? 22 : N <= 12 ? 16 : N <= 20 ? 12 : 8;
      if (label.length <= maxChars) return label;
      return label.slice(0, maxChars - 1) + '…';
    }

    _drawEmpty(ctx, cx, cy, R) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.fillStyle = this._cssVar('--bg-sunken') || '#eee';
      ctx.fill();
      ctx.strokeStyle = this._cssVar('--line') || '#ddd';
      ctx.lineWidth = 2 * this._dprScale;
      ctx.setLineDash([6 * this._dprScale, 6 * this._dprScale]);
      ctx.stroke();
      ctx.setLineDash([]);

      // hairline cross
      ctx.strokeStyle = this._cssVar('--line') || '#ddd';
      ctx.lineWidth = 1 * this._dprScale;
      ctx.beginPath();
      ctx.moveTo(cx - R * 0.4, cy);
      ctx.lineTo(cx + R * 0.4, cy);
      ctx.moveTo(cx, cy - R * 0.4);
      ctx.lineTo(cx, cy + R * 0.4);
      ctx.stroke();

      ctx.fillStyle = this._cssVar('--ink-mute') || '#999';
      ctx.font = `400 ${R / 14}px "JetBrains Mono", monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('adicione itens', cx, cy + R * 0.55);
      ctx.restore();
    }

    _cssVar(name) {
      return getComputedStyle(document.body).getPropertyValue(name).trim();
    }
  }

  window.Wheel = Wheel;
})();
