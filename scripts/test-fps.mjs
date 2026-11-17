import assert from 'node:assert/strict';
import { MovementAssist, MOTION } from '../src/fps/movement.js';
import { WeaponAnimation } from '../src/fps/animation.js';
import { CombatAuthority, rayBox } from '../src/fps/combat.js';
import { MovementGuard } from '../src/fps/network_movement.js';
import { HumanCamera } from '../src/fps/camera_motion.js';
const results = [];
function test(name, fn) { fn(); results.push(name); }
const moving = overrides => ({ grounded: true, jump: false, autoHop: false, crouch: false, canStand: true, canAct: true, sprint: true, sprintCap: 7.4, speed: 7.4, wx: 0, wz: -1, wish: 1, surface: 'tile', water: false, ...overrides });
test('30-second hops: fixed +.45, no accumulation; 30/60/144 Hz and diagonals', () => {
  for (const hz of [30, 60, 144]) for (const diagonal of [false, true]) {
    const m = new MovementAssist(); let y = 0, vy = 0, maximum = 0;
    for (let f = 0; f < hz * 30; f++) {
      const grounded = y <= .001 && vy <= 0;
      const r = m.step(1 / hz, moving({ grounded, jump: true, autoHop: true, wx: diagonal ? Math.SQRT1_2 : 0, wz: diagonal ? -Math.SQRT1_2 : -1 }));
      if (r.jumped) vy = 7.1;
      vy -= 21 / hz; y += vy / hz; if (y < 0) { y = 0; vy = 0; }
      maximum = Math.max(maximum, Math.hypot(m.vx, m.vz)); assert(maximum <= 7.85 + 1e-9);
    }
    assert(m.jumps >= 35); assert(maximum > 7.84); console.log(JSON.stringify({ hz, diagonal, jumps: m.jumps, maxSpeed: maximum }));
  }
});
test('buffer, coyote, no double jump, auto-hop opt-in', () => {
  const m = new MovementAssist(); m.step(.016, moving({ jump: false }));
  assert(m.step(.08, moving({ grounded: false, jump: true })).jumped);
  assert(!m.step(.016, moving({ grounded: false, jump: true })).jumped);
  m.reset(); m.step(.016, moving({ grounded: false, jump: true }));
  assert(m.step(.06, moving({ grounded: true, jump: false })).jumped);
  assert(m.step(.016, moving({ grounded: true, jump: true })).jumped); // a fresh press is distinct
  m.reset(); m.step(.016, moving({ jump: true }));
  m.coyote = 0; assert(!m.step(.016, moving({ grounded: false, jump: true })).jumped);
});
test('slide friction, limited steering, cooldown, clearance and jump cancel', () => {
  for (const surface of ['carpet', 'tile', 'metal', 'concrete', 'water']) {
    const m = new MovementAssist(); m.vz = -7.4;
    assert(m.step(1 / 60, moving({ crouch: true, surface, water: surface === 'water' })).sliding);
    assert(Math.hypot(m.vx, m.vz) < 7.4);
    const x = m.vx; m.step(.016, moving({ crouch: true, wx: 1, wz: 0, surface })); assert(Math.abs(m.vx - x) < .2);
    const r = m.step(.016, moving({ crouch: true, jump: true, surface })); assert(r.jumped && !r.sliding);
    assert(m.cooldown > 0);
    m.reset(); m.vz = -7.4; m.step(.016, moving({ crouch: true, surface }));
    assert(!m.step(.016, moving({ crouch: true, jump: true, canStand: false, surface })).jumped);
    for (let f = 0; f < 80; f++) m.step(.016, moving({ crouch: true, surface })); assert(!m.sliding);
  }
});
test('cosmetic transitions never touch ammunition; continuous loops recover', () => {
  for (const weapon of ['deagle', 'butterfly']) {
    const a = new WeaponAnimation(); a.equip(weapon); for (let i = 0; i < 80; i++) a.update(.016);
    a.inspect(true); for (let i = 0; i < 800; i++) { const p = a.update(.016, true); assert(Object.values(p).every(Number.isFinite)); }
    assert(a.cycle > 6); a.inspect(false); for (let i = 0; i < 120; i++) a.update(.016); assert.equal(a.state, 'IDLE');
    a.inspect(true); a.update(.3); assert(a.attack()); assert.equal(a.state, 'ATTACKING');
    for (let i = 0; i < 80; i++) a.update(.016); a.equip(weapon === 'deagle' ? 'butterfly' : 'deagle'); for (let i = 0; i < 100; i++) a.update(.016);
    a.equip('none'); for (let i = 0; i < 80; i++) a.update(.016); assert.equal(a.state, 'HOLSTERED');
  }
});
test('host ammo, replay rejection, fire cadence, timed reload and switch cancellation', () => {
  let time = 0; const events = [], p = { id: 'P', role: 's', state: 'ok', levelId: 'level37', x: 0, y: 0, z: 0, yaw: 0, pitch: 0 };
  const host = new CombatAuthority({ now: () => time, emit: e => events.push(e), trace: () => null, targets: () => [], peaceful: () => true });
  assert(host.action(p, { act: 'weaponEquip', weapon: 'deagle', seq: 1 })); time = 1;
  const fire = seq => host.action(p, { act: 'weaponFire', seq, yaw: 0, pitch: 0 });
  assert(fire(2)); assert.equal(p.weapon.mag, 6); assert(!fire(2)); assert(!fire(3));
  assert(host.action(p, { act: 'weaponReload', seq: 4 })); assert(!fire(5));
  time += 2; host.tick(p); assert.equal(p.weapon.mag, 6); time += .3; host.tick(p); assert.equal(p.weapon.mag, 7); assert.equal(p.weapon.reserve, 34);
  assert(!host.action(p, { act: 'weaponFire', seq: 6, yaw: NaN, pitch: 0 }));
  assert(fire(7)); time += .4; assert(host.action(p, { act: 'weaponReload', seq: 8 }));
  host.action(p, { act: 'weaponEquip', weapon: 'butterfly', seq: 9 }); time += 4; host.tick(p); assert.equal(p.weapon.mag, 6); assert.equal(p.weapon.reloadEnd, 0);
});
test('host obstruction and peaceful target policy', () => {
  assert.equal(rayBox({ x: 0, y: 1, z: 0 }, { x: 0, y: 0, z: -1 }, { x0: -1, x1: 1, z0: -4, z1: -3, minY: 0, maxY: 2 }, 20), 3);
  let time = 1; const enemy = { id: 'E', role: 'k', state: 'ok', levelId: 'level0', x: 0, y: 0, z: -4 }, player = { id: 'P', role: 's', state: 'ok', levelId: 'level0', x: 0, y: 0, z: 0, yaw: 0, pitch: -.1 };
  let obstruction = 2;
  const host = new CombatAuthority({ now: () => time, emit: () => {}, trace: () => ({ distance: obstruction }), targets: () => [enemy], peaceful: level => level === 'level37' });
  host.action(player, { act: 'weaponEquip', weapon: 'deagle', seq: 1 }); time++;
  host.action(player, { act: 'weaponFire', yaw: 0, pitch: -.1, seq: 2 }); assert(!enemy.weaponStunUntil);
  obstruction = 10; time++; host.action(player, { act: 'weaponFire', yaw: 0, pitch: -.1, seq: 3 }); assert(enemy.weaponStunUntil > time);
  enemy.weaponStunUntil = 0; player.levelId = enemy.levelId = 'level37'; time++;
  host.action(player, { act: 'weaponFire', yaw: 0, pitch: -.1, seq: 4 }); assert(!enemy.weaponStunUntil);
});
test('host position protocol: finite input, per-second budget, no diagonal or packet-rate exploit', () => {
  const guard = new MovementGuard(), p = { x: 0, y: 0, z: 0, spd: 0 };
  const opts = now => ({ now, cap: 7.4, floorAt: () => 0, canStand: () => true, resolve: (x, z) => [x, z] });
  assert(!guard.accept(p, { x: NaN, y: 0, z: 0, yaw: 0, pitch: 0 }, opts(0)));
  for (let i = 0; i <= 1000; i++) guard.accept(p, { x: 10000, y: 0, z: 10000, yaw: 0, pitch: 0 }, opts(i / 1000));
  assert(Math.hypot(p.x, p.z) <= 7.4 * 1.05 + 1e-9);
});
test('idle motion: 30 seconds bounded, no drift, off and ADS suppression', () => {
  const c = new HumanCamera(); let max = 0;
  for (let i = 0; i < 1800; i++) { const o = c.update(1 / 60); max = Math.max(max, Math.abs(o.y)); assert(Math.abs(o.pitch) < .0053); assert(Math.abs(o.x) < .015); }
  assert(max > .018 && max < .026);
  for (let i = 0; i < 180; i++) c.update(1 / 60, { ads: 1 }); assert(Math.abs(c.out.y) < .0016);
  for (let i = 0; i < 180; i++) c.update(1 / 60, { mode: 'off' }); assert(Math.abs(c.out.y) < 1e-6);
});
console.log(JSON.stringify({ passed: results.length, results, hopBonus: MOTION.hopBonus }, null, 2));
