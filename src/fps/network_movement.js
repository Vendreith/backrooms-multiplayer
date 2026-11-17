/* Copyright (c) 2026 Vendreith. Bounded host-side acceptance of the existing position protocol. */
import { normalizeProfile, profileSignature } from './profiles.js';
export class MovementGuard {
  constructor() { this.states = new WeakMap(); }
  reset(p) { this.states.delete(p); }
  advancePit(p,s,now,floor,firstDelta=.05){
    const dt=Math.max(0,Math.min(.1,now-(s.fallAt??(now-firstDelta))));
    s.fallVy=Math.max(-45,(s.abyss?s.fallVy:Math.min(normalizeProfile(p.movement).jumpImpulse,p.vy||0))-21*dt);
    p.y=Math.max(floor,p.y+s.fallVy*dt);p.vy=s.fallVy;p.grounded=false;s.abyss=true;s.fallAt=now;
  }
  advanceEnvironment(p,{now,floorAt,abyssAt=()=>false,dt=.016}){
    const floor=floorAt(p.x,p.z,p.y);if(!abyssAt(p.x,p.z,p.y))return;
    let s=this.states.get(p);if(!s){s={at:now,budget:0,slideUntil:0,cooldown:0,air:true,fall:true,hop:false,landAt:-100};this.states.set(p,s);}
    this.advancePit(p,s,now,floor,dt);
  }
  accept(p, input, { now, cap, floorAt, resolve, canStand, abyssAt=()=>false }) {
    if (!['x', 'y', 'z', 'yaw', 'pitch'].every(k => Number.isFinite(input[k]))) return false;
    let s = this.states.get(p);
    if (!s) { s = { at: now - .05, budget: 0, slideUntil: 0, cooldown: 0, air: false, fall: false, hop: false, landAt: -100 }; this.states.set(p, s); }
    const dt = Math.max(0, Math.min(.25, now - s.at)); s.at = now;
    const profile = normalizeProfile(p.movement), signature = profileSignature(profile);
    if (signature !== s.profile) { s.profile = signature; s.budget = 0; s.hop = false; s.slideUntil = 0; }
    const currentFloor = floorAt(p.x, p.z, p.y), dy = input.y - p.y;
    if (input.y > currentFloor + .14) s.air = true;
    if (s.air && dy < -.015) s.fall = true;
    if (s.air && ((input.y <= currentFloor + .055 && dy <= 0) || (s.fall && p.y < currentFloor + .3 && dy > .015))) {
      s.landAt = now; s.air = false; s.fall = false;
    }
    if (profile.hopBonus > 0 && input.bhop && now - s.landAt < .24 && !input.crouch) s.hop = true;
    if (!input.bhop || (!s.air && now - s.landAt > .24)) s.hop = false;
    // The host grants at most one fixed bonus after an observed landing; never a client-supplied magnitude.
    if (s.hop && !input.crouch) cap += profile.hopBonus;
    if (profile.allowSlide && input.sliding && !p.sliding && now >= s.cooldown && input.crouch && Math.abs(p.y - floorAt(p.x, p.z, p.y)) < .10 && (p.spd || 0) > cap * .7) {
      s.slideUntil = now + .9; s.cooldown = now + 1.25;
    }
    p.sliding = profile.allowSlide && !!input.sliding && now < s.slideUntil;
    p.crouch = !!input.crouch || p.sliding || !canStand(p.x, p.z, p.y);
    s.budget = Math.min(cap * .13, s.budget + cap * dt);
    let dx = input.x - p.x, dz = input.z - p.z;
    const dist = Math.hypot(dx, dz), allowed = Math.min(dist, s.budget);
    if (dist > 0) { dx *= allowed / dist; dz *= allowed / dist; }
    s.budget -= allowed;
    // Small substeps prevent a legal-speed packet from tunnelling through narrow walls.
    const count = Math.max(1, Math.ceil(allowed / .13));
    let x = p.x, z = p.z;
    for (let i = 0; i < count; i++) [x, z] = resolve(x + dx / count, z + dz / count, p.crouch, p.y);
    const floor = floorAt(x, z, p.y);
    const jumpHeight = profile.key === 'tactical' ? profile.jumpImpulse ** 2 / 42 + .12 : 1.65;
    const abyss=!!abyssAt(x,z,p.y);
    const y = Math.max(floor, Math.min(abyss ? Math.max(1.7,p.y+jumpHeight) : floor + jumpHeight, input.y));
    // Gravity/step allowance supports existing ramps while rejecting arbitrary vertical teleports.
    const maxDy = (abyss ? Math.min(45,Math.max(1,-(p.vy||0))+21*dt) : 10) * dt + .025;
    const previousY = p.y;
    if(abyss){
      // Once over a real shaft, gravity belongs to the host. A client cannot fly up or teleport down.
      this.advancePit(p,s,now,floor,dt);
    }else{
      s.abyss=false;s.fallAt=undefined;p.y = Math.max(floor, Math.max(p.y - maxDy, Math.min(p.y + maxDy, y)));
      p.vy = Math.max(-10, Math.min(profile.jumpImpulse, (p.y - previousY) / Math.max(.001, dt)));
    }
    p.grounded = p.y <= floor + .055 && p.vy <= .45;
    p.spd = Math.min(cap, Math.hypot(x - p.x, z - p.z) / Math.max(.001, dt));
    p.x = x; p.z = z; p.yaw = input.yaw % (Math.PI * 2); p.pitch = Math.max(-1.46, Math.min(1.46, input.pitch));
    p.fl = !!input.fl;
    return true;
  }
}
