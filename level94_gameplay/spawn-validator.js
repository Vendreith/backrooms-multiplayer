/*!
 * Level 94 Gameplay Support — Safe Destination / Spawn Validation
 * Agent 3. Dependency-injected; no imports from Agent 1/2 source paths.
 *
 * Validates that a candidate spawn point is safe BEFORE a transition commits:
 *  - finite coordinates
 *  - inside world bounds
 *  - ground query resolves (no falling-through-terrain)
 *  - slope is human-friendly
 *  - optional solid/rect overlap rejection
 * Provides fallback candidate search so transitions never drop a player into
 * invalid space.
 */

import {
  SPAWN_CLEARANCE,
  SPAWN_MIN_GROUND_Y,
  SPAWN_MAX_SLOPE
} from './constants.js';

/**
 * @typedef {Object} TerrainSampler
 * @property {(x:number,z:number,curY?:number)=>number} getHeight  ground Y at (x,z)
 */

/**
 * @typedef {Object} SpawnCandidate
 * @property {number} x
 * @property {number} z
 * @property {number} [y]
 * @property {number} [yaw]
 */

/**
 * Validate a single candidate spawn point.
 *
 * @param {SpawnCandidate} p
 * @param {Object} deps
 * @param {TerrainSampler} deps.terrain
 * @param {number} [deps.worldSpan]            world extent (0..span on both axes)
 * @param {(x:number,z:number)=>boolean} [deps.isSolid]  optional solid-overlap test
 * @returns {{valid:boolean, y:number, reason:string, slope:number}}
 */
export function validateSpawn(p, deps) {
  const { terrain, worldSpan, isSolid } = deps;
  if (!terrain || typeof terrain.getHeight !== 'function') {
    return { valid: false, y: 0, reason: 'no terrain sampler provided', slope: Infinity };
  }
  if (!Number.isFinite(p.x) || !Number.isFinite(p.z)) {
    return { valid: false, y: 0, reason: 'non-finite coordinates', slope: Infinity };
  }
  if (worldSpan && (p.x < 0 || p.z < 0 || p.x > worldSpan || p.z > worldSpan)) {
    return { valid: false, y: 0, reason: 'outside world bounds', slope: Infinity };
  }

  const y = terrain.getHeight(p.x, p.z, p.y ?? 0);
  if (!Number.isFinite(y)) {
    return { valid: false, y: 0, reason: 'ground query returned non-finite value', slope: Infinity };
  }
  if (y < SPAWN_MIN_GROUND_Y) {
    return { valid: false, y, reason: 'ground below minimum (fall-through risk)', slope: Infinity };
  }

  // Local slope estimate via central difference (finite differences).
  const d = 0.75;
  const hx1 = terrain.getHeight(p.x + d, p.z, y);
  const hx0 = terrain.getHeight(p.x - d, p.z, y);
  const hz1 = terrain.getHeight(p.x, p.z + d, y);
  const hz0 = terrain.getHeight(p.x, p.z - d, y);
  const slope = Math.max(
    Math.abs(hx1 - hx0) / (2 * d),
    Math.abs(hz1 - hz0) / (2 * d)
  );
  if (!Number.isFinite(slope) || slope > SPAWN_MAX_SLOPE) {
    return { valid: false, y, reason: `slope ${slope.toFixed(2)} exceeds safe limit`, slope };
  }

  if (typeof isSolid === 'function' && isSolid(p.x, p.z)) {
    return { valid: false, y, reason: 'spawn overlaps solid geometry', slope };
  }

  return { valid: true, y: y + SPAWN_CLEARANCE, reason: 'ok', slope };
}

/**
 * Find the nearest safe spawn to a preferred point, searching an expanding
 * ring pattern. Deterministic (no RNG) so multiplayer clients agree.
 *
 * @param {SpawnCandidate} preferred
 * @param {Object} deps             same as validateSpawn deps
 * @param {Object} [opts]
 * @param {number} [opts.maxRadius]     max search radius (m)
 * @param {number} [opts.step]          ring step (m)
 * @returns {{found:boolean, spawn:SpawnCandidate, validation:Object}}
 */
export function findSafeSpawn(preferred, deps, opts = {}) {
  const maxRadius = opts.maxRadius ?? 24;
  const step = opts.step ?? 3;
  const fallback = { x: preferred.x, y: preferred.y ?? 0, z: preferred.z, yaw: preferred.yaw ?? 0 };

  const direct = validateSpawn(preferred, deps);
  if (direct.valid) {
    return {
      found: true,
      spawn: { ...fallback, y: direct.y },
      validation: direct
    };
  }

  // Expanding rings; 16 directions per ring for stable coverage.
  for (let r = step; r <= maxRadius; r += step) {
    for (let k = 0; k < 16; k++) {
      const a = (k / 16) * Math.PI * 2;
      const cand = {
        x: preferred.x + Math.cos(a) * r,
        z: preferred.z + Math.sin(a) * r,
        yaw: preferred.yaw ?? 0
      };
      const v = validateSpawn(cand, deps);
      if (v.valid) {
        return { found: true, spawn: { ...cand, y: v.y }, validation: v };
      }
    }
  }

  return {
    found: false,
    spawn: fallback,
    validation: { valid: false, reason: 'no safe spawn found within search radius', y: fallback.y, slope: Infinity }
  };
}

/**
 * Validate a level destination before committing a transition. Checks that the
 * destination id is registered and that a spawn resolves. Never fabricates a
 * level — reports availability honestly.
 *
 * @param {string} destinationId
 * @param {Object} deps
 * @param {(id:string)=>Object|null} deps.getLevelMeta
 * @param {(id:string)=>Object|null} [deps.getLevelMap]
 * @param {TerrainSampler} [deps.terrain]
 * @returns {{available:boolean, hasSpawn:boolean, reason:string}}
 */
export function validateDestination(destinationId, deps) {
  const { getLevelMeta, getLevelMap, terrain } = deps;
  if (typeof getLevelMeta !== 'function') {
    return { available: false, hasSpawn: false, reason: 'no meta resolver' };
  }
  const meta = getLevelMeta(destinationId);
  if (!meta) {
    return { available: false, hasSpawn: false, reason: `level '${destinationId}' not registered` };
  }
  const map = typeof getLevelMap === 'function' ? getLevelMap(destinationId) : null;
  const spawn = map?.SPAWN || meta.SPAWN;
  if (!spawn) {
    return { available: true, hasSpawn: false, reason: `level '${destinationId}' registered but has no SPAWN` };
  }
  if (terrain && typeof terrain.getHeight === 'function') {
    const v = validateSpawn(spawn, { ...deps, terrain });
    if (!v.valid) {
      return { available: true, hasSpawn: false, reason: `destination spawn unsafe: ${v.reason}` };
    }
  }
  return { available: true, hasSpawn: true, reason: 'ok' };
}
