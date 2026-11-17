/* Copyright (c) 2026 Vendreith. Independent movement policies shared by client and host. */
export const TACTICAL_LIMITS = Object.freeze({
  baseSpeed: [3.4, 5.2, 4.35], walkMultiplier: [.4, .75, .52], acceleration: [16, 36, 24],
  braking: [18, 42, 32], airAcceleration: [1.5, 6, 3], airControl: [.35, 1, .75],
  jumpImpulse: [5.2, 7.1, 6.15], crouchMultiplier: [.35, .65, .48], cameraIntensity: [0, .3, .12]
});
export const EXPLORER_PROFILE = Object.freeze({ key: 'backrooms', acceleration: 18, braking: 14, airAcceleration: 3.5, airControl: 1, jumpImpulse: 7.1, cameraIntensity: 1, hopBonus: .45, allowSlide: true });
export function tacticalProfile(values = {}) {
  const p = { key: 'tactical', hopBonus: 0, allowSlide: false };
  for (const [key, [min, max, fallback]] of Object.entries(TACTICAL_LIMITS)) {
    const n = Number(values[key]); p[key] = Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : fallback;
  }
  return p;
}
export function normalizeProfile(spec) { return spec?.key === 'tactical' ? tacticalProfile(spec) : { ...EXPLORER_PROFILE }; }
export function profileFromSettings(settings) {
  if (settings.movementProfile !== 'tactical') return { ...EXPLORER_PROFILE };
  return tacticalProfile(Object.fromEntries(Object.keys(TACTICAL_LIMITS).map(k => [k, settings['tactical_' + k]])));
}
export function profileSignature(p) { return JSON.stringify(normalizeProfile(p)); }
export function tacticalSpeed(profile, { shift = false, crouch = false, water = false } = {}) {
  return profile.baseSpeed * (shift ? profile.walkMultiplier : 1) * (crouch ? profile.crouchMultiplier : 1) * (water ? .8 : 1);
}
export function acceptProfileChange(player, message) {
  if (player.role !== 's' || player.state !== 'ok' || player.carrying || !['backrooms', 'tactical'].includes(message.profile?.key)) return false;
  if (!Number.isSafeInteger(message.seq) || message.seq <= (player.movement?.sequence || 0)) return false;
  // Reject non-finite input; clamp finite preferences to the same explicit room policy on both sides.
  if (message.profile.key === 'tactical' && Object.keys(TACTICAL_LIMITS).some(k => Object.hasOwn(message.profile,k) && !Number.isFinite(message.profile[k]))) return false;
  player.movement = { ...normalizeProfile(message.profile), sequence: message.seq, revision: (player.movement?.revision || 0) + 1 };
  player.sliding = false; return true;
}
export const INSPECT_KEYS = Object.freeze({ KeyT: 'T', KeyV: 'V', KeyB: 'B' });
export const FPS_DEFAULTS = Object.freeze({ movementProfile: 'backrooms', autoBhop: false, ...Object.fromEntries(Object.entries(TACTICAL_LIMITS).map(([k, v]) => ['tactical_' + k, v[2]])), inspectKey: 'KeyT', inspectHold: 'chain', weaponMotion: 1, weaponSway: 1, viewmodelPosition: 'standard' });
export const FPS_SETTING_KEYS = Object.freeze([...Object.keys(FPS_DEFAULTS),'idleMotion','movementShake','handheldTremor','verticalBob']);
export function presentationSettings(settings) {
  return {
    inspectKey: Object.hasOwn(INSPECT_KEYS, settings.inspectKey) ? settings.inspectKey : 'KeyT',
    loop: settings.inspectHold !== 'single',
    motion: Math.max(0, Math.min(1.5, Number.isFinite(Number(settings.weaponMotion)) ? Number(settings.weaponMotion) : 1)),
    sway: Math.max(0, Math.min(1.5, Number.isFinite(Number(settings.weaponSway)) ? Number(settings.weaponSway) : 1)),
    offset: ['close', 'standard', 'wide'].includes(settings.viewmodelPosition) ? settings.viewmodelPosition : 'standard'
  };
}
