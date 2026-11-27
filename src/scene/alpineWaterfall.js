import * as THREE from 'three';
import { getSharedNoiseLUTTexture } from '../utils/textures.js';
import { ALPINE_FALL, lipZ } from '../utils/alpineFallLayout.js';
import { mulberry32 } from '../utils/noise.js';

const fogVertex=`
  #include <fog_pars_vertex>
  varying vec2 vUv;varying float vEndFade;
  attribute float aEndFade;
  void main(){
    vUv=uv;vEndFade=aEndFade;
    vec4 mvPosition=modelViewMatrix*vec4(position,1.);
    gl_Position=projectionMatrix*mvPosition;
    #include <fog_vertex>
  }`;

// Water is fitted to the exact scarp triangles. No separate rock pile is placed
// in front of the mountain and no long painted ribbon continues down the slope.
export function buildAlpineWaterfall(parent,surface,clearAreas){
  const rng=mulberry32(20261128);
  const {x,z}=ALPINE_FALL;
  const root=new THREE.Group();root.name='High alpine curtain waterfall';parent.add(root);
  clearAreas.push({x,z:z-1,r:20},{x:x+1,z:z+20,r:12});
  const uniform={time:{value:0},daylight:{value:.35}};
  const noise=getSharedNoiseLUTTexture(256);
  const waterMat=new THREE.ShaderMaterial({
    fog:true,transparent:true,depthWrite:false,side:THREE.DoubleSide,
    uniforms:{...THREE.UniformsUtils.clone(THREE.UniformsLib.fog),uTime:uniform.time,uDay:uniform.daylight,uNoise:{value:noise}},
    vertexShader:fogVertex,
    fragmentShader:`
      #include <fog_pars_fragment>
      uniform float uTime;uniform float uDay;uniform sampler2D uNoise;
      varying vec2 vUv;varying float vEndFade;
      void main(){
        float u=vUv.x,v=vUv.y;
        float flow=v-uTime*.71;
        // Long coherent ribbons with smaller moving bubbles; silver-white
        // strands, blue shadowed water, and a non-luminous softened boundary.
        vec4 n=texture2D(uNoise,vec2(u*.83,flow*.10));
        float streak=texture2D(uNoise,vec2(u*2.1+(n.g-.5)*.07,flow*.064)).g;
        float thread=texture2D(uNoise,vec2(u*5.7,flow*.20)).r;
        float wave=smoothstep(.25,.77,streak*.75+thread*.25);
        float f=smoothstep(.29,.80,n.b*.27+wave*.73);
        // Persistent broad plumes separate softly in the middle of the fall;
        // their fine silver filaments continue moving through the darker veil.
        float channel=.60+.038*sin(v*1.7)+.02*sin(v*4.1);
        float trough=exp(-pow((u-channel)*12.0,2.0))
                     *smoothstep(.7,1.8,v)*(1.0-smoothstep(5.3,6.4,v));
        float filaments=.5+.5*sin(u*43.0+n.r*2.8);
        f=clamp(f*.80+filaments*.24-trough*.36,0.,1.);
        float drift=(texture2D(uNoise,vec2(u*.15,flow*.18)).r-.5)*.10;
        float softEdge=smoothstep(.005,.15,min(u,1.-u)+drift);
        vec3 deep=mix(vec3(.16,.23,.30),vec3(.29,.38,.43),uDay);
        vec3 silver=mix(vec3(.56,.65,.70),vec3(.82,.87,.89),uDay);
        vec3 col=mix(deep,silver,.14+.86*f);
        float veil=(.57+.34*wave)*(1.-trough*.25);
        gl_FragColor=vec4(col,softEdge*vEndFade*veil);
        #include <fog_fragment>
      }`
  });
  // Find the actual rendered rock face at a given height. This guarantees
  // an approximately vertical water sheet just ahead of the cliff surface.
  function faceZ(wx,y){
    const edge=lipZ(wx);
    let a=edge-11,b=edge+12;
    for(let i=0;i<18;i++){
      const mid=(a+b)*.5;
      if(surface(wx,mid)>y)a=mid;else b=mid;
    }
    return b;
  }
  const upper=surface(x,z-8.5)-.35,lower=surface(x+1,z+9.0)+.35;
  const nx=14,ny=94,positions=[],uv=[],idx=[],fade=[];
  for(let row=0;row<=ny;row++){
    const t=row/ny;
    let wx,w,y,kind,progress;
    if(t<.12){kind=0;progress=t/.12;wx=x-.25+.27*progress;w=3.30+1.58*progress;}
    else if(t<.89){kind=1;progress=(t-.12)/.77;wx=x+.82*progress+.22*Math.sin(progress*7);w=4.88+2.06*Math.pow(progress,.87)+.40*Math.sin(progress*17);}
    else{kind=2;progress=(t-.89)/.11;wx=x+.82+1.25*progress;w=6.94+3.4*progress;}
    for(let j=0;j<=nx;j++){
      const u=j/nx,s=(u-.5)*2,px=wx+s*w*.5*(1+.045*Math.sin(t*52+s*3));
      const localUpper=surface(px,lipZ(px)-8.5)-.35,localLower=surface(px,lipZ(px)+9)+.35;
      let pz,py;
      if(kind===0){
        const a=lipZ(px)-15.0,b=faceZ(px,localUpper);
        pz=THREE.MathUtils.lerp(a,b,progress);
        py=surface(px,pz)+.34+.12*progress;
      } else if(kind===1){
        py=THREE.MathUtils.lerp(localUpper+.45,localLower,progress);
        pz=faceZ(px,py)+.44+.46*Math.sin(progress*Math.PI)+.14*(1-s*s);
      } else {
        const a=faceZ(px,localLower)+.46;
        pz=a+progress*8.4;
        py=surface(px,pz)+.23+.12*Math.sin(progress*Math.PI);
      }
      positions.push(px,py,pz);
      uv.push(u,t*7.5);fade.push(kind===0?THREE.MathUtils.smoothstep(progress,0,.65):kind===2?1-THREE.MathUtils.smoothstep(progress,.16,1):1);
      if(row<ny&&j<nx){const i=row*(nx+1)+j;idx.push(i,i+1,i+nx+1,i+1,i+nx+2,i+nx+1);}
    }
  }
  const geo=new THREE.BufferGeometry();
  geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  geo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geo.setAttribute('aEndFade',new THREE.Float32BufferAttribute(fade,1));geo.setIndex(idx);geo.computeBoundingSphere();
  const sheet=new THREE.Mesh(geo,waterMat);sheet.renderOrder=2;root.add(sheet);

  // Fine suspended spray at the foot, expanding and evaporating. Soft round
  // droplets use a single draw call and never create a solid white cloud.
  const baseZ=faceZ(x+1,lower)+1.3;
  const seeds=[],sprayPositions=[];
  for(let i=0;i<72;i++){
    const u=rng(),v=rng(),w=rng();
    sprayPositions.push(x+1+(u-.5)*7.2,lower+.15,baseZ+v*3.8);seeds.push(rng(),v,w);
  }
  const sprayGeo=new THREE.BufferGeometry();
  sprayGeo.setAttribute('position',new THREE.Float32BufferAttribute(sprayPositions,3));sprayGeo.setAttribute('aSeed',new THREE.Float32BufferAttribute(seeds,3));
  const m=new THREE.ShaderMaterial({
    fog:true,transparent:true,depthWrite:false,
    uniforms:{...THREE.UniformsUtils.clone(THREE.UniformsLib.fog),uTime:uniform.time,uDay:uniform.daylight},
    vertexShader:`
      #include <fog_pars_vertex>
      attribute vec3 aSeed;uniform float uTime;varying float vAlpha;
      void main(){
        float f=fract(aSeed.x+uTime*(.16+.18*aSeed.z));
        vec3 p=position+vec3((aSeed.y-.5)*16.*f,1.5+f*(2.4+5.3*aSeed.z),f*(4.5+6.*aSeed.x));
        vec4 mvPosition=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*mvPosition;
        gl_PointSize=clamp((1650.+2300.*f)*(.66+aSeed.z*.44)/max(1.,-mvPosition.z),2.,24.);
        vAlpha=smoothstep(0.,.16,f)*(1.-smoothstep(.26,1.,f));
        #include <fog_vertex>
      }`,
    fragmentShader:`
      #include <fog_pars_fragment>
      uniform float uDay;varying float vAlpha;
      void main(){
        float r=length(gl_PointCoord-.5)*2.;
        float a=exp(-r*r*5.)*(1.-smoothstep(.75,1.,r));
        gl_FragColor=vec4(mix(vec3(.48,.58,.67),vec3(.74,.82,.85),uDay),vAlpha*a*.19);
        #include <fog_fragment>
      }`
  });
  const spray=new THREE.Points(sprayGeo,m);sprayGeo.computeBoundingSphere();sprayGeo.boundingSphere.radius+=27;spray.renderOrder=3;root.add(spray);
  return {...uniform,height:upper-lower};
}
