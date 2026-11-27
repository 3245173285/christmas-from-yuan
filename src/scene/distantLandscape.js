import * as THREE from 'three';
import { fbm2D, ridged2D, getTerrainHeight, smoothstep, mulberry32, WATER_LEVEL } from '../utils/noise.js';
import { getSharedNoiseLUTTexture } from '../utils/textures.js';
import { primitives as P, v3, standard, part, beam, tube, extrude, bake, instanceTemplate, matrixAt } from './detailGeometry.js';
import { buildDetailedLighthouse, LIGHTHOUSE } from './coastalDetails.js';
import { buildAlpineWaterfall } from './alpineWaterfall.js';

export const ISLAND = {x:44,z:-87,rx:11.5,rz:8.7};
const HILL_CABINS = [[-84,-177,.62,1.14],[-100,-196,-.86,1.04],[-64,-201,.26,.96]];

function islandRadius(a){return 1+.07*Math.sin(a*5+.8)+.035*Math.cos(a*8-1.2);}
function islandHeight(q,a){return WATER_LEVEL-.67+3.65*(1-smoothstep(.39,1,q))+.26*Math.sin(a*3+.4)*Math.sin(q*Math.PI);}
function islandAt(x,z){const dx=(x-ISLAND.x)/ISLAND.rx,dz=(z-ISLAND.z)/ISLAND.rz,a=Math.atan2(dx,dz),q=Math.hypot(dx,dz)/islandRadius(a);return islandHeight(q,a);}

const CAMEO_DURATION = 23;
const CAMEO_WINDOW = 3.07;
function flightAt(p, out) {
  return out.set(-164+328*p, 65+10*Math.sin(p*Math.PI)+1.35*Math.sin(p*14), -226+11*Math.sin(p*2.7));
}

export class DistantLandscape {
  constructor(scene,surface,terrainMaterial){
    this.scene=scene;this.surface=surface;// Preserve the exact island layout after removing the 106 legacy cascade random draws.
    this.rand=mulberry32((10281226+Math.imul(106,0x6d2b79f5))>>>0);this.group=new THREE.Group();this.group.name='Fjord landscape details';scene.add(this.group);
    this.static=new THREE.Group();this.clearAreas=[];this.clearRoutes=[];
    this.snow=standard('#e4edf3');this.rock=standard('#555c62');this.wood=standard('#6f4932');this.trim=standard('#dcddd6');this.roof=standard('#3f4147',{roughness:.86});
    this.red=standard('#8f342d');this.ochre=standard('#b07a37');this.dark=standard('#403e3e');this.lit=standard('#ffcb7b',{emissive:'#ffa93d',emissiveIntensity:1.4,roughness:.33});
    this.green=standard('#294739');this.green2=standard('#3b5848');this.frostGreen=standard('#92a99e');
    this.buildFarRanges(terrainMaterial);
    this.buildMountainMist();
    this.cascade=buildAlpineWaterfall(this.group,this.surface,this.clearAreas);
    this.buildIsland();this.buildHillside();
    this.lighthouse=buildDetailedLighthouse(this);
    this.buildSkyCameo();
    this.group.add(bake(this.static,{shadow:false,receive:false}));this.static.clear();
  }
  buildFarRanges(terrainMaterial){
    // Continuation of the exact foreground height field and rock/snow shader.
    // The original terrain is a square, so the first ring follows its perimeter.
    const N=480,R=27,pos=[],idx=[],colors=[],path=[],base=new THREE.Color('#1f2632');
    for(let i=0;i<=N;i++){
      const a=i/N*Math.PI*2, sx=Math.sin(a), sz=Math.cos(a);
      const edge=570/Math.max(Math.abs(sx),Math.abs(sz)), north=smoothstep(-.18,.88,-sz);
      for(let j=0;j<=R;j++){
        const t=j/R,r=THREE.MathUtils.lerp(edge-12,862,t);
        const x=sx*r,z=sz*r;
        const ridge=ridged2D(x*.0094+16,z*.0094-2.3,4);
        const relief=(ridge-.5)*(19+15*north)*smoothstep(0,.31,t);
        const falloff=1-smoothstep(.50,1,t);
        const natural=getTerrainHeight(x,z)+relief;
        const y=THREE.MathUtils.lerp(-15,natural,falloff)-2.2*(1-smoothstep(0,.23,t));
        pos.push(x,y,z);colors.push(base.r,base.g,base.b);path.push(0);
        if(i<N&&j<R){const k=i*(R+1)+j;idx.push(k,k+1,k+R+1,k+1,k+R+2,k+R+1);}
      }
    }
    const geo=new THREE.BufferGeometry();
    geo.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));
    geo.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
    geo.setAttribute('aPath',new THREE.Float32BufferAttribute(path,1));
    geo.setIndex(idx);geo.computeVertexNormals();
    part(this.group,geo,terrainMaterial).name='Alpine terrain continuation';
  }
  buildMountainMist(){
    // A bounded, depth-tested fog volume over distant valleys only. Use the
    // existing noise texture and five samples along each view ray.
    const center=v3(0,48,-432),half=v3(370,48,118);
    this.mistUniforms={
      uCenter:{value:center},uExtent:{value:half},uTime:{value:0},uDensity:{value:.45},
      uTint:{value:new THREE.Color('#5f7383')},uNoise:{value:getSharedNoiseLUTTexture(256)}
    };
    const material=new THREE.ShaderMaterial({transparent:true,depthWrite:false,uniforms:this.mistUniforms,
      vertexShader:`varying vec3 vMistWorld;
        void main(){vec4 p=modelMatrix*vec4(position,1.0);vMistWorld=p.xyz;gl_Position=projectionMatrix*viewMatrix*p;}`,
      fragmentShader:`varying vec3 vMistWorld;
        uniform vec3 uCenter;uniform vec3 uExtent;uniform vec3 uTint;
        uniform float uTime;uniform float uDensity;uniform sampler2D uNoise;
        void main(){
          vec3 ray=normalize(vMistWorld-cameraPosition);
          vec3 safeRay=ray+vec3(0.00002);
          vec3 lo=(uCenter-uExtent-cameraPosition)/safeRay;
          vec3 hi=(uCenter+uExtent-cameraPosition)/safeRay;
          vec3 a=min(lo,hi),b=max(lo,hi);
          float nearT=max(0.0,max(a.x,max(a.y,a.z))),farT=min(b.x,min(b.y,b.z));
          float span=max(0.0,farT-nearT),density=0.0;
          for(int i=0;i<5;i++){
            vec3 p=cameraPosition+ray*(nearT+span*((float(i)+.5)*.2));
            vec3 unit=abs((p-uCenter)/uExtent);
            float edge=(1.0-smoothstep(.46,1.0,unit.x))*(1.0-smoothstep(.40,1.0,unit.z));
            vec2 uv=p.xz*vec2(.0028,.0049)+vec2(uTime*.00040,-uTime*.00017);
            vec4 n=texture2D(uNoise,uv+vec2(p.y*.0019,p.y*.0028));
            float top=32.0+n.g*36.0;
            float layer=smoothstep(4.0,23.0,p.y)*(1.0-smoothstep(top-13.0,top+16.0,p.y));
            density+=edge*layer*smoothstep(.23,.79,n.b*.72+n.r*.28);
          }
          float alpha=(1.0-exp(-density*span*.0019*uDensity))*.55;
          gl_FragColor=vec4(uTint,alpha);
        }`
    });
    part(this.group,new THREE.BoxGeometry(half.x*2,half.y*2,half.z*2),material,center.toArray()).name='Drifting alpine valley haze';
    this.mistAir = new THREE.Color('#557185');
  }
  groundRibbon(route,width,offset,material,step=1.25){
    const curve=new THREE.CatmullRomCurve3(route.map(([x,z])=>v3(x,0,z)),false,'centripetal'),length=curve.getLength(),N=Math.ceil(length/step),cols=6,pos=[],uv=[],idx=[],samples=[];
    for(let i=0;i<=N;i++){
      const t=i/N,p=curve.getPointAt(t),dir=curve.getTangentAt(t),side=v3(-dir.z,0,dir.x).normalize();
      const w=width*(.80+.18*Math.sin(t*19)+.10*Math.cos(t*31));samples.push([p.x,p.z]);
      for(let j=0;j<=cols;j++){
        const u=j/cols,q=p.clone().addScaledVector(side,(u-.5)*w);q.y=this.surface(q.x,q.z)+offset;pos.push(...q.toArray());uv.push(u,t*length*.15);
        if(i<N&&j<cols){const a=i*(cols+1)+j;idx.push(a,a+1,a+cols+1,a+1,a+cols+2,a+cols+1);}
      }
    }
    const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geo.setIndex(idx);geo.computeVertexNormals();
    // Both sides remove sensitivity to the orientation of the winding strip.
    material.side=THREE.DoubleSide;part(this.group,geo,material);return samples;
  }
  buildIsland(){
    const p=[],color=[],idx=[],snowMask=[],N=84,R=16,c=new THREE.Color(),moss=new THREE.Color('#436147'),cliff=new THREE.Color('#4a535b'),sand=new THREE.Color('#7c817a');
    for(let row=0;row<=R;row++)for(let i=0;i<=N;i++){
      const q=Math.max(.001,row/R),a=i/N*Math.PI*2,r=q*islandRadius(a),x=ISLAND.x+Math.sin(a)*r*ISLAND.rx,z=ISLAND.z+Math.cos(a)*r*ISLAND.rz,y=islandHeight(q,a);
      p.push(x,y,z);const noise=fbm2D(x*.45,z*.45,3);c.copy(moss).lerp(cliff,smoothstep(.58,.93,q)).lerp(sand,smoothstep(.9,1,q)*.65).multiplyScalar(.89+noise*.23);color.push(c.r,c.g,c.b);snowMask.push((1-smoothstep(.65,.96,q))*(.55+noise*.7));
      if(row<R&&i<N){let k=row*(N+1)+i;idx.push(k,k+N+1,k+1,k+1,k+N+1,k+N+2);}
    }
    const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(p,3));geo.setAttribute('color',new THREE.Float32BufferAttribute(color,3));geo.setAttribute('aIslandSnow',new THREE.Float32BufferAttribute(snowMask,1));geo.setIndex(idx);geo.computeVertexNormals();
    const mat=standard('#ffffff',{vertexColors:true});this.islandSnow={value:.94};
    mat.onBeforeCompile=shader=>{
      shader.uniforms.uIslandSnow=this.islandSnow;shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nattribute float aIslandSnow;varying float vIslandSnow;').replace('#include <begin_vertex>','#include <begin_vertex>\nvIslandSnow=aIslandSnow;');
      shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nuniform float uIslandSnow;varying float vIslandSnow;').replace('#include <color_fragment>','#include <color_fragment>\ndiffuseColor.rgb=mix(diffuseColor.rgb,vec3(.75,.83,.88),smoothstep(.25,.9,vIslandSnow*uIslandSnow)*.82);');
    };
    part(this.group,geo,mat);
    const g=this.static;
    // Basalt shore, compact snowy spruces and a single red fisherman\'s cottage.
    for(let i=0;i<28;i++){const a=i*Math.PI*2/28+.1,r=(.83+this.rand()*.10)*islandRadius(a),x=ISLAND.x+Math.sin(a)*r*ISLAND.rx,z=ISLAND.z+Math.cos(a)*r*ISLAND.rz,y=islandAt(x,z);part(g,P.rock,this.rock,[x,y-.10,z],[.48+this.rand()*.68,.35,.48+this.rand()*.53],[.24,a,.20]);}
    const treeG=new THREE.Group();part(treeG,P.cylinder,this.wood,[0,1.35,0],[.12,2.7,.12]);
    for(let i=0;i<5;i++){
      const w=1.12-i*.18,y=1.12+i*.59,h=1.74-i*.17;
      part(treeG,new THREE.ConeGeometry(1,1,10,1),i%2?this.green2:this.green,[0,y,0],[w,h,w],[0,i*.49,0]);
      part(treeG,new THREE.ConeGeometry(1,1,10,1),this.frostGreen,[0,y+.27,0],[w*.67,h*.68,w*.67],[0,i*.49,0]);
    }
    const trees=[];for(let i=0;i<14;i++){const a=i*2.39996,r=.35+.38*this.rand(),x=ISLAND.x+Math.sin(a)*r*ISLAND.rx,z=ISLAND.z+Math.cos(a)*r*ISLAND.rz;if(z>ISLAND.z+1&&Math.abs(x-ISLAND.x)<4)continue;trees.push(matrixAt(x,islandAt(x,z)-.04,z,a,.58+this.rand()*.56));}
    instanceTemplate(this.group,treeG,trees,{receive:false});
    const cx=ISLAND.x+.8,cz=ISLAND.z+3.0;this.cottage(cx,islandAt(cx,cz),cz,.22,.76,this.red);
    const dockZ=ISLAND.z+7.2;
    for(let i=0;i<9;i++)part(g,P.box,this.wood,[ISLAND.x+1,WATER_LEVEL+.44,dockZ+i*.29],[1.45,.14,.265]);
    for(const x of [ISLAND.x+.40,ISLAND.x+1.60])for(let i=0;i<3;i++)part(g,P.cylinder,this.wood,[x,WATER_LEVEL-.15,dockZ+i*1.13],[.10,1.40,.10]);
  }
  cottage(x,y,z,yaw,scale,wall){
    const g=new THREE.Group();g.position.set(x,y,z);g.rotation.y=yaw;g.scale.setScalar(scale);this.static.add(g);
    part(g,P.box,this.rock,[0,.05,0],[4.18,.53,3.73]);part(g,P.box,wall,[0,1.32,0],[4.0,2.2,3.5]);
    const gable=extrude([[-2,2.42],[2,2.42],[0,3.68]],3.5,0);part(g,gable,wall);
    for(let side of [-1,1]){
      part(g,P.box,this.roof,[side*1.05,3.11,0],[2.50,.16,4.03],[0,0,-side*.56]);
      part(g,P.box,this.snow,[side*1.05,3.22,0],[2.36,.09,3.92],[0,0,-side*.56]);
      for(let n=0;n<9;n++)part(g,P.box,this.trim,[side*2.01,.43+n*.225,0],[.016,.018,3.50]);
    }
    part(g,P.box,this.trim,[0,3.71,0],[.13,.13,4]);
    for(const sx of [-1,1])for(const sz of [-1,1])part(g,P.box,this.trim,[sx*1.97,1.34,sz*1.72],[.12,2.20,.12]);
    part(g,P.box,this.rock,[1.16,3.40,-.87],[.47,1.07,.50]);part(g,P.box,this.snow,[1.16,3.97,-.87],[.53,.11,.57]);
    const addWindow=(x,y,z,angle)=>{const w=new THREE.Group();w.position.set(x,y,z);w.rotation.y=angle;g.add(w);part(w,P.box,this.trim,[0,0,0],[.98,1.06,.10]);part(w,P.box,this.lit,[0,0,.065],[.78,.86,.07]);part(w,P.box,this.trim,[0,0,.11],[.055,.85,.05]);part(w,P.box,this.trim,[0,0,.11],[.78,.055,.05]);part(w,P.box,this.trim,[0,-.57,.07],[1.10,.10,.2]);};
    addWindow(-1.05,1.44,1.76,0);addWindow(1.04,1.44,1.76,0);addWindow(-2.02,1.44,0,-Math.PI/2);addWindow(2.02,1.44,0,Math.PI/2);addWindow(.02,2.83,1.76,0);addWindow(-.90,1.43,-1.76,Math.PI);
    part(g,P.box,this.wood,[.0,.96,1.80],[.70,1.55,.10]);part(g,P.box,this.trim,[0,.12,2.03],[1.22,.20,.54]);
    part(g,P.box,this.wood,[0,.12,2.32],[1.45,.18,.38]);
    for(let i=0;i<8;i++)part(g,P.box,this.wood,[Math.sin(i*2.3)*2.7,.13,Math.cos(i*2.3)*2.6],[.51,.12,.32],[0,i*.5,0]);
  }
  buildHillside(){
    // A narrow contoured road stitches the scattered hillside lodges into the existing village.
    const route=[[-73,-151],[-81,-162],[-84,-172],[-91,-182],[-99,-191],[-97,-209],[-86,-217],[-75,-209],[-64,-196],[-59,-190]];
    const road=standard('#7b776c',{roughness:.98});this.clearRoutes.push({samples:this.groundRibbon(route,2.6,.105,road,1.3),r:2.0});
    for(let i=0;i<HILL_CABINS.length;i++){
      const [x,z,yaw,sc]=HILL_CABINS[i],y=this.surface(x,z);this.clearAreas.push({x,z,r:5.7});
      const foot=new THREE.Group();foot.position.set(x,y-.42,z);foot.rotation.y=yaw;this.static.add(foot);
      part(foot,P.box,this.rock,[0,.12,0],[5.6,.95,4.9]);this.cottage(x,y+.16,z,yaw,sc,i===1?this.ochre:i===2?this.dark:this.red);
      for(let j=0;j<2;j++){const px=x+Math.cos(yaw)*(3+j*.5),pz=z+Math.sin(yaw)*3;part(this.static,P.cylinder,this.wood,[px,this.surface(px,pz)+.65,pz],[.10,1.3,.10]);part(this.static,P.box,this.lit,[px,this.surface(px,pz)+1.37,pz],[.20,.23,.20]);}
    }
  }
  buildSkyCameo(){
    this.cameo=new THREE.Group();this.cameo.name='Midnight sleigh silhouette';this.group.add(this.cameo);
    const dark=new THREE.MeshBasicMaterial({color:'#141a28',transparent:true,opacity:0,depthWrite:false}),muted=new THREE.MeshBasicMaterial({color:'#571f28',transparent:true,opacity:0,depthWrite:false}),glint=new THREE.MeshBasicMaterial({color:'#e5b86d',transparent:true,opacity:0,depthWrite:false});this.cameoMats=[dark,muted,glint];
    const g=new THREE.Group();this.cameoLegs=[];
    for(const side of [-1,1]){
      tube(g,[v3(side*.58,-.14,-1.35),v3(side*.58,-.18,-.45),v3(side*.58,-.13,1.02),v3(side*.58,.25,1.31),v3(side*.58,.39,1.12)],.066,dark,20,6);
      const wall=extrude([[-1.38,.12],[-1.44,.92],[-1.1,.96],[-.68,.51],[.68,.45],[1.04,.72],[1.13,.21]],.09,.018);wall.rotateY(-Math.PI/2);part(g,wall,muted,[side*.59,0,0]);
    }
    part(g,P.box,dark,[0,.18,-.1],[1.24,.24,2.35]);part(g,P.sphere,muted,[0,.83,-.36],[.37,.54,.35]);part(g,P.sphere,dark,[0,1.34,-.23],[.24,.26,.24]);part(g,P.cone,muted,[0,1.58,-.26],[.26,.46,.26],[.5,0,0]);part(g,P.sphere,dark,[0,.65,-1.03],[.40,.49,.40]);
    for(let pair=0;pair<2;pair++)for(const side of [-1,1]){
      const deer=new THREE.Group();deer.position.set(side*.69,.10,2.90+pair*2.70);g.add(deer);
      part(deer,P.sphere,dark,[0,.45,0],[.27,.30,.67]);beam(deer,v3(0,.59,.34),v3(0,.98,.66),.14,dark,.09);part(deer,P.sphere,dark,[0,1.05,.76],[.12,.16,.23]);
      for(const s of [-1,1]){
        beam(deer,v3(s*.06,1.16,.69),v3(s*.23,1.51,.61),.033,dark,.016);
        beam(deer,v3(s*.15,1.33,.64),v3(s*.28,1.45,.81),.024,dark,.008);
        for(const front of [true,false]){
          const pivot=new THREE.Group(), upper=new THREE.Group(), dz=front?.31:-.38;
          pivot.position.copy(deer.position).add(v3(s*.15,.34,dz));
          beam(upper,v3(0,0,0),v3(s*.025,-.19,front?.12:-.12),front?.051:.060,dark,.033);
          beam(upper,v3(s*.025,-.19,front?.12:-.12),v3(s*.039,-.40,front?.16:-.19),.035,dark,.024);
          pivot.add(bake(upper,{receive:false})); this.cameo.add(pivot);
          this.cameoLegs.push({pivot,phase:pair*.62+side*.42+s*.25+(front?0:Math.PI)});
        }
      }
      beam(g,v3(side*.53,.45,1.02),v3(side*.69,.45,2.9+pair*2.7),.012,dark);
      part(deer,P.sphere,glint,[0,.99,.94],[.045,.045,.045]);
    }
    this.cameo.add(bake(g,{receive:false}));
    // World-space dust persists on the route after the sled moves away.
    const count=196, r=mulberry32(2612026);
    this.trailPos=new Float32Array(count*3);
    this.trailOpacity=new Float32Array(count);
    this.trailSeeds=Array.from({length:count},(_,i)=>[(i+.5)/count,r(),r(),r()]);
    this.trailVector=v3(0,0,0);
    const geo=new THREE.BufferGeometry();
    geo.setAttribute('position',new THREE.BufferAttribute(this.trailPos,3).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute('aLife',new THREE.BufferAttribute(this.trailOpacity,1).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute('aSeed',new THREE.Float32BufferAttribute(this.trailSeeds.map(x=>x[3]),1));
    this.trailMat=new THREE.ShaderMaterial({
      transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,
      uniforms:{uTime:{value:0},uPixelRatio:{value:typeof window==='undefined'?1:Math.min(window.devicePixelRatio,1.5)}},
      vertexShader:`
        attribute float aLife;attribute float aSeed;uniform float uTime;uniform float uPixelRatio;
        varying float vFade;varying float vStar;
        void main(){
          float sparkle=pow(.5+.5*sin(uTime*(1.9+aSeed*3.1)+aSeed*59.0),8.0);
          vStar=smoothstep(.92,.995,aSeed)*sparkle;vFade=aLife*(.35+.48*sparkle);
          vec4 mv=modelViewMatrix*vec4(position,1.0);gl_Position=projectionMatrix*mv;
          gl_PointSize=clamp((360.0+aSeed*220.0+vStar*260.0)*uPixelRatio/max(1.0,-mv.z),1.0,5.8);
        }`,
      fragmentShader:`
        varying float vFade;varying float vStar;
        void main(){
          vec2 p=gl_PointCoord-.5;float rr=dot(p,p);
          float soft=exp(-rr*24.0)*(1.-smoothstep(.14,.25,rr));
          float diamond=exp(-(abs(p.x)*24.0+abs(p.y)*8.0))+exp(-(abs(p.x)*8.0+abs(p.y)*24.0));
          gl_FragColor=vec4(mix(vec3(1.,.66,.29),vec3(1.,.84,.56),vStar),vFade*(soft*.65+diamond*vStar*.22));
        }`
    });
    this.trail=new THREE.Points(geo,this.trailMat);
    this.trail.frustumCulled=false;this.group.add(this.trail);
    this.cameo.visible=this.trail.visible=false;
    this.cameoProgress=-1;
    this.inCameoWindow=false;
    this.previousHour=null;
  }
  updateCameo(t,dt,ds){
    const fromMidnight=(ds.hour+24-23.75)%24;
    const night=ds.starIntensity>.5, inWindow=night&&fromMidnight<CAMEO_WINDOW;
    const hourJump=this.previousHour!==null&&Math.abs(((ds.hour-this.previousHour+36)%24)-12)>.24;
    if(inWindow&&(!this.inCameoWindow||hourJump))this.cameoProgress=fromMidnight/CAMEO_WINDOW;
    else if(!night||hourJump)this.cameoProgress=-1;
    else if(this.cameoProgress>=0)this.cameoProgress+=dt/CAMEO_DURATION;
    this.previousHour=ds.hour;
    this.inCameoWindow=inWindow;
    const p=this.cameoProgress, active=night&&p>=0;
    this.cameo.visible=active&&p<1;
    this.trail.visible=active&&p<1.20;
    if(!this.trail.visible)return;
    const f=smoothstep(0,.09,p)*(1-smoothstep(.90,1,p));
    if(this.cameo.visible){
      flightAt(p,this.cameo.position);
      this.cameo.rotation.set(.016*Math.sin(p*13),Math.atan2(328,29.7*Math.cos(p*2.7)),.038*Math.sin(p*11));
      this.cameo.scale.setScalar(1.25);
      this.cameoMats.forEach(m=>m.opacity=f*.92);
      for(const {pivot,phase} of this.cameoLegs)pivot.rotation.x=Math.sin(t*8+phase)*.28;
    }
    const tailOut=1-smoothstep(1.02,1.20,p);
    for(let i=0;i<this.trailSeeds.length;i++){
      const [q,a,b,c]=this.trailSeeds[i], behind=.008+q*.185, oldP=p-behind;
      flightAt(THREE.MathUtils.clamp(oldP,0,1),this.trailVector);
      const k=i*3, drift=q*q;
      this.trailPos[k]=this.trailVector.x-2.0+(a-.5)*(.9+4*drift);
      this.trailPos[k+1]=this.trailVector.y+.16+(b-.5)*(.55+6.5*drift)-2.2*drift;
      this.trailPos[k+2]=this.trailVector.z+(c-.5)*(.9+6*drift);
      this.trailOpacity[i]=oldP>0&&oldP<1?tailOut*(1-q)**1.2*smoothstep(0,.08,oldP):0;
    }
    this.trail.geometry.attributes.position.needsUpdate=true;
    this.trail.geometry.attributes.aLife.needsUpdate=true;
    this.trailMat.uniforms.uTime.value=t;
  }
  update(t,dt,ds){
    this.mistUniforms.uTime.value=t;
    this.mistUniforms.uDensity.value=.29+ds.mistOpacity*.58;
    this.mistUniforms.uTint.value.copy(ds.fogColor).lerp(this.mistAir,.46*ds.starIntensity);
    this.cascade.time.value=t;this.cascade.daylight.value=1-ds.treeLightFactor;
    this.lit.emissiveIntensity=.025+ds.cabinLightFactor*2.15;
    this.islandSnow.value=ds.snowCover;
    const {lens,beaconMat,lamp,glazing}=this.lighthouse;
    lens.rotation.y=t*LIGHTHOUSE.speed;
    beaconMat.uniforms.uPower.value=ds.cabinLightFactor*ds.cabinLightFactor;
    lamp.emissiveIntensity=.06+ds.cabinLightFactor*1.72;
    glazing.emissiveIntensity=ds.cabinLightFactor*.53;
    this.updateCameo(t,dt,ds);
  }
}
