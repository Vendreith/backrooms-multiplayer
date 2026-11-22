/* Copyright (c) 2026 Vendreith. Weapons integrate with the existing host/action protocol. */
import * as THREE from 'three';
import { WeaponView } from './viewmodel.js';
import { WeaponEffects } from './effects.js';
import { WeaponSound } from './sound.js';
import { WEAPONS, makeLoadout, weaponAmmo } from './weapon_data.js';
import './weapons.css';

export class WeaponSystem {
  constructor({ camera, renderer, scene, audio, send, context, hud }) {
    Object.assign(this, { camera, send, context }); this.sound = new WeaponSound(audio);
    this.cues = []; this.view = new WeaponView(camera, renderer, key => this.cues.push(key)); this.effects = new WeaponEffects(scene);
    this.effects.onCaseBounce = pos => this.sound.play('case_drop',pos,.22);
    this.authority = makeLoadout(); this.seq = 0; this.pendingShots = new Map(); this.pendingEquip = null; this.pendingReload = 0; this.aim = false; this.lastFire = this.lastDryFire = -100;
    this.options = {inspectKey:'KeyT',loop:true,motion:1,sway:1,offset:'standard'};
    this._position = new THREE.Vector3(); this.remote = new Map(); this.remoteMaterials = new Map();
    this.bar = document.createElement('div'); this.bar.id = 'weaponBar'; this.bar.hidden = true;
    this.bar.innerHTML = '<div class="weapon-slots"><button data-weapon="relic" title="2 · Meridian-6"><kbd>2</kbd> MERIDIAN-6</button><button data-weapon="butterfly" title="3 · Butterfly Knife"><kbd>3</kbd> BUTTERFLY</button><button data-weapon="deagle" title="6 · Desert Eagle"><kbd>6</kbd> DEAGLE</button><button data-weapon="none" title="8 · Holster"><kbd>8</kbd> EQUIP</button></div><div class="weapon-status"><span data-weapon-profile></span><span data-weapon-name></span><b data-weapon-ammo></b><span data-weapon-state></span></div><div class="weapon-help">T hold: flex · R: reload · Right-click: aim · F: flashlight</div><div class="weapon-touch"><button data-wact="fire">SHOOT / STRIKE</button><button data-wact="aim">AIM</button><button data-wact="inspect">XOAY</button><button data-wact="reload">BULLET</button></div>';
    hud.append(this.bar);
    this.nameNode = this.bar.querySelector('[data-weapon-name]'); this.ammoNode = this.bar.querySelector('[data-weapon-ammo]'); this.stateNode = this.bar.querySelector('[data-weapon-state]');
    this.buttons = [...this.bar.querySelectorAll('[data-weapon]')];
    this._down = e => {
      const b = e.target.closest('button'); if (!b) return; e.preventDefault(); e.stopPropagation();
      audio.ensureContext();
      if (b.dataset.weapon) this.equip(b.dataset.weapon);
      if (b.dataset.wact === 'fire') this.primary();
      if (b.dataset.wact === 'reload') this.reload();
      if (b.dataset.wact === 'aim') this.aim = true;
      if (b.dataset.wact === 'inspect') this.inspect(true);
      b.setPointerCapture?.(e.pointerId);
    };
    this._up = e => { const key = e.target.closest('button')?.dataset.wact; if (key === 'aim') this.aim = false; if (key === 'inspect') this.inspect(false); };
    this.bar.addEventListener('pointerdown', this._down); this.bar.addEventListener('pointerup', this._up); this.bar.addEventListener('pointercancel', this._up);
  }
  available() { const c = this.context(); return c.active && c.player?.role === 's' && c.player.state === 'ok' && !c.player.carrying; }
  get equipped() { return this.view.animation.pending ?? this.view.animation.weapon; }
  get ads() { return this.view.ads; }
  configure(options) {
    if(options.inspectKey!==this.options.inspectKey)this.clearInput();
    this.options={...this.options,...options};this.view.presentation=this.options;this.view.animation.allowLoop=!!this.options.loop;
    this.bar.querySelector('.weapon-help').textContent=`${this.options.inspectKey.slice(3)} hold: ${this.options.loop?'flex':'one turn'} · R: reload · Right-click: aim · F: flashlight`;
  }
  inspect(down) { if(!down||this.available())this.view.animation.inspect(down); }
  pendingCount(weapon) { let count=0;for(const w of this.pendingShots.values())if(w===weapon)count++;return count; }
  warmup(renderer,scene) {
    const root=this.view.root,visible=root.visible,roots=['deagle','relic','butterfly'].map(k=>this.view.assets[k].root),states=roots.map(r=>r.visible);
    root.visible=true;roots.forEach(r=>r.visible=true);renderer.compile(scene,this.camera);root.visible=visible;roots.forEach((r,i)=>r.visible=states[i]);
    this.sound.prewarm();
  }
  sync(w) {
    if (!w || w.revision < this.authority.revision || w.sequence < this.authority.sequence) return;
    this.authority = { ...this.authority, ...w }; this.seq = Math.max(this.seq, w.sequence || 0);
    for (const seq of this.pendingShots.keys()) if (seq <= w.sequence) this.pendingShots.delete(seq);
    if (this.pendingEquip && w.sequence >= this.pendingEquip.seq) this.pendingEquip = null;
    if (!this.pendingEquip && this.equipped !== w.equipped) this.view.animation.equip(w.equipped);
    if (this.pendingReload && w.sequence >= this.pendingReload) { this.pendingReload=0; if(!w.reloadEnd&&this.view.animation.state==='RELOADING')this.view.animation.transition('RECOVERING'); }
  }
  equip(weapon) {
    if (!this.available() || !Object.hasOwn(WEAPONS, weapon) || this.equipped === weapon) return;
    this.aim = false; this.view.animation.equip(weapon);
    this.pendingEquip = { seq: ++this.seq, weapon };
    this.send({ act: 'weaponEquip', weapon, seq: this.seq });
  }
  primary() {
    if (!this.available()) return false;
    const a = this.view.animation, def = WEAPONS[a.weapon], now = performance.now() / 1000;
    if (!def || a.weapon === 'none' || now - this.lastFire < def.interval) return false;
    const ammo=weaponAmmo(this.authority,a.weapon);
    if (def.capacity && ammo.mag - this.pendingCount(a.weapon) <= 0) { if(now-this.lastDryFire>.18){this.sound.play(a.weapon==='relic'?'relic_empty':'empty');this.view.dryT=.12;this.lastDryFire=now;}return false; }
    if(this.authority.reloadEnd)return false;
    if (!a.attack()) return false;
    this.lastFire = now; const seq = ++this.seq; this.pendingShots.set(seq,a.weapon);
    this.view.fire(); this.sound.play(def.shotSound||'slash');
    const c = this.context(), p = c.player;
    if (a.weapon === 'deagle') this.effects.eject({ x: p.x, y: p.y + (p.crouch ? .92 : 1.62), z: p.z }, p.yaw, c.floorY);
    this.send({ act: 'weaponFire', seq, yaw: p.yaw, pitch: p.pitch }); return true;
  }
  reload() {
    const weapon=this.view.animation.weapon,def=WEAPONS[weapon],ammo=weaponAmmo(this.authority,weapon);
    if (!this.available() || !def?.capacity || ammo.mag >= def.capacity || ammo.reserve <= 0 || !this.view.animation.reload(ammo.mag===0)) return false;
    this.aim = false;this.pendingReload=++this.seq; this.send({ act: 'weaponReload', seq: this.seq }); return true;
  }
  event(ev, myId) {
    if (ev.ev !== 'weapon') return;
    if (ev.id === myId) {
      const predicted = this.pendingShots.has(ev.seq); this.sync(ev.weapon);
      if (ev.kind === 'reload' && this.view.animation.state !== 'RELOADING') this.view.animation.reload(!!ev.weapon.reloadEmpty);
      if(ev.kind==='loaded'&&this.view.animation.state==='RELOADING')this.view.animation.transition('RECOVERING');
      if (ev.kind === 'fire' && !predicted) { this.view.animation.attack(); this.view.fire(); }
    }
    if (ev.kind === 'fire') {
      if (ev.levelId !== this.context().player?.levelId) return;
      this.effects.impact(ev.hit);
      if (ev.id !== myId) { this.sound.play(WEAPONS[ev.weapon.equipped]?.shotSound||'slash', ev.origin); const remote = this.remote.get(ev.id); if (remote) remote.fireT = .16; }
    }
  }
  clearInput() { this.aim = false; this.view.animation.clearInput(); }
  removeRemote(id) { const r = this.remote.get(id); if (r) { r.root.removeFromParent(); this.remote.delete(id); } }
  reset() {
    this.clearInput(); this.authority = makeLoadout(); this.seq = 0; this.pendingShots.clear(); this.pendingEquip = null;this.pendingReload=0;this.cues.length=0;
    this.view.animation.weapon = 'none'; this.view.animation.pending = null; this.view.animation.transition('HOLSTERED');
    this.view.root.visible = false; this.bar.hidden = true; this.effects.clear(); this.sound.stop();
    for (const r of this.remote.values()) r.root.removeFromParent(); this.remote.clear();
  }
  update(dt, p) {
    if (p.player?.weapon) this.sync(p.player.weapon);
    const ammo=weaponAmmo(this.authority,this.view.animation.weapon);
    this.view.update(dt, { ...p, profile:p.profile||p.player?.movement, aim: this.aim, empty: ammo.mag <= 0,mag:ammo.mag,cylinderIndex:this.authority.cylinderIndex });
    for(const key of this.cues){
      this.sound.play(key,null,['cloth','relic_touch','relic_twirl','relic_spin'].includes(key)?.32:.75);
      if(key==='relic_eject'&&p.player){this.view.assets.relic.cylinder.getWorldPosition(this._position);this.effects.ejectCylinder(this._position,p.player.yaw,this.context().floorY);}
    }this.cues.length=0;this.effects.update(dt);
    this.bar.hidden = !p.visible || p.player?.role !== 's'; this.bar.classList.toggle('touch', !!p.touch); this.bar.classList.toggle('minimal', !!p.clean);
    const selectedAmmo=weaponAmmo(this.authority,this.equipped),name = WEAPONS[this.equipped]?.name || '', count = WEAPONS[this.equipped]?.capacity ? `${Math.max(0, selectedAmmo.mag - this.pendingCount(this.equipped))} / ${selectedAmmo.reserve}` : this.equipped === 'butterfly' ? '∞' : '';
    if (this.nameNode.textContent !== name) this.nameNode.textContent = name;
    if (this.ammoNode.textContent !== count) this.ammoNode.textContent = count;
    const state = this.view.animation.state === 'RELOADING' ? 'RELOADING' : this.ads > .9 ? 'ADS' : '';
    if (this.stateNode.textContent !== state) this.stateNode.textContent = state;
    const profileLabel=p.player?.movement?.key==='tactical'?'TACTICAL · SHIFT MOVE SLOWER':'';const label=this.bar.querySelector('[data-weapon-profile]');if(label.textContent!==profileLabel)label.textContent=profileLabel;
    for (const b of this.buttons) b.classList.toggle('selected', b.dataset.weapon === this.equipped);
  }
  updateRemote(id, av, p, dt) {
    const weapon = p.weapon?.equipped || 'none'; let r = this.remote.get(id);
    if (r && (r.avatar !== av || r.weapon !== weapon)) { r.root.removeFromParent(); this.remote.delete(id); r = null; }
    if (weapon === 'none' || !av.group.visible) { if (r) r.root.visible = false; return; }
    if (!r) {
      const model = this.view.assets[weapon]?.root.clone(true);if(!model)return;
      model.traverse(o => {
        if (o.isLight || o.name === 'Muzzle') o.visible = false;
        if(o.name.startsWith('RelicCartridge')){o.visible=true;o.position.z=0;}
        if (!o.isMesh) return;
        let mat = this.remoteMaterials.get(o.material);
        if (!mat) { mat = o.material.clone(); mat.depthTest = true; mat.depthWrite = true; mat.fog = true; mat.onBeforeCompile = () => {}; mat.customProgramCacheKey = () => 'fps-remote-world'; this.remoteMaterials.set(o.material, mat); }
        o.material = mat; o.renderOrder = 0; o.frustumCulled = true;
      });
      const flash = model.children.find(o => o.isMesh && o.material.isMeshBasicMaterial); if (flash) flash.visible = false;
      const root = new THREE.Group(); root.add(model);
      let hand = null; av.model?.traverse(o => { if (o.isBone && /right.?hand$/i.test(o.name)) hand = o; });
      if (hand) {
        hand.add(root); hand.getWorldScale(this._position); root.scale.setScalar(1 / Math.max(.001, this._position.x));
        root.position.set(0, 0, 0); root.rotation.set(-Math.PI / 2, 0, Math.PI);
      } else { av.group.add(root); root.position.set(.23, 1.08, -.20); }
      r = { root, model, avatar: av, weapon, hand, fireT: 0,reload:0,crane:model.getObjectByName('CylinderCrane'),cylinder:model.getObjectByName('SixChamberCylinder'),slide:model.getObjectByName('Slide'),mag:model.getObjectByName('Magazine'),handleA:model.getObjectByName('SafeHandleHinge'),handleB:model.getObjectByName('FreeHandleHinge'),loader:model.getObjectByName('SixRoundLoader') }; this.remote.set(id, r);
    }
    r.root.visible = true; r.fireT = Math.max(0, r.fireT - dt);
    const def=WEAPONS[weapon],duration=p.weapon?.reloadEmpty?def.reloadEmpty:def.reload;
    const progress=p.weapon?.reloadEnd?Math.min(1,Math.max(0,1-(p.weapon.reloadRemaining??duration)/duration)):0;r.reload+=(progress-r.reload)*(1-Math.exp(-16*dt));
    if(r.crane)r.crane.rotation.z=p.weapon?.reloadEnd?Math.sin(Math.PI*r.reload)*1.22:0;
    if(r.cylinder)r.cylinder.rotation.z=(p.weapon?.cylinderIndex||0)*Math.PI/3;
    if(r.loader)r.loader.visible=false;
    if(r.slide)r.slide.position.z=r.fireT>0?.022:0;
    if(r.mag){r.mag.position.set(0,p.weapon?.reloadEnd?-Math.sin(Math.PI*r.reload)*.16:0,0);r.mag.rotation.z=0;}
    if(r.handleA)r.handleA.rotation.z=0;if(r.handleB)r.handleB.rotation.z=0;
    if (!r.hand) { r.root.position.y = p.crouch ? .70 : 1.08; r.root.rotation.x = -p.pitch + (r.fireT > 0 ? -.12 : 0); }
    // Existing avatar animator sets the base pose first, then a bounded additive slide posture.
    if (p.sliding) { if (av.model) av.model.rotation.x -= .16; if (av.body) av.body.rotation.x -= .16; }
  }
  dispose() {
    this.reset(); this.view.dispose(); this.effects.dispose(); this.sound.dispose(); for (const m of this.remoteMaterials.values()) m.dispose();
    this.bar.removeEventListener('pointerdown', this._down); this.bar.removeEventListener('pointerup', this._up); this.bar.removeEventListener('pointercancel', this._up); this.bar.remove();
  }
}
