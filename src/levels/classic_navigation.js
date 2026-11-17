/* Copyright (c) 2026 Vendreith. Radius-aware navigation for the dense classic district. */
import {ClassicIndex,classicPitAt,segmentHitsBox} from './classic_layout.js';
export function buildClassicNavigation(c,extra=[]) {
  const step=.625,n=Math.round(c.size/step),blocked=new Uint8Array(n*n);
  const index=new ClassicIndex([...c.walls,...extra].filter(w=>w.y0<1.7&&w.y1>.15&&!w.elevatorDoor),6.25);
  for(let r=0;r<n;r++)for(let col=0;col<n;col++){
    const x=c.x0+(col+.5)*step,z=c.z0+(r+.5)*step;
    blocked[r*n+col]=classicPitAt(c,x,z)?1:index.near(x,z,.44).some(b=>{const dx=x-Math.max(b.x0,Math.min(x,b.x1)),dz=z-Math.max(b.z0,Math.min(z,b.z1));return dx*dx+dz*dz<.44**2;})?1:0;
  }
  const nav={step,n,blocked,index};c.navigation=nav;return nav;
}
export function classicNavigationPath(c,sx,sz,tx,tz) {
  const nav=c.navigation||buildClassicNavigation(c),{step,n,blocked,index}=nav;
  const nearest=(x,z)=>{const col=Math.max(0,Math.min(n-1,Math.floor((x-c.x0)/step))),r=Math.max(0,Math.min(n-1,Math.floor((z-c.z0)/step)));for(let rad=0;rad<9;rad++)for(let dz=-rad;dz<=rad;dz++)for(let dx=-rad;dx<=rad;dx++){if(Math.abs(dx)!==rad&&Math.abs(dz)!==rad)continue;const rr=r+dz,cc=col+dx;if(rr>=0&&rr<n&&cc>=0&&cc<n&&!blocked[rr*n+cc])return rr*n+cc;}return -1;};
  const a=nearest(sx,sz),b=nearest(tx,tz);if(a<0||b<0)return[];
  const cost=new Float32Array(n*n).fill(Infinity),parent=new Int32Array(n*n).fill(-1),closed=new Uint8Array(n*n),heap=[];
  const heuristic=id=>Math.abs(id%n-b%n)+Math.abs((id/n|0)-(b/n|0));
  const push=(id,score)=>{const node={id,score};heap.push(node);let i=heap.length-1;while(i>0){const p=(i-1)>>1;if(heap[p].score<=score)break;heap[i]=heap[p];i=p;}heap[i]=node;};
  const pop=()=>{const top=heap[0],last=heap.pop();if(heap.length){let i=0;while(i*2+1<heap.length){let k=i*2+1;if(k+1<heap.length&&heap[k+1].score<heap[k].score)k++;if(heap[k].score>=last.score)break;heap[i]=heap[k];i=k;}heap[i]=last;}return top.id;};
  cost[a]=0;parent[a]=a;push(a,heuristic(a));
  while(heap.length){const id=pop();if(closed[id])continue;if(id===b)break;closed[id]=1;const col=id%n,row=id/n|0;for(const next of[col>0?id-1:-1,col<n-1?id+1:-1,row>0?id-n:-1,row<n-1?id+n:-1])if(next>=0&&!blocked[next]&&!closed[next]&&cost[id]+1<cost[next]){cost[next]=cost[id]+1;parent[next]=id;push(next,cost[next]+heuristic(next));}}
  if(parent[b]<0)return[];const raw=[];for(let id=b;id!==a;id=parent[id])raw.push([c.x0+(id%n+.5)*step,c.z0+((id/n|0)+.5)*step]);raw.reverse();
  const clear=(a,b)=>{const mx=(a[0]+b[0])/2,mz=(a[1]+b[1])/2,rad=Math.hypot(a[0]-b[0],a[1]-b[1])/2+.4;if(index.near(mx,mz,rad).some(w=>segmentHitsBox(a[0],a[1],b[0],b[1],w,.39)))return false;const distance=Math.hypot(a[0]-b[0],a[1]-b[1]);for(let d=0;d<=distance;d+=.25){const t=distance?d/distance:0;if(classicPitAt(c,a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t))return false;}return true;};
  const out=[];let anchor=[sx,sz];for(let i=0;i<raw.length;){let j=Math.min(raw.length-1,i+30);while(j>i&&!clear(anchor,raw[j]))j--;out.push(raw[j]);anchor=raw[j];i=j+1;}
  if(clear(anchor,[tx,tz]))out.push([tx,tz]);return out;
}
export function classicLineClear(c,ax,az,bx,bz,radius=.44){
  const nav=c.navigation||buildClassicNavigation(c),d=Math.hypot(bx-ax,bz-az);
  if(nav.index.near((ax+bx)/2,(az+bz)/2,d/2+radius).some(w=>segmentHitsBox(ax,az,bx,bz,w,radius)))return false;
  for(let s=0;s<=d;s+=.25)if(classicPitAt(c,ax+(bx-ax)*(d?s/d:0),az+(bz-az)*(d?s/d:0)))return false;return true;
}
export function transitionRoute(con,sx,sz,tx,tz){
 const points=con.path,cumulative=[0];for(let i=1;i<points.length;i++)cumulative.push(cumulative.at(-1)+Math.hypot(points[i][0]-points[i-1][0],points[i][1]-points[i-1][1]));
 const project=(x,z)=>{let best=null;for(let i=1;i<points.length;i++){const a=points[i-1],b=points[i],dx=b[0]-a[0],dz=b[1]-a[1],len=Math.hypot(dx,dz),t=Math.max(0,Math.min(1,((x-a[0])*dx+(z-a[1])*dz)/(len*len))),p=[a[0]+dx*t,a[1]+dz*t],d=Math.hypot(p[0]-x,p[1]-z);if(!best||d<best.d)best={p,d,at:cumulative[i-1]+len*t};}return best;};
 const a=project(sx,sz),b=project(tx,tz),middle=points.filter((p,i)=>cumulative[i]>Math.min(a.at,b.at)+.01&&cumulative[i]<Math.max(a.at,b.at)-.01);if(a.at>b.at)middle.reverse();return[a.p,...middle,b.p,[tx,tz]];
}
