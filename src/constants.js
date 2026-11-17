/*!
 * Copyright (c) 2026 Vendreith (Original Code & Procedural Implementation).
 * Adapted Backrooms level/entity concepts & lore: licensed under CC BY-SA 3.0.
 * Licensing & attribution: see LICENSE.md, ATTRIBUTION.md, and THIRD_PARTY_NOTICES.md
 */

// ---------- Core Backrooms Constants & Balanced Gameplay Config ----------
import { FPS_DEFAULTS, TACTICAL_LIMITS } from './fps/profiles.js';

export const C = 3.8;          // 3.8m grid cell -> spacious corridors with 1.04m thick block walls
export const WALL_HALF_T = 0.52; // 1.04m thick monolithic block walls!
export const WH = 4.2;         // 4.2m ceiling height for grander liminal scale
export const N = 124;          // 124x124 grid => 471.2m x 471.2m (~222,000 m² bounded infinite Complex!)
export const S = N * C + 12;
export const MID = (N * C) / 2;

export const NTASK = 14;
export const NEED = 6;
export const TASK_TIME = 18;
export const STAM_EXHAUST_RATIO = 0.20; // Must recover >= 20% stamina while walking before sprinting again

export const TASK_SYMBOLS = [
  { code: 'A-01', sym: '⚡', label: 'ĐIỆN ÁP', col: '#ffd24a', hex: 0xffd24a },
  { code: 'A-02', sym: '◈', label: 'BIẾN TẦN', col: '#48d0f5', hex: 0x48d0f5 },
  { code: 'B-03', sym: '⌬', label: 'NGƯỠNG KV31', col: '#56e892', hex: 0x56e892 },
  { code: 'B-04', sym: '△', label: 'TRẠM BƠM', col: '#ff9c42', hex: 0xff9c42 },
  { code: 'C-05', sym: '❖', label: 'MẠCH TỪ', col: '#d47cff', hex: 0xd47cff },
  { code: 'C-06', sym: '⊕', label: 'TẢI CHÍNH', col: '#ff6e64', hex: 0xff6e64 },
  { code: 'D-07', sym: '⌘', label: 'PHÁT SÓNG', col: '#ffe878', hex: 0xffe878 },
  { code: 'D-08', sym: '⏣', label: 'LÕI TỤ', col: '#64f0e8', hex: 0x64f0e8 },
  { code: 'E-09', sym: '✦', label: 'CẦU DAO', col: '#98f564', hex: 0x98f564 },
  { code: 'E-10', sym: '⊞', label: 'RƠ-LE', col: '#ffb65c', hex: 0xffb65c },
  { code: 'F-11', sym: '◉', label: 'ĐỒNG BỘ', col: '#ff78b8', hex: 0xff78b8 },
  { code: 'F-12', sym: '✧', label: 'CẤP NGUỒN', col: '#7cc2ff', hex: 0x7cc2ff },
  { code: 'G-13', sym: '⟁', label: 'PHỤ TẢI', col: '#ffe066', hex: 0xffe066 },
  { code: 'G-14', sym: '⬢', label: 'DỰ PHÒNG', col: '#5ef2b6', hex: 0x5ef2b6 }
];

export const GUIDE_TYPES = ['power_cable', 'conduit_track', 'hazard_tape', 'led_strip'];

export const ENTITY_ARCHETYPES = [
  {
    id: 'AI_ENT_0',
    kind: 'bacteria',
    name: 'Bacteria (Khu Tây Bắc)',
    patrolSpd: 4.4,
    chaseSpd: 4.81,
    maxChaseSpd: 5.328,
    sightRange: 32.0,
    hearRange: 23.0,
    loseTime: 3.4,
    revealCD: 42,
    quadrant: 'NW',
    desc: 'Thực thể dây thép đen A-Sync — tầm nhìn xa hành lang, tăng tốc đuổi có giới hạn, có thể mất dấu sau góc khuất.'
  },
  {
    id: 'AI_ENT_1',
    kind: 'howler',
    name: 'Howler (Khu Đông Bắc)',
    patrolSpd: 4.0,
    chaseSpd: 4.81,
    maxChaseSpd: 5.328,
    sightRange: 24.0,
    hearRange: 30.0,
    loseTime: 3.4,
    revealCD: 999,
    quadrant: 'NE',
    desc: 'Thính giác cực thính với tiếng thở gấp, bước chạy & tiếng máy; gầm hú gọi bầy đàn gần đó.'
  },
  {
    id: 'AI_ENT_2',
    kind: 'mimic',
    name: 'Still-Life (Khu Tây Nam)',
    patrolSpd: 3.9,
    chaseSpd: 4.81,
    maxChaseSpd: 5.328,
    sightRange: 29.0,
    hearRange: 19.5,
    loseTime: 3.4,
    revealCD: 999,
    beamSlows: true,
    quadrant: 'SW',
    desc: 'Săn đuổi gắt nhưng sẽ khựng nhịp nếu bạn rọi thẳng đèn pin [F] vào mặt ở cự ly gần.'
  },
  {
    id: 'AI_ENT_3',
    kind: 'nullshade',
    name: 'Null-Shade (Khu Đông Nam)',
    patrolSpd: 4.3,
    chaseSpd: 4.81,
    maxChaseSpd: 5.328,
    sightRange: 28.0,
    hearRange: 21.5,
    loseTime: 3.4,
    revealCD: 999,
    quadrant: 'SE',
    desc: 'Bóng lỗi không gian từ Null KX — đón đầu góc rẽ và gây nhiễu VHS dữ dội khi áp sát.'
  },
  {
    id: 'AI_ENT_4',
    kind: 'smiler',
    name: 'The Smiler (Kẻ Cười Đêm)',
    patrolSpd: 4.65,
    chaseSpd: 4.81,
    maxChaseSpd: 5.328,
    sightRange: 31.0,
    hearRange: 24.0,
    loseTime: 3.4,
    revealCD: 999,
    beamSlows: true,
    quadrant: 'N',
    desc: 'Nụ cười trắng rợn người lơ lửng trong bóng tối — rượt dưới tốc sprint người và chậm lại dưới tia đèn.'
  },
  {
    id: 'AI_ENT_5',
    kind: 'skin_stealer',
    name: 'Skin-Stealer (Kẻ Lột Da)',
    patrolSpd: 4.1,
    chaseSpd: 4.81,
    maxChaseSpd: 5.328,
    sightRange: 30.0,
    hearRange: 26.0,
    loseTime: 3.4,
    revealCD: 999,
    quadrant: 'E',
    desc: 'Nhái dáng hình người vá chằng chịt vết khâu — rình rập lặng lẽ rồi lao tới phục kích cực gắt.'
  },
  {
    id: 'AI_ENT_6',
    kind: 'wire_stalker',
    name: 'Wire-Stalker (Thực Thể Cáp)',
    patrolSpd: 4.25,
    chaseSpd: 4.81,
    maxChaseSpd: 5.328,
    sightRange: 35.0,
    hearRange: 22.0,
    loseTime: 3.4,
    revealCD: 999,
    quadrant: 'W',
    desc: 'Khối dây cáp công nghiệp gắn màn hình CRT xanh — mắt quét hành lang dài nhất khu vực.'
  },
  {
    id: 'AI_ENT_7',
    kind: 'duller',
    name: 'The Duller (Bóng Xám Khô)',
    patrolSpd: 4.35,
    chaseSpd: 4.81,
    maxChaseSpd: 5.328,
    sightRange: 29.0,
    hearRange: 25.0,
    loseTime: 3.4,
    revealCD: 999,
    quadrant: 'S',
    desc: 'Bóng người xám cao kều với khe mặt rách dọc và đôi tay lưỡi hái dài ngoằng chuyên cắt góc.'
  },
  {
    id: 'AI_ENT_8',
    kind: 'bacteria',
    name: 'Apex Stalker (Khu Lõi Giữa)',
    patrolSpd: 4.3,
    chaseSpd: 4.81,
    maxChaseSpd: 5.328,
    sightRange: 33.0,
    hearRange: 25.5,
    loseTime: 3.4,
    revealCD: 999,
    quadrant: 'C',
    desc: 'Biến thể A-Sync tuần tra các sảnh trống trung tâm vốn chưa từng có thực thể canh giữ.'
  },
  {
    id: 'AI_ENT_9',
    kind: 'howler',
    name: 'Echo Howler (Cánh Rìa Tây)',
    patrolSpd: 4.1,
    chaseSpd: 4.81,
    maxChaseSpd: 5.328,
    sightRange: 26.0,
    hearRange: 29.0,
    loseTime: 3.4,
    revealCD: 999,
    quadrant: 'SW',
    desc: 'Phản xạ tiếng thở nước rút & máy phát điện ở khoảng cách xa tại các hành lang trống rìa bản đồ.'
  },
  {
    id: 'AI_ENT_10',
    kind: 'skin_stealer',
    name: 'Hollow Mimic (Cánh Rìa Đông)',
    patrolSpd: 4.2,
    chaseSpd: 4.81,
    maxChaseSpd: 5.328,
    sightRange: 30.5,
    hearRange: 24.5,
    loseTime: 3.4,
    revealCD: 999,
    quadrant: 'NE',
    desc: 'Kẻ săn mồi rình rập giữa các dãy văn phòng & nhà kho phía Đông, sẵn sàng lao ra từ góc khuất.'
  }
];

/**
 * Deterministically selects a randomized subset & quadrant permutation of Entities from a seed
 * so every match surprises players with varied monsters across empty wings of the map.
 */
export function selectMatchEntities(seed = 1337, count = 9) {
  let s = (Math.floor(seed) ^ 0x9e3779b9) >>> 0;
  const rand = () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const pool = ENTITY_ARCHETYPES.map(a => ({ ...a }));
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  const quads = ['NW', 'NE', 'SW', 'SE', 'N', 'W', 'E', 'S', 'C', 'NW', 'SE'];
  for (let i = quads.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [quads[i], quads[j]] = [quads[j], quads[i]];
  }
  const n = Math.min(pool.length, Math.max(4, count));
  return pool.slice(0, n).map((arch, idx) => ({
    ...arch,
    spawnQuadrant: quads[idx % quads.length],
    spawnJitter: rand()
  }));
}
export const FREE_TIME = 4;
export const BLEED = 120;
export const MAXP = 5;

export const NHOOK = 10;
export const HOOK_T = 120;
export const UNHOOK_T = 3.5;

export const REVEAL_T = 6;
export const REVEAL_CD = 45;
export const TRAP_CD = 28;
export const TRAP_MAX = 4;
export const TRAP_LOCK = 18;
export const TRAP_R = 0.72;

export const NSCAN = 12;
export const SCAN_T = 9;
export const DISARM_KEYS = 4;
export const DISARM_T = 6;

export const CRAWL_H = 1.15;
export const NWATER = 68;
export const NJELLY = 15;
export const NRATION = 12;
export const NFLARE = 18;
export const WATER_LIFE = 240;

// ---------- Movement & Bunny-Hop Balance ----------
// Slow exploration: 76.8% of the former 3.45 m/s; sprint and Tactical remain independent.
export const SPEED = {
  SURV_WALK: 1.99,
  SURV_SPRINT: 7.4,
  SURV_CROUCH: 1.45,
  SURV_THIRSTY: 1.7,
  SURV_DOWN: 1.15,
  KILLER_BASE: 4.15,
  KILLER_SPRINT: 5.328, // 72% of ordinary human sprint; no faster ordinary pursuit
  KILLER_CARRY: 4.1,
  KILLER_SLOW: 2.5,
  STAM_DRAIN: 18.4,    // seconds of sprint; exactly twice V11, including proportional adrenaline relief
  STAM_REFILL: 6.5,    // seconds to recover from 0% to 100%
  GRAVITY: 21.0,
  JUMP_VEL: 7.1,
  BHOP_BOOST: .45,     // One fixed bonus for chained hops; never accumulated per jump.
  BHOP_MAX: 7.85       // Unmodified sprint + one .45 m/s hop allowance.
};

// ---------- View Distance (Expanded Entity Predator Awareness) ----------
export const FOG_SURV = 0.016;    // Clean cross-zone depth: see distant bright glare from darkness & dark pockets from light!
export const FOG_KILLER = 0.052;  // Expanded killer corridor sight (~26-34m)
export const FAR_SURV = 115;
export const FAR_KILLER = 64;

export const INV_SLOTS = 6;

// Distinct vibrant hazmat suit colors so Survivors stand out immediately
export const SURV_COLORS = [
  { hex: 0xe6c818, name: 'Vàng Cảnh Báo', visor: 0x22303c },
  { hex: 0xe8621a, name: 'Cam Sinh Học', visor: 0x1e2c3a },
  { hex: 0x1aa8c8, name: 'Xanh Lơ', visor: 0x162434 },
  { hex: 0xc82a38, name: 'Đỏ Khẩn Cấp', visor: 0x2a1820 },
  { hex: 0x5ec226, name: 'Xanh Độc', visor: 0x162a1e }
];

// ---------- Graphics Presets (Balanced so Low & Max give NO unfair gameplay advantage) ----------
export const GFX_PRESETS = {
  mobile: {
    label: 'Mobile (Tối ưu điện thoại)',
    pixelRatio: 0.72,
    shadows: false,
    shadowMapSize: 256,
    postFX: true,
    bloom: true,
    motionBlur: false,
    crt: true,
    rtShadow: 0.0,
    pointLights: 3,
    dustCount: 120,
    decalScale: 0.65
  },
  low: {
    label: 'Thấp (Máy yếu)',
    pixelRatio: 0.85,
    shadows: false,
    shadowMapSize: 256,
    postFX: false,
    bloom: false,
    motionBlur: false,
    crt: false,
    rtShadow: 0.0,
    pointLights: 2,
    dustCount: 80,
    decalScale: 0.45
  },
  med: {
    label: 'Trung bình',
    pixelRatio: 1.0,
    shadows: true,
    shadowMapSize: 512,
    postFX: true,
    bloom: true,
    motionBlur: false,
    crt: true,
    rtShadow: 0.0,
    pointLights: 4,
    dustCount: 200,
    decalScale: 0.75
  },
  high: {
    label: 'Cao (Khuyên dùng)',
    pixelRatio: 1.25,
    shadows: true,
    shadowMapSize: 1024,
    postFX: true,
    bloom: true,
    motionBlur: true,
    crt: true,
    rtShadow: 1.0,
    pointLights: 6,
    dustCount: 400,
    decalScale: 1.0
  },
  ultra: {
    label: 'Tối đa (Ultra CRT)',
    pixelRatio: 1.5,
    shadows: true,
    shadowMapSize: 2048,
    postFX: true,
    bloom: true,
    motionBlur: true,
    crt: true,
    rtShadow: 1.6,
    pointLights: 10,
    dustCount: 950,
    decalScale: 1.5
  }
};

export const FOOTAGE_FILTER_PRESETS = {
  off: {
    id: 0,
    label: 'Tắt (Mặc định CRT)',
    internalScale: 1.0,
    subResH: 1080,
    softUpscale: 0.0,
    taaMix: 0.0,
    softDefocus: 0.0,
    bloomBoost: 0.0,
    bloomThreshold: 0.50,
    motionBoost: 0.0,
    caBoost: 0.0,
    minLensCurve: 0.0,
    vignetteTarget: null,
    scanTarget: null,
    grainTarget: null,
    autoExpAmt: 0.0,
    gradeHaze: 0.0,
    sensorNoise: 0.0,
    compressAmt: 0.0,
    disableSharpen: false
  },
  clean_low: {
    id: 1,
    label: 'Preset 1 — Clean Low-Quality (720p Mềm)',
    internalScale: 0.72,
    subResH: 720,
    softUpscale: 0.72,
    taaMix: 0.24,
    softDefocus: 0.22,
    bloomBoost: 0.24,
    bloomThreshold: 0.44,
    motionBoost: 0.14,
    caBoost: 0.30,
    minLensCurve: 0.25,
    vignetteTarget: null,
    scanTarget: 0.0,
    grainTarget: 0.30,
    autoExpAmt: 0.10,
    gradeHaze: 0.45,
    sensorNoise: 0.28,
    compressAmt: 0.16,
    disableSharpen: true
  },
  found_vhs: {
    id: 2,
    label: 'Preset 2 — Found Footage / VHS-Lite (540p)',
    internalScale: 0.62,
    subResH: 540,
    softUpscale: 0.85,
    taaMix: 0.34,
    softDefocus: 0.28,
    bloomBoost: 0.34,
    bloomThreshold: 0.38,
    motionBoost: 0.28,
    caBoost: 0.48,
    minLensCurve: 0.45,
    vignetteTarget: null,
    scanTarget: 0.20,
    grainTarget: 0.52,
    autoExpAmt: 0.48,
    gradeHaze: 0.76,
    sensorNoise: 0.58,
    compressAmt: 0.46,
    disableSharpen: true
  },
  vod_stream: {
    id: 3,
    label: 'Preset 3 — Stream / YouTube VOD Low Bitrate',
    internalScale: 0.56,
    subResH: 480,
    softUpscale: 0.95,
    taaMix: 0.38,
    softDefocus: 0.26,
    bloomBoost: 0.40,
    bloomThreshold: 0.34,
    motionBoost: 0.22,
    caBoost: 0.36,
    minLensCurve: 0.30,
    vignetteTarget: null,
    scanTarget: 0.0,
    grainTarget: 0.18,
    autoExpAmt: 0.28,
    gradeHaze: 0.92,
    sensorNoise: 0.48,
    compressAmt: 0.95,
    disableSharpen: true
  },
  hybrid_all: {
    id: 4,
    label: 'Preset 4 — Tổng hợp 1+2+3 (Found-Stream Hybrid)',
    internalScale: 0.56,
    subResH: 480,
    softUpscale: 0.95,
    taaMix: 0.38,
    softDefocus: 0.30,
    bloomBoost: 0.42,
    bloomThreshold: 0.34,
    motionBoost: 0.28,
    caBoost: 0.48,
    minLensCurve: 0.48,
    vignetteTarget: null,
    scanTarget: 0.18,
    grainTarget: 0.50,
    autoExpAmt: 0.46,
    gradeHaze: 0.92,
    sensorNoise: 0.58,
    compressAmt: 0.95,
    disableSharpen: true
  },
  soft_dreamcam: {
    id: 5,
    label: 'Preset 5: Soft Upscale / Dreamcam',
    internalScale: 0.85,
    subResH: 720,
    softUpscale: 0.90,
    bicubicMode: 1.0,
    edgeAa: 0.85,
    lensSoftness: 0.65,
    halation: 0.25,
    chromaSoftness: 0.30,
    taaMix: 0.18,
    softDefocus: 0.32,
    bloomBoost: 0.28,
    bloomThreshold: 0.42,
    motionBoost: 0.0,
    caBoost: 0.08,
    minLensCurve: 0.22,
    vignetteTarget: null,
    scanTarget: 0.04,
    grainTarget: 0.22,
    autoExpAmt: 0.08,
    gradeHaze: 0.24,
    sensorNoise: 0.06,
    compressAmt: 0.05,
    disableSharpen: true
  }
};

export const EYE_ADAPT_PRESETS = {
  off: {
    label: 'Off (Tắt)',
    enabled: false,
    strength: 0.0,
    brightSpeed: 0.75,
    darkSpeed: 2.35,
    comp: 0.0,
    minExp: 0.42,
    maxExp: 2.45
  },
  subtle: {
    label: 'Subtle (Nhẹ)',
    enabled: true,
    strength: 0.60,
    brightSpeed: 0.60,
    darkSpeed: 1.80,
    comp: 0.0,
    minExp: 0.55,
    maxExp: 1.80
  },
  cinematic: {
    label: 'Cinematic (Chuẩn)',
    enabled: true,
    strength: 1.00,
    brightSpeed: 0.75,
    darkSpeed: 2.35,
    comp: 0.0,
    minExp: 0.42,
    maxExp: 2.45
  },
  dramatic: {
    label: 'Dramatic (Mạnh)',
    enabled: true,
    strength: 1.45,
    brightSpeed: 1.05,
    darkSpeed: 3.30,
    comp: 0.05,
    minExp: 0.34,
    maxExp: 3.10
  }
};

export const RENDER_DIST_PRESETS = {
  '50': { label: 'Low (50 m)', meters: 50 },
  '100': { label: 'Medium (100 m)', meters: 100 },
  '200': { label: 'High (200 m)', meters: 200 },
  '400': { label: 'Ultra (400 m)', meters: 400 },
  '800': { label: 'Extreme (800 m)', meters: 800 }
};

export const FX_GROUPS = [
  { id: 'movement', title: 'Movement Profile / Di chuyển', sub: 'Backrooms khám phá hoặc Tactical FPS' },
  { id: 'tactical', title: 'Tactical FPS — tinh chỉnh', sub: 'Shift đi chậm · không cộng tốc nhảy · không crouch slide' },
  { id: 'weapons', title: 'Vũ khí & trình diễn', sub: 'Phím kiểm tra, chuyển động và vị trí tay' },
  { id: 'footage', title: 'Footage & Camera', sub: 'Ống kính, Soft Upscale, Halation, Clarity & Hạt phim' },
  { id: 'exposure', title: 'Adaptive Exposure / Eye Adaptation', sub: 'Thích nghi sáng/tối điện ảnh theo độ sáng thực cảnh' },
  { id: 'rendering', title: 'Rendering & Performance', sub: 'Tầm nhìn bản đồ, AA, Đổ bóng, Nước & Mây' }
];

export const FX_CONTROLS = [
  { group: 'movement', key: 'movementProfile', label: 'Movement Profile', hint: 'Đổi cách di chuyển; giữ nguyên bộ lọc hình ảnh', type: 'select', options: [{ value: 'backrooms', label: 'Original Backrooms' }, { value: 'tactical', label: 'Tactical FPS' }] },
  ...Object.entries(TACTICAL_LIMITS).map(([key, [min, max]]) => ({ group: 'tactical', key: 'tactical_' + key, label: ({ baseSpeed: 'Tốc độ mặc định', walkMultiplier: 'Tỷ lệ đi chậm (Shift)', acceleration: 'Độ tăng tốc', braking: 'Độ dừng', airAcceleration: 'Điều hướng trên không', airControl: 'Tỷ lệ kiểm soát trên không', jumpImpulse: 'Lực nhảy', crouchMultiplier: 'Tỷ lệ tốc độ cúi', cameraIntensity: 'Chuyển động camera' })[key], hint: key === 'baseSpeed' ? 'm/s · không có sprint boost' : key === 'jumpImpulse' ? 'Không tạo thêm tốc độ ngang' : 'Tùy chỉnh trong giới hạn của phòng', type: 'range', min, max, step: ['baseSpeed','jumpImpulse'].includes(key) ? .05 : key === 'airAcceleration' ? .1 : max <= 1 ? .01 : 1, unit: 'raw' })),
  { group: 'weapons', key: 'inspectKey', label: 'Phím kiểm tra / Flex', hint: 'F giữ cho đèn pin, F2 cho dịch chuyển', type: 'select', options: [{ value: 'KeyT', label: 'T' }, { value: 'KeyV', label: 'V' }, { value: 'KeyB', label: 'B' }] },
  { group: 'weapons', key: 'inspectHold', label: 'Giữ phím kiểm tra', hint: 'Tấn công, ngắm hoặc đổi vũ khí có thể ngắt động tác', type: 'select', options: [{ value: 'chain', label: 'Nối chuỗi flex' }, { value: 'single', label: 'Chỉ một lượt' }] },
  { group: 'weapons', key: 'weaponMotion', label: 'Chuyển động tay', hint: 'Nhịp thở và sway tự động; không đổi tốc độ thao tác', type: 'range', min: 0, max: 1.5, step: .05 },
  { group: 'weapons', key: 'weaponSway', label: 'Độ trễ tay khi nhìn', hint: 'Giảm để vũ khí ổn định hơn', type: 'range', min: 0, max: 1.5, step: .05 },
  { group: 'weapons', key: 'viewmodelPosition', label: 'Vị trí tay', hint: 'Tâm ngắm ADS tự giữ thẳng hàng', type: 'select', options: [{ value: 'standard', label: 'Tiêu chuẩn' }, { value: 'close', label: 'Gần' }, { value: 'wide', label: 'Thoáng' }] },
  { group: 'footage', key: 'idleMotion', label: 'Chuyển động camera khi đứng yên', hint: 'Nhịp thở và chuyển trọng tâm rất nhẹ', type: 'select', options: [{ value: 'off', label: 'Tắt' }, { value: 'subtle', label: 'Nhẹ' }, { value: 'natural', label: 'Tự nhiên' }, { value: 'footage', label: 'Found Footage' }] },
  { group:'footage',key:'movementShake',label:'Độ rung lắc khi di chuyển / Movement Camera Shake',hint:'Độc lập với camera đứng yên; không đổi tốc độ hay va chạm',type:'range',min:0,max:3,step:.05 },
  { group:'footage',key:'handheldTremor',label:'Handheld Tremor Intensity / Vi rung tay',hint:'Vi rung nhanh 6–12 Hz; tự lọc ở FPS thấp; độc lập nhịp bước',type:'range',min:0,max:3,step:.05 },
  { group:'footage',key:'verticalBob',label:'Vertical Movement Bob / Nhịp bước dọc',hint:'Chuyển động lên xuống theo quãng đường, không đổi vật lý',type:'range',min:0,max:2.5,step:.05 },
  { group: 'footage', key: 'reducedMotion', label: 'Giảm chuyển động camera', hint: 'Giảm lắc khi di chuyển, trượt và ngắm', type: 'toggle' },
  { group: 'movement', key: 'autoBhop', label: 'Giữ Space để nhảy liên tục', hint: 'Backrooms +0,45 m/s cố định; Tactical không cộng tốc', type: 'toggle' },
  // ---- GROUP 1: Footage & Camera ----
  {
    group: 'footage',
    key: 'footageFilterMode',
    label: 'Bộ lọc Footage / Stream',
    hint: 'Low-Res • TAA • Bloom • Nén H.264/VOD',
    type: 'select',
    options: [
      { value: 'off', label: 'Tắt (Mặc định CRT)' },
      { value: 'clean_low', label: 'Preset 1: Clean Low' },
      { value: 'found_vhs', label: 'Preset 2: Found / VHS' },
      { value: 'vod_stream', label: 'Preset 3: Stream / VOD' },
      { value: 'hybrid_all', label: 'Preset 4: Tổng hợp 1+2+3' },
      { value: 'soft_dreamcam', label: 'Preset 5: Soft Upscale / Dreamcam' }
    ]
  },
  { group: 'footage', key: 'footageFilterStrength', label: 'Cường độ lọc Footage', hint: '0% - 400% (100% chuẩn preset)', type: 'range', min: 0, max: 4.0, step: 0.05 },
  { group: 'footage', key: 'upscaleSoftness', label: 'Độ mềm Tái tạo (Softness)', hint: '0% sắc - 300% mềm mịn Dreamcam', type: 'range', min: 0, max: 3.0, step: 0.05 },
  { group: 'footage', key: 'halation', label: 'Quầng sáng quang học (Halation)', hint: '0% - 250% lem sáng vùng đèn & cửa trời', type: 'range', min: 0, max: 2.5, step: 0.05 },
  { group: 'footage', key: 'clarity', label: 'Độ rõ chi tiết (Clarity)', hint: '-100% dịu mơ → 0% chuẩn → +100% sắc rõ gạch & viền', type: 'range', min: -1.0, max: 1.0, step: 0.05, unit: 'signedPct' },
  { group: 'footage', key: 'baseGrain', label: 'Grain cơ bản (Nhiễu toàn màn hình)', hint: 'Hạt nhiễu nền luôn xuất hiện đều toàn khung (0% = tắt)', type: 'range', min: 0, max: 2.0, step: 0.05 },
  { group: 'footage', key: 'grain', label: 'Hạt phim sáng (Micro-Grain)', hint: 'Hạt mịn tròn ở vùng sáng', type: 'range', min: 0, max: 1.5, step: 0.05 },
  { group: 'footage', key: 'bloom', label: 'Bloom quầng sáng đèn', hint: 'Hào quang đèn trần & UI (trần tới 350%)', type: 'range', min: 0, max: 3.5, step: 0.05 },
  { group: 'footage', key: 'lensCurve', label: 'Độ cong thấu kính CRT', hint: '0% phẳng - 150% CRT sâu - 300% mắt cá cực đại', type: 'range', min: 0, max: 3.0, step: 0.05 },
  { group: 'footage', key: 'crtScanlines', label: 'Đường cắt ngang CRT / VHS', hint: 'Tắt sọc ngang & rách băng CRT', type: 'toggle' },
  { group: 'footage', key: 'scanlines', label: 'Cường độ VHS & Sắc sai', hint: 'Sọc ngang, nhiễu băng & sắc sai', type: 'range', min: 0, max: 1.5, step: 0.05 },
  { group: 'footage', key: 'vignette', label: 'Vignette tối viền ngoài', hint: 'Viền tối ống kính đậm sâu', type: 'range', min: 0, max: 2.0, step: 0.05 },
  { group: 'footage', key: 'motionBlur', label: 'Motion Blur xoay & chạy', hint: 'Mờ khi xoay camera (trần tới 300%) & chạy', type: 'range', min: 0, max: 3.0, step: 0.05 },
  { group: 'footage', key: 'dofBlur', label: 'Mờ cảnh xa (>15m DoF)', hint: 'Xa >15m mờ dần mượt', type: 'range', min: 0, max: 1.5, step: 0.05 },
  { group: 'footage', key: 'brightness', label: 'Độ sáng (Brightness)', hint: '75% - 135%', type: 'range', min: 0.75, max: 1.35, step: 0.05 },
  { group: 'footage', key: 'contrast', label: 'Độ tương phản (Contrast)', hint: '80% - 125%', type: 'range', min: 0.80, max: 1.25, step: 0.02 },
  { group: 'footage', key: 'gamma', label: 'Gamma', hint: '80% - 125%', type: 'range', min: 0.80, max: 1.25, step: 0.02 },
  { group: 'footage', key: 'hue', label: 'Tông màu (Hue)', hint: '-35° đến +35°', type: 'range', min: -35, max: 35, step: 1, unit: 'deg' },
  { group: 'footage', key: 'saturation', label: 'Độ bão hoà màu (Saturation)', hint: '65% - 130%', type: 'range', min: 0.65, max: 1.30, step: 0.01 },

  // ---- GROUP 2: Adaptive Exposure ----
  {
    group: 'exposure',
    key: 'eyeAdaptPreset',
    label: 'Chế độ Thích nghi Ánh sáng',
    hint: 'Off • Subtle • Cinematic • Dramatic • Custom',
    type: 'select',
    options: [
      { value: 'off', label: 'Off (Tắt)' },
      { value: 'subtle', label: 'Subtle (Nhẹ)' },
      { value: 'cinematic', label: 'Cinematic (Chuẩn)' },
      { value: 'dramatic', label: 'Dramatic (Mạnh)' },
      { value: 'custom', label: 'Custom (Tùy chỉnh)' }
    ]
  },
  { group: 'exposure', key: 'eyeAdaptEnabled', label: 'Bật Eye Adaptation (Mắt thích nghi)', hint: 'Chuyển mượt từ hầm tối ra sảnh sáng & ngược lại', type: 'toggle' },
  { group: 'exposure', key: 'eyeAdaptStrength', label: 'Cường độ Thích nghi (Strength)', hint: '0% - 200% mức phản hồi sáng/tối', type: 'range', min: 0, max: 2.0, step: 0.05 },
  { group: 'exposure', key: 'eyeAdaptBrightSpeed', label: 'Tốc độ thích nghi Sáng (Dark → Bright)', hint: '0.2s nhanh - 2.5s chói dịu dần', type: 'range', min: 0.2, max: 2.5, step: 0.05, unit: 'sec' },
  { group: 'exposure', key: 'eyeAdaptDarkSpeed', label: 'Tốc độ thích nghi Tối (Bright → Dark)', hint: '0.5s - 6.0s dần thấy chi tiết trong tối', type: 'range', min: 0.5, max: 6.0, step: 0.1, unit: 'sec' },
  { group: 'exposure', key: 'eyeAdaptComp', label: 'Bù phơi sáng (Exposure Comp)', hint: '-1.5 EV tối hơn → +1.5 EV sáng hơn', type: 'range', min: -1.5, max: 1.5, step: 0.05, unit: 'ev' },
  { group: 'exposure', key: 'eyeAdaptMinExp', label: 'Giới hạn Phơi sáng Tối thiểu (Min)', hint: 'Chặn tối gắt dưới nắng (20% - 100%)', type: 'range', min: 0.20, max: 1.00, step: 0.01 },
  { group: 'exposure', key: 'eyeAdaptMaxExp', label: 'Giới hạn Phơi sáng Tối đa (Max)', hint: 'Giới hạn khuếch đại hầm tối (100% - 400%)', type: 'range', min: 1.00, max: 4.00, step: 0.10 },

  // ---- GROUP 3: Rendering & Performance ----
  {
    group: 'rendering',
    key: 'renderDistPreset',
    label: 'Mức Tầm nhìn Bản đồ (Render Dist)',
    hint: 'Low 50m • Med 100m • High 200m • Ultra 400m • Extreme 800m',
    type: 'select',
    options: [
      { value: '50', label: 'Low — 50 m' },
      { value: '100', label: 'Medium — 100 m' },
      { value: '200', label: 'High — 200 m' },
      { value: '400', label: 'Ultra — 400 m' },
      { value: '800', label: 'Extreme — 800 m' },
      { value: 'custom', label: 'Custom (Tùy chỉnh)' }
    ]
  },
  { group: 'rendering', key: 'renderDistance', label: 'Khoảng cách hiển thị (Render Distance)', hint: '50 m - 800 m tầm vẽ kiến trúc & chunk', type: 'range', min: 50, max: 800, step: 25, unit: 'm' },
  { group: 'rendering', key: 'renderScale', label: 'Độ phân giải Render', hint: '40% - 150%', type: 'range', min: 0.4, max: 1.5, step: 0.05 },
  {
    group: 'rendering',
    key: 'aaMode',
    label: 'Khử răng cưa (Anti-Aliasing)',
    hint: 'SMAA chất lượng • FXAA nhẹ • MSAA 4x phần cứng',
    type: 'select',
    options: [
      { value: 'off', label: 'Off (Tắt)' },
      { value: 'fxaa', label: 'FXAA — Performance' },
      { value: 'smaa', label: 'SMAA — Quality' },
      { value: 'msaa', label: 'MSAA — Hardware (4x)' }
    ]
  },
  { group: 'rendering', key: 'shadows', label: 'Bóng đổ đèn điểm', hint: 'Đèn pin & đèn trần', type: 'toggle' },
  { group: 'rendering', key: 'rtShadow', label: 'Shader bóng thời gian thực', hint: 'Cao & Max: bóng chân tường + SSAO', type: 'range', min: 0, max: 1.6, step: 0.05 },
  {
    group: 'rendering',
    key: 'waterQuality',
    label: 'Chất lượng Nước (Water Quality)',
    hint: 'Phản chiếu & khúc xạ hồ nước Level 37',
    type: 'select',
    options: [
      { value: 'low', label: 'Low (Nhẹ — Không probe)' },
      { value: 'med', label: 'Medium (15 Hz Probe)' },
      { value: 'high', label: 'High (30 Hz Probe)' },
      { value: 'ultra', label: 'Ultra (60 Hz + Phản chiếu)' }
    ]
  },
  {
    group: 'rendering',
    key: 'cloudQuality',
    label: 'Chất lượng Mây & Bầu trời',
    hint: 'Số bước dò mây thể tích qua cửa trời',
    type: 'select',
    options: [
      { value: 'low', label: 'Low (Nhẹ)' },
      { value: 'med', label: 'Medium (Cân bằng)' },
      { value: 'high', label: 'High (Chi tiết)' },
      { value: 'ultra', label: 'Ultra (Cực mịn)' }
    ]
  },
  { group: 'rendering', key: 'postFX', label: 'Hậu kỳ Post-Processing', hint: 'Tắt hết để tăng FPS', type: 'toggle' },
  { group: 'rendering', key: 'dust', label: 'Hạt bụi 3D không khí', hint: 'Bụi mịn trong hành lang', type: 'toggle' },
  {
    group: 'rendering',
    key: 'touchControls',
    label: 'Phím ảo & Vuốt Camera Mobile',
    hint: 'Tự động (Mobile) • Luôn bật để thử trên PC',
    type: 'select',
    options: [
      { value: 'auto', label: 'Tự động (Mobile)' },
      { value: 'on', label: 'Luôn bật (Cả trên PC)' },
      { value: 'off', label: 'Tắt' }
    ]
  },
  { group: 'rendering', key: 'cleanCamHud', label: 'Máy quay thực tế (Ẩn UI)', hint: 'Chỉ chừa viền, thông số & Pin camera', type: 'toggle' }
];

export function getPresetDefaultFx(key = 'ultra') {
  const p = GFX_PRESETS[key] || GFX_PRESETS.ultra;
  const isUltra = key === 'ultra';
  const isHigh = key === 'high';
  const isMobile = key === 'mobile';
  const aaMode = key === 'low' ? 'off' : (isMobile || key === 'med') ? 'fxaa' : isUltra ? 'msaa' : 'smaa';
  const eyePresetKey = key === 'low' ? 'off' : isMobile ? 'subtle' : isUltra ? 'dramatic' : 'cinematic';
  const ep = EYE_ADAPT_PRESETS[eyePresetKey];
  const distMeters = key === 'low' ? 50 : (isMobile || key === 'med') ? 100 : isHigh ? 200 : 800;
  const waterQ = (key === 'low' || isMobile) ? 'low' : key === 'med' ? 'med' : isHigh ? 'high' : 'ultra';
  return {
    renderScale: p.pixelRatio,
    renderDistPreset: String(distMeters),
    renderDistance: distMeters,
    aaMode,
    footageFilterMode: isUltra ? 'soft_dreamcam' : 'off',
    footageFilterStrength: isUltra ? 0.95 : 1.0,
    upscaleSoftness: isUltra ? 1.0 : 0.65,
    halation: isUltra ? 2.5 : 0.25,
    clarity: isUltra ? 1.0 : 0.0,
    shadows: !!p.shadows,
    rtShadow: p.rtShadow ?? 0.0,
    waterQuality: waterQ,
    cloudQuality: key === 'mobile' ? 'low' : key,
    postFX: !!p.postFX,
    lensCurve: p.crt ? (isUltra ? 1.5 : isMobile ? 1.0 : key === 'med' ? 0.85 : 1.02) : 0.0,
    motionBlur: p.motionBlur ? (isUltra ? 3.0 : 1.0) : 0.0,
    dofBlur: p.postFX && !isMobile ? (key === 'med' ? 0.65 : isUltra ? 1.5 : 1.0) : 0.0,
    bloom: p.bloom ? (isUltra ? 2.1 : isMobile ? 0.90 : key === 'med' ? 0.80 : 1.10) : 0.0,
    baseGrain: key === 'low' ? 0.0 : isMobile ? 0.65 : key === 'med' ? 0.75 : isUltra ? 0.25 : 0.85,
    grain: p.crt ? (isUltra ? 1.5 : isMobile ? 0.70 : key === 'med' ? 0.75 : 1.0) : 0.0,
    dust: key !== 'low',
    vignette: p.crt ? (isUltra ? 2.0 : isMobile ? 1.22 : key === 'med' ? 1.12 : 1.28) : 0.65,
    crtScanlines: !!p.crt && !isMobile,
    scanlines: p.crt ? (isUltra ? 1.5 : isMobile ? 0.55 : key === 'med' ? 0.75 : 1.0) : 0.0,
    brightness: isUltra ? 1.05 : isMobile ? 1.10 : 1.0,
    contrast: 1.0,
    gamma: isUltra ? 1.04 : 1.0,
    hue: 0,
    saturation: isUltra ? 1.17 : 1.0,
    eyeAdaptPreset: eyePresetKey,
    eyeAdaptEnabled: ep.enabled,
    eyeAdaptStrength: ep.strength,
    eyeAdaptBrightSpeed: ep.brightSpeed,
    eyeAdaptDarkSpeed: ep.darkSpeed,
    eyeAdaptComp: ep.comp,
    eyeAdaptMinExp: ep.minExp,
    eyeAdaptMaxExp: ep.maxExp,
    ...FPS_DEFAULTS,
    idleMotion: isUltra ? 'footage' : 'natural',
    movementShake: isUltra ? 1.6 : 1,
    handheldTremor: 1,
    verticalBob: 1,
    reducedMotion: typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches,
    autoBhop: isUltra,
    touchControls: 'auto',
    cleanCamHud: isUltra
  };
}

export const FPS_CAPS = [15, 24, 30, 60, 120, 0]; // 15 = VHS Tape, 24 = Cinema, 0 = Unlimited

export const DEF_KB = {
  fwd: 'KeyW',
  back: 'KeyS',
  left: 'KeyA',
  right: 'KeyD',
  sprint: 'ShiftLeft',
  crouch: 'KeyC',
  jump: 'Space',
  use: 'KeyE',
  light: 'KeyF',
  inv: 'Tab',
  check: 'Space',
  reveal: 'KeyQ',
  trap: 'KeyR'
};

export const KB_LABEL = {
  fwd: 'Đi tới',
  back: 'Lùi',
  left: 'Sang trái',
  right: 'Sang phải',
  sprint: 'Chạy nhanh',
  crouch: 'Cúi / Bò khe tường',
  jump: 'Nhảy / Bunny Hop',
  use: 'Tương tác (Sửa, Cứu, Nhặt)',
  light: 'Bật/tắt đèn pin',
  inv: 'Mở túi đồ',
  check: 'Skill check',
  reveal: 'Entity: Nhìn xuyên tường',
  trap: 'Entity: Đặt bẫy'
};

export const esc = s => String(s).replace(/[&<>"]/g, c => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'
}[c]));
