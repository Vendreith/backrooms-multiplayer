// ---------- Unified Multi-Level Terrain, Water, Slide & Navigation Helpers ----------
// Queries vertical floor elevation, deep water submersion, water-slide acceleration,
// elevated platforms/stair ramps, and dynamic grid A* across variable-size Backrooms Levels.

import { C, N } from '../constants.js';

function bucketBoxes(list, span, bucketSize = 24) {
  if (!list || !list.length) return null;
  const cols = Math.max(1, Math.ceil(span / bucketSize));
  const buckets = new Array(cols * cols);
  for (let i = 0; i < buckets.length; i++) buckets[i] = [];
  for (const item of list) {
    const minC = Math.max(0, Math.min(cols - 1, Math.floor(item.x0 / bucketSize)));
    const maxC = Math.max(0, Math.min(cols - 1, Math.floor(item.x1 / bucketSize)));
    const minR = Math.max(0, Math.min(cols - 1, Math.floor(item.z0 / bucketSize)));
    const maxR = Math.max(0, Math.min(cols - 1, Math.floor(item.z1 / bucketSize)));
    for (let r = minR; r <= maxR; r++) {
      for (let c = minC; c <= maxC; c++) {
        buckets[r * cols + c].push(item);
      }
    }
  }
  return { cols, bucketSize, buckets };
}

function queryBucket(grid, x, z) {
  if (!grid) return EMPTY_LIST;
  const c = Math.max(0, Math.min(grid.cols - 1, Math.floor(x / grid.bucketSize)));
  const r = Math.max(0, Math.min(grid.cols - 1, Math.floor(z / grid.bucketSize)));
  return grid.buckets[r * grid.cols + c];
}
const EMPTY_LIST = [];

export function initTerrainIndex(map) {
  const span = map.worldSpan || ((map.gridN || N) * (map.cellSize || C));
  map._waterGrid = bucketBoxes(map.WATER_RECTS, span, 28);
  map._rampGrid = bucketBoxes(map.RAMPS, span, 28);
  map._platGrid = bucketBoxes(map.PLATFORMS, span, 28);
  map._slideGrid = bucketBoxes(map.SLIDES, span, 28);
  map._patchGrid = bucketBoxes(map.FLOOR_PATCHES, span, 28);
}

/**
 * Returns { floorY, inWater, waterY, waterDepth, slideVelX, slideVelZ, onSlide, surfaceKind }
 * at world position (x, z) and optional current player elevation `curY`.
 */
export function getTerrainAt(x, z, map, curY = 0) {
  if (!map || (!map.WATER_RECTS && !map.RAMPS && !map.PLATFORMS && !map.SLIDES)) {
    return {
      floorY: 0,
      inWater: false,
      waterY: -99,
      waterDepth: 0,
      slideVelX: 0,
      slideVelZ: 0,
      onSlide: false,
      surfaceKind: map?.defaultSurface || 'carpet'
    };
  }

  let floorY = map.baseFloorY || 0;
  let surfaceKind = map.defaultSurface || 'tile';
  let inWater = false;
  let waterY = -99;
  let waterDepth = 0;
  let slideVelX = 0;
  let slideVelZ = 0;
  let onSlide = false;

  // 1. Water basins (dip floor down so wading looks natural; bridges/platforms above override later)
  const waters = map._waterGrid ? queryBucket(map._waterGrid, x, z) : (map.WATER_RECTS || EMPTY_LIST);
  for (let i = 0; i < waters.length; i++) {
    const w = waters[i];
    if (x >= w.x0 && x <= w.x1 && z >= w.z0 && z <= w.z1) {
      floorY = w.bedY ?? -0.68;
      waterY = w.waterY ?? 0.02;
      inWater = true;
      waterDepth = Math.max(0, waterY - floorY);
      surfaceKind = 'water';
      break;
    }
  }

  // 2. Elevated decks, docks, castle plateaus, pool bridges & house interiors
  const plats = map._platGrid ? queryBucket(map._platGrid, x, z) : (map.PLATFORMS || EMPTY_LIST);
  for (let i = 0; i < plats.length; i++) {
    const p = plats[i];
    if (x >= p.x0 && x <= p.x1 && z >= p.z0 && z <= p.z1) {
      const py = p.y ?? 0;
      // Allow walking onto elevated platforms when within step-up/down margin or above deck
      if (curY >= py - 1.15 || py <= floorY + 1.15) {
        if (py > floorY) {
          floorY = py;
          inWater = false;
          waterDepth = 0;
          surfaceKind = p.surface || 'wood';
        }
      }
    }
  }

  // 3. Walkable inclined ramps & staircases
  const ramps = map._rampGrid ? queryBucket(map._rampGrid, x, z) : (map.RAMPS || EMPTY_LIST);
  for (let i = 0; i < ramps.length; i++) {
    const r = ramps[i];
    if (x >= r.x0 && x <= r.x1 && z >= r.z0 && z <= r.z1) {
      const t = r.axis === 'x'
        ? Math.max(0, Math.min(1, (x - r.x0) / Math.max(0.01, r.x1 - r.x0)))
        : Math.max(0, Math.min(1, (z - r.z0) / Math.max(0.01, r.z1 - r.z0)));
      const ry = r.y0 + (r.y1 - r.y0) * t;
      if (curY >= ry - 1.35 || ry <= floorY + 1.35) {
        if (ry >= floorY - 0.15) {
          floorY = ry;
          inWater = false;
          waterDepth = 0;
          surfaceKind = r.surface || 'tile';
        }
      }
    }
  }

  // 4. Water slides (smooth trough ramp + downhill propulsion into water basins)
  const slides = map._slideGrid ? queryBucket(map._slideGrid, x, z) : (map.SLIDES || EMPTY_LIST);
  for (let i = 0; i < slides.length; i++) {
    const s = slides[i];
    if (x >= s.x0 && x <= s.x1 && z >= s.z0 && z <= s.z1) {
      const t = s.axis === 'x'
        ? Math.max(0, Math.min(1, (x - s.x0) / Math.max(0.01, s.x1 - s.x0)))
        : Math.max(0, Math.min(1, (z - s.z0) / Math.max(0.01, s.z1 - s.z0)));
      const sy = s.y0 + (s.y1 - s.y0) * t;
      if (curY >= sy - 1.45) {
        floorY = sy;
        inWater = false;
        waterDepth = 0;
        onSlide = true;
        slideVelX = s.dirX * (s.speed || 11.5);
        slideVelZ = s.dirZ * (s.speed || 11.5);
        surfaceKind = 'slide';
        break;
      }
    }
  }

  return { floorY, inWater, waterY, waterDepth, slideVelX, slideVelZ, onSlide, surfaceKind };
}

/**
 * Generalized A* pathfinder supporting dynamic map grid sizes & outdoor steering.
 */
export function findDynamicGridPath(map, sx, sz, tx, tz) {
  const gN = map.gridN ?? N;
  const gC = map.cellSize ?? C;

  // For open outdoor realms without cell grids or huge plains, check line-of-sight first!
  const span = map.worldSpan || gN * gC;
  const clampCell = (v) => Math.max(0, Math.min(gN - 1, Math.floor(v / gC)));
  const sr = clampCell(sz), sc = clampCell(sx);
  const tr = clampCell(tz), tc = clampCell(tx);
  if (sr === tr && sc === tc) return [[tx, tz]];

  if (!map.cellSolid || !map.hEdges || !map.vEdges) {
    return [[tx, tz]];
  }

  const total = gN * gN;
  const gScore = new Float32Array(total).fill(1e9);
  const fScore = new Float32Array(total).fill(1e9);
  const parent = new Int32Array(total).fill(-1);
  const closed = new Uint8Array(total);

  const idx = (r, c) => r * gN + c;
  const startId = idx(sr, sc);
  const goalId = idx(tr, tc);

  gScore[startId] = 0;
  fScore[startId] = Math.abs(tr - sr) + Math.abs(tc - sc);

  const heap = [startId];
  const pushHeap = (node) => {
    heap.push(node);
    let i = heap.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (fScore[heap[p]] <= fScore[heap[i]]) break;
      const tmp = heap[p]; heap[p] = heap[i]; heap[i] = tmp;
      i = p;
    }
  };
  const popHeap = () => {
    const top = heap[0];
    const last = heap.pop();
    if (heap.length > 0) {
      heap[0] = last;
      let i = 0;
      const len = heap.length;
      while (true) {
        let s = i;
        const l = (i << 1) + 1;
        const r = l + 1;
        if (l < len && fScore[heap[l]] < fScore[heap[s]]) s = l;
        if (r < len && fScore[heap[r]] < fScore[heap[s]]) s = r;
        if (s === i) break;
        const tmp = heap[i]; heap[i] = heap[s]; heap[s] = tmp;
        i = s;
      }
    }
    return top;
  };

  const { hEdges, vEdges, cellSolid } = map;
  let reached = startId;
  let bestH = 1e9;
  let expanded = 0;
  const waterOnly = !!map.waterOnlyAI;

  while (heap.length > 0 && expanded++ < 9500) {
    const cid = popHeap();
    if (closed[cid]) continue;
    closed[cid] = 1;

    const r = (cid / gN) | 0;
    const c = cid % gN;
    const h = Math.abs(tr - r) + Math.abs(tc - c);
    if (h < bestH) { bestH = h; reached = cid; }
    if (cid === goalId) break;

    const tryNeighbor = (nr, nc, cost = 1) => {
      if (nr < 0 || nr >= gN || nc < 0 || nc >= gN) return;
      if (cellSolid[nr]?.[nc]) return;
      if (waterOnly && map.waterCells && !map.waterCells[nr]?.[nc]) {
        // Discourage stepping far outside water except as fallback
        cost = 5.5;
      }
      const nid = idx(nr, nc);
      if (closed[nid]) return;
      const tg = gScore[cid] + cost;
      if (tg < gScore[nid]) {
        parent[nid] = cid;
        gScore[nid] = tg;
        fScore[nid] = tg + Math.abs(tr - nr) + Math.abs(tc - nc);
        pushHeap(nid);
      }
    };

    const passable = (v) => v === 0 || v === 3;
    if (r > 0 && passable(hEdges[r]?.[c])) tryNeighbor(r - 1, c);
    if (r < gN - 1 && passable(hEdges[r + 1]?.[c])) tryNeighbor(r + 1, c);
    if (c > 0 && passable(vEdges[r]?.[c])) tryNeighbor(r, c - 1);
    if (c < gN - 1 && passable(vEdges[r]?.[c + 1])) tryNeighbor(r, c + 1);
  }

  const endId = closed[goalId] ? goalId : reached;
  const path = [];
  let cur = endId;
  while (cur !== -1 && cur !== startId) {
    const r = (cur / gN) | 0;
    const c = cur % gN;
    path.push([
      Math.min(span - 1.5, Math.max(1.5, (c + 0.5) * gC)),
      Math.min(span - 1.5, Math.max(1.5, (r + 0.5) * gC))
    ]);
    cur = parent[cur];
  }
  path.reverse();
  if (path.length && closed[goalId]) path[path.length - 1] = [tx, tz];
  if (!path.length) path.push([tx, tz]);
  return path;
}
