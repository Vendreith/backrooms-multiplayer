/*! Copyright (c) 2026 Vendreith. Licensing: see LICENSE.md and THIRD_PARTY_NOTICES.md. */
import {tubeColumn,tubeColumnDistance} from './poolrooms_tubes.js';
// Marching tetrahedra on the union field. The inner and outer surfaces have
// opposite winding; conduit mouths intentionally terminate at cell sockets.
export function createTubeUnion(item,THREE){
  const step=.42,minY=item.network.minY??-1.4,height=item.ceiling+.3-minY,nx=Math.ceil(item.width/step),nz=Math.ceil(item.depth/step),ny=Math.ceil(height/step),sx=item.width/nx,sz=item.depth/nz,sy=height/ny;
  const points=[],values=[],index=(x,y,z)=>(z*(ny+1)+y)*(nx+1)+x;
  // Avoid an entire lattice face lying exactly on an iso level (socket boxes).
  // A 0.2mm inward field bias gives the opening an unambiguous inside sign.
  for(let z=0;z<=nz;z++)for(let x=0;x<=nx;x++){const px=item.x0+x*sx,pz=item.z0+z*sz,column=tubeColumn(item.network,px,pz);for(let y=0;y<=ny;y++){const id=index(x,y,z),py=minY+y*sy;points[id]=[px,py,pz];values[id]=tubeColumnDistance(column,py)-.0002;}}
  const positions=[],indices=[],cache=new Map();
  // Weld interpolation round-off at 0.1mm, far below a tile or wall thickness.
  // Exact Float32 edge auditing remains strict after this geometric weld.
  const vertex=p=>{const q=[p[0],p[1]+item.floorY,p[2]].map(v=>Math.fround(Math.round(v*1e4)/1e4)),key=q.join(',');if(cache.has(key))return cache.get(key);const id=positions.length/3;positions.push(...q);cache.set(key,id);return id;};
  const tet=[[0,5,1,6],[0,1,2,6],[0,2,3,6],[0,3,7,6],[0,7,4,6],[0,4,5,6]],es=[[0,1],[0,2],[0,3],[1,2],[1,3],[2,3]];
  const cap=(ids,normal)=>{
    let polygon=ids.map(id=>({p:points[id],v:values[id]}));
    for(const [iso,sign]of [[0,1],[.22,-1]]){const next=[];for(let j=0;j<polygon.length;j++){const a=polygon[j],b=polygon[(j+1)%polygon.length],ia=(a.v-iso)*sign>=0,ib=(b.v-iso)*sign>=0;if(ia)next.push(a);if(ia!==ib){const t=(iso-a.v)/(b.v-a.v);next.push({p:a.p.map((v,k)=>v+(b.p[k]-v)*t),v:iso});}}polygon=next;}
    for(let i=1;i<polygon.length-1;i++){let a=vertex(polygon[0].p),b=vertex(polygon[i].p),c=vertex(polygon[i+1].p);const p=new THREE.Vector3().fromArray(positions,a*3),ab=new THREE.Vector3().fromArray(positions,b*3).sub(p),ac=new THREE.Vector3().fromArray(positions,c*3).sub(p),n=ab.cross(ac);if(n.lengthSq()<1e-22)continue;if(n.dot(new THREE.Vector3(...normal))<0)[b,c]=[c,b];indices.push(a,b,c);}
  };
  for(let z=0;z<nz;z++)for(let y=0;y<ny;y++)for(let x=0;x<nx;x++){
    const ids=[[0,0,0],[1,0,0],[1,1,0],[0,1,0],[0,0,1],[1,0,1],[1,1,1],[0,1,1]].map(([a,b,c])=>index(x+a,y+b,z+c));
    for(const [edge,faces,normal]of [[x===0,[[0,3,7],[0,7,4]],[-1,0,0]],[x===nx-1,[[1,5,6],[1,6,2]],[1,0,0]],[y===0,[[0,4,5],[0,5,1]],[0,-1,0]],[y===ny-1,[[3,2,6],[3,6,7]],[0,1,0]],[z===0,[[0,1,2],[0,2,3]],[0,0,-1]],[z===nz-1,[[4,7,6],[4,6,5]],[0,0,1]]])if(edge)for(const face of faces)cap(face.map(i=>ids[i]),normal);
    for(const iso of [0,.22])for(const t of tet){
      const q=t.map(i=>points[ids[i]]),v=t.map(i=>values[ids[i]]-iso),inside=v.filter(a=>a<0).length;if(!inside||inside===4)continue;
      const cuts=[];for(const [a,b]of es)if((v[a]<0)!==(v[b]<0)){const f=v[a]/(v[a]-v[b]);cuts.push(q[a].map((s,j)=>s+(q[b][j]-s)*f));}
      const center=[0,0,0],dir=[0,0,0];for(const p of cuts)for(let j=0;j<3;j++)center[j]+=p[j]/cuts.length;
      for(let i=0;i<4;i++)for(let j=0;j<3;j++)dir[j]+=(v[i]>0?1/(4-inside):-1/inside)*q[i][j];
      const normal=new THREE.Vector3(...dir).normalize(),u=new THREE.Vector3(...cuts[0]).sub(new THREE.Vector3(...center)).normalize(),w=new THREE.Vector3().crossVectors(normal,u);
      cuts.sort((a,b)=>{const pa=new THREE.Vector3(...a).sub(new THREE.Vector3(...center)),pb=new THREE.Vector3(...b).sub(new THREE.Vector3(...center));return Math.atan2(pa.dot(w),pa.dot(u))-Math.atan2(pb.dot(w),pb.dot(u));});
      for(let i=1;i<cuts.length-1;i++){const a=vertex(cuts[0]),b=vertex(cuts[i]),c=vertex(cuts[i+1]);if(a===b||a===c||b===c)continue;const pa=new THREE.Vector3().fromArray(positions,a*3),ab=new THREE.Vector3().fromArray(positions,b*3).sub(pa),ac=new THREE.Vector3().fromArray(positions,c*3).sub(pa);if(ab.cross(ac).lengthSq()<1e-22)continue;if(iso===0)indices.push(a,c,b);else indices.push(a,b,c);}
    }
  }
  const unique=[],seen=new Set();for(let i=0;i<indices.length;i+=3){const t=indices.slice(i,i+3),key=t.slice().sort((a,b)=>a-b).join(',');if(!seen.has(key)){seen.add(key);unique.push(...t);}}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setIndex(unique);g.computeVertexNormals();
  // Interpolate central-difference field gradients from the existing grid.
  // This is the usual isosurface normal construction, without millions of
  // repeated closest-curve solves at mesh vertices.
  const gradients=new Float32Array(points.length*3),at=(x,y,z)=>values[index(x,y,z)];
  for(let z=0;z<=nz;z++)for(let y=0;y<=ny;y++)for(let x=0;x<=nx;x++){const id=index(x,y,z)*3,x0=Math.max(0,x-1),x1=Math.min(nx,x+1),y0=Math.max(0,y-1),y1=Math.min(ny,y+1),z0=Math.max(0,z-1),z1=Math.min(nz,z+1);gradients[id]=(at(x1,y,z)-at(x0,y,z))/((x1-x0)*sx);gradients[id+1]=(at(x,y1,z)-at(x,y0,z))/((y1-y0)*sy);gradients[id+2]=(at(x,y,z1)-at(x,y,z0))/((z1-z0)*sz);}
  const p=g.attributes.position,n=g.attributes.normal;
  for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i)-item.floorY,z=p.getZ(i);if(Math.min(x-item.x0,item.x1-x,z-item.z0,item.z1-z)<.002)continue;const gx=Math.max(0,Math.min(nx-.00001,(x-item.x0)/sx)),gy=Math.max(0,Math.min(ny-.00001,(y-minY)/sy)),gz=Math.max(0,Math.min(nz-.00001,(z-item.z0)/sz)),ix=Math.floor(gx),iy=Math.floor(gy),iz=Math.floor(gz),v=new THREE.Vector3();for(let dz=0;dz<2;dz++)for(let dy=0;dy<2;dy++)for(let dx=0;dx<2;dx++){const w=(dx?gx-ix:1-gx+ix)*(dy?gy-iy:1-gy+iy)*(dz?gz-iz:1-gz+iz),id=index(ix+dx,iy+dy,iz+dz)*3;v.x+=gradients[id]*w;v.y+=gradients[id+1]*w;v.z+=gradients[id+2]*w;}v.normalize();if(v.x*n.getX(i)+v.y*n.getY(i)+v.z*n.getZ(i)<0)v.negate();n.setXYZ(i,v.x,v.y,v.z);}
  g.setAttribute('uv',new THREE.Float32BufferAttribute(positions.length/3*2,2));return g;
}
