import * as THREE from 'three';

// Procedural Canvas PBR Textures (zero external dependencies)

export function createSoftGlowTexture(size = 128, innerColor = 'rgba(255,248,230,1)', midColor = 'rgba(255,220,150,0.45)') {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const half = size / 2;
  const grad = ctx.createRadialGradient(half, half, 0, half, half, half);
  grad.addColorStop(0.0, innerColor);
  grad.addColorStop(0.28, midColor);
  grad.addColorStop(0.65, 'rgba(255,200,120,0.08)');
  grad.addColorStop(1.0, 'rgba(0,0,0,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// Pure Soft Circular Bokeh Snow Orb Texture (zero 6-point pattern; dreamy photographic snow dots!)
export function createSnowflakeTexture(size = 96) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const c = size / 2;
  ctx.clearRect(0, 0, size, size);

  const grad = ctx.createRadialGradient(c, c, 0, c, c, c);
  grad.addColorStop(0.0, 'rgba(255,255,255,1.0)');
  grad.addColorStop(0.32, 'rgba(246,251,255,0.88)');
  grad.addColorStop(0.62, 'rgba(220,238,255,0.34)');
  grad.addColorStop(0.86, 'rgba(198,224,252,0.08)');
  grad.addColorStop(1.0, 'rgba(198,224,252,0)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(c, c, c, 0, Math.PI * 2);
  ctx.fill();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// Elongated Silky Mountain & Woodland Mist Ribbon Texture (horizontal feathery wisps, NEVER round white blobs!)
export function createWispyMistRibbonTexture(width = 256, height = 128) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, width, height);

  const wisps = [
    { x: 0.5, y: 0.54, rx: 0.44, ry: 0.24, a: 0.26 },
    { x: 0.34, y: 0.48, rx: 0.3, ry: 0.18, a: 0.2 },
    { x: 0.68, y: 0.56, rx: 0.28, ry: 0.16, a: 0.19 },
    { x: 0.46, y: 0.42, rx: 0.26, ry: 0.13, a: 0.15 },
    { x: 0.6, y: 0.62, rx: 0.22, ry: 0.12, a: 0.14 }
  ];

  for (const w of wisps) {
    ctx.save();
    ctx.translate(width * w.x, height * w.y);
    ctx.scale(1, w.ry / w.rx);
    const rad = width * w.rx;
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rad);
    g.addColorStop(0.0, `rgba(225, 238, 252, ${w.a})`);
    g.addColorStop(0.48, `rgba(195, 218, 244, ${w.a * 0.46})`);
    g.addColorStop(0.82, `rgba(170, 200, 235, ${w.a * 0.12})`);
    g.addColorStop(1.0, 'rgba(170, 200, 235, 0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, rad, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// Luxury Nordic Crimson Velvet & Gold Fair-Isle Woven Circular Christmas Tree Skirt Carpet Texture
export function createTreeSkirtTexture(size = 512) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const c = size / 2;
  ctx.clearRect(0, 0, size, size);

  // Outer soft scalloped carpet silhouette
  ctx.save();
  ctx.beginPath();
  ctx.arc(c, c, c * 0.94, 0, Math.PI * 2);
  ctx.clip();

  // Deep plush ruby-crimson velvet radial base
  const bg = ctx.createRadialGradient(c, c, c * 0.08, c, c, c * 0.94);
  bg.addColorStop(0.0, '#4f0915');
  bg.addColorStop(0.32, '#731020');
  bg.addColorStop(0.72, '#8b1628');
  bg.addColorStop(0.92, '#690f1e');
  bg.addColorStop(1.0, '#4d0a15');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, size, size);

  // Subtle woven fabric radial knit texture lines
  ctx.strokeStyle = 'rgba(255, 224, 170, 0.045)';
  ctx.lineWidth = 1.2;
  for (let r = 24; r < c * 0.92; r += 9) {
    ctx.beginPath();
    ctx.arc(c, c, r, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Ornate Nordic gold concentric embroidery rings
  const drawRing = (r, lw, color) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = lw;
    ctx.beginPath();
    ctx.arc(c, c, r, 0, Math.PI * 2);
    ctx.stroke();
  };
  drawRing(c * 0.89, 5.5, '#e8c474');
  drawRing(c * 0.85, 1.8, 'rgba(252, 232, 182, 0.78)');
  drawRing(c * 0.69, 2.4, 'rgba(235, 198, 118, 0.72)');
  drawRing(c * 0.66, 1.2, 'rgba(255, 240, 200, 0.55)');
  drawRing(c * 0.42, 1.6, 'rgba(232, 194, 114, 0.45)');

  // Scandinavian Fair-Isle diamond & 8-point winter star motifs woven around the outer border band
  const motifCount = 24;
  for (let i = 0; i < motifCount; i++) {
    const a = (i / motifCount) * Math.PI * 2;
    const mr = c * 0.77;
    const mx = c + Math.cos(a) * mr;
    const my = c + Math.sin(a) * mr;

    ctx.save();
    ctx.translate(mx, my);
    ctx.rotate(a + Math.PI / 2);

    // Cream-gold woven diamond star
    ctx.fillStyle = i % 2 === 0 ? '#f6e4bc' : '#e6bd68';
    ctx.beginPath();
    ctx.moveTo(0, -10);
    ctx.lineTo(6.5, 0);
    ctx.lineTo(0, 10);
    ctx.lineTo(-6.5, 0);
    ctx.closePath();
    ctx.fill();

    // Inner crimson jewel dot
    ctx.fillStyle = '#7c1222';
    ctx.beginPath();
    ctx.arc(0, 0, 2.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Soft ivory-plush faux-fur trim around outer rim + delicate snow dusting
  const furRim = ctx.createRadialGradient(c, c, c * 0.87, c, c, c * 0.95);
  furRim.addColorStop(0.0, 'rgba(248, 240, 224, 0)');
  furRim.addColorStop(0.45, 'rgba(248, 242, 230, 0.88)');
  furRim.addColorStop(0.85, 'rgba(236, 230, 218, 0.96)');
  furRim.addColorStop(1.0, 'rgba(210, 215, 226, 0.75)');
  ctx.fillStyle = furRim;
  ctx.beginPath();
  ctx.arc(c, c, c * 0.95, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

export function createSmokePuffTexture(size = 128) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const half = size / 2;
  ctx.clearRect(0, 0, size, size);
  // Layered soft organic clouds
  const puffs = [
    [0, 0, half * 0.92, 0.38],
    [-half * 0.22, -half * 0.1, half * 0.65, 0.26],
    [half * 0.2, half * 0.14, half * 0.6, 0.24],
    [half * 0.12, -half * 0.22, half * 0.55, 0.22]
  ];
  for (const [ox, oy, rad, alpha] of puffs) {
    const g = ctx.createRadialGradient(half + ox, half + oy, 0, half + ox, half + oy, rad);
    g.addColorStop(0, `rgba(235,242,250,${alpha})`);
    g.addColorStop(0.55, `rgba(210,222,238,${alpha * 0.45})`);
    g.addColorStop(1, 'rgba(200,215,235,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createBarkTexture(size = 256) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#332218';
  ctx.fillRect(0, 0, size, size);

  for (let i = 0; i < 420; i++) {
    const x = (Math.sin(i * 12.9898) * 43758.5453 % 1 + 1) % 1 * size;
    const y = (Math.sin(i * 78.233) * 43758.5453 % 1 + 1) % 1 * size;
    const w = 2 + (i % 6);
    const h = 18 + (i % 45);
    const shade = 25 + (i % 35);
    ctx.fillStyle = `rgb(${shade + 18}, ${shade + 7}, ${shade})`;
    ctx.fillRect(x, y, w, h);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 6);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createWoodPlankTexture(baseHex = '#6c1f1c', size = 256) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = baseHex;
  ctx.fillRect(0, 0, size, size);

  const planks = 8;
  const plankH = size / planks;
  for (let i = 0; i < planks; i++) {
    const y = i * plankH;
    // Slight brightness variation per plank
    ctx.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,0.035)' : 'rgba(0,0,0,0.06)';
    ctx.fillRect(0, y, size, plankH);
    // Plank seam
    ctx.fillStyle = 'rgba(0,0,0,0.42)';
    ctx.fillRect(0, y, size, 2);
    // Subtle wood grain
    for (let g = 0; g < 16; g++) {
      ctx.fillStyle = g % 2 === 0 ? 'rgba(0,0,0,0.07)' : 'rgba(255,230,210,0.03)';
      ctx.fillRect(0, y + 3 + (g / 16) * (plankH - 4), size, 1);
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 2);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// High-detail spruce pine branchlet alpha+albedo texture for realistic pine needle clusters
export function createPineSprigTexture(size = 256) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, size, size);

  // Central woody stem
  ctx.strokeStyle = '#3b2b1d';
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(size * 0.5, size * 0.96);
  ctx.quadraticCurveTo(size * 0.49, size * 0.5, size * 0.5, size * 0.08);
  ctx.stroke();

  // Helper to draw dense realistic pine needles along a twig
  function drawTwig(x0, y0, x1, y1, needleCount, maxLen) {
    const dx = x1 - x0;
    const dy = y1 - y0;
    const angle = Math.atan2(dy, dx);

    ctx.strokeStyle = '#3f2e1e';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.stroke();

    for (let i = 0; i < needleCount; i++) {
      const t = i / needleCount;
      const px = x0 + dx * t;
      const py = y0 + dy * t;
      const taper = Math.sin(t * Math.PI * 0.85 + 0.15);
      const len = maxLen * (0.45 + 0.55 * taper);

      for (const side of [-1, 1]) {
        const spread = side * (0.52 + ((i * 37) % 10) * 0.032);
        const a = angle + spread;
        const nx = px + Math.cos(a) * len;
        const ny = py + Math.sin(a) * len;

        // Deep Nordic spruce greens with subtle sunlit/frosted tips
        const tipShift = ((i * 19 + (side > 0 ? 7 : 0)) % 24);
        const r = 16 + Math.floor(tipShift * 0.8);
        const g = 54 + tipShift;
        const b = 34 + Math.floor(tipShift * 0.7);
        ctx.strokeStyle = `rgb(${r},${g},${b})`;
        ctx.lineWidth = 2.0;
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(nx, ny);
        ctx.stroke();
      }
    }
  }

  // Main central shoot + 6 lush side shoots
  drawTwig(size * 0.5, size * 0.92, size * 0.5, size * 0.07, 46, size * 0.15);
  drawTwig(size * 0.5, size * 0.82, size * 0.16, size * 0.56, 26, size * 0.12);
  drawTwig(size * 0.5, size * 0.82, size * 0.84, size * 0.56, 26, size * 0.12);
  drawTwig(size * 0.5, size * 0.62, size * 0.14, size * 0.34, 24, size * 0.11);
  drawTwig(size * 0.5, size * 0.62, size * 0.86, size * 0.34, 24, size * 0.11);
  drawTwig(size * 0.5, size * 0.42, size * 0.24, size * 0.17, 18, size * 0.095);
  drawTwig(size * 0.5, size * 0.42, size * 0.76, size * 0.17, 18, size * 0.095);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

// Wide feathery Norway Spruce bough fan texture with subtle frost tips for realistic non-low-poly forest trees
export function createForestBoughTexture(size = 256) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, size, size);

  function drawFeatheredBranch(x0, y0, x1, y1, count, needleLen, snowChance) {
    const dx = x1 - x0;
    const dy = y1 - y0;
    const ang = Math.atan2(dy, dx);

    ctx.strokeStyle = '#2d2016';
    ctx.lineWidth = 2.6;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.stroke();

    for (let i = 0; i < count; i++) {
      const t = i / count;
      const px = x0 + dx * t;
      const py = y0 + dy * t;
      const env = Math.sin(t * Math.PI * 0.88 + 0.12);
      const len = needleLen * (0.4 + 0.6 * env);

      for (const side of [-1, 1]) {
        const a = ang + side * (0.58 + ((i * 29) % 9) * 0.035);
        const nx = px + Math.cos(a) * len;
        const ny = py + Math.sin(a) * len;

        const v = (i * 17 + (side > 0 ? 11 : 0)) % 22;
        const isFrosted = snowChance > 0 && t > 0.52 && ((i * 31 + (side > 0 ? 5 : 0)) % 100) < snowChance;
        if (isFrosted) {
          ctx.strokeStyle = `rgb(${175 + v}, ${190 + v}, ${205 + Math.min(20, v)})`;
          ctx.lineWidth = 2.2;
        } else {
          ctx.strokeStyle = `rgb(${15 + Math.floor(v * 0.6)}, ${44 + v}, ${28 + Math.floor(v * 0.55)})`;
          ctx.lineWidth = 2.4;
        }
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(nx, ny);
        ctx.stroke();
      }
    }
  }

  // Main central spruce bough + lush fan of layered lateral shoots
  drawFeatheredBranch(size * 0.5, size * 0.94, size * 0.5, size * 0.06, 48, size * 0.145, 16);
  drawFeatheredBranch(size * 0.5, size * 0.86, size * 0.1, size * 0.64, 30, size * 0.115, 10);
  drawFeatheredBranch(size * 0.5, size * 0.86, size * 0.9, size * 0.64, 30, size * 0.115, 10);
  drawFeatheredBranch(size * 0.5, size * 0.68, size * 0.08, size * 0.42, 28, size * 0.11, 14);
  drawFeatheredBranch(size * 0.5, size * 0.68, size * 0.92, size * 0.42, 28, size * 0.11, 14);
  drawFeatheredBranch(size * 0.5, size * 0.48, size * 0.16, size * 0.24, 24, size * 0.1, 20);
  drawFeatheredBranch(size * 0.5, size * 0.48, size * 0.84, size * 0.24, 24, size * 0.1, 20);
  drawFeatheredBranch(size * 0.5, size * 0.28, size * 0.28, size * 0.11, 16, size * 0.085, 24);
  drawFeatheredBranch(size * 0.5, size * 0.28, size * 0.72, size * 0.11, 16, size * 0.085, 24);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

// Full-height rich Norway Spruce silhouette texture for dense mid-to-far taiga forest carpet (crossed cards)
export function createFullSpruceCardTexture(size = 256) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, size, size);

  // Subtle dark bark trunk in lower half
  ctx.fillStyle = '#261a12';
  ctx.fillRect(size * 0.482, size * 0.62, size * 0.036, size * 0.36);

  // Draw 18 overlapping feathery drooping Norway spruce bough whorls from top to bottom
  const tiers = 19;
  for (let t = 0; t < tiers; t++) {
    const f = t / (tiers - 1); // 0 = tip, 1 = bottom skirt
    const cy = size * (0.06 + f * 0.84);
    const halfSpan = size * (0.04 + Math.pow(f, 0.85) * 0.41) * (0.88 + ((t * 17) % 7) * 0.035);
    const boughCount = Math.max(5, Math.round(7 + f * 16));

    for (let b = 0; b < boughCount; b++) {
      const u = (b / (boughCount - 1)) * 2 - 1; // -1..1
      const droop = Math.abs(u) * size * (0.035 + f * 0.055);
      const tx = size * 0.5 + u * halfSpan;
      const ty = cy + droop + (((t * 13 + b * 29) % 11) - 5) * 1.1;

      const shade = ((t * 19 + b * 7) % 24);
      const r = 14 + Math.floor(shade * 0.5);
      const g = 38 + Math.floor((1 - f * 0.35) * 18) + shade;
      const bl = 26 + Math.floor(shade * 0.55);

      ctx.strokeStyle = `rgb(${r},${g},${bl})`;
      ctx.lineWidth = 3.2 + (1 - Math.abs(u)) * 2.4;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(size * 0.5, cy - size * 0.015);
      ctx.quadraticCurveTo(size * 0.5 + u * halfSpan * 0.52, cy + droop * 0.3, tx, ty);
      ctx.stroke();

      // Delicate feathery needle fringes along each bough
      for (let k = 1; k <= 3; k++) {
        const s = k / 3.5;
        const bx = size * 0.5 + u * halfSpan * s;
        const by = cy + droop * s;
        ctx.strokeStyle = `rgb(${r + 5},${g + 10},${bl + 6})`;
        ctx.lineWidth = 1.9;
        ctx.beginPath();
        ctx.moveTo(bx, by);
        ctx.lineTo(bx + (u >= 0 ? 1 : -1) * 7, by + 6);
        ctx.stroke();
      }
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

// Soft painterly Nordic meadow grass & wild sedge clump texture (replaces stark spiky geometric sticks!)
export function createGrassClumpTexture(size = 256) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, size, size);

  // Soft mossy cushion base so clumps merge gently into meadow terrain & snow
  const baseGrad = ctx.createRadialGradient(size * 0.5, size * 0.92, size * 0.05, size * 0.5, size * 0.88, size * 0.44);
  baseGrad.addColorStop(0, 'rgba(42, 70, 44, 0.85)');
  baseGrad.addColorStop(0.6, 'rgba(48, 76, 46, 0.42)');
  baseGrad.addColorStop(1, 'rgba(48, 76, 46, 0)');
  ctx.fillStyle = baseGrad;
  ctx.fillRect(0, size * 0.52, size, size * 0.48);

  // Draw 28 graceful arching wild grass blades in a natural organic fan
  const blades = 28;
  for (let i = 0; i < blades; i++) {
    const u = (i / (blades - 1)) * 2 - 1; // -1..1
    const seed = ((Math.sin(i * 19.37 + 2.1) * 43758.5453) % 1 + 1) % 1;
    const baseX = size * (0.5 + u * 0.24 + (seed - 0.5) * 0.06);
    const baseY = size * 0.96;
    const h = size * (0.48 + (1.0 - Math.abs(u) * 0.55) * 0.34 + seed * 0.14);
    const archX = u * size * (0.28 + seed * 0.14);
    const tipX = baseX + archX;
    const tipY = baseY - h;
    const ctrlX = baseX + archX * 0.35;
    const ctrlY = baseY - h * 0.65;

    const g = ctx.createLinearGradient(baseX, baseY, tipX, tipY);
    const tone = Math.floor(seed * 24);
    g.addColorStop(0.0, `rgba(${34 + tone}, ${60 + tone}, ${36 + Math.floor(tone * 0.7)}, 0.95)`);
    g.addColorStop(0.6, `rgba(${62 + tone}, ${96 + tone}, ${54 + Math.floor(tone * 0.8)}, 0.92)`);
    g.addColorStop(1.0, `rgba(${104 + tone}, ${126 + tone}, ${86 + tone}, 0.72)`);

    ctx.strokeStyle = g;
    ctx.lineWidth = 4.2 + (1 - Math.abs(u)) * 2.4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(baseX, baseY);
    ctx.quadraticCurveTo(ctrlX, ctrlY, tipX, tipY);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

// Pre-baked Seamless 512x512 RGBA Terrain Detail Texture (runs ONCE at startup!)
// Eliminates ~28 per-pixel FBM/Ridged noise loops every frame in terrain.js -> massive GPU speedup on mobile & desktop!
// Channels: R = Alpine Ridged Crags, G = Fine Granite Strata/Crevices, B = Organic Snow Melt Pattern, A = Micro Surface Grain
export function createBakedTerrainDetailTexture(size = 256) {
  const data = new Uint8Array(size * size * 4);

  // Tileable periodic value noise helper
  const hash = (ix, iy, period, seed) => {
    const x = ((ix % period) + period) % period;
    const y = ((iy % period) + period) % period;
    const n = Math.sin(x * 127.1 + y * 311.7 + seed * 74.7) * 43758.5453123;
    return n - Math.floor(n);
  };

  const tileNoise = (u, v, freq, seed) => {
    const x = u * freq;
    const y = v * freq;
    const ix = Math.floor(x);
    const iy = Math.floor(y);
    const fx = x - ix;
    const fy = y - iy;
    const sx = fx * fx * (3 - 2 * fx);
    const sy = fy * fy * (3 - 2 * fy);

    const a = hash(ix, iy, freq, seed);
    const b = hash(ix + 1, iy, freq, seed);
    const c = hash(ix, iy + 1, freq, seed);
    const d = hash(ix + 1, iy + 1, freq, seed);
    return (a + (b - a) * sx) + ((c + (d - c) * sx) - (a + (b - a) * sx)) * sy;
  };

  const tileFbm = (u, v, baseFreq, octaves, seed) => {
    let sum = 0;
    let amp = 0.5;
    let norm = 0;
    let f = baseFreq;
    for (let o = 0; o < octaves; o++) {
      sum += amp * tileNoise(u, v, f, seed + o * 13.7);
      norm += amp;
      f *= 2;
      amp *= 0.5;
    }
    return sum / norm;
  };

  const tileRidged = (u, v, baseFreq, octaves, seed) => {
    let sum = 0;
    let amp = 0.55;
    let norm = 0;
    let f = baseFreq;
    for (let o = 0; o < octaves; o++) {
      const n = 1.0 - Math.abs(tileNoise(u, v, f, seed + o * 19.3) * 2.0 - 1.0);
      sum += n * n * amp;
      norm += amp;
      f *= 2;
      amp *= 0.5;
    }
    return sum / norm;
  };

  for (let y = 0; y < size; y++) {
    const v = y / size;
    for (let x = 0; x < size; x++) {
      const u = x / size;
      const r = tileRidged(u, v, 6, 4, 1.0);     // R: Alpine ridged crags & ribs
      const g = tileRidged(u, v, 14, 3, 27.3);   // G: Fine granite crevices & rock relief
      const b = tileFbm(u, v, 5, 4, 53.1);       // B: Organic snow melt & frost pattern
      const a = tileFbm(u, v, 24, 2, 91.7);      // A: High-frequency micro grain & snow sparkle

      const idx = (y * size + x) * 4;
      data[idx] = Math.min(255, Math.max(0, Math.round(r * 255)));
      data[idx + 1] = Math.min(255, Math.max(0, Math.round(g * 255)));
      data[idx + 2] = Math.min(255, Math.max(0, Math.round(b * 255)));
      data[idx + 3] = Math.min(255, Math.max(0, Math.round(a * 255)));
    }
  }

  const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.generateMipmaps = true;
  tex.needsUpdate = true;
  return tex;
}

export function createVelvetNormalBump(size = 128) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const img = ctx.createImageData(size, size);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = 115 + ((Math.sin(i * 12.9898) * 43758.5453 % 1 + 1) % 1) * 40;
    img.data[i] = v;
    img.data[i + 1] = v;
    img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(4, 4);
  return tex;
}

// Cached Seamless 4-Channel Pre-Baked Noise LUT Texture (replaces 20-30 per-pixel FBM loops in Sky, Aurora & Water!)
// R: Smooth low-freq noise | G: 4-octave smooth FBM | B: 3-octave mid FBM | A: High-freq detail noise
let _sharedNoiseLUT = null;
export function getSharedNoiseLUTTexture(size = 256) {
  if (_sharedNoiseLUT) return _sharedNoiseLUT;

  const data = new Uint8Array(size * size * 4);
  const hash = (ix, iy, period, seed) => {
    const wx = ((ix % period) + period) % period;
    const wy = ((iy % period) + period) % period;
    const n = Math.sin(wx * 127.1 + wy * 311.7 + seed * 74.7) * 43758.5453123;
    return n - Math.floor(n);
  };

  const tileNoise = (u, v, freq, seed) => {
    const x = u * freq;
    const y = v * freq;
    const ix = Math.floor(x);
    const iy = Math.floor(y);
    const fx = x - ix;
    const fy = y - iy;
    const sx = fx * fx * (3 - 2 * fx);
    const sy = fy * fy * (3 - 2 * fy);
    const a = hash(ix, iy, freq, seed);
    const b = hash(ix + 1, iy, freq, seed);
    const c = hash(ix, iy + 1, freq, seed);
    const d = hash(ix + 1, iy + 1, freq, seed);
    return (a + (b - a) * sx) + ((c + (d - c) * sx) - (a + (b - a) * sx)) * sy;
  };

  const tileFbm = (u, v, baseFreq, octaves, seed) => {
    let sum = 0;
    let amp = 0.5;
    let norm = 0;
    let f = baseFreq;
    for (let o = 0; o < octaves; o++) {
      sum += amp * tileNoise(u, v, f, seed + o * 17.3);
      norm += amp;
      f *= 2;
      amp *= 0.5;
    }
    return sum / norm;
  };

  for (let y = 0; y < size; y++) {
    const v = y / size;
    for (let x = 0; x < size; x++) {
      const u = x / size;
      const r = tileNoise(u, v, 4, 3.1);
      const g = tileFbm(u, v, 4, 4, 19.7);
      const b = tileFbm(u, v, 8, 3, 47.3);
      const a = tileNoise(u, v, 20, 83.9);

      const idx = (y * size + x) * 4;
      data[idx] = Math.min(255, Math.max(0, Math.round(r * 255)));
      data[idx + 1] = Math.min(255, Math.max(0, Math.round(g * 255)));
      data[idx + 2] = Math.min(255, Math.max(0, Math.round(b * 255)));
      data[idx + 3] = Math.min(255, Math.max(0, Math.round(a * 255)));
    }
  }

  const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearFilter;
  tex.generateMipmaps = false;
  tex.needsUpdate = true;
  _sharedNoiseLUT = tex;
  return tex;
}

// Pre-Baked Seamless Panoramic Distant Nordic Spruce Treeline Strip Texture (1024x256)
// Paints 3 overlapping depth layers of dense Scandinavian conifers so distant mountain foothills look lush at ~0 GPU cost!
export function createPanoramicTreelineTexture(width = 1024, height = 256) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, width, height);

  let seed = 884217;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };

  // Helper to paint one realistic Norway spruce at wrapped x (draws wrap copies near edges for seamless tiling!)
  const paintSpruce = (cx, baseY, treeH, maxW, depthLayer) => {
    const drawAt = (ox) => {
      const tipY = baseY - treeH;

      // Subtle trunk
      ctx.strokeStyle = depthLayer === 0 ? '#121918' : '#211c17';
      ctx.lineWidth = Math.max(1.5, maxW * 0.08);
      ctx.beginPath();
      ctx.moveTo(ox, baseY);
      ctx.lineTo(ox, tipY + treeH * 0.25);
      ctx.stroke();

      const tiers = depthLayer === 2 ? 12 : 10;
      for (let t = 0; t < tiers; t++) {
        const frac = t / (tiers - 1); // 0 = top, 1 = bottom
        const y = tipY + frac * treeH * 0.92;
        const w = maxW * (0.14 + Math.pow(frac, 0.86) * 0.92);
        const droop = treeH * (0.04 + frac * 0.075);

        const hue = 148 + (rand() - 0.5) * 16;
        const sat = depthLayer === 0 ? 22 : depthLayer === 1 ? 30 : 34;
        const lum = (depthLayer === 0 ? 11 : depthLayer === 1 ? 16 : 21) + (1 - frac) * 5;
        ctx.fillStyle = `hsl(${hue}, ${sat}%, ${lum}%)`;

        // Feathered drooping conifer bough tier
        ctx.beginPath();
        ctx.moveTo(ox, y - droop * 0.6);
        ctx.quadraticCurveTo(ox + w * 0.52, y + droop * 0.2, ox + w, y + droop);
        ctx.quadraticCurveTo(ox + w * 0.45, y + droop * 1.15, ox, y + droop * 0.72);
        ctx.quadraticCurveTo(ox - w * 0.45, y + droop * 1.15, ox - w, y + droop);
        ctx.quadraticCurveTo(ox - w * 0.52, y + droop * 0.2, ox, y - droop * 0.6);
        ctx.closePath();
        ctx.fill();

        // Delicate pine branch notches & snow highlight on upper front boughs
        if (depthLayer >= 1 && frac < 0.75) {
          ctx.fillStyle = `rgba(182, 206, 224, ${depthLayer === 2 ? 0.2 : 0.12})`;
          ctx.beginPath();
          ctx.moveTo(ox, y - droop * 0.5);
          ctx.lineTo(ox + w * 0.72, y + droop * 0.42);
          ctx.lineTo(ox, y + droop * 0.2);
          ctx.lineTo(ox - w * 0.72, y + droop * 0.42);
          ctx.closePath();
          ctx.fill();
        }
      }

      // Crisp pointed spruce leader tip
      ctx.strokeStyle = depthLayer === 0 ? '#173026' : '#254a39';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(ox, tipY - 4);
      ctx.lineTo(ox, tipY + treeH * 0.14);
      ctx.stroke();
    };

    drawAt(cx);
    if (cx < maxW * 1.4) drawAt(cx + width);
    if (cx > width - maxW * 1.4) drawAt(cx - width);
  };

  // Layer 0 (deep dense forest backdrop sealing gaps)
  const backCount = 34;
  for (let i = 0; i < backCount; i++) {
    const cx = ((i + rand() * 0.75) / backCount) * width;
    const h = height * (0.58 + rand() * 0.34);
    const w = 22 + rand() * 14;
    paintSpruce(cx, height + 8, h, w, 0);
  }

  // Layer 1 (mid lush overlapping conifers)
  const midCount = 30;
  for (let i = 0; i < midCount; i++) {
    const cx = ((i + rand() * 0.8) / midCount) * width;
    const h = height * (0.48 + rand() * 0.42);
    const w = 24 + rand() * 16;
    paintSpruce(cx, height + 10, h, w, 1);
  }

  // Layer 2 (foreground crisp spruce silhouettes)
  const frontCount = 24;
  for (let i = 0; i < frontCount; i++) {
    const cx = ((i + rand() * 0.85) / frontCount) * width;
    const h = height * (0.42 + rand() * 0.45);
    const w = 24 + rand() * 15;
    paintSpruce(cx, height + 12, h, w, 2);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.needsUpdate = true;
  return tex;
}

// Pre-Baked Soft Radial Contact Shadow Disc (for underneath Hero Christmas Tree & Gifts)
export function createTreeContactShadowTexture(size = 256) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const c = size / 2;
  const grad = ctx.createRadialGradient(c, c, size * 0.04, c, c, c);
  grad.addColorStop(0.0, 'rgba(6, 12, 24, 0.56)');
  grad.addColorStop(0.36, 'rgba(8, 16, 30, 0.38)');
  grad.addColorStop(0.68, 'rgba(10, 18, 34, 0.16)');
  grad.addColorStop(1.0, 'rgba(10, 18, 34, 0.0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}
