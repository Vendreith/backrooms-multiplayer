/* Copyright (c) 2026 Vendreith. Original procedural camera animation. */
export const IDLE_PROFILES=Object.freeze({off:{y:0,x:0,pitch:0,roll:0,drift:0},subtle:{y:.006,x:.0025,pitch:.001,roll:.0008,drift:.00015},natural:{y:.022,x:.012,pitch:.0045,roll:.0037,drift:.0023},footage:{y:.044,x:.026,pitch:.009,roll:.0075,drift:.007}});
const damp = (a, b, k, dt) => b + (a - b) * Math.exp(-k * dt);
export class HumanCamera {
  constructor(){this.reset();}
  reset(){this.time=this.idle=this.weight=0;this.profile={y:0,x:0,pitch:0,roll:0,drift:0};this.out={x:0,y:0,pitch:0,roll:0,breath:0,weight:0,breathing:0,sway:0};}
  update(dt,{speed=0,crouch=false,ads=0,mode='natural',reduced=false,inspect=false,intensity=1,grounded=true}={}){
    dt=Math.min(.1,Math.max(0,dt));this.time+=dt;this.idle=speed<.15?this.idle+dt:0;
    const target=IDLE_PROFILES[mode]||IDLE_PROFILES.natural;
    for(const key in this.profile)this.profile[key]=damp(this.profile[key],target[key],4,dt);
    // Idle motion is independent from the locomotion slider and never accumulates into base look.
    const gate=reduced||!grounded?0:Math.exp(-speed*1.8)*(crouch?.65:1)*(1-.94*ads)*(inspect?.65:1)*intensity;
    this.weight=damp(this.weight,gate,4,dt);const t=this.time,w=this.weight,p=this.profile;
    const phase=t*1.42+.16*Math.sin(t*.17),breath=.86*Math.sin(phase)+.14*Math.sin(phase*2-.4);
    const posture=Math.sin(t*.31+1.8)*Math.sin(t*.13)**2;
    const breathing=w*p.y*breath,sway=w*(p.x*(.74*Math.sin(t*.51)+.26*Math.sin(t*.89+2))+p.drift*posture);
    Object.assign(this.out,{x:sway,y:breathing+w*p.drift*.45*Math.sin(t*.63),pitch:w*(p.pitch*breath+p.drift*.24*posture),roll:w*(p.roll*Math.sin(t*.57+1)+p.drift*.2*posture),breath:breath*w,weight:w,breathing,sway,mode});return this.out;
  }
}
export function boundedLocomotion({x=0,y=0,z=0,pitch=0,roll=0},intensity=1){const scale=Math.max(0,Math.min(3,Number.isFinite(intensity)?intensity:1));const limit=(v,max)=>max*Math.tanh(v/max);return{x:limit(x*scale,.24),y:limit(y*scale,.35),z:limit(z*scale,.05),pitch:limit(pitch*scale,.055),roll:limit(roll*scale,.07),scale};}
