import { SpatialGrid2D } from './engine.js';
import { LEVEL_LIST } from './levels/catalog.js';
import { getTerrainAt } from './levels/terrain.js';
import {
  C, WALL_HALF_T, WH, N, S, MID, NTASK, NHOOK, NWATER, NSCAN, NJELLY, NRATION, NFLARE, CRAWL_H,
  TASK_SYMBOLS, GUIDE_TYPES, ENTITY_ARCHETYPES
} from './constants.js';

export function mulberry32(seed) {
  let a = seed | 0;
  return () => {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const ZONE_TYPES = [
  'manila',
  'arches',
  'huge_pitfall',
  'pitfalls',
  'poolrooms',
  'wet_concrete',
  'blackout',
  'redrooms',
  'colonnade',
  'office',
  'crawl_bay',
  'mold_utility',
  'monolith_maze',
  // 12 New Kane Pixels Complex & Level 0 Expanded Sectors:
  'async_threshold',
  'suburb_pitfalls',
  'red_city',
  'null_kx_glitch',
  'async_archive',
  'flooded_sump',
  'breaker_vault',
  'gravity_error',
  'ceiling_plenum',
  'still_life_relay',
  'fluorescent_greenhouse',
  'stairwell_loop',
  // 8 New Found Footage #1 & Found Footage #2 Iconic Video Sectors:
  'ff1_ladder_hatch',
  'ff1_dont_move',
  'ff1_white_gallery',
  'ff1_filing_corridor',
  'ff2_tape_kitchen',
  'ff2_crashed_car',
  'ff2_hardwood_home',
  'ff2_vine_plasma',
  // 15 Photorealistic Liminal Scene Sectors (Giant Expansions & High-Detail Narrow Chambers):
  'flooded_yellow_hall',
  'mb_courtyard',
  'mb_mall_atrium',
  'mb_red_skybridge',
  'mb_brick_alcove_hall',
  'mb_bicycle_tripod',
  'mb_library_fan_hall',
  'mb_unrealized_mural',
  'mb_diner_fridge',
  'mb_van_tunnel',
  'mb_grey_basement',
  'mb_cctv_cove',
  'mb_dining_blue_drapes',
  'mb_gold_tile_blood',
  'mb_floating_wall_glitch'
];

/**
 * Determines which physical floor material a world coordinate rests on (for surface-reactive footsteps).
 */
export function getSurfaceAt(x, z, map) {
  if (!map) return 'carpet';
  if (map.levelId && map.levelId !== 'level0') {
    const tr = getTerrainAt(x, z, map, 0);
    if (tr.inWater) return 'water';
    if (tr.surfaceKind === 'slide' || tr.surfaceKind === 'tile') return 'tile';
    if (tr.surfaceKind === 'metal') return 'metal';
    if (tr.surfaceKind === 'grass' || tr.surfaceKind === 'sand' || tr.surfaceKind === 'carpet') return 'carpet';
    if (tr.surfaceKind === 'concrete' || tr.surfaceKind === 'stone' || tr.surfaceKind === 'asphalt' || tr.surfaceKind === 'wood') return 'concrete';
    return 'tile';
  }
  if (map.CATWALKS) {
    for (const cw of map.CATWALKS) {
      if (x >= cw.x0 && x <= cw.x1 && z >= cw.z0 && z <= cw.z1) return 'metal';
    }
  }
  if (map.FLOOR_PATCHES) {
    for (const fp of map.FLOOR_PATCHES) {
      if (x >= fp.x && x <= fp.x + fp.w && z >= fp.z && z <= fp.z + fp.d) {
        if (fp.kind === 'concrete' || fp.kind === 'async_hazard' || fp.kind === 'asphalt' || fp.kind === 'brick') return 'concrete';
        if (fp.kind === 'rust_metal') return 'metal';
        if (fp.kind === 'pool_tile' || fp.kind === 'terrazzo' || fp.kind === 'sump' || fp.kind === 'hardwood' || fp.kind === 'white_tile' || fp.kind === 'cream_tile' || fp.kind === 'dark_flood') return 'tile';
        return 'carpet';
      }
    }
  }
  return 'carpet';
}

/**
 * Returns regional atmospheric fog & ambient color mood at world coordinates (x, z).
 */
export function getZoneAtmosphereAt(x, z, map) {
  if (map?.levelCfg && map.levelId !== 'level0') {
    const cfg = map.levelCfg;
    return {
      fogHex: cfg.fogColor ?? 0x161205,
      hemiSky: cfg.hemiSky ?? 0xd8e0e8,
      hemiGnd: cfg.hemiGround ?? 0x26200d,
      exposure: cfg.isOutdoor ? 1.05 : 1.02
    };
  }
  const gC = map?.cellSize || C;
  const c = Math.floor(x / gC), r = Math.floor(z / gC);
  const zt = map?.ZONES?.find(zn => c >= zn.c0 && c <= zn.c1 && r >= zn.r0 && r <= zn.r1)?.type || 'monolith_maze';
  if (zt === 'redrooms' || zt === 'red_city' || zt === 'mb_red_skybridge') {
    return { fogHex: 0x260605, hemiSky: 0xff7e6e, hemiGnd: 0x3b0c09, exposure: 1.06 };
  }
  if (zt === 'poolrooms' || zt === 'flooded_sump' || zt === 'flooded_yellow_hall') {
    return { fogHex: 0x0b1916, hemiSky: 0xa6f2e2, hemiGnd: 0x16322b, exposure: 1.02 };
  }
  if (zt === 'mb_bicycle_tripod' || zt === 'fluorescent_greenhouse' || zt === 'breaker_vault') {
    return { fogHex: 0x12190a, hemiSky: 0xc8eb78, hemiGnd: 0x263512, exposure: 1.03 };
  }
  if (zt === 'mb_grey_basement' || zt === 'ff1_white_gallery' || zt === 'ff1_filing_corridor') {
    return { fogHex: 0x191b1f, hemiSky: 0xe6ebf2, hemiGnd: 0x2a2e38, exposure: 1.02 };
  }
  if (zt === 'mb_gold_tile_blood') {
    return { fogHex: 0x281506, hemiSky: 0xffb868, hemiGnd: 0x3a200a, exposure: 1.03 };
  }
  if (zt === 'suburb_pitfalls' || zt === 'mb_courtyard' || zt === 'colonnade' || zt === 'mb_mall_atrium') {
    return { fogHex: 0x221d0e, hemiSky: 0xfff0be, hemiGnd: 0x3b3119, exposure: 1.02 };
  }
  if (zt === 'blackout' || zt === 'office' || zt === 'mb_unrealized_mural' || zt === 'mb_van_tunnel') {
    return { fogHex: 0x0b0905, hemiSky: 0xd4c28e, hemiGnd: 0x18140a, exposure: 1.02 };
  }
  return { fogHex: 0x161207, hemiSky: 0xf6df82, hemiGnd: 0x26200d, exposure: 1.06 };
}

/**
 * Computes normalized local ceiling illumination around (x, z) in [0..1] for smooth iris/zone adaptation
 * between pitch-dark pockets and overexposed bright vintage-film areas.
 */
export function getZoneLuminanceAt(x, z, map) {
  if (map?.levelCfg && map.levelId !== 'level0') {
    if (map.levelCfg.id === 'level6') return 0.04;
    if (map.levelCfg.isOutdoor || map.levelCfg.hasSkylights) return 0.85;
  }
  if (!map || !map.LIGHTS) return 0.5;
  const R = 15.0;
  const R2 = R * R;
  let wSum = 0;
  let litSum = 0;
  for (const l of map.LIGHTS) {
    const dx = l.x - x, dz = l.z - z;
    const d2 = dx * dx + dz * dz;
    if (d2 > R2) continue;
    const w = 1.0 - Math.sqrt(d2) / R;
    wSum += w;
    if (!l.dead) {
      const g = l.gain ?? (l.bright ? 1.15 : l.red ? 0.55 : 0.62);
      litSum += w * g;
    }
  }
  if (wSum < 1e-4) return 0.3;
  return Math.max(0, Math.min(1, litSum / wSum));
}

/**
 * Generates a massive 5x larger (94x94 = 338m x 338m) Backrooms Level 0 labyrinth featuring:
 * - Thick monolithic block walls (1.04m+ & full-cell pillars)
 * - Huge bottomless Pitfalls abyss halls bridged by suspended metal catwalks
 * - Varied floor zones (Poolrooms tiles, Wet Concrete, Terrazzo Lobby, Red Carpet, Office Squares)
 * - Curious liminal anomalies (Ceiling-bound Staircases, Freestanding Doors, Static CRT Monitor Banks, Tilted Pillars)
 */
export function genMap(seed = 1337) {
  const rnd = mulberry32(seed);
  const RECTS = [];
  const wallGrid = new SpatialGrid2D(C);
  const hw = WALL_HALF_T; // 0.52m half-width -> 1.04m thick solid block walls!

  const midX = (N / 2) * C;
  const exitW = 3.4;

  // Outer monolithic perimeter blocks
  RECTS.push({ x0: 0, z0: -hw, x1: midX - exitW / 2, z1: hw, y0: 0, y1: WH, h: WH, kind: 'perim', style: 'yellow' });
  RECTS.push({ x0: midX + exitW / 2, z0: -hw, x1: N * C, z1: hw, y0: 0, y1: WH, h: WH, kind: 'perim', style: 'yellow' });
  RECTS.push({ x0: 0, z0: N * C - hw, x1: midX - exitW / 2, z1: N * C + hw, y0: 0, y1: WH, h: WH, kind: 'perim', style: 'yellow' });
  RECTS.push({ x0: midX + exitW / 2, z0: N * C - hw, x1: N * C, z1: N * C + hw, y0: 0, y1: WH, h: WH, kind: 'perim', style: 'yellow' });
  RECTS.push({ x0: -hw, z0: 0, x1: hw, z1: N * C, y0: 0, y1: WH, h: WH, kind: 'perim', style: 'yellow' });
  RECTS.push({ x0: N * C - hw, z0: 0, x1: N * C + hw, z1: N * C, y0: 0, y1: WH, h: WH, kind: 'perim', style: 'yellow' });

  const EXITS = [
    { x: midX, z: 0.0, side: 'N', dirZ: -1, open: 0, p: 0, done: false },
    { x: midX, z: N * C, side: 'S', dirZ: 1, open: 0, p: 0, done: false }
  ];

  // Track walkable vs solid monolith block cells (0 = walkable, 1 = solid/void block)
  const cellSolid = Array.from({ length: N }, () => new Uint8Array(N));
  const cellZone = Array.from({ length: N }, () => new Int8Array(N).fill(-1));

  const halfN = N >> 1; // 62 on 124x124 (~471m x 471m bounded infinite Complex!)
  // Core navigation hubs (Central Colonnade Lobby, North Exit Sector, South A-Sync Threshold Entry)
  const coreHubs = [
    { c0: halfN - 8, r0: halfN - 7, c1: halfN + 9, r1: halfN + 9, type: 'colonnade', label: 'Grand Pillared Hall' },
    { c0: halfN - 5, r0: 1,         c1: halfN + 5, r1: 8,         type: 'monolith_maze', label: 'North Exit Sector' },
    { c0: halfN - 6, r0: N - 12,    c1: halfN + 6, r1: N - 2,     type: 'async_threshold', label: 'A-Sync Threshold Entry' }
  ];

  // Liminal interlocking geography: GIANT expanded megahalls bordered by narrow high-detail scene chambers!
  const ZONES = [...coreHubs];
  const anchorTemplates = [
    // --- NORTH BAND (r: 2..17) ---
    { type: 'red_city',               w: 19, h: 14, c0: 2,  r0: 2  }, // GIANT Red City Pipe Atrium
    { type: 'mb_red_skybridge',       w: 9,  h: 10, c0: 22, r0: 2  }, // Narrow Crimson Night-City Skybridge (055134)
    { type: 'office',                 w: 22, h: 14, c0: 33, r0: 2  }, // GIANT Dark Cubicles -> Bright Pillar Atrium (055213)
    { type: 'poolrooms',              w: 19, h: 15, c0: 69, r0: 2  }, // GIANT Poolrooms & Cream Ceramic Nave (055454)
    { type: 'mb_brick_alcove_hall',   w: 11, h: 9,  c0: 89, r0: 2  }, // Narrow Brick Corridor & Golden Window Beams (055234/055255)
    { type: 'arches',                 w: 19, h: 15, c0: 102, r0: 2 }, // GIANT Water Arches Hall

    // --- UPPER-MID BAND (r: 18..35) ---
    { type: 'mb_bicycle_tripod',      w: 10, h: 9,  c0: 2,  r0: 18 }, // Dark Bike Bend -> Mint Tripod Chamber (055407)
    { type: 'huge_pitfall',           w: 20, h: 15, c0: 14, r0: 18 }, // GIANT NW Pitfalls Chasm Hall
    { type: 'mb_unrealized_mural',    w: 10, h: 9,  c0: 36, r0: 18 }, // Torn-Wall "UNREALIZED" Mural + Corner Spotlight (055516/055509)
    { type: 'fluorescent_greenhouse', w: 9,  h: 9,  c0: 48, r0: 18 }, // Narrow Mint-Glare Wing
    { type: 'async_threshold',        w: 10, h: 9,  c0: 58, r0: 18 }, // North A-Sync Threshold Outpost
    { type: 'ff2_crashed_car',        w: 10, h: 9,  c0: 69, r0: 19 }, // FF#2 Wrecked 1980s Sedan + Skylight
    { type: 'mb_van_tunnel',          w: 10, h: 9,  c0: 80, r0: 19 }, // Dark Turn + Parked Van + DOLLAR GENER Tunnel (055546/055616)
    { type: 'ff1_filing_corridor',    w: 10, h: 9,  c0: 92, r0: 19 }, // FF#1 White Corridor + Filing Cabinets + Keep Clear
    { type: 'blackout',               w: 17, h: 16, c0: 104, r0: 19 }, // GIANT Blackout Shadow Wing

    // --- MIDDLE TRANSITION BAND (r: 29..43) ---
    { type: 'mb_dining_blue_drapes',  w: 11, h: 11, c0: 2,  r0: 29 }, // Blue Curtains Dining Room + Stepped Zigzag Door (055733)
    { type: 'mold_utility',           w: 10, h: 8,  c0: 15, r0: 34 }, // Narrow Utility Maintenance Bay
    { type: 'flooded_yellow_hall',    w: 19, h: 14, c0: 35, r0: 29 }, // GIANT Flooded Yellow Colonnade (055317)
    { type: 'ff1_white_gallery',      w: 12, h: 11, c0: 56, r0: 30 }, // FF#1 White Gallery + 3x5 Atrium + Dumpster
    { type: 'async_archive',          w: 11, h: 11, c0: 69, r0: 30 }, // KV-31 Archive Cabinet Rows
    { type: 'mb_diner_fridge',        w: 10, h: 10, c0: 82, r0: 30 }, // Diner w/ Sunken Silver Fridges & Neon OPEN (055535)
    { type: 'gravity_error',          w: 9,  h: 10, c0: 94, r0: 30 }, // Inverted Desks & Ghost Chairs
    { type: 'wet_concrete',           w: 17, h: 14, c0: 104, r0: 37 }, // GIANT Brutalist Wet Concrete Hall

    // --- CENTRAL LIMINAL NEXUS (r: 43..56) ---
    { type: 'mb_mall_atrium',         w: 20, h: 15, c0: 2,  r0: 43 }, // GIANT 1990s Shopping Mall + Sunken Grocery Shelves (055522/055528)
    { type: 'ff2_hardwood_home',      w: 10, h: 9,  c0: 23, r0: 44 }, // FF#2 Hardwood Balustrade House
    { type: 'mb_floating_wall_glitch',w: 17, h: 9,  c0: 35, r0: 45 }, // Suspended Ceiling Block + Cribs + Chair Pile (055756/055805)
    { type: 'mb_library_fan_hall',    w: 11, h: 9,  c0: 56, r0: 44 }, // Tiled Threshold -> Fan Bookcase + STOP Portal (055447/055630/055701)
    { type: 'ff1_dont_move',          w: 10, h: 9,  c0: 70, r0: 44 }, // FF#1 DON'T MOVE Wall + Recursive Portals
    { type: 'mb_gold_tile_blood',     w: 11, h: 10, c0: 82, r0: 42 }, // Luminous Gold Squares + Blood Streak + Trash (055738)
    { type: 'stairwell_loop',         w: 9,  h: 10, c0: 94, r0: 43 }, // Endless Stairwell Loop
    { type: 'redrooms',               w: 17, h: 16, c0: 104, r0: 53 }, // GIANT Crimson Redrooms

    // --- LOWER-MID BAND (r: 55..87) ---
    { type: 'flooded_sump',           w: 16, h: 15, c0: 2,  r0: 60 }, // GIANT Flooded Cistern Sump
    { type: 'null_kx_glitch',         w: 12, h: 11, c0: 19, r0: 56 }, // West Null KX Missing Texture Zone
    { type: 'mb_cctv_cove',           w: 9,  h: 11, c0: 33, r0: 56 }, // CCTV & Floor Hatch Cove + Amber Chairs Wall Hole (055649/055655/055726)
    { type: 'manila',                 w: 8,  h: 11, c0: 44, r0: 56 }, // Warm Bright Manila Room
    { type: 'huge_pitfall',           w: 16, h: 15, c0: 73, r0: 55 }, // GIANT East Pitfalls Chasm
    { type: 'ff2_vine_plasma',        w: 12, h: 12, c0: 90, r0: 55 }, // FF#2 Bacteria Vine Nest + Plasma Rift + CRT TV
    { type: 'breaker_vault',          w: 16, h: 15, c0: 73, r0: 72 }, // GIANT Green-Neon Substation Vault
    { type: 'pitfalls',               w: 17, h: 16, c0: 104, r0: 71 }, // GIANT Square Pitfalls Grate Hall

    // --- SOUTH BAND (r: 71..111) ---
    { type: 'suburb_pitfalls',        w: 20, h: 17, c0: 2,  r0: 77 }, // GIANT Indoor Suburban Road + Houses + Ceiling Fan (055746)
    { type: 'mb_courtyard',           w: 18, h: 16, c0: 24, r0: 71 }, // GIANT 3-Story Apartment Courtyard + Trees & Globes (055429)
    { type: 'mb_grey_basement',       w: 10, h: 11, c0: 44, r0: 73 }, // Cool Grey Basement + Oak Stairs + Blue Tape Door (055641)
    { type: 'crawl_bay',              w: 15, h: 12, c0: 56, r0: 73 }, // Tight Crawlspace Maze
    { type: 'still_life_relay',       w: 14, h: 14, c0: 2,  r0: 96 }, // Still-Life Bio-Veins & CRT Relay
    { type: 'ceiling_plenum',         w: 16, h: 15, c0: 18, r0: 90 }, // Collapsed Ceiling Plenum
    { type: 'ff1_ladder_hatch',       w: 12, h: 11, c0: 36, r0: 87 }, // FF#1 Wall Hatch & Silver Ladder
    { type: 'ff2_tape_kitchen',       w: 12, h: 11, c0: 50, r0: 87 }, // FF#2 Blue Tape # + Kitchenette + L-Sofa
    { type: 'monolith_maze',          w: 16, h: 14, c0: 65, r0: 89 }, // Monolith Thick-Wall Core
    { type: 'null_kx_glitch',         w: 19, h: 16, c0: 83, r0: 89 }, // GIANT East Null KX Anomaly Hall
    { type: 'red_city',               w: 16, h: 17, c0: 104, r0: 90 }  // GIANT SE Red City Annex
  ];

  for (const tpl of anchorTemplates) {
    ZONES.push({ c0: tpl.c0, r0: tpl.r0, c1: tpl.c0 + tpl.w, r1: tpl.r0 + tpl.h, type: tpl.type });
  }

  for (let zi = 0; zi < ZONES.length; zi++) {
    const z = ZONES[zi];
    for (let r = z.r0; r <= z.r1; r++) {
      for (let c = z.c0; c <= z.c1; c++) {
        if (r > 0 && r < N - 1 && c > 0 && c < N - 1 && cellZone[r][c] === -1) {
          cellZone[r][c] = zi;
        }
      }
    }
  }

  const getZoneTypeAt = (r, c) => {
    const zi = cellZone[r]?.[c] ?? -1;
    return zi >= 0 ? ZONES[zi].type : 'monolith_maze';
  };

  // Edge walls: 0=open, 1=thick wall, 2=crawl cutout, 3=archway, 4=half-wall
  const hEdges = Array.from({ length: N + 1 }, () => new Uint8Array(N));
  const vEdges = Array.from({ length: N }, () => new Uint8Array(N + 1));

  const isProtectedCell = (r, c) => {
    if (r <= 7 && Math.abs(c - halfN) <= 3) return true;
    if (r >= N - 8 && Math.abs(c - halfN) <= 3) return true;
    if (r >= halfN - 3 && r <= halfN + 3 && c >= halfN - 3 && c <= halfN + 3) return true;
    return false;
  };

  // Pre-carve HUGE Pitfall Chambers BEFORE walls so catwalks stay continuous & abyss gaps never get walled off!
  const hugeChasms = []; // { x0, z0, x1, z1 } abyss rectangles
  const CATWALKS = [];   // Metal walkway slabs above abyss
  for (const z of ZONES) {
    if (z.type !== 'huge_pitfall') continue;
    const midC = (z.c0 + z.c1) >> 1;
    const midR = (z.r0 + z.r1) >> 1;
    hugeChasms.push({
      c0: z.c0 + 1, c1: z.c1 - 1, r0: z.r0 + 1, r1: z.r1 - 1,
      midC, midR,
      x0: (z.c0 + 1) * C, z0: (z.r0 + 1) * C,
      x1: z.c1 * C, z1: z.r1 * C
    });
    // Mark abyss interior cells as solid/non-walkable EXCEPT the cross-shaped central catwalk bridges & outer ring!
    for (let r = z.r0 + 1; r < z.r1; r++) {
      for (let c = z.c0 + 1; c < z.c1; c++) {
        const isBridge = Math.abs(c - midC) <= 0 || Math.abs(r - midR) <= 0;
        if (isBridge) {
          CATWALKS.push({ x0: c * C, z0: r * C, x1: (c + 1) * C, z1: (r + 1) * C });
        } else {
          cellSolid[r][c] = 2; // 2 = bottomless abyss void!
        }
      }
    }
  }

  // 1. Place solid full-cell Monolith Blocks & Wet Concrete Pillars
  for (let r = 2; r < N - 2; r += 2) {
    for (let c = 2; c < N - 2; c += 2) {
      if (cellSolid[r][c] || isProtectedCell(r, c)) continue;
      const zt = getZoneTypeAt(r, c);
      if (zt === 'monolith_maze' && rnd() < 0.30) cellSolid[r][c] = 1;
      else if (zt === 'mold_utility' && rnd() < 0.24) cellSolid[r][c] = 1;
      else if (zt === 'wet_concrete' && rnd() < 0.20) cellSolid[r][c] = 1;
    }
  }

  // 2. Partition thick block walls + zone-specific architectural features
  const openHallZones = new Set([
    'pitfalls', 'huge_pitfall', 'colonnade', 'poolrooms', 'flooded_yellow_hall',
    'async_threshold', 'suburb_pitfalls', 'red_city', 'null_kx_glitch',
    'flooded_sump', 'breaker_vault', 'ceiling_plenum', 'still_life_relay',
    'fluorescent_greenhouse',
    'ff1_ladder_hatch', 'ff1_dont_move', 'ff1_white_gallery',
    'ff2_tape_kitchen', 'ff2_crashed_car', 'ff2_hardwood_home', 'ff2_vine_plasma',
    'mb_courtyard', 'mb_mall_atrium', 'mb_diner_fridge', 'mb_grey_basement',
    'mb_dining_blue_drapes', 'mb_gold_tile_blood', 'mb_floating_wall_glitch',
    'mb_unrealized_mural', 'mb_cctv_cove'
  ]);
  for (let r = 1; r < N - 1; r++) {
    for (let c = 1; c < N - 1; c++) {
      if (cellSolid[r][c] || isProtectedCell(r, c)) continue;
      const zt = getZoneTypeAt(r, c);

      if (openHallZones.has(zt)) {
        if (zt === 'null_kx_glitch' && (r % 3 === 0 || c % 3 === 0) && rnd() < 0.28) {
          if (rnd() < 0.5) hEdges[r][c] = 3; else vEdges[r][c] = 3;
        } else if (zt === 'mb_unrealized_mural' && (r % 3 === 0) && rnd() < 0.35) {
          vEdges[r][c] = 3; // narrow doorway portal framing STOP sign & corner mural
        } else if (zt === 'mb_cctv_cove' && rnd() < 0.18) {
          if (rnd() < 0.5) hEdges[r][c] = 4; else vEdges[r][c] = 4; // low amber half-walls
        } else if (zt === 'mb_floating_wall_glitch' && (r % 4 === 0) && rnd() < 0.24) {
          hEdges[r][c] = 2; // waist-high crawl cutout passage
        }
        continue;
      }

      if (zt === 'manila') {
        const z = ZONES[cellZone[r][c]];
        if (r === z.r0 && Math.abs(c - ((z.c0 + z.c1) >> 1)) > 0) hEdges[r][c] = 1;
        if (c === z.c0 && Math.abs(r - ((z.r0 + z.r1) >> 1)) > 0) vEdges[r][c] = 1;
        continue;
      }

      if (zt === 'arches') {
        if ((c % 2 === 0) && rnd() < 0.65) vEdges[r][c] = 3;
        if ((r % 2 === 0) && rnd() < 0.32) hEdges[r][c] = 3;
        continue;
      }

      if (zt === 'mb_red_skybridge' || zt === 'mb_brick_alcove_hall' || zt === 'mb_library_fan_hall' || zt === 'mb_van_tunnel') {
        // High-detail narrow corridors with portals, doorways & recessed wings
        if (zt === 'mb_red_skybridge') {
          if (c % 2 === 1 && rnd() < 0.38) hEdges[r][c] = 3;
        } else if (zt === 'mb_brick_alcove_hall') {
          if (c % 2 === 0 && rnd() < 0.45) vEdges[r][c] = 3;
          else if (rnd() < 0.22) hEdges[r][c] = 4;
        } else if (zt === 'mb_library_fan_hall') {
          if (r % 2 === 0 && rnd() < 0.42) hEdges[r][c] = 3;
        } else if (zt === 'mb_van_tunnel') {
          if (rnd() < 0.26) {
            if (rnd() < 0.5) hEdges[r][c] = 4; else vEdges[r][c] = 3;
          }
        }
        continue;
      }

      if (zt === 'mb_bicycle_tripod') {
        if (rnd() < 0.34) {
          const et = rnd() < 0.45 ? 3 : 1;
          if (rnd() < 0.5) hEdges[r][c] = et; else vEdges[r][c] = et;
        }
        continue;
      }

      if (zt === 'office' || zt === 'async_archive') {
        if (rnd() < (zt === 'async_archive' ? 0.28 : 0.34)) {
          const half = zt === 'async_archive' ? (rnd() < 0.45 ? 1 : 4) : (rnd() < 0.68 ? 4 : 1);
          if (rnd() < 0.5) hEdges[r][c] = half;
          else vEdges[r][c] = half;
        }
        continue;
      }

      if (zt === 'gravity_error' || zt === 'stairwell_loop') {
        if (rnd() < 0.30) {
          const et = zt === 'gravity_error' ? (rnd() < 0.4 ? 3 : 2) : 1;
          if (rnd() < 0.5) hEdges[r][c] = et;
          else vEdges[r][c] = et;
        }
        continue;
      }

      if (zt === 'crawl_bay') {
        if (rnd() < 0.36) {
          const edgeT = rnd() < 0.55 ? 2 : 1;
          if (rnd() < 0.5) hEdges[r][c] = edgeT;
          else vEdges[r][c] = edgeT;
        }
        continue;
      }

      const prob = zt === 'redrooms' ? 0.28 : zt === 'blackout' ? 0.26 : zt === 'wet_concrete' ? 0.24 : 0.20;
      if (rnd() < prob) {
        const len = 1 + ((rnd() * 3) | 0);
        const horiz = rnd() < 0.5;
        for (let k = 0; k < len; k++) {
          const cc = horiz ? c + k : c;
          const rr = horiz ? r : r + k;
          if (cc >= N - 1 || rr >= N - 1 || cellSolid[rr][cc] || isProtectedCell(rr, cc)) break;
          if (k === len - 1 && len >= 2) break;
          if (horiz) hEdges[rr][cc] = 1;
          else vEdges[rr][cc] = 1;
        }
      }
    }
  }

  for (let r = 1; r < N - 1; r++) {
    for (let c = 1; c < N - 1; c++) {
      if (cellSolid[r][c]) {
        hEdges[r][c] = 0; hEdges[r + 1][c] = 0;
        vEdges[r][c] = 0; vEdges[r][c + 1] = 0;
      }
    }
  }

  // 3. BFS Guarantee across the full 94x94 labyrinth!
  const ensureConnected = () => {
    const startR = N - 3;
    const startC = halfN;
    cellSolid[startR][startC] = 0;
    let totalWalkable = 0;
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (!cellSolid[r][c]) totalWalkable++;

    let pass = 0;
    while (pass++ < 120) {
      const vis = Array.from({ length: N }, () => new Uint8Array(N));
      const q = [[startR, startC]];
      vis[startR][startC] = 1;
      let qi = 0;
      while (qi < q.length) {
        const [r, c] = q[qi++];
        const canStep = (nr, nc, edgeVal) => {
          if (nr < 0 || nr >= N || nc < 0 || nc >= N) return false;
          if (cellSolid[nr][nc] || vis[nr][nc]) return false;
          return edgeVal === 0 || edgeVal === 3;
        };
        if (r > 0 && canStep(r - 1, c, hEdges[r][c])) { vis[r - 1][c] = 1; q.push([r - 1, c]); }
        if (r < N - 1 && canStep(r + 1, c, hEdges[r + 1][c])) { vis[r + 1][c] = 1; q.push([r + 1, c]); }
        if (c > 0 && canStep(r, c - 1, vEdges[r][c])) { vis[r][c - 1] = 1; q.push([r, c - 1]); }
        if (c < N - 1 && canStep(r, c + 1, vEdges[r][c + 1])) { vis[r][c + 1] = 1; q.push([r, c + 1]); }
      }
      if (q.length >= totalWalkable) break;

      let punched = false;
      for (let r = 0; r < N && !punched; r++) {
        for (let c = 0; c < N && !punched; c++) {
          if (!vis[r][c]) continue;
          if (r > 0 && !cellSolid[r - 1][c] && !vis[r - 1][c]) { hEdges[r][c] = 0; punched = true; }
          else if (r < N - 1 && !cellSolid[r + 1][c] && !vis[r + 1][c]) { hEdges[r + 1][c] = 0; punched = true; }
          else if (c > 0 && !cellSolid[r][c - 1] && !vis[r][c - 1]) { vEdges[r][c] = 0; punched = true; }
          else if (c < N - 1 && !cellSolid[r][c + 1] && !vis[r][c + 1]) { vEdges[r][c + 1] = 0; punched = true; }
        }
      }
      if (!punched) break;
    }
  };
  ensureConnected();

  // 4. Materialize Thick Block Walls, Monolith Cells, Arches, Abyss Rails & Style Variations
  const WALLS = [];
  const ARCHES = [];

  const zoneToWallStyle = (zt) => (
    zt === 'redrooms' || zt === 'red_city' || zt === 'mb_red_skybridge' ? 'red' :
    zt === 'mb_brick_alcove_hall' || zt === 'mb_mall_atrium' ? 'brick' :
    zt === 'poolrooms' || zt === 'mb_gold_tile_blood' || zt === 'mb_library_fan_hall' ? 'cream_tile' :
    zt === 'mb_grey_basement' ? 'grey_drywall' :
    zt === 'manila' || zt === 'async_archive' ? 'manila' :
    zt === 'fluorescent_greenhouse' ? 'pool' :
    zt === 'ff1_white_gallery' || zt === 'ff1_filing_corridor' || zt === 'ff2_hardwood_home' || zt === 'mb_diner_fridge' || zt === 'mb_dining_blue_drapes' || zt === 'mb_floating_wall_glitch' ? 'white' :
    zt === 'wet_concrete' || zt === 'async_threshold' || zt === 'flooded_sump' || zt === 'breaker_vault' || zt === 'stairwell_loop' || zt === 'ceiling_plenum' || zt === 'ff2_vine_plasma' || zt === 'mb_van_tunnel' || zt === 'mb_courtyard' ? 'concrete' :
    'yellow'
  );

  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      if (cellSolid[r][c] === 1) {
        const style = zoneToWallStyle(getZoneTypeAt(r, c));
        const rect = {
          x0: c * C, z0: r * C, x1: (c + 1) * C, z1: (r + 1) * C,
          y0: 0, y1: WH, h: WH, crawl: false, style, kind: 'monolith'
        };
        RECTS.push(rect);
        WALLS.push(rect);
      } else if (cellSolid[r][c] === 2) {
        // Huge Pitfalls Abyss Cell: invisible/rail safety ledge barrier against walkable cells + edge hazard curb!
        const edges = [
          [r - 1, c, { x0: c * C, z0: r * C, x1: (c + 1) * C, z1: r * C + 0.24 }],
          [r + 1, c, { x0: c * C, z0: (r + 1) * C - 0.24, x1: (c + 1) * C, z1: (r + 1) * C }],
          [r, c - 1, { x0: c * C, z0: r * C, x1: c * C + 0.24, z1: (r + 1) * C }],
          [r, c + 1, { x0: (c + 1) * C - 0.24, z0: r * C, x1: (c + 1) * C, z1: (r + 1) * C }]
        ];
        for (const [nr, nc, box] of edges) {
          if (nr >= 0 && nr < N && nc >= 0 && nc < N && cellSolid[nr][nc] === 0) {
            RECTS.push({ ...box, y0: 0, y1: 0.92, h: 0.92, half: true, style: 'pit', kind: 'chasmRail' });
          }
        }
        // Full abyss cell collision block so entities don't fall off bridges
        RECTS.push({ x0: c * C + 0.1, z0: r * C + 0.1, x1: (c + 1) * C - 0.1, z1: (r + 1) * C - 0.1, y0: 0, y1: 1.0, h: 1.0, half: true, hidden: true, kind: 'abyssVoid' });
      }
    }
  }

  const pushEdgeGeometry = (x0, z0, x1, z1, edgeType, orient, style) => {
    if (edgeType === 3) {
      const span = orient === 'h' ? (x1 - x0) : (z1 - z0);
      const pier = Math.max(0.55, (span - 2.1) * 0.5);
      if (orient === 'h') {
        const p1 = { x0, z0, x1: x0 + pier, z1, y0: 0, y1: WH, h: WH, crawl: false, style, kind: 'archPier' };
        const p2 = { x0: x1 - pier, z0, x1, z1, y0: 0, y1: WH, h: WH, crawl: false, style, kind: 'archPier' };
        RECTS.push(p1, p2); WALLS.push(p1, p2);
        ARCHES.push({ x0: x0 + pier, z0, x1: x1 - pier, z1, y0: 2.75, y1: WH, style });
      } else {
        const p1 = { x0, z0, x1, z1: z0 + pier, y0: 0, y1: WH, h: WH, crawl: false, style, kind: 'archPier' };
        const p2 = { x0, z0: z1 - pier, x1, z1, y0: 0, y1: WH, h: WH, crawl: false, style, kind: 'archPier' };
        RECTS.push(p1, p2); WALLS.push(p1, p2);
        ARCHES.push({ x0, z0: z0 + pier, x1, z1: z1 - pier, y0: 2.75, y1: WH, style });
      }
      return;
    }

    const crawl = edgeType === 2;
    const half = edgeType === 4;
    const rect = {
      x0, z0, x1, z1,
      y0: crawl ? CRAWL_H : 0,
      y1: half ? 1.48 : WH,
      h: crawl ? (WH - CRAWL_H) : half ? 1.48 : WH,
      crawl, half, orient, style
    };
    RECTS.push(rect);
    WALLS.push(rect);
  };

  for (let r = 1; r < N; r++) {
    let c = 0;
    while (c < N) {
      const e = hEdges[r][c];
      if (e === 0) { c++; continue; }
      const st = zoneToWallStyle(getZoneTypeAt(r, c));
      if (e === 3) {
        pushEdgeGeometry(c * C, r * C - hw, (c + 1) * C, r * C + hw, 3, 'h', st);
        c++;
        continue;
      }
      let cEnd = c + 1;
      while (cEnd < N && hEdges[r][cEnd] === e && (cEnd - c) < 4) cEnd++;
      pushEdgeGeometry(c * C - hw * 0.25, r * C - hw, cEnd * C + hw * 0.25, r * C + hw, e, 'h', st);
      c = cEnd;
    }
  }

  for (let c = 1; c < N; c++) {
    let r = 0;
    while (r < N) {
      const e = vEdges[r][c];
      if (e === 0) { r++; continue; }
      const st = zoneToWallStyle(getZoneTypeAt(r, c));
      if (e === 3) {
        pushEdgeGeometry(c * C - hw, r * C, c * C + hw, (r + 1) * C, 3, 'v', st);
        r++;
        continue;
      }
      let rEnd = r + 1;
      while (rEnd < N && vEdges[rEnd][c] === e && (rEnd - r) < 4) rEnd++;
      pushEdgeGeometry(c * C - hw, r * C - hw * 0.25, c * C + hw, rEnd * C + hw * 0.25, e, 'v', st);
      r = rEnd;
    }
  }

  // 5. Structural Pillars in Colonnades, Poolrooms, Flooded Yellow Colonnade & Concrete Halls
  const PILLARS = [];
  for (let r = 2; r < N - 2; r += 2) {
    for (let c = 2; c < N - 2; c += 2) {
      if (cellSolid[r][c] || isProtectedCell(r, c)) continue;
      const zt = getZoneTypeAt(r, c);
      const isHall = zt === 'colonnade' || zt === 'poolrooms' || zt === 'flooded_yellow_hall';
      if (!isHall && rnd() > 0.16) continue;
      const clearAround = hEdges[r][c] === 0 && hEdges[r + 1][c] === 0 && vEdges[r][c] === 0 && vEdges[r][c + 1] === 0;
      if (!clearAround) continue;

      const px = (c + 0.5) * C;
      const pz = (r + 0.5) * C;
      const pw = zt === 'poolrooms' ? 0.68 : zt === 'flooded_yellow_hall' ? 0.66 : isHall ? 0.62 : 0.52;
      const style = zt === 'poolrooms' ? 'cream_tile' : zt === 'flooded_yellow_hall' ? 'yellow' : zoneToWallStyle(zt);
      const rect = { x0: px - pw, z0: pz - pw, x1: px + pw, z1: pz + pw, y0: 0, y1: WH, h: WH, kind: 'pillar', style };
      RECTS.push(rect);
      PILLARS.push(rect);
      cellSolid[r][c] = 1;
    }
  }

  wallGrid.build(RECTS);

  const isFree = (x, z, pad = 0.85) => {
    if (x < 2.2 || x > N * C - 2.2 || z < 2.2 || z > N * C - 2.2) return false;
    const near = wallGrid.queryNear(x, z, pad + 0.7);
    for (const r of near) {
      if (x + pad > r.x0 && x - pad < r.x1 && z + pad > r.z0 && z - pad < r.z1) return false;
    }
    return true;
  };

  // 6. Varied Detailed Floor Patches (`FLOOR_PATCHES`) matching 40+ zones + scattered liminal sub-floors
  const FLOOR_PATCHES = [];
  for (const z of ZONES) {
    const x = z.c0 * C, zz = z.r0 * C;
    const w = (z.c1 - z.c0 + 1) * C, d = (z.r1 - z.r0 + 1) * C;
    if (z.type === 'poolrooms') FLOOR_PATCHES.push({ x, z: zz, w, d, kind: 'pool_tile' });
    else if (z.type === 'flooded_yellow_hall') FLOOR_PATCHES.push({ x, z: zz, w, d, kind: 'dark_flood' });
    else if (z.type === 'wet_concrete' || z.type === 'ceiling_plenum' || z.type === 'stairwell_loop') FLOOR_PATCHES.push({ x, z: zz, w, d, kind: 'concrete' });
    else if (z.type === 'colonnade' || z.type === 'fluorescent_greenhouse' || z.type === 'mb_brick_alcove_hall') FLOOR_PATCHES.push({ x, z: zz, w, d, kind: 'terrazzo' });
    else if (z.type === 'redrooms' || z.type === 'mb_red_skybridge') FLOOR_PATCHES.push({ x, z: zz, w, d, kind: 'red_carpet' });
    else if (z.type === 'mb_grey_basement') FLOOR_PATCHES.push({ x, z: zz, w, d, kind: 'grey_carpet' });
    else if (z.type === 'mb_mall_atrium') FLOOR_PATCHES.push({ x: x + w * 0.5, z: zz, w: w * 0.5, d, kind: 'cream_tile' }); // Half-carpet / half-tile mall transition
    else if (z.type === 'office' || z.type === 'async_archive' || z.type === 'mb_diner_fridge') FLOOR_PATCHES.push({ x, z: zz, w, d, kind: 'office_tile' });
    else if (z.type === 'async_threshold') FLOOR_PATCHES.push({ x, z: zz, w, d, kind: 'async_hazard' });
    else if (z.type === 'suburb_pitfalls' || z.type === 'mb_van_tunnel') FLOOR_PATCHES.push({ x, z: zz, w, d, kind: 'asphalt' });
    else if (z.type === 'red_city' || z.type === 'breaker_vault') FLOOR_PATCHES.push({ x, z: zz, w, d, kind: 'rust_metal' });
    else if (z.type === 'null_kx_glitch') FLOOR_PATCHES.push({ x, z: zz, w, d, kind: 'glitch' });
    else if (z.type === 'flooded_sump') FLOOR_PATCHES.push({ x, z: zz, w, d, kind: 'sump' });
    else if (z.type === 'ff2_hardwood_home') FLOOR_PATCHES.push({ x, z: zz, w, d, kind: 'hardwood' });
    else if (z.type === 'ff1_white_gallery' || z.type === 'ff1_filing_corridor' || z.type === 'mb_library_fan_hall' || z.type === 'mb_gold_tile_blood') FLOOR_PATCHES.push({ x, z: zz, w, d, kind: 'cream_tile' });
    else if (z.type === 'ff2_vine_plasma') FLOOR_PATCHES.push({ x, z: zz, w, d, kind: 'concrete' });
  }
  // Extra scattered anomalous floor squares across monolith maze so corridors never feel repetitive
  const patchKinds = ['concrete', 'terrazzo', 'office_tile', 'glitch', 'rust_metal', 'hardwood', 'white_tile'];
  for (let i = 0; i < 28; i++) {
    const px = (4 + ((rnd() * (N - 10)) | 0)) * C;
    const pz = (4 + ((rnd() * (N - 10)) | 0)) * C;
    FLOOR_PATCHES.push({
      x: px, z: pz,
      w: (3 + ((rnd() * 3) | 0)) * C,
      d: (3 + ((rnd() * 3) | 0)) * C,
      kind: patchKinds[(rnd() * patchKinds.length) | 0]
    });
  }

  // 7. Zone Furniture, Pitfalls, Curious Landmarks, Error Anomalies, Signage, Vents, Pipes, Puddles & Cords
  const pitfalls = [];
  const furniture = [];
  const curiosities = [];
  const anomalies = [];
  const signs = [];
  const cords = [];
  const vents = [];
  const pipes = [];
  const puddles = [];
  const posters = [];
  const wallDecals = [];

  for (const z of ZONES) {
    const cx = ((z.c0 + z.c1 + 1) * 0.5) * C;
    const cz = ((z.r0 + z.r1 + 1) * 0.5) * C;
    if (z.type === 'pitfalls') {
      for (let r = z.r0 + 1; r <= z.r1 - 1; r += 2) {
        for (let c = z.c0 + 1; c <= z.c1 - 1; c += 2) {
          const px = (c + 0.5) * C, pz = (r + 0.5) * C;
          if (!cellSolid[r][c] && isFree(px, pz, 0.9)) {
            pitfalls.push({ x: px, z: pz, w: C * 0.72 });
            RECTS.push({ x0: px - C * 0.34, z0: pz - C * 0.34, x1: px + C * 0.34, z1: pz + C * 0.34, y0: 0, y1: 0.9, h: 0.9, half: true, kind: 'pitGuard', style: 'pit' });
            cellSolid[r][c] = 1;
          }
        }
      }
      wallGrid.build(RECTS);
    } else if (z.type === 'manila') {
      if (isFree(cx, cz, 0.95)) {
        furniture.push({ kind: 'desk', x: cx, z: cz, rot: 0 });
        RECTS.push({ x0: cx - 0.75, z0: cz - 0.45, x1: cx + 0.75, z1: cz + 0.45, y0: 0, y1: 0.85, h: 0.85, half: true });
        curiosities.push({ kind: 'crt_bank', x: cx + 1.5, z: cz - 1.2, rot: -0.4 });
      }
    } else if (z.type === 'async_threshold') {
      // Iconic Kane Pixels Threshold Observation Frame + Survey Tripods & Barrier Cones
      const gy = cx - 4.2;
      if (isFree(gy, cz, 1.1)) anomalies.push({ kind: 'async_gate_arch', x: cx, z: cz - 2.6, rot: 0 });
      for (const ox of [-5.2, 5.2]) {
        const sx = cx + ox, sz = cz + 2.4;
        if (isFree(sx, sz, 0.75)) {
          anomalies.push({ kind: 'survey_tripod', x: sx, z: sz, rot: ox > 0 ? -0.4 : 0.4 });
        }
      }
      if (isFree(cx + 3.2, cz, 0.9)) curiosities.push({ kind: 'crt_bank', x: cx + 3.2, z: cz, rot: -Math.PI / 2 });
    } else if (z.type === 'suburb_pitfalls') {
      // Surreal indoor suburban neighborhood street + 4 two-story clapboard houses + white fence + mailbox + giant fan
      const houseOffsets = [[-6.0, -4.5], [6.0, -4.5], [-6.0, 4.5], [6.0, 4.5]];
      for (const [hx, hz] of houseOffsets) {
        const ax = cx + hx, az = cz + hz;
        if (isFree(ax, az, 2.2)) {
          anomalies.push({ kind: 'suburb_house', x: ax, z: az, rot: hx < 0 ? Math.PI / 2 : -Math.PI / 2 });
          RECTS.push({ x0: ax - 1.7, z0: az - 1.7, x1: ax + 1.7, z1: az + 1.7, y0: 0, y1: WH, h: WH, kind: 'houseCol', hidden: true });
        }
      }
      anomalies.push({ kind: 'mb_suburb_road_strip', x: cx, z: cz, rot: 0 });
      anomalies.push({ kind: 'mb_ceiling_fan_unit', x: cx, z: cz, rot: 0 });
      if (isFree(cx + 1.6, cz, 0.8)) anomalies.push({ kind: 'tricycle_toy', x: cx + 1.6, z: cz, rot: 0.5 });
      wallGrid.build(RECTS);
    } else if (z.type === 'colonnade') {
      // Wide yellow colonnade w/ wood-capped half-walls & paired oak chairs with bright royal-blue cushions
      for (const [bx, bz, rot] of [[-4.2, -3.5, 0], [4.2, -3.5, Math.PI / 2], [-4.2, 3.5, -Math.PI / 2], [4.2, 3.5, Math.PI]]) {
        const ax = cx + bx, az = cz + bz;
        if (isFree(ax, az, 1.1)) anomalies.push({ kind: 'mb_blue_chair_pair', x: ax, z: az, rot });
      }
    } else if (z.type === 'red_city') {
      // Industrial catwalk risers + vertical crimson conduit clusters
      for (const [rx, rz] of [[-4.8, -3.5], [4.8, -3.5], [-4.8, 3.5], [4.8, 3.5]]) {
        const ax = cx + rx, az = cz + rz;
        if (isFree(ax, az, 1.1)) {
          anomalies.push({ kind: 'red_pipe_tower', x: ax, z: az, rot: 0 });
          RECTS.push({ x0: ax - 0.65, z0: az - 0.65, x1: ax + 0.65, z1: az + 0.65, y0: 0, y1: WH, h: WH, hidden: true });
        }
      }
      wallGrid.build(RECTS);
    } else if (z.type === 'null_kx_glitch') {
      // Spatial error anomaly field: floating missing-texture checkerboard monoliths & noclip wireframes
      for (let i = 0; i < 6; i++) {
        const gx = cx + (rnd() - 0.5) * 18, gz = cz + (rnd() - 0.5) * 16;
        if (isFree(gx, gz, 1.0)) {
          anomalies.push({ kind: i % 3 === 0 ? 'noclip_frame' : i % 3 === 1 ? 'error_cube' : 'floating_door', x: gx, z: gz, rot: rnd() * Math.PI * 2 });
        }
      }
    } else if (z.type === 'gravity_error') {
      // Upside-down desks on ceiling + duplicate glitching ghost chairs + sideways doors
      for (let i = 0; i < 5; i++) {
        const gx = cx + (rnd() - 0.5) * 15, gz = cz + (rnd() - 0.5) * 15;
        if (isFree(gx, gz, 0.9)) {
          anomalies.push({ kind: i % 2 === 0 ? 'upside_down_desk' : 'duplicate_chairs', x: gx, z: gz, rot: rnd() * Math.PI * 2 });
        }
      }
    } else if (z.type === 'breaker_vault') {
      // Massive high-voltage substation transformer blocks
      for (const [tx, tz] of [[-4.2, -3.2], [4.2, -3.2], [-4.2, 3.2], [4.2, 3.2]]) {
        const ax = cx + tx, az = cz + tz;
        if (isFree(ax, az, 1.25)) {
          anomalies.push({ kind: 'transformer_bank', x: ax, z: az, rot: 0 });
          RECTS.push({ x0: ax - 0.85, z0: az - 0.65, x1: ax + 0.85, z1: az + 0.65, y0: 0, y1: 2.6, h: 2.6, half: true, hidden: true });
        }
      }
      wallGrid.build(RECTS);
    } else if (z.type === 'ceiling_plenum') {
      // Collapsed hanging ceiling tile frames + central elevator chasm well
      if (isFree(cx, cz, 1.4)) {
        pitfalls.push({ x: cx, z: cz, w: C * 0.8 });
        RECTS.push({ x0: cx - C * 0.36, z0: cz - C * 0.36, x1: cx + C * 0.36, z1: cz + C * 0.36, y0: 0, y1: 0.95, h: 0.95, half: true, style: 'pit' });
      }
      for (let i = 0; i < 6; i++) {
        const px = cx + (rnd() - 0.5) * 18, pz = cz + (rnd() - 0.5) * 16;
        if (isFree(px, pz, 0.8)) anomalies.push({ kind: 'ceiling_truss_drop', x: px, z: pz, rot: rnd() * Math.PI });
      }
      wallGrid.build(RECTS);
    } else if (z.type === 'still_life_relay') {
      // CRT monitor pyramid + dark organic Bacteria/Still-Life floor growths + crackling radios
      for (let i = 0; i < 4; i++) {
        const sx = cx + (rnd() - 0.5) * 14, sz = cz + (rnd() - 0.5) * 14;
        if (isFree(sx, sz, 1.1)) curiosities.push({ kind: 'crt_bank', x: sx, z: sz, rot: rnd() * Math.PI * 2 });
      }
      for (let i = 0; i < 6; i++) {
        const bx = cx + (rnd() - 0.5) * 16, bz = cz + (rnd() - 0.5) * 16;
        if (isFree(bx, bz, 0.9)) anomalies.push({ kind: i % 2 === 0 ? 'bio_tendril_cluster' : 'static_radio', x: bx, z: bz, rot: rnd() * Math.PI * 2 });
      }
    } else if (z.type === 'stairwell_loop') {
      for (let i = 0; i < 4; i++) {
        const sx = cx + ((i % 2 === 0 ? -1 : 1) * 5.2), sz = cz + (i < 2 ? -4.5 : 4.5);
        if (isFree(sx, sz, 1.3)) {
          curiosities.push({ kind: 'stairs_to_ceiling', x: sx, z: sz, rot: (i * Math.PI) / 2 });
          RECTS.push({ x0: sx - 0.8, z0: sz - 0.8, x1: sx + 0.8, z1: sz + 0.8, y0: 0, y1: 1.8, h: 1.8, half: true, hidden: true });
        }
      }
      wallGrid.build(RECTS);
    } else if (z.type === 'office' || z.type === 'async_archive' || z.type === 'mold_utility' || z.type === 'wet_concrete') {
      if (z.type === 'office') {
        anomalies.push({ kind: 'mb_office_bright_pillar', x: cx, z: cz, rot: 0 });
        RECTS.push({ x0: cx - 0.72, z0: cz - 0.72, x1: cx + 0.72, z1: cz + 0.72, y0: 0, y1: WH, h: WH, kind: 'pillar', style: 'manila' });
        wallGrid.build(RECTS);
      }
      const cnt = z.type === 'async_archive' ? 16 : z.type === 'office' ? 14 : 10;
      for (let i = 0; i < cnt; i++) {
        const r = z.r0 + ((rnd() * (z.r1 - z.r0 + 1)) | 0);
        const c = z.c0 + ((rnd() * (z.c1 - z.c0 + 1)) | 0);
        const fx = (c + 0.25 + rnd() * 0.5) * C;
        const fz = (r + 0.25 + rnd() * 0.5) * C;
        if (isFree(fx, fz, 0.95)) {
          const kind = z.type === 'async_archive' ? 'cabinet' : z.type === 'office' ? (rnd() < 0.55 ? 'desk' : 'cabinet') : 'crate';
          const rot = ((rnd() * 4) | 0) * (Math.PI / 2);
          furniture.push({ kind, x: fx, z: fz, rot });
          const bw = kind === 'desk' ? 0.72 : 0.44;
          const bd = 0.44;
          RECTS.push({ x0: fx - bw, z0: fz - bd, x1: fx + bw, z1: fz + bd, y0: 0, y1: 1.35, h: 1.35, half: true });
        }
      }
    } else if (z.type === 'ff1_ladder_hatch') {
      // Found Footage #1 (02:01): Elevated wall hatch + silver metal ladder + green fluorescent chamber
      const cx = ((z.c0 + z.c1 + 1) * 0.5) * C;
      const cz = ((z.r0 + z.r1 + 1) * 0.5) * C;
      anomalies.push({ kind: 'ff1_wall_ladder_hatch', x: cx, z: cz, rot: 0 });
    } else if (z.type === 'ff1_dont_move') {
      // Found Footage #1 (03:21 & 04:19): "DON'T MOVE / STAY STILL" spray-painted eyes/nose wall + recursive aligned doorways
      const cx = ((z.c0 + z.c1 + 1) * 0.5) * C;
      const cz = ((z.r0 + z.r1 + 1) * 0.5) * C;
      anomalies.push({ kind: 'ff1_dont_move_wall', x: cx - 3.2, z: cz, rot: 0 });
      anomalies.push({ kind: 'ff1_recursive_portals', x: cx + 3.4, z: cz, rot: 0 });
    } else if (z.type === 'ff1_white_gallery') {
      // Found Footage #1 (05:17-05:51): Handrail staircase, lone wooden chair by dark window, 3x5 window atrium wall, red dumpster
      const cx = ((z.c0 + z.c1 + 1) * 0.5) * C;
      const cz = ((z.r0 + z.r1 + 1) * 0.5) * C;
      anomalies.push({ kind: 'ff1_handrail_stairs', x: cx - 4.6, z: cz - 3.6, rot: 0 });
      anomalies.push({ kind: 'ff1_lone_chair_window', x: cx + 3.8, z: cz - 3.4, rot: Math.PI * 0.5 });
      anomalies.push({ kind: 'ff1_window_atrium_wall', x: cx - 3.8, z: cz + 3.8, rot: 0 });
      anomalies.push({ kind: 'ff1_red_dumpster', x: cx + 4.2, z: cz + 3.6, rot: 0.25 });
    } else if (z.type === 'ff1_filing_corridor') {
      // Found Footage #1 (06:26-06:49): White corridor with rows of grey filing cabinets + Keep clear door + wide steps
      const cx = ((z.c0 + z.c1 + 1) * 0.5) * C;
      const cz = ((z.r0 + z.r1 + 1) * 0.5) * C;
      anomalies.push({ kind: 'ff1_keep_clear_door', x: cx, z: cz, rot: 0 });
      for (let i = -3; i <= 3; i++) {
        if (i === 0) continue;
        const fx = cx + i * 2.2, fz = cz - 2.6;
        if (isFree(fx, fz, 0.7)) furniture.push({ kind: 'cabinet', x: fx, z: fz, rot: 0 });
      }
    } else if (z.type === 'ff2_tape_kitchen') {
      // Found Footage #2 (00:25, 02:38, 04:19): Blue painter's tape # grid + White kitchenette + Giant grey L-sofa lounge
      const cx = ((z.c0 + z.c1 + 1) * 0.5) * C;
      const cz = ((z.r0 + z.r1 + 1) * 0.5) * C;
      anomalies.push({ kind: 'ff2_blue_tape_grid', x: cx - 4.2, z: cz - 3.2, rot: 0 });
      anomalies.push({ kind: 'ff2_kitchenette', x: cx + 4.2, z: cz - 3.4, rot: 0 });
      anomalies.push({ kind: 'ff2_grey_l_sofa', x: cx, z: cz + 3.8, rot: 0 });
    } else if (z.type === 'ff2_crashed_car') {
      // Found Footage #2 (06:49, 08:13): Wrecked 1980s sedan in yellow wall with skid marks + Coffered skylight shadow ceiling
      const cx = ((z.c0 + z.c1 + 1) * 0.5) * C;
      const cz = ((z.r0 + z.r1 + 1) * 0.5) * C;
      anomalies.push({ kind: 'ff2_crashed_sedan', x: cx - 2.5, z: cz, rot: 0.32 });
      anomalies.push({ kind: 'ff2_skylight_shadow', x: cx + 4.2, z: cz, rot: 0 });
    } else if (z.type === 'ff2_hardwood_home') {
      // Found Footage #2 (08:46-09:20): Hardwood floor house with white balustrade railing, built-in wall shelves & black handprint stain
      const cx = ((z.c0 + z.c1 + 1) * 0.5) * C;
      const cz = ((z.r0 + z.r1 + 1) * 0.5) * C;
      anomalies.push({ kind: 'ff2_balustrade_railing', x: cx, z: cz, rot: 0 });
    } else if (z.type === 'ff2_vine_plasma') {
      // Found Footage #2 (09:53, 12:07, 12:57, 13:14): Black Bacteria vine nest + Chrome pool ladder shaft + Green plasma rift + CRT TV & plants
      const cx = ((z.c0 + z.c1 + 1) * 0.5) * C;
      const cz = ((z.r0 + z.r1 + 1) * 0.5) * C;
      anomalies.push({ kind: 'ff2_black_vine_nest', x: cx - 4.2, z: cz - 3.4, rot: 0 });
      anomalies.push({ kind: 'ff2_chrome_pool_ladder', x: cx + 4.2, z: cz - 3.4, rot: 0 });
      anomalies.push({ kind: 'ff2_green_plasma_rift', x: cx - 3.8, z: cz + 3.6, rot: 0 });
      anomalies.push({ kind: 'ff2_crt_tv_plants', x: cx + 3.8, z: cz + 3.6, rot: -0.4 });
    } else if (z.type === 'mb_red_skybridge') {
      anomalies.push({ kind: 'mb_skybridge_windows', x: cx, z: cz, rot: 0 });
    } else if (z.type === 'mb_brick_alcove_hall') {
      anomalies.push({ kind: 'mb_brick_beam_alcove', x: cx, z: cz, rot: 0 });
    } else if (z.type === 'mb_bicycle_tripod') {
      if (isFree(cx - 2.6, cz + 1.5, 0.7)) anomalies.push({ kind: 'mb_bicycle_prop', x: cx - 2.6, z: cz + 1.5, rot: 0.4 });
      if (isFree(cx + 2.4, cz - 1.5, 0.8)) anomalies.push({ kind: 'mb_tripod_creature', x: cx + 2.4, z: cz - 1.5, rot: -0.3 });
    } else if (z.type === 'mb_courtyard') {
      for (const [tx, tz, rot] of [[-7.2, -5.8, 0], [7.2, -5.8, Math.PI], [-7.2, 5.8, 0], [7.2, 5.8, Math.PI]]) {
        const ax = cx + tx, az = cz + tz;
        if (isFree(ax, az, 2.2)) {
          anomalies.push({ kind: 'mb_courtyard_tower', x: ax, z: az, rot });
          RECTS.push({ x0: ax - 1.85, z0: az - 1.85, x1: ax + 1.85, z1: az + 1.85, y0: 0, y1: 8.6, h: 8.6, kind: 'houseCol', hidden: true });
        }
      }
      for (const [lx, lz] of [[-3.2, -2.6], [3.2, -2.6], [-3.2, 2.6], [3.2, 2.6]]) {
        const ax = cx + lx, az = cz + lz;
        if (isFree(ax, az, 0.9)) anomalies.push({ kind: 'mb_courtyard_tree_lamp', x: ax, z: az, rot: rnd() * 6.28 });
      }
      wallGrid.build(RECTS);
    } else if (z.type === 'mb_library_fan_hall') {
      anomalies.push({ kind: 'mb_fan_bookcase_hall', x: cx - 1.8, z: cz, rot: 0 });
      anomalies.push({ kind: 'mb_stop_portal', x: cx + 3.0, z: cz + 1.5, rot: 0 });
    } else if (z.type === 'mb_unrealized_mural') {
      anomalies.push({ kind: 'mb_unrealized_mural_wall', x: cx, z: cz, rot: 0 });
    } else if (z.type === 'mb_mall_atrium') {
      for (const [sx, sz, rot] of [[-6.5, -5.2, 0], [6.5, -5.2, Math.PI]]) {
        const ax = cx + sx, az = cz + sz;
        anomalies.push({ kind: 'mb_mall_storefront', x: ax, z: az, rot });
      }
      for (let i = -1; i <= 1; i++) {
        const gx = cx + 4.8, gz = cz + i * 3.8;
        if (isFree(gx, gz, 1.1)) {
          anomalies.push({ kind: 'mb_sunken_gondola', x: gx, z: gz, rot: i === 0 ? 0.14 : -0.08 });
          RECTS.push({ x0: gx - 1.2, z0: gz - 0.55, x1: gx + 1.2, z1: gz + 0.55, y0: 0, y1: 1.6, h: 1.6, half: true, hidden: true });
        }
      }
      wallGrid.build(RECTS);
    } else if (z.type === 'mb_diner_fridge') {
      anomalies.push({ kind: 'mb_diner_sunken_fridges', x: cx, z: cz, rot: 0 });
      RECTS.push({ x0: cx + 1.2, z0: cz - 1.4, x1: cx + 2.8, z1: cz + 1.4, y0: 0, y1: 1.8, h: 1.8, half: true, hidden: true });
      wallGrid.build(RECTS);
    } else if (z.type === 'mb_van_tunnel') {
      if (isFree(cx - 1.8, cz, 1.6)) {
        anomalies.push({ kind: 'mb_parked_van', x: cx - 1.8, z: cz, rot: 0.28 });
        RECTS.push({ x0: cx - 3.3, z0: cz - 1.1, x1: cx - 0.3, z1: cz + 1.1, y0: 0, y1: 2.2, h: 2.2, half: true, hidden: true });
      }
      anomalies.push({ kind: 'mb_dollar_tunnel', x: cx + 3.2, z: cz, rot: Math.PI });
      wallGrid.build(RECTS);
    } else if (z.type === 'mb_grey_basement') {
      anomalies.push({ kind: 'mb_grey_staircase_tape', x: cx, z: cz, rot: 0 });
      RECTS.push({ x0: cx - 2.6, z0: cz - 0.8, x1: cx - 1.2, z1: cz + 0.8, y0: 0, y1: 2.4, h: 2.4, half: true, hidden: true });
      wallGrid.build(RECTS);
    } else if (z.type === 'mb_cctv_cove') {
      anomalies.push({ kind: 'mb_cctv_cove_hatch', x: cx - 2.0, z: cz, rot: 0 });
      anomalies.push({ kind: 'mb_chair_wall_hole', x: cx + 2.4, z: cz, rot: 0 });
    } else if (z.type === 'mb_dining_blue_drapes') {
      anomalies.push({ kind: 'mb_blue_drapes_dining', x: cx, z: cz, rot: 0 });
      RECTS.push({ x0: cx - 1.1, z0: cz - 1.1, x1: cx + 1.1, z1: cz + 1.1, y0: 0, y1: 0.9, h: 0.9, half: true, hidden: true });
      wallGrid.build(RECTS);
    } else if (z.type === 'mb_gold_tile_blood') {
      anomalies.push({ kind: 'mb_gold_tile_blood_trail', x: cx, z: cz, rot: 0 });
    } else if (z.type === 'mb_floating_wall_glitch') {
      anomalies.push({ kind: 'mb_floating_block_glitch', x: cx - 2.4, z: cz, rot: 0 });
      anomalies.push({ kind: 'mb_twin_cribs_chair_pile', x: cx + 2.8, z: cz, rot: 0 });
    }
  }
  wallGrid.build(RECTS);

  // Reserve A-Sync Ornate Service Elevator bay in South Threshold (faces -Z into Level 0)
  const ELEVATOR = {
    x: midX,
    z: N * C - 17.5,
    width: 3.7,
    depth: 3.3,
    doorW: 1.92,
    doorH: 2.95,
    ceilingH: 3.48,
    dirZ: -1,
    btnX: midX + 1.24,
    btnZ: (N * C - 17.5) - 1.26
  };
  const inElevatorZone = (x, z, pad = 0.6) => (
    Math.abs(x - ELEVATOR.x) < ELEVATOR.width * 0.5 + pad &&
    Math.abs(z - ELEVATOR.z) < ELEVATOR.depth * 0.5 + pad
  );

  // Sample walkable spots across the entire 124x124 labyrinth (strictly outside Elevator cabin)
  const SPOTS = [];
  for (let r = 1; r < N - 1; r++) {
    for (let c = 1; c < N - 1; c++) {
      if (cellSolid[r][c]) continue;
      const x = (c + 0.5) * C;
      const z = (r + 0.5) * C;
      if (inElevatorZone(x, z, 0.9)) continue;
      if (isFree(x, z, 0.85)) SPOTS.push({ x, z, c, r });
    }
  }

  const pickFarSpots = (count, minDist, avoidList = []) => {
    const out = [];
    let tries = 0;
    while (out.length < count && tries++ < 12000) {
      const sp = SPOTS[(rnd() * SPOTS.length) | 0];
      if (!sp) break;
      let ok = true;
      for (const p of out) if (Math.hypot(sp.x - p.x, sp.z - p.z) < minDist) { ok = false; break; }
      if (!ok) continue;
      for (const p of avoidList) if (Math.hypot(sp.x - p.x, sp.z - p.z) < minDist * 0.60) { ok = false; break; }
      if (ok) out.push(sp);
    }
    while (out.length < count && SPOTS.length) {
      const sp = SPOTS[(rnd() * SPOTS.length) | 0];
      if (!out.includes(sp)) out.push(sp);
    }
    return out;
  };

  // Eerie Liminal Curiosities & Scattered Stray Glitch Anomalies across endless corridors
  const curioKinds = ['stairs_to_ceiling', 'solitary_door', 'crt_bank', 'tilted_pillar'];
  const curioSpots = pickFarSpots(30, 26, [{ x: ELEVATOR.x, z: ELEVATOR.z }]);
  for (let i = 0; i < curioSpots.length; i++) {
    const sp = curioSpots[i];
    if (inElevatorZone(sp.x, sp.z, 2.5) || !isFree(sp.x, sp.z, 1.35)) continue;
    const kind = curioKinds[i % curioKinds.length];
    const rot = ((rnd() * 4) | 0) * (Math.PI / 2);
    curiosities.push({ kind, x: sp.x, z: sp.z, rot });
    RECTS.push({ x0: sp.x - 0.72, z0: sp.z - 0.72, x1: sp.x + 0.72, z1: sp.z + 0.72, y0: 0, y1: 1.8, h: 1.8, half: true, hidden: true, kind: 'curioCol' });
  }
  const extraAnomKinds = [
    'error_cube', 'floating_door', 'upside_down_desk', 'duplicate_chairs',
    'static_radio', 'survey_tripod', 'shopping_cart_pile', 'mannequin_circle',
    'rotary_payphone', 'vending_machine_sideways', 'ff1_red_dumpster',
    'ff2_blue_tape_grid', 'ff2_crt_tv_plants'
  ];
  const extraAnomSpots = pickFarSpots(36, 26, [{ x: ELEVATOR.x, z: ELEVATOR.z }]);
  for (let i = 0; i < extraAnomSpots.length; i++) {
    const sp = extraAnomSpots[i];
    if (inElevatorZone(sp.x, sp.z, 2.5) || !isFree(sp.x, sp.z, 1.1)) continue;
    anomalies.push({ kind: extraAnomKinds[i % extraAnomKinds.length], x: sp.x, z: sp.z, rot: rnd() * Math.PI * 2 });
  }

  // Push Elevator chamber walls + sliding doorway collider BEFORE building spatial grid
  {
    const ex = ELEVATOR.x;
    const ez = ELEVATOR.z;
    const hwEl = ELEVATOR.width * 0.5;
    const hdEl = ELEVATOR.depth * 0.5;
    const doorHalf = ELEVATOR.doorW * 0.5;
    const wallT = 0.28;
    // Left, Right, Back solid enclosure walls (visually modeled by buildElevatorMesh in models.js)
    RECTS.push({ x0: ex - hwEl, z0: ez - hdEl, x1: ex - hwEl + wallT, z1: ez + hdEl, y0: 0, y1: WH, h: WH, hidden: true, kind: 'elevatorWall' });
    RECTS.push({ x0: ex + hwEl - wallT, z0: ez - hdEl, x1: ex + hwEl, z1: ez + hdEl, y0: 0, y1: WH, h: WH, hidden: true, kind: 'elevatorWall' });
    RECTS.push({ x0: ex - hwEl, z0: ez + hdEl - wallT, x1: ex + hwEl, z1: ez + hdEl, y0: 0, y1: WH, h: WH, hidden: true, kind: 'elevatorWall' });
    // Front door jamb piers (-Z exit side)
    RECTS.push({ x0: ex - hwEl, z0: ez - hdEl, x1: ex - doorHalf, z1: ez - hdEl + wallT, y0: 0, y1: WH, h: WH, hidden: true, kind: 'elevatorWall' });
    RECTS.push({ x0: ex + doorHalf, z0: ez - hdEl, x1: ex + hwEl, z1: ez - hdEl + wallT, y0: 0, y1: WH, h: WH, hidden: true, kind: 'elevatorWall' });
    // Dynamic sliding door collider (open when map.elevatorOpenProgress >= 0.72)
    RECTS.push({ x0: ex - doorHalf - 0.05, z0: ez - hdEl + 0.04, x1: ex + doorHalf + 0.05, z1: ez - hdEl + wallT - 0.04, y0: 0, y1: WH, h: WH, hidden: true, elevatorDoor: true, kind: 'elevatorDoor' });
  }
  wallGrid.build(RECTS);

  const exitAvoid = [{ x: midX, z: 3 }, { x: midX, z: N * C - 3 }, { x: ELEVATOR.x, z: ELEVATOR.z }];
  const taskSpots = pickFarSpots(NTASK, 48, exitAvoid);
  const TASKS = taskSpots.map((sp, i) => {
    const symInfo = TASK_SYMBOLS[i % TASK_SYMBOLS.length];
    const guideType = GUIDE_TYPES[i % GUIDE_TYPES.length];
    return {
      id: i,
      r: sp.r,
      c: sp.c,
      x: sp.x,
      z: sp.z,
      p: 0,
      done: false,
      by: null,
      rot: ((rnd() * 4) | 0) * (Math.PI / 2),
      code: symInfo.code,
      symbol: symInfo.sym,
      label: symInfo.label,
      col: symInfo.col,
      hex: symInfo.hex,
      guideType
    };
  });

  const hookSpots = pickFarSpots(Math.max(NHOOK, 14), 38, [...TASKS, ...exitAvoid]);
  const HOOKS = hookSpots.map((sp, i) => ({
    id: i, x: sp.x, z: sp.z, occ: null, rot: rnd() * Math.PI * 2
  }));

  const pickNear = (tx, tz) => {
    let best = SPOTS[0], bestD = Infinity;
    for (const sp of SPOTS) {
      if (!isFree(sp.x, sp.z, 0.9)) continue;
      const d = Math.hypot(sp.x - tx, sp.z - tz);
      if (d < bestD) { bestD = d; best = sp; }
    }
    return best;
  };
  const SPAWN = {
    x: ELEVATOR.x,
    z: ELEVATOR.z,
    r: Math.floor(ELEVATOR.z / C),
    c: Math.floor(ELEVATOR.x / C)
  };
  const K_SPAWN = pickNear(midX, 26);

  const makePickups = (count, prefix) => pickFarSpots(count, 11.5, exitAvoid).map((sp, i) => ({
    id: `${prefix}_${i}`, x: sp.x + (rnd() - 0.5) * 0.6, z: sp.z + (rnd() - 0.5) * 0.6, gone: false
  }));

  const WATERS = makePickups(Math.max(NWATER, 20), 'w');
  const SCANS = makePickups(Math.max(NSCAN, 10), 's');
  const JELLIES = makePickups(Math.max(NJELLY, 12), 'j');
  const RATIONS = makePickups(Math.max(NRATION, 10), 'r');
  const FLARES = makePickups(Math.max(NFLARE, 14), 'f');

  // Strange Familiar Level-0 Collectibles / Relics (`vhs_tape`, `locator`, `glitch_cassette`)
  const relicKinds = [
    { kind: 'locator', name: 'La Bàn Định Tuyến A-Sync' },
    { kind: 'vhs_tape', name: 'Cuộn Băng VHS #KV-31' },
    { kind: 'glitch_cassette', name: 'Đài Cassette Băng Lỗi' }
  ];
  const RELICS = pickFarSpots(12, 34, exitAvoid).map((sp, i) => {
    const rk = relicKinds[i % relicKinds.length];
    return { id: `rel_${i}`, kind: rk.kind, label: rk.name, x: sp.x, z: sp.z, gone: false };
  });

  // Ceiling Lights across the huge 124x124 grid
  const REDZ = [];
  const LIGHTS = [];
  for (const z of ZONES) {
    if (z.type === 'redrooms' || z.type === 'red_city') {
      REDZ.push({
        x: ((z.c0 + z.c1 + 1) * 0.5) * C,
        z: ((z.r0 + z.r1 + 1) * 0.5) * C,
        r: Math.max(z.c1 - z.c0, z.r1 - z.r0) * C * 0.65
      });
    }
  }

  for (let r = 1; r < N; r += 2) {
    for (let c = 1; c < N; c += 2) {
      const lx = (c + 0.5) * C;
      const lz = (r + 0.5) * C;
      if (inElevatorZone(lx, lz, 0.35)) continue;
      const zi = cellZone[r][c];
      const z = ZONES[zi];
      const zt = z ? z.type : 'monolith_maze';
      const zcx = z ? ((z.c0 + z.c1 + 1) * 0.5) * C : lx;
      const zcz = z ? ((z.r0 + z.r1 + 1) * 0.5) * C : lz;
      const isRed = zt === 'redrooms' || zt === 'red_city' || zt === 'mb_red_skybridge';
      const isGreen = zt === 'breaker_vault' || zt === 'fluorescent_greenhouse' || zt === 'ff1_ladder_hatch' || zt === 'ff2_vine_plasma' || zt === 'mb_bicycle_tripod';
      const isPurple = zt === 'null_kx_glitch';
      const isBlackout = zt === 'blackout' || zt === 'flooded_sump' || zt === 'mb_van_tunnel';
      const isManila = zt === 'manila' || zt === 'async_threshold';
      const lightWave = Math.sin(r * 0.19 + c * 0.16 + (seed % 7)) + 0.48 * Math.cos(r * 0.11 - c * 0.24);
      const nearSpawn = Math.hypot(lx - SPAWN.x, lz - SPAWN.z) < 24;
      let tier = 3;
      let gain = 0.92;
      let dead = false;
      let rgb = null;
      let hex = null;

      if (zt === 'mb_red_skybridge') {
        tier = 3; gain = 1.05; rgb = [1.0, 0.14, 0.08]; hex = 0xff2414;
      } else if (zt === 'office') {
        const distCenter = Math.hypot(lx - zcx, lz - zcz);
        if (distCenter < 7.5) {
          tier = 4; gain = 1.28; rgb = [1.0, 0.94, 0.76]; hex = 0xfff0c2;
        } else {
          tier = 1; gain = 0.26; dead = rnd() < 0.42; rgb = [0.78, 0.72, 0.54]; hex = 0xc7b88a;
        }
      } else if (zt === 'flooded_yellow_hall') {
        const rowAlt = (((r >> 1) + (c >> 1)) % 2 === 0);
        if (rowAlt) {
          tier = 4; gain = 1.06; rgb = [1.0, 0.95, 0.72]; hex = 0xfff2b8;
        } else {
          tier = 0; gain = 0.12; dead = true;
        }
      } else if (zt === 'mb_bicycle_tripod') {
        tier = 2; gain = 0.78; rgb = [0.58, 0.85, 0.34]; hex = 0x94d957;
      } else if (zt === 'mb_courtyard' || zt === 'mb_mall_atrium' || zt === 'mb_diner_fridge' || zt === 'mb_dining_blue_drapes') {
        tier = 4; gain = 0.96; rgb = [1.0, 0.88, 0.66]; hex = 0xffe0a8;
      } else if (zt === 'mb_unrealized_mural' || zt === 'mb_brick_alcove_hall') {
        const spot = Math.hypot(lx - zcx, lz - zcz) < 7.0;
        tier = spot ? 3 : 1; gain = spot ? 0.94 : 0.28; rgb = [1.0, 0.66, 0.36]; hex = 0xffa85c;
      } else if (zt === 'mb_grey_basement') {
        tier = 3; gain = 0.98; rgb = [0.92, 0.95, 1.0]; hex = 0xebf2ff;
      } else if (zt === 'mb_gold_tile_blood') {
        tier = 4; gain = 1.08; rgb = [1.0, 0.64, 0.20]; hex = 0xffa333;
      } else if (zt === 'suburb_pitfalls' || zt === 'mb_floating_wall_glitch' || zt === 'mb_library_fan_hall' || zt === 'colonnade') {
        tier = 4; gain = zt === 'suburb_pitfalls' ? 1.12 : 1.02; rgb = [1.0, 0.96, 0.84]; hex = 0xfff5d6;
      } else if (zt === 'poolrooms') {
        tier = 4; gain = 1.04; rgb = [0.90, 0.98, 1.0]; hex = 0xe6faff;
      } else if (zt === 'mb_van_tunnel') {
        const nearPortal = Math.hypot(lx - (zcx + 3.2), lz - zcz) < 6.0;
        tier = nearPortal ? 3 : 0; gain = nearPortal ? 1.02 : 0.14; dead = !nearPortal;
        rgb = nearPortal ? [1.0, 0.78, 0.34] : [0.45, 0.42, 0.36]; hex = nearPortal ? 0xffc757 : 0x736b5c;
      } else if (isBlackout && !nearSpawn) {
        tier = 0; gain = 0.16; dead = zt === 'blackout' ? rnd() < 0.82 : rnd() < 0.45;
      } else if (!nearSpawn && (lightWave < -0.78 || (zt === 'huge_pitfall' && lightWave < -0.15))) {
        tier = 1; gain = 0.34; dead = rnd() < 0.20;
      } else if (isManila || isGreen || (!isRed && lightWave > 0.22)) {
        tier = 4; gain = isGreen ? 1.04 : 0.98; dead = false;
      } else if (nearSpawn || zt === 'async_archive' || (!isRed && lightWave >= -0.22)) {
        tier = 3; gain = 0.86; dead = false;
      } else {
        tier = 2; gain = 0.62; dead = rnd() < 0.06;
      }
      const isBrightZone = !isRed && !isPurple && tier >= 4;
      LIGHTS.push({
        x: lx, z: lz,
        tier,
        gain: isRed && zt !== 'mb_red_skybridge' ? 0.58 : isPurple ? 0.68 : gain,
        dead: isRed && zt !== 'mb_red_skybridge' ? rnd() < 0.10 : dead,
        bright: isBrightZone,
        flicker: isRed || isPurple || isManila || zt === 'huge_pitfall' || zt === 'gravity_error'
          ? rnd() < 0.55
          : (tier >= 3 ? rnd() < 0.08 : rnd() < 0.24),
        red: isRed,
        green: isGreen,
        purple: isPurple,
        rgb,
        hex,
        phase: rnd() * 6.283
      });
    }
  }

  // ---------- 8. Path-Connected Floor Guide Cables, Directional Chevron Arrows & Exit Trails ----------
  const buildFlowField = (seeds) => {
    const dist = new Int32Array(N * N).fill(-1);
    const nextR = new Int16Array(N * N).fill(-1);
    const nextC = new Int16Array(N * N).fill(-1);
    const srcId = new Int16Array(N * N).fill(-1);
    const qr = new Int16Array(N * N);
    const qc = new Int16Array(N * N);
    let head = 0, tail = 0;

    for (const s of seeds) {
      if (s.r < 0 || s.r >= N || s.c < 0 || s.c >= N || cellSolid[s.r][s.c]) continue;
      const idx = s.r * N + s.c;
      if (dist[idx] !== -1) continue;
      dist[idx] = 0;
      srcId[idx] = s.id;
      qr[tail] = s.r;
      qc[tail] = s.c;
      tail++;
    }

    while (head < tail) {
      const r = qr[head], c = qc[head];
      head++;
      const idx = r * N + c;
      const nd = dist[idx] + 1;
      const idVal = srcId[idx];

      const tryNbr = (nr, nc, eVal) => {
        if (nr < 0 || nr >= N || nc < 0 || nc >= N) return;
        if (cellSolid[nr][nc] || (eVal !== 0 && eVal !== 3)) return;
        const ni = nr * N + nc;
        if (dist[ni] !== -1) return;
        dist[ni] = nd;
        srcId[ni] = idVal;
        nextR[ni] = r;
        nextC[ni] = c;
        qr[tail] = nr;
        qc[tail] = nc;
        tail++;
      };

      tryNbr(r - 1, c, hEdges[r][c]);
      tryNbr(r + 1, c, hEdges[r + 1][c]);
      tryNbr(r, c - 1, vEdges[r][c]);
      tryNbr(r, c + 1, vEdges[r][c + 1]);
    }
    return { dist, nextR, nextC, srcId };
  };

  const GUIDE_SEGMENTS = [];
  const GUIDE_MARKERS = [];
  const EXIT_GUIDE_SEGMENTS = [];
  const taskFlow = buildFlowField(TASKS.map(t => ({ r: t.r, c: t.c, id: t.id })));
  const exitFlow = buildFlowField([
    { r: 1, c: halfN, id: 0 },
    { r: N - 2, c: halfN, id: 1 }
  ]);

  const seenSeg = new Set();
  const seenMarker = new Set();
  const traceGuideFromCell = (startR, startC, flow, outList, isExitTrail = false, maxSteps = 26) => {
    let r = startR, c = startC, steps = 0;
    const sid = flow.srcId[r * N + c];
    if (sid < 0) return;

    const t = isExitTrail ? null : TASKS[sid];
    const laneShift = isExitTrail ? 0.55 : (((sid % 3) - 1) * 0.42);
    const guideType = isExitTrail ? 'led_strip' : t.guideType;

    if (!isExitTrail && isFree((c + 0.5) * C, (r + 0.5) * C, 0.7)) {
      const mk = `${r},${c},${sid}`;
      if (!seenMarker.has(mk)) {
        seenMarker.add(mk);
        GUIDE_MARKERS.push({
          x: (c + 0.5) * C + laneShift * 0.65,
          z: (r + 0.5) * C + laneShift * 0.65,
          taskId: t.id,
          code: t.code,
          symbol: t.symbol,
          hex: t.hex,
          col: t.col
        });
      }
    }

    while (steps++ < maxSteps) {
      const idx = r * N + c;
      const nr = flow.nextR[idx];
      const nc = flow.nextC[idx];
      if (nr < 0 || nc < 0) break;

      const x0 = (c + 0.5) * C + laneShift;
      const z0 = (r + 0.5) * C + laneShift;
      const x1 = (nc + 0.5) * C + laneShift;
      const z1 = (nr + 0.5) * C + laneShift;
      const dx = x1 - x0, dz = z1 - z0;
      const len = Math.hypot(dx, dz);
      const edgeKey = `${isExitTrail ? 'E' : sid}:${r},${c}>${nr},${nc}`;
      if (!seenSeg.has(edgeKey) && len > 0.1) {
        seenSeg.add(edgeKey);
        outList.push({
          mx: (x0 + x1) * 0.5,
          mz: (z0 + z1) * 0.5,
          rotY: Math.atan2(-dx, -dz), // Local -Z / texture UP chevron points directly from (x0,z0) -> (x1,z1)!
          len: len * 1.04,
          guideType,
          taskId: isExitTrail ? -1 : t.id,
          hex: isExitTrail ? 0xffa834 : t.hex,
          isExit: isExitTrail
        });
      }
      r = nr;
      c = nc;
    }
  };

  // Trace Machine Floor Guide Cables from Spawn, Zone Centers & Corridor Crossings
  traceGuideFromCell(SPAWN.r, SPAWN.c, taskFlow, GUIDE_SEGMENTS, false, 36);
  for (const z of ZONES) {
    const cr = Math.max(1, Math.min(N - 2, (z.r0 + z.r1) >> 1));
    const cc = Math.max(1, Math.min(N - 2, (z.c0 + z.c1) >> 1));
    if (!cellSolid[cr][cc]) traceGuideFromCell(cr, cc, taskFlow, GUIDE_SEGMENTS, false, 24);
  }
  for (let r = 8; r < N - 6; r += 12) {
    for (let c = 8; c < N - 6; c += 12) {
      if (!cellSolid[r][c] && taskFlow.dist[r * N + c] > 1 && taskFlow.dist[r * N + c] < 24) {
        traceGuideFromCell(r, c, taskFlow, GUIDE_SEGMENTS, false, 22);
      }
    }
  }
  // Ensure every single machine also has nearby glowing lead-in feeder lines from adjacent rooms
  for (const t of TASKS) {
    for (const [dr, dc] of [[-5, 0], [5, 0], [0, -5], [0, 5], [-4, -4], [4, 4]]) {
      const sr = Math.max(2, Math.min(N - 3, t.r + dr));
      const sc = Math.max(2, Math.min(N - 3, t.c + dc));
      if (!cellSolid[sr][sc]) traceGuideFromCell(sr, sc, taskFlow, GUIDE_SEGMENTS, false, 12);
    }
  }

  // Trace Exit Navigation Strips from all major crossroads toward North & South Exit Gates
  traceGuideFromCell(SPAWN.r, SPAWN.c, exitFlow, EXIT_GUIDE_SEGMENTS, true, 55);
  for (let r = 14; r < N - 14; r += 26) {
    for (let c = 18; c < N - 18; c += 28) {
      if (!cellSolid[r][c] && exitFlow.dist[r * N + c] > 1) {
        traceGuideFromCell(r, c, exitFlow, EXIT_GUIDE_SEGMENTS, true, 42);
      }
    }
  }

  // Sector Wayfinding Signposts along Spawn, Hubs & Major Crossings
  const signSpots = [
    { x: SPAWN.x + 2.1, z: SPAWN.z - 2.6, rot: 0.25 },
    { x: midX - 2.4, z: halfN * C, rot: Math.PI / 4 },
    ...pickFarSpots(14, 65, exitAvoid).map(sp => ({ x: sp.x, z: sp.z, rot: ((rnd() * 4) | 0) * (Math.PI / 2) }))
  ];
  for (const s of signSpots) {
    if (isFree(s.x, s.z, 0.7)) signs.push(s);
  }

  // ---------- 9. Very Long-Range Non-Omniscient Entity Patrol Routes (distant start <-> end per sector) ----------
  const pickSpotInBounds = (rMin, rMax, cMin, cMax, fallback) => {
    let best = null, bestScore = -1;
    for (let t = 0; t < 240; t++) {
      const sp = SPOTS[(rnd() * SPOTS.length) | 0];
      if (!sp || sp.r < rMin || sp.r > rMax || sp.c < cMin || sp.c > cMax) continue;
      if (Math.hypot(sp.x - SPAWN.x, sp.z - SPAWN.z) < 42) continue;
      return sp;
    }
    for (const sp of SPOTS) {
      if (sp.r >= rMin && sp.r <= rMax && sp.c >= cMin && sp.c <= cMax && Math.hypot(sp.x - SPAWN.x, sp.z - SPAWN.z) > 25) {
        const sc = Math.abs(sp.r - (rMin + rMax) * 0.5) + Math.abs(sp.c - (cMin + cMax) * 0.5);
        if (!best || sc > bestScore) { bestScore = sc; best = sp; }
      }
    }
    return best || fallback;
  };

  const routeQuads = ['NW', 'NE', 'SW', 'SE', 'N', 'W', 'E', 'C'];
  const ENTITY_ROUTES = ENTITY_ARCHETYPES.map((arch, idx) => {
    const qRoll = routeQuads[(idx + Math.floor(rnd() * routeQuads.length)) % routeQuads.length];
    const q = qRoll.length === 2 ? qRoll : arch.quadrant;
    const isNorth = q.startsWith('N') || qRoll === 'C';
    const isWest = q.endsWith('W') || (rnd() < 0.5 && qRoll === 'N');
    // Define opposite extreme corners of each Entity's massive territory (>= 90m from Elevator spawn, >= 145m span)
    const startR0 = isNorth ? 4 : Math.min(N - 34, halfN + 4);
    const startR1 = isNorth ? 26 : N - 26;
    const startC0 = isWest ? 4 : Math.max(26, N - 30);
    const startC1 = isWest ? 28 : N - 5;

    const endR0 = isNorth ? halfN - 6 : 6;
    const endR1 = isNorth ? halfN + 12 : halfN + 6;
    const endC0 = isWest ? halfN - 6 : 6;
    const endC1 = isWest ? N - 8 : halfN + 10;

    let startWP = pickSpotInBounds(startR0, startR1, startC0, startC1, K_SPAWN);
    if (Math.hypot(startWP.x - ELEVATOR.x, startWP.z - ELEVATOR.z) < 88) {
      startWP = pickSpotInBounds(4, 24, isWest ? 4 : N - 28, isWest ? 26 : N - 5, K_SPAWN);
    }
    let endWP = pickSpotInBounds(endR0, endR1, endC0, endC1, SPAWN);
    if (Math.hypot(endWP.x - startWP.x, endWP.z - startWP.z) < 145) {
      let bestSp = endWP, bestD = 0;
      for (const sp of SPOTS) {
        if (Math.hypot(sp.x - SPAWN.x, sp.z - SPAWN.z) < 32) continue;
        const d = Math.hypot(sp.x - startWP.x, sp.z - startWP.z);
        if (d > bestD && d < 290) { bestD = d; bestSp = sp; }
      }
      endWP = bestSp;
    }

    const rLow = 4;
    const rHigh = N - 22;
    const cLow = 4;
    const cHigh = N - 5;
    const mid1 = pickSpotInBounds(rLow, rHigh, cLow, cHigh, startWP);
    const mid2 = pickSpotInBounds(rLow, rHigh, cLow, cHigh, endWP);
    const wps = [startWP, mid1, endWP, mid2];
    const spanDist = Math.hypot(endWP.x - startWP.x, endWP.z - startWP.z);
    return { id: arch.id, kind: arch.kind, wps, spanDist };
  });

  // Dense Architectural Wall Detail (Decals, Posters, Vents, Conduits) scaled for 5x map
  for (const w of WALLS) {
    if (w.crawl || w.half || wallDecals.length > 2600) continue;
    const lenX = w.x1 - w.x0, lenZ = w.z1 - w.z0;
    const isH = lenX >= lenZ;
    const wallLen = isH ? lenX : lenZ;
    if (wallLen < 2.1) continue;

    for (const side of [-1, 1]) {
      if (rnd() > 0.60) continue;
      const offsetAlong = (rnd() - 0.5) * (wallLen - 1.1);
      const px = isH ? (w.x0 + w.x1) * 0.5 + offsetAlong : (side > 0 ? w.x1 + 0.025 : w.x0 - 0.025);
      const pz = isH ? (side > 0 ? w.z1 + 0.025 : w.z0 - 0.025) : (w.z0 + w.z1) * 0.5 + offsetAlong;
      const ang = isH ? (side > 0 ? 0 : Math.PI) : (side > 0 ? Math.PI / 2 : -Math.PI / 2);

      if (rnd() < 0.72) {
        wallDecals.push({
          x: px, z: pz, ang, y: 1.5 + rnd() * 1.4,
          w: 1.5 + rnd() * 1.6, h: 1.9 + rnd() * 2.0, kind: (rnd() * 4) | 0
        });
      }
      if (rnd() < 0.36 && posters.length < 750) {
        posters.push({
          x: px + Math.sin(ang) * 0.01, z: pz + Math.cos(ang) * 0.01, ang,
          y: 1.35 + rnd() * 0.65, w: 0.9 + rnd() * 0.7, h: 0.75 + rnd() * 0.55, kind: (rnd() * 6) | 0
        });
      }
      if (rnd() < 0.24 && vents.length < 650) {
        vents.push({ x: px + Math.sin(ang) * 0.015, z: pz + Math.cos(ang) * 0.015, ang, y: WH - 0.65 });
      }
    }

    if (wallLen >= C * 0.9 && rnd() < 0.34 && pipes.length < 700) {
      const side = rnd() < 0.5 ? 1 : -1;
      pipes.push({
        x: (w.x0 + w.x1) * 0.5 + (isH ? 0 : side * ((w.x1 - w.x0) * 0.5 + 0.08)),
        z: (w.z0 + w.z1) * 0.5 + (isH ? side * ((w.z1 - w.z0) * 0.5 + 0.08) : 0),
        len: wallLen - 0.4, isH, y: WH - 0.26 - rnd() * 0.16
      });
    }
  }

  for (let i = 0; i < 240; i++) {
    const sp = SPOTS[(rnd() * SPOTS.length) | 0];
    if (sp) puddles.push({ x: sp.x + (rnd() - 0.5) * 1.2, z: sp.z + (rnd() - 0.5) * 1.2, r: 0.75 + rnd() * 1.15 });
  }
  for (let i = 0; i < 110; i++) {
    const sp = SPOTS[(rnd() * SPOTS.length) | 0];
    if (sp) cords.push({ x: sp.x + (rnd() - 0.5) * 1.5, z: sp.z + (rnd() - 0.5) * 1.5, len: 1.1 + rnd() * 1.4 });
  }

  // Inject 20 canonical Backrooms Sub-Level Entrances distributed cleanly across Level 0:
  // - Shaped Portals / Doors (Poolrooms, Red City, Terror Hotel, Endless City, Paradise, Sunset Beach, Courtyard)
  // - Flat-Floor False Noclip Spots on common walkways (look totally flat, drop player straight down!)
  // - Anomalous Pickups (Office CRT monitor, Wheat Sheaf, Attic Key, Pink Plushie, 64-Bit Overflow Cube)
  // - Low Crawl Hatches (Pipe Dreams steam vent, Electrical conduit, Cave crack)
  const ENTRANCES = [];
  {
    const usedCoords = [
      { x: ELEVATOR.x, z: ELEVATOR.z },
      ...TASKS.map(t => ({ x: t.x, z: t.z })),
      ...HOOKS.map(h => ({ x: h.x, z: h.z }))
    ];
    const foyerX = ELEVATOR.x;
    const foyerZ = ELEVATOR.z - 12;
    const nearSorted = [...SPOTS].sort((a, b) => {
      const da = Math.hypot(a.x - foyerX, a.z - foyerZ);
      const db = Math.hypot(b.x - foyerX, b.z - foyerZ);
      return da - db;
    });

    const isSafeSpot = (sp, minGap = 15) => {
      if (inElevatorZone(sp.x, sp.z, 3.2) || !isFree(sp.x, sp.z, 1.35)) return false;
      for (const h of hugeChasms || []) {
        if (sp.x >= h.x0 - 2.5 && sp.x <= h.x1 + 2.5 && sp.z >= h.z0 - 2.5 && sp.z <= h.z1 + 2.5) return false;
      }
      for (const u of usedCoords) {
        if (Math.hypot(sp.x - u.x, sp.z - u.z) < minGap) return false;
      }
      return true;
    };

    for (let idx = 0; idx < LEVEL_LIST.length; idx++) {
      const lvl = LEVEL_LIST[idx];
      let chosen = null;
      const targetMinDist = idx < 4 ? 14 + idx * 9 : 36 + idx * 7;
      for (const sp of nearSorted) {
        const fd = Math.hypot(sp.x - foyerX, sp.z - foyerZ);
        if (fd < targetMinDist) continue;
        if (!isSafeSpot(sp, idx < 4 ? 12 : 18)) continue;
        chosen = sp;
        break;
      }
      if (!chosen) {
        for (const sp of nearSorted) {
          if (isSafeSpot(sp, 10)) { chosen = sp; break; }
        }
      }
      if (!chosen && SPOTS.length) {
        chosen = SPOTS[(idx * 97) % SPOTS.length];
      }
      if (chosen) {
        usedCoords.push({ x: chosen.x, z: chosen.z });
        ENTRANCES.push({
          id: `ent_${lvl.id}`,
          levelId: lvl.id,
          code: lvl.code,
          name: lvl.vnName,
          entryType: lvl.entryType,
          label: lvl.entryLabel,
          desc: lvl.entryDesc,
          accent: lvl.palette?.accent ?? 0x48d0f5,
          x: chosen.x,
          z: chosen.z,
          rot: ((idx * 1.17) % (Math.PI * 2)),
          radius: lvl.entryType === 'noclip_floor' ? 1.5 : lvl.entryType === 'pickup' ? 1.9 : 2.1,
          needCrouch: lvl.entryType === 'crawl_hatch',
          discovered: false
        });
      }
    }
  }

  return {
    levelId: 'level0',
    gridN: N,
    cellSize: C,
    worldSpan: N * C,
    ceilH: WH,
    RECTS, wallGrid, hEdges, vEdges, cellSolid, ZONES, FLOOR_PATCHES, hugeChasms, CATWALKS,
    REDZ, TASKS, HOOKS, EXITS, LIGHTS, TRAPS: [],
    WATERS, SCANS, JELLIES, RATIONS, FLARES, RELICS,
    GUIDE_SEGMENTS, EXIT_GUIDE_SEGMENTS, GUIDE_MARKERS, ENTITY_ROUTES,
    SPOTS, SPAWN, ELEVATOR, K_SPAWN, PILLARS, WALLS, ARCHES, ENTRANCES,
    PROPS: { vents, pipes, puddles, posters, wallDecals, pitfalls, furniture, curiosities, anomalies, signs, cords },
    exitsOpen: false,
    elevatorState: 'closed',
    elevatorOpenProgress: 0,
    seed
  };
}

export function collide(x, z, r, map, crouch = false, y = 0) {
  const { wallGrid, exitsOpen } = map;
  const gN = map.gridN ?? N;
  const gC = map.cellSize ?? C;
  const span = map.worldSpan ?? (gN * gC);
  const maxX = span - r;
  const maxZ = span - r;
  if (x < r) x = r;
  if (x > maxX) x = maxX;

  if (!exitsOpen) {
    if (z < r) z = r;
    if (z > maxZ) z = maxZ;
  } else {
    const midX = span * 0.5;
    const inExit = Math.abs(x - midX) < 1.45;
    if (!inExit) {
      if (z < r) z = r;
      if (z > maxZ) z = maxZ;
    }
  }

  const near = wallGrid.queryNear(x, z, r + 1.4);
  for (const b of near) {
    if (b.crawl && crouch && (y - (b.crawlBaseY || 0)) < 0.35) continue;
    if (b.maxY != null && y >= b.maxY - 0.15) continue;
    if (b.minY != null && y + 1.55 <= b.minY) continue;
    if (b.elevatorDoor && (map.elevatorOpenProgress || 0) >= 0.72) continue;

    const cx = Math.max(b.x0, Math.min(x, b.x1));
    const cz = Math.max(b.z0, Math.min(z, b.z1));
    const dx = x - cx;
    const dz = z - cz;
    const d2 = dx * dx + dz * dz;
    if (d2 < r * r) {
      const d = Math.sqrt(d2);
      if (d > 1e-5) {
        const push = (r - d) / d;
        x += dx * push;
        z += dz * push;
      } else {
        const ox0 = Math.abs(x - b.x0), ox1 = Math.abs(b.x1 - x);
        const oz0 = Math.abs(z - b.z0), oz1 = Math.abs(b.z1 - z);
        const m = Math.min(ox0, ox1, oz0, oz1);
        if (m === ox0) x = b.x0 - r;
        else if (m === ox1) x = b.x1 + r;
        else if (m === oz0) z = b.z0 - r;
        else z = b.z1 + r;
      }
    }
  }
  return [x, z];
}

export function blocked(x1, z1, x2, z2, map) {
  const dx = x2 - x1;
  const dz = z2 - z1;
  const dist = Math.hypot(dx, dz);
  if (dist < 0.1) return false;

  const steps = Math.min(90, Math.ceil(dist / 0.45));
  const sx = dx / steps;
  const sz = dz / steps;

  let cx = x1;
  let cz = z1;
  for (let i = 1; i < steps; i++) {
    cx += sx;
    cz += sz;
    const near = map.wallGrid.queryNear(cx, cz, 0.35);
    for (const b of near) {
      if (b.half) continue;
      if (b.elevatorDoor && (map.elevatorOpenProgress || 0) >= 0.72) continue;
      if (cx >= b.x0 && cx <= b.x1 && cz >= b.z0 && cz <= b.z1) {
        return true;
      }
    }
  }
  return false;
}
