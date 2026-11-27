import './style.css';
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

import { detectPerformanceProfile } from './utils/perf.js';
import { DayNightSystem } from './scene/dayNight.js';
import { SkyAndAurora } from './scene/skyAndAurora.js';
import { NordicTerrain } from './scene/terrain.js';
import { FjordWater } from './scene/water.js';
import { NorwegianCabins } from './scene/cabins.js';
import { LuxuryChristmasTree } from './scene/christmasTree.js';
import { EnvironmentDetails } from './scene/environmentDetails.js';
import { CinematicCameraRig } from './scene/cameraRig.js';
import { MagicParticles } from './scene/magicParticles.js';
import { InteractionManager } from './scene/interactionManager.js';
import { NordicAudioEngine } from './audio/audioEngine.js';
import { ControlsUI } from './ui/controlsUI.js';
import { FrostIntro } from './ui/frostIntro.js';
import { GiftCardModal } from './ui/giftCardModal.js';

function initNordicChristmas() {
  const container = document.getElementById('canvas-container');
  const perf = detectPerformanceProfile();

  // 1. WebGL Renderer with ACES Filmic Tone Mapping & Soft Shadows
  const renderer = new THREE.WebGLRenderer({
    antialias: !perf.isMobile,
    powerPreference: 'high-performance'
  });
  renderer.setPixelRatio(perf.pixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = perf.isMobile ? THREE.PCFShadowMap : THREE.PCFSoftShadowMap;
  if (perf.shadowThrottleFrames > 1) {
    renderer.shadowMap.autoUpdate = false;
    renderer.shadowMap.needsUpdate = true;
  }
  container.appendChild(renderer.domElement);

  // 2. Scene & Portrait-Adaptive Cinematic Perspective Camera
  const scene = new THREE.Scene();
  const computeFov = (w, h) => {
    const aspect = w / Math.max(1, h);
    // Smoothly widen vertical FOV on portrait mobile phones so tree, gifts, village & aurora fit harmoniously!
    return aspect < 0.85 ? Math.min(66, 50 + (0.85 - aspect) * 42) : 50;
  };
  const camera = new THREE.PerspectiveCamera(
    computeFov(window.innerWidth, window.innerHeight),
    window.innerWidth / window.innerHeight,
    0.25,
    1850
  );

  // 3. Post-Processing Pipeline (Desktop uses selective UnrealBloomPass; Mobile renders directly for +120% FPS!)
  let composer = null;
  let bloomPass = null;
  if (perf.useBloom) {
    composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    bloomPass = new UnrealBloomPass(
      new THREE.Vector2(
        Math.floor(window.innerWidth * perf.bloomResolutionScale),
        Math.floor(window.innerHeight * perf.bloomResolutionScale)
      ),
      0.42,
      0.58,
      0.86
    );
    composer.addPass(bloomPass);
    composer.addPass(new OutputPass());
  }

  // 4. Assemble World Systems
  const dayNight = new DayNightSystem(scene, renderer);
  dayNight.setShadowMapSize(perf.shadowMapSize);

  const skyAndAurora = new SkyAndAurora(scene, perf);
  const terrain = new NordicTerrain(scene, perf);
  const fjordWater = new FjordWater(scene);
  const cabins = new NorwegianCabins(scene);
  const christmasTree = new LuxuryChristmasTree(scene, perf);
  const envDetails = new EnvironmentDetails(scene, perf);
  const magicParticles = new MagicParticles(scene, perf.isMobile ? 1600 : 3600);
  const cameraRig = new CinematicCameraRig(camera, renderer.domElement);
  const audioEngine = new NordicAudioEngine();
  const giftCardModal = new GiftCardModal();

  new InteractionManager({
    camera,
    domElement: renderer.domElement,
    christmasTree,
    skyAndAurora,
    magicParticles,
    cameraRig,
    audioEngine,
    giftCardModal
  });

  const ui = new ControlsUI({
    dayNight,
    cameraRig,
    envDetails,
    audioEngine
  });

  // Interactive Frosted-Ice Intro Overlay -> reveals Liquid Glass HUD & brief gentle interaction hint upon Enter
  const hudRoot = document.getElementById('hud-root');
  const magicToast = document.getElementById('magic-hint-toast');
  new FrostIntro({
    onEnter: () => {
      if (hudRoot) {
        setTimeout(() => {
          hudRoot.classList.remove('is-awaiting-intro');
          ui.resetIdleFade();
          if (magicToast) {
            magicToast.classList.add('is-visible');
            setTimeout(() => magicToast.classList.remove('is-visible'), 6200);
          }
        }, 380);
      }
    }
  });

  // 5. Responsive Window Resize (with portrait-aware FOV adjustment)
  window.addEventListener('resize', () => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    camera.fov = computeFov(w, h);
    camera.aspect = w / Math.max(1, h);
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
    if (composer && bloomPass) {
      composer.setSize(w, h);
      bloomPass.setSize(
        Math.floor(w * perf.bloomResolutionScale),
        Math.floor(h * perf.bloomResolutionScale)
      );
    }
  });

  // 6. Adaptive Runtime FPS Monitor (gracefully lowers DPR if sustained low FPS)
  let fpsFrames = 0;
  let fpsAccum = 0;
  let adapted = false;
  let frameCounter = 0;

  // 7. Smooth Main Animation Loop
  const clock = new THREE.Clock();

  function animate() {
    requestAnimationFrame(animate);

    const dt = Math.min(clock.getDelta(), 0.1);
    const elapsed = clock.elapsedTime;
    frameCounter++;

    // Adaptive resolution safeguard during first ~3.5 seconds
    if (!adapted) {
      fpsFrames++;
      fpsAccum += dt;
      if (fpsAccum >= 3.0) {
        const avgFps = fpsFrames / fpsAccum;
        if (avgFps < 26) {
          const targetDpr = perf.isMobile ? 0.88 : 1.0;
          if (renderer.getPixelRatio() > targetDpr) {
            renderer.setPixelRatio(targetDpr);
            if (composer) composer.setPixelRatio(targetDpr);
          }
        }
        adapted = true;
      }
    }

    const dayState = dayNight.update(dt);

    // Throttled directional shadow map baking on mobile (reduces shadow GPU work by ~80%)
    if (perf.shadowThrottleFrames > 1 && frameCounter % perf.shadowThrottleFrames === 0) {
      renderer.shadowMap.needsUpdate = true;
    }

    // Modulate bloom smoothly on desktop
    if (bloomPass) {
      bloomPass.strength = 0.18 + dayState.treeLightFactor * 0.3;
      bloomPass.threshold = 0.92 - dayState.treeLightFactor * 0.12;
    }

    cameraRig.update(elapsed, dt);
    terrain.update(dayState);
    skyAndAurora.update(elapsed, dt, dayState, camera.position);
    fjordWater.update(elapsed, dayState);
    cabins.update(elapsed, dt, dayState);
    christmasTree.update(elapsed, dt, dayState);
    envDetails.update(elapsed, dt, dayState);
    magicParticles.update(elapsed, dt);
    ui.updateTimeDisplay(dayState);

    if (composer) {
      composer.render();
    } else {
      renderer.render(scene, camera);
    }
  }

  animate();
}

initNordicChristmas();
