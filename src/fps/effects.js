/* Copyright (c) 2026 Vendreith. Fixed-size pools; no GPU allocations while firing. */
import * as THREE from 'three';
export class WeaponEffects {
  constructor(scene) {
    this.root = new THREE.Group(); this.root.name = 'WeaponEffects'; scene.add(this.root); this.index = 0;
    this.shellGeo = new THREE.CylinderGeometry(.0044, .0044, .017, 10);
    this.shellMat = new THREE.MeshStandardMaterial({ color: 0xb79146, metalness: .78, roughness: .32 });
    this.shells = Array.from({ length: 18 }, () => { const mesh = new THREE.Mesh(this.shellGeo, this.shellMat); mesh.visible = false; this.root.add(mesh); return { mesh, life: 0, vx: 0, vy: 0, vz: 0, floor: 0, bounced: false }; });
    this.particles = new Float32Array(64 * 3); this.velocities = new Float32Array(64 * 3); this.life = new Float32Array(64);
    this.geo = new THREE.BufferGeometry(); this.geo.setAttribute('position', new THREE.BufferAttribute(this.particles, 3));
    this.mat = new THREE.PointsMaterial({ color: 0xffd7a5, size: .016, transparent: true, opacity: .7, depthWrite: false });
    this.points = new THREE.Points(this.geo, this.mat); this.points.frustumCulled = false; this.root.add(this.points);
    this.particles.fill(-10000); this.cursor = 0;
  }
  eject(origin, yaw, floor) {
    const s = this.shells[this.index++ % this.shells.length];
    s.mesh.position.set(origin.x + Math.cos(yaw) * .16, origin.y - .1, origin.z - Math.sin(yaw) * .16);
    s.mesh.rotation.set(.4, yaw, .6); s.mesh.visible = true; s.life = 2.8; s.bounced = false; s.floor = floor + .008;
    s.vx = Math.cos(yaw) * 1.5; s.vz = -Math.sin(yaw) * 1.5 + .2; s.vy = 1.7;
  }
  ejectCylinder(origin,yaw,floor) {
    for(let i=0;i<6;i++){this.eject(origin,yaw+Math.PI,floor);const s=this.shells[(this.index-1)%this.shells.length],a=i/6*Math.PI*2;s.mesh.position.copy(origin);s.vx=-Math.cos(yaw)*.45+Math.cos(a)*.30;s.vz=Math.sin(yaw)*.45+Math.sin(a)*.30;s.vy=.1+i*.07;}
  }
  impact(hit) {
    if (!hit || !Number.isFinite(hit.x)) return;
    for (let j = 0; j < 8; j++) {
      const i = this.cursor++ % 64, k = i * 3, a = j * 2.39996;
      this.particles[k] = hit.x; this.particles[k + 1] = hit.y; this.particles[k + 2] = hit.z;
      this.velocities[k] = Math.cos(a) * .65; this.velocities[k + 1] = .2 + (j % 3) * .15; this.velocities[k + 2] = Math.sin(a) * .65;
      this.life[i] = .23 + (j % 3) * .06;
    }
  }
  update(dt) {
    for (const s of this.shells) {
      if (s.life <= 0) continue; s.life -= dt; s.mesh.visible = s.life > 0;
      s.vy -= 9.8 * dt; s.mesh.position.x += s.vx * dt; s.mesh.position.y += s.vy * dt; s.mesh.position.z += s.vz * dt;
      if (s.mesh.position.y < s.floor) { s.mesh.position.y = s.floor;if(!s.bounced)this.onCaseBounce?.(s.mesh.position); s.vy = s.bounced ? 0 : Math.abs(s.vy) * .22; s.vx *= .25; s.vz *= .25; s.bounced = true; }
      if (!s.bounced) { s.mesh.rotation.x += dt * 13; s.mesh.rotation.z += dt * 8; }
    }
    let active = false;
    for (let i = 0; i < 64; i++) {
      const k = i * 3;
      if (this.life[i] <= 0) { this.particles[k + 1] = -10000; continue; }
      active = true; this.life[i] -= dt; this.velocities[k + 1] -= 2 * dt;
      for (let c = 0; c < 3; c++) this.particles[k + c] += this.velocities[k + c] * dt;
    }
    this.points.visible = active; if (active) this.geo.attributes.position.needsUpdate = true;
  }
  clear() { for (const s of this.shells) { s.life = 0; s.mesh.visible = false; } this.life.fill(0); this.particles.fill(-10000); this.points.visible = false; }
  dispose() { this.root.removeFromParent(); this.shellGeo.dispose(); this.shellMat.dispose(); this.geo.dispose(); this.mat.dispose(); }
}
