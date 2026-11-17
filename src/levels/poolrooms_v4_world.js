/*! Copyright (c) 2026 Vendreith. Licensing: see LICENSE.md and THIRD_PARTY_NOTICES.md. */
/*!
 * Level 37 / Sublimity by egglord, Backrooms Wiki, CC BY-SA 3.0.
 * Original procedural implementation (c) 2026 Vendreith. See ATTRIBUTION.md.
 */
import { createPoolroomsBlueprint, POOL_SCALE } from './poolrooms_cells.js';
import { initTerrainIndex, getTerrainAt } from './terrain.js';
import { buildAuthoredPoolCell } from './poolrooms_art.js';
import {tubeSockets} from './poolrooms_tubes.js';
import {populatePoolDecor} from './poolrooms_decor.js';
import {installPoolWindows} from './poolrooms_windows.js';

export function createPoolCellIndex(cells, size = 16) {
  const buckets = new Map();
  for (const c of cells) for (let z = Math.floor(c.z0 / size); z <= Math.floor(c.z1 / size); z++)
    for (let x = Math.floor(c.x0 / size); x <= Math.floor(c.x1 / size); x++) {
      const key = `${x},${z}`; if (!buckets.has(key)) buckets.set(key, []); buckets.get(key).push(c);
    }
  return { queryNear(x, z, radius = 0) {
    if (!radius) return buckets.get(`${Math.floor(x / size)},${Math.floor(z / size)}`) || [];
    const found = new Set();
    for (let zz = Math.floor((z - radius) / size); zz <= Math.floor((z + radius) / size); zz++)
      for (let xx = Math.floor((x - radius) / size); xx <= Math.floor((x + radius) / size); xx++)
        for (const c of buckets.get(`${xx},${zz}`) || []) found.add(c);
    return [...found];
  } };
}

// One-metre navigation, carved only inside real cells. Rasterisation is linear
// in occupied area, rather than scanning every wall for all 451k world pixels.
export function rasterizePoolroomsNavigation(map) {
  const n = map.gridN, s = map.cellSize, radius = POOL_SCALE.bodyRadius;
  const cellSolid = Array.from({ length: n }, () => new Uint8Array(n).fill(1));
  const waterCells = Array.from({ length: n }, () => new Uint8Array(n));
  const hEdges = Array.from({ length: n + 1 }, () => new Uint8Array(n).fill(1));
  const vEdges = Array.from({ length: n }, () => new Uint8Array(n + 1).fill(1));
  for (const c of map.POOL_CELLS) {
    for (let r = Math.max(0, Math.ceil(c.z0 / s - .5)); r < Math.min(n, Math.ceil(c.z1 / s - .5)); r++)
      for (let col = Math.max(0, Math.ceil(c.x0 / s - .5)); col < Math.min(n, Math.ceil(c.x1 / s - .5)); col++) cellSolid[r][col] = 0;
  }
  initTerrainIndex(map);
  const clear = (x, z) => {
    for (const b of map.wallGrid.queryNear(x, z, radius + .2)) {
      if (b.minY > .8 || b.maxY < 1.0 || b.half) continue;
      const dx = x - Math.max(b.x0, Math.min(b.x1, x)), dz = z - Math.max(b.z0, Math.min(b.z1, z));
      if (dx * dx + dz * dz < radius * radius) return false;
    }
    return true;
  };
  for (let r = 1; r < n - 1; r++) for (let c = 1; c < n - 1; c++) {
    if (cellSolid[r][c]) continue;
    const x = (c + .5) * s, z = (r + .5) * s;
    if (!clear(x, z)) { cellSolid[r][c] = 1; continue; }
    const terrain = getTerrainAt(x, z, map, 0);
    waterCells[r][c] = terrain.inWater ? 1 : 0;
  }
  for (let r = 1; r < n - 1; r++) for (let c = 1; c < n - 1; c++) {
    if (cellSolid[r][c]) continue;
    if (!cellSolid[r][c + 1] && clear((c + 1) * s, (r + .5) * s)) vEdges[r][c + 1] = 0;
    if (!cellSolid[r + 1][c] && clear((c + .5) * s, (r + 1) * s)) hEdges[r + 1][c] = 0;
  }
  return { cellSolid, waterCells, hEdges, vEdges };
}

function remainingSegments(start, end, cuts) {
  const sorted = cuts.filter(([a, b]) => b > start && a < end).sort((a, b) => a[0] - b[0]);
  const out = []; let pos = start;
  for (const [a, b] of sorted) { if (a > pos + .015) out.push([pos, Math.min(a, end)]); pos = Math.max(pos, b); }
  if (pos < end - .015) out.push([pos, end]); return out;
}

export function buildPoolroomsV4World({ zones, seed = 2026, RECTS, WALLS, WATER_RECTS, PLATFORMS, RAMPS, SLIDES, PROPS, ANIM_PROPS, LIGHTS }) {
  const blueprint = createPoolroomsBlueprint(zones, seed), cells = blueprint.cells;
  const cellOrder = new Map(cells.map((c,i)=>[c,i]));
  const index = createPoolCellIndex(cells), POOL_ARCH = [], LIGHT_VOLUMES = [], SPIRAL_SLIDES = [];
  const wall = (x0, z0, x1, z1, y0, y1, extra = {}) => {
    if (x1 - x0 < .015 || z1 - z0 < .015 || y1 - y0 < .015) return;
    const box = { x0, z0, x1, z1, y0, y1, ...extra }; WALLS.push(box);
    if (!extra.visualOnly) RECTS.push({ ...box, minY: y0, maxY: y1 });
  };
  const platform = (x0, z0, x1, z1, y, extra = {}) => {
    if (x1 <= x0 || z1 <= z0) return;
    PLATFORMS.push({ x0, z0, x1, z1, y, yBase: y - .2, draw: true, surface: 'tile', ...extra });
  };
  const ramp = (x0, z0, x1, z1, y0, y1, axis, extra = {}) => RAMPS.push({ x0, z0, x1, z1, y0, y1, axis, draw: true, surface: 'tile', ...extra });
  const water = (x0, z0, x1, z1, top, bed, zone) => WATER_RECTS.push({ x0, z0, x1, z1, waterY: top, bedY: bed, temp: zone.waterTemp, noCoping: true });
  const column = (x, z, r, h, y0) => {
    POOL_ARCH.push({ kind: 'round_col', x, z, r, h, y0, mintBand: true });
    wall(x - r, z - r, x + r, z + r, y0, y0 + h, { collisionOnly: true });
    WALLS.pop(); // The circular render mesh has its own square conservative proxy.
  };
  const stairs = (x, z, width, length, yTop, yBottom, axis = 'z') => {
    const n = Math.ceil(Math.abs(yTop - yBottom) / .16);
    for (let i = 0; i < n; i++) {
      const d = length / n, y = yTop + (yBottom - yTop) * (i + .5) / n;
      if (axis === 'z') platform(x - width / 2, z + d * i, x + width / 2, z + d * (i + 1), y, { terrainIgnore: true });
      else platform(x + d * i, z - width / 2, x + d * (i + 1), z + width / 2, y, { terrainIgnore: true });
    }
    const r = axis === 'z' ? [x - width / 2, z, x + width / 2, z + length] : [x, z - width / 2, x + length, z + width / 2];
    ramp(...r, yTop, yBottom, axis, { draw: false });
  };
  const zoneMap = new Map(zones.map(z => [z.id, z]));
  for (const [ci, c] of cells.entries()) {
    const zone = zoneMap.get(c.zoneId), y = c.floorY, top = y + c.ceiling;
    const nearby = index.queryNear(c.x, c.z, Math.max(c.width, c.depth) / 2 + 2);
    if(['tubes','return_tubes'].includes(c.art?.grammar))c.physicalPortals=tubeSockets(c,nearby);
    if (c.kind !== 'corridor') for (const p of c.physicalPortals||c.portals) {
      const horizontal = p.side === 'n' || p.side === 's';
      const x = horizontal ? p.at : p.side === 'e' ? c.x1 : c.x0;
      const z = horizontal ? p.side === 'n' ? c.z0 : c.z1 : p.at;
      if (x < c.x0-.01 || x > c.x1+.01 || z < c.z0-.01 || z > c.z1+.01) continue;
      const inset=c.physicalPortals?.includes(p)?.045:0;
      POOL_ARCH.push({kind:'portal_frame',x:x+(p.side==='w'?inset:p.side==='e'?-inset:0),z:z+(p.side==='n'?inset:p.side==='s'?-inset:0),span:p.width,y0:y,rotY:horizontal?0:Math.PI/2});
    }
    // Subtract neighbour VOLUMES from each boundary face. V4 subtracted XZ
    // footprints only and therefore deleted the transom above a lower roof.
    for (const side of ['n', 's', 'e', 'w']) {
      const horizontal = side === 'n' || side === 's';
      const fixed = side === 'n' ? c.z0 : side === 's' ? c.z1 : side === 'e' ? c.x1 : c.x0;
      const min = horizontal ? c.x0 : c.z0, max = horizontal ? c.x1 : c.z1;
      const neighbours = nearby.filter(other => {
        if (other === c) return false;
        const p0 = horizontal ? other.z0 : other.x0, p1 = horizontal ? other.z1 : other.x1;
        const a = horizontal ? other.x0 : other.z0, b = horizontal ? other.x1 : other.z1;
        const outward = side === 'n' || side === 'w' ? p0 < fixed-.025 : p1 > fixed+.025;
        const coincidentOwner = Math.abs((side === 'n' || side === 'w' ? p0 : p1)-fixed)<.025 && cellOrder.get(other)<ci;
        return (outward||coincidentOwner) && fixed >= p0-.025 && fixed <= p1+.025 && b > min+.01 && a < max-.01;
      });
      const breaks = [...new Set([min,max,...neighbours.flatMap(o => [Math.max(min,horizontal?o.x0:o.z0),Math.min(max,horizontal?o.x1:o.z1)])])].sort((a,b)=>a-b);
      for(let i=0;i<breaks.length-1;i++){
        const a=breaks[i],b=breaks[i+1],mid=(a+b)/2;
        if(b-a<.015)continue;
        const openings=neighbours.filter(o=>mid>=(horizontal?o.x0:o.z0)-.025&&mid<=(horizontal?o.x1:o.z1)+.025)
          .map(o=>[o.floorY-3.25,o.floorY+o.ceiling]);
        for(const [lo,hi] of remainingSegments(y-3.25,top+.18,openings)){
          const t=POOL_SCALE.wall;
          if(horizontal)wall(a-t/2,fixed-t/2,b+t/2,fixed+t/2,lo,hi);
          else wall(fixed-t/2,a-t/2,fixed+t/2,b+t/2,lo,hi);
        }
      }
    }
    // Each cell has its own low ceramic ceiling. Ribs are deliberately sparse.
    let roofPieces=[{x0:c.x0-.14,z0:c.z0-.14,x1:c.x1+.14,z1:c.z1+.14}];
    // A lower corridor roof must stop at the curved chamber, rather than
    // slicing a flat slab through its continuous ceramic vault.
    for(const n of nearby.filter(n=>n!==c&&['tubes','return_tubes'].includes(n.art?.grammar)&&top<n.floorY+n.ceiling-.5)){
      const next=[];for(const p of roofPieces){const x0=Math.max(p.x0,n.x0),x1=Math.min(p.x1,n.x1),z0=Math.max(p.z0,n.z0),z1=Math.min(p.z1,n.z1);if(x1<=x0||z1<=z0){next.push(p);continue;}for(const q of[{...p,x1:x0},{...p,x0:x1},{x0,x1,z0:p.z0,z1:z0},{x0,x1,z0:z1,z1:p.z1}])if(q.x1-q.x0>.015&&q.z1-q.z0>.015)next.push(q);}roofPieces=next;
    }
    for(const p of roofPieces)POOL_ARCH.push({kind:'ceil_vault',...p,y:top,cofferGlow:!c.art&&c.kind!=='corridor'&&ci%4===0,ribs:c.feature==='vault'?2:0});
    if(c.art){buildAuthoredPoolCell(c,zone,{wall,platform,ramp,stairs,water,column,POOL_ARCH,WATER_RECTS,SPIRAL_SLIDES,SLIDES,LIGHTS,LIGHT_VOLUMES,ANIM_PROPS,WALLS,nearby});continue;}
    if (c.kind === 'corridor') {
      if (Math.abs(c.floorEnd - c.floorStart) > .01) ramp(c.x0, c.z0, c.x1, c.z1, c.floorStart, c.floorEnd, c.axis);
      else if (ci % 7 === 0) water(c.x0, c.z0, c.x1, c.z1, y + .08, y - .22, zone);
      else platform(c.x0, c.z0, c.x1, c.z1, y);
      if (c.module === 'divided' && c.clearWidth >= 4) column(c.x + (c.axis === 'z' ? .75 : 0), c.z + (c.axis === 'x' ? .75 : 0), .24, c.ceiling, y);
      // Portal framing is actual geometry, above a safe 2.1m spring line.
      if (c.routeLength > 4.2 && ci % 3 === 0) POOL_ARCH.push({ kind: 'arch', x: c.x, z: c.z, span: c.clearWidth, h: Math.max(2.7, c.clearWidth / 2 + 2.1),
        pierW: .22, depth: .24, y0: y, rotY: c.axis === 'x' ? Math.PI / 2 : 0, headerH: .15, springHeight: 2.1, mint: ci % 2 === 0 });
      continue;
    }
    const ledge = c.landmark || c.medium ? 2.5 : Math.min(1.35, Math.min(c.width, c.depth) * .23);
    const basin = { x0: c.x0 + ledge, z0: c.z0 + ledge, x1: c.x1 - ledge, z1: c.z1 - ledge };
    const hasBasin = Math.min(c.width, c.depth) >= 5 && !['t', 'cross', 'arches', 'raised', 'spiral_steps'].includes(c.feature);
    if (hasBasin) {
      const depth = c.feature === 'glass' ? 2.2 : c.landmark ? 1.35 : c.feature === 'steps' ? .85 : .48;
      water(basin.x0, basin.z0, basin.x1, basin.z1, y - .08, y - depth, zone);
      platform(c.x0, c.z0, c.x1, basin.z0, y); platform(c.x0, basin.z1, c.x1, c.z1, y);
      platform(c.x0, basin.z0, basin.x0, basin.z1, y); platform(basin.x1, basin.z0, c.x1, basin.z1, y);
      // Tiled basin walls give the water a physical waterline, not a floating plane.
      const t = .12;
      wall(basin.x0-t,basin.z0,basin.x0,basin.z1,y-depth,y,{half:true,visualOnly:true});
      wall(basin.x1,basin.z0,basin.x1+t,basin.z1,y-depth,y,{half:true,visualOnly:true});
      wall(basin.x0-t,basin.z0-t,basin.x1+t,basin.z0,y-depth,y,{half:true,visualOnly:true});
      wall(basin.x0-t,basin.z1,basin.x1+t,basin.z1+t,y-depth,y,{half:true,visualOnly:true});
      if (c.feature === 'steps' || c.feature === 'submerged' || c.feature === 'half' || ci % 4 === 0) {
        const length = Math.min(2.4, (basin.z1 - basin.z0) * .7), width = Math.min(2.5, basin.x1 - basin.x0);
        stairs(c.x, basin.z0, width, length, y, y - depth);
      }
      // Main circulation remains available on two perimeter routes. Shallow
      // basins are themselves walkable; dark deep basins are optional.
      if (c.feature === 'basins' || c.medium) {
        platform(c.x - .65, basin.z0, c.x + .65, basin.z1, y);
        platform(basin.x0, c.z - .65, basin.x1, c.z + .65, y);
      }
    } else platform(c.x0, c.z0, c.x1, c.z1, y);
    if (c.feature === 'slope') ramp(c.x0+.3,c.z0+.4,c.x1-.3,c.z1-.4,y,y+.65,'z');
    if (c.feature === 'curve_steps' || c.feature === 'spiral_steps') {
      const turns = c.feature === 'spiral_steps' ? 1 : .5, steps = c.feature === 'spiral_steps' ? 18 : 10;
      const r = Math.min(c.width,c.depth)*.28, rise = c.feature === 'spiral_steps' ? 2.35 : 1.2;
      for(let k=0;k<steps;k++){
        const a=k/steps*Math.PI*2*turns, b=(k+1)/steps*Math.PI*2*turns;
        const px=c.x+Math.cos(a)*r,pz=c.z+Math.sin(a)*r,qx=c.x+Math.cos(b)*r,qz=c.z+Math.sin(b)*r;
        platform(Math.min(px,qx)-.6,Math.min(pz,qz)-.6,Math.max(px,qx)+.6,Math.max(pz,qz)+.6,y+(k+1)/steps*rise);
      }
    }
    if (c.feature === 'column') column(c.x + 1.0, c.z + .6, .36, c.ceiling, y);
    if (c.feature === 'circular' || c.feature === 'curve') {
      // Rounded corners leave the four cardinal sockets and perimeter ledges open.
      for (const [sx, sz] of [[-1,-1],[-1,1],[1,-1],[1,1]]) POOL_ARCH.push({ kind: 'curved_wall', cx: c.x + sx * (c.width / 2 - 1.2), cz: c.z + sz * (c.depth / 2 - 1.2), radius: .8,
        ang0: sx > 0 ? (sz > 0 ? 0 : -Math.PI / 2) : (sz > 0 ? Math.PI / 2 : Math.PI), ang1: sx > 0 ? (sz > 0 ? Math.PI / 2 : 0) : (sz > 0 ? Math.PI : Math.PI * 1.5), h: c.ceiling, y0: y, thick: .14, segments: 5 });
    }
    if (c.feature === 'glass') {
      POOL_ARCH.push({ kind: 'glass_wall', x0: c.x1 - .4, x1: c.x1 - .3, z0: c.z0 + 1, z1: c.z1 - 1, y0: y, y1: y + 2.1 });
    }
    if (c.feature === 'bridge' || c.feature === 'raised' || c.feature === 'spiral_steps') {
      const upperY = y + 2.35;
      platform(c.x - 1.15, c.z0 + .8, c.x + 1.15, c.z1 - .8, upperY);
      // A real ascending switchback along the side, with a safe lower bypass.
      stairs(c.x0 + 1.3, c.z0 + .7, 1.8, Math.min(c.depth - 1.4, 7.5), y, upperY);
      platform(c.x0 + .4, c.z1 - 1.5, c.x + 1.15, c.z1 - .5, upperY);
      for (const sx of [-1,1]) wall(c.x + sx * 1.15 - .06, c.z0 + .8, c.x + sx * 1.15 + .06, c.z1 - .8, upperY, upperY + .72, { half: true });
    }
    if (c.feature === 'slide' || c.feature === 'chute') {
      const width = Math.min(2.5, c.width - 1), run = Math.min(c.depth - 1.5, 6);
      SLIDES.push({ x0: c.x - width / 2, x1: c.x + width / 2, z0: c.z0 + .75, z1: c.z0 + .75 + run, axis: 'z', y0: y + 1.2, y1: y - .2, dirX: 0, dirZ: 1, speed: 7.5, color: 0xe6eee7 });
      stairs(c.x0 + .65, c.z0 + .75, 1.2, run, y, y + 1.2);
      platform(c.x0 + .1, c.z0 + .25, c.x + width / 2, c.z0 + .85, y + 1.2);
    }
    if (c.landmark) {
      // Multi-basin landmark compositions, not decorated empty rectangles.
      for (let x = c.x0 + 7; x < c.x1 - 4; x += 8) for (const z of [c.z0 + 6, c.z1 - 6]) column(x, z, .65, c.ceiling, y - 1.35);
      for (const t of [-.22, .22]) platform(c.x0 + 2.5, c.z + c.depth * t - 1.4, c.x1 - 2.5, c.z + c.depth * t + 1.4, y + .12);
      platform(c.x - 1.6, c.z0, c.x + 1.6, c.z1, y + .12);
      if (c.landmark === 'zone_al') {
        const s = { kind: 'spiral_slide', cx: c.x, cz: c.z, radius: 9, turns: 1.25, yTop: y + 6.4, yBot: y + .2, width: 2.8, ccw: false, angStart: 0, speed: 9.5 };
        POOL_ARCH.push(s); SPIRAL_SLIDES.push(s);
        // Walkable spiral stair to the slide start, with ground bypass around it.
        const count = 44, r = 12;
        for (let k = 0; k < count; k++) {
          const a = (k / count) * Math.PI * 2, b = ((k + 1) / count) * Math.PI * 2;
          const px = c.x + Math.cos(a) * r, pz = c.z + Math.sin(a) * r;
          const qx = c.x + Math.cos(b) * r, qz = c.z + Math.sin(b) * r;
          platform(Math.min(px,qx)-1.1, Math.min(pz,qz)-1.1, Math.max(px,qx)+1.1, Math.max(pz,qz)+1.1, y + (k+1) / count * 6.4);
        }
        platform(c.x + 8.0, c.z - 1.1, c.x + 13.1, c.z + 1.1, y + 6.4);
      } else if (c.landmark === 'zone_am') {
        for (const z of [c.z - 6, c.z + 6]) POOL_ARCH.push({ kind: 'ceramic_tube', x: c.x, z, y: y + 4.7, r: 1.65, len: 36, axis: 'x', flatWalkFloor: false, openTop: false, ribStep: 4 });
      }
      stairs(c.x - 1.6, c.z0 + 2.5, 3.2, 5, y + .12, y - 1.35);
    }
    if (['zone_ai','zone_w'].includes(c.zoneId) && ci % 4 === 0) ANIM_PROPS.push({kind:'steam_vent',x:c.x0+.75,z:c.z1-.75,y:y-.05,ry:0,s:.4});
    // Pools receive side light, not uniform per-zone colouring. Half the small
    // rooms are unlit; light spill is bounded to the neighbouring corner.
    if (ci % 2 === 0 || c.landmark) {
      const hex = c.zoneId === 'zone_aa' ? 0xffb6cc : c.zoneId === 'zone_ac' ? 0x6ba7ff : c.zoneId === 'zone_ab' ? 0xffd3a0 : 0xe5fff4;
      LIGHTS.push({ x: c.x - c.width * .28, y: top - .35, z: c.z + c.depth * .2, hex, colorHex: hex, intensity: c.landmark ? 5 : 2.8, gain: 1, dist: c.landmark ? 32 : 10 });
      const color = [(hex >> 16 & 255) / 255, (hex >> 8 & 255) / 255, (hex & 255) / 255];
      LIGHT_VOLUMES.push({ x: c.x - c.width * .28, y: top - 1, z: c.z + c.depth * .2, r: c.landmark ? 25 : 8, rgb: color, strength: .48 });
      if (c.landmark === 'zone_an') for (let k = 0; k < 6; k++) {
        const h = [0xff86be,0x7debdc,0xffd18d,0xb5a2ff,0x96edc2,0x779dff][k];
        const x = c.x0 + 7 + k * 11;
        LIGHTS.push({ x, y: y + 5, z: c.z, hex: h, colorHex: h, intensity: 5, gain: 1, dist: 18 });
        LIGHT_VOLUMES.push({ x, y: y + 2, z: c.z, r: 15, rgb: [(h>>16&255)/255,(h>>8&255)/255,(h&255)/255], strength: .65 });
      }
    }
  }
  const decoration=populatePoolDecor({cells,zones,index,seed,POOL_ARCH,WATER_RECTS,PLATFORMS,RAMPS,SLIDES,RECTS,WALLS,LIGHT_VOLUMES,stairs,platform,column});
  const POOL_SKY_WINDOWS=installPoolWindows({cells,WALLS,RECTS,PLATFORMS,POOL_ARCH,LIGHT_VOLUMES});
  const anchor = (id, roomIndex = 0) => {
    const grid = blueprint.districtRooms.get(id), c = grid[Math.floor(roomIndex / 4)][roomIndex % 4];
    return { x: c.x, z: c.z0 + Math.min(1.1, c.depth / 3), y: c.floorY, cellId: c.id };
  };
  const PUMPS = [['zone_c','pump_c'], ['zone_e','pump_e'], ['zone_h','pump_h']].map(([zoneId, key], id) => ({ id, key, zoneId,
    name: `Trạm Bơm Khu ${zoneMap.get(zoneId).code}`, ...anchor(zoneId, 15), ry: 0, p: 0, done: false }));
  const SPAWN = { ...anchor('zone_a'), yaw: zoneMap.get('zone_a').teleYaw };
  const SPAWN_POINTS = [-1.7, 0, 1.7].flatMap(dx => [0, .9].map(dz => ({ x: SPAWN.x + dx, z: SPAWN.z + .2 + dz, y: 0 })));
  const END_POS = anchor('zone_j', 15), TASK_POS = anchor('zone_j', 12);
  const kCell = blueprint.districtRooms.get('zone_f')[1][1];
  const K_SPAWN = { x: kCell.x, z: kCell.z, y: kCell.floorY - .48 };
  return { customPoolrooms: true, POOL_ZONES: zones, POOL_CELLS: cells, POOL_GRAPH: blueprint.edges,
    POOL_ARCH, LIGHT_VOLUMES, SPIRAL_SLIDES, PUMPS, SPAWN, SPAWN_POINTS, END_POS, TASK_POS, K_SPAWN,...decoration,POOL_SKY_WINDOWS,
    _poolCellGrid: index, architectureVersion: 4, baseFloorY: -.3,
    atria: zones.map(z => ({ cx: z.center.x, cz: z.center.z, rx: 4, rz: 4, id: z.id })),
    ENTITY_ROUTES: [] };
}
