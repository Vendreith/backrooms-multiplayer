/*!
 * Level 94 Gameplay Support — Shared Constants
 * Agent 3 (Lead Integration Engineer + Active Gameplay Developer)
 * Isolated namespace: level94_gameplay/ — does not modify Agent 1/2 files.
 *
 * Original implementation. Copyright (c) 2026 Vendreith.
 */

export const LEVEL94_ID = 'level94';

/**
 * Destination level id for the brick utility-tunnel with water pipes.
 * IMPORTANT: This level is NOT yet implemented. The transition module provides
 * graceful fallback when the destination is unavailable. Integration must
 * confirm the real destination id (candidates below) before merge.
 */
export const TUNNEL_DESTINATION_CANDIDATES = Object.freeze([
  'level94u',   // audio hints already exist in audio.js (lvl2_pipes, deep_noise)
  'level2',     // "Pipe Dreams" — existing pipe level in the catalog
  'level94_tunnel'
]);
export const DEFAULT_TUNNEL_DESTINATION = 'level94u';

/** Interaction distances (metres). */
export const DOOR_INTERACTION_RADIUS = 4.2;
export const DOOR_TRIGGER_COOLDOWN_MS = 3500;
export const LANDMARK_DISCOVERY_RADIUS = 12;

/** Safe-spawn validation. */
export const SPAWN_CLEARANCE = 1.15;      // vertical step-up/down tolerance (matches terrain.js)
export const SPAWN_MIN_GROUND_Y = -40;    // reject absurdly deep positions
export const SPAWN_MAX_SLOPE = 1.35;      // reject steep slopes

/** Ambience defaults — nostalgic, peaceful, dreamlike, subtly uncanny. */
export const AMBIENCE_DEFAULTS = Object.freeze({
  windGain: 0.045,
  grassGain: 0.028,
  distantGain: 0.016,
  roomToneGain: 0.022,
  mysteryGain: 0.010,
  mysteryIntervalMinMs: 18000,
  mysteryIntervalMaxMs: 42000,
  crossfadeSec: 1.2
});
