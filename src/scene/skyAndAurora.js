import * as THREE from 'three';
import { getSharedNoiseLUTTexture } from '../utils/textures.js';

// Custom GLSL Sky Dome (atmosphere, sun/moon glow, Milky Way, stars, clouds)
// + Volumetric Multi-Curtain Aurora Borealis Shaders + Occasional Shooting Stars
// Uses pre-baked seamless 4-channel Noise LUT texture to replace ~30 per-pixel FBM loops (~75% faster GPU!)

const SKY_VERTEX_SHADER = /* glsl */ `
  varying vec3 vWorldDir;
  void main() {
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vWorldDir = normalize(position);
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;

const SKY_FRAGMENT_SHADER = /* glsl */ `
  precision highp float;

  uniform float uTime;
  uniform sampler2D uNoiseTex;
  uniform vec3 uZenithColor;
  uniform vec3 uMidColor;
  uniform vec3 uHorizonColor;
  uniform vec3 uSunDir;
  uniform vec3 uMoonDir;
  uniform vec3 uSunColor;
  uniform float uSunElevation;
  uniform float uStarIntensity;
  uniform float uAuroraIntensity;
  uniform float uMobileBoost;
  uniform vec3 uCloudTint;
  uniform float uCloudOpacity;

  varying vec3 vWorldDir;

  float hash21(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }

  // Ultra-fast pre-baked FBM lookup (replaces 5-octave procedural loop!)
  float fastFbm(vec2 p) {
    return texture2D(uNoiseTex, p * 0.16).g;
  }

  float fastFbmDetail(vec2 p) {
    return texture2D(uNoiseTex, p * 0.14).b;
  }

  void main() {
    vec3 dir = normalize(vWorldDir);
    float y = clamp(dir.y, -0.2, 1.0);
    float h = max(0.0, y);

    // 1. Multi-stop smooth atmospheric sky gradient
    vec3 sky = mix(uHorizonColor, uMidColor, smoothstep(0.0, 0.28, h));
    sky = mix(sky, uZenithColor, smoothstep(0.22, 0.85, h));

    // Subtle warm horizon scattering near sun azimuth during sunrise/sunset
    float sunDot = max(0.0, dot(dir, normalize(uSunDir)));
    float twilightFactor = smoothstep(-0.18, 0.05, uSunElevation) * (1.0 - smoothstep(0.18, 0.45, uSunElevation));
    float horizonGlow = pow(sunDot, 5.0) * (1.0 - smoothstep(0.0, 0.42, h));
    sky += uSunColor * horizonGlow * (0.48 + twilightFactor * 0.55);

    // 2. Solar disc & Mie aureole when above horizon
    if (uSunElevation > -0.06) {
      float sunVis = smoothstep(-0.06, 0.06, uSunElevation);
      float sunHalo = pow(sunDot, 36.0) * 0.55 + pow(sunDot, 280.0) * 1.4;
      float sunDisc = smoothstep(0.9992, 0.99975, sunDot) * 2.2;
      sky += uSunColor * (sunHalo + sunDisc) * sunVis;
    }

    // 3. Moon disc & silvery halo at night
    float moonVis = smoothstep(0.15, 0.75, uStarIntensity);
    if (moonVis > 0.01) {
      float moonDot = max(0.0, dot(dir, normalize(uMoonDir)));
      float moonHalo = pow(moonDot, 42.0) * 0.22 + pow(moonDot, 220.0) * 0.45;
      float moonDisc = smoothstep(0.99945, 0.99978, moonDot) * 1.5;
      sky += vec3(0.84, 0.91, 1.0) * (moonHalo + moonDisc) * moonVis;
    }

    // 4. Procedural Starfield & Subtle Milky Way
    if (uStarIntensity > 0.01 && h > 0.01) {
      float starMask = smoothstep(0.02, 0.22, h) * uStarIntensity;

      // Tilted Milky Way band across northern sky (pre-baked LUT lookup)
      vec3 mwDir = normalize(vec3(dir.x * 0.78 + dir.y * 0.45, dir.y * 0.8 - dir.x * 0.42, dir.z));
      float band = exp(-pow(mwDir.y * 4.2, 2.0));
      if (band > 0.02) {
        vec2 mwUV = vec2(atan(mwDir.z, mwDir.x) * 1.1, mwDir.y * 2.5);
        vec4 mwTap = texture2D(uNoiseTex, mwUV + vec2(0.35, 0.17));
        float mwRift = smoothstep(0.34, 0.72, mwTap.b);
        vec3 milkyWay = mix(vec3(0.14, 0.20, 0.34), vec3(0.30, 0.36, 0.52), mwTap.g) * band * mwRift * 0.34;
        sky += milkyWay * starMask;
      }

      // Multi-layer crisp twinkling stars via spherical grid cells
      vec2 skyUV = vec2(atan(dir.x, -dir.z), asin(clamp(dir.y, -1.0, 1.0)));

      // Layer A: brighter hero stars
      vec2 cellA = floor(skyUV * 85.0);
      vec2 fA = fract(skyUV * 85.0) - 0.5;
      float rndA = hash21(cellA);
      if (rndA > 0.968) {
        vec2 offset = (vec2(hash21(cellA + 17.3), hash21(cellA + 43.1)) - 0.5) * 0.6;
        float dist = length(fA - offset);
        float size = 0.045 + (rndA - 0.968) * 1.4;
        float star = smoothstep(size, 0.0, dist);
        float twinkle = 0.72 + 0.28 * sin(uTime * (1.8 + rndA * 4.0) + rndA * 90.0);
        vec3 starCol = mix(vec3(0.82, 0.9, 1.0), vec3(1.0, 0.92, 0.80), hash21(cellA + 7.1));
        sky += starCol * star * twinkle * 1.55 * starMask;
      }

      // Layer B: dense fine stars
      vec2 cellB = floor(skyUV * 175.0);
      vec2 fB = fract(skyUV * 175.0) - 0.5;
      float rndB = hash21(cellB + 101.7);
      if (rndB > 0.952) {
        float dist = length(fB);
        float star = smoothstep(0.14, 0.0, dist);
        float twinkle = 0.75 + 0.25 * sin(uTime * 2.4 + rndB * 140.0);
        sky += vec3(0.85, 0.91, 1.0) * star * twinkle * 0.78 * starMask;
      }
    }

    // 5. Soft Distant Sky Aurora Ambient Glow (pre-baked 2-tap LUT + mobile brightness boost!)
    if (uAuroraIntensity > 0.01 && h > 0.02) {
      float northMask = smoothstep(-0.35, 0.65, -dir.z) * smoothstep(0.05, 0.32, h) * (1.0 - smoothstep(0.55, 0.92, h));
      if (northMask > 0.01) {
        vec2 aUV = dir.xz / (h + 0.35);
        float drift = uTime * 0.035;
        float n1 = fastFbm(aUV * 1.1 + vec2(drift, -drift * 0.4));
        float n2 = fastFbmDetail(aUV * 1.8 - vec2(drift * 0.6, drift * 0.8) + n1 * 1.2);
        float ribbon = smoothstep(0.42, 0.78, n2) * northMask;
        vec3 aCol = mix(vec3(0.08, 0.68, 0.48), vec3(0.32, 0.24, 0.72), smoothstep(0.22, 0.62, h));
        sky += aCol * ribbon * 0.36 * uAuroraIntensity * uMobileBoost;
      }
    }

    // 6. Rich Two-Layer Volumetric Nordic Cloudscape (Lower Sculpted Cumulus Banks + High Wispy Cirrus, 100% LUT-powered!)
    if (h > 0.025 && uCloudOpacity > 0.01) {
      // Layer A: Fuller billowing lower stratocumulus banks with sunlit silver/gold rims & soft belly shading
      vec2 cUV1 = dir.xz / (h + 0.22) * 0.42;
      cUV1.x += uTime * 0.0072;
      cUV1.y += uTime * 0.0024;
      float cShape = fastFbm(cUV1);
      float cPuff = fastFbmDetail(cUV1 * 2.15 + vec2(uTime * 0.0045, 2.7));
      float cRaw = cShape * 0.68 + cPuff * 0.32;
      float lowCloud = smoothstep(0.37, 0.72, cRaw);

      // Sun-side directional thickness sample for realistic 3D silver-lining & cloud depth
      vec2 sunStep = normalize(uSunDir.xz + vec2(0.0001)) * 0.085;
      float cLitSample = fastFbm(cUV1 + sunStep);
      float selfShadow = smoothstep(0.32, 0.74, cShape - cLitSample + 0.52);

      // Layer B: High-altitude silky cirrus streaks sweeping across upper vault
      vec2 cUV2 = (dir.xz / (h + 0.14)) * vec2(0.26, 0.78);
      cUV2.x -= uTime * 0.0048;
      cUV2.y += uTime * 0.0031;
      float highCirrus = smoothstep(0.46, 0.78, fastFbmDetail(cUV2 * 1.45 + cShape * 0.35)) * 0.52;

      float horizonFade = smoothstep(0.025, 0.16, h) * (1.0 - smoothstep(0.78, 0.99, h));
      float daySunMask = smoothstep(-0.14, 0.28, uSunElevation);
      float silverLining = pow(sunDot, 7.0) * 0.42 * daySunMask + pow(sunDot, 2.2) * 0.16 * daySunMask;

      // Subtle dark belly -> warm/bright top + gentle aurora teal reflection on cloud undersides at night
      vec3 cloudDark = mix(uHorizonColor * 0.65, uCloudTint * 0.62, 0.65);
      vec3 lowCol = mix(cloudDark, uCloudTint, 0.38 + selfShadow * 0.62);
      lowCol += uSunColor * silverLining * (1.0 - lowCloud * 0.42);
      lowCol += vec3(0.08, 0.36, 0.32) * uAuroraIntensity * 0.34 * uMobileBoost * (1.0 - selfShadow * 0.5);

      vec3 highCol = mix(uCloudTint, vec3(0.95, 0.97, 1.0), 0.28 * daySunMask) + uSunColor * pow(sunDot, 5.0) * 0.22 * daySunMask;

      // Composite high cirrus behind, fuller low cumulus in front
      sky = mix(sky, highCol, clamp(highCirrus * horizonFade * uCloudOpacity * 0.85, 0.0, 0.78));
      sky = mix(sky, lowCol, clamp(lowCloud * horizonFade * uCloudOpacity * 1.08, 0.0, 0.92));
    }

    // Blend gently below horizon toward fog/horizon color
    if (y < 0.0) {
      sky = mix(uHorizonColor, uHorizonColor * 0.45, smoothstep(0.0, -0.18, y));
    }

    gl_FragColor = vec4(sky, 1.0);
  }
`;

// Volumetric Silk-Curtain Aurora Borealis Shader with Interactive Brush Ripple Wave
const AURORA_VERTEX_SHADER = /* glsl */ `
  uniform float uTime;
  uniform float uPhase;
  uniform vec2 uRippleUV;
  uniform float uRippleAge;
  uniform float uRippleAmp;
  varying vec2 vUv;
  varying float vWave;

  void main() {
    vUv = uv;
    vec3 pos = position;

    // Gentle organic billowing of the silk curtain in 3D space
    float wave1 = sin(uv.x * 9.5 + uTime * 0.22 + uPhase) * 14.0;
    float wave2 = cos(uv.x * 18.0 - uTime * 0.16 + uPhase * 1.7) * 6.5;
    float heightFactor = 0.35 + uv.y * 0.85;
    pos.z += (wave1 + wave2) * heightFactor;
    pos.x += sin(uv.x * 6.0 + uTime * 0.14 + uPhase) * 8.0 * uv.y;

    // Interactive curtain billow when user swipes across the northern lights
    if (uRippleAmp > 0.005) {
      float d = abs(uv.x - uRippleUV.x);
      float front = uRippleAge * 0.24;
      float ring = exp(-pow((d - front) * 14.0, 2.0)) * uRippleAmp;
      pos.z += sin((d - front) * 24.0) * 18.0 * ring;
    }

    vWave = (wave1 + wave2) * 0.05;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const AURORA_FRAGMENT_SHADER = /* glsl */ `
  precision highp float;

  uniform float uTime;
  uniform sampler2D uNoiseTex;
  uniform float uIntensity;
  uniform float uMobileBoost;
  uniform float uPhase;
  uniform vec3 uColorLow;
  uniform vec3 uColorMid;
  uniform vec3 uColorHigh;
  uniform vec2 uRippleUV;
  uniform float uRippleAge;
  uniform float uRippleAmp;

  varying vec2 vUv;
  varying float vWave;

  void main() {
    if (uIntensity < 0.01) discard;

    // Soft horizontal ends so curtains fade seamlessly into night sky
    float edgeFade = smoothstep(0.0, 0.18, vUv.x) * smoothstep(1.0, 0.82, vUv.x);

    // Pre-baked LUT lookup for shimmering vertical magnetic field pillars / rays (replaces 6 procedural noise calls!)
    float t = uTime * 0.18 + uPhase;
    float warp = texture2D(uNoiseTex, vec2(vUv.x * 0.72 + t * 0.055, vUv.y * 0.2 - t * 0.02)).g;

    float rays1 = texture2D(uNoiseTex, vec2(vUv.x * 2.8 + warp * 0.42 + t * 0.05, vUv.y * 0.14 - t * 0.04)).b;
    float rays2 = texture2D(uNoiseTex, vec2(vUv.x * 5.2 - warp * 0.28 - t * 0.032, vUv.y * 0.22 - t * 0.06)).a;
    float rays = pow(rays1 * 0.68 + rays2 * 0.32, 1.5);

    // Bright crisp lower oxygen-emission skirt fading gently upward into diffuse curtain
    float skirtShift = (warp - 0.5) * 0.24;
    float y = clamp(vUv.y + skirtShift, 0.0, 1.0);
    float bottomEdge = smoothstep(0.0, 0.16, y);
    float topFade = pow(1.0 - smoothstep(0.14, 1.0, y), 1.65);
    float verticalProfile = bottomEdge * topFade;

    // Slow breathing / brightness wave travelling across the ribbon
    float pulse = 0.65 + 0.35 * sin(vUv.x * 7.0 - uTime * 0.32 + uPhase * 2.1 + warp * 3.0);

    // Authentic Nordic photography palette: emerald-green bottom -> cyan-teal mid -> soft violet top
    vec3 col = mix(uColorLow, uColorMid, smoothstep(0.08, 0.45, y));
    col = mix(col, uColorHigh, smoothstep(0.42, 0.86, y));

    float fringe = exp(-pow((y - 0.14) * 9.5, 2.0)) * (0.48 + 0.42 * rays);
    col += uColorLow * fringe * 0.25;

    float rippleGlow = 0.0;
    if (uRippleAmp > 0.005) {
      float dx = (vUv.x - uRippleUV.x) * 1.6;
      float dy = (vUv.y - uRippleUV.y) * 0.85;
      float dist = length(vec2(dx, dy));
      float waveRadius = uRippleAge * 0.34;
      float ring = exp(-pow((dist - waveRadius) * 11.0, 2.0));
      float coreFlash = exp(-dist * dist * 16.0) * exp(-uRippleAge * 2.2);
      rippleGlow = (ring * 0.95 + coreFlash * 0.7) * uRippleAmp;
      col = mix(col, vec3(0.45, 1.0, 0.82), clamp(rippleGlow * 0.55, 0.0, 0.85));
      col += vec3(0.45, 0.32, 0.85) * ring * uRippleAmp * 0.35;
    }

    // Mobile aurora brightness & vibrancy compensation (makes 2 non-bloom mobile curtains glow as vividly as 3 bloomed desktop curtains!)
    float mobAlphaMult = mix(1.0, 1.56, clamp(uMobileBoost - 1.0, 0.0, 1.0));
    float mobColMult = mix(1.0, 1.28, clamp(uMobileBoost - 1.0, 0.0, 1.0));
    float alpha = (verticalProfile * (0.24 + 0.7 * rays) + fringe * 0.22 + rippleGlow * 0.38 * verticalProfile) * edgeFade * pulse * uIntensity * 0.44 * mobAlphaMult;

    if (alpha < 0.004) discard;
    gl_FragColor = vec4(col * (0.76 + rays * 0.36 + rippleGlow * 0.65) * mobColMult, min(0.92, alpha));
  }
`;

function createCurvedAuroraRibbon(width, height, radius, arcAngle, yOffset, zOffset, tiltX = 0.18) {
  const segX = 72;
  const segY = 14;
  const geo = new THREE.PlaneGeometry(width, height, segX, segY);
  const pos = geo.attributes.position;

  for (let i = 0; i < pos.count; i++) {
    const u = (pos.getX(i) / width); // -0.5..0.5
    const v = (pos.getY(i) / height) + 0.5; // 0..1

    const theta = u * arcAngle;
    const sCurve = Math.sin(u * Math.PI * 2.3) * 34.0;
    const r = radius + sCurve;

    const x = Math.sin(theta) * r;
    const z = -Math.cos(theta) * r + zOffset;
    const y = yOffset + v * height + Math.sin(u * Math.PI * 1.5) * 14.0;

    // Subtle upward tilt along magnetic field lines
    const tiltedZ = z + v * height * tiltX;
    pos.setXYZ(i, x, y, tiltedZ);
  }
  geo.computeVertexNormals();
  return geo;
}

export class SkyAndAurora {
  constructor(scene, perf = {}) {
    this.scene = scene;
    this.group = new THREE.Group();
    scene.add(this.group);

    const noiseTex = getSharedNoiseLUTTexture(256);
    const mobileBoost = perf.isMobile ? 1.68 : 1.0;

    // 1. Sky Dome
    const skyGeo = new THREE.SphereGeometry(920, perf.isMobile ? 28 : 42, perf.isMobile ? 18 : 28);
    this.skyMat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
      uniforms: {
        uTime: { value: 0 },
        uNoiseTex: { value: noiseTex },
        uZenithColor: { value: new THREE.Color('#040917') },
        uMidColor: { value: new THREE.Color('#09162e') },
        uHorizonColor: { value: new THREE.Color('#122745') },
        uSunDir: { value: new THREE.Vector3(0, -0.3, -1) },
        uMoonDir: { value: new THREE.Vector3(0.3, 0.45, -0.8) },
        uSunColor: { value: new THREE.Color('#ffe0ad') },
        uSunElevation: { value: -0.2 },
        uStarIntensity: { value: 1.0 },
        uAuroraIntensity: { value: 1.0 },
        uMobileBoost: { value: mobileBoost },
        uCloudTint: { value: new THREE.Color('#1a2d4c') },
        uCloudOpacity: { value: 0.4 }
      },
      vertexShader: SKY_VERTEX_SHADER,
      fragmentShader: SKY_FRAGMENT_SHADER
    });
    this.skyMesh = new THREE.Mesh(skyGeo, this.skyMat);
    this.skyMesh.renderOrder = -10;
    this.group.add(this.skyMesh);

    // 2. Multi-Layered 3D Volumetric Aurora Borealis Curtains (staggered gracefully so they never stack into an overexposed hotspot!)
    this.auroraMaterials = [];
    this.auroraMeshes = [];
    this.rippleState = { uv: new THREE.Vector2(0.5, 0.4), age: 10, amp: 0 };
    const curtainSpecs = [
      {
        width: 760, height: 152, radius: 445, arc: 1.95, y: 82, z: -20, tilt: 0.22, phase: 0.0,
        low: '#22d48c', mid: '#16a8bf', high: '#7a4cd6'
      },
      {
        width: 680, height: 138, radius: 385, arc: 1.75, y: 108, z: -48, tilt: 0.26, phase: 2.8,
        low: '#2ee09a', mid: '#1ab8b0', high: '#8f58de'
      },
      {
        width: 820, height: 130, radius: 525, arc: 2.1, y: 68, z: 10, tilt: 0.16, phase: 5.1,
        low: '#1cc488', mid: '#1790bf', high: '#6a44c7'
      }
    ];

    const activeSpecs = curtainSpecs.slice(0, perf.auroraCurtainCount || 3);
    for (const spec of activeSpecs) {
      const geo = createCurvedAuroraRibbon(spec.width, spec.height, spec.radius, spec.arc, spec.y, spec.z, spec.tilt);
      const mat = new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        fog: false,
        uniforms: {
          uTime: { value: 0 },
          uNoiseTex: { value: noiseTex },
          uIntensity: { value: 1.0 },
          uMobileBoost: { value: mobileBoost },
          uPhase: { value: spec.phase },
          uColorLow: { value: new THREE.Color(spec.low) },
          uColorMid: { value: new THREE.Color(spec.mid) },
          uColorHigh: { value: new THREE.Color(spec.high) },
          uRippleUV: { value: new THREE.Vector2(0.5, 0.4) },
          uRippleAge: { value: 10.0 },
          uRippleAmp: { value: 0.0 }
        },
        vertexShader: AURORA_VERTEX_SHADER,
        fragmentShader: AURORA_FRAGMENT_SHADER
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.renderOrder = -5;
      this.group.add(mesh);
      this.auroraMaterials.push(mat);
      this.auroraMeshes.push(mesh);
    }

    // 3. Ambient & Interactive Wishing Shooting Stars / Meteors (pool of 12 luminous streaks + glowing comet heads!)
    this.meteors = [];
    this.showerQueue = [];
    const meteorGeo = new THREE.BufferGeometry();
    const positions = new Float32Array([0, 0, 0, 1, 0, 0]);
    const colors = new Float32Array([1, 0.98, 0.9, 0.15, 0.65, 1.0]);
    meteorGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    meteorGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const headGeo = new THREE.SphereGeometry(1.8, 8, 8);

    for (let i = 0; i < 12; i++) {
      const mat = new THREE.LineBasicMaterial({
        vertexColors: true,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        fog: false
      });
      const line = new THREE.Line(meteorGeo.clone(), mat);
      line.visible = false;
      this.group.add(line);

      const headMat = new THREE.MeshBasicMaterial({
        color: '#fff8e2',
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        fog: false
      });
      const head = new THREE.Mesh(headGeo, headMat);
      head.visible = false;
      this.group.add(head);

      this.meteors.push({
        line,
        mat,
        head,
        headMat,
        active: false,
        isAmbient: i < 3,
        isUserWish: false,
        timer: 3.5 + i * 5.2,
        life: 0,
        duration: 1.15,
        tailScale: 0.2,
        start: new THREE.Vector3(),
        vel: new THREE.Vector3()
      });
    }
  }

  triggerAuroraRipple(uvX, uvY) {
    this.rippleState.uv.set(uvX, uvY);
    this.rippleState.age = 0;
    this.rippleState.amp = 1.25;
  }

  // Summon a dramatic luminous wishing meteor right where the user clicked in the sky!
  summonMeteorAtDirection(rayOrigin, rayDir) {
    const slot = this.meteors.find((m) => !m.active) || this.meteors[3];
    const dist = 460;
    const hitPoint = rayOrigin.clone().addScaledVector(rayDir, dist);
    // Start slightly above & to one side of the click so it streaks cleanly right across the clicked spot
    const side = Math.random() > 0.5 ? 1 : -1;
    const right = new THREE.Vector3().crossVectors(rayDir, new THREE.Vector3(0, 1, 0)).normalize();
    slot.start.copy(hitPoint).addScaledVector(right, -side * 70).add(new THREE.Vector3(0, 58, 0));
    slot.vel.copy(right).multiplyScalar(side * (185 + Math.random() * 55)).add(new THREE.Vector3(0, -115 - Math.random() * 35, 0));
    slot.life = 0;
    slot.duration = 0.95 + Math.random() * 0.35;
    slot.tailScale = 0.28;
    slot.isUserWish = true;
    slot.active = true;
    slot.line.visible = true;
    slot.head.visible = true;
  }

  // Bonus Easter Egg: launch a breathtaking cascade of 8 wishing meteors across the northern sky!
  summonMeteorShower() {
    for (let i = 0; i < 8; i++) {
      this.showerQueue.push({ delay: i * 0.32 });
    }
  }

  spawnMeteor(m) {
    const azim = (Math.random() - 0.5) * 1.9;
    const dist = 540;
    const x = Math.sin(azim) * dist;
    const z = -Math.cos(azim) * dist;
    const y = 175 + Math.random() * 170;
    m.start.set(x, y, z);
    m.vel.set((Math.random() - 0.5) * 140 + 75, -80 - Math.random() * 55, (Math.random() - 0.5) * 35);
    m.life = 0;
    m.duration = 0.9 + Math.random() * 0.5;
    m.tailScale = 0.22;
    m.isUserWish = false;
    m.active = true;
    m.line.visible = true;
    m.head.visible = true;
  }

  update(elapsedTime, dt, dayState, cameraPos) {
    this.skyMesh.position.copy(cameraPos);

    const u = this.skyMat.uniforms;
    u.uTime.value = elapsedTime;
    u.uZenithColor.value.copy(dayState.skyZenith);
    u.uMidColor.value.copy(dayState.skyMid);
    u.uHorizonColor.value.copy(dayState.skyHorizon);
    u.uSunDir.value.copy(dayState.sunDir);
    u.uMoonDir.value.copy(dayState.moonDir);
    u.uSunColor.value.copy(dayState.sunColor);
    u.uSunElevation.value = dayState.sunElevation;
    u.uStarIntensity.value = dayState.starIntensity;
    u.uAuroraIntensity.value = dayState.auroraIntensity;
    u.uCloudTint.value.copy(dayState.cloudTint);
    u.uCloudOpacity.value = dayState.cloudOpacity;

    // Decay interactive aurora brush ripple wave smoothly
    if (this.rippleState.amp > 0.002) {
      this.rippleState.age += dt;
      this.rippleState.amp *= Math.pow(0.28, dt);
    } else {
      this.rippleState.amp = 0;
    }

    for (let i = 0; i < this.auroraMaterials.length; i++) {
      const m = this.auroraMaterials[i];
      m.uniforms.uTime.value = elapsedTime;
      m.uniforms.uIntensity.value = dayState.auroraIntensity;
      m.uniforms.uRippleUV.value.copy(this.rippleState.uv);
      m.uniforms.uRippleAge.value = this.rippleState.age;
      m.uniforms.uRippleAmp.value = this.rippleState.amp;
    }

    // Process staggered meteor shower queue
    for (let i = this.showerQueue.length - 1; i >= 0; i--) {
      this.showerQueue[i].delay -= dt;
      if (this.showerQueue[i].delay <= 0) {
        this.showerQueue.splice(i, 1);
        const freeSlot = this.meteors.find((m) => !m.active) || this.meteors[4];
        this.spawnMeteor(freeSlot);
        freeSlot.isUserWish = true;
        freeSlot.tailScale = 0.28;
      }
    }

    // Update ambient & user-summoned wishing meteors
    for (const m of this.meteors) {
      if (!m.active) {
        if (!m.isAmbient || dayState.starIntensity < 0.45) continue;
        m.timer -= dt;
        if (m.timer <= 0) {
          this.spawnMeteor(m);
        }
      } else {
        m.life += dt;
        const p = m.life / m.duration;
        if (p >= 1) {
          m.active = false;
          m.line.visible = false;
          m.head.visible = false;
          m.timer = 6.0 + Math.random() * 11.0;
        } else {
          const headPos = m.start.clone().addScaledVector(m.vel, m.life);
          const tailPos = headPos.clone().addScaledVector(m.vel, -m.tailScale);
          const attr = m.line.geometry.attributes.position;
          attr.setXYZ(0, headPos.x, headPos.y, headPos.z);
          attr.setXYZ(1, tailPos.x, tailPos.y, tailPos.z);
          attr.needsUpdate = true;
          m.head.position.copy(headPos);
          const fade = Math.sin(p * Math.PI);
          const vis = m.isUserWish ? Math.max(0.65, dayState.starIntensity) : dayState.starIntensity;
          m.mat.opacity = fade * vis * 0.98;
          m.headMat.opacity = fade * vis * 0.95;
          m.head.scale.setScalar(m.isUserWish ? 1.35 : 0.95);
        }
      }
    }
  }
}
