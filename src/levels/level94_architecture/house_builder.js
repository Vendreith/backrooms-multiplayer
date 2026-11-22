/*! Copyright (c) 2026 Vendreith. Licensing: see LICENSE.md and THIRD_PARTY_NOTICES.md. */
/*!
 * Level 94 architecture - house builder.
 *
 * Turns a declarative variant (variants.js) plus a terrain-resolved placement
 * into merged, material-batched geometry. Walls are assembled from real
 * segments around door/window openings, so every opening has thickness,
 * reveals, frames, sills and a genuine hole rather than a decal.
 *
 * The builder never touches terrain, lighting or renderer state. It reads a
 * placement produced by terrain.js and emits collision/grading metadata.
 */

import * as THREE from 'three';
import { MeshKit } from './kit.js';
import { getArchitectureMaterial } from './materials.js';
import {
  COLOR_LIBRARY,
  DEFAULT_HOUSE_OPTIONS,
  HOUSE_LOD_DISTANCES
} from './constants.js';
import {
  addGableRoof,
  addHipRoof,
  addShedRoof,
  addDormer,
  addChimney,
  addRoofVent,
  gableSurfaceY,
  hipSurfaceY,
  shedSurfaceY
} from './roofs.js';
import {
  resolveHousePlacement,
  localBoxToWorldAabb,
  localPointToWorld,
  rotateLocalToWorld
} from './terrain.js';
import { getHouseVariant } from './variants.js';
import {
  trackArchitectureGeometry,
  registerArchitectureCacheClearer
} from './resources.js';
import { createArchitectureLOD } from './lod.js';

const SIDES = ['front', 'back', 'left', 'right'];
const EPS = 1e-4;

const FLOWER_COLORS = [
  COLOR_LIBRARY.accent.flower_pink,
  COLOR_LIBRARY.accent.flower_white,
  COLOR_LIBRARY.accent.flower_yellow,
  COLOR_LIBRARY.accent.flower_blue
];

function clamp(value, min, max) {
  return value < min ? min : value > max ? max : value;
}

function hashString(text) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed) {
  let a = seed | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Stable palette selection: the same variant always looks the same. */
export function resolveVariantPalette(variant) {
  const rnd = mulberry32(hashString(`${variant.id}:palette`));
  const pick = (group, key, fallback) => {
    const table = COLOR_LIBRARY[group] || {};
    const names = variant.palette?.[key];
    if (Array.isArray(names) && names.length) {
      const name = names[Math.floor(rnd() * names.length) % names.length];
      if (table[name] !== undefined) return table[name];
    }
    return table[fallback] ?? 0xcccccc;
  };
  return {
    wall: pick('wall', 'wall', 'cream'),
    trim: pick('trim', 'trim', 'warm_white'),
    roof: pick('roof', 'roof', 'weathered_red'),
    door: pick('door', 'door', 'sage')
  };
}

/** Bucket keys carry an optional colour so MeshKit can merge by material. */
export function houseMaterialKey(name, color) {
  if (color === undefined || color === null) return name;
  return `${name}#${(color >>> 0).toString(16).padStart(6, '0')}`;
}

function parseMaterialKey(key) {
  const hash = key.indexOf('#');
  if (hash === -1) return { name: key, color: null };
  return {
    name: key.slice(0, hash),
    color: parseInt(key.slice(hash + 1), 16)
  };
}

let sharedResolver = null;

/** Shared material resolver for every house in the package. */
export function getHouseMaterialResolver() {
  if (sharedResolver) return sharedResolver;
  sharedResolver = (key) => {
    const { name, color } = parseMaterialKey(key);
    return color === null || Number.isNaN(color)
      ? getArchitectureMaterial(name)
      : getArchitectureMaterial(name, { color });
  };
  return sharedResolver;
}

function wallConfig(variant, side, inset = 0) {
  const width = variant.width;
  const depth = variant.depth;
  switch (side) {
    case 'front':
      return { length: width, position: { x: 0, y: 0, z: depth * 0.5 - inset }, rotation: 0 };
    case 'back':
      return { length: width, position: { x: 0, y: 0, z: -depth * 0.5 + inset }, rotation: Math.PI };
    case 'left':
      return { length: depth, position: { x: -width * 0.5 + inset, y: 0, z: 0 }, rotation: -Math.PI * 0.5 };
    case 'right':
      return { length: depth, position: { x: width * 0.5 - inset, y: 0, z: 0 }, rotation: Math.PI * 0.5 };
    default:
      return { length: width, position: { x: 0, y: 0, z: depth * 0.5 - inset }, rotation: 0 };
  }
}

/** Convert a world-space z (left/right walls) or x (front/back) into wall-local x. */
export function wallLocalXForWorld(side, value) {
  if (side === 'left') return value;
  if (side === 'right') return -value;
  if (side === 'back') return -value;
  return value;
}

function wallLocalXToWorld(side, localX) {
  if (side === 'left') return localX;
  if (side === 'right') return -localX;
  if (side === 'back') return -localX;
  return localX;
}

function wallOutwardNormal(side) {
  switch (side) {
    case 'back': return { x: 0, z: -1 };
    case 'left': return { x: -1, z: 0 };
    case 'right': return { x: 1, z: 0 };
    default: return { x: 0, z: 1 };
  }
}

/**
 * Build a wall slab from full-height piers plus stacked infill around the
 * openings. The result has real reveals and no shader tricks.
 */
function addWallSegments(kit, wallKey, width, height, thickness, openings) {
  const safe = [];
  for (const op of openings) {
    const x0 = clamp(op.x0, -width * 0.5 + 0.02, width * 0.5 - 0.02);
    const x1 = clamp(op.x1, -width * 0.5 + 0.02, width * 0.5 - 0.02);
    const y0 = clamp(op.y0 ?? 0, 0, height);
    const y1 = clamp(op.y1 ?? height, 0, height);
    if (x1 - x0 < 0.02 || y1 - y0 < 0.02) continue;
    safe.push({ x0, x1, y0, y1 });
  }
  safe.sort((a, b) => a.x0 - b.x0 || a.y0 - b.y0);

  const columns = [];
  for (const op of safe) {
    const last = columns[columns.length - 1];
    if (last && op.x0 < last.x1 - EPS) {
      last.x1 = Math.max(last.x1, op.x1);
      last.intervals.push(op);
    } else {
      columns.push({ x0: op.x0, x1: op.x1, intervals: [op] });
    }
  }

  const addBox = (x0, x1, y0, y1) => {
    const w = x1 - x0;
    const h = y1 - y0;
    if (w <= 0.01 || h <= 0.01) return;
    kit.box(wallKey, w, h, thickness, (x0 + x1) * 0.5, (y0 + y1) * 0.5, 0);
  };

  let cursor = -width * 0.5;
  for (const column of columns) {
    if (column.x0 > cursor + 0.01) addBox(cursor, column.x0, 0, height);
    const intervals = column.intervals
      .map((op) => [Math.max(0, op.y0), Math.min(height, op.y1)])
      .sort((a, b) => a[0] - b[0]);
    let y = 0;
    for (const [y0, y1] of intervals) {
      if (y0 > y + 0.01) addBox(column.x0, column.x1, y, y0);
      y = Math.max(y, y1);
    }
    if (y < height - 0.01) addBox(column.x0, column.x1, y, height);
    cursor = Math.max(cursor, column.x1);
  }
  if (cursor < width * 0.5 - 0.01) addBox(cursor, width * 0.5, 0, height);
}

function addWindowFrame(kit, opts) {
  const { trimKey, x, y, width, height, thickness, detail, sillProject = 0.07 } = opts;
  const zFront = thickness * 0.5;
  if (detail >= 1) {
    kit.box(trimKey, 0.075, height + 0.2, 0.1, x - width * 0.5 - 0.045, y, zFront + 0.02);
    kit.box(trimKey, 0.075, height + 0.2, 0.1, x + width * 0.5 + 0.045, y, zFront + 0.02);
    kit.box(trimKey, width + 0.24, 0.08, 0.11, x, y + height * 0.5 + 0.06, zFront + 0.03);
    kit.box(trimKey, width + 0.3, 0.09, 0.18, x, y - height * 0.5 - 0.055, zFront + sillProject);
  } else {
    kit.box(trimKey, width + 0.18, 0.07, 0.08, x, y + height * 0.5 + 0.04, zFront);
  }
}

function addMuntins(kit, muntinKey, x, y, width, height, columns, rows, thickness) {
  if (columns + rows === 0) return;
  const z = thickness * 0.5 + 0.012;
  for (let i = 1; i < columns; i++) {
    const px = x - width * 0.5 + (width * i) / columns;
    kit.box(muntinKey, 0.045, height, 0.045, px, y, z);
  }
  for (let i = 1; i < rows; i++) {
    const py = y - height * 0.5 + (height * i) / rows;
    kit.box(muntinKey, width, 0.045, 0.045, x, py, z);
  }
}

function addWindowShutters(kit, opts) {
  const { x, y, width, height, thickness, trimKey, shutterKey, detail } = opts;
  if (detail < 2) return;
  const sw = clamp(width * 0.34, 0.26, 0.46);
  const z = thickness * 0.5 + 0.035;
  for (const side of [-1, 1]) {
    const px = x + side * (width * 0.5 + sw * 0.5 + 0.07);
    kit.box(shutterKey, sw, height * 0.98, 0.05, px, y, z);
    kit.box(trimKey, sw + 0.05, 0.05, 0.06, px, y + height * 0.47, z + 0.01);
    kit.box(trimKey, sw + 0.05, 0.05, 0.06, px, y - height * 0.47, z + 0.01);
    for (let i = -3; i <= 3; i++) {
      kit.box(trimKey, sw * 0.86, 0.028, 0.068, px, y + i * height * 0.115, z + 0.012);
    }
  }
}

function addFlowerBox(kit, opts) {
  const { x, y, width, height, thickness, detail, rnd = Math.random } = opts;
  if (detail < 2) return;
  const z = thickness * 0.5 + 0.2;
  kit.box('terracotta', width * 0.92, 0.2, 0.26, x, y - height * 0.5 - 0.19, z);
  kit.box('soil', width * 0.86, 0.045, 0.2, x, y - height * 0.5 - 0.075, z);
  const count = Math.max(3, Math.round(width * 4));
  for (let i = 0; i < count; i++) {
    const px = x - width * 0.4 + (width * 0.8 * (i + 0.5)) / count;
    const color = FLOWER_COLORS[Math.floor(rnd() * FLOWER_COLORS.length) % FLOWER_COLORS.length];
    kit.sphere(houseMaterialKey('flower', color), 0.052, 5, 4, px, y - height * 0.5 + 0.02, z + 0.03);
    kit.sphere('foliage', 0.038, 4, 3, px + 0.035, y - height * 0.5 - 0.025, z - 0.01);
  }
}

function addCurtains(kit, opts) {
  const { x, y, width, height, thickness, detail, interior } = opts;
  if (!interior || detail < 2) return;
  const z = -thickness * 0.5 - 0.035;
  for (const side of [-1, 1]) {
    kit.box('fabric', width * 0.28, height * 0.92, 0.028, x + side * width * 0.32, y, z);
  }
  kit.box('dark_metal', width + 0.18, 0.035, 0.035, x, y + height * 0.5 + 0.04, z - 0.01);
}

function addRoundWindow(kit, opts) {
  const { x, y, width, thickness, type, lit, trimKey, detail } = opts;
  const radius = clamp(width * 0.42, 0.16, 0.7);
  const z = thickness * 0.5 + 0.02;
  const glass = lit ? 'glass_lit' : 'glass';
  kit.cylinder(glass, radius, radius, 0.045, 18, x, y, z, Math.PI * 0.5, 0, 0);
  kit.torus(trimKey, radius + 0.035, 0.045, 6, 20, x, y, z + 0.02);
  if (detail >= 1) {
    kit.box(trimKey, 0.04, radius * 1.6, 0.04, x, y, z + 0.035);
    kit.box(trimKey, radius * 1.6, 0.04, 0.04, x, y, z + 0.035);
  }
  if (detail >= 2) {
    kit.box(trimKey, radius * 2.5, 0.08, 0.06, x, y + radius + 0.09, z + 0.01);
    kit.box(trimKey, radius * 2.5, 0.08, 0.06, x, y - radius - 0.09, z + 0.01);
  }
  return { type: type || 'round', radius };
}

function addBayWindow(kit, opts) {
  const { x, y, width, height, thickness, detail, trimKey, glassKey } = opts;
  const project = 0.42;
  const z = thickness * 0.5;
  const w = width + 0.14;
  const h = height + 0.16;
  kit.box('painted_wood', w + 0.18, 0.15, project + 0.16, x, y - h * 0.5 - 0.06, z + project * 0.5);
  kit.box(trimKey, w + 0.24, 0.1, project + 0.22, x, y + h * 0.5 + 0.08, z + project * 0.5);
  kit.box(glassKey, w - 0.1, h - 0.08, 0.045, x, y, z + project);
  for (const side of [-1, 1]) {
    kit.box(glassKey, 0.045, h - 0.1, project - 0.02, x + side * (w * 0.5 - 0.03), y, z + project * 0.5);
    kit.box(trimKey, 0.08, h + 0.02, 0.09, x + side * w * 0.5, y, z + project * 0.98);
  }
  if (detail >= 1) {
    kit.box(trimKey, 0.07, h, 0.09, x - w * 0.33, y, z + project + 0.03);
    kit.box(trimKey, 0.07, h, 0.09, x + w * 0.33, y, z + project + 0.03);
    kit.box(trimKey, w, 0.07, 0.09, x, y + h * 0.24, z + project + 0.03);
    kit.box(trimKey, w, 0.07, 0.09, x, y - h * 0.24, z + project + 0.03);
    kit.box('painted_wood', w + 0.3, 0.11, 0.14, x, y - h * 0.5 - 0.16, z + project + 0.02);
  }
}

function addWindowUnit(kit, opts) {
  const {
    type = 'single',
    x, y, width, height, thickness, detail,
    trimKey, shutterKey, glassKey, interior, rnd
  } = opts;
  if (type === 'round') {
    return addRoundWindow(kit, opts);
  }
  if (type === 'bay') {
    addBayWindow(kit, opts);
    addWindowFrame(kit, { ...opts, topTrim: true });
    return;
  }

  const glassThickness = detail >= 2 ? 0.035 : 0.025;
  kit.box(glassKey, width - 0.06, height - 0.06, glassThickness, x, y, thickness * 0.08);
  if (detail >= 1) {
    addMuntins(kit, trimKey, x, y, width - 0.06, height - 0.06, type === 'tall' ? 2 : type === 'single' ? 1 : 2, type === 'tall' ? 3 : type === 'single' ? 1 : 2, thickness);
  }
  addWindowFrame(kit, { x, y, width, height, thickness, trimKey, detail });
  if (opts.shutters) addWindowShutters(kit, { ...opts, shutterKey });
  if (opts.flowerBox) addFlowerBox(kit, { ...opts, rnd });
  addCurtains(kit, { x, y, width, height, thickness, detail, interior });
}

function addDoorUnit(kit, opts) {
  const {
    x, width, height, thickness, detail, style, double = false,
    doorKey, trimKey, interior, open = false
  } = opts;
  const zFront = thickness * 0.5;
  const inset = -thickness * 0.22;
  const leafW = double ? width * 0.5 - 0.025 : width - 0.08;
  const leafH = height - 0.06;
  const leafY = height * 0.5;

  const addLeaf = (offsetX, leafIndex) => {
    kit.box(doorKey, leafW, leafH, 0.085, x + offsetX, leafY, inset);
    if (detail >= 1) {
      const panelW = leafW * 0.66;
      const panelH = leafH * 0.3;
      for (const py of [leafH * 0.7, leafH * 0.33]) {
        kit.box(doorKey, panelW, panelH, 0.03, x + offsetX, py, inset + 0.055);
        kit.box(trimKey, panelW + 0.05, 0.035, 0.036, x + offsetX, py + panelH * 0.5, inset + 0.058);
        kit.box(trimKey, panelW + 0.05, 0.035, 0.036, x + offsetX, py - panelH * 0.5, inset + 0.058);
      }
    }
    if (style === 'glass') {
      kit.box('glass', leafW * 0.68, leafH * 0.32, 0.04, x + offsetX, leafY + leafH * 0.2, inset + 0.05);
      kit.box(trimKey, leafW * 0.72, 0.05, 0.05, x + offsetX, leafY + leafH * 0.2, inset + 0.075);
    }
    const knobX = x + offsetX + (leafIndex === 0 ? leafW * 0.36 : -leafW * 0.36);
    kit.sphere('metal', 0.042, 7, 5, knobX, 1.02, inset + 0.08);
  };

  if (double) {
    addLeaf(-leafW * 0.5 - 0.02, 0);
    addLeaf(leafW * 0.5 + 0.02, 1);
  } else {
    addLeaf(0, 0);
  }

  if (detail >= 1) {
    kit.box(trimKey, 0.1, height + 0.12, 0.12, x - width * 0.5 - 0.05, height * 0.5, zFront + 0.015);
    kit.box(trimKey, 0.1, height + 0.12, 0.12, x + width * 0.5 + 0.05, height * 0.5, zFront + 0.015);
    kit.box(trimKey, width + 0.32, 0.1, 0.13, x, height + 0.06, zFront + 0.02);
    kit.box('foundation', width + 0.26, 0.11, 0.34, x, 0.055, zFront + 0.14);
  }
  if (detail >= 2) {
    kit.box(trimKey, width + 0.5, 0.08, 0.16, x, height + 0.16, zFront + 0.03);
    kit.box('dark_metal', 0.16, 0.24, 0.12, x + width * 0.5 + 0.27, 1.85, zFront + 0.08);
    kit.box('glow', 0.09, 0.13, 0.05, x + width * 0.5 + 0.27, 1.84, zFront + 0.15);
  }
  if (open) {
    kit.box('dark_metal', width * 0.5, height * 0.9, 0.02, x + width * 0.35, height * 0.48, inset - 0.02);
  }
  if (interior) {
    kit.box('painted_wood', width + 0.14, 0.06, 0.2, x, 0.02, -thickness * 0.5 - 0.1);
  }
}

function addSidelightUnit(kit, opts) {
  const { x, width, height, thickness, trimKey, detail } = opts;
  kit.box('glass', width - 0.02, height - 0.05, 0.03, x, height * 0.5 + 0.3, thickness * 0.06);
  if (detail >= 1) {
    kit.box(trimKey, 0.06, height, 0.09, x - width * 0.5 - 0.03, height * 0.5 + 0.3, thickness * 0.5);
    kit.box(trimKey, 0.06, height, 0.09, x + width * 0.5 + 0.03, height * 0.5 + 0.3, thickness * 0.5);
    kit.box(trimKey, width + 0.12, 0.06, 0.09, x, height + 0.34, thickness * 0.5);
    kit.box(trimKey, width + 0.12, 0.06, 0.09, x, 0.27, thickness * 0.5);
    kit.box(trimKey, 0.032, height, 0.05, x, height * 0.5 + 0.3, thickness * 0.5 + 0.02);
  }
}

function addTransomUnit(kit, opts) {
  const { x, width, y0, height, thickness, trimKey, detail } = opts;
  kit.box('glass', width - 0.06, height - 0.04, 0.03, x, y0 + height * 0.5, thickness * 0.06);
  if (detail >= 1) {
    kit.box(trimKey, width + 0.18, 0.055, 0.1, x, y0 - 0.03, thickness * 0.5);
    kit.box(trimKey, width + 0.18, 0.055, 0.1, x, y0 + height + 0.03, thickness * 0.5);
    for (let i = 1; i < 3; i++) {
      kit.box(trimKey, 0.03, height, 0.05, x - width * 0.5 + (width * i) / 3, y0 + height * 0.5, thickness * 0.5 + 0.01);
    }
  }
}

function addBalconyDoorUnit(kit, opts) {
  const { x, width, height, y, thickness, detail, trimKey, interior } = opts;
  kit.box('glass', width - 0.12, height - 0.18, 0.04, x, y + height * 0.5, thickness * 0.06);
  kit.box('painted_wood', 0.06, height, 0.06, x, y + height * 0.5, thickness * 0.15);
  if (detail >= 1) {
    kit.box(trimKey, 0.07, height + 0.1, 0.09, x - width * 0.5 - 0.035, y + height * 0.5, thickness * 0.5);
    kit.box(trimKey, 0.07, height + 0.1, 0.09, x + width * 0.5 + 0.035, y + height * 0.5, thickness * 0.5);
    kit.box(trimKey, width + 0.14, 0.07, 0.1, x, y + height + 0.035, thickness * 0.5);
    kit.box(trimKey, width + 0.14, 0.07, 0.1, x, y - 0.035, thickness * 0.5);
    kit.box(trimKey, width, 0.045, 0.05, x, y + height * 0.55, thickness * 0.5 + 0.02);
    kit.box('metal', 0.05, 0.05, 0.09, x + width * 0.32, y + height * 0.45, thickness * 0.5 + 0.03);
  }
  if (interior && detail >= 2) {
    kit.box('fabric', width * 0.8, height * 0.82, 0.03, x - width * 0.55, y + height * 0.45, -thickness * 0.5 - 0.03);
  }
}

// Completed from the recovered opening, roof and material construction kit.
export function buildHouse(record) {
  const variant = getHouseVariant(record.variantId);
  const { placement, steps, porch } = record.layout;
  const palette = {...resolveVariantPalette(variant),...record.palette};
  const wallKey = houseMaterialKey(variant.wallKey || 'wall_siding', palette.wall);
  const trimKey = houseMaterialKey('trim', palette.trim);
  const roofKey = houseMaterialKey('roof_shingle', palette.roof);
  const doorKey = houseMaterialKey('painted_wood', palette.door);
  const rnd = mulberry32(hashString(record.id));
  const levels = [2, 1, 0].map(detail => {
    const kit = new MeshKit();
    const w = variant.width, d = variant.depth, h = variant.wallHeight, thick = variant.wallThickness || .22;
    kit.box('foundation', w + .12, placement.foundationDepth, d + .12, 0, -placement.foundationDepth / 2, 0);
    for (const side of SIDES) {
      const wall = wallConfig(variant, side);
      kit.push(wall.position, wall.rotation);
      const windows = variant.windows?.[side] || [];
      const door = variant.door?.wall === side ? variant.door : null;
      const openings = windows.map(v => ({ x0: v.x - v.width / 2, x1: v.x + v.width / 2, y0: v.y, y1: v.y + v.height }));
      if (door) openings.push({ x0: door.x - door.width / 2, x1: door.x + door.width / 2, y0: 0, y1: door.height });
      addWallSegments(kit, wallKey, wall.length, h, thick, openings);
      for (const win of windows) addWindowUnit(kit, { ...win, y: win.y + win.height / 2, thickness: thick, detail, trimKey, shutterKey: doorKey, glassKey: win.lit ? 'glass_lit' : 'glass', rnd, interior: false });
      if (door) addDoorUnit(kit, { ...door, detail, thickness: thick, trimKey, doorKey, interior: false });
      kit.pop();
    }
    const roof = { ...variant.roof, span: w, length: d, eaveY: h, roofKey, ridgeKey: roofKey, trimKey, wallKey, detail, gutters: detail > 0, downTo: -.1 };
    const roofBuilder = variant.roof?.type === 'hip' ? addHipRoof : variant.roof?.type === 'shed' ? addShedRoof : addGableRoof;
    roofBuilder(kit, roof);
    // Complete the variant's actual massing, rather than reducing every home to its main box.
    for(const wing of variant.wings||[]){
      kit.push({x:wing.x,y:0,z:wing.z});
      kit.box(wallKey,wing.width,wing.height,wing.depth,0,wing.height/2,0);
      kit.box('foundation',wing.width+.1,placement.foundationDepth,wing.depth+.1,0,-placement.foundationDepth/2,0);
      (wing.roof==='shed'?addShedRoof:addGableRoof)(kit,{span:wing.width,length:wing.depth,eaveY:wing.height,rise:wing.rise||1.2,ridgeAxis:wing.ridgeAxis||'z',roofKey,trimKey,wallKey,detail,gutters:detail>0});
      if(wing.window&&detail>0){kit.push({x:0,y:0,z:wing.depth/2+.02});addWindowUnit(kit,{x:0,y:1.65,width:1.1,height:1.2,thickness:.22,detail,trimKey,glassKey:'glass',shutterKey:doorKey});kit.pop();}
      kit.pop();
    }
    if(detail>0)for(const dormer of variant.dormers||[]){
      const y=(variant.roof.type==='hip'?hipSurfaceY:gableSurfaceY)(roof,dormer.x,dormer.z)-.15;
      addDormer(kit,{...dormer,y,wallKey,roofKey,trimKey,detail});
    }
    if(variant.gableWindow&&detail>0){
      const v=variant.gableWindow;kit.push({x:0,y:0,z:d/2+.12});
      addRoundWindow(kit,{x:v.x||0,y:v.y,width:(v.radius||.4)*2.38,thickness:.1,trimKey,lit:false,detail});kit.pop();
    }
    if (variant.chimney) addChimney(kit, { ...variant.chimney, baseY: h - .3, topY: h + (variant.roof?.rise || 2) + .5, detail });
    if (variant.chimney2&&detail>0) addChimney(kit, { ...variant.chimney2, baseY: h - .3, topY: h + (variant.roof?.rise || 2) + .3, detail });
    if(variant.balcony&&detail>0){
      const b=variant.balcony,z=d/2+b.depth/2;
      kit.box(trimKey,b.width,.15,b.depth,0,b.y,z);
      kit.box(trimKey,b.width,.07,.07,0,b.y+1,z+b.depth/2);
      for(let i=0;i<9;i++)kit.box(trimKey,.05,.9,.05,-b.width/2+b.width*i/8,b.y+.5,z+b.depth/2);
    }
    if (detail > 0) for (const x of [-1, 1]) for (const z of [-1, 1]) kit.box(trimKey, .13, h, .13, x * (w / 2 + .015), h / 2, z * (d / 2 + .015));
    // Porch frame and stairs share dimensions with the collision contract.
    kit.push({ x: 0, y: 0, z: 0 }, porch.yaw);
    const pz = porch.length / 2 + porch.depth / 2;
    kit.box('painted_wood', porch.width, .16, porch.depth, porch.entryX, -.08, pz);
    const roofY = Math.min(h - .3, 2.8);
    if (variant.porch && detail > 0) {
      const posts=variant.porch.posts||2;
      for(let i=0;i<posts;i++){
        const x=porch.entryX+(i/(posts-1)-.5)*(porch.width-.26),z=porch.length/2+porch.depth-.15;
        if(variant.porch.columnStyle==='round')kit.cylinder(trimKey,.095,.115,roofY,10,x,roofY/2,z);
        else kit.box(trimKey,.16,roofY,.16,x,roofY/2,z);
      }
      for (const side of [-1, 1]) {
        if (variant.porch.railing) {
          const x = porch.entryX + side * (porch.width / 2 - .1);
          kit.box(trimKey, .09, .08, porch.depth, x, .95, pz);
          for (let j = 0; j < 5; j++) kit.box(trimKey, .045, .82, .045, x, .48, porch.length / 2 + (j + .5) * porch.depth / 5);
        }
      }
      kit.push({ x: porch.entryX, y: 0, z: pz }, 0);
      if(variant.porch.roof!=='none') (variant.porch.roof==='gable'?addGableRoof:addShedRoof)(kit, { span: porch.width, length: porch.depth, eaveY: roofY, rise: variant.porch.roofRise||.45, ridgeAxis:'z',overhang: .25, roofKey, trimKey, wallKey, detail: 1, gutters: false });
      kit.pop();
    }
    for (const step of steps) kit.box('foundation', step.width, .17, step.depth, step.x, step.y - .085, step.z);
    kit.pop();
    const merged = kit.merge(getHouseMaterialResolver());
    merged.group.traverse(m => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; trackArchitectureGeometry(m.geometry); } });
    return merged.group;
  });
  const lod = createArchitectureLOD(levels);
  lod.position.set(record.cx, placement.floorY, record.cz);
  lod.rotation.y = placement.rotation;
  lod.userData.house = record.id;
  return lod;
}
