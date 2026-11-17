import {mkdirSync as createCheckDirectory} from 'node:fs';
createCheckDirectory('output/checks/poolrooms/v5',{recursive:true});
createCheckDirectory('output/checks/poolrooms/architectural_breakdown',{recursive:true});
import {writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {POOL_ZONE_DEFS} from '../src/levels/poolrooms_zones.js';
import {buildPoolroomsV4World} from '../src/levels/poolrooms_v4_world.js';
import {POOL_SKY_PROFILES,POOL_SKY_ACTIVE,isWindowRay} from '../src/levels/poolrooms_windows.js';
const build=seed=>{const lists=Object.fromEntries(['RECTS','WALLS','WATER_RECTS','PLATFORMS','RAMPS','SLIDES','PROPS','ANIM_PROPS','LIGHTS'].map(k=>[k,[]]));return {...lists,...buildPoolroomsV4World({...lists,seed,zones:POOL_ZONE_DEFS.map(z=>({...z,bounds:{...z.bounds}}))})};};
const errors=[],seeds=[];
for(const seed of[2026,1,42]){
 const map=build(seed);
 for(const w of map.POOL_SKY_WINDOWS){
  const c=map.POOL_CELLS.find(c=>c.id===w.cellId),vertical=w.side!=='roof';
  if(![w.x,w.y,w.z,w.width,w.height].every(Number.isFinite)||Math.min(w.width,w.height)<=0)errors.push(w.id+': invalid dimensions');
  if(vertical&&(w.y-w.height/2<c.floorY||w.y+w.height/2+w.rim>c.floorY+c.ceiling+.01))errors.push(w.id+': incompatible ceiling');
  if(!map.RECTS.some(b=>b.skyWindowId===w.id))errors.push(w.id+': missing sealed collision');
  if(!map.POOL_ARCH.some(a=>a.kind==='sky_frame'&&a.id===w.id))errors.push(w.id+': missing thick frame');
  if(!vertical&&!map.POOL_ARCH.some(a=>a.kind==='sky_ceiling'&&a.holes.some(h=>h.id===w.id)))errors.push(w.id+': missing actual roof cut');
  const origin={x:w.x,y:w.y,z:w.z},dir={x:0,y:0,z:0},axis=w.side==='roof'?'y':w.side==='e'?'x':'z';origin[axis]-=2;dir[axis]=1;
  if(!isWindowRay(w,origin,dir,3))errors.push(w.id+': centre ray disagrees with opening');
  origin[w.side==='e'?'z':'x']+=w.width;
  if(isWindowRay(w,origin,dir,3))errors.push(w.id+': exterior ray classified as a window');
 }
 seeds.push({seed,zones:map.POOL_ZONES.length,skyZones:new Set(map.POOL_SKY_WINDOWS.map(w=>w.zoneId)).size,windows:map.POOL_SKY_WINDOWS.length});
}
const a=build(2026),b=build(2026),digest=m=>createHash('sha256').update(JSON.stringify({windows:m.POOL_SKY_WINDOWS,props:m.POOL_DECOR})).digest('hex'),deterministic=digest(a)===digest(b);
if(!deterministic)errors.push('same-seed window/prop generation differs');
const report={passed:!errors.length,errors,seeds,deterministic,hash:digest(a),activeZones:[...POOL_SKY_ACTIVE],enclosedZones:40-POOL_SKY_ACTIVE.size,windowTypes:[...new Set(a.POOL_SKY_WINDOWS.map(w=>w.type))],libraryTypes:[...new Set(Object.values(POOL_SKY_PROFILES).flatMap(p=>p.windows.map(w=>w.type)))],windows:a.POOL_SKY_WINDOWS.map(w=>({id:w.id,type:w.type,shape:w.shape,side:w.side,width:w.width,height:w.height,bottom:w.bottom}))};
writeFileSync('output/checks/poolrooms/v5/sky-audit.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));if(errors.length)process.exitCode=1;
