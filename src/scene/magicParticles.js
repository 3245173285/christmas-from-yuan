import * as THREE from 'three';
import { createSoftGlowTexture } from '../utils/textures.js';

// GPU-Friendly 3D Magic Stardust Particle System & Top-to-Bottom Spiral Ribbon Choreography
// Powers:
// 1. Star Topper Click -> Radiant Crown Burst + 3 Synchronized Spiraling Starlight Comet Ribbons
//    wrapping 4.5 graceful turns down the Christmas tree contour + Expanding Golden Ground Ring Finale!
// 2. Gift Box Unboxing -> Joyful Golden Fairy-Dust Eruption
// 3. Ornament Chimes -> Crisp Diamond-Gold Musical Sparkles

export class MagicParticles {
  constructor(scene, maxCount = 3600) {
    this.scene = scene;
    this.maxCount = maxCount;
    this.cursor = 0;

    this.positions = new Float32Array(maxCount * 3);
    this.velocities = new Float32Array(maxCount * 3);
    this.colors = new Float32Array(maxCount * 3);
    this.sizes = new Float32Array(maxCount);
    this.ages = new Float32Array(maxCount);
    this.lifetimes = new Float32Array(maxCount);
    this.drags = new Float32Array(maxCount);
    this.gravities = new Float32Array(maxCount);
    this.swirls = new Float32Array(maxCount);

    for (let i = 0; i < maxCount; i++) {
      this.ages[i] = 999;
      this.lifetimes[i] = 1;
      this.sizes[i] = 0;
    }

    this.geo = new THREE.BufferGeometry();
    this.geo.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.geo.setAttribute('aColor', new THREE.BufferAttribute(this.colors, 3));
    this.geo.setAttribute('aSize', new THREE.BufferAttribute(this.sizes, 1));
    this.geo.setAttribute('aLifeRatio', new THREE.BufferAttribute(new Float32Array(maxCount), 1));

    this.mat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uTime: { value: 0 },
        uPixelRatio: { value: Math.min(window.devicePixelRatio || 1, 2) }
      },
      vertexShader: /* glsl */ `
        attribute vec3 aColor;
        attribute float aSize;
        attribute float aLifeRatio;
        uniform float uTime;
        uniform float uPixelRatio;
        varying vec3 vColor;
        varying float vAlpha;

        void main() {
          vColor = aColor;
          float fadeIn = smoothstep(0.0, 0.09, aLifeRatio);
          float fadeOut = pow(max(0.0, 1.0 - aLifeRatio), 1.38);
          float twinkle = 0.68 + 0.32 * sin(uTime * 15.0 + position.x * 6.9 + position.y * 5.3 + position.z * 4.7);
          vAlpha = fadeIn * fadeOut * twinkle;

          vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
          gl_Position = projectionMatrix * mvPos;
          gl_PointSize = clamp((205.0 * aSize * (0.52 + 0.68 * fadeOut) * uPixelRatio) / max(1.0, -mvPos.z), 0.0, 48.0);
        }
      `,
      fragmentShader: /* glsl */ `
        precision highp float;
        varying vec3 vColor;
        varying float vAlpha;

        void main() {
          if (vAlpha <= 0.01) discard;
          vec2 uv = gl_PointCoord - 0.5;
          float d = length(uv);
          if (d > 0.5) discard;
          // Crisp 4-pointed diamond starlight + velvety bokeh halo
          float core = exp(-d * d * 44.0);
          float crossStar = exp(-abs(uv.x) * 28.0) * exp(-abs(uv.y) * 5.2)
                          + exp(-abs(uv.y) * 28.0) * exp(-abs(uv.x) * 5.2);
          float halo = exp(-d * d * 10.5) * 0.48;
          float lum = core * 1.5 + crossStar * 0.62 + halo;
          gl_FragColor = vec4(vColor * (1.28 + core * 0.72), clamp(lum * vAlpha, 0.0, 1.0));
        }
      `
    });

    this.points = new THREE.Points(this.geo, this.mat);
    this.points.frustumCulled = false;
    scene.add(this.points);

    // 3 Glowing Orbiting Fairy-Comet Head Sprites leading the top-to-bottom spirals!
    this.activeSpirals = [];
    const cometTex = createSoftGlowTexture(128, 'rgba(255,252,232,1)', 'rgba(255,214,118,0.52)');
    this.cometSprites = [];
    const cometColors = ['#ffe9a6', '#fff8e2', '#a8f8e0'];
    for (let i = 0; i < 3; i++) {
      const sm = new THREE.SpriteMaterial({
        map: cometTex,
        color: cometColors[i],
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });
      const sp = new THREE.Sprite(sm);
      sp.visible = false;
      scene.add(sp);
      this.cometSprites.push(sp);
    }
  }

  spawnParticle(x, y, z, vx, vy, vz, r, g, b, size, life, gravity = -1.6, drag = 0.985, swirl = 0) {
    const i = this.cursor;
    this.cursor = (this.cursor + 1) % this.maxCount;

    this.positions[i * 3] = x;
    this.positions[i * 3 + 1] = y;
    this.positions[i * 3 + 2] = z;

    this.velocities[i * 3] = vx;
    this.velocities[i * 3 + 1] = vy;
    this.velocities[i * 3 + 2] = vz;

    this.colors[i * 3] = r;
    this.colors[i * 3 + 1] = g;
    this.colors[i * 3 + 2] = b;

    this.sizes[i] = size;
    this.ages[i] = 0;
    this.lifetimes[i] = life;
    this.gravities[i] = gravity;
    this.drags[i] = drag;
    this.swirls[i] = swirl;
  }

  // Grand Multi-Layer Starlight Symphony triggered when clicking the Tree-Top Golden Star!
  // Layer 1: Radiant expanding golden crown burst & diamond ring right at the star
  // Layer 2: 3 synchronized luminous spiral stardust streams orbiting 4.5 turns from tree top down to base
  // Layer 3: Expanding golden stardust wave blooming across the snow & gift ring at finale!
  emitStarCascade(origin) {
    // 1. Radiant Star Crown Burst + Horizontal Expanding Star Halo Ring
    for (let k = 0; k < 180; k++) {
      const a = (k / 180) * Math.PI * 2 + (Math.random() - 0.5) * 0.15;
      const isRing = k < 72;
      const speed = isRing ? (3.2 + Math.random() * 1.4) : (1.5 + Math.random() * 4.8);
      const vy = isRing ? ((Math.random() - 0.5) * 0.65) : (0.8 + Math.random() * 4.2);

      const roll = Math.random();
      let r = 1.0, g = 0.88, b = 0.46;
      if (roll > 0.68) {
        r = 1.0; g = 0.97; b = 0.86; // diamond white
      } else if (roll < 0.18) {
        r = 0.52; g = 0.98; b = 0.84; // aurora emerald accent
      }

      this.spawnParticle(
        origin.x + (Math.random() - 0.5) * 0.35,
        origin.y + (Math.random() - 0.5) * 0.35,
        origin.z + (Math.random() - 0.5) * 0.35,
        Math.cos(a) * speed,
        vy,
        Math.sin(a) * speed,
        r, g, b,
        isRing ? (1.05 + Math.random() * 0.9) : (0.8 + Math.random() * 1.4),
        1.6 + Math.random() * 1.4,
        isRing ? -0.45 : -1.85,
        0.978,
        0.4
      );
    }

    // 2. Launch 3 Synchronized Spiraling Starlight Streams orbiting gracefully from crown to base!
    const topY = origin.y;
    const baseY = Math.max(0.55, origin.y - 13.8);
    this.activeSpirals = [
      {
        cx: origin.x,
        cz: origin.z,
        topY,
        baseY,
        age: 0,
        duration: 3.65,
        turns: 4.5,
        angleOffset: 0.0,
        colorA: [1.0, 0.88, 0.44],   // Champagne Gold
        colorB: [1.0, 0.98, 0.86],   // Diamond White
        spriteIdx: 0,
        finaleDone: false
      },
      {
        cx: origin.x,
        cz: origin.z,
        topY,
        baseY,
        age: -0.14,
        duration: 3.65,
        turns: 4.5,
        angleOffset: (Math.PI * 2) / 3,
        colorA: [1.0, 0.95, 0.74],   // Warm Starlight Ivory
        colorB: [1.0, 0.78, 0.36],   // Rich Amber Gold
        spriteIdx: 1,
        finaleDone: false
      },
      {
        cx: origin.x,
        cz: origin.z,
        topY,
        baseY,
        age: -0.28,
        duration: 3.65,
        turns: 4.5,
        angleOffset: (Math.PI * 4) / 3,
        colorA: [0.58, 0.98, 0.84],  // Delicate Northern-Lights Mint
        colorB: [1.0, 0.92, 0.56],   // Soft Gold
        spriteIdx: 2,
        finaleDone: false
      }
    ];
  }

  emitSpiralGroundFinale(cx, baseY, cz) {
    // Graceful golden stardust wave blooming outward around the tree base & 34 gift boxes!
    const count = 160;
    for (let k = 0; k < count; k++) {
      const a = (k / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.1;
      const startR = 4.6 + Math.random() * 0.9;
      const outSpd = 1.8 + Math.random() * 2.8;
      const warm = Math.random();
      this.spawnParticle(
        cx + Math.cos(a) * startR,
        baseY + 0.3 + Math.random() * 0.6,
        cz + Math.sin(a) * startR,
        Math.cos(a) * outSpd,
        0.55 + Math.random() * 1.45,
        Math.sin(a) * outSpd,
        warm > 0.2 ? 1.0 : 0.62,
        warm > 0.2 ? (0.86 + warm * 0.12) : 0.96,
        warm > 0.2 ? (0.44 + warm * 0.38) : 0.85,
        0.85 + Math.random() * 1.25,
        1.5 + Math.random() * 1.2,
        -0.85,
        0.972,
        0.7
      );
    }
  }

  // Joyful golden fairy-dust fountain erupting upward from an opened special gift box
  emitGiftBurst(origin) {
    const count = 190;
    for (let k = 0; k < count; k++) {
      const a = Math.random() * Math.PI * 2;
      const radial = 0.4 + Math.random() * 2.2;
      const vy = 2.2 + Math.random() * 4.2;
      const warm = Math.random();
      const r = 1.0;
      const g = warm > 0.4 ? 0.84 : 0.95;
      const b = warm > 0.4 ? 0.42 : 0.78;

      this.spawnParticle(
        origin.x + (Math.random() - 0.5) * 0.5,
        origin.y,
        origin.z + (Math.random() - 0.5) * 0.5,
        Math.cos(a) * radial,
        vy,
        Math.sin(a) * radial,
        r, g, b,
        0.65 + Math.random() * 1.25,
        1.5 + Math.random() * 1.4,
        -2.4,
        0.982,
        0.8
      );
    }
  }

  // Crisp musical chime sparkle burst when clicking an ornament
  emitOrnamentChime(origin) {
    const count = 48;
    for (let k = 0; k < count; k++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 0.7 + Math.random() * 2.1;
      const vy = 0.5 + Math.random() * 1.9;
      const isSilver = Math.random() > 0.5;
      this.spawnParticle(
        origin.x,
        origin.y,
        origin.z,
        Math.cos(a) * sp,
        vy,
        Math.sin(a) * sp,
        isSilver ? 0.94 : 1.0,
        isSilver ? 0.98 : 0.88,
        isSilver ? 1.0 : 0.45,
        0.78 + Math.random() * 1.15,
        1.0 + Math.random() * 0.85,
        -1.3,
        0.96,
        0.0
      );
    }
  }

  updateSpirals(dt) {
    if (this.activeSpirals.length === 0) return;

    let anyAlive = false;
    for (let sIdx = 0; sIdx < this.activeSpirals.length; sIdx++) {
      const sp = this.activeSpirals[sIdx];
      sp.age += dt;
      const sprite = this.cometSprites[sp.spriteIdx];

      if (sp.age < 0) {
        anyAlive = true;
        if (sprite) sprite.visible = false;
        continue;
      }

      const p = sp.age / sp.duration;
      if (p >= 1.0) {
        if (!sp.finaleDone) {
          sp.finaleDone = true;
          if (sIdx === 0) {
            this.emitSpiralGroundFinale(sp.cx, sp.baseY, sp.cz);
          }
        }
        if (sprite) sprite.visible = false;
        continue;
      }

      anyAlive = true;

      // Smooth ease-in-out descent while orbiting around the full conical silhouette of the Christmas tree!
      const prevP = Math.max(0, (sp.age - dt) / sp.duration);
      const subSteps = 6;

      let headX = sp.cx;
      let headY = sp.topY;
      let headZ = sp.cz;

      for (let step = 1; step <= subSteps; step++) {
        const t = prevP + (p - prevP) * (step / subSteps);
        const y = THREE.MathUtils.lerp(sp.topY, sp.baseY, Math.pow(t, 0.94));
        // Hug gracefully just outside the lush tiered spruce boughs from crown (0.4m) down to skirt (5.55m)
        const radius = 0.42 + Math.pow(t, 0.86) * 5.25 + Math.sin(t * Math.PI * 6.0) * 0.16;
        const theta = sp.angleOffset + t * Math.PI * 2 * sp.turns;

        const px = sp.cx + Math.cos(theta) * radius;
        const pz = sp.cz + Math.sin(theta) * radius;
        headX = px;
        headY = y;
        headZ = pz;

        // Tangential velocity along the spiral + gentle drifting stardust wake
        const tanX = -Math.sin(theta);
        const tanZ = Math.cos(theta);

        // Emit 3 lush ribbon stardust particles per substep (~18 particles per comet per frame!)
        for (let k = 0; k < 3; k++) {
          const mixC = Math.random();
          const r = sp.colorA[0] * (1 - mixC) + sp.colorB[0] * mixC;
          const g = sp.colorA[1] * (1 - mixC) + sp.colorB[1] * mixC;
          const b = sp.colorA[2] * (1 - mixC) + sp.colorB[2] * mixC;

          const spread = k === 0 ? 0.08 : 0.36;
          const isSpark = k === 0;
          this.spawnParticle(
            px + (Math.random() - 0.5) * spread,
            y + (Math.random() - 0.5) * spread,
            pz + (Math.random() - 0.5) * spread,
            tanX * (0.35 + Math.random() * 0.65) + Math.cos(theta) * (0.15 + Math.random() * 0.45),
            -0.25 + (Math.random() - 0.5) * 0.65,
            tanZ * (0.35 + Math.random() * 0.65) + Math.sin(theta) * (0.15 + Math.random() * 0.45),
            r, g, b,
            isSpark ? (1.05 + Math.random() * 0.85) : (0.55 + Math.random() * 0.95),
            isSpark ? (1.35 + Math.random() * 0.9) : (1.75 + Math.random() * 1.25),
            -0.38,
            0.976,
            0.35
          );
        }
      }

      // Move glowing fairy-comet head sprite cleanly along the spiral path!
      if (sprite) {
        sprite.visible = true;
        sprite.position.set(headX, headY, headZ);
        const fade = Math.sin(p * Math.PI);
        sprite.material.opacity = 0.88 * Math.min(1, fade * 3.2);
        const sc = 2.0 + Math.sin(p * Math.PI * 10) * 0.35;
        sprite.scale.set(sc, sc, 1);
      }
    }

    if (!anyAlive) {
      this.activeSpirals = [];
    }
  }

  update(elapsedTime, dt) {
    this.mat.uniforms.uTime.value = elapsedTime;
    this.updateSpirals(dt);

    const lifeRatioAttr = this.geo.attributes.aLifeRatio;
    const lifeArr = lifeRatioAttr.array;

    let anyActive = false;
    for (let i = 0; i < this.maxCount; i++) {
      if (this.ages[i] >= this.lifetimes[i]) {
        lifeArr[i] = 1.0;
        this.sizes[i] = 0;
        continue;
      }
      anyActive = true;
      this.ages[i] += dt;
      const ratio = Math.min(1.0, this.ages[i] / this.lifetimes[i]);
      lifeArr[i] = ratio;

      const idx = i * 3;
      const drag = Math.pow(this.drags[i], dt * 60);
      this.velocities[idx] *= drag;
      this.velocities[idx + 1] = this.velocities[idx + 1] * drag + this.gravities[i] * dt;
      this.velocities[idx + 2] *= drag;

      if (this.swirls[i] > 0.01) {
        const sw = this.swirls[i] * dt;
        const px = this.positions[idx];
        const pz = this.positions[idx + 2];
        const len = Math.max(0.4, Math.hypot(px, pz));
        this.velocities[idx] += (-pz / len) * sw;
        this.velocities[idx + 2] += (px / len) * sw;
      }

      this.positions[idx] += this.velocities[idx] * dt;
      this.positions[idx + 1] += this.velocities[idx + 1] * dt;
      this.positions[idx + 2] += this.velocities[idx + 2] * dt;
    }

    if (anyActive) {
      this.geo.attributes.position.needsUpdate = true;
      this.geo.attributes.aColor.needsUpdate = true;
      this.geo.attributes.aSize.needsUpdate = true;
      lifeRatioAttr.needsUpdate = true;
    }
  }
}
