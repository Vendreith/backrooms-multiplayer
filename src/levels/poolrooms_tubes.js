/*! Copyright (c) 2026 Vendreith. Licensing: see LICENSE.md and THIRD_PARTY_NOTICES.md. */
// One continuous interior field drives shell, water footprint, floor and collision.
// Blend branch minima once, so short centreline segments cannot inflate the bore.
const blend=(a,b,k)=>{if(!Number.isFinite(a))return b;const h=Math.max(0,k-Math.abs(a-b))/k;return Math.min(a,b)-h*h*k*.25;};
const clamp=t=>Math.max(0,Math.min(1,t));
const closest=(p,x,z)=>{
 if(p.curve){const axial=p.curve==='z'?z:x,lateral=p.curve==='z'?x:z,k=p.curve==='z'?Math.PI*2:Math.PI,axis0=p.curve==='z'?p.a[2]:p.a[0],side0=p.side0,span=p.span,t0=clamp((axial-axis0)/span);let best=Infinity,bt=t0;
  for(const offset of[-.18,0,.18]){let t=clamp(t0+offset);for(let j=0;j<5;j++){const s=Math.sin(k*t),co=Math.cos(k*t),a=axis0+span*t-axial,b=side0+p.amplitude*s-lateral,der=p.amplitude*k*co,second=-p.amplitude*k*k*s;t=clamp(t-(a*span+b*der)/Math.max(span*span*.25,span*span+der*der+b*second));}const h=Math.hypot(axis0+span*t-axial,side0+p.amplitude*Math.sin(k*t)-lateral);if(h<best){best=h;bt=t;}}
  return {t:bt,h:best,cy:p.a[1]+(p.b[1]-p.a[1])*bt};
 }
 const dx=p.b[0]-p.a[0],dz=p.b[2]-p.a[2],t=clamp(((x-p.a[0])*dx+(z-p.a[2])*dz)/Math.max(1e-8,dx*dx+dz*dz));return {t,h:Math.hypot(x-p.a[0]-t*dx,z-p.a[2]-t*dz),cy:p.a[1]+(p.b[1]-p.a[1])*t};
};
function branchDistance({p,t,h,cy},y){const rx=p.rx||p.r,ry=p.ry||p.r,qy=y-cy;if(p.profile==='barrel'){const bed=(p.bedA??-.9)+((p.bedB??p.bedA??-.9)-(p.bedA??-.9))*t;return Math.max(qy>0?(Math.hypot(h/rx,qy/ry)-1)*Math.min(rx,ry):h-rx,bed-y);}return (Math.hypot(h/rx,qy/ry)-1)*Math.min(rx,ry);}
// Closest centreline points depend only on XZ. Reuse them through an entire
// vertical meshing column and through floor root finding.
export function tubeColumn(network,x,z){return {network,paths:(network.fieldPaths||network.paths).map(p=>({p,...closest(p,x,z)})),boxes:network.boxes.map(b=>({b,qx:Math.abs(x-(b.x0+b.x1)/2)-(b.x1-b.x0)/2,qz:Math.abs(z-(b.z0+b.z1)/2)-(b.z1-b.z0)/2}))};}
export function tubeColumnDistance(column,y){
 const branches=[];for(const p of column.paths){const id=p.p.branch??0;branches[id]=Math.min(branches[id]??Infinity,branchDistance(p,y));}let d=Infinity;for(const b of branches)if(b!==undefined)d=blend(d,b,column.network.blend??.001);
 for(const {b,qx,qz}of column.boxes){const qy=Math.abs(y-(b.y0+b.y1)/2)-(b.y1-b.y0)/2;d=Math.min(d,Math.hypot(Math.max(qx,0),Math.max(qy,0),Math.max(qz,0))+Math.min(Math.max(qx,qy,qz),0));}return d;
}
export function tubeSockets(c,nearby){
 const sockets=[];
 for(const side of['n','s','w','e']){const hz=side==='n'||side==='s',negative=side==='n'||side==='w',fixed=hz?(negative?c.z0:c.z1):(negative?c.x0:c.x1),lo=hz?c.x0:c.z0,hi=hz?c.x1:c.z1,parts=[];
  for(const n of nearby){if(n===c)continue;const n0=hz?n.z0:n.x0,n1=hz?n.z1:n.x1,a=Math.max(lo,hz?n.x0:n.z0),b=Math.min(hi,hz?n.x1:n.z1);if((negative?n0<fixed-.025:n1>fixed+.025)&&n0<=fixed+.025&&n1>=fixed-.025&&b-a>1)parts.push({a,b,overlap:negative?n1-fixed:fixed-n0});}
  parts.sort((a,b)=>a.a-b.a);const merged=[];for(const p of parts){const last=merged.at(-1);if(last&&p.a<=last.b+.05){last.b=Math.max(last.b,p.b);last.overlap=Math.max(last.overlap,p.overlap);}else merged.push({...p});}
  for(const p of merged)sockets.push({side,at:(p.a+p.b)/2,width:p.b-p.a,height:2.35,floorY:c.floorY,overlap:Math.max(0,p.overlap)});
 }return sockets;
}
export function makeTubeNetwork(c){
 const paths=[],large=c.art.grammar==='tubes',r=large?4.6:3.2,cy=r-.9;
 const add=(points,settings)=>{for(let i=1;i<points.length;i++)paths.push({a:points[i-1],b:points[i],r,...settings});};
 const spine=Array.from({length:33},(_,i)=>{const t=i/32;return[c.x+Math.sin(t*Math.PI*2)*c.width*.19,cy,c.z0-1+t*(c.depth+2)];});add(spine,{branch:0,profile:'circle'});
 const cross=Array.from({length:29},(_,i)=>{const t=i/28;return[c.x0-1+t*(c.width+2),large?2.3:1.5,c.z+Math.sin(t*Math.PI)*c.depth*.18];});add(cross,large?{branch:1,profile:'ellipse',rx:5.4,ry:3.2}:{branch:1,profile:'barrel',rx:3.5,ry:2.5,bedA:-.9});
 const boxes=[],entries=[],sockets=c.physicalPortals||c.portals;
 for(const [i,p]of sockets.entries()){
  const hz=p.side==='n'||p.side==='s',x=hz?p.at:p.side==='w'?c.x0:c.x1,z=hz?p.side==='n'?c.z0:c.z1:p.at;
  const inward=[p.side==='w'?1:p.side==='e'?-1:0,p.side==='n'?1:p.side==='s'?-1:0],mouth=[x-inward[0]*.8,1.65,z-inward[1]*.8];
  const collar=[x+inward[0]*((p.overlap||0)+1),1.65,z+inward[1]*((p.overlap||0)+1)];
  const target=[...spine,...cross].filter(q=>q[0]>c.x0+1&&q[0]<c.x1-1&&q[2]>c.z0+1&&q[2]<c.z1-1).sort((a,b)=>Math.hypot(a[0]-collar[0],a[2]-collar[2])-Math.hypot(b[0]-collar[0],b[2]-collar[2]))[0],end=[target[0]+inward[0]*1.2,1.05,target[2]+inward[1]*1.2];
  add([mouth,collar],{branch:i+2,profile:'barrel',rx:p.width/2+.12,ry:1.65,bedA:0,bedB:-.1});
  add([collar,end],{branch:i+2,profile:'barrel',rx:p.width/2+.12,ry:1.65,bedA:-.1,bedB:-.9});entries.push({id:i+2,points:[mouth,collar,end],socket:p});
  boxes.push({x0:hz?x-p.width/2:Math.min(x-.8*inward[0],x+.75*inward[0]),x1:hz?x+p.width/2:Math.max(x-.8*inward[0],x+.75*inward[0]),z0:hz?Math.min(z-.8*inward[1],z+.75*inward[1]):z-p.width/2,z1:hz?Math.max(z-.8*inward[1],z+.75*inward[1]):z+p.width/2,y0:-.12,y1:3.3});
 }
 if(large)paths.push({a:[c.x-10,-.08,c.z-8],b:[c.x-10,-.08,c.z+8],r:2.5,profile:'circle',branch:sockets.length+2,halfSubmerged:true});
 const fieldPaths=[{...paths[0],a:spine[0],b:spine.at(-1),curve:'z',side0:c.x,amplitude:c.width*.19,span:c.depth+2},{...paths[32],a:cross[0],b:cross.at(-1),curve:'x',side0:c.z,amplitude:c.depth*.18,span:c.width+2},...paths.filter(p=>p.branch>1)];
 return {paths,fieldPaths,boxes,entries,blend:.62,minY:large?-3:-1.4};
}
export function tubeDistance(network,x,y,z){
 return tubeColumnDistance(tubeColumn(network,x,z),y);
}
export function tubeFloor(network,x,z){
 const column=tubeColumn(network,x,z);let floor=Infinity;for(const {p,t,h,cy}of column.paths){const rx=p.rx||p.r,ry=p.ry||p.r;if(h<rx)floor=Math.min(floor,p.profile==='barrel'?(p.bedA??-.9)+((p.bedB??p.bedA??-.9)-(p.bedA??-.9))*t:cy-ry*Math.sqrt(1-(h/rx)**2));}
 for(const b of network.boxes)if(x>=b.x0&&x<=b.x1&&z>=b.z0&&z<=b.z1)floor=Math.min(floor,b.y0);
 if(!Number.isFinite(floor))return floor;let lo=floor-(network.blend||0)*Math.max(1,network.boxes.length)*.3-.04,hi=floor+.04;for(let i=0;i<10;i++){const mid=(lo+hi)*.5;if(tubeColumnDistance(column,mid)<0)hi=mid;else lo=mid;}return (lo+hi)*.5;
}
