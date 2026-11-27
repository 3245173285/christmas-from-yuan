import * as THREE from 'three';
import { GIFT_CARDS } from '../data/giftCards.js';
import { createGiftInterior } from './giftMiniatures.js';
import { getTerrainHeight, mulberry32 } from '../utils/noise.js';
import {
  createBarkTexture,
  createPineSprigTexture,
  createSoftGlowTexture,
  createVelvetNormalBump
} from '../utils/textures.js';

// Hero Luxury Nordic Christmas Tree
// Layered spruce boughs + instanced 3D pine needle fronds + PBR ornaments with pendulum sway
// + helical gold silk ribbon + dense twinkling warm fairy lights + 3D gold star + bespoke luxury gift boxes

function createCrossedSprigGeometry() {
  // Two slightly arched, intersecting sprig planes so pine fronds look lush and 3D from any angle
  const geo1 = new THREE.PlaneGeometry(0.62, 0.88, 2, 3);
  const geo2 = new THREE.PlaneGeometry(0.56, 0.84, 2, 3);

  // Pivot near base of sprig so it radiates outward from the bough
  geo1.translate(0, 0.36, 0);
  geo2.translate(0, 0.34, 0);

  // Subtle natural downward arch along sprig length
  const bend = (g, flip) => {
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const y = p.getY(i);
      const x = p.getX(i);
      const arch = -y * y * 0.14;
      const cup = Math.abs(x) * 0.12;
      p.setZ(i, (arch + cup) * (flip ? -0.6 : 1.0));
    }
    g.computeVertexNormals();
  };
  bend(geo1, false);
  geo2.rotateY(Math.PI * 0.44);
  bend(geo2, true);

  // Merge geo1 and geo2 cleanly into one BufferGeometry
  const merged = new THREE.BufferGeometry();
  const count1 = geo1.attributes.position.count;
  const count2 = geo2.attributes.position.count;
  const totalV = count1 + count2;

  const pos = new Float32Array(totalV * 3);
  const norm = new Float32Array(totalV * 3);
  const uv = new Float32Array(totalV * 2);

  pos.set(geo1.attributes.position.array, 0);
  pos.set(geo2.attributes.position.array, count1 * 3);
  norm.set(geo1.attributes.normal.array, 0);
  norm.set(geo2.attributes.normal.array, count1 * 3);
  uv.set(geo1.attributes.uv.array, 0);
  uv.set(geo2.attributes.uv.array, count1 * 2);

  const idx1 = geo1.index.array;
  const idx2 = geo2.index.array;
  const idx = new Uint16Array(idx1.length + idx2.length);
  idx.set(idx1, 0);
  for (let i = 0; i < idx2.length; i++) idx[idx1.length + i] = idx2[i] + count1;

  merged.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  merged.setAttribute('normal', new THREE.BufferAttribute(norm, 3));
  merged.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  merged.setIndex(new THREE.BufferAttribute(idx, 1));

  geo1.dispose();
  geo2.dispose();
  return merged;
}

function createTeardropFinialGeometry() {
  const pts = [
    new THREE.Vector2(0.0, -0.24),
    new THREE.Vector2(0.055, -0.15),
    new THREE.Vector2(0.115, -0.04),
    new THREE.Vector2(0.125, 0.04),
    new THREE.Vector2(0.09, 0.13),
    new THREE.Vector2(0.038, 0.19),
    new THREE.Vector2(0.0, 0.21)
  ];
  const g = new THREE.LatheGeometry(pts, 16);
  g.computeVertexNormals();
  return g;
}

function createSculptedStarGeometry() {
  // Multi-pointed 3D luxury Nordic Bethlehem star
  const group = new THREE.Group();

  const makeStarLayer = (points, outerR, innerR, depth) => {
    const verts = [];
    const step = Math.PI / points;
    for (let i = 0; i < points * 2; i++) {
      const a0 = i * step + Math.PI / 2;
      const a1 = (i + 1) * step + Math.PI / 2;
      const r0 = i % 2 === 0 ? outerR : innerR;
      const r1 = (i + 1) % 2 === 0 ? outerR : innerR;

      const x0 = Math.cos(a0) * r0;
      const y0 = Math.sin(a0) * r0;
      const x1 = Math.cos(a1) * r1;
      const y1 = Math.sin(a1) * r1;

      // Front face triangle
      verts.push(0, 0, depth, x0, y0, 0, x1, y1, 0);
      // Back face triangle
      verts.push(0, 0, -depth, x1, y1, 0, x0, y0, 0);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
    geo.computeVertexNormals();
    return geo;
  };

  return {
    mainGeo: makeStarLayer(8, 0.68, 0.22, 0.18),
    innerGeo: makeStarLayer(8, 0.44, 0.16, 0.24)
  };
}

// Radius silhouette profile of a majestic full-bodied Norway Spruce
function getTreeRadiusAtHeight(hNorm) {
  // hNorm: 0 at base skirt (y=1.1), 1 at crown tip (y=11.4)
  const baseCone = Math.pow(1.0 - hNorm, 0.86) * 3.85;
  // Subtle organic tier scallops so the silhouette isn't a mathematical cone
  const tierWave = 1.0 + 0.08 * Math.sin(hNorm * Math.PI * 13.0);
  // Slight lush fullness in the lower-mid body
  const belly = 1.0 + 0.12 * Math.sin(hNorm * Math.PI);
  return Math.max(0.14, baseCone * tierWave * belly);
}

export class LuxuryChristmasTree {
  constructor(scene, perf) {
    this.scene = scene;
    this.group = new THREE.Group();
    const groundY = getTerrainHeight(0, 0);
    this.group.position.set(0, groundY, 0);
    this.treeScale = 1.26; // Monumental grand European plaza Christmas tree (~14.6m tall!)
    this.group.scale.setScalar(this.treeScale);
    scene.add(this.group);

    this.rand = mulberry32(20251225);
    this.windUniforms = { uTime: { value: 0 } };
    this.swayUniforms = { uTime: { value: 0 } };

    this.treeHeight = 11.4;
    this.skirtStartY = 1.05;

    // Interactive states
    this.ornamentMeshes = [];
    this.ornamentBases = new Map();
    this.activeSwings = [];
    this.starWaveTimer = -1; // >= 0 while golden cascade wave ripples down the tree
    this.starHovered = false;
    this.specialGifts = [];
    this.hoveredGiftIdx = -1;
    this.glowTex = createSoftGlowTexture(128, 'rgba(255,246,214,0.95)', 'rgba(255,204,108,0.42)');

    this.perf = perf;
    this.buildTrunkAndBoughs();
    this.buildPineNeedles(perf.needleClusterCount, perf.needleScaleBoost || 1.0, perf.treeNeedlesCastShadow !== false);
    this.buildHelicalGoldRibbon();
    this.buildLuxuryOrnaments();
    this.buildFairyLights(perf.fairyLightCount);
    this.buildStarTopper();
    this.buildGiftBoxes();
    this.buildTreeLighting();
  }

  buildTrunkAndBoughs() {
    const barkTex = createBarkTexture(256);
    const barkMat = new THREE.MeshStandardMaterial({
      map: barkTex,
      roughness: 0.94,
      metalness: 0.02
    });

    // Tapered central trunk
    const trunkGeo = new THREE.CylinderGeometry(0.06, 0.42, this.treeHeight - 0.3, 14, 8);
    trunkGeo.translate(0, (this.treeHeight - 0.3) * 0.5, 0);
    const trunk = new THREE.Mesh(trunkGeo, barkMat);
    trunk.castShadow = true;
    trunk.receiveShadow = true;
    this.group.add(trunk);

    // Subtle dark evergreen inner foliage core (prevents see-through holes while staying rich spruce green)
    const coreMat = new THREE.MeshStandardMaterial({
      color: '#173823',
      roughness: 0.92,
      metalness: 0.0
    });
    const coreGeo = new THREE.ConeGeometry(2.35, 9.5, 14, 10);
    const cPos = coreGeo.attributes.position;
    for (let i = 0; i < cPos.count; i++) {
      const y = cPos.getY(i);
      const jitter = 0.85 + 0.3 * Math.sin(cPos.getX(i) * 3.1 + y * 2.3) * Math.cos(cPos.getZ(i) * 2.7);
      cPos.setX(i, cPos.getX(i) * jitter);
      cPos.setZ(i, cPos.getZ(i) * jitter);
    }
    coreGeo.computeVertexNormals();
    const coreMesh = new THREE.Mesh(coreGeo, coreMat);
    coreMesh.position.y = 5.95;
    coreMesh.castShadow = true;
    coreMesh.receiveShadow = true;
    this.group.add(coreMesh);

    // Structural wooden bough whorls radiating out
    this.boughs = [];
    const tierCount = 15;
    const boughGeo = new THREE.CylinderGeometry(0.015, 0.055, 1.0, 6);
    boughGeo.rotateX(Math.PI / 2);
    boughGeo.translate(0, 0, 0.5);

    const boughMatrices = [];
    const dummy = new THREE.Object3D();

    for (let t = 0; t < tierCount; t++) {
      const hNorm = t / (tierCount - 1);
      const y = this.skirtStartY + hNorm * (this.treeHeight - this.skirtStartY - 0.35);
      const tierR = getTreeRadiusAtHeight(hNorm);
      const branchesInTier = Math.max(5, Math.round(13 - hNorm * 7));
      const baseAngle = t * 1.18;

      for (let b = 0; b < branchesInTier; b++) {
        const angle = baseAngle + (b / branchesInTier) * Math.PI * 2 + (this.rand() - 0.5) * 0.28;
        const len = tierR * (0.86 + this.rand() * 0.24);
        const droop = (1.0 - hNorm) * 0.34 - 0.08 + (this.rand() - 0.5) * 0.1;

        this.boughs.push({ y, hNorm, angle, len, droop });

        dummy.position.set(0, y, 0);
        dummy.rotation.set(droop, angle, 0, 'YXZ');
        dummy.scale.set(1.0 - hNorm * 0.5, 1.0 - hNorm * 0.5, len * 0.92);
        dummy.updateMatrix();
        boughMatrices.push(dummy.matrix.clone());
      }
    }

    const boughInst = new THREE.InstancedMesh(boughGeo, barkMat, boughMatrices.length);
    for (let i = 0; i < boughMatrices.length; i++) {
      boughInst.setMatrixAt(i, boughMatrices[i]);
    }
    boughInst.instanceMatrix.needsUpdate = true;
    boughInst.castShadow = true;
    this.group.add(boughInst);
  }

  buildPineNeedles(targetCount, scaleBoost = 1.0, castShadow = true) {
    const sprigGeo = createCrossedSprigGeometry();
    const sprigTex = createPineSprigTexture(256);

    const needleMat = new THREE.MeshStandardMaterial({
      map: sprigTex,
      alphaTest: 0.36,
      side: THREE.DoubleSide,
      roughness: 0.72,
      metalness: 0.04
    });

    // Inject natural gentle breeze sway into vertex shader
    needleMat.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = this.windUniforms.uTime;
      shader.vertexShader = shader.vertexShader.replace(
        '#include <common>',
        `#include <common>
         uniform float uTime;`
      );
      shader.vertexShader = shader.vertexShader.replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
         vec4 instOrigin = instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
         float radial = length(instOrigin.xz);
         float tipMask = clamp(position.y * 1.2, 0.0, 1.0);
         float swayPhase = uTime * 1.15 + instOrigin.x * 0.65 + instOrigin.z * 0.55 + instOrigin.y * 0.45;
         float swayAmt = (0.028 + radial * 0.014) * tipMask;
         transformed.x += sin(swayPhase) * swayAmt;
         transformed.z += cos(swayPhase * 0.82) * swayAmt * 0.75;
         transformed.y += sin(swayPhase * 1.4) * swayAmt * 0.25;`
      );
    };

    const instMesh = new THREE.InstancedMesh(sprigGeo, needleMat, targetCount);
    instMesh.castShadow = castShadow;
    instMesh.receiveShadow = true;

    const dummy = new THREE.Object3D();
    const color = new THREE.Color();
    // Subtle luminous tints (sprigTex already carries deep Nordic spruce green — avoid double-darkening!)
    const deepGreen = new THREE.Color('#a8ccb2');
    const midGreen = new THREE.Color('#e2f5e6');
    const frostTip = new THREE.Color('#eef7fb');

    let idx = 0;

    // 1. Populate dense sprigs directly along every structural bough & side-shoots
    const perBough = Math.floor((targetCount * 0.82) / this.boughs.length);
    for (let bi = 0; bi < this.boughs.length && idx < targetCount; bi++) {
      const b = this.boughs[bi];
      const dirX = Math.sin(b.angle);
      const dirZ = Math.cos(b.angle);
      const sideX = Math.cos(b.angle);
      const sideZ = -Math.sin(b.angle);

      for (let s = 0; s < perBough && idx < targetCount; s++) {
        const frac = 0.18 + (s / perBough) * 0.85 + (this.rand() - 0.5) * 0.08;
        const dist = Math.max(0.15, b.len * frac);
        // Natural sweeping curve: droops through mid-branch then gently lifts at outer tip
        const curveY = -Math.sin(b.droop) * dist + Math.pow(frac, 2.6) * 0.36 * (1.0 - b.hNorm * 0.4);
        const lateral = (this.rand() - 0.5) * (0.45 + (1.0 - b.hNorm) * 0.65) * Math.sin(frac * Math.PI * 0.85 + 0.15);

        const px = dirX * dist + sideX * lateral;
        const pz = dirZ * dist + sideZ * lateral;
        const py = b.y + curveY + (this.rand() - 0.5) * 0.22;

        dummy.position.set(px, py, pz);

        // Orient sprigs outward and slightly drooping/fanning
        const fanAngle = b.angle + (lateral >= 0 ? 0.48 : -0.48) + (this.rand() - 0.5) * 0.65;
        const pitch = 0.95 + (1.0 - frac) * 0.35 + (this.rand() - 0.5) * 0.45;
        dummy.rotation.set(pitch, fanAngle, (this.rand() - 0.5) * 0.6, 'YXZ');

        const sc = (0.72 + (1.0 - b.hNorm) * 0.65) * (0.75 + this.rand() * 0.45) * scaleBoost;
        dummy.scale.set(sc, sc * (0.85 + this.rand() * 0.3), sc);
        dummy.updateMatrix();
        instMesh.setMatrixAt(idx, dummy.matrix);

        // Rich organic spruce coloration + subtle winter frost on outer/upper tips
        color.copy(deepGreen).lerp(midGreen, this.rand() * 0.85);
        const outerFrost = Math.max(0, frac - 0.72) * (0.35 + b.hNorm * 0.55) * this.rand();
        color.lerp(frostTip, outerFrost * 0.55);
        instMesh.setColorAt(idx, color);
        idx++;
      }
    }

    // 2. Remaining sprigs fill out the sculpted crown & organic lower skirt fullness
    while (idx < targetCount) {
      const hNorm = Math.pow(this.rand(), 0.92);
      const y = this.skirtStartY + hNorm * (this.treeHeight - this.skirtStartY - 0.1);
      const maxR = getTreeRadiusAtHeight(hNorm);
      const r = maxR * (0.45 + 0.58 * Math.sqrt(this.rand()));
      const a = this.rand() * Math.PI * 2;

      dummy.position.set(Math.sin(a) * r, y, Math.cos(a) * r);
      dummy.rotation.set(0.85 + this.rand() * 0.65, a + (this.rand() - 0.5) * 0.8, (this.rand() - 0.5) * 0.5, 'YXZ');
      const sc = (0.58 + (1.0 - hNorm) * 0.68) * (0.75 + this.rand() * 0.4) * scaleBoost;
      dummy.scale.setScalar(sc);
      dummy.updateMatrix();
      instMesh.setMatrixAt(idx, dummy.matrix);

      color.copy(deepGreen).lerp(midGreen, this.rand());
      if (hNorm > 0.75 && this.rand() > 0.55) color.lerp(frostTip, 0.28);
      instMesh.setColorAt(idx, color);
      idx++;
    }

    instMesh.instanceMatrix.needsUpdate = true;
    if (instMesh.instanceColor) instMesh.instanceColor.needsUpdate = true;
    this.group.add(instMesh);
  }

  buildHelicalGoldRibbon() {
    // Graceful luxury champagne-gold silk ribbon spiralling 5.5 turns around the tree with natural drape sag
    const turns = 5.6;
    const steps = 340;
    const ribbonWidth = 0.25;

    const positions = [];
    const normals = [];
    const uvs = [];
    const indices = [];

    for (let i = 0; i <= steps; i++) {
      const t = i / steps; // 0 = near top, 1 = bottom skirt
      const hNorm = 0.95 - t * 0.89;
      const baseY = this.skirtStartY + hNorm * (this.treeHeight - this.skirtStartY - 0.35);
      const angle = t * Math.PI * 2 * turns + 0.4;

      // Gentle catenary drape wave between outer boughs
      const drapeSag = Math.sin(angle * 4.0) * 0.12 * (1.0 - hNorm * 0.5);
      const r = getTreeRadiusAtHeight(hNorm) * 0.98 + 0.08 + Math.cos(angle * 4.0) * 0.06;

      const cx = Math.sin(angle) * r;
      const cz = Math.cos(angle) * r;
      const cy = baseY + drapeSag;

      // Outward normal for ribbon face
      const nx = Math.sin(angle);
      const nz = Math.cos(angle);
      const ny = 0.28;
      const nLen = Math.hypot(nx, ny, nz);

      // Ribbon width tapers gently toward top
      const w = ribbonWidth * (0.48 + 0.65 * (1.0 - hNorm));
      const tilt = 0.14;

      // Top & bottom ribbon edge vertices
      positions.push(
        cx + nx * tilt, cy + w * 0.5, cz + nz * tilt,
        cx - nx * tilt * 0.5, cy - w * 0.5, cz - nz * tilt * 0.5
      );
      normals.push(nx / nLen, ny / nLen, nz / nLen, nx / nLen, ny / nLen, nz / nLen);
      uvs.push(t * 28, 1, t * 28, 0);

      if (i < steps) {
        const a = i * 2;
        const b = a + 1;
        const c = a + 2;
        const d = a + 3;
        indices.push(a, b, c, b, d, c);
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geo.setIndex(indices);
    geo.computeVertexNormals();

    this.ribbonMat = new THREE.MeshPhysicalMaterial({
      color: '#e8c474',
      emissive: new THREE.Color('#6b4b15'),
      emissiveIntensity: 0.28,
      metalness: 0.78,
      roughness: 0.26,
      clearcoat: 0.45,
      clearcoatRoughness: 0.25,
      side: THREE.DoubleSide,
      envMapIntensity: 1.65
    });

    const ribbon = new THREE.Mesh(geo, this.ribbonMat);
    ribbon.castShadow = true;
    this.group.add(ribbon);
  }

  buildLuxuryOrnaments() {
    // 4 bespoke luxury PBR finishes + spherical & teardrop finial geometries
    const sphereGeo = new THREE.SphereGeometry(0.165, 20, 16);
    const finialGeo = createTeardropFinialGeometry();
    const capGeo = new THREE.CylinderGeometry(0.036, 0.042, 0.06, 10);

    const addPendulumSway = (mat) => {
      mat.onBeforeCompile = (shader) => {
        shader.uniforms.uTime = this.swayUniforms.uTime;
        shader.vertexShader = shader.vertexShader.replace(
          '#include <common>',
          `#include <common>
           uniform float uTime;`
        );
        shader.vertexShader = shader.vertexShader.replace(
          '#include <begin_vertex>',
          `#include <begin_vertex>
           vec4 instW = instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
           float ph = uTime * 1.35 + instW.x * 1.9 + instW.z * 1.7 + instW.y * 0.9;
           float swing = sin(ph) * 0.055;
           float dy = 0.18 - position.y;
           transformed.x += swing * dy * 1.8;
           transformed.z += cos(ph * 0.85) * 0.035 * dy * 1.8;`
        );
      };
    };

    const matGold = new THREE.MeshPhysicalMaterial({
      color: '#ebd08a',
      metalness: 0.95,
      roughness: 0.14,
      clearcoat: 0.75,
      clearcoatRoughness: 0.08,
      envMapIntensity: 1.9
    });
    const matCrimson = new THREE.MeshPhysicalMaterial({
      color: '#911120',
      metalness: 0.28,
      roughness: 0.08,
      clearcoat: 1.0,
      clearcoatRoughness: 0.04,
      envMapIntensity: 2.0
    });
    const matSilver = new THREE.MeshPhysicalMaterial({
      color: '#e5edf7',
      metalness: 0.88,
      roughness: 0.18,
      clearcoat: 0.8,
      clearcoatRoughness: 0.1,
      envMapIntensity: 1.85
    });
    const matRose = new THREE.MeshPhysicalMaterial({
      color: '#d99e73',
      metalness: 0.9,
      roughness: 0.16,
      clearcoat: 0.75,
      clearcoatRoughness: 0.08,
      envMapIntensity: 1.85
    });
    const capMat = new THREE.MeshStandardMaterial({
      color: '#e8c56b',
      metalness: 0.94,
      roughness: 0.22
    });

    [matGold, matCrimson, matSilver, matRose].forEach(addPendulumSway);

    const groups = {
      goldSpheres: [],
      crimsonSpheres: [],
      silverSpheres: [],
      roseFinials: [],
      caps: []
    };

    const dummy = new THREE.Object3D();
    const totalOrnaments = 235;

    for (let i = 0; i < totalOrnaments; i++) {
      // Golden-angle phyllotaxis distribution for balanced luxury styling
      const hNorm = 0.04 + Math.pow(i / totalOrnaments, 0.78) * 0.87;
      const y = this.skirtStartY + hNorm * (this.treeHeight - this.skirtStartY - 0.55);
      const angle = i * 2.399963 + (this.rand() - 0.5) * 0.3;
      const treeR = getTreeRadiusAtHeight(hNorm);
      const r = treeR * (0.76 + this.rand() * 0.26);

      const x = Math.sin(angle) * r;
      const z = Math.cos(angle) * r;
      const sc = (0.72 + (1.0 - hNorm) * 0.55) * (0.82 + this.rand() * 0.36);

      dummy.position.set(x, y, z);
      dummy.rotation.set(0, angle, 0);
      dummy.scale.setScalar(sc);
      dummy.updateMatrix();
      const mat4 = dummy.matrix.clone();

      // Gold ornament crown cap above each bauble
      dummy.position.set(x, y + 0.165 * sc, z);
      dummy.scale.setScalar(sc);
      dummy.updateMatrix();
      groups.caps.push(dummy.matrix.clone());

      const roll = this.rand();
      if (roll < 0.36) groups.goldSpheres.push(mat4);
      else if (roll < 0.66) groups.crimsonSpheres.push(mat4);
      else if (roll < 0.86) groups.silverSpheres.push(mat4);
      else groups.roseFinials.push(mat4);
    }

    const addInst = (geo, mat, list, isInteractive = true) => {
      const inst = new THREE.InstancedMesh(geo, mat, list.length);
      const baseRecords = [];
      const p = new THREE.Vector3();
      const q = new THREE.Quaternion();
      const sc = new THREE.Vector3();
      for (let i = 0; i < list.length; i++) {
        inst.setMatrixAt(i, list[i]);
        if (isInteractive) {
          list[i].decompose(p, q, sc);
          baseRecords.push({ pos: p.clone(), quat: q.clone(), scale: sc.clone() });
        }
      }
      inst.instanceMatrix.needsUpdate = true;
      inst.castShadow = true;
      this.group.add(inst);
      if (isInteractive) {
        this.ornamentMeshes.push(inst);
        this.ornamentBases.set(inst, baseRecords);
      }
    };

    addInst(sphereGeo, matGold, groups.goldSpheres, true);
    addInst(sphereGeo, matCrimson, groups.crimsonSpheres, true);
    addInst(sphereGeo, matSilver, groups.silverSpheres, true);
    addInst(finialGeo, matRose, groups.roseFinials, true);
    addInst(capGeo, capMat, groups.caps, false);
  }

  // Trigger real physical damped pendulum swing on a clicked ornament
  strikeOrnament(mesh, instanceId) {
    const records = this.ornamentBases.get(mesh);
    if (!records || !records[instanceId]) return null;

    // Remove existing swing on same ornament so repeated clicks re-excite smoothly
    this.activeSwings = this.activeSwings.filter(
      (s) => !(s.mesh === mesh && s.instanceId === instanceId)
    );

    const base = records[instanceId];
    const swingAxis = new THREE.Vector3(Math.random() - 0.5, 0, Math.random() - 0.5).normalize();
    this.activeSwings.push({
      mesh,
      instanceId,
      base,
      axis: swingAxis,
      age: 0,
      duration: 3.1,
      amp: 0.92
    });

    const worldPos = base.pos.clone().applyMatrix4(this.group.matrixWorld);
    const normalizedHeight = THREE.MathUtils.clamp(
      (base.pos.y - this.skirtStartY) / (this.treeHeight - this.skirtStartY),
      0,
      1
    );
    return { worldPos, normalizedHeight };
  }

  // Find closest ornament to a 3D world ray within generous tolerance so clicking baubles feels super responsive
  findNearestOrnamentToRay(ray, maxDist = 0.65) {
    this.group.updateMatrixWorld(true);
    let best = null;
    let bestD = maxDist;
    const wp = new THREE.Vector3();

    for (const mesh of this.ornamentMeshes) {
      const records = this.ornamentBases.get(mesh);
      if (!records) continue;
      for (let i = 0; i < records.length; i++) {
        wp.copy(records[i].pos).applyMatrix4(this.group.matrixWorld);
        const d = ray.distanceToPoint(wp);
        if (d < bestD) {
          bestD = d;
          best = { mesh, instanceId: i };
        }
      }
    }
    return best;
  }

  buildFairyLights(count) {
    // Dense warm-white micro fairy lights woven through branches with independent gentle twinkling
    const positions = new Float32Array(count * 3);
    const phases = new Float32Array(count);
    const sizes = new Float32Array(count);
    const colors = new Float32Array(count * 3);

    const warm1 = new THREE.Color('#fff1d2');
    const warm2 = new THREE.Color('#ffd080');
    const warm3 = new THREE.Color('#ffe4ad');
    const tmp = new THREE.Color();

    for (let i = 0; i < count; i++) {
      // Spiral + organic branch scatter
      const u = i / count;
      const hNorm = Math.pow(u, 0.72) * 0.94 + 0.02;
      const y = this.skirtStartY + hNorm * (this.treeHeight - this.skirtStartY - 0.25) + (this.rand() - 0.5) * 0.24;
      const angle = i * 0.6180339 * Math.PI * 2 + u * 24.0 + (this.rand() - 0.5) * 0.45;
      const treeR = getTreeRadiusAtHeight(hNorm);
      // Mix deep inner glow lights and outer branch-tip lights for spatial depth
      const r = treeR * (0.55 + this.rand() * 0.52);

      positions[i * 3] = Math.sin(angle) * r;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = Math.cos(angle) * r;

      phases[i] = this.rand() * Math.PI * 2;
      sizes[i] = 0.65 + this.rand() * 0.95;

      const cRoll = this.rand();
      tmp.copy(cRoll < 0.45 ? warm1 : cRoll < 0.8 ? warm2 : warm3);
      colors[i * 3] = tmp.r;
      colors[i * 3 + 1] = tmp.g;
      colors[i * 3 + 2] = tmp.b;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));
    geo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
    geo.setAttribute('aColor', new THREE.BufferAttribute(colors, 3));

    this.fairyLightMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uTime: { value: 0 },
        uIntensity: { value: 1.0 },
        uWaveY: { value: -10.0 },
        uWaveBoost: { value: 0.0 },
        uPixelRatio: { value: Math.min(window.devicePixelRatio || 1, 2) }
      },
      vertexShader: /* glsl */ `
        attribute float aPhase;
        attribute float aSize;
        attribute vec3 aColor;
        uniform float uTime;
        uniform float uIntensity;
        uniform float uWaveY;
        uniform float uWaveBoost;
        uniform float uPixelRatio;
        varying vec3 vColor;
        varying float vTwinkle;

        void main() {
          // Golden starlight cascade wave rippling from tree crown down to base!
          float distToWave = abs(position.y - uWaveY);
          float waveBand = exp(-distToWave * distToWave * 0.52) * uWaveBoost;
          // Sparkling golden-white surge as wave passes each light
          vColor = mix(aColor, vec3(1.0, 0.94, 0.68), clamp(waveBand * 0.85, 0.0, 1.0));

          float slowWave = 0.68 + 0.32 * sin(uTime * (1.2 + fract(aPhase) * 1.9) + aPhase * 6.2831);
          float sparkle = pow(0.5 + 0.5 * sin(uTime * (3.1 + fract(aPhase * 3.7) * 2.5) + aPhase * 17.0), 6.0);
          vTwinkle = (slowWave + sparkle * 0.65) * uIntensity + waveBand * 2.6;

          vec3 pos = position;
          float sway = sin(uTime * 1.15 + pos.x * 0.65 + pos.z * 0.55 + pos.y * 0.45) * 0.035;
          pos.x += sway;
          pos.z += sway * 0.7;

          vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
          gl_Position = projectionMatrix * mvPosition;
          float sizeWave = 1.0 + waveBand * 1.45;
          gl_PointSize = clamp((135.0 * aSize * sizeWave * uPixelRatio) / max(1.0, -mvPosition.z), 2.5, 48.0);
        }
      `,
      fragmentShader: /* glsl */ `
        precision highp float;
        varying vec3 vColor;
        varying float vTwinkle;

        void main() {
          vec2 uv = gl_PointCoord - 0.5;
          float d = length(uv);
          if (d > 0.5) discard;
          // Hot crisp filament core + velvety soft halo
          float core = exp(-d * d * 48.0);
          float halo = exp(-d * d * 10.5) * 0.52;
          float alpha = (core + halo) * clamp(vTwinkle, 0.0, 1.6);
          // HDR luminance > 1.0 triggers UnrealBloomPass delicately
          vec3 col = vColor * (1.65 * core + 0.85 * halo) * vTwinkle;
          gl_FragColor = vec4(col, alpha);
        }
      `
    });

    const points = new THREE.Points(geo, this.fairyLightMat);
    this.group.add(points);
  }

  buildStarTopper() {
    const { mainGeo, innerGeo } = createSculptedStarGeometry();

    this.starMat = new THREE.MeshPhysicalMaterial({
      color: '#ffe08a',
      emissive: new THREE.Color('#ffbe4a'),
      emissiveIntensity: 1.9,
      metalness: 0.92,
      roughness: 0.14,
      clearcoat: 0.8,
      envMapIntensity: 2.0
    });

    this.starGroup = new THREE.Group();
    this.starGroup.position.set(0, this.treeHeight + 0.32, 0);

    const outerStar = new THREE.Mesh(mainGeo, this.starMat);
    const innerStar = new THREE.Mesh(innerGeo, this.starMat);
    innerStar.rotation.z = Math.PI / 8;

    // Ornate coiled brass mounting base
    const coil = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.13, 0.45, 12),
      new THREE.MeshStandardMaterial({ color: '#d8b25c', metalness: 0.9, roughness: 0.25 })
    );
    coil.position.y = -0.52;

    this.starGroup.add(outerStar, innerStar, coil);

    // Soft glowing volumetric halo sprite around the crown star
    const haloTex = createSoftGlowTexture(128, 'rgba(255,248,220,0.95)', 'rgba(255,205,110,0.38)');
    this.starHaloMat = new THREE.SpriteMaterial({
      map: haloTex,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const halo = new THREE.Sprite(this.starHaloMat);
    halo.scale.set(3.4, 3.4, 1);
    this.starHalo = halo;
    this.starGroup.add(halo);

    // Generous invisible click collider around star topper so it is effortless to click from any distance
    this.starHitMesh = new THREE.Mesh(
      new THREE.SphereGeometry(1.15, 12, 10),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    this.starGroup.add(this.starHitMesh);

    this.group.add(this.starGroup);
  }

  getStarWorldPosition() {
    this.group.updateMatrixWorld(true);
    return new THREE.Vector3(0, this.treeHeight + 0.32, 0).applyMatrix4(this.group.matrixWorld);
  }

  setStarHovered(hovered) {
    this.starHovered = hovered;
  }

  triggerStarWave() {
    this.starWaveTimer = 0;
    return this.getStarWorldPosition();
  }

  buildGiftBoxes() {
    const velvetBump = createVelvetNormalBump(128);

    const wrapMaterials = [
      // Deep Burgundy Velvet
      new THREE.MeshPhysicalMaterial({
        color: '#6b0f1c', roughness: 0.82, metalness: 0.05, sheen: 0.9, sheenColor: new THREE.Color('#a83244'), bumpMap: velvetBump, bumpScale: 0.015
      }),
      // Midnight Nordic Navy Velvet
      new THREE.MeshPhysicalMaterial({
        color: '#132442', roughness: 0.8, metalness: 0.08, sheen: 0.85, sheenColor: new THREE.Color('#395b8c'), bumpMap: velvetBump, bumpScale: 0.015
      }),
      // Champagne Gold Metallic Foil
      new THREE.MeshPhysicalMaterial({
        color: '#dfc074', roughness: 0.22, metalness: 0.88, clearcoat: 0.55, envMapIntensity: 1.6
      }),
      // Forest Emerald Velvet
      new THREE.MeshPhysicalMaterial({
        color: '#14402b', roughness: 0.82, metalness: 0.06, sheen: 0.85, sheenColor: new THREE.Color('#2c7854'), bumpMap: velvetBump, bumpScale: 0.015
      }),
      // Pearl Ivory Satin Paper
      new THREE.MeshPhysicalMaterial({
        color: '#e9e2d5', roughness: 0.38, metalness: 0.12, clearcoat: 0.35
      }),
      // Brushed Silver Foil
      new THREE.MeshPhysicalMaterial({
        color: '#cfd8e3', roughness: 0.24, metalness: 0.86, clearcoat: 0.5, envMapIntensity: 1.5
      })
    ];

    const ribbonMaterials = [
      new THREE.MeshPhysicalMaterial({ color: '#e5c16c', roughness: 0.26, metalness: 0.72, clearcoat: 0.4 }),
      new THREE.MeshPhysicalMaterial({ color: '#8f1524', roughness: 0.34, metalness: 0.2, sheen: 0.8 }),
      new THREE.MeshPhysicalMaterial({ color: '#f2ece0', roughness: 0.32, metalness: 0.25, clearcoat: 0.3 })
    ];

    // Special distinct luminous jewel finishes for the 10 Interactive Mystery Gift Boxes!
    // Clearly distinguishable from the regular matte decorative boxes via radiant metallic-velvet hue + glowing gold ribbon!
    const specialWrapPalette = [
      new THREE.MeshPhysicalMaterial({ color: '#f4d37e', emissive: '#6e4e10', emissiveIntensity: 0.32, roughness: 0.16, metalness: 0.9, clearcoat: 0.85, envMapIntensity: 1.9 }),
      new THREE.MeshPhysicalMaterial({ color: '#c81d38', emissive: '#590814', emissiveIntensity: 0.34, roughness: 0.14, metalness: 0.45, clearcoat: 1.0, envMapIntensity: 1.8 }),
      new THREE.MeshPhysicalMaterial({ color: '#1b9e7e', emissive: '#084738', emissiveIntensity: 0.34, roughness: 0.16, metalness: 0.55, clearcoat: 0.95, envMapIntensity: 1.8 }),
      new THREE.MeshPhysicalMaterial({ color: '#2b66c4', emissive: '#0c285e', emissiveIntensity: 0.36, roughness: 0.15, metalness: 0.55, clearcoat: 0.95, envMapIntensity: 1.85 }),
      new THREE.MeshPhysicalMaterial({ color: '#f2b88b', emissive: '#663414', emissiveIntensity: 0.32, roughness: 0.16, metalness: 0.88, clearcoat: 0.9, envMapIntensity: 1.9 })
    ];
    const specialRibbonMat = new THREE.MeshPhysicalMaterial({
      color: '#fff0bd',
      emissive: new THREE.Color('#ffbe4a'),
      emissiveIntensity: 0.72,
      roughness: 0.18,
      metalness: 0.82,
      clearcoat: 0.7
    });

    const giftGroup = new THREE.Group();
    const baseY = this.group.position.y;
    const velvetLiningMat = new THREE.MeshStandardMaterial({
      color: '#f3e8d4',
      roughness: 0.9,
      metalness: 0.02
    });

    const createBox = (w, h, d, wrapMat, ribMat, isSpecial = false, specialIdx = -1, cardData = null) => {
      const bg = new THREE.Group();
      const rw = Math.min(0.115, Math.min(w, d) * 0.165);

      let interiorObj = null;
      let innerLight = null;

      if (isSpecial) {
        // REAL HOLLOW 5-WALL LUXURY GIFT BOX! (Open top revealing plush cream velvet interior + 3D keepsake + 3D card!)
        const wallT = 0.058;

        // Floor + plush velvet inner lining
        const floor = new THREE.Mesh(new THREE.BoxGeometry(w, wallT, d), wrapMat);
        floor.position.y = wallT * 0.5;
        floor.receiveShadow = true;
        bg.add(floor);

        const cushion = new THREE.Mesh(new THREE.BoxGeometry(w - wallT * 1.9, 0.024, d - wallT * 1.9), velvetLiningMat);
        cushion.position.y = wallT + 0.012;
        cushion.receiveShadow = true;
        bg.add(cushion);

        // 4 Separate Box Walls (front, back, left, right) so interior is genuinely deep & hollow!
        const wallH = h - wallT;
        const wallY = wallT + wallH * 0.5;
        const frontWall = new THREE.Mesh(new THREE.BoxGeometry(w, wallH, wallT), wrapMat);
        frontWall.position.set(0, wallY, d * 0.5 - wallT * 0.5);
        const backWall = new THREE.Mesh(new THREE.BoxGeometry(w, wallH, wallT), wrapMat);
        backWall.position.set(0, wallY, -d * 0.5 + wallT * 0.5);
        const leftWall = new THREE.Mesh(new THREE.BoxGeometry(wallT, wallH, d - wallT * 2), wrapMat);
        leftWall.position.set(-w * 0.5 + wallT * 0.5, wallY, 0);
        const rightWall = new THREE.Mesh(new THREE.BoxGeometry(wallT, wallH, d - wallT * 2), wrapMat);
        rightWall.position.set(w * 0.5 - wallT * 0.5, wallY, 0);
        for (const wl of [frontWall, backWall, leftWall, rightWall]) {
          wl.castShadow = true;
          wl.receiveShadow = true;
          bg.add(wl);
        }

        // Cream lining along the 4 interior wall faces for high-craft gift box realism
        const inFront = new THREE.Mesh(new THREE.PlaneGeometry(w - wallT * 2, wallH - 0.02), velvetLiningMat);
        inFront.position.set(0, wallY, d * 0.5 - wallT - 0.002);
        inFront.rotation.y = Math.PI;
        const inBack = new THREE.Mesh(new THREE.PlaneGeometry(w - wallT * 2, wallH - 0.02), velvetLiningMat);
        inBack.position.set(0, wallY, -d * 0.5 + wallT + 0.002);
        const inLeft = new THREE.Mesh(new THREE.PlaneGeometry(d - wallT * 2, wallH - 0.02), velvetLiningMat);
        inLeft.position.set(-w * 0.5 + wallT + 0.002, wallY, 0);
        inLeft.rotation.y = Math.PI / 2;
        const inRight = new THREE.Mesh(new THREE.PlaneGeometry(d - wallT * 2, wallH - 0.02), velvetLiningMat);
        inRight.position.set(w * 0.5 - wallT - 0.002, wallY, 0);
        inRight.rotation.y = -Math.PI / 2;
        bg.add(inFront, inBack, inLeft, inRight);

        // Exterior-ONLY satin ribbons on the 4 outside faces (never blocking the open hollow top!)
        const ribF = new THREE.Mesh(new THREE.BoxGeometry(rw, h, 0.018), ribMat);
        ribF.position.set(0, h * 0.5, d * 0.5 + 0.006);
        const ribB = new THREE.Mesh(new THREE.BoxGeometry(rw, h, 0.018), ribMat);
        ribB.position.set(0, h * 0.5, -d * 0.5 - 0.006);
        const ribL = new THREE.Mesh(new THREE.BoxGeometry(0.018, h, rw), ribMat);
        ribL.position.set(-w * 0.5 - 0.006, h * 0.5, 0);
        const ribR = new THREE.Mesh(new THREE.BoxGeometry(0.018, h, rw), ribMat);
        ribR.position.set(w * 0.5 + 0.006, h * 0.5, 0);
        bg.add(ribF, ribB, ribL, ribR);

        // Populate interior with adorable 3D miniature gift (teddy bear / snow globe / drum / music box / snowman) + physical 3D vintage greeting card!
        interiorObj = createGiftInterior(specialIdx, w, h, d, cardData);
        bg.add(interiorObj.interior);

        // Soft warm magic interior showcase light (only illuminates when this box is open!)
        innerLight = new THREE.PointLight('#ffdca0', 0, 4.5, 1.8);
        innerLight.position.set(0, h * 1.15, 0.15);
        bg.add(innerLight);
      } else {
        // Decorative closed luxury boxes
        const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wrapMat);
        body.position.y = h * 0.5;
        body.castShadow = true;
        body.receiveShadow = true;
        bg.add(body);

        const band1 = new THREE.Mesh(new THREE.BoxGeometry(w + 0.04, h + 0.01, rw), ribMat);
        band1.position.y = h * 0.5;
        const band2 = new THREE.Mesh(new THREE.BoxGeometry(rw, h + 0.01, d + 0.04), ribMat);
        band2.position.y = h * 0.5;
        bg.add(band1, band2);
      }

      // Hinged Lid Group (hollow rimmed lid pivoting smoothly open from back edge -d/2!)
      const lidH = Math.min(0.15, h * 0.22);
      const lidPivot = new THREE.Group();
      lidPivot.position.set(0, h, -d * 0.5);

      const lidTop = new THREE.Mesh(new THREE.BoxGeometry(w + 0.07, 0.045, d + 0.07), wrapMat);
      lidTop.position.set(0, 0.022, d * 0.5);
      lidTop.castShadow = true;
      lidPivot.add(lidTop);

      // 4 subtle overhanging lid lip skirts (keeps underside of open lid clean & hollow!)
      const skirtY = -lidH * 0.42;
      const skirtT = 0.032;
      const skF = new THREE.Mesh(new THREE.BoxGeometry(w + 0.07, lidH, skirtT), wrapMat);
      skF.position.set(0, skirtY, d + 0.035 - skirtT * 0.5);
      const skB = new THREE.Mesh(new THREE.BoxGeometry(w + 0.07, lidH, skirtT), wrapMat);
      skB.position.set(0, skirtY, -0.035 + skirtT * 0.5);
      const skL = new THREE.Mesh(new THREE.BoxGeometry(skirtT, lidH, d + 0.07), wrapMat);
      skL.position.set(-w * 0.5 - 0.035 + skirtT * 0.5, skirtY, d * 0.5);
      const skR = new THREE.Mesh(new THREE.BoxGeometry(skirtT, lidH, d + 0.07), wrapMat);
      skR.position.set(w * 0.5 + 0.035 - skirtT * 0.5, skirtY, d * 0.5);
      lidPivot.add(skF, skB, skL, skR);

      // Cross ribbons & bow strictly on TOP of the lid
      const lidBand1 = new THREE.Mesh(new THREE.BoxGeometry(w + 0.085, 0.056, rw), ribMat);
      lidBand1.position.set(0, 0.026, d * 0.5);
      const lidBand2 = new THREE.Mesh(new THREE.BoxGeometry(rw, 0.056, d + 0.085), ribMat);
      lidBand2.position.set(0, 0.026, d * 0.5);
      lidPivot.add(lidBand1, lidBand2);

      const bowY = 0.085;
      const loopGeo = new THREE.TorusGeometry(rw * 1.2, rw * 0.28, 8, 16);
      for (let k = 0; k < 4; k++) {
        const loop = new THREE.Mesh(loopGeo, ribMat);
        const a = (k / 4) * Math.PI * 2 + 0.4;
        loop.position.set(Math.cos(a) * rw * 0.72, bowY + 0.025, d * 0.5 + Math.sin(a) * rw * 0.72);
        loop.rotation.set(0.55, a, 0.25);
        loop.scale.set(1.12, 0.65, 1.0);
        lidPivot.add(loop);
      }
      const knot = new THREE.Mesh(new THREE.SphereGeometry(rw * 0.58, 8, 8), ribMat);
      knot.position.set(0, bowY, d * 0.5);
      lidPivot.add(knot);
      bg.add(lidPivot);

      let auraSprite = null;
      let hitMesh = null;

      if (isSpecial) {
        const auraMat = new THREE.SpriteMaterial({
          map: this.glowTex,
          color: '#ffdf94',
          transparent: true,
          opacity: 0.46,
          blending: THREE.AdditiveBlending,
          depthWrite: false
        });
        auraSprite = new THREE.Sprite(auraMat);
        auraSprite.position.set(0, h * 0.68, 0);
        const auraScale = Math.max(w, d) * 2.05;
        auraSprite.scale.set(auraScale, auraScale, 1);
        bg.add(auraSprite);

        hitMesh = new THREE.Mesh(
          new THREE.BoxGeometry(w + 0.35, h + 0.45, d + 0.35),
          new THREE.MeshBasicMaterial({ visible: false })
        );
        hitMesh.position.y = h * 0.55;
        bg.add(hitMesh);
      }

      return { group: bg, lidPivot, auraSprite, innerLight, interiorObj, hitMesh };
    };

    // 10 Special Hollow Mystery Gift Boxes scattered organically at natural varied distances (not cramped tightly against trunk!)
    // + 38 abundant luxury decorative boxes forming a lavish European holiday display around the snowy meadow!
    const boxSpecs = [
      // 10 Special Hollow Mystery Gift Boxes (varied distances r = 4.55 .. 6.25 & natural asymmetric scatter!)
      { a: 0.14, r: 5.35, w: 1.18, h: 0.86, d: 0.98, specialIdx: 0 },
      { a: -0.58, r: 4.82, w: 1.12, h: 0.88, d: 0.96, specialIdx: 1 },
      { a: 0.84, r: 5.95, w: 1.1, h: 0.84, d: 0.92, specialIdx: 2 },
      { a: -1.26, r: 5.65, w: 1.08, h: 0.84, d: 0.92, specialIdx: 3 },
      { a: 1.56, r: 4.95, w: 1.14, h: 0.84, d: 0.94, specialIdx: 4 },
      { a: 2.24, r: 6.1, w: 1.1, h: 0.82, d: 0.94, specialIdx: 5 },
      { a: 2.92, r: 4.9, w: 1.08, h: 0.84, d: 0.92, specialIdx: 6 },
      { a: 3.68, r: 5.8, w: 1.14, h: 0.86, d: 0.96, specialIdx: 7 },
      { a: 4.38, r: 4.85, w: 1.08, h: 0.86, d: 0.92, specialIdx: 8 },
      { a: 5.18, r: 5.75, w: 1.12, h: 0.84, d: 0.94, specialIdx: 9 },

      // Abundant Inner & Mid Ring Decorative Luxury Gift Boxes (38 boxes with natural clusters & stacked towers!)
      { a: -0.18, r: 3.55, w: 0.96, h: 0.68, d: 0.84, wi: 4, ri: 1 },
      { a: 0.42, r: 3.62, w: 0.88, h: 0.72, d: 0.82, wi: 0, ri: 0 },
      { a: -0.82, r: 3.58, w: 0.98, h: 0.64, d: 0.84, wi: 1, ri: 0 },
      { a: 1.05, r: 3.6, w: 0.9, h: 0.74, d: 0.8, wi: 3, ri: 0 },
      { a: 1.72, r: 3.62, w: 0.92, h: 0.78, d: 0.84, wi: 1, ri: 0 },
      { a: 2.35, r: 3.58, w: 0.98, h: 0.66, d: 0.86, wi: 4, ri: 1 },
      { a: 3.04, r: 3.6, w: 0.94, h: 0.7, d: 0.84, wi: 3, ri: 0 },
      { a: 3.74, r: 3.58, w: 0.94, h: 0.74, d: 0.84, wi: 0, ri: 0 },
      { a: 4.48, r: 3.56, w: 0.96, h: 0.66, d: 0.86, wi: 5, ri: 1 },
      { a: 5.22, r: 3.6, w: 0.94, h: 0.72, d: 0.84, wi: 1, ri: 0 },
      { a: 5.78, r: 3.75, w: 0.86, h: 0.64, d: 0.78, wi: 4, ri: 1 },

      // Generous Mid-Outer Meadow Clusters (adds rich fullness around the tree & between special gifts)
      { a: -0.22, r: 4.48, w: 0.84, h: 0.56, d: 0.78, wi: 2, ri: 1 },
      { a: 0.52, r: 4.52, w: 0.92, h: 0.64, d: 0.8, wi: 5, ri: 1 },
      { a: -0.96, r: 4.56, w: 0.82, h: 0.58, d: 0.76, wi: 0, ri: 2 },
      { a: 1.18, r: 4.62, w: 0.86, h: 0.6, d: 0.78, wi: 4, ri: 0 },
      { a: 1.94, r: 4.68, w: 0.9, h: 0.62, d: 0.82, wi: 2, ri: 1 },
      { a: 2.58, r: 4.65, w: 0.84, h: 0.54, d: 0.76, wi: 1, ri: 0 },
      { a: 3.32, r: 4.58, w: 0.88, h: 0.62, d: 0.8, wi: 4, ri: 1 },
      { a: 4.04, r: 4.66, w: 0.82, h: 0.58, d: 0.76, wi: 3, ri: 0 },
      { a: 4.82, r: 4.58, w: 0.9, h: 0.6, d: 0.82, wi: 0, ri: 0 },
      { a: 5.56, r: 4.62, w: 0.86, h: 0.56, d: 0.78, wi: 2, ri: 1 },

      // Scattered Outer-Meadow Gift Accents (extending naturally into the snow clearing)
      { a: -0.34, r: 5.85, w: 0.74, h: 0.5, d: 0.68, wi: 3, ri: 0 },
      { a: 0.44, r: 5.72, w: 0.76, h: 0.52, d: 0.7, wi: 0, ri: 2 },
      { a: -0.88, r: 5.95, w: 0.78, h: 0.54, d: 0.72, wi: 5, ri: 1 },
      { a: 1.28, r: 5.85, w: 0.74, h: 0.48, d: 0.68, wi: 1, ri: 0 },
      { a: 2.66, r: 5.92, w: 0.76, h: 0.52, d: 0.7, wi: 2, ri: 0 },
      { a: 4.18, r: 5.88, w: 0.74, h: 0.5, d: 0.68, wi: 4, ri: 1 },
      { a: 5.64, r: 5.82, w: 0.78, h: 0.54, d: 0.72, wi: 3, ri: 0 },

      // Stacked Luxury Gift Towers (gives vertical sculptural silhouette around the tree skirt)
      { a: -0.18, r: 3.55, w: 0.56, h: 0.42, d: 0.52, wi: 2, ri: 1, stackY: 0.7 },
      { a: 0.42, r: 3.62, w: 0.52, h: 0.4, d: 0.5, wi: 5, ri: 1, stackY: 0.74 },
      { a: -0.82, r: 3.58, w: 0.54, h: 0.4, d: 0.5, wi: 4, ri: 0, stackY: 0.66 },
      { a: 1.05, r: 3.6, w: 0.52, h: 0.38, d: 0.48, wi: 0, ri: 0, stackY: 0.76 },
      { a: 1.72, r: 3.62, w: 0.54, h: 0.42, d: 0.52, wi: 2, ri: 1, stackY: 0.8 },
      { a: 2.35, r: 3.58, w: 0.54, h: 0.4, d: 0.5, wi: 0, ri: 0, stackY: 0.68 },
      { a: 3.04, r: 3.6, w: 0.52, h: 0.38, d: 0.48, wi: 5, ri: 1, stackY: 0.72 },
      { a: 3.74, r: 3.58, w: 0.56, h: 0.42, d: 0.52, wi: 4, ri: 0, stackY: 0.76 },
      { a: 4.48, r: 3.56, w: 0.52, h: 0.38, d: 0.5, wi: 0, ri: 0, stackY: 0.68 },
      { a: 5.22, r: 3.6, w: 0.54, h: 0.4, d: 0.5, wi: 2, ri: 1, stackY: 0.74 }
    ];

    for (const s of boxSpecs) {
      const lx = Math.sin(s.a) * s.r;
      const lz = Math.cos(s.a) * s.r;
      const worldX = lx * this.treeScale;
      const worldZ = lz * this.treeScale;
      const localY = (getTerrainHeight(worldX, worldZ) - baseY) / this.treeScale;

      const isSpecial = typeof s.specialIdx === 'number';
      const wMat = isSpecial
        ? specialWrapPalette[s.specialIdx % specialWrapPalette.length]
        : wrapMaterials[s.wi];
      const rMat = isSpecial ? specialRibbonMat : ribbonMaterials[s.ri];
      const cardData = isSpecial ? GIFT_CARDS[s.specialIdx] : null;

      const built = createBox(s.w, s.h, s.d, wMat, rMat, isSpecial, s.specialIdx, cardData);
      built.group.position.set(lx, localY + (s.stackY || 0) - 0.02, lz);
      built.group.rotation.y = isSpecial ? s.a : s.a + (this.rand() - 0.5) * 0.75;
      giftGroup.add(built.group);

      if (isSpecial) {
        built.hitMesh.userData.specialGiftIdx = s.specialIdx;
        this.specialGifts.push({
          idx: s.specialIdx,
          angle: s.a,
          group: built.group,
          lidPivot: built.lidPivot,
          auraSprite: built.auraSprite,
          innerLight: built.innerLight,
          interiorObj: built.interiorObj,
          hitMesh: built.hitMesh,
          cardData,
          discovered: false,
          isOpenNow: false,
          lidAngle: 0,
          cardLift: 0,
          boxHeight: s.h
        });
      }
    }

    this.group.add(giftGroup);
  }

  getSpecialGiftHitMeshes() {
    return this.specialGifts.map((g) => g.hitMesh);
  }

  setHoveredGift(idx) {
    this.hoveredGiftIdx = idx;
  }

  openGift(idx) {
    const gift = this.specialGifts.find((g) => g.idx === idx);
    if (!gift) return null;

    // Close any previously open gift gently so the current box is the star showcase
    for (const other of this.specialGifts) {
      if (other.idx !== idx) other.isOpenNow = false;
    }

    gift.discovered = true;
    gift.isOpenNow = true;

    this.group.updateMatrixWorld(true);
    const worldPos = new THREE.Vector3(0, gift.boxHeight * 0.75, 0).applyMatrix4(gift.group.matrixWorld);

    // Intimate hero close-up looking gently down into the hollow opened gift box!
    // Shift lookAt toward camera's RIGHT (+rightDir) so the opened 3D gift box + teddy bear + 3D card
    // appear cleanly centered in the LEFT half of the viewport — completely unobstructed by the right-side card!
    const outDir = new THREE.Vector3(Math.sin(gift.angle), 0, Math.cos(gift.angle)).normalize();
    const cameraRight = new THREE.Vector3(outDir.z, 0, -outDir.x);

    const camPos = worldPos
      .clone()
      .addScaledVector(outDir, 3.65)
      .addScaledVector(cameraRight, 0.85);
    camPos.y = Math.max(getTerrainHeight(camPos.x, camPos.z) + 1.5, worldPos.y + 2.35);

    const lookAt = worldPos
      .clone()
      .addScaledVector(cameraRight, 1.38)
      .add(new THREE.Vector3(0, 0.16, 0));

    return {
      gift,
      worldPos,
      camPos,
      lookAt,
      cardData: gift.cardData
    };
  }

  closeGift(idx) {
    const gift = this.specialGifts.find((g) => g.idx === idx);
    if (gift) {
      gift.isOpenNow = false;
    }
  }

  buildTreeLighting() {
    // Warm golden internal & perimeter lights bathing the grand tree, encircling gifts, and snowy meadow at night
    this.treeGlowLower = new THREE.PointLight('#ffbe6e', 22, 34, 1.5);
    this.treeGlowLower.position.set(0, 2.8, 3.8);
    this.group.add(this.treeGlowLower);

    this.treeGlowBack = new THREE.PointLight('#ffbe6e', 16, 28, 1.55);
    this.treeGlowBack.position.set(0, 4.4, -3.6);
    this.group.add(this.treeGlowBack);

    this.starLight = new THREE.PointLight('#ffd27d', 20, 32, 1.5);
    this.starLight.position.set(0, this.treeHeight + 0.5, 0.35);
    this.group.add(this.starLight);
  }

  update(elapsedTime, dt, dayState) {
    this.windUniforms.uTime.value = elapsedTime;
    this.swayUniforms.uTime.value = elapsedTime;

    const lf = dayState.treeLightFactor;
    const warmPulse = 0.94 + 0.06 * Math.sin(elapsedTime * 1.9);

    this.fairyLightMat.uniforms.uTime.value = elapsedTime;
    this.fairyLightMat.uniforms.uIntensity.value = 0.14 + lf * 1.15;

    // 1. Animate Golden Starlight Cascade Wave synchronized with the 3 descending spiral ribbons!
    let starBurstBoost = this.starHovered ? 0.45 : 0.0;
    if (this.starWaveTimer >= 0) {
      this.starWaveTimer += dt;
      const waveDuration = 3.65;
      const p = this.starWaveTimer / waveDuration;
      if (p >= 1.0) {
        this.starWaveTimer = -1;
        this.fairyLightMat.uniforms.uWaveBoost.value = 0.0;
      } else {
        // Wave travels gracefully in sync with the 3 spiraling stardust ribbons from crown down to skirt
        this.fairyLightMat.uniforms.uWaveY.value = 11.7 - Math.pow(p, 0.94) * 11.3;
        this.fairyLightMat.uniforms.uWaveBoost.value = Math.sin(p * Math.PI) * 1.65;
        starBurstBoost += Math.exp(-p * 3.2) * 1.75;
      }
    }

    // Star topper radiance, hover swell & graceful rotation
    this.starMat.emissiveIntensity = (0.25 + lf * 2.15 + starBurstBoost * 1.4) * warmPulse;
    this.starHaloMat.opacity = Math.min(1.0, (0.1 + lf * 0.82 + starBurstBoost * 0.35) * warmPulse);
    const haloScale = 3.4 + starBurstBoost * 1.6;
    this.starHalo.scale.set(haloScale, haloScale, 1);
    this.starGroup.rotation.y = Math.sin(elapsedTime * 0.35) * 0.14 + (this.starWaveTimer >= 0 ? this.starWaveTimer * 1.8 : 0);

    // Gold silk ribbon catches warm star wave light
    this.ribbonMat.emissiveIntensity = 0.04 + lf * 0.32 + starBurstBoost * 0.35;

    // Warm festive light pool onto meadow & gifts
    this.treeGlowLower.intensity = (lf * 17.5 + starBurstBoost * 12.0) * warmPulse;
    this.treeGlowBack.intensity = (lf * 13.0 + starBurstBoost * 8.0) * warmPulse;
    this.starLight.intensity = (lf * 19.0 + starBurstBoost * 24.0) * warmPulse;

    // 2. Animate Physical Damped Pendulum Swings on Clicked Ornaments!
    if (this.activeSwings.length > 0) {
      const mat4 = new THREE.Matrix4();
      const rotQ = new THREE.Quaternion();
      const pivotOffset = new THREE.Vector3();
      const pos = new THREE.Vector3();
      const quat = new THREE.Quaternion();
      const dirtyMeshes = new Set();

      for (let i = this.activeSwings.length - 1; i >= 0; i--) {
        const sw = this.activeSwings[i];
        sw.age += dt;
        const done = sw.age >= sw.duration;
        const angle = done
          ? 0
          : sw.amp * Math.exp(-sw.age * 1.85) * Math.sin(sw.age * 11.5);

        // Rotate around hanging cap slightly above ornament center
        rotQ.setFromAxisAngle(sw.axis, angle);
        quat.copy(rotQ).multiply(sw.base.quat);
        pivotOffset.set(0, -0.18 * sw.base.scale.y, 0).applyQuaternion(rotQ);
        pos.copy(sw.base.pos).add(new THREE.Vector3(0, 0.18 * sw.base.scale.y, 0)).add(pivotOffset);

        mat4.compose(pos, quat, sw.base.scale);
        sw.mesh.setMatrixAt(sw.instanceId, mat4);
        dirtyMeshes.add(sw.mesh);

        if (done) this.activeSwings.splice(i, 1);
      }
      dirtyMeshes.forEach((m) => {
        m.instanceMatrix.needsUpdate = true;
      });
    }

    // 3. Animate the 10 Special Hollow Mystery Gift Boxes (hinged lid, rising 3D card inside box, showcase interior light!)
    for (let i = 0; i < this.specialGifts.length; i++) {
      const g = this.specialGifts[i];
      const isHovered = this.hoveredGiftIdx === g.idx;
      const pulse = 0.5 + 0.5 * Math.sin(elapsedTime * 2.4 + g.idx * 0.9);

      // Hinged hollow lid opens smoothly wide backward when active, peeks softly on hover, closes cleanly when dismissed
      const goalLid = g.isOpenNow ? -1.86 : (isHovered ? -0.24 : 0.0);
      g.lidAngle += (goalLid - g.lidAngle) * Math.min(1, dt * 7.8);
      g.lidPivot.rotation.x = g.lidAngle;

      // Physical 3D vintage card nestled right inside the hollow box rises proudly when lid opens!
      if (g.interiorObj) {
        const goalLift = g.isOpenNow ? 1.0 : 0.0;
        g.cardLift += (goalLift - g.cardLift) * Math.min(1, dt * 5.8);
        const io = g.interiorObj;
        io.cardMesh.position.y = THREE.MathUtils.lerp(io.cardClosedY, io.cardOpenY, g.cardLift);
        io.cardMesh.rotation.x = THREE.MathUtils.lerp(-0.18, -0.05, g.cardLift);
        // Subtle gentle joyful bob on the miniature 3D keepsake when revealed
        if (g.isOpenNow) {
          io.keepsake.rotation.y = 0.24 + Math.sin(elapsedTime * 1.6 + g.idx) * 0.12;
        }
      }

      // Soft warm golden light showcasing the teddy bear / snow globe & nestled 3D card inside the hollow box!
      if (g.innerLight) {
        const goalLight = g.isOpenNow ? 5.2 : 0.0;
        g.innerLight.intensity += (goalLight - g.innerLight.intensity) * Math.min(1, dt * 6.5);
      }

      // Golden breathing aura dims down cleanly while open so it never washes out the cute 3D gift inside!
      const baseOp = g.isOpenNow ? 0.14 : (g.discovered ? 0.22 : (0.36 + pulse * 0.26));
      const targetOp = isHovered && !g.isOpenNow ? 0.82 : baseOp;
      g.auraSprite.material.opacity += (targetOp - g.auraSprite.material.opacity) * Math.min(1, dt * 8.0);
      g.auraSprite.material.color.setHex(isHovered ? 0xfff2c2 : (g.discovered ? 0x9ef0d4 : 0xffd778));
    }
  }
}
