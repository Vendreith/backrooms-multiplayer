/* Copyright (c) 2026 Vendreith. Deterministic, navigable large-world environmental clusters. */
import {ENV_LIBRARY,ENV_FAMILIES} from './environment_library.js';
const overlap=(a,b,pad=0)=>a.x0<b.x1+pad&&a.x1>b.x0-pad&&a.z0<b.z1+pad&&a.z1>b.z0-pad&&a.y0<b.y1-.015&&a.y1>b.y0+.015;
const rng=seed=>()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};
const shuffle=(a,r)=>{for(let i=a.length-1;i>0;i--){const j=r()*(i+1)|0;[a[i],a[j]]=[a[j],a[i]];}return a;};
export function environmentBoxes(recipe,x,y,z,rot=0){
 const cs=Math.round(Math.cos(rot)),sn=Math.round(Math.sin(rot));
 const local=recipe.passThrough?recipe.parts.map(p=>{const rz=p.rz||0,rx=p.rx||0,c=Math.abs(Math.cos(rz)),s=Math.abs(Math.sin(rz)),h=p.h*c+p.w*s;return{x0:p.x-(p.w*c+p.h*s)/2,x1:p.x+(p.w*c+p.h*s)/2,z0:p.z-(p.d*Math.abs(Math.cos(rx))+h*Math.abs(Math.sin(rx)))/2,z1:p.z+(p.d*Math.abs(Math.cos(rx))+h*Math.abs(Math.sin(rx)))/2,y0:p.y-(h*Math.abs(Math.cos(rx))+p.d*Math.abs(Math.sin(rx)))/2,y1:p.y+(h*Math.abs(Math.cos(rx))+p.d*Math.abs(Math.sin(rx)))/2};}):[recipe.bounds];
 return local.map(b=>{const cx=(b.x0+b.x1)/2,cz=(b.z0+b.z1)/2,w=(b.x1-b.x0)/2,d=(b.z1-b.z0)/2,wx=x+cx*cs+cz*sn,wz=z+cz*cs-cx*sn,hw=Math.abs(cs)*w+Math.abs(sn)*d,hd=Math.abs(cs)*d+Math.abs(sn)*w;return{x0:wx-hw,x1:wx+hw,z0:wz-hd,z1:wz+hd,y0:y+b.y0,y1:y+b.y1,minY:y+b.y0,maxY:y+b.y1};});
}
export function populateEnvironment(map,terrainAt){
 const cols=map.gridCols,rows=map.gridRows,reachable=new Uint8Array(cols*rows),connection=map.classic.connectors[0],queue=[Math.floor(connection.legacyZ/map.cellSize)*cols+Math.floor(connection.oldX/map.cellSize)],pass=v=>v===0||v===3;reachable[queue[0]]=1;
 for(let i=0;i<queue.length;i++){const a=queue[i],x=a%cols,z=a/cols|0;for(const[b,open]of[[z>0?a-cols:-1,pass(map.hEdges[z]?.[x])],[z<rows-1?a+cols:-1,pass(map.hEdges[z+1]?.[x])],[x>0?a-1:-1,pass(map.vEdges[z]?.[x])],[x<cols-1?a+1:-1,pass(map.vEdges[z]?.[x+1])]])if(b>=0&&open&&!map.cellSolid[b/cols|0][b%cols]&&!reachable[b]){reachable[b]=1;queue.push(b);}}
 const random=rng(map.seed^0x12e7a91),C=map.cellSize,instances=[],colliders=[],occupied=new Map(),counts={},zones=map.ZONES.map((zone,id)=>{
   const t=zone.type,profile=/blackout|silent|whiteout|monolith/.test(t)?'sparse':/office|archive|filing|utility|boiler|freight|basement|laundromat|breaker|storage|service/.test(t)?'dense':/colonnade|museum|gallery|atrium|rotunda/.test(t)?'landmark':'moderate';
   const family=/pool|flood|aquatic|fountain|sump/.test(t)?'aquatic':/office|archive|filing|bullpen|diner|library/.test(t)?'office':/utility|pipe|red_city|boiler|freight|basement|breaker|service|plenum/.test(t)?'industrial':/gallery|museum|monolith|glitch|rotunda|atrium|sculpt|still_life/.test(t)?'dream':'domestic';
   return{id,type:t,label:zone.label||t,profile,family,spots:[],count:0,clusters:[]};});
 for(const sp of map.SPOTS){if(!reachable[sp.r*cols+sp.c])continue;const obstructed=[...map.wallGrid.queryNear(sp.x,sp.z,.44)].some(b=>{if((b.minY??b.y0??0)>=1.72||(b.maxY??b.y1??4.2)<=.15)return false;const x=sp.x-Math.max(b.x0,Math.min(sp.x,b.x1)),z=sp.z-Math.max(b.z0,Math.min(sp.z,b.z1));return x*x+z*z<.44*.44;});if(obstructed)continue;const index=map.ZONES.findIndex(z=>sp.c>=z.c0&&sp.c<=z.c1&&sp.r>=z.r0&&sp.r<=z.r1);if(index>=0)zones[index].spots.push(sp);}
 const reserved=[...map.ENTRANCES,...map.TASKS,...map.HOOKS,...map.WATERS,...map.SCANS,...map.JELLIES,...map.RATIONS,...map.FLARES,...map.RELICS];
 const key=(x,z)=>Math.floor(x/5)+','+Math.floor(z/5),query=b=>{const set=new Set();for(let z=Math.floor(b.z0/5);z<=Math.floor(b.z1/5);z++)for(let x=Math.floor(b.x0/5);x<=Math.floor(b.x1/5);x++)for(const p of occupied.get(x+','+z)||[])set.add(p);return set;};
 const occupy=b=>{for(let z=Math.floor(b.z0/5);z<=Math.floor(b.z1/5);z++)for(let x=Math.floor(b.x0/5);x<=Math.floor(b.x1/5);x++){const k=x+','+z;if(!occupied.has(k))occupied.set(k,[]);occupied.get(k).push(b);}};
 const protectedLane=b=>{const low=b.y0<1.95&&b.y1>.12;if(!low)return false;for(const[lo,hi]of[[b.x0,b.x1],[b.z0,b.z1]]){const a=Math.ceil((lo-.56)/C-.5),last=Math.floor((hi+.56)/C-.5);if(a<=last)return true;}return false;};
 const canPlace=(recipe,x,y,z,rot)=>{
   const boxes=environmentBoxes(recipe,x,y,z,rot);for(const b of boxes){
    if(b.x0<1||b.x1>map.legacyBounds.x1-1||b.z0<1||b.z1>map.legacyBounds.z1-1||b.y1>map.ceilH-.2)return null;
    if(protectedLane(b))return null;
    const radius=Math.hypot(b.x1-b.x0,b.z1-b.z0)/2+.08,cx=(b.x0+b.x1)/2,cz=(b.z0+b.z1)/2;
    if([...map.wallGrid.queryNear(cx,cz,radius)].some(w=>overlap(b,{...w,y0:w.minY??w.y0??0,y1:w.maxY??w.y1??4.2},.09)))return null;
    if([...query(b)].some(w=>overlap(b,w,.12)))return null;
    if(b.y0<1.95)for(const p of reserved)if(p.x>b.x0-2.3&&p.x<b.x1+2.3&&p.z>b.z0-2.3&&p.z<b.z1+2.3)return null;
    if(b.y0<.2)for(const[px,pz]of[[b.x0,b.z0],[b.x1,b.z0],[b.x0,b.z1],[b.x1,b.z1]]){const col=Math.floor(px/C),row=Math.floor(pz/C);if(map.cellSolid[row]?.[col]!==0)return null;}
   }return boxes;
 };
 const add=(zone,type,sp,cluster,rot=0)=>{
   const recipe=ENV_LIBRARY[type],w=recipe.bounds.x1-recipe.bounds.x0,d=recipe.bounds.z1-recipe.bounds.z0;
   const options=recipe.landmark?[[1.4,1.4],[-1.4,-1.4],[1.3,1.3],[-1.3,1.3],[1.3,.95],[-1.3,-.95]]:[[1,1],[-1,1],[1,-1],[-1,-1]].map(([a,b])=>[a*Math.min(1.85,Math.max(1.12,(rot?d:w)/2+.63)),b*Math.min(1.85,Math.max(1.12,(rot?w:d)/2+.63))]);
   for(const[dx,dz]of options){const x=sp.x+dx,z=sp.z+dz,base=terrainAt(x,z,map,0);if(base.inWater||Math.abs(base.floorY)>.15)continue;const y=Math.max(0,-recipe.bounds.y0),boxes=canPlace(recipe,x,y,z,rot);if(!boxes)continue;
    const object={id:'env_'+instances.length,type,family:zone.family,zone:zone.id,cluster,x,y,z,rot,landmark:recipe.landmark};instances.push(object);zone.count++;counts[type]=(counts[type]||0)+1;
    for(const b of boxes){occupy(b);colliders.push({...b,hidden:true,kind:'environment',environmentId:object.id});}return true;
   }return false;
 };
 for(const zone of zones){shuffle(zone.spots,random);const anchors=[];for(const sp of zone.spots)if(anchors.every(a=>Math.hypot(a.x-sp.x,a.z-sp.z)>10)){anchors.push(sp);if(anchors.length>=Math.max(2,Math.min(8,Math.ceil(zone.spots.length/70))))break;}zone.clusters=anchors.map((sp,i)=>({id:zone.id+'_'+i,x:sp.x,z:sp.z,story:zone.family}));zone.ordered=zone.spots.map(sp=>({sp,d:Math.min(...anchors.map(a=>Math.hypot(a.x-sp.x,a.z-sp.z)))})).sort((a,b)=>a.d-b.d).map(r=>r.sp);}
 // Dominant walk-through structures are placed before ordinary furniture, only where all parts fit.
 const eligible=zones.filter(z=>z.profile!=='sparse'),heroOrder=[...eligible.filter(z=>z.id%2===0),...eligible.filter(z=>z.id%2===1)];
 let hero=0;for(const zone of heroOrder){const type=ENV_FAMILIES.landmark[hero%8];for(const sp of zone.spots.slice(0,180))if(add(zone,type,sp,'landmark',0)){hero++;break;}if(hero>=48)break;}
 const weight=z=>({sparse:.2,dense:2.1,landmark:.65,moderate:1}[z.profile])*(z.spots.length?1:0),totalWeight=zones.reduce((a,z)=>a+weight(z),0),target=4000;
 const familyCounters={domestic:0,office:0,industrial:0,dream:0,aquatic:0};
 for(let pass=0;pass<3&&instances.length<target;pass++)for(const zone of zones){const quota=pass===0?Math.round((target-hero)*weight(zone)/totalWeight)+zone.count:zone.profile==='sparse'?16:zone.count+35;
  const family=ENV_FAMILIES[zone.family];let cursor=zone.cursor||0;while(zone.count<quota&&cursor<zone.ordered.length&&instances.length<target){const sp=zone.ordered[cursor++],cluster=zone.clusters.reduce((best,a)=>Math.hypot(a.x-sp.x,a.z-sp.z)<Math.hypot(best.x-sp.x,best.z-sp.z)?a:best,zone.clusters[0]);for(let attempt=0;attempt<3;attempt++){const type=family[familyCounters[zone.family]++%family.length];if(add(zone,type,sp,cluster?.id||zone.id,random()<.5?0:Math.PI/2))break;}}zone.cursor=cursor;
 }
 map.ENVIRONMENT={instances,colliders,archetypes:Object.keys(ENV_LIBRARY).length,usedArchetypes:Object.keys(counts).length,counts,zones:zones.map(({spots,ordered,cursor,...z})=>z),stats:{instances:instances.length,landmarks:hero,colliders:colliders.length,gridLaneHalfWidth:.56}};
 map.RECTS.push(...colliders);map.wallGrid.build(map.RECTS);return map.ENVIRONMENT;
}
