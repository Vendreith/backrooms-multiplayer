// ---------- Procedural PBR Texture Pack for 20 Iconic Backrooms Levels ----------
// Generates 512px seamless diffuse + ceiling + bump CanvasTextures cached per level theme
// so every corridor, street, hotel, cave, and pool reacts richly to flashlights and dynamic lamps.

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

function buildBumpFromDiffuse(diffuseCanvas, size = 128) {
  const [bc, bctx] = makeCanvas(size, size);
  bctx.drawImage(diffuseCanvas, 0, 0, size, size);
  const img = bctx.getImageData(0, 0, size, size);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const lum = Math.min(255, Math.max(0, (d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114)));
    d[i] = d[i + 1] = d[i + 2] = lum;
  }
  bctx.putImageData(img, 0, 0);
  return bc;
}

function buildPatternCanvas(pattern, baseHex, trimHex, size = 512, seed = 101) {
  const [c, ctx] = makeCanvas(size, size);
  const rnd = seededRng(seed);
  const rgb = hexToRgb(baseHex);
  const tRgb = hexToRgb(trimHex);

  ctx.fillStyle = rgba(rgb, 1, 1);
  ctx.fillRect(0, 0, size, size);

  if (pattern === 'pool_tile' || pattern === 'pool_tile_mint' || pattern === 'pool_tile_submerged') {
    const gridN = 16;
    const step = size / gridN;
    const isMint = pattern === 'pool_tile_mint';
    const isSub = pattern === 'pool_tile_submerged';
    ctx.fillStyle = isSub ? 'rgba(20, 92, 92, 0.94)' : isMint ? 'rgba(46, 122, 116, 0.90)' : 'rgba(78, 118, 114, 0.84)';
    ctx.fillRect(0, 0, size, size);
    for (let y = 0; y < gridN; y++) {
      for (let x = 0; x < gridN; x++) {
        const tint = 0.96 + (rnd() - 0.5) * 0.11;
        const tx = x * step;
        const ty = y * step;
        if (rnd() > 0.90 && !isSub) {
          ctx.fillStyle = isMint ? 'rgba(208, 240, 232, 0.98)' : 'rgba(237, 239, 226, 0.98)';
        } else if (rnd() > 0.85 && !isMint && !isSub) {
          ctx.fillStyle = 'rgba(212, 230, 222, 0.96)';
        } else {
          ctx.fillStyle = rgba(rgb, 1, tint);
        }
        ctx.fillRect(tx + 1.4, ty + 1.4, step - 2.8, step - 2.8);
        // Subtle porcelain glaze top/left highlight & crisp bottom/right edge
        ctx.fillStyle = 'rgba(255, 255, 255, 0.16)';
        ctx.fillRect(tx + 1.6, ty + 1.6, step - 3.6, 1.8);
        ctx.fillRect(tx + 1.6, ty + 1.6, 1.8, step - 3.6);
        ctx.fillStyle = 'rgba(42, 86, 84, 0.18)';
        ctx.fillRect(tx + 1.8, ty + step - 3.2, step - 3.4, 1.6);
        ctx.fillRect(tx + step - 3.2, ty + 1.8, 1.6, step - 3.4);
      }
    }
    ctx.strokeStyle = isSub ? 'rgba(18, 86, 86, 0.86)' : isMint ? 'rgba(42, 116, 110, 0.82)' : 'rgba(72, 114, 112, 0.78)';
    ctx.lineWidth = 2.1;
    ctx.beginPath();
    for (let i = 0; i <= gridN; i++) {
      ctx.moveTo(i * step, 0); ctx.lineTo(i * step, size);
      ctx.moveTo(0, i * step); ctx.lineTo(size, i * step);
    }
    ctx.stroke();
  } else if (pattern === 'red_concrete' || pattern === 'red_asphalt') {
    if (pattern === 'red_concrete') {
      // Clinical crimson hospital corridor dado + painted panel seams + scuffing
      ctx.fillStyle = rgba(rgb, 1, 1.04);
      ctx.fillRect(0, 0, size, size * 0.54);
      ctx.fillStyle = rgba(rgb, 1, 0.72);
      ctx.fillRect(0, size * 0.54, size, size * 0.46);
      ctx.fillStyle = 'rgba(255, 58, 42, 0.72)';
      ctx.fillRect(0, size * 0.52, size, 10);
      ctx.fillStyle = 'rgba(18, 8, 8, 0.75)';
      ctx.fillRect(0, size - 24, size, 24);
      ctx.strokeStyle = 'rgba(30, 10, 10, 0.35)';
      ctx.lineWidth = 3;
      for (let x = 0; x < size; x += size / 4) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, size); ctx.stroke();
      }
    } else {
      // Scuffed crimson linoleum/asphalt tile seams & streaks
      const tile = size / 4;
      ctx.strokeStyle = 'rgba(24, 10, 10, 0.42)';
      ctx.lineWidth = 2;
      for (let i = 0; i <= 4; i++) {
        ctx.beginPath(); ctx.moveTo(i * tile, 0); ctx.lineTo(i * tile, size); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, i * tile); ctx.lineTo(size, i * tile); ctx.stroke();
      }
    }
    for (let i = 0; i < 950; i++) {
      ctx.fillStyle = rgba(rnd() < 0.35 ? tRgb : rgb, 0.14 + rnd() * 0.2, 0.55 + rnd() * 0.5);
      ctx.fillRect(rnd() * size, rnd() * size, 4 + rnd() * 18, 3 + rnd() * 14);
    }
  } else if (pattern === 'office_panel' || pattern === 'office_carpet') {
    if (pattern === 'office_carpet') {
      const sq = size / 4;
      for (let y = 0; y < 4; y++) {
        for (let x = 0; x < 4; x++) {
          ctx.fillStyle = rgba(rgb, 1, 0.91 + ((x + y) & 1) * 0.11);
          ctx.fillRect(x * sq, y * sq, sq, sq);
        }
      }
      ctx.strokeStyle = 'rgba(72, 66, 56, 0.25)';
      ctx.lineWidth = 2;
      for (let i = 1; i < 4; i++) {
        ctx.beginPath(); ctx.moveTo(i * sq, 0); ctx.lineTo(i * sq, size); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, i * sq); ctx.lineTo(size, i * sq); ctx.stroke();
      }
      for (let i = 0; i < 1800; i++) {
        ctx.fillStyle = rgba(rgb, 0.2, 0.72 + rnd() * 0.48);
        ctx.fillRect(rnd() * size, rnd() * size, 2 + rnd() * 2, 2);
      }
    } else {
      // Office painted drywall + chair rail + rubber cove baseboard + door trim panel lines
      ctx.strokeStyle = 'rgba(118, 126, 134, 0.35)';
      ctx.lineWidth = 2;
      for (let x = 0; x < size; x += size / 2) {
        ctx.strokeRect(x + 8, 18, size / 2 - 16, size - 48);
      }
      ctx.fillStyle = rgba(tRgb, 0.55, 0.85);
      ctx.fillRect(0, 0, size, 18);
      ctx.fillStyle = 'rgba(58, 62, 68, 0.85)';
      ctx.fillRect(0, size - 24, size, 24);
      ctx.fillStyle = rgba(tRgb, 0.38, 1);
      ctx.fillRect(0, size * 0.55, size, 8);
    }
  } else if (pattern === 'field_grass' || pattern === 'crimson_grass' || pattern === 'cartoon_grass') {
    for (let i = 0; i < 2200; i++) {
      const shade = pattern === 'cartoon_grass' ? (0.94 + rnd() * 0.16) : (0.68 + rnd() * 0.48);
      ctx.fillStyle = rgba(rnd() < 0.28 ? tRgb : rgb, 0.65, shade);
      const bx = rnd() * size, by = rnd() * size;
      ctx.fillRect(bx, by, 2 + rnd() * 4, 6 + rnd() * 12);
    }
    if (pattern !== 'cartoon_grass') {
      for (let i = 0; i < 90; i++) {
        ctx.fillStyle = pattern === 'crimson_grass' ? 'rgba(235, 165, 195, 0.38)' : 'rgba(230, 210, 125, 0.38)';
        ctx.fillRect(rnd() * size, rnd() * size, 3, 3);
      }
    }
  } else if (pattern === 'sand') {
    for (let i = 0; i < 2400; i++) {
      ctx.fillStyle = rgba(rgb, 0.28, 0.82 + rnd() * 0.28);
      ctx.fillRect(rnd() * size, rnd() * size, 6 + rnd() * 24, 2 + rnd() * 4);
    }
  } else if (pattern === 'hotel_wallpaper' || pattern === 'hotel_carpet') {
    if (pattern === 'hotel_wallpaper') {
      const stripe = size / 8;
      for (let i = 0; i < 8; i++) {
        ctx.fillStyle = rgba(rgb, 1, (i & 1) ? 0.86 : 1.05);
        ctx.fillRect(i * stripe, 0, stripe, size);
      }
      // Damask diamonds + chair rail wainscoting
      ctx.strokeStyle = rgba(tRgb, 0.22, 1);
      ctx.lineWidth = 2;
      for (let y = 24; y < size * 0.65; y += 64) {
        for (let x = 32; x < size; x += 64) {
          ctx.beginPath();
          ctx.moveTo(x, y - 14); ctx.lineTo(x + 12, y);
          ctx.lineTo(x, y + 14); ctx.lineTo(x - 12, y);
          ctx.closePath(); ctx.stroke();
        }
      }
      ctx.fillStyle = 'rgba(42, 22, 14, 0.92)';
      ctx.fillRect(0, size * 0.70, size, size * 0.30);
      ctx.fillStyle = rgba(tRgb, 0.78, 1);
      ctx.fillRect(0, size * 0.69, size, 10);
      ctx.fillRect(0, size - 20, size, 20);
    } else {
      ctx.fillStyle = rgba(rgb, 1, 0.82);
      ctx.fillRect(0, 0, size, size);
      const g = size / 4;
      ctx.strokeStyle = rgba(tRgb, 0.56, 1.05);
      ctx.lineWidth = 4;
      for (let y = 0; y < 4; y++) {
        for (let x = 0; x < 4; x++) {
          const cx = x * g + g * 0.5, cy = y * g + g * 0.5;
          ctx.strokeRect(x * g + 8, y * g + 8, g - 16, g - 16);
          ctx.fillStyle = rgba(tRgb, 0.25, 1);
          ctx.beginPath();
          ctx.moveTo(cx, cy - g * 0.24); ctx.lineTo(cx + g * 0.24, cy);
          ctx.lineTo(cx, cy + g * 0.24); ctx.lineTo(cx - g * 0.24, cy);
          ctx.closePath(); ctx.fill();
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
        const lit = rnd() < 0.42;
        ctx.fillStyle = lit ? 'rgba(255, 244, 190, 0.96)' : 'rgba(22, 28, 36, 0.95)';
        ctx.fillRect(cl * cw + 14, r * ch + 14, cw - 28, ch - 28);
        // Interior curtain / blind silhouette on lit rooms
        if (lit && rnd() < 0.55) {
          ctx.fillStyle = 'rgba(195, 165, 105, 0.35)';
          ctx.fillRect(cl * cw + 14, r * ch + 14, (cw - 28) * 0.35, ch - 28);
        }
        ctx.strokeStyle = 'rgba(72, 78, 86, 0.95)';
        ctx.lineWidth = 4;
        ctx.strokeRect(cl * cw + 14, r * ch + 14, cw - 28, ch - 28);
        // Window mullion crosshair
        ctx.beginPath();
        ctx.moveTo(cl * cw + cw * 0.5, r * ch + 14);
        ctx.lineTo(cl * cw + cw * 0.5, r * ch + ch - 14);
        ctx.stroke();
      }
      // Concrete horizontal floor slab band
      ctx.fillStyle = rgba(rgb, 1, 0.78);
      ctx.fillRect(0, r * ch, size, 8);
    }
  } else if (pattern === 'city_facade') {
    ctx.fillStyle = rgba(rgb, 1, 1);
    ctx.fillRect(0, 0, size, size);
    const cols = 4, rows = 6;
    const cw = size / cols, ch = size / rows;
    for (let r = 0; r < rows; r++) {
      for (let cl = 0; cl < cols; cl++) {
        const lit = rnd() < 0.44;
        ctx.fillStyle = lit ? 'rgba(224, 238, 255, 0.82)' : 'rgba(34, 42, 54, 0.90)';
        ctx.fillRect(cl * cw + 10, r * ch + 8, cw - 20, ch - 16);
      }
      ctx.fillStyle = rgba(rgb, 0.9, 0.75);
      ctx.fillRect(0, r * ch, size, 4);
    }
  } else if (pattern === 'aged_brick' || pattern === 'pipe_brick') {
    const bh = size / 8, bw = size / 4;
    ctx.fillStyle = 'rgba(26, 22, 18, 0.96)';
    ctx.fillRect(0, 0, size, size);
    for (let r = 0; r < 8; r++) {
      const off = (r & 1) ? bw * 0.5 : 0;
      for (let c0 = -1; c0 < 5; c0++) {
        ctx.fillStyle = rgba(rgb, 1, 0.74 + rnd() * 0.42);
        ctx.fillRect(c0 * bw + off + 3, r * bh + 3, bw - 6, bh - 6);
      }
    }
    if (pattern === 'pipe_brick') {
      // Industrial grime & moisture drip streaks
      for (let i = 0; i < 60; i++) {
        ctx.fillStyle = 'rgba(16, 12, 10, 0.25)';
        ctx.fillRect(rnd() * size, rnd() * size, 3 + rnd() * 6, 18 + rnd() * 48);
      }
    }
  } else if (pattern === 'wood_plank' || pattern === 'wood_siding' || pattern === 'barn_wood') {
    const pCount = pattern === 'wood_plank' ? 8 : 10;
    const ph = size / pCount;
    for (let i = 0; i < pCount; i++) {
      ctx.fillStyle = rgba(rgb, 1, 0.82 + rnd() * 0.30);
      ctx.fillRect(0, i * ph, size, ph - 2);
      ctx.fillStyle = 'rgba(18, 10, 6, 0.40)';
      ctx.fillRect(0, (i + 1) * ph - 2, size, 2);
      // Nail heads & vertical board joints
      const jx = ((i * 173 + 64) % (size - 32)) + 16;
      ctx.fillRect(jx, i * ph, 2, ph - 2);
    }
  } else if (pattern === 'asphalt' || pattern === 'cave_rock' || pattern === 'concrete_wall' || pattern === 'warehouse_floor' || pattern === 'dark_metal' || pattern === 'grate_concrete' || pattern === 'brutalist_stone') {
    for (let i = 0; i < 1600; i++) {
      ctx.fillStyle = rgba(rgb, 0.24, 0.62 + rnd() * 0.58);
      ctx.fillRect(rnd() * size, rnd() * size, 4 + rnd() * 18, 4 + rnd() * 16);
    }
    if (pattern === 'concrete_wall') {
      // Brutalist poured-concrete panel joints + yellow-black warehouse safety stripe at base
      ctx.strokeStyle = 'rgba(30, 32, 34, 0.38)';
      ctx.lineWidth = 3;
      for (let i = 1; i < 4; i++) {
        ctx.beginPath(); ctx.moveTo((i * size) / 4, 0); ctx.lineTo((i * size) / 4, size); ctx.stroke();
      }
      ctx.fillStyle = '#d4a31e';
      ctx.fillRect(0, size - 44, size, 26);
      ctx.fillStyle = '#1b1d20';
      for (let x = -32; x < size + 32; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, size - 44); ctx.lineTo(x + 20, size - 44);
        ctx.lineTo(x + 6, size - 18); ctx.lineTo(x - 14, size - 18);
        ctx.closePath(); ctx.fill();
      }
    } else if (pattern === 'grate_concrete' || pattern === 'dark_metal') {
      ctx.strokeStyle = 'rgba(14, 16, 18, 0.55)';
      ctx.lineWidth = 4;
      for (let i = 0; i <= 8; i++) {
        const g = (i * size) / 8;
        ctx.beginPath(); ctx.moveTo(g, 0); ctx.lineTo(g, size); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, g); ctx.lineTo(size, g); ctx.stroke();
      }
    } else if (pattern === 'brutalist_stone') {
      ctx.strokeStyle = 'rgba(175, 180, 188, 0.45)';
      ctx.lineWidth = 2;
      for (let i = 1; i < 4; i++) {
        const g = (i * size) / 4;
        ctx.beginPath(); ctx.moveTo(g, 0); ctx.lineTo(g, size); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, g); ctx.lineTo(size, g); ctx.stroke();
      }
    }
  } else if (pattern === 'pastel_wainscot' || pattern === 'pastel_carpet' || pattern === 'cartoon_stucco' || pattern === 'birch_bark') {
    if (pattern === 'birch_bark') {
      for (let i = 0; i < 160; i++) {
        ctx.fillStyle = 'rgba(26, 22, 26, 0.72)';
        ctx.fillRect(rnd() * size, rnd() * size, 14 + rnd() * 44, 3 + rnd() * 5);
      }
    } else if (pattern === 'pastel_wainscot') {
      ctx.fillStyle = rgba(rgb, 1, 1);
      ctx.fillRect(0, 0, size, size);
      // Dreamcore vertical cream stripes + wainscot lower paneling
      const st = size / 8;
      for (let i = 0; i < 8; i += 2) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.24)';
        ctx.fillRect(i * st, 0, st, size * 0.62);
      }
      ctx.fillStyle = '#fff5f9';
      ctx.fillRect(0, size * 0.62, size, size * 0.38);
      ctx.fillStyle = rgba(tRgb, 0.9, 1);
      ctx.fillRect(0, size * 0.60, size, 12);
      ctx.strokeStyle = rgba(tRgb, 0.5, 0.9);
      ctx.lineWidth = 3;
      for (let x = 16; x < size; x += 64) {
        ctx.strokeRect(x, size * 0.66, 48, size * 0.28);
      }
    } else if (pattern === 'pastel_carpet') {
      const sq = size / 4;
      for (let y = 0; y < 4; y++) {
        for (let x = 0; x < 4; x++) {
          ctx.fillStyle = rgba(rgb, 1, ((x + y) & 1) ? 0.94 : 1.04);
          ctx.fillRect(x * sq, y * sq, sq, sq);
        }
      }
      for (let i = 0; i < 700; i++) {
        ctx.fillStyle = 'rgba(255, 245, 252, 0.16)';
        ctx.fillRect(rnd() * size, rnd() * size, 3, 3);
      }
    } else {
      for (let i = 0; i < 900; i++) {
        ctx.fillStyle = rgba(rgb, 0.14, 0.9 + rnd() * 0.18);
        ctx.fillRect(rnd() * size, rnd() * size, 8 + rnd() * 16, 8 + rnd() * 16);
      }
    }
  }
  return c;
}

function buildCeilingCanvas(levelCfg, size = 256) {
  const [c, ctx] = makeCanvas(size, size);
  const arch = levelCfg.archetype;
  const pal = levelCfg.palette || {};
  const rnd = seededRng(levelCfg.order * 131 + 17);

  if (arch === 'poolrooms') {
    ctx.fillStyle = '#efefe6';
    ctx.fillRect(0, 0, size, size);
    const step = size / 8;
    ctx.strokeStyle = 'rgba(130, 162, 156, 0.42)';
    ctx.lineWidth = 2;
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        const isCoffer = (x >= 1 && x <= 6 && y >= 1 && y <= 6) && (x === 1 || x === 6 || y === 1 || y === 6);
        ctx.fillStyle = isCoffer ? '#fafcf5' : ((x + y) & 1 ? '#e8ece2' : '#f1f3ea');
        ctx.fillRect(x * step + 1.5, y * step + 1.5, step - 3, step - 3);
        ctx.strokeRect(x * step + 1.5, y * step + 1.5, step - 3, step - 3);
      }
    }
    ctx.strokeStyle = 'rgba(252, 254, 246, 0.85)';
    ctx.lineWidth = 5;
    ctx.strokeRect(step, step, size - step * 2, size - step * 2);
  } else if (arch === 'office' || arch === 'redcity' || arch === 'warehouse' || arch === 'window_courtyard') {
    const base = arch === 'redcity' ? '#321414' : arch === 'warehouse' ? '#62666b' : '#ccc9be';
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, size, size);
    const step = size / 4;
    ctx.strokeStyle = arch === 'redcity' ? '#190808' : '#7b7870';
    ctx.lineWidth = 3;
    for (let y = 0; y < 4; y++) {
      for (let x = 0; x < 4; x++) {
        ctx.strokeRect(x * step, y * step, step, step);
        if (rnd() < 0.18) {
          ctx.fillStyle = arch === 'redcity' ? 'rgba(18, 4, 4, 0.35)' : 'rgba(90, 82, 62, 0.14)';
          ctx.fillRect(x * step + 4, y * step + 4, step - 8, step - 8);
        }
      }
    }
  } else if (arch === 'hotel') {
    ctx.fillStyle = '#331c16';
    ctx.fillRect(0, 0, size, size);
    ctx.strokeStyle = '#9a7a3e';
    ctx.lineWidth = 3;
    const g = size / 2;
    for (let y = 0; y < 2; y++) {
      for (let x = 0; x < 2; x++) {
        ctx.strokeRect(x * g + 8, y * g + 8, g - 16, g - 16);
      }
    }
  } else if (arch === 'kitty_house') {
    ctx.fillStyle = '#e5bdd0';
    ctx.fillRect(0, 0, size, size);
    ctx.strokeStyle = '#c484a4';
    ctx.lineWidth = 3;
    ctx.strokeRect(8, 8, size - 16, size - 16);
  } else if (arch === 'attic') {
    return buildPatternCanvas('wood_plank', pal.wall ?? 0x5c422c, 0x2c1b10, size, levelCfg.order * 59);
  } else if (arch === 'cave') {
    return buildPatternCanvas('cave_rock', pal.wall ?? 0x383635, 0x1a1919, size, levelCfg.order * 61);
  } else {
    return buildPatternCanvas(pal.wallPattern || 'concrete_wall', pal.wall ?? 0x888888, pal.trim ?? 0x444444, size, levelCfg.order * 67);
  }
  return c;
}

export function getLevelMaterials(levelCfg) {
  const key = levelCfg.id;
  if (_levelTexCache.has(key)) return _levelTexCache.get(key);

  const pal = levelCfg.palette || {};
  const wallCanvas = buildPatternCanvas(pal.wallPattern || 'concrete_wall', pal.wall ?? 0xcccccc, pal.trim ?? 0x888888, 512, levelCfg.order * 37 + 11);
  const floorCanvas = buildPatternCanvas(pal.floorPattern || 'warehouse_floor', pal.floor ?? 0x777777, pal.trim ?? 0x555555, 512, levelCfg.order * 73 + 29);
  const ceilCanvas = buildCeilingCanvas(levelCfg, 256);

  const wallBump = buildBumpFromDiffuse(wallCanvas, 128);
  const floorBump = buildBumpFromDiffuse(floorCanvas, 128);

  const isPoolrooms = levelCfg.archetype === 'poolrooms';
  const spanRep = isPoolrooms
    ? Math.max(60, Math.round((levelCfg.worldSpan || 672) / 2.4))
    : Math.max(24, Math.round((levelCfg.worldSpan || 500) / 8));
  const ceilRep = isPoolrooms
    ? Math.max(40, Math.round((levelCfg.worldSpan || 672) / 4.8))
    : Math.max(18, Math.round((levelCfg.worldSpan || 400) / 10));
  const wallTex = toRepeatTex(wallCanvas, 1, 1, true);
  const floorTex = toRepeatTex(floorCanvas, spanRep, spanRep, true);
  const ceilTex = toRepeatTex(ceilCanvas, ceilRep, ceilRep, true);
  const wallBumpTex = toRepeatTex(wallBump, 1, 1, false);
  const floorBumpTex = toRepeatTex(floorBump, spanRep, spanRep, false);

  let mintTileMat = null;
  let submergedTileMat = null;
  if (isPoolrooms) {
    const mintC = buildPatternCanvas('pool_tile_mint', 0xc8eee2, 0x4ca69c, 512, 307);
    const subC = buildPatternCanvas('pool_tile_submerged', 0x72dece, 0x247c78, 512, 509);
    const mintTex = toRepeatTex(mintC, 1, 1, true);
    const subTex = toRepeatTex(subC, 1, 1, true);
    mintTileMat = new THREE.MeshStandardMaterial({
      map: mintTex,
      bumpMap: wallBumpTex,
      bumpScale: 0.042,
      roughness: 0.44,
      metalness: 0.03,
      vertexColors: true,
      emissive: 0x6ecac0,
      emissiveIntensity: 0.08
    });
    submergedTileMat = new THREE.MeshStandardMaterial({
      map: subTex,
      bumpMap: wallBumpTex,
      bumpScale: 0.036,
      roughness: 0.36,
      metalness: 0.03,
      vertexColors: true,
      emissive: 0x269e98,
      emissiveIntensity: 0.16
    });
  }

  let waterTex = null;
  if (pal.water) {
    const [wc, wctx] = makeCanvas(256, 256);
    const wrgb = hexToRgb(pal.water);
    wctx.fillStyle = rgba(wrgb, 1, 1);
    wctx.fillRect(0, 0, 256, 256);
    const rnd = seededRng(levelCfg.order * 91);
    for (let i = 0; i < 180; i++) {
      wctx.strokeStyle = 'rgba(215, 252, 255, 0.34)';
      wctx.lineWidth = 2 + rnd() * 3;
      wctx.beginPath();
      wctx.arc(rnd() * 256, rnd() * 256, 10 + rnd() * 28, 0, Math.PI * 2);
      wctx.stroke();
    }
    waterTex = toRepeatTex(wc, 48, 48, true);
  }

  const isTile = pal.wallPattern === 'pool_tile';
  const pack = {
    wallMat: new THREE.MeshStandardMaterial({
      map: wallTex,
      bumpMap: wallBumpTex,
      bumpScale: isPoolrooms ? 0.052 : isTile ? 0.045 : 0.075,
      roughness: isPoolrooms ? 0.48 : isTile ? 0.24 : 0.82,
      metalness: pal.wallPattern === 'dark_metal' ? 0.45 : isPoolrooms ? 0.02 : 0.04,
      vertexColors: isPoolrooms,
      emissive: isPoolrooms ? 0xd6ded8 : 0x000000,
      emissiveIntensity: isPoolrooms ? 0.07 : 0
    }),
    floorMat: new THREE.MeshStandardMaterial({
      map: floorTex,
      bumpMap: floorBumpTex,
      bumpScale: isPoolrooms ? 0.048 : pal.floorPattern === 'pool_tile' ? 0.04 : 0.07,
      roughness: isPoolrooms ? 0.44 : pal.floorPattern === 'pool_tile' ? 0.26 : 0.88,
      metalness: pal.floorPattern === 'grate_concrete' ? 0.22 : 0.02,
      vertexColors: isPoolrooms,
      emissive: isPoolrooms ? 0xcadcd6 : 0x000000,
      emissiveIntensity: isPoolrooms ? 0.05 : 0
    }),
    ceilMat: new THREE.MeshStandardMaterial({
      map: ceilTex,
      roughness: isPoolrooms ? 0.45 : isTile ? 0.35 : 0.90,
      metalness: 0.03,
      vertexColors: isPoolrooms,
      emissive: isPoolrooms ? 0xe6eae0 : 0x000000,
      emissiveIntensity: isPoolrooms ? 0.28 : 0
    }),
    mintTileMat,
    submergedTileMat,
    trimMat: new THREE.MeshStandardMaterial({
      color: pal.trim ?? 0x888888,
      roughness: 0.50,
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
      opacity: levelCfg.archetype === 'poolrooms' ? 0.72 : 0.84,
      roughness: 0.12,
      metalness: 0.18
    }) : null,
    waterTex,
    wallTex,
    floorTex,
    ceilTex
  };

  _levelTexCache.set(key, pack);
  return pack;
}
