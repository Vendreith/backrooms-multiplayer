/* Copyright (c) 2026 Vendreith. Original performance choreography; no captured animation. */
const TAU=Math.PI*2, clamp=u=>Math.max(0,Math.min(1,u)), ease=u=>{u=clamp(u);return u*u*u*(u*(u*6-15)+10);};
function c(u,frames){for(let i=1;i<frames.length;i++){const[a,x]=frames[i-1],[b,y]=frames[i];if(u<=b)return x+(y-x)*ease((u-a)/(b-a));}return frames.at(-1)[1];}
export const RELIC_FLOURISHES=Object.freeze([
 {name:'Surveyor presentation',duration:1.9}, {name:'Guard-pivot twirl',duration:1.55},
 {name:'Chamber presentation',duration:1.85}, {name:'Reverse twirl and settle',duration:1.65}
]);
const ORDER=[0,1,2,3,1,0,3,2];
export function relicSegment(cycle){return RELIC_FLOURISHES[ORDER[cycle%ORDER.length]];}
export function sampleRelic(a,p){
 const age=a.age,state=a.state;
 if(state==='EQUIPPING'){
  const u=age/.72,v=1-ease(u);p.x=.07*v;p.y=-.23*v;p.z=.10*v;p.rx=-.45*v;p.rz=-.4*v;
  p.hammer=c(u,[[0,.45],[.40,.45],[.64,0],[1,0]]);
  a.markers(u,[[.32,'relic_draw'],[.62,'relic_cock']]);
 }else if(state==='FIRING'||state==='RECOIL'){
  const t=age+(state==='RECOIL'?.095:0),kick=Math.sin(Math.min(1,t/.033)*Math.PI/2)*Math.exp(-t*12.5);
  p.rx=.36*kick;p.ry=-.024*kick;p.z=.062*kick;p.y=.005*kick;p.hammer=Math.exp(-t*45);
 }else if(state==='RELOADING'){
  const u=age/a.reloadDuration;
  p.x=c(u,[[0,0],[.16,-.050],[.78,-.050],[1,0]]);p.y=c(u,[[0,0],[.18,.045],[.82,.045],[1,0]]);
  p.ry=c(u,[[0,0],[.19,-.52],[.77,-.52],[1,0]]);p.rz=c(u,[[0,0],[.19,-.24],[.77,-.24],[1,0]]);p.rx=c(u,[[0,0],[.17,.10],[.43,.29],[.68,.10],[1,0]]);
  p.cylinderOpen=c(u,[[0,0],[.10,0],[.22,1],[.79,1],[.92,0],[1,0]]);
  p.eject=c(u,[[0,0],[.27,0],[.35,1],[.47,1],[.53,0],[1,0]]);
  p.loader=c(u,[[0,0],[.44,0],[.57,1],[.67,1],[.78,0],[1,0]]);
  p.left=c(u,[[0,0],[.13,1],[.81,1],[1,0]]);
  p.visualLoaded=u>.66?1:0;
  a.markers(u,[[.14,'relic_open'],[.32,'relic_eject'],[.59,'relic_loader'],[.69,'relic_seat'],[.89,'relic_close'],[.97,'cloth']]);
 }else if(state==='INSPECTING'||state==='FLEX_LOOP'){
  const segment=ORDER[a.cycle%ORDER.length],u=age/relicSegment(a.cycle).duration,e=Math.sin(Math.PI*clamp(u))**2;
  p.x=-.055*e;p.y=.052*e;p.z=-.025*e;
  if(segment===0){
   p.ry=c(u,[[0,0],[.28,-.73],[.60,-.73],[.82,.16],[1,0]]);p.rx=-.09*e;p.rz=.19*e;p.left=.75*e;
   a.markers(u,[[.16,'cloth'],[.72,'relic_touch']]);
  }else if(segment===1||segment===3){
   p.ry=(segment===1?-.14:.16)*e;p.rx=.09*e;p.rz=(segment===1?.06:-.09)*e;
   p.spin=c(u,[[0,0],[.17,0],[.72,(segment===1?1:-1)*TAU],[1,(segment===1?1:-1)*TAU]]);
   p.spinContact=c(u,[[0,0],[.14,1],[.75,1],[1,0]]);p.grip=1-.68*p.spinContact;p.left=e;
   a.markers(u,[[.18,'cloth'],[.37,'relic_twirl'],[.76,'relic_catch']]);
  }else{
   p.ry=-.40*e;p.rz=.24*e;p.rx=-.10*e;
   p.cylinderOpen=c(u,[[0,0],[.18,0],[.32,1],[.65,1],[.84,0],[1,0]]);
   p.cylinderSpin=c(u,[[0,0],[.36,0],[.62,TAU],[1,TAU]]);p.left=.65*e;
   a.markers(u,[[.26,'relic_open'],[.46,'relic_spin'],[.79,'relic_close']]);
  }
 }
}
export function sampleKnifePolish(a,p){
 const state=a.state;
 if(state==='ATTACKING'){
  const u=clamp(a.age/.48),side=a.attackSide?-1:1;
  const v=c(u,[[0,0],[.16,.12],[.39,1],[.63,.84],[1,0]]);
  p.x=-side*.16*v;p.y=(a.attackSide?-.035:.06)*v;p.z=-.13*v;p.rx=(a.attackSide?.42:-.45)*v;p.ry=-side*.65*v;p.rz=side*1.02*v;
 }else if(state==='INSPECTING'||state==='FLEX_LOOP'){
  const u=a.age/1.32,e=Math.sin(Math.PI*clamp(u))**2;
  // Secondary wrist compensation and grip breathing prevent a perfectly rigid robotic trick.
  p.ry+=.10*Math.sin(u*TAU)*e;p.x+=.008*Math.sin(u*TAU)*e;
 }
}
