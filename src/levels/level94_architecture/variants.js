/*! Copyright (c) 2026 Vendreith. Licensing: see LICENSE.md and THIRD_PARTY_NOTICES.md. */
/*!
 * Level 94 architecture — house variant library.
 *
 * These are real structural configurations rather than recolours: each entry
 * changes massing, roof family, floor count, window rhythm, entrance position,
 * porch/balcony construction and silhouette. Geometry is generated lazily by
 * house_builder.js; this file is only data, so importing it allocates nothing.
 */

const win = (x, y, width, height, type = 'double', extra = {}) => ({
  x, y, width, height, type,
  ...extra
});

const standardHouses = {
  classic_small: {
    id: 'classic_small',
    name: 'Classic Small Hill House',
    tagline: 'A modest gabled home with a shaded front porch and one warm-lit window.',
    category: 'cottage',
    width: 7.6,
    depth: 6.4,
    wallHeight: 3.25,
    storyHeight: 3.25,
    floors: 1,
    wallKey: 'wall_siding',
    wallThickness: 0.22,
    roof: { type: 'gable', ridgeAxis: 'x', rise: 2.15, overhang: 0.56, thickness: 0.17 },
    palette: {
      wall: ['cream', 'butter', 'soft_white'],
      roof: ['weathered_red', 'warm_brown'],
      trim: ['warm_white', 'cream'],
      door: ['sage', 'dusty_blue']
    },
    door: { wall: 'front', x: 0, width: 1.14, height: 2.12, style: 'panel', transom: false },
    windows: {
      front: [
        win(-2.35, 1.0, 1.1, 1.28, 'double', { shutters: true, flowerBox: true, lit: false }),
        win(2.35, 1.0, 1.1, 1.28, 'double', { shutters: true, lit: true })
      ],
      back: [win(-1.5, 1.05, 1.35, 1.2, 'single'), win(1.8, 1.05, 0.95, 1.2, 'tall')],
      left: [win(0.6, 1.05, 1.1, 1.2, 'double')],
      right: [win(-0.7, 1.05, 0.9, 1.15, 'single', { lit: true })]
    },
    gableWindow: null,
    porch: { wall: 'front', width: 4.2, depth: 1.65, roof: 'shed', roofRise: 0.85, posts: 2, railing: true, steps: true, columnStyle: 'square' },
    chimney: { x: 2.55, z: -1.35, width: 0.78, depth: 0.78 },
    trim: { cornerBoards: true, gutters: true, foundationVents: true, shutters: true, floorBand: false },
    interior: { furniture: true, curtains: true, rug: true },
    backgroundOk: true,
    preferredSlope: 0.55
  },

  twin_window: {
    id: 'twin_window',
    name: 'Twin-Window Suburban Home',
    tagline: 'Symmetrical paired windows under a front-facing gable, unusually quiet.',
    category: 'suburban',
    width: 9.0,
    depth: 6.8,
    wallHeight: 3.4,
    storyHeight: 3.4,
    floors: 1,
    wallKey: 'wall_siding',
    wallThickness: 0.22,
    roof: { type: 'gable', ridgeAxis: 'z', rise: 2.65, overhang: 0.52, thickness: 0.17 },
    palette: {
      wall: ['soft_white', 'chalk', 'pale_blue'],
      roof: ['dusty_blue', 'slate', 'weathered_red'],
      trim: ['white', 'warm_white'],
      door: ['brick', 'forest', 'butter']
    },
    door: { wall: 'front', x: 0, width: 1.18, height: 2.14, style: 'panel', sidelights: true, transom: true },
    windows: {
      front: [
        win(-3.15, 1.02, 1.25, 1.32, 'double', { shutters: true }),
        win(-1.25, 1.02, 1.25, 1.32, 'double', { shutters: true, lit: true }),
        win(1.25, 1.02, 1.25, 1.32, 'double', { shutters: true }),
        win(3.15, 1.02, 1.25, 1.32, 'double', { shutters: true, flowerBox: true })
      ],
      back: [win(-1.8, 1.02, 1.2, 1.2, 'double'), win(1.8, 1.02, 1.2, 1.2, 'double')],
      left: [win(0, 1.02, 1.15, 1.22, 'tall')],
      right: [win(0, 1.02, 1.15, 1.22, 'tall')]
    },
    gableWindow: { x: 0, y: 4.35, radius: 0.48, type: 'round', lit: true },
    porch: { wall: 'front', width: 3.1, depth: 1.2, roof: 'gable', roofRise: 0.95, posts: 2, railing: false, steps: true, columnStyle: 'round' },
    chimney: { x: -3.1, z: -1.5, width: 0.72, depth: 0.72 },
    trim: { cornerBoards: true, gutters: true, foundationVents: true, shutters: true, floorBand: false },
    interior: { furniture: true, curtains: true, rug: true },
    backgroundOk: true,
    preferredSlope: 0.7
  },

  pastel_blue_cottage: {
    id: 'pastel_blue_cottage',
    name: 'Pastel Blue Cottage',
    tagline: 'A steep little roof, a projecting bay window, and too many flowers.',
    category: 'cottage',
    width: 6.35,
    depth: 5.7,
    wallHeight: 2.95,
    storyHeight: 2.95,
    floors: 1,
    wallKey: 'wall_stucco',
    wallThickness: 0.24,
    roof: { type: 'gable', ridgeAxis: 'z', rise: 3.05, overhang: 0.62, thickness: 0.16 },
    palette: {
      wall: ['pale_blue', 'powder_blue', 'mint'],
      roof: ['slate', 'dusty_blue'],
      trim: ['warm_white', 'white'],
      door: ['cream', 'pale_rose', 'dusty_blue']
    },
    door: { wall: 'front', x: 1.45, width: 1.02, height: 2.05, style: 'glass', transom: false },
    windows: {
      front: [
        win(-1.65, 0.92, 1.55, 1.42, 'bay', { flowerBox: true, lit: true }),
        win(0.15, 3.0, 0.8, 0.95, 'square', { shutters: true })
      ],
      back: [win(0, 0.98, 1.1, 1.15, 'single')],
      left: [win(0.6, 0.95, 1.2, 1.22, 'double', { flowerBox: true })],
      right: [win(-0.55, 0.98, 1.1, 1.2, 'tall')]
    },
    gableWindow: { x: 0, y: 4.4, radius: 0.43, type: 'round', lit: true },
    porch: null,
    stoop: { width: 2.0, depth: 0.95, steps: true, roof: 'none' },
    chimney: { x: -1.75, z: -1.4, width: 0.68, depth: 0.68 },
    trim: { cornerBoards: true, gutters: true, foundationVents: true, shutters: true, floorBand: false },
    interior: { furniture: true, curtains: true, rug: true },
    backgroundOk: true,
    preferredSlope: 0.6
  },

  cream_gabled: {
    id: 'cream_gabled',
    name: 'Cream-Coloured Gabled House',
    tagline: 'A cross-gabled home with a small rear wing and one dormer listening to the sky.',
    category: 'suburban',
    width: 8.4,
    depth: 7.0,
    wallHeight: 3.35,
    storyHeight: 3.35,
    floors: 1,
    wallKey: 'wall_siding',
    wallThickness: 0.22,
    roof: { type: 'cross_gable', ridgeAxis: 'x', rise: 2.3, overhang: 0.55, thickness: 0.17, cross: { x: 1.35, z: -0.2, width: 3.55, depth: 4.4, rise: 1.65, ridgeAxis: 'z' } },
    palette: {
      wall: ['cream', 'sand', 'soft_white'],
      roof: ['charcoal', 'warm_brown', 'moss_green'],
      trim: ['cream', 'warm_white'],
      door: ['forest', 'dusty_blue', 'brick']
    },
    door: { wall: 'front', x: -2.1, width: 1.12, height: 2.12, style: 'panel', transom: false },
    windows: {
      front: [
        win(-3.25, 0.98, 0.95, 1.2, 'tall', { shutters: true }),
        win(0.25, 0.98, 1.35, 1.3, 'double', { flowerBox: true, lit: true }),
        win(2.65, 0.98, 1.1, 1.3, 'double', { shutters: true })
      ],
      back: [win(-1.15, 1.0, 1.2, 1.2, 'double'), win(1.7, 1.0, 1.0, 1.2, 'single')],
      left: [win(0.2, 1.0, 1.2, 1.2, 'double', { flowerBox: true })],
      right: [win(-0.4, 1.0, 1.0, 1.2, 'single')]
    },
    gableWindow: null,
    dormers: [{ x: 1.25, z: 2.2, width: 1.5, depth: 1.25, height: 1.18, rise: 0.76 }],
    wings: [{ x: 4.55, z: -1.65, width: 3.25, depth: 4.35, height: 2.95, roof: 'gable', rise: 1.3, ridgeAxis: 'z', window: true }],
    porch: { wall: 'front', width: 3.2, depth: 1.55, roof: 'shed', roofRise: 0.75, posts: 2, railing: true, steps: true, columnStyle: 'square' },
    chimney: { x: -2.6, z: -1.6, width: 0.8, depth: 0.8 },
    trim: { cornerBoards: true, gutters: true, foundationVents: true, shutters: true, floorBand: false },
    interior: { furniture: true, curtains: true, rug: true },
    backgroundOk: true,
    preferredSlope: 0.8
  },

  long_narrow: {
    id: 'long_narrow',
    name: 'Long Narrow Hilltop Residence',
    tagline: 'A low, patient roofline with four windows facing the same enormous horizon.',
    category: 'suburban',
    width: 12.6,
    depth: 5.4,
    wallHeight: 3.1,
    storyHeight: 3.1,
    floors: 1,
    wallKey: 'wall_siding',
    wallThickness: 0.2,
    roof: { type: 'gable', ridgeAxis: 'x', rise: 1.9, overhang: 0.5, thickness: 0.16, ridgeOffset: -0.35 },
    palette: {
      wall: ['sand', 'cream', 'dusty_yellow'],
      roof: ['weathered_red', 'warm_brown', 'slate'],
      trim: ['warm_white', 'cream'],
      door: ['dusty_blue', 'sage']
    },
    door: { wall: 'front', x: -4.15, width: 1.08, height: 2.1, style: 'panel', transom: false },
    windows: {
      front: [
        win(-2.5, 0.96, 1.0, 1.22, 'double'),
        win(-0.8, 0.96, 1.0, 1.22, 'double', { shutters: true }),
        win(1.0, 0.96, 1.0, 1.22, 'double', { lit: true }),
        win(2.6, 0.96, 1.0, 1.22, 'double'),
        win(4.35, 0.96, 0.85, 1.22, 'tall')
      ],
      back: [win(-2.2, 0.98, 1.2, 1.2, 'single'), win(0.6, 0.98, 1.2, 1.2, 'single'), win(3.3, 0.98, 0.9, 1.2, 'single')],
      left: [win(0, 0.98, 1.2, 1.2, 'double')],
      right: [win(0, 0.98, 1.2, 1.2, 'double')]
    },
    gableWindow: null,
    porch: { wall: 'front', width: 3.5, depth: 1.45, roof: 'shed', roofRise: 0.72, posts: 2, railing: true, steps: true, columnStyle: 'square' },
    chimney: { x: 4.55, z: -1.2, width: 0.76, depth: 0.76 },
    trim: { cornerBoards: true, gutters: true, foundationVents: true, shutters: true, floorBand: false },
    interior: { furniture: true, curtains: true, rug: true },
    backgroundOk: true,
    preferredSlope: 0.9
  },

  isolated_red_roof: {
    id: 'isolated_red_roof',
    name: 'Isolated Red-Roof Cottage',
    tagline: 'A clean white box under a weathered red hip roof, alone for no obvious reason.',
    category: 'cottage',
    width: 6.6,
    depth: 6.0,
    wallHeight: 3.05,
    storyHeight: 3.05,
    floors: 1,
    wallKey: 'wall_stucco',
    wallThickness: 0.23,
    roof: { type: 'hip', ridgeAxis: 'auto', rise: 2.25, overhang: 0.58, thickness: 0.19 },
    palette: {
      wall: ['soft_white', 'chalk', 'cream'],
      roof: ['weathered_red', 'terracotta'],
      trim: ['warm_white', 'white'],
      door: ['sage', 'dusty_blue', 'butter']
    },
    door: { wall: 'front', x: -0.9, width: 1.1, height: 2.08, style: 'panel', transom: true },
    windows: {
      front: [win(1.65, 0.95, 1.2, 1.3, 'double', { shutters: true }), win(-2.1, 0.95, 0.9, 1.3, 'tall', { flowerBox: true })],
      back: [win(0.4, 0.98, 1.3, 1.2, 'double')],
      left: [win(-0.4, 0.98, 1.15, 1.2, 'single', { lit: true })],
      right: [win(0.5, 0.98, 1.15, 1.2, 'single')]
    },
    gableWindow: null,
    porch: null,
    stoop: { width: 1.9, depth: 0.9, steps: true, roof: 'none' },
    chimney: { x: 1.8, z: -1.3, width: 0.74, depth: 0.74 },
    trim: { cornerBoards: true, gutters: true, foundationVents: true, shutters: true, floorBand: false },
    interior: { furniture: true, curtains: true, rug: true },
    backgroundOk: true,
    preferredSlope: 0.65
  },

  two_story_dream: {
    id: 'two_story_dream',
    name: 'Small Two-Story Dream House',
    tagline: 'A narrow stair, a shallow balcony, and pale blue rooms stacked quietly on one another.',
    category: 'two_story',
    width: 7.4,
    depth: 6.6,
    wallHeight: 6.15,
    storyHeight: 3.0,
    floors: 2,
    wallKey: 'wall_siding',
    wallThickness: 0.22,
    roof: { type: 'hip', ridgeAxis: 'auto', rise: 2.25, overhang: 0.6, thickness: 0.19 },
    palette: {
      wall: ['pale_blue', 'cream', 'powder_blue'],
      roof: ['slate', 'dusty_blue', 'weathered_red'],
      trim: ['warm_white', 'white'],
      door: ['brick', 'forest', 'dusty_blue']
    },
    door: { wall: 'front', x: 0, width: 1.12, height: 2.12, style: 'panel', sideLights: true },
    windows: {
      front: [
        win(-2.45, 0.98, 1.05, 1.22, 'double', { shutters: true }),
        win(2.45, 0.98, 1.05, 1.22, 'double', { shutters: true }),
        win(-2.45, 3.92, 1.05, 1.18, 'double', { shutters: true, lit: true }),
        win(2.45, 3.92, 1.05, 1.18, 'double', { shutters: true })
      ],
      back: [win(-1.55, 0.98, 1.1, 1.2, 'double'), win(1.55, 0.98, 1.1, 1.2, 'double'), win(0.0, 3.95, 1.2, 1.15, 'double')],
      left: [win(0.2, 0.98, 1.05, 1.2, 'single'), win(-0.4, 3.95, 0.95, 1.15, 'single', { lit: true })],
      right: [win(-0.3, 0.98, 1.05, 1.2, 'single'), win(0.4, 3.95, 0.95, 1.15, 'single')]
    },
    gableWindow: null,
    porch: { wall: 'front', width: 4.4, depth: 1.95, roof: 'none', posts: 2, railing: true, steps: true, columnStyle: 'round' },
    balcony: { wall: 'front', width: 3.25, depth: 1.18, y: 3.2, railing: true, door: { x: 0, width: 1.0, height: 2.02 } },
    chimney: { x: 2.7, z: -1.6, width: 0.74, depth: 0.74 },
    trim: { cornerBoards: true, gutters: true, foundationVents: true, shutters: true, floorBand: true },
    interior: { furniture: true, curtains: true, rug: true, stairs: true },
    backgroundOk: true,
    preferredSlope: 0.6
  },

  white_porch: {
    id: 'white_porch',
    name: 'White Porch House',
    tagline: 'A broad white porch with four columns, built for evenings that never arrive.',
    category: 'suburban',
    width: 9.6,
    depth: 7.4,
    wallHeight: 3.5,
    storyHeight: 3.5,
    floors: 1,
    wallKey: 'wall_siding',
    wallThickness: 0.22,
    roof: { type: 'hip', ridgeAxis: 'auto', rise: 2.4, overhang: 0.62, thickness: 0.2 },
    palette: {
      wall: ['soft_white', 'chalk', 'cream'],
      roof: ['slate', 'dusty_blue', 'charcoal'],
      trim: ['white', 'warm_white'],
      door: ['sage', 'dusty_blue', 'brick']
    },
    door: { wall: 'front', x: 0, width: 1.28, height: 2.18, style: 'panel', sidelights: true, transom: true },
    windows: {
      front: [
        win(-3.75, 1.0, 1.25, 1.35, 'double', { shutters: true }),
        win(-2.15, 1.0, 1.25, 1.35, 'double', { shutters: true, lit: true }),
        win(2.15, 1.0, 1.25, 1.35, 'double', { shutters: true }),
        win(3.75, 1.0, 1.25, 1.35, 'double', { shutters: true, flowerBox: true })
      ],
      back: [win(-2.1, 1.0, 1.2, 1.2, 'double'), win(1.8, 1.0, 1.2, 1.2, 'double')],
      left: [win(0, 1.0, 1.15, 1.22, 'double')],
      right: [win(0, 1.0, 1.15, 1.22, 'double')]
    },
    gableWindow: null,
    porch: { wall: 'front', width: 8.35, depth: 2.35, roof: 'gable', roofRise: 1.15, posts: 4, railing: true, steps: true, columnStyle: 'round', pediment: true },
    chimney: { x: -2.7, z: -1.7, width: 0.8, depth: 0.8 },
    trim: { cornerBoards: true, gutters: true, foundationVents: true, shutters: true, floorBand: false },
    interior: { furniture: true, curtains: true, rug: true },
    backgroundOk: true,
    preferredSlope: 0.55
  },

  asymmetric_window: {
    id: 'asymmetric_window',
    name: 'Asymmetric Window House',
    tagline: 'Two windows from different arguments, and a shed-roofed wing that does not apologize.',
    category: 'oddity',
    width: 8.2,
    depth: 6.5,
    wallHeight: 3.25,
    storyHeight: 3.25,
    floors: 1,
    wallKey: 'wall_siding',
    wallThickness: 0.22,
    roof: { type: 'gable', ridgeAxis: 'x', rise: 2.85, overhang: 0.58, ridgeOffset: 1.15, thickness: 0.17 },
    palette: {
      wall: ['pale_sage', 'mint', 'cream'],
      roof: ['warm_brown', 'charcoal', 'faded_green'],
      trim: ['cream', 'warm_white'],
      door: ['butter', 'brick', 'forest']
    },
    door: { wall: 'front', x: 1.45, width: 1.1, height: 2.08, style: 'glass', transom: true },
    windows: {
      front: [
        win(-2.85, 0.94, 0.78, 1.52, 'tall', { shutters: true }),
        win(-1.3, 0.94, 1.15, 1.05, 'square'),
        win(3.2, 0.94, 0.9, 1.25, 'single', { lit: true })
      ],
      back: [win(-1.4, 0.98, 1.2, 1.2, 'double'), win(1.8, 0.98, 1.0, 1.2, 'single')],
      left: [win(0.1, 0.98, 1.15, 1.2, 'double')],
      right: [win(-0.6, 0.98, 1.0, 1.2, 'single')]
    },
    gableWindow: null,
    wings: [{ x: -5.2, z: 0.7, width: 3.15, depth: 4.2, height: 2.8, roof: 'shed', rise: 1.1, ridgeAxis: 'x', window: true }],
    porch: { wall: 'front', width: 2.7, depth: 1.3, roof: 'shed', roofRise: 0.68, posts: 2, railing: false, steps: true, columnStyle: 'square' },
    chimney: { x: -1.25, z: -1.25, width: 0.75, depth: 0.75 },
    trim: { cornerBoards: true, gutters: true, foundationVents: true, shutters: true, floorBand: false },
    interior: { furniture: true, curtains: true, rug: true },
    backgroundOk: true,
    preferredSlope: 0.85
  },

  rounded_entry: {
    id: 'rounded_entry',
    name: 'Rounded Entryway Cottage',
    tagline: 'A curved little tower gathers the doorway, the steps and the whole hill into one gesture.',
    category: 'oddity',
    width: 6.65,
    depth: 6.1,
    wallHeight: 3.2,
    storyHeight: 3.2,
    floors: 1,
    wallKey: 'wall_stucco',
    wallThickness: 0.23,
    roof: { type: 'gable', ridgeAxis: 'x', rise: 2.45, overhang: 0.56, thickness: 0.17 },
    palette: {
      wall: ['warm_peach', 'cream', 'pale_rose'],
      roof: ['weathered_red', 'terracotta', 'dusty_blue'],
      trim: ['warm_white', 'cream'],
      door: ['sage', 'forest', 'dusty_blue']
    },
    door: { wall: 'front', x: 0.85, width: 1.05, height: 2.05, style: 'panel', transom: true },
    windows: {
      front: [win(-1.85, 0.94, 1.1, 1.25, 'double', { flowerBox: true, lit: true })],
      back: [win(-0.7, 0.98, 1.15, 1.18, 'double'), win(1.5, 0.98, 0.9, 1.18, 'single')],
      left: [win(0.4, 0.98, 1.05, 1.18, 'single')],
      right: [win(-0.4, 0.98, 1.05, 1.18, 'single')]
    },
    gableWindow: null,
    entryTower: { x: 0.85, z: 2.55, radius: 1.18, height: 3.3, rise: 1.55, doorWidth: 1.05, doorHeight: 2.05 },
    porch: null,
    stoop: { width: 2.3, depth: 1.1, steps: true, roof: 'none' },
    chimney: { x: -1.9, z: -1.45, width: 0.7, depth: 0.7 },
    trim: { cornerBoards: false, gutters: true, foundationVents: true, shutters: false, floorBand: false },
    interior: { furniture: true, curtains: true, rug: true },
    backgroundOk: true,
    preferredSlope: 0.6
  },

  detached_stair: {
    id: 'detached_stair',
    name: 'Detached Staircase House',
    tagline: 'The only way up is outside, along a stair that was never given a handrail it deserved.',
    category: 'two_story',
    width: 8.0,
    depth: 6.4,
    wallHeight: 6.0,
    storyHeight: 2.9,
    floors: 2,
    wallKey: 'wall_siding',
    wallThickness: 0.22,
    roof: { type: 'gable', ridgeAxis: 'x', rise: 2.4, overhang: 0.55, thickness: 0.17, ridgeOffset: -0.35 },
    palette: {
      wall: ['sand', 'cream', 'dusty_yellow'],
      roof: ['moss_green', 'charcoal', 'weathered_red'],
      trim: ['cream', 'warm_white'],
      door: ['brick', 'forest', 'dusty_blue']
    },
    door: { wall: 'back', x: -0.8, width: 1.1, height: 2.08, style: 'panel' },
    windows: {
      front: [
        win(-2.6, 0.96, 1.05, 1.2, 'double', { shutters: true }),
        win(1.0, 0.96, 1.05, 1.2, 'double', { lit: true }),
        win(-2.6, 3.82, 1.05, 1.18, 'double', { shutters: true }),
        win(1.0, 3.82, 1.05, 1.18, 'double', { shutters: true })
      ],
      back: [win(1.6, 0.96, 1.0, 1.2, 'single'), win(0.0, 3.85, 1.0, 1.15, 'single')],
      left: [win(0.2, 0.96, 1.0, 1.18, 'single'), win(-0.2, 3.85, 0.95, 1.12, 'single', { lit: true })],
      right: [win(-0.6, 0.96, 1.0, 1.18, 'single')]
    },
    gableWindow: null,
    externalStair: { wall: 'right', width: 1.12, z: -0.9, rise: 3.05, run: 3.4, landingDepth: 1.25, railing: true, upperDoor: { x: 1.25, width: 0.95, height: 2.0 } },
    porch: null,
    stoop: { width: 1.9, depth: 0.9, steps: true, roof: 'none' },
    chimney: { x: 2.8, z: -1.35, width: 0.74, depth: 0.74 },
    trim: { cornerBoards: true, gutters: true, foundationVents: true, shutters: true, floorBand: true },
    interior: { furniture: true, curtains: true, rug: true, stairs: true },
    backgroundOk: true,
    preferredSlope: 0.6
  },

  quiet_corner: {
    id: 'quiet_corner',
    name: 'Quiet Corner Residence',
    tagline: 'An L-shaped house turning its shoulder to the road, as if listening to something behind it.',
    category: 'suburban',
    width: 8.8,
    depth: 6.2,
    wallHeight: 3.2,
    storyHeight: 3.2,
    floors: 1,
    wallKey: 'wall_siding',
    wallThickness: 0.22,
    roof: { type: 'cross_gable', ridgeAxis: 'x', rise: 2.2, overhang: 0.55, thickness: 0.17, cross: { x: -2.6, z: 0.4, width: 3.8, depth: 4.8, rise: 1.7, ridgeAxis: 'z' } },
    palette: {
      wall: ['pale_rose', 'cream', 'pale_lilac'],
      roof: ['faded_green', 'slate', 'weathered_red'],
      trim: ['warm_white', 'cream'],
      door: ['forest', 'butter', 'dusty_blue']
    },
    door: { wall: 'front', x: 1.9, width: 1.08, height: 2.08, style: 'panel', transom: false },
    windows: {
      front: [
        win(-0.75, 0.96, 1.15, 1.25, 'double', { shutters: true }),
        win(3.55, 0.96, 0.9, 1.22, 'tall'),
        win(0.0, 3.0, 0.75, 0.9, 'square', { lit: true })
      ],
      back: [win(-1.0, 0.98, 1.2, 1.2, 'double'), win(2.0, 0.98, 1.2, 1.2, 'double')],
      left: [win(0.6, 0.98, 1.1, 1.2, 'single')],
      right: [win(-0.3, 0.98, 1.0, 1.2, 'single')]
    },
    gableWindow: null,
    wings: [{ x: -4.1, z: 1.55, width: 3.9, depth: 4.7, height: 3.0, roof: 'gable', rise: 1.55, ridgeAxis: 'z', window: true }],
    porch: { wall: 'front', width: 2.9, depth: 1.45, roof: 'shed', roofRise: 0.72, posts: 2, railing: true, steps: true, columnStyle: 'square' },
    chimney: { x: 2.2, z: -1.45, width: 0.74, depth: 0.74 },
    trim: { cornerBoards: true, gutters: true, foundationVents: true, shutters: true, floorBand: false },
    interior: { furniture: true, curtains: true, rug: true },
    backgroundOk: true,
    preferredSlope: 0.8
  },

  single_room: {
    id: 'single_room',
    name: 'Single-Room Dreamcore House',
    tagline: 'One room, one window, one door, and a roof that is much too large for all of it.',
    category: 'cottage',
    width: 4.9,
    depth: 4.7,
    wallHeight: 2.75,
    storyHeight: 2.75,
    floors: 1,
    wallKey: 'wall_siding',
    wallThickness: 0.2,
    roof: { type: 'gable', ridgeAxis: 'z', rise: 2.6, overhang: 0.58, thickness: 0.16 },
    palette: {
      wall: ['butter', 'pale_blue', 'cream'],
      roof: ['charcoal', 'slate', 'weathered_red'],
      trim: ['warm_white', 'white'],
      door: ['dusty_blue', 'sage']
    },
    door: { wall: 'front', x: 0, width: 1.0, height: 2.02, style: 'panel', transom: false },
    windows: {
      front: [win(-1.45, 0.9, 0.95, 1.15, 'double', { lit: true, flowerBox: true })],
      back: [win(0, 0.92, 0.9, 1.1, 'single')],
      left: [win(0, 0.92, 0.9, 1.1, 'square')],
      right: []
    },
    gableWindow: { x: 0, y: 3.45, radius: 0.36, type: 'round', lit: false },
    porch: null,
    stoop: { width: 1.7, depth: 0.8, steps: true, roof: 'none' },
    chimney: { x: -1.25, z: -1.1, width: 0.62, depth: 0.62 },
    trim: { cornerBoards: true, gutters: true, foundationVents: true, shutters: false, floorBand: false },
    interior: { furniture: true, curtains: true, rug: true },
    backgroundOk: true,
    preferredSlope: 0.8
  },

  tall_roof: {
    id: 'tall_roof',
    name: 'Tall Roof House',
    tagline: 'A narrow house wearing a steep red roof, visible long before the road arrives.',
    category: 'oddity',
    width: 6.0,
    depth: 7.2,
    wallHeight: 3.4,
    storyHeight: 3.4,
    floors: 1,
    wallKey: 'wall_siding',
    wallThickness: 0.21,
    roof: { type: 'gable', ridgeAxis: 'z', rise: 4.35, overhang: 0.55, thickness: 0.17 },
    palette: {
      wall: ['cream', 'soft_white', 'pale_blue'],
      roof: ['weathered_red', 'terracotta', 'brick_red'],
      trim: ['warm_white', 'white'],
      door: ['sage', 'forest', 'dusty_blue']
    },
    door: { wall: 'front', x: 0, width: 1.08, height: 2.1, style: 'panel', transom: true },
    windows: {
      front: [win(-1.55, 0.95, 0.95, 1.25, 'tall', { shutters: true }), win(1.55, 0.95, 0.95, 1.25, 'tall', { shutters: true, lit: true })],
      back: [win(0, 0.98, 1.1, 1.2, 'double')],
      left: [win(0, 0.98, 1.05, 1.2, 'single'), win(0, 2.95, 0.8, 1.0, 'square')],
      right: [win(0, 0.98, 1.05, 1.2, 'single')]
    },
    gableWindow: { x: 0, y: 4.6, radius: 0.4, type: 'round', lit: true },
    dormers: [{ x: 0, z: 2.35, width: 1.2, depth: 1.05, height: 1.0, rise: 0.72 }],
    porch: { wall: 'front', width: 2.8, depth: 1.35, roof: 'shed', roofRise: 0.7, posts: 2, railing: false, steps: true, columnStyle: 'round' },
    chimney: { x: 1.95, z: -1.5, width: 0.7, depth: 0.7 },
    trim: { cornerBoards: true, gutters: true, foundationVents: true, shutters: true, floorBand: false },
    interior: { furniture: true, curtains: true, rug: true, stairs: true },
    backgroundOk: true,
    preferredSlope: 0.7
  },

  strange_familiar: {
    id: 'strange_familiar',
    name: 'Strange Familiar House',
    tagline: 'Every detail is correct. The front door is on the second floor. There are no stairs.',
    category: 'oddity',
    width: 8.6,
    depth: 6.8,
    wallHeight: 6.0,
    storyHeight: 2.9,
    floors: 2,
    wallKey: 'wall_stucco',
    wallThickness: 0.23,
    roof: { type: 'gable', ridgeAxis: 'x', rise: 2.55, overhang: 0.58, ridgeOffset: -1.05, thickness: 0.17 },
    palette: {
      wall: ['pale_lilac', 'dusty_yellow', 'pale_blue'],
      roof: ['dusty_blue', 'charcoal', 'weathered_red'],
      trim: ['warm_white', 'cream'],
      door: ['brick', 'plum', 'forest']
    },
    door: { wall: 'right', x: 1.4, width: 1.08, height: 2.08, style: 'panel' },
    windows: {
      front: [
        win(-2.6, 0.95, 1.1, 1.25, 'double', { shutters: true }),
        win(-0.2, 0.95, 1.1, 1.25, 'double', { shutters: true }),
        win(2.2, 0.95, 1.1, 1.25, 'double', { shutters: true, lit: true }),
        win(-2.6, 3.82, 1.0, 1.18, 'double', { shutters: true }),
        win(2.2, 3.82, 1.0, 1.18, 'double', { shutters: true, lit: true }),
        win(0.0, 4.1, 0.75, 0.85, 'round', { lit: true })
      ],
      back: [win(-1.5, 0.96, 1.1, 1.18, 'double'), win(1.4, 0.96, 1.1, 1.18, 'double')],
      left: [win(0.0, 0.98, 1.1, 1.2, 'single'), win(0.0, 3.85, 1.0, 1.15, 'single')],
      right: [win(-1.4, 0.98, 1.0, 1.15, 'single'), win(-1.4, 3.85, 1.0, 1.15, 'single', { lit: true })]
    },
    gableWindow: null,
    balcony: { wall: 'front', width: 2.0, depth: 0.58, y: 3.18, railing: true, door: { x: 0, width: 1.0, height: 2.05 } },
    porch: null,
    stoop: { width: 1.9, depth: 0.9, steps: true, roof: 'none' },
    chimney: { x: -2.85, z: -1.5, width: 0.72, depth: 0.72 },
    trim: { cornerBoards: true, gutters: true, foundationVents: true, shutters: true, floorBand: true },
    interior: { furniture: true, curtains: true, rug: true, stairs: true },
    backgroundOk: true,
    preferredSlope: 0.65
  }
};

const landmarks = {
  hilltop_solitary: {
    id: 'hilltop_solitary',
    name: 'The Solitary Hilltop House',
    tagline: 'A wide pale house alone on the highest grass, with a porch as long as a held breath.',
    category: 'landmark',
    landmark: true,
    width: 12.2,
    depth: 7.4,
    wallHeight: 3.6,
    storyHeight: 3.6,
    floors: 1,
    wallKey: 'wall_siding',
    wallThickness: 0.22,
    roof: { type: 'hip', ridgeAxis: 'x', rise: 2.25, overhang: 0.72, thickness: 0.2 },
    palette: {
      wall: ['cream', 'soft_white', 'pale_blue'],
      roof: ['weathered_red', 'slate', 'dusty_blue'],
      trim: ['warm_white', 'white'],
      door: ['sage', 'dusty_blue', 'brick']
    },
    door: { wall: 'front', x: 0, width: 1.3, height: 2.2, style: 'panel', sidelights: true, transom: true },
    windows: {
      front: [
        win(-4.65, 1.0, 1.15, 1.35, 'double', { shutters: true }),
        win(-3.1, 1.0, 1.15, 1.35, 'double', { shutters: true }),
        win(3.1, 1.0, 1.15, 1.35, 'double', { shutters: true, lit: true }),
        win(4.65, 1.0, 1.15, 1.35, 'double', { shutters: true })
      ],
      back: [win(-2.5, 1.0, 1.25, 1.28, 'double'), win(0.6, 1.0, 1.25, 1.28, 'double'), win(3.2, 1.0, 1.0, 1.28, 'single')],
      left: [win(-1.2, 1.0, 1.0, 1.25, 'double'), win(1.2, 1.0, 1.0, 1.25, 'double')],
      right: [win(-1.2, 1.0, 1.0, 1.25, 'double'), win(1.2, 1.0, 1.0, 1.25, 'double')]
    },
    gableWindow: null,
    dormers: [
      { x: -2.5, z: 2.1, width: 1.45, depth: 1.15, height: 1.18, rise: 0.72 },
      { x: 2.5, z: 2.1, width: 1.45, depth: 1.15, height: 1.18, rise: 0.72 }
    ],
    porch: { wall: 'front', width: 9.3, depth: 2.35, roof: 'gable', roofRise: 1.2, posts: 4, railing: true, steps: true, columnStyle: 'round', pediment: true },
    chimney: { x: -3.4, z: -1.7, width: 0.86, depth: 0.86 },
    chimney2: { x: 3.4, z: -1.7, width: 0.86, depth: 0.86 },
    trim: { cornerBoards: true, gutters: true, foundationVents: true, shutters: true, floorBand: false },
    interior: { furniture: true, curtains: true, rug: true },
    backgroundOk: true,
    preferredSlope: 0.42,
    landmarkNotes: 'Intended for the highest broad hill. Preserve 12–16 m of open grass on all sides.'
  },

  tall_roof_landmark: {
    id: 'tall_roof_landmark',
    name: 'The Tall Roof',
    tagline: 'A pale two-story silhouette and an unreasonable steep roof, visible across the whole valley.',
    category: 'landmark',
    landmark: true,
    width: 7.2,
    depth: 6.5,
    wallHeight: 6.3,
    storyHeight: 2.95,
    floors: 2,
    wallKey: 'wall_stucco',
    wallThickness: 0.22,
    roof: { type: 'gable', ridgeAxis: 'z', rise: 5.0, overhang: 0.62, thickness: 0.18 },
    palette: {
      wall: ['soft_white', 'pale_blue', 'cream'],
      roof: ['slate', 'weathered_red', 'dusty_blue'],
      trim: ['white', 'warm_white'],
      door: ['forest', 'brick', 'dusty_blue']
    },
    door: { wall: 'front', x: 0, width: 1.15, height: 2.15, style: 'panel', transom: true },
    windows: {
      front: [
        win(-1.85, 0.98, 0.95, 1.28, 'tall', { shutters: true }),
        win(1.85, 0.98, 0.95, 1.28, 'tall', { shutters: true }),
        win(-1.85, 3.9, 0.95, 1.2, 'tall', { shutters: true, lit: true }),
        win(1.85, 3.9, 0.95, 1.2, 'tall', { shutters: true })
      ],
      back: [win(-1.3, 0.98, 1.0, 1.2, 'double'), win(1.3, 0.98, 1.0, 1.2, 'double'), win(0, 3.92, 1.0, 1.15, 'single')],
      left: [win(0, 0.98, 1.0, 1.18, 'single'), win(0, 3.9, 0.9, 1.12, 'single')],
      right: [win(0, 0.98, 1.0, 1.18, 'single'), win(0, 3.9, 0.9, 1.12, 'single', { lit: true })]
    },
    gableWindow: { x: 0, y: 8.25, radius: 0.52, type: 'round', lit: true },
    dormers: [{ x: 0, z: 2.55, width: 1.35, depth: 1.1, height: 1.08, rise: 0.75 }],
    balcony: { wall: 'front', width: 2.8, depth: 1.0, y: 3.2, railing: true, door: { x: 0, width: 1.0, height: 2.02 } },
    porch: { wall: 'front', width: 3.2, depth: 1.5, roof: 'none', posts: 2, railing: false, steps: true, columnStyle: 'round' },
    chimney: { x: 2.25, z: -1.6, width: 0.76, depth: 0.76 },
    chimney2: { x: -2.25, z: -1.6, width: 0.7, depth: 0.7 },
    trim: { cornerBoards: true, gutters: true, foundationVents: true, shutters: true, floorBand: true },
    interior: { furniture: true, curtains: true, rug: true, stairs: true },
    backgroundOk: true,
    preferredSlope: 0.5,
    landmarkNotes: 'Place near the edge of the playable bowl or on a secondary ridge for skyline recognition.'
  },

  threshold_house: {
    id: 'threshold_house',
    name: 'The House of the Open Door',
    tagline: 'An ordinary cottage with an entrance that is far too important, framed by four columns and a patient pediment.',
    category: 'landmark',
    landmark: true,
    width: 9.2,
    depth: 7.1,
    wallHeight: 3.65,
    storyHeight: 3.65,
    floors: 1,
    wallKey: 'wall_siding',
    wallThickness: 0.22,
    roof: { type: 'gable', ridgeAxis: 'x', rise: 2.5, overhang: 0.62, thickness: 0.18 },
    palette: {
      wall: ['pale_blue', 'cream', 'soft_white'],
      roof: ['terracotta', 'weathered_red', 'slate'],
      trim: ['warm_white', 'white'],
      door: ['forest', 'brick', 'plum']
    },
    door: { wall: 'front', x: 0, width: 2.12, height: 2.42, style: 'double', sidelights: true, transom: true, open: false },
    windows: {
      front: [
        win(-3.55, 1.0, 1.15, 1.35, 'double', { shutters: true }),
        win(3.55, 1.0, 1.15, 1.35, 'double', { shutters: true, lit: true })
      ],
      back: [win(-2.0, 1.0, 1.2, 1.25, 'double'), win(1.8, 1.0, 1.2, 1.25, 'double')],
      left: [win(0, 1.0, 1.1, 1.22, 'double')],
      right: [win(0, 1.0, 1.1, 1.22, 'double')]
    },
    gableWindow: null,
    porch: { wall: 'front', width: 5.1, depth: 2.9, roof: 'gable', roofRise: 1.35, posts: 4, pedestal: true, railing: false, steps: true, columnStyle: 'round', pediment: true, wideSteps: true },
    chimney: { x: -3.2, z: -1.6, width: 0.82, depth: 0.82 },
    trim: { cornerBoards: true, gutters: true, foundationVents: true, shutters: true, floorBand: false },
    interior: { furniture: true, curtains: true, rug: true },
    backgroundOk: true,
    preferredSlope: 0.4,
    landmarkNotes: 'Anchor the composition. Keep the approach clear and let the doorway face the main sight line.'
  }
};

export const HOUSE_VARIANTS = Object.freeze({
  ...standardHouses,
  ...landmarks
});

export const STANDARD_VARIANT_IDS = Object.freeze(Object.keys(standardHouses));
export const LANDMARK_VARIANT_IDS = Object.freeze(Object.keys(landmarks));
export const ALL_VARIANT_IDS = Object.freeze(Object.keys(HOUSE_VARIANTS));
export const STANDARD_VARIANTS = Object.freeze(Object.values(standardHouses));
export const LANDMARK_VARIANTS = Object.freeze(Object.values(landmarks));

export function getHouseVariant(id) {
  return HOUSE_VARIANTS[id] || HOUSE_VARIANTS.classic_small;
}

export function getLandmarkVariant(id) {
  return HOUSE_VARIANTS[id] && HOUSE_VARIANTS[id].landmark ? HOUSE_VARIANTS[id] : HOUSE_VARIANTS.hilltop_solitary;
}

export function variantMetadata() {
  return Object.values(HOUSE_VARIANTS).map(v => ({
    id: v.id,
    name: v.name,
    category: v.category,
    landmark: !!v.landmark,
    width: v.width,
    depth: v.depth,
    wallHeight: v.wallHeight,
    floors: v.floors,
    roofType: v.roof.type,
    preferredSlope: v.preferredSlope,
    backgroundOk: v.backgroundOk
  }));
}
