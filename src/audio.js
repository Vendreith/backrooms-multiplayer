/*!
 * Copyright (c) 2026 Vendreith (Original Code & Procedural Implementation).
 * Adapted Backrooms level/entity concepts & lore: licensed under CC BY-SA 3.0.
 * Licensing & attribution: see LICENSE.md, ATTRIBUTION.md, and THIRD_PARTY_NOTICES.md
 */

import { THREE, PreloaderSystem } from './engine.js';
import { getPoolroomsCellAt } from './levels/poolrooms_cells.js';

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
  lvl0_hum: './audio/backrooms_level0_theme.mp3',
  lvl2_pipes: './audio/backrooms_level2_theme.mp3',
  lvl5_hotel: './audio/backrooms_level5_hotel.mp3',
  lvl6_dark: './audio/backrooms_level6_dark.mp3',
  lvlfun_party: './audio/backrooms_level_fun.mp3',
  lvl122_mall: './audio/backrooms_level122_mall.mp3',
  lvl18_abyss: './audio/backrooms_level18_abyss.mp3',
  lvl_hub: './audio/backrooms_the_hub.mp3',
  deep_noise: './audio/ambient_deep_noise.mp3',
  phantom_space: './audio/ambient_phantom.mp3',
  ghost_story: './audio/ambient_ghost_story.mp3',
  come_play: './audio/ambient_come_play.mp3',
  apprehension: './audio/chase_apprehension.mp3',
  chaos: './audio/chase_chaos.mp3',
  null_chase: './audio/null_protocol_chase.mp3',
  chase_pulse: './audio/chase_pulse.mp3',
  chase_faster: './audio/chase_pulse_faster.mp3',
  chase_night: './audio/chase_night_chaos.mp3',
  chase_nerves: './audio/chase_nerves.mp3',
  chase_redlands: './audio/chase_redlands.mp3',
  chase_evacuation: './audio/chase_evacuation.mp3'
};

export const HORROR_SFX_TRACKS = {
  sfx_jumpscare: './audio/sfx_jumpscare.ogg',
  sfx_sprint_breath: './audio/sfx_sprint_breath.ogg',
  sfx_horror_breath: './audio/sfx_horror_breath.ogg',
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
  'lvl0_hum',
  'burning',
  'ghost_story',
  'deep_noise',
  'lvl2_pipes',
  'lvl5_hotel',
  'lvl6_dark',
  'lvl18_abyss',
  'lvl122_mall',
  'lvlfun_party',
  'lvl_hub',
  'phantom_space',
  'come_play',
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

export const CHASE_TRACK_KEYS = [
  'chaos',
  'chase_faster',
  'chase_night',
  'chase_redlands',
  'chase_evacuation',
  'chase_pulse',
  'chase_nerves',
  'apprehension',
  'null_chase'
];

export const MUSIC_LABELS = {
  lvl0_hum: 'Backrooms Level 0 Theme (Piem Ion)',
  lvl2_pipes: 'Backrooms Level 2 Pipe Dreams (Piem Ion)',
  lvl5_hotel: 'Backrooms Level 5 Terror Hotel (Piem Ion)',
  lvl6_dark: 'Backrooms Level 6 Lights Out (Piem Ion)',
  lvlfun_party: 'Backrooms Level Fun (Piem Ion)',
  lvl122_mall: 'Backrooms Level 122 Mallsoft (Piem Ion)',
  lvl18_abyss: 'Backrooms Level 18.1 Lucid Abyss (Piem Ion)',
  lvl_hub: 'Backrooms The Hub Theme (Piem Ion)',
  deep_noise: 'Deep Noise (Kevin MacLeod)',
  phantom_space: 'Phantom from Space (Kevin MacLeod)',
  ghost_story: 'Ghost Story (Kevin MacLeod)',
  come_play: 'Come Play with Me (Kevin MacLeod)',
  burning: 'Burning Memory (1931 Ballroom)',
  ballroom: 'The Very Thought of You (Slowed)',
  sweetest: 'Love is the Sweetest Thing (Warped)',
  faded: 'Faded Angel (1931 Tape Decay)',
  velvet: 'Velvet Corridor (Distant Phonograph)',
  daisy: 'Daisy Bell (VHS Music Box)',
  poolrooms: 'Poolrooms Tiled Reverie',
  async_atmo: 'A-Sync KV-31 Threshold Resonance',
  bewildered: 'Slightly Bewildered',
  spacial: 'Spacial Winds (Kevin MacLeod)'
};

const LEVEL_AMBIENT_HINTS = {
  level0: ['lvl0_hum', 'burning', 'ghost_story', 'bewildered'],
  level1: ['lvl_hub', 'deep_noise', 'async_atmo'],
  level2: ['lvl2_pipes', 'deep_noise', 'lvl_hub'],
  level3: ['lvl2_pipes', 'deep_noise', 'async_atmo'],
  level4: ['lvl122_mall', 'lvl0_hum', 'spacial'],
  level5: ['lvl5_hotel', 'ballroom', 'velvet'],
  level6: ['lvl6_dark', 'deep_noise', 'phantom_space'],
  level7: ['lvl18_abyss', 'phantom_space', 'deep_noise'],
  level8: ['lvl6_dark', 'deep_noise', 'ghost_story'],
  level9: ['ghost_story', 'phantom_space', 'faded'],
  level10: ['spacial', 'phantom_space', 'lvl18_abyss'],
  level11: ['lvl122_mall', 'spacial', 'velvet'],
  level14: ['lvl18_abyss', 'phantom_space', 'ghost_story'],
  level19: ['lvl5_hotel', 'faded', 'come_play'],
  level37: ['poolrooms', 'lvl18_abyss', 'spacial'],
  level48: ['lvl18_abyss', 'spacial', 'faded'],
  level94: ['lvlfun_party', 'come_play', 'daisy'],
  level188: ['lvl5_hotel', 'sweetest', 'lvl122_mall'],
  level974: ['come_play', 'lvlfun_party', 'daisy'],
  level9223: ['lvl18_abyss', 'phantom_space', 'lvl6_dark'],
  levelrun: ['lvl6_dark', 'deep_noise']
};

const LEVEL_CHASE_HINTS = {
  levelrun: 'chase_redlands',
  level2: 'chase_evacuation',
  level3: 'chase_nerves',
  level6: 'chase_night',
  level37: 'chase_pulse',
  level94: 'chase_faster',
  level0: 'chaos'
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
    this._wasExhausted = false;
    this._sprintDurationT = 0;
    this.staticGain = null;
    this.staticFilter = null;
    this.repairOsc = null;
    this.repairGain = null;
    this._repairClickT = 0;
    this.currentAmbKey = 'lvl0_hum';
    this.currentChaseKey = 'chaos';
    this._levelId = 'level0';
    this.ambCycleT = 0;
    this.chaseCycleT = 0;
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

  setLevelMusicContext(levelId = 'level0') {
    this._levelId = levelId || 'level0';
    const ambPool = LEVEL_AMBIENT_HINTS[this._levelId];
    if (ambPool && ambPool.length) {
      this.currentAmbKey = ambPool[0];
      this.ambCycleT = 0;
    }
    const chaseHint = LEVEL_CHASE_HINTS[this._levelId];
    if (chaseHint && CHASE_TRACK_KEYS.includes(chaseHint)) {
      this.currentChaseKey = chaseHint;
      this.chaseCycleT = 0;
    }
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
    const sfxOrder = [
      'sfx_jumpscare', 'sfx_sprint_breath', 'sfx_horror_breath',
      ...Object.keys(HORROR_SFX_TRACKS)
    ];
    for (const key of new Set(sfxOrder)) {
      const raw = this.sfxRawBuffers[key];
      if (!raw || this.sfxBuffers[key] || this.decoding.has(`sfx:${key}`)) continue;
      this.decoding.add(`sfx:${key}`);
      try {
        const copy = raw.slice(0);
        this.sfxBuffers[key] = await this.ctx.decodeAudioData(copy);
      } catch (e) {
        console.warn('SFX decode failed:', key, e);
      } finally {
        this.decoding.delete(`sfx:${key}`);
      }
    }
    const musicOrder = [
      'lvl0_hum', 'burning', 'chaos', 'apprehension', 'chase_pulse', 'chase_faster',
      'chase_redlands', 'chase_evacuation', 'poolrooms', 'daisy', 'ghost_story',
      'deep_noise', 'null_chase', ...Object.keys(MUSIC_TRACKS)
    ];
    for (const key of new Set(musicOrder)) {
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
  }

  _ensureTrackPlaying(key) {
    if (!this.ctx || !this.audioBuffers[key] || this.sources[key]) return;
    const src = this.ctx.createBufferSource();
    src.buffer = this.audioBuffers[key];
    src.loop = true;

    const trackGain = this.ctx.createGain();
    trackGain.gain.value = 0;

    const isChase = CHASE_TRACK_KEYS.includes(key);
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
    zoneAcoustic = 'standard',
    panic = 0
  }) {
    if (!this.ctx || !this.ambGain || !this.chaseGain) return;
    const now = this.ctx.currentTime;
    this._zoneAcoustic = zoneAcoustic || 'standard';

    if (!inGame) {
      this._classicHum?.gain.gain.setTargetAtTime(0,now,.25);
      if(this._classicHum)this._classicHum.target=0;
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

    // Rotate across all 22 Backrooms ambient tracks smoothly every 50s
    this.ambCycleT += dt;
    if (this.ambCycleT > 50 || (!this.sources[this.currentAmbKey] && Object.keys(this.sources).length)) {
      this.ambCycleT = 0;
      const curIdx = AMBIENT_TRACK_KEYS.indexOf(this.currentAmbKey);
      for (let step = 1; step <= AMBIENT_TRACK_KEYS.length; step++) {
        const cand = AMBIENT_TRACK_KEYS[(Math.max(0, curIdx) + step) % AMBIENT_TRACK_KEYS.length];
        if (this.sources[cand]) {
          this.currentAmbKey = cand;
          break;
        }
      }
    }

    // Danger / Proximity calculation
    const prox = Math.max(0, Math.min(1, 1 - (entityDist - 4) / 26)); // 0 at >=30m, 1 at <=4m
    const chaseUrgency =
      (entityVisible && entityDist < 30) ? Math.max(0.76, prox) :
      (revealActive || scanActive) ? Math.max(0.62, prox) :
      (entityDist < 17 ? prox * 0.94 : 0);

    // Rotate active intense chase tracks during prolonged hunts
    const hardChasePool = ['chaos', 'chase_faster', 'chase_night', 'chase_redlands', 'chase_evacuation', 'chase_pulse'];
    if (chaseUrgency > 0.35) {
      this.chaseCycleT += dt;
      if (this.chaseCycleT > 26 || !this.sources[this.currentChaseKey]) {
        this.chaseCycleT = 0;
        const ci = hardChasePool.indexOf(this.currentChaseKey);
        for (let step = 1; step <= hardChasePool.length; step++) {
          const cand = hardChasePool[(Math.max(0, ci) + step) % hardChasePool.length];
          if (this.sources[cand]) {
            this.currentChaseKey = cand;
            break;
          }
        }
      }
    }

    // 1. Proximity Audio Ducking: ambient music gets quieter AND muffled as Entity closes in
    const ambTargetVol = (1 - chaseUrgency * 0.92) * (1 - prox * 0.65) * 0.48 * this.musicVol;
    const ambCutoff = Math.max(420, 16000 * Math.pow(1 - Math.max(prox, chaseUrgency * 0.7), 2.4));

    this.ambGain.gain.setTargetAtTime(ambTargetVol, now, 0.14);
    this.ambFilter.frequency.setTargetAtTime(ambCutoff, now, 0.14);

    // 2. Tense Chase Music ramps IMMEDIATELY (fast attack 0.16s, slow decay 0.9s)
    const chaseTau = chaseUrgency > 0.25 ? 0.16 : 0.95;
    const chaseTargetVol = chaseUrgency * (isKiller ? 0.46 : 0.84) * this.musicVol;
    this.chaseGain.gain.setTargetAtTime(chaseTargetVol, now, chaseTau);

    // Blend pre-chase dread ('apprehension'/'chase_nerves') with active intense chase track + close 'null_chase' static distortion
    const activeChaseKey = this.sources[this.currentChaseKey] ? this.currentChaseKey : (this.sources.chaos ? 'chaos' : 'apprehension');
    const chaosWeight = (entityVisible && entityDist < 26) || entityDist < 13
      ? Math.max(0.62, prox)
      : 0.0;
    const nullChaseWeight = entityDist < 10.5 ? Math.max(0.0, (10.5 - entityDist) / 10.5) * 0.62 : 0.0;
    const dreadKey = this.sources.chase_nerves && this._levelId !== 'level0' ? 'chase_nerves' : 'apprehension';
    const appWeight = Math.max(0, Math.min(1, 1 - chaosWeight * 0.78));

    for (const [k, s] of Object.entries(this.sources)) {
      if (AMBIENT_TRACK_KEYS.includes(k)) {
        s.gain.gain.setTargetAtTime(k === this.currentAmbKey ? 1.0 : 0.0, now, 0.75);
      } else if (k === activeChaseKey) {
        s.gain.gain.setTargetAtTime(chaosWeight, now, 0.14);
      } else if (k === dreadKey) {
        s.gain.gain.setTargetAtTime(appWeight, now, 0.16);
      } else if (k === 'null_chase') {
        s.gain.gain.setTargetAtTime(nullChaseWeight, now, 0.14);
      } else if (CHASE_TRACK_KEYS.includes(k)) {
        s.gain.gain.setTargetAtTime(0.0, now, 0.28);
      }
    }

    // 3. Fluorescent Ceiling Hum + Organic Liminal Atmosphere (adapts across bright/dark & acoustic zone types)
    const ac = this._zoneAcoustic || 'standard';
    if (this.humGain) {
      const acHum = ac === 'industrial' ? 1.24 : ac === 'muffled' ? 0.68 : ac === 'cathedral' ? 0.80 : 1.0;
      const humZone = (0.022 + zoneLight * 0.036) * acHum;
      const humTarget = Math.max(0.005, humZone * (1 - prox * 0.72));
      this.humGain.gain.setTargetAtTime(humTarget, now, 0.16);
    }
    if (this.atmoGain && this.atmoDroneFilter && this.atmoAirFilter) {
      const darkBoost = 1.0 + (1.0 - zoneLight) * 0.55;
      const acBoost = ac === 'cathedral' ? 1.18 : ac === 'industrial' ? 1.12 : ac === 'muffled' ? 0.78 : 1.0;
      const drift = 0.85 + 0.15 * Math.sin(now * 0.23) * Math.cos(now * 0.11);
      const atmoLvl = (paused ? 0.07 : 0.18 * darkBoost * acBoost) * (1 - prox * 0.35) * drift;
      this.atmoGain.gain.setTargetAtTime(atmoLvl, now, 0.25);
      const droneFreq = ac === 'industrial' ? 132 : ac === 'cathedral' ? 88 : ac === 'muffled' ? 76 : 110;
      const airFreq = ac === 'corridor' ? 560 : ac === 'muffled' ? 280 : ac === 'cathedral' ? 350 : 440;
      this.atmoDroneFilter.frequency.setTargetAtTime(droneFreq + zoneLight * 42 + Math.sin(now * 0.17) * 24, now, 0.25);
      this.atmoAirFilter.frequency.setTargetAtTime(airFreq + (1 - zoneLight) * 160 + Math.cos(now * 0.13) * 110, now, 0.25);
    }

    // 4. Tactile Heavy Sprint / Exhaustion Breathing Cycle (clear audible panting while sprinting!)
    if (!paused) {
      const activeSprint = sprinting && speedRatio > 0.42;
      this._sprintDurationT = activeSprint
        ? Math.min(10, this._sprintDurationT + dt)
        : Math.max(0, this._sprintDurationT - dt * 1.45);
      const moveExert = activeSprint
        ? Math.min(1.0, 0.76 + speedRatio * 0.22 + Math.min(0.18, this._sprintDurationT * 0.04))
        : (speedRatio > 0.65 ? (speedRatio - 0.60) * 0.85 : 0);
      const tiredExert = stamRatio < 0.76 ? Math.min(1, (0.76 - stamRatio) / 0.68) : 0;
      if (!isKiller && !this._wasExhausted && stamRatio < 0.20) {
        this.playExhaustedGasp();
      }
      this._wasExhausted = stamRatio < 0.30;

      const effort = Math.max(moveExert, tiredExert, panic * 0.72);
      if (effort > 0.15) {
        const halfCycle = Math.max(0.20, 0.43 - effort * 0.20);
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

    // 5. Entity Proximity Electrical Static & Crackle
    if (this.staticGain && this.staticFilter) {
      const staticLvl = !isKiller && entityDist < 20
        ? Math.pow(Math.max(0, 1 - (entityDist - 2.2) / 17.8), 1.45) * 0.24 * this.sfxVol
        : 0;
      const flutter = staticLvl * (0.78 + 0.32 * Math.sin(now * 27.0) * Math.cos(now * 11.3));
      this.staticGain.gain.setTargetAtTime(Math.max(0, flutter), now, 0.08);
      this.staticFilter.frequency.setTargetAtTime(750 + prox * 1650 + Math.sin(now * 19.0) * 280, now, 0.08);
    }

    // 6. Heartbeat thump scales with danger for Survivors
    if (!paused && !isKiller && prox > 0.16) {
      const interval = Math.max(0.30, 0.90 - prox * 0.58);
      this._heartT += dt;
      if (this._heartT >= interval) {
        this._heartT = 0;
        this._playHeartbeat(0.14 + prox * 0.38);
      }
    }
  }

  playExhaustedGasp() {
    if (!this.ctx || !this.sfxGain) return;
    const t = this.ctx.currentTime;
    const clip = this.sfxBuffers.sfx_horror_breath || this.sfxBuffers.sfx_sprint_breath;
    if (clip) {
      const src = this.ctx.createBufferSource();
      src.buffer = clip;
      const bp = this.ctx.createBiquadFilter();
      bp.type = 'lowpass';
      bp.frequency.value = 2800;
      const g = this.ctx.createGain();
      const dur = Math.min(0.68, Math.max(0.25, clip.duration * 0.35));
      g.gain.setValueAtTime(0.001, t);
      g.gain.linearRampToValueAtTime(0.46, t + 0.06);
      g.gain.exponentialRampToValueAtTime(0.001, t + dur);
      src.connect(bp); bp.connect(g); g.connect(this.sfxGain);
      const off = Math.random() * Math.max(0.05, clip.duration - dur - 0.05);
      src.start(t, off, dur + 0.03);
    }
  }

  _playBreath(inhale, effort, exhausted = 0, isKiller = false) {
    if (!this.ctx || !this.sfxGain) return;
    const t = this.ctx.currentTime;
    const dur = Math.max(0.18, (inhale ? 0.25 : 0.32) - effort * 0.07);

    // 1. Prefer real recorded CC0 breathing clip layer when decoded (makes sprint panting vividly tactile!)
    const realClip = (!isKiller && (exhausted > 0.45 && this.sfxBuffers.sfx_horror_breath))
      ? this.sfxBuffers.sfx_horror_breath
      : (!isKiller ? this.sfxBuffers.sfx_sprint_breath : null);
    if (realClip) {
      const rSrc = this.ctx.createBufferSource();
      rSrc.buffer = realClip;
      rSrc.playbackRate.value = (inhale ? 1.06 : 0.94) + effort * 0.14;
      const rFilt = this.ctx.createBiquadFilter();
      rFilt.type = 'bandpass';
      rFilt.frequency.setValueAtTime(inhale ? 780 : 520, t);
      rFilt.Q.value = 0.85;
      const rGain = this.ctx.createGain();
      const rPeak = Math.min(0.56, (0.28 + effort * 0.20 + exhausted * 0.14) * (inhale ? 0.86 : 1.15));
      rGain.gain.setValueAtTime(0.0001, t);
      rGain.gain.linearRampToValueAtTime(rPeak, t + dur * (inhale ? 0.36 : 0.22));
      rGain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      const off = Math.random() * Math.max(0.05, realClip.duration - dur - 0.12);
      rSrc.connect(rFilt); rFilt.connect(rGain); rGain.connect(this.sfxGain);
      rSrc.start(t, off, dur + 0.04);
    }

    // 2. Procedural respiratory formant cushion / fallback before OGG decode
    if (!this._breathBuffer) return;
    const src = this.ctx.createBufferSource();
    src.buffer = this._breathBuffer;
    const offset = Math.random() * Math.max(0.1, this._breathBuffer.duration - dur - 0.1);

    const bp = this.ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.Q.value = inhale ? 2.2 : 1.65;
    const startF = isKiller ? (inhale ? 240 : 190) : (inhale ? 540 : 710);
    const endF = isKiller ? (inhale ? 320 : 125) : (inhale ? 980 : 320);
    bp.frequency.setValueAtTime(startF, t);
    bp.frequency.exponentialRampToValueAtTime(endF, t + dur);

    const lp = this.ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = isKiller ? 650 : 2100;

    const scaleSynth = realClip ? 0.45 : 1.12;
    const peak = Math.min(0.46, (isKiller ? 0.16 : 0.22 + effort * 0.20 + exhausted * 0.14) * (inhale ? 0.86 : 1.14) * scaleSynth);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(peak, t + dur * (inhale ? 0.40 : 0.26));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);

    src.connect(bp);
    bp.connect(lp);
    lp.connect(g);
    g.connect(this.sfxGain);
    src.start(t, offset, dur + 0.02);

    if (!inhale && (effort > 0.50 || isKiller)) {
      const osc = this.ctx.createOscillator();
      const og = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(isKiller ? 78 : 142, t);
      osc.frequency.exponentialRampToValueAtTime(isKiller ? 52 : 98, t + dur);
      og.gain.setValueAtTime(0.0001, t);
      og.gain.linearRampToValueAtTime(peak * (isKiller ? 0.24 : 0.14), t + dur * 0.25);
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

  /**
   * High-impact terrifying monster Jumpscare burst combining recorded shriek + chest-thumping sub slam + dissonant shriek.
   */
  playJumpscare(aiKind = 'bacteria', isDown = false, isAmbush = false) {
    if (!this.ensureContext() || this.muted) return;
    const t = this.ctx.currentTime;
    const mult = isDown ? 1.0 : isAmbush ? 0.78 : 0.92;

    // 1. Pre-baked CC0 multi-monster jumpscare shriek
    const clip = this.sfxBuffers.sfx_jumpscare;
    if (clip) {
      const src = this.ctx.createBufferSource();
      src.buffer = clip;
      src.playbackRate.value = aiKind === 'smiler' || aiKind === 'howler' ? 1.07 : aiKind === 'duller' || aiKind === 'skin_stealer' ? 0.90 : 1.0;
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.95 * mult, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + Math.min(1.65, clip.duration));
      src.connect(g);
      g.connect(this.sfxGain);
      src.start(t);
    }

    // 2. Massive sub-bass impact slam (85Hz -> 28Hz) so the hit feels physical
    const slam = this.ctx.createOscillator();
    const slamG = this.ctx.createGain();
    slam.type = 'sine';
    slam.frequency.setValueAtTime(92, t);
    slam.frequency.exponentialRampToValueAtTime(27, t + 0.42);
    slamG.gain.setValueAtTime(0.001, t);
    slamG.gain.linearRampToValueAtTime(0.85 * mult, t + 0.012);
    slamG.gain.exponentialRampToValueAtTime(0.001, t + 0.48);
    slam.connect(slamG);
    slamG.connect(this.sfxGain);
    slam.start(t);
    slam.stop(t + 0.5);

    // 3. Dissonant metallic screech chord & clipped static burst (ensures visceral punch even before decode)
    const freqs = (aiKind === 'smiler' || aiKind === 'howler')
      ? [515, 742, 1080]
      : (aiKind === 'skin_stealer' || aiKind === 'duller')
        ? [165, 238, 490]
        : [330, 472, 845];
    for (const f0 of freqs) {
      const osc = this.ctx.createOscillator();
      const og = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(f0, t);
      osc.frequency.linearRampToValueAtTime(f0 * (isDown ? 1.16 : 0.86), t + 0.22);
      osc.frequency.exponentialRampToValueAtTime(f0 * 0.44, t + 0.92);
      og.gain.setValueAtTime(0.001, t);
      og.gain.linearRampToValueAtTime((clip ? 0.14 : 0.28) * mult, t + 0.018);
      og.gain.exponentialRampToValueAtTime(0.001, t + 0.96);
      osc.connect(og);
      og.connect(this.sfxGain);
      osc.start(t);
      osc.stop(t + 0.98);
    }

    const noiseLen = Math.floor(this.ctx.sampleRate * 0.45);
    const nBuf = this.ctx.createBuffer(1, noiseLen, this.ctx.sampleRate);
    const nd = nBuf.getChannelData(0);
    for (let i = 0; i < noiseLen; i++) {
      nd[i] = (Math.random() * 2 - 1) * Math.exp(-i / (noiseLen * 0.36));
    }
    const nSrc = this.ctx.createBufferSource();
    nSrc.buffer = nBuf;
    const bp = this.ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(1750, t);
    bp.Q.value = 0.7;
    const ng = this.ctx.createGain();
    ng.gain.value = 0.52 * mult;
    nSrc.connect(bp); bp.connect(ng); ng.connect(this.sfxGain);
    nSrc.start(t);
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

  updateClassicAmbience(classic,player){
    if(!this.ctx)return;
    if(!classic||!player){this._classicHum?.gain.gain.setTargetAtTime(0,this.ctx.currentTime,.25);return;}
    if(!this._classicHum){
      const gain=this.ctx.createGain(),pan=this.ctx.createPanner(),filter=this.ctx.createBiquadFilter();
      gain.gain.value=0;pan.panningModel='HRTF';pan.distanceModel='inverse';pan.refDistance=4;pan.maxDistance=45;pan.rolloffFactor=1.6;filter.type='lowpass';filter.frequency.value=650;
      const oscillators=[90,180.7].map((frequency,i)=>{const o=this.ctx.createOscillator(),g=this.ctx.createGain();o.type='sine';o.frequency.value=frequency;g.gain.value=i?.3:1;o.connect(g);g.connect(filter);o.start();return o;});
      filter.connect(gain);gain.connect(pan);pan.connect(this.sfxGain);this._classicHum={gain,pan,filter,oscillators};
    }
    const h=this._classicHum,con=classic.connectors[0],x=classic.x0-24,z=con.z+6,d=Math.hypot(player.x-x,player.z-z),now=this.ctx.currentTime,target=d<42?.008:0,cutoff=player.x<classic.x0?900:320;
    if(h.x!==x||h.z!==z){h.pan.positionX.setValueAtTime(x,now);h.pan.positionY.setValueAtTime(2.1,now);h.pan.positionZ.setValueAtTime(z,now);h.x=x;h.z=z;}
    if(h.target!==target){h.gain.gain.setTargetAtTime(target,now,.3);h.target=target;}
    if(h.cutoff!==cutoff){h.filter.frequency.setTargetAtTime(cutoff,now,.4);h.cutoff=cutoff;}
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
    const cell = me && map ? getPoolroomsCellAt(me.x, me.z, map) : null;
    const preset = cell?.acoustics?.preset || zone.acousticPreset || 'large_chamber';
    let delayT = 0.21;
    let fbGain = 0.34;
    let cutoff = 1850;
    if (preset === 'small_corridor') { delayT = 0.11; fbGain = 0.24; cutoff = 1450; }
    else if (preset === 'slide_tube') { delayT = 0.16; fbGain = 0.48; cutoff = 1150; }
    else if (preset === 'underwater_passage') { delayT = 0.26; fbGain = 0.44; cutoff = 680; }
    else if (preset === 'maintenance_room') { delayT = 0.13; fbGain = 0.22; cutoff = 960; }
    else if (preset === 'vaulted_cathedral') { delayT = 0.35; fbGain = 0.56; cutoff = 2600; }
    if(cell?.art&&cell.acoustics){delayT=cell.acoustics.delay??delayT;fbGain=cell.acoustics.feedback??fbGain;cutoff=cell.acoustics.cutoff??cutoff;}

    if (inWater) cutoff = Math.min(cutoff, 480);
    pa.delay.delayTime.setTargetAtTime(delayT, t, 0.35);
    pa.fb.gain.setTargetAtTime(fbGain, t, 0.35);
    pa.lp.frequency.setTargetAtTime(cutoff, t, 0.35);

    // Sparse delicate glass-chime note inside peaceful/colored/slide sanctuary zones (almost silent in silent_horror)
    this._nextPadChimeT -= dt;
    if (this._nextPadChimeT <= 0) {
      this._nextPadChimeT = activeLayer === 'silent_horror' ? 14 : ((cell?.acoustics?.noteGap??2.8) + Math.random() * 4.2);
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
