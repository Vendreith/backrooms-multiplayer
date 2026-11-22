/*! Copyright (c) 2026 Vendreith. Licensing: see LICENSE.md and THIRD_PARTY_NOTICES.md. */
import * as THREE from 'three';
import {MeshKit} from './level94_architecture/kit.js';
import {getHouseMaterialResolver,resolveVariantPalette,houseMaterialKey} from './level94_architecture/house_builder.js';
import {getHouseVariant} from './level94_architecture/variants.js';
import {addGableRoof,addHipRoof} from './level94_architecture/roofs.js';

// Shared by the map and the mesh: fence gates are real collision openings.
export function hillsFenceRuns(houses){
 const runs=[];
 for(const h of houses.filter(h=>!h.scenic)){
  const v=getHouseVariant(h.variantId),depth=v.depth/2+(v.porch?.depth||1.1)+3.5,half=v.width/2+2.1;
  const world=(x,z)=>({x:h.cx+Math.cos(h.rotation)*x+Math.sin(h.rotation)*z,z:h.cz-Math.sin(h.rotation)*x+Math.cos(h.rotation)*z});
  for(const[a,b]of[[[-half,depth],[-1.2,depth]],[[1.2,depth],[half,depth]],[[-half,depth],[-half,-v.depth/2-2]]])runs.push({a:world(...a),b:world(...b),house:h.id});
 }
 return runs;
}
export function addFenceCollisions(rects,houses,field){
 for(const {a,b}of hillsFenceRuns(houses)){
  const n=Math.ceil(Math.hypot(b.x-a.x,b.z-a.z)/2);
  for(let i=0;i<n;i++){
   const x0=a.x+(b.x-a.x)*i/n,z0=a.z+(b.z-a.z)*i/n,x1=a.x+(b.x-a.x)*(i+1)/n,z1=a.z+(b.z-a.z)*(i+1)/n;
   const y0=field.heightAt(x0,z0),y1=field.heightAt(x1,z1);
   rects.push({x0:Math.min(x0,x1)-.055,x1:Math.max(x0,x1)+.055,z0:Math.min(z0,z1)-.055,z1:Math.max(z0,z1)+.055,y0:Math.min(y0,y1)-.1,y1:Math.max(y0,y1)+1.12,h:1.3,hidden:true,kind:'fence'});
  }
 }
}
function ribbon(path,field,width,offset=0){
 const pos=[],uv=[],ix=[],points=[];
 for(let i=1;i<path.pts.length;i++){
  const a=path.pts[i-1],b=path.pts[i],n=Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/.6);
  for(let j=0;j<n;j++)points.push([a[0]+(b[0]-a[0])*j/n,a[1]+(b[1]-a[1])*j/n]);
 }
 points.push(path.pts.at(-1));
 const across=Math.max(1,Math.ceil(width/.6)),stride=across+1;
 // Follow the same diagonal as PlaneGeometry, rather than spanning a bilinear
 // surface with a single wide strip that cuts through a convex terrain cell.
 const surface=(x,z)=>{
  const step=field.step,x0=Math.floor((x+96)/step)*step-96,z0=Math.floor((z+96)/step)*step-96;
  const fx=(x-x0)/step,fz=(z-z0)/step,a=field.heightAt(x0,z0),b=field.heightAt(x0+step,z0),c=field.heightAt(x0,z0+step),d=field.heightAt(x0+step,z0+step);
  return fx+fz<=1?a+(b-a)*fx+(c-a)*fz:d+(c-d)*(1-fx)+(b-d)*(1-fz);
 };
 for(let i=0;i<points.length;i++){
  const p=points[i],prev=points[Math.max(0,i-1)],next=points[Math.min(points.length-1,i+1)];
  const dx=next[0]-prev[0],dz=next[1]-prev[1],len=Math.hypot(dx,dz)||1,nx=-dz/len,nz=dx/len;
  for(let k=0;k<=across;k++){
   const side=k/across-.5,x=p[0]+nx*(offset+width*side),z=p[1]+nz*(offset+width*side);
   pos.push(x,surface(x,z)+.08,z);uv.push(i*.1,k/across);
   if(i&&k){const j=i*stride+k;ix.push(j-stride-1,j-stride,j-1,j-1,j-stride,j);}
  }
 }
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(ix);g.computeVertexNormals();return g;
}
export function buildHillsDressing(root,map,resources){
 const field=map.hills,own=o=>(resources.push(o),o),distanceGroups=[];
 const merge=(kit,name,x,z,radius)=>{
  const node=kit.merge(getHouseMaterialResolver()).group;node.name=name;
  node.traverse(o=>{if(o.isMesh){own(o.geometry);o.castShadow=o.receiveShadow=true;}});root.add(node);distanceGroups.push({node,x,z,radius});
 };
 const roadMat=own(new THREE.MeshStandardMaterial({color:0xb9b4a2,roughness:.93}));
 const curbMat=own(new THREE.MeshStandardMaterial({color:0xeee9d5,roughness:.9}));
 for(const path of field.paths.filter(p=>p.kind==='road')){
  root.add(new THREE.Mesh(own(ribbon(path,field,path.w)),roadMat));
  for(const side of[-1,1])root.add(new THREE.Mesh(own(ribbon(path,field,.17,side*(path.w/2+.08))),curbMat));
 }
 const white=houseMaterialKey('trim',0xf8f4df);
 const runs=hillsFenceRuns(map.HOUSES);
 for(const house of map.HOUSES.filter(h=>!h.scenic)){
 const kit=new MeshKit();
 for(const {a,b}of runs.filter(r=>r.house===house.id)){
  const length=Math.hypot(b.x-a.x,b.z-a.z),count=Math.ceil(length/.27),yaw=Math.atan2(-(b.z-a.z),b.x-a.x);
  for(let i=0;i<=count;i++){
   const x=a.x+(b.x-a.x)*i/count,z=a.z+(b.z-a.z)*i/count,y=field.heightAt(x,z);
   kit.push({x,y,z},yaw);kit.box(white,.105,.88,.07,0,.44,0);kit.trianglePrism(white,[[-.0525,0],[.0525,0],[0,.105]],.07,0,.88,0);kit.pop();
  }
  for(const h of[.27,.68])kit.beam(white,{x:a.x,y:field.heightAt(a.x,a.z)+h,z:a.z},{x:b.x,y:field.heightAt(b.x,b.z)+h,z:b.z},.06,.065);
 }
 merge(kit,'white-pickets',house.cx,house.cz,Math.hypot(house.w,house.d)/2+8);
 }
 const t=field.waterTower;
 const kit=new MeshKit();
 const steel=houseMaterialKey('painted_wood',0xe5ecdf),dark=houseMaterialKey('metal',0x8d9e9b);
 kit.push({x:t.x,y:t.y,z:t.z});
 for(const x of[-2.4,2.4])for(const z of[-2.4,2.4]){
  kit.cylinder(steel,.13,.18,14,10,x,7,z);kit.box('foundation',.9,.4,.9,x,.05,z);
 }
 for(const y of[3,7.5,12]){
  for(const z of[-2.4,2.4]){
   kit.beam(dark,{x:-2.4,y:y-2.5,z},{x:2.4,y:y+1.3,z},.07,.07);
   kit.beam(dark,{x:2.4,y:y-2.5,z},{x:-2.4,y:y+1.3,z},.07,.07);
  }
  for(const x of[-2.4,2.4])kit.beam(dark,{x,y:y-2.5,z:-2.4},{x,y:y+1.3,z:2.4},.07,.07);
 }
 kit.cylinder(steel,t.tankRadius,t.tankRadius,3.1,32,0,15.0,0);
 kit.sphere(steel,t.tankRadius,24,12,0,16.5,0,{x:1,y:.36,z:1});
 kit.torus(dark,t.tankRadius+.03,.06,6,32,0,13.5,0,Math.PI/2);
 kit.torus(dark,t.tankRadius+.03,.06,6,32,0,16.5,0,Math.PI/2);
 for(const x of[-.38,.38])kit.cylinder(dark,.035,.035,15.3,6,x,7.65,2.52);
 for(let y=.3;y<15;y+=.36)kit.box(dark,.8,.04,.06,0,y,2.52);
 kit.pop();
 merge(kit,'water-tower',t.x,t.z,7);
 return distanceGroups;
}

// Background silhouettes remain varied, but share material batches instead of 38 independent LOD trees.
function buildScenicRegion(houses,resources){
 const kit=new MeshKit();
 for(const h of houses.filter(h=>h.scenic)){
  const v=getHouseVariant(h.variantId),p={...resolveVariantPalette(v),...h.palette};
  const wall=houseMaterialKey('wall_panel',p.wall),roof=houseMaterialKey('roof_shingle',p.roof),trim=houseMaterialKey('trim',p.trim);
  kit.push({x:h.cx,y:h.baseY,z:h.cz},h.rotation);
  kit.box(wall,v.width,v.wallHeight,v.depth,0,v.wallHeight/2,0);
  (v.roof.type==='hip'?addHipRoof:addGableRoof)(kit,{...v.roof,span:v.width,length:v.depth,eaveY:v.wallHeight,roofKey:roof,trimKey:trim,wallKey:wall,detail:0,gutters:false});
  for(const w of v.windows.front||[])kit.box('glass',w.width,w.height,.04,w.x,w.y+w.height/2,v.depth/2+.035);
  if(v.chimney)kit.box('brick',.6,2,.6,v.chimney.x,v.wallHeight+1,v.chimney.z);
  for(const wing of v.wings||[]){kit.box(wall,wing.width,wing.height,wing.depth,wing.x,wing.height/2,wing.z);kit.push({x:wing.x,y:0,z:wing.z});addGableRoof(kit,{span:wing.width,length:wing.depth,eaveY:wing.height,rise:wing.rise,roofKey:roof,trimKey:trim,wallKey:wall,detail:0,gutters:false});kit.pop();}
  kit.pop();
 }
 const group=kit.merge(getHouseMaterialResolver()).group;group.name='scenic-street-batches';group.traverse(o=>{if(o.isMesh){resources.push(o.geometry);o.receiveShadow=true;}});return group;
}
export function buildScenicStreets(houses,resources){
 const group=new THREE.Group();group.name='scenic-streets';
 for(const region of new Set(houses.filter(h=>h.scenic).map(h=>h.region))){
  const child=buildScenicRegion(houses.filter(h=>h.scenic&&h.region===region),resources);
  child.userData.distanceBounds=new THREE.Box3().setFromObject(child).getBoundingSphere(new THREE.Sphere());group.add(child);
 }
 return group;
}
