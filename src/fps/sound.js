/* Copyright (c) 2026 Vendreith. Original deterministic synthesized sound effects. */
export class WeaponSound {
  constructor(audio) { this.audio = audio; this.buffers = new Map(); this.voices = new Set(); this.serial = 0; }
  buffer(ctx, key) {
    if (this.buffers.has(key)) return this.buffers.get(key);
    const relic=key.startsWith('relic_'),shot = key === 'shot'||key==='relic_shot', slide = key.startsWith('slide_'), slash = key === 'slash';
    const duration = shot ? relic?.95:.72 : slide ? .8 : slash ? .18 : key==='cloth'?.24:key==='relic_spin'?.38:key==='case_drop'?.25:relic?.19:.13;
    const b = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * duration), ctx.sampleRate), data = b.getChannelData(0);
    let seed = [...key].reduce((v, c) => (v * 31 + c.charCodeAt(0)) >>> 0, 1049), low = 0;
    for (let i = 0; i < data.length; i++) {
      const t = i / ctx.sampleRate; seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5;
      const noise = ((seed >>> 0) / 4294967296) * 2 - 1; low += (noise - low) * .13;
      if (shot) {
        const blast = noise * Math.exp(-t * (relic?52:45)) + .7 * Math.sin((relic?1260:1700) * t * Math.exp(-t * (relic?7.8:9))) * Math.exp(-t * 19);
        const tail = low * (relic?.44:.35) * Math.exp(-t * (relic?5.3:6)) * (1 - Math.exp(-t * 35));
        data[i] = Math.tanh((blast + tail) * 1.8) * .7;
      } else if(key==='cloth'||key==='relic_twirl'){
        data[i]=(low*.75+(noise-low)*.05)*Math.sin(Math.PI*t/duration)**2*.25;
      } else if(key==='relic_spin'){
        const clock=t*27,click=Math.exp(-(clock%1)*22),fade=Math.sin(Math.PI*t/duration)**.5;
        data[i]=(noise*.22+Math.sin(t*4200)*.17)*click*fade;
      } else if(key==='case_drop'){
        data[i]=(Math.sin(t*6510)*.25+Math.sin(t*9430)*.14+noise*.08)*Math.exp(-t*34);
      } else if(relic){
        const frequency=key==='relic_close'?940:key==='relic_loader'?1300:key==='relic_empty'?2500:1900;
        const attack=Math.min(1,t/.0015),second=t>.024?Math.exp(-(t-.024)*100)*.3:0;
        data[i]=(noise*.25+Math.sin(t*frequency)*.33+Math.sin(t*frequency*1.63)*.13)*(Math.exp(-t*55)+second)*attack*.65;
      } else if (slide) {
        const wet = key.includes('water'), tile = key.includes('tile');
        data[i] = (wet ? low * 1.2 : tile ? noise * .27 + low * .4 : low * .65) * Math.sin(Math.PI * t / duration) ** .4 * .3;
      } else if (slash) data[i] = (noise - low) * Math.sin(Math.PI * t / duration) ** 2 * .32;
      else {
        const frequency = key === 'flip' ? 2800 : key === 'magout' ? 1250 : key === 'magin' ? 740 : 1800;
        data[i] = (noise * .45 + Math.sin(t * frequency) * .5 + Math.sin(t * frequency * 1.42) * .18) * Math.exp(-t * 50) * .4;
      }
    }
    this.buffers.set(key, b); return b;
  }
  play(key, position = null, gain = 1) {
    const ctx = this.audio.ctx; if (!ctx || ctx.state !== 'running' || this.voices.size > 28) return;
    const source = ctx.createBufferSource(), volume = ctx.createGain();
    source.buffer = this.buffer(ctx, key); source.playbackRate.value = 1 + ((this.serial++ % 5) - 2) * .012;
    volume.gain.value = gain * (key === 'shot'||key==='relic_shot' ? .7 : .45);
    const pan = position ? ctx.createPanner() : null;
    source.connect(volume);
    if (pan) {
      pan.panningModel = 'HRTF'; pan.distanceModel = 'inverse'; pan.refDistance = 2; pan.maxDistance = 90; pan.rolloffFactor = 1.15;
      pan.positionX.value = position.x; pan.positionY.value = position.y; pan.positionZ.value = position.z;
      volume.connect(pan); pan.connect(this.audio.sfxGain);
    } else volume.connect(this.audio.sfxGain);
    this.voices.add(source);
    source.onended = () => { source.disconnect(); volume.disconnect(); pan?.disconnect(); this.voices.delete(source); };
    source.start();
  }
  stop() { for (const v of this.voices) { try { v.stop(); } catch {} } this.voices.clear(); }
  prewarm() { const ctx=this.audio.ctx;if(!ctx)return;for(const key of ['shot','relic_shot','relic_empty','relic_draw','relic_cock','relic_open','relic_eject','relic_loader','relic_seat','relic_close','relic_touch','relic_twirl','relic_catch','relic_spin','cloth','case_drop','flip','catch','slash'])this.buffer(ctx,key); }
  dispose() { this.stop(); this.buffers.clear(); }
}
