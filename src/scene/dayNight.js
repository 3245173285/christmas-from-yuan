import * as THREE from 'three';

// Continuous 24-hour Nordic Day/Night Cycle Controller
// Default: 24 virtual hours compressed into 180 real seconds

const KEYFRAMES = [
  {
    hour: 0.0,
    phase: 'Aurora Night',
    phaseZh: '极光午夜',
    skyZenith: new THREE.Color('#040814'),
    skyMid: new THREE.Color('#081428'),
    skyHorizon: new THREE.Color('#10233d'),
    fogColor: new THREE.Color('#0b172a'),
    fogDensity: 0.00145,
    sunColor: new THREE.Color('#8db4e8'), // moonlight key
    sunIntensity: 0.72,
    hemiSky: new THREE.Color('#1b3559'),
    hemiGround: new THREE.Color('#0b121c'),
    hemiIntensity: 0.55,
    ambientIntensity: 0.18,
    auroraIntensity: 1.0,
    starIntensity: 1.0,
    cloudTint: new THREE.Color('#182a44'),
    cloudOpacity: 0.25,
    treeLightFactor: 1.0,
    cabinLightFactor: 1.0,
    mistOpacity: 0.58,
    snowCover: 0.94,
    exposure: 1.08,
    envIntensity: 0.95
  },
  {
    hour: 4.5,
    phase: 'Deep Night',
    phaseZh: '静谧深夜',
    skyZenith: new THREE.Color('#050918'),
    skyMid: new THREE.Color('#0b1730'),
    skyHorizon: new THREE.Color('#172947'),
    fogColor: new THREE.Color('#101d35'),
    fogDensity: 0.0017,
    sunColor: new THREE.Color('#95b7e8'),
    sunIntensity: 0.65,
    hemiSky: new THREE.Color('#1f3860'),
    hemiGround: new THREE.Color('#0d1420'),
    hemiIntensity: 0.52,
    ambientIntensity: 0.18,
    auroraIntensity: 0.92,
    starIntensity: 0.95,
    cloudTint: new THREE.Color('#1d2e4c'),
    cloudOpacity: 0.3,
    treeLightFactor: 1.0,
    cabinLightFactor: 1.0,
    mistOpacity: 0.52,
    snowCover: 0.98,
    exposure: 1.06,
    envIntensity: 0.92
  },
  {
    hour: 6.5,
    phase: 'Nordic Dawn',
    phaseZh: '拂晓薄雾',
    skyZenith: new THREE.Color('#272b56'),
    skyMid: new THREE.Color('#7a557c'),
    skyHorizon: new THREE.Color('#e89ba0'),
    fogColor: new THREE.Color('#7f6880'),
    fogDensity: 0.0021,
    sunColor: new THREE.Color('#ffbfa0'),
    sunIntensity: 1.35,
    hemiSky: new THREE.Color('#9a7ea6'),
    hemiGround: new THREE.Color('#2d2730'),
    hemiIntensity: 0.78,
    ambientIntensity: 0.24,
    auroraIntensity: 0.15,
    starIntensity: 0.25,
    cloudTint: new THREE.Color('#f4b4b6'),
    cloudOpacity: 0.48,
    treeLightFactor: 0.65,
    cabinLightFactor: 0.72,
    mistOpacity: 0.62,
    snowCover: 0.84,
    exposure: 1.02,
    envIntensity: 1.0
  },
  {
    hour: 9.0,
    phase: 'Golden Morning',
    phaseZh: '清晨暖阳',
    skyZenith: new THREE.Color('#245799'),
    skyMid: new THREE.Color('#6fa0cf'),
    skyHorizon: new THREE.Color('#f2d6b3'),
    fogColor: new THREE.Color('#c8d1dc'),
    fogDensity: 0.0012,
    sunColor: new THREE.Color('#ffe0ad'),
    sunIntensity: 2.55,
    hemiSky: new THREE.Color('#9ec4ec'),
    hemiGround: new THREE.Color('#3b4c38'),
    hemiIntensity: 0.92,
    ambientIntensity: 0.26,
    auroraIntensity: 0.0,
    starIntensity: 0.0,
    cloudTint: new THREE.Color('#fff1de'),
    cloudOpacity: 0.55,
    treeLightFactor: 0.12,
    cabinLightFactor: 0.12,
    mistOpacity: 0.24,
    snowCover: 0.46,
    exposure: 0.98,
    envIntensity: 1.1
  },
  {
    hour: 13.0,
    phase: 'Crisp Midday',
    phaseZh: '清澈正午',
    skyZenith: new THREE.Color('#1a55a8'),
    skyMid: new THREE.Color('#5a9be0'),
    skyHorizon: new THREE.Color('#cde2f5'),
    fogColor: new THREE.Color('#bdd4e9'),
    fogDensity: 0.00095,
    sunColor: new THREE.Color('#fff5e6'),
    sunIntensity: 3.1,
    hemiSky: new THREE.Color('#a8d0f8'),
    hemiGround: new THREE.Color('#3f543e'),
    hemiIntensity: 1.05,
    ambientIntensity: 0.28,
    auroraIntensity: 0.0,
    starIntensity: 0.0,
    cloudTint: new THREE.Color('#ffffff'),
    cloudOpacity: 0.58,
    treeLightFactor: 0.06,
    cabinLightFactor: 0.05,
    mistOpacity: 0.26,
    snowCover: 0.24,
    exposure: 0.94,
    envIntensity: 1.2
  },
  {
    hour: 16.5,
    phase: 'Golden Hour',
    phaseZh: '黄金时刻',
    skyZenith: new THREE.Color('#21457d'),
    skyMid: new THREE.Color('#966d7e'),
    skyHorizon: new THREE.Color('#f59a56'),
    fogColor: new THREE.Color('#bf8365'),
    fogDensity: 0.00135,
    sunColor: new THREE.Color('#ff9d4f'),
    sunIntensity: 2.45,
    hemiSky: new THREE.Color('#cf9078'),
    hemiGround: new THREE.Color('#3c2d23'),
    hemiIntensity: 0.85,
    ambientIntensity: 0.24,
    auroraIntensity: 0.0,
    starIntensity: 0.04,
    cloudTint: new THREE.Color('#ffb97c'),
    cloudOpacity: 0.52,
    treeLightFactor: 0.42,
    cabinLightFactor: 0.45,
    mistOpacity: 0.28,
    snowCover: 0.42,
    exposure: 1.0,
    envIntensity: 1.08
  },
  {
    hour: 18.8,
    phase: 'Blue Hour',
    phaseZh: '蓝调时刻',
    skyZenith: new THREE.Color('#0c1b44'),
    skyMid: new THREE.Color('#342a62'),
    skyHorizon: new THREE.Color('#cc6156'),
    fogColor: new THREE.Color('#2d2c52'),
    fogDensity: 0.0016,
    sunColor: new THREE.Color('#e08a7e'),
    sunIntensity: 0.95,
    hemiSky: new THREE.Color('#474c82'),
    hemiGround: new THREE.Color('#191a28'),
    hemiIntensity: 0.65,
    ambientIntensity: 0.21,
    auroraIntensity: 0.36,
    starIntensity: 0.55,
    cloudTint: new THREE.Color('#9e5f74'),
    cloudOpacity: 0.38,
    treeLightFactor: 0.92,
    cabinLightFactor: 0.95,
    mistOpacity: 0.38,
    snowCover: 0.76,
    exposure: 1.06,
    envIntensity: 0.98
  },
  {
    hour: 21.0,
    phase: 'Aurora Night',
    phaseZh: '极光夜景',
    skyZenith: new THREE.Color('#040917'),
    skyMid: new THREE.Color('#09162e'),
    skyHorizon: new THREE.Color('#122745'),
    fogColor: new THREE.Color('#0c192e'),
    fogDensity: 0.0014,
    sunColor: new THREE.Color('#8eb6eb'),
    sunIntensity: 0.76,
    hemiSky: new THREE.Color('#1e3a63'),
    hemiGround: new THREE.Color('#0b131e'),
    hemiIntensity: 0.58,
    ambientIntensity: 0.19,
    auroraIntensity: 1.0,
    starIntensity: 1.0,
    cloudTint: new THREE.Color('#192d4a'),
    cloudOpacity: 0.24,
    treeLightFactor: 1.0,
    cabinLightFactor: 1.0,
    mistOpacity: 0.56,
    snowCover: 0.92,
    exposure: 1.08,
    envIntensity: 0.96
  },
  {
    hour: 24.0,
    phase: 'Aurora Night',
    phaseZh: '极光午夜',
    skyZenith: new THREE.Color('#040814'),
    skyMid: new THREE.Color('#081428'),
    skyHorizon: new THREE.Color('#10233d'),
    fogColor: new THREE.Color('#0b172a'),
    fogDensity: 0.00145,
    sunColor: new THREE.Color('#8db4e8'),
    sunIntensity: 0.72,
    hemiSky: new THREE.Color('#1b3559'),
    hemiGround: new THREE.Color('#0b121c'),
    hemiIntensity: 0.55,
    ambientIntensity: 0.18,
    auroraIntensity: 1.0,
    starIntensity: 1.0,
    cloudTint: new THREE.Color('#182a44'),
    cloudOpacity: 0.25,
    treeLightFactor: 1.0,
    cabinLightFactor: 1.0,
    mistOpacity: 0.58,
    snowCover: 0.94,
    exposure: 1.08,
    envIntensity: 0.95
  }
];

function smoothLerp(a, b, t) {
  const s = t * t * (3 - 2 * t);
  return a + (b - a) * s;
}

function buildProceduralEnvMap(renderer, config) {
  const pmrem = new THREE.PMREMGenerator(renderer);
  pmrem.compileEquirectangularShader();

  const envScene = new THREE.Scene();

  // Gradient sky sphere inside mini env scene
  const skyGeo = new THREE.SphereGeometry(50, 32, 16);
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    uniforms: {
      uTop: { value: new THREE.Color(config.top) },
      uMid: { value: new THREE.Color(config.mid) },
      uBot: { value: new THREE.Color(config.bot) },
      uAccent: { value: new THREE.Color(config.accent) },
      uWarmSpot: { value: new THREE.Color(config.warmSpot) }
    },
    vertexShader: `
      varying vec3 vPos;
      void main() {
        vPos = normalize(position);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 uTop;
      uniform vec3 uMid;
      uniform vec3 uBot;
      uniform vec3 uAccent;
      uniform vec3 uWarmSpot;
      varying vec3 vPos;
      void main() {
        float y = vPos.y;
        vec3 col = y > 0.0
          ? mix(uMid, uTop, pow(y, 0.7))
          : mix(uMid, uBot, pow(-y, 0.5));
        // Northern aurora / sky highlight band
        float band = exp(-pow((y - 0.35) * 4.0, 2.0)) * smoothstep(-0.2, 0.8, -vPos.z);
        col += uAccent * band * 1.4;
        // Warm specular reflections for ornaments (simulating fairy lights & sun)
        float warm1 = pow(max(0.0, dot(vPos, normalize(vec3(0.6, 0.35, 0.5)))), 18.0);
        float warm2 = pow(max(0.0, dot(vPos, normalize(vec3(-0.7, 0.2, 0.4)))), 22.0);
        col += uWarmSpot * (warm1 * 2.2 + warm2 * 1.5);
        gl_FragColor = vec4(col, 1.0);
      }
    `
  });
  envScene.add(new THREE.Mesh(skyGeo, skyMat));

  // Add subtle bright specular studio-like points so glass/gold ornaments sparkle realistically
  const lightGeo = new THREE.SphereGeometry(1.4, 8, 8);
  const warmMat = new THREE.MeshBasicMaterial({ color: config.sparkleColor });
  const positions = [
    [16, 12, 14], [-18, 9, 10], [8, 18, -14], [-12, 16, -16], [0, -8, 18]
  ];
  for (const [x, y, z] of positions) {
    const m = new THREE.Mesh(lightGeo, warmMat);
    m.position.set(x, y, z);
    envScene.add(m);
  }

  const rt = pmrem.fromScene(envScene, 0.04);
  skyGeo.dispose();
  skyMat.dispose();
  lightGeo.dispose();
  warmMat.dispose();
  pmrem.dispose();
  return rt.texture;
}

export class DayNightSystem {
  constructor(scene, renderer) {
    this.scene = scene;
    this.renderer = renderer;

    // 24h in 180 seconds by default
    this.cycleDuration = 180;
    this.timeHours = 21.25; // Start in magical Aurora Night (21:15)
    this.speedMultiplier = 1.0;
    this.paused = false;

    // Smooth target transition for preset clicks
    this.targetHours = null;

    // Lights
    this.keyLight = new THREE.DirectionalLight('#8eb6eb', 0.76);
    this.keyLight.castShadow = true;
    this.keyLight.shadow.camera.near = 5;
    this.keyLight.shadow.camera.far = 260;
    const d = 48;
    this.keyLight.shadow.camera.left = -d;
    this.keyLight.shadow.camera.right = d;
    this.keyLight.shadow.camera.top = d;
    this.keyLight.shadow.camera.bottom = -d;
    this.keyLight.shadow.bias = -0.0005;
    this.keyLight.shadow.normalBias = 0.03;
    scene.add(this.keyLight);

    // Subtle secondary rim/aurora fill light from the north
    this.auroraFillLight = new THREE.DirectionalLight('#35e09e', 0.35);
    this.auroraFillLight.position.set(-15, 42, -90);
    scene.add(this.auroraFillLight);

    this.hemiLight = new THREE.HemisphereLight('#1e3a63', '#0b131e', 0.58);
    scene.add(this.hemiLight);

    this.ambientLight = new THREE.AmbientLight('#8fb0d8', 0.19);
    scene.add(this.ambientLight);

    // Fog
    this.fog = new THREE.FogExp2('#0c192e', 0.0023);
    scene.fog = this.fog;

    // Pre-generate 3 procedural PMREM environment maps (night/aurora, twilight, day)
    this.envMaps = {
      night: buildProceduralEnvMap(renderer, {
        top: '#071024',
        mid: '#142947',
        bot: '#0a121d',
        accent: '#32d99b',
        warmSpot: '#ffcf86',
        sparkleColor: '#ffe0a8'
      }),
      twilight: buildProceduralEnvMap(renderer, {
        top: '#1d2452',
        mid: '#9b5f73',
        bot: '#221c29',
        accent: '#f09168',
        warmSpot: '#ffd59c',
        sparkleColor: '#ffe5bd'
      }),
      day: buildProceduralEnvMap(renderer, {
        top: '#2463b8',
        mid: '#9ac6ee',
        bot: '#384c3a',
        accent: '#eef6ff',
        warmSpot: '#fff4df',
        sparkleColor: '#ffffff'
      })
    };
    this.currentEnvKey = 'night';
    scene.environment = this.envMaps.night;

    // Output interpolated state read by sky, water, tree, cabins, mist
    this.state = {
      hour: this.timeHours,
      phase: 'Aurora Night',
      phaseZh: '极光夜景',
      skyZenith: new THREE.Color(),
      skyMid: new THREE.Color(),
      skyHorizon: new THREE.Color(),
      fogColor: new THREE.Color(),
      fogDensity: 0.0023,
      sunDir: new THREE.Vector3(0, 0.3, -1),
      moonDir: new THREE.Vector3(0.3, 0.45, -0.8),
      sunColor: new THREE.Color(),
      sunElevation: -0.2,
      auroraIntensity: 1.0,
      starIntensity: 1.0,
      cloudTint: new THREE.Color(),
      cloudOpacity: 0.24,
      treeLightFactor: 1.0,
      cabinLightFactor: 1.0,
      mistOpacity: 0.4,
      snowCover: 0.92
    };

    this.applyState();
  }

  setShadowMapSize(size) {
    this.keyLight.shadow.mapSize.set(size, size);
  }

  setTime(hours) {
    this.targetHours = null;
    this.timeHours = ((hours % 24) + 24) % 24;
    this.applyState();
  }

  transitionToTime(hours) {
    this.targetHours = ((hours % 24) + 24) % 24;
  }

  update(dt) {
    if (this.targetHours !== null) {
      let diff = this.targetHours - this.timeHours;
      if (diff > 12) diff -= 24;
      if (diff < -12) diff += 24;
      if (Math.abs(diff) < 0.04) {
        this.timeHours = this.targetHours;
        this.targetHours = null;
      } else {
        this.timeHours = ((this.timeHours + diff * Math.min(1, dt * 6.0)) % 24 + 24) % 24;
      }
    } else if (!this.paused) {
      const hoursPerSec = (24 / this.cycleDuration) * this.speedMultiplier;
      this.timeHours = (this.timeHours + dt * hoursPerSec) % 24;
    }

    this.applyState();
    return this.state;
  }

  applyState() {
    const h = this.timeHours;
    let k0 = KEYFRAMES[0];
    let k1 = KEYFRAMES[KEYFRAMES.length - 1];
    for (let i = 0; i < KEYFRAMES.length - 1; i++) {
      if (h >= KEYFRAMES[i].hour && h <= KEYFRAMES[i + 1].hour) {
        k0 = KEYFRAMES[i];
        k1 = KEYFRAMES[i + 1];
        break;
      }
    }

    const span = Math.max(0.0001, k1.hour - k0.hour);
    const rawT = (h - k0.hour) / span;
    const t = rawT * rawT * (3 - 2 * rawT);

    const s = this.state;
    s.hour = h;
    s.phase = rawT < 0.5 ? k0.phase : k1.phase;
    s.phaseZh = rawT < 0.5 ? k0.phaseZh : k1.phaseZh;

    s.skyZenith.copy(k0.skyZenith).lerp(k1.skyZenith, t);
    s.skyMid.copy(k0.skyMid).lerp(k1.skyMid, t);
    s.skyHorizon.copy(k0.skyHorizon).lerp(k1.skyHorizon, t);
    s.fogColor.copy(k0.fogColor).lerp(k1.fogColor, t);
    s.fogDensity = smoothLerp(k0.fogDensity, k1.fogDensity, rawT);
    s.sunColor.copy(k0.sunColor).lerp(k1.sunColor, t);
    s.cloudTint.copy(k0.cloudTint).lerp(k1.cloudTint, t);

    s.auroraIntensity = smoothLerp(k0.auroraIntensity, k1.auroraIntensity, rawT);
    s.starIntensity = smoothLerp(k0.starIntensity, k1.starIntensity, rawT);
    s.cloudOpacity = smoothLerp(k0.cloudOpacity, k1.cloudOpacity, rawT);
    s.treeLightFactor = smoothLerp(k0.treeLightFactor, k1.treeLightFactor, rawT);
    s.cabinLightFactor = smoothLerp(k0.cabinLightFactor, k1.cabinLightFactor, rawT);
    s.mistOpacity = smoothLerp(k0.mistOpacity, k1.mistOpacity, rawT);
    s.snowCover = smoothLerp(k0.snowCover, k1.snowCover, rawT);

    // Nordic winter sun arc (low dramatic Scandinavian sun angle)
    // Sunrise ~06:00 (East +X), Noon 12:30 (South-ish / behind camera +Z,+Y), Sunset ~18:30 (West -X)
    const dayAngle = ((h - 6.0) / 12.5) * Math.PI;
    const sunElev = Math.sin(dayAngle) * 0.58; // Max ~35 degrees typical of Nordic high latitude
    const sunAzim = Math.cos(dayAngle);
    s.sunElevation = sunElev;

    s.sunDir.set(
      sunAzim * 0.85,
      sunElev,
      -0.48 + Math.sin(dayAngle) * 0.65
    ).normalize();

    // Moon arc opposite sun, illuminating from high upper-right-back for cinematic silhouettes
    const moonAngle = dayAngle + Math.PI;
    s.moonDir.set(
      Math.cos(moonAngle) * 0.55 + 0.25,
      Math.max(0.28, Math.sin(moonAngle) * 0.52 + 0.18),
      -0.65
    ).normalize();

    // Key light switches smoothly between sun (day/dawn/dusk) and moon (night)
    const isDayKey = sunElev > -0.05;
    const activeDir = isDayKey ? s.sunDir : s.moonDir;
    this.keyLight.position.copy(activeDir).multiplyScalar(115);
    this.keyLight.color.copy(s.sunColor);
    this.keyLight.intensity = smoothLerp(k0.sunIntensity, k1.sunIntensity, rawT);

    // Subtle green-teal aurora ambient cast on snow and grass at night
    this.auroraFillLight.intensity = s.auroraIntensity * 0.42;

    this.hemiLight.color.copy(k0.hemiSky).lerp(k1.hemiSky, t);
    this.hemiLight.groundColor.copy(k0.hemiGround).lerp(k1.hemiGround, t);
    this.hemiLight.intensity = smoothLerp(k0.hemiIntensity, k1.hemiIntensity, rawT);
    this.ambientLight.intensity = smoothLerp(k0.ambientIntensity, k1.ambientIntensity, rawT);

    this.fog.color.copy(s.fogColor);
    this.fog.density = s.fogDensity;

    this.renderer.toneMappingExposure = smoothLerp(k0.exposure, k1.exposure, rawT);

    // Swap PMREM environment map cleanly by period
    let targetEnv = 'night';
    if (h >= 8.2 && h <= 16.0) {
      targetEnv = 'day';
    } else if ((h >= 5.5 && h < 8.2) || (h > 16.0 && h <= 19.6)) {
      targetEnv = 'twilight';
    }
    if (targetEnv !== this.currentEnvKey) {
      this.currentEnvKey = targetEnv;
      this.scene.environment = this.envMaps[targetEnv];
    }
    if ('environmentIntensity' in this.scene) {
      this.scene.environmentIntensity = smoothLerp(k0.envIntensity, k1.envIntensity, rawT);
    }
  }
}
