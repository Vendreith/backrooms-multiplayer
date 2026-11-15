// ---------- Canonical 20-Level Backrooms Architectural & Prop Populator ----------
// Places lore-accurate 3D furnishings, ceiling fixtures, vehicles, foliage, stalactites,
// machinery, balconies, shrines & animated beacons across every sub-level while preserving
// clean navigation corridors between SPAWN, TASKS, PORTALS, and crawl vents.

export function populateLevelLoreProps(ctx) {
  const {
    cfg, span, mid, gC, gN, wallH, rnd, meta,
    RECTS, WALLS, WATER_RECTS, PLATFORMS, RAMPS, HOUSES, TOWERS, TREES, WHEAT,
    DECO_BLOCKS, LIGHTS, CRAWL_WALLS, hEdges, vEdges, cellSolid,
    SPAWN, END_POS, K_SPAWN, PROPS, ANIM_PROPS
  } = ctx;

  const arch = cfg.archetype;
  const ceilH = cfg.ceilH || wallH;

  function isClear(x, z, r = 1.6) {
    if (x < 3 || z < 3 || x > span - 3 || z > span - 3) return false;
    if (Math.hypot(x - SPAWN.x, z - SPAWN.z) < 3.0 + r) return false;
    if (Math.hypot(x - END_POS.x, z - END_POS.z) < 6.8 + r) return false;
    if (K_SPAWN && Math.hypot(x - K_SPAWN.x, z - K_SPAWN.z) < 4.2 + r) return false;
    for (let i = 0; i < (CRAWL_WALLS?.length || 0); i++) {
      const cw = CRAWL_WALLS[i];
      const cx = (cw.x0 + cw.x1) * 0.5, cz = (cw.z0 + cw.z1) * 0.5;
      if (Math.hypot(x - cx, z - cz) < 3.4 + r) return false;
    }
    return true;
  }

  function inWater(x, z, pad = 0.6) {
    for (let i = 0; i < WATER_RECTS.length; i++) {
      const w = WATER_RECTS[i];
      if (x >= w.x0 - pad && x <= w.x1 + pad && z >= w.z0 - pad && z <= w.z1 + pad) return true;
    }
    return false;
  }

  function pushSolidProp(kind, x, z, ry, hx, hz, h = 1.35, opts = {}) {
    const rot90 = Math.abs(Math.sin(ry || 0)) > 0.7;
    const rx = rot90 ? hz : hx;
    const rz = rot90 ? hx : hz;
    if (!isClear(x, z, Math.max(rx, rz) + 0.8)) return false;
    PROPS.push({ kind, x, y: opts.y ?? 0, z, ry, ...opts });
    if (opts.solid !== false) {
      RECTS.push({ x0: x - rx, z0: z - rz, x1: x + rx, z1: z + rz, y0: opts.y ?? 0, y1: (opts.y ?? 0) + h, h, hidden: true });
    }
    return true;
  }

  function pushDeco(kind, x, z, ry = 0, opts = {}) {
    PROPS.push({ kind, x, y: opts.y ?? 0, z, ry, ...opts });
  }

  // Iterate actual maze walls facing open cells so wall-mounted props sit flush on solid walls
  function forMazeWalls(stepMod, cb) {
    if (!hEdges || !vEdges || !cellSolid) return;
    let idx = 0;
    for (let r = 1; r < gN - 1; r++) {
      for (let c = 1; c < gN - 1; c++) {
        if (cellSolid[r][c]) continue;
        const cx = (c + 0.5) * gC, cz = (r + 0.5) * gC;
        if ((r + c) % stepMod !== 0) continue;
        if (hEdges[r]?.[c] === 1) {
          cb(cx, r * gC + 0.58, 0, r, c, idx++);
        } else if (vEdges[r]?.[c] === 1) {
          cb(c * gC + 0.58, cz, Math.PI * 0.5, r, c, idx++);
        } else if (hEdges[r + 1]?.[c] === 1) {
          cb(cx, (r + 1) * gC - 0.58, Math.PI, r, c, idx++);
        } else if (vEdges[r]?.[c + 1] === 1) {
          cb((c + 1) * gC - 0.58, cz, -Math.PI * 0.5, r, c, idx++);
        }
      }
    }
  }

  function forOpenCells(stepMod, cb) {
    if (!cellSolid) return;
    for (let r = 1; r < gN - 1; r++) {
      for (let c = 1; c < gN - 1; c++) {
        if (cellSolid[r][c]) continue;
        if (((r * 7 + c * 13) % stepMod) !== 0) continue;
        cb((c + 0.5) * gC, (r + 0.5) * gC, r, c);
      }
    }
  }

  function addRoadDetails(roadGrid, isDarkSuburb, isCartoon) {
    if (!roadGrid) return;
    for (const rx of roadGrid) {
      for (let z = 14; z < span - 14; z += 14) {
        pushDeco('road_dash_y', rx, z, 0, { y: 0.055, d: 6.0 });
        if (z % 28 === 14 && !roadGrid.some(rz => Math.abs(z - rz) < 12)) {
          const side = ((z / 28) & 1) ? -7.2 : 7.2;
          pushSolidProp(isDarkSuburb ? 'street_lamp' : 'street_lamp', rx + side, z, side > 0 ? -Math.PI * 0.5 : Math.PI * 0.5, 0.25, 0.25, 4.8, { warm: !isDarkSuburb });
          if (rnd() < 0.32 && !inWater(rx + side * 0.72, z)) {
            pushSolidProp('car', rx + (side > 0 ? 4.4 : -4.4), z + 4, side > 0 ? 0 : Math.PI, 1.0, 2.2, 1.4, {
              pastel: isCartoon && rnd() < 0.65,
              taxi: !isDarkSuburb && !isCartoon && rnd() < 0.45,
              red: isDarkSuburb && rnd() < 0.4
            });
          }
        }
      }
    }
    for (const rz of roadGrid) {
      for (let x = 14; x < span - 14; x += 14) {
        if (roadGrid.some(rx => Math.abs(x - rx) < 10)) continue;
        pushDeco('road_dash_y', x, rz, Math.PI * 0.5, { y: 0.055, d: 6.0 });
        if (x % 42 === 14) {
          pushSolidProp(isDarkSuburb ? 'fire_hydrant' : 'park_bench', x, rz + 7.4, Math.PI, 0.4, 0.4, 0.8);
        }
      }
    }
    for (const rx of roadGrid) {
      for (const rz of roadGrid) {
        pushDeco('crosswalk', rx, rz - 7.6, 0, { y: 0.058 });
        pushDeco('crosswalk', rx + 7.6, rz, Math.PI * 0.5, { y: 0.058 });
        if (isDarkSuburb) {
          pushSolidProp('stop_sign', rx + 7.5, rz + 7.5, -Math.PI * 0.5, 0.25, 0.25, 2.5);
          LIGHTS.push({ x: rx, z: rz, y: 4.8, hex: 0xaad4ff, gain: 0.95 });
        } else {
          pushSolidProp('traffic_light', rx - 7.8, rz - 7.8, 0, 0.3, 0.3, 5.2);
          if (isCartoon && rnd() < 0.7) {
            pushSolidProp('school_bus', rx - 4.2, rz + 18, Math.PI, 1.25, 3.8, 2.8);
          }
        }
      }
    }
  }

  // ==================== ARCHETYPE SPECIFIC DRESSING ====================

  if (arch === 'poolrooms') {
    const atria = meta.atria || [];
    for (let i = 0; i < atria.length; i++) {
      const a = atria[i];
      const cx = a.cx * gC, cz = a.cz * gC;
      // Overhead daylight skylight wells + soft volumetric shafts down into pools
      for (const [ox, oz] of [[-gC * 1.8, 0], [gC * 1.8, 0]]) {
        pushDeco('skylight_shaft', cx + ox, cz + oz, rnd() * Math.PI, { y: ceilH - 0.12, beamH: ceilH + 0.5 });
        LIGHTS.push({ x: cx + ox, z: cz + oz, y: ceilH - 1.2, hex: 0xc2f0ff, gain: 0.56, dist: 24 });
      }
      // Corner Roman ceramic pillars framing each pool atrium deck
      for (const [px, pz] of [
        [(a.cx - a.rx + 0.55) * gC, (a.cz - a.rz + 0.55) * gC],
        [(a.cx + a.rx - 0.55) * gC, (a.cz - a.rz + 0.55) * gC],
        [(a.cx - a.rx + 0.55) * gC, (a.cz + a.rz - 0.55) * gC],
        [(a.cx + a.rx - 0.55) * gC, (a.cz + a.rz - 0.55) * gC]
      ]) {
        pushSolidProp('arch_pillar', px, pz, 0, 0.58, 0.58, ceilH, { h: ceilH });
      }
      // Poolside ceramic lounge chairs + floating swim rings + deck ladders
      for (let d = -1; d <= 1; d += 2) {
        const lx = cx + d * (a.rx * gC - 2.6);
        const lz = cz + d * 4.5;
        if (!inWater(lx, lz, 0.1)) {
          pushSolidProp('lounge_chair', lx, lz, d > 0 ? -Math.PI * 0.5 : Math.PI * 0.5, 0.45, 0.95, 0.7);
        }
        pushDeco('pool_ring', cx + d * 4.6, cz - d * 3.2, 0, { y: 0.04, pink: (i + d) % 2 === 0 });
        pushDeco('pool_ladder', cx + d * 8.2, cz, d > 0 ? Math.PI * 0.5 : -Math.PI * 0.5, { y: 0.12 });
      }
      LIGHTS.push({ x: cx, z: cz, y: 0.4, hex: 0x3adcf0, gain: 0.52, dist: 22 });
    }
    forMazeWalls(3, (wx, wz, ry) => {
      if (!inWater(wx, wz, 0.2) && rnd() < 0.45) {
        pushDeco('pool_ring', wx, wz, ry, { pink: rnd() < 0.5 });
      }
    });
    forOpenCells(4, (cx, cz) => {
      LIGHTS.push({ x: cx, z: cz, y: ceilH - 0.5, hex: 0xb0e4f2, gain: 0.44 });
    });

  } else if (arch === 'redcity') {
    const corrC = meta.corrC ?? 10;
    const midCorrX = (corrC + 1.5) * gC;
    const leftWallX = corrC * gC + 1.25;
    const rightWallX = (corrC + 3) * gC - 1.25;
    // Canonical Escape the Backrooms Level ! Hospital Wing (crowded crimson sprint corridor)
    for (let z = 12; z < gC * 31; z += 10) {
      pushDeco('exit_sign_red', midCorrX, z, 0, { y: 4.55 });
      pushDeco('ceil_troffer', midCorrX, z + 5, 0, { y: 5.35, red: true });
      LIGHTS.push({ x: midCorrX, z: z + 5, y: 4.6, red: true, gain: 0.95, dist: 24 });
      if (z % 20 === 2) {
        ANIM_PROPS.push({ kind: 'siren_beacon', x: midCorrX, y: 5.15, z });
      }
      const odd = ((z / 10) & 1);
      // Inner hospital stretchers & IV stands clearly framing the running chute (~4.2m off centerline)
      pushSolidProp('hospital_bed', midCorrX + (odd ? -4.2 : 4.2), z + 1.5, odd ? 0.25 : -0.25, 0.58, 1.05, 0.95);
      pushDeco(odd ? 'wheelchair' : 'iv_stand', midCorrX + (odd ? 3.8 : -3.8), z - 1.5, odd ? -Math.PI * 0.4 : Math.PI * 0.4);
      // Outer perimeter beds & emergency lights
      pushSolidProp('hospital_bed', odd ? leftWallX : rightWallX, z + 2, odd ? Math.PI * 0.5 : -Math.PI * 0.5, 0.58, 1.05, 0.95);
      pushDeco('bulkhead_lamp', odd ? rightWallX + 0.75 : leftWallX - 0.75, z, odd ? -Math.PI * 0.5 : Math.PI * 0.5, { y: 3.1, red: true });
    }
    // Outer Red City apocalyptic avenues, neon signs, ambulances, barricades & dumpsters
    for (let x = 22; x < span - 22; x += 26) {
      for (let z = 22; z < span - 22; z += 26) {
        if (x > corrC * gC - 10 && x < (corrC + 3) * gC + 10 && z < gC * 33) continue;
        if (Math.abs(x - SPAWN.x) < 10 && Math.abs(z - SPAWN.z) < 10) continue;
        const r = rnd();
        if (r < 0.25) pushSolidProp('ambulance', x, z, rnd() * Math.PI * 2, 1.2, 2.4, 2.0);
        else if (r < 0.48) pushSolidProp('car', x, z, rnd() * Math.PI * 2, 1.0, 2.1, 1.4, { red: true });
        else if (r < 0.68) pushSolidProp('barricade', x, z, rnd() * Math.PI, 1.0, 0.35, 1.0);
        else if (r < 0.85) pushSolidProp('street_lamp_red', x, z, rnd() * Math.PI * 2, 0.25, 0.25, 4.8);
        else pushSolidProp('dumpster', x, z, rnd() * Math.PI, 1.1, 0.75, 1.2);
      }
    }
    for (const t of TOWERS) {
      if (t.h > 8) {
        pushDeco('neon_sign', t.x + t.w * 0.5 + 0.16, t.z, 0, { y: 6.5, cyan: rnd() < 0.25 });
      }
    }

  } else if (arch === 'office') {
    // Furnish the open entry lobby + plazas + hallways with cubicles & CRT workstations
    pushSolidProp('desk_pc', SPAWN.x + gC * 0.85, SPAWN.z + gC * 0.85, Math.PI, 0.82, 0.45, 1.0);
    pushDeco('office_chair', SPAWN.x + gC * 0.85, SPAWN.z + gC * 0.45, 0);
    pushSolidProp('potted_plant', SPAWN.x + gC * 1.25, SPAWN.z + gC * 0.25, 0, 0.35, 0.35, 0.95);
    for (const pl of (meta.plazas || [])) {
      const cx = (pl.c0 + pl.c1) * 0.5 * gC;
      const cz = (pl.r0 + pl.r1) * 0.5 * gC;
      for (const ox of [-3.4, 3.4]) {
        pushSolidProp('cubicle', cx + ox, cz - 2.2, ox > 0 ? Math.PI : 0, 1.15, 0.85, 1.38);
        pushDeco('office_chair', cx + ox, cz - 1.25, ox > 0 ? Math.PI : 0);
      }
      pushSolidProp('desk_pc', cx, cz + 2.8, Math.PI, 0.82, 0.45, 1.0);
      pushDeco('office_chair', cx, cz + 1.9, 0);
      if (rnd() < 0.7) pushSolidProp('potted_plant', cx - 5.2, cz + 3.6, 0, 0.35, 0.35, 0.95);
    }
    forMazeWalls(2, (wx, wz, ry, _r, _c, i) => {
      const pick = i % 5;
      if (pick === 0) pushSolidProp('file_cabinet', wx, wz, ry, 0.38, 0.38, 1.48);
      else if (pick === 1) pushSolidProp('water_cooler', wx, wz, ry, 0.32, 0.32, 1.45);
      else if (pick === 2) pushSolidProp('copier', wx, wz, ry, 0.55, 0.45, 1.15);
      else if (pick === 3) pushSolidProp('vending_machine', wx, wz, ry, 0.58, 0.45, 2.05, { crimson: i % 2 === 0 });
      else pushDeco('potted_plant', wx, wz, ry);
    });
    forOpenCells(2, (cx, cz, r, c) => {
      const flick = (r * 3 + c) % 7 === 0;
      pushDeco('ceil_troffer', cx, cz, (r + c) & 1 ? Math.PI * 0.5 : 0, { y: ceilH - 0.08 });
      LIGHTS.push({ x: cx, z: cz, y: ceilH - 0.45, hex: 0xe6eff8, gain: flick ? 0.35 : 0.62, flicker: flick });
    });

  } else if (arch === 'field') {
    const startRoadX = mid + Math.sin(36 * 0.012) * 140;
    pushSolidProp('silo', startRoadX + 22, 74, 0, 2.4, 2.4, 12.0);
    ANIM_PROPS.push({ kind: 'windmill', x: startRoadX + 16, y: 0, z: 68 });
    pushSolidProp('tractor', startRoadX + 11.5, 62, -0.5, 1.0, 1.5, 2.2, { crimson: true });
    for (let s = 18; s < span - 18; s += 16) {
      const roadX = mid + Math.sin(s * 0.012) * 140;
      pushDeco('fence_seg', roadX - 7.8, s, Math.PI * 0.5, { w: 12 });
      pushDeco('fence_seg', roadX + 7.8, s, Math.PI * 0.5, { w: 12 });
      if (s % 32 === 18) {
        pushSolidProp('utility_pole', roadX - 9.4, s, 0, 0.28, 0.28, 7.6);
      }
      if (s % 64 === 18 && rnd() < 0.75) {
        pushSolidProp('tractor', roadX + (rnd() < 0.5 ? 15 : -15), s, rnd() * Math.PI * 2, 1.0, 1.5, 2.2, { crimson: rnd() < 0.45 });
      }
    }
    for (let i = 0; i < HOUSES.length; i++) {
      const h = HOUSES[i];
      pushSolidProp('silo', h.x + 11.5, h.z - 2.0, 0, 2.4, 2.4, 12.0);
      ANIM_PROPS.push({ kind: 'windmill', x: h.x - 12.5, y: 0, z: h.z + 3.0 });
      if (i % 2 === 0) pushSolidProp('tractor', h.x + 8.5, h.z + 8.0, 0.5, 1.0, 1.5, 2.2, { crimson: i % 4 === 0 });
    }
    for (let i = 0; i < 65; i++) {
      const hx = 25 + rnd() * (span - 50), hz = 25 + rnd() * (span - 50);
      if (rnd() < 0.8) pushSolidProp('hay_bale', hx, hz, rnd() * Math.PI, 0.78, 0.78, 1.45);
      else pushSolidProp('scarecrow', hx, hz, rnd() * Math.PI * 2, 0.35, 0.35, 2.2);
    }

  } else if (arch === 'warehouse') {
    for (const pl of (meta.plazas || [])) {
      const cx = (pl.c0 + pl.c1) * 0.5 * gC, cz = (pl.r0 + pl.r1) * 0.5 * gC;
      pushSolidProp('hazard_pillar', cx - 3.6, cz - 3.6, 0, 0.62, 0.62, ceilH, { h: ceilH });
      pushSolidProp('shelf_rack', cx + 2.8, cz, Math.PI * 0.5, 0.55, 1.25, 2.8);
      if (rnd() < 0.5) pushSolidProp('car', cx - 2.0, cz + 3.2, 0, 1.0, 2.1, 1.4, { red: false });
      pushDeco('floodlight', cx + 4.4, cz - 3.5, -Math.PI * 0.75);
      LIGHTS.push({ x: cx + 4.4, z: cz - 3.5, y: 2.2, hex: 0xfff0cc, gain: 1.2 });
    }
    forMazeWalls(2, (wx, wz, ry, _r, _c, i) => {
      const p = i % 4;
      if (p === 0) pushSolidProp('crate_stack', wx, wz, ry, 0.75, 0.75, 1.5);
      else if (p === 1) pushSolidProp('oil_drum', wx, wz, ry, 0.40, 0.40, 1.05, { crimson: i % 3 === 0, blue: i % 3 === 1 });
      else if (p === 2) pushSolidProp('shelf_rack', wx, wz, ry, 1.15, 0.50, 2.8);
    });
    forOpenCells(3, (cx, cz, r, c) => {
      pushDeco('ceil_troffer', cx, cz, 0, { y: ceilH - 0.08, warm: true });
      LIGHTS.push({ x: cx, z: cz, y: ceilH - 0.45, hex: 0xffe4b2, gain: 0.92, flicker: (r + c) % 5 === 0 });
    });

  } else if (arch === 'pipes') {
    forMazeWalls(1, (wx, wz, ry, r, c, i) => {
      pushDeco('pipe_bundle', wx, wz, ry, { y: 1.55, w: gC * 0.86 });
      if (i % 3 === 0) pushDeco('pipe_valve', wx, wz, ry);
      if (i % 5 === 0) {
        pushDeco('bulkhead_lamp', wx, wz, ry, { y: ceilH - 0.65 });
        LIGHTS.push({ x: wx, z: wz, y: ceilH - 0.85, hex: 0xffa652, gain: 0.9 });
      }
    });
    forOpenCells(4, (cx, cz, r, c) => {
      if ((r + c) % 2 === 0) ANIM_PROPS.push({ kind: 'steam_vent', x: cx, y: 0.1, z: cz });
    });

  } else if (arch === 'electrical') {
    for (const pl of (meta.plazas || [])) {
      const cx = (pl.c0 + pl.c1) * 0.5 * gC, cz = (pl.r0 + pl.r1) * 0.5 * gC;
      pushSolidProp('transformer', cx - 2.6, cz, 0, 0.85, 0.60, 2.2);
      pushSolidProp('transformer', cx + 2.6, cz, Math.PI, 0.85, 0.60, 2.2);
      pushDeco('wire_cage', cx, cz - 3.6, 0, { w: 4.5, h: 2.8 });
    }
    forMazeWalls(2, (wx, wz, ry, _r, _c, i) => {
      if (i % 3 === 0) pushSolidProp('transformer', wx, wz, ry, 0.72, 0.56, 2.1);
      else if (i % 3 === 1) pushDeco('pipe_bundle', wx, wz, ry, { y: 2.35, w: gC * 0.8 });
      else pushSolidProp('oil_drum', wx, wz, ry, 0.4, 0.4, 1.05, { blue: true });
    });
    forOpenCells(3, (cx, cz, r, c) => {
      const fl = (r + c) % 4 === 0;
      pushDeco('bulkhead_lamp', cx, cz, 0, { y: ceilH - 0.12 });
      LIGHTS.push({ x: cx, z: cz, y: ceilH - 0.4, hex: 0xffd258, gain: 1.05, flicker: fl });
    });

  } else if (arch === 'hotel') {
    // Beverly Hotel Front Lobby facing across open 2x2 spawn foyer + golden chandeliers
    pushSolidProp('reception_desk', SPAWN.x + gC * 0.95, SPAWN.z + gC * 0.95, -Math.PI * 0.75, 0.65, 2.4, 1.2);
    pushDeco('luggage_cart', SPAWN.x + gC * 0.35, SPAWN.z + gC * 1.1, 0.4);
    pushSolidProp('grandfather_clock', SPAWN.x + gC * 1.25, SPAWN.z + gC * 0.25, -Math.PI * 0.5, 0.42, 0.36, 2.4);
    pushDeco('chandelier', SPAWN.x + gC * 0.5, SPAWN.z + gC * 0.5, 0, { y: ceilH - 1.35 });
    LIGHTS.push({ x: SPAWN.x + gC * 0.5, z: SPAWN.z + gC * 0.5, y: ceilH - 1.5, hex: 0xffaa52, gain: 0.68, dist: 24 });
    for (const pl of (meta.plazas || [])) {
      const cx = (pl.c0 + pl.c1) * 0.5 * gC, cz = (pl.r0 + pl.r1) * 0.5 * gC;
      pushSolidProp('armchair_table', cx - 2.4, cz, 0, 1.35, 0.65, 0.9);
      pushSolidProp('boiler_furnace', cx + 3.2, cz + 2.5, Math.PI, 1.1, 1.1, 2.2);
      pushDeco('chandelier', cx, cz, 0, { y: ceilH - 1.35 });
      LIGHTS.push({ x: cx, z: cz, y: ceilH - 1.6, hex: 0xffaa52, gain: 0.72, dist: 22 });
    }
    forMazeWalls(2, (wx, wz, ry, _r, _c, i) => {
      if (i % 3 !== 2) {
        pushDeco('hotel_door', wx, wz, ry);
        pushDeco('wall_sconce', wx, wz, ry, { y: 2.3 });
      } else {
        pushSolidProp('grandfather_clock', wx, wz, ry, 0.36, 0.30, 2.4);
      }
    });
    forOpenCells(4, (cx, cz) => {
      pushDeco('chandelier', cx, cz, 0, { y: ceilH - 1.25 });
      LIGHTS.push({ x: cx, z: cz, y: ceilH - 1.4, hex: 0xffae56, gain: 0.58 });
    });

  } else if (arch === 'blackout') {
    forMazeWalls(2, (wx, wz, ry, _r, _c, i) => {
      pushDeco('catwalk_rail', wx, wz, ry, { w: gC * 0.85 });
      if (i % 4 === 0) pushDeco('pipe_bundle', wx, wz, ry, { y: 1.9, w: gC * 0.8 });
      if (i % 7 === 0) pushSolidProp('transformer', wx, wz, ry, 0.7, 0.55, 2.0);
    });
    forOpenCells(4, (cx, cz, r, c) => {
      pushDeco('glowstick', cx + (rnd() - 0.5) * 1.4, cz + (rnd() - 0.5) * 1.4, rnd() * Math.PI, { pink: (r + c) % 3 === 0 });
      LIGHTS.push({ x: cx, z: cz, y: 0.45, hex: (r + c) % 3 === 0 ? 0xff70d0 : 0x3ee8ff, gain: 0.38, dist: 10 });
    });

  } else if (arch === 'ocean') {
    // Timber wharf dock pilings along ocean boardwalks + moored boats
    for (const pl of PLATFORMS) {
      if (pl.surface !== 'wood') continue;
      const w = pl.x1 - pl.x0, d = pl.z1 - pl.z0;
      if (w > 20 || d > 20) {
        const horiz = w >= d;
        const start = horiz ? pl.x0 + 4 : pl.z0 + 4;
        const end = horiz ? pl.x1 - 4 : pl.z1 - 4;
        for (let t = start; t <= end; t += 11) {
          const px1 = horiz ? t : pl.x0 + 0.35, pz1 = horiz ? pl.z0 + 0.35 : t;
          const px2 = horiz ? t : pl.x1 - 0.35, pz2 = horiz ? pl.z1 - 0.35 : t;
          const hasLamp = (Math.round(t) % 22) === 0;
          pushDeco('dock_piling', px1, pz1, 0, { y: -0.35, lamp: hasLamp });
          pushDeco('dock_piling', px2, pz2, 0, { y: -0.35, lamp: false });
          if (hasLamp) LIGHTS.push({ x: px1, z: pz1, y: 1.9, hex: 0xffba66, gain: 1.0, dist: 20 });
        }
      }
    }
    // Sea stacks, bobbing buoys, moored rowboats, plus rotating Lighthouse searchlight!
    for (let i = 0; i < 42; i++) {
      const rx = 20 + rnd() * (span - 40), rz = 20 + rnd() * (span - 40);
      if (Math.hypot(rx - mid, rz - mid) < 12) continue;
      if (i % 3 === 0) ANIM_PROPS.push({ kind: 'buoy', x: rx, y: 0.1, z: rz });
      else if (i % 3 === 1) pushDeco('rowboat', rx, rz, rnd() * Math.PI * 2, { y: -0.05 });
      else pushSolidProp('sea_rock', rx, rz, rnd() * Math.PI * 2, 1.8, 1.8, 4.5, { y: -0.4, h: 3.8 + rnd() * 3.8 });
    }
    for (const tw of TOWERS) {
      ANIM_PROPS.push({ kind: 'lighthouse_beam', x: tw.x, y: tw.h + 1.0, z: tw.z });
      LIGHTS.push({ x: tw.x, z: tw.z, y: tw.h + 1.2, hex: 0xfff2c2, gain: 2.4, dist: 42 });
    }

  } else if (arch === 'cave') {
    // Welcoming bioluminescent starter cavern bay + timber mine arch visible right ahead
    pushDeco('mine_arch', SPAWN.x + gC * 0.85, SPAWN.z + gC * 0.85, Math.PI * 0.25);
    pushDeco('glow_mushroom', SPAWN.x + gC * 0.55, SPAWN.z + gC * 1.15, 0);
    pushDeco('glow_mushroom', SPAWN.x + gC * 1.15, SPAWN.z + gC * 0.55, 1.2);
    LIGHTS.push({ x: SPAWN.x + gC * 0.85, z: SPAWN.z + gC * 0.85, y: 2.2, hex: 0x45e8ff, gain: 0.95, dist: 22 });
    forOpenCells(2, (cx, cz, r, c) => {
      pushDeco('stalactite', cx + (rnd() - 0.5) * 2.4, cz + (rnd() - 0.5) * 2.4, rnd() * Math.PI, {
        y: ceilH + 0.1, h: 2.2 + rnd() * 2.4, r: 0.35 + rnd() * 0.35
      });
      if ((r * 3 + c) % 4 === 0 && isClear(cx, cz, 2.2)) {
        pushSolidProp('stalagmite', cx + 1.6, cz - 1.5, 0, 0.55, 0.55, 2.5, { h: 2.2 + rnd() * 1.8, r: 0.42 + rnd() * 0.25 });
      }
      if ((r + c) % 3 === 0) {
        pushDeco('glow_mushroom', cx - 1.2, cz + 1.2, rnd() * Math.PI * 2);
        LIGHTS.push({ x: cx - 1.2, z: cz + 1.2, y: 0.75, hex: 0x3ce8ff, gain: 0.78, dist: 18 });
      }
    });
    for (const pl of (meta.plazas || [])) {
      const cx = (pl.c0 + pl.c1) * 0.5 * gC, cz = (pl.r0 + pl.r1) * 0.5 * gC;
      pushDeco('mine_arch', cx, cz - 2.6, 0);
      pushSolidProp('minecart', cx + 1.8, cz + 1.2, 0.3, 0.6, 0.85, 1.0);
      LIGHTS.push({ x: cx, z: cz - 2.6, y: 3.4, hex: 0xffad4e, gain: 0.95 });
    }

  } else if (arch === 'suburbs' || arch === 'motion_town') {
    const isDarkSuburb = arch === 'suburbs';
    const isCartoon = arch === 'motion_town';
    addRoadDetails(meta.roadGrid, isDarkSuburb, isCartoon);
    if (isDarkSuburb && meta.roadGrid) {
      const rz0 = meta.roadGrid[0];
      pushSolidProp('street_lamp', 88, rz0 + 7.2, Math.PI, 0.25, 0.25, 4.8);
      LIGHTS.push({ x: 88, z: rz0 + 6.5, y: 4.8, hex: 0xb0d4ff, gain: 1.05, dist: 28 });
      pushSolidProp('car', 96, rz0 - 4.2, -Math.PI * 0.5, 1.0, 2.2, 1.4, { red: true });
      pushSolidProp('fire_hydrant', 84, rz0 - 7.4, 0, 0.3, 0.3, 0.8);
      pushDeco('crosswalk', 80, rz0, Math.PI * 0.5, { y: 0.058 });
    }
    for (let i = 0; i < HOUSES.length; i++) {
      const h = HOUSES[i];
      pushSolidProp('mailbox', h.x + 6.5, h.z + 7.2, 0, 0.25, 0.25, 1.3, { blue: isCartoon });
      pushDeco('fence_seg', h.x - 5.5, h.z + 7.4, 0, { w: 4.5, white: true });
      pushDeco('fence_seg', h.x + 3.5, h.z + 7.4, 0, { w: 4.5, white: true });
    }
    if (isCartoon) {
      pushSolidProp('fountain', mid, meta.roadGrid ? meta.roadGrid[1] : mid, 0, 2.6, 2.6, 2.2);
    }

  } else if (arch === 'endless_city') {
    for (let s = 32; s < span - 32; s += 20) {
      pushDeco('road_dash_w', mid, s, 0, { y: 0.045, d: 5.5 });
      pushDeco('road_dash_w', s, mid, Math.PI * 0.5, { y: 0.045, d: 5.5 });
      if (s % 40 === 32) {
        pushSolidProp('street_lamp', mid - 9.5, s, Math.PI * 0.5, 0.25, 0.25, 4.8);
        pushSolidProp('street_lamp', mid + 9.5, s, -Math.PI * 0.5, 0.25, 0.25, 4.8);
        pushSolidProp('bus_stop', mid - 12.2, s + 8, Math.PI * 0.5, 0.85, 1.7, 2.5);
        pushSolidProp('car', mid + 4.8, s + 6, Math.PI, 1.0, 2.2, 1.4, { taxi: (s % 80 === 32) });
        pushSolidProp('car', s - 6, mid + 4.6, Math.PI * 0.5, 2.2, 1.0, 1.4, { red: s % 80 === 32 });
      }
    }
    pushSolidProp('traffic_light', mid - 9.5, mid - 9.5, 0, 0.3, 0.3, 5.2);
    pushSolidProp('traffic_light', mid + 9.5, mid + 9.5, Math.PI, 0.3, 0.3, 5.2);
    pushDeco('crosswalk', mid, mid - 10, 0, { y: 0.046 });
    pushDeco('crosswalk', mid + 10, mid, Math.PI * 0.5, { y: 0.046 });
    for (const tw of TOWERS) {
      pushDeco('ac_unit', tw.x + 1.5, tw.z - 1.2, rnd() * Math.PI, { y: tw.h });
      pushSolidProp('park_bench', tw.x - tw.w * 0.5 - 2.2, tw.z, Math.PI * 0.5, 0.35, 0.95, 0.85);
    }

  } else if (arch === 'crimson_forest') {
    for (let s = 42; s < span - 42; s += 28) {
      const px = mid + Math.sin(s * 0.015) * 120;
      if (s % 56 === 42) pushDeco('torii_shrine', px, s, Math.cos(s * 0.015) * 0.45);
      ANIM_PROPS.push({ kind: 'floating_lantern', x: px - 5.5, y: 2.6 + rnd() * 1.4, z: s + 6 });
      ANIM_PROPS.push({ kind: 'floating_lantern', x: px + 5.5, y: 2.6 + rnd() * 1.4, z: s - 6 });
      LIGHTS.push({ x: px + 5.5, z: s - 6, y: 2.6, hex: 0xff82b2, gain: 0.95, dist: 18 });
      if (s % 84 === 42) pushSolidProp('stone_altar', px + (rnd() < 0.5 ? 10 : -10), s, 0, 1.1, 1.1, 2.2);
    }

  } else if (arch === 'attic') {
    forOpenCells(2, (cx, cz, r, c) => {
      pushDeco('rafter_beam', cx, cz, (r + c) & 1 ? Math.PI * 0.5 : 0, { y: ceilH - 1.4, w: gC * 1.35 });
      if ((r + c) % 4 === 0) {
        pushDeco('bulkhead_lamp', cx, cz, 0, { y: ceilH - 1.35 });
        LIGHTS.push({ x: cx, z: cz, y: ceilH - 1.5, hex: 0xffba68, gain: 0.92, flicker: (r + c) % 8 === 0 });
      }
    });
    forMazeWalls(2, (wx, wz, ry, _r, _c, i) => {
      const k = i % 4;
      if (k === 0) pushSolidProp('cardboard_box', wx, wz, ry, 0.5, 0.5, 0.85, { sBox: 1.0 + (i % 3) * 0.25 });
      else if (k === 1) pushSolidProp('washer', wx, wz, ry, 0.42, 0.42, 1.15);
      else if (k === 2) pushSolidProp('crt_tv', wx, wz, ry, 0.40, 0.32, 0.85);
      else pushSolidProp('crate_stack', wx, wz, ry, 0.72, 0.72, 1.4);
    });

  } else if (arch === 'sunset_beach') {
    const seaLine = meta.seaLine || span * 0.56;
    for (let z = 34; z < span - 34; z += 18) {
      pushDeco('dock_piling', seaLine - 18.4, z, 0, { y: 0.0, lamp: z % 36 === 34 });
      pushDeco('dock_piling', seaLine - 9.6, z, 0, { y: 0.0, lamp: false });
      if (z % 36 === 34) {
        LIGHTS.push({ x: seaLine - 18.4, z, y: 2.2, hex: 0xff9f45, gain: 1.15, dist: 22 });
        const bx = seaLine - 28 - rnd() * 24;
        pushSolidProp('beach_umbrella', bx, z + 3, rnd() * Math.PI, 0.55, 0.55, 2.5, { pink: z % 72 === 34, blue: z % 72 !== 34 });
        pushSolidProp('lounge_chair', bx + 1.8, z + 3.2, -Math.PI * 0.5, 0.45, 0.95, 0.7);
      }
      if (z % 72 === 34) {
        pushDeco('rowboat', seaLine + 6, z, Math.PI * 0.5, { y: -0.04 });
        pushSolidProp('sea_rock', seaLine + 24 + rnd() * 30, z + 10, rnd() * Math.PI, 1.8, 1.8, 4.2, { y: -0.3, h: 3.6 + rnd() * 2.5 });
      }
    }
    pushSolidProp('lifeguard_tower', seaLine - 24, span * 0.48, -Math.PI * 0.5, 1.5, 1.5, 5.2);

  } else if (arch === 'window_courtyard') {
    // 3D Concrete recessed Balconies around all 4 Courtyard Plaza Towers + Courtyard Fountain
    const cMid = Math.floor(gN / 2);
    const rad = Math.max(4, Math.floor(gN * 0.14));
    const cx = cMid * gC, cz = cMid * gC;
    pushSolidProp('fountain', cx, cz, 0, 2.7, 2.7, 2.2);
    for (const [bx, bz] of [[cx - 9, cz - 9], [cx + 9, cz - 9], [cx - 9, cz + 9], [cx + 9, cz + 9]]) {
      pushSolidProp('park_bench', bx, bz, Math.PI * 0.25, 0.9, 0.45, 0.85);
      pushSolidProp('potted_plant', bx + 2.2, bz - 1.6, 0, 0.35, 0.35, 0.9);
    }
    for (let tierY = 7.5; tierY <= 22.5; tierY += 7.5) {
      for (let off = -rad * gC * 0.65; off <= rad * gC * 0.65; off += 14) {
        pushDeco('balcony_ledge', cx + off, (cMid - rad - 1) * gC + 0.52, 0, { y: tierY, w: 11.5 });
        pushDeco('balcony_ledge', cx + off, (cMid + rad + 1) * gC - 0.52, Math.PI, { y: tierY, w: 11.5 });
        pushDeco('balcony_ledge', (cMid - rad - 1) * gC + 0.52, cz + off, Math.PI * 0.5, { y: tierY, w: 11.5 });
        pushDeco('balcony_ledge', (cMid + rad + 1) * gC - 0.52, cz + off, -Math.PI * 0.5, { y: tierY, w: 11.5 });
      }
    }
    forMazeWalls(3, (wx, wz, ry, _r, _c, i) => {
      pushDeco(i % 2 === 0 ? 'hotel_door' : 'potted_plant', wx, wz, ry);
    });
    forOpenCells(3, (ox, oz) => {
      pushDeco('ceil_troffer', ox, oz, 0, { y: ceilH - 0.08 });
      LIGHTS.push({ x: ox, z: oz, y: ceilH - 0.5, hex: 0xfff5d8, gain: 0.95 });
    });

  } else if (arch === 'kitty_house') {
    pushSolidProp('kitchen_counter', SPAWN.x + gC * 0.95, SPAWN.z + gC * 0.95, -Math.PI * 0.75, 1.15, 0.45, 1.0);
    pushDeco('plushie', SPAWN.x + gC * 0.45, SPAWN.z + gC * 1.15, 0.4, { blue: true });
    pushDeco('fairy_light', SPAWN.x + gC * 0.55, SPAWN.z + gC * 0.55, 0, { y: ceilH - 0.35 });
    LIGHTS.push({ x: SPAWN.x + gC * 0.55, z: SPAWN.z + gC * 0.55, y: ceilH - 0.6, hex: 0xff9cd8, gain: 0.46 });
    forMazeWalls(2, (wx, wz, ry, _r, _c, i) => {
      const k = i % 5;
      if (k === 0) pushSolidProp('fridge', wx, wz, ry, 0.50, 0.45, 2.0);
      else if (k === 1) pushSolidProp('kitchen_counter', wx, wz, ry, 1.15, 0.45, 1.0);
      else if (k === 2) pushDeco('wall_painting', wx, wz, ry, { y: 1.85, pink: i % 2 === 0 });
      else if (k === 3) pushDeco('plushie', wx, wz, ry, { blue: i % 2 === 1 });
      else pushDeco('potted_plant', wx, wz, ry, { pink: true });
    });
    for (const pl of (meta.plazas || [])) {
      const cx = (pl.c0 + pl.c1) * 0.5 * gC, cz = (pl.r0 + pl.r1) * 0.5 * gC;
      pushSolidProp('armchair_table', cx, cz, 0, 1.35, 0.65, 0.9);
      pushDeco('plushie', cx - 1.1, cz + 1.2, 0.4, { blue: true });
    }
    forOpenCells(3, (cx, cz) => {
      pushDeco('fairy_light', cx, cz, 0, { y: ceilH - 0.35 });
      LIGHTS.push({ x: cx, z: cz, y: ceilH - 0.6, hex: 0xff9cd8, gain: 0.44 });
    });

  } else if (arch === 'void_staircase') {
    pushDeco('monolith_arch', mid, 56, 0, { y: 0 });
    ANIM_PROPS.push({ kind: 'glitch_cube', x: mid, y: 3.4, z: 56 });
    for (let i = 0; i < PLATFORMS.length; i++) {
      const pl = PLATFORMS[i];
      const cx = (pl.x0 + pl.x1) * 0.5, cz = (pl.z0 + pl.z1) * 0.5;
      const w = pl.x1 - pl.x0, d = pl.z1 - pl.z0;
      if (d < 8 || w < 8) continue;
      if (i % 2 === 0) {
        pushDeco('monolith_arch', cx, cz, 0, { y: pl.y });
        ANIM_PROPS.push({ kind: 'glitch_cube', x: cx, y: pl.y + 3.2, z: cz });
        LIGHTS.push({ x: cx, z: cz, y: pl.y + 4.5, hex: 0xa2dcff, gain: 0.52, dist: 24 });
      } else {
        pushDeco('park_bench', cx - w * 0.3, cz, Math.PI * 0.5, { y: pl.y });
        pushDeco('street_lamp', cx + w * 0.32, cz, -Math.PI * 0.5, { y: pl.y });
      }
      pushDeco('void_handrail', pl.x0 + 0.35, cz, Math.PI * 0.5, { y: pl.y, w: Math.min(d, 10) });
      pushDeco('void_handrail', pl.x1 - 0.35, cz, Math.PI * 0.5, { y: pl.y, w: Math.min(d, 10) });
    }
    for (let i = 0; i < RAMPS.length; i += 2) {
      const rm = RAMPS[i];
      const cx = (rm.x0 + rm.x1) * 0.5, cz = (rm.z0 + rm.z1) * 0.5;
      pushDeco('monolith_arch', cx, cz, 0, { y: (rm.y0 + rm.y1) * 0.5 });
    }
  }
}
