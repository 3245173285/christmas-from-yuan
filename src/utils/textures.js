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

export function createSnowflakeTexture(size = 128) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const c = size / 2;
  ctx.clearRect(0, 0, size, size);

  // Soft outer winter bokeh halo so large foreground snowflakes feel dreamy and photographic
  const grad = ctx.createRadialGradient(c, c, 0, c, c, c);
  grad.addColorStop(0.0, 'rgba(255,255,255,0.96)');
  grad.addColorStop(0.32, 'rgba(240,248,255,0.72)');
  grad.addColorStop(0.68, 'rgba(218,236,255,0.22)');
  grad.addColorStop(1.0, 'rgba(255,255,255,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  // Delicate 6-pointed crystalline dendritic arms visible on larger flakes
  ctx.save();
  ctx.translate(c, c);
  ctx.strokeStyle = 'rgba(255,255,255,0.88)';
  ctx.lineCap = 'round';
  for (let i = 0; i < 6; i++) {
    ctx.rotate(Math.PI / 3);
    ctx.lineWidth = size * 0.026;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, -c * 0.78);
    ctx.stroke();

    // Fine crystalline side branches
    ctx.lineWidth = size * 0.017;
    for (const frac of [0.36, 0.58]) {
      const y = -c * frac;
      const bLen = c * (0.26 - frac * 0.14);
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(-bLen * 0.75, y - bLen * 0.65);
      ctx.moveTo(0, y);
      ctx.lineTo(bLen * 0.75, y - bLen * 0.65);
      ctx.stroke();
    }
  }
  ctx.restore();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
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
