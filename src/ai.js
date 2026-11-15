import { N, C, SPEED, ENTITY_ARCHETYPES } from './constants.js';
import { blocked, collide } from './map.js';

/**
 * Fast Grid A* pathfinder respecting hEdges, vEdges, and pillar cells in genMap().
 */
export function findGridPath(map, sx, sz, tx, tz) {
  const clampCell = (v) => Math.max(0, Math.min(N - 1, Math.floor(v / C)));
  const sr = clampCell(sz), sc = clampCell(sx);
  const tr = clampCell(tz), tc = clampCell(tx);
  if (sr === tr && sc === tc) return [[tx, tz]];

  const total = N * N;
  const gScore = new Float32Array(total).fill(1e9);
  const fScore = new Float32Array(total).fill(1e9);
  const parent = new Int32Array(total).fill(-1);
  const closed = new Uint8Array(total);

  const idx = (r, c) => r * N + c;
  const startId = idx(sr, sc);
  const goalId = idx(tr, tc);

  gScore[startId] = 0;
  fScore[startId] = Math.abs(tr - sr) + Math.abs(tc - sc);

  // Fast binary min-heap so pathfinding across 94x94 (8836 nodes) completes in <0.4ms
  const heap = [];
  const pushHeap = (node) => {
    heap.push(node);
    let i = heap.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (fScore[heap[p]] <= fScore[heap[i]]) break;
      const tmp = heap[p]; heap[p] = heap[i]; heap[i] = tmp;
      i = p;
    }
  };
  const popHeap = () => {
    const top = heap[0];
    const last = heap.pop();
    if (heap.length > 0) {
      heap[0] = last;
      let i = 0;
      const len = heap.length;
      while (true) {
        let s = i;
        const l = (i << 1) + 1;
        const r = l + 1;
        if (l < len && fScore[heap[l]] < fScore[heap[s]]) s = l;
        if (r < len && fScore[heap[r]] < fScore[heap[s]]) s = r;
        if (s === i) break;
        const tmp = heap[i]; heap[i] = heap[s]; heap[s] = tmp;
        i = s;
      }
    }
    return top;
  };
  pushHeap(startId);

  const { hEdges, vEdges, cellSolid } = map;
  let reached = startId;
  let bestH = 1e9;
  let expanded = 0;

  while (heap.length > 0 && expanded++ < 8500) {
    const cid = popHeap();
    if (closed[cid]) continue;
    closed[cid] = 1;

    const r = (cid / N) | 0;
    const c = cid % N;
    const h = Math.abs(tr - r) + Math.abs(tc - c);
    if (h < bestH) { bestH = h; reached = cid; }
    if (cid === goalId) break;

    const tryNeighbor = (nr, nc) => {
      if (nr < 0 || nr >= N || nc < 0 || nc >= N) return;
      if (cellSolid[nr][nc]) return;
      const nid = idx(nr, nc);
      if (closed[nid]) return;
      const ng = gScore[cid] + 1;
      if (ng < gScore[nid]) {
        gScore[nid] = ng;
        fScore[nid] = ng + Math.abs(tr - nr) + Math.abs(tc - nc);
        parent[nid] = cid;
        pushHeap(nid);
      }
    };

    const passable = (v) => v === 0 || v === 3;
    if (r > 0 && passable(hEdges[r][c])) tryNeighbor(r - 1, c);
    if (r < N - 1 && passable(hEdges[r + 1][c])) tryNeighbor(r + 1, c);
    if (c > 0 && passable(vEdges[r][c])) tryNeighbor(r, c - 1);
    if (c < N - 1 && passable(vEdges[r][c + 1])) tryNeighbor(r, c + 1);
  }

  const path = [];
  let p = closed[goalId] ? goalId : reached;
  while (p !== -1 && p !== startId) {
    const r = (p / N) | 0;
    const c = p % N;
    path.push([(c + 0.5) * C, (r + 0.5) * C]);
    p = parent[p];
  }
  path.reverse();
  if (path.length && closed[goalId]) path[path.length - 1] = [tx, tz];
  return path;
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

    const aliveSurvs = [];
    for (const p of Object.values(players)) {
      if (p.role === 's' && (p.state === 'ok' || p.state === 'down')) {
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
        const d = Math.hypot(s.x - aiPlayer.x, s.z - aiPlayer.z);
        const stealthFactor = s.crouch && !s.fl ? 0.62 : s.fl ? 1.12 : 1.0;
        const effSight = baseSight * stealthFactor;
        const effHear = s.crouch ? 0 : (s.spd > 5.8 ? baseHear : baseHear * 0.48);
        if (d > Math.max(effSight, effHear)) continue;

        const los = d <= effSight && !blocked(aiPlayer.x, aiPlayer.z, s.x, s.z, map);
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
        this.lostT += dt;
        const maxLose = this.archetype.loseTime || 4.5;
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
      for (const h of map.HOOKS) {
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
