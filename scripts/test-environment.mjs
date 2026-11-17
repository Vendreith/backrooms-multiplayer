import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {genMap,collide} from '../src/map.js';
import {ENV_LIBRARY} from '../src/levels/environment_library.js';
import {advanceStamina,pursuitLimits} from '../src/gameplay_balance.js';
import {SPEED,ENTITY_ARCHETYPES} from '../src/constants.js';
const checks=[],test=(name,fn)=>{fn();checks.push(name);},hash=v=>crypto.createHash('sha256').update(JSON.stringify(v)).digest('hex'),rows=[];
test('108 original geometric signatures, finite dimensions and useful physical scale',()=>{const recipes=Object.values(ENV_LIBRARY);assert.equal(recipes.length,108);assert.equal(new Set(recipes.map(r=>JSON.stringify(r.parts.map(({mat,...p})=>p)))).size,108);assert(recipes.every(r=>r.parts.length&&Object.values(r.bounds).every(Number.isFinite)));assert(recipes.filter(r=>r.bounds.y1-r.bounds.y0>=.7).length>=90);});
test('all ordinary archetypes and stale custom configs obey the sustained pursuit cap',()=>{for(const arch of[...ENTITY_ARCHETYPES,{chaseSpd:20,maxChaseSpd:50}]){const p=pursuitLimits(arch);assert(p.max<=SPEED.SURV_SPRINT*.75);assert(p.start<=p.max);assert(p.attackRange<=1.6);}});
test('effective endurance doubles at every adrenaline level; shared recovery remains bounded',()=>{for(const chase of[0,.4,1]){let value=SPEED.STAM_DRAIN,time=0;while(value>1e-8){value=advanceStamina(value,.01,{sprinting:true,chase});time+=.01;}assert(Math.abs(time/(9.2/(1-chase*.42))-2)<.003);assert.equal(advanceStamina(-1,200),18.4);assert.equal(advanceStamina(18.4,10,{sprinting:true,tactical:true}),18.4);}});
test('three seeds: 4000 accessible instances, 108 archetypes, 48 substantial landmarks; no lost legacy cell',()=>{
 for(const seed of[2026,1337,91671]){const start=performance.now(),m=genMap(seed),e=m.ENVIRONMENT;assert.equal(e.instances.length,4000);assert.equal(e.usedArchetypes,108);assert.equal(e.stats.landmarks,48);assert.equal(e.zones.reduce((n,z)=>n+z.count,0),4000);assert(e.instances.every(o=>o.x<m.legacyBounds.x1&&o.z<m.legacyBounds.z1));
  const n=m.gridCols,rowsN=m.gridRows,pass=v=>v===0||v===3,seen=new Uint8Array(n*rowsN),q=[],con=m.classic.connectors[0],startCell=Math.floor(con.legacyZ/m.cellSize)*n+Math.floor(con.oldX/m.cellSize);q.push(startCell);seen[startCell]=1;
  for(let i=0;i<q.length;i++){const a=q[i],x=a%n,z=a/n|0;for(const[next,open]of[[z>0?a-n:-1,pass(m.hEdges[z]?.[x])],[z<rowsN-1?a+n:-1,pass(m.hEdges[z+1]?.[x])],[x>0?a-1:-1,pass(m.vEdges[z]?.[x])],[x<n-1?a+1:-1,pass(m.vEdges[z]?.[x+1])]])if(next>=0&&open&&!m.cellSolid[next/n|0][next%n]&&!seen[next]){seen[next]=1;q.push(next);}}
  const inaccessible=e.instances.filter(o=>!seen[Math.floor(o.z/m.cellSize)*n+Math.floor(o.x/m.cellSize)]);assert.equal(inaccessible.length,0);
  m.wallGrid.build(m.RECTS.filter(b=>b.kind!=='environment'));const before=m.SPOTS.map(sp=>collide(sp.x,sp.z,.44,m,false,0));m.wallGrid.build(m.RECTS);
  let occupiedCentres=0,baselineOccupiedCentres=0;for(let i=0;i<m.SPOTS.length;i++){const sp=m.SPOTS[i],[x,z]=collide(sp.x,sp.z,.44,m,false,0);if(Math.hypot(before[i][0]-sp.x,before[i][1]-sp.z)>.001)baselineOccupiedCentres++;if(Math.hypot(x-before[i][0],z-before[i][1])>.001)occupiedCentres++;}assert.equal(occupiedCentres,0);
  const low=e.colliders.filter(b=>b.y0<1.95&&b.y1>.12);for(const b of low)for(const[lo,hi]of[[b.x0,b.x1],[b.z0,b.z1]])assert(Math.ceil((lo-.55)/m.cellSize-.5)>Math.floor((hi+.55)/m.cellSize-.5));
  rows.push({seed,instances:e.instances.length,archetypes:e.usedArchetypes,landmarks:e.stats.landmarks,colliders:e.colliders.length,reachableLegacyCells:q.length,occupiedCentres,baselineOccupiedCentres,instancesSha256:hash(e.instances),generationMs:performance.now()-start,zones:e.zones.map(({clusters,...z})=>z)});
 }
});
fs.mkdirSync('output/playwright/level0-v12',{recursive:true});fs.writeFileSync('output/playwright/level0-v12/environment-data.json',JSON.stringify({passed:true,checks,rows},null,2));console.log(JSON.stringify({passed:checks.length,checks,seeds:rows.map(({zones,...r})=>r)},null,2));
