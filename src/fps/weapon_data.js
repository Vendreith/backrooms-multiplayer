/* Copyright (c) 2026 Vendreith. Original weapon gameplay definitions. */
export const WEAPONS = Object.freeze({
  none: { name: 'Empty hand', interval: 0, range: 0 },
  deagle: { name: 'Desert Eagle', capacity: 7, reserve: 35, interval: .32, reload: 2.25, reloadEmpty: 2.25, range: 75, sightY: .062, draw: .58, shotSound: 'shot' },
  relic: { name: 'Meridian-6', capacity: 6, reserve: 30, interval: .42, reload: 2.65, reloadEmpty: 3.10, range: 80, sightY: .080, draw: .72, shotSound: 'relic_shot' },
  butterfly: { name: 'Butterfly Knife', interval: .52, range: 1.85, draw: .66 }
});
export const ammoKeys = weapon => weapon === 'relic' ? ['relicMag', 'relicReserve'] : ['mag', 'reserve'];
export function weaponAmmo(state, weapon = state.equipped) {
  const [mag, reserve] = ammoKeys(weapon); return { mag: state[mag] ?? WEAPONS[weapon]?.capacity ?? 0, reserve: state[reserve] ?? WEAPONS[weapon]?.reserve ?? 0 };
}
export function makeLoadout() { return { equipped: 'none', mag: 7, reserve: 35, relicMag: 6, relicReserve: 30, cylinderIndex: 0, reloadEnd: 0, reloadWeapon: null, reloadEmpty: false, readyAt: 0, nextFire: 0, revision: 0, sequence: 0 }; }
