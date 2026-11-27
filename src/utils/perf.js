// Adaptive performance configuration with dedicated Mobile GPU optimization profile

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
      pixelRatio: Math.min(dpr, 1.15),
      useBloom: false, // Direct WebGL render on mobile avoids 5-pass floating-point bloom bottleneck (+120% FPS!)
      shadowMapSize: 1024,
      shadowThrottleFrames: 5, // Update directional shadows ~12Hz on mobile (indistinguishable for slow sun arc)
      treeNeedlesCastShadow: false,
      terrainSegments: 160,
      grassCount: 4800, // Clumps computed as ~20% -> ~960 lush soft clumps
      snowCount: 1800,
      forestCount: 340,
      distantForestCount: 820,
      shrubCount: 220,
      needleClusterCount: 2500, // Slightly scaled fronds keep full lush tree silhouette with 65% less alpha overdraw
      needleScaleBoost: 1.38,
      fairyLightCount: 460,
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
      pixelRatio: Math.min(dpr, 1.5),
      useBloom: true,
      shadowMapSize: 2048,
      shadowThrottleFrames: 2,
      treeNeedlesCastShadow: true,
      terrainSegments: 220,
      grassCount: 13000,
      snowCount: 4600,
      forestCount: 780,
      distantForestCount: 1900,
      shrubCount: 480,
      needleClusterCount: 5400,
      needleScaleBoost: 1.08,
      fairyLightCount: 620,
      auroraCurtainCount: 3,
      bloomResolutionScale: 0.7
    };
  }

  return {
    tier: 'high',
    isMobile: false,
    pixelRatio: Math.min(dpr, 2.0),
    useBloom: true,
    shadowMapSize: 2048,
    shadowThrottleFrames: 1,
    treeNeedlesCastShadow: true,
    terrainSegments: 264,
    grassCount: 20000,
    snowCount: 6500,
    forestCount: 1050,
    distantForestCount: 2500,
    shrubCount: 650,
    needleClusterCount: 7200,
    needleScaleBoost: 1.0,
    fairyLightCount: 820,
    auroraCurtainCount: 3,
    bloomResolutionScale: 1.0
  };
}
