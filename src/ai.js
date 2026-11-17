/*!
 * Copyright (c) 2026 Vendreith. All rights reserved (Original Engine & Code).
 * Licensing information: see LICENSE.md
 * Third-party notices: see THIRD_PARTY_NOTICES.md
 */

import { SPEED, ENTITY_ARCHETYPES } from './constants.js';
import {pursuitLimits} from './gameplay_balance.js';
import { blocked, collide } from './map.js';
import { findDynamicGridPath, getTerrainAt } from './levels/terrain.js';
import {inClassic} from './levels/classic_layout.js';
import {classicLineClear} from './levels/classic_navigation.js';

/**
 * Fast Grid A* pathfinder supporting dynamic map dimensions & outdoor plains.
 */
export function findGridPath(map, sx, sz, tx, tz) {
  return findDynamicGridPath(map, sx, sz, tx, tz);
}

/**
 * Autonomous AI Entity Controller for Solo & Co-op play.
 * Enforces strictly bounded local sight/hearing detection (NO global player omniscience),
 * visible-target prediction, collision-aware A* steering, bounded pursuit below human sprint,
 * post-LOS corridor SEARCH sweeping, and local pack noise alerting.
 */
export class EntityAIController {
  constructor(aiId = 'AI_ENT_0', archetype = ENTITY_ARCHETYPES[0]) {
    this.id = aiId;
    this.archetype = archetype || ENTITY_ARCHETYPES[0];
    this.kind = this.archetype.kind || 'bacteria';
    this.state = 'PATROL'; // PATROL | INVESTIGATE | CHASE | SEARCH | CARRY_TO_HOOK
    this.path = [];
    this.pathTimer = 0;
    this.lastPathGoal = null;
    this.targetPos = null;
    this.targetId = null;
    this.lastTargetSample = null;
    this.targetVel = { x: 0, z: 0 };
    this.investigatePos = null;
    this.investigateT = 0;
    this.searchPos = null;
    this.searchT = 0;
    this.lostT = 0;
    this.bloodlust = 0; // 0..1 bounded ordinary chase acceleration
    this.moveSpeed=0;this.hearCooldown=0;this.visibleTargetId=null;this.returnPos=null;
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
    this.moveSpeed=0;this.hearCooldown=0;this.visibleTargetId=null;this.returnPos=null;
    this.state = 'PATROL';
    this.path = [];
    this.pathTimer = 0;
    this.lastPathGoal = null;
    this.targetPos = null;
    this.targetId = null;
    this.lastTargetSample = null;
    this.targetVel = { x: 0, z: 0 };
    this.investigatePos = null;
    this.investigateT = 0;
    this.searchPos = null;
    this.searchT = 0;
    this.lostT = 0;
    this.bloodlust = 0;
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
    this.investigatePos = null;
    this.searchPos = null;
    this.bloodlust = 0;
    this.state = 'PATROL';
  }

  /**
   * Directs an idle/patrolling Entity to investigate a local disturbance (sprint breaths, tasks, pack howl, flares).
   * Respects water_only bounds so Poolrooms/Ocean Stalkers never leave water rules.
   */
  investigate(x, z, map = null, dur = 6.5) {
    if (this.state === 'CHASE' || this.state === 'SEARCH' || this.state === 'CARRY_TO_HOOK') return false;
    if ((this.archetype.behavior || '') === 'water_only' && map) {
      const surf = getTerrainAt(x, z, map, 0);
      if (!surf.inWater) return false;
    }
    this.investigatePos = { x, z };
    this.investigateT = Math.max(this.investigateT, dur);
    this.state = 'INVESTIGATE';
    this.path = [];
    this.pathTimer = 0;
    return true;
  }

  _updateTargetVelocity(target, dt) {
    if (!target) return;
    if (this.lastTargetSample && this.lastTargetSample.id === target.id && dt > 0.004) {
      const vx = (target.x - this.lastTargetSample.x) / dt;
      const vz = (target.z - this.lastTargetSample.z) / dt;
      // Clamp absurd teleport jumps while preserving real sprint/bhop velocity
      const mag = Math.hypot(vx, vz);
      const cap = 12.0;
      const fx = mag > cap ? (vx / mag) * cap : vx;
      const fz = mag > cap ? (vz / mag) * cap : vz;
      this.targetVel.x = this.targetVel.x * 0.55 + fx * 0.45;
      this.targetVel.z = this.targetVel.z * 0.55 + fz * 0.45;
    } else {
      const spd = target.spd || 0;
      this.targetVel.x = -Math.sin(target.yaw || 0) * spd;
      this.targetVel.z = -Math.cos(target.yaw || 0) * spd;
    }
    this.lastTargetSample = { id: target.id, x: target.x, z: target.z };
  }

  _computeInterceptGoal(aiPlayer, target, map) {
    const dx = target.x - aiPlayer.x;
    const dz = target.z - aiPlayer.z;
    const dist = Math.hypot(dx, dz);
    if (dist < 2.8) return { x: target.x, z: target.z };
    const leadT = Math.min(1.15, dist / 9.2);
    const predX = target.x + this.targetVel.x * leadT * 0.72;
    const predZ = target.z + this.targetVel.z * leadT * 0.72;
    // Only commit to predicted intercept if line from target -> predicted point isn't inside a solid wall
    if (!blocked(target.x, target.z, predX, predZ, map)) {
      return { x: predX, z: predZ };
    }
    const halfX = target.x + this.targetVel.x * leadT * 0.35;
    const halfZ = target.z + this.targetVel.z * leadT * 0.35;
    if (!blocked(target.x, target.z, halfX, halfZ, map)) {
      return { x: halfX, z: halfZ };
    }
    return { x: target.x, z: target.z };
  }

  update(dt, aiPlayer, players, map, callbacks) {
    if (!aiPlayer) return;
    const policy=pursuitLimits(this.archetype);this.hearCooldown=Math.max(0,this.hearCooldown-dt);this.visibleTargetId=null;
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

    const stealthScale = this.scrambleT > 0 ? 0.56 : 1.0;

    // Mimic / Still-Life / Smiler mechanic: direct active Flashlight beam slows & unsettles at close range
    if (this.archetype.beamSlows && !aiPlayer.carrying) {
      for (const s of aliveSurvs) {
        if (!s.fl || s.state !== 'ok') continue;
        const vx = aiPlayer.x - s.x;
        const vz = aiPlayer.z - s.z;
        const d = Math.hypot(vx, vz);
        if (d > 15.0 || d < 0.8) continue;
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
      this.bloodlust = 0;
      const carried = players[aiPlayer.carrying];
      if (!carried || carried.state !== 'carried') {
        aiPlayer.carrying = null;
        this.state = 'PATROL';
      }
    } else {
      let bestTarget = null;
      let bestScore = Infinity;
      let heard=null;
      const baseSight = (this.archetype.sightRange || 28) * stealthScale;
      const baseHear = (this.archetype.hearRange || 22) * stealthScale;

      for (const s of aliveSurvs) {
        let inWaterNow = false;
        let onSlideNow = false;
        if (waterOnly) {
          const tSurf = getTerrainAt(s.x, s.z, map, s.y);
          if (!tSurf.inWater) continue; // Poolrooms / Ocean Stalker STRICTLY ignores Survivors out of water!
          inWaterNow = true;
          onSlideNow = !!tSurf.onSlide;
        }
        const d = Math.hypot(s.x - aiPlayer.x, s.z - aiPlayer.z);
        const darkMod = behavior === 'stalk_dark' ? (s.fl ? 1.48 : 0.76) : 1.0;
        const stealthFactor = (s.crouch && !s.fl ? 0.64 : s.fl ? 1.18 : 1.0) * darkMod;
        const effSight = baseSight * stealthFactor;
        const isSprinting = (s.spd || 0) > 5.6;
        const isRunning = (s.spd || 0) > 4.2;
        const effHear = (s.crouch && behavior !== 'stalk_dark')
          ? (waterOnly ? baseHear * 0.25 : 0)
          : waterOnly
            ? (onSlideNow || isSprinting ? baseHear * 1.48 : baseHear * 0.65)
            : (isSprinting ? baseHear : isRunning ? baseHear * 0.68 : baseHear * 0.44);

        if (d > Math.max(effSight, effHear)) continue;

        const clearSight=!blocked(aiPlayer.x, aiPlayer.z, s.x, s.z, map);
        const los = d <= effSight && clearSight;
        // Hearing gives an approximate disturbance, never sight through walls.
        // Loud sprinting / heavy breathing or close corner proximity triggers sharp auditory lock-on
        const audible = (!s.crouch || (waterOnly && isRunning)) && (d <= effHear * (isSprinting ? 1.0 : 0.72)*(clearSight?1:.45));
        const nearSense = !s.crouch && d <= 4.4 && Math.abs((s.y || 0) - (aiPlayer.y || 0)) < 2.2;
        const nearDown = s.state === 'down' && d <= baseSight;
        if(audible&&(!heard||d<heard.distance))heard={x:Math.round(s.x/3)*3,z:Math.round(s.z/3)*3,distance:d};
        if (los && Math.abs((s.y||0)-(aiPlayer.y||0))<2.4) {
          const prio = (s.state === 'down' ? d * 0.72 : d) * (los ? 0.88 : 1.05);
          if (prio < bestScore) { bestScore = prio; bestTarget = s; }
        }
      }

      if (bestTarget) {
        const wasChasing = this.state === 'CHASE';
        if(!this.returnPos)this.returnPos={x:aiPlayer.x,z:aiPlayer.z};
        if (!wasChasing && callbacks?.onAggro) callbacks.onAggro(aiPlayer, bestTarget, this.archetype);
        this.state = 'CHASE';
        this.visibleTargetId=bestTarget.id;
        this.lostT = 0;
        this.searchT = 0;
        this.investigateT = 0;
        this.investigatePos = null;
        this.searchPos = null;
        this.targetId = bestTarget.id;
        this._updateTargetVelocity(bestTarget, dt);
        this.targetPos = { x: bestTarget.x, z: bestTarget.z };
        this.bloodlust = Math.min(1.0, this.bloodlust + dt * 0.165); // 0 -> 1 in ~6s continuous chase
      } else if (this.state === 'CHASE' && this.targetPos) {
        this.lostT += dt * (waterOnly ? 1.9 : 1.0);
        const maxLose = waterOnly ? 2.4 : policy.loseTime;
        const distToLast = Math.hypot(this.targetPos.x - aiPlayer.x, this.targetPos.z - aiPlayer.z);
        if (distToLast < 2.2 && !waterOnly) {
          // Transition to active corridor SEARCH along target's last known momentum vector!
          const vMag = Math.hypot(this.targetVel.x, this.targetVel.z);
          const dirX = vMag > 0.4 ? this.targetVel.x / vMag : -Math.sin(aiPlayer.yaw || 0);
          const dirZ = vMag > 0.4 ? this.targetVel.z / vMag : -Math.cos(aiPlayer.yaw || 0);
          const probeX = this.targetPos.x + dirX * 4.5;
          const probeZ = this.targetPos.z + dirZ * 4.5;
          this.searchPos = !blocked(this.targetPos.x, this.targetPos.z, probeX, probeZ, map)
            ? { x: probeX, z: probeZ }
            : { x: this.targetPos.x + dirX * 4.2, z: this.targetPos.z + dirZ * 4.2 };
          this.searchT = 4.6;
          this.state = 'SEARCH';
          this.targetPos = null;
          this.targetId = null;
          this.path = [];
        } else if (this.lostT >= maxLose || distToLast < 2.0) {
          this.state = 'PATROL';
          this.targetPos = null;
          this.targetId = null;
          this.lostT = 0;
          this.bloodlust = Math.max(0, this.bloodlust - 0.5);
        }
      } else if (this.state === 'SEARCH' && this.searchPos) {
        this.searchT -= dt;
        this.bloodlust = Math.max(0, this.bloodlust - dt * 0.14);
        const dSearch = Math.hypot(this.searchPos.x - aiPlayer.x, this.searchPos.z - aiPlayer.z);
        if (this.searchT <= 0 || dSearch < 2.0) {
          this.state = 'PATROL';
          this.searchPos = null;
          this.searchT = 0;
          this.lostT = 0;
        }
      } else if (this.state === 'INVESTIGATE' && this.investigatePos) {
        this.investigateT -= dt;
        this.bloodlust = Math.max(0, this.bloodlust - dt * 0.12);
        const dInv = Math.hypot(this.investigatePos.x - aiPlayer.x, this.investigatePos.z - aiPlayer.z);
        if (this.investigateT <= 0 || dInv < 2.2) {
          this.state = 'PATROL';
          this.investigatePos = null;
          this.investigateT = 0;
        }
      } else {
        this.state = 'PATROL';
        this.bloodlust = Math.max(0, this.bloodlust - dt * 0.18);
      }
      if(!bestTarget&&heard&&this.hearCooldown<=0&&['PATROL','INVESTIGATE'].includes(this.state)){this.investigate(heard.x,heard.z,map,3);this.hearCooldown=2.2;}
    }

    aiPlayer.aiState = this.state;

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
        const carried = players[aiPlayer.carrying];
        if (carried) carried.state = 'down';
        aiPlayer.carrying = null;
        this.state = 'PATROL';
      }
    } else if (this.state === 'CHASE' && this.targetPos) {
      const targ = this.targetId ? players[this.targetId] : null;
      goal = (targ && this.visibleTargetId===targ.id)
        ? this._computeInterceptGoal(aiPlayer, targ, map)
        : this.targetPos;
    } else if (this.state === 'SEARCH' && this.searchPos) {
      goal = this.searchPos;
    } else if (this.state === 'INVESTIGATE' && this.investigatePos) {
      goal = this.investigatePos;
    } else {
      if(this.returnPos&&Math.hypot(this.returnPos.x-aiPlayer.x,this.returnPos.z-aiPlayer.z)<1.5)this.returnPos=null;
      const route = this.returnPos?[this.returnPos]:(this.patrolRoute.length >= 2 ? this.patrolRoute : map.TASKS);
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
      if (targ.state === 'down' && dist < 1.65 && !aiPlayer.carrying && !blocked(aiPlayer.x,aiPlayer.z,targ.x,targ.z,map)) {
        targ.state = 'carried';
        aiPlayer.carrying = targ.id;
        this.path = [];
        this.bloodlust = 0;
        if (callbacks?.onPickup) callbacks.onPickup(aiPlayer, targ);
      } else if (targ.state === 'ok' && dist < policy.attackRange && this.attackCD <= 0 && !blocked(aiPlayer.x,aiPlayer.z,targ.x,targ.z,map) && Math.abs((targ.y || 0) - (aiPlayer.y || 0)) < 1.25) {
        this.attackCD = policy.attackCooldown;
        this.slowT = 0.85;
        this.swingT = 1.0;
        this.bloodlust *= 0.35; // keep fair escape breathing room after connecting a blow
        if (callbacks?.onHit) callbacks.onHit(aiPlayer, targ);
      }
    }

    // Ordinary pursuit is capped independently of animation and old sublevel configs.
    const isSmiler = this.kind === 'smiler';
    const isStealer = this.kind === 'skin_stealer';
    const isWire = this.kind === 'wire_stalker';

    const chaseStart = policy.start;
    const chaseCap = policy.max;
    const rampedChase = chaseStart + (chaseCap - chaseStart) * this.bloodlust;
    const patrolBase = this.archetype.patrolSpd || (SPEED.KILLER_BASE * 0.85);

    let spd = aiPlayer.carrying
      ? SPEED.KILLER_CARRY
      : this.slowT > 0
        ? SPEED.KILLER_SLOW
        : this.state === 'CHASE'
          ? rampedChase
          : this.state === 'SEARCH'
            ? Math.min(chaseCap, patrolBase * 1.48)
            : this.state === 'INVESTIGATE'
              ? Math.min(chaseStart * 0.92, patrolBase * 1.28)
              : patrolBase;

    spd=Math.min(chaseCap,spd);
    if (this.beamSlowT > 0) spd *= isSmiler ? 0.28 : 0.40;

    this.moveSpeed=Math.max(0,Math.min(chaseCap,this.moveSpeed+Math.max(-policy.braking*dt,Math.min(policy.acceleration*dt,spd-this.moveSpeed))));
    spd=this.moveSpeed;
    if (goal) {
      const classic=inClassic(map.classic,aiPlayer.x,aiPlayer.z);
      const clearRoute=(x,z)=>!blocked(aiPlayer.x,aiPlayer.z,x,z,map)&&(!classic||classicLineClear(map.classic,aiPlayer.x,aiPlayer.z,x,z));
      const canSeeGoal = clearRoute(goal.x,goal.z);
      let steerX = goal.x, steerZ = goal.z;

      if (!canSeeGoal) {
        this.pathTimer -= dt;
        const goalShifted = !this.lastPathGoal || Math.hypot(goal.x - this.lastPathGoal.x, goal.z - this.lastPathGoal.z) > 2.6;
        if (this.pathTimer <= 0 || !this.path.length || (this.state === 'CHASE' && goalShifted && this.pathTimer < 0.14)) {
          this.path = findGridPath(map, aiPlayer.x, aiPlayer.z, goal.x, goal.z);
          this.lastPathGoal = { x: goal.x, z: goal.z };
          this.pathTimer = this.state === 'CHASE'
            ? (isWire ? 0.18 : 0.22)
            : (this.state === 'SEARCH' || this.state === 'INVESTIGATE' ? 0.28 : 0.50);
        }
        while (this.path.length > 1 && Math.hypot(this.path[0][0] - aiPlayer.x, this.path[0][1] - aiPlayer.z) < (classic?.22:1.25)) {
          this.path.shift();
        }
        // String-pulling: skip redundant intermediate zig-zag grid nodes if direct corridor sight is clear!
        while (this.path.length >= 2 && clearRoute(this.path[1][0],this.path[1][1])) {
          this.path.shift();
        }
        if (this.path.length) {
          steerX = this.path[0][0];
          steerZ = this.path[0][1];
        }
      } else {
        this.path = [];
      }

      const dx = steerX - aiPlayer.x;
      const dz = steerZ - aiPlayer.z;
      const len = Math.hypot(dx, dz);
      if (len > 0.05) {
        const vx = (dx / len) * spd;
        const vz = (dz / len) * spd;
        const [nx, nz] = collide(aiPlayer.x + vx * dt, aiPlayer.z + vz * dt, 0.42, map, false, 0);
        const movedDistance=Math.hypot(nx-aiPlayer.x,nz-aiPlayer.z);
        aiPlayer.x = nx;
        aiPlayer.z = nz;
        aiPlayer.yaw = Math.atan2(-vx, -vz);
        aiPlayer.spd = movedDistance/Math.max(.001,dt);
      } else {
        aiPlayer.spd = 0;
      }

      // Snappier unstick safeguard with perpendicular corner-slip nudge
      const moved = Math.hypot(aiPlayer.x - this.lastX, aiPlayer.z - this.lastZ);
      this.lastX = aiPlayer.x;
      this.lastZ = aiPlayer.z;
      if (moved < 0.025 * dt && len > 0.9) {
        this.stuckT += dt;
        if (this.stuckT > 0.55) {
          this.stuckT = 0;
          const sideSign = ((Math.floor(aiPlayer.x + aiPlayer.z) & 1) === 0) ? 1 : -1;
          const perpX = (-dz / Math.max(0.1, len)) * sideSign;
          const perpZ = (dx / Math.max(0.1, len)) * sideSign;
          const [sx, sz] = collide(aiPlayer.x, aiPlayer.z, 0.42, map, false, 0);
          aiPlayer.x = sx;
          aiPlayer.z = sz;
          this.path = [];
          this.pathTimer = 0;
          if (this.state === 'PATROL' && this.patrolRoute.length) {
            this.patrolIdx = (this.patrolIdx + 1) % this.patrolRoute.length;
          }
        }
      } else {
        this.stuckT = 0;
      }
    }
  }
}
