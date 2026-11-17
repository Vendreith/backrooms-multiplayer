/* Copyright (c) 2026 Vendreith. Original gameplay code; see ../../LICENSE.md. */
import { EXPLORER_PROFILE, normalizeProfile, profileSignature } from './profiles.js';
export const MOTION = Object.freeze({ buffer: .145, coyote: .105, hopBonus: .45, slideTime: .86, slideCooldown: .34 });
export const BODY = Object.freeze({ stand: 1.72, crouch: 1.08, slide: 1.08 });
const damp = (a, b, rate, dt) => b + (a - b) * Math.exp(-rate * dt);
export function capVelocity(v, cap) {
  const speed = Math.hypot(v.vx, v.vz);
  if (speed > cap && speed > 0) { v.vx *= cap / speed; v.vz *= cap / speed; }
  return v;
}

/** Adds forgiving input and bounded momentum to the existing collision controller. */
export class MovementAssist {
  constructor() { this.profile = EXPLORER_PROFILE; this.signature = profileSignature(this.profile); this.reset(); }
  configure(profile) {
    const signature = profileSignature(profile);
    if (signature === this.signature) return;
    this.profile = normalizeProfile(profile); this.signature = signature;
    this.endSlide(); this.hopBonus = this.airRecent = 0; this.clearInput();
  }
  reset() {
    this.vx = this.vz = this.buffer = this.coyote = this.slideT = this.cooldown = 0;
    this.jumpHeld = this.crouchHeld = this.sliding = false;
    this.slideCap = 0; this.eye = 1.62; this.eyeVelocity = 0;
    this.jumps = this.slides = this.airRecent = this.hopBonus = 0; this.jumpedOnce = false; this.allowedSpeed = 0;
  }
  clearInput() { this.buffer = this.coyote = 0; this.jumpHeld = this.crouchHeld = false; }
  step(dt, p) {
    dt = Math.max(0, Math.min(.068, dt));
    this.buffer = Math.max(0, this.buffer - dt);
    this.coyote = p.grounded ? MOTION.coyote : Math.max(0, this.coyote - dt);
    this.cooldown = Math.max(0, this.cooldown - dt);
    this.airRecent = !p.grounded && this.jumpedOnce ? .18 : Math.max(0, this.airRecent - dt);
    if (this.airRecent <= 0 || !p.canAct || p.allowHopBonus===false) this.hopBonus = 0;
    if (p.jump && (!this.jumpHeld || p.autoHop)) this.buffer = MOTION.buffer;
    const crouchEdge = p.crouch && !this.crouchHeld;
    this.jumpHeld = p.jump; this.crouchHeld = p.crouch;
    let justSlid = false;
    if (this.profile.allowSlide && crouchEdge && p.grounded && p.canAct && p.sprint && !this.sliding && this.cooldown <= 0 && Math.hypot(this.vx, this.vz) >= p.sprintCap * .70) {
      this.sliding = true; this.slideT = MOTION.slideTime;
      this.slideCap = p.sprintCap; this.slides++; justSlid = true;
    }
    let jumped = false;
    if (this.buffer > 0 && this.coyote > 0 && p.canAct && p.canStand && (!p.crouch || this.sliding)) {
      this.buffer = this.coyote = 0;
      jumped = true; this.jumps++;
      this.hopBonus = p.allowHopBonus!==false && this.airRecent > 0 && p.wish > .1 ? this.profile.hopBonus : 0;
      this.jumpedOnce = true;
      if (this.sliding) this.endSlide();
    }
    if (this.sliding) {
      this.slideT -= dt;
      const friction = p.water ? 2.8 : p.surface === 'carpet' ? 2.3 : p.surface === 'metal' ? 1.0 : p.surface === 'tile' ? 1.12 : 1.65;
      const speed = Math.hypot(this.vx, this.vz) * Math.exp(-friction * dt);
      if (p.wish > .01) {
        const heading = Math.atan2(this.vx, this.vz);
        const target = Math.atan2(p.wx, p.wz);
        const delta = Math.atan2(Math.sin(target - heading), Math.cos(target - heading));
        const turn = Math.max(-1.0 * dt, Math.min(1.0 * dt, delta * .28));
        this.vx = Math.sin(heading + turn) * speed;
        this.vz = Math.cos(heading + turn) * speed;
      } else { this.vx *= Math.exp(-friction * dt); this.vz *= Math.exp(-friction * dt); }
      capVelocity(this, Math.min(this.slideCap, p.sprintCap));
      if (this.slideT <= 0 || speed < 1.7 || !p.grounded || !p.canAct) this.endSlide();
    } else {
      const rate = p.grounded && !jumped ? (p.wish ? this.profile.acceleration : this.profile.braking) : this.profile.airAcceleration * this.profile.airControl;
      const allowed = p.speed + (p.canAct && !p.crouch ? this.hopBonus : 0);
      if (p.grounded || p.wish) {
        this.vx = damp(this.vx, p.wx * allowed * p.wish, rate, dt);
        this.vz = damp(this.vz, p.wz * allowed * p.wish, rate, dt);
      }
      capVelocity(this, allowed);
    }
    this.allowedSpeed = this.sliding ? Math.min(this.slideCap, p.sprintCap) : p.speed + (p.canAct && !p.crouch ? this.hopBonus : 0);
    return { jumped, justSlid, sliding: this.sliding, crouch: p.crouch || this.sliding || !p.canStand };
  }
  endSlide() { this.sliding = false; this.slideT = 0; this.cooldown = MOTION.slideCooldown; }
  cameraHeight(target, dt) {
    // Exact critically damped spring: no frame-rate dependent overshoot or eye-height snap.
    const w = 19, e = Math.exp(-w * dt), delta = this.eye - target, c = this.eyeVelocity + w * delta;
    this.eye = target + (delta + c * dt) * e;
    this.eyeVelocity = (this.eyeVelocity - w * c * dt) * e;
    return this.eye;
  }
}
