import {makeClassicGraph,graphMetrics,shuffled} from './classic_graph.js';
import {CLASSIC_TEMPLATES,composeClassicTemplate} from './classic_templates.js';
/* Copyright (c) 2026 Vendreith. Original deterministic architectural grammar. */
// Independent annex preserves every legacy zone/entrance coordinate. Units are metres.
export const CLASSIC = Object.freeze({ x0: 562.5, z0: 385.25, size: 150, step: 6.25, count: 24, ceiling: 3.5 });
export const HOUSEHOLD_TYPES = ['chair','table','folding_table','sofa','mattress','floor_lamp','fan','television','monitor','cabinet','filing_cabinet','bookcase','shelf','clock','mirror','bin','bucket','mop','vacuum','boxes','container','toy','luggage','telephone','dispenser','vending','refrigerator','microwave','laundry','coat_stand','bench','frame','stool','plant','screen'];
const rand = seed => () => {seed |= 0;seed = seed + 0x6D2B79F5 | 0;let t = Math.imul(seed ^ seed >>> 15, 1 | seed);t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;return ((t ^ t >>> 14) >>> 0) / 4294967296;};
export function inClassic(c,x,z,pad=0) {return !!c && x >= c.x0-pad && x <= c.x1+pad && z >= c.z0-pad && z <= c.z1+pad;}
export function classicPitAt(c,x,z,y=0) {return c?.pits.find(p=>x>p.x0&&x<p.x1&&z>p.z0&&z<p.z1&&(y<-.6||!p.bridges?.some(b=>x>=b.x0&&x<=b.x1&&z>=b.z0&&z<=b.z1)));}
// Exact slab intersection, also used by the CPU static lighting bake. No sampling through thin walls.
export function segmentHitsBox(ax,az,bx,bz,b,margin=0) {
  let lo=0,hi=1;for(const [a,d,min,max] of [[ax,bx-ax,b.x0-margin,b.x1+margin],[az,bz-az,b.z0-margin,b.z1+margin]]){if(Math.abs(d)<1e-9){if(a<min||a>max)return false;}else{let t0=(min-a)/d,t1=(max-a)/d;if(t0>t1)[t0,t1]=[t1,t0];lo=Math.max(lo,t0);hi=Math.min(hi,t1);if(lo>hi)return false;}}return hi>.0001&&lo<.9999;
}
export class ClassicIndex {
  constructor(items,cell=8){this.cell=cell;this.buckets=new Map();for(const b of items)for(let z=Math.floor(b.z0/cell);z<=Math.floor(b.z1/cell);z++)for(let x=Math.floor(b.x0/cell);x<=Math.floor(b.x1/cell);x++){const k=x+','+z;if(!this.buckets.has(k))this.buckets.set(k,[]);this.buckets.get(k).push(b);}}
  near(x,z,r=0){const out=new Set();for(let iz=Math.floor((z-r)/this.cell);iz<=Math.floor((z+r)/this.cell);iz++)for(let ix=Math.floor((x-r)/this.cell);ix<=Math.floor((x+r)/this.cell);ix++)for(const b of this.buckets.get(ix+','+iz)||[])out.add(b);return [...out];}
}
export function buildClassicLayout(seed) {
  const rnd=rand(seed^0x11c1a551),{x0,z0,size,step:cell,count:n,ceiling}=CLASSIC,graph=makeClassicGraph(n,rnd);
  const c={...CLASSIC,x1:x0+size,z1:z0+size,...graph,walls:[],rooms:[],doors:[],fixtures:[],props:[],pits:[],dreams:[],compositions:[],decks:[],stairs:[],setPieces:[],connectors:[],views:{}};
  const addWall=(x,z,w,d,h=ceiling,y0=0,kind='partition')=>{if(w<.01||d<.01)return;const b={x0:x-w/2,x1:x+w/2,z0:z-d/2,z1:z+d/2,y0,y1:y0+h,h,minY:y0,maxY:y0+h,kind,style:'classic',classic:true,hidden:true};c.walls.push(b);return b;};
  c.addWall=addWall;const merged=new Set(),used=new Set(),featured=new Map(),macroOf=id=>(Math.floor(id%n/2))+','+Math.floor((id/n|0)/2);
  const mergeMacro=(col,row)=>{const ids=[];for(let z=0;z<2;z++)for(let x=0;x<2;x++)ids.push((row*2+z)*n+col*2+x);for(const a of ids)for(const b of ids)if((Math.abs(a%n-b%n)+Math.abs((a/n|0)-(b/n|0)))===1){graph.link(a,b);merged.add(graph.key(a,b));}return ids;};
  // Sequence sixteen distinct compositions along normal progression, not a random prop catalogue.
  const routeMacros=[...new Set(c.spine.map(macroOf))].filter(k=>k!==macroOf(c.spawnId));
  const chosen=[];for(let i=0;i<16;i++){const k=routeMacros[Math.min(routeMacros.length-1,Math.floor(i*(routeMacros.length-1)/15))];if(!chosen.includes(k))chosen.push(k);}
  let typeIndex=0;const placeComposition=(key,type)=>{const [col,row]=key.split(',').map(Number),ids=mergeMacro(col,row),room={x:x0+(col*2+1)*cell,z:z0+(row*2+1)*cell};c.compositions.push({...room,type,ids,key});used.add(key);for(const id of ids)featured.set(id,type);};
  for(const k of chosen)placeComposition(k,CLASSIC_TEMPLATES[typeIndex++]);
  const candidates=[];for(let row=0;row<n/2;row++)for(let col=0;col<n/2;col++){const key=col+','+row;if(used.has(key)||key===macroOf(c.spawnId))continue;const owners=[0,1,n,n+1].map(d=>c.owner[row*2*n+col*2+d]);if(Math.max(...owners)-Math.min(...owners)<=4)candidates.push(key);}
  shuffled(candidates,rnd);while(typeIndex<CLASSIC_TEMPLATES.length){const index=candidates.findIndex(k=>!routeMacros.includes(k)),k=candidates.splice(index<0?0:index,1)[0];if(!k)throw Error('Insufficient composition slots');placeComposition(k,CLASSIC_TEMPLATES[typeIndex++]);}
  // Preserve the eight earlier dreamcore motifs, especially the three physical shafts, off the critical route.
  for(const type of ['black_aperture','bridge_well','corridor_shaft','suspended_domestic','hollow_columns','doorway_recurrence','stair_to_false_landing','waiting_room']){
    const i=candidates.findIndex(k=>!used.has(k)&&!routeMacros.includes(k));const k=candidates.splice(Math.max(0,i),1)[0];const [col,row]=k.split(',').map(Number),ids=mergeMacro(col,row),x=x0+(col*2+1)*cell,z=z0+(row*2+1)*cell;used.add(k);c.dreams.push({col:col*2,r:row*2,type,x,z,ids});for(const id of ids)featured.set(id,'dream_'+type);
    if(['black_aperture','bridge_well','corridor_shaft'].includes(type)){const p={id:type,x0:x-2.1,x1:x+2.1,z0:z-2.5,z1:z+2.5,depth:32,threshold:-18,bridges:[]};if(type==='bridge_well')p.bridges.push({x0:x-.62,x1:x+.62,z0:p.z0-.15,z1:p.z1+.15});c.pits.push(p);}
  }
  // Main chambers expose the two progression openings and a few short loops, not a door at every quadrant.
  const mainSpace=new Set(c.spine);for(const comp of c.compositions)if(comp.ids.some(id=>c.rank[id]>=0))for(const id of comp.ids)mainSpace.add(id);
  const removed=[];for(const[k,e]of c.edges)if(mainSpace.has(e.a)!==mainSpace.has(e.b)&&!e.primary&&!e.guidedLoop){removed.push(e);c.edges.delete(k);c.adj[e.a]=c.adj[e.a].filter(id=>id!==e.b);c.adj[e.b]=c.adj[e.b].filter(id=>id!==e.a);}
  // Reconnect any purely optional island through one small entrance; never leave inaccessible floor space.
  const flood=()=>{const seen=new Set([c.spawnId]),q=[c.spawnId];for(let i=0;i<q.length;i++)for(const id of c.adj[q[i]])if(!seen.has(id)){seen.add(id);q.push(id);}return seen;};
  let seen=flood();while(seen.size<n*n){const edge=removed.find(e=>seen.has(e.a)!==seen.has(e.b));if(!edge)throw Error('Disconnected optional district');graph.link(edge.a,edge.b);c.edges.get(graph.key(edge.a,edge.b)).width=1.65;seen=flood();}
  for(let pass=0;pass<4;pass++)for(let a=0;a<n*n;a++)if(c.adj[a].length===1&&!mainSpace.has(a)){
    let current=a,previous=-1,length=0;while(c.adj[current].length<=2&&length<12){const next=c.adj[current].find(id=>id!==previous);if(next===undefined)break;previous=current;current=next;length++;if(c.adj[current].length!==2)break;}
    if(length>2){const x=a%n,z=a/n|0,b=[x>0?a-1:-1,x<n-1?a+1:-1,z>0?a-n:-1,z<n-1?a+n:-1].find(id=>id>=0&&!mainSpace.has(id)&&!c.adj[a].includes(id));if(b!==undefined){graph.link(a,b);c.edges.get(graph.key(a,b)).width=1.7;}}
  }
  const spawnRoom={x:x0+22.5*cell,z:z0+11.5*cell};c.elevator={x:spawnRoom.x,z:spawnRoom.z+1.05};c.spawn={...c.elevator};
  // The cabin stays at the reviewed V10 coordinates. No south connection through its back wall.
  graph.link(c.spawnId-1,c.spawnId);graph.link(c.spawnId,c.spawnId+1);graph.link(c.spawnId,c.spawnId-n,true);
  const south=c.spawnId+n;c.edges.delete(graph.key(c.spawnId,south));c.adj[c.spawnId]=c.adj[c.spawnId].filter(id=>id!==south);c.adj[south]=c.adj[south].filter(id=>id!==c.spawnId);
  for(let row=0;row<n;row++)for(let col=0;col<n;col++){
    const id=row*n+col,x=x0+(col+.5)*cell,z=z0+(row+.5)*cell,onSpine=c.rank[id]>=0,room={id,col,r:row,x,z,x0:x-cell/2,x1:x+cell/2,z0:z-cell/2,z1:z+cell/2,template:featured.get(id)||null,landmark:featured.has(id),primary:onSpine};c.rooms.push(room);
    for(const[b,axis,wx,wz]of[[col<n-1?id+1:-1,'z',x+cell/2,z],[row<n-1?id+n:-1,'x',x,z+cell/2]]){
      if(b<0||merged.has(graph.key(id,b)))continue;const e=c.edges.get(graph.key(id,b)),th=e?.primary?.85:.6;let width=e?.width||0,off=e?.offset||0;
      if(b===c.spawnId&&id===c.spawnId-n){width=2.9;off=.35;}
      if(b===c.spawnId&&id===c.spawnId-1){width=2.05;off=-.95;}
      if(id===c.spawnId&&b===c.spawnId+1){width=2.05;off=-1.05;}
      if(!width)addWall(wx,wz,axis==='x'?cell+.85:.65,axis==='z'?cell+.85:.65);
      else{for(const[a,z2]of[[-cell/2-.425,off-width/2],[off+width/2,cell/2+.425]]){const mid=(a+z2)/2,len=z2-a;addWall(wx+(axis==='x'?mid:0),wz+(axis==='z'?mid:0),axis==='x'?len:th,axis==='z'?len:th);}const door={a:id,b,x:wx+(axis==='x'?off:0),z:wz+(axis==='z'?off:0),axis,width,primary:e.primary,thickness:th};c.doors.push(door);e.door=door;}
    }
    // Consistent distant light is a soft preference, not a uniformly lit breadcrumb trail.
    const dark=!onSpine&&((col*13+row*7)%11<3),dead=dark||(onSpine?c.rank[id]%6===3:rnd()<.2);room.dark=dead;
    c.fixtures.push({x:id===c.spawnId?x-2.4:x+(rnd()-.5)*.7,z:id===c.spawnId?z-2.05:z+(rnd()-.5)*.7,y:ceiling-.04,dead,gain:onSpine?1.05+.3*c.rank[id]/c.spine.length:.65+rnd()*.45,room:id});
  }
  for(const f of c.fixtures){f.x=x0+(Math.floor((f.x-x0)/1.25)+.5)*1.25;f.z=z0+(Math.floor((f.z-z0)/1.25)+.5)*1.25;}
  addWall(spawnRoom.x-1.25,spawnRoom.z-1.4,1.7,.65);
  for(const item of c.compositions)composeClassicTemplate(item.type,item,addWall,c);
  for(const id of c.exitRooms){const r=c.rooms[id];for(const dz of[-1.7,1.7])addWall(x0+.75,r.z+dz,1.0,1.0);addWall(x0+.75,r.z,1.0,4.05,.5,ceiling-.5);r.landmark=true;}
  addWall(x0+size/2,z0,size+.85,.85);addWall(x0+size/2,z0+size,size+.85,.85);addWall(x0+size,z0+size/2,.85,size);
  c.wallIndex=new ClassicIndex(c.walls);
  // Keep the original reusable domestic library, concentrated in optional rooms and short discoveries.
  const freeRooms=shuffled(c.rooms.filter(r=>!r.primary&&!r.template&&Math.hypot(r.x-c.spawn.x,r.z-c.spawn.z)>15),rnd).sort((a,b)=>Number(c.adj[b.id].length===1)-Number(c.adj[a.id].length===1));
  let cluster=0;for(const r of freeRooms){if(c.props.length>=128)break;for(let j=0;j<4;j++){const type=HOUSEHOLD_TYPES[(cluster*4+j)%HOUSEHOLD_TYPES.length],x=r.x+[-1.7,1.7,-1.7,1.7][j],z=r.z+[-1.7,-1.7,1.7,1.7][j],bound={x0:x-.78,x1:x+.78,z0:z-.65,z1:z+.65};if(c.wallIndex.near(x,z,1).some(w=>w.x0<bound.x1&&w.x1>bound.x0&&w.z0<bound.z1&&w.z1>bound.z0))continue;c.props.push({id:'house_'+c.props.length,type,x,z,y:0,rot:j%2?-.35:.25,cluster});}cluster++;}
  const chairRoom=c.spine.slice(5,16).map(id=>c.rooms[id]).find(r=>!c.wallIndex.near(r.x-1.7,r.z+1.7,.5).some(w=>w.y0<1.2&&w.x0<r.x-1.2&&w.x1>r.x-2.2&&w.z0<r.z+2.2&&w.z1>r.z+1.2))||c.rooms[c.spine[8]];c.props.push({id:'alone',type:'chair',x:chairRoom.x-1.7,z:chairRoom.z+1.7,y:0,rot:Math.PI,cluster:-1});
  for(const d of c.dreams)if(!['black_aperture','bridge_well','corridor_shaft'].includes(d.type))for(const f of c.fixtures)if(d.ids.includes(f.room)){f.dead=false;f.gain=.9;}
  for(const p of c.pits)c.fixtures.push({x:(p.x0+p.x1)/2,z:(p.z0+p.z1)/2,y:ceiling-.04,dead:false,gain:.9});
  const look=(a,b)=>({x:a.x,z:a.z,yaw:Math.atan2(a.x-b.x,a.z-b.z)}),firstComp=c.compositions[0],dark=c.rooms.find(r=>r.dark&&!r.template),dream=c.dreams.find(d=>d.type==='doorway_recurrence');
  c.views={spawn:{x:c.spawn.x,z:c.spawn.z-1.9,yaw:0},corridor:{x:spawnRoom.x+.8,z:spawnRoom.z-3.6,yaw:0},intersection:look({x:firstComp.x-4,z:firstComp.z+4},firstComp),dark:{x:dark.x,z:dark.z,yaw:0},lit:{x:chairRoom.x,z:chairRoom.z,yaw:0},dream:{x:dream.x,z:dream.z+5.1,yaw:0},pit:{x:c.pits[0].x0-1.1,z:(c.pits[0].z0+c.pits[0].z1)/2,yaw:-Math.PI/2},props:{x:c.props[0].x+1.1,z:c.props[0].z+1.1,yaw:.8},exit:{x:c.rooms[c.exitRooms[0]].x,z:c.rooms[c.exitRooms[0]].z,yaw:Math.PI/2}};
  for(const v of Object.values(c.views)){const clear=(x,z)=>!classicPitAt(c,x,z)&&!c.wallIndex.near(x,z,.38).some(w=>w.y0<1.7&&w.y1>0&&x>w.x0-.38&&x<w.x1+.38&&z>w.z0-.38&&z<w.z1+.38);if(!clear(v.x,v.z)){let found=false;for(let r=.625;r<=4&&!found;r+=.625)for(let i=0;i<16;i++){const x=v.x+Math.cos(i*Math.PI/8)*r,z=v.z+Math.sin(i*Math.PI/8)*r;if(clear(x,z)){v.x=x;v.z=z;found=true;break;}}}}
  c.stats={rooms:c.rooms.length,passages:c.doors.length,cycles:c.edges.size-c.rooms.length+1,props:c.props.length,types:new Set(c.props.map(p=>p.type)).size,dreams:c.dreams.length,pits:c.pits.length,templates:c.compositions.length};c.metrics=graphMetrics(c);return c;
}
export function extendClassicDistrict(map) {
  const c=buildClassicLayout(map.seed),oldX=map.spanX,oldElev={...map.ELEVATOR};
  map.legacyBounds={x0:0,z0:0,x1:map.spanX,z1:map.spanZ};map.legacyElevator=oldElev;
  // Preserve all legacy zones, objectives, props and entrances. Only the movable starting cabin relocates.
  const dx=c.elevator.x-oldElev.x,dz=c.elevator.z-oldElev.z;
  Object.assign(map.ELEVATOR,{x:c.elevator.x,z:c.elevator.z,btnX:map.ELEVATOR.btnX+dx,btnZ:map.ELEVATOR.btnZ+dz});
  Object.assign(map.SPAWN,{x:c.spawn.x,z:c.spawn.z,c:Math.floor(c.spawn.x/map.cellSize),r:Math.floor(c.spawn.z/map.cellSize)});
  for(const b of map.RECTS)if(b.kind==='elevatorWall'||b.elevatorDoor){b.x0+=dx;b.x1+=dx;b.z0+=dz;b.z1+=dz;}
  // The rear-world placard remains at the original legacy hub, rather than following the relocated cabin.
  const cuts=[];
  for(const roomId of c.exitRooms){
    const coreZ=c.rooms[roomId].z,half=1.625;
    const spots=map.SPOTS.filter(s=>s.x>oldX-10&&Math.abs(s.z-coreZ)<24).sort((a,b)=>Math.abs(a.z-coreZ)-Math.abs(b.z-coreZ));
    const sp=spots.find(s=>!map.RECTS.some(b=>!b.hidden&&b.kind!=='perim'&&b.y1>1&&segmentHitsBox(s.x,s.z,oldX-.7,s.z,b,.44)))||spots[0];
    if(!sp)throw Error('Missing safe legacy connection');
    const entry={x:c.x0+.8,z:coreZ,oldX:sp.x,legacyZ:sp.z,row:c.rooms[roomId].r};
    entry.path=[[c.x0+.8,coreZ],[c.x0-20,coreZ],[c.x0-20,coreZ+6],[oldX+20,coreZ+6],[oldX+20,sp.z],[sp.x,sp.z]];
    entry.metres=entry.path.slice(1).reduce((sum,p,i)=>sum+Math.hypot(p[0]-entry.path[i][0],p[1]-entry.path[i][1]),0);
    const geometryPath=entry.path.map(p=>[...p]);geometryPath.at(-1)[0]=oldX-.8;
    const rects=[];for(let i=1;i<geometryPath.length;i++){const[a,b]=[geometryPath[i-1],geometryPath[i]];rects.push({x0:Math.min(a[0],b[0])-half,x1:Math.max(a[0],b[0])+half,z0:Math.min(a[1],b[1])-half,z1:Math.max(a[1],b[1])+half});}
    // Build the union outline, so solid corridor corners never close the path at elbows.
    const xs=[...new Set(rects.flatMap(r=>[Math.max(oldX-.8,r.x0),Math.min(c.x0,r.x1)]))].sort((a,b)=>a-b),zs=[...new Set(rects.flatMap(r=>[r.z0,r.z1]))].sort((a,b)=>a-b);
    const inside=(x,z)=>rects.some(r=>x>=r.x0&&x<=r.x1&&z>=r.z0&&z<=r.z1);
    entry.floors=[];
    for(let zi=0;zi<zs.length-1;zi++)for(let xi=0;xi<xs.length-1;xi++){
      const x0=xs[xi],x1=xs[xi+1],z0=zs[zi],z1=zs[zi+1],x=(x0+x1)/2,z=(z0+z1)/2;if(!inside(x,z))continue;
      entry.floors.push({x0,x1,z0,z1,ceiling:3.8});
      for(const[vertical,edge,length,side]of[[true,x0,z1-z0,-1],[true,x1,z1-z0,1],[false,z0,x1-x0,-1],[false,z1,x1-x0,1]]){
        const ox=vertical?edge+side*.01:x,oz=vertical?z:edge+side*.01;if(inside(ox,oz)&&ox>oldX-.81&&ox<c.x0+.01)continue;
        if(vertical&&(Math.abs(edge-(oldX-.8))<.01||Math.abs(edge-c.x0)<.01))continue;
        c.addWall(vertical?edge:x,vertical?z:edge,vertical?.55:length+.25,vertical?length+.25:.55,3.8);
      }
    }
    for(let i=1;i<geometryPath.length;i++){const a=geometryPath[i-1],b=geometryPath[i],length=Math.hypot(b[0]-a[0],b[1]-a[1]);for(let t=3;t<length;t+=7){const x=a[0]+(b[0]-a[0])*t/length,z=a[1]+(b[1]-a[1])*t/length;c.fixtures.push({x,z,y:3.76,dead:false,gain:.78,connector:true});}}
    for(const w of map.RECTS.filter(b=>b.kind==='perim'&&Math.abs(b.x0-(oldX-.52))<.02&&b.z0<sp.z&&b.z1>sp.z))map.RECTS.splice(map.RECTS.indexOf(w),1,{...w,z1:sp.z-half},{...w,z0:sp.z+half});
    c.addWall(c.x0,coreZ,.55,half*2,3.8-c.ceiling,c.ceiling,'transitionFascia');c.connectors.push(entry);cuts.push([coreZ-half,coreZ+half]);
  }
  cuts.sort((a,b)=>a[0]-b[0]);let last=c.z0;for(const[a,b]of cuts){c.addWall(c.x0,(last+a)/2,.55,a-last);last=b;}c.addWall(c.x0,(last+c.z1)/2,.55,c.z1-last);
  // Original low split-level compositions use the same terrain/collision system.
  for(const d of c.decks)map.PLATFORMS.push({...d,classic:true,surface:'carpet'});
  for(const st of c.stairs){map.RAMPS.push({x0:st.x-st.width/2,x1:st.x+st.width/2,z0:st.z,z1:st.z+st.steps*st.run,y0:0,y1:st.steps*st.rise,axis:'z',classic:true});}
  // Simplified solid footprints; collide() uses their true vertical span during a fall.
  for(const p of c.props){const big=['sofa','mattress','table','folding_table','bench'].includes(p.type),w=big?1.7:.72,d=big?.85:.64;c.walls.push({x0:p.x-w/2,x1:p.x+w/2,z0:p.z-d/2,z1:p.z+d/2,y0:p.y,y1:p.y+1.05,minY:p.y,maxY:p.y+1.05,hidden:true,classic:true,prop:true});}
  const obstacle=(x,z,w,d,h,y0=0)=>c.walls.push({x0:x-w/2,x1:x+w/2,z0:z-d/2,z1:z+d/2,y0,y1:y0+h,minY:y0,maxY:y0+h,classic:true,hidden:true,skipRender:true});
  for(const d of c.dreams){
    if(d.type==='hollow_columns')for(const [x,z]of[[-3,-3],[3,-2],[-2,3],[3,3]])for(const [ox,oz,w,dep]of[[-.38,0,.16,.92],[.38,0,.16,.92],[0,-.38,.6,.16]])obstacle(d.x+x+ox,d.z+z+oz,w,dep,2.9);
    if(d.type==='doorway_recurrence')for(let i=0;i<5;i++)for(const x of[-1.3,1.3])obstacle(d.x+x,d.z-4+i*2,.3,.25,2.9);
    if(d.type==='suspended_domestic'){map.PLATFORMS.push({x0:d.x-2,x1:d.x+2,z0:d.z-1.5,z1:d.z+1.5,y:.59,surface:'wood',classic:true});obstacle(d.x,d.z+.6,1.65,.6,1.1,.59);}
    if(d.type==='stair_to_false_landing'){map.RAMPS.push({x0:d.x-2.16,x1:d.x+.15,z0:d.z-.625,z1:d.z+.625,y0:0,y1:1.26,axis:'x',classic:true});map.PLATFORMS.push({x0:d.x-.15,x1:d.x+1.05,z0:d.z-.625,z1:d.z+.625,y:1.225,classic:true});obstacle(d.x+.95,d.z,.2,1.8,1.9,.97);}
  }
  for(const p of c.pits){for(const b of [{x0:p.x0-.18,x1:p.x0,z0:p.z0,z1:p.z1},{x0:p.x1,x1:p.x1+.18,z0:p.z0,z1:p.z1},{x0:p.x0,x1:p.x1,z0:p.z0-.18,z1:p.z0},{x0:p.x0,x1:p.x1,z0:p.z1,z1:p.z1+.18}])c.walls.push({...b,y0:-p.depth,y1:-.03,minY:-p.depth,maxY:-.03,classic:true,hidden:true,shaft:true});}
  map.RECTS.push(...c.walls);map.wallGrid.build(map.RECTS);map.classic=c;map.spanX=c.x1;map.worldSpan=Math.max(map.spanX,map.spanZ);
  c.wallIndex=new ClassicIndex(c.walls.filter(w=>!w.prop&&!w.shaft));
  c.lightIndex=new ClassicIndex(c.fixtures.filter(f=>!f.dead).map(f=>({...f,x0:f.x,x1:f.x,z0:f.z,z1:f.z})));
  return c;
}
export function classicRoute(c,sx,sz,tx,tz) {
  const n=c.count,id=(x,z)=>Math.max(0,Math.min(n-1,Math.floor((z-c.z0)/c.step)))*n+Math.max(0,Math.min(n-1,Math.floor((x-c.x0)/c.step)));
  const a=id(sx,sz),b=id(tx,tz),parent=new Int32Array(n*n).fill(-1),q=[a];parent[a]=a;
  for(let i=0;i<q.length&&parent[b]<0;i++)for(const next of c.adj[q[i]])if(parent[next]<0){parent[next]=q[i];q.push(next);}
  if(parent[b]<0)return[];const route=[];for(let v=b;v!==a;v=parent[v])route.push(v);route.reverse();const pts=[];let prev=a;
  for(const next of route){const e=c.edges.get(Math.min(prev,next)+':'+Math.max(prev,next));if(e?.door)pts.push([e.door.x,e.door.z]);const r=c.rooms[next];pts.push([r.x,r.z]);prev=next;}pts.push([tx,tz]);return pts;
}

export function inClassicPresentation(c,x,z){return inClassic(c,x,z)||!!c?.connectors.some(con=>con.floors.some(r=>x>=r.x0&&x<=r.x1&&z>=r.z0&&z<=r.z1));}
