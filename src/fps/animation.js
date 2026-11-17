/* Copyright (c) 2026 Vendreith. Original authored weapon motions. */
import { WEAPONS } from './weapon_data.js';
import { relicSegment, sampleRelic, sampleKnifePolish } from './flourishes.js';
const TAU = Math.PI * 2, smooth = u => { u = Math.max(0, Math.min(1, u)); return u * u * u * (u * (u * 6 - 15) + 10); };
const durations = { EQUIPPING: .58, UNEQUIPPING: .23, ATTACKING: .31, RELOADING: 2.25, RECOVERING: .18 };
export const ANIMATION_STATES = Object.freeze(['HOLSTERED', 'EQUIPPING', 'IDLE', 'MOVING', 'AIMING', 'INSPECTING', 'FLEX_LOOP', 'ATTACKING', 'FIRING', 'RECOIL', 'RELOADING', 'RECOVERING', 'UNEQUIPPING']);
export const TRICKS = Object.freeze(['opening flip', 'thumb roll / reverse catch', 'close and reopen']);
const keys = ['x', 'y', 'z', 'rx', 'ry', 'rz', 'handleA', 'handleB', 'mag', 'slide', 'left', 'grip', 'cylinderOpen', 'cylinderSpin', 'eject', 'loader', 'hammer', 'spin', 'spinContact', 'visualLoaded'];
const base = () => Object.fromEntries(keys.map(k => [k, k === 'grip' ? 1 : 0]));
function curve(u, frames) {
  for (let i = 1; i < frames.length; i++) {
    const [end, v] = frames[i], [start, previous] = frames[i - 1];
    if (u <= end) return previous + (v - previous) * smooth((u - start) / (end - start));
  }
  return frames[frames.length - 1][1];
}
export class WeaponAnimation {
  constructor(cue = () => {}) {
    this.weapon = 'none'; this.state = 'HOLSTERED'; this.age = this.clock = this.cycle = 0;
    this.held = false; this.cue = cue; this.pose = base(); this.previous = base(); this.blend = 1;
    this._lastCue = -1; this.transitions = []; this.pending = null;
    this.allowLoop = true; this.aimed = false; this.emptyReload = false; this.attackSide = this.attackCount = 0;
  }
  get reloadDuration() { return this.emptyReload ? WEAPONS[this.weapon].reloadEmpty : WEAPONS[this.weapon].reload; }
  markers(u, markers) { markers.forEach(([at,key],i)=>{if(u>=at&&this._lastCue<i){this._lastCue=i;this.cue(key);}}); }
  transition(state, force = false) {
    if (!ANIMATION_STATES.includes(state) || (this.state === state && !force)) return;
    Object.assign(this.previous, this.pose); this.blend = 0; this.age = 0; this._lastCue = -1;
    this.transitions.push([this.state, state]); if (this.transitions.length > 80) this.transitions.shift(); this.state = state;
  }
  equip(weapon) {
    this.held = false;
    if (this.weapon === weapon && !this.pending) return;
    if (this.weapon === 'none') { this.weapon = weapon; this.transition(weapon === 'none' ? 'HOLSTERED' : 'EQUIPPING'); }
    else { this.pending = weapon; this.transition('UNEQUIPPING'); }
  }
  inspect(down) {
    this.held = down;
    if (down && ['IDLE', 'MOVING', 'AIMING', 'RECOVERING'].includes(this.state)) { this.cycle = 0; this.transition('INSPECTING'); }
  }
  clearInput() { this.held = false; }
  attack() {
    if (['HOLSTERED', 'EQUIPPING', 'UNEQUIPPING', 'RELOADING'].includes(this.state)) return false;
    this.held = false; this.attackSide = this.attackCount++ % 2; this.transition(this.weapon === 'relic' ? 'FIRING' : 'ATTACKING', true); return true;
  }
  reload(empty = false) {
    if (!WEAPONS[this.weapon]?.capacity || ['HOLSTERED', 'EQUIPPING', 'UNEQUIPPING', 'RELOADING'].includes(this.state)) return false;
    this.held = false; this.emptyReload = empty; this.transition('RELOADING'); return true;
  }
  update(dt, moving = false) {
    this.age += dt; this.clock += dt; this.blend = Math.min(1, this.blend + dt / .12);
    let state = this.state;
    const knife = this.weapon === 'butterfly', relic = this.weapon === 'relic', inspectDuration = relic ? relicSegment(this.cycle).duration : knife ? 1.32 : 1.60;
    if (state === 'INSPECTING' && this.held && this.allowLoop && this.age > .22) { this.state = state = 'FLEX_LOOP'; }
    const duration = state === 'EQUIPPING' ? WEAPONS[this.weapon]?.draw || .58 : state === 'RELOADING' ? this.reloadDuration : state === 'FIRING' ? .095 : state === 'RECOIL' ? .24 : state === 'ATTACKING' && knife ? .48 : durations[state];
    if (duration && this.age >= duration) {
      if (state === 'UNEQUIPPING') {
        this.weapon = this.pending ?? 'none'; this.pending = null;
        this.transition(this.weapon === 'none' ? 'HOLSTERED' : 'EQUIPPING');
      } else this.transition(state === 'FIRING' ? 'RECOIL' : state === 'RECOVERING' ? (this.aimed ? 'AIMING' : moving ? 'MOVING' : 'IDLE') : 'RECOVERING');
      state = this.state;
    }
    if (state === 'INSPECTING' || state === 'FLEX_LOOP') {
      if (this.age >= inspectDuration) {
        if (this.held && this.allowLoop) { this.age %= inspectDuration; this.cycle++; this._lastCue = -1; }
        else this.transition('RECOVERING');
        state = this.state;
      }
    } else if (['IDLE','MOVING','AIMING'].includes(state)) this.state = state = this.aimed ? 'AIMING' : moving ? 'MOVING' : 'IDLE';
    const p = this.pose; for (const k of keys) p[k] = k === 'grip' ? 1 : 0;
    const age = this.age;
    if (state === 'EQUIPPING') {
      const u = age / .58, v = 1 - smooth(u);
      p.y = -.24 * v; p.z = .12 * v; p.rx = -.65 * v; p.rz = .36 * v;
      if (knife) p.handleB = -Math.PI * (1 - smooth(Math.max(0, u - .18) / .65));
    } else if (state === 'UNEQUIPPING') { const v = smooth(age / .23); p.y = -.25 * v; p.rx = -.7 * v; p.z = .08 * v; }
    else if (state === 'ATTACKING') {
      if (knife) {
        const u = age / .48, arc = Math.sin(Math.PI * Math.min(1, u));
        p.x = -.19 * arc; p.y = .065 * arc; p.z = -.12 * arc;
        p.rx = -.55 * arc; p.ry = -.75 * arc; p.rz = 1.15 * arc;
      } else { const kick = Math.exp(-age * 14) * Math.sin(Math.min(1, age / .035) * Math.PI / 2); p.z = .055 * kick; p.rx = .29 * kick; p.ry = -.028 * kick; p.slide = .032 * Math.sin(Math.PI * Math.min(1, age / .12)); }
    } else if (state === 'RELOADING' && !relic) {
      const u = age / 2.25;
      p.rz = curve(u, [[0, 0], [.18, -.38], [.64, -.38], [.86, .12], [1, 0]]);
      p.ry = curve(u, [[0, 0], [.18, -.35], [.65, -.35], [.9, .04], [1, 0]]);
      p.y = curve(u, [[0, 0], [.2, .055], [.7, .055], [1, 0]]);
      p.x = curve(u, [[0, 0], [.2, -.045], [.7, -.045], [1, 0]]);
      p.mag = curve(u, [[0, 0], [.16, 0], [.37, 1], [.51, 1], [.73, 0], [1, 0]]);
      p.left = curve(u, [[0, 0], [.16, 1], [.73, 1], [.84, .5], [1, 0]]);
      p.slide = curve(u, [[0, 0], [.80, 0], [.87, .034], [.92, 0], [1, 0]]);
      const cues = [.17, .37, .70, .87];
      cues.forEach((at, i) => { if (u >= at && this._lastCue < i) { this._lastCue = i; this.cue(['magout', 'magcatch', 'magin', 'slide'][i]); } });
    } else if (state === 'INSPECTING' || state === 'FLEX_LOOP') {
      const u = age / inspectDuration, envelope = Math.sin(Math.PI * u) ** 2;
      p.x = -.055 * envelope; p.y = .065 * envelope; p.z = -.035 * envelope;
      if (!knife) {
        p.rx = .12 * envelope; p.ry = -.48 * envelope;
        p.rz = TAU * smooth(u); p.left = envelope; p.grip = 1 - .32 * envelope;
      } else {
        const trick = this.cycle % 3;
        // Each handle rotates about its own tang pin; compatible endpoints are open and gripped.
        if (trick === 0) {
          p.handleA = curve(u, [[0, 0], [.20, .28], [.48, -Math.PI], [.76, -.4], [1, 0]]);
          p.handleB = curve(u, [[0, 0], [.24, -Math.PI], [.55, -TAU], [.81, -Math.PI], [1, 0]]);
          p.rz = .65 * Math.sin(TAU * u) * envelope; p.rx = .4 * envelope;
        } else if (trick === 1) {
          p.handleA = -TAU * smooth(u); p.handleB = curve(u, [[0, 0], [.3, -Math.PI], [.56, Math.PI], [.82, TAU], [1, 0]]);
          p.rz = TAU * smooth(u); p.ry = .65 * envelope; p.grip = 1 - .65 * envelope;
        } else {
          p.handleA = curve(u, [[0, 0], [.34, -Math.PI], [.58, -Math.PI], [.82, .35], [1, 0]]);
          p.handleB = curve(u, [[0, 0], [.25, Math.PI], [.52, Math.PI], [.80, -Math.PI], [1, 0]]);
          p.rx = -.5 * envelope; p.ry = -.35 * envelope; p.rz = -.5 * Math.sin(TAU * u) * envelope;
        }
        if (u > .22 && this._lastCue < 0) { this._lastCue = 0; this.cue('flip'); }
        if (u > .73 && this._lastCue < 1) { this._lastCue = 1; this.cue('catch'); }
      }
    }
    if (relic) sampleRelic(this,p);
    if (knife) sampleKnifePolish(this,p);
    // Rotation blending is quaternion-based in the view rig. Scalar channels are safe to blend here.
    const blend = smooth(this.blend);
    for (const k of keys) if (!['rx', 'ry', 'rz', 'handleA', 'handleB', 'spin', 'cylinderSpin'].includes(k)) p[k] = this.previous[k] + (p[k] - this.previous[k]) * blend;
    return p;
  }
}
