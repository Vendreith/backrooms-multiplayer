import {mkdirSync as createCheckDirectory} from 'node:fs';
createCheckDirectory('output/checks/poolrooms/v5',{recursive:true});
createCheckDirectory('output/checks/poolrooms/architectural_breakdown',{recursive:true});
import { writeFileSync, mkdirSync } from 'node:fs';
import { POOL_ZONE_DEFS } from '../src/levels/poolrooms_zones.js';
import { POOL_CELL_LIBRARY } from '../src/levels/poolrooms_cells.js';
import { buildPoolroomsV4World, createPoolCellIndex, rasterizePoolroomsNavigation } from '../src/levels/poolrooms_v4_world.js';
import { getTerrainAt, findDynamicGridPath } from '../src/levels/terrain.js';

export function validatePoolrooms(seed = 2026) {
  const lists = Object.fromEntries(['RECTS','WALLS','WATER_RECTS','PLATFORMS','RAMPS','SLIDES','PROPS','ANIM_PROPS','LIGHTS'].map(k => [k, []]));
  const begin = performance.now();
  const map = { ...lists, ...buildPoolroomsV4World({ ...lists, seed, zones: POOL_ZONE_DEFS.map(z => ({ ...z, bounds: { ...z.bounds } })) }), gridN: 672, cellSize: 1, worldSpan: 672 };
  map.wallGrid = createPoolCellIndex(map.RECTS, 4);
  Object.assign(map, rasterizePoolroomsNavigation(map));
  const generationMs = performance.now() - begin;
  const errors = [], cells = map.POOL_CELLS, byId = new Map(cells.map(c => [c.id,c]));
  const adjacency = new Map(cells.map(c => [c.id, []]));
  for (const edge of map.POOL_GRAPH) { adjacency.get(edge.a).push(edge.b); adjacency.get(edge.b).push(edge.a); }
  const reached = new Set([cells[0].id]), stack = [cells[0].id];
  while (stack.length) for (const next of adjacency.get(stack.pop())) if (!reached.has(next)) { reached.add(next); stack.push(next); }
  if (reached.size !== cells.length) errors.push(`disconnected graph: ${cells.length-reached.size}`);
  const n=map.gridN, toIndex=(x,z)=>Math.floor(z)*n+Math.floor(x);
  const seen=new Uint8Array(n*n), queue=new Int32Array(n*n), start=toIndex(map.SPAWN.x,map.SPAWN.z);
  let head=0, tail=0;queue[tail++]=start;seen[start]=1;
  while(head<tail){
    const id=queue[head++], r=Math.floor(id/n), c=id%n;
    for(const [rr,cc,open] of [[r-1,c,map.hEdges[r]?.[c]===0],[r+1,c,map.hEdges[r+1]?.[c]===0],[r,c-1,map.vEdges[r]?.[c]===0],[r,c+1,map.vEdges[r]?.[c+1]===0]]) {
      const next=rr*n+cc;if(open&&rr>=0&&cc>=0&&rr<n&&cc<n&&!seen[next]&&!map.cellSolid[rr][cc]){seen[next]=1;queue[tail++]=next;}
    }
  }
  const anchors=[...map.POOL_ZONES.map(z=>({name:z.id,x:z.teleX,z:z.teleZ})),...map.PUMPS.map(p=>({...p,name:p.key})),...map.SPAWN_POINTS.map((p,i)=>({...p,name:`spawn_${i}`})),{...map.END_POS,name:'return'},{...map.TASK_POS,name:'task'},{...map.K_SPAWN,name:'entity'}];
  const unreachable=anchors.filter(p=>!seen[toIndex(p.x,p.z)]).map(p=>p.name);
  if(unreachable.length)errors.push('unreachable navigation anchors: '+unreachable.join(', '));
  const unreachableCells=cells.filter(c=>!seen[toIndex(c.x,c.z)]&& ![[-1,0],[1,0],[0,-1],[0,1]].some(([dx,dz])=>seen[toIndex(c.x+dx,c.z+dz)]));
  if(unreachableCells.length)errors.push(`unreachable cell centres: ${unreachableCells.length} (${unreachableCells.slice(0,8).map(c=>c.id).join(', ')})`);
  const invalidDimensions=cells.filter(c=>c.width<=0||c.depth<=0||c.ceiling<2.3||(!c.landmark&&!c.art&&c.ceiling>7)||(c.art&&(c.width!==c.art.size[0]||c.depth!==c.art.size[1]||c.ceiling!==c.art.size[2])));
  if(invalidDimensions.length)errors.push('invalid dimensions: '+invalidDimensions.map(c=>c.id).join(','));
  const corridors=cells.filter(c=>c.kind==='corridor'), rooms=cells.filter(c=>c.kind!=='corridor');
  const oversized=rooms.filter(c=>Math.max(c.width,c.depth)>10&&!c.medium&&!c.landmark&&!c.art);
  if(oversized.length)errors.push('oversized ordinary rooms: '+oversized.length);
  if(corridors.some(c=>c.clearWidth<2||c.clearWidth>5||c.routeLength>12))errors.push('corridor scale outside targets');
  const near100=rooms.filter(c=>Math.max(c.width,c.depth)>=80);
  if(near100.length>5)errors.push('monumental room budget exceeded');
  // Every graph connection must have a physical shared aperture. This catches
  // layout overlaps/gaps that labels and graph reachability alone cannot catch.
  const badSockets=[];
  for(const e of map.POOL_GRAPH){const a=byId.get(e.a),b=byId.get(e.b);
    const ix=Math.min(a.x1,b.x1)-Math.max(a.x0,b.x0),iz=Math.min(a.z1,b.z1)-Math.max(a.z0,b.z0);
    if(ix<-.05||iz<-.05||Math.max(ix,iz)<.84)badSockets.push({a:a.id,b:b.id,ix,iz});
  }
  if(badSockets.length)errors.push('invalid physical apertures: '+badSockets.length);
  const collisionFailures=[];
  for(const p of anchors){const tr=getTerrainAt(p.x,p.z,map,p.y||0);
    for(const b of map.wallGrid.queryNear(p.x,p.z,.6)){
      if(tr.floorY>=b.maxY-.15||tr.floorY+1.55<=b.minY)continue;
      const dx=p.x-Math.max(b.x0,Math.min(b.x1,p.x)),dz=p.z-Math.max(b.z0,Math.min(b.z1,p.z));
      if(dx*dx+dz*dz<.42*.42)collisionFailures.push(p.name);
    }
  }
  if(collisionFailures.length)errors.push('blocked anchors: '+collisionFailures.join(','));
  if(map.SPAWN_POINTS.some(p=>getTerrainAt(p.x,p.z,map,p.y).inWater))errors.push('wet co-op spawn');
  const pathFailures=[],pathTimes=[];
  for(const zone of map.POOL_ZONES){const started=performance.now();const path=findDynamicGridPath(map,map.SPAWN.x,map.SPAWN.z,zone.teleX,zone.teleZ);pathTimes.push(performance.now()-started);const last=path.at(-1);if(!last||Math.hypot(last[0]-zone.teleX,last[1]-zone.teleZ)>1.5)pathFailures.push(zone.id);}
  if(pathFailures.length)errors.push('actual A* failed to reach zones: '+pathFailures.join(','));
  const widths=corridors.map(c=>c.clearWidth).sort((a,b)=>a-b);
  const histogram={smallUpTo10m:0,mediumOver10Under40m:0,large40Under80m:0,monumental80mPlus:0};
  for(const c of rooms){const max=Math.max(c.width,c.depth);histogram[max<=10?'smallUpTo10m':max<40?'mediumOver10Under40m':max<80?'large40Under80m':'monumental80mPlus']++;}
  return {seed,passed:!errors.length,errors,zoneCount:map.POOL_ZONES.length,cellCount:cells.length,roomCount:rooms.length,corridorCount:corridors.length,
    medianCorridorWidth:widths[Math.floor(widths.length/2)],roomSizeDistribution:histogram,
    largestRooms:rooms.filter(c=>c.art||c.landmark||c.medium).map(c=>({zone:c.zoneId,width:c.width,depth:c.depth,height:c.ceiling})),
    graphEdges:map.POOL_GRAPH.length,cycles:map.POOL_GRAPH.length-cells.length+1,
    graphCentrelineLengthM:Math.round(map.POOL_GRAPH.reduce((s,e)=>s+e.length,0)),corridorCentrelineLengthM:Math.round(corridors.reduce((s,c)=>s+c.routeLength,0)),
    reachedCells:reached.size,walkableRasterCells:tail,unreachableAnchors:unreachable,unreachableCellCentres:unreachableCells.map(c=>c.id),
    badSockets:badSockets.slice(0,20),collisionFailures,pathFailures,maxPathMs:Math.round(Math.max(...pathTimes)),generationMs:Math.round(generationMs),libraryModules:Object.keys(POOL_CELL_LIBRARY).length,
    moduleUsage:Object.fromEntries([...new Set(cells.map(c=>c.module))].map(m=>[m,cells.filter(c=>c.module===m).length])),
    zones:map.POOL_ZONES.map(z=>({id:z.id,name:z.name,intent:z.architecturalIntent,cells:cells.filter(c=>c.zoneId===z.id).length,teleport:{x:z.teleX,z:z.teleZ},references:z.references}))};
}

const reports=[2026,1,42].map(validatePoolrooms);
mkdirSync('output/checks/poolrooms/architectural_breakdown',{recursive:true});
writeFileSync('output/checks/poolrooms/architectural_breakdown/validation.json',JSON.stringify(reports,null,2));
console.log(JSON.stringify(reports.map(({zones,...r})=>r),null,2));
if(reports.some(r=>!r.passed))process.exitCode=1;
