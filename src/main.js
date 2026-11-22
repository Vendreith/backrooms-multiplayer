import {classicCeilingAt} from './map.js';
/*!
 * Copyright (c) 2026 Vendreith. All rights reserved (Original Engine & Code).
 * Licensing information: see LICENSE.md
 * Third-party notices: see THIRD_PARTY_NOTICES.md
 */

import { THREE, PreloaderSystem } from './engine.js';
import {
  C, WH, N, NTASK, NHOOK, NEED, TASK_TIME, STAM_EXHAUST_RATIO, BLEED, HOOK_T, UNHOOK_T,
  REVEAL_T, REVEAL_CD, TRAP_CD, TRAP_MAX, TRAP_LOCK, TRAP_R,
  SCAN_T, DISARM_T, WATER_LIFE, SPEED, FOG_SURV, FOG_KILLER, FAR_SURV, FAR_KILLER,
  SURV_COLORS, GFX_PRESETS, FX_GROUPS, FX_CONTROLS, EYE_ADAPT_PRESETS, RENDER_DIST_PRESETS,
  getPresetDefaultFx, FPS_CAPS, DEF_KB,
  ENTITY_ARCHETYPES, selectMatchEntities, esc
} from './constants.js';
import { genMap, collide, blocked, canStandAt, getSurfaceAt, getZoneLuminanceAt, getZoneAtmosphereAt } from './map.js';
import { MovementAssist, capVelocity } from './fps/movement.js';
import { MovementGuard } from './fps/network_movement.js';
import { HumanCamera, boundedLocomotion } from './fps/camera_motion.js';
import {HandheldCamera} from './fps/handheld_motion.js';
import {advanceStamina,threatProximity} from './gameplay_balance.js';
import { respawnPitPlayer } from './levels/classic_respawn.js';
import { inClassic, inClassicPresentation, classicPitAt } from './levels/classic_layout.js';
import { WeaponSystem } from './fps/weapons.js';
import { CombatAuthority, rayBox, makeLoadout } from './fps/combat.js';
import { tubeDistance } from './levels/poolrooms_tubes.js';
import { normalizeProfile, profileFromSettings, profileSignature, tacticalSpeed, acceptProfileChange, FPS_SETTING_KEYS, presentationSettings } from './fps/profiles.js';
import { registerTextureTasks, createMapLightmaps } from './textures.js';
import {
  registerModelTasks, buildWorld, updateWorldLighting,
  buildSurvivorAvatar, animateSurvivor, buildEntityAvatar, animateEntity,
  makeFPEntityClaws, updateFPEntityClaws, spawnTrapMesh, spawnFlareMesh
} from './models.js';
import { GraphicsManager } from './postfx.js';
import { audio, MUSIC_TRACKS, AMBIENT_TRACK_KEYS, CHASE_TRACK_KEYS, HORROR_SFX_TRACKS, CREEPY_RANDOM_KEYS } from './audio.js';
import { EntityAIController, findGridPath } from './ai.js';
import { NetworkManager } from './network.js';
import { LEVEL_CATALOG, LEVEL_LIST, getLevelMeta, canonicalLevelId } from './levels/catalog.js';
import { resolveThreshold } from './levels/thresholds.js';
import { ExplorationSystem } from '../level94_gameplay/exploration.js';
import { Level94Ambience } from '../level94_gameplay/ambience.js';
import { getTerrainAt } from './levels/terrain.js';
import { genSubLevelMap } from './levels/world_generators.js';
import { getPoolroomsZoneAt, updatePoolroomsWorldEvents, resetPoolroomsEventsState } from './levels/poolrooms_world.js';
import { getPoolroomsCellAt } from './levels/poolrooms_cells.js';
import { isPeacefulLevel, isHostileInPeacefulLevel } from './levels/level_safety.js';

// ---------- DOM Elements ----------
const $ = (id) => document.getElementById(id);

const preloadScr = $('preloadScr');
const preloadTag = $('preloadTag');
const preloadTitle = $('preloadTitle');
const preloadBar = $('preloadBar');
const preloadLabel = $('preloadLabel');
const preloadPct = $('preloadPct');

function setPreloadOverlay(visible, pct = 0, label = '', tag = null, title = null) {
  if (!preloadScr) return;
  preloadScr.classList.toggle('hidden', !visible);
  if (tag && preloadTag) preloadTag.textContent = tag;
  if (title && preloadTitle) preloadTitle.textContent = title;
  if (preloadBar) preloadBar.style.width = `${Math.round(Math.max(0, Math.min(1, pct)) * 100)}%`;
  if (preloadPct) preloadPct.textContent = `${Math.round(Math.max(0, Math.min(1, pct)) * 100)}%`;
  if (preloadLabel && label) preloadLabel.textContent = label;
}
const lobbyScr = $('lobbyScr');
const pauseScr = $('pauseScr');
const endScr = $('endScr');
const hud = $('hud');
const fearFx = $('fearFx');
const jumpscareFx = $('jumpscareFx');
const jsFaceWrap = $('jsFaceWrap');
const jsTagEl = $('jsTag');

let jumpscareT = 0;
let jumpscareDur = 0.95;
let jumpscareHideTimer = null;
let ambushCD = 0;
let wasEntityCloseLOS = false;
let hostNoiseAlertT = 0;

function buildJumpscareFaceSVG(aiKind = 'bacteria') {
  const k = aiKind === 'skinStealer' ? 'skin_stealer' : aiKind === 'hound' ? 'howler' : (aiKind || 'bacteria');
  if (k === 'smiler') {
    return `<svg viewBox="0 0 300 300" width="100%" height="100%">
      <radialGradient id="jsSmG" cx="50%" cy="50%" r="50%"><stop offset="0%" stop-color="#140000" stop-opacity="0.95"/><stop offset="100%" stop-color="#000" stop-opacity="0"/></radialGradient>
      <circle cx="150" cy="150" r="142" fill="url(#jsSmG)"/>
      <ellipse cx="98" cy="108" rx="22" ry="30" fill="#ffffff"/>
      <ellipse cx="202" cy="108" rx="22" ry="30" fill="#ffffff"/>
      <circle cx="98" cy="112" r="7" fill="#050000"/>
      <circle cx="202" cy="112" r="7" fill="#050000"/>
      <path d="M46 156 Q150 268 254 156 Q150 228 46 156 Z" fill="#060000" stroke="#ffffff" stroke-width="5"/>
      <polygon points="72,175 84,212 96,184" fill="#fff"/>
      <polygon points="104,190 116,228 128,196" fill="#fff"/>
      <polygon points="136,198 150,236 164,198" fill="#fff"/>
      <polygon points="172,196 184,228 196,190" fill="#fff"/>
      <polygon points="204,184 216,212 228,175" fill="#fff"/>
    </svg>`;
  }
  if (k === 'howler') {
    return `<svg viewBox="0 0 300 300" width="100%" height="100%">
      <path d="M72 48 C48 118 46 218 82 272 L218 272 C254 218 252 118 228 48 C185 26 115 26 72 48 Z" fill="#181310" stroke="#7d1410" stroke-width="4"/>
      <ellipse cx="102" cy="96" rx="22" ry="15" fill="#050202"/>
      <ellipse cx="198" cy="96" rx="22" ry="15" fill="#050202"/>
      <circle cx="102" cy="96" r="6" fill="#ff2e1c"/>
      <circle cx="198" cy="96" r="6" fill="#ff2e1c"/>
      <ellipse cx="150" cy="196" rx="58" ry="74" fill="#030000" stroke="#8e1b14" stroke-width="4"/>
      <polygon points="102,150 116,186 128,144" fill="#e8dcc8"/>
      <polygon points="138,136 150,180 162,136" fill="#e8dcc8"/>
      <polygon points="172,144 184,186 198,150" fill="#e8dcc8"/>
      <polygon points="110,248 126,214 138,256" fill="#dcd0bc"/>
      <polygon points="162,256 174,214 190,248" fill="#dcd0bc"/>
    </svg>`;
  }
  if (k === 'skin_stealer' || k === 'duller' || k === 'mimic') {
    return `<svg viewBox="0 0 300 300" width="100%" height="100%">
      <path d="M68 42 C44 102 48 216 92 268 L208 268 C252 216 256 102 232 42 C188 18 112 18 68 42 Z" fill="#32231c" stroke="#a0201a" stroke-width="4"/>
      <circle cx="100" cy="108" r="24" fill="#040101"/>
      <circle cx="200" cy="104" r="21" fill="#040101"/>
      <circle cx="102" cy="108" r="7" fill="#ffe29a"/>
      <circle cx="198" cy="104" r="6" fill="#ff3a28"/>
      <path d="M142 130 L158 130 L166 255 L134 255 Z" fill="#050000" stroke="#b6241c" stroke-width="3"/>
      <path d="M90 185 L126 178 M174 178 L210 185 M96 218 L128 214 M172 214 L204 218" stroke="#c89a84" stroke-width="4"/>
    </svg>`;
  }
  if (k === 'nullshade') {
    return `<svg viewBox="0 0 300 300" width="100%" height="100%">
      <polygon points="150,12 246,84 224,258 76,258 54,84" fill="#05020a" stroke="#c026ff" stroke-width="4"/>
      <rect x="44" y="92" width="212" height="14" fill="#d946ef" opacity="0.55"/>
      <circle cx="102" cy="112" r="18" fill="#ff1e56"/>
      <circle cx="198" cy="112" r="18" fill="#ff1e56"/>
      <circle cx="102" cy="112" r="5" fill="#fff"/>
      <circle cx="198" cy="112" r="5" fill="#fff"/>
      <path d="M84 196 L112 174 L138 206 L162 174 L188 206 L216 182" fill="none" stroke="#ff2e63" stroke-width="7"/>
    </svg>`;
  }
  // Default: bacteria / wire_stalker terrifying tendril silhouette + glowing CRT eyes
  return `<svg viewBox="0 0 300 300" width="100%" height="100%">
    <path d="M150 14 L172 52 L228 22 L202 82 L268 72 L218 124 L274 166 L210 182 L248 250 L182 214 L162 284 L138 284 L118 214 L52 250 L90 182 L26 166 L82 124 L32 72 L98 82 L72 22 L128 52 Z" fill="#060404" stroke="#c81e1e" stroke-width="4"/>
    <ellipse cx="110" cy="118" rx="18" ry="12" fill="#ff1a1a"/>
    <ellipse cx="190" cy="118" rx="18" ry="12" fill="#38f8ff"/>
    <circle cx="110" cy="118" r="5" fill="#ffffff"/>
    <circle cx="190" cy="118" r="5" fill="#ffffff"/>
    <ellipse cx="150" cy="186" rx="46" ry="52" fill="#020000" stroke="#7c1010" stroke-width="4"/>
    <path d="M114 168 L126 196 L138 164 L150 202 L162 164 L174 196 L186 168" fill="none" stroke="#f0e6d2" stroke-width="4"/>
  </svg>`;
}

function triggerJumpscare({ aiKind = 'bacteria', killerName = '', down = false, ambush = false } = {}) {
  if(isPeacefulLevel(activeLocalLevelId))return;
  const durMs = down ? 1280 : ambush ? 720 : 960;
  jumpscareDur = durMs / 1000;
  jumpscareT = jumpscareDur;
  audio.playJumpscare(aiKind, down, ambush);
  if (jumpscareFx) {
    if (jsFaceWrap) jsFaceWrap.innerHTML = buildJumpscareFaceSVG(aiKind);
    if (jsTagEl) {
      jsTagEl.textContent = down
        ? 'SIGNAL LOST // DETECTED'
        : ambush
          ? `AMBUSH // ${(killerName || aiKind || 'ENTITY').toUpperCase()}`
          : `ATTACK // ${(killerName || aiKind || 'ENTITY').toUpperCase()}`;
    }
    jumpscareFx.classList.remove('hidden', 'active');
    void jumpscareFx.offsetWidth;
    jumpscareFx.classList.add('active');
    if (jumpscareHideTimer) clearTimeout(jumpscareHideTimer);
    jumpscareHideTimer = setTimeout(() => {
      jumpscareFx.classList.remove('active');
      jumpscareFx.classList.add('hidden');
    }, durMs);
  }
}

function alertLocalMonstersNoise(levelId, x, z, range = 26, dur = 6.5) {
  if (!net.isHost) return;
  const lvlMap = getOrCreateLevelMap(levelId || 'level0');
  for (const c of aiControllers) {
    const ep = players[c.id];
    if (!ep || (ep.levelId || 'level0') !== (levelId || 'level0')) continue;
    const d = Math.hypot(ep.x - x, ep.z - z);
    const hearCap = Math.min(range, c.archetype?.hearRange || 20)*(blocked(ep.x,ep.z,x,z,lvlMap)?.45:1);
    if (d <= hearCap && c.hearCooldown<=0 && !['CHASE','SEARCH','CARRY_TO_HOOK'].includes(c.state)) {
      c.investigate(Math.round(x/3)*3, Math.round(z/3)*3, lvlMap, Math.min(4,dur));c.hearCooldown=2.2;
    }
  }
}

// ---------- Core Three.js Renderer, Scene & Camera ----------
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance', preserveDrawingBuffer: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.06;
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x161207);
scene.fog = new THREE.FogExp2(0x161207, FOG_SURV);

const camera = new THREE.PerspectiveCamera(80, window.innerWidth / window.innerHeight, 0.05, FAR_SURV);
scene.add(camera);

const hemiLight = new THREE.HemisphereLight(0xf6df82, 0x26200d, 0.36);
const ambLight = new THREE.AmbientLight(0xd9bd62, 0.14);
scene.add(hemiLight, ambLight);

const gfx = new GraphicsManager(renderer, scene, camera);

// 1st-Person Survivor Pure-White Flashlight + Diffused Hotspot Core (punchy reach with crisp wall contrast)
const localFlash = new THREE.SpotLight(0xffffff, 11.5, 48, Math.PI / 4.8, 0.72, 1.12);
localFlash.castShadow = true;
localFlash.shadow.mapSize.set(1024, 1024);
localFlash.shadow.camera.near = 0.28;
localFlash.shadow.camera.far = 48;
localFlash.shadow.bias = -0.00045;
localFlash.shadow.normalBias = 0.025;
localFlash.shadow.radius = 2.0;

const localFlashCore = new THREE.SpotLight(0xffffff, 6.5, 44, Math.PI / 9.0, 0.65, 1.02);
const localFlashTarget = new THREE.Object3D();
scene.add(localFlash, localFlashCore, localFlashTarget);
localFlash.target = localFlashTarget;
localFlashCore.target = localFlashTarget;
localFlash.visible = false;
localFlashCore.visible = false;

// Visible 1st-person handheld flashlight barrel (right side) following delay curve
const fpFlashGroup = new THREE.Group();
const flashTube = new THREE.Mesh(
  new THREE.CylinderGeometry(0.017, 0.021, 0.16, 10),
  new THREE.MeshStandardMaterial({ color: 0x353942, emissive: 0x0b0c0e, roughness: 0.35, metalness: 0.7 })
);
flashTube.rotation.x = Math.PI / 2;
const flashLens = new THREE.Mesh(
  new THREE.CircleGeometry(0.017, 12),
  new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false })
);
flashLens.position.z = -0.082;
flashLens.rotation.y = Math.PI;
fpFlashGroup.add(flashTube, flashLens);
fpFlashGroup.position.set(0.28, -0.23, -0.34);
fpFlashGroup.visible = false;
camera.add(fpFlashGroup);

// 1st-Person Hovering Entity Claws
const fpClaws = makeFPEntityClaws(camera);
fpClaws.setVisible(false);

// Scan/Reveal Aura Beacon Ring (highlights Entity/Survivors briefly through walls when Reveal/Scan active)
const beaconPool = [];
const texStore = {};

// ---------- Application Settings & State ----------
function isMobileDevice() {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  const hasTouch = (navigator.maxTouchPoints || 0) > 0 || (typeof window !== 'undefined' && 'ontouchstart' in window);
  const coarse = typeof window !== 'undefined' && !!window.matchMedia?.('(pointer: coarse)')?.matches;
  return /Android|iPhone|iPad|iPod|Mobile|webOS|BlackBerry|Opera Mini/i.test(ua) || (hasTouch && coarse);
}

const mobileAutoBoot = isMobileDevice();
let currentGfx = localStorage.getItem('br_gfx_v2') || (mobileAutoBoot ? 'mobile' : 'ultra');
const PC_DEFAULT_FX = {
  idleMotion: 'natural', autoBhop: true, movementShake: 3, handheldTremor: 3,
  verticalBob: 1, reducedMotion: false, footageFilterMode: 'found_vhs',
  footageFilterStrength: .35, upscaleSoftness: .9, halation: 2.5, clarity: 1,
  baseGrain: .35, grain: 1.5, bloom: 2.3, lensCurve: 1.4, crtScanlines: true,
  scanlines: 1.5, vignette: 2, motionBlur: 1, dofBlur: .05, brightness: .9,
  contrast: 1.04, gamma: .88, hue: 1, saturation: 1.14,
  eyeAdaptPreset: 'custom', eyeAdaptEnabled: true, eyeAdaptStrength: 2,
  eyeAdaptBrightSpeed: .6, eyeAdaptDarkSpeed: 6, eyeAdaptComp: .15,
  eyeAdaptMinExp: .65, eyeAdaptMaxExp: 4,
  renderDistPreset: '800', renderDistance: 800, renderScale: 1.5, aaMode: 'msaa',
  shadows: true, rtShadow: 1.6, waterQuality: 'ultra', cloudQuality: 'ultra',
  postFX: true, dust: true, touchControls: 'auto', cleanCamHud: false
};

function getPlatformDefaultFx(presetKey) {
  const base = getPresetDefaultFx(presetKey);
  if (mobileAutoBoot || presetKey !== 'ultra') return { ...base, userFxKeys: [] };
  return { ...base, ...PC_DEFAULT_FX, userFxKeys: Object.keys(PC_DEFAULT_FX) };
}

function loadFxSettings(presetKey) {
  const base = { ...getPlatformDefaultFx(presetKey), ...loadFpsPreferences() };
  try {
    const saved = JSON.parse(localStorage.getItem('br_fx_v2') || 'null');
    if (saved && typeof saved === 'object') {
      const merged = { ...base, ...saved, ...loadFpsPreferences() };
      for (const c of FX_CONTROLS) {
        if (c.type === 'toggle') {
          if (typeof merged[c.key] !== 'boolean') merged[c.key] = !!base[c.key];
        } else if (c.type === 'select') {
          const valid = c.options?.some(o => o.value === merged[c.key]);
          if (!valid) merged[c.key] = base[c.key];
        } else if (c.type === 'range') {
          const n = Number(merged[c.key]);
          merged[c.key] = Number.isFinite(n) ? Math.min(c.max, Math.max(c.min, n)) : base[c.key];
        }
      }
      // Preserve deliberate edits across map changes and browser reloads. Older
      // saves have no key list, so infer edits from their preset's defaults.
      merged.userFxKeys = Array.isArray(saved.userFxKeys)
        ? saved.userFxKeys.filter(key => FX_CONTROLS.some(c => c.key === key))
        : [...new Set([...base.userFxKeys, ...FX_CONTROLS.filter(c => Object.hasOwn(saved,c.key) && saved[c.key] !== base[c.key]).map(c => c.key)])];
      return merged;
    }
  } catch {}
  return base;
}
let fxSettings = loadFxSettings(currentGfx);
function loadFpsPreferences() {
  try { const data = JSON.parse(localStorage.getItem('br_fps_preferences_v1') || '{}'); return Object.fromEntries(FPS_SETTING_KEYS.filter(k => Object.hasOwn(data, k)).map(k => [k, data[k]])); } catch { return {}; }
}
function saveFpsPreferences() { localStorage.setItem('br_fps_preferences_v1', JSON.stringify(Object.fromEntries(FPS_SETTING_KEYS.map(k => [k, fxSettings[k]])))); }
const rawSavedFps = localStorage.getItem('br_fps_v2');
const defaultFps = mobileAutoBoot ? 30 : 60;
const savedFps = rawSavedFps === null ? defaultFps : Number(rawSavedFps);
let fpsCap = FPS_CAPS.includes(savedFps) ? savedFps : defaultFps;
const rawSavedAspect = localStorage.getItem('br_aspect_v2');
let aspectMode = rawSavedAspect === '4:3' ? '4:3' : rawSavedAspect === '16:9' ? '16:9' : (mobileAutoBoot ? '16:9' : '4:3');
let mouseSens = Number(localStorage.getItem('br_sens_v2') || '1.0');
let musicVol = Number(localStorage.getItem('br_mvol_v2') || '1.0');
let sfxVol = Number(localStorage.getItem('br_svol_v2') || '1.0');
audio.setVolumes(musicVol, sfxVol);

let inMatch = false;
let warmingMatch = false;
let matchEnded = false;
let paused = false;
let matchTime = 0;
let seed = 1337;
let map = null;
let world = null;
let players = {};    // id -> state object
let avatars = {};    // id -> Three.js rig
let myId = 'P1';
let aiControllers = [];
let botPaths = new Map();
let stamExhausted = false;
let vhsRevealT = 0;

// Smooth Camera, Flashlight Delay Curve & Pointer Lock Anti-Teleport state
let lockIgnoreUntil = 0;
let turnYawRate = 0;
let turnPitchRate = 0;
let shakeXRate = 0;
let shakeYRate = 0;
let lastCamTurnAt = 0;
let camYaw = 0;
let camPitch = 0;
let camRollPan = 0;
let flashYaw = 0;
let flashPitch = 0;

// Movement, Physics, Jump & Bunny-Hop state
const keys = {};
let mobJoyX = 0;
let mobJoyY = 0;
let mobEdgeSprint = false;
let mobSprintToggle = false;
let mobCrouchToggle = false;
let mobJumpHeld = false;
let mobUseHeld = false;
let mobJoyPointerId = null;
let mobLookPointerId = null;
let mobLookLastX = 0;
let mobLookLastY = 0;

function isMobileUiActive() {
  const mode = fxSettings?.touchControls || 'auto';
  if (mode === 'off') return false;
  if (mode === 'on') return true;
  return currentGfx === 'mobile' || isMobileDevice();
}

function resetMobileInputs() {
  mobJoyX = 0;
  mobJoyY = 0;
  mobEdgeSprint = false;
  mobJumpHeld = false;
  mobUseHeld = false;
  mobSprintToggle = false;
  mobCrouchToggle = false;
  mobJoyPointerId = null;
  mobLookPointerId = null;
  const stick = $('mobJoyStick');
  if (stick) stick.style.transform = 'translate(0px, 0px)';
  $('mobSprintBtn')?.classList.remove('active');
  $('mobCrouchBtn')?.classList.remove('active');
}

function syncMobileUiVisibility() {
  const mobActive = isMobileUiActive();
  hud?.classList.toggle('mobile-ui', mobActive);
  if (!mobActive) {
    resetMobileInputs();
  } else {
    document.body.style.cursor = '';
    if (document.pointerLockElement) {
      try { document.exitPointerLock?.(); } catch {}
    }
  }
  if (typeof window !== 'undefined' && renderer) {
    applyViewportLayout();
  }
}
let hVelX = 0;
let hVelZ = 0;
let jumpBuffer = 0;
let wasAirborneT = 0;
let bhopChain = 0;
const movementAssist = new MovementAssist();
const movementGuard = new MovementGuard();
const humanCamera = new HumanCamera();
const handheldCamera = new HandheldCamera();
let camForeZ=0,previousForwardSpeed=0;
let movementSpeedCap = SPEED.SURV_WALK;
let fpsReviewFrozen = false;
let movementProfileSequence = 0;
let pendingProfileSignature = null;
let stepDist = 0;
let stepPhase = 0;
let landTrauma = 0;
let stepSpring = 0;
let stepSpringVel = 0;
let stepPulseT = 0;
let stepPulseAmp = 0;
let stepFootSign = 1;
let smoothMoveMix = 0;
let smoothSprintMix = 0;
let camBobY = 0;
let camSwayX = 0;
let camRoll = 0;
let camNod = 0;
let runNoiseClock = 0;
let runStepCount = 0;
let runJoltX = 0, runJoltXVel = 0;
let runJoltY = 0, runJoltYVel = 0;
let runJoltYaw = 0, runJoltYawVel = 0;
let runJoltPitch = 0, runJoltPitchVel = 0;
let prevEffSwayX = 0, prevEffBobY = 0, prevEffPitch = 0, prevEffYaw = 0;
const runShakeOut = { x: 0, y: 0, yaw: 0, pitch: 0, roll: 0 };
function _runHash(n, s = 0) {
  const v = Math.sin(n * 127.1 + s * 311.7 + 19.3) * 43758.5453;
  return (v - Math.floor(v)) * 2 - 1;
}
function smoothRunNoise(t, s = 0) {
  const i = Math.floor(t);
  const f = t - i;
  const u = f * f * (3 - 2 * f);
  return _runHash(i, s) * (1 - u) + _runHash(i + 1, s) * u;
}
function resetRunShakeState() {
  runNoiseClock = 0;
  runStepCount = 0;
  runJoltX = runJoltXVel = 0;
  runJoltY = runJoltYVel = 0;
  runJoltYaw = runJoltYawVel = 0;
  runJoltPitch = runJoltPitchVel = 0;
  prevEffSwayX = prevEffBobY = prevEffPitch = prevEffYaw = 0;
  runShakeOut.x = runShakeOut.y = runShakeOut.yaw = runShakeOut.pitch = runShakeOut.roll = 0;
}
function fadeRunShake(kFade) {
  for (const k of ['x', 'y', 'yaw', 'pitch', 'roll']) runShakeOut[k] += (0 - runShakeOut[k]) * kFade;
  runJoltX *= (1 - kFade); runJoltY *= (1 - kFade); runJoltYaw *= (1 - kFade); runJoltPitch *= (1 - kFade);
  runJoltXVel *= (1 - kFade); runJoltYVel *= (1 - kFade); runJoltYawVel *= (1 - kFade); runJoltPitchVel *= (1 - kFade);
}
function triggerRunStepShake(footSign, wantSprint, isCrouch, isK) {
  runStepCount++;
  const seedX = ((Math.random() - 0.5) * 2.0) * 0.55 + _runHash(runStepCount, 7) * 0.45;
  const seedY = ((Math.random() - 0.5) * 2.0) * 0.55 + _runHash(runStepCount, 23) * 0.45;
  const joltGain = isK ? 0.55 : wantSprint ? 1.05 : isCrouch ? 0.12 : 0.34;
  runJoltXVel += (footSign * 0.10 + seedX * 0.26) * joltGain;
  runJoltYVel += (-0.14 + seedY * 0.20) * joltGain;
  runJoltYawVel += (seedX * 0.16 + footSign * 0.04) * joltGain;
  runJoltPitchVel += (seedY * 0.14 - 0.06) * joltGain;
}
function updateRunCameraShake(dt, isCrouch, vBobScale) {
  runNoiseClock += dt * (4.6 + smoothSprintMix * 6.4) * smoothMoveMix;
  const sub = dt > 0.032 ? 2 : 1;
  const hdt = dt / sub;
  for (let i = 0; i < sub; i++) {
    runJoltXVel += (-92.0 * runJoltX - 12.8 * runJoltXVel) * hdt;
    runJoltX = THREE.MathUtils.clamp(runJoltX + runJoltXVel * hdt, -0.06, 0.06);
    runJoltYVel += (-118.0 * runJoltY - 14.5 * runJoltYVel) * hdt;
    runJoltY = THREE.MathUtils.clamp(runJoltY + runJoltYVel * hdt, -0.06, 0.06);
    runJoltYawVel += (-98.0 * runJoltYaw - 13.2 * runJoltYawVel) * hdt;
    runJoltYaw = THREE.MathUtils.clamp(runJoltYaw + runJoltYawVel * hdt, -0.032, 0.032);
    runJoltPitchVel += (-112.0 * runJoltPitch - 14.0 * runJoltPitchVel) * hdt;
    runJoltPitch = THREE.MathUtils.clamp(runJoltPitch + runJoltPitchVel * hdt, -0.035, 0.035);
  }
  const orgAmp = (0.28 + 0.88 * smoothSprintMix) * smoothMoveMix * (isCrouch ? 0.35 : 1.0);
  const nLR = smoothRunNoise(runNoiseClock, 11) * 0.65 + smoothRunNoise(runNoiseClock * 2.17 + 4.3, 19) * 0.35;
  const nUD = smoothRunNoise(runNoiseClock * 1.19 + 1.9, 31) * 0.65 + smoothRunNoise(runNoiseClock * 2.41 + 9.2, 43) * 0.35;
  const nYaw = smoothRunNoise(runNoiseClock * 1.07 + 3.1, 59) * 0.68 + smoothRunNoise(runNoiseClock * 2.31 + 2.7, 71) * 0.32;
  const nPit = smoothRunNoise(runNoiseClock * 1.29 + 5.7, 83) * 0.68 + smoothRunNoise(runNoiseClock * 2.53 + 6.4, 97) * 0.32;
  runShakeOut.x = runJoltX * 0.55 + nLR * 0.015 * orgAmp;
  runShakeOut.y = (runJoltY * 0.60 + nUD * 0.017 * orgAmp) * vBobScale;
  runShakeOut.yaw = runJoltYaw * 0.55 + nYaw * 0.009 * orgAmp;
  runShakeOut.pitch = (runJoltPitch * 0.58 + nPit * 0.010 * orgAmp) * vBobScale;
  runShakeOut.roll = (nLR * 0.008 + runJoltX * 0.18) * orgAmp;
  return runShakeOut;
}
let zoneLightSmooth = 0.55;
const _atmoFogCol = new THREE.Color(0x161207);
const _atmoHemiSky = new THREE.Color(0xf6df82);
const _atmoHemiGnd = new THREE.Color(0x26200d);

// Local Gameplay Cooldowns & Actions
let swingCD = 0;
let localSwingT = 0;
let killerSlowT = 0;
let revealCD = 0;
let trapCD = 0;
let scanT = 0;
let jellyBuffT = 0;
let thirstT = WATER_LIFE;
let stam = SPEED.STAM_DRAIN;
let busyAct = null; // { kind, targetId, progress, duration }
let scState = null; // Skill check state
let feeds = [];
let snapAccum = 0;

// ---------- Multi-Level Backrooms State & World Switcher ----------
const levelMaps = new Map();
let activeLocalLevelId = 'level0';
let activeJoinTarget = null;
const levelDiscoveredSet = new Set();
const levelsClearedSet = new Set();
let noclipDropLockUntil = 0;

// ---------- Teleport Control Panel & No-Clip Mode State ----------
let noclipMode = false;
let noclipSpeed = 18;
let noclipVelX = 0;
let noclipVelY = 0;
let noclipVelZ = 0;
let tpOpen = false;
let tpActiveTab = 'all';
let tpSearchQuery = '';

const ZONE_LABELS = {
  manila: 'MANILA ROOM', arches: 'WATER POOL', pitfalls: 'PITFALLS', huge_pitfall: 'PITFALLS',
  poolrooms: 'SUBMERGED POOL', wet_concrete: 'WET CONCRETE', blackout: 'Power Outage Zone',
  redrooms: 'Red Room Anomaly', colonnade: 'Pillar Lobby', office: 'Office Labyrinth',
  crawl_bay: 'Low Crawl Space', mold_utility: 'Milestone Tech Zone', monolith_maze: 'Gold Block Labyrinth',
  async_threshold: 'A-Sync Threshold', suburb_pitfalls: 'Dead-End Alley', red_city: 'Red City & Rust Pipes',
  null_kx_glitch: 'NULL_KX Glitch Zone', async_archive: 'KV-31 Archive Vault', flooded_sump: 'Sludge Pump Station',
  breaker_vault: 'Blue Substation', gravity_error: 'Gravity Error Room', ceiling_plenum: 'Sagging Ceiling & Ladder Well',
  still_life_relay: 'Still-Life Wave Station', fluorescent_greenhouse: 'Green Light Walkway', stairwell_loop: 'INFINITE LADDER',
  ff1_ladder_hatch: 'STEEL LADDER (FF#1)', ff1_dont_move: 'DON\'T MOVE WALL (FF#1)',
  ff1_white_gallery: 'WHITE PORCH & WINDOW (FF#1)', ff1_filing_corridor: 'FILE CABINET ROW & KEEP CLEAR (FF#1)',
  ff2_tape_kitchen: 'BLUE ICEBOX & STOVE (FF#2)', ff2_crashed_car: 'CAR CRASHES INTO WALL (FF#2)',
  ff2_hardwood_home: 'WOODEN FLOOR & RAILING (FF#2)', ff2_vine_plasma: 'BLACK ROOT & GREEN CRACK',
  flooded_yellow_hall: 'GOLDEN FLOODGATE', mb_courtyard: 'THREE-STOREY GROUND FLOOR',
  mb_mall_atrium: '1990s MALL', mb_red_skybridge: 'RED GLASS & NIGHT CITY',
  mb_brick_alcove_hall: 'BROWN TILES & WINDOW', mb_bicycle_tripod: 'BICYCLE CORNER & TRIPOD',
  mb_library_fan_hall: 'CEILING FAN & BOOKSHELF', mb_unrealized_mural: 'UNREALIZED WALL PICTURE',
  mb_diner_fridge: 'NEON OPEN DINING & FRIDGE', mb_van_tunnel: 'White Cargo Elevator & Dollar Generator',
  mb_grey_basement: 'Gray Basement & Blue Door', mb_cctv_cove: 'CCTV Camera Pit & Doorway',
  mb_dining_blue_drapes: 'Green Curtain Dining Room (Royal Family)', mb_gold_tile_blood: 'Yellow Brick Wall & Blood Stain',
  mb_floating_wall_glitch: 'Swinging Curtain & Old Bed',
  rear_atrium_threshold: 'A-SYNC 360° Rear Lobby',
  herringbone_gallery: 'Fishbone Wood Floor Art Room',
  sunken_terrazzo_basin: 'Terrazzo Stone Basin',
  partition_bullpen_maze: 'Office Partitioned Room',
  arched_arcade_rotunda: 'Classic Round Dome Lobby',
  narrow_service_spine: 'Long Narrow Technical Corridor',
  checker_diner_concourse: 'Black and White Checkered Dining Counter',
  exposed_stud_renovation: 'Wooden Frame Construction Area',
  glass_block_solarium: 'Frosted Glass Bright Lobby',
  stepped_amphitheater_well: 'Staircase Pit Arena',
  laundromat_limbo: 'Infinite Laundry Shop',
  double_tier_mezzanine: 'Two-Story Swinging Floor',
  waiting_room_infinite: 'Green Chair & TV Waiting Room',
  amber_brutalist_vault: 'Concrete Basement with Golden Tiger',
  wallpaper_tear_void: 'Wallpaper Gap Void',
  acoustic_baffle_hall: 'Soundproof Corridor',
  freight_loading_bay: 'Cargo Dock with Rolling Doors',
  hotel_corridor_loop: 'Red Carpet Guest Corridor',
  boiler_manifold_room: 'Steam Room & Pressure Pipe',
  museum_plinth_hall: 'Display Case with Glass Cabinet',
  bowling_alley_deadend: 'Bowling Lane with Chipped Wood Floor',
  server_tape_mainframe: 'A-SYNC Master Control Room',
  indoor_fountain_plaza: 'Water Fountain Square',
  infinity_arch_perspective: 'Infinite Dome Highway'
};

function syncNoclipUI() {
  const badge = $('noclipBadge');
  if (badge) badge.classList.toggle('hidden', !noclipMode);
  const bTxt = $('noclipBadgeText');
  if (bTxt) {
    bTxt.textContent = isMobileUiActive()
      ? `NOCLIP ON • ${Math.round(noclipSpeed)} m/s`
      : `NOCLIP ON [N] • ${Math.round(noclipSpeed)} m/s • Space: Fly Up • C/Ctrl: Fly Down`;
  }
  const tpBtn = $('tpHudBtn');
  if (tpBtn) tpBtn.classList.toggle('noclip-on', noclipMode);
  const tpNc = $('tpHudNcBtn');
  if (tpNc) tpNc.textContent = noclipMode ? 'NC ON [N]' : 'NOCLIP [N]';
  const mobTp = $('mobTpBtn');
  if (mobTp) mobTp.classList.toggle('noclip-on', noclipMode);
  const pNcBtn = $('tpNoclipBtn');
  if (pNcBtn) {
    pNcBtn.classList.toggle('on', noclipMode);
    pNcBtn.textContent = noclipMode ? 'NO-CLIP MODE [N]: ON' : 'NO-CLIP MODE [N]: OFF';
  }
  const spdInput = $('tpNoclipSpeed');
  if (spdInput && Number(spdInput.value) !== Math.round(noclipSpeed)) {
    spdInput.value = String(Math.round(noclipSpeed));
  }
  const spdVal = $('tpNoclipSpeedVal');
  if (spdVal) spdVal.textContent = `${Math.round(noclipSpeed)} m/s`;
  const mJump = $('mobJumpBtn');
  if (mJump) mJump.innerHTML = noclipMode ? 'JUMP<small>↑ Y+</small>' : 'JUMP<small>Bhop</small>';
  const mCrouch = $('mobCrouchBtn');
  if (mCrouch) mCrouch.innerHTML = noclipMode ? 'DROP<small>↓ Y-</small>' : 'SIT<small>Ctrl</small>';
}

function setNoclipMode(nextOn, silent = false) {
  const on = !!nextOn;
  noclipMode = on;
  noclipVelX = 0;
  noclipVelY = 0;
  noclipVelZ = 0;
  hVelX = 0;
  hVelZ = 0;
  const me = players[myId];
  if (me) {
    me.vy = 0;
    if (!on) {
      const tr = getTerrainAt(me.x, me.z, map, me.y);
      if (me.y < tr.floorY) me.y = tr.floorY;
    }
  }
  syncNoclipUI();
  if (!silent && inMatch) {
    pushFeed(
      on
        ? `NO-CLIP: ON (${Math.round(noclipSpeed)} m/s) — Fly through walls with WASD + Space / C!`
        : 'NO-CLIP: OFF — Restore physics collisions & gravity.',
      on ? '#56e892' : '#ffe066'
    );
  }
  return noclipMode;
}

function setNoclipSpeed(val) {
  noclipSpeed = THREE.MathUtils.clamp(Number(val) || 18, 6, 60);
  syncNoclipUI();
}

function resolveWalkablePoint(m, x, z, y = 0, preserveY = false) {
  const spanX = m.spanX ?? m.worldSpan ?? (N * C);
  const spanZ = m.spanZ ?? m.worldSpan ?? (N * C);
  const offsets = [[0, 0], [2.4, 0], [-2.4, 0], [0, 2.4], [0, -2.4], [3.6, 0], [-3.6, 0], [0, 3.6], [0, -3.6]];
  for (const [ox, oz] of offsets) {
    const tx = THREE.MathUtils.clamp(x + ox, 2.0, spanX - 2.0);
    const tz = THREE.MathUtils.clamp(z + oz, 2.0, spanZ - 2.0);
    const [cx, cz] = collide(tx, tz, 0.40, m, false, y);
    if (Math.hypot(cx - tx, cz - tz) < 0.08) {
      const tr = getTerrainAt(cx, cz, m, y);
      return { x: cx, y: preserveY ? y : Math.max(y, tr.floorY), z: cz };
    }
  }
  const [fx, fz] = collide(THREE.MathUtils.clamp(x, 2.0, spanX - 2.0), THREE.MathUtils.clamp(z, 2.0, spanZ - 2.0), 0.40, m, false, y);
  const tr = getTerrainAt(fx, fz, m, y);
  return { x: fx, y: preserveY ? y : Math.max(y, tr.floorY), z: fz };
}

function collectLevelLandmarks(levelId) {
  const m = getOrCreateLevelMap(levelId);
  if (!m) return [];
  const list = [];
  const meta = getLevelMeta(levelId);

  if (m.SPAWN) {
    list.push({
      id: `${levelId}_spawn`, cat: 'here', subGroup: 'core', badge: 'START', badgeClass: '',
      title: `Start Point (${meta.code})`,
      subtitle: `${meta.vnName} • (${Math.round(m.SPAWN.x)}, ${Math.round(m.SPAWN.y || 0)}, ${Math.round(m.SPAWN.z)})`,
      levelId, x: m.SPAWN.x, y: m.SPAWN.y || 0, z: m.SPAWN.z, yaw: m.SPAWN.yaw || 0
    });
  }

  if (levelId === 'level0' && m.ELEVATOR) {
    list.push({
      id: 'level0_elev', cat: 'here', subGroup: 'core', badge: 'ELEVATOR', badgeClass: 'done',
      title: 'Elevator — Classic Area',
      subtitle: `Midpoint of the yellow maze • (${Math.round(m.ELEVATOR.x)}, ${Math.round(m.ELEVATOR.z)})`,
      levelId: 'level0', x: m.ELEVATOR.x, y: 0, z: m.ELEVATOR.z - 5.2, yaw: 0
    });
    const oldCab=m.legacyElevator||m.ELEVATOR;
    const rearHubPt = resolveWalkablePoint(m, oldCab.x, oldCab.z + 6.5, 0);
    list.push({
      id: 'level0_rear_hub', cat: 'here', subGroup: 'core', badge: 'REAR 180°', badgeClass: 'accent',
      title: 'Rear Atrium 180°',
      subtitle: `Straight into the world behind • (${Math.round(rearHubPt.x)}, ${Math.round(rearHubPt.z)})`,
      levelId: 'level0', ...rearHubPt, yaw: Math.PI
    });
  }

  if(levelId==='level0'&&m.classic){
    const names={spawn:'Classic Elevator Door',corridor:'Narrow yellow corridor',intersection:'Partitioned junction',dark:'Dark room',lit:'Fluorescent white room',dream:'Repeating door sequence',pit:'Black Pit',props:'Appliance Cluster',exit:'Transition Hall'};
    for(const [key,v]of Object.entries(m.classic.views))list.push({id:'classic_'+key,cat:'here',subGroup:'core',badge:'CLASSIC',title:names[key],subtitle:'Classic area, 150 × 150 m',levelId:'level0',x:v.x,z:v.z,y:0,yaw:v.yaw});
  }
  if (levelId === 'level0' && m.EXITS?.length) {
    m.EXITS.forEach((ex, i) => {
      const safeZ = ex.dirZ < 0 ? 3.5 : (m.spanZ ?? m.worldSpan ?? (N * C)) - 3.5;
      const pt = resolveWalkablePoint(m, ex.x, safeZ, 0);
      list.push({
        id: `level0_exit_${i}`, cat: 'here', subGroup: 'core', badge: m.exitsOpen ? 'OPEN' : 'EXIT GATE',
        badgeClass: m.exitsOpen ? 'done' : 'warn',
        title: `Emergency Exit ${ex.dirZ < 0 ? 'North Front' : 'Nam (South Rear)'}`,
        subtitle: `Coordinates (${Math.round(pt.x)}, ${Math.round(pt.z)})`,
        levelId: 'level0', ...pt, yaw: ex.dirZ < 0 ? 0 : Math.PI
      });
    });
  }

  if (m.TASKS?.length) {
    m.TASKS.forEach((t, idx) => {
      const pt = resolveWalkablePoint(m, t.x + 2.2, t.z, t.y || 0);
      const tTitle = levelId === 'level0'
        ? `Electrical Panel #${idx + 1} (${t.code || ''} ${t.symbol || ''})`.trim()
        : `Elevator (${meta.code})`;
      list.push({
        id: `${levelId}_task_${idx}`, cat: 'here',
        badge: t.done ? 'REPAIRED' : 'MACHINE', badgeClass: t.done ? 'done' : '',
        title: tTitle,
        subtitle: `Coordinates (${Math.round(pt.x)}, ${Math.round(pt.y)}, ${Math.round(pt.z)})`,
        levelId, ...pt, yaw: Math.PI * 0.5
      });
    });
  }

  if (m.PORTALS?.length) {
    m.PORTALS.forEach((po, idx) => {
      const pt = resolveWalkablePoint(m, po.x, po.z - 3.0, po.y || 0);
      list.push({
        id: `${levelId}_portal_${idx}`, cat: 'here',
        badge: 'RETURN GATE', badgeClass: m.exitsOpen ? 'done' : 'warn',
        title: `Return to Level 0 #${idx + 1}`,
        subtitle: `Coordinates (${Math.round(pt.x)}, ${Math.round(pt.y)}, ${Math.round(pt.z)})`,
        levelId, ...pt, yaw: 0
      });
    });
  }

  if (levelId === 'level0' && m.ENTRANCES?.length) {
    const typeName = { noclip_floor: 'Hidden Noclip Floor', pickup: 'Anomalous Item', crawl_hatch: 'Tunnel', portal: 'Gate' };
    m.ENTRANCES.forEach((ent) => {
      const subMeta = getLevelMeta(ent.levelId);
      const pt = resolveWalkablePoint(m, ent.x + 2.8, ent.z, 0);
      list.push({
        id: `lvl0_ent_${ent.levelId}`, cat: 'entrances',
        badge: subMeta.code, badgeClass: levelsClearedSet.has(ent.levelId) ? 'done' : '',
        title: `Entrance ${subMeta.code}: ${subMeta.vnName}`,
        subtitle: `${typeName[ent.entryType] || 'Gate'} at (${Math.round(pt.x)}, ${Math.round(pt.z)})`,
        levelId: 'level0', ...pt, yaw: Math.PI * 0.5, safeDropGuard: true
      });
    });
  }

  if (m.SLIDES?.length) {
    m.SLIDES.forEach((sl, idx) => {
      if (idx > 7) return;
      list.push({
        id: `${levelId}_slide_${idx}`, cat: 'here', badge: 'SLIDE BRIDGE', badgeClass: '',
        title: `Water Slide Tower #${idx + 1}`,
        subtitle: `Slide Top Y=${Math.round(sl.y0 || 4)}m • (${Math.round(sl.x0)}, ${Math.round(sl.z0)})`,
        levelId, x: sl.x0, y: (sl.y0 || 3) + 0.35, z: sl.z0, yaw: 0, preserveY: true
      });
    });
  }

  if (m.WATER_RECTS?.length) {
    const pools = m.WATER_RECTS.slice(0, 6);
    pools.forEach((w, idx) => {
      const wx = (w.x0 + w.x1) * 0.5;
      const wz = (w.z0 + w.z1) * 0.5;
      list.push({
        id: `${levelId}_water_${idx}`, cat: 'here', badge: 'WATER', badgeClass: '',
        title: idx === 0 ? 'Main Water Area' : `Pool / River #${idx + 1}`,
        subtitle: `Water Surface Y=${(w.waterY || 0).toFixed(1)}m • (${Math.round(wx)}, ${Math.round(wz)})`,
        levelId, x: wx, y: (w.waterY || 0) + 0.15, z: wz, yaw: 0, preserveY: true
      });
    });
  }

  if (m.HOUSES?.length) {
    const step = Math.max(1, Math.floor(m.HOUSES.length / 6));
    for (let i = 0, cnt = 0; i < m.HOUSES.length && cnt < 6; i += step, cnt++) {
      const h = m.HOUSES[i];
      const dz = h.doorSide === 'north' ? -(h.d * 0.5 + 3.5) : (h.d * 0.5 + 3.5);
      const pt = resolveWalkablePoint(m, h.cx, h.cz + dz, h.baseY || 0);
      list.push({
        id: `${levelId}_house_${i}`, cat: 'here', badge: 'HOUSE', badgeClass: '',
        title: `House / Architecture #${i + 1}`,
        subtitle: `In front of (${Math.round(pt.x)}, ${Math.round(pt.z)})`,
        levelId, ...pt, yaw: 0
      });
    }
  }

  if (m.TOWERS?.length) {
    const step = Math.max(1, Math.floor(m.TOWERS.length / 5));
    for (let i = 0, cnt = 0; i < m.TOWERS.length && cnt < 5; i += step, cnt++) {
      const tw = m.TOWERS[i];
      const off = Math.max(tw.w || 6, tw.d || 6) * 0.5 + 4.5;
      const pt = resolveWalkablePoint(m, tw.x + off, tw.z, tw.baseY || 0);
      list.push({
        id: `${levelId}_tower_${i}`, cat: 'here', badge: 'BUILDING', badgeClass: '',
        title: `Tower / Building Block #${i + 1}`,
        subtitle: `Height: ${Math.round(tw.h || 20)}m • (${Math.round(pt.x)}, ${Math.round(pt.z)})`,
        levelId, ...pt, yaw: Math.PI * 0.5
      });
    }
  }

  if (levelId === 'level0' && m.ZONES?.length) {
    const seenFront = new Set();
    const seenRear = new Set();
    const gC = m.cellSize ?? C;
    const frontBoundary = m.frontZoneCount ?? m.ZONES.length;
    for (let zi = 0; zi < m.ZONES.length; zi++) {
      const z = m.ZONES[zi];
      const isRear = z.side === 'rear' || zi >= frontBoundary || ((z.r0 + z.r1) * 0.5 >= N);
      const seenSet = isRear ? seenRear : seenFront;
      if (seenSet.has(z.type)) continue;
      seenSet.add(z.type);
      const zx = ((z.c0 + z.c1 + 1) * 0.5) * gC;
      const zz = ((z.r0 + z.r1 + 1) * 0.5) * gC;
      const pt = resolveWalkablePoint(m, zx, zz, 0);
      list.push({
        id: `lvl0_${isRear ? 'rear' : 'front'}_${z.type}`,
        cat: 'here',
        subGroup: isRear ? 'rear' : 'front',
        badge: isRear ? 'REAR' : 'FRONT',
        badgeClass: isRear ? 'accent' : '',
        title: ZONE_LABELS[z.type] || z.type.toUpperCase(),
        subtitle: `${isRear ? 'Rear Area' : 'Front Area'} • (${Math.round(pt.x)}, ${Math.round(pt.z)})`,
        levelId: 'level0', ...pt, yaw: isRear ? Math.PI : 0
      });
    }
  }

  if (m.POOL_ZONES?.length) {
    m.POOL_ZONES.forEach((z) => {
      list.push({
        id: `${levelId}_${z.id}`,
        cat: 'here',
        badge: `KHU ${z.code}`,
        badgeClass: 'accent',
        title: z.name,
        subtitle: z.desc || `Poolrooms Area (${Math.round(z.teleX)}, ${Math.round(z.teleZ)})`,
        levelId,
        x: z.teleX,
        y: z.teleY || 0,
        z: z.teleZ,
        yaw: z.teleYaw ?? 0,
        preserveY: true
      });
    });
  }

  if (m.PUMPS?.length) {
    m.PUMPS.forEach((pm) => {
      list.push({
        id: `${levelId}_pump_${pm.id}`,
        cat: 'here',
        badge: pm.done ? 'PUMP DONE' : 'PUMP STATION',
        badgeClass: pm.done ? 'done' : 'portal',
        title: pm.name,
        subtitle: `Hydraulic Valve (${Math.round(pm.x)}, ${Math.round(pm.z)})`,
        levelId,
        x: pm.x,
        y: (pm.y || 0) + 0.15,
        z: pm.z + 1.8,
        yaw: 0,
        preserveY: true
      });
    });
  }

  for (const p of Object.values(players)) {
    if (!p || p.id === myId || p.state === 'dead' || p.state === 'escaped') continue;
    const pLvl = p.levelId || 'level0';
    if (pLvl !== levelId) continue;
    const targetM = getOrCreateLevelMap(pLvl);
    const pt = p.role === 'k'
      ? resolveWalkablePoint(targetM, p.x + 4.5, p.z, p.y || 0)
      : resolveWalkablePoint(targetM, p.x + 1.8, p.z, p.y || 0);
    list.push({
      id: `player_${p.id}`, cat: 'here',
      badge: p.role === 'k' ? 'ENTITY' : 'TEAM',
      badgeClass: p.role === 'k' ? 'warn' : 'done',
      title: p.role === 'k' ? `Entity: ${p.name}` : `Team: ${p.name}`,
      subtitle: `Currently at (${Math.round(p.x)}, ${Math.round(p.y || 0)}, ${Math.round(p.z)})`,
      levelId: pLvl, ...pt, yaw: Math.PI * 0.5
    });
  }

  return list;
}

function teleportToTarget(target, keepOpen = false) {
  const me = players[myId];
  if (!me || !inMatch || matchEnded) return false;
  const dstLvl = target?.levelId || activeLocalLevelId || 'level0';
  const dstMap = getOrCreateLevelMap(dstLvl);
  if (!dstMap) return false;

  const spanX = dstMap.spanX ?? dstMap.worldSpan ?? (N * C);
  const spanZ = dstMap.spanZ ?? dstMap.worldSpan ?? (N * C);
  let tx = Number.isFinite(target?.x) ? target.x : (dstMap.SPAWN?.x ?? spanX * 0.5);
  let tz = Number.isFinite(target?.z) ? target.z : (dstMap.SPAWN?.z ?? spanZ * 0.5);
  let ty = Number.isFinite(target?.y) ? target.y : (dstMap.SPAWN?.y ?? 0);
  const tyaw = Number.isFinite(target?.yaw) ? target.yaw : (dstMap.SPAWN?.yaw ?? me.yaw ?? 0);

  if (!noclipMode && !target?.preserveY && target?.rawCoords !== true) {
    const safePt = resolveWalkablePoint(dstMap, tx, tz, ty, false);
    tx = safePt.x;
    ty = safePt.y;
    tz = safePt.z;
  } else {
    tx = THREE.MathUtils.clamp(tx, -25, spanX + 25);
    tz = THREE.MathUtils.clamp(tz, -25, spanZ + 25);
    ty = THREE.MathUtils.clamp(ty, -12, 180);
  }

  noclipDropLockUntil = performance.now() + 2600;
  hVelX = 0; hVelZ = 0;
  noclipVelX = 0; noclipVelY = 0; noclipVelZ = 0;
  me.vy = 0;

  if (dstLvl !== activeLocalLevelId) {
    sendAction({ act: 'enterLevel', levelId: dstLvl, via: 'tp_panel', tx, ty, tz, tyaw });
  } else {
    sendAction({ act: 'teleportPos', levelId: dstLvl, x: tx, y: ty, z: tz, yaw: tyaw });
  }

  const label = target?.title || `${getLevelMeta(dstLvl).code} (${Math.round(tx)}, ${Math.round(ty)}, ${Math.round(tz)})`;
  pushFeed(`TRANSITION: ${label}`, '#48d0f5');
  if (!keepOpen && tpOpen) closeTpPanel(true);
  else if (tpOpen) renderTpPanel();
  return true;
}

function renderTpPanel() {
  const listEl = $('tpList');
  if (!listEl) return;
  const me = players[myId];
  const curMeta = getLevelMeta(activeLocalLevelId);
  if ($('tpCurrentPos') && me) {
    $('tpCurrentPos').textContent = `Floor: ${curMeta.code} (${curMeta.vnName}) • X=${me.x.toFixed(1)}, Y=${(me.y || 0).toFixed(1)}, Z=${me.z.toFixed(1)}`;
  }

  const q = (tpSearchQuery || '').trim().toLowerCase();
  const matchesQ = (txt) => !q || txt.toLowerCase().includes(q);
  const itemsById = new Map();
  const sections = [];

  if (tpActiveTab === 'all' || tpActiveTab === 'here') {
    const hereSpots = collectLevelLandmarks(activeLocalLevelId).filter(
      it => it.cat !== 'entrances' && matchesQ(`${it.title} ${it.subtitle} ${it.badge}`)
    );
    if (activeLocalLevelId === 'level0') {
      const rearSpots = hereSpots.filter(it => it.subGroup === 'rear');
      const frontSpots = hereSpots.filter(it => it.subGroup === 'front');
      const coreSpots = hereSpots.filter(it => it.subGroup !== 'rear' && it.subGroup !== 'front');
      if (coreSpots.length) sections.push({ heading: `CORE LEVEL 0 & 360° PATHWAYS (${coreSpots.length})`, items: coreSpots });
      if (rearSpots.length) sections.push({ heading: `REAR WORLD EXPANDED — REAR (${rearSpots.length})`, items: rearSpots });
      if (frontSpots.length) sections.push({ heading: `FRONT WORLD — FRONT (${frontSpots.length})`, items: frontSpots });
    } else if (hereSpots.length) {
      sections.push({ heading: `INTERIOR LOCATIONS ${curMeta.code} (${hereSpots.length})`, items: hereSpots });
    }
  }

  if (tpActiveTab === 'entrances' || (tpActiveTab === 'all' && activeLocalLevelId === 'level0')) {
    const entSpots = collectLevelLandmarks('level0').filter(
      it => it.cat === 'entrances' && matchesQ(`${it.title} ${it.subtitle} ${it.badge}`)
    );
    if (entSpots.length) {
      sections.push({ heading: `20 SUB-LEVEL ENTRANCES AT LEVEL 0 (${entSpots.length})`, items: entSpots });
    }
  }

  if (tpActiveTab === 'all' || tpActiveTab === 'levels') {
    const allLvls = [
      { id: 'level0', code: 'LEVEL 0', vnName: '360° Front + Rear Maze & Elevators', tagline: '908m • 70+ Infinite Variants, Electrical Panels & 20 Entrances' },
      ...LEVEL_LIST.map(l => ({ id: l.id, code: l.code, vnName: l.vnName, tagline: `${l.span}m • ${l.entity?.name || ''}` }))
    ];
    const lvlItems = allLvls.filter(l => matchesQ(`${l.code} ${l.vnName} ${l.tagline}`)).map(l => {
      const m = levelMaps.get(l.id);
      const isHere = l.id === activeLocalLevelId;
      const isClr = levelsClearedSet.has(l.id);
      return {
        id: `dim_${l.id}`,
        levelId: l.id,
        title: `${l.code} — ${l.vnName}`,
        subtitle: l.tagline,
        badge: isHere ? 'HERE NOW' : isClr ? '✓ FIXED' : 'GO TO FLOOR',
        badgeClass: isHere || isClr ? 'done' : '',
        hereClass: isHere,
        x: m?.SPAWN?.x, y: m?.SPAWN?.y, z: m?.SPAWN?.z, yaw: m?.SPAWN?.yaw
      };
    });
    if (lvlItems.length) {
      sections.push({ heading: `21 BACKROOMS FLOORS (DIRECT TRANSITION) (${lvlItems.length})`, items: lvlItems });
    }
  }

  if (!sections.length) {
    listEl.innerHTML = `<div style="grid-column:1/-1;padding:18px;text-align:center;color:#9eb8c2;">No location found matching "${esc(q)}".</div>`;
    return;
  }

  listEl.innerHTML = sections.map(sec => {
    const rows = sec.items.map(it => {
      itemsById.set(it.id, it);
      return `<button type="button" class="tp-item${it.hereClass ? ' here' : ''}" data-tp-id="${esc(it.id)}">
        <div class="tp-item-info">
          <div class="tp-item-title">${esc(it.title)}</div>
          <div class="tp-item-sub">${esc(it.subtitle)}</div>
        </div>
        <span class="tp-tag ${it.badgeClass || ''}">${esc(it.badge)}</span>
      </button>`;
    }).join('');
    return `<div class="tp-sec-title">${esc(sec.heading)}</div>${rows}`;
  }).join('');

  listEl._itemsMap = itemsById;
  syncNoclipUI();
}

function openTpPanel() {
  if (!inMatch || matchEnded) return;
  weaponSystem.clearInput(); movementAssist.clearInput();
  if (paused) closePauseMenu(false);
  tpOpen = true;
  for (const k in keys) keys[k] = false;
  resetMobileInputs();
  const me = players[myId];
  if (me) {
    if ($('tpX')) $('tpX').value = me.x.toFixed(1);
    if ($('tpY')) $('tpY').value = (me.y || 0).toFixed(1);
    if ($('tpZ')) $('tpZ').value = me.z.toFixed(1);
  }
  renderTpPanel();
  $('tpPanel')?.classList.remove('hidden');
  document.body.style.cursor = '';
  if (document.pointerLockElement) {
    try { document.exitPointerLock?.(); } catch {}
  }
}

function closeTpPanel(lock = true) {
  tpOpen = false;
  if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
  $('tpPanel')?.classList.add('hidden');
  if (inMatch && !matchEnded && !paused) {
    if (isMobileUiActive()) {
      document.body.style.cursor = '';
    } else {
      document.body.style.cursor = 'none';
      if (lock && !location.hash.includes('test')) requestLock();
    }
  }
}

let creditsOpen = false;
let creditsActiveTab = 'overview';

function switchCreditsTab(tabKey = 'overview') {
  creditsActiveTab = tabKey || 'overview';
  const tabsEl = $('creditsTabs');
  const bodyEl = $('creditsBody');
  if (tabsEl) {
    tabsEl.querySelectorAll('[data-credits-tab]').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.creditsTab === creditsActiveTab);
    });
  }
  if (bodyEl) {
    bodyEl.querySelectorAll('[data-credits-panel]').forEach(sec => {
      sec.classList.toggle('hidden', sec.dataset.creditsPanel !== creditsActiveTab);
    });
    bodyEl.scrollTop = 0;
  }
}

function openCreditsModal(tabKey = 'overview') {
  creditsOpen = true;
  switchCreditsTab(tabKey);
  $('creditsModal')?.classList.remove('hidden');
  document.body.style.cursor = '';
  if (document.pointerLockElement) {
    try { document.exitPointerLock?.(); } catch {}
  }
}

function closeCreditsModal() {
  creditsOpen = false;
  $('creditsModal')?.classList.add('hidden');
  if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
}

function getOrCreateLevelMap(levelId) {
  const id = canonicalLevelId(levelId);
  if (id !== 'level0' && !LEVEL_CATALOG[id]) return null;
  if (levelMaps.has(id)) return levelMaps.get(id);
  const m = id === 'level0' ? genMap(seed) : genSubLevelMap(id, seed);
  if (m) levelMaps.set(id, m);
  return m || map;
}

function showNoclipOverlay(levelId, via) {
  if (via === 'tp_panel') return;
  const ov = $('noclipOverlay');
  if (!ov) return;
  const meta = getLevelMeta(levelId);
  const viaTag = via === 'noclip_floor' ? 'NOCLIP THROUGH FLOOR // '
    : via === 'pickup' ? 'ABNORMAL ITEM // '
    : via === 'crawl_hatch' ? 'PIPELINE // '
    : via === 'join' ? 'TEAM TRANSPORT // '
    : via === 'return' ? 'RETURN TO SPAWN // ' : '';
  $('noclipCode').textContent = `${viaTag}${meta.code}`;
  $('noclipName').textContent = meta.vnName || meta.name;
  $('noclipDesc').textContent = meta.entity?.hint || meta.tagline || '';
  ov.classList.remove('hidden');
  ov.style.opacity = '1';
  clearTimeout(showNoclipOverlay._timer);
  showNoclipOverlay._timer = setTimeout(() => {
    ov.style.opacity = '0';
    setTimeout(() => ov.classList.add('hidden'), 360);
  }, 1500);
}

let hillsAmbience = null;
let hillsExploration = null;
function updateHillsAmbience() {
  if (activeLocalLevelId !== 'level94') { hillsAmbience?.dispose(); hillsAmbience = null; return; }
  if (hillsExploration && players[myId]) hillsExploration.update(players[myId]);
  if (!hillsAmbience && audio.ctx && audio.ambGain) { hillsAmbience = new Level94Ambience({ctx: audio.ctx, parent: audio.ambGain, seed}); hillsAmbience.start(); }
  if (hillsAmbience && players[myId]) {
    const p = players[myId]; hillsAmbience.updateListener(p);
    const nearest = Math.min(...(map.LEVEL_DOORS || []).map(d=>Math.hypot(d.x-p.x,d.z-p.z)));
    const shelter = Math.max(0,1-nearest/14);
    hillsAmbience.windGain.gain.setTargetAtTime(hillsAmbience.gains.windGain*(1-.65*shelter),audio.ctx.currentTime,.8);
    hillsAmbience.roomGain.gain.setTargetAtTime(hillsAmbience.gains.roomToneGain*(1+.7*shelter),audio.ctx.currentTime,.8);
  }
}

function switchLocalWorld(targetLevelId, via = 'portal') {
  const nextId = canonicalLevelId(targetLevelId);
  const nextMap = getOrCreateLevelMap(nextId);
  if (!nextMap) return;

  activeLocalLevelId = nextId;
  if(isPeacefulLevel(nextId)){jumpscareT=0;revealGlobalT=0;jumpscareFx?.classList.remove('active');jumpscareFx?.classList.add('hidden');}
  map = nextMap;
  if (nextId === 'level94' && !hillsExploration) {
    hillsExploration = new ExplorationSystem({onDiscover:name=>pushFeed(name,'#d6e4be')});
    hillsExploration.addAll([...(map.TOWERS||[]).map((t,i)=>({id:`bell_${i}`,x:t.x,z:t.z,name:'Hilltop Bell House'})),...(map.LEVEL_DOORS||[]).map(d=>({...d,name:d.label,kind:'exit'}))]);
  }
  wasEntityCloseLOS = false;
  audio.setLevelMusicContext(nextId);
  updateHillsAmbience();
  if (nextId === 'level37') resetPoolroomsEventsState();
  busyAct = null;
  scState = null;
  hVelX = 0;
  hVelZ = 0;

  if (world) {
    for (const tm of (world.trapMeshes || [])) scene.remove(tm);
    for (const fm of (world.flareMeshes || [])) scene.remove(fm.group);
    world.dispose();
    world = null;
  }

  if (!map.noLightmap) {
    createMapLightmaps(map, texStore);
  }
  world = buildWorld(scene, map, texStore, currentGfx);
  if (world.dustPoints) world.dustPoints.visible = !!fxSettings.dust;
  if (world.skirtInst) world.skirtInst.visible = !(fxSettings.postFX && Number(fxSettings.rtShadow || 0) > 0.05);

  const me = players[myId];
  if (me) {
    me.levelId = nextId;
    camYaw = me.yaw || 0;
    camPitch = 0;
    flashYaw = camYaw;
    flashPitch = 0;
  }

  const meta = getLevelMeta(nextId);
  const amK = me?.role === 'k';
  if (nextId === 'level0') {
    scene.fog.density = amK ? FOG_KILLER : FOG_SURV;
    scene.background.setHex(0x161207);
    scene.fog.color.setHex(0x161207);
  } else {
    scene.fog.density = amK ? FOG_KILLER : (meta.fogDensity ?? 0.008);
    scene.background.setHex(meta.fogColor ?? 0x161207);
    scene.fog.color.setHex(meta.fogColor ?? 0x161207);
    hemiLight.color.setHex(meta.hemiSky ?? 0xd8e0e8);
    hemiLight.groundColor.setHex(meta.hemiGround ?? 0x26200d);
  }
  applyWorldVisibilitySettings();
  gfx.setEnvironmentProfile?.(nextId);
  gfx.resetExposure?.(0.82);
  gfx.resetMotionHistory();
  showNoclipOverlay(nextId, via);
  audio.playAlertBeep?.();
}

function triggerJoinActiveLevel() {
  const me = players[myId];
  if (!me || me.role !== 's' || me.state !== 'ok' || activeLocalLevelId !== 'level0' || !activeJoinTarget) return;
  noclipDropLockUntil = performance.now() + 1800;
  sendAction({ act: 'enterLevel', levelId: activeJoinTarget.levelId, via: 'join' });
}

// ---------- Feed Notifications ----------
function pushFeed(text, color = '#ffe7a0') {
  feeds.push({ text, color, t: 4.5 });
  if (feeds.length > 5) feeds.shift();
}

function updateFeedDOM(dt) {
  for (let i = feeds.length - 1; i >= 0; i--) {
    feeds[i].t -= dt;
    if (feeds[i].t <= 0) feeds.splice(i, 1);
  }
  $('feedBox').innerHTML = feeds
    .map(f => `<div style="color:${f.color};background:rgba(0,0,0,0.55);padding:3px 8px;">${esc(f.text)}</div>`)
    .join('');
}

// ---------- Graphics, Aspect Ratio (4:3 / 16:9) & FPS Helpers ----------
function computeViewportRect(mode = aspectMode) {
  const ww = Math.max(320, window.innerWidth);
  const wh = Math.max(240, window.innerHeight);
  // In mobile UI wide mode, fill phone screen cleanly (no dark pillarboxes on 20:9 landscape or vertical portrait)
  if (mode !== '4:3' && isMobileUiActive()) {
    return { x: 0, y: 0, w: ww, h: wh };
  }
  const targetRatio = mode === '4:3' ? (4 / 3) : (16 / 9);
  let w = ww;
  let h = Math.round(ww / targetRatio);
  if (h > wh) {
    h = wh;
    w = Math.round(wh * targetRatio);
  }
  return { x: Math.floor((ww - w) / 2), y: Math.floor((wh - h) / 2), w, h };
}

function applyViewportLayout() {
  const r = computeViewportRect(aspectMode);
  for (const el of [renderer.domElement, hud, fearFx]) {
    el.style.left = `${r.x}px`;
    el.style.top = `${r.y}px`;
    el.style.width = `${r.w}px`;
    el.style.height = `${r.h}px`;
  }
  hud.classList.toggle('aspect-43', aspectMode === '4:3');
  camera.aspect = r.w / r.h;
  camera.updateProjectionMatrix();
  gfx.setAspectMode(aspectMode);
  gfx.setSize(r.w, r.h);
}

function formatFxVal(ctrl, v) {
  if (ctrl.unit === 'raw') return Number(v).toFixed(Number(v) % 1 ? 2 : 0);
  if (ctrl.type === 'toggle') return v ? 'On' : 'Off';
  if (ctrl.type === 'select') return ctrl.options?.find(o => o.value === v)?.label || String(v || '');
  if (ctrl.unit === 'deg') return `${Math.round(Number(v) || 0)}°`;
  if (ctrl.unit === 'm') return `${Math.round(Number(v) || 0)} m`;
  if (ctrl.unit === 'sec') return `${Number(v || 0).toFixed(2).replace(/\.00$/, '')}s`;
  if (ctrl.unit === 'ev') {
    const n = Number(v) || 0;
    return `${n > 0 ? '+' : ''}${n.toFixed(2)} EV`;
  }
  if (ctrl.unit === 'signedPct') {
    const p = Math.round((Number(v) || 0) * 100);
    return `${p > 0 ? '+' : ''}${p}%`;
  }
  return `${Math.round(Number(v) * 100)}%`;
}

function renderFxControlRow(c) {
  let ctrlHtml;
  if (c.type === 'toggle') {
    ctrlHtml = `<label class="fx-toggle-wrap"><input type="checkbox" data-fx-key="${c.key}" /> <span data-fx-val="${c.key}">On</span></label>`;
  } else if (c.type === 'select') {
    const opts = (c.options || []).map(o => `<option value="${esc(o.value)}">${esc(o.label)}</option>`).join('');
    ctrlHtml = `<select data-fx-key="${c.key}">${opts}</select>`;
  } else {
    ctrlHtml = `<input type="range" data-fx-key="${c.key}" min="${c.min}" max="${c.max}" step="${c.step}" value="1" />`;
  }
  const topRight = (c.type === 'toggle' || c.type === 'select') ? '' : `<span class="fx-val" data-fx-val="${c.key}">100%</span>`;
  return `<div class="fx-row">
    <div class="fx-row-top">
      <div><div class="fx-label">${esc(c.label)}</div><div class="fx-hint">${esc(c.hint)}</div></div>
      ${topRight}
    </div>
    ${ctrlHtml}
  </div>`;
}

function mountFxTable(container) {
  if (!container) return;
  const groups = FX_GROUPS.length ? FX_GROUPS : [{ id: null, title: 'Graphics Settings', sub: '' }];
  container.innerHTML = groups.map((g) => {
    const items = FX_CONTROLS.filter(c => !g.id || c.group === g.id);
    if (!items.length) return '';
    const head = g.id ? `<div class="fx-group-head"><span>${esc(g.title)}</span><span class="fx-group-sub">${esc(g.sub)}</span></div>` : '';
    const rows = items.map(renderFxControlRow).join('');
    return ['tactical', 'weapons'].includes(g.id) ? `<details class="fps-settings-details"><summary>${esc(g.title)}</summary><div class="fx-group-sub">${esc(g.sub)}</div>${rows}</details>` : head + rows;
  }).join('');

  const onUpdate = (e) => {
    const key = e.target?.dataset?.fxKey;
    if (!key) return;
    const ctrl = FX_CONTROLS.find(x => x.key === key);
    if (!ctrl) return;
    const nextVal = ctrl.type === 'toggle'
      ? !!e.target.checked
      : ctrl.type === 'select'
        ? String(e.target.value)
        : Number(e.target.value);
    if (Object.is(fxSettings[key],nextVal) && fxSettings.userFxKeys?.includes(key)) return;
    fxSettings[key] = nextVal;
    fxSettings.userFxKeys = [...new Set([...(fxSettings.userFxKeys || []),key])];
    if (FPS_SETTING_KEYS.includes(key)) saveFpsPreferences();

    // Bidirectional preset synchronization without overwriting unrelated settings
    if (key === 'eyeAdaptPreset' && nextVal !== 'custom' && EYE_ADAPT_PRESETS[nextVal]) {
      const ep = EYE_ADAPT_PRESETS[nextVal];
      fxSettings.eyeAdaptEnabled = ep.enabled;
      fxSettings.eyeAdaptStrength = ep.strength;
      fxSettings.eyeAdaptBrightSpeed = ep.brightSpeed;
      fxSettings.eyeAdaptDarkSpeed = ep.darkSpeed;
      fxSettings.eyeAdaptComp = ep.comp;
      fxSettings.eyeAdaptMinExp = ep.minExp;
      fxSettings.eyeAdaptMaxExp = ep.maxExp;
      fxSettings.userFxKeys.push('eyeAdaptMinExp','eyeAdaptMaxExp');
    } else if (key === 'eyeAdaptEnabled') {
      fxSettings.userFxKeys.push('eyeAdaptPreset');
      if (!nextVal) fxSettings.eyeAdaptPreset = 'off';
      else if (fxSettings.eyeAdaptPreset === 'off') {
        const ep = EYE_ADAPT_PRESETS.cinematic;
        fxSettings.eyeAdaptPreset = 'cinematic';
        fxSettings.eyeAdaptStrength = fxSettings.eyeAdaptStrength > 0.01 ? fxSettings.eyeAdaptStrength : ep.strength;
      }
    } else if (['eyeAdaptStrength', 'eyeAdaptBrightSpeed', 'eyeAdaptDarkSpeed', 'eyeAdaptComp', 'eyeAdaptMinExp', 'eyeAdaptMaxExp'].includes(key)) {
      fxSettings.userFxKeys.push('eyeAdaptPreset');
      if (Number(fxSettings.eyeAdaptMaxExp) < Number(fxSettings.eyeAdaptMinExp) + 0.15) {
        fxSettings.eyeAdaptMaxExp = Math.min(4.0, Number(fxSettings.eyeAdaptMinExp) + 0.15);
      }
      fxSettings.eyeAdaptPreset = fxSettings.eyeAdaptEnabled ? 'custom' : 'off';
    } else if (key === 'renderDistPreset' && RENDER_DIST_PRESETS[nextVal]) {
      fxSettings.renderDistance = RENDER_DIST_PRESETS[nextVal].meters;
    } else if (key === 'renderDistance') {
      const mKey = String(Math.round(Number(nextVal)));
      fxSettings.renderDistPreset = RENDER_DIST_PRESETS[mKey] ? mKey : 'custom';
    }

    fxSettings.userFxKeys = [...new Set(fxSettings.userFxKeys)];
    applyFxSettings();
  };
  container.addEventListener('input', onUpdate);
  container.addEventListener('change', onUpdate);
}

function syncSettingsUI() {
  $('gfxSelect').value = currentGfx;
  $('pauseGfx').value = currentGfx;
  $('fpsSelect').value = String(fpsCap);
  $('pauseFps').value = String(fpsCap);
  $('aspectSelect').value = aspectMode;
  $('pauseAspect').value = aspectMode;
  $('sensSlider').value = String(mouseSens);
  $('pauseSens').value = String(mouseSens);
  $('sensVal').textContent = mouseSens.toFixed(2);
  $('pauseSensVal').textContent = mouseSens.toFixed(2);
  $('musicSlider').value = String(musicVol);
  $('pauseMusic').value = String(musicVol);
  $('musicVal').textContent = `${Math.round(musicVol * 100)}%`;
  $('pauseMusicVal').textContent = `${Math.round(musicVol * 100)}%`;
  $('sfxSlider').value = String(sfxVol);
  $('pauseSfx').value = String(sfxVol);
  $('sfxVal').textContent = `${Math.round(sfxVol * 100)}%`;
  $('pauseSfxVal').textContent = `${Math.round(sfxVol * 100)}%`;

  for (const ctrl of FX_CONTROLS) {
    const val = fxSettings[ctrl.key];
    document.querySelectorAll(`[data-fx-key="${ctrl.key}"]`).forEach((el) => {
      if (ctrl.type === 'toggle') el.checked = !!val;
      else el.value = String(val);
      if (ctrl.key.startsWith('tactical_')) el.disabled = fxSettings.movementProfile !== 'tactical';
    });
    document.querySelectorAll(`[data-fx-val="${ctrl.key}"]`).forEach((el) => {
      el.textContent = formatFxVal(ctrl, val);
    });
  }
}

function setAspectMode(mode) {
  aspectMode = mode === '4:3' ? '4:3' : '16:9';
  localStorage.setItem('br_aspect_v2', aspectMode);
  applyViewportLayout();
  syncSettingsUI();
}

function applyWorldVisibilitySettings() {
  const rd = THREE.MathUtils.clamp(Number(fxSettings.renderDistance ?? 200), 50, 800);
  const amK = players?.[myId]?.role === 'k';
  const nextFar = map?.hills ? Math.max(rd, map.levelCfg.minFar || 660) : (amK && activeLocalLevelId === 'level0') ? Math.min(rd, FAR_KILLER) : rd;
  if (Math.abs(camera.far - nextFar) > 0.5) {
    camera.far = nextFar;
    camera.updateProjectionMatrix();
  }
  const skyFit = Math.max(42, nextFar * 0.85) / 540;
  if (world?.skyDome?.mesh) {
    world.skyDome.mesh.scale.setScalar(skyFit);
  }
  const v7EyeOn = !!(fxSettings.postFX && fxSettings.eyeAdaptEnabled && fxSettings.eyeAdaptPreset !== 'off');
  world?.daylight?.exposure?.setExternalManaged?.(v7EyeOn);
  if (world?.setQualitySettings) {
    world.setQualitySettings(
      {
        renderDistance: rd,
        waterQuality: fxSettings.waterQuality,
        cloudQuality: fxSettings.cloudQuality,
        quality: currentGfx, shadows: fxSettings.shadows,
        shadowMapSize: (GFX_PRESETS[currentGfx] || GFX_PRESETS.ultra).shadowMapSize
      },
      camera.position,
      matchTime
    );
  } else if (world?.setRenderDistance) {
    world.setRenderDistance(rd, matchTime, camera.position);
  }
}

function applyFxSettings() {
  Object.assign(fxSettings, loadFpsPreferences());
  // Review diagnostics: record every fx application so intermittent preset
  // restores (breaking clean captures) can be attributed to a caller.
  const _log = (window.__FX_APPLY_LOG ||= []);
  if (_log.length < 400) _log.push({ t: performance.now() | 0, mode: fxSettings.footageFilterMode, scan: fxSettings.scanlines, vig: fxSettings.vignette, stack: (new Error().stack || '').split('\n')[2] || '' });
  localStorage.setItem('br_fx_v2', JSON.stringify(fxSettings));
  gfx.applyFx({...fxSettings,userFxKeys:fxSettings.userFxKeys || []}, hemiLight, ambLight);
  applyWorldVisibilitySettings();
  hud?.classList.toggle('clean-cam', !!fxSettings.cleanCamHud);
  hud?.classList.toggle('no-scanlines', fxSettings.crtScanlines === false || Number(fxSettings.scanlines) <= 0.01);
  hud?.classList.toggle('dreamcam-clean', fxSettings.footageFilterMode === 'soft_dreamcam' && Number(fxSettings.footageFilterStrength ?? 1.0) >= 0.4);
  syncMobileUiVisibility();
  const preset = GFX_PRESETS[currentGfx] || GFX_PRESETS.ultra;
  localFlash.castShadow = !!fxSettings.shadows;
  if (fxSettings.shadows && preset.shadowMapSize && localFlash.shadow.mapSize.x !== preset.shadowMapSize) {
    localFlash.shadow.mapSize.set(preset.shadowMapSize, preset.shadowMapSize);
    localFlash.shadow.map?.dispose();
    localFlash.shadow.map = null;
  }
  if (world?.dustPoints) {
    world.dustPoints.visible = !!fxSettings.dust;
  }
  if (world?.skirtInst) {
    world.skirtInst.visible = !(fxSettings.postFX && Number(fxSettings.rtShadow || 0) > 0.05);
  }
  syncSettingsUI();
  weaponSystem.configure?.(presentationSettings(fxSettings));
  requestMovementProfile();
}

function setGraphicsPreset(key, resetCustomFx = true) {
  currentGfx = key in GFX_PRESETS ? key : 'ultra';
  localStorage.setItem('br_gfx_v2', currentGfx);
  gfx.presetKey = currentGfx;
  if (resetCustomFx) {
    fxSettings = getPresetDefaultFx(currentGfx);
    fxSettings.userFxKeys = [];
  }
  applyFxSettings();
}

function setFpsCap(val) {
  const n = Number(val);
  fpsCap = FPS_CAPS.includes(n) ? n : 15;
  localStorage.setItem('br_fps_v2', String(fpsCap));
  syncSettingsUI();
}

// ---------- Networking & Lobby ----------
const net = new NetworkManager({
  onStatus(msg) {
    $('netStatus').textContent = msg;
  },
  onPing(ms) {
    $('pingCounter').textContent = `${ms} ms`;
  },
  onLobbyUpdate(roster, nMgr) {
    $('rosterCount').textContent = String(roster.length);
    $('aiToggle').checked = nMgr.aiEnabled;
    $('aiToggle').disabled = !nMgr.isHost;

    if (!nMgr.isSolo && nMgr.roomCode && (nMgr.isHost || nMgr.joined)) {
      $('roomShareBox').classList.remove('hidden');
      $('roomCodeText').textContent = nMgr.roomCode;
    } else {
      $('roomShareBox').classList.add('hidden');
    }

    $('startGameBtn').classList.toggle('hidden', !nMgr.isHost || roster.length < 1);

    const listEl = $('rosterList');
    listEl.innerHTML = roster.map(r => {
      const col = r.role === 'k' ? '#d92820' : `#${SURV_COLORS[(r.colorIdx || 0) % SURV_COLORS.length].hex.toString(16).padStart(6, '0')}`;
      const roleLabel = r.role === 'k' ? 'ENTITY' : 'SURVIVOR';
      const switchBtn = nMgr.isHost && !r.isAI
        ? `<button class="sm role-btn" data-id="${esc(r.id)}">${r.role === 'k' ? 'Switch to Human' : 'Switch to Monster'}</button>`
        : '';
      return `<div class="roster-item">
        <span><span class="swatch" style="background:${col};"></span>${esc(r.name)}</span>
        <span style="display:flex;align-items:center;gap:8px;">
          <span style="color:${r.role === 'k' ? '#ff7c74' : '#e6d27a'};font-size:11px;">${roleLabel}</span>
          ${switchBtn}
        </span>
      </div>`;
    }).join('');

    listEl.querySelectorAll('.role-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const t = net.roster.find(x => x.id === btn.dataset.id);
        if (t) net.assignRole(t.id, t.role === 'k' ? 's' : 'k');
      });
    });
  },
  onStartGame(msg) {
    beginMatch(msg.seed, msg.roster, net.myId);
  },
  onSnapshot(snap) {
    applyHostSnapshot(snap);
  },
  onEvent(ev) {
    handleNetEvent(ev);
  },
  onClientInput(peerId, inp) {
    const p = players[peerId];
    if (!p || p.state === 'dead' || p.state === 'escaped') return;
    if (p.warpGuardUntil && performance.now() < p.warpGuardUntil) return;
    const pm = getOrCreateLevelMap(p.levelId || 'level0');
    p.moveSprint = !!inp.sprint && (p.movement?.key === 'tactical' || (!p.stamExhausted && (p.moveStam ?? SPEED.STAM_DRAIN) > 0));
    const cap = hostMovementCap(p, pm);
    const accepted = movementGuard.accept(p, inp, {
      now: performance.now() / 1000, cap,
      floorAt: (x, z, y) => getTerrainAt(x, z, pm, y).floorY,
      abyssAt: (x,z,y)=>!!classicPitAt(pm.classic,x,z,y),
      resolve: (x, z, crouch, y) => collide(x, z, p.role === 'k' ? .42 : .36, pm, crouch, y),
      canStand: (x, z, y) => canStandAt(x, z, pm, y)
    });
    if (accepted && (Math.hypot(p.x - inp.x, p.z - inp.z) > .25 || Math.abs(p.y-inp.y)>.9)) {
      net.conns.get(peerId)?.send({ t: 'ev', ev: 'moveCorrection', id: peerId, x: p.x, y: p.y, z: p.z });
    }
  },
  onClientAction(peerId, msg) {
    processPlayerActionHost(peerId, msg);
  },
  onPeerDisconnect(peerId) {
    weaponSystem.removeRemote(peerId);
    if (inMatch && players[peerId]) {
      pushFeed(`${players[peerId].name} disconnected`, '#ff9a8a');
      delete players[peerId];
      if (avatars[peerId]) {
        scene.remove(avatars[peerId].group);
        delete avatars[peerId];
      }
      if (net.isHost) checkMatchEnd();
    }
  },
  onHostDisconnect() {
    weaponSystem.clearInput(); weaponSystem.pendingShots.clear();
    if (inMatch && !matchEnded) {
      pushFeed('Lost connection to Host!', '#ff5648');
    }
  }
});

// ---------- Match Setup & Teardown ----------
function hostMovementCap(p, pm) {
  const profile = normalizeProfile(p.movement);
  if (p.role === 's' && p.state === 'ok' && profile.key === 'tactical') return tacticalSpeed(profile, { shift: p.moveSprint, crouch: p.crouch, water: getTerrainAt(p.x, p.z, pm, p.y).inWater });
  let chase = 0;
  if (p.role === 's' && !isPeacefulLevel(p.levelId)) {
    let nearest = 999;
    for (const other of Object.values(players)) if (other.role === 'k' && other.levelId === p.levelId) nearest = Math.min(nearest, Math.hypot(p.x - other.x, p.z - other.z));
    chase = Math.max(0, Math.min(1, (18 - nearest) / 14));
  }
  let cap = p.role === 'k' ? (p.carrying ? SPEED.KILLER_CARRY : p.moveSprint ? SPEED.KILLER_SPRINT : SPEED.KILLER_BASE)
    : p.state === 'down' ? SPEED.SURV_DOWN
    : p.sliding || p.moveSprint ? SPEED.SURV_SPRINT * (1 + chase * .14)
    : p.crouch ? SPEED.SURV_CROUCH : (p.moveThirst ?? WATER_LIFE) <= 0 ? SPEED.SURV_THIRSTY : SPEED.SURV_WALK * (1 + chase * .14);
  if ((p.jellyUntil || 0) > performance.now() / 1000) cap *= 1.22;
  if (p.role === 'k' && (p.weaponStunUntil || 0) > performance.now() / 1000) cap = Math.min(cap, SPEED.KILLER_SLOW);
  if (p.role !== 'k' && getTerrainAt(p.x, p.z, pm, p.y).inWater) cap *= .8;
  return cap;
}
function updateSceneOptics(elapsed,dt) {
  const classic=inClassicPresentation(map?.classic,camera.position.x,camera.position.z);
  gfx.setLocalExposureLimit(classic?1.6:Infinity);
  if(classic)gfx.setCoolGrade(1);else if(gfx._wasClassic)gfx.setCoolGrade(activeLocalLevelId==='level37'?.92:0);gfx._wasClassic=classic;
  // First-person depth compression belongs to the player view, never the water's scene captures.
  const view=weaponSystem.view.root,visible=view.visible;view.visible=false;
  try{world?.updateOptics?.(renderer,camera,elapsed,dt,Number(fxSettings.brightness)||1);}finally{view.visible=visible;}
}
function requestMovementProfile() {
  const p = players[myId]; if (!inMatch || !p || p.role !== 's' || p.state !== 'ok') return;
  const profile = profileFromSettings(fxSettings), signature = profileSignature(profile);
  if (signature === profileSignature(p.movement) || signature === pendingProfileSignature) return;
  pendingProfileSignature = signature; movementProfileSequence = Math.max(movementProfileSequence, p.movement?.sequence || 0) + 1;
  sendAction({ act: 'movementProfile', profile, seq: movementProfileSequence });
}

function traceWeaponWorld(p, origin, dir, range) {
  const pm = getOrCreateLevelMap(p.levelId || 'level0'), seen = new Set();
  let best = range, normal = { x: -dir.x, y: -dir.y, z: -dir.z };
  for (let t = 0; t < best; t += .3) {
    const x = origin.x + dir.x * t, y = origin.y + dir.y * t, z = origin.z + dir.z * t;
    for (const b of pm.wallGrid.queryNear(x, z, .25)) {
      if (seen.has(b) || (b.elevatorDoor && (pm.elevatorOpenProgress || 0) >= .72)) continue;
      seen.add(b); const d = rayBox(origin, dir, b, best); if (d !== null && d > .02 && d < best) best = d;
    }
    const terrain = getTerrainAt(x, z, pm, y), cell = getPoolroomsCellAt(x, z, pm);
    const solid = y < terrain.floorY || (cell && (cell.tubeNetwork ? tubeDistance(cell.tubeNetwork, x, y - cell.floorY, z) > 0 : y > cell.floorY + cell.ceiling));
    if (solid) { best = Math.min(best, t); break; }
  }
  return best < range ? { distance: best, x: origin.x + dir.x * best, y: origin.y + dir.y * best, z: origin.z + dir.z * best, normal } : null;
}

const combatAuthority = new CombatAuthority({ emit: broadcastEvent, trace: traceWeaponWorld, targets: () => Object.values(players), peaceful: isPeacefulLevel });
const weaponSystem = new WeaponSystem({ camera, renderer, scene, audio, send: msg => {
  const p = players[myId];
  if (!net.isHost && p && msg.act === 'weaponFire') net.sendToHost({ t: 'input', x: p.x, y: p.y, z: p.z, yaw: p.yaw, pitch: p.pitch, crouch: p.crouch, fl: p.fl, sliding: !!p.sliding, sprint: !!keys[DEF_KB.sprint] || mobSprintToggle || mobEdgeSprint, bhop: movementAssist.hopBonus > 0 });
  sendAction(msg);
}, hud,
  context: () => ({ active: inMatch && !paused && !tpOpen && !matchEnded && !busyAct && !scState && (net.isHost || net.hostConn?.open), player: players[myId], floorY: map && players[myId] ? getTerrainAt(players[myId].x, players[myId].z, map, players[myId].y).floorY : 0 })
});

function clearMatchObjects() {
  weaponSystem.reset(); movementAssist.reset();
  resetMobileInputs();
  setNoclipMode(false, true);
  tpOpen = false;
  $('tpPanel')?.classList.add('hidden');
  $('joinLevelBar')?.classList.add('hidden');
  $('noclipOverlay')?.classList.add('hidden');
  for (const id of Object.keys(avatars)) {
    scene.remove(avatars[id].group);
  }
  avatars = {};
  for (const b of beaconPool) scene.remove(b);
  beaconPool.length = 0;

  if (world) {
    for (const tm of world.trapMeshes) scene.remove(tm);
    for (const fm of world.flareMeshes) scene.remove(fm.group);
    for (const fpl of (world.flareLightPool || [])) fpl.intensity = 0;
    world.dispose();
    world = null;
  }
}

async function warmupMatchEffects(amK, me) {
  window.__BR_WARMUP_DONE = false;
  setPreloadOverlay(
    true,
    0.15,
    'Building 3D map, area lighting & characters...',
    'PRE-MATCH SHADER & FX WARM-UP',
    'TESTING LIGHTS, ITEMS & EFFECTS'
  );
  await PreloaderSystem.yieldFrame();

  const px = me ? me.x : map.SPAWN.x;
  const pz = me ? me.z : map.SPAWN.z;
  const pyaw = me ? me.yaw : 0;
  const fwX = -Math.sin(pyaw), fwZ = -Math.cos(pyaw);
  camera.position.set(px, 1.56, pz);
  camera.rotation.order = 'YXZ';
  camera.rotation.set(0, pyaw, 0);
  camera.updateMatrixWorld(true);

  // Phase 2: Warm Flashlight ON (with 1024 shadow FBO) + Flashlight OFF shader variants
  setPreloadOverlay(true, 0.35, 'Testing flashlight toggle [F] & real-time shadows...');
  await PreloaderSystem.yieldFrame();

  localFlash.position.set(px, 1.48, pz);
  localFlashCore.position.set(px, 1.48, pz);
  localFlashTarget.position.set(px + fwX * 14, 1.4, pz + fwZ * 14);
  localFlash.visible = true;
  localFlashCore.visible = true;
  fpFlashGroup.visible = true;
  renderer.shadowMap.needsUpdate = true;
  updateWorldLighting(world, map, camera.position, 0.1, []);
  try { renderer.compile(scene, camera); } catch {}
  gfx.update(0.016, { speedRatio: 0.4, panic: 0.15, isKiller: amK, elapsed: 0.1, nearLights: world.lightPool });
  gfx.render(0.016);

  localFlash.visible = false;
  localFlashCore.visible = false;
  fpFlashGroup.visible = false;
  gfx.render(0.016);

  // Phase 3: Place & compile UV Flare, Bear Trap, Scanner Beacon, Claws, Entity rig & overlays inside camera frustum
  setPreloadOverlay(true, 0.62, 'Testing UV flare, traps, entity & item detectors...');
  await PreloaderSystem.yieldFrame();

  const wx = px + fwX * 2.1;
  const wz = pz + fwZ * 2.1;
  const warmFlare = spawnFlareMesh(scene, wx, wz, world.flareLightPool?.[0] || null);
  const warmTrap = spawnTrapMesh(scene, wx + 0.55, wz);
  ensureBeaconCount(1);
  if (beaconPool[0]) {
    beaconPool[0].visible = true;
    beaconPool[0].position.set(wx - 0.5, 1.4, wz);
  }
  fpClaws.setVisible(true);
  updateFPEntityClaws(fpClaws, 0.016, { elapsed: 0.5, speedRatio: 0.8, swingT: 0.5 });

  // Bring one Entity avatar briefly into frustum so entity PBR + emissive eyes compile cleanly
  const firstEnt = Object.entries(avatars).find(([id]) => players[id]?.role === 'k');
  let entBackup = null;
  if (firstEnt) {
    const [eid, eav] = firstEnt;
    const ep = players[eid];
    entBackup = { av: eav, x: eav.group.position.x, y: eav.group.position.y, z: eav.group.position.z, vis: eav.group.visible };
    eav.group.visible = true;
    eav.group.position.set(wx, 0, wz);
    animateEntity(eav, 0.016, ep || { spd: 5.0, swingT: 0.4 }, 0.5);
  }

  localFlash.visible = true;
  localFlashCore.visible = true;
  fpFlashGroup.visible = true;
  fearFx.style.background = 'radial-gradient(circle, transparent 42%, rgba(160, 12, 8, 0.88) 100%)';
  fearFx.style.opacity = '0.3';
  const scEl = $('scWrap');
  scEl?.classList.remove('hidden');

  try { renderer.compile(scene, camera); } catch {}
  gfx.update(0.016, { speedRatio: 0.8, panic: 0.55, isKiller: amK, elapsed: 0.2, nearLights: world.lightPool });
  gfx.render(0.016);

  // Cleanly remove all temporary warmup geometry & restore entities/overlays
  scene.remove(warmFlare.group);
  if (warmFlare.pooled && warmFlare.light) warmFlare.light.intensity = 0;
  scene.remove(warmTrap);
  for (const b of beaconPool) b.visible = false;
  if (entBackup) {
    entBackup.av.group.position.set(entBackup.x, entBackup.y, entBackup.z);
    entBackup.av.group.visible = entBackup.vis;
  }
  scEl?.classList.add('hidden');
  fearFx.style.opacity = '0';

  // Phase 4: Warm up post-processing composer passes, lens curvature, color controls & Footage/Stream presets
  setPreloadOverlay(true, 0.86, 'Testing lens, color, and Stream/VOD filters...');
  await PreloaderSystem.yieldFrame();

  const savedMode = fxSettings.footageFilterMode;
  const savedStr = fxSettings.footageFilterStrength;
  if (savedMode !== 'hybrid_all') {
    fxSettings.footageFilterMode = 'hybrid_all';
    fxSettings.footageFilterStrength = 1.0;
    gfx.applyFx(fxSettings, hemiLight, ambLight);
    gfx.update(0.016, { turnYawRate: -3.2, speedRatio: 0.6, panic: 0.25, isKiller: amK, elapsed: 0.3, nearLights: world.lightPool });
    gfx.render(0.016);
    gfx.render(0.016);
  }
  fxSettings.footageFilterMode = savedMode;
  fxSettings.footageFilterStrength = savedStr;
  gfx.applyFx(fxSettings, hemiLight, ambLight);

  fpClaws.setVisible(amK);
  fpFlashGroup.visible = !amK;
  localFlash.visible = !amK;
  localFlashCore.visible = !amK;
  syncFlashlightUI(me);

  gfx.update(0.016, { speedRatio: 0, panic: 0, isKiller: amK, elapsed: 0.0, nearLights: world.lightPool });
  gfx.render(0.016);
  gfx.resetMotionHistory();

  setPreloadOverlay(true, 1.0, 'Test complete — Start recording!');
  await PreloaderSystem.yieldFrame();
  window.__BR_WARMUP_DONE = true;
}

async function beginMatch(matchSeed, roster, localId) {
  if (warmingMatch) return;
  warmingMatch = true;
  hillsAmbience?.dispose(); hillsAmbience = null;
  inMatch = false;
  audio.ensureContext();
  clearMatchObjects();
  setPreloadOverlay(
    true,
    0.05,
    'Initializing Backrooms Level 0 map...',
    'PRE-MATCH SHADER & FX WARM-UP',
    'TESTING LIGHTS, ITEMS & EFFECTS'
  );
  lobbyScr.classList.add('hidden');
  endScr.classList.add('hidden');
  pauseScr.classList.add('hidden');
  hud.classList.add('hidden');

  seed = matchSeed;
  myId = localId;
  matchEnded = false;
  paused = false;
  matchTime = 0;
  busyAct = null;
  scState = null;
  feeds = [];

  levelMaps.clear();
  activeLocalLevelId = 'level0';
  wasEntityCloseLOS = false;
  audio.setLevelMusicContext('level0');
  activeJoinTarget = null;
  levelDiscoveredSet.clear();
  levelsClearedSet.clear();

  map = genMap(seed);
  levelMaps.set('level0', map);
  createMapLightmaps(map, texStore);
  world = buildWorld(scene, map, texStore, currentGfx);
  if (world.dustPoints) world.dustPoints.visible = !!fxSettings.dust;
  if (world.skirtInst) world.skirtInst.visible = !(fxSettings.postFX && Number(fxSettings.rtShadow || 0) > 0.05);

  players = {};
  let sIdx = 0;
  let routeMapIdx = 0;
  const elevPos = map.ELEVATOR || map.SPAWN;
  const elevSlots = [
    [0.0, 0.15],
    [-0.85, 0.35],
    [0.85, 0.35],
    [-0.48, 0.92],
    [0.48, 0.92]
  ];
  for (const r of roster) {
    const isK = r.role === 'k';
    let ox, oz;
    if (isK) {
      let archIdx = ENTITY_ARCHETYPES.findIndex(a => a.id === r.id);
      if (archIdx < 0) archIdx = ENTITY_ARCHETYPES.findIndex(a => a.kind === r.aiKind);
      archIdx = Math.max(0, archIdx);
      const route = map.ENTITY_ROUTES?.[archIdx % (map.ENTITY_ROUTES?.length || 1)] || map.ENTITY_ROUTES?.[routeMapIdx];
      const safeWps = (route?.wps || []).filter(w => Math.hypot(w.x - elevPos.x, w.z - elevPos.z) >= 85);
      const wpIdx = r.spawnJitter && safeWps.length ? Math.floor(r.spawnJitter * safeWps.length) % safeWps.length : 0;
      const rSpawn = safeWps[wpIdx] || safeWps[0] || map.K_SPAWN;
      ox = rSpawn.x;
      oz = rSpawn.z;
      routeMapIdx++;
    } else {
      const slot = elevSlots[sIdx % elevSlots.length];
      ox = elevPos.x + slot[0];
      oz = elevPos.z + slot[1];
    }

    players[r.id] = {
      id: r.id,
      name: r.name,
      role: r.role,
      aiKind: r.aiKind || 'bacteria',
      levelId: 'level0',
      colorIdx: r.colorIdx ?? sIdx,
      isAI: !!r.isAI,
      x: ox, y: 0, z: oz, vy: 0,
      yaw: 0, pitch: 0, spd: 0,
      crouch: false, fl: !isK,
      hp: 2,
      state: 'ok', // ok | down | carried | hooked | dead | escaped
      bleed: BLEED,
      hookT: HOOK_T,
      hooks: 0,
      hookIdx: -1,
      selfEscapeLeft: isK ? 0 : 1,
      escapeGuardT: 0,
      carrying: null,
      swingT: 0,
      reveal: false,
      weapon: makeLoadout(), movement: { ...normalizeProfile(null), sequence: 0, revision: 0 }, sliding: false, moveStam: SPEED.STAM_DRAIN, moveThirst: WATER_LIFE,
      inv: { water: 2, scan: 1, jelly: 0, ration: 0, flare: 1 } // Starter gear plus dedicated weapon slots 6/7/8.
    };

    if (r.id !== myId) {
      const av = isK ? buildEntityAvatar(r.aiKind || 'bacteria') : buildSurvivorAvatar(r.colorIdx);
      av.group.position.set(ox, 0, oz);
      scene.add(av.group);
      avatars[r.id] = av;
    }

    if (!isK) sIdx++;
  }

  // Host initializes ALL AI Entity controllers with distinct archetypes & long-range territory routes
  aiControllers = [];
  if (net.isHost) {
    const aiEntries = roster.filter(r => r.isAI && r.role === 'k');
    aiEntries.forEach((entry, idx) => {
      const arch = ENTITY_ARCHETYPES.find(a => a.id === entry.id) || ENTITY_ARCHETYPES.find(a => a.kind === entry.aiKind) || ENTITY_ARCHETYPES[idx % ENTITY_ARCHETYPES.length];
      const route = map.ENTITY_ROUTES?.find(rt => rt.id === arch.id) || map.ENTITY_ROUTES?.find(rt => rt.kind === arch.kind) || map.ENTITY_ROUTES?.[idx];
      const ctrl = new EntityAIController(entry.id, arch);
      const pEnt = players[entry.id];
      ctrl.reset(pEnt ? pEnt.x : map.K_SPAWN.x, pEnt ? pEnt.z : map.K_SPAWN.z, route?.wps || []);
      aiControllers.push(ctrl);
    });
  }

  // Reset local player camera, smooth pan curve, flashlight delay curve & bhop velocity
  const me = players[myId];
  const amK = me?.role === 'k';
  camYaw = me ? me.yaw : 0;
  camPitch = 0;
  camRollPan = 0;
  flashYaw = me ? me.yaw : 0;
  flashPitch = 0;
  syncFlashlightUI(me);
  hVelX = 0; hVelZ = 0;
  bhopChain = 0;
  jumpBuffer = 0;
  wasAirborneT = 0;
  stepPhase = 0;
  stepDist = 0;
  landTrauma = 0;
  stepSpring = 0;
  stepSpringVel = 0;
  stepPulseT = 0;
  stepPulseAmp = 0;
  stepFootSign = 1;
  smoothMoveMix = 0;
  smoothSprintMix = 0;
  camBobY = 0;
  camSwayX = 0;
  camRoll = 0;
  camNod = 0;
  shakeXRate = 0;
  shakeYRate = 0;
  zoneLightSmooth = getZoneLuminanceAt(me ? me.x : map.SPAWN.x, me ? me.z : map.SPAWN.z, map);
  resetRunShakeState();
  {
    const a0 = getZoneAtmosphereAt(me ? me.x : map.SPAWN.x, me ? me.z : map.SPAWN.z, map);
    scene.fog.color.setHex(a0.fogHex ?? 0x161207);
    hemiLight.color.setHex(a0.hemiSky ?? 0xf6df82);
    hemiLight.groundColor.setHex(a0.hemiGnd ?? 0x26200d);
  }
  stam = SPEED.STAM_DRAIN;
  stamExhausted = false;
  vhsRevealT = 0;
  thirstT = WATER_LIFE;
  scanT = 0; jellyBuffT = 0; revealCD = 0; trapCD = 0; swingCD = 0; killerSlowT = 0;

  // Entity sees HALF as far as Survivors (FOG_KILLER / FAR_KILLER vs FOG_SURV / FAR_SURV)
  scene.fog.density = amK ? FOG_KILLER : FOG_SURV;
  camera.fov = amK ? 86 : 80;
  camera.updateProjectionMatrix();
  applyWorldVisibilitySettings();
  turnYawRate = 0;
  turnPitchRate = 0;
  gfx.resetMotionHistory();

  fpClaws.setVisible(amK);
  fpFlashGroup.visible = !amK;
  localFlash.visible = !amK;
  localFlashCore.visible = !amK;

  // Visible Pre-Match Effect & Shader Warm-Up Screen: tests lights, flares, traps, items & filters to eliminate first-use hitches
  try {
    await warmupMatchEffects(amK, me);
    weaponSystem.warmup(renderer,scene);
  } finally {
    warmingMatch = false;
    setPreloadOverlay(false);
  }

  matchTime = 0;
  inMatch = true;
  pendingProfileSignature = null; requestMovementProfile();
  lobbyScr.classList.add('hidden');
  endScr.classList.add('hidden');
  pauseScr.classList.add('hidden');
  hud.classList.remove('hidden');
  updateHUD(0, fpsCap || 60);

  pushFeed(
    amK
      ? 'You are a Backrooms Entity! Limited vision — Hunt for sounds!'
      : `A-Sync elevator stopped at Level 0 — Press [E] to open door now! (Fix ${NEED} machine to escape)`,
    '#f5e69a'
  );
  if (!location.hash.includes('test')) {
    if (isMobileUiActive()) {
      document.body.style.cursor = '';
    } else {
      document.body.style.cursor = 'none';
      requestLock();
    }
  }
}

let lastPauseToggleAt = 0;

function requestLock() {
  const el = renderer.domElement;
  if (!el?.requestPointerLock) return;
  try {
    const res = el.requestPointerLock({ unadjustedMovement: true });
    if (res && typeof res.catch === 'function') {
      res.catch(() => {
        try {
          const fb = el.requestPointerLock();
          if (fb && typeof fb.catch === 'function') fb.catch(() => {});
        } catch {}
      });
    }
  } catch {
    try {
      const fb = el.requestPointerLock();
      if (fb && typeof fb.catch === 'function') fb.catch(() => {});
    } catch {}
  }
}

function openPauseMenu() {
  if (!inMatch || matchEnded) return;
  weaponSystem.clearInput(); movementAssist.clearInput();
  if (tpOpen) closeTpPanel(false);
  paused = true;
  lastPauseToggleAt = performance.now();
  for (const k in keys) keys[k] = false;
  resetMobileInputs();
  if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
  document.body.style.cursor = '';
  pauseScr.classList.remove('hidden');
  if (document.pointerLockElement) {
    try { document.exitPointerLock?.(); } catch {}
  }
}

function closePauseMenu(lock = true) {
  paused = false;
  lastPauseToggleAt = performance.now();
  if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
  pauseScr.classList.add('hidden');
  if (inMatch && !matchEnded) {
    if (isMobileUiActive()) {
      document.body.style.cursor = '';
    } else {
      document.body.style.cursor = 'none';
      if (lock && !location.hash.includes('test')) requestLock();
    }
  }
}

// ---------- Host Authoritative Gameplay Interactions ----------
function processPlayerActionHost(actorId, msg) {
  if (!net.isHost || !inMatch || matchEnded) return;
  const p = players[actorId];
  if (!p) return;
  if (msg.act === 'movementProfile') {
    if (acceptProfileChange(p, msg)) broadcastEvent({ ev: 'movementProfile', id: actorId, movement: { ...p.movement } });
    return;
  }
  if (['weaponEquip', 'weaponFire', 'weaponReload'].includes(msg.act)) { combatAuthority.action(p, msg); return; }

  const pCurLevel = p.levelId || 'level0';
  if(p.role==='k'&&isPeacefulLevel(pCurLevel)){removePeacefulLevelHostiles();return;}
  const pMap = getOrCreateLevelMap(pCurLevel);

  if (msg.act === 'openElevator') {
    const lvl0 = getOrCreateLevelMap('level0');
    if (!lvl0?.ELEVATOR || lvl0.elevatorState !== 'closed' || pCurLevel !== 'level0') return;
    const distEl = Math.hypot(p.x - lvl0.ELEVATOR.x, p.z - lvl0.ELEVATOR.z);
    if (distEl < 3.8) {
      lvl0.elevatorState = 'opening';
      broadcastEvent({ ev: 'elevOpen', byId: p.id, byName: p.name });
    }
    return;
  }

  if (msg.act === 'enterLevel') {
    const viaTp = msg.via === 'tp_panel';
    if (!viaTp && (p.role !== 's' || p.state !== 'ok')) return;
    const targetLevel = canonicalLevelId(msg.levelId);
    if (isPeacefulLevel(targetLevel) && p.role === 'k') return;
    if (targetLevel === pCurLevel && !viaTp) return;
    const dstMap = getOrCreateLevelMap(targetLevel);
    if (!dstMap) return;
    if (msg.via === 'horizon_door') {
      const route = resolveThreshold(pMap, dstMap, msg.doorId, p, performance.now());
      if (!route.ok) return;
      msg = {...msg, tx: route.x, ty: route.y, tz: route.z, tyaw: route.yaw};
      p.lastThresholdAt = performance.now();
    }

    if (pCurLevel === 'level0' && targetLevel !== 'level0' && !viaTp) {
      p.lastLevel0Pos = { x: p.x, z: p.z, yaw: p.yaw };
    }
    const hasCoords = Number.isFinite(msg.tx) && Number.isFinite(msg.tz);
    if (hasCoords) {
      p.x = msg.tx;
      p.y = Number.isFinite(msg.ty) ? msg.ty : (dstMap.SPAWN?.y || 0);
      p.z = msg.tz;
      p.yaw = Number.isFinite(msg.tyaw) ? msg.tyaw : (dstMap.SPAWN?.yaw || 0);
    } else if (targetLevel === 'level0') {
      if (!viaTp && !pMap.TASKS?.every(t => t.done)) return;
      const lvl0 = getOrCreateLevelMap('level0');
      const safeX = lvl0.ELEVATOR ? lvl0.ELEVATOR.x : lvl0.SPAWN.x;
      const safeZ = lvl0.ELEVATOR ? lvl0.ELEVATOR.z - 8.5 : lvl0.SPAWN.z;
      p.x = (!viaTp && p.lastLevel0Pos?.x) ? p.lastLevel0Pos.x : safeX;
      p.z = (!viaTp && p.lastLevel0Pos?.z) ? p.lastLevel0Pos.z : safeZ;
      p.y = 0;
      p.yaw = 0;
    } else {
      const occupied=Object.values(players).filter(q=>q.id!==p.id&&q.role==='s'&&q.levelId===targetLevel).length;
      const spawn=isPeacefulLevel(targetLevel)&&dstMap.SPAWN_POINTS?.length?dstMap.SPAWN_POINTS[occupied%dstMap.SPAWN_POINTS.length]:dstMap.SPAWN;
      p.x = spawn.x;
      p.z = spawn.z;
      p.y = spawn.y || 0;
      p.yaw = dstMap.SPAWN.yaw || 0;
    }
    p.levelId = targetLevel;
    p.warpGuardUntil = performance.now() + 650;

    let subEntInfo = null;
    const subEnts = [];
    if (targetLevel !== 'level0') {
      levelDiscoveredSet.add(targetLevel);
      removePeacefulLevelHostiles();
      if (dstMap.levelCfg?.entity && !isPeacefulLevel(targetLevel)) {
        const ec = dstMap.levelCfg.entity;
        const routes = (dstMap.ENTITY_ROUTES && dstMap.ENTITY_ROUTES.length)
          ? dstMap.ENTITY_ROUTES
          : [[dstMap.K_SPAWN || { x: dstMap.worldSpan * 0.5, z: dstMap.worldSpan * 0.5 }]];
        const spawnCount = Math.min(3, Math.max(2, routes.length));
        const altKinds = ['howler', 'skin_stealer', 'smiler', 'duller'];
        for (let rIdx = 0; rIdx < spawnCount; rIdx++) {
          const subId = rIdx === 0 ? `AI_SUB_${targetLevel}` : `AI_SUB_${targetLevel}_${rIdx}`;
          if (players[subId]) continue;
          const route = routes[rIdx % routes.length] || routes[0];
          const wp0 = route?.[0] || dstMap.K_SPAWN || { x: dstMap.worldSpan * 0.5, z: dstMap.worldSpan * 0.5 };
          const entKind = (rIdx === 0 || ec.behavior === 'water_only')
            ? (ec.archKey || 'bacteria')
            : altKinds[(rIdx + Math.floor(targetLevel.length)) % altKinds.length];
          const archObj = {
            id: subId,
            kind: entKind,
            name: rIdx === 0 ? (ec.name || 'Entity') : `${ec.name || 'Entity'} #${rIdx + 1}`,
            behavior: ec.behavior || 'patrol',
            patrolSpd: ec.patrolSpd || 4.4,
            chaseSpd: ec.chaseSpd || 7.4,
            maxChaseSpd: ec.maxChaseSpd || SPEED.KILLER_SPRINT || 8.88,
            sightRange: ec.sightRange || 30,
            hearRange: ec.hearRange || 24,
            loseTime: ec.behavior === 'water_only' ? 2.4 : 6.4
          };
          const ex = wp0.x ?? dstMap.worldSpan * 0.5;
          const ez = wp0.z ?? dstMap.worldSpan * 0.5;
          players[subId] = {
            id: subId,
            name: archObj.name,
            role: 'k',
            aiKind: archObj.kind,
            levelId: targetLevel,
            colorIdx: 0,
            isAI: true,
            x: ex, y: 0, z: ez, vy: 0,
            yaw: 0, pitch: 0, spd: 0,
            crouch: false, fl: false,
            hp: 99, state: 'ok',
            carrying: null, swingT: 0, reveal: false,
            inv: {}
          };
          const ctrl = new EntityAIController(subId, archObj);
          ctrl.reset(ex, ez, route || []);
          aiControllers.push(ctrl);
          const info = { id: subId, name: archObj.name, aiKind: archObj.kind, levelId: targetLevel, x: ex, z: ez };
          subEnts.push(info);
          if (!subEntInfo) subEntInfo = info;
        }
      }
    }

    broadcastEvent({
      ev: 'levelShift',
      playerId: p.id,
      byName: p.name,
      levelId: targetLevel,
      via: msg.via || 'portal',
      x: p.x, y: p.y, z: p.z, yaw: p.yaw,
      subEnt: subEntInfo,
      subEnts
    });
    return;
  }

  if (msg.act === 'teleportPos') {
    const targetLevel = msg.levelId || pCurLevel || 'level0';
    if (isPeacefulLevel(targetLevel) && p.role==='k') return;
    if (!Number.isFinite(msg.x) || !Number.isFinite(msg.z)) return;
    p.levelId = targetLevel;
    p.x = msg.x;
    p.y = Number.isFinite(msg.y) ? msg.y : 0;
    p.z = msg.z;
    if (Number.isFinite(msg.yaw)) p.yaw = msg.yaw;
    p.vy = 0;
    p.warpGuardUntil = performance.now() + 650;
    broadcastEvent({
      ev: 'tpPos',
      playerId: p.id,
      levelId: targetLevel,
      x: p.x, y: p.y, z: p.z, yaw: p.yaw
    });
    return;
  }

  if (msg.act === 'pickup') {
    if (p.role !== 's' || p.state !== 'ok') return;
    if (msg.kind === 'relic') {
      const rel = map.RELICS?.find(r => r.id === msg.id && !r.gone);
      if (rel && Math.hypot(rel.x - p.x, rel.z - p.z) < 3.2) {
        rel.gone = true;
        broadcastEvent({ ev: 'relicGone', id: rel.id });
        if (rel.kind === 'locator') {
          const nearT = map.TASKS
            .filter(t => !t.done)
            .sort((a, b) => Math.hypot(a.x - p.x, a.z - p.z) - Math.hypot(b.x - p.x, b.z - p.z))
            .slice(0, 2);
          const dirName = (dx, dz) => {
            const h = Math.abs(dx) > Math.abs(dz) * 1.4 ? (dx > 0 ? 'East' : 'West')
              : Math.abs(dz) > Math.abs(dx) * 1.4 ? (dz > 0 ? 'Nam' : 'North')
              : `${dz > 0 ? 'Nam' : 'North'}-${dx > 0 ? 'East' : 'West'}`;
            return h;
          };
          const info = nearT.map(t => `${t.code} ${t.symbol} (${Math.round(Math.hypot(t.x - p.x, t.z - p.z))}m ${dirName(t.x - p.x, t.z - p.z)})`).join(' • ');
          broadcastEvent({ ev: 'relicMsg', text: info ? `Locate A-Sync: ${info}` : 'Main machines repaired! Find North/South Exit!', color: '#7ce8ff' });
        } else if (rel.kind === 'vhs_tape') {
          broadcastEvent({ ev: 'vhsReveal', dur: 14, text: 'VHS Tape #KV-31: Show Machine & Exit locations (14s)!', color: '#ffe066' });
        } else {
          for (const ctrl of aiControllers) {
            const ent = players[ctrl.id];
            if (ent && Math.hypot(ent.x - p.x, ent.z - p.z) < 48) ctrl.scramble(11);
          }
          broadcastEvent({ ev: 'relicMsg', text: '1990 Glitching VHS broadcasting interference — Reduce Entity detection range by 48% (11s)!', color: '#e47cff' });
        }
      }
      return;
    }
    const pool = msg.kind === 'water' ? pMap.WATERS
      : msg.kind === 'scan' ? pMap.SCANS
      : msg.kind === 'jelly' ? pMap.JELLIES
      : msg.kind === 'ration' ? pMap.RATIONS
      : pMap.FLARES;
    const item = pool?.find(i => i.id === msg.id && !i.gone);
    if (item && Math.hypot(item.x - p.x, item.z - p.z) < 3.0) {
      item.gone = true;
      p.inv[msg.kind] = (p.inv[msg.kind] || 0) + 1;
      broadcastEvent({ ev: 'itemGone', levelId: pCurLevel, kind: msg.kind, id: item.id, by: actorId });
    }
  } else if (msg.act === 'useItem') {
    const k = msg.kind;
    if ((p.inv[k] || 0) <= 0) return;
    p.inv[k]--;
    if (k === 'water') {
      p.moveThirst = Math.min(WATER_LIFE, (p.moveThirst ?? WATER_LIFE) + WATER_LIFE * .72);
      if (p.hp < 2) p.hp = 2;
      p.state = 'ok';
      broadcastEvent({ ev: 'sfx', kind: 'consume', item: 'water', x: p.x, z: p.z, who: actorId });
    } else if (k === 'scan') {
      broadcastEvent({ ev: 'scanStart', by: actorId, x: p.x, z: p.z });
    } else if (k === 'jelly') {
      p.jellyUntil = performance.now() / 1000 + 6;
      broadcastEvent({ ev: 'sfx', kind: 'consume', item: 'jelly', x: p.x, z: p.z, who: actorId });
    } else if (k === 'ration') {
      p.moveThirst = WATER_LIFE; p.jellyUntil = Math.max(p.jellyUntil || 0, performance.now() / 1000 + 3);
      p.hp = 2;
      p.state = 'ok';
      broadcastEvent({ ev: 'sfx', kind: 'consume', item: 'ration', x: p.x, z: p.z, who: actorId });
    } else if (k === 'flare') {
      const fx = p.x - Math.sin(p.yaw) * 1.4;
      const fz = p.z - Math.cos(p.yaw) * 1.4;
      broadcastEvent({ ev: 'flare', x: fx, z: fz });
      alertLocalMonstersNoise(pCurLevel, fx, fz, 34, 7.0);
    }
  } else if (msg.act === 'taskProg') {
    const t = pMap.TASKS[msg.idx];
    if (!t || t.done) return;
    t.p = Math.max(t.p, Math.min(1, t.p + msg.delta));
    if (t.p >= 1 && !t.done) {
      t.done = true;
      t.p = 1;
      const doneCount = pMap.TASKS.filter(x => x.done).length;
      alertLocalMonstersNoise(pCurLevel, t.x, t.z, 38, 8.0);
      if (pCurLevel === 'level0') {
        if (doneCount >= NEED) pMap.exitsOpen = true;
        broadcastEvent({ ev: 'taskDone', levelId: pCurLevel, idx: t.id, doneCount, exitsOpen: pMap.exitsOpen });
      } else {
        if (pMap.PUMPS?.length) {
          for (const pm of pMap.PUMPS) { pm.done = true; pm.p = 1; }
        }
        pMap.exitsOpen = true;
        levelsClearedSet.add(pCurLevel);
        broadcastEvent({ ev: 'subTaskDone', levelId: pCurLevel, idx: t.id, clearedCount: levelsClearedSet.size });
      }
    }
  } else if (msg.act === 'pumpProg') {
    const pm = pMap.PUMPS?.[msg.idx];
    if (!pm || pm.done) return;
    pm.p = Math.max(pm.p || 0, Math.min(1, (pm.p || 0) + msg.delta));
    if (pm.p >= 1 && !pm.done) {
      pm.done = true;
      pm.p = 1;
      const donePumps = pMap.PUMPS.filter(x => x.done).length;
      broadcastEvent({ ev: 'pumpDone', levelId: pCurLevel, idx: pm.id, donePumps });
      if (donePumps >= pMap.PUMPS.length && pMap.TASKS?.[0] && !pMap.TASKS[0].done) {
        pMap.TASKS[0].done = true;
        pMap.TASKS[0].p = 1;
        pMap.exitsOpen = true;
        levelsClearedSet.add(pCurLevel);
        broadcastEvent({ ev: 'subTaskDone', levelId: pCurLevel, idx: 0, clearedCount: levelsClearedSet.size });
      }
    }
  } else if (msg.act === 'taskFail') {
    const t = pMap.TASKS[msg.idx];
    if (t && !t.done) {
      t.p = Math.max(0, t.p - 0.04);
      broadcastEvent({ ev: 'sfx', kind: 'spark', x: t.x, z: t.z });
      alertLocalMonstersNoise(pCurLevel, t.x, t.z, 36, 7.5);
    }
  } else if (msg.act === 'selfEscape') {
    if (p.role !== 's' || (p.selfEscapeLeft ?? 0) <= 0) return;
    if (p.state !== 'carried' && p.state !== 'hooked') return;
    const fromState = p.state;
    p.selfEscapeLeft = Math.max(0, (p.selfEscapeLeft ?? 1) - 1);

    let carrier = null;
    if (fromState === 'carried') {
      for (const k of Object.values(players)) {
        if (k.role === 'k' && k.carrying === p.id) {
          k.carrying = null;
          carrier = k;
          break;
        }
      }
      if (carrier) {
        const ctrl = aiControllers.find(c => c.id === carrier.id);
        if (ctrl) {
          ctrl.slowT = Math.max(ctrl.slowT || 0, 3.2);
          ctrl.attackCD = Math.max(ctrl.attackCD || 0, 3.4);
          ctrl.state = 'PATROL';
          ctrl.targetId = null;
          ctrl.targetPos = null;
          ctrl.path = [];
        }
      }
      const [ux, uz] = collide(p.x, p.z, 0.36, pMap, false, 0);
      p.x = ux; p.z = uz;
    } else if (fromState === 'hooked') {
      const h = pMap?.HOOKS?.[p.hookIdx];
      if (h) {
        h.occ = null;
        const [ux, uz] = collide(h.x + 0.65, h.z + 0.45, 0.36, pMap, false, 0);
        p.x = ux; p.z = uz;
      }
      p.hookIdx = -1;
    }

    p.state = 'ok';
    p.hp = 1;
    p.escapeGuardT = 2.6;
    broadcastEvent({
      ev: 'selfEscaped',
      id: p.id,
      from: fromState === 'hooked' ? 'hook' : 'carry',
      killerId: carrier?.id || null,
      x: p.x,
      z: p.z
    });
  } else if (msg.act === 'selfUnhook') {
    const othersAlive = Object.values(players).filter(x => x.id !== p.id && x.role === 's' && x.state !== 'dead' && x.state !== 'escaped').length;
    if (othersAlive === 0 && p.state === 'hooked' && p.hookIdx >= 0) {
      const h = pMap?.HOOKS?.[p.hookIdx];
      if (h) {
        h.occ = null;
        const [ux, uz] = collide(h.x + 0.65, h.z + 0.45, 0.36, pMap, false, 0);
        p.x = ux; p.z = uz;
      }
      p.state = 'ok';
      p.hp = 1;
      p.hookIdx = -1;
      p.escapeGuardT = 2.6;
      broadcastEvent({ ev: 'unhooked', id: p.id, hookIdx: h ? h.id : 0, x: p.x, z: p.z });
    }
  } else if (msg.act === 'unhook') {
    if (p.role !== 's' || p.state !== 'ok') return;
    let h = pMap?.HOOKS?.find(hk => hk.id === msg.hookIdx) || pMap?.HOOKS?.[msg.hookIdx];
    let victim = h && h.occ ? players[h.occ] : null;
    if (!victim) {
      victim = Object.values(players).find(s => s.id !== p.id && s.role === 's' && s.state === 'hooked' && (s.levelId || 'level0') === pCurLevel && Math.hypot(s.x - p.x, s.z - p.z) < 3.4);
      if (victim && victim.hookIdx >= 0) h = pMap?.HOOKS?.[victim.hookIdx];
    }
    const anchorX = h ? h.x : victim?.x;
    const anchorZ = h ? h.z : victim?.z;
    if (victim && victim.state === 'hooked' && Math.hypot(p.x - anchorX, p.z - anchorZ) < 3.4) {
      const [ux, uz] = collide(anchorX + 0.65, anchorZ + 0.45, 0.36, pMap, false, 0);
      victim.state = 'ok';
      victim.hp = 1;
      victim.hookIdx = -1;
      victim.x = ux;
      victim.z = uz;
      victim.escapeGuardT = 2.2;
      if (h) h.occ = null;
      broadcastEvent({ ev: 'unhooked', id: victim.id, rescuerId: p.id, hookIdx: h ? h.id : 0, x: ux, z: uz });
    }
  } else if (msg.act === 'revive') {
    const t = players[msg.targetId];
    if (t && t.state === 'down' && (t.levelId || 'level0') === pCurLevel) {
      t.state = 'ok';
      t.hp = 1;
      broadcastEvent({ ev: 'sfx', kind: 'consume', item: 'water', x: t.x, z: t.z });
    }
  } else if (msg.act === 'escape') {
    p.state = 'escaped';
    broadcastEvent({ ev: 'escaped', id: p.id });
    checkMatchEnd();
  } else if (msg.act === 'trapDisarm') {
    const tr = pMap?.TRAPS?.[msg.idx];
    if (tr && !tr.sprung) {
      tr.sprung = true;
      broadcastEvent({ ev: 'trapSprung', idx: msg.idx, x: tr.x, z: tr.z });
    }
  } else if (msg.act === 'kSwing') {
    if (p.role !== 'k') return;
    p.swingT = 1.0;
    broadcastEvent({ ev: 'sfx', kind: 'swing', x: p.x, z: p.z });
    // Check Survivor hit in forward cone in the same level
    for (const s of Object.values(players)) {
      if (s.role !== 's' || s.state !== 'ok' || (s.levelId || 'level0') !== pCurLevel) continue;
      const d = Math.hypot(s.x - p.x, s.z - p.z);
      if (d < 2.25 && !blocked(p.x, p.z, s.x, s.z, pMap)) {
        const toAngle = Math.atan2(-(s.x - p.x), -(s.z - p.z));
        const diff = Math.abs(Math.atan2(Math.sin(toAngle - p.yaw), Math.cos(toAngle - p.yaw)));
        if (diff < 1.15) {
          applyKillerHit(p, s);
          break;
        }
      }
    }
  } else if (msg.act === 'kGrab') {
    if (p.role !== 'k' || p.carrying) return;
    for (const s of Object.values(players)) {
      if (s.role === 's' && s.state === 'down' && (s.levelId || 'level0') === pCurLevel && Math.hypot(s.x - p.x, s.z - p.z) < 2.1) {
        s.state = 'carried';
        p.carrying = s.id;
        break;
      }
    }
  } else if (msg.act === 'kHook') {
    if (p.role !== 'k' || !p.carrying) return;
    const h = pMap?.HOOKS?.[msg.hookIdx];
    const v = players[p.carrying];
    if (h && !h.occ && v) {
      hookSurvivorHost(p, v, h);
    }
  } else if (msg.act === 'kReveal') {
    if (p.role !== 'k') return;
    p.reveal = true;
    broadcastEvent({ ev: 'reveal', x: p.x, z: p.z, dur: REVEAL_T });
    setTimeout(() => { if (players[p.id]) players[p.id].reveal = false; }, REVEAL_T * 1000);
  } else if (msg.act === 'kTrap') {
    if (p.role !== 'k' || !pMap?.TRAPS || pMap.TRAPS.length >= TRAP_MAX) return;
    pMap.TRAPS.push({ x: p.x, z: p.z, sprung: false });
    broadcastEvent({ ev: 'trapPlaced', x: p.x, z: p.z });
  }
}

function applyKillerHit(killer, victim) {
  if (isPeacefulLevel(victim?.levelId) || isPeacefulLevel(killer?.levelId)) return;
  if ((victim.escapeGuardT || 0) > 0) return;
  victim.hp--;
  if (victim.hp <= 0) {
    victim.state = 'down';
    victim.bleed = BLEED;
  }
  broadcastEvent({
    ev: 'hit',
    victimId: victim.id,
    killerId: killer.id,
    killerKind: killer.aiKind || 'bacteria',
    killerName: killer.name || 'Entity',
    down: victim.state === 'down',
    x: victim.x,
    z: victim.z
  });
}

function hookSurvivorHost(killer, victim, hook) {
  killer.carrying = null;
  victim.state = 'hooked';
  victim.hookIdx = hook.id;
  victim.hooks++;
  victim.x = hook.x;
  victim.z = hook.z;
  hook.occ = victim.id;
  if (victim.hooks >= 3) {
    victim.state = 'dead';
    hook.occ = null;
    broadcastEvent({ ev: 'hookDeath', id: victim.id, x: hook.x, z: hook.z });
    checkMatchEnd();
  } else {
    broadcastEvent({ ev: 'hooked', id: victim.id, hookIdx: hook.id, x: hook.x, z: hook.z });
  }
}

function checkMatchEnd() {
  if (matchEnded) return;
  const survs = Object.values(players).filter(p => p.role === 's');
  const alive = survs.filter(p => p.state === 'ok' || p.state === 'down' || p.state === 'carried' || p.state === 'hooked');
  const escaped = survs.filter(p => p.state === 'escaped');
  if (alive.length === 0) {
    const msg = escaped.length > 0
      ? `ALL SURVIVORS HAVE ESCAPED (${escaped.length}/${survs.length})!`
      : 'ENTITY HAS HUNTED DOWN ALL VICTIMS!';
    broadcastEvent({ ev: 'end', title: escaped.length > 0 ? 'ESCAPED SUCCESSFULLY' : 'TAPE ENDED — RECORDING DELETED', desc: msg });
  }
}

function broadcastEvent(ev) {
  handleNetEvent(ev);
  if (net.isHost) net.broadcast({ t: 'ev', ...ev });
}

let revealGlobalT = 0;
function handleNetEvent(ev) {
  if (!inMatch) return;
  if(ev.ev==='pitRespawn'){
    const p=players[ev.id];if(!p||ev.sequence<=(p._pitEventApplied||0))return;p._pitEventApplied=ev.sequence;
    Object.assign(p,{x:ev.x,y:ev.y,z:ev.z,vy:0,spd:0,sliding:false,crouch:false,grounded:true,yaw:0,pitch:0});
    if(ev.id===myId){
      hVelX=hVelZ=jumpBuffer=bhopChain=camBobY=camSwayX=camNod=camRoll=camRollPan=stepSpring=stepSpringVel=stepPulseT=landTrauma=smoothMoveMix=smoothSprintMix=0;
      resetRunShakeState();
      camYaw=camPitch=localSwingT=0;movementAssist.reset();humanCamera.reset();handheldCamera.reset();camForeZ=previousForwardSpeed=stepPhase=stepDist=0;stepFootSign=1;weaponSystem.clearInput();for(const key in keys)keys[key]=false;
      camera.position.set(p.x,1.62,p.z);camera.rotation.set(0,0,0);gfx.resetMotionHistory();gfx.exposurePass?.requestReset(1);renderer.toneMappingExposure=1;
      let fade=document.getElementById('pitFade');if(!fade){fade=document.createElement('div');fade.id='pitFade';fade.style.cssText='position:fixed;inset:0;background:#000;pointer-events:none;z-index:9999;opacity:0;transition:opacity .65s';document.body.append(fade);}fade.style.transition='none';fade.style.opacity='1';setTimeout(()=>{fade.style.transition='opacity .65s';fade.style.opacity='0';},150);
    }return;
  }
  if (ev.ev === 'movementProfile') {
    const p = players[ev.id]; if (!p || (p.movement?.revision || 0) > ev.movement.revision) return;
    p.movement = { ...ev.movement };
    if (ev.id === myId) { pendingProfileSignature = null; movementAssist.configure(p.movement); p.sliding = false; if (p.movement.key === 'tactical') p.vy = Math.min(p.vy, p.movement.jumpImpulse); }
    return;
  }
  if (ev.ev === 'weapon') { if (players[ev.id]) players[ev.id].weapon = { ...ev.weapon }; if (ev.kind === 'fire' && ev.hit?.target === myId) killerSlowT = Math.max(killerSlowT, ev.weapon.equipped === 'butterfly' ? .4 : .85); weaponSystem.event(ev, myId); return; }
  if (ev.ev === 'moveCorrection' && ev.id === myId) { const p = players[myId]; p.x = ev.x; p.y = ev.y; p.z = ev.z; hVelX = hVelZ = 0; return; }
  const localPeaceful=isPeacefulLevel(activeLocalLevelId);
  if(['hooked','hookDeath'].includes(ev.ev)&&isPeacefulLevel(players[ev.id]?.levelId))return;
  if(localPeaceful&&['reveal','trapPlaced','trapSprung'].includes(ev.ev))return;
  if(ev.ev==='hit'&&isPeacefulLevel(players[ev.victimId]?.levelId))return;
  if((ev.ev==='levelShift'||ev.ev==='tpPos')&&isPeacefulLevel(ev.levelId)&&players[ev.playerId]?.role==='k')return;
  if (ev.ev === 'itemGone') {
    const tMap = getOrCreateLevelMap(ev.levelId || activeLocalLevelId);
    const pool = ev.kind === 'water' ? tMap?.WATERS
      : ev.kind === 'scan' ? tMap?.SCANS
      : ev.kind === 'jelly' ? tMap?.JELLIES
      : ev.kind === 'ration' ? tMap?.RATIONS
      : tMap?.FLARES;
    const item = pool?.find(i => i.id === ev.id);
    if (item) {
      item.gone = true;
      if ((ev.levelId || 'level0') === activeLocalLevelId) {
        const mesh = world?.itemMeshes?.get?.(`${ev.kind}:${item.id}`) || world?.itemMeshes?.get?.(item.id);
        if (mesh) mesh.visible = false;
      }
    }
  } else if (ev.ev === 'levelShift') {
    const incomingEnts = Array.isArray(ev.subEnts) && ev.subEnts.length ? ev.subEnts : (ev.subEnt ? [ev.subEnt] : []);
    for (const se of incomingEnts) {
      if (isPeacefulLevel(se?.levelId || ev.levelId)) continue;
      if (!se || players[se.id]) continue;
      players[se.id] = {
        id: se.id, name: se.name, role: 'k', aiKind: se.aiKind,
        levelId: se.levelId, colorIdx: 0, isAI: true,
        x: se.x, y: 0, z: se.z, vy: 0, yaw: 0, pitch: 0, spd: 0,
        crouch: false, fl: false, hp: 99, state: 'ok', carrying: null, swingT: 0, reveal: false, inv: {}
      };
      const av = buildEntityAvatar(se.aiKind || 'bacteria');
      av.group.position.set(se.x, 0, se.z);
      av.group.visible = activeLocalLevelId === se.levelId;
      scene.add(av.group);
      avatars[se.id] = av;
    }
    const p = players[ev.playerId];
    if (p) {
      p.levelId = ev.levelId;
      p.x = ev.x; p.y = ev.y || 0; p.z = ev.z; p.yaw = ev.yaw || 0;
    }
    if (ev.levelId !== 'level0') {
      levelDiscoveredSet.add(ev.levelId);
      const meta = getLevelMeta(ev.levelId);
      activeJoinTarget = { levelId: ev.levelId, code: meta.code, name: meta.vnName, byName: ev.byName };
      if (ev.playerId !== myId) {
        pushFeed(`${ev.byName || 'Teammates'} just entered ${meta.code}: ${meta.vnName}! Press [G] to Join!`, '#48d0f5');
      }
    }
    if (ev.playerId === myId) {
      if (activeLocalLevelId !== ev.levelId) {
        switchLocalWorld(ev.levelId, ev.via);
      } else if (ev.via === 'tp_panel') {
        noclipDropLockUntil = performance.now() + 2600;
        hVelX = 0; hVelZ = 0;
        if (p) { p.vy = 0; camYaw = p.yaw || 0; }
      }
    }
  } else if (ev.ev === 'tpPos') {
    const p = players[ev.playerId];
    if (p) {
      p.levelId = ev.levelId;
      p.x = ev.x; p.y = ev.y || 0; p.z = ev.z;
      if (Number.isFinite(ev.yaw)) p.yaw = ev.yaw;
      p.vy = 0;
    }
    if (ev.playerId === myId) {
      noclipDropLockUntil = performance.now() + 2600;
      hVelX = 0; hVelZ = 0;
      if (p) camYaw = p.yaw || 0;
      if (ev.levelId !== activeLocalLevelId) {
        switchLocalWorld(ev.levelId, 'tp_panel');
      }
    }
  } else if (ev.ev === 'subTaskDone') {
    const sMap = getOrCreateLevelMap(ev.levelId);
    if (sMap?.TASKS?.[ev.idx]) {
      sMap.TASKS[ev.idx].done = true;
      sMap.TASKS[ev.idx].p = 1;
      sMap.exitsOpen = true;
    }
    if (sMap?.PUMPS?.length) {
      for (const pm of sMap.PUMPS) { pm.done = true; pm.p = 1; }
    }
    levelsClearedSet.add(ev.levelId);
    if (ev.levelId === activeLocalLevelId) {
      audio.playAlertBeep();
      const tm = world?.taskMeshes?.[ev.idx];
      if (tm?.ledMat) tm.ledMat.color.setHex(0x4ed884);
      pushFeed(ev.levelId === 'level37' ? 'J-LEVEL ESCAPE ROUTE OPENED! Level 0 Return Gate activated!' : 'STAIR ESCAPE ROUTE ACTIVE! Level 0 Return Gate opened!', '#4ed884');
    }
  } else if (ev.ev === 'pumpDone') {
    const sMap = getOrCreateLevelMap(ev.levelId);
    const pm = sMap?.PUMPS?.[ev.idx];
    if (pm) {
      pm.done = true;
      pm.p = 1;
    }
    if (ev.levelId === activeLocalLevelId && pm) {
      audio.playPumpActivation?.({ x: pm.x, y: pm.y || 0, z: pm.z }, ev.donePumps >= (sMap.PUMPS?.length || 3));
      pushFeed(`Activated ${pm.name} (${ev.donePumps}/${sMap.PUMPS?.length || 3})!`, '#4ae8ff');
    }
  } else if (ev.ev === 'relicGone') {
    const rel = map.RELICS?.find(r => r.id === ev.id);
    if (rel) rel.gone = true;
    const mesh = world?.itemMeshes.get(ev.id);
    if (mesh) mesh.visible = false;
  } else if (ev.ev === 'relicMsg') {
    audio.playAlertBeep();
    pushFeed(ev.text, ev.color || '#ffe066');
  } else if (ev.ev === 'vhsReveal') {
    vhsRevealT = ev.dur || 14;
    audio.playScanPing();
    pushFeed(ev.text || 'VHS activated — Showing Machine & Escape Gate locations!', ev.color || '#ffe066');
  } else if (ev.ev === 'scanStart') {
    scanT = SCAN_T;
    audio.playScanPing();
    pushFeed(localPeaceful?'Scanner active (9s)!':'Entity Detector active (9s)!', '#48d0f5');
  } else if (ev.ev === 'reveal') {
    revealGlobalT = ev.dur || REVEAL_T;
    audio.playRevealStinger({ x: ev.x, y: 1.5, z: ev.z });
    pushFeed('WARNING: Entity just used player locator ability!', '#ff5648');
  } else if (ev.ev === 'flare') {
    if (world) {
      const freePool = world.flareLightPool?.find(pl => !world.flareMeshes.some(fm => fm.light === pl));
      const fl = spawnFlareMesh(scene, ev.x, ev.z, freePool || null);
      world.flareMeshes.push(fl);
    }
    audio.playFlareHiss({ x: ev.x, y: 0.2, z: ev.z });
  } else if (ev.ev === 'hit') {
    if(!localPeaceful){audio.playFleshHit({ x: ev.x, y: 1.2, z: ev.z });audio.playScream({ x: ev.x, y: 1.4, z: ev.z });}
    if (ev.victimId === myId) {
      triggerJumpscare({
        aiKind: ev.killerKind || players[ev.killerId]?.aiKind || 'bacteria',
        killerName: ev.killerName || players[ev.killerId]?.name || 'Entity',
        down: !!ev.down
      });
    }
    if (ev.victimId === myId && ev.down) {
      pushFeed('You were defeated!', '#ff4438');
    } else if (!ev.down && ev.victimId === myId) {
      pushFeed('Hit by Entity! Run!', '#ff7456');
    }
  } else if (ev.ev === 'hooked') {
    if(!localPeaceful)audio.playHookClang({ x: ev.x, y: 2.0, z: ev.z }, false);
    if (ev.id === myId) {
      triggerJumpscare({ aiKind: 'bacteria', killerName: 'Entity', down: true });
    }
    const v = players[ev.id];
    if (v) { v.state = 'hooked'; v.hookIdx = ev.hookIdx; v.x = ev.x; v.z = ev.z; }
    const hk = map?.HOOKS?.[ev.hookIdx];
    if (hk) hk.occ = ev.id;
    if(!localPeaceful)pushFeed(`${v?.name || 'Teammates'} hanging from a hook!`, '#ff8838');
  } else if (ev.ev === 'hookDeath') {
    if(!localPeaceful)audio.playHookClang({ x: ev.x, y: 2.0, z: ev.z }, true);
    const v = players[ev.id];
    if (v) {
      if (v.hookIdx >= 0 && map?.HOOKS?.[v.hookIdx]) map.HOOKS[v.hookIdx].occ = null;
      v.state = 'dead';
      v.hookIdx = -1;
    }
    if(!localPeaceful)pushFeed(`${v?.name || 'Teammates'} sacrificed...`, '#ff3028');
  } else if (ev.ev === 'unhooked') {
    const v = players[ev.id];
    if (ev.hookIdx >= 0 && map?.HOOKS?.[ev.hookIdx]) map.HOOKS[ev.hookIdx].occ = null;
    if (v) {
      v.state = 'ok'; v.hp = 1; v.hookIdx = -1;
      if (typeof ev.x === 'number' && typeof ev.z === 'number') { v.x = ev.x; v.z = ev.z; }
    }
    if (ev.id === myId) {
      busyAct = null;
      stam = Math.max(stam, SPEED.STAM_DRAIN * 0.5);
      stamExhausted = false;
      pushFeed('Rescued from hook by teammate! Run!', '#4ed884');
    } else {
      pushFeed(`${v?.name || 'Teammates'} rescued!`, '#4ed884');
    }
  } else if (ev.ev === 'selfEscaped') {
    const v = players[ev.id];
    if (ev.hookIdx >= 0 && map?.HOOKS?.[ev.hookIdx]) map.HOOKS[ev.hookIdx].occ = null;
    if (v) {
      v.state = 'ok'; v.hp = 1; v.hookIdx = -1;
      v.selfEscapeLeft = Math.max(0, (v.selfEscapeLeft ?? 1) - (net.isHost ? 0 : 1));
      if (typeof ev.x === 'number' && typeof ev.z === 'number') { v.x = ev.x; v.z = ev.z; }
    }
    audio.playHookClang({ x: ev.x || 0, y: 1.5, z: ev.z || 0 }, false);
    if (ev.id === myId) {
      busyAct = null;
      stam = Math.max(stam, SPEED.STAM_DRAIN * 0.55);
      stamExhausted = false;
      pushFeed('Successfully self-extracted (self-extract limit reached)! Run!', '#4ed884');
    } else if (ev.killerId === myId) {
      killerSlowT = Math.max(killerSlowT, 3.2);
      swingCD = Math.max(swingCD, 2.8);
      if (players[myId]) players[myId].carrying = null;
      pushFeed(`${v?.name || 'Victim'} just freed from your grasp!`, '#ff9442');
    } else {
      pushFeed(`${v?.name || 'Teammates'} just freed themselves from the Monster!`, '#4ed884');
    }
  } else if (ev.ev === 'trapPlaced') {
    if (world) world.trapMeshes.push(spawnTrapMesh(scene, ev.x, ev.z));
  } else if (ev.ev === 'trapSprung') {
    audio.playTrapSnap({ x: ev.x, y: 0.2, z: ev.z });
    if (world?.trapMeshes[ev.idx]) world.trapMeshes[ev.idx].visible = false;
  } else if (ev.ev === 'taskDone') {
    audio.playAlertBeep();
    const tm = world?.taskMeshes[ev.idx];
    if (tm) {
      tm.ledMat.color.setHex(0x4ed884);
      tm.progSegs?.forEach(m => m.color.setHex(0x4ed884));
    }
    map.TASKS[ev.idx].done = true;
    map.TASKS[ev.idx].p = 1;
    map.exitsOpen = !!ev.exitsOpen;
    pushFeed(ev.exitsOpen ? `FULL ${NEED} MAY! ESCAPE DOOR OPEN — FOLLOW THE GREEN LED STRIP!` : `Fixed ${map.TASKS[ev.idx].code} (${ev.doneCount}/${NEED})`, '#4ed884');
    if (ev.exitsOpen && world) {
      if (world.exitGuideMat) {
        world.exitGuideMat.color.setHex(0x38f288);
        world.exitGuideMat.opacity = 0.96;
      }
      for (const em of world.exitMeshes) {
        em.door.position.y = WH + 2.5;
        em.signMat.color.setHex(0x36e074);
      }
    }
  } else if (ev.ev === 'elevOpen') {
    if (map) {
      if (map.elevatorState === 'closed') map.elevatorState = 'opening';
      audio.playElevatorSequence(map.ELEVATOR);
    }
    pushFeed(`${ev.byName || 'Player'} pressed the Elevator Open button — Enter Level 0!`, '#4ed884');
  } else if (ev.ev === 'escaped') {
    const v = players[ev.id];
    pushFeed(`${v?.name || 'Player'} escaped from Level 0!`, '#4ed884');
  } else if (ev.ev === 'sfx') {
    const pos = { x: ev.x, y: 1.2, z: ev.z };
    if (ev.kind === 'swing') audio.playSwing(pos);
    else if (ev.kind === 'consume') audio.playConsume(ev.item);
    else if (ev.kind === 'spark') audio.playAlertBeep();
  } else if (ev.ev === 'end') {
    weaponSystem.clearInput(); weaponSystem.view.root.visible = false; weaponSystem.bar.hidden = true;
    matchEnded = true;
    hillsAmbience?.dispose(); hillsAmbience = null;
  inMatch = false;
    document.exitPointerLock?.();
    hud.classList.add('hidden');
    endScr.classList.remove('hidden');
    $('endTitle').textContent = ev.title;
    $('endDesc').textContent = ev.desc;
  }
}

function sendAction(msg) {
  if (net.isHost) processPlayerActionHost(myId, msg);
  else net.sendToHost({ t: 'act', ...msg });
}

function applyHostSnapshot(snap) {
  if (!inMatch || net.isHost) return;
  removePeacefulLevelHostiles();
  for (const [id, sp] of Object.entries(snap.players)) {
    if (isHostileInPeacefulLevel({...players[id],...sp})) continue;
    const p = players[id];
    if (!p) continue;
    if (id !== myId) {
      p.x = sp.x; p.y = sp.y; p.z = sp.z;
      p.yaw = sp.yaw; p.pitch = sp.pitch; p.spd = sp.spd;
    } else {
      // Authoritative state sync for local client
      const prevState = p.state;
      const peaceful=isPeacefulLevel(sp.levelId||p.levelId);
      p.hp = peaceful ? Math.max(p.hp,sp.hp) : sp.hp;
      p.state = peaceful&&['down','carried','hooked'].includes(sp.state) ? 'ok' : sp.state;
      p.carrying = sp.carrying;
      p.hookIdx = sp.hookIdx;
      p.hooks = sp.hooks;
      p.selfEscapeLeft = sp.selfEscapeLeft ?? (p.role === 's' ? 1 : 0);
      p.inv = sp.inv;
      if (sp.state === 'carried' || sp.state === 'hooked' || prevState === 'carried' || prevState === 'hooked') {
        p.x = sp.x; p.z = sp.z;
      }
    }
    p.levelId = sp.levelId || 'level0';
    if (sp.weapon) p.weapon = { ...sp.weapon };
    if (sp.movement && (sp.movement.revision || 0) >= (p.movement?.revision || 0)) p.movement = { ...sp.movement };
    if (id !== myId) { p.vy = sp.vy; p.grounded = sp.grounded; }
    if (id !== myId) p.sliding = !!sp.sliding;
    p.crouch = sp.crouch;
    p.fl = sp.fl;
    p.swingT = sp.swingT;
    p.reveal = sp.reveal;
  }
  if (Array.isArray(snap.discovered)) {
    for (const dl of snap.discovered) levelDiscoveredSet.add(dl);
  }
  if (Array.isArray(snap.cleared)) {
    for (const cl of snap.cleared) levelsClearedSet.add(cl);
  }
  if ('activeJoin' in snap) {
    activeJoinTarget = snap.activeJoin || null;
  }
  const lvl0Map = getOrCreateLevelMap('level0');
  if (snap.elevState && lvl0Map) {
    const wasClosed = lvl0Map.elevatorState === 'closed';
    lvl0Map.elevatorState = snap.elevState;
    if (typeof snap.elevOpenP === 'number') {
      lvl0Map.elevatorOpenProgress = Math.max(lvl0Map.elevatorOpenProgress || 0, snap.elevOpenP);
    }
    if (wasClosed && snap.elevState !== 'closed' && activeLocalLevelId === 'level0') {
      audio.playElevatorSequence(lvl0Map.ELEVATOR);
    }
  }
  if (snap.tasks && lvl0Map) {
    snap.tasks.forEach((p, idx) => {
      if (lvl0Map.TASKS[idx] && !lvl0Map.TASKS[idx].done) {
        lvl0Map.TASKS[idx].p = Math.max(lvl0Map.TASKS[idx].p, p);
      }
    });
  }
  if (snap.subTasks) {
    for (const [lid, prog] of Object.entries(snap.subTasks)) {
      const sm = getOrCreateLevelMap(lid);
      if (sm?.TASKS?.[0] && !sm.TASKS[0].done) {
        sm.TASKS[0].p = Math.max(sm.TASKS[0].p, prog);
      }
    }
  }
  if (snap.subPumps) {
    for (const [lid, pArr] of Object.entries(snap.subPumps)) {
      const sm = getOrCreateLevelMap(lid);
      if (sm?.PUMPS && Array.isArray(pArr)) {
        for (let i = 0; i < sm.PUMPS.length && i < pArr.length; i++) {
          sm.PUMPS[i].p = Math.max(sm.PUMPS[i].p || 0, pArr[i] || 0);
          if (sm.PUMPS[i].p >= 1) sm.PUMPS[i].done = true;
        }
      }
    }
  }
}

function syncTaskCabinetLEDs() {
  if (!world?.taskMeshes || !map?.TASKS) return;
  for (let i = 0; i < map.TASKS.length; i++) {
    const t = map.TASKS[i];
    const tm = world.taskMeshes[i];
    if (!tm?.progSegs) continue;
    const filled = t.done ? 5 : Math.min(4, Math.floor(t.p * 5));
    for (let k = 0; k < 5; k++) {
      tm.progSegs[k].color.setHex(
        t.done ? 0x4ed884 : k < filled ? 0xffc83d : (k === filled && t.p > 0.02) ? 0x995818 : 0x241210
      );
    }
    if (!t.done && t.p > 0.02) tm.ledMat.color.setHex(0xffb830);
  }
}

// ---------- Host Simulation Tick (Multi-Entity AI + World Timers) ----------
function removePeacefulLevelHostiles() {
  for (const [id,p] of Object.entries(players)) {
    if (!isHostileInPeacefulLevel(p)) continue;
    if (p.isAI || id.startsWith('AI_SUB_')) {
      if(avatars[id]){scene.remove(avatars[id].group);delete avatars[id];}
      delete players[id];
    }
    else {
      const safe = getOrCreateLevelMap('level0').K_SPAWN;
      p.levelId='level0';p.x=safe.x;p.z=safe.z;p.y=0;p.carrying=null;
    }
  }
  aiControllers=aiControllers.filter(ctrl=>players[ctrl.id]&&!isHostileInPeacefulLevel(players[ctrl.id]));
}

function updateHostSimulation(dt) {
  if (!net.isHost) return;
  const pitMap=getOrCreateLevelMap('level0');
  for(const p of Object.values(players)){
    if(p.id!==myId&&!p.isAI&&['s','k'].includes(p.role)&&p.levelId==='level0'&&['ok','down'].includes(p.state))movementGuard.advanceEnvironment(p,{now:performance.now()/1000,dt,floorAt:(x,z,y)=>getTerrainAt(x,z,pitMap,y).floorY,abyssAt:(x,z,y)=>!!classicPitAt(pitMap.classic,x,z,y)});
    const ev=respawnPitPlayer(p,pitMap,performance.now());if(ev){movementGuard.reset(p);broadcastEvent(ev);}
  }
  removePeacefulLevelHostiles();
  for (const p of Object.values(players)) {
    if (p.role !== 's') continue;
    combatAuthority.tick(p);
    p.moveThirst = Math.max(0, (p.moveThirst ?? WATER_LIFE) - dt);
    if (p.id !== myId) {
      p.moveStam=advanceStamina(p.moveStam,dt,{sprinting:p.moveSprint&&!p.sliding,chase:threatProximity(p,players,isPeacefulLevel(p.levelId)),tactical:p.movement?.key==='tactical'});
      if(p.moveStam<=.02){p.moveStam=0;p.stamExhausted=true;p.moveSprint=false;}
      if(p.moveStam>=SPEED.STAM_DRAIN*STAM_EXHAUST_RATIO)p.stamExhausted=false;
    }
  }

  // Animate A-Sync Elevator Doors smoothly (plus auto-open if all Survivors are AI bots)
  const lvl0Map = getOrCreateLevelMap('level0');
  if (lvl0Map?.ELEVATOR) {
    if (lvl0Map.elevatorState === 'closed') {
      const hasHumanSurv = Object.values(players).some(p => p.role === 's' && !p.isAI);
      if (!hasHumanSurv && matchTime >= 1.6) {
        lvl0Map.elevatorState = 'opening';
        broadcastEvent({ ev: 'elevOpen', byId: 'BOT', byName: 'Exploration Team' });
      }
    }
    if (lvl0Map.elevatorState === 'opening') {
      lvl0Map.elevatorOpenProgress = Math.min(1, (lvl0Map.elevatorOpenProgress || 0) + dt / 1.45);
      if (lvl0Map.elevatorOpenProgress >= 1) lvl0Map.elevatorState = 'open';
    }
  }

  // Drive ALL patrolling quadrant & sub-level AI Entities in their own isolated dimension
  hostNoiseAlertT += dt;
  const doSprintNoiseScan = hostNoiseAlertT >= 0.72;
  if (doSprintNoiseScan) hostNoiseAlertT = 0;

  for (const ctrl of aiControllers) {
    const aiP = players[ctrl.id];
    if (!aiP) continue;
    if ((aiP.weaponStunUntil || 0) > performance.now() / 1000) { aiP.spd = 0; continue; }
    const aiMap = getOrCreateLevelMap(aiP.levelId || 'level0');
    ctrl.update(dt, aiP, players, aiMap, {
      onAggro(killer, targ, arch) {
        if (targ.id === myId) {
          pushFeed(`${arch?.name || killer.name} just spotted you nearby!`, '#ff7456');
        }
        // Bounded pack howl: notify nearby patrolling Entities within 44m in the same dimension
        const kLvl = killer.levelId || 'level0';
        for (const peer of aiControllers) {
          if (peer === ctrl) continue;
          const pp = players[peer.id];
          if (!pp || (pp.levelId || 'level0') !== kLvl) continue;
          if (Math.hypot(pp.x - killer.x, pp.z - killer.z) <= 44) {
            peer.investigate(targ.x, targ.z, aiMap, 7.5);
          }
        }
      },
      onHit(killer, targ) {
        audio.playSwing(killer);
        applyKillerHit(killer, targ);
      },
      onPickup(killer, targ) {
        pushFeed(`${targ.name} was ${killer.name} captured!`, '#ff8838');
      },
      onHook(killer, targ, hook) {
        hookSurvivorHost(killer, targ, hook);
      }
    });
  }

  // Loud sprinting footsteps / heavy breathing draw nearby idle Entities
  if (doSprintNoiseScan) {
    for (const s of Object.values(players)) {
      if (s.role !== 's' || s.state !== 'ok' || s.crouch) continue;
      if ((s.spd || 0) > SPEED.SURV_WALK + 2.2) {
        alertLocalMonstersNoise(s.levelId || 'level0', s.x, s.z, 24, 5.5);
      }
    }
  }
  syncTaskCabinetLEDs();

  // Simple wandering AI bots for Solo Entity practice
  for (const p of Object.values(players)) {
    if (!p.isAI || p.role !== 's' || p.state !== 'ok') continue;
    const botMap = getOrCreateLevelMap(p.levelId || 'level0');
    let bp = botPaths.get(p.id);
    if (!bp || !bp.path.length) {
      const tgt = botMap.TASKS[(Math.random() * botMap.TASKS.length) | 0] || botMap.SPAWN;
      bp = { path: findGridPath(botMap, p.x, p.z, tgt.x, tgt.z) };
      botPaths.set(p.id, bp);
    }
    const wp = bp.path[0];
    if (wp) {
      const dx = wp[0] - p.x, dz = wp[1] - p.z;
      const d = Math.hypot(dx, dz);
      if (d < (inClassic(botMap.classic,p.x,p.z) ? .22 : 1.2)) bp.path.shift();
      else {
        const vx = (dx / d) * SPEED.SURV_WALK * 0.92;
        const vz = (dz / d) * SPEED.SURV_WALK * 0.92;
        const [nx, nz] = collide(p.x + vx * dt, p.z + vz * dt, 0.36, botMap, false, 0);
        p.x = nx; p.z = nz; p.yaw = Math.atan2(-vx, -vz); p.spd = SPEED.SURV_WALK * 0.92;
      }
    }
  }

  // Update downed bleed timers, hook sacrifice timers, carried positions & traps
  for (const p of Object.values(players)) {
    if (p.swingT > 0) p.swingT = Math.max(0, p.swingT - dt * 2.8);
    if (p.escapeGuardT > 0) p.escapeGuardT = Math.max(0, p.escapeGuardT - dt);
    if (p.role !== 's') continue;

    if (p.state === 'down') {
      p.bleed -= dt;
      if (p.bleed <= 0) {
        p.state = 'dead';
        broadcastEvent({ ev: 'hookDeath', id: p.id, x: p.x, z: p.z });
        checkMatchEnd();
      }
    } else if (p.state === 'hooked') {
      p.hookT -= dt;
      if (p.hookT <= 0) {
        p.state = 'dead';
        const pMap = getOrCreateLevelMap(p.levelId || 'level0');
        if (pMap?.HOOKS?.[p.hookIdx]) pMap.HOOKS[p.hookIdx].occ = null;
        broadcastEvent({ ev: 'hookDeath', id: p.id, x: p.x, z: p.z });
        checkMatchEnd();
      }
    } else if (p.state === 'ok') {
      // Check active Bear Traps
      const pMap = getOrCreateLevelMap(p.levelId || 'level0');
      for (let i = 0; i < (pMap?.TRAPS?.length || 0); i++) {
        const tr = pMap.TRAPS[i];
        if (!tr.sprung && p.y < 0.3 && Math.hypot(p.x - tr.x, p.z - tr.z) < TRAP_R) {
          tr.sprung = true;
          p.hp = Math.min(p.hp, 1);
          broadcastEvent({ ev: 'trapSprung', idx: i, x: tr.x, z: tr.z });
        }
      }
    }
  }

  // Keep carried survivor attached cleanly
  for (const k of Object.values(players)) {
    if (k.role === 'k' && k.carrying && players[k.carrying]) {
      const v = players[k.carrying];
      v.x = k.x + Math.sin(k.yaw + 1.1) * 0.55;
      v.z = k.z + Math.cos(k.yaw + 1.1) * 0.55;
    }
  }

  // Track active teammate sub-level target for Co-op Join HUD button
  const activeSubTeammate = Object.values(players).find(
    pl => pl.role === 's' && pl.state !== 'dead' && pl.state !== 'escaped' && (pl.levelId || 'level0') !== 'level0'
  );
  if (activeSubTeammate) {
    const m = getLevelMeta(activeSubTeammate.levelId);
    activeJoinTarget = { levelId: activeSubTeammate.levelId, code: m.code, name: m.vnName, byName: activeSubTeammate.name };
  } else {
    activeJoinTarget = null;
  }

  // Broadcast world snapshot (~20 Hz)
  snapAccum += dt;
  if (!net.isSolo && snapAccum >= 0.05) {
    snapAccum = 0;
    const subTasks = {};
    const subPumps = {};
    for (const [lid, lMap] of levelMaps.entries()) {
      if (lid !== 'level0' && lMap?.TASKS?.[0]) subTasks[lid] = lMap.TASKS[0].p;
      if (lid !== 'level0' && lMap?.PUMPS?.length) subPumps[lid] = lMap.PUMPS.map(pm => pm.p || 0);
    }
    net.broadcast({
      t: 'snap',
      players,
      tasks: getOrCreateLevelMap('level0').TASKS.map(t => t.p),
      subTasks,
      subPumps,
      discovered: [...levelDiscoveredSet],
      cleared: [...levelsClearedSet],
      activeJoin: activeJoinTarget,
      elevState: lvl0Map.elevatorState,
      elevOpenP: lvl0Map.elevatorOpenProgress
    });
  }
}

// ---------- Local Player Movement, Bunny-Hop, Delay Flashlight & Actions ----------
function updateLocalPlayer(dt, elapsed) {
  const me = players[myId];
  if (!me) return;

  if (swingCD > 0) swingCD = Math.max(0, swingCD - dt);
  if (localSwingT > 0) localSwingT = Math.max(0, localSwingT - dt * 2.8);
  if (killerSlowT > 0) killerSlowT = Math.max(0, killerSlowT - dt);
  if (revealCD > 0) revealCD = Math.max(0, revealCD - dt);
  if (trapCD > 0) trapCD = Math.max(0, trapCD - dt);
  if (scanT > 0) scanT = Math.max(0, scanT - dt);
  if (vhsRevealT > 0) vhsRevealT = Math.max(0, vhsRevealT - dt);
  if (jellyBuffT > 0) jellyBuffT = Math.max(0, jellyBuffT - dt);
  if (revealGlobalT > 0) revealGlobalT = Math.max(0, revealGlobalT - dt);
  if (jumpBuffer > 0) jumpBuffer = Math.max(0, jumpBuffer - dt);
  if (wasAirborneT > 0) wasAirborneT = Math.max(0, wasAirborneT - dt);

  const isK = me.role === 'k';
  const movementProfile = isK ? normalizeProfile(null) : normalizeProfile(me.movement);
  const tactical = movementProfile.key === 'tactical';
  movementAssist.configure(movementProfile);

  if (me.role === 's' && me.state === 'ok') {
    thirstT = Math.max(0, thirstT - dt);
  }

  // Handle Locked/Incapacitated states cleanly
  if (me.state === 'carried' || me.state === 'hooked' || me.state === 'dead' || me.state === 'escaped') {
    me.spd = 0;
    localFlash.visible = false;
    localFlashCore.visible = false;
    fpFlashGroup.visible = false;
    camera.position.set(me.x, me.state === 'hooked' ? 2.05 : 1.35, me.z);
    camera.rotation.set(me.pitch, me.yaw, 0, 'YXZ');
    if (me.state === 'carried' || me.state === 'hooked') {
      updateInteractions(dt, me);
    }
    return;
  }

  // Movement Input Vector (Keyboard + Mobile Virtual Analog Joystick)
  let inF = 0, inR = 0;
  let kbdMove = false;
  if (!busyAct && !tpOpen) {
    if (keys[DEF_KB.fwd]) { inF += 1; kbdMove = true; }
    if (keys[DEF_KB.back]) { inF -= 1; kbdMove = true; }
    if (keys[DEF_KB.right]) { inR += 1; kbdMove = true; }
    if (keys[DEF_KB.left]) { inR -= 1; kbdMove = true; }
    if (mobJoyX !== 0 || mobJoyY !== 0) {
      inR += mobJoyX;
      inF += mobJoyY;
    }
  }
  const wishRaw = Math.hypot(inF, inR);
  const wishLen = Math.min(1, wishRaw);
  const fwX = -Math.sin(me.yaw), fwZ = -Math.cos(me.yaw);
  const rtX = Math.cos(me.yaw), rtZ = -Math.sin(me.yaw);
  const wishX = wishRaw > 0 ? (fwX * inF + rtX * inR) / wishRaw : 0;
  const wishZ = wishRaw > 0 ? (fwZ * inF + rtZ * inR) / wishRaw : 0;

  let eyeH = isK ? 1.82 : me.state === 'down' ? 0.45 : me.crouch ? 0.92 : 1.62;
  let wantSprint = false;
  let grounded = true;

  if (noclipMode) {
    // 3D Camera-Gaze Free-Flight No-Clip Physics (wall, floor, gravity & auto-drop bypass)
    me.crouch = false;
    eyeH = isK ? 1.82 : 1.62;
    const sprintBoost = !tpOpen && (keys[DEF_KB.sprint] || mobSprintToggle || mobEdgeSprint) ? 1.65 : 1.0;
    const flyUp = !tpOpen && (keys[DEF_KB.jump] || mobJumpHeld) ? 1 : 0;
    const flyDown = !tpOpen && (keys[DEF_KB.crouch] || mobCrouchToggle || keys['ControlLeft'] || keys['ControlRight'] || keys['KeyC']) ? 1 : 0;

    const cp = Math.cos(me.pitch);
    const sp = Math.sin(me.pitch);
    const f3X = -Math.sin(me.yaw) * cp;
    const f3Y = sp;
    const f3Z = -Math.cos(me.yaw) * cp;

    let gx = f3X * inF + rtX * inR;
    let gy = f3Y * inF + (flyUp - flyDown);
    let gz = f3Z * inF + rtZ * inR;
    const gLen = Math.hypot(gx, gy, gz);
    const flyMag = Math.min(1, gLen);
    if (gLen > 1e-4) {
      gx /= gLen; gy /= gLen; gz /= gLen;
    }
    const tgtSpd = noclipSpeed * sprintBoost * flyMag;
    const flyK = 1 - Math.exp(-15.0 * dt);
    noclipVelX += (gx * tgtSpd - noclipVelX) * flyK;
    noclipVelY += (gy * tgtSpd - noclipVelY) * flyK;
    noclipVelZ += (gz * tgtSpd - noclipVelZ) * flyK;

    const spanX = map.spanX ?? map.worldSpan ?? (N * C);
    const spanZ = map.spanZ ?? map.worldSpan ?? (N * C);
    me.x = THREE.MathUtils.clamp(me.x + noclipVelX * dt, -35, spanX + 35);
    me.y = THREE.MathUtils.clamp(me.y + noclipVelY * dt, -12, 180);
    me.z = THREE.MathUtils.clamp(me.z + noclipVelZ * dt, -35, spanZ + 35);
    me.vy = 0;
    hVelX = noclipVelX;
    hVelZ = noclipVelZ;
    me.spd = Math.hypot(noclipVelX, noclipVelY, noclipVelZ);
    me.swingT = localSwingT;
    stam = Math.min(SPEED.STAM_DRAIN, stam + dt * 2.5);

    const kFade = 1 - Math.exp(-14 * dt);
    camBobY += (0 - camBobY) * kFade;
    camSwayX += (0 - camSwayX) * kFade;
    camRoll += (0 - camRoll) * kFade;
    camNod += (0 - camNod) * kFade;
    fadeRunShake(kFade);
    shakeXRate = 0;
    shakeYRate = 0;
  } else {
  // Chase adrenaline boost near monsters: conserves stamina + raises escape sprint speed to lose Entities cleanly
  let nearestThreatDist = 999;
  if (!isK&&!isPeacefulLevel(me.levelId)) {
    for (const p of Object.values(players)) {
      if (p.role === 'k'&&(p.levelId||'level0')===(me.levelId||'level0')) {
        const d = Math.hypot(p.x - me.x, p.z - me.z);
        if (d < nearestThreatDist) nearestThreatDist = d;
      }
    }
  }
  const chaseProx = !isK && nearestThreatDist < 18
    ? Math.max(0, Math.min(1, (18 - nearestThreatDist) / 14))
    : 0;

  const crouchInput = !tpOpen && (!!keys[DEF_KB.crouch] || keys.ControlLeft || keys.ControlRight || mobCrouchToggle);
  const standClear = isK || canStandAt(me.x, me.z, map, me.y);
  me.crouch = !isK && (me.state === 'down' || crouchInput || movementAssist.sliding || !standClear);
  const stamMinUnlock = SPEED.STAM_DRAIN * STAM_EXHAUST_RATIO;
  if (stamExhausted && stam >= stamMinUnlock) {
    stamExhausted = false;
  }
  const sprintInput = !tpOpen && (!!keys[DEF_KB.sprint] || mobSprintToggle || mobEdgeSprint);
  const trySprint = !isK && me.state === 'ok' && !me.crouch && !busyAct && sprintInput && wishLen > 0;
  wantSprint = !tactical && trySprint && !stamExhausted && stam > 0;

  if (wantSprint) {
    stam = advanceStamina(stam,dt,{sprinting:true,chase:chaseProx});
    if (stam <= 0.02) {
      stam = 0;
      if (!stamExhausted) {
        stamExhausted = true;
        pushFeed('Exhausted! Reduced walking speed — Need >= 20% stamina to run again.', '#ffb84a');
      }
    }
  } else {
    stam = advanceStamina(stam,dt,{chase:chaseProx,tactical});
    if (stamExhausted && stam >= stamMinUnlock) stamExhausted = false;
  }

  // Target Ground Speed
  me.moveStam=stam;me.moveThirst=thirstT;me.moveSprint=tactical?sprintInput:wantSprint;me.stamExhausted=stamExhausted;
  let groundSpd;
  if (isK) {
    const killerSprint = !me.carrying && killerSlowT <= 0 && me.state === 'ok' && sprintInput && wishLen > 0;
    groundSpd = me.carrying
      ? SPEED.KILLER_CARRY
      : killerSlowT > 0
        ? SPEED.KILLER_SLOW
        : killerSprint
          ? (SPEED.KILLER_SPRINT || 8.88)
          : SPEED.KILLER_BASE;
  } else if (me.state === 'down') {
    groundSpd = SPEED.SURV_DOWN;
  } else if (tactical) {
    groundSpd = tacticalSpeed(movementProfile, { shift: sprintInput, crouch: me.crouch });
  } else if (me.crouch) {
    groundSpd = SPEED.SURV_CROUCH;
  } else if (wantSprint) {
    groundSpd = SPEED.SURV_SPRINT * (1.0 + chaseProx * 0.14);
  } else if (thirstT <= 0) {
    groundSpd = SPEED.SURV_THIRSTY;
  } else {
    groundSpd = SPEED.SURV_WALK * (1.0 + chaseProx * 0.14);
  }

  if (!tactical && jellyBuffT > 0) groundSpd *= 1.22;
  if (!kbdMove && !wantSprint && wishLen > 0 && wishLen < 0.99) {
    groundSpd *= 0.28 + 0.72 * wishLen;
  }

  const terrain = getTerrainAt(me.x, me.z, map, me.y);
  const floorBaseY = terrain.floorY;
  const prevInWater = !!me.inWater;
  me.inWater = !!terrain.inWater;
  if (me.inWater && !prevInWater && Math.hypot(hVelX, hVelZ) > 2.2) {
    audio.playWaterSplash?.(me, 0.52);
  }
  if (terrain.inWater && !isK) {
    groundSpd *= 0.80;
  }

  grounded = me.y <= floorBaseY + 0.045 && me.vy <= 0.45;
  const sprintCap = tactical||isK ? groundSpd : SPEED.SURV_SPRINT * (1 + chaseProx * .14) * (jellyBuffT > 0 ? 1.22 : 1) * (terrain.inWater ? .8 : 1);
  if (movementAssist.sliding) groundSpd = sprintCap;
  movementAssist.vx = hVelX; movementAssist.vz = hVelZ;
  const moveResult = movementAssist.step(dt, {
    grounded, jump: !tpOpen && !scState && (!!keys[DEF_KB.jump] || mobJumpHeld), autoHop: !!fxSettings.autoBhop,allowHopBonus:!isK,
    crouch: crouchInput, canStand: standClear, canAct: !paused && !tpOpen && !busyAct && me.state === 'ok' && !me.carrying,
    sprint: !tactical && !isK && sprintInput && !stamExhausted && stam > 0, sprintCap,
    speed: groundSpd, wx: wishX, wz: wishZ, wish: wishLen, surface: terrain.inWater ? 'water' : getSurfaceAt(me.x, me.z, map), water: terrain.inWater
  });
  hVelX = movementAssist.vx; hVelZ = movementAssist.vz;
  me.sliding = moveResult.sliding;
  me.crouch = !isK && (me.state === 'down' || (moveResult.crouch && !moveResult.jumped));
  movementSpeedCap = movementAssist.allowedSpeed;
  jumpBuffer = movementAssist.buffer;
  if (moveResult.justSlid) weaponSystem.sound.play(`slide_${terrain.inWater ? 'water' : getSurfaceAt(me.x, me.z, map)}`);
  if (moveResult.jumped) {
    me.vy = movementProfile.jumpImpulse;
    if (grounded) me.y = floorBaseY + 0.01;
    jumpBuffer = 0;
    bhopChain++; grounded = false;
    audio.playJump(me);
  }

  if (!grounded) {
    wasAirborneT = 0.24;
    me.vy -= SPEED.GRAVITY * dt;
    me.y += me.vy * dt;
    if (me.y <= floorBaseY) {
      me.y = floorBaseY;
      const impact = Math.abs(me.vy) / SPEED.JUMP_VEL;
      landTrauma = Math.min(1.0, landTrauma + impact * 0.45);
      stepSpringVel -= impact * 1.15;
      stepPulseT = 1.0;
      stepPulseAmp = Math.min(0.65, impact * 0.55);
      me.vy = 0;
      grounded = true;
      if (terrain.inWater) audio.playWaterSplash?.(me, Math.min(1.0, impact + 0.25));
      else audio.playLand(me, impact);
    }
  } else {
    // Smooth step/ramp elevation follow + Poolrooms water-slide momentum!
    me.y += (floorBaseY - me.y) * Math.min(1, 22 * dt);
    if (Math.abs(me.y - floorBaseY) < 0.01) me.y = floorBaseY;
    if (terrain.onSlide) {
      const sLerp = 1 - Math.exp(-7.5 * dt);
      hVelX += (terrain.slideVelX - hVelX) * sLerp;
      hVelZ += (terrain.slideVelZ - hVelZ) * sLerp;
      movementSpeedCap = sprintCap;
    }
    if (wasAirborneT <= 0 && wishLen === 0 && !terrain.onSlide) bhopChain = 0;
  }

  if(isPeacefulLevel(me.levelId)){
    const cell=getPoolroomsCellAt(me.x,me.z,map),body=me.crouch?1.08:1.72;
    if(cell&&me.y+body>cell.floorY+cell.ceiling-.06){me.y=Math.max(floorBaseY,cell.floorY+cell.ceiling-body-.06);me.vy=Math.min(0,me.vy);}
    if (cell?.tubeNetwork) {
      const fits = y => [[0, 0], [.30, 0], [-.30, 0], [0, .30], [0, -.30]].every(([dx, dz]) => tubeDistance(cell.tubeNetwork, me.x + dx, y + body - cell.floorY, me.z + dz) < -.012);
      if (!fits(me.y) && fits(floorBaseY)) {
        let lo = floorBaseY, hi = me.y;
        for (let i = 0; i < 9; i++) { const mid = (lo + hi) / 2; if (fits(mid)) lo = mid; else hi = mid; }
        me.y = lo; me.vy = Math.min(0, me.vy);
      }
    }
  }

  const architectureCeiling=classicCeilingAt(map,me.x,me.z,me.y);if(Number.isFinite(architectureCeiling)&&me.y>floorBaseY){const top=architectureCeiling-(isK?1.92:me.crouch?1.08:1.72)-.04;if(me.y>top){me.y=Math.max(floorBaseY,top);me.vy=Math.min(0,me.vy);}}
  // Flat-Floor False Noclip Drop & Crouch Hatch Walk-Through triggers in Level 0
  if (activeLocalLevelId === 'level0' && !isK && me.state === 'ok' && performance.now() > noclipDropLockUntil && map.ENTRANCES) {
    for (const ent of map.ENTRANCES) {
      const distEnt = Math.hypot(me.x - ent.x, me.z - ent.z);
      if (ent.entryType === 'noclip_floor' && distEnt < ent.radius) {
        noclipDropLockUntil = performance.now() + 2600;
        me.vy = -8.5;
        sendAction({ act: 'enterLevel', levelId: ent.levelId, via: 'noclip_floor' });
        return;
      }
      if (ent.entryType === 'crawl_hatch' && me.crouch && distEnt < 1.32) {
        noclipDropLockUntil = performance.now() + 2600;
        sendAction({ act: 'enterLevel', levelId: ent.levelId, via: 'crawl_hatch' });
        return;
      }
    }
  }

  const prevX = me.x, prevZ = me.z;
  const capped = capVelocity({ vx: hVelX, vz: hVelZ }, movementSpeedCap);
  hVelX = capped.vx; hVelZ = capped.vz;
  let nx = me.x, nz = me.z;
  const collisionSteps = Math.max(1, Math.ceil(Math.hypot(hVelX, hVelZ) * dt / .12));
  const movingBodyHeight = me.crouch ? Math.max(1.08, Math.min(1.72, movementAssist.eye + .12)) : 1.72;
  for (let i = 0; i < collisionSteps; i++) [nx, nz] = collide(nx + hVelX * dt / collisionSteps, nz + hVelZ * dt / collisionSteps, isK ? .42 : .36, map, me.crouch, me.y, movingBodyHeight);
  me.x = nx;
  me.z = nz;
  const actualVx = (me.x - prevX) / Math.max(dt, 1e-4);
  const actualVz = (me.z - prevZ) / Math.max(dt, 1e-4);
  me.spd = Math.hypot(actualVx, actualVz);
  if (Math.abs(actualVx) < Math.abs(hVelX) * .1) hVelX = actualVx;
  if (Math.abs(actualVz) < Math.abs(hVelZ) * .1) hVelZ = actualVz;
  if (me.sliding && me.spd < 1) { movementAssist.endSlide(); me.sliding = false; }
  me.grounded = grounded;
  me.swingT = localSwingT;

  if (landTrauma > 0) landTrauma = Math.max(0, landTrauma - dt * 2.8);

  // Surface-aware footstep spatial audio & visceral found-footage running/walking camera jolt
  if (grounded && me.spd > 0.6 && !me.sliding) {
    const strideLen = wantSprint ? 2.28 : me.crouch ? 1.12 : 1.35;
    stepPhase += (me.spd / strideLen) * Math.PI * dt;
    stepDist += me.spd * dt;
    if (stepDist >= strideLen) {
      stepDist -= strideLen;
      stepFootSign = -stepFootSign;
      const imp = isK ? 1.32 : wantSprint ? 1.38 : me.crouch ? 0.30 : 0.64;
      stepSpringVel -= imp;
      stepPulseT = 1.0;
      stepPulseAmp = isK ? 1.24 : wantSprint ? 1.44 : me.crouch ? 0.34 : 0.68;
      landTrauma = Math.min(0.65, landTrauma + (isK ? 0.30 : wantSprint ? 0.26 : 0.12));
      triggerRunStepShake(stepFootSign, wantSprint, me.crouch, isK);
      audio.playFootstep(me, wantSprint, me.crouch || (tactical && sprintInput), isK, terrain.inWater ? 'water' : getSurfaceAt(me.x, me.z, map));
    }
  }

  // Zero-initial-slope squared-sine footstrike cushion + deep waist-glide spring
  const springAcc = -36.0 * stepSpring - 12.2 * stepSpringVel;
  stepSpringVel += springAcc * dt;
  stepSpring = THREE.MathUtils.clamp(stepSpring + stepSpringVel * dt, -0.34, 0.14);
  if (stepPulseT > 0) stepPulseT = Math.max(0, stepPulseT - dt * 2.75);
  const pulseU = 1.0 - stepPulseT;
  const footPlantCurve = stepPulseT > 0 ? Math.pow(Math.sin(pulseU * Math.PI), 2.0) * stepPulseAmp : 0;

  // Exit threshold check for Survivors
  if (!isK && map.exitsOpen && activeLocalLevelId === 'level0') {
    const spanZ = map.spanZ ?? map.worldSpan ?? (N * C);
    for (const e of map.EXITS) {
      if (Math.hypot(me.x - e.x, 0) < 2.2 && ((e.dirZ < 0 && me.z < -0.5) || (e.dirZ > 0 && me.z > spanZ + 0.5))) {
        sendAction({ act: 'escape' });
        return;
      }
    }
  }

  // Camera placement + stronger visceral Found Footage running/walking camera shake & handheld tremor
  eyeH = isK ? 1.82 : me.state === 'down' ? 0.45 : me.crouch ? 0.92 : 1.62;
  const rawMoveMix = grounded&&!me.sliding ? Math.min(1, me.spd / (wantSprint?7.4:me.crouch?2:SPEED.SURV_WALK)) : 0;
  const mixK = 1 - Math.exp(-9.5 * dt);
  smoothMoveMix += (rawMoveMix - smoothMoveMix) * mixK;
  smoothSprintMix += ((wantSprint && rawMoveMix > 0.2 ? 1 : 0) - smoothSprintMix) * mixK;

  // Distance-driven gait: one vertical cycle per audible footfall, horizontal sway over two steps.
  const walkAmp=me.crouch?.016:.052+.047*smoothSprintMix;
  const strideWaveY=(.9*Math.sin(stepPhase*2-.35)+.1*Math.sin(stepPhase*4+.6))*walkAmp*smoothMoveMix;
  const cushionDip=stepSpring*.23-footPlantCurve*.012;
  const tgtBobY=THREE.MathUtils.clamp(strideWaveY*Math.max(0,Math.min(2.5,Number(fxSettings.verticalBob??1)))+cushionDip,-.17,.12);
  const tgtSwayX=Math.cos(stepPhase)*(.026+.026*smoothSprintMix)*smoothMoveMix;
  const tgtRoll=Math.sin(stepPhase)*(.0066+.008*smoothSprintMix)*smoothMoveMix+footPlantCurve*.005*stepFootSign;
  const tgtNod=Math.cos(stepPhase*2-.45)*(.0043+.0067*smoothSprintMix)*smoothMoveMix+footPlantCurve*.008-stepSpring*.06;
  const forwardSpeed=-hVelX*Math.sin(camYaw)-hVelZ*Math.cos(camYaw);
  const foreTarget=THREE.MathUtils.clamp((forwardSpeed-previousForwardSpeed)/Math.max(.004,dt)*.0009,-.035,.035)+Math.sin(stepPhase*2+.15)*.006*smoothMoveMix;
  camForeZ+=(foreTarget-camForeZ)*(1-Math.exp(-11*dt));previousForwardSpeed=forwardSpeed;

  const camK = 1 - Math.exp(-14.0 * dt);
  const prevBobY = camBobY;
  const prevSwayX = camSwayX;
  const prevNod = camNod;
  camBobY += (tgtBobY - camBobY) * camK;
  camSwayX += (tgtSwayX - camSwayX) * camK;
  camRoll += (tgtRoll - camRoll) * camK;
  camNod += (tgtNod - camNod) * camK;
  const rs = updateRunCameraShake(dt, me.crouch, Math.max(0, Math.min(2.5, Number(fxSettings.verticalBob ?? 1))));

  // Feed active running bob/jolt camera velocity into motion blur (cleanly zero when halted!)
  const invShakeDt = 1 / Math.max(dt, 0.004);
  const moveBlurGate = THREE.MathUtils.clamp((me.spd - 0.55) / 3.0, 0, 1);
  shakeXRate = (((camSwayX + rs.x - prevEffSwayX) * 1.25 + (rs.yaw - prevEffYaw) * 0.9) * invShakeDt) * moveBlurGate;
  shakeYRate = (((camBobY + rs.y - prevEffBobY) * 1.35 + (prevEffPitch - (-camNod + rs.pitch)) * 3.6) * invShakeDt) * moveBlurGate;
  prevEffSwayX = camSwayX + rs.x; prevEffBobY = camBobY + rs.y; prevEffPitch = -camNod + rs.pitch; prevEffYaw = rs.yaw;
  }

  // Heavy smooth found-footage Camera Pan Delay Curve (weighted camcorder gimbal inertia without stretching motion blur beyond mouse stop)
  const ads = weaponSystem.ads;
  const kCam = tactical || ads > .98 ? 1 : 1 - Math.exp(-(14.5 + ads * 70) * dt);
  const dCamYaw = Math.atan2(Math.sin(me.yaw - camYaw), Math.cos(me.yaw - camYaw));
  const dCamPitch = me.pitch - camPitch;
  camYaw += dCamYaw * kCam;
  camPitch += dCamPitch * kCam;
  camRollPan += (THREE.MathUtils.clamp(-dCamYaw * 0.20, -0.072, 0.072) - camRollPan) * (1 - Math.exp(-12.5 * dt));

  const natural = humanCamera.update(dt, { speed: me.spd, crouch: me.crouch, ads, mode: fxSettings.idleMotion, reduced: fxSettings.reducedMotion, inspect: ['INSPECTING', 'FLEX_LOOP'].includes(weaponSystem.view.animation.state), grounded });
  const handheld=handheldCamera.update(dt,{mode:fxSettings.idleMotion,intensity:fxSettings.handheldTremor,reduced:fxSettings.reducedMotion,ads,inspect:['INSPECTING','FLEX_LOOP'].includes(weaponSystem.view.animation.state)});
  const cameraMotionScale = (fxSettings.reducedMotion ? .08 : 1) * (1 - ads * .98) * movementProfile.cameraIntensity;
  const moveShake=Math.max(0,Math.min(3,Number(fxSettings.movementShake) || 0));
  const locomotion=boundedLocomotion({x:camSwayX+runShakeOut.x,y:camBobY+runShakeOut.y,z:camForeZ,pitch:-camNod+runShakeOut.pitch,yaw:runShakeOut.yaw,roll:camRoll+runShakeOut.roll+(tactical?0:camRollPan)+(me.sliding?.035:0)},cameraMotionScale*moveShake);
  shakeXRate *= cameraMotionScale*moveShake;shakeYRate *= cameraMotionScale*moveShake;
  eyeH = movementAssist.cameraHeight(eyeH, dt);
  const sideOffset = locomotion.x + natural.x+handheld.x,foreOffset=locomotion.z+handheld.z;
  camera.position.set(me.x + Math.cos(camYaw) * sideOffset+Math.sin(camYaw)*foreOffset, eyeH + me.y + locomotion.y + natural.y+handheld.y, me.z - Math.sin(camYaw) * sideOffset+Math.cos(camYaw)*foreOffset);
  camera.position.y=Math.min(camera.position.y,classicCeilingAt(map,camera.position.x,camera.position.z,me.y,.08)-Math.max(.06,camera.near*1.4));
  camera.rotation.set(camPitch + locomotion.pitch + natural.pitch+handheld.pitch, camYaw + locomotion.x*.055+locomotion.yaw+handheld.yaw, locomotion.roll + natural.roll+handheld.roll, 'YXZ');
  if(import.meta.env.DEV&&new URLSearchParams(location.search).has('cameradebug')){
    let d=document.getElementById('cameraDiagnostic');if(!d){d=document.createElement('pre');d.id='cameraDiagnostic';d.style.cssText='position:fixed;left:12px;top:65px;z-index:900;color:#fff;background:#000c;padding:12px;pointer-events:none;font:12px monospace';document.body.append(d);}
    d.textContent=`Idle: ${natural.mode}  blend ${natural.weight.toFixed(3)}\nBreath ${(natural.breathing*1000).toFixed(2)} mm  sway ${(natural.sway*1000).toFixed(2)} mm\nPitch ${(natural.pitch*180/Math.PI).toFixed(3)}°  roll ${(natural.roll*180/Math.PI).toFixed(3)}°\nApplied position ${camera.position.toArray().map(v=>v.toFixed(4)).join(', ')}\nApplied rotation ${[camera.rotation.x,camera.rotation.y,camera.rotation.z].map(v=>v.toFixed(5)).join(', ')}\nMovement shake ${(moveShake*100).toFixed(0)}%\nTremor ${(Math.hypot(handheld.fine.pitch,handheld.fine.yaw)*180/Math.PI).toFixed(4)}° | cutoff ${handheld.cutoffHz.toFixed(1)}Hz`;
  }

  // Keep Camcorder HUD strictly fixed/locked on screen without camera shake coupling
  if (hud && hud.style.transform !== 'none') hud.style.transform = 'none';

  // Dynamic FOV scaling cleanly with speed, Entity lunge & subtle liminal breathing unease!
  const baseFov = isK ? 86 : 80;
  const speedExcess = Math.max(0, me.spd - (SPEED.SURV_WALK + 0.15));
  const bonusFov = Math.min(20, (speedExcess / Math.max(1, SPEED.SURV_SPRINT - SPEED.SURV_WALK)) * 16) + (localSwingT > 0 ? Math.sin(localSwingT * Math.PI) * 5.5 : 0);
  const targetFov = (baseFov + (tactical ? 0 : bonusFov * (fxSettings.reducedMotion ? .2 : 1))) * (1 - ads) + 55 * ads;
  if (Math.abs(camera.fov - targetFov) > 0.05) {
    camera.fov += (targetFov - camera.fov) * (1 - Math.exp(-10 * dt));
    camera.updateProjectionMatrix();
  }

  // Blazing Pure-White Survivor Flashlight + Deeper Inertial Hand Delay Curve Following Mouse
  const flashOn = !isK && !!me.fl;
  localFlash.visible = flashOn;
  localFlashCore.visible = flashOn;
  fpFlashGroup.visible = flashOn && weaponSystem.equipped === 'none';
  if (flashOn) {
    const inBrightPool = activeLocalLevelId === 'level37';
    localFlash.intensity = inBrightPool ? 1.85 : 11.5;
    localFlashCore.intensity = inBrightPool ? 0.55 : 6.5;
    const kFlash = 1 - Math.exp(-5.4 * dt);
    const dYaw = Math.atan2(Math.sin(me.yaw - flashYaw), Math.cos(me.yaw - flashYaw));
    const dPitch = me.pitch - flashPitch;
    flashYaw += dYaw * kFlash;
    flashPitch += dPitch * kFlash;

    const dirX = -Math.sin(flashYaw) * Math.cos(flashPitch);
    const dirY = Math.sin(flashPitch);
    const dirZ = -Math.cos(flashYaw) * Math.cos(flashPitch);

    // Slight right-hand world origin + subtle breathing float
    const handX = me.x + Math.cos(camYaw) * 0.22;
    const handY = eyeH + me.y - 0.16 + Math.sin(elapsed * 2.3) * 0.012;
    const handZ = me.z - Math.sin(camYaw) * 0.22;
    localFlash.position.set(handX, handY, handZ);
    localFlashCore.position.set(handX, handY, handZ);
    localFlashTarget.position.set(handX + dirX * 14, handY + dirY * 14, handZ + dirZ * 14);

    // Sync visible handheld barrel mesh with noticeable rotational inertia lag
    fpFlashGroup.rotation.y = THREE.MathUtils.clamp(-dYaw * 0.62, -0.42, 0.42);
    fpFlashGroup.rotation.x = THREE.MathUtils.clamp(dPitch * 0.52, -0.35, 0.35);
    fpFlashGroup.position.y = -0.23 + Math.sin(elapsed * 2.3) * 0.008;
  }

  // Update Prompt & Active Action Progress (`busyAct`)
  updateInteractions(dt, me);

  // Sync local transform to Host if client
  if (!net.isHost) {
    snapAccum += dt;
    if (snapAccum >= 0.05) {
      snapAccum = 0;
      net.sendToHost({
        t: 'input',
        x: me.x, y: me.y, z: me.z, yaw: me.yaw, pitch: me.pitch,
        spd: me.spd, crouch: me.crouch, fl: me.fl, sliding: !!me.sliding,
        sprint: !!keys[DEF_KB.sprint] || mobSprintToggle || mobEdgeSprint, bhop: movementAssist.hopBonus > 0
      });
    }
  }
}

function findBestPrompt(me) {
  for (const door of map.LEVEL_DOORS || []) {
    if (Math.hypot(me.x - door.x, me.z - door.z) <= 3.2 && Math.abs(me.y - door.y) < 2.5) return {
      critical: true, text: `[E] ${door.label}`, act: () => {
        if (performance.now() < noclipDropLockUntil) return;
        const dst = getOrCreateLevelMap(door.targetLevel);
        const route = resolveThreshold(map, dst, door.id, me, performance.now());
        if (!route.ok) { if (route.reason !== 'cooldown') pushFeed('Door not ready. Try again.', '#d9dab8'); return; }
        noclipDropLockUntil = performance.now() + 1200;
        sendAction({act:'enterLevel',levelId:door.targetLevel,via:'horizon_door',doorId:door.id});
      }
    };
  }
  if (me.role === 'k') {
    if (me.carrying) {
      for (const h of (map.HOOKS || [])) {
        if (!h.occ && Math.hypot(me.x - h.x, me.z - h.z) < 2.6) {
          return { text: '[E] Hang victim on hook', act: () => sendAction({ act: 'kHook', hookIdx: h.id }) };
        }
      }
      return null;
    }
    for (const s of Object.values(players)) {
      if (s.role === 's' && s.state === 'down' && (s.levelId || 'level0') === activeLocalLevelId && Math.hypot(me.x - s.x, me.z - s.z) < 2.2) {
        return { text: '[E] Pick up fallen victim', act: () => sendAction({ act: 'kGrab' }) };
      }
    }
    return null;
  }

  // Survivor Prompts
  if (me.state === 'carried') {
    if ((me.selfEscapeLeft ?? 1) > 0) {
      return {
        critical: true,
        text: '[Hold E] Self-free from Monster (1 time)',
        hold: { kind: 'selfEscape', targetId: 'self', duration: 1.4, critical: true, onDone: () => sendAction({ act: 'selfEscape' }) }
      };
    }
    return { critical: true, text: 'Self-free exhausted — Wait for teammate rescue!' };
  }
  if (me.state === 'hooked') {
    if ((me.selfEscapeLeft ?? 1) > 0) {
      return {
        critical: true,
        text: '[Hold E] Free yourself from the Hook (1 time)',
        hold: { kind: 'selfEscape', targetId: 'self', duration: 1.8, critical: true, onDone: () => sendAction({ act: 'selfEscape' }) }
      };
    }
    const othersAlive = Object.values(players).filter(x => x.id !== myId && x.role === 's' && x.state !== 'dead' && x.state !== 'escaped').length;
    if (othersAlive === 0) {
      return {
        critical: true,
        text: '[Hold E] Struggle free from the Hook',
        hold: { kind: 'selfUnhook', targetId: 'self', duration: 2.6, critical: true, onDone: () => sendAction({ act: 'selfUnhook' }) }
      };
    }
    return { critical: true, text: 'Stuck on the Hook — Waiting for teammates to rescue!' };
  }
  if (me.state !== 'ok') return null;

  // 0. Elevator Door Open Button inside A-Sync Cabin (first player in can trigger immediately!)
  if (map?.ELEVATOR && map.elevatorState === 'closed' && Math.hypot(me.x - map.ELEVATOR.x, me.z - map.ELEVATOR.z) < 3.1) {
    return {
      critical: true,
      text: '[E] Open Elevator → Level 0',
      act: () => sendAction({ act: 'openElevator' })
    };
  }

  // 1. Rescue Hooked teammate (checks both hook slot and live teammate coords in current level)
  for (const h of (map.HOOKS || [])) {
    if (h.occ && players[h.occ]?.state === 'hooked' && (players[h.occ]?.levelId || 'level0') === activeLocalLevelId && Math.hypot(me.x - h.x, me.z - h.z) < 2.75) {
      const vicName = players[h.occ]?.name || 'teammate';
      return {
        critical: true,
        text: `[E] Rescue ${vicName} on the hook`,
        hold: { kind: 'unhook', targetId: h.id, duration: UNHOOK_T, critical: true, onDone: () => sendAction({ act: 'unhook', hookIdx: h.id }) }
      };
    }
  }
  for (const s of Object.values(players)) {
    if (s.id !== myId && s.role === 's' && s.state === 'hooked' && (s.levelId || 'level0') === activeLocalLevelId && Math.hypot(me.x - s.x, me.z - s.z) < 2.75) {
      const hkIdx = s.hookIdx >= 0 ? s.hookIdx : 0;
      return {
        critical: true,
        text: `[E] Rescue ${s.name} on the hook`,
        hold: { kind: 'unhook', targetId: hkIdx, duration: UNHOOK_T, critical: true, onDone: () => sendAction({ act: 'unhook', hookIdx: hkIdx }) }
      };
    }
  }
  // 2. Revive Downed teammate
  for (const s of Object.values(players)) {
    if (s.id !== myId && s.state === 'down' && (s.levelId || 'level0') === activeLocalLevelId && Math.hypot(me.x - s.x, me.z - s.z) < 2.45) {
      return {
        critical: true,
        text: `[Hold E] First Aid ${s.name}`,
        hold: { kind: 'revive', targetId: s.id, duration: 4.5, critical: true, onDone: () => sendAction({ act: 'revive', targetId: s.id }) }
      };
    }
  }
  // 3. Pickups (Water, Scanner, Moth Jelly, Royal Ration, UV Flare + Strange Relics)
  const itemGroups = [
    [map.WATERS, 'water', 'Almond Water'],
    [map.SCANS, 'scan', 'Entity Detector'],
    [map.JELLIES, 'jelly', 'Night Butterfly'],
    [map.RATIONS, 'ration', 'Royal Ration'],
    [map.FLARES, 'flare', 'UV Flare']
  ];
  for (const [list, kind, label] of itemGroups) {
    for (const it of list) {
      if (!it.gone && Math.hypot(me.x - it.x, me.z - it.z) < 2.15) {
        return { text: `[E] Pick up ${label}`, act: () => sendAction({ act: 'pickup', kind, id: it.id }) };
      }
    }
  }
  for (const rel of (map.RELICS || [])) {
    if (!rel.gone && Math.hypot(me.x - rel.x, me.z - rel.z) < 2.25) {
      return { text: `[E] Activate ${rel.label}`, act: () => sendAction({ act: 'pickup', kind: 'relic', id: rel.id }) };
    }
  }
  // 4a. Poolrooms Hydraulic Pump Valve Stations (`map.PUMPS`)
  for (const pm of (map.PUMPS || [])) {
    if (!pm.done && Math.hypot(me.x - pm.x, me.z - pm.z) < 2.85) {
      const pct = Math.round((pm.p || 0) * 100);
      return {
        text: `[Hold E] Open Valve ${pm.name} (${pct}%)`,
        hold: { kind: 'pump', targetId: `pump_${pm.id}`, duration: 4.5, pumpIdx: pm.id }
      };
    }
  }
  // 4. Breaker Box Tasks (displays unique Machine Code, Symbol & Saved %!)
  for (const t of map.TASKS) {
    if (!t.done && Math.hypot(me.x - t.x, me.z - t.z) < 2.8) {
      const pct = Math.round(t.p * 100);
      return {
        text: `[Hold E] ${pct > 0 ? 'Continue repairing' : 'Repair'} machine ${t.code || ''} ${t.symbol || ''} (${pct}%${pct > 0 ? ' Saved' : ''})`,
        hold: { kind: 'task', targetId: t.id, duration: activeLocalLevelId === 'level0' ? TASK_TIME : 10, taskIdx: t.id }
      };
    }
  }
  // 4b. Sub-Level Return Portal to Level 0
  if (activeLocalLevelId !== 'level0' && map.PORTALS) {
    for (const pt of map.PORTALS) {
      if (Math.hypot(me.x - pt.x, me.z - pt.z) < 3.0) {
        const ready = map.TASKS.every(t => t.done);
        if (ready) {
          return {
            critical: true,
            text: `[E] ${pt.label || 'Enter Return Portal to Level 0'}`,
            act: () => {
              noclipDropLockUntil = performance.now() + 1800;
              sendAction({ act: 'enterLevel', levelId: 'level0', via: 'return' });
            }
          };
        }
        return { text: 'Must repair Elevator before opening Return Portal to Level 0!' };
      }
    }
  }
  // 4c. Level 0 Sub-Level Entrances (Portals, Pickups, Crawl Hatches)
  if (activeLocalLevelId === 'level0' && map.ENTRANCES) {
    for (const ent of map.ENTRANCES) {
      if (ent.entryType === 'noclip_floor') continue; // Stealth false-floor noclip drop!
      if (Math.hypot(me.x - ent.x, me.z - ent.z) < ent.radius + 0.65) {
        if (ent.needCrouch && !me.crouch) {
          return { text: `Crouch [C] to enter ${ent.label}` };
        }
        return {
          critical: true,
          text: `[E] ${ent.entryType === 'pickup' ? 'Pick up' : 'Enter'}: ${ent.label}`,
          act: () => {
            noclipDropLockUntil = performance.now() + 1800;
            sendAction({ act: 'enterLevel', levelId: ent.levelId, via: ent.entryType });
          }
        };
      }
    }
  }
  // 5. Disarm Trap
  for (let i = 0; i < (map.TRAPS?.length || 0); i++) {
    const tr = map.TRAPS[i];
    if (!tr.sprung && Math.hypot(me.x - tr.x, me.z - tr.z) < 2.0) {
      return {
        text: '[Hold E] Remove Iron Trap',
        hold: { kind: 'disarm', targetId: i, duration: DISARM_T, onDone: () => sendAction({ act: 'trapDisarm', idx: i }) }
      };
    }
  }
  return null;
}

function updateInteractions(dt, me) {
  const prompt = findBestPrompt(me);
  const pBox = $('promptBox');
  const aWrap = $('actWrap');

  if (prompt && !busyAct) {
    pBox.textContent = prompt.text;
    pBox.classList.remove('hidden');
    pBox.classList.toggle('force-show', !!prompt.critical);
  } else {
    pBox.classList.add('hidden');
    pBox.classList.remove('force-show');
  }

  // Handle hold-E actions; fleeing/stopping ALWAYS saves existing `task.p` intact!
  const canHold = (!!keys[DEF_KB.use] || mobUseHeld) && !!prompt?.hold && (prompt.hold.kind === 'selfEscape' || prompt.hold.kind === 'selfUnhook' || me.spd < 1.25);
  const mobUse = $('mobUseBtn');
  if (mobUse) {
    const ready = !!(prompt?.hold || prompt?.act || busyAct);
    mobUse.classList.toggle('ready', ready);
    const label = busyAct
      ? 'HOLDING...'
      : prompt?.text
        ? prompt.text.replace(/^\[(?:Hold\s+)?E\]\s*/i, '')
        : 'INTERACT';
    const sub = busyAct ? 'In progress' : prompt?.hold ? 'Hold' : prompt?.act ? 'Touch' : 'E';
    mobUse.innerHTML = `${esc(label)}<small>${sub}</small>`;
  }
  if (canHold) {
    if (!busyAct || busyAct.kind !== prompt.hold.kind || busyAct.targetId !== prompt.hold.targetId) {
      const savedP = prompt.hold.kind === 'task' ? (map.TASKS[prompt.hold.taskIdx]?.p || 0) : 0;
      busyAct = { ...prompt.hold, prog: savedP };
    }
  } else if (busyAct) {
    // Interrupted / chased away: preserve local machine progress cleanly!
    if (busyAct.kind === 'task' && map.TASKS[busyAct.taskIdx]) {
      const t = map.TASKS[busyAct.taskIdx];
      t.p = Math.max(t.p, busyAct.prog);
    }
    busyAct = null;
    scState = null;
    $('scWrap').classList.add('hidden');
  }

  if (busyAct) {
    aWrap.classList.remove('hidden');
    aWrap.classList.toggle('force-show', !!busyAct.critical);
    if (busyAct.kind === 'task') {
      const t = map.TASKS[busyAct.taskIdx];
      const dur = busyAct.duration || TASK_TIME;
      const inc = dt / dur;
      busyAct.prog = Math.min(1, Math.max(t?.p || 0, busyAct.prog) + inc);
      if (t) t.p = busyAct.prog;
      sendAction({ act: 'taskProg', idx: busyAct.taskIdx, delta: inc });
      syncTaskCabinetLEDs();
      $('actLabel').textContent = `Repairing Elevator ${t?.code || ''} ${t?.symbol || ''}... ${Math.round(busyAct.prog * 100)}%`;
      $('actBar').style.width = `${busyAct.prog * 100}%`;
      if (busyAct.prog >= 1) busyAct = null;
    } else if (busyAct.kind === 'pump') {
      const pm = map.PUMPS?.[busyAct.pumpIdx];
      const dur = busyAct.duration || 4.5;
      const inc = dt / dur;
      busyAct.prog = Math.min(1, Math.max(pm?.p || 0, busyAct.prog) + inc);
      if (pm) pm.p = busyAct.prog;
      sendAction({ act: 'pumpProg', idx: busyAct.pumpIdx, delta: inc });
      $('actLabel').textContent = `Opening Valve ${pm?.name || ''}... ${Math.round(busyAct.prog * 100)}%`;
      $('actBar').style.width = `${busyAct.prog * 100}%`;
      if (busyAct.prog >= 1) busyAct = null;
    } else {
      busyAct.prog += dt / busyAct.duration;
      $('actLabel').textContent = busyAct.kind === 'unhook' ? 'Rescuing teammate...'
        : busyAct.kind === 'selfEscape' ? 'Struggling to free self...'
        : busyAct.kind === 'selfUnhook' ? 'Struggling to free from hook...'
        : busyAct.kind === 'revive' ? 'Administering first aid...'
        : 'Disarming trap...';
      $('actBar').style.width = `${Math.min(100, busyAct.prog * 100)}%`;
      if (busyAct.prog >= 1) {
        busyAct.onDone?.();
        busyAct = null;
      }
    }
  } else {
    aWrap.classList.add('hidden');
    aWrap.classList.remove('force-show');
  }
}

function useQuickItem(slotIdx) {
  const me = players[myId];
  if (!inMatch || !me || me.role !== 's' || me.state !== 'ok') return;
  const order = ['water', 'scan', 'jelly', 'ration', 'flare'];
  const kind = order[slotIdx];
  if (!kind || (me.inv[kind] || 0) <= 0) {
    pushFeed('No more of this item!', '#c8b892');
    return;
  }

  // Immediate local feel + authoritative host state sync
  if (kind === 'water') {
    thirstT = Math.min(WATER_LIFE, thirstT + WATER_LIFE * 0.72);
    stam = Math.min(SPEED.STAM_DRAIN, stam + SPEED.STAM_DRAIN * 0.65);
    pushFeed('Drank Almond Water (+HP, +Stamina, +Thirst)', '#56d892');
  } else if (kind === 'jelly') {
    stam = SPEED.STAM_DRAIN;
    jellyBuffT = 6.0;
    pushFeed('Night Butterfly: Full Stamina & +22% Speed (6s)!', '#ffa832');
  } else if (kind === 'ration') {
    thirstT = WATER_LIFE;
    stam = SPEED.STAM_DRAIN;
    jellyBuffT = Math.max(jellyBuffT, 3.0);
    pushFeed('Royal Feast: Fully restored!', '#ffdc48');
  } else if (kind === 'scan') {
    scanT = SCAN_T;
  } else if (kind === 'flare') {
    pushFeed('Threw UV Flare!', '#ee66ff');
  }
  sendAction({ act: 'useItem', kind });
}

function syncFlashlightUI(me = players[myId]) {
  const btn = $('flashToggleBtn');
  const mFlash = $('mobFlashBtn');
  const isK = me?.role === 'k';
  if (btn) btn.classList.toggle('hidden', !!isK || !me);
  if (mFlash) mFlash.classList.toggle('hidden', !!isK || !me);
  if (!me || isK) return;
  const isOn = !!me.fl;
  if (btn) {
    btn.classList.toggle('on', isOn);
    const st = btn.querySelector('.light-state');
    if (st) st.textContent = isOn ? 'ON' : 'OFF';
  }
  if (mFlash) {
    mFlash.classList.toggle('active', isOn);
    const sub = mFlash.querySelector('small');
    if (sub) sub.textContent = isOn ? 'ON' : 'OFF';
  }
}

function toggleFlashlight() {
  const me = players[myId];
  if (!me || me.role !== 's' || me.state !== 'ok') return false;
  me.fl = !me.fl;
  localFlash.visible = me.fl;
  localFlashCore.visible = me.fl;
  fpFlashGroup.visible = me.fl;
  syncFlashlightUI(me);
  return me.fl;
}

// ---------- HUD Rendering ----------
function updateHUD(elapsed, fpsVal) {
  const me = players[myId];
  if (!me) return;
  const isK = me.role === 'k';
  syncFlashlightUI(me);

  // VHS Timecode, Camera Battery & Authentic Lens Specs
  const mins = Math.floor(matchTime / 60).toString().padStart(2, '0');
  const secs = Math.floor(matchTime % 60).toString().padStart(2, '0');
  const cs = Math.floor((matchTime * 100) % 100).toString().padStart(2, '0');
  $('tapeTime').textContent = `00:${mins}:${secs}.${cs}`;
  $('fpsCounter').textContent = `${Math.max(1,Math.round(fpsVal))} FPS${fpsCap>0?' · cap '+fpsCap:''}`;
  const pingEl = $('pingCounter');
  if (pingEl && !net.netReady) pingEl.textContent = `${(1000/Math.max(1,fpsVal)).toFixed(1)} ms frame · ${frameMsSmooth.toFixed(1)} ms CPU`;
  const meta = getLevelMeta(activeLocalLevelId);
  const compactCode = meta.code.length > 14 ? `${meta.code.slice(0, 11)}..` : meta.code;
  $('roleBadge').textContent = isK ? `ENTITY // ${compactCode}` : `CAM-04 // ${compactCode}`;

  const camBat = Math.max(8, Math.round(98 - matchTime * 0.085 - (me.fl ? matchTime * 0.035 : 0)));
  const batPctEl = $('batPct');
  if (batPctEl) batPctEl.textContent = `${camBat}%`;
  const batIcon = $('batIcon');
  if (batIcon) {
    const litCells = Math.max(1, Math.ceil(camBat / 25));
    const batState = camBat <= 25 ? 'crit' : camBat <= 50 ? 'warn' : '';
    const cells = batIcon.children;
    for (let i = 0; i < cells.length; i++) {
      cells[i].className = `bat-cell${i < litCells ? (batState ? ` ${batState}` : '') : ' empty'}`;
    }
  }
  const camLightSpec = $('camLightSpec');
  if (camLightSpec) camLightSpec.textContent = `TORCH: ${me.fl ? 'ON' : 'OFF'}`;

  const doneCount = map.TASKS.filter(t => t.done).length;
  const targetNeed = activeLocalLevelId === 'level0' ? NEED : 1;
  if (activeLocalLevelId === 'level0') {
    $('objText').textContent = map.exitsOpen
      ? `SAFETY EXIT OPEN! • SUBLEVEL: ${levelsClearedSet.size}/20`
      : `BREAKERS: ${doneCount}/${NEED} • SUBLEVEL: ${levelsClearedSet.size}/20`;
  } else {
    $('objText').textContent = map.exitsOpen
      ? `${compactCode}: LEVEL 0 EXIT OPEN!`
      : `${compactCode}: EXIT MACHINE ${doneCount}/1`;
  }

  // Co-op Join Teammates Sub-Level Button ("Tham gia" when a teammate entered a sub-level while local player is in Level 0)
  const canShowJoin = !isK && me.state === 'ok' && activeLocalLevelId === 'level0' && !!activeJoinTarget;
  const joinBar = $('joinLevelBar');
  if (joinBar) {
    joinBar.classList.toggle('hidden', !canShowJoin);
    if (canShowJoin) {
      $('joinLevelText').textContent = `${activeJoinTarget.byName || 'Teammates'} currently at ${activeJoinTarget.code} (${activeJoinTarget.name})`;
    }
  }
  const mobJoinEl = $('mobJoinBtn');
  if (mobJoinEl) {
    mobJoinEl.classList.toggle('hidden', !canShowJoin);
    if (canShowJoin && activeJoinTarget) {
      const sc = activeJoinTarget.code.length > 10 ? `${activeJoinTarget.code.slice(0, 9)}..` : activeJoinTarget.code;
      mobJoinEl.innerHTML = `THAM GIA<small>${esc(sc)}</small>`;
    }
  }

  $('speedText').textContent = `SPD: ${me.spd.toFixed(1)} m/s${noclipMode ? ` • [NOCLIP ${Math.round(noclipSpeed)}m/s]` : movementAssist.hopBonus > 0 ? '  [BHOP +0.45]' : ''}`;
  if (tpOpen && $('tpCurrentPos')) {
    $('tpCurrentPos').textContent = `Floor: ${meta.code} (${meta.vnName}) • X=${me.x.toFixed(1)}, Y=${(me.y || 0).toFixed(1)}, Z=${me.z.toFixed(1)}`;
  }

  // Environmental navigation in the introduction; ordinary objective/rescue guidance resumes outside it.
  const classicIntro=inClassicPresentation(map.classic,me.x,me.z);
  $('missionBox').style.display=classicIntro?'none':'';
  $('objText').style.display=classicIntro?'none':'';
  audio.updateClassicAmbience?.(activeLocalLevelId==='level0'?map.classic:null,me);
  // Clear On-Screen Mission / Objective Panel + Zone Indicator + Nearest Waypoint Distance
  const curC = Math.floor(me.x / C), curR = Math.floor(me.z / C);
  const zoneHit = map.ZONES?.find(z => curC >= z.c0 && curC <= z.c1 && curR >= z.r0 && curR <= z.r1);
  const camExpoEl = $('camExpoText');
  if (camExpoEl) {
    const gainTag = zoneHit?.type === 'blackout' || zoneHit?.type === 'mb_van_tunnel' ? 'GAIN +12dB' : 'AUTO';
    camExpoEl.textContent = `1/${fpsCap > 0 ? Math.max(15, fpsCap) : 60} • F1.8 • ${gainTag}`;
  }
  const zoneLabel = ZONE_LABELS[zoneHit?.type] || 'LEVEL 0 Labyrinth';

  if (isK) {
    const aliveS = Object.values(players).filter(p => p.role === 's' && p.state !== 'dead' && p.state !== 'escaped').length;
    $('missionBox').innerHTML = `
      <div class="mission-title"><span style="white-space:nowrap">MISSION</span><span style="text-align:right;font-size:10px">${zoneLabel}</span></div>
      <div class="mission-step ${aliveS === 0 ? 'done' : 'active'}">▸ Defeat all Survivors (Remaining: ${aliveS})</div>
      <div class="mission-step">▸ Press [E] to knock down & hang victim on hook</div>
      <div class="mission-hint">Press [Q] to reveal location (${revealCD > 0 ? `${Math.ceil(revealCD)}s` : 'READY'}) • [R] set trap</div>`;
  } else if (activeLocalLevelId === 'level37' && map.POOL_ZONES) {
    const repairDone = doneCount >= 1;
    const pumps = map.PUMPS || [];
    const pumpsDone = pumps.filter(pm => pm.done).length;
    const curZone = getPoolroomsZoneAt(me.x, me.z, map);
    let tgt = null;
    let tgtLbl = 'RETURN GATE';
    if (repairDone) {
      tgt = map.PORTALS?.[0] || map.TASKS[0];
    } else {
      let bestPD = Infinity;
      for (const pm of pumps) {
        if (pm.done) continue;
        const d = Math.hypot(pm.x - me.x, pm.z - me.z);
        if (d < bestPD) { bestPD = d; tgt = pm; tgtLbl = pm.name; }
      }
      if (!tgt) { tgt = map.TASKS[0]; tgtLbl = 'ZONE J — DRAINAGE PUMP'; }
    }
    const dist = tgt ? Math.hypot(tgt.x - me.x, tgt.z - me.z) : 0;
    const ang = tgt ? Math.atan2(-(tgt.x - me.x), -(tgt.z - me.z)) : 0;
    const rel = Math.atan2(Math.sin(ang - me.yaw), Math.cos(ang - me.yaw));
    const arrow = Math.abs(rel) < 0.55 ? '↑ STRAIGHT' : rel > 0.55 && rel < 2.4 ? '← LEFT' : rel < -0.55 && rel > -2.4 ? '→ RIGHT' : '↓ BACK';
    $('missionBox').innerHTML = `
      <div class="mission-title"><span style="white-space:nowrap">${compactCode}</span><span style="text-align:right;font-size:10px">${curZone?.name || meta.vnName}</span></div>
      <div class="mission-step ${pumpsDone >= pumps.length && pumps.length > 0 ? 'done' : 'active'}">${pumpsDone >= pumps.length && pumps.length > 0 ? '✓' : '1.'} Activate 3 Hydraulic Pumps (${pumpsDone}/${pumps.length}) — Hold [E]</div>
      <div class="mission-step ${repairDone ? 'active' : ''}">${repairDone ? '✓' : '2.'} Exit via Zone J Gate ([E])</div>
      <div class="mission-hint">${tgtLbl}: ${Math.round(dist)}m (${arrow}) • Follow the dry brick path to find the pump — no hostile entities</div>`;
  } else if (activeLocalLevelId !== 'level0') {
    const repairDone = doneCount >= 1;
    const tgt = repairDone ? (map.PORTALS?.[0] || map.TASKS[0]) : map.TASKS[0];
    const dist = tgt ? Math.hypot(tgt.x - me.x, tgt.z - me.z) : 0;
    const ang = tgt ? Math.atan2(-(tgt.x - me.x), -(tgt.z - me.z)) : 0;
    const rel = Math.atan2(Math.sin(ang - me.yaw), Math.cos(ang - me.yaw));
    const arrow = Math.abs(rel) < 0.55 ? '↑ STRAIGHT' : rel > 0.55 && rel < 2.4 ? '← LEFT' : rel < -0.55 && rel > -2.4 ? '→ RIGHT' : '↓ BACK';
    $('missionBox').innerHTML = `
      <div class="mission-title"><span style="white-space:nowrap">${compactCode}</span><span style="text-align:right;font-size:10px">${meta.vnName}</span></div>
      <div class="mission-step ${repairDone ? 'done' : 'active'}">${repairDone ? '✓' : '1.'} Repair Egress Machine (${doneCount}/1) — Hold [E]</div>
      <div class="mission-step ${repairDone ? 'active' : ''}">2. Step through Return Gate to Level 0 ([E])</div>
      <div class="mission-hint">${repairDone ? 'LEVEL 0 GATE' : 'EXIT MACHINE'}: ${Math.round(dist)}m (${arrow}) • ${meta.entity?.hint || ''}</div>`;
  } else {
    const repairDone = doneCount >= NEED;
    // Find nearest incomplete breaker box or nearest exit when unlocked
    let nearestD = Infinity, nearestAng = 0, nearestTgt = null, hintLbl = '';
    const targets = repairDone ? map.EXITS : map.TASKS.filter(t => !t.done);
    for (const tg of targets) {
      const d = Math.hypot(tg.x - me.x, tg.z - me.z);
      if (d < nearestD) { nearestD = d; nearestTgt = tg; nearestAng = Math.atan2(-(tg.x - me.x), -(tg.z - me.z)); }
    }
    const hookedMate = Object.values(players).find(p => p.role === 's' && p.id !== myId && (p.state === 'hooked' || p.state === 'down' || p.state === 'carried'));
    if (hookedMate) {
      const md = Math.hypot(hookedMate.x - me.x, hookedMate.z - me.z);
      const mAng = Math.atan2(-(hookedMate.x - me.x), -(hookedMate.z - me.z));
      const mRel = Math.atan2(Math.sin(mAng - me.yaw), Math.cos(mAng - me.yaw));
      const mArr = Math.abs(mRel) < 0.55 ? '↑ STRAIGHT' : mRel > 0.55 && mRel < 2.4 ? '← LEFT' : mRel < -0.55 && mRel > -2.4 ? '→ RIGHT' : '↓ BACK';
      const stTxt = hookedMate.state === 'hooked' ? 'HANGING' : hookedMate.state === 'carried' ? 'CAPTURED' : 'DOWNED';
      hintLbl = `RESCUE ${hookedMate.name} (${stTxt}): ${Math.round(md)}m (${mArr})`;
    } else if (nearestD < Infinity) {
      const rel = Math.atan2(Math.sin(nearestAng - me.yaw), Math.cos(nearestAng - me.yaw));
      const arrow = Math.abs(rel) < 0.55 ? '↑ STRAIGHT' : rel > 0.55 && rel < 2.4 ? '← LEFT' : rel < -0.55 && rel > -2.4 ? '→ RIGHT' : '↓ BACK';
      const tSym = !repairDone && nearestTgt?.code ? ` ${nearestTgt.code} ${nearestTgt.symbol}` : '';
      hintLbl = `${repairDone ? 'EXIT GATE' : `MACHINE ${tSym}`}: ${Math.round(nearestD)}m (${arrow})`;
    }
    $('missionBox').innerHTML = `
      <div class="mission-title"><span style="white-space:nowrap">MISSION</span><span style="text-align:right;font-size:10px">${zoneLabel}</span></div>
      <div class="mission-step ${repairDone ? 'done' : 'active'}">${repairDone ? '✓' : '1.'} Repair ${NEED} Electric Cabinet (${doneCount}/${NEED}) — Hold [E]</div>
      <div class="mission-step ${repairDone ? 'active' : ''}">2. Follow the floor arrows → North/South Gate</div>
      <div class="mission-hint" ${hookedMate ? 'style="color:#ff9c42;"' : ''}>${hintLbl || 'Follow the floor arrows to find the machine'} • [M] Change Music</div>`;
  }

  // Team list with distinct survivor colors ONLY (hide all Entity / Killer rows from POV HUD!)
  const teamHtml = Object.values(players).filter(p => p.role !== 'k').map(p => {
    const col = `#${SURV_COLORS[(p.colorIdx || 0) % SURV_COLORS.length].hex.toString(16).padStart(6, '0')}`;
    const st = p.state === 'escaped' ? 'ESCAPED'
      : p.state === 'dead' ? 'DEAD'
      : p.state === 'hooked' ? 'HOOKED'
      : p.state === 'carried' ? 'CAPTURED'
      : p.state === 'down' ? 'DOWNED'
      : p.hp === 1 ? 'HURT' : 'HEALTHY';
    return `<div class="team-row" style="border-left-color:${col};">
      <span>${esc(p.name)}</span>
      <span style="color:${p.hp === 1 || p.state === 'down' || p.state === 'hooked' || p.state === 'carried' ? '#ff7a6e' : '#e6d27a'};">${st}</span>
    </div>`;
  }).join('');
  $('teamList').innerHTML = teamHtml;

  // Vitals Box
  if (isK) {
    $('vitalsBox').innerHTML = `
      <div class="v-row"><div class="v-head"><span>Skill [Q] Reveal Position</span><span>${revealCD > 0 ? `${Math.ceil(revealCD)}s` : 'READY'}</span></div></div>
      <div class="v-row"><div class="v-head"><span>Skill [R] Place Iron Trap</span><span>${trapCD > 0 ? `${Math.ceil(trapCD)}s` : `${map.TRAPS.length}/${TRAP_MAX}`}</span></div></div>
      <div class="v-row" style="font-size:11px;color:#c8bfa0;">Left-click: Slash • [E]: Pick up / Hang hook</div>`;
    $('invBar').innerHTML = '';
  } else {
    const stamPct = Math.round((stam / SPEED.STAM_DRAIN) * 100);
    const thirstPct = Math.round((thirstT / WATER_LIFE) * 100);
    const stamLbl = stamExhausted ? `<span style="color:#ff9442;">${stamPct}% (THIRSTY - WAIT 20%)</span>` : `<span>${stamPct}%</span>`;
    const stamCol = stamExhausted ? '#ff6a38' : '#48d0f5';
    $('vitalsBox').innerHTML = `
      <div class="v-row"><div class="v-head"><span>Health (HP)</span><span style="color:${me.hp > 1 ? '#4ed884' : '#ff5648'};">${me.hp} / 2</span></div></div>
      <div class="v-row"><div class="v-head"><span>Stamina</span>${stamLbl}</div>
        <div class="bar-bg" style="position:relative;"><div class="bar-fg" style="width:${stamPct}%;background:${stamCol};"></div><div style="position:absolute;left:20%;top:0;bottom:0;width:2px;background:rgba(255,255,255,0.65);"></div></div></div>
      <div class="v-row"><div class="v-head"><span>Thirst</span><span>${thirstPct}%</span></div>
        <div class="bar-bg"><div class="bar-fg" style="width:${thirstPct}%;background:#56d892;"></div></div></div>`;

    const slots = [
      ['1', 'water', 'Happiness'],
      ['9', 'scan', 'Detector'],
      ['0', 'jelly', 'Butterfly'],
      ['4', 'ration', 'Portion'],
      ['5', 'flare', 'UV Flare']
    ];
    $('invBar').innerHTML = slots.map(([k, id, lbl], idx) => {
      const cnt = me.inv?.[id] || 0;
      return `<div class="inv-slot ${cnt <= 0 ? 'empty' : ''}" data-slot-idx="${idx}">
        <div class="k">[${k}]</div>
        <div class="cnt">${cnt}</div>
        <div>${lbl}</div>
      </div>`;
    }).join('');
  }

  $('mobSwingBtn')?.classList.toggle('hidden', !isK);
  $('mobRevealBtn')?.classList.toggle('hidden', !isK);
  $('mobTrapBtn')?.classList.toggle('hidden', !isK);
  $('mobSprintBtn')?.classList.toggle('hidden', !!isK);
  $('mobCrouchBtn')?.classList.toggle('hidden', !!isK);
  if (isK) {
    const swSub = $('mobSwingBtn')?.querySelector('small');
    if (swSub) swSub.textContent = swingCD > 0 ? `${swingCD.toFixed(1)}s` : 'Ready';
    const rvSub = $('mobRevealBtn')?.querySelector('small');
    if (rvSub) rvSub.textContent = revealCD > 0 ? `${Math.ceil(revealCD)}s` : 'Q';
    const trSub = $('mobTrapBtn')?.querySelector('small');
    if (trSub) trSub.textContent = trapCD > 0 ? `${Math.ceil(trapCD)}s` : `${map.TRAPS.length}/${TRAP_MAX}`;
  } else {
    $('mobSprintBtn')?.classList.toggle('active', mobSprintToggle);
    $('mobCrouchBtn')?.classList.toggle('active', mobCrouchToggle);
  }
}

// ---------- Visual Wall-Through Reveal / Hooked Teammate / Scan / Flare Markers ----------
function ensureBeaconCount(n) {
  while (beaconPool.length < n) {
    const mat = new THREE.MeshBasicMaterial({
      color: 0xff3628,
      wireframe: true,
      depthTest: false,
      depthWrite: false,
      fog: false,
      toneMapped: false,
      transparent: true,
      opacity: 0.94
    });
    const m = new THREE.Mesh(new THREE.OctahedronGeometry(0.32, 0), mat);
    m.renderOrder = 999;

    const silMat = new THREE.MeshBasicMaterial({
      color: 0xff8c28,
      wireframe: true,
      depthTest: false,
      depthWrite: false,
      fog: false,
      toneMapped: false,
      transparent: true,
      opacity: 0.72
    });
    const silhouette = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.28, 1.85, 8, 1, true), silMat);
    silhouette.position.y = -0.35;
    silhouette.renderOrder = 999;

    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xff8c28,
      depthTest: false,
      depthWrite: false,
      fog: false,
      toneMapped: false,
      transparent: true,
      opacity: 0.85
    });
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.56, 0.036, 6, 18), ringMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = -0.25;
    ring.renderOrder = 999;

    m.add(silhouette, ring);
    m.userData = { silhouette, ring };
    scene.add(m);
    beaconPool.push(m);
  }
}

function updateRevealMarkers(elapsed) {
  const me = players[myId];
  if (!me) return;
  const targets = [];

  if (me.role === 's') {
    // Always highlight hooked / carried / downed teammates through walls in current dimension
    for (const p of Object.values(players)) {
      if (p.role !== 's' || p.id === myId || (p.levelId || 'level0') !== activeLocalLevelId) continue;
      if (p.state === 'hooked') {
        targets.push({ x: p.x, y: 1.55, z: p.z, color: 0xff8c28, silhouette: true, pulse: true });
      } else if (p.state === 'carried') {
        targets.push({ x: p.x, y: 1.45, z: p.z, color: 0xff4c30, silhouette: true, pulse: true });
      } else if (p.state === 'down') {
        targets.push({ x: p.x, y: 0.9, z: p.z, color: 0xffe066, silhouette: true, pulse: false });
      }
    }
    // Show Entity outline during EMF Scanner OR if any Entity steps near an active UV Flare!
    for (const k of Object.values(players)) {
      if (k.role !== 'k' || (k.levelId || 'level0') !== activeLocalLevelId) continue;
      let illuminatedByFlare = false;
      if (world) {
        for (const f of world.flareMeshes) {
          if (Math.hypot(f.group.position.x - k.x, f.group.position.z - k.z) < 12) {
            illuminatedByFlare = true; break;
          }
        }
      }
      if (scanT > 0 || illuminatedByFlare) targets.push({ x: k.x, y: 1.4, z: k.z, color: 0x48d0f5, silhouette: false, pulse: false });
    }
    if (vhsRevealT > 0) {
      for (const tg of (map.exitsOpen ? (map.EXITS || map.PORTALS || []) : map.TASKS.filter(t => !t.done))) {
        targets.push({ x: tg.x, y: 1.4, z: tg.z, color: map.exitsOpen ? 0x38f288 : 0xffe066, silhouette: false, pulse: false });
      }
    }
  } else if (me.reveal || revealGlobalT > 0) {
    // Killer sees Survivor outlines during Reveal [Q] in current level
    for (const p of Object.values(players)) {
      if (p.role === 's' && p.state !== 'dead' && p.state !== 'escaped' && (p.levelId || 'level0') === activeLocalLevelId) {
        targets.push({ x: p.x, y: 1.4, z: p.z, color: 0xff3628, silhouette: true, pulse: false });
      }
    }
  }

  // Clamp far-plane projection inside camera.far so wall-through hooked highlights stay visible across the entire 471m map
  const maxProxyDist = Math.max(24, (camera.far || FAR_SURV) * 0.78);
  ensureBeaconCount(targets.length);
  for (let i = 0; i < beaconPool.length; i++) {
    const b = beaconPool[i];
    if (i < targets.length) {
      const tg = targets[i];
      const bobY = (tg.y ?? 1.4) + Math.sin(elapsed * 4) * 0.14;
      const dx = tg.x - camera.position.x;
      const dy = bobY - camera.position.y;
      const dz = tg.z - camera.position.z;
      const dist = Math.hypot(dx, dy, dz);
      let px = tg.x, py = bobY, pz = tg.z;
      let sc = 1.0;
      if (dist > maxProxyDist) {
        const s = maxProxyDist / dist;
        px = camera.position.x + dx * s;
        py = camera.position.y + dy * s;
        pz = camera.position.z + dz * s;
        sc = tg.silhouette ? 1.35 : 1.0;
      }
      b.visible = true;
      b.position.set(px, py, pz);
      b.rotation.y = elapsed * 2.5;
      b.scale.setScalar(sc);
      b.material.color.setHex(tg.color);

      const sil = b.userData?.silhouette;
      const ring = b.userData?.ring;
      if (sil) {
        sil.visible = !!tg.silhouette;
        sil.material.color.setHex(tg.color);
      }
      if (ring) {
        ring.visible = !!tg.silhouette;
        ring.material.color.setHex(tg.color);
        const pScale = tg.pulse ? (1.0 + 0.25 * Math.sin(elapsed * 5.2)) : 1.0;
        ring.scale.setScalar(pScale);
      }
    } else {
      b.visible = false;
    }
  }
}

// ---------- Input Event Listeners ----------
window.addEventListener('keydown', (e) => {
  if (e.code === 'Escape' && creditsOpen) {
    if (e.repeat) return;
    e.preventDefault();
    closeCreditsModal();
    return;
  }
  const inTextField = e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable);
  if (inMatch && !matchEnded && e.code === 'Escape' && tpOpen) {
    if (e.repeat) return;
    e.preventDefault();
    closeTpPanel(true);
    return;
  }
  if (inMatch && !matchEnded && e.code === 'F2' && !inTextField) {
    if (e.repeat) return;
    e.preventDefault();
    if (tpOpen) closeTpPanel(true);
    else openTpPanel();
    return;
  }
  if (inMatch && !matchEnded && (e.code === 'Escape' || e.code === 'KeyP')) {
    if (e.repeat) return;
    // Ignore Escape synthetic echo right after pointerlockchange unlocked into pause
    if (e.code === 'Escape' && paused && performance.now() - lastPauseToggleAt < 180) {
      e.preventDefault();
      return;
    }
    e.preventDefault();
    if (paused) closePauseMenu(true);
    else openPauseMenu();
    return;
  }

  if (inTextField) return;
  keys[e.code] = true;
  if (!inMatch || paused || tpOpen) return;
  if (e.code === DEF_KB.jump && !scState) e.preventDefault();
  if (players[myId]?.role === 's' && !e.repeat) {
    if (e.code === 'Digit2') { weaponSystem.equip('relic'); return; }
    if (e.code === 'Digit6') { weaponSystem.equip('deagle'); return; }
    if (e.code === 'Digit3') { weaponSystem.equip('butterfly'); return; }
    if (e.code === 'Digit8') { weaponSystem.equip('none'); return; }
    if (e.code === presentationSettings(fxSettings).inspectKey) { weaponSystem.inspect(true); return; }
    if (e.code === 'KeyR') { weaponSystem.reload(); return; }
  }

  if (e.code === 'KeyN') {
    if (!e.repeat) setNoclipMode(!noclipMode);
  } else if (e.code === DEF_KB.light) {
    toggleFlashlight();
  } else if (e.code === DEF_KB.use) {
    triggerLocalUseTap();
  } else if (e.code === DEF_KB.reveal) {
    triggerKillerReveal();
  } else if (e.code === DEF_KB.trap) {
    triggerKillerTrap();
  } else if (e.code === 'Digit1') useQuickItem(0);
  else if (e.code === 'Digit9') useQuickItem(1);
  else if (e.code === 'Digit0') useQuickItem(2);
  else if (e.code === 'Digit4') useQuickItem(3);
  else if (e.code === 'Digit5') useQuickItem(4);
  else if (e.code === 'KeyM') {
    const lbl = audio.nextTrack();
    pushFeed(`♪ Music: ${lbl}`);
  } else if (e.code === 'KeyG') {
    triggerJoinActiveLevel();
  }
});

function triggerLocalUseTap() {
  const me = players[myId];
  if (!me || !inMatch || paused || matchEnded) return;
  const prompt = findBestPrompt(me);
  if (prompt?.act) prompt.act();
}

function triggerKillerSwing() {
  const me = players[myId];
  if (!inMatch || paused || matchEnded || me?.role !== 'k' || swingCD > 0) return;
  swingCD = 1.75;
  localSwingT = 1.0;
  killerSlowT = 0.75;
  sendAction({ act: 'kSwing' });
}

function triggerKillerReveal() {
  const me = players[myId];
  if (!inMatch || paused || matchEnded || me?.role !== 'k' || revealCD > 0) return;
  revealCD = REVEAL_CD;
  revealGlobalT = REVEAL_T;
  sendAction({ act: 'kReveal' });
}

function triggerKillerTrap() {
  const me = players[myId];
  if (!inMatch || paused || matchEnded || me?.role !== 'k' || trapCD > 0 || !map || map.TRAPS.length >= TRAP_MAX) return;
  trapCD = TRAP_CD;
  sendAction({ act: 'kTrap' });
}

function applyCameraLookDelta(dx, dy, sensScale = 0.0021) {
  const me = players[myId];
  if (!me || !inMatch || paused || matchEnded) return;
  const sens = sensScale * mouseSens;
  const dYaw = -dx * sens;
  const dPitch = -dy * sens;
  me.yaw += dYaw;
  me.pitch = Math.max(-1.46, Math.min(1.46, me.pitch + dPitch));
  if (dx !== 0 || dy !== 0) {
    lastCamTurnAt = performance.now();
    turnYawRate = THREE.MathUtils.clamp(turnYawRate * 0.38 + dYaw * 52, -18, 18);
    turnPitchRate = THREE.MathUtils.clamp(turnPitchRate * 0.38 + dPitch * 52, -14, 14);
  }
}

window.addEventListener('keyup', (e) => {
  keys[e.code] = false;
  if (e.code === presentationSettings(fxSettings).inspectKey) weaponSystem.inspect(false);
});
window.addEventListener('blur', () => {
  weaponSystem.clearInput(); movementAssist.clearInput();
  for (const k in keys) keys[k] = false;
  resetMobileInputs();
});

// Anti-Teleport Pointer Lock Mouse Look (centered, unadjusted, warp-spike filtered)
document.addEventListener('pointerlockchange', () => {
  const locked = document.pointerLockElement === renderer.domElement;
  if (locked) {
    lockIgnoreUntil = performance.now() + 20;
    document.body.style.cursor = 'none';
    paused = false;
    pauseScr.classList.add('hidden');
  } else if (inMatch && !matchEnded && !location.hash.includes('test') && !isMobileUiActive() && !tpOpen) {
    openPauseMenu();
  } else {
    document.body.style.cursor = '';
  }
});

document.addEventListener('pointerlockerror', () => {
  if (inMatch && !paused && !matchEnded && !isMobileUiActive()) {
    document.body.style.cursor = 'none';
  }
});

window.addEventListener('contextmenu', (e) => {
  if (inMatch && !paused && !matchEnded) e.preventDefault();
});

document.addEventListener('mousemove', (e) => {
  if (!inMatch || paused || document.pointerLockElement !== renderer.domElement) return;
  if (performance.now() < lockIgnoreUntil) return;

  const mx = e.movementX || 0;
  const my = e.movementY || 0;

  // Anti-teleport guard: discard erratic OS/browser cursor recenter spikes (>360px)
  if (Math.abs(mx) > 360 || Math.abs(my) > 360) return;

  const cx = Math.max(-140, Math.min(140, mx));
  const cy = Math.max(-140, Math.min(140, my));
  applyCameraLookDelta(cx, cy, 0.0021);
});

window.addEventListener('mousedown', (e) => {
  if (!inMatch || paused || tpOpen || matchEnded || isMobileUiActive()) return;
  if (e.target && e.target.closest?.('.screen, button, select, input, a, #mobileControls, #mobLookPad, #invBar, #tpPanel, #tpHudBtn, #noclipBadge')) return;
  audio.ensureContext();
  if (document.pointerLockElement !== renderer.domElement) {
    document.body.style.cursor = 'none';
    requestLock();
    return;
  }
  if (e.button === 0) { if (players[myId]?.role === 's') weaponSystem.primary(); else triggerKillerSwing(); }
  if (e.button === 2 && weaponSystem.available()) { weaponSystem.aim = true; weaponSystem.view.animation.inspect(false); if (['INSPECTING', 'FLEX_LOOP'].includes(weaponSystem.view.animation.state)) weaponSystem.view.animation.transition('RECOVERING'); }
});
window.addEventListener('mouseup', (e) => { if (e.button === 2) weaponSystem.aim = false; });
document.addEventListener('visibilitychange', () => { if (document.hidden) { for (const k in keys) keys[k] = false; weaponSystem.clearInput(); movementAssist.clearInput(); } });

// ---------- UI Button Bindings ----------
$('soloSurvBtn').addEventListener('click', () => {
  if (warmingMatch) return;
  audio.ensureContext();
  net.startSolo($('nameInput').value, false);
  beginMatch((Date.now() % 90000) + 1000, net.roster, net.myId);
});

$('soloKillBtn').addEventListener('click', () => {
  if (warmingMatch) return;
  audio.ensureContext();
  net.startSolo($('nameInput').value, true);
  beginMatch((Date.now() % 90000) + 1000, net.roster, net.myId);
});

$('hostBtn').addEventListener('click', () => {
  audio.ensureContext();
  net.createOnlineRoom($('nameInput').value);
});

$('joinBtn').addEventListener('click', () => {
  audio.ensureContext();
  const code = $('joinCodeInput').value.trim();
  if (code) net.joinOnlineRoom(code, $('nameInput').value);
});

$('nameInput').addEventListener('change', (e) => {
  net.renameSelf(e.target.value);
});

$('copyLinkBtn').addEventListener('click', () => {
  if (!net.roomCode) return;
  const url = `${location.origin}${location.pathname}?room=${net.roomCode}`;
  const finish = (ok) => {
    pushFeed(ok ? 'Room link copied!' : `Invite link: ${url}`, ok ? '#4ed884' : '#ffe066');
    $('copyLinkBtn').textContent = ok ? 'Copied!' : 'Xem Feed Link';
    setTimeout(() => { $('copyLinkBtn').textContent = 'Copy Invite Link'; }, 1500);
  };
  if (navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(url).then(() => finish(true)).catch(() => finish(false));
  } else {
    finish(false);
  }
});

$('aiToggle').addEventListener('change', (e) => net.toggleAIEntity(e.target.checked));

$('startGameBtn').addEventListener('click', () => {
  if (warmingMatch || !net.isHost) return;
  const s = (Math.random() * 89999 + 10000) | 0;
  if (net.aiEnabled) net.toggleAIEntity(true, s);
  net.broadcast({ t: 'start', seed: s, roster: net.roster });
  beginMatch(s, net.roster, net.myId);
});

$('gfxSelect').addEventListener('change', (e) => setGraphicsPreset(e.target.value));
$('pauseGfx').addEventListener('change', (e) => setGraphicsPreset(e.target.value));
$('fpsSelect').addEventListener('change', (e) => setFpsCap(e.target.value));
$('pauseFps').addEventListener('change', (e) => setFpsCap(e.target.value));
$('aspectSelect').addEventListener('change', (e) => setAspectMode(e.target.value));
$('pauseAspect').addEventListener('change', (e) => setAspectMode(e.target.value));

const bindSens = (el) => el.addEventListener('input', (e) => {
  mouseSens = Number(e.target.value);
  localStorage.setItem('br_sens_v2', String(mouseSens));
  syncSettingsUI();
});
bindSens($('sensSlider'));
bindSens($('pauseSens'));

const bindMusic = (el) => el.addEventListener('input', (e) => {
  musicVol = Number(e.target.value);
  localStorage.setItem('br_mvol_v2', String(musicVol));
  audio.setVolumes(musicVol, sfxVol);
  syncSettingsUI();
});
bindMusic($('musicSlider'));
bindMusic($('pauseMusic'));

const bindSfx = (el) => el?.addEventListener('input', (e) => {
  sfxVol = Number(e.target.value);
  localStorage.setItem('br_svol_v2', String(sfxVol));
  audio.setVolumes(musicVol, sfxVol);
  syncSettingsUI();
});
bindSfx($('sfxSlider'));
bindSfx($('pauseSfx'));

const resetFxToPreset = () => {
  localStorage.removeItem('br_fps_preferences_v1');
  fxSettings = getPlatformDefaultFx(currentGfx);
  applyFxSettings();
};
$('lobbyResetFxBtn')?.addEventListener('click', resetFxToPreset);
$('pauseResetFxBtn')?.addEventListener('click', resetFxToPreset);

$('resumeBtn').addEventListener('click', () => closePauseMenu(true));

$('flashToggleBtn')?.addEventListener('mousedown', (e) => e.stopPropagation());
$('flashToggleBtn')?.addEventListener('click', (e) => {
  e.stopPropagation();
  if (!inMatch || paused || matchEnded) return;
  audio.ensureContext();
  toggleFlashlight();
  e.currentTarget.blur();
});

$('invBar')?.addEventListener('pointerdown', (e) => e.stopPropagation());
$('invBar')?.addEventListener('click', (e) => {
  const slot = e.target?.closest?.('[data-slot-idx]');
  if (!slot || !inMatch || paused || matchEnded) return;
  e.stopPropagation();
  audio.ensureContext();
  useQuickItem(Number(slot.dataset.slotIdx));
});

function safeSetPointerCapture(el, pointerId) {
  try {
    if (el && typeof el.setPointerCapture === 'function') el.setPointerCapture(pointerId);
  } catch {}
}

function bindMobileControls() {
  const zone = $('mobJoyZone');
  const stick = $('mobJoyStick');
  const lookPad = $('mobLookPad');

  const updateJoy = (e) => {
    if (!zone || !stick) return;
    const r = zone.getBoundingClientRect();
    const maxR = Math.max(24, r.width * 0.36);
    let dx = e.clientX - (r.left + r.width * 0.5);
    let dy = e.clientY - (r.top + r.height * 0.5);
    const dist = Math.hypot(dx, dy);
    if (dist > maxR) {
      const k = maxR / dist;
      dx *= k;
      dy *= k;
    }
    stick.style.transform = `translate(${dx.toFixed(1)}px, ${dy.toFixed(1)}px)`;
    mobJoyX = dx / maxR;
    mobJoyY = -dy / maxR;
    mobEdgeSprint = Math.hypot(mobJoyX, mobJoyY) >= 0.86;
  };

  const endJoy = (e) => {
    if (e.pointerId !== mobJoyPointerId) return;
    mobJoyPointerId = null;
    mobJoyX = 0;
    mobJoyY = 0;
    mobEdgeSprint = false;
    if (stick) stick.style.transform = 'translate(0px, 0px)';
  };

  if (zone) {
    zone.addEventListener('pointerdown', (e) => {
      if (mobJoyPointerId !== null || !inMatch || paused || matchEnded) return;
      e.preventDefault();
      e.stopPropagation();
      audio.ensureContext();
      mobJoyPointerId = e.pointerId;
      safeSetPointerCapture(zone, e.pointerId);
      updateJoy(e);
    });
    zone.addEventListener('pointermove', (e) => {
      if (e.pointerId !== mobJoyPointerId) return;
      e.preventDefault();
      updateJoy(e);
    });
    zone.addEventListener('pointerup', endJoy);
    zone.addEventListener('pointercancel', endJoy);
  }

  if (lookPad) {
    const endLook = (e) => {
      if (e.pointerId === mobLookPointerId) mobLookPointerId = null;
    };
    lookPad.addEventListener('pointerdown', (e) => {
      if (mobLookPointerId !== null || !inMatch || paused || matchEnded) return;
      e.preventDefault();
      e.stopPropagation();
      audio.ensureContext();
      mobLookPointerId = e.pointerId;
      mobLookLastX = e.clientX;
      mobLookLastY = e.clientY;
      safeSetPointerCapture(lookPad, e.pointerId);
    });
    lookPad.addEventListener('pointermove', (e) => {
      if (e.pointerId !== mobLookPointerId) return;
      e.preventDefault();
      const dx = e.clientX - mobLookLastX;
      const dy = e.clientY - mobLookLastY;
      mobLookLastX = e.clientX;
      mobLookLastY = e.clientY;
      applyCameraLookDelta(dx, dy, 0.0052);
    });
    lookPad.addEventListener('pointerup', endLook);
    lookPad.addEventListener('pointercancel', endLook);
  }

  const bindBtn = (el, onDown, onUp) => {
    if (!el) return;
    const release = (e) => {
      e.stopPropagation();
      onUp?.();
    };
    el.addEventListener('pointerdown', (e) => {
      if (!inMatch || paused || matchEnded) return;
      e.preventDefault();
      e.stopPropagation();
      audio.ensureContext();
      safeSetPointerCapture(el, e.pointerId);
      onDown();
    });
    el.addEventListener('pointerup', release);
    el.addEventListener('pointercancel', release);
  };

  bindBtn($('mobUseBtn'), () => {
    mobUseHeld = true;
    triggerLocalUseTap();
  }, () => {
    mobUseHeld = false;
  });
  bindBtn($('mobJumpBtn'), () => { mobJumpHeld = true; }, () => { mobJumpHeld = false; });
  bindBtn($('mobSprintBtn'), () => {
    mobSprintToggle = !mobSprintToggle;
    if (mobSprintToggle) mobCrouchToggle = false;
    $('mobSprintBtn')?.classList.toggle('active', mobSprintToggle);
    $('mobCrouchBtn')?.classList.toggle('active', mobCrouchToggle);
  });
  bindBtn($('mobCrouchBtn'), () => {
    mobCrouchToggle = !mobCrouchToggle;
    if (mobCrouchToggle) mobSprintToggle = false;
    $('mobCrouchBtn')?.classList.toggle('active', mobCrouchToggle);
    $('mobSprintBtn')?.classList.toggle('active', mobSprintToggle);
  });
  bindBtn($('mobFlashBtn'), () => toggleFlashlight());
  bindBtn($('mobJoinBtn'), () => triggerJoinActiveLevel());
  $('joinLevelBtn')?.addEventListener('click', (e) => {
    e.stopPropagation();
    triggerJoinActiveLevel();
  });
  bindBtn($('mobSwingBtn'), () => triggerKillerSwing());
  bindBtn($('mobRevealBtn'), () => triggerKillerReveal());
  bindBtn($('mobTrapBtn'), () => triggerKillerTrap());

  $('mobPauseBtn')?.addEventListener('click', (e) => {
    e.stopPropagation();
    if (!inMatch || matchEnded) return;
    if (paused) closePauseMenu(true);
    else openPauseMenu();
  });
  $('mobMusicBtn')?.addEventListener('click', (e) => {
    e.stopPropagation();
    audio.ensureContext();
    const lbl = audio.nextTrack();
    pushFeed(`♪ Music: ${lbl}`);
  });
  $('mobTpBtn')?.addEventListener('click', (e) => {
    e.stopPropagation();
    if (!inMatch || matchEnded) return;
    if (tpOpen) closeTpPanel(false);
    else openTpPanel();
  });
}
bindMobileControls();

// ---------- Teleport Control Panel & No-Clip UI Bindings ----------
$('tpHudBtn')?.addEventListener('click', (e) => {
  e.stopPropagation();
  if (!inMatch || matchEnded) return;
  if (tpOpen) closeTpPanel(true);
  else openTpPanel();
});
$('tpHudNcBtn')?.addEventListener('click', (e) => {
  e.stopPropagation();
  if (!inMatch || matchEnded) return;
  setNoclipMode(!noclipMode);
});
$('noclipOffBtn')?.addEventListener('click', (e) => {
  e.stopPropagation();
  setNoclipMode(false);
});
$('pauseTpBtn')?.addEventListener('click', (e) => {
  e.stopPropagation();
  openTpPanel();
});
$('lobbyCreditsBtn')?.addEventListener('click', () => openCreditsModal('overview'));
$('footerCreditsBtn')?.addEventListener('click', () => openCreditsModal('overview'));
$('pauseCreditsBtn')?.addEventListener('click', (e) => {
  e.stopPropagation();
  openCreditsModal('overview');
});
$('creditsCloseBtn')?.addEventListener('click', () => closeCreditsModal());
$('creditsModal')?.addEventListener('click', (e) => {
  if (e.target === $('creditsModal')) closeCreditsModal();
});
$('creditsTabs')?.addEventListener('click', (e) => {
  const btn = e.target?.closest?.('[data-credits-tab]');
  if (btn) switchCreditsTab(btn.dataset.creditsTab);
});
$('tpCloseBtn')?.addEventListener('click', () => closeTpPanel(true));
$('tpNoclipBtn')?.addEventListener('click', () => setNoclipMode(!noclipMode));
$('tpNoclipSpeed')?.addEventListener('input', (e) => setNoclipSpeed(e.target.value));
$('tpSearch')?.addEventListener('input', (e) => {
  tpSearchQuery = e.target.value || '';
  renderTpPanel();
});
$('tpTabs')?.addEventListener('click', (e) => {
  const btn = e.target?.closest?.('[data-tp-tab]');
  if (!btn) return;
  tpActiveTab = btn.dataset.tpTab || 'all';
  $('tpTabs').querySelectorAll('.tp-tab').forEach(b => b.classList.toggle('active', b === btn));
  renderTpPanel();
});
$('tpGoCoordBtn')?.addEventListener('click', () => {
  const me = players[myId];
  const x = parseFloat($('tpX')?.value);
  const y = parseFloat($('tpY')?.value);
  const z = parseFloat($('tpZ')?.value);
  if (!Number.isFinite(x) || !Number.isFinite(z)) {
    pushFeed('Please enter valid X and Z coordinates!', '#ff7a6e');
    return;
  }
  teleportToTarget({
    levelId: activeLocalLevelId,
    x,
    y: Number.isFinite(y) ? y : (me?.y || 0),
    z,
    rawCoords: true,
    preserveY: true,
    title: `Coordinates (${x.toFixed(1)}, ${(Number.isFinite(y) ? y : 0).toFixed(1)}, ${z.toFixed(1)})`
  });
});
$('tpList')?.addEventListener('click', (e) => {
  const row = e.target?.closest?.('[data-tp-id]');
  if (!row) return;
  const item = $('tpList')._itemsMap?.get(row.dataset.tpId);
  if (item) teleportToTarget(item);
});

const exitToLobby = () => {
  hillsAmbience?.dispose(); hillsAmbience = null;
  inMatch = false;
  paused = false;
  tpOpen = false;
  creditsOpen = false;
  matchEnded = false;
  setNoclipMode(false, true);
  $('tpPanel')?.classList.add('hidden');
  $('creditsModal')?.classList.add('hidden');
  resetMobileInputs();
  document.body.style.cursor = '';
  if (document.pointerLockElement) {
    try { document.exitPointerLock?.(); } catch {}
  }
  clearMatchObjects();
  hud.classList.add('hidden');
  pauseScr.classList.add('hidden');
  endScr.classList.add('hidden');
  lobbyScr.classList.remove('hidden');
};
$('leaveBtn').addEventListener('click', exitToLobby);
$('backLobbyBtn').addEventListener('click', exitToLobby);

window.addEventListener('resize', applyViewportLayout);

// ---------- Main Frame-Paced Render Loop ----------
let lastClock = performance.now();
let lastRender = performance.now();
let fpsSmooth = 60;
let frameMsSmooth = 16.7;
const poolEyeAdapt = { adaptedExp: 0.72 };

function animate(now) {
  window.__LAST_ANIMATE_MS = performance.now();
  requestAnimationFrame(animate);
  const frameStartMs = performance.now();

  // Respect 15 (VHS) / 24 (Cinema) / 30 / 60 / 120 / Unlimited FPS Limiter smoothly across any monitor Hz
  if (fpsCap > 0) {
    const interval = 1000 / fpsCap;
    const elapsedRender = now - lastRender;
    if (elapsedRender < interval - 1.5) return;
    lastRender = elapsedRender >= interval * 2 ? now : Math.max(now - interval * 0.45, lastRender + interval);
  } else {
    lastRender = now;
  }

  const rawDt = (now - lastClock) / 1000;
  lastClock = now;
  const dt = Math.min(0.068, Math.max(0.001, rawDt));
  // Ignore outlier >0.25s tab/teleport/warmup stalls so FPS counter never gets pinned to 1 FPS
  const paceDt = rawDt > 0.25 ? (fpsCap > 0 ? 1 / fpsCap : 1 / 60) : Math.max(0.002, rawDt);
  const instFps = Math.min(240, 1 / paceDt);
  fpsSmooth += (instFps - fpsSmooth) * 0.16;

  const elapsed = now * 0.001;
  // Scale turn-hold window cleanly by frame interval so 15/24FPS still keeps crisp turn blur & stops on halt
  const turnHoldMs = fpsCap > 0 ? Math.max(58, (1000 / fpsCap) * 1.65) : 58;
  if (now - lastCamTurnAt > turnHoldMs) {
    turnYawRate = 0;
    turnPitchRate = 0;
  } else {
    turnYawRate *= Math.exp(-13.0 * dt);
    turnPitchRate *= Math.exp(-13.0 * dt);
  }

  if (warmingMatch) return;

  if (inMatch && map && world && !fpsReviewFrozen) {
    matchTime += dt;
    updateHostSimulation(dt);
    if (!net.isHost && map.elevatorState === 'opening') {
      map.elevatorOpenProgress = Math.min(1, (map.elevatorOpenProgress || 0) + dt / 1.45);
      if (map.elevatorOpenProgress >= 1) map.elevatorState = 'open';
    }
    updateLocalPlayer(dt, elapsed);

    const me = players[myId];
    const isK = me?.role === 'k';

    updateHillsAmbience();
    // Update remote characters & lighting (isolated strictly to current visible level!)
    for (const [id, av] of Object.entries(avatars)) {
      const p = players[id];
      if (!p) continue;
      av.group.visible = p.state !== 'dead' && p.state !== 'escaped' && (p.levelId || 'level0') === activeLocalLevelId;
      if (!av.group.visible) continue;
      av.group.position.set(p.x, p.y || 0, p.z);
      av.group.rotation.y = p.yaw || 0;
      if (p.role === 'k') animateEntity(av, dt, p, elapsed);
      else animateSurvivor(av, dt, p, elapsed);
      if (p.role === 's') weaponSystem.updateRemote(id, av, p, dt);
    }

    const killers = Object.values(players).filter(p => p.role === 'k' && (p.levelId || 'level0') === activeLocalLevelId);
    updateWorldLighting(world, map, camera.position, elapsed, killers.map(k => ({ x: k.x, z: k.z })));
    if ((world?.isSubLevel || activeLocalLevelId === 'level37') && world.updateExtra) {
      world.updateExtra(elapsed, camera.position, map, scene.fog, killers[0] ? { x: killers[0].x, y: 0, z: killers[0].z } : null, camera.far);
    }

    // Update active thrown UV Flares
    for (let i = world.flareMeshes.length - 1; i >= 0; i--) {
      const fm = world.flareMeshes[i];
      fm.age += dt;
      fm.light.intensity = 3.4 + Math.sin(elapsed * 24 + i) * 0.6;
      if (fm.age >= fm.maxAge) {
        if (fm.pooled && fm.light) fm.light.intensity = 0;
        scene.remove(fm.group);
        world.flareMeshes.splice(i, 1);
      }
    }

    // Hovering 1st-Person Entity Claws
    if (isK) {
      updateFPEntityClaws(fpClaws, dt, {
        elapsed,
        turnYawRate,
        turnPitchRate,
        speedRatio: Math.min(1, (me.spd || 0) / SPEED.KILLER_BASE),
        swingT: localSwingT
      });
    }

    updateRevealMarkers(elapsed);

    // Reactive Audio & Panic Calculation across ALL active patrolling Entities
    let entityDist = 999;
    let entityVisible = false;
    let nearestEntity = null;
    if (me && killers.length && !isK) {
      for (const kr of killers) {
        const d = Math.hypot(kr.x - me.x, kr.z - me.z);
        if (d < entityDist) {
          entityDist = d;
          nearestEntity = kr;
          entityVisible = d < 32 && !blocked(me.x, me.z, kr.x, kr.z, map);
        }
      }
    } else if (me && isK) {
      for (const s of Object.values(players)) {
        if (s.role === 's' && s.state === 'ok') {
          const d = Math.hypot(s.x - me.x, s.z - me.z);
          if (d < entityDist) {
            entityDist = d;
            entityVisible = d < 24 && !blocked(me.x, me.z, s.x, s.z, map);
          }
        }
      }
    }

    if (ambushCD > 0) ambushCD = Math.max(0, ambushCD - dt);
    const closeLOSNow = !isK && !!me && me.state === 'ok' && entityVisible && entityDist < 6.8;
    if (closeLOSNow && !wasEntityCloseLOS && ambushCD <= 0 && !location.hash.includes('test')) {
      ambushCD = 22;
      triggerJumpscare({
        aiKind: nearestEntity?.aiKind || 'bacteria',
        killerName: nearestEntity?.name || 'Entity',
        ambush: true
      });
    }
    wasEntityCloseLOS = !isK && entityVisible && entityDist < 8.5;

    if (jumpscareT > 0) jumpscareT = Math.max(0, jumpscareT - dt);
    const jsNorm = jumpscareT > 0 ? (jumpscareT / Math.max(0.1, jumpscareDur)) : 0;

    const panic = isPeacefulLevel(activeLocalLevelId)?0:isK
      ? (entityVisible ? 0.35 : 0.05)
      : Math.min(1, Math.max(me.hp === 1 ? 0.35 : 0, 1 - (entityDist - 3) / 20, jsNorm * 1.15));

    // Extreme POV camera earthquake + Jumpscare trauma impact + VHS breakdown
    let frameShakeX = paused ? 0 : shakeXRate;
    let frameShakeY = paused ? 0 : shakeYRate;
    if (!isK && (entityDist < 19 || jsNorm > 0.01)) {
      const q = entityDist < 19 ? Math.pow(Math.max(0, 1 - (entityDist - 2.5) / 16.5), 1.55) : 0;
      const jsPow = Math.pow(jsNorm, 0.72);
      const posAmp = q * 0.068 + jsPow * 0.145;
      const rotAmp = q * 0.042 + jsPow * 0.14;
      const qYaw = Math.cos(elapsed * (jsPow > 0.1 ? 82.0 : 58.2));
      const qPitch = Math.sin(elapsed * (jsPow > 0.1 ? 94.0 : 67.4));
      camera.position.x += (Math.sin(elapsed * 53.7) * 0.6 + Math.cos(elapsed * 89.3) * 0.4) * posAmp;
      camera.position.y += (Math.cos(elapsed * 61.1) * 0.7 + Math.sin(elapsed * 97.9) * 0.3) * posAmp;
      camera.position.z += Math.sin(elapsed * 71.3) * posAmp * 0.5;
      camera.rotation.x += qPitch * rotAmp;
      camera.rotation.y += qYaw * rotAmp;
      camera.rotation.z += Math.sin(elapsed * 49.5) * (rotAmp * 1.25);
      if (jsPow > 0.02) {
        camera.fov = (isK ? 86 : 80) + Math.sin(jsNorm * Math.PI) * 14.0;
        camera.updateProjectionMatrix();
      }
      if (!paused) {
        frameShakeX += qYaw * (q * 3.6 + jsPow * 7.5);
        frameShakeY += qPitch * (q * 3.6 + jsPow * 7.5);
      }
    }

    fearFx.style.background = 'radial-gradient(circle, transparent 42%, rgba(160, 12, 8, 0.85) 100%)';
    fearFx.style.opacity = !isK && (panic > 0.12 || jsNorm > 0.05) ? Math.min(1, panic * 0.78 + jsNorm * 0.28).toFixed(2) : '0';

    weaponSystem.update(dt, { player: me, speed: me?.spd || 0, visible: !!me && !matchEnded && me.role === 's' && me.state === 'ok', sprint: !!me && me.movement?.key !== 'tactical' && me.spd > SPEED.SURV_WALK + .5 && !me.sliding, sliding: !!me?.sliding, breath: humanCamera.out.breath, turnX: turnYawRate, turnY: turnPitchRate, light: zoneLightSmooth, reduced: fxSettings.reducedMotion, touch: isMobileUiActive(), clean: fxSettings.cleanCamHud, profile: me?.movement });
    audio.updateListener(camera.position, me ? camYaw : 0, me ? camPitch : 0);
    const runSpeedRatio = me && !paused ? Math.min(1, (me.spd || 0) / SPEED.SURV_SPRINT) : 0;
    const stamRatio = Math.max(0, Math.min(1, stam / SPEED.STAM_DRAIN));
    const isSprintingNow = !paused && !!me && me.movement?.key !== 'tactical' && (me.spd || 0) > SPEED.SURV_WALK + 0.6;
    const lvl0Atmo = (me && activeLocalLevelId === 'level0') ? getZoneAtmosphereAt(me.x, me.z, map) : null;
    audio.updateReactiveMix(dt, {
      inGame: true,
      paused,
      entityDist,
      entityVisible,
      revealActive: revealGlobalT > 0,
      scanActive: scanT > 0,
      isKiller: isK,
      sprinting: isSprintingNow,
      speedRatio: runSpeedRatio,
      stamRatio,
      zoneLight: zoneLightSmooth,
      zoneAcoustic: lvl0Atmo?.acoustic || 'standard',
      panic
    });
    const isRepairing = !!(busyAct && busyAct.kind === 'task' && !scState);
    audio.updateRepairAudio(dt, isRepairing, isRepairing ? (busyAct.prog || 0) : 0);
    if (!paused && !matchEnded && me) {
      audio.updateCreepySounds(dt, me, map, map.elevatorState || 'open');
    }

    // Dynamic Zone Light & Scene Atmosphere Adaptation (per-scene colors, shadow intensity, fog tint & depth!)
    gfx.setCoolGrade?.(
      (me && !isK && activeLocalLevelId !== 'level0')
        ? (activeLocalLevelId === 'level37' ? 0.92 : activeLocalLevelId==='level94'?.22:.65)
        : 0.0
    );
    if (me && !isK) {
      if (activeLocalLevelId !== 'level0' && map?.levelCfg) {
        const lc = map.levelCfg;
        const br = Number(fxSettings.brightness) || 1.0;
        if (activeLocalLevelId === 'level37' && map.POOL_ZONES) {
          const pz = getPoolroomsZoneAt(me.x, me.z, map);
          const lookX = me.x - Math.sin(me.yaw || 0) * 9.5;
          const lookZ = me.z - Math.cos(me.yaw || 0) * 9.5;
          const lookPz = getPoolroomsZoneAt(lookX, lookZ, map);
          const atmLerp = 1 - Math.exp(-2.8 * dt);
          _atmoFogCol.setHex(pz.fogColor ?? lc.fogColor ?? 0xaadbe0);
          _atmoHemiSky.setHex(pz.hemiSky ?? lc.hemiSky ?? 0xdff8ff);
          _atmoHemiGnd.setHex(pz.hemiGround ?? lc.hemiGround ?? 0x3b8ea5);
          scene.fog.color.lerp(_atmoFogCol, atmLerp);
          scene.background.lerp(_atmoFogCol, atmLerp);
          scene.fog.density += ((pz.fogDensity ?? lc.fogDensity ?? 0.0020) - scene.fog.density) * atmLerp;
          hemiLight.color.lerp(_atmoHemiSky, atmLerp);
          hemiLight.groundColor.lerp(_atmoHemiGnd, atmLerp);
          hemiLight.intensity += (((pz.hemiInt ?? lc.hemiInt ?? 0.92) * 0.72) - hemiLight.intensity) * atmLerp;
          _atmoHemiSky.setHex(pz.ambColor ?? lc.ambColor ?? 0xe8ebe0);
          ambLight.color.lerp(_atmoHemiSky, atmLerp);
          ambLight.intensity += (((pz.ambInt ?? lc.ambInt ?? 0.48) * 0.50) - ambLight.intensity) * atmLerp;
          // When V7 GPU AdaptiveExposurePass runs in PostFX, hold renderer exposure neutral (1.0) so custom water/sunshaft shaders match walls without double-adapting.
          const v7EyeManaged = !!(fxSettings.postFX && fxSettings.eyeAdaptEnabled && fxSettings.eyeAdaptPreset !== 'off');
          if (v7EyeManaged) {
            renderer.toneMappingExposure = 1.0;
          } else {
            const rawTargetExp = Math.min(pz.art?1.12:0.84, Math.max(0.54, ((pz.exposure ?? 0.74) * 0.78 + (lookPz?.exposure ?? pz.exposure ?? 0.74) * 0.22) * 0.94));
            const toBright = rawTargetExp > poolEyeAdapt.adaptedExp;
            const eyeRate = 1 - Math.exp(-dt / (toBright ? 0.55 : 1.9));
            if(!world.daylightStats?.autoExposure){poolEyeAdapt.adaptedExp += (rawTargetExp - poolEyeAdapt.adaptedExp) * eyeRate;
            const clampedExp = Math.min(1.06, Math.max(0.50, poolEyeAdapt.adaptedExp * br));
            renderer.toneMappingExposure += (clampedExp - renderer.toneMappingExposure) * Math.min(1, eyeRate * 1.45);}
          }
          audio.updatePoolroomsZoneAudio?.(dt, pz, !!me.inWater, me, map);
          updatePoolroomsWorldEvents(dt, elapsed, me, map, world, audio, (cueTxt) => pushFeed(cueTxt, '#7ceeff'));
        } else {
          scene.fog.color.setHex(lc.fogColor ?? 0x161207);
          scene.background.setHex(lc.fogColor ?? 0x161207);
          scene.fog.density = lc.fogDensity ?? 0.008;
          hemiLight.color.setHex(lc.hemiSky ?? 0xd8e0e8);
          hemiLight.groundColor.setHex(lc.hemiGround ?? 0x26200d);
          hemiLight.intensity = (lc.hemiInt ?? 0.80) * (lc.isOutdoor ? 0.68 : 0.56);
          ambLight.color.setHex(lc.ambColor ?? 0x88929a);
          ambLight.intensity = (lc.ambInt ?? 0.35) * 0.45;
          const brightCap = (lc.id === 'level37' || lc.id === 'level974' || lc.id === 'level9223') ? 0.76 : (lc.isOutdoor ? 0.90 : 0.85);
          renderer.toneMappingExposure = fxSettings.postFX ? 1.0 : brightCap * br;
        }
      } else {
        const targetZL = getZoneLuminanceAt(me.x, me.z, map);
        zoneLightSmooth += (targetZL - zoneLightSmooth) * (1 - Math.exp(-2.8 * dt));
        const zl = zoneLightSmooth;
        const atmo = getZoneAtmosphereAt(me.x, me.z, map);
        const atmLerp = 1 - Math.exp(-3.4 * dt);
        _atmoFogCol.setHex(atmo.fogHex ?? 0x161207);
        _atmoHemiSky.setHex(atmo.hemiSky ?? 0xf6df82);
        _atmoHemiGnd.setHex(atmo.hemiGnd ?? 0x26200d);
        scene.fog.color.lerp(_atmoFogCol, atmLerp);
        hemiLight.color.lerp(_atmoHemiSky, atmLerp);
        hemiLight.groundColor.lerp(_atmoHemiGnd, atmLerp);
        scene.fog.density = THREE.MathUtils.lerp(0.0165, 0.0088, zl);
        const br = Number(fxSettings.brightness) || 1.0;
        hemiLight.intensity = THREE.MathUtils.lerp(0.20, 0.44, zl);
        ambLight.intensity = THREE.MathUtils.lerp(0.08, 0.15, zl);
        renderer.toneMappingExposure = fxSettings.postFX ? 1.0 : THREE.MathUtils.lerp(0.94, 1.03, zl) * br * ((atmo.exposure || 1.06) / 1.06);
      }
    } else if (isK) {
      scene.fog.density = FOG_KILLER;
      scene.fog.color.setHex(0x120b05);
      hemiLight.intensity = 0.26;
      ambLight.intensity = 0.10;
      renderer.toneMappingExposure = fxSettings.postFX ? 1.0 : 0.94 * (Number(fxSettings.brightness) || 1.0);
    }

    const speedBlurRatio = me && !paused ? Math.max(0, (me.spd - 1.2) / 3.8) : 0;
    gfx.update(dt, {
      turnYawRate,
      turnPitchRate,
      shakeXRate: frameShakeX,
      shakeYRate: frameShakeY,
      speedRatio: speedBlurRatio,
      panic,
      isKiller: isK,
      elapsed,
      nearLights: world.lightPool
    });

    updateFeedDOM(dt);
    updateHUD(elapsed, fpsSmooth);
  } else {
    // Menu calm idle sound
    scene.fog.color.setHex(0x161207);
    audio.updateReactiveMix(dt, { inGame: false });
    audio.updateRepairAudio(dt, false, 0);
  }

  gfx.setEnvironmentProfile?.(activeLocalLevelId);
  updateSceneOptics(elapsed,dt);
  gfx.render(dt);
  const workMs = performance.now() - frameStartMs;
  frameMsSmooth += (workMs - frameMsSmooth) * 0.16;
  window.__BR_PERF = {
    fps: Math.max(1, Math.round(fpsSmooth)),
    frameMs: Number(frameMsSmooth.toFixed(2)), // compatibility: CPU work only
    cpuWorkMs:Number(workMs.toFixed(3)),frameIntervalMs:Number((rawDt*1000).toFixed(3)),fpsCap,
    drawCalls: renderer.info.render.calls,
    triangles: renderer.info.render.triangles
  };
}

// ---------- Automated #test Self-Check Suite ----------
async function runSelfTests() {
  const results = [];
  const assert = (cond, name) => {
    if (!cond) throw new Error(`Self-test failed: ${name}`);
    results.push(name);
  };

  const tMap = genMap(2026);
  assert(N >= 120 && tMap.WALLS.length > 80, 'genMap_huge_124_scale_walls');
  const zoneTypeSet = new Set(tMap.ZONES.map(z => z.type));
  const requiredNewZones = [
    'async_threshold', 'suburb_pitfalls', 'red_city', 'null_kx_glitch',
    'async_archive', 'flooded_sump', 'breaker_vault', 'gravity_error',
    'ceiling_plenum', 'still_life_relay', 'fluorescent_greenhouse', 'stairwell_loop'
  ];
  assert(
    tMap.ZONES.length >= 26 && requiredNewZones.filter(z => zoneTypeSet.has(z)).length >= 10,
    'genMap_10_plus_new_backrooms_zones'
  );
  assert(tMap.WALLS.some(w => Math.min(w.x1 - w.x0, w.z1 - w.z0) >= 1.0), 'genMap_thick_block_walls');
  assert(
    tMap.TASKS.length === NTASK && tMap.TASKS.every(t => t.code && t.symbol && t.guideType) && tMap.HOOKS.length >= 12,
    'genMap_objectives_and_symbols'
  );
  const guideKindSet = new Set(tMap.GUIDE_SEGMENTS.map(g => g.guideType));
  assert(
    tMap.GUIDE_SEGMENTS.length > 60 && guideKindSet.size >= 4 && tMap.EXIT_GUIDE_SEGMENTS.length > 10 && tMap.GUIDE_MARKERS.length > 10,
    'genMap_multi_type_floor_guides_and_arrows'
  );
  assert(
    tMap.hugeChasms.length >= 2 && tMap.FLOOR_PATCHES.length > 15 && tMap.PROPS.curiosities.length > 0 &&
    tMap.PROPS.anomalies.length >= 20 && tMap.RELICS.length >= 10,
    'genMap_anomalies_and_relics'
  );
  assert(
    tMap.ENTITY_ROUTES.length >= 4 && tMap.ENTITY_ROUTES.every(r => r.spanDist >= 140 && r.wps.length >= 4),
    'genMap_distant_entity_patrol_routes'
  );
  assert(tMap.WATERS.length > 0 && tMap.JELLIES.length > 0 && tMap.RATIONS.length > 0 && tMap.FLARES.length > 0, 'genMap_backrooms_items');
  assert(
    texStore.itemWater && texStore.itemScan && texStore.itemJelly && texStore.itemRation && texStore.itemFlare &&
    texStore.poolTileTex && texStore.concreteFloorTex && texStore.aoSkirtTex &&
    texStore.guideCableTex && texStore.guideConduitTex && texStore.guideTapeTex && texStore.guideLedTex && texStore.glitchErrorTex,
    'textures_and_guides_loaded'
  );
  assert(['carpet', 'concrete', 'tile', 'metal'].includes(getSurfaceAt(tMap.SPAWN.x, tMap.SPAWN.z, tMap)), 'surface_lookup_valid');
  const zlSpawn = getZoneLuminanceAt(tMap.SPAWN.x, tMap.SPAWN.z, tMap);
  assert(Number.isFinite(zlSpawn) && zlSpawn >= 0 && zlSpawn <= 1, 'zone_luminance_valid');

  const [cx, cz] = collide(tMap.SPAWN.x, tMap.SPAWN.z, 0.36, tMap, false, 0);
  assert(!Number.isNaN(cx) && !Number.isNaN(cz), 'collide_valid');

  const ent = buildEntityAvatar();
  assert(ent && ent.jaw && ent.tendrils.length > 0 && ent.eyes.length === 2 && ent.eyeLight, 'entity_grotesque_bright_eyes_rig');
  animateEntity(ent, 0.016, { spd: 5.2, swingT: 0.5 }, 1.2);

  const surv = buildSurvivorAvatar(2);
  let survHasBoxChild = false;
  surv?.group?.traverse(n => {
    if (n.isMesh && n.geometry?.type === 'BoxGeometry') survHasBoxChild = true;
  });
  assert(
    surv && surv.group && (!surv.model || Math.abs(surv.model.rotation.y) < 1e-5) && !survHasBoxChild,
    'survivor_colored_avatar_faces_forward_without_box'
  );

  fpClaws.setVisible(true);
  updateFPEntityClaws(fpClaws, 0.016, { elapsed: 1.5, speedRatio: 0.5, swingT: 0.45 });
  assert(fpClaws.left.fingers.length === 4 && fpClaws.left.fingers[0].midGroup && fpClaws.left.pivot.position.y !== 0, 'fp_articulated_hand_overhead');
  fpClaws.setVisible(false);

  const prevGfx = currentGfx;
  const prevFpsCap = fpsCap;
  const prevAspect = aspectMode;
  const prevFx = { ...fxSettings };
  assert(
    currentGfx === 'ultra' && fpsCap === 60 && aspectMode === '4:3' && mouseSens === 1 &&
    Object.entries(PC_DEFAULT_FX).every(([key, value]) => fxSettings[key] === value),
    'desktop_defaults_match_found_vhs_profile'
  );

  for (const k of ['mobile', 'low', 'med', 'high', 'ultra']) {
    setGraphicsPreset(k);
    assert(scene.fog.density === FOG_SURV || scene.fog.density === FOG_KILLER, `preset_parity_${k}`);
  }
  setGraphicsPreset('mobile');
  assert(
    gfx.mblurPass === null && gfx.rtShadowPass === null && !fxSettings.shadows &&
    !fxSettings.cleanCamHud && fxSettings.footageFilterMode === 'off' &&
    fxSettings.bloom === 0.90 && fxSettings.brightness === 1.10 &&
    isMobileUiActive() && hud.classList.contains('mobile-ui'),
    'mobile_preset_lightweight_and_touch_ui'
  );
  setGraphicsPreset('low');
  assert(fxSettings.rtShadow === 0 && gfx.rtShadowPass === null, 'rt_shadow_off_low');
  setGraphicsPreset('med');
  assert(fxSettings.rtShadow === 0 && gfx.rtShadowPass === null, 'rt_shadow_off_med');
  setGraphicsPreset('high');
  assert(gfx.rtShadowPass !== null && gfx.rtShadow.uniforms.get('uStrength').value >= 1.0, 'rt_shadow_on_high');
  setGraphicsPreset('ultra');
  assert(gfx.rtShadowPass !== null && gfx.rtShadow.uniforms.get('uStrength').value >= 1.5, 'rt_shadow_on_ultra');
  assert(gfx.mblurPass !== null && gfx.savePass !== null && gfx.crtPass !== null, 'multipass_motion_blur_active');
  assert(gfx.motionBlur.uniforms.get('uDofAmount').value > 0.5, 'dof_blur_enabled');
  assert(
    document.querySelectorAll('#lobbyFxMount [data-fx-key]').length === FX_CONTROLS.length &&
    document.querySelectorAll('#pauseFxMount [data-fx-key]').length === FX_CONTROLS.length,
    'fx_settings_tables_mounted'
  );
  setGraphicsPreset(prevGfx, false);
  fxSettings = prevFx;
  applyFxSettings();

  setFpsCap(24);
  assert(fpsCap === 24 && $('fpsSelect').value === '24' && $('pauseFps').value === '24', 'cinema_24fps_mode');
  setFpsCap(prevFpsCap);

  setAspectMode('16:9');
  assert(Math.abs(camera.aspect - 16 / 9) < 0.03 && !hud.classList.contains('aspect-43'), 'aspect_169_mode');
  setAspectMode('4:3');
  assert(Math.abs(camera.aspect - 4 / 3) < 0.03 && hud.classList.contains('aspect-43'), 'aspect_43_mode');
  setAspectMode(prevAspect);

  // Spin up brief solo test match then verify multi-entity + task persistence + stamina 20% exhaustion lock + multi-pass rendering
  net.startSolo('AutoTester', false);
  await beginMatch(1337, net.roster, net.myId);
  assert(players[myId] && world && aiControllers.length >= 4, 'solo_match_multi_entity_init');
  const aiFarStayPatrol = aiControllers.every(ctrl => {
    const ap = players[ctrl.id];
    const dToMe = Math.hypot(ap.x - players[myId].x, ap.z - players[myId].z);
    if (dToMe > 30) {
      ctrl.update(0.05, ap, players, map, {});
      return ctrl.state === 'PATROL';
    }
    return true;
  });
  assert(aiFarStayPatrol, 'ai_entities_not_omniscient_when_far');

  // Test 1: Machine repair progress persists strictly when player runs away from monster
  const t0 = map.TASKS[0];
  const savedMeX = players[myId].x, savedMeZ = players[myId].z;
  players[myId].x = t0.x + 0.8; players[myId].z = t0.z; players[myId].spd = 0;
  keys[DEF_KB.use] = true;
  updateInteractions(1.8, players[myId]); // ~10% progress
  updateInteractions(1.8, players[myId]); // ~20% progress
  const pctAfterWork = t0.p;
  keys[DEF_KB.use] = false;
  players[myId].spd = 7.4; // Sprint away while chased!
  updateInteractions(0.5, players[myId]);
  assert(pctAfterWork > 0.15 && t0.p >= pctAfterWork - 0.001, 'task_repair_progress_persists_when_chased');
  t0.p = 0; players[myId].x = savedMeX; players[myId].z = savedMeZ; players[myId].spd = 0;

  // Test 2: Stamina hitting 0 forces walk speed and locks sprinting until >= 20% recovered
  stam = 0.01;
  stamExhausted = false;
  keys[DEF_KB.fwd] = true;
  keys[DEF_KB.sprint] = true;
  updateLocalPlayer(0.05, 0.2);
  const lockedRightAtZero = stamExhausted === true;
  stam = SPEED.STAM_DRAIN * 0.10; // only 10% recovered (<20%) -> MUST stay locked!
  updateLocalPlayer(0.05, 0.25);
  const stillLockedAt10Pct = stamExhausted === true && hVelX * hVelX + hVelZ * hVelZ <= (SPEED.SURV_WALK + 0.8) ** 2;
  stam = SPEED.STAM_DRAIN * 0.25; // >= 20% recovered -> MUST unlock sprint!
  updateLocalPlayer(0.05, 0.30);
  const unlockedAt25Pct = stamExhausted === false;
  keys[DEF_KB.fwd] = false;
  keys[DEF_KB.sprint] = false;
  stam = SPEED.STAM_DRAIN; stamExhausted = false;
  assert(lockedRightAtZero && stillLockedAt10Pct && unlockedAt25Pct, 'stamina_exhaustion_locks_until_20_percent');
  openPauseMenu();
  assert(paused && !pauseScr.classList.contains('hidden'), 'pause_menu_opens');
  closePauseMenu(false);
  assert(!paused && pauseScr.classList.contains('hidden'), 'pause_menu_closes');
  updateHUD(0.1, 60);
  assert(document.getElementById('missionBox').textContent.includes('MISSION'), 'mission_box_visible');
  assert(typeof audio._startAtmosphereLoop === 'function' && typeof audio._playBreath === 'function', 'atmosphere_and_breathing_audio_ready');
  assert(!world.skirtInst || !world.skirtInst.visible, 'rt_shadow_replaces_2d_skirt');
  const prevY = players[myId].yaw;
  turnYawRate = 0; turnPitchRate = 0;
  players[myId].yaw = prevY + 0.30;
  updateLocalPlayer(0.016, 1.1);
  assert(
    Math.abs((prevY + 0.30) - camYaw) > 0.20 &&
    Math.abs((prevY + 0.30) - flashYaw) > Math.abs((prevY + 0.30) - camYaw) &&
    turnYawRate === 0,
    'smooth_camera_curve_and_flashlight_lag'
  );
  players[myId].yaw = prevY; camYaw = prevY; flashYaw = prevY;
  gfx.render(0.016);
  camera.rotation.y += 0.14;
  camera.position.x += 0.15;
  gfx.update(0.016, { turnYawRate: 0, turnPitchRate: 0, shakeXRate: 0.4, shakeYRate: 2.6, speedRatio: 1.0, panic: 0.1, isKiller: false, elapsed: 0.8, nearLights: world.lightPool });
  const shakeVelY = gfx.motionBlur.uniforms.get('uShakeVelocity').value.y;
  assert(
    gfx.motionBlur.uniforms.get('uShakeMix').value > 0.5 &&
    gfx.motionBlur.uniforms.get('uTurnMix').value === 0 &&
    shakeVelY > 0 && shakeVelY < 0.022,
    'running_shake_motion_blur_active'
  );
  resetRunShakeState();
  smoothMoveMix = 1; smoothSprintMix = 1;
  const runSamples = [];
  for (let rsIdx = 0; rsIdx < 10; rsIdx++) {
    triggerRunStepShake(rsIdx % 2 === 0 ? 1 : -1, true, false, false);
    updateRunCameraShake(0.05, false, 1.0);
    runSamples.push({ x: runShakeOut.x, y: runShakeOut.y, yaw: runShakeOut.yaw, pitch: runShakeOut.pitch });
  }
  const spanX = Math.max(...runSamples.map(s => s.x)) - Math.min(...runSamples.map(s => s.x));
  const spanY = Math.max(...runSamples.map(s => s.y)) - Math.min(...runSamples.map(s => s.y));
  const spanYaw = Math.max(...runSamples.map(s => s.yaw)) - Math.min(...runSamples.map(s => s.yaw));
  const spanPitch = Math.max(...runSamples.map(s => s.pitch)) - Math.min(...runSamples.map(s => s.pitch));
  assert(
    spanX > 0.005 && spanY > 0.005 && spanYaw > 0.003 && spanPitch > 0.003,
    'organic_random_running_shake_multiaxis'
  );
  smoothMoveMix = 0; smoothSprintMix = 0;
  resetRunShakeState();
  gfx.update(0.016, { turnYawRate: -16.0, turnPitchRate: 0.4, speedRatio: 0.9, panic: 0.2, isKiller: false, elapsed: 1.0, nearLights: world.lightPool });
  gfx.update(0.016, { turnYawRate: -16.0, turnPitchRate: 0.4, speedRatio: 0.9, panic: 0.2, isKiller: false, elapsed: 1.02, nearLights: world.lightPool });
  gfx.render(0.016);
  assert(
    gfx.motionBlur.uniforms.get('uVelocity').value.length() > 0.16 &&
    Number(FX_CONTROLS.find(c => c.key === 'motionBlur')?.max || 0) >= 3.0 &&
    gfx.motionBlur.uniforms.get('uShutterScale').value >= 0.55 &&
    gfx.motionBlur.uniforms.get('uHasHistory').value === 1.0 &&
    Math.abs(gfx.motionBlur.uniforms.get('uReprojMatrix').value.elements[12]) > 0.001 &&
    (gfx.composer.passes.indexOf(gfx.bloomPass) < 0 || gfx.composer.passes.indexOf(gfx.mblurPass) < gfx.composer.passes.indexOf(gfx.bloomPass)),
    'motion_blur_raised_ceiling'
  );
  turnYawRate = 0; turnPitchRate = 0;
  gfx.update(0.016, { turnYawRate: 0, turnPitchRate: 0, shakeXRate: 0, shakeYRate: 0, speedRatio: 0, panic: 0, isKiller: false, elapsed: 1.05, nearLights: world.lightPool });
  gfx.resetMotionHistory();
  assert(
    gfx.crtGrade.uniforms.get('uCrtFar').value > 50 && gfx.crtGrade.uniforms.get('uCrtNear').value <= 0.06,
    'close_object_clarity_uniforms'
  );
  const flBtn = $('flashToggleBtn');
  const flBefore = players[myId].fl;
  flBtn.click();
  assert(players[myId].fl === !flBefore && !flBtn.classList.contains('hidden'), 'hud_flashlight_toggle_button');
  flBtn.click();

  // Verify 15 FPS option, Entity hidden from POV HUD, HUD Bloom, Stronger Vignette, 13 Music Tracks, High-Detail Textures & FF1/FF2 Rooms
  updateHUD(players[myId]);
  assert(
    FPS_CAPS.includes(15) &&
    !!$('fpsSelect')?.querySelector('option[value="15"]') &&
    !!$('pauseFps')?.querySelector('option[value="15"]'),
    'fps_15_option_supported'
  );
  assert(
    !$('teamList').innerHTML.includes('THE ENTITY') &&
    $('teamList').children.length >= 1,
    'pov_hud_hides_entities'
  );
  assert(
    getComputedStyle(hud).textShadow !== 'none',
    'hud_bloom_styled'
  );
  assert(
    fxSettings.vignette >= 1.25 && gfx.vignette.darkness >= 0.88,
    'stronger_vignette_active'
  );
  assert(
    Object.keys(MUSIC_TRACKS).length >= 13 && AMBIENT_TRACK_KEYS.length >= 10,
    'expanded_backrooms_music_tracks'
  );
  assert(
    map.ZONES.some(z => z.type.startsWith('ff1_')) &&
    map.ZONES.some(z => z.type.startsWith('ff2_')) &&
    map.PROPS.anomalies.some(a => a.kind === 'ff1_wall_ladder_hatch') &&
    map.PROPS.anomalies.some(a => a.kind === 'ff1_dont_move_wall') &&
    map.PROPS.anomalies.some(a => a.kind === 'ff2_crashed_sedan') &&
    map.PROPS.anomalies.some(a => a.kind === 'ff2_crt_tv_plants'),
    'found_footage_1_and_2_zones_and_models'
  );
  assert(
    !!texStore.hardwoodFloorTex &&
    !!texStore.whitePlasterTex &&
    !!texStore.dontMoveTex &&
    !!texStore.keepClearTex &&
    texStore.wallMap?.image?.width === 1024,
    'high_detail_textures_loaded'
  );
  assert(
    SPEED.SURV_WALK < 4.0 && SPEED.SURV_SPRINT === 7.4,
    'reduced_walk_kept_sprint'
  );
  assert(
    getComputedStyle(hud).transform === 'none',
    'hud_fixed_non_shaking'
  );
  assert(
    ['flooded_yellow_hall', 'mb_courtyard', 'mb_mall_atrium', 'mb_red_skybridge', 'mb_brick_alcove_hall',
     'mb_bicycle_tripod', 'mb_library_fan_hall', 'mb_unrealized_mural', 'mb_diner_fridge', 'mb_van_tunnel',
     'mb_grey_basement', 'mb_cctv_cove', 'mb_dining_blue_drapes', 'mb_gold_tile_blood', 'mb_floating_wall_glitch'
    ].every(zt => map.ZONES.some(z => z.type === zt)),
    'all_29_scenes_recreated_zones'
  );
  assert(
    Boolean(texStore.unrealizedMuralTex && texStore.creamTileTex && texStore.brickWallTex && texStore.greyDrywallTex && texStore.darkFloodWaterTex),
    'all_29_scene_textures_loaded'
  );

  // Test Realistic Clean Camcorder HUD mode (default ON on PC Ultra; hides gameplay UI, keeps viewfinder frame, camera stats & battery)
  const savedCleanCam = fxSettings.cleanCamHud;
  fxSettings.cleanCamHud = true;
  applyFxSettings();
  updateHUD(0.1, fpsCap || 60);
  assert(
    hud.classList.contains('clean-cam') &&
    getComputedStyle($('missionBox')).display === 'none' &&
    getComputedStyle($('vitalsBox')).display === 'none' &&
    getComputedStyle($('invBar')).display === 'none' &&
    getComputedStyle($('batIcon')).display !== 'none' &&
    getComputedStyle(hud.querySelector('.vf-frame')).display !== 'none' &&
    getComputedStyle($('camSpecsTR')).display !== 'none',
    'clean_cam_hud_hides_ui_keeps_border_stats_battery'
  );
  fxSettings.cleanCamHud = false;
  applyFxSettings();
  assert(
    !hud.classList.contains('clean-cam') &&
    getComputedStyle($('vitalsBox')).display !== 'none' &&
    getComputedStyle($('invBar')).display !== 'none' &&
    (inClassicPresentation(map.classic, players[myId].x, players[myId].z) || getComputedStyle($('missionBox')).display !== 'none'),
    'clean_cam_hud_can_disable_cleanly'
  );

  // Test multi-layer Low-Quality Found-Footage / Stream / VOD filter presets (PC Ultra defaults to Soft Upscale / Dreamcam 100%)
  const savedFilterMode = fxSettings.footageFilterMode;
  const savedFilterStrength = fxSettings.footageFilterStrength;
  const modeSelects = document.querySelectorAll('select[data-fx-key="footageFilterMode"]');
  const softnessSliders = document.querySelectorAll('input[data-fx-key="upscaleSoftness"]');
  const halationSliders = document.querySelectorAll('input[data-fx-key="halation"]');
  assert(
    modeSelects.length === 2 &&
    softnessSliders.length === 2 &&
    halationSliders.length === 2 &&
    savedFilterMode === 'soft_dreamcam' && Math.abs(savedFilterStrength - 0.95) < 0.01 &&
    Array.from(modeSelects).every(el => !!el.querySelector('option[value="hybrid_all"]') && !!el.querySelector('option[value="soft_dreamcam"]')),
    'footage_filter_defaults_and_ui_mounted'
  );
  for (const mode of ['clean_low', 'found_vhs', 'vod_stream', 'hybrid_all', 'soft_dreamcam']) {
    fxSettings.footageFilterMode = mode;
    fxSettings.footageFilterStrength = 1.0;
    applyFxSettings();
    gfx.render(0.016);
    gfx.render(0.016);
    assert(
      !!gfx.savePass &&
      !!gfx.mblurPass &&
      gfx.motionBlur.uniforms.get('uTaaMix').value > 0.15 &&
      gfx.motionBlur.uniforms.get('uSoftDefocus').value > 0.15 &&
      gfx.crtGrade.uniforms.get('uDisableSharpen').value === 1.0 &&
      gfx.crtGrade.uniforms.get('uSoftUpscale').value > 0.5,
      `footage_preset_${mode}_pipeline_active`
    );
    if (mode === 'vod_stream') {
      assert(
        gfx.crtGrade.uniforms.get('uCompressAmt').value >= 0.9 &&
        gfx.crtGrade.uniforms.get('uSubResH').value <= 500 &&
        gfx.bloom.luminanceMaterial.threshold <= 0.35 &&
        Array.from(modeSelects).every(el => el.value === 'vod_stream'),
        'footage_vod_stream_compression_bloom_synced'
      );
    }
    if (mode === 'hybrid_all') {
      assert(
        gfx.motionBlur.uniforms.get('uTaaMix').value >= 0.35 &&
        gfx.motionBlur.uniforms.get('uSoftDefocus').value >= 0.28 &&
        gfx.crtGrade.uniforms.get('uScanlineAmount').value > 0.05 &&
        gfx.crtGrade.uniforms.get('uGrainAmount').value >= 0.40 &&
        gfx.crtGrade.uniforms.get('uAutoExpAmt').value >= 0.40 &&
        gfx.crtGrade.uniforms.get('uSensorNoise').value >= 0.50 &&
        gfx.crtGrade.uniforms.get('uCaBoost').value >= 0.40 &&
        gfx.crtGrade.uniforms.get('uCompressAmt').value >= 0.9 &&
        gfx.crtGrade.uniforms.get('uSubResH').value <= 500 &&
        gfx.bloom.luminanceMaterial.threshold <= 0.35 &&
        Array.from(modeSelects).every(el => el.value === 'hybrid_all'),
        'footage_preset_4_hybrid_combines_123'
      );
    }
    if (mode === 'soft_dreamcam') {
      assert(
        gfx.crtGrade.uniforms.get('uBicubicMode').value > 0.9 &&
        gfx.crtGrade.uniforms.get('uHalationAmt').value > 0.1 &&
        gfx.crtGrade.uniforms.get('uChromaSoftness').value > 0.1 &&
        gfx.crtGrade.uniforms.get('uCompressAmt').value < 0.2 &&
        gfx.motionBlur.uniforms.get('uEdgeAa').value > 0.5 &&
        gfx.motionBlur.uniforms.get('uLensSoftness').value > 0.4 &&
        gfx.motionBlur.uniforms.get('uTemporalMix').value === 0 &&
        Array.from(modeSelects).every(el => el.value === 'soft_dreamcam'),
        'footage_preset_5_soft_dreamcam_active'
      );
    }
  }

  // Lens curvature must remain curved (never flattened out) when footage/stream filters are enabled
  const savedLensCurve = fxSettings.lensCurve;
  fxSettings.lensCurve = 3.0;
  applyFxSettings();
  const extremeLensVal = gfx.crtGrade.uniforms.get('uLensCurve').value;
  fxSettings.lensCurve = 1.5;
  fxSettings.footageFilterMode = 'vod_stream';
  applyFxSettings();
  const vodLensVal = gfx.crtGrade.uniforms.get('uLensCurve').value;
  fxSettings.footageFilterMode = 'hybrid_all';
  applyFxSettings();
  const hybLensVal = gfx.crtGrade.uniforms.get('uLensCurve').value;
  fxSettings.lensCurve = 0;
  applyFxSettings();
  const flatBaseMinLensVal = gfx.crtGrade.uniforms.get('uLensCurve').value;
  assert(
    Number(FX_CONTROLS.find(c => c.key === 'lensCurve')?.max || 0) >= 3.0 &&
    Math.abs(extremeLensVal - 3.0) < 0.01 &&
    vodLensVal >= 1.5 && hybLensVal >= 1.5 && flatBaseMinLensVal >= 0.45,
    'footage_preset_preserves_lens_curve'
  );
  fxSettings.lensCurve = savedLensCurve;
  fxSettings.footageFilterMode = 'off';
  fxSettings.footageFilterStrength = 1.0;
  applyFxSettings();
  assert(
    gfx.crtGrade.uniforms.get('uCompressAmt').value === 0 &&
    gfx.crtGrade.uniforms.get('uDisableSharpen').value === 0 &&
    gfx.motionBlur.uniforms.get('uTaaMix').value === 0,
    'footage_filter_restored_off_cleanly'
  );
  fxSettings.footageFilterMode = savedFilterMode;
  fxSettings.footageFilterStrength = savedFilterStrength;
  fxSettings.cleanCamHud = savedCleanCam;
  applyFxSettings();

  // Test standalone Anti-Aliasing modes (Off, FXAA Performance, SMAA Quality, Hardware MSAA) across Footage modes
  {
    const savedAaMode = fxSettings.aaMode;
    const aaSelects = document.querySelectorAll('select[data-fx-key="aaMode"]');
    assert(
      aaSelects.length === 2 &&
      savedAaMode === 'msaa' &&
      Array.from(aaSelects).every(el =>
        ['off', 'fxaa', 'smaa', 'msaa'].every(v => !!el.querySelector(`option[value="${v}"]`))
      ),
      'aa_mode_ui_and_default_smaa_mounted'
    );
    fxSettings.footageFilterMode = 'soft_dreamcam';
    fxSettings.footageFilterStrength = 1.0;

    fxSettings.aaMode = 'smaa';
    applyFxSettings();
    gfx.render(0.016);
    assert(
      gfx.activeAaMode === 'smaa' &&
      gfx.aaPass !== null &&
      gfx.aaPass.effects.includes(gfx.smaa) &&
      gfx.motionBlur.uniforms.get('uExternalAa').value === 1.0,
      'aa_smaa_pipeline_active_with_dreamcam'
    );

    fxSettings.aaMode = 'fxaa';
    applyFxSettings();
    gfx.render(0.016);
    assert(
      gfx.activeAaMode === 'fxaa' &&
      gfx.aaPass !== null &&
      gfx.aaPass.effects.includes(gfx.fxaa) &&
      gfx.composer.multisampling === 0,
      'aa_fxaa_pipeline_active'
    );

    fxSettings.aaMode = 'msaa';
    applyFxSettings();
    gfx.render(0.016);
    const hwCap = Math.min(4, renderer.capabilities?.maxSamples || 0);
    assert(
      hwCap >= 2
        ? (gfx.activeAaMode === 'msaa' && gfx.composer.multisampling === hwCap && gfx.aaPass === null)
        : (gfx.activeAaMode === 'smaa' && gfx.aaPass !== null),
      'aa_msaa_or_smaa_fallback_active'
    );

    fxSettings.aaMode = 'off';
    applyFxSettings();
    gfx.render(0.016);
    assert(
      gfx.activeAaMode === 'off' &&
      gfx.aaPass === null &&
      gfx.composer.multisampling === 0 &&
      gfx.motionBlur.uniforms.get('uExternalAa').value === 0.0,
      'aa_disabled_cleanly'
    );

    fxSettings.aaMode = savedAaMode;
    fxSettings.footageFilterMode = savedFilterMode;
    fxSettings.footageFilterStrength = savedFilterStrength;
    applyFxSettings();
  }

  // Test standalone always-on Basic Grain slider independent of bright-light Micro-Grain & Bloom
  {
    const savedBaseGrain = fxSettings.baseGrain;
    const savedHiGrain = fxSettings.grain;
    const savedModeBg = fxSettings.footageFilterMode;
    const baseGrainSliders = document.querySelectorAll('input[data-fx-key="baseGrain"]');
    assert(
      baseGrainSliders.length === 2 &&
      Math.abs(savedBaseGrain - 0.25) < 0.01 &&
      Array.from(baseGrainSliders).every(el => Number(el.min) === 0 && Number(el.max) >= 2.0) &&
      Math.abs(gfx.crtGrade.uniforms.get('uBaseGrain').value - 0.25) < 0.01,
      'base_grain_ui_and_default_mounted'
    );
    fxSettings.footageFilterMode = 'off';
    fxSettings.grain = 0;
    fxSettings.baseGrain = 1.6;
    applyFxSettings();
    gfx.render(0.016);
    assert(
      Math.abs(gfx.crtGrade.uniforms.get('uBaseGrain').value - 1.6) < 0.01 &&
      gfx.crtGrade.uniforms.get('uGrainAmount').value === 0,
      'base_grain_independent_of_highlight_grain'
    );
    fxSettings.baseGrain = 0;
    applyFxSettings();
    gfx.render(0.016);
    assert(gfx.crtGrade.uniforms.get('uBaseGrain').value === 0, 'base_grain_zero_disables_cleanly');
    fxSettings.baseGrain = savedBaseGrain;
    fxSettings.grain = savedHiGrain;
    fxSettings.footageFilterMode = savedModeBg;
    applyFxSettings();
  }

  // Test Graphics System V7: Eye Adaptation GPU Pass, Extended 400%/300%/250% Footage Controls, Clarity, Render Distance
  {
    const snap = { ...fxSettings };
    const passIdx = gfx.composer?.passes?.indexOf(gfx.exposurePass) ?? -1;
    const bloomIdx = gfx.composer?.passes?.indexOf(gfx.bloomPass) ?? -1;
    assert(
      passIdx >= 1 && (bloomIdx < 0 || passIdx < bloomIdx) &&
      document.querySelectorAll('#pauseFxMount .fx-group-head, #pauseFxMount .fps-settings-details').length === FX_GROUPS.length &&
      gfx.exposurePass._adaptMat.uniforms.uBrightTau.value < gfx.exposurePass._adaptMat.uniforms.uDarkTau.value,
      'v7_eye_adaptation_gpu_pass_and_presets'
    );

    fxSettings.footageFilterMode = 'hybrid_all';
    fxSettings.footageFilterStrength = 4.0;
    fxSettings.upscaleSoftness = 3.0;
    fxSettings.halation = 2.5;
    fxSettings.clarity = 1.0;
    applyFxSettings();
    gfx.render(0.016);
    const crtU = gfx.crtGrade.uniforms;
    assert(
      crtU.get('uCompressAmt').value > 1.8 &&
      crtU.get('uLensSoftness').value > 1.8 &&
      crtU.get('uHalationAmt').value > 1.8 &&
      crtU.get('uClarity').value === 1.0 &&
      Number.isFinite(crtU.get('uSubResH').value),
      'v7_extended_footage_400_300_250_limits_and_clarity'
    );

    fxSettings.clarity = -1.0;
    applyFxSettings();
    assert(crtU.get('uClarity').value === -1.0, 'v7_clarity_negative_soft_mode');

    fxSettings.renderDistance = 50;
    applyFxSettings();
    const vis50 = world.streamingStats?.visibleChunks ?? 0;
    const far50 = camera.far;
    fxSettings.renderDistance = 400;
    applyFxSettings();
    const vis400 = world.streamingStats?.visibleChunks ?? 0;
    const far400 = camera.far;
    assert(
      far50 === 50 && far400 === 400 && vis50 < vis400,
      'v7_render_distance_changes_far_plane_and_visible_chunks'
    );

    Object.assign(fxSettings, snap);
    applyFxSettings();
  }

  // Color grading controls: Contrast, Gamma, Hue, Saturation (tighter, subtle ranges; Ultra defaults match PC screenshot)
  const savedColorCon = fxSettings.contrast;
  const savedColorGam = fxSettings.gamma;
  const savedColorHue = fxSettings.hue;
  const savedColorSat = fxSettings.saturation;
  const hueInput = document.querySelector('#pauseFxMount input[data-fx-key="hue"]');
  const satInput = document.querySelector('#pauseFxMount input[data-fx-key="saturation"]');
  const conInput = document.querySelector('#pauseFxMount input[data-fx-key="contrast"]');
  assert(
    ['contrast', 'gamma', 'hue', 'saturation'].every(k =>
      !!document.querySelector(`#lobbyFxMount [data-fx-key="${k}"]`) &&
      !!document.querySelector(`#pauseFxMount [data-fx-key="${k}"]`)
    ) &&
    Number(conInput?.min) >= 0.75 && Number(conInput?.max) <= 1.30 &&
    Number(hueInput?.min) >= -45 && Number(hueInput?.max) <= 45 &&
    Number(satInput?.min) >= 0.5 && Number(satInput?.max) <= 1.4 &&
    Math.abs(gfx.crtGrade.uniforms.get('uContrast').value - 1.00) < 0.01 &&
    Math.abs(gfx.crtGrade.uniforms.get('uGamma').value - 1.04) < 0.01 &&
    Math.abs(gfx.crtGrade.uniforms.get('uHue').value) < 1e-5 &&
    Math.abs(gfx.crtGrade.uniforms.get('uSaturation').value - 1.17) < 0.01,
    'color_settings_defaults_and_ui_mounted'
  );
  fxSettings.contrast = 1.18;
  fxSettings.gamma = 0.88;
  fxSettings.hue = 24;
  fxSettings.saturation = 1.22;
  applyFxSettings();
  assert(
    Math.abs(gfx.crtGrade.uniforms.get('uContrast').value - 1.18) < 0.01 &&
    Math.abs(gfx.crtGrade.uniforms.get('uGamma').value - 0.88) < 0.01 &&
    Math.abs(gfx.crtGrade.uniforms.get('uHue').value - THREE.MathUtils.degToRad(24)) < 0.02 &&
    Math.abs(gfx.crtGrade.uniforms.get('uSaturation').value - 1.22) < 0.01,
    'color_settings_contrast_gamma_hue_saturation'
  );
  fxSettings.contrast = savedColorCon;
  fxSettings.gamma = savedColorGam;
  fxSettings.hue = savedColorHue;
  fxSettings.saturation = savedColorSat;
  applyFxSettings();

  // Toggle for horizontal CRT / VHS cut lines (turns off scanlines & tracking tears while keeping lens curve & CA)
  assert(
    !!document.querySelector('#lobbyFxMount input[data-fx-key="crtScanlines"]') &&
    !!document.querySelector('#pauseFxMount input[data-fx-key="crtScanlines"]') &&
    fxSettings.crtScanlines === true &&
    gfx.crtGrade.uniforms.get('uScanlineMask').value === 1.0,
    'crt_horizontal_scanlines_toggle_mounted'
  );
  fxSettings.crtScanlines = false;
  applyFxSettings();
  assert(
    gfx.crtGrade.uniforms.get('uScanlineMask').value === 0.0 &&
    hud.classList.contains('no-scanlines') &&
    gfx.crtGrade.uniforms.get('uLensCurve').value >= 1.5,
    'crt_horizontal_scanlines_can_disable_cleanly'
  );
  fxSettings.crtScanlines = true;
  applyFxSettings();

  // Raised Bloom ceiling (up to 350% with wider halo radius above default 160%)
  const savedBloomVal = fxSettings.bloom;
  const bloomCtrl = FX_CONTROLS.find(c => c.key === 'bloom');
  fxSettings.bloom = 3.5;
  applyFxSettings();
  assert(
    Number(bloomCtrl?.max || 0) >= 3.5 &&
    Number(document.querySelector('#pauseFxMount input[data-fx-key="bloom"]')?.max || 0) >= 3.5 &&
    gfx.bloom.intensity > 4.0 &&
    (gfx.bloom.mipmapBlurPass?.radius || 0) > 0.85,
    'bloom_raised_ceiling'
  );
  fxSettings.bloom = savedBloomVal;
  applyFxSettings();

  // Bright zones stay distinctly lit without over-exposed whiteout peaks
  assert(
    Math.max(...map.LIGHTS.map(l => l.gain || 0)) <= 1.35 &&
    getZoneAtmosphereAt(map.SPAWN.x, map.SPAWN.z, map).exposure <= 1.08,
    'bright_zone_peak_glare_controlled'
  );

  // Pre-match effect warmup verification (clean overlays, zero stray warmup props, pooled flare lights ready)
  assert(
    window.__BR_WARMUP_DONE === true &&
    preloadScr.classList.contains('hidden') &&
    !hud.classList.contains('hidden') &&
    world.flareMeshes.length === 0 &&
    world.trapMeshes.length === 0 &&
    Array.isArray(world.flareLightPool) &&
    world.flareLightPool.length >= 2 &&
    world.flareLightPool.every(pl => pl.intensity === 0),
    'prematch_warmup_completed_cleanly'
  );

  // Escape adrenaline boost when running near Entities: faster sprint speed & reduced stamina burn
  {
    const meAdr = players[myId];
    const savedAdr = {
      x: meAdr.x, z: meAdr.z, y: meAdr.y, vy: meAdr.vy, yaw: meAdr.yaw, spd: meAdr.spd,
      crouch: meAdr.crouch, state: meAdr.state, stam, stamExhausted, hVelX, hVelZ, camYaw, flashYaw
    };
    const savedKillers = Object.values(players)
      .filter(p => p.role === 'k')
      .map(p => ({ p, x: p.x, z: p.z }));

    const adrAnchor = map.TASKS[1] || { x: map.SPAWN.x, z: map.SPAWN.z - 6.0 };
    let bestYaw = 0;
    let bestFreeDist = -1;
    for (let k = 0; k < 16; k++) {
      const a = (k / 16) * Math.PI * 2;
      const tx = adrAnchor.x - Math.sin(a) * 3.5;
      const tz = adrAnchor.z - Math.cos(a) * 3.5;
      const [cx2, cz2] = collide(tx, tz, 0.36, map, false, 0);
      const d = Math.hypot(cx2 - adrAnchor.x, cz2 - adrAnchor.z);
      if (d > bestFreeDist) { bestFreeDist = d; bestYaw = a; }
    }

    for (const entry of savedKillers) {
      entry.p.x = adrAnchor.x + 120;
      entry.p.z = adrAnchor.z + 120;
    }
    meAdr.x = adrAnchor.x; meAdr.z = adrAnchor.z; meAdr.y = 0; meAdr.vy = 0;
    meAdr.yaw = bestYaw; camYaw = bestYaw; flashYaw = bestYaw;
    meAdr.crouch = false; meAdr.state = 'ok';
    hVelX = 0; hVelZ = 0; stam = SPEED.STAM_DRAIN; stamExhausted = false;
    keys[DEF_KB.fwd] = true; keys[DEF_KB.sprint] = true;
    for (let i = 0; i < 3; i++) updateLocalPlayer(0.12, 5.0 + i * 0.12);
    const spdFar = Math.hypot(hVelX, hVelZ);
    const stamDropFar = SPEED.STAM_DRAIN - stam;

    if (savedKillers.length > 0) {
      savedKillers[0].p.x = adrAnchor.x + 2.5;
      savedKillers[0].p.z = adrAnchor.z;
    }
    meAdr.x = adrAnchor.x; meAdr.z = adrAnchor.z; meAdr.y = 0; meAdr.vy = 0;
    meAdr.yaw = bestYaw; camYaw = bestYaw; flashYaw = bestYaw;
    hVelX = 0; hVelZ = 0; stam = SPEED.STAM_DRAIN; stamExhausted = false;
    for (let i = 0; i < 3; i++) updateLocalPlayer(0.12, 6.0 + i * 0.12);
    const spdNear = Math.hypot(hVelX, hVelZ);
    const stamDropNear = SPEED.STAM_DRAIN - stam;

    keys[DEF_KB.fwd] = false; keys[DEF_KB.sprint] = false;
    for (const entry of savedKillers) {
      entry.p.x = entry.x; entry.p.z = entry.z;
    }
    meAdr.x = savedAdr.x; meAdr.z = savedAdr.z; meAdr.y = savedAdr.y; meAdr.vy = savedAdr.vy;
    meAdr.yaw = savedAdr.yaw; meAdr.spd = savedAdr.spd; meAdr.crouch = savedAdr.crouch; meAdr.state = savedAdr.state;
    stam = savedAdr.stam; stamExhausted = savedAdr.stamExhausted;
    hVelX = savedAdr.hVelX; hVelZ = savedAdr.hVelZ;
    camYaw = savedAdr.camYaw; flashYaw = savedAdr.flashYaw;

    assert(
      spdNear > SPEED.SURV_SPRINT && spdNear > spdFar + 0.8 && stamDropNear < stamDropFar,
      'adrenaline_boost_near_monster'
    );
  }

  // Mobile Touch Controls & Swipe Camera test
  {
    const meMob = players[myId];
    const savedGfxMob = currentGfx;
    const savedTouchMode = fxSettings.touchControls;
    const savedYawMob = meMob.yaw;
    const savedPitchMob = meMob.pitch;
    const savedXMob = meMob.x;
    const savedZMob = meMob.z;

    setGraphicsPreset('mobile');
    fxSettings.touchControls = 'on';
    applyFxSettings();
    updateHUD(0.1, 60);
    const activeUiOk = isMobileUiActive() && hud.classList.contains('mobile-ui') &&
      getComputedStyle($('mobileControls')).display !== 'none' &&
      getComputedStyle($('mobLookPad')).display !== 'none';

    mobJoyX = 0; mobJoyY = 1.0; mobEdgeSprint = true;
    hVelX = 0; hVelZ = 0;
    meMob.yaw = 0; camYaw = 0; flashYaw = 0;
    const beforeMoveDist = Math.hypot(meMob.x, meMob.z);
    for (let i = 0; i < 4; i++) updateLocalPlayer(0.08, 7.0 + i * 0.08);
    const movedByJoy = Math.hypot(meMob.x - savedXMob, meMob.z - savedZMob) > 0.1 || Math.hypot(meMob.x, meMob.z) !== beforeMoveDist;
    applyCameraLookDelta(100, -40, 0.0052);
    const lookedBySwipe = Math.abs(meMob.yaw - 0) > 0.25 && meMob.pitch > 0.08;

    resetMobileInputs();
    meMob.x = savedXMob; meMob.z = savedZMob;
    meMob.yaw = savedYawMob; meMob.pitch = savedPitchMob;
    camYaw = savedYawMob; flashYaw = savedYawMob;
    hVelX = 0; hVelZ = 0;
    setGraphicsPreset(savedGfxMob);
    fxSettings.touchControls = savedTouchMode;
    applyFxSettings();
    assert(activeUiOk && movedByJoy && lookedBySwipe, 'mobile_joystick_and_swipe_camera_ok');
  }

  // Self-Escape (1 time per match when caught/carried or hooked by Entity)
  {
    const meEsc = players[myId];
    const ctrl0 = aiControllers[0];
    const killer0 = ctrl0 ? players[ctrl0.id] : null;
    const savedState = {
      x: meEsc.x, z: meEsc.z, state: meEsc.state, hp: meEsc.hp,
      selfEscapeLeft: meEsc.selfEscapeLeft, hookIdx: meEsc.hookIdx, escapeGuardT: meEsc.escapeGuardT,
      kCarry: killer0?.carrying, kSlow: ctrl0?.slowT, kSt: ctrl0?.state
    };

    meEsc.state = 'carried';
    meEsc.hp = 0;
    meEsc.selfEscapeLeft = 1;
    if (killer0) killer0.carrying = myId;
    const carryPrompt = findBestPrompt(meEsc);
    assert(
      carryPrompt?.hold?.kind === 'selfEscape' && carryPrompt.critical === true,
      'caught_self_escape_prompt_available_once'
    );
    keys[DEF_KB.use] = true;
    updateInteractions(0.9, meEsc);
    updateInteractions(0.9, meEsc);
    keys[DEF_KB.use] = false;
    updateInteractions(0.05, meEsc);
    assert(
      meEsc.state === 'ok' && meEsc.hp === 1 && meEsc.selfEscapeLeft === 0 &&
      (!killer0 || killer0.carrying === null) && (!ctrl0 || ctrl0.slowT >= 2.5),
      'survivor_one_time_self_escape_frees_and_stuns_entity'
    );

    // Second catch in same match MUST NOT allow a second self-escape
    meEsc.state = 'carried';
    const secondCatchPrompt = findBestPrompt(meEsc);
    assert(!secondCatchPrompt?.hold, 'second_catch_no_more_self_escape');

    // Restore clean player/killer state
    meEsc.x = savedState.x; meEsc.z = savedState.z; meEsc.state = savedState.state; meEsc.hp = savedState.hp;
    meEsc.selfEscapeLeft = savedState.selfEscapeLeft; meEsc.hookIdx = savedState.hookIdx; meEsc.escapeGuardT = 0;
    if (killer0) killer0.carrying = savedState.kCarry ?? null;
    if (ctrl0) { ctrl0.slowT = savedState.kSlow ?? 0; ctrl0.state = savedState.kSt ?? 'PATROL'; }
    busyAct = null;
    updateInteractions(0.05, meEsc);
  }

  // Map-Wide Wall-Through Highlight for Hooked Teammates + Teammate Rescue Mechanics
  {
    const meRes = players[myId];
    const savedResX = meRes.x, savedResZ = meRes.z, savedResState = meRes.state;
    // Find a distant hook (>140m away beyond FAR_SURV=115m) to prove map-wide wall-through highlight works
    let farHook = map.HOOKS.find(h => Math.hypot(h.x - meRes.x, h.z - meRes.z) > 140) || map.HOOKS[map.HOOKS.length - 1];
    const mateId = '__TEST_MATE__';
    players[mateId] = {
      id: mateId, name: 'DongDoi', role: 's', colorIdx: 2, isAI: false,
      x: farHook.x, y: 0, z: farHook.z, vy: 0, yaw: 0, pitch: 0, spd: 0,
      crouch: false, fl: true, hp: 1, state: 'hooked',
      bleed: BLEED, hookT: HOOK_T, hooks: 1, hookIdx: farHook.id,
      selfEscapeLeft: 1, escapeGuardT: 0, carrying: null, swingT: 0, reveal: false, inv: {}
    };
    farHook.occ = mateId;

    camera.position.set(meRes.x, 1.62, meRes.z);
    updateRevealMarkers(2.5);
    const activeBeacon = beaconPool[0];
    const beaconDistToCam = activeBeacon ? activeBeacon.position.distanceTo(camera.position) : 999;
    assert(
      !!activeBeacon && activeBeacon.visible &&
      activeBeacon.userData?.silhouette?.visible === true &&
      activeBeacon.material?.fog === false &&
      beaconDistToCam < camera.far,
      'hooked_teammate_highlighted_across_entire_map'
    );

    // Move next to hooked teammate and complete teammate rescue
    meRes.x = farHook.x + 1.0; meRes.z = farHook.z; meRes.spd = 0; meRes.state = 'ok';
    const rescuePrompt = findBestPrompt(meRes);
    assert(rescuePrompt?.hold?.kind === 'unhook' && rescuePrompt.critical === true, 'teammate_rescue_prompt_available');
    keys[DEF_KB.use] = true;
    updateInteractions(UNHOOK_T * 0.6, meRes);
    updateInteractions(UNHOOK_T * 0.6, meRes);
    keys[DEF_KB.use] = false;
    updateInteractions(0.05, meRes);
    assert(
      players[mateId].state === 'ok' && players[mateId].hp === 1 && farHook.occ === null,
      'teammate_rescue_unhooks_cleanly'
    );

    delete players[mateId];
    farHook.occ = null;
    meRes.x = savedResX; meRes.z = savedResZ; meRes.state = savedResState;
    busyAct = null;
    updateRevealMarkers(2.6);
    updateInteractions(0.05, meRes);
    updateHUD(players[myId]);
  }

  // Random Creepy Horror Sounds (preloaded real OGG/WAV + 3D spatial triggers)
  {
    const sfxCount = Object.keys(HORROR_SFX_TRACKS).length;
    const preloadedSfxCount = Object.keys(audio.sfxRawBuffers).length;
    const sampleHit = audio.playCreepySfx('sfx_whisper', { x: map.SPAWN.x + 6, y: 1.5, z: map.SPAWN.z - 6 });
    const elevBellOk = audio.playElevatorSequence(map.ELEVATOR);
    assert(
      sfxCount >= 11 && CREEPY_RANDOM_KEYS.length >= 10 && preloadedSfxCount >= 10 &&
      sampleHit?.played === true && elevBellOk === true,
      'creepy_random_horror_sfx_preloaded_and_spatial'
    );
  }

  // Additional Distinct Monster Archetypes & Seeded Randomization across the Map
  {
    const rA = selectMatchEntities(2026, 5);
    const rB = selectMatchEntities(9090, 5);
    const sigA = rA.map(e => `${e.kind}:${e.spawnQuadrant}`).join('|');
    const sigB = rB.map(e => `${e.kind}:${e.spawnQuadrant}`).join('|');
    const allRigsValid = ENTITY_ARCHETYPES.every(arch => {
      const av = buildEntityAvatar(arch.kind);
      animateEntity(av, 0.016, { spd: 5.5, swingT: 0.4 }, 1.4);
      return av && av.jaw && av.eyes?.length === 2 && av.tendrils?.length > 0 && av.eyeLight;
    });
    const allFarFromElev = aiControllers.every(c => {
      const ep = players[c.id];
      return ep && Math.hypot(ep.x - map.ELEVATOR.x, ep.z - map.ELEVATOR.z) >= 80;
    });
    assert(
      ENTITY_ARCHETYPES.length >= 8 && sigA !== sigB && allRigsValid && allFarFromElev,
      'multi_entity_random_roster_and_models'
    );
  }

  // Ornate Interactive Spawn Elevator Intro (Wait together, first player can open immediately!)
  {
    const meEl = players[myId];
    const el = map.ELEVATOR;
    const doorZ = el.z - el.depth * 0.5;
    map.elevatorState = 'closed';
    map.elevatorOpenProgress = 0;
    updateWorldLighting(world, map, camera.position, 0.2, []);

    const insideDist = Math.hypot(meEl.x - el.x, meEl.z - el.z);
    // Test pressing from inside the cabin against the inner face of the closed sliding doors
    const [blockedX, blockedZ] = collide(el.x, doorZ + 0.35, 0.36, map, false, 0);
    const elevPrompt = findBestPrompt(meEl);

    sendAction({ act: 'openElevator' });
    const startedOpening = map.elevatorState === 'opening';
    updateHostSimulation(0.8);
    updateHostSimulation(0.8);
    updateWorldLighting(world, map, camera.position, 1.8, []);

    const [walkedX, walkedZ] = collide(el.x, doorZ - 1.5, 0.36, map, false, 0);
    const elevDiag = {
      hasParts: !!world.elevator?.doorL && !!world.elevator?.doorR && !!world.elevator?.buttonMesh,
      insideDist: +insideDist.toFixed(2),
      blockedZ: +blockedZ.toFixed(2),
      doorZ: +doorZ.toFixed(2),
      elevPrompt: elevPrompt?.text || null,
      startedOpening,
      elevState: map.elevatorState,
      elevProg: +(map.elevatorOpenProgress || 0).toFixed(2),
      doorLX: +(world.elevator?.doorL?.position?.x || 0).toFixed(2),
      doorRX: +(world.elevator?.doorR?.position?.x || 0).toFixed(2),
      walkedZ: +walkedZ.toFixed(2)
    };
    const elevPass = (
      elevDiag.hasParts &&
      insideDist < 2.2 && blockedZ >= doorZ + 0.55 && Number.isFinite(blockedX) &&
      elevPrompt?.text.includes('Elevator') && startedOpening &&
      map.elevatorState === 'open' && map.elevatorOpenProgress >= 0.99 &&
      world.elevator.doorL.position.x < -1.25 && world.elevator.doorR.position.x > 1.25 &&
      walkedZ < doorZ - 1.0 && Number.isFinite(walkedX)
    );
    if (!elevPass) console.error('ELEVATOR TEST DIAG:', elevDiag);
    assert(elevPass, 'elevator_intro_spawn_collide_and_early_open');

    // Reset elevator back to pristine waiting state for visual inspection/screenshots
    map.elevatorState = 'closed';
    map.elevatorOpenProgress = 0;
    updateWorldLighting(world, map, camera.position, 0.2, []);
  }

  // 20 Backrooms Levels: Level 0 Entrances, Vast Worlds, Poolrooms Water-Only AI, Co-op Join & Return Loop
  {
    assert(LEVEL_LIST.length === 20, 'catalog_has_20_backrooms_levels');
    const entIds = new Set((tMap.ENTRANCES || []).map(e => e.levelId));
    const entTypes = new Set((tMap.ENTRANCES || []).map(e => e.entryType));
    assert(
      (tMap.ENTRANCES || []).length === 20 &&
      LEVEL_LIST.every(l => entIds.has(l.id)) &&
      ['portal', 'pickup', 'crawl_hatch', 'noclip_floor'].every(k => entTypes.has(k)),
      'level0_20_distinct_entrances'
    );

    // Validate all 20 procedural sub-levels build cleanly, have vast span, terrain, task & return portal
    const subDiag = [];
    for (const lvl of LEVEL_LIST) {
      const sm = getOrCreateLevelMap(lvl.id);
      const spTerr = getTerrainAt(sm.SPAWN.x, sm.SPAWN.z, sm, sm.SPAWN.y || 0);
      const tTerr = sm.TASKS?.[0] ? getTerrainAt(sm.TASKS[0].x, sm.TASKS[0].z, sm, sm.TASKS[0].y || 0) : null;
      const pTerr = sm.PORTALS?.[0] ? getTerrainAt(sm.PORTALS[0].x, sm.PORTALS[0].z, sm, sm.PORTALS[0].y || 0) : null;
      const [sx, sz] = collide(sm.SPAWN.x, sm.SPAWN.z, 0.36, sm, false, spTerr.floorY);
      const propCount = sm.PROPS?.length || 0;
      const animCount = sm.ANIM_PROPS?.length || 0;
      const ok = (
        sm.worldSpan >= 500 &&
        sm.TASKS?.length === 1 &&
        sm.PORTALS?.length === 1 &&
        (propCount >= 18 || (sm.customPoolrooms && sm.POOL_CELLS?.length > 100)) &&
        (sm.LIGHTS?.length || 0) >= 4 &&
        Math.hypot(sx - sm.SPAWN.x, sz - sm.SPAWN.z) < 0.8 &&
        Number.isFinite(sx) && Number.isFinite(sz) &&
        Number.isFinite(spTerr.floorY) &&
        tTerr && Number.isFinite(tTerr.floorY) &&
        pTerr && Number.isFinite(pTerr.floorY)
      );
      if (!ok) subDiag.push({ id: lvl.id, span: sm.worldSpan, props: propCount, anims: animCount, lights: sm.LIGHTS?.length, tasks: sm.TASKS?.length, portals: sm.PORTALS?.length, spTerr, sx, sz });
    }
    if (subDiag.length > 0) console.error('SUBLEVEL VERIFY FAIL:', subDiag);
    assert(subDiag.length === 0, 'all_20_sublevels_vast_architecture_and_loops');

    // Poolrooms: underwater basin depth, downhill water slides and peaceful policy
    const poolMap = getOrCreateLevelMap('level37');
    const basin = poolMap.WATER_RECTS?.[0];
    const slide = poolMap.SLIDES?.[0];
    const wetX = basin ? basin.x0 + 4.5 : 0;
    const wetZ = basin ? basin.z0 + 4.5 : 0;
    const bridgeX = poolMap.SPAWN.x;
    const bridgeZ = poolMap.SPAWN.z;
    const basinTerr = basin ? getTerrainAt(wetX, wetZ, poolMap, 0) : null;
    const bridgeTerr = basin ? getTerrainAt(bridgeX, bridgeZ, poolMap, 0) : null;
    const slideTerr = slide ? getTerrainAt((slide.x0 + slide.x1) * 0.5, (slide.z0 + slide.z1) * 0.5, poolMap, 5) : null;
    const dryTerr = getTerrainAt(poolMap.SPAWN.x, poolMap.SPAWN.z, poolMap, 0);
    const peacefulPool = poolMap.levelCfg?.peaceful === true && !poolMap.levelCfg?.entity && poolMap.ENTITY_ROUTES.length === 0;
    const validMusicLayers = new Set([
      'peaceful_shallow', 'dark_submerged', 'colored_sanctuary',
      'slide_cathedral', 'industrial_nexus', 'silent_horror'
    ]);
    const validAcoustics = new Set([
      'small_corridor', 'large_chamber', 'slide_tube',
      'maintenance_room', 'vaulted_cathedral', 'underwater_passage'
    ]);
    const seenZoneIds = new Set();
    const seenZoneCodes = new Set();
    const zoneFailures = [];
    const zonesOk = (poolMap.POOL_ZONES?.length === 40) && poolMap.POOL_ZONES.every(z => {
      const idOk = !!z.id && !seenZoneIds.has(z.id);
      const codeOk = !!z.code && !seenZoneCodes.has(z.code);
      if (z.id) seenZoneIds.add(z.id);
      if (z.code) seenZoneCodes.add(z.code);
      const musicOk = validMusicLayers.has(z.musicLayer);
      const acousticOk = validAcoustics.has(z.acousticPreset);
      const zt = getTerrainAt(z.teleX, z.teleZ, poolMap, z.teleY);
      const dryOk = !!(zt && zt.inWater === false);
      if (!idOk || !codeOk || !musicOk || !acousticOk || !dryOk) {
        zoneFailures.push({ code: z.code, idOk, codeOk, musicOk, acousticOk, dryOk, zt });
      }
      return idOk && codeOk && musicOk && acousticOk && dryOk;
    });
    const pumpsOk = poolMap.PUMPS?.length === 3;
    const poolDiag = {
      waters: poolMap.WATER_RECTS?.length || 0,
      slides: poolMap.SLIDES?.length || 0,
      spiralSlides: poolMap.SPIRAL_SLIDES?.length || 0,
      lightVolumes: poolMap.LIGHT_VOLUMES?.length || 0,
      zones: poolMap.POOL_ZONES?.length || 0,
      zonesOk,
      zoneFailures,
      pumps: poolMap.PUMPS?.length || 0,
      basin,
      slide,
      basinTerr,
      bridgeTerr,
      slideTerr,
      dryTerr,
      peacefulPool
    };
    const poolPass = (
      poolDiag.waters >= 3 &&
      poolDiag.slides >= 6 &&
      poolDiag.spiralSlides >= 2 &&
      poolDiag.lightVolumes >= 6 &&
      zonesOk && pumpsOk &&
      basinTerr?.inWater === true && basinTerr.floorY < -0.5 &&
      bridgeTerr?.inWater === false &&
      slideTerr?.onSlide === true && Math.hypot(slideTerr.slideVelX, slideTerr.slideVelZ) > 0.5 &&
      dryTerr?.inWater === false &&
      peacefulPool
    );
    if (!poolPass) console.error('POOL TEST DIAG:', JSON.stringify(poolDiag));
    assert(poolPass, 'poolrooms_water_slides_and_peaceful_policy');

    // Interactive enter -> Co-op Join -> Activate 3 Pumps to Unlock Portal -> Return to Level 0 loop
    players['ally_coop'] = {
      id: 'ally_coop', name: 'Teammate', role: 's', colorIdx: 1, isAI: false, levelId: 'level0',
      x: tMap.SPAWN.x, y: 0, z: tMap.SPAWN.z, yaw: 0, pitch: 0,
      hp: 2, state: 'ok', hooks: 0, hookIdx: -1, inv: { water: 1, scan: 0, jelly: 0, ration: 0, flare: 0 }
    };
    sendAction({ act: 'enterLevel', levelId: 'level37', via: 'noclip_floor' });
    const enteredPool = activeLocalLevelId === 'level37' && players[myId].levelId === 'level37' && world?.isSubLevel === true;
    updateHostSimulation(0.05);
    const joinOffered = activeJoinTarget?.levelId === 'level37';
    processPlayerActionHost('ally_coop', { act: 'enterLevel', levelId: 'level37', via: 'join' });
    const allyJoined = players['ally_coop'].levelId === 'level37';
    processPlayerActionHost(myId, { act: 'pumpProg', idx: 0, delta: 1.0 });
    processPlayerActionHost(myId, { act: 'pumpProg', idx: 1, delta: 1.0 });
    processPlayerActionHost(myId, { act: 'pumpProg', idx: 2, delta: 1.0 });
    const taskCleared = map.PUMPS.every(pm => pm.done) && map.TASKS[0].done === true && levelsClearedSet.has('level37');
    const portalPt = map.PORTALS[0];
    players[myId].x = portalPt.x; players[myId].z = portalPt.z;
    const portalPrompt = findBestPrompt(players[myId]);
    sendAction({ act: 'enterLevel', levelId: 'level0', via: 'return' });
    const returnedToLvl0 = activeLocalLevelId === 'level0' && players[myId].levelId === 'level0' && !!world?.elevator;
    // Also verify mobile/desktop Join banner appears for Survivor in Level 0 when ally is in a sub-level
    updateHostSimulation(0.05);
    updateHUD(0.2, 60);
    const joinBtnVisibleInLvl0 = !$('joinLevelBar').classList.contains('hidden');
    delete players['ally_coop'];
    updateHostSimulation(0.05);
    updateHUD(0.3, 60);

    const subFlowDiag = {
      enteredPool,
      activeLocalLevelId,
      myLevel: players[myId]?.levelId,
      worldIsSub: world?.isSubLevel,
      joinOffered,
      allyJoined,
      allyLevel: players['ally_coop']?.levelId,
      taskCleared,
      portalPrompt: portalPrompt?.text || null,
      returnedToLvl0,
      joinBtnVisibleInLvl0,
      activeJoinTarget
    };
    const subFlowPass = (
      enteredPool && joinOffered && allyJoined && taskCleared &&
      !!portalPrompt?.text && returnedToLvl0 && joinBtnVisibleInLvl0
    );
    if (!subFlowPass) console.error('SUBFLOW TEST DIAG:', JSON.stringify(subFlowDiag));
    assert(subFlowPass, 'sublevel_enter_coop_join_repair_and_return_level0');

    // Teleport Control Panel & No-Clip Mode verification
    openTpPanel();
    const tpOpenedWithoutPause = tpOpen === true && !paused && !$('tpPanel').classList.contains('hidden') && $('pauseScr').classList.contains('hidden');
    const tpRowsCount = document.querySelectorAll('#tpList .tp-item').length;
    const lvl0Marks = collectLevelLandmarks('level0');
    const hasElevMark = lvl0Marks.some(m => m.id === 'level0_elev');
    const hasEntMark = lvl0Marks.some(m => m.id === 'lvl0_ent_level37');

    setNoclipMode(true, true);
    const ncBadgeShown = noclipMode === true && !$('noclipBadge').classList.contains('hidden') && $('tpHudBtn').classList.contains('noclip-on');
    closeTpPanel(false);
    const meNc = players[myId];
    meNc.x = tMap.SPAWN.x; meNc.y = 0; meNc.z = tMap.SPAWN.z; meNc.yaw = 0; meNc.pitch = 0.35;
    keys[DEF_KB.fwd] = true;
    keys[DEF_KB.jump] = true;
    for (let s = 0; s < 16; s++) updateLocalPlayer(0.05, s * 0.05);
    keys[DEF_KB.fwd] = false;
    keys[DEF_KB.jump] = false;
    const flewUpSmoothly = meNc.y > 4.0 && meNc.spd > 2.0;

    setNoclipMode(false, true);
    const ncDisabledClean = noclipMode === false && $('noclipBadge').classList.contains('hidden');
    const tpPoolOk = teleportToTarget({ id: 'dim_level37', levelId: 'level37', title: 'Level 37' });
    const landedInPool = tpPoolOk && activeLocalLevelId === 'level37' && players[myId].levelId === 'level37';
    const poolMarks = collectLevelLandmarks('level37');
    const hasSlideMark = poolMarks.some(m => m.id.startsWith('level37_slide_'));
    const tpBackOk = teleportToTarget({ id: 'dim_level0', levelId: 'level0', title: 'Level 0' });
    const returnedByTp = tpBackOk && activeLocalLevelId === 'level0' && players[myId].levelId === 'level0';
    // Restore spawn cleanly
    meNc.x = tMap.SPAWN.x; meNc.y = 0; meNc.z = tMap.SPAWN.z; meNc.yaw = 0; meNc.pitch = 0; meNc.vy = 0;
    noclipDropLockUntil = 0;

    const tpPass = (
      tpOpenedWithoutPause && tpRowsCount >= 25 && hasElevMark && hasEntMark &&
      ncBadgeShown && flewUpSmoothly && ncDisabledClean &&
      landedInPool && hasSlideMark && returnedByTp
    );
    if (!tpPass) {
      console.error('TP/NOCLIP TEST DIAG:', JSON.stringify({
        tpOpenedWithoutPause, tpRowsCount, hasElevMark, hasEntMark,
        ncBadgeShown, flewUpSmoothly, ncY: meNc.y, ncDisabledClean,
        landedInPool, hasSlideMark, returnedByTp
      }));
    }
    assert(tpPass, 'teleport_panel_and_noclip_3d_flight_work_cleanly');

    // Credits & Legal UI accessibility checks
    const footerEl = $('legalFooter');
    const lobbyCredBtn = $('lobbyCreditsBtn');
    const credModal = $('creditsModal');
    openCreditsModal('backrooms');
    const credOpened = creditsOpen === true && credModal && !credModal.classList.contains('hidden');
    const backroomsTabActive = !!credModal?.querySelector('[data-credits-panel="backrooms"]:not(.hidden)');
    switchCreditsTab('privacy');
    const privacyTabActive = !!credModal?.querySelector('[data-credits-panel="privacy"]:not(.hidden)');
    closeCreditsModal();
    const credClosed = creditsOpen === false && !!credModal?.classList.contains('hidden');
    assert(
      Boolean(footerEl && lobbyCredBtn && credOpened && backroomsTabActive && privacyTabActive && credClosed),
      'credits_legal_modal_and_footer_accessible'
    );

    // Expanded Backrooms Music + Chase Library + Sprint Breathing + Jumpscare + Smart AI Balance
    const musicKeysCount = Object.keys(MUSIC_TRACKS).length;
    const preloadedNewMusic = ['lvl0_hum', 'lvl5_hotel', 'chase_pulse', 'chase_redlands'].every(
      k => (audio.rawBuffers[k]?.byteLength || 0) > 10000
    );
    const preloadedNewSfx = ['sfx_jumpscare', 'sfx_sprint_breath', 'sfx_horror_breath'].every(
      k => (audio.sfxRawBuffers[k]?.byteLength || 0) > 1000
    );
    assert(
      musicKeysCount >= 30 && AMBIENT_TRACK_KEYS.length >= 20 && CHASE_TRACK_KEYS.length >= 8 &&
      preloadedNewMusic && preloadedNewSfx,
      'expanded_backrooms_music_chase_and_sprint_sfx'
    );

    triggerJumpscare({ aiKind: 'smiler', killerName: 'The Smiler', down: false });
    const jsActiveOk = Boolean(
      jumpscareFx &&
      jumpscareFx.classList.contains('active') &&
      getComputedStyle(jumpscareFx).pointerEvents === 'none' &&
      jumpscareT > 0.5 &&
      jsFaceWrap?.innerHTML.includes('<svg')
    );
    if (jumpscareHideTimer) { clearTimeout(jumpscareHideTimer); jumpscareHideTimer = null; }
    jumpscareT = 0;
    jumpscareFx?.classList.remove('active');
    jumpscareFx?.classList.add('hidden');
    assert(jsActiveOk, 'jumpscare_attack_overlay_and_audio_impulse');

    const archStatsOk = ENTITY_ARCHETYPES.every(a =>
      a.patrolSpd <= 5.0 &&
      a.chaseSpd >= SPEED.SURV_SPRINT*.6 && a.chaseSpd <= SPEED.SURV_SPRINT*.75 &&
      (a.maxChaseSpd || a.chaseSpd) <= SPEED.KILLER_SPRINT + 0.01 &&
      a.sightRange >= 24 &&
      a.hearRange >= 19
    );
    const lvl0EntCount = aiControllers.filter(c => !c.id.startsWith('AI_SUB_')).length;
    const subPoolEntCount = aiControllers.filter(c => c.id.startsWith('AI_SUB_level37')).length;
    const smartCtrl = new EntityAIController('TEST_SMART', ENTITY_ARCHETYPES[0]);
    smartCtrl.reset(tMap.SPAWN.x, tMap.SPAWN.z, tMap.ENTITY_ROUTES?.[0]?.wps || []);
    smartCtrl.investigate(tMap.SPAWN.x + 12, tMap.SPAWN.z + 6, tMap, 6.0);
    assert(
      archStatsOk && lvl0EntCount >= 8 && subPoolEntCount === 0 && smartCtrl.state === 'INVESTIGATE',
      'smart_ai_speed_detection_and_extra_spawns'
    );

    // Level 0 V6: 124x239 Rectangular Grid, 360° Centered Spawn, 20+ Rear Variants, Parity & Melee/Mezzanine Checks
    {
      const gCols = tMap.gridCols ?? tMap.gridN;
      const gRows = tMap.gridRows ?? tMap.gridN;
      const rearZones = (tMap.ZONES || []).slice(tMap.frontZoneCount || 0);
      const rearVariantTypes = new Set(rearZones.map(z => z.type));
      const frontSpotsCount = (tMap.SPOTS || []).filter(s => s.r < N - 2).length;
      const rearSpotsCount = (tMap.SPOTS || []).filter(s => s.r >= N).length;
      const frontTasksCount = (tMap.TASKS || []).filter(t => t.r < N - 2).length;
      const rearTasksCount = (tMap.TASKS || []).filter(t => t.r >= N).length;
      const frontLightsCount = (tMap.LIGHTS || []).filter(l => l.z < N * C - 7.6).length;
      const rearLightsCount = (tMap.LIGHTS || []).filter(l => l.z >= N * C).length;
      const flankWPath = findGridPath(tMap, tMap.ELEVATOR.x, tMap.ELEVATOR.z - 5.5, tMap.ELEVATOR.x - 10, tMap.ELEVATOR.z);
      const flankEPath = findGridPath(tMap, tMap.ELEVATOR.x, tMap.ELEVATOR.z - 5.5, tMap.ELEVATOR.x + 10, tMap.ELEVATOR.z);
      const rearHubPath = findGridPath(tMap, tMap.ELEVATOR.x, tMap.ELEVATOR.z - 5.5, tMap.ELEVATOR.x, tMap.ELEVATOR.z + 12);
      const southExitPath = findGridPath(tMap, tMap.ELEVATOR.x, tMap.ELEVATOR.z + 12, tMap.EXITS[1].x, tMap.spanZ - 8);
      const hasElevPlat = (tMap.PLATFORMS || []).some(pl => getTerrainAt((pl.x0 + pl.x1) * 0.5, (pl.z0 + pl.z1) * 0.5, tMap, pl.y ?? 1.0).floorY > 0.35);
      const hasRearMarks = lvl0Marks.some(m => m.id === 'level0_rear_hub') && lvl0Marks.filter(m => m.subGroup === 'rear').length >= 20;
      const v6Diag = {
        gCols, gRows, spanX: tMap.spanX, spanZ: tMap.spanZ,
        spawnRatioZ: +(tMap.SPAWN.z / tMap.spanZ).toFixed(4),
        rearZones: rearZones.length, rearVariantTypes: rearVariantTypes.size,
        frontSpotsCount, rearSpotsCount, frontTasksCount, rearTasksCount,
        frontLightsCount, rearLightsCount,
        flankWLen: flankWPath?.length || 0, flankELen: flankEPath?.length || 0,
        rearHubLen: rearHubPath?.length || 0, southExitLen: southExitPath?.length || 0,
        hasElevPlat, hasRearMarks
      };
      const v6Pass = (
        gCols === 124 && gRows === 239 && tMap.spanZ > 900 &&
        Math.abs(tMap.SPAWN.z / tMap.spanZ - 0.5) < 0.02 &&
        rearZones.length >= 35 && rearVariantTypes.size >= 20 &&
        rearSpotsCount >= frontSpotsCount * 0.65 &&
        frontTasksCount >= 3 && rearTasksCount >= 3 &&
        rearLightsCount >= frontLightsCount * 0.65 &&
        flankWPath?.length >= 1 && flankEPath?.length >= 1 &&
        rearHubPath?.length >= 1 && southExitPath?.length >= 1 &&
        hasElevPlat && hasRearMarks
      );
      if (!v6Pass) console.error('V6 REAR WORLD TEST DIAG:', JSON.stringify(v6Diag));
      assert(v6Pass, 'v6_rear_world_360_spawn_connectivity_parity_and_mezzanine');
    }

    // Clean up test artifacts so Playwright visual exploration starts fresh
    levelsClearedSet.delete('level37');
    levelDiscoveredSet.delete('level37');
    levelMaps.delete('level37');
    for (let i = aiControllers.length - 1; i >= 0; i--) {
      if (aiControllers[i].id.startsWith('AI_SUB_')) {
        const aiId = aiControllers[i].id;
        if (avatars[aiId]?.group) scene.remove(avatars[aiId].group);
        delete avatars[aiId];
        delete players[aiId];
        aiControllers.splice(i, 1);
      }
    }
  }

  gfx.render(0.016);

  // Expose live debug handle for automated Playtest/Playwright verification
  window.__BR_DEBUG = {
    camera,
    gfx,
    audio,
    scene,
    LEVEL_LIST,
    MUSIC_TRACKS,
    AMBIENT_TRACK_KEYS,
    CHASE_TRACK_KEYS,
    getTerrainAt,
    getZoneAtmosphereAt,
    triggerJumpscare,
    getMe: () => players[myId],
    getMap: () => map,
    getWorld: () => world,
    getPlayers: () => players,
    getAvatars: () => avatars,
    getAI: () => aiControllers,
    getLevelState: () => ({
      activeLocalLevelId,
      activeJoinTarget,
      levelsCleared: [...levelsClearedSet],
      discovered: [...levelDiscoveredSet],
      noclipMode,
      noclipSpeed,
      tpOpen
    }),
    setNoclipMode,
    setNoclipSpeed,
    openTpPanel,
    closeTpPanel,
    openCreditsModal,
    closeCreditsModal,
    switchCreditsTab,
    collectLevelLandmarks,
    teleportToTarget,
    enterLevel: (levelId, via = 'portal') => {
      noclipDropLockUntil = performance.now() + 1500;
      sendAction({ act: 'enterLevel', levelId, via });
    },
    forceReturnLevel0: () => {
      const m = getOrCreateLevelMap(activeLocalLevelId);
      if (m?.TASKS?.[0]) { m.TASKS[0].done = true; m.TASKS[0].p = 1; m.exitsOpen = true; }
      noclipDropLockUntil = performance.now() + 1500;
      sendAction({ act: 'enterLevel', levelId: 'level0', via: 'return' });
    },
    dismissOverlay: () => {
      const ov = $('noclipOverlay');
      if (ov) { ov.style.opacity = '0'; ov.classList.add('hidden'); }
    },
    triggerJoinActiveLevel,
    openElevator: () => sendAction({ act: 'openElevator' }),
    buildEntityAvatar,
    animateEntity,
    getStamState: () => ({ stam, max: SPEED.STAM_DRAIN, ratio: stam / SPEED.STAM_DRAIN, exhausted: stamExhausted }),
    setStam: (ratio) => { stam = SPEED.STAM_DRAIN * ratio; if (ratio <= 0.01) stamExhausted = true; },
    repairTaskStep: (idx, sec) => {
      const t = map.TASKS[idx];
      if (!t) return 0;
      const p = players[myId];
      p.x = t.x + 0.7; p.z = t.z; p.spd = 0;
      keys[DEF_KB.use] = true;
      updateInteractions(sec, p);
      keys[DEF_KB.use] = false;
      updateInteractions(0.05, p);
      return t.p;
    },
    isMobileUiActive,
    setTouchJoy: (jx = 0, jy = 0, edgeSprint = false) => {
      mobJoyX = jx; mobJoyY = jy; mobEdgeSprint = !!edgeSprint;
    },
    swipeLook: (dx = 0, dy = 0) => applyCameraLookDelta(dx, dy, 0.0052),
    toggleFlashlight,
    setAspectMode,
    setGraphicsPreset,
    setFpsCap,
    fxSettings,
    applyFxSettings,
    getAAState: () => {
      const sz = new THREE.Vector2();
      renderer.getDrawingBufferSize(sz);
      return {
        requestedMode: fxSettings.aaMode,
        activeMode: gfx.activeAaMode,
        msaaSamples: gfx.msaaSamples,
        composerMultisampling: gfx.composer?.multisampling || 0,
        maxHardwareSamples: renderer.capabilities?.maxSamples || 0,
        pixelRatio: renderer.getPixelRatio?.() || 1,
        devicePixelRatio: window.devicePixelRatio || 1,
        bufferWidth: sz.x,
        bufferHeight: sz.y,
        cssWidth: gfx._viewW,
        cssHeight: gfx._viewH,
        smaaReady: !!gfx.smaa?.weightsMaterial?.searchTexture && !!gfx.smaa?.weightsMaterial?.areaTexture,
        maxAnisotropy: renderer.capabilities?.getMaxAnisotropy?.() || 1
      };
    },
    getFxSettings: () => fxSettings,
    setFxValues: (patch = {}) => {
      Object.assign(fxSettings, patch);
      applyFxSettings();
    },
    getRenderStats: () => ({
      activeLevel: activeLocalLevelId,
      cameraFar: camera.far,
      fogDensity: scene.fog?.density,
      renderDistance: fxSettings.renderDistance,
      waterQuality: fxSettings.waterQuality,
      cloudQuality: fxSettings.cloudQuality,
      visibleChunks: world?.streamingStats?.visibleChunks ?? null,
      totalChunks: world?.streamingStats?.totalChunks ?? world?.spatialChunks?.length ?? null,
      skyScale: world?.skyDome?.mesh?.scale?.x ?? null,
      triangles: renderer.info.render.triangles,
      drawCalls: renderer.info.render.calls
    }),
    readExposureAsync: () => gfx.readExposureTelemetryAsync?.(),
    stepExposureFrames: (dt = 0.08, frames = 10) => {
      for (let i = 0; i < frames; i++) gfx.render(dt);
      return gfx.readExposureTelemetryAsync?.();
    },
    openPauseMenu,
    closePauseMenu,
    whipTurn: (yawDelta = 0.12, fwd = 0.14) => {
      const me = players[myId];
      if (!me) return;
      me.yaw += yawDelta;
      me.x -= Math.sin(me.yaw) * fwd;
      me.z -= Math.cos(me.yaw) * fwd;
      me.spd = 7.4;
      lastCamTurnAt = performance.now();
      turnYawRate = THREE.MathUtils.clamp(yawDelta * 55, -15, 15);
    }
  };

  window.__BACKROOMS_TEST_OK = true;
  console.log('SELFTEST OK:', results.join(', '));
}

// DEV-only integration audit, driven through the real host actions and client handlers.
async function runPoolV5Audit(){
  const checks=[],check=(name,ok,detail)=>{checks.push({name,passed:!!ok,detail});if(!ok)console.error('V5 AUDIT',name,detail);};
  net.startSolo('Poolrooms QA',false);await beginMatch(2026,net.roster,net.myId);paused=true;
  const me=players[myId],level0Enemies=aiControllers.filter(a=>players[a.id]?.levelId==='level0').length;
  const roster=[myId];for(let i=1;i<6;i++){const id='QA_SURV_'+i;roster.push(id);players[id]={...me,id,name:'QA '+i,isAI:false,inv:{...me.inv}};}
  for(const id of roster)processPlayerActionHost(id,{act:'enterLevel',levelId:'level37',via:'join'});
  const pool=getOrCreateLevelMap('level37');
  check('six_survivors_join',roster.every(id=>players[id].levelId==='level37'));
  check('six_distinct_spawns',new Set(roster.map(id=>players[id].x+','+players[id].z)).size===6);
  check('six_dry_spawns',roster.every(id=>{const p=players[id];return !getTerrainAt(p.x,p.z,pool,p.y).inWater;}));
  check('authored_acoustic_profiles',pool.POOL_CELLS.filter(c=>c.art).every(c=>c.acoustics.delay>0&&c.acoustics.feedback<1&&c.acoustics.cutoff>0));
  check('no_pool_enemy_spawn',!Object.values(players).some(isHostileInPeacefulLevel)&&!pool.levelCfg.entity&&pool.ENTITY_ROUTES.length===0);
  triggerJumpscare({down:true});handleNetEvent({ev:'reveal',dur:9});handleNetEvent({ev:'hooked',id:myId,hookIdx:0,x:me.x,z:me.z});check('hostile_hud_and_stale_hook_blocked',jumpscareT===0&&revealGlobalT===0&&me.state==='ok');
  const enemy=Object.values(players).find(p=>p.role==='k'&&p.levelId==='level0');
  const hp=me.hp;applyKillerHit(enemy,me);handleNetEvent({ev:'hit',victimId:myId,killerId:enemy.id,down:true});check('host_and_event_damage_blocked',me.hp===hp&&me.state==='ok');
  const oldEnemy={...enemy,id:'AI_SUB_level37_legacy',levelId:'level37',isAI:true};players[oldEnemy.id]=oldEnemy;aiControllers.push({id:oldEnemy.id});removePeacefulLevelHostiles();
  check('legacy_ai_removed',!players[oldEnemy.id]&&!aiControllers.some(c=>c.id===oldEnemy.id));
  handleNetEvent({ev:'levelShift',playerId:roster[1],levelId:'level37',x:players[roster[1]].x,z:players[roster[1]].z,subEnts:[oldEnemy]});check('legacy_subentity_event_ignored',!players[oldEnemy.id]);
  net.isHost=false;applyHostSnapshot({players:{[myId]:{...me,hp:0,state:'down'},[oldEnemy.id]:oldEnemy}});net.isHost=true;
  check('stale_client_snapshot_safe',me.hp===hp&&me.state==='ok'&&!players[oldEnemy.id]);
  processPlayerActionHost(enemy.id,{act:'enterLevel',levelId:'level37',via:'tp_panel'});check('human_or_ai_killer_entry_blocked',enemy.levelId==='level0');
  processPlayerActionHost(myId,{act:'enterLevel',levelId:'level0',via:'return'});check('return_locked_before_pumps',me.levelId==='level37');
  const item=pool.WATERS.find(i=>!i.gone),before=me.inv.water||0;me.x=item.x;me.z=item.z;processPlayerActionHost(myId,{act:'pickup',kind:'water',id:item.id});check('inventory_pickup',me.inv.water===before+1&&item.gone);processPlayerActionHost(myId,{act:'useItem',kind:'water'});check('inventory_consume',me.inv.water===before);
  for(let i=0;i<3;i++){const actor=players[roster[i]],p=pool.PUMPS[i];actor.x=p.x;actor.z=p.z;processPlayerActionHost(actor.id,{act:'pumpProg',idx:i,delta:1});}
  check('cooperative_pumps_unlock_portal',pool.PUMPS.every(p=>p.done)&&pool.TASKS[0].done&&pool.exitsOpen&&levelsClearedSet.has('level37'));
  processPlayerActionHost(myId,{act:'enterLevel',levelId:'level0',via:'return'});check('return_to_level0',me.levelId==='level0'&&activeLocalLevelId==='level0');
  processPlayerActionHost(myId,{act:'enterLevel',levelId:'level37',via:'portal'});check('reentry_remains_peaceful',me.levelId==='level37'&&!Object.values(players).some(isHostileInPeacefulLevel));
  check('level0_enemies_preserved',aiControllers.filter(a=>players[a.id]?.levelId==='level0').length===level0Enemies&&level0Enemies>0,level0Enemies);
  const other=LEVEL_LIST.find(l=>l.id!=='level37'&&getOrCreateLevelMap(l.id).levelCfg?.entity);processPlayerActionHost(roster[5],{act:'enterLevel',levelId:other.id,via:'tp_panel'});check('other_level_enemy_spawns_preserved',aiControllers.some(a=>players[a.id]?.levelId===other.id),other.id);
  window.__POOL_V5_AUDIT={passed:checks.every(c=>c.passed),checks,transport:'real host action/client handler integration; no remote WebRTC peers',zones:pool.POOL_ZONES.length};
  window.__POOL_V5_CONTROL={view(code,idx=0){
    const c=map.POOL_CELLS.find(c=>c.art&&c.zoneId==='zone_'+code.toLowerCase()),v=c.views[idx];
    const p=players[myId],dx=v.target[0]-v.position[0],dy=v.target[1]-v.position[1],dz=v.target[2]-v.position[2];
    p.x=v.position[0];p.y=v.position[1]-1.62;p.z=v.position[2];p.vy=0;p.yaw=Math.atan2(-dx,-dz);p.pitch=Math.atan2(dy,Math.hypot(dx,dz));p.state='ok';p.hp=2;camYaw=p.yaw;flashYaw=p.yaw;hVelX=0;hVelZ=0;paused=false;noclipDropLockUntil=performance.now()+5000;
    const overlay=$('noclipOverlay');if(overlay){overlay.classList.add('hidden');overlay.style.opacity='0';}closePauseMenu();
  },traverse(){
    paused=true;const results=[];noclipMode=false;busyAct=null;tpOpen=false;for(const key of Object.keys(keys))keys[key]=false;
    for(const [code,radius,height,turns,dx]of[['AL',18,12,1,-18],['AM',15,18,2.2,0],['Z',8,4.8,1,0]]){
      const c=map.POOL_CELLS.find(c=>c.zoneId==='zone_'+code.toLowerCase()&&c.art),count=code==='AL'?84:Math.ceil(height/.145),cx=c.x+dx,cz=c.z;
      me.x=cx+radius;me.z=cz;me.y=c.floorY;me.vy=0;me.state='ok';me.crouch=false;hVelX=0;hVelZ=0;keys[DEF_KB.fwd]=true;let missed=0;
      for(let i=1;i<=count;i++){const angle=(i-.2)/count*Math.PI*2*turns,tx=cx+Math.cos(angle)*radius,tz=cz+Math.sin(angle)*radius;let steps=0;while(Math.hypot(tx-me.x,tz-me.z)>.23&&steps++<90){me.yaw=Math.atan2(-(tx-me.x),-(tz-me.z));camYaw=me.yaw;updateLocalPlayer(1/60,20+i);}if(steps>=90)missed++;}
      keys[DEF_KB.fwd]=false;for(let j=0;j<15;j++)updateLocalPlayer(1/60,100+j);results.push({code,height:me.y,expected:height,missed,passed:me.y>=height-.5&&missed===0});
    }
    return results;
  },slide(){
    paused=true;noclipMode=false;busyAct=null;tpOpen=false;for(const key of Object.keys(keys))keys[key]=false;const s=map.SPIRAL_SLIDES[0],a=.18;
    me.x=s.cx+Math.cos(a)*s.radius;me.z=s.cz+Math.sin(a)*s.radius;me.y=s.yTop-(s.yTop-s.yBot)*a/(s.turns*Math.PI*2);me.vy=0;me.state='ok';hVelX=0;hVelZ=0;let touched=false,frames=0;
    for(;frames<3600;frames++){updateLocalPlayer(1/60,150+frames/60);const t=getTerrainAt(me.x,me.z,map,me.y);touched||=t.onSlide;if(touched&&!t.onSlide&&me.y<s.yBot+.5)break;}
    const end=getTerrainAt(me.x,me.z,map,me.y);return {passed:touched&&frames<3600&&end.inWater,frames,height:me.y,inWater:end.inWater,touched};
  },greenChutes(){
    paused=true;noclipMode=false;busyAct=null;tpOpen=false;const results=[];
    for(const s of map.SLIDES.filter(s=>s.richChute)){
      for(const key of Object.keys(keys))keys[key]=false;
      const x=(s.x0+s.x1)/2;me.x=s.stairX;me.z=s.z0+9;me.y=s.y0-3.65;me.vy=0;me.state='ok';me.crouch=false;hVelX=0;hVelZ=0;
      const walk=(tx,tz,stopOnSlide=false)=>{keys[DEF_KB.fwd]=true;let frames=0;while(Math.hypot(tx-me.x,tz-me.z)>.22&&frames++<600){me.yaw=Math.atan2(-(tx-me.x),-(tz-me.z));camYaw=me.yaw;updateLocalPlayer(1/60,300+frames/60);if(stopOnSlide&&getTerrainAt(me.x,me.z,map,me.y).onSlide)break;}keys[DEF_KB.fwd]=false;return frames<600;};
      const ascended=walk(s.stairX,s.z0+.15),topY=me.y,loaded=walk(x,s.z0+.15,true);hVelX=0;hVelZ=0;let touched=false,frames=0;
      for(;frames<1200;frames++){updateLocalPlayer(1/60,320+frames/60);const t=getTerrainAt(me.x,me.z,map,me.y);touched||=t.onSlide;if(touched&&!t.onSlide&&me.y<s.y1+.5)break;}
      const end=getTerrainAt(me.x,me.z,map,me.y);results.push({zone:s.zoneId,ascended,topY,expectedTop:s.y0,loaded,touched,frames,inWater:end.inWater,passed:ascended&&loaded&&topY>s.y0-.5&&touched&&frames<1200&&end.inWater});
    }
    return results;
  },skyBalcony(){
    paused=true;noclipMode=false;busyAct=null;tpOpen=false;for(const key of Object.keys(keys))keys[key]=false;
    const c=map.POOL_CELLS.find(c=>c.zoneId==='zone_ak'&&c.art),x=c.x+21;me.x=x;me.z=c.z0+2;me.y=c.floorY;me.vy=0;me.state='ok';me.crouch=false;hVelX=0;hVelZ=0;
    const walk=(tx,tz,limit=600)=>{keys[DEF_KB.fwd]=true;let n=0;while(Math.hypot(tx-me.x,tz-me.z)>.22&&n++<limit){me.yaw=Math.atan2(-(tx-me.x),-(tz-me.z));camYaw=me.yaw;updateLocalPlayer(1/60,400+n/60);}keys[DEF_KB.fwd]=false;return n<limit;};
    const ascended=walk(x,c.z0+21),height=me.y,reached=walk(x,c.z1-5)&&walk(c.x-5,c.z1-5);
    walk(c.x-5,c.z1+3,180);const inside=me.z<c.z1-.4&&me.y>c.floorY+5.5;
    return {ascended,height,reached,glassStoppedPlayer:inside,position:[me.x,me.y,me.z],passed:ascended&&height>=c.floorY+5.8&&reached&&inside};
  },async tubeRoutes(){
    // Development-only regression through the actual player movement controller.
    const {tubeDistance}=await import('./levels/poolrooms_tubes.js');
    paused=true;noclipMode=false;busyAct=null;tpOpen=false;const results=[];let clock=500;
    for(const code of['C','R']){const c=map.POOL_CELLS.find(c=>c.art&&c.zoneId==='zone_'+code.toLowerCase()),net=c.tubeNetwork;
      const routes=[{name:'curved-circular-spine',points:Array.from({length:65},(_,i)=>{const t=.07+i/64*.86;return[c.x+Math.sin(t*Math.PI*2)*c.width*.19,c.z0-1+t*(c.depth+2)];})},{name:code==='C'?'elliptical-crossing':'barrel-crossing',points:Array.from({length:65},(_,i)=>{const t=.07+i/64*.86;return[c.x0-1+t*(c.width+2),c.z+Math.sin(t*Math.PI)*c.depth*.18];})}];
      for(const entry of net.entries)routes.push({name:'sloped-socket-'+entry.id,points:entry.points.slice(1).flatMap((b,j)=>{const a=entry.points[j];return Array.from({length:17},(_,i)=>{const t=i/16;return[a[0]+(b[0]-a[0])*t,a[2]+(b[2]-a[2])*t];});})});
      if(code==='C')routes.push({name:'half-submerged-raised-walk',points:Array.from({length:33},(_,i)=>[c.x-10,c.z+7-i/32*14])});
      for(const route of[...routes,...routes.map(r=>({name:r.name+'-reverse',points:r.points.slice().reverse()}))]){for(const key of Object.keys(keys))keys[key]=false;const start=route.points[0];me.x=start[0];me.z=start[1];me.y=getTerrainAt(me.x,me.z,map,0).floorY;me.vy=0;me.state='ok';me.crouch=false;hVelX=0;hVelZ=0;let missed=0,maxDepth=0,maxStep=0,headCollisions=0,totalFrames=0;keys[DEF_KB.fwd]=true;
        for(const[tx,tz]of route.points.slice(1)){let frames=0;while(Math.hypot(tx-me.x,tz-me.z)>.18&&frames++<240){me.yaw=Math.atan2(-(tx-me.x),-(tz-me.z));camYaw=me.yaw;const previous=me.y;clock+=1/60;updateLocalPlayer(1/60,clock);totalFrames++;const t=getTerrainAt(me.x,me.z,map,me.y);maxDepth=Math.max(maxDepth,t.waterDepth);maxStep=Math.max(maxStep,Math.abs(previous-me.y));if(tubeDistance(net,me.x,me.y-c.floorY+1.62,me.z)>.08)headCollisions++;}if(frames>=240){missed++;break;}}
        keys[DEF_KB.fwd]=false;results.push({code,route:route.name,missed,totalFrames,maxWaterDepth:maxDepth,maxVerticalStep:maxStep,headCollisions,end:[me.x,me.y,me.z],passed:missed===0&&maxDepth<1.35&&headCollisions===0});
      }
    }return results;
  },cam(x,y,z,yaw,pitch){
    // Free review camera: absolute world coordinates + look angles (radians).
    const p=players[myId];p.x=x;p.y=y-1.62;p.z=z;p.vy=0;p.yaw=yaw;camYaw=yaw;flashYaw=yaw;p.pitch=pitch||0;p.state='ok';p.hp=2;hVelX=0;hVelZ=0;paused=false;noclipDropLockUntil=performance.now()+5000;
    const overlay=$('noclipOverlay');if(overlay){overlay.classList.add('hidden');overlay.style.opacity='0';}closePauseMenu();
  },shot(name,m){
    // Synchronous review capture through the real game pipeline. toDataURL must
    // run in the same task as the final composite (preserveDrawingBuffer is off).
    // Optional m: re-assert a review mode immediately before the composite —
    // something intermittently restores preset defaults between mode() and the
    // capture, so 'clean' is enforced here to keep captures deterministic.
    if(m)this.mode(m);
    gfx.update(0.016,{turnYawRate:0,turnPitchRate:0,shakeXRate:0,shakeYRate:0,speedRatio:0,panic:0,isKiller:false,elapsed:performance.now()*.001,nearLights:world.lightPool||[]});
    gfx.render(0.016);
    const url=renderer.domElement.toDataURL('image/png'),a=document.createElement('a');
    a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();
    return {name,bytes:url.length,fps:window.__BR_PERF?.fps,frameMs:window.__BR_PERF?.frameMs};
  },mode(m){
    // Review toggles: 'clean' = no film/CRT grade (Gate G), 'footage' = shipped ultra look.
    if(m==='clean'){const f=getPresetDefaultFx('ultra');fxSettings={...f,footageFilterMode:'off',footageFilterStrength:0,lensCurve:0,scanlines:0,baseGrain:0,grain:0,vignette:0,motionBlur:0,dofBlur:0,halation:0,bloom:0.9,brightness:1.0,contrast:1.0,saturation:1.0};}
    else fxSettings=getPresetDefaultFx('ultra');
    applyFxSettings();
    return {mode:m,footageFilterMode:fxSettings.footageFilterMode};
  },cell(code){const c=map.POOL_CELLS.find(c=>c.zoneId==='zone_'+String(code).toLowerCase()&&c.art);return c?{zoneId:c.zoneId,x:c.x,z:c.z,x0:c.x0,x1:c.x1,z0:c.z0,z1:c.z1,floorY:c.floorY,ceiling:c.ceiling,width:c.width,depth:c.depth,views:c.views||[],composition:c.composition,grammar:c.art.grammar}:{code,error:'no authored cell'};},
  perf(){return {...(window.__BR_PERF||{})};},fx:()=>({mode:fxSettings.footageFilterMode,strength:fxSettings.footageFilterStrength,scan:fxSettings.scanlines,vig:fxSettings.vignette,lens:fxSettings.lensCurve,grain:fxSettings.grain,bloom:fxSettings.bloom}),state:()=>({position:[me.x,me.y,me.z],hostiles:Object.values(players).filter(isHostileInPeacefulLevel).length,optics:world.opticsStats,daylight:world.daylightStats})};
}

// ---------- Boot Sequence ----------
(async function boot() {
  mountFxTable($('lobbyFxMount'));
  mountFxTable($('pauseFxMount'));
  applyViewportLayout();
  applyFxSettings();

  const preloader = new PreloaderSystem(renderer, scene, camera);
  registerTextureTasks(preloader, texStore);
  registerModelTasks(preloader);
  audio.registerPreloadTasks(preloader);

  await preloader.runAll((pct, label) => {
    preloadBar.style.width = `${Math.round(pct * 100)}%`;
    preloadPct.textContent = `${Math.round(pct * 100)}%`;
    preloadLabel.textContent = label;
  });

  preloadScr.classList.add('hidden');
  lobbyScr.classList.remove('hidden');

  const params = new URLSearchParams(location.search);
  if (import.meta.env.DEV && params.has('fpsreview')) {
    window.__FPS_READY = (async () => {
      net.startSolo('FPS Review', false, 2026); net.roster = net.roster.filter(p => !p.isAI); net.aiEnabled = false;
      await beginMatch(2026, net.roster, net.myId);
      fpsReviewFrozen = true; paused = false;
      let qaTime = 0;
      const updateWeapon = dt => { const p = players[myId]; weaponSystem.update(dt, { player: p, speed: p.spd || 0, visible: p.state === 'ok', sprint: p.spd > 4 && !p.sliding, sliding: !!p.sliding, breath: humanCamera.out.breath, turnX: 0, turnY: 0, light: zoneLightSmooth, reduced: fxSettings.reducedMotion, clean: fxSettings.cleanCamHud }); };
      const info = () => { const p = players[myId]; return { player: JSON.parse(JSON.stringify(p)), stamina:{value:stam,max:SPEED.STAM_DRAIN,exhausted:stamExhausted}, hSpeed: Math.hypot(hVelX, hVelZ), cap: movementSpeedCap, hopBonus: movementAssist.hopBonus, jumps: movementAssist.jumps, slides: movementAssist.slides, eye: movementAssist.eye, state: weaponSystem.view.animation.state, age: weaponSystem.view.animation.age, cycle: weaponSystem.view.animation.cycle, weapon: weaponSystem.equipped, ammo: { ...weaponSystem.authority }, ads: weaponSystem.ads, sights: weaponSystem.view.sights(), camera: camera.position.toArray(), cameraQ: camera.quaternion.toArray(), weaponQ: weaponSystem.view.motion.quaternion.toArray(), handles: [weaponSystem.view.assets.butterfly.a.rotation.z, weaponSystem.view.assets.butterfly.b.rotation.z], animationMs: weaponSystem.view.costMs, perf: window.__BR_PERF, fx: { ...fxSettings }, hostiles: Object.values(players).filter(p => p.role === 'k' && p.levelId === activeLocalLevelId).length }; };
      window.__FPS = {
        info, weapons: weaponSystem, movement: movementAssist, camera, renderer, scene, net,
        cameraMotion(){return {idle:{...humanCamera.out},handheld:structuredClone(handheldCamera.out),base:[camPitch,camYaw],locomotion:[camBobY,camSwayX,camNod,camRoll]};},
        resetCamera(){humanCamera.reset();handheldCamera.reset();camForeZ=previousForwardSpeed=stepPhase=stepDist=0;stepFootSign=1;camBobY=camSwayX=camNod=camRoll=camRollPan=stepSpring=stepSpringVel=stepPulseT=smoothMoveMix=smoothSprintMix=0;resetRunShakeState();},
        world(){return world;},gfx,
        map(){return map;},
        action(msg){sendAction(msg);},
        interact(){const prompt=findBestPrompt(players[myId]);prompt?.act?.();return prompt?.text;},
        players(){return Object.values(players).map(p=>({...p}));},
        hostAction(id,msg){processPlayerActionHost(id,msg);},
        freeze(value) { fpsReviewFrozen = value; },
        input(code, value) { keys[code] = value; },
        clear() { for (const key in keys) keys[key] = false; weaponSystem.clearInput(); movementAssist.clearInput(); },
        setStamina(ratio){stam=Math.max(0,Math.min(1,ratio))*SPEED.STAM_DRAIN;stamExhausted=stam<=.02;players[myId].moveStam=stam;},
        refill() { thirstT = WATER_LIFE; stam = SPEED.STAM_DRAIN; stamExhausted = false; const p = players[myId]; p.moveThirst = thirstT; p.moveStam = stam; },
        settings(values) { Object.assign(fxSettings, values); if (Object.keys(values).some(k => FPS_SETTING_KEYS.includes(k))) saveFpsPreferences(); applyFxSettings(); },
        step(count = 1, dt = 1 / 60) { for (let i = 0; i < count; i++) { qaTime += dt; updateLocalPlayer(dt, qaTime); updateWeapon(dt); } updateHUD(qaTime, fpsSmooth); return info(); },
        render() { world.setRenderDistance?.(fxSettings.renderDistance,qaTime,camera.position);updateWorldLighting(world, map, camera.position, qaTime, []); world.updateExtra?.(qaTime, camera.position, map, scene.fog, null, camera.far); updateSceneOptics(qaTime,1/60); gfx.render(1 / 60); },
        place(x, z, y = null, yaw = 0, pitch = 0) { const p = players[myId]; p.x = x; p.z = z; p.y = y ?? getTerrainAt(x, z, map, 0).floorY; p.vy = 0; p.yaw = camYaw = yaw; p.pitch = camPitch = pitch; hVelX = hVelZ = 0; stam = SPEED.STAM_DRAIN; stamExhausted = false; movementAssist.reset(); return info(); },
        level(id) { sendAction({ act: 'enterLevel', levelId: id, via: 'tp_panel' }); movementAssist.reset(); hVelX = hVelZ = 0; },
        zone(code, view = 0) { const c = map.POOL_CELLS?.find(c => c.art && c.zoneId === 'zone_' + code.toLowerCase()); if (!c) throw new Error('Unknown zone'); const v = c.views[view], dx = v.target[0] - v.position[0], dy = v.target[1] - v.position[1], dz = v.target[2] - v.position[2]; this.place(v.position[0], v.position[2], v.position[1] - 1.62, Math.atan2(-dx, -dz), Math.atan2(dy, Math.hypot(dx, dz))); return { x: c.x, z: c.z, x0: c.x0, x1: c.x1, z0: c.z0, z1: c.z1, floorY: c.floorY }; },
        terrain(x, z, y = 0) { return getTerrainAt(x, z, map, y); },
        map() { return map; },
        hostAction(id, msg) { return processPlayerActionHost(id, msg); },
        roster() { return players; },
        events: [],
        animateRemote(id, dt = 1 / 60) { const p = players[id]; if (!avatars[id]) { avatars[id] = buildSurvivorAvatar(1); scene.add(avatars[id].group); } const av = avatars[id]; av.group.visible = true; av.group.position.set(p.x, p.y, p.z); av.group.rotation.y = p.yaw; animateSurvivor(av, dt, p, qaTime); weaponSystem.updateRemote(id, av, p, dt); },
        hostTick(dt = 1 / 60) { updateHostSimulation(dt); },
        addChaser(kind,x,z){const id='__CHASE_'+aiControllers.length,arch=ENTITY_ARCHETYPES.find(a=>a.kind===kind)||ENTITY_ARCHETYPES[0],base=players[myId],p={...structuredClone(base),id,name:arch.name,role:'k',isAI:true,aiKind:arch.kind,x,z,y:0,hp:99,spd:0,carrying:null};players[id]=p;const ctrl=new EntityAIController(id,arch);ctrl.reset(x,z,[]);aiControllers.push(ctrl);const av=buildEntityAvatar(arch.kind);av.group.position.set(x,0,z);scene.add(av.group);avatars[id]=av;return id;},
        chasers(){return aiControllers.filter(c=>c.id.startsWith('__CHASE_')).map(c=>({id:c.id,state:c.state,lost:c.lostT,lastKnown:c.targetPos,player:{...players[c.id]}}));},
        clearChasers(){for(const c of aiControllers.filter(c=>c.id.startsWith('__CHASE_'))){delete players[c.id];if(avatars[c.id])scene.remove(avatars[c.id].group);delete avatars[c.id];}aiControllers=aiControllers.filter(c=>!c.id.startsWith('__CHASE_'));},
        clearResources() { weaponSystem.effects.clear(); },
        look(dx, dy) { applyCameraLookDelta(dx, dy); }
      };
      return true;
    })();
  }
  if (import.meta.env.DEV && params.has('netreview')) window.__NET_REVIEW = {
    net, state:()=>({inMatch,myId,level:activeLocalLevelId,players:Object.values(players).map(p=>({...p})),map:map?{seed:map.seed,houses:map.HOUSES?.map(h=>[h.cx,h.cz,h.variantId])}:null,visible:Object.entries(avatars).filter(([id,a])=>a.group.visible).map(([id])=>id)}),
    async start(seedValue=2026){net.broadcast({t:'start',seed:seedValue,roster:net.roster});await beginMatch(seedValue,net.roster,net.myId);},
    level(id){sendAction({act:'enterLevel',levelId:id,via:'tp_panel'});},
    place(x,z){const p=players[myId];p.x=x;p.z=z;p.y=getTerrainAt(x,z,map,p.y).floorY;hVelX=hVelZ=0;},
    interact(){const prompt=findBestPrompt(players[myId]);prompt?.act?.();return {text:prompt?.text,player:{...players[myId]}};},
    freeze(v){fpsReviewFrozen=v;}
  };
  const joinCode = params.get('room');
  if (joinCode) {
    $('joinCodeInput').value = joinCode;
    net.joinOnlineRoom(joinCode, $('nameInput').value);
  }

  requestAnimationFrame(animate);

  // DEV-only watchdog: an occluded window never schedules rAF, so the whole
  // render loop and every review capture would freeze. Drive frames by timer
  // while rAF is stalled; it stays a no-op as soon as rAF ticks normally.
  if (import.meta.env.DEV) {
    window.__ANIMATE_WATCHDOG = setInterval(() => {
      if (performance.now() - (window.__LAST_ANIMATE_MS || 0) < 60) return;
      animate(performance.now());
    }, 30);
  }

  if(import.meta.env.DEV&&params.has('poolreview')){
    try{await runPoolV5Audit();}catch(e){window.__POOL_V5_AUDIT={passed:false,error:e.stack};}return;
  }

  if (location.hash.includes('test')) {
    try {
      await runSelfTests();
    } catch (err) {
      console.error('SELFTEST FAIL:', err);
      window.__BACKROOMS_TEST_ERROR = err.message;
    }
  }
})();
