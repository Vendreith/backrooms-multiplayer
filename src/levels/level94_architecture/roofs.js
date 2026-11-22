/*! Copyright (c) 2026 Vendreith. Licensing: see LICENSE.md and THIRD_PARTY_NOTICES.md. */
/*!
 * Level 94 architecture — roof construction.
 * Gable, asymmetric gable, hip, shed and cross-gable masses with real
 * thickness, overhangs, fascia, ridge caps, gutters and downspouts.
 */

import * as THREE from 'three';

function addGableEnds(kit, opts) {
  if (opts.gableEnds === false) return;
  const { span, length, rise, ridgeOffset, wallKey } = opts;
  const zs = [length * 0.5 - 0.09, -length * 0.5 + 0.09];
  for (const z of zs) {
    kit.trianglePrism(
      wallKey,
      [
        [-span * 0.5, 0],
        [span * 0.5, 0],
        [ridgeOffset, rise]
      ],
      0.18,
      0,
      opts.eaveY,
      z
    );
  }
}

function addGableTrim(kit, opts) {
  const { span, length, rise, ridgeOffset, overhang, eaveY, trimKey } = opts;
  const halfSpan = span * 0.5 + overhang;
  const zs = [length * 0.5 + overhang - 0.06, -length * 0.5 - overhang + 0.06];
  for (const z of zs) {
    kit.beam(trimKey, { x: -halfSpan, y: eaveY, z }, { x: ridgeOffset, y: eaveY + rise, z }, 0.085, 0.18);
    kit.beam(trimKey, { x: halfSpan, y: eaveY, z }, { x: ridgeOffset, y: eaveY + rise, z }, 0.085, 0.18);
  }
}

function addGutterRun(kit, opts, x, z, length, radius = 0.062, axis = 'z') {
  const { eaveY, gutterKey, detail } = opts;
  if (opts.gutters === false) return;
  if (axis === 'x') {
    kit.cylinder(gutterKey, radius, radius, length, 7, x, eaveY - 0.12, z, 0, 0, Math.PI * 0.5);
    if (detail >= 2) {
      for (const t of [-0.38, 0.38]) {
        kit.box(gutterKey, 0.05, 0.13, 0.045, x + length * t, eaveY - 0.07, z, 0, 0, 0);
      }
    }
  } else {
    kit.cylinder(gutterKey, radius, radius, length, 7, x, eaveY - 0.12, z, Math.PI * 0.5, 0, 0);
    if (detail >= 2) {
      // Two small brackets make the gutter read as attached metal, not a
      // floating tube.
      for (const t of [-0.38, 0.38]) {
        kit.box(gutterKey, 0.045, 0.13, 0.05, x, eaveY - 0.07, z + length * t, 0, 0, 0);
      }
    }
  }
}

function addDownspout(kit, opts, x, z) {
  const { eaveY, gutterKey, downTo, detail } = opts;
  if (opts.gutters === false || detail < 2) return;
  const yTop = eaveY - 0.15;
  const yBottom = Math.min(downTo, yTop - 0.6);
  const h = yTop - yBottom;
  kit.cylinder(gutterKey, 0.045, 0.045, h, 7, x, (yTop + yBottom) * 0.5, z);
  kit.box(gutterKey, 0.1, 0.1, 0.16, x, yTop, z, 0, 0, 0);
  kit.box(gutterKey, 0.12, 0.08, 0.16, x, yBottom, z, 0.18, 0, 0);
  if (detail >= 2) {
    for (const y of [yBottom + h * 0.24, yBottom + h * 0.62]) {
      kit.box(gutterKey, 0.08, 0.04, 0.06, x + 0.06, y, z, 0, 0, 0);
    }
  }
}

function addGableRoofLocal(kit, options) {
  const o = {
    span: 8,
    length: 7,
    eaveY: 3,
    rise: 2.4,
    overhang: 0.48,
    thickness: 0.17,
    ridgeOffset: 0,
    roofKey: 'roof_shingle',
    trimKey: 'trim',
    wallKey: 'wall_siding',
    ridgeKey: 'roof_shingle',
    gutterKey: 'metal',
    downTo: -1.1,
    detail: 2,
    ...options
  };
  const halfSpan = o.span * 0.5 + o.overhang;
  const leftRun = halfSpan + o.ridgeOffset;
  const rightRun = halfSpan - o.ridgeOffset;
  const leftAngle = Math.atan2(o.rise, Math.max(0.2, leftRun));
  const rightAngle = Math.atan2(o.rise, Math.max(0.2, rightRun));
  const leftLen = Math.hypot(leftRun, o.rise);
  const rightLen = Math.hypot(rightRun, o.rise);
  const depth = o.length + o.overhang * 2;
  const lift = o.thickness * 0.5;

  kit.box(
    o.roofKey,
    leftLen,
    o.thickness,
    depth,
    (-halfSpan + o.ridgeOffset) * 0.5,
    o.eaveY + o.rise * 0.5 + lift,
    0,
    0,
    0,
    leftAngle,
    { tile: 1.55 }
  );
  kit.box(
    o.roofKey,
    rightLen,
    o.thickness,
    depth,
    (halfSpan + o.ridgeOffset) * 0.5,
    o.eaveY + o.rise * 0.5 + lift,
    0,
    0,
    0,
    -rightAngle,
    { tile: 1.55 }
  );

  addGableEnds(kit, o);

  if (o.fascia !== false) {
    kit.box(o.trimKey, 0.14, 0.27, depth, -halfSpan, o.eaveY - 0.1, 0);
    kit.box(o.trimKey, 0.14, 0.27, depth, halfSpan, o.eaveY - 0.1, 0);
  }
  kit.cylinder(o.ridgeKey, 0.095, 0.095, depth + 0.04, 7, o.ridgeOffset, o.eaveY + o.rise + 0.04, 0, Math.PI * 0.5, 0, 0);
  if (o.detail >= 1) addGableTrim(kit, o);

  addGutterRun(kit, o, -halfSpan, 0, depth, 0.065);
  addGutterRun(kit, o, halfSpan, 0, depth, 0.065);
  addDownspout(kit, o, -halfSpan, o.length * 0.5 - 0.22);
  addDownspout(kit, o, halfSpan, -o.length * 0.5 + 0.22);

  if (o.detail >= 2) {
    for (const z of [-o.length * 0.25, o.length * 0.25]) {
      kit.cylinder(o.darkKey || 'dark_metal', 0.055, 0.055, 0.22, 6, o.ridgeOffset + 0.4, o.eaveY + o.rise - 0.18, z, 0.25, 0, 0);
    }
  }
  return o;
}

/**
 * Add a gable roof. `ridgeAxis:'z'` presents a gable end to the front (+Z);
 * `ridgeAxis:'x'` presents an eave and allows front dormers.
 */
export function addGableRoof(kit, options = {}) {
  if (options.ridgeAxis === 'x') {
    kit.push({ x: 0, y: 0, z: 0 }, Math.PI * 0.5);
    const local = addGableRoofLocal(kit, {
      ...options,
      span: options.length,
      length: options.span,
      downTo: options.downTo
    });
    kit.pop();
    return { ...options, resolvedSpan: local.span, resolvedLength: local.length };
  }
  return addGableRoofLocal(kit, options);
}

export function gableSurfaceY(options, x, z) {
  const o = {
    span: 8,
    length: 7,
    eaveY: 3,
    rise: 2.4,
    overhang: 0.48,
    ridgeOffset: 0,
    ridgeAxis: 'z',
    ...options
  };
  if (o.ridgeAxis === 'x') {
    return gableSurfaceY({ ...o, ridgeAxis: 'z', span: o.length, length: o.span }, -z, x);
  }
  const halfSpan = o.span * 0.5 + o.overhang;
  if (Math.abs(x) > halfSpan || Math.abs(z) > o.length * 0.5 + o.overhang) return o.eaveY;
  if (x <= o.ridgeOffset) {
    const t = (x + halfSpan) / Math.max(0.001, halfSpan + o.ridgeOffset);
    return o.eaveY + o.rise * t;
  }
  const t = (halfSpan - x) / Math.max(0.001, halfSpan - o.ridgeOffset);
  return o.eaveY + o.rise * t;
}

function createHipGeometry({ span, length, rise, overhang, thickness, ridgeAxis }) {
  const top = [];
  const uvs = [];
  const bx = span * 0.5 + overhang;
  const bz = length * 0.5 + overhang;
  const ridgeAlongX = ridgeAxis === 'x' || (ridgeAxis !== 'z' && span >= length);
  const ridgeHalf = ridgeAlongX
    ? Math.max(0, (span - length) * 0.5 + overhang * 0.18)
    : Math.max(0, (length - span) * 0.5 + overhang * 0.18);
  const yTop = rise;
  const yBottom = -thickness;
  let A, B, C, D, R1, R2;
  if (ridgeAlongX) {
    A = [-bx, 0, bz];
    B = [bx, 0, bz];
    C = [bx, 0, -bz];
    D = [-bx, 0, -bz];
    R1 = [Math.min(ridgeHalf, bx - 0.2), yTop, 0];
    R2 = [-Math.min(ridgeHalf, bx - 0.2), yTop, 0];
  } else {
    A = [-bx, 0, bz];
    B = [bx, 0, bz];
    C = [bx, 0, -bz];
    D = [-bx, 0, -bz];
    R1 = [0, yTop, Math.min(ridgeHalf, bz - 0.2)];
    R2 = [0, yTop, -Math.min(ridgeHalf, bz - 0.2)];
  }

  const pushTriangle = (a, b, c) => {
    top.push(a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2]);
    uvs.push((a[0] + bx) * 0.34, (a[2] + bz) * 0.34, (b[0] + bx) * 0.34, (b[2] + bz) * 0.34, (c[0] + bx) * 0.34, (c[2] + bz) * 0.34);
  };
  const pushFace = (a, b, c, d) => {
    pushTriangle(a, b, c);
    if (d) pushTriangle(a, c, d);
  };
  const lower = (p) => [p[0], p[1] + yBottom, p[2]];

  if (ridgeAlongX) {
    pushFace(A, B, R1, R2);
    pushFace(B, C, R1);
    pushFace(C, D, R2, R1);
    pushFace(D, A, R2);
    // underside
    pushFace(lower(A), lower(R2), lower(R1), lower(B));
    pushFace(lower(R1), lower(C), lower(B));
    pushFace(lower(R1), lower(R2), lower(D), lower(C));
    pushFace(lower(R2), lower(A), lower(D));
    // eave side faces
    pushFace(A, lower(A), lower(B), B);
    pushFace(B, lower(B), lower(C), C);
    pushFace(C, lower(C), lower(D), D);
    pushFace(D, lower(D), lower(A), A);
  } else {
    pushFace(A, B, R1);
    pushFace(B, C, R2, R1);
    pushFace(C, D, R2);
    pushFace(D, A, R1, R2);
    pushFace(lower(A), lower(R1), lower(B));
    pushFace(lower(R1), lower(R2), lower(C), lower(B));
    pushFace(lower(R2), lower(D), lower(C));
    pushFace(lower(R2), lower(R1), lower(A), lower(D));
    pushFace(A, lower(A), lower(B), B);
    pushFace(B, lower(B), lower(C), C);
    pushFace(C, lower(C), lower(D), D);
    pushFace(D, lower(D), lower(A), A);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(top, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.computeVertexNormals();
  return {
    geometry,
    bx,
    bz,
    ridgeAlongX,
    ridgeHalf
  };
}

export function addHipRoof(kit, options = {}) {
  const o = {
    span: 8,
    length: 7,
    eaveY: 3,
    rise: 2.1,
    overhang: 0.5,
    thickness: 0.2,
    ridgeAxis: 'auto',
    roofKey: 'roof_shingle',
    trimKey: 'trim',
    gutterKey: 'metal',
    downTo: -1.1,
    detail: 2,
    gutters: true,
    ...options
  };
  const built = createHipGeometry(o);
  kit.addGeometry(o.roofKey, built.geometry, { x: 0, y: o.eaveY, z: 0 }, null, null, { uvScale: false });
  const eave = o.eaveY - 0.09;
  const depth = o.length + o.overhang * 2;
  const width = o.span + o.overhang * 2;
  if (o.fascia !== false) {
    kit.box(o.trimKey, width + 0.08, 0.28, 0.14, 0, eave, depth * 0.5);
    kit.box(o.trimKey, width + 0.08, 0.28, 0.14, 0, eave, -depth * 0.5);
    kit.box(o.trimKey, 0.14, 0.28, depth + 0.08, width * 0.5, eave, 0);
    kit.box(o.trimKey, 0.14, 0.28, depth + 0.08, -width * 0.5, eave, 0);
  }
  if (built.ridgeAlongX) {
    kit.cylinder(o.ridgeKey || o.roofKey, 0.09, 0.09, built.ridgeHalf * 2 + 0.35, 7, 0, o.eaveY + o.rise + 0.05, 0, Math.PI * 0.5, 0, 0);
  } else {
    kit.cylinder(o.ridgeKey || o.roofKey, 0.09, 0.09, built.ridgeHalf * 2 + 0.35, 7, 0, o.eaveY + o.rise + 0.05, 0, 0, 0, Math.PI * 0.5);
  }
  if (o.gutters !== false) {
    addGutterRun(kit, o, 0, depth * 0.5, width, 0.065, 'x');
    addGutterRun(kit, o, 0, -depth * 0.5, width, 0.065, 'x');
    // Side gutters are only worth the geometry at close range.
    if (o.detail >= 2) {
      addGutterRun(kit, { ...o, gutters: true }, width * 0.5, 0, depth, 0.06, 'z');
      addGutterRun(kit, { ...o, gutters: true }, -width * 0.5, 0, depth, 0.06, 'z');
    }
    addDownspout(kit, o, width * 0.5 - 0.1, depth * 0.5 - 0.25);
    addDownspout(kit, o, -width * 0.5 + 0.1, -depth * 0.5 + 0.25);
  }
  return { ...o, ...built };
}

export function hipSurfaceY(options, x, z) {
  const o = {
    span: 8,
    length: 7,
    eaveY: 3,
    rise: 2.1,
    overhang: 0.5,
    ...options
  };
  const bx = o.span * 0.5 + o.overhang;
  const bz = o.length * 0.5 + o.overhang;
  if (Math.abs(x) > bx || Math.abs(z) > bz) return o.eaveY;
  const ridgeAlongX = o.ridgeAxis === 'x' || (o.ridgeAxis !== 'z' && o.span >= o.length);
  if (ridgeAlongX) {
    const rx = Math.max(0, (o.span - o.length) * 0.5 + o.overhang * 0.18);
    const t = 1 - Math.abs(x) / Math.max(0.2, bx);
    const tz = 1 - Math.abs(z) / Math.max(0.2, bz);
    return o.eaveY + o.rise * Math.min(t * 1.25, tz * 1.25, 1);
  }
  const rz = Math.max(0, (o.length - o.span) * 0.5 + o.overhang * 0.18);
  const t = 1 - Math.abs(z) / Math.max(0.2, bz);
  const tx = 1 - Math.abs(x) / Math.max(0.2, bx);
  return o.eaveY + o.rise * Math.min(t * 1.25, tx * 1.25, 1);
}

export function addShedRoof(kit, options = {}) {
  const o = {
    span: 8,
    length: 7,
    eaveY: 3,
    rise: 1.5,
    overhang: 0.45,
    thickness: 0.17,
    slopeAxis: 'z',
    roofKey: 'roof_shingle',
    trimKey: 'trim',
    wallKey: 'wall_siding',
    gutterKey: 'metal',
    downTo: -1.1,
    detail: 2,
    ...options
  };
  const over = o.overhang;
  if (o.slopeAxis === 'x') {
    kit.push({ x: 0, y: 0, z: 0 }, Math.PI * 0.5);
    const result = addShedRoof(kit, { ...o, slopeAxis: 'z', span: o.length, length: o.span });
    kit.pop();
    return result;
  }
  const width = o.span + over * 2;
  const run = o.length + over * 2;
  const angle = Math.atan2(o.rise, run);
  const slopeLen = Math.hypot(run, o.rise);
  kit.box(o.roofKey, width, o.thickness, slopeLen, 0, o.eaveY + o.rise * 0.5 + o.thickness * 0.5, 0, angle, 0, 0, { tile: 1.55 });
  // Side infill triangles close the roof to the rectangular walls.
  for (const side of [-1, 1]) {
    const points = [
      [-o.length * 0.5, 0],
      [o.length * 0.5, 0],
      [o.length * 0.5, -o.rise]
    ];
    kit.push({ x: side * (o.span * 0.5 - 0.1), y: o.eaveY, z: 0 }, Math.PI * 0.5);
    kit.trianglePrism(o.wallKey, points, 0.18);
    kit.pop();
  }
  kit.box(o.trimKey, width + 0.08, 0.27, 0.14, 0, o.eaveY - 0.1, o.length * 0.5 + over);
  kit.box(o.trimKey, width + 0.08, 0.27, 0.14, 0, o.eaveY + o.rise - 0.1, -o.length * 0.5 - over);
  if (o.detail >= 1) {
    kit.beam(o.trimKey, { x: -width * 0.5, y: o.eaveY, z: o.length * 0.5 + over }, { x: -width * 0.5, y: o.eaveY + o.rise, z: -o.length * 0.5 - over }, 0.08, 0.16);
    kit.beam(o.trimKey, { x: width * 0.5, y: o.eaveY, z: o.length * 0.5 + over }, { x: width * 0.5, y: o.eaveY + o.rise, z: -o.length * 0.5 - over }, 0.08, 0.16);
  }
  if (o.gutters !== false) {
    addGutterRun(kit, { ...o, gutters: true }, 0, o.length * 0.5 + over, width, 0.065, 'x');
    addDownspout(kit, o, width * 0.5 - 0.18, o.length * 0.5 + over - 0.12);
  }
  return o;
}

export function shedSurfaceY(options, x, z) {
  const o = {
    span: 8,
    length: 7,
    eaveY: 3,
    rise: 1.5,
    overhang: 0.45,
    slopeAxis: 'z',
    ...options
  };
  if (o.slopeAxis === 'x') return shedSurfaceY({ ...o, slopeAxis: 'z', span: o.length, length: o.span }, -z, x);
  const run = o.length + o.overhang * 2;
  const t = (z + run * 0.5) / Math.max(0.01, run);
  return o.eaveY + o.rise * (1 - Math.max(0, Math.min(1, t)));
}

/**
 * A dormer reads as a small gabled volume sitting on a larger roof slope.
 * Caller supplies the local roof-surface height at the dormer position.
 */
export function addDormer(kit, options = {}) {
  const o = {
    x: 0,
    y: 3.6,
    z: 2.2,
    width: 1.5,
    depth: 1.25,
    height: 1.25,
    rise: 0.8,
    overhang: 0.22,
    wallKey: 'wall_siding',
    roofKey: 'roof_shingle',
    trimKey: 'trim',
    glassKey: 'glass_lit',
    wallColor: null,
    detail: 2,
    ...options
  };
  kit.push({ x: o.x, y: o.y, z: o.z });
  kit.box(o.wallKey, o.width, o.height, o.depth, 0, o.height * 0.5, 0);
  kit.box(o.wallKey, o.width + 0.12, 0.12, o.depth + 0.08, 0, o.height + 0.02, 0);
  // Front window and trim.
  const winW = o.width * 0.5;
  const winH = o.height * 0.52;
  if (o.detail >= 1) {
    kit.box('glass', winW, winH, 0.05, 0, o.height * 0.52, o.depth * 0.5 + 0.02);
    kit.box(o.trimKey, winW + 0.15, 0.07, 0.08, 0, o.height * 0.52 + winH * 0.5 + 0.04, o.depth * 0.5 + 0.03);
    kit.box(o.trimKey, winW + 0.15, 0.07, 0.08, 0, o.height * 0.52 - winH * 0.5 - 0.04, o.depth * 0.5 + 0.03);
    kit.box(o.trimKey, 0.08, winH + 0.13, 0.08, -winW * 0.5 - 0.04, o.height * 0.52, o.depth * 0.5 + 0.03);
    kit.box(o.trimKey, 0.08, winH + 0.13, 0.08, winW * 0.5 + 0.04, o.height * 0.52, o.depth * 0.5 + 0.03);
    kit.box(o.trimKey, winW + 0.2, 0.09, 0.16, 0, o.height * 0.52 - winH * 0.5 - 0.1, o.depth * 0.5 + 0.06);
  } else {
    kit.box('glass_lit', winW, winH, 0.04, 0, o.height * 0.52, o.depth * 0.5 + 0.02);
  }
  addGableRoof(kit, {
    span: o.width,
    length: o.depth,
    eaveY: o.height + 0.02,
    rise: o.rise,
    overhang: o.overhang,
    roofKey: o.roofKey,
    trimKey: o.trimKey,
    wallKey: o.wallKey,
    gutterKey: 'metal',
    gutters: false,
    downTo: 0,
    detail: o.detail,
    gableEnds: true
  });
  kit.pop();
  return o;
}

export function addChimney(kit, options = {}) {
  const o = {
    x: 2.6,
    z: -1.2,
    baseY: 2.6,
    topY: 6.3,
    width: 0.9,
    depth: 0.9,
    brickKey: 'brick',
    trimKey: 'foundation',
    detail: 2,
    ...options
  };
  const h = Math.max(0.8, o.topY - o.baseY);
  kit.box(o.brickKey, o.width, h, o.depth, o.x, o.baseY + h * 0.5, o.z);
  kit.box(o.brickKey, o.width + 0.22, 0.16, o.depth + 0.22, o.x, o.topY - 0.04, o.z);
  kit.box(o.trimKey, o.width + 0.34, 0.16, o.depth + 0.34, o.x, o.topY + 0.12, o.z);
  if (o.detail >= 1) {
    kit.box(o.trimKey, o.width + 0.18, 0.1, o.depth + 0.18, o.x, o.topY + 0.24, o.z);
    kit.cylinder(o.darkKey || 'dark_metal', 0.1, 0.12, 0.42, 8, o.x - 0.16, o.topY + 0.46, o.z, 0, 0, 0);
    kit.cylinder(o.darkKey || 'dark_metal', 0.1, 0.12, 0.36, 8, o.x + 0.18, o.topY + 0.43, o.z, 0, 0, 0);
  }
  if (o.detail >= 2) {
    // Brick shoulder and a small cleanout door.
    kit.box(o.brickKey, o.width + 0.32, 0.24, o.depth + 0.32, o.x, o.baseY + 0.28, o.z);
    kit.box(o.darkKey || 'dark_metal', 0.3, 0.24, 0.035, o.x, o.baseY + 0.42, o.z + o.depth * 0.5 + 0.01);
  }
  return o;
}

export function addRoofVent(kit, options = {}) {
  const o = { x: 0, y: 5.3, z: 0, radius: 0.11, detail: 2, ...options };
  if (o.detail < 2) return o;
  kit.cylinder('dark_metal', o.radius, o.radius * 1.15, 0.28, 7, o.x, o.y, o.z);
  kit.cylinder('metal', o.radius + 0.06, o.radius + 0.06, 0.06, 7, o.x, o.y + 0.18, o.z);
  return o;
}
