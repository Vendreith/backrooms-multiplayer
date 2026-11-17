/*!
 * Copyright (c) 2026 Vendreith (Original Code & Procedural Implementation).
 * Adapted Backrooms level/entity concepts & lore: licensed under CC BY-SA 3.0.
 * Licensing & attribution: see LICENSE.md, ATTRIBUTION.md, and THIRD_PARTY_NOTICES.md
 */

// ============================================================
// LEVEL 37: THE POOLROOMS V4 — Human-scale Architectural Labyrinth
// Compact Interconnected Ceramic Chambers, Arches, Columns,
// Submerged Staircases, Minimalist Water Chutes & Pump Loop
// ============================================================

import { POOL_ZONE_DEFS } from './poolrooms_zones.js';
export { POOL_ZONE_DEFS } from './poolrooms_zones.js';
import { buildPoolroomsV4World } from './poolrooms_v4_world.js';
import { blocked } from '../map.js';

export function getPoolroomsZoneAt(x, z, map) {
  const zones = map?.POOL_ZONES || POOL_ZONE_DEFS;
  const cell=map?._poolCellGrid?.queryNear(x,z,0).find(c=>c.art&&x>=c.x0&&x<=c.x1&&z>=c.z0&&z<=c.z1);
  if(cell){const authored=zones.find(q=>q.id===cell.zoneId);if(authored)return authored;}
  for (let i = 0; i < zones.length; i++) {
    const zDef = zones[i];
    const b = zDef.bounds;
    if (x >= b.x0 && x <= b.x1 && z >= b.z0 && z <= b.z1) {
      return zDef;
    }
  }
  let best = zones[0];
  let bestD = Infinity;
  for (let i = 0; i < zones.length; i++) {
    const dx = x - zones[i].center.x;
    const dz = z - zones[i].center.z;
    const d2 = dx * dx + dz * dz;
    if (d2 < bestD) {
      bestD = d2;
      best = zones[i];
    }
  }
  return best;
}

/** Human-scale V4 cells replace both legacy zone-sized geometry builders. */
export function buildPoolroomsWorld(options) {
  return buildPoolroomsV4World({ ...options, zones: POOL_ZONE_DEFS.map(z => ({ ...z, bounds: { ...z.bounds } })) });
}

const _evState = {
  lastZoneId: null,
  visitedZones: new Set(),
  nextHydroBoomAt: 14,
  nextSplashCueAt: 20,
  lastDonePumps: -1,
  wasMoving: false,
  stopFollowAt: 0,
  lastFollowTriggerAt: -30,
  nextPhantomStepAt: 18,
  nextPhantomObjAt: 26,
  nextPhantomAquaAt: 22,
  dimLightIdx: -1,
  dimUntil: 0,
  prevYaw: 0
};

export function resetPoolroomsEventsState() {
  _evState.lastZoneId = null;
  _evState.visitedZones.clear();
  _evState.nextHydroBoomAt = 14;
  _evState.nextSplashCueAt = 20;
  _evState.lastDonePumps = -1;
  _evState.wasMoving = false;
  _evState.stopFollowAt = 0;
  _evState.lastFollowTriggerAt = -30;
  _evState.nextPhantomStepAt = 18;
  _evState.nextPhantomObjAt = 26;
  _evState.nextPhantomAquaAt = 22;
  _evState.dimLightIdx = -1;
  _evState.dimUntil = 0;
  _evState.prevYaw = 0;
}

function _dimNearbyPoolLight(elapsed, me, map, dur = 1.6) {
  if (!map?.LIGHTS?.length) return;
  if (_evState.dimLightIdx >= 0 && map.LIGHTS[_evState.dimLightIdx]) {
    map.LIGHTS[_evState.dimLightIdx]._dimFactor = 1.0;
  }
  const fwX = -Math.sin(me.yaw || 0);
  const fwZ = -Math.cos(me.yaw || 0);
  let bestIdx = -1;
  let bestScore = Infinity;
  for (let i = 0; i < map.LIGHTS.length; i++) {
    const l = map.LIGHTS[i];
    const dx = l.x - me.x;
    const dz = l.z - me.z;
    const dist = Math.hypot(dx, dz);
    if (dist < 8 || dist > 28) continue;
    const dot = (dx * fwX + dz * fwZ) / Math.max(0.01, dist);
    // Prefer lights off to the side or behind the player for subtle unease
    const score = dist + dot * 12;
    if (score < bestScore) {
      bestScore = score;
      bestIdx = i;
    }
  }
  if (bestIdx >= 0) {
    map.LIGHTS[bestIdx]._dimFactor = 0.28;
    _evState.dimLightIdx = bestIdx;
    _evState.dimUntil = elapsed + dur;
  }
}

export function updatePoolroomsWorldEvents(dt, elapsed, me, map, world, audio, showCueCb) {
  if (!me || !map?.POOL_ZONES) return;

  if (_evState.dimLightIdx >= 0 && elapsed >= _evState.dimUntil) {
    const prevL = map.LIGHTS?.[_evState.dimLightIdx];
    if (prevL) prevL._dimFactor = 1.0;
    _evState.dimLightIdx = -1;
  }

  const zone = getPoolroomsZoneAt(me.x, me.z, map);
  if (zone && zone.id !== _evState.lastZoneId) {
    _evState.lastZoneId = zone.id;
    if (!_evState.visitedZones.has(zone.id)) {
      _evState.visitedZones.add(zone.id);
      if (typeof showCueCb === 'function' && _evState.visitedZones.size > 1) {
        showCueCb(`${zone.name}`);
      }
      if (audio?.playPoolZoneArrival) audio.playPoolZoneArrival(zone.mood);
    }
  }

  if (elapsed > _evState.nextHydroBoomAt) {
    _evState.nextHydroBoomAt = elapsed + 22 + Math.random() * 16;
    if (audio?.playPoolHydroBoom) {
      const angle = Math.random() * Math.PI * 2;
      audio.playPoolHydroBoom({
        x: me.x + Math.cos(angle) * 24,
        y: (me.y || 0) - 2.5,
        z: me.z + Math.sin(angle) * 24
      });
    }
  }

  if (elapsed > _evState.nextSplashCueAt) {
    _evState.nextSplashCueAt = elapsed + 16 + Math.random() * 18;
    if (audio?.playWaterSplash && (zone?.waterTemp > 0.35 || Math.random() < 0.45)) {
      const angle = Math.random() * Math.PI * 2;
      audio.playWaterSplash({
        x: me.x + Math.cos(angle) * 18,
        y: -0.2,
        z: me.z + Math.sin(angle) * 18
      }, 0.28);
    }
  }

  // 3D Spatial Psychological Horror Tension Director (strictly local illusions)
  const spd = me.spd || 0;
  const yaw = me.yaw || 0;
  const movingNow = spd > 0.85;
  const highTensionZone = (
    zone?.musicLayer === 'dark_submerged' ||
    zone?.musicLayer === 'silent_horror' ||
    zone?.musicLayer === 'industrial_nexus' ||
    zone?.acousticPreset === 'small_corridor' ||
    zone?.acousticPreset === 'underwater_passage'
  );

  // Reactive phantom footsteps following slightly behind movement, stopping ~0.35s after player halts
  if (movingNow && !_evState.wasMoving && elapsed - _evState.lastFollowTriggerAt > 24) {
    const prob = highTensionZone ? 0.68 : 0.36;
    if (Math.random() < prob && audio?.playPhantomFootsteps) {
      const dist = 7.5 + Math.random() * 3.5;
      const side = (Math.random() - 0.5) * 3.0;
      const px = me.x + Math.sin(yaw) * dist + Math.cos(yaw) * side;
      const pz = me.z + Math.cos(yaw) * dist - Math.sin(yaw) * side;
      const occluded = blocked(px, pz, me.x, me.z, map);
      const style = (zone?.waterTemp > 0.34 || (me.y || 0) < 0.05) ? 'shallow_wade' : 'wet_slap';
      audio.playPhantomFootsteps({ x: px, y: me.y || 0, z: pz }, style, occluded);
      _evState.lastFollowTriggerAt = elapsed;
    }
  } else if (spd < 0.3 && _evState.wasMoving) {
    _evState.stopFollowAt = elapsed + 0.32 + Math.random() * 0.14;
  }
  if (_evState.stopFollowAt > 0 && elapsed >= _evState.stopFollowAt) {
    _evState.stopFollowAt = 0;
    audio?.stopPhantomFootsteps?.();
  }
  _evState.wasMoving = movingNow;
  _evState.prevYaw = yaw;

  // Scheduled distant phantom footsteps behind walls/corridors
  if (elapsed > _evState.nextPhantomStepAt) {
    _evState.nextPhantomStepAt = elapsed + (highTensionZone ? 16 : 22) + Math.random() * 14;
    if (audio?.playPhantomFootsteps) {
      const ang = yaw + Math.PI * (0.45 + Math.random() * 1.1);
      const dist = 10 + Math.random() * 12;
      const sx = me.x + Math.sin(ang) * dist;
      const sz = me.z + Math.cos(ang) * dist;
      const styles = ['wet_slap', 'shallow_wade', 'overhead_echo', 'hurried_fade'];
      const style = styles[Math.floor(Math.random() * styles.length)];
      const py = style === 'overhead_echo' ? (me.y || 0) + 4.2 : (me.y || 0);
      audio.playPhantomFootsteps({ x: sx, y: py, z: sz }, style, blocked(sx, sz, me.x, me.z, map));
    }
  }

  // Scheduled subtle object/architecture noises
  if (elapsed > _evState.nextPhantomObjAt) {
    _evState.nextPhantomObjAt = elapsed + (highTensionZone ? 22 : 28) + Math.random() * 18;
    if (audio?.playPhantomObjectMove) {
      const ang = Math.random() * Math.PI * 2;
      const dist = 11 + Math.random() * 13;
      const ox = me.x + Math.cos(ang) * dist;
      const oz = me.z + Math.sin(ang) * dist;
      const kinds = ['chair_scrape', 'ladder_rattle', 'pole_clatter', 'hatch_thud', 'pipe_knock'];
      const kind = kinds[Math.floor(Math.random() * kinds.length)];
      audio.playPhantomObjectMove({ x: ox, y: me.y || 0, z: oz }, kind, blocked(ox, oz, me.x, me.z, map));
    }
  }

  // Scheduled phantom aquatic splash + water surface ripple on empty basins
  if (elapsed > _evState.nextPhantomAquaAt) {
    _evState.nextPhantomAquaAt = elapsed + (highTensionZone ? 18 : 24) + Math.random() * 16;
    let rx = me.x + (Math.random() - 0.5) * 24;
    let rz = me.z + (Math.random() - 0.5) * 24;
    if (map.WATER_RECTS?.length) {
      let bestWR = null;
      let bestD = Infinity;
      for (const w of map.WATER_RECTS) {
        const cx = (w.x0 + w.x1) * 0.5;
        const cz = (w.z0 + w.z1) * 0.5;
        const d = Math.hypot(cx - me.x, cz - me.z);
        if (d >= 8 && d <= 36 && d < bestD) {
          bestD = d;
          bestWR = w;
        }
      }
      if (bestWR) {
        const padX = Math.min(2.0, (bestWR.x1 - bestWR.x0) * 0.25);
        const padZ = Math.min(2.0, (bestWR.z1 - bestWR.z0) * 0.25);
        rx = bestWR.x0 + padX + Math.random() * Math.max(0.5, (bestWR.x1 - bestWR.x0) - padX * 2);
        rz = bestWR.z0 + padZ + Math.random() * Math.max(0.5, (bestWR.z1 - bestWR.z0) - padZ * 2);
      }
    }
    const occluded = blocked(rx, rz, me.x, me.z, map);
    const aqKinds = ['gentle_submerge', 'swim_strokes', 'bubble_trail', 'bridge_drip'];
    const kind = aqKinds[Math.floor(Math.random() * aqKinds.length)];
    audio?.playPhantomAquaticMove?.({ x: rx, y: -0.25, z: rz }, kind, occluded);
    world?.setPhantomRipple?.(rx, rz, elapsed + 3.2);
    if (highTensionZone || Math.random() < 0.45) {
      _dimNearbyPoolLight(elapsed, me, map, 1.35 + Math.random() * 1.1);
    }
  } else if ((zone?.mood === 'damp_maintenance' || zone?.musicLayer === 'silent_horror') && _evState.dimLightIdx < 0 && Math.random() < dt * 0.28) {
    _dimNearbyPoolLight(elapsed, me, map, 1.2 + Math.random() * 0.9);
  }

  if (map.PUMPS) {
    const doneCount = map.PUMPS.filter((pm) => pm.done).length;
    if (doneCount >= map.PUMPS.length) map.exitsOpen = true;
    if (_evState.lastDonePumps >= 0 && doneCount > _evState.lastDonePumps) {
      if (typeof showCueCb === 'function') {
        showCueCb(
          doneCount >= map.PUMPS.length
            ? 'CẢ 3 TRẠM BƠM ĐÃ HOẠT ĐỘNG — Cổng Cống Khu J đang mở!'
            : `Đã kích hoạt Trạm Bơm (${doneCount}/${map.PUMPS.length})`
        );
      }
      if (audio?.playPumpActivation) {
        audio.playPumpActivation({ x: me.x, y: me.y || 0, z: me.z }, doneCount >= map.PUMPS.length);
      }
    }
    _evState.lastDonePumps = doneCount;
  }
}
