/*! Copyright (c) 2026 Vendreith. Licensing: see LICENSE.md and THIRD_PARTY_NOTICES.md. */
/*!
 * Level 94 architecture — shared material and procedural texture library.
 * One material cache for the whole package, designed to be disposed as a unit.
 */

import * as THREE from 'three';

const materialCache = new Map();
const textureCache = new Map();
let textureAnisotropy = 4;

const TILE = 2.0;

function canUseCanvas() {
  return typeof document !== 'undefined' && typeof document.createElement === 'function';
}

function makeCanvasTexture(key, size, painter) {
  if (textureCache.has(key)) return textureCache.get(key);
  if (!canUseCanvas()) return null;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  painter(ctx, size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = textureAnisotropy;
  texture.needsUpdate = true;
  textureCache.set(key, texture);
  return texture;
}

function noise(ctx, size, amount, light = true) {
  const image = ctx.getImageData(0, 0, size, size);
  const data = image.data;
  for (let i = 0; i < data.length; i += 4) {
    const n = (Math.random() - 0.5) * amount;
    const v = light ? 255 + n : n;
    data[i] = Math.max(0, Math.min(255, data[i] + v - (light ? 255 : 0)));
    data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + v - (light ? 255 : 0)));
    data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + v - (light ? 255 : 0)));
  }
  ctx.putImageData(image, 0, 0);
}

function paintSiding(ctx, size) {
  ctx.fillStyle = '#f4f1e8';
  ctx.fillRect(0, 0, size, size);
  const rows = 8;
  const h = size / rows;
  for (let i = 0; i < rows; i++) {
    const y = i * h;
    const g = ctx.createLinearGradient(0, y, 0, y + h);
    g.addColorStop(0, '#ffffff');
    g.addColorStop(0.18, '#f7f5ee');
    g.addColorStop(0.86, '#e7e5dc');
    g.addColorStop(1, '#cfcdc4');
    ctx.fillStyle = g;
    ctx.fillRect(0, y + 1, size, h - 2);
    ctx.fillStyle = 'rgba(92, 88, 78, 0.34)';
    ctx.fillRect(0, y + h - 2, size, 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.38)';
    ctx.fillRect(0, y + 1, size, 1);
  }
  const img = ctx.getImageData(0, 0, size, size);
  for (let i = 0; i < img.data.length; i += 4) {
    const n = (Math.random() - 0.5) * 5;
    img.data[i] += n;
    img.data[i + 1] += n;
    img.data[i + 2] += n;
  }
  ctx.putImageData(img, 0, 0);
}

function paintShingle(ctx, size) {
  ctx.fillStyle = '#e9e5da';
  ctx.fillRect(0, 0, size, size);
  const rows = 8;
  const h = size / rows;
  const w = size / 4;
  for (let r = 0; r < rows; r++) {
    const offset = (r % 2) * w * 0.5;
    for (let c = -1; c < 5; c++) {
      const x = c * w + offset;
      const tone = 214 + ((r * 31 + c * 17) % 28);
      ctx.fillStyle = `rgb(${tone},${tone - 3},${tone - 8})`;
      ctx.fillRect(x + 1, r * h + 1, w - 2, h - 2);
      ctx.fillStyle = 'rgba(78, 73, 64, 0.4)';
      ctx.fillRect(x, r * h + h - 2, w, 2);
      ctx.fillRect(x + w - 1, r * h, 1, h);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.28)';
      ctx.fillRect(x + 1, r * h + 1, w - 2, 2);
    }
  }
  const img = ctx.getImageData(0, 0, size, size);
  for (let i = 0; i < img.data.length; i += 4) {
    const n = (Math.random() - 0.5) * 11;
    img.data[i] += n;
    img.data[i + 1] += n;
    img.data[i + 2] += n;
  }
  ctx.putImageData(img, 0, 0);
}

function paintStucco(ctx, size) {
  ctx.fillStyle = '#f4f0e6';
  ctx.fillRect(0, 0, size, size);
  const img = ctx.getImageData(0, 0, size, size);
  for (let i = 0; i < img.data.length; i += 4) {
    const n = (Math.random() - 0.5) * 14;
    img.data[i] += n;
    img.data[i + 1] += n;
    img.data[i + 2] += n;
  }
  ctx.putImageData(img, 0, 0);
  for (let i = 0; i < 110; i++) {
    ctx.fillStyle = `rgba(255,255,255,${0.04 + Math.random() * 0.06})`;
    const r = 1 + Math.random() * 3;
    ctx.beginPath();
    ctx.arc(Math.random() * size, Math.random() * size, r, 0, Math.PI * 2);
    ctx.fill();
  }
}

function paintWood(ctx, size) {
  ctx.fillStyle = '#e2d7c5';
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 34; i++) {
    const x = (i / 34) * size + Math.random() * 4;
    ctx.strokeStyle = `rgba(90, 67, 46, ${0.08 + Math.random() * 0.18})`;
    ctx.lineWidth = 0.7 + Math.random() * 1.8;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    for (let y = 0; y <= size; y += 16) {
      ctx.lineTo(x + Math.sin(y * 0.035 + i) * 2.5, y);
    }
    ctx.stroke();
  }
  for (let i = 0; i < 5; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    ctx.strokeStyle = 'rgba(83, 58, 38, 0.34)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.ellipse(x, y, 3 + Math.random() * 3, 6 + Math.random() * 5, Math.random() * 3, 0, Math.PI * 2);
    ctx.stroke();
  }
  const img = ctx.getImageData(0, 0, size, size);
  for (let i = 0; i < img.data.length; i += 4) {
    const n = (Math.random() - 0.5) * 8;
    img.data[i] += n;
    img.data[i + 1] += n;
    img.data[i + 2] += n;
  }
  ctx.putImageData(img, 0, 0);
}

function paintConcrete(ctx, size) {
  ctx.fillStyle = '#ddd9cd';
  ctx.fillRect(0, 0, size, size);
  const img = ctx.getImageData(0, 0, size, size);
  for (let i = 0; i < img.data.length; i += 4) {
    const n = (Math.random() - 0.5) * 20;
    img.data[i] += n;
    img.data[i + 1] += n;
    img.data[i + 2] += n;
  }
  ctx.putImageData(img, 0, 0);
  for (let i = 0; i < 18; i++) {
    ctx.strokeStyle = `rgba(92, 88, 78, ${0.06 + Math.random() * 0.08})`;
    ctx.lineWidth = 0.6;
    ctx.beginPath();
    let x = Math.random() * size;
    let y = Math.random() * size;
    ctx.moveTo(x, y);
    for (let s = 0; s < 4; s++) {
      x += (Math.random() - 0.5) * 34;
      y += (Math.random() - 0.5) * 34;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
}

function paintBrick(ctx, size) {
  ctx.fillStyle = '#d9d0c2';
  ctx.fillRect(0, 0, size, size);
  const rows = 10;
  const h = size / rows;
  const w = size / 4;
  for (let r = 0; r < rows; r++) {
    const offset = (r % 2) * w * 0.5;
    for (let c = -1; c < 5; c++) {
      const x = c * w + offset;
      const tone = 196 + ((r * 23 + c * 19) % 34);
      ctx.fillStyle = `rgb(${tone},${tone - 10},${tone - 18})`;
      ctx.fillRect(x + 1, r * h + 1, w - 2, h - 2);
    }
  }
  const img = ctx.getImageData(0, 0, size, size);
  for (let i = 0; i < img.data.length; i += 4) {
    const n = (Math.random() - 0.5) * 10;
    img.data[i] += n;
    img.data[i + 1] += n;
    img.data[i + 2] += n;
  }
  ctx.putImageData(img, 0, 0);
}

function paintGravel(ctx, size) {
  ctx.fillStyle = '#d9d3c4';
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 2500; i++) {
    const tone = 140 + Math.random() * 80;
    ctx.fillStyle = `rgba(${tone},${tone - 4},${tone - 10},${0.35 + Math.random() * 0.5})`;
    const r = 1 + Math.random() * 3.6;
    ctx.beginPath();
    ctx.arc(Math.random() * size, Math.random() * size, r, 0, Math.PI * 2);
    ctx.fill();
  }
}

function paintAsphalt(ctx, size) {
  ctx.fillStyle = '#9d9b94';
  ctx.fillRect(0, 0, size, size);
  const img = ctx.getImageData(0, 0, size, size);
  for (let i = 0; i < img.data.length; i += 4) {
    const n = (Math.random() - 0.5) * 26;
    img.data[i] += n;
    img.data[i + 1] += n;
    img.data[i + 2] += n;
  }
  ctx.putImageData(img, 0, 0);
  for (let i = 0; i < 60; i++) {
    ctx.fillStyle = `rgba(190,190,183,${0.08 + Math.random() * 0.16})`;
    const r = 1 + Math.random() * 2.5;
    ctx.beginPath();
    ctx.arc(Math.random() * size, Math.random() * size, r, 0, Math.PI * 2);
    ctx.fill();
  }
}

function paintFabric(ctx, size) {
  ctx.fillStyle = '#f2eee5';
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < size; i += 4) {
    ctx.fillStyle = 'rgba(100,96,88,0.07)';
    ctx.fillRect(i, 0, 1, size);
    ctx.fillRect(0, i, size, 1);
  }
}

const texturePainters = {
  siding: paintSiding,
  shingle: paintShingle,
  stucco: paintStucco,
  wood: paintWood,
  concrete: paintConcrete,
  brick: paintBrick,
  gravel: paintGravel,
  asphalt: paintAsphalt,
  fabric: paintFabric
};

function texture(name) {
  const painter = texturePainters[name];
  if (!painter) return null;
  return makeCanvasTexture(name, 256, painter);
}

function cacheKey(name, options) {
  const o = options || {};
  return [
    name,
    o.color ?? '',
    o.roughness ?? '',
    o.metalness ?? '',
    o.opacity ?? '',
    o.emissive ?? '',
    o.emissiveIntensity ?? '',
    o.flatShading ? 'flat' : 'smooth',
    o.side ?? '',
    o.depthWrite === false ? 'nodepth' : 'depth'
  ].join('|');
}

function standard(name, options) {
  const key = cacheKey(name, options);
  if (materialCache.has(key)) return materialCache.get(key);
  const o = options || {};
  const material = new THREE.MeshStandardMaterial({
    color: o.color ?? 0xffffff,
    roughness: o.roughness ?? 0.82,
    metalness: o.metalness ?? 0.0,
    map: o.map || null,
    transparent: o.transparent ?? false,
    opacity: o.opacity ?? 1,
    depthWrite: o.depthWrite ?? true,
    side: o.side ?? THREE.FrontSide,
    flatShading: o.flatShading ?? false,
    emissive: o.emissive ?? 0x000000,
    emissiveIntensity: o.emissiveIntensity ?? 1,
    envMapIntensity: o.envMapIntensity ?? 0.55
  });
  material.name = `level94:${name}`;
  materialCache.set(key, material);
  return material;
}

/**
 * Resolve a package material. Callers should never mutate the returned
 * material: it is shared across every house of the same colour family.
 */
export function getArchitectureMaterial(name, options = {}) {
  const key = cacheKey(name, options);
  if (materialCache.has(key)) return materialCache.get(key);

  switch (name) {
    case 'wall_siding':
      return standard(name, {
        roughness: 0.85,
        map: texture('siding'),
        color: options.color ?? 0xefe5d2,
        ...options
      });
    case 'wall_stucco':
      return standard(name, {
        roughness: 0.9,
        map: texture('stucco'),
        color: options.color ?? 0xf2ebdb,
        ...options
      });
    case 'wall_panel':
      return standard(name, {
        roughness: 0.78,
        color: options.color ?? 0xf2ebdb,
        ...options
      });
    case 'trim':
      return standard(name, {
        roughness: 0.68,
        color: options.color ?? 0xf8f3e6,
        ...options
      });
    case 'roof_shingle':
      return standard(name, {
        roughness: 0.92,
        map: texture('shingle'),
        color: options.color ?? 0x995347,
        ...options
      });
    case 'roof_smooth':
      return standard(name, {
        roughness: 0.86,
        color: options.color ?? 0x6c8391,
        ...options
      });
    case 'foundation':
      return standard(name, {
        roughness: 0.96,
        map: texture('concrete'),
        color: options.color ?? 0xb9b4a7,
        ...options
      });
    case 'stone':
      return standard(name, {
        roughness: 0.96,
        map: texture('concrete'),
        color: options.color ?? 0x8f8b81,
        ...options
      });
    case 'brick':
      return standard(name, {
        roughness: 0.94,
        map: texture('brick'),
        color: options.color ?? 0xa66c59,
        ...options
      });
    case 'wood':
      return standard(name, {
        roughness: 0.9,
        map: texture('wood'),
        color: options.color ?? 0x7a5c40,
        ...options
      });
    case 'painted_wood':
      return standard(name, {
        roughness: 0.76,
        map: texture('wood'),
        color: options.color ?? 0xf8f3e6,
        ...options
      });
    case 'door':
      return standard(name, {
        roughness: 0.54,
        map: texture('wood'),
        color: options.color ?? 0x7e997f,
        ...options
      });
    case 'glass':
      return standard(name, {
        roughness: 0.08,
        metalness: 0.05,
        transparent: true,
        opacity: 0.58,
        depthWrite: false,
        envMapIntensity: 0.9,
        color: options.color ?? 0xcfe4ea,
        ...options
      });
    case 'glass_lit':
      return standard(name, {
        roughness: 0.25,
        transparent: true,
        opacity: 0.82,
        depthWrite: false,
        color: options.color ?? 0xffe1ae,
        emissive: options.emissive ?? 0xffc778,
        emissiveIntensity: options.emissiveIntensity ?? 0.42,
        ...options
      });
    case 'metal':
      return standard(name, {
        roughness: 0.38,
        metalness: 0.68,
        color: options.color ?? 0x7d8588,
        ...options
      });
    case 'dark_metal':
      return standard(name, {
        roughness: 0.46,
        metalness: 0.62,
        color: options.color ?? 0x3e4346,
        ...options
      });
    case 'fabric':
      return standard(name, {
        roughness: 0.98,
        map: texture('fabric'),
        color: options.color ?? 0xf2eee5,
        ...options
      });
    case 'foliage':
      return standard(name, {
        roughness: 0.95,
        color: options.color ?? 0x4f6f44,
        flatShading: true,
        ...options
      });
    case 'hedge':
      return standard(name, {
        roughness: 0.97,
        map: texture('stucco'),
        color: options.color ?? 0x536b49,
        flatShading: true,
        ...options
      });
    case 'flower':
      return standard(name, {
        roughness: 0.8,
        color: options.color ?? 0xd99bab,
        flatShading: true,
        ...options
      });
    case 'terracotta':
      return standard(name, {
        roughness: 0.92,
        color: options.color ?? 0xb36f51,
        ...options
      });
    case 'soil':
      return standard(name, {
        roughness: 1,
        color: options.color ?? 0x554638,
        ...options
      });
    case 'glow': {
      const keyGlow = cacheKey('glow', options);
      if (materialCache.has(keyGlow)) return materialCache.get(keyGlow);
      const material = new THREE.MeshBasicMaterial({
        color: options.color ?? 0xffd99a,
        transparent: options.transparent ?? true,
        opacity: options.opacity ?? 0.85,
        side: options.side ?? THREE.DoubleSide,
        depthWrite: options.depthWrite ?? false
      });
      material.name = 'level94:glow';
      materialCache.set(keyGlow, material);
      return material;
    }
    case 'path_asphalt':
      return standard(name, {
        roughness: 0.97,
        map: texture('asphalt'),
        color: options.color ?? 0x83817a,
        ...options
      });
    case 'path_concrete':
      return standard(name, {
        roughness: 0.94,
        map: texture('concrete'),
        color: options.color ?? 0xc4bfb2,
        ...options
      });
    case 'path_gravel':
      return standard(name, {
        roughness: 1,
        map: texture('gravel'),
        color: options.color ?? 0xb7ae9a,
        ...options
      });
    default:
      return standard(name, { ...options });
  }
}

/** Optional renderer integration: raises anisotropy for the shared textures. */
export function setArchitectureTextureAnisotropy(value) {
  const next = Math.max(1, Math.min(16, Number(value) || 4));
  if (next === textureAnisotropy) return;
  textureAnisotropy = next;
  for (const tex of textureCache.values()) {
    tex.anisotropy = next;
    tex.needsUpdate = true;
  }
}

export function getArchitectureMaterialCacheSize() {
  return materialCache.size;
}

export function getArchitectureTextureCacheSize() {
  return textureCache.size;
}

export function disposeMaterialCache() {
  for (const material of materialCache.values()) material.dispose();
  materialCache.clear();
  for (const tex of textureCache.values()) tex.dispose();
  textureCache.clear();
}

export { TILE as ARCHITECTURE_TEXTURE_TILE };
