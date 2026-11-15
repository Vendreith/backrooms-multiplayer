import { THREE, PreloaderSystem } from './engine.js';

export const MUSIC_TRACKS = {
  burning: './audio/burning_memory.mp3',
  ballroom: './audio/ballroom_memory.mp3',
  sweetest: './audio/sweetest_delusion.mp3',
  faded: './audio/faded_angel.mp3',
  velvet: './audio/velvet_corridor.mp3',
  daisy: './audio/daisy_bell_tape.mp3',
  poolrooms: './audio/poolrooms_reverie.mp3',
  async_atmo: './audio/async_threshold.mp3',
  bewildered: './audio/bewildered.mp3',
  spacial: './audio/ambient_spacial.mp3',
  apprehension: './audio/chase_apprehension.mp3',
  chaos: './audio/chase_chaos.mp3',
  null_chase: './audio/null_protocol_chase.mp3'
};

export const HORROR_SFX_TRACKS = {
  sfx_whisper: './audio/sfx_whisper.ogg',
  sfx_creak: './audio/sfx_creak.ogg',
  sfx_metal_bang: './audio/sfx_metal_bang.ogg',
  sfx_knock: './audio/sfx_knock.ogg',
  sfx_growl1: './audio/sfx_growl1.ogg',
  sfx_growl2: './audio/sfx_growl2.ogg',
  sfx_squeak: './audio/sfx_squeak.ogg',
  sfx_clasp: './audio/sfx_clasp.ogg',
  sfx_static: './audio/sfx_static.wav',
  sfx_saturn_radio: './audio/sfx_saturn_radio.wav',
  sfx_elevator_door: './audio/sfx_elevator_door.ogg'
};

export const CREEPY_RANDOM_KEYS = [
  'sfx_whisper',
  'sfx_creak',
  'sfx_metal_bang',
  'sfx_knock',
  'sfx_growl1',
  'sfx_growl2',
  'sfx_squeak',
  'sfx_clasp',
  'sfx_static',
  'sfx_saturn_radio'
];

export const AMBIENT_TRACK_KEYS = [
  'burning',
  'ballroom',
  'sweetest',
  'faded',
  'velvet',
  'daisy',
  'poolrooms',
  'async_atmo',
  'bewildered',
  'spacial'
];

export const MUSIC_LABELS = {
  burning: 'Burning Memory (1931 Ballroom)',
  ballroom: 'The Very Thought of You (Slowed)',
  sweetest: 'Love is the Sweetest Thing (Warped)',
  faded: 'Faded Angel (1931 Tape Decay)',
  velvet: 'Velvet Corridor (Distant Phonograph)',
  daisy: 'Daisy Bell (VHS Music Box)',
  poolrooms: 'Poolrooms Tiled Reverie',
  async_atmo: 'A-Sync KV-31 Threshold Resonance',
  bewildered: 'Slightly Bewildered',
  spacial: 'Spacial Winds'
};

class AudioManager {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.sfxGain = null;
    this.ambGain = null;
    this.ambFilter = null;
    this.chaseGain = null;

    this.rawBuffers = {};     // Pre-fetched ArrayBuffers from Preloader
    this.audioBuffers = {};   // Decoded looping music AudioBuffers
    this.sfxRawBuffers = {};  // Pre-fetched one-shot horror/elevator SFX buffers
    this.sfxBuffers = {};     // Decoded one-shot AudioBuffers
    this.sources = {};        // Active looping AudioBufferSourceNodes + GainNodes
    this.decoding = new Set();

    this.humOsc = null;
    this.humGain = null;
    this.atmoGain = null;
    this.atmoDroneFilter = null;
    this.atmoAirFilter = null;
    this._atmoBuffer = null;
    this._breathBuffer = null;
    this._breathT = 0;
    this._breathInhale = true;
    this.staticGain = null;
    this.staticFilter = null;
    this.repairOsc = null;
    this.repairGain = null;
    this._repairClickT = 0;
    this.currentAmbKey = 'burning';
    this.ambCycleT = 0;
    this.muted = false;
    this.musicVol = 0.72;
    this.sfxVol = 0.85;
    this._heartT = 0;
    this._nextCreepyT = 5.5;
    this._lastCreepyKey = '';
    this._poolAudio = null;
    this._phantomTimers = [];
    this._nextPadChimeT = 0;
  }

  /**
   * Downloads all music tracks & random horror/elevator SFX into RAM during Preloader.
   */
  registerPreloadTasks(preloader) {
    const entries = Object.entries(MUSIC_TRACKS);
    const sfxEntries = Object.entries(HORROR_SFX_TRACKS);
    preloader.addTask('Tải nhạc Backrooms & âm thanh kinh dị (MP3/OGG)...', async () => {
      await Promise.all([
        ...entries.map(async ([key, url]) => {
          try {
            const res = await fetch(url);
            if (res.ok) this.rawBuffers[key] = await res.arrayBuffer();
          } catch (e) {
            console.warn('Audio preload skipped:', url, e);
          }
        }),
        ...sfxEntries.map(async ([key, url]) => {
          try {
            const res = await fetch(url);
            if (res.ok) this.sfxRawBuffers[key] = await res.arrayBuffer();
          } catch (e) {
            console.warn('SFX preload skipped:', url, e);
          }
        })
      ]);
      await PreloaderSystem.yieldFrame();
    });
  }

  ensureContext() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
      return this.ctx;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    this.ctx = new AC();

    this.master = this.ctx.createGain();
    this.master.gain.value = 1.0;
    this.master.connect(this.ctx.destination);

    this.sfxGain = this.ctx.createGain();
    this.sfxGain.gain.value = this.sfxVol;
    this.sfxGain.connect(this.master);

    // Ambient Backrooms music bus with dynamic lowpass filter (muffles when Entity is near!)
    this.ambFilter = this.ctx.createBiquadFilter();
    this.ambFilter.type = 'lowpass';
    this.ambFilter.frequency.value = 16000;
    this.ambFilter.Q.value = 0.7;

    this.ambGain = this.ctx.createGain();
    this.ambGain.gain.value = 0;
    this.ambGain.connect(this.ambFilter);
    this.ambFilter.connect(this.master);

    // Immediate Chase / Alert music bus
    this.chaseGain = this.ctx.createGain();
    this.chaseGain.gain.value = 0;
    this.chaseGain.connect(this.master);

    this._decodeAllAvailable();
    this._breathBuffer = this._buildSmoothNoiseBuffer(2.4, 0.22);
    this._startHum();
    this._startAtmosphereLoop();
    this._startEntityStaticAndRepairLoops();
    return this.ctx;
  }

  _buildSmoothNoiseBuffer(seconds = 3.0, lpAlpha = 0.14) {
    const sr = this.ctx.sampleRate;
    const len = Math.max(1024, Math.floor(sr * seconds));
    const buf = this.ctx.createBuffer(1, len, sr);
    const d = buf.getChannelData(0);
    let lp = 0;
    let peak = 0.001;
    for (let i = 0; i < len; i++) {
      const white = Math.random() * 2 - 1;
      lp += lpAlpha * (white - lp);
      d[i] = lp;
      const a = Math.abs(lp);
      if (a > peak) peak = a;
    }
    const fadeN = Math.min(Math.floor(sr * 0.15), Math.floor(len * 0.12));
    for (let i = 0; i < fadeN; i++) {
      const k = i / fadeN;
      d[i] = d[i] * k + d[len - fadeN + i] * (1 - k);
    }
    const inv = 0.85 / peak;
    for (let i = 0; i < len; i++) d[i] *= inv;
    return buf;
  }

  async _decodeAllAvailable() {
    if (!this.ctx) return;
    const order = [
      'burning', 'ballroom', 'daisy', 'chaos', 'apprehension', 'null_chase',
      'sweetest', 'faded', 'velvet', 'poolrooms', 'async_atmo', 'spacial', 'bewildered'
    ];
    for (const key of order) {
      const raw = this.rawBuffers[key];
      if (!raw || this.audioBuffers[key] || this.decoding.has(key)) continue;
      this.decoding.add(key);
      try {
        const copy = raw.slice(0);
        this.audioBuffers[key] = await this.ctx.decodeAudioData(copy);
        this._ensureTrackPlaying(key);
      } catch (e) {
        console.warn('Audio decode failed:', key, e);
      } finally {
        this.decoding.delete(key);
      }
    }
    for (const key of Object.keys(HORROR_SFX_TRACKS)) {
      const raw = this.sfxRawBuffers[key];
      if (!raw || this.sfxBuffers[key] || this.decoding.has(key)) continue;
      this.decoding.add(key);
      try {
        const copy = raw.slice(0);
        this.sfxBuffers[key] = await this.ctx.decodeAudioData(copy);
      } catch (e) {
        console.warn('SFX decode failed:', key, e);
      } finally {
        this.decoding.delete(key);
      }
    }
  }

  _ensureTrackPlaying(key) {
    if (!this.ctx || !this.audioBuffers[key] || this.sources[key]) return;
    const src = this.ctx.createBufferSource();
    src.buffer = this.audioBuffers[key];
    src.loop = true;

    const trackGain = this.ctx.createGain();
    trackGain.gain.value = 0;

    const isChase = (key === 'apprehension' || key === 'chaos' || key === 'null_chase');
    src.connect(trackGain);
    trackGain.connect(isChase ? this.chaseGain : this.ambGain);
    src.start(0);

    this.sources[key] = { src, gain: trackGain };
  }

  nextTrack() {
    const idx = AMBIENT_TRACK_KEYS.indexOf(this.currentAmbKey);
    this.currentAmbKey = AMBIENT_TRACK_KEYS[(idx + 1) % AMBIENT_TRACK_KEYS.length];
    this.ambCycleT = 0;
    return this.getCurrentTrackLabel();
  }

  getCurrentTrackLabel() {
    return MUSIC_LABELS[this.currentAmbKey] || this.currentAmbKey;
  }

  _startHum() {
    if (!this.ctx || this.humOsc) return;
    this.humGain = this.ctx.createGain();
    this.humGain.gain.value = 0.032;

    const f = this.ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = 260;

    this.humOsc = this.ctx.createOscillator();
    this.humOsc.type = 'sawtooth';
    this.humOsc.frequency.value = 60;

    const osc2 = this.ctx.createOscillator();
    osc2.type = 'sine';
    osc2.frequency.value = 120.4;

    const g2 = this.ctx.createGain();
    g2.gain.value = 0.35;

    this.humOsc.connect(f);
    osc2.connect(g2);
    g2.connect(f);
    f.connect(this.humGain);
    this.humGain.connect(this.sfxGain);

    this.humOsc.start();
    osc2.start();
  }

  _startAtmosphereLoop() {
    if (!this.ctx || this.atmoGain) return;
    this._atmoBuffer = this._buildSmoothNoiseBuffer(4.0, 0.085);

    this.atmoGain = this.ctx.createGain();
    this.atmoGain.gain.value = 0.0;
    this.atmoGain.connect(this.sfxGain);

    // Layer 1: Hollow Liminal Room / Empty Corridor Ventilation Sub-Drone
    const srcDrone = this.ctx.createBufferSource();
    srcDrone.buffer = this._atmoBuffer;
    srcDrone.loop = true;
    this.atmoDroneFilter = this.ctx.createBiquadFilter();
    this.atmoDroneFilter.type = 'bandpass';
    this.atmoDroneFilter.frequency.value = 128;
    this.atmoDroneFilter.Q.value = 2.1;
    const droneGain = this.ctx.createGain();
    droneGain.gain.value = 0.65;
    srcDrone.connect(this.atmoDroneFilter);
    this.atmoDroneFilter.connect(droneGain);
    droneGain.connect(this.atmoGain);
    srcDrone.start(0);

    // Layer 2: Distant Cold Air-Duct / Sterile Hallway Drift
    const srcAir = this.ctx.createBufferSource();
    srcAir.buffer = this._atmoBuffer;
    srcAir.loop = true;
    this.atmoAirFilter = this.ctx.createBiquadFilter();
    this.atmoAirFilter.type = 'bandpass';
    this.atmoAirFilter.frequency.value = 510;
    this.atmoAirFilter.Q.value = 0.95;
    const airGain = this.ctx.createGain();
    airGain.gain.value = 0.28;
    srcAir.connect(this.atmoAirFilter);
    this.atmoAirFilter.connect(airGain);
    airGain.connect(this.atmoGain);
    srcAir.start(0, 1.3);

    // Layer 3: Subtle Sub-Bass Liminal Room Pressure (41Hz + 61.5Hz)
    for (const [freq, amp] of [[41, 0.14], [61.5, 0.09]]) {
      const o = this.ctx.createOscillator();
      o.type = 'sine';
      o.frequency.value = freq;
      const og = this.ctx.createGain();
      og.gain.value = amp;
      o.connect(og);
      og.connect(this.atmoGain);
      o.start(0);
    }
  }

  _startEntityStaticAndRepairLoops() {
    if (!this.ctx || this.staticGain) return;
    // Continuous looping harsh tape/EMF static buffer ("rè rè") modulated when Entity approaches
    const sr = this.ctx.sampleRate;
    const len = sr * 2;
    const sBuf = this.ctx.createBuffer(1, len, sr);
    const d = sBuf.getChannelData(0);
    let hold = 0;
    for (let i = 0; i < len; i++) {
      // Crackle spikes + jagged 60Hz/180Hz buzz texture
      if ((i % 7) === 0 || Math.random() < 0.25) hold = (Math.random() * 2 - 1);
      const buzz = Math.sin((i / sr) * Math.PI * 2 * 92) * 0.35 + (Math.random() < 0.015 ? (Math.random() * 2 - 1) * 1.4 : 0);
      d[i] = Math.max(-1, Math.min(1, hold * 0.65 + buzz));
    }
    const sSrc = this.ctx.createBufferSource();
    sSrc.buffer = sBuf;
    sSrc.loop = true;

    this.staticFilter = this.ctx.createBiquadFilter();
    this.staticFilter.type = 'bandpass';
    this.staticFilter.frequency.value = 1150;
    this.staticFilter.Q.value = 1.6;

    this.staticGain = this.ctx.createGain();
    this.staticGain.gain.value = 0;

    sSrc.connect(this.staticFilter);
    this.staticFilter.connect(this.staticGain);
    this.staticGain.connect(this.master);
    sSrc.start();

    // Mechanical Breaker Repair Hum Loop (silenced until actively holding [E] on a breaker box)
    this.repairOsc = this.ctx.createOscillator();
    this.repairOsc.type = 'sawtooth';
    this.repairOsc.frequency.value = 85;
    const rFilter = this.ctx.createBiquadFilter();
    rFilter.type = 'lowpass';
    rFilter.frequency.value = 340;
    this.repairGain = this.ctx.createGain();
    this.repairGain.gain.value = 0;
    this.repairOsc.connect(rFilter);
    rFilter.connect(this.repairGain);
    this.repairGain.connect(this.sfxGain);
    this.repairOsc.start();
  }

  setVolumes(musicVol, sfxVol) {
    this.musicVol = musicVol;
    this.sfxVol = sfxVol;
    if (this.sfxGain && this.ctx) {
      this.sfxGain.gain.setTargetAtTime(sfxVol, this.ctx.currentTime, 0.05);
    }
  }

  updateListener(pos, yaw, pitch = 0) {
    if (!this.ctx || !this.ctx.listener) return;
    const L = this.ctx.listener;
    const fx = -Math.sin(yaw) * Math.cos(pitch);
    const fy = Math.sin(pitch);
    const fz = -Math.cos(yaw) * Math.cos(pitch);
    if (L.positionX) {
      const t = this.ctx.currentTime;
      L.positionX.setValueAtTime(pos.x, t);
      L.positionY.setValueAtTime(pos.y, t);
      L.positionZ.setValueAtTime(pos.z, t);
      L.forwardX.setValueAtTime(fx, t);
      L.forwardY.setValueAtTime(fy, t);
      L.forwardZ.setValueAtTime(fz, t);
    } else if (L.setPosition) {
      L.setPosition(pos.x, pos.y, pos.z);
      L.setOrientation(fx, fy, fz, 0, 1, 0);
    }
  }

  /**
   * Drives reactive Backrooms music & fear mechanics every frame:
   * - Cycles ambient tracks calmly ("burning memory", "slightly bewildered", "spacial winds")
   * - Ducks + low-pass muffles ambient music when Entity approaches (proximity dread!)
   * - Immediately triggers tense chase music ("Apprehension" / "Controlled Chaos") on LOS, Reveal, or Scan!
   */
  updateReactiveMix(dt, {
    inGame = false,
    paused = false,
    entityDist = 999,
    entityVisible = false,
    revealActive = false,
    scanActive = false,
    isKiller = false,
    sprinting = false,
    speedRatio = 0,
    stamRatio = 1,
    zoneLight = 0.55,
    panic = 0
  }) {
    if (!this.ctx || !this.ambGain || !this.chaseGain) return;
    const now = this.ctx.currentTime;

    if (!inGame) {
      // Soft haunting Backrooms lobby music + subtle quiet lobby room atmosphere
      this.ambGain.gain.setTargetAtTime(0.32 * this.musicVol, now, 0.35);
      this.chaseGain.gain.setTargetAtTime(0, now, 0.25);
      this.ambFilter.frequency.setTargetAtTime(8500, now, 0.3);
      if (this.humGain) this.humGain.gain.setTargetAtTime(0.015, now, 0.3);
      if (this.atmoGain) this.atmoGain.gain.setTargetAtTime(0.08, now, 0.4);
      if (this._poolAudio) this._poolAudio.bus.gain.setTargetAtTime(0, now, 0.35);
      this.stopPhantomFootsteps();
      this._breathT = 0;

      for (const [k, s] of Object.entries(this.sources)) {
        const target = k === 'burning' ? 1.0 : 0.0;
        s.gain.gain.setTargetAtTime(target, now, 0.45);
      }
      return;
    }

    if (this._poolAudio && performance.now() - (this._lastPoolAudioT || 0) > 600) {
      this._poolAudio.bus.gain.setTargetAtTime(0, now, 0.35);
    }

    // Rotate across all 10 Backrooms ambient tracks smoothly every 52s
    this.ambCycleT += dt;
    if (this.ambCycleT > 52) {
      this.ambCycleT = 0;
      const next = AMBIENT_TRACK_KEYS[(AMBIENT_TRACK_KEYS.indexOf(this.currentAmbKey) + 1) % AMBIENT_TRACK_KEYS.length];
      this.currentAmbKey = next;
    }

    // Danger / Proximity calculation
    const prox = Math.max(0, Math.min(1, 1 - (entityDist - 4) / 22)); // 0 at >=26m, 1 at <=4m
    const chaseUrgency =
      (entityVisible && entityDist < 26) ? Math.max(0.72, prox) :
      (revealActive || scanActive) ? Math.max(0.58, prox) :
      (entityDist < 14 ? prox * 0.9 : 0);

    // 1. Proximity Audio Ducking: ambient music gets quieter AND muffled as Entity closes in
    const ambTargetVol = (1 - chaseUrgency * 0.92) * (1 - prox * 0.65) * 0.48 * this.musicVol;
    const ambCutoff = Math.max(420, 16000 * Math.pow(1 - Math.max(prox, chaseUrgency * 0.7), 2.4));

    this.ambGain.gain.setTargetAtTime(ambTargetVol, now, 0.14);
    this.ambFilter.frequency.setTargetAtTime(ambCutoff, now, 0.14);

    // 2. Tense Chase Music ramps IMMEDIATELY (fast attack 0.18s, slow decay 0.9s)
    const chaseTau = chaseUrgency > 0.25 ? 0.18 : 0.95;
    const chaseTargetVol = chaseUrgency * (isKiller ? 0.42 : 0.78) * this.musicVol;
    this.chaseGain.gain.setTargetAtTime(chaseTargetVol, now, chaseTau);

    // Blend between 'apprehension' (reveal / mid-range dread), 'chaos' (direct sight), and 'null_chase' (close distortion)
    const chaosWeight = (entityVisible && entityDist < 22) || entityDist < 11
      ? Math.max(0.55, prox)
      : 0.0;
    const nullChaseWeight = entityDist < 9.5 ? Math.max(0.0, (9.5 - entityDist) / 9.5) * 0.65 : 0.0;
    const appWeight = Math.max(0, Math.min(1, 1 - chaosWeight * 0.75));

    for (const [k, s] of Object.entries(this.sources)) {
      if (AMBIENT_TRACK_KEYS.includes(k)) {
        s.gain.gain.setTargetAtTime(k === this.currentAmbKey ? 1.0 : 0.0, now, 0.75);
      } else if (k === 'apprehension') {
        s.gain.gain.setTargetAtTime(appWeight, now, 0.16);
      } else if (k === 'chaos') {
        s.gain.gain.setTargetAtTime(chaosWeight, now, 0.14);
      } else if (k === 'null_chase') {
        s.gain.gain.setTargetAtTime(nullChaseWeight, now, 0.14);
      }
    }

    // 3. Fluorescent Ceiling Hum + Organic Liminal Atmosphere (adapts across bright/dark zones & dread)
    if (this.humGain) {
      const humZone = 0.022 + zoneLight * 0.036;
      const humTarget = Math.max(0.006, humZone * (1 - prox * 0.72));
      this.humGain.gain.setTargetAtTime(humTarget, now, 0.16);
    }
    if (this.atmoGain && this.atmoDroneFilter && this.atmoAirFilter) {
      const darkBoost = 1.0 + (1.0 - zoneLight) * 0.55;
      const drift = 0.85 + 0.15 * Math.sin(now * 0.23) * Math.cos(now * 0.11);
      const atmoLvl = (paused ? 0.07 : 0.18 * darkBoost) * (1 - prox * 0.35) * drift;
      this.atmoGain.gain.setTargetAtTime(atmoLvl, now, 0.25);
      this.atmoDroneFilter.frequency.setTargetAtTime(110 + zoneLight * 42 + Math.sin(now * 0.17) * 24, now, 0.25);
      this.atmoAirFilter.frequency.setTargetAtTime(440 + (1 - zoneLight) * 160 + Math.cos(now * 0.13) * 110, now, 0.25);
    }

    // 4. Running / Sprint / Exhaustion Breathing Cycle (Survivors & guttural rasp for Entity)
    if (!paused) {
      const moveExert = sprinting ? 0.72 + speedRatio * 0.28 : (speedRatio > 0.6 ? (speedRatio - 0.6) * 0.9 : 0);
      const tiredExert = stamRatio < 0.72 ? Math.min(1, (0.72 - stamRatio) / 0.65) : 0;
      const effort = Math.max(moveExert, tiredExert * 0.95, panic * 0.72);
      if (effort > 0.18) {
        const halfCycle = Math.max(0.24, 0.52 - effort * 0.24);
        this._breathT += dt;
        if (this._breathT >= halfCycle) {
          this._breathT = 0;
          this._playBreath(this._breathInhale, effort, tiredExert, isKiller);
          this._breathInhale = !this._breathInhale;
        }
      } else {
        this._breathT = Math.max(0, this._breathT - dt * 2.0);
        this._breathInhale = true;
      }
    }

    // 5. Entity Proximity Electrical Static & Crackle ("tiếng quái vật rè rè khi đến gần")
    if (this.staticGain && this.staticFilter) {
      const staticLvl = !isKiller && entityDist < 19
        ? Math.pow(Math.max(0, 1 - (entityDist - 2.2) / 16.8), 1.45) * 0.24 * this.sfxVol
        : 0;
      const flutter = staticLvl * (0.78 + 0.32 * Math.sin(now * 27.0) * Math.cos(now * 11.3));
      this.staticGain.gain.setTargetAtTime(Math.max(0, flutter), now, 0.08);
      this.staticFilter.frequency.setTargetAtTime(750 + prox * 1650 + Math.sin(now * 19.0) * 280, now, 0.08);
    }

    // 6. Heartbeat thump scales with danger for Survivors
    if (!paused && !isKiller && prox > 0.18) {
      const interval = Math.max(0.32, 0.92 - prox * 0.58);
      this._heartT += dt;
      if (this._heartT >= interval) {
        this._heartT = 0;
        this._playHeartbeat(0.12 + prox * 0.36);
      }
    }
  }

  _playBreath(inhale, effort, exhausted = 0, isKiller = false) {
    if (!this.ctx || !this._breathBuffer || !this.sfxGain) return;
    const t = this.ctx.currentTime;
    const dur = Math.max(0.18, (inhale ? 0.26 : 0.33) - effort * 0.07);

    const src = this.ctx.createBufferSource();
    src.buffer = this._breathBuffer;
    const offset = Math.random() * Math.max(0.1, this._breathBuffer.duration - dur - 0.1);

    // Formant bandpass shapes human inhale ("hít") vs warm chesty exhale ("thở")
    const bp = this.ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.Q.value = inhale ? 2.4 : 1.75;
    const startF = isKiller ? (inhale ? 240 : 190) : (inhale ? 520 : 690);
    const endF = isKiller ? (inhale ? 320 : 125) : (inhale ? 940 : 310);
    bp.frequency.setValueAtTime(startF, t);
    bp.frequency.exponentialRampToValueAtTime(endF, t + dur);

    const lp = this.ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = isKiller ? 650 : 1950;

    const peak = Math.min(0.42, (isKiller ? 0.14 : 0.16 + effort * 0.18 + exhausted * 0.12) * (inhale ? 0.85 : 1.12));
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(peak, t + dur * (inhale ? 0.42 : 0.28));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);

    src.connect(bp);
    bp.connect(lp);
    lp.connect(g);
    g.connect(this.sfxGain);
    src.start(t, offset, dur + 0.02);

    // Subtle vocal chest rasp on heavy sprint exhale
    if (!inhale && (effort > 0.55 || isKiller)) {
      const osc = this.ctx.createOscillator();
      const og = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(isKiller ? 78 : 138, t);
      osc.frequency.exponentialRampToValueAtTime(isKiller ? 52 : 98, t + dur);
      og.gain.setValueAtTime(0.0001, t);
      og.gain.linearRampToValueAtTime(peak * (isKiller ? 0.22 : 0.10), t + dur * 0.25);
      og.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      osc.connect(og);
      og.connect(this.sfxGain);
      osc.start(t);
      osc.stop(t + dur + 0.02);
    }
  }

  /**
   * Drives mechanical ratchet clicks, sparks & electrical motor hum while repairing a Breaker Box.
   */
  updateRepairAudio(dt, repairing = false, progress = 0) {
    if (!this.ctx || !this.repairGain || !this.repairOsc) return;
    const now = this.ctx.currentTime;
    if (!repairing) {
      this.repairGain.gain.setTargetAtTime(0, now, 0.05);
      this._repairClickT = 0;
      return;
    }
    this.repairOsc.frequency.setTargetAtTime(88 + progress * 145, now, 0.08);
    this.repairGain.gain.setTargetAtTime(0.085, now, 0.06);

    this._repairClickT -= dt;
    if (this._repairClickT <= 0) {
      this._repairClickT = 0.24 + Math.random() * 0.18;
      // Metallic wrench ratchet / relay click
      const click = this.ctx.createOscillator();
      const cg = this.ctx.createGain();
      click.type = Math.random() < 0.35 ? 'sawtooth' : 'triangle';
      const baseF = 420 + Math.random() * 680;
      click.frequency.setValueAtTime(baseF, now);
      click.frequency.exponentialRampToValueAtTime(baseF * 0.42, now + 0.055);
      cg.gain.setValueAtTime(0.14, now);
      cg.gain.exponentialRampToValueAtTime(0.001, now + 0.065);
      click.connect(cg);
      cg.connect(this.sfxGain);
      click.start(now);
      click.stop(now + 0.07);

      // Occasional electric spark zap
      if (Math.random() < 0.26) {
        const len = Math.floor(this.ctx.sampleRate * 0.07);
        const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
        const d = buf.getChannelData(0);
        for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
        const src = this.ctx.createBufferSource();
        src.buffer = buf;
        const hp = this.ctx.createBiquadFilter();
        hp.type = 'bandpass';
        hp.frequency.value = 3400;
        const zg = this.ctx.createGain();
        zg.gain.value = 0.16;
        src.connect(hp); hp.connect(zg); zg.connect(this.sfxGain);
        src.start(now);
      }
    }
  }

  _playHeartbeat(vol) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    for (const [off, f, gMul] of [[0, 62, 1.0], [0.13, 52, 0.65]]) {
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, t + off);
      osc.frequency.exponentialRampToValueAtTime(28, t + off + 0.14);
      g.gain.setValueAtTime(0.001, t + off);
      g.gain.linearRampToValueAtTime(vol * gMul, t + off + 0.015);
      g.gain.exponentialRampToValueAtTime(0.001, t + off + 0.18);
      osc.connect(g);
      g.connect(this.sfxGain);
      osc.start(t + off);
      osc.stop(t + off + 0.2);
    }
  }

  _makePanner(pos, refDistance = 2.5, maxDistance = 36) {
    const p = this.ctx.createPanner();
    p.panningModel = 'HRTF';
    p.distanceModel = 'inverse';
    p.refDistance = refDistance;
    p.maxDistance = maxDistance;
    p.rolloffFactor = 1.3;
    p.positionX.value = pos.x;
    p.positionY.value = pos.y ?? 1.2;
    p.positionZ.value = pos.z;
    p.connect(this.sfxGain);
    return p;
  }

  playFootstep(pos, sprinting = false, crouching = false, isMonster = false, surface = 'carpet') {
    if (!this.ensureContext()) return;
    const t = this.ctx.currentTime;
    if (surface === 'water') {
      const wLen = isMonster ? 0.24 : sprinting ? 0.21 : 0.17;
      const wBuf = this.ctx.createBuffer(1, Math.floor(this.ctx.sampleRate * wLen), this.ctx.sampleRate);
      const wData = wBuf.getChannelData(0);
      for (let i = 0; i < wData.length; i++) {
        wData[i] = (Math.random() * 2 - 1) * Math.exp(-i / (wData.length * 0.34));
      }
      const wSrc = this.ctx.createBufferSource();
      wSrc.buffer = wBuf;
      const bp = this.ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.setValueAtTime(isMonster ? 420 : sprinting ? 1150 : 880, t);
      bp.frequency.exponentialRampToValueAtTime(340, t + wLen);
      bp.Q.value = 1.4;
      const wg = this.ctx.createGain();
      wg.gain.value = isMonster ? 0.38 : crouching ? 0.09 : sprinting ? 0.30 : 0.19;
      wSrc.connect(bp);
      bp.connect(wg);
      const wPan = this._makePanner(pos, 2.5, 34);
      wg.connect(wPan);
      wSrc.start(t);
      return;
    }
    const len = surface === 'metal' ? 0.14 : isMonster ? 0.11 : 0.085;
    const buf = this.ctx.createBuffer(1, Math.floor(this.ctx.sampleRate * len), this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (data.length * 0.24));
    }
    const src = this.ctx.createBufferSource();
    src.buffer = buf;

    const filt = this.ctx.createBiquadFilter();
    filt.type = surface === 'metal' || surface === 'tile' ? 'bandpass' : 'lowpass';
    filt.frequency.value = isMonster ? 280
      : surface === 'metal' ? 980
      : surface === 'concrete' ? 1150
      : surface === 'tile' ? 1450
      : crouching ? 390 : sprinting ? 960 : 660;

    const g = this.ctx.createGain();
    const baseGain = isMonster ? 0.38 : crouching ? 0.08 : sprinting ? 0.28 : 0.18;
    g.gain.value = baseGain;

    src.connect(filt);
    filt.connect(g);
    const pan = this._makePanner(pos, 2.0, 28);
    g.connect(pan);
    src.start(t);

    // Tactile heel-thud / hollow metal resonance / monster heavy step crunch
    if (!crouching || isMonster) {
      const thud = this.ctx.createOscillator();
      const tg = this.ctx.createGain();
      thud.type = surface === 'metal' ? 'triangle' : 'sine';
      const f0 = isMonster ? 84 : surface === 'metal' ? 310 : surface === 'concrete' || surface === 'tile' ? 155 : 108;
      thud.frequency.setValueAtTime(f0, t);
      thud.frequency.exponentialRampToValueAtTime(f0 * 0.42, t + (surface === 'metal' ? 0.16 : 0.09));
      tg.gain.setValueAtTime(isMonster ? 0.24 : sprinting ? 0.16 : 0.10, t);
      tg.gain.exponentialRampToValueAtTime(0.001, t + (surface === 'metal' ? 0.18 : 0.10));
      thud.connect(tg);
      tg.connect(pan);
      thud.start(t);
      thud.stop(t + 0.19);
    }
  }

  playJump(pos) {
    if (!this.ensureContext()) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(115, t);
    osc.frequency.exponentialRampToValueAtTime(195, t + 0.09);
    g.gain.setValueAtTime(0.11, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.11);
    osc.connect(g);
    g.connect(this._makePanner(pos, 2.0, 18));
    osc.start(t);
    osc.stop(t + 0.12);
  }

  playLand(pos, strength = 1.0) {
    if (!this.ensureContext()) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(95, t);
    osc.frequency.exponentialRampToValueAtTime(34, t + 0.14);
    g.gain.setValueAtTime(Math.min(0.32, 0.14 * strength), t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
    osc.connect(g);
    g.connect(this._makePanner(pos, 2.5, 22));
    osc.start(t);
    osc.stop(t + 0.17);
  }

  playSwing(pos) {
    if (!this.ensureContext()) return;
    const t = this.ctx.currentTime;
    const buf = this.ctx.createBuffer(1, this.ctx.sampleRate * 0.22, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) {
      d[i] = (Math.random() * 2 - 1) * Math.sin((i / d.length) * Math.PI);
    }
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const filt = this.ctx.createBiquadFilter();
    filt.type = 'bandpass';
    filt.frequency.setValueAtTime(420, t);
    filt.frequency.exponentialRampToValueAtTime(180, t + 0.2);
    const g = this.ctx.createGain();
    g.gain.value = 0.42;
    src.connect(filt);
    filt.connect(g);
    g.connect(this._makePanner(pos, 3, 28));
    src.start(t);
  }

  playFleshHit(pos) {
    if (!this.ensureContext()) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(175, t);
    osc.frequency.exponentialRampToValueAtTime(42, t + 0.19);
    g.gain.setValueAtTime(0.55, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
    osc.connect(g);
    g.connect(this._makePanner(pos, 3, 32));
    osc.start(t);
    osc.stop(t + 0.24);
  }

  playScream(pos) {
    if (!this.ensureContext()) return;
    const t = this.ctx.currentTime;
    for (const f0 of [410, 625]) {
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(f0, t);
      osc.frequency.exponentialRampToValueAtTime(f0 * 0.48, t + 0.65);
      g.gain.setValueAtTime(0.01, t);
      g.gain.linearRampToValueAtTime(0.24, t + 0.05);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.72);
      osc.connect(g);
      g.connect(this._makePanner(pos, 4, 42));
      osc.start(t);
      osc.stop(t + 0.75);
    }
  }

  playRevealStinger(pos) {
    if (!this.ensureContext()) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(140, t);
    osc.frequency.linearRampToValueAtTime(92, t + 0.9);
    const f = this.ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.setValueAtTime(340, t);
    f.frequency.exponentialRampToValueAtTime(980, t + 0.45);
    g.gain.setValueAtTime(0.01, t);
    g.gain.linearRampToValueAtTime(0.45, t + 0.08);
    g.gain.exponentialRampToValueAtTime(0.001, t + 1.0);
    osc.connect(f);
    f.connect(g);
    g.connect(this._makePanner(pos, 5, 55));
    osc.start(t);
    osc.stop(t + 1.05);
  }

  playScanPing() {
    if (!this.ensureContext()) return;
    const t = this.ctx.currentTime;
    for (let i = 0; i < 2; i++) {
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(i === 0 ? 1180 : 1560, t + i * 0.11);
      g.gain.setValueAtTime(0.22, t + i * 0.11);
      g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.11 + 0.28);
      osc.connect(g);
      g.connect(this.sfxGain);
      osc.start(t + i * 0.11);
      osc.stop(t + i * 0.11 + 0.3);
    }
  }

  playFlareHiss(pos) {
    if (!this.ensureContext()) return;
    const t = this.ctx.currentTime;
    const len = 0.55;
    const buf = this.ctx.createBuffer(1, Math.floor(this.ctx.sampleRate * len), this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const f = this.ctx.createBiquadFilter();
    f.type = 'highpass';
    f.frequency.value = 1800;
    const g = this.ctx.createGain();
    g.gain.value = 0.26;
    src.connect(f);
    f.connect(g);
    g.connect(this._makePanner(pos, 3, 28));
    src.start(t);
  }

  playTrapSnap(pos) {
    if (!this.ensureContext()) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(520, t);
    osc.frequency.exponentialRampToValueAtTime(85, t + 0.16);
    g.gain.setValueAtTime(0.42, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
    osc.connect(g);
    g.connect(this._makePanner(pos, 4, 34));
    osc.start(t);
    osc.stop(t + 0.2);
  }

  playHookClang(pos, death = false) {
    if (!this.ensureContext()) return;
    const t = this.ctx.currentTime;
    for (const f of (death ? [190, 285, 440] : [260, 410])) {
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(f, t);
      osc.frequency.exponentialRampToValueAtTime(f * 0.72, t + (death ? 1.1 : 0.45));
      g.gain.setValueAtTime(death ? 0.34 : 0.24, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + (death ? 1.15 : 0.5));
      osc.connect(g);
      g.connect(this._makePanner(pos, 5, 48));
      osc.start(t);
      osc.stop(t + (death ? 1.2 : 0.52));
    }
  }

  playConsume(kind = 'water') {
    if (!this.ensureContext()) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'sine';
    const base = kind === 'jelly' ? 540 : kind === 'ration' ? 380 : 460;
    osc.frequency.setValueAtTime(base, t);
    osc.frequency.exponentialRampToValueAtTime(base * 1.45, t + 0.18);
    g.gain.setValueAtTime(0.22, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
    osc.connect(g);
    g.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.24);
  }

  playAlertBeep() {
    if (!this.ensureContext()) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, t);
    g.gain.setValueAtTime(0.18, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
    osc.connect(g);
    g.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.18);
  }

  /**
   * Plays warm retro two-tone elevator chime + heavy metallic sliding door sound.
   */
  playElevatorSequence(pos = null) {
    if (!this.ensureContext()) return false;
    const t = this.ctx.currentTime;
    const targetOut = pos ? this._makePanner(pos, 5, 34) : this.sfxGain;

    // Two-tone brass bell ding-dong (D5 -> B4)
    const tones = [
      { freq: 587.33, start: 0.0, dur: 0.55 },
      { freq: 493.88, start: 0.22, dur: 0.78 }
    ];
    for (const tn of tones) {
      const osc = this.ctx.createOscillator();
      const overtone = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'sine';
      overtone.type = 'triangle';
      osc.frequency.setValueAtTime(tn.freq, t + tn.start);
      overtone.frequency.setValueAtTime(tn.freq * 2.0, t + tn.start);
      g.gain.setValueAtTime(0.001, t + tn.start);
      g.gain.linearRampToValueAtTime(0.24, t + tn.start + 0.015);
      g.gain.exponentialRampToValueAtTime(0.001, t + tn.start + tn.dur);
      osc.connect(g);
      overtone.connect(g);
      g.connect(targetOut);
      osc.start(t + tn.start);
      overtone.start(t + tn.start);
      osc.stop(t + tn.start + tn.dur + 0.04);
      overtone.stop(t + tn.start + tn.dur + 0.04);
    }

    // Play real recorded sliding steel elevator door if decoded, else hydraulic rumble fallback
    const doorBuf = this.sfxBuffers.sfx_elevator_door;
    if (doorBuf) {
      const src = this.ctx.createBufferSource();
      src.buffer = doorBuf;
      src.playbackRate.value = 0.92;
      const g = this.ctx.createGain();
      const startAt = t + 0.32;
      const playDur = Math.min(2.4, Math.max(0.9, doorBuf.duration));
      g.gain.setValueAtTime(0.001, startAt);
      g.gain.linearRampToValueAtTime(0.46, startAt + 0.14);
      g.gain.exponentialRampToValueAtTime(0.001, startAt + playDur);
      src.connect(g);
      g.connect(targetOut);
      src.start(startAt, 0, playDur);
    } else if (this._breathBuffer) {
      const src = this.ctx.createBufferSource();
      src.buffer = this._breathBuffer;
      const bp = this.ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.setValueAtTime(160, t + 0.32);
      bp.frequency.linearRampToValueAtTime(310, t + 1.15);
      bp.Q.value = 1.8;
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.001, t + 0.32);
      g.gain.linearRampToValueAtTime(0.32, t + 0.50);
      g.gain.exponentialRampToValueAtTime(0.001, t + 1.55);
      src.connect(bp);
      bp.connect(g);
      g.connect(targetOut);
      src.start(t + 0.32, 0, 1.3);
    }
    return true;
  }

  /**
   * Plays a spatialized eerie horror SFX at 3D world coordinates `pos`,
   * falling back cleanly to synthesized creepy foley if audio buffers aren't decoded.
   */
  playCreepySfx(preferredKey = null, pos = null, opts = {}) {
    if (!this.ensureContext()) return { played: false, key: null };
    let key = preferredKey;
    if (!key) {
      const candidates = CREEPY_RANDOM_KEYS.filter(k => k !== this._lastCreepyKey);
      key = candidates[(Math.random() * candidates.length) | 0] || CREEPY_RANDOM_KEYS[0];
    }
    this._lastCreepyKey = key;

    const p = pos || { x: 0, y: 1.4, z: 0 };
    const refDist = opts.refDistance ?? 4.5;
    const maxDist = opts.maxDistance ?? 36;
    const vol = opts.volume ?? (0.28 + Math.random() * 0.22);
    const outNode = pos ? this._makePanner(p, refDist, maxDist) : this.sfxGain;

    // Slight distance lowpass muffling so corridor walls make noises deeply ominous
    const lp = this.ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = opts.cutoffHz ?? (2600 + Math.random() * 3200);
    lp.connect(outNode);

    const buf = this.sfxBuffers[key];
    if (buf) {
      const t = this.ctx.currentTime;
      const src = this.ctx.createBufferSource();
      src.buffer = buf;
      src.playbackRate.value = 0.78 + Math.random() * 0.28;
      const dur = Math.min(3.8, Math.max(0.45, buf.duration - 0.05));
      const maxOffset = Math.max(0, buf.duration - dur - 0.05);
      const offset = maxOffset > 0.2 ? Math.random() * maxOffset : 0;

      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.001, t);
      g.gain.linearRampToValueAtTime(vol, t + Math.min(0.18, dur * 0.2));
      g.gain.setValueAtTime(vol * 0.9, t + Math.max(0.2, dur - 0.35));
      g.gain.exponentialRampToValueAtTime(0.001, t + dur);

      src.connect(g);
      g.connect(lp);
      src.start(t, offset, dur);
      return { played: true, key, x: p.x, z: p.z, synthesized: false };
    }

    // Procedural chilling Web Audio synth fallback
    const t = this.ctx.currentTime;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.001, t);
    g.gain.linearRampToValueAtTime(vol * 0.65, t + 0.08);
    g.gain.exponentialRampToValueAtTime(0.001, t + 1.35);
    g.connect(lp);

    const o1 = this.ctx.createOscillator();
    o1.type = key.includes('growl') ? 'sawtooth' : key.includes('knock') ? 'triangle' : 'sine';
    const baseF = key.includes('knock') ? 130 : key.includes('creak') ? 390 : 74;
    o1.frequency.setValueAtTime(baseF, t);
    o1.frequency.exponentialRampToValueAtTime(Math.max(28, baseF * (key.includes('creak') ? 1.38 : 0.62)), t + 1.25);
    o1.connect(g);
    o1.start(t);
    o1.stop(t + 1.4);
    return { played: true, key, x: p.x, z: p.z, synthesized: true };
  }

  /**
   * Sporadically schedules unsettling 3D horror noises around the player during gameplay
   * (including cable groans & faint whispers while waiting inside the opening Elevator!).
   */
  updateCreepySounds(dt, me, map, elevatorState = 'open') {
    if (!me || this.muted) return null;
    this._nextCreepyT -= dt;
    if (this._nextCreepyT > 0) return null;

    const inElevator = elevatorState !== 'open';
    // More frequent in tense moments; slightly longer quiet gaps after each sting so jumps stay unpredictable
    this._nextCreepyT = inElevator ? (6.5 + Math.random() * 6.0) : (8.5 + Math.random() * 11.5);

    const backBias = Math.random() < 0.65 ? Math.PI : 0;
    const angle = (me.yaw || 0) + backBias + (Math.random() - 0.5) * 1.9;
    const dist = inElevator ? (4.5 + Math.random() * 7.5) : (7.5 + Math.random() * 15.0);
    const px = me.x - Math.sin(angle) * dist;
    const pz = me.z - Math.cos(angle) * dist;

    const pool = inElevator
      ? ['sfx_creak', 'sfx_clasp', 'sfx_whisper', 'sfx_static', 'sfx_squeak']
      : CREEPY_RANDOM_KEYS;
    const filtered = pool.filter(k => k !== this._lastCreepyKey);
    const chosen = filtered[(Math.random() * filtered.length) | 0] || pool[0];
    return this.playCreepySfx(chosen, { x: px, y: 1.5, z: pz }, {
      volume: inElevator ? 0.24 : 0.34,
      cutoffHz: dist > 15 ? 2100 : 3800
    });
  }

  playWaterSplash(pos, strength = 0.65) {
    if (!this.ensureContext() || this.muted) return;
    const t = this.ctx.currentTime;
    const dur = 0.22 + strength * 0.24;
    const buf = this.ctx.createBuffer(1, Math.floor(this.ctx.sampleRate * dur), this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) {
      d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (d.length * 0.28));
    }
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const bp = this.ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(980, t);
    bp.frequency.exponentialRampToValueAtTime(260, t + dur);
    bp.Q.value = 1.1;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.01, t);
    g.gain.linearRampToValueAtTime(0.32 * strength, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(bp);
    bp.connect(g);
    const out = pos ? this._makePanner(pos, 3.0, 38) : this.sfxGain;
    g.connect(out);
    src.start(t);
  }

  playPumpActivation(pos, allDone = false) {
    if (!this.ensureContext() || this.muted) return;
    const t = this.ctx.currentTime;
    const out = pos ? this._makePanner(pos, 4.0, 48) : this.sfxGain;
    const freqs = allDone ? [220, 330, 440, 660] : [164.8, 246.9, 329.6];
    freqs.forEach((f, idx) => {
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = idx === 0 ? 'sawtooth' : 'triangle';
      const st = t + idx * 0.09;
      osc.frequency.setValueAtTime(f * 0.88, st);
      osc.frequency.exponentialRampToValueAtTime(f, st + 0.25);
      g.gain.setValueAtTime(0.001, st);
      g.gain.linearRampToValueAtTime(0.18, st + 0.04);
      g.gain.exponentialRampToValueAtTime(0.001, st + (allDone ? 1.15 : 0.7));
      osc.connect(g);
      g.connect(out);
      osc.start(st);
      osc.stop(st + 1.25);
    });
  }

  playPoolHydroBoom(pos) {
    if (!this.ensureContext() || this.muted) return;
    const t = this.ctx.currentTime;
    const out = pos ? this._makePanner(pos, 5.0, 65) : this.sfxGain;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(92, t);
    osc.frequency.exponentialRampToValueAtTime(34, t + 0.95);
    g.gain.setValueAtTime(0.001, t);
    g.gain.linearRampToValueAtTime(0.24, t + 0.04);
    g.gain.exponentialRampToValueAtTime(0.001, t + 1.15);
    osc.connect(g);
    g.connect(out);
    osc.start(t);
    osc.stop(t + 1.2);
  }

  playPoolZoneArrival(mood) {
    if (!this.ensureContext() || this.muted) return;
    const t = this.ctx.currentTime;
    const base = mood === 'deep_abyssal' || mood === 'cool_cathedral' ? 174.61 : mood === 'damp_maintenance' ? 146.83 : 261.63;
    for (const mult of [1, 1.498]) {
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(base * mult, t);
      g.gain.setValueAtTime(0.001, t);
      g.gain.linearRampToValueAtTime(0.06, t + 0.18);
      g.gain.exponentialRampToValueAtTime(0.001, t + 1.45);
      osc.connect(g);
      g.connect(this.sfxGain);
      osc.start(t);
      osc.stop(t + 1.55);
    }
  }

  _ensurePoolAudio() {
    if (this._poolAudio || !this.ensureContext()) return this._poolAudio;
    const ctx = this.ctx;
    const t = ctx.currentTime;

    const bus = ctx.createGain();
    bus.gain.value = 0.0;

    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 1800;

    const delay = ctx.createDelay(0.6);
    delay.delayTime.value = 0.21;
    const fb = ctx.createGain();
    fb.gain.value = 0.36;
    const wet = ctx.createGain();
    wet.gain.value = 0.32;

    bus.connect(lp);
    lp.connect(this.ambGain || this.master);
    lp.connect(delay);
    delay.connect(fb);
    fb.connect(lp);
    delay.connect(wet);
    wet.connect(this.ambGain || this.master);

    const mkDrone = (freqs, type, filterHz, vol) => {
      const g = ctx.createGain();
      g.gain.value = 0.0;
      const flt = ctx.createBiquadFilter();
      flt.type = 'lowpass';
      flt.frequency.value = filterHz;
      g.connect(flt);
      flt.connect(bus);
      const oscs = freqs.map((f, idx) => {
        const o = ctx.createOscillator();
        const og = ctx.createGain();
        o.type = type;
        o.frequency.setValueAtTime(f, t);
        og.gain.value = vol / Math.max(1, freqs.length * (idx === 0 ? 1.0 : 1.35));
        o.connect(og);
        og.connect(g);
        o.start(t);
        return o;
      });
      return { g, flt, oscs };
    };

    // 6 distinct Poolrooms regional music layers:
    const layers = {
      peaceful_shallow: mkDrone([174.61, 220.0, 261.63, 329.63], 'sine', 950, 0.14),
      dark_submerged: mkDrone([55.0, 82.41, 110.0], 'triangle', 320, 0.16),
      colored_sanctuary: mkDrone([196.0, 246.94, 293.66, 369.99], 'sine', 1200, 0.15),
      slide_cathedral: mkDrone([146.83, 220.0, 293.66, 440.0], 'triangle', 1100, 0.13),
      industrial_nexus: mkDrone([65.41, 98.0, 130.81], 'sawtooth', 260, 0.09),
      silent_horror: mkDrone([49.0, 73.42], 'sine', 180, 0.04)
    };

    this._poolAudio = { bus, lp, delay, fb, wet, layers };
    return this._poolAudio;
  }

  updatePoolroomsZoneAudio(dt, zone, inWater = false, me = null, map = null) {
    if (!this.ctx || this.muted || !zone) return;
    this._lastPoolAudioT = performance.now();
    const t = this.ctx.currentTime;
    const pa = this._ensurePoolAudio();
    if (!pa) return;

    // Master Poolrooms music layer balance
    const activeLayer = zone.musicLayer || (
      zone.mood === 'damp_maintenance' ? 'industrial_nexus' :
      zone.mood === 'deep_abyssal' ? 'dark_submerged' :
      zone.mood === 'cool_cathedral' || zone.mood === 'tranquil_dusk' ? 'colored_sanctuary' :
      zone.mood === 'pastel_waterpark' ? 'slide_cathedral' :
      'peaceful_shallow'
    );

    pa.bus.gain.setTargetAtTime(Math.max(0.0, this.musicVol * 0.72), t, 0.45);
    for (const [k, layer] of Object.entries(pa.layers)) {
      const target = k === activeLayer ? 1.0 : 0.0;
      layer.g.gain.setTargetAtTime(target, t, 0.75);
    }

    // Acoustic architecture presets (corridor vs cathedral vs tube vs maintenance)
    const preset = zone.acousticPreset || 'large_chamber';
    let delayT = 0.21;
    let fbGain = 0.34;
    let cutoff = 1850;
    if (preset === 'small_corridor') { delayT = 0.11; fbGain = 0.24; cutoff = 1450; }
    else if (preset === 'slide_tube') { delayT = 0.16; fbGain = 0.48; cutoff = 1150; }
    else if (preset === 'underwater_passage') { delayT = 0.26; fbGain = 0.44; cutoff = 680; }
    else if (preset === 'maintenance_room') { delayT = 0.13; fbGain = 0.22; cutoff = 960; }
    else if (preset === 'vaulted_cathedral') { delayT = 0.35; fbGain = 0.56; cutoff = 2600; }

    if (inWater) cutoff = Math.min(cutoff, 480);
    pa.delay.delayTime.setTargetAtTime(delayT, t, 0.35);
    pa.fb.gain.setTargetAtTime(fbGain, t, 0.35);
    pa.lp.frequency.setTargetAtTime(cutoff, t, 0.35);

    // Sparse delicate glass-chime note inside peaceful/colored/slide sanctuary zones (almost silent in silent_horror)
    this._nextPadChimeT -= dt;
    if (this._nextPadChimeT <= 0) {
      this._nextPadChimeT = activeLayer === 'silent_horror' ? 14 : (2.8 + Math.random() * 4.2);
      if (activeLayer !== 'silent_horror' && Math.random() < 0.85) {
        const scales = {
          peaceful_shallow: [523.25, 587.33, 659.25, 783.99, 880.0],
          dark_submerged: [220.0, 261.63, 329.63, 392.0],
          colored_sanctuary: [493.88, 587.33, 659.25, 739.99, 880.0],
          slide_cathedral: [440.0, 587.33, 659.25, 880.0],
          industrial_nexus: [196.0, 293.66, 329.63]
        };
        const notes = scales[activeLayer] || scales.peaceful_shallow;
        const freq = notes[(Math.random() * notes.length) | 0];
        const o = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        o.type = 'sine';
        o.frequency.setValueAtTime(freq, t);
        g.gain.setValueAtTime(0.0001, t);
        g.gain.linearRampToValueAtTime(0.032 * this.musicVol, t + 0.08);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 2.4);
        o.connect(g);
        g.connect(pa.lp);
        o.start(t);
        o.stop(t + 2.5);
      }
    }

    if (this.humGain) {
      const targetHum = activeLayer === 'industrial_nexus' ? 0.036 : activeLayer === 'dark_submerged' ? 0.020 : 0.011;
      this.humGain.gain.setTargetAtTime(targetHum, t, 0.45);
    }
    if (this.atmoDroneFilter) {
      const aCut = inWater ? 240 : activeLayer === 'dark_submerged' ? 310 : activeLayer === 'silent_horror' ? 280 : 620;
      this.atmoDroneFilter.frequency.setTargetAtTime(aCut, t, 0.35);
    }
  }

  stopPhantomFootsteps() {
    if (!this._phantomTimers?.length) return;
    while (this._phantomTimers.length) clearTimeout(this._phantomTimers.pop());
  }

  playPhantomFootsteps(pos, style = 'wet_slap', occluded = false) {
    if (!this.ensureContext() || this.muted) return;
    this.stopPhantomFootsteps();
    const steps = style === 'hurried_fade' ? 4 : style === 'overhead_echo' ? 3 : 3;
    const baseIntervalMs = style === 'hurried_fade' ? 270 : style === 'shallow_wade' ? 480 : 410;
    for (let i = 0; i < steps; i++) {
      const tid = setTimeout(() => {
        if (!this.ctx || this.muted) return;
        const t = this.ctx.currentTime;
        const stepPos = {
          x: pos.x + (style === 'hurried_fade' ? i * 0.95 : (Math.random() - 0.5) * 0.5),
          y: pos.y ?? 1.4,
          z: pos.z + (style === 'hurried_fade' ? i * 0.95 : (Math.random() - 0.5) * 0.5)
        };
        const out = this._makePanner(stepPos, 3.0, 38);
        const lp = this.ctx.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.value = occluded ? (style === 'overhead_echo' ? 920 : 780) : (style === 'overhead_echo' ? 1850 : 2400);
        lp.connect(out);

        // Soft noise slap + thump
        const dur = style === 'shallow_wade' ? 0.24 : 0.14;
        const buf = this.ctx.createBuffer(1, Math.floor(this.ctx.sampleRate * dur), this.ctx.sampleRate);
        const data = buf.getChannelData(0);
        for (let k = 0; k < data.length; k++) {
          data[k] = (Math.random() * 2 - 1) * Math.exp(-k / (data.length * (style === 'shallow_wade' ? 0.42 : 0.22)));
        }
        const src = this.ctx.createBufferSource();
        src.buffer = buf;
        const bp = this.ctx.createBiquadFilter();
        bp.type = 'bandpass';
        bp.frequency.value = style === 'shallow_wade' ? 680 : 1250;
        bp.Q.value = 1.6;
        const gainFade = style === 'hurried_fade' ? Math.max(0.28, 1.0 - i * 0.22) : 0.85;
        const g = this.ctx.createGain();
        g.gain.setValueAtTime(0.001, t);
        g.gain.linearRampToValueAtTime(0.24 * gainFade, t + 0.015);
        g.gain.exponentialRampToValueAtTime(0.001, t + dur);
        src.connect(bp);
        bp.connect(g);
        g.connect(lp);
        src.start(t);

        const thump = this.ctx.createOscillator();
        const tg = this.ctx.createGain();
        thump.type = 'sine';
        thump.frequency.setValueAtTime(style === 'overhead_echo' ? 95 : 138, t);
        thump.frequency.exponentialRampToValueAtTime(48, t + 0.09);
        tg.gain.setValueAtTime(0.001, t);
        tg.gain.linearRampToValueAtTime(0.16 * gainFade, t + 0.008);
        tg.gain.exponentialRampToValueAtTime(0.001, t + 0.11);
        thump.connect(tg);
        tg.connect(lp);
        thump.start(t);
        thump.stop(t + 0.12);
      }, i * baseIntervalMs);
      this._phantomTimers.push(tid);
    }
  }

  playPhantomObjectMove(pos, kind = 'chair_scrape', occluded = false) {
    if (!this.ensureContext() || this.muted) return;
    const t = this.ctx.currentTime;
    const out = this._makePanner(pos || { x: 0, y: 1.0, z: 0 }, 3.5, 44);
    const lp = this.ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = occluded ? 950 : 2800;
    lp.connect(out);

    if (kind === 'chair_scrape' || kind === 'hatch_thud') {
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      o.type = kind === 'chair_scrape' ? 'sawtooth' : 'triangle';
      const f0 = kind === 'chair_scrape' ? 185 : 88;
      const dur = kind === 'chair_scrape' ? 0.55 : 0.35;
      o.frequency.setValueAtTime(f0, t);
      o.frequency.exponentialRampToValueAtTime(Math.max(36, f0 * 0.58), t + dur);
      g.gain.setValueAtTime(0.001, t);
      g.gain.linearRampToValueAtTime(0.16, t + 0.04);
      g.gain.exponentialRampToValueAtTime(0.001, t + dur);
      o.connect(g);
      g.connect(lp);
      o.start(t);
      o.stop(t + dur + 0.04);
    } else {
      // Metallic ladder_rattle / pole_clatter / pipe_knock
      const hits = kind === 'pipe_knock' ? 2 : 3;
      const baseFreq = kind === 'ladder_rattle' ? 620 : kind === 'pole_clatter' ? 860 : 240;
      for (let i = 0; i < hits; i++) {
        const st = t + i * (kind === 'pipe_knock' ? 0.24 : 0.11);
        const o = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        o.type = 'triangle';
        o.frequency.setValueAtTime(baseFreq * (1 + i * 0.07), st);
        o.frequency.exponentialRampToValueAtTime(baseFreq * 0.72, st + 0.22);
        g.gain.setValueAtTime(0.001, st);
        g.gain.linearRampToValueAtTime(0.15, st + 0.008);
        g.gain.exponentialRampToValueAtTime(0.001, st + 0.26);
        o.connect(g);
        g.connect(lp);
        o.start(st);
        o.stop(st + 0.28);
      }
    }
  }

  playPhantomAquaticMove(pos, kind = 'gentle_submerge', occluded = false) {
    if (!this.ensureContext() || this.muted) return;
    const strokes = kind === 'swim_strokes' ? 3 : kind === 'bubble_trail' ? 4 : 1;
    const stepMs = kind === 'bubble_trail' ? 140 : 520;
    for (let i = 0; i < strokes; i++) {
      const tid = setTimeout(() => {
        if (!this.ctx || this.muted) return;
        const t = this.ctx.currentTime;
        const out = this._makePanner(pos || { x: 0, y: 0.2, z: 0 }, 3.5, 46);
        const lp = this.ctx.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.value = occluded ? 780 : 2100;
        lp.connect(out);
        if (kind === 'bubble_trail') {
          const o = this.ctx.createOscillator();
          const g = this.ctx.createGain();
          o.type = 'sine';
          const f = 320 + Math.random() * 280;
          o.frequency.setValueAtTime(f, t);
          o.frequency.exponentialRampToValueAtTime(f * 1.45, t + 0.12);
          g.gain.setValueAtTime(0.001, t);
          g.gain.linearRampToValueAtTime(0.12, t + 0.02);
          g.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
          o.connect(g);
          g.connect(lp);
          o.start(t);
          o.stop(t + 0.16);
        } else {
          const dur = kind === 'gentle_submerge' ? 0.55 : 0.34;
          const buf = this.ctx.createBuffer(1, Math.floor(this.ctx.sampleRate * dur), this.ctx.sampleRate);
          const data = buf.getChannelData(0);
          for (let k = 0; k < data.length; k++) {
            data[k] = (Math.random() * 2 - 1) * Math.exp(-k / (data.length * 0.38));
          }
          const src = this.ctx.createBufferSource();
          src.buffer = buf;
          const bp = this.ctx.createBiquadFilter();
          bp.type = 'bandpass';
          bp.frequency.setValueAtTime(kind === 'bridge_drip' ? 1200 : 540, t);
          bp.frequency.exponentialRampToValueAtTime(190, t + dur);
          const g = this.ctx.createGain();
          g.gain.setValueAtTime(0.001, t);
          g.gain.linearRampToValueAtTime(0.22, t + 0.05);
          g.gain.exponentialRampToValueAtTime(0.001, t + dur);
          src.connect(bp);
          bp.connect(g);
          g.connect(lp);
          src.start(t);
        }
      }, i * stepMs);
      this._phantomTimers.push(tid);
    }
  }
}

export const audio = new AudioManager();
