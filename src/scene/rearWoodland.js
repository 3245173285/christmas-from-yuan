import * as THREE from 'three';
import { WATER_LEVEL, mulberry32 } from '../utils/noise.js';
import { primitives as P, v3, standard, part, beam, bake } from './detailGeometry.js';

// A quiet, uninhabited winter woodland. South-side only: the fjord,
// village, waterfall and established hero meadow stay exactly as they are.
export function buildRearWoodland(world) {
  const surface=world.surface, g=new THREE.Group(), rand=mulberry32(281126);
  const wood=world.wood, dark=world.dark, snow=world.snow, stone=world.rock, lit=world.lit;
  const plank=standard('#8a6a50',{roughness:.96}), pale=standard('#c3c9c8',{roughness:.95});
  const trail=standard('#a29c92',{roughness:1});
  const BOARD_H=WATER_LEVEL+.64;

  function post(x,z,top,shaft=.10) {
    const bottom=surface(x,z)-.24;
    if(top<=bottom)return;
    part(g,P.box,wood,[x,(bottom+top)*.5,z],[shaft,top-bottom,shaft]);
  }
  function lantern(x,y,z,scale=1) {
    const w=.29*scale,h=.39*scale;
    part(g,P.box,dark,[x,y-.035*scale,z],[w+.06*scale,.08*scale,w+.06*scale]);
    part(g,P.box,lit,[x,y+h*.50,z],[w,h,w]);
    for(const sx of [-1,1])for(const sz of [-1,1])
      part(g,P.box,dark,[x+sx*w*.51,y+h*.5,z+sz*w*.51],[.035*scale,h+.035*scale,.035*scale]);
    const roof=new THREE.ConeGeometry(1,1,4,1);
    part(g,roof,dark,[x,y+h+.095*scale,z],[w*.89,.22*scale,w*.89],[0,Math.PI*.25,0]);
    part(g,P.box,snow,[x,y+h+.22*scale,z],[w*.45,.045*scale,w*.45]);
  }

  // Curving boardwalk: a walkable, snowy timber ribbon hugging the natural
  // far shore. Height follows rendered terrain; posts are embedded in the bank.
  const shore=[[9.8,40.5],[12,42.3],[16,44.0],[20.5,45.3],[25.5,45.8],[30.5,46.2],[34.2,45.2]];
  const curve=new THREE.CatmullRomCurve3(shore.map(([x,z])=>v3(x,0,z)),false,'centripetal');
  const n=Math.ceil(curve.getLength()/.27), width=1.65, samples=[], rail=[];
  for(let i=0;i<=n;i++){
    const t=i/n,p=curve.getPointAt(t),d=curve.getTangentAt(t),yaw=Math.atan2(d.x,d.z),side=v3(d.z,0,-d.x);
    const y=Math.max(surface(p.x,p.z)+.26,BOARD_H);
    samples.push([p.x,p.z]);
    part(g,P.box,i%5===0?wood:plank,[p.x,y,p.z],[width,.115,.255],[0,yaw,0]);
    if(i%9===0||i===n){
      for(const s of [-1,1])post(p.x+s*side.x*.64,p.z+s*side.z*.64,y,.15);
      // The lake-facing rail only; the forest edge remains open.
      const r=v3(p.x+side.x*.77,y+.76,p.z+side.z*.77);
      // A clear opening where the perpendicular jetty leaves the boardwalk.
      if(Math.abs(r.x-25.5)>1.18){
        post(r.x,r.z,r.y+.02,.12);rail.push(r);
        if(i%18===0)lantern(r.x,y+.77,r.z,.72);
      }
    }
    if(i%6===0)part(g,P.box,pale,[p.x+side.x*.52,y+.067,p.z+side.z*.52],[.32,.018,.20],[0,yaw,0]);
  }
  for(let i=1;i<rail.length;i++){
    const a=rail[i-1],b=rail[i];
    if(a.x<25.5&&b.x>25.5)continue;
    beam(g,a,b,.053,wood);
    beam(g,a.clone().add(v3(0,-.015,0)),b.clone().add(v3(0,-.015,0)),.018,snow);
    beam(g,a.clone().add(v3(0,-.40,0)),b.clone().add(v3(0,-.40,0)),.037,wood);
  }
  world.clearRoutes.push({samples,r:1.6});

  // A jetty reaching into the deep blue pond plus a little viewing platform.
  // No new water surface and no lights casting real-time shadows.
  const dockX=25.5, bankZ=45.8, endZ=37.25, dockY=Math.max(surface(dockX,bankZ)+.26,BOARD_H);
  const docks=34;
  for(let i=1;i<=docks;i++){
    const z=bankZ+(endZ-bankZ)*i/docks;
    part(g,P.box,i%6===0?wood:plank,[dockX,dockY,z],[1.87,.14,.238]);
    if(i%8===0||i===docks){
      for(const s of [-1,1])post(dockX+s*.79,z,dockY+.71,.14);
    }
  }
  for(const s of [-1,1]){
    const x=dockX+s*.79;
    beam(g,v3(x,dockY+.72,bankZ-.4),v3(x,dockY+.72,endZ),.055,wood);
    beam(g,v3(x,dockY+.72+.03,bankZ-.4),v3(x,dockY+.72+.03,endZ),.019,snow);
    post(x,bankZ-.4,dockY+.72,.14);
    lantern(x,dockY+.74,endZ,.85);
  }
  for(let k=0;k<10;k++){
    const z=endZ-.14-k*.255;
    part(g,P.box,plank,[dockX,dockY,z],[3.05,.15,.24]);
  }
  for(const sx of [-1,1]){
    post(dockX+sx*1.31,endZ-2.4,dockY+.73,.18);
    post(dockX+sx*1.31,endZ-.2,dockY+.73,.18);
    beam(g,v3(dockX+sx*1.31,dockY+.73,endZ-2.4),v3(dockX+sx*1.31,dockY+.73,endZ-.2),.06,wood);
  }
  beam(g,v3(dockX-1.31,dockY+.73,endZ-2.4),v3(dockX+1.31,dockY+.73,endZ-2.4),.055,wood);
  // A restrained row of shoreline stones, not another artificial wall.
  for(let i=0;i<13;i++){
    const t=(i+.4)/13,p=curve.getPointAt(t),d=curve.getTangentAt(t),x=p.x-d.z*(1.4+rand()*.7),z=p.z+d.x*(1.4+rand()*.7),h=surface(x,z);
    if(h<WATER_LEVEL-.26)continue;
    const a=.31+rand()*.52;
    part(g,P.rock,stone,[x,h-.035,z],[a,.35+rand()*.19,a*.84],[.2,rand()*6.28,.15]);
    part(g,P.rock,snow,[x-.02,h+.19,z],[a*.85,.15,a*.71],[.13,rand()*6.28,.1]);
  }

  // A small lantern-lined trail rises between the spruce groves, rather than
  // filling the meadow with buildings. Local masked clearing preserves all
  // seeded vegetation elsewhere.
  const route=[[10.1,40.8],[5,46.0],[-1,50.5],[-9,56.5],[-19,62],[-27,70.0],[-36,77.5],[-43.5,85.2]];
  const trailSamples=world.groundRibbon(route,1.65,.085,trail,.65);
  world.clearRoutes.push({samples:trailSamples,r:2.7});
  const trailCurve=new THREE.CatmullRomCurve3(route.map(([x,z])=>v3(x,0,z)),false,'centripetal');
  for(let i=0;i<9;i++){
    const t=.085+i*.105,p=trailCurve.getPointAt(t),d=trailCurve.getTangentAt(t),side=i%2===0?1:-1;
    const x=p.x+d.z*side*1.39,z=p.z-d.x*side*1.39,y=surface(x,z);
    part(g,P.box,stone,[x,y+.07,z],[.37,.22,.37]);
    part(g,P.box,wood,[x,y+.87,z],[.12,1.58,.12]);
    lantern(x,y+1.62,z,1.0);
    world.clearAreas.push({x,z,r:.48});
  }

  // Open Nordic timber lookout, set behind the lake on the opposite side
  // from the jetty. Lattice bracing and a snow-capped hipped roof keep the
  // skyline delicate; it has no enclosed rooms and is not a cabin.
  const tx=-43.5,tz=89.2,base=surface(tx,tz),tower=new THREE.Group();tower.position.set(tx,base,tz);tower.rotation.y=.18;g.add(tower);
  const h=11.55,foot=2.55,upper=1.73,deck=4.6;
  const leg=(sx,sz,y)=>v3(sx*THREE.MathUtils.lerp(foot,upper,y/h),y,sz*THREE.MathUtils.lerp(foot,upper,y/h));
  for(const sx of [-1,1])for(const sz of [-1,1]){
    const a=leg(sx,sz,0),b=leg(sx,sz,h+.25);
    part(tower,P.box,stone,[a.x,-.37,a.z],[.87,1.5,.87]);
    beam(tower,a.clone().add(v3(0,-.40,0)),b,.18,wood);
    beam(tower,v3(b.x,h,b.z),v3(b.x,h+2.62,b.z),.12,wood);
  }
  for(let level=0;level<3;level++){
    const a=level*h/3,b=(level+1)*h/3;
    for(const s of [-1,1]){
      for(const y of [a+.24,b-.18]){
        beam(tower,leg(-1,s,y),leg(1,s,y),.095,wood);
        beam(tower,leg(s,-1,y),leg(s,1,y),.095,wood);
      }
      beam(tower,leg(-1,s,a+.23),leg(1,s,b-.22),.078,wood);
      beam(tower,leg(1,s,a+.23),leg(-1,s,b-.22),.078,wood);
      beam(tower,leg(s,-1,a+.23),leg(s,1,b-.22),.077,wood);
      beam(tower,leg(s,1,a+.23),leg(s,-1,b-.22),.077,wood);
    }
    // Three flights of open stairs and alternating landings.
    const side=level%2===0?1:-1,x=side*.82,fromZ=level%2===0?-1.75:1.75,toZ=-fromZ,steps=19;
    for(let k=0;k<steps;k++){
      const q=(k+1)/steps,z=fromZ+(toZ-fromZ)*q,y=a+(b-a)*q;
      part(tower,P.box,plank,[x,y,z],[1.27,.14,.26]);
    }
    for(const sx of [-1,1]){
      const px=x+sx*.59;
      beam(tower,v3(px,a-.10,fromZ),v3(px,b-.10,toZ),.055,wood);
      beam(tower,v3(px,a+.78,fromZ),v3(px,b+.78,toZ),.039,wood);
    }
    if(level<2){
      part(tower,P.box,plank,[0,b,toZ],[3.25,.16,.78]);
      for(let n=0;n<6;n++)part(tower,P.box,snow,[n*.48-1.2,b+.085,toZ+.27],[.40,.025,.2]);
    }
  }
  // Floor planks around the stair aperture and finely spaced guard rails.
  for(let i=0;i<17;i++){
    const x=-deck*.5+(i+.5)*deck/17;
    if(x>.04&&x<1.55){
      part(tower,P.box,plank,[x,h,-2.01],[deck/17-.018,.18,.58]);
      part(tower,P.box,plank,[x,h,1.98],[deck/17-.018,.18,.64]);
    }else part(tower,P.box,plank,[x,h,0],[deck/17-.018,.18,deck]);
  }
  for(const s of [-1,1]){
    for(let i=0;i<=8;i++){
      const u=(i/8-.5)*deck;
      part(tower,P.box,wood,[s*deck*.48,h+.53,u],[.10,1.02,.10]);
      if(i<8)part(tower,P.box,wood,[u,h+.53,s*deck*.48],[.10,1.02,.10]);
    }
    if(s===1)for(const z of [-deck*.48,deck*.48]){
      part(tower,P.box,wood,[0,h+1.06,z],[deck,.12,.14]);
      part(tower,P.box,snow,[0,h+1.135,z],[deck,.035,.13]);
    }
    part(tower,P.box,wood,[s*deck*.48,h+1.06,0],[.14,.12,deck]);
    part(tower,P.box,snow,[s*deck*.48,h+1.135,0],[.13,.035,deck]);
    beam(tower,v3(-2.37,h+2.55,s*1.83),v3(2.37,h+2.55,s*1.83),.12,wood);
    beam(tower,v3(s*1.83,h+2.55,-2.37),v3(s*1.83,h+2.55,2.37),.12,wood);
  }
  const roofGeo=new THREE.ConeGeometry(1,1,4,1);
  part(tower,roofGeo,world.roof,[0,h+3.72,0],[3.84,2.35,3.84],[0,Math.PI*.25,0]);
  part(tower,roofGeo,snow,[0,h+3.85,0],[3.70,2.28,3.70],[0,Math.PI*.25,0]);
  part(tower,P.sphere,wood,[0,h+5.09,0],[.13,.17,.13]);
  // Four tiny amber corner lights, baked with the rest of the landscape.
  for(const sx of [-1,1])for(const sz of [-1,1]){
    part(tower,P.box,lit,[sx*1.68,h+2.25,sz*1.68],[.30,.40,.30]);
    part(tower,P.box,dark,[sx*1.68,h+2.48,sz*1.68],[.38,.09,.38]);
    part(tower,P.box,dark,[sx*1.68,h+2.02,sz*1.68],[.38,.09,.38]);
  }
  world.clearAreas.push({x:tx,z:tz,r:8.2},{x:-28,z:59,r:5.5},{x:-35,z:73,r:6.0});
  const merged=bake(g,{shadow:false,receive:false});
  merged.name='Rear woodland boardwalk, lantern trail and open lookout';
  world.group.add(merged);
}
