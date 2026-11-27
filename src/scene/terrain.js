import * as THREE from 'three';
import { fbm2D, getPathFactor, getTerrainHeight, smoothstep, WATER_LEVEL } from '../utils/noise.js';

// Photorealistic Nordic Terrain with:
// 1. Per-pixel 3D Bump-Mapped Alpine Granite Crags (dFdx/dFdy procedural micro-normal relief!)
// 2. Authentic Lofoten Dark Granite Mountain Faces (~60-70% exposed dark craggy rock + crisp snow-filled gullies & ridges — never bright solid white lumps!)
// 3. Real-time Diurnal Lowland Snow Accumulation (snow-covered meadow at night -> partial natural melt into lush green grass by day)

export class NordicTerrain {
  constructor(scene, perf) {
    const size = 1140;
    const segs = Math.min(300, perf.terrainSegments + 36);

    const geo = new THREE.PlaneGeometry(size, size, segs, segs);
    geo.rotateX(-Math.PI / 2);

    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      pos.setY(i, getTerrainHeight(x, z));
    }
    geo.computeVertexNormals();

    const norm = geo.attributes.normal;
    const colors = new Float32Array(pos.count * 3);
    const pathAttr = new Float32Array(pos.count);

    const colMeadowDeep = new THREE.Color('#1c361f');
    const colMeadowRich = new THREE.Color('#2c4b29');
    const colMeadowMoss = new THREE.Color('#3c552c');
    const colPath = new THREE.Color('#534638');
    const colShoreWet = new THREE.Color('#272d34');
    const colShorePebble = new THREE.Color('#454a52');
    const colRockBase = new THREE.Color('#1f2632');
    const tmp = new THREE.Color();

    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const z = pos.getZ(i);
      const slope = 1.0 - norm.getY(i);

      const n1 = fbm2D(x * 0.024 + 1.7, z * 0.024 - 2.3, 3) * 0.5 + 0.5;
      const n2 = fbm2D(x * 0.088 - 4.1, z * 0.088 + 3.4, 2) * 0.5 + 0.5;

      tmp.copy(colMeadowDeep).lerp(colMeadowRich, n1);
      tmp.lerp(colMeadowMoss, smoothstep(0.54, 0.85, n2) * 0.44);

      const pathF = getPathFactor(x, z);
      pathAttr[i] = pathF;
      if (pathF > 0.01) {
        tmp.lerp(colPath, pathF * 0.82);
      }

      // Dark granite substrate on mountain slopes
      const rockMask = Math.max(smoothstep(0.12, 0.32, slope), smoothstep(12.0, 28.0, y) * 0.95);
      tmp.lerp(colRockBase, rockMask);

      const shoreBand = 1.0 - smoothstep(WATER_LEVEL - 0.6, WATER_LEVEL + 1.35, y);
      const wetBlend = 1.0 - smoothstep(WATER_LEVEL - 0.5, WATER_LEVEL + 0.45, y);
      const shoreCol = colShorePebble.clone().lerp(colShoreWet, wetBlend);
      tmp.lerp(shoreCol, shoreBand * 0.86);

      colors[i * 3] = tmp.r;
      colors[i * 3 + 1] = tmp.g;
      colors[i * 3 + 2] = tmp.b;
    }

    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.setAttribute('aPath', new THREE.BufferAttribute(pathAttr, 1));

    this.uniforms = {
      uSnowCover: { value: 0.92 },
      uWaterLevel: { value: WATER_LEVEL },
      uNightFactor: { value: 1.0 }
    };

    const mat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.9,
      metalness: 0.02
    });

    mat.onBeforeCompile = (shader) => {
      shader.uniforms.uSnowCover = this.uniforms.uSnowCover;
      shader.uniforms.uWaterLevel = this.uniforms.uWaterLevel;
      shader.uniforms.uNightFactor = this.uniforms.uNightFactor;

      shader.vertexShader = shader.vertexShader.replace(
        '#include <common>',
        `#include <common>
         attribute float aPath;
         varying vec3 vWorldPos;
         varying vec3 vWorldNorm;
         varying float vPath;`
      );
      shader.vertexShader = shader.vertexShader.replace(
        '#include <worldpos_vertex>',
        `#include <worldpos_vertex>
         vWorldPos = (modelMatrix * vec4(transformed, 1.0)).xyz;
         vWorldNorm = normalize(mat3(modelMatrix) * objectNormal);
         vPath = aPath;`
      );

      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <common>',
        `#include <common>
         uniform float uSnowCover;
         uniform float uWaterLevel;
         uniform float uNightFactor;
         varying vec3 vWorldPos;
         varying vec3 vWorldNorm;
         varying float vPath;

         float tHash(vec2 p) {
           p = fract(p * vec2(127.1, 311.7));
           p += dot(p, p + 34.5);
           return fract(p.x * p.y);
         }
         float tNoise(vec2 p) {
           vec2 i = floor(p);
           vec2 f = fract(p);
           f = f * f * (3.0 - 2.0 * f);
           return mix(
             mix(tHash(i), tHash(i + vec2(1.0, 0.0)), f.x),
             mix(tHash(i + vec2(0.0, 1.0)), tHash(i + vec2(1.0, 1.0)), f.x),
             f.y
           );
         }
         float tFbm(vec2 p) {
           float v = 0.0;
           float a = 0.5;
           mat2 rot = mat2(0.8, 0.6, -0.6, 0.8);
           for (int i = 0; i < 4; i++) {
             v += a * tNoise(p);
             p = rot * p * 2.05 + vec2(7.3, 4.1);
             a *= 0.5;
           }
           return v;
         }
         float tRidged(vec2 p) {
           float v = 0.0;
           float a = 0.55;
           mat2 rot = mat2(0.8, -0.6, 0.6, 0.8);
           for (int i = 0; i < 5; i++) {
             float n = 1.0 - abs(tNoise(p) * 2.0 - 1.0);
             v += n * n * a;
             p = rot * p * 2.15 + vec2(3.7, 9.2);
             a *= 0.5;
           }
           return v;
         }`
      );

      // Compute authentic Lofoten rocky mountain faces + carved snow couloirs + live diurnal lowland snow
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <color_fragment>',
        `#include <color_fragment>
         vec3 wN = normalize(vWorldNorm);
         float slope = 1.0 - clamp(wN.y, 0.0, 1.0);
         float elev = vWorldPos.y;

         // 1. Multi-Scale Lofoten Granite Crag Structure (deep slate-blue/charcoal rock faces with sharp fractures)
         float mountainZone = clamp(smoothstep(9.0, 24.0, elev) + smoothstep(0.11, 0.28, slope) * 0.75, 0.0, 1.0);

         float strataWarp = tFbm(vWorldPos.xz * 0.018) * 16.0;
         float strata = tNoise(vec2((elev + strataWarp) * 0.24, (vWorldPos.x - vWorldPos.z) * 0.02));
         // Sharp eroded rock ribs & vertical alpine couloir gullies
         float cragRibs = tRidged(vWorldPos.xz * 0.032 + vec2(elev * 0.022, -elev * 0.016));
         float fineCrags = tRidged(vWorldPos.xz * 0.11 + vec2(elev * 0.06, 0.0));
         float rockReliefH = cragRibs * 0.65 + fineCrags * 0.35;

         // Moody realistic Scandinavian granite palette (dark charcoal-slate crevices -> cool steel-granite ribs)
         vec3 graniteCrevice = vec3(0.055, 0.072, 0.105);
         vec3 graniteMid     = vec3(0.135, 0.16, 0.205);
         vec3 graniteRidge   = vec3(0.24, 0.27, 0.32);
         vec3 alpineRock = mix(graniteCrevice, graniteMid, smoothstep(0.18, 0.68, strata * 0.5 + cragRibs * 0.5));
         alpineRock = mix(alpineRock, graniteRidge, smoothstep(0.55, 0.92, fineCrags) * 0.55);
         alpineRock *= (0.68 + 0.48 * smoothstep(0.2, 0.85, cragRibs));

         diffuseColor.rgb = mix(diffuseColor.rgb, alpineRock, mountainZone);

         // Meadow surface micro-grain
         float meadowMicro = tNoise(vWorldPos.xz * 0.38) * 0.55 + tNoise(vWorldPos.xz * 1.65) * 0.45;
         diffuseColor.rgb *= mix(0.84 + meadowMicro * 0.32, 1.0, mountainZone * 0.85);

         // 2. Authentic Lofoten Snow Distribution on Mountains:
         // Instead of painting the whole mountain flat white, snow settles into eroded gullies, saddles,
         // windward ledges, and high ridge crests, letting dramatic dark granite crags dominate (~60% rock / ~40% snow)!
         float snowNoiseLarge = tFbm(vWorldPos.xz * 0.013 + vec2(4.2, -3.1));
         float snowNoiseMed   = tFbm(vWorldPos.xz * 0.052 - vec2(2.7, 5.4));
         float alpineSnowLine = 18.0 + (snowNoiseLarge - 0.5) * 20.0 + (snowNoiseMed - 0.5) * 8.0;

         // Gullies (low cragRibs) trap snow thickly; rocky protruding ribs (high cragRibs) shed snow cleanly!
         float gullyTrap = (0.55 - cragRibs) * 0.24 + (0.5 - fineCrags) * 0.12;
         float effectiveSlope = slope - gullyTrap;
         // Steep or protruding granite faces stay bare dark rock!
         float alpineSnow = smoothstep(alpineSnowLine, alpineSnowLine + 24.0, elev)
                          * (1.0 - smoothstep(0.06, 0.21, effectiveSlope));
         // Crisp thin wind-blown snow ribbons clinging to horizontal rock ledges & summit crests
         float ledgeRibbons = smoothstep(26.0, 56.0, elev)
                            * smoothstep(0.62, 0.84, strata * 0.6 + snowNoiseMed * 0.4)
                            * (1.0 - smoothstep(0.22, 0.42, slope)) * 0.72;
         alpineSnow = clamp(max(alpineSnow, ledgeRibbons), 0.0, 1.0);

         // 3. Dynamic Diurnal Lowland Snow Accumulation & Daytime Partial Melt
         float aboveWater = smoothstep(uWaterLevel + 0.18, uWaterLevel + 1.05, elev);
         float meltPattern = tFbm(vWorldPos.xz * 0.032 + vec2(1.9, 6.3)) * 0.62
                           + tFbm(vWorldPos.xz * 0.13 - vec2(4.4, 2.1)) * 0.38;
         float treeWarmth = (1.0 - smoothstep(2.5, 8.5, length(vWorldPos.xz))) * 0.16;
         float pathMelt = vPath * 0.22;
         float threshold = 1.0 - clamp(uSnowCover - treeWarmth - pathMelt, 0.0, 1.0);
         // Fade lowland blanket out naturally on steep foothills so mountains keep their dark rocky Lofoten character
         float lowlandZone = 1.0 - smoothstep(10.0, 22.0, elev);
         float lowlandSnow = smoothstep(threshold - 0.14, threshold + 0.12, meltPattern)
                           * aboveWater * lowlandZone * (1.0 - smoothstep(0.18, 0.42, slope));

         float totalSnow = max(alpineSnow, lowlandSnow);

         // Restrained, photographic Nordic snow tone (never glaring/chalky white at night!)
         vec3 daySnowWhite   = vec3(0.82, 0.87, 0.93);
         vec3 nightSnowBlue  = vec3(0.46, 0.56, 0.68); // Atmospheric cool moonlit alpine snow (prevents bright white mountain blowout!)
         vec3 nearSnowTone   = mix(vec3(0.76, 0.82, 0.90), daySnowWhite, 1.0 - uNightFactor);
         vec3 farSnowTone    = mix(nightSnowBlue, daySnowWhite * 0.92, 1.0 - uNightFactor);

         float distFade = smoothstep(48.0, 240.0, length(vWorldPos.xz));
         vec3 snowTarget = mix(nearSnowTone, farSnowTone, distFade);
         vec3 snowShadow = mix(vec3(0.26, 0.35, 0.48), vec3(0.56, 0.67, 0.80), 1.0 - uNightFactor);
         vec3 snowCol = mix(snowShadow, snowTarget, 0.45 + 0.55 * snowNoiseMed);

         // Subtle crystalline snow sparkle on nearby meadow snow
         float sparkle = smoothstep(0.958, 0.998, tNoise(vWorldPos.xz * 9.5 + vec2(elev * 3.0, 0.0)));
         snowCol += vec3(0.16, 0.20, 0.25) * sparkle * (1.0 - distFade);

         // Damp darkened rim where snow melts on the meadow during daytime
         float meltRim = smoothstep(0.04, 0.22, lowlandSnow) * (1.0 - smoothstep(0.28, 0.55, lowlandSnow));
         diffuseColor.rgb *= (1.0 - meltRim * 0.26);

         diffuseColor.rgb = mix(diffuseColor.rgb, snowCol, totalSnow);
         float vSnowFinal = totalSnow;
         float vBumpHeight = rockReliefH * mountainZone * (1.0 - totalSnow * 0.55);`
      );

      // Analytical Per-Pixel 3D Bump Normal Perturbation via screen-space derivatives (dFdx/dFdy)
      // Turns smooth mountain polygons into razor-sharp 3D faceted granite cliffs catching moonlight & sunlight!
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <normal_fragment_maps>',
        `#include <normal_fragment_maps>
         if (vBumpHeight > 0.01) {
           vec3 dPosX = dFdx(vViewPosition);
           vec3 dPosY = dFdy(vViewPosition);
           float dHdx = dFdx(vBumpHeight);
           float dHdy = dFdy(vBumpHeight);
           vec3 surfGrad = normalize(cross(dPosY, normal)) * dHdx + normalize(cross(normal, dPosX)) * dHdy;
           normal = normalize(normal - surfGrad * 1.45);
         }`
      );

      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <roughnessmap_fragment>',
        `#include <roughnessmap_fragment>
         roughnessFactor = mix(roughnessFactor, 0.66, vSnowFinal * 0.82);`
      );
    };

    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.receiveShadow = true;
    this.mesh.castShadow = true;
    scene.add(this.mesh);
  }

  update(dayState) {
    this.uniforms.uSnowCover.value = dayState.snowCover;
    this.uniforms.uNightFactor.value = dayState.starIntensity;
  }
}
