/* Copyright (c) 2026 Vendreith. Guided nonlinear introductory level graph. */
export function shuffled(list,rnd){for(let i=list.length-1;i>0;i--){const j=Math.floor(rnd()*(i+1));[list[i],list[j]]=[list[j],list[i]];}return list;}
export function makeClassicGraph(n,rnd){
  const id=(x,z)=>z*n+x,key=(a,b)=>Math.min(a,b)+':'+Math.max(a,b),adj=Array.from({length:n*n},()=>[]),edges=new Map(),spine=[];
  const anchors=[[22,11],[22,8],[16,8],[16,12],[9,12],[9,9],[0,9]];
  let [x,z]=anchors[0];spine.push(id(x,z));for(const [tx,tz]of anchors.slice(1)){while(x!==tx||z!==tz){x+=Math.sign(tx-x);z+=Math.sign(tz-z);spine.push(id(x,z));}}
  const rank=new Int16Array(n*n).fill(-1),owner=new Int16Array(n*n).fill(-1),depth=new Int16Array(n*n).fill(-1);
  const link=(a,b,primary=false)=>{const k=key(a,b);if(edges.has(k)){if(primary)edges.get(k).primary=true;return;}edges.set(k,{a,b,primary,width:primary?3.5:1.7+rnd()*.15,offset:(rnd()-.5)*(primary?.25:1.1)});adj[a].push(b);adj[b].push(a);};
  spine.forEach((a,i)=>{rank[a]=owner[a]=i;depth[a]=0;if(i)link(spine[i-1],a,true);});
  const neighbours=a=>{const x=a%n,z=a/n|0;return[x>0?a-1:-1,x<n-1?a+1:-1,z>0?a-n:-1,z<n-1?a+n:-1].filter(v=>v>=0);};
  // Multi-source growth attaches every side room to a nearby stage of progression.
  const queue=[5,13,23,28].map(i=>spine[i]);for(let i=0;i<queue.length;i++){const a=queue[i],opts=shuffled(neighbours(a),rnd);for(const b of opts)if(owner[b]<0){owner[b]=owner[a];depth[b]=depth[a]+1;link(a,b);queue.push(b);}}
  // Each optional gateway gets a nearby wider return to the next stage, rather than a one-way maze mouth.
  for(const gate of[5,13,23,28]){const next=spine[Math.min(spine.length-1,gate+2)],back=neighbours(next).filter(id=>rank[id]<0&&owner[id]===gate).sort((a,b)=>depth[a]-depth[b])[0];if(back!==undefined){link(back,next);edges.get(key(back,next)).width=2.65;}}
  for(const gate of[5,13,23,28]){
    const start=spine[gate],end=spine[gate+2],parent=new Int16Array(n*n).fill(-1),q=[start];parent[start]=start;
    for(let i=0;i<q.length&&parent[end]<0;i++)for(const b of neighbours(q[i]))if(parent[b]<0&&(rank[b]<0||b===end)){parent[b]=q[i];q.push(b);}
    if(parent[end]>=0){const loop=[];for(let a=end;a!==start;a=parent[a])loop.push(a);loop.reverse();let a=start;for(let i=0;i<loop.length;i++){const b=loop[i];link(a,b);const e=edges.get(key(a,b));e.width=i===0?2.1:3.0;e.offset=0;e.guidedLoop=true;a=b;}}
  }
  for(let a=0;a<n*n;a++)for(const b of neighbours(a))if(b>a&&(owner[a]===owner[b]||(Math.abs(owner[a]-owner[b])<=2&&Math.min(depth[a],depth[b])<=1))&&rnd()<.32)link(a,b);
  // Long optional limbs become loops; short deliberate leaves remain discoveries.
  for(let pass=0;pass<4;pass++)for(let a=0;a<n*n;a++)if(adj[a].length===1&&depth[a]>2){const options=neighbours(a).filter(b=>!adj[a].includes(b)&&Math.abs(owner[a]-owner[b])<=12);if(options.length)link(a,options[rnd()*options.length|0]);}
  // Secondary departure rejoins the late part of the spine rather than bypassing the introduction.
  let a=id(2,9);for(const [tx,tz]of [[2,13],[0,13]]){let x=a%n,z=a/n|0;while(x!==tx||z!==tz){const b=id(x+Math.sign(tx-x),z+Math.sign(tz-z));link(a,b);a=b;x=a%n;z=a/n|0;}}
  return{adj,edges,spine,rank,owner,depth,link,exitRooms:[id(0,9),id(0,13)],spawnId:id(22,11),key};
}
export function graphMetrics(c){
  const {adj,spine,exitRooms}=c,dist=new Int32Array(adj.length).fill(-1),q=[c.spawnId];dist[q[0]]=0;for(let i=0;i<q.length;i++)for(const b of adj[q[i]])if(dist[b]<0){dist[b]=dist[q[i]]+1;q.push(b);}
  const depths=[];for(let a=0;a<adj.length;a++)if(adj[a].length===1&&!exitRooms.includes(a)){let previous=-1,current=a,d=0;while(adj[current].length<=2&&d<adj.length){const next=adj[current].find(b=>b!==previous);if(next==null)break;previous=current;current=next;d++;if(adj[current].length!==2)break;}depths.push(d*c.step);}
  return{accessibleRooms:q.length,shortestCoreMetres:Math.min(...exitRooms.map(id=>dist[id]*c.step)),primaryMetres:(spine.length-1)*c.step,intersections:adj.filter(a=>a.length>=3).length,deadEnds:depths.length,averageDeadEndMetres:depths.reduce((a,b)=>a+b,0)/Math.max(1,depths.length),maxDeadEndMetres:Math.max(0,...depths),reconnections:c.edges.size-adj.length+1,primaryCompositions:new Set(spine.map(id=>c.rooms[id].template).filter(Boolean)).size};
}
// Collapse unpartitioned quadrants: virtual cell borders are not decisions a player sees.
export function explorationGraph(c){
 const parent=Array.from({length:c.rooms.length},(_,i)=>i),find=a=>parent[a]===a?a:(parent[a]=find(parent[a]));
 for(const e of c.edges.values())if(!e.door)parent[find(e.a)]=find(e.b);
 const spaces=new Map();for(const r of c.rooms){const id=find(r.id);if(!spaces.has(id))spaces.set(id,{id,rooms:[],adj:new Map(),x:0,z:0,light:.27,landmark:false});const s=spaces.get(id);s.rooms.push(r.id);s.x+=r.x;s.z+=r.z;s.landmark||=r.landmark;}
 for(const s of spaces.values()){s.x/=s.rooms.length;s.z/=s.rooms.length;s.light=Math.max(.27,...c.fixtures.filter(f=>s.rooms.includes(f.room)&&!f.dead).map(f=>f.gain));}
 for(const d of c.doors){const a=spaces.get(find(d.a)),b=spaces.get(find(d.b));if(a===b)continue;for(const[from,to]of[[a,b],[b,a]]){const existing=from.adj.get(to.id);if(!existing||d.width>existing.width)from.adj.set(to.id,{next:to.id,width:d.width,distance:Math.hypot(from.x-d.x,from.z-d.z)+Math.hypot(to.x-d.x,to.z-d.z)});}}
 return{spaces,start:find(c.spawnId),exits:c.exitRooms.map(find)};
}
// Only visible opening width, illumination, landmarks and visit history; no route rank or exit-distance oracle.
export function exploreClassic(c,seed,steps=1200){
 const g=explorationGraph(c);let state=seed|0;const random=()=>{state=Math.imul(state,1664525)+1013904223|0;return(state>>>0)/4294967296;};const visits=new Map(),walk=[g.start];let current=g.start,previous=-1,metres=0;
 for(let i=0;i<steps&&!g.exits.includes(current);i++){
  visits.set(current,(visits.get(current)||0)+1);const opts=[...g.spaces.get(current).adj.values()].map(e=>{const room=g.spaces.get(e.next);return{...e,score:e.width**5*(.65+room.light)*(1+(()=>{if(previous<0)return 0;const from=g.spaces.get(previous),at=g.spaces.get(current),dx=at.x-from.x,dz=at.z-from.z,tx=room.x-at.x,tz=room.z-at.z;return .8*Math.max(0,(dx*tx+dz*tz)/Math.max(.001,Math.hypot(dx,dz)*Math.hypot(tx,tz)));})())*Math.pow(.65,Math.min(5,visits.get(e.next)||0))*(e.next===previous?.13:1)*(room.landmark?1.12:1)};});
  let choice=opts.reduce((best,o)=>o.score>best.score?o:best);if(random()<.08){let pick=random()*opts.reduce((s,o)=>s+o.score,0);for(const o of opts){pick-=o.score;if(pick<=0){choice=o;break;}}}previous=current;current=choice.next;metres+=choice.distance;walk.push(current);
 }return{found:g.exits.includes(current),steps:walk.length-1,metres,visited:new Set(walk).size,walk};
}
