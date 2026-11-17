/*!
 * Copyright (c) 2026 Vendreith (Original Code & Procedural Implementation).
 * Adapted Backrooms level/entity concepts & lore: licensed under CC BY-SA 3.0.
 * Licensing & attribution: see LICENSE.md, ATTRIBUTION.md, and THIRD_PARTY_NOTICES.md
 */

// ---------- Procedural Level Generators for All 20 Iconic Backrooms Realms ----------
// Generates rich, massive (518m-900m) headless `map` objects tailored to each Level's
// signature liminal space: pools + water slides, colossal skies/horizons/plains, repeating
// houses with full household interiors, winding mazes, ultra-empty staircase voids & crouch vents.

import { SpatialGrid2D } from '../engine.js';
import { LEVEL_CATALOG } from './catalog.js';
import { initTerrainIndex, getTerrainAt } from './terrain.js';
import { populateLevelLoreProps } from './level_populator.js';
import { buildPoolroomsWorld } from './poolrooms_world.js';
import { rasterizePoolroomsNavigation } from './poolrooms_v4_world.js';

function mulberry32(seed) {
  let a = seed | 0;
  return () => {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Stamps an enterable single-story house or cabin prefab at center (cx, cz) with doorway facing `doorSide`,
 * interior dividing room wall, roof pitch metadata, and rich household furniture items inside.
 */
function stampEnterableHouse(out, cx, cz, w, d, h, doorSide, rnd, opts = {}) {
  const { RECTS, PLATFORMS, FURNITURE, HOUSES, LIGHTS } = out;
  const wt = 0.34;
  const doorW = 2.4;
  const hx = w * 0.5, hz = d * 0.5;
  const baseY = opts.baseY || 0;
  const x0 = cx - hx, x1 = cx + hx, z0 = cz - hz, z1 = cz + hz;
  const style = opts.style || 'suburb';
  const roofCol = opts.roofCol ?? 0x452d26;
  const wallCol = opts.wallCol ?? 0xb8b2a6;

  // Floor pad slightly raised or textured
  PLATFORMS.push({ x0: x0 + 0.1, z0: z0 + 0.1, x1: x1 - 0.1, z1: z1 - 0.1, y: baseY + 0.04, surface: 'wood', draw: true, col: 0x6b4e38 });

  const addWall = (ax0, az0, ax1, az1) => {
    RECTS.push({ x0: ax0, z0: az0, x1: ax1, z1: az1, y0: baseY, y1: baseY + h, h, kind: 'wall', hidden: true });
  };

  // Perimeter walls leaving generous open doorway on `doorSide`
  if (doorSide === 'south') {
    addWall(x0, z1 - wt, cx - doorW * 0.5, z1);
    addWall(cx + doorW * 0.5, z1 - wt, x1, z1);
  } else addWall(x0, z1 - wt, x1, z1);

  if (doorSide === 'north') {
    addWall(x0, z0, cx - doorW * 0.5, z0 + wt);
    addWall(cx + doorW * 0.5, z0, x1, z0 + wt);
  } else addWall(x0, z0, x1, z0 + wt);

  if (doorSide === 'west') {
    addWall(x0, z0, x0 + wt, cz - doorW * 0.5);
    addWall(x0, cz + doorW * 0.5, x0 + wt, z1);
  } else addWall(x0, z0, x0 + wt, z1);

  if (doorSide === 'east') {
    addWall(x1 - wt, z0, x1, cz - doorW * 0.5);
    addWall(x1 - wt, cz + doorW * 0.5, x1, z1);
  } else addWall(x1 - wt, z0, x1, z1);

  // Visual house envelope (walls rendered cleanly around door gap + gable roof)
  HOUSES.push({ cx, cz, w, d, h, baseY, doorSide, doorW, wallCol, roofCol, style });

  // Household Interior Appliances & Furniture
  const furnSet = [
    { kind: 'sofa', dx: -hx + 1.6, dz: -hz + 1.5, rot: 0 },
    { kind: 'tv_stand', dx: -hx + 1.6, dz: -hz + 4.1, rot: Math.PI },
    { kind: 'table', dx: hx - 2.1, dz: 0, rot: 0 },
    { kind: 'bed', dx: hx - 2.0, dz: -hz + 1.8, rot: Math.PI * 0.5 },
    { kind: 'fridge', dx: -hx + 1.1, dz: hz - 1.3, rot: 0 },
    { kind: 'cabinet', dx: 0.4, dz: -hz + 1.0, rot: 0 }
  ];
  for (const f of furnSet) {
    if (rnd() < 0.86) {
      FURNITURE.push({
        kind: f.kind,
        x: cx + f.dx,
        z: cz + f.dz,
        y: baseY + 0.04,
        rot: f.rot,
        tint: style === 'kitty' ? 0xf5a6c8 : style === 'cartoon' ? 0xe6c858 : undefined
      });
    }
  }
  LIGHTS.push({ x: cx, z: cz, y: baseY + h - 0.35, gain: 0.72 });
}

/**
 * Generates a maze/wing corridor complex on an internal grid (gN x gN) with connected spanning tree + extra loops
 * plus large open plaza rooms & dedicated crouch vents.
 */
function buildMazeCore(gN, gC, rnd, cfg, roomCount = 14) {
  const hEdges = Array.from({ length: gN + 1 }, () => new Uint8Array(gN).fill(1));
  const vEdges = Array.from({ length: gN }, () => new Uint8Array(gN + 1).fill(1));
  const cellSolid = Array.from({ length: gN }, () => new Uint8Array(gN).fill(0));
  const visited = Array.from({ length: gN }, () => new Uint8Array(gN).fill(0));

  // Punch several open grand halls/plazas BEFORE carving corridors
  const plazas = [];
  for (let i = 0; i < roomCount; i++) {
    const rw = 3 + ((rnd() * 4) | 0);
    const rh = 3 + ((rnd() * 4) | 0);
    const c0 = Math.max(2, Math.min(gN - rw - 3, ((rnd() * (gN - rw - 4)) | 0) + 2));
    const r0 = Math.max(2, Math.min(gN - rh - 3, ((rnd() * (gN - rh - 4)) | 0) + 2));
    plazas.push({ c0, r0, c1: c0 + rw, r1: r0 + rh });
    for (let r = r0; r < r0 + rh; r++) {
      for (let c = c0; c < c0 + rw; c++) {
        if (c < c0 + rw - 1) vEdges[r][c + 1] = 0;
        if (r < r0 + rh - 1) hEdges[r + 1][c] = 0;
      }
    }
  }

  // Iterative DFS Maze Carving for rich winding multi-fork corridors
  const stack = [[Math.floor(gN * 0.5), Math.floor(gN * 0.5)]];
  visited[stack[0][0]][stack[0][1]] = 1;
  const dirs = [[0, 1], [0, -1], [1, 0], [-1, 0]];

  while (stack.length > 0) {
    const [r, c] = stack[stack.length - 1];
    const order = [0, 1, 2, 3];
    for (let i = 3; i > 0; i--) {
      const j = (rnd() * (i + 1)) | 0;
      [order[i], order[j]] = [order[j], order[i]];
    }
    let moved = false;
    for (const d of order) {
      const nr = r + dirs[d][0], nc = c + dirs[d][1];
      if (nr < 1 || nr >= gN - 1 || nc < 1 || nc >= gN - 1) continue;
      if (visited[nr][nc]) continue;
      visited[nr][nc] = 1;
      if (d === 0) vEdges[r][c + 1] = 0;
      else if (d === 1) vEdges[r][c] = 0;
      else if (d === 2) hEdges[r + 1][c] = 0;
      else hEdges[r][c] = 0;
      stack.push([nr, nc]);
      moved = true;
      break;
    }
    if (!moved) stack.pop();
  }

  // Braid maze slightly so loops, flanks, and low crouch vents (edge value = 3) exist
  const hasCrawl = cfg.features?.includes('crawl');
  const CRAWL_WALLS = [];
  for (let r = 2; r < gN - 2; r++) {
    for (let c = 2; c < gN - 2; c++) {
      if (vEdges[r][c] === 1 && rnd() < 0.24) {
        if (hasCrawl && rnd() < 0.14) {
          vEdges[r][c] = 3;
          CRAWL_WALLS.push({ orientation: 'v', r, c });
        } else {
          vEdges[r][c] = 0;
        }
      }
      if (hEdges[r][c] === 1 && rnd() < 0.24) {
        if (hasCrawl && rnd() < 0.14) {
          hEdges[r][c] = 3;
          CRAWL_WALLS.push({ orientation: 'h', r, c });
        } else {
          hEdges[r][c] = 0;
        }
      }
    }
  }

  return { hEdges, vEdges, cellSolid, plazas, CRAWL_WALLS };
}

function wallsFromEdges(gN, gC, wallH, hEdges, vEdges, CRAWL_WALLS, RECTS, WALLS) {
  const t = Math.min(0.92, gC * 0.16);
  const hw = t * 0.5;

  // Coalesce horizontal wall segments row-by-row for minimal geometry draw calls
  for (let r = 0; r <= gN; r++) {
    let runStart = -1;
    for (let c = 0; c <= gN; c++) {
      const solid = c < gN && hEdges[r][c] === 1;
      if (solid && runStart < 0) runStart = c;
      if ((!solid || c === gN) && runStart >= 0) {
        const x0 = runStart * gC - hw;
        const x1 = c * gC + hw;
        const z0 = r * gC - hw;
        const z1 = r * gC + hw;
        const box = { x0, z0, x1, z1, y0: 0, y1: wallH, h: wallH };
        RECTS.push(box);
        WALLS.push(box);
        runStart = -1;
      }
    }
  }

  // Coalesce vertical wall segments column-by-column
  for (let c = 0; c <= gN; c++) {
    let runStart = -1;
    for (let r = 0; r <= gN; r++) {
      const solid = r < gN && vEdges[r][c] === 1;
      if (solid && runStart < 0) runStart = r;
      if ((!solid || r === gN) && runStart >= 0) {
        const x0 = c * gC - hw;
        const x1 = c * gC + hw;
        const z0 = runStart * gC - hw;
        const z1 = r * gC + hw;
        const box = { x0, z0, x1, z1, y0: 0, y1: wallH, h: wallH };
        RECTS.push(box);
        WALLS.push(box);
        runStart = -1;
      }
    }
  }

  // Build overhead crawl-lintels (passable only when crouching!)
  const crawlOpeningTop = 1.25;
  for (const cw of CRAWL_WALLS) {
    if (cw.orientation === 'h') {
      const box = {
        x0: cw.c * gC, z0: cw.r * gC - hw,
        x1: (cw.c + 1) * gC, z1: cw.r * gC + hw,
        y0: crawlOpeningTop, y1: wallH, h: wallH - crawlOpeningTop,
        crawl: true, crawlBaseY: 0
      };
      RECTS.push(box);
      WALLS.push(box);
    } else {
      const box = {
        x0: cw.c * gC - hw, z0: cw.r * gC,
        x1: cw.c * gC + hw, z1: (cw.r + 1) * gC,
        y0: crawlOpeningTop, y1: wallH, h: wallH - crawlOpeningTop,
        crawl: true, crawlBaseY: 0
      };
      RECTS.push(box);
      WALLS.push(box);
    }
  }
}

/**
 * Main Entry: generates the complete map state for any sub-level ID (`levelId`).
 */
export function genSubLevelMap(levelId, seed = 2026) {
  const cfg = LEVEL_CATALOG[levelId];
  if (!cfg) return null;

  const rnd = mulberry32(seed + cfg.order * 7919);
  const gN = cfg.gridN;
  const gC = cfg.cellSize;
  const span = cfg.worldSpan || (gN * gC);
  const wallH = cfg.isOutdoor ? (cfg.archetype === 'endless_city' ? 32 : cfg.archetype === 'redcity' ? 24 : 5.2) : cfg.ceilH;

  const RECTS = [];
  const WALLS = [];
  const LIGHTS = [];
  const WATER_RECTS = [];
  const PLATFORMS = [];
  const RAMPS = [];
  const SLIDES = [];
  const HOUSES = [];
  const TOWERS = [];
  const FURNITURE = [];
  const TREES = [];
  const WHEAT = [];
  const PIPES = [];
  const DECO_BLOCKS = [];
  const PROPS = [];
  const ANIM_PROPS = [];
  const meta = { corrC: 10, atria: null, roadGrid: null, plazas: null, seaLine: 0 };
  const WATERS = []; // Almond Water collectibles
  const FLARES = [];
  const SCANS = [];
  const JELLIES = [];
  const RATIONS = [];
  const SPOTS = [];

  const arch = cfg.archetype;
  const mid = span * 0.5;
  let SPAWN = { x: gC * 3.5, z: gC * 3.5, y: 0, yaw: 0 };
  let END_POS = { x: span - gC * 4.5, z: span - gC * 4.5, y: 0 };
  let TASK_POS = null;
  let POOL_K_SPAWN = null;
  let PUMPS = null;
  let poolArchitecture = null;
  let POOL_ZONES = null;
  let POOL_ARCH = null;
  let LIGHT_VOLUMES = [];
  let SPIRAL_SLIDES = [];
  let hEdges = null, vEdges = null, cellSolid = null;
  let waterCells = null;

  // =========================================================================
  // ARCHETYPE A: POOLROOMS (Level 37) - 40-Zone Liminal Aquatic Labyrinth
  // =========================================================================
  if (arch === 'poolrooms') {
    const poolRes = buildPoolroomsWorld({
      gN, gC, wallH, rnd, seed,
      RECTS, WALLS, WATER_RECTS, PLATFORMS, RAMPS, SLIDES,
      PROPS, ANIM_PROPS, LIGHTS, CRAWL_WALLS: []
    });
    poolArchitecture = poolRes;
    PUMPS = poolRes.PUMPS;
    POOL_ZONES = poolRes.POOL_ZONES;
    POOL_ARCH = poolRes.POOL_ARCH || [];
    LIGHT_VOLUMES = poolRes.LIGHT_VOLUMES || [];
    SPIRAL_SLIDES = poolRes.SPIRAL_SLIDES || [];
    TASK_POS = poolRes.TASK_POS;
    POOL_K_SPAWN = poolRes.K_SPAWN;
    SPAWN = poolRes.SPAWN;
    END_POS = poolRes.END_POS;
    meta.atria = poolRes.atria;
    meta.customPoolrooms = true;

    // Navigation is rasterised after the collision grid below.
  }

  // =========================================================================
  // ARCHETYPE B: RED CITY / LEVEL ! (Run For Your Life -> Crimson Canyon Skyline)
  // =========================================================================
  else if (arch === 'redcity') {
    // 1. Opening iconic Hospital Red Corridor (South -> North strip on left flank)
    // opens into sprawling Red Crimson Urban Skyline Labyrinth!
    const corrC = 10;
    meta.corrC = corrC;
    const hw = 0.48;
    // Corridor side walls
    RECTS.push({ x0: corrC * gC - hw, z0: gC * 2, x1: corrC * gC + hw, z1: gC * 32, y0: 0, y1: 5.5, h: 5.5 });
    WALLS.push({ x0: corrC * gC - hw, z0: gC * 2, x1: corrC * gC + hw, z1: gC * 32, y0: 0, y1: 5.5, h: 5.5 });
    RECTS.push({ x0: (corrC + 3) * gC - hw, z0: gC * 2, x1: (corrC + 3) * gC + hw, z1: gC * 32, y0: 0, y1: 5.5, h: 5.5 });
    WALLS.push({ x0: (corrC + 3) * gC - hw, z0: gC * 2, x1: (corrC + 3) * gC + hw, z1: gC * 32, y0: 0, y1: 5.5, h: 5.5 });

    // Urban Skyscraper City Blocks + winding neon-red alley forks across the rest of the 744m metropolis!
    const blockStep = 7;
    for (let br = 3; br < gN - 7; br += blockStep) {
      for (let bc = 3; bc < gN - 7; bc += blockStep) {
        if (bc >= corrC - 2 && bc <= corrC + 6 && br <= 34) continue;
        const bx0 = (bc + 1) * gC;
        const bz0 = (br + 1) * gC;
        const bw = (blockStep - 2.4) * gC;
        const bd = (blockStep - 2.4) * gC;
        const bh = 16 + ((rnd() * 26) | 0);
        // Leave occasional underpass / crouch tunnel beneath a skyscraper!
        if (rnd() < 0.16) {
          DECO_BLOCKS.push({ x: bx0 + bw * 0.5, z: bz0 + bd * 0.5, y0: 1.35, w: bw, d: bd, h: bh, col: 0x3b1214 });
          RECTS.push({ x0: bx0, z0: bz0, x1: bx0 + bw, z1: bz0 + bd, y0: 1.35, y1: bh + 1.35, h: bh, crawl: true, crawlBaseY: 0 });
        } else {
          RECTS.push({ x0: bx0, z0: bz0, x1: bx0 + bw, z1: bz0 + bd, y0: 0, y1: bh, h: bh });
          TOWERS.push({ x: bx0 + bw * 0.5, z: bz0 + bd * 0.5, w: bw, d: bd, h: bh, col: 0x361012, windowAccent: 0xff2e24 });
        }
        LIGHTS.push({ x: bx0 - gC * 0.5, z: bz0 - gC * 0.5, y: 4.8, red: true, gain: 1.3 });
      }
    }
    // Red overhead siren lights along entry corridor
    for (let rz = gC * 4; rz < gC * 34; rz += 9) {
      LIGHTS.push({ x: (corrC + 1.5) * gC, z: rz, y: 4.6, red: true, gain: 1.4 });
    }
    SPAWN = { x: (corrC + 1.5) * gC, z: gC * 3.5, y: 0, yaw: Math.PI };
    END_POS = { x: span - gC * 12, z: span - gC * 12, y: 0 };
  }

  // =========================================================================
  // ARCHETYPE C: INFINITE OPEN WORLDS WITH SKY, HORIZON, PLAINS & HOUSES
  // (Level 10 Field, Level 9 Dark Suburbs, Level 94 Motion, Level 14 Paradise,
  //  Level 48 Sunset Beach, Level 11 Endless City, Level 7 Ocean, Level 9223 Void)
  // =========================================================================
  else if (
    arch === 'field' || arch === 'suburbs' || arch === 'motion_town' ||
    arch === 'crimson_forest' || arch === 'sunset_beach' ||
    arch === 'endless_city' || arch === 'ocean' || arch === 'void_staircase'
  ) {
    // 1. FIELD (Level 10 Infinite Wheat & Meadow + Farmhouses + Sky & Horizon)
    if (arch === 'field') {
      const startRoadX = mid + Math.sin(36 * 0.012) * 140;
      SPAWN = { x: startRoadX, z: 36, y: 0, yaw: Math.PI };
      END_POS = { x: span - 75, z: span - 75, y: 0 };
      // Rolling winding country dirt trail + wooden rail fences
      for (let s = 20; s < span - 25; s += 16) {
        const roadZ = s;
        const roadX = mid + Math.sin(s * 0.012) * 140;
        PLATFORMS.push({ x0: roadX - 5.5, z0: roadZ - 8.5, x1: roadX + 5.5, z1: roadZ + 8.5, y: 0.03, surface: 'concrete', draw: true, col: 0x8a6f4b });
        // Wooden fence posts along flanks
        if (rnd() < 0.78) {
          DECO_BLOCKS.push({ x: roadX - 8, z: roadZ, y0: 0, w: 0.3, d: 12, h: 1.1, col: 0x785532 });
          DECO_BLOCKS.push({ x: roadX + 8, z: roadZ, y0: 0, w: 0.3, d: 12, h: 1.1, col: 0x785532 });
        }
      }
      // Dense golden wheat fields + tall clusters lining the dirt trail & rolling across the horizon
      for (let i = 0; i < 2400; i++) {
        const nearTrail = i < 700;
        const wz = 24 + rnd() * (span - 48);
        const wx = nearTrail
          ? (mid + Math.sin(wz * 0.012) * 140 + (rnd() < 0.5 ? -1 : 1) * (10 + rnd() * 26))
          : (24 + rnd() * (span - 48));
        WHEAT.push({ x: wx, z: wz, scale: 0.9 + rnd() * 0.95, golden: rnd() < 0.78 });
      }
      // Welcoming landmark red farmhouse near spawn overlook + 16 repeating barns across the field
      stampEnterableHouse({ RECTS, PLATFORMS, FURNITURE, HOUSES, LIGHTS }, startRoadX - 24, 68, 12, 10, 4.4, 'east', rnd, {
        wallCol: 0x9c3b2e,
        roofCol: 0x3b2a1e,
        style: 'farm'
      });
      for (let i = 0; i < 120; i++) {
        const tx = 35 + rnd() * (span - 70);
        const tz = 35 + rnd() * (span - 70);
        if (Math.hypot(tx - SPAWN.x, tz - SPAWN.z) < 20) continue;
        TREES.push({ x: tx, z: tz, h: 6 + rnd() * 6, kind: 'oak' });
        RECTS.push({ x0: tx - 0.55, z0: tz - 0.55, x1: tx + 0.55, z1: tz + 0.55, y0: 0, y1: 6, h: 6, hidden: true });
      }
      // Repeating iconic Farmhouses & Red Barns across the field!
      const houseSides = ['south', 'east', 'west', 'north'];
      for (let i = 0; i < 16; i++) {
        const hx = 90 + (i % 4) * 195 + (rnd() - 0.5) * 45;
        const hz = 90 + Math.floor(i / 4) * 195 + (rnd() - 0.5) * 45;
        if (Math.hypot(hx - SPAWN.x, hz - SPAWN.z) < 28 || Math.hypot(hx - END_POS.x, hz - END_POS.z) < 28) continue;
        stampEnterableHouse({ RECTS, PLATFORMS, FURNITURE, HOUSES, LIGHTS }, hx, hz, 12, 10, 4.4, houseSides[i % 4], rnd, {
          wallCol: i % 3 === 0 ? 0x9c3b2e : 0xd6c29d,
          roofCol: 0x3b2a1e,
          style: 'farm'
        });
      }
    }

    // 2. DARKENED SUBURBS (Level 9) & MOTION TOWN (Level 94) - Repeating Houses & Roads!
    else if (arch === 'suburbs' || arch === 'motion_town') {
      const isCartoon = arch === 'motion_town';
      const roadGrid = [Math.round(span * 0.25), Math.round(span * 0.5), Math.round(span * 0.75)];
      meta.roadGrid = roadGrid;
      SPAWN = isCartoon ? { x: mid, z: 32, y: 0, yaw: Math.PI } : { x: 68, z: roadGrid[0], y: 0, yaw: -Math.PI * 0.5 };
      END_POS = { x: mid, z: span - 54, y: isCartoon ? 10.0 : 0 };
      // Long asphalt/cobble avenues N-S and E-W
      for (const rx of roadGrid) {
        PLATFORMS.push({ x0: rx - 7, z0: 12, x1: rx + 7, z1: span - 12, y: 0.03, surface: 'asphalt', draw: true, col: isCartoon ? 0x998e7a : 0x26292e });
        PLATFORMS.push({ x0: 12, z0: rx - 7, x1: span - 12, z1: rx + 7, y: 0.03, surface: 'asphalt', draw: true, col: isCartoon ? 0x998e7a : 0x26292e });
      }
      // Stamp 28 REPEATING IDENTICAL ENTERABLE HOUSES lining roads cleanly!
      const colors = isCartoon ? [0xf5d66b, 0x98d8f5, 0xf59eb0, 0xbcf098] : [0x8e897f, 0x7c7a74, 0x998a78, 0x737b80];
      let hi = 0;
      for (const rz of roadGrid) {
        for (let x = 58; x < span - 58; x += 68) {
          if (Math.abs(x - mid) < 22) continue;
          const hx = x, hz1 = rz - 22, hz2 = rz + 22;
          stampEnterableHouse({ RECTS, PLATFORMS, FURNITURE, HOUSES, LIGHTS }, hx, hz1, 13, 11, 4.5, 'south', rnd, {
            wallCol: colors[hi % colors.length], roofCol: isCartoon ? 0xc94040 : 0x2c282a, style: isCartoon ? 'cartoon' : 'suburb'
          });
          stampEnterableHouse({ RECTS, PLATFORMS, FURNITURE, HOUSES, LIGHTS }, hx, hz2, 13, 11, 4.5, 'north', rnd, {
            wallCol: colors[(hi + 1) % colors.length], roofCol: isCartoon ? 0x4575c9 : 0x2c282a, style: isCartoon ? 'cartoon' : 'suburb'
          });
          LIGHTS.push({ x: hx + 16, z: rz - 8.5, y: 5.5, gain: 0.92 });
          hi++;
        }
      }
      // Iconic Level 94 Floating / Hill Castle Monument at far end!
      if (isCartoon) {
        PLATFORMS.push({ x0: mid - 26, z0: span - 82, x1: mid + 26, z1: span - 30, y: 10.0, surface: 'stone', draw: true, col: 0xd9d2c5 });
        RAMPS.push({ x0: mid - 6, z0: span - 118, x1: mid + 6, z1: span - 82, axis: 'z', y0: 0.03, y1: 10.0, surface: 'stone', draw: true, col: 0xc2bba8 });
        // Castle four corner turrets
        for (const cxOff of [-22, 22]) {
          for (const czOff of [-22, 22]) {
            TOWERS.push({ x: mid + cxOff, z: span - 56 + czOff, w: 6, d: 6, h: 24, baseY: 10, col: 0xe6dec8, windowAccent: 0xffd24a });
          }
        }
      } else {
        // Level 9 edge forest trees lining neighborhood borders
        for (let i = 0; i < 160; i++) {
          const tx = 18 + rnd() * (span - 36), tz = 18 + rnd() * (span - 36);
          if (roadGrid.some(rg => Math.abs(tx - rg) < 28 || Math.abs(tz - rg) < 28)) continue;
          TREES.push({ x: tx, z: tz, h: 7 + rnd() * 6, kind: 'pine' });
        }
      }
    }

    // 3. THALASSOPHOBIA (Level 7 Dark Moonlit Ocean + Flooded House + Docks)
    else if (arch === 'ocean') {
      // Nearly whole world is dark deep open ocean (`WATER_RECTS`), walked via docks + tilted flooded house!
      WATER_RECTS.push({ x0: 0, z0: 0, x1: span, z1: span, bedY: -0.78, waterY: 0.0, col: 0x0b2a42 });
      // Spawn inside flooded wooden house at South edge + long piers reaching across ocean to distant Lighthouse Rig
      PLATFORMS.push({ x0: mid - 12, z0: 24, x1: mid + 12, z1: 48, y: 0.14, surface: 'wood', draw: true, col: 0x5c4738 });
      stampEnterableHouse({ RECTS, PLATFORMS, FURNITURE, HOUSES, LIGHTS }, mid, 36, 16, 14, 4.4, 'south', rnd, {
        baseY: 0.14, wallCol: 0x7a6552, roofCol: 0x2d241e, style: 'flooded'
      });
      // Winding wooden pier bridges spanning 760m over open ocean horizon!
      let px = mid, pz = 48;
      while (pz < span - 80) {
        const nextZ = pz + 45 + rnd() * 25;
        PLATFORMS.push({ x0: px - 2.6, z0: pz, x1: px + 2.6, z1: Math.min(span - 40, nextZ), y: 0.16, surface: 'wood', draw: true, col: 0x6b503a });
        if (rnd() < 0.55) {
          const turn = (rnd() < 0.5 ? -1 : 1) * (35 + rnd() * 55);
          const nx = Math.max(40, Math.min(span - 40, px + turn));
          PLATFORMS.push({ x0: Math.min(px, nx) - 2.6, z0: nextZ - 2.6, x1: Math.max(px, nx) + 2.6, z1: nextZ + 2.6, y: 0.16, surface: 'wood', draw: true, col: 0x6b503a });
          px = nx;
          // Waypoint sea-shack / buoy light
          LIGHTS.push({ x: px, z: nextZ, y: 3.4, gain: 0.9 });
          DECO_BLOCKS.push({ x: px + 3.2, z: nextZ, y0: 0, w: 0.6, d: 0.6, h: 3.6, col: 0x42352a });
        }
        pz = nextZ;
      }
      // Final Offshore Rig Platform
      PLATFORMS.push({ x0: px - 14, z0: span - 72, x1: px + 14, z1: span - 42, y: 0.25, surface: 'metal', draw: true, col: 0x49535e });
      TOWERS.push({ x: px + 8, z: span - 52, w: 5, d: 5, h: 26, col: 0xc8ccd0, windowAccent: 0xffd24a });
      SPAWN = { x: mid, z: 38, y: 0.18, yaw: Math.PI };
      END_POS = { x: px, z: span - 56, y: 0.25 };
    }

    // 4. SUNSET BEACH (Level 48 - Golden Sand, Gentle Shore, Piers & Palms under Eternal Sunset)
    else if (arch === 'sunset_beach') {
      // Western half (`x < span * 0.58`) is undulating golden sand beach; Eastern half (`x >= span * 0.54`) is calm sunset sea!
      const seaLine = span * 0.56;
      meta.seaLine = seaLine;
      WATER_RECTS.push({ x0: seaLine, z0: 0, x1: span, z1: span, bedY: -0.68, waterY: -0.02, col: 0x26828e });
      PLATFORMS.push({ x0: 0, z0: 0, x1: seaLine, z1: span, y: 0.05, surface: 'sand', draw: true, col: 0xdcc38a });
      // Long coastal wooden boardwalk & ocean pier out into Sunset horizon
      PLATFORMS.push({ x0: seaLine - 18, z0: 24, x1: seaLine - 10, z1: span - 24, y: 0.35, surface: 'wood', draw: true, col: 0x875f3e });
      PLATFORMS.push({ x0: seaLine - 14, z0: span * 0.62 - 4, x1: span - 90, z1: span * 0.62 + 4, y: 0.42, surface: 'wood', draw: true, col: 0x875f3e });
      for (let i = 0; i < 110; i++) {
        const px = 45 + rnd() * (seaLine - 75);
        const pz = 30 + rnd() * (span - 60);
        TREES.push({ x: px, z: pz, h: 8 + rnd() * 5, kind: 'palm' });
      }
      for (let z = 65; z < span - 65; z += 110) {
        stampEnterableHouse({ RECTS, PLATFORMS, FURNITURE, HOUSES, LIGHTS }, seaLine - 48, z, 12, 10, 4.2, 'east', rnd, {
          wallCol: 0xeddcc4, roofCol: 0x995833, style: 'beach'
        });
      }
      SPAWN = { x: seaLine - 14, z: 45, y: 0.35, yaw: Math.PI };
      END_POS = { x: span - 105, z: span * 0.62, y: 0.42 };
    }

    // 5. ENDLESS CITY (Level 11 - Concrete Metropolis Skyscrapers, Avenues & Alleys)
    else if (arch === 'endless_city') {
      const step = 68;
      for (let z = 48; z < span - 64; z += step) {
        for (let x = 48; x < span - 64; x += step) {
          if (Math.abs(x - mid) < 28) continue; // Grand Central Boulevard!
          const w = 30 + rnd() * 14, d = 30 + rnd() * 14, h = 24 + ((rnd() * 38) | 0);
          RECTS.push({ x0: x - w * 0.5, z0: z - d * 0.5, x1: x + w * 0.5, z1: z + d * 0.5, y0: 0, y1: h, h });
          TOWERS.push({ x, z, w, d, h, col: rnd() < 0.5 ? 0x8a9299 : 0x707882, windowAccent: 0xdbeeff });
          LIGHTS.push({ x: x + w * 0.5 + 3, z: z + d * 0.5 + 3, y: 5.5, gain: 0.8 });
        }
      }
      SPAWN = { x: mid, z: 30, y: 0, yaw: Math.PI };
      END_POS = { x: mid, z: span - 42, y: 0 };
    }

    // 6. PARADISE (Level 14 - Surreal Crimson Grass Plain, White Birch Trees & Purple Fog Shrines)
    else if (arch === 'crimson_forest') {
      for (let i = 0; i < 240; i++) {
        const tx = 30 + rnd() * (span - 60);
        const tz = 30 + rnd() * (span - 60);
        if (Math.hypot(tx - mid, tz - 45) < 22) continue;
        TREES.push({ x: tx, z: tz, h: 8 + rnd() * 7, kind: 'birch' });
        RECTS.push({ x0: tx - 0.45, z0: tz - 0.45, x1: tx + 0.45, z1: tz + 0.45, y0: 0, y1: 6, h: 6, hidden: true });
      }
      // Stone sanctuary shrines guiding across crimson meadow
      for (let s = 100; s < span - 80; s += 110) {
        const sx = mid + Math.sin(s * 0.015) * 160;
        PLATFORMS.push({ x0: sx - 8, z0: s - 8, x1: sx + 8, z1: s + 8, y: 0.35, surface: 'stone', draw: true, col: 0x3b2838 });
        DECO_BLOCKS.push({ x: sx - 5, z: s - 5, y0: 0.35, w: 1.4, d: 1.4, h: 6.5, col: 0xd6d0db });
        DECO_BLOCKS.push({ x: sx + 5, z: s - 5, y0: 0.35, w: 1.4, d: 1.4, h: 6.5, col: 0xd6d0db });
        LIGHTS.push({ x: sx, z: s, y: 4.5, purple: true, gain: 1.0 });
      }
      SPAWN = { x: mid, z: 42, y: 0, yaw: Math.PI };
      END_POS = { x: mid + Math.sin((span - 95) * 0.015) * 120, z: span - 75, y: 0 };
    }

    // 7. TRUE FINAL LEVEL (Level 9223372036854775807 - Ultra-Empty Void & Monumental Staircases!)
    else if (arch === 'void_staircase') {
      // Minimal stark stone base plaza + colossal ascending multi-flight zigzagging stone monument rising 28m into empty sky!
      PLATFORMS.push({ x0: mid - 14, z0: 28, x1: mid + 14, z1: 58, y: 0, surface: 'stone', draw: true, col: 0xc2c8cf });
      let curZ = 58, curY = 0, dir = 1;
      for (let seg = 0; seg < 10; seg++) {
        const run = 54;
        const nextY = curY + 2.8;
        const xLeft = mid - 5, xRight = mid + 5;
        if (seg % 2 === 0) {
          RAMPS.push({ x0: xLeft, z0: curZ, x1: xRight, z1: curZ + run, axis: 'z', y0: curY, y1: nextY, surface: 'stone', draw: true, col: 0xd0d6de });
          curZ += run;
          PLATFORMS.push({ x0: xLeft - 3, z0: curZ, x1: xRight + 3, z1: curZ + 12, y: nextY, surface: 'stone', draw: true, col: 0xdbe1e8 });
          curZ += 12;
        } else {
          // Wide elevated skywalk with stark empty vista over abyssal void
          PLATFORMS.push({ x0: xLeft - 2, z0: curZ, x1: xRight + 2, z1: curZ + 42, y: curY, surface: 'stone', draw: true, col: 0xc8ced6 });
          curZ += 42;
          RAMPS.push({ x0: xLeft, z0: curZ, x1: xRight, z1: curZ + 44, axis: 'z', y0: curY, y1: nextY, surface: 'stone', draw: true, col: 0xd0d6de });
          curZ += 44;
          PLATFORMS.push({ x0: xLeft - 3, z0: curZ, x1: xRight + 3, z1: curZ + 12, y: nextY, surface: 'stone', draw: true, col: 0xdbe1e8 });
          curZ += 12;
        }
        curY = nextY;
        dir *= -1;
      }
      PLATFORMS.push({ x0: mid - 18, z0: curZ, x1: mid + 18, z1: curZ + 32, y: curY, surface: 'stone', draw: true, col: 0xe6ecf2 });
      SPAWN = { x: mid, z: 38, y: 0, yaw: Math.PI };
      END_POS = { x: mid, z: curZ + 16, y: curY };
    }
  }

  // =========================================================================
  // ARCHETYPE D: INDOOR MAZES, HOUSEHOLD ROOMS, COURTYARD, CAVES, PIPES, HOTEL
  // (Office, Warehouse, Pipes, Electrical, Hotel, Blackout, Caves, Attic, Courtyard, Kitty)
  // =========================================================================
  else {
    const core = buildMazeCore(gN, gC, rnd, cfg, arch === 'window_courtyard' ? 10 : 18);
    hEdges = core.hEdges;
    vEdges = core.vEdges;
    cellSolid = core.cellSolid;
    meta.plazas = core.plazas;

    // Special Open Central Sky Atrium for Level 188 (Courtyard of Windows)!
    if (arch === 'window_courtyard') {
      const cMid = Math.floor(gN * 0.5);
      const rad = 11;
      for (let r = cMid - rad; r <= cMid + rad; r++) {
        for (let c = cMid - rad; c <= cMid + rad; c++) {
          if (c < cMid + rad) vEdges[r][c + 1] = 0;
          if (r < cMid + rad) hEdges[r + 1][c] = 0;
        }
      }
      // Tall window-covered perimeter towers overlooking open sky!
      TOWERS.push({ x: (cMid - rad - 3) * gC, z: cMid * gC, w: gC * 4, d: rad * 2 * gC, h: 32, col: 0xcbd0d6, windowAccent: 0xfff1b0 });
      TOWERS.push({ x: (cMid + rad + 3) * gC, z: cMid * gC, w: gC * 4, d: rad * 2 * gC, h: 32, col: 0xcbd0d6, windowAccent: 0xfff1b0 });
      TOWERS.push({ x: cMid * gC, z: (cMid - rad - 3) * gC, w: rad * 2 * gC, d: gC * 4, h: 32, col: 0xcbd0d6, windowAccent: 0xfff1b0 });
      TOWERS.push({ x: cMid * gC, z: (cMid + rad + 3) * gC, w: rad * 2 * gC, d: gC * 4, h: 32, col: 0xcbd0d6, windowAccent: 0xfff1b0 });
      SPAWN = { x: (cMid) * gC, z: (cMid - rad + 2) * gC, y: 0, yaw: Math.PI };
      END_POS = { x: (gN - 6) * gC, z: (gN - 6) * gC, y: 0 };
    } else {
      // Open a 2x2 welcoming furnished entry vestibule at (4,4)..(5,5) facing down into the room
      if (cellSolid) { cellSolid[4][4] = 0; cellSolid[4][5] = 0; cellSolid[5][4] = 0; cellSolid[5][5] = 0; }
      if (vEdges[4]) vEdges[4][5] = 0;
      if (hEdges[5]) { hEdges[5][4] = 0; hEdges[5][5] = 0; }
      if (vEdges[5]) vEdges[5][5] = 0;
      SPAWN = { x: gC * 4.5, z: gC * 4.5, y: 0, yaw: Math.PI * 1.25 };
      END_POS = { x: (gN - 5.5) * gC, z: (gN - 5.5) * gC, y: 0 };
    }

    wallsFromEdges(gN, gC, wallH, hEdges, vEdges, core.CRAWL_WALLS, RECTS, WALLS);

    // Rich Props tailored to Indoor Archetype
    const isFurnished = arch === 'office' || arch === 'hotel' || arch === 'attic' || arch === 'kitty_house';
    const furnKinds = arch === 'office'
      ? ['desk', 'tv_stand', 'cabinet', 'table']
      : ['sofa', 'bed', 'tv_stand', 'fridge', 'table', 'cabinet'];

    for (const pl of core.plazas) {
      const pcx = ((pl.c0 + pl.c1) * 0.5) * gC;
      const pcz = ((pl.r0 + pl.r1) * 0.5) * gC;
      if (arch !== 'blackout') {
        LIGHTS.push({ x: pcx, z: pcz, y: wallH - 0.35, gain: arch === 'electrical' ? 0.55 : 0.85 });
      }
      if (isFurnished) {
        const count = arch === 'attic' || arch === 'kitty_house' ? 7 : 5;
        for (let f = 0; f < count; f++) {
          FURNITURE.push({
            kind: furnKinds[(rnd() * furnKinds.length) | 0],
            x: pcx + (rnd() - 0.5) * (pl.c1 - pl.c0) * gC * 0.72,
            z: pcz + (rnd() - 0.5) * (pl.r1 - pl.r0) * gC * 0.72,
            y: 0,
            rot: ((rnd() * 4) | 0) * (Math.PI * 0.5),
            tint: arch === 'kitty_house' ? 0xf5a6c8 : undefined
          });
        }
      } else if (arch === 'warehouse' || arch === 'electrical') {
        for (let k = 0; k < 4; k++) {
          DECO_BLOCKS.push({
            x: pcx + (rnd() - 0.5) * 8, z: pcz + (rnd() - 0.5) * 8,
            y0: 0, w: 1.5, d: 1.5, h: 1.8 + rnd() * 1.4,
            col: arch === 'electrical' ? 0x3b444b : 0x735b3f
          });
        }
      } else if (arch === 'cave') {
        for (let k = 0; k < 5; k++) {
          DECO_BLOCKS.push({
            x: pcx + (rnd() - 0.5) * 10, z: pcz + (rnd() - 0.5) * 10,
            y0: 0, w: 1.1, d: 1.1, h: 2.5 + rnd() * 4.5, col: 0x383633
          });
        }
        LIGHTS.push({ x: pcx, z: pcz, y: 1.2, green: true, gain: 0.7 });
      }
    }

    // Repeating overhead pipe runs for Level 2 Pipe Dreams!
    if (arch === 'pipes') {
      for (let z = gC * 3; z < span - gC * 3; z += gC * 3) {
        PIPES.push({ x: gC * 3, z, len: span - gC * 6, isH: true, y: wallH - 0.55 });
        PIPES.push({ x: gC * 3, z: z + 0.5, len: span - gC * 6, isH: true, y: wallH - 0.9 });
      }
    }
    // Corridor ambient ceiling lights (skip completely in Level 6 Lights Out!)
    if (arch !== 'blackout') {
      for (let r = 3; r < gN - 3; r += 6) {
        for (let c = 3; c < gN - 3; c += 6) {
          LIGHTS.push({ x: (c + 0.5) * gC, z: (r + 0.5) * gC, y: wallH - 0.35, gain: arch === 'electrical' ? 0.45 : 0.72 });
        }
      }
    }
  }

  // Build spatial collision grid
  populateLevelLoreProps({
    cfg, span, mid, gC, gN, wallH, rnd, meta,
    RECTS, WALLS, WATER_RECTS, PLATFORMS, RAMPS, HOUSES, TOWERS, TREES, WHEAT,
    DECO_BLOCKS, LIGHTS, CRAWL_WALLS: RECTS.filter(r => r.crawl), hEdges, vEdges, cellSolid,
    SPAWN, END_POS, K_SPAWN: null, PROPS, ANIM_PROPS
  });

  const wallGrid = new SpatialGrid2D(Math.max(4, gC));
  wallGrid.build(RECTS);
  if (poolArchitecture) {
    ({ hEdges, vEdges, cellSolid, waterCells } = rasterizePoolroomsNavigation({
      ...poolArchitecture, gridN: gN, cellSize: gC, worldSpan: span,
      wallGrid, PLATFORMS, RAMPS, SLIDES, WATER_RECTS
    }));
  }

  // Sample walkable SPOTS + scatter survival supplies & patrol waypoints
  for (let r = 2; r < gN - 2; r += 2) {
    for (let c = 2; c < gN - 2; c += 2) {
      if (cellSolid?.[r]?.[c]) continue;
      const sx = (c + 0.5) * gC;
      const sz = (r + 0.5) * gC;
      const near = wallGrid.queryNear(sx, sz, 1.4);
      let clear = true;
      for (const b of near) {
        if (b.crawl) continue;
        if (sx >= b.x0 - 0.8 && sx <= b.x1 + 0.8 && sz >= b.z0 - 0.8 && sz <= b.z1 + 0.8) { clear = false; break; }
      }
      if (clear) SPOTS.push({ x: sx, z: sz, c, r });
    }
  }

  const supplyContext=poolArchitecture?{...poolArchitecture,WATER_RECTS,PLATFORMS,RAMPS,SLIDES}:null;
  if(supplyContext)initTerrainIndex(supplyContext);
  const supplySpots=poolArchitecture?SPOTS.filter(sp=>!poolArchitecture._poolCellGrid.queryNear(sp.x,sp.z,0).some(c=>c.art&&sp.x>=c.x0&&sp.x<=c.x1&&sp.z>=c.z0&&sp.z<=c.z1)&&!getTerrainAt(sp.x,sp.z,supplyContext,0).inWater):SPOTS;
  for (let i = 0; i < 42 && supplySpots.length; i++) {
    const sp = supplySpots[(rnd() * supplySpots.length) | 0];
    if (sp) WATERS.push({ id: i, x: sp.x, z: sp.z, taken: false });
  }
  for (let i = 0; i < 12 && supplySpots.length; i++) {
    const sp = supplySpots[(rnd() * supplySpots.length) | 0];
    if (sp) FLARES.push({ id: i, x: sp.x, z: sp.z, taken: false });
  }

  // Final End-of-Level Breaker Machine (`NEED = 1`) + Glowing Return Portal to Level 0!
  const tPos = TASK_POS || END_POS;
  const TASKS = [{
    id: 0,
    code: cfg.code,
    sym: '⚡',
    label: arch === 'poolrooms' ? 'BẢNG ĐIỀU KHIỂN XẢ NƯỚC KHU J' : 'MÁY THOÁT TẦNG',
    col: '#56e892',
    hex: 0x56e892,
    x: tPos.x,
    z: tPos.z,
    y: tPos.y || 0,
    p: 0,
    done: false
  }];

  const PORTALS = [{
    id: `ret_${levelId}`,
    type: 'return',
    targetLevel: 'level0',
    x: meta.customPoolrooms ? END_POS.x : (END_POS.x + 4.8),
    z: END_POS.z,
    y: END_POS.y || 0,
    label: 'Cổng Trở Về Level 0',
    accent: cfg.palette?.accent ?? 0x56e892
  }];

  // Level-specific Monster Spawn + Long-Distance Patrol Route
  let K_SPAWN = { x: mid, z: mid, y: 0 };
  if (arch === 'poolrooms' && POOL_K_SPAWN) {
    K_SPAWN = { ...POOL_K_SPAWN };
  } else if (arch === 'poolrooms' && WATER_RECTS.length > 1) {
    const bw = WATER_RECTS[1];
    K_SPAWN = { x: (bw.x0 + bw.x1) * 0.5, z: (bw.z0 + bw.z1) * 0.5, y: 0 };
  } else if (arch === 'void_staircase') {
    K_SPAWN = { x: mid, z: 120, y: 0 };
  } else {
    K_SPAWN = { x: Math.min(span - 20, Math.max(20, mid + 35)), z: Math.min(span - 20, Math.max(20, mid - 25)), y: 0 };
  }

  const isWaterEnt = cfg.entity?.behavior === 'water_only';
  const candidateSpots = (isWaterEnt && WATER_RECTS.length)
    ? (() => {
        const wSpots = SPOTS.filter(sp => WATER_RECTS.some(w => sp.x >= w.x0 + 2 && sp.x <= w.x1 - 2 && sp.z >= w.z0 + 2 && sp.z <= w.z1 - 2));
        return wSpots.length >= 6 ? wSpots : SPOTS;
      })()
    : SPOTS;

  const pickSectorSpot = (fracX, fracZ, minFromSpawn = 68, avoidPts = []) => {
    const tx = span * fracX;
    const tz = span * fracZ;
    let best = null;
    let bestScore = Infinity;
    for (let i = 0; i < candidateSpots.length; i++) {
      const sp = candidateSpots[i];
      if (Math.hypot(sp.x - SPAWN.x, sp.z - SPAWN.z) < minFromSpawn) continue;
      let tooClose = false;
      for (const ap of avoidPts) {
        if (ap && Math.hypot(sp.x - ap.x, sp.z - ap.z) < 55) { tooClose = true; break; }
      }
      if (tooClose) continue;
      const d = Math.hypot(sp.x - tx, sp.z - tz);
      if (d < bestScore) { bestScore = d; best = sp; }
    }
    if (best) return { x: best.x, z: best.z };
    // Relax avoidPts constraint if sub-level layout is tight
    bestScore = Infinity;
    for (let i = 0; i < candidateSpots.length; i++) {
      const sp = candidateSpots[i];
      if (Math.hypot(sp.x - SPAWN.x, sp.z - SPAWN.z) < minFromSpawn * 0.72) continue;
      const d = Math.hypot(sp.x - tx, sp.z - tz);
      if (d < bestScore) { bestScore = d; best = sp; }
    }
    return best ? { x: best.x, z: best.z } : { x: K_SPAWN.x, z: K_SPAWN.z };
  };

  const k1 = pickSectorSpot(0.76, 0.28, 72, [K_SPAWN]);
  const k2 = pickSectorSpot(0.32, 0.78, 78, [K_SPAWN, k1]);

  const ENTITY_ROUTES = meta.customPoolrooms && poolArchitecture
    ? poolArchitecture.ENTITY_ROUTES
    : meta.customPoolrooms
    ? [
        [
          { x: K_SPAWN.x, z: K_SPAWN.z },
          { x: 535, z: 126 }, // Zone D Sunken Cathedral
          { x: 315, z: 126 }, // Zone B Grand Atrium
          { x: 286, z: 368 }, // Zone E Slide Basin
          { x: 114, z: 320 }, // Zone C Shallow Labyrinth
          { x: 108, z: 534 }, // Zone H Maintenance
          { x: 435, z: 540 }  // Zone J Drainage Vault
        ],
        [
          k1,
          pickSectorSpot(0.84, 0.62, 72, []),
          pickSectorSpot(0.62, 0.84, 72, []),
          { x: 435, z: 540 }
        ],
        [
          k2,
          pickSectorSpot(0.18, 0.76, 72, []),
          pickSectorSpot(0.16, 0.44, 72, []),
          { x: 286, z: 368 }
        ]
      ]
    : [
        [
          { x: K_SPAWN.x, z: K_SPAWN.z },
          pickSectorSpot(0.72, 0.35, 58, []),
          { x: Math.max(24, END_POS.x - 16), z: Math.max(24, END_POS.z - 16) },
          pickSectorSpot(0.28, 0.68, 58, [])
        ],
        [
          k1,
          pickSectorSpot(0.82, 0.72, 72, []),
          pickSectorSpot(0.55, 0.45, 62, []),
          pickSectorSpot(0.74, 0.20, 68, [])
        ],
        [
          k2,
          pickSectorSpot(0.22, 0.36, 70, []),
          pickSectorSpot(0.66, 0.80, 72, []),
          { x: Math.max(24, END_POS.x - 18), z: Math.max(24, END_POS.z - 18) }
        ]
      ];

  const mapObj = {
    levelId,
    levelCfg: cfg,
    gridN: gN,
    cellSize: gC,
    worldSpan: span,
    ceilH: cfg.ceilH,
    isOutdoor: !!cfg.isOutdoor,
    noLightmap: !!cfg.isOutdoor || !!cfg.hasSkylights || arch === 'poolrooms',
    defaultSurface: arch === 'poolrooms' ? 'tile' : arch === 'field' || arch === 'motion_town' ? 'grass' : arch === 'sunset_beach' ? 'sand' : 'concrete',
    waterOnlyAI: cfg.entity?.behavior === 'water_only',
    waterCells,
    RECTS, WALLS, wallGrid, hEdges, vEdges, cellSolid,
    WATER_RECTS, PLATFORMS, RAMPS, SLIDES, SPIRAL_SLIDES,
    POOL_ZONES, POOL_ARCH, LIGHT_VOLUMES, PUMPS,
    POOL_CELLS: poolArchitecture?.POOL_CELLS,
    customPoolrooms:!!poolArchitecture,
    peaceful:!!cfg.peaceful,
    SPAWN_POINTS: poolArchitecture?.SPAWN_POINTS,
    POOL_GRAPH: poolArchitecture?.POOL_GRAPH,
    POOL_DECOR:poolArchitecture?.POOL_DECOR,
    POOL_DECOR_CLUSTERS:poolArchitecture?.POOL_DECOR_CLUSTERS,
    POOL_WATERPARK:poolArchitecture?.POOL_WATERPARK,
      POOL_SKY_WINDOWS:poolArchitecture?.POOL_SKY_WINDOWS,
    _poolCellGrid: poolArchitecture?._poolCellGrid,
    architectureVersion: poolArchitecture?.architectureVersion,
    baseFloorY: poolArchitecture?.baseFloorY || 0,
    HOUSES, TOWERS, FURNITURE, TREES, WHEAT, PIPES, DECO_BLOCKS, PROPS, ANIM_PROPS,
    LIGHTS, TASKS, PORTALS,
    HOOKS: [], EXITS: [], TRAPS: [], ENTRANCES: [],
    WATERS, SCANS, JELLIES, RATIONS, FLARES,
    RELICS: [], GUIDE_SEGMENTS: [], EXIT_GUIDE_SEGMENTS: [], GUIDE_MARKERS: [],
    SPOTS, SPAWN, K_SPAWN, ENTITY_ROUTES,
    exitsOpen: false,
    seed
  };

  initTerrainIndex(mapObj);
  return mapObj;
}
