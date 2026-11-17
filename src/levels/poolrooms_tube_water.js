/*! Copyright (c) 2026 Vendreith. Licensing: see LICENSE.md and THIRD_PARTY_NOTICES.md. */
import {tubeDistance,tubeFloor} from './poolrooms_tubes.js';
import {getTerrainAt} from './terrain.js';
// Clip surface triangles against the bore at the actual water elevation.
export function createTubeWater(w,THREE,map){
 const nx=Math.ceil((w.x1-w.x0)/.35),nz=Math.ceil((w.z1-w.z0)/.35),vertices=[],p=[],uv=[],depth=[];
 for(let z=0;z<=nz;z++)for(let x=0;x<=nx;x++){const px=w.x0+(w.x1-w.x0)*x/nx,pz=w.z0+(w.z1-w.z0)*z/nz;vertices.push({x:px,z:pz,d:tubeDistance(w.network,px,w.waterY-w.floorY,pz)+.012});}
 const depths=new Map();
 const emit=a=>{p.push(a.x,w.waterY,a.z);uv.push(a.x/2.4,a.z/2.4);const key=a.x+','+a.z;if(!depths.has(key)){const floor=map?getTerrainAt(a.x,a.z,map,w.waterY).floorY:w.floorY+tubeFloor(w.network,a.x,a.z);depths.set(key,Number.isFinite(floor)?Math.max(.005,w.waterY-floor):.005);}depth.push(depths.get(key));};
 const sample=(x,z)=>({x,z,d:tubeDistance(w.network,x,w.waterY-w.floorY,z)+.012});
 const triangleOut=(a,b,c)=>{const ax=Math.fround(a.x),az=Math.fround(a.z),bx=Math.fround(b.x),bz=Math.fround(b.z),cx=Math.fround(c.x),cz=Math.fround(c.z);if(((bx-ax)*(cz-az)-(bz-az)*(cx-ax))**2<1e-18)return;emit(a);emit(b);emit(c);};
 const clip=triangle=>{const q=[];for(let j=0;j<3;j++){const a=triangle[j],b=triangle[(j+1)%3],ia=a.d<=0,ib=b.d<=0;if(ia)q.push(a);if(ia!==ib){let inside=ia?a:b,outside=ia?b:a;for(let k=0;k<10;k++){const mid=sample((inside.x+outside.x)/2,(inside.z+outside.z)/2);if(mid.d<=0)inside=mid;else outside=mid;}q.push(inside);}}for(let j=1;j<q.length-1;j++)triangleOut(q[0],q[j],q[j+1]);};
 for(let z=0;z<nz;z++)for(let x=0;x<nx;x++){const a=z*(nx+1)+x,corners=[vertices[a],vertices[a+1],vertices[a+nx+1],vertices[a+nx+2]],lo=Math.min(...corners.map(p=>p.d)),hi=Math.max(...corners.map(p=>p.d));
  let boundary=lo<=0&&hi>=0;if(!boundary&&lo<.18&&hi>-.18){const d=sample((corners[0].x+corners[3].x)/2,(corners[0].z+corners[3].z)/2).d;boundary=lo>0?d<0:d>0;}
  if(boundary){
   // Refine only the shore. Nonlinear field roots avoid the old 6cm linear
   // interpolation overshoot around concave junctions and sloping beds.
   const patch=[];for(let iz=0;iz<=4;iz++)for(let ix=0;ix<=4;ix++)patch.push(sample(corners[0].x+(corners[1].x-corners[0].x)*ix/4,corners[0].z+(corners[2].z-corners[0].z)*iz/4));
   for(let iz=0;iz<4;iz++)for(let ix=0;ix<4;ix++){const b=iz*5+ix;clip([patch[b],patch[b+5],patch[b+1]]);clip([patch[b+1],patch[b+5],patch[b+6]]);}
  }else{clip([corners[0],corners[2],corners[1]]);clip([corners[1],corners[2],corners[3]]);}
 }
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setAttribute('aBedDepth',new THREE.Float32BufferAttribute(depth,1));g.computeVertexNormals();return g;
}
