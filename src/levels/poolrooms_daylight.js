/*! Copyright (c) 2026 Vendreith. Licensing: see LICENSE.md and THIRD_PARTY_NOTICES.md. */
import {THREE} from '../engine.js';
import {windowShape,placeWindowGeometry} from './poolrooms_windows.js';
import {POOL_SKY_VERTEX,POOL_SKY_FRAGMENT,POOL_SUN_DIRECTION} from './poolrooms_atmosphere.js';
import {createPoolExposure} from './poolrooms_exposure.js';
import {createPoolSunShafts} from './poolrooms_sunshafts.js';
import {createCloudscape} from './poolrooms_cloudscape.js';
import {SKY_COMPOSITIONS,ZONE_SKY} from './poolrooms_sky_compositions.js';

const worldVarying=`varying vec3 vDayWorld;`;
const worldVertex=`
vec4 dayWorld=vec4(transformed,1.0);
#ifdef USE_INSTANCING
 dayWorld=instanceMatrix*dayWorld;
#endif
vDayWorld=(modelMatrix*dayWorld).xyz;`;
const boxUniforms=`uniform vec3 uDayMin,uDayMax,uDayBounce;uniform float uDayEnabled;`;
const palettes={
 'heavenly blue':[0xffefd6,3.1,[.035,.073,.095]],'celestial white':[0xfff2db,3.3,[.05,.07,.085]],
 'golden afternoon':[0xffdbac,2.7,[.085,.065,.043]],'mint aquatic':[0xffedda,2.45,[.04,.085,.073]],
 'rose dream':[0xffe3d8,2.2,[.085,.047,.065]],'lavender sanctuary':[0xffecdf,2.5,[.062,.05,.09]],
 'deep shadow':[0xe6edff,2.1,[.023,.04,.065]]
};
const insideBox=`step(uDayMin.x,vDayWorld.x)*step(vDayWorld.x,uDayMax.x)*step(uDayMin.y,vDayWorld.y)*step(vDayWorld.y,uDayMax.y)*step(uDayMin.z,vDayWorld.z)*step(vDayWorld.z,uDayMax.z)`;

export function createPoolDaylight(root,map,gfxKey,gfx,disposables,optics){
 if(!map.POOL_SKY_WINDOWS?.length)return null;
 const keep=x=>(disposables.push(x),x),sunDirection=new THREE.Vector3(...POOL_SUN_DIRECTION).normalize();
 const uniforms={uTime:{value:0},uSunDirection:{value:sunDirection},uCloudAmount:{value:1}};
 const cloudSteps=['low','mobile'].includes(gfxKey)?10:['med','medium'].includes(gfxKey)?20:gfxKey==='ultra'?40:32;
 const material=keep(new THREE.ShaderMaterial({uniforms,defines:{CLOUD_STEPS:cloudSteps},vertexShader:POOL_SKY_VERTEX,fragmentShader:POOL_SKY_FRAGMENT,side:THREE.DoubleSide}));
 const apertures=[];
 const skies=new Map();let noise;
 for(const profile of Object.values(SKY_COMPOSITIONS)){const sky=createCloudscape(THREE,profile,gfxKey,{noise});if(!noise){noise=sky.noise;keep(noise);}keep(sky.material);skies.set(profile.id,sky);}
 const skyForZone=id=>skies.get(SKY_COMPOSITIONS[ZONE_SKY[id]]?.id);
 for(const w of map.POOL_SKY_WINDOWS){
  const g=keep(new THREE.ShapeGeometry(windowShape(w,THREE)));placeWindowGeometry(g,w);
  // This opaque procedural aperture terminates all exterior visibility. Nearby
  // unrelated districts cannot appear behind the intentionally impossible sky.
  const sky=new THREE.Mesh(g,skyForZone(w.zoneId)?.material||material);sky.name='infinite-procedural-sky-aperture';sky.userData.decorative=true;sky.userData.skyAperture=w;sky.renderOrder=-1;
  if(w.side==='s')sky.position.z=.04;else if(w.side==='e')sky.position.x=.04;else sky.position.y=.04;
  sky.renderOrder=2;root.add(sky);apertures.push(sky);
  const glass=new THREE.Mesh(g,keep(new THREE.MeshBasicMaterial({color:0x89cce8,transparent:true,opacity:.025,side:THREE.DoubleSide,depthWrite:false})));glass.name='sealed-sky-glass';glass.userData.decorative=true;root.add(glass);sky.userData.glass=glass;
 }
 const sun=keep(new THREE.DirectionalLight(0xffefd6,0));sun.castShadow=!!gfx.shadows;const shadowSize=['med','medium'].includes(gfxKey)?1024:2048;sun.shadow.mapSize.set(shadowSize,shadowSize);sun.shadow.camera.near=1;sun.shadow.camera.far=300;sun.shadow.bias=-.00016;sun.shadow.normalBias=.025;sun.shadow.radius=3;sun.shadow.autoUpdate=false;sun.shadow.needsUpdate=false;root.add(sun,sun.target);
 const bounds={uDayMin:{value:new THREE.Vector3(-1e6,-1e6,-1e6)},uDayMax:{value:new THREE.Vector3(1e6,1e6,1e6)},uDayEnabled:{value:0},uDayBounce:{value:new THREE.Vector3(.035,.073,.095)}};
 const shadowUniforms={...bounds,uClipSun:{value:0}},depth=keep(new THREE.MeshDepthMaterial({depthPacking:THREE.RGBADepthPacking}));
 depth.onBeforeCompile=shader=>{Object.assign(shader.uniforms,shadowUniforms);shader.vertexShader=worldVarying+'\n'+shader.vertexShader.replace('#include <project_vertex>','#include <project_vertex>\n'+worldVertex);shader.fragmentShader=worldVarying+'\n'+boxUniforms+'\nuniform float uClipSun;\n'+shader.fragmentShader.replace('#include <clipping_planes_fragment>',`#include <clipping_planes_fragment>\nif(uClipSun>.5&&(${insideBox})<.5)discard;`);};
 depth.customProgramCacheKey=()=> 'pool-sun-bounded-depth-v1';
 const clones=new Map();
 root.traverse(mesh=>{if(!mesh.isMesh||!mesh.material?.isMeshStandardMaterial)return;
  const original=mesh.material;if(!clones.has(original)){
   const m=keep(original.clone()),baseCompile=original.onBeforeCompile,baseKey=original.customProgramCacheKey();m.onBeforeCompile=(shader,renderer)=>{
    baseCompile.call(m,shader,renderer);
    Object.assign(shader.uniforms,bounds);
    shader.vertexShader=worldVarying+'\n'+shader.vertexShader.replace('#include <project_vertex>','#include <project_vertex>\n'+worldVertex);
    shader.fragmentShader=worldVarying+'\n'+boxUniforms+'\n'+shader.fragmentShader.replace('#include <lights_fragment_begin>',THREE.ShaderChunk.lights_fragment_begin.replace('getDirectionalLightInfo( directionalLight, directLight );',`getDirectionalLightInfo( directionalLight, directLight );directLight.color*=uDayEnabled*(${insideBox});`)).replace('#include <lights_fragment_end>',`#include <lights_fragment_end>\nreflectedLight.indirectDiffuse+=diffuseColor.rgb*uDayBounce*uDayEnabled*(${insideBox});`);
   };m.customProgramCacheKey=()=>baseKey+'|pool-window-sun-bounce-v1';clones.set(original,m);
  }mesh.material=clones.get(original);
  if(mesh.castShadow){mesh.customDepthMaterial=depth;mesh.onBeforeShadow=(renderer,object,camera,shadowCamera)=>{shadowUniforms.uClipSun.value=shadowCamera===sun.shadow.camera?1:0;};}
 });
 const exposure=createPoolExposure(disposables);
 const shafts=createPoolSunShafts(root,sun,gfxKey,gfx,disposables);
 const stats={windows:apertures.length,compositions:skies.size,activeZone:null,sunShadows:!!gfx.shadows,cloudSteps:[...skies.values()][0].material.defines.CLOUD_STEPS,shadowUpdates:0,autoExposure:true,exposure:exposure.stats,shafts:shafts?.stats};
 let active=null;
 return {stats,sun,apertures,exposure,setCloudQuality(q){for(const sky of skies.values())sky.setQuality?.(q);const sc=q==='low'||q==='mobile'?.38:q==='med'?.65:q==='high'?.88:1.0;stats.cloudSteps=Math.max(4,Math.round(cloudSteps*sc));},update(elapsed,position,renderDist=200){
  uniforms.uTime.value=elapsed;
  const maxSkyDist=Math.max(90,Math.min(840,(renderDist||200)*1.15));
  for(const sky of apertures){const w=sky.userData.skyAperture,visible=Math.hypot(w.x-position.x,w.z-position.z)<maxSkyDist;sky.visible=visible;sky.userData.glass.visible=visible;if(visible){const cell=map.POOL_CELLS.find(c=>c.id===w.cellId);skyForZone(w.zoneId)?.update(elapsed,position.y-(cell?.floorY||0));}}
  const cell=map.POOL_CELLS.find(c=>c.art&&c.daylightPalette&&position.x>=c.x0-2&&position.x<=c.x1+2&&position.z>=c.z0-2&&position.z<=c.z1+2);
  if(cell!==active){active=cell;stats.activeZone=cell?.zoneId||null;const sky=skyForZone(cell?.zoneId);stats.palette=sky?.profile.name||cell?.daylightPalette||null;bounds.uDayEnabled.value=cell?1:0;const palette=sky?.profile.light||palettes[cell?.daylightPalette]||palettes['heavenly blue'];sunDirection.fromArray(sky?.profile.sun||POOL_SUN_DIRECTION).normalize();sun.intensity=cell?palette[1]:0;sun.color.setHex(palette[0]);bounds.uDayBounce.value.fromArray(palette[2]);shafts?.setCell(cell?.daylightShafts?cell:null);if(optics){optics.probeUniforms.uSunStrength.value=sun.intensity*.75;optics.probeUniforms.uSunDirection.value.copy(sunDirection);}
   if(cell){bounds.uDayMin.value.set(cell.x0-.3,cell.floorY-3.3,cell.z0-.3);bounds.uDayMax.value.set(cell.x1+.3,cell.floorY+cell.ceiling+.6,cell.z1+.3);
    if(optics)optics.probeUniforms.uSunColour.value.copy(sun.color);
    sun.target.position.set(cell.x,cell.floorY+3,cell.z);sun.position.copy(sun.target.position).addScaledVector(sunDirection,120);
    const radius=Math.hypot(cell.width,cell.depth)*.57;Object.assign(sun.shadow.camera,{left:-radius,right:radius,top:radius,bottom:-radius});sun.shadow.camera.updateProjectionMatrix();sun.shadow.needsUpdate=true;stats.shadowUpdates++;
   }
  }
 },meter(renderer,texture,elapsed,dt,brightness,scene,camera){shafts?.prepare(optics?.probeUniforms);exposure.update(renderer,texture,elapsed,dt,brightness,scene,camera);}};
}
