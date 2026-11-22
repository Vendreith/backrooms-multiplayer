/*! Copyright (c) 2026 Vendreith. Licensing: see LICENSE.md and THIRD_PARTY_NOTICES.md. */
/*!
 * Level 37 adaptation of "Sublimity" by egglord / Backrooms Wiki, CC BY-SA 3.0.
 * Original procedural implementation (c) 2026 Vendreith. See ATTRIBUTION.md.
 * Research images are never imported by runtime code.
 */

import { POOL_REFERENCE_PROFILES } from './poolrooms_references.js';
import { getPoolroomsArt } from './poolrooms_art.js';

// Metres, calibrated against the game's 1.62m eye / 0.42m maximum body radius.
// This module has no rendering dependencies: the exact playable blueprint can be
// measured and checked in Node before any meshes are allocated.
export const POOL_SCALE = Object.freeze({ district: 80, origin: 16, columns: 8, span: 672, wall: .28, bodyRadius: .42 });

const spec = (kind, width, depth, ceiling, feature, references, acoustic = 'small_corridor') => ({
  kind, width, depth, ceiling, floorY: 0, waterLevel: -.12, feature,
  sockets: ['n', 'e', 's', 'w'], collision: 'portal-cut perimeter + feature proxies',
  lighting: { range: 9, spill: .32 }, acoustics: { preset: acoustic, occlusion: 'wall-ray' },
  references, performance: ceiling > 7 ? 'landmark' : 'shared-static'
});

export const POOL_CELL_LIBRARY = Object.freeze({
  straight: spec('corridor', 3, 7, 2.8, 'straight', ['R40', 'R44']),
  elbow: spec('corridor', 3, 5, 2.8, 'elbow', ['R43']),
  s_bend: spec('corridor', 2.8, 6, 2.7, 's_bend', ['W02']),
  u_turn: spec('corridor', 3, 5, 2.8, 'u_turn', ['W02']),
  curved: spec('corridor', 3.5, 6, 3.2, 'curve', ['R49']),
  slope: spec('corridor', 3, 7, 3.1, 'slope', ['R27']),
  flooded: spec('corridor', 2.5, 8, 2.7, 'flood', ['W02']),
  low_tunnel: spec('corridor', 2.5, 6, 2.35, 'low', ['W02']),
  divided: spec('corridor', 4.5, 8, 3.2, 'divide', ['W01']),
  parallel: spec('corridor', 3, 7, 3, 'parallel', ['R44']),
  t_junction: spec('junction', 5, 5, 3, 't', ['R43']),
  cross: spec('junction', 5, 5, 3.2, 'cross', ['R43']),
  three_arch: spec('junction', 6, 6, 3.5, 'arches', ['W03']),
  split_height: spec('junction', 7, 7, 5.8, 'bridge', ['R27']),
  circular_junction: spec('junction', 6, 6, 3.7, 'circular', ['W03']),
  flooded_cross: spec('junction', 5.5, 5.5, 3, 'flood', ['W02']),
  stair_junction: spec('junction', 7, 6, 4, 'steps', ['R27']),
  channel_junction: spec('junction', 6, 7, 3.5, 'channel', ['W01']),
  pocket_pool: spec('room', 6, 7, 3.2, 'pool', ['W01']),
  circular_pool: spec('room', 8, 8, 4.3, 'circular', ['W03'], 'large_chamber'),
  column_room: spec('room', 7, 8, 3.6, 'column', ['W01', 'R08']),
  multi_basin: spec('room', 9, 9, 4, 'basins', ['R11']),
  half_flooded: spec('room', 6, 8, 3.3, 'half', ['W02']),
  vaulted: spec('room', 7, 9, 4.4, 'vault', ['R09']),
  curved_room: spec('room', 8, 7, 3.6, 'curve', ['R49']),
  double_height: spec('room', 8, 9, 6.5, 'bridge', ['R27'], 'large_chamber'),
  glass_room: spec('room', 7, 8, 3.5, 'glass', ['R54'], 'underwater_passage'),
  sunken: spec('room', 6, 7, 3.4, 'steps', ['W02']),
  raised: spec('room', 6, 8, 4.2, 'raised', ['R27']),
  short_stair: spec('vertical', 2.5, 4, 3.5, 'steps', ['R27']),
  submerged_stair: spec('vertical', 3, 5, 3.5, 'submerged', ['W02']),
  curved_stair: spec('vertical', 3.5, 6, 4.2, 'curve_steps', ['R27']),
  spiral_stair: spec('vertical', 7, 7, 6.5, 'spiral_steps', ['R27']),
  tiled_ramp: spec('vertical', 3, 7, 3.2, 'slope', ['R27']),
  bridge: spec('vertical', 2.5, 8, 6.5, 'bridge', ['R27']),
  balcony: spec('vertical', 3, 9, 6.5, 'raised', ['R27']),
  slide: spec('vertical', 2.5, 8, 5, 'slide', ['R61']),
  chute: spec('vertical', 2.5, 6, 3.2, 'chute', ['R63'])
});

export function createPoolroomsV4Zones(legacy) {
  const ordered = [...legacy].sort((a, b) => a.code.length - b.code.length || a.code.localeCompare(b.code));
  // Landmarks are geographically separated by districts of compact rooms.
  const slots = ordered.map((_, i) => i);
  for (const [id, target] of [['zone_al', 10], ['zone_am', 27], ['zone_an', 38]]) {
    const index = ordered.findIndex(z => z.id === id), at = slots.indexOf(target);
    [slots[index], slots[at]] = [slots[at], slots[index]];
  }
  return ordered.map((z, i) => {
    const col = slots[i] % 8, row = Math.floor(slots[i] / 8);
    const x0 = POOL_SCALE.origin + col * 80, z0 = POOL_SCALE.origin + row * 80;
    return { ...z, legacyBounds: { ...z.bounds }, gridColumn: col, gridRow: row,
      bounds: { x0, z0, x1: x0 + 80, z1: z0 + 80 }, center: { x: x0 + 35, z: z0 + 35 },
      teleX: x0 + 14, teleZ: z0 + 14, teleY: 0, teleYaw: -Math.PI / 2,
      fogDensity: Math.max(.009, (z.fogDensity || .002) * 3),
      hemiInt: .48, ambInt: .18, exposure: Math.max(.62, z.exposure || .8),
      references: POOL_REFERENCE_PROFILES[z.code].slice(0,3),
      architecturalIntent: POOL_REFERENCE_PROFILES[z.code][3], architectureVersion: 4 };
  });
}

function seeded(seed) {
  let a = seed | 0;
  return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t ^= t + Math.imul(t ^ t >>> 7, 61 | t); return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}

export function createPoolroomsBlueprint(zones, seed = 2026) {
  const random = seeded(seed), cells = [], edges = [], districtRooms = new Map(), edgeKeys = new Set();
  const addCell = (zone, module, x, z, extra = {}) => {
    const base = POOL_CELL_LIBRARY[module];
    const c = { ...base, ...extra, id: `${zone.id}:${cells.length}`, zoneId: zone.id, module, x, z, portals: [] };
    c.x0 = x - c.width / 2; c.x1 = x + c.width / 2; c.z0 = z - c.depth / 2; c.z1 = z + c.depth / 2;
    cells.push(c); return c;
  };
  const edge = (a, b, extra = {}) => {
    if (a === b) return;
    const key = [a.id, b.id].sort().join('|'); if (edgeKeys.has(key)) return;
    edgeKeys.add(key); edges.push({ a: a.id, b: b.id, ...extra });
  };
  const roomTypes = ['pocket_pool', 'column_room', 'sunken', 'vaulted', 'circular_pool', 'half_flooded', 'curved_room', 'multi_basin', 'glass_room', 'double_height', 'raised'];
  const themes = {
    zone_a: ['pocket_pool', 'three_arch', 'half_flooded', 'column_room'],
    zone_b: ['column_room', 'vaulted', 'circular_pool', 'three_arch'],
    zone_c: ['three_arch', 't_junction', 'cross', 'flooded_cross', 'pocket_pool', 'circular_junction'],
    zone_d: ['sunken', 'submerged_stair', 'stair_junction', 'vaulted'],
    zone_e: ['slide', 'raised', 'short_stair', 'half_flooded'],
    zone_f: ['half_flooded', 'double_height', 'glass_room', 'sunken'],
    zone_g: ['double_height', 'split_height', 'circular_pool', 'raised'],
    zone_h: ['channel_junction', 'sunken', 'half_flooded', 'column_room'],
    zone_i: ['circular_pool', 'pocket_pool', 'multi_basin', 'vaulted'],
    zone_j: ['channel_junction', 'multi_basin', 'three_arch', 'sunken'],
    zone_k: ['pocket_pool', 'half_flooded', 'column_room', 'three_arch'],
    zone_l: ['channel_junction', 'split_height', 'column_room', 'half_flooded'],
    zone_m: ['three_arch', 'vaulted', 'circular_pool', 'circular_junction'],
    zone_n: ['submerged_stair', 'sunken', 'curved_stair', 'stair_junction', 'tiled_ramp'],
    zone_o: ['half_flooded','circular_pool','pocket_pool','channel_junction'],
    zone_p: ['glass_room', 'glass_room', 'half_flooded', 'column_room'],
    zone_q: ['curved_room', 'curved_stair', 'chute', 'sunken'],
    zone_r: ['three_arch', 'channel_junction', 'circular_junction', 'vaulted'],
    zone_s: ['split_height', 'double_height', 'bridge', 'balcony'],
    zone_t: ['vaulted','column_room','pocket_pool','three_arch'],
    zone_u: ['vaulted','three_arch','sunken','half_flooded'],
    zone_v: ['curved_room','half_flooded','three_arch','circular_junction'],
    zone_w: ['sunken','column_room','half_flooded','glass_room'],
    zone_x: ['double_height', 'bridge', 'glass_room', 'half_flooded'],
    zone_y: ['curved_room','sunken','three_arch','pocket_pool'],
    zone_z: ['spiral_stair', 'circular_pool', 'column_room', 'curved_room'],
    zone_aa: ['pocket_pool','sunken','vaulted','half_flooded'],
    zone_ab: ['multi_basin','circular_pool','pocket_pool','channel_junction'],
    zone_ac: ['glass_room','sunken','half_flooded','submerged_stair'],
    zone_ad: ['three_arch','circular_pool','pocket_pool','column_room'],
    zone_ae: ['stair_junction','channel_junction','half_flooded','t_junction'],
    zone_af: ['vaulted','three_arch','half_flooded','column_room'],
    zone_ag: ['slide', 'chute', 'stair_junction', 'raised'],
    zone_ah: ['circular_pool','column_room','vaulted','circular_junction'],
    zone_ai: ['half_flooded','sunken','vaulted','column_room'],
    zone_aj: ['multi_basin','circular_pool','column_room','pocket_pool'],
    zone_ak: ['glass_room', 'double_height', 'balcony', 'circular_pool']
  };
  for (const [zi, zone] of zones.entries()) {
    const ox = zone.bounds.x0, oz = zone.bounds.z0;
    const art = getPoolroomsArt(zone.code);
    const landmark = ['zone_al', 'zone_am', 'zone_an'].includes(zone.id);
    const grid = Array.from({ length: 4 }, () => Array(4));
    if (art) {
      const [width,depth,ceiling]=art.size;
      const compact=Math.max(width,depth)<40;
      const hall=addCell(zone,'vaulted',ox+35,oz+(compact?35:46),{width,depth,ceiling,art,feature:'authored',medium:Math.max(width,depth)<40,landmark:width>=80?zone.id:undefined,authoredHall:Math.max(width,depth)>=40,acoustics:{preset:compact?'large_chamber':'vaulted_cathedral'},references:art.refs});
      const acousticDetails={tubes:[.27,.52,900],return_tubes:[.18,.46,1100],reverse_echo:[.29,.47,1350],shadow_arcade:[.18,.36,1150],drip:[.14,.38,2100],thermal:[.22,.34,1850],slide_cathedral:[.38,.58,2200],vertical_conduit:[.43,.6,1900]}[art.grammar];
      hall.acoustics={...hall.acoustics,delay:acousticDetails?.[0]??Math.min(.42,Math.max(.1,Math.hypot(width,depth)/343*1.5)),feedback:acousticDetails?.[1]??Math.min(.56,.22+ceiling*.016),cutoff:acousticDetails?.[2]??(ceiling>14?2600:1800),noteGap:6+ceiling*.3};
      const approach=[];
      if(compact){
        for(let row=0;row<4;row++)for(let col=0;col<4;col++){
          const theme=themes[zone.id]||roomTypes,module=zone.code==='A'&&row===0&&col===0?'three_arch':theme[(row*3+col+zi)%theme.length];
          grid[row][col]=(row===1||row===2)&&(col===1||col===2)?hall:addCell(zone,module,ox+14+col*14,oz+14+row*14,{floorY:row===2&&zi%3===0?.48:0});
        }
        // Retain V4's seeded spanning tree and optional short loops around the
        // authored hub; adjacent districts must not become identical grids.
        const visited=new Set([0]),stack=[0];
        while(stack.length){const cur=stack.at(-1),row=cur>>2,col=cur%4,options=[[row-1,col],[row,col+1],[row+1,col],[row,col-1]].filter(([r,c])=>r>=0&&r<4&&c>=0&&c<4&&!visited.has(r*4+c));if(!options.length){stack.pop();continue;}const[r,c]=options[Math.floor(random()*options.length)];edge(grid[row][col],grid[r][c]);visited.add(r*4+c);stack.push(r*4+c);}
        for(let row=0;row<4;row++)for(let col=0;col<4;col++){if(col<3&&random()<.55)edge(grid[row][col],grid[row][col+1],{shortcut:true});if(row<3&&random()<.55)edge(grid[row][col],grid[row+1][col],{shortcut:true});}
      }else{for(let col=0;col<4;col++){
        const module=['pocket_pool','column_room','vaulted','half_flooded'][(col+zi)%4];
        const a=addCell(zone,module,ox+14+col*14,oz+14);approach.push(a);edge(a,hall);if(col)edge(approach[col-1],a);
      }
      for(let row=0;row<4;row++)for(let col=0;col<4;col++)grid[row][col]=row===0?approach[col]:hall;}
      zone.art=art;zone.hemiSky=0xffefda;zone.hemiGround=0x487e76;zone.hemiInt=.3;zone.ambInt=.06;zone.exposure=.96;zone.fogDensity=.0025;
      zone.name=`Zone ${zone.code} — ${art.title}`;zone.desc=`${art.shape}; ${art.navigation}.`;
    } else if (landmark) {
      const dims = zone.id === 'zone_al' ? [72, 42, 11] : zone.id === 'zone_an' ? [72, 42, 10] : [44, 30, 8];
      const hall = addCell(zone, 'vaulted', ox + 40, oz + 49, { width: dims[0], depth: dims[1], ceiling: dims[2], landmark: zone.id, feature: zone.id, acoustics: { preset: 'vaulted_cathedral' }, references: ['W03', 'R06', 'R57'] });
      for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) grid[r][c] = hall;
      const approach = [];
      for (let c = 0; c < 4; c++) {
        const a = addCell(zone, c % 2 ? 'column_room' : 'pocket_pool', ox + (zone.id === 'zone_am' ? 20 + c * 12 : 14 + c * 14), oz + 14);
        grid[0][c] = a; approach.push(a); edge(a, hall);
        if (c) edge(approach[c - 1], a);
      }
    } else {
      let medium = null;
      if (['zone_b', 'zone_j', 'zone_ah', 'zone_ai', 'zone_aj'].includes(zone.id)) {
        medium = addCell(zone, 'multi_basin', ox + 35, oz + 35, { width: 22, depth: 22, ceiling: 6, medium: true });
      }
      for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) {
        if (medium && r > 0 && r < 3 && c > 0 && c < 3) { grid[r][c] = medium; continue; }
        const theme = themes[zone.id] || roomTypes;
        const module = theme[(r * 3 + c + zi) % theme.length];
        grid[r][c] = addCell(zone, module, ox + 14 + c * 14, oz + 14 + r * 14, { floorY: r === 2 && (zi % 3 === 0) ? .48 : 0 });
      }
      // Depth-first spanning tree: every room is reachable before loops are added.
      const visited = new Set([0]), stack = [0];
      while (stack.length) {
        const cur = stack[stack.length - 1], r = cur >> 2, c = cur % 4;
        const options = [[r - 1, c], [r, c + 1], [r + 1, c], [r, c - 1]].filter(([rr, cc]) => rr >= 0 && rr < 4 && cc >= 0 && cc < 4 && !visited.has(rr * 4 + cc));
        if (!options.length) { stack.pop(); continue; }
        const [rr, cc] = options[Math.floor(random() * options.length)];
        edge(grid[r][c], grid[rr][cc]); visited.add(rr * 4 + cc); stack.push(rr * 4 + cc);
      }
      // Controlled optional loops, including narrow secret alcove approaches.
      for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) {
        if (c < 3 && random() < .55) edge(grid[r][c], grid[r][c + 1], { shortcut: true, hidden: random() < .12 });
        if (r < 3 && random() < .55) edge(grid[r][c], grid[r + 1][c], { shortcut: true });
      }
    }
    districtRooms.set(zone.id, grid);
    const spawn = grid[0][0]; zone.teleX = spawn.x; zone.teleZ = spawn.z - spawn.depth / 2 + 1.25; zone.teleY = spawn.floorY;
  }
  // Physical district links: short cells and two right-angle bends, never a 100m hall.
  const slots = new Map(zones.map(z => [`${z.gridColumn},${z.gridRow}`, z]));
  for (const zone of zones) {
    const grid = districtRooms.get(zone.id);
    for (const [dc, dr] of [[1, 0], [0, 1]]) {
      const other = slots.get(`${zone.gridColumn + dc},${zone.gridRow + dr}`); if (!other) continue;
      const next = districtRooms.get(other.id);
      edge(dc ? grid[1][3] : grid[3][2], dc ? next[1][0] : next[0][2], { districtLink: true });
    }
  }
  const rooms = [...cells], lookup = new Map(cells.map(c => [c.id, c]));
  const rawEdges = [...edges]; edges.length = 0;
  const connectCells = (a, b, width, flags) => {
    const dx = b.x - a.x, dz = b.z - a.z;
    const alongX = Math.abs(dx) >= Math.abs(dz), dir = alongX ? (dx > 0 ? 'e' : 'w') : (dz > 0 ? 's' : 'n');
    const reverse = { e: 'w', w: 'e', n: 's', s: 'n' }[dir];
    const axisA = alongX ? a.z : a.x, axisB = alongX ? b.z : b.x;
    // Straight links only occur between aligned cell centres. Landmark portals
    // attach at the approach's projection on the hall perimeter.
    const portalAt = Math.abs(axisA - axisB) > .01 ? (a.landmark ? axisB : axisA) : axisA;
    const pA = { side: dir, at: portalAt, width, height: 2.35, floorY: a.floorY };
    const pB = { side: reverse, at: portalAt, width, height: 2.35, floorY: b.floorY };
    a.portals.push(pA); b.portals.push(pB);
    edges.push({ ...flags, a: a.id, b: b.id, width, length: Math.hypot(dx, dz), restriction: 'walk' });
  };
  for (const [ei, link] of rawEdges.entries()) {
    const a = lookup.get(link.a), b = lookup.get(link.b), zone = zones.find(z => z.id === a.zoneId);
    const horizontal = Math.abs(b.x - a.x) > Math.abs(b.z - a.z);
    const width = Math.min(link.hidden ? 2.5 : [2.5, 3, 3.5, 4][ei % 4], horizontal ? Math.min(a.depth, b.depth) : Math.min(a.width, b.width));
    // At a landmark, project the small approach to a hall side.
    const shared = horizontal
      ? Math.max(Math.max(a.z0, b.z0) + width / 2, Math.min(Math.min(a.z1, b.z1) - width / 2, (a.landmark || a.medium) ? b.z : a.z))
      : Math.max(Math.max(a.x0, b.x0) + width / 2, Math.min(Math.min(a.x1, b.x1) - width / 2, (a.landmark || a.medium) ? b.x : a.x));
    const clamp = (v, min, max) => Math.max(min + width / 2, Math.min(max - width / 2, v));
    const from = horizontal ? [b.x > a.x ? a.x1 : a.x0, clamp(shared, a.z0, a.z1)] : [clamp(shared, a.x0, a.x1), b.z > a.z ? a.z1 : a.z0];
    const to = horizontal ? [b.x > a.x ? b.x0 : b.x1, clamp(shared, b.z0, b.z1)] : [clamp(shared, b.x0, b.x1), b.z > a.z ? b.z0 : b.z1];
    let points = [from, to];
    if(Math.abs(from[0]-to[0])>.01&&Math.abs(from[1]-to[1])>.01){
      const mid=horizontal?(from[0]+to[0])/2:(from[1]+to[1])/2;
      points=horizontal?[from,[mid,from[1]],[mid,to[1]],to]:[from,[from[0],mid],[to[0],mid],to];
    }
    const bent = !link.districtLink && ei % 3 === 0 && Math.hypot(to[0] - from[0], to[1] - from[1]) > 5;
    if (bent) {
      const offset = 3.5, u = .28, v = .72;
      points = horizontal
        ? [from, [from[0] + (to[0] - from[0]) * u, from[1]], [from[0] + (to[0] - from[0]) * u, from[1] + offset], [from[0] + (to[0] - from[0]) * v, from[1] + offset], [from[0] + (to[0] - from[0]) * v, to[1]], to]
        : [from, [from[0], from[1] + (to[1] - from[1]) * u], [from[0] + offset, from[1] + (to[1] - from[1]) * u], [from[0] + offset, from[1] + (to[1] - from[1]) * v], [to[0], from[1] + (to[1] - from[1]) * v], to];
    }
    if (link.districtLink) {
      // Stagger seams to prevent a continuous long sightline across districts.
      const mid = horizontal ? (from[0] + to[0]) / 2 : (from[1] + to[1]) / 2;
      points = horizontal ? [from, [mid - 3, from[1]], [mid - 3, from[1] + 5], [mid + 3, from[1] + 5], [mid + 3, to[1]], to]
        : [from, [from[0], mid - 3], [from[0] + 5, mid - 3], [from[0] + 5, mid + 3], [to[0], mid + 3], to];
    }
    let prev = a;
    const chain = [];
    for (let pi = 0; pi < points.length - 1; pi++) {
      const p = points[pi], q = points[pi + 1], dx = q[0] - p[0], dz = q[1] - p[1];
      const len = Math.hypot(dx, dz); if (len < .1) continue;
      const pieces = Math.ceil(len / 10);
      for (let k = 0; k < pieces; k++) {
        const t = (k + .5) / pieces, alongX = Math.abs(dx) > Math.abs(dz);
        const module = bent ? ['s_bend', 'u_turn', 'curved'][Math.floor(ei / 3) % 3] : link.districtLink ? (pi % 2 ? 'elbow' : 'straight') : (ei % 9 === 0 ? 'low_tunnel' : ['straight','flooded','divided','parallel','slope'][ei % 5]);
        const floorY = a.floorY + (b.floorY - a.floorY) * t;
        const cell = addCell(zone, module, p[0] + dx * t, p[1] + dz * t, {
          width: alongX ? len / pieces + (points.length>2 ? width : 0) : width,
          depth: alongX ? width : len / pieces + (points.length>2 ? width : 0),
          clearWidth: width, axis: alongX ? 'x' : 'z', floorY, floorStart: a.floorY, floorEnd: b.floorY,
          routeLength: len / pieces, kind: 'corridor', corridorLink: ei, hidden: !!link.hidden,
          references: link.districtLink ? ['W02', 'R44'] : ['W02'],
          ceiling: module === 'low_tunnel' ? 2.35 : 2.9
        });
        chain.push(cell); connectCells(prev, cell, width, link); prev = cell;
      }
    }
    if (chain.length) connectCells(prev, b, width, link); else connectCells(a, b, width, link);
  }
  for (const zone of zones) {
    const c = districtRooms.get(zone.id)[0][0], p = c.portals[0];
    if (p) {
      const tx = p.side === 'e' ? c.x1 : p.side === 'w' ? c.x0 : p.at;
      const tz = p.side === 's' ? c.z1 : p.side === 'n' ? c.z0 : p.at;
      zone.teleYaw = Math.atan2(-(tx-zone.teleX), -(tz-zone.teleZ));
    }
  }
  return { version: 4, seed, zones, cells, edges, rooms: rooms.map(c => c.id), districtRooms };
}

export function getPoolroomsCellAt(x, z, map) {
  const cells = map?._poolCellGrid?.queryNear(x, z, 0) || map?.POOL_CELLS || [];
  return cells.find(c => x >= c.x0 && x <= c.x1 && z >= c.z0 && z <= c.z1) || null;
}
