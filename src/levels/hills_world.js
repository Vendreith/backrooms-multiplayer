/*! Copyright (c) 2026 Vendreith. Licensing: see LICENSE.md and THIRD_PARTY_NOTICES.md. */
import * as THREE from 'three';
import {createHillsCloudscape} from './hills_cloudscape.js';
import {buildHillsDressing,buildScenicStreets} from './hills_dressing.js';
import { buildHouse } from './level94_architecture/house_builder.js';
import { disposeArchitectureResources } from './level94_architecture/resources.js';
import { MeshKit } from './level94_architecture/kit.js';
import { getHouseMaterialResolver } from './level94_architecture/house_builder.js';
import { buildThresholdDoors } from './thresholds.js';
import { buildPropsBatched, updateAnimatedProps } from './prop_builder.js';

export function buildHillsWorld(scene, map, quality = 'high') {
  const root = new THREE.Group(); root.name = 'dreamcore-hills'; scene.add(root);
  const field = map.hills, resources = [], houses = [], chunks = [];
  const own = value => { resources.push(value); return value; };
  const cloudscape = createHillsCloudscape(THREE,quality);
  own(cloudscape.noise); own(cloudscape.material);
  const sky = new THREE.Mesh(own(new THREE.SphereGeometry(1, 32, 20)), cloudscape.material);
  sky.frustumCulled = false; sky.renderOrder = -100; root.add(sky);
  const terrainMat = own(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .96, metalness: 0 }));
  // Original felt-like turf: low-contrast fibres and a shallow bump, mip-filtered at distance.
  const fibre=new Uint8Array(128*128*4);let turfSeed=94094;
  for(let z=0;z<128;z++)for(let x=0;x<128;x++){
    turfSeed=(Math.imul(turfSeed,1664525)+1013904223)>>>0;
    const n=turfSeed/4294967296,v=Math.round(235+(n-.5)*18+Math.sin(x*.7+z*.18)*3),id=(z*128+x)*4;
    fibre.set([v,v,v,255],id);
  }
  const turf=own(new THREE.DataTexture(fibre,128,128));turf.wrapS=turf.wrapT=THREE.RepeatWrapping;turf.repeat.set(32,32);turf.generateMipmaps=true;turf.minFilter=THREE.LinearMipmapLinearFilter;turf.needsUpdate=true;
  terrainMat.map=turf;terrainMat.bumpMap=turf;terrainMat.bumpScale=.025;
  const maskBytes=Uint8Array.from(field.mask,v=>Math.round(v*255));
  const pathTexture=own(new THREE.DataTexture(maskBytes,field.maskN,field.maskN,THREE.RedFormat));
  pathTexture.minFilter=pathTexture.magFilter=THREE.LinearFilter;pathTexture.needsUpdate=true;
  terrainMat.onBeforeCompile=shader=>{
    shader.uniforms.hillPath={value:pathTexture};
    shader.vertexShader='varying vec3 hillGround;\n'+shader.vertexShader;
    shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\n hillGround=position;');
    shader.fragmentShader='varying vec3 hillGround; uniform sampler2D hillPath;\n'+shader.fragmentShader;
    shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
      float weave=sin(hillGround.x*8.3+sin(hillGround.z*7.7))*sin(hillGround.z*9.1)*.018;
      diffuseColor.rgb*=1.0+weave;
      float path=texture2D(hillPath,(hillGround.xz+96.0)/704.0).r;
      diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.32,.285,.19),smoothstep(.08,.7,path)*.6);
      float air=1.-exp(-max(0.,distance(cameraPosition,hillGround)-65.)*.0013);
      diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.39,.53,.48),air*.45);`);
  };
  // Larger batches retain the shared 4m height samples and reduce draw calls.
  for (let z0 = -96; z0 < 608; z0 += 128) for (let x0 = -96; x0 < 608; x0 += 128) {
    const width=Math.min(128,608-x0),depth=Math.min(128,608-z0);
    const geo = own(new THREE.PlaneGeometry(width,depth,width/4,depth/4)); geo.rotateX(-Math.PI / 2); geo.translate(x0+width/2,0,z0+depth/2);
    const p = geo.attributes.position, colors = new Float32Array(p.count * 3), c = new THREE.Color();
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), z = p.getZ(i), y = field.heightAt(x, z);
      p.setY(i, y);
      const mottling = Math.sin(x*.041+Math.sin(z*.033))*.018+Math.sin(z*.078+x*.06)*.008;
      c.setRGB(.11+mottling*.55,.265+mottling+y*.0003,.038+mottling*.25);

      colors.set([c.r, c.g, c.b], i * 3);
    }
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3)); geo.computeVertexNormals();
    const mesh = new THREE.Mesh(geo, terrainMat);mesh.name='hills-terrain'; mesh.receiveShadow = true; root.add(mesh);
    chunks.push({ mesh });
  }
  for (const h of map.HOUSES.filter(h=>!h.scenic)) { const lod = buildHouse(h); root.add(lod); houses.push(lod); }

  const scenicStreets=buildScenicStreets(map.HOUSES,resources);root.add(scenicStreets);
  const dressing=buildHillsDressing(root,map,resources);

  // The bell house crowns the authored NE hill. Props remain the recovered batched package.
  const landmarks = new MeshKit();
  for (const t of map.TOWERS) {
    landmarks.push({ x: t.x, y: t.baseY, z: t.z });
    landmarks.box('wall_siding', t.w, t.h, t.d, 0, t.h / 2, 0);
    landmarks.box('trim', t.w + .3, .22, t.d + .3, 0, t.h - 1.8, 0);
    landmarks.cylinder('roof_shingle', 0, 5.2, 4.0, 4, 0, t.h + 2, 0, 0, Math.PI / 4, 0);
    for (const side of [-1, 1]) landmarks.box('glass', 1.3, 2.1, .06, side * 1.7, t.h - 2.8, t.d / 2 + .04);
    landmarks.pop();
  }
  const landmarkGroup = landmarks.merge(getHouseMaterialResolver()).group; root.add(landmarkGroup);
  landmarkGroup.traverse(m => { if (m.isMesh) { own(m.geometry); m.castShadow = m.receiveShadow = true; } });
  const animHandles = buildPropsBatched(root, map, resources);
  buildThresholdDoors(root, map.LEVEL_DOORS, resources);
  const taskMeshes = [], portalMeshes = [], itemMeshes = new Map(), supplyMeshes=[];
  const bottleGeo=own(new THREE.CylinderGeometry(.1,.11,.33,8));
  const flareGeo=own(new THREE.CylinderGeometry(.035,.035,.35,8));
  const bottleMat=own(new THREE.MeshStandardMaterial({color:0xc8e6d3,roughness:.5}));
  const flareMat=own(new THREE.MeshStandardMaterial({color:0xc16d4c,roughness:.75}));
  for(const [items,kind,geo,mat] of[[map.WATERS,'water',bottleGeo,bottleMat],[map.FLARES,'flare',flareGeo,flareMat]]) for(const item of items){
    const mesh=new THREE.Mesh(geo,mat);mesh.position.set(item.x,field.heightAt(item.x,item.z)+.2,item.z);root.add(mesh);
    itemMeshes.set(`${kind}:${item.id}`,mesh);supplyMeshes.push({item,mesh});
  }
  for (const task of map.TASKS) {
    const group = new THREE.Group(); group.position.set(task.x, task.y, task.z);
    const casing = own(new THREE.MeshStandardMaterial({color:0x5e736a,roughness:.65}));
    const machine = new THREE.Mesh(own(new THREE.BoxGeometry(.9,1.25,.45)),casing);machine.position.y=.9;machine.castShadow=true;group.add(machine);
    const ledMat=own(new THREE.MeshBasicMaterial({color:0xe8ae46}));
    const led=new THREE.Mesh(own(new THREE.BoxGeometry(.6,.12,.02)),ledMat);led.position.set(0,1.3,.24);group.add(led);
    root.add(group);taskMeshes.push({group,ledMat});
  }
  for (const portal of map.PORTALS) {
    const group=new THREE.Group();group.position.set(portal.x,portal.y,portal.z);
    const frameMat=own(new THREE.MeshStandardMaterial({color:0xe6dfc8,roughness:.9}));
    for(const x of[-1.1,1.1]){const post=new THREE.Mesh(own(new THREE.BoxGeometry(.18,2.8,.25)),frameMat);post.position.set(x,1.4,0);post.castShadow=true;group.add(post);}
    const lintel=new THREE.Mesh(own(new THREE.BoxGeometry(2.38,.18,.25)),frameMat);lintel.position.y=2.8;group.add(lintel);
    const glowMat=own(new THREE.MeshBasicMaterial({color:0xabc9cc,transparent:true,opacity:.18,side:THREE.DoubleSide}));
    const glow=new THREE.Mesh(own(new THREE.PlaneGeometry(2.1,2.65)),glowMat);glow.position.y=1.35;group.add(glow);
    root.add(group);portalMeshes.push({group,glowMat});
  }

  // Seeded, spatially batched grass; one draw per nearby patch, no per-blade objects.
  let rng = (map.seed ^ 94094) >>> 0;
  const rnd = () => { rng = (Math.imul(rng, 1664525) + 1013904223) >>> 0; return rng / 4294967296; };
  const grassTime = { value: 0 };
  const grassMat = own(new THREE.MeshBasicMaterial({ color: 0xffffff, vertexColors: true, side: THREE.DoubleSide }));
  grassMat.onBeforeCompile = shader => {
    shader.uniforms.hillTime = grassTime;
    shader.vertexShader = 'uniform float hillTime;\n' + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n transformed.x += sin(hillTime*1.3+instanceMatrix[3].x*.9+instanceMatrix[3].z*.35)*position.y*position.y*.24;');
  };
  const blade = own(new THREE.BufferGeometry());
  blade.setAttribute('position', new THREE.Float32BufferAttribute([-.018,0,0,.018,0,0,.01,.20,0,0,0,-.018,0,0,.018,0,.17,.01],3));
  blade.setAttribute('color', new THREE.Float32BufferAttribute([.08,.19,.025,.08,.19,.025,.12,.27,.04,.08,.19,.025,.08,.19,.025,.12,.27,.04],3));
  blade.computeVertexNormals();
  const grass = [], dummy = new THREE.Object3D();
  // Keep capacity for live preset changes; draw only the selected density.
  const count = 700;
  const grassFraction=q=>['low','mobile'].includes(q)?190/700:q==='med'?400/700:1;
  for (let z0 = 32; z0 < 480; z0 += 32) for (let x0 = 32; x0 < 480; x0 += 32) {
    if (Math.hypot(x0 + 16 - 256, z0 + 16 - 256) > 243) continue;
    const mesh = new THREE.InstancedMesh(blade, grassMat, count); let placed = 0;
    for (let i = 0; i < count; i++) {
      const x = x0 + rnd() * 32, z = z0 + rnd() * 32;
      if (field.pathMaskAt(x, z) > .03 || map.HOUSES.some(h => Math.hypot(h.cx - x, h.cz - z) < Math.hypot(h.w, h.d) / 2 + 2.8) || map.LEVEL_DOORS.some(d => Math.hypot(d.x - x, d.z - z) < 4)) continue;
      dummy.position.set(x, field.heightAt(x, z) - .02, z); dummy.rotation.set(0, rnd() * Math.PI, 0); dummy.scale.setScalar(.65 + rnd() * .75); dummy.updateMatrix(); mesh.setMatrixAt(placed++, dummy.matrix);
    }
    mesh.count = placed; mesh.computeBoundingSphere();mesh.count=Math.floor(placed*grassFraction(quality));root.add(mesh); grass.push({ mesh, capacity:placed, x: x0 + 16, z: z0 + 16 });
  }
  const sun = new THREE.DirectionalLight(0xfff4db, 2.0); sun.castShadow = !['low', 'mobile'].includes(quality);
  sun.shadow.mapSize.set(['high','ultra'].includes(quality)?2048:1024,['high','ultra'].includes(quality)?2048:1024);
  Object.assign(sun.shadow.camera, { left: -65, right: 65, top: 65, bottom: -65, near: 1, far: 240 });
  sun.shadow.bias = -.0003; sun.shadow.normalBias = .05; sun.shadow.radius = 3;
  root.add(sun, sun.target);
  let renderDistance = 300, lastCam = new THREE.Vector3(264, 12, 462), lastFar = 660;
  const api = {
    root, isSubLevel: true, skyDome: { mesh: sky, mat: cloudscape.material }, sunLight: sun,
    lightPool: [], flareLightPool: [], taskMeshes, pumpMeshes: [], portalMeshes, hookMeshes: [], exitMeshes: [], trapMeshes: [], flareMeshes: [], animItems: [], itemMeshes, dynamicRedSet: new Set(),
    stats: { houses: houses.length, terrainChunks: chunks.length, grassPatches: grass.length, grassInstances: grass.reduce((n, p) => n + p.mesh.count, 0) },
    setRenderDistance(distance) { renderDistance = Math.max(35, Number(distance) || 300); },
    setQualitySettings(settings = {}) {
      if (settings.renderDistance!==undefined) api.setRenderDistance(settings.renderDistance);
      if (settings.cloudQuality) cloudscape.setQuality(settings.cloudQuality);
      if (settings.quality)for(const p of grass)p.mesh.count=Math.floor(p.capacity*grassFraction(settings.quality));
      if (settings.shadows!==undefined)sun.castShadow=!!settings.shadows;
      if (settings.shadowMapSize && sun.shadow.mapSize.x!==settings.shadowMapSize){
        sun.shadow.mapSize.set(settings.shadowMapSize,settings.shadowMapSize);sun.shadow.map?.dispose();sun.shadow.map=null;sun.shadow.needsUpdate=true;
      }
      api.stats.grassInstances=grass.reduce((n,p)=>n+p.mesh.count,0);
    },
    updateExtra(time, cameraPos, curMap, fog, entity, far) {
      if (cameraPos) lastCam.copy(cameraPos); if (far) lastFar = far;
      sky.position.copy(lastCam); sky.scale.setScalar(Math.max(80, lastFar * .9));
      cloudscape.update(time, lastCam.y); grassTime.value = time;
      for(const {item,mesh} of supplyMeshes) mesh.visible=!item.gone&&Math.hypot(item.x-lastCam.x,item.z-lastCam.z)<Math.min(60,renderDistance);
      taskMeshes.forEach((t,i)=>t.ledMat.color.setHex(map.TASKS[i].done?0x66e2a1:0xe8ae46));
      for(const p of portalMeshes){const open=map.TASKS.every(t=>t.done);p.glowMat.opacity=open?.45:.18;p.glowMat.color.setHex(open?0x79e0ae:0xabc9cc);}
      for (const c of chunks) c.mesh.visible = true;
      for (const group of scenicStreets.children)group.visible=group.userData.distanceBounds.distanceToPoint(lastCam)<renderDistance;
      for (const group of dressing)group.node.visible=Math.hypot(group.x-lastCam.x,group.z-lastCam.z)<renderDistance+group.radius;
      for (const p of grass) p.mesh.visible = Math.hypot(p.x - lastCam.x, p.z - lastCam.z) < Math.min(85, renderDistance) + 20;
      for (const lod of houses) {
        const d = lod.position.distanceTo(lastCam); lod.visible = d < renderDistance+12;
        const level = d < Math.min(58, renderDistance*.6) ? 0 : d < Math.min(145, renderDistance) ? 1 : 2;
        lod.levels.forEach((l, i) => { l.object.visible = i === level; });
      }
      sun.target.position.set(lastCam.x, field.heightAt(lastCam.x, lastCam.z), lastCam.z);
      sun.position.copy(sun.target.position).add(new THREE.Vector3(-75,120,83));
      updateAnimatedProps(animHandles, time, map);
    },
    dispose() {
      scene.remove(root);
      for (const p of grass) p.mesh.dispose();
      sun.shadow.dispose();
      for (const r of resources) r.dispose?.();
      disposeArchitectureResources();
    }
  };
  api.updateExtra(0, lastCam);
  return api;
}
