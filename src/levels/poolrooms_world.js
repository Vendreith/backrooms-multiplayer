// ============================================================
// LEVEL 37: THE POOLROOMS — 10-Zone Interconnected Aquatic World
// Architecture, Environmental Storytelling, Pump Objective & Events
// ============================================================

export const POOL_ZONE_DEFS = [
  {
    id: 'zone_a',
    code: 'A',
    name: 'Khu A — Bể Khởi Đầu (Entrance Pools)',
    desc: 'Hành lang gạch ấm áp dẫn vào chuỗi bể cạn và lối mở không cửa.',
    bounds: { x0: 24, z0: 24, x1: 202, z1: 214 },
    center: { x: 112, z: 116 },
    teleX: 66,
    teleZ: 66,
    teleY: 0.08,
    teleYaw: -Math.PI * 0.75,
    mood: 'warm_nostalgic',
    waterTemp: 0.08,
    fogColor: 0xaadbe0,
    fogDensity: 0.0044,
    hemiSky: 0xfff5e4,
    hemiGround: 0x4ca3b2,
    hemiInt: 0.72,
    ambColor: 0xd9eef0,
    ambInt: 0.36,
    exposure: 0.74
  },
  {
    id: 'zone_b',
    code: 'B',
    name: 'Khu B — Đại Sảnh Ánh Sáng (Grand Atrium)',
    desc: 'Đại sảnh cột cao vút ngập ánh sáng thiên thanh và cầu tầng lơ lửng.',
    bounds: { x0: 202, z0: 24, x1: 426, z1: 222 },
    center: { x: 315, z: 126 },
    teleX: 278,
    teleZ: 126,
    teleY: 0.32,
    teleYaw: -Math.PI * 0.5,
    mood: 'bright_liminal',
    waterTemp: 0.16,
    fogColor: 0xb7ecf4,
    fogDensity: 0.0038,
    hemiSky: 0xeafaff,
    hemiGround: 0x489eb3,
    hemiInt: 0.76,
    ambColor: 0xb6e8f2,
    ambInt: 0.38,
    exposure: 0.75
  },
  {
    id: 'zone_c',
    code: 'C',
    name: 'Khu C — Mê Cung Nước Nông (Shallow Labyrinth)',
    desc: 'Mê cung vách ngăn thấp ngập ngang hông với vòm chui và bể tĩnh ẩn mình.',
    bounds: { x0: 24, z0: 214, x1: 204, z1: 426 },
    center: { x: 114, z: 320 },
    teleX: 96,
    teleZ: 342,
    teleY: 0.38,
    teleYaw: 0,
    mood: 'clinical_mint',
    waterTemp: 0.30,
    fogColor: 0xaee6da,
    fogDensity: 0.0062,
    hemiSky: 0xe6fff7,
    hemiGround: 0x3b8a7d,
    hemiInt: 0.68,
    ambColor: 0xa9dcd2,
    ambInt: 0.35,
    exposure: 0.71
  },
  {
    id: 'zone_d',
    code: 'D',
    name: 'Khu D — Thánh Đường Ngập Nước (Sunken Cathedral)',
    desc: 'Đại sảnh vòm trang nghiêm nơi bậc thang gạch trắng chìm thẳng xuống làn nước.',
    bounds: { x0: 426, z0: 24, x1: 642, z1: 222 },
    center: { x: 534, z: 126 },
    teleX: 462,
    teleZ: 126,
    teleY: 0.32,
    teleYaw: -Math.PI * 0.5,
    mood: 'cool_cathedral',
    waterTemp: 0.56,
    fogColor: 0x8bc9d9,
    fogDensity: 0.0052,
    hemiSky: 0xd0f0fb,
    hemiGround: 0x2a697d,
    hemiInt: 0.66,
    ambColor: 0x8cc6d8,
    ambInt: 0.33,
    exposure: 0.70
  },
  {
    id: 'zone_e',
    code: 'E',
    name: 'Khu E — Tháp Máng Trượt Vô Tận (The Slides)',
    desc: 'Tòa tháp máng trượt cong phi lý vươn lên trên khoang kỹ thuật ẩm ướt.',
    bounds: { x0: 204, z0: 222, x1: 420, z1: 426 },
    center: { x: 312, z: 324 },
    teleX: 342,
    teleZ: 348,
    teleY: 0.42,
    teleYaw: Math.PI * 0.25,
    mood: 'pastel_waterpark',
    waterTemp: 0.22,
    fogColor: 0xc2ebf2,
    fogDensity: 0.0048,
    hemiSky: 0xfff8ea,
    hemiGround: 0x4ca2ad,
    hemiInt: 0.72,
    ambColor: 0xc5e6eb,
    ambInt: 0.36,
    exposure: 0.73
  },
  {
    id: 'zone_f',
    code: 'F',
    name: 'Khu F — Hố Vực Nước Sâu (Deep Abyssal Basins)',
    desc: 'Những giếng nước sâu thẳm tối màu với cầu hẹp bắc ngang khoảng không.',
    bounds: { x0: 420, z0: 222, x1: 642, z1: 432 },
    center: { x: 531, z: 327 },
    teleX: 444,
    teleZ: 330,
    teleY: 0.32,
    teleYaw: -Math.PI * 0.5,
    mood: 'deep_abyssal',
    waterTemp: 0.94,
    fogColor: 0x528d9c,
    fogDensity: 0.0074,
    hemiSky: 0x9cd2de,
    hemiGround: 0x163945,
    hemiInt: 0.56,
    ambColor: 0x568e9c,
    ambInt: 0.28,
    exposure: 0.64
  },
  {
    id: 'zone_g',
    code: 'G',
    name: 'Khu G — Hành Lang Kiến Trúc Nghịch Lý (Impossible Gallery)',
    desc: 'Khung cửa lơ lửng, ban công cụt và cầu đi bộ đan chéo trên rãnh nước.',
    bounds: { x0: 192, z0: 426, x1: 366, z1: 642 },
    center: { x: 279, z: 534 },
    teleX: 276,
    teleZ: 510,
    teleY: 0.32,
    teleYaw: 0,
    mood: 'surreal_gallery',
    waterTemp: 0.40,
    fogColor: 0xbfe7f0,
    fogDensity: 0.0046,
    hemiSky: 0xf4fcff,
    hemiGround: 0x458b99,
    hemiInt: 0.72,
    ambColor: 0xbde1ea,
    ambInt: 0.35,
    exposure: 0.73
  },
  {
    id: 'zone_h',
    code: 'H',
    name: 'Khu H — Đường Hầm Bảo Trì Ngập (Flooded Maintenance)',
    desc: 'Khu dịch vụ cũ kỹ rỉ sét với ống dẫn nước, cửa chui và ánh đèn chập chờn.',
    bounds: { x0: 24, z0: 426, x1: 192, z1: 642 },
    center: { x: 108, z: 534 },
    teleX: 114,
    teleZ: 534,
    teleY: 0.38,
    teleYaw: 0,
    mood: 'damp_maintenance',
    waterTemp: 0.72,
    fogColor: 0x6f999b,
    fogDensity: 0.0082,
    hemiSky: 0xaed0ce,
    hemiGround: 0x263f42,
    hemiInt: 0.54,
    ambColor: 0x6c8e90,
    ambInt: 0.28,
    exposure: 0.65
  },
  {
    id: 'zone_i',
    code: 'I',
    name: 'Khu I — Hồ Tĩnh Lặng & Đài Quan Sát (Quiet Pocket Pools)',
    desc: 'Những hồ nước nhỏ yên tĩnh ẩn sau lối rẽ hẹp, tách biệt khỏi mê cung.',
    bounds: { x0: 504, z0: 432, x1: 642, z1: 642 },
    center: { x: 573, z: 537 },
    teleX: 546,
    teleZ: 534,
    teleY: 0.26,
    teleYaw: -Math.PI * 0.5,
    mood: 'tranquil_dusk',
    waterTemp: 0.44,
    fogColor: 0x9fcfe3,
    fogDensity: 0.0056,
    hemiSky: 0xdceeff,
    hemiGround: 0x3b768f,
    hemiInt: 0.65,
    ambColor: 0xa2cde0,
    ambInt: 0.33,
    exposure: 0.70
  },
  {
    id: 'zone_j',
    code: 'J',
    name: 'Khu J — Hầm Thoát Nước & Cổng Hồi Quy (Drainage Sanctuary)',
    desc: 'Phòng xả áp bậc thang với Cổng Cống Khổng Lồ và Lối Thoát về Level 0.',
    bounds: { x0: 366, z0: 432, x1: 504, z1: 642 },
    center: { x: 435, z: 540 },
    teleX: 435,
    teleZ: 512,
    teleY: 0.32,
    teleYaw: Math.PI,
    mood: 'sanctuary_vault',
    waterTemp: 0.35,
    fogColor: 0xa7dfe8,
    fogDensity: 0.0046,
    hemiSky: 0xe8fbff,
    hemiGround: 0x3a8b99,
    hemiInt: 0.72,
    ambColor: 0xacdce6,
    ambInt: 0.36,
    exposure: 0.73
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
 * Generates the complete 10-zone Poolrooms architecture inside genSubLevelMap.
 * Exact schema compatibility with world_mesh.js & terrain.js:
 * - WALLS: { x0, z0, x1, z1, y0, y1 }
 * - RECTS: { x0, z0, x1, z1, crawl }
 * - PLATFORMS: { x0, z0, x1, z1, y, yBase, draw: true, surface: 'tile' }
 * - RAMPS: { x0, z0, x1, z1, y0, y1, axis: 'x'|'z', draw: true, surface: 'tile' }
 * - SLIDES: { x0, z0, x1, z1, y0, y1, axis: 'x'|'z', dirX, dirZ, speed, color }
 * - WATER_RECTS: { x0, z0, x1, z1, waterY, bedY, temp }
 * - PROPS / ANIM_PROPS: { kind, x, z, y, ry, s }
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

  // Builds a wall between two coordinates with doorway/archways or crawl ducts
  const addWallWithOpenings = (isHorizontal, fixedCoord, span0, span1, thickness, openings = [], h = wallH) => {
    const halfT = thickness * 0.5;
    const sorted = [...openings].sort((a, b) => a[0] - b[0]);
    let cursor = span0;
    for (const op of sorted) {
      const o0 = Math.max(span0, op[0]);
      const o1 = Math.min(span1, op[1]);
      const archBottomY = op[2] ?? 4.2;
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

  // dir: 'e' (ascends/descends x0->x1), 'w' (x1->x0), 's' (z0->z1), 'n' (z1->z0)
  // Converts directional slope cleanly into axis + ordered y0 (at min) / y1 (at max)
  const addRamp = (x0, z0, x1, z1, yStart, yEnd, dir) => {
    const axis = dir === 'e' || dir === 'w' ? 'x' : 'z';
    const reversed = dir === 'w' || dir === 'n';
    const yAtMin = reversed ? yEnd : yStart;
    const yAtMax = reversed ? yStart : yEnd;
    RAMPS.push({ x0, z0, x1, z1, axis, y0: yAtMin, y1: yAtMax, draw: true, surface: 'tile' });
  };

  const addSlide = (x0, z0, x1, z1, yTop, yBottom, dir, color = 0x22a6b3) => {
    const axis = dir === 'e' || dir === 'w' ? 'x' : 'z';
    let dirX = 0, dirZ = 0, y0 = yTop, y1 = yBottom;
    if (dir === 'e') { dirX = 1; y0 = yTop; y1 = yBottom; }
    else if (dir === 'w') { dirX = -1; y0 = yBottom; y1 = yTop; }
    else if (dir === 's') { dirZ = 1; y0 = yTop; y1 = yBottom; }
    else { dirZ = -1; y0 = yBottom; y1 = yTop; }
    SLIDES.push({ x0, z0, x1, z1, axis, y0, y1, dirX, dirZ, speed: 12.5, color });
  };

  const addWater = (x0, z0, x1, z1, waterY = -0.18, bedY = -0.95, temp = 0.25) => {
    WATER_RECTS.push({ x0, z0, x1, z1, waterY, bedY, temp });
  };

  const addPillar = (cx, cz, radius = 1.6, h = wallH, y0 = 0) => {
    addWallBox(cx - radius, cz - radius, cx + radius, cz + radius, h, y0, false);
    PROPS.push({ kind: 'tiled_arch_column', x: cx, z: cz, y: Math.max(0, y0), ry: 0, s: Math.max(0.85, radius * 0.65) });
  };

  const addLight = (x, y, z, color, intensity = 2.4, distance = 42) => {
    LIGHTS.push({
      x,
      y,
      z,
      hex: color,
      gain: Math.min(1.05, Math.max(0.35, intensity * 0.34)),
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

  // ---- INTER-ZONE STRUCTURAL DIVIDERS & CORRIDOR SILL PLATFORMS ----
  // Zone A / B vertical wall at x = 202 (z: 24..214)
  addWallWithOpenings(false, 202, 24, 214, 2.8, [
    [40, 68, 4.8],   // North dry corridor A <-> B
    [98, 138, 7.2],  // Huge Grand Sightline Opening into Zone B's Atrium columns!
    [168, 196, 4.4]  // South corridor A <-> B
  ]);
  addPlat(196, 24, 210, 214, 0.04, -2.5); // Sill floor across A<->B openings

  // Zone B / D vertical wall at x = 426 (z: 24..222)
  addWallWithOpenings(false, 426, 24, 222, 2.8, [
    [46, 78, 5.2],   // North promenade link B <-> D
    [110, 146, 6.8], // Main Cathedral Nave Vista opening
    [180, 206, 4.4]  // South promenade link B <-> D
  ]);
  addPlat(420, 24, 434, 222, 0.28, -2.5);

  // Zone A / C horizontal wall at z = 214 (x: 24..202)
  addWallWithOpenings(true, 214, 24, 202, 2.6, [
    [42, 68, 4.0],   // West maze entry
    [96, 126, 4.4],  // Central entrance A <-> C
    [162, 186, 1.48] // Crawl maintenance duct A <-> C
  ]);
  addPlat(24, 208, 202, 222, 0.02, -2.5);

  // Zone B / E horizontal wall at z = 222 (x: 202..422)
  addWallWithOpenings(true, 222, 202, 422, 2.8, [
    [220, 250, 4.6], // West slide promenade link
    [296, 336, 7.6], // Monumental Atrium -> Waterpark sightline arch
    [380, 408, 5.2]  // East elevated walkway link
  ]);
  addPlat(202, 216, 422, 232, 0.08, -2.5);

  // Zone D / F horizontal wall at z = 222 (x: 422..642)
  addWallWithOpenings(true, 222, 422, 642, 2.8, [
    [438, 466, 4.4], // West cliff catwalk D <-> F
    [514, 550, 5.6], // Center overlook passage
    [594, 622, 4.2]  // East cliff passage
  ]);
  addPlat(422, 214, 642, 230, 0.30, -2.5);

  // Zone C / E vertical wall at x = 204 (z: 218..426)
  addWallWithOpenings(false, 204, 218, 426, 2.6, [
    [242, 270, 4.4],
    [314, 344, 4.8],
    [384, 408, 1.48] // Low crawl tunnel C <-> E
  ]);
  addPlat(196, 218, 212, 426, 0.08, -2.5);

  // Zone E / F vertical wall at x = 420 (z: 222..432)
  addWallWithOpenings(false, 420, 222, 432, 2.8, [
    [244, 274, 4.6],
    [316, 348, 5.4],
    [390, 416, 4.2]
  ]);
  addPlat(412, 222, 428, 432, 0.26, -2.5);

  // Zone C / H at z = 426 (x: 24..192)
  addWallWithOpenings(true, 426, 24, 192, 2.8, [
    [46, 76, 3.8],
    [116, 140, 1.48], // Low crawl pipe duct C <-> H
    [156, 184, 4.2]
  ]);
  addPlat(24, 418, 192, 434, 0.14, -2.5);

  // Zone E / G at z = 426 (x: 192..366)
  addWallWithOpenings(true, 426, 192, 366, 2.6, [
    [212, 240, 4.8],
    [268, 304, 6.2],
    [338, 360, 4.5]
  ]);
  addPlat(192, 418, 366, 436, 0.24, -2.5);

  // Zone E+F / J at z = 432 (x: 366..504)
  addWallWithOpenings(true, 432, 366, 504, 2.8, [
    [384, 416, 5.2],
    [450, 484, 5.2]
  ]);
  addPlat(366, 422, 504, 440, 0.30, -2.5);

  // Zone F / I at z = 432 (x: 504..642)
  addWallWithOpenings(true, 432, 504, 642, 2.8, [
    [522, 552, 4.2],
    [590, 620, 4.2]
  ]);
  addPlat(504, 424, 642, 440, 0.26, -2.5);

  // Zone H / G at x = 192 (z: 426..642)
  addWallWithOpenings(false, 192, 426, 642, 2.6, [
    [454, 482, 4.2],
    [522, 552, 4.4],
    [592, 618, 1.48]
  ]);
  addPlat(184, 426, 200, 642, 0.22, -2.5);

  // Zone G / J at x = 366 (z: 432..642)
  addWallWithOpenings(false, 366, 432, 642, 2.8, [
    [460, 490, 5.2],
    [526, 560, 5.6],
    [596, 624, 4.2]
  ]);
  addPlat(358, 432, 374, 642, 0.30, -2.5);

  // Zone J / I at x = 504 (z: 432..642)
  addWallWithOpenings(false, 504, 432, 642, 2.8, [
    [466, 494, 4.4],
    [532, 564, 4.8],
    [598, 624, 4.0]
  ]);
  addPlat(498, 432, 512, 642, 0.28, -2.5);

  // =========================================================================
  // ZONE A — THE ENTRANCE POOLS (x: 24..202, z: 24..214)
  // =========================================================================
  addPlat(24, 24, 72, 72, 0.0, -2.5);   // Dry starter vestibule surrounding SPAWN (54, 54)
  addPlat(72, 24, 198, 72, 0.02, -2.5); // North dry promenade
  addPlat(24, 72, 72, 210, 0.02, -2.5); // West dry promenade
  addPlat(144, 72, 198, 210, 0.02, -2.5); // East dry promenade
  addPlat(72, 144, 144, 210, 0.02, -2.5); // South dry promenade

  // CRITICAL TEST INVARIANT: WATER_RECTS[0]
  // x0=72, z0=72, x1=144, z1=144 -> corner (76.5, 76.5) is deep pure water (-0.95 < -0.5)
  // Central dry bridge covers midpoint (108, 108) at y = +0.28 so bridgeTerr.inWater === false
  addWater(72, 72, 144, 144, -0.18, -0.95, 0.08);
  addPlat(103, 70, 113, 146, 0.28, -0.08); // Elevated dry bridge with clear swim-under or rim
  addRamp(103, 64, 113, 70, 0.02, 0.28, 's');
  addRamp(103, 146, 113, 152, 0.28, 0.02, 's');
  addRamp(70, 102, 78, 114, 0.02, -0.92, 'e');
  addRamp(138, 102, 146, 114, -0.92, 0.02, 'e');

  // Flanking reflection basins in Zone A (with dry walk borders!)
  addWater(80, 34, 134, 58, -0.18, -0.78, 0.06);
  addWater(156, 80, 190, 136, -0.18, -0.82, 0.10);
  addWater(82, 158, 134, 196, -0.18, -0.78, 0.12);

  addWallWithOpenings(false, 84, 28, 66, 1.4, [[40, 56, 3.8]], 6.5);
  addWallWithOpenings(true, 152, 28, 194, 1.6, [[46, 66, 3.8], [100, 118, 4.0], [160, 184, 4.0]], 7.5);
  addPillar(190, 94, 1.5, wallH);
  addPillar(190, 142, 1.5, wallH);

  addProp('pool_bench', 44, 42, 0.02, 0, 1.0);
  addProp('towel_stack', 46, 42, 0.45, 0.2, 1.0);
  addProp('pool_sign_board', 68, 62, 0.02, Math.PI * 0.75, 1.0);
  addProp('wet_footprints', 62, 62, 0.03, Math.PI * 0.25, 1.0);
  addProp('wet_footprints', 69, 69, 0.03, Math.PI * 0.25, 1.0);
  addProp('pool_drain_grate', 108, 108, 0.29, 0, 1.0);
  addProp('pool_ring', 92, 92, -0.17, 0.6, 1.05);
  addProp('pool_ring', 124, 122, -0.17, -0.4, 0.95);
  addProp('pool_noodle', 126, 88, -0.17, 0.8, 1.0);
  addProp('pool_ladder', 73.2, 86, -0.45, Math.PI * 0.5, 1.0);
  addProp('pool_ladder', 142.8, 128, -0.45, -Math.PI * 0.5, 1.0);
  addAnim('water_ripple_ring', 96, 86, -0.16, 0, 1.0);
  addLight(54, 9.5, 54, 0xffe4bd, 2.3, 44);
  addLight(108, 11.5, 108, 0xfff0d4, 2.8, 56);
  addLight(174, 10.5, 114, 0xd8f8ff, 2.4, 48);

  // =========================================================================
  // ZONE B — THE GRAND ATRIUM (x: 202..426, z: 24..222)
  // =========================================================================
  addPlat(204, 26, 424, 52, 0.04, -2.5);
  addPlat(204, 198, 424, 220, 0.04, -2.5);
  addPlat(204, 52, 232, 198, 0.04, -2.5);
  addPlat(396, 52, 424, 198, 0.04, -2.5);

  addWater(232, 52, 396, 198, -0.15, -1.22, 0.16);

  // Multi-Tiered Atrium Island Pavilion (center 315, 126; tele 282, 126 on dry west lower deck)
  addPlat(274, 106, 356, 146, 0.30, -1.25);
  addPlat(294, 112, 336, 140, 1.65, -1.25);
  addPlat(304, 116, 326, 136, 4.10, -1.25);
  addRamp(262, 120, 274, 132, -1.20, 0.30, 'e');
  addRamp(356, 120, 368, 132, 0.30, -1.20, 'e');
  addRamp(274, 118, 294, 134, 0.30, 1.65, 'e');
  addRamp(336, 118, 356, 134, 1.65, 0.30, 'e');
  addRamp(294, 96, 308, 116, 1.65, 4.10, 's');
  addRamp(322, 136, 336, 156, 4.10, 1.65, 's');

  // Elevated Triple-Arch North-South & West-East Aqueduct Bridges at y = +4.10
  addPlat(310, 32, 320, 116, 4.10, 3.60);
  addPlat(310, 136, 320, 222, 4.10, 3.60);
  addPlat(210, 122, 304, 130, 4.10, 3.60);
  addRamp(206, 50, 218, 122, 0.04, 4.10, 's');
  addRamp(396, 50, 412, 122, 0.04, 4.10, 's');
  addPlat(326, 122, 412, 130, 4.10, 3.60);

  // 2 Grand Atrium Slides (SLIDES[0] and SLIDES[1])
  addSlide(296, 56, 304, 102, 4.10, -0.05, 'n', 0x38ada9);
  addSlide(328, 146, 336, 192, 4.10, -0.05, 's', 0x22a6b3);

  for (const cx of [246, 286, 344, 382]) {
    for (const cz of [70, 180]) addPillar(cx, cz, 2.2, wallH, -1.25);
  }
  for (const cz of [104, 148]) {
    addPillar(246, cz, 2.2, wallH, -1.25);
    addPillar(382, cz, 2.2, wallH, -1.25);
  }

  addProp('skylight_shaft', 315, 126, 13.3, 0, 1.45);
  addProp('skylight_shaft', 266, 86, 13.3, 0.3, 1.05);
  addProp('skylight_shaft', 364, 166, 13.3, -0.2, 1.05);
  addProp('lifeguard_stand', 224, 152, 0.04, Math.PI * 0.5, 1.0);
  addProp('lounge_chair', 222, 74, 0.04, Math.PI * 0.35, 1.0);
  addProp('lounge_chair', 222, 84, 0.04, Math.PI * 0.45, 1.0);
  addProp('pool_bench', 284, 126, 0.31, 0, 1.0);
  addProp('pool_ring', 264, 156, -0.14, 0.2, 1.15);
  addProp('beach_ball', 360, 88, -0.13, 0, 1.1);
  addAnim('water_ripple_ring', 300, 58, -0.14, 0, 1.4);
  addAnim('water_ripple_ring', 332, 190, -0.14, 0, 1.4);
  addLight(315, 12.2, 126, 0xe8fbff, 3.2, 78);
  addLight(252, 10.5, 86, 0xd4f7ff, 2.4, 58);
  addLight(376, 10.5, 166, 0xfff3d9, 2.4, 58);

  // =========================================================================
  // ZONE C — THE SHALLOW LABYRINTH (x: 24..204, z: 214..426)
  // =========================================================================
  addWater(32, 220, 196, 418, -0.18, -0.78, 0.30);

  // Dry Pump #1 Sanctuary Plinth at (96, 342) + Dry stepping islands
  addPlat(84, 330, 108, 354, 0.35, -0.82);
  addRamp(76, 336, 84, 348, -0.75, 0.35, 'e');
  addRamp(108, 336, 116, 348, 0.35, -0.75, 'e');
  addPlat(48, 252, 66, 270, 0.20, -0.82);
  addPlat(156, 276, 174, 294, 0.20, -0.82);
  addPlat(148, 372, 168, 392, 0.20, -0.82);

  addWallWithOpenings(false, 74, 220, 418, 1.8, [[232, 250, 4.2], [292, 312, 1.48], [372, 396, 4.2]], wallH * 0.72);
  addWallWithOpenings(false, 122, 220, 418, 1.8, [[248, 270, 4.4], [322, 346, 4.2], [388, 408, 4.0]], wallH * 0.72);
  addWallWithOpenings(false, 168, 220, 418, 1.8, [[230, 254, 4.2], [304, 326, 4.4], [364, 384, 1.48]], wallH * 0.72);
  addWallWithOpenings(true, 272, 32, 196, 1.8, [[42, 64, 4.2], [88, 112, 4.2], [138, 158, 1.48], [176, 194, 4.2]], wallH * 0.72);
  addWallWithOpenings(true, 322, 32, 196, 1.8, [[40, 62, 4.0], [82, 114, 4.6], [134, 156, 4.2], [176, 194, 4.2]], wallH * 0.72);
  addWallWithOpenings(true, 372, 32, 196, 1.8, [[46, 66, 1.48], [90, 112, 4.4], [136, 158, 4.2]], wallH * 0.72);

  addProp('pool_drain_grate', 54, 300, -0.77, 0, 1.0);
  addProp('rubber_duck', 140, 248, -0.17, 1.1, 1.25);
  addProp('pool_ring', 142, 396, -0.17, 0.4, 1.0);
  addProp('pool_noodle', 52, 390, -0.17, 1.3, 1.0);
  addProp('towel_stack', 62, 256, 0.21, 0.3, 1.0);
  addProp('pool_sign_board', 86, 332, 0.36, Math.PI * 0.5, 1.0);
  addProp('hydraulic_pipe_elbow', 104, 334, 0.36, Math.PI, 1.0);
  addLight(56, 8.0, 260, 0xd8fff2, 2.0, 42);
  addLight(96, 8.5, 342, 0x7effd4, 2.5, 44);
  addLight(162, 8.5, 382, 0xbef5e8, 2.0, 42);

  // =========================================================================
  // ZONE D — THE SUNKEN CATHEDRAL & SUBMERGED STAIRCASE VAULT (x: 426..642, z: 24..222)
  // =========================================================================
  addPlat(428, 30, 476, 216, 0.32, -2.5);
  addPlat(476, 30, 636, 58, 0.32, -2.5);
  addPlat(476, 192, 636, 216, 0.32, -2.5);
  addPlat(594, 58, 636, 192, 0.32, -2.5);

  addWater(476, 58, 594, 192, -0.15, -2.20, 0.56);

  // Grand Submerged Staircase Cascade descending under water!
  addRamp(476, 98, 514, 154, 0.32, -2.18, 'e');
  addRamp(556, 98, 594, 154, -2.18, 0.32, 'e');
  addPlat(476, 68, 594, 78, 1.85, 1.35);
  addRamp(464, 68, 476, 78, 0.32, 1.85, 'e');
  addRamp(594, 68, 606, 78, 1.85, 0.32, 'e');
  addPlat(524, 114, 546, 138, 0.12, -2.2);

  for (const cx of [496, 535, 574]) {
    addPillar(cx, 84, 2.4, wallH, -2.4);
    addPillar(cx, 168, 2.4, wallH, -2.4);
  }
  addProp('skylight_shaft', 535, 126, 13.3, 0, 1.35);
  addProp('pool_bench', 612, 126, 0.33, Math.PI * 0.5, 1.1);
  addProp('wet_footprints', 484, 126, 0.33, Math.PI * 0.5, 1.0);
  addProp('pool_drain_grate', 535, 126, -2.18, 0, 1.3);
  addAnim('abyss_silhouette', 538, 148, -1.65, 0.5, 0.95, { radius: 8.5, speed: 0.24 });
  addLight(462, 10.5, 126, 0xd8f4ff, 2.3, 52);
  addLight(535, 12.0, 126, 0x9fe0f2, 2.9, 68);
  addLight(610, 10.0, 126, 0xc9efff, 2.2, 50);

  // =========================================================================
  // ZONE E — THE SLIDES & IMPOSSIBLE WATERPARK CHAMBERS (x: 204..420, z: 222..426)
  // =========================================================================
  addWater(210, 230, 412, 418, -0.16, -1.55, 0.22);

  addPlat(210, 230, 242, 418, 0.15, -2.0);
  addPlat(324, 336, 366, 376, 0.40, -1.6); // Pump #2 Deck!
  addRamp(312, 348, 324, 364, -1.50, 0.40, 'e');
  addRamp(366, 348, 378, 364, 0.40, -1.50, 'e');

  addPlat(264, 256, 308, 300, 3.80, -1.6);
  addPlat(274, 266, 298, 290, 6.00, 3.80);
  addRamp(242, 266, 264, 282, 0.15, 3.80, 'e');
  addRamp(264, 290, 274, 300, 3.80, 6.00, 'e');
  addPlat(308, 222, 320, 264, 3.80, 3.30);

  // SLIDES[2], [3], [4]
  addSlide(280, 298, 292, 364, 6.00, -0.05, 's', 0xff6b6b);
  addSlide(306, 274, 368, 286, 3.80, -0.05, 'e', 0x48dbfb);
  addSlide(274, 240, 286, 266, 3.80, -0.05, 'n', 0xfeca57);

  addPillar(268, 260, 1.4, wallH, -1.6);
  addPillar(304, 260, 1.4, wallH, -1.6);
  addPillar(268, 296, 1.4, wallH, -1.6);
  addPillar(304, 296, 1.4, wallH, -1.6);
  addProp('lounge_chair', 224, 310, 0.16, Math.PI * 0.5, 1.0);
  addProp('lounge_chair', 224, 322, 0.16, Math.PI * 0.4, 1.0);
  addProp('pool_ring', 286, 384, -0.15, 0.5, 1.25);
  addProp('pool_ring', 384, 282, -0.15, -0.3, 1.15);
  addProp('beach_ball', 360, 318, -0.14, 0, 1.2);
  addProp('hydraulic_pipe_elbow', 360, 342, 0.41, 0, 1.1);
  addProp('pool_sign_board', 328, 368, 0.41, -Math.PI * 0.5, 1.0);
  addAnim('water_ripple_ring', 286, 368, -0.15, 0, 1.7);
  addAnim('water_ripple_ring', 370, 280, -0.15, 0, 1.5);
  addLight(286, 11.8, 278, 0xfff5dc, 2.8, 62);
  addLight(342, 7.5, 354, 0xffd180, 2.5, 46);
  addLight(376, 10.5, 290, 0xbaf5ff, 2.2, 50);

  // =========================================================================
  // ZONE F — THE DEEP BASINS & ABYSSAL WELLS (x: 420..642, z: 222..432)
  // =========================================================================
  addPlat(424, 226, 456, 428, 0.30, -2.7);
  addPlat(606, 226, 638, 428, 0.30, -2.7);
  addPlat(456, 226, 606, 252, 0.30, -2.7);
  addPlat(456, 400, 606, 428, 0.30, -2.7);

  // WATER_RECTS[1]: Deep Accessible Basin in North-West Zone F for K_SPAWN!
  addWater(456, 252, 530, 326, -0.12, -1.75, 0.90);
  addWater(532, 252, 606, 398, -0.12, -2.60, 0.96);
  addWater(456, 330, 530, 398, -0.12, -2.45, 0.92);

  addPlat(456, 324, 606, 332, 0.30, -0.10);
  addPlat(527, 252, 535, 400, 0.30, -0.10);
  addPlat(576, 304, 608, 352, 2.80, -2.6);
  addRamp(592, 352, 608, 384, 0.30, 2.80, 'n');

  addProp('pool_diving_board', 572, 318, 2.81, -Math.PI * 0.5, 1.15);
  addProp('pool_diving_board', 572, 338, 2.81, -Math.PI * 0.5, 1.15);
  addProp('pool_ladder', 457.2, 274, -0.95, Math.PI * 0.5, 1.1);
  addProp('pool_ladder', 604.8, 376, -1.35, -Math.PI * 0.5, 1.1);
  addProp('pool_drain_grate', 568, 290, -2.58, 0, 1.6);
  addProp('pool_drain_grate', 494, 364, -2.43, 0, 1.5);
  addAnim('abyss_silhouette', 566, 290, -2.05, 0, 1.35, { radius: 14, speed: 0.32 });
  addAnim('abyss_silhouette', 492, 366, -1.95, 1.9, 1.20, { radius: 11, speed: 0.27 });
  addLight(444, 9.0, 330, 0x8ad5e3, 2.0, 48);
  addLight(566, 11.0, 292, 0x3b8599, 2.2, 56);
  addLight(588, 9.5, 330, 0x5ba3b5, 2.0, 46);

  // =========================================================================
  // ZONE G — THE IMPOSSIBLE ARCHITECTURAL GALLERY (x: 192..366, z: 426..642)
  // =========================================================================
  addWater(198, 434, 360, 634, -0.15, -0.82, 0.40);

  addPlat(256, 488, 298, 530, 0.30, -0.85);
  addPlat(270, 434, 286, 634, 0.30, -0.85);
  addPlat(198, 502, 360, 518, 0.30, -0.85);
  addRamp(246, 502, 256, 518, -0.78, 0.30, 'e');
  addRamp(298, 502, 308, 518, 0.30, -0.78, 'e');

  addPlat(220, 456, 334, 472, 3.60, 3.15);
  addRamp(198, 456, 220, 472, 0.30, 3.60, 'e');
  addRamp(334, 456, 356, 472, 3.60, 0.30, 'e');
  addWallWithOpenings(true, 564, 208, 350, 2.0, [[224, 252, 4.4], [270, 290, 4.4], [308, 336, 4.4]], 10.5);
  addWallWithOpenings(true, 598, 224, 336, 1.8, [[244, 266, 5.2], [292, 314, 5.2]], 9.0);
  addWallBox(222, 540, 236, 542, 4.5, 3.2, false);
  addWallBox(322, 540, 336, 542, 4.5, 3.2, false);
  for (const cx of [224, 334]) {
    addPillar(cx, 452, 1.6, wallH, -0.85);
    addPillar(cx, 578, 1.6, wallH, -0.85);
  }
  addProp('skylight_shaft', 278, 510, 13.3, 0, 1.25);
  addProp('pool_bench', 268, 496, 0.31, 0, 1.0);
  addProp('pool_sign_board', 292, 520, 0.31, Math.PI, 1.0);
  addLight(278, 12.0, 510, 0xdef7ff, 2.8, 62);
  addLight(234, 9.5, 580, 0xbbe8f2, 2.1, 48);
  addLight(328, 9.5, 464, 0xffeacc, 2.1, 46);

  // =========================================================================
  // ZONE H — FLOODED CORRIDOR NETWORK & MAINTENANCE SUBZONE (x: 24..192, z: 426..642)
  // =========================================================================
  addWater(30, 434, 186, 634, -0.15, -0.68, 0.72);

  addPlat(98, 518, 134, 554, 0.35, -0.72); // Dry Pump #3 Deck!
  addRamp(86, 528, 98, 544, -0.64, 0.35, 'e');
  addRamp(134, 528, 146, 544, 0.35, -0.64, 'e');
  addPlat(40, 444, 56, 620, 0.22, -0.72);

  addWallWithOpenings(false, 84, 434, 634, 2.0, [[450, 472, 3.8], [522, 550, 4.0], [594, 616, 1.48]], wallH);
  addWallWithOpenings(false, 148, 434, 634, 2.0, [[452, 474, 4.0], [522, 550, 4.0], [590, 612, 3.8]], wallH);
  addWallWithOpenings(true, 496, 30, 186, 2.0, [[42, 62, 3.6], [104, 128, 4.0], [162, 182, 3.6]], wallH);
  addWallWithOpenings(true, 574, 30, 186, 2.0, [[42, 62, 3.6], [104, 128, 1.48], [160, 182, 3.6]], wallH);

  addProp('pipe_bundle', 66, 468, 5.4, 0, 1.2);
  addProp('pipe_bundle', 166, 474, 5.4, Math.PI * 0.5, 1.2);
  addProp('pipe_bundle', 66, 602, 5.4, 0, 1.2);
  addProp('hydraulic_pipe_elbow', 124, 522, 0.36, Math.PI * 0.5, 1.15);
  addProp('shelf_rack', 102, 548, 0.36, 0, 0.85);
  addProp('pool_drain_grate', 116, 534, 0.36, 0, 1.15);
  addProp('pool_sign_board', 94, 522, 0.36, Math.PI * 0.75, 1.0);
  addAnim('water_ripple_ring', 68, 514, -0.14, 0, 0.9);
  addAnim('water_ripple_ring', 164, 598, -0.14, 0, 1.0);
  addLight(54, 7.2, 466, 0xffd28a, 1.8, 36);
  addLight(114, 7.6, 534, 0xffa855, 2.4, 42);
  addLight(166, 7.0, 604, 0x99d0ce, 1.7, 36);

  // =========================================================================
  // ZONE I — QUIET LIMINAL POCKET POOLS & OBSERVATION CHAMBER (x: 504..642, z: 432..642)
  // =========================================================================
  // 4 tiled dry deck zones carving clean borders around 4 quiet courtyard pools
  addPlat(508, 438, 636, 454, 0.24, -1.0);
  addPlat(508, 498, 636, 568, 0.24, -1.0);
  addPlat(508, 616, 636, 636, 0.24, -1.0);
  addPlat(508, 454, 520, 498, 0.24, -1.0);
  addPlat(566, 454, 582, 498, 0.24, -1.0);
  addPlat(624, 454, 636, 498, 0.24, -1.0);
  addPlat(508, 568, 520, 616, 0.24, -1.0);
  addPlat(566, 568, 582, 616, 0.24, -1.0);
  addPlat(624, 568, 636, 616, 0.24, -1.0);

  addWater(520, 454, 566, 498, -0.12, -0.72, 0.42);
  addWater(582, 454, 624, 498, -0.12, -0.72, 0.44);
  addWater(520, 568, 566, 616, -0.12, -0.72, 0.46);
  addWater(582, 568, 624, 616, -0.12, -0.72, 0.45);

  addWallWithOpenings(true, 514, 510, 634, 1.6, [[536, 558, 3.8], [594, 614, 3.8]], 7.0);
  addWallWithOpenings(false, 574, 444, 628, 1.6, [[470, 488, 3.6], [526, 550, 4.2], [588, 608, 3.6]], 7.0);

  addPlat(508, 518, 530, 556, 2.60, 0.24);
  addRamp(530, 526, 554, 548, 0.24, 2.60, 'w'); // West-upward slope from 554->530
  addProp('pool_bench', 550, 526, 0.25, 0, 1.0);
  addProp('towel_stack', 552, 526, 0.68, 0.1, 1.0);
  addProp('lounge_chair', 600, 526, 0.25, -Math.PI * 0.25, 1.0);
  addProp('wet_footprints', 524, 550, 0.25, Math.PI, 1.0);
  addProp('pool_ring', 544, 476, -0.11, 0.3, 0.95);
  addProp('rubber_duck', 604, 592, -0.11, -0.8, 1.2);
  addLight(544, 9.5, 476, 0xd4ecff, 2.2, 46);
  addLight(574, 9.5, 536, 0xc7e6ff, 2.4, 50);
  addLight(602, 9.5, 592, 0xe8d8ff, 2.0, 44);

  // =========================================================================
  // ZONE J — THE DRAINAGE VAULT & RETURN SANCTUARY (x: 366..504, z: 432..642)
  // =========================================================================
  addPlat(370, 438, 500, 484, 0.32, -1.6);
  addPlat(370, 598, 500, 636, 0.32, -1.6);
  addPlat(370, 484, 404, 598, 0.32, -1.6);
  addPlat(466, 484, 500, 598, 0.32, -1.6);

  addWater(404, 484, 466, 598, -0.22, -1.35, 0.35);
  addPlat(416, 504, 454, 558, 0.32, -1.4); // Central Sanctuary Island
  addPlat(376, 524, 418, 552, 0.32, -1.4); // West causeway
  addPlat(454, 524, 496, 552, 0.32, -1.4); // East causeway
  addPlat(426, 558, 444, 628, 0.32, -1.4); // Sluice Gate causeway to Portal!

  addPillar(414, 498, 1.8, wallH, -1.5);
  addPillar(456, 498, 1.8, wallH, -1.5);
  addPillar(418, 578, 1.8, wallH, -1.5);
  addPillar(452, 578, 1.8, wallH, -1.5);
  addWallBox(370, 576, 420, 580, wallH, 0, false);
  addWallBox(450, 576, 500, 580, wallH, 0, false);
  addAnim('drainage_sluice_gate', 435, 578, 0.32, 0, 1.0);

  addProp('skylight_shaft', 435, 540, 13.3, 0, 1.4);
  addProp('pool_drain_grate', 435, 492, -1.33, 0, 1.6);
  addProp('hydraulic_pipe_elbow', 416, 566, 0.33, Math.PI * 0.5, 1.2);
  addProp('hydraulic_pipe_elbow', 454, 566, 0.33, -Math.PI * 0.5, 1.2);
  addProp('pool_sign_board', 422, 508, 0.33, 0, 1.0);
  addAnim('water_ripple_ring', 410, 500, -0.20, 0, 1.4);
  addAnim('water_ripple_ring', 460, 564, -0.20, 0, 1.4);
  addLight(435, 11.8, 535, 0xcff8ff, 3.0, 66);
  addLight(435, 9.0, 616, 0x99ffe6, 2.6, 46);

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

  const SPAWN = { x: 54, z: 54, y: 0.08, yaw: Math.PI * 0.25 };
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
