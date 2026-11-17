/*! Copyright (c) 2026 Vendreith. Licensing: see LICENSE.md and THIRD_PARTY_NOTICES.md. */
// Tileable value/Perlin-like + Worley volume, authored procedurally once on CPU.
// GPU texture ownership belongs to the world; six sky materials can share it.
let cached=null;
const hash=(x,y,z,s)=>{let n=Math.imul(x,374761393)^Math.imul(y,668265263)^Math.imul(z,2147483647)^s;n=Math.imul(n^(n>>>13),1274126177);return ((n^(n>>>16))>>>0)/4294967295;};
function lattice(n,seed){const a=new Float32Array(n*n*n);for(let z=0;z<n;z++)for(let y=0;y<n;y++)for(let x=0;x<n;x++)a[(z*n+y)*n+x]=hash(x,y,z,seed);return {n,a};}
function value(g,x,y,z){const n=g.n,a=g.a,ix=Math.floor(x),iy=Math.floor(y),iz=Math.floor(z);let fx=x-ix,fy=y-iy,fz=z-iz;fx=fx*fx*(3-2*fx);fy=fy*fy*(3-2*fy);fz=fz*fz*(3-2*fz);const at=(dx,dy,dz)=>a[((((iz+dz)%n+n)%n)*n+((iy+dy)%n+n)%n)*n+((ix+dx)%n+n)%n],mix=(a,b,t)=>a+(b-a)*t;return mix(mix(mix(at(0,0,0),at(1,0,0),fx),mix(at(0,1,0),at(1,1,0),fx),fy),mix(mix(at(0,0,1),at(1,0,1),fx),mix(at(0,1,1),at(1,1,1),fx),fy),fz);}
function features(n,seed){const a=new Float32Array(n*n*n*3);for(let z=0;z<n;z++)for(let y=0;y<n;y++)for(let x=0;x<n;x++)for(let k=0;k<3;k++)a[((z*n+y)*n+x)*3+k]=.08+hash(x,y,z,seed+k*91)*.84;return {n,a};}
function worley(g,x,y,z){const n=g.n,ix=Math.floor(x),iy=Math.floor(y),iz=Math.floor(z),fx=x-ix,fy=y-iy,fz=z-iz;let d=9;for(let dz=-1;dz<=1;dz++)for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const id=((((iz+dz+n)%n)*n+(iy+dy+n)%n)*n+(ix+dx+n)%n)*3,qx=fx-dx-g.a[id],qy=fy-dy-g.a[id+1],qz=fz-dz-g.a[id+2];d=Math.min(d,qx*qx+qy*qy+qz*qz);}return Math.max(0,1-Math.sqrt(d)/1.3);}
export function createCloudNoise(THREE){
 const size=64;if(!cached){cached=new Uint8Array(size**3*4);const a=lattice(8,371),b=lattice(16,719),c=lattice(32,911),w4=features(4,137),w8=features(8,823);
  for(let z=0;z<size;z++)for(let y=0;y<size;y++)for(let x=0;x<size;x++){const px=x/size,py=y/size,pz=z/size,id=((z*size+y)*size+x)*4;cached[id]=Math.round((value(a,px*8,py*8,pz*8)*.625+value(b,px*16,py*16,pz*16)*.25+value(c,px*32,py*32,pz*32)*.125)*255);cached[id+1]=Math.round(worley(w4,px*4,py*4,pz*4)*255);cached[id+2]=Math.round(worley(w8,px*8,py*8,pz*8)*255);cached[id+3]=255;}
 }
 const texture=new THREE.Data3DTexture(cached,size,size,size);texture.format=THREE.RGBAFormat;texture.type=THREE.UnsignedByteType;texture.wrapS=texture.wrapT=texture.wrapR=THREE.RepeatWrapping;texture.minFilter=THREE.LinearMipmapLinearFilter;texture.magFilter=THREE.LinearFilter;texture.generateMipmaps=true;texture.unpackAlignment=1;texture.needsUpdate=true;return texture;
}
