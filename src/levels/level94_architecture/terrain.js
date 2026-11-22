/*! Copyright (c) 2026 Vendreith. Licensing: see LICENSE.md and THIRD_PARTY_NOTICES.md. */
/*!
 * Level 94 architecture — terrain contract and foundation solver.
 *
 * The package never edits terrain. It samples a caller-supplied height field,
 * raises the finished floor above the highest footprint sample, extends a
 * foundation skirt to the lowest sample, and returns grading metadata that the
 * main level may apply to its own terrain system.
 */

import * as THREE from 'three';
import { DEFAULT_HOUSE_OPTIONS, HOUSE_PLACEMENT_RULES } from './constants.js';

export function normalizeTerrain(terrain) {
  if (typeof terrain === 'function') {
    return {
      getHeight: terrain,
      getNormal: null
    };
  }
  if (terrain && typeof terrain.getHeight === 'function') {
    return terrain;
  }
  throw new TypeError('Level 94 architecture requires a terrain object with getHeight(x, z) or a height function.');
}

export function sampleTerrainHeight(terrain, x, z) {
  const h = terrain.getHeight(x, z);
  return Number.isFinite(h) ? h : 0;
}

export function sampleTerrainNormal(terrain, x, z, epsilon = 0.6) {
  if (typeof terrain?.getNormal === 'function') {
    const n = terrain.getNormal(x, z);
    if (n && Number.isFinite(n.x) && Number.isFinite(n.y) && Number.isFinite(n.z)) {
      return new THREE.Vector3(n.x, n.y, n.z).normalize();
    }
  }
  const hL = sampleTerrainHeight(terrain, x - epsilon, z);
  const hR = sampleTerrainHeight(terrain, x + epsilon, z);
  const hD = sampleTerrainHeight(terrain, x, z - epsilon);
  const hU = sampleTerrainHeight(terrain, x, z + epsilon);
  return new THREE.Vector3((hL - hR) / (2 * epsilon), 1, (hD - hU) / (2 * epsilon)).normalize();
}

export function rotateLocalToWorld(lx, lz, rotation, scale = 1) {
  const c = Math.cos(rotation);
  const s = Math.sin(rotation);
  return {
    x: (lx * c + lz * s) * scale,
    z: (-lx * s + lz * c) * scale
  };
}

export function localPointToWorld(local, placement) {
  const p = rotateLocalToWorld(local.x || 0, local.z || 0, placement.rotation, placement.scale ?? 1);
  return {
    x: placement.x + p.x,
    y: (placement.floorY || 0) + (local.y || 0) * (placement.scale ?? 1),
    z: placement.z + p.z
  };
}

export function localBoxToWorldAabb(box, placement) {
  const scale = placement.scale ?? 1;
  const c = Math.cos(placement.rotation);
  const s = Math.sin(placement.rotation);
  const xs = [];
  const zs = [];
  for (const lx of [box.x0, box.x1]) {
    for (const lz of [box.z0, box.z1]) {
      xs.push(placement.x + (lx * c + lz * s) * scale);
      zs.push(placement.z + (-lx * s + lz * c) * scale);
    }
  }
  return {
    x0: Math.min(...xs),
    x1: Math.max(...xs),
    z0: Math.min(...zs),
    z1: Math.max(...zs),
    y0: placement.floorY + Math.min(box.y0, box.y1) * scale,
    y1: placement.floorY + Math.max(box.y0, box.y1) * scale
  };
}

export function localRampToWorld(ramp, placement) {
  const a = localPointToWorld({ x: ramp.x0, y: ramp.y0, z: ramp.z0 }, placement);
  const b = localPointToWorld({ x: ramp.x1, y: ramp.y1, z: ramp.z1 }, placement);
  return {
    ...ramp,
    x0: Math.min(a.x, b.x),
    x1: Math.max(a.x, b.x),
    z0: Math.min(a.z, b.z),
    z1: Math.max(a.z, b.z),
    y0: a.y,
    y1: b.y,
    surface: ramp.surface || 'wood'
  };
}

export function footprintRects(variant, scale = 1) {
  const rects = [{
    x0: -variant.width * 0.5 * scale,
    x1: variant.width * 0.5 * scale,
    z0: -variant.depth * 0.5 * scale,
    z1: variant.depth * 0.5 * scale,
    tag: 'main'
  }];
  for (const wing of variant.wings || []) {
    rects.push({
      x0: (wing.x - wing.width * 0.5) * scale,
      x1: (wing.x + wing.width * 0.5) * scale,
      z0: (wing.z - wing.depth * 0.5) * scale,
      z1: (wing.z + wing.depth * 0.5) * scale,
      tag: 'wing'
    });
  }
  return rects;
}

/**
 * Estimate the architectural footprint envelope including the entry stoop and
 * a small visual margin. Used for spacing checks and terrain grading metadata.
 */
export function footprintEnvelope(variant, scale = 1, options = {}) {
  const rects = footprintRects(variant, scale);
  const porch = variant.porch;
  if (porch) {
    const wall = porch.wall || variant.door?.wall || 'front';
    const depth = (porch.depth || 0) * scale + 1.2 * scale;
    const width = (porch.width || variant.width * 0.55) * scale;
    if (wall === 'front') rects.push({ x0: -width * 0.5, x1: width * 0.5, z0: variant.depth * 0.5 * scale, z1: variant.depth * 0.5 * scale + depth, tag: 'entry' });
    else if (wall === 'back') rects.push({ x0: -width * 0.5, x1: width * 0.5, z0: -variant.depth * 0.5 * scale - depth, z1: -variant.depth * 0.5 * scale, tag: 'entry' });
    else if (wall === 'left') rects.push({ x0: -variant.width * 0.5 * scale - depth, x1: -variant.width * 0.5 * scale, z0: -width * 0.5, z1: width * 0.5, tag: 'entry' });
    else rects.push({ x0: variant.width * 0.5 * scale, x1: variant.width * 0.5 * scale + depth, z0: -width * 0.5, z1: width * 0.5, tag: 'entry' });
  }
  const x0 = Math.min(...rects.map(r => r.x0)) - (options.margin ?? 0.9) * scale;
  const x1 = Math.max(...rects.map(r => r.x1)) + (options.margin ?? 0.9) * scale;
  const z0 = Math.min(...rects.map(r => r.z0)) - (options.margin ?? 0.9) * scale;
  const z1 = Math.max(...rects.map(r => r.z1)) + (options.margin ?? 0.9) * scale;
  return { x0, x1, z0, z1, width: x1 - x0, depth: z1 - z0, rects };
}

function sampleFootprint(variant, placement, terrain, samples) {
  const rects = footprintRects(variant, placement.scale);
  const points = [];
  // Dense corner + edge + centre sampling catches ridges that a simple 4-corner
  // test misses completely.
  for (const rect of rects) {
    const xs = [rect.x0, (rect.x0 + rect.x1) * 0.5, rect.x1];
    const zs = [rect.z0, (rect.z0 + rect.z1) * 0.5, rect.z1];
    for (const lx of xs) for (const lz of zs) {
      const p = rotateLocalToWorld(lx, lz, placement.rotation, 1);
      points.push({ x: placement.x + p.x, z: placement.z + p.z, localX: lx, localZ: lz });
    }
  }
  // Additional entry-side samples so steps never land in the air.
  const front = variant.depth * 0.5 * placement.scale + (variant.porch?.depth || 1.8) * placement.scale + 2.2;
  for (let i = 0; i <= 4; i++) {
    const lx = (i / 4 - 0.5) * variant.width * placement.scale;
    const p = rotateLocalToWorld(lx, front, placement.rotation, 1);
    points.push({ x: placement.x + p.x, z: placement.z + p.z, localX: lx, localZ: front });
  }
  const step = Math.max(1, Math.floor(points.length / Math.max(5, samples)));
  const heights = points.map(p => sampleTerrainHeight(terrain, p.x, p.z));
  // Always include the true min/max of the dense set.
  return {
    points,
    heights,
    min: Math.min(...heights),
    max: Math.max(...heights),
    sampleStep: step
  };
}

export function resolveHousePlacement(variant, options = {}) {
  const terrain = normalizeTerrain(options.terrain);
  const position = options.position || { x: 0, z: 0 };
  const x = Array.isArray(position) ? position[0] : (position.x ?? 0);
  const z = Array.isArray(position) ? position[1] : (position.z ?? 0);
  const rotation = options.rotation ?? 0;
  const scale = options.scale ?? DEFAULT_HOUSE_OPTIONS.scale;
  const clearance = options.foundationClearance ?? DEFAULT_HOUSE_OPTIONS.foundationClearance;
  const base = { x, z, rotation, scale, floorY: 0 };
  const sampleSet = sampleFootprint(variant, base, terrain, options.terrainSamples ?? 13);
  const floorY = sampleSet.max + clearance;
  base.floorY = floorY;

  const door = variant.door || { wall: 'front', x: 0 };
  const porchDepth = variant.porch?.depth || variant.stoop?.depth || 1.5;
  const frontLocal = variant.depth * 0.5 + porchDepth + 1.0;
  let localDoorX = door.x || 0;
  let localDoorZ = frontLocal;
  if (door.wall === 'back') localDoorZ = -frontLocal;
  else if (door.wall === 'left') {
    localDoorX = -(variant.width * 0.5 + porchDepth + 1.0);
    localDoorZ = door.z || 0;
  } else if (door.wall === 'right') {
    localDoorX = variant.width * 0.5 + porchDepth + 1.0;
    localDoorZ = door.z || 0;
  }
  const entry = rotateLocalToWorld(localDoorX, localDoorZ, rotation, scale);
  const frontGround = sampleTerrainHeight(terrain, x + entry.x, z + entry.z);
  const stepDrop = Math.max(0, floorY - frontGround);
  const slope = sampleSet.max - sampleSet.min;
  const envelope = footprintEnvelope(variant, scale);
  const gradeEnvelope = {
    x0: envelope.x0 - HOUSE_PLACEMENT_RULES.foundationFeather,
    x1: envelope.x1 + HOUSE_PLACEMENT_RULES.foundationFeather,
    z0: envelope.z0 - HOUSE_PLACEMENT_RULES.foundationFeather,
    z1: envelope.z1 + HOUSE_PLACEMENT_RULES.foundationFeather
  };
  // Rotate the local grading rectangle into a conservative world AABB.
  const gradeCorners = [
    { x: gradeEnvelope.x0, z: gradeEnvelope.z0 },
    { x: gradeEnvelope.x1, z: gradeEnvelope.z0 },
    { x: gradeEnvelope.x1, z: gradeEnvelope.z1 },
    { x: gradeEnvelope.x0, z: gradeEnvelope.z1 }
  ].map(p => {
    const w = rotateLocalToWorld(p.x, p.z, rotation, 1);
    return { x: x + w.x, z: z + w.z };
  });
  const grading = {
    x0: Math.min(...gradeCorners.map(p => p.x)),
    x1: Math.max(...gradeCorners.map(p => p.x)),
    z0: Math.min(...gradeCorners.map(p => p.z)),
    z1: Math.max(...gradeCorners.map(p => p.z)),
    targetY: floorY,
    feather: HOUSE_PLACEMENT_RULES.foundationFeather,
    mode: 'plateau',
    footprint: envelope,
    sampleMin: sampleSet.min,
    sampleMax: sampleSet.max,
    requestedBy: 'level94_architecture'
  };
  const stepHeight = 0.17;
  const stepCount = Math.max(0, Math.ceil(stepDrop / stepHeight));
  const stepRise = stepCount > 0 ? stepDrop / stepCount : 0;
  const foundationDepth = floorY - sampleSet.min + 0.42;
  return {
    ...base,
    floorY,
    x,
    z,
    rotation,
    scale,
    terrain,
    footprint: envelope,
    footprintRects: footprintRects(variant, scale),
    sampleMin: sampleSet.min,
    sampleMax: sampleSet.max,
    slope,
    centerGround: sampleTerrainHeight(terrain, x, z),
    frontGround,
    entryGround: frontGround,
    stepDrop,
    stepCount,
    stepRise,
    foundationDepth,
    foundationType: slope > 0.55 ? 'stepped_plinth' : 'plinth',
    grading,
    placementOk: slope <= (options.maxFootprintSlope ?? DEFAULT_HOUSE_OPTIONS.maxFootprintSlope),
    source: 'level94_architecture'
  };
}

export function validateHousePlacement({
  variant,
  placement,
  terrain,
  bounds,
  occupied = [],
  minSpacing = HOUSE_PLACEMENT_RULES.minSpacingScenic
}) {
  const resolved = placement?.floorY !== undefined ? placement : resolveHousePlacement(variant, { ...placement, terrain });
  const issues = [];
  if (!resolved.placementOk) issues.push('footprint-slope');
  if (bounds) {
    const f = resolved.footprint;
    const corners = [
      { x: f.x0, z: f.z0 }, { x: f.x1, z: f.z0 }, { x: f.x1, z: f.z1 }, { x: f.x0, z: f.z1 }
    ];
    for (const c of corners) {
      const w = rotateLocalToWorld(c.x, c.z, resolved.rotation, 1);
      const px = resolved.x + w.x;
      const pz = resolved.z + w.z;
      if (px < bounds.x0 || px > bounds.x1 || pz < bounds.z0 || pz > bounds.z1) {
        issues.push('outside-bounds');
        break;
      }
    }
  }
  for (const other of occupied) {
    const ox = other.x ?? other.position?.x ?? 0;
    const oz = other.z ?? other.position?.z ?? 0;
    const radius = other.radius ?? (Math.max(other.width || 0, other.depth || 0) * 0.5 || 8);
    if (Math.hypot(resolved.x - ox, resolved.z - oz) < minSpacing + radius * 0.35) {
      issues.push('spacing');
      break;
    }
  }
  return { ok: issues.length === 0, issues, placement: resolved };
}

export function isPointOnTerrain(terrain, x, z, tolerance = 0.2) {
  return Number.isFinite(sampleTerrainHeight(terrain, x, z)) && tolerance >= 0;
}

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
 * A smooth mock height field for standalone previews and tests. The main level
 * will always supply its own real terrain callback instead.
 */
export function createMockTerrain(options = {}) {
  const seed = options.seed ?? 94;
  const rnd = mulberry32(seed);
  const baseHeight = options.baseHeight ?? 0;
  const amplitude = options.amplitude ?? 5.5;
  const extent = options.extent ?? 420;
  const hillCount = options.hillCount ?? 18;
  const hills = [];
  for (let i = 0; i < hillCount; i++) {
    hills.push({
      x: (rnd() - 0.5) * extent,
      z: (rnd() - 0.5) * extent,
      radius: 28 + rnd() * 85,
      height: (rnd() - 0.35) * amplitude
    });
  }
  if (options.hills) {
    for (const h of options.hills) hills.push(h);
  }
  const getHeight = (x, z) => {
    let h = baseHeight;
    h += 0.18 * Math.sin(x * 0.035) * Math.cos(z * 0.041);
    h += 0.09 * Math.sin((x + z) * 0.09);
    for (const hill of hills) {
      const dx = x - hill.x;
      const dz = z - hill.z;
      const r = hill.radius || 1;
      h += (hill.height || 0) * Math.exp(-(dx * dx + dz * dz) / (r * r));
    }
    return h;
  };
  const getNormal = (x, z) => {
    const e = 0.7;
    const hl = getHeight(x - e, z);
    const hr = getHeight(x + e, z);
    const hd = getHeight(x, z - e);
    const hu = getHeight(x, z + e);
    return new THREE.Vector3((hl - hr) / (2 * e), 1, (hd - hu) / (2 * e)).normalize();
  };
  return {
    id: options.id || 'mock-dreamcore-hills',
    seed,
    baseHeight,
    hills,
    getHeight,
    getNormal,
    isMock: true
  };
}

export function createSlopeTerrain(slopeX = 0.18, slopeZ = 0, baseHeight = 0) {
  return {
    id: 'mock-slope',
    getHeight: (x, z) => baseHeight + x * slopeX + z * slopeZ,
    getNormal: () => new THREE.Vector3(-slopeX, 1, -slopeZ).normalize(),
    isMock: true
  };
}

export function createFlatTerrain(height = 0) {
  return {
    id: 'mock-flat',
    getHeight: () => height,
    getNormal: () => new THREE.Vector3(0, 1, 0),
    isMock: true
  };
}
