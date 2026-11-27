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
    antialias: true,
    powerPreference: 'high-performance'
  });
  renderer.setPixelRatio(perf.pixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.appendChild(renderer.domElement);

  // 2. Scene & Cinematic Perspective Camera
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.25, 1850);

  // 3. Post-Processing Pipeline (EffectComposer + Selective UnrealBloomPass + OutputPass)
  const composer = new EffectComposer(renderer);
  const renderPass = new RenderPass(scene, camera);
  composer.addPass(renderPass);

  const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(
      Math.floor(window.innerWidth * perf.bloomResolutionScale),
      Math.floor(window.innerHeight * perf.bloomResolutionScale)
    ),
    0.42, // subtle cinematic strength
    0.58, // soft dreamy radius
    0.86  // threshold so only lights/star/windows/glints bloom
  );
  composer.addPass(bloomPass);

  const outputPass = new OutputPass();
  composer.addPass(outputPass);

  // 4. Assemble World Systems
  const dayNight = new DayNightSystem(scene, renderer);
  dayNight.setShadowMapSize(perf.shadowMapSize);

  const skyAndAurora = new SkyAndAurora(scene);
  const terrain = new NordicTerrain(scene, perf);
  const fjordWater = new FjordWater(scene);
  const cabins = new NorwegianCabins(scene);
  const christmasTree = new LuxuryChristmasTree(scene, perf);
  const envDetails = new EnvironmentDetails(scene, perf);
  const magicParticles = new MagicParticles(scene, 3600);
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

  // 5. Responsive Window Resize
  window.addEventListener('resize', () => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
    composer.setSize(w, h);
    bloomPass.setSize(
      Math.floor(w * perf.bloomResolutionScale),
      Math.floor(h * perf.bloomResolutionScale)
    );
  });

  // 6. Adaptive Runtime FPS Monitor (gracefully lowers DPR if sustained low FPS)
  let fpsFrames = 0;
  let fpsAccum = 0;
  let adapted = false;

  // 7. Smooth Main Animation Loop
  const clock = new THREE.Clock();
  let firstFrameDone = false;

  function animate() {
    requestAnimationFrame(animate);

    const dt = Math.min(clock.getDelta(), 0.1);
    const elapsed = clock.elapsedTime;

    // Adaptive resolution safeguard during first ~4 seconds
    if (!adapted) {
      fpsFrames++;
      fpsAccum += dt;
      if (fpsAccum >= 3.0) {
        const avgFps = fpsFrames / fpsAccum;
        if (avgFps < 26 && renderer.getPixelRatio() > 1.0) {
          renderer.setPixelRatio(1.0);
          composer.setPixelRatio(1.0);
        }
        adapted = true;
      }
    }

    const dayState = dayNight.update(dt);

    // Modulate bloom smoothly: dreamy glow at dusk/night, crisp restraint at snowy midday
    bloomPass.strength = 0.18 + dayState.treeLightFactor * 0.3;
    bloomPass.threshold = 0.92 - dayState.treeLightFactor * 0.12;

    cameraRig.update(elapsed, dt);
    terrain.update(dayState);
    skyAndAurora.update(elapsed, dt, dayState, camera.position);
    fjordWater.update(elapsed, dayState);
    cabins.update(elapsed, dt, dayState);
    christmasTree.update(elapsed, dt, dayState);
    envDetails.update(elapsed, dt, dayState);
    magicParticles.update(elapsed, dt);
    ui.updateTimeDisplay(dayState);

    composer.render();
  }

  animate();
}

initNordicChristmas();
