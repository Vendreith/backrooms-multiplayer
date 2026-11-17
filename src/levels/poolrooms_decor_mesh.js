/*! Copyright (c) 2026 Vendreith. Licensing: see LICENSE.md and THIRD_PARTY_NOTICES.md. */
import {THREE} from '../engine.js';
import {poolPropParts} from './poolrooms_prop_assets.js';
import {createPoolArtGeometry} from './poolrooms_art_mesh.js';

export function buildPoolDecor(root,map,gfx,disposables){
 const geometry=new Map(),materials=new Map(),buckets=new Map(),animated=[],attractions=[];
 const depthLabels=[...new Set((map.POOL_DECOR||[]).filter(p=>p.kind==='depth_marker').map(p=>(p.depth??1.2).toFixed(1)))].slice(0,16);if(!depthLabels.length)depthLabels.push('1.2');
 const keep=o=>{disposables.push(o);return o;};
 const getGeometry=key=>{if(geometry.has(key))return geometry.get(key);let g;
  if(key==='bird_neck')g=createPoolArtGeometry({kind:'pipe_sweep',path:[[0,.3,-.75],[.23,.9,-1.07],[.2,1.5,-1.03],[0,2,-.91]],radius:.17,segments:32},THREE);
  else if(key==='striped_sphere'){
   g=new THREE.SphereGeometry(1,24,16).toNonIndexed();const p=g.attributes.position,colors=new Float32Array(p.count*3),palette=[0xf2eade,0xe94349,0xf2eade,0xffd82f,0xf2eade,0x278fdb,0xf2eade,0x63bc77];for(let i=0;i<p.count;i+=3){const angle=Math.atan2((p.getZ(i)+p.getZ(i+1)+p.getZ(i+2))/3,(p.getX(i)+p.getX(i+1)+p.getX(i+2))/3),c=new THREE.Color(palette[Math.floor((angle+Math.PI)/(Math.PI*2)*8)%8]);for(let j=0;j<3;j++)colors.set([c.r,c.g,c.b],(i+j)*3);}g.setAttribute('color',new THREE.BufferAttribute(colors,3));
  }else if(key==='sphere_hi')g=new THREE.SphereGeometry(1,28,20);else if(key==='sphere')g=new THREE.SphereGeometry(1,16,12);else if(key==='cylinder')g=new THREE.CylinderGeometry(1,1,1,16);else if(key==='cone')g=new THREE.ConeGeometry(1,1,16);else if(key==='torus')g=new THREE.TorusGeometry(1,.2,8,24);else if(key==='capsule')g=new THREE.CapsuleGeometry(1,1,4,8);else if(key.startsWith('sign_')){g=new THREE.PlaneGeometry(1,1);g.rotateY(Math.PI);const tile=Number(key.slice(5)),u=g.attributes.uv;for(let i=0;i<u.count;i++)u.setXY(i,(tile%4+u.getX(i))/4,1-(Math.floor(tile/4)+1)/4+u.getY(i)/4);}else g=new THREE.BoxGeometry(1,1,1);
  if(!g.attributes.color)g.setAttribute('color',new THREE.BufferAttribute(new Float32Array(g.attributes.position.count*3).fill(1),3));geometry.set(key,keep(g));return g;
 };
 const getMaterial=key=>{if(materials.has(key))return materials.get(key);let m;
  if(key==='sign'){
   const canvas=document.createElement('canvas');canvas.width=512;canvas.height=512;const ctx=canvas.getContext('2d');ctx.fillStyle='#f8f5de';ctx.fillRect(0,0,512,512);depthLabels.forEach((label,i)=>{const x=i%4*128,y=Math.floor(i/4)*128;ctx.strokeStyle='#257c91';ctx.lineWidth=6;ctx.strokeRect(x+6,y+6,116,116);ctx.fillStyle='#164e63';ctx.textAlign='center';ctx.font='bold 38px sans-serif';ctx.fillText(label+' m',x+64,y+62);ctx.font='bold 17px sans-serif';ctx.fillText('POOL 37',x+64,y+101);});const tex=keep(new THREE.CanvasTexture(canvas));tex.colorSpace=THREE.SRGBColorSpace;m=new THREE.MeshStandardMaterial({map:tex,roughness:.65,side:THREE.DoubleSide});
  }else m=new THREE.MeshStandardMaterial({color:0xffffff,vertexColors:true,roughness:key==='metal'?.27:key==='matte'?.78:key==='clear'?.12:.3,metalness:key==='metal'?.55:.025,transparent:key==='clear',opacity:key==='clear'?.32:1,depthWrite:key!=='clear',emissive:0xffffff,emissiveIntensity:.012});
  materials.set(key,keep(m));return m;
 };
 const parent=new THREE.Object3D(),local=new THREE.Object3D(),matrix=new THREE.Matrix4(),color=new THREE.Color();
 for(const p of map.POOL_DECOR||[]){
  parent.position.set(p.x,p.y,p.z);parent.rotation.set(0,p.ry||0,0);parent.scale.setScalar(p.scale);parent.updateMatrix();
  for(const part of poolPropParts(p.kind,p.color)){
   if(part.geo==='sign')part.geo='sign_'+Math.max(0,depthLabels.indexOf((p.depth??1.2).toFixed(1)));
   if(p.scale>1.5&&part.geo==='sphere')part.geo='sphere_hi';
   const key=`${Math.floor(p.x/32)},${Math.floor(p.z/32)}:${part.geo}:${part.mat}:${p.scale>1.5?'large':'small'}`;
   if(!buckets.has(key))buckets.set(key,{geo:part.geo,mat:part.mat,items:[],large:p.scale>1.5,bounds:new THREE.Box3()});const bucket=buckets.get(key);
   local.position.fromArray(part.pos);local.rotation.fromArray([...part.rot,'XYZ']);local.scale.fromArray(part.scale);local.updateMatrix();matrix.multiplyMatrices(parent.matrix,local.matrix);
   bucket.items.push({matrix:matrix.clone(),color:part.color,prop:p});bucket.bounds.expandByPoint(new THREE.Vector3(p.x,p.y,p.z));
  }
 }
 const meshes=[];
 for(const b of buckets.values()){
  const mesh=keep(new THREE.InstancedMesh(getGeometry(b.geo),getMaterial(b.mat),b.items.length));mesh.name='pool-equipment-instances';mesh.userData.decorative=true;mesh.castShadow=!!gfx.shadows&&b.mat!=='clear';mesh.receiveShadow=!!gfx.shadows;mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  b.items.forEach((item,i)=>{mesh.setMatrixAt(i,item.matrix);mesh.setColorAt(i,color.setHex(item.color));if(item.prop.float)animated.push({mesh,index:i,base:item.matrix.clone(),phase:item.prop.phase,scale:item.prop.scale});});mesh.instanceMatrix.needsUpdate=true;mesh.computeBoundingSphere();root.add(mesh);meshes.push({mesh,bounds:b.bounds,range:b.large?145:85,evicted:true});
 }
 for(const a of map.POOL_WATERPARK||[]){
  const g=keep(createPoolArtGeometry(a,THREE));if(!g)continue;const key='slide-'+a.color+'-'+!!a.translucent;
  if(!materials.has(key))materials.set(key,keep(new THREE.MeshStandardMaterial({color:a.color,roughness:.25,metalness:.035,transparent:!!a.translucent,opacity:a.translucent?.38:1,depthWrite:!a.translucent,emissive:a.color,emissiveIntensity:.04})));
  const mesh=new THREE.Mesh(g,materials.get(key));mesh.name='authored-waterpark-slide';mesh.userData.decorative=true;mesh.castShadow=!!gfx.shadows&&!a.translucent;mesh.receiveShadow=!!gfx.shadows;root.add(mesh);attractions.push(mesh);
 }
 let lastTime=-100;
 const stats={props:map.POOL_DECOR?.length||0,primitiveTypes:geometry.size,instanceBatches:meshes.length,animatedParts:animated.length,attractions:attractions.length,instanceBufferEvictions:0};
 return {stats,update(elapsed,position,renderDist=200){
  if(!position)return;
  const rd=Math.max(50,renderDist||200);
  const smallLim=Math.min(rd*.72,110);
  const largeLim=Math.min(rd*1.05,360);
  const attrLim=Math.max(rd*1.12,150);
  for(const b of meshes){
   const baseR=b.range>100?largeLim:smallLim;
   const r=b.mesh.visible?baseR+12:baseR;
   const d=b.bounds.distanceToPoint(position);
   b.mesh.visible=d<r;
   if(b.mesh.visible){b.evicted=false;delete b.hiddenSince;}
   else{b.hiddenSince??=elapsed;if(!b.evicted&&d>r+40&&elapsed-b.hiddenSince>5){b.mesh.dispose();b.evicted=true;stats.instanceBufferEvictions++;}}
  }
  for(const a of attractions){
   if(!a.geometry.boundingSphere)a.geometry.computeBoundingSphere();
   const bs=a.geometry.boundingSphere;
   const d=bs?Math.max(0,position.distanceTo(bs.center)-bs.radius):0;
   a.visible=d<attrLim;
  }
  if(elapsed-lastTime<.1)return;lastTime=elapsed;const dirty=new Set();for(const a of animated){if(!a.mesh.visible)continue;matrix.copy(a.base);matrix.elements[13]+=Math.sin(elapsed*.65+a.phase)*.025*Math.min(a.scale,2);matrix.elements[12]+=Math.sin(elapsed*.19+a.phase)*.025;matrix.elements[14]+=Math.cos(elapsed*.17+a.phase)*.025;a.mesh.setMatrixAt(a.index,matrix);dirty.add(a.mesh);}for(const mesh of dirty)mesh.instanceMatrix.needsUpdate=true;
 }};
}
