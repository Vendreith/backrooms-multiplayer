import * as THREE from '../node_modules/three/build/three.module.js';
import {mkdirSync,writeFileSync} from 'node:fs';
import {POOL_ZONE_DEFS} from '../src/levels/poolrooms_zones.js';
import {buildPoolroomsV4World} from '../src/levels/poolrooms_v4_world.js';
const lists=Object.fromEntries(['RECTS','WALLS','WATER_RECTS','PLATFORMS','RAMPS','SLIDES','PROPS','ANIM_PROPS','LIGHTS'].map(k=>[k,[]]));
const map={...lists,...buildPoolroomsV4World({...lists,zones:POOL_ZONE_DEFS.map(z=>({...z,bounds:{...z.bounds}}))})};
const errors=[],clearances=[],chutes=[];
for(const zoneId of new Set(map.POOL_WATERPARK.map(a=>a.zoneId))){
 const sweeps=map.POOL_WATERPARK.filter(a=>a.zoneId===zoneId).map(a=>({a,points:Array.from({length:121},(_,i)=>{const p=new THREE.CatmullRomCurve3(a.path.map(p=>new THREE.Vector3(...p))).getPoint(i/120);if(a.kind==='swept_channel')p.y+=a.radius;return p;})}));
 for(let i=0;i<sweeps.length;i++)for(let j=i+1;j<sweeps.length;j++){
  const a=sweeps[i],b=sweeps[j];let distance=Infinity;
  for(const p of a.points)for(const q of b.points)distance=Math.min(distance,p.distanceTo(q));
  const required=a.a.radius+b.a.radius+.08,passed=distance>required;
  clearances.push({zoneId,i,j,distance,required,passed});if(!passed)errors.push(`${zoneId}: attraction ${i}/${j} overlap`);
 }
}
for(const slide of map.SLIDES.filter(s=>s.richChute)){
 const render=map.POOL_WATERPARK.find(a=>a.kind==='swept_channel'&&a.zoneId===slide.zoneId),curve=new THREE.CatmullRomCurve3(render.path.map(p=>new THREE.Vector3(...p)));let maxError=0;
 for(let i=0;i<=100;i++){const p=curve.getPoint(i/100),t=(p.z-slide.z0)/(slide.z1-slide.z0);maxError=Math.max(maxError,Math.abs(p.y-(slide.y0+(slide.y1-slide.y0)*t)));}
 chutes.push({zoneId:slide.zoneId,maxRenderTerrainHeightError:maxError,passed:maxError<1e-5});if(maxError>=1e-5)errors.push(slide.zoneId+': chute render/terrain mismatch');
}
const report={passed:!errors.length,errors,method:'121 centreline samples per sweep; conservative full circular envelope for open channels. Intentional structural wall penetrations are not an attraction/attraction collision.',clearances,chutes};

mkdirSync('research/poolrooms/v5',{recursive:true});
writeFileSync('research/poolrooms/v5/attraction-audit.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));if(errors.length)process.exitCode=1;
