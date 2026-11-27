import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { getTerrainHeight } from '../utils/noise.js';

// Small procedural assets share primitive geometry, then bake by material. No new lights,
// external files or per-piece draw calls are required for the static scenery.
export const primitives = {
  box: new THREE.BoxGeometry(1, 1, 1),
  sphere: new THREE.SphereGeometry(1, 14, 10),
  rock: new THREE.IcosahedronGeometry(1, 1),
  cylinder: new THREE.CylinderGeometry(1, 1, 1, 12),
  cone: new THREE.ConeGeometry(1, 1, 12),
  ring: new THREE.TorusGeometry(1, .08, 6, 24)
};
export const v3 = (x, y, z) => new THREE.Vector3(x, y, z);
export const standard = (color, options = {}) => new THREE.MeshStandardMaterial({ color, roughness: .72, ...options });
export function part(parent, geometry, material, position = [0,0,0], scale = [1,1,1], rotation = [0,0,0]) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(...position); mesh.scale.set(...scale); mesh.rotation.set(...rotation);
  parent.add(mesh); return mesh;
}
export function beam(parent, a, b, r, material, r2 = r) {
  const dir = b.clone().sub(a);
  const geometry = r2 === r ? primitives.cylinder : new THREE.CylinderGeometry(r2 / r, 1, 1, 9);
  const mesh = part(parent, geometry, material, a.clone().add(b).multiplyScalar(.5).toArray(), [r, dir.length(), r]);
  mesh.quaternion.setFromUnitVectors(v3(0,1,0), dir.normalize()); return mesh;
}
export function tube(parent, points, radius, mat, segments = 24, sides = 6) {
  const curve = new THREE.CatmullRomCurve3(points);
  return part(parent, new THREE.TubeGeometry(curve, segments, radius, sides, false), mat);
}
export function extrude(points, depth = .1, bevel = .015) {
  const shape = new THREE.Shape();
  points.forEach(([x,y], i) => i ? shape.lineTo(x,y) : shape.moveTo(x,y));
  shape.closePath();
  const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: bevel > 0, bevelSize: bevel, bevelThickness: bevel, bevelSegments: 2, steps: 1, curveSegments: 8 });
  g.translate(0,0,-depth*.5); g.computeVertexNormals(); return g;
}
// Bake template in its own coordinate system; each material becomes one mesh.
export function bake(group, { shadow = false, receive = true } = {}) {
  group.updateMatrixWorld(true);
  const inverse = group.matrixWorld.clone().invert();
  const byMaterial = new Map();
  group.traverse(obj => {
    if (!obj.isMesh) return;
    const g = obj.geometry.index ? obj.geometry.toNonIndexed() : obj.geometry.clone();
    for (const key of Object.keys(g.attributes)) if (!['position','normal','uv'].includes(key)) g.deleteAttribute(key);
    if (!g.attributes.uv) g.setAttribute('uv',new THREE.BufferAttribute(new Float32Array(g.attributes.position.count*2),2));
    if (!g.attributes.normal) g.computeVertexNormals();
    g.applyMatrix4(inverse.clone().multiply(obj.matrixWorld));
    if (!byMaterial.has(obj.material)) byMaterial.set(obj.material, []);
    byMaterial.get(obj.material).push(g);
  });
  const result = new THREE.Group();
  for (const [material, geos] of byMaterial) {
    const merged = mergeGeometries(geos, false);
    const mesh = new THREE.Mesh(merged, material);
    mesh.castShadow = shadow && !material.transparent; mesh.receiveShadow = receive; result.add(mesh);
    geos.forEach(g => g.dispose());
  }
  return result;
}
export function instanceTemplate(parent, template, matrices, options = {}) {
  const baked = bake(template, options); const meshes = [];
  for (const mesh of baked.children) {
    if (!matrices.length) { mesh.geometry.dispose(); continue; }
    const im = new THREE.InstancedMesh(mesh.geometry, mesh.material, matrices.length);
    matrices.forEach((m,i) => im.setMatrixAt(i,m));
    im.instanceMatrix.needsUpdate = true; im.computeBoundingSphere();
    im.castShadow = !!options.shadow && !mesh.material.transparent; im.receiveShadow = options.receive !== false;
    parent.add(im); meshes.push(im);
  }
  return meshes;
}
export function matrixAt(x,y,z, angle = 0, scale = 1) {
  return new THREE.Matrix4().compose(v3(x,y,z), new THREE.Quaternion().setFromAxisAngle(v3(0,1,0),angle), typeof scale === 'number' ? v3(scale,scale,scale) : v3(...scale));
}
// Match the exact rendered 1140m terrain triangulation instead of placing details on
// the unmeshed mathematical height field, which can leave distant paths floating.
export function createSurfaceSampler(perf) {
  const n = perf.isMobile ? perf.terrainSegments : Math.min(300,perf.terrainSegments+36);
  const step = 1140/n, cache = new Map();
  function at(ix,iz) {
    const key = iz*(n+1)+ix;
    if (!cache.has(key)) cache.set(key,getTerrainHeight(ix*step-570,iz*step-570));
    return cache.get(key);
  }
  return (x,z) => {
    const gx = THREE.MathUtils.clamp((x+570)/step,0,n-1e-6), gz = THREE.MathUtils.clamp((z+570)/step,0,n-1e-6);
    const ix = Math.floor(gx), iz = Math.floor(gz), u = gx-ix, v = gz-iz;
    if (u+v<=1) return at(ix,iz)*(1-u-v)+at(ix+1,iz)*u+at(ix,iz+1)*v;
    return at(ix+1,iz+1)*(u+v-1)+at(ix+1,iz)*(1-v)+at(ix,iz+1)*(1-u);
  };
}

// Preserve the seeded environment exactly outside the new, small scene footprints.
// Compact only intersecting instances, keeping paired crowns/trunks in the same order.
export function clearOccupiedDetails(group, areas, routes = []) {
  const nearbyRoutes = routes.map(({samples,r})=>({samples,r2:r*r,
    minX:Math.min(...samples.map(p=>p[0]))-r,maxX:Math.max(...samples.map(p=>p[0]))+r,
    minZ:Math.min(...samples.map(p=>p[1]))-r,maxZ:Math.max(...samples.map(p=>p[1]))+r}));
  const matrix = new THREE.Matrix4(), col = new THREE.Color();
  const occupied = (x,z) => areas.some(a=>(x-a.x)**2+(z-a.z)**2 < a.r*a.r) ||
    nearbyRoutes.some(a=>x>=a.minX&&x<=a.maxX&&z>=a.minZ&&z<=a.maxZ&&a.samples.some(p=>(x-p[0])**2+(z-p[1])**2<a.r2));
  for(const mesh of group.children) {
    if(!mesh.isInstancedMesh)continue;
    let kept=0;
    for(let i=0;i<mesh.count;i++){
      mesh.getMatrixAt(i,matrix);
      if(occupied(matrix.elements[12],matrix.elements[14]))continue;
      if(kept!==i){mesh.setMatrixAt(kept,matrix);if(mesh.instanceColor){mesh.getColorAt(i,col);mesh.setColorAt(kept,col);}}
      kept++;
    }
    if(kept!==mesh.count){mesh.count=kept;mesh.instanceMatrix.needsUpdate=true;if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;mesh.computeBoundingSphere();}
  }
}
