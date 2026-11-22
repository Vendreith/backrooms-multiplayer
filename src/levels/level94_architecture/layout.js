/*! Copyright (c) 2026 Vendreith. Licensing: see LICENSE.md and THIRD_PARTY_NOTICES.md. */
// Shared deterministic architecture/collision contract. Rendering never changes it.
import { STANDARD_VARIANT_IDS, getHouseVariant } from './variants.js';
import { resolveHousePlacement, localBoxToWorldAabb, localPointToWorld } from './terrain.js';

export function houseLayout(variant, options) {
  const placement = resolveHousePlacement(variant, options);
  const { width: w, depth: d, wallHeight: h } = variant;
  const localBoxes = [{ x0: -w / 2, x1: w / 2, z0: -d / 2, z1: d / 2, y0: 0, y1: h }];
  for(const wing of variant.wings||[])localBoxes.push({x0:wing.x-wing.width/2,x1:wing.x+wing.width/2,z0:wing.z-wing.depth/2,z1:wing.z+wing.depth/2,y0:0,y1:wing.height});
  const porch = variant.porch || variant.stoop || { width: 2.0, depth: 1.0 };
  // The finished houses have closed doors; their porches and stairs are walkable.
  // Side entrances use the same local transform as the visual assembly.
  const side = variant.door?.wall || 'front';
  const yaw = { front: 0, back: Math.PI, left: -Math.PI / 2, right: Math.PI / 2 }[side];
  const length = side === 'left' || side === 'right' ? w : d;
  const width = porch.width || 2.4, depth = porch.depth || 1.2;
  const entryX = variant.door?.x || 0;
  const sidePoint = (x, z) => ({ x: Math.cos(yaw) * x + Math.sin(yaw) * z, z: -Math.sin(yaw) * x + Math.cos(yaw) * z });
  const worldPoint = (x, z) => localPointToWorld({ ...sidePoint(x, z), y: 0 }, placement);
  const landing = worldPoint(entryX, length / 2 + depth / 2);
  const stairEnd = worldPoint(entryX, length / 2 + depth + Math.max(.7, placement.stepCount * .28));
  const ground = placement.terrain.getHeight(stairEnd.x, stairEnd.z);
  const count = Math.max(1, Math.ceil((placement.floorY - ground) / .17));
  const run = Math.max(.7, count * .28);
  const rise = Math.max(.02, (placement.floorY - ground) / count);
  const rect = (cx, cz, rw, rd, y) => ({ x0: cx - rw / 2, x1: cx + rw / 2, z0: cz - rd / 2, z1: cz + rd / 2, y, surface: 'wood' });
  const swap = Math.abs(Math.sin(placement.rotation + yaw)) > .5;
  const platforms = [rect(landing.x, landing.z, swap ? depth : width, swap ? width : depth, placement.floorY)];
  const steps = [];
  for (let i = 0; i < count; i++) {
    const localZ = length / 2 + depth + (i + .5) * run / count;
    const y = placement.floorY - (i + 1) * rise;
    const p = worldPoint(entryX, localZ);
    steps.push({ x: entryX, z: localZ, y: y - placement.floorY, width: Math.min(width, 1.8), depth: run / count + .02 });
    platforms.push(rect(p.x, p.z, swap ? run / count : Math.min(width, 1.8), swap ? Math.min(width, 1.8) : run / count, y));
  }
  return { variant, placement, localBoxes, boxes: localBoxes.map(b => localBoxToWorldAabb(b, placement)), platforms, steps, porch: { width, depth, yaw, length, entryX }, entry: worldPoint(entryX, length / 2 + depth + run + .7) };
}

export function prepareHillsArchitecture({ HOUSES, RECTS, PLATFORMS, field }) {
  const provisional = HOUSES.slice();
  const inOldHouse = b => provisional.some(h => {
    const x = ((b.x0 ?? b.x ?? 0) + (b.x1 ?? b.x ?? 0)) / 2;
    const z = ((b.z0 ?? b.z ?? 0) + (b.z1 ?? b.z ?? 0)) / 2;
    return Math.abs(x - h.cx) <= h.w / 2 + .5 && Math.abs(z - h.cz) <= h.d / 2 + .5;
  });
  for (const list of [RECTS, PLATFORMS]) for (let i = list.length - 1; i >= 0; i--) if (inOldHouse(list[i])) list.splice(i, 1);
  HOUSES.length = 0;
  provisional.forEach((old, i) => {
    const variant = getHouseVariant(old.variantId || STANDARD_VARIANT_IDS[i % STANDARD_VARIANT_IDS.length]);
    const rotation = old.rotation ?? ({ south: 0, north: Math.PI, east: Math.PI / 2, west: -Math.PI / 2 }[old.doorSide] ?? 0);
    const layout = houseLayout(variant, { terrain: { getHeight: field.heightAt }, position: { x: old.cx, z: old.cz }, rotation, foundationClearance: .12 });
    const h = { ...old, id: `hill_house_${i}`, variantId: variant.id, layout, rotation, baseY: layout.placement.floorY, w: variant.width, d: variant.depth, h: variant.wallHeight, enterable: false };
    HOUSES.push(h);
    // Scenic houses outside the playable ring only need visual geometry.
    if (Math.hypot(h.cx - 256, h.cz - 256) < field.playRadius) {
      RECTS.push(...layout.boxes.map(b => ({ ...b, kind: 'wall', hidden: true, h: b.y1 - b.y0 })));
      PLATFORMS.push(...layout.platforms);
    }
  });
}
