/*! Copyright (c) 2026 Vendreith. Licensing: see LICENSE.md and THIRD_PARTY_NOTICES.md. */
/*!
 * Level 94 architecture — merged-geometry construction kit.
 * Every house and prop is assembled into material buckets and merged, keeping
 * static draw calls low without introducing a second renderer or scene.
 */

import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { ARCHITECTURE_TEXTURE_TILE } from './materials.js';

const _xAxis = new THREE.Vector3(1, 0, 0);
const _dir = new THREE.Vector3();
const _mid = new THREE.Vector3();
const _quat = new THREE.Quaternion();
const _scale = new THREE.Vector3(1, 1, 1);
const _pos = new THREE.Vector3();
const _euler = new THREE.Euler();
const _localMatrix = new THREE.Matrix4();
const _normalMatrix = new THREE.Matrix3();

function indexToNonIndexed(geometry) {
  if (!geometry.index) return geometry;
  const g = geometry.toNonIndexed();
  geometry.dispose();
  return g;
}

function ensureUv(geometry) {
  if (geometry.getAttribute('uv')) return;
  const count = geometry.getAttribute('position').count;
  geometry.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(count * 2), 2));
}

function scaleBoxUv(geometry, sx, sy, sz, tile) {
  const uv = geometry.getAttribute('uv');
  const normal = geometry.getAttribute('normal');
  const pos = geometry.getAttribute('position');
  if (!uv || !normal || !pos) return;
  const inv = 1 / Math.max(0.25, tile);
  for (let i = 0; i < uv.count; i++) {
    const nx = Math.abs(normal.getX(i));
    const ny = Math.abs(normal.getY(i));
    const nz = Math.abs(normal.getZ(i));
    let u;
    let v;
    if (nx > ny && nx > nz) {
      u = (pos.getZ(i) + sz * 0.5) * inv;
      v = (pos.getY(i) + sy * 0.5) * inv;
    } else if (ny > nz) {
      u = (pos.getX(i) + sx * 0.5) * inv;
      v = (pos.getZ(i) + sz * 0.5) * inv;
    } else {
      u = (pos.getX(i) + sx * 0.5) * inv;
      v = (pos.getY(i) + sy * 0.5) * inv;
    }
    uv.setXY(i, u, v);
  }
  uv.needsUpdate = true;
}

function scaleUv(geometry, uScale, vScale) {
  ensureUv(geometry);
  const uv = geometry.getAttribute('uv');
  for (let i = 0; i < uv.count; i++) {
    uv.setXY(i, uv.getX(i) * uScale, uv.getY(i) * vScale);
  }
  uv.needsUpdate = true;
}

/**
 * Material-keyed geometry collector. Add primitives in local house space,
 * optionally inside a pushed transform (e.g. a wall facing a different way).
 */
export class MeshKit {
  constructor(options = {}) {
    this.tile = options.tile ?? ARCHITECTURE_TEXTURE_TILE;
    this.buckets = new Map();
    this.stack = [new THREE.Matrix4()];
    this.triangles = 0;
    this.vertices = 0;
    this.parts = 0;
  }

  get matrix() {
    return this.stack[this.stack.length - 1];
  }

  push(position = { x: 0, y: 0, z: 0 }, rotationY = 0, rotationZ = 0) {
    _pos.set(position.x || 0, position.y || 0, position.z || 0);
    _euler.set(0, rotationY, rotationZ || 0, 'YXZ');
    _quat.setFromEuler(_euler);
    _scale.set(1, 1, 1);
    _localMatrix.compose(_pos, _quat, _scale);
    const next = this.matrix.clone().multiply(_localMatrix);
    this.stack.push(next);
    return this;
  }

  pushMatrix(matrix) {
    this.stack.push(this.matrix.clone().multiply(matrix));
    return this;
  }

  pop() {
    if (this.stack.length > 1) this.stack.pop();
    return this;
  }

  addGeometry(key, rawGeometry, position = null, rotation = null, scale = null, options = {}) {
    if (!rawGeometry) return this;
    const geometry = indexToNonIndexed(rawGeometry);
    ensureUv(geometry);
    if (options.uvScale !== false) {
      const box = options.boxSize;
      if (box && options.uvTile !== false) {
        scaleBoxUv(geometry, box[0], box[1], box[2], options.tile || this.tile);
      } else if (options.uv) {
        scaleUv(geometry, options.uv[0], options.uv[1]);
      }
    }
    _pos.set(position?.x || 0, position?.y || 0, position?.z || 0);
    if (rotation instanceof THREE.Quaternion) {
      _quat.copy(rotation);
    } else {
      _euler.set(rotation?.x || 0, rotation?.y || 0, rotation?.z || 0, 'XYZ');
      _quat.setFromEuler(_euler);
    }
    _scale.set(scale?.x ?? 1, scale?.y ?? 1, scale?.z ?? 1);
    _localMatrix.compose(_pos, _quat, _scale);
    const world = this.matrix.clone().multiply(_localMatrix);
    geometry.applyMatrix4(world);
    // Recalculate normals after the transform; the matrix can be mirrored in
    // theory even though the builder never mirrors by default.
    _normalMatrix.getNormalMatrix(world);
    const normal = geometry.getAttribute('normal');
    // BufferGeometry.applyMatrix4 already transforms normals.
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();
    const bucket = this.buckets.get(key);
    if (bucket) bucket.push(geometry);
    else this.buckets.set(key, [geometry]);
    const count = geometry.getAttribute('position').count;
    this.vertices += count;
    this.triangles += Math.floor(count / 3);
    this.parts++;
    return this;
  }

  box(key, sx, sy, sz, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, options = {}) {
    const geometry = new THREE.BoxGeometry(sx, sy, sz);
    return this.addGeometry(
      key,
      geometry,
      { x, y, z },
      { x: rx, y: ry, z: rz },
      { x: options.scaleX ?? 1, y: options.scaleY ?? 1, z: options.scaleZ ?? 1 },
      { boxSize: [sx, sy, sz], uvScale: options.uvScale, tile: options.tile, uvTile: options.uvTile }
    );
  }

  cylinder(key, radiusTop, radiusBottom, height, segments, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, options = {}) {
    const geometry = new THREE.CylinderGeometry(radiusTop, radiusBottom, height, segments, 1, options.openEnded ?? false);
    if (options.uv) scaleUv(geometry, options.uv[0], options.uv[1]);
    return this.addGeometry(key, geometry, { x, y, z }, { x: rx, y: ry, z: rz }, null, { uvScale: false });
  }

  cone(key, radius, height, segments, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) {
    const geometry = new THREE.ConeGeometry(radius, height, segments);
    return this.addGeometry(key, geometry, { x, y, z }, { x: rx, y: ry, z: rz }, null, { uvScale: false });
  }

  sphere(key, radius, widthSegments, heightSegments, x = 0, y = 0, z = 0, scale = null) {
    const geometry = new THREE.SphereGeometry(radius, widthSegments, heightSegments);
    return this.addGeometry(key, geometry, { x, y, z }, null, scale, { uvScale: false });
  }

  torus(key, radius, tube, radialSegments, tubularSegments, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) {
    const geometry = new THREE.TorusGeometry(radius, tube, radialSegments, tubularSegments);
    return this.addGeometry(key, geometry, { x, y, z }, { x: rx, y: ry, z: rz }, null, { uvScale: false });
  }

  circle(key, radius, segments, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, scale = null) {
    const geometry = new THREE.CircleGeometry(radius, segments);
    return this.addGeometry(key, geometry, { x, y, z }, { x: rx, y: ry, z: rz }, scale, { uvScale: false });
  }

  plane(key, width, height, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) {
    const geometry = new THREE.PlaneGeometry(width, height);
    return this.addGeometry(key, geometry, { x, y, z }, { x: rx, y: ry, z: rz }, null, { uvScale: false });
  }

  /** A beam whose local X axis is aligned from p1 to p2 (world/local points). */
  beam(key, p1, p2, width, height, options = {}) {
    _dir.set(p2.x - p1.x, p2.y - p1.y, p2.z - p1.z);
    const length = _dir.length();
    if (length < 1e-4) return this;
    _dir.normalize();
    _quat.setFromUnitVectors(_xAxis, _dir);
    _mid.set((p1.x + p2.x) * 0.5, (p1.y + p2.y) * 0.5, (p1.z + p2.z) * 0.5);
    const geometry = new THREE.BoxGeometry(length, height, width);
    return this.addGeometry(key, geometry, _mid, _quat, null, {
      boxSize: [length, height, width],
      uvTile: options.uvTile,
      tile: options.tile
    });
  }

  /** Solid triangular prism. Triangle points are in XY, extruded along Z. */
  trianglePrism(key, points, thickness, x = 0, y = 0, z = 0, rotY = 0) {
    const z0 = -thickness * 0.5;
    const z1 = thickness * 0.5;
    const positions = [];
    const uvs = [];
    const pushTri = (a, b, c) => {
      positions.push(a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2]);
      const denom = Math.max(1e-5, Math.max(a[0], b[0], c[0]) - Math.min(a[0], b[0], c[0]));
      uvs.push(0, 0, 1 / denom, 0, 0, 1);
    };
    const [a, b, c] = points;
    // Front / back
    pushTri([a[0], a[1], z1], [b[0], b[1], z1], [c[0], c[1], z1]);
    pushTri([b[0], b[1], z0], [a[0], a[1], z0], [c[0], c[1], z0]);
    // Sides
    const edges = [[a, b], [b, c], [c, a]];
    for (const [p, q] of edges) {
      pushTri([p[0], p[1], z0], [q[0], q[1], z0], [q[0], q[1], z1]);
      pushTri([p[0], p[1], z0], [q[0], q[1], z1], [p[0], p[1], z1]);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geometry.computeVertexNormals();
    return this.addGeometry(key, geometry, { x, y, z }, { y: rotY }, null, { uvScale: false });
  }

  /** Low-poly attic/gable infill with a sloped top. */
  gableInfill(key, width, height, rise, thickness, x = 0, y = 0, z = 0, rotY = 0, ridgeOffset = 0) {
    return this.trianglePrism(
      key,
      [
        [-width * 0.5, 0],
        [width * 0.5, 0],
        [ridgeOffset, rise]
      ],
      thickness,
      x,
      y,
      z,
      rotY
    );
  }

  merge(materialResolver) {
    const group = new THREE.Group();
    group.name = 'level94-architecture-batch';
    const keys = [...this.buckets.keys()].sort();
    const meshes = [];
    for (const key of keys) {
      const parts = this.buckets.get(key);
      if (!parts || !parts.length) continue;
      let geometry = null;
      if (parts.length === 1) {
        geometry = parts[0];
      } else {
        geometry = mergeGeometries(parts, false);
        for (const part of parts) part.dispose();
      }
      if (!geometry) continue;
      geometry.computeBoundingSphere();
      geometry.computeBoundingBox();
      const material = materialResolver(key);
      if (!material) {
        geometry.dispose();
        continue;
      }
      const mesh = new THREE.Mesh(geometry, material);
      mesh.name = `level94-${key}`;
      mesh.matrixAutoUpdate = false;
      mesh.updateMatrix();
      group.add(mesh);
      meshes.push(mesh);
    }
    this.buckets.clear();
    return {
      group,
      meshes,
      stats: {
        parts: this.parts,
        vertices: this.vertices,
        triangles: this.triangles,
        drawCalls: meshes.length,
        materials: meshes.length
      }
    };
  }
}

export function mergeMeshGroup(group, transform, buckets) {
  group.updateMatrixWorld(true);
  for (const child of group.children) {
    if (!child.isMesh || !child.geometry) continue;
    const material = child.material;
    const key = material?.uuid || 'default';
    let list = buckets.get(key);
    if (!list) {
      list = { material, geometries: [] };
      buckets.set(key, list);
    }
    const geometry = child.geometry.clone();
    geometry.applyMatrix4(child.matrixWorld);
    if (transform) geometry.applyMatrix4(transform);
    list.geometries.push(geometry);
  }
}

export function mergeBucketsToGroup(buckets, name = 'level94-merged-batch') {
  const group = new THREE.Group();
  group.name = name;
  for (const [, entry] of buckets) {
    if (!entry.geometries.length) continue;
    const geometry = entry.geometries.length === 1
      ? entry.geometries[0]
      : mergeGeometries(entry.geometries, false);
    if (entry.geometries.length > 1) for (const g of entry.geometries) g.dispose();
    if (!geometry) continue;
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();
    const mesh = new THREE.Mesh(geometry, entry.material);
    mesh.name = `level94-merged-${entry.material?.name || 'material'}`;
    mesh.matrixAutoUpdate = false;
    group.add(mesh);
  }
  return group;
}

/** Per-vertex attribute compatible geometry from an indexed buffer. */
export function toTriangles(geometry) {
  return indexToNonIndexed(geometry);
}
