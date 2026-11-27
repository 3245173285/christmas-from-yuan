/** A localized erosion-cut in the existing northern massif, retaining the
 * original terrain everywhere outside the waterfall's watershed. */
export const ALPINE_FALL = Object.freeze({x:184,z:-341,headY:109,footY:55});
const clamp=v=>Math.max(0,Math.min(1,v));
const smooth=(a,b,v)=>{const q=clamp((v-a)/(b-a));return q*q*(3-2*q);};
export function lipZ(x){
  const dx=x-ALPINE_FALL.x;
  return ALPINE_FALL.z+.8*Math.sin(dx*.23)+1.1*Math.sin(dx*.091)+.033*dx;
}
export function sculptAlpineFall(x,z,height){
  const dx=x-ALPINE_FALL.x;
  if(Math.abs(dx)>36||z<ALPINE_FALL.z-37||z>ALPINE_FALL.z+52)return height;
  const dz=z-lipZ(x);
  const relief=2.2*Math.sin(dx*.29)+1.3*Math.sin(dx*.61+1.2);
  const taper=1-smooth(9,33,Math.abs(dx+.9*Math.sin(dz*.15)));
  const zone=taper*smooth(-32,-11,dz)*(1-smooth(24,45,dz));
  if(zone<=0)return height;
  const top=ALPINE_FALL.headY+relief*.84+Math.max(0,-dz-7)*.26;
  const bottom=ALPINE_FALL.footY+relief*.49-Math.max(0,dz-5)*.37;
  const face=1-smooth(-5.1,5.7,dz);
  const target=bottom+(top-bottom)*face;
  return height+(target-height)*zone;
}
