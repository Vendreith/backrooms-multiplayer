import assert from 'node:assert/strict';
import { MovementAssist } from '../src/fps/movement.js';
import { tacticalProfile, tacticalSpeed, acceptProfileChange, TACTICAL_LIMITS, profileFromSettings, presentationSettings } from '../src/fps/profiles.js';
import { MovementGuard } from '../src/fps/network_movement.js';
import { CombatAuthority, makeLoadout, weaponAmmo } from '../src/fps/combat.js';
import { WeaponAnimation } from '../src/fps/animation.js';
import { relicSegment } from '../src/fps/flourishes.js';
import { WeaponSound } from '../src/fps/sound.js';
const results=[],measurements=[];const test=(name,fn)=>{fn();results.push(name);};
const profile=tacticalProfile(),input=overrides=>({grounded:true,jump:false,autoHop:false,crouch:false,canStand:true,canAct:true,sprint:true,sprintCap:4.35,speed:4.35,wx:0,wz:-1,wish:1,surface:'tile',water:false,...overrides});
test('tactical 30-second hops, diagonals and slow walk at 30/60/144 Hz',()=>{
 for(const hz of [30,60,144])for(const diagonal of [false,true])for(const shift of [false,true]){
  const m=new MovementAssist();m.configure(profile);let y=0,vy=0,max=0,cap=tacticalSpeed(profile,{shift});
  for(let f=0;f<hz*30;f++){const r=m.step(1/hz,input({grounded:y<=.001&&vy<=0,jump:true,autoHop:true,wx:diagonal?Math.SQRT1_2:0,wz:diagonal?-Math.SQRT1_2:-1,speed:cap,sprintCap:cap}));if(r.jumped)vy=profile.jumpImpulse;vy-=21/hz;y+=vy/hz;if(y<0){y=0;vy=0;}max=Math.max(max,Math.hypot(m.vx,m.vz));assert(m.hopBonus===0);assert(max<=cap+1e-9);}
  assert(max>cap-.01);assert(m.jumps>40);measurements.push({hz,diagonal,shift,max,cap,jumps:m.jumps});
 }
});
test('precise stop/reverse, no slide, no retained explorer momentum on switch',()=>{
 const m=new MovementAssist();m.vz=-7.85;m.hopBonus=.45;m.sliding=true;m.configure(profile);assert(!m.sliding&&m.hopBonus===0);m.step(1/60,input());assert(Math.hypot(m.vx,m.vz)<=4.35);
 for(let i=0;i<12;i++)m.step(1/60,input({wish:0}));assert(Math.hypot(m.vx,m.vz)<.01);
 m.vz=-4.35;for(let i=0;i<10;i++)m.step(1/60,input({wz:1}));assert(m.vz>4.0);
 assert(!m.step(1/60,input({crouch:true})).sliding);
 for(let i=0;i<100;i++){m.configure({key:'backrooms'});m.vz=-7.85;m.configure(profile);m.step(1/60,input());assert(Math.hypot(m.vx,m.vz)<=4.35+1e-9);}
});
test('host profile policy clamps config, rejects NaN/replay and cosmetic overrides',()=>{
 const p={role:'s',state:'ok'};assert(acceptProfileChange(p,{seq:1,profile:{key:'tactical',baseSpeed:999,allowSlide:true,hopBonus:99}}));assert.equal(p.movement.baseSpeed,TACTICAL_LIMITS.baseSpeed[1]);assert.equal(p.movement.hopBonus,0);assert.equal(p.movement.allowSlide,false);
 assert(!acceptProfileChange(p,{seq:1,profile:{key:'backrooms'}}));assert(!acceptProfileChange(p,{seq:2,profile:{key:'tactical',baseSpeed:NaN}}));assert(!acceptProfileChange(p,{seq:2,profile:{key:'tactical',baseSpeed:null}}));assert(acceptProfileChange(p,{seq:3,profile:{key:'backrooms'}}));assert.equal(p.movement.hopBonus,.45);
 assert.equal(profileFromSettings({movementProfile:'tactical'}).baseSpeed,4.35);assert.equal(presentationSettings({inspectKey:'KeyF'}).inspectKey,'KeyT');
});
test('host tactical input ignores bhop/slide flags and mode-switch budget banking',()=>{
 const guard=new MovementGuard(),p={x:0,y:0,z:0,spd:4.35,movement:profile};
 const options=now=>({now,cap:4.35,floorAt:()=>0,canStand:()=>true,resolve:(x,z)=>[x,z]});
 for(let i=0;i<2000;i++){const t=i/1000;guard.accept(p,{x:10000,z:10000,y:0,yaw:0,pitch:0,bhop:true,sliding:true,crouch:false},options(t));assert(!p.sliding);assert(p.spd<=4.35001);if(i%100===0){p.movement={key:'backrooms'};guard.accept(p,{x:p.x,z:p.z,y:0,yaw:0,pitch:0},options(t));p.movement=profile;}}
 assert(Math.hypot(p.x,p.z)<8.95);
});
test('revolver six rounds, empty/tactical reload times, no pistol ammo corruption',()=>{
 let time=0;const events=[],p={id:'P',role:'s',state:'ok',levelId:'level37',x:0,y:0,z:0,yaw:0,pitch:0,weapon:makeLoadout()},host=new CombatAuthority({now:()=>time,emit:e=>events.push(e),trace:()=>null,targets:()=>[],peaceful:()=>true});let seq=0;
 const act=(act,extra={})=>host.action(p,{act,seq:++seq,...extra});assert(act('weaponEquip',{weapon:'relic'}));time=1;
 for(let i=0;i<6;i++){assert(act('weaponFire',{yaw:0,pitch:0,mag:999}));time+=.5;}
 assert.equal(p.weapon.relicMag,0);assert.equal(p.weapon.mag,7);assert.equal(p.weapon.cylinderIndex,0);assert(!act('weaponFire',{yaw:0,pitch:0}));
 assert(act('weaponReload'));assert.equal(p.weapon.reloadRemaining,3.1);time+=3.0;host.tick(p);assert.equal(p.weapon.relicMag,0);time+=.11;host.tick(p);assert.deepEqual(weaponAmmo(p.weapon),{mag:6,reserve:24});
 assert(act('weaponFire',{yaw:0,pitch:0}));time+=.5;assert(act('weaponReload'));assert.equal(p.weapon.reloadRemaining,2.65);assert(act('weaponEquip',{weapon:'butterfly'}));time+=4;host.tick(p);assert.equal(p.weapon.relicMag,5);assert.equal(p.weapon.relicReserve,24);
});
test('revolver flourish segmentation, hold/release, single preference, interruption',()=>{
 const cues=[],a=new WeaponAnimation(k=>cues.push(k));a.equip('relic');for(let i=0;i<90;i++)a.update(1/60);a.inspect(true);
 const segments=new Set();for(let i=0;i<1500;i++){const p=a.update(1/60,true);segments.add(relicSegment(a.cycle).name);assert(Object.values(p).every(Number.isFinite));}assert.equal(segments.size,4);assert(cues.includes('relic_open')&&cues.includes('relic_twirl'));
 a.inspect(false);for(let i=0;i<150;i++)a.update(1/60);assert.equal(a.state,'IDLE');a.allowLoop=false;a.inspect(true);for(let i=0;i<180;i++)a.update(1/60);assert.equal(a.state,'IDLE');assert.equal(a.cycle,0);
 a.allowLoop=true;a.inspect(false);a.inspect(true);a.update(.4);assert(a.attack());assert.equal(a.state,'FIRING');a.update(.1);assert.equal(a.state,'RECOIL');assert(a.reload(true));assert.equal(a.reloadDuration,3.1);assert(!a.attack());
});
test('two distinct knife slashes and equip/recovery interruption',()=>{
 const a=new WeaponAnimation();a.equip('butterfly');for(let i=0;i<90;i++)a.update(1/60);a.attack();let first;for(let i=0;i<12;i++)first={...a.update(1/60)};for(let i=0;i<60;i++)a.update(1/60);a.attack();let second;for(let i=0;i<12;i++)second={...a.update(1/60)};assert(first.rz*second.rz<0);assert(first.x*second.x<0);a.equip('relic');for(let i=0;i<100;i++)a.update(1/60);assert.equal(a.state,'IDLE');
});
test('all original audio PCM is finite and unclipped',()=>{
 const audio={ctx:{sampleRate:48000,createBuffer(ch,len,rate){const d=new Float32Array(len);return{duration:len/rate,getChannelData:()=>d};}}},s=new WeaponSound(audio);s.prewarm();
 assert(s.buffers.size>=19);for(const[key,b]of s.buffers){const d=b.getChannelData(0);let peak=0,energy=0;for(const sample of d){assert(Number.isFinite(sample));peak=Math.max(peak,Math.abs(sample));energy+=sample*sample;}assert(peak<=1.0&&energy>0,key);}
});
console.log(JSON.stringify({passed:results.length,results,measurements},null,2));
