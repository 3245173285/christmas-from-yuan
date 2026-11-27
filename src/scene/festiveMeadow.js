import * as THREE from 'three';
import { getPathCenterX, mulberry32, WATER_LEVEL } from '../utils/noise.js';
import { primitives as P, v3, standard, part, beam, tube, extrude, bake, instanceTemplate, matrixAt } from './detailGeometry.js';
import { createSoftGlowTexture } from '../utils/textures.js';

export const SLEIGH_SITE = { x:15.4, z:-11.8, yaw:.48 };
export const FIRE_SITE = { x:-14.2, z:-5.6 };

export class FestiveMeadow {
  constructor(scene, surface) {
    this.scene=scene;this.surface=surface;this.rand=mulberry32(28122026);
    this.group=new THREE.Group();this.group.name='Christmas meadow vignettes';scene.add(this.group);
    this.wood=standard('#59402e',{roughness:.89});this.woodLight=standard('#a17b50',{roughness:.8});
    this.iron=standard('#26343d',{metalness:.68,roughness:.48});this.gold=standard('#d7a95a',{metalness:.86,roughness:.26,emissive:'#483015',emissiveIntensity:.12});
    this.red=new THREE.MeshPhysicalMaterial({color:'#89172b',roughness:.3,clearcoat:.85,clearcoatRoughness:.22,metalness:.18});
    this.velvet=new THREE.MeshPhysicalMaterial({color:'#6c1525',roughness:.88,sheen:1,sheenColor:new THREE.Color('#bb5361')});
    this.snow=standard('#e2edf4',{roughness:.95});this.cream=standard('#f1ddba');this.pine=standard('#284b31');this.berry=standard('#b92c3b',{roughness:.38});
    this.glass=standard('#ffcb7d',{roughness:.24,emissive:'#ffb550',emissiveIntensity:1.2});
    this.logWarm=standard('#674026',{emissive:'#7f2306',emissiveIntensity:.11});
    this.stoneWarm=standard('#5c5c5d',{emissive:'#602d12',emissiveIntensity:.07});
    this.deerMats={fur:standard('#947451',{roughness:.96}),back:standard('#6a513b',{roughness:.96}),cream:standard('#d0bfa0',{roughness:.96}),hoof:standard('#302d2b'),eye:standard('#14191b',{roughness:.18}),horn:standard('#c7b38b',{roughness:.82})};
    this.static=new THREE.Group();this.deer=[];this.plumeSprites=[];
    this.clearAreas=[{x:SLEIGH_SITE.x,z:SLEIGH_SITE.z,r:2.65},{x:FIRE_SITE.x,z:FIRE_SITE.z,r:1.65}];
    this.buildSleighAndDeer();this.buildCampfire();this.buildPath();this.buildWinterPlants();
    this.group.add(bake(this.static,{shadow:true}));
    this.static.clear();
  }
  groundGroup(parent,x,z,yaw=0,lift=0){const g=new THREE.Group();g.position.set(x,this.surface(x,z)+lift,z);g.rotation.y=yaw;parent.add(g);return g;}
  buildSleighAndDeer(){
    const {x,z,yaw}=SLEIGH_SITE,g=this.groundGroup(this.static,x,z,yaw),b=(p,s,m=this.wood,r)=>part(g,P.box,m,p,s,r);
    // Wide hand-carved sled runners with curling front tips and gold shoe strips.
    for(const side of [-1,1]){
      const sx=side*.73;
      const runner=[v3(sx,.15,-1.96),v3(sx,.12,-1.15),v3(sx,.12,.7),v3(sx,.22,1.74),v3(sx,.69,2.02),v3(sx,.90,1.79),v3(sx,.75,1.62)];
      tube(g,runner,.09,this.woodLight,42,9);tube(g,runner.map(p=>p.clone().add(v3(0,-.065,0))),.038,this.gold,42,7);
      for(let t=0;t<3;t++)beam(g,v3(sx,.20,-1.4+t*1.18),v3(side*.8,.49,-1.28+t*1.13),.075,this.iron);
      // Shape in local Y/Z: voluminous sleigh sidewall with an elegant raised back and sweeping prow.
      const profile=[[-1.73,.54],[-1.83,1.44],[-1.54,1.68],[-1.28,1.36],[-.72,1.12],[.25,.94],[.82,1.04],[1.24,1.35],[1.52,1.18],[1.58,.67],[1.35,.51]];
      const panel=extrude(profile,.10,.055);panel.rotateY(-Math.PI/2); // shape x becomes +z
      part(g,panel,this.red,[side*.83,0,0]);
      tube(g,profile.slice(1,10).map(([zz,y])=>v3(side*.90,y,zz)),.036,this.gold,38,7);
      tube(g,[v3(side*.91,.70,-1.38),v3(side*.91,.80,-.80),v3(side*.91,.75,-.27),v3(side*.91,.72,.26),v3(side*.91,.87,.92)],.021,this.gold,28,6);
      for(let k=0;k<3;k++)part(g,P.ring,this.gold,[side*.901,.83,-.78+k*.42],[.095,.095,.65],[0,Math.PI/2,0]);
    }
    b([0,.55,-.13],[1.65,.15,3.03],this.woodLight);b([0,1.20,-1.48],[1.62,.75,.12],this.red,[.20,0,0]);b([0,.86,.70],[1.48,.14,.55],this.velvet);b([0,.99,.94],[1.49,.37,.11],this.velvet);b([0,.75,-1.12],[1.43,.12,.70],this.woodLight);
    for(let k=0;k<6;k++)b([0,.64,-1.36+k*.48],[1.55,.038,.027],this.gold);
    // A tied canvas sack and jewel-toned gift parcels in the sleigh bed.
    const sack=standard('#ba9a67',{roughness:.95});part(g,P.sphere,sack,[-.27,1.18,-.84],[.47,.63,.41],[0,0,-.17]);part(g,P.sphere,sack,[-.33,1.72,-.85],[.16,.14,.16]);part(g,P.ring,this.red,[-.33,1.62,-.85],[.13,.13,.8],[Math.PI/2,0,0]);
    const giftMats=[this.red,this.pine,this.cream,this.velvet];
    for(let i=0;i<6;i++){
      const px=(i%2?1:-1)*(.22+this.rand()*.22),pz=-.49+Math.floor(i/2)*.30,sy=.30+this.rand()*.23,sx=.33+this.rand()*.17,sz=.30+this.rand()*.14;
      const pack=new THREE.Group();pack.position.set(px,.65+sy*.5+(i===5?.22:0),pz);pack.rotation.y=(this.rand()-.5)*.48;g.add(pack);
      part(pack,P.box,giftMats[i%4],[0,0,0],[sx,sy,sz]);part(pack,P.box,this.gold,[0,0,0],[.063,sy+.012,sz+.008]);part(pack,P.box,this.gold,[0,0,0],[sx+.01,sy+.012,.057]);
      for(const side of [-1,1])part(pack,P.ring,this.gold,[side*.078,sy*.5+.047,0],[.095,.055,.6],[0,0,side*.28]);
    }
    // Two harnessed reindeer in front with a younger companion just off the trail.
    const rel=(dx,dz)=>({x:x+Math.cos(yaw)*dx+Math.sin(yaw)*dz,z:z-Math.sin(yaw)*dx+Math.cos(yaw)*dz});
    for(const [dx,dz,sc,rot,antler] of [[-.93,3.4,1.08,-.10,true],[.96,3.65,1.14,.09,true],[2.9,1.8,.78,.65,false]]){
      const p=rel(dx,dz);this.createDeer(p.x,p.z,yaw+rot,sc,antler);
    }
  }
  createDeer(x,z,yaw,sc,antlers){
    this.clearAreas.push({x,z,r:.95});
    const root=this.groundGroup(this.group,x,z,yaw,.025);root.scale.setScalar(sc);
    const body=new THREE.Group(),head=new THREE.Group();
    const {fur,back,cream,hoof,eye,horn}=this.deerMats;
    const sph=(g,m,p,s,r)=>part(g,P.sphere,m,p,s,r);
    sph(body,fur,[0,1.02,-.10],[.38,.39,.78]);sph(body,back,[0,1.21,-.13],[.32,.21,.72]);sph(body,cream,[0,.86,.37],[.25,.28,.35]);sph(body,fur,[0,1.01,-.62],[.33,.34,.31]);sph(body,cream,[0,1.07,-.80],[.16,.15,.15]);
    // Shoulder, tapering neck and angled hocks, with cloven hooves grounded individually.
    const neck=beam(body,v3(0,1.11,.42),v3(0,1.68,.85),.24,fur,.15);neck.scale.z*=.88;
    sph(body,cream,[0,1.29,.66],[.18,.32,.21],[-.52,0,0]);
    for(const side of [-1,1])for(const front of [true,false]){
      const sx=side*.22,zz=front?.42:-.61;
      const knee=v3(sx,front?.53:.57,zz+(front?.04:-.16)),ankle=v3(sx, .13,zz+(front?.11:.11));
      const top=v3(sx,.98,zz);beam(body,top,knee,front?.105:.13,fur,.057);sph(body,back,knee.toArray(),[.064,.075,.064]);beam(body,knee,ankle,.055,back,.037);sph(body,hoof,[sx,.085,ankle.z+.028],[.075,.085,.10]);
      part(body,P.box,cream,[sx,.16,ankle.z+.065],[.014,.018,.055]);
    }
    tube(body,[v3(0,1.05,-.80),v3(0,.96,-.98),v3(0,.84,-.94)],.077,back,10,8);
    if(antlers){
      // Decorative leather harness, collar bells and fine gold studs.
      tube(body,Array.from({length:25},(_,i)=>{const a=i/24*Math.PI*2;return v3(Math.sin(a)*.32,1.03+Math.cos(a)*.39,.42+Math.cos(a)*.05);}),.032,this.velvet,24,7);
      for(const side of [-1,1])for(let j=0;j<4;j++)sph(body,this.gold,[side*(.30+.015*j),1.18-j*.10,.43],[.036,.038,.034]);
    }
    // Head is separated at the neck joint so the animal can look around without moving its hooves.
    head.position.set(0,1.67,.85);
    sph(head,fur,[0,.02,.12],[.19,.24,.31],[-.32,0,0]);sph(head,cream,[0,-.075,.31],[.144,.14,.22]);sph(head,back,[0,-.017,.41],[.125,.095,.12]);sph(head,eye,[0,.005,.492],[.10,.062,.048]);
    for(const side of [-1,1]){
      sph(head,eye,[side*.159,.065,.175],[.026,.035,.024]);sph(head,this.cream,[side*.170,.077,.18],[.009,.01,.009]);
      const ear=sph(head,fur,[side*.20,.18,.005],[.07,.17,.065],[.25,0,-side*.85]);sph(head,cream,[side*.225,.19,.047],[.035,.11,.026],[.25,0,-side*.85]);
      if(!antlers)continue;
      const pts=[v3(side*.10,.19,.06),v3(side*.19,.37,-.015),v3(side*.27,.49,-.12),v3(side*.31,.67,-.13),v3(side*.29,.80,-.04)];
      for(let j=0;j<pts.length-1;j++)beam(head,pts[j],pts[j+1],.035-j*.005,horn,.031-j*.005);
      const branches=[[pts[1],v3(side*.27,.43,.15),v3(side*.29,.56,.23)],[pts[2],v3(side*.40,.58,-.16),v3(side*.46,.69,-.10)],[pts[3],v3(side*.34,.72,-.29),v3(side*.36,.81,-.31)]];
      for(const route of branches){beam(head,route[0],route[1],.023,horn,.016);beam(head,route[1],route[2],.016,horn,.004);}
    }
    body.position.copy(root.position);body.rotation.copy(root.rotation);body.scale.copy(root.scale);this.static.add(body);
    const headB=bake(head,{shadow:true});headB.position.copy(head.position);root.add(headB);
    const breath=[];
    const tex=this.breathTex ||= createSoftGlowTexture(64,'rgba(225,240,250,0.5)','rgba(190,217,234,0.15)');
    for(let i=0;i<3;i++){const m=new THREE.SpriteMaterial({map:tex,color:'#d7edf8',transparent:true,opacity:0,depthWrite:false});const sprite=new THREE.Sprite(m);sprite.position.set(0,0,.55);headB.add(sprite);breath.push(sprite);}
    this.deer.push({head:headB,phase:this.rand()*6.28,breath});
  }
  buildCampfire(){
    const {x,z}=FIRE_SITE,g=this.groundGroup(this.static,x,z,0);
    const rockMats=[this.stoneWarm,standard('#51585d'),standard('#777878')];
    for(let i=0;i<15;i++){
      let a=i*Math.PI*2/15,r=1.0+this.rand()*.10;
      part(g,P.rock,rockMats[i%3],[Math.sin(a)*r,.18,Math.cos(a)*r],[.26+this.rand()*.11,.25,.26],[this.rand()*.6,a,this.rand()*.4]);
    }
    part(g,P.cylinder,standard('#2a2424'),[0,.025,0],[.86,.075,.86]);
    for(let j=0;j<6;j++){
      const a=j*Math.PI/3+.2,px=Math.sin(a)*.52,pz=Math.cos(a)*.52;
      beam(g,v3(px,.17,pz),v3(-px*.52,.48+this.rand()*.11,-pz*.52),.105,this.logWarm,.075);
      part(g,P.sphere,this.woodLight,[px,.17,pz],[.084,.081,.084]);
    }
    // Two chunky benches, facing the stone ring without blocking the view to the lake.
    for(const a of [-1.0,1.18]){
      const bench=new THREE.Group();bench.position.set(Math.sin(a)*2.65,0,Math.cos(a)*2.65);bench.position.y=this.surface(x+bench.position.x,z+bench.position.z)-this.surface(x,z);bench.rotation.y=a+Math.PI;g.add(bench);
      for (const side of [-1,1]) {part(bench,P.box,this.wood,[side*.86,.26,0],[.23,.51,.50]);part(bench,P.box,this.wood,[side*.92,.79,-.23],[.15,.66,.14]);}
      for(let k=0;k<3;k++)part(bench,P.box,this.woodLight,[0,.53,-.21+k*.20],[2.20,.12,.19]);
      part(bench,P.box,this.woodLight,[0,.91,-.30],[2.13,.16,.12]);
      part(bench,P.sphere,this.snow,[.55,.612,.02],[.58,.025,.25]);part(bench,P.sphere,this.snow,[-.8,.61,-.04],[.20,.025,.20]);
      const blanket=new THREE.Group();blanket.position.set(-.36,.61,.12);bench.add(blanket);part(blanket,P.box,this.velvet,[0,0,0],[.66,.035,.59]);part(blanket,P.box,this.velvet,[0,-.15,.29],[.66,.32,.029]);for(let k=0;k<5;k++)part(blanket,P.box,this.cream,[-.25+k*.12,-.148,.308],[.022,.32,.009]);
    }
    const table=new THREE.Group();table.position.set(-1.75,this.surface(x-1.75,z-2.2)-this.surface(x,z),-2.2);g.add(table);
    part(table,P.cylinder,this.wood,[0,.35,0],[.38,.70,.38]);part(table,P.cylinder,this.woodLight,[0,.73,0],[.72,.13,.72]);
    const cocoa=standard('#553222',{roughness:.36});
    for(let i=0;i<2;i++){
      const px=-.25+i*.49,pz=.12-(i*.27),cup=i?this.cream:this.red;part(table,P.cylinder,cup,[px,.91,pz],[.16,.24,.16]);part(table,P.cylinder,cocoa,[px,1.035,pz],[.14,.015,.14]);part(table,P.ring,cup,[px+.18,.93,pz],[.09,.09,1.8]);
      for(let k=0;k<4;k++)part(table,P.box,this.cream,[px+(this.rand()-.5)*.17,1.055,pz+(this.rand()-.5)*.17],[.06,.045,.06],[0,this.rand(),0]);
      this.addSteam(x+table.position.x+px,this.surface(x,z)+table.position.y+1.10,z+table.position.z+pz,3,.28);
    }
    this.buildFlame(x,this.surface(x,z)+.27,z);
    this.addSteam(x,this.surface(x,z)+1.35,z,6,.8);
    this.fireGlow=this.groundGlow(x,z,2.85,'#f69d42',.28);
  }
  buildFlame(x,y,z){
    const uniforms={uTime:{value:0},uNight:{value:1}};this.flameUniforms=uniforms;
    const mat=new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending,uniforms,
      vertexShader:`varying vec2 vUv;uniform float uTime;void main(){vUv=uv;vec3 p=position; p.x+=sin(uTime*4.4+uv.y*7.0)*.12*uv.y*uv.y; gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.0);}`,
      fragmentShader:`varying vec2 vUv;uniform float uTime;uniform float uNight;void main(){float h=vUv.y;float x=vUv.x*2.0-1.0;float wobble=sin(h*9.0-uTime*4.7)*.14+sin(h*17.0-uTime*6.2)*.06;float width=(1.0-h)*(.72+.19*sin(h*11.0-uTime*5.0));float shape=1.0-smoothstep(width*.22,width+.02,abs(x+wobble));float flicker=.73+.27*sin(uTime*8.0+x*4.0+h*13.0);float alpha=shape*smoothstep(0.0,.065,h)*(1.0-smoothstep(.66,1.0,h))*flicker;vec3 col=mix(vec3(1.9,1.1,.16),vec3(1.1,.11,.012),smoothstep(.16,.86,h)); gl_FragColor=vec4(col,alpha*(.58+.30*uNight));\n#include <tonemapping_fragment>\n#include <colorspace_fragment>}`});
    const g=new THREE.Group();g.position.set(x,y,z);this.group.add(g);
    for(let i=0;i<4;i++){const geo=new THREE.PlaneGeometry(1.26,1.52,1,12);geo.translate(0,.76,0);part(g,geo,mat,[0,0,0],[.83+i*.065,.75+i*.095,1],[0,i*Math.PI/4,0]);}
  }
  addSteam(x,y,z,count,size){
    const tex=this.breathTex ||= createSoftGlowTexture(64,'rgba(225,240,250,0.5)','rgba(190,217,234,0.15)');
    for(let i=0;i<count;i++){
      const mat=new THREE.SpriteMaterial({map:tex,color:'#e1e8ec',transparent:true,opacity:.08,depthWrite:false});const sp=new THREE.Sprite(mat);sp.position.set(x,y,z);this.group.add(sp);this.plumeSprites.push({sp,x,y,z,phase:i/count,size});
    }
  }
  groundGlow(x,z,r,col,opacity,shared=null,parent=this.group){
    const geo=new THREE.PlaneGeometry(r*2,r*2,8,8);geo.rotateX(-Math.PI/2);
    const p=geo.attributes.position;for(let i=0;i<p.count;i++)p.setY(i,this.surface(x+p.getX(i),z+p.getZ(i))+.06);
    const tex=this.glowTex ||= createSoftGlowTexture(128,'rgba(255,255,255,0.85)','rgba(255,255,255,0.15)');
    const m=shared||new THREE.MeshBasicMaterial({map:tex,color:col,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,opacity});
    part(parent,geo,m,[x,0,z]);return m;
  }
  lantern(){
    const g=new THREE.Group();part(g,P.cylinder,this.iron,[0,.09,0],[.24,.18,.24]);part(g,P.cylinder,this.iron,[0,.38,0],[.09,.61,.09]);part(g,P.cylinder,this.iron,[0,1.05,0],[.055,1.07,.055]);part(g,P.cylinder,this.gold,[0,1.52,0],[.12,.12,.12]);
    part(g,P.box,this.iron,[0,1.60,0],[.34,.07,.34]);part(g,P.box,this.glass,[0,1.80,0],[.25,.36,.25]);
    for(const x of [-.14,.14])for(const z of [-.14,.14])part(g,P.box,this.iron,[x,1.80,z],[.028,.40,.028]);
    const roof=new THREE.ConeGeometry(.275,.23,4);part(g,roof,this.iron,[0,2.10,0],[1,1,1],[0,Math.PI/4,0]);part(g,P.sphere,this.gold,[0,2.25,0],[.045,.055,.045]);
    part(g,P.sphere,this.snow,[0,2.14,0],[.13,.025,.13]);
    for(let i=0;i<4;i++)part(g,P.box,this.iron,[Math.sin(i*Math.PI/2)*.141,1.81,Math.cos(i*Math.PI/2)*.141],[.26,.024,.025],[0,i*Math.PI/2,0]);
    return g;
  }
  buildPath(){
    const matrices=[],glows=new THREE.Group();this.lanternGlowMat=null;
    for(let i=0;i<10;i++){
      const z=-43+i*6.7,x=getPathCenterX(z)+(i%2===0?-3.05:3.05),y=this.surface(x,z);
      if(y<WATER_LEVEL+.35||Math.hypot(x,z)<9.4)continue;
      matrices.push(matrixAt(x,y-.03,z,0,.91+this.rand()*.10));
      this.clearAreas.push({x,z,r:.36});
      this.lanternGlowMat=this.groundGlow(x,z,1.55,'#f1bd6a',.12,this.lanternGlowMat,glows);
    }
    instanceTemplate(this.group,this.lantern(),matrices,{shadow:true});
    this.group.add(bake(glows,{receive:false}));
    const z=-22.4,x=getPathCenterX(z)+3.5,sign=this.groundGroup(this.static,x,z,-.10);
    part(sign,P.cylinder,this.wood,[0,1.12,0],[.13,2.26,.13]);part(sign,P.cone,this.snow,[0,2.29,0],[.20,.18,.20]);
    const texts=[['YUAN��S TREE',1],['AURORA BAY',-1],['NORTH POLE',1]];
    texts.forEach(([label,dir],i)=>{
      const y=1.94-i*.44,offset=dir*.35,g=new THREE.Group();g.position.set(offset,y,0);sign.add(g);
      const shape=extrude([[-dir*.63,-.14],[-dir*.63,.14],[dir*.42,.14],[dir*.65,0],[dir*.42,-.14]],.085,.018);part(g,shape,this.woodLight);
      const canvas=document.createElement('canvas');canvas.width=512;canvas.height=128;const c=canvas.getContext('2d');
      c.clearRect(0,0,512,128);c.fillStyle='#f3e3b7';c.font='bold 44px Georgia';c.textAlign='center';c.textBaseline='middle';c.fillText(label,256,66,475);
      const tex=new THREE.CanvasTexture(canvas);tex.colorSpace=THREE.SRGBColorSpace;const mat=new THREE.MeshBasicMaterial({map:tex,transparent:true,depthWrite:false});
      // Labels on both faces, so the post remains legible from the orbit camera.
      for(const side of [-1,1])part(g,new THREE.PlaneGeometry(1.05,.26),mat,[-dir*.05,0,side*.062],[1,1,1],[0,side<0?Math.PI:0,0]);
      part(g,P.sphere,this.snow,[-dir*.13,.15,0],[.32,.028,.057]);
    });
  }
  buildWinterPlants(){
    const g=new THREE.Group(),leafShape=new THREE.Shape();leafShape.moveTo(0,0);leafShape.quadraticCurveTo(-.18,.13,0,.36);leafShape.quadraticCurveTo(.18,.13,0,0);
    const leaf=new THREE.ShapeGeometry(leafShape,10);const leafMat=standard('#294b35',{side:THREE.DoubleSide,roughness:.85});
    for(let n=0;n<8;n++){
      const a=n*Math.PI*2/8,h=.35+this.rand()*.33,end=v3(Math.sin(a)*.38,h,Math.cos(a)*.38);beam(g,v3(0,.04,0),end,.019,this.wood,.008);
      for(let k=0;k<3;k++){
        const p=end.clone().multiplyScalar(.5+k*.22);part(g,leaf,leafMat,p.toArray(),[.8,.75,.8],[-.70,a+Math.PI*.5,k%2?.72:-.72]);
        part(g,P.sphere,this.berry,p.clone().add(v3(.035,.04,.02)).toArray(),[.044,.043,.044]);
      }
    }
    const mats=[];
    for(let i=0;i<17;i++){
      const a=this.rand()*Math.PI*2,r=12.7+this.rand()*15.5,x=Math.sin(a)*r,z=Math.cos(a)*r;
      if(Math.abs(x-getPathCenterX(z))<3.5||Math.hypot(x-FIRE_SITE.x,z-FIRE_SITE.z)<4.2||Math.hypot(x-SLEIGH_SITE.x,z-SLEIGH_SITE.z)<6.1||Math.hypot(x+8.2,z-7.2)<3.7)continue;
      const y=this.surface(x,z);if(y<WATER_LEVEL+.45)continue;
      mats.push(matrixAt(x,y,z,a,.65+this.rand()*.55));
    }
    instanceTemplate(this.group,g,mats);
  }
  update(t,dt,ds){
    this.glass.emissiveIntensity=.06+ds.cabinLightFactor*1.9;this.fireGlow.opacity=(.07+.27*ds.treeLightFactor)*(.83+.17*Math.sin(t*8.3));
    if(this.lanternGlowMat)this.lanternGlowMat.opacity=.015+.13*ds.cabinLightFactor;this.flameUniforms.uTime.value=t;this.flameUniforms.uNight.value=ds.treeLightFactor;
    this.logWarm.emissiveIntensity=(.07+.17*ds.treeLightFactor)*(.83+.17*Math.sin(t*7.1));this.stoneWarm.emissiveIntensity=.03+.12*ds.treeLightFactor;
    for(const d of this.deer){
      d.head.rotation.y=Math.sin(t*.37+d.phase)*.19;d.head.rotation.x=.06+Math.sin(t*.49+d.phase*.9)*.11;
      for(let i=0;i<d.breath.length;i++){const p=((t*.38+d.phase+i/3)%1+1)%1,sp=d.breath[i];sp.position.set(.07*p,.015+p*.10,.53+p*.40);sp.scale.setScalar(.13+.30*p);sp.material.opacity=Math.sin(p*Math.PI)*.19*ds.snowCover;}
    }
    for(const o of this.plumeSprites){const p=(t*(o.size>.5?.23:.48)+o.phase)%1; o.sp.position.set(o.x+Math.sin(p*3)*p*o.size*.45,o.y+p*o.size*1.65,o.z+p*o.size*.30);o.sp.scale.setScalar(o.size*(.35+p*.85));o.sp.material.opacity=Math.sin(p*Math.PI)*(.12+.08*ds.mistOpacity);}
  }
}

