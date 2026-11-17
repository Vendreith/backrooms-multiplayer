/*!
 * Copyright (c) 2026 Vendreith. All rights reserved (Original Engine & Code).
 * Licensing information: see LICENSE.md
 * Third-party notices: see THIRD_PARTY_NOTICES.md
 */

// ---------- 3D World Mesh Builder for Level 0 Entrances & All 20 Sub-Levels ----------
// Uses BufferGeometryUtils merging + InstancedMesh + GPU Sky Dome Shader + animated Water
// so 500m-900m worlds render smoothly at high FPS on both PC & Mobile presets.

import { THREE, BufferGeometryUtils } from '../engine.js';
import { GFX_PRESETS } from '../constants.js';
import { getLevelMaterials } from './level_textures.js';
import { buildPropsBatched, updateAnimatedProps } from './prop_builder.js';
import { createPoolArtGeometry } from './poolrooms_art_mesh.js';
import { createPoolOptics } from './poolrooms_optics.js';
import {buildPoolDecor} from './poolrooms_decor_mesh.js';
import {createPoolDaylight} from './poolrooms_daylight.js';
import {createTubeWater} from './poolrooms_tube_water.js';
import {createTubeMaterial} from './poolrooms_tube_material.js';

function reg(disposables, item) {
  if (item) disposables.push(item);
  return item;
}

function mergeList(geoms) {
  if (!geoms || !geoms.length) return null;
  const g = BufferGeometryUtils.mergeGeometries(geoms, false);
  for (const x of geoms) x.dispose();
  return g;
}

// Split globally merged static geometry into spatial batches. Materials and the
// water shader remain shared; every client selects visible batches locally.
function partitionPoolGeometry(root, disposables, skipMesh, size = 32) {
  const chunks = [];
  for (const mesh of [...root.children]) {
    if (!mesh.isMesh || mesh.isInstancedMesh || mesh === skipMesh || mesh.geometry?.attributes?.position?.count < 500 || mesh.position.lengthSq() > .001) continue;
    const source = mesh.geometry.index ? mesh.geometry.toNonIndexed() : mesh.geometry;
    const positions = source.attributes.position, buckets = new Map();
    for (let i = 0; i < positions.count; i += 3) {
      const x = (positions.getX(i) + positions.getX(i + 1) + positions.getX(i + 2)) / 3;
      const z = (positions.getZ(i) + positions.getZ(i + 1) + positions.getZ(i + 2)) / 3;
      const key = `${Math.floor(x / size)},${Math.floor(z / size)}`;
      if (!buckets.has(key)) buckets.set(key, []); buckets.get(key).push(i, i + 1, i + 2);
    }
    root.remove(mesh);
    for (const indices of buckets.values()) {
      const geom = reg(disposables, new THREE.BufferGeometry());
      for (const [name, attribute] of Object.entries(source.attributes)) {
        const data = new attribute.array.constructor(indices.length * attribute.itemSize);
        let offset = 0;
        for (const i of indices) for (let k = 0; k < attribute.itemSize; k++) data[offset++] = attribute.array[i * attribute.itemSize + k];
        geom.setAttribute(name, new THREE.BufferAttribute(data, attribute.itemSize, attribute.normalized));
      }
      geom.computeBoundingBox(); geom.computeBoundingSphere();
      const part = new THREE.Mesh(geom, mesh.material); part.name = 'pool-static-chunk';
      part.userData.decorative=!!mesh.userData.decorative;
      part.userData.gpuEvicted=true;
      part.userData.bounds = geom.boundingBox; root.add(part); chunks.push(part);
    }
    if (source !== mesh.geometry) source.dispose();
    const originalIndex=disposables.indexOf(mesh.geometry);
    if(originalIndex>=0)disposables.splice(originalIndex,1);
    mesh.geometry.dispose();
  }
  return chunks;
}

function makeTiledBox(dx, dy, dz, tileSize = 4.0) {
  const g = new THREE.BoxGeometry(dx, dy, dz);
  const uv = g.attributes.uv;
  const nrm = g.attributes.normal;
  const pos = g.attributes.position;
  for (let i = 0; i < uv.count; i++) {
    const nx = Math.abs(nrm.getX(i));
    const ny = Math.abs(nrm.getY(i));
    const x = pos.getX(i) + dx * 0.5;
    const y = pos.getY(i) + dy * 0.5;
    const z = pos.getZ(i) + dz * 0.5;
    if (nx > 0.5) uv.setXY(i, z / tileSize, y / tileSize);
    else if (ny > 0.5) uv.setXY(i, x / tileSize, z / tileSize);
    else uv.setXY(i, x / tileSize, y / tileSize);
  }
  uv.needsUpdate = true;
  return g;
}

function makeTiledCyl(rt, rb, h, seg = 16, tileSize = 2.4) {
  const g = new THREE.CylinderGeometry(rt, rb, h, seg);
  const uv = g.attributes.uv;
  const circ = Math.max(1.0, Math.PI * (rt + rb));
  for (let i = 0; i < uv.count; i++) {
    uv.setXY(i, uv.getX(i) * (circ / tileSize), uv.getY(i) * (h / tileSize));
  }
  uv.needsUpdate = true;
  return g;
}

function tagGeomColor(g, rgb = [0.97, 0.98, 0.93]) {
  const count = g.attributes.position.count;
  const arr = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    arr[i * 3] = rgb[0];
    arr[i * 3 + 1] = rgb[1];
    arr[i * 3 + 2] = rgb[2];
  }
  g.setAttribute('color', new THREE.BufferAttribute(arr, 3));
  return g;
}

function applyPoolroomsIndirectBounce(geom, map, isWaterFloor = false) {
  if (!geom?.attributes?.position) return geom;
  const pos = geom.attributes.position;
  const nrm = geom.attributes.normal;
  const count = pos.count;
  const colors = new Float32Array(count * 3);
  const vols = map.LIGHT_VOLUMES || [];
  const zones = map.POOL_ZONES || [];

  // Build coarse spatial acceleration buckets over XZ so even 100k+ vertices tint in <4ms
  const span = map.worldSpan || 1344;
  const bSize = 48;
  const cols = Math.max(1, Math.ceil(span / bSize));
  const vBuckets = Array.from({ length: cols * cols }, () => []);
  for (let vi = 0; vi < vols.length; vi++) {
    const v = vols[vi];
    const minC = Math.max(0, Math.floor((v.x - v.r) / bSize));
    const maxC = Math.min(cols - 1, Math.floor((v.x + v.r) / bSize));
    const minR = Math.max(0, Math.floor((v.z - v.r) / bSize));
    const maxR = Math.min(cols - 1, Math.floor((v.z + v.r) / bSize));
    for (let r = minR; r <= maxR; r++) {
      for (let c = minC; c <= maxC; c++) vBuckets[r * cols + c].push(v);
    }
  }
  const zBuckets = Array.from({ length: cols * cols }, () => []);
  for (let zi = 0; zi < zones.length; zi++) {
    const z = zones[zi];
    if (!z.bounceRgb && z.exposure == null) continue;
    const pad = 12;
    const minC = Math.max(0, Math.floor((z.bounds.x0 - pad) / bSize));
    const maxC = Math.min(cols - 1, Math.floor((z.bounds.x1 + pad) / bSize));
    const minR = Math.max(0, Math.floor((z.bounds.z0 - pad) / bSize));
    const maxR = Math.min(cols - 1, Math.floor((z.bounds.z1 + pad) / bSize));
    for (let r = minR; r <= maxR; r++) {
      for (let c = minC; c <= maxC; c++) zBuckets[r * cols + c].push(z);
    }
  }

  for (let i = 0; i < count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const ny = nrm ? nrm.getY(i) : 0;

    let r = isWaterFloor ? 0.72 : 0.96;
    let g = isWaterFloor ? 0.94 : 0.98;
    let b = isWaterFloor ? 0.93 : 0.99;

    // Gentle upward turquoise water bounce onto underside arches & low plinths
    if (!isWaterFloor && y > -0.8 && y < 2.6) {
      const lowW = Math.max(0, 1 - Math.abs(y - 0.1) / 2.5) * (ny < 0.25 ? 0.16 : 0.08);
      r = r * (1 - lowW) + 0.68 * lowW;
      g = g * (1 - lowW) + 0.96 * lowW;
      b = b * (1 - lowW) + 0.94 * lowW;
    }

    const bc = Math.max(0, Math.min(cols - 1, (x / bSize) | 0));
    const br = Math.max(0, Math.min(cols - 1, (z / bSize) | 0));
    const cellIdx = br * cols + bc;

    const zb = zBuckets[cellIdx];
    for (let k = 0; k < zb.length; k++) {
      const zn = zb[k];
      if (x >= zn.bounds.x0 - 6 && x <= zn.bounds.x1 + 6 && z >= zn.bounds.z0 - 6 && z <= zn.bounds.z1 + 6) {
        const edgeX = Math.min(1, Math.min(x - (zn.bounds.x0 - 6), (zn.bounds.x1 + 6) - x) / 10);
        const edgeZ = Math.min(1, Math.min(z - (zn.bounds.z0 - 6), (zn.bounds.z1 + 6) - z) / 10);
        const w = Math.max(0, Math.min(edgeX, edgeZ));
        if (zn.bounceRgb) {
          const bw = Math.min(0.75, w * (zn.bounceStrength ?? 0.42) * 1.25);
          r = r * (1 - bw) + zn.bounceRgb[0] * bw;
          g = g * (1 - bw) + zn.bounceRgb[1] * bw;
          b = b * (1 - bw) + zn.bounceRgb[2] * bw;
        }
        if (zn.exposure != null && zn.exposure < 0.66) {
          const dim = 1 - w * Math.min(0.42, (0.70 - zn.exposure) * 1.4);
          r *= dim; g *= dim; b *= dim;
        }
        break;
      }
    }

    const vb = vBuckets[cellIdx];
    let accR = 0, accG = 0, accB = 0, accW = 0;
    for (let k = 0; k < vb.length; k++) {
      const lv = vb[k];
      const dx = x - lv.x;
      const dy = (y - (lv.y ?? 2.2)) * 0.65;
      const dz = z - lv.z;
      const d2 = dx * dx + dy * dy + dz * dz;
      const rr = lv.r * lv.r;
      if (d2 < rr) {
        const t = Math.max(0, Math.min(1, 1 - Math.sqrt(d2) / lv.r));
        const w = Math.pow(t, 1.35) * (lv.strength ?? 0.62) * 1.38;
        accR += lv.rgb[0] * w;
        accG += lv.rgb[1] * w;
        accB += lv.rgb[2] * w;
        accW += w;
      }
    }
    if (accW > 0.001) {
      const blend = Math.min(0.84, accW);
      const nr = accR / accW;
      const ng = accG / accW;
      const nb = accB / accW;
      r = r * (1 - blend) + nr * blend;
      g = g * (1 - blend) + ng * blend;
      b = b * (1 - blend) + nb * blend;
    }

    colors[i * 3] = Math.min(1.06, Math.max(0.24, r));
    colors[i * 3 + 1] = Math.min(1.06, Math.max(0.24, g));
    colors[i * 3 + 2] = Math.min(1.06, Math.max(0.24, b));
  }

  geom.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  return geom;
}

function buildSkyDome(skyCfg, disposables) {
  const geo = reg(disposables, new THREE.SphereGeometry(540, 28, 18));
  const mat = reg(disposables, new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    uniforms: {
      uTop: { value: new THREE.Color(skyCfg.top) },
      uMid: { value: new THREE.Color(skyCfg.mid) },
      uHor: { value: new THREE.Color(skyCfg.horizon) },
      uSunCol: { value: new THREE.Color(skyCfg.sunColor || 0xffffff) },
      uSunDir: { value: new THREE.Vector3(...(skyCfg.sunDir || [0.3, 0.5, -0.7])).normalize() },
      uGlow: { value: skyCfg.glowDisc ? 1.0 : 0.0 },
      uStars: { value: skyCfg.stars ? 1.0 : 0.0 },
      uClouds: { value: skyCfg.clouds ? 1.0 : 0.0 },
      uTime: { value: 0 }
    },
    vertexShader: `
      varying vec3 vDir;
      void main() {
        vDir = normalize(position);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 uTop, uMid, uHor, uSunCol, uSunDir;
      uniform float uGlow, uStars, uClouds, uTime;
      varying vec3 vDir;
      float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float noise(vec2 p) {
        vec2 i = floor(p); vec2 f = fract(p);
        vec2 u = f*f*(3.0-2.0*f);
        return mix(mix(hash(i), hash(i+vec2(1.,0.)), u.x), mix(hash(i+vec2(0.,1.)), hash(i+vec2(1.,1.)), u.x), u.y);
      }
      void main() {
        float h = clamp(vDir.y, 0.0, 1.0);
        vec3 col = mix(uHor, uMid, smoothstep(0.0, 0.28, h));
        col = mix(col, uTop, smoothstep(0.24, 0.85, h));
        if (uClouds > 0.5 && vDir.y > 0.02) {
          vec2 uv = vDir.xz / (vDir.y + 0.16) * 1.45 + vec2(uTime * 0.008, 0.0);
          float cl = smoothstep(0.54, 0.82, noise(uv * 2.2) * 0.65 + noise(uv * 5.0) * 0.35);
          col = mix(col, mix(uHor, vec3(1.0), 0.35), cl * 0.38 * smoothstep(0.02, 0.25, h));
        }
        if (uStars > 0.5 && vDir.y > 0.08) {
          vec2 suv = floor(vDir.xz / (vDir.y + 0.25) * 90.0);
          float st = step(0.992, hash(suv));
          col += vec3(0.85, 0.92, 1.0) * st * smoothstep(0.08, 0.45, h);
        }
        if (uGlow > 0.5) {
          float s = max(0.0, dot(normalize(vDir), uSunDir));
          col += uSunCol * (pow(s, 36.0) * 0.55 + pow(s, 320.0) * 1.4);
        }
        gl_FragColor = vec4(col, 1.0);
      }
    `
  }));
  return { mesh: new THREE.Mesh(geo, mat), mat };
}

/**
 * Renders the 20 Level Entrances inside Level 0 (shaped portals, anomalous pickups,
 * crouch vents/cracks, and visually flat false-floor noclip drop zones).
 */
export function buildLevel0EntrancesGroup(entrances, disposables, animItems) {
  const group = new THREE.Group();
  const entranceMeshes = [];

  if (!entrances || !entrances.length) return { group, entranceMeshes };

  const darkFrameMat = reg(disposables, new THREE.MeshStandardMaterial({ color: 0x202226, roughness: 0.6, metalness: 0.4 }));
  const crateMat = reg(disposables, new THREE.MeshStandardMaterial({ color: 0x735b40, roughness: 0.9 }));

  for (const ent of entrances) {
    const g = new THREE.Group();
    g.position.set(ent.x, 0, ent.z);
    g.rotation.y = ent.rot || 0;

    const accentMat = reg(disposables, new THREE.MeshStandardMaterial({
      color: ent.accent || 0x48d0f5,
      emissive: ent.accent || 0x48d0f5,
      emissiveIntensity: 0.72,
      roughness: 0.28
    }));

    if (ent.entryType === 'noclip_floor') {
      // Visually looks completely FLAT & identical to carpet floor ("nhìn trên sàn bằng phẳng"),
      // with ONLY a razor-thin translucent shimmer aura on hover/close look or scanner reveal!
      const faintRing = new THREE.Mesh(
        reg(disposables, new THREE.RingGeometry(1.18, 1.25, 24)),
        reg(disposables, new THREE.MeshBasicMaterial({
          color: ent.accent || 0xffffff,
          transparent: true,
          opacity: 0.12,
          side: THREE.DoubleSide,
          depthWrite: false
        }))
      );
      faintRing.rotation.x = -Math.PI * 0.5;
      faintRing.position.y = 0.015;
      g.add(faintRing);
    } else if (ent.entryType === 'portal') {
      // Iconic shaped glowing Backrooms gateway frame!
      const pL = new THREE.Mesh(reg(disposables, new THREE.BoxGeometry(0.28, 3.1, 0.34)), darkFrameMat);
      pL.position.set(-1.15, 1.55, 0);
      const pR = new THREE.Mesh(reg(disposables, new THREE.BoxGeometry(0.28, 3.1, 0.34)), darkFrameMat);
      pR.position.set(1.15, 1.55, 0);
      const pTop = new THREE.Mesh(reg(disposables, new THREE.BoxGeometry(2.65, 0.32, 0.38)), darkFrameMat);
      pTop.position.set(0, 3.15, 0);
      const portalPlane = new THREE.Mesh(
        reg(disposables, new THREE.PlaneGeometry(2.05, 2.9)),
        reg(disposables, new THREE.MeshBasicMaterial({
          color: ent.accent || 0x48d0f5,
          transparent: true,
          opacity: 0.42,
          side: THREE.DoubleSide
        }))
      );
      portalPlane.position.set(0, 1.5, 0);
      g.add(pL, pR, pTop, portalPlane);
      animItems.push({ mesh: portalPlane, baseY: 1.5, phase: ent.x * 0.13, portalGlow: true });
    } else if (ent.entryType === 'pickup') {
      // Weathered crate pedestal + hovering anomalous trigger object (wheat / plushie / CRT / key / 64-bit cube)
      const ped = new THREE.Mesh(reg(disposables, new THREE.BoxGeometry(0.75, 0.55, 0.75)), crateMat);
      ped.position.set(0, 0.275, 0);
      const objGeo = ent.levelId === 'level974'
        ? reg(disposables, new THREE.IcosahedronGeometry(0.28, 1))
        : ent.levelId === 'level10'
          ? reg(disposables, new THREE.CylinderGeometry(0.18, 0.26, 0.56, 8))
          : reg(disposables, new THREE.BoxGeometry(0.38, 0.38, 0.38));
      const obj = new THREE.Mesh(objGeo, accentMat);
      obj.position.set(0, 0.92, 0);
      g.add(ped, obj);
      animItems.push({ mesh: obj, baseY: 0.92, phase: ent.z * 0.17 });
    } else if (ent.entryType === 'crawl_hatch') {
      // Low crouch-height steam grate / breaker hatch / jagged crack arch!
      const lintel = new THREE.Mesh(reg(disposables, new THREE.BoxGeometry(2.2, 0.24, 0.55)), darkFrameMat);
      lintel.position.set(0, 1.25, 0);
      const sideL = new THREE.Mesh(reg(disposables, new THREE.BoxGeometry(0.24, 1.25, 0.52)), darkFrameMat);
      sideL.position.set(-0.98, 0.625, 0);
      const sideR = new THREE.Mesh(reg(disposables, new THREE.BoxGeometry(0.24, 1.25, 0.52)), darkFrameMat);
      sideR.position.set(0.98, 0.625, 0);
      const holeGlow = new THREE.Mesh(
        reg(disposables, new THREE.PlaneGeometry(1.72, 1.15)),
        reg(disposables, new THREE.MeshBasicMaterial({ color: ent.accent || 0xff9c42, transparent: true, opacity: 0.35, side: THREE.DoubleSide }))
      );
      holeGlow.position.set(0, 0.58, 0);
      g.add(lintel, sideL, sideR, holeGlow);
    }

    group.add(g);
    entranceMeshes.push({ ent, group: g });
  }

  return { group, entranceMeshes };
}

/**
 * Builds an entire huge sub-level scene cleanly using batched merged geometry & instancing.
 */
export function buildSubLevelWorld(scene, map, gfxKey = 'ultra') {
  const cfg = map.levelCfg;
  const mats = getLevelMaterials(cfg);
  const disposables = [];
  const root = new THREE.Group();
  const animItems = [];
  const waterMeshes = [];
  const taskMeshes = [];
  const portalMeshes = [];
  const itemMeshes = new Map();
  const span = map.worldSpan;

  // 1. Sky Dome + Directional Sunlight/Moonlight if outdoor or skylight level
  let skyDome = null;
  let sunLight = null;
  if (cfg.sky) {
    skyDome = buildSkyDome(cfg.sky, disposables);
    root.add(skyDome.mesh);
    sunLight = new THREE.DirectionalLight(cfg.sunColor || 0xffffff, (cfg.sunInt ?? 0.85) * 0.62);
    const sd = cfg.sky.sunDir || [0.3, 0.7, 0.4];
    sunLight.position.set(sd[0] * 180, Math.abs(sd[1]) * 200 + 30, sd[2] * 180);
    root.add(sunLight);
  }

  const isPoolrooms = cfg.archetype === 'poolrooms';

  // 2. Ground Plane (or Deep Pool/Ocean Bed) + Indoor Ceiling
  if (cfg.archetype === 'void_staircase') {
    // Only spawn base & sky-mist subtle lower floor far below so void feels genuinely infinite & empty!
    const mistBase = new THREE.Mesh(
      reg(disposables, new THREE.PlaneGeometry(span * 1.4, span * 1.4)),
      reg(disposables, new THREE.MeshBasicMaterial({ color: 0xe8edf2, transparent: true, opacity: 0.45 }))
    );
    mistBase.rotation.x = -Math.PI * 0.5;
    mistBase.position.set(span * 0.5, -18, span * 0.5);
    root.add(mistBase);
  } else if (map.architectureVersion !== 4) {
    const baseY = cfg.archetype === 'ocean' ? -0.82 : isPoolrooms ? -2.85 : -0.02;
    const fSeg = isPoolrooms ? 136 : 1;
    const floorGeo = reg(disposables, new THREE.PlaneGeometry(span, span, fSeg, fSeg));
    if (isPoolrooms) {
      floorGeo.rotateX(-Math.PI * 0.5);
      floorGeo.translate(span * 0.5, baseY, span * 0.5);
      applyPoolroomsIndirectBounce(floorGeo, map, true);
      root.add(new THREE.Mesh(floorGeo, mats.floorMat));
    } else {
      const floorMesh = new THREE.Mesh(floorGeo, mats.floorMat);
      floorMesh.rotation.x = -Math.PI * 0.5;
      floorMesh.position.set(span * 0.5, baseY, span * 0.5);
      root.add(floorMesh);
    }
  }

  if (!cfg.isOutdoor && map.architectureVersion !== 4) {
    const cSeg = isPoolrooms ? 136 : 1;
    const ceilGeo = reg(disposables, new THREE.PlaneGeometry(span, span, cSeg, cSeg));
    if (isPoolrooms) {
      ceilGeo.rotateX(Math.PI * 0.5);
      ceilGeo.translate(span * 0.5, cfg.ceilH, span * 0.5);
      applyPoolroomsIndirectBounce(ceilGeo, map, false);
      root.add(new THREE.Mesh(ceilGeo, mats.ceilMat));
    } else {
      const ceilMesh = new THREE.Mesh(ceilGeo, mats.ceilMat);
      ceilMesh.rotation.x = Math.PI * 0.5;
      ceilMesh.position.set(span * 0.5, cfg.ceilH, span * 0.5);
      root.add(ceilMesh);
    }
  }

  // 3. Batch Walls, Structural Blocks & Poolrooms V3 Architectural Modules (Arches, Round Columns, Vaults, Curves, Tubes, Spiral Slides, Glass, Light Shafts)
  const tileUnit = isPoolrooms ? 2.4 : 4.5;
  const wallGeoms = [];
  const tubeGeoms = [];
  const mintGeoms = [];
  const bedGeoms = [];
  const ceilVaultGeoms = [];
  const glowGeoms = [];
  const glassGeoms = [];
  const lightShaftGeoms = [];

  if (map.WALLS?.length) {
    for (const w of map.WALLS) {
      const dx = Math.max(0.15, w.x1 - w.x0);
      const dz = Math.max(0.15, w.z1 - w.z0);
      const y0 = w.y0 ?? 0;
      const y1 = w.y1 ?? cfg.ceilH;
      const dy = Math.max(0.2, y1 - y0);
      const box = makeTiledBox(dx, dy, dz, tileUnit);
      box.translate((w.x0 + w.x1) * 0.5, y0 + dy * 0.5, (w.z0 + w.z1) * 0.5);
      wallGeoms.push(box);
    }
  }

  if (isPoolrooms && map.POOL_ARCH?.length) {
    const pushArchPart = (list, bx, by, bz, lx, ly, lz, rz, ax, az, rotY) => {
      const g = makeTiledBox(Math.max(0.12, bx), Math.max(0.12, by), Math.max(0.12, bz), 2.4);
      if (rz) g.rotateZ(rz);
      g.translate(lx, ly, lz);
      if (rotY) g.rotateY(rotY);
      g.translate(ax, 0, az);
      list.push(g);
    };
    for (const item of map.POOL_ARCH) {
      if(item.render===false)continue;
      const artGeometry=createPoolArtGeometry(item,THREE);
      if(artGeometry){
        if(item.kind==='tube_union')tubeGeoms.push(artGeometry);
        else if(item.glass)glassGeoms.push(artGeometry);
        else if(item.kind==='glow_panel')glowGeoms.push(tagGeomColor(artGeometry,[(item.hex>>16&255)/255,(item.hex>>8&255)/255,(item.hex&255)/255]));
        else wallGeoms.push(artGeometry);
      } else if (item.kind === 'portal_frame') {
        const r = item.span / 2, spring = 2.05, rise = Math.min(1.0, r * .65), rim = .22;
        const shape = new THREE.Shape();
        // A single U-shaped contour, open at floor level. A hole touching the
        // outer boundary makes Earcut fill the doorway on some triangulations.
        shape.moveTo(-r-rim,0);shape.lineTo(-r-rim,spring+rise+rim);
        shape.lineTo(r+rim,spring+rise+rim);shape.lineTo(r+rim,0);shape.lineTo(r,0);shape.lineTo(r,spring);
        shape.absellipse(0,spring,r,rise,0,Math.PI,false,0);shape.lineTo(-r,0);shape.closePath();
        const geom = new THREE.ExtrudeGeometry(shape,{depth:.28,bevelEnabled:false,curveSegments:20});
        geom.setIndex(Array.from({length:geom.attributes.position.count},(_,i)=>i));
        const uv=geom.attributes.uv;for(let i=0;i<uv.count;i++)uv.setXY(i,uv.getX(i)/2.4,uv.getY(i)/2.4);
        geom.translate(0,item.y0||0,-.14);geom.rotateY(item.rotY||0);geom.translate(item.x,0,item.z);wallGeoms.push(geom);
      } else if (item.kind === 'arch') {
        const span = item.span || 3.2;
        const h = item.h || 4.0;
        const pierW = item.pierW || 0.72;
        const depth = item.depth || 1.2;
        const y0 = item.y0 ?? 0;
        const rotY = item.rotY || 0;
        const R = span * 0.5;
        const archRise = Math.min(R, Math.max(0.6, h - 0.85));
        const straightH = item.springHeight ?? Math.max(0.35, h - archRise);
        const totalW = span + pierW * 2;
        // Left & Right Tiled Piers
        pushArchPart(wallGeoms, pierW, straightH + archRise, depth, -(R + pierW * 0.5), y0 + (straightH + archRise) * 0.5, 0, 0, item.x, item.z, rotY);
        pushArchPart(wallGeoms, pierW, straightH + archRise, depth, (R + pierW * 0.5), y0 + (straightH + archRise) * 0.5, 0, 0, item.x, item.z, rotY);
        // Upper Spandrel Header
        const spH = item.headerH ?? 0.65;
        pushArchPart(wallGeoms, totalW, spH, depth, 0, y0 + h + spH * 0.5, 0, 0, item.x, item.z, rotY);
        // 9-Segment Radial Semicircular Voussoir Ring + Flush Corner Spandrel Fills (zero dark corner triangles)
        const ringThick = Math.max(0.38, R * 0.30);
        const segN = 9;
        for (let k = 0; k < segN; k++) {
          const ang = ((k + 0.5) / segN) * Math.PI;
          const rMid = R + ringThick * 0.5;
          const lx = Math.cos(ang) * rMid;
          const ly = y0 + straightH + Math.sin(ang) * rMid * (archRise / R);
          const segLen = 2 * rMid * Math.tan(Math.PI / (segN * 2)) + 0.08;
          pushArchPart(wallGeoms, segLen, ringThick, depth, lx, ly, 0, ang - Math.PI * 0.5, item.x, item.z, rotY);
        }
        for (const u of [0.38, 0.58, 0.77, 0.93]) {
          const yCurve = y0 + straightH + archRise * Math.sqrt(Math.max(0, 1 - u * u));
          const fillH = Math.max(0.08, y0 + h + 0.05 - yCurve);
          const fillW = R * 0.24;
          const fillY = yCurve + fillH * 0.5;
          pushArchPart(wallGeoms, fillW, fillH, depth, -R * u, fillY, 0, 0, item.x, item.z, rotY);
          pushArchPart(wallGeoms, fillW, fillH, depth, R * u, fillY, 0, 0, item.x, item.z, rotY);
        }
        if (item.mint) {
          pushArchPart(mintGeoms, pierW + 0.08, 0.48, depth + 0.08, -(R + pierW * 0.5), y0 + 0.24, 0, 0, item.x, item.z, rotY);
          pushArchPart(mintGeoms, pierW + 0.08, 0.48, depth + 0.08, (R + pierW * 0.5), y0 + 0.24, 0, 0, item.x, item.z, rotY);
        }
        if (item.recessGlow) {
          if (item.closedBack) {
            pushArchPart(wallGeoms, span + 0.2, h, 0.16, 0, y0 + h * 0.5, -depth * 0.42, 0, item.x, item.z, rotY);
          }
          const gBox = makeTiledBox(Math.max(0.12, span * 0.84), 0.26, Math.max(0.18, depth * 0.55), 2.4);
          gBox.translate(0, y0 + h - 0.18, 0);
          if (rotY) gBox.rotateY(rotY);
          gBox.translate(item.x, 0, item.z);
          glowGeoms.push(tagGeomColor(gBox, item.glowRgb || [0.97, 0.98, 0.93]));
        }
      } else if (item.kind === 'round_col') {
        const r = item.r || 0.55;
        const h = item.h || 6.5;
        const y0 = item.y0 ?? -1.2;
        const shaft = makeTiledCyl(r, r, h, 12, 2.4);
        shaft.translate(item.x, y0 + h * 0.5, item.z);
        wallGeoms.push(shaft);
        const plinth = makeTiledBox(r * 2.4, 0.38, r * 2.4, 2.4);
        plinth.translate(item.x, y0 + 0.19, item.z);
        wallGeoms.push(plinth);
        const cap = makeTiledBox(r * 2.45, 0.34, r * 2.45, 2.4);
        cap.translate(item.x, y0 + h - 0.17, item.z);
        wallGeoms.push(cap);
        if (item.mintBand !== false && y0 < -0.25 && y0 + h > 0.1) {
          const collar = makeTiledCyl(r + 0.035, r + 0.035, 0.34, 12, 2.4);
          collar.translate(item.x, -0.18, item.z);
          mintGeoms.push(collar);
        }
      } else if (item.kind === 'ceil_vault') {
        const cx = (item.x0 + item.x1) * 0.5;
        const cz = (item.z0 + item.z1) * 0.5;
        const dx = Math.max(0.015, item.x1 - item.x0);
        const dz = Math.max(0.015, item.z1 - item.z0);
        const cy = item.y ?? 4.2;
        const slab = makeTiledBox(dx, 0.32, dz, 4.8);
        slab.translate(cx, cy + 0.16, cz);
        ceilVaultGeoms.push(slab);
        const ribs = item.ribs ?? 2;
        if (ribs > 0) {
          const alongX = dx >= dz;
          for (let ri = 0; ri <= ribs; ri++) {
            const t = (ri + 0.5) / (ribs + 1);
            const rib = alongX
              ? makeTiledBox(0.55, 0.38, dz, 2.4)
              : makeTiledBox(dx, 0.38, 0.55, 2.4);
            rib.translate(alongX ? item.x0 + dx * t : cx, cy - 0.18, alongX ? cz : item.z0 + dz * t);
            wallGeoms.push(rib);
          }
        }
        if (item.cofferGlow !== false && dx >= 3.2 && dz >= 3.2) {
          const gw = Math.min(dx * 0.62, 6.2);
          const gd = Math.min(dz * 0.62, 6.2);
          const gPanel = new THREE.BoxGeometry(gw, 0.08, gd);
          gPanel.translate(cx, cy - 0.02, cz);
          glowGeoms.push(tagGeomColor(gPanel, item.glowRgb || [0.97, 0.98, 0.93]));
        }
      } else if (item.kind === 'curved_wall') {
        const segs = item.segments || 8;
        const rad = item.radius || 8.0;
        const thick = item.thick || 0.85;
        const ch = item.h || 5.2;
        const cy0 = item.y0 ?? -0.5;
        const a0 = item.ang0 ?? 0;
        const a1 = item.ang1 ?? Math.PI;
        const dA = (a1 - a0) / segs;
        const chordLen = 2 * rad * Math.sin(Math.abs(dA) * 0.5) + thick * 0.45;
        for (let si = 0; si < segs; si++) {
          const ang = a0 + (si + 0.5) * dA;
          const sg = makeTiledBox(thick, ch, chordLen, 2.4);
          sg.rotateY(-ang);
          sg.translate(item.cx + Math.cos(ang) * rad, cy0 + ch * 0.5, item.cz + Math.sin(ang) * rad);
          wallGeoms.push(sg);
        }
      } else if (item.kind === 'ceramic_tube') {
        const r = item.r || 2.3;
        const len = item.len || 24;
        const cy = item.y ?? 2.4;
        const segs = item.segs || 10;
        const wallT = item.wallThick || 0.28;
        const alongX = item.axis !== 'z';
        const slopeAngle = item.slopeY ? Math.atan2(item.slopeY, len) : 0;
        const chordW = 2 * r * Math.tan(Math.PI / segs) + 0.14;
        const tubeParts = [];
        for (let si = 0; si < segs; si++) {
          const ang = (si / segs) * Math.PI * 2;
          // Leave top skylight slots if openTop or bottom deck slot if flatWalkFloor
          const ny = Math.sin(ang);
          if (item.flatWalkFloor && ny < -0.68) continue;
          if (item.openTop && ny > 0.72) continue;
          const plank = makeTiledBox(chordW, wallT, len, 2.4);
          plank.translate(0, r, 0);
          plank.rotateZ(ang - Math.PI * 0.5);
          tubeParts.push({ g: plank, target: (item.mintTrim && Math.abs(ny) < 0.25) ? mintGeoms : wallGeoms });
        }
        if (item.flatWalkFloor) {
          const deckW = r * 1.48;
          const deck = makeTiledBox(deckW, 0.24, len, 2.4);
          deck.translate(0, -r * 0.74, 0);
          tubeParts.push({ g: deck, target: item.waterTube ? mintGeoms : wallGeoms });
        }
        const ribStep = item.ribStep || 5.0;
        for (let rz = -len * 0.42; rz <= len * 0.42; rz += ribStep) {
          const ring = makeTiledCyl(r + 0.22, r + 0.22, 0.36, 12, 2.4);
          ring.rotateX(Math.PI * 0.5);
          ring.translate(0, 0, rz);
          tubeParts.push({ g: ring, target: mintGeoms });
          if (item.glowRgb) {
            const gCollar = new THREE.BoxGeometry(r * 0.9, 0.12, 0.18);
            gCollar.translate(0, r - wallT * 0.7, rz);
            if (slopeAngle) gCollar.rotateX(-slopeAngle);
            if (alongX) gCollar.rotateY(Math.PI * 0.5);
            gCollar.translate(item.x, cy, item.z);
            glowGeoms.push(tagGeomColor(gCollar, item.glowRgb));
          }
        }
        for (const tp of tubeParts) {
          if (slopeAngle) tp.g.rotateX(-slopeAngle);
          if (alongX) tp.g.rotateY(Math.PI * 0.5);
          if (item.rotY) tp.g.rotateY(item.rotY);
          tp.g.translate(item.x, cy, item.z);
          tp.target.push(tp.g);
        }
      } else if (item.kind === 'spiral_slide') {
        const rad = item.radius || 7.5;
        const turns = item.turns || 1.35;
        const yTop = item.yTop ?? 5.6;
        const yBot = item.yBot ?? 0.05;
        const width = item.width || 2.8;
        const dir = item.ccw ? -1 : 1;
        const angStart = item.angStart ?? 0;
        const segN = Math.max(24, Math.min(44, Math.round(turns * 24)));
        const totAng = turns * Math.PI * 2 * dir;
        const totalDrop = yTop - yBot;
        const chordLen = (Math.abs(totAng) * rad) / segN + 0.28;
        const segDrop = totalDrop / segN;
        const pitch = Math.atan2(-segDrop, (Math.abs(totAng) * rad) / segN);
        for (let si = 0; si < segN; si++) {
          const t0 = (si + 0.5) / segN;
          const a = angStart + t0 * totAng;
          const y = yTop - t0 * totalDrop;
          const px = item.cx + Math.cos(a) * rad;
          const pz = item.cz + Math.sin(a) * rad;
          const tangentYaw = -a + (dir > 0 ? 0 : Math.PI);

          const bed = makeTiledBox(width, 0.28, chordLen, 2.4);
          bed.rotateX(-pitch);
          bed.rotateY(tangentYaw);
          bed.translate(px, y - 0.14, pz);
          mintGeoms.push(bed);

          for (const side of [-1, 1]) {
            const curb = makeTiledBox(0.26, 0.62, chordLen, 2.4);
            curb.translate(side * (width * 0.5 - 0.13), 0.24, 0);
            curb.rotateX(-pitch);
            curb.rotateY(tangentYaw);
            curb.translate(px, y, pz);
            wallGeoms.push(curb);
          }

          if (si % 6 === 3) {
            const colH = Math.max(0.8, y + 1.6);
            const col = makeTiledCyl(0.36, 0.42, colH, 8, 2.4);
            col.translate(px, y - colH * 0.5 - 0.18, pz);
            wallGeoms.push(col);
          }
        }
      } else if (item.kind === 'glass_wall') {
        const dx = Math.max(0.18, Math.abs(item.x1 - item.x0));
        const dz = Math.max(0.18, Math.abs(item.z1 - item.z0));
        const y0 = item.y0 ?? 0;
        const y1 = item.y1 ?? 3.8;
        const gh = Math.max(0.5, y1 - y0);
        const cx = (item.x0 + item.x1) * 0.5;
        const cz = (item.z0 + item.z1) * 0.5;
        const pane = new THREE.BoxGeometry(dx, gh, dz);
        pane.translate(cx, y0 + gh * 0.5, cz);
        glassGeoms.push(pane);
        // Top & bottom ceramic framing sills
        const alongX = dx >= dz;
        const mullW = alongX ? dx + 0.2 : 0.24;
        const mullD = alongX ? 0.24 : dz + 0.2;
        const sillBot = makeTiledBox(mullW, 0.26, mullD, 2.4);
        sillBot.translate(cx, y0 + 0.13, cz);
        const sillTop = makeTiledBox(mullW, 0.26, mullD, 2.4);
        sillTop.translate(cx, y1 - 0.13, cz);
        wallGeoms.push(sillBot, sillTop);
      } else if (item.kind === 'light_shaft') {
        const w = item.w || 3.4;
        const h = item.h || 7.2;
        const rgb = item.rgb || [0.90, 0.98, 1.0];
        for (const rY of [0, Math.PI * 0.5]) {
          const p = new THREE.PlaneGeometry(w, h, 1, 2);
          const pos = p.attributes.position;
          const cols = new Float32Array(pos.count * 3);
          for (let vi = 0; vi < pos.count; vi++) {
            const ny = Math.max(0, Math.min(1, (pos.getY(vi) + h * 0.5) / Math.max(0.01, h)));
            const k = Math.pow(ny, 1.35);
            cols[vi * 3] = rgb[0] * k;
            cols[vi * 3 + 1] = rgb[1] * k;
            cols[vi * 3 + 2] = rgb[2] * k;
          }
          p.setAttribute('color', new THREE.BufferAttribute(cols, 3));
          p.rotateY(rY);
          if (item.rotX) p.rotateX(item.rotX);
          if (item.rotZ) p.rotateZ(item.rotZ);
          p.translate(item.x, item.y ?? (h * 0.5), item.z);
          lightShaftGeoms.push(p);
        }
      }
    }
  }

  const mergedW = reg(disposables, mergeList(wallGeoms));
  const mergedTubes=reg(disposables,mergeList(tubeGeoms));
  if(mergedTubes){applyPoolroomsIndirectBounce(mergedTubes,map,false);const mesh=new THREE.Mesh(mergedTubes,reg(disposables,createTubeMaterial(mats.wallMat)));mesh.name='continuous-ceramic-tunnel-shells';root.add(mesh);}
  if (mergedW) {
    if (isPoolrooms) applyPoolroomsIndirectBounce(mergedW, map, false);
    root.add(new THREE.Mesh(mergedW, mats.wallMat));
  }

  // 4. Platforms, Stepped Ceramic Staircases, Pool Beds & Water Chutes
  {
    const platGeoms = [];
    const platTileSz = isPoolrooms ? 2.4 : 5.0;
    for (const p of (map.PLATFORMS || [])) {
      if (!p.draw) continue;
      const dx = Math.max(0.5, p.x1 - p.x0);
      const dz = Math.max(0.5, p.z1 - p.z0);
      const pBot = p.yBase != null ? Math.min(p.y - 0.36, p.yBase) : (p.y - 0.36);
      const pH = Math.max(0.36, p.y - pBot);
      const g = makeTiledBox(dx, pH, dz, platTileSz);
      g.translate((p.x0 + p.x1) * 0.5, pBot + pH * 0.5, (p.z0 + p.z1) * 0.5);
      platGeoms.push(g);
    }
    if (isPoolrooms && map.WATER_RECTS?.length) {
      for (const w of map.WATER_RECTS) {
        const dx = Math.max(1, w.x1 - w.x0);
        const dz = Math.max(1, w.z1 - w.z0);
        const bedY = w.bedY ?? -0.95;
        if(w.shape==='tube')continue; // The curved shell owns the submerged bed.
        const g = w.shape==='ellipse' ? createPoolArtGeometry({...w,kind:'basin_bed'},THREE) : makeTiledBox(dx, 0.34, dz, 2.4);
        if(w.shape!=='ellipse')g.translate((w.x0 + w.x1) * 0.5, bedY - 0.17, (w.z0 + w.z1) * 0.5);
        if(w.shape==='ellipse'){const p=g.attributes.position,n=g.attributes.normal,u=g.attributes.uv;for(let i=0;i<u.count;i++)u.setXY(i,(Math.abs(n.getX(i))>.7?p.getZ(i):p.getX(i))/2.4,(Math.abs(n.getY(i))>.7?p.getZ(i):p.getY(i))/2.4);}
        bedGeoms.push(g);
        // Subtle mint ceramic pool coping trim if basin is bordered cleanly
        if (!w.noCoping && dx >= 6 && dz >= 6) {
          const rimY = (w.waterY ?? -0.18) + 0.15;
          const rimH = 0.08;
          const rimT = 0.30;
          const nR = makeTiledBox(dx + rimT * 2, rimH, rimT, 2.4); nR.translate((w.x0 + w.x1) * 0.5, rimY, w.z0 - rimT * 0.5); mintGeoms.push(nR);
          const sR = makeTiledBox(dx + rimT * 2, rimH, rimT, 2.4); sR.translate((w.x0 + w.x1) * 0.5, rimY, w.z1 + rimT * 0.5); mintGeoms.push(sR);
          const wR = makeTiledBox(rimT, rimH, dz, 2.4); wR.translate(w.x0 - rimT * 0.5, rimY, (w.z0 + w.z1) * 0.5); mintGeoms.push(wR);
          const eR = makeTiledBox(rimT, rimH, dz, 2.4); eR.translate(w.x1 + rimT * 0.5, rimY, (w.z0 + w.z1) * 0.5); mintGeoms.push(eR);
        }
      }
    }
    for (const r of (map.RAMPS || [])) {
      if (!r.draw) continue;
      const dx = Math.max(0.5, r.x1 - r.x0);
      const dz = Math.max(0.5, r.z1 - r.z0);
      const rise = r.y1 - r.y0;
      const run = r.axis === 'x' ? dx : dz;
      if (isPoolrooms) {
        const steps = Math.max(4, Math.min(18, Math.round(Math.max(Math.abs(rise) / 0.17, run / 0.85))));
        const minY = Math.min(r.y0, r.y1) - 0.22;
        const stepSpan = run / steps;
        for (let si = 0; si < steps; si++) {
          const t = (si + 0.5) / steps;
          const stepY = r.y0 + rise * t;
          const stepH = Math.max(0.24, stepY - minY);
          const sw = r.axis === 'x' ? stepSpan + 0.04 : dx;
          const sd = r.axis === 'x' ? dz : stepSpan + 0.04;
          const sg = makeTiledBox(sw, stepH, sd, 2.4);
          const sx = r.axis === 'x' ? r.x0 + stepSpan * (si + 0.5) : (r.x0 + r.x1) * 0.5;
          const sz = r.axis === 'x' ? (r.z0 + r.z1) * 0.5 : r.z0 + stepSpan * (si + 0.5);
          sg.translate(sx, minY + stepH * 0.5, sz);
          if (stepY <= 0.04) mintGeoms.push(sg);
          else platGeoms.push(sg);
        }
      } else {
        const len = Math.hypot(run, rise);
        const g = new THREE.BoxGeometry(r.axis === 'x' ? len : dx, 0.34, r.axis === 'x' ? dz : len);
        const ang = Math.atan2(rise, run);
        if (r.axis === 'x') g.rotateZ(ang);
        else g.rotateX(-ang);
        g.translate((r.x0 + r.x1) * 0.5, (r.y0 + r.y1) * 0.5 - 0.17, (r.z0 + r.z1) * 0.5);
        platGeoms.push(g);
      }
    }
    const mergedP = reg(disposables, mergeList(platGeoms));
    if (mergedP) {
      if (isPoolrooms) applyPoolroomsIndirectBounce(mergedP, map, false);
      const pMat = isPoolrooms
        ? mats.wallMat
        : reg(disposables, new THREE.MeshStandardMaterial({
            color: cfg.archetype === 'field' ? 0x735c3d : cfg.archetype === 'ocean' ? 0x6b503a : cfg.archetype === 'sunset_beach' ? 0xd4b97e : (cfg.palette?.trim ?? 0xaaaaaa),
            roughness: 0.72
          }));
      root.add(new THREE.Mesh(mergedP, pMat));
    }
    if (isPoolrooms) {
      const mergedMint = reg(disposables, mergeList(mintGeoms));
      if (mergedMint) {
        applyPoolroomsIndirectBounce(mergedMint, map, false);
        root.add(new THREE.Mesh(mergedMint, mats.mintTileMat || mats.wallMat));
      }
      const mergedBed = reg(disposables, mergeList(bedGeoms));
      if (mergedBed) {
        applyPoolroomsIndirectBounce(mergedBed, map, true);
        root.add(new THREE.Mesh(mergedBed, mats.submergedTileMat || mats.wallMat));
      }
      const mergedCeilV = reg(disposables, mergeList(ceilVaultGeoms));
      if (mergedCeilV) {
        applyPoolroomsIndirectBounce(mergedCeilV, map, false);
        root.add(new THREE.Mesh(mergedCeilV, mats.ceilMat));
      }
      const mergedGlow = reg(disposables, mergeList(glowGeoms));
      if (mergedGlow) {
        root.add(new THREE.Mesh(mergedGlow, reg(disposables, new THREE.MeshBasicMaterial({ vertexColors: true }))));
      }
      const mergedGlass = reg(disposables, mergeList(glassGeoms));
      if (mergedGlass) {
        root.add(new THREE.Mesh(mergedGlass, reg(disposables, new THREE.MeshStandardMaterial({
          color: 0xbaf2f4,
          transparent: true,
          opacity: 0.30,
          roughness: 0.14,
          metalness: 0.12,
          depthWrite: false,
          side: THREE.DoubleSide
        }))));
      }
      const mergedShaft = reg(disposables, mergeList(lightShaftGeoms));
      if (mergedShaft) {
        root.add(new THREE.Mesh(mergedShaft, reg(disposables, new THREE.MeshBasicMaterial({
          vertexColors: true,
          transparent: true,
          opacity: 0.10,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          side: THREE.DoubleSide
        }))));
      }
    }

    // Water Slides (Poolrooms: minimalist cream-and-mint ceramic water chutes; other levels: colorful chute)
    if (map.SLIDES?.length) {
      const slideGeoms = [];
      const railGeoms = [];
      for (const s of map.SLIDES) {
        if(s.render===false)continue;
        const dx = Math.max(0.8, s.x1 - s.x0);
        const dz = Math.max(0.8, s.z1 - s.z0);
        const rise = s.y1 - s.y0;
        const run = s.axis === 'x' ? dx : dz;
        const len = Math.hypot(run, rise);
        const ang = Math.atan2(rise, run);
        const chute = isPoolrooms
          ? makeTiledBox(s.axis === 'x' ? len : dx, 0.28, s.axis === 'x' ? dz : len, 2.4)
          : new THREE.BoxGeometry(s.axis === 'x' ? len : dx, 0.24, s.axis === 'x' ? dz : len);
        if (s.axis === 'x') chute.rotateZ(ang);
        else chute.rotateX(-ang);
        chute.translate((s.x0 + s.x1) * 0.5, (s.y0 + s.y1) * 0.5 - 0.14, (s.z0 + s.z1) * 0.5);
        slideGeoms.push(chute);

        for (const side of [-1, 1]) {
          const rw = isPoolrooms ? 0.24 : 0.18;
          const rh = isPoolrooms ? 0.46 : 0.55;
          const rail = isPoolrooms
            ? makeTiledBox(s.axis === 'x' ? len : rw, rh, s.axis === 'x' ? rw : len, 2.4)
            : new THREE.BoxGeometry(s.axis === 'x' ? len : rw, rh, s.axis === 'x' ? rw : len);
          if (s.axis === 'x') rail.rotateZ(ang);
          else rail.rotateX(-ang);
          rail.translate(
            (s.x0 + s.x1) * 0.5 + (s.axis === 'x' ? 0 : side * (dx * 0.5 - rw * 0.5)),
            (s.y0 + s.y1) * 0.5 + 0.18,
            (s.z0 + s.z1) * 0.5 + (s.axis === 'x' ? side * (dz * 0.5 - rw * 0.5) : 0)
          );
          railGeoms.push(rail);
        }
        if (isPoolrooms) {
          for (const t of [0.22, 0.78]) {
            const sx = s.x0 + dx * (s.axis === 'x' ? t : 0.5);
            const sz = s.z0 + dz * (s.axis === 'x' ? 0.5 : t);
            const sy = s.y0 + rise * t - 0.28;
            const supH = Math.max(0.6, sy + 1.4);
            const sup = makeTiledBox(0.8, supH, 0.8, 2.4);
            sup.translate(sx, sy - supH * 0.5, sz);
            railGeoms.push(sup);
          }
        }
      }
      const slideMat = isPoolrooms
        ? (mats.mintTileMat || mats.wallMat)
        : reg(disposables, new THREE.MeshStandardMaterial({ color: 0x3ad8ee, roughness: 0.16, metalness: 0.12 }));
      const railMat = isPoolrooms
        ? mats.wallMat
        : reg(disposables, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.25 }));
      const mS = reg(disposables, mergeList(slideGeoms));
      const mR = reg(disposables, mergeList(railGeoms));
      if (mS) {
        if (isPoolrooms) applyPoolroomsIndirectBounce(mS, map, false);
        root.add(new THREE.Mesh(mS, slideMat));
      }
      if (mR) {
        if (isPoolrooms) applyPoolroomsIndirectBounce(mR, map, false);
        root.add(new THREE.Mesh(mR, railMat));
      }
    }
  }

  // 5. Shimmering Water Basins (Custom GLSL Shader for Poolrooms, standard for Beach/Ocean)
  let poolWaterMat = null;
  if (map.WATER_RECTS?.length && mats.waterMat) {
    if (cfg.archetype === 'poolrooms') {
      const wGeoms = [];
      for (const w of map.WATER_RECTS) {
        const dx = Math.max(1, w.x1 - w.x0);
        const dz = Math.max(1, w.z1 - w.z0);
        const segX = Math.min(18, Math.max(4, Math.ceil(dx / 6.0)));
        const segZ = Math.min(18, Math.max(4, Math.ceil(dz / 6.0)));
        if(w.shape==='tube'){const g=createTubeWater(w,THREE,map);g.setAttribute('aZoneTemp',new THREE.BufferAttribute(new Float32Array(g.attributes.position.count).fill(w.temp??0.25),1));wGeoms.push(g);continue;}
        const raw = w.shape==='ellipse' ? new THREE.CircleGeometry(1,80).scale(w.rx,w.rz,1) : new THREE.PlaneGeometry(dx, dz, segX, segZ);
        const g = raw.toNonIndexed();
        raw.dispose();
        g.rotateX(-Math.PI * 0.5);
        g.translate((w.x0 + w.x1) * 0.5, w.waterY ?? -0.18, (w.z0 + w.z1) * 0.5);
        const vCount = g.attributes.position.count;
        const depthArr = new Float32Array(vCount).fill(Math.max(0.18, (w.waterY ?? -0.18) - (w.bedY ?? -0.95)));
        const tempArr = new Float32Array(vCount).fill(w.temp ?? 0.25);
        g.setAttribute('aBedDepth', new THREE.BufferAttribute(depthArr, 1));
        g.setAttribute('aZoneTemp', new THREE.BufferAttribute(tempArr, 1));
        wGeoms.push(g);
      }
      // Thin water film inside straight & spiral ceramic slides
      for (const s of (map.SLIDES || [])) {
        const dx = Math.max(0.8, s.x1 - s.x0);
        const dz = Math.max(0.8, s.z1 - s.z0);
        const rise = s.y1 - s.y0;
        const run = s.axis === 'x' ? dx : dz;
        const len = Math.hypot(run, rise);
        const ang = Math.atan2(rise, run);
        const raw = new THREE.PlaneGeometry(s.axis === 'x' ? len : Math.max(0.4, dx - 0.52), s.axis === 'x' ? Math.max(0.4, dz - 0.52) : len, 4, 4);
        const sg = raw.toNonIndexed();
        raw.dispose();
        sg.rotateX(-Math.PI * 0.5);
        if (s.axis === 'x') sg.rotateZ(ang);
        else sg.rotateX(-ang);
        sg.translate((s.x0 + s.x1) * 0.5, (s.y0 + s.y1) * 0.5 + 0.03, (s.z0 + s.z1) * 0.5);
        const vc = sg.attributes.position.count;
        sg.setAttribute('aBedDepth', new THREE.BufferAttribute(new Float32Array(vc).fill(0.16), 1));
        sg.setAttribute('aZoneTemp', new THREE.BufferAttribute(new Float32Array(vc).fill(0.10), 1));
        wGeoms.push(sg);
      }
      for (const item of (map.POOL_ARCH || [])) {
        if (item.kind !== 'spiral_slide') continue;
        const rad = item.radius || 7.5;
        const turns = item.turns || 1.35;
        const yTop = item.yTop ?? 5.6;
        const yBot = item.yBot ?? 0.05;
        const width = Math.max(0.6, (item.width || 2.8) - 0.56);
        const dir = item.ccw ? -1 : 1;
        const angStart = item.angStart ?? 0;
        const segN = item.waterSegments || Math.max(20, Math.round(turns * 20));
        const totAng = turns * Math.PI * 2 * dir;
        const totalDrop = yTop - yBot;
        const chordLen = (Math.abs(totAng) * rad) / segN + 0.24;
        const pitch = Math.atan2(-totalDrop / segN, (Math.abs(totAng) * rad) / segN);
        for (let si = 0; si < segN; si++) {
          const t0 = (si + 0.5) / segN;
          const a = angStart + t0 * totAng;
          const y = yTop - t0 * totalDrop + 0.03;
          const px = item.cx + Math.cos(a) * rad;
          const pz = item.cz + Math.sin(a) * rad;
          const raw = new THREE.PlaneGeometry(width, chordLen, 1, 1);
          const sg = raw.toNonIndexed();
          raw.dispose();
          sg.rotateX(-Math.PI * 0.5 - pitch);
          sg.rotateY(-a + (dir > 0 ? 0 : Math.PI));
          sg.translate(px, y, pz);
          const vc = sg.attributes.position.count;
          sg.setAttribute('aBedDepth', new THREE.BufferAttribute(new Float32Array(vc).fill(0.16), 1));
          sg.setAttribute('aZoneTemp', new THREE.BufferAttribute(new Float32Array(vc).fill(0.18), 1));
          wGeoms.push(sg);
        }
      }
      const mW = reg(disposables, mergeList(wGeoms));
      if (mW) {
        poolWaterMat = reg(disposables, new THREE.ShaderMaterial({
          transparent: true,
          depthWrite: false,
          side: THREE.DoubleSide,
          uniforms: {
            uTime: { value: 0 },
            uPlayerPos: { value: new THREE.Vector3(map.SPAWN?.x ?? 54, 0, map.SPAWN?.z ?? 54) },
            uEntityPos: { value: new THREE.Vector3(-999, 0, -999) },
            uFogColor: { value: new THREE.Color(cfg.fogColor) },
            uFogDensity: { value: cfg.fogDensity }
          },
          vertexShader: `
            attribute float aBedDepth;
            attribute float aZoneTemp;
            uniform float uTime;
            uniform vec3 uPlayerPos;
            uniform vec3 uEntityPos;
            varying vec3 vWorldPos;
            varying float vBedDepth;
            varying float vZoneTemp;
            varying float vWaveH;
            varying float vRipple;
            void main() {
              vec3 pos = position;
              vec4 wp = modelMatrix * vec4(pos, 1.0);
              float w1 = sin(wp.x * 0.48 + uTime * 1.25) * cos(wp.z * 0.42 - uTime * 1.05);
              float w2 = sin((wp.x + wp.z) * 0.78 - uTime * 1.75) * 0.5;
              float dP = distance(wp.xz, uPlayerPos.xz);
              float ripP = sin(dP * 3.8 - uTime * 7.2) * exp(-dP * 0.24) * 0.035;
              float dE = distance(wp.xz, uEntityPos.xz);
              float ripE = sin(dE * 3.1 - uTime * 6.0) * exp(-dE * 0.16) * 0.045;
              float disp = (w1 * 0.012 + w2 * 0.008) + ripP + ripE;
              pos.y += disp;
              wp.y += disp;
              vWorldPos = wp.xyz;
              vBedDepth = aBedDepth;
              vZoneTemp = aZoneTemp;
              vWaveH = disp;
              vRipple = abs(ripP) + abs(ripE);
              gl_Position = projectionMatrix * viewMatrix * wp;
            }
          `,
          fragmentShader: `
            uniform float uTime;
            uniform vec3 uFogColor;
            uniform float uFogDensity;
            varying vec3 vWorldPos;
            varying float vBedDepth;
            varying float vZoneTemp;
            varying float vWaveH;
            varying float vRipple;
            void main() {
              vec2 uv = vWorldPos.xz;
              float dist = length(cameraPosition - vWorldPos);
              float rippleAtten = 1.0 - smoothstep(10.0, 48.0, dist);
              // Calm indoor pool micro-ripples attenuated over distance to prevent subpixel specular shimmer
              float nx = (cos(uv.x * 1.15 + uTime * 1.3) * 0.045 + cos((uv.x - uv.y) * 1.9 - uTime * 1.7) * 0.030) * mix(0.32, 1.0, rippleAtten);
              float nz = (sin(uv.y * 1.05 - uTime * 1.15) * 0.045 + sin((uv.x + uv.y) * 1.75 + uTime * 1.5) * 0.030) * mix(0.32, 1.0, rippleAtten);
              vec3 N = normalize(vec3(nx, 1.0, nz));
              vec3 V = normalize(cameraPosition - vWorldPos);
              float NdotV = max(dot(N, V), 0.0);
              float fresnel = pow(1.0 - NdotV, 4.2) * 0.16;

              // View-refracted floor coordinates with fwidth() screen-space derivative antialiasing on submerged mosaic
              vec2 refUV = uv - (V.xz / max(abs(V.y), 0.24)) * clamp(vBedDepth * 0.28, 0.06, 0.52) + N.xz * 0.12;
              vec2 tileCoord = refUV / 0.15;
              vec2 fTile = fract(tileCoord);
              vec2 tileFw = clamp(fwidth(tileCoord), vec2(0.015), vec2(0.45));
              vec2 idTile = floor(tileCoord);
              float tileRnd = fract(sin(dot(idTile, vec2(12.9898, 78.233))) * 43758.5453);
              float groutX = smoothstep(0.08 - tileFw.x, 0.13 + tileFw.x, fTile.x) * (1.0 - smoothstep(0.87 - tileFw.x, 0.92 + tileFw.x, fTile.x));
              float groutZ = smoothstep(0.08 - tileFw.y, 0.13 + tileFw.y, fTile.y) * (1.0 - smoothstep(0.87 - tileFw.y, 0.92 + tileFw.y, fTile.y));
              float tileMask = mix(groutX * groutZ, 0.86, smoothstep(0.26, 0.68, max(tileFw.x, tileFw.y)));
              float subTileVis = exp(-max(0.0, vBedDepth - 0.15) * 0.62) * (1.0 - smoothstep(0.32, 0.78, max(tileFw.x, tileFw.y)));

              float c1 = sin(refUV.x * 2.35 + uTime * 1.35 + sin(refUV.y * 1.75 - uTime * 0.95));
              float c2 = cos(refUV.y * 2.25 - uTime * 1.25 + cos(refUV.x * 1.85 + uTime * 1.15));
              float c3 = sin((refUV.x - refUV.y) * 3.1 - uTime * 1.65);
              float caustics = pow(max(0.0, (c1 * c2 * 0.7 + c3 * 0.3) * 0.5 + 0.5), 2.4) * mix(0.45, 1.0, rippleAtten);

              // Reference vibrant mint -> turquoise -> cyan -> deep aquatic teal gradient
              float depthT = clamp((vBedDepth - 0.28) / 2.1, 0.0, 1.0);
              vec3 shallowMint = vec3(0.360, 0.580, 0.500);
              vec3 clearTurq = vec3(0.180, 0.500, 0.440);
              vec3 aquaticCyan = vec3(0.100, 0.380, 0.370);
              vec3 mediumTeal = vec3(0.060, 0.280, 0.310);
              vec3 deepTeal = vec3(0.030, 0.140, 0.180);

              vec3 waterBody = mix(shallowMint, clearTurq, smoothstep(0.0, 0.35, depthT));
              waterBody = mix(waterBody, aquaticCyan, smoothstep(0.25, 0.62, depthT));
              waterBody = mix(waterBody, mix(mediumTeal, deepTeal, vZoneTemp), smoothstep(0.55, 1.0, depthT));

              vec3 bedTileCol = mix(waterBody * 0.97, waterBody * (1.0 + tileRnd * 0.02), tileMask);
              vec3 col = mix(waterBody, bedTileCol, subTileVis * 0.82);
              col += vec3(0.58, 0.96, 0.92) * caustics * mix(0.12, 0.05, depthT);

              // Restrained distance-filtered specular glint & soft mint-ivory ceiling reflection (never opaque grey/white)
              vec3 L = normalize(vec3(0.35, 0.90, 0.25));
              vec3 H = normalize(L + V);
              float specExp = mix(56.0, 16.0, smoothstep(8.0, 44.0, dist));
              float spec = pow(max(dot(N, H), 0.0), specExp) * 0.16 * mix(0.55, 1.0, rippleAtten);
              vec3 reflCol = mix(vec3(0.48, 0.88, 0.86), vec3(0.84, 0.93, 0.89), (1.0 - vZoneTemp) * 0.48);
              col = mix(col, reflCol, clamp(fresnel, 0.0, 0.20));
              col += vec3(0.82, 0.97, 0.95) * (spec + min(0.18, vRipple * 3.4));

              // Seamless exponential squared fog matching THREE.FogExp2
              float fogF = 1.0 - exp(-uFogDensity * uFogDensity * dist * dist);
              col = mix(col, uFogColor, clamp(fogF, 0.0, 1.0));

              float alpha = mix(0.54, 0.85, clamp(depthT * 0.65 + fresnel * 0.35, 0.0, 1.0));
              gl_FragColor = vec4(col, alpha);
            }
          `
        }));
        const waterMesh = new THREE.Mesh(mW, poolWaterMat);
        root.add(waterMesh);
        waterMeshes.push(waterMesh);
      }
    } else {
      const wGeoms = [];
      for (const w of map.WATER_RECTS) {
        const dx = Math.max(1, w.x1 - w.x0);
        const dz = Math.max(1, w.z1 - w.z0);
        const g = new THREE.PlaneGeometry(dx, dz);
        g.rotateX(-Math.PI * 0.5);
        g.translate((w.x0 + w.x1) * 0.5, w.waterY ?? 0, (w.z0 + w.z1) * 0.5);
        wGeoms.push(g);
      }
      const mW = reg(disposables, mergeList(wGeoms));
      if (mW) {
        const waterMesh = new THREE.Mesh(mW, mats.waterMat);
        root.add(waterMesh);
        waterMeshes.push(waterMesh);
      }
    }
  }

  // 6. Repeating Houses (Suburbs, Field Barns, Level 94 Cartoon Town, Flooded House, Beach Cabanas)
  if (map.HOUSES?.length) {
    const hWalls = [];
    const hRoofs = [];
    for (const hs of map.HOUSES) {
      const wt = 0.34, dW = hs.doorW || 2.4;
      const x0 = hs.cx - hs.w * 0.5, x1 = hs.cx + hs.w * 0.5;
      const z0 = hs.cz - hs.d * 0.5, z1 = hs.cz + hs.d * 0.5;
      const by = hs.baseY || 0;
      const pushSeg = (ax0, az0, ax1, az1) => {
        const dx = ax1 - ax0, dz = az1 - az0;
        if (dx < 0.08 || dz < 0.08) return;
        const g = makeTiledBox(dx, hs.h, dz, 3.2);
        g.translate((ax0 + ax1) * 0.5, by + hs.h * 0.5, (az0 + az1) * 0.5);
        hWalls.push(g);
      };
      if (hs.doorSide === 'south') { pushSeg(x0, z1 - wt, hs.cx - dW * 0.5, z1); pushSeg(hs.cx + dW * 0.5, z1 - wt, x1, z1); } else pushSeg(x0, z1 - wt, x1, z1);
      if (hs.doorSide === 'north') { pushSeg(x0, z0, hs.cx - dW * 0.5, z0 + wt); pushSeg(hs.cx + dW * 0.5, z0, x1, z0 + wt); } else pushSeg(x0, z0, x1, z0 + wt);
      if (hs.doorSide === 'west') { pushSeg(x0, z0, x0 + wt, hs.cz - dW * 0.5); pushSeg(x0, hs.cz + dW * 0.5, x0 + wt, z1); } else pushSeg(x0, z0, x0 + wt, z1);
      if (hs.doorSide === 'east') { pushSeg(x1 - wt, z0, x1, hs.cz - dW * 0.5); pushSeg(x1 - wt, hs.cz + dW * 0.5, x1, z1); } else pushSeg(x1 - wt, z0, x1, z1);

      // Pitched Roof overhang
      const roof = new THREE.ConeGeometry(Math.max(hs.w, hs.d) * 0.74, hs.h * 0.65, 4);
      roof.rotateY(Math.PI * 0.25);
      roof.translate(hs.cx, by + hs.h + hs.h * 0.32, hs.cz);
      hRoofs.push(roof);
    }
    const mHW = reg(disposables, mergeList(hWalls));
    const mHR = reg(disposables, mergeList(hRoofs));
    if (mHW) root.add(new THREE.Mesh(mHW, reg(disposables, new THREE.MeshStandardMaterial({ color: cfg.palette?.wall ?? 0xb8b2a6, roughness: 0.85 }))));
    if (mHR) root.add(new THREE.Mesh(mHR, reg(disposables, new THREE.MeshStandardMaterial({ color: cfg.archetype === 'motion_town' ? 0xd94848 : 0x3d2b24, roughness: 0.8 }))));
  }

  // 7. Urban Towers & Brutalist Skyscrapers / Window Walls
  if (map.TOWERS?.length) {
    const tGeoms = [];
    for (const t of map.TOWERS) {
      const g = makeTiledBox(t.w, t.h, t.d, 8.0);
      g.translate(t.x, (t.baseY || 0) + t.h * 0.5, t.z);
      tGeoms.push(g);
    }
    const mT = reg(disposables, mergeList(tGeoms));
    if (mT) root.add(new THREE.Mesh(mT, mats.wallMat));
  }

  // 8. Rich Household Furniture (Instanced/Merged Sofas, Beds, CRT TVs, Fridges, Tables, Cabinets)
  if (map.FURNITURE?.length) {
    const fWood = [], fCloth = [], fGlow = [];
    for (const f of map.FURNITURE) {
      const addPart = (list, w, h, d, oy) => {
        const g = new THREE.BoxGeometry(w, h, d);
        g.rotateY(f.rot || 0);
        g.translate(f.x, (f.y || 0) + oy, f.z);
        list.push(g);
      };
      if (f.kind === 'sofa') {
        addPart(fCloth, 2.1, 0.45, 0.9, 0.22);
        addPart(fCloth, 2.1, 0.5, 0.24, 0.65);
      } else if (f.kind === 'bed') {
        addPart(fWood, 1.85, 0.34, 2.25, 0.17);
        addPart(fCloth, 1.72, 0.22, 2.1, 0.42);
      } else if (f.kind === 'table' || f.kind === 'desk') {
        addPart(fWood, 1.6, 0.08, 0.95, 0.76);
        addPart(fWood, 1.35, 0.72, 0.75, 0.36);
      } else if (f.kind === 'tv_stand') {
        addPart(fWood, 1.3, 0.55, 0.6, 0.28);
        addPart(fGlow, 0.7, 0.52, 0.52, 0.82);
      } else if (f.kind === 'fridge') {
        addPart(fCloth, 0.88, 1.95, 0.85, 0.98);
      } else {
        addPart(fWood, 1.2, 1.7, 0.55, 0.85);
      }
    }
    const mW = reg(disposables, mergeList(fWood));
    const mC = reg(disposables, mergeList(fCloth));
    const mG = reg(disposables, mergeList(fGlow));
    if (mW) root.add(new THREE.Mesh(mW, reg(disposables, new THREE.MeshStandardMaterial({ color: 0x6b4b32, roughness: 0.78 }))));
    if (mC) root.add(new THREE.Mesh(mC, reg(disposables, new THREE.MeshStandardMaterial({ color: cfg.archetype === 'kitty_house' ? 0xf5a6c8 : 0x8b95a2, roughness: 0.85 }))));
    if (mG) root.add(new THREE.Mesh(mG, reg(disposables, new THREE.MeshStandardMaterial({ color: 0x2a3542, emissive: 0x4ca6d8, emissiveIntensity: 0.38 }))));
  }

  // 9. Foliage (Trees: Oak, Pine, Palm, Birch) + Wheat Fields + Repeating Pipes + Decorative Blocks
  if (map.TREES?.length) {
    const tTrunk = new THREE.CylinderGeometry(0.28, 0.42, 1, 7);
    const tTop = cfg.archetype === 'suburbs' ? new THREE.ConeGeometry(2.1, 2.2, 7) : new THREE.DodecahedronGeometry(1.85, 0);
    const trunkMat = reg(disposables, new THREE.MeshStandardMaterial({
      color: cfg.archetype === 'crimson_forest' ? 0xe8e4df : 0x523b28,
      roughness: 0.92
    }));
    const leafMat = reg(disposables, new THREE.MeshStandardMaterial({
      color: cfg.archetype === 'crimson_forest' ? 0xa81c36 : cfg.archetype === 'sunset_beach' ? 0x3b7d3e : 0x3a632e,
      roughness: 0.88
    }));
    const trunkInst = new THREE.InstancedMesh(reg(disposables, tTrunk), trunkMat, map.TREES.length);
    const leafInst = new THREE.InstancedMesh(reg(disposables, tTop), leafMat, map.TREES.length);
    const dummy = new THREE.Object3D();
    map.TREES.forEach((tr, i) => {
      dummy.position.set(tr.x, tr.h * 0.38, tr.z);
      dummy.scale.set(1, tr.h * 0.76, 1);
      dummy.rotation.y = (i * 0.7) % 6.28;
      dummy.updateMatrix();
      trunkInst.setMatrixAt(i, dummy.matrix);

      dummy.position.set(tr.x, tr.h * 0.84, tr.z);
      dummy.scale.set(tr.kind === 'palm' ? 1.4 : 1.15, tr.kind === 'palm' ? 0.55 : 1.35, tr.kind === 'palm' ? 1.4 : 1.15);
      dummy.updateMatrix();
      leafInst.setMatrixAt(i, dummy.matrix);
    });
    trunkInst.instanceMatrix.needsUpdate = true;
    leafInst.instanceMatrix.needsUpdate = true;
    root.add(trunkInst, leafInst);
  }

  if (map.WHEAT?.length) {
    const wGeo = reg(disposables, new THREE.ConeGeometry(0.85, 1.55, 5));
    const wMat = reg(disposables, new THREE.MeshStandardMaterial({ color: 0xd9ad4a, roughness: 0.92 }));
    const wInst = new THREE.InstancedMesh(wGeo, wMat, map.WHEAT.length);
    const dummy = new THREE.Object3D();
    map.WHEAT.forEach((w, i) => {
      dummy.position.set(w.x, 0.75 * w.scale, w.z);
      dummy.scale.set(w.scale, w.scale, w.scale);
      dummy.rotation.y = (i * 1.1) % 6.28;
      dummy.updateMatrix();
      wInst.setMatrixAt(i, dummy.matrix);
    });
    wInst.instanceMatrix.needsUpdate = true;
    root.add(wInst);
  }

  if (map.PIPES?.length) {
    const pGeo = reg(disposables, new THREE.CylinderGeometry(0.16, 0.16, 1, 8));
    pGeo.rotateZ(Math.PI * 0.5);
    const pMat = reg(disposables, new THREE.MeshStandardMaterial({ color: 0x9c623a, roughness: 0.42, metalness: 0.65 }));
    const pInst = new THREE.InstancedMesh(pGeo, pMat, map.PIPES.length);
    const dummy = new THREE.Object3D();
    map.PIPES.forEach((p, i) => {
      dummy.position.set(p.x + p.len * 0.5, p.y, p.z);
      dummy.scale.set(p.len, 1, 1);
      dummy.updateMatrix();
      pInst.setMatrixAt(i, dummy.matrix);
    });
    pInst.instanceMatrix.needsUpdate = true;
    root.add(pInst);
  }

  if (map.DECO_BLOCKS?.length) {
    const dGeoms = [];
    for (const b of map.DECO_BLOCKS) {
      const g = new THREE.BoxGeometry(b.w, b.h, b.d);
      g.translate(b.x, (b.y0 || 0) + b.h * 0.5, b.z);
      dGeoms.push(g);
    }
    const mD = reg(disposables, mergeList(dGeoms));
    if (mD) root.add(new THREE.Mesh(mD, mats.trimMat));
  }

  // 9b. Lore-Accurate Batched Compound Props & Animated Beacons across all 20 Sub-Levels
  const animPropHandles = buildPropsBatched(root, map, disposables);

  // 10. Pooled Dynamic PointLights (up to 12 in Poolrooms for rich colored halls)
  const gfx = GFX_PRESETS[gfxKey] || GFX_PRESETS.ultra;
  const lightPool = [];
  const poolCount = isPoolrooms
    ? Math.min(12, Math.max(4, (gfx.pointLights || 4) + 4))
    : Math.min(8, Math.max(2, gfx.pointLights || 4));
  for (let i = 0; i < poolCount; i++) {
    const pl = new THREE.PointLight(cfg.palette?.accent ?? 0xfff0c0, 0, 22, 1.5);
    pl.position.set(0, -30, 0);
    root.add(pl);
    lightPool.push(pl);
  }

  const flareLightPool = [];
  for (let i = 0; i < 2; i++) {
    const fpl = new THREE.PointLight(0xd84cff, 0, 16, 1.5);
    fpl.position.set(0, -30, 0);
    root.add(fpl);
    flareLightPool.push(fpl);
  }

  // 11. End-of-Level Breaker Machine (`map.TASKS`), Poolrooms Pump Valves (`map.PUMPS`) & Return Portal (`map.PORTALS`)
  const pumpMeshes = [];
  for (const pm of (map.PUMPS || [])) {
    const pg = new THREE.Group();
    pg.position.set(pm.x, pm.y || 0, pm.z);
    if (pm.ry) pg.rotation.y = pm.ry;
    const baseMat = reg(disposables, new THREE.MeshStandardMaterial({ color: 0x42565e, roughness: 0.42, metalness: 0.58 }));
    const brassMat = reg(disposables, new THREE.MeshStandardMaterial({ color: 0xd4a442, roughness: 0.35, metalness: 0.72 }));
    const ledMat = reg(disposables, new THREE.MeshBasicMaterial({ color: pm.done ? 0x36ff88 : 0xff4c38 }));
    const ped = new THREE.Mesh(reg(disposables, new THREE.BoxGeometry(1.35, 1.45, 1.05)), baseMat);
    ped.position.y = 0.72;
    const pipeVert = new THREE.Mesh(reg(disposables, new THREE.CylinderGeometry(0.20, 0.22, 2.6, 10)), brassMat);
    pipeVert.position.set(0.38, 1.3, 0);
    const wheelGroup = new THREE.Group();
    wheelGroup.position.set(0, 1.15, 0.58);
    const rimMat = reg(disposables, new THREE.MeshStandardMaterial({ color: 0xd93829, roughness: 0.4 }));
    const rim = new THREE.Mesh(reg(disposables, new THREE.TorusGeometry(0.36, 0.055, 8, 16)), rimMat);
    const spokeA = new THREE.Mesh(reg(disposables, new THREE.BoxGeometry(0.72, 0.05, 0.05)), baseMat);
    const spokeB = new THREE.Mesh(reg(disposables, new THREE.BoxGeometry(0.05, 0.72, 0.05)), baseMat);
    wheelGroup.add(rim, spokeA, spokeB);
    const led = new THREE.Mesh(reg(disposables, new THREE.BoxGeometry(0.72, 0.22, 1.10)), ledMat);
    led.position.y = 1.54;
    const beacon = new THREE.Mesh(
      reg(disposables, new THREE.CylinderGeometry(0.07, 0.07, 22, 8)),
      reg(disposables, new THREE.MeshBasicMaterial({ color: 0x4ae8ff, transparent: true, opacity: 0.24 }))
    );
    beacon.position.y = 12.2;
    pg.add(ped, pipeVert, wheelGroup, led, beacon);
    root.add(pg);
    pumpMeshes.push({ pump: pm, group: pg, wheelGroup, ledMat, beacon });
  }

  for (const t of (map.TASKS || [])) {
    const tg = new THREE.Group();
    tg.position.set(t.x, t.y || 0, t.z);
    const body = new THREE.Mesh(
      reg(disposables, new THREE.BoxGeometry(1.1, 1.85, 0.8)),
      reg(disposables, new THREE.MeshStandardMaterial({ color: 0x3b424c, roughness: 0.45, metalness: 0.6 }))
    );
    body.position.y = 0.92;
    const ledMat = reg(disposables, new THREE.MeshBasicMaterial({ color: t.done ? 0x36ff88 : 0xff4234 }));
    const led = new THREE.Mesh(reg(disposables, new THREE.BoxGeometry(0.65, 0.25, 0.84)), ledMat);
    led.position.y = 1.48;
    const beacon = new THREE.Mesh(
      reg(disposables, new THREE.CylinderGeometry(0.06, 0.06, 26, 8)),
      reg(disposables, new THREE.MeshBasicMaterial({ color: 0xffd24a, transparent: true, opacity: 0.35 }))
    );
    beacon.position.y = 14;
    tg.add(body, led, beacon);
    root.add(tg);
    taskMeshes.push({ t, ledMat, group: tg });
  }

  for (const pt of (map.PORTALS || [])) {
    const pg = new THREE.Group();
    pg.position.set(pt.x, pt.y || 0, pt.z);
    const fMat = reg(disposables, new THREE.MeshStandardMaterial({ color: 0x20242c, roughness: 0.4, metalness: 0.7 }));
    const pL = new THREE.Mesh(reg(disposables, new THREE.BoxGeometry(0.32, 3.4, 0.36)), fMat); pL.position.set(-1.3, 1.7, 0);
    const pR = new THREE.Mesh(reg(disposables, new THREE.BoxGeometry(0.32, 3.4, 0.36)), fMat); pR.position.set(1.3, 1.7, 0);
    const pT = new THREE.Mesh(reg(disposables, new THREE.BoxGeometry(3.0, 0.35, 0.4)), fMat); pT.position.set(0, 3.4, 0);
    const glowMat = reg(disposables, new THREE.MeshBasicMaterial({
      color: 0x56e892,
      transparent: true,
      opacity: 0.16,
      side: THREE.DoubleSide
    }));
    const plane = new THREE.Mesh(reg(disposables, new THREE.PlaneGeometry(2.3, 3.1)), glowMat);
    plane.position.y = 1.65;
    pg.add(pL, pR, pT, plane);
    root.add(pg);
    portalMeshes.push({ portal: pt, group: pg, glowMat, plane });
  }

  // 12. Almond Water Pickups
  const waterGeo = reg(disposables, new THREE.CylinderGeometry(0.11, 0.11, 0.38, 10));
  const waterMat = reg(disposables, new THREE.MeshStandardMaterial({ color: 0x56d8f5, emissive: 0x208ca8, emissiveIntensity: 0.5 }));
  for (const w of (map.WATERS || [])) {
    const mesh = new THREE.Mesh(waterGeo, waterMat);
    mesh.position.set(w.x, 0.42, w.z);
    root.add(mesh);
    itemMeshes.set(w.id, mesh);
    animItems.push({ mesh, baseY: 0.42, phase: w.id * 0.6 });
  }

  const heroLightPool=[];
  if(isPoolrooms&&map.POOL_CELLS?.some(c=>c.art))for(let i=0;i<2;i++){
    const light=new THREE.SpotLight(0xffffff,0,90,.7,.65,2);light.castShadow=!!gfx.shadows;
    light.shadow.mapSize.set(1024,1024);light.shadow.camera.near=.3;light.shadow.camera.far=90;light.shadow.bias=-.00015;light.shadow.normalBias=.02;light.shadow.radius=3;light.shadow.autoUpdate=false;
    root.add(light,light.target);heroLightPool.push(light);
  }
  const decor=isPoolrooms?buildPoolDecor(root,map,gfx,disposables):null;
  const spatialChunks = partitionPoolGeometry(root, disposables, skyDome?.mesh, map.architectureVersion >= 4 ? 32 : 56);
  if(isPoolrooms&&spatialChunks.length){waterMeshes.length=0;waterMeshes.push(...spatialChunks.filter(m=>m.material===poolWaterMat));}
  for(const mesh of spatialChunks){mesh.castShadow=!!gfx.shadows&&!mesh.material.transparent;mesh.receiveShadow=!!gfx.shadows&&!mesh.material.transparent;}
  const optics=isPoolrooms&&poolWaterMat&&map.POOL_CELLS?.some(c=>c.art)?createPoolOptics(scene,root,map,poolWaterMat,gfxKey,disposables):null;
  const daylight=isPoolrooms?createPoolDaylight(root,map,gfxKey,gfx,disposables,optics):null;
  const streamingStats={geometryEvictions:0,visibleChunks:spatialChunks.length,totalChunks:spatialChunks.length,renderDistance:cfg.farDist||200};
  let curRenderDist = Math.max(50, cfg.farDist || 200);
  let lastCamPos = map.SPAWN ? { x: map.SPAWN.x, y: map.SPAWN.y || 0, z: map.SPAWN.z } : null;
  const updateVisibility = (position, elapsed=0) => {
    if (!position) return;
    lastCamPos = position;
    const baseR = Math.max(48, curRenderDist);
    let visCount = 0;
    for (const chunk of spatialChunks) {
      const b = chunk.userData.bounds;
      const dx = Math.max(b.min.x - position.x, 0, position.x - b.max.x);
      const dz = Math.max(b.min.z - position.z, 0, position.z - b.max.z);
      const effR = chunk.visible ? baseR + 16 : baseR;
      const evictR = Math.max(baseR * 1.25 + 32, baseR + 48);
      const d2 = dx * dx + dz * dz;
      chunk.visible = d2 < effR * effR;
      if (chunk.visible) {
        visCount++;
        chunk.userData.gpuEvicted = false;
        delete chunk.userData.hiddenSince;
      } else {
        chunk.userData.hiddenSince ??= elapsed;
        if (!chunk.userData.gpuEvicted && d2 > evictR * evictR && elapsed - chunk.userData.hiddenSince > 5) {
          chunk.geometry.dispose();
          chunk.userData.gpuEvicted = true;
          streamingStats.geometryEvictions++;
        }
      }
    }
    streamingStats.visibleChunks = visCount;
    streamingStats.renderDistance = curRenderDist;
  };
  updateVisibility(map.SPAWN);
  scene.add(root);

  return {
    isSubLevel: true,
    spatialChunks,
    heroLightPool,
    opticsStats:optics?.stats,
    decorStats:decor?.stats,
    daylightStats:daylight?.stats,
    daylight,
    optics,
    streamingStats,
    setRenderDistance(dist, elapsed = 0, pos = null) {
      curRenderDist = Math.max(50, Math.min(800, Number(dist) || 200));
      updateVisibility(pos || lastCamPos, elapsed);
      decor?.update(elapsed, pos || lastCamPos, curRenderDist);
      if (daylight && (pos || lastCamPos)) daylight.update(elapsed, pos || lastCamPos, curRenderDist);
    },
    setQualitySettings({ renderDistance, waterQuality, cloudQuality } = {}, camPos = null, elapsed = 0) {
      if (renderDistance !== undefined) this.setRenderDistance(renderDistance, elapsed, camPos);
      if (waterQuality && optics?.setQuality) optics.setQuality(waterQuality);
      if (cloudQuality && daylight?.setCloudQuality) daylight.setCloudQuality(cloudQuality);
    },
    updateOptics(renderer,camera,elapsed,dt=1/60,brightness=1){optics?.update(renderer,camera,elapsed);daylight?.meter(renderer,optics?.sceneTexture,elapsed,dt,brightness,scene,camera);},
    root,
    skyDome,
    sunLight,
    waterMeshes,
    lightPool,
    flareLightPool,
    taskMeshes,
    pumpMeshes,
    hookMeshes: [],
    exitMeshes: [],
    portalMeshes,
    itemMeshes,
    animItems,
    trapMeshes: [],
    flareMeshes: [],
    fixInst: null,
    haloInst: null,
    elevator: null,
    dynamicRedSet: new Set(),
    phantomRipple: { x: -999, z: -999, until: 0 },
    setPhantomRipple(x, z, untilElapsed) {
      this.phantomRipple.x = x;
      this.phantomRipple.z = z;
      this.phantomRipple.until = untilElapsed;
    },
    dispose() {
      scene.remove(root);
      for(const light of heroLightPool)light.shadow.dispose();
      for (const d of disposables) if (d && d.dispose) d.dispose();
    },
    updateExtra(elapsed, camPos, curMap, sceneFog, entPos, camFar = 0) {
      decor?.update(elapsed, camPos, curRenderDist);
      daylight?.update(elapsed, camPos, curRenderDist);
      updateVisibility(camPos, elapsed);
      const heroLim = Math.min(110, Math.max(52, curRenderDist * 0.9));
      if(heroLightPool.length&&camPos){
        const keys=map.LIGHTS.filter(l=>l.spot&&Math.hypot(l.x-camPos.x,l.z-camPos.z)<heroLim).sort((a,b)=>Math.hypot(a.x-camPos.x,a.z-camPos.z)-Math.hypot(b.x-camPos.x,b.z-camPos.z));
        heroLightPool.forEach((light,i)=>{const key=keys[i];if(!key){light.intensity=0;return;}if(light.userData.key!==key){light.position.set(key.x,key.y,key.z);light.target.position.fromArray(key.spot.target);light.color.setHex(key.hex);light.intensity=key.spot.intensity;light.angle=key.spot.angle;light.distance=key.spot.distance;light.shadow.needsUpdate=true;light.userData.key=key;}});
      }
      if (skyDome) {
        skyDome.mesh.position.copy(camPos);
        const skyFit = Math.max(42, ((camFar > 0 ? camFar : curRenderDist) || 200) * 0.85) / 540;
        skyDome.mesh.scale.setScalar(skyFit);
        skyDome.mat.uniforms.uTime.value = elapsed;
      }
      if (poolWaterMat) {
        poolWaterMat.uniforms.uTime.value = elapsed;
        if (camPos) poolWaterMat.uniforms.uPlayerPos.value.copy(camPos);
        if (entPos) {
          poolWaterMat.uniforms.uEntityPos.value.copy(entPos);
        } else if (this.phantomRipple.until > elapsed) {
          poolWaterMat.uniforms.uEntityPos.value.set(this.phantomRipple.x, 0, this.phantomRipple.z);
        } else {
          poolWaterMat.uniforms.uEntityPos.value.set(-999, 0, -999);
        }
        if (sceneFog || scene.fog) {
          const fog=sceneFog||scene.fog;
          poolWaterMat.uniforms.uFogColor.value.copy(fog.color);
          poolWaterMat.uniforms.uFogDensity.value = fog.density ?? cfg.fogDensity;
        } else {
          poolWaterMat.uniforms.uFogDensity.value=0;
        }
      } else if (mats.waterTex) {
        mats.waterTex.offset.x = (elapsed * 0.04) % 1;
        mats.waterTex.offset.y = (elapsed * 0.025) % 1;
      }
      updateAnimatedProps(animPropHandles, elapsed, curMap);
      for (const pm of pumpMeshes) {
        const done = !!pm.pump?.done;
        pm.ledMat.color.setHex(done ? 0x36ff88 : (pm.pump?.p > 0.01 ? 0xffc83d : 0xff4c38));
        pm.wheelGroup.rotation.z = done ? elapsed * 2.4 : (pm.pump?.p || 0) * Math.PI * 4.0;
        pm.beacon.material.color.setHex(done ? 0x36ff88 : 0x4ae8ff);
      }
      for (const pm of portalMeshes) {
        const unlocked = curMap?.TASKS?.every(t => t.done);
        pm.glowMat.opacity = unlocked ? (0.48 + Math.sin(elapsed * 4.0) * 0.16) : 0.14;
        pm.glowMat.color.setHex(unlocked ? 0x56e892 : 0x567892);
      }
    }
  };
}
