// Unified Full-Quality Profile (Mobile & Desktop run identical full visuals with locked 60 FPS!)
// Pre-baked Noise LUT, terrain RGBA detail, panoramic treeline & batched town meshes keep both platforms fast without downgrading mobile.

export function detectPerformanceProfile() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);

  return {
    tier: 'high',
    isMobile: false, // Zero feature/quality downgrades on mobile — identical Bloom, Shadows, 3 Aurora Curtains, PBR Clearcoat & full forest density!
    targetFps: 60,
    antialias: true,
    pixelRatio: Math.min(dpr, 1.5),
    minAdaptiveDpr: 1.2,
    useBloom: true,
    useShadowMap: true,
    shadowMapSize: 2048,
    treeNeedlesCastShadow: false, // Solid inner tree core + boughs + gifts cast full crisp tree shadow without 170k alpha shadow tris
    terrainSegments: 224,
    grassCount: 16000,
    snowCount: 5400,
    forestCount: 680,
    distantForestCount: 1650,
    shrubCount: 480,
    needleClusterCount: 5400,
    needleScaleBoost: 1.12,
    fairyLightCount: 760,
    auroraCurtainCount: 3,
    bloomResolutionScale: 0.5
  };
}
