/*!
 * Level 94 Gameplay Support — Outdoor Environmental Ambience
 * Agent 3. Procedural Web Audio (original synthesis — no external assets).
 *
 * Nostalgic, peaceful, dreamlike, subtly uncanny. Avoids excessive horror.
 * Layers:
 *   - gentle wind (filtered brown/pink noise, slow LFO sweep)
 *   - grass rustling (band-passed noise, gentle amplitude shimmer)
 *   - very distant environmental bed (low-pass noise + soft detuned tones)
 *   - quiet outdoor room tone (subtle broadband pad)
 *   - occasional mysterious sounds (sparse, soft bells/air wisps, randomized)
 *   - subtle spatial variation via injected listener position
 *
 * Dependency-injected AudioContext + parent gain so it coexists with the
 * game's AudioManager buses. Does not modify audio.js.
 */

import { AMBIENCE_DEFAULTS } from './constants.js';

/** Deterministic small PRNG (mulberry32) for reproducible mystery scheduling. */
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Generate a looping noise AudioBuffer of a given color.
 * @param {AudioContext} ctx
 * @param {number} seconds
 * @param {'white'|'pink'|'brown'} color
 */
export function makeNoiseBuffer(ctx, seconds, color = 'pink') {
  const sr = ctx.sampleRate;
  const len = Math.max(1024, Math.floor(sr * seconds));
  const buffer = ctx.createBuffer(1, len, sr);
  const d = buffer.getChannelData(0);
  let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0, last = 0;
  for (let i = 0; i < len; i++) {
    const white = Math.random() * 2 - 1;
    if (color === 'white') {
      d[i] = white;
    } else if (color === 'brown') {
      last = (last + 0.02 * white) / 1.02;
      d[i] = last * 3.5;
    } else { // pink (Paul Kellet)
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      d[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
      b6 = white * 0.115926;
    }
  }
  // Crossfade the buffer edges so the loop is seamless.
  const fade = Math.min(2048, Math.floor(len / 8));
  for (let i = 0; i < fade; i++) {
    const t = i / fade;
    d[i] = d[i] * t + d[len - fade + i] * (1 - t);
    d[len - 1 - i] = d[len - 1 - i] * t + d[fade - 1 - i] * (1 - t);
  }
  return buffer;
}

export class Level94Ambience {
  /**
   * @param {Object} deps
   * @param {AudioContext} deps.ctx
   * @param {AudioNode} deps.parent          bus to connect ambience output to
   * @param {number} [deps.seed]
   * @param {Object} [deps.gains]            overrides for AMBIENCE_DEFAULTS gains
   */
  constructor(deps) {
    this.deps = deps;
    this.ctx = deps.ctx;
    this.parent = deps.parent;
    this.gains = { ...AMBIENCE_DEFAULTS, ...(deps.gains || {}) };
    this.rand = mulberry32(deps.seed ?? 94094);
    this.started = false;
    this.disposed = false;
    this.nodes = [];
    this.sources = [];
    this._mysteryTimer = null;
    this._lastListener = { x: 0, y: 0, z: 0 };
  }

  _track(node) { this.nodes.push(node); return node; }
  _gain(value) { const g = this._track(this.ctx.createGain()); g.gain.value = value; return g; }
  _filter(type, freq, q = 0.7) {
    const f = this._track(this.ctx.createBiquadFilter());
    f.type = type; f.frequency.value = freq; f.Q.value = q; return f;
  }
  _loop(buffer, gainNode, filter) {
    const src = this.ctx.createBufferSource();
    src.buffer = buffer; src.loop = true;
    if (filter) src.connect(filter).connect(gainNode);
    else src.connect(gainNode);
    src.start(0);
    this.sources.push(src);
    return src;
  }

  /** Build and start all layers. Safe to call once. */
  start() {
    if (this.started || this.disposed) return;
    const ctx = this.ctx;
    this.started = true;

    this.out = this._gain(1.0);
    this.out.connect(this.parent);

    const windBuf = makeNoiseBuffer(ctx, 6, 'brown');
    const grassBuf = makeNoiseBuffer(ctx, 4, 'pink');
    const airBuf = makeNoiseBuffer(ctx, 8, 'pink');

    // 1. Gentle wind: low-passed brown noise with slow LFO on cutoff + gain.
    const windFilter = this._filter('lowpass', 620, 0.6);
    this.windGain = this._gain(this.gains.windGain);
    this._loop(windBuf, this.windGain, windFilter);
    const windLfo = this._track(ctx.createOscillator());
    windLfo.frequency.value = 0.06;
    const windLfoGain = this._gain(260);
    windLfo.connect(windLfoGain).connect(windFilter.frequency);
    windLfo.start();
    this.sources.push(windLfo);
    this.windGain.connect(this.out);

    // 2. Grass rustling: band-passed pink noise, gentle amplitude shimmer.
    const grassFilter = this._filter('bandpass', 2400, 0.9);
    this.grassGain = this._gain(this.gains.grassGain);
    this._loop(grassBuf, this.grassGain, grassFilter);
    const grassLfo = this._track(ctx.createOscillator());
    grassLfo.frequency.value = 0.23;
    const grassLfoGain = this._gain(this.gains.grassGain * 0.6);
    grassLfo.connect(grassLfoGain).connect(this.grassGain.gain);
    grassLfo.start();
    this.sources.push(grassLfo);
    this.grassGain.connect(this.out);

    // 3. Very distant environmental bed: heavily low-passed pink noise.
    const distFilter = this._filter('lowpass', 300, 0.5);
    this.distantGain = this._gain(this.gains.distantGain);
    this._loop(airBuf, this.distantGain, distFilter);
    this.distantGain.connect(this.out);

    // Soft detuned distant tones (faint, dreamlike; not horror).
    [196.0, 293.7].forEach((freq, i) => {
      const osc = this._track(ctx.createOscillator());
      osc.type = 'sine'; osc.frequency.value = freq * (i ? 1.003 : 1);
      const og = this._gain(this.gains.distantGain * 0.18);
      osc.connect(og).connect(this.out);
      osc.start();
      this.sources.push(osc);
    });

    // 4. Quiet outdoor room tone: subtle broadband pad.
    const roomFilter = this._filter('highpass', 120, 0.5);
    this.roomGain = this._gain(this.gains.roomToneGain);
    this._loop(airBuf, this.roomGain, roomFilter);
    this.roomGain.connect(this.out);

    // Master fade-in.
    this.out.gain.setValueAtTime(0.0001, ctx.currentTime);
    this.out.gain.exponentialRampToValueAtTime(1.0, ctx.currentTime + this.gains.crossfadeSec);

    this._scheduleMystery();
  }

  /** Sparse, soft, mysterious sound — never a jumpscare. */
  _playMystery() {
    if (this.disposed || !this.ctx) return;
    const ctx = this.ctx;
    // Choose between a soft bell and an air wisp.
    if (this.rand() < 0.45) {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      const base = [523.25, 659.25, 783.99, 880.0][Math.floor(this.rand() * 4)];
      osc.frequency.setValueAtTime(base, ctx.currentTime);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(this.gains.mysteryGain, ctx.currentTime + 0.4);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 2.6);
      osc.connect(g).connect(this.out);
      osc.start(); osc.stop(ctx.currentTime + 2.7);
    } else {
      const src = ctx.createBufferSource();
      src.buffer = makeNoiseBuffer(ctx, 2.2, 'pink');
      const f = ctx.createBiquadFilter();
      f.type = 'bandpass'; f.frequency.value = 900 + this.rand() * 600; f.Q.value = 1.4;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, ctx.currentTime);
      g.gain.linearRampToValueAtTime(this.gains.mysteryGain * 0.8, ctx.currentTime + 0.6);
      g.gain.linearRampToValueAtTime(0.0001, ctx.currentTime + 2.1);
      src.connect(f).connect(g).connect(this.out);
      src.start(); src.stop(ctx.currentTime + 2.2);
    }
  }

  _scheduleMystery() {
    if (this.disposed) return;
    const min = this.gains.mysteryIntervalMinMs;
    const max = this.gains.mysteryIntervalMaxMs;
    const delay = min + this.rand() * (max - min);
    this._mysteryTimer = setTimeout(() => {
      this._playMystery();
      this._scheduleMystery();
    }, delay);
  }

  /**
   * Subtle spatial variation from player position — slowly drifts distant bed
   * and grass levels so the soundscape feels alive without HUD or horror.
   * @param {{x:number,y:number,z:number}} pos
   */
  updateListener(pos) {
    if (!this.started || this.disposed || !pos) return;
    this._lastListener = pos;
    const t = this.ctx.currentTime;
    const slow = Math.sin(pos.x * 0.004 + pos.z * 0.003);
    this.grassGain?.gain.setTargetAtTime(this.gains.grassGain * (1 + 0.25 * slow), t, 1.2);
    this.distantGain?.gain.setTargetAtTime(this.gains.distantGain * (1 - 0.15 * slow), t, 1.5);
  }

  /** Fade out and stop all layers. */
  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    if (this._mysteryTimer) { clearTimeout(this._mysteryTimer); this._mysteryTimer = null; }
    const t = this.ctx.currentTime;
    if (this.out) {
      this.out.gain.cancelScheduledValues(t);
      this.out.gain.setValueAtTime(Math.max(0.0001, this.out.gain.value), t);
      this.out.gain.exponentialRampToValueAtTime(0.0001, t + this.gains.crossfadeSec);
    }
    const stopAt = t + this.gains.crossfadeSec + 0.1;
    for (const s of this.sources) { try { s.stop(stopAt); } catch {} }
    setTimeout(() => {
      for (const n of this.nodes) { try { n.disconnect(); } catch {} }
      try { this.out?.disconnect(); } catch {}
    }, (this.gains.crossfadeSec + 0.3) * 1000);
  }
}
