import assert from 'node:assert/strict';
import { writeFileSync, mkdirSync } from 'node:fs';
import { genSubLevelMap } from '../src/levels/world_generators.js';
import { LEVEL_CATALOG, canonicalLevelId } from '../src/levels/catalog.js';
import { getTerrainAt } from '../src/levels/terrain.js';
import { collide } from '../src/map.js';
import { resolveThreshold } from '../src/levels/thresholds.js';
import { buildHouse } from '../src/levels/level94_architecture/house_builder.js';
import { disposeArchitectureResources, getArchitectureResourceStats } from '../src/levels/level94_architecture/resources.js';
const evidence = [];
assert.equal(LEVEL_CATALOG.level94.archetype, 'dream_hills');
assert.equal(LEVEL_CATALOG.level94m.archetype, 'motion_town');
assert.equal(canonicalLevelId('level94d'), 'level94');
for (const seed of [2026, 1337, 91671]) {
  const start = performance.now(), map = genSubLevelMap('level94', seed), again = genSubLevelMap('level94d', seed), tunnel = genSubLevelMap('level94u', seed);
  assert.deepEqual(map.hills.grid, again.hills.grid, 'legacy alias shares the same seed');
  assert.deepEqual(map.HOUSES.map(h => [h.cx, h.cz, h.baseY, h.variantId]), again.HOUSES.map(h => [h.cx, h.cz, h.baseY, h.variantId]));
  const legacy=genSubLevelMap('level94m',seed);
  for(const list of[legacy.PROPS,legacy.RECTS])for(const record of list)for(const value of Object.values(record))if(typeof value==='number')assert(Number.isFinite(value),'legacy town has finite geometry and collision');
  assert.equal(map.HOUSES.filter(h => !h.scenic).length, 12);
  assert.equal(map.HOUSES.filter(h => h.scenic).length, 38);
  assert(new Set(map.HOUSES.slice(0,12).map(h => h.variantId)).size >= 10);
  assert([...map.WATERS,...map.FLARES].every(p=>Math.hypot(p.x-256,p.z-256)<190),'supplies stay in playable terrain');
  assert(map.hills.regions.length>=5,'recognizable authored regions');
  assert(map.HOUSES.filter(h=>h.scenic).every(h=>Math.hypot(h.cx-256,h.cz-256)>200),'background homes stay beyond player bounds');
  const horizon=Array.from({length:36},(_,i)=>map.hills.heightAt(256+Math.cos(i*Math.PI/18)*300,256+Math.sin(i*Math.PI/18)*300));
  assert(horizon.filter(h=>h<8).length>=6,'open valleys interrupt the distant hill chains');
  let maxSlope = 0, min = Infinity, max = -Infinity;
  for (let x = 32; x < 480; x += 4) for (let z = 32; z < 480; z += 4) {
    const y = map.hills.heightAt(x,z); min = Math.min(min,y); max = Math.max(max,y);
    maxSlope = Math.max(maxSlope, map.hills.slopeAt(x,z));
    const floor = getTerrainAt(x,z,map,y).floorY;
    assert(Number.isFinite(floor)); assert(floor >= y - .001, 'terrain never falls below rendered surface');
  }
  assert(max - min > 18, 'non-flat terrain'); assert(maxSlope < .62, 'walkable hills');
  assert(map.hills.pathMaskAt(268,420) > .5, 'world-space path mask follows the authored route');
  for (const spawn of map.SPAWN_POINTS) {
    const [x,z] = collide(spawn.x,spawn.z,.36,map,false,spawn.y);
    assert(Math.hypot(x-spawn.x,z-spawn.z) < .01, 'clear multiplayer spawn');
    assert(Math.abs(getTerrainAt(x,z,map,spawn.y).floorY-spawn.y) < .01);
  }
  const boundary = collide(510,256,.36,map,false,0); assert(Math.hypot(boundary[0]-256,boundary[1]-256) < 190);
  for (const house of map.HOUSES) {
    const layout = house.layout;
    assert(house.baseY >= layout.placement.sampleMax, 'foundation above highest terrain sample');
    assert(house.baseY-layout.placement.foundationDepth < layout.placement.sampleMin, 'foundation skirt reaches below ground');
    assert(layout.steps.every((s,i,a)=>!i || Math.abs(s.y-a[i-1].y)<=.171), 'accessible stair risers');
    const model = buildHouse(house); assert.equal(model.levels.length,3);
    for (const level of model.levels) level.object.traverse(m => {
      if (!m.isMesh) return;
      assert([...m.geometry.attributes.position.array].every(Number.isFinite), 'finite geometry');
      const n=m.geometry.attributes.normal; for(let i=0;i<n.count;i+=7)assert(Math.abs(Math.hypot(n.getX(i),n.getY(i),n.getZ(i))-1)<.02,'unit normals');
    });
  }
  const doors=[];
  for (const door of map.LEVEL_DOORS) {
    const player={id:'guest',x:door.x,y:door.y,z:door.z};
    const route=resolveThreshold(map,tunnel,door.id,player,10000);assert(route.ok,JSON.stringify(route));
    assert(!resolveThreshold(map,tunnel,door.id,{...player,x:256,z:256},10000).ok,'reject remote trigger');
    assert(!resolveThreshold(map,tunnel,door.id,{...player,lastThresholdAt:9999},10000).ok,'debounce');
    assert(!resolveThreshold(map,map,door.id,player,10000).ok,'reject wrong destination');
    doors.push({id:door.id,arrival:route});
  }
  const back=tunnel.LEVEL_DOORS[0];assert(resolveThreshold(tunnel,map,back.id,{x:back.x,y:0,z:back.z},10000).ok,'safe return to actual padded terrain');
  evidence.push({seed,generationAndGeometryMs:Math.round(performance.now()-start),houses:50,heightRange:[min,max],maxSlopeDegrees:maxSlope*180/Math.PI,doors,resources:getArchitectureResourceStats()});
  disposeArchitectureResources(); assert.equal(getArchitectureResourceStats().geometries,0);
}
mkdirSync('research/level94',{recursive:true});writeFileSync('research/level94/data-validation.json',JSON.stringify({passed:true,evidence},null,2));
console.log(JSON.stringify({passed:true,seeds:evidence.map(({seed,houses,heightRange,maxSlopeDegrees})=>({seed,houses,heightRange,maxSlopeDegrees}))},null,2));
