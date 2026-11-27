import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

// Preserve every triangle, attribute, material and shadow flag. This is static
// batching, not LOD. Animated roots and hit meshes are explicit exclusions.
export function indexedClone(geometry) {
  const g=geometry.clone();
  if(!g.index) {
    const count=g.attributes.position.count;
    const Index=count>65535?Uint32Array:Uint16Array;
    const indices=new Index(count);for(let i=0;i<count;i++)indices[i]=i;
    g.setIndex(new THREE.BufferAttribute(indices,1));
  }
  return g;
}

export function batchStaticMeshes(root, excluded=new Set()) {
  root.updateMatrixWorld(true);
  const inv=root.matrixWorld.clone().invert(), batches=new Map();
  function visit(node){
    if(excluded.has(node)||!node.visible)return;
    if(node.isMesh&&!node.isInstancedMesh&&!Array.isArray(node.material)&&
      node.material.visible!==false&&!node.material.transparent&&
      !node.customDepthMaterial&&!node.customDistanceMaterial){
      const signature=Object.keys(node.geometry.attributes).sort().join(',');
      const key=[node.material.id,node.castShadow,node.receiveShadow,node.renderOrder,node.layers.mask,signature].join('/');
      if(!batches.has(key))batches.set(key,[]);
      batches.get(key).push(node);
    }
    for(const child of node.children)visit(child);
  }
  visit(root);
  for(const list of batches.values()){
    if(list.length<2)continue;
    const pieces=list.map(m=>indexedClone(m.geometry).applyMatrix4(inv.clone().multiply(m.matrixWorld)));
    const merged=mergeGeometries(pieces,false);
    pieces.forEach(p=>p.dispose());
    if(!merged)continue;
    const first=list[0], mesh=new THREE.Mesh(merged,first.material);
    mesh.castShadow=first.castShadow;mesh.receiveShadow=first.receiveShadow;
    mesh.renderOrder=first.renderOrder;mesh.layers.mask=first.layers.mask;
    mesh.name='Baked static geometry';
    merged.computeBoundingBox();merged.computeBoundingSphere();
    for(const m of list)m.removeFromParent();
    root.add(mesh);
  }
}

// Static instance matrices retain their original world-local translation. Bins
// only introduce conservative bounding spheres for exact camera/light frusta.
export function partitionStaticInstances(group) {
  const matrix=new THREE.Matrix4(), color=new THREE.Color();
  for(const source of [...group.children]){
    if(!source.isInstancedMesh||source.count<120)continue;
    const bins=new Map(), size=source.count>1000?45:72;
    for(let i=0;i<source.count;i++){
      source.getMatrixAt(i,matrix);
      const x=matrix.elements[12],z=matrix.elements[14];
      const key=Math.floor(x/size)+':'+Math.floor(z/size);
      if(!bins.has(key))bins.set(key,[]);
      bins.get(key).push(i);
    }
    if(bins.size<2)continue;
    for(const slots of bins.values()){
      const im=new THREE.InstancedMesh(source.geometry,source.material,slots.length);
      im.position.copy(source.position);im.quaternion.copy(source.quaternion);im.scale.copy(source.scale);
      im.castShadow=source.castShadow;im.receiveShadow=source.receiveShadow;
      im.renderOrder=source.renderOrder;im.layers.mask=source.layers.mask;
      for(let j=0;j<slots.length;j++){
        const old=slots[j];source.getMatrixAt(old,matrix);im.setMatrixAt(j,matrix);
        if(source.instanceColor){source.getColorAt(old,color);im.setColorAt(j,color);}
      }
      im.instanceMatrix.needsUpdate=true;if(im.instanceColor)im.instanceColor.needsUpdate=true;
      im.computeBoundingSphere();
      // Include the complete existing GPU wind motion outside unbent bounds.
      im.boundingSphere.radius+=2.5;
      group.add(im);
    }
    group.remove(source);source.dispose();
  }
}

// Copy the actual already-computed global vertex normals (no tile seams) and
// identical triangle winding. This lets Three cull invisible terrain in both
// the camera pass and the directional-light shadow pass.
export function splitTerrainGeometry(geometry, segments, tileCells=26) {
  const tiles=[];
  for(let iz=0;iz<segments;iz+=tileCells)for(let ix=0;ix<segments;ix+=tileCells){
    const nx=Math.min(tileCells,segments-ix),nz=Math.min(tileCells,segments-iz);
    const g=new THREE.BufferGeometry();
    for(const [key,attr] of Object.entries(geometry.attributes)){
      const n=attr.itemSize, array=new attr.array.constructor((nx+1)*(nz+1)*n);
      for(let row=0;row<=nz;row++){
        const offset=((iz+row)*(segments+1)+ix)*n;
        array.set(attr.array.subarray(offset,offset+(nx+1)*n),row*(nx+1)*n);
      }
      g.setAttribute(key,new THREE.BufferAttribute(array,n,attr.normalized));
    }
    const index=new Uint16Array(nx*nz*6);let k=0;
    for(let z=0;z<nz;z++)for(let x=0;x<nx;x++){
      const a=z*(nx+1)+x,b=a+nx+1,c=b+1,d=a+1;
      index.set([a,b,d,b,c,d],k);k+=6;
    }
    g.setIndex(new THREE.BufferAttribute(index,1));g.computeBoundingSphere();tiles.push(g);
  }
  return tiles;
}
