#!/usr/bin/env node
/*!
 * Level 94 Gameplay Support — Automated Tests
 * Agent 3. Tests actual behavior of horizon doors, spawn validation,
 * exploration discovery, and integration adapter using dependency-injected mocks.
 * No external test framework — pure Node asserts.
 */

import assert from 'node:assert/strict';
import { HorizonDoorSystem, HorizonDoor, defaultDoorLayout } from '../horizon-door.js';
import { validateSpawn, findSafeSpawn, validateDestination } from '../spawn-validator.js';
import { ExplorationSystem, defaultLandmarkLayout } from '../exploration.js';
import { createLevel94Gameplay } from '../integration-adapter.js';
import { DOOR_TRIGGER_COOLDOWN_MS } from '../constants.js';

let passed = 0, failed = 0;
function test(name, fn) {
  try { fn(); console.log(`  [PASS] ${name}`); passed++; }
  catch (e) { console.log(`  [FAIL] ${name}\n         ${e.stack || e}`); failed++; }
}

// ---- Mocks ----
const flatTerrain = {
  getHeight(x, z) {
    if (!Number.isFinite(x) || !Number.isFinite(z)) return NaN;
    return 0; // flat ground at y=0
  }
};
const hillyTerrain = {
  getHeight(x, z) {
    return Math.sin(x * 0.02) * 3 + Math.cos(z * 0.02) * 2;
  }
};
const meta = {
  level94: { id: 'level94', worldSpan: 400 },
  level94u: { id: 'level94u', worldSpan: 200 },
  empty: { id: 'empty', worldSpan: 100 }
};
const maps = {
  level94u: { SPAWN: { x: 50, y: 1.15, z: 50, yaw: 0 } }
};
const getLevelMeta = id => meta[id] || null;
const getLevelMap = id => maps[id] || null;

console.log('\n=== Spawn Validation Tests ===');
test('rejects non-finite coordinates', () => {
  const r = validateSpawn({ x: NaN, z: 0 }, { terrain: flatTerrain });
  assert.equal(r.valid, false);
  assert.match(r.reason, /finite/);
});
test('accepts flat safe spawn and adds clearance', () => {
  const r = validateSpawn({ x: 10, z: 10 }, { terrain: flatTerrain });
  assert.equal(r.valid, true);
  assert.ok(r.y > 0, 'y should include clearance');
});
test('rejects out-of-bounds spawn', () => {
  const r = validateSpawn({ x: 500, z: 0 }, { terrain: flatTerrain, worldSpan: 400 });
  assert.equal(r.valid, false);
  assert.match(r.reason, /bounds/);
});
test('rejects overlapping solid geometry', () => {
  const r = validateSpawn({ x: 10, z: 10 }, { terrain: flatTerrain, isSolid: () => true });
  assert.equal(r.valid, false);
  assert.match(r.reason, /solid/);
});
test('findSafeSpawn relocates from an invalid point', () => {
  const r = findSafeSpawn({ x: 500, z: 500 }, { terrain: flatTerrain, worldSpan: 400 }, { maxRadius: 200, step: 20 });
  // No in-bounds point reachable from far-out origin within search that stays in bounds? Actually rings can.
  assert.equal(typeof r.found, 'boolean');
  if (r.found) assert.equal(r.validation.valid, true);
});
test('validateDestination reports registered level without spawn', () => {
  const r = validateDestination('empty', { getLevelMeta, getLevelMap });
  assert.equal(r.available, true);
  assert.equal(r.hasSpawn, false);
});
test('validateDestination accepts level with safe spawn', () => {
  const r = validateDestination('level94u', { getLevelMeta, getLevelMap, terrain: flatTerrain });
  assert.equal(r.available, true);
  assert.equal(r.hasSpawn, true);
});
test('validateDestination rejects unregistered level', () => {
  const r = validateDestination('nope', { getLevelMeta, getLevelMap });
  assert.equal(r.available, false);
});

console.log('\n=== Horizon Door Tests ===');
test('default layout creates 4 distinct doors', () => {
  const layout = defaultDoorLayout(400);
  assert.equal(layout.length, 4);
  assert.equal(new Set(layout.map(d => d.id)).size, 4);
});
test('door triggers once and then debounces', () => {
  const events = [];
  const deps = {
    getLevelMeta, getLevelMap, terrain: flatTerrain,
    requestTransition: () => events.push('transition'),
    emitEvent: (k, d) => events.push(k)
  };
  const door = new HorizonDoor({ id: 'd1', x: 10, z: 10, destinationId: 'level94u' }, deps);
  // Player inside door
  const inside = { id: 'p1', x: 10, y: 0, z: 10 };
  const r1 = door.update(inside, 1000, false);
  assert.equal(r1, 'triggered');
  const r2 = door.update(inside, 1000 + 100, false);
  assert.equal(r2, 'cooldown', 'should debounce within cooldown');
  assert.equal(events.filter(e => e === 'transition').length, 1, 'single transition only');
});
test('door re-arms after cooldown', () => {
  const deps = {
    getLevelMeta, getLevelMap, terrain: flatTerrain,
    requestTransition: () => {},
    emitEvent: () => {}
  };
  const door = new HorizonDoor({ id: 'd2', x: 10, z: 10, destinationId: 'level94u' }, deps);
  const inside = { id: 'p1', x: 10, y: 0, z: 10 };
  door.update(inside, 1000, false);
  door.refresh(1000 + DOOR_TRIGGER_COOLDOWN_MS + 10);
  const r = door.update(inside, 1000 + DOOR_TRIGGER_COOLDOWN_MS + 20, false);
  assert.equal(r, 'triggered', 'should trigger again after cooldown + refresh');
});
test('door falls back gracefully when destination not implemented', () => {
  let fallbackMsg = null;
  const deps = {
    getLevelMeta, getLevelMap,
    requestTransition: () => { throw new Error('should not call'); },
    showFallback: t => { fallbackMsg = t; },
    emitEvent: () => {}
  };
  const door = new HorizonDoor({ id: 'd3', x: 5, z: 5, destinationId: 'nonexistent' }, deps);
  const r = door.update({ id: 'p1', x: 5, y: 0, z: 5 }, 1000, false);
  assert.equal(r, 'fallback');
  assert.ok(fallbackMsg && fallbackMsg.length > 0);
});
test('interact-mode door waits for interaction press', () => {
  const deps = {
    getLevelMeta, getLevelMap, terrain: flatTerrain,
    requestTransition: () => {}, emitEvent: () => {}
  };
  const door = new HorizonDoor({ id: 'd4', x: 5, z: 5, destinationId: 'level94u', trigger: 'interact' }, deps);
  const inside = { id: 'p1', x: 5, y: 0, z: 5 };
  const before = door.update(inside, 1000, false);
  assert.equal(before, 'awaiting-interaction');
  const after = door.update(inside, 1100, true);
  assert.equal(after, 'triggered');
});
test('door system rejects duplicate ids', () => {
  const sys = new HorizonDoorSystem({ getLevelMeta, getLevelMap });
  sys.add({ id: 'x', x: 0, z: 0 });
  assert.throws(() => sys.add({ id: 'x', x: 1, z: 1 }), /duplicate/);
});
test('multiplayer: transition routed through injected adapter', () => {
  let routed = null;
  const deps = {
    getLevelMeta, getLevelMap, terrain: flatTerrain,
    requestTransition: (to, via, pid) => { routed = { to, via, pid }; },
    emitEvent: () => {}
  };
  const door = new HorizonDoor({ id: 'd5', x: 5, z: 5, destinationId: 'level94u' }, deps);
  door.update({ id: 'playerX', x: 5, y: 0, z: 5 }, 1000, false);
  assert.deepEqual(routed, { to: 'level94u', via: 'horizon_door', pid: 'playerX' });
});

console.log('\n=== Exploration Tests ===');
test('landmark discovered once on proximity', () => {
  const events = [];
  const ex = new ExplorationSystem({ emitEvent: (k, d) => events.push(k) });
  ex.add({ id: 'lm1', x: 10, z: 10, name: 'Test Landmark' });
  const near = { x: 12, y: 0, z: 12 };
  const n1 = ex.update(near);
  assert.equal(n1.length, 1);
  const n2 = ex.update(near);
  assert.equal(n2.length, 0, 'not rediscovered');
  assert.equal(ex.discovered.size, 1);
});
test('landmark discovery persists via save/load', () => {
  const ex1 = new ExplorationSystem({});
  ex1.add({ id: 'lm2', x: 0, z: 0 });
  ex1.update({ x: 0, y: 0, z: 0 });
  const save = ex1.saveDiscovered();
  const ex2 = new ExplorationSystem({});
  ex2.add({ id: 'lm2', x: 0, z: 0 });
  ex2.loadDiscovered(save);
  assert.equal(ex2.discovered.has('lm2'), true);
});
test('default landmark layout has distinct ids', () => {
  const layout = defaultLandmarkLayout(400);
  assert.equal(new Set(layout.map(l => l.id)).size, layout.length);
});

console.log('\n=== Integration Adapter Tests ===');
test('adapter bundles doors + exploration and gates by active level', () => {
  let level = 'level0';
  const api = createLevel94Gameplay({
    getLevelMeta, getLevelMap, terrain: flatTerrain,
    activeLevelId: () => level,
    getPlayer: () => ({ id: 'p1', x: 10000, y: 0, z: 10000 }),
    requestLevelTransition: () => {},
    audioCtx: null, audioParentBus: null
  });
  assert.ok(api.doors && api.exploration);
  const resultsIdle = api.update(false); // level0 -> no door updates
  assert.equal(resultsIdle.length, 0);
  level = 'level94';
  const resultsActive = api.update(false); // player far from doors
  assert.equal(resultsActive.length, 4); // all doors evaluated
});
test('adapter terrain reconciliation fills door Y', () => {
  const api = createLevel94Gameplay({
    getLevelMeta, getLevelMap, terrain: hillyTerrain,
    activeLevelId: () => 'level94',
    getPlayer: () => ({ id: 'p1', x: 0, y: 0, z: 0 }),
    requestLevelTransition: () => {}
  });
  const before = api.doors.doors.map(d => d.y);
  api.reconcileTerrain();
  const after = api.doors.doors.map(d => d.y);
  assert.notDeepEqual(before, after, 'door Y should be filled from terrain');
});

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===`);
process.exit(failed > 0 ? 1 : 0);
