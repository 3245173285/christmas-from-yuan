import * as THREE from 'three';
import { fbm2D, ridged2D, smoothstep, mulberry32, WATER_LEVEL } from '../utils/noise.js';
import { primitives as P, v3, standard, part, beam, tube, extrude, bake, instanceTemplate, matrixAt } from './detailGeometry.js';

export const ISLAND = {x:44,z:-87,rx:11.5,rz:8.7};
const RIVER_ROUTE = [[72,-320],[63,-301],[62,-285],[49,-268],[54,-253],[48,-240],[43,-225],[32,-210],[14,-196],[2,-185],[-4,-172]];
const HILL_CABINS = [[-84,-177,.62,1.14],[-100,-196,-.86,1.04],[-64,-201,.26,.96]];
const LIGHTHOUSE = [98,-108];

function islandRadius(a){return 1+.07*Math.sin(a*5+.8)+.035*Math.cos(a*8-1.2);}
function islandHeight(q,a){return WATER_LEVEL-.67+3.65*(1-smoothstep(.39,1,q))+.26*Math.sin(a*3+.4)*Math.sin(q*Math.PI);}
function islandAt(x,z){const dx=(x-ISLAND.x)/ISLAND.rx,dz=(z-ISLAND.z)/ISLAND.rz,a=Math.atan2(dx,dz),q=Math.hypot(dx,dz)/islandRadius(a);return islandHeight(q,a);}

export class DistantLandscape {
  constructor(scene,surface){
    this.scene=scene;this.surface=surface;this.rand=mulberry32(10281226);this.group=new THREE.Group();this.group.name='Fjord landscape details';scene.add(this.group);
    this.static=new THREE.Group();this.clearAreas=[];this.clearRoutes=[];
    this.snow=standard('#e4edf3');this.rock=standard('#555c62');this.wood=standard('#6f4932');this.trim=standard('#dcddd6');this.roof=standard('#3f4147',{roughness:.86});
    this.red=standard('#8f342d');this.ochre=standard('#b07a37');this.dark=standard('#403e3e');this.lit=standard('#ffcb7b',{emissive:'#ffa93d',emissiveIntensity:1.4,roughness:.33});
    this.green=standard('#294739');this.green2=standard('#3b5848');this.frostGreen=standard('#92a99e');
    this.buildFarRanges();this.buildCascade();this.buildIsland();this.buildHillside();this.buildLighthouse();this.buildSkyCameo();
    this.group.add(bake(this.static,{shadow:false,receive:false}));this.static.clear();
  }
  buildFarRanges(){
    // Two distant eroded ridges beyond the existing terrain. Cool atmospheric haze is
    // inherited from the live fog and sunlight; low relief to the south preserves the aurora.
    const mats=[standard('#ffffff',{vertexColors:true,roughness:1}),standard('#ffffff',{vertexColors:true,roughness:1})];
    for(let layer=0;layer<2;layer++){
      const N=360,R=9,positions=[],colors=[],indices=[];
      const base=layer?744:606,width=layer?121:136;
      for(let row=0;row<=R;row++)for(let i=0;i<=N;i++){
        const a=i/N*Math.PI*2,radial=row/R,na=Math.sin(a),nb=Math.cos(a);
        const north=smoothstep(-.25,.95,-nb),v=ridged2D(na*5.1+layer*12,nb*5.1-layer*3.7,5);
        const long=fbm2D(na*2.9+12+layer*6,nb*2.9-3.6,4)*.5+.5;
        const ridge=(Math.sin(radial*Math.PI)**.86)*(1+.085*Math.sin(a*17+radial*3));
        const baseH=(49+90*v+55*long+65*north)*(layer?1.09:1);
        const r=base+radial*width+17*Math.sin(a*4.1+layer)+9*Math.cos(a*11.0+layer*3);
        const detail=fbm2D(na*17+row*.7,nb*17+layer*5,3)*9*ridge;
        const y=-18+ridge*baseH+detail;
        positions.push(r*na,y,r*nb);
        if(row<R&&i<N){let k=row*(N+1)+i;indices.push(k,k+N+1,k+1,k+1,k+N+1,k+N+2);}
      }
      const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geo.setIndex(indices);geo.computeVertexNormals();
      const norm=geo.attributes.normal,baseRock=new THREE.Color(layer?'#526781':'#46566c'),snow=new THREE.Color(layer?'#bacdde':'#bdcfde'),c=new THREE.Color();
      for(let i=0;i<norm.count;i++){
        const x=positions[i*3],y=positions[i*3+1],z=positions[i*3+2],noise=fbm2D(x*.021,z*.021,3);
        const snowMask=smoothstep(65,155,y+noise*65)*smoothstep(.05,.66,norm.getY(i));
        c.copy(baseRock).multiplyScalar(.82+.30*(noise+.5)).lerp(snow,snowMask*.95);colors.push(c.r,c.g,c.b);
      }
      geo.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));part(this.group,geo,mats[layer]);
    }
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
  buildCascade(){
    const bank=standard('#62707a',{roughness:.92}),water=standard('#a9d9e5',{roughness:.30,metalness:.12,emissive:'#254b60',emissiveIntensity:.16});
    this.cascadeUniform={value:0};this.cascadeDay={value:0};this.waterMaterial=water;
    water.onBeforeCompile=shader=>{
      shader.uniforms.uCascadeTime=this.cascadeUniform;
      shader.uniforms.uCascadeDay=this.cascadeDay;
      shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec2 vCascadeUv;').replace('#include <begin_vertex>','#include <begin_vertex>\nvCascadeUv=uv;');
      shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying vec2 vCascadeUv;uniform float uCascadeTime;uniform float uCascadeDay;').replace('#include <color_fragment>',`#include <color_fragment>
        float run=vCascadeUv.y-uCascadeTime*.87;
        float thread=sin(vCascadeUv.x*47.0+sin(run*4.4))*sin(run*7.0+vCascadeUv.x*18.0);
        float rapid=smoothstep(.28,.86,sin(run*7.6+sin(vCascadeUv.x*9.0))*.5+.5);
        float foam=clamp(.26+smoothstep(.12,.83,thread*.5+.5)*.57+rapid*.24,0.0,1.0);
        float edge=smoothstep(0.0,.10,vCascadeUv.x)*(1.0-smoothstep(.90,1.0,vCascadeUv.x));
        diffuseColor.rgb=mix(vec3(.19,.32,.37),mix(vec3(.34,.61,.70),vec3(.86,.96,.99),foam),edge);`)
        .replace('#include <emissivemap_fragment>',`#include <emissivemap_fragment>
        totalEmissiveRadiance += mix(vec3(.08,.17,.23),vec3(.23,.32,.36),uCascadeDay)*foam*edge;`);
    };
    this.groundRibbon(RIVER_ROUTE,4.6,.10,bank,.9);
    const samples=this.groundRibbon(RIVER_ROUTE,3.8,.21,water,.8);this.clearRoutes.push({samples,r:3.1});
    // Alternate banks seeded with exposed slate fragments and glacier-blue ice.
    const stones=new THREE.Group(),stoneInstances=[];part(stones,P.rock,this.rock,[0,0,0],[1,.42,.62]);
    for(let i=2;i<samples.length-5;i+=6){const [x,z]=samples[i],dx=(i%2?1:-1)*(2.2+this.rand()*.8),xx=x+dx,y=this.surface(xx,z);if(y<WATER_LEVEL)continue;stoneInstances.push(matrixAt(xx,y+.06,z,this.rand()*Math.PI,.65+this.rand()*.76));}
    instanceTemplate(this.group,stones,stoneInstances,{receive:false});
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
  buildLighthouse(){
    const [x,z]=LIGHTHOUSE,y=this.surface(x,z);this.clearAreas.push({x,z,r:4.2});const g=new THREE.Group();g.position.set(x,y,z);this.static.add(g);
    part(g,P.cylinder,this.rock,[0,.2,0],[2.0,.65,2.0]);
    const tower=new THREE.CylinderGeometry(.74,1.10,6.1,16);part(g,tower,this.trim,[0,3.25,0]);
    part(g,new THREE.CylinderGeometry(.84,.95,1.5,16),this.red,[0,3.15,0]);
    part(g,P.cylinder,this.iron||this.roof,[0,6.39,0],[1.19,.22,1.19]);part(g,P.cylinder,this.lit,[0,6.83,0],[.65,.76,.65]);
    for(let i=0;i<12;i++){const a=i*Math.PI/6;part(g,P.cylinder,this.roof,[Math.sin(a)*.70,6.83,Math.cos(a)*.70],[.045,.81,.045]);part(g,P.cylinder,this.roof,[Math.sin(a)*1.04,6.78,Math.cos(a)*1.04],[.036,.70,.036]);}
    part(g,P.ring,this.roof,[0,7.05,0],[1.05,1.05,.43],[Math.PI/2,0,0]);part(g,P.cone,this.red,[0,7.48,0],[1.02,.79,1.02]);part(g,P.sphere,this.roof,[0,7.91,0],[.11,.16,.11]);part(g,P.box,this.wood,[0,.99,1.0],[.60,1.28,.11]);
    const lens=new THREE.Group();lens.position.set(x,y+6.82,z);this.group.add(lens);this.beacon=lens;
    this.beaconMat=new THREE.ShaderMaterial({transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,side:THREE.DoubleSide,uniforms:{uPower:{value:0}},vertexShader:`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,fragmentShader:`uniform float uPower;varying vec2 vUv;void main(){float fade=(1.0-smoothstep(.10,1.0,vUv.x))*sin(vUv.y*3.14159);gl_FragColor=vec4(.88,.71,.43,fade*uPower*.12);}`});
    const b=new THREE.BufferGeometry();b.setAttribute('position',new THREE.Float32BufferAttribute([0,0,0,34,-2.6,0,34,2.6,0,0,0,0,34,0,-2.6,34,0,2.6],3));b.setAttribute('uv',new THREE.Float32BufferAttribute([0,.5,1,0,1,1,0,.5,1,0,1,1],2));b.computeVertexNormals();part(lens,b,this.beaconMat);
  }
  buildSkyCameo(){
    this.cameo=new THREE.Group();this.cameo.name='Midnight sleigh silhouette';this.group.add(this.cameo);
    const dark=new THREE.MeshBasicMaterial({color:'#141a28',transparent:true,opacity:0,depthWrite:false}),muted=new THREE.MeshBasicMaterial({color:'#571f28',transparent:true,opacity:0,depthWrite:false}),glint=new THREE.MeshBasicMaterial({color:'#e5b86d',transparent:true,opacity:0,depthWrite:false});this.cameoMats=[dark,muted,glint];
    const g=new THREE.Group();
    for(const side of [-1,1]){
      tube(g,[v3(side*.58,-.14,-1.35),v3(side*.58,-.18,-.45),v3(side*.58,-.13,1.02),v3(side*.58,.25,1.31),v3(side*.58,.39,1.12)],.066,dark,20,6);
      const wall=extrude([[-1.38,.12],[-1.44,.92],[-1.1,.96],[-.68,.51],[.68,.45],[1.04,.72],[1.13,.21]],.09,.018);wall.rotateY(-Math.PI/2);part(g,wall,muted,[side*.59,0,0]);
    }
    part(g,P.box,dark,[0,.18,-.1],[1.24,.24,2.35]);part(g,P.sphere,muted,[0,.83,-.36],[.37,.54,.35]);part(g,P.sphere,dark,[0,1.34,-.23],[.24,.26,.24]);part(g,P.cone,muted,[0,1.58,-.26],[.26,.46,.26],[.5,0,0]);part(g,P.sphere,dark,[0,.65,-1.03],[.40,.49,.40]);
    for(let pair=0;pair<2;pair++)for(const side of [-1,1]){
      const deer=new THREE.Group();deer.position.set(side*.69,.10,2.90+pair*2.70);g.add(deer);
      part(deer,P.sphere,dark,[0,.45,0],[.27,.30,.67]);beam(deer,v3(0,.59,.34),v3(0,.98,.66),.14,dark,.09);part(deer,P.sphere,dark,[0,1.05,.76],[.12,.16,.23]);
      for(const s of [-1,1]){beam(deer,v3(s*.15,.34,.31),v3(s*.18,-.04,.71),.051,dark,.032);beam(deer,v3(s*.15,.32,-.38),v3(s*.20,-.05,-.77),.062,dark,.027);beam(deer,v3(s*.06,1.16,.69),v3(s*.23,1.51,.61),.033,dark,.016);beam(deer,v3(s*.15,1.33,.64),v3(s*.28,1.45,.81),.024,dark,.008);}
      beam(g,v3(side*.53,.45,1.02),v3(side*.69,.45,2.9+pair*2.7),.012,dark);
      part(deer,P.sphere,glint,[0,.99,.94],[.045,.045,.045]);
    }
    this.cameo.add(bake(g,{receive:false}));
    // Single small sparkling point stream trails the runners; bright enough to reward a careful viewer.
    const positions=[],phases=[];for(let i=0;i<80;i++){const q=i/80;positions.push((this.rand()-.5)*(.28+q*1.2),.05-q*.9+(this.rand()-.5)*.32,-1.55-q*14);phases.push(this.rand()*6.28);}
    const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geo.setAttribute('aPhase',new THREE.Float32BufferAttribute(phases,1));
    this.trailMat=new THREE.ShaderMaterial({transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,uniforms:{uTime:{value:0},uAlpha:{value:0}},vertexShader:`attribute float aPhase;uniform float uTime;varying float vF;void main(){vec3 p=position;p.x+=sin(aPhase+uTime*1.7)*.23;p.y+=sin(aPhase+uTime*1.2)*.12;vF=(1.0-clamp((-p.z-1.5)/14.0,0.0,1.0))*(.37+.63*pow(.5+.5*sin(uTime*4.5+aPhase),3.0));vec4 mv=modelViewMatrix*vec4(p,1.0);gl_Position=projectionMatrix*mv;gl_PointSize=clamp(440.0/max(1.0,-mv.z),1.2,4.8);}`,fragmentShader:`uniform float uAlpha;varying float vF;void main(){float d=length(gl_PointCoord-.5)*2.0;gl_FragColor=vec4(1.0,.76,.33,exp(-d*d*5.0)*vF*uAlpha*.75);}`});this.cameo.add(new THREE.Points(geo,this.trailMat));this.cameo.visible=false;
  }
  update(t,dt,ds){
    this.cascadeUniform.value=t;this.cascadeDay.value=1-ds.treeLightFactor;this.waterMaterial.emissiveIntensity=.06+.12*ds.treeLightFactor;this.lit.emissiveIntensity=.025+ds.cabinLightFactor*2.15;
    this.islandSnow.value=ds.snowCover;this.beacon.rotation.y=t*.48;this.beaconMat.uniforms.uPower.value=ds.cabinLightFactor;
    // Time-based cameo: only around midnight, once per 24-hour loop, with a soft fade.
    const fromMidnight=(ds.hour+24-23.75)%24,progress=fromMidnight/.90,show=progress>=0&&progress<1&&ds.starIntensity>.5;
    this.cameo.visible=show;
    if(show){const f=smoothstep(0,.16,progress)*(1-smoothstep(.80,1,progress));this.cameo.position.set(-161+322*progress,63+9*Math.sin(progress*Math.PI),-226);this.cameo.rotation.y=Math.PI*.5;this.cameo.rotation.z=.035*Math.sin(progress*12);this.cameo.scale.setScalar(1.25);this.cameoMats.forEach(m=>m.opacity=f*.90);this.trailMat.uniforms.uAlpha.value=f;this.trailMat.uniforms.uTime.value=t;}
  }
}
