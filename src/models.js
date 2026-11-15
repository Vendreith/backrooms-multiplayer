import { THREE, GLTFLoader, SkeletonUtils, BufferGeometryUtils, PreloaderSystem } from './engine.js';
import { C, WH, N, SURV_COLORS, GFX_PRESETS, TASK_SYMBOLS } from './constants.js';
import { buildSymbolPlateTexture } from './textures.js';

let cachedSoldierGLTF = null;

export function registerModelTasks(preloader) {
  preloader.addTask('Tải mô hình 3D Nhân vật (Soldier.glb)...', async () => {
    const loader = new GLTFLoader();
    try {
      cachedSoldierGLTF = await new Promise((resolve, reject) => {
        loader.load('./models/Soldier.glb', resolve, undefined, reject);
      });
    } catch (e) {
      console.warn('Soldier.glb unavailable, using procedural Hazmat fallback:', e);
      cachedSoldierGLTF = null;
    }
    await PreloaderSystem.yieldFrame();
  });
}

function makeWallBoxGeom(dx, dy, dz) {
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
    if (nx > 0.5) uv.setXY(i, z / C, y / WH);
    else if (ny > 0.5) uv.setXY(i, x / C, z / C);
    else uv.setXY(i, x / C, y / WH);
  }
  uv.needsUpdate = true;
  return g;
}

function assignWorldLightMapUV1(geom, worldSpan, offsetX = 0, offsetZ = 0) {
  const pos = geom.attributes.position;
  const uv1 = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i++) {
    uv1[i * 2] = (pos.getX(i) + offsetX) / worldSpan;
    uv1[i * 2 + 1] = 1.0 - (pos.getZ(i) + offsetZ) / worldSpan;
  }
  geom.setAttribute('uv1', new THREE.BufferAttribute(uv1, 2));
}

/**
 * Builds the 5x larger Backrooms Level 0 world with:
 * - Batched/merged non-smooth gritty matte block walls + 4-sided deep AO contact shadows + shadow casting
 * - Varied floor materials (Pool tile, Wet concrete, Terrazzo, Red carpet, Office tile) receiving baked lightmaps
 * - Huge Pitfall abyss chasms with steel catwalks & Liminal Curiosities
 * - Reactive HDR lighting where ceiling lights dynamically shift red around The Entity
 */
export function buildWorld(scene, map, texStore, gfxKey = 'high') {
  const preset = GFX_PRESETS[gfxKey] || GFX_PRESETS.high;
  const root = new THREE.Group();
  scene.add(root);

  const worldSpan = N * C;
  const midSpan = worldSpan * 0.5;
  const disposables = [];
  const track = (obj) => { disposables.push(obj); return obj; };

  // 1. Damp Carpet Base Floor (with baked 2D ray-shadowed lightmap uv1 & real-time shadow receiving)
  const floorGeom = track(new THREE.PlaneGeometry(worldSpan, worldSpan));
  floorGeom.rotateX(-Math.PI / 2);
  assignWorldLightMapUV1(floorGeom, worldSpan, midSpan, midSpan);
  const floorMat = track(new THREE.MeshStandardMaterial({
    color: 0xd8c376,
    map: texStore.carpetMap,
    normalMap: texStore.carpetNorm,
    normalScale: new THREE.Vector2(1.4, 1.4),
    roughnessMap: texStore.carpetRough,
    lightMap: texStore.floorAO,
    lightMapIntensity: 1.48,
    roughness: 0.96,
    metalness: 0.0
  }));
  const floor = new THREE.Mesh(floorGeom, floorMat);
  floor.position.set(midSpan, 0, midSpan);
  floor.receiveShadow = true;
  root.add(floor);

  // 1b. Varied Detailed Regional Floor Patches (`FLOOR_PATCHES`) & Metal Pitfall Catwalks
  if (map.FLOOR_PATCHES?.length) {
    const patchMats = {
      pool_tile: track(new THREE.MeshStandardMaterial({ map: texStore.poolTileTex, normalMap: texStore.wallNorm, normalScale: new THREE.Vector2(0.65, 0.65), lightMap: texStore.floorAO, lightMapIntensity: 1.38, roughness: 0.36, metalness: 0.10 })),
      concrete: track(new THREE.MeshStandardMaterial({ map: texStore.concreteFloorTex, normalMap: texStore.wallNorm, normalScale: new THREE.Vector2(1.4, 1.4), lightMap: texStore.floorAO, lightMapIntensity: 1.38, roughness: 0.90, metalness: 0.02 })),
      terrazzo: track(new THREE.MeshStandardMaterial({ map: texStore.terrazzoFloorTex, normalMap: texStore.wallNorm, normalScale: new THREE.Vector2(0.55, 0.55), lightMap: texStore.floorAO, lightMapIntensity: 1.38, roughness: 0.64, metalness: 0.06 })),
      red_carpet: track(new THREE.MeshStandardMaterial({ map: texStore.redCarpetTex, normalMap: texStore.carpetNorm, normalScale: new THREE.Vector2(1.6, 1.6), lightMap: texStore.floorAO, lightMapIntensity: 1.38, roughness: 0.95, metalness: 0.0 })),
      office_tile: track(new THREE.MeshStandardMaterial({ map: texStore.officeTileTex, normalMap: texStore.carpetNorm, normalScale: new THREE.Vector2(1.2, 1.2), lightMap: texStore.floorAO, lightMapIntensity: 1.38, roughness: 0.88, metalness: 0.0 })),
      async_hazard: track(new THREE.MeshStandardMaterial({ map: texStore.asyncHazardTex, normalMap: texStore.wallNorm, normalScale: new THREE.Vector2(1.1, 1.1), lightMap: texStore.floorAO, lightMapIntensity: 1.38, roughness: 0.82, metalness: 0.12 })),
      asphalt: track(new THREE.MeshStandardMaterial({ map: texStore.asphaltFloorTex, normalMap: texStore.wallNorm, normalScale: new THREE.Vector2(1.8, 1.8), lightMap: texStore.floorAO, lightMapIntensity: 1.38, roughness: 0.94, metalness: 0.0 })),
      rust_metal: track(new THREE.MeshStandardMaterial({ map: texStore.rustMetalTex, normalMap: texStore.wallNorm, normalScale: new THREE.Vector2(1.3, 1.3), lightMap: texStore.floorAO, lightMapIntensity: 1.38, roughness: 0.50, metalness: 0.68 })),
      glitch: track(new THREE.MeshBasicMaterial({ map: texStore.glitchErrorTex, toneMapped: false })),
      sump: track(new THREE.MeshStandardMaterial({ map: texStore.sumpWaterTex, normalMap: texStore.wallNorm, normalScale: new THREE.Vector2(0.45, 0.45), lightMap: texStore.floorAO, lightMapIntensity: 1.38, roughness: 0.10, metalness: 0.48 })),
      hardwood: track(new THREE.MeshStandardMaterial({ map: texStore.hardwoodFloorTex, normalMap: texStore.wallNorm, normalScale: new THREE.Vector2(0.75, 0.75), lightMap: texStore.floorAO, lightMapIntensity: 1.38, roughness: 0.34, metalness: 0.06 })),
      white_tile: track(new THREE.MeshStandardMaterial({ map: texStore.whitePlasterTex, normalMap: texStore.wallNorm, normalScale: new THREE.Vector2(0.65, 0.65), lightMap: texStore.floorAO, lightMapIntensity: 1.38, roughness: 0.52, metalness: 0.04 })),
      cream_tile: track(new THREE.MeshStandardMaterial({ map: texStore.creamTileTex, normalMap: texStore.wallNorm, normalScale: new THREE.Vector2(0.72, 0.72), lightMap: texStore.floorAO, lightMapIntensity: 1.38, roughness: 0.44, metalness: 0.05 })),
      brick: track(new THREE.MeshStandardMaterial({ map: texStore.brickWallTex, normalMap: texStore.wallNorm, normalScale: new THREE.Vector2(1.4, 1.4), lightMap: texStore.floorAO, lightMapIntensity: 1.38, roughness: 0.90, metalness: 0.02 })),
      grey_carpet: track(new THREE.MeshStandardMaterial({ map: texStore.greyCarpetTex, normalMap: texStore.carpetNorm, normalScale: new THREE.Vector2(1.45, 1.45), lightMap: texStore.floorAO, lightMapIntensity: 1.38, roughness: 0.95, metalness: 0.0 })),
      dark_flood: track(new THREE.MeshStandardMaterial({ map: texStore.darkFloodWaterTex, normalMap: texStore.wallNorm, normalScale: new THREE.Vector2(0.28, 0.28), lightMap: texStore.floorAO, lightMapIntensity: 1.48, roughness: 0.06, metalness: 0.66 }))
    };
    const buckets = {
      pool_tile: [], concrete: [], terrazzo: [], red_carpet: [], office_tile: [],
      async_hazard: [], asphalt: [], rust_metal: [], glitch: [], sump: [],
      hardwood: [], white_tile: [], cream_tile: [], brick: [], grey_carpet: [], dark_flood: []
    };
    for (const fp of map.FLOOR_PATCHES) {
      if (!buckets[fp.kind]) continue;
      const g = new THREE.PlaneGeometry(fp.w, fp.d);
      g.rotateX(-Math.PI / 2);
      const uv = g.attributes.uv;
      for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * (fp.w / C) * 0.5, uv.getY(i) * (fp.d / C) * 0.5);
      g.translate(fp.x + fp.w * 0.5, 0.008, fp.z + fp.d * 0.5);
      buckets[fp.kind].push(g);
    }
    for (const [kind, geoms] of Object.entries(buckets)) {
      if (!geoms.length) continue;
      const merged = track(BufferGeometryUtils.mergeGeometries(geoms, false));
      for (const g of geoms) g.dispose();
      assignWorldLightMapUV1(merged, worldSpan);
      const mesh = new THREE.Mesh(merged, patchMats[kind]);
      mesh.receiveShadow = true;
      root.add(mesh);
    }
  }

  // Metal Catwalk Slabs across Huge Pitfall Abyss Chasms
  if (map.CATWALKS?.length) {
    const cwGeoms = map.CATWALKS.map(cw => {
      const g = new THREE.BoxGeometry(cw.x1 - cw.x0, 0.14, cw.z1 - cw.z0);
      g.translate((cw.x0 + cw.x1) * 0.5, 0.04, (cw.z0 + cw.z1) * 0.5);
      return g;
    });
    const cwMerged = track(BufferGeometryUtils.mergeGeometries(cwGeoms, false));
    for (const g of cwGeoms) g.dispose();
    assignWorldLightMapUV1(cwMerged, worldSpan);
    const cwMat = track(new THREE.MeshStandardMaterial({ map: texStore.pitGrate, lightMap: texStore.floorAO, lightMapIntensity: 1.45, color: 0x626864, roughness: 0.55, metalness: 0.72 }));
    const cwMesh = new THREE.Mesh(cwMerged, cwMat);
    cwMesh.receiveShadow = true;
    root.add(cwMesh);
  }

  // Deep Bottomless Pitfalls Abyss Shafts & Chasm Darkness Drops
  if (map.hugeChasms?.length) {
    const abyssWallMat = track(new THREE.MeshStandardMaterial({ map: texStore.concreteFloorTex, color: 0x161410, roughness: 0.96 }));
    const abyssFloorMat = track(new THREE.MeshBasicMaterial({ color: 0x030302 }));
    for (const ch of map.hugeChasms) {
      const w = ch.x1 - ch.x0, d = ch.z1 - ch.z0;
      const blackHole = new THREE.Mesh(track(new THREE.PlaneGeometry(w, d)), abyssFloorMat);
      blackHole.rotation.x = -Math.PI / 2;
      blackHole.position.set((ch.x0 + ch.x1) * 0.5, 0.005, (ch.z0 + ch.z1) * 0.5);
      root.add(blackHole);
      // Visible perimeter pit liner wall framing abyss pit drop
      const liner = new THREE.Mesh(track(new THREE.BoxGeometry(w, 0.12, d)), abyssWallMat);
      liner.position.set((ch.x0 + ch.x1) * 0.5, -0.08, (ch.z0 + ch.z1) * 0.5);
      root.add(liner);
    }
  }

  // 2. Acoustic Grid Ceiling (with matching world uv1 lightmap)
  const ceilGeom = track(new THREE.PlaneGeometry(worldSpan, worldSpan));
  ceilGeom.rotateX(Math.PI / 2);
  assignWorldLightMapUV1(ceilGeom, worldSpan, midSpan, midSpan);
  const ceilMat = track(new THREE.MeshStandardMaterial({
    color: 0xd4cb9e,
    map: texStore.ceilMap,
    normalMap: texStore.ceilNorm,
    roughnessMap: texStore.ceilRough,
    lightMap: texStore.ceilAO,
    lightMapIntensity: 1.16,
    roughness: 0.94,
    metalness: 0.0
  }));
  const ceil = new THREE.Mesh(ceilGeom, ceilMat);
  ceil.position.set(midSpan, WH, midSpan);
  ceil.receiveShadow = !!preset.shadows;
  root.add(ceil);

  // 3. Monolithic Thick Block Walls (Merged per Material -> high FPS + matte non-smooth tooth + crisp shadow casting!)
  const wallMaterials = {
    yellow: track(new THREE.MeshStandardMaterial({
      color: 0xf2dc82,
      map: texStore.wallMap,
      normalMap: texStore.wallNorm,
      normalScale: new THREE.Vector2(2.4, 2.4),
      roughnessMap: texStore.wallRough,
      roughness: 0.96,
      metalness: 0.0
    })),
    red: track(new THREE.MeshStandardMaterial({
      color: 0xb6322c,
      map: texStore.wallMap,
      normalMap: texStore.wallNorm,
      normalScale: new THREE.Vector2(2.2, 2.2),
      roughnessMap: texStore.wallRough,
      roughness: 0.95,
      metalness: 0.0
    })),
    manila: track(new THREE.MeshStandardMaterial({
      color: 0xe6d6b0,
      map: texStore.wallMap,
      normalMap: texStore.wallNorm,
      normalScale: new THREE.Vector2(1.8, 1.8),
      roughness: 0.95,
      metalness: 0.0
    })),
    pool: track(new THREE.MeshStandardMaterial({
      color: 0xd8ebe4,
      map: texStore.poolTileTex,
      normalMap: texStore.wallNorm,
      normalScale: new THREE.Vector2(1.2, 1.2),
      roughness: 0.62,
      metalness: 0.04
    })),
    concrete: track(new THREE.MeshStandardMaterial({
      color: 0x8e8d84,
      map: texStore.concreteFloorTex,
      normalMap: texStore.wallNorm,
      normalScale: new THREE.Vector2(2.6, 2.6),
      roughness: 0.96,
      metalness: 0.0
    })),
    white: track(new THREE.MeshStandardMaterial({
      color: 0xeae8e0,
      map: texStore.whitePlasterTex,
      normalMap: texStore.wallNorm,
      normalScale: new THREE.Vector2(1.4, 1.4),
      roughness: 0.88,
      metalness: 0.0
    })),
    pit: track(new THREE.MeshStandardMaterial({
      map: texStore.warnTex,
      roughness: 0.85,
      metalness: 0.1
    })),
    cream_tile: track(new THREE.MeshStandardMaterial({
      color: 0xf4eee0,
      map: texStore.creamTileTex,
      roughness: 0.42,
      metalness: 0.04
    })),
    brick: track(new THREE.MeshStandardMaterial({
      color: 0xc2927c,
      map: texStore.brickWallTex,
      normalMap: texStore.wallNorm,
      normalScale: new THREE.Vector2(1.25, 1.25),
      roughness: 0.92,
      metalness: 0.0
    })),
    stone: track(new THREE.MeshStandardMaterial({
      color: 0xbcb6aa,
      map: texStore.stoneWallTex,
      normalMap: texStore.wallNorm,
      normalScale: new THREE.Vector2(1.35, 1.35),
      roughness: 0.94,
      metalness: 0.0
    })),
    grey_drywall: track(new THREE.MeshStandardMaterial({
      color: 0xc8ccd2,
      map: texStore.greyDrywallTex,
      roughness: 0.88,
      metalness: 0.0
    }))
  };

  const wallGeomsByStyle = { yellow: [], red: [], manila: [], pool: [], concrete: [], white: [], pit: [], cream_tile: [], brick: [], stone: [], grey_drywall: [] };
  const aoSkirtMatrices = [];
  const dummy = new THREE.Object3D();
  const crawlStripGeoms = [];

  for (const r of map.RECTS) {
    if (r.hidden) continue;
    const dx = r.x1 - r.x0;
    const dz = r.z1 - r.z0;
    const y0 = r.y0 ?? 0;
    const y1 = r.y1 ?? (r.h ?? WH);
    const dy = Math.max(0.2, y1 - y0);
    const geom = makeWallBoxGeom(dx, dy, dz);
    geom.translate((r.x0 + r.x1) * 0.5, y0 + dy * 0.5, (r.z0 + r.z1) * 0.5);
    const st = wallGeomsByStyle[r.style] ? r.style : 'yellow';
    wallGeomsByStyle[st].push(geom);

    if (r.crawl) {
      const sg = new THREE.BoxGeometry(dx + 0.02, 0.12, dz + 0.02);
      sg.translate((r.x0 + r.x1) * 0.5, y0 + 0.06, (r.z0 + r.z1) * 0.5);
      crawlStripGeoms.push(sg);
    }

    // Compact fallback Wall-Base Contact Skirt (hidden automatically when Real-Time Shadow Shader is active on High/Ultra)
    if (y0 < 0.05 && dy > 1.2 && aoSkirtMatrices.length < 14500) {
      const cx = (r.x0 + r.x1) * 0.5, cz = (r.z0 + r.z1) * 0.5;
      const sd = 0.24;
      // +X face (yaw 0: -X dark edge touches wall r.x1 flush, +X fades smoothly onto carpet)
      dummy.position.set(r.x1 + sd * 0.49, 0.013, cz);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(sd, 1, dz);
      dummy.updateMatrix();
      aoSkirtMatrices.push(dummy.matrix.clone());

      // -X face
      dummy.position.set(r.x0 - sd * 0.49, 0.013, cz);
      dummy.rotation.set(0, Math.PI, 0);
      dummy.scale.set(sd, 1, dz);
      dummy.updateMatrix();
      aoSkirtMatrices.push(dummy.matrix.clone());

      // +Z face
      dummy.position.set(cx, 0.013, r.z1 + sd * 0.49);
      dummy.rotation.set(0, -Math.PI / 2, 0);
      dummy.scale.set(sd, 1, dx);
      dummy.updateMatrix();
      aoSkirtMatrices.push(dummy.matrix.clone());

      // -Z face
      dummy.position.set(cx, 0.013, r.z0 - sd * 0.49);
      dummy.rotation.set(0, Math.PI / 2, 0);
      dummy.scale.set(sd, 1, dx);
      dummy.updateMatrix();
      aoSkirtMatrices.push(dummy.matrix.clone());
    }
  }

  for (const a of (map.ARCHES || [])) {
    const dx = a.x1 - a.x0, dz = a.z1 - a.z0, dy = a.y1 - a.y0;
    const geom = makeWallBoxGeom(dx, dy, dz);
    geom.translate((a.x0 + a.x1) * 0.5, a.y0 + dy * 0.5, (a.z0 + a.z1) * 0.5);
    const st = wallGeomsByStyle[a.style] ? a.style : 'yellow';
    wallGeomsByStyle[st].push(geom);
  }

  for (const [st, geoms] of Object.entries(wallGeomsByStyle)) {
    if (!geoms.length) continue;
    const merged = track(BufferGeometryUtils.mergeGeometries(geoms, false));
    for (const g of geoms) g.dispose();
    const mesh = new THREE.Mesh(merged, wallMaterials[st]);
    mesh.castShadow = !!preset.shadows;
    mesh.receiveShadow = !!preset.shadows;
    root.add(mesh);
  }

  if (crawlStripGeoms.length) {
    const cMerged = track(BufferGeometryUtils.mergeGeometries(crawlStripGeoms, false));
    for (const g of crawlStripGeoms) g.dispose();
    root.add(new THREE.Mesh(cMerged, wallMaterials.pit));
  }

  let skirtInst = null;
  if (aoSkirtMatrices.length && texStore.aoSkirtTex) {
    const skirtPlane = track(new THREE.PlaneGeometry(1, 1));
    skirtPlane.rotateX(-Math.PI / 2);
    const skirtMat = track(new THREE.MeshBasicMaterial({
      map: texStore.aoSkirtTex, transparent: true, opacity: 0.40, depthWrite: false,
      polygonOffset: true, polygonOffsetFactor: -1
    }));
    skirtInst = new THREE.InstancedMesh(skirtPlane, skirtMat, aoSkirtMatrices.length);
    for (let i = 0; i < aoSkirtMatrices.length; i++) skirtInst.setMatrixAt(i, aoSkirtMatrices[i]);
    skirtInst.instanceMatrix.needsUpdate = true;
    root.add(skirtInst);
  }

  // 4. HDR-Bright Ceiling Fluorescent Troffers (high emissive Bloom + reactive crimson color state!)
  const fixCount = map.LIGHTS.length;
  const fixGeom = track(new THREE.BoxGeometry(1.5, 0.07, 0.54));
  const fixMat = track(new THREE.MeshBasicMaterial({
    map: texStore.fixTex,
    color: 0xffffff,
    toneMapped: false
  }));
  const fixInst = new THREE.InstancedMesh(fixGeom, fixMat, fixCount);

  const haloGeom = track(new THREE.PlaneGeometry(3.4, 1.8));
  haloGeom.rotateX(Math.PI / 2);
  const haloMat = track(new THREE.MeshBasicMaterial({
    map: texStore.haloTex,
    transparent: true,
    opacity: 0.48,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    toneMapped: false
  }));
  const haloInst = new THREE.InstancedMesh(haloGeom, haloMat, fixCount);

  const colObj = new THREE.Color();
  const baseLightColors = new Array(fixCount);
  for (let i = 0; i < fixCount; i++) {
    const l = map.LIGHTS[i];
    dummy.position.set(l.x, WH - 0.035, l.z);
    dummy.rotation.set(0, 0, 0);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    fixInst.setMatrixAt(i, dummy.matrix);

    dummy.position.set(l.x, WH - 0.09, l.z);
    dummy.updateMatrix();
    haloInst.setMatrixAt(i, dummy.matrix);

    const lg = l.gain ?? (l.bright ? 1.14 : 0.58);
    const lgSoft = lg > 0.85 ? 0.85 + (lg - 0.85) * 0.45 : lg;
    if (l.dead) colObj.setRGB(0.05, 0.045, 0.03);
    else if (Array.isArray(l.rgb)) {
      const e = 1.05 + lgSoft * 1.55;
      colObj.setRGB(l.rgb[0] * e, l.rgb[1] * e, l.rgb[2] * e);
    } else if (l.red) colObj.setRGB(2.6, 0.26, 0.15);
    else if (l.green) colObj.setRGB(0.68, 2.35, 1.02);
    else if (l.purple) colObj.setRGB(2.0, 0.50, 2.5);
    else {
      const e = 1.05 + lgSoft * 1.65; // Warm glowing Backrooms tubes without washing out walls
      colObj.setRGB(e, e * 0.91, e * 0.56);
    }
    baseLightColors[i] = [colObj.r, colObj.g, colObj.b];
    fixInst.setColorAt(i, colObj);
    haloInst.setColorAt(i, l.dead ? colObj.setRGB(0, 0, 0) : colObj);
  }
  fixInst.instanceMatrix.needsUpdate = true;
  if (fixInst.instanceColor) fixInst.instanceColor.needsUpdate = true;
  haloInst.instanceMatrix.needsUpdate = true;
  if (haloInst.instanceColor) haloInst.instanceColor.needsUpdate = true;
  root.add(fixInst, haloInst);

  // Pooled Dynamic PointLights around Player (nearest overhead lamps cast crisp grounded 3D shadows!)
  const lightPool = [];
  for (let i = 0; i < preset.pointLights; i++) {
    const pl = new THREE.PointLight(0xffe79c, 5.4, 22, 1.38);
    pl.position.set(0, WH - 0.35, 0);
    if (preset.shadows && (i === 0 || (i === 1 && preset.pointLights >= 6) || (i === 2 && preset.pointLights >= 8) || (i === 3 && preset.pointLights >= 10 && preset.shadowMapSize >= 1024))) {
      pl.castShadow = true;
      const shRes = preset.shadowMapSize >= 1024 ? (i === 0 ? 1024 : 512) : 256;
      pl.shadow.mapSize.set(shRes, shRes);
      pl.shadow.camera.near = 0.25;
      pl.shadow.camera.far = 24;
      pl.shadow.bias = -0.00065;
      pl.shadow.normalBias = 0.015;
    }
    root.add(pl);
    lightPool.push(pl);
  }

  // 5. Instanced Alpha-Masked Grunge Leaks & Damage Decals
  const decalScale = preset.decalScale ?? 1.0;
  const maxDecals = Math.floor(map.PROPS.wallDecals.length * Math.min(1, decalScale));
  const decalBuckets = [[], [], [], []];
  for (let i = 0; i < maxDecals; i++) {
    const d = map.PROPS.wallDecals[i];
    decalBuckets[d.kind % 4].push(d);
  }
  const decalPlane = track(new THREE.PlaneGeometry(1, 1));
  decalBuckets.forEach((list, kind) => {
    if (!list.length || !texStore.wallDecals[kind]) return;
    const mat = track(new THREE.MeshBasicMaterial({
      map: texStore.wallDecals[kind],
      transparent: true,
      opacity: 0.82,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -1
    }));
    const inst = new THREE.InstancedMesh(decalPlane, mat, list.length);
    list.forEach((d, idx) => {
      dummy.position.set(d.x, d.y, d.z);
      dummy.rotation.set(0, d.ang, 0);
      dummy.scale.set(d.w, d.h, 1);
      dummy.updateMatrix();
      inst.setMatrixAt(idx, dummy.matrix);
    });
    inst.instanceMatrix.needsUpdate = true;
    root.add(inst);
  });

  // 6. Posters / Scratched Notes / Arrows
  const maxPosters = Math.floor(map.PROPS.posters.length * Math.min(1, decalScale));
  const posterBuckets = Array.from({ length: 6 }, () => []);
  for (let i = 0; i < maxPosters; i++) {
    const p = map.PROPS.posters[i];
    posterBuckets[p.kind % 6].push(p);
  }
  posterBuckets.forEach((list, kind) => {
    if (!list.length || !texStore.posters[kind]) return;
    const mat = track(new THREE.MeshBasicMaterial({
      map: texStore.posters[kind],
      transparent: true,
      opacity: 0.92,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -2
    }));
    const inst = new THREE.InstancedMesh(decalPlane, mat, list.length);
    list.forEach((p, idx) => {
      dummy.position.set(p.x, p.y, p.z);
      dummy.rotation.set(0, p.ang, (idx % 3 - 1) * 0.04);
      dummy.scale.set(p.w, p.h, 1);
      dummy.updateMatrix();
      inst.setMatrixAt(idx, dummy.matrix);
    });
    inst.instanceMatrix.needsUpdate = true;
    root.add(inst);
  });

  // 7. Zone Furniture, Pitfalls, Vents, Pipes, Puddles & Dangling Ceiling Cords
  if (map.PROPS.pitfalls?.length) {
    const pitMat = track(new THREE.MeshStandardMaterial({ map: texStore.pitGrate, roughness: 0.9 }));
    const pitGeom = track(new THREE.PlaneGeometry(1, 1));
    pitGeom.rotateX(-Math.PI / 2);
    const pitInst = new THREE.InstancedMesh(pitGeom, pitMat, map.PROPS.pitfalls.length);
    map.PROPS.pitfalls.forEach((p, idx) => {
      dummy.position.set(p.x, 0.015, p.z);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(p.w, 1, p.w);
      dummy.updateMatrix();
      pitInst.setMatrixAt(idx, dummy.matrix);
    });
    pitInst.instanceMatrix.needsUpdate = true;
    root.add(pitInst);
  }

  const deskMat = track(new THREE.MeshStandardMaterial({ map: texStore.deskWood, roughness: 0.72 }));
  const cabMetalMat = track(new THREE.MeshStandardMaterial({ map: texStore.metalCab, roughness: 0.48, metalness: 0.5 }));
  const crateMat = track(new THREE.MeshStandardMaterial({ map: texStore.warnTex, color: 0xb69546, roughness: 0.75 }));
  for (const f of (map.PROPS.furniture || [])) {
    const fg = new THREE.Group();
    fg.position.set(f.x, 0, f.z);
    fg.rotation.y = f.rot || 0;
    if (f.kind === 'desk') {
      const top = new THREE.Mesh(track(new THREE.BoxGeometry(1.42, 0.08, 0.82)), deskMat);
      top.position.y = 0.76;
      const legG = track(new THREE.BoxGeometry(0.08, 0.74, 0.08));
      for (const lx of [-0.62, 0.62]) for (const lz of [-0.32, 0.32]) {
        const leg = new THREE.Mesh(legG, cabMetalMat);
        leg.position.set(lx, 0.37, lz);
        fg.add(leg);
      }
      fg.add(top);
    } else if (f.kind === 'cabinet') {
      const cab = new THREE.Mesh(track(new THREE.BoxGeometry(0.76, 1.38, 0.66)), cabMetalMat);
      cab.position.y = 0.69;
      fg.add(cab);
    } else {
      const cr = new THREE.Mesh(track(new THREE.BoxGeometry(0.84, 0.84, 0.84)), crateMat);
      cr.position.y = 0.42;
      fg.add(cr);
    }
    root.add(fg);
  }

  // Curious Liminal Oddities (Threshold Staircases to Ceiling, Freestanding Doors, CRT Monitor Banks, Tilted Pillars)
  if (map.PROPS.curiosities?.length) {
    const crtMat = track(new THREE.MeshBasicMaterial({ map: texStore.crtScreenTex, toneMapped: false }));
    const stepMat = track(new THREE.MeshStandardMaterial({ map: texStore.concreteFloorTex, roughness: 0.94 }));
    const redDoorMat = track(new THREE.MeshStandardMaterial({ map: texStore.exitDoorTex, color: 0xd94840, roughness: 0.55 }));
    for (const cur of map.PROPS.curiosities) {
      const cg = new THREE.Group();
      cg.position.set(cur.x, 0, cur.z);
      cg.rotation.y = cur.rot || 0;
      if (cur.kind === 'stairs_to_ceiling') {
        for (let st = 0; st < 11; st++) {
          const step = new THREE.Mesh(track(new THREE.BoxGeometry(1.5, 0.34, 0.36)), stepMat);
          step.position.set(0, 0.17 + st * 0.34, -1.6 + st * 0.32);
          cg.add(step);
        }
      } else if (cur.kind === 'solitary_door') {
        const jamb = new THREE.Mesh(track(new THREE.BoxGeometry(1.45, 2.75, 0.24)), cabMetalMat);
        jamb.position.y = 1.375;
        const door = new THREE.Mesh(track(new THREE.BoxGeometry(1.20, 2.55, 0.16)), redDoorMat);
        door.position.y = 1.275;
        cg.add(jamb, door);
      } else if (cur.kind === 'crt_bank') {
        for (let m = 0; m < 3; m++) {
          const box = new THREE.Mesh(track(new THREE.BoxGeometry(0.62, 0.52, 0.50)), cabMetalMat);
          const scr = new THREE.Mesh(track(new THREE.PlaneGeometry(0.50, 0.40)), crtMat);
          const yOff = m === 2 ? 0.78 : 0.26;
          const xOff = m === 2 ? 0.02 : (m === 0 ? -0.34 : 0.34);
          box.position.set(xOff, yOff, 0);
          scr.position.set(xOff, yOff, 0.256);
          cg.add(box, scr);
        }
      } else if (cur.kind === 'tilted_pillar') {
        const tp = new THREE.Mesh(track(new THREE.BoxGeometry(0.86, WH * 1.05, 0.86)), wallMaterials.yellow);
        tp.position.y = WH * 0.48;
        tp.rotation.set(0.24, 0.15, -0.22);
        cg.add(tp);
      }
      root.add(cg);
    }
  }

  if (map.PROPS.cords?.length) {
    const cordGeom = track(new THREE.CylinderGeometry(0.015, 0.015, 1, 5));
    const cordMat = track(new THREE.MeshBasicMaterial({ color: 0x161412 }));
    const cordInst = new THREE.InstancedMesh(cordGeom, cordMat, map.PROPS.cords.length);
    map.PROPS.cords.forEach((cd, idx) => {
      dummy.position.set(cd.x, WH - cd.len * 0.5, cd.z);
      dummy.rotation.set(0.05 * Math.sin(idx), 0, 0.05 * Math.cos(idx));
      dummy.scale.set(1, cd.len, 1);
      dummy.updateMatrix();
      cordInst.setMatrixAt(idx, dummy.matrix);
    });
    cordInst.instanceMatrix.needsUpdate = true;
    root.add(cordInst);
  }

  if (map.PROPS.vents.length) {
    const ventGeom = track(new THREE.PlaneGeometry(0.82, 0.56));
    const ventMat = track(new THREE.MeshStandardMaterial({
      map: texStore.ventTex, roughness: 0.55, metalness: 0.45, polygonOffset: true, polygonOffsetFactor: -1
    }));
    const ventInst = new THREE.InstancedMesh(ventGeom, ventMat, map.PROPS.vents.length);
    map.PROPS.vents.forEach((v, idx) => {
      dummy.position.set(v.x, v.y, v.z);
      dummy.rotation.set(0, v.ang, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      ventInst.setMatrixAt(idx, dummy.matrix);
    });
    ventInst.instanceMatrix.needsUpdate = true;
    root.add(ventInst);
  }

  if (map.PROPS.pipes.length) {
    const pipeGeom = track(new THREE.CylinderGeometry(0.06, 0.06, 1, 8));
    pipeGeom.rotateZ(Math.PI / 2);
    const pipeMat = track(new THREE.MeshStandardMaterial({ color: 0x3b3f3a, roughness: 0.42, metalness: 0.72 }));
    const pipeInst = new THREE.InstancedMesh(pipeGeom, pipeMat, map.PROPS.pipes.length);
    map.PROPS.pipes.forEach((p, idx) => {
      dummy.position.set(p.x, p.y, p.z);
      dummy.rotation.set(0, p.isH ? 0 : Math.PI / 2, 0);
      dummy.scale.set(p.len, 1, 1);
      dummy.updateMatrix();
      pipeInst.setMatrixAt(idx, dummy.matrix);
    });
    pipeInst.instanceMatrix.needsUpdate = true;
    root.add(pipeInst);
  }

  if (map.PROPS.puddles.length) {
    const pudGeom = track(new THREE.PlaneGeometry(1, 1));
    pudGeom.rotateX(-Math.PI / 2);
    const pudMat = track(new THREE.MeshStandardMaterial({
      map: texStore.puddleTex, transparent: true, opacity: 0.82,
      roughness: 0.06, metalness: 0.4, depthWrite: false
    }));
    const pudInst = new THREE.InstancedMesh(pudGeom, pudMat, map.PROPS.puddles.length);
    map.PROPS.puddles.forEach((p, idx) => {
      dummy.position.set(p.x, 0.012, p.z);
      dummy.rotation.set(0, idx * 0.7, 0);
      dummy.scale.set(p.r * 2, 1, p.r * 2);
      dummy.updateMatrix();
      pudInst.setMatrixAt(idx, dummy.matrix);
    });
    pudInst.instanceMatrix.needsUpdate = true;
    root.add(pudInst);
  }

  // 8. Detailed Textured Breaker Tasks + Machine Symbol Plaques + 5-Segment Saved Progress Bar LEDs
  const taskSymbolTexs = TASK_SYMBOLS.map(ts => track(buildSymbolPlateTexture(ts.code, ts.sym, ts.col)));
  const taskMeshes = [];
  const boxGeom = track(new THREE.BoxGeometry(0.95, 1.56, 0.58));
  const ledGeom = track(new THREE.SphereGeometry(0.11, 10, 10));
  const plaqueGeom = track(new THREE.PlaneGeometry(0.56, 0.56));
  const progSegGeom = track(new THREE.BoxGeometry(0.11, 0.08, 0.04));

  for (const t of map.TASKS) {
    const g = new THREE.Group();
    g.position.set(t.x, 0, t.z);
    g.rotation.y = t.rot || 0;
    const cab = new THREE.Mesh(boxGeom, track(new THREE.MeshStandardMaterial({ map: texStore.cabTex, roughness: 0.45, metalness: 0.4 })));
    cab.position.y = 0.78;
    cab.castShadow = !!preset.shadows;
    const ledMat = track(new THREE.MeshBasicMaterial({ color: 0xff3624, toneMapped: false }));
    const led = new THREE.Mesh(ledGeom, ledMat);
    led.position.set(0, 1.68, 0.18);
    const pole = new THREE.Mesh(track(new THREE.CylinderGeometry(0.032, 0.032, 1.3, 6)), track(new THREE.MeshStandardMaterial({ color: 0x3b3d3a, metalness: 0.6 })));
    pole.position.y = 2.15;
    const topLed = new THREE.Mesh(ledGeom, ledMat);
    topLed.position.y = 2.85;

    // Readable Symbol Plaque (`A-01 ⚡`, etc.) mounted high & on cabinet front so players recognize machines!
    const symMat = track(new THREE.MeshBasicMaterial({ map: taskSymbolTexs[t.id % taskSymbolTexs.length], toneMapped: false }));
    const plateF = new THREE.Mesh(plaqueGeom, symMat);
    plateF.position.set(0, 1.16, 0.305);
    const plateB = new THREE.Mesh(plaqueGeom, symMat);
    plateB.position.set(0, 1.16, -0.305);
    plateB.rotation.y = Math.PI;
    const plateTop = new THREE.Mesh(plaqueGeom, symMat);
    plateTop.position.set(0, 2.52, 0.04);

    // 5-segment Progress Bar LEDs right on cabinet front (amber/green for saved repair progress!)
    const progSegs = [];
    for (let k = 0; k < 5; k++) {
      const segMat = track(new THREE.MeshBasicMaterial({ color: 0x241210, toneMapped: false }));
      const seg = new THREE.Mesh(progSegGeom, segMat);
      seg.position.set((k - 2) * 0.145, 0.76, 0.305);
      g.add(seg);
      progSegs.push(segMat);
    }

    g.add(cab, led, pole, topLed, plateF, plateB, plateTop);
    root.add(g);
    taskMeshes.push({ group: g, ledMat, progSegs });
  }

  // 8b. Multi-Type Path-Connected Floor Guide Cables & Directional Chevron Arrows
  let exitGuideMat = null;
  let chaserLedTex = null;
  let chaserExitTex = null;
  const guideDummy = new THREE.Object3D();
  const guideColorObj = new THREE.Color();

  const buildGuideLayer = (segs, tex, opts = {}) => {
    if (!segs.length || !tex) return null;
    const gGeom = track(new THREE.PlaneGeometry(opts.width || 0.50, 1.0));
    gGeom.rotateX(-Math.PI / 2);
    const gMat = track(new THREE.MeshBasicMaterial({
      map: tex,
      color: opts.baseTint ?? 0xffffff,
      transparent: true,
      opacity: opts.opacity ?? 0.94,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      toneMapped: !!opts.toneMapped
    }));
    const inst = new THREE.InstancedMesh(gGeom, gMat, segs.length);
    for (let i = 0; i < segs.length; i++) {
      const s = segs[i];
      guideDummy.position.set(s.mx, opts.y ?? 0.016, s.mz);
      guideDummy.rotation.set(0, s.rotY, 0);
      guideDummy.scale.set(1, 1, s.len);
      guideDummy.updateMatrix();
      inst.setMatrixAt(i, guideDummy.matrix);
      if (opts.tintPerTask) {
        guideColorObj.setHex(s.hex || 0xffffff);
        inst.setColorAt(i, guideColorObj);
      }
    }
    inst.instanceMatrix.needsUpdate = true;
    if (inst.instanceColor) inst.instanceColor.needsUpdate = true;
    root.add(inst);
    return { inst, mat: gMat };
  };

  if (map.GUIDE_SEGMENTS?.length) {
    const byType = { power_cable: [], conduit_track: [], hazard_tape: [], led_strip: [] };
    for (const s of map.GUIDE_SEGMENTS) {
      if (byType[s.guideType]) byType[s.guideType].push(s);
    }
    buildGuideLayer(byType.power_cable, texStore.guideCableTex, { width: 0.46, y: 0.016, tintPerTask: false });
    buildGuideLayer(byType.conduit_track, texStore.guideConduitTex, { width: 0.50, y: 0.017, tintPerTask: false });
    buildGuideLayer(byType.hazard_tape, texStore.guideTapeTex, { width: 0.48, y: 0.015, tintPerTask: false });

    if (byType.led_strip.length && texStore.guideLedTex) {
      chaserLedTex = track(texStore.guideLedTex.clone());
      chaserLedTex.needsUpdate = true;
      buildGuideLayer(byType.led_strip, chaserLedTex, { width: 0.44, y: 0.019, tintPerTask: true, toneMapped: false });
    }
  }

  if (map.EXIT_GUIDE_SEGMENTS?.length && texStore.guideLedTex) {
    chaserExitTex = track(texStore.guideLedTex.clone());
    chaserExitTex.needsUpdate = true;
    const built = buildGuideLayer(map.EXIT_GUIDE_SEGMENTS, chaserExitTex, {
      width: 0.42, y: 0.021, baseTint: 0x995816, opacity: 0.62, toneMapped: false
    });
    if (built) exitGuideMat = built.mat;
  }

  // Floor Symbol Junction Markers at cable roots & branch forks (`A-01 ⚡`, `A-02 ◈`, etc.)
  if (map.GUIDE_MARKERS?.length) {
    const markerPlane = track(new THREE.PlaneGeometry(0.84, 0.84));
    markerPlane.rotateX(-Math.PI / 2);
    const bySym = Array.from({ length: TASK_SYMBOLS.length }, () => []);
    for (const m of map.GUIDE_MARKERS) bySym[m.taskId % TASK_SYMBOLS.length].push(m);
    bySym.forEach((list, tid) => {
      if (!list.length) return;
      const mMat = track(new THREE.MeshBasicMaterial({
        map: taskSymbolTexs[tid],
        transparent: true,
        opacity: 0.92,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -3,
        toneMapped: false
      }));
      const inst = new THREE.InstancedMesh(markerPlane, mMat, list.length);
      list.forEach((m, idx) => {
        guideDummy.position.set(m.x, 0.024, m.z);
        guideDummy.rotation.set(0, 0, 0);
        guideDummy.scale.set(1, 1, 1);
        guideDummy.updateMatrix();
        inst.setMatrixAt(idx, guideDummy.matrix);
      });
      inst.instanceMatrix.needsUpdate = true;
      root.add(inst);
    });
  }

  // Sector Wayfinding Signposts
  if (map.PROPS.signs?.length && texStore.sectorSignTex) {
    const postGeom = track(new THREE.CylinderGeometry(0.05, 0.05, 1.9, 6));
    const boardGeom = track(new THREE.BoxGeometry(1.18, 0.62, 0.08));
    const faceGeom = track(new THREE.PlaneGeometry(1.12, 0.56));
    const signBoardMat = track(new THREE.MeshBasicMaterial({ map: texStore.sectorSignTex, toneMapped: false }));
    for (const sg of map.PROPS.signs) {
      const grp = new THREE.Group();
      grp.position.set(sg.x, 0, sg.z);
      grp.rotation.y = sg.rot || 0;
      const post = new THREE.Mesh(postGeom, cabMetalMat);
      post.position.y = 0.95;
      const box = new THREE.Mesh(boardGeom, cabMetalMat);
      box.position.y = 1.95;
      const f1 = new THREE.Mesh(faceGeom, signBoardMat);
      f1.position.set(0, 1.95, 0.044);
      const f2 = new THREE.Mesh(faceGeom, signBoardMat);
      f2.position.set(0, 1.95, -0.044);
      f2.rotation.y = Math.PI;
      grp.add(post, box, f1, f2);
      root.add(grp);
    }
  }

  // 8c. Zone Props & Strange Error/Glitch Anomalies (12 New Zones + Impossible Objects!)
  const animItems = [];
  if (map.PROPS.anomalies?.length) {
    const errMat = track(new THREE.MeshBasicMaterial({ map: texStore.glitchErrorTex, toneMapped: false }));
    const wireMat = track(new THREE.MeshBasicMaterial({ color: 0xe64cff, wireframe: true, toneMapped: false }));
    const voidDoorMat = track(new THREE.MeshBasicMaterial({ color: 0x050208 }));
    const redPipeMat = track(new THREE.MeshStandardMaterial({ color: 0x6b2820, roughness: 0.45, metalness: 0.72 }));
    const houseWallMat = track(new THREE.MeshStandardMaterial({ color: 0xded9c4, roughness: 0.85 }));
    const houseRoofMat = track(new THREE.MeshStandardMaterial({ color: 0x3b2d28, roughness: 0.88 }));
    const winGlowMat = track(new THREE.MeshBasicMaterial({ color: 0xffd27a, toneMapped: false }));
    const transMat = track(new THREE.MeshStandardMaterial({ color: 0x26342c, roughness: 0.48, metalness: 0.65 }));
    const emeraldGlowMat = track(new THREE.MeshBasicMaterial({ color: 0x4eff96, toneMapped: false }));
    const bioVeinMat = track(new THREE.MeshStandardMaterial({ color: 0x0a0708, roughness: 0.28, metalness: 0.25 }));
    const voidBlackMat = voidDoorMat;
    const doorFrameMat = track(new THREE.MeshStandardMaterial({ map: texStore.deskWood, color: 0x6b4829, roughness: 0.72 }));
    const deskWoodMat = deskMat;
    const amberGlowMat = track(new THREE.MeshBasicMaterial({ color: 0xffc658, toneMapped: false }));
    const royalBlueMat = track(new THREE.MeshStandardMaterial({ color: 0x164ea6, roughness: 0.72 }));
    const cobaltDrapesMat = track(new THREE.MeshStandardMaterial({ color: 0x1d58d8, emissive: 0x071a4a, emissiveIntensity: 0.55, roughness: 0.82 }));
    const greenCushionMat = track(new THREE.MeshStandardMaterial({ color: 0x1e5c3a, roughness: 0.78 }));
    const oakChairMat = track(new THREE.MeshStandardMaterial({ map: texStore.deskWood, color: 0x8f5e34, roughness: 0.65 }));
    const whitePaintMat = track(new THREE.MeshStandardMaterial({ color: 0xf0ede6, roughness: 0.68 }));
    const chromeMat = track(new THREE.MeshStandardMaterial({ color: 0xd0d6dc, roughness: 0.22, metalness: 0.88 }));
    const orangeConeMat = track(new THREE.MeshStandardMaterial({ color: 0xe64d14, roughness: 0.55 }));
    const nightSkyMat = track(new THREE.MeshBasicMaterial({ map: texStore.nightCitySkyTex, toneMapped: false }));
    const mallSignMat = track(new THREE.MeshBasicMaterial({ map: texStore.mallSignTex, toneMapped: false }));
    const dollarSignMat = track(new THREE.MeshBasicMaterial({ map: texStore.dollarSignTex, toneMapped: false }));
    const openNeonMat = track(new THREE.MeshBasicMaterial({ map: texStore.openNeonTex, toneMapped: false }));
    const stopSignMat = track(new THREE.MeshBasicMaterial({ map: texStore.stopSignTex, toneMapped: false }));
    const roadWorkMat = track(new THREE.MeshBasicMaterial({ map: texStore.roadWorkTex, toneMapped: false }));
    const paintingMat = track(new THREE.MeshStandardMaterial({ map: texStore.paintingTex, roughness: 0.65 }));
    const muralMat = track(new THREE.MeshStandardMaterial({ map: texStore.unrealizedMuralTex, roughness: 0.88 }));
    const bloodSmearMat = track(new THREE.MeshStandardMaterial({ color: 0x5c080a, roughness: 0.35, metalness: 0.12 }));
    const blueTapeMat = track(new THREE.MeshBasicMaterial({ color: 0x2678ff, toneMapped: false }));
    const paleGlobeMat = track(new THREE.MeshBasicMaterial({ color: 0xfff4cf, toneMapped: false }));
    const foliageMat = track(new THREE.MeshStandardMaterial({ color: 0x2a4a24, roughness: 0.78 }));
    const roadStripeMat = track(new THREE.MeshStandardMaterial({ color: 0xe2b12b, roughness: 0.85 }));

    const buildChair = (cushionMat, px, pz, rotY, tiltX = 0, tiltZ = 0, py = 0) => {
      const ch = new THREE.Group();
      ch.position.set(px, py, pz);
      ch.rotation.set(tiltX, rotY, tiltZ);
      const seat = new THREE.Mesh(track(new THREE.BoxGeometry(0.48, 0.08, 0.48)), cushionMat);
      seat.position.y = 0.44;
      const back = new THREE.Mesh(track(new THREE.BoxGeometry(0.46, 0.46, 0.08)), cushionMat);
      back.position.set(0, 0.72, -0.21);
      ch.add(seat, back);
      for (const lx of [-0.20, 0.20]) for (const lz of [-0.20, 0.20]) {
        const leg = new THREE.Mesh(track(new THREE.BoxGeometry(0.055, 0.44, 0.055)), oakChairMat);
        leg.position.set(lx, 0.22, lz);
        ch.add(leg);
      }
      ch.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
      return ch;
    };

    const buildCeilingFan = (px, pz, scale = 1.0) => {
      const fanRoot = new THREE.Group();
      fanRoot.position.set(px, WH - 0.34, pz);
      fanRoot.scale.setScalar(scale);
      const stem = new THREE.Mesh(track(new THREE.CylinderGeometry(0.05, 0.05, 0.34, 8)), whitePaintMat);
      stem.position.y = 0.17;
      const bowl = new THREE.Mesh(track(new THREE.SphereGeometry(0.18, 10, 8)), paleGlobeMat);
      bowl.scale.set(1, 0.6, 1);
      bowl.position.y = -0.08;
      const blades = new THREE.Group();
      for (let b = 0; b < 5; b++) {
        const bl = new THREE.Mesh(track(new THREE.BoxGeometry(0.16, 0.025, 0.85)), oakChairMat);
        const pivot = new THREE.Group();
        pivot.rotation.y = (b * Math.PI * 2) / 5;
        bl.position.z = 0.52;
        pivot.add(bl);
        blades.add(pivot);
      }
      fanRoot.add(stem, bowl, blades);
      animItems.push({ mesh: blades, kind: 'fan_y', baseY: 0 });
      return fanRoot;
    };

    for (const an of map.PROPS.anomalies) {
      const ag = new THREE.Group();
      ag.position.set(an.x, 0, an.z);
      ag.rotation.y = an.rot || 0;

      if (an.kind === 'error_cube') {
        const cube = new THREE.Mesh(track(new THREE.BoxGeometry(1.15, 1.15, 1.15)), errMat);
        cube.position.y = 1.65;
        ag.add(cube);
        animItems.push({ mesh: cube, baseY: 1.65, kind: 'spin' });
      } else if (an.kind === 'noclip_frame') {
        const frame = new THREE.Mesh(track(new THREE.BoxGeometry(1.75, 2.95, 0.26)), wireMat);
        frame.position.y = 1.5;
        const abyss = new THREE.Mesh(track(new THREE.PlaneGeometry(1.5, 2.7)), voidDoorMat);
        abyss.position.y = 1.5;
        ag.add(frame, abyss);
      } else if (an.kind === 'floating_door') {
        const door = new THREE.Mesh(track(new THREE.BoxGeometry(1.22, 2.35, 0.14)), track(new THREE.MeshStandardMaterial({ map: texStore.exitDoorTex, roughness: 0.6 })));
        door.position.y = 2.1;
        ag.add(door);
        animItems.push({ mesh: door, baseY: 2.1, kind: 'bob' });
      } else if (an.kind === 'upside_down_desk') {
        const top = new THREE.Mesh(track(new THREE.BoxGeometry(1.4, 0.08, 0.8)), deskMat);
        top.position.y = WH - 0.78;
        ag.add(top);
        const legG = track(new THREE.BoxGeometry(0.08, 0.74, 0.08));
        for (const lx of [-0.6, 0.6]) for (const lz of [-0.3, 0.3]) {
          const leg = new THREE.Mesh(legG, cabMetalMat);
          leg.position.set(lx, WH - 0.37, lz);
          ag.add(leg);
        }
      } else if (an.kind === 'duplicate_chairs') {
        for (let d = 0; d < 3; d++) {
          const seat = new THREE.Mesh(track(new THREE.BoxGeometry(0.52, 0.08, 0.52)), d === 1 ? errMat : deskMat);
          seat.position.set(d * 0.12, 0.46 + d * 0.03, d * 0.10);
          seat.rotation.y = d * 0.18;
          const back = new THREE.Mesh(track(new THREE.BoxGeometry(0.52, 0.55, 0.08)), d === 1 ? errMat : cabMetalMat);
          back.position.set(d * 0.12, 0.75 + d * 0.03, d * 0.10 - 0.22);
          back.rotation.y = d * 0.18;
          ag.add(seat, back);
        }
      } else if (an.kind === 'async_gate_arch') {
        const pillarG = track(new THREE.BoxGeometry(0.85, WH, 0.95));
        const pL = new THREE.Mesh(pillarG, cabMetalMat); pL.position.set(-2.3, WH * 0.5, 0);
        const pR = new THREE.Mesh(pillarG, cabMetalMat); pR.position.set(2.3, WH * 0.5, 0);
        const beam = new THREE.Mesh(track(new THREE.BoxGeometry(5.5, 0.92, 1.05)), track(new THREE.MeshStandardMaterial({ map: texStore.warnTex })));
        beam.position.set(0, WH - 0.46, 0);
        ag.add(pL, pR, beam);
      } else if (an.kind === 'survey_tripod') {
        const cam = new THREE.Mesh(track(new THREE.BoxGeometry(0.24, 0.22, 0.34)), track(new THREE.MeshStandardMaterial({ color: 0xe69c24 })));
        cam.position.y = 1.48;
        const beam = new THREE.Mesh(track(new THREE.CylinderGeometry(0.01, 0.01, 2.2, 5)), track(new THREE.MeshBasicMaterial({ color: 0xff2820, toneMapped: false })));
        beam.rotation.x = Math.PI / 2; beam.position.set(0, 1.48, -1.2);
        ag.add(cam, beam);
        for (let k = 0; k < 3; k++) {
          const leg = new THREE.Mesh(track(new THREE.CylinderGeometry(0.025, 0.02, 1.55, 6)), cabMetalMat);
          const a = (k / 3) * Math.PI * 2;
          leg.position.set(Math.sin(a) * 0.25, 0.72, Math.cos(a) * 0.25);
          leg.rotation.set(Math.cos(a) * 0.22, 0, -Math.sin(a) * 0.22);
          ag.add(leg);
        }
      } else if (an.kind === 'suburb_house') {
        const body = new THREE.Mesh(track(new THREE.BoxGeometry(3.2, 2.75, 3.2)), houseWallMat);
        body.position.y = 1.375;
        const roof = new THREE.Mesh(track(new THREE.ConeGeometry(2.55, 1.15, 4)), houseRoofMat);
        roof.position.y = 3.32; roof.rotation.y = Math.PI / 4;
        const door = new THREE.Mesh(track(new THREE.BoxGeometry(0.75, 1.75, 0.08)), deskMat);
        door.position.set(0, 0.88, 1.62);
        const winL = new THREE.Mesh(track(new THREE.PlaneGeometry(0.65, 0.65)), winGlowMat);
        winL.position.set(-0.92, 1.55, 1.62);
        const winR = new THREE.Mesh(track(new THREE.PlaneGeometry(0.65, 0.65)), winGlowMat);
        winR.position.set(0.92, 1.55, 1.62);
        ag.add(body, roof, door, winL, winR);
      } else if (an.kind === 'tricycle_toy') {
        const wheelG = track(new THREE.TorusGeometry(0.18, 0.035, 6, 12));
        const redToyMat = track(new THREE.MeshStandardMaterial({ color: 0xc42020, roughness: 0.45 }));
        const fW = new THREE.Mesh(wheelG, cabMetalMat); fW.position.set(0, 0.22, -0.32); fW.rotation.y = Math.PI / 2;
        const frame = new THREE.Mesh(track(new THREE.BoxGeometry(0.08, 0.36, 0.56)), redToyMat); frame.position.set(0, 0.32, 0);
        ag.add(fW, frame);
      } else if (an.kind === 'red_pipe_tower') {
        for (let p = 0; p < 3; p++) {
          const pipe = new THREE.Mesh(track(new THREE.CylinderGeometry(0.18, 0.18, WH, 10)), redPipeMat);
          pipe.position.set((p - 1) * 0.42, WH * 0.5, 0);
          ag.add(pipe);
        }
      } else if (an.kind === 'transformer_bank') {
        const blk = new THREE.Mesh(track(new THREE.BoxGeometry(1.5, 2.25, 1.1)), transMat);
        blk.position.y = 1.125;
        const bar = new THREE.Mesh(track(new THREE.BoxGeometry(1.1, 0.14, 0.08)), emeraldGlowMat);
        bar.position.set(0, 1.65, 0.56);
        ag.add(blk, bar);
      } else if (an.kind === 'ceiling_truss_drop') {
        const tile = new THREE.Mesh(track(new THREE.BoxGeometry(2.1, 0.08, 1.4)), track(new THREE.MeshStandardMaterial({ color: 0xc2b890, roughness: 0.9 })));
        tile.position.set(0, 2.45, 0);
        tile.rotation.set(0.28, 0.15, -0.32);
        ag.add(tile);
      } else if (an.kind === 'bio_tendril_cluster') {
        for (let k = 0; k < 5; k++) {
          const vine = new THREE.Mesh(track(new THREE.CylinderGeometry(0.03, 0.09, 2.2 + (k % 2) * 0.7, 6)), bioVeinMat);
          vine.position.set(Math.sin(k * 1.4) * 0.42, 0.85, Math.cos(k * 1.4) * 0.42);
          vine.rotation.set(Math.cos(k) * 0.35, 0, Math.sin(k) * 0.35);
          ag.add(vine);
        }
      } else if (an.kind === 'static_radio') {
        const rad = new THREE.Mesh(track(new THREE.BoxGeometry(0.46, 0.32, 0.24)), cabMetalMat);
        rad.position.y = 0.16;
        const scr = new THREE.Mesh(track(new THREE.PlaneGeometry(0.32, 0.18)), track(new THREE.MeshBasicMaterial({ map: texStore.crtScreenTex, toneMapped: false })));
        scr.position.set(0, 0.18, 0.125);
        ag.add(rad, scr);
      } else if (an.kind === 'ff1_wall_ladder_hatch') {
        // Found Footage #1 (02:01): Yellow wall pillar with high dark square hatch + silver metal ladder + green fluorescent light
        const col = new THREE.Mesh(track(new THREE.BoxGeometry(2.1, WH, 0.9)), wallMaterials.yellow);
        col.position.set(0, WH * 0.5, 0);
        const hatchVoid = new THREE.Mesh(track(new THREE.BoxGeometry(0.95, 0.95, 0.96)), voidBlackMat);
        hatchVoid.position.set(0, 2.22, 0);
        const chromeMat = track(new THREE.MeshStandardMaterial({ color: 0xc8d0d6, roughness: 0.22, metalness: 0.88 }));
        const railL = new THREE.Mesh(track(new THREE.CylinderGeometry(0.025, 0.025, 2.05, 8)), chromeMat);
        const railR = railL.clone();
        railL.position.set(-0.26, 1.02, 0.52);
        railR.position.set(0.26, 1.02, 0.52);
        ag.add(col, hatchVoid, railL, railR);
        for (let r = 0; r < 7; r++) {
          const rung = new THREE.Mesh(track(new THREE.CylinderGeometry(0.018, 0.018, 0.52, 8)), chromeMat);
          rung.rotation.z = Math.PI / 2;
          rung.position.set(0, 0.28 + r * 0.26, 0.52);
          ag.add(rung);
        }
        const greenBar = new THREE.Mesh(track(new THREE.BoxGeometry(0.84, 0.08, 0.16)), emeraldGlowMat);
        greenBar.position.set(0, 2.68, 0.52);
        ag.add(greenBar);
      } else if (an.kind === 'ff1_dont_move_wall') {
        // Found Footage #1 (03:21): Wall with spray-painted "DON'T MOVE / STAY STILL", wide eyes/nose & black arrows
        const wMesh = new THREE.Mesh(track(new THREE.BoxGeometry(2.8, WH, 0.36)), wallMaterials.yellow);
        wMesh.position.y = WH * 0.5;
        const dmMat = track(new THREE.MeshBasicMaterial({ map: texStore.dontMoveTex, transparent: true, depthWrite: false }));
        const decF = new THREE.Mesh(track(new THREE.PlaneGeometry(2.3, 2.1)), dmMat);
        decF.position.set(0, 1.62, 0.19);
        const decB = decF.clone();
        decB.rotation.y = Math.PI;
        decB.position.set(0, 1.62, -0.19);
        ag.add(wMesh, decF, decB);
      } else if (an.kind === 'ff1_recursive_portals') {
        // Found Footage #1 (03:33 & 04:19): Series of aligned doorway portal frames creating infinite hall-of-mirrors look
        for (let i = 0; i < 4; i++) {
          const zOff = (i - 1.5) * 1.65;
          const postL = new THREE.Mesh(track(new THREE.BoxGeometry(0.45, WH, 0.28)), wallMaterials.yellow);
          const postR = postL.clone();
          postL.position.set(-0.88, WH * 0.5, zOff);
          postR.position.set(0.88, WH * 0.5, zOff);
          const lintel = new THREE.Mesh(track(new THREE.BoxGeometry(2.2, 0.9, 0.28)), wallMaterials.yellow);
          lintel.position.set(0, WH - 0.45, zOff);
          ag.add(postL, postR, lintel);
        }
      } else if (an.kind === 'ff1_handrail_stairs') {
        // Found Footage #1 (05:17): Descending staircase with wooden handrail & side walls
        for (let s = 0; s < 7; s++) {
          const step = new THREE.Mesh(track(new THREE.BoxGeometry(1.6, 0.22 + s * 0.22, 0.38)), wallMaterials.manila);
          step.position.set(0, (0.22 + s * 0.22) * 0.5, (s - 3) * 0.38);
          ag.add(step);
        }
        const rail = new THREE.Mesh(track(new THREE.CylinderGeometry(0.03, 0.03, 2.9, 8)), doorFrameMat);
        rail.rotation.x = 0.52;
        rail.position.set(0.76, 1.48, 0);
        ag.add(rail);
      } else if (an.kind === 'ff1_lone_chair_window') {
        // Found Footage #1 (05:28): White plaster gallery wall with dark window & lone brown wooden chair facing it
        const wWall = new THREE.Mesh(track(new THREE.BoxGeometry(2.4, WH, 0.28)), wallMaterials.white);
        wWall.position.set(0, WH * 0.5, -0.8);
        const darkWin = new THREE.Mesh(track(new THREE.BoxGeometry(0.88, 0.96, 0.32)), voidBlackMat);
        darkWin.position.set(0, 1.65, -0.8);
        const seat = new THREE.Mesh(track(new THREE.BoxGeometry(0.48, 0.06, 0.48)), deskWoodMat);
        seat.position.set(0, 0.46, 0.35);
        const back = new THREE.Mesh(track(new THREE.BoxGeometry(0.48, 0.52, 0.06)), deskWoodMat);
        back.position.set(0, 0.74, 0.56);
        ag.add(wWall, darkWin, seat, back);
        for (const [lx, lz] of [[-0.2, 0.15], [0.2, 0.15], [-0.2, 0.55], [0.2, 0.55]]) {
          const leg = new THREE.Mesh(track(new THREE.BoxGeometry(0.05, 0.46, 0.05)), deskWoodMat);
          leg.position.set(lx, 0.23, lz);
          ag.add(leg);
        }
      } else if (an.kind === 'ff1_window_atrium_wall') {
        // Found Footage #1 (05:40): Tall white hotel/hospital atrium wall with 3x5 grid of 15 dark square windows
        const facade = new THREE.Mesh(track(new THREE.BoxGeometry(3.4, WH, 0.34)), wallMaterials.white);
        facade.position.set(0, WH * 0.5, 0);
        ag.add(facade);
        for (let row = 0; row < 3; row++) {
          for (let col = 0; col < 5; col++) {
            const win = new THREE.Mesh(track(new THREE.BoxGeometry(0.42, 0.46, 0.38)), voidBlackMat);
            win.position.set((col - 2) * 0.62, 0.95 + row * 0.85, 0);
            ag.add(win);
          }
        }
      } else if (an.kind === 'ff1_red_dumpster') {
        // Found Footage #1 (05:51): Red/terracotta wheeled metal dumpster bin
        const dumpMat = track(new THREE.MeshStandardMaterial({ color: 0x9e3428, roughness: 0.62, metalness: 0.42 }));
        const body = new THREE.Mesh(track(new THREE.BoxGeometry(1.45, 0.98, 0.92)), dumpMat);
        body.position.y = 0.62;
        const lid = new THREE.Mesh(track(new THREE.BoxGeometry(1.50, 0.10, 0.96)), cabMetalMat);
        lid.position.y = 1.14;
        ag.add(body, lid);
        for (const [wx, wz] of [[-0.58, -0.36], [0.58, -0.36], [-0.58, 0.36], [0.58, 0.36]]) {
          const wh = new THREE.Mesh(track(new THREE.CylinderGeometry(0.09, 0.09, 0.06, 8)), voidBlackMat);
          wh.rotation.z = Math.PI / 2;
          wh.position.set(wx, 0.09, wz);
          ag.add(wh);
        }
      } else if (an.kind === 'ff1_keep_clear_door') {
        // Found Footage #1 (06:38-06:49): Grey metal fire door with blue "(!) Keep clear" sign + wide dark concrete steps
        const doorMesh = new THREE.Mesh(track(new THREE.BoxGeometry(1.08, 2.18, 0.12)), track(new THREE.MeshStandardMaterial({ map: texStore.keepClearTex, roughness: 0.55, metalness: 0.35 })));
        doorMesh.position.set(0, 1.09, -0.4);
        ag.add(doorMesh);
        for (let s = 0; s < 3; s++) {
          const st = new THREE.Mesh(track(new THREE.BoxGeometry(2.2, 0.14 * (s + 1), 0.45)), wallMaterials.concrete);
          st.position.set(0, 0.07 * (s + 1), 0.35 + s * 0.45);
          ag.add(st);
        }
      } else if (an.kind === 'ff2_blue_tape_grid') {
        // Found Footage #2 (00:25-01:15): Blue painter's tape '#' noclip test square on floor + yellow tape measure, orange toolbox & baseball
        const tapeMat = track(new THREE.MeshBasicMaterial({ color: 0x2668d8, toneMapped: false }));
        for (const off of [-0.42, 0.42]) {
          const s1 = new THREE.Mesh(track(new THREE.PlaneGeometry(1.35, 0.055)), tapeMat);
          s1.rotation.x = -Math.PI / 2; s1.position.set(0, 0.016, off);
          const s2 = new THREE.Mesh(track(new THREE.PlaneGeometry(0.055, 1.35)), tapeMat);
          s2.rotation.x = -Math.PI / 2; s2.position.set(off, 0.016, 0);
          ag.add(s1, s2);
        }
        const tBox = new THREE.Mesh(track(new THREE.BoxGeometry(0.46, 0.24, 0.24)), track(new THREE.MeshStandardMaterial({ color: 0xd65218, roughness: 0.48 })));
        tBox.position.set(-0.78, 0.12, -0.52);
        const tapeMeas = new THREE.Mesh(track(new THREE.BoxGeometry(0.11, 0.10, 0.06)), track(new THREE.MeshStandardMaterial({ color: 0xf2c018, roughness: 0.35 })));
        tapeMeas.position.set(0.68, 0.05, 0.48);
        const ball = new THREE.Mesh(track(new THREE.SphereGeometry(0.055, 10, 10)), track(new THREE.MeshStandardMaterial({ color: 0xf4f0e6, roughness: 0.5 })));
        ball.position.set(0.15, 0.055, 0.12);
        ag.add(tBox, tapeMeas, ball);
      } else if (an.kind === 'ff2_kitchenette') {
        // Found Footage #2 (02:38): White showroom kitchen cabinets, black countertop, stainless range hood
        const baseCab = new THREE.Mesh(track(new THREE.BoxGeometry(2.3, 0.88, 0.68)), wallMaterials.white);
        baseCab.position.set(0, 0.44, 0);
        const sideCab = new THREE.Mesh(track(new THREE.BoxGeometry(0.68, 0.88, 1.45)), wallMaterials.white);
        sideCab.position.set(-0.81, 0.44, 0.88);
        const counter = new THREE.Mesh(track(new THREE.BoxGeometry(2.36, 0.06, 0.72)), voidBlackMat);
        counter.position.set(0, 0.91, 0);
        const hood = new THREE.Mesh(track(new THREE.BoxGeometry(0.86, 0.55, 0.56)), track(new THREE.MeshStandardMaterial({ color: 0xc4ccd2, roughness: 0.25, metalness: 0.82 })));
        hood.position.set(0.35, 2.05, -0.05);
        ag.add(baseCab, sideCab, counter, hood);
      } else if (an.kind === 'ff2_grey_l_sofa') {
        // Found Footage #2 (04:19-04:35): Giant L-shaped grey sectional sofa + standalone brown wooden door
        const sofaMat = track(new THREE.MeshStandardMaterial({ color: 0x5c6066, roughness: 0.88 }));
        const secA = new THREE.Mesh(track(new THREE.BoxGeometry(2.6, 0.46, 0.92)), sofaMat);
        secA.position.set(0, 0.23, 0);
        const backA = new THREE.Mesh(track(new THREE.BoxGeometry(2.6, 0.48, 0.22)), sofaMat);
        backA.position.set(0, 0.62, -0.35);
        const secB = new THREE.Mesh(track(new THREE.BoxGeometry(0.92, 0.46, 1.85)), sofaMat);
        secB.position.set(-0.84, 0.23, 0.92);
        const sDoor = new THREE.Mesh(track(new THREE.BoxGeometry(0.92, 2.08, 0.08)), doorFrameMat);
        sDoor.position.set(1.85, 1.04, 0.4);
        ag.add(secA, backA, secB, sDoor);
      } else if (an.kind === 'ff2_crashed_sedan') {
        // Found Footage #2 (08:13-08:29): Wrecked 1980s brown/bronze sedan car crashed into yellow wall + black tire skid marks
        const carMat = track(new THREE.MeshStandardMaterial({ color: 0x6b4c35, roughness: 0.36, metalness: 0.58 }));
        const glassMat = track(new THREE.MeshStandardMaterial({ color: 0x162228, roughness: 0.12, metalness: 0.85 }));
        const chassis = new THREE.Mesh(track(new THREE.BoxGeometry(1.78, 0.68, 3.85)), carMat);
        chassis.position.set(0, 0.56, 0);
        const cabin = new THREE.Mesh(track(new THREE.BoxGeometry(1.56, 0.58, 1.95)), carMat);
        cabin.position.set(0, 1.14, -0.15);
        const wind = new THREE.Mesh(track(new THREE.BoxGeometry(1.58, 0.46, 1.65)), glassMat);
        wind.position.set(0, 1.12, -0.15);
        const tailLight = new THREE.Mesh(track(new THREE.BoxGeometry(1.62, 0.16, 0.06)), track(new THREE.MeshBasicMaterial({ color: 0xff3814, toneMapped: false })));
        tailLight.position.set(0, 0.64, -1.94);
        ag.add(chassis, cabin, wind, tailLight);
        for (const [wx, wz] of [[-0.88, -1.18], [0.88, -1.18], [-0.88, 1.18], [0.88, 1.18]]) {
          const tire = new THREE.Mesh(track(new THREE.CylinderGeometry(0.34, 0.34, 0.22, 12)), voidBlackMat);
          tire.rotation.z = Math.PI / 2;
          tire.position.set(wx, 0.34, wz);
          ag.add(tire);
        }
        // Long black rubber tire skid marks across the carpet behind the sedan
        const skidMat = track(new THREE.MeshBasicMaterial({ color: 0x0c0b09, transparent: true, opacity: 0.78, depthWrite: false }));
        for (const sx of [-0.72, 0.72]) {
          const skid = new THREE.Mesh(track(new THREE.PlaneGeometry(0.26, 4.8)), skidMat);
          skid.rotation.x = -Math.PI / 2;
          skid.position.set(sx, 0.015, -3.2);
          ag.add(skid);
        }
      } else if (an.kind === 'ff2_skylight_shadow') {
        // Found Footage #2 (06:49-07:06): Coffered 2x2 black skylight squares on ceiling + dark projected shadow grid on floor
        for (const [ox, oz] of [[-0.75, -0.75], [0.75, -0.75], [-0.75, 0.75], [0.75, 0.75]]) {
          const sky = new THREE.Mesh(track(new THREE.BoxGeometry(1.18, 0.16, 1.18)), voidBlackMat);
          sky.position.set(ox, WH - 0.08, oz);
          const flrShadow = new THREE.Mesh(track(new THREE.PlaneGeometry(1.12, 1.12)), track(new THREE.MeshBasicMaterial({ color: 0x0a0905, transparent: true, opacity: 0.54, depthWrite: false })));
          flrShadow.rotation.x = -Math.PI / 2;
          flrShadow.position.set(ox, 0.014, oz);
          ag.add(sky, flrShadow);
        }
      } else if (an.kind === 'ff2_balustrade_railing') {
        // Found Footage #2 (08:46-09:20): White wooden balustrade railing with spindles + built-in wall shelves
        const topRail = new THREE.Mesh(track(new THREE.BoxGeometry(3.2, 0.08, 0.12)), wallMaterials.white);
        topRail.position.set(0, 0.96, 0);
        const botRail = topRail.clone();
        botRail.position.set(0, 0.12, 0);
        ag.add(topRail, botRail);
        for (let i = -7; i <= 7; i++) {
          const bal = new THREE.Mesh(track(new THREE.BoxGeometry(0.045, 0.84, 0.045)), wallMaterials.white);
          bal.position.set(i * 0.21, 0.54, 0);
          ag.add(bal);
        }
        const shelfUnit = new THREE.Mesh(track(new THREE.BoxGeometry(1.1, 2.2, 0.42)), wallMaterials.white);
        shelfUnit.position.set(-1.95, 1.1, -0.85);
        ag.add(shelfUnit);
      } else if (an.kind === 'ff2_black_vine_nest') {
        // Found Footage #2 (09:53): Sprawling black organic Bacteria vine web radiating across floor and walls
        for (let v = 0; v < 14; v++) {
          const ang = (v / 14) * Math.PI * 2;
          const tendril = new THREE.Mesh(track(new THREE.CylinderGeometry(0.02, 0.075, 2.8, 6)), bioVeinMat);
          tendril.position.set(Math.cos(ang) * 0.85, 0.55 + (v % 3) * 0.35, Math.sin(ang) * 0.85);
          tendril.rotation.set(Math.sin(ang) * 1.1, ang, Math.cos(ang) * 1.1);
          ag.add(tendril);
        }
      } else if (an.kind === 'ff2_chrome_pool_ladder') {
        // Found Footage #2 (12:07): Vertical shaft wall with curved chrome pool ladder bars
        const chromeMat = track(new THREE.MeshStandardMaterial({ color: 0xd8e2e8, roughness: 0.18, metalness: 0.92 }));
        const shaft = new THREE.Mesh(track(new THREE.BoxGeometry(1.6, WH, 0.45)), wallMaterials.concrete);
        shaft.position.set(0, WH * 0.5, -0.35);
        ag.add(shaft);
        for (const lx of [-0.28, 0.28]) {
          const bar = new THREE.Mesh(track(new THREE.CylinderGeometry(0.026, 0.026, 2.6, 8)), chromeMat);
          bar.position.set(lx, 1.35, 0);
          const loop = new THREE.Mesh(track(new THREE.TorusGeometry(0.18, 0.026, 8, 12, Math.PI)), chromeMat);
          loop.rotation.y = Math.PI / 2;
          loop.position.set(lx, 2.65, -0.18);
          ag.add(bar, loop);
        }
        for (let r = 0; r < 6; r++) {
          const step = new THREE.Mesh(track(new THREE.BoxGeometry(0.56, 0.035, 0.09)), chromeMat);
          step.position.set(0, 0.35 + r * 0.38, 0);
          ag.add(step);
        }
      } else if (an.kind === 'ff2_green_plasma_rift') {
        // Found Footage #2 (12:57): Blinding neon-green magnetic plasma light crack between concrete walls
        const pL = new THREE.Mesh(track(new THREE.BoxGeometry(0.95, WH, 0.95)), wallMaterials.concrete);
        const pR = pL.clone();
        pL.position.set(-0.68, WH * 0.5, 0);
        pR.position.set(0.68, WH * 0.5, 0);
        const rift = new THREE.Mesh(track(new THREE.BoxGeometry(0.28, WH * 0.92, 0.28)), emeraldGlowMat);
        rift.position.set(0, WH * 0.48, 0);
        ag.add(pL, pR, rift);
      } else if (an.kind === 'ff2_crt_tv_plants') {
        // Found Footage #2 (13:14): Glowing blue CRT television flanked by two terracotta potted houseplants
        const stand = new THREE.Mesh(track(new THREE.BoxGeometry(0.76, 0.52, 0.52)), cabMetalMat);
        stand.position.y = 0.26;
        const tvBox = new THREE.Mesh(track(new THREE.BoxGeometry(0.64, 0.54, 0.48)), voidBlackMat);
        tvBox.position.y = 0.78;
        const scr = new THREE.Mesh(track(new THREE.PlaneGeometry(0.52, 0.40)), track(new THREE.MeshBasicMaterial({ map: texStore.crtScreenTex, toneMapped: false })));
        scr.position.set(0, 0.79, 0.245);
        ag.add(stand, tvBox, scr);
        const potMat = track(new THREE.MeshStandardMaterial({ color: 0x8c4326, roughness: 0.78 }));
        const leafMat = track(new THREE.MeshStandardMaterial({ color: 0x26542c, roughness: 0.68 }));
        for (const px of [-0.72, 0.72]) {
          const pot = new THREE.Mesh(track(new THREE.CylinderGeometry(0.18, 0.13, 0.34, 8)), potMat);
          pot.position.set(px, 0.17, 0.08);
          const foliage = new THREE.Mesh(track(new THREE.DodecahedronGeometry(0.28, 1)), leafMat);
          foliage.position.set(px, 0.52, 0.08);
          ag.add(pot, foliage);
        }
      } else if (an.kind === 'shopping_cart_pile') {
        // Bizarre Backrooms prop: Overturned chrome wireframe shopping carts
        const wireMat = track(new THREE.MeshStandardMaterial({ color: 0xbac4cc, roughness: 0.32, metalness: 0.85, wireframe: true }));
        const c1 = new THREE.Mesh(track(new THREE.BoxGeometry(0.58, 0.52, 0.88)), wireMat);
        c1.position.set(0, 0.42, 0);
        const c2 = c1.clone();
        c2.position.set(0.22, 0.74, -0.18);
        c2.rotation.set(0.65, 0.42, 1.12);
        ag.add(c1, c2);
      } else if (an.kind === 'mannequin_circle') {
        // Bizarre Backrooms prop: Faceless off-white department-store mannequins standing in a circle
        const manMat = track(new THREE.MeshStandardMaterial({ color: 0xd8d2c5, roughness: 0.58 }));
        for (let m = 0; m < 3; m++) {
          const a = (m / 3) * Math.PI * 2;
          const mx = Math.cos(a) * 0.62, mz = Math.sin(a) * 0.62;
          const torso = new THREE.Mesh(track(new THREE.CylinderGeometry(0.16, 0.11, 1.18, 8)), manMat);
          torso.position.set(mx, 0.88, mz);
          const head = new THREE.Mesh(track(new THREE.SphereGeometry(0.13, 10, 10)), manMat);
          head.scale.set(0.85, 1.2, 0.92);
          head.position.set(mx, 1.64, mz);
          ag.add(torso, head);
        }
      } else if (an.kind === 'rotary_payphone') {
        // Bizarre Backrooms prop: Vintage payphone mounted on a freestanding yellow pillar with dangling handset
        const pil = new THREE.Mesh(track(new THREE.BoxGeometry(0.52, 2.3, 0.52)), wallMaterials.yellow);
        pil.position.y = 1.15;
        const box = new THREE.Mesh(track(new THREE.BoxGeometry(0.28, 0.46, 0.18)), cabMetalMat);
        box.position.set(0, 1.38, 0.32);
        const handset = new THREE.Mesh(track(new THREE.CylinderGeometry(0.025, 0.025, 0.22, 6)), voidBlackMat);
        handset.position.set(0.08, 0.86, 0.34);
        handset.rotation.z = 0.35;
        ag.add(pil, box, handset);
      } else if (an.kind === 'vending_machine_sideways') {
        // Bizarre Backrooms prop: Toppled glowing soda vending machine lying sideways on the carpet
        const vBody = new THREE.Mesh(track(new THREE.BoxGeometry(1.92, 0.88, 0.96)), cabMetalMat);
        vBody.position.y = 0.44;
        const vFront = new THREE.Mesh(track(new THREE.PlaneGeometry(1.72, 0.74)), amberGlowMat);
        vFront.position.set(0, 0.46, 0.485);
        ag.add(vBody, vFront);
      } else if (an.kind === 'mb_suburb_road_strip') {
        // Indoor suburban street strip: center bold yellow divider, concrete sidewalks, white picket fence, red mailbox & STOP sign
        const stripe = new THREE.Mesh(track(new THREE.BoxGeometry(1.6, 0.02, 18.0)), roadStripeMat);
        stripe.position.y = 0.015;
        ag.add(stripe);
        for (const sx of [-3.4, 3.4]) {
          const sw = new THREE.Mesh(track(new THREE.BoxGeometry(1.4, 0.14, 18.0)), wallMaterials.concrete);
          sw.position.set(sx, 0.07, 0);
          sw.receiveShadow = true;
          ag.add(sw);
        }
        // White picket fence segment + iconic red mailbox + miniature suburban STOP sign
        for (let f = -3; f <= 3; f++) {
          const pk = new THREE.Mesh(track(new THREE.BoxGeometry(0.11, 0.92, 0.04)), whitePaintMat);
          pk.position.set(-4.3, 0.46, f * 0.45);
          ag.add(pk);
        }
        const mPost = new THREE.Mesh(track(new THREE.BoxGeometry(0.08, 1.05, 0.08)), whitePaintMat);
        mPost.position.set(-3.1, 0.52, -2.5);
        const mBox = new THREE.Mesh(track(new THREE.BoxGeometry(0.24, 0.24, 0.42)), redPipeMat);
        mBox.position.set(-3.1, 1.12, -2.5);
        const sPost = new THREE.Mesh(track(new THREE.CylinderGeometry(0.04, 0.04, 1.9, 6)), chromeMat);
        sPost.position.set(3.1, 0.95, 2.2);
        const sPlate = new THREE.Mesh(track(new THREE.PlaneGeometry(0.65, 0.65)), stopSignMat);
        sPlate.position.set(3.1, 1.95, 2.25);
        ag.add(mPost, mBox, sPost, sPlate);
      } else if (an.kind === 'mb_ceiling_fan_unit') {
        ag.add(buildCeilingFan(0, 0, 1.65));
      } else if (an.kind === 'mb_blue_chair_pair') {
        const hw = new THREE.Mesh(track(new THREE.BoxGeometry(2.6, 1.25, 0.28)), wallMaterials.yellow);
        hw.position.set(0, 0.625, -0.65);
        const cap = new THREE.Mesh(track(new THREE.BoxGeometry(2.68, 0.08, 0.34)), deskWoodMat);
        cap.position.set(0, 1.28, -0.65);
        hw.castShadow = hw.receiveShadow = true;
        ag.add(hw, cap, buildChair(royalBlueMat, -0.58, 0.1, 0), buildChair(royalBlueMat, 0.58, 0.1, 0));
      } else if (an.kind === 'mb_office_bright_pillar') {
        // Warm bright glowing central pillar surrounded by dark cubicles + ceiling bunting pennants
        const pillar = new THREE.Mesh(track(new THREE.BoxGeometry(1.42, WH, 1.42)), wallMaterials.manila);
        pillar.position.y = WH * 0.5;
        pillar.receiveShadow = pillar.castShadow = true;
        const glowBand = new THREE.Mesh(track(new THREE.BoxGeometry(1.52, 0.18, 1.52)), paleGlobeMat);
        glowBand.position.y = WH - 0.12;
        ag.add(pillar, glowBand);
        for (let b = -3; b <= 3; b++) {
          const pennant = new THREE.Mesh(track(new THREE.ConeGeometry(0.14, 0.28, 3)), b % 2 === 0 ? orangeConeMat : royalBlueMat);
          pennant.position.set(b * 0.72, WH - 0.42, 2.4);
          pennant.rotation.x = Math.PI;
          ag.add(pennant);
        }
      } else if (an.kind === 'mb_skybridge_windows') {
        // Screenshot 055134: Red-lit skybridge flanked by tall night skyscraper window bays, orange cones & knocked shelves
        for (const wx of [-2.4, 2.4]) {
          const skyPane = new THREE.Mesh(track(new THREE.PlaneGeometry(7.2, WH - 0.35)), nightSkyMat);
          skyPane.position.set(wx, WH * 0.5, 0);
          skyPane.rotation.y = wx < 0 ? Math.PI / 2 : -Math.PI / 2;
          ag.add(skyPane);
          for (let m = -2; m <= 2; m++) {
            const mullion = new THREE.Mesh(track(new THREE.BoxGeometry(0.12, WH, 0.12)), voidBlackMat);
            mullion.position.set(wx * 0.96, WH * 0.5, m * 1.45);
            ag.add(mullion);
          }
        }
        for (const [cx, cz] of [[-0.65, 1.2], [0.55, -1.8]]) {
          const cone = new THREE.Mesh(track(new THREE.ConeGeometry(0.22, 0.68, 8)), orangeConeMat);
          cone.position.set(cx, 0.34, cz);
          cone.castShadow = true;
          ag.add(cone);
        }
        const shelf = new THREE.Mesh(track(new THREE.BoxGeometry(1.5, 0.48, 0.65)), cabMetalMat);
        shelf.position.set(0.45, 0.28, 0.25);
        shelf.rotation.set(0.22, 0.45, 0.42);
        shelf.castShadow = true;
        ag.add(shelf);
      } else if (an.kind === 'mb_brick_beam_alcove') {
        // Screenshots 055234 & 055255: Brick wall w/ coat hooks, recessed glowing window alcoves & warm diagonal floor spill
        const brickSec = new THREE.Mesh(track(new THREE.BoxGeometry(0.26, WH, 6.2)), wallMaterials.brick);
        brickSec.position.set(2.1, WH * 0.5, 0);
        brickSec.receiveShadow = brickSec.castShadow = true;
        const coatBar = new THREE.Mesh(track(new THREE.BoxGeometry(0.08, 0.12, 1.25)), deskWoodMat);
        coatBar.position.set(1.94, 1.48, 0);
        ag.add(brickSec, coatBar);
        for (const [az, rot] of [[-1.6, 0], [1.6, 0]]) {
          const alcoveWin = new THREE.Mesh(track(new THREE.PlaneGeometry(1.6, 2.2)), paleGlobeMat);
          alcoveWin.position.set(-2.2, 1.65, az);
          alcoveWin.rotation.y = Math.PI / 2;
          const beam = new THREE.Mesh(track(new THREE.PlaneGeometry(2.8, 1.7)), track(new THREE.MeshBasicMaterial({ color: 0xffdf96, transparent: true, opacity: 0.28, depthWrite: false })));
          beam.rotation.x = -Math.PI / 2;
          beam.rotation.z = -0.35;
          beam.position.set(-0.6, 0.022, az + 0.35);
          ag.add(alcoveWin, beam);
        }
      } else if (an.kind === 'mb_bicycle_prop') {
        // Screenshot 055407: Leaning red & chrome bicycles against Backrooms corridor corner
        for (const [bx, bz, mat, tilt] of [[0, 0, redPipeMat, 0.24], [0.55, -0.35, chromeMat, -0.18]]) {
          const bike = new THREE.Group();
          bike.position.set(bx, 0, bz);
          bike.rotation.z = tilt;
          for (const wz of [-0.48, 0.48]) {
            const whl = new THREE.Mesh(track(new THREE.TorusGeometry(0.32, 0.032, 6, 14)), voidBlackMat);
            whl.rotation.y = Math.PI / 2;
            whl.position.set(0, 0.32, wz);
            whl.castShadow = true;
            bike.add(whl);
          }
          const bar = new THREE.Mesh(track(new THREE.CylinderGeometry(0.025, 0.025, 1.05, 6)), mat);
          bar.rotation.x = Math.PI / 2;
          bar.position.y = 0.56;
          bike.add(bar);
          ag.add(bike);
        }
      } else if (an.kind === 'mb_tripod_creature') {
        // Screenshot 055407: Tall sinister black wireframe tripod silhouette standing inside mint green alcove
        const head = new THREE.Mesh(track(new THREE.BoxGeometry(0.32, 0.26, 0.44)), voidBlackMat);
        head.position.y = 1.98;
        const lens = new THREE.Mesh(track(new THREE.CylinderGeometry(0.08, 0.09, 0.18, 8)), chromeMat);
        lens.rotation.x = Math.PI / 2;
        lens.position.set(0, 1.98, 0.24);
        ag.add(head, lens);
        for (let l = 0; l < 3; l++) {
          const ang = (l * Math.PI * 2) / 3;
          const leg = new THREE.Mesh(track(new THREE.CylinderGeometry(0.03, 0.022, 2.08, 6)), voidBlackMat);
          leg.position.set(Math.cos(ang) * 0.36, 1.0, Math.sin(ang) * 0.36);
          leg.rotation.set(Math.sin(ang) * 0.28, 0, -Math.cos(ang) * 0.28);
          leg.castShadow = true;
          ag.add(leg);
        }
      } else if (an.kind === 'mb_courtyard_tower') {
        // Screenshot 055429: Multi-story indoor apartment tower facade fitted inside courtyard volume w/ 3 tiers of windows, shutters & mailboxes
        const towerH = WH - 0.08;
        const bldg = new THREE.Mesh(track(new THREE.BoxGeometry(3.4, towerH, 3.4)), wallMaterials.concrete);
        bldg.position.y = towerH * 0.5;
        bldg.castShadow = bldg.receiveShadow = true;
        ag.add(bldg);
        for (let fl = 0; fl < 3; fl++) {
          const wy = 0.65 + fl * 1.02;
          for (const wx of [-0.90, 0.90]) {
            const lit = (fl + (wx > 0 ? 1 : 0)) % 2 === 0;
            const win = new THREE.Mesh(track(new THREE.PlaneGeometry(0.76, 0.66)), lit ? paleGlobeMat : voidBlackMat);
            win.position.set(wx, wy, 1.72);
            const sill = new THREE.Mesh(track(new THREE.BoxGeometry(0.88, 0.05, 0.10)), whitePaintMat);
            sill.position.set(wx, wy - 0.35, 1.74);
            ag.add(win, sill);
          }
        }
        const mboxBank = new THREE.Mesh(track(new THREE.BoxGeometry(1.05, 0.42, 0.18)), chromeMat);
        mboxBank.position.set(0, 0.82, 1.76);
        ag.add(mboxBank);
      } else if (an.kind === 'mb_courtyard_tree_lamp') {
        // Courtyard potted indoor tree + glowing white globe streetlamp + park bench
        const planter = new THREE.Mesh(track(new THREE.BoxGeometry(0.95, 0.42, 0.95)), wallMaterials.brick);
        planter.position.y = 0.21;
        const trunk = new THREE.Mesh(track(new THREE.CylinderGeometry(0.11, 0.15, 2.35, 7)), oakChairMat);
        trunk.position.y = 1.38;
        const canopy = new THREE.Mesh(track(new THREE.DodecahedronGeometry(1.12, 1)), foliageMat);
        canopy.position.y = 2.75;
        canopy.castShadow = true;
        const pole = new THREE.Mesh(track(new THREE.CylinderGeometry(0.045, 0.06, 2.65, 8)), voidBlackMat);
        pole.position.set(1.25, 1.32, 0.55);
        const globe = new THREE.Mesh(track(new THREE.SphereGeometry(0.22, 12, 10)), paleGlobeMat);
        globe.position.set(1.25, 2.75, 0.55);
        ag.add(planter, trunk, canopy, pole, globe);
      } else if (an.kind === 'mb_fan_bookcase_hall') {
        // Screenshots 055447, 055630: Cozy yellow room w/ spinning 5-blade illuminated ceiling fan, white wainscot molding, painting, globe lamp & bookcase
        ag.add(buildCeilingFan(0, 0, 1.15));
        const trim = new THREE.Mesh(track(new THREE.BoxGeometry(4.2, 0.12, 0.12)), whitePaintMat);
        trim.position.set(0, 1.08, -1.75);
        const frame = new THREE.Mesh(track(new THREE.BoxGeometry(1.38, 1.02, 0.08)), oakChairMat);
        frame.position.set(-0.6, 1.95, -1.75);
        const pic = new THREE.Mesh(track(new THREE.PlaneGeometry(1.22, 0.86)), paintingMat);
        pic.position.set(-0.6, 1.95, -1.70);
        const bookcase = new THREE.Mesh(track(new THREE.BoxGeometry(1.45, 2.25, 0.48)), oakChairMat);
        bookcase.position.set(1.35, 1.12, -1.55);
        bookcase.castShadow = bookcase.receiveShadow = true;
        const tippedCab = new THREE.Mesh(track(new THREE.BoxGeometry(0.75, 1.15, 0.55)), deskWoodMat);
        tippedCab.position.set(-1.35, 0.58, 0.65);
        tippedCab.rotation.z = 0.42;
        ag.add(trim, frame, pic, bookcase, tippedCab);
      } else if (an.kind === 'mb_stop_portal') {
        // Screenshot 055701: Tall STOP signpost back/front framed against doorway portal
        const post = new THREE.Mesh(track(new THREE.CylinderGeometry(0.05, 0.05, 2.45, 6)), chromeMat);
        post.position.y = 1.225;
        const plate = new THREE.Mesh(track(new THREE.PlaneGeometry(0.95, 0.95)), stopSignMat);
        plate.position.set(0, 2.35, 0.04);
        const plateB = new THREE.Mesh(track(new THREE.PlaneGeometry(0.95, 0.95)), chromeMat);
        plateB.position.set(0, 2.35, -0.04);
        plateB.rotation.y = Math.PI;
        ag.add(post, plate, plateB);
      } else if (an.kind === 'mb_unrealized_mural_wall') {
        // Screenshots 055509 & 055516: Massive "UNREALIZED" torn plaster charcoal-red entity mural, wooden blocks, pedestal fan & floor cord
        const muralWall = new THREE.Mesh(track(new THREE.BoxGeometry(4.2, 3.3, 0.25)), wallMaterials.white);
        muralWall.position.set(0, 1.65, -1.65);
        const muralPlane = new THREE.Mesh(track(new THREE.PlaneGeometry(3.6, 2.8)), muralMat);
        muralPlane.position.set(0, 1.65, -1.51);
        const woodBlock = new THREE.Mesh(track(new THREE.BoxGeometry(0.78, 0.52, 0.78)), oakChairMat);
        woodBlock.position.set(-0.95, 0.26, 0.65);
        woodBlock.castShadow = true;
        const fanBase = new THREE.Mesh(track(new THREE.CylinderGeometry(0.24, 0.28, 0.08, 10)), cabMetalMat);
        fanBase.position.set(0.95, 0.04, 0.45);
        const fanStem = new THREE.Mesh(track(new THREE.CylinderGeometry(0.03, 0.03, 1.28, 6)), chromeMat);
        fanStem.position.set(0.95, 0.68, 0.45);
        const fanCage = new THREE.Mesh(track(new THREE.TorusGeometry(0.26, 0.025, 6, 14)), cabMetalMat);
        fanCage.position.set(0.95, 1.35, 0.45);
        const cord = new THREE.Mesh(track(new THREE.BoxGeometry(1.85, 0.03, 0.04)), voidBlackMat);
        cord.position.set(0.15, 0.02, 0.22);
        cord.rotation.y = 0.45;
        ag.add(muralWall, muralPlane, woodBlock, fanBase, fanStem, fanCage, cord);
      } else if (an.kind === 'mb_mall_storefront') {
        // Screenshot 055522: Glowing 1990s Shopping Mall storefront (DENIAL FAMILY / MIILVE wear), brick tree planter & spilled shopping cart
        const header = new THREE.Mesh(track(new THREE.BoxGeometry(5.6, 1.05, 0.42)), mallSignMat);
        header.position.set(0, 2.95, -1.5);
        const glass = new THREE.Mesh(track(new THREE.PlaneGeometry(5.2, 2.35)), track(new THREE.MeshBasicMaterial({ color: 0xffe4a8, transparent: true, opacity: 0.42 })));
        glass.position.set(0, 1.25, -1.55);
        const planter = new THREE.Mesh(track(new THREE.BoxGeometry(1.45, 0.62, 1.45)), wallMaterials.brick);
        planter.position.set(-1.6, 0.31, 1.25);
        const treeT = new THREE.Mesh(track(new THREE.CylinderGeometry(0.12, 0.16, 2.4, 7)), oakChairMat);
        treeT.position.set(-1.6, 1.5, 1.25);
        const treeL = new THREE.Mesh(track(new THREE.DodecahedronGeometry(1.05, 1)), foliageMat);
        treeL.position.set(-1.6, 2.85, 1.25);
        const cart = new THREE.Mesh(track(new THREE.BoxGeometry(0.62, 0.56, 0.92)), track(new THREE.MeshStandardMaterial({ color: 0xbac4cc, wireframe: true, roughness: 0.3, metalness: 0.85 })));
        cart.position.set(1.4, 0.38, 1.35);
        cart.rotation.set(0.35, 0.65, 0.92);
        ag.add(header, glass, planter, treeT, treeL, cart);
      } else if (an.kind === 'mb_sunken_gondola') {
        // Screenshot 055528: Store shelving gondolas **tilting & sinking sideways directly into the tile/carpet floor**
        const gondola = new THREE.Group();
        gondola.position.y = -0.32;
        gondola.rotation.set(0.08, 0, -0.26);
        const backP = new THREE.Mesh(track(new THREE.BoxGeometry(2.35, 1.95, 0.14)), whitePaintMat);
        backP.position.y = 0.975;
        gondola.add(backP);
        for (let sh = 0; sh < 4; sh++) {
          const deck = new THREE.Mesh(track(new THREE.BoxGeometry(2.35, 0.06, 0.88)), whitePaintMat);
          deck.position.y = 0.35 + sh * 0.42;
          gondola.add(deck);
          for (let pk = -2; pk <= 2; pk++) {
            const item = new THREE.Mesh(track(new THREE.BoxGeometry(0.24, 0.24, 0.24)), pk % 2 === 0 ? orangeConeMat : royalBlueMat);
            item.position.set(pk * 0.42, 0.50 + sh * 0.42, 0.25);
            gondola.add(item);
          }
        }
        gondola.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
        ag.add(gondola);
      } else if (an.kind === 'mb_diner_sunken_fridges') {
        // Screenshot 055535: Neon OPEN sign, ceiling fan, white diner tables & double stainless fridges sinking halfway into carpet
        ag.add(buildCeilingFan(-1.2, 0, 1.1));
        const neon = new THREE.Mesh(track(new THREE.PlaneGeometry(1.25, 0.62)), openNeonMat);
        neon.position.set(0, 2.35, -2.4);
        const trackRail = new THREE.Mesh(track(new THREE.BoxGeometry(2.8, 0.06, 0.08)), whitePaintMat);
        trackRail.position.set(0.8, WH - 0.1, -1.6);
        ag.add(neon, trackRail);
        for (let tx of [-1.4, 0, 1.4]) {
          const tbl = new THREE.Mesh(track(new THREE.BoxGeometry(0.88, 0.06, 0.88)), whitePaintMat);
          tbl.position.set(tx, 0.74, 1.5);
          const col = new THREE.Mesh(track(new THREE.CylinderGeometry(0.05, 0.05, 0.74, 8)), chromeMat);
          col.position.set(tx, 0.37, 1.5);
          ag.add(tbl, col);
        }
        const fridgeGrp = new THREE.Group();
        fridgeGrp.position.set(1.85, -0.45, -0.4);
        fridgeGrp.rotation.set(0.22, -0.35, -0.32);
        const body = new THREE.Mesh(track(new THREE.BoxGeometry(1.75, 2.15, 0.92)), chromeMat);
        body.position.y = 1.075;
        const winL = new THREE.Mesh(track(new THREE.PlaneGeometry(0.68, 1.55)), paleGlobeMat);
        winL.position.set(-0.42, 1.25, 0.47);
        const winR = winL.clone();
        winR.position.x = 0.42;
        fridgeGrp.add(body, winL, winR);
        ag.add(fridgeGrp);
      } else if (an.kind === 'mb_parked_van') {
        // Screenshot 055546: Parked white utility box van + orange ROAD WORK AHEAD sign + dangling ceiling light fixture
        const chassis = new THREE.Mesh(track(new THREE.BoxGeometry(2.65, 1.65, 1.85)), whitePaintMat);
        chassis.position.y = 1.15;
        const nose = new THREE.Mesh(track(new THREE.BoxGeometry(0.95, 0.95, 1.78)), whitePaintMat);
        nose.position.set(1.55, 0.82, 0);
        const windshield = new THREE.Mesh(track(new THREE.PlaneGeometry(0.75, 1.45)), voidBlackMat);
        windshield.rotation.y = Math.PI / 2;
        windshield.position.set(1.36, 1.42, 0);
        ag.add(chassis, nose, windshield);
        for (const [wx, wz] of [[-0.95, -0.88], [-0.95, 0.88], [1.15, -0.88], [1.15, 0.88]]) {
          const wheel = new THREE.Mesh(track(new THREE.CylinderGeometry(0.36, 0.36, 0.24, 12)), voidBlackMat);
          wheel.rotation.x = Math.PI / 2;
          wheel.position.set(wx, 0.36, wz);
          ag.add(wheel);
        }
        const rwPost = new THREE.Mesh(track(new THREE.BoxGeometry(0.08, 1.85, 0.08)), chromeMat);
        rwPost.position.set(-1.95, 0.92, 1.25);
        const rwBoard = new THREE.Mesh(track(new THREE.PlaneGeometry(0.98, 0.98)), roadWorkMat);
        rwBoard.position.set(-1.95, 1.85, 1.30);
        rwBoard.rotation.z = Math.PI / 4;
        const dangler = new THREE.Mesh(track(new THREE.BoxGeometry(1.4, 0.08, 0.36)), paleGlobeMat);
        dangler.position.set(0.2, WH - 0.55, 1.6);
        dangler.rotation.set(0.25, 0.2, 0.38);
        ag.add(rwPost, rwBoard, dangler);
      } else if (an.kind === 'mb_dollar_tunnel') {
        // Screenshot 055616: Glowing amber DOLLAR GENER storefront portal emerging inside pitch dark corridor
        const banner = new THREE.Mesh(track(new THREE.BoxGeometry(4.2, 0.88, 0.32)), dollarSignMat);
        banner.position.set(0, 2.75, -1.2);
        const entryGlow = new THREE.Mesh(track(new THREE.PlaneGeometry(3.8, 2.35)), amberGlowMat);
        entryGlow.position.set(0, 1.18, -1.25);
        ag.add(banner, entryGlow);
      } else if (an.kind === 'mb_grey_staircase_tape') {
        // Screenshot 055641: Grey carpet/drywall room w/ enclosed oak staircase ascending into ceiling + bright blue painter's-tape doorway outline + sofas
        for (let st = 0; st < 11; st++) {
          const step = new THREE.Mesh(track(new THREE.BoxGeometry(1.25, 0.28, 0.32)), wallMaterials.grey_drywall);
          step.position.set(-1.6, 0.14 + st * 0.28, -1.4 + st * 0.28);
          step.castShadow = step.receiveShadow = true;
          ag.add(step);
        }
        const rail = new THREE.Mesh(track(new THREE.BoxGeometry(0.08, 0.12, 3.2)), oakChairMat);
        rail.position.set(-0.98, 1.85, 0);
        rail.rotation.x = -0.68;
        ag.add(rail);
        // Blue painter's-tape doorframe rectangle on grey drywall
        const tWall = new THREE.Mesh(track(new THREE.BoxGeometry(2.8, WH, 0.22)), wallMaterials.grey_drywall);
        tWall.position.set(1.6, WH * 0.5, -1.6);
        const tL = new THREE.Mesh(track(new THREE.BoxGeometry(0.06, 2.18, 0.04)), blueTapeMat);
        tL.position.set(1.05, 1.09, -1.47);
        const tR = tL.clone();
        tR.position.x = 2.15;
        const tTop = new THREE.Mesh(track(new THREE.BoxGeometry(1.16, 0.06, 0.04)), blueTapeMat);
        tTop.position.set(1.6, 2.18, -1.47);
        const sofa = new THREE.Mesh(track(new THREE.BoxGeometry(1.85, 0.78, 0.85)), greenCushionMat);
        sofa.position.set(0.45, 0.39, 1.55);
        sofa.castShadow = true;
        ag.add(tWall, tL, tR, tTop, sofa);
      } else if (an.kind === 'mb_cctv_cove_hatch') {
        // Screenshots 055649 & 055655: Wall CCTV security camera + dangling cable, tiny crawl hatch, loose tile & amber low wood-capped divider walls
        const camBody = new THREE.Mesh(track(new THREE.BoxGeometry(0.16, 0.14, 0.34)), voidBlackMat);
        camBody.position.set(-1.2, 2.62, -1.45);
        camBody.rotation.set(0.42, 0.35, 0);
        const cable = new THREE.Mesh(track(new THREE.CylinderGeometry(0.025, 0.025, 2.62, 6)), voidBlackMat);
        cable.position.set(-1.2, 1.31, -1.55);
        const hatch = new THREE.Mesh(track(new THREE.BoxGeometry(0.75, 0.65, 0.14)), voidBlackMat);
        hatch.position.set(0.4, 0.325, -1.65);
        const looseTile = new THREE.Mesh(track(new THREE.BoxGeometry(0.65, 0.03, 0.65)), wallMaterials.cream_tile);
        looseTile.position.set(0.4, 0.02, -0.75);
        looseTile.rotation.y = 0.25;
        ag.add(camBody, cable, hatch, looseTile);
      } else if (an.kind === 'mb_chair_wall_hole') {
        // Screenshot 055726: Square wall cutout crammed full of overlapping green-cushioned chairs
        const box = new THREE.Mesh(track(new THREE.BoxGeometry(1.9, 1.85, 0.8)), voidBlackMat);
        box.position.set(0, 1.35, -0.2);
        ag.add(box);
        for (let c = 0; c < 4; c++) {
          ag.add(buildChair(greenCushionMat, (c - 1.5) * 0.32, 0.15, c * 0.65, 0.52 * ((c % 2) ? 1 : -1), 0.38, 0.65 + (c % 2) * 0.32));
        }
      } else if (an.kind === 'mb_blue_drapes_dining') {
        // Screenshot 055733: Large 3-pane colonial window w/ cobalt-blue curtains, retro fridge, dark credenza & octagonal table set w/ plates, placemats & 4 blue armchairs
        const winGlass = new THREE.Mesh(track(new THREE.PlaneGeometry(2.6, 2.1)), paleGlobeMat);
        winGlass.position.set(0, 1.68, -2.45);
        for (const mx of [-0.45, 0.45]) {
          const mul = new THREE.Mesh(track(new THREE.BoxGeometry(0.06, 2.12, 0.05)), whitePaintMat);
          mul.position.set(mx, 1.68, -2.42);
          ag.add(mul);
        }
        const drapeL = new THREE.Mesh(track(new THREE.BoxGeometry(0.62, 2.68, 0.24)), cobaltDrapesMat);
        drapeL.position.set(-1.55, 1.55, -2.35);
        const drapeR = drapeL.clone();
        drapeR.position.x = 1.55;
        const fridge = new THREE.Mesh(track(new THREE.BoxGeometry(0.88, 1.95, 0.82)), whitePaintMat);
        fridge.position.set(2.25, 0.975, -1.9);
        const tableTop = new THREE.Mesh(track(new THREE.CylinderGeometry(1.02, 1.02, 0.08, 8)), oakChairMat);
        tableTop.position.y = 0.78;
        const ped = new THREE.Mesh(track(new THREE.CylinderGeometry(0.22, 0.42, 0.76, 8)), oakChairMat);
        ped.position.y = 0.38;
        ag.add(winGlass, drapeL, drapeR, fridge, tableTop, ped);
        for (let k = 0; k < 4; k++) {
          const ang = (k * Math.PI) / 2;
          ag.add(buildChair(royalBlueMat, Math.cos(ang) * 1.18, Math.sin(ang) * 1.18, -ang + Math.PI / 2));
          const plate = new THREE.Mesh(track(new THREE.CylinderGeometry(0.14, 0.14, 0.025, 10)), whitePaintMat);
          plate.position.set(Math.cos(ang) * 0.62, 0.835, Math.sin(ang) * 0.62);
          ag.add(plate);
        }
      } else if (an.kind === 'mb_gold_tile_blood_trail') {
        // Screenshot 055738: Giant square-tiled orange lit feature wall + diagonal blood smear trail across floor + dark silhouette chair + trash piles
        const tileWall = new THREE.Mesh(track(new THREE.BoxGeometry(4.8, WH, 0.28)), wallMaterials.cream_tile);
        tileWall.position.set(0, WH * 0.5, -2.2);
        const orangePanel = new THREE.Mesh(track(new THREE.PlaneGeometry(2.2, 1.45)), track(new THREE.MeshBasicMaterial({ color: 0xff8b1a, toneMapped: false })));
        orangePanel.position.set(-0.6, 2.15, -2.04);
        const bloodTrail = new THREE.Mesh(track(new THREE.PlaneGeometry(0.45, 5.4)), bloodSmearMat);
        bloodTrail.rotation.x = -Math.PI / 2;
        bloodTrail.rotation.z = 0.42;
        bloodTrail.position.set(0.25, 0.018, 0.45);
        const whiteStripes = new THREE.Mesh(track(new THREE.BoxGeometry(1.6, 0.02, 0.14)), whitePaintMat);
        whiteStripes.position.set(1.65, 0.02, 1.25);
        const darkChair = buildChair(voidBlackMat, -1.65, 1.35, 0.42);
        ag.add(tileWall, orangePanel, bloodTrail, whiteStripes, darkChair);
      } else if (an.kind === 'mb_floating_block_glitch') {
        // Screenshot 055756: Impossible floating suspended ceiling partition block + 3 stepped wood-trimmed columns + tipped blue chair + black floor glitch lines
        const floatWall = new THREE.Mesh(track(new THREE.BoxGeometry(2.8, 1.65, 0.28)), wallMaterials.yellow);
        floatWall.position.set(0, 2.42, 0);
        floatWall.castShadow = true;
        ag.add(floatWall);
        for (let k = -1; k <= 1; k++) {
          const stepC = new THREE.Mesh(track(new THREE.BoxGeometry(0.65, 1.65, 0.65)), wallMaterials.yellow);
          stepC.position.set(k * 1.45, 0.825, 1.55);
          const cap = new THREE.Mesh(track(new THREE.BoxGeometry(0.72, 0.08, 0.72)), deskWoodMat);
          cap.position.set(k * 1.45, 1.68, 1.55);
          ag.add(stepC, cap);
        }
        const glitchLine = new THREE.Mesh(track(new THREE.BoxGeometry(3.2, 0.02, 0.09)), voidBlackMat);
        glitchLine.position.set(0.2, 0.02, -0.65);
        const cocaCrate = new THREE.Mesh(track(new THREE.BoxGeometry(0.48, 0.36, 0.38)), redPipeMat);
        cocaCrate.position.set(1.15, 0.18, -0.95);
        cocaCrate.rotation.z = 0.45;
        ag.add(glitchLine, cocaCrate, buildChair(royalBlueMat, -1.2, -0.5, 0.8, 0.25, 1.35, 0.26));
      } else if (an.kind === 'mb_twin_cribs_chair_pile') {
        // Screenshot 055805: Two crisp oak wooden cribs/beds + waist-high square wall crawl cutout + tangled pile of green chairs
        for (const bz of [-1.25, 1.25]) {
          const frame = new THREE.Mesh(track(new THREE.BoxGeometry(1.75, 0.62, 0.92)), oakChairMat);
          frame.position.set(-1.35, 0.31, bz);
          const mattress = new THREE.Mesh(track(new THREE.BoxGeometry(1.62, 0.18, 0.82)), whitePaintMat);
          mattress.position.set(-1.35, 0.68, bz);
          ag.add(frame, mattress);
        }
        for (let p = 0; p < 5; p++) {
          ag.add(buildChair(greenCushionMat, 1.45 + (p % 2) * 0.35, (p - 2) * 0.28, p * 0.9, p * 0.45, -p * 0.35, 0.2 + p * 0.22));
        }
      }
      root.add(ag);
    }
  }

  // 9. Sacrifice Hooks
  const hookMeshes = [];
  const hookMat = track(new THREE.MeshStandardMaterial({ map: texStore.metalCab, color: 0x5d2822, roughness: 0.55, metalness: 0.75 }));
  for (const h of map.HOOKS) {
    const g = new THREE.Group();
    g.position.set(h.x, 0, h.z);
    const post = new THREE.Mesh(track(new THREE.CylinderGeometry(0.10, 0.13, 2.85, 8)), hookMat);
    post.position.y = 1.425;
    const base = new THREE.Mesh(track(new THREE.BoxGeometry(0.58, 0.14, 0.58)), track(new THREE.MeshStandardMaterial({ map: texStore.warnTex })));
    base.position.y = 0.07;
    const arm = new THREE.Mesh(track(new THREE.BoxGeometry(0.14, 0.14, 0.85)), hookMat);
    arm.position.set(0, 2.75, 0.36);
    const claw = new THREE.Mesh(track(new THREE.TorusGeometry(0.17, 0.038, 8, 16, Math.PI * 1.45)), hookMat);
    claw.position.set(0, 2.42, 0.74);
    claw.rotation.y = Math.PI / 2;
    const beacon = new THREE.Mesh(ledGeom, track(new THREE.MeshBasicMaterial({ color: 0xff8c20, toneMapped: false })));
    beacon.position.y = 3.0;
    g.add(post, base, arm, claw, beacon);
    root.add(g);
    hookMeshes.push(g);
  }

  // 10. Textured Exit Doors
  const exitMeshes = [];
  const doorGeom = track(new THREE.BoxGeometry(3.35, WH - 0.1, 0.28));
  for (const e of map.EXITS) {
    const g = new THREE.Group();
    g.position.set(e.x, 0, e.z);
    const doorMat = track(new THREE.MeshStandardMaterial({ map: texStore.exitDoorTex, roughness: 0.5, metalness: 0.55 }));
    const door = new THREE.Mesh(doorGeom, doorMat);
    door.position.y = (WH - 0.1) * 0.5;

    const sign = new THREE.Mesh(
      track(new THREE.BoxGeometry(1.6, 0.44, 0.18)),
      track(new THREE.MeshBasicMaterial({ color: 0xff3024, toneMapped: false }))
    );
    sign.position.set(0, WH - 0.45, e.dirZ < 0 ? 0.38 : -0.38);

    const frame = new THREE.Mesh(track(new THREE.BoxGeometry(3.6, 0.24, 0.65)), track(new THREE.MeshStandardMaterial({ map: texStore.warnTex })));
    frame.position.y = WH - 0.12;

    g.add(door, sign, frame);
    root.add(g);
    exitMeshes.push({ group: g, door, signMat: sign.material, dirZ: e.dirZ });
  }

  // 10b. Ornate A-Sync Service Elevator Cabin (Interactive Spawn Chamber)
  let elevator = null;
  if (map.ELEVATOR) {
    const el = map.ELEVATOR;
    const hwEl = el.width * 0.5;
    const hdEl = el.depth * 0.5;
    const wallT = 0.28;
    const ceilY = el.ceilingH;
    const doorHalf = el.doorW * 0.5;
    const doorH = el.doorH;

    const eg = new THREE.Group();
    eg.position.set(el.x, 0, el.z);
    root.add(eg);

    const marbleMat = track(new THREE.MeshStandardMaterial({ color: 0x1a1c20, roughness: 0.32, metalness: 0.22 }));
    const rugMat = track(new THREE.MeshStandardMaterial({ color: 0x561816, roughness: 0.92, metalness: 0.04 }));
    const walnutMat = track(new THREE.MeshStandardMaterial({ color: 0x452818, roughness: 0.56, metalness: 0.10 }));
    const brassMat = track(new THREE.MeshStandardMaterial({ color: 0xd4ad56, roughness: 0.38, metalness: 0.78 }));
    const chromeMat = track(new THREE.MeshStandardMaterial({ color: 0x8a929a, roughness: 0.28, metalness: 0.72 }));
    const doorSteelMat = track(new THREE.MeshStandardMaterial({ color: 0x3b424b, roughness: 0.68, metalness: 0.36 }));
    const darkSteelMat = track(new THREE.MeshStandardMaterial({ color: 0x22262c, roughness: 0.46, metalness: 0.62 }));
    const exteriorWallMat = track(new THREE.MeshStandardMaterial({ map: texStore.concreteFloorTex || texStore.wallMap, color: 0xc2b284, roughness: 0.72 }));
    const slitGlassMat = track(new THREE.MeshStandardMaterial({ color: 0xffe298, transparent: true, opacity: 0.20, roughness: 0.62, metalness: 0.05 }));

    // Floor: Marble deck + recessed crimson & brass-trimmed centerpiece carpet
    const deck = new THREE.Mesh(track(new THREE.BoxGeometry(el.width - 0.1, 0.03, el.depth - 0.1)), marbleMat);
    deck.position.y = 0.015;
    const rug = new THREE.Mesh(track(new THREE.BoxGeometry(el.width - 0.85, 0.025, el.depth - 0.78)), rugMat);
    rug.position.set(0, 0.032, 0.05);
    const rugTrim = new THREE.Mesh(track(new THREE.BoxGeometry(el.width - 0.76, 0.018, el.depth - 0.69)), brassMat);
    rugTrim.position.set(0, 0.024, 0.05);
    eg.add(deck, rugTrim, rug);

    // Exterior & Interior Side/Back Cabin Walls
    const addPanelWall = (x, z, w, d) => {
      const m = new THREE.Mesh(track(new THREE.BoxGeometry(w, WH, d)), exteriorWallMat);
      m.position.set(x, WH * 0.5, z);
      eg.add(m);
    };
    addPanelWall(-hwEl + wallT * 0.5, 0, wallT, el.depth);
    addPanelWall(hwEl - wallT * 0.5, 0, wallT, el.depth);
    addPanelWall(0, hdEl - wallT * 0.5, el.width, wallT);

    // Interior walnut paneling slabs & brass vertical trim mullions
    const panL = new THREE.Mesh(track(new THREE.BoxGeometry(0.06, ceilY, el.depth - wallT * 2)), walnutMat);
    panL.position.set(-hwEl + wallT + 0.025, ceilY * 0.5, 0);
    const panR = new THREE.Mesh(track(new THREE.BoxGeometry(0.06, ceilY, el.depth - wallT * 2)), walnutMat);
    panR.position.set(hwEl - wallT - 0.025, ceilY * 0.5, 0);
    const panB = new THREE.Mesh(track(new THREE.BoxGeometry(el.width - wallT * 2, ceilY, 0.06)), walnutMat);
    panB.position.set(0, ceilY * 0.5, hdEl - wallT - 0.025);
    eg.add(panL, panR, panB);

    // Mirror-finish brushed stainless panel along back wall + brass stiles
    const backMirror = new THREE.Mesh(track(new THREE.BoxGeometry(1.85, 1.45, 0.025)), chromeMat);
    backMirror.position.set(0, 1.85, hdEl - wallT - 0.065);
    const mirrorFrame = new THREE.Mesh(track(new THREE.BoxGeometry(1.96, 1.56, 0.018)), brassMat);
    mirrorFrame.position.set(0, 1.85, hdEl - wallT - 0.058);
    eg.add(mirrorFrame, backMirror);

    for (const bx of [-0.95, 0.95]) {
      const stileB = new THREE.Mesh(track(new THREE.BoxGeometry(0.055, ceilY, 0.03)), brassMat);
      stileB.position.set(bx, ceilY * 0.5, hdEl - wallT - 0.05);
      eg.add(stileB);
    }
    for (const bz of [-0.75, 0.0, 0.75]) {
      for (const sx of [-1, 1]) {
        const stile = new THREE.Mesh(track(new THREE.BoxGeometry(0.03, ceilY, 0.055)), brassMat);
        stile.position.set(sx * (hwEl - wallT - 0.05), ceilY * 0.5, bz);
        eg.add(stile);
      }
    }

    // Polished tubular brass handrails on L, R, Back walls (y = 0.96m)
    const railGeoSide = track(new THREE.CylinderGeometry(0.026, 0.026, el.depth - 0.9, 10));
    railGeoSide.rotateX(Math.PI / 2);
    for (const sx of [-1, 1]) {
      const rMesh = new THREE.Mesh(railGeoSide, brassMat);
      rMesh.position.set(sx * (hwEl - wallT - 0.13), 0.96, 0.05);
      eg.add(rMesh);
      for (const bz of [-0.7, 0.7]) {
        const brk = new THREE.Mesh(track(new THREE.BoxGeometry(0.11, 0.035, 0.04)), brassMat);
        brk.position.set(sx * (hwEl - wallT - 0.075), 0.96, bz);
        eg.add(brk);
      }
    }
    const railGeoBack = track(new THREE.CylinderGeometry(0.026, 0.026, el.width - 0.85, 10));
    railGeoBack.rotateZ(Math.PI / 2);
    const rBack = new THREE.Mesh(railGeoBack, brassMat);
    rBack.position.set(0, 0.96, hdEl - wallT - 0.13);
    eg.add(rBack);

    // Front Doorway Portal Piers + Transom Header (extends smoothly up to WH)
    const jambW = hwEl - doorHalf;
    const jambL = new THREE.Mesh(track(new THREE.BoxGeometry(jambW, WH, wallT)), darkSteelMat);
    jambL.position.set(-doorHalf - jambW * 0.5, WH * 0.5, -hdEl + wallT * 0.5);
    const jambR = new THREE.Mesh(track(new THREE.BoxGeometry(jambW, WH, wallT)), darkSteelMat);
    jambR.position.set(doorHalf + jambW * 0.5, WH * 0.5, -hdEl + wallT * 0.5);
    const headerBox = new THREE.Mesh(track(new THREE.BoxGeometry(el.doorW + 0.16, WH - doorH, wallT + 0.04)), darkSteelMat);
    headerBox.position.set(0, doorH + (WH - doorH) * 0.5, -hdEl + wallT * 0.5);
    const trimArch = new THREE.Mesh(track(new THREE.BoxGeometry(el.doorW + 0.24, 0.11, wallT + 0.14)), brassMat);
    trimArch.position.set(0, doorH + 0.04, -hdEl + wallT * 0.5);
    eg.add(jambL, jambR, headerBox, trimArch);

    // Ornate Coffered Brass Canopy & Warm Frosted Luminous Chandelier Ceiling
    const canopyOuter = new THREE.Mesh(track(new THREE.BoxGeometry(el.width - 0.2, 0.18, el.depth - 0.2)), darkSteelMat);
    canopyOuter.position.set(0, ceilY + 0.09, 0);
    const canopyMat = track(new THREE.MeshBasicMaterial({ color: new THREE.Color(0.95, 0.82, 0.56), toneMapped: false }));
    const canopyGlow = new THREE.Mesh(track(new THREE.BoxGeometry(el.width - 1.1, 0.06, el.depth - 1.0)), canopyMat);
    canopyGlow.position.set(0, ceilY - 0.02, 0.05);
    const cCross1 = new THREE.Mesh(track(new THREE.BoxGeometry(el.width - 1.05, 0.08, 0.065)), brassMat);
    cCross1.position.set(0, ceilY - 0.04, 0.05);
    const cCross2 = new THREE.Mesh(track(new THREE.BoxGeometry(0.065, 0.08, el.depth - 0.95)), brassMat);
    cCross2.position.set(0, ceilY - 0.04, 0.05);
    eg.add(canopyOuter, canopyGlow, cCross1, cCross2);

    // Dedicated warm interior Elevator Cabin PointLight (fixed light count across entire match!)
    const cabinLight = new THREE.PointLight(0xffcf88, 1.05, 9.5, 1.45);
    cabinLight.position.set(0, ceilY - 0.35, 0);
    eg.add(cabinLight);

    // Illuminated Overhead Floor Matrix Sign (inside & outside transom!)
    const tCanvas = document.createElement('canvas');
    tCanvas.width = 512; tCanvas.height = 128;
    const tCtx = tCanvas.getContext('2d');
    tCtx.fillStyle = '#0c0d10';
    tCtx.fillRect(0, 0, 512, 128);
    tCtx.strokeStyle = '#c89e46';
    tCtx.lineWidth = 6;
    tCtx.strokeRect(4, 4, 504, 120);
    tCtx.fillStyle = '#ffbe48';
    tCtx.font = 'bold 46px monospace';
    tCtx.textAlign = 'center';
    tCtx.fillText('A-SYNC KV-31 :: LVL 0', 256, 62);
    tCtx.font = 'bold 28px monospace';
    tCtx.fillStyle = '#d8b468';
    tCtx.fillText('[E] OPEN DOORS  ▲', 256, 104);
    const transomTex = track(new THREE.CanvasTexture(tCanvas));
    transomTex.colorSpace = THREE.SRGBColorSpace;
    const transomMat = track(new THREE.MeshBasicMaterial({ map: transomTex, color: new THREE.Color(0.95, 0.80, 0.48), toneMapped: false }));
    const transomIn = new THREE.Mesh(track(new THREE.PlaneGeometry(1.44, 0.32)), transomMat);
    transomIn.position.set(0, doorH - 0.06, -hdEl + wallT + 0.11);
    const transomOut = new THREE.Mesh(track(new THREE.PlaneGeometry(1.44, 0.32)), transomMat);
    transomOut.rotation.y = Math.PI;
    transomOut.position.set(0, doorH + 0.22, -hdEl - 0.03);
    eg.add(transomIn, transomOut);

    // Interior Interactive Call-Button Console on right jamb (easily visible & reachable)
    const panelPlate = new THREE.Mesh(track(new THREE.BoxGeometry(0.24, 0.52, 0.06)), brassMat);
    panelPlate.position.set(doorHalf + 0.20, 1.28, -hdEl + wallT + 0.025);
    const btnBezel = new THREE.Mesh(track(new THREE.CylinderGeometry(0.068, 0.068, 0.03, 18)), darkSteelMat);
    btnBezel.rotation.x = Math.PI / 2;
    btnBezel.position.set(doorHalf + 0.20, 1.32, -hdEl + wallT + 0.055);
    const buttonMat = track(new THREE.MeshBasicMaterial({ color: new THREE.Color(1.45, 0.95, 0.22), toneMapped: false }));
    const buttonMesh = new THREE.Mesh(track(new THREE.CylinderGeometry(0.048, 0.048, 0.035, 18)), buttonMat);
    buttonMesh.rotation.x = Math.PI / 2;
    buttonMesh.position.set(doorHalf + 0.20, 1.32, -hdEl + wallT + 0.068);
    const stopKnob = new THREE.Mesh(track(new THREE.CylinderGeometry(0.032, 0.032, 0.04, 12)), track(new THREE.MeshStandardMaterial({ color: 0xb01e1a, roughness: 0.3 })));
    stopKnob.rotation.x = Math.PI / 2;
    stopKnob.position.set(doorHalf + 0.20, 1.14, -hdEl + wallT + 0.062);
    eg.add(panelPlate, btnBezel, buttonMesh, stopKnob);

    // Twin Sliding Elevator Doors with Brass Molding + Tinted Vision Slits looking into Level 0!
    const buildDoorLeaf = (side) => {
      const leaf = new THREE.Group();
      const lw = doorHalf;
      const body = new THREE.Mesh(track(new THREE.BoxGeometry(lw - 0.015, doorH - 0.02, 0.085)), doorSteelMat);
      body.position.y = doorH * 0.5;
      const frameOuter = new THREE.Mesh(track(new THREE.BoxGeometry(lw - 0.01, 0.14, 0.10)), brassMat);
      frameOuter.position.y = 0.08;
      const midRail = new THREE.Mesh(track(new THREE.BoxGeometry(lw - 0.06, 0.08, 0.095)), brassMat);
      midRail.position.y = 1.25;
      // Frosted reinforced observation window slit so players see Level 0 haze waiting outside!
      const glass = new THREE.Mesh(track(new THREE.BoxGeometry(0.18, 0.96, 0.095)), slitGlassMat);
      glass.position.set(-side * 0.06, 1.82, 0);
      const glassFrame = new THREE.Mesh(track(new THREE.BoxGeometry(0.24, 1.02, 0.092)), brassMat);
      glassFrame.position.set(-side * 0.06, 1.82, -0.002);
      leaf.add(body, frameOuter, midRail, glassFrame, glass);
      leaf.position.set(side * (lw * 0.5), 0, -hdEl + wallT * 0.5);
      return leaf;
    };
    const doorL = buildDoorLeaf(-1);
    const doorR = buildDoorLeaf(1);
    eg.add(doorL, doorR);

    elevator = {
      group: eg,
      doorL,
      doorR,
      doorHalf,
      buttonMesh,
      buttonMat,
      transomMat,
      cabinLight
    };
  }

  // 11. Detailed Textured Backrooms Item Pickups
  const itemMeshes = new Map();
  const spawnPickups = (arr, kind) => {
    let geom, mat, capGeom, capMat;
    if (kind === 'water') {
      geom = track(new THREE.CylinderGeometry(0.11, 0.13, 0.36, 12));
      mat = track(new THREE.MeshStandardMaterial({ map: texStore.itemWater, emissive: 0x16422a, emissiveIntensity: 0.35, roughness: 0.32, metalness: 0.4 }));
      capGeom = track(new THREE.CylinderGeometry(0.055, 0.055, 0.08, 10));
      capMat = track(new THREE.MeshStandardMaterial({ color: 0x303638, metalness: 0.8 }));
    } else if (kind === 'scan') {
      geom = track(new THREE.BoxGeometry(0.32, 0.14, 0.26));
      mat = track(new THREE.MeshStandardMaterial({ map: texStore.itemScan, emissive: 0x104c6a, emissiveIntensity: 0.55, roughness: 0.35, metalness: 0.5 }));
      capGeom = track(new THREE.CylinderGeometry(0.015, 0.015, 0.22, 6));
      capMat = track(new THREE.MeshStandardMaterial({ color: 0xd0d4d8, metalness: 0.9 }));
    } else if (kind === 'jelly') {
      geom = track(new THREE.CylinderGeometry(0.14, 0.14, 0.28, 12));
      mat = track(new THREE.MeshStandardMaterial({ map: texStore.itemJelly, emissive: 0x8c440a, emissiveIntensity: 0.48, roughness: 0.24 }));
      capGeom = track(new THREE.CylinderGeometry(0.148, 0.148, 0.05, 12));
      capMat = track(new THREE.MeshStandardMaterial({ color: 0x3c2818, metalness: 0.6 }));
    } else if (kind === 'ration') {
      geom = track(new THREE.BoxGeometry(0.32, 0.16, 0.22));
      mat = track(new THREE.MeshStandardMaterial({ map: texStore.itemRation, emissive: 0x624604, emissiveIntensity: 0.32, roughness: 0.38, metalness: 0.45 }));
    } else {
      geom = track(new THREE.CylinderGeometry(0.058, 0.058, 0.38, 10));
      mat = track(new THREE.MeshStandardMaterial({ map: texStore.itemFlare, emissive: 0x6c1898, emissiveIntensity: 0.65, roughness: 0.3 }));
    }

    for (const it of arr) {
      const grp = new THREE.Group();
      grp.position.set(it.x, 0.42, it.z);
      const body = new THREE.Mesh(geom, mat);
      grp.add(body);
      if (capGeom) {
        const cap = new THREE.Mesh(capGeom, capMat);
        cap.position.y = kind === 'scan' ? 0.12 : 0.20;
        if (kind === 'scan') cap.position.x = 0.10;
        grp.add(cap);
      }
      root.add(grp);
      itemMeshes.set(it.id, grp);
    }
  };

  spawnPickups(map.WATERS, 'water');
  spawnPickups(map.SCANS, 'scan');
  spawnPickups(map.JELLIES, 'jelly');
  spawnPickups(map.RATIONS, 'ration');
  spawnPickups(map.FLARES, 'flare');

  // 11b. Strange Backrooms Relics (`locator`, `vhs_tape`, `glitch_cassette`)
  if (map.RELICS?.length) {
    const tapeGeom = track(new THREE.BoxGeometry(0.32, 0.12, 0.20));
    const locGeom = track(new THREE.OctahedronGeometry(0.18, 0));
    const casGeom = track(new THREE.BoxGeometry(0.28, 0.18, 0.14));
    const tapeMat = track(new THREE.MeshStandardMaterial({ color: 0x181a1f, emissive: 0x2266aa, emissiveIntensity: 0.65, roughness: 0.35 }));
    const locMat = track(new THREE.MeshStandardMaterial({ color: 0xd9b842, emissive: 0x826c10, emissiveIntensity: 0.65, metalness: 0.7, roughness: 0.25 }));
    const casMat = track(new THREE.MeshStandardMaterial({ color: 0x382040, emissive: 0xb824d8, emissiveIntensity: 0.68, roughness: 0.3 }));
    for (const rel of map.RELICS) {
      const rg = new THREE.Group();
      rg.position.set(rel.x, 0.46, rel.z);
      const gm = rel.kind === 'locator' ? locGeom : rel.kind === 'vhs_tape' ? tapeGeom : casGeom;
      const mt = rel.kind === 'locator' ? locMat : rel.kind === 'vhs_tape' ? tapeMat : casMat;
      const body = new THREE.Mesh(gm, mt);
      rg.add(body);
      root.add(rg);
      itemMeshes.set(rel.id, rg);
      animItems.push({ mesh: body, baseY: 0, kind: 'spin' });
    }
  }

  // 12. Subtle Atmospheric Round Dust Motes
  let dustPoints = null;
  if (preset.dustCount > 0) {
    const dustGeom = track(new THREE.BufferGeometry());
    const pos = new Float32Array(preset.dustCount * 3);
    for (let i = 0; i < preset.dustCount; i++) {
      pos[i * 3] = Math.random() * N * C;
      pos[i * 3 + 1] = 0.2 + Math.random() * (WH - 0.4);
      pos[i * 3 + 2] = Math.random() * N * C;
    }
    dustGeom.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const dc = document.createElement('canvas');
    dc.width = dc.height = 32;
    const dctx = dc.getContext('2d');
    const dg = dctx.createRadialGradient(16, 16, 0, 16, 16, 15);
    dg.addColorStop(0, 'rgba(255,255,255,1)');
    dg.addColorStop(0.55, 'rgba(255,255,255,0.65)');
    dg.addColorStop(1, 'rgba(255,255,255,0)');
    dctx.fillStyle = dg;
    dctx.fillRect(0, 0, 32, 32);
    const dustTex = track(new THREE.CanvasTexture(dc));
    const dustMat = track(new THREE.PointsMaterial({
      color: 0xc2b074, map: dustTex, size: 0.013, sizeAttenuation: true,
      transparent: true, opacity: 0.28, alphaTest: 0.01, depthWrite: false
    }));
    dustPoints = new THREE.Points(dustGeom, dustMat);
    root.add(dustPoints);
  }

  // Pre-allocated pooled UV Flare PointLights so throwing Flares at runtime never changes scene light count or hitches shaders
  const flareLightPool = [];
  for (let i = 0; i < 2; i++) {
    const fpl = new THREE.PointLight(0xd84cff, 0, 16, 1.5);
    fpl.position.set(0, -10, 0);
    root.add(fpl);
    flareLightPool.push(fpl);
  }

  return {
    root,
    skirtInst,
    fixInst,
    haloInst,
    baseLightColors,
    dynamicRedSet: new Set(),
    lightPool,
    flareLightPool,
    taskMeshes,
    hookMeshes,
    exitMeshes,
    itemMeshes,
    elevator,
    exitGuideMat,
    chaserLedTex,
    chaserExitTex,
    animItems,
    dustPoints,
    trapMeshes: [],
    flareMeshes: [],
    dispose() {
      scene.remove(root);
      for (const d of disposables) if (d && d.dispose) d.dispose();
    }
  };
}

const _tmpLightCol = new THREE.Color();
export function updateWorldLighting(world, map, camPos, elapsed, killerPos = null) {
  const killers = Array.isArray(killerPos) ? killerPos : (killerPos ? [killerPos] : []);
  const redRadius2 = 10.5 * 10.5;
  const newRedSet = new Set();
  let colorsDirty = false;

  // 0. Animate Spawn Elevator Sliding Doors & Status LEDs
  if (world.elevator && map.ELEVATOR) {
    const evEl = world.elevator;
    const p = Math.max(0, Math.min(1, map.elevatorOpenProgress || 0));
    const ease = p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
    const slide = ease * (evEl.doorHalf * 0.90);
    const baseHalf = evEl.doorHalf * 0.5;
    evEl.doorL.position.x = -baseHalf - slide;
    evEl.doorR.position.x = baseHalf + slide;

    if (map.elevatorState === 'closed') {
      const pulse = 0.78 + 0.30 * Math.sin(elapsed * 4.2);
      evEl.buttonMat.color.setRGB(1.45 * pulse, 0.95 * pulse, 0.22 * pulse);
      evEl.transomMat.color.setRGB(0.95, 0.80, 0.48);
    } else {
      evEl.buttonMat.color.setRGB(0.28, 1.55, 0.58);
      evEl.transomMat.color.setRGB(0.45, 1.05, 0.62);
    }
    if (evEl.cabinLight) {
      evEl.cabinLight.intensity = 1.05 + Math.sin(elapsed * 18.0) * 0.04;
    }
  }

  // Animate scrolling floor chevron strips forward toward targets + bobbing glitch artifacts
  if (world.chaserLedTex) world.chaserLedTex.offset.y = -((elapsed * 0.95) % 1);
  if (world.chaserExitTex) world.chaserExitTex.offset.y = -((elapsed * (map.exitsOpen ? 1.55 : 0.45)) % 1);
  if (world.animItems) {
    for (let i = 0; i < world.animItems.length; i++) {
      const a = world.animItems[i];
      if (!a.mesh) continue;
      if (a.kind === 'fan_y') {
        a.mesh.rotation.y = elapsed * 4.4 + i;
      } else if (a.kind === 'spin') {
        a.mesh.rotation.y = elapsed * 1.15 + i;
        a.mesh.rotation.x = Math.sin(elapsed * 0.9 + i) * 0.16;
        a.mesh.position.y = a.baseY + Math.sin(elapsed * 2.1 + i) * 0.08;
      } else {
        a.mesh.position.y = a.baseY + Math.sin(elapsed * 1.6 + i) * 0.12;
      }
    }
  }

  // 1. Dynamically shift ceiling troffers blood-red inside tight localized bubbles around ANY Entity!
  if (killers.length && world.fixInst && world.baseLightColors) {
    for (let i = 0; i < map.LIGHTS.length; i++) {
      const l = map.LIGHTS[i];
      if (l.dead) continue;
      let near = false;
      for (const kp of killers) {
        if ((l.x - kp.x) ** 2 + (l.z - kp.z) ** 2 < redRadius2) { near = true; break; }
      }
      if (near) {
        newRedSet.add(i);
        const pulse = 0.72 + 0.32 * Math.sin(elapsed * 14 + l.phase);
        _tmpLightCol.setRGB(3.3 * pulse, 0.16 * pulse, 0.12 * pulse);
        world.fixInst.setColorAt(i, _tmpLightCol);
        world.haloInst.setColorAt(i, _tmpLightCol);
        colorsDirty = true;
      }
    }
  }

  // Restore lights that exited Entity's tight crimson aura back to baseline yellow/red
  for (const prevIdx of world.dynamicRedSet) {
    if (!newRedSet.has(prevIdx) && world.baseLightColors[prevIdx]) {
      const [br, bg, bb] = world.baseLightColors[prevIdx];
      _tmpLightCol.setRGB(br, bg, bb);
      world.fixInst.setColorAt(prevIdx, _tmpLightCol);
      world.haloInst.setColorAt(prevIdx, _tmpLightCol);
      colorsDirty = true;
    }
  }
  world.dynamicRedSet = newRedSet;

  if (colorsDirty) {
    if (world.fixInst.instanceColor) world.fixInst.instanceColor.needsUpdate = true;
    if (world.haloInst.instanceColor) world.haloInst.instanceColor.needsUpdate = true;
  }

  // 2. Pool PointLights across 58m range (prioritizing brighter multi-tier zones visible down corridors!)
  const cands = [];
  for (let i = 0; i < map.LIGHTS.length; i++) {
    const l = map.LIGHTS[i];
    if (l.dead) continue;
    const d2 = (l.x - camPos.x) ** 2 + (l.z - camPos.z) ** 2;
    const lg = l.gain ?? (l.bright ? 1.14 : 0.58);
    if (d2 < 58 * 58) cands.push({ l, idx: i, d2, score: d2 / (0.65 + lg * 0.75) });
  }
  cands.sort((a, b) => a.score - b.score);

  for (let i = 0; i < world.lightPool.length; i++) {
    const pl = world.lightPool[i];
    const c = cands[i];
    if (!c) { pl.intensity = 0; continue; }
    const l = c.l;
    const isRed = l.red || newRedSet.has(c.idx);
    pl.position.set(l.x, WH - 0.4, l.z);
    let fl = 1.0;
    if (l.flicker || isRed) {
      const s = Math.sin(elapsed * 24 + l.phase) * Math.sin(elapsed * 7.3 + l.phase * 2);
      fl = s > (isRed ? -0.45 : -0.25) ? 1.0 : 0.16;
    }
    if (isRed) {
      pl.color.setHex(l.hex || 0xff2214);
      pl.intensity = (l.gain ? l.gain * 6.5 : 5.4) * fl;
      pl.distance = 22;
      pl.decay = 1.38;
    } else if (l.green) {
      pl.color.setHex(l.hex || 0x6effa8);
      pl.intensity = (l.gain ? l.gain * 7.2 : 9.2) * fl;
      pl.distance = 26;
      pl.decay = 1.25;
    } else if (l.purple) {
      pl.color.setHex(l.hex || 0xd46eff);
      pl.intensity = 7.4 * fl;
      pl.distance = 24;
      pl.decay = 1.32;
    } else {
      const lg = l.gain ?? (l.bright ? 1.16 : 0.62);
      const lgSoft = lg > 0.80 ? 0.80 + (lg - 0.80) * 0.45 : lg;
      pl.color.setHex(l.hex || (lg >= 0.9 ? 0xfff5c6 : lg >= 0.5 ? 0xffe696 : 0xffdb76));
      pl.intensity = (2.0 + lgSoft * 5.8) * fl; // Keeps bright halls clear while preserving wall/floor detail
      pl.distance = 17 + lgSoft * 11;
      pl.decay = Math.max(1.24, 1.58 - lgSoft * 0.28);
    }
  }

  if (world.dustPoints) {
    world.dustPoints.position.y = Math.sin(elapsed * 0.45) * 0.08;
  }
}

export function buildSurvivorAvatar(colorIdx = 0) {
  const cfg = SURV_COLORS[colorIdx % SURV_COLORS.length];
  const g = new THREE.Group();

  const suitMat = new THREE.MeshStandardMaterial({ color: cfg.hex, roughness: 0.62, metalness: 0.08 });
  const trimMat = new THREE.MeshStandardMaterial({ color: 0x1e2226, roughness: 0.7 });
  const visorMat = new THREE.MeshStandardMaterial({
    color: cfg.visor, emissive: cfg.hex, emissiveIntensity: 0.35, roughness: 0.15, metalness: 0.75
  });

  if (cachedSoldierGLTF) {
    const model = SkeletonUtils.clone(cachedSoldierGLTF.scene);
    // Align soldier's front (-Z) directly with player look yaw so facing teammates see each other's visors cleanly
    model.rotation.y = 0;
    model.traverse((n) => {
      if (n.isMesh) {
        n.castShadow = true;
        n.receiveShadow = true;
        const m = n.material.clone();
        m.color.lerp(new THREE.Color(cfg.hex), 0.72);
        m.emissive = new THREE.Color(cfg.hex);
        m.emissiveIntensity = 0.14;
        n.material = m;
      }
    });
    g.add(model);

    const mixer = new THREE.AnimationMixer(model);
    const actions = {};
    for (const clip of cachedSoldierGLTF.animations) actions[clip.name] = mixer.clipAction(clip);
    if (actions.Idle) actions.Idle.play();

    const flash = new THREE.SpotLight(0xfff4d4, 5.2, 28, Math.PI / 5.2, 0.45, 1.35);
    flash.position.set(0.22, 1.35, -0.2);
    const flashTarget = new THREE.Object3D();
    flashTarget.position.set(0.22, 1.3, -8);
    g.add(flash, flashTarget);
    flash.target = flashTarget;

    return { group: g, kind: 'rig', model, mixer, actions, activeClip: 'Idle', flash, flashTarget, colorHex: cfg.hex };
  }

  const body = new THREE.Group();
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.62, 0.28), suitMat); torso.position.y = 1.12;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.18, 12, 10), suitMat); head.position.y = 1.60;
  const visor = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.13, 0.14), visorMat); visor.position.set(0, 1.60, -0.12);
  const legGeo = new THREE.BoxGeometry(0.16, 0.72, 0.18);
  const lLeg = new THREE.Mesh(legGeo, suitMat); lLeg.position.set(-0.13, 0.38, 0);
  const rLeg = new THREE.Mesh(legGeo, suitMat); rLeg.position.set(0.13, 0.38, 0);
  const armGeo = new THREE.BoxGeometry(0.14, 0.56, 0.14);
  const lArm = new THREE.Mesh(armGeo, suitMat); lArm.position.set(-0.32, 1.10, 0);
  const rArm = new THREE.Mesh(armGeo, suitMat); rArm.position.set(0.32, 1.10, 0);

  const flash = new THREE.SpotLight(0xfff4d4, 5.2, 28, Math.PI / 5.2, 0.45, 1.35);
  flash.position.set(0.24, 1.28, -0.2);
  const flashTarget = new THREE.Object3D();
  flashTarget.position.set(0.24, 1.25, -8);

  body.add(torso, head, visor, lLeg, rLeg, lArm, rArm);
  g.add(body, flash, flashTarget);
  flash.target = flashTarget;

  return { group: g, kind: 'proc', body, lLeg, rLeg, lArm, rArm, head, flash, flashTarget, colorHex: cfg.hex };
}

export function animateSurvivor(av, dt, p, elapsed) {
  const spd = p.spd || 0;
  const crouch = !!p.crouch;
  const down = p.state === 'down';
  const carried = p.state === 'carried';
  const hooked = p.state === 'hooked';
  const air = (p.y || 0) > 0.08;

  if (av.flash) av.flash.visible = !!p.fl && p.state !== 'dead' && !hooked && !carried;

  if (av.kind === 'rig') {
    const targetClip = (down || hooked || carried) ? 'Idle' : spd > 5.8 ? 'Run' : spd > 0.4 ? 'Walk' : 'Idle';
    if (av.activeClip !== targetClip && av.actions[targetClip]) {
      const next = av.actions[targetClip];
      const prev = av.actions[av.activeClip];
      next.reset().setEffectiveTimeScale(1).setEffectiveWeight(1).play();
      if (prev) prev.crossFadeTo(next, 0.18, true);
      av.activeClip = targetClip;
    }
    av.mixer.update(dt * (spd > 5.8 ? 1.25 : 1.0));
    av.model.position.y = hooked ? 0.68 : carried ? 0.88 : down ? 0.18 : crouch ? -0.32 : 0;
    av.model.rotation.x = hooked ? -0.14 : carried ? -Math.PI / 2.3 : down ? -Math.PI / 2.2 : crouch ? -0.22 : air ? -0.1 : 0;
    return;
  }

  const phase = elapsed * (spd > 5.8 ? 12 : 7.5);
  const swing = (air || hooked || carried) ? 0.45 : Math.min(0.85, spd * 0.13);
  av.lLeg.rotation.x = Math.sin(phase) * swing;
  av.rLeg.rotation.x = -Math.sin(phase) * swing;
  av.lArm.rotation.x = -Math.sin(phase) * swing * 0.7;
  av.rArm.rotation.x = Math.sin(phase) * swing * 0.7;
  av.body.position.y = hooked ? 0.68 : carried ? 0.85 : down ? -0.55 : crouch ? -0.35 : 0;
  av.body.rotation.x = hooked ? -0.14 : carried ? -1.35 : down ? -1.25 : crouch ? -0.25 : 0;
}

/**
 * Horrifying grotesque 3D Entity with incandescent blazing predator eyes cutting through darkness,
 * exposed jagged ribcage & spine vertebrae, asymmetrical bloody claws, and unhinging snapping jaw.
 */
export function buildEntityAvatar(kind = 'bacteria') {
  const g = new THREE.Group();
  const root = new THREE.Group();
  g.add(root);

  const isHowler = kind === 'howler';
  const isMimic = kind === 'mimic';
  const isNull = kind === 'nullshade';
  const isSmiler = kind === 'smiler';
  const isStealer = kind === 'skin_stealer';
  const isWire = kind === 'wire_stalker';
  const isDuller = kind === 'duller';

  if (isHowler) g.scale.set(0.95, 1.14, 0.95);
  else if (isMimic) g.scale.set(1.04, 0.98, 1.04);
  else if (isNull) g.scale.set(1.0, 1.06, 1.0);
  else if (isSmiler) g.scale.set(1.06, 1.12, 1.06);
  else if (isStealer) g.scale.set(0.92, 1.10, 0.92);
  else if (isWire) g.scale.set(1.08, 1.05, 1.08);
  else if (isDuller) g.scale.set(0.84, 1.24, 0.84);

  const fleshMat = new THREE.MeshStandardMaterial({
    color: isHowler ? 0x6c665d
      : isMimic ? 0x766424
      : isNull ? 0x160a1e
      : isSmiler ? 0x050507
      : isStealer ? 0xc2987e
      : isWire ? 0x1d2024
      : isDuller ? 0x454952
      : 0x160a0a,
    roughness: isMimic || isStealer ? 0.56 : isSmiler ? 0.92 : 0.24,
    metalness: isNull || isWire ? 0.55 : isSmiler ? 0.05 : 0.20
  });
  const tarMat = new THREE.MeshStandardMaterial({
    color: isHowler ? 0x3b3832
      : isNull ? 0x26083a
      : isStealer ? 0x6e3a2b
      : isWire ? 0x7a4d24
      : isDuller ? 0x22252b
      : 0x050405,
    roughness: 0.16,
    metalness: isWire ? 0.65 : 0.35
  });
  const boneMat = new THREE.MeshStandardMaterial({
    color: isSmiler ? 0xf8fbff : isHowler ? 0xdad2bf : isWire ? 0x9aa29c : isDuller ? 0x868c94 : 0xc2ad88,
    emissive: isSmiler ? 0xddeeff : 0x000000,
    emissiveIntensity: isSmiler ? 1.45 : 0.0,
    roughness: isSmiler ? 0.15 : 0.62,
    metalness: 0.05
  });
  const bloodMat = new THREE.MeshStandardMaterial({
    color: isNull ? 0x9014c8 : isMimic ? 0x4d180c : isWire ? 0x18a84e : isSmiler ? 0x040406 : 0x720608,
    emissive: isNull ? 0x3a0652 : isWire ? 0x0c441c : isSmiler ? 0x000000 : 0x2a0204,
    roughness: 0.18
  });
  // Piercing HDR incandescent predator eyes unique per Entity archetype!
  const eyeOuterMat = new THREE.MeshBasicMaterial({
    color: isHowler ? new THREE.Color(0.5, 2.5, 3.0)
      : isMimic ? new THREE.Color(2.9, 1.85, 0.25)
      : isNull ? new THREE.Color(2.6, 0.4, 3.2)
      : isSmiler ? new THREE.Color(3.6, 3.6, 3.6)
      : isStealer ? new THREE.Color(3.2, 1.25, 0.18)
      : isWire ? new THREE.Color(0.35, 3.4, 1.1)
      : isDuller ? new THREE.Color(0.55, 2.3, 3.3)
      : new THREE.Color(2.4, 0.28, 0.12),
    toneMapped: false
  });
  const eyeCoreMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(3.2, 2.8, 2.2), toneMapped: false });

  const torso = new THREE.Group();
  torso.position.y = 1.44;
  root.add(torso);

  const chest = new THREE.Mesh(
    isWire ? new THREE.BoxGeometry(0.52, 0.92, 0.40) : new THREE.CylinderGeometry(isDuller ? 0.22 : 0.30, 0.13, isDuller ? 1.08 : 0.96, 9),
    fleshMat
  );
  chest.scale.set(isSmiler ? 1.35 : 1.22, 1, 0.85);
  torso.add(chest);

  // Archetype torso anatomy: surgical seams for Skin-Stealer, CRT/cable coils for Wire-Stalker, void wisps for Smiler, ribcage otherwise
  const cavity = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.48, 0.16), bloodMat);
  cavity.position.set(0, 0.05, -0.14);
  torso.add(cavity);

  if (isWire) {
    for (let i = 0; i < 6; i++) {
      const coil = new THREE.Mesh(new THREE.TorusGeometry(0.30, 0.032, 6, 14), i % 2 ? brassCopperMatFallback() : tarMat);
      coil.position.set(0, 0.34 - i * 0.14, 0);
      coil.rotation.x = Math.PI / 2 + (i % 2 ? 0.28 : -0.22);
      torso.add(coil);
    }
  } else if (isStealer) {
    for (let i = 0; i < 6; i++) {
      const stitch = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.025, 0.22), tarMat);
      stitch.position.set(0, 0.32 - i * 0.12, -0.08);
      stitch.rotation.z = (i % 2 ? 0.22 : -0.22);
      torso.add(stitch);
    }
  } else if (!isSmiler) {
    for (let i = 0; i < 5; i++) {
      const ry = 0.30 - i * 0.14;
      const rib = new THREE.Mesh(new THREE.TorusGeometry(0.26 - i * 0.018, 0.024, 6, 12, Math.PI * 1.2), boneMat);
      rib.position.set(0, ry, -0.05);
      rib.rotation.x = Math.PI / 2 + 0.22;
      rib.rotation.z = Math.PI * 0.4;
      torso.add(rib);
    }
  }

  function brassCopperMatFallback() {
    return bloodMat;
  }

  // Jagged spinal vertebrae / shadow wisps / cable tendrils protruding from back
  const tendrils = [];
  for (let i = 0; i < 7; i++) {
    const sp = new THREE.Mesh(
      isSmiler ? new THREE.CylinderGeometry(0.02, 0.06, 0.62 + (i % 2) * 0.22, 6)
        : isWire ? new THREE.CylinderGeometry(0.018, 0.025, 0.72, 6)
        : new THREE.ConeGeometry(0.042, 0.38 + (i % 2) * 0.16, 5),
      isSmiler ? fleshMat : isWire ? tarMat : boneMat
    );
    sp.position.set(isSmiler || isWire ? Math.sin(i * 1.3) * 0.22 : 0, 0.40 - i * 0.13, 0.22);
    sp.rotation.x = -1.25 - i * 0.05;
    torso.add(sp);
    tendrils.push(sp);
  }

  // Distorted Neck & Skull / Smiler Mask / Wire CRT Head / Duller Vertical Slit
  const neck = new THREE.Group();
  neck.position.set(0, isDuller ? 0.58 : 0.56, -0.14);
  torso.add(neck);

  const cranium = new THREE.Mesh(
    isWire ? new THREE.BoxGeometry(0.42, 0.36, 0.36) : new THREE.SphereGeometry(isSmiler ? 0.28 : 0.23, 10, 9),
    fleshMat
  );
  if (!isWire) cranium.scale.set(isDuller ? 0.74 : isSmiler ? 1.05 : 0.84, isDuller ? 1.42 : 1.28, 1.08);
  neck.add(cranium);

  if (isDuller) {
    // Deep vertical split down Duller's soot mask-face
    const cleft = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.42, 0.12), tarMat);
    cleft.position.set(0, 0.0, -0.19);
    neck.add(cleft);
  }

  const eyes = [];
  const eyeScale = isSmiler ? 1.45 : isDuller ? 0.65 : 1.0;
  for (const s of [-1, 1]) {
    const socket = new THREE.Mesh(new THREE.SphereGeometry(0.062 * eyeScale, 8, 8), tarMat);
    socket.position.set(s * (isSmiler ? 0.115 : 0.088), 0.065, isWire ? -0.16 : -0.175);
    const iris = new THREE.Mesh(new THREE.SphereGeometry(0.040 * eyeScale, 8, 8), eyeOuterMat);
    iris.position.set(s * (isSmiler ? 0.115 : 0.088), 0.065, isWire ? -0.195 : -0.215);
    const core = new THREE.Mesh(new THREE.SphereGeometry(0.018 * eyeScale, 6, 6), eyeCoreMat);
    core.position.set(s * (isSmiler ? 0.115 : 0.088), 0.065, isWire ? -0.215 : -0.238);
    neck.add(socket, iris, core);
    eyes.push(iris);
  }

  const eyeLightCol = isHowler ? 0x3ad4ff : isMimic ? 0xffa820 : isNull ? 0xc428ff : isSmiler ? 0xdceeff : isStealer ? 0xff7c24 : isWire ? 0x2aff70 : isDuller ? 0x5cc8ff : 0xff2410;
  const eyeLight = new THREE.PointLight(eyeLightCol, 3.2, 11.5, 1.6);
  eyeLight.position.set(0, 0.05, -0.35);
  neck.add(eyeLight);

  const jaw = new THREE.Group();
  jaw.position.set(0, -0.07, -0.06);
  if (isSmiler) {
    // Iconic Smiler wide crescent ring of incandescent neon-white triangular teeth!
    for (let t = -5; t <= 5; t++) {
      const tooth = new THREE.Mesh(new THREE.ConeGeometry(0.022, 0.11, 4), eyeCoreMat);
      const u = t / 5;
      tooth.position.set(u * 0.21, -0.03 + u * u * 0.12, -0.19 - (1 - Math.abs(u)) * 0.06);
      tooth.rotation.x = Math.PI;
      jaw.add(tooth);
    }
  } else {
    const jawMesh = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.16, 0.27), bloodMat);
    jawMesh.position.set(0, -0.06, -0.09);
    jaw.add(jawMesh);
    for (let t = -3; t <= 3; t++) {
      const fang = new THREE.Mesh(new THREE.ConeGeometry(0.016, 0.11, 4), boneMat);
      fang.position.set(t * 0.03, 0.02, -0.19 + Math.abs(t) * 0.015);
      jaw.add(fang);
    }
  }
  neck.add(jaw);

  const armLenScale = isDuller ? 1.28 : isWire ? 1.15 : 1.0;
  const makeClawArm = (side) => {
    const sh = new THREE.Group();
    sh.position.set(side * 0.38, 0.36, -0.05);
    const upper = new THREE.Mesh(new THREE.CylinderGeometry(0.068, 0.05, 0.74 * armLenScale, 7), fleshMat);
    upper.position.y = -0.34 * armLenScale;
    const elbow = new THREE.Group();
    elbow.position.y = -0.70 * armLenScale;
    const fore = new THREE.Mesh(new THREE.CylinderGeometry(0.054, 0.036, 0.80 * armLenScale, 7), tarMat);
    fore.position.y = -0.38 * armLenScale;
    elbow.add(fore);
    for (let f = -1.5; f <= 1.5; f++) {
      const talon = new THREE.Mesh(new THREE.ConeGeometry(0.017, isDuller ? 0.48 : 0.38, 4), f % 1 ? boneMat : bloodMat);
      talon.position.set(f * 0.038, -0.84 * armLenScale, -0.05);
      talon.rotation.x = Math.PI + 0.45;
      elbow.add(talon);
    }
    sh.add(upper, elbow);
    torso.add(sh);
    return { sh, elbow };
  };
  const lArm = makeClawArm(-1);
  const rArm = makeClawArm(1);

  const makeLeg = (side) => {
    const hip = new THREE.Group();
    hip.position.set(side * 0.21, 0.96, 0.02);
    const thigh = new THREE.Mesh(new THREE.CylinderGeometry(0.088, 0.062, 0.56, 7), fleshMat);
    thigh.position.set(0, -0.24, -0.06);
    thigh.rotation.x = 0.28;
    const shin = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.036, 0.62, 7), tarMat);
    shin.position.set(0, -0.68, 0.05);
    shin.rotation.x = -0.22;
    hip.add(thigh, shin);
    root.add(hip);
    return hip;
  };
  const lLeg = makeLeg(-1);
  const rLeg = makeLeg(1);

  const aura = new THREE.PointLight(eyeLightCol, 1.4, 7.0, 1.8);
  aura.position.set(0, 1.4, -0.2);
  g.add(aura);

  return { group: g, root, torso, neck, jaw, lArm, rArm, lLeg, rLeg, tendrils, eyes, eyeLight, aura };
}

export function animateEntity(av, dt, p, elapsed) {
  const spd = p.spd || 0;
  const swingT = p.swingT || 0;
  const chasing = spd > 3.5;
  const phase = elapsed * (chasing ? 9.4 : spd > 0.5 ? 6.8 : 2.1);

  // Unnatural uneven spider-like limping/scuttling gait
  const limp = spd > 0.5 ? Math.sin(phase) * 0.88 : Math.sin(phase) * 0.10;
  av.lLeg.rotation.x = limp;
  av.rLeg.rotation.x = -limp * 0.92 - (spd > 0.5 ? 0.24 : 0);

  // Deep predatory forward hunch & spasmodic shoulder roll
  av.torso.rotation.x = (chasing ? 0.56 : 0.30) + Math.sin(phase * 2) * 0.09;
  av.torso.rotation.z = Math.sin(phase) * (chasing ? 0.24 : spd > 0.5 ? 0.16 : 0.06);
  av.torso.position.y = 1.38 + Math.abs(Math.sin(phase)) * (chasing ? 0.16 : 0.04);

  // Nightmarish jerky neck-snap spasms (frozen head suddenly cracks sideways & snaps back!)
  const snapPulse = Math.pow(Math.max(0, Math.sin(elapsed * 3.7) * Math.sin(elapsed * 11.9)), 6);
  const microJitter = Math.sin(elapsed * 39.0) * 0.06;
  const snapDir = Math.sin(Math.floor(elapsed * 2.5) * 12.7) > 0 ? 1 : -1;
  av.neck.rotation.z = Math.sin(elapsed * 1.8) * 0.26 + snapDir * snapPulse * 0.82 + microJitter;
  av.neck.rotation.y = snapDir * snapPulse * 0.42;
  av.neck.rotation.x = -0.26 + Math.sin(elapsed * 5.2) * 0.09 - snapPulse * 0.28;

  // Unhinging mandible snaps violently during chase/attack
  const jawSnap = Math.pow(Math.max(0, Math.sin(elapsed * 5.8)), 6);
  av.jaw.rotation.x = swingT > 0 ? 1.05 * Math.sin(swingT * Math.PI) : 0.14 + jawSnap * 0.72 + microJitter;

  // Flickering blazing predator eye intensity
  if (av.eyeLight) {
    av.eyeLight.intensity = 3.4 + Math.sin(elapsed * 21) * 0.55 + (chasing ? 1.35 : 0);
  }

  for (let i = 0; i < av.tendrils.length; i++) {
    av.tendrils[i].rotation.z = Math.sin(elapsed * 6.4 + i * 0.85) * 0.24;
  }

  if (swingT > 0) {
    // 3rd-person overhead downward claw rake matching 1st-person strike
    const pr = 1.0 - swingT;
    let raiseRot = 0;
    if (pr < 0.34) raiseRot = -2.45 * (pr / 0.34); // Cock high overhead
    else if (pr < 0.68) {
      const k = (pr - 0.34) / 0.34;
      raiseRot = -2.45 + 2.85 * k; // Tear violently downward
    } else {
      raiseRot = 0.40 * (1 - (pr - 0.68) / 0.32);
    }
    av.rArm.sh.rotation.set(raiseRot, -0.18, 0.14);
    av.rArm.elbow.rotation.x = -0.55 - 0.35 * Math.sin(pr * Math.PI);
    av.lArm.sh.rotation.set(raiseRot * 0.82, 0.20, -0.14);
  } else {
    av.lArm.sh.rotation.set(-0.36 + Math.cos(phase) * 0.56, 0.08, 0.18 + Math.sin(elapsed * 3.2) * 0.10);
    av.rArm.sh.rotation.set(-0.42 - Math.cos(phase) * 0.56, -0.08, -0.18 - Math.sin(elapsed * 3.6) * 0.10);
    av.lArm.elbow.rotation.x = -0.78 + Math.sin(elapsed * 4.8) * 0.22;
    av.rArm.elbow.rotation.x = -0.82 + Math.cos(elapsed * 5.2) * 0.22;
  }
}

/**
 * Anatomically continuous, elongated & closer 1st-Person Entity Arms + Clawed Hands:
 * Longer gaunt forearm -> seamless wrist -> elongated skeletal palm -> thumb + 4 long multi-jointed fingers + talons.
 */
export function makeFPEntityClaws(camera) {
  const root = new THREE.Group();
  camera.add(root);

  const rimLight = new THREE.PointLight(0xff4228, 0.92, 1.35, 1.3);
  rimLight.position.set(0, 0.08, -0.22);
  root.add(rimLight);

  const skinMat = new THREE.MeshStandardMaterial({ color: 0x351412, roughness: 0.36, metalness: 0.22 });
  const veinMat = new THREE.MeshStandardMaterial({ color: 0x621014, emissive: 0x1a0305, roughness: 0.28, metalness: 0.15 });
  const boneMat = new THREE.MeshStandardMaterial({ color: 0x94795c, roughness: 0.56 });
  const bloodMat = new THREE.MeshStandardMaterial({ color: 0xa60c14, emissive: 0x3e0608, roughness: 0.18 });

  const makeArm = (side) => {
    const pivot = new THREE.Group();
    pivot.position.set(side * 0.27, -0.22, -0.04);

    // 1. Elongated gaunt forearm pulled closer to camera & extending far forward
    const armChain = new THREE.Group();
    armChain.position.set(0, -0.02, 0.28);
    armChain.rotation.set(0.14, side * -0.03, side * 0.08);
    pivot.add(armChain);

    const forearm = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.044, 0.62, 10), skinMat);
    forearm.rotation.x = -Math.PI / 2;
    forearm.position.set(0, 0, -0.31);
    armChain.add(forearm);

    const boneSpur = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.013, 0.50), boneMat);
    boneSpur.position.set(side * 0.014, 0.026, -0.30);
    const tendon = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.009, 0.54, 6), veinMat);
    tendon.rotation.x = -Math.PI / 2;
    tendon.position.set(side * -0.016, 0.022, -0.30);
    armChain.add(boneSpur, tendon);

    // 2. Seamless Wrist Socket seated cleanly at elongated forearm tip (z = -0.61)
    const handGroup = new THREE.Group();
    handGroup.position.set(0, 0, -0.61);
    armChain.add(handGroup);

    const wristSocket = new THREE.Mesh(new THREE.SphereGeometry(0.032, 10, 8), skinMat);
    wristSocket.scale.set(1.12, 0.68, 1.32);
    handGroup.add(wristSocket);

    // 3. Elongated Gaunt Metacarpal Palm (z = -0.01 to -0.16)
    const palm = new THREE.Mesh(new THREE.BoxGeometry(0.082, 0.030, 0.155), skinMat);
    palm.position.set(0, 0, -0.080);
    handGroup.add(palm);

    for (const vx of [-0.018, 0, 0.018]) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.010, 0.13), veinMat);
      m.position.set(vx, 0.015, -0.080);
      handGroup.add(m);
    }

    // 4. Opposable Elongated Thumb Claw
    const thumbPivot = new THREE.Group();
    thumbPivot.position.set(-side * 0.042, -0.004, -0.055);
    thumbPivot.rotation.set(-0.12, side * 0.52, -side * 0.35);
    const thumbProx = new THREE.Mesh(new THREE.CylinderGeometry(0.010, 0.013, 0.085, 6), skinMat);
    thumbProx.rotation.x = -Math.PI / 2;
    thumbProx.position.z = -0.042;
    const thumbClaw = new THREE.Mesh(new THREE.ConeGeometry(0.009, 0.115, 5), bloodMat);
    thumbClaw.rotation.x = -Math.PI / 2 - 0.38;
    thumbClaw.position.set(0, -0.018, -0.128);
    thumbPivot.add(thumbProx, thumbClaw);
    handGroup.add(thumbPivot);

    // 5. Four Long Spindly Multi-Jointed Fingers + Hooked Razor Talons
    const fingers = [];
    const fingerSpecs = [
      { x: -0.032, len1: 0.085, len2: 0.070, clawL: 0.145, bloody: false },
      { x: -0.010, len1: 0.104, len2: 0.084, clawL: 0.178, bloody: true },
      { x:  0.012, len1: 0.096, len2: 0.078, clawL: 0.162, bloody: true },
      { x:  0.032, len1: 0.074, len2: 0.060, clawL: 0.128, bloody: false }
    ];

    for (let i = 0; i < fingerSpecs.length; i++) {
      const sp = fingerSpecs[i];
      const baseX = side < 0 ? -sp.x : sp.x;

      const knuckleGroup = new THREE.Group();
      knuckleGroup.position.set(baseX, 0.004, -0.154);
      knuckleGroup.rotation.y = (side < 0 ? -sp.x : sp.x) * -2.0;

      const kJoint = new THREE.Mesh(new THREE.SphereGeometry(0.011, 7, 7), skinMat);
      knuckleGroup.add(kJoint);

      const prox = new THREE.Mesh(new THREE.CylinderGeometry(0.0085, 0.011, sp.len1, 6), skinMat);
      prox.rotation.x = -Math.PI / 2;
      prox.position.z = -sp.len1 * 0.5;
      knuckleGroup.add(prox);

      const midGroup = new THREE.Group();
      midGroup.position.set(0, 0, -sp.len1);
      const mJoint = new THREE.Mesh(new THREE.SphereGeometry(0.009, 6, 6), boneMat);
      midGroup.add(mJoint);

      const dist = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.0085, sp.len2, 6), skinMat);
      dist.rotation.x = -Math.PI / 2;
      dist.position.z = -sp.len2 * 0.5;
      midGroup.add(dist);

      const tipPivot = new THREE.Group();
      tipPivot.position.set(0, 0, -sp.len2);
      const talon = new THREE.Mesh(new THREE.ConeGeometry(0.008, sp.clawL, 5), sp.bloody ? bloodMat : boneMat);
      talon.rotation.x = -Math.PI / 2 - 0.38;
      talon.position.set(0, -0.022, -sp.clawL * 0.45);
      tipPivot.add(talon);
      midGroup.add(tipPivot);

      knuckleGroup.add(midGroup);
      handGroup.add(knuckleGroup);
      fingers.push({ knuckleGroup, midGroup, idx: i });
    }

    root.add(pivot);
    return { pivot, handGroup, thumbPivot, fingers, side };
  };

  const left = makeArm(-1);
  const right = makeArm(1);

  return {
    root, left, right,
    lagX: 0, lagY: 0,
    setVisible(v) { root.visible = !!v; }
  };
}

export function updateFPEntityClaws(fp, dt, { elapsed, turnYawRate = 0, turnPitchRate = 0, speedRatio = 0, swingT = 0 }) {
  if (!fp || !fp.root.visible) return;

  const k = 1 - Math.exp(-12 * Math.min(dt, 0.05));
  const targetLagX = THREE.MathUtils.clamp(-turnYawRate * 0.028, -0.12, 0.12);
  const targetLagY = THREE.MathUtils.clamp(turnPitchRate * 0.022, -0.09, 0.09);
  fp.lagX += (targetLagX - fp.lagX) * k;
  fp.lagY += (targetLagY - fp.lagY) * k;

  const moveBob = Math.sin(elapsed * 8.4) * 0.028 * speedRatio;
  const moveSway = Math.cos(elapsed * 4.2) * 0.018 * speedRatio;

  for (const arm of [fp.left, fp.right]) {
    const s = arm.side;
    const phaseOff = s < 0 ? 0 : Math.PI * 0.72;

    const floatY = Math.sin(elapsed * 2.15 + phaseOff) * 0.036 + Math.sin(elapsed * 1.1 + phaseOff) * 0.015;
    const floatX = Math.cos(elapsed * 1.55 + phaseOff) * 0.014;
    const floatRoll = Math.sin(elapsed * 1.9 + phaseOff) * 0.082;

    // Overhead Top-to-Bottom Claw Rake Animation (`swingT` counts 1.0 -> 0.0, so p = 1 - swingT goes 0 -> 1)
    let slashX = 0, slashY = 0, slashZ = 0, slashRotX = 0, slashRotY = 0, slashRotZ = 0, spread = 0;
    if (swingT > 0) {
      const p = 1.0 - swingT;
      const w = s > 0 ? 1.0 : 0.65; // Primary right hand leads, left rakes symmetrically
      if (p < 0.30) {
        // Phase 1: Lift hands high above view & splay claws menacingly
        const u = p / 0.30;
        const e = 1 - Math.pow(1 - u, 2);
        slashX = -s * 0.05 * e * w;
        slashY = 0.28 * e * w;
        slashZ = 0.10 * e;
        slashRotX = 0.85 * e * w;
        spread = 0.45 * e;
      } else if (p < 0.66) {
        // Phase 2: Tear fiercely straight DOWN through screen center!
        const u = (p - 0.30) / 0.36;
        const e = u * u * (3 - 2 * u);
        slashX = -s * 0.07 * w;
        slashY = (0.28 - 0.62 * e) * w;
        slashZ = 0.10 - 0.34 * Math.sin(u * Math.PI);
        slashRotX = (0.85 - 1.95 * e) * w;
        slashRotZ = -s * 0.16 * e;
        spread = 0.45 * (1 - e);
      } else {
        // Phase 3: Smooth follow-through recovery back to floating idle
        const u = (p - 0.66) / 0.34;
        const e = 1 - u;
        slashX = -s * 0.07 * e * w;
        slashY = -0.34 * e * w;
        slashRotX = -1.10 * e * w;
        slashRotZ = -s * 0.16 * e;
      }
    }

    arm.pivot.position.set(
      s * 0.27 + floatX + fp.lagX + moveSway + slashX,
      -0.22 + floatY + fp.lagY + moveBob + slashY,
      -0.04 + slashZ
    );
    arm.pivot.rotation.set(
      0.08 + Math.sin(elapsed * 2.4 + phaseOff) * 0.05 + fp.lagY * 1.0 + slashRotX,
      -s * 0.03 - fp.lagX * 1.1 + slashRotY,
      s * 0.12 + floatRoll + slashRotZ
    );

    arm.handGroup.rotation.x = 0.06 + Math.sin(elapsed * 2.8 + phaseOff) * 0.08 + slashRotX * 0.35;
    arm.handGroup.rotation.z = Math.cos(elapsed * 2.1 + phaseOff) * 0.09;

    const pAtk = swingT > 0 ? 1.0 - swingT : 0;
    const clench = swingT > 0 ? (pAtk < 0.32 ? -spread : Math.sin(((pAtk - 0.32) / 0.68) * Math.PI) * 0.85) : 0;
    for (let i = 0; i < arm.fingers.length; i++) {
      const f = arm.fingers[i];
      const wave = Math.sin(elapsed * 3.3 + phaseOff + i * 0.75);
      f.knuckleGroup.rotation.x = -0.22 + wave * 0.18 - clench * 0.65;
      f.midGroup.rotation.x = -0.44 + wave * 0.22 - clench * 0.80;
    }
    arm.thumbPivot.rotation.z = -s * (0.35 + Math.sin(elapsed * 2.6 + phaseOff) * 0.12 + clench * 0.4);
  }
}

export function spawnTrapMesh(scene, x, z) {
  const g = new THREE.Group();
  g.position.set(x, 0.04, z);
  const mat = new THREE.MeshStandardMaterial({ color: 0x3b3835, roughness: 0.45, metalness: 0.75 });
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.045, 6, 14), mat);
  ring.rotation.x = Math.PI / 2;
  g.add(ring);
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    const t = new THREE.Mesh(new THREE.ConeGeometry(0.032, 0.14, 4), mat);
    t.position.set(Math.cos(a) * 0.38, 0.05, Math.sin(a) * 0.38);
    g.add(t);
  }
  scene.add(g);
  return g;
}

export function spawnFlareMesh(scene, x, z, pooledLight = null) {
  const g = new THREE.Group();
  g.position.set(x, 0.08, z);
  const stick = new THREE.Mesh(
    new THREE.CylinderGeometry(0.045, 0.045, 0.36, 8),
    new THREE.MeshBasicMaterial({ color: 0xf466ff, toneMapped: false })
  );
  stick.rotation.z = Math.PI / 2;
  g.add(stick);
  let pl;
  if (pooledLight) {
    pl = pooledLight;
    pl.position.set(x, 0.36, z);
    pl.intensity = 4.2;
  } else {
    pl = new THREE.PointLight(0xd84cff, 4.2, 16, 1.5);
    pl.position.set(0, 0.28, 0);
    g.add(pl);
  }
  scene.add(g);
  return { group: g, light: pl, pooled: !!pooledLight, age: 0, maxAge: 28 };
}
