/* Copyright (c) 2026 Vendreith. First-person rig; original geometry and animation. */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { createWeaponAssets } from './assets.js';
import { WeaponAnimation } from './animation.js';
import { WEAPONS } from './weapon_data.js';

export class WeaponView {
  constructor(camera, renderer, cue) {
    this.camera = camera; this.assets = createWeaponAssets(); this.animation = new WeaponAnimation(cue);
    this.root = new THREE.Group(); this.root.name = 'FirstPersonWeapons'; this.root.visible = false; camera.add(this.root);
    this.motion = new THREE.Group(); this.root.add(this.motion);
    const { deagle, butterfly, relic, right, left, mats } = this.assets;
    this.stage = new THREE.Group(); this.motion.add(this.stage, right.root, left.root); this.stage.add(deagle.root, butterfly.root, relic.root); this.root.add(right.sleeve, left.sleeve);
    this.presentation = { motion: 1, sway: 1, offset: 'standard' }; this.materials = Object.values(mats);
    this.ads = 0; this.swayX = this.swayY = this.sprint = this.slide = this.bob = 0;
    this._q = new THREE.Quaternion(); this._from = new THREE.Quaternion(); this._e = new THREE.Euler();
    this._v = new THREE.Vector3(); this._w = new THREE.Vector3(); this._up = new THREE.Vector3(0, 1, 0);
    this._state = 'HOLSTERED'; this._handleA = this._handleB = 0;
    this._stageQ = new THREE.Quaternion(); this._stageFrom = new THREE.Quaternion(); this._spinAxis = new THREE.Vector3(0,0,1); this._spinPivot = new THREE.Vector3(0,-.035,-.053);
    this._dir = new THREE.Vector3(); this._pole = new THREE.Vector3(); this._elbow = new THREE.Vector3(); this._segment = new THREE.Vector3(); this.cylinderAngle = 0;
    if (renderer) {
      const pmrem = new THREE.PMREMGenerator(renderer), room = new RoomEnvironment();
      this.env = pmrem.fromScene(room, .04); room.dispose(); pmrem.dispose();
      for (const m of Object.values(mats)) m.envMap = this.env.texture;
    }
    this.flashMaterial = new THREE.MeshBasicMaterial({ color: 0xffd39a, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false, side: THREE.DoubleSide, toneMapped: false, fog: false });
    this.flashGeo = new THREE.ConeGeometry(.025, .11, 5, 1, true); this.flashGeo.rotateX(-Math.PI / 2);
    this.flash = new THREE.Mesh(this.flashGeo, this.flashMaterial); this.flash.position.set(0, .028, -.286); this.flash.renderOrder = 950;
    deagle.root.add(this.flash);
    this.relicFlash = this.flash.clone(); this.relicFlash.position.set(0,.040,-.324); relic.root.add(this.relicFlash);
    this.light = new THREE.PointLight(0xffba71, 0, 3, 2); camera.add(this.light);
    this.flashT = 0; this.costMs = 0;
  }
  fire() { if (WEAPONS[this.animation.weapon]?.capacity) this.flashT = this.animation.weapon === 'relic' ? .065 : .055; }
  solveArm(hand) {
    hand.wrist.getWorldPosition(this._v); this.root.worldToLocal(this._v);
    this._w.set(hand.side * .29,-.37,.14); this._dir.copy(this._v).sub(this._w);
    const upper=.32,fore=.31,d=Math.max(.01,Math.min(upper+fore-.002,this._dir.length()));this._dir.normalize();
    const along=(upper*upper-fore*fore+d*d)/(2*d),height=Math.sqrt(Math.max(0,upper*upper-along*along));
    this._pole.set(hand.side*.9,-.65,.2);this._pole.addScaledVector(this._dir,-this._pole.dot(this._dir)).normalize();
    this._elbow.copy(this._w).addScaledVector(this._dir,along).addScaledVector(this._pole,height);
    for (const [mesh,from,to] of [[hand.upperSleeve,this._w,this._elbow],[hand.foreSleeve,this._elbow,this._v]]) {
      this._segment.copy(to).sub(from);const length=this._segment.length();mesh.position.copy(from).add(to).multiplyScalar(.5);mesh.quaternion.setFromUnitVectors(this._up,this._segment.normalize());mesh.scale.set(1,length,1);
    }
  }
  update(dt, p) {
    const start = performance.now();
    const a = this.animation; a.aimed = !!p.aim;
    const pose = a.update(dt, p.speed > .2), knife = a.weapon === 'butterfly', isRelic = a.weapon === 'relic', definition = WEAPONS[a.weapon];
    const targetAds = p.aim && definition?.capacity && ['IDLE', 'MOVING', 'AIMING', 'RECOVERING', 'ATTACKING','FIRING','RECOIL'].includes(a.state) ? 1 : 0;
    this.ads += (targetAds - this.ads) * (1 - Math.exp(-18 * dt));
    const tactical = p.profile?.key === 'tactical';
    this.sprint += ((p.sprint && !tactical && !targetAds ? 1 : 0) - this.sprint) * (1 - Math.exp(-9 * dt));
    this.slide += ((p.sliding ? 1 : 0) - this.slide) * (1 - Math.exp(-14 * dt));
    const inspecting = a.state === 'INSPECTING' || a.state === 'FLEX_LOOP';
    const scale = 1.42; this.motion.scale.setScalar(scale);
    const motion = (p.reduced ? 0 : this.presentation.motion) * (tactical ? .26 : 1), idle = inspecting ? .15 : 1;
    const sway = (1 - this.ads) * idle * motion;
    this.swayX += (Math.max(-.025, Math.min(.025, -(p.turnX||0) * .004 * this.presentation.sway)) - this.swayX) * (1 - Math.exp(-10 * dt));
    this.swayY += (Math.max(-.02, Math.min(.02, (p.turnY||0) * .003 * this.presentation.sway)) - this.swayY) * (1 - Math.exp(-10 * dt));
    this.bob += p.speed * dt * 2.6;
    const movement = Math.min(1, p.speed / 6) * motion * (1 - this.ads * .96) * idle;
    const offset = this.presentation.offset === 'wide' ? .026 : this.presentation.offset === 'close' ? -.018 : 0;
    const hipX = (knife ? .17 : isRelic ? .16 : .18) + offset, hipY = knife ? -.17 : isRelic ? -.175 : -.16;
    this.motion.position.set(
      hipX * (1 - this.ads) + pose.x + this.swayX * sway + Math.sin(this.bob) * .006 * movement,
      hipY * (1 - this.ads) - (definition?.sightY||.062) * scale * this.ads + pose.y + this.swayY * sway + (p.breath || 0) * .0015 * sway + Math.cos(this.bob * 2) * .004 * movement - this.slide * .035 - this.sprint * .022,
      -.38 - offset * (1-this.ads) + .045 * this.ads + pose.z + this.sprint * .025
    );
    const rx = pose.rx - this.sprint * .25 - this.slide * .09;
    const ry = pose.ry + (knife ? -.12 : 0) * (1 - this.ads) - this.swayX * sway;
    const rz = pose.rz + (knife ? -.18 : -.035) * (1 - this.ads) + this.sprint * .13;
    if (a.state !== this._state) {
      this._from.copy(this.motion.quaternion); this._handleA = this.assets.butterfly.a.rotation.z; this._handleB = this.assets.butterfly.b.rotation.z; this._state = a.state;
      this._stageFrom.copy(this.stage.quaternion);
    }
    this._q.setFromEuler(this._e.set(rx, ry, rz, 'XYZ'));
    this.motion.quaternion.copy(this._from).slerp(this._q, a.blend);
    const { deagle, butterfly, relic, right, left } = this.assets;
    deagle.root.visible = a.weapon === 'deagle'; butterfly.root.visible = knife; relic.root.visible = isRelic;
    this._stageQ.setFromAxisAngle(this._spinAxis,pose.spin);this.stage.quaternion.copy(this._stageFrom).slerp(this._stageQ,a.blend);
    this._v.copy(this._spinPivot).applyQuaternion(this.stage.quaternion);this.stage.position.copy(this._spinPivot).sub(this._v);
    this.root.visible = p.visible && a.weapon !== 'none';
    deagle.slide.position.z = Math.max(pose.slide, p.empty && (a.state !== 'RELOADING' || a.age < 1.8) ? .024 : 0);
    deagle.mag.position.set(-pose.mag * .035, -pose.mag * .19, pose.mag * .065);
    deagle.mag.rotation.z = pose.mag * -.18;
    deagle.mag.visible = !(a.state === 'RELOADING' && a.age > .94 && a.age < 1.13);
    const cylinderTarget = (p.cylinderIndex || 0) * Math.PI / 3;
    const cylinderDelta = Math.atan2(Math.sin(cylinderTarget-this.cylinderAngle),Math.cos(cylinderTarget-this.cylinderAngle));
    this.cylinderAngle += cylinderDelta*(1-Math.exp(-25*dt));
    relic.crane.rotation.z=pose.cylinderOpen*1.22;relic.cylinder.rotation.z=this.cylinderAngle+pose.cylinderSpin;relic.hammer.rotation.x=-pose.hammer*.55;
    relic.extractor.position.z=pose.eject*.022;
    const reload = isRelic && a.state === 'RELOADING', reloadU = reload ? a.age/a.reloadDuration : 0, visibleLoaded=pose.visualLoaded>.5;
    const cc=Math.cos(relic.crane.rotation.z),ss=Math.sin(relic.crane.rotation.z),cx=relic.crane.position.x+cc*.023-ss*.034,cy=relic.crane.position.y+ss*.023+cc*.034,cz=-.038;
    relic.loader.position.set(cx-.018*(1-pose.loader),cy-.010*(1-pose.loader),cz+.017+(1-pose.loader)*.15);
    relic.loader.rotation.z=relic.crane.rotation.z+this.cylinderAngle;relic.loader.visible=reload&&reloadU>.43&&reloadU<.79;
    const spent=6-(p.mag??6),index=p.cylinderIndex||0;
    for(let i=0;i<6;i++){
      const round=relic.rounds[i],isSpent=((index-i+6)%6||6)<=spent;
      round.root.position.z=reload&&!visibleLoaded?pose.eject*.085:0;round.root.visible=!reload||reloadU<.42||visibleLoaded;
      round.primer.material=isSpent&&!visibleLoaded?this.assets.mats.dark:this.assets.mats.edge;round.tip.visible=visibleLoaded||!isSpent;
    }
    const blendAngle = (old, angle) => old + Math.atan2(Math.sin(angle - old), Math.cos(angle - old)) * a.blend;
    butterfly.a.rotation.z = a.blend < 1 ? blendAngle(this._handleA, pose.handleA) : pose.handleA;
    butterfly.b.rotation.z = a.blend < 1 ? blendAngle(this._handleB, pose.handleB) : pose.handleB;
    right.root.position.set(knife ? .038 : .037, knife ? -.068 : -.073, knife ? .019 : .018);
    right.root.rotation.set(0, 0, inspecting ? -.18 * Math.sin(Math.PI * Math.min(1, a.age / 1.32)) : 0);
    if(isRelic){right.root.position.z+=.007-pose.spinContact*.066;right.root.position.y+=pose.spinContact*.011;right.root.rotation.z=0;}
    if (knife) {
      const angle = butterfly.a.rotation.z, c = Math.cos(angle), s = Math.sin(angle);
      right.root.position.set(butterfly.a.position.x + .050 * c + .068 * s, .050 * s - .068 * c, .019);
      right.root.rotation.z += angle;
    }
    left.root.visible = !knife;
    left.sleeve.visible = !knife;
    left.root.position.set(-.038 - pose.left * .01 - pose.mag * .035, -.077 - pose.mag * .19, -.004 + pose.mag * .065);
    left.root.rotation.set(0, 0, pose.mag * -.18);
    if(isRelic){
      const reach=Math.max(pose.cylinderOpen,pose.left*.5);
      left.root.position.set(-.038+(cx-.030+.038)*reach,-.077+(cy-.012+.077)*reach,-.004+(cz+.065+.004)*reach);
      if(reload){const ramp=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);},reachLoader=ramp((reloadU-.35)/.12)*ramp((.84-reloadU)/.10);left.root.position.lerp(this._v.set(relic.loader.position.x-.032,relic.loader.position.y-.01,relic.loader.position.z+.038),reachLoader);}
      left.root.rotation.z=pose.cylinderOpen*.22;
    }
    if (!isRelic && a.state === 'RELOADING' && a.age > 1.72) {
      const reach = Math.sin(Math.PI * Math.min(1, (a.age - 1.72) / .48));
      left.root.position.y += reach * .097; left.root.position.z += reach * .027;
    }
    const relax = pose.grip;
    for (const hand of [right, left]) {
      for (let i = 0; i < hand.fingers.length; i++) {
        const finger = hand.fingers[i];
        for (let j = 0; j < finger.length; j++) {
          const trigger = !knife && hand === right && i === 3;
          const fingerGrip = isRelic && hand===right && i===3 && pose.spinContact>.05 ? .06 : (i === 4 ? -.65 : trigger ? .18 : .55 + j * .23) * relax;
          finger[j].rotation.y = hand.side * fingerGrip;
          finger[j].rotation.z = i === 4 ? -.6 : 0;
          if (trigger && ['ATTACKING','FIRING'].includes(a.state)) finger[j].rotation.y += .2 * Math.exp(-a.age * 20);
        }
      }
    }
    this.root.updateMatrixWorld(true);
    this.solveArm(right);this.solveArm(left);
    const envIntensity = .12 + .7 * Math.min(1, p.light ?? .7);
    for (const mat of this.materials) mat.envMapIntensity = envIntensity;
    this.dryT=Math.max(0,(this.dryT||0)-dt);if(isRelic)relic.hammer.rotation.x-=Math.sin(this.dryT/.12*Math.PI)*.20;
    this.flashT = Math.max(0, this.flashT - dt);
    this.flash.visible = this.flashT > 0 && !isRelic;this.relicFlash.visible=this.flashT>0&&isRelic; this.flashMaterial.opacity = Math.min(1, this.flashT * 25);
    this.flash.rotation.z += dt * 33; this.light.intensity = this.flashT > 0 ? 1.3 : 0;
    this.relicFlash.rotation.z+=dt*21;
    if(this.flashT>0){const muzzle=isRelic?relic.muzzle:deagle.muzzle;muzzle.getWorldPosition(this._v);this.camera.worldToLocal(this._v);this.light.position.copy(this._v);}
    this.costMs = performance.now() - start;
  }
  sights() {
    this.root.updateMatrixWorld(true);
    const weapon=this.animation.weapon==='relic'?this.assets.relic:this.assets.deagle;
    return ['rearSight', 'frontSight'].map(key => { const v = weapon[key].getWorldPosition(new THREE.Vector3()).project(this.camera); return { x: v.x, y: v.y }; });
  }
  dispose() { this.root.removeFromParent();this.light.removeFromParent(); this.assets.dispose(); this.env?.dispose(); this.flashMaterial.dispose(); this.flashGeo.dispose(); }
}
