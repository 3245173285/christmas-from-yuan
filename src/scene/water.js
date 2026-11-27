import * as THREE from 'three';
import { CABIN_SITES, getTerrainHeight, WATER_LEVEL } from '../utils/noise.js';

// Lively Cinematic Nordic Glacial Fjord Lake Shader
// Visible rolling directional swells, sweeping wind-gust ripple patches, dancing aurora & golden village reflections,
// sparkling moon/sun glitter on wave crests, and gentle animated shoreline wavelets lapping the banks

const WATER_VERTEX_SHADER = /* glsl */ `
  attribute float aDepth;
  uniform float uTime;
  varying vec3 vWorldPos;
  varying float vDepth;
  varying float vWaveHeight;

  void main() {
    vDepth = aDepth;
    vec4 wp = modelMatrix * vec4(position, 1.0);

    // Visible gentle rolling fjord swells away from shallow shoreline
    float swellMask = smoothstep(0.0, 1.6, aDepth);
    float w1 = sin(wp.x * 0.16 + wp.z * 0.24 + uTime * 1.35) * 0.065;
    float w2 = cos(wp.x * 0.28 - wp.z * 0.19 + uTime * 1.05) * 0.045;
    float w3 = sin(wp.z * 0.42 - uTime * 1.85 + wp.x * 0.11) * 0.028;
    float disp = (w1 + w2 + w3) * swellMask;

    wp.y += disp;
    vWaveHeight = disp;
    vWorldPos = wp.xyz;
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;

const WATER_FRAGMENT_SHADER = /* glsl */ `
  precision highp float;

  uniform float uTime;
  uniform vec3 uSkyZenith;
  uniform vec3 uSkyMid;
  uniform vec3 uSkyHorizon;
  uniform vec3 uFogColor;
  uniform float uFogDensity;
  uniform vec3 uSunDir;
  uniform vec3 uMoonDir;
  uniform vec3 uSunColor;
  uniform float uSunElevation;
  uniform float uAuroraIntensity;
  uniform float uStarIntensity;
  uniform float uCabinLightFactor;
  uniform vec3 uCabinPositions[8];

  varying vec3 vWorldPos;
  varying float vDepth;
  varying float vWaveHeight;

  float hash(vec2 p) {
    p = fract(p * vec2(127.1, 311.7));
    p += dot(p, p + 34.5);
    return fract(p.x * p.y);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
      mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x),
      f.y
    );
  }

  float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    mat2 rot = mat2(0.8, 0.6, -0.6, 0.8);
    for (int i = 0; i < 4; i++) {
      v += a * noise(p);
      p = rot * p * 2.04 + vec2(5.2, 2.9);
      a *= 0.5;
    }
    return v;
  }

  // Lively multi-scale traveling fjord waves + sweeping wind-gust ripple patches
  vec3 computeLakeNormal(vec2 p, float t, float depthMask, out float crestFactor) {
    // Sweeping Nordic wind gusts moving visibly across the water surface
    float windGust = 0.55 + 0.65 * fbm(p * 0.022 + vec2(t * 0.14, -t * 0.07));

    vec2 grad = vec2(0.0);
    float crest = 0.0;

    // 1. Broad rolling fjord swells clearly legible from afar
    vec2 d1 = normalize(vec2(0.42, 0.91));
    float ph1 = dot(p, d1) * 0.34 - t * 1.45;
    grad += d1 * cos(ph1) * 0.075;
    crest += max(0.0, sin(ph1)) * 0.35;

    vec2 d2 = normalize(vec2(-0.68, 0.73));
    float ph2 = dot(p, d2) * 0.54 - t * 1.75;
    grad += d2 * cos(ph2) * 0.058;
    crest += max(0.0, sin(ph2)) * 0.28;

    // 2. Medium criss-crossing wind chops
    vec2 d3 = normalize(vec2(0.84, -0.54));
    float ph3 = dot(p, d3) * 1.08 + t * 2.25;
    grad += d3 * cos(ph3) * 0.044;
    crest += max(0.0, sin(ph3)) * 0.22;

    vec2 d4 = normalize(vec2(-0.28, -0.96));
    float ph4 = dot(p, d4) * 1.85 - t * 2.85;
    grad += d4 * cos(ph4) * 0.032;

    // 3. Organic FBM capillary wave shimmer moving with the breeze
    float eps = 0.25;
    vec2 driftA = p * 0.28 + vec2(t * 0.42, -t * 0.28);
    vec2 driftB = p * 0.62 - vec2(t * 0.55, t * 0.34);
    float nC = noise(driftA) * 0.6 + noise(driftB) * 0.4;
    float nX = noise(driftA + vec2(eps * 0.28, 0.0)) * 0.6 + noise(driftB + vec2(eps * 0.62, 0.0)) * 0.4;
    float nZ = noise(driftA + vec2(0.0, eps * 0.28)) * 0.6 + noise(driftB + vec2(0.0, eps * 0.62)) * 0.4;
    grad += vec2((nX - nC), (nZ - nC)) * 0.32;

    // Gentle distance falloff so midground lake (80-160m) retains crisp living wave texture
    float dist = length(cameraPosition - vWorldPos);
    float distAtten = 1.0 / (1.0 + dist * 0.0018);

    grad *= windGust * distAtten * (0.45 + 0.55 * depthMask);
    crestFactor = clamp(crest * windGust, 0.0, 1.0);
    return normalize(vec3(-grad.x, 1.0, -grad.y));
  }

  void main() {
    if (vDepth <= -0.02) discard;

    float depthMask = smoothstep(0.0, 1.4, vDepth);
    vec3 V = normalize(cameraPosition - vWorldPos);
    float crestFactor = 0.0;
    vec3 N = computeLakeNormal(vWorldPos.xz, uTime, depthMask, crestFactor);
    vec3 R = reflect(-V, N);
    float ry = clamp(R.y, 0.0, 1.0);

    // 1. Animated Sky Reflection distorted naturally by moving waves
    vec3 skyRefl = mix(uSkyHorizon, uSkyMid, smoothstep(0.0, 0.26, ry));
    skyRefl = mix(skyRefl, uSkyZenith, smoothstep(0.22, 0.82, ry));

    // 2. Dark Alpine Mountain Silhouette Reflection undulating across wave slopes
    float mNoise = noise(vec2(R.x * 5.2 + 1.4, 0.5)) * 0.065 + noise(vec2(R.x * 12.5, 1.2)) * 0.028;
    float mountainElev = (0.045 + mNoise) * smoothstep(-0.2, 0.65, -R.z);
    float mSilhouette = 1.0 - smoothstep(mountainElev - 0.018, mountainElev + 0.028, ry);
    vec3 mReflCol = mix(uFogColor * 0.38, uSkyHorizon * 0.48, smoothstep(-0.05, 0.35, uSunElevation));
    vec3 refl = mix(skyRefl, mReflCol, mSilhouette * 0.62);

    // 3. Living, Rippling Aurora Borealis Reflection dancing across the moving wave crests!
    if (uAuroraIntensity > 0.01) {
      float northBand = smoothstep(0.02, 0.24, ry) * (1.0 - smoothstep(0.36, 0.72, ry)) * smoothstep(-0.15, 0.7, -R.z);
      float sx = R.x * 3.2 + N.x * 4.8;
      float sz = vWorldPos.z * 0.022 + N.z * 3.6;
      float w1 = fbm(vec2(sx + uTime * 0.14, sz - uTime * 0.1));
      float w2 = fbm(vec2(sx * 2.2 - uTime * 0.12 + w1 * 1.8, ry * 3.6 + uTime * 0.09));
      float curtain = smoothstep(0.34, 0.78, w2) * northBand * (1.0 - mSilhouette * 0.65);
      // Wave crests catch brighter moving flashes of green/cyan northern lights
      float waveCatch = 0.75 + 0.65 * crestFactor;
      vec3 aurCol = mix(vec3(0.12, 0.78, 0.56), vec3(0.14, 0.62, 0.78), smoothstep(0.1, 0.32, ry));
      aurCol = mix(aurCol, vec3(0.46, 0.28, 0.76), smoothstep(0.28, 0.55, ry));
      refl += aurCol * curtain * waveCatch * 0.56 * uAuroraIntensity;
    }

    // 4. Sparkling Star & Moonlight Glitter dancing dynamically on moving capillary wave facets
    vec3 lightDir = uSunElevation > -0.05 ? normalize(uSunDir) : normalize(uMoonDir);
    vec3 H = normalize(lightDir + V);
    float NdotH = max(0.0, dot(N, H));
    float specSparkle = pow(NdotH, 320.0);
    float specSheen = pow(NdotH, 34.0);
    vec3 specCol = uSunElevation > -0.05 ? uSunColor : vec3(0.76, 0.90, 1.0);
    float specStr = uSunElevation > -0.05 ? 1.55 : 0.95;
    refl += specCol * (specSparkle * 2.8 + specSheen * 0.2) * specStr;

    if (uStarIntensity > 0.08) {
      float twinkleField = noise(vWorldPos.xz * 0.95 + N.xz * 26.0 + vec2(uTime * 0.85, -uTime * 0.55));
      float glint = smoothstep(0.84, 0.98, twinkleField) * (0.5 + 0.5 * crestFactor);
      refl += vec3(0.78, 0.92, 1.0) * glint * 0.52 * uStarIntensity;
    }

    // 5. Lively Broken Golden Reflections from the Coastal Village Lights dancing on waves!
    if (uCabinLightFactor > 0.02) {
      for (int i = 0; i < 8; i++) {
        vec3 cp = uCabinPositions[i];
        float dx = abs(vWorldPos.x - cp.x + N.x * 24.0);
        float dz = vWorldPos.z - cp.z;
        if (dz > -2.0 && dz < 68.0) {
          float width = 1.6 + dz * 0.045;
          float lateral = exp(-pow(dx / width, 2.0));
          float trail = smoothstep(0.0, 3.0, dz) * exp(-dz * 0.036);
          // Distinct moving horizontal golden reflection bars breaking across rolling swells!
          float waveBreak1 = pow(0.5 + 0.5 * sin(dz * 1.9 - uTime * 3.1 + float(i) * 1.7 + N.z * 28.0), 2.2);
          float waveBreak2 = 0.5 + 0.5 * cos(dz * 3.7 + uTime * 2.4 + N.x * 18.0);
          float shimmer = 0.25 + 0.95 * waveBreak1 * (0.65 + 0.35 * waveBreak2);
          refl += vec3(1.0, 0.68, 0.28) * lateral * trail * shimmer * 0.58 * uCabinLightFactor;
        }
      }
    }

    // 6. Deep Glacial Water Body with subtle wave-crest teal translucency
    vec3 deepCol = mix(vec3(0.012, 0.028, 0.055), vec3(0.026, 0.075, 0.115), smoothstep(-0.08, 0.35, uSunElevation));
    vec3 shallowCol = mix(vec3(0.038, 0.065, 0.085), vec3(0.11, 0.16, 0.18), smoothstep(-0.08, 0.35, uSunElevation));
    vec3 waterBody = mix(shallowCol, deepCol, depthMask);
    // Subtle luminous wave-crest catch so individual rolling swells read clearly even in shadows
    waterBody += mix(vec3(0.018, 0.052, 0.072), vec3(0.04, 0.08, 0.11), 1.0 - uStarIntensity) * crestFactor * 0.85;

    // Physical Fresnel reflectance
    float NdotV = clamp(dot(N, V), 0.0, 1.0);
    float fresnel = 0.03 + 0.97 * pow(1.0 - NdotV, 4.2);
    float reflMix = clamp(fresnel * 0.92 + 0.1, 0.0, 0.95);

    vec3 color = mix(waterBody, refl, reflMix);

    // 7. Animated Gentle Shoreline Wavelets Lapping Rhythmically Against the Banks!
    float shoreZone = 1.0 - smoothstep(0.0, 0.85, vDepth);
    if (shoreZone > 0.01) {
      float lapPhase = vDepth * 8.5 - uTime * 2.1 + noise(vWorldPos.xz * 0.35) * 4.2;
      float lapWave = smoothstep(0.45, 0.95, sin(lapPhase)) * shoreZone;
      float fineFoam = noise(vWorldPos.xz * 2.2 - vec2(0.0, uTime * 0.65));
      float foamAlpha = (lapWave * 0.45 + (1.0 - smoothstep(0.0, 0.22, vDepth)) * 0.35) * (0.5 + 0.5 * fineFoam);
      vec3 foamCol = mix(vec3(0.42, 0.56, 0.68), vec3(0.86, 0.91, 0.96), 1.0 - uStarIntensity * 0.65);
      color = mix(color, foamCol, clamp(foamAlpha * 0.65, 0.0, 0.55));
    }

    // Exponential atmospheric fog matching scene.fog
    float dist = length(cameraPosition - vWorldPos);
    float fogFactor = 1.0 - exp(-uFogDensity * uFogDensity * dist * dist);
    color = mix(color, uFogColor, clamp(fogFactor, 0.0, 1.0));

    float alpha = smoothstep(0.0, 0.34, vDepth) * 0.97;
    gl_FragColor = vec4(color, alpha);
  }
`;

export class FjordWater {
  constructor(scene) {
    const width = 460;
    const depth = 380;
    const centerX = 0;
    const centerZ = -145;

    const geo = new THREE.PlaneGeometry(width, depth, 148, 148);
    geo.rotateX(-Math.PI / 2);

    const pos = geo.attributes.position;
    const depths = new Float32Array(pos.count);
    for (let i = 0; i < pos.count; i++) {
      const wx = pos.getX(i) + centerX;
      const wz = pos.getZ(i) + centerZ;
      const terrainY = getTerrainHeight(wx, wz);
      depths[i] = WATER_LEVEL - terrainY;
    }
    geo.setAttribute('aDepth', new THREE.BufferAttribute(depths, 1));

    const waterfrontIndices = [0, 1, 2, 3, 10, 11, 12, 13];
    const cabinPositions = waterfrontIndices.map((idx) => {
      const c = CABIN_SITES[idx] || CABIN_SITES[0];
      return new THREE.Vector3(c.x, WATER_LEVEL + 2.0, c.z);
    });

    this.material = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      uniforms: {
        uTime: { value: 0 },
        uSkyZenith: { value: new THREE.Color('#040917') },
        uSkyMid: { value: new THREE.Color('#09162e') },
        uSkyHorizon: { value: new THREE.Color('#122745') },
        uFogColor: { value: new THREE.Color('#0c192e') },
        uFogDensity: { value: 0.0014 },
        uSunDir: { value: new THREE.Vector3(0, 0.3, -1) },
        uMoonDir: { value: new THREE.Vector3(0.3, 0.45, -0.8) },
        uSunColor: { value: new THREE.Color('#ffe0ad') },
        uSunElevation: { value: -0.2 },
        uAuroraIntensity: { value: 1.0 },
        uStarIntensity: { value: 1.0 },
        uCabinLightFactor: { value: 1.0 },
        uCabinPositions: { value: cabinPositions }
      },
      vertexShader: WATER_VERTEX_SHADER,
      fragmentShader: WATER_FRAGMENT_SHADER
    });

    this.mesh = new THREE.Mesh(geo, this.material);
    this.mesh.position.set(centerX, WATER_LEVEL, centerZ);
    this.mesh.renderOrder = 1;
    scene.add(this.mesh);
  }

  update(elapsedTime, dayState) {
    const u = this.material.uniforms;
    u.uTime.value = elapsedTime;
    u.uSkyZenith.value.copy(dayState.skyZenith);
    u.uSkyMid.value.copy(dayState.skyMid);
    u.uSkyHorizon.value.copy(dayState.skyHorizon);
    u.uFogColor.value.copy(dayState.fogColor);
    u.uFogDensity.value = dayState.fogDensity;
    u.uSunDir.value.copy(dayState.sunDir);
    u.uMoonDir.value.copy(dayState.moonDir);
    u.uSunColor.value.copy(dayState.sunColor);
    u.uSunElevation.value = dayState.sunElevation;
    u.uAuroraIntensity.value = dayState.auroraIntensity;
    u.uStarIntensity.value = dayState.starIntensity;
    u.uCabinLightFactor.value = dayState.cabinLightFactor;
  }
}
