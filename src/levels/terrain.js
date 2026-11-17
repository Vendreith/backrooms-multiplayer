/*!
 * Copyright (c) 2026 Vendreith. All rights reserved (Original Engine & Code).
 * Licensing information: see LICENSE.md
 * Third-party notices: see THIRD_PARTY_NOTICES.md
 */

// ---------- Unified Multi-Level Terrain, Water, Slide & Navigation Helpers ----------
// Queries vertical floor elevation, deep water submersion, water-slide acceleration,
// elevated platforms/stair ramps, and dynamic grid A* across variable-size Backrooms Levels.

import { C, N } from '../constants.js';
import { tubeFloor,tubeDistance } from './poolrooms_tubes.js';
import { classicPitAt,inClassic } from './classic_layout.js';
import {classicNavigationPath,transitionRoute} from './classic_navigation.js';

function bucketBoxes(list, spanX, bucketSize = 24, spanZ = spanX) {
  if (!list || !list.length) return null;
  const cols = Math.max(1, Math.ceil(spanX / bucketSize));
  const rows = Math.max(1, Math.ceil(spanZ / bucketSize));
  const buckets = new Array(cols * rows);
  for (let i = 0; i < buckets.length; i++) buckets[i] = [];
  for (const item of list) {
    const minC = Math.max(0, Math.min(cols - 1, Math.floor(item.x0 / bucketSize)));
    const maxC = Math.max(0, Math.min(cols - 1, Math.floor(item.x1 / bucketSize)));
    const minR = Math.max(0, Math.min(rows - 1, Math.floor(item.z0 / bucketSize)));
    const maxR = Math.max(0, Math.min(rows - 1, Math.floor(item.z1 / bucketSize)));
    for (let r = minR; r <= maxR; r++) {
      for (let c = minC; c <= maxC; c++) {
        buckets[r * cols + c].push(item);
      }
    }
  }
  return { cols, rows, bucketSize, buckets };
}

function queryBucket(grid, x, z) {
  if (!grid) return EMPTY_LIST;
  const rows = grid.rows ?? grid.cols;
  const c = Math.max(0, Math.min(grid.cols - 1, Math.floor(x / grid.bucketSize)));
  const r = Math.max(0, Math.min(rows - 1, Math.floor(z / grid.bucketSize)));
  return grid.buckets[r * grid.cols + c];
}
const EMPTY_LIST = [];

export function initTerrainIndex(map) {
  const gCols = map.gridCols || map.gridN || N;
  const gRows = map.gridRows || map.gridN || N;
  const gC = map.cellSize || C;
  const spanX = map.spanX || map.worldSpan || (gCols * gC);
  const spanZ = map.spanZ || map.worldSpan || (gRows * gC);
  map._waterGrid = bucketBoxes(map.WATER_RECTS, spanX, 28, spanZ);
  map._rampGrid = bucketBoxes(map.RAMPS, spanX, 28, spanZ);
  map._platGrid = bucketBoxes(map.PLATFORMS, spanX, 28, spanZ);
  map._slideGrid = bucketBoxes(map.SLIDES, spanX, 28, spanZ);
  map._patchGrid = bucketBoxes(map.FLOOR_PATCHES, spanX, 28, spanZ);
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

  const classicPit=classicPitAt(map.classic,x,z,curY);
  if(classicPit)return {floorY:-classicPit.depth,inWater:false,waterY:-99,waterDepth:0,slideVelX:0,slideVelZ:0,onSlide:false,surfaceKind:'concrete',pit:classicPit.id};
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
    if (x >= w.x0 && x <= w.x1 && z >= w.z0 && z <= w.z1 && (w.shape!=='ellipse'||((x-w.cx)/w.rx)**2+((z-w.cz)/w.rz)**2<=1) && (w.shape!=='tube'||tubeDistance(w.network,x,w.waterY-w.floorY,z)<0)) {
      floorY = w.bedY ?? -0.68;
      waterY = w.waterY ?? 0.02;
      inWater = true;
      waterDepth = Math.max(0, waterY - floorY);
      surfaceKind = 'water';
      break;
    }
  }

  const tube=map._poolCellGrid?.queryNear(x,z,0).find(c=>c.tubeNetwork&&x>=c.x0&&x<=c.x1&&z>=c.z0&&z<=c.z1);
  if(tube){const f=tubeFloor(tube.tubeNetwork,x,z);if(Number.isFinite(f))floorY=f+tube.floorY;}
  // 2. Elevated decks, docks, castle plateaus, pool bridges & house interiors
  const plats = map._platGrid ? queryBucket(map._platGrid, x, z) : (map.PLATFORMS || EMPTY_LIST);
  for (let i = 0; i < plats.length; i++) {
    const p = plats[i];
    if (p.terrainIgnore) continue;
    if (x >= p.x0 && x <= p.x1 && z >= p.z0 && z <= p.z1) {
      if(p.shape==='ellipse'&&((x-p.cx)/p.rx)**2+((z-p.cz)/p.rz)**2>1)continue;
      if(p.holes?.some(h=>((x-h.cx)/h.rx)**2+((z-h.cz)/h.rz)**2<1))continue;
      const py = p.y ?? p.topY ?? 0;
      // Allow walking onto elevated platforms when within step-up/down margin or above deck
      if (curY >= py - 1.15 || py <= floorY + 1.15) {
        if (py > floorY) {
          floorY = py;
          inWater = false;
          waterDepth = 0;
          surfaceKind = p.surface || p.surfaceKind || 'wood';
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

  // 5. Helical / Spiral Ceramic Water Slides (polar collision & downhill tangent propulsion)
  if (!onSlide && map.SPIRAL_SLIDES?.length) {
    for (let i = 0; i < map.SPIRAL_SLIDES.length; i++) {
      const s = map.SPIRAL_SLIDES[i];
      const dx = x - s.cx;
      const dz = z - s.cz;
      const r = Math.hypot(dx, dz);
      const halfW = (s.width || 2.8) * 0.52;
      if (Math.abs(r - s.radius) > halfW) continue;
      const dir = s.ccw ? -1 : 1;
      const turns = s.turns || 1.35;
      const totAng = turns * Math.PI * 2;
      const angStart = s.angStart || 0;
      const theta = Math.atan2(dz, dx);
      let base = ((theta - angStart) * dir) % (Math.PI * 2);
      if (base < 0) base += Math.PI * 2;
      let bestSy = -999;
      let bestAng = 0;
      const maxK = Math.ceil(turns);
      for (let k = -1; k <= maxK; k++) {
        const angP = base + k * Math.PI * 2;
        if (angP < -0.22 || angP > totAng + 0.16) continue;
        const t = Math.max(0, Math.min(1, angP / totAng));
        const sy = s.yTop - (s.yTop - s.yBot) * t;
        if (curY >= sy - 1.55 && sy > bestSy) {
          bestSy = sy;
          bestAng = angStart + dir * t * totAng;
        }
      }
      if (bestSy > -998 && bestSy >= floorY - 0.15) {
        floorY = bestSy;
        inWater = false;
        waterDepth = 0;
        onSlide = true;
        const spd = s.speed || 10.5;
        slideVelX = -Math.sin(bestAng) * dir * spd;
        slideVelZ = Math.cos(bestAng) * dir * spd;
        surfaceKind = 'slide';
        break;
      }
    }
  }

  if(waterY>floorY+.04&&!onSlide){inWater=true;waterDepth=waterY-floorY;surfaceKind='water';}
  return { floorY, inWater, waterY, waterDepth, slideVelX, slideVelZ, onSlide, surfaceKind };
}

/**
 * Generalized A* pathfinder supporting dynamic map grid sizes & outdoor steering.
 */
export function findDynamicGridPath(map, sx, sz, tx, tz) {
  if(map.classic&&!map._classicRouting){
    const c=map.classic,a=inClassic(c,sx,sz),b=inClassic(c,tx,tz);
    const at=(x,z)=>c.connectors.find(con=>con.floors.some(r=>x>=r.x0&&x<=r.x1&&z>=r.z0&&z<=r.z1)),ca=a?null:at(sx,sz),cb=b?null:at(tx,tz);
    if(ca&&cb===ca)return transitionRoute(ca,sx,sz,tx,tz);
    if(ca){const p=b||cb?ca.path[0]:ca.path.at(-1);return[...transitionRoute(ca,sx,sz,p[0],p[1]),...findDynamicGridPath(map,p[0],p[1],tx,tz)];}
    if(cb){const p=a?cb.path[0]:cb.path.at(-1);return[...findDynamicGridPath(map,sx,sz,p[0],p[1]),...transitionRoute(cb,p[0],p[1],tx,tz)];}
    if(a&&b)return classicNavigationPath(c,sx,sz,tx,tz);
    if(a||b){const con=c.connectors.reduce((best,v)=>Math.abs(v.z-(a?tz:sz))<Math.abs(best.z-(a?tz:sz))?v:best,c.connectors[0]);const legacy={...map,_classicRouting:true};
      if(a)return [...classicNavigationPath(c,sx,sz,con.x,con.z),...con.path,...findDynamicGridPath(legacy,con.oldX,con.legacyZ,tx,tz)];
      return [...findDynamicGridPath(legacy,sx,sz,con.oldX,con.legacyZ),...[...con.path].reverse(),...classicNavigationPath(c,con.x,con.z,tx,tz)];
    }
  }
  const gN = map.gridN ?? N;
  const gCols = map.gridCols ?? gN;
  const gRows = map.gridRows ?? gN;
  const gC = map.cellSize ?? C;

  // For open outdoor realms without cell grids or huge plains, check line-of-sight first!
  const spanX = map.spanX || map.worldSpan || gCols * gC;
  const spanZ = map.spanZ || map.worldSpan || gRows * gC;
  const clampR = (v) => Math.max(0, Math.min(gRows - 1, Math.floor(v / gC)));
  const clampC = (v) => Math.max(0, Math.min(gCols - 1, Math.floor(v / gC)));
  const sr = clampR(sz), sc = clampC(sx);
  const tr = clampR(tz), tc = clampC(tx);
  if (sr === tr && sc === tc) return [[tx, tz]];

  if (!map.cellSolid || !map.hEdges || !map.vEdges) {
    return [[tx, tz]];
  }

  const total = gRows * gCols;
  const gScore = new Float32Array(total).fill(1e9);
  const fScore = new Float32Array(total).fill(1e9);
  const parent = new Int32Array(total).fill(-1);
  const closed = new Uint8Array(total);

  const idx = (r, c) => r * gCols + c;
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

  // V4's one-metre raster has many more nodes than the former six-metre grid.
  // Retain the old budget elsewhere; permit complete district routes here.
  const expansionLimit = map.architectureVersion === 4 ? Math.min(total, 120000) : 9500;
  while (heap.length > 0 && expanded++ < expansionLimit) {
    const cid = popHeap();
    if (closed[cid]) continue;
    closed[cid] = 1;

    const r = (cid / gCols) | 0;
    const c = cid % gCols;
    const h = Math.abs(tr - r) + Math.abs(tc - c);
    if (h < bestH) { bestH = h; reached = cid; }
    if (cid === goalId) break;

    const tryNeighbor = (nr, nc, cost = 1) => {
      if (nr < 0 || nr >= gRows || nc < 0 || nc >= gCols) return;
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
    if (r < gRows - 1 && passable(hEdges[r + 1]?.[c])) tryNeighbor(r + 1, c);
    if (c > 0 && passable(vEdges[r]?.[c])) tryNeighbor(r, c - 1);
    if (c < gCols - 1 && passable(vEdges[r]?.[c + 1])) tryNeighbor(r, c + 1);
  }

  const endId = closed[goalId] ? goalId : reached;
  const path = [];
  let cur = endId;
  while (cur !== -1 && cur !== startId) {
    const r = (cur / gCols) | 0;
    const c = cur % gCols;
    path.push([
      Math.min(spanX - 1.5, Math.max(1.5, (c + 0.5) * gC)),
      Math.min(spanZ - 1.5, Math.max(1.5, (r + 0.5) * gC))
    ]);
    cur = parent[cur];
  }
  path.reverse();
  if (path.length && closed[goalId]) path[path.length - 1] = [tx, tz];
  if (!path.length) path.push([tx, tz]);
  return path;
}
