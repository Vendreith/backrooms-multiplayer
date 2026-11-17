/* Copyright (c) 2026 Vendreith. Bounded, sample-rate-aware multi-band handheld motion. */
const TAU=Math.PI*2,rad=d=>d*Math.PI/180;
export const HANDHELD_PROFILES=Object.freeze({off:{angle:0,pos:0,drift:0,grip:0},subtle:{angle:rad(.014),pos:.00025,drift:.00012,grip:.0001},natural:{angle:rad(.045),pos:.0008,drift:.00105,grip:.0004},footage:{angle:rad(.085),pos:.0014,drift:.0024,grip:.0009}});
const damp=(a,b,k,dt)=>b+(a-b)*Math.exp(-k*dt),clamp=(v,n)=>Math.max(-n,Math.min(n,v));
const smooth=(a,b,x)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t);};
const hash=n=>{const v=Math.sin(n*127.1+31.7)*43758.5453;return v-Math.floor(v);};
export class HandheldCamera {
 constructor(){this.reset();}
 reset(){this.time=0;this.sampleDt=1/60;this.weight=0;this.fineWeight=0;this.gripIndex=0;this.nextGrip=9.7;this.gripStart=-10;this.gripSign=1;this.out={x:0,y:0,z:0,pitch:0,yaw:0,roll:0,fine:{x:0,y:0,z:0,pitch:0,yaw:0,roll:0},cutoffHz:27};this.profile={angle:0,pos:0,drift:0,grip:0};}
 update(dt,{mode='natural',intensity=1,reduced=false,ads=0,inspect=false}={}){
  dt=Math.max(.001,Math.min(.15,dt));this.time+=dt;this.sampleDt=damp(this.sampleDt,dt,3,dt);const t=this.time,target=HANDHELD_PROFILES[mode]||HANDHELD_PROFILES.natural;
  for(const k in this.profile)this.profile[k]=damp(this.profile[k],target[k],5,dt);
  this.weight=damp(this.weight,reduced?0:(1-.975*ads)*(inspect?.38:1),10,dt);
  this.fineWeight=damp(this.fineWeight,Math.max(0,Math.min(3,Number(intensity)||0)),12,dt);
  const fps=Math.min(1/dt,1/this.sampleDt),cutoff=fps*.45,p=this.profile,w=this.weight;
  const oscillator=(f,phase)=>{const antiAlias=1-smooth(fps*.28,cutoff,f),shutter=Math.sin(Math.PI*f*dt)/(Math.PI*f*dt);return Math.sin(TAU*f*t+phase+.12*Math.sin(t*.37+phase))*antiAlias*shutter;};
  const fallback=(1-smooth(20,32,fps))*.22;
  const band=phase=>.5*oscillator(7.1,phase)+.31*oscillator(8.7,phase+1.3)+.19*oscillator(10.6,phase+3.7)+fallback*(.65*oscillator(3.1,phase+.8)+.35*oscillator(4.3,phase+2.2));
  const f=this.fineWeight*w,limit=(v,max)=>max*Math.tanh(v/max),fine={x:limit(band(.1)*p.pos*f,.0025),y:limit(band(2.7)*p.pos*f,.0025),z:limit(band(4.9)*p.pos*.45*f,.0012),pitch:limit(band(.8)*p.angle*f,rad(.15)),yaw:limit(band(3.2)*p.angle*.72*f,rad(.12)),roll:limit(band(5.4)*p.angle*.55*f,rad(.1))};
  // A sudden FPS/control change cannot jump the fine rig by an arbitrary amount.
  for(const k in fine){const speed=['x','y','z'].includes(k)?.09:rad(10),previous=this.out.fine[k];fine[k]=previous+clamp(fine[k]-previous,speed*dt);}
  while(t>=this.nextGrip){this.gripStart=this.nextGrip;this.gripIndex++;this.gripSign=hash(this.gripIndex*13)>.5?1:-1;this.nextGrip+=11+hash(this.gripIndex*19)*17;}
  const age=t-this.gripStart,grip=age>=0&&age<1.15?Math.sin(Math.PI*age/1.15)**2*this.gripSign:0;
  const drift=(Math.sin(TAU*.73*t+.4*Math.sin(t*.19))*.65+Math.sin(TAU*1.37*t+1.7)*.35)*p.drift*w;
  Object.assign(this.out,{x:fine.x+drift*.6,y:fine.y+drift*.35,z:fine.z,pitch:fine.pitch+drift*.75+grip*p.grip*w,yaw:fine.yaw+drift*.45,roll:fine.roll+drift*.5-grip*p.grip*.5*w,fine,drift,grip:grip*p.grip*w,cutoffHz:cutoff,mode});return this.out;
 }
}
