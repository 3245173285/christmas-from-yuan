// Ultra-Luxury 100% Opaque Deep Glacial Lake Ice Intro ("CHRISTMAS FROM YUAN")
// - Completely opaque (alpha = 1.0) deep obsidian-sapphire Baikal ice slab — hides the 3D scene completely
//   until the user holds Left Mouse Button to carve/melt open a portal through the ice, or clicks Enter!
// - Multi-depth 3D internal fracture planes, frozen methane bubble columns, subtle subsurface aurora sheen
// - Large drifting crystalline snowflakes + champagne-platinum editorial typography

export class FrostIntro {
  constructor({ onEnter } = {}) {
    this.onEnter = onEnter;
    this.root = document.getElementById('frost-intro');
    this.frostCanvas = document.getElementById('frost-canvas');
    this.fxCanvas = document.getElementById('frost-fx-canvas');
    this.enterBtn = document.getElementById('btn-enter-scene');
    this.hintEl = document.getElementById('frost-hint');

    if (!this.root || !this.frostCanvas || !this.fxCanvas) return;

    this.frostCtx = this.frostCanvas.getContext('2d');
    this.fxCtx = this.fxCanvas.getContext('2d');

    this.active = true;
    this.melting = false;
    this.meltProgress = 0;
    this.isDrawing = false;
    this.lastPos = null;
    this.hoverPos = null;
    this.hasWiped = false;
    this.rafId = null;

    this.flakes = [];
    this.sparkles = [];

    this.resize();
    this.initLargeSnowflakes();
    this.bindEvents();
    this.startLoop();
  }

  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.w = window.innerWidth;
    this.h = window.innerHeight;

    for (const c of [this.frostCanvas, this.fxCanvas]) {
      c.width = Math.floor(this.w * dpr);
      c.height = Math.floor(this.h * dpr);
      c.style.width = `${this.w}px`;
      c.style.height = `${this.h}px`;
    }
    this.frostCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.fxCtx.setTransform(dpr, 0, 0, dpr, 0, 0);

    this.paintOpaqueGlacialIce();
  }

  rng(seed) {
    let s = seed >>> 0;
    return () => {
      s = (s * 1664525 + 1013904223) >>> 0;
      return s / 4294967296;
    };
  }

  // Paint 100% OPAQUE museum-grade dark Baikal glacial lake ice texture
  paintOpaqueGlacialIce() {
    const ctx = this.frostCtx;
    const w = this.w;
    const h = this.h;
    const rand = this.rng(20261229);

    ctx.globalCompositeOperation = 'source-over';
    ctx.clearRect(0, 0, w, h);

    // 1. 100% Opaque Solid Deep Obsidian-Sapphire Ice Base (zero bleed-through of 3D scene!)
    const baseGrad = ctx.createRadialGradient(
      w * 0.5, h * 0.44, Math.min(w, h) * 0.04,
      w * 0.5, h * 0.5, Math.max(w, h) * 0.82
    );
    baseGrad.addColorStop(0.0, '#0a1e34');
    baseGrad.addColorStop(0.35, '#07172a');
    baseGrad.addColorStop(0.68, '#040e1c');
    baseGrad.addColorStop(1.0, '#020710');
    ctx.fillStyle = baseGrad;
    ctx.fillRect(0, 0, w, h);

    // 2. Deep Subsurface Glacial Ice Density Clouds & Faint Aurora Emerald-Teal Internal Refraction
    for (let i = 0; i < 48; i++) {
      const cx = rand() * w;
      const cy = rand() * h;
      const rad = 100 + rand() * 260;
      const mode = rand();
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, rad);
      if (mode < 0.35) {
        // Subtle deep glacier cyan pocket
        g.addColorStop(0, 'rgba(22, 88, 118, 0.22)');
        g.addColorStop(0.55, 'rgba(12, 50, 78, 0.09)');
        g.addColorStop(1, 'rgba(5, 20, 38, 0)');
      } else if (mode < 0.62) {
        // Subtle arctic emerald subsurface shimmer
        g.addColorStop(0, 'rgba(20, 102, 98, 0.14)');
        g.addColorStop(0.5, 'rgba(10, 52, 62, 0.06)');
        g.addColorStop(1, 'rgba(4, 18, 30, 0)');
      } else {
        // Deep abyssal black-blue ice thickness shadow
        g.addColorStop(0, 'rgba(1, 6, 14, 0.34)');
        g.addColorStop(0.6, 'rgba(2, 9, 20, 0.14)');
        g.addColorStop(1, 'rgba(2, 9, 20, 0)');
      }
      ctx.fillStyle = g;
      ctx.fillRect(cx - rad, cy - rad, rad * 2, rad * 2);
    }

    // 3. Diagonal Polished Black-Ice Light Reflection Sweep
    const sheen = ctx.createLinearGradient(w * 0.05, 0, w * 0.95, h);
    sheen.addColorStop(0.0, 'rgba(120, 190, 240, 0.08)');
    sheen.addColorStop(0.28, 'rgba(255, 255, 255, 0.015)');
    sheen.addColorStop(0.48, 'rgba(145, 212, 255, 0.095)');
    sheen.addColorStop(0.62, 'rgba(4, 14, 28, 0.06)');
    sheen.addColorStop(1.0, 'rgba(85, 160, 220, 0.07)');
    ctx.fillStyle = sheen;
    ctx.fillRect(0, 0, w, h);

    // 4. Multi-Depth 3D Internal Ice Slab Cleavage Cracks (Baikal frozen lake signature!)
    const drawFracture = (points, weight, depthOffset) => {
      if (points.length < 2) return;

      // (a) Deep internal crack curtain ribbon (gives 12cm-thick solid slab optical refraction!)
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
      for (let i = points.length - 1; i >= 0; i--) {
        ctx.lineTo(points[i].x + depthOffset * 2.2, points[i].y + depthOffset * 3.1);
      }
      ctx.closePath();
      ctx.fillStyle = `rgba(68, 172, 224, ${0.095 * weight})`;
      ctx.fill();

      // (b) Deep dark shadow edge at bottom of fracture plane
      ctx.beginPath();
      ctx.moveTo(points[0].x + depthOffset * 2.1, points[0].y + depthOffset * 3.0);
      for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x + depthOffset * 2.1, points[i].y + depthOffset * 3.0);
      }
      ctx.strokeStyle = `rgba(1, 5, 12, ${0.65 * weight})`;
      ctx.lineWidth = 2.0 * weight;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.stroke();

      // (c) Mid-depth icy cyan internal highlight
      ctx.beginPath();
      ctx.moveTo(points[0].x + depthOffset * 0.6, points[0].y + depthOffset * 0.9);
      for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x + depthOffset * 0.6, points[i].y + depthOffset * 0.9);
      }
      ctx.strokeStyle = `rgba(105, 208, 246, ${0.34 * weight})`;
      ctx.lineWidth = 2.6 * weight;
      ctx.stroke();

      // (d) Razor-sharp diamond-white surface fracture line
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
      ctx.strokeStyle = `rgba(226, 245, 255, ${0.78 * weight})`;
      ctx.lineWidth = Math.max(0.5, 1.15 * weight);
      ctx.stroke();
      ctx.restore();
    };

    const generateCrack = (x0, y0, angle, totalLen, segLen, weight, depth) => {
      const pts = [{ x: x0, y: y0 }];
      let cx = x0;
      let cy = y0;
      let ang = angle;
      const steps = Math.max(3, Math.floor(totalLen / segLen));

      for (let i = 0; i < steps; i++) {
        ang += (rand() - 0.5) * 0.38;
        const step = segLen * (0.68 + rand() * 0.64);
        cx += Math.cos(ang) * step;
        cy += Math.sin(ang) * step;
        pts.push({ x: cx, y: cy });

        if (depth > 0 && i > 1 && i < steps - 1 && rand() < 0.23) {
          const side = rand() > 0.5 ? 1 : -1;
          const bAng = ang + side * (0.48 + rand() * 0.62);
          generateCrack(cx, cy, bAng, totalLen * (0.26 + rand() * 0.34), segLen * 0.78, weight * 0.6, depth - 1);
        }
      }
      drawFracture(pts, weight, 2.5 + weight * 3.4);
    };

    // Sweeping dramatic pressure fractures framing the dark lake slab
    const majorCracks = [
      [0, h * 0.2, 0.22, w * 0.94],
      [w * 0.16, 0, 1.12, h * 0.9],
      [w * 0.84, 0, 2.08, h * 0.94],
      [w, h * 0.72, 2.88, w * 0.86],
      [0, h * 0.8, -0.32, w * 0.76],
      [w * 0.56, h, -1.82, h * 0.72],
      [w * 0.96, h * 0.22, 2.58, w * 0.62],
      [w * 0.34, 0, 1.5, h * 0.58]
    ];
    for (const [sx, sy, ang, len] of majorCracks) {
      generateCrack(sx, sy, ang, len, 40, 0.94, 2);
    }

    // Delicate subsurface hairline stress fractures
    for (let i = 0; i < 22; i++) {
      generateCrack(rand() * w, rand() * h, rand() * Math.PI * 2, 100 + rand() * 200, 24, 0.36 + rand() * 0.26, 1);
    }

    // 5. Suspended Trapped Frozen Lake Methane/Air Bubble Columns (authentic multi-depth stacks!)
    for (let c = 0; c < 34; c++) {
      const bx = rand() * w;
      const by = rand() * h;
      const count = 4 + Math.floor(rand() * 9);
      for (let k = 0; k < count; k++) {
        const depthFrac = k / count;
        const ox = bx + (rand() - 0.5) * 24 + depthFrac * 10;
        const oy = by + (rand() - 0.5) * 22 + depthFrac * 15;
        const r = (1.1 + rand() * 3.8) * (1.0 - depthFrac * 0.42);
        const alpha = (0.46 - depthFrac * 0.3) * (0.6 + rand() * 0.4);

        const bg = ctx.createRadialGradient(ox - r * 0.3, oy - r * 0.3, 0, ox, oy, r);
        bg.addColorStop(0.0, `rgba(235, 248, 255, ${alpha})`);
        bg.addColorStop(0.5, `rgba(105, 192, 234, ${alpha * 0.55})`);
        bg.addColorStop(1.0, 'rgba(18, 62, 98, 0)');
        ctx.fillStyle = bg;
        ctx.beginPath();
        ctx.arc(ox, oy, r, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // 6. Micro Skate-like Glacial Surface Scratches & Fine Ice Crystal Dust
    ctx.strokeStyle = 'rgba(200, 232, 255, 0.08)';
    ctx.lineWidth = 0.7;
    for (let i = 0; i < 55; i++) {
      const x = rand() * w;
      const y = rand() * h;
      const a = rand() * Math.PI * 2;
      const l = 25 + rand() * 90;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.quadraticCurveTo(x + Math.cos(a + 0.2) * l * 0.5, y + Math.sin(a + 0.2) * l * 0.5, x + Math.cos(a) * l, y + Math.sin(a) * l);
      ctx.stroke();
    }

    for (let i = 0; i < 1400; i++) {
      const x = rand() * w;
      const y = rand() * h;
      const edgeDist = Math.min(x / w, (w - x) / w, y / h, (h - y) / h);
      const edgeBoost = Math.max(0, 1.0 - edgeDist * 4.2);
      const alpha = 0.04 + edgeBoost * 0.2;
      const sz = 0.7 + rand() * 1.3;
      ctx.fillStyle = `rgba(215, 238, 255, ${alpha})`;
      ctx.fillRect(x, y, sz, sz);
    }

    // Subtle dark luxury vignette framing the outer ice edges
    const vig = ctx.createRadialGradient(w * 0.5, h * 0.5, Math.min(w, h) * 0.35, w * 0.5, h * 0.5, Math.max(w, h) * 0.75);
    vig.addColorStop(0, 'rgba(0, 0, 0, 0)');
    vig.addColorStop(1, 'rgba(1, 5, 12, 0.52)');
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, w, h);
  }

  initLargeSnowflakes() {
    this.flakes = [];
    const count = 42;
    for (let i = 0; i < count; i++) {
      const isHeroBig = i < 15;
      this.flakes.push({
        x: Math.random() * this.w,
        y: Math.random() * this.h,
        r: isHeroBig ? 14 + Math.random() * 18 : 4.5 + Math.random() * 8.5,
        vy: isHeroBig ? 0.48 + Math.random() * 0.68 : 0.34 + Math.random() * 0.58,
        vx: (Math.random() - 0.5) * 0.38,
        rot: Math.random() * Math.PI * 2,
        vRot: (Math.random() - 0.5) * 0.013,
        phase: Math.random() * Math.PI * 2,
        alpha: isHeroBig ? 0.44 + Math.random() * 0.36 : 0.22 + Math.random() * 0.32,
        detailed: isHeroBig
      });
    }
  }

  drawCrystallineSnowflake(ctx, f) {
    ctx.save();
    ctx.translate(f.x, f.y);
    ctx.rotate(f.rot);

    const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, f.r * 1.25);
    grad.addColorStop(0, `rgba(245, 252, 255, ${f.alpha * 0.48})`);
    grad.addColorStop(0.5, `rgba(165, 218, 255, ${f.alpha * 0.14})`);
    grad.addColorStop(1, 'rgba(165, 218, 255, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, 0, f.r * 1.25, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = `rgba(238, 249, 255, ${f.alpha})`;
    ctx.lineCap = 'round';
    for (let i = 0; i < 6; i++) {
      ctx.rotate(Math.PI / 3);
      ctx.lineWidth = f.detailed ? 1.4 : 0.9;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(0, -f.r);
      ctx.stroke();

      if (f.detailed) {
        ctx.lineWidth = 0.95;
        for (const frac of [0.38, 0.66]) {
          const y = -f.r * frac;
          const bl = f.r * (0.34 - frac * 0.16);
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(-bl * 0.72, y - bl * 0.68);
          ctx.moveTo(0, y);
          ctx.lineTo(bl * 0.72, y - bl * 0.68);
          ctx.stroke();
        }
      }
    }
    ctx.restore();
  }

  // Carve / melt open a crystal window through the solid dark glacial ice (ONLY while Left Mouse Button held!)
  carveIceAt(x, y) {
    if (!this.active || this.melting) return;

    const ctx = this.frostCtx;
    const radius = 64;

    const carveDab = (px, py, r) => {
      // Luminous crystalline thawed-ice rim along the carved perimeter
      ctx.save();
      ctx.globalCompositeOperation = 'source-atop';
      const rimGrad = ctx.createRadialGradient(px, py, r * 0.64, px, py, r * 1.18);
      rimGrad.addColorStop(0.0, 'rgba(165, 225, 255, 0)');
      rimGrad.addColorStop(0.55, 'rgba(160, 224, 255, 0.24)');
      rimGrad.addColorStop(1.0, 'rgba(160, 224, 255, 0)');
      ctx.fillStyle = rimGrad;
      ctx.beginPath();
      ctx.arc(px, py, r * 1.18, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Carve clean transparent window into the live 3D Christmas world underneath
      ctx.save();
      ctx.globalCompositeOperation = 'destination-out';
      const g = ctx.createRadialGradient(px, py, r * 0.16, px, py, r);
      g.addColorStop(0.0, 'rgba(0,0,0,1)');
      g.addColorStop(0.52, 'rgba(0,0,0,0.72)');
      g.addColorStop(0.84, 'rgba(0,0,0,0.22)');
      g.addColorStop(1.0, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(px, py, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    };

    if (this.lastPos) {
      const dx = x - this.lastPos.x;
      const dy = y - this.lastPos.y;
      const dist = Math.hypot(dx, dy);
      const steps = Math.max(1, Math.min(26, Math.ceil(dist / 10)));
      for (let i = 1; i <= steps; i++) {
        const t = i / steps;
        carveDab(this.lastPos.x + dx * t, this.lastPos.y + dy * t, radius);
      }
    } else {
      carveDab(x, y, radius);
    }

    for (let k = 0; k < 4; k++) {
      const a = Math.random() * Math.PI * 2;
      const d = 14 + Math.random() * 40;
      this.sparkles.push({
        x: x + Math.cos(a) * d,
        y: y + Math.sin(a) * d,
        vx: (Math.random() - 0.5) * 1.35,
        vy: 0.4 + Math.random() * 1.1,
        life: 1.0,
        size: 1.3 + Math.random() * 2.5,
        tint: Math.random() > 0.35 ? '210, 240, 255' : '255, 242, 214'
      });
    }

    this.lastPos = { x, y };

    if (!this.hasWiped) {
      this.hasWiped = true;
      if (this.hintEl) this.hintEl.classList.add('is-soft');
    }
  }

  triggerEnter() {
    if (this.melting || !this.active) return;
    this.melting = true;
    this.isDrawing = false;
    this.meltProgress = 0;
    this.root.classList.add('is-melting');
    if (this.onEnter) this.onEnter();
  }

  bindEvents() {
    const onPointerDown = (e) => {
      if (!this.active || this.melting) return;
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      if (e.target && e.target.closest && e.target.closest('#btn-enter-scene')) return;

      this.isDrawing = true;
      this.lastPos = null;
      this.root.classList.add('is-carving');
      this.carveIceAt(e.clientX, e.clientY);
    };

    const onPointerMove = (e) => {
      if (!this.active || this.melting) return;
      this.hoverPos = { x: e.clientX, y: e.clientY };

      if (this.isDrawing) {
        if (e.pointerType === 'mouse' && (e.buttons & 1) === 0) {
          this.isDrawing = false;
          this.lastPos = null;
          this.root.classList.remove('is-carving');
          return;
        }
        this.carveIceAt(e.clientX, e.clientY);
      }
    };

    const onPointerUp = () => {
      this.isDrawing = false;
      this.lastPos = null;
      this.root.classList.remove('is-carving');
    };

    const onPointerLeave = () => {
      this.hoverPos = null;
      this.isDrawing = false;
      this.lastPos = null;
      this.root.classList.remove('is-carving');
    };

    this.root.addEventListener('pointerdown', onPointerDown);
    this.root.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('pointerup', onPointerUp, { passive: true });
    this.root.addEventListener('pointerleave', onPointerLeave, { passive: true });

    if (this.enterBtn) {
      this.enterBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.triggerEnter();
      });
    }

    this._onResize = () => {
      if (this.active) this.resize();
    };
    window.addEventListener('resize', this._onResize);
  }

  startLoop() {
    let prev = performance.now();
    const tick = (now) => {
      if (!this.active) return;
      const dt = Math.min((now - prev) / 1000, 0.05);
      prev = now;

      if (this.melting) {
        this.meltProgress += dt * 1.15;
        const maxR = Math.hypot(this.w, this.h) * 0.78;
        const curR = Math.pow(Math.min(1, this.meltProgress), 1.25) * maxR;
        const fctx = this.frostCtx;
        fctx.save();
        fctx.globalCompositeOperation = 'destination-out';
        const g = fctx.createRadialGradient(this.w * 0.5, this.h * 0.5, curR * 0.42, this.w * 0.5, this.h * 0.5, Math.max(10, curR));
        g.addColorStop(0, 'rgba(0,0,0,1)');
        g.addColorStop(0.75, 'rgba(0,0,0,0.78)');
        g.addColorStop(1, 'rgba(0,0,0,0)');
        fctx.fillStyle = g;
        fctx.fillRect(0, 0, this.w, this.h);
        fctx.restore();

        if (this.meltProgress >= 1.08) {
          this.active = false;
          this.root.classList.add('is-gone');
          window.removeEventListener('resize', this._onResize);
          return;
        }
      }

      const ctx = this.fxCtx;
      ctx.clearRect(0, 0, this.w, this.h);
      const t = now * 0.001;

      // Subtle glossy arctic moonlight sheen gliding over the opaque dark lake ice under cursor
      if (this.hoverPos && !this.melting) {
        const { x, y } = this.hoverPos;
        const rad = this.isDrawing ? 95 : 140;
        const glow = ctx.createRadialGradient(x, y, 0, x, y, rad);
        glow.addColorStop(0, this.isDrawing ? 'rgba(185, 232, 255, 0.22)' : 'rgba(140, 206, 255, 0.14)');
        glow.addColorStop(0.55, 'rgba(90, 170, 230, 0.04)');
        glow.addColorStop(1, 'rgba(90, 170, 230, 0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(x, y, rad, 0, Math.PI * 2);
        ctx.fill();
      }

      for (const f of this.flakes) {
        f.y += f.vy * (dt * 60);
        f.x += (f.vx + Math.sin(t * 0.65 + f.phase) * 0.4) * (dt * 60);
        f.rot += f.vRot * (dt * 60);
        if (f.y > this.h + f.r * 2) {
          f.y = -f.r * 2;
          f.x = Math.random() * this.w;
        }
        if (f.x < -f.r * 2) f.x = this.w + f.r * 2;
        if (f.x > this.w + f.r * 2) f.x = -f.r * 2;
        this.drawCrystallineSnowflake(ctx, f);
      }

      for (let i = this.sparkles.length - 1; i >= 0; i--) {
        const sp = this.sparkles[i];
        sp.x += sp.vx * (dt * 60);
        sp.y += sp.vy * (dt * 60);
        sp.life -= dt * 1.4;
        if (sp.life <= 0) {
          this.sparkles.splice(i, 1);
          continue;
        }
        ctx.fillStyle = `rgba(${sp.tint}, ${sp.life * 0.9})`;
        ctx.beginPath();
        ctx.arc(sp.x, sp.y, sp.size * sp.life, 0, Math.PI * 2);
        ctx.fill();
      }

      this.rafId = requestAnimationFrame(tick);
    };
    this.rafId = requestAnimationFrame(tick);
  }
}
