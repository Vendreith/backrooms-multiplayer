/*! Copyright (c) 2026 Vendreith. Licensing: see LICENSE.md and THIRD_PARTY_NOTICES.md. */
/*!
 * Level 94 architecture — central resource ownership.
 * Shared template geometry and materials live for the level session and are
 * released through one deterministic call.
 */

import { disposeMaterialCache, getArchitectureMaterialCacheSize, getArchitectureTextureCacheSize } from './materials.js';

const geometries = new Set();
const cacheClearers = new Set();
let disposed = false;

export function trackArchitectureGeometry(geometry) {
  if (geometry && typeof geometry.dispose === 'function') geometries.add(geometry);
  return geometry;
}

export function untrackArchitectureGeometry(geometry) {
  geometries.delete(geometry);
}

export function registerArchitectureCacheClearer(fn) {
  if (typeof fn === 'function') cacheClearers.add(fn);
  return fn;
}

export function getArchitectureResourceStats() {
  let bytes = 0;
  for (const geometry of geometries) {
    const position = geometry.getAttribute?.('position');
    const normal = geometry.getAttribute?.('normal');
    const uv = geometry.getAttribute?.('uv');
    if (position) bytes += position.array.byteLength;
    if (normal) bytes += normal.array.byteLength;
    if (uv) bytes += uv.array.byteLength;
  }
  return {
    geometries: geometries.size,
    geometryBytes: bytes,
    materials: getArchitectureMaterialCacheSize(),
    textures: getArchitectureTextureCacheSize()
  };
}

/**
 * Disposes every template geometry, cached material and procedural texture.
 * Call once when the Level 94 world is torn down. Individual house records
 * only remove their Object3D references so shared caches remain valid.
 */
export function disposeArchitectureResources() {
  if (disposed) return;
  disposed = true;
  try {
    for (const clear of cacheClearers) {
      try { clear(); } catch { /* a cache clearer must never block disposal */ }
    }
    for (const geometry of geometries) {
      try { geometry.dispose(); } catch { /* already disposed */ }
    }
    geometries.clear();
    disposeMaterialCache();
  } finally {
    disposed = false;
  }
}
