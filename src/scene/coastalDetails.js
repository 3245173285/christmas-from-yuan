import * as THREE from 'three';
import { primitives as P, v3, standard, part, beam, extrude } from './detailGeometry.js';

export const LIGHTHOUSE = { x: 96, z: -108, scale: 1.74, lanternY: 6.85, speed: .22 };

export function buildDetailedLighthouse(landscape) {
  const {x,z,scale,lanternY}=LIGHTHOUSE, y=landscape.surface(x,z);
  const {group,static:staticGroup,clearAreas}=landscape;
  clearAreas.push({x,z,r:8.1},{x:x+5.8,z:z-3.6,r:4.4});
  const g = new THREE.Group();
  g.position.set(x,y,z);g.scale.setScalar(scale);staticGroup.add(g);
  const warmWhite=standard('#d9d8cc',{roughness:.78}), red=standard('#8f3e37',{roughness:.74});
  const baseRock=standard('#454b54'), seams=standard('#959c9b'), iron=standard('#263034',{roughness:.57,metalness:.42});
  const copper=standard('#3b685e',{roughness:.49,metalness:.55}), warmCopper=standard('#94704f',{roughness:.48,metalness:.59});
  const pane=standard('#233d49',{roughness:.24,metalness:.05});
  const lamp=standard('#e2b876',{roughness:.46,emissive:'#ffa34c',emissiveIntensity:.7});
  const circle=(a,b,h,n=32)=>new THREE.CylinderGeometry(a,b,h,n);
  const ring=(r,thickness)=>new THREE.TorusGeometry(r,thickness,6,32);

  part(g,P.rock,baseRock,[0,-.32,.16],[2.59,.95,2.39],[0,.33,0]);
  part(g,P.rock,baseRock,[-1.42,-.29,.78],[1.44,.66,1.58],[0,.8,0]);
  part(g,P.rock,landscape.snow,[1.64,-.08,.61],[.70,.18,.97],[0,.6,0]);
  part(g,circle(1.25,1.48,.46),baseRock,[0,.21,0]);
  const radius=h=>1.14-(h-.42)*.067;
  const bands=[[.42,1.86,warmWhite],[1.86,3.18,red],[3.18,4.40,warmWhite],[4.40,5.48,red],[5.48,6.26,warmWhite]];
  for(const [bot,top,mat] of bands){
    part(g,circle(radius(top),radius(bot),top-bot),mat,[0,(bot+top)*.5,0]);
    if (bot>.43) part(g,ring(radius(bot)+.009,.024),mat,[0,bot,0],[1,1,1],[-Math.PI/2,0,0]);
  }
  for(let i=0;i<12;i++){
    const a=i*Math.PI/6;
    part(g,P.box,seams,[Math.sin(a)*1.28,.28,Math.cos(a)*1.28],[.27,.105,.14],[0,a,0]);
  }
  const arch=(w,h)=>[[-w*.5,0],[-w*.5,h-w*.5],...Array.from({length:9},(_,i)=>{
    const a=Math.PI-i*Math.PI/8;return [Math.cos(a)*w*.5,h-w*.5+Math.sin(a)*w*.5];
  }),[w*.5,0]];
  const inset=(w,h,base,angle,mat,archTrim)=>{
    const r=radius(base)+.045, door=new THREE.Group();
    door.position.set(Math.sin(angle)*r,base,Math.cos(angle)*r);door.rotation.y=angle;g.add(door);
    part(door,extrude(arch(w+.105,h+.065),.095,.01),archTrim);
    part(door,extrude(arch(w,h),.035,.005),mat,[0,.015,.061]);
    return door;
  };
  const door=inset(.54,.96,.44,.18,iron,baseRock);
  part(door,P.sphere,warmCopper,[.17,.40,.104],[.037,.037,.026]);
  for(let i=0;i<4;i++)part(g,P.box,baseRock,[.17,.065+i*.09,1.91-i*.18],[.78,.14,.33],[0,.13,0]);
  for(const [h,a] of [[2.43,.7],[3.75,-.55],[4.84,1.30],[5.57,2.20]]){
    const w=inset(.27,.56,h,a,pane,baseRock);
    part(w,P.box,warmWhite,[0,.25,.091],[.021,.44,.021]);
    part(w,P.box,warmWhite,[0,.26,.091],[.25,.026,.021]);
    part(w,P.box,baseRock,[0,.018,.10],[.38,.068,.20]);
  }

  part(g,circle(1.07,.87,.32),baseRock,[0,6.22,0]);
  part(g,circle(1.27,1.10,.18),iron,[0,6.43,0]);
  part(g,circle(.70,.72,.19),warmCopper,[0,6.56,0]);
  for(let i=0;i<16;i++){
    const a=i*Math.PI/8;
    part(g,P.cylinder,iron,[Math.sin(a)*1.19,6.72,Math.cos(a)*1.19],[.032,.60,.032]);
    if(i%2===0)part(g,P.cylinder,iron,[Math.sin(a)*.66,6.86,Math.cos(a)*.66],[.039,.70,.039]);
  }
  for(const h of [6.67,7.02])part(g,ring(1.19,.026),iron,[0,h,0],[1,1,1],[-Math.PI/2,0,0]);
  for(const h of [6.52,7.20])part(g,ring(.66,.049),warmCopper,[0,h,0],[1,1,1],[-Math.PI/2,0,0]);
  part(g,P.sphere,lamp,[0,lanternY,0],[.29,.23,.29]);
  for (let i=0;i<4;i++) part(g,ring(.36+i*.013,.025),warmCopper,[0,6.70+i*.092,0],[1,1,1],[-Math.PI/2,0,0]);

  const profile=[[0,7.92],[.13,7.86],[.28,7.77],[.47,7.62],[.61,7.45],[.74,7.29],[.92,7.23],[.94,7.18],[0,7.18]].map(p=>new THREE.Vector2(...p));
  part(g,new THREE.LatheGeometry(profile.slice().reverse(),40),copper);
  for(let i=0;i<8;i++){
    const a=i*Math.PI/4;
    const pts=profile.slice(1,7).map(p=>v3(Math.sin(a)*(p.x+.010),p.y+.015,Math.cos(a)*(p.x+.010)));
    for(let j=1;j<pts.length;j++)beam(g,pts[j-1],pts[j],.013,warmCopper);
  }
  part(g,P.cylinder,warmCopper,[0,8.03,0],[.037,.37,.037]);
  part(g,P.sphere,warmCopper,[0,8.16,0],[.078,.081,.078]);

  const glazing=new THREE.MeshPhysicalMaterial({color:'#86b3c9',emissive:'#f0b968',emissiveIntensity:0,transparent:true,opacity:.22,depthWrite:false,roughness:.18,metalness:.08,side:THREE.DoubleSide});
  const glass=part(group,new THREE.CylinderGeometry(.646*scale,.646*scale,.67*scale,16,1,true),glazing,[x,y+lanternY*scale,z]);glass.renderOrder=2;

  const cottageX=x+5.8,cottageZ=z-3.6;
  landscape.cottage(cottageX,landscape.surface(cottageX,cottageZ),cottageZ,-.28,.79,landscape.red);
  const lens=new THREE.Group();lens.position.set(x,y+lanternY*scale,z);group.add(lens);
  const beamGeo=new THREE.ConeGeometry(4.0,56,24,1,true);
  beamGeo.rotateZ(Math.PI/2);beamGeo.translate(28.55,0,0);
  const beaconMat=new THREE.ShaderMaterial({
    transparent:true,depthWrite:false,side:THREE.FrontSide,blending:THREE.AdditiveBlending,
    uniforms:{uPower:{value:0}},
    vertexShader:`
      varying float vDist;varying vec3 vNormal;varying vec3 vToCamera;
      void main(){vec4 mv=modelViewMatrix*vec4(position,1.0);vDist=position.x;vNormal=normalize(normalMatrix*normal);vToCamera=-mv.xyz;gl_Position=projectionMatrix*mv;}
    `,
    fragmentShader:`
      uniform float uPower;varying float vDist;varying vec3 vNormal;varying vec3 vToCamera;
      void main(){
        float density=smoothstep(.25,2.8,vDist)*(1.0-smoothstep(7.0,56.0,vDist));
        float rim=pow(abs(dot(normalize(vNormal),normalize(vToCamera))),.72);
        gl_FragColor=vec4(.90,.74,.51,density*rim*uPower*.135);
      }`
  });
  const trace=part(lens,beamGeo,beaconMat);trace.renderOrder=3;
  return {lens,beaconMat,lamp,glazing};
}
