// Deterministic Seeded Gradient Noise & Wide Open Nordic Plain + Eroded Alpine Range + Coastal Village Layout

const PERM = new Uint8Array(512);
const GRAD2 = [
  [1, 1], [-1, 1], [1, -1], [-1, -1],
  [1, 0], [-1, 0], [0, 1], [0, -1],
  [0.7071, 0.7071], [-0.7071, 0.7071], [0.7071, -0.7071], [-0.7071, -0.7071]
];

(function seedPerm(seed = 42197) {
  const p = new Uint8Array(256);
  for (let i = 0; i < 256; i++) p[i] = i;
  let s = seed >>> 0;
  for (let i = 255; i > 0; i--) {
    s = (s * 1664525 + 1013904223) >>> 0;
    const j = s % (i + 1);
    const tmp = p[i];
    p[i] = p[j];
    p[j] = tmp;
  }
  for (let i = 0; i < 512; i++) PERM[i] = p[i & 255];
})();

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function fade(t) {
  return t * t * t * (t * (t * 6 - 15) + 10);
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

export function smoothstep(edge0, edge1, x) {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

export function noise2D(x, y) {
  const X = Math.floor(x) & 255;
  const Y = Math.floor(y) & 255;
  const xf = x - Math.floor(x);
  const yf = y - Math.floor(y);
  const u = fade(xf);
  const v = fade(yf);

  const aa = PERM[PERM[X] + Y] % 12;
  const ab = PERM[PERM[X] + Y + 1] % 12;
  const ba = PERM[PERM[X + 1] + Y] % 12;
  const bb = PERM[PERM[X + 1] + Y + 1] % 12;

  const gAA = GRAD2[aa];
  const gBA = GRAD2[ba];
  const gAB = GRAD2[ab];
  const gBB = GRAD2[bb];

  const n00 = gAA[0] * xf + gAA[1] * yf;
  const n10 = gBA[0] * (xf - 1) + gBA[1] * yf;
  const n01 = gAB[0] * xf + gAB[1] * (yf - 1);
  const n11 = gBB[0] * (xf - 1) + gBB[1] * (yf - 1);

  return lerp(lerp(n00, n10, u), lerp(n01, n11, u), v);
}

export function fbm2D(x, y, octaves = 5, lacunarity = 2.04, gain = 0.5) {
  let sum = 0;
  let amp = 0.5;
  let freq = 1.0;
  let norm = 0;
  for (let i = 0; i < octaves; i++) {
    sum += amp * noise2D(x * freq, y * freq);
    norm += amp;
    freq *= lacunarity;
    amp *= gain;
  }
  return sum / norm;
}

export function ridged2D(x, y, octaves = 5, lacunarity = 2.08, gain = 0.52) {
  let sum = 0;
  let amp = 0.55;
  let freq = 1.0;
  let weight = 1.0;
  let norm = 0;
  for (let i = 0; i < octaves; i++) {
    let n = 1.0 - Math.abs(noise2D(x * freq, y * freq));
    n = n * n * weight;
    weight = Math.max(0.18, Math.min(1.0, n * 1.75));
    sum += n * amp;
    norm += amp;
    freq *= lacunarity;
    amp *= gain;
  }
  return sum / norm;
}

export const WATER_LEVEL = -1.65;

// Gentle winding meadow path from foreground past the tree toward the lakeshore
export function getPathCenterX(z) {
  return Math.sin(z * 0.042 + 0.6) * 8.5 + Math.cos(z * 0.018) * 3.5 + 5.2;
}

export function getPathFactor(x, z) {
  if (z < -48 || z > 75) return 0;
  const cx = getPathCenterX(z);
  const dist = Math.abs(x - cx);
  const distTree = Math.hypot(x, z);
  const clearFade = smoothstep(5.8, 10.5, distTree);
  const zFade = smoothstep(-48, -36, z) * (1.0 - smoothstep(60, 75, z));
  return (1.0 - smoothstep(1.25, 3.2, dist)) * clearFade * zFade;
}

// Picturesque, Richly Detailed Norwegian Fjord Town (20 organically oriented buildings along a winding harbor & hillside!)
// Buildings face the harbor street, sideways along lanes, and obliquely around the village square — NEVER all facing the tree!
export const CABIN_SITES = [
  // West Waterfront Promenade & Harbor Cluster (organic harbor angles & sideways gables)
  { x: -74, z: -124, rotY: 1.32, type: 'boathouse', color: 'ochre', scale: 1.0, padH: 0.7 },
  { x: -62, z: -119, rotY: -0.58, type: 'townhouse', color: 'red', scale: 1.06, padH: 1.05 },
  { x: -51, z: -115, rotY: 0.92, type: 'rorbu_pier', color: 'red', scale: 1.08, padH: 0.55 },
  { x: -39, z: -119, rotY: -1.18, type: 'townhouse', color: 'ochre', scale: 1.02, padH: 1.2 },
  { x: -28, z: -124, rotY: 0.68, type: 'cottage', color: 'slate', scale: 0.98, padH: 1.75 },

  // West Hillside Terrace & Landmark Bell-Tower Church Square (gracefully elevated overlooking the fjord!)
  { x: -58, z: -133, rotY: 1.48, type: 'grand_lodge', color: 'brown', scale: 1.08, padH: 3.2 },
  { x: -43, z: -132, rotY: 0.22, type: 'village_church', color: 'ivory', scale: 1.32, padH: 4.2 },
  { x: -29, z: -138, rotY: -1.36, type: 'townhouse', color: 'red', scale: 1.04, padH: 3.7 },
  { x: -68, z: -140, rotY: 0.84, type: 'aframe', color: 'charred', scale: 1.08, padH: 3.8 },
  { x: -49, z: -148, rotY: 1.62, type: 'cottage', color: 'ochre', scale: 0.96, padH: 4.8 },

  // East Harbor Quay & Seaside Town Row (natural coastal street orientation, varied heights & warm colors)
  { x: 24, z: -134, rotY: -0.82, type: 'rorbu_pier', color: 'red', scale: 1.05, padH: 0.55 },
  { x: 36, z: -126, rotY: 1.15, type: 'townhouse', color: 'ochre', scale: 1.08, padH: 1.35 },
  { x: 47, z: -121, rotY: -0.95, type: 'grand_lodge', color: 'brown', scale: 1.14, padH: 1.85 },
  { x: 59, z: -118, rotY: 0.42, type: 'townhouse', color: 'slate', scale: 1.04, padH: 1.2 },
  { x: 71, z: -121, rotY: -1.42, type: 'boathouse', color: 'red', scale: 1.0, padH: 0.8 },

  // East Upper Village Terrace (cozy layered alpine neighborhood tucked against the pine forest)
  { x: 31, z: -146, rotY: 1.42, type: 'cottage', color: 'red', scale: 1.0, padH: 3.6 },
  { x: 44, z: -139, rotY: -0.18, type: 'aframe', color: 'charred', scale: 1.08, padH: 3.8 },
  { x: 56, z: -134, rotY: -1.25, type: 'townhouse', color: 'ochre', scale: 1.02, padH: 3.4 },
  { x: 68, z: -133, rotY: 1.12, type: 'grand_lodge', color: 'red', scale: 0.98, padH: 3.2 },
  { x: 80, z: -129, rotY: -0.78, type: 'cottage', color: 'brown', scale: 0.96, padH: 2.6 }
];

// Lake basin mask [0..1] for terrain carving and smooth water depth
export function getLakeMask(x, z) {
  const warpX = x + fbm2D(x * 0.008 + 2.1, z * 0.008 - 1.3, 3) * 28.0;
  const warpZ = z + fbm2D(x * 0.009 - 5.4, z * 0.009 + 3.8, 3) * 20.0;

  // Serene wide glacial lake in front of the coastal village
  const dx = (warpX + 2.0) / 116.0;
  const dz = (warpZ + 96.0) / 48.0;
  const mainDist = Math.hypot(dx, dz);

  // Gentle fjord inlet curving smoothly toward the central mountain valley
  const inletCenter = -4.0 + Math.sin(z * 0.014) * 18.0;
  const inletDist = Math.hypot((warpX - inletCenter) / 34.0, (warpZ + 148.0) / 56.0);
  const combined = Math.min(mainDist, inletDist);

  return 1.0 - smoothstep(0.56, 1.08, combined);
}

// Master procedural terrain elevation at world (x, z)
// Wide open meadow plain -> serene glacial lake -> terraced coastal village foothills -> detailed eroded snow mountain range
export function getTerrainHeight(x, z) {
  const r = Math.hypot(x, z);

  // 1. Wide open gently undulating Nordic meadow plain (160m+ radius)
  const broadRoll = fbm2D(x * 0.0075 + 1.4, z * 0.0075 - 2.3, 4) * 3.5;
  const mediumRoll = fbm2D(x * 0.02 + 5.7, z * 0.02 + 1.1, 3) * 1.05;
  const microRoll = fbm2D(x * 0.062 - 3.2, z * 0.062 + 4.8, 2) * 0.2;

  const treeClear = smoothstep(4.5, 18.0, r);
  let h = (broadRoll + mediumRoll + microRoll) * treeClear;

  // Gentle outer plain undulation far from center
  const softOuterHills = smoothstep(105, 240, r) * (0.5 + 0.5 * fbm2D(x * 0.0055, z * 0.0055, 3)) * 13.0;
  h += softOuterHills;

  // 2. Smoothly carve the glacial lake basin
  const lakeMask = getLakeMask(x, z);
  const lakeFloor = WATER_LEVEL - 3.6 + fbm2D(x * 0.03, z * 0.03, 2) * 0.65;
  h = lerp(h, lakeFloor, lakeMask);

  // Subtle trail depression
  const pathF = getPathFactor(x, z);
  h -= pathF * 0.14;

  // 3. Multi-layered Eroded Scandinavian Mountain Range (rich ridges, saddles, sub-peaks, zero jagged shore cliffs!)
  const distMountainRing = smoothstep(195, 410, Math.hypot(x * 0.78, z + 50));
  const northRangeMask = smoothstep(-185, -395, z);
  const alpinePass = 0.62 + 0.38 * smoothstep(26, 165, Math.abs(x + 6));

  // Primary sweeping alpine massifs + eroded glacial ridges + secondary crag spurs
  const wx = x * 0.0033 + fbm2D(x * 0.0021, z * 0.0021, 3) * 0.58;
  const wz = z * 0.0033 + fbm2D(x * 0.0021 + 9.4, z * 0.0021 - 6.2, 3) * 0.58;
  const primaryRidge = ridged2D(wx, wz, 5, 2.08, 0.52);
  const crossRidge = ridged2D(x * 0.0064 - 4.2, z * 0.0064 + 2.8, 4, 2.12, 0.5);
  const fineSpurs = ridged2D(x * 0.0135 + 1.9, z * 0.0135 - 3.3, 3, 2.1, 0.48);

  const massifShape = Math.pow(primaryRidge, 1.28) * 0.66 + crossRidge * 0.24 + fineSpurs * 0.1;

  // Gentle forested foothill terrace rising naturally behind the village
  const foothillRamp = smoothstep(-135, -245, z) * (0.45 + 0.55 * fbm2D(x * 0.008, z * 0.008, 3)) * 16.0;
  const heroAlpine = massifShape * 134.0 * northRangeMask * alpinePass;
  const surroundRange = massifShape * 66.0 * distMountainRing * (1.0 - northRangeMask * 0.72);

  // Smooth protection so mountains never create abrupt vertical walls next to the water
  const waterProtect = 1.0 - smoothstep(0.02, 0.94, lakeMask);
  h += (foothillRamp + heroAlpine + surroundRange) * waterProtect;

  // 4. Gently terrace earthen pads for our clustered lakeside village buildings
  for (let i = 0; i < CABIN_SITES.length; i++) {
    const c = CABIN_SITES[i];
    const d = Math.hypot(x - c.x, z - c.z);
    if (d < 15.5) {
      const targetH = WATER_LEVEL + c.padH;
      const blend = 1.0 - smoothstep(4.2, 15.0, d);
      h = lerp(h, targetH, blend);
    }
  }

  return h;
}
