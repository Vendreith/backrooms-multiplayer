// ============================================================
// LEVEL 37: THE POOLROOMS V2 — Dense Architectural Labyrinth
// Compact Interconnected Ceramic Chambers, Arches, Columns,
// Submerged Staircases, Minimalist Water Chutes & Pump Loop
// ============================================================

export const POOL_ZONE_DEFS = [
  {
    id: 'zone_a',
    code: 'A',
    name: 'Khu A — Bể Vòm Khởi Đầu (Entrance Pools)',
    desc: 'Tiền sảnh gạch kem vòm cong dẫn thẳng xuống chuỗi bể ngọc lam trong suốt.',
    bounds: { x0: 24, z0: 24, x1: 202, z1: 214 },
    center: { x: 112, z: 116 },
    teleX: 66,
    teleZ: 66,
    teleY: 0.08,
    teleYaw: -Math.PI * 0.75,
    mood: 'warm_nostalgic',
    waterTemp: 0.08,
    fogColor: 0xdcebe4,
    fogDensity: 0.0018,
    hemiSky: 0xf7f8ee,
    hemiGround: 0x72dccb,
    hemiInt: 0.92,
    ambColor: 0xedeedf,
    ambInt: 0.50,
    exposure: 0.80
  },
  {
    id: 'zone_b',
    code: 'B',
    name: 'Khu B — Đại Sảnh Cột Tròn (Grand Atrium)',
    desc: 'Đại sảnh cột gốm tròn vòm hai tầng với hồ trung tâm và máng trượt trắng.',
    bounds: { x0: 202, z0: 24, x1: 426, z1: 222 },
    center: { x: 315, z: 126 },
    teleX: 280,
    teleZ: 126,
    teleY: 0.32,
    teleYaw: -Math.PI * 0.5,
    mood: 'bright_liminal',
    waterTemp: 0.16,
    fogColor: 0xd6ece6,
    fogDensity: 0.0016,
    hemiSky: 0xf8f9f0,
    hemiGround: 0x6ad6c8,
    hemiInt: 0.94,
    ambColor: 0xe6ece4,
    ambInt: 0.52,
    exposure: 0.82
  },
  {
    id: 'zone_c',
    code: 'C',
    name: 'Khu C — Mê Cung Hành Lang Vòm (Shallow Labyrinth)',
    desc: 'Mạng lưới hành lang ngập nước hẹp với hàng loạt vòm cong và đền bơm tròn.',
    bounds: { x0: 24, z0: 214, x1: 204, z1: 426 },
    center: { x: 114, z: 320 },
    teleX: 96,
    teleZ: 332,
    teleY: 0.35,
    teleYaw: 0,
    mood: 'clinical_mint',
    waterTemp: 0.28,
    fogColor: 0xcce8de,
    fogDensity: 0.0022,
    hemiSky: 0xf0f7f0,
    hemiGround: 0x60cebd,
    hemiInt: 0.90,
    ambColor: 0xddece4,
    ambInt: 0.48,
    exposure: 0.79
  },
  {
    id: 'zone_d',
    code: 'D',
    name: 'Khu D — Thánh Đường Bậc Thang Chìm (Sunken Cathedral)',
    desc: 'Hàng cột vòm trang nghiêm hai bên bậc thang gạch trắng ngập dần xuống làn nước.',
    bounds: { x0: 426, z0: 24, x1: 642, z1: 222 },
    center: { x: 534, z: 126 },
    teleX: 470,
    teleZ: 126,
    teleY: 0.32,
    teleYaw: -Math.PI * 0.5,
    mood: 'cool_cathedral',
    waterTemp: 0.48,
    fogColor: 0xc4e5e4,
    fogDensity: 0.0020,
    hemiSky: 0xeff8f6,
    hemiGround: 0x4dbeb8,
    hemiInt: 0.88,
    ambColor: 0xd6eae8,
    ambInt: 0.48,
    exposure: 0.79
  },
  {
    id: 'zone_e',
    code: 'E',
    name: 'Khu E — Tháp Máng Trượt Gốm (The Slides)',
    desc: 'Không gian phân tầng liên thông với 3 máng trượt gốm uốn lượn qua vòm tường.',
    bounds: { x0: 204, z0: 222, x1: 420, z1: 426 },
    center: { x: 312, z: 324 },
    teleX: 332,
    teleZ: 348,
    teleY: 0.40,
    teleYaw: Math.PI * 0.25,
    mood: 'pastel_waterpark',
    waterTemp: 0.22,
    fogColor: 0xdaeae4,
    fogDensity: 0.0018,
    hemiSky: 0xf8f8ed,
    hemiGround: 0x69d6c6,
    hemiInt: 0.92,
    ambColor: 0xe6eadf,
    ambInt: 0.50,
    exposure: 0.81
  },
  {
    id: 'zone_f',
    code: 'F',
    name: 'Khu F — Cầu Vòm Qua Giếng Sâu (Deep Abyssal Basins)',
    desc: 'Hành lang cầu hẹp xuyên qua dãy vòm trên những giếng nước sâu màu xanh lam.',
    bounds: { x0: 420, z0: 222, x1: 642, z1: 432 },
    center: { x: 531, z: 327 },
    teleX: 452,
    teleZ: 328,
    teleY: 0.32,
    teleYaw: -Math.PI * 0.5,
    mood: 'deep_abyssal',
    waterTemp: 0.86,
    fogColor: 0x92c2c6,
    fogDensity: 0.0028,
    hemiSky: 0xd8eeee,
    hemiGround: 0x267482,
    hemiInt: 0.80,
    ambColor: 0x9ec7cc,
    ambInt: 0.44,
    exposure: 0.74
  },
  {
    id: 'zone_g',
    code: 'G',
    name: 'Khu G — Phòng Triển Lãm Nghịch Lý (Impossible Gallery)',
    desc: 'Cầu đi bộ đa tầng đan chéo, vòm lệch và ban công nhô trên mặt hồ lấp lánh.',
    bounds: { x0: 192, z0: 426, x1: 366, z1: 642 },
    center: { x: 279, z: 534 },
    teleX: 278,
    teleZ: 510,
    teleY: 0.32,
    teleYaw: 0,
    mood: 'surreal_gallery',
    waterTemp: 0.36,
    fogColor: 0xd4ebe6,
    fogDensity: 0.0019,
    hemiSky: 0xf4f8f2,
    hemiGround: 0x5ccbc0,
    hemiInt: 0.90,
    ambColor: 0xe0ece6,
    ambInt: 0.49,
    exposure: 0.80
  },
  {
    id: 'zone_h',
    code: 'H',
    name: 'Khu H — Đường Hầm Bảo Trì Vòm Thấp (Flooded Maintenance)',
    desc: 'Hành lang gốm hẹp ngập nước có vòm trần thấp, khe chui và hốc đèn gián tiếp.',
    bounds: { x0: 24, z0: 426, x1: 192, z1: 642 },
    center: { x: 108, z: 534 },
    teleX: 114,
    teleZ: 521,
    teleY: 0.35,
    teleYaw: 0,
    mood: 'damp_maintenance',
    waterTemp: 0.64,
    fogColor: 0x9fc6c4,
    fogDensity: 0.0028,
    hemiSky: 0xd8eae4,
    hemiGround: 0x3b7f82,
    hemiInt: 0.82,
    ambColor: 0xa9cbc8,
    ambInt: 0.44,
    exposure: 0.75
  },
  {
    id: 'zone_i',
    code: 'I',
    name: 'Khu I — Tu Viện 5 Hồ Tĩnh Lặng (Quiet Pocket Pools)',
    desc: 'Cụm 5 bể cạn chênh cốt khép kín sau bốn vòm tròn yên tĩnh tuyệt đối.',
    bounds: { x0: 504, z0: 432, x1: 642, z1: 642 },
    center: { x: 573, z: 537 },
    teleX: 546,
    teleZ: 534,
    teleY: 0.26,
    teleYaw: -Math.PI * 0.5,
    mood: 'tranquil_dusk',
    waterTemp: 0.38,
    fogColor: 0xcbe5e8,
    fogDensity: 0.0021,
    hemiSky: 0xedf6f8,
    hemiGround: 0x55bfc2,
    hemiInt: 0.88,
    ambColor: 0xd4e8ec,
    ambInt: 0.48,
    exposure: 0.78
  },
  {
    id: 'zone_j',
    code: 'J',
    name: 'Khu J — Điện Thoát Nước & Cổng Hồi Quy (Drainage Sanctuary)',
    desc: 'Hành lang cột đôi dẫn tới Cổng Cống Khổng Lồ và Lối Thoát về Level 0.',
    bounds: { x0: 366, z0: 432, x1: 504, z1: 642 },
    center: { x: 435, z: 540 },
    teleX: 435,
    teleZ: 514,
    teleY: 0.32,
    teleYaw: Math.PI,
    mood: 'sanctuary_vault',
    waterTemp: 0.32,
    fogColor: 0xd2ece8,
    fogDensity: 0.0019,
    hemiSky: 0xf4f9f4,
    hemiGround: 0x5dcfc4,
    hemiInt: 0.91,
    ambColor: 0xdcece8,
    ambInt: 0.50,
    exposure: 0.80
  }
];

export function getPoolroomsZoneAt(x, z, map) {
  const zones = map?.POOL_ZONES || POOL_ZONE_DEFS;
  for (let i = 0; i < zones.length; i++) {
    const zDef = zones[i];
    const b = zDef.bounds;
    if (x >= b.x0 && x <= b.x1 && z >= b.z0 && z <= b.z1) {
      return zDef;
    }
  }
  let best = zones[0];
  let bestD = Infinity;
  for (let i = 0; i < zones.length; i++) {
    const dx = x - zones[i].center.x;
    const dz = z - zones[i].center.z;
    const d2 = dx * dx + dz * dz;
    if (d2 < bestD) {
      bestD = d2;
      best = zones[i];
    }
  }
  return best;
}

/**
 * Generates the Poolrooms V2 10-zone interconnected architectural labyrinth.
 * Prioritizes compact human/intimate proportions, rounded arches, round columns,
 * submerged multi-step ceramic stairs, luminous vaulted ceilings, and clean A* traversal.
 */
export function buildPoolroomsWorld({
  gN,
  gC,
  wallH,
  RECTS,
  WALLS,
  WATER_RECTS,
  PLATFORMS,
  RAMPS,
  SLIDES,
  PROPS,
  ANIM_PROPS,
  LIGHTS,
  CRAWL_WALLS
}) {
  const worldSpan = gN * gC; // 672
  const POOL_ARCH = [];

  const addWallBox = (x0, z0, x1, z1, h = wallH, y0 = 0, crawl = false) => {
    const ax0 = Math.min(x0, x1);
    const ax1 = Math.max(x0, x1);
    const az0 = Math.min(z0, z1);
    const az1 = Math.max(z0, z1);
    if (ax1 - ax0 < 0.1 || az1 - az0 < 0.1 || h < 0.1) return;
    WALLS.push({ x0: ax0, z0: az0, x1: ax1, z1: az1, y0, y1: y0 + h });
    if (crawl) {
      const r = { x0: ax0, z0: az0, x1: ax1, z1: az1, crawl: true };
      RECTS.push(r);
      if (CRAWL_WALLS) CRAWL_WALLS.push(r);
    } else if (y0 < 1.95) {
      RECTS.push({ x0: ax0, z0: az0, x1: ax1, z1: az1, crawl: false });
    }
  };

  const addWallWithOpenings = (isHorizontal, fixedCoord, span0, span1, thickness, openings = [], h = wallH) => {
    const halfT = thickness * 0.5;
    const sorted = [...openings].sort((a, b) => a[0] - b[0]);
    let cursor = span0;
    for (const op of sorted) {
      const o0 = Math.max(span0, op[0]);
      const o1 = Math.min(span1, op[1]);
      const archBottomY = op[2] ?? 3.8;
      if (o0 > cursor + 0.1) {
        if (isHorizontal) {
          addWallBox(cursor, fixedCoord - halfT, o0, fixedCoord + halfT, h, 0, false);
        } else {
          addWallBox(fixedCoord - halfT, cursor, fixedCoord + halfT, o0, h, 0, false);
        }
      }
      if (o1 > o0 + 0.1 && archBottomY < h - 0.15) {
        const isCrawl = archBottomY > 0.7 && archBottomY <= 1.65;
        if (isHorizontal) {
          addWallBox(o0, fixedCoord - halfT, o1, fixedCoord + halfT, h - archBottomY, archBottomY, isCrawl);
        } else {
          addWallBox(fixedCoord - halfT, o0, fixedCoord + halfT, o1, h - archBottomY, archBottomY, isCrawl);
        }
      }
      cursor = Math.max(cursor, o1);
    }
    if (cursor < span1 - 0.1) {
      if (isHorizontal) {
        addWallBox(cursor, fixedCoord - halfT, span1, fixedCoord + halfT, h, 0, false);
      } else {
        addWallBox(fixedCoord - halfT, cursor, fixedCoord + halfT, span1, h, 0, false);
      }
    }
  };

  const addPlat = (x0, z0, x1, z1, yTop, yBase = -2.4) => {
    PLATFORMS.push({ x0, z0, x1, z1, y: yTop, yBase, draw: true, surface: 'tile' });
  };

  const addRamp = (x0, z0, x1, z1, yStart, yEnd, dir) => {
    const axis = dir === 'e' || dir === 'w' ? 'x' : 'z';
    const reversed = dir === 'w' || dir === 'n';
    const yAtMin = reversed ? yEnd : yStart;
    const yAtMax = reversed ? yStart : yEnd;
    RAMPS.push({ x0, z0, x1, z1, axis, y0: yAtMin, y1: yAtMax, draw: true, surface: 'tile' });
  };

  const addSlide = (x0, z0, x1, z1, yTop, yBottom, dir, color = 0xe6eae0) => {
    const axis = dir === 'e' || dir === 'w' ? 'x' : 'z';
    let dirX = 0, dirZ = 0, y0 = yTop, y1 = yBottom;
    if (dir === 'e') { dirX = 1; y0 = yTop; y1 = yBottom; }
    else if (dir === 'w') { dirX = -1; y0 = yBottom; y1 = yTop; }
    else if (dir === 's') { dirZ = 1; y0 = yTop; y1 = yBottom; }
    else { dirZ = -1; y0 = yBottom; y1 = yTop; }
    SLIDES.push({ x0, z0, x1, z1, axis, y0, y1, dirX, dirZ, speed: 12.2, color });
  };

  const addWater = (x0, z0, x1, z1, waterY = -0.18, bedY = -0.95, temp = 0.25, noCoping = false) => {
    WATER_RECTS.push({ x0, z0, x1, z1, waterY, bedY, temp, noCoping });
  };

  // --- Architectural Modules (3D Curved Arches, Columns, Vaulted Coffers, Rotundas) ---
  const addArch = (x, z, span = 3.2, h = 3.9, pierW = 0.72, depth = 1.15, rotY = 0, y0 = 0, opts = {}) => {
    POOL_ARCH.push({ kind: 'arch', x, z, span, h, pierW, depth, rotY, y0, ...opts });
    if (opts.noCollide || y0 >= 1.95) return;
    const off = span * 0.5 + pierW * 0.5;
    const axisNorm = Math.abs(Math.sin(rotY));
    if (axisNorm < 0.25) {
      // Spans along X
      RECTS.push({ x0: x - off - pierW * 0.5, z0: z - depth * 0.5, x1: x - off + pierW * 0.5, z1: z + depth * 0.5, crawl: false });
      RECTS.push({ x0: x + off - pierW * 0.5, z0: z - depth * 0.5, x1: x + off + pierW * 0.5, z1: z + depth * 0.5, crawl: false });
    } else if (axisNorm > 0.92) {
      // Spans along Z
      RECTS.push({ x0: x - depth * 0.5, z0: z - off - pierW * 0.5, x1: x + depth * 0.5, z1: z - off + pierW * 0.5, crawl: false });
      RECTS.push({ x0: x - depth * 0.5, z0: z + off - pierW * 0.5, x1: x + depth * 0.5, z1: z + off + pierW * 0.5, crawl: false });
    } else {
      const cR = Math.min(pierW, depth) * 0.45;
      for (const s of [-1, 1]) {
        const px = x + Math.cos(rotY) * s * off;
        const pz = z - Math.sin(rotY) * s * off;
        RECTS.push({ x0: px - cR, z0: pz - cR, x1: px + cR, z1: pz + cR, crawl: false });
      }
    }
  };

  const addArcade = (x0, z0, x1, z1, count = 4, h = 4.0, span = 3.4, pierW = 0.68, depth = 1.0, y0 = 0, opts = {}) => {
    const alongX = Math.abs(x1 - x0) >= Math.abs(z1 - z0);
    const defaultRot = opts.straddle ? (alongX ? Math.PI * 0.5 : 0) : (alongX ? 0 : Math.PI * 0.5);
    const rotY = opts.rotY ?? defaultRot;
    const skipSet = Array.isArray(opts.skipIdx) ? new Set(opts.skipIdx) : null;
    for (let i = 0; i < count; i++) {
      if (skipSet && skipSet.has(i)) continue;
      const t = count === 1 ? 0.5 : i / (count - 1);
      const ax = x0 + (x1 - x0) * t;
      const az = z0 + (z1 - z0) * t;
      addArch(ax, az, span, h, pierW, depth, rotY, y0, opts);
    }
  };

  const addRoundCol = (x, z, r = 0.56, h = 6.2, y0 = -1.2, mintBand = true, collide = true) => {
    POOL_ARCH.push({ kind: 'round_col', x, z, r, h, y0, mintBand });
    if (collide && y0 < 1.95 && y0 + h > 0.2) {
      const cr = Math.max(0.35, r * 0.92);
      RECTS.push({ x0: x - cr, z0: z - cr, x1: x + cr, z1: z + cr, crawl: false });
    }
  };

  const addPillar = (cx, cz, radius = 0.85, h = wallH, y0 = 0) => {
    addRoundCol(cx, cz, radius, h - y0, y0, true, true);
  };

  const addCeilVault = (x0, z0, x1, z1, y = 4.2, cofferGlow = true, ribs = 2) => {
    POOL_ARCH.push({ kind: 'ceil_vault', x0, z0, x1, z1, y, cofferGlow, ribs });
  };

  const addCurvedWall = (cx, cz, radius, ang0, ang1, h = 4.8, y0 = -0.4, thick = 0.75, segments = 7) => {
    POOL_ARCH.push({ kind: 'curved_wall', cx, cz, radius, ang0, ang1, h, y0, thick, segments });
  };

  const addLight = (x, y, z, color, intensity = 2.6, distance = 46) => {
    LIGHTS.push({
      x,
      y,
      z,
      hex: color,
      gain: Math.min(1.08, Math.max(0.45, intensity * 0.36)),
      dist: distance
    });
  };

  const addProp = (kind, x, z, y = 0, ry = 0, s = 1.0) => {
    PROPS.push({ kind, x, z, y, ry, s });
  };

  const addAnim = (kind, x, z, y = 0, ry = 0, s = 1.0, extra = {}) => {
    ANIM_PROPS.push({ kind, x, z, y, ry, s, ...extra });
  };

  // ---- 0. OUTER PERIMETER BOUNDARY ----
  const B0 = 18;
  const B1 = worldSpan - 18; // 654
  addWallBox(B0 - 6, B0 - 6, B1 + 6, B0, wallH);
  addWallBox(B0 - 6, B1, B1 + 6, B1 + 6, wallH);
  addWallBox(B0 - 6, B0, B0, B1, wallH);
  addWallBox(B1, B0, B1 + 6, B1, wallH);

  // ---- INTER-ZONE STRUCTURAL DIVIDERS & FRAMED ARCH PASSAGES ----
  // Zone A / B vertical wall at x = 202 (z: 24..214)
  addWallWithOpenings(false, 202, 24, 214, 2.4, [
    [40, 62, 3.8],
    [104, 134, 4.8],
    [168, 192, 3.8]
  ]);
  addPlat(196, 24, 210, 214, 0.04, -2.5);
  addArch(202, 51, 3.8, 3.6, 1.0, 2.5, Math.PI * 0.5, 0, { mint: true, noCollide: true });
  addArch(202, 119, 4.8, 4.4, 1.1, 2.5, Math.PI * 0.5, 0, { mint: true, noCollide: true });

  // Zone B / D vertical wall at x = 426 (z: 24..222)
  addWallWithOpenings(false, 426, 24, 222, 2.4, [
    [48, 72, 4.0],
    [114, 140, 5.0],
    [180, 204, 4.0]
  ]);
  addPlat(420, 24, 434, 222, 0.28, -2.5);
  addArch(426, 127, 4.8, 4.5, 1.0, 2.5, Math.PI * 0.5, 0.28, { mint: true, noCollide: true });

  // Zone A / C horizontal wall at z = 214 (x: 24..202)
  addWallWithOpenings(true, 214, 24, 202, 2.4, [
    [42, 66, 3.8],
    [94, 120, 4.0],
    [162, 184, 1.48]
  ]);
  addPlat(24, 208, 202, 222, 0.02, -2.5);
  addArch(107, 214, 4.2, 3.7, 1.0, 2.5, 0, 0, { mint: true, noCollide: true });

  // Zone B / E horizontal wall at z = 222 (x: 202..422)
  addWallWithOpenings(true, 222, 202, 422, 2.4, [
    [222, 246, 4.0],
    [300, 328, 4.8],
    [380, 404, 4.2]
  ]);
  addPlat(202, 216, 422, 232, 0.08, -2.5);
  addArch(314, 222, 4.8, 4.4, 1.0, 2.5, 0, 0.08, { mint: true, noCollide: true });

  // Zone D / F horizontal wall at z = 222 (x: 422..642)
  addWallWithOpenings(true, 222, 422, 642, 2.4, [
    [440, 464, 3.8],
    [516, 544, 4.4],
    [596, 620, 3.8]
  ]);
  addPlat(422, 214, 642, 230, 0.30, -2.5);
  addArch(530, 222, 4.6, 4.1, 1.0, 2.5, 0, 0.30, { mint: true, noCollide: true });

  // Zone C / E vertical wall at x = 204 (z: 218..426)
  addWallWithOpenings(false, 204, 218, 426, 2.4, [
    [244, 268, 3.8],
    [318, 342, 4.2],
    [384, 406, 1.48]
  ]);
  addPlat(196, 218, 212, 426, 0.08, -2.5);

  // Zone E / F vertical wall at x = 420 (z: 222..432)
  addWallWithOpenings(false, 420, 222, 432, 2.4, [
    [246, 270, 4.0],
    [320, 344, 4.4],
    [390, 412, 3.8]
  ]);
  addPlat(412, 222, 428, 432, 0.26, -2.5);
  addArch(420, 332, 4.2, 4.0, 0.9, 2.5, Math.PI * 0.5, 0.26, { mint: true, noCollide: true });

  // Zone C / H at z = 426 (x: 24..192)
  addWallWithOpenings(true, 426, 24, 192, 2.4, [
    [48, 72, 3.6],
    [116, 138, 1.48],
    [156, 180, 3.8]
  ]);
  addPlat(24, 418, 192, 434, 0.14, -2.5);

  // Zone E / G at z = 426 (x: 192..366)
  addWallWithOpenings(true, 426, 192, 366, 2.4, [
    [214, 238, 4.0],
    [268, 296, 4.6],
    [338, 358, 4.0]
  ]);
  addPlat(192, 418, 366, 436, 0.24, -2.5);
  addArch(282, 426, 4.6, 4.2, 1.0, 2.5, 0, 0.24, { mint: true, noCollide: true });

  // Zone E+F / J at z = 432 (x: 366..504)
  addWallWithOpenings(true, 432, 366, 504, 2.4, [
    [386, 414, 4.4],
    [454, 482, 4.4]
  ]);
  addPlat(366, 422, 504, 440, 0.30, -2.5);

  // Zone F / I at z = 432 (x: 504..642)
  addWallWithOpenings(true, 432, 504, 642, 2.4, [
    [524, 550, 3.8],
    [592, 618, 3.8]
  ]);
  addPlat(504, 424, 642, 440, 0.26, -2.5);

  // Zone H / G at x = 192 (z: 426..642)
  addWallWithOpenings(false, 192, 426, 642, 2.4, [
    [454, 478, 3.8],
    [522, 548, 4.0],
    [592, 616, 1.48]
  ]);
  addPlat(184, 426, 200, 642, 0.22, -2.5);

  // Zone G / J at x = 366 (z: 432..642)
  addWallWithOpenings(false, 366, 432, 642, 2.4, [
    [462, 488, 4.2],
    [528, 556, 4.6],
    [596, 622, 3.8]
  ]);
  addPlat(358, 432, 374, 642, 0.30, -2.5);

  // Zone J / I at x = 504 (z: 432..642)
  addWallWithOpenings(false, 504, 432, 642, 2.4, [
    [466, 492, 4.0],
    [532, 560, 4.4],
    [598, 622, 3.8]
  ]);
  addPlat(498, 432, 512, 642, 0.28, -2.5);

  // =========================================================================
  // ZONE A — ENTRANCE ARCHES & INTIMATE VESTIBULE POOLS (x: 24..202, z: 24..214)
  // =========================================================================
  // Intimate starter vestibule around SPAWN (54, 54) & low coffered ceiling
  addPlat(24, 24, 72, 72, 0.0, -2.5);
  addPlat(72, 24, 198, 72, 0.02, -2.5);
  addPlat(24, 72, 72, 210, 0.02, -2.5);
  addPlat(144, 72, 198, 210, 0.02, -2.5);
  addPlat(72, 144, 144, 210, 0.02, -2.5);
  addCeilVault(24, 24, 74, 74, 3.8, true, 2);
  addCeilVault(74, 24, 198, 210, 5.2, true, 4);
  addCeilVault(24, 74, 74, 210, 4.2, true, 3);

  // Foreground Vestibule Archways visible immediately from SPAWN (54, 54)
  addArch(61, 54, 3.6, 3.2, 0.72, 1.0, Math.PI * 0.5, 0, { mint: true, recessGlow: false });
  addArch(54, 61, 3.6, 3.2, 0.72, 1.0, 0, 0, { mint: true, recessGlow: false });
  addArch(42, 54, 3.2, 3.2, 0.68, 0.9, Math.PI * 0.5, 0, { recessGlow: true });
  // Diagonal Portal Archway right at (71, 71) framing Zone A tele view SE into WATER_RECTS[0]!
  addArch(71, 71, 4.2, 4.2, 0.85, 1.1, Math.PI * 0.25, 0, { mint: true });

  // CRITICAL TEST INVARIANT: WATER_RECTS[0]
  // x0=72, z0=72, x1=144, z1=144 -> corner (76.5, 76.5) pure water bed (-0.95)
  // Central dry bridge at (108, 108) y = +0.28 -> inWater === false
  addWater(72, 72, 144, 144, -0.18, -0.95, 0.08);
  addPlat(103, 70, 113, 146, 0.28, -0.06);
  addRamp(103, 64, 113, 70, 0.02, 0.28, 's');
  addRamp(103, 146, 113, 152, 0.28, 0.02, 's');
  // Stepped ceramic staircases descending into WATER_RECTS[0] (offset cleanly from 76.5,76.5!)
  addRamp(70, 94, 80, 114, 0.02, -0.92, 'e');
  addRamp(94, 70, 114, 80, 0.02, -0.92, 's');
  addRamp(136, 98, 146, 118, -0.92, 0.02, 'e');

  // Round Columns & Arched Bridges subdividing WATER_RECTS[0]
  addArch(108, 92, 4.6, 3.9, 0.85, 1.1, 0, 0.28, { mint: true });
  addArch(108, 124, 4.6, 3.9, 0.85, 1.1, 0, 0.28, { mint: true });
  for (const [rx, rz] of [[88, 88], [128, 88], [88, 128], [128, 128], [94, 118], [122, 98]]) {
    addRoundCol(rx, rz, 0.62, 6.2, -1.0);
  }
  addCurvedWall(128, 128, 8.5, 0.2, 1.9, 4.6, -0.6, 0.72, 6);

  // Intimate side pocket basins & stepped channels in Zone A
  addWater(80, 34, 134, 58, -0.14, -0.64, 0.05);
  addRamp(80, 38, 88, 54, 0.02, -0.60, 'e');
  addWater(156, 80, 190, 136, -0.16, -0.78, 0.10);
  addRamp(156, 98, 164, 116, 0.02, -0.74, 'e');
  addWater(82, 158, 134, 196, -0.16, -0.74, 0.12);
  addArcade(78, 152, 186, 152, 5, 3.8, 3.4, 0.72, 1.1, 0, { mint: true });
  addWallWithOpenings(false, 84, 28, 66, 1.1, [[40, 56, 3.6]], 5.4);
  addArcade(150, 78, 150, 144, 3, 4.0, 3.4, 0.72, 1.0, 0, { mint: true });

  addProp('pool_bench', 46, 44, 0.02, 0, 1.0);
  addProp('towel_stack', 48, 44, 0.45, 0.2, 1.0);
  addProp('pool_sign_board', 63, 62, 0.02, Math.PI * 0.75, 1.0);
  addProp('wet_footprints', 64, 64, 0.03, Math.PI * 0.25, 1.0);
  addProp('pool_drain_grate', 108, 108, 0.29, 0, 1.0);
  addProp('pool_ladder', 73.2, 86, -0.45, Math.PI * 0.5, 1.0);
  addProp('pool_ladder', 142.8, 128, -0.45, -Math.PI * 0.5, 1.0);
  addAnim('water_ripple_ring', 92, 84, -0.16, 0, 1.1);
  addLight(54, 3.5, 54, 0xfbf8ec, 2.4, 36);
  addLight(92, 4.8, 92, 0xfff8e6, 2.8, 52);
  addLight(122, 4.8, 122, 0xe8fbf6, 2.6, 52);
  addLight(174, 4.8, 114, 0xe6faf4, 2.4, 46);

  // =========================================================================
  // ZONE B — ROTUNDA GRAND ATRIUM & CERAMIC SLIDES (x: 202..426, z: 24..222)
  // =========================================================================
  addPlat(204, 26, 424, 52, 0.04, -2.5);
  addPlat(204, 198, 424, 220, 0.04, -2.5);
  addPlat(204, 52, 232, 198, 0.04, -2.5);
  addPlat(396, 52, 424, 198, 0.04, -2.5);
  addWater(232, 52, 396, 198, -0.15, -1.22, 0.16);
  addCeilVault(204, 26, 424, 220, 7.4, true, 5);
  addCeilVault(204, 96, 276, 156, 4.8, true, 3);

  // Atrium Island & Multi-Level Rotunda visible straight from tele (280, 126) -> East!
  // Compact 16m foreground causeway flanked immediately on left/right by stepped water basins
  addPlat(276, 118, 356, 134, 0.30, -1.25);
  addPlat(294, 112, 336, 140, 1.65, -1.25);
  addPlat(304, 116, 326, 136, 4.10, -1.25);
  addRamp(278, 108, 294, 118, -1.10, 0.30, 's');
  addRamp(278, 134, 294, 144, 0.30, -1.10, 's');
  addRamp(262, 118, 276, 134, -1.20, 0.30, 'e');
  addRamp(356, 118, 368, 134, 0.30, -1.20, 'e');
  addRamp(276, 118, 294, 134, 0.30, 1.65, 'e');
  addRamp(336, 118, 356, 134, 1.65, 0.30, 'e');
  addRamp(294, 96, 308, 116, 1.65, 4.10, 's');
  addRamp(322, 136, 336, 156, 4.10, 1.65, 's');

  // Foreground Framing Arches + Close Waterfront Round Columns + Curved Partition Arcs!
  addArch(289, 126, 4.2, 4.4, 0.90, 1.2, Math.PI * 0.5, 0.30, { mint: true, noCollide: true });
  addArch(342, 126, 4.2, 4.4, 0.90, 1.2, Math.PI * 0.5, 0.30, { mint: true, noCollide: true });
  addRoundCol(285, 119, 0.52, 7.6, -1.25);
  addRoundCol(285, 133, 0.52, 7.6, -1.25);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
    const rx = 315 + Math.cos(a) * 18;
    const rz = 126 + Math.sin(a) * 16;
    addRoundCol(rx, rz, 0.72, 8.6, -1.25);
  }
  addCurvedWall(315, 126, 24, 0.35, 1.15, 5.2, -0.5, 0.75, 7);
  addCurvedWall(315, 126, 24, Math.PI + 0.35, Math.PI + 1.15, 5.2, -0.5, 0.75, 7);

  // Arched Aqueduct Walkways at y = +4.10 + Twin Atrium Ceramic Water Chutes (SLIDES[0], SLIDES[1])
  addPlat(310, 32, 320, 116, 4.10, 3.60);
  addPlat(310, 136, 320, 222, 4.10, 3.60);
  addPlat(210, 122, 304, 130, 4.10, 3.60);
  addPlat(326, 122, 412, 130, 4.10, 3.60);
  addRamp(206, 50, 218, 122, 0.04, 4.10, 's');
  addRamp(396, 50, 412, 122, 0.04, 4.10, 's');
  addSlide(296, 56, 304, 102, 4.10, -0.05, 'n', 0xe6eae0);
  addSlide(328, 146, 336, 192, 4.10, -0.05, 's', 0xe6eae0);

  // Peripheral Colonnade Arches breaking up outer basins
  addArcade(246, 66, 246, 186, 4, 4.4, 3.8, 0.85, 1.2, -1.2, { mint: true });
  addArcade(382, 66, 382, 186, 4, 4.4, 3.8, 0.85, 1.2, -1.2, { mint: true });

  addProp('skylight_shaft', 315, 126, 7.2, 0, 1.25);
  addProp('skylight_shaft', 266, 86, 7.2, 0.3, 1.0);
  addProp('skylight_shaft', 364, 166, 7.2, -0.2, 1.0);
  addProp('lounge_chair', 222, 74, 0.04, Math.PI * 0.35, 1.0);
  addProp('pool_bench', 284, 120, 0.31, 0, 1.0);
  addAnim('water_ripple_ring', 300, 58, -0.14, 0, 1.4);
  addAnim('water_ripple_ring', 332, 190, -0.14, 0, 1.4);
  addLight(315, 6.8, 126, 0xf7faef, 3.2, 72);
  addLight(264, 5.5, 100, 0xe8fbf5, 2.6, 56);
  addLight(366, 5.5, 156, 0xfff8e6, 2.6, 56);

  // =========================================================================
  // ZONE C — INTIMATE ARCHED SHALLOW LABYRINTH & PUMP #1 (x: 24..204, z: 214..426)
  // =========================================================================
  addWater(32, 220, 196, 418, -0.18, -0.78, 0.28);
  addCeilVault(32, 220, 196, 418, 3.9, true, 6);

  // Dry Pump #1 Rotunda Island at (96, 342) — tele sits cleanly at North edge (96, 332) looking North
  addPlat(88, 329, 104, 352, 0.35, -0.82);
  addRamp(90, 321, 102, 329, -0.75, 0.35, 's');
  addRamp(76, 336, 88, 348, -0.75, 0.35, 'e');
  addRamp(104, 336, 116, 348, 0.35, -0.75, 'e');
  addPlat(48, 252, 66, 270, 0.20, -0.82);
  addRamp(48, 270, 62, 280, -0.75, 0.20, 'n');
  addPlat(156, 276, 174, 294, 0.20, -0.82);
  addPlat(148, 372, 168, 392, 0.20, -0.82);

  // Dense Labyrinth Walls + Repeated Flooded Semicircular Arches every ~6m!
  addWallWithOpenings(false, 74, 220, 418, 1.6, [[232, 250, 3.6], [292, 312, 1.48], [372, 396, 3.6]], wallH * 0.85);
  addWallWithOpenings(false, 122, 220, 418, 1.6, [[248, 270, 3.6], [322, 346, 3.6], [388, 408, 3.6]], wallH * 0.85);
  addWallWithOpenings(false, 168, 220, 418, 1.6, [[230, 254, 3.6], [304, 326, 3.6], [364, 384, 1.48]], wallH * 0.85);
  addWallWithOpenings(true, 272, 32, 196, 1.6, [[42, 64, 3.6], [88, 112, 3.6], [138, 158, 1.48], [176, 194, 3.6]], wallH * 0.85);
  addWallWithOpenings(true, 322, 32, 196, 1.6, [[40, 62, 3.6], [86, 108, 3.8], [134, 156, 3.6], [176, 194, 3.6]], wallH * 0.85);
  addWallWithOpenings(true, 372, 32, 196, 1.6, [[46, 66, 1.48], [88, 110, 3.8], [136, 158, 3.6]], wallH * 0.85);

  // Foreground Vista from tele (96, 332) looking North through repeated vaulted arches!
  addArcade(96, 244, 96, 320, 5, 3.6, 3.6, 0.65, 0.9, -0.78, { mint: true, straddle: true });
  addArcade(50, 236, 50, 396, 5, 3.5, 3.2, 0.65, 0.9, -0.8, { recessGlow: true, straddle: true });
  addRoundCol(87, 322, 0.46, 4.6, -0.8);
  addRoundCol(105, 322, 0.46, 4.6, -0.8);
  addRoundCol(87, 352, 0.46, 4.6, -0.8);
  addRoundCol(105, 352, 0.46, 4.6, -0.8);

  addProp('pool_drain_grate', 54, 300, -0.77, 0, 1.0);
  addProp('towel_stack', 62, 256, 0.21, 0.3, 1.0);
  addProp('pool_sign_board', 88, 326, 0.36, Math.PI * 0.5, 1.0);
  addProp('hydraulic_pipe_elbow', 103, 346, 0.36, Math.PI, 1.0);
  addLight(56, 3.6, 260, 0xe8fcf2, 2.3, 42);
  addLight(96, 3.7, 314, 0xe6f9ef, 2.6, 44);
  addLight(96, 3.7, 342, 0xa8f5e0, 2.5, 42);

  // =========================================================================
  // ZONE D — THE SUNKEN CATHEDRAL & CEREMONIAL STAIRCASE (x: 426..642, z: 24..222)
  // =========================================================================
  addPlat(428, 30, 474, 216, 0.32, -2.5);
  addPlat(474, 30, 636, 58, 0.32, -2.5);
  addPlat(474, 192, 636, 216, 0.32, -2.5);
  addPlat(594, 58, 636, 192, 0.32, -2.5);
  addWater(474, 58, 594, 192, -0.15, -2.20, 0.48);
  addCeilVault(428, 30, 636, 216, 6.2, true, 5);

  // Foreground Cathedral Archway + Stepped Ceremonial Staircases descending under turquoise water!
  addArch(476, 126, 4.8, 4.8, 0.88, 1.2, Math.PI * 0.5, 0.32, { mint: true, noCollide: true });
  addRamp(474, 116, 504, 136, 0.32, -2.18, 'e');
  addRamp(556, 114, 594, 138, -2.18, 0.32, 'e');
  addPlat(474, 68, 594, 78, 1.85, 1.35);
  addRamp(464, 68, 474, 78, 0.32, 1.85, 'e');
  addRamp(594, 68, 606, 78, 1.85, 0.32, 'e');
  addPlat(526, 118, 544, 134, 0.14, -2.2);

  // Close Intimate Cathedral Colonnades within 4-16m of tele (470, 126) -> East!
  addArcade(482, 114, 546, 114, 5, 5.0, 3.8, 0.82, 1.1, -2.2, { mint: true });
  addArcade(482, 138, 546, 138, 5, 5.0, 3.8, 0.82, 1.1, -2.2, { mint: true });
  addArcade(484, 92, 584, 92, 5, 5.2, 4.0, 0.85, 1.2, -2.2, { mint: true });
  addArcade(484, 160, 584, 160, 5, 5.2, 4.0, 0.85, 1.2, -2.2, { mint: true });
  for (const cx of [480, 494, 508, 522, 536]) {
    addRoundCol(cx, 116, 0.62, 8.6, -2.2);
    addRoundCol(cx, 136, 0.62, 8.6, -2.2);
  }
  addCurvedWall(518, 126, 16, -Math.PI * 0.38, Math.PI * 0.38, 5.6, -2.2, 0.82, 8);

  addProp('skylight_shaft', 510, 126, 6.0, 0, 1.2);
  addProp('pool_bench', 612, 126, 0.33, Math.PI * 0.5, 1.1);
  addProp('wet_footprints', 472, 126, 0.33, Math.PI * 0.5, 1.0);
  addProp('pool_drain_grate', 518, 126, -2.18, 0, 1.3);
  addAnim('abyss_silhouette', 538, 174, -1.65, 0.5, 0.95, { radius: 8.5, speed: 0.24 });
  addLight(478, 5.6, 126, 0xf2fbf7, 2.8, 54);
  addLight(518, 5.8, 126, 0xccf4ee, 3.0, 62);
  addLight(596, 5.6, 126, 0xe8f9f5, 2.4, 50);

  // =========================================================================
  // ZONE E — SPLIT-LEVEL CERAMIC SLIDE CHAMBERS & PUMP #2 (x: 204..420, z: 222..426)
  // =========================================================================
  addWater(210, 230, 412, 418, -0.16, -1.55, 0.22);
  addCeilVault(210, 230, 412, 418, 6.8, true, 5);
  addPlat(210, 230, 242, 418, 0.15, -2.0);

  // Compact Pump #2 Island at (342, 354) — tele sits cleanly NW at (332, 348) looking toward Slides!
  addPlat(328, 344, 352, 366, 0.40, -1.6);
  addRamp(318, 344, 328, 356, -1.50, 0.40, 'e');
  addRamp(352, 348, 364, 362, 0.40, -1.50, 'e');

  addPlat(264, 256, 308, 300, 3.80, -1.6);
  addPlat(274, 266, 298, 290, 6.00, 3.80);
  addRamp(242, 266, 264, 282, 0.15, 3.80, 'e');
  addRamp(264, 290, 274, 300, 3.80, 6.00, 'e');
  addPlat(308, 222, 320, 264, 3.80, 3.30);

  // Minimalist Ceramic Slides (SLIDES[2], [3], [4]) framed by arched piers & curved enclosure!
  addSlide(280, 298, 292, 364, 6.00, -0.05, 's', 0xe6eae0);
  addSlide(306, 274, 368, 286, 3.80, -0.05, 'e', 0xe6eae0);
  addSlide(274, 240, 286, 266, 3.80, -0.05, 'n', 0xe6eae0);

  addArch(326, 342, 4.2, 4.2, 0.82, 1.1, Math.PI * 0.25, -1.5, { mint: true, noCollide: true });
  addArch(308, 328, 4.0, 4.4, 0.78, 1.0, Math.PI * 0.25, -1.5, { mint: true, noCollide: true });
  addArcade(250, 248, 250, 386, 4, 4.4, 3.8, 0.78, 1.1, -1.5, { mint: true });
  addCurvedWall(286, 278, 28, Math.PI * 0.15, Math.PI * 0.72, 5.4, -1.5, 0.75, 7);
  addRoundCol(268, 260, 0.68, 8.4, -1.6);
  addRoundCol(304, 260, 0.68, 8.4, -1.6);
  addRoundCol(268, 296, 0.68, 8.4, -1.6);
  addRoundCol(304, 296, 0.68, 8.4, -1.6);
  addRoundCol(316, 318, 0.62, 8.2, -1.6);
  addRoundCol(302, 336, 0.62, 8.2, -1.6);

  addProp('lounge_chair', 224, 310, 0.16, Math.PI * 0.5, 1.0);
  addProp('hydraulic_pipe_elbow', 348, 348, 0.41, 0, 1.1);
  addProp('pool_sign_board', 330, 362, 0.41, -Math.PI * 0.5, 1.0);
  addAnim('water_ripple_ring', 286, 368, -0.15, 0, 1.7);
  addAnim('water_ripple_ring', 370, 280, -0.15, 0, 1.5);
  addLight(286, 6.2, 278, 0xfaf8ea, 2.8, 56);
  addLight(336, 5.8, 348, 0xf2f9ed, 2.7, 50);
  addLight(376, 5.8, 290, 0xd8f8f0, 2.4, 50);

  // =========================================================================
  // ZONE F — ARCHED CAUSEWAY & ABYSSAL WELLS (x: 420..642, z: 222..432)
  // =========================================================================
  addPlat(424, 226, 456, 428, 0.30, -2.7);
  addPlat(606, 226, 638, 428, 0.30, -2.7);
  addPlat(456, 226, 606, 252, 0.30, -2.7);
  addPlat(456, 400, 606, 428, 0.30, -2.7);
  addCeilVault(424, 226, 638, 428, 5.9, true, 5);

  // WATER_RECTS[1]: Deep Accessible Basin in North-West Zone F containing K_SPAWN (493, 289)!
  addWater(456, 252, 530, 326, -0.12, -1.75, 0.82);
  addWater(532, 252, 606, 398, -0.12, -2.60, 0.90);
  addWater(456, 330, 530, 398, -0.12, -2.45, 0.86);

  // Precarious Narrow Cross-Bridges framed by overhead semicircular Archways!
  addPlat(456, 324, 606, 332, 0.30, -0.10);
  addPlat(527, 252, 535, 400, 0.30, -0.10);
  addPlat(576, 304, 608, 352, 2.80, -2.6);
  addRamp(592, 352, 608, 384, 0.30, 2.80, 'n');
  addRamp(456, 272, 466, 294, 0.30, -1.70, 'e');

  addArcade(462, 328, 514, 328, 3, 4.4, 4.2, 0.72, 1.1, 0.30, { mint: true, noCollide: true, straddle: true });
  addArcade(548, 328, 594, 328, 3, 4.4, 4.2, 0.72, 1.1, 0.30, { mint: true, noCollide: true, straddle: true });
  addArcade(531, 262, 531, 310, 3, 4.4, 4.2, 0.72, 1.1, 0.30, { mint: true, noCollide: true, straddle: true });
  addArcade(531, 346, 531, 392, 3, 4.4, 4.2, 0.72, 1.1, 0.30, { mint: true, noCollide: true, straddle: true });
  for (const [rx, rz] of [[476, 314], [476, 344], [510, 314], [510, 344], [552, 314], [552, 344], [584, 284], [584, 372]]) {
    addRoundCol(rx, rz, 0.68, 8.6, -2.6);
  }

  addProp('pool_diving_board', 572, 318, 2.81, -Math.PI * 0.5, 1.15);
  addProp('pool_diving_board', 572, 338, 2.81, -Math.PI * 0.5, 1.15);
  addProp('pool_ladder', 457.2, 274, -0.95, Math.PI * 0.5, 1.1);
  addProp('pool_ladder', 604.8, 376, -1.35, -Math.PI * 0.5, 1.1);
  addProp('pool_drain_grate', 568, 290, -2.58, 0, 1.6);
  addAnim('abyss_silhouette', 566, 290, -2.05, 0, 1.35, { radius: 14, speed: 0.32 });
  addLight(464, 5.2, 328, 0xdcf4f4, 2.4, 48);
  addLight(531, 5.5, 328, 0xa8e2ea, 2.6, 54);
  addLight(588, 5.5, 330, 0xb8e8ec, 2.2, 46);

  // =========================================================================
  // ZONE G — IMPOSSIBLE ARCHITECTURAL GALLERY (x: 192..366, z: 426..642)
  // =========================================================================
  addWater(198, 434, 360, 634, -0.15, -0.82, 0.36);
  addCeilVault(198, 434, 360, 634, 5.8, true, 5);

  // Compact gallery pavilion & 6m cross-bridges so glowing turquoise pools frame the foreground
  addPlat(272, 504, 284, 516, 0.30, -0.85);
  addPlat(275, 434, 281, 634, 0.30, -0.85);
  addPlat(198, 507, 360, 513, 0.30, -0.85);
  addRamp(264, 496, 275, 504, -0.78, 0.30, 'e');
  addRamp(281, 496, 292, 504, 0.30, -0.78, 'e');

  addPlat(220, 456, 334, 472, 3.60, 3.15);
  addRamp(198, 456, 220, 472, 0.30, 3.60, 'e');
  addRamp(334, 456, 356, 472, 3.60, 0.30, 'e');

  // Arched Galleries, Asymmetrical Curves & Columns visible from tele (278, 510) -> North!
  addArch(278, 496, 4.4, 4.2, 0.85, 1.2, 0, 0.30, { mint: true, noCollide: true });
  addArch(278, 476, 4.4, 4.2, 0.85, 1.2, 0, 0.30, { mint: true, noCollide: true });
  addArch(266, 510, 3.8, 3.8, 0.80, 1.1, Math.PI * 0.5, 0.30, { mint: true, noCollide: true });
  addArch(290, 510, 3.8, 3.8, 0.80, 1.1, Math.PI * 0.5, 0.30, { mint: true, noCollide: true });
  addWallWithOpenings(true, 564, 208, 350, 1.8, [[224, 252, 4.0], [270, 290, 4.0], [308, 336, 4.0]], wallH);
  addWallWithOpenings(true, 598, 224, 336, 1.6, [[244, 266, 4.4], [292, 314, 4.4]], wallH);
  for (const [rx, rz] of [[268, 498], [288, 498], [268, 484], [288, 484], [234, 536], [322, 536], [224, 452], [334, 452]]) {
    addRoundCol(rx, rz, 0.58, 6.8, -0.85);
  }
  addCurvedWall(234, 492, 12, Math.PI * 0.6, Math.PI * 1.3, 4.8, -0.8, 0.72, 6);
  addCurvedWall(324, 492, 12, -Math.PI * 0.3, Math.PI * 0.4, 4.8, -0.8, 0.72, 6);

  addProp('skylight_shaft', 278, 510, 5.6, 0, 1.1);
  addProp('pool_bench', 273, 505, 0.31, 0, 1.0);
  addProp('pool_sign_board', 284, 518, 0.31, Math.PI, 1.0);
  addLight(278, 5.4, 510, 0xf2faf4, 2.8, 56);
  addLight(278, 5.4, 464, 0xfff8e6, 2.4, 46);
  addLight(234, 5.2, 580, 0xd8f4ee, 2.2, 46);

  // =========================================================================
  // ZONE H — FLOODED VAULTED MAINTENANCE & PUMP #3 (x: 24..192, z: 426..642)
  // =========================================================================
  addWater(30, 434, 186, 634, -0.15, -0.68, 0.64);
  addCeilVault(30, 434, 186, 634, 3.7, true, 6);

  addPlat(106, 518, 122, 546, 0.35, -0.72); // Compact Dry Pump #3 Deck (tele at 521 looking North)
  addRamp(108, 510, 120, 518, -0.64, 0.35, 's');
  addRamp(94, 526, 106, 542, -0.64, 0.35, 'e');
  addRamp(122, 526, 134, 542, 0.35, -0.64, 'e');
  addPlat(40, 444, 56, 620, 0.22, -0.72);

  addWallWithOpenings(false, 84, 434, 634, 1.8, [[450, 472, 3.4], [522, 550, 3.6], [594, 616, 1.48]], wallH);
  addWallWithOpenings(false, 148, 434, 634, 1.8, [[452, 474, 3.6], [522, 550, 3.6], [590, 612, 3.4]], wallH);
  addWallWithOpenings(true, 496, 30, 186, 1.8, [[42, 62, 3.4], [104, 128, 3.6], [162, 182, 3.4]], wallH);
  addWallWithOpenings(true, 574, 30, 186, 1.8, [[42, 62, 3.4], [104, 128, 1.48], [160, 182, 3.4]], wallH);

  addArcade(114, 454, 114, 506, 5, 3.4, 3.6, 0.65, 0.9, -0.68, { mint: true, straddle: true });
  addArch(114, 514, 3.6, 3.4, 0.68, 0.9, 0, -0.68, { mint: true, noCollide: true });
  addRoundCol(106, 502, 0.48, 4.6, -0.68);
  addRoundCol(122, 502, 0.48, 4.6, -0.68);

  addProp('pipe_bundle', 66, 468, 3.2, 0, 1.1);
  addProp('pipe_bundle', 166, 474, 3.2, Math.PI * 0.5, 1.1);
  addProp('hydraulic_pipe_elbow', 120, 526, 0.36, Math.PI * 0.5, 1.15);
  addProp('pool_drain_grate', 114, 526, 0.36, 0, 1.15);
  addProp('pool_sign_board', 107, 519, 0.36, Math.PI * 0.75, 1.0);
  addAnim('water_ripple_ring', 68, 514, -0.14, 0, 0.9);
  addLight(54, 3.5, 466, 0xffe0ad, 2.1, 36);
  addLight(114, 3.5, 534, 0xffcc88, 2.5, 42);
  addLight(114, 3.5, 480, 0xc8ece4, 2.1, 38);

  // =========================================================================
  // ZONE I — QUIET 5-POOL CLOISTER & STAGGERED STEPS (x: 504..642, z: 432..642)
  // =========================================================================
  addPlat(508, 438, 636, 454, 0.24, -1.0);
  addPlat(508, 498, 552, 568, 0.24, -1.0);
  addPlat(590, 498, 636, 568, 0.24, -1.0);
  addPlat(508, 529, 636, 539, 0.24, -1.0);
  addPlat(508, 616, 636, 636, 0.24, -1.0);
  addPlat(508, 454, 520, 498, 0.24, -1.0);
  addPlat(566, 454, 582, 498, 0.24, -1.0);
  addPlat(624, 454, 636, 498, 0.24, -1.0);
  addPlat(508, 568, 520, 616, 0.24, -1.0);
  addPlat(566, 568, 582, 616, 0.24, -1.0);
  addPlat(624, 568, 636, 616, 0.24, -1.0);
  addCeilVault(508, 438, 636, 636, 4.6, true, 5);

  addWater(520, 454, 566, 498, -0.12, -0.72, 0.34);
  addWater(582, 454, 624, 498, -0.12, -0.72, 0.36);
  addWater(552, 506, 590, 529, -0.10, -0.68, 0.35);
  addWater(552, 539, 590, 562, -0.10, -0.68, 0.35);
  addWater(520, 568, 566, 616, -0.12, -0.72, 0.38);
  addWater(582, 568, 624, 616, -0.12, -0.72, 0.37);
  // Staggered Elevated Shallow Courtyard Pool overlooking center cloister!
  addPlat(594, 514, 628, 554, 0.90, 0.24);
  addRamp(580, 522, 594, 546, 0.24, 0.90, 'e');
  addRamp(552, 514, 562, 529, 0.24, -0.65, 's');
  addRamp(552, 539, 562, 554, -0.65, 0.24, 's');
  addRamp(532, 484, 554, 498, -0.68, 0.24, 's');
  addRamp(532, 568, 554, 582, 0.24, -0.68, 's');

  // Four-Arch Cloister framing sunken pools directly ahead from tele (546, 534)!
  addArch(554, 534, 4.0, 4.0, 0.72, 1.0, Math.PI * 0.5, 0.24, { mint: true, noCollide: true });
  addArch(572, 534, 4.0, 4.0, 0.72, 1.0, Math.PI * 0.5, 0.24, { mint: true, noCollide: true });
  addArcade(558, 512, 558, 556, 3, 4.0, 3.6, 0.72, 1.0, 0.24, { mint: true, noCollide: true });
  addArcade(576, 512, 576, 556, 3, 4.0, 3.6, 0.72, 1.0, 0.24, { mint: true, noCollide: true });
  addWallWithOpenings(true, 502, 510, 634, 1.4, [[536, 558, 3.6], [594, 614, 3.6]], wallH);
  addWallWithOpenings(false, 574, 444, 628, 1.4, [[470, 488, 3.4], [526, 542, 3.8], [588, 608, 3.4]], wallH);
  for (const [rx, rz] of [[562, 526], [562, 542], [580, 526], [580, 542], [542, 476], [602, 476], [542, 592], [602, 592]]) {
    addRoundCol(rx, rz, 0.54, 5.6, -0.75);
  }

  addPlat(508, 518, 530, 556, 2.20, 0.24);
  addRamp(530, 526, 544, 548, 0.24, 2.20, 'w');
  addProp('pool_bench', 550, 522, 0.25, 0, 1.0);
  addProp('towel_stack', 552, 522, 0.68, 0.1, 1.0);
  addProp('lounge_chair', 602, 534, 0.91, -Math.PI * 0.25, 1.0);
  addProp('wet_footprints', 524, 550, 0.25, Math.PI, 1.0);
  addLight(544, 4.3, 476, 0xeef7f8, 2.4, 46);
  addLight(566, 4.3, 534, 0xe8f6f2, 2.6, 48);
  addLight(602, 4.3, 592, 0xf2eef8, 2.2, 44);

  // =========================================================================
  // ZONE J — DRAINAGE SANCTUARY COLONNADE & EXIT PORTAL (x: 366..504, z: 432..642)
  // =========================================================================
  addPlat(370, 438, 500, 484, 0.32, -1.6);
  addPlat(370, 598, 500, 636, 0.32, -1.6);
  addPlat(370, 484, 404, 598, 0.32, -1.6);
  addPlat(466, 484, 500, 598, 0.32, -1.6);

  addWater(404, 484, 466, 598, -0.22, -1.35, 0.32);
  addCeilVault(370, 438, 500, 636, 5.8, true, 5);
  addPlat(429, 484, 441, 628, 0.32, -1.4); // Ceremonial 12m Causeway flanked immediately by water!
  addPlat(376, 534, 496, 546, 0.32, -1.4); // E-W cross causeway
  addRamp(418, 516, 429, 528, -1.30, 0.32, 'e');
  addRamp(441, 516, 452, 528, 0.32, -1.30, 'e');

  // Ceremonial Double Colonnade of Arches & Round Columns flanking (435, 514) -> South!
  addArch(435, 522, 4.8, 4.5, 0.90, 1.2, 0, 0.32, { mint: true, noCollide: true });
  addArch(435, 548, 4.8, 4.5, 0.90, 1.2, 0, 0.32, { mint: true, noCollide: true });
  addArch(435, 566, 4.8, 4.5, 0.90, 1.2, 0, 0.32, { mint: true, noCollide: true });
  addArcade(418, 494, 418, 574, 4, 4.8, 4.0, 0.78, 1.1, -1.4, { mint: true });
  addArcade(452, 494, 452, 574, 4, 4.8, 4.0, 0.78, 1.1, -1.4, { mint: true });
  for (const [rx, rz] of [[423, 522], [447, 522], [423, 536], [447, 536], [422, 568], [448, 568]]) {
    addRoundCol(rx, rz, 0.62, 7.2, -1.4);
  }
  addWallBox(370, 576, 420, 580, wallH, 0, false);
  addWallBox(450, 576, 500, 580, wallH, 0, false);
  addAnim('drainage_sluice_gate', 435, 578, 0.32, 0, 1.0);

  addProp('skylight_shaft', 435, 540, 5.6, 0, 1.15);
  addProp('pool_drain_grate', 435, 492, -1.33, 0, 1.5);
  addProp('hydraulic_pipe_elbow', 416, 566, 0.33, Math.PI * 0.5, 1.2);
  addProp('hydraulic_pipe_elbow', 454, 566, 0.33, -Math.PI * 0.5, 1.2);
  addProp('pool_sign_board', 422, 508, 0.33, 0, 1.0);
  addAnim('water_ripple_ring', 410, 500, -0.20, 0, 1.3);
  addAnim('water_ripple_ring', 460, 564, -0.20, 0, 1.3);
  addLight(435, 5.3, 535, 0xf2fcf8, 3.0, 62);
  addLight(435, 5.0, 616, 0xb8ffe8, 2.7, 46);

  // =========================================================================
  // 3 PUMP CONTROL STATIONS (WATER NETWORK OBJECTIVE)
  // =========================================================================
  const PUMPS = [
    {
      id: 0,
      key: 'pump_c',
      zoneId: 'zone_c',
      name: 'Trạm Bơm Khu C — Lọc Bể Nông',
      x: 96,
      y: 0.35,
      z: 342,
      ry: 0,
      p: 0,
      done: false
    },
    {
      id: 1,
      key: 'pump_e',
      zoneId: 'zone_e',
      name: 'Trạm Bơm Khu E — Tháp Máng Trượt',
      x: 342,
      y: 0.40,
      z: 354,
      ry: Math.PI * 0.5,
      p: 0,
      done: false
    },
    {
      id: 2,
      key: 'pump_h',
      zoneId: 'zone_h',
      name: 'Trạm Bơm Khu H — Hầm Kỹ Thuật',
      x: 114,
      y: 0.35,
      z: 534,
      ry: 0,
      p: 0,
      done: false
    }
  ];

  for (const pm of PUMPS) {
    addProp('pool_sign_board', pm.x - 3.6, pm.z - 2.2, pm.y, 0.35, 0.9);
  }

  const SPAWN = { x: 54, z: 54, y: 0.08, yaw: -Math.PI * 0.5 };
  const END_POS = { x: 435, z: 618, y: 0.32 };
  const TASK_POS = { x: 435, z: 546, y: 0.32 };
  const K_SPAWN = { x: 493, z: 289, y: 0 };

  const atria = POOL_ZONE_DEFS.map((zDef) => ({
    cx: Math.round(zDef.center.x / gC),
    cz: Math.round(zDef.center.z / gC),
    rx: Math.max(4, Math.round((zDef.bounds.x1 - zDef.bounds.x0) / (2 * gC))),
    rz: Math.max(4, Math.round((zDef.bounds.z1 - zDef.bounds.z0) / (2 * gC))),
    id: zDef.id
  }));

  return {
    POOL_ZONES: POOL_ZONE_DEFS,
    POOL_ARCH,
    PUMPS,
    SPAWN,
    END_POS,
    TASK_POS,
    K_SPAWN,
    atria,
    customPoolrooms: true
  };
}

const _evState = {
  lastZoneId: null,
  visitedZones: new Set(),
  nextHydroBoomAt: 14,
  nextSplashCueAt: 20,
  lastDonePumps: -1
};

export function resetPoolroomsEventsState() {
  _evState.lastZoneId = null;
  _evState.visitedZones.clear();
  _evState.nextHydroBoomAt = 14;
  _evState.nextSplashCueAt = 20;
  _evState.lastDonePumps = -1;
}

export function updatePoolroomsWorldEvents(dt, elapsed, me, map, world, audio, showCueCb) {
  if (!me || !map?.POOL_ZONES) return;

  const zone = getPoolroomsZoneAt(me.x, me.z, map);
  if (zone && zone.id !== _evState.lastZoneId) {
    _evState.lastZoneId = zone.id;
    if (!_evState.visitedZones.has(zone.id)) {
      _evState.visitedZones.add(zone.id);
      if (typeof showCueCb === 'function' && _evState.visitedZones.size > 1) {
        showCueCb(`${zone.name}`);
      }
      if (audio?.playPoolZoneArrival) audio.playPoolZoneArrival(zone.mood);
    }
  }

  if (elapsed > _evState.nextHydroBoomAt) {
    _evState.nextHydroBoomAt = elapsed + 22 + Math.random() * 16;
    if (audio?.playPoolHydroBoom) {
      const angle = Math.random() * Math.PI * 2;
      audio.playPoolHydroBoom({
        x: me.x + Math.cos(angle) * 24,
        y: (me.y || 0) - 2.5,
        z: me.z + Math.sin(angle) * 24
      });
    }
  }

  if (elapsed > _evState.nextSplashCueAt) {
    _evState.nextSplashCueAt = elapsed + 16 + Math.random() * 18;
    if (audio?.playWaterSplash && (zone?.waterTemp > 0.35 || Math.random() < 0.45)) {
      const angle = Math.random() * Math.PI * 2;
      audio.playWaterSplash({
        x: me.x + Math.cos(angle) * 18,
        y: -0.2,
        z: me.z + Math.sin(angle) * 18
      }, 0.28);
    }
  }

  if (world?.lightPool && map.LIGHTS) {
    for (const lp of world.lightPool) {
      if (!lp.light || lp.idx < 0) continue;
      const src = map.LIGHTS[lp.idx];
      if (!src) continue;
      if (zone?.mood === 'damp_maintenance') {
        const flick = Math.sin(elapsed * 29.0 + lp.idx * 7.1) > 0.88 ? 0.42 : 1.0;
        lp.light.intensity = src.intensity * flick;
      }
    }
  }

  if (map.PUMPS) {
    const doneCount = map.PUMPS.filter((pm) => pm.done).length;
    if (_evState.lastDonePumps >= 0 && doneCount > _evState.lastDonePumps) {
      if (typeof showCueCb === 'function') {
        showCueCb(
          doneCount >= map.PUMPS.length
            ? 'CẢ 3 TRẠM BƠM ĐÃ HOẠT ĐỘNG — Cổng Cống Khu J đang mở!'
            : `Đã kích hoạt Trạm Bơm (${doneCount}/${map.PUMPS.length})`
        );
      }
      if (audio?.playPumpActivation) {
        audio.playPumpActivation({ x: me.x, y: me.y || 0, z: me.z }, doneCount >= map.PUMPS.length);
      }
    }
    _evState.lastDonePumps = doneCount;
  }
}
