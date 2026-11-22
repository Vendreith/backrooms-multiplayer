/*!
 * Level 94 Gameplay Support — Horizon Door Interaction & Transition System
 * Agent 3. Dependency-injected; no imports from Agent 1/2 source paths.
 *
 * Implements the mysterious doors at the edges of Dreamcore Hills:
 *  - multiple doorway instances placed at terrain-defined coordinates
 *  - proximity detection + intentional traversal trigger (walk-in or interact)
 *  - multiplayer-safe transition via injected requestTransition (host-authoritative)
 *  - debounce/cooldown to prevent repeated triggering
 *  - destination validation + graceful fallback when tunnel level is absent
 *  - no fabrication of a finished destination level
 *
 * The door visual mesh is injected (buildDoorMesh) so this module never touches
 * Agent 2's architecture namespace. This module owns only gameplay logic.
 */

import {
  DOOR_INTERACTION_RADIUS,
  DOOR_TRIGGER_COOLDOWN_MS,
  DEFAULT_TUNNEL_DESTINATION
} from './constants.js';

import { validateDestination } from './spawn-validator.js';

/**
 * @typedef {Object} DoorConfig
 * @property {string} id                 unique door id
 * @property {number} x                  world x (terrain-defined)
 * @property {number} z                  world z
 * @property {number} [y]                base elevation (terrain sampler fill if omitted)
 * @property {number} [yaw]              facing angle (radians)
 * @property {string} [destinationId]    override destination level id
 * @property {string} [label]            interaction label
 * @property {'walkin'|'interact'} [trigger]  traversal trigger mode
 * @property {number} [radius]           proximity radius override
 */

/**
 * @typedef {Object} TransitionDeps — injected by the integration adapter
 * @property {(id:string)=>Object|null} getLevelMeta
 * @property {(id:string)=>Object|null} [getLevelMap]
 * @property {Object} [terrain]                       spawn validation sampler
 * @property {(to:string,via:string,from:string)=>void} requestTransition
 *           MULTIPLAYER CONTRACT: routed through sendAction({act:'enterLevel'})
 *           so all clients transition together. Never call switchLocalWorld
 *           directly from gameplay code.
 * @property {(x:number,y:number,z:number)=>number} [getGroundY]
 * @property {(id:string,cfg:DoorConfig)=>Object} [buildDoorMesh]  optional visual
 * @property {(text:string)=>void} [showPrompt]
 * @property {(text:string)=>void} [showFallback]
 * @property {(doorId:string,to:string)=>void} [onTransition]
 * @property {(kind:string,data:Object)=>void} [emitEvent]  telemetry / tests
 */

export class HorizonDoor {
  constructor(cfg, deps) {
    this.id = cfg.id;
    this.config = cfg;
    this.deps = deps;
    this.x = cfg.x;
    this.z = cfg.z;
    this.y = cfg.y ?? 0;
    this.yaw = cfg.yaw ?? 0;
    this.destinationId = cfg.destinationId ?? DEFAULT_TUNNEL_DESTINATION;
    this.trigger = cfg.trigger ?? 'walkin';
    this.radius = cfg.radius ?? DOOR_INTERACTION_RADIUS;
    // -Infinity ensures the FIRST trigger is never mistaken for being inside
    // the cooldown window (game clocks such as performance.now() start near 0).
    this.lastTriggerMs = -Infinity;
    this.triggering = false;
    this.inside = false;
    this.mesh = null;

    if (typeof deps.buildDoorMesh === 'function') {
      this.mesh = deps.buildDoorMesh(this.id, cfg) || null;
      if (this.mesh) {
        this.mesh.position?.set(this.x, this.y, this.z);
        if (this.mesh.rotation) this.mesh.rotation.y = this.yaw;
      }
    }
  }

  /** Distance from a player position to this door on the ground plane. */
  distanceTo(player) {
    return Math.hypot(player.x - this.x, player.z - this.z);
  }

  /**
   * Per-frame proximity + trigger processing.
   * @param {{x:number,y:number,z:number,id?:string}} player
   * @param {number} nowMs
   * @param {boolean} interactPressed  only used for 'interact' trigger mode
   */
  update(player, nowMs, interactPressed = false) {
    if (this.triggering) return 'cooldown';
    const dist = this.distanceTo(player);
    const nowInside = dist <= this.radius;

    if (nowInside && !this.inside) {
      this.inside = true;
      this.deps.showPrompt?.(this.config.label || 'Step through the doorway');
      this.deps.emitEvent?.('door:enter', { doorId: this.id });
    } else if (!nowInside && this.inside) {
      this.inside = false;
      this.deps.showPrompt?.('');
      this.deps.emitEvent?.('door:leave', { doorId: this.id });
    }

    if (!nowInside) return 'idle';

    // Debounce: one trigger per door per cooldown window (per client + host).
    if (nowMs - this.lastTriggerMs < DOOR_TRIGGER_COOLDOWN_MS) return 'cooldown';

    const shouldTrigger =
      this.trigger === 'walkin' ? true : (interactPressed === true);

    if (!shouldTrigger) return 'awaiting-interaction';

    // Reserve immediately (synchronous) so overlapping frames cannot double-fire.
    this.triggering = true;
    this.lastTriggerMs = nowMs;
    const result = this._transition(player);
    // Release reservation after cooldown; keep triggering true until then to block re-entry.
    return result;
  }

  _transition(player) {
    const { getLevelMeta, getLevelMap, terrain, requestTransition, onTransition, emitEvent, showFallback } = this.deps;
    const destination = this.destinationId;

    // 1. Validate destination honestly — never fabricate a level.
    const check = validateDestination(destination, {
      getLevelMeta,
      getLevelMap,
      terrain
    });

    if (!check.available || !check.hasSpawn) {
      // Fallback: stay put, inform player, keep exploring. No invalid spawn.
      showFallback?.(`The doorway hums but leads nowhere yet. (${check.reason})`);
      emitEvent?.('door:fallback', { doorId: this.id, destination, reason: check.reason });
      this.triggering = false; // allow retry later (destination may appear)
      return 'fallback';
    }

    // 2. Request transition through multiplayer-safe adapter (host-authoritative).
    try {
      requestTransition?.(destination, 'horizon_door', player.id);
      onTransition?.(this.id, destination);
      emitEvent?.('door:trigger', { doorId: this.id, destination, playerId: player.id });
      return 'triggered';
    } catch (err) {
      showFallback?.(`The doorway fizzles. (${err?.message || err})`);
      emitEvent?.('door:error', { doorId: this.id, error: String(err?.message || err) });
      this.triggering = false;
      return 'error';
    }
  }

  /** Called by adapter each frame after cooldown window to re-arm walk-in doors. */
  refresh(nowMs) {
    if (this.triggering && nowMs - this.lastTriggerMs >= DOOR_TRIGGER_COOLDOWN_MS) {
      this.triggering = false;
    }
  }

  dispose() {
    if (this.mesh?.parent) this.mesh.parent.remove(this.mesh);
    this.mesh = null;
  }
}

/**
 * Manages all horizon doors for Level 94.
 */
export class HorizonDoorSystem {
  constructor(deps) {
    this.deps = deps;
    this.doors = [];
  }

  /** Add a door from config; returns the instance. */
  add(cfg) {
    if (this.doors.some(d => d.id === cfg.id)) {
      throw new Error(`duplicate horizon door id: ${cfg.id}`);
    }
    const door = new HorizonDoor(cfg, this.deps);
    this.doors.push(door);
    return door;
  }

  /** Bulk-add doors (e.g. loaded from a level-layout recipe). */
  addAll(cfgs) { cfgs.forEach(c => this.add(c)); return this.doors; }

  /** Per-frame update across all doors. */
  update(player, nowMs, interactPressed = false) {
    const results = [];
    for (const door of this.doors) {
      door.refresh(nowMs);
      results.push({ doorId: door.id, result: door.update(player, nowMs, interactPressed) });
    }
    return results;
  }

  /** Doors currently in range (for prompts / QA). */
  nearby(player, radius = DOOR_INTERACTION_RADIUS) {
    return this.doors.filter(d => d.distanceTo(player) <= radius);
  }

  /** Deterministic serialized layout for tests / integration docs. */
  serialize() {
    return this.doors.map(d => ({
      id: d.id, x: d.x, y: d.y, z: d.z, yaw: d.yaw,
      destinationId: d.destinationId, trigger: d.trigger, radius: d.radius
    }));
  }

  dispose() { this.doors.forEach(d => d.dispose()); this.doors = []; }
}

/**
 * Default horizon-door layout recipe for Dreamcore Hills.
 * Positions are at world edges (terrain-defined coordinates); final Y is filled
 * by the terrain sampler through the adapter. These are PLACEHOLDERS to be
 * reconciled with Agent 1's actual worldSpan / exit positions at integration.
 *
 * @param {number} worldSpan
 * @returns {DoorConfig[]}
 */
export function defaultDoorLayout(worldSpan = 864) {
  const m = 30; // inset from edge
  return [
    { id: 'door_north', x: Math.round(worldSpan / 2), z: m, yaw: 0, label: 'A door at the edge of the hills' },
    { id: 'door_south', x: Math.round(worldSpan / 2), z: worldSpan - m, yaw: Math.PI, label: 'A door at the edge of the hills' },
    { id: 'door_east', x: worldSpan - m, z: Math.round(worldSpan / 2), yaw: -Math.PI / 2, label: 'A door at the edge of the hills' },
    { id: 'door_west', x: m, z: Math.round(worldSpan / 2), yaw: Math.PI / 2, label: 'A door at the edge of the hills' }
  ];
}
