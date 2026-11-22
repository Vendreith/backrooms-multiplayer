/*! Copyright (c) 2026 Vendreith. Licensing: see LICENSE.md and THIRD_PARTY_NOTICES.md. */
import * as THREE from 'three';
import { MeshKit } from './level94_architecture/kit.js';
import { getHouseMaterialResolver } from './level94_architecture/house_builder.js';

export function buildThresholdDoors(root, doors = [], resources = []) {
  const kit = new MeshKit();
  for (const door of doors) {
    kit.push({ x: door.x, y: door.y, z: door.z }, door.rotY || 0);
    const tunnel = door.kind === 'tunnel_mouth' || door.kind === 'kiosk';
    const key = tunnel ? 'brick' : 'trim';
    kit.box(key, .35, 3.0, tunnel ? 2.5 : .35, -1.3, 1.5, 0);
    kit.box(key, .35, 3.0, tunnel ? 2.5 : .35, 1.3, 1.5, 0);
    kit.box(key, 2.95, .35, tunnel ? 2.5 : .35, 0, 3.05, 0);
    kit.box('foundation', 2.95, .14, tunnel ? 3 : .8, 0, -.07, 0);
    kit.box('dark_metal', 2.22, 2.85, .12, 0, 1.43, -.25);
    kit.box('glow', 1.4, .08, .05, 0, 2.92, .23);
    if (tunnel) for (const x of [-.95, .95]) kit.cylinder('metal', .07, .07, 2.4, 8, x, 1.3, .25);
    kit.pop();
  }
  const group = kit.merge(getHouseMaterialResolver()).group;
  group.traverse(m => { if (m.isMesh) { resources.push(m.geometry); m.castShadow = m.receiveShadow = true; } });
  root.add(group); return group;
}

// The host derives destinations from its own map. Client coordinates cannot select a spawn.
export function resolveThreshold(map, destination, doorId, player, now) {
  const door = map.LEVEL_DOORS?.find(d => d.id === doorId);
  if (!door || door.targetLevel !== destination?.levelId) return { ok: false, reason: 'invalid destination' };
  if (Math.hypot(player.x - door.x, player.z - door.z) > 3.4 || Math.abs(player.y - door.y) > 2.5) return { ok: false, reason: 'door out of reach' };
  if (now - (player.lastThresholdAt ?? -Infinity) < 1800) return { ok: false, reason: 'cooldown' };
  const preferred = { x: door.tx ?? destination.SPAWN.x, z: door.tz ?? destination.SPAWN.z };
  for (const offset of [[0, 0], [1.5, 0], [-1.5, 0], [0, 1.5], [0, -1.5], [3, 0], [-3, 0]]) {
    const x = preferred.x + offset[0], z = preferred.z + offset[1];
    if (x < 1 || z < 1 || x > destination.worldSpan - 1 || z > destination.worldSpan - 1) continue;
    const y = destination.hills?.heightAt(x, z) ?? destination.SPAWN.y ?? 0;
    if (!Number.isFinite(y)) continue;
    const blocked = [...destination.wallGrid.queryNear(x, z, .5)].some(b => x > b.x0 - .4 && x < b.x1 + .4 && z > b.z0 - .4 && z < b.z1 + .4 && y < (b.maxY ?? b.y1 ?? 99) - .15 && y + 1.72 > (b.minY ?? b.y0 ?? 0));
    if (!blocked) return { ok: true, x, y, z, yaw: door.tyaw || 0 };
  }
  return { ok: false, reason: 'destination obstructed' };
}
