/*! Copyright (c) 2026 Vendreith. Licensing: see LICENSE.md and THIRD_PARTY_NOTICES.md. */
import {THREE} from '../engine.js';
// Meter the existing HDR scene capture, not the post-processed display. A tiny
// async readback feeds a trimmed log-luminance metric at4Hz; no full-size CPU copy.
export function createPoolExposure(disposables){
 const target=new THREE.WebGLRenderTarget(24,16,{type:THREE.UnsignedByteType,depthBuffer:false});
 const uniforms={uHDR:{value:null}},mat=new THREE.ShaderMaterial({uniforms,depthTest:false,depthWrite:false,vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.0,1.0);}',fragmentShader:'uniform sampler2D uHDR;varying vec2 vUv;void main(){vec3 c=texture2D(uHDR,vUv).rgb;float l=max(.0001,dot(c,vec3(.2126,.7152,.0722)));gl_FragColor=vec4(clamp((log2(l)+12.0)/20.0,0.0,1.0),0.0,0.0,1.0);}',toneMapped:false});
 const geo=new THREE.PlaneGeometry(2,2),quad=new THREE.Mesh(geo,mat),scene=new THREE.Scene(),cam=new THREE.Camera();scene.add(quad);
  let disposed=false,pending=false,last=-100,adapted=1,targetExposure=1,fallback=null,externalManaged=false;
  const stats={autoExposure:true,samples:0,logLuminance:0,target:1,adapted:1,readbackMs:0,externalManaged:false};
  disposables.push(target,geo,mat,{dispose(){disposed=true;}});
  return {stats,enabled:true,setExternalManaged(flag){externalManaged=!!flag;stats.externalManaged=externalManaged;},update(renderer,texture,elapsed,dt=1/60,brightness=1,sourceScene,sourceCamera){
  if(!this.enabled||externalManaged)return;
  if(!pending&&elapsed-last>(texture?.isTexture ? .25 : .5)&&(texture||sourceScene&&sourceCamera)){last=elapsed;pending=true;
   if(!texture){if(!fallback){fallback=new THREE.WebGLRenderTarget(48,32,{type:THREE.HalfFloatType});disposables.push(fallback);}const previous=renderer.getRenderTarget();renderer.setRenderTarget(fallback);renderer.render(sourceScene,sourceCamera);renderer.setRenderTarget(previous);texture=fallback.texture;stats.fallbackTarget=true;}
   uniforms.uHDR.value=texture;
   const old=renderer.getRenderTarget(),begin=performance.now();renderer.setRenderTarget(target);renderer.render(scene,cam);renderer.setRenderTarget(old);
   const buffer=new Uint8Array(24*16*4);
   renderer.readRenderTargetPixelsAsync(target,0,0,24,16,buffer).then(()=>{
    if(disposed)return;const values=[];for(let i=0;i<buffer.length;i+=4)values.push(buffer[i]/255*20-12);values.sort((a,b)=>a-b);
    // Trim2% from each tail. A tiny sun disk/specular cannot control exposure.
    const trim=Math.floor(values.length*.02),mid=values.slice(trim,-trim),mean=mid.reduce((a,b)=>a+b,0)/mid.length;
    const bright=values[Math.floor(values.length*.88)],metered=mean*.65+bright*.35;
    const luminance=2**metered;targetExposure=THREE.MathUtils.clamp(.27/Math.max(.015,luminance),.38,1.25);
    stats.samples++;stats.logLuminance=mean;stats.brightLogLuminance=bright;stats.range=[values[0],values.at(-1)];stats.target=targetExposure;stats.readbackMs=performance.now()-begin;
   }).catch(()=>{}).finally(()=>{pending=false;});
  }
  const tau=targetExposure<adapted ? .48 : 1.75;adapted+=(targetExposure-adapted)*(1-Math.exp(-Math.min(.1,Math.max(0,dt))/tau));
  stats.adapted=adapted;renderer.toneMappingExposure=adapted*THREE.MathUtils.clamp(brightness,.35,2.5);
 }};
}
