/*!
 * Copyright (c) 2026 Vendreith (Original Code & Procedural Implementation).
 * Adapted Backrooms level/entity concepts & lore: licensed under CC BY-SA 3.0.
 * Licensing & attribution: see LICENSE.md, ATTRIBUTION.md, and THIRD_PARTY_NOTICES.md
 */

// ============================================================
// LEVEL 37 V3 EXPANSION: ZONES K THROUGH AN (30 NEW INTERCONNECTED ZONES)
// - 22 Compact Labyrinth Zones (K..AF)
// - 5 Medium Architectural Zones (AG..AK)
// - 3 Enormous Signature Zones (AL: Grand Spiral Slide Cathedral,
//   AM: Aquatic Conduit Nexus, AN: Chromatic Aquatic Cathedral)
// - Colored Indirect Bounce Volumes & Spatial Navigation Loops
// ============================================================

export const POOL_ZONE_DEFS_V3 = [
  // ---- 22 COMPACT LABYRINTH ZONES (K..AF) ----
  {
    id: 'zone_k',
    code: 'K',
    name: 'Khu K — Hành Lang Ngọc Bích (Mint Corridor)',
    desc: 'Hành lang hẹp lát gạch ngọc bích cạn ngập mắt cá, vòm thấp liên hoàn nối từ Khu D.',
    bounds: { x0: 642, z0: 24, x1: 720, z1: 132 },
    center: { x: 681, z: 78 },
    teleX: 662, teleZ: 78, teleY: 0.30, teleYaw: -Math.PI * 0.5,
    mood: 'clinical_mint', musicLayer: 'peaceful_shallow', acousticPreset: 'small_corridor',
    ambientOnly: false, waterTemp: 0.14,
    fogColor: 0xcdf0e6, fogDensity: 0.0020, hemiSky: 0xeefcf8, hemiGround: 0x58dbc4, hemiInt: 0.90,
    ambColor: 0xdff6ef, ambInt: 0.50, exposure: 0.80,
    bounceRgb: [0.80, 1.0, 0.92], bounceStrength: 0.34
  },
  {
    id: 'zone_l',
    code: 'L',
    name: 'Khu L — Lối Đi Gạch Tách Đôi (Split-Tile Passage)',
    desc: 'Lối đi khô hẹp kẹp giữa hai rãnh nước sâu và hàng trụ gốm đối xứng.',
    bounds: { x0: 720, z0: 24, x1: 798, z1: 132 },
    center: { x: 759, z: 78 },
    teleX: 759, teleZ: 78, teleY: 0.30, teleYaw: -Math.PI * 0.5,
    mood: 'bright_liminal', musicLayer: 'peaceful_shallow', acousticPreset: 'small_corridor',
    ambientOnly: true, waterTemp: 0.22,
    fogColor: 0xd8eee8, fogDensity: 0.0019, hemiSky: 0xf7faf4, hemiGround: 0x62d4c8, hemiInt: 0.92,
    ambColor: 0xe6f0ea, ambInt: 0.50, exposure: 0.81
  },
  {
    id: 'zone_m',
    code: 'M',
    name: 'Khu M — Chuỗi Vòm Liên Hoàn (Arch Chain)',
    desc: 'Dãy vòm cong liên tiếp tạo chiều sâu hun hút dẫn qua hành lang nước nông.',
    bounds: { x0: 798, z0: 24, x1: 882, z1: 132 },
    center: { x: 840, z: 78 },
    teleX: 816, teleZ: 78, teleY: 0.30, teleYaw: -Math.PI * 0.5,
    mood: 'warm_nostalgic', musicLayer: 'peaceful_shallow', acousticPreset: 'small_corridor',
    ambientOnly: true, waterTemp: 0.16,
    fogColor: 0xdeeee8, fogDensity: 0.0018, hemiSky: 0xf9f9f0, hemiGround: 0x6fd8ca, hemiInt: 0.93,
    ambColor: 0xedf0e6, ambInt: 0.52, exposure: 0.82
  },
  {
    id: 'zone_n',
    code: 'N',
    name: 'Khu N — Bậc Thang Ngập Nước (Flooded Steps)',
    desc: 'Bậc thềm gạch trắng chìm dần xuống mặt nước rồi nhô lên ở hành lang đối diện.',
    bounds: { x0: 882, z0: 24, x1: 966, z1: 132 },
    center: { x: 924, z: 78 },
    teleX: 902, teleZ: 78, teleY: 0.30, teleYaw: -Math.PI * 0.5,
    mood: 'cool_cathedral', musicLayer: 'dark_submerged', acousticPreset: 'small_corridor',
    ambientOnly: true, waterTemp: 0.42,
    fogColor: 0xc2e2e4, fogDensity: 0.0022, hemiSky: 0xeaf6f8, hemiGround: 0x45b8ba, hemiInt: 0.86,
    ambColor: 0xd0e6ea, ambInt: 0.46, exposure: 0.77
  },
  {
    id: 'zone_o',
    code: 'O',
    name: 'Khu O — Kênh Phản Chiếu Tĩnh (Mirror Channel)',
    desc: 'Mặt nước phẳng như gương phản chiếu trần ô cờ tĩnh lặng giữa dãy tường gốm hẹp.',
    bounds: { x0: 966, z0: 24, x1: 1056, z1: 132 },
    center: { x: 1011, z: 78 },
    teleX: 988, teleZ: 78, teleY: 0.30, teleYaw: -Math.PI * 0.5,
    mood: 'tranquil_dusk', musicLayer: 'peaceful_shallow', acousticPreset: 'large_chamber',
    ambientOnly: true, waterTemp: 0.12,
    fogColor: 0xd2ebec, fogDensity: 0.0017, hemiSky: 0xf4fafc, hemiGround: 0x5cd0d2, hemiInt: 0.90,
    ambColor: 0xdff0f2, ambInt: 0.50, exposure: 0.81
  },
  {
    id: 'zone_p',
    code: 'P',
    name: 'Khu P — Hành Lang Vách Kính (Glass Waterline Corridor)',
    desc: 'Hành lang khô đi dọc vách kính trong suốt ngăn khối nước ngọc lam dâng ngang tầm mắt.',
    bounds: { x0: 1056, z0: 24, x1: 1152, z1: 132 },
    center: { x: 1104, z: 78 },
    teleX: 1094, teleZ: 82, teleY: 0.30, teleYaw: -Math.PI * 0.22,
    mood: 'bright_liminal', musicLayer: 'colored_sanctuary', acousticPreset: 'small_corridor',
    ambientOnly: true, waterTemp: 0.25,
    fogColor: 0xc8eef2, fogDensity: 0.0018, hemiSky: 0xebfcff, hemiGround: 0x4ad5de, hemiInt: 0.92,
    ambColor: 0xd8f4f8, ambInt: 0.50, exposure: 0.81,
    bounceRgb: [0.76, 0.98, 1.0], bounceStrength: 0.32
  },
  {
    id: 'zone_ab',
    code: 'AB',
    name: 'Khu AB — Kênh Nối Hổ Phách (Amber Basin Link)',
    desc: 'Hành lang vòm gốm trắng ngập ánh sáng hổ phách vàng ấm nối sang Phòng Hơi Nước.',
    bounds: { x0: 1152, z0: 24, x1: 1314, z1: 132 },
    center: { x: 1233, z: 78 },
    teleX: 1184, teleZ: 78, teleY: 0.30, teleYaw: -Math.PI * 0.5,
    mood: 'warm_nostalgic', musicLayer: 'colored_sanctuary', acousticPreset: 'large_chamber',
    ambientOnly: true, waterTemp: 0.38,
    fogColor: 0xf0dfbe, fogDensity: 0.0020, hemiSky: 0xfff3d8, hemiGround: 0xdba04c, hemiInt: 0.74,
    ambColor: 0xf4e4c4, ambInt: 0.36, exposure: 0.80,
    bounceRgb: [1.0, 0.72, 0.32], bounceStrength: 0.62
  },
  {
    id: 'zone_q',
    code: 'Q',
    name: 'Khu Q — Máng Nước Uốn Lượn (Serpentine Sluice)',
    desc: 'Hành lang vách cong chữ S ôm lấy rãnh nước dẫn lưu êm dịu.',
    bounds: { x0: 642, z0: 132, x1: 744, z1: 246 },
    center: { x: 693, z: 189 },
    teleX: 668, teleZ: 186, teleY: 0.30, teleYaw: -Math.PI * 0.5,
    mood: 'clinical_mint', musicLayer: 'peaceful_shallow', acousticPreset: 'slide_tube',
    ambientOnly: true, waterTemp: 0.24,
    fogColor: 0xd2ece4, fogDensity: 0.0020, hemiSky: 0xf2faf6, hemiGround: 0x5ccfc2, hemiInt: 0.90,
    ambColor: 0xe0f0ea, ambInt: 0.48, exposure: 0.79
  },
  {
    id: 'zone_r',
    code: 'R',
    name: 'Khu R — Giao Lộ Ống Gốm (Tube Junction)',
    desc: 'Điểm giao cắt của hai đường ống gốm hình trụ dẫn hướng về Trạm Máng Trượt AG.',
    bounds: { x0: 744, z0: 132, x1: 852, z1: 246 },
    center: { x: 798, z: 189 },
    teleX: 766, teleZ: 186, teleY: 0.30, teleYaw: -Math.PI * 0.5,
    mood: 'damp_maintenance', musicLayer: 'industrial_nexus', acousticPreset: 'slide_tube',
    ambientOnly: true, waterTemp: 0.34,
    fogColor: 0xbcd8dc, fogDensity: 0.0022, hemiSky: 0xe4f2f4, hemiGround: 0x4ca6ae, hemiInt: 0.85,
    ambColor: 0xcce4e6, ambInt: 0.45, exposure: 0.76
  },
  {
    id: 'zone_ag',
    code: 'AG',
    name: 'Khu AG — Trạm Giao Máng Trượt (The Slide Exchange)',
    desc: 'Không gian đa tầng trung tâm với 4 cửa trượt gốm, ống trượt trên không và cầu thang hồi.',
    bounds: { x0: 852, z0: 132, x1: 990, z1: 264 },
    center: { x: 921, z: 198 },
    teleX: 874, teleZ: 188, teleY: 0.30, teleYaw: -Math.PI * 0.5,
    mood: 'pastel_waterpark', musicLayer: 'slide_cathedral', acousticPreset: 'large_chamber',
    ambientOnly: false, waterTemp: 0.28,
    fogColor: 0xd6efe8, fogDensity: 0.0018, hemiSky: 0xf7faf2, hemiGround: 0x5cd8cb, hemiInt: 0.93,
    ambColor: 0xe6f2eb, ambInt: 0.50, exposure: 0.82
  },
  {
    id: 'zone_s',
    code: 'S',
    name: 'Khu S — Hành Lang Hai Tầng Lệch (Split-Level Walkway)',
    desc: 'Hai lối đi song song lệch độ cao có lan can thép và bậc thang xuống kênh nước.',
    bounds: { x0: 990, z0: 132, x1: 1086, z1: 246 },
    center: { x: 1038, z: 189 },
    teleX: 1014, teleZ: 186, teleY: 0.30, teleYaw: -Math.PI * 0.5,
    mood: 'bright_liminal', musicLayer: 'peaceful_shallow', acousticPreset: 'large_chamber',
    ambientOnly: true, waterTemp: 0.26,
    fogColor: 0xd4ecea, fogDensity: 0.0019, hemiSky: 0xf2faf8, hemiGround: 0x5accc4, hemiInt: 0.90,
    ambColor: 0xe2f0ee, ambInt: 0.49, exposure: 0.80
  },
  {
    id: 'zone_t',
    code: 'T',
    name: 'Khu T — Khe Sáng Trần Cao (Ceiling Slit Chamber)',
    desc: 'Buồng tối hẹp trần cao bị cắt ngang bởi luồng sáng thẳng đứng rọi xuống hồ sâu.',
    bounds: { x0: 1086, z0: 132, x1: 1182, z1: 246 },
    center: { x: 1134, z: 189 },
    teleX: 1104, teleZ: 186, teleY: 0.30, teleYaw: -Math.PI * 0.46,
    mood: 'deep_abyssal', musicLayer: 'silent_horror', acousticPreset: 'small_corridor',
    ambientOnly: true, waterTemp: 0.72,
    fogColor: 0x769aa2, fogDensity: 0.0031, hemiSky: 0xb2d2dc, hemiGround: 0x1e4c58, hemiInt: 0.62,
    ambColor: 0x7c9ea6, ambInt: 0.32, exposure: 0.62
  },
  {
    id: 'zone_ai',
    code: 'AI',
    name: 'Khu AI — Phòng Hơi Nước Ấm (The Steam Galleries)',
    desc: 'Bể nhiệt ấm với vách kính mờ, ống thông hơi và ánh sáng hổ phách – hồng phấn dịu.',
    bounds: { x0: 1182, z0: 132, x1: 1314, z1: 324 },
    center: { x: 1248, z: 228 },
    teleX: 1216, teleZ: 224, teleY: 0.30, teleYaw: -Math.PI * 0.5,
    mood: 'warm_nostalgic', musicLayer: 'colored_sanctuary', acousticPreset: 'large_chamber',
    ambientOnly: true, waterTemp: 0.95,
    fogColor: 0xebd4dc, fogDensity: 0.0024, hemiSky: 0xffeef2, hemiGround: 0xd48ca4, hemiInt: 0.75,
    ambColor: 0xf2dae2, ambInt: 0.37, exposure: 0.80,
    bounceRgb: [1.0, 0.68, 0.78], bounceStrength: 0.60
  },
  {
    id: 'zone_ah',
    code: 'AH',
    name: 'Khu AH — Vòm Tròn Khảm Gạch (The Mosaic Rotunda)',
    desc: 'Sảnh tròn đồng tâm với hàng cột vòm uốn cong bao quanh đài nước sắc tím lam – ngà.',
    bounds: { x0: 642, z0: 246, x1: 852, z1: 414 },
    center: { x: 747, z: 330 },
    teleX: 706, teleZ: 314, teleY: 0.28, teleYaw: -Math.PI * 0.36,
    mood: 'cool_cathedral', musicLayer: 'colored_sanctuary', acousticPreset: 'vaulted_cathedral',
    ambientOnly: true, waterTemp: 0.40,
    fogColor: 0xcad6f0, fogDensity: 0.0018, hemiSky: 0xf2f0ff, hemiGround: 0x6f7cd8, hemiInt: 0.76,
    ambColor: 0xdcdcf4, ambInt: 0.38, exposure: 0.79,
    bounceRgb: [1.0, 0.78, 0.42], bounceStrength: 0.58
  },
  {
    id: 'zone_aa',
    code: 'AA',
    name: 'Khu AA — Hành Lang Ánh Hồng Phấn (Rose-Lit Corridor)',
    desc: 'Gạch trắng phản xạ ánh sáng hồng phấn dịu ấm lan tỏa xuống mặt hồ nông.',
    bounds: { x0: 852, z0: 264, x1: 990, z1: 354 },
    center: { x: 921, z: 309 },
    teleX: 874, teleZ: 306, teleY: 0.30, teleYaw: -Math.PI * 0.48,
    mood: 'pastel_waterpark', musicLayer: 'colored_sanctuary', acousticPreset: 'small_corridor',
    ambientOnly: true, waterTemp: 0.28,
    fogColor: 0xf0d2e2, fogDensity: 0.0019, hemiSky: 0xffecf4, hemiGround: 0xdf76a8, hemiInt: 0.72,
    ambColor: 0xf4dce8, ambInt: 0.35, exposure: 0.80,
    bounceRgb: [1.0, 0.56, 0.78], bounceStrength: 0.66
  },
  {
    id: 'zone_ad',
    code: 'AD',
    name: 'Khu AD — Hốc Tường Phát Sáng (Luminous Niche)',
    desc: 'Những hốc tường âm phát sáng bạc hà – tím nhạt hòa quyện trên vách gốm trắng.',
    bounds: { x0: 990, z0: 246, x1: 1182, z1: 354 },
    center: { x: 1086, z: 300 },
    teleX: 1042, teleZ: 306, teleY: 0.30, teleYaw: -Math.PI * 0.5,
    mood: 'tranquil_dusk', musicLayer: 'colored_sanctuary', acousticPreset: 'small_corridor',
    ambientOnly: true, waterTemp: 0.24,
    fogColor: 0xd8e8f4, fogDensity: 0.0019, hemiSky: 0xf2f8ff, hemiGround: 0x7ac8dc, hemiInt: 0.90,
    ambColor: 0xe2eef6, ambInt: 0.50, exposure: 0.80,
    bounceRgb: [0.80, 0.94, 0.98], bounceStrength: 0.38
  },
  {
    id: 'zone_y',
    code: 'Y',
    name: 'Khu Y — Ngõ Cụt Đánh Lừa (False End)',
    desc: 'Trông như hành lang cụt tĩnh lặng với hàng ghế đơn, nhưng ẩn lối vòng sau trụ gốm.',
    bounds: { x0: 852, z0: 354, x1: 948, z1: 444 },
    center: { x: 900, z: 399 },
    teleX: 882, teleZ: 396, teleY: 0.30, teleYaw: -Math.PI * 0.5,
    mood: 'damp_maintenance', musicLayer: 'silent_horror', acousticPreset: 'small_corridor',
    ambientOnly: true, waterTemp: 0.20,
    fogColor: 0x8eaeb4, fogDensity: 0.0028, hemiSky: 0xc2d8de, hemiGround: 0x38666e, hemiInt: 0.68,
    ambColor: 0x98b4bc, ambInt: 0.38, exposure: 0.68
  },
  {
    id: 'zone_z',
    code: 'Z',
    name: 'Khu Z — Buồng Trụ Xoắn Ốc (Spiral Column Room)',
    desc: 'Trụ gốm lớn giữa phòng với bậc thềm xoay quanh dẫn về Thánh Đường Máng Trượt AL.',
    bounds: { x0: 948, z0: 354, x1: 1056, z1: 444 },
    center: { x: 1002, z: 399 },
    teleX: 976, teleZ: 396, teleY: 0.30, teleYaw: -Math.PI * 0.5,
    mood: 'surreal_gallery', musicLayer: 'colored_sanctuary', acousticPreset: 'slide_tube',
    ambientOnly: true, waterTemp: 0.30,
    fogColor: 0xd4ecf0, fogDensity: 0.0019, hemiSky: 0xf4fafc, hemiGround: 0x5cccd4, hemiInt: 0.90,
    ambColor: 0xe2f2f4, ambInt: 0.50, exposure: 0.80
  },
  {
    id: 'zone_aj',
    code: 'AJ',
    name: 'Khu AJ — Vườn Thủy Sinh Gốm Trắng (The Aquatic Garden)',
    desc: 'Những đảo gốm uốn cong nâng khóm cây xanh thủy sinh giữa hồ cạn tràn ngập nắng nhẹ.',
    bounds: { x0: 1056, z0: 324, x1: 1314, z1: 498 },
    center: { x: 1185, z: 411 },
    teleX: 1114, teleZ: 396, teleY: 0.30, teleYaw: -Math.PI * 0.45,
    mood: 'bright_liminal', musicLayer: 'colored_sanctuary', acousticPreset: 'large_chamber',
    ambientOnly: true, waterTemp: 0.18,
    fogColor: 0xdaf4ec, fogDensity: 0.0016, hemiSky: 0xf9fff8, hemiGround: 0x62dfc2, hemiInt: 0.94,
    ambColor: 0xeaf6ef, ambInt: 0.53, exposure: 0.83,
    bounceRgb: [0.86, 1.0, 0.92], bounceStrength: 0.34
  },
  {
    id: 'zone_u',
    code: 'U',
    name: 'Khu U — Hành Lang Vọng Âm Ngược (Reverse Echo Gallery)',
    desc: 'Hành lang trần cao rỗng vang tiếng bước chân giả vọng ngược từ hốc tường trống.',
    bounds: { x0: 642, z0: 414, x1: 738, z1: 528 },
    center: { x: 690, z: 471 },
    teleX: 670, teleZ: 470, teleY: 0.28, teleYaw: -Math.PI * 0.5,
    mood: 'tranquil_dusk', musicLayer: 'silent_horror', acousticPreset: 'vaulted_cathedral',
    ambientOnly: true, waterTemp: 0.30,
    fogColor: 0x98bcc4, fogDensity: 0.0026, hemiSky: 0xcce0e8, hemiGround: 0x3b6e7a, hemiInt: 0.72,
    ambColor: 0xa2c0c8, ambInt: 0.39, exposure: 0.70
  },
  {
    id: 'zone_v',
    code: 'V',
    name: 'Khu V — Lối Đi Ẩn Sau Tường (Hidden Wall Walk)',
    desc: 'Hành lang kỹ thuật hẹp giấu sau hàng vòm nhìn trộm ra các buồng hồ kế bên.',
    bounds: { x0: 738, z0: 414, x1: 852, z1: 528 },
    center: { x: 795, z: 471 },
    teleX: 766, teleZ: 470, teleY: 0.28, teleYaw: -Math.PI * 0.5,
    mood: 'damp_maintenance', musicLayer: 'silent_horror', acousticPreset: 'small_corridor',
    ambientOnly: true, waterTemp: 0.15,
    fogColor: 0x8eaab2, fogDensity: 0.0028, hemiSky: 0xc4d6dc, hemiGround: 0x365c66, hemiInt: 0.68,
    ambColor: 0x96b0b6, ambInt: 0.36, exposure: 0.67
  },
  {
    id: 'zone_w',
    code: 'W',
    name: 'Khu W — Buồng Nước Nhỏ Giọt (Dripping Chamber)',
    desc: 'Buồng đá-gốm ẩm thấp đầy vệt khoáng trắng với giọt nước rơi tạo gợn sóng đồng tâm.',
    bounds: { x0: 642, z0: 528, x1: 768, z1: 642 },
    center: { x: 705, z: 585 },
    teleX: 672, teleZ: 574, teleY: 0.28, teleYaw: -Math.PI * 0.5,
    mood: 'deep_abyssal', musicLayer: 'dark_submerged', acousticPreset: 'underwater_passage',
    ambientOnly: true, waterTemp: 0.56,
    fogColor: 0x98c2c8, fogDensity: 0.0027, hemiSky: 0xd0e8ec, hemiGround: 0x2c6e78, hemiInt: 0.76,
    ambColor: 0xa2c8ce, ambInt: 0.42, exposure: 0.73
  },
  {
    id: 'zone_ae',
    code: 'AE',
    name: 'Khu AE — Đập Cửa Phai Ngang (Floodgate Crossing)',
    desc: 'Cầu sắt – gốm bắc ngang kênh cửa phai với bánh van điều lưu và biển cảnh báo ướt.',
    bounds: { x0: 768, z0: 528, x1: 888, z1: 660 },
    center: { x: 828, z: 594 },
    teleX: 796, teleZ: 582, teleY: 0.30, teleYaw: -Math.PI * 0.5,
    mood: 'damp_maintenance', musicLayer: 'industrial_nexus', acousticPreset: 'maintenance_room',
    ambientOnly: true, waterTemp: 0.50,
    fogColor: 0xa8c8cc, fogDensity: 0.0024, hemiSky: 0xdceced, hemiGround: 0x3e7e86, hemiInt: 0.80,
    ambColor: 0xb2ced2, ambInt: 0.44, exposure: 0.75
  },
  {
    id: 'zone_ac',
    code: 'AC',
    name: 'Khu AC — Hành Lang Xanh Lam Thẳm (Ultramarine Passage)',
    desc: 'Hành lang cột đôi chìm trong sắc lam thẳm chuyển tiếp giữa Thánh Đường AL và AN.',
    bounds: { x0: 1122, z0: 498, x1: 1314, z1: 660 },
    center: { x: 1218, z: 579 },
    teleX: 1160, teleZ: 566, teleY: 0.30, teleYaw: -Math.PI * 0.5,
    mood: 'deep_abyssal', musicLayer: 'colored_sanctuary', acousticPreset: 'small_corridor',
    ambientOnly: true, waterTemp: 0.68,
    fogColor: 0x8eaee8, fogDensity: 0.0022, hemiSky: 0xcce0ff, hemiGround: 0x2c56b8, hemiInt: 0.70,
    ambColor: 0x9cb8ec, ambInt: 0.34, exposure: 0.74,
    bounceRgb: [0.36, 0.58, 1.0], bounceStrength: 0.68
  },
  {
    id: 'zone_x',
    code: 'X',
    name: 'Khu X — Đường Hầm Dưới Cầu (Underbridge Tunnel)',
    desc: 'Đường hầm trần thấp vắt dưới cầu dẫn nước với ánh đèn bể bơi xanh ngọc hắt ngược.',
    bounds: { x0: 24, z0: 642, x1: 216, z1: 804 },
    center: { x: 120, z: 723 },
    teleX: 64, teleZ: 720, teleY: 0.32, teleYaw: -Math.PI * 0.5,
    mood: 'deep_abyssal', musicLayer: 'dark_submerged', acousticPreset: 'underwater_passage',
    ambientOnly: true, waterTemp: 0.64,
    fogColor: 0x84b6c2, fogDensity: 0.0027, hemiSky: 0xbce2ec, hemiGround: 0x246a7a, hemiInt: 0.74,
    ambColor: 0x92c0ca, ambInt: 0.40, exposure: 0.71,
    bounceRgb: [0.55, 0.90, 0.94], bounceStrength: 0.36
  },
  {
    id: 'zone_af',
    code: 'AF',
    name: 'Khu AF — Hành Lang Bóng Tối Vòm Cung (Shadow Arcade)',
    desc: 'Hàng cột vòm đổ bóng sọc dài cắt ngang hành lang yên tĩnh trước các đại sảnh lớn.',
    bounds: { x0: 216, z0: 642, x1: 564, z1: 804 },
    center: { x: 390, z: 723 },
    teleX: 266, teleZ: 720, teleY: 0.32, teleYaw: -Math.PI * 0.5,
    mood: 'tranquil_dusk', musicLayer: 'silent_horror', acousticPreset: 'small_corridor',
    ambientOnly: true, waterTemp: 0.35,
    fogColor: 0x7692a2, fogDensity: 0.0029, hemiSky: 0xacc4d2, hemiGround: 0x244656, hemiInt: 0.60,
    ambColor: 0x7e9aa8, ambInt: 0.31, exposure: 0.62
  },

  // ---- REMAINING MEDIUM ZONE (AK) & 3 ENORMOUS SIGNATURE ZONES (AL, AM, AN) ----
  {
    id: 'zone_al',
    code: 'AL',
    name: 'Khu AL — Đại Thánh Đường Máng Trượt Xoắn Ốc (Grand Spiral Slide Cathedral)',
    desc: 'Đại sảnh khổng lồ với cột tròn đồ sộ, ban công 2 tầng và cặp máng trượt xoắn ốc khổng lồ.',
    bounds: { x0: 888, z0: 444, x1: 1122, z1: 660 },
    center: { x: 1005, z: 552 },
    teleX: 1005, teleZ: 620, teleY: 0.32, teleYaw: 0,
    mood: 'pastel_waterpark', musicLayer: 'slide_cathedral', acousticPreset: 'vaulted_cathedral',
    ambientOnly: true, waterTemp: 0.34,
    fogColor: 0xd8f0ec, fogDensity: 0.0014, hemiSky: 0xfff8e4, hemiGround: 0x48d8d0, hemiInt: 0.80,
    ambColor: 0xebf4ec, ambInt: 0.40, exposure: 0.82,
    bounceRgb: [1.0, 0.90, 0.68], bounceStrength: 0.54
  },
  {
    id: 'zone_am',
    code: 'AM',
    name: 'Khu AM — Giao Điểm Ống Dẫn Khổng Lồ (Aquatic Conduit Nexus)',
    desc: 'Nhà máy thủy cung siêu thực nơi 6 đường ống gốm khổng lồ giao cắt qua các tầng bể sâu.',
    bounds: { x0: 24, z0: 804, x1: 564, z1: 1314 },
    center: { x: 294, z: 1059 },
    teleX: 248, teleZ: 1032, teleY: 0.32, teleYaw: -Math.PI * 0.68,
    mood: 'deep_abyssal', musicLayer: 'industrial_nexus', acousticPreset: 'vaulted_cathedral',
    ambientOnly: true, waterTemp: 0.78,
    fogColor: 0x8cb8d8, fogDensity: 0.0011, hemiSky: 0xcce8ff, hemiGround: 0x1e5c8e, hemiInt: 0.72,
    ambColor: 0x9ac4e2, ambInt: 0.36, exposure: 0.76,
    bounceRgb: [0.46, 0.78, 1.0], bounceStrength: 0.58
  },
  {
    id: 'zone_ak',
    code: 'AK',
    name: 'Khu AK — Đài Quan Sát Phản Chiếu (Reflection Observatory)',
    desc: 'Hồ gương hai cao độ, hành lang vách kính ngắm cảnh và cầu treo ánh xanh lam – vàng.',
    bounds: { x0: 564, z0: 642, x1: 864, z1: 1314 },
    center: { x: 714, z: 860 },
    teleX: 704, teleZ: 874, teleY: 2.20, teleYaw: Math.PI,
    mood: 'cool_cathedral', musicLayer: 'colored_sanctuary', acousticPreset: 'large_chamber',
    ambientOnly: true, waterTemp: 0.42,
    fogColor: 0xc2e6f2, fogDensity: 0.0017, hemiSky: 0xebfcff, hemiGround: 0x3ec2da, hemiInt: 0.78,
    ambColor: 0xd4eef6, ambInt: 0.40, exposure: 0.80,
    bounceRgb: [0.62, 0.92, 1.0], bounceStrength: 0.56
  },
  {
    id: 'zone_an',
    code: 'AN',
    name: 'Khu AN — Đại Thánh Đường Sắc Quang (Chromatic Aquatic Cathedral)',
    desc: 'Thánh đường gạch trắng khổng lồ biến hóa kỳ ảo dưới 6 hốc sáng hồng, ngọc, vàng, tím, bạc hà, lam.',
    bounds: { x0: 864, z0: 660, x1: 1314, z1: 1314 },
    center: { x: 1089, z: 987 },
    teleX: 1004, teleZ: 987, teleY: 0.34, teleYaw: -Math.PI * 0.5,
    mood: 'surreal_gallery', musicLayer: 'colored_sanctuary', acousticPreset: 'vaulted_cathedral',
    ambientOnly: true, waterTemp: 0.36,
    fogColor: 0xdce6f4, fogDensity: 0.0009, hemiSky: 0xfff8fc, hemiGround: 0x62d6d8, hemiInt: 0.78,
    ambColor: 0xecf0fa, ambInt: 0.38, exposure: 0.82
  }
];

/**
 * Stamps all 30 new V3 zones (K..AN), perimeter connecting archways from A..J,
 * colored indirect light volumes, spiral slides, giant ceramic conduits, glass walls,
 * and looping corridors across the 1344m world.
 */
export function buildPoolroomsV3Expansion({
  wallH,
  WATER_RECTS,
  addWallBox,
  addWallWithOpenings,
  addPlat,
  addRamp,
  addSlide,
  addWater,
  addArch,
  addArcade,
  addRoundCol,
  addCeilVault,
  addCurvedWall,
  addLight,
  addProp,
  addAnim,
  POOL_ARCH,
  LIGHT_VOLUMES,
  SPIRAL_SLIDES,
  RECTS
}) {
  const addLightVol = (x, y, z, r, hex, strength = 0.58) => {
    const cr = ((hex >> 16) & 255) / 255;
    const cg = ((hex >> 8) & 255) / 255;
    const cb = (hex & 255) / 255;
    LIGHT_VOLUMES.push({ x, y, z, r, rgb: [cr, cg, cb], strength });
  };

  const addGlassWall = (x0, z0, x1, z1, y0 = 0, y1 = 3.8, collideWall = true) => {
    POOL_ARCH.push({ kind: 'glass_wall', x0, z0, x1, z1, y0, y1 });
    if (collideWall && y0 < 1.9) {
      RECTS.push({
        x0: Math.min(x0, x1) - 0.15,
        z0: Math.min(z0, z1) - 0.15,
        x1: Math.max(x0, x1) + 0.15,
        z1: Math.max(z0, z1) + 0.15,
        crawl: false
      });
    }
  };

  const addCeramicTube = (x, z, y, len, r = 2.3, opts = {}) => {
    POOL_ARCH.push({ kind: 'ceramic_tube', x, z, y, len, r, ...opts });
  };

  const addSpiralSlide = (cx, cz, radius, yTop, yBot, turns = 1.25, width = 2.8, ccw = false, angStart = 0, colorHex = 0x72eee0) => {
    POOL_ARCH.push({ kind: 'spiral_slide', cx, cz, radius, yTop, yBot, turns, width, ccw, angStart, colorHex });
    SPIRAL_SLIDES.push({ cx, cz, radius, yTop, yBot, turns, width, ccw, angStart, speed: 10.6 });
  };

  const addLightShaft = (x, y, z, w = 3.2, h = 7.4, hex = 0xdff8ff, rotX = 0.10, rotZ = 0.08) => {
    const rgb = [((hex >> 16) & 255) / 255, ((hex >> 8) & 255) / 255, (hex & 255) / 255];
    POOL_ARCH.push({ kind: 'light_shaft', x, y, z, w, h, rgb, rotX, rotZ });
  };

  // Guarantee every V3 zone teleport pad rests firmly on dry walkable tiles above any basin
  for (const z of POOL_ZONE_DEFS_V3) {
    addPlat(z.teleX - 5, z.teleZ - 5, z.teleX + 5, z.teleZ + 5, z.teleY, -2.5);
  }

  // ---- 1. SEAM BRIDGES FROM ORIGINAL ZONES (A..J) AT x=642 & z=642 ----
  // East seam x = 642 (D -> K, D -> Q, F -> AH, I -> U, I -> W)
  addWallWithOpenings(false, 642, 24, 642, 2.4, [
    [66, 90, 4.2],   // D <-> K
    [174, 198, 4.2], // D <-> Q
    [290, 316, 4.6], // F <-> AH
    [458, 482, 4.0], // I <-> U
    [562, 586, 4.0]  // I <-> W
  ], wallH);
  addPlat(632, 64, 666, 92, 0.30, -2.5);
  addPlat(632, 172, 668, 200, 0.30, -2.5);
  addPlat(632, 288, 678, 318, 0.28, -2.5);
  addPlat(632, 456, 672, 484, 0.28, -2.5);
  addPlat(632, 560, 674, 588, 0.28, -2.5);
  addArch(642, 78, 4.8, 4.0, 1.0, 2.5, Math.PI * 0.5, 0.30, { mint: true, noCollide: true });
  addArch(642, 186, 4.8, 4.0, 1.0, 2.5, Math.PI * 0.5, 0.30, { mint: true, noCollide: true });
  addArch(642, 303, 5.2, 4.4, 1.0, 2.5, Math.PI * 0.5, 0.28, { mint: true, noCollide: true });

  // South seam z = 642 (H -> X, G -> AF, J -> AF, I -> AK)
  addWallWithOpenings(true, 642, 24, 642, 2.4, [
    [54, 78, 4.0],   // H <-> X
    [254, 278, 4.2], // G <-> AF
    [376, 398, 4.2], // J <-> AF
    [604, 628, 4.4]  // I <-> AK
  ], wallH);
  addPlat(52, 632, 78, 725, 0.32, -2.5);
  addPlat(252, 632, 280, 726, 0.32, -2.5);
  addPlat(374, 632, 400, 680, 0.32, -2.5);
  addPlat(602, 632, 630, 725, 0.32, -2.5);
  addArch(66, 642, 4.6, 3.8, 1.0, 2.5, 0, 0.32, { mint: true, noCollide: true });
  addArch(266, 642, 4.8, 4.0, 1.0, 2.5, 0, 0.32, { mint: true, noCollide: true });
  addArch(616, 642, 5.0, 4.2, 1.0, 2.5, 0, 0.32, { mint: true, noCollide: true });

  // ---- 2. ROW 1 COMPACT LABYRINTH CHAIN (K -> L -> M -> N -> O -> P -> AB) ----
  const row1Zones = [
    { x0: 642, x1: 720, code: 'K', waterY: -0.08, bedY: -0.34, temp: 0.14, hex: 0x8ff5d4, rgbHex: 0x70f2c4 },
    { x0: 720, x1: 798, code: 'L', waterY: -0.18, bedY: -0.72, temp: 0.20, hex: 0xf4faf4, rgbHex: 0x90e8df },
    { x0: 798, x1: 882, code: 'M', waterY: -0.14, bedY: -0.45, temp: 0.16, hex: 0xfaf6e4, rgbHex: 0xdcf4ea },
    { x0: 882, x1: 966, code: 'N', waterY: -0.16, bedY: -0.68, temp: 0.42, hex: 0xb6eff4, rgbHex: 0x62d6e4 },
    { x0: 966, x1: 1056, code: 'O', waterY: -0.18, bedY: -0.58, temp: 0.10, hex: 0xe6fafc, rgbHex: 0x90eaf0 },
    { x0: 1056, x1: 1152, code: 'P', waterY: -0.16, bedY: -0.92, temp: 0.25, hex: 0x80ecff, rgbHex: 0x52e0ff },
    { x0: 1152, x1: 1314, code: 'AB', waterY: -0.18, bedY: -0.78, temp: 0.38, hex: 0xffb852, rgbHex: 0xffaa38 }
  ];
  for (let i = 0; i < row1Zones.length; i++) {
    const rz = row1Zones[i];
    const cx = (rz.x0 + rz.x1) * 0.5;
    // Southern divider along z = 132 with arched portal down into Row 2 (Q, R, AG, S, T, AI)
    const southDoorX = Math.round(cx);
    addWallWithOpenings(true, 132, rz.x0, rz.x1, 2.0, [[southDoorX - 10, southDoorX + 10, 3.8]], 6.4);
    addPlat(southDoorX - 10, 120, southDoorX + 10, 148, 0.30, -2.5);
    addArch(southDoorX, 132, 4.4, 3.8, 0.8, 2.1, 0, 0.30, { mint: true, noCollide: true });

    // Vertical divider on East boundary of each chamber (except AB which ends at perimeter)
    if (i < row1Zones.length - 1) {
      addWallWithOpenings(false, rz.x1, 24, 132, 2.0, [[68, 88, 3.8]], 6.4);
      addPlat(rz.x1 - 16, 68, rz.x1 + 16, 88, 0.30, -2.5);
      addArch(rz.x1, 78, 4.4, 3.8, 0.8, 2.1, Math.PI * 0.5, 0.30, { mint: true, noCollide: true });
    }

    // Dry main spine walkway z = 68..88 + side basin flanking it
    addPlat(rz.x0 + 4, 68, rz.x1 - 4, 88, 0.30, -2.5);
    addWater(rz.x0 + 8, 30, rz.x1 - 8, 66, rz.waterY, rz.bedY, rz.temp);
    addWater(rz.x0 + 8, 90, rz.x1 - 8, 126, rz.waterY, rz.bedY, rz.temp);
    addCeilVault(rz.x0 + 4, 28, rz.x1 - 4, 128, 4.6, true, 3);
    addLight(cx, 4.2, 78, rz.hex, 2.8, 48);
    addLightVol(cx, 2.0, 78, 42, rz.rgbHex, i === 6 ? 0.62 : 0.44);

    // Distinct micro-architecture per zone:
    if (rz.code === 'K' || rz.code === 'M') {
      // Rhythmic arch chain framing corridor depth
      addArcade(rz.x0 + 14, 78, rz.x1 - 14, 78, rz.code === 'M' ? 6 : 4, 3.6, 3.2, 0.65, 1.0, 0.30, { straddle: true, mint: true, noCollide: true });
      addProp('handrail_pair', cx - 10, 68, 0.30, 0, 1.0);
      addProp('depth_marker', rz.x0 + 18, 66, 0.32, 0, 1.0);
      addProp('abandoned_sandals', rz.x0 + 26, 86, 0.31, 0.4, 1.0);
    } else if (rz.code === 'L' || rz.code === 'N') {
      addRamp(cx - 12, 54, cx - 2, 66, -0.55, 0.30, 's');
      addRamp(cx + 2, 90, cx + 12, 102, 0.30, -0.55, 's');
      for (const px of [cx - 16, cx, cx + 16]) {
        addRoundCol(px, 65, 0.48, 5.4, -0.8);
        addRoundCol(px, 91, 0.48, 5.4, -0.8);
      }
      addProp('pool_ladder', cx + 4, 66, 0.1, Math.PI, 1.0);
      addProp('pool_skimmer', cx - 6, 30, 0.1, 0, 1.0);
    } else if (rz.code === 'O') {
      addProp('lane_divider', cx, 48, -0.16, 0, 1.0);
      addProp('lifebuoy_rack', cx - 8, 29, 0.6, 0, 1.0);
      addLightShaft(cx, 4.0, 78, 3.0, 4.4, 0xdcf8ff);
    } else if (rz.code === 'P') {
      // Translucent Glass Observation Partition holding raised water column on north side!
      addGlassWall(rz.x0 + 12, 66, rz.x1 - 12, 66.3, 0.30, 3.9, true);
      addProp('underwater_lamp', cx - 12, 62, -0.4, 0, 1.0);
      addProp('underwater_lamp', cx + 12, 62, -0.4, 0, 1.0);
      addLight(cx, 2.4, 58, 0x3ef2e8, 3.0, 44);
      addLightVol(cx, 1.5, 62, 36, 0x3ef2e8, 0.58);
    } else if (rz.code === 'AB') {
      addArcade(rz.x0 + 16, 78, rz.x1 - 24, 78, 5, 4.2, 4.2, 0.72, 1.1, 0.30, { straddle: true, mint: true, recessGlow: true, glowRgb: [1.0, 0.78, 0.42], noCollide: true });
      addLight(cx + 28, 4.3, 78, 0xffaa44, 3.2, 54);
      addProp('warning_sign_cone', cx - 16, 72, 0.31, 0.4, 1.0);
      addProp('rescue_pole', cx + 12, 69, 0.32, 0.1, 1.0);
    }
  }

  // ---- 3. ROW 2 COMPACT + MEDIUM SLIDE EXCHANGE + STEAM GALLERIES ----
  // Vertical dividers at z = 132..246 (z=264 for AG)
  addWallWithOpenings(false, 744, 132, 246, 2.0, [[176, 198, 3.8]], 6.4); // Q|R
  addPlat(726, 174, 764, 200, 0.30, -2.5);
  addArch(744, 187, 4.4, 3.8, 0.8, 2.1, Math.PI * 0.5, 0.30, { mint: true, noCollide: true });

  addWallWithOpenings(false, 852, 132, 246, 2.0, [[176, 204, 4.2]], 7.4); // R|AG
  addPlat(836, 174, 874, 206, 0.30, -2.5);
  addArch(852, 190, 5.0, 4.2, 0.9, 2.2, Math.PI * 0.5, 0.30, { mint: true, noCollide: true });

  addWallWithOpenings(false, 990, 132, 246, 2.0, [[176, 198, 4.0]], 7.0); // AG|S
  addPlat(976, 174, 1012, 200, 0.30, -2.5);
  addArch(990, 187, 4.6, 4.0, 0.9, 2.1, Math.PI * 0.5, 0.30, { mint: true, noCollide: true });

  addWallWithOpenings(false, 1086, 132, 246, 2.0, [[176, 198, 3.8]], 6.4); // S|T
  addPlat(1070, 174, 1106, 200, 0.30, -2.5);

  addWallWithOpenings(false, 1182, 132, 246, 2.0, [[176, 202, 4.2]], 7.0); // T|AI
  addPlat(1166, 174, 1206, 204, 0.30, -2.5);
  addArch(1182, 189, 4.8, 4.2, 0.9, 2.1, Math.PI * 0.5, 0.30, { mint: true, noCollide: true });

  // Horizontal divider z = 246 (Q/R->AH, S/T->AD) and z = 264 (AG->AA)
  addWallWithOpenings(true, 246, 642, 852, 2.0, [[684, 706, 3.8], [786, 808, 3.8]], 6.8);
  addPlat(682, 232, 708, 266, 0.28, -2.5);
  addPlat(784, 232, 810, 266, 0.28, -2.5);

  addWallWithOpenings(true, 264, 852, 990, 2.0, [[910, 932, 4.0]], 7.2); // AG|AA
  addPlat(908, 250, 934, 280, 0.30, -2.5);

  addWallWithOpenings(true, 246, 990, 1182, 2.0, [[1030, 1052, 3.8], [1122, 1144, 3.8]], 6.8); // S/T|AD
  addPlat(1028, 232, 1054, 264, 0.30, -2.5);
  addPlat(1120, 232, 1146, 264, 0.30, -2.5);

  // Q (Serpentine Sluice) & R (Tube Junction)
  addPlat(650, 174, 742, 200, 0.30, -2.5);
  addWater(652, 140, 738, 172, -0.18, -0.70, 0.24);
  addWater(652, 202, 738, 238, -0.18, -0.70, 0.24);
  addCurvedWall(693, 189, 18.0, 0.25, Math.PI * 0.82, 4.4, -0.4, 0.65, 6);
  addCurvedWall(693, 189, 18.0, Math.PI + 0.25, Math.PI * 1.82, 4.4, -0.4, 0.65, 6);
  addCeilVault(648, 138, 738, 240, 4.8, true, 3);
  addLight(693, 4.3, 189, 0xd8faf4, 2.8, 48);

  addPlat(748, 174, 848, 202, 0.30, -2.5);
  addWater(752, 140, 844, 172, -0.18, -0.78, 0.34);
  addWater(752, 204, 844, 238, -0.18, -0.78, 0.34);
  addCeramicTube(798, 189, 2.1, 76, 2.4, { axis: 'x', flatWalkFloor: true, mintTrim: true, glowRgb: [0.58, 0.94, 0.98] });
  addCeramicTube(798, 189, 2.2, 68, 2.1, { axis: 'z', openTop: false, mintTrim: true });
  addCeilVault(748, 138, 846, 240, 5.4, true, 3);
  addLight(798, 4.6, 189, 0xb8eeff, 2.8, 48);

  // MEDIUM ZONE AG: The Slide Exchange (852..990, 132..264) — 4+ slide mouths, spiral + straight + overhead tube
  addWater(878, 148, 968, 250, -0.20, -0.92, 0.28);
  addPlat(856, 140, 878, 256, 0.30, -2.5);
  addPlat(968, 140, 986, 256, 0.30, -2.5);
  addPlat(896, 148, 948, 174, 3.20, -1.6); // High slide boarding mezzanine
  addRamp(878, 150, 896, 172, 0.30, 3.20, 'e');
  addRamp(948, 150, 968, 172, 3.20, 0.30, 'e');
  addSlide(902, 174, 914, 236, 3.20, -0.22, 's');
  addSlide(930, 174, 942, 236, 3.20, -0.22, 's');
  addSpiralSlide(921, 212, 9.0, 3.4, -0.18, 1.15, 2.9, false, Math.PI * 0.5);
  addCeramicTube(921, 198, 5.2, 90, 2.0, { axis: 'x', mintTrim: true, waterTube: true });
  addCeilVault(860, 140, 982, 256, 7.2, true, 4);
  for (const [rx, rz] of [[886, 198], [956, 198], [886, 240], [956, 240]]) addRoundCol(rx, rz, 0.68, 8.2, -1.2);
  addProp('pool_ladder', 879, 216, -0.15, Math.PI * 0.5, 1.0);
  addProp('pool_ring', 908, 244, -0.18, 0.2, 1.1, { pink: true });
  addLight(921, 6.4, 198, 0xe8fbf4, 3.4, 62);
  addLightShaft(921, 3.4, 212, 4.2, 7.0, 0xe8fffb);

  // S (Split-Level Walkway) & T (Ceiling Slit Dim Chamber)
  addPlat(994, 174, 1082, 200, 0.30, -2.5);
  addPlat(998, 142, 1078, 166, 1.85, -1.2);
  addRamp(1026, 166, 1052, 174, 0.30, 1.85, 'n');
  addWater(998, 202, 1078, 238, -0.18, -0.78, 0.26);
  addProp('handrail_pair', 1038, 166, 1.85, 0, 1.0);
  addCeilVault(994, 138, 1082, 240, 5.2, true, 3);
  addLight(1038, 4.6, 189, 0xebf8f8, 2.8, 48);

  addPlat(1090, 174, 1178, 200, 0.30, -2.5);
  addWater(1094, 140, 1174, 172, -0.22, -1.15, 0.72);
  addWater(1094, 202, 1174, 238, -0.22, -1.15, 0.72);
  addArcade(1100, 187, 1168, 187, 4, 4.6, 3.6, 0.72, 1.0, 0.30, { straddle: true, mint: true, noCollide: true });
  addCeilVault(1090, 138, 1178, 240, 6.8, false, 4);
  addLightShaft(1134, 3.4, 189, 2.8, 6.8, 0xcceeff, 0.04, 0.04);
  addLight(1134, 6.0, 189, 0x9ed8ee, 1.9, 38);

  // MEDIUM ZONE AI: The Steam Galleries (1182..1314, 132..324) — Thermal pools, frosted glass, amber/rose bounce
  addWater(1204, 152, 1296, 306, -0.18, -0.88, 0.96);
  addPlat(1188, 144, 1222, 314, 0.30, -2.5);
  addPlat(1284, 144, 1308, 314, 0.30, -2.5);
  addPlat(1222, 218, 1284, 236, 0.30, -2.5); // Cross bridge
  addGlassWall(1224, 156, 1224.3, 214, 0.30, 3.8, false);
  addGlassWall(1282, 240, 1282.3, 302, 0.30, 3.8, false);
  addArcade(1250, 154, 1250, 304, 5, 4.4, 4.4, 0.72, 1.0, -0.4, { mint: true, recessGlow: true, glowRgb: [1.0, 0.70, 0.80] });
  addCeilVault(1188, 140, 1308, 316, 6.0, true, 5);
  addProp('lounge_chair', 1204, 186, 0.31, Math.PI * 0.5, 1.0);
  addProp('towel_stack', 1204, 190, 0.31, 0.2, 1.0);
  addLight(1250, 5.2, 186, 0xffad66, 3.2, 56);
  addLight(1250, 5.2, 272, 0xff82ae, 3.2, 56);
  addLightVol(1248, 2.2, 186, 56, 0xffa858, 0.60);
  addLightVol(1248, 2.2, 272, 56, 0xff7ca8, 0.60);

  // ---- 4. ROW 3: MOSAIC ROTUNDA (AH), ROSE (AA), LUMINOUS NICHE (AD), FALSE END (Y), SPIRAL COL (Z), AQUATIC GARDEN (AJ) ----
  // Seam walls at z = 324 (AI|AJ), x = 852 (AH|AA/Y), x = 990 (AA/Y|AD/Z), x = 1182 (AD|AI/AJ)
  addWallWithOpenings(true, 324, 1182, 1314, 2.0, [[1236, 1260, 4.2]], 7.0); // AI|AJ
  addPlat(1234, 308, 1262, 342, 0.30, -2.5);

  addWallWithOpenings(false, 852, 264, 354, 2.0, [[296, 318, 3.8]], 6.8); // AH|AA
  addPlat(836, 294, 878, 320, 0.30, -2.5);

  addWallWithOpenings(false, 990, 264, 354, 2.0, [[296, 316, 3.8]], 6.6); // AA|AD
  addPlat(972, 294, 1014, 318, 0.30, -2.5);

  addWallWithOpenings(false, 1182, 246, 354, 2.0, [[290, 314, 3.8]], 6.8); // AD|AI+AJ
  addPlat(1164, 288, 1204, 316, 0.30, -2.5);

  addWallWithOpenings(true, 354, 852, 948, 2.0, [[890, 912, 3.8]], 6.4); // AA|Y
  addPlat(888, 340, 914, 368, 0.30, -2.5);

  addWallWithOpenings(true, 354, 948, 1056, 2.0, [[996, 1018, 3.8]], 6.4); // AD|Z
  addPlat(994, 340, 1020, 368, 0.30, -2.5);

  addWallWithOpenings(false, 948, 354, 444, 2.0, [[386, 408, 3.8]], 6.4); // Y|Z
  addPlat(934, 384, 974, 410, 0.30, -2.5);

  addWallWithOpenings(false, 1056, 354, 444, 2.0, [[386, 408, 3.8]], 6.6); // Z|AJ
  addPlat(1042, 384, 1084, 410, 0.30, -2.5);

  // MEDIUM ZONE AH: The Mosaic Rotunda (642..852, 246..414) — Concentric rotunda colonnade + violet-ivory glow
  addWater(684, 266, 822, 396, -0.18, -0.84, 0.40);
  addPlat(650, 290, 844, 318, 0.28, -2.5);
  addPlat(650, 254, 704, 408, 0.28, -2.5);
  addPlat(704, 312, 790, 348, 0.28, -2.0);
  addCurvedWall(747, 330, 36.0, Math.PI * 0.32, Math.PI * 0.68, 5.8, -0.4, 0.72, 8);
  addCurvedWall(747, 330, 36.0, Math.PI * 1.32, Math.PI * 1.68, 5.8, -0.4, 0.72, 8);
  for (let k = 0; k < 8; k++) {
    const ang = (k / 8) * Math.PI * 2;
    addRoundCol(747 + Math.cos(ang) * 19.0, 330 + Math.sin(ang) * 19.0, 0.65, 6.8, -1.0);
  }
  addCeilVault(654, 254, 840, 406, 6.8, true, 5);
  addLight(747, 5.8, 330, 0xa892ff, 3.4, 64);
  addLight(700, 5.0, 304, 0xfff0d4, 2.8, 48);
  addLightVol(747, 2.6, 330, 66, 0x9b80ff, 0.56);

  // AA (Rose-Lit Corridor) & AD (Luminous Niche)
  addPlat(856, 294, 986, 318, 0.30, -2.5);
  addWater(860, 270, 982, 292, -0.18, -0.68, 0.28);
  addWater(860, 320, 982, 348, -0.18, -0.68, 0.28);
  addArcade(872, 306, 974, 306, 5, 4.0, 3.8, 0.72, 1.0, 0.30, { straddle: true, mint: true, recessGlow: true, glowRgb: [1.0, 0.56, 0.78], noCollide: true });
  addCeilVault(856, 268, 986, 350, 4.9, true, 4);
  addLight(921, 4.4, 306, 0xff7eb6, 3.1, 56);
  addLightVol(921, 2.0, 306, 54, 0xff7eb6, 0.64);

  addPlat(994, 294, 1178, 318, 0.30, -2.5);
  addWater(998, 252, 1174, 292, -0.18, -0.68, 0.24);
  addWater(998, 320, 1174, 348, -0.18, -0.68, 0.24);
  addArcade(1012, 306, 1164, 306, 5, 4.2, 4.0, 0.75, 1.1, 0.30, { straddle: true, mint: true, recessGlow: true, glowRgb: [0.68, 0.96, 1.0], noCollide: true });
  addCeilVault(994, 250, 1178, 350, 5.2, true, 4);
  addLight(1056, 4.5, 306, 0x80f4dc, 2.8, 48);
  addLight(1126, 4.5, 306, 0xc292ff, 2.8, 48);
  addLightVol(1056, 2.0, 306, 44, 0x7af4da, 0.55);
  addLightVol(1126, 2.0, 306, 44, 0xc292ff, 0.55);

  // Y (False End) & Z (Spiral Column)
  addPlat(856, 384, 944, 410, 0.30, -2.5);
  addWater(860, 358, 940, 382, -0.18, -0.62, 0.20);
  addWater(860, 412, 940, 438, -0.18, -0.62, 0.20);
  addWallBox(858, 376, 864, 420, 4.6, 0, false); // Visual dead-end screen inside Y before hidden side turn!
  addProp('pool_bench', 874, 396, 0.31, Math.PI * 0.5, 1.0);
  addProp('abandoned_sandals', 877, 398, 0.31, 0.2, 1.0);
  addCeilVault(856, 358, 944, 438, 4.6, false, 3);
  addLight(900, 4.1, 396, 0xaec8d0, 2.0, 38);

  addPlat(952, 384, 1052, 412, 0.30, -2.5);
  addWater(956, 358, 1048, 382, -0.18, -0.70, 0.30);
  addWater(956, 414, 1048, 438, -0.18, -0.70, 0.30);
  addRoundCol(1012, 399, 1.75, 6.0, -0.8);
  addCeilVault(952, 358, 1052, 438, 5.4, true, 3);
  addLight(1002, 4.8, 399, 0xd8f8fc, 2.9, 50);

  // MEDIUM ZONE AJ: The Aquatic Garden (1056..1314, 324..498) — Curved ceramic lagoons & foliage islands
  addWater(1078, 342, 1296, 482, -0.14, -0.64, 0.18);
  addPlat(1062, 384, 1118, 424, 0.30, -2.5);
  addPlat(1118, 404, 1272, 424, 0.30, -2.5);
  addPlat(1218, 330, 1244, 492, 0.30, -2.5);
  addCurvedWall(1185, 411, 42.0, Math.PI * 0.30, Math.PI * 0.70, 4.8, -0.4, 0.72, 8);
  addCurvedWall(1185, 411, 42.0, Math.PI * 1.30, Math.PI * 1.70, 4.8, -0.4, 0.72, 8);
  for (const [ix, iz] of [[1150, 376], [1222, 376], [1150, 448], [1258, 452]]) {
    addPlat(ix - 5, iz - 5, ix + 5, iz + 5, 0.30, -1.8);
    addProp('ceramic_island_planter', ix, iz, 0.30, 0.3, 1.0);
  }
  addCeilVault(1064, 332, 1304, 490, 6.8, true, 5);
  addLightShaft(1185, 3.6, 411, 5.5, 6.8, 0xe8fff6);
  addLight(1185, 6.0, 411, 0xaafae0, 3.3, 66);
  addLightVol(1185, 2.4, 411, 76, 0x8ef8d0, 0.44);

  // ---- 5. ROW 4: U (Reverse Echo), V (Hidden Walk), W (Dripping), AE (Floodgate), AC (Ultramarine), AL (ENORMOUS Spiral Slide Cathedral) ----
  // Connecting walls between Y/Z/U/V/W/AE/AL/AC/AJ
  addWallWithOpenings(true, 414, 642, 852, 2.0, [[680, 702, 3.8], [786, 808, 3.8]], 6.6); // AH|U/V
  addPlat(678, 398, 704, 434, 0.28, -2.5);
  addPlat(784, 398, 810, 434, 0.28, -2.5);

  addWallWithOpenings(false, 738, 414, 528, 2.0, [[458, 480, 3.8]], 6.4); // U|V
  addPlat(722, 456, 756, 482, 0.28, -2.5);

  addWallWithOpenings(true, 528, 642, 768, 2.0, [[684, 706, 3.8]], 6.4); // U|W
  addPlat(682, 510, 708, 548, 0.28, -2.5);

  addWallWithOpenings(true, 528, 768, 852, 2.0, [[786, 808, 3.8]], 6.4); // V|AE
  addPlat(784, 510, 810, 548, 0.28, -2.5);

  addWallWithOpenings(false, 768, 528, 642, 2.0, [[572, 594, 3.8]], 6.4); // W|AE
  addPlat(752, 570, 788, 596, 0.28, -2.5);

  addWallWithOpenings(true, 444, 852, 1056, 2.0, [[908, 932, 4.4], [996, 1020, 4.4]], 7.6); // Y/Z|AL
  addPlat(906, 430, 934, 476, 0.32, -2.5);
  addPlat(994, 430, 1022, 476, 0.32, -2.5);

  addWallWithOpenings(false, 888, 444, 660, 2.0, [[572, 596, 4.2]], 7.6); // AE|AL
  addPlat(868, 570, 916, 598, 0.32, -2.5);

  addWallWithOpenings(true, 498, 1122, 1314, 2.0, [[1208, 1234, 4.0]], 6.8); // AJ|AC
  addPlat(1206, 482, 1236, 520, 0.30, -2.5);

  addWallWithOpenings(false, 1122, 498, 660, 2.0, [[552, 578, 4.2]], 7.4); // AL|AC
  addPlat(1100, 550, 1152, 580, 0.32, -2.5);

  // U, V, W, AE, AC interiors
  addPlat(650, 456, 734, 482, 0.28, -2.5);
  addWater(652, 420, 730, 454, -0.20, -0.78, 0.30);
  addWater(652, 484, 730, 522, -0.20, -0.78, 0.30);
  addCeilVault(648, 418, 734, 524, 6.8, false, 4);
  addLight(690, 5.8, 471, 0xb6d6de, 2.0, 42);

  addPlat(742, 456, 848, 482, 0.28, -2.5);
  addWater(746, 420, 844, 454, -0.20, -0.74, 0.15);
  addArcade(756, 469, 836, 469, 5, 3.6, 3.2, 0.65, 0.9, 0.28, { straddle: true, mint: true, noCollide: true });
  addCeilVault(742, 418, 848, 524, 4.4, false, 3);
  addLight(795, 3.9, 471, 0xb0cad0, 1.9, 38);

  addPlat(650, 560, 764, 594, 0.28, -2.5);
  addWater(654, 534, 760, 558, -0.18, -0.88, 0.56);
  addWater(654, 596, 760, 636, -0.18, -0.88, 0.56);
  addProp('mineral_stain', 686, 566, 0.29, 0, 1.0);
  addProp('mineral_stain', 724, 584, 0.29, 0.8, 1.0);
  addAnim('water_ripple_ring', 705, 614, -0.16, 0, 1.3);
  addCeilVault(648, 532, 764, 638, 4.5, false, 3);
  addLight(705, 4.0, 585, 0xb4dce2, 2.2, 44);

  addPlat(772, 570, 884, 598, 0.30, -2.5);
  addWater(776, 534, 880, 568, -0.20, -1.05, 0.50);
  addWater(776, 600, 880, 650, -0.20, -1.05, 0.50);
  addProp('floodgate_wheel', 828, 568, 0.30, 0, 1.0);
  addProp('warning_sign_cone', 816, 576, 0.31, 0.3, 1.0);
  addProp('pool_skimmer', 844, 568, 0.20, 0, 1.0);
  addCeilVault(772, 532, 884, 652, 5.2, true, 3);
  addLight(828, 4.6, 585, 0xd0ecef, 2.5, 48);

  addPlat(1126, 552, 1304, 582, 0.30, -2.5);
  addWater(1134, 504, 1300, 550, -0.18, -0.96, 0.68);
  addWater(1134, 584, 1300, 652, -0.18, -0.96, 0.68);
  addArcade(1148, 567, 1284, 567, 5, 4.6, 4.2, 0.78, 1.1, 0.30, { straddle: true, mint: true, recessGlow: true, glowRgb: [0.36, 0.60, 1.0], noCollide: true });
  addCeilVault(1126, 502, 1308, 654, 5.6, true, 4);
  addLight(1218, 4.9, 567, 0x4880ff, 3.2, 58);
  addLightVol(1218, 2.2, 567, 68, 0x3b6eff, 0.66);

  // =========================================================================
  // ENORMOUS SIGNATURE #1: ZONE AL — THE GRAND SPIRAL SLIDE CATHEDRAL
  // (x: 888..1122, z: 444..660) — Multi-tier balconies, 2 giant spiral slides + tubes
  // =========================================================================
  addWater(912, 476, 1098, 636, -0.22, -1.25, 0.34);
  // Dry wrap-around main perimeter boardwalk & 2-tier raised balconies
  addPlat(892, 448, 1118, 486, 0.32, -2.5);
  addPlat(892, 628, 1118, 656, 0.32, -2.5);
  addPlat(892, 486, 926, 628, 0.32, -2.5);
  addPlat(1088, 486, 1118, 628, 0.32, -2.5);
  // Upper launching mezzanine level (y: 4.8m) with twin stairs + spiral slides!
  addPlat(962, 484, 1048, 514, 4.80, -1.5);
  addRamp(926, 486, 962, 510, 0.32, 4.80, 'e');
  addRamp(1048, 486, 1086, 510, 4.80, 0.32, 'e');
  // Central dry viewing island
  addPlat(990, 594, 1020, 628, 0.32, -2.0);
  // 2 Full 3D Helical Spiral Slides + 2 Long Steep Chutes + 1 High Enclosed Tube
  addSpiralSlide(960, 558, 13.5, 4.80, -0.20, 1.35, 3.1, false, -Math.PI * 0.5, 0xffe49e);
  addSpiralSlide(1050, 558, 13.5, 4.80, -0.20, 1.35, 3.1, true, -Math.PI * 0.5, 0x4ae8e0);
  addSlide(994, 514, 1004, 594, 4.80, -0.20, 's');
  addSlide(1008, 514, 1018, 594, 4.80, -0.20, 's');
  addCeramicTube(1005, 552, 7.2, 160, 2.5, { axis: 'x', mintTrim: true, waterTube: true, glowRgb: [1.0, 0.88, 0.58] });
  for (const [rx, rz] of [[936, 496], [1074, 496], [936, 552], [1074, 552], [936, 616], [1074, 616]]) {
    addRoundCol(rx, rz, 1.25, 11.4, -1.5);
  }
  addCeilVault(896, 452, 1114, 652, 9.6, true, 6);
  addLightShaft(1005, 5.2, 552, 6.8, 9.4, 0xffefc4);
  addLight(960, 8.2, 558, 0xffe49e, 3.6, 82);
  addLight(1050, 8.2, 558, 0x52f2e4, 3.6, 82);
  addLightVol(960, 3.0, 558, 72, 0xffe096, 0.52);
  addLightVol(1050, 3.0, 558, 72, 0x3ce8d8, 0.52);
  addProp('lifeguard_stand', 922, 552, 0.32, Math.PI * 0.5, 1.0);
  addProp('pool_ring', 980, 612, -0.20, 0.5, 1.2);

  // =========================================================================
  // 6. SOUTH-WEST COMPACT TRANSITIONS: X (Underbridge) & AF (Shadow Arcade)
  // =========================================================================
  addWallWithOpenings(false, 216, 642, 804, 2.0, [[708, 734, 3.8]], 6.8); // X|AF
  addPlat(198, 706, 236, 736, 0.32, -2.5);

  addWallWithOpenings(false, 564, 642, 804, 2.0, [[708, 734, 4.0]], 7.2); // AF|AK
  addPlat(546, 706, 588, 736, 0.32, -2.5);

  addWallWithOpenings(true, 804, 24, 564, 2.4, [[106, 134, 4.4], [366, 394, 4.4]], 7.8); // X/AF -> AM
  addPlat(104, 790, 136, 826, 0.32, -2.5);
  addPlat(364, 790, 396, 826, 0.32, -2.5);
  addArch(120, 804, 5.2, 4.4, 1.0, 2.5, 0, 0.32, { mint: true, noCollide: true });
  addArch(380, 804, 5.2, 4.4, 1.0, 2.5, 0, 0.32, { mint: true, noCollide: true });

  // Note: Boundary between AL (888..1122) and AN (z=660) is SEALED directly so players travel AL->AC->AN or AL->AE->AK->AN!
  addWallWithOpenings(true, 660, 768, 1314, 2.2, [
    [806, 836, 4.2],   // AE <-> AK
    [1202, 1232, 4.4]  // AC <-> AN
  ], wallH);
  addPlat(804, 644, 838, 690, 0.32, -2.5);
  addPlat(1200, 644, 1234, 690, 0.32, -2.5);

  // X (Underbridge Tunnel) & AF (Shadow Arcade)
  addPlat(30, 706, 212, 736, 0.32, -2.5);
  addWater(32, 650, 208, 704, -0.22, -1.15, 0.64);
  addWater(32, 738, 208, 796, -0.22, -1.15, 0.64);
  addPlat(48, 648, 190, 796, 3.80, 3.30); // Overhead aqueduct slab casting low headroom tunnel!
  addProp('underwater_lamp', 88, 702, -0.5, 0, 1.0);
  addProp('underwater_lamp', 152, 702, -0.5, 0, 1.0);
  addLight(120, 2.7, 720, 0x42e4d8, 2.4, 46);
  addLightVol(120, 1.4, 720, 64, 0x42e4d8, 0.45);

  addPlat(220, 706, 560, 736, 0.32, -2.5);
  addWater(226, 650, 554, 704, -0.20, -0.92, 0.35);
  addWater(226, 738, 554, 796, -0.20, -0.92, 0.35);
  addArcade(240, 721, 540, 721, 8, 4.2, 4.0, 0.78, 1.1, 0.32, { straddle: true, mint: false, noCollide: true });
  addCeilVault(220, 648, 560, 798, 5.4, false, 6);
  addLightShaft(330, 2.7, 721, 2.4, 5.4, 0xb8d4e8);
  addLightShaft(460, 2.7, 721, 2.4, 5.4, 0xb8d4e8);
  addLight(330, 4.8, 721, 0x9ec4d8, 1.9, 36);
  addLight(460, 4.8, 721, 0x9ec4d8, 1.9, 36);

  // =========================================================================
  // ENORMOUS SIGNATURE #2: ZONE AM — THE AQUATIC CONDUIT NEXUS
  // (x: 24..564, z: 804..1314) — 6 giant cylindrical ceramic pipelines intersecting
  // =========================================================================
  addWater(54, 834, 534, 1284, -0.22, -1.45, 0.78);
  // Perimeter catwalk ring + interior distribution dry walkways around giant conduits
  addPlat(28, 808, 558, 868, 0.32, -2.5);
  addPlat(28, 1244, 558, 1308, 0.32, -2.5);
  addPlat(28, 868, 96, 1244, 0.32, -2.5);
  addPlat(492, 868, 558, 1244, 0.32, -2.5);
  addPlat(160, 1020, 428, 1096, 0.32, -2.0); // Central Distribution Isle
  addPlat(276, 868, 312, 1244, 0.32, -2.0); // N-S Catwalk
  addPlat(96, 1044, 492, 1072, 0.32, -2.0); // E-W Catwalk
  addRamp(260, 916, 276, 944, 0.32, 3.20, 'e');
  addPlat(220, 932, 368, 960, 3.20, -1.6); // High Conduit Inspection Deck
  // 6 Giant Intersecting Ceramic Conduits (walkable interior tunnels + overhead flowing chutes!)
  addCeramicTube(294, 946, 3.2, 340, 2.8, { axis: 'x', flatWalkFloor: true, mintTrim: true, glowRgb: [0.32, 0.88, 1.0] });
  addCeramicTube(294, 1170, 3.8, 340, 2.8, { axis: 'x', mintTrim: true, waterTube: true, glowRgb: [1.0, 0.68, 0.24] });
  addCeramicTube(192, 1059, 4.4, 340, 2.6, { axis: 'z', mintTrim: true, glowRgb: [0.28, 0.64, 1.0] });
  addCeramicTube(396, 1059, 4.4, 340, 2.6, { axis: 'z', mintTrim: true, waterTube: true, glowRgb: [0.34, 0.94, 0.84] });
  addCeramicTube(294, 1059, 7.6, 260, 3.1, { axis: 'x', mintTrim: true, glowRgb: [1.0, 0.72, 0.28] });
  addCeramicTube(294, 1059, 7.4, 260, 2.9, { axis: 'z', mintTrim: true, glowRgb: [0.30, 0.86, 1.0] });
  for (const [rx, rz] of [[168, 920], [420, 920], [168, 1196], [420, 1196], [294, 990], [294, 1126]]) {
    addRoundCol(rx, rz, 1.30, 11.8, -1.6);
  }
  addCeilVault(40, 820, 548, 1296, 9.8, true, 7);
  addLight(294, 8.2, 946, 0x3ec8ff, 3.6, 86);
  addLight(294, 8.2, 1170, 0xffaa38, 3.6, 86);
  addLight(294, 6.4, 1059, 0x3072ff, 3.8, 92);
  addLightVol(294, 2.8, 1059, 130, 0x3878ff, 0.46);
  addLightVol(294, 3.2, 1170, 88, 0xffaa38, 0.48);
  addProp('floodgate_wheel', 274, 1020, 0.32, 0, 1.15);
  addProp('hydraulic_pipe_elbow', 164, 1040, 0.32, 0, 1.4);

  // =========================================================================
  // MEDIUM ZONE AK: THE REFLECTION OBSERVATORY (x: 564..864, z: 642..1314)
  // =========================================================================
  addWallWithOpenings(false, 564, 804, 1314, 2.2, [[910, 942, 4.4], [1168, 1198, 4.4]], wallH); // AM <-> AK
  addPlat(542, 908, 600, 944, 0.32, -2.5);
  addPlat(542, 1166, 600, 1200, 0.32, -2.5);

  addWallWithOpenings(false, 864, 660, 1314, 2.2, [[776, 808, 4.6], [1106, 1138, 4.6]], wallH); // AK <-> AN
  addPlat(844, 774, 904, 810, 0.34, -2.5);
  addPlat(844, 1104, 904, 1140, 0.34, -2.5);

  addWater(586, 672, 842, 1284, -0.18, -0.95, 0.42);
  addPlat(568, 664, 650, 750, 0.32, -2.5);
  addPlat(600, 750, 628, 1240, 0.32, -2.5); // West Glass Reflection Gallery
  addPlat(780, 664, 860, 1240, 0.32, -2.5); // East Glass Reflection Gallery
  addPlat(628, 780, 780, 806, 0.32, -2.0); // Bridge 1
  addPlat(628, 1110, 780, 1136, 0.32, -2.0); // Bridge 2
  // Upper Mirror Pool Observatory Deck (y: 2.2m) + ramps
  addPlat(654, 870, 756, 976, 2.20, -1.5);
  addWater(666, 882, 744, 964, 2.08, 1.72, 0.16, true);
  addRamp(628, 912, 654, 938, 0.32, 2.20, 'e');
  addRamp(756, 912, 782, 938, 2.20, 0.32, 'e');
  addGlassWall(628, 814, 628.3, 904, 0.32, 3.8, true);
  addGlassWall(779.7, 814, 780, 904, 0.32, 3.8, true);
  addArcade(704, 884, 704, 960, 5, 4.6, 5.2, 0.78, 1.1, 2.20, { straddle: true, mint: true, recessGlow: true, glowRgb: [0.55, 0.92, 1.0], noCollide: true });
  addCeilVault(572, 656, 856, 1296, 7.6, true, 6);
  addLight(704, 6.4, 792, 0x5ae6ff, 3.4, 68);
  addLight(704, 6.4, 1122, 0xffcf6e, 3.4, 68);
  addLightVol(704, 2.4, 792, 74, 0x5ae6ff, 0.50);
  addLightVol(704, 2.4, 1122, 74, 0xffcf6e, 0.50);

  // =========================================================================
  // ENORMOUS SIGNATURE #3: ZONE AN — THE CHROMATIC AQUATIC CATHEDRAL
  // (x: 864..1314, z: 660..1314) — White ceramic transformed by 6 harmonic indirect colors
  // Rose Pink, Turquoise, Warm Gold, Soft Violet, Pale Mint, Deep Ultramarine
  // =========================================================================
  addWater(896, 704, 1284, 1276, -0.18, -1.08, 0.36);
  addPlat(870, 684, 1308, 728, 0.34, -2.5);
  addPlat(870, 1244, 1308, 1296, 0.34, -2.5);
  addPlat(870, 728, 934, 1244, 0.34, -2.5);
  addPlat(1244, 728, 1308, 1244, 0.34, -2.5);
  // Stepped Central Cathedral Promenade & Cross Nave Bridges
  addPlat(1062, 728, 1116, 1244, 0.34, -2.0);
  addPlat(934, 962, 1244, 1012, 0.34, -2.0);
  addPlat(1042, 944, 1136, 1030, 0.85, -1.8); // Elevated Sanctuary Dais in center
  addRamp(1022, 974, 1042, 1000, 0.34, 0.85, 'e');
  addRamp(1136, 974, 1156, 1000, 0.85, 0.34, 'e');
  addCurvedWall(1089, 987, 46.0, 0.25, Math.PI * 0.78, 6.8, -0.4, 0.85, 8);
  addCurvedWall(1089, 987, 46.0, Math.PI + 0.25, Math.PI * 1.78, 6.8, -0.4, 0.85, 8);
  for (let k = 0; k < 10; k++) {
    const a = ((k + 0.5) / 10) * Math.PI * 2;
    addRoundCol(1089 + Math.cos(a) * 62.0, 987 + Math.sin(a) * 62.0, 1.15, 11.2, -1.2);
  }
  addArcade(1054, 987, 1124, 987, 4, 6.2, 5.4, 0.85, 1.2, 0.85, { straddle: true, mint: true, recessGlow: true, glowRgb: [1.0, 0.85, 0.55], noCollide: true });
  addCeilVault(880, 678, 1298, 1292, 9.8, true, 8);

  // 6 Harmonic Colored Indirect-Lighting Alcoves shaping AN white ceramic!
  const chromAlcoves = [
    { x: 968, z: 816, hex: 0xff78b4, name: 'rose' },
    { x: 1210, z: 816, hex: 0x40f2d8, name: 'turquoise' },
    { x: 968, z: 987, hex: 0xffca58, name: 'gold' },
    { x: 1210, z: 987, hex: 0xa878ff, name: 'violet' },
    { x: 968, z: 1158, hex: 0x88f7c8, name: 'mint' },
    { x: 1210, z: 1158, hex: 0x3c6eff, name: 'ultramarine' },
    { x: 1012, z: 956, hex: 0xff5ca8, name: 'inner_rose' },
    { x: 1012, z: 1018, hex: 0x5870ff, name: 'inner_ultramarine' }
  ];
  for (const al of chromAlcoves) {
    const cr = ((al.hex >> 16) & 255) / 255;
    const cg = ((al.hex >> 8) & 255) / 255;
    const cb = (al.hex & 255) / 255;
    addArcade(al.x - 16, al.z, al.x + 16, al.z, 3, 5.6, 5.0, 0.88, 1.2, 0.34, {
      mint: false, recessGlow: true, glowRgb: [cr, cg, cb], noCollide: true
    });
    addLight(al.x, 7.6, al.z, al.hex, 3.8, 96);
    addLightVol(al.x, 3.2, al.z, 108, al.hex, 0.68);
    addLightShaft(al.x, 4.8, al.z, 5.2, 9.2, al.hex, 0.08, -0.06);
  }
  addLight(1089, 8.8, 987, 0xfff6ea, 3.6, 98);
  addProp('pool_bench', 1082, 976, 0.85, 0, 1.1);
  addProp('pool_bench', 1082, 998, 0.85, Math.PI, 1.1);
  addProp('lounge_chair', 908, 962, 0.35, Math.PI * 0.5, 1.0);
  addProp('lounge_chair', 1272, 1012, 0.35, -Math.PI * 0.5, 1.0);
}
