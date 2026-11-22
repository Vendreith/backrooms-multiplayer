/*! Copyright (c) 2026 Vendreith. Licensing: see LICENSE.md and THIRD_PARTY_NOTICES.md. */
import * as THREE from 'three';

export function createArchitectureLOD(levels, distances = { medium: 58, distant: 145 }) {
  const lod = new THREE.LOD();
  lod.autoUpdate = false;
  levels.forEach((group, i) => lod.addLevel(group, [0, distances.medium, distances.distant][i], .1));
  return lod;
}
