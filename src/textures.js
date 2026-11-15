import { THREE, PreloaderSystem } from './engine.js';
import { C, WH, N } from './constants.js';

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image: ${url}`));
    img.src = url;
  });
}

function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return [c, c.getContext('2d')];
}

function texFromImage(img, { srgb = true, repeat = [1, 1], anisotropy = 8 } = {}) {
  const t = new THREE.Texture(img);
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat[0], repeat[1]);
  t.anisotropy = anisotropy;
  t.needsUpdate = true;
  return t;
}

/**
 * Converts ambientCG white-background leak textures into crisp alpha-masked grime decals
 * (so leaks stain the wallpaper naturally without drawing opaque white boxes).
 */
function buildLeakAlphaTexture(colorImg, opacityImg = null, strength = 1.75, tint = [58, 46, 22]) {
  const size = 512;
  const [c, ctx] = makeCanvas(size, size);
  ctx.drawImage(colorImg, 0, 0, size, size);
  const imgData = ctx.getImageData(0, 0, size, size);
  const data = imgData.data;

  let opData = null;
  if (opacityImg) {
    const [oc, octx] = makeCanvas(size, size);
    octx.drawImage(opacityImg, 0, 0, size, size);
    opData = octx.getImageData(0, 0, size, size).data;
  }

  for (let i = 0; i < data.length; i += 4) {
    const lum = (data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114) / 255;
    let alpha;
    if (opData) {
      alpha = (opData[i] / 255) * 0.85;
    } else {
      // Invert brightness into alpha: pure white = 0 alpha, dark leak = high alpha
      alpha = Math.max(0, Math.min(1, (0.94 - lum) * strength));
    }
    // Deep damp organic stain tint so leaks look moldy & aged, never chalk-white
    const shade = 0.25 + lum * 0.35;
    data[i] = Math.round(tint[0] * shade);
    data[i + 1] = Math.round(tint[1] * shade);
    data[i + 2] = Math.round(tint[2] * shade);
    data[i + 3] = Math.round(alpha * 225);
  }
  ctx.putImageData(imgData, 0, 0);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  tex.needsUpdate = true;
  return tex;
}

/**
 * Generates weathered Backrooms notes, graffiti, arrows, tally scratches, mold & Async notices.
 */
function buildBackroomsPoster(kind) {
  const [c, ctx] = makeCanvas(512, 512);
  ctx.clearRect(0, 0, 512, 512);
  ctx.save();
  ctx.scale(2, 2);

  if (kind === 0) {
    // Async Level 0 Warning Flyer (peeling yellow/cream paper)
    ctx.save();
    ctx.translate(128, 128);
    ctx.rotate(-0.04);
    ctx.fillStyle = '#ddd29e';
    ctx.fillRect(-92, -104, 184, 208);
    ctx.fillStyle = '#b49f60';
    ctx.fillRect(-92, -104, 184, 34);
    ctx.fillStyle = '#241e12';
    ctx.font = 'bold 21px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('LEVEL 0 // ZONE', 0, -80);
    ctx.font = 'bold 16px monospace';
    ctx.fillText('ASYNC RESEARCH', 0, -40);
    ctx.fillStyle = '#7c1d18';
    ctx.font = 'bold 22px monospace';
    ctx.fillText('NO EXIT', 0, 6);
    ctx.fillStyle = '#2e2618';
    ctx.font = '13px monospace';
    ctx.fillText('AVOID RED LIGHTS', 0, 42);
    ctx.fillText('DRINK ALMOND WATER', 0, 64);
    // Tape corners
    ctx.fillStyle = 'rgba(210,195,120,0.75)';
    ctx.fillRect(-86, -110, 36, 14);
    ctx.fillRect(50, -110, 36, 14);
    ctx.restore();
  } else if (kind === 1) {
    // Desperate charcoal / dried-blood directional arrow
    ctx.strokeStyle = 'rgba(86,18,14,0.86)';
    ctx.lineWidth = 14;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(36, 128); ctx.lineTo(205, 118);
    ctx.moveTo(155, 76); ctx.lineTo(208, 118); ctx.lineTo(152, 165);
    ctx.stroke();
    ctx.fillStyle = 'rgba(65,15,12,0.85)';
    ctx.font = 'bold 24px monospace';
    ctx.fillText('RUN ->', 48, 206);
  } else if (kind === 2) {
    // Desperate day tally marks scratched into soggy wallpaper
    ctx.strokeStyle = 'rgba(28,22,16,0.82)';
    ctx.lineWidth = 5;
    for (let g = 0; g < 3; g++) {
      const gx = 32 + g * 68;
      for (let s = 0; s < 4; s++) {
        ctx.beginPath();
        ctx.moveTo(gx + s * 11, 56 + (g % 2) * 14);
        ctx.lineTo(gx + s * 11 + 3, 122 + (g % 2) * 14);
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.moveTo(gx - 5, 115 + (g % 2) * 14);
      ctx.lineTo(gx + 42, 62 + (g % 2) * 14);
      ctx.stroke();
    }
    ctx.fillStyle = 'rgba(40,30,18,0.72)';
    ctx.font = 'italic 20px serif';
    ctx.fillText('still lost...', 44, 198);
  } else if (kind === 3) {
    // Smeared oily handprints
    ctx.fillStyle = 'rgba(32,16,12,0.78)';
    for (const [ox, oy, sc] of [[112, 122, 1], [170, 165, 0.72]]) {
      ctx.save();
      ctx.translate(ox, oy);
      ctx.scale(sc, sc);
      ctx.beginPath(); ctx.ellipse(0, 12, 24, 30, -0.1, 0, Math.PI * 2); ctx.fill();
      for (let f = -2; f <= 2; f++) {
        ctx.beginPath();
        ctx.ellipse(f * 11, -34 + Math.abs(f) * 5, 4.5, 19, f * 0.08, 0, Math.PI * 2);
        ctx.fill();
      }
      // Drip streak
      ctx.fillRect(-10, 34, 6, 48);
      ctx.fillRect(6, 32, 4, 34);
      ctx.restore();
    }
  } else if (kind === 4) {
    // Hazard Tape & Damp Black Mold Bloom
    for (let i = 0; i < 42; i++) {
      const x = 128 + (Math.sin(i * 1.9) * 78);
      const y = 128 + (Math.cos(i * 2.7) * 78);
      const r = 8 + (i % 5) * 9;
      const g = ctx.createRadialGradient(x, y, 2, x, y, r);
      g.addColorStop(0, 'rgba(22,26,14,0.82)');
      g.addColorStop(1, 'rgba(22,26,14,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    }
  } else {
    // Eerie scrawled eye & warning
    ctx.strokeStyle = 'rgba(36,24,18,0.85)';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(40, 108); ctx.quadraticCurveTo(128, 42, 216, 108);
    ctx.quadraticCurveTo(128, 174, 40, 108);
    ctx.stroke();
    ctx.fillStyle = 'rgba(90,14,12,0.88)';
    ctx.beginPath(); ctx.arc(128, 108, 22, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#090604';
    ctx.beginPath(); ctx.arc(128, 108, 9, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(42,20,14,0.85)';
    ctx.font = 'bold 21px monospace';
    ctx.textAlign = 'center';
    ctx.fillText("DON'T TURN", 128, 206);
  }
  ctx.restore();

  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.magFilter = THREE.LinearFilter;
  return t;
}

function buildProceduralUIAndPropsTextures() {
  // Fluorescent Panel Texture
  const [fc, fctx] = makeCanvas(128, 128);
  fctx.fillStyle = '#e7e4c4'; fctx.fillRect(0, 0, 128, 128);
  fctx.fillStyle = '#fff9d8'; fctx.fillRect(8, 8, 112, 112);
  fctx.strokeStyle = '#9b9674'; fctx.lineWidth = 4;
  for (let i = 32; i < 128; i += 32) {
    fctx.beginPath(); fctx.moveTo(0, i); fctx.lineTo(128, i); fctx.stroke();
  }
  const fixTex = new THREE.CanvasTexture(fc);
  fixTex.colorSpace = THREE.SRGBColorSpace;

  // Halo Sprite
  const [hc, hctx] = makeCanvas(128, 128);
  const hg = hctx.createRadialGradient(64, 64, 4, 64, 64, 64);
  hg.addColorStop(0, 'rgba(255,244,195,0.9)');
  hg.addColorStop(0.35, 'rgba(255,232,160,0.35)');
  hg.addColorStop(1, 'rgba(255,220,140,0)');
  hctx.fillStyle = hg; hctx.fillRect(0, 0, 128, 128);
  const haloTex = new THREE.CanvasTexture(hc);
  haloTex.colorSpace = THREE.SRGBColorSpace;

  // Damp Carpet Puddle
  const [pc, pctx] = makeCanvas(256, 256);
  const pg = pctx.createRadialGradient(128, 128, 10, 128, 128, 120);
  pg.addColorStop(0, 'rgba(46,42,16,0.72)');
  pg.addColorStop(0.55, 'rgba(64,56,22,0.48)');
  pg.addColorStop(0.85, 'rgba(82,70,26,0.16)');
  pg.addColorStop(1, 'rgba(82,70,26,0)');
  pctx.fillStyle = pg; pctx.fillRect(0, 0, 256, 256);
  const puddleTex = new THREE.CanvasTexture(pc);
  puddleTex.colorSpace = THREE.SRGBColorSpace;

  // HVAC Vent Grille
  const [vc, vctx] = makeCanvas(128, 96);
  vctx.fillStyle = '#484d4a'; vctx.fillRect(0, 0, 128, 96);
  vctx.strokeStyle = '#232726'; vctx.lineWidth = 6; vctx.strokeRect(3, 3, 122, 90);
  vctx.fillStyle = '#141716';
  for (let y = 14; y < 82; y += 11) vctx.fillRect(10, y, 108, 6);
  const ventTex = new THREE.CanvasTexture(vc);
  ventTex.colorSpace = THREE.SRGBColorSpace;

  // Breaker Box Cabinet (detailed dials, hazard bar, high-voltage decal & louvers)
  const [cc, cctx] = makeCanvas(256, 256);
  cctx.fillStyle = '#474c46'; cctx.fillRect(0, 0, 256, 256);
  cctx.strokeStyle = '#202421'; cctx.lineWidth = 8; cctx.strokeRect(10, 10, 236, 236);
  cctx.fillStyle = '#252926'; cctx.fillRect(26, 28, 204, 72);
  cctx.fillStyle = '#121a16'; cctx.fillRect(40, 38, 92, 48);
  cctx.strokeStyle = '#4ed884'; cctx.lineWidth = 2; cctx.strokeRect(42, 40, 88, 44);
  cctx.fillStyle = '#d44820'; cctx.beginPath(); cctx.arc(178, 62, 16, 0, Math.PI * 2); cctx.fill();
  cctx.fillStyle = '#1d201d';
  for (let y = 122; y < 182; y += 12) cctx.fillRect(36, y, 184, 6);
  cctx.fillStyle = '#d49a24'; cctx.fillRect(28, 206, 200, 24);
  cctx.fillStyle = '#1a1810'; cctx.font = 'bold 16px monospace'; cctx.textAlign = 'center';
  cctx.fillText('BREAKER PANEL // HIGH VOLT', 128, 223);
  const cabTex = new THREE.CanvasTexture(cc);
  cabTex.colorSpace = THREE.SRGBColorSpace;

  const [wc, wctx] = makeCanvas(128, 128);
  wctx.fillStyle = '#d8a61e'; wctx.fillRect(0, 0, 128, 128);
  wctx.fillStyle = '#1b1a16';
  for (let i = -128; i < 256; i += 32) {
    wctx.beginPath();
    wctx.moveTo(i, 0); wctx.lineTo(i + 16, 0);
    wctx.lineTo(i + 144, 128); wctx.lineTo(i + 128, 128);
    wctx.closePath(); wctx.fill();
  }
  const warnTex = new THREE.CanvasTexture(wc);
  warnTex.wrapS = warnTex.wrapT = THREE.RepeatWrapping;
  warnTex.colorSpace = THREE.SRGBColorSpace;

  // Detailed Backrooms Item Textures
  // 1. Almond Water Flask Label Texture
  const [awc, awx] = makeCanvas(256, 256);
  awx.fillStyle = '#8fa39b'; awx.fillRect(0, 0, 256, 256);
  awx.fillStyle = '#2d5a42'; awx.fillRect(0, 68, 256, 118);
  awx.fillStyle = '#e8dfc0'; awx.fillRect(14, 82, 228, 90);
  awx.fillStyle = '#1b3c2c'; awx.font = 'bold 26px monospace'; awx.textAlign = 'center';
  awx.fillText('ALMOND WATER', 128, 118);
  awx.fillStyle = '#3c7656'; awx.font = 'bold 17px monospace';
  awx.fillText('M.E.G. PURIFIED', 128, 152);
  awx.fillStyle = '#33403c'; awx.fillRect(0, 0, 256, 28); // Metallic neck cap
  const itemWater = new THREE.CanvasTexture(awc);
  itemWater.colorSpace = THREE.SRGBColorSpace;
  itemWater.anisotropy = 8;

  // 2. EMF Entity Detector Texture
  const [scc, scx] = makeCanvas(256, 256);
  scx.fillStyle = '#272c30'; scx.fillRect(0, 0, 256, 256);
  scx.strokeStyle = '#48545c'; scx.lineWidth = 8; scx.strokeRect(8, 8, 240, 240);
  scx.fillStyle = '#082028'; scx.fillRect(28, 28, 200, 124);
  scx.strokeStyle = '#38d8ff'; scx.lineWidth = 2;
  for (let g = 48; g < 228; g += 28) { scx.beginPath(); scx.moveTo(g, 28); scx.lineTo(g, 152); scx.stroke(); }
  scx.beginPath();
  scx.moveTo(28, 92); scx.lineTo(74, 92); scx.lineTo(96, 46); scx.lineTo(118, 134); scx.lineTo(140, 92); scx.lineTo(228, 92);
  scx.stroke();
  scx.fillStyle = '#e6c240'; scx.font = 'bold 18px monospace'; scx.textAlign = 'center';
  scx.fillText('EMF ENTITY RADAR', 128, 198);
  const itemScan = new THREE.CanvasTexture(scc);
  itemScan.colorSpace = THREE.SRGBColorSpace;
  itemScan.anisotropy = 8;

  // 3. Deathmoth Jelly Jar Texture
  const [jlc, jlx] = makeCanvas(256, 256);
  jlx.fillStyle = '#d98824'; jlx.fillRect(0, 0, 256, 256);
  jlx.fillStyle = '#3a220e'; jlx.fillRect(0, 0, 256, 42);
  jlx.fillStyle = '#f2e0a8'; jlx.fillRect(18, 78, 220, 102);
  jlx.fillStyle = '#7a220a'; jlx.font = 'bold 26px monospace'; jlx.textAlign = 'center';
  jlx.fillText('MOTH JELLY', 128, 122);
  jlx.font = 'bold 16px monospace';
  jlx.fillText('STAMINA + SPEED', 128, 156);
  const itemJelly = new THREE.CanvasTexture(jlc);
  itemJelly.colorSpace = THREE.SRGBColorSpace;
  itemJelly.anisotropy = 8;

  // 4. Royal Ration Texture
  const [rrc, rrx] = makeCanvas(256, 256);
  rrx.fillStyle = '#c89b28'; rrx.fillRect(0, 0, 256, 256);
  rrx.strokeStyle = '#5c4208'; rrx.lineWidth = 10; rrx.strokeRect(12, 12, 232, 232);
  rrx.fillStyle = '#2d1e04'; rrx.font = 'bold 26px monospace'; rrx.textAlign = 'center';
  rrx.fillText('ROYAL', 128, 108);
  rrx.fillText('RATION', 128, 146);
  rrx.font = 'bold 15px monospace';
  rrx.fillText('FULL RESTORE', 128, 188);
  const itemRation = new THREE.CanvasTexture(rrc);
  itemRation.colorSpace = THREE.SRGBColorSpace;
  itemRation.anisotropy = 8;

  // 5. UV Flare Tube Texture
  const [flc, flx] = makeCanvas(256, 256);
  flx.fillStyle = '#9226b8'; flx.fillRect(0, 0, 256, 256);
  flx.fillStyle = '#211428'; flx.fillRect(0, 0, 256, 36);
  flx.fillStyle = '#f2c8ff'; flx.font = 'bold 24px monospace'; flx.textAlign = 'center';
  flx.fillText('UV FLARE 365nm', 128, 128);
  flx.fillStyle = '#e8d44d'; flx.fillRect(0, 190, 256, 26);
  const itemFlare = new THREE.CanvasTexture(flc);
  itemFlare.colorSpace = THREE.SRGBColorSpace;
  itemFlare.anisotropy = 8;

  // Environmental Asset Textures: Exit Door, Office Desk Wood, Filing Cabinet Metal, Supply Crate, Pit Grate
  const [edc, edx] = makeCanvas(256, 256);
  edx.fillStyle = '#434844'; edx.fillRect(0, 0, 256, 256);
  edx.strokeStyle = '#1f2220'; edx.lineWidth = 8; edx.strokeRect(8, 8, 240, 240);
  for (let y = 24; y < 236; y += 22) { edx.fillStyle = 'rgba(0,0,0,0.22)'; edx.fillRect(14, y, 228, 4); }
  edx.fillStyle = '#a8221e'; edx.fillRect(58, 92, 140, 42);
  edx.fillStyle = '#fff4e0'; edx.font = 'bold 26px monospace'; edx.textAlign = 'center';
  edx.fillText('EXIT DOOR', 128, 122);
  const exitDoorTex = new THREE.CanvasTexture(edc);
  exitDoorTex.colorSpace = THREE.SRGBColorSpace;
  exitDoorTex.anisotropy = 8;

  const [wdc, wdx] = makeCanvas(128, 128);
  wdx.fillStyle = '#5c4128'; wdx.fillRect(0, 0, 128, 128);
  wdx.fillStyle = 'rgba(24,14,6,0.25)';
  for (let y = 6; y < 128; y += 11) wdx.fillRect(0, y, 128, 3);
  const deskWood = new THREE.CanvasTexture(wdc);
  deskWood.colorSpace = THREE.SRGBColorSpace;

  const [mbc, mbx] = makeCanvas(128, 256);
  mbx.fillStyle = '#585c54'; mbx.fillRect(0, 0, 128, 256);
  mbx.strokeStyle = '#2b2e2a'; mbx.lineWidth = 4;
  for (let d = 0; d < 4; d++) {
    mbx.strokeRect(10, 12 + d * 60, 108, 52);
    mbx.fillStyle = '#c4be9c'; mbx.fillRect(48, 26 + d * 60, 32, 10);
    mbx.fillStyle = '#222422'; mbx.fillRect(52, 44 + d * 60, 24, 6);
  }
  const metalCab = new THREE.CanvasTexture(mbc);
  metalCab.colorSpace = THREE.SRGBColorSpace;

  const [pgc, pgx] = makeCanvas(128, 128);
  pgx.fillStyle = '#030303'; pgx.fillRect(0, 0, 128, 128);
  pgx.strokeStyle = '#2a2618'; pgx.lineWidth = 6;
  for (let i = 0; i <= 128; i += 32) {
    pgx.beginPath(); pgx.moveTo(i, 0); pgx.lineTo(i, 128); pgx.stroke();
    pgx.beginPath(); pgx.moveTo(0, i); pgx.lineTo(128, i); pgx.stroke();
  }
  const pitGrate = new THREE.CanvasTexture(pgc);
  pitGrate.wrapS = pitGrate.wrapT = THREE.RepeatWrapping;
  pitGrate.repeat.set(3, 3);
  pitGrate.colorSpace = THREE.SRGBColorSpace;

  // Varied Detailed Backrooms Floor Textures (Poolrooms Tile, Wet Concrete, Terrazzo Lobby, Red Carpet, Office Squares)
  const makeRepeating = (canvas, rx = 1, ry = 1) => {
    const tx = new THREE.CanvasTexture(canvas);
    tx.wrapS = tx.wrapT = THREE.RepeatWrapping;
    tx.repeat.set(rx, ry);
    tx.anisotropy = 16;
    tx.colorSpace = THREE.SRGBColorSpace;
    return tx;
  };

  // 1) Poolrooms Ceramic Tile (damp turquoise-cream grid with stained grout)
  const [ptc, ptx] = makeCanvas(256, 256);
  ptx.fillStyle = '#a8bdb2'; ptx.fillRect(0, 0, 256, 256);
  for (let y = 0; y < 256; y += 32) {
    for (let x = 0; x < 256; x += 32) {
      const n = (((x * 13 + y * 29) & 31) - 16) * 0.6;
      ptx.fillStyle = `rgb(${Math.round(166 + n)}, ${Math.round(192 + n)}, ${Math.round(182 + n)})`;
      ptx.fillRect(x + 2, y + 2, 28, 28);
    }
  }
  ptx.fillStyle = 'rgba(26,42,36,0.22)';
  ptx.beginPath(); ptx.arc(140, 110, 68, 0, Math.PI * 2); ptx.fill();
  const poolTileTex = makeRepeating(ptc, 2, 2);

  // 2) Brutalist Wet Concrete Floor (poured slabs, cracks, puddles, gritty aggregate)
  const [cnc, cnx] = makeCanvas(256, 256);
  cnx.fillStyle = '#5c5c58'; cnx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 2400; i++) {
    const x = (i * 73) % 256, y = (i * 137) % 256;
    cnx.fillStyle = (i & 1) ? 'rgba(24,24,22,0.28)' : 'rgba(130,130,124,0.18)';
    cnx.fillRect(x, y, 2, 2);
  }
  cnx.strokeStyle = '#333430'; cnx.lineWidth = 4;
  cnx.strokeRect(2, 2, 124, 124); cnx.strokeRect(130, 2, 124, 124);
  cnx.strokeRect(2, 130, 124, 124); cnx.strokeRect(130, 130, 124, 124);
  cnx.fillStyle = 'rgba(20,22,20,0.34)';
  cnx.beginPath(); cnx.ellipse(128, 128, 62, 42, 0.4, 0, Math.PI * 2); cnx.fill();
  const concreteFloorTex = makeRepeating(cnc, 2, 2);

  // 3) 1970s Terrazzo / Checkerboard Lobby Tile
  const [tzc, tzx] = makeCanvas(256, 256);
  tzx.fillStyle = '#b4a678'; tzx.fillRect(0, 0, 256, 256);
  for (let y = 0; y < 256; y += 64) {
    for (let x = 0; x < 256; x += 64) {
      tzx.fillStyle = ((x + y) / 64) % 2 === 0 ? '#a89660' : '#7a6c44';
      tzx.fillRect(x, y, 64, 64);
    }
  }
  for (let i = 0; i < 650; i++) {
    tzx.fillStyle = (i % 3 === 0) ? 'rgba(28,22,12,0.28)' : 'rgba(220,208,162,0.22)';
    tzx.fillRect((i * 97) % 256, (i * 53) % 256, 3, 2);
  }
  const terrazzoFloorTex = makeRepeating(tzc, 2, 2);

  // 4) Redrooms Deep Crimson Woven Carpet
  const [rcc, rcx] = makeCanvas(256, 256);
  rcx.fillStyle = '#5c1816'; rcx.fillRect(0, 0, 256, 256);
  for (let y = 0; y < 256; y += 4) {
    rcx.fillStyle = (y % 8 === 0) ? 'rgba(18,4,4,0.32)' : 'rgba(130,28,24,0.22)';
    rcx.fillRect(0, y, 256, 2);
  }
  for (let i = 0; i < 500; i++) {
    rcx.fillStyle = 'rgba(20,4,4,0.35)';
    rcx.fillRect((i * 89) % 256, (i * 149) % 256, 4, 4);
  }
  const redCarpetTex = makeRepeating(rcc, 2, 2);

  // 5) Office Modular Tile Carpet
  const [ofc, ofx] = makeCanvas(256, 256);
  ofx.fillStyle = '#6f6b56'; ofx.fillRect(0, 0, 256, 256);
  for (let y = 0; y < 256; y += 64) {
    for (let x = 0; x < 256; x += 64) {
      ofx.strokeStyle = '#3c3a2d'; ofx.lineWidth = 3;
      ofx.strokeRect(x + 1, y + 1, 62, 62);
      ofx.fillStyle = ((x / 64 + y / 64) & 1) ? 'rgba(40,38,28,0.16)' : 'rgba(140,132,102,0.12)';
      ofx.fillRect(x + 3, y + 3, 58, 58);
    }
  }
  const officeTileTex = makeRepeating(ofc, 2, 2);

  // Deep Two-Stage Wall/Column Contact Shadow Skirt (grounds every wall cleanly into heavy floor AO!)
  const [aoc, aox] = makeCanvas(128, 64);
  const ag = aox.createLinearGradient(0, 0, 128, 0);
  ag.addColorStop(0.0, 'rgba(3,2,1,0.97)');
  ag.addColorStop(0.18, 'rgba(6,4,1,0.84)');
  ag.addColorStop(0.50, 'rgba(10,7,2,0.42)');
  ag.addColorStop(0.84, 'rgba(12,9,3,0.11)');
  ag.addColorStop(1.0, 'rgba(12,9,3,0)');
  aox.fillStyle = ag; aox.fillRect(0, 0, 128, 64);
  const aoSkirtTex = new THREE.CanvasTexture(aoc);
  aoSkirtTex.colorSpace = THREE.SRGBColorSpace;

  // Glowing Static CRT Monitor Screen for Curiosities
  const [stc, stx] = makeCanvas(128, 128);
  stx.fillStyle = '#0a1416'; stx.fillRect(0, 0, 128, 128);
  for (let y = 0; y < 128; y += 2) {
    stx.fillStyle = (y % 4 === 0) ? 'rgba(130,220,210,0.45)' : 'rgba(30,80,75,0.25)';
    stx.fillRect(0, y, 128, 1);
  }
  stx.fillStyle = '#d4fff8'; stx.font = 'bold 14px monospace'; stx.textAlign = 'center';
  stx.fillText('NO SIGNAL', 64, 58);
  stx.font = '10px monospace'; stx.fillText('CAM-00 // LOOP', 64, 78);
  const crtScreenTex = new THREE.CanvasTexture(stc);
  crtScreenTex.colorSpace = THREE.SRGBColorSpace;
  crtScreenTex.anisotropy = 8;

  // 6) Suburban Indoor Asphalt & Cracked Curb (`suburb_pitfalls`)
  const [asc, asx] = makeCanvas(256, 256);
  asx.fillStyle = '#2b2d30'; asx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 3200; i++) {
    asx.fillStyle = (i & 1) ? 'rgba(18,18,20,0.45)' : 'rgba(84,86,90,0.22)';
    asx.fillRect((i * 79) % 256, (i * 151) % 256, 2, 2);
  }
  asx.fillStyle = '#b99c38';
  for (let y = 12; y < 256; y += 64) asx.fillRect(122, y, 12, 34);
  const asphaltFloorTex = makeRepeating(asc, 2, 2);

  // 7) Rusted Diamond Industrial Steel (`red_city` / `breaker_vault`)
  const [rmc, rmx] = makeCanvas(256, 256);
  rmx.fillStyle = '#3b241d'; rmx.fillRect(0, 0, 256, 256);
  for (let y = 0; y < 256; y += 32) {
    for (let x = 0; x < 256; x += 32) {
      rmx.fillStyle = ((x + y) & 32) ? '#4a2b20' : '#2d1c17';
      rmx.fillRect(x + 2, y + 2, 28, 28);
      rmx.fillStyle = '#6c4230';
      rmx.fillRect(x + 10, y + 14, 12, 4);
    }
  }
  const rustMetalTex = makeRepeating(rmc, 2, 2);

  // 8) Glitch Missing-Texture Error Checkerboard (`null_kx_glitch`)
  const [glc, glx] = makeCanvas(256, 256);
  for (let y = 0; y < 256; y += 32) {
    for (let x = 0; x < 256; x += 32) {
      const alt = ((x >> 5) + (y >> 5)) & 1;
      glx.fillStyle = alt ? '#e424dc' : '#100a14';
      glx.fillRect(x, y, 32, 32);
    }
  }
  glx.fillStyle = 'rgba(255,255,255,0.22)';
  glx.font = 'bold 18px monospace';
  glx.fillText('NULL_KX // ERR', 18, 56);
  glx.fillText('MISSING_MAT', 28, 184);
  const glitchErrorTex = makeRepeating(glc, 2, 2);

  // 9) Flooded Stagnant Sump Basin (`flooded_sump`)
  const [swc, swx] = makeCanvas(256, 256);
  swx.fillStyle = '#182420'; swx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 42; i++) {
    const cx = (i * 73) % 256, cy = (i * 139) % 256, rr = 14 + (i % 5) * 9;
    swx.strokeStyle = 'rgba(92,138,124,0.18)';
    swx.lineWidth = 2;
    swx.beginPath(); swx.arc(cx, cy, rr, 0, Math.PI * 2); swx.stroke();
  }
  swx.fillStyle = 'rgba(10,16,14,0.38)';
  swx.fillRect(0, 120, 256, 16); swx.fillRect(120, 0, 16, 256);
  const sumpWaterTex = makeRepeating(swc, 2, 2);

  // 10) A-Sync Concrete Hazard Apron (`async_threshold`)
  const [ahc, ahx] = makeCanvas(256, 256);
  ahx.fillStyle = '#4f5250'; ahx.fillRect(0, 0, 256, 256);
  ahx.strokeStyle = '#2d302f'; ahx.lineWidth = 4; ahx.strokeRect(4, 4, 248, 248);
  ahx.fillStyle = '#d4a62a';
  ahx.fillRect(0, 0, 256, 26);
  ahx.fillStyle = '#171717';
  for (let sx = -32; sx < 280; sx += 28) {
    ahx.beginPath();
    ahx.moveTo(sx, 0); ahx.lineTo(sx + 14, 0);
    ahx.lineTo(sx + 4, 26); ahx.lineTo(sx - 10, 26);
    ahx.closePath(); ahx.fill();
  }
  const asyncHazardTex = makeRepeating(ahc, 2, 2);

  // ---------- 4 Distinct Directional Ground Guide Textures (Arrows always point -V / upward in texture -> +forward along trail!) ----------
  const drawChevron = (ctx, x, y, w, h, color, outline = '#111') => {
    ctx.fillStyle = outline;
    ctx.beginPath();
    ctx.moveTo(x, y - h * 0.56);
    ctx.lineTo(x + w * 0.56, y + h * 0.48);
    ctx.lineTo(x, y + h * 0.14);
    ctx.lineTo(x - w * 0.56, y + h * 0.48);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x, y - h * 0.44);
    ctx.lineTo(x + w * 0.44, y + h * 0.36);
    ctx.lineTo(x, y + h * 0.08);
    ctx.lineTo(x - w * 0.44, y + h * 0.36);
    ctx.closePath();
    ctx.fill();
  };

  // Type A: Heavy Striped A-Sync Power Cable + Yellow Directional Clamp Arrows
  const [gcC, gcX] = makeCanvas(128, 256);
  gcX.clearRect(0, 0, 128, 256);
  gcX.fillStyle = '#151618'; gcX.fillRect(38, 0, 52, 256);
  gcX.fillStyle = '#2c2f34'; gcX.fillRect(46, 0, 14, 256);
  gcX.fillStyle = '#d49d28';
  gcX.fillRect(28, 26, 72, 48);
  gcX.fillRect(28, 154, 72, 48);
  drawChevron(gcX, 64, 50, 44, 34, '#fff29c', '#181408');
  drawChevron(gcX, 64, 178, 44, 34, '#fff29c', '#181408');
  const guideCableTex = makeRepeating(gcC, 1, 2);

  // Type B: Galvanized Steel Conduit Duct + Stenciled Painted Yellow Arrows
  const [gdC, gdX] = makeCanvas(128, 256);
  gdX.fillStyle = '#3c4044'; gdX.fillRect(24, 0, 80, 256);
  gdX.strokeStyle = '#6c7278'; gdX.lineWidth = 4; gdX.strokeRect(26, 2, 76, 252);
  gdX.fillStyle = '#1e2022';
  for (let y = 16; y < 256; y += 64) { gdX.fillRect(30, y, 8, 8); gdX.fillRect(90, y, 8, 8); }
  drawChevron(gdX, 64, 68, 46, 38, '#ffd24a', '#161614');
  drawChevron(gdX, 64, 196, 46, 38, '#ffd24a', '#161614');
  const guideConduitTex = makeRepeating(gdC, 1, 2);

  // Type C: Hazard Floor Tape & Survey String (`A-SYNC // PWR ->`)
  const [gtC, gtX] = makeCanvas(128, 256);
  gtX.fillStyle = 'rgba(20,18,10,0.86)'; gtX.fillRect(22, 0, 84, 256);
  gtX.fillStyle = '#e59a24'; gtX.fillRect(26, 0, 10, 256); gtX.fillRect(92, 0, 10, 256);
  drawChevron(gtX, 64, 56, 42, 34, '#ffae34', '#0e0c08');
  drawChevron(gtX, 64, 184, 42, 34, '#ffae34', '#0e0c08');
  gtX.fillStyle = '#f5d276'; gtX.font = 'bold 13px monospace'; gtX.textAlign = 'center';
  gtX.fillText('A-SYNC', 64, 126);
  const guideTapeTex = makeRepeating(gtC, 1, 2);

  // Type D: Glowing Floor Chaser LED Strip (grayscale-white base so vertex/material color tints cleanly to Cyan/Amber/Emerald Exit!)
  const [glC, glsX] = makeCanvas(128, 256);
  glsX.fillStyle = '#14181e'; glsX.fillRect(32, 0, 64, 256);
  glsX.fillStyle = 'rgba(255,255,255,0.22)'; glsX.fillRect(36, 0, 56, 256);
  drawChevron(glsX, 64, 48, 42, 34, '#ffffff', '#202630');
  drawChevron(glsX, 64, 132, 42, 34, '#e6f6ff', '#202630');
  drawChevron(glsX, 64, 214, 42, 34, '#ffffff', '#202630');
  const guideLedTex = makeRepeating(glC, 1, 2);

  // A-Sync Sector Directional Signpost Board
  const [sgC, sgX] = makeCanvas(256, 128);
  sgX.fillStyle = '#1d2226'; sgX.fillRect(0, 0, 256, 128);
  sgX.strokeStyle = '#d4b24c'; sgX.lineWidth = 6; sgX.strokeRect(5, 5, 246, 118);
  sgX.fillStyle = '#d4b24c'; sgX.fillRect(0, 0, 256, 26);
  sgX.fillStyle = '#121414'; sgX.font = 'bold 14px monospace'; sgX.textAlign = 'center';
  sgX.fillText('A-SYNC // KV-31 NAV', 128, 18);
  sgX.fillStyle = '#f5e69a'; sgX.font = 'bold 16px monospace';
  sgX.fillText('THEO DAY DAN SAN', 128, 60);
  sgX.fillStyle = '#62f2a2'; sgX.font = 'bold 15px monospace';
  sgX.fillText('MUI TEN -> MAY / EXIT', 128, 92);
  const sectorSignTex = new THREE.CanvasTexture(sgC);
  sectorSignTex.colorSpace = THREE.SRGBColorSpace;
  sectorSignTex.anisotropy = 16;

  // 11) Found Footage #2 Polished Oak Hardwood Floor Planks (`ff2_hardwood_home` / `ff1_white_gallery`)
  const [hwC, hwX] = makeCanvas(512, 512);
  hwX.fillStyle = '#7c5330';
  hwX.fillRect(0, 0, 512, 512);
  for (let row = 0; row < 8; row++) {
    const py = row * 64;
    const offset = (row % 2) * 128 + ((row * 53) % 64);
    for (let col = -1; col < 3; col++) {
      const px = col * 256 + offset;
      const shade = ((row * 7 + col * 13) & 15) - 8;
      hwX.fillStyle = `rgb(${124 + shade}, ${82 + Math.round(shade * 0.7)}, ${46 + Math.round(shade * 0.5)})`;
      hwX.fillRect(px + 2, py + 2, 252, 60);
      // Wood grain lines
      for (let g = 0; g < 18; g++) {
        hwX.fillStyle = (g & 1) ? 'rgba(52,30,14,0.22)' : 'rgba(168,118,68,0.14)';
        hwX.fillRect(px + 4, py + 4 + g * 3, 248, 1);
      }
      // Knot
      if (((row + col) & 1) === 0) {
        hwX.fillStyle = 'rgba(42,22,10,0.38)';
        hwX.beginPath();
        hwX.ellipse(px + 96 + (row * 29) % 80, py + 32, 14, 5, 0.08, 0, Math.PI * 2);
        hwX.fill();
      }
    }
    hwX.fillStyle = '#2d1a0b';
    hwX.fillRect(0, py, 512, 2);
  }
  const hardwoodFloorTex = makeRepeating(hwC, 2, 2);

  // 12) Found Footage #1/#2 White Plaster Gallery & Corridor Wall/Floor (`ff1_white_gallery`, `ff1_filing_corridor`)
  const [wpC, wpX] = makeCanvas(512, 512);
  wpX.fillStyle = '#dddcd5';
  wpX.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 6500; i++) {
    wpX.fillStyle = (i & 1) ? 'rgba(90,88,80,0.12)' : 'rgba(250,250,246,0.18)';
    wpX.fillRect((i * 97) % 512, (i * 181) % 512, 2, 2);
  }
  wpX.fillStyle = 'rgba(70,68,60,0.22)';
  wpX.fillRect(0, 484, 512, 4);
  wpX.fillStyle = '#c8c6bc';
  wpX.fillRect(0, 488, 512, 24);
  const whitePlasterTex = makeRepeating(wpC, 1, 1);

  // 13) Found Footage #1 "DON'T MOVE / STAY STILL" Spray-Painted Wall Decal (`ff1_dont_move`)
  const [dmC, dmX] = makeCanvas(512, 512);
  dmX.clearRect(0, 0, 512, 512);
  dmX.strokeStyle = 'rgba(15,14,12,0.92)';
  dmX.fillStyle = 'rgba(15,14,12,0.92)';
  dmX.lineWidth = 7;
  dmX.font = 'bold 34px monospace';
  dmX.fillText("DON'T MOVE", 42, 82);
  dmX.font = 'bold 26px monospace';
  dmX.fillText('STAY STILL', 268, 118);
  // Creepy wide eyes + nose bridge drawn on wall (FF1 03:21)
  dmX.beginPath(); dmX.ellipse(196, 224, 38, 22, -0.08, 0, Math.PI * 2); dmX.stroke();
  dmX.beginPath(); dmX.arc(196, 224, 11, 0, Math.PI * 2); dmX.fill();
  dmX.beginPath(); dmX.ellipse(312, 220, 38, 22, 0.08, 0, Math.PI * 2); dmX.stroke();
  dmX.beginPath(); dmX.arc(312, 220, 11, 0, Math.PI * 2); dmX.fill();
  dmX.beginPath(); dmX.moveTo(254, 195); dmX.lineTo(244, 278); dmX.lineTo(268, 282); dmX.stroke();
  // Spray-painted directional arrows pointing toward doorway
  dmX.lineWidth = 9;
  dmX.beginPath(); dmX.moveTo(74, 360); dmX.lineTo(190, 344); dmX.lineTo(164, 322); dmX.moveTo(190, 344); dmX.lineTo(168, 372); dmX.stroke();
  dmX.beginPath(); dmX.moveTo(430, 376); dmX.lineTo(320, 356); dmX.lineTo(346, 332); dmX.moveTo(320, 356); dmX.lineTo(342, 384); dmX.stroke();
  const dontMoveTex = new THREE.CanvasTexture(dmC);
  dontMoveTex.colorSpace = THREE.SRGBColorSpace;
  dontMoveTex.anisotropy = 16;

  // 14) Found Footage #1 Grey Fire Door with Blue "(!) Keep clear" Sign (`ff1_keep_clear_door`)
  const [kcC, kcX] = makeCanvas(256, 256);
  kcX.fillStyle = '#8b9094';
  kcX.fillRect(0, 0, 256, 256);
  kcX.strokeStyle = '#55595c';
  kcX.lineWidth = 8;
  kcX.strokeRect(8, 8, 240, 240);
  // Blue circular mandatory sign
  kcX.fillStyle = '#f2f4f7';
  kcX.fillRect(82, 68, 92, 108);
  kcX.fillStyle = '#1456a0';
  kcX.beginPath(); kcX.arc(128, 106, 28, 0, Math.PI * 2); kcX.fill();
  kcX.fillStyle = '#ffffff';
  kcX.font = 'bold 34px sans-serif';
  kcX.textAlign = 'center';
  kcX.fillText('!', 128, 118);
  kcX.fillStyle = '#1456a0';
  kcX.font = 'bold 13px sans-serif';
  kcX.fillText('Keep clear', 128, 158);
  const keepClearTex = new THREE.CanvasTexture(kcC);
  keepClearTex.colorSpace = THREE.SRGBColorSpace;
  keepClearTex.anisotropy = 16;

  // 15) 1970s Cream Ceramic Square Tile (`055447`, `055454`, `055738`)
  const [crC, crX] = makeCanvas(512, 512);
  crX.fillStyle = '#c4ba92'; crX.fillRect(0, 0, 512, 512);
  for (let y = 0; y < 512; y += 64) {
    for (let x = 0; x < 512; x += 64) {
      const n = (((x * 19 + y * 31) & 15) - 8) * 1.1;
      crX.fillStyle = `rgb(${Math.round(196 + n)},${Math.round(186 + n)},${Math.round(145 + n * 0.8)})`;
      crX.fillRect(x + 2, y + 2, 60, 60);
    }
  }
  crX.strokeStyle = 'rgba(26,24,18,0.68)'; crX.lineWidth = 4;
  for (let i = 0; i <= 512; i += 64) {
    crX.beginPath(); crX.moveTo(i, 0); crX.lineTo(i, 512); crX.stroke();
    crX.beginPath(); crX.moveTo(0, i); crX.lineTo(512, i); crX.stroke();
  }
  const creamTileTex = makeRepeating(crC, 2, 2);

  // 16) Dark Red-Brown Weathered Masonry Brick (`055234` & `055522`)
  const [brC, brX] = makeCanvas(512, 512);
  brX.fillStyle = '#2d1c16'; brX.fillRect(0, 0, 512, 512);
  for (let row = 0; row < 16; row++) {
    const off = (row & 1) * 32;
    for (let col = -1; col < 9; col++) {
      const bx = col * 64 + off, by = row * 32;
      const sh = ((row * 13 + col * 7) & 15) - 8;
      brX.fillStyle = `rgb(${84 + sh},${38 + Math.round(sh * 0.6)},${30 + Math.round(sh * 0.5)})`;
      brX.fillRect(bx + 2, by + 2, 60, 28);
    }
  }
  const brickWallTex = makeRepeating(brC, 2, 2);

  // 17) Weathered Buff Stone Wall (`055528` Supermarket back wall)
  const [stWC, stWX] = makeCanvas(512, 512);
  stWX.fillStyle = '#5c584c'; stWX.fillRect(0, 0, 512, 512);
  for (let row = 0; row < 8; row++) {
    const off = (row & 1) * 64;
    for (let col = -1; col < 5; col++) {
      const sh = ((row * 17 + col * 11) & 31) - 16;
      stWX.fillStyle = `rgb(${128 + sh},${122 + sh},${102 + sh})`;
      stWX.fillRect(col * 128 + off + 3, row * 64 + 3, 122, 58);
    }
  }
  for (let i = 0; i < 6000; i++) {
    stWX.fillStyle = (i & 1) ? 'rgba(20,18,14,0.16)' : 'rgba(200,196,178,0.10)';
    stWX.fillRect((i * 83) % 512, (i * 157) % 512, 3, 2);
  }
  const stoneWallTex = makeRepeating(stWC, 2, 2);

  // 18) Grey Basement Loop Carpet & Drywall (`055641`)
  const [grFC, grFX] = makeCanvas(512, 512);
  grFX.fillStyle = '#8b8f94'; grFX.fillRect(0, 0, 512, 512);
  for (let y = 0; y < 512; y += 4) {
    grFX.fillStyle = (y & 4) ? 'rgba(30,32,36,0.14)' : 'rgba(220,224,230,0.08)';
    grFX.fillRect(0, y, 512, 2);
  }
  const greyCarpetTex = makeRepeating(grFC, 4, 4);

  const [grWC, grWX] = makeCanvas(512, 512);
  grWX.fillStyle = '#c4c7cb'; grWX.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 6000; i++) {
    grWX.fillStyle = (i & 1) ? 'rgba(40,42,46,0.06)' : 'rgba(255,255,255,0.08)';
    grWX.fillRect((i * 101) % 512, (i * 193) % 512, 2, 2);
  }
  grWX.fillStyle = '#9aa0a6'; grWX.fillRect(0, 486, 512, 26);
  const greyDrywallTex = makeRepeating(grWC, 1, 1);

  // 19) Deep Reflective Floodwater (`055317` Flooded Yellow Hall)
  const [dfC, dfX] = makeCanvas(512, 512);
  dfX.fillStyle = '#071b16'; dfX.fillRect(0, 0, 512, 512);
  for (let y = 0; y < 512; y += 6) {
    dfX.fillStyle = `rgba(38, 108, 88, ${0.06 + 0.08 * Math.sin(y * 0.22)})`;
    dfX.fillRect(0, y, 512, 3);
  }
  for (let i = 0; i < 120; i++) {
    dfX.strokeStyle = 'rgba(130, 210, 175, 0.14)';
    dfX.lineWidth = 2;
    dfX.beginPath();
    dfX.ellipse((i * 97) % 512, (i * 131) % 512, 18 + (i % 4) * 9, 5, 0.15, 0, Math.PI * 2);
    dfX.stroke();
  }
  const darkFloodWaterTex = makeRepeating(dfC, 3, 3);

  // 20) "UNREALIZED" Torn Plaster Entity Mural (`055516`)
  const [umC, umX] = makeCanvas(1024, 512);
  umX.fillStyle = '#7b713e'; umX.fillRect(0, 0, 1024, 512);
  // Torn white drywall patch in center
  umX.fillStyle = '#cfc9b4';
  umX.beginPath();
  umX.moveTo(180, 420); umX.lineTo(155, 210); umX.lineTo(295, 118); umX.lineTo(525, 92);
  umX.lineTo(665, 58); umX.lineTo(815, 195); umX.lineTo(860, 435); umX.closePath();
  umX.fill();
  umX.strokeStyle = '#383016'; umX.lineWidth = 5; umX.stroke();
  // Tall black horned creature & spreading roots in center
  umX.strokeStyle = '#11100e'; umX.fillStyle = '#11100e';
  umX.beginPath();
  umX.moveTo(540, 145); umX.lineTo(518, 225); umX.lineTo(568, 232); umX.closePath(); umX.fill();
  umX.fillRect(528, 225, 24, 155);
  umX.lineWidth = 7;
  umX.beginPath();
  umX.moveTo(528, 255); umX.lineTo(465, 285); umX.moveTo(552, 255); umX.lineTo(618, 215);
  umX.moveTo(534, 378); umX.lineTo(458, 430); umX.moveTo(544, 378); umX.lineTo(632, 432);
  umX.stroke();
  // Red blood veins under entity + small stick houses & figures
  umX.strokeStyle = '#8b1a14'; umX.lineWidth = 4;
  umX.beginPath();
  umX.moveTo(540, 380); umX.lineTo(485, 438);
  umX.moveTo(540, 380); umX.lineTo(556, 444);
  umX.moveTo(540, 380); umX.lineTo(605, 440);
  umX.stroke();
  umX.strokeStyle = '#181612'; umX.lineWidth = 3;
  for (const hx of [215, 278, 340]) {
    umX.strokeRect(hx, 155, 38, 42);
    umX.beginPath(); umX.moveTo(hx - 4, 155); umX.lineTo(hx + 19, 132); umX.lineTo(hx + 42, 155); umX.stroke();
  }
  umX.fillStyle = '#141210'; umX.font = 'bold 34px monospace';
  umX.fillText('UNREALIZED', 715, 415);
  umX.font = 'bold 20px monospace'; umX.fillText('STAY HERE', 310, 415);
  const unrealizedMuralTex = new THREE.CanvasTexture(umC);
  unrealizedMuralTex.colorSpace = THREE.SRGBColorSpace;
  unrealizedMuralTex.anisotropy = 16;

  // 21) Night City Skyline Backdrop (`055134` Red Skybridge)
  const [ncC, ncX] = makeCanvas(512, 256);
  ncX.fillStyle = '#040203'; ncX.fillRect(0, 0, 512, 256);
  for (let b = 0; b < 7; b++) {
    const bx = b * 74 + 6, bw = 54, bh = 120 + ((b * 37) % 95), by = 256 - bh;
    ncX.fillStyle = '#0a0709'; ncX.fillRect(bx, by, bw, bh);
    ncX.fillStyle = '#ffefb8';
    for (let wy = by + 12; wy < 236; wy += 16) {
      for (let wx = bx + 6; wx < bx + bw - 8; wx += 10) {
        if (((wx * 3 + wy * 7) % 5) !== 0) ncX.fillRect(wx, wy, 7, 8);
      }
    }
  }
  const nightCitySkyTex = makeRepeating(ncC, 2, 1);

  // 22) Storefront & Street Signs (`DENIAL FAMILY`, `DOLLAR GENER`, `OPEN`, `STOP`, `ROAD WORK`, `Painting`)
  const makeBannerTex = (bg, border, text, sub = '', fg = '#ffd868') => {
    const [c, x] = makeCanvas(512, 128);
    x.fillStyle = bg; x.fillRect(0, 0, 512, 128);
    x.strokeStyle = border; x.lineWidth = 8; x.strokeRect(6, 6, 500, 116);
    x.fillStyle = fg; x.font = 'bold 46px sans-serif'; x.textAlign = 'center';
    x.fillText(text, 256, sub ? 66 : 80);
    if (sub) { x.font = 'bold 22px sans-serif'; x.fillText(sub, 256, 102); }
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 16;
    return t;
  };
  const mallSignTex = makeBannerTex('#c89c52', '#4a1812', 'DENIAL FAMILY', 'MIILVE wear', '#9a1e16');
  const dollarSignTex = makeBannerTex('#1c1810', '#d48224', 'DOLLAR GENER', '', '#ffba3b');
  const openNeonTex = makeBannerTex('#0a1014', '#26d4ea', 'OPEN', '', '#ff3628');
  const stopSignTex = makeBannerTex('#b61c18', '#f2f2f2', 'STOP', 'ALL WAY', '#ffffff');
  const roadWorkTex = makeBannerTex('#e26214', '#161412', 'ROAD WORK', 'AHEAD', '#12100e');

  const [ptFrameC, ptFrameX] = makeCanvas(256, 256);
  ptFrameX.fillStyle = '#3b2412'; ptFrameX.fillRect(0, 0, 256, 256);
  ptFrameX.fillStyle = '#c88c42'; ptFrameX.fillRect(20, 20, 216, 216);
  ptFrameX.fillStyle = '#743818'; ptFrameX.beginPath(); ptFrameX.arc(105, 130, 52, 0, Math.PI * 2); ptFrameX.fill();
  ptFrameX.fillStyle = '#e8c468'; ptFrameX.beginPath(); ptFrameX.arc(165, 145, 36, 0, Math.PI * 2); ptFrameX.fill();
  const paintingTex = new THREE.CanvasTexture(ptFrameC);
  paintingTex.colorSpace = THREE.SRGBColorSpace; paintingTex.anisotropy = 16;

  return {
    fixTex, haloTex, puddleTex, ventTex, cabTex, warnTex,
    itemWater, itemScan, itemJelly, itemRation, itemFlare,
    exitDoorTex, deskWood, metalCab, pitGrate,
    poolTileTex, concreteFloorTex, terrazzoFloorTex, redCarpetTex, officeTileTex,
    asphaltFloorTex, rustMetalTex, glitchErrorTex, sumpWaterTex, asyncHazardTex,
    hardwoodFloorTex, whitePlasterTex, dontMoveTex, keepClearTex,
    creamTileTex, brickWallTex, stoneWallTex, greyCarpetTex, greyDrywallTex, darkFloodWaterTex,
    unrealizedMuralTex, nightCitySkyTex, mallSignTex, dollarSignTex, openNeonTex, stopSignTex, roadWorkTex, paintingTex,
    guideCableTex, guideConduitTex, guideTapeTex, guideLedTex, sectorSignTex,
    aoSkirtTex, crtScreenTex
  };
}

export function buildSymbolPlateTexture(code, sym, col) {
  const [c, ctx] = makeCanvas(128, 128);
  ctx.fillStyle = '#121416';
  ctx.fillRect(0, 0, 128, 128);
  ctx.strokeStyle = col;
  ctx.lineWidth = 6;
  ctx.strokeRect(6, 6, 116, 116);
  ctx.fillStyle = col;
  ctx.font = 'bold 54px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(sym, 64, 52);
  ctx.fillStyle = '#f4f0dc';
  ctx.font = 'bold 24px monospace';
  ctx.fillText(code, 64, 102);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

/**
 * Generates high-contrast baked lightmap with TRUE 2D ray-extruded wall & pillar shadows
 * cast by every overhead ceiling fixture + deep crevice AO along wall bases.
 */
function bakeLightmap(map, forCeiling = false) {
  if (map?.isOutdoor || map?.noLightmap) {
    const res = 128;
    const [c, ctx] = makeCanvas(res, res);
    const hex = map?.levelCfg?.hemiSky ?? 0xd8e0e8;
    const r = (hex >> 16) & 255, g = (hex >> 8) & 255, b = hex & 255;
    ctx.fillStyle = `rgb(${Math.round(r * 0.85)}, ${Math.round(g * 0.85)}, ${Math.round(b * 0.85)})`;
    ctx.fillRect(0, 0, res, res);
    return c;
  }
  const res = forCeiling ? 512 : 1536;
  const [c, ctx] = makeCanvas(res, res);
  ctx.fillStyle = forCeiling ? '#2f2916' : '#141106';
  ctx.fillRect(0, 0, res, res);

  const gN = map?.gridN ?? N;
  const gC = map?.cellSize ?? C;
  const worldSpan = map?.worldSpan ?? (gN * gC);
  const scaleC = gC;

  if (forCeiling) {
    for (const l of map.LIGHTS || []) {
      if (l.dead) continue;
      const lx = (l.x / worldSpan) * res;
      const lz = (l.z / worldSpan) * res;
      const rad = Math.max(2.5, (scaleC * 1.55 / worldSpan) * res);
      const g = ctx.createRadialGradient(lx, lz, 0.5, lx, lz, rad);
      if (l.red) {
        g.addColorStop(0, 'rgba(245, 58, 44, 0.88)');
        g.addColorStop(1, 'rgba(245, 58, 44, 0)');
      } else if (l.green) {
        g.addColorStop(0, 'rgba(130, 245, 164, 0.86)');
        g.addColorStop(1, 'rgba(90, 220, 140, 0)');
      } else if (l.purple) {
        g.addColorStop(0, 'rgba(215, 110, 255, 0.86)');
        g.addColorStop(1, 'rgba(170, 70, 240, 0)');
      } else {
        g.addColorStop(0, 'rgba(255, 248, 200, 0.86)');
        g.addColorStop(1, 'rgba(250, 232, 152, 0)');
      }
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(lx, lz, rad, 0, Math.PI * 2); ctx.fill();
    }
  } else {
    // Reusable scratch buffer to ray-occlude each ceiling fixture cleanly behind nearby walls & pillars
    const pSize = 144;
    const pHalf = pSize * 0.5;
    const [pc, pctx] = makeCanvas(pSize, pSize);
    const lightReach = scaleC * 3.1;
    const pScale = (pHalf - 2) / lightReach;
    const drawWorldSpan = ((lightReach * 2) / worldSpan) * res;

    for (const l of map.LIGHTS || []) {
      if (l.dead) continue;

      const lg = l.gain ?? (l.bright ? 1.14 : 0.58);
      const curReach = scaleC * (2.6 + lg * 1.15);
      const drawSpanCur = ((curReach * 2) / worldSpan) * res;
      const curScale = (pHalf - 2) / curReach;

      pctx.globalCompositeOperation = 'source-over';
      pctx.clearRect(0, 0, pSize, pSize);
      const pg = pctx.createRadialGradient(pHalf, pHalf, 1.5, pHalf, pHalf, pHalf - 2);
      if (l.red) {
        pg.addColorStop(0, 'rgba(240, 46, 32, 0.56)');
        pg.addColorStop(0.45, 'rgba(175, 28, 20, 0.25)');
        pg.addColorStop(1, 'rgba(110, 16, 10, 0)');
      } else if (l.green) {
        pg.addColorStop(0, 'rgba(110, 224, 154, 0.62)');
        pg.addColorStop(0.45, 'rgba(56, 168, 96, 0.28)');
        pg.addColorStop(1, 'rgba(24, 96, 52, 0)');
      } else if (l.purple) {
        pg.addColorStop(0, 'rgba(210, 88, 240, 0.58)');
        pg.addColorStop(0.45, 'rgba(130, 38, 170, 0.26)');
        pg.addColorStop(1, 'rgba(65, 16, 92, 0)');
      } else {
        const coreA = Math.min(0.76, 0.26 + lg * 0.42).toFixed(2);
        const midA = Math.min(0.42, 0.10 + lg * 0.24).toFixed(2);
        const cR = Math.round(195 + Math.min(1, lg) * 60);
        const cG = Math.round(168 + Math.min(1, lg) * 76);
        const cB = Math.round(92 + Math.min(1, lg) * 98);
        pg.addColorStop(0, `rgba(${cR}, ${cG}, ${cB}, ${coreA})`);
        pg.addColorStop(0.45, `rgba(${Math.round(cR * 0.82)}, ${Math.round(cG * 0.78)}, ${Math.round(cB * 0.58)}, ${midA})`);
        pg.addColorStop(1, 'rgba(105, 84, 38, 0)');
      }
      pctx.fillStyle = pg;
      pctx.beginPath(); pctx.arc(pHalf, pHalf, pHalf - 2, 0, Math.PI * 2); pctx.fill();

      // Punch real 2D directional cast shadows behind nearby solid walls & pillars
      if (map.wallGrid) {
        pctx.globalCompositeOperation = 'destination-out';
        pctx.fillStyle = 'rgba(0,0,0,0.88)';
        const nearWalls = map.wallGrid.queryNear(l.x, l.z, curReach);
        for (const r of nearWalls) {
          if (r.hidden) continue;
          const y0 = r.y0 ?? 0;
          const y1 = r.y1 ?? WH;
          if (y0 > 0.35 || y1 < 1.25) continue;
          if (l.x > r.x0 && l.x < r.x1 && l.z > r.z0 && l.z < r.z1) continue;

          const corners = [
            [pHalf + (r.x0 - l.x) * curScale, pHalf + (r.z0 - l.z) * curScale],
            [pHalf + (r.x1 - l.x) * curScale, pHalf + (r.z0 - l.z) * curScale],
            [pHalf + (r.x1 - l.x) * curScale, pHalf + (r.z1 - l.z) * curScale],
            [pHalf + (r.x0 - l.x) * curScale, pHalf + (r.z1 - l.z) * curScale]
          ];
          for (let e = 0; e < 4; e++) {
            const [ax, az] = corners[e];
            const [bx, bz] = corners[(e + 1) & 3];
            const dax = ax - pHalf, daz = az - pHalf;
            const dbx = bx - pHalf, dbz = bz - pHalf;
            const la = Math.hypot(dax, daz) || 1;
            const lb = Math.hypot(dbx, dbz) || 1;
            pctx.beginPath();
            pctx.moveTo(ax, az);
            pctx.lineTo(bx, bz);
            pctx.lineTo(bx + (dbx / lb) * 140, bz + (dbz / lb) * 140);
            pctx.lineTo(ax + (dax / la) * 140, az + (daz / la) * 140);
            pctx.closePath();
            pctx.fill();
          }
        }
      }

      const dx = ((l.x - curReach) / worldSpan) * res;
      const dz = ((l.z - curReach) / worldSpan) * res;
      ctx.globalCompositeOperation = 'lighter';
      ctx.drawImage(pc, dx, dz, drawSpanCur, drawSpanCur);
    }

    // Bake smooth ROUNDED multi-band ambient-occlusion wall footprint & penumbra (zero square corner notches!)
    ctx.globalCompositeOperation = 'source-over';
    ctx.lineJoin = 'round';
    const wScale = res / worldSpan;
    const strokeBands = [
      { w: 1.50 * wScale, col: 'rgba(3,2,1,0.18)' },
      { w: 0.90 * wScale, col: 'rgba(3,2,1,0.28)' },
      { w: 0.46 * wScale, col: 'rgba(2,2,1,0.44)' },
      { w: 0.20 * wScale, col: 'rgba(2,1,1,0.68)' }
    ];
    for (const r of map.RECTS) {
      if (r.hidden) continue;
      const y0 = r.y0 ?? 0;
      const y1 = r.y1 ?? WH;
      if (y0 > 0.25 || y1 < 1.2) continue;
      const rx = r.x0 * wScale;
      const rz = r.z0 * wScale;
      const rw = (r.x1 - r.x0) * wScale;
      const rd = (r.z1 - r.z0) * wScale;
      for (const b of strokeBands) {
        ctx.strokeStyle = b.col;
        ctx.lineWidth = b.w;
        ctx.strokeRect(rx, rz, rw, rd);
      }
      ctx.fillStyle = 'rgba(2,2,1,0.95)';
      ctx.fillRect(rx, rz, rw, rd);
    }
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * Preloads all PBR wall/carpet/ceiling textures and real CC0 Backrooms grunge decals
 * across yield-framed Preloader tasks so gameplay experiences zero decoding stutters.
 */
export function registerTextureTasks(preloader, texStore) {
  let imgs = {};

  preloader.addTask('Tải kết cấu tường, thảm và trần Backrooms (PBR)...', async () => {
    const urls = {
      wallC: './textures/wall_color.jpg',
      wallN: './textures/wall_normal.jpg',
      wallR: './textures/wall_rough.jpg',
      carpC: './textures/carpet_color.jpg',
      carpN: './textures/carpet_normal.jpg',
      carpR: './textures/carpet_rough.jpg',
      ceilC: './textures/ceiling_color.jpg',
      ceilN: './textures/ceiling_normal.jpg',
      ceilR: './textures/ceiling_rough.jpg'
    };
    const entries = await Promise.all(
      Object.entries(urls).map(async ([k, u]) => [k, await loadImage(u)])
    );
    for (const [k, img] of entries) imgs[k] = img;

    texStore.wallMap = texFromImage(imgs.wallC, { srgb: true, repeat: [1, 1] });
    texStore.wallNorm = texFromImage(imgs.wallN, { srgb: false, repeat: [1, 1] });
    texStore.wallRough = texFromImage(imgs.wallR, { srgb: false, repeat: [1, 1] });

    // Bake high-detail 1024x1024 Level 0 wallpaper damask/strié + micro-grit + painted white skirting baseboard
    const [gwC, gwX] = makeCanvas(1024, 1024);
    gwX.drawImage(imgs.wallC, 0, 0, 1024, 1024);
    // Subtle vertical Level 0 wallpaper strié & chevron/damask repeat
    for (let x = 0; x < 1024; x += 32) {
      gwX.fillStyle = (x % 64 === 0) ? 'rgba(42,35,14,0.09)' : 'rgba(218,198,124,0.06)';
      gwX.fillRect(x, 0, 10, 964);
      for (let y = 24; y < 940; y += 64) {
        gwX.fillStyle = 'rgba(48,38,14,0.08)';
        gwX.fillRect(x + 6, y, 18, 6);
        gwX.fillRect(x + 12, y - 6, 6, 18);
      }
    }
    for (let i = 0; i < 14000; i++) {
      gwX.fillStyle = (i & 1) ? 'rgba(22,18,8,0.13)' : 'rgba(72,60,24,0.09)';
      gwX.fillRect((i * 113) % 1024, (i * 197) % 964, (i % 3) + 1, 2);
    }
    // Vertical wallpaper seam joints + wet bottom baseboard water soak gradient + ceiling top grime
    gwX.fillStyle = 'rgba(24,20,10,0.25)';
    for (let sx = 0; sx < 1024; sx += 256) gwX.fillRect(sx, 0, 4, 964);
    const botGrad = gwX.createLinearGradient(0, 740, 0, 968);
    botGrad.addColorStop(0, 'rgba(20,16,6,0)');
    botGrad.addColorStop(1, 'rgba(14,11,4,0.62)');
    gwX.fillStyle = botGrad; gwX.fillRect(0, 740, 1024, 228);
    // Authentic Found Footage painted off-white/cream wooden skirting baseboard at bottom
    gwX.fillStyle = 'rgba(28,22,10,0.72)';
    gwX.fillRect(0, 962, 1024, 6);
    gwX.fillStyle = '#c8bf9e';
    gwX.fillRect(0, 968, 1024, 56);
    gwX.fillStyle = 'rgba(34,26,12,0.32)';
    gwX.fillRect(0, 1012, 1024, 12);
    const topGrad = gwX.createLinearGradient(0, 0, 0, 160);
    topGrad.addColorStop(0, 'rgba(18,15,6,0.48)');
    topGrad.addColorStop(1, 'rgba(18,15,6,0)');
    gwX.fillStyle = topGrad; gwX.fillRect(0, 0, 1024, 160);
    const weatheredWallTex = new THREE.CanvasTexture(gwC);
    weatheredWallTex.wrapS = weatheredWallTex.wrapT = THREE.RepeatWrapping;
    weatheredWallTex.anisotropy = 16;
    weatheredWallTex.colorSpace = THREE.SRGBColorSpace;
    texStore.wallMap = weatheredWallTex;

    const floorRep = [N * 1.4, N * 1.4];
    // Bake high-frequency moist carpet woven loop-pile tufts & damp stains onto 1024x1024 canvas
    const [cpC, cpX] = makeCanvas(1024, 1024);
    cpX.drawImage(imgs.carpC, 0, 0, 1024, 1024);
    for (let y = 0; y < 1024; y += 4) {
      cpX.fillStyle = (y % 8 === 0) ? 'rgba(24,18,6,0.16)' : 'rgba(155,132,68,0.09)';
      cpX.fillRect(0, y, 1024, 2);
    }
    for (let i = 0; i < 16000; i++) {
      cpX.fillStyle = (i & 1) ? 'rgba(18,14,4,0.18)' : 'rgba(136,114,54,0.12)';
      cpX.fillRect((i * 131) % 1024, (i * 241) % 1024, 2, 2);
    }
    const detailedCarpetTex = new THREE.CanvasTexture(cpC);
    detailedCarpetTex.wrapS = detailedCarpetTex.wrapT = THREE.RepeatWrapping;
    detailedCarpetTex.repeat.set(floorRep[0], floorRep[1]);
    detailedCarpetTex.anisotropy = 16;
    detailedCarpetTex.colorSpace = THREE.SRGBColorSpace;
    texStore.carpetMap = detailedCarpetTex;
    texStore.carpetNorm = texFromImage(imgs.carpN, { srgb: false, repeat: floorRep });
    texStore.carpetRough = texFromImage(imgs.carpR, { srgb: false, repeat: floorRep });

    const ceilRep = [N * 1.0, N * 1.0];
    // Bake acoustic ceiling tile pinhole perforations & damp water-ring fissures onto 1024x1024 canvas
    const [clC, clX] = makeCanvas(1024, 1024);
    clX.drawImage(imgs.ceilC, 0, 0, 1024, 1024);
    for (let i = 0; i < 12000; i++) {
      clX.fillStyle = (i % 3 === 0) ? 'rgba(22,20,14,0.22)' : 'rgba(68,62,46,0.12)';
      clX.fillRect((i * 89) % 1024, (i * 173) % 1024, (i & 1) ? 3 : 2, 2);
    }
    const detailedCeilTex = new THREE.CanvasTexture(clC);
    detailedCeilTex.wrapS = detailedCeilTex.wrapT = THREE.RepeatWrapping;
    detailedCeilTex.repeat.set(ceilRep[0], ceilRep[1]);
    detailedCeilTex.anisotropy = 16;
    detailedCeilTex.colorSpace = THREE.SRGBColorSpace;
    texStore.ceilMap = detailedCeilTex;
    texStore.ceilNorm = texFromImage(imgs.ceilN, { srgb: false, repeat: ceilRep });
    texStore.ceilRough = texFromImage(imgs.ceilR, { srgb: false, repeat: ceilRep });
  });

  preloader.addTask('Tải & xử lý Alpha vết bẩn tường, rỉ nước, nấm mốc CC0...', async () => {
    const [leakA, leakB, leakC, dmgC, dmgOp] = await Promise.all([
      loadImage('./textures/decals/Leaking012A/Leaking012A_1K-JPG_Color.jpg'),
      loadImage('./textures/decals/Leaking013A/Leaking013A_1K-JPG_Color.jpg'),
      loadImage('./textures/decals/Leaking019C/Leaking019C_1K-JPG_Color.jpg'),
      loadImage('./textures/decals/AsphaltDamageSet001/AsphaltDamageSet001_1K-JPG_Color.jpg'),
      loadImage('./textures/decals/AsphaltDamageSet001/AsphaltDamageSet001_1K-JPG_Opacity.jpg')
    ]);

    texStore.wallDecals = [
      buildLeakAlphaTexture(leakA, null, 1.9, [52, 42, 18]),
      buildLeakAlphaTexture(leakB, null, 2.0, [44, 36, 16]),
      buildLeakAlphaTexture(leakC, null, 1.85, [38, 34, 15]),
      buildLeakAlphaTexture(dmgC, dmgOp, 1.4, [30, 26, 18])
    ];

    await PreloaderSystem.yieldFrame();
    texStore.posters = [0, 1, 2, 3, 4, 5].map(k => buildBackroomsPoster(k));
    Object.assign(texStore, buildProceduralUIAndPropsTextures());
    imgs = null; // Free raw intermediate handles
  });
}

export function createMapLightmaps(map, texStore) {
  texStore.floorAO = bakeLightmap(map, false);
  texStore.ceilAO = bakeLightmap(map, true);
}
