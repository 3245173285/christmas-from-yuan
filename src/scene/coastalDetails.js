import * as THREE from 'three';
import { WATER_LEVEL, mulberry32 } from '../utils/noise.js';
import { getSharedNoiseLUTTexture } from '../utils/textures.js';
import { primitives as P, v3, standard, part, beam, extrude } from './detailGeometry.js';

export const LIGHTHOUSE = { x: 96, z: -108, scale: 1.74, lanternY: 6.85, speed: .22 };

const fogVertex = `
  #include <fog_pars_vertex>
  varying vec2 vUv;
  void main() {
    vUv = uv;
    vec4 mvPosition = modelViewMatrix * vec4(position,1.0);
    gl_Position = projectionMatrix * mvPosition;
    #include <fog_vertex>
  }`;

export function buildRockCascade(sceneGroup, staticGroup, clearAreas, surface) {
  const rng = mulberry32(81126);
  const waterline = WATER_LEVEL + .18;
  const g = new THREE.Group();
  g.position.set(2, 0, -182.5);
  g.rotation.y = -.39;
  staticGroup.add(g);
  const waterGroup = new THREE.Group();
  waterGroup.position.copy(g.position); waterGroup.rotation.copy(g.rotation);
  sceneGroup.add(waterGroup);
  clearAreas.push({x:2,z:-182.5,r:6.1},{x:.4,z:-177.2,r:3.8});

  const granite = ['#363d49','#454b55','#505761','#393f4a'].map(color => standard(color,{roughness:.91}));
  const wet = standard('#293740',{roughness:.53,metalness:.06});
  const snow = standard('#a9bacb',{roughness:.92});
  const slab = new THREE.IcosahedronGeometry(1,1);
  const pos = slab.attributes.position;
  for (let i=0;i<pos.count;i++) {
    const x=pos.getX(i),y=pos.getY(i),z=pos.getZ(i);
    const warp=1+.12*Math.sin(x*8+z*4)*Math.cos(y*6-z*9);
    pos.setXYZ(i,x*warp+.11*y,Math.round(y*7)*warp/7,z*warp);
  }
  slab.computeVertexNormals();
  // Broad strata extend into the existing hillside. The wet groove is inset
  // between overlapping angular ledges, not drawn onto the terrain surface.
  const ledges = [
    [.22,4.02,-4.35,3.32,2.91,3.10],
    [-.25,5.75,-1.78,3.3,2.52,2.05],
    [-2.45,5.85,-1.04,1.5,2.85,1.9],
    [ 2.35,5.12,-1.21,1.7,2.68,1.8],
    [-.35,1.26,1.03,2.75,2.82,2.2],
    [-1.96,2.02,1.45,1.9,2.3,1.85],
    [ 1.93,1.22,2.28,1.35,2.26,1.55],
    [-1.45,-.88,5.07,1.55,.65,1.01],
    [ 1.72,-.99,5.57,1.32,.72,1.52],
  ];
  ledges.forEach(([x,y,z,sx,sy,sz],i)=>{
    part(g,slab,granite[i%4],[x,y,z],[sx,sy,sz],[.12*(i%3),i*.31,-.16+i*.05]);
    if (i===2||i===3||i===5) {
      part(g,slab,snow,[x+.12,y+sy*.70,z-.12],[sx*.72,.23,sz*.71],[.05,i*.31,-.12]);
    }
  });
  for(const [x,z,sx,sy,sz] of [[-3.9,-.7,1.9,.82,2.0],[3.95,-1.68,2.05,1.01,1.8],[-3.12,1.4,1.34,.63,1.76],[2.72,2.95,1.55,.81,1.7],[-4.25,-2.94,1.68,.65,1.42]]){
    const p=v3(x,0,z).applyAxisAngle(v3(0,1,0),g.rotation.y).add(g.position);
    const y=surface(p.x,p.z)-.17;
    part(g,slab,granite[2],[x,y,z],[sx,sy,sz],[.14,z*.32,-.14]);
    part(g,slab,snow,[x-.08,y+sy*.58,z-.13],[sx*.62,.17,sz*.60],[.05,z*.32,-.10]);
  }
  part(g,slab,wet,[.02,3.28,1.33],[1.36,.32,1.63]);
  for (let i=0;i<17;i++) {
    const side=i%2?1:-1, u=rng(), z=u*9-1.9, x=side*(1.65+rng()*2.4);
    const world=v3(x,0,z).applyAxisAngle(v3(0,1,0),g.rotation.y).add(g.position);
    const ground=surface(world.x,world.z);
    if (ground<WATER_LEVEL-.6) continue;
    part(g,slab,granite[i%4],[x,ground-.08,z],[.51+rng()*.69,.35+rng()*.65,.65+rng()*.75],[rng()*.3,rng()*6.28,rng()*.3]);
  }

  const shared = {time:{value:0}, daylight:{value:.36}};
  const water = new THREE.ShaderMaterial({
    fog:true,transparent:true,depthWrite:false,side:THREE.DoubleSide,
    uniforms:{...THREE.UniformsUtils.clone(THREE.UniformsLib.fog),uTime:shared.time,uDay:shared.daylight,uNoise:{value:getSharedNoiseLUTTexture(256)}},
    vertexShader:fogVertex,
    fragmentShader:`
      #include <fog_pars_fragment>
      uniform float uTime;
      uniform float uDay;
      uniform sampler2D uNoise;
      varying vec2 vUv;
      void main() {
        float u=vUv.x, s=vUv.y;
        vec2 nUv=vec2(u*.34, s*.24-uTime*.17);
        vec4 n=texture2D(uNoise,nUv);
        float strands=texture2D(uNoise,vec2(u*1.35+(n.g-.5)*.08,s*.12-uTime*.19)).r;
        float edge=min(u,1.0-u);
        float waterMask=smoothstep(.005,.19,edge+(n.r-.5)*.095);
        float froth=smoothstep(.41,.77,strands*.66+n.b*.34);
        float impact=smoothstep(.70,1.0,fract(s*.46+.11));
        vec3 deep=mix(vec3(.12,.22,.30),vec3(.19,.36,.42),uDay);
        vec3 white=mix(vec3(.44,.55,.66),vec3(.68,.82,.87),uDay);
        vec3 col=mix(deep,white,froth*(.57+impact*.23));
        gl_FragColor=vec4(col,waterMask*(.48+froth*.38));
        #include <fog_fragment>
      }`
  });
  function stream(points, widths, uvLength) {
    const curve=new THREE.CatmullRomCurve3(points.map(p=>v3(...p)));
    const nx=10, ny=40, positions=[],uv=[],index=[];
    for (let row=0;row<=ny;row++) {
      const t=row/ny, p=curve.getPoint(t), q=t*(widths.length-1), k=Math.min(Math.floor(q),widths.length-2);
      const w=THREE.MathUtils.lerp(widths[k],widths[k+1],q-k)*(.93+.11*Math.sin(t*20)+.06*Math.cos(t*43));
      for(let j=0;j<=nx;j++){
        const u=j/nx,s=(u-.5)*2;
        positions.push(p.x+s*w*.50,p.y+.07*Math.sin(s*2.4+t*9),p.z+.15*(1-s*s)+.06*Math.sin(s*6+t*10));
        uv.push(u,t*uvLength);
        if (row<ny&&j<nx) {const i=row*(nx+1)+j;index.push(i,i+1,i+nx+1,i+1,i+nx+2,i+nx+1);}
      }
    }
    const geo=new THREE.BufferGeometry();
    geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
    geo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geo.setIndex(index);
    const mesh=part(waterGroup,geo,water);mesh.renderOrder=2;
  }
  stream([[-.34,8.00,-1.89],[-.30,7.86,-.45],[-.26,7.19,.22],[-.23,5.62,.67],[-.11,3.55,1.13],[-.04,3.53,1.88]], [1.15,1.43,.9,1.65],3.9);
  stream([[.10,3.54,1.34],[.31,3.31,2.64],[.38,2.70,3.25],[.55,1.15,4.17],[.71,-.64,4.95],[.82,waterline,5.73]], [1.46,1.86,1.18,1.92],3.2);
  stream([[1.27,3.28,2.00],[1.40,2.84,2.81],[1.46,1.30,3.73],[1.29,-.52,4.8],[1.13,waterline,5.66]], [.37,.49,.33,.58],2.9);

  const ripple = new THREE.ShaderMaterial({
    fog:true,transparent:true,depthWrite:false,
    uniforms:{...THREE.UniformsUtils.clone(THREE.UniformsLib.fog),uTime:shared.time,uDay:shared.daylight},
    vertexShader:fogVertex,
    fragmentShader:`
      #include <fog_pars_fragment>
      uniform float uTime;
      uniform float uDay;
      varying vec2 vUv;
      void main() {
        vec2 p=(vUv-.5)*2.0;
        float r=length(p);
        float wave=.5+.5*sin(r*25.0-uTime*3.1+sin(p.y*15.0)*.31);
        float crest=pow(wave,7.0)*(1.0-smoothstep(.13,.94,r));
        float foam=exp(-9.0*r*r)*(.5+.5*sin(p.x*24.0+uTime*1.8)*cos(p.y*28.0-uTime));
        gl_FragColor=vec4(.58,.69,.76,(crest*.23+foam*.15)*(.63+uDay*.37));
        #include <fog_fragment>
      }`
  });
  const circles=part(waterGroup,new THREE.PlaneGeometry(9.7,8.2),ripple,[.8,waterline,6.77],[1,1,1],[-Math.PI/2,0,0]);circles.renderOrder=2;

  const sprayPos=[], spraySeed=[];
  for(let i=0;i<40;i++){
    const upper=i<11;
    sprayPos.push((upper?-.09:.84)+(rng()-.5)*1.45, upper?3.54:waterline, upper?1.55:5.82);
    spraySeed.push(rng(),rng(),rng());
  }
  const sprayGeo=new THREE.BufferGeometry();
  sprayGeo.setAttribute('position',new THREE.Float32BufferAttribute(sprayPos,3));
  sprayGeo.setAttribute('aSeed',new THREE.Float32BufferAttribute(spraySeed,3));
  const sprayMat=new THREE.ShaderMaterial({
    fog:true,transparent:true,depthWrite:false,
    uniforms:{...THREE.UniformsUtils.clone(THREE.UniformsLib.fog),uTime:shared.time,uDay:shared.daylight},
    vertexShader:`
      #include <fog_pars_vertex>
      attribute vec3 aSeed;
      uniform float uTime;
      varying float vFade;
      void main(){
        float f=fract(uTime*(.22+aSeed.x*.16)+aSeed.y);
        vec3 p=position+vec3((aSeed.x-.5)*3.8*f, .1+f*(.35+aSeed.z*1.09), f*(.8+aSeed.y*1.8));
        vec4 mvPosition=modelViewMatrix*vec4(p,1.0);
        gl_Position=projectionMatrix*mvPosition;
        gl_PointSize=clamp((900.0+1440.0*f)*(.6+aSeed.z*.5)/max(1.0,-mvPosition.z),2.0,27.0);
        vFade=smoothstep(0.,.12,f)*(1.-smoothstep(.20,1.,f));
        #include <fog_vertex>
      }`,
    fragmentShader:`
      #include <fog_pars_fragment>
      uniform float uDay;
      varying float vFade;
      void main(){
        float r=length(gl_PointCoord-.5)*2.0;
        float a=exp(-r*r*4.5)*(1.0-smoothstep(.7,1.0,r))*vFade;
        gl_FragColor=vec4(mix(vec3(.40,.50,.61),vec3(.66,.76,.79),uDay),a*.18);
        #include <fog_fragment>
      }`
  });
  const spray=new THREE.Points(sprayGeo,sprayMat);spray.renderOrder=3;spray.frustumCulled=false;waterGroup.add(spray);
  return shared;
}

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
