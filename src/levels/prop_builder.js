/*!
 * Copyright (c) 2026 Vendreith (Original Code & Procedural Implementation).
 * Adapted Backrooms level/entity concepts & lore: licensed under CC BY-SA 3.0.
 * Licensing & attribution: see LICENSE.md, ATTRIBUTION.md, and THIRD_PARTY_NOTICES.md
 */

// ---------- Batched Compound Prop & Architectural Builder for 20 Backrooms Levels ----------
// Stamps hundreds of lore-accurate multi-part props (hospital beds, desks/PCs, cars, trees,
// silos, windmills, stalactites, hotel chandeliers, streetlamps, torii gates, etc.) into
// merged BufferGeometry material buckets (~16 draw calls total) plus animated prop rigs.

import { THREE, BufferGeometryUtils } from '../engine.js';

const _upY = new THREE.Vector3(0, 1, 0);
const _vPos = new THREE.Vector3();
const _vScale = new THREE.Vector3();
const _vOne = new THREE.Vector3(1, 1, 1);
const _qParent = new THREE.Quaternion();
const _qLocal = new THREE.Quaternion();
const _euler = new THREE.Euler();
const _parentM = new THREE.Matrix4();
const _localM = new THREE.Matrix4();
const _worldM = new THREE.Matrix4();

const BUCKET_DEFS = {
  darkSteel:   { color: 0x22262b, roughness: 0.48, metalness: 0.58 },
  brightSteel: { color: 0x9aa4ae, roughness: 0.34, metalness: 0.72 },
  warmWood:    { color: 0x6b4528, roughness: 0.84, metalness: 0.04 },
  paleWood:    { color: 0xb88f5e, roughness: 0.86, metalness: 0.02 },
  ceramic:     { color: 0xe8eced, roughness: 0.34, metalness: 0.06 },
  warmCeramic: { color: 0xf4ead4, roughness: 0.36, metalness: 0.05 },
  tealCeramic: { color: 0x3b9aa6, roughness: 0.32, metalness: 0.08 },
  maintCeramic:{ color: 0x627478, roughness: 0.72, metalness: 0.18 },
  aquaGlass:   { basic: true, color: 0x76e8f8, transparent: true, opacity: 0.42, depthWrite: false, side: THREE.DoubleSide },
  crimson:     { color: 0xa61e1e, roughness: 0.58, metalness: 0.12 },
  oliveGold:   { color: 0xc99c2c, roughness: 0.42, metalness: 0.35 },
  stone:       { color: 0x5c5b57, roughness: 0.92, metalness: 0.03 },
  foliage:     { color: 0x2c6633, roughness: 0.88, metalness: 0.02 },
  crimsonLeaf: { color: 0x8b213a, roughness: 0.86, metalness: 0.02 },
  skyBlue:     { color: 0x3ba6d8, roughness: 0.45, metalness: 0.10 },
  pastelPink:  { color: 0xf49bc6, roughness: 0.62, metalness: 0.04 },
  glowWhite:   { color: 0xeaf2fb, emissive: 0xdde9f7, emissiveIntensity: 0.92, roughness: 0.25 },
  glowWarm:    { color: 0xffb85c, emissive: 0xff9f38, emissiveIntensity: 1.02, roughness: 0.28 },
  glowRed:     { color: 0xff281c, emissive: 0xff1e12, emissiveIntensity: 1.55, roughness: 0.24 },
  glowCyan:    { color: 0x45e8ff, emissive: 0x24d6ff, emissiveIntensity: 1.15, roughness: 0.22 },
  glowPink:    { color: 0xff78d4, emissive: 0xff52c8, emissiveIntensity: 1.05, roughness: 0.25 },
  sunBeam:     { basic: true, color: 0xdff8ff, transparent: true, opacity: 0.048, depthWrite: false, side: THREE.DoubleSide },
  redBeam:     { basic: true, color: 0xff2818, transparent: true, opacity: 0.11, depthWrite: false, side: THREE.DoubleSide }
};

function toNormalizedNonIndexed(rawGeo) {
  const g = rawGeo.index ? rawGeo.toNonIndexed() : rawGeo;
  if (g !== rawGeo) rawGeo.dispose();
  return g;
}

function makeBucketCollector() {
  const b = {};
  for (const k of Object.keys(BUCKET_DEFS)) b[k] = [];
  return b;
}

function stamp(buckets, bucketName, rawGeo, lx, ly, lz, rx = 0, ry = 0, rz = 0) {
  const arr = buckets[bucketName];
  if (!arr) { rawGeo.dispose(); return; }
  const g = toNormalizedNonIndexed(rawGeo);
  _localM.compose(_vPos.set(lx, ly, lz), _qLocal.setFromEuler(_euler.set(rx, ry, rz)), _vOne);
  _worldM.multiplyMatrices(_parentM, _localM);
  g.applyMatrix4(_worldM);
  arr.push(g);
}

const box = (buckets, bk, sx, sy, sz, lx, ly, lz, rx = 0, ry = 0, rz = 0) =>
  stamp(buckets, bk, new THREE.BoxGeometry(sx, sy, sz), lx, ly, lz, rx, ry, rz);

const cyl = (buckets, bk, rt, rb, h, seg, lx, ly, lz, rx = 0, ry = 0, rz = 0) =>
  stamp(buckets, bk, new THREE.CylinderGeometry(rt, rb, h, seg), lx, ly, lz, rx, ry, rz);

const cone = (buckets, bk, r, h, seg, lx, ly, lz, rx = 0, ry = 0, rz = 0) =>
  stamp(buckets, bk, new THREE.ConeGeometry(r, h, seg), lx, ly, lz, rx, ry, rz);

const torus = (buckets, bk, r, tube, lx, ly, lz, rx = 0, ry = 0, rz = 0) =>
  stamp(buckets, bk, new THREE.TorusGeometry(r, tube, 6, 12), lx, ly, lz, rx, ry, rz);

function buildCar(b, bodyBucket) {
  box(b, bodyBucket, 1.9, 0.56, 4.3, 0, 0.52, 0);
  box(b, bodyBucket, 1.62, 0.48, 2.15, 0, 1.02, -0.15);
  box(b, 'darkSteel', 1.54, 0.38, 1.96, 0, 1.00, -0.15);
  for (const sx of [-0.92, 0.92]) {
    for (const sz of [-1.35, 1.35]) {
      cyl(b, 'darkSteel', 0.34, 0.34, 0.24, 8, sx, 0.34, sz, 0, 0, Math.PI * 0.5);
    }
    box(b, 'glowWarm', 0.26, 0.14, 0.06, sx * 0.65, 0.56, 2.16);
    box(b, 'glowRed', 0.26, 0.14, 0.06, sx * 0.65, 0.56, -2.16);
  }
}

function buildStaticProp(b, p, map) {
  const { kind, w = 1, h = 1, d = 1 } = p;
  switch (kind) {
    // --- LEVEL ! / HOSPITAL & RED CITY ---
    case 'hospital_bed':
      for (const sx of [-0.46, 0.46]) for (const sz of [-0.95, 0.95]) cyl(b, 'brightSteel', 0.04, 0.04, 0.55, 6, sx, 0.275, sz);
      box(b, 'brightSteel', 1.04, 0.08, 2.08, 0, 0.58, 0);
      box(b, 'ceramic', 0.94, 0.16, 1.96, 0, 0.70, 0);
      box(b, 'ceramic', 0.86, 0.14, 0.46, 0, 0.84, -0.68, 0.32, 0, 0);
      box(b, 'brightSteel', 0.96, 0.42, 0.06, 0, 0.86, 1.02);
      box(b, 'brightSteel', 0.06, 0.24, 1.1, 0.50, 0.78, 0);
      box(b, 'brightSteel', 0.06, 0.24, 1.1, -0.50, 0.78, 0);
      break;
    case 'wheelchair':
      for (const sx of [-0.36, 0.36]) cyl(b, 'darkSteel', 0.32, 0.32, 0.06, 10, sx, 0.34, -0.05, 0, 0, Math.PI * 0.5);
      for (const sx of [-0.28, 0.28]) cyl(b, 'darkSteel', 0.12, 0.12, 0.05, 8, sx, 0.12, 0.34, 0, 0, Math.PI * 0.5);
      box(b, 'darkSteel', 0.54, 0.06, 0.48, 0, 0.52, 0.05);
      box(b, 'darkSteel', 0.54, 0.58, 0.06, 0, 0.84, -0.22);
      break;
    case 'iv_stand':
      box(b, 'brightSteel', 0.46, 0.05, 0.06, 0, 0.05, 0);
      box(b, 'brightSteel', 0.06, 0.05, 0.46, 0, 0.05, 0);
      cyl(b, 'brightSteel', 0.025, 0.03, 1.95, 6, 0, 0.98, 0);
      box(b, 'glowCyan', 0.16, 0.28, 0.08, 0.18, 1.62, 0);
      break;
    case 'exit_sign_red':
      box(b, 'darkSteel', 0.95, 0.34, 0.12, 0, 0, 0);
      box(b, 'glowRed', 0.82, 0.22, 0.14, 0, 0, 0);
      cyl(b, 'darkSteel', 0.02, 0.02, 0.48, 5, -0.34, 0.38, 0);
      cyl(b, 'darkSteel', 0.02, 0.02, 0.48, 5, 0.34, 0.38, 0);
      break;
    case 'barricade':
      for (const sx of [-0.8, 0.8]) {
        box(b, 'darkSteel', 0.08, 0.95, 0.08, sx, 0.47, 0.18, -0.2, 0, 0);
        box(b, 'darkSteel', 0.08, 0.95, 0.08, sx, 0.47, -0.18, 0.2, 0, 0);
      }
      box(b, 'crimson', 2.0, 0.24, 0.08, 0, 0.84, 0);
      box(b, 'ceramic', 2.0, 0.20, 0.07, 0, 0.46, 0);
      break;
    case 'dumpster':
      box(b, 'darkSteel', 2.2, 1.18, 1.45, 0, 0.62, 0);
      box(b, 'crimson', 2.15, 0.08, 0.85, 0, 1.24, -0.25, -0.25, 0, 0);
      break;
    case 'street_lamp_red':
    case 'street_lamp': {
      const lampCol = kind === 'street_lamp_red' ? 'glowRed' : (p.warm ? 'glowWarm' : 'glowWhite');
      cyl(b, 'darkSteel', 0.11, 0.16, 4.9, 7, 0, 2.45, 0);
      box(b, 'darkSteel', 0.10, 0.10, 1.25, 0, 4.85, 0.55);
      box(b, lampCol, 0.34, 0.14, 0.52, 0, 4.74, 1.02);
      break;
    }
    case 'neon_sign':
      box(b, 'darkSteel', 0.26, 2.8, 0.72, 0, 0, 0);
      box(b, p.cyan ? 'glowCyan' : 'glowRed', 0.30, 2.5, 0.54, 0, 0, 0);
      break;
    case 'ambulance':
      box(b, 'ceramic', 2.15, 1.45, 4.9, 0, 0.98, 0);
      box(b, 'crimson', 2.19, 0.22, 4.92, 0, 0.72, 0);
      box(b, 'darkSteel', 1.85, 0.55, 0.08, 0, 1.32, 2.45);
      box(b, 'glowRed', 1.15, 0.18, 0.28, 0, 1.80, 1.1);
      for (const sx of [-0.98, 0.98]) for (const sz of [-1.55, 1.55]) cyl(b, 'darkSteel', 0.42, 0.42, 0.28, 8, sx, 0.42, sz, 0, 0, Math.PI * 0.5);
      break;
    case 'car':
      buildCar(b, p.color || (p.red ? 'crimson' : p.pastel ? 'pastelPink' : p.taxi ? 'oliveGold' : 'skyBlue'));
      break;

    // --- POOLROOMS (LEVEL 37) ---
    case 'arch_pillar': {
      const ph = p.h || 7.2;
      box(b, 'ceramic', 1.22, 0.38, 1.22, 0, 0.19, 0);
      cyl(b, 'ceramic', 0.42, 0.46, ph - 0.76, 10, 0, ph * 0.5, 0);
      box(b, 'ceramic', 1.26, 0.38, 1.26, 0, ph - 0.19, 0);
      break;
    }
    case 'lounge_chair':
      box(b, 'ceramic', 0.78, 0.16, 1.92, 0, 0.28, 0);
      box(b, 'ceramic', 0.78, 0.14, 0.78, 0, 0.62, -0.78, 0.62, 0, 0);
      box(b, 'skyBlue', 0.66, 0.05, 1.35, 0, 0.39, 0.22);
      for (const sx of [-0.32, 0.32]) for (const sz of [-0.75, 0.75]) box(b, 'ceramic', 0.1, 0.24, 0.1, sx, 0.12, sz);
      break;
    case 'pool_ring':
      torus(b, p.pink ? 'pastelPink' : 'skyBlue', 0.52, 0.18, 0, 0.18, 0, Math.PI * 0.5, 0, 0);
      break;
    case 'pool_ladder':
      for (const sx of [-0.28, 0.28]) {
        cyl(b, 'brightSteel', 0.03, 0.03, 1.85, 6, sx, 0.05, 0);
        cyl(b, 'brightSteel', 0.03, 0.03, 0.55, 6, sx, 0.95, 0.26, Math.PI * 0.5, 0, 0);
        cyl(b, 'brightSteel', 0.03, 0.03, 0.42, 6, sx, 0.74, 0.50);
      }
      for (let ry = -0.5; ry <= 0.45; ry += 0.32) box(b, 'brightSteel', 0.56, 0.04, 0.08, 0, ry, 0);
      break;
    case 'skylight_shaft':
      box(b, 'warmCeramic', 4.6, 0.35, 4.6, 0, 0, 0);
      box(b, 'glowWhite', 3.9, 0.14, 3.9, 0, -0.14, 0);
      cone(b, 'sunBeam', 3.8, p.beamH || 11.5, 8, 0, -(p.beamH || 11.5) * 0.5, 0, 0.12, 0, 0.08);
      break;
    case 'tiled_arch_column': {
      const ch = p.h || 13.5;
      box(b, 'warmCeramic', 3.6, 0.55, 3.6, 0, 0.28, 0);
      box(b, 'tealCeramic', 3.4, 0.24, 3.4, 0, 0.68, 0);
      box(b, 'warmCeramic', 3.7, 0.52, 3.7, 0, ch - 0.26, 0);
      break;
    }
    case 'pool_bench':
      box(b, 'warmCeramic', 2.4, 0.44, 0.76, 0, 0.22, 0);
      box(b, 'tealCeramic', 2.44, 0.08, 0.80, 0, 0.44, 0);
      break;
    case 'towel_stack':
      box(b, 'warmCeramic', 0.62, 0.09, 0.44, 0, 0.045, 0);
      box(b, 'skyBlue', 0.58, 0.09, 0.42, 0.02, 0.135, 0, 0, 0.14, 0);
      box(b, 'pastelPink', 0.56, 0.08, 0.40, -0.01, 0.22, 0, 0, -0.1, 0);
      break;
    case 'pool_sign_board':
      cyl(b, 'brightSteel', 0.04, 0.04, 1.55, 6, 0, 0.78, 0);
      box(b, 'warmCeramic', 0.92, 0.62, 0.08, 0, 1.48, 0);
      box(b, 'tealCeramic', 0.80, 0.14, 0.10, 0, 1.65, 0);
      box(b, 'glowCyan', 0.72, 0.08, 0.10, 0, 1.42, 0);
      break;
    case 'wet_footprints':
      for (let fi = 0; fi < 5; fi++) {
        const side = fi % 2 === 0 ? -0.14 : 0.14;
        box(b, 'aquaGlass', 0.14, 0.015, 0.28, side, 0.01, -0.8 + fi * 0.44);
      }
      break;
    case 'pool_drain_grate':
      box(b, 'darkSteel', 1.15, 0.05, 1.15, 0, 0.025, 0);
      for (let gi = -0.38; gi <= 0.38; gi += 0.19) {
        box(b, 'brightSteel', 0.96, 0.065, 0.06, 0, 0.035, gi);
      }
      break;
    case 'pool_noodle':
      cyl(b, p.pink ? 'pastelPink' : 'skyBlue', 0.065, 0.065, 1.55, 8, 0, 0.065, 0, Math.PI * 0.5, 0.25, 0);
      break;
    case 'pool_diving_board':
      box(b, 'brightSteel', 0.85, 0.52, 1.25, 0, 0.26, -0.75);
      box(b, 'skyBlue', 0.72, 0.10, 3.4, 0, 0.58, 0.75);
      box(b, 'warmCeramic', 0.72, 0.03, 0.42, 0, 0.64, 2.22);
      break;
    case 'hydraulic_pipe_elbow':
      cyl(b, 'maintCeramic', 0.22, 0.22, 1.6, 8, 0, 0.8, 0);
      cyl(b, 'maintCeramic', 0.22, 0.22, 1.1, 8, 0.48, 1.52, 0, 0, 0, Math.PI * 0.5);
      torus(b, 'crimson', 0.26, 0.05, 0.1, 1.15, 0.26, 0, 0, 0);
      break;
    case 'beach_ball':
      cyl(b, 'skyBlue', 0.28, 0.28, 0.26, 10, 0, 0.22, 0);
      cyl(b, 'pastelPink', 0.24, 0.28, 0.16, 10, 0, 0.36, 0);
      cyl(b, 'glowWarm', 0.24, 0.28, 0.16, 10, 0, 0.08, 0);
      break;
    case 'rubber_duck':
      box(b, 'oliveGold', 0.32, 0.22, 0.38, 0, 0.12, 0);
      cyl(b, 'oliveGold', 0.12, 0.12, 0.18, 8, 0, 0.28, 0.10);
      box(b, 'crimson', 0.10, 0.06, 0.12, 0, 0.28, 0.22);
      break;
    case 'lifeguard_stand':
      for (const sx of [-0.55, 0.55]) for (const sz of [-0.55, 0.55]) cyl(b, 'warmCeramic', 0.08, 0.10, 2.2, 6, sx, 1.1, sz);
      box(b, 'warmCeramic', 1.35, 0.14, 1.35, 0, 2.22, 0);
      box(b, 'tealCeramic', 0.95, 0.65, 0.12, 0, 2.75, -0.52);
      box(b, 'crimson', 0.55, 0.12, 0.12, 0.72, 1.4, 0.45);
      break;
    case 'handrail_pair':
      for (const sx of [-0.62, 0.62]) {
        cyl(b, 'brightSteel', 0.032, 0.035, 1.02, 7, sx, 0.51, -0.8);
        cyl(b, 'brightSteel', 0.032, 0.035, 1.02, 7, sx, 0.51, 0.8);
        cyl(b, 'brightSteel', 0.03, 0.03, 1.72, 7, sx, 0.96, 0, Math.PI * 0.5, 0, 0);
      }
      break;
    case 'underwater_lamp':
      cyl(b, 'brightSteel', 0.24, 0.26, 0.08, 10, 0, 0, 0, Math.PI * 0.5, 0, 0);
      cyl(b, p.warm ? 'glowWarm' : p.pink ? 'glowPink' : 'glowCyan', 0.18, 0.18, 0.09, 10, 0, 0, 0.02, Math.PI * 0.5, 0, 0);
      break;
    case 'lane_divider': {
      const len = p.len || 10.0;
      cyl(b, 'brightSteel', 0.02, 0.02, len, 6, 0, 0, 0, 0, 0, Math.PI * 0.5);
      for (let lx = -len * 0.45; lx <= len * 0.45; lx += 0.65) {
        cyl(b, Math.round(lx * 2) % 2 === 0 ? 'tealCeramic' : 'warmCeramic', 0.09, 0.09, 0.34, 8, lx, 0, 0, 0, 0, Math.PI * 0.5);
      }
      break;
    }
    case 'depth_marker':
      box(b, 'warmCeramic', 0.72, 0.28, 0.05, 0, 0.14, 0);
      box(b, 'darkSteel', 0.56, 0.12, 0.06, 0, 0.14, 0);
      box(b, 'oliveGold', 0.68, 0.04, 0.06, 0, 0.25, 0);
      break;
    case 'pool_skimmer':
      box(b, 'warmCeramic', 0.62, 0.44, 0.14, 0, 0.22, 0);
      box(b, 'darkSteel', 0.46, 0.26, 0.16, 0, 0.20, 0.01);
      break;
    case 'lifebuoy_rack':
      box(b, 'brightSteel', 0.14, 0.92, 0.08, 0, 0.46, 0);
      torus(b, 'crimson', 0.36, 0.10, 0, 0.56, 0.10, 0, 0, 0);
      box(b, 'ceramic', 0.24, 0.18, 0.22, 0.28, 0.56, 0.10);
      box(b, 'ceramic', 0.24, 0.18, 0.22, -0.28, 0.56, 0.10);
      break;
    case 'rescue_pole':
      cyl(b, 'brightSteel', 0.024, 0.024, 3.6, 7, 0, 0.06, 0, 0, 0, Math.PI * 0.5);
      torus(b, 'brightSteel', 0.20, 0.025, 1.85, 0.06, 0, Math.PI * 0.5, 0, 0);
      break;
    case 'abandoned_sandals':
      box(b, 'skyBlue', 0.12, 0.04, 0.28, -0.14, 0.02, -0.04, 0, 0.22, 0);
      box(b, 'tealCeramic', 0.12, 0.02, 0.12, -0.14, 0.05, 0.01, 0, 0.22, 0);
      box(b, 'skyBlue', 0.12, 0.04, 0.28, 0.15, 0.02, 0.05, 0, -0.35, 0);
      box(b, 'tealCeramic', 0.12, 0.02, 0.12, 0.15, 0.05, 0.10, 0, -0.35, 0);
      break;
    case 'warning_sign_cone':
      box(b, 'oliveGold', 0.36, 0.68, 0.06, 0, 0.34, 0.12, -0.22, 0, 0);
      box(b, 'oliveGold', 0.36, 0.68, 0.06, 0, 0.34, -0.12, 0.22, 0, 0);
      box(b, 'darkSteel', 0.24, 0.18, 0.07, 0, 0.40, 0.13, -0.22, 0, 0);
      break;
    case 'mineral_stain':
      box(b, 'maintCeramic', 1.65, 0.02, 1.15, 0, 0.012, 0);
      box(b, 'aquaGlass', 1.25, 0.025, 0.75, 0.12, 0.015, -0.08);
      break;
    case 'ceramic_island_planter':
      cyl(b, 'warmCeramic', 1.85, 1.95, 0.62, 12, 0, 0.31, 0);
      cyl(b, 'tealCeramic', 1.90, 1.90, 0.14, 12, 0, 0.64, 0);
      cyl(b, 'foliage', 0.28, 0.34, 1.1, 7, 0, 1.12, 0);
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        box(b, 'foliage', 0.52, 0.85, 0.52, Math.cos(a) * 0.72, 1.05, Math.sin(a) * 0.72, 0, a, 0);
      }
      box(b, 'foliage', 1.15, 1.15, 1.15, 0, 1.85, 0, 0.2, 0.4, 0.15);
      break;
    case 'floodgate_wheel':
      box(b, 'darkSteel', 2.4, 2.8, 0.26, 0, 1.4, 0);
      for (const sx of [-1.25, 1.25]) box(b, 'maintCeramic', 0.24, 3.6, 0.38, sx, 1.8, 0);
      box(b, 'brightSteel', 0.14, 1.8, 0.14, 0, 2.7, 0.18);
      torus(b, 'crimson', 0.44, 0.06, 0, 2.05, 0.28, 0, 0, 0);
      break;

    // --- OFFICE (LEVEL 4) ---
    case 'cubicle':
      box(b, 'paleWood', 2.4, 1.38, 0.12, 0, 0.69, -0.85);
      box(b, 'paleWood', 0.12, 1.38, 1.8, -1.16, 0.69, 0);
      box(b, 'paleWood', 0.12, 1.38, 1.8, 1.16, 0.69, 0);
      box(b, 'warmWood', 2.15, 0.08, 0.76, 0, 0.76, -0.42);
      // Monitor + CPU
      box(b, 'darkSteel', 0.52, 0.40, 0.24, 0, 1.02, -0.52);
      box(b, 'glowCyan', 0.42, 0.30, 0.04, 0, 1.02, -0.39);
      box(b, 'darkSteel', 0.52, 0.04, 0.18, 0, 0.81, -0.22);
      break;
    case 'desk_pc':
      box(b, 'warmWood', 1.68, 0.08, 0.84, 0, 0.76, 0);
      for (const sx of [-0.74, 0.74]) box(b, 'darkSteel', 0.08, 0.74, 0.76, sx, 0.37, 0);
      box(b, 'darkSteel', 0.50, 0.38, 0.26, -0.15, 1.00, -0.16);
      box(b, 'glowCyan', 0.40, 0.28, 0.04, -0.15, 1.00, -0.02);
      box(b, 'darkSteel', 0.48, 0.04, 0.18, -0.15, 0.81, 0.18);
      box(b, 'ceramic', 0.24, 0.42, 0.44, 0.52, 1.00, -0.10);
      break;
    case 'office_chair':
      box(b, 'darkSteel', 0.56, 0.05, 0.56, 0, 0.08, 0);
      cyl(b, 'brightSteel', 0.04, 0.04, 0.40, 6, 0, 0.26, 0);
      box(b, 'darkSteel', 0.52, 0.09, 0.50, 0, 0.48, 0);
      box(b, 'darkSteel', 0.48, 0.52, 0.08, 0, 0.76, -0.22);
      break;
    case 'file_cabinet':
      box(b, 'brightSteel', 0.62, 1.48, 0.68, 0, 0.74, 0);
      for (const dy of [0.24, 0.56, 0.88, 1.20]) {
        box(b, 'darkSteel', 0.52, 0.24, 0.04, 0, dy, 0.34);
        box(b, 'ceramic', 0.16, 0.04, 0.06, 0, dy + 0.04, 0.36);
      }
      break;
    case 'water_cooler':
      box(b, 'ceramic', 0.44, 0.98, 0.44, 0, 0.49, 0);
      cyl(b, 'skyBlue', 0.17, 0.18, 0.52, 10, 0, 1.24, 0);
      box(b, 'glowCyan', 0.20, 0.10, 0.06, 0, 0.82, 0.22);
      break;
    case 'copier':
      box(b, 'ceramic', 1.15, 1.05, 0.85, 0, 0.525, 0);
      box(b, 'darkSteel', 0.92, 0.16, 0.68, 0, 1.12, 0);
      box(b, 'glowCyan', 0.24, 0.06, 0.12, 0.35, 1.06, 0.36);
      break;
    case 'vending_machine':
      box(b, p.crimson ? 'crimson' : 'skyBlue', 1.15, 2.05, 0.86, 0, 1.025, 0);
      box(b, 'glowWhite', 0.82, 1.15, 0.06, -0.06, 1.28, 0.43);
      box(b, 'darkSteel', 0.86, 0.34, 0.08, 0, 0.32, 0.43);
      break;
    case 'potted_plant':
      cyl(b, 'ceramic', 0.28, 0.20, 0.44, 8, 0, 0.22, 0);
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        box(b, p.pink ? 'crimsonLeaf' : 'foliage', 0.16, 0.56, 0.08, Math.cos(a) * 0.14, 0.62, Math.sin(a) * 0.14, Math.sin(a) * 0.48, a, -Math.cos(a) * 0.48);
      }
      break;
    case 'ceil_troffer':
      box(b, 'brightSteel', 1.28, 0.08, 0.66, 0, 0, 0);
      box(b, p.red ? 'glowRed' : p.warm ? 'glowWarm' : 'glowWhite', 1.14, 0.05, 0.52, 0, -0.03, 0);
      break;

    // --- FIELD (LEVEL 10) ---
    case 'silo':
      cyl(b, 'brightSteel', 2.4, 2.4, 11.5, 12, 0, 5.75, 0);
      cone(b, 'brightSteel', 2.55, 2.4, 12, 0, 12.6, 0);
      for (let sy = 2; sy <= 10; sy += 2.5) cyl(b, 'darkSteel', 2.44, 2.44, 0.12, 12, 0, sy, 0);
      break;
    case 'hay_bale':
      cyl(b, 'oliveGold', 0.78, 0.78, 1.45, 10, 0, 0.78, 0, Math.PI * 0.5, 0, 0);
      break;
    case 'tractor':
      box(b, p.crimson ? 'crimson' : 'foliage', 1.4, 0.95, 2.4, 0, 1.05, 0);
      box(b, 'darkSteel', 1.25, 0.95, 1.15, 0, 1.85, -0.45);
      cyl(b, 'darkSteel', 0.10, 0.10, 0.95, 6, 0.35, 1.85, 0.75);
      for (const sx of [-0.88, 0.88]) {
        cyl(b, 'darkSteel', 0.76, 0.76, 0.36, 10, sx, 0.76, -0.55, 0, 0, Math.PI * 0.5);
        cyl(b, 'darkSteel', 0.42, 0.42, 0.24, 8, sx * 0.85, 0.42, 0.95, 0, 0, Math.PI * 0.5);
      }
      break;
    case 'fence_seg': {
      const bk = p.white ? 'ceramic' : 'warmWood';
      const fw = p.w || 4.0;
      box(b, bk, 0.14, 1.15, 0.14, -fw * 0.48, 0.57, 0);
      box(b, bk, 0.14, 1.15, 0.14, fw * 0.48, 0.57, 0);
      box(b, bk, fw, 0.10, 0.08, 0, 0.92, 0);
      box(b, bk, fw, 0.10, 0.08, 0, 0.48, 0);
      break;
    }
    case 'utility_pole':
      cyl(b, 'warmWood', 0.14, 0.18, 7.6, 6, 0, 3.8, 0);
      box(b, 'warmWood', 2.4, 0.14, 0.14, 0, 7.1, 0);
      box(b, 'brightSteel', 0.45, 0.58, 0.45, 0, 5.7, 0.28);
      break;
    case 'scarecrow':
      cyl(b, 'warmWood', 0.07, 0.09, 2.25, 6, 0, 1.1, 0);
      box(b, 'warmWood', 1.45, 0.10, 0.10, 0, 1.65, 0);
      box(b, 'crimson', 0.54, 0.68, 0.28, 0, 1.48, 0);
      cyl(b, 'oliveGold', 0.18, 0.18, 0.34, 8, 0, 1.98, 0);
      cone(b, 'darkSteel', 0.34, 0.32, 8, 0, 2.24, 0);
      break;

    // --- WAREHOUSE / PIPES / ELECTRICAL (LEVEL 1, 2, 3, 6) ---
    case 'hazard_pillar': {
      const ph = p.h || 5.5;
      box(b, 'stone', 1.15, ph, 1.15, 0, ph * 0.5, 0);
      box(b, 'oliveGold', 1.22, 0.44, 1.22, 0, 0.72, 0);
      box(b, 'darkSteel', 1.24, 0.18, 1.24, 0, 0.56, 0);
      break;
    }
    case 'shelf_rack':
      for (const sx of [-1.1, 1.1]) for (const sz of [-0.45, 0.45]) box(b, 'darkSteel', 0.10, 2.8, 0.10, sx, 1.4, sz);
      for (const sy of [0.35, 1.35, 2.35]) {
        box(b, 'paleWood', 2.3, 0.08, 0.96, 0, sy, 0);
        box(b, 'paleWood', 0.72, 0.62, 0.72, -0.58, sy + 0.35, 0);
        box(b, 'crimson', 0.64, 0.54, 0.68, 0.48, sy + 0.31, 0);
      }
      break;
    case 'crate_stack':
      box(b, 'paleWood', 1.1, 0.95, 1.1, 0, 0.475, 0);
      box(b, 'warmWood', 0.85, 0.75, 0.85, 0.52, 0.375, 0.68, 0, 0.3, 0);
      box(b, 'paleWood', 0.78, 0.68, 0.78, -0.05, 1.29, 0.05, 0, -0.25, 0);
      break;
    case 'oil_drum':
      cyl(b, p.crimson ? 'crimson' : p.blue ? 'skyBlue' : 'darkSteel', 0.36, 0.36, 1.05, 10, 0, 0.525, 0);
      cyl(b, 'darkSteel', 0.38, 0.38, 0.06, 10, 0, 0.35, 0);
      cyl(b, 'darkSteel', 0.38, 0.38, 0.06, 10, 0, 0.72, 0);
      break;
    case 'floodlight':
      cyl(b, 'oliveGold', 0.05, 0.08, 1.7, 6, 0, 0.85, 0);
      box(b, 'oliveGold', 0.88, 0.10, 0.14, 0, 1.72, 0);
      box(b, 'glowWhite', 0.34, 0.24, 0.14, -0.25, 1.88, 0.04);
      box(b, 'glowWhite', 0.34, 0.24, 0.14, 0.25, 1.88, 0.04);
      break;
    case 'transformer':
      box(b, 'darkSteel', 1.65, 1.95, 1.15, 0, 0.975, 0);
      box(b, 'oliveGold', 0.42, 0.36, 0.06, 0, 1.35, 0.59);
      for (const sx of [-0.45, 0, 0.45]) cyl(b, 'ceramic', 0.10, 0.14, 0.45, 8, sx, 2.18, 0);
      box(b, 'glowWarm', 0.16, 0.12, 0.06, -0.45, 1.35, 0.59);
      break;
    case 'wire_cage':
      box(b, 'darkSteel', p.w || 3.8, 0.12, 0.12, 0, p.h || 2.8, 0);
      for (let x = -(p.w || 3.8) * 0.48; x <= (p.w || 3.8) * 0.48; x += 0.55) {
        box(b, 'brightSteel', 0.05, p.h || 2.8, 0.05, x, (p.h || 2.8) * 0.5, 0);
      }
      break;
    case 'pipe_bundle':
      for (const dy of [0, 0.38, 0.76]) cyl(b, dy === 0.38 ? 'crimson' : 'brightSteel', 0.13, 0.13, p.w || 5.5, 8, 0, dy, 0, 0, 0, Math.PI * 0.5);
      for (const bx of [-(p.w || 5.5) * 0.35, (p.w || 5.5) * 0.35]) box(b, 'darkSteel', 0.16, 1.05, 0.32, bx, 0.38, -0.1);
      break;
    case 'pipe_valve':
      cyl(b, 'brightSteel', 0.12, 0.12, 1.25, 8, 0, 0.625, 0);
      torus(b, 'crimson', 0.24, 0.045, 0, 0.92, 0.16, 0, 0, 0);
      break;
    case 'catwalk_rail':
      box(b, 'darkSteel', p.w || 4.0, 0.08, 0.08, 0, 1.05, 0);
      box(b, 'darkSteel', p.w || 4.0, 0.06, 0.06, 0, 0.55, 0);
      for (const sx of [-(p.w || 4.0) * 0.46, 0, (p.w || 4.0) * 0.46]) box(b, 'darkSteel', 0.08, 1.08, 0.08, sx, 0.54, 0);
      break;
    case 'glowstick':
      cyl(b, p.pink ? 'glowPink' : 'glowCyan', 0.032, 0.032, 0.36, 6, 0, 0.035, 0, Math.PI * 0.5, 0.4, 0);
      break;
    case 'bulkhead_lamp':
      box(b, 'darkSteel', 0.32, 0.22, 0.14, 0, 0, 0);
      box(b, p.red ? 'glowRed' : 'glowWarm', 0.22, 0.14, 0.16, 0, 0, 0);
      break;

    // --- TERROR HOTEL (LEVEL 5) ---
    case 'chandelier':
      cyl(b, 'oliveGold', 0.05, 0.05, 0.95, 6, 0, 0.45, 0);
      torus(b, 'oliveGold', 0.95, 0.06, 0, 0, 0, Math.PI * 0.5, 0, 0);
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        box(b, 'glowWarm', 0.14, 0.22, 0.14, Math.cos(a) * 0.95, 0.14, Math.sin(a) * 0.95);
      }
      break;
    case 'hotel_door':
      box(b, 'warmWood', 1.38, 2.65, 0.18, 0, 1.325, 0);
      box(b, 'oliveGold', 0.22, 0.12, 0.20, 0, 1.98, 0);
      box(b, 'oliveGold', 0.08, 0.08, 0.24, 0.46, 1.05, 0);
      break;
    case 'grandfather_clock':
      box(b, 'warmWood', 0.74, 2.45, 0.46, 0, 1.225, 0);
      box(b, 'glowWarm', 0.42, 0.42, 0.06, 0, 2.02, 0.23);
      box(b, 'oliveGold', 0.14, 0.55, 0.05, 0, 1.25, 0.23);
      break;
    case 'reception_desk':
      box(b, 'warmWood', 5.2, 1.12, 0.95, 0, 0.56, 0);
      box(b, 'oliveGold', 5.28, 0.08, 1.04, 0, 1.12, 0);
      box(b, 'glowWarm', 0.26, 0.34, 0.26, -1.6, 1.32, 0);
      box(b, 'oliveGold', 0.18, 0.12, 0.18, 1.2, 1.22, 0.25);
      break;
    case 'luggage_cart':
      box(b, 'crimson', 1.15, 0.12, 0.72, 0, 0.24, 0);
      cyl(b, 'oliveGold', 0.03, 0.03, 1.65, 6, -0.52, 1.06, 0);
      cyl(b, 'oliveGold', 0.03, 0.03, 1.65, 6, 0.52, 1.06, 0);
      box(b, 'oliveGold', 1.08, 0.10, 0.10, 0, 1.88, 0);
      box(b, 'warmWood', 0.65, 0.48, 0.45, -0.1, 0.54, 0);
      break;
    case 'armchair_table':
      cyl(b, 'warmWood', 0.55, 0.55, 0.08, 10, 0, 0.68, 0);
      cyl(b, 'warmWood', 0.10, 0.26, 0.64, 8, 0, 0.32, 0);
      box(b, 'glowWarm', 0.12, 0.22, 0.12, 0, 0.82, 0);
      for (const sx of [-1.05, 1.05]) {
        box(b, 'crimson', 0.68, 0.42, 0.68, sx, 0.26, 0);
        box(b, 'crimson', 0.20, 0.68, 0.68, sx * 1.22, 0.58, 0);
      }
      break;
    case 'wall_sconce':
      box(b, 'oliveGold', 0.16, 0.24, 0.12, 0, 0, 0);
      box(b, 'glowWarm', 0.18, 0.22, 0.16, 0, 0.16, 0.06);
      break;
    case 'boiler_furnace':
      cyl(b, 'darkSteel', 1.05, 1.05, 2.2, 10, 0, 1.1, 0, Math.PI * 0.5, 0, 0);
      box(b, 'glowWarm', 0.55, 0.28, 0.08, 0, 0.88, 1.11);
      cyl(b, 'darkSteel', 0.32, 0.32, 2.4, 8, 0, 2.9, -0.4);
      break;

    // --- THALASSOPHOBIA & BEACH (LEVEL 7, 48) ---
    case 'sea_rock': {
      const rh = p.h || 5.2;
      cone(b, 'stone', rh * 0.55, rh, 6, 0, rh * 0.45, 0, 0.1, 0.4, -0.08);
      cone(b, 'stone', rh * 0.42, rh * 0.72, 6, rh * 0.34, rh * 0.32, 0.28, -0.15, 1.1, 0.12);
      break;
    }
    case 'dock_piling':
      cyl(b, 'warmWood', 0.18, 0.22, 2.6, 7, 0, 0.4, 0);
      if (p.lamp) {
        box(b, 'darkSteel', 0.22, 0.12, 0.22, 0, 1.76, 0);
        box(b, 'glowWarm', 0.18, 0.22, 0.18, 0, 1.62, 0);
      }
      break;
    case 'rowboat':
      box(b, 'warmWood', 1.35, 0.42, 3.3, 0, 0.24, 0);
      box(b, 'paleWood', 1.18, 0.08, 0.36, 0, 0.42, 0.4);
      box(b, 'paleWood', 1.18, 0.08, 0.36, 0, 0.42, -0.5);
      cyl(b, 'paleWood', 0.04, 0.04, 2.1, 6, 0.72, 0.48, 0, 0.1, 0, Math.PI * 0.44);
      break;
    case 'beach_umbrella':
      cyl(b, 'warmWood', 0.05, 0.06, 2.65, 6, 0, 1.32, 0, 0.12, 0, 0);
      cone(b, p.pink ? 'pastelPink' : p.blue ? 'skyBlue' : 'crimson', 1.55, 0.72, 8, 0, 2.55, 0.16, 0.12, 0, 0);
      break;
    case 'lifeguard_tower':
      for (const sx of [-1.2, 1.2]) for (const sz of [-1.2, 1.2]) cyl(b, 'warmWood', 0.14, 0.14, 3.2, 6, sx, 1.6, sz);
      box(b, 'paleWood', 2.9, 0.18, 2.9, 0, 3.2, 0);
      box(b, 'ceramic', 2.35, 2.0, 2.35, 0, 4.2, -0.1);
      box(b, 'crimson', 2.65, 0.36, 2.65, 0, 5.32, -0.1, -0.12, 0, 0);
      break;

    // --- CAVES (LEVEL 8) ---
    case 'stalactite':
      cone(b, 'stone', p.r || 0.55, p.h || 3.4, 6, 0, -(p.h || 3.4) * 0.5, 0, Math.PI, 0, 0);
      break;
    case 'stalagmite':
      cone(b, 'stone', p.r || 0.62, p.h || 2.8, 6, 0, (p.h || 2.8) * 0.5, 0);
      break;
    case 'glow_mushroom':
      for (const ox of [-0.22, 0.18, 0.04]) {
        const s = ox === 0.04 ? 1.25 : 0.78;
        cyl(b, 'ceramic', 0.05 * s, 0.07 * s, 0.45 * s, 6, ox, 0.22 * s, ox * 0.5);
        cone(b, 'glowCyan', 0.28 * s, 0.18 * s, 7, ox, 0.48 * s, ox * 0.5);
      }
      break;
    case 'mine_arch':
      box(b, 'warmWood', 0.34, 4.6, 0.34, -2.1, 2.3, 0);
      box(b, 'warmWood', 0.34, 4.6, 0.34, 2.1, 2.3, 0);
      box(b, 'warmWood', 4.7, 0.36, 0.38, 0, 4.68, 0);
      box(b, 'glowWarm', 0.22, 0.26, 0.22, -1.8, 3.6, 0.12);
      break;
    case 'minecart':
      box(b, 'darkSteel', 1.15, 0.82, 1.55, 0, 0.65, 0);
      for (const sx of [-0.54, 0.54]) for (const sz of [-0.45, 0.45]) cyl(b, 'brightSteel', 0.22, 0.22, 0.08, 8, sx, 0.22, sz, 0, 0, Math.PI * 0.5);
      break;

    // --- SUBURBS / ENDLESS CITY / TOWN (LEVEL 9, 11, 94) ---
    case 'traffic_light':
      cyl(b, 'darkSteel', 0.14, 0.18, 5.4, 7, 0, 2.7, 0);
      box(b, 'darkSteel', 3.4, 0.16, 0.16, 1.6, 5.2, 0);
      box(b, 'darkSteel', 0.36, 1.05, 0.28, 2.4, 4.65, 0);
      box(b, 'glowRed', 0.18, 0.18, 0.32, 2.4, 4.95, 0);
      box(b, 'glowWarm', 0.18, 0.18, 0.32, 2.4, 4.65, 0);
      box(b, 'glowCyan', 0.18, 0.18, 0.32, 2.4, 4.35, 0);
      break;
    case 'stop_sign':
      cyl(b, 'brightSteel', 0.045, 0.045, 2.6, 6, 0, 1.3, 0);
      cyl(b, 'crimson', 0.36, 0.36, 0.05, 8, 0, 2.55, 0.03, Math.PI * 0.5, 0, 0);
      break;
    case 'fire_hydrant':
      cyl(b, 'crimson', 0.18, 0.20, 0.72, 8, 0, 0.36, 0);
      cyl(b, 'crimson', 0.10, 0.10, 0.46, 6, 0, 0.52, 0, 0, 0, Math.PI * 0.5);
      cone(b, 'ceramic', 0.20, 0.18, 8, 0, 0.80, 0);
      break;
    case 'mailbox':
      box(b, 'warmWood', 0.12, 1.1, 0.12, 0, 0.55, 0);
      box(b, p.blue ? 'skyBlue' : 'darkSteel', 0.28, 0.28, 0.52, 0, 1.18, 0);
      box(b, 'crimson', 0.04, 0.18, 0.06, 0.16, 1.24, -0.05);
      break;
    case 'park_bench':
      box(b, 'warmWood', 1.85, 0.10, 0.52, 0, 0.46, 0);
      box(b, 'warmWood', 1.85, 0.46, 0.08, 0, 0.76, -0.24, -0.15, 0, 0);
      for (const sx of [-0.82, 0.82]) box(b, 'darkSteel', 0.08, 0.52, 0.56, sx, 0.26, 0);
      break;
    case 'bus_stop':
      box(b, 'darkSteel', 3.4, 0.12, 1.65, 0, 2.45, 0);
      for (const sx of [-1.55, 1.55]) box(b, 'darkSteel', 0.10, 2.45, 0.10, sx, 1.225, -0.72);
      box(b, 'skyBlue', 3.1, 1.95, 0.05, 0, 1.35, -0.74);
      box(b, 'warmWood', 2.4, 0.10, 0.45, 0, 0.46, -0.35);
      break;
    case 'ac_unit':
      box(b, 'brightSteel', 1.15, 0.86, 0.92, 0, 0.43, 0);
      cyl(b, 'darkSteel', 0.34, 0.34, 0.10, 10, 0, 0.88, 0);
      break;
    case 'school_bus':
      box(b, 'oliveGold', 2.45, 1.95, 7.6, 0, 1.48, 0);
      box(b, 'oliveGold', 2.15, 0.92, 1.25, 0, 0.98, 4.35);
      box(b, 'darkSteel', 2.50, 0.42, 6.2, 0, 1.85, -0.2);
      for (const sx of [-1.14, 1.14]) for (const sz of [-2.4, 2.4]) cyl(b, 'darkSteel', 0.50, 0.50, 0.32, 8, sx, 0.50, sz, 0, 0, Math.PI * 0.5);
      break;
    case 'fountain':
      cyl(b, 'ceramic', 2.6, 2.8, 0.65, 12, 0, 0.325, 0);
      cyl(b, 'skyBlue', 2.35, 2.35, 0.12, 12, 0, 0.58, 0);
      cyl(b, 'ceramic', 0.48, 0.56, 2.1, 10, 0, 1.05, 0);
      cyl(b, 'ceramic', 1.25, 0.85, 0.25, 10, 0, 1.95, 0);
      break;
    case 'road_dash_w':
      box(b, 'ceramic', 0.22, 0.025, d || 3.4, 0, 0.015, 0);
      break;
    case 'road_dash_y':
      box(b, 'oliveGold', 0.18, 0.025, d || 5.0, -0.22, 0.015, 0);
      box(b, 'oliveGold', 0.18, 0.025, d || 5.0, 0.22, 0.015, 0);
      break;
    case 'crosswalk':
      for (let i = -3; i <= 3; i++) box(b, 'ceramic', 0.52, 0.025, 3.2, i * 1.15, 0.016, 0);
      break;

    // --- PARADISE / COURTYARD (LEVEL 14, 188) ---
    case 'torii_shrine':
      for (const sx of [-1.85, 1.85]) {
        cyl(b, 'crimson', 0.24, 0.28, 4.8, 8, sx, 2.4, 0);
        cyl(b, 'darkSteel', 0.32, 0.36, 0.55, 8, sx, 0.275, 0);
      }
      box(b, 'crimson', 5.2, 0.32, 0.46, 0, 4.85, 0);
      box(b, 'darkSteel', 5.4, 0.16, 0.50, 0, 5.06, 0);
      box(b, 'crimson', 4.3, 0.24, 0.28, 0, 3.85, 0);
      break;
    case 'stone_altar':
      box(b, 'stone', 2.2, 0.55, 2.2, 0, 0.275, 0);
      box(b, 'stone', 1.4, 0.75, 1.4, 0, 0.92, 0);
      cone(b, 'glowPink', 0.34, 1.15, 6, 0, 1.88, 0);
      break;
    case 'balcony_ledge':
      box(b, 'stone', w || 12, 0.24, d || 1.1, 0, 0, 0);
      box(b, 'stone', w || 12, 0.82, 0.12, 0, 0.48, (d || 1.1) * 0.44);
      break;

    // --- ATTIC / KITTY HOUSE / VOID (LEVEL 19, 974, 9223) ---
    case 'rafter_beam': {
      const rw = w || 12;
      box(b, 'warmWood', rw, 0.22, 0.22, 0, 0, 0);
      box(b, 'warmWood', rw * 0.56, 0.20, 0.20, -rw * 0.24, 1.15, 0, 0, 0, 0.42);
      box(b, 'warmWood', rw * 0.56, 0.20, 0.20, rw * 0.24, 1.15, 0, 0, 0, -0.42);
      break;
    }
    case 'cardboard_box': {
      const s = p.sBox || 1;
      box(b, 'paleWood', 0.85 * s, 0.72 * s, 0.85 * s, 0, 0.36 * s, 0);
      box(b, 'warmWood', 0.86 * s, 0.06 * s, 0.14 * s, 0, 0.71 * s, 0);
      break;
    }
    case 'washer':
      box(b, 'ceramic', 0.76, 0.94, 0.76, 0, 0.47, 0);
      box(b, 'ceramic', 0.76, 0.22, 0.18, 0, 1.05, -0.29);
      cyl(b, 'darkSteel', 0.22, 0.22, 0.06, 10, 0, 0.48, 0.38, Math.PI * 0.5, 0, 0);
      break;
    case 'crt_tv':
      box(b, 'warmWood', 0.72, 0.58, 0.52, 0, 0.29, 0);
      box(b, 'glowCyan', 0.52, 0.40, 0.05, 0, 0.31, 0.25);
      cyl(b, 'brightSteel', 0.015, 0.015, 0.52, 5, -0.14, 0.78, 0, 0, 0, 0.38);
      cyl(b, 'brightSteel', 0.015, 0.015, 0.52, 5, 0.14, 0.78, 0, 0, 0, -0.38);
      break;
    case 'fridge':
      box(b, 'pastelPink', 0.92, 1.98, 0.84, 0, 0.99, 0);
      box(b, 'ceramic', 0.86, 0.54, 0.06, 0, 1.62, 0.42);
      box(b, 'brightSteel', 0.05, 0.36, 0.08, -0.32, 1.62, 0.46);
      box(b, 'brightSteel', 0.05, 0.52, 0.08, -0.32, 0.86, 0.46);
      break;
    case 'kitchen_counter':
      box(b, 'pastelPink', 2.4, 0.88, 0.78, 0, 0.44, 0);
      box(b, 'ceramic', 2.46, 0.08, 0.84, 0, 0.92, 0);
      cyl(b, 'glowPink', 0.12, 0.15, 0.24, 8, -0.5, 1.08, 0);
      break;
    case 'plushie':
      cyl(b, p.blue ? 'skyBlue' : 'pastelPink', 0.22, 0.26, 0.42, 8, 0, 0.22, 0);
      cyl(b, p.blue ? 'skyBlue' : 'pastelPink', 0.20, 0.20, 0.30, 8, 0, 0.54, 0);
      box(b, 'ceramic', 0.12, 0.18, 0.10, -0.12, 0.74, 0);
      box(b, 'ceramic', 0.12, 0.18, 0.10, 0.12, 0.74, 0);
      break;
    case 'wall_painting':
      box(b, 'warmWood', 1.35, 1.05, 0.08, 0, 0, 0);
      box(b, p.pink ? 'pastelPink' : 'skyBlue', 1.15, 0.85, 0.10, 0, 0, 0);
      break;
    case 'fairy_light':
      for (const ox of [-0.5, -0.18, 0.18, 0.5]) {
        box(b, 'glowPink', 0.12, 0.12, 0.12, ox, Math.abs(ox) * -0.18, 0);
      }
      break;
    case 'monolith_arch':
      box(b, 'darkSteel', 0.65, 6.4, 0.65, -2.25, 3.2, 0);
      box(b, 'darkSteel', 0.65, 6.4, 0.65, 2.25, 3.2, 0);
      box(b, 'darkSteel', 5.2, 0.68, 0.72, 0, 6.2, 0);
      box(b, 'ceramic', 4.9, 0.22, 0.76, 0, 6.62, 0);
      box(b, 'glowCyan', 3.9, 0.10, 0.74, 0, 5.82, 0);
      break;
    case 'void_handrail':
      box(b, 'brightSteel', w || 4.0, 0.07, 0.07, 0, 0.98, 0);
      for (const sx of [-(w || 4.0) * 0.45, (w || 4.0) * 0.45]) box(b, 'ceramic', 0.09, 1.0, 0.09, sx, 0.5, 0);
      break;
    default:
      box(b, 'stone', w, h, d, 0, h * 0.5, 0);
      break;
  }
}

export function buildPropsBatched(root, map, disposables) {
  const props = map.PROPS || [];
  if (!props.length && !(map.ANIM_PROPS?.length)) return [];

  const reg = (o) => { disposables.push(o); return o; };
  const buckets = makeBucketCollector();

  for (let i = 0; i < props.length; i++) {
    const p = props[i];
    _parentM.compose(
      _vPos.set(p.x, p.y ?? 0, p.z),
      _qParent.setFromAxisAngle(_upY, p.ry ?? 0),
      _vScale.set(p.s ?? 1, p.s ?? 1, p.s ?? 1)
    );
    buildStaticProp(buckets, p, map);
  }

  for (const [bName, geoms] of Object.entries(buckets)) {
    if (!geoms.length) continue;
    const merged = BufferGeometryUtils.mergeGeometries(geoms, false);
    for (const g of geoms) g.dispose();
    if (!merged) continue;
    const def = BUCKET_DEFS[bName];
    const mat = def.basic
      ? new THREE.MeshBasicMaterial({ color: def.color, transparent: !!def.transparent, opacity: def.opacity ?? 1, depthWrite: def.depthWrite !== false, side: def.side ?? THREE.FrontSide })
      : new THREE.MeshStandardMaterial({
          color: def.color,
          roughness: def.roughness ?? 0.7,
          metalness: def.metalness ?? 0.08,
          ...(def.emissive ? { emissive: def.emissive, emissiveIntensity: def.emissiveIntensity ?? 1.2 } : {})
        });
    const mesh = new THREE.Mesh(reg(merged), reg(mat));
    root.add(mesh);
  }

  // Animated interactive environmental rigs (sirens, windmills, buoys, lighthouse beams, steam, lanterns)
  const animHandles = [];
  const animSpecs = map.ANIM_PROPS || [];
  if (animSpecs.length) {
    const redGlowMat = reg(new THREE.MeshBasicMaterial({ color: 0xff2818, transparent: true, opacity: 0.16, depthWrite: false, side: THREE.DoubleSide }));
    const whiteBeamMat = reg(new THREE.MeshBasicMaterial({ color: 0xfff5d4, transparent: true, opacity: 0.12, depthWrite: false, side: THREE.DoubleSide }));
    const sirenBulbMat = reg(new THREE.MeshStandardMaterial({ color: 0xff2a1c, emissive: 0xff2014, emissiveIntensity: 2.6 }));
    const warmLanternMat = reg(new THREE.MeshStandardMaterial({ color: 0xffc66e, emissive: 0xff9b34, emissiveIntensity: 2.0 }));
    const bladeMat = reg(new THREE.MeshStandardMaterial({ color: 0xd8d0c4, roughness: 0.6 }));
    const darkMat = reg(new THREE.MeshStandardMaterial({ color: 0x26292e, roughness: 0.5, metalness: 0.4 }));
    const buoyMat = reg(new THREE.MeshStandardMaterial({ color: 0xd93025, roughness: 0.45 }));
    const cyanCubeMat = reg(new THREE.MeshStandardMaterial({ color: 0x62efff, emissive: 0x2be0ff, emissiveIntensity: 2.2 }));
    const steamMat = reg(new THREE.MeshBasicMaterial({ color: 0xc8d2d8, transparent: true, opacity: 0.18, depthWrite: false }));
    const abyssMat = reg(new THREE.MeshBasicMaterial({ color: 0x091c24, transparent: true, opacity: 0.72, depthWrite: false }));
    const rippleMat = reg(new THREE.MeshBasicMaterial({ color: 0xdffaff, transparent: true, opacity: 0.38, depthWrite: false, side: THREE.DoubleSide }));
    const sluiceFrameMat = reg(new THREE.MeshStandardMaterial({ color: 0x2b3e46, roughness: 0.52, metalness: 0.55 }));
    const sluiceDoorMat = reg(new THREE.MeshStandardMaterial({ color: 0x5c808a, roughness: 0.38, metalness: 0.62 }));

    const coneGeo = reg(new THREE.ConeGeometry(2.4, 9.5, 8));
    coneGeo.translate(0, -4.75, 0);
    coneGeo.rotateX(Math.PI * 0.5);

    const longBeamGeo = reg(new THREE.ConeGeometry(8.5, 62, 10));
    longBeamGeo.translate(0, -31, 0);
    longBeamGeo.rotateX(Math.PI * 0.5);

    const bulbGeo = reg(new THREE.CylinderGeometry(0.18, 0.20, 0.24, 8));
    const bladeGeo = reg(new THREE.BoxGeometry(0.24, 2.8, 0.06));
    const buoyGeo = reg(new THREE.CylinderGeometry(0.35, 0.45, 1.4, 8));
    const cubeGeo = reg(new THREE.OctahedronGeometry(0.55, 0));
    const lanternGeo = reg(new THREE.CylinderGeometry(0.24, 0.20, 0.44, 7));
    const steamGeo = reg(new THREE.CylinderGeometry(0.65, 0.35, 2.4, 7));
    const abyssBodyGeo = reg(new THREE.CapsuleGeometry ? new THREE.CapsuleGeometry(0.55, 3.8, 4, 8) : new THREE.CylinderGeometry(0.55, 0.4, 4.2, 8));
    abyssBodyGeo.rotateX(Math.PI * 0.5);
    const rippleGeo = reg(new THREE.RingGeometry(0.55, 0.72, 20));
    rippleGeo.rotateX(-Math.PI * 0.5);
    const sluiceLeafGeo = reg(new THREE.BoxGeometry(28.5, 6.8, 0.65));
    const sluiceBarGeo = reg(new THREE.BoxGeometry(29.2, 0.45, 0.95));

    for (let i = 0; i < animSpecs.length; i++) {
      const a = animSpecs[i];
      const g = new THREE.Group();
      g.position.set(a.x, a.y ?? 0, a.z);
      if (a.ry) g.rotation.y = a.ry;
      if (a.kind === 'siren_beacon') {
        g.add(new THREE.Mesh(bulbGeo, sirenBulbMat));
        const b1 = new THREE.Mesh(coneGeo, redGlowMat);
        b1.rotation.y = 0;
        const b2 = new THREE.Mesh(coneGeo, redGlowMat);
        b2.rotation.y = Math.PI;
        g.add(b1, b2);
      } else if (a.kind === 'lighthouse_beam') {
        const b1 = new THREE.Mesh(longBeamGeo, whiteBeamMat);
        const b2 = new THREE.Mesh(longBeamGeo, whiteBeamMat);
        b2.rotation.y = Math.PI;
        g.add(b1, b2);
      } else if (a.kind === 'windmill') {
        const towerG = new THREE.Mesh(reg(new THREE.CylinderGeometry(0.25, 0.85, 8.8, 4)), darkMat);
        towerG.position.y = 4.4;
        root.add(towerG);
        towerG.position.set(a.x, a.y ?? 0, a.z);
        g.position.set(a.x, (a.y ?? 0) + 8.8, a.z + 0.45);
        for (let bi = 0; bi < 4; bi++) {
          const m = new THREE.Mesh(bladeGeo, bladeMat);
          m.rotation.z = (bi * Math.PI) / 2;
          m.position.set(Math.sin(-(bi * Math.PI) / 2) * 1.4, Math.cos(-(bi * Math.PI) / 2) * 1.4, 0);
          g.add(m);
        }
      } else if (a.kind === 'buoy') {
        const body = new THREE.Mesh(buoyGeo, buoyMat);
        const top = new THREE.Mesh(bulbGeo, sirenBulbMat);
        top.position.y = 0.85;
        g.add(body, top);
      } else if (a.kind === 'floating_lantern') {
        g.add(new THREE.Mesh(lanternGeo, warmLanternMat));
      } else if (a.kind === 'glitch_cube') {
        g.add(new THREE.Mesh(cubeGeo, cyanCubeMat));
      } else if (a.kind === 'steam_vent') {
        g.add(new THREE.Mesh(steamGeo, steamMat));
      } else if (a.kind === 'abyss_silhouette') {
        const body = new THREE.Mesh(abyssBodyGeo, abyssMat);
        if (a.s) body.scale.setScalar(a.s);
        g.add(body);
      } else if (a.kind === 'water_ripple_ring') {
        const r = new THREE.Mesh(rippleGeo, rippleMat);
        if (a.s) r.scale.setScalar(a.s);
        g.add(r);
      } else if (a.kind === 'drainage_sluice_gate') {
        const leaf = new THREE.Mesh(sluiceLeafGeo, sluiceDoorMat);
        leaf.position.y = 3.4;
        const bar1 = new THREE.Mesh(sluiceBarGeo, sluiceFrameMat);
        bar1.position.y = 1.4;
        const bar2 = new THREE.Mesh(sluiceBarGeo, sluiceFrameMat);
        bar2.position.y = 4.9;
        g.add(leaf, bar1, bar2);
      }
      root.add(g);
      animHandles.push({
        group: g,
        kind: a.kind,
        baseX: a.x,
        baseY: g.position.y,
        baseZ: a.z,
        radius: a.radius ?? 9.0,
        speed: a.speed ?? 0.28,
        baseScale: a.s ?? 1.0,
        phase: a.phase ?? (i * 1.37)
      });
    }
  }

  return animHandles;
}

export function updateAnimatedProps(animHandles, elapsed, curMap) {
  if (!animHandles || !animHandles.length) return;
  for (let i = 0; i < animHandles.length; i++) {
    const h = animHandles[i];
    const t = elapsed + h.phase;
    if (h.kind === 'siren_beacon') {
      h.group.rotation.y = t * 4.2;
    } else if (h.kind === 'lighthouse_beam') {
      h.group.rotation.y = t * 0.85;
    } else if (h.kind === 'windmill') {
      h.group.rotation.z = t * 1.15;
    } else if (h.kind === 'buoy') {
      h.group.position.y = h.baseY + Math.sin(t * 1.6) * 0.16;
      h.group.rotation.z = Math.sin(t * 1.3) * 0.14;
    } else if (h.kind === 'floating_lantern') {
      h.group.position.y = h.baseY + Math.sin(t * 1.2) * 0.28;
      h.group.rotation.y = t * 0.35;
    } else if (h.kind === 'glitch_cube') {
      h.group.position.y = h.baseY + Math.sin(t * 1.8) * 0.35;
      h.group.rotation.y = t * 1.1;
      h.group.rotation.x = Math.sin(t * 0.7) * 0.4;
    } else if (h.kind === 'steam_vent') {
      const cyc = (t * 0.85) % 1;
      h.group.position.y = h.baseY + cyc * 2.2;
      h.group.scale.setScalar(0.65 + cyc * 1.25);
    } else if (h.kind === 'abyss_silhouette') {
      const ang = t * h.speed;
      h.group.position.x = h.baseX + Math.cos(ang) * h.radius;
      h.group.position.z = h.baseZ + Math.sin(ang * 0.85) * h.radius * 0.72;
      h.group.position.y = h.baseY + Math.sin(t * 0.9) * 0.22;
      h.group.rotation.y = -ang;
    } else if (h.kind === 'water_ripple_ring') {
      const cyc = (t * 0.52) % 1;
      const sc = h.baseScale * (0.45 + cyc * 2.4);
      h.group.scale.set(sc, 1, sc);
    } else if (h.kind === 'drainage_sluice_gate') {
      const pumpsDone = curMap?.PUMPS?.length ? curMap.PUMPS.filter((pm) => pm.done).length : 0;
      const taskDone = curMap?.TASKS?.some((tk) => tk.done) ? 1 : 0;
      const targetLift = (taskDone || (curMap?.PUMPS?.length && pumpsDone >= curMap.PUMPS.length)) ? 5.6 : (pumpsDone * 0.55);
      h.group.position.y += ((h.baseY + targetLift) - h.group.position.y) * 0.04;
    }
  }
}
