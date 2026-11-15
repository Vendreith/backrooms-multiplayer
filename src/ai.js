import { N, C, SPEED, ENTITY_ARCHETYPES } from './constants.js';
import { blocked, collide } from './map.js';
import { findDynamicGridPath, getTerrainAt } from './levels/terrain.js';

/**
 * Fast Grid A* pathfinder supporting dynamic map dimensions & outdoor plains.
 */
export function findGridPath(map, sx, sz, tx, tz) {
  return findDynamicGridPath(map, sx, sz, tx, tz);
}

/**
 * Autonomous AI Entity Controller for Solo & Co-op play.
 * Enforces strictly bounded local sight/hearing detection (NO global player omniscience),
 * distant sector-spanning patrol endpoints, and unique behavior quirks per Entity archetype.
 */
export class EntityAIController {
  constructor(aiId = 'AI_ENT_0', archetype = ENTITY_ARCHETYPES[0]) {
    this.id = aiId;
    this.archetype = archetype || ENTITY_ARCHETYPES[0];
    this.kind = this.archetype.kind || 'bacteria';
    this.state = 'PATROL'; // PATROL | CHASE | CARRY_TO_HOOK
    this.path = [];
    this.pathTimer = 0;
    this.targetPos = null;
    this.targetId = null;
    this.lostT = 0;
    this.attackCD = 0;
    this.slowT = 0;
    this.beamSlowT = 0;
    this.scrambleT = 0;
    this.patrolRoute = [];
    this.patrolIdx = 0;
    this.patrolDir = 1;
    this.stuckT = 0;
    this.lastX = 0;
    this.lastZ = 0;
    this.swingT = 0;
  }

  reset(x, z, routeWps = []) {
    this.state = 'PATROL';
    this.path = [];
    this.pathTimer = 0;
    this.targetPos = null;
    this.targetId = null;
    this.lostT = 0;
    this.attackCD = 0;
    this.slowT = 0;
    this.beamSlowT = 0;
    this.scrambleT = 0;
    this.patrolRoute = Array.isArray(routeWps) ? routeWps : [];
    this.patrolIdx = 0;
    this.patrolDir = 1;
    this.stuckT = 0;
    this.lastX = x;
    this.lastZ = z;
    this.swingT = 0;
  }

  scramble(dur = 10) {
    this.scrambleT = Math.max(this.scrambleT, dur);
    this.targetPos = null;
    this.targetId = null;
    this.state = 'PATROL';
  }

  update(dt, aiPlayer, players, map, callbacks) {
    if (!aiPlayer) return;
    if (this.attackCD > 0) this.attackCD = Math.max(0, this.attackCD - dt);
    if (this.slowT > 0) this.slowT = Math.max(0, this.slowT - dt);
    if (this.beamSlowT > 0) this.beamSlowT = Math.max(0, this.beamSlowT - dt);
    if (this.scrambleT > 0) this.scrambleT = Math.max(0, this.scrambleT - dt);
    if (this.swingT > 0) this.swingT = Math.max(0, this.swingT - dt * 2.8);

    aiPlayer.swingT = this.swingT;
    aiPlayer.reveal = false;

    const aiLevelId = aiPlayer.levelId || 'level0';
    const behavior = this.archetype.behavior || 'normal';
    const waterOnly = behavior === 'water_only';
    const aliveSurvs = [];
    for (const p of Object.values(players)) {
      if (p.role === 's' && (p.levelId || 'level0') === aiLevelId && (p.state === 'ok' || p.state === 'down')) {
        aliveSurvs.push(p);
      }
    }

    const stealthScale = this.scrambleT > 0 ? 0.52 : 1.0;

    // Mimic / Still-Life mechanic: direct active Flashlight beam slows & unsettles it at close range!
    if (this.archetype.beamSlows && !aiPlayer.carrying) {
      for (const s of aliveSurvs) {
        if (!s.fl || s.state !== 'ok') continue;
        const vx = aiPlayer.x - s.x;
        const vz = aiPlayer.z - s.z;
        const d = Math.hypot(vx, vz);
        if (d > 14.5 || d < 0.8) continue;
        const lookX = -Math.sin(s.yaw || 0);
        const lookZ = -Math.cos(s.yaw || 0);
        const dot = (vx / d) * lookX + (vz / d) * lookZ;
        if (dot > 0.80 && !blocked(s.x, s.z, aiPlayer.x, aiPlayer.z, map)) {
          this.beamSlowT = 0.45;
          break;
        }
      }
    }

    // State Selection with STRICT local bounded awareness (NO map-wide omniscience!)
    if (aiPlayer.carrying) {
      this.state = 'CARRY_TO_HOOK';
      const carried = players[aiPlayer.carrying];
      if (!carried || carried.state !== 'carried') {
        aiPlayer.carrying = null;
        this.state = 'PATROL';
      }
    } else {
      let bestTarget = null;
      let bestScore = Infinity;
      const baseSight = (this.archetype.sightRange || 16) * stealthScale;
      const baseHear = (this.archetype.hearRange || 12) * stealthScale;

      for (const s of aliveSurvs) {
        if (waterOnly) {
          const tSurf = getTerrainAt(s.x, s.z, map, s.y);
          if (!tSurf.inWater) continue; // Poolrooms / Ocean Stalker STRICTLY ignores Survivors out of water!
        }
        const d = Math.hypot(s.x - aiPlayer.x, s.z - aiPlayer.z);
        const darkMod = behavior === 'stalk_dark' ? (s.fl ? 1.45 : 0.72) : 1.0;
        const stealthFactor = (s.crouch && !s.fl ? 0.62 : s.fl ? 1.12 : 1.0) * darkMod;
        const effSight = baseSight * stealthFactor;
        const effHear = (s.crouch && behavior !== 'stalk_dark') ? 0 : (s.spd > 5.8 ? baseHear : baseHear * 0.48);
        if (d > Math.max(effSight, effHear)) continue;

        const los = d <= effSight && (waterOnly || !blocked(aiPlayer.x, aiPlayer.z, s.x, s.z, map));
        const audible = !s.crouch && d <= effHear;
        const nearDown = s.state === 'down' && d <= baseSight;
        if (los || audible || nearDown) {
          const prio = s.state === 'down' ? d * 0.72 : d;
          if (prio < bestScore) { bestScore = prio; bestTarget = s; }
        }
      }

      if (bestTarget) {
        if (this.state !== 'CHASE' && callbacks?.onAggro) callbacks.onAggro(aiPlayer, bestTarget, this.archetype);
        this.state = 'CHASE';
        this.lostT = 0;
        this.targetId = bestTarget.id;
        this.targetPos = { x: bestTarget.x, z: bestTarget.z };
      } else if (this.state === 'CHASE' && this.targetPos) {
        this.lostT += dt * (waterOnly ? 2.8 : 1.0);
        const maxLose = waterOnly ? 1.9 : (this.archetype.loseTime || 4.5);
        if (this.lostT >= maxLose || Math.hypot(this.targetPos.x - aiPlayer.x, this.targetPos.z - aiPlayer.z) < 2.2) {
          this.state = 'PATROL';
          this.targetPos = null;
          this.targetId = null;
          this.lostT = 0;
        }
      } else {
        this.state = 'PATROL';
      }
    }

    // Compute navigation goal
    let goal = null;
    if (this.state === 'CARRY_TO_HOOK') {
      let bestHook = null, bestD = Infinity;
      for (const h of (map.HOOKS || [])) {
        if (h.occ) continue;
        const d = Math.hypot(h.x - aiPlayer.x, h.z - aiPlayer.z);
        if (d < bestD) { bestD = d; bestHook = h; }
      }
      if (bestHook) {
        goal = bestHook;
        if (bestD < 2.2 && callbacks?.onHook) {
          callbacks.onHook(aiPlayer, players[aiPlayer.carrying], bestHook);
          this.path = [];
        }
      } else {
        // Sub-level without meat-hooks: drop carried survivor safely so AI resumes patrolling
        const carried = players[aiPlayer.carrying];
        if (carried) carried.state = 'down';
        aiPlayer.carrying = null;
        this.state = 'PATROL';
      }
    } else if (this.state === 'CHASE' && this.targetPos) {
      goal = this.targetPos;
    } else {
      // Traverse long-distance macro territory route (`start -> mid1 -> end -> mid2` bounce back & forth)
      const route = this.patrolRoute.length >= 2 ? this.patrolRoute : map.TASKS;
      if (route.length > 0) {
        if (this.patrolIdx >= route.length) this.patrolIdx = 0;
        if (this.patrolIdx < 0) this.patrolIdx = route.length - 1;
        const wp = route[this.patrolIdx];
        if (wp && Math.hypot(wp.x - aiPlayer.x, wp.z - aiPlayer.z) < 3.4) {
          if (route.length >= 2) {
            if (this.patrolIdx + this.patrolDir >= route.length || this.patrolIdx + this.patrolDir < 0) {
              this.patrolDir *= -1;
            }
            this.patrolIdx += this.patrolDir;
          }
          this.path = [];
        }
        goal = route[this.patrolIdx];
      }
    }

    // Attack / Pickup interactions in CHASE
    if (this.state === 'CHASE' && this.targetId && players[this.targetId]) {
      const targ = players[this.targetId];
      const dist = Math.hypot(targ.x - aiPlayer.x, targ.z - aiPlayer.z);
      if (targ.state === 'down' && dist < 1.95 && !aiPlayer.carrying) {
        targ.state = 'carried';
        aiPlayer.carrying = targ.id;
        this.path = [];
        if (callbacks?.onPickup) callbacks.onPickup(aiPlayer, targ);
      } else if (targ.state === 'ok' && dist < 2.15 && this.attackCD <= 0 && targ.y < 1.1) {
        this.attackCD = 2.4;
        this.slowT = 0.95;
        this.swingT = 1.0;
        if (callbacks?.onHit) callbacks.onHit(aiPlayer, targ);
      }
    }

    // Move along LOS or A* Path
    const isSmiler = this.kind === 'smiler';
    const isStealer = this.kind === 'skin_stealer';
    const isWire = this.kind === 'wire_stalker';

    let spd = aiPlayer.carrying
      ? SPEED.KILLER_CARRY
      : this.slowT > 0
        ? SPEED.KILLER_SLOW
        : this.state === 'CHASE'
          ? (this.archetype.chaseSpd || SPEED.KILLER_BASE)
          : (this.archetype.patrolSpd || SPEED.KILLER_BASE * 0.85);
    if (isStealer && this.state === 'CHASE' && this.targetPos) {
      const td = Math.hypot(this.targetPos.x - aiPlayer.x, this.targetPos.z - aiPlayer.z);
      if (td < 9.5) spd *= 1.07; // Skin-Stealer lunges faster once close!
    }
    if (this.beamSlowT > 0) spd *= isSmiler ? 0.24 : 0.36;

    if (goal) {
      const canSeeGoal = !blocked(aiPlayer.x, aiPlayer.z, goal.x, goal.z, map);
      let steerX = goal.x, steerZ = goal.z;

      if (!canSeeGoal) {
        this.pathTimer -= dt;
        if (this.pathTimer <= 0 || !this.path.length) {
          this.path = findGridPath(map, aiPlayer.x, aiPlayer.z, goal.x, goal.z);
          this.pathTimer = isWire ? 0.38 : 0.55;
        }
        while (this.path.length > 1 && Math.hypot(this.path[0][0] - aiPlayer.x, this.path[0][1] - aiPlayer.z) < 1.25) {
          this.path.shift();
        }
        if (this.path.length) {
          steerX = this.path[0][0];
          steerZ = this.path[0][1];
        }
      }

      const dx = steerX - aiPlayer.x;
      const dz = steerZ - aiPlayer.z;
      const len = Math.hypot(dx, dz);
      if (len > 0.05) {
        const vx = (dx / len) * spd;
        const vz = (dz / len) * spd;
        const [nx, nz] = collide(aiPlayer.x + vx * dt, aiPlayer.z + vz * dt, 0.42, map, false, 0);
        aiPlayer.x = nx;
        aiPlayer.z = nz;
        aiPlayer.yaw = Math.atan2(-vx, -vz);
        aiPlayer.spd = spd;
      } else {
        aiPlayer.spd = 0;
      }

      // Unstick safeguard if corner snags
      const moved = Math.hypot(aiPlayer.x - this.lastX, aiPlayer.z - this.lastZ);
      this.lastX = aiPlayer.x;
      this.lastZ = aiPlayer.z;
      if (moved < 0.02 * dt && len > 1.0) {
        this.stuckT += dt;
        if (this.stuckT > 0.9) {
          this.stuckT = 0;
          this.path = [];
          this.pathTimer = 0;
          if (this.patrolRoute.length) {
            this.patrolIdx = (this.patrolIdx + 1) % this.patrolRoute.length;
          }
        }
      } else {
        this.stuckT = 0;
      }
    }
  }
}
