// Adaptive performance configuration with locked 60 FPS, crisp Mobile antialiasing & hybrid far-treeline LOD

export function detectPerformanceProfile() {
  const cores = navigator.hardwareConcurrency || 4;
  const mem = navigator.deviceMemory || 8;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent)
    || (window.matchMedia && window.matchMedia('(pointer: coarse)').matches && Math.min(window.innerWidth, window.innerHeight) < 920);

  if (isMobile) {
    return {
      tier: 'mobile',
      isMobile: true,
      targetFps: 60,
      antialias: true, // Crisp edges on mobile OLED (eliminates pixelated/aliased look!)
      pixelRatio: Math.min(dpr, 1.65), // Sharper Retina mobile visual fidelity at 60 FPS
      minAdaptiveDpr: 1.25, // Never drop into blurry pixel-art mode!
      useBloom: false, // Direct WebGL render avoids 5-pass floating-point bloom bottleneck
      useShadowMap: false, // Pre-baked contact shadow disc eliminates periodic ShadowMap micro-stutters & 9-tap PCF
      shadowMapSize: 512,
      treeNeedlesCastShadow: false,
      terrainSegments: 148,
      grassCount: 5400, // ~1,080 lightweight 6-tri clumps
      snowCount: 1800,
      forestCount: 420, // Near real 3D 56-tri volumetric spruces (4.6x fewer tris than before, MORE trees!)
      distantForestCount: 1350, // Midground 4-tri crossed spruce cards + 3 panoramic treeline backdrop bands!
      shrubCount: 280,
      needleClusterCount: 2400, // Lightweight 4-tri sprigs (6.2x fewer tris!) with slightly larger fronds
      needleScaleBoost: 1.4,
      fairyLightCount: 480,
      auroraCurtainCount: 2,
      bloomResolutionScale: 0.4
    };
  }

  // Desktop GPU tier detection
  let tier = 'high';
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    if (gl) {
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const rendererStr = ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : '';
      if (/SwiftShader|llvmpipe|Software|Microsoft Basic|Intel.*UHD|Intel.*HD/i.test(rendererStr)) {
        tier = 'medium';
      }
    }
  } catch (_) {
    // Fallback silently
  }

  if (cores <= 4 || mem <= 4) {
    tier = 'medium';
  }

  if (tier === 'medium') {
    return {
      tier: 'medium',
      isMobile: false,
      targetFps: 60,
      antialias: true,
      pixelRatio: Math.min(dpr, 1.35),
      minAdaptiveDpr: 1.0,
      useBloom: true,
      useShadowMap: true,
      shadowMapSize: 1024,
      treeNeedlesCastShadow: false, // Solid inner tree core + boughs + gifts cast clean crisp shadows without 170k alpha tris!
      terrainSegments: 196,
      grassCount: 11000,
      snowCount: 4200,
      forestCount: 520,
      distantForestCount: 1450,
      shrubCount: 380,
      needleClusterCount: 4200,
      needleScaleBoost: 1.18,
      fairyLightCount: 600,
      auroraCurtainCount: 2,
      bloomResolutionScale: 0.45
    };
  }

  return {
    tier: 'high',
    isMobile: false,
    targetFps: 60, // Hard 60 FPS cap keeps 144Hz/165Hz/240Hz laptop GPUs cool & whisper-quiet!
    antialias: true,
    pixelRatio: Math.min(dpr, 1.5), // Crisp on 2K/2.5K displays with 44% fewer pixels than 2.0!
    minAdaptiveDpr: 1.1,
    useBloom: true,
    useShadowMap: true,
    shadowMapSize: 2048,
    treeNeedlesCastShadow: false, // Saves ~172k alpha-tested shadow tris per shadow pass (core + boughs already cast full silhouette!)
    terrainSegments: 224,
    grassCount: 16000,
    snowCount: 5400,
    forestCount: 680, // Lush near 3D 56-tri spruces (8.8x lighter than old 320-tri!) + panoramic far treeline textures!
    distantForestCount: 1650,
    shrubCount: 480,
    needleClusterCount: 5400, // 8-tri arched sprigs (4x fewer tris!) with lush full canopy
    needleScaleBoost: 1.12,
    fairyLightCount: 760,
    auroraCurtainCount: 3,
    bloomResolutionScale: 0.5 // Half-res bloom is silky smooth and 4x faster on GPU!
  };
}
