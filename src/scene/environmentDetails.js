import * as THREE from 'three';
import {
  CABIN_SITES,
  fbm2D,
  getPathFactor,
  getTerrainHeight,
  mulberry32,
  WATER_LEVEL
} from '../utils/noise.js';
import {
  createBarkTexture,
  createForestBoughTexture,
  createFullSpruceCardTexture,
  createGrassClumpTexture,
  createPanoramicTreelineTexture,
  createSnowflakeTexture,
  createWispyMistRibbonTexture
} from '../utils/textures.js';

// Hybrid 3-Layer Scandinavian Taiga Forest + Live Diurnal Snow/Frost on Grass, Rocks & Spruces
// Layer 1: Near-edge real 3D volumetric multi-frond Norway spruces (optimized 56-tri crowns!)
// Layer 2: Midground lightweight 4-tri crossed spruce cards + evergreen undergrowth
// Layer 3: Pre-baked Panoramic Distant Treeline Texture Bands hugging foothills (hundreds of far pines in 1 tiny draw call!)

// Soft volumetric 3-plane crossed wild-grass clump cushion (lightweight 6-tri clump!)
function createSoftGrassClumpGeometry() {
  const allPos = [];
  const allNorm = [];
  const allUv = [];
  const allIdx = [];
  let vOff = 0;

  const dummy = new THREE.Object3D();
  const v = new THREE.Vector3();

  for (let k = 0; k < 3; k++) {
    const plane = new THREE.PlaneGeometry(0.92, 0.56, 1, 1);
    plane.translate(0, 0.26, 0);

    dummy.rotation.set(0, (k / 3) * Math.PI + 0.25, 0);
    dummy.updateMatrix();

    const p = plane.attributes.position;
    const ua = plane.attributes.uv;
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i).applyMatrix4(dummy.matrix);
      allPos.push(v.x, v.y, v.z);
      allNorm.push(0, 1, 0);
      allUv.push(ua.getX(i), ua.getY(i));
    }

    const idx = plane.index.array;
    for (let i = 0; i < idx.length; i++) allIdx.push(idx[i] + vOff);
    vOff += p.count;
    plane.dispose();
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(allPos, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(allNorm, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(allUv, 2));
  geo.setIndex(allIdx);
  return geo;
}

function createMossySnowRockGeometry() {
  const geo = new THREE.IcosahedronGeometry(1.0, 2);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const n = fbm2D(x * 1.4 + z * 0.9, y * 1.5 - x * 0.6, 3);
    const scale = 0.85 + n * 0.35;
    const fy = y < 0 ? y * 0.62 : y * 0.82;
    pos.setXYZ(i, x * scale, fy * scale, z * scale);
  }
  geo.computeVertexNormals();

  const norm = geo.attributes.normal;
  const cols = new Float32Array(pos.count * 3);
  const rockCol = new THREE.Color('#3a4048');
  const mossCol = new THREE.Color('#38522c');
  const tmp = new THREE.Color();

  for (let i = 0; i < pos.count; i++) {
    const ny = norm.getY(i);
    const px = pos.getX(i);
    const pz = pos.getZ(i);
    const n = fbm2D(px * 2.2 + 1.1, pz * 2.2 - 3.4, 2) * 0.5 + 0.5;
    tmp.copy(rockCol);
    if (ny > 0.2 && ny < 0.8) {
      tmp.lerp(mossCol, n * 0.65);
    }
    cols[i * 3] = tmp.r;
    cols[i * 3 + 1] = tmp.g;
    cols[i * 3 + 2] = tmp.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(cols, 3));
  return geo;
}

// Optimized Realistic Volumetric Multi-Frond Norway Spruce Crown (28 layered radial boughs × 2 tris = 56 tris; 5.7× lighter than 320-tri!)
function createVolumetricSpruceCrownGeometry() {
  const rand = mulberry32(314159);
  const allPos = [];
  const allNorm = [];
  const allUv = [];
  const allIdx = [];
  let vOff = 0;

  const dummy = new THREE.Object3D();
  const v = new THREE.Vector3();
  const n = new THREE.Vector3();
  const normalMatrix = new THREE.Matrix3();

  function appendFrond(width, length, px, py, pz, rx, ry, rz) {
    const plane = new THREE.PlaneGeometry(width, length, 1, 1);
    plane.translate(0, length * 0.48, 0);
    plane.computeVertexNormals();

    dummy.position.set(px, py, pz);
    dummy.rotation.set(rx, ry, rz, 'YXZ');
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    normalMatrix.getNormalMatrix(dummy.matrix);

    const posAttr = plane.attributes.position;
    const normAttr = plane.attributes.normal;
    const uvAttr = plane.attributes.uv;

    for (let i = 0; i < posAttr.count; i++) {
      v.fromBufferAttribute(posAttr, i).applyMatrix4(dummy.matrix);
      n.fromBufferAttribute(normAttr, i).applyMatrix3(normalMatrix).normalize();
      n.y = Math.min(1.0, n.y + 0.46);
      n.normalize();

      allPos.push(v.x, v.y, v.z);
      allNorm.push(n.x, n.y, n.z);
      allUv.push(uvAttr.getX(i), uvAttr.getY(i));
    }

    const idx = plane.index.array;
    for (let i = 0; i < idx.length; i++) allIdx.push(idx[i] + vOff);
    vOff += posAttr.count;
    plane.dispose();
  }

  // Lush full-skirted Norway spruce whorls (wider fronds fill full 3D canopy with 82% fewer triangles!)
  const whorls = [
    { y: 1.05, count: 5, len: 3.35, w: 2.35, pitch: 1.32 },
    { y: 2.55, count: 5, len: 2.95, w: 2.15, pitch: 1.26 },
    { y: 4.1, count: 4, len: 2.55, w: 1.92, pitch: 1.18 },
    { y: 5.65, count: 4, len: 2.1, w: 1.65, pitch: 1.1 },
    { y: 7.15, count: 4, len: 1.62, w: 1.35, pitch: 0.98 },
    { y: 8.55, count: 4, len: 1.16, w: 1.02, pitch: 0.78 },
    { y: 9.7, count: 2, len: 0.85, w: 0.78, pitch: 0.48 }
  ];

  for (let wi = 0; wi < whorls.length; wi++) {
    const wh = whorls[wi];
    const baseAngle = wi * 1.17;
    for (let b = 0; b < wh.count; b++) {
      const angle = baseAngle + (b / wh.count) * Math.PI * 2 + (rand() - 0.5) * 0.34;
      const len = wh.len * (0.88 + rand() * 0.24);
      const w = wh.w * (0.9 + rand() * 0.22);
      const py = wh.y + (rand() - 0.5) * 0.28;
      const pitch = wh.pitch + (rand() - 0.5) * 0.14;
      const roll = (rand() - 0.5) * 0.3;
      appendFrond(w, len, 0, py, 0, pitch, angle, roll);
    }
  }

  // Crossed feathery spire leader at top
  appendFrond(0.84, 1.6, 0, 9.9, 0, 0.06, 0.2, 0);
  appendFrond(0.84, 1.6, 0, 9.9, 0, 0.06, Math.PI * 0.5 + 0.2, 0);

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(allPos, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(allNorm, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(allUv, 2));
  geo.setIndex(allIdx);
  return geo;
}

// Low dense evergreen shrub / young pine bush for forest-edge lushness
function createEvergreenShrubGeometry() {
  const allPos = [];
  const allNorm = [];
  const allUv = [];
  const allIdx = [];
  let vOff = 0;
  const dummy = new THREE.Object3D();
  const v = new THREE.Vector3();
  const n = new THREE.Vector3();
  const nm = new THREE.Matrix3();

  for (let i = 0; i < 6; i++) {
    const plane = new THREE.PlaneGeometry(1.7, 1.55, 1, 1);
    plane.translate(0, 0.72, 0);
    const angle = (i / 6) * Math.PI * 2 + 0.3;
    dummy.position.set(0, 0, 0);
    dummy.rotation.set(0.58 + (i % 2) * 0.22, angle, 0, 'YXZ');
    dummy.updateMatrix();
    nm.getNormalMatrix(dummy.matrix);

    const p = plane.attributes.position;
    const na = plane.attributes.normal;
    const ua = plane.attributes.uv;
    for (let k = 0; k < p.count; k++) {
      v.fromBufferAttribute(p, k).applyMatrix4(dummy.matrix);
      n.fromBufferAttribute(na, k).applyMatrix3(nm).normalize();
      n.y = Math.min(1, n.y + 0.55);
      n.normalize();
      allPos.push(v.x, v.y, v.z);
      allNorm.push(n.x, n.y, n.z);
      allUv.push(ua.getX(k), ua.getY(k));
    }
    const idx = plane.index.array;
    for (let k = 0; k < idx.length; k++) allIdx.push(idx[k] + vOff);
    vOff += p.count;
    plane.dispose();
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(allPos, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(allNorm, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(allUv, 2));
  geo.setIndex(allIdx);
  return geo;
}

// Ultra-fast 2-plane crossed full-spruce card for dense distant taiga hillside carpet (4 tris per tree!)
function createDistantSpruceCardGeometry() {
  const p1 = new THREE.PlaneGeometry(5.8, 12.2);
  p1.translate(0, 5.6, 0);
  const p2 = new THREE.PlaneGeometry(5.8, 12.2);
  p2.translate(0, 5.6, 0);
  p2.rotateY(Math.PI * 0.5);

  const merged = new THREE.BufferGeometry();
  const c1 = p1.attributes.position.count;
  const pos = new Float32Array(c1 * 2 * 3);
  const norm = new Float32Array(c1 * 2 * 3);
  const uv = new Float32Array(c1 * 2 * 2);

  pos.set(p1.attributes.position.array, 0);
  pos.set(p2.attributes.position.array, c1 * 3);
  // Upward-biased soft cylindrical normals so crossed planes light smoothly without harsh dark seams
  for (let i = 0; i < c1 * 2; i++) {
    norm[i * 3] = 0;
    norm[i * 3 + 1] = 0.85;
    norm[i * 3 + 2] = 0.52;
  }
  uv.set(p1.attributes.uv.array, 0);
  uv.set(p2.attributes.uv.array, c1 * 2);

  const idx = new Uint16Array(12);
  idx.set(p1.index.array, 0);
  for (let i = 0; i < 6; i++) idx[6 + i] = p2.index.array[i] + c1;

  merged.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  merged.setAttribute('normal', new THREE.BufferAttribute(norm, 3));
  merged.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  merged.setIndex(new THREE.BufferAttribute(idx, 1));

  p1.dispose();
  p2.dispose();
  return merged;
}

export class EnvironmentDetails {
  constructor(scene, perf) {
    this.scene = scene;
    this.group = new THREE.Group();
    scene.add(this.group);

    this.rand = mulberry32(987651);
    this.isMobile = Boolean(perf.isMobile);
    this.windTime = { value: 0 };
    this.snowCoverUniform = { value: 0.92 };
    this.snowEnabled = true;
    this.snowIntensity = 0.48; // 0.1 = gentle light snow, 0.48 = medium festive snow, 1.0 = heavy Nordic snowfall
    this.maxSnowCount = perf.snowCount;

    this.boughTex = createForestBoughTexture(256);

    this.buildMeadowGrass(perf.grassCount);
    this.buildMossyRocks();
    this.buildHeroVolumetricForest(perf.forestCount);
    this.buildEvergreenUndergrowth(perf.shrubCount || 360);
    this.buildDistantTaigaCarpet(perf.distantForestCount || 1500);
    this.buildPanoramicTreelineBackdrop();
    this.buildAlpineMountainGroves(perf.isMobile ? 48 : 64);
    this.buildValleyMist();
    this.buildSnowfall(perf.snowCount);
    this.buildDistantBirds();
  }

  isTooCloseToTown(x, z, pad = 9.5) {
    for (let i = 0; i < CABIN_SITES.length; i++) {
      const c = CABIN_SITES[i];
      if (Math.hypot(x - c.x, z - c.z) < pad) return true;
    }
    return false;
  }

  buildMeadowGrass(rawCount) {
    // Organic clustered meadow cushions instead of noisy uniform spiky stubble!
    const targetClumps = Math.min(3600, Math.floor(rawCount * 0.2));
    const geo = createSoftGrassClumpGeometry();
    const clumpTex = createGrassClumpTexture(256);

    const mat = new THREE.MeshStandardMaterial({
      map: clumpTex,
      alphaTest: 0.28,
      color: '#ffffff',
      roughness: 0.88,
      metalness: 0.0,
      side: THREE.DoubleSide
    });

    // Traveling Nordic breeze + graceful snow-burial/frosting at night (soft powdery snowdrifts at night, lush green meadow clumps by day!)
    mat.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = this.windTime;
      shader.uniforms.uSnowCover = this.snowCoverUniform;
      shader.vertexShader = shader.vertexShader.replace(
        '#include <common>',
        `#include <common>
         uniform float uTime;
         uniform float uSnowCover;
         varying float vClumpV;
         varying vec2 vWorldXZ;`
      );
      shader.vertexShader = shader.vertexShader.replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
         vec4 instW = instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
         vClumpV = uv.y;
         vWorldXZ = instW.xz;
         // Snow gently settles over grass clumps at night, lowering height so only graceful frosted tips peek through snowdrifts!
         float snowSink = 1.0 - uSnowCover * 0.42;
         transformed.y *= snowSink;
         float hMask = clamp(uv.y * uv.y, 0.0, 1.0);
         float wave = sin(uTime * 1.25 + instW.x * 0.18 + instW.z * 0.15) * 0.11
                    + cos(uTime * 1.95 + instW.x * 0.42 - instW.z * 0.35) * 0.04;
         transformed.x += wave * hMask;
         transformed.z += wave * 0.55 * hMask;`
      );
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <common>',
        `#include <common>
         uniform float uSnowCover;
         varying float vClumpV;
         varying vec2 vWorldXZ;`
      );
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <color_fragment>',
        `#include <color_fragment>
         // Soft organic snow-rime blending across clumps (eliminates harsh black stubble contrast against white night snow!)
         float patchN = fract(sin(dot(floor(vWorldXZ * 0.2), vec2(127.1, 311.7))) * 43758.5453);
         float snowBlend = smoothstep(0.18, 0.92, uSnowCover + (vClumpV - 0.35) * 0.25 + (patchN - 0.5) * 0.18);
         vec3 frostSnow = vec3(0.76, 0.83, 0.91);
         diffuseColor.rgb = mix(diffuseColor.rgb, frostSnow, snowBlend * 0.84);`
      );
    };

    const matrices = [];
    const colors = [];
    const dummy = new THREE.Object3D();
    const colA = new THREE.Color('#7ca379');
    const colB = new THREE.Color('#a4bf96');
    const colWarm = new THREE.Color('#b5b38a');
    const tmp = new THREE.Color();

    let attempts = 0;
    while (matrices.length < targetClumps && attempts < targetClumps * 10) {
      attempts++;
      const angle = this.rand() * Math.PI * 2;
      const radius = 8.4 + Math.pow(this.rand(), 0.72) * 58.0;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius + 3.0;

      if (getPathFactor(x, z) > 0.2) continue;
      if (Math.hypot(x + 8.2, z - 7.2) < 2.8) continue;

      // Cluster grass naturally into sweeping meadow patches & drifts via 2D FBM (never uniform spiky stubble!)
      const patch = fbm2D(x * 0.075 + 2.3, z * 0.075 - 1.4, 3) * 0.5 + 0.5;
      if (patch < 0.42 && this.rand() > 0.25) continue;

      const y = getTerrainHeight(x, z);
      if (y < WATER_LEVEL + 0.7 || y > 9.0) continue;

      dummy.position.set(x, y - 0.05, z);
      dummy.rotation.set(0, this.rand() * Math.PI * 2, 0);
      const sc = (0.78 + this.rand() * 0.95) * (0.75 + patch * 0.55);
      dummy.scale.set(sc * 1.15, sc * (0.75 + this.rand() * 0.4), sc * 1.15);
      dummy.updateMatrix();
      matrices.push(dummy.matrix.clone());

      const n = this.rand();
      tmp.copy(colA).lerp(colB, n);
      if (this.rand() > 0.74) tmp.lerp(colWarm, 0.45);
      colors.push(tmp.r, tmp.g, tmp.b);
    }

    const inst = new THREE.InstancedMesh(geo, mat, matrices.length);
    inst.receiveShadow = true;
    const c = new THREE.Color();
    for (let i = 0; i < matrices.length; i++) {
      inst.setMatrixAt(i, matrices[i]);
      c.setRGB(colors[i * 3], colors[i * 3 + 1], colors[i * 3 + 2]);
      inst.setColorAt(i, c);
    }
    inst.instanceMatrix.needsUpdate = true;
    if (inst.instanceColor) inst.instanceColor.needsUpdate = true;
    this.group.add(inst);
  }

  buildMossyRocks() {
    const rockGeo = createMossySnowRockGeometry();
    const rockMat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.92,
      metalness: 0.04
    });

    // Dynamic snow blanket on rocks responding to diurnal uSnowCover
    rockMat.onBeforeCompile = (shader) => {
      shader.uniforms.uSnowCover = this.snowCoverUniform;
      shader.vertexShader = shader.vertexShader.replace(
        '#include <common>',
        `#include <common>
         varying vec3 vRockWorldNorm;`
      );
      shader.vertexShader = shader.vertexShader.replace(
        '#include <worldpos_vertex>',
        `#include <worldpos_vertex>
         vRockWorldNorm = normalize(mat3(modelMatrix) * mat3(instanceMatrix) * objectNormal);`
      );
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <common>',
        `#include <common>
         uniform float uSnowCover;
         varying vec3 vRockWorldNorm;`
      );
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <color_fragment>',
        `#include <color_fragment>
         float up = clamp(normalize(vRockWorldNorm).y, 0.0, 1.0);
         float snowLine = mix(0.76, 0.34, uSnowCover);
         float rockSnow = smoothstep(snowLine, snowLine + 0.24, up);
         diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.86, 0.90, 0.96), rockSnow * 0.92);`
      );
    };

    const rockCount = 72;
    const matrices = [];
    const dummy = new THREE.Object3D();

    let attempts = 0;
    while (matrices.length < rockCount && attempts < 600) {
      attempts++;
      const angle = this.rand() * Math.PI * 2;
      const dist = 8.5 + Math.pow(this.rand(), 0.85) * 84.0;
      const x = Math.cos(angle) * dist;
      const z = Math.sin(angle) * dist - 6.0;

      if (Math.hypot(x - 2.4, z - 24.5) < 9.5) continue;
      if (Math.hypot(x + 8.2, z - 7.2) < 3.4) continue;
      if (z > 10 && Math.abs(x) < 12) continue;
      if (getPathFactor(x, z) > 0.3) continue;

      const y = getTerrainHeight(x, z);
      if (y < WATER_LEVEL - 0.25 || y > 16.0) continue;

      dummy.position.set(x, y - 0.16, z);
      dummy.rotation.set((this.rand() - 0.5) * 0.3, this.rand() * Math.PI * 2, (this.rand() - 0.5) * 0.3);
      const sx = 0.45 + this.rand() * 1.45;
      const sy = sx * (0.45 + this.rand() * 0.42);
      const sz = sx * (0.72 + this.rand() * 0.48);
      dummy.scale.set(sx, sy, sz);
      dummy.updateMatrix();
      matrices.push(dummy.matrix.clone());
    }

    const inst = new THREE.InstancedMesh(rockGeo, rockMat, matrices.length);
    inst.castShadow = !this.isMobile;
    inst.receiveShadow = true;
    for (let i = 0; i < matrices.length; i++) inst.setMatrixAt(i, matrices[i]);
    inst.instanceMatrix.needsUpdate = true;
    this.group.add(inst);
  }

  // Tier 1: Dense Near-to-Midground Volumetric Multi-Frond Norway Spruce Woods (~1,050 trees!)
  buildHeroVolumetricForest(targetCount) {
    const crownGeo = createVolumetricSpruceCrownGeometry();

    const crownMat = new THREE.MeshStandardMaterial({
      map: this.boughTex,
      alphaTest: 0.33,
      side: THREE.DoubleSide,
      roughness: 0.82,
      metalness: 0.02
    });

    crownMat.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = this.windTime;
      shader.uniforms.uSnowCover = this.snowCoverUniform;
      shader.vertexShader = shader.vertexShader.replace(
        '#include <common>',
        `#include <common>
         uniform float uTime;
         varying float vCrownH;`
      );
      shader.vertexShader = shader.vertexShader.replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
         vec4 instW = instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
         vCrownH = clamp(position.y / 11.0, 0.0, 1.0);
         float sway = sin(uTime * 0.85 + instW.x * 0.08 + instW.z * 0.07) * 0.16 * vCrownH * vCrownH;
         transformed.x += sway;
         transformed.z += sway * 0.6;`
      );
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <common>',
        `#include <common>
         uniform float uSnowCover;
         varying float vCrownH;`
      );
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <color_fragment>',
        `#include <color_fragment>
         // Subtle snow dusting on upper evergreen boughs at night, thawing gently at midday
         float boughFrost = smoothstep(0.25, 0.95, vCrownH) * uSnowCover * 0.26;
         diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.84, 0.89, 0.95), boughFrost);`
      );
    };

    const barkTex = createBarkTexture(128);
    const trunkGeo = new THREE.CylinderGeometry(0.06, 0.28, 10.6, 6);
    trunkGeo.translate(0, 4.1, 0);
    const trunkMat = new THREE.MeshStandardMaterial({
      map: barkTex,
      roughness: 0.94
    });

    // Organic Clustered Woodland Pockets (natural clearings & scenic gaps rather than a uniform fence!)
    const groves = [
      // Left meadow-edge picturesque spruce clusters with breathing room between them
      { cx: -52, cz: -8, rx: 22, rz: 26 },
      { cx: -76, cz: -44, rx: 28, rz: 34 },
      { cx: -96, cz: -96, rx: 32, rz: 38 },
      { cx: -86, cz: -158, rx: 42, rz: 28 },
      // Right meadow-edge picturesque spruce clusters
      { cx: 56, cz: -4, rx: 22, rz: 26 },
      { cx: 82, cz: -42, rx: 28, rz: 34 },
      { cx: 98, cz: -92, rx: 34, rz: 40 },
      { cx: 92, cz: -155, rx: 44, rz: 30 },
      // Lush forested hillside pockets cradling the coastal village (leaving valley sightlines airy)
      { cx: -38, cz: -162, rx: 38, rz: 24 },
      { cx: 2, cz: -172, rx: 30, rz: 20 },
      { cx: 42, cz: -165, rx: 38, rz: 24 },
      // Southern wooded pockets behind the open meadow (natural rhythm on 360° orbit)
      { cx: -58, cz: 54, rx: 32, rz: 28 },
      { cx: 62, cz: 56, rx: 32, rz: 28 },
      { cx: -14, cz: 88, rx: 36, rz: 26 },
      { cx: 34, cz: 94, rx: 32, rz: 24 }
    ];

    const matrices = [];
    const tints = [];
    const dummy = new THREE.Object3D();
    const colA = new THREE.Color('#bad6c8');
    const colB = new THREE.Color('#e6f3ee');
    const colC = new THREE.Color('#8fae9e');
    const colD = new THREE.Color('#9ec0c4'); // Subtle frosty Nordic blue-spruce accent
    const tmpCol = new THREE.Color();

    // First place ~14 picturesque foreground meadow-edge sentinel clusters (1 tall elder + 2-3 young spruces nestled beside it!)
    const sentinelAnchors = [
      [-40, 12], [-44, -26], [-50, -64], [-36, 36],
      [42, 14], [46, -24], [52, -60], [38, 38],
      [-64, 24], [66, 26], [-32, -142], [32, -146]
    ];
    for (const [ax, az] of sentinelAnchors) {
      const members = 3 + Math.floor(this.rand() * 2);
      for (let m = 0; m < members; m++) {
        const isElder = m === 0;
        const oa = this.rand() * Math.PI * 2;
        const od = isElder ? 0 : (3.2 + this.rand() * 5.2);
        const x = ax + Math.cos(oa) * od;
        const z = az + Math.sin(oa) * od;
        if (this.isTooCloseToTown(x, z, 9.2) || getPathFactor(x, z) > 0.12) continue;
        const y = getTerrainHeight(x, z);
        if (y < WATER_LEVEL + 1.0 || y > 18.5) continue;
        const sc = isElder ? (1.32 + this.rand() * 0.42) : (0.58 + this.rand() * 0.45);
        dummy.position.set(x, y - 0.35, z);
        dummy.rotation.set((this.rand() - 0.5) * 0.04, this.rand() * Math.PI * 2, (this.rand() - 0.5) * 0.04);
        dummy.scale.set(sc * 0.96, sc * (1.02 + this.rand() * 0.18), sc * 0.96);
        dummy.updateMatrix();
        matrices.push(dummy.matrix.clone());
        tmpCol.copy(isElder ? colB : (this.rand() > 0.5 ? colD : colA));
        tints.push(tmpCol.r, tmpCol.g, tmpCol.b);
      }
    }

    let attempts = 0;
    while (matrices.length < targetCount && attempts < targetCount * 14) {
      attempts++;
      const g = groves[Math.floor(this.rand() * groves.length)];
      const a = this.rand() * Math.PI * 2;
      // Slightly denser toward cluster cores so pockets read as natural groves with organic gaps between them
      const r = Math.pow(this.rand(), 0.62);
      const x = g.cx + Math.cos(a) * r * g.rx;
      const z = g.cz + Math.sin(a) * r * g.rz;

      // Keep wide central meadow plain & open hero-to-lake/village vista crystal clear
      if (Math.hypot(x, z) < 35.0) continue;
      if (Math.abs(x) < 30.0 && z > -135.0 && z < 46.0) continue;
      if (getPathFactor(x, z) > 0.1) continue;
      if (this.isTooCloseToTown(x, z, 9.2)) continue;

      const y = getTerrainHeight(x, z);
      if (y < WATER_LEVEL + 0.95 || y > 19.5) continue;

      const yDx = getTerrainHeight(x + 2.8, z);
      const yDz = getTerrainHeight(x, z + 2.8);
      const yNx = getTerrainHeight(x - 2.8, z);
      const yNz = getTerrainHeight(x, z - 2.8);
      const slope = Math.max(Math.abs(yDx - y), Math.abs(yDz - y), Math.abs(yNx - y), Math.abs(yNz - y));
      if (slope > 1.55) continue;

      const groundedY = Math.min(y, yDx, yDz, yNx, yNz) - 0.35;
      dummy.position.set(x, groundedY, z);
      dummy.rotation.set(
        (this.rand() - 0.5) * 0.05,
        this.rand() * Math.PI * 2,
        (this.rand() - 0.5) * 0.05
      );
      // Rich age/height distribution: mix of young understory spruces and tall towering elders
      const sc = 0.62 + Math.pow(this.rand(), 0.82) * 1.32;
      dummy.scale.set(sc * (0.86 + this.rand() * 0.28), sc * (0.94 + this.rand() * 0.36), sc * (0.86 + this.rand() * 0.28));
      dummy.updateMatrix();
      matrices.push(dummy.matrix.clone());

      const rRoll = this.rand();
      tmpCol.copy(rRoll < 0.30 ? colA : rRoll < 0.58 ? colB : rRoll < 0.82 ? colC : colD);
      tints.push(tmpCol.r, tmpCol.g, tmpCol.b);
    }

    const crownInst = new THREE.InstancedMesh(crownGeo, crownMat, matrices.length);
    const trunkInst = new THREE.InstancedMesh(trunkGeo, trunkMat, matrices.length);
    // Distant alpha-tested spruce crowns disabled from shadow map (massive FPS gain on mobile & desktop!)
    crownInst.castShadow = false;
    crownInst.receiveShadow = true;

    const c = new THREE.Color();
    for (let i = 0; i < matrices.length; i++) {
      crownInst.setMatrixAt(i, matrices[i]);
      trunkInst.setMatrixAt(i, matrices[i]);
      c.setRGB(tints[i * 3], tints[i * 3 + 1], tints[i * 3 + 2]);
      crownInst.setColorAt(i, c);
    }
    crownInst.instanceMatrix.needsUpdate = true;
    if (crownInst.instanceColor) crownInst.instanceColor.needsUpdate = true;
    trunkInst.instanceMatrix.needsUpdate = true;
    this.group.add(crownInst, trunkInst);
  }

  // Tier 2: Dense Evergreen Shrubs / Forest-Edge Undergrowth (~650 bushes sealing base of forest)
  buildEvergreenUndergrowth(targetCount) {
    const geo = createEvergreenShrubGeometry();
    const mat = new THREE.MeshStandardMaterial({
      map: this.boughTex,
      alphaTest: 0.34,
      side: THREE.DoubleSide,
      roughness: 0.86,
      metalness: 0.02
    });

    mat.onBeforeCompile = (shader) => {
      shader.uniforms.uSnowCover = this.snowCoverUniform;
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <common>',
        `#include <common>
         uniform float uSnowCover;`
      );
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <color_fragment>',
        `#include <color_fragment>
         diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.84, 0.89, 0.95), uSnowCover * 0.32);`
      );
    };

    const matrices = [];
    const dummy = new THREE.Object3D();

    let attempts = 0;
    while (matrices.length < targetCount && attempts < targetCount * 10) {
      attempts++;
      const a = this.rand() * Math.PI * 2;
      const d = 32.0 + Math.pow(this.rand(), 0.78) * 125.0;
      const x = Math.cos(a) * d;
      const z = Math.sin(a) * d - 16.0;

      if (Math.abs(x) < 28.0 && z > -65.0 && z < 44.0) continue;
      if (getPathFactor(x, z) > 0.15) continue;
      if (this.isTooCloseToTown(x, z, 7.5)) continue;

      const y = getTerrainHeight(x, z);
      if (y < WATER_LEVEL + 0.85 || y > 15.0) continue;

      dummy.position.set(x, y - 0.15, z);
      dummy.rotation.set(0, this.rand() * Math.PI * 2, 0);
      const sc = 0.8 + this.rand() * 1.45;
      dummy.scale.set(sc * 1.15, sc * 0.85, sc * 1.15);
      dummy.updateMatrix();
      matrices.push(dummy.matrix.clone());
    }

    const inst = new THREE.InstancedMesh(geo, mat, matrices.length);
    inst.receiveShadow = true;
    for (let i = 0; i < matrices.length; i++) inst.setMatrixAt(i, matrices[i]);
    inst.instanceMatrix.needsUpdate = true;
    this.group.add(inst);
  }

  // Tier 3: Vast Mid-to-Far Taiga Forest Canopy Carpet (~2,500 full-spruce crossed cards across hills & foothills!)
  buildDistantTaigaCarpet(targetCount) {
    const geo = createDistantSpruceCardGeometry();
    const tex = createFullSpruceCardTexture(256);

    const mat = new THREE.MeshStandardMaterial({
      map: tex,
      alphaTest: 0.36,
      side: THREE.DoubleSide,
      roughness: 0.88,
      metalness: 0.0
    });

    mat.onBeforeCompile = (shader) => {
      shader.uniforms.uSnowCover = this.snowCoverUniform;
      shader.vertexShader = shader.vertexShader.replace(
        '#include <common>',
        `#include <common>
         varying float vCardV;`
      );
      shader.vertexShader = shader.vertexShader.replace(
        '#include <uv_vertex>',
        `#include <uv_vertex>
         vCardV = uv.y;`
      );
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <common>',
        `#include <common>
         uniform float uSnowCover;
         varying float vCardV;`
      );
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <color_fragment>',
        `#include <color_fragment>
         // Distant forest canopy catches subtle alpine frost on upper crowns
         float topSnow = smoothstep(0.35, 0.96, vCardV) * (0.14 + uSnowCover * 0.28);
         diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.84, 0.89, 0.96), topSnow);`
      );
    };

    const matrices = [];
    const tints = [];
    const dummy = new THREE.Object3D();
    const colA = new THREE.Color('#b6cfc0');
    const colB = new THREE.Color('#dcebe2');
    const colC = new THREE.Color('#8ea99c');
    const tmpCol = new THREE.Color();

    let attempts = 0;
    while (matrices.length < targetCount && attempts < targetCount * 10) {
      attempts++;
      const a = this.rand() * Math.PI * 2;
      // Mid-to-far individual 4-tri crossed spruce cards bridging smoothly from 68m out to 190m behind the near 3D woods!
      const d = 68.0 + Math.pow(this.rand(), 0.85) * 124.0;
      const x = Math.cos(a) * d;
      const z = Math.sin(a) * d - 28.0;

      if (Math.abs(x) < 32.0 && z > -135.0 && z < 48.0) continue;
      if (this.isTooCloseToTown(x, z, 11.0)) continue;

      const y = getTerrainHeight(x, z);
      // Grows densely across lower foothills and mountain base up to timberline (y <= 27)
      if (y < WATER_LEVEL + 1.15 || y > 27.0) continue;

      const yDx = getTerrainHeight(x + 3.5, z);
      const yDz = getTerrainHeight(x, z + 3.5);
      if (Math.hypot(yDx - y, yDz - y) > 2.2) continue;

      dummy.position.set(x, Math.min(y, yDx, yDz) - 0.55, z);
      dummy.rotation.set(0, this.rand() * Math.PI * 2, 0);
      // Slightly shorter near upper alpine timberline
      const timberScale = 1.0 - Math.max(0, (y - 16.0) / 16.0) * 0.38;
      const sc = (0.92 + this.rand() * 0.9) * timberScale;
      dummy.scale.set(sc * (0.9 + this.rand() * 0.32), sc, sc * (0.9 + this.rand() * 0.32));
      dummy.updateMatrix();
      matrices.push(dummy.matrix.clone());

      const rRoll = this.rand();
      tmpCol.copy(rRoll < 0.36 ? colA : rRoll < 0.7 ? colB : colC);
      tints.push(tmpCol.r, tmpCol.g, tmpCol.b);
    }

    const inst = new THREE.InstancedMesh(geo, mat, matrices.length);
    const c = new THREE.Color();
    for (let i = 0; i < matrices.length; i++) {
      inst.setMatrixAt(i, matrices[i]);
      c.setRGB(tints[i * 3], tints[i * 3 + 1], tints[i * 3 + 2]);
      inst.setColorAt(i, c);
    }
    inst.instanceMatrix.needsUpdate = true;
    if (inst.instanceColor) inst.instanceColor.needsUpdate = true;
    this.group.add(inst);
  }

  // Layer 3: Pre-Baked Panoramic Distant Treeline Texture Bands hugging the distant hills & foothills!
  // Renders hundreds of lush overlapping distant pines in 1 single draw call (~480 triangles total!)
  buildPanoramicTreelineBackdrop() {
    const tex = createPanoramicTreelineTexture(1024, 256);
    const mat = new THREE.MeshStandardMaterial({
      map: tex,
      alphaTest: 0.34,
      side: THREE.DoubleSide,
      roughness: 0.9,
      metalness: 0.0
    });

    mat.onBeforeCompile = (shader) => {
      shader.uniforms.uSnowCover = this.snowCoverUniform;
      shader.vertexShader = shader.vertexShader.replace(
        '#include <common>',
        `#include <common>
         varying float vBandV;`
      );
      shader.vertexShader = shader.vertexShader.replace(
        '#include <uv_vertex>',
        `#include <uv_vertex>
         vBandV = uv.y;`
      );
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <common>',
        `#include <common>
         uniform float uSnowCover;
         varying float vBandV;`
      );
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <color_fragment>',
        `#include <color_fragment>
         float topFrost = smoothstep(0.32, 0.95, vBandV) * (0.14 + uSnowCover * 0.28);
         diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.84, 0.89, 0.96), topFrost);`
      );
    };

    const allPos = [];
    const allNorm = [];
    const allUv = [];
    const allIdx = [];
    let vOff = 0;

    // 3 concentric stepped treeline ribbon rings wrapping the distant basin & mountain foothills
    const rings = [
      { radius: 142, centerZ: -44, segs: 96, height: 18.5, uRepeat: 9, seed: 1.2 },
      { radius: 196, centerZ: -52, segs: 112, height: 22.0, uRepeat: 12, seed: 2.9 },
      { radius: 256, centerZ: -58, segs: 124, height: 25.0, uRepeat: 15, seed: 4.7 }
    ];

    for (const ring of rings) {
      const pts = [];
      for (let i = 0; i <= ring.segs; i++) {
        const t = i / ring.segs;
        const a = t * Math.PI * 2;
        const wobble = Math.sin(a * 5.0 + ring.seed) * 14.0 + Math.cos(a * 9.0 - ring.seed) * 8.0;
        const r = ring.radius + wobble;
        const x = Math.cos(a) * r;
        const z = Math.sin(a) * r + ring.centerZ;
        const y = getTerrainHeight(x, z);

        // Only place forest ribbon on dry hillside & foothill elevations (skip lake surface, town & high snowy peaks)
        const valid =
          y > WATER_LEVEL + 1.4 &&
          y < 32.0 &&
          !this.isTooCloseToTown(x, z, 15.0);

        pts.push({ x, y, z, valid, u: t * ring.uRepeat });
      }

      // Emit continuous ribbon segments wherever consecutive vertices sit on valid forested hillside
      for (let i = 0; i < ring.segs; i++) {
        const p0 = pts[i];
        const p1 = pts[i + 1];
        if (!p0.valid || !p1.valid) continue;

        const y0 = p0.y - 1.6;
        const y1 = p1.y - 1.6;
        const timber0 = 1.0 - Math.max(0, (p0.y - 16.0) / 20.0) * 0.42;
        const timber1 = 1.0 - Math.max(0, (p1.y - 16.0) / 20.0) * 0.42;
        const h0 = ring.height * timber0;
        const h1 = ring.height * timber1;

        // Soft upward-inward normal so the treeline catches sky/moon/aurora light naturally without harsh flat-card seams
        const dx = p1.x - p0.x;
        const dz = p1.z - p0.z;
        const invL = 1.0 / Math.max(0.001, Math.hypot(dx, dz));
        const nx = -dz * invL * 0.45;
        const nz = dx * invL * 0.45;
        const ny = 0.89;

        allPos.push(
          p0.x, y0, p0.z,
          p1.x, y1, p1.z,
          p0.x, y0 + h0, p0.z,
          p1.x, y1 + h1, p1.z
        );
        for (let k = 0; k < 4; k++) {
          allNorm.push(nx, ny, nz);
        }
        allUv.push(
          p0.u, 0,
          p1.u, 0,
          p0.u, 1,
          p1.u, 1
        );
        allIdx.push(
          vOff, vOff + 1, vOff + 2,
          vOff + 1, vOff + 3, vOff + 2
        );
        vOff += 4;
      }
    }

    if (allIdx.length > 0) {
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(allPos, 3));
      geo.setAttribute('normal', new THREE.Float32BufferAttribute(allNorm, 3));
      geo.setAttribute('uv', new THREE.Float32BufferAttribute(allUv, 2));
      geo.setIndex(allIdx);
      const mesh = new THREE.Mesh(geo, mat);
      mesh.castShadow = false;
      mesh.receiveShadow = false;
      this.group.add(mesh);
    }
  }

  // Layer 4: Scattered Organic Alpine Spruce Groves climbing the distant snowy mountain flanks & saddles!
  // Clusters of 7-15 wind-sculpted hardy conifers tucked into natural gullies (1 Draw Call, ~2,400 tris total!)
  buildAlpineMountainGroves(groveCount = 60) {
    const geo = createDistantSpruceCardGeometry();
    const tex = createFullSpruceCardTexture(256);

    const mat = new THREE.MeshStandardMaterial({
      map: tex,
      alphaTest: 0.36,
      side: THREE.DoubleSide,
      roughness: 0.9,
      metalness: 0.0
    });

    mat.onBeforeCompile = (shader) => {
      shader.uniforms.uSnowCover = this.snowCoverUniform;
      shader.vertexShader = shader.vertexShader.replace(
        '#include <common>',
        `#include <common>
         varying float vAlpineV;`
      );
      shader.vertexShader = shader.vertexShader.replace(
        '#include <uv_vertex>',
        `#include <uv_vertex>
         vAlpineV = uv.y;`
      );
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <common>',
        `#include <common>
         uniform float uSnowCover;
         varying float vAlpineV;`
      );
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <color_fragment>',
        `#include <color_fragment>
         // Higher mountain conifers carry heavier alpine snow dusting on upper boughs
         float alpineSnow = smoothstep(0.24, 0.94, vAlpineV) * (0.24 + uSnowCover * 0.38);
         diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.86, 0.91, 0.97), alpineSnow);`
      );
    };

    const matrices = [];
    const tints = [];
    const dummy = new THREE.Object3D();
    const colA = new THREE.Color('#9fb9ad');
    const colB = new THREE.Color('#c8ddd3');
    const colC = new THREE.Color('#7f9b90');
    const tmpCol = new THREE.Color();

    let placedGroves = 0;
    let attempts = 0;
    while (placedGroves < groveCount && attempts < groveCount * 22) {
      attempts++;
      // Bias slightly toward the iconic northern mountain range (z < -150) while also dotting east/west mountain flanks
      const isNorthHero = this.rand() < 0.68;
      let gx, gz;
      if (isNorthHero) {
        const spreadAngle = (this.rand() - 0.5) * 2.15;
        const dist = 195 + this.rand() * 215;
        gx = Math.sin(spreadAngle) * dist;
        gz = -Math.cos(spreadAngle) * dist - 20;
      } else {
        const a = this.rand() * Math.PI * 2;
        const dist = 190 + this.rand() * 190;
        gx = Math.cos(a) * dist;
        gz = Math.sin(a) * dist - 40;
      }

      const gy = getTerrainHeight(gx, gz);
      // Mid-to-upper mountain timberline flanks & sheltered valleys (above main foothill forest!)
      if (gy < 17.5 || gy > 64.0) continue;

      const sDx = getTerrainHeight(gx + 5.0, gz) - gy;
      const sDz = getTerrainHeight(gx, gz + 5.0) - gy;
      if (Math.hypot(sDx, sDz) > 3.6) continue;

      placedGroves++;
      // Each mountain grove has 7-15 organically clustered trees tapering smaller at higher elevations
      const altNorm = Math.max(0, Math.min(1, (gy - 18.0) / 46.0));
      const treesInGrove = Math.max(5, Math.round((7 + this.rand() * 9) * (1.0 - altNorm * 0.42)));
      const clusterRx = 8.5 + this.rand() * 14.0;
      const clusterRz = 7.0 + this.rand() * 11.5;

      for (let t = 0; t < treesInGrove; t++) {
        const ta = this.rand() * Math.PI * 2;
        const tr = Math.pow(this.rand(), 0.72);
        const x = gx + Math.cos(ta) * tr * clusterRx;
        const z = gz + Math.sin(ta) * tr * clusterRz;
        const y = getTerrainHeight(x, z);
        if (y < WATER_LEVEL + 2.0 || y > 68.0) continue;

        const yDx = getTerrainHeight(x + 3.0, z);
        const yDz = getTerrainHeight(x, z + 3.0);
        if (Math.hypot(yDx - y, yDz - y) > 2.9) continue;

        const localAlt = Math.max(0, Math.min(1, (y - 18.0) / 50.0));
        // Hardy shorter alpine conifers near upper ridges, taller pines in lower mountain saddles
        const sc = (0.58 + this.rand() * 0.72) * (1.18 - localAlt * 0.56);
        dummy.position.set(x, Math.min(y, yDx, yDz) - 0.65, z);
        dummy.rotation.set(0, this.rand() * Math.PI * 2, 0);
        dummy.scale.set(sc * (0.85 + this.rand() * 0.3), sc, sc * (0.85 + this.rand() * 0.3));
        dummy.updateMatrix();
        matrices.push(dummy.matrix.clone());

        const rRoll = this.rand();
        tmpCol.copy(rRoll < 0.38 ? colA : rRoll < 0.72 ? colB : colC);
        tints.push(tmpCol.r, tmpCol.g, tmpCol.b);
      }
    }

    if (matrices.length > 0) {
      const inst = new THREE.InstancedMesh(geo, mat, matrices.length);
      const c = new THREE.Color();
      for (let i = 0; i < matrices.length; i++) {
        inst.setMatrixAt(i, matrices[i]);
        c.setRGB(tints[i * 3], tints[i * 3 + 1], tints[i * 3 + 2]);
        inst.setColorAt(i, c);
      }
      inst.instanceMatrix.needsUpdate = true;
      if (inst.instanceColor) inst.instanceColor.needsUpdate = true;
      this.group.add(inst);
    }
  }

  buildValleyMist() {
    // Patchy, Artfully Scattered Nordic Mist Ribbons (localized wisps tucked in mountain saddles, pine woodland edges & lakeshore coves!)
    // Deliberately leaves center vista & distant mountain peaks crisp — NEVER muddy or clumped together!
    const mistTex = createWispyMistRibbonTexture(256, 128);
    this.mistSprites = [];
    const mistSpecs = [
      // Left & right mountain flank valley ribbons (clear gap in center for aurora & peaks!)
      { x: -195, y: 26, z: -275, sx: 235, sy: 44, speed: 0.95, opMult: 0.34 },
      { x: 188, y: 28, z: -290, sx: 245, sy: 46, speed: -0.88, opMult: 0.34 },
      { x: -125, y: 15, z: -205, sx: 165, sy: 28, speed: 0.72, opMult: 0.30 },
      { x: 132, y: 16, z: -212, sx: 170, sy: 30, speed: -0.68, opMult: 0.30 },
      // Patchy lakeside low-lying winter vapor wisps (here and there along shore coves)
      { x: -64, y: 3.4, z: -96, sx: 108, sy: 15, speed: 0.58, opMult: 0.26 },
      { x: 58, y: 3.6, z: -108, sx: 112, sy: 16, speed: -0.52, opMult: 0.26 },
      { x: -12, y: 2.8, z: -144, sx: 96, sy: 13, speed: 0.44, opMult: 0.22 },
      // Localized woodland-floor mist pockets drifting gently along left & right forest margins
      { x: -56, y: 3.8, z: -24, sx: 78, sy: 13, speed: 0.42, opMult: 0.24 },
      { x: 64, y: 4.0, z: -32, sx: 82, sy: 14, speed: -0.38, opMult: 0.24 },
      { x: -48, y: 3.5, z: 34, sx: 72, sy: 12, speed: 0.35, opMult: 0.20 },
      { x: 54, y: 3.8, z: 42, sx: 76, sy: 12, speed: -0.34, opMult: 0.20 },
      { x: -84, y: 6.2, z: -148, sx: 120, sy: 20, speed: 0.50, opMult: 0.26 },
      { x: 88, y: 6.5, z: -152, sx: 124, sy: 20, speed: -0.48, opMult: 0.26 }
    ];

    for (let i = 0; i < mistSpecs.length; i++) {
      const sp = mistSpecs[i];
      const mat = new THREE.SpriteMaterial({
        map: mistTex,
        color: '#a8bdd4',
        transparent: true,
        opacity: 0.25,
        depthWrite: false
      });
      const sprite = new THREE.Sprite(mat);
      sprite.position.set(sp.x, sp.y, sp.z);
      sprite.scale.set(sp.sx, sp.sy, 1);
      this.group.add(sprite);
      this.mistSprites.push({
        sprite,
        mat,
        baseX: sp.x,
        speed: sp.speed,
        opMult: sp.opMult,
        phase: i * 1.73
      });
    }
  }

  buildSnowfall(count) {
    const positions = new Float32Array(count * 3);
    const speeds = new Float32Array(count);
    const sizes = new Float32Array(count);
    const phases = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      // Subtle 3-tier circular snow orb sizes (fine dust / soft mid snow / gently larger bokeh orbs)
      const mod = i % 6;
      const isHeroLarge = mod === 0;
      const isMid = mod === 1 || mod === 2;
      const spread = isHeroLarge ? 48 : 98;
      positions[i * 3] = (this.rand() - 0.5) * spread;
      positions[i * 3 + 1] = this.rand() * (isHeroLarge ? 30 : 46);
      positions[i * 3 + 2] = (this.rand() - 0.5) * spread + (isHeroLarge ? 8 : 0);
      speeds[i] = isHeroLarge ? (0.52 + this.rand() * 0.58) : (0.68 + this.rand() * 0.95);
      sizes[i] = isHeroLarge
        ? (1.45 + this.rand() * 0.72)
        : isMid
          ? (0.98 + this.rand() * 0.48)
          : (0.62 + this.rand() * 0.36);
      phases[i] = this.rand() * Math.PI * 2;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('aSpeed', new THREE.BufferAttribute(speeds, 1));
    geo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
    geo.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));
    this.snowGeo = geo;

    const snowTex = createSnowflakeTexture(96);
    this.snowMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      uniforms: {
        uTime: { value: 0 },
        uOpacity: { value: 0.86 },
        uIntensity: { value: this.snowIntensity },
        uMap: { value: snowTex },
        uColor: { value: new THREE.Color('#eef5ff') },
        uPixelRatio: { value: Math.min(window.devicePixelRatio || 1, 2) }
      },
      vertexShader: /* glsl */ `
        attribute float aSpeed;
        attribute float aSize;
        attribute float aPhase;
        uniform float uTime;
        uniform float uIntensity;
        uniform float uPixelRatio;
        varying float vAlpha;

        void main() {
          vec3 p = position;
          float speedMult = 0.72 + uIntensity * 1.35;
          float windMult = 1.15 + uIntensity * 2.85;
          float fall = mod(p.y - uTime * (1.28 * aSpeed * speedMult), 46.0);
          p.y = fall - 2.0;
          p.x += sin(uTime * (0.48 + uIntensity * 0.45) + aPhase + p.y * 0.14) * windMult + mod(uTime * uIntensity * 2.4, 96.0) - 48.0 * uIntensity;
          p.x = mod(p.x + 49.0, 98.0) - 49.0;
          p.z += cos(uTime * 0.44 + aPhase * 1.3 + p.y * 0.11) * (1.1 + uIntensity * 1.2);

          vAlpha = smoothstep(-2.0, 2.5, p.y) * (1.0 - smoothstep(38.0, 44.0, p.y));

          vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);
          gl_Position = projectionMatrix * mvPosition;
          float sizeBoost = 1.12 + uIntensity * 0.62;
          gl_PointSize = clamp((92.0 * aSize * sizeBoost * uPixelRatio) / max(1.0, -mvPosition.z), 2.0, 28.0);
        }
      `,
      fragmentShader: /* glsl */ `
        precision highp float;
        uniform sampler2D uMap;
        uniform vec3 uColor;
        uniform float uOpacity;
        varying float vAlpha;

        void main() {
          vec4 tex = texture2D(uMap, gl_PointCoord);
          float a = tex.a * vAlpha * uOpacity;
          if (a < 0.01) discard;
          gl_FragColor = vec4(uColor, a);
        }
      `
    });

    this.snowPoints = new THREE.Points(geo, this.snowMat);
    this.group.add(this.snowPoints);
  }

  buildDistantBirds() {
    this.birds = [];
    const wingMat = new THREE.MeshBasicMaterial({
      color: '#192230',
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.78
    });

    const wingGeo = new THREE.BufferGeometry();
    wingGeo.setAttribute(
      'position',
      new THREE.Float32BufferAttribute([0, 0, 0, 1.35, 0.14, -0.3, 0.45, 0, 0.4], 3)
    );

    for (let i = 0; i < 5; i++) {
      const bird = new THREE.Group();
      const leftWing = new THREE.Mesh(wingGeo, wingMat);
      const rightWing = new THREE.Mesh(wingGeo, wingMat);
      rightWing.scale.x = -1;
      bird.add(leftWing, rightWing);
      bird.scale.setScalar(0.9 + (i % 3) * 0.16);
      this.group.add(bird);

      this.birds.push({
        group: bird,
        leftWing,
        rightWing,
        wingMat,
        offset: new THREE.Vector3((i - 2) * 4.4, (i % 2) * 1.6, -i * 3.0),
        flapPhase: i * 1.25
      });
    }
    this.flockCycle = 0;
  }

  setSnowEnabled(enabled) {
    this.snowEnabled = enabled;
  }

  setSnowIntensity(intensity) {
    this.snowIntensity = Math.max(0.05, Math.min(1.0, intensity));
  }

  update(elapsedTime, dt, dayState) {
    this.windTime.value = elapsedTime;
    this.snowCoverUniform.value = dayState.snowCover;

    const targetSnowOp = this.snowEnabled ? (0.68 + this.snowIntensity * 0.26) : 0.0;
    const curOp = this.snowMat.uniforms.uOpacity.value;
    this.snowMat.uniforms.uOpacity.value = curOp + (targetSnowOp - curOp) * Math.min(1, dt * 4.5);

    const curInt = this.snowMat.uniforms.uIntensity.value;
    const nextInt = curInt + (this.snowIntensity - curInt) * Math.min(1, dt * 5.0);
    this.snowMat.uniforms.uIntensity.value = nextInt;

    // Dynamically adjust active snowflake particle count from gentle flurry (~8%) up to full Nordic snowstorm (100%)
    const activeCount = Math.max(200, Math.floor(this.maxSnowCount * (0.08 + Math.pow(nextInt, 1.25) * 0.92)));
    this.snowGeo.setDrawRange(0, activeCount);

    this.snowMat.uniforms.uTime.value = elapsedTime;
    this.snowPoints.visible = this.snowMat.uniforms.uOpacity.value > 0.005;

    this.snowMat.uniforms.uColor.value.copy(dayState.cloudTint).lerp(new THREE.Color('#ffffff'), 0.72);

    for (const m of this.mistSprites) {
      m.sprite.position.x = m.baseX + Math.sin(elapsedTime * 0.036 * m.speed + m.phase) * 32.0;
      m.mat.opacity = dayState.mistOpacity * m.opMult;
      // Keep night mist deeply tinted to midnight-indigo atmospheric fog (never milky white blobs!)
      m.mat.color.copy(dayState.fogColor).lerp(dayState.skyHorizon, 0.42);
    }

    this.flockCycle = (this.flockCycle + dt * 0.025) % 1.0;
    const activePass = this.flockCycle < 0.62;
    const passT = this.flockCycle / 0.62;
    const flockX = -220 + passT * 440;
    const flockY = 48 + Math.sin(passT * Math.PI) * 14;
    const flockZ = -215 + Math.sin(passT * Math.PI * 2) * 24;
    const edgeVis = Math.sin(passT * Math.PI);

    for (const b of this.birds) {
      b.group.visible = activePass;
      if (!activePass) continue;
      b.group.position.set(
        flockX + b.offset.x,
        flockY + b.offset.y + Math.sin(elapsedTime * 0.8 + b.flapPhase) * 0.6,
        flockZ + b.offset.z
      );
      b.group.rotation.y = Math.PI * 0.45;
      const flap = Math.sin(elapsedTime * 5.2 + b.flapPhase) * 0.45;
      b.leftWing.rotation.z = flap;
      b.rightWing.rotation.z = -flap;
      b.wingMat.opacity = edgeVis * (0.4 + (1 - dayState.starIntensity * 0.35) * 0.45);
    }
  }
}
