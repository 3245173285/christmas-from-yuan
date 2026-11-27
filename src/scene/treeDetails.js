import * as THREE from 'three';
import { mulberry32 } from '../utils/noise.js';
import { primitives as P, v3, standard, part, beam, tube, extrude, instanceTemplate, matrixAt } from './detailGeometry.js';

// Fine hand-made ornament collection. Every complete ornament is instanced by finish;
// the original ribbon, bells, fairy lights, gifts and interactive cards stay untouched.
export class TreeDetails {
  constructor(tree, radiusAtHeight) {
    this.tree = tree; this.radius = radiusAtHeight;
    this.group = new THREE.Group(); this.group.name = 'Luxury tree details'; tree.group.add(this.group);
    this.rand = mulberry32(4122026); this.time = { value: 0 };
    this.gold = this.sway(standard('#e9c16a',{ metalness:.9, roughness:.23, envMapIntensity:1.7, emissive: '#775117', emissiveIntensity:.16 }));
    this.velvet = this.sway(new THREE.MeshPhysicalMaterial({color:'#98162b',roughness:.75,sheen:1,sheenColor:new THREE.Color('#df7581'),sheenRoughness:.65,side:THREE.DoubleSide,emissive:'#3a0710',emissiveIntensity:.2}));
    this.pearl = standard('#f7e6c5',{ metalness:.36, roughness:.23, envMapIntensity:1.5 });
    this.crystal = this.sway(new THREE.MeshPhysicalMaterial({color:'#d3edf8',metalness:.2,roughness:.08,clearcoat:1,clearcoatRoughness:.05,iridescence:.28,iridescenceIOR:1.35,envMapIntensity:1.8,flatShading:true,emissive:'#173143',emissiveIntensity:.12}));
    this.pine = this.sway(standard('#6a4029',{roughness:.83}));
    this.cream = this.sway(standard('#f1e2c4',{roughness:.55}));
    this.red = this.sway(standard('#9a2637',{roughness:.4,metalness:.1,emissive:'#36080a',emissiveIntensity:.12}));
    this.dark = this.sway(standard('#252b2d',{roughness:.54}));
    this.occupied = [];
    for (const records of tree.ornamentBases.values()) for (const r of records) this.occupied.push({p:r.pos.clone(),r:.15*r.scale.x});
    // Keep clear of the high-visibility greeting-card positions and their swinging faces.
    for(let i=0;i<16;i++) {const s=tree.computeHangingCardSlot(i);this.occupied.push({p:v3(s.x,s.y-.43,s.z),r:.43});}
    this.build();
  }
  sway(mat) {
    mat.onBeforeCompile = shader => {
      shader.uniforms.uDetailTime = this.time;
      shader.vertexShader = shader.vertexShader.replace('#include <common>','#include <common>\nuniform float uDetailTime;');
      shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
        #ifdef USE_INSTANCING
        vec3 anchor = instanceMatrix[3].xyz;
        float wind = sin(uDetailTime*1.15 + anchor.x*1.1 + anchor.z*1.4 + anchor.y*.75)*.045;
        transformed.x += wind * max(0.03,-position.y);
        transformed.z += cos(uDetailTime*.88+anchor.y+anchor.z)*.027*max(.03,-position.y);
        #endif`);
    };
    mat.customProgramCacheKey = () => 'yuletide-detail-sway-v1'; return mat;
  }
  anchor(h,a,pad=.27) {
    const y = this.tree.skirtStartY+h*(this.tree.treeHeight-this.tree.skirtStartY-.35);
    const r = this.radius(h)*1.065+pad;
    return v3(Math.sin(a)*r,y,Math.cos(a)*r);
  }
  placements(count, size, minH, maxH, pad, centerY=0) {
    const matrices=[];
    // Stratified golden-angle candidates, choosing generous spacing at each height.
    for(let i=0;i<count;i++) {
      const h=minH+(maxH-minH)*(i+.5)/count;
      const start=i*2.399963+this.rand()*.4;
      let best=null, bestGap=-Infinity;
      const scale=(.84+.24*(1-h))*(.94+this.rand()*.12);
      for(let j=0;j<40;j++) {
        const a=start+j*2.399963, hh=THREE.MathUtils.clamp(h+(j%5-2)*.018,minH,maxH);
        const p=this.anchor(hh,a,pad), c=p.clone().add(v3(0,centerY*scale,0));
        let gap=Infinity;
        for(const q of this.occupied) gap=Math.min(gap,q.p.distanceTo(c)-q.r-size*scale);
        if(gap>bestGap){bestGap=gap;best={p,c,a,scale};}
      }
      if(bestGap<-.035) continue;
      this.occupied.push({p:best.c,r:size*scale});
      matrices.push(matrixAt(best.p.x,best.p.y,best.p.z,best.a,best.scale));
    }
    return matrices;
  }
  bow() {
    const g=new THREE.Group();
    // Curved silk loops and long fork-cut tails, real folded geometry and fine metal piping.
    const ribbon = (center, width, endFork=false) => {
      const pos=[],uv=[],idx=[],edges=[[],[]],steps=22,cols=6;
      for(let i=0;i<=steps;i++) {
        const t=i/steps,p=center(t),tangent=center(Math.min(1,t+.002)).sub(center(Math.max(0,t-.002))).normalize();
        const side=v3(-tangent.y,tangent.x,0).normalize();
        for(let k=0;k<=cols;k++) {
          const u=k/cols*2-1, point=p.clone().addScaledVector(side,u*width(t)*.5);
          point.z+=.028*Math.cos(u*Math.PI*1.5)*Math.sin(Math.PI*t)+.025*u*Math.sin(t*7);
          if(endFork) point.y+=.10*Math.pow(t,9)*(1-Math.abs(u));
          pos.push(...point.toArray());uv.push(k/cols,t);
          if(k===0) edges[0].push(point.clone());if(k===cols) edges[1].push(point.clone());
          if(i<steps&&k<cols){const a=i*(cols+1)+k;idx.push(a,a+cols+1,a+1,a+1,a+cols+1,a+cols+2);}
        }
      }
      const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geo.setIndex(idx);geo.computeVertexNormals();
      part(g,geo,this.velvet);edges.forEach(e=>tube(g,e,.009,this.gold,22,5));
    };
    for(const s of [-1,1]) {
      ribbon(t=>v3(s*.46*Math.sin(Math.PI*t),.12*Math.sin(Math.PI*t)+.13*Math.sin(Math.PI*2*t),.05+.16*Math.sin(Math.PI*t)),t=>.065+.20*Math.sin(Math.PI*t));
      ribbon(t=>v3(s*(.045+.19*t+.045*Math.sin(6*t)),-.045-.63*t,.065+.055*Math.sin(5*t)+.035*t),t=>.115+.043*t,true);
    }
    part(g,P.sphere,this.velvet,[0,0,.11],[.115,.10,.09]);
    part(g,P.ring,this.gold,[0,0,.12],[.094,.089,.6],[0,Math.PI/2,0]);
    return g;
  }
  icicle() {
    const g=new THREE.Group();
    beam(g,v3(0,0,-.12),v3(0,-.12,0),.009,this.gold);
    const geo=new THREE.LatheGeometry([[0,-.60],[.035,-.41],[.084,-.20],[.075,-.15],[.025,-.10],[0,-.10]].map(p=>new THREE.Vector2(...p)),6);
    part(g,geo,this.crystal);part(g,P.cylinder,this.gold,[0,-.12,0],[.062,.035,.062]);
    return g;
  }
  cone() {
    const g=new THREE.Group();
    const scaleGeo=new THREE.IcosahedronGeometry(1,0);
    beam(g,v3(0,0,-.09),v3(0,-.12,0),.009,this.gold);
    part(g,P.sphere,this.pine,[0,-.30,0],[.12,.22,.12]);
    for(let row=0;row<7;row++) for(let i=0;i<7;i++){
      const a=i*Math.PI*2/7+row*.52,r=.055+.105*Math.sin((row+.7)/8*Math.PI);
      part(g,scaleGeo,(row+i)%4===0?this.gold:this.pine,[Math.sin(a)*r,-.10-row*.055,Math.cos(a)*r],[.058,.048,.029],[.5,a,.08]);
    }
    return g;
  }
  vintage(type) {
    const g=new THREE.Group(),b=(mat,p,s,r)=>part(g,P.box,mat,p,s,r),s=(mat,p,sc)=>part(g,P.sphere,mat,p,sc),c=(mat,p,sc,r)=>part(g,P.cylinder,mat,p,sc,r);
    beam(g,v3(0,0,-.08),v3(0,-.10,0),.009,this.gold);
    if(type===0){ // classic nutcracker soldier
      c(this.dark,[0,-.15,0],[.075,.12,.075]);c(this.gold,[0,-.205,0],[.08,.025,.08]);s(this.cream,[0,-.27,0],[.065,.075,.06]);
      b(this.red,[0,-.41,0],[.16,.18,.10]);b(this.gold,[0,-.46,.058],[.16,.035,.018]);
      for(const side of [-1,1]){b(this.red,[side*.105,-.40,0],[.05,.16,.055]);s(this.cream,[side*.105,-.49,0],[.03,.03,.03]);b(this.dark,[side*.045,-.57,0],[.065,.15,.065]); b(this.gold,[side*.078,-.34,.02],[.063,.035,.11]);s(this.dark,[side*.023,-.255,.055],[.009,.009,.009]);}
      b(this.dark,[0,-.30,.055],[.061,.02,.01]);
    }else if(type===1){ // carved Nordic wooden rocking horse
      const body=extrude([[-.24,-.37],[-.16,-.22],[.05,-.24],[.10,-.14],[.18,-.12],[.24,-.18],[.17,-.27],[.19,-.44],[.12,-.48],[.08,-.35],[-.09,-.37],[-.14,-.49],[-.21,-.47]],.115,.018);
      part(g,body,this.red);b(this.gold,[-.03,-.29,.067],[.16,.055,.025],[0,0,.10]);s(this.dark,[.17,-.18,.066],[.012,.012,.012]);
      tube(g,[-.28,-.16,0,.16,.28].map(x=>v3(x,-.53+.20*x*x,0)),.022,this.gold,20);
      tube(g,[v3(-.22,-.26,0),v3(-.30,-.32,0),v3(-.27,-.43,0)],.026,this.gold,12);
    }else if(type===2){ // gilded angel
      part(g,P.cone,this.cream,[0,-.39,0],[.145,.36,.13]);s(this.cream,[0,-.18,0],[.066,.08,.06]);part(g,P.ring,this.gold,[0,-.09,0],[.079,.079,.6],[Math.PI/2,0,0]);
      for(const side of [-1,1]){const wing=extrude([[0,-.28],[side*.10,-.16],[side*.23,-.20],[side*.26,-.29],[side*.17,-.38],[side*.05,-.39]],.029,.014);part(g,wing,this.gold,[0,0,-.035]);}
      beam(g,v3(-.12,-.33,.035),v3(.01,-.30,.08),.026,this.cream);beam(g,v3(.12,-.33,.035),v3(-.01,-.30,.08),.026,this.cream);
    }else{ // enamel antique pocketwatch
      c(this.gold,[0,-.32,0],[.165,.06,.165],[Math.PI/2,0,0]);c(this.cream,[0,-.32,.036],[.139,.015,.139],[Math.PI/2,0,0]);
      for(let i=0;i<12;i++){let a=i*Math.PI/6;b(this.dark,[Math.sin(a)*.113,-.32+Math.cos(a)*.113,.048],[.009,.027,.004],[0,0,-a]);}
      beam(g,v3(0,-.32,.055),v3(.056,-.265,.055),.007,this.dark);beam(g,v3(0,-.32,.055),v3(-.071,-.27,.055),.005,this.gold);s(this.gold,[0,-.32,.06],[.014,.014,.01]);part(g,P.ring,this.gold,[0,-.14,0],[.04,.05,.8]);
    }
    return g;
  }
  build() {
    instanceTemplate(this.group,this.bow(),this.placements(15,.36,.135,.84,.34,-.15));
    for(let type=0;type<4;type++) instanceTemplate(this.group,this.vintage(type),this.placements(3,.22,.20+type*.04,.73,.29,-.30));
    instanceTemplate(this.group,this.icicle(),this.placements(29,.145,.10,.87,.30,-.31));
    instanceTemplate(this.group,this.cone(),this.placements(19,.17,.09,.88,.28,-.28));
    // A handful of delicate scalloped pearl-and-gold swags, rather than another solid ribbon.
    const beadGeo=new THREE.SphereGeometry(1,10,6);
    const pearlG=new THREE.Group(), pearlMatrices=[];part(pearlG,beadGeo,this.pearl,[0,0,0],[.047,.047,.047]);
    const goldG=new THREE.Group(),goldMatrices=[];part(goldG,beadGeo,this.gold,[0,0,0],[.034,.034,.034]);
    const threads=new THREE.Group();
    for(let row=0;row<3;row++)for(let j=0;j<6;j++){
      let pts=[],start=j*Math.PI/3+row*.43+.10;
      const h=.21+row*.21;
      for(let k=0;k<=20;k++){
        let t=k/20,a=start+t*.61;
        const p=this.anchor(h-.029*Math.sin(t*Math.PI),a,.25); pts.push(p);
      }
      // Reserve visible clearance from the principal card slots and the larger new pieces.
      if(pts.some(p=>this.occupied.some(q=>q.r>.29&&q.p.distanceTo(p)<q.r+.08)))continue;
      tube(threads,pts,.013,this.pearl,20,5);
      const curve=new THREE.CatmullRomCurve3(pts),n=Math.max(8,Math.floor(curve.getLength()/.14));
      for(let k=0;k<=n;k++){const p=curve.getPointAt(k/n);(k%3===0?goldMatrices:pearlMatrices).push(matrixAt(p.x,p.y,p.z,0,.92+this.rand()*.18));}
    }
    instanceTemplate(this.group,pearlG,pearlMatrices);instanceTemplate(this.group,goldG,goldMatrices);
    // Same finish; combine all thin connecting strings into one draw call.
    instanceTemplate(this.group,threads,[new THREE.Matrix4()]);
  }
  update(t,dayState){this.time.value=t;this.gold.emissiveIntensity=.08+.18*dayState.treeLightFactor;this.crystal.emissiveIntensity=.05+.10*dayState.treeLightFactor;}
}

