// Adaptive performance configuration based on device capabilities

export function detectPerformanceProfile() {
  const cores = navigator.hardwareConcurrency || 4;
  const mem = navigator.deviceMemory || 8;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

  // Detect GPU renderer string if available
  let tier = 'high';
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    if (gl) {
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const rendererStr = ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : '';
      if (/SwiftShader|llvmpipe|Software|Microsoft Basic/i.test(rendererStr)) {
        tier = 'medium';
      } else if (/Intel.*UHD|Intel.*HD|Mali|Adreno [0-5]/i.test(rendererStr)) {
        tier = 'medium';
      }
    }
  } catch (_) {
    // Fallback silently
  }

  if (isMobile || cores <= 4 || mem <= 4) {
    tier = 'medium';
  }
  if (isMobile && mem <= 3) {
    tier = 'low';
  }

  if (tier === 'low') {
    return {
      tier: 'low',
      pixelRatio: Math.min(dpr, 1.25),
      shadowMapSize: 1024,
      terrainSegments: 180,
      grassCount: 6500,
      snowCount: 2800,
      forestCount: 520,
      distantForestCount: 1200,
      shrubCount: 320,
      needleClusterCount: 3800,
      fairyLightCount: 420,
      bloomResolutionScale: 0.5
    };
  }

  if (tier === 'medium') {
    return {
      tier: 'medium',
      pixelRatio: Math.min(dpr, 1.5),
      shadowMapSize: 2048,
      terrainSegments: 220,
      grassCount: 13000,
      snowCount: 4600,
      forestCount: 780,
      distantForestCount: 1900,
      shrubCount: 480,
      needleClusterCount: 5400,
      fairyLightCount: 620,
      bloomResolutionScale: 0.75
    };
  }

  return {
    tier: 'high',
    pixelRatio: Math.min(dpr, 2.0),
    shadowMapSize: 2048,
    terrainSegments: 264,
    grassCount: 20000,
    snowCount: 6500,
    forestCount: 1050,
    distantForestCount: 2500,
    shrubCount: 650,
    needleClusterCount: 7200,
    fairyLightCount: 820,
    bloomResolutionScale: 1.0
  };
}
