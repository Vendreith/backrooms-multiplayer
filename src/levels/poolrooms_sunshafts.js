/*! Copyright (c) 2026 Vendreith. Licensing: see LICENSE.md and THIRD_PARTY_NOTICES.md. */
import {THREE} from '../engine.js';
// A bounded participating volume integrates the real sun shadow map and scene
// depth. The opening, pillars and slides occlude rays; no luminous triangle billboards.
export function createPoolSunShafts(root,sun,gfxKey,gfx,disposables){
 if(!gfx.shadows||gfxKey==='low')return null;
 const u={uBoxMin:{value:new THREE.Vector3()},uBoxMax:{value:new THREE.Vector3()},uSunDirection:{value:new THREE.Vector3(.38,.68,.62).normalize()},uShadow:{value:null},uShadowMatrix:{value:sun.shadow.matrix},uDepth:{value:null},uProbeMatrix:{value:new THREE.Matrix4()},uProbeView:{value:new THREE.Matrix4()},uNear:{value:.05},uFar:{value:230},uReady:{value:0}};
 const geometry=new THREE.BoxGeometry(1,1,1),material=new THREE.ShaderMaterial({uniforms:u,defines:{SHAFT_STEPS:['med','medium'].includes(gfxKey)?10:16},side:THREE.BackSide,transparent:true,depthWrite:false,depthTest:false,vertexShader:'varying vec3 vShaftWorld;void main(){vec4 w=modelMatrix*vec4(position,1.0);vShaftWorld=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}',fragmentShader:`
 #include <packing>
 uniform vec3 uBoxMin,uBoxMax,uSunDirection,uSunColour;uniform sampler2D uShadow,uDepth;uniform mat4 uShadowMatrix,uProbeMatrix,uProbeView;uniform float uNear,uFar,uReady;varying vec3 vShaftWorld;
 void main(){
  if(uReady<.5)discard;
  vec3 rd=normalize(vShaftWorld-cameraPosition),inv=1.0/(rd+vec3(.000001));
  vec3 a=(uBoxMin-cameraPosition)*inv,b=(uBoxMax-cameraPosition)*inv,lo=min(a,b),hi=max(a,b);
  float start=max(0.0,max(lo.x,max(lo.y,lo.z))),end=min(hi.x,min(hi.y,hi.z));if(end<=start)discard;
  float stepD=(end-start)/float(SHAFT_STEPS),lit=0.0;
  float jitter=fract(sin(dot(gl_FragCoord.xy,vec2(12.9898,78.233)))*43758.5453);
  for(int i=0;i<SHAFT_STEPS;i++){
   vec3 p=cameraPosition+rd*(start+(float(i)+jitter)*stepD);
   vec4 clip=uProbeMatrix*vec4(p,1.0);vec2 uv=clip.xy/clip.w*.5+.5;
   if(uv.x<0.0||uv.x>1.0||uv.y<0.0||uv.y>1.0)continue;
   float raw=texture2D(uDepth,uv).x,behind=uNear*uFar/max(.00001,uFar-raw*(uFar-uNear));
   float sampleDepth=-(uProbeView*vec4(p,1.0)).z;if(sampleDepth>behind+.05)continue;
   vec4 shadow=uShadowMatrix*vec4(p,1.0);vec3 sc=shadow.xyz/shadow.w;
   if(any(lessThan(sc,vec3(0.0)))||any(greaterThan(sc,vec3(1.0))))continue;
   float stored=unpackRGBAToDepth(texture2D(uShadow,sc.xy));
   lit+=step(sc.z-.0006,stored)*stepD;
  }
  float phase=.4+.6*pow(max(0.0,dot(rd,uSunDirection)),4.0);
  float alpha=(1.0-exp(-lit*.008))*phase;
  gl_FragColor=vec4(uSunColour*1.2,min(alpha,.28));
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
 }`});
 u.uSunColour={value:sun.color};
 const mesh=new THREE.Mesh(geometry,material);mesh.name='shadowed-sun-scattering-volume';mesh.userData.decorative=true;mesh.userData.opticsHidden=true;mesh.renderOrder=20;mesh.visible=false;root.add(mesh);disposables.push(geometry,material);
 const stats={steps:material.defines.SHAFT_STEPS,enabled:false};
 return {stats,setCell(c){mesh.visible=!!c;stats.enabled=!!c;u.uReady.value=0;if(c){u.uBoxMin.value.set(c.x0+.12,c.floorY+.05,c.z0+.12);u.uBoxMax.value.set(c.x1-.12,c.floorY+c.ceiling-.12,c.z1-.12);mesh.position.addVectors(u.uBoxMin.value,u.uBoxMax.value).multiplyScalar(.5);mesh.scale.subVectors(u.uBoxMax.value,u.uBoxMin.value);}},prepare(probe){
  if(!mesh.visible||!sun.shadow.map||!probe)return;u.uSunDirection.value.subVectors(sun.position,sun.target.position).normalize();u.uShadow.value=sun.shadow.map.texture;u.uDepth.value=probe.uSceneDepth.value;u.uProbeMatrix.value.copy(probe.uRefractionMatrix.value);u.uProbeView.value.copy(probe.uRefractionView.value);u.uNear.value=probe.uCameraNear.value;u.uFar.value=probe.uCameraFar.value;u.uReady.value=probe.uHasProbe.value;
 }};
}
