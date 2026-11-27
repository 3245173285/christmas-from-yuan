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
import { NordicSnowmanFamily } from './scene/snowmanFamily.js';
import { EnvironmentDetails } from './scene/environmentDetails.js';
import { FestiveMeadow } from './scene/festiveMeadow.js';
import { DistantLandscape } from './scene/distantLandscape.js';
import { createSurfaceSampler, clearOccupiedDetails } from './scene/detailGeometry.js';
import { CinematicCameraRig } from './scene/cameraRig.js';
import { MagicParticles } from './scene/magicParticles.js';
import { InteractionManager } from './scene/interactionManager.js';
import { NordicAudioEngine } from './audio/audioEngine.js';
import { ControlsUI } from './ui/controlsUI.js';
import { FrostIntro } from './ui/frostIntro.js';
import { GiftCardModal } from './ui/giftCardModal.js';
import { WishCardStudio } from './ui/wishCardStudio.js';
import { fetchWishCards } from './services/wishCardsService.js';

function initNordicChristmas() {
  const container = document.getElementById('canvas-container');
  const perf = detectPerformanceProfile();

  // 1. WebGL Renderer with ACES Filmic Tone Mapping & Crisp Antialiasing
  const renderer = new THREE.WebGLRenderer({
    antialias: perf.antialias !== false,
    powerPreference: 'high-performance'
  });
  renderer.setPixelRatio(perf.pixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = perf.useShadowMap !== false;
  if (renderer.shadowMap.enabled) {
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    // On-demand shadow baking: only updates when sun/moon angle shifts noticeably (0 updates when paused!)
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
  const fjordWater = new FjordWater(scene, perf);
  const cabins = new NorwegianCabins(scene);
  const christmasTree = new LuxuryChristmasTree(scene, perf);
  const snowmanFamily = new NordicSnowmanFamily(scene);
  const envDetails = new EnvironmentDetails(scene, perf);
  const surface = createSurfaceSampler(perf);
  const festiveMeadow = new FestiveMeadow(scene, surface);
  const distantLandscape = new DistantLandscape(scene, surface);
  clearOccupiedDetails(envDetails.group,
    [...festiveMeadow.clearAreas, ...distantLandscape.clearAreas], distantLandscape.clearRoutes);
  const magicParticles = new MagicParticles(scene, perf.isMobile ? 1600 : 3600);
  const cameraRig = new CinematicCameraRig(camera, renderer.domElement);
  const audioEngine = new NordicAudioEngine();
  const giftCardModal = new GiftCardModal();
  const wishCardStudio = new WishCardStudio({
    onCardSubmitted: (card, allCards) => {
      if (Array.isArray(allCards) && allCards.length > 0) {
        christmasTree.syncWishCards(allCards);
      }
      const worldPos = christmasTree.hangNewWishCard(card);
      magicParticles.emitGiftBurst(worldPos);
      audioEngine.playGiftOpen();
    },
    onCardsMutated: (cards) => {
      christmasTree.syncWishCards(cards);
    }
  });

  const btnOpenStudio = document.getElementById('btn-open-card-studio');
  if (btnOpenStudio) {
    btnOpenStudio.addEventListener('click', () => {
      wishCardStudio.openCreate();
    });
  }

  // Secret Yuan Admin Door: tap/click the top "CHRISTMAS FROM YUAN" title 5 times within 2.5s!
  const heroTitleEl = document.querySelector('.hero-title');
  if (heroTitleEl) {
    let tapCount = 0;
    let tapTimer = null;
    heroTitleEl.addEventListener('click', (e) => {
      e.stopPropagation();
      tapCount++;
      clearTimeout(tapTimer);
      if (tapCount >= 5) {
        tapCount = 0;
        wishCardStudio.openAdminUnlock();
      } else {
        tapTimer = setTimeout(() => {
          tapCount = 0;
        }, 2500);
      }
    });
  }

  // Load real-time wish cards (Cloudflare KV or local starter wall) & hang them directly on Yuan's 3D Christmas Tree!
  fetchWishCards().then((cards) => {
    christmasTree.syncWishCards(cards);
    wishCardStudio.setCards(cards);
  });

  new InteractionManager({
    camera,
    domElement: renderer.domElement,
    christmasTree,
    skyAndAurora,
    magicParticles,
    cameraRig,
    audioEngine,
    giftCardModal,
    wishCardStudio,
    snowmanFamily
  });

  const ui = new ControlsUI({
    dayNight,
    cameraRig,
    envDetails,
    audioEngine
  });

  // Interactive Glacial-Ice Intro Overlay -> reveals Liquid Glass HUD smoothly upon >=40% wipe or Enter
  const hudRoot = document.getElementById('hud-root');
  let introEnteredAt = -1;
  new FrostIntro({
    onEnter: () => {
      introEnteredAt = performance.now();
      if (hudRoot) {
        setTimeout(() => {
          hudRoot.classList.remove('is-awaiting-intro');
          ui.resetIdleFade();
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

  // 6. Locked 60 FPS Frame Pacer + Tab Visibility Pause + Post-Intro Adaptive DPR Safeguard
  const targetFps = perf.targetFps || 60;
  const frameIntervalMs = 1000 / targetFps;
  let lastFrameNow = performance.now();
  let isTabHidden = document.hidden;

  let fpsFrames = 0;
  let fpsAccum = 0;
  let adapted = false;

  const lastShadowLightDir = new THREE.Vector3();
  const curLightDir = new THREE.Vector3();
  let hasBakedInitialShadow = false;

  const clock = new THREE.Clock();

  document.addEventListener('visibilitychange', () => {
    isTabHidden = document.hidden;
    if (!isTabHidden) {
      clock.getDelta(); // discard paused delta spike
      lastFrameNow = performance.now();
    }
  });

  // 7. Smooth 60 FPS Main Animation Loop
  function animate(now) {
    requestAnimationFrame(animate);
    if (isTabHidden) return;

    const elapsedMs = now - lastFrameNow;
    // Lock cleanly to 60 FPS (0.6ms tolerance keeps native 60Hz displays perfectly synchronized without skipping frames!)
    if (elapsedMs < frameIntervalMs - 0.6) return;
    lastFrameNow = now - (elapsedMs % frameIntervalMs);

    const dt = Math.min(clock.getDelta(), 0.1);
    const elapsed = clock.elapsedTime;

    // Post-intro adaptive DPR safeguard (only measures AFTER ice intro exits + 2s shader warmup so phones never get locked into low-res!)
    if (!adapted && introEnteredAt > 0 && now - introEnteredAt > 2000) {
      fpsFrames++;
      fpsAccum += dt;
      if (fpsAccum >= 3.0) {
        const avgFps = fpsFrames / fpsAccum;
        if (avgFps < 28) {
          const targetDpr = perf.minAdaptiveDpr || 1.1;
          if (renderer.getPixelRatio() > targetDpr) {
            renderer.setPixelRatio(targetDpr);
            if (composer) composer.setPixelRatio(targetDpr);
          }
        }
        adapted = true;
      }
    }

    const dayState = dayNight.update(dt);

    // Smooth continuous directional shadows whenever sun/moon moves (eliminates stepped frame-by-frame shadow jumps while staying 0-cost when paused!)
    if (renderer.shadowMap.enabled) {
      curLightDir.copy(dayNight.keyLight.position).normalize();
      const isTransitioning = dayNight.targetHours !== null;
      if (!hasBakedInitialShadow || isTransitioning || curLightDir.distanceToSquared(lastShadowLightDir) > 0.0000008) {
        lastShadowLightDir.copy(curLightDir);
        renderer.shadowMap.needsUpdate = true;
        hasBakedInitialShadow = true;
      }
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
    snowmanFamily.update(elapsed, dt, dayState);
    envDetails.update(elapsed, dt, dayState);
    festiveMeadow.update(elapsed, dt, dayState);
    distantLandscape.update(elapsed, dt, dayState);
    magicParticles.update(elapsed, dt);
    ui.updateTimeDisplay(dayState);

    if (composer) {
      composer.render();
    } else {
      renderer.render(scene, camera);
    }
  }

  requestAnimationFrame(animate);
}

initNordicChristmas();
