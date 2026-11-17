import assert from 'node:assert/strict';
import {buildClassicLayout,ClassicIndex,classicPitAt,segmentHitsBox} from '../src/levels/classic_layout.js';
import {sampleClassicLight} from '../src/levels/classic_world.js';
import {respawnPitPlayer} from '../src/levels/classic_respawn.js';
import {HumanCamera,boundedLocomotion} from '../src/fps/camera_motion.js';
import {MovementGuard} from '../src/fps/network_movement.js';
const results=[];function test(name,fn){fn();results.push(name);}
test('deterministic compact 150m district; graph connected for three independent seeds',()=>{
  for(const seed of[2026,1337,91671]){const c=buildClassicLayout(seed),again=buildClassicLayout(seed);assert.equal(c.x1-c.x0,150);assert.equal(c.z1-c.z0,150);assert.equal(JSON.stringify(c.rooms),JSON.stringify(again.rooms));assert(c.props.length>=100);assert(new Set(c.props.map(p=>p.type)).size>=30);const q=[c.spawnId],seen=new Set(q);for(let i=0;i<q.length;i++)for(const b of c.adj[q[i]])if(!seen.has(b)){seen.add(b);q.push(b);}assert.equal(seen.size,576);assert(c.stats.cycles>50);const idx=new ClassicIndex(c.walls);for(const d of c.doors){const blocked=idx.near(d.x,d.z,.36).some(b=>{const dx=d.x-Math.max(b.x0,Math.min(d.x,b.x1)),dz=d.z-Math.max(b.z0,Math.min(d.z,b.z1));return dx*dx+dz*dz<.36**2;});assert(!blocked,'blocked portal '+JSON.stringify(d));}}
});
test('exact occlusion blocks a thin wall, and a genuinely unlit cell has no ambient lift',()=>{
  assert(segmentHitsBox(0,0,4,0,{x0:1.999,x1:2.001,z0:-2,z1:2}));
  const light={x:4,y:2.86,z:0,gain:1,x0:4,x1:4,z0:0,z1:0},wall={x0:1.9,x1:2.1,z0:-4,z1:4,y0:0,y1:2.9};
  const c={wallIndex:new ClassicIndex([]),lightIndex:new ClassicIndex([light])};const lit=sampleClassicLight(c,0,0,0);c.wallIndex=new ClassicIndex([wall]);const dark=sampleClassicLight(c,0,0,0);assert(lit>dark*20);assert(dark<.01);
});
test('three idle presets are perceptibly different and bounded across a minute; locomotion independent',()=>{
  const ranges=[];for(const mode of['subtle','natural','footage']){const c=new HumanCamera();let min=9,max=-9;for(let i=0;i<3600;i++){const o=c.update(1/60,{mode});if(i>180){min=Math.min(min,o.y);max=Math.max(max,o.y);}assert(Math.abs(o.pitch)<.012);assert(Math.abs(o.roll)<.012);assert(Math.abs(o.x)<.037);}ranges.push(max-min);}
  assert(ranges[0]>.007&&ranges[0]<.015);assert(ranges[1]>ranges[0]*2.5);assert(ranges[2]>ranges[1]*1.8);
  assert(Object.values(boundedLocomotion({x:1,y:-1,pitch:1,roll:1},0)).every(v=>v===0));const strong=boundedLocomotion({x:1,y:-1,pitch:1,roll:1},2);assert(strong.x<=.24&&strong.y>=-.35&&strong.roll<=.13&&strong.pitch<=.11);
});
test('pit bridge cannot snap a falling player up from under the deck; respawn changes only that player',()=>{
  const c=buildClassicLayout(2026),p=c.pits[1],x=(p.x0+p.x1)/2,z=(p.z0+p.z1)/2;assert(!classicPitAt(c,x,z,0));assert(classicPitAt(c,x,z,-5));
  const a={id:'a',role:'s',levelId:'level0',state:'ok',x:(c.pits[0].x0+c.pits[0].x1)/2,z:(c.pits[0].z0+c.pits[0].z1)/2,y:-20,inv:{water:3},weapon:{mag:4,reserve:29,reloadEnd:9}},b={id:'b',x:30,y:0,z:40};const before=JSON.stringify(b);const ev=respawnPitPlayer(a,{classic:c,SPAWN:c.spawn},1000);assert(ev&&a.y===0&&a.vy===0&&!a.sliding&&!a.crouch);assert.equal(a.inv.water,3);assert.equal(a.weapon.mag,4);assert.equal(a.weapon.reserve,29);assert.equal(JSON.stringify(b),before);assert(!respawnPitPlayer(a,{classic:c,SPAWN:c.spawn},1001));
});
test('host shaft gravity ignores forged upward and downward positions',()=>{
  for(const forged of[-1000,1000]){const g=new MovementGuard(),p={x:0,y:0,z:0,vy:0,spd:0,movement:{key:'tactical'}};for(let i=0;i<60;i++)g.accept(p,{x:0,y:forged,z:0,yaw:0,pitch:0},{now:i/60,cap:4.35,floorAt:()=>-32,abyssAt:()=>true,canStand:()=>true,resolve:(x,z)=>[x,z]});assert(p.y< -9&&p.y> -13);assert(p.vy< -19&&p.vy> -24);}
});
test('host shaft gravity continues without client packets',()=>{
  const g=new MovementGuard(),p={x:0,y:0,z:0,vy:0,movement:{key:'tactical'}};for(let i=0;i<90;i++)g.advanceEnvironment(p,{now:i/60,dt:1/60,floorAt:()=>-32,abyssAt:()=>true});assert(p.y< -20&&p.vy< -30);
});
test('human entity role also recovers from a pit, without resetting AI agents',()=>{
  const c=buildClassicLayout(2026),pit=c.pits[0],p={id:'human_entity',role:'k',isAI:false,state:'ok',levelId:'level0',x:(pit.x0+pit.x1)/2,z:(pit.z0+pit.z1)/2,y:-20,swingT:1};assert(respawnPitPlayer(p,{classic:c,SPAWN:c.spawn},1));assert.equal(p.role,'k');assert.equal(p.swingT,0);const ai={...p,isAI:true,y:-20,x:(pit.x0+pit.x1)/2,z:(pit.z0+pit.z1)/2};assert(!respawnPitPlayer(ai,{classic:c,SPAWN:c.spawn},1));
});
console.log(JSON.stringify({passed:results.length,results},null,2));
