/*!
 * Level 94 Gameplay Support — Landmark Discovery & Exploration
 * Agent 3. Dependency-injected; no imports from Agent 1/2 source paths.
 *
 * Preserves open-ended exploration (no HUD waypoints). Provides:
 *  - landmark definitions (areas of interest) at terrain-defined coordinates
 *  - proximity-based discovery tracking (persisted ids)
 *  - subtle discovery notifications through injected callbacks
 *  - interactable environmental discoveries (optional, opt-in via layout)
 *  - safe-traversal hints derived from terrain validator
 *  - navigation targets exposed for external minimap/teleport tools only
 */

import { LANDMARK_DISCOVERY_RADIUS } from './constants.js';

/**
 * @typedef {Object} Landmark
 * @property {string} id
 * @property {number} x
 * @property {number} z
 * @property {string} [name]
 * @property {string} [kind]        'landmark'|'discovery'|'exit'
 * @property {number} [radius]
 * @property {string} [note]
 */

export class ExplorationSystem {
  /**
   * @param {Object} deps
   * @param {(text:string,kind?:string)=>void} [deps.onDiscover]  subtle, non-HUD notification
   * @param {(kind:string,data:Object)=>void} [deps.emitEvent]
   */
  constructor(deps = {}) {
    this.deps = deps;
    this.landmarks = [];
    this.discovered = new Set();
    this.enterCounts = new Map();
  }

  add(lm) {
    if (this.landmarks.some(l => l.id === lm.id)) throw new Error(`duplicate landmark id: ${lm.id}`);
    this.landmarks.push({ kind: 'landmark', radius: LANDMARK_DISCOVERY_RADIUS, ...lm });
    return lm;
  }
  addAll(list) { list.forEach(l => this.add(l)); return this.landmarks; }

  /**
   * Per-frame discovery check.
   * @param {{x:number,y:number,z:number}} player
   * @returns {Landmark[]} landmarks newly discovered this frame
   */
  update(player) {
    const newly = [];
    for (const lm of this.landmarks) {
      const d = Math.hypot(player.x - lm.x, player.z - lm.z);
      if (d <= lm.radius) {
        const count = this.enterCounts.get(lm.id) || 0;
        this.enterCounts.set(lm.id, count + 1);
        if (!this.discovered.has(lm.id)) {
          this.discovered.add(lm.id);
          newly.push(lm);
          this.deps.onDiscover?.(lm.name || lm.id, lm.kind);
          this.deps.emitEvent?.('landmark:discover', { landmarkId: lm.id, kind: lm.kind });
        }
      }
    }
    return newly;
  }

  /** Restore discovered ids from durable save data. */
  loadDiscovered(ids) {
    if (!Array.isArray(ids)) return;
    ids.forEach(id => this.discovered.add(id));
  }
  saveDiscovered() { return [...this.discovered]; }

  /** Outside-facing list of navigation targets (for QA / optional tools). Never drawn as HUD. */
  getNavigationTargets() {
    return this.landmarks.map(l => ({ id: l.id, x: l.x, z: l.z, kind: l.kind, discovered: this.discovered.has(l.id) }));
  }

  /** Landmarks near a point — used by integration to connect prop/landmark meshes. */
  near(x, z, radius = 40) {
    return this.landmarks.filter(l => Math.hypot(l.x - x, l.z - z) <= radius);
  }
}

/**
 * Default landmark + discovery recipe for Dreamcore Hills. Coordinates are
 * PLACEHOLDERS relative to worldSpan; reconcile with Agent 1's real map at
 * integration. Intentionally sparse — preserves open-ended exploration.
 *
 * @param {number} worldSpan
 * @returns {Landmark[]}
 */
export function defaultLandmarkLayout(worldSpan = 864) {
  const mid = Math.round(worldSpan / 2);
  return [
    { id: 'hilltop_landmark', x: mid, z: Math.round(worldSpan * 0.78), name: 'The Hilltop House', kind: 'landmark', note: 'A lone house above the clouds' },
    { id: 'cluster_overlook', x: Math.round(worldSpan * 0.28), z: Math.round(worldSpan * 0.62), name: 'The Neighborhood Overlook', kind: 'landmark' },
    { id: 'quiet_bench', x: Math.round(worldSpan * 0.7), z: Math.round(worldSpan * 0.34), name: 'A Bench Facing Nowhere', kind: 'discovery' },
    { id: 'old_mailbox', x: Math.round(worldSpan * 0.4), z: Math.round(worldSpan * 0.2), name: 'An Old Mailbox', kind: 'discovery' }
  ];
}
