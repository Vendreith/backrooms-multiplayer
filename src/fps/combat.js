/* Copyright (c) 2026 Vendreith. Host owns ammunition, timing and hit results. */
import { WEAPONS, makeLoadout, ammoKeys, weaponAmmo } from './weapon_data.js';
export { WEAPONS, makeLoadout, weaponAmmo } from './weapon_data.js';
export class CombatAuthority {
  constructor({ emit, trace, targets, peaceful, now = () => performance.now() / 1000 }) {
    Object.assign(this, { emit, trace, targets, peaceful, now });
  }
  ensure(p) {
    const w = p.weapon || (p.weapon = makeLoadout());
    w.relicMag ??= 6; w.relicReserve ??= 30; w.cylinderIndex ??= 0;
    return w;
  }
  tick(p) {
    const w = this.ensure(p), now = this.now();
    w.reloadRemaining = Math.max(0,(w.reloadEnd||0)-now);
    if (w.reloadEnd && (p.state !== 'ok' || p.role !== 's' || (w.reloadWeapon && w.reloadWeapon !== w.equipped))) { w.reloadEnd = 0; w.reloadWeapon = null; w.revision++; }
    if (w.reloadEnd && now >= w.reloadEnd) {
      const weapon = w.reloadWeapon || 'deagle', def = WEAPONS[weapon], [mag, reserve] = ammoKeys(weapon);
      const n = Math.min(def.capacity - w[mag], w[reserve]);
      w[mag] += n; w[reserve] -= n; w.reloadEnd = 0; w.reloadWeapon = null; w.revision++;
      w.reloadRemaining = 0;
      this.emit({ ev: 'weapon', kind: 'loaded', id: p.id, weapon: { ...w } });
    }
  }
  action(p, msg) {
    if (p.role !== 's' || p.state !== 'ok' || p.carrying) return false;
    this.tick(p);
    const w = this.ensure(p), now = this.now();
    if (!Number.isSafeInteger(msg.seq) || msg.seq <= w.sequence || msg.seq > w.sequence + 10000) return false;
    w.sequence = msg.seq;
    if (msg.act === 'weaponEquip') {
      if (!Object.hasOwn(WEAPONS, msg.weapon)) return false;
      if (w.equipped === msg.weapon) return false;
      w.equipped = msg.weapon; w.reloadEnd = 0; w.reloadWeapon = null; w.readyAt = now + (WEAPONS[msg.weapon].draw || .48); w.revision++;
      this.emit({ ev: 'weapon', kind: 'equip', id: p.id, weapon: { ...w } });
      return true;
    }
    if (now < w.readyAt || w.equipped === 'none') return false;
    if (msg.act === 'weaponReload') {
      const def = WEAPONS[w.equipped], ammo = weaponAmmo(w);
      if (!def.capacity || w.reloadEnd || ammo.mag >= def.capacity || ammo.reserve <= 0) return false;
      w.reloadEmpty = ammo.mag === 0; w.reloadWeapon = w.equipped;
      w.reloadRemaining = w.reloadEmpty ? def.reloadEmpty : def.reload;
      w.reloadEnd = now + w.reloadRemaining; w.revision++;
      this.emit({ ev: 'weapon', kind: 'reload', id: p.id, weapon: { ...w } });
      return true;
    }
    if (msg.act !== 'weaponFire' || w.reloadEnd || now < w.nextFire) return false;
    const def = WEAPONS[w.equipped];
    if (def.capacity && weaponAmmo(w).mag <= 0) return false;
    // Aim must agree with the last accepted player orientation; a client never supplies a hit.
    if (![msg.yaw, msg.pitch].every(Number.isFinite) || Math.abs(msg.pitch) > 1.46) return false;
    const yawDelta = Math.atan2(Math.sin(msg.yaw - p.yaw), Math.cos(msg.yaw - p.yaw));
    if (Math.abs(yawDelta) > .45 || Math.abs(msg.pitch - p.pitch) > .45) return false;
    if (def.capacity) w[ammoKeys(w.equipped)[0]]--;
    if (w.equipped === 'relic') w.cylinderIndex = (w.cylinderIndex + 1) % 6;
    w.nextFire = now + def.interval; w.revision++;
    const cp = Math.cos(msg.pitch);
    const origin = { x: p.x, y: (p.y || 0) + (p.crouch ? .92 : 1.62), z: p.z };
    const dir = { x: -Math.sin(msg.yaw) * cp, y: Math.sin(msg.pitch), z: -Math.cos(msg.yaw) * cp };
    const impact = this.trace(p, origin, dir, def.range);
    let target = null, distance = impact?.distance ?? def.range;
    if (!this.peaceful(p.levelId)) {
      for (const candidate of this.targets()) {
        if (candidate.role !== 'k' || candidate.state !== 'ok' || candidate.levelId !== p.levelId) continue;
        const dx = candidate.x - origin.x, dy = (candidate.y || 0) + 1.05 - origin.y, dz = candidate.z - origin.z;
        const along = dx * dir.x + dy * dir.y + dz * dir.z;
        const radius = w.equipped === 'butterfly' ? .8 : .6;
        const side2 = dx * dx + dy * dy + dz * dz - along * along;
        if (along > 0 && side2 < radius * radius) {
          const entry = Math.max(0, along - Math.sqrt(radius * radius - side2));
          if (entry < distance) { target = candidate; distance = entry; }
        }
      }
    }
    // Survival tools briefly stagger existing entities; no friendly fire, spawned enemies or altered objectives.
    if (target) target.weaponStunUntil = now + (def.capacity ? .85 : .4);
    const hit = target ? { x: origin.x + dir.x * distance, y: origin.y + dir.y * distance, z: origin.z + dir.z * distance, target: target.id } : impact;
    this.emit({ ev: 'weapon', kind: 'fire', id: p.id, levelId: p.levelId, seq: msg.seq, weapon: { ...w }, origin, dir, hit });
    return true;
  }
}

/** Slab intersection against authoritative collision boxes, with an actual 3D ray. */
export function rayBox(o, d, b, range) {
  let lo = 0, hi = range;
  for (const [axis, min, max] of [['x', b.x0, b.x1], ['y', b.minY ?? b.y0 ?? b.crawlBaseY ?? 0, b.maxY ?? b.y1 ?? 5], ['z', b.z0, b.z1]]) {
    if (Math.abs(d[axis]) < 1e-8) { if (o[axis] < min || o[axis] > max) return null; continue; }
    let a = (min - o[axis]) / d[axis], c = (max - o[axis]) / d[axis];
    if (a > c) [a, c] = [c, a];
    lo = Math.max(lo, a); hi = Math.min(hi, c);
    if (hi < lo) return null;
  }
  return lo;
}
