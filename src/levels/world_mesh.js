// ---------- 3D World Mesh Builder for Level 0 Entrances & All 20 Sub-Levels ----------
// Uses BufferGeometryUtils merging + InstancedMesh + GPU Sky Dome Shader + animated Water
// so 500m-900m worlds render smoothly at high FPS on both PC & Mobile presets.

import { THREE, BufferGeometryUtils } from '../engine.js';
import { GFX_PRESETS } from '../constants.js';
import { getLevelMaterials } from './level_textures.js';

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
    sunLight = new THREE.DirectionalLight(cfg.sunColor || 0xffffff, cfg.sunInt ?? 0.85);
    const sd = cfg.sky.sunDir || [0.3, 0.7, 0.4];
    sunLight.position.set(sd[0] * 180, Math.abs(sd[1]) * 200 + 30, sd[2] * 180);
    root.add(sunLight);
  }

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
  } else {
    const baseY = cfg.archetype === 'ocean' ? -0.82 : -0.02;
    const floorGeo = reg(disposables, new THREE.PlaneGeometry(span, span));
    const floorMesh = new THREE.Mesh(floorGeo, mats.floorMat);
    floorMesh.rotation.x = -Math.PI * 0.5;
    floorMesh.position.set(span * 0.5, baseY, span * 0.5);
    root.add(floorMesh);
  }

  if (!cfg.isOutdoor) {
    const ceilColor = cfg.archetype === 'poolrooms' ? 0xd9eef2 : cfg.archetype === 'blackout' ? 0x060708 : (cfg.palette?.wall ?? 0xaaaaaa);
    const ceilMat = reg(disposables, new THREE.MeshStandardMaterial({ color: ceilColor, roughness: 0.9 }));
    const ceilMesh = new THREE.Mesh(reg(disposables, new THREE.PlaneGeometry(span, span)), ceilMat);
    ceilMesh.rotation.x = Math.PI * 0.5;
    ceilMesh.position.set(span * 0.5, cfg.ceilH, span * 0.5);
    root.add(ceilMesh);
  }

  // 3. Batch Walls & Structural Blocks
  if (map.WALLS?.length) {
    const wallGeoms = [];
    for (const w of map.WALLS) {
      const dx = Math.max(0.15, w.x1 - w.x0);
      const dz = Math.max(0.15, w.z1 - w.z0);
      const y0 = w.y0 ?? 0;
      const y1 = w.y1 ?? cfg.ceilH;
      const dy = Math.max(0.2, y1 - y0);
      const box = makeTiledBox(dx, dy, dz, 4.5);
      box.translate((w.x0 + w.x1) * 0.5, y0 + dy * 0.5, (w.z0 + w.z1) * 0.5);
      wallGeoms.push(box);
    }
    const mergedW = reg(disposables, mergeList(wallGeoms));
    if (mergedW) root.add(new THREE.Mesh(mergedW, mats.wallMat));
  }

  // 4. Platforms, Stair Ramps & Water Slide Chutes ("Cầu Trượt Nước")
  {
    const platGeoms = [];
    for (const p of (map.PLATFORMS || [])) {
      if (!p.draw) continue;
      const dx = Math.max(0.5, p.x1 - p.x0);
      const dz = Math.max(0.5, p.z1 - p.z0);
      const g = makeTiledBox(dx, 0.36, dz, 5.0);
      g.translate((p.x0 + p.x1) * 0.5, p.y - 0.18, (p.z0 + p.z1) * 0.5);
      platGeoms.push(g);
    }
    for (const r of (map.RAMPS || [])) {
      if (!r.draw) continue;
      const dx = Math.max(0.5, r.x1 - r.x0);
      const dz = Math.max(0.5, r.z1 - r.z0);
      const rise = r.y1 - r.y0;
      const run = r.axis === 'x' ? dx : dz;
      const len = Math.hypot(run, rise);
      const g = new THREE.BoxGeometry(r.axis === 'x' ? len : dx, 0.34, r.axis === 'x' ? dz : len);
      const ang = Math.atan2(rise, run);
      if (r.axis === 'x') g.rotateZ(ang);
      else g.rotateX(-ang);
      g.translate((r.x0 + r.x1) * 0.5, (r.y0 + r.y1) * 0.5 - 0.17, (r.z0 + r.z1) * 0.5);
      platGeoms.push(g);
    }
    const mergedP = reg(disposables, mergeList(platGeoms));
    if (mergedP) {
      const pMat = reg(disposables, new THREE.MeshStandardMaterial({
        color: cfg.archetype === 'field' ? 0x735c3d : cfg.archetype === 'ocean' ? 0x6b503a : cfg.archetype === 'sunset_beach' ? 0xd4b97e : (cfg.palette?.trim ?? 0xaaaaaa),
        roughness: 0.72
      }));
      root.add(new THREE.Mesh(mergedP, pMat));
    }

    // Water Slides (curved-look half-pipe channels with guard rails & splash water sheen!)
    if (map.SLIDES?.length) {
      const slideGeoms = [];
      const railGeoms = [];
      for (const s of map.SLIDES) {
        const dx = Math.max(0.8, s.x1 - s.x0);
        const dz = Math.max(0.8, s.z1 - s.z0);
        const rise = s.y1 - s.y0;
        const run = s.axis === 'x' ? dx : dz;
        const len = Math.hypot(run, rise);
        const ang = Math.atan2(rise, run);
        const chute = new THREE.BoxGeometry(s.axis === 'x' ? len : dx, 0.24, s.axis === 'x' ? dz : len);
        if (s.axis === 'x') chute.rotateZ(ang);
        else chute.rotateX(-ang);
        chute.translate((s.x0 + s.x1) * 0.5, (s.y0 + s.y1) * 0.5 - 0.12, (s.z0 + s.z1) * 0.5);
        slideGeoms.push(chute);

        for (const side of [-1, 1]) {
          const rail = new THREE.BoxGeometry(s.axis === 'x' ? len : 0.18, 0.55, s.axis === 'x' ? 0.18 : len);
          if (s.axis === 'x') rail.rotateZ(ang);
          else rail.rotateX(-ang);
          rail.translate(
            (s.x0 + s.x1) * 0.5 + (s.axis === 'x' ? 0 : side * (dx * 0.5 - 0.08)),
            (s.y0 + s.y1) * 0.5 + 0.24,
            (s.z0 + s.z1) * 0.5 + (s.axis === 'x' ? side * (dz * 0.5 - 0.08) : 0)
          );
          railGeoms.push(rail);
        }
      }
      const slideMat = reg(disposables, new THREE.MeshStandardMaterial({ color: 0x3ad8ee, roughness: 0.16, metalness: 0.12 }));
      const railMat = reg(disposables, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.25 }));
      const mS = reg(disposables, mergeList(slideGeoms));
      const mR = reg(disposables, mergeList(railGeoms));
      if (mS) root.add(new THREE.Mesh(mS, slideMat));
      if (mR) root.add(new THREE.Mesh(mR, railMat));
    }
  }

  // 5. Shimmering Water Basins (Poolrooms, Thalassophobia, Sunset Beach)
  if (map.WATER_RECTS?.length && mats.waterMat) {
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

  // 10. Pooled Dynamic PointLights
  const gfx = GFX_PRESETS[gfxKey] || GFX_PRESETS.ultra;
  const lightPool = [];
  const poolCount = Math.min(8, Math.max(2, gfx.pointLights || 4));
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

  // 11. End-of-Level Breaker Machine (`map.TASKS`) & Glowing Return Portal (`map.PORTALS`)
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

  scene.add(root);

  return {
    isSubLevel: true,
    root,
    skyDome,
    sunLight,
    waterMeshes,
    lightPool,
    flareLightPool,
    taskMeshes,
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
    dispose() {
      scene.remove(root);
      for (const d of disposables) if (d && d.dispose) d.dispose();
    },
    updateExtra(elapsed, camPos, curMap) {
      if (skyDome) {
        skyDome.mesh.position.copy(camPos);
        skyDome.mat.uniforms.uTime.value = elapsed;
      }
      if (mats.waterTex) {
        mats.waterTex.offset.x = (elapsed * 0.04) % 1;
        mats.waterTex.offset.y = (elapsed * 0.025) % 1;
      }
      for (const pm of portalMeshes) {
        const unlocked = curMap?.TASKS?.every(t => t.done);
        pm.glowMat.opacity = unlocked ? (0.48 + Math.sin(elapsed * 4.0) * 0.16) : 0.14;
        pm.glowMat.color.setHex(unlocked ? 0x56e892 : 0x567892);
      }
    }
  };
}
