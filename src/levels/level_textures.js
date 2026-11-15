// ---------- Procedural On-Demand Texture Pack for 20 Iconic Backrooms Levels ----------
// Generates crisp seamless PBR diffuse + roughness CanvasTextures cached per level theme
// so entering any sub-level builds custom materials in milliseconds without slowing initial boot.

import { THREE } from '../engine.js';

const _levelTexCache = new Map();

function seededRng(seed) {
  let s = seed | 0;
  return () => {
    s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return [c, c.getContext('2d')];
}

function hexToRgb(hex) {
  return [(hex >> 16) & 255, (hex >> 8) & 255, hex & 255];
}

function rgba(rgb, a = 1, shade = 1) {
  return `rgba(${Math.max(0, Math.min(255, Math.round(rgb[0] * shade)))},${Math.max(0, Math.min(255, Math.round(rgb[1] * shade)))},${Math.max(0, Math.min(255, Math.round(rgb[2] * shade)))},${a})`;
}

function toRepeatTex(canvas, repX = 1, repY = 1, srgb = true) {
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repX, repY);
  if (srgb) tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  tex.needsUpdate = true;
  return tex;
}

function buildPatternCanvas(pattern, baseHex, trimHex, size = 256, seed = 101) {
  const [c, ctx] = makeCanvas(size, size);
  const rnd = seededRng(seed);
  const rgb = hexToRgb(baseHex);
  const tRgb = hexToRgb(trimHex);

  ctx.fillStyle = rgba(rgb, 1, 1);
  ctx.fillRect(0, 0, size, size);

  if (pattern === 'pool_tile') {
    const step = size / 8;
    ctx.strokeStyle = 'rgba(130, 175, 185, 0.55)';
    ctx.lineWidth = 2;
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        const tint = 0.94 + (rnd() - 0.5) * 0.08;
        ctx.fillStyle = rgba(rgb, 1, tint);
        ctx.fillRect(x * step + 1, y * step + 1, step - 2, step - 2);
      }
    }
    ctx.beginPath();
    for (let i = 0; i <= 8; i++) {
      ctx.moveTo(i * step, 0); ctx.lineTo(i * step, size);
      ctx.moveTo(0, i * step); ctx.lineTo(size, i * step);
    }
    ctx.stroke();
  } else if (pattern === 'red_concrete' || pattern === 'red_asphalt') {
    for (let i = 0; i < 650; i++) {
      ctx.fillStyle = rgba(rnd() < 0.35 ? tRgb : rgb, 0.14 + rnd() * 0.18, 0.7 + rnd() * 0.5);
      ctx.fillRect(rnd() * size, rnd() * size, 3 + rnd() * 14, 3 + rnd() * 14);
    }
    if (pattern === 'red_concrete') {
      ctx.strokeStyle = 'rgba(255, 65, 50, 0.32)';
      ctx.lineWidth = 2;
      for (let y = size / 4; y < size; y += size / 4) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(size, y); ctx.stroke();
      }
    }
  } else if (pattern === 'office_panel' || pattern === 'office_carpet') {
    if (pattern === 'office_carpet') {
      const sq = size / 4;
      for (let y = 0; y < 4; y++) {
        for (let x = 0; x < 4; x++) {
          ctx.fillStyle = rgba(rgb, 1, 0.92 + ((x + y) & 1) * 0.1);
          ctx.fillRect(x * sq, y * sq, sq, sq);
        }
      }
      for (let i = 0; i < 900; i++) {
        ctx.fillStyle = rgba(rgb, 0.18, 0.8 + rnd() * 0.4);
        ctx.fillRect(rnd() * size, rnd() * size, 2, 2);
      }
    } else {
      ctx.strokeStyle = 'rgba(130, 140, 150, 0.4)';
      ctx.lineWidth = 2;
      ctx.strokeRect(4, 4, size - 8, size - 8);
      ctx.fillStyle = rgba(tRgb, 0.25, 1);
      ctx.fillRect(0, 0, size, 12);
      ctx.fillRect(0, size - 14, size, 14);
    }
  } else if (pattern === 'field_grass' || pattern === 'crimson_grass' || pattern === 'cartoon_grass') {
    for (let i = 0; i < 1100; i++) {
      const shade = pattern === 'cartoon_grass' ? (0.94 + rnd() * 0.16) : (0.72 + rnd() * 0.45);
      ctx.fillStyle = rgba(rnd() < 0.28 ? tRgb : rgb, 0.65, shade);
      const bx = rnd() * size, by = rnd() * size;
      ctx.fillRect(bx, by, 2 + rnd() * 3, 5 + rnd() * 8);
    }
  } else if (pattern === 'sand') {
    for (let i = 0; i < 1200; i++) {
      ctx.fillStyle = rgba(rgb, 0.28, 0.84 + rnd() * 0.26);
      ctx.fillRect(rnd() * size, rnd() * size, 4 + rnd() * 16, 2 + rnd() * 3);
    }
  } else if (pattern === 'hotel_wallpaper' || pattern === 'hotel_carpet') {
    if (pattern === 'hotel_wallpaper') {
      const stripe = size / 8;
      for (let i = 0; i < 8; i++) {
        ctx.fillStyle = rgba(rgb, 1, (i & 1) ? 0.88 : 1.04);
        ctx.fillRect(i * stripe, 0, stripe, size);
      }
      ctx.fillStyle = rgba(tRgb, 0.35, 1);
      ctx.fillRect(0, size - 18, size, 18);
    } else {
      ctx.fillStyle = rgba(rgb, 1, 0.85);
      ctx.fillRect(0, 0, size, size);
      ctx.strokeStyle = rgba(tRgb, 0.48, 1);
      ctx.lineWidth = 3;
      const g = size / 4;
      for (let y = 0; y < 4; y++) {
        for (let x = 0; x < 4; x++) {
          ctx.strokeRect(x * g + 6, y * g + 6, g - 12, g - 12);
          ctx.fillStyle = rgba(tRgb, 0.22, 1);
          ctx.fillRect(x * g + g * 0.35, y * g + g * 0.35, g * 0.3, g * 0.3);
        }
      }
    }
  } else if (pattern === 'courtyard_windows') {
    ctx.fillStyle = rgba(rgb, 1, 1);
    ctx.fillRect(0, 0, size, size);
    const cols = 4, rows = 4;
    const cw = size / cols, ch = size / rows;
    for (let r = 0; r < rows; r++) {
      for (let cl = 0; cl < cols; cl++) {
        const lit = rnd() < 0.38;
        ctx.fillStyle = lit ? 'rgba(255, 240, 178, 0.96)' : 'rgba(28, 34, 42, 0.94)';
        ctx.fillRect(cl * cw + 12, r * ch + 10, cw - 24, ch - 20);
        ctx.strokeStyle = 'rgba(70, 76, 84, 0.9)';
        ctx.lineWidth = 3;
        ctx.strokeRect(cl * cw + 12, r * ch + 10, cw - 24, ch - 20);
      }
    }
  } else if (pattern === 'city_facade') {
    ctx.fillStyle = rgba(rgb, 1, 1);
    ctx.fillRect(0, 0, size, size);
    const cols = 4, rows = 6;
    const cw = size / cols, ch = size / rows;
    for (let r = 0; r < rows; r++) {
      for (let cl = 0; cl < cols; cl++) {
        const lit = rnd() < 0.42;
        ctx.fillStyle = lit ? 'rgba(220, 236, 252, 0.78)' : 'rgba(38, 46, 56, 0.85)';
        ctx.fillRect(cl * cw + 8, r * ch + 6, cw - 16, ch - 12);
      }
    }
  } else if (pattern === 'aged_brick' || pattern === 'pipe_brick') {
    const bh = size / 8, bw = size / 4;
    ctx.fillStyle = 'rgba(32, 26, 22, 0.95)';
    ctx.fillRect(0, 0, size, size);
    for (let r = 0; r < 8; r++) {
      const off = (r & 1) ? bw * 0.5 : 0;
      for (let c0 = -1; c0 < 5; c0++) {
        ctx.fillStyle = rgba(rgb, 1, 0.78 + rnd() * 0.36);
        ctx.fillRect(c0 * bw + off + 2, r * bh + 2, bw - 4, bh - 4);
      }
    }
  } else if (pattern === 'wood_plank' || pattern === 'wood_siding' || pattern === 'barn_wood') {
    const pCount = pattern === 'wood_plank' ? 8 : 10;
    const ph = size / pCount;
    for (let i = 0; i < pCount; i++) {
      ctx.fillStyle = rgba(rgb, 1, 0.84 + rnd() * 0.28);
      ctx.fillRect(0, i * ph, size, ph - 1);
      ctx.fillStyle = 'rgba(20, 12, 8, 0.35)';
      ctx.fillRect(0, (i + 1) * ph - 2, size, 2);
    }
  } else if (pattern === 'asphalt' || pattern === 'cave_rock' || pattern === 'concrete_wall' || pattern === 'warehouse_floor' || pattern === 'dark_metal' || pattern === 'grate_concrete' || pattern === 'brutalist_stone') {
    for (let i = 0; i < 950; i++) {
      ctx.fillStyle = rgba(rgb, 0.22, 0.65 + rnd() * 0.55);
      ctx.fillRect(rnd() * size, rnd() * size, 4 + rnd() * 14, 3 + rnd() * 12);
    }
    if (pattern === 'grate_concrete') {
      ctx.strokeStyle = 'rgba(18, 20, 22, 0.45)';
      ctx.lineWidth = 3;
      for (let i = 0; i <= 8; i++) {
        const g = (i * size) / 8;
        ctx.beginPath(); ctx.moveTo(g, 0); ctx.lineTo(g, size); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, g); ctx.lineTo(size, g); ctx.stroke();
      }
    }
  } else if (pattern === 'pastel_wainscot' || pattern === 'pastel_carpet' || pattern === 'cartoon_stucco' || pattern === 'birch_bark') {
    if (pattern === 'birch_bark') {
      ctx.fillStyle = '#e8e4de';
      ctx.fillRect(0, 0, size, size);
      ctx.fillStyle = 'rgba(38, 34, 32, 0.68)';
      for (let i = 0; i < 36; i++) {
        ctx.fillRect(rnd() * size, rnd() * size, 12 + rnd() * 38, 2 + rnd() * 5);
      }
    } else if (pattern === 'pastel_wainscot') {
      ctx.fillStyle = rgba(rgb, 1, 1);
      ctx.fillRect(0, 0, size, size);
      ctx.fillStyle = '#fff5f9';
      ctx.fillRect(0, size * 0.62, size, size * 0.38);
      ctx.fillStyle = rgba(tRgb, 0.9, 1);
      ctx.fillRect(0, size * 0.60, size, 8);
    } else {
      for (let i = 0; i < 550; i++) {
        ctx.fillStyle = rgba(rgb, 0.14, 0.9 + rnd() * 0.18);
        ctx.fillRect(rnd() * size, rnd() * size, 6 + rnd() * 12, 6 + rnd() * 12);
      }
    }
  }
  return c;
}

export function getLevelMaterials(levelCfg) {
  const key = levelCfg.id;
  if (_levelTexCache.has(key)) return _levelTexCache.get(key);

  const pal = levelCfg.palette || {};
  const wallCanvas = buildPatternCanvas(pal.wallPattern || 'concrete_wall', pal.wall ?? 0xcccccc, pal.trim ?? 0x888888, 256, levelCfg.order * 37 + 11);
  const floorCanvas = buildPatternCanvas(pal.floorPattern || 'warehouse_floor', pal.floor ?? 0x777777, pal.trim ?? 0x555555, 256, levelCfg.order * 73 + 29);

  const wallTex = toRepeatTex(wallCanvas, 1, 1, true);
  const floorTex = toRepeatTex(floorCanvas, Math.max(24, Math.round((levelCfg.worldSpan || 500) / 8)), Math.max(24, Math.round((levelCfg.worldSpan || 500) / 8)), true);

  // For Poolrooms / Ocean / Beach water shimmer
  let waterTex = null;
  if (pal.water) {
    const [wc, wctx] = makeCanvas(256, 256);
    const wrgb = hexToRgb(pal.water);
    wctx.fillStyle = rgba(wrgb, 1, 1);
    wctx.fillRect(0, 0, 256, 256);
    const rnd = seededRng(levelCfg.order * 91);
    for (let i = 0; i < 160; i++) {
      wctx.strokeStyle = 'rgba(215, 252, 255, 0.32)';
      wctx.lineWidth = 2 + rnd() * 3;
      wctx.beginPath();
      wctx.arc(rnd() * 256, rnd() * 256, 10 + rnd() * 28, 0, Math.PI * 2);
      wctx.stroke();
    }
    waterTex = toRepeatTex(wc, 48, 48, true);
  }

  const pack = {
    wallMat: new THREE.MeshStandardMaterial({
      map: wallTex,
      roughness: pal.wallPattern === 'pool_tile' ? 0.28 : 0.84,
      metalness: pal.wallPattern === 'dark_metal' ? 0.45 : 0.04
    }),
    floorMat: new THREE.MeshStandardMaterial({
      map: floorTex,
      roughness: pal.floorPattern === 'pool_tile' ? 0.30 : 0.90,
      metalness: 0.02
    }),
    trimMat: new THREE.MeshStandardMaterial({
      color: pal.trim ?? 0x888888,
      roughness: 0.52,
      metalness: 0.18
    }),
    accentMat: new THREE.MeshStandardMaterial({
      color: pal.accent ?? 0x48d0f5,
      emissive: pal.accent ?? 0x48d0f5,
      emissiveIntensity: 0.55,
      roughness: 0.32
    }),
    waterMat: waterTex ? new THREE.MeshStandardMaterial({
      map: waterTex,
      color: pal.water,
      transparent: true,
      opacity: 0.72,
      roughness: 0.14,
      metalness: 0.12
    }) : null,
    waterTex,
    wallTex,
    floorTex
  };

  _levelTexCache.set(key, pack);
  return pack;
}
