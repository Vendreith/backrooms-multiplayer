/* Copyright (c) 2026 Vendreith. Spatially batched environmental geometry with bounded detail distance. */
import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {ENV_LIBRARY} from './environment_library.js';
const PALETTE={wood:0x8a6a46,fabric:0x71786c,metal:0x7a8381,plastic:0xafa88d,cream:0xd3ceb6,stone:0xa8a28a,ceramic:0xccd4cc,black:0x252b2a,screen:0x273c40,rust:0x9f5940,blue:0x668d99};
const materialKey=p=>p.mat==='wood'?'wood':p.mat==='fabric'?'fabric':p.mat==='screen'?'screen':'hard';
export function buildEnvironmentWorld(root,population,track,texStore={}){
 const began=performance.now(),materials={wood:track(new THREE.MeshStandardMaterial({map:texStore.deskWood,vertexColors:true,roughness:.84})),fabric:track(new THREE.MeshStandardMaterial({map:texStore.carpetMap,vertexColors:true,roughness:.98})),hard:track(new THREE.MeshStandardMaterial({vertexColors:true,roughness:.68,metalness:.14})),screen:track(new THREE.MeshStandardMaterial({vertexColors:true,roughness:.35,emissive:0x10191a,emissiveIntensity:.22}))};
 const prototypes=new Map(),buckets=new Map(),chunks=[];
 const prototype=(type,lod)=>{
  const key=type+':'+lod;if(prototypes.has(key))return prototypes.get(key);const recipe=ENV_LIBRARY[type],groups=new Map();
  for(const p of recipe.parts){const support=p.h>.3&&p.w<.16&&p.d<.16;if(lod&&!recipe.landmark&&!support&&p.w*p.h*p.d<.007)continue;let g;
   if(p.shape==='box')g=new THREE.BoxGeometry(p.w,p.h,p.d);
   else if(p.shape==='cylinder')g=new THREE.CylinderGeometry(p.w/2,p.w/2,p.h,lod?8:12,1);
   else if(p.shape==='sphere')g=new THREE.SphereGeometry(p.w/2,lod?8:12,lod?5:8);
   else g=new THREE.TorusGeometry(p.r,p.t,lod?5:7,lod?12:18);
   if(p.rz)g.rotateZ(p.rz);if(p.rx)g.rotateX(p.rx);g.translate(p.x,p.y,p.z);const col=new THREE.Color(PALETTE[p.mat]),colors=new Float32Array(g.attributes.position.count*3);for(let i=0;i<colors.length;i+=3){colors[i]=col.r;colors[i+1]=col.g;colors[i+2]=col.b;}g.setAttribute('color',new THREE.BufferAttribute(colors,3));
   const k=materialKey(p);if(!groups.has(k))groups.set(k,[]);groups.get(k).push(g);
  }
  const result=new Map();for(const[k,geoms]of groups){result.set(k,mergeGeometries(geoms,false));for(const g of geoms)g.dispose();}prototypes.set(key,result);return result;
 };
 for(const o of population.instances){const cell=Math.floor(o.x/32)+','+Math.floor(o.z/32),m=new THREE.Matrix4().makeRotationY(o.rot);m.setPosition(o.x,o.y,o.z);
  for(const lod of[0,1])for(const[k,geometry]of prototype(o.type,lod)){const key=cell+'|'+(o.landmark?'hero':'prop')+'|'+lod+'|'+k;if(!buckets.has(key))buckets.set(key,[]);buckets.get(key).push(geometry.clone().applyMatrix4(m));}
 }
 for(const[key,geoms]of buckets){const[cell,kind,lod,k]=key.split('|'),g=track(mergeGeometries(geoms,false));for(const p of geoms)p.dispose();g.computeBoundingBox();g.computeBoundingSphere();const mesh=new THREE.Mesh(g,materials[k]);mesh.receiveShadow=true;mesh.castShadow=false;mesh.userData.environment=true;root.add(mesh);const bb=g.boundingBox;chunks.push({mesh,cell,hero:kind==='hero',lod:Number(lod),x0:bb.min.x,x1:bb.max.x,z0:bb.min.z,z1:bb.max.z});}
 for(const groups of prototypes.values())for(const g of groups.values())g.dispose();
 const stats={instances:population.instances.length,chunks:chunks.length,buildMs:performance.now()-began,visibleMeshes:0,detailRange:42,ordinaryRange:110,landmarkRange:220,vertices:chunks.reduce((n,c)=>n+c.mesh.geometry.attributes.position.count,0)};
 const update=(p,renderDistance=200)=>{if(!p)return;const ordinaryRange=Math.min(110,Math.max(55,renderDistance*.55)),heroRange=Math.min(220,Math.max(85,renderDistance));let visible=0;for(const c of chunks){const dx=Math.max(c.x0-p.x,0,p.x-c.x1),dz=Math.max(c.z0-p.z,0,p.z-c.z1),d=Math.hypot(dx,dz),split=c.hero?65:42,range=c.hero?heroRange:ordinaryRange;c.mesh.visible=d<range&&(c.lod===0?d<split:d>=split);c.mesh.castShadow=c.hero&&c.lod===0&&d<28;if(c.mesh.visible)visible++;}stats.visibleMeshes=visible;stats.ordinaryRange=ordinaryRange;stats.landmarkRange=heroRange;};
 return{chunks,stats,update};
}
