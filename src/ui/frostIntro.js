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
    this.lastPos = null;
    this.hoverPos = null;
    this.hasWiped = false;
    this.rafId = null;

    // Fast lightweight coverage grid (24x16) to detect when ~40% of the ice wall has been wiped open!
    this.gridCols = 24;
    this.gridRows = 16;
    this.wipeGrid = new Uint8Array(this.gridCols * this.gridRows);
    this.wipedCells = 0;
    this.autoEnterThreshold = 0.4;

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

    this.wipeGrid.fill(0);
    this.wipedCells = 0;
    this.paintOpaqueGlacialIce();
  }

  rng(seed) {
    let s = seed >>> 0;
    return () => {
      s = (s * 1664525 + 1013904223) >>> 0;
      return s / 4294967296;
    };
  }

  // Paint 100% OPAQUE Deep Cobalt-Blue Frosted Window with Crystalline Frost Fern Clusters & Warm Center Bokeh Hint
  paintOpaqueGlacialIce() {
    const ctx = this.frostCtx;
    const w = this.w;
    const h = this.h;
    const rand = this.rng(20261229);

    ctx.globalCompositeOperation = 'source-over';
    ctx.clearRect(0, 0, w, h);

    // 1. 100% Opaque Deep Jewel Cobalt-Blue Winter Glass Backdrop (inspired by frosted Christmas window)
    const baseGrad = ctx.createRadialGradient(
      w * 0.48, h * 0.44, Math.min(w, h) * 0.03,
      w * 0.5, h * 0.5, Math.max(w, h) * 0.78
    );
    baseGrad.addColorStop(0.0, '#104ba6');
    baseGrad.addColorStop(0.32, '#0a337a');
    baseGrad.addColorStop(0.68, '#051e52');
    baseGrad.addColorStop(1.0, '#020e2e');
    ctx.fillStyle = baseGrad;
    ctx.fillRect(0, 0, w, h);

    // 2. Soft Luminous Cobalt / Arctic-Blue Atmospheric Mist Pockets across the Glass
    for (let i = 0; i < 42; i++) {
      const cx = rand() * w;
      const cy = rand() * h;
      const rad = 90 + rand() * 250;
      const mode = rand();
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, rad);
      if (mode < 0.48) {
        g.addColorStop(0, 'rgba(34, 128, 245, 0.24)');
        g.addColorStop(0.55, 'rgba(18, 82, 184, 0.10)');
        g.addColorStop(1, 'rgba(8, 36, 98, 0)');
      } else if (mode < 0.78) {
        g.addColorStop(0, 'rgba(72, 178, 255, 0.16)');
        g.addColorStop(0.5, 'rgba(26, 102, 206, 0.06)');
        g.addColorStop(1, 'rgba(6, 28, 76, 0)');
      } else {
        g.addColorStop(0, 'rgba(3, 14, 46, 0.34)');
        g.addColorStop(0.6, 'rgba(3, 16, 52, 0.14)');
        g.addColorStop(1, 'rgba(2, 10, 34, 0)');
      }
      ctx.fillStyle = g;
      ctx.fillRect(cx - rad, cy - rad, rad * 2, rad * 2);
    }

    // 3. Dreamy Warm Golden-Amber Bokeh Glow softly bleeding through the Frosted Center (hinting at the warm tree behind!)
    const bokehR = Math.min(w, h) * 0.22;
    const bokehX = w * 0.53;
    const bokehY = h * 0.5;
    const warmBokeh = ctx.createRadialGradient(bokehX, bokehY, bokehR * 0.04, bokehX, bokehY, bokehR);
    warmBokeh.addColorStop(0.0, 'rgba(255, 182, 92, 0.44)');
    warmBokeh.addColorStop(0.28, 'rgba(255, 148, 68, 0.26)');
    warmBokeh.addColorStop(0.62, 'rgba(196, 114, 72, 0.09)');
    warmBokeh.addColorStop(1.0, 'rgba(20, 62, 136, 0)');
    ctx.fillStyle = warmBokeh;
    ctx.beginPath();
    ctx.arc(bokehX, bokehY, bokehR, 0, Math.PI * 2);
    ctx.fill();

    // Subtle secondary distant bokeh specks
    for (let i = 0; i < 12; i++) {
      const bx = w * (0.14 + rand() * 0.72);
      const by = h * (0.14 + rand() * 0.72);
      const br = 24 + rand() * 58;
      const bg = ctx.createRadialGradient(bx, by, 0, bx, by, br);
      bg.addColorStop(0, 'rgba(128, 212, 255, 0.14)');
      bg.addColorStop(0.55, 'rgba(66, 158, 245, 0.05)');
      bg.addColorStop(1, 'rgba(20, 72, 168, 0)');
      ctx.fillStyle = bg;
      ctx.beginPath();
      ctx.arc(bx, by, br, 0, Math.PI * 2);
      ctx.fill();
    }

    // 4. Intricate Crystalline Ice-Blue Frost Fern Clusters (window-frost blossoms denser near edges!)
    const drawFrostTwig = (x, y, ang, len, depth, alpha) => {
      if (depth <= 0 || len < 3.5) return;
      const x2 = x + Math.cos(ang) * len;
      const y2 = y + Math.sin(ang) * len;

      // Soft sapphire frost halo stroke
      ctx.strokeStyle = `rgba(68, 178, 255, ${alpha * 0.55})`;
      ctx.lineWidth = depth * 1.45 + 0.8;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x2, y2);
      ctx.stroke();

      // Bright icy-white crystalline core vein
      ctx.strokeStyle = `rgba(182, 232, 255, ${alpha * 0.85})`;
      ctx.lineWidth = Math.max(0.55, depth * 0.65);
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x2, y2);
      ctx.stroke();

      // Feathered dendritic side crystals
      const branches = depth >= 2 ? 3 : 2;
      for (let b = 0; b < branches; b++) {
        const frac = 0.34 + (b / branches) * 0.56;
        const bx = x + (x2 - x) * frac;
        const by = y + (y2 - y) * frac;
        const spread = 0.52 + rand() * 0.36;
        const subLen = len * (0.46 + rand() * 0.22);
        drawFrostTwig(bx, by, ang + spread, subLen, depth - 1, alpha * 0.86);
        drawFrostTwig(bx, by, ang - spread, subLen, depth - 1, alpha * 0.86);
      }
    };

    const drawFrostCluster = (cx, cy, radius, intensity) => {
      // Soft glowing ice-blue crystal cushion behind each cluster
      const halo = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius * 1.35);
      halo.addColorStop(0, `rgba(92, 198, 255, ${0.22 * intensity})`);
      halo.addColorStop(0.6, `rgba(42, 134, 240, ${0.09 * intensity})`);
      halo.addColorStop(1, 'rgba(18, 72, 170, 0)');
      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.arc(cx, cy, radius * 1.35, 0, Math.PI * 2);
      ctx.fill();

      const arms = 5 + Math.floor(rand() * 4);
      const baseAng = rand() * Math.PI * 2;
      for (let a = 0; a < arms; a++) {
        const ang = baseAng + (a / arms) * Math.PI * 2 + (rand() - 0.5) * 0.35;
        drawFrostTwig(cx, cy, ang, radius * (0.65 + rand() * 0.45), 3, 0.56 * intensity);
      }
    };

    // Place ~95 organic frost fern clusters (richly blooming around edges/corners, leaving serene center clarity!)
    const clusterTarget = w < 640 ? 68 : 108;
    let placed = 0;
    let tries = 0;
    while (placed < clusterTarget && tries < clusterTarget * 6) {
      tries++;
      const ux = rand();
      const uy = rand();
      const distCenter = Math.hypot((ux - 0.5) * 1.25, (uy - 0.48) * 1.45);
      // Leave clean breathing room right behind the title & warm bokeh center
      if (distCenter < 0.28 && rand() < 0.92) continue;
      if (distCenter < 0.45 && rand() < 0.55) continue;

      placed++;
      const edgeWeight = Math.min(1.25, 0.55 + distCenter * 0.95);
      const rad = (13 + rand() * 24) * edgeWeight * (w < 640 ? 0.78 : 1.0);
      drawFrostCluster(ux * w, uy * h, rad, Math.min(1.0, 0.52 + distCenter * 0.62));
    }

    // 5. Delicate Fine Frosted Sugar-Crystal Grain (denser near perimeter edges)
    for (let i = 0; i < 1600; i++) {
      const x = rand() * w;
      const y = rand() * h;
      const edgeDist = Math.min(x / w, (w - x) / w, y / h, (h - y) / h);
      const edgeBoost = Math.max(0, 1.0 - edgeDist * 3.8);
      const alpha = 0.05 + edgeBoost * 0.28;
      const sz = 0.8 + rand() * 1.5;
      ctx.fillStyle = rand() > 0.3 ? `rgba(176, 228, 255, ${alpha})` : `rgba(235, 248, 255, ${alpha})`;
      ctx.beginPath();
      ctx.arc(x, y, sz * 0.6, 0, Math.PI * 2);
      ctx.fill();
    }

    // 6. Soft Deep-Sapphire Vignette framing the outer frosty pane
    const vig = ctx.createRadialGradient(w * 0.5, h * 0.5, Math.min(w, h) * 0.32, w * 0.5, h * 0.5, Math.max(w, h) * 0.76);
    vig.addColorStop(0, 'rgba(0, 0, 0, 0)');
    vig.addColorStop(1, 'rgba(2, 8, 28, 0.56)');
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, w, h);
  }

  // Soft Circular Luminous Snow Orbs (no 6-point icons; gentle varied sizes!)
  initLargeSnowflakes() {
    this.flakes = [];
    const count = 54;
    for (let i = 0; i < count; i++) {
      const tier = i % 3; // 0 = fine dust, 1 = soft mid orb, 2 = slightly larger bokeh orb
      const r = tier === 2 ? (4.4 + Math.random() * 3.8) : tier === 1 ? (2.5 + Math.random() * 2.1) : (1.2 + Math.random() * 1.3);
      this.flakes.push({
        x: Math.random() * this.w,
        y: Math.random() * this.h,
        r,
        vy: tier === 2 ? (0.45 + Math.random() * 0.52) : (0.28 + Math.random() * 0.45),
        vx: (Math.random() - 0.5) * 0.35,
        rot: 0,
        vRot: 0,
        phase: Math.random() * Math.PI * 2,
        alpha: tier === 2 ? (0.42 + Math.random() * 0.34) : tier === 1 ? (0.34 + Math.random() * 0.3) : (0.22 + Math.random() * 0.25)
      });
    }
  }

  drawCrystallineSnowflake(ctx, f) {
    const rad = f.r * 1.6;
    const grad = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, rad);
    grad.addColorStop(0.0, `rgba(255, 255, 255, ${f.alpha})`);
    grad.addColorStop(0.45, `rgba(218, 240, 255, ${f.alpha * 0.52})`);
    grad.addColorStop(1.0, 'rgba(170, 220, 255, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(f.x, f.y, rad, 0, Math.PI * 2);
    ctx.fill();
  }

  // Mark coverage grid cells inside wiped circle and auto-trigger smooth dissolve at 40% cleared!
  recordWipeCoverage(px, py, radius) {
    const cellW = this.w / this.gridCols;
    const cellH = this.h / this.gridRows;
    const effR = radius * 0.88;
    const minC = Math.max(0, Math.floor((px - effR) / cellW));
    const maxC = Math.min(this.gridCols - 1, Math.floor((px + effR) / cellW));
    const minR = Math.max(0, Math.floor((py - effR) / cellH));
    const maxR = Math.min(this.gridRows - 1, Math.floor((py + effR) / cellH));

    for (let r = minR; r <= maxR; r++) {
      const cy = (r + 0.5) * cellH;
      for (let c = minC; c <= maxC; c++) {
        const idx = r * this.gridCols + c;
        if (this.wipeGrid[idx]) continue;
        const cx = (c + 0.5) * cellW;
        if (Math.hypot(cx - px, cy - py) <= effR) {
          this.wipeGrid[idx] = 1;
          this.wipedCells++;
        }
      }
    }

    const ratio = this.wipedCells / this.wipeGrid.length;
    // Gently soften the center copy as you approach 40% wiped
    if (ratio > 0.18 && this.root) {
      const softFade = Math.max(0.35, 1.0 - (ratio - 0.18) * 1.8);
      this.root.style.setProperty('--wipe-copy-opacity', softFade.toFixed(2));
    }
    if (ratio >= this.autoEnterThreshold) {
      this.triggerEnter();
    }
  }

  // Silky Feathered Gradient Thaw Brush (multi-layer warm-breath fade + ice-cyan mist rim!)
  carveIceAt(x, y) {
    if (!this.active || this.melting) return;

    const ctx = this.frostCtx;
    const baseR = Math.max(66, Math.min(92, Math.min(this.w, this.h) * 0.105));

    const carveDab = (px, py, r) => {
      // 1. Soft glowing icy-cyan / aurora condensation halo hugging the feathered melted rim
      ctx.save();
      ctx.globalCompositeOperation = 'source-atop';
      const rimGrad = ctx.createRadialGradient(px, py, r * 0.55, px, py, r * 1.52);
      rimGrad.addColorStop(0.0, 'rgba(130, 218, 255, 0)');
      rimGrad.addColorStop(0.42, 'rgba(126, 214, 255, 0.18)');
      rimGrad.addColorStop(0.72, 'rgba(198, 240, 255, 0.12)');
      rimGrad.addColorStop(1.0, 'rgba(120, 200, 255, 0)');
      ctx.fillStyle = rimGrad;
      ctx.beginPath();
      ctx.arc(px, py, r * 1.52, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // 2. Wide silky feathered gradient erase (painterly soft warm-mist transition!)
      ctx.save();
      ctx.globalCompositeOperation = 'destination-out';
      const outerR = r * 1.38;
      const g = ctx.createRadialGradient(px, py, r * 0.08, px, py, outerR);
      g.addColorStop(0.0, 'rgba(0,0,0,0.92)');
      g.addColorStop(0.28, 'rgba(0,0,0,0.68)');
      g.addColorStop(0.55, 'rgba(0,0,0,0.32)');
      g.addColorStop(0.80, 'rgba(0,0,0,0.10)');
      g.addColorStop(1.0, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(px, py, outerR, 0, Math.PI * 2);
      ctx.fill();

      // Subtle organic feathered satellite cloud puffs so strokes look painterly rather than tubular
      for (let s = 0; s < 2; s++) {
        const a = Math.random() * Math.PI * 2;
        const dist = r * (0.25 + Math.random() * 0.4);
        const sx = px + Math.cos(a) * dist;
        const sy = py + Math.sin(a) * dist;
        const sr = r * (0.55 + Math.random() * 0.45);
        const sg = ctx.createRadialGradient(sx, sy, 0, sx, sy, sr);
        sg.addColorStop(0.0, 'rgba(0,0,0,0.28)');
        sg.addColorStop(0.6, 'rgba(0,0,0,0.09)');
        sg.addColorStop(1.0, 'rgba(0,0,0,0)');
        ctx.fillStyle = sg;
        ctx.beginPath();
        ctx.arc(sx, sy, sr, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();

      this.recordWipeCoverage(px, py, r * 0.95);
    };

    if (this.lastPos) {
      const dx = x - this.lastPos.x;
      const dy = y - this.lastPos.y;
      const dist = Math.hypot(dx, dy);
      const velScale = Math.max(0.85, Math.min(1.22, 0.92 + dist * 0.004));
      const steps = Math.max(1, Math.min(20, Math.ceil(dist / 16)));
      for (let i = 1; i <= steps; i++) {
        const t = i / steps;
        carveDab(this.lastPos.x + dx * t, this.lastPos.y + dy * t, baseR * velScale);
        if (this.melting) break;
      }
    } else {
      carveDab(x, y, baseR);
    }

    for (let k = 0; k < 3; k++) {
      const a = Math.random() * Math.PI * 2;
      const d = 14 + Math.random() * 44;
      this.sparkles.push({
        x: x + Math.cos(a) * d,
        y: y + Math.sin(a) * d,
        vx: (Math.random() - 0.5) * 1.15,
        vy: 0.35 + Math.random() * 0.95,
        life: 1.0,
        size: 1.4 + Math.random() * 2.6,
        tint: Math.random() > 0.3 ? '176, 232, 255' : '255, 224, 174'
      });
    }

    this.lastPos = { x, y };

    if (!this.hasWiped) {
      this.hasWiped = true;
      if (this.hintEl) this.hintEl.classList.add('is-soft');
    }
  }

  collectMeltEdgeSeeds() {
    const cellW = this.w / this.gridCols;
    const cellH = this.h / this.gridRows;
    const rawSeeds = [];

    for (let r = 0; r < this.gridRows; r++) {
      for (let c = 0; c < this.gridCols; c++) {
        const idx = r * this.gridCols + c;
        if (!this.wipeGrid[idx]) continue;
        // Identify boundary cells touching unwiped frost (the exact edges the user carved!)
        const touchesEdge =
          (c > 0 && !this.wipeGrid[idx - 1]) ||
          (c < this.gridCols - 1 && !this.wipeGrid[idx + 1]) ||
          (r > 0 && !this.wipeGrid[idx - this.gridCols]) ||
          (r < this.gridRows - 1 && !this.wipeGrid[idx + this.gridCols]);

        if (touchesEdge) {
          rawSeeds.push({
            x: (c + 0.5) * cellW + (Math.random() - 0.5) * cellW * 0.4,
            y: (r + 0.5) * cellH + (Math.random() - 0.5) * cellH * 0.4,
            speed: 0.86 + Math.random() * 0.34,
            startR: Math.max(cellW, cellH) * 0.65
          });
        }
      }
    }

    // If user clicked Enter without wiping, melt organically outward from the warm glowing center bokeh!
    if (rawSeeds.length === 0) {
      return [
        { x: this.w * 0.52, y: this.h * 0.49, speed: 1.0, startR: 28 },
        { x: this.w * 0.46, y: this.h * 0.46, speed: 0.94, startR: 22 },
        { x: this.w * 0.56, y: this.h * 0.53, speed: 0.96, startR: 22 }
      ];
    }

    // Subsample evenly to <= 34 frontier seeds so edge-expanding melt runs smoothly at 60 FPS on mobile!
    if (rawSeeds.length <= 34) return rawSeeds;
    const stride = rawSeeds.length / 34;
    const picked = [];
    for (let i = 0; i < 34; i++) {
      picked.push(rawSeeds[Math.floor(i * stride)]);
    }
    return picked;
  }

  triggerEnter() {
    if (this.melting || !this.active) return;
    this.melting = true;
    this.meltProgress = 0;
    this.meltSeeds = this.collectMeltEdgeSeeds();
    this.maxMeltSpread = Math.hypot(this.w, this.h) * (this.wipedCells > 0 ? 0.62 : 0.78);
    this.root.classList.add('is-melting');
    if (this.onEnter) this.onEnter();
  }

  bindEvents() {
    const onSwipe = (clientX, clientY, target) => {
      if (!this.active || this.melting) return;
      if (target && target.closest && target.closest('#btn-enter-scene')) return;
      this.hoverPos = { x: clientX, y: clientY };
      this.carveIceAt(clientX, clientY);
    };

    this.root.addEventListener('pointermove', (e) => {
      onSwipe(e.clientX, e.clientY, e.target);
    }, { passive: true });

    this.root.addEventListener('pointerdown', (e) => {
      this.lastPos = null;
      onSwipe(e.clientX, e.clientY, e.target);
    }, { passive: true });

    this.root.addEventListener('touchmove', (e) => {
      if (e.touches && e.touches[0]) {
        onSwipe(e.touches[0].clientX, e.touches[0].clientY, e.target);
      }
    }, { passive: true });

    const resetTrail = () => {
      this.lastPos = null;
      this.hoverPos = null;
    };
    this.root.addEventListener('pointerleave', resetTrail, { passive: true });
    this.root.addEventListener('touchend', resetTrail, { passive: true });

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
    const frameIntervalMs = 1000 / 60;
    const tick = (now) => {
      if (!this.active) return;
      this.rafId = requestAnimationFrame(tick);
      if (document.hidden) {
        prev = now;
        return;
      }
      const elapsedMs = now - prev;
      if (elapsedMs < frameIntervalMs - 0.6) return;
      const dt = Math.min(elapsedMs / 1000, 0.05);
      prev = now - (elapsedMs % frameIntervalMs);

      // Organic Edge-Expanding Frost Melt Dissolve: expands feathery thaw waves outward from your wiped edges to screen borders!
      if (this.melting) {
        this.meltProgress += dt * 0.82;
        const p = Math.min(1, this.meltProgress);
        const ease = 1.0 - Math.pow(1.0 - p, 2.15);
        const fCtx = this.frostCtx;
        const seeds = this.meltSeeds || [];

        for (let i = 0; i < seeds.length; i++) {
          const s = seeds[i];
          const curR = s.startR + ease * this.maxMeltSpread * s.speed;

          // Subtle luminous icy-cyan melt frontier glow right ahead of the dissolving edge
          if (p < 0.85) {
            fCtx.save();
            fCtx.globalCompositeOperation = 'source-atop';
            const rim = fCtx.createRadialGradient(s.x, s.y, curR * 0.72, s.x, s.y, curR * 1.14);
            rim.addColorStop(0.0, 'rgba(130, 218, 255, 0)');
            rim.addColorStop(0.55, `rgba(142, 224, 255, ${(0.12 * (1 - p)).toFixed(3)})`);
            rim.addColorStop(1.0, 'rgba(130, 218, 255, 0)');
            fCtx.fillStyle = rim;
            fCtx.beginPath();
            fCtx.arc(s.x, s.y, curR * 1.14, 0, Math.PI * 2);
            fCtx.fill();
            fCtx.restore();
          }

          // Feathered radial dissolve eating the remaining frost outward to the corners
          fCtx.save();
          fCtx.globalCompositeOperation = 'destination-out';
          const grad = fCtx.createRadialGradient(s.x, s.y, curR * 0.18, s.x, s.y, curR);
          grad.addColorStop(0.0, 'rgba(0,0,0,1)');
          grad.addColorStop(0.55, 'rgba(0,0,0,0.82)');
          grad.addColorStop(0.84, 'rgba(0,0,0,0.28)');
          grad.addColorStop(1.0, 'rgba(0,0,0,0)');
          fCtx.fillStyle = grad;
          fCtx.beginPath();
          fCtx.arc(s.x, s.y, curR, 0, Math.PI * 2);
          fCtx.fill();
          fCtx.restore();
        }

        // Only soften remaining ultra-faint edge mist wisps + fx snow in the final 22%
        if (p > 0.78) {
          const tailFade = Math.max(0, 1.0 - (p - 0.78) / 0.22);
          this.frostCanvas.style.opacity = tailFade.toFixed(3);
          this.fxCanvas.style.opacity = tailFade.toFixed(3);
        }

        if (this.meltProgress >= 1.04) {
          this.active = false;
          this.root.classList.add('is-gone');
          window.removeEventListener('resize', this._onResize);
          cancelAnimationFrame(this.rafId);
          return;
        }
      }

      const ctx = this.fxCtx;
      ctx.clearRect(0, 0, this.w, this.h);
      const t = now * 0.001;

      if (this.hoverPos && !this.melting) {
        const { x, y } = this.hoverPos;
        const rad = 110;
        const glow = ctx.createRadialGradient(x, y, 0, x, y, rad);
        glow.addColorStop(0, 'rgba(185, 232, 255, 0.2)');
        glow.addColorStop(0.55, 'rgba(90, 170, 230, 0.05)');
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
    };
    this.rafId = requestAnimationFrame(tick);
  }
}
