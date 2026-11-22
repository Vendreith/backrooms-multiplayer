/*!
 * Copyright (c) 2026 Vendreith. All rights reserved (Original Engine & Code).
 * Licensing information: see LICENSE.md
 * Third-party notices: see THIRD_PARTY_NOTICES.md
 */

// ---------- Dreamcore Hills Heightfield Terrain (LEVEL 94.2) ----------
// Deterministic, seed-only rolling-hill heightfield:
//   * layered value-noise fBm base (0-4m low, 4-10m common, 10-18m medium rises)
//   * authored landmark gaussians (tower hill, tunnel mouth hill, door knolls)
//     giving rare 18-28m landmark hills
//   * authored valleys between separate hill chains; no raised enclosing rim
//   * house "pads": flattened discs baked into the same grid the mesh samples
//   * worn path polylines rasterized into both a carve and a path mask
// Grid-backed (4m step over a 704m shell) with bilinear `heightAt`, analytic
// finite-difference normals, and a global slope relaxation pass that keeps the
// whole field walkable (<= ~32 degrees everywhere, diagonals included).

export const HILLS_CENTER = 256;   // world XZ centre of the field
export const HILLS_HALF = 352;     // visual shell half-extent (704m x 704m mesh)
export const HILLS_STEP = 4;       // height grid resolution (metres)
export const HILLS_PLAY_R = 190;   // playable radius enforced by hidden ring walls

// Authored landmark hills. Coordinates are LOCAL (world - HILLS_CENTER).
// `r` is the bell radius, `h` the peak height above the local base field.
export const HILL_LANDMARKS = [
  {key:'porch_hill',x:74,z:94,r:49,h:20},
  {key:'water_tower',x:98,z:-41,r:51,h:18},
  {key:'bell_hill',x:132,z:-116,r:44,h:17},
  {key:'door_knoll',x:-148,z:-18,r:36,h:12},
  {key:'tunnel',x:-42,z:-152,r:49,h:14},
  {key:'welcome_fold',x:47,z:150,r:44,h:5},
  {key:'crescent_west',x:-110,z:74,r:56,h:9},
  {key:'isolated',x:-97,z:-86,r:39,h:15},
  {key:'far_northwest',x:-184,z:-194,r:83,h:13},
  {key:'far_northeast',x:126,z:-209,r:92,h:16},
  {key:'far_west',x:-240,z:25,r:88,h:14},
  {key:'far_east',x:224,z:37,r:82,h:12}
];

// ---- deterministic value noise (pure function of coordinates) ----
function hash2(ix, iz, seed) {
  let h = Math.imul(ix, 374761393) + Math.imul(iz, 668265263) + Math.imul(seed | 0, 2246822519);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

function smooth(t) { return t * t * (3 - 2 * t); }

function valueNoise2(x, z, seed) {
  const ix = Math.floor(x), iz = Math.floor(z);
  const fx = smooth(x - ix), fz = smooth(z - iz);
  const a = hash2(ix, iz, seed);
  const b = hash2(ix + 1, iz, seed);
  const c = hash2(ix, iz + 1, seed);
  const d = hash2(ix + 1, iz + 1, seed);
  return (a + (b - a) * fx) * (1 - fz) + (c + (d - c) * fx) * fz;
}

function fbm(x, z, seed, octaves) {
  let amp = 0.5, freq = 1, sum = 0, norm = 0;
  for (let o = 0; o < octaves; o++) {
    sum += valueNoise2(x * freq, z * freq, seed + o * 131) * amp;
    norm += amp;
    amp *= 0.52;
    freq *= 2.07;
  }
  return sum / norm;
}

const clamp01 = (v) => v < 0 ? 0 : v > 1 ? 1 : v;

/**
 * Assembles the Dreamcore Hills field. Pure & deterministic (seeded only).
 * @param {number} seed match seed (clients regenerate identically)
 * @param {{pads?: Array<{x:number,z:number,r:number,h?:number}>, paths?: Array<{pts:number[][],w:number}>, seedSalt?: number}} opts
 *   Coordinates in pads/paths are WORLD space.
 */
export function buildHillsField(seed, opts = {}) {
  const salt = (opts.seedSalt | 0);
  const s1 = (seed ^ 0x9e3779b9) + salt * 7919 + 11;
  const s2 = s1 + 4177;
  const s3 = s1 + 9151;

  // ---- continuous analytic field (pre-pad / pre-relax) ----
  // LOCAL coords expected.
  const baseField = (lx, lz) => {
    // Composed domes and swales: restrained seed detail on an authored landscape.
    const n1=fbm(lx/135,lz/135,s1,3),n2=fbm(lx/65,lz/65,s2,2);
    let h=3.6+(n1-.5)*1.25+(n2-.5)*.5;
    h-=2.7*Math.exp(-((lx+5)**2/80**2+(lz-35)**2/64**2));
    for(const lm of HILL_LANDMARKS){
      const d2=((lx-lm.x)**2+(lz-lm.z)**2)/(lm.r*lm.r);
      if(d2<8)h+=lm.h*Math.exp(-d2*1.65);
    }
    // No enclosing rim. Open valleys continue between separate distant hill chains.

    return h;
  };

  // ---- house pads & door pads ----
  const pads = (opts.pads || []).map(p => ({
    x: p.x - HILLS_CENTER, z: p.z - HILLS_CENTER,
    r: p.r, h: (typeof p.h === 'number') ? p.h : baseField(p.x - HILLS_CENTER, p.z - HILLS_CENTER)
  }));

  const padWeight = (lx, lz) => {
    let w = 0, target = 0;
    for (let i = 0; i < pads.length; i++) {
      const p = pads[i];
      const d = Math.hypot(lx - p.x, lz - p.z);
      if (d < p.r) {
        const t = d / p.r;
        const wPad = t < 0.55 ? 1 : 1 - smooth((t - 0.55) / 0.45);
        if (wPad > w) { w = wPad; target = p.h; }
      }
    }
    return { w, target };
  };

  // ---- path rasterization (mask + carve) ----
  // One-metre path mask over the unchanged scenic extent.
  const mN = Math.floor(HILLS_HALF * 2) + 1; // 705 samples
  const mask = new Float32Array(mN * mN);
  const stampPath = (px, pz, w) => {
    const gx = (px - HILLS_CENTER + HILLS_HALF), gz = (pz - HILLS_CENTER + HILLS_HALF);
    const rad = w / 2;
    const radG = rad + 1.2;
    const i0 = Math.max(0, Math.floor(gx - radG)), i1 = Math.min(mN - 1, Math.ceil(gx + radG));
    const j0 = Math.max(0, Math.floor(gz - radG)), j1 = Math.min(mN - 1, Math.ceil(gz + radG));
    for (let j = j0; j <= j1; j++) {
      for (let i = i0; i <= i1; i++) {
        const d = Math.hypot(i - gx, j - gz);
        if (d < rad) {
          const t = 1 - d / rad;
          const idx = j * mN + i;
          const v = t * t * (3 - 2 * t);
          if (v > mask[idx]) mask[idx] = v;
        }
      }
    }
  };
  for (const path of (opts.paths || [])) {
    const pts = path.pts;
    for (let i = 0; i < pts.length - 1; i++) {
      const [x0, z0] = pts[i], [x1, z1] = pts[i + 1];
      const segLen = Math.hypot(x1 - x0, z1 - z0);
      const steps = Math.max(1, Math.ceil(segLen / 1.4));
      for (let s = 0; s <= steps; s++) {
        const t = s / steps;
        stampPath(x0 + (x1 - x0) * t, z0 + (z1 - z0) * t, path.w || 3.2);
      }
    }
  }
  const pathMaskAtLocal = (lx, lz) => {
    const gx = (lx + HILLS_HALF), gz = (lz + HILLS_HALF);
    const i = Math.floor(gx), j = Math.floor(gz);
    if (i < 0 || j < 0 || i >= mN - 1 || j >= mN - 1) return 0;
    const fx = gx - i, fz = gz - j;
    const a = mask[j * mN + i], b = mask[j * mN + i + 1];
    const c = mask[(j + 1) * mN + i], d = mask[(j + 1) * mN + i + 1];
    return (a + (b - a) * fx) * (1 - fz) + (c + (d - c) * fx) * fz;
  };

  // ---- bake grid (step 4m, half-extent 352 -> 177x177 samples) ----
  const gN = Math.floor(HILLS_HALF * 2 / HILLS_STEP) + 1; // 177
  const grid = new Float32Array(gN * gN);
  for (let j = 0; j < gN; j++) {
    const lz = -HILLS_HALF + j * HILLS_STEP;
    for (let i = 0; i < gN; i++) {
      const lx = -HILLS_HALF + i * HILLS_STEP;
      let h = baseField(lx, lz);
      // blend toward pads (flattened discs)
      const pw = padWeight(lx, lz);
      if (pw.w > 0) h = h * (1 - pw.w) + pw.target * pw.w;
      // worn path carve (before relaxation so it stays smooth)
      const pm = pathMaskAtLocal(lx, lz);
      if (pm > 0) h -= pm * 0.42;
      grid[j * gN + i] = h;
    }
  }

  // ---- global slope relaxation (keeps every 4m step <= MAXD, diagonals <= ~32deg) ----
  const MAXD = 1.72; // per 4m axis step (23.3deg axis slope, ~32deg diagonal worst case)
  for (let pass = 0; pass < 10; pass++) {
    for (let j = 0; j < gN; j++) {
      for (let i = 0; i < gN; i++) {
        const idx = j * gN + i;
        const h = grid[idx];
        if (i > 0) {
          const n = grid[idx - 1];
          if (h > n + MAXD) grid[idx] = n + MAXD;
          else if (h < n - MAXD) grid[idx] = n - MAXD;
        }
        if (j > 0) {
          const n = grid[idx - gN];
          const h2 = grid[idx];
          if (h2 > n + MAXD) grid[idx] = n + MAXD;
          else if (h2 < n - MAXD) grid[idx] = n - MAXD;
        }
      }
    }
    // backwards sweep to even out directional bias
    for (let j = gN - 1; j >= 0; j--) {
      for (let i = gN - 1; i >= 0; i--) {
        const idx = j * gN + i;
        const h = grid[idx];
        if (i < gN - 1) {
          const n = grid[idx + 1];
          if (h > n + MAXD) grid[idx] = n + MAXD;
          else if (h < n - MAXD) grid[idx] = n - MAXD;
        }
        if (j < gN - 1) {
          const n = grid[idx + gN];
          const h2 = grid[idx];
          if (h2 > n + MAXD) grid[idx] = n + MAXD;
          else if (h2 < n - MAXD) grid[idx] = n - MAXD;
        }
      }
    }
  }

  // ---- stats ----
  let minH = Infinity, maxH = -Infinity;
  for (let k = 0; k < grid.length; k++) {
    const h = grid[k];
    if (h < minH) minH = h;
    if (h > maxH) maxH = h;
  }

  // ---- sampling API (WORLD coordinates) ----
  const toGrid = (x, z) => [(x - HILLS_CENTER + HILLS_HALF) / HILLS_STEP, (z - HILLS_CENTER + HILLS_HALF) / HILLS_STEP];

  function heightAt(x, z) {
    const [gx, gz] = toGrid(x, z);
    const i = Math.floor(gx), j = Math.floor(gz);
    const ci = i < 0 ? 0 : i > gN - 2 ? gN - 2 : i;
    const cj = j < 0 ? 0 : j > gN - 2 ? gN - 2 : j;
    const fx = Math.min(1, Math.max(0, gx - ci));
    const fz = Math.min(1, Math.max(0, gz - cj));
    const a = grid[cj * gN + ci], b = grid[cj * gN + ci + 1];
    const c = grid[(cj + 1) * gN + ci], d = grid[(cj + 1) * gN + ci + 1];
    return (a + (b - a) * fx) * (1 - fz) + (c + (d - c) * fx) * fz;
  }

  function normalAt(x, z, out) {
    const e = 2.0;
    const hx = heightAt(x + e, z) - heightAt(x - e, z);
    const hz = heightAt(x, z + e) - heightAt(x, z - e);
    const len = Math.hypot(hx, 2 * e, hz);
    if (out) { out.set(-hx / len, 2 * e / len, -hz / len); return out; }
    return { x: -hx / len, y: 2 * e / len, z: -hz / len };
  }

  function slopeAt(x, z) {
    const e = 2.0;
    const hx = (heightAt(x + e, z) - heightAt(x - e, z)) / (2 * e);
    const hz = (heightAt(x, z + e) - heightAt(x, z - e)) / (2 * e);
    return Math.atan2(Math.hypot(hx, hz), 1);
  }

  function pathMaskAt(x, z) {
    return pathMaskAtLocal(x - HILLS_CENTER, z - HILLS_CENTER);
  }

  return {
    half: HILLS_HALF,
    playRadius: HILLS_PLAY_R,
    step: HILLS_STEP,
    center: HILLS_CENTER,
    gridN: gN,
    grid,
    mask,
    maskN: mN,
    minHeight: minH,
    maxHeight: maxH,
    landmarks: HILL_LANDMARKS,
    heightAt,
    normalAt,
    slopeAt,
    pathMaskAt,
    sampleBase: (x, z) => baseField(x - HILLS_CENTER, z - HILLS_CENTER)
  };
}
