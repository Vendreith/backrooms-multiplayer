/*! Copyright (c) 2026 Vendreith. Licensing: see LICENSE.md and THIRD_PARTY_NOTICES.md. */
import { THREE } from '../engine.js';
import { Reflector } from 'three/examples/jsm/objects/Reflector.js';

export const POOL_WATER_VERTEX = `
attribute float aBedDepth;
attribute float aZoneTemp;
uniform float uTime;
uniform vec3 uPlayerPos;
uniform vec3 uEntityPos;
varying vec3 vWorldPos;
varying float vBedDepth;
varying float vViewZ;
void main(){
 vec4 world=modelMatrix*vec4(position,1.0);
 float d=distance(world.xz,uPlayerPos.xz);
 float ripple=sin(d*5.0-uTime*4.2)*exp(-d*.7)*.007;
 world.y+=sin(world.x*.58+uTime*.7)*cos(world.z*.44-uTime*.62)*.005+ripple;
 vWorldPos=world.xyz;vBedDepth=aBedDepth;vViewZ=(viewMatrix*world).z;
 gl_Position=projectionMatrix*viewMatrix*world;
}`;

export const POOL_WATER_FRAGMENT = `
uniform float uTime;
uniform vec3 uFogColor;
uniform float uFogDensity;
uniform sampler2D uSceneColor;
uniform sampler2D uSceneDepth;
uniform sampler2D uReflection;
uniform mat4 uReflectionMatrix;
uniform vec2 uResolution;
uniform float uCameraNear;
uniform float uCameraFar;
uniform float uHasProbe;
uniform float uProbeY;
uniform float uAboveWater;
uniform mat4 uRefractionMatrix;
uniform mat4 uRefractionView;
uniform vec3 uKeyColor;
uniform vec3 uKeyPosition;
uniform vec3 uSunDirection;
uniform vec3 uSunColour;
uniform float uSunStrength;
varying vec3 vWorldPos;
varying float vBedDepth;
varying float vViewZ;
void main(){
 vec2 q=vWorldPos.xz;
 float wDist=length(cameraPosition-vWorldPos);
 float wAtten=1.0-smoothstep(10.0,46.0,wDist);
 vec3 N=normalize(vec3((cos(q.x*.85+uTime*.6)*.018+cos(q.y*1.3-uTime*.7)*.009)*mix(.35,1.0,wAtten),1.0,(sin(q.y*.74-uTime*.5)*.018)*mix(.35,1.0,wAtten)));
 vec3 V=normalize(cameraPosition-vWorldPos);float ndv=clamp(abs(dot(N,V)),.05,1.0);
 float F=.02+.98*pow(1.0-ndv,5.0);
 vec4 probeClip=uRefractionMatrix*vec4(vWorldPos,1.0);
 vec2 screen=probeClip.xy/max(.001,probeClip.w)*.5+.5;
 vec2 refrUV=clamp(screen+N.xz*.009*min(vBedDepth,2.5),vec2(.002),vec2(.998));
 float rawDepth=texture2D(uSceneDepth,refrUV).x;
 float behind=uCameraNear*uCameraFar/max(.0001,uCameraFar-rawDepth*(uCameraFar-uCameraNear));
 float probeViewZ=(uRefractionView*vec4(vWorldPos,1.0)).z;
 float thickness=mix(vBedDepth,clamp((behind+probeViewZ)*ndv,0.0,5.0),uHasProbe);
 vec3 transmission=exp(-vec3(.38,.115,.08)*thickness);
 vec3 scatter=vec3(.055,.29,.255);
 vec3 sceneColor=texture2D(uSceneColor,refrUV).rgb;
 vec3 refracted=mix(vec3(.31,.55,.48),sceneColor,uHasProbe)*transmission+scatter*(1.0-transmission);
 vec4 mirror=uReflectionMatrix*vec4(vWorldPos,1.0);
 vec2 mirrorUV=mirror.xy/max(.001,mirror.w)+N.xz*.012;
 float sameLevel=1.0-smoothstep(.08,.2,abs(vWorldPos.y-uProbeY));
 vec3 reflected=mix(vec3(.19,.39,.34),texture2D(uReflection,clamp(mirrorUV,.002,.998)).rgb,uHasProbe*sameLevel*uAboveWater);
 vec3 L=normalize(uKeyPosition-vWorldPos),H=normalize(L+V);
 float spBlur=smoothstep(6.0,42.0,wDist);
 float spec=pow(max(dot(N,H),0.0),mix(140.0,28.0,spBlur))*mix(.65,.22,spBlur);
 float caustic=pow(max(0.0,sin(q.x*1.1+uTime*.43)*sin(q.y*1.24-uTime*.39)),14.0)*.035*exp(-thickness)*mix(.4,1.0,wAtten);
 float sunGlint=pow(max(dot(N,normalize(normalize(uSunDirection)+V)),0.0),mix(180.0,36.0,spBlur))*uSunStrength*mix(.45,1.0,wAtten);
 vec3 color=mix(refracted,reflected*vec3(.85,.94,.91),clamp(F,.02,.58))+uKeyColor*spec+uSunColour*sunGlint+vec3(.62,.9,.8)*caustic;
 float fog=1.0-exp(-uFogDensity*uFogDensity*pow(wDist,2.0));
 color=mix(color,uFogColor,fog*(1.0-uHasProbe));
 float alpha=mix(clamp(.18+thickness*.18+F*.5,.18,.87),1.0,uHasProbe);
 gl_FragColor=vec4(color,alpha);
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
}`;

export function createPoolOptics(scene,root,map,waterMaterial,gfxKey,disposables) {
  const fallback=new THREE.DataTexture(new Uint8Array([100,150,130,255]),1,1);fallback.needsUpdate=true;disposables.push(fallback);
  const uniforms={uSceneColor:{value:fallback},uSceneDepth:{value:fallback},uReflection:{value:fallback},uReflectionMatrix:{value:new THREE.Matrix4()},uResolution:{value:new THREE.Vector2(1,1)},uCameraNear:{value:.05},uCameraFar:{value:200},uHasProbe:{value:0},uProbeY:{value:-.08},uKeyColor:{value:new THREE.Color(0xffedd8)},uKeyPosition:{value:new THREE.Vector3(0,7,0)}};
  uniforms.uAboveWater={value:1};
  uniforms.uSunDirection={value:new THREE.Vector3(.38,.68,.62).normalize()};uniforms.uSunStrength={value:0};
  uniforms.uSunColour={value:new THREE.Color(0xffefd6)};
  uniforms.uRefractionMatrix={value:new THREE.Matrix4()};uniforms.uRefractionView={value:new THREE.Matrix4()};
  Object.assign(waterMaterial.uniforms,uniforms);waterMaterial.vertexShader=POOL_WATER_VERTEX;waterMaterial.fragmentShader=POOL_WATER_FRAGMENT;
  const enabled=!['low','mobile'].includes(gfxKey);
  const rtW = ['ultra', 'high'].includes(gfxKey) ? 960 : 768;
  const rtH = ['ultra', 'high'].includes(gfxKey) ? 600 : 480;
  let refraction=null,reflector=null,lastUpdate=-100,lastPosition=new THREE.Vector3(-999,0,0),lastDirection=new THREE.Vector3(),qualityMode=gfxKey;
  const direction=new THREE.Vector3(),drawingSize=new THREE.Vector2();
  const ensureTargets=()=>{
    if(refraction)return;
    refraction=new THREE.WebGLRenderTarget(rtW,rtH,{type:THREE.HalfFloatType,minFilter:THREE.LinearFilter,magFilter:THREE.LinearFilter,depthBuffer:true});
    refraction.depthTexture=new THREE.DepthTexture(rtW,rtH,THREE.UnsignedIntType);
    reflector=new Reflector(new THREE.PlaneGeometry(1,1),{textureWidth:rtW,textureHeight:rtH,clipBias:.003,multisample:0});
    reflector.rotation.x=-Math.PI/2;reflector.visible=false;
    uniforms.uSceneColor.value=refraction.texture;uniforms.uSceneDepth.value=refraction.depthTexture;
    uniforms.uReflection.value=reflector.getRenderTarget().texture;
    disposables.push(refraction,reflector,reflector.geometry);
  };
  if(enabled)ensureTargets();
  const stats={enabled,quality:qualityMode,targets:enabled?2:0,updates:0,lastMs:0,maxMs:0,estimatedTargetBytes:enabled?rtW*rtH*(8+4+8):0};
  return {stats,get sceneTexture(){return refraction?.texture;},probeUniforms:uniforms,setQuality(q){
    qualityMode=q||gfxKey;stats.quality=qualityMode;
    const isLow=qualityMode==='low'||qualityMode==='mobile';
    stats.enabled=!isLow;
    if(isLow){uniforms.uHasProbe.value=0;return;}
    ensureTargets();stats.targets=2;stats.estimatedTargetBytes=rtW*rtH*(8+4+8);
  },update(renderer,camera,elapsed){
    renderer.getDrawingBufferSize(drawingSize);uniforms.uResolution.value.copy(drawingSize);uniforms.uCameraNear.value=camera.near;uniforms.uCameraFar.value=camera.far;
    const key=map.LIGHTS.filter(l=>l.spot).sort((a,b)=>Math.hypot(a.x-camera.position.x,a.z-camera.position.z)-Math.hypot(b.x-camera.position.x,b.z-camera.position.z))[0];
    if(key){uniforms.uKeyColor.value.setHex(key.hex);uniforms.uKeyPosition.value.set(key.x,key.y,key.z);}
    if(!stats.enabled||!refraction)return;
    camera.getWorldDirection(direction);
    const moving=camera.position.distanceTo(lastPosition)>.004||direction.distanceTo(lastDirection)>.0004;
    const activeRate=qualityMode==='med'||qualityMode==='medium'?1/15:qualityMode==='high'?1/30:1/60;
    const probeInterval=moving?activeRate:1;
    if(elapsed-lastUpdate<probeInterval)return;
    const nearest=map.WATER_RECTS.reduce((best,w)=>{const x=Math.max(w.x0,Math.min(w.x1,camera.position.x)),z=Math.max(w.z0,Math.min(w.z1,camera.position.z));const d=(x-camera.position.x)**2+(z-camera.position.z)**2;return !best||d<best.d?{w,d}:best;},null);
    if(!nearest||nearest.d>35*35)return;
    uniforms.uAboveWater.value=camera.position.y>nearest.w.waterY?1:0;
    const begin=performance.now(),hidden=[];
    root.traverse(o=>{if(o.isMesh&&(o.material===waterMaterial||o.userData.opticsHidden)){hidden.push([o,o.visible]);o.visible=false;}});
    const previous=renderer.getRenderTarget();
    camera.updateMatrixWorld();uniforms.uRefractionView.value.copy(camera.matrixWorldInverse);uniforms.uRefractionMatrix.value.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse);renderer.setRenderTarget(refraction);renderer.clear();renderer.render(scene,camera);renderer.setRenderTarget(previous);
    reflector.position.y=nearest.w.waterY;reflector.updateMatrixWorld(true);reflector.onBeforeRender(renderer,scene,camera);reflector.visible=false;
    // Reflector's stock matrix consumes LOCAL plane coordinates. Our merged
    // water vertices are WORLD coordinates, so remove its model transform.
    uniforms.uReflectionMatrix.value.copy(reflector.material.uniforms.textureMatrix.value).multiply(new THREE.Matrix4().copy(reflector.matrixWorld).invert());
    for(const [mesh,visible] of hidden)mesh.visible=visible;
    uniforms.uProbeY.value=nearest.w.waterY;uniforms.uHasProbe.value=1;
    lastUpdate=elapsed;lastPosition.copy(camera.position);lastDirection.copy(direction);
    stats.updates++;stats.lastMs=performance.now()-begin;stats.maxMs=Math.max(stats.maxMs,stats.lastMs);
  }};
}
