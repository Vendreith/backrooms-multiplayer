// ---------- Core Backrooms Constants & Balanced Gameplay Config ----------

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
    name: 'Bacteria (Khu Bắc)',
    patrolSpd: 4.4,
    chaseSpd: 5.55,
    sightRange: 17.5,
    hearRange: 12.5,
    loseTime: 5.0,
    revealCD: 48,
    quadrant: 'NW',
    desc: 'Thực thể dây thép đen A-Sync — tuần tra tầm xa, nghe tiếng chạy ở cự ly gần.'
  },
  {
    id: 'AI_ENT_1',
    kind: 'howler',
    name: 'Howler (Khu Đông)',
    patrolSpd: 4.0,
    chaseSpd: 5.85,
    sightRange: 11.5,
    hearRange: 16.5,
    loseTime: 4.2,
    revealCD: 999,
    quadrant: 'NE',
    desc: 'Thính giác nhạy với bước chạy & tiếng máy, nhưng thị lực yếu nếu bạn cúi im lặng.'
  },
  {
    id: 'AI_ENT_2',
    kind: 'mimic',
    name: 'Still-Life (Khu Tây)',
    patrolSpd: 3.9,
    chaseSpd: 5.35,
    sightRange: 15.5,
    hearRange: 9.5,
    loseTime: 4.5,
    revealCD: 999,
    beamSlows: true,
    quadrant: 'SW',
    desc: 'Bị khựng lại một nhịp nếu rọi thẳng đèn pin [F] vào mặt ở cự ly gần!'
  },
  {
    id: 'AI_ENT_3',
    kind: 'nullshade',
    name: 'Null-Shade (Khu Nam)',
    patrolSpd: 4.3,
    chaseSpd: 5.45,
    sightRange: 14.0,
    hearRange: 10.5,
    loseTime: 3.6,
    revealCD: 999,
    quadrant: 'SE',
    desc: 'Bóng lỗi không gian từ Null KX — gây nhiễu tín hiệu VHS mạnh khi áp sát.'
  }
];
export const FREE_TIME = 4;
export const BLEED = 120;
export const MAXP = 5;

export const NHOOK = 10;
export const HOOK_T = 120;
export const UNHOOK_T = 8;

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
// Calm/tense walking pace (3.45 m/s) while keeping full normal running speed (7.4 m/s) intact
export const SPEED = {
  SURV_WALK: 3.45,
  SURV_SPRINT: 7.4,
  SURV_CROUCH: 2.0,
  SURV_THIRSTY: 2.95,
  SURV_DOWN: 1.15,
  KILLER_BASE: 5.2,
  KILLER_CARRY: 4.1,
  KILLER_SLOW: 2.5,
  STAM_DRAIN: 6.8,     // seconds of sprint from 100% to 0%
  STAM_REFILL: 6.2,    // seconds to recover from 0% to 100%
  GRAVITY: 21.0,
  JUMP_VEL: 7.1,
  BHOP_BOOST: 0.45,    // air-strafe / timed jump momentum bonus
  BHOP_MAX: 9.2        // hard speed cap so bhop feels crisp but fair
};

// ---------- View Distance (Entity sees HALF as far as Survivors) ----------
export const FOG_SURV = 0.016;    // Clean cross-zone depth: see distant bright glare from darkness & dark pockets from light!
export const FOG_KILLER = 0.088;  // Half sight distance (~15-17m)
export const FAR_SURV = 115;
export const FAR_KILLER = 44;

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

export const FX_CONTROLS = [
  { key: 'renderScale', label: 'Độ phân giải Render', hint: '50% - 150%', type: 'range', min: 0.5, max: 1.5, step: 0.05 },
  { key: 'shadows', label: 'Bóng đổ đèn điểm', hint: 'Đèn pin & đèn trần', type: 'toggle' },
  { key: 'rtShadow', label: 'Shader bóng thời gian thực', hint: 'Cao & Max: bóng chân tường + SSAO', type: 'range', min: 0, max: 1.6, step: 0.05 },
  { key: 'postFX', label: 'Hậu kỳ Post-Processing', hint: 'Tắt hết để tăng FPS', type: 'toggle' },
  { key: 'lensCurve', label: 'Độ cong thấu kính CRT', hint: '0% phẳng - 150% cong sâu', type: 'range', min: 0, max: 1.5, step: 0.05 },
  { key: 'motionBlur', label: 'Motion Blur xoay & chạy', hint: 'Mờ khi xoay camera (trần tới 300%) & chạy', type: 'range', min: 0, max: 3.0, step: 0.05 },
  { key: 'dofBlur', label: 'Mờ cảnh xa (>15m DoF)', hint: 'Xa >15m mờ dần mượt', type: 'range', min: 0, max: 1.5, step: 0.05 },
  { key: 'bloom', label: 'Bloom quầng sáng đèn', hint: 'Hào quang đèn trần & UI', type: 'range', min: 0, max: 1.6, step: 0.05 },
  { key: 'grain', label: 'Hạt phim sáng (Micro-Grain)', hint: 'Hạt mịn tròn ở vùng sáng', type: 'range', min: 0, max: 1.5, step: 0.05 },
  { key: 'dust', label: 'Hạt bụi 3D không khí', hint: 'Bụi mịn trong hành lang', type: 'toggle' },
  { key: 'vignette', label: 'Vignette tối viền ngoài', hint: 'Viền tối ống kính đậm sâu', type: 'range', min: 0, max: 2.0, step: 0.05 },
  { key: 'scanlines', label: 'Đường quét CRT & Sắc sai', hint: 'Nhiễu băng VHS', type: 'range', min: 0, max: 1.5, step: 0.05 },
  { key: 'brightness', label: 'Độ sáng (Exposure)', hint: '75% - 135%', type: 'range', min: 0.75, max: 1.35, step: 0.05 },
  { key: 'cleanCamHud', label: 'Máy quay thực tế (Ẩn UI)', hint: 'Chỉ chừa viền, thông số & Pin camera', type: 'toggle' }
];

export function getPresetDefaultFx(key = 'ultra') {
  const p = GFX_PRESETS[key] || GFX_PRESETS.ultra;
  const isUltra = key === 'ultra';
  return {
    renderScale: p.pixelRatio,
    shadows: !!p.shadows,
    rtShadow: p.rtShadow ?? 0.0,
    postFX: !!p.postFX,
    lensCurve: p.crt ? (isUltra ? 1.5 : key === 'med' ? 0.85 : 1.02) : 0.0,
    motionBlur: p.motionBlur ? (isUltra ? 1.5 : 1.0) : 0.0,
    dofBlur: p.postFX ? (key === 'med' ? 0.65 : isUltra ? 1.5 : 1.0) : 0.0,
    bloom: p.bloom ? (isUltra ? 1.6 : key === 'med' ? 0.80 : 1.10) : 0.0,
    grain: p.crt ? (isUltra ? 1.5 : key === 'med' ? 0.75 : 1.0) : 0.0,
    dust: key !== 'low',
    vignette: p.crt ? (isUltra ? 2.0 : key === 'med' ? 1.12 : 1.28) : 0.65,
    scanlines: p.crt ? (isUltra ? 1.5 : key === 'med' ? 0.75 : 1.0) : 0.0,
    brightness: isUltra ? 1.35 : 1.0,
    cleanCamHud: false
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
