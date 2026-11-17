/*! Copyright (c) 2026 Vendreith. Licensing: see LICENSE.md and THIRD_PARTY_NOTICES.md. */
// Level-specific policy shared by host simulation and client synchronization.
export function isPeacefulLevel(levelId) { return levelId === 'level37'; }
export function isHostileInPeacefulLevel(player) { return player?.role === 'k' && isPeacefulLevel(player.levelId); }
