/*!
 * Level 94 / Dreamcore Hills — Architectural Asset System
 * Copyright (c) 2026 Vendreith. Original procedural implementation.
 *
 * This package is intentionally self-contained. It does not touch terrain,
 * sky, clouds, lighting budgets, level registration, or global renderer state.
 */

export const ARCHITECTURE_VERSION = '1.0.0';

/**
 * Default distance thresholds, in metres, measured from the camera to the
 * house/cluster origin. These are defaults only: the main level owns render
 * distance and can override every threshold through createArchitectureLOD().
 */
export const HOUSE_LOD_DISTANCES = Object.freeze({
  medium: 58,
  distant: 145,
  hysteresis: 0.08
});

export const CLUSTER_LOD_DISTANCES = Object.freeze({
  medium: 86,
  distant: 210,
  hysteresis: 0.1
});

export const QUALITY_PRESETS = Object.freeze({
  landmark: { detail: 2, terrainSamples: 17, lod: true, interior: true },
  hero: { detail: 2, terrainSamples: 13, lod: true, interior: true },
  close: { detail: 2, terrainSamples: 9, lod: true, interior: false },
  scenic: { detail: 1, terrainSamples: 5, lod: true, interior: false },
  distant: { detail: 0, terrainSamples: 5, lod: true, interior: false }
});

/** Restrained, sun-washed dreamcore palette. Values are sRGB hex. */
export const COLOR_LIBRARY = Object.freeze({
  wall: {
    cream: 0xefe5d2,
    soft_white: 0xf7f3e8,
    chalk: 0xf3f1e8,
    butter: 0xf0dca8,
    pale_blue: 0xc4d9e5,
    powder_blue: 0xd2e3ea,
    pale_sage: 0xcbd6bd,
    mint: 0xd5e5d3,
    warm_peach: 0xf0cfb6,
    pale_rose: 0xe8c9cb,
    pale_lilac: 0xd8d0e2,
    sand: 0xe4d6ba,
    dusty_yellow: 0xe7d49b
  },
  trim: {
    warm_white: 0xf8f3e6,
    white: 0xfbfaf4,
    cream: 0xeee5d5,
    pale_grey: 0xdad6ca,
    soft_blue: 0xd6e2e5
  },
  roof: {
    weathered_red: 0x995347,
    brick_red: 0x8b463a,
    terracotta: 0xa65e4a,
    slate: 0x59636c,
    dusty_blue: 0x6c8391,
    charcoal: 0x43474a,
    moss_green: 0x69745f,
    warm_brown: 0x6d5645,
    faded_green: 0x82917e
  },
  door: {
    sage: 0x7e997f,
    dusty_blue: 0x6d8b9e,
    brick: 0x9c574b,
    butter: 0xd6b260,
    plum: 0x876779,
    forest: 0x4e6a56,
    cream: 0xe8dfcc,
    pale_rose: 0xcf9fa4
  },
  accent: {
    flower_red: 0xc8685a,
    flower_yellow: 0xe2c265,
    flower_white: 0xf2eee0,
    flower_pink: 0xd99bab,
    flower_blue: 0x8aa8c8,
    foliage: 0x4f6f44,
    foliage_light: 0x6c8758,
    hedge: 0x536b49,
    terracotta: 0xb36f51,
    soil: 0x554638,
    stone: 0x8f8b81,
    concrete: 0xb9b4a7,
    metal: 0x7d8588,
    dark_metal: 0x3e4346,
    wood: 0x7a5c40,
    pale_wood: 0xb28f68,
    rust: 0x8a5d43
  }
});

export const MATERIAL_NAMES = Object.freeze([
  'wall_siding',
  'wall_stucco',
  'wall_panel',
  'trim',
  'roof_shingle',
  'roof_smooth',
  'foundation',
  'stone',
  'brick',
  'wood',
  'painted_wood',
  'door',
  'glass',
  'glass_lit',
  'metal',
  'dark_metal',
  'fabric',
  'foliage',
  'hedge',
  'flower',
  'terracotta',
  'soil',
  'glow',
  'path_asphalt',
  'path_concrete',
  'path_gravel'
]);

export const HOUSE_CATEGORIES = Object.freeze([
  'cottage',
  'suburban',
  'two_story',
  'landmark',
  'oddity'
]);

export const DEFAULT_HOUSE_OPTIONS = Object.freeze({
  scale: 1,
  rotation: 0,
  lod: true,
  interior: true,
  castShadow: true,
  receiveShadow: true,
  foundationClearance: 0.18,
  maxFootprintSlope: 1.25
});

/**
 * Placement rules consumed by compositions and by the main level if it wants
 * to validate candidate lots. Not a world generator: the main level decides
 * where lots exist.
 */
export const HOUSE_PLACEMENT_RULES = Object.freeze({
  minSpacingHero: 13,
  minSpacingScenic: 8,
  maxSlopeHero: 0.9,
  maxSlopeScenic: 2.2,
  foundationFeather: 2.4,
  gradeInset: 0.35,
  maxGradeDrop: 2.8,
  pathWidth: 1.7
});
