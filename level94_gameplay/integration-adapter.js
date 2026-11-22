/*!
 * Level 94 Gameplay Support — Integration Adapter
 * Agent 3. This is the ONLY place that touches core-game concepts, and it does
 * so via injection — it does not import or modify Agent 1/2 source files.
 *
 * INTEGRATION CONTRACT (what the host main.js must provide):
 *   {
 *     getLevelMeta(id), getLevelMap(id),
 *     terrain: { getHeight(x,z,curY) },
 *     activeLevelId: () => string,
 *     getPlayer: () => {id,x,y,z},
 *     requestLevelTransition(to, via, playerId),  // MUST route to sendAction({act:'enterLevel'})
 *     buildDoorMesh?(id,cfg), showPrompt?(text), showFallback?(text),
 *     onDiscover?(text,kind), emitEvent?(kind,data),
 *     audioCtx, audioParentBus,
 *     nowMs?: () => number
 *   }
 *
 * Host integration (once, at a safe integration commit) adds roughly:
 *   import { createLevel94Gameplay } from './level94_gameplay/integration-adapter.js';
 *   const l94 = createLevel94Gameplay(contract);
 *   // in main loop: l94.update();
 *   // on level enter/exit: l94.onLevelEnter(id); l94.onLevelExit(id);
 *   // on dispose: l94.dispose();
 *
 * The host file edit itself is prepared on the isolated integration branch,
 * never performed in Agent 1's active worktree.
 */

import { HorizonDoorSystem, defaultDoorLayout } from './horizon-door.js';
import { ExplorationSystem, defaultLandmarkLayout } from './exploration.js';
import { Level94Ambience } from './ambience.js';
import { findSafeSpawn, validateDestination } from './spawn-validator.js';
import { LEVEL94_ID } from './constants.js';

/**
 * Create the full Level 94 gameplay support bundle.
 * @param {Object} contract — see INTEGRATION CONTRACT above
 */
export function createLevel94Gameplay(contract) {
  const c = contract || {};
  const now = () => (typeof c.nowMs === 'function' ? c.nowMs() : Date.now());
  const active = c.activeLevelId || (() => 'level0');

  // ---- Transition adapter: host-authoritative, multiplayer-safe ----
  const transitionDeps = {
    getLevelMeta: c.getLevelMeta,
    getLevelMap: c.getLevelMap,
    terrain: c.terrain,
    requestTransition: (to, via, playerId) => {
      if (typeof c.requestLevelTransition !== 'function') {
        throw new Error('requestLevelTransition not provided by host (multiplayer transition unavailable)');
      }
      c.requestLevelTransition(to, via, playerId);
    },
    buildDoorMesh: c.buildDoorMesh,
    showPrompt: c.showPrompt,
    showFallback: c.showFallback,
    emitEvent: c.emitEvent
  };

  const doors = new HorizonDoorSystem(transitionDeps);
  const worldSpan = c.getLevelMeta?.(LEVEL94_ID)?.worldSpan || 864;
  doors.addAll(defaultDoorLayout(worldSpan));

  const exploration = new ExplorationSystem({
    onDiscover: c.onDiscover,
    emitEvent: c.emitEvent
  });
  exploration.addAll(defaultLandmarkLayout(worldSpan));

  let ambience = null;
  let ambienceActive = false;

  const api = {
    doors,
    exploration,

    /** Fill door Y coordinates from terrain at integration/first activation. */
    reconcileTerrain() {
      for (const door of doors.doors) {
        if (c.terrain && typeof c.terrain.getHeight === 'function') {
          door.y = c.terrain.getHeight(door.x, door.z, door.y);
          if (door.mesh?.position) door.mesh.position.y = door.y;
        }
      }
      c.emitEvent?.('gameplay:terrain-reconciled', { doorCount: doors.doors.length });
    },

    /** Validate a destination before host commits a transition. */
    canTransitionTo(destinationId) {
      return validateDestination(destinationId, {
        getLevelMeta: c.getLevelMeta,
        getLevelMap: c.getLevelMap,
        terrain: c.terrain
      });
    },

    /** Resolve a safe spawn for a requested destination. */
    safeSpawn(preferred, opts) {
      return findSafeSpawn(preferred, {
        terrain: c.terrain,
        worldSpan: c.getLevelMeta?.(preferred.levelId || LEVEL94_ID)?.worldSpan,
        isSolid: c.isSolid
      }, opts);
    },

    onLevelEnter(levelId) {
      if (levelId !== LEVEL94_ID) return;
      api.reconcileTerrain();
      // Ambience uses existing audio buses; start once when context is ready.
      if (c.audioCtx && c.audioParentBus && !ambience && !ambienceActive) {
        ambience = new Level94Ambience({ ctx: c.audioCtx, parent: c.audioParentBus });
        ambience.start();
        ambienceActive = true;
        c.emitEvent?.('ambience:start', { levelId });
      }
    },

    onLevelExit(levelId) {
      if (levelId !== LEVEL94_ID) return;
      if (ambience) { ambience.dispose(); ambience = null; ambienceActive = false; }
      c.emitEvent?.('ambience:stop', { levelId });
    },

    /** Per-frame update. Call from the host main loop. */
    update(interactPressed = false) {
      if (active() !== LEVEL94_ID) return [];
      const player = typeof c.getPlayer === 'function' ? c.getPlayer() : null;
      if (!player) return [];
      const t = now();
      const results = doors.update(player, t, interactPressed);
      exploration.update(player);
      if (ambience) ambience.updateListener(player);
      return results;
    },

    dispose() {
      doors.dispose();
      if (ambience) { ambience.dispose(); ambience = null; ambienceActive = false; }
    }
  };

  return api;
}
