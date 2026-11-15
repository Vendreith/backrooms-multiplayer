import { THREE, PreloaderSystem } from './engine.js';
import {
  C, WH, N, NTASK, NHOOK, NEED, TASK_TIME, STAM_EXHAUST_RATIO, BLEED, HOOK_T, UNHOOK_T,
  REVEAL_T, REVEAL_CD, TRAP_CD, TRAP_MAX, TRAP_LOCK, TRAP_R,
  SCAN_T, DISARM_T, WATER_LIFE, SPEED, FOG_SURV, FOG_KILLER, FAR_SURV, FAR_KILLER,
  SURV_COLORS, GFX_PRESETS, FX_CONTROLS, getPresetDefaultFx, FPS_CAPS, DEF_KB,
  ENTITY_ARCHETYPES, esc
} from './constants.js';
import { genMap, collide, blocked, getSurfaceAt, getZoneLuminanceAt, getZoneAtmosphereAt } from './map.js';
import { registerTextureTasks, createMapLightmaps } from './textures.js';
import {
  registerModelTasks, buildWorld, updateWorldLighting,
  buildSurvivorAvatar, animateSurvivor, buildEntityAvatar, animateEntity,
  makeFPEntityClaws, updateFPEntityClaws, spawnTrapMesh, spawnFlareMesh
} from './models.js';
import { GraphicsManager } from './postfx.js';
import { audio, MUSIC_TRACKS, AMBIENT_TRACK_KEYS } from './audio.js';
import { EntityAIController, findGridPath } from './ai.js';
import { NetworkManager } from './network.js';

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

// ---------- Core Three.js Renderer, Scene & Camera ----------
const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
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
function loadFxSettings(presetKey) {
  const base = getPresetDefaultFx(presetKey);
  try {
    const saved = JSON.parse(localStorage.getItem('br_fx_v2') || 'null');
    if (saved && typeof saved === 'object') {
      const merged = { ...base, ...saved };
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
      return merged;
    }
  } catch {}
  return base;
}
let fxSettings = loadFxSettings(currentGfx);
const rawSavedFps = localStorage.getItem('br_fps_v2');
const defaultFps = mobileAutoBoot ? 30 : 15;
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
  if (ctrl.type === 'toggle') return v ? 'Bật' : 'Tắt';
  if (ctrl.type === 'select') return ctrl.options?.find(o => o.value === v)?.label || String(v || '');
  if (ctrl.unit === 'deg') return `${Math.round(Number(v) || 0)}°`;
  return `${Math.round(Number(v) * 100)}%`;
}

function mountFxTable(container) {
  if (!container) return;
  container.innerHTML = FX_CONTROLS.map((c) => {
    let ctrlHtml;
    if (c.type === 'toggle') {
      ctrlHtml = `<label class="fx-toggle-wrap"><input type="checkbox" data-fx-key="${c.key}" /> <span data-fx-val="${c.key}">Bật</span></label>`;
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
  }).join('');

  const onUpdate = (e) => {
    const key = e.target?.dataset?.fxKey;
    if (!key) return;
    const ctrl = FX_CONTROLS.find(x => x.key === key);
    if (!ctrl) return;
    fxSettings[key] = ctrl.type === 'toggle'
      ? !!e.target.checked
      : ctrl.type === 'select'
        ? String(e.target.value)
        : Number(e.target.value);
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

function applyFxSettings() {
  localStorage.setItem('br_fx_v2', JSON.stringify(fxSettings));
  gfx.applyFx(fxSettings, hemiLight, ambLight);
  hud?.classList.toggle('clean-cam', !!fxSettings.cleanCamHud);
  hud?.classList.toggle('no-scanlines', fxSettings.crtScanlines === false || Number(fxSettings.scanlines) <= 0.01);
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
}

function setGraphicsPreset(key, resetCustomFx = true) {
  currentGfx = key in GFX_PRESETS ? key : 'ultra';
  localStorage.setItem('br_gfx_v2', currentGfx);
  gfx.presetKey = currentGfx;
  if (resetCustomFx) {
    fxSettings = getPresetDefaultFx(currentGfx);
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

    if (!nMgr.isSolo && nMgr.roomCode) {
      $('roomShareBox').classList.remove('hidden');
      $('roomCodeText').textContent = nMgr.roomCode;
    } else {
      $('roomShareBox').classList.add('hidden');
    }

    $('startGameBtn').classList.toggle('hidden', !nMgr.isHost || roster.length < 1);

    const listEl = $('rosterList');
    listEl.innerHTML = roster.map(r => {
      const col = r.role === 'k' ? '#d92820' : `#${SURV_COLORS[r.colorIdx % SURV_COLORS.length].hex.toString(16).padStart(6, '0')}`;
      const roleLabel = r.role === 'k' ? 'QUÁI VẬT (ENTITY)' : 'SURVIVOR';
      const switchBtn = nMgr.isHost && !r.isAI
        ? `<button class="sm role-btn" data-id="${esc(r.id)}">${r.role === 'k' ? 'Đổi làm Người' : 'Chọn làm Quái'}</button>`
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
    p.x = inp.x; p.y = inp.y; p.z = inp.z;
    p.yaw = inp.yaw; p.pitch = inp.pitch;
    p.spd = inp.spd; p.crouch = inp.crouch; p.fl = inp.fl;
  },
  onClientAction(peerId, msg) {
    processPlayerActionHost(peerId, msg);
  },
  onPeerDisconnect(peerId) {
    if (inMatch && players[peerId]) {
      pushFeed(`${players[peerId].name} đã ngắt kết nối`, '#ff9a8a');
      delete players[peerId];
      if (avatars[peerId]) {
        scene.remove(avatars[peerId].group);
        delete avatars[peerId];
      }
      if (net.isHost) checkMatchEnd();
    }
  },
  onHostDisconnect() {
    if (inMatch && !matchEnded) {
      pushFeed('Mất kết nối tới Host!', '#ff5648');
    }
  }
});

// ---------- Match Setup & Teardown ----------
function clearMatchObjects() {
  resetMobileInputs();
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
    'Xây dựng bản đồ 3D, ánh sáng khu vực & nhân vật...',
    'PRE-MATCH SHADER & FX WARM-UP',
    'ĐANG KIỂM THỬ ÁNH SÁNG, VẬT PHẨM & HIỆU ỨNG'
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
  setPreloadOverlay(true, 0.35, 'Kiểm thử bật/tắt đèn pin [F] & đổ bóng thời gian thực...');
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
  setPreloadOverlay(true, 0.62, 'Kiểm thử Pháo Sáng UV, bẫy, máy dò Thực thể & vật phẩm...');
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
  setPreloadOverlay(true, 0.86, 'Kiểm thử hiệu ứng thấu kính, màu sắc & bộ lọc Stream/VOD...');
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

  setPreloadOverlay(true, 1.0, 'Hoàn tất kiểm thử — Bắt đầu ghi hình!');
  await PreloaderSystem.yieldFrame();
  window.__BR_WARMUP_DONE = true;
}

async function beginMatch(matchSeed, roster, localId) {
  if (warmingMatch) return;
  warmingMatch = true;
  inMatch = false;
  audio.ensureContext();
  clearMatchObjects();
  setPreloadOverlay(
    true,
    0.05,
    'Khởi tạo bản đồ Backrooms Level 0...',
    'PRE-MATCH SHADER & FX WARM-UP',
    'ĐANG KIỂM THỬ ÁNH SÁNG, VẬT PHẨM & HIỆU ỨNG'
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

  map = genMap(seed);
  createMapLightmaps(map, texStore);
  world = buildWorld(scene, map, texStore, currentGfx);
  if (world.dustPoints) world.dustPoints.visible = !!fxSettings.dust;
  if (world.skirtInst) world.skirtInst.visible = !(fxSettings.postFX && Number(fxSettings.rtShadow || 0) > 0.05);

  players = {};
  let sIdx = 0;
  let routeMapIdx = 0;
  for (const r of roster) {
    const isK = r.role === 'k';
    let ox, oz;
    if (isK) {
      const archIdx = Math.max(0, ENTITY_ARCHETYPES.findIndex(a => a.id === r.id || a.kind === r.aiKind));
      const route = map.ENTITY_ROUTES?.[archIdx % (map.ENTITY_ROUTES?.length || 1)] || map.ENTITY_ROUTES?.[routeMapIdx];
      const rSpawn = route?.wps?.[0] || map.K_SPAWN;
      ox = rSpawn.x;
      oz = rSpawn.z;
      routeMapIdx++;
    } else {
      const spawn = map.SPOTS[(map.SPOTS.indexOf(map.SPAWN) + sIdx * 3) % map.SPOTS.length] || map.SPAWN;
      ox = spawn.x + (sIdx % 2 === 0 ? -0.9 : 0.9);
      oz = spawn.z + (sIdx < 2 ? 0.6 : -0.8);
    }

    players[r.id] = {
      id: r.id,
      name: r.name,
      role: r.role,
      aiKind: r.aiKind || 'bacteria',
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
      carrying: null,
      swingT: 0,
      reveal: false,
      inv: { water: 2, scan: 1, jelly: 0, ration: 0, flare: 1 } // Starter gear: 2 Almond Water + 1 Scanner + 1 UV Flare
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
      const arch = ENTITY_ARCHETYPES.find(a => a.id === entry.id || a.kind === entry.aiKind) || ENTITY_ARCHETYPES[idx % ENTITY_ARCHETYPES.length];
      const route = map.ENTITY_ROUTES?.find(rt => rt.id === arch.id || rt.kind === arch.kind) || map.ENTITY_ROUTES?.[idx];
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
  camera.far = amK ? FAR_KILLER : FAR_SURV;
  camera.fov = amK ? 86 : 80;
  camera.updateProjectionMatrix();
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
  } finally {
    warmingMatch = false;
    setPreloadOverlay(false);
  }

  matchTime = 0;
  inMatch = true;
  lobbyScr.classList.add('hidden');
  endScr.classList.add('hidden');
  pauseScr.classList.add('hidden');
  hud.classList.remove('hidden');
  updateHUD(0, fpsCap || 60);

  pushFeed(amK ? 'Bạn là Thực thể Backrooms! Tầm nhìn hạn chế — Hãy săn tìm âm thanh!' : `Băng ghi hình bắt đầu! Sửa ${NEED} máy & theo dây mũi tên dưới sàn để thoát!`, '#f5e69a');
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
            const h = Math.abs(dx) > Math.abs(dz) * 1.4 ? (dx > 0 ? 'Đông' : 'Tây')
              : Math.abs(dz) > Math.abs(dx) * 1.4 ? (dz > 0 ? 'Nam' : 'Bắc')
              : `${dz > 0 ? 'Nam' : 'Bắc'}-${dx > 0 ? 'Đông' : 'Tây'}`;
            return h;
          };
          const info = nearT.map(t => `${t.code} ${t.symbol} (${Math.round(Math.hypot(t.x - p.x, t.z - p.z))}m ${dirName(t.x - p.x, t.z - p.z)})`).join(' • ');
          broadcastEvent({ ev: 'relicMsg', text: info ? `Định vị A-Sync: ${info}` : 'Các máy chính đã sửa xong! Tìm Cổng Thoát Bắc/Nam!', color: '#7ce8ff' });
        } else if (rel.kind === 'vhs_tape') {
          broadcastEvent({ ev: 'vhsReveal', dur: 14, text: 'Băng VHS #KV-31: Hiện vị trí Máy & Cổng Thoát (14s)!', color: '#ffe066' });
        } else {
          for (const ctrl of aiControllers) {
            const ent = players[ctrl.id];
            if (ent && Math.hypot(ent.x - p.x, ent.z - p.z) < 48) ctrl.scramble(11);
          }
          broadcastEvent({ ev: 'relicMsg', text: 'Đài Băng Lỗi 1990 phát nhiễu — Giảm 48% tầm phát hiện Thực thể (11s)!', color: '#e47cff' });
        }
      }
      return;
    }
    const pool = msg.kind === 'water' ? map.WATERS
      : msg.kind === 'scan' ? map.SCANS
      : msg.kind === 'jelly' ? map.JELLIES
      : msg.kind === 'ration' ? map.RATIONS
      : map.FLARES;
    const item = pool.find(i => i.id === msg.id && !i.gone);
    if (item && Math.hypot(item.x - p.x, item.z - p.z) < 3.0) {
      item.gone = true;
      p.inv[msg.kind] = (p.inv[msg.kind] || 0) + 1;
      broadcastEvent({ ev: 'itemGone', kind: msg.kind, id: item.id, by: actorId });
    }
  } else if (msg.act === 'useItem') {
    const k = msg.kind;
    if ((p.inv[k] || 0) <= 0) return;
    p.inv[k]--;
    if (k === 'water') {
      if (p.hp < 2) p.hp = 2;
      p.state = 'ok';
      broadcastEvent({ ev: 'sfx', kind: 'consume', item: 'water', x: p.x, z: p.z, who: actorId });
    } else if (k === 'scan') {
      broadcastEvent({ ev: 'scanStart', by: actorId, x: p.x, z: p.z });
    } else if (k === 'jelly') {
      broadcastEvent({ ev: 'sfx', kind: 'consume', item: 'jelly', x: p.x, z: p.z, who: actorId });
    } else if (k === 'ration') {
      p.hp = 2;
      p.state = 'ok';
      broadcastEvent({ ev: 'sfx', kind: 'consume', item: 'ration', x: p.x, z: p.z, who: actorId });
    } else if (k === 'flare') {
      const fx = p.x - Math.sin(p.yaw) * 1.4;
      const fz = p.z - Math.cos(p.yaw) * 1.4;
      broadcastEvent({ ev: 'flare', x: fx, z: fz });
    }
  } else if (msg.act === 'taskProg') {
    const t = map.TASKS[msg.idx];
    if (!t || t.done) return;
    t.p = Math.max(t.p, Math.min(1, t.p + msg.delta));
    if (t.p >= 1 && !t.done) {
      t.done = true;
      t.p = 1;
      const doneCount = map.TASKS.filter(x => x.done).length;
      if (doneCount >= NEED) map.exitsOpen = true;
      broadcastEvent({ ev: 'taskDone', idx: t.id, doneCount, exitsOpen: map.exitsOpen });
    }
  } else if (msg.act === 'taskFail') {
    const t = map.TASKS[msg.idx];
    if (t && !t.done) {
      t.p = Math.max(0, t.p - 0.04);
      broadcastEvent({ ev: 'sfx', kind: 'spark', x: t.x, z: t.z });
    }
  } else if (msg.act === 'selfUnhook') {
    const othersAlive = Object.values(players).filter(x => x.id !== p.id && x.role === 's' && x.state !== 'dead' && x.state !== 'escaped').length;
    if (othersAlive === 0 && p.state === 'hooked' && p.hookIdx >= 0) {
      const h = map.HOOKS[p.hookIdx];
      if (h) h.occ = null;
      p.state = 'ok';
      p.hp = 1;
      p.hookIdx = -1;
      broadcastEvent({ ev: 'unhooked', id: p.id, hookIdx: h ? h.id : 0, x: p.x, z: p.z });
    }
  } else if (msg.act === 'unhook') {
    const h = map.HOOKS[msg.hookIdx];
    if (h && h.occ && players[h.occ]) {
      const victim = players[h.occ];
      victim.state = 'ok';
      victim.hp = 1;
      victim.hookIdx = -1;
      h.occ = null;
      broadcastEvent({ ev: 'unhooked', id: victim.id, hookIdx: h.id, x: h.x, z: h.z });
    }
  } else if (msg.act === 'revive') {
    const t = players[msg.targetId];
    if (t && t.state === 'down') {
      t.state = 'ok';
      t.hp = 1;
      broadcastEvent({ ev: 'sfx', kind: 'consume', item: 'water', x: t.x, z: t.z });
    }
  } else if (msg.act === 'escape') {
    p.state = 'escaped';
    broadcastEvent({ ev: 'escaped', id: p.id });
    checkMatchEnd();
  } else if (msg.act === 'trapDisarm') {
    const tr = map.TRAPS[msg.idx];
    if (tr && !tr.sprung) {
      tr.sprung = true;
      broadcastEvent({ ev: 'trapSprung', idx: msg.idx, x: tr.x, z: tr.z });
    }
  } else if (msg.act === 'kSwing') {
    if (p.role !== 'k') return;
    p.swingT = 1.0;
    broadcastEvent({ ev: 'sfx', kind: 'swing', x: p.x, z: p.z });
    // Check Survivor hit in forward cone
    for (const s of Object.values(players)) {
      if (s.role !== 's' || s.state !== 'ok') continue;
      const d = Math.hypot(s.x - p.x, s.z - p.z);
      if (d < 2.25 && !blocked(p.x, p.z, s.x, s.z, map)) {
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
      if (s.role === 's' && s.state === 'down' && Math.hypot(s.x - p.x, s.z - p.z) < 2.1) {
        s.state = 'carried';
        p.carrying = s.id;
        break;
      }
    }
  } else if (msg.act === 'kHook') {
    if (p.role !== 'k' || !p.carrying) return;
    const h = map.HOOKS[msg.hookIdx];
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
    if (p.role !== 'k' || map.TRAPS.length >= TRAP_MAX) return;
    map.TRAPS.push({ x: p.x, z: p.z, sprung: false });
    broadcastEvent({ ev: 'trapPlaced', x: p.x, z: p.z });
  }
}

function applyKillerHit(killer, victim) {
  victim.hp--;
  if (victim.hp <= 0) {
    victim.state = 'down';
    victim.bleed = BLEED;
  }
  broadcastEvent({ ev: 'hit', victimId: victim.id, killerId: killer.id, down: victim.state === 'down', x: victim.x, z: victim.z });
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
      ? `CÁC SURVIVOR ĐÃ THOÁT THÂN (${escaped.length}/${survs.length})!`
      : 'THỰC THỂ ĐÃ SĂN HẾT TOÀN BỘ NẠN NHÂN!';
    broadcastEvent({ ev: 'end', title: escaped.length > 0 ? 'TRỐN THOÁT THÀNH CÔNG' : 'BĂNG HÌNH KẾT THÚC — BỊ XÓA SỔ', desc: msg });
  }
}

function broadcastEvent(ev) {
  handleNetEvent(ev);
  if (net.isHost) net.broadcast({ t: 'ev', ...ev });
}

let revealGlobalT = 0;
function handleNetEvent(ev) {
  if (!inMatch) return;
  if (ev.ev === 'itemGone') {
    const pool = ev.kind === 'water' ? map.WATERS
      : ev.kind === 'scan' ? map.SCANS
      : ev.kind === 'jelly' ? map.JELLIES
      : ev.kind === 'ration' ? map.RATIONS
      : map.FLARES;
    const item = pool.find(i => i.id === ev.id);
    if (item) {
      item.gone = true;
      const mesh = world?.itemMeshes.get(item.id);
      if (mesh) mesh.visible = false;
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
    pushFeed(ev.text || 'Băng VHS bật — Hiện vị trí Máy & Cổng Thoát!', ev.color || '#ffe066');
  } else if (ev.ev === 'scanStart') {
    scanT = SCAN_T;
    audio.playScanPing();
    pushFeed('Máy Dò Thực Thể đang hoạt động (9s)!', '#48d0f5');
  } else if (ev.ev === 'reveal') {
    revealGlobalT = ev.dur || REVEAL_T;
    audio.playRevealStinger({ x: ev.x, y: 1.5, z: ev.z });
    pushFeed('CẢNH BÁO: Thực thể vừa dùng chiêu định vị người chơi!', '#ff5648');
  } else if (ev.ev === 'flare') {
    if (world) {
      const freePool = world.flareLightPool?.find(pl => !world.flareMeshes.some(fm => fm.light === pl));
      const fl = spawnFlareMesh(scene, ev.x, ev.z, freePool || null);
      world.flareMeshes.push(fl);
    }
    audio.playFlareHiss({ x: ev.x, y: 0.2, z: ev.z });
  } else if (ev.ev === 'hit') {
    audio.playFleshHit({ x: ev.x, y: 1.2, z: ev.z });
    audio.playScream({ x: ev.x, y: 1.4, z: ev.z });
    if (ev.victimId === myId && ev.down) {
      pushFeed('Bạn đã bị đánh gục!', '#ff4438');
    } else if (!ev.down && ev.victimId === myId) {
      pushFeed('Bị Thực thể chém trúng! Chạy ngay!', '#ff7456');
    }
  } else if (ev.ev === 'hooked') {
    audio.playHookClang({ x: ev.x, y: 2.0, z: ev.z }, false);
    const v = players[ev.id];
    pushFeed(`${v?.name || 'Đồng đội'} bị treo lên móc!`, '#ff8838');
  } else if (ev.ev === 'hookDeath') {
    audio.playHookClang({ x: ev.x, y: 2.0, z: ev.z }, true);
    const v = players[ev.id];
    pushFeed(`${v?.name || 'Đồng đội'} đã hy sinh...`, '#ff3028');
  } else if (ev.ev === 'unhooked') {
    const v = players[ev.id];
    pushFeed(`${v?.name || 'Đồng đội'} đã được cứu!`, '#4ed884');
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
    pushFeed(ev.exitsOpen ? `ĐỦ ${NEED} MÁY! CỔNG THOÁT ĐÃ MỞ — THEO VẠCH LED XANH LÁ!` : `Đã sửa xong ${map.TASKS[ev.idx].code} (${ev.doneCount}/${NEED})`, '#4ed884');
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
  } else if (ev.ev === 'escaped') {
    const v = players[ev.id];
    pushFeed(`${v?.name || 'Người chơi'} đã thoát khỏi Level 0!`, '#4ed884');
  } else if (ev.ev === 'sfx') {
    const pos = { x: ev.x, y: 1.2, z: ev.z };
    if (ev.kind === 'swing') audio.playSwing(pos);
    else if (ev.kind === 'consume') audio.playConsume(ev.item);
    else if (ev.kind === 'spark') audio.playAlertBeep();
  } else if (ev.ev === 'end') {
    matchEnded = true;
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
  for (const [id, sp] of Object.entries(snap.players)) {
    const p = players[id];
    if (!p) continue;
    if (id !== myId) {
      p.x = sp.x; p.y = sp.y; p.z = sp.z;
      p.yaw = sp.yaw; p.pitch = sp.pitch; p.spd = sp.spd;
    } else {
      // Authoritative state sync for local client
      p.hp = sp.hp;
      p.state = sp.state;
      p.carrying = sp.carrying;
      p.hookIdx = sp.hookIdx;
      p.hooks = sp.hooks;
      p.inv = sp.inv;
      if (sp.state === 'carried' || sp.state === 'hooked') {
        p.x = sp.x; p.z = sp.z;
      }
    }
    p.crouch = sp.crouch;
    p.fl = sp.fl;
    p.swingT = sp.swingT;
    p.reveal = sp.reveal;
  }
  if (snap.tasks) {
    snap.tasks.forEach((p, idx) => {
      if (map.TASKS[idx] && !map.TASKS[idx].done) {
        map.TASKS[idx].p = Math.max(map.TASKS[idx].p, p);
      }
    });
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
function updateHostSimulation(dt) {
  if (!net.isHost) return;

  // Drive ALL patrolling quadrant AI Entities
  for (const ctrl of aiControllers) {
    const aiP = players[ctrl.id];
    if (!aiP) continue;
    ctrl.update(dt, aiP, players, map, {
      onAggro(killer, targ, arch) {
        if (targ.id === myId) {
          pushFeed(`${arch?.name || killer.name} vừa phát hiện bạn ở cự ly gần!`, '#ff7456');
        }
      },
      onHit(killer, targ) {
        audio.playSwing(killer);
        applyKillerHit(killer, targ);
      },
      onPickup(killer, targ) {
        pushFeed(`${targ.name} đã bị ${killer.name} bắt!`, '#ff8838');
      },
      onHook(killer, targ, hook) {
        hookSurvivorHost(killer, targ, hook);
      }
    });
  }
  syncTaskCabinetLEDs();

  // Simple wandering AI bots for Solo Entity practice
  for (const p of Object.values(players)) {
    if (!p.isAI || p.role !== 's' || p.state !== 'ok') continue;
    let bp = botPaths.get(p.id);
    if (!bp || !bp.path.length) {
      const tgt = map.TASKS[(Math.random() * map.TASKS.length) | 0] || map.SPAWN;
      bp = { path: findGridPath(map, p.x, p.z, tgt.x, tgt.z) };
      botPaths.set(p.id, bp);
    }
    const wp = bp.path[0];
    if (wp) {
      const dx = wp[0] - p.x, dz = wp[1] - p.z;
      const d = Math.hypot(dx, dz);
      if (d < 1.2) bp.path.shift();
      else {
        const vx = (dx / d) * SPEED.SURV_WALK * 0.92;
        const vz = (dz / d) * SPEED.SURV_WALK * 0.92;
        const [nx, nz] = collide(p.x + vx * dt, p.z + vz * dt, 0.36, map, false, 0);
        p.x = nx; p.z = nz; p.yaw = Math.atan2(-vx, -vz); p.spd = SPEED.SURV_WALK * 0.92;
      }
    }
  }

  // Update downed bleed timers, hook sacrifice timers, carried positions & traps
  for (const p of Object.values(players)) {
    if (p.swingT > 0) p.swingT = Math.max(0, p.swingT - dt * 2.8);
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
        if (map.HOOKS[p.hookIdx]) map.HOOKS[p.hookIdx].occ = null;
        broadcastEvent({ ev: 'hookDeath', id: p.id, x: p.x, z: p.z });
        checkMatchEnd();
      }
    } else if (p.state === 'ok') {
      // Check active Bear Traps
      for (let i = 0; i < map.TRAPS.length; i++) {
        const tr = map.TRAPS[i];
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

  // Broadcast world snapshot (~20 Hz)
  snapAccum += dt;
  if (!net.isSolo && snapAccum >= 0.05) {
    snapAccum = 0;
    net.broadcast({
      t: 'snap',
      players,
      tasks: map.TASKS.map(t => t.p)
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
    return;
  }

  // Movement Input Vector (Keyboard + Mobile Virtual Analog Joystick)
  let inF = 0, inR = 0;
  let kbdMove = false;
  if (!busyAct) {
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

  // Chase adrenaline boost near monsters: conserves stamina + raises escape sprint speed to lose Entities cleanly
  let nearestThreatDist = 999;
  if (!isK) {
    for (const p of Object.values(players)) {
      if (p.role === 'k') {
        const d = Math.hypot(p.x - me.x, p.z - me.z);
        if (d < nearestThreatDist) nearestThreatDist = d;
      }
    }
  }
  const chaseProx = !isK && nearestThreatDist < 18
    ? Math.max(0, Math.min(1, (18 - nearestThreatDist) / 14))
    : 0;

  me.crouch = !isK && (me.state === 'down' || !!keys[DEF_KB.crouch] || mobCrouchToggle);
  const stamMinUnlock = SPEED.STAM_DRAIN * STAM_EXHAUST_RATIO;
  if (stamExhausted && stam >= stamMinUnlock) {
    stamExhausted = false;
  }
  const sprintInput = !!keys[DEF_KB.sprint] || mobSprintToggle || mobEdgeSprint;
  const trySprint = !isK && me.state === 'ok' && !me.crouch && !busyAct && sprintInput && wishLen > 0;
  const wantSprint = trySprint && !stamExhausted && stam > 0;

  if (wantSprint) {
    const drainScale = 1.0 - chaseProx * 0.42;
    stam = Math.max(0, stam - dt * drainScale);
    if (stam <= 0.02) {
      stam = 0;
      if (!stamExhausted) {
        stamExhausted = true;
        pushFeed('Kiệt sức! Giảm tốc đi bộ — Cần hồi >= 20% thể lực để chạy lại.', '#ffb84a');
      }
    }
  } else {
    const refillScale = 1.0 + chaseProx * 0.25;
    stam = Math.min(SPEED.STAM_DRAIN, stam + dt * (SPEED.STAM_DRAIN / SPEED.STAM_REFILL) * refillScale);
    if (stamExhausted && stam >= stamMinUnlock) stamExhausted = false;
  }

  // Target Ground Speed
  let groundSpd;
  if (isK) {
    groundSpd = me.carrying ? SPEED.KILLER_CARRY : killerSlowT > 0 ? SPEED.KILLER_SLOW : SPEED.KILLER_BASE;
  } else if (me.state === 'down') {
    groundSpd = SPEED.SURV_DOWN;
  } else if (me.crouch) {
    groundSpd = SPEED.SURV_CROUCH;
  } else if (wantSprint) {
    groundSpd = SPEED.SURV_SPRINT * (1.0 + chaseProx * 0.24);
  } else if (thirstT <= 0) {
    groundSpd = SPEED.SURV_THIRSTY;
  } else {
    groundSpd = SPEED.SURV_WALK * (1.0 + chaseProx * 0.14);
  }

  if (jellyBuffT > 0) groundSpd *= 1.22;
  if (!kbdMove && !wantSprint && wishLen > 0 && wishLen < 0.99) {
    groundSpd *= 0.28 + 0.72 * wishLen;
  }

  // Hold Space/Jump continuously OR tap before touchdown for super smooth Bunny-Hopping!
  if ((keys[DEF_KB.jump] || mobJumpHeld) && !scState && me.state === 'ok' && !me.crouch && !me.carrying && wishLen > 0.1) {
    if (jumpBuffer <= 0) jumpBuffer = 0.08;
  }

  const dynBhopCap = SPEED.BHOP_MAX + chaseProx * 1.2;
  const grounded = me.y <= 0.001;
  if (grounded && jumpBuffer > 0 && me.state === 'ok' && !me.crouch && !me.carrying) {
    me.vy = SPEED.JUMP_VEL;
    me.y = 0.002;
    jumpBuffer = 0;

    // Grant smooth bhop momentum boost when chaining jumps!
    const curSpd = Math.hypot(hVelX, hVelZ);
    if (wasAirborneT > 0 || curSpd > groundSpd * 0.95) {
      bhopChain++;
      const boost = Math.min(dynBhopCap, Math.max(groundSpd, curSpd) + SPEED.BHOP_BOOST);
      if (wishLen > 0.1) {
        hVelX = wishX * boost;
        hVelZ = wishZ * boost;
      }
    } else {
      bhopChain = 0;
    }
    audio.playJump(me);
  }

  if (!grounded) {
    wasAirborneT = 0.24;
    // Source-style air steering: allow crisp directional control in midair without losing forward momentum
    if (wishLen > 0.05) {
      const curSpd = Math.max(groundSpd, Math.hypot(hVelX, hVelZ));
      const steerK = 1 - Math.exp(-5.4 * dt);
      const tx = wishX * curSpd, tz = wishZ * curSpd;
      hVelX += (tx - hVelX) * steerK;
      hVelZ += (tz - hVelZ) * steerK;
    }
    me.vy -= SPEED.GRAVITY * dt;
    me.y += me.vy * dt;
    if (me.y <= 0) {
      me.y = 0;
      const impact = Math.abs(me.vy) / SPEED.JUMP_VEL;
      landTrauma = Math.min(1.0, landTrauma + impact * 0.45);
      stepSpringVel -= impact * 1.15;
      stepPulseT = 1.0;
      stepPulseAmp = Math.min(0.65, impact * 0.55);
      me.vy = 0;
      audio.playLand(me, impact);
    }
  } else {
    // Ground friction & responsive acceleration
    const curSpd = Math.hypot(hVelX, hVelZ);
    const preserveBhop = wasAirborneT > 0 && curSpd > groundSpd;
    const targetSpd = wishLen > 0 ? (preserveBhop ? curSpd : groundSpd) : 0;
    const accelK = 1 - Math.exp(-(wishLen > 0 ? 18 : 22) * dt);
    const tx = wishX * targetSpd;
    const tz = wishZ * targetSpd;
    hVelX += (tx - hVelX) * accelK;
    hVelZ += (tz - hVelZ) * accelK;
    if (wasAirborneT <= 0 && wishLen === 0) bhopChain = 0;
  }

  const prevX = me.x, prevZ = me.z;
  const [nx, nz] = collide(me.x + hVelX * dt, me.z + hVelZ * dt, isK ? 0.42 : 0.36, map, me.crouch, me.y);
  me.x = nx;
  me.z = nz;
  const actualVx = (me.x - prevX) / Math.max(dt, 1e-4);
  const actualVz = (me.z - prevZ) / Math.max(dt, 1e-4);
  me.spd = Math.hypot(actualVx, actualVz);
  me.swingT = localSwingT;

  if (landTrauma > 0) landTrauma = Math.max(0, landTrauma - dt * 2.8);

  // Surface-aware footstep spatial audio & visceral found-footage running/walking camera jolt
  if (grounded && me.spd > 0.6) {
    const strideLen = wantSprint ? 2.02 : me.crouch ? 1.12 : 1.65;
    stepPhase += (me.spd / strideLen) * Math.PI * dt;
    stepDist += me.spd * dt;
    if (stepDist >= strideLen) {
      stepDist = 0;
      stepFootSign = -stepFootSign;
      const imp = isK ? 1.32 : wantSprint ? 1.38 : me.crouch ? 0.30 : 0.64;
      stepSpringVel -= imp;
      stepPulseT = 1.0;
      stepPulseAmp = isK ? 1.24 : wantSprint ? 1.44 : me.crouch ? 0.34 : 0.68;
      landTrauma = Math.min(0.65, landTrauma + (isK ? 0.30 : wantSprint ? 0.26 : 0.12));
      audio.playFootstep(me, wantSprint, me.crouch, isK, getSurfaceAt(me.x, me.z, map));
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
  if (!isK && map.exitsOpen) {
    for (const e of map.EXITS) {
      if (Math.hypot(me.x - e.x, 0) < 2.2 && ((e.dirZ < 0 && me.z < -0.5) || (e.dirZ > 0 && me.z > N * C + 0.5))) {
        sendAction({ act: 'escape' });
        return;
      }
    }
  }

  // Camera placement + stronger visceral Found Footage running/walking camera shake & handheld tremor
  const eyeH = isK ? 1.82 : me.state === 'down' ? 0.45 : me.crouch ? 0.92 : 1.62;
  const rawMoveMix = grounded ? Math.min(1, me.spd / 4.6) : 0;
  const mixK = 1 - Math.exp(-9.5 * dt);
  smoothMoveMix += (rawMoveMix - smoothMoveMix) * mixK;
  smoothSprintMix += ((wantSprint && rawMoveMix > 0.2 ? 1 : 0) - smoothSprintMix) * mixK;

  const baseWalkAmp = isK ? 0.175 : me.crouch ? 0.052 : 0.128 + 0.138 * smoothSprintMix;
  const breatheY = Math.sin(elapsed * 1.85) * 0.011;
  // Handheld camcorder micro-tremor during movement & sprinting
  const tremorAmp = (0.014 + 0.028 * smoothSprintMix) * smoothMoveMix;
  const handTremorX = (Math.sin(elapsed * 17.3) * 0.6 + Math.cos(elapsed * 29.1) * 0.4) * tremorAmp;
  const handTremorY = (Math.cos(elapsed * 21.7) * 0.6 + Math.sin(elapsed * 33.4) * 0.4) * tremorAmp;
  const handTremorRoll = Math.sin(elapsed * 14.8 + stepPhase) * (0.012 + 0.022 * smoothSprintMix) * smoothMoveMix;

  const strideWaveY = (-0.5 + 0.5 * Math.cos(stepPhase * 2.0 - 0.65)) * baseWalkAmp * 1.18;
  const cushionDip = stepSpring * 0.82 - footPlantCurve * (0.105 * smoothSprintMix + (isK ? 0.082 : 0.044));
  const tgtBobY = THREE.MathUtils.clamp(strideWaveY * smoothMoveMix + breatheY + cushionDip + handTremorY, -0.36, 0.28);
  const tgtSwayX = Math.cos(stepPhase) * (baseWalkAmp * 0.78) * smoothMoveMix + handTremorX;
  const tgtRoll = (Math.sin(stepPhase) * (0.052 + 0.056 * smoothSprintMix) * smoothMoveMix) + footPlantCurve * 0.036 * stepFootSign + handTremorRoll;
  const tgtNod = (Math.cos(stepPhase * 2.0 - 0.45) * (0.024 + 0.036 * smoothSprintMix) * smoothMoveMix) + footPlantCurve * (0.052 * smoothSprintMix + 0.022) - stepSpring * 0.22;

  const camK = 1 - Math.exp(-14.0 * dt);
  const prevBobY = camBobY;
  const prevSwayX = camSwayX;
  const prevNod = camNod;
  camBobY += (tgtBobY - camBobY) * camK;
  camSwayX += (tgtSwayX - camSwayX) * camK;
  camRoll += (tgtRoll - camRoll) * camK;
  camNod += (tgtNod - camNod) * camK;

  // Feed active running bob/jolt camera velocity into motion blur (cleanly zero when halted!)
  const invShakeDt = 1 / Math.max(dt, 0.004);
  const moveBlurGate = THREE.MathUtils.clamp((me.spd - 0.55) / 3.0, 0, 1);
  shakeXRate = ((camSwayX - prevSwayX) * 1.25 * invShakeDt) * moveBlurGate;
  shakeYRate = (((camBobY - prevBobY) * 1.35 + (camNod - prevNod) * 3.6) * invShakeDt) * moveBlurGate;

  // Heavy smooth found-footage Camera Pan Delay Curve (weighted camcorder gimbal inertia without stretching motion blur beyond mouse stop)
  const kCam = 1 - Math.exp(-14.5 * dt);
  const dCamYaw = Math.atan2(Math.sin(me.yaw - camYaw), Math.cos(me.yaw - camYaw));
  const dCamPitch = me.pitch - camPitch;
  camYaw += dCamYaw * kCam;
  camPitch += dCamPitch * kCam;
  camRollPan += (THREE.MathUtils.clamp(-dCamYaw * 0.20, -0.072, 0.072) - camRollPan) * (1 - Math.exp(-12.5 * dt));

  camera.position.set(
    me.x + Math.cos(camYaw) * camSwayX,
    eyeH + me.y + camBobY,
    me.z - Math.sin(camYaw) * camSwayX
  );
  camera.rotation.set(camPitch - camNod, camYaw + camSwayX * 0.055, camRoll + camRollPan, 'YXZ');

  // Keep Camcorder HUD strictly fixed/locked on screen without camera shake coupling
  if (hud && hud.style.transform !== 'none') hud.style.transform = 'none';

  // Dynamic FOV scaling cleanly with speed, Entity lunge & subtle liminal breathing unease!
  const baseFov = isK ? 86 : 80;
  const speedExcess = Math.max(0, me.spd - (SPEED.SURV_WALK + 0.15));
  const bonusFov = Math.min(20, (speedExcess / Math.max(1, SPEED.SURV_SPRINT - SPEED.SURV_WALK)) * 16) + (localSwingT > 0 ? Math.sin(localSwingT * Math.PI) * 5.5 : 0);
  const targetFov = baseFov + bonusFov + (isK ? 0 : Math.sin(elapsed * 1.15) * 0.55);
  if (Math.abs(camera.fov - targetFov) > 0.05) {
    camera.fov += (targetFov - camera.fov) * (1 - Math.exp(-10 * dt));
    camera.updateProjectionMatrix();
  }

  // Blazing Pure-White Survivor Flashlight + Deeper Inertial Hand Delay Curve Following Mouse
  const flashOn = !isK && !!me.fl;
  localFlash.visible = flashOn;
  localFlashCore.visible = flashOn;
  fpFlashGroup.visible = flashOn;
  if (flashOn) {
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
        spd: me.spd, crouch: me.crouch, fl: me.fl
      });
    }
  }
}

function findBestPrompt(me) {
  if (me.role === 'k') {
    if (me.carrying) {
      for (const h of map.HOOKS) {
        if (!h.occ && Math.hypot(me.x - h.x, me.z - h.z) < 2.6) {
          return { text: '[E] Treo nạn nhân lên móc', act: () => sendAction({ act: 'kHook', hookIdx: h.id }) };
        }
      }
      return null;
    }
    for (const s of Object.values(players)) {
      if (s.role === 's' && s.state === 'down' && Math.hypot(me.x - s.x, me.z - s.z) < 2.2) {
        return { text: '[E] Nhặt nạn nhân bị gục', act: () => sendAction({ act: 'kGrab' }) };
      }
    }
    return null;
  }

  // Survivor Prompts
  // 0. Solo self-unhook struggle safeguard (when no living teammates exist)
  if (me.state === 'hooked') {
    const othersAlive = Object.values(players).filter(x => x.id !== myId && x.role === 's' && x.state !== 'dead' && x.state !== 'escaped').length;
    if (othersAlive === 0) {
      return {
        text: '[Giữ E] Tự vùng vẫy thoát khỏi Móc',
        hold: { kind: 'selfUnhook', targetId: 'self', duration: 2.6, onDone: () => sendAction({ act: 'selfUnhook' }) }
      };
    }
  }
  // 1. Rescue Hooked teammate
  for (const h of map.HOOKS) {
    if (h.occ && Math.hypot(me.x - h.x, me.z - h.z) < 2.5) {
      return {
        text: '[Giữ E] Giải cứu đồng đội trên móc',
        hold: { kind: 'unhook', targetId: h.id, duration: UNHOOK_T, onDone: () => sendAction({ act: 'unhook', hookIdx: h.id }) }
      };
    }
  }
  // 2. Revive Downed teammate
  for (const s of Object.values(players)) {
    if (s.id !== myId && s.state === 'down' && Math.hypot(me.x - s.x, me.z - s.z) < 2.3) {
      return {
        text: `[Giữ E] Sơ cứu ${s.name}`,
        hold: { kind: 'revive', targetId: s.id, duration: 4.5, onDone: () => sendAction({ act: 'revive', targetId: s.id }) }
      };
    }
  }
  // 3. Pickups (Water, Scanner, Moth Jelly, Royal Ration, UV Flare + Strange Relics)
  const itemGroups = [
    [map.WATERS, 'water', 'Nước Hạnh Nhân'],
    [map.SCANS, 'scan', 'Máy Dò Thực Thể'],
    [map.JELLIES, 'jelly', 'Thạch Bướm Đêm'],
    [map.RATIONS, 'ration', 'Khẩu Phần Hoàng Gia'],
    [map.FLARES, 'flare', 'Pháo Sáng UV']
  ];
  for (const [list, kind, label] of itemGroups) {
    for (const it of list) {
      if (!it.gone && Math.hypot(me.x - it.x, me.z - it.z) < 2.15) {
        return { text: `[E] Nhặt ${label}`, act: () => sendAction({ act: 'pickup', kind, id: it.id }) };
      }
    }
  }
  for (const rel of (map.RELICS || [])) {
    if (!rel.gone && Math.hypot(me.x - rel.x, me.z - rel.z) < 2.25) {
      return { text: `[E] Kích hoạt ${rel.label}`, act: () => sendAction({ act: 'pickup', kind: 'relic', id: rel.id }) };
    }
  }
  // 4. Breaker Box Tasks (displays unique Machine Code, Symbol & Saved %!)
  for (const t of map.TASKS) {
    if (!t.done && Math.hypot(me.x - t.x, me.z - t.z) < 2.55) {
      const pct = Math.round(t.p * 100);
      return {
        text: `[Giữ E] ${pct > 0 ? 'Tiếp tục sửa' : 'Sửa'} Máy ${t.code || ''} ${t.symbol || ''} (${pct}%${pct > 0 ? ' đã lưu' : ''})`,
        hold: { kind: 'task', targetId: t.id, duration: TASK_TIME, taskIdx: t.id }
      };
    }
  }
  // 5. Disarm Trap
  for (let i = 0; i < map.TRAPS.length; i++) {
    const tr = map.TRAPS[i];
    if (!tr.sprung && Math.hypot(me.x - tr.x, me.z - tr.z) < 2.0) {
      return {
        text: '[Giữ E] Gỡ bẫy sắt',
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
  } else {
    pBox.classList.add('hidden');
  }

  // Handle hold-E actions; fleeing/stopping ALWAYS saves existing `task.p` intact!
  const canHold = (!!keys[DEF_KB.use] || mobUseHeld) && !!prompt?.hold && (prompt.hold.kind === 'selfUnhook' || me.spd < 1.25);
  const mobUse = $('mobUseBtn');
  if (mobUse) {
    const ready = !!(prompt || busyAct);
    mobUse.classList.toggle('ready', ready);
    const label = busyAct
      ? 'ĐANG GIỮ...'
      : prompt?.text
        ? prompt.text.replace(/^\[(?:Giữ\s+)?E\]\s*/i, '')
        : 'TƯƠNG TÁC';
    const sub = busyAct ? 'Đang làm' : prompt?.hold ? 'Giữ' : prompt?.act ? 'Chạm' : 'E';
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
    if (busyAct.kind === 'task') {
      const t = map.TASKS[busyAct.taskIdx];
      const inc = dt / TASK_TIME;
      busyAct.prog = Math.min(1, Math.max(t?.p || 0, busyAct.prog) + inc);
      if (t) t.p = busyAct.prog;
      sendAction({ act: 'taskProg', idx: busyAct.taskIdx, delta: inc });
      syncTaskCabinetLEDs();
      $('actLabel').textContent = `Đang sửa Máy ${t?.code || ''} ${t?.symbol || ''}... ${Math.round(busyAct.prog * 100)}%`;
      $('actBar').style.width = `${busyAct.prog * 100}%`;
      if (busyAct.prog >= 1) busyAct = null;
    } else {
      busyAct.prog += dt / busyAct.duration;
      $('actLabel').textContent = busyAct.kind === 'unhook' ? 'Đang tháo móc...'
        : busyAct.kind === 'selfUnhook' ? 'Đang vùng thoát khỏi móc...'
        : busyAct.kind === 'revive' ? 'Đang sơ cứu...'
        : 'Đang gỡ bẫy...';
      $('actBar').style.width = `${Math.min(100, busyAct.prog * 100)}%`;
      if (busyAct.prog >= 1) {
        busyAct.onDone?.();
        busyAct = null;
      }
    }
  } else {
    aWrap.classList.add('hidden');
  }
}

function useQuickItem(slotIdx) {
  const me = players[myId];
  if (!inMatch || !me || me.role !== 's' || me.state !== 'ok') return;
  const order = ['water', 'scan', 'jelly', 'ration', 'flare'];
  const kind = order[slotIdx];
  if (!kind || (me.inv[kind] || 0) <= 0) {
    pushFeed('Không còn vật phẩm này!', '#c8b892');
    return;
  }

  // Immediate local feel + authoritative host state sync
  if (kind === 'water') {
    thirstT = Math.min(WATER_LIFE, thirstT + WATER_LIFE * 0.72);
    stam = Math.min(SPEED.STAM_DRAIN, stam + SPEED.STAM_DRAIN * 0.65);
    pushFeed('Đã uống Nước Hạnh Nhân (+HP, +Thể lực, +Khát)', '#56d892');
  } else if (kind === 'jelly') {
    stam = SPEED.STAM_DRAIN;
    jellyBuffT = 6.0;
    pushFeed('Thạch Bướm Đêm: Thể lực đầy & +22% tốc độ (6s)!', '#ffa832');
  } else if (kind === 'ration') {
    thirstT = WATER_LIFE;
    stam = SPEED.STAM_DRAIN;
    jellyBuffT = Math.max(jellyBuffT, 3.0);
    pushFeed('Khẩu Phần Hoàng Gia: Phục hồi hoàn toàn!', '#ffdc48');
  } else if (kind === 'scan') {
    scanT = SCAN_T;
  } else if (kind === 'flare') {
    pushFeed('Đã ném Pháo Sáng UV!', '#ee66ff');
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
    if (st) st.textContent = isOn ? 'BẬT' : 'TẮT';
  }
  if (mFlash) {
    mFlash.classList.toggle('active', isOn);
    const sub = mFlash.querySelector('small');
    if (sub) sub.textContent = isOn ? 'BẬT' : 'TẮT';
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
  $('fpsCounter').textContent = `${Math.round(fpsVal)} FPS`;
  $('roleBadge').textContent = isK ? 'ENTITY POV // SIGHT 50%' : 'CAM-04 // LEVEL 0';

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
  $('objText').textContent = map.exitsOpen
    ? 'CỔNG THOÁT HIỂM ĐÃ MỞ! (BẮC / NAM)'
    : `TỦ ĐIỆN: ${doneCount} / ${NEED}`;

  $('speedText').textContent = `SPD: ${me.spd.toFixed(1)} m/s${bhopChain > 0 ? `  [BHOP x${bhopChain}]` : ''}`;

  // Clear On-Screen Mission / Objective Panel + Zone Indicator + Nearest Waypoint Distance
  const curC = Math.floor(me.x / C), curR = Math.floor(me.z / C);
  const zoneHit = map.ZONES?.find(z => curC >= z.c0 && curC <= z.c1 && curR >= z.r0 && curR <= z.r1);
  const camExpoEl = $('camExpoText');
  if (camExpoEl) {
    const gainTag = zoneHit?.type === 'blackout' || zoneHit?.type === 'mb_van_tunnel' ? 'GAIN +12dB' : 'AUTO';
    camExpoEl.textContent = `1/${fpsCap > 0 ? Math.max(15, fpsCap) : 60} • F1.8 • ${gainTag}`;
  }
  const zoneNames = {
    manila: 'PHÒNG MANILA', arches: 'KHU VÒM NƯỚC', pitfalls: 'HỐ SÂU PITFALLS', huge_pitfall: 'VỰC THẲM PITFALLS',
    poolrooms: 'HỒ BƠI NGẦM', wet_concrete: 'BÊ TÔNG ẨM', blackout: 'VÙNG TẮT ĐIỆN',
    redrooms: 'PHÒNG ĐỎ DỊ THƯỜNG', colonnade: 'ĐẠI SẢNH CỘT', office: 'MÊ CUNG VĂN PHÒNG',
    crawl_bay: 'KHE HẦM THẤP', mold_utility: 'KHU KỸ THUẬT MỐC', monolith_maze: 'MÊ CUNG KHỐI VÀNG',
    async_threshold: 'NGƯỠNG CỬA A-SYNC', suburb_pitfalls: 'KHU PHỐ NGÕ CỤT', red_city: 'THÀNH PHỐ ĐỎ & ỐNG RỈ',
    null_kx_glitch: 'VÙNG LỖI NULL_KX', async_archive: 'KHO HỒ SƠ KV-31', flooded_sump: 'TRẠM BƠM NƯỚC ĐỌNG',
    breaker_vault: 'TRẠM BIẾN ÁP XANH', gravity_error: 'PHÒNG LỖI TRỌNG LỰC', ceiling_plenum: 'TRẦN SỤP & GIẾNG THANG',
    still_life_relay: 'TRẠM SÓNG STILL-LIFE', fluorescent_greenhouse: 'HÀNH LANG ĐÈN LỤC', stairwell_loop: 'CẦU THANG VÔ TẬN',
    ff1_ladder_hatch: 'HỐC THANG SẮT (FF#1)', ff1_dont_move: 'TƯỜNG DON\'T MOVE (FF#1)',
    ff1_white_gallery: 'SẢNH TRẮNG & CỬA SỔ (FF#1)', ff1_filing_corridor: 'DÃY TỦ HỒ SƠ & KEEP CLEAR (FF#1)',
    ff2_tape_kitchen: 'Ô BĂNG XANH & BẾP (FF#2)', ff2_crashed_car: 'XE HƠI ĐÂM TƯỜNG (FF#2)',
    ff2_hardwood_home: 'NHÀ SÀN GỖ & LAN CAN (FF#2)', ff2_vine_plasma: 'TỔ RỄ ĐEN & VẾT NỨT LỤC (FF#2)',
    flooded_yellow_hall: 'ĐẠI SẢNH VÀNG NGẬP NƯỚC', mb_courtyard: 'SÂN CHUNG CƯ 3 TẦNG NGẦM',
    mb_mall_atrium: 'TRUNG TÂM THƯƠNG MẠI 1990S', mb_red_skybridge: 'CẦU KÍNH ĐỎ & THÀNH PHỐ ĐÊM',
    mb_brick_alcove_hall: 'HÀNH LANG GẠCH NÂU & CỬA SỔ', mb_bicycle_tripod: 'GÓC XE ĐẠP & GIÁ BA CHÂN LỤC',
    mb_library_fan_hall: 'PHÒNG QUẠT TRẦN & GIÁ SÁCH', mb_unrealized_mural: 'BỨC TRANH TƯỜNG UNREALIZED',
    mb_diner_fridge: 'PHÒNG ĂN NEON OPEN & TỦ LẠNH', mb_van_tunnel: 'HẦM XE TẢI TRẮNG & DOLLAR GENER',
    mb_grey_basement: 'TẦNG HẦM XÁM & CỬA BĂNG XANH', mb_cctv_cove: 'HỐC CAMERA CCTV & CỬA CHUI',
    mb_dining_blue_drapes: 'PHÒNG ĂN RÈM XANH HOÀNG GIA', mb_gold_tile_blood: 'TƯỜNG GẠCH VÀNG & VẾT MÁU KÉO',
    mb_floating_wall_glitch: 'TƯỜNG TREO LƠ LỬNG & GIƯỜNG CŨI'
  };
  const zoneLabel = zoneNames[zoneHit?.type] || 'MÊ CUNG LEVEL 0';

  if (isK) {
    const aliveS = Object.values(players).filter(p => p.role === 's' && p.state !== 'dead' && p.state !== 'escaped').length;
    $('missionBox').innerHTML = `
      <div class="mission-title"><span style="white-space:nowrap">NHIỆM VỤ</span><span style="text-align:right;font-size:10px">${zoneLabel}</span></div>
      <div class="mission-step ${aliveS === 0 ? 'done' : 'active'}">▸ Săn gục toàn bộ Survivor (Còn: ${aliveS})</div>
      <div class="mission-step">▸ Nhấn [E] bắt nạn nhân gục & treo lên Móc</div>
      <div class="mission-hint">Bấm [Q] soi vị trí (${revealCD > 0 ? `${Math.ceil(revealCD)}s` : 'SẴN'}) • [R] đặt bẫy</div>`;
  } else {
    const repairDone = doneCount >= NEED;
    // Find nearest incomplete breaker box or nearest exit when unlocked
    let nearestD = Infinity, nearestAng = 0, nearestTgt = null, hintLbl = '';
    const targets = repairDone ? map.EXITS : map.TASKS.filter(t => !t.done);
    for (const tg of targets) {
      const d = Math.hypot(tg.x - me.x, tg.z - me.z);
      if (d < nearestD) { nearestD = d; nearestTgt = tg; nearestAng = Math.atan2(-(tg.x - me.x), -(tg.z - me.z)); }
    }
    if (nearestD < Infinity) {
      const rel = Math.atan2(Math.sin(nearestAng - me.yaw), Math.cos(nearestAng - me.yaw));
      const arrow = Math.abs(rel) < 0.55 ? '↑ THẲNG' : rel > 0.55 && rel < 2.4 ? '← TRÁI' : rel < -0.55 && rel > -2.4 ? '→ PHẢI' : '↓ SAU';
      const tSym = !repairDone && nearestTgt?.code ? ` ${nearestTgt.code} ${nearestTgt.symbol}` : '';
      hintLbl = `${repairDone ? 'CỔNG THOÁT' : `MÁY${tSym}`}: ${Math.round(nearestD)}m (${arrow})`;
    }
    $('missionBox').innerHTML = `
      <div class="mission-title"><span style="white-space:nowrap">NHIỆM VỤ</span><span style="text-align:right;font-size:10px">${zoneLabel}</span></div>
      <div class="mission-step ${repairDone ? 'done' : 'active'}">${repairDone ? '✓' : '1.'} Sửa ${NEED} Tủ Điện (${doneCount}/${NEED}) — Giữ [E]</div>
      <div class="mission-step ${repairDone ? 'active' : ''}">2. Theo dây mũi tên sàn → Cổng Bắc / Nam</div>
      <div class="mission-hint">${hintLbl || 'Theo dây mũi tên trên sàn để tìm máy'} • [M] Đổi nhạc</div>`;
  }

  // Team list with distinct survivor colors ONLY (hide all Entity / Killer rows from POV HUD!)
  const teamHtml = Object.values(players).filter(p => p.role !== 'k').map(p => {
    const col = `#${SURV_COLORS[p.colorIdx % SURV_COLORS.length].hex.toString(16).padStart(6, '0')}`;
    const st = p.state === 'escaped' ? 'THOÁT'
      : p.state === 'dead' ? 'CHẾT'
      : p.state === 'hooked' ? 'BỊ MÓC'
      : p.state === 'down' ? 'GỤC'
      : p.hp === 1 ? 'THƯƠNG' : 'KHỎE';
    return `<div class="team-row" style="border-left-color:${col};">
      <span>${esc(p.name)}</span>
      <span style="color:${p.hp === 1 || p.state === 'down' ? '#ff7a6e' : '#e6d27a'};">${st}</span>
    </div>`;
  }).join('');
  $('teamList').innerHTML = teamHtml;

  // Vitals Box
  if (isK) {
    $('vitalsBox').innerHTML = `
      <div class="v-row"><div class="v-head"><span>Chiêu [Q] Soi Vị Trí</span><span>${revealCD > 0 ? `${Math.ceil(revealCD)}s` : 'SẴN SÀNG'}</span></div></div>
      <div class="v-row"><div class="v-head"><span>Chiêu [R] Đặt Bẫy Sắt</span><span>${trapCD > 0 ? `${Math.ceil(trapCD)}s` : `${map.TRAPS.length}/${TRAP_MAX}`}</span></div></div>
      <div class="v-row" style="font-size:11px;color:#c8bfa0;">Click trái: Chém • [E]: Nhặt / Treo móc</div>`;
    $('invBar').innerHTML = '';
  } else {
    const stamPct = Math.round((stam / SPEED.STAM_DRAIN) * 100);
    const thirstPct = Math.round((thirstT / WATER_LIFE) * 100);
    const stamLbl = stamExhausted ? `<span style="color:#ff9442;">${stamPct}% (KIỆT SỨC - CHỜ 20%)</span>` : `<span>${stamPct}%</span>`;
    const stamCol = stamExhausted ? '#ff6a38' : '#48d0f5';
    $('vitalsBox').innerHTML = `
      <div class="v-row"><div class="v-head"><span>Máu (HP)</span><span style="color:${me.hp > 1 ? '#4ed884' : '#ff5648'};">${me.hp} / 2</span></div></div>
      <div class="v-row"><div class="v-head"><span>Thể lực</span>${stamLbl}</div>
        <div class="bar-bg" style="position:relative;"><div class="bar-fg" style="width:${stamPct}%;background:${stamCol};"></div><div style="position:absolute;left:20%;top:0;bottom:0;width:2px;background:rgba(255,255,255,0.65);"></div></div></div>
      <div class="v-row"><div class="v-head"><span>Cơn khát</span><span>${thirstPct}%</span></div>
        <div class="bar-bg"><div class="bar-fg" style="width:${thirstPct}%;background:#56d892;"></div></div></div>`;

    const slots = [
      ['1', 'water', 'Hạnh Nhân'],
      ['2', 'scan', 'Máy Dò'],
      ['3', 'jelly', 'Thạch Bướm'],
      ['4', 'ration', 'Khẩu Phần'],
      ['5', 'flare', 'Pháo UV']
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
    if (swSub) swSub.textContent = swingCD > 0 ? `${swingCD.toFixed(1)}s` : 'Sẵn sàng';
    const rvSub = $('mobRevealBtn')?.querySelector('small');
    if (rvSub) rvSub.textContent = revealCD > 0 ? `${Math.ceil(revealCD)}s` : 'Q';
    const trSub = $('mobTrapBtn')?.querySelector('small');
    if (trSub) trSub.textContent = trapCD > 0 ? `${Math.ceil(trapCD)}s` : `${map.TRAPS.length}/${TRAP_MAX}`;
  } else {
    $('mobSprintBtn')?.classList.toggle('active', mobSprintToggle);
    $('mobCrouchBtn')?.classList.toggle('active', mobCrouchToggle);
  }
}

// ---------- Visual Wall-Through Reveal / Scan / Flare Markers ----------
function ensureBeaconCount(n) {
  while (beaconPool.length < n) {
    const m = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.28, 0),
      new THREE.MeshBasicMaterial({ color: 0xff3628, wireframe: true, depthTest: false, transparent: true, opacity: 0.9 })
    );
    m.renderOrder = 999;
    scene.add(m);
    beaconPool.push(m);
  }
}

function updateRevealMarkers(elapsed) {
  const me = players[myId];
  if (!me) return;
  const targets = [];

  if (me.role === 's') {
    // Show Entity outline during EMF Scanner OR if any Entity steps near an active UV Flare!
    for (const k of Object.values(players)) {
      if (k.role !== 'k') continue;
      let illuminatedByFlare = false;
      if (world) {
        for (const f of world.flareMeshes) {
          if (Math.hypot(f.group.position.x - k.x, f.group.position.z - k.z) < 12) {
            illuminatedByFlare = true; break;
          }
        }
      }
      if (scanT > 0 || illuminatedByFlare) targets.push({ x: k.x, z: k.z, color: 0x48d0f5 });
    }
    if (vhsRevealT > 0) {
      for (const tg of (map.exitsOpen ? map.EXITS : map.TASKS.filter(t => !t.done))) {
        targets.push({ x: tg.x, z: tg.z, color: map.exitsOpen ? 0x38f288 : 0xffe066 });
      }
    }
  } else if (me.reveal || revealGlobalT > 0) {
    // Killer sees Survivor outlines during Reveal [Q]
    for (const p of Object.values(players)) {
      if (p.role === 's' && p.state !== 'dead' && p.state !== 'escaped') {
        targets.push({ x: p.x, z: p.z, color: 0xff3628 });
      }
    }
  }

  ensureBeaconCount(targets.length);
  for (let i = 0; i < beaconPool.length; i++) {
    const b = beaconPool[i];
    if (i < targets.length) {
      b.visible = true;
      b.position.set(targets[i].x, 1.4 + Math.sin(elapsed * 4) * 0.15, targets[i].z);
      b.rotation.y = elapsed * 2.5;
      b.material.color.setHex(targets[i].color);
    } else {
      b.visible = false;
    }
  }
}

// ---------- Input Event Listeners ----------
window.addEventListener('keydown', (e) => {
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

  keys[e.code] = true;
  if (!inMatch || paused) return;

  if (e.code === DEF_KB.light) {
    toggleFlashlight();
  } else if (e.code === DEF_KB.use) {
    triggerLocalUseTap();
  } else if (e.code === DEF_KB.reveal) {
    triggerKillerReveal();
  } else if (e.code === DEF_KB.trap) {
    triggerKillerTrap();
  } else if (e.code === 'Digit1') useQuickItem(0);
  else if (e.code === 'Digit2') useQuickItem(1);
  else if (e.code === 'Digit3') useQuickItem(2);
  else if (e.code === 'Digit4') useQuickItem(3);
  else if (e.code === 'Digit5') useQuickItem(4);
  else if (e.code === 'KeyM') {
    const lbl = audio.nextTrack();
    pushFeed(`♪ Băng nhạc: ${lbl}`);
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
});
window.addEventListener('blur', () => {
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
  } else if (inMatch && !matchEnded && !location.hash.includes('test') && !isMobileUiActive()) {
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
  if (!inMatch || paused || matchEnded || isMobileUiActive()) return;
  if (e.target && e.target.closest?.('.screen, button, select, input, a, #mobileControls, #mobLookPad, #invBar')) return;
  audio.ensureContext();
  if (document.pointerLockElement !== renderer.domElement) {
    document.body.style.cursor = 'none';
    requestLock();
    return;
  }
  if (e.button === 0) triggerKillerSwing();
});

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
    pushFeed(ok ? 'Đã copy link phòng!' : `Link mời: ${url}`, ok ? '#4ed884' : '#ffe066');
    $('copyLinkBtn').textContent = ok ? 'Đã Copy!' : 'Xem Feed Link';
    setTimeout(() => { $('copyLinkBtn').textContent = 'Copy Link Mời'; }, 1500);
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

const resetFxToPreset = () => setGraphicsPreset(currentGfx, true);
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
    pushFeed(`♪ Băng nhạc: ${lbl}`);
  });
}
bindMobileControls();

const exitToLobby = () => {
  inMatch = false;
  paused = false;
  matchEnded = false;
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

function animate(now) {
  requestAnimationFrame(animate);

  // Respect 24 (Cinema) / 30 / 60 / 120 / Unlimited FPS Limiter smoothly across any monitor Hz
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
  const instFps = rawDt > 0 ? 1 / rawDt : 60;
  fpsSmooth += (instFps - fpsSmooth) * 0.1;

  const elapsed = now * 0.001;
  // Scale turn-hold window cleanly by frame interval so 24FPS still keeps crisp turn blur & stops on halt
  const turnHoldMs = fpsCap > 0 ? Math.max(42, Math.min(85, (1000 / fpsCap) * 1.35)) : 42;
  if (now - lastCamTurnAt > turnHoldMs) {
    turnYawRate = 0;
    turnPitchRate = 0;
  } else {
    turnYawRate *= Math.exp(-13.0 * dt);
    turnPitchRate *= Math.exp(-13.0 * dt);
  }

  if (warmingMatch) return;

  if (inMatch && map && world) {
    matchTime += dt;
    updateHostSimulation(dt);
    updateLocalPlayer(dt, elapsed);

    const me = players[myId];
    const isK = me?.role === 'k';

    // Update remote characters & lighting
    for (const [id, av] of Object.entries(avatars)) {
      const p = players[id];
      if (!p) continue;
      av.group.visible = p.state !== 'dead' && p.state !== 'escaped';
      if (!av.group.visible) continue;
      av.group.position.set(p.x, p.y || 0, p.z);
      av.group.rotation.y = p.yaw || 0;
      if (p.role === 'k') animateEntity(av, dt, p, elapsed);
      else animateSurvivor(av, dt, p, elapsed);
    }

    const killers = Object.values(players).filter(p => p.role === 'k');
    updateWorldLighting(world, map, camera.position, elapsed, killers.map(k => ({ x: k.x, z: k.z })));

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
    if (me && killers.length && !isK) {
      for (const kr of killers) {
        const d = Math.hypot(kr.x - me.x, kr.z - me.z);
        if (d < entityDist) {
          entityDist = d;
          entityVisible = d < 26 && !blocked(me.x, me.z, kr.x, kr.z, map);
        }
      }
    } else if (me && isK) {
      for (const s of Object.values(players)) {
        if (s.role === 's' && s.state === 'ok') {
          const d = Math.hypot(s.x - me.x, s.z - me.z);
          if (d < entityDist) {
            entityDist = d;
            entityVisible = d < 18 && !blocked(me.x, me.z, s.x, s.z, map);
          }
        }
      }
    }

    const panic = isK
      ? (entityVisible ? 0.35 : 0.05)
      : Math.max(me.hp === 1 ? 0.35 : 0, Math.min(1, 1 - (entityDist - 3) / 18));

    // Extreme POV camera earthquake + VHS signal breakdown when Entity approaches closely
    let frameShakeX = paused ? 0 : shakeXRate;
    let frameShakeY = paused ? 0 : shakeYRate;
    if (!isK && entityDist < 19) {
      const q = Math.pow(Math.max(0, 1 - (entityDist - 2.5) / 16.5), 1.55);
      const posAmp = q * 0.068;
      const rotAmp = q * 0.042;
      const qYaw = Math.cos(elapsed * 58.2);
      const qPitch = Math.sin(elapsed * 67.4);
      camera.position.x += (Math.sin(elapsed * 53.7) * 0.6 + Math.cos(elapsed * 89.3) * 0.4) * posAmp;
      camera.position.y += (Math.cos(elapsed * 61.1) * 0.7 + Math.sin(elapsed * 97.9) * 0.3) * posAmp;
      camera.position.z += Math.sin(elapsed * 71.3) * posAmp * 0.5;
      camera.rotation.x += qPitch * rotAmp;
      camera.rotation.y += qYaw * rotAmp;
      camera.rotation.z += Math.sin(elapsed * 49.5) * (rotAmp * 1.25);
      if (!paused) {
        frameShakeX += qYaw * q * 3.6;
        frameShakeY += qPitch * q * 3.6;
      }
    }

    fearFx.style.background = 'radial-gradient(circle, transparent 42%, rgba(160, 12, 8, 0.85) 100%)';
    fearFx.style.opacity = !isK && panic > 0.12 ? (panic * 0.75).toFixed(2) : '0';

    audio.updateListener(camera.position, me ? camYaw : 0, me ? camPitch : 0);
    const runSpeedRatio = me && !paused ? Math.min(1, (me.spd || 0) / SPEED.SURV_SPRINT) : 0;
    const stamRatio = Math.max(0, Math.min(1, stam / SPEED.STAM_DRAIN));
    const isSprintingNow = !paused && !!me && (me.spd || 0) > SPEED.SURV_WALK + 0.6;
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
      panic
    });
    const isRepairing = !!(busyAct && busyAct.kind === 'task' && !scState);
    audio.updateRepairAudio(dt, isRepairing, isRepairing ? (busyAct.prog || 0) : 0);

    // Dynamic Zone Light & Scene Atmosphere Adaptation (per-scene colors, shadow intensity, fog tint & depth!)
    if (me && !isK) {
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
      renderer.toneMappingExposure = THREE.MathUtils.lerp(0.94, 1.03, zl) * br * ((atmo.exposure || 1.06) / 1.06);
    } else if (isK) {
      scene.fog.density = FOG_KILLER;
      scene.fog.color.setHex(0x120b05);
      hemiLight.intensity = 0.26;
      ambLight.intensity = 0.10;
      renderer.toneMappingExposure = 0.94 * (Number(fxSettings.brightness) || 1.0);
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

  gfx.render(dt);
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
  assert(surv && surv.group, 'survivor_colored_avatar');

  fpClaws.setVisible(true);
  updateFPEntityClaws(fpClaws, 0.016, { elapsed: 1.5, speedRatio: 0.5, swingT: 0.45 });
  assert(fpClaws.left.fingers.length === 4 && fpClaws.left.fingers[0].midGroup && fpClaws.left.pivot.position.y !== 0, 'fp_articulated_hand_overhead');
  fpClaws.setVisible(false);

  const prevGfx = currentGfx;
  const prevFpsCap = fpsCap;
  const prevAspect = aspectMode;
  assert(
    currentGfx === 'ultra' && fpsCap === 15 && aspectMode === '4:3' &&
    fxSettings.rtShadow === 1.6 && fxSettings.lensCurve === 1.5 && fxSettings.motionBlur === 1.5 &&
    fxSettings.dofBlur === 1.5 && fxSettings.bloom === 1.6 && fxSettings.grain === 1.5 &&
    fxSettings.vignette === 2.0 && fxSettings.scanlines === 1.5 && fxSettings.brightness === 1.35,
    'default_settings_ultra_15fps_43_matched'
  );

  for (const k of ['mobile', 'low', 'med', 'high', 'ultra']) {
    setGraphicsPreset(k);
    assert(scene.fog.density === FOG_SURV || scene.fog.density === FOG_KILLER, `preset_parity_${k}`);
  }
  setGraphicsPreset('mobile');
  assert(
    gfx.mblurPass === null && gfx.rtShadowPass === null && !fxSettings.shadows &&
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
  setGraphicsPreset(prevGfx);

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
  assert(document.getElementById('missionBox').textContent.includes('NHIỆM VỤ'), 'mission_box_visible');
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
  gfx.update(0.016, { turnYawRate: -16.0, turnPitchRate: 0.4, speedRatio: 0.9, panic: 0.2, isKiller: false, elapsed: 1.0, nearLights: world.lightPool });
  gfx.update(0.016, { turnYawRate: -16.0, turnPitchRate: 0.4, speedRatio: 0.9, panic: 0.2, isKiller: false, elapsed: 1.02, nearLights: world.lightPool });
  assert(
    gfx.motionBlur.uniforms.get('uVelocity').value.length() > 0.16 &&
    Number(FX_CONTROLS.find(c => c.key === 'motionBlur')?.max || 0) >= 3.0,
    'motion_blur_raised_ceiling'
  );
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

  // Test Realistic Clean Camcorder HUD mode (hides gameplay UI, keeps viewfinder frame, camera stats & battery)
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

  // Test multi-layer Low-Quality Found-Footage / Stream / VOD filter presets (Clean Low, Found/VHS, VOD Low Bitrate, Hybrid 1+2+3)
  const modeSelects = document.querySelectorAll('select[data-fx-key="footageFilterMode"]');
  assert(
    modeSelects.length === 2 && fxSettings.footageFilterMode === 'off' && fxSettings.footageFilterStrength === 1.0 &&
    Array.from(modeSelects).every(el => !!el.querySelector('option[value="hybrid_all"]')),
    'footage_filter_defaults_and_ui_mounted'
  );
  for (const mode of ['clean_low', 'found_vhs', 'vod_stream', 'hybrid_all']) {
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
  }

  // Lens curvature must remain curved (never flattened out) when footage/stream filters are enabled
  const savedLensCurve = fxSettings.lensCurve;
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

  // Color grading controls: Contrast, Gamma, Hue, Saturation (tighter, subtle ranges)
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
    gfx.crtGrade.uniforms.get('uContrast').value === 1.0 &&
    gfx.crtGrade.uniforms.get('uGamma').value === 1.0 &&
    Math.abs(gfx.crtGrade.uniforms.get('uHue').value) < 1e-5 &&
    gfx.crtGrade.uniforms.get('uSaturation').value === 1.0,
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
  fxSettings.contrast = 1.0;
  fxSettings.gamma = 1.0;
  fxSettings.hue = 0;
  fxSettings.saturation = 1.0;
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

    let bestYaw = 0;
    let bestFreeDist = -1;
    for (let k = 0; k < 16; k++) {
      const a = (k / 16) * Math.PI * 2;
      const tx = map.SPAWN.x - Math.sin(a) * 3.5;
      const tz = map.SPAWN.z - Math.cos(a) * 3.5;
      const [cx2, cz2] = collide(tx, tz, 0.36, map, false, 0);
      const d = Math.hypot(cx2 - map.SPAWN.x, cz2 - map.SPAWN.z);
      if (d > bestFreeDist) { bestFreeDist = d; bestYaw = a; }
    }

    for (const entry of savedKillers) {
      entry.p.x = map.SPAWN.x + 120;
      entry.p.z = map.SPAWN.z + 120;
    }
    meAdr.x = map.SPAWN.x; meAdr.z = map.SPAWN.z; meAdr.y = 0; meAdr.vy = 0;
    meAdr.yaw = bestYaw; camYaw = bestYaw; flashYaw = bestYaw;
    meAdr.crouch = false; meAdr.state = 'ok';
    hVelX = 0; hVelZ = 0; stam = SPEED.STAM_DRAIN; stamExhausted = false;
    keys[DEF_KB.fwd] = true; keys[DEF_KB.sprint] = true;
    for (let i = 0; i < 3; i++) updateLocalPlayer(0.12, 5.0 + i * 0.12);
    const spdFar = Math.hypot(hVelX, hVelZ);
    const stamDropFar = SPEED.STAM_DRAIN - stam;

    if (savedKillers.length > 0) {
      savedKillers[0].p.x = map.SPAWN.x + 2.5;
      savedKillers[0].p.z = map.SPAWN.z;
    }
    meAdr.x = map.SPAWN.x; meAdr.z = map.SPAWN.z; meAdr.y = 0; meAdr.vy = 0;
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
    applyCameraLookDelta(60, -25, 0.0052);
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

  gfx.render(0.016);

  // Expose live debug handle for automated Playtest/Playwright verification
  window.__BR_DEBUG = {
    camera,
    gfx,
    audio,
    getMe: () => players[myId],
    getMap: () => map,
    getAI: () => aiControllers,
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
  const joinCode = params.get('room');
  if (joinCode) {
    $('joinCodeInput').value = joinCode;
    net.joinOnlineRoom(joinCode, $('nameInput').value);
  }

  requestAnimationFrame(animate);

  if (location.hash.includes('test')) {
    try {
      await runSelfTests();
    } catch (err) {
      console.error('SELFTEST FAIL:', err);
      window.__BACKROOMS_TEST_ERROR = err.message;
    }
  }
})();
