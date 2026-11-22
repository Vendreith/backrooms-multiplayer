#!/usr/bin/env node
/*!
 * Level 94 Gameplay Support — Ambience Tests with mock Web Audio API
 * Verifies the procedural ambience system builds all layers, responds to
 * listener movement, and disposes cleanly — without a real browser.
 */

import assert from 'node:assert/strict';
import { Level94Ambience, makeNoiseBuffer } from '../ambience.js';
import { AMBIENCE_DEFAULTS } from '../constants.js';

let passed = 0, failed = 0;
function test(name, fn) {
  try { fn(); console.log(`  [PASS] ${name}`); passed++; }
  catch (e) { console.log(`  [FAIL] ${name}\n         ${e.stack || e}`); failed++; }
}

// ---- Mock Web Audio API ----
class MockParam {
  constructor(v = 0) { this.value = v; this.calls = []; }
  setValueAtTime(v, t) { this.value = v; this.calls.push(['set', v, t]); }
  exponentialRampToValueAtTime(v, t) { this.value = v; this.calls.push(['exp', v, t]); }
  linearRampToValueAtTime(v, t) { this.value = v; this.calls.push(['lin', v, t]); }
  setTargetAtTime(v, t, c) { this.value = v; this.calls.push(['target', v, t, c]); }
  cancelScheduledValues() {}
}
class MockNode {
  constructor() {
    this.gain = new MockParam(1);
    this.frequency = new MockParam(440);
    this.Q = new MockParam(1);
    this.type = '';
    this.connections = [];
    this.disconnected = false;
  }
  connect(n) { this.connections.push(n); return n; }
  disconnect() { this.disconnected = true; }
  start() { this.started = true; }
  stop() { this.stopped = true; }
}
class MockAudioContext {
  constructor() {
    this.currentTime = 0;
    this.sampleRate = 22050;
    this.created = 0;
    this.destination = new MockNode();
  }
  createGain() { this.created++; return new MockNode(); }
  createBiquadFilter() { this.created++; return new MockNode(); }
  createOscillator() { this.created++; return new MockNode(); }
  createBufferSource() { this.created++; return new MockNode(); }
  createBuffer(ch, len, sr) {
    const data = new Float32Array(len);
    return { getChannelData: () => data, length: len, sampleRate: sr };
  }
}

console.log('\n=== Ambience Tests (mock Web Audio) ===');
test('makeNoiseBuffer produces finite samples and seamless length', () => {
  const ctx = new MockAudioContext();
  const buf = makeNoiseBuffer(ctx, 0.5, 'pink');
  assert.ok(buf.length > 1024);
  const d = buf.getChannelData(0);
  assert.equal(d.length, buf.length);
  for (let i = 0; i < d.length; i++) assert.ok(Number.isFinite(d[i]));
});
test('ambience builds all layers and starts sources', () => {
  const ctx = new MockAudioContext();
  const parent = new MockNode();
  const amb = new Level94Ambience({ ctx, parent });
  amb.start();
  assert.equal(amb.started, true);
  assert.ok(amb.sources.length >= 6, `expected >=6 sources, got ${amb.sources.length}`);
  assert.ok(amb.windGain && amb.grassGain && amb.distantGain && amb.roomGain);
  assert.ok(ctx.created > 10, 'should create many audio nodes');
});
test('ambience start is idempotent', () => {
  const ctx = new MockAudioContext();
  const amb = new Level94Ambience({ ctx, parent: new MockNode() });
  amb.start();
  const count = amb.sources.length;
  amb.start();
  assert.equal(amb.sources.length, count, 'second start should be a no-op');
});
test('ambience responds to listener position without crashing', () => {
  const ctx = new MockAudioContext();
  const amb = new Level94Ambience({ ctx, parent: new MockNode() });
  amb.start();
  const before = amb.grassGain.gain.value;
  amb.updateListener({ x: 100, y: 0, z: 100 });
  assert.ok(amb.grassGain.gain.calls.length > 0, 'should schedule a gain change');
  assert.deepEqual(amb._lastListener, { x: 100, y: 0, z: 100 });
});
test('ambience mystery sound schedules without error', () => {
  const ctx = new MockAudioContext();
  const amb = new Level94Ambience({ ctx, parent: new MockNode(), seed: 1 });
  amb.start();
  amb._playMystery(); // invoke directly to avoid waiting for timer
  assert.ok(true, 'no throw');
});
test('ambience dispose stops sources and clears timer', () => {
  const ctx = new MockAudioContext();
  const amb = new Level94Ambience({ ctx, parent: new MockNode() });
  amb.start();
  amb.dispose();
  assert.equal(amb.disposed, true);
  assert.equal(amb._mysteryTimer, null);
  for (const s of amb.sources) assert.equal(s.stopped, true, 'all sources stopped');
});
test('gains honor overrides', () => {
  const ctx = new MockAudioContext();
  const amb = new Level94Ambience({ ctx, parent: new MockNode(), gains: { windGain: 0.1 } });
  assert.equal(amb.gains.windGain, 0.1);
  assert.equal(amb.gains.grassGain, AMBIENCE_DEFAULTS.grassGain);
});

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===`);
process.exit(failed > 0 ? 1 : 0);
