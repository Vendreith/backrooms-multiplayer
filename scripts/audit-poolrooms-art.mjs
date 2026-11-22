import {mkdirSync,writeFileSync} from 'node:fs';
import * as THREE from '../node_modules/three/build/three.module.js';
import {POOL_ZONE_DEFS} from '../src/levels/poolrooms_zones.js';
import {buildPoolroomsV4World} from '../src/levels/poolrooms_v4_world.js';
import {createPoolArtGeometry} from '../src/levels/poolrooms_art_mesh.js';
const lists=Object.fromEntries(['RECTS','WALLS','WATER_RECTS','PLATFORMS','RAMPS','SLIDES','PROPS','ANIM_PROPS','LIGHTS'].map(k=>[k,[]]));
const map={...lists,...buildPoolroomsV4World({...lists,zones:POOL_ZONE_DEFS.map(z=>({...z,bounds:{...z.bounds}}))})};
const topology=[];
for(const a of [...map.POOL_ARCH,...map.POOL_WATERPARK,...map.WATER_RECTS.filter(w=>w.shape==='ellipse').map(w=>({...w,kind:'basin_bed'}))]){if(a.render===false)continue;const g=createPoolArtGeometry(a,THREE);if(!g)continue;const p=g.attributes.position,idx=g.index,edges=new Map();
 const key=i=>[p.getX(i),p.getY(i),p.getZ(i)].join(',');
 for(let j=0;j<idx.count;j+=3){const ids=[idx.getX(j),idx.getX(j+1),idx.getX(j+2)];for(let k=0;k<3;k++){const va=ids[k],vb=ids[(k+1)%3],ka=key(va),kb=key(vb);if(ka===kb)continue;const e=ka<kb?ka+'|'+kb:kb+'|'+ka;if(!edges.has(e))edges.set(e,{n:0,va,vb});edges.get(e).n++;}}
 let boundary=0,unexpected=0,nonmanifold=0;for(const {n,va,vb}of edges.values()){
  if(n>2)nonmanifold++;if(n!==1)continue;boundary++;
  const socket=a.kind==='tube_union'&&[['x',a.x0],['x',a.x1],['z',a.z0],['z',a.z1]].some(([axis,v])=>Math.abs((axis==='x'?p.getX(va):p.getZ(va))-v)<.002&&Math.abs((axis==='x'?p.getX(vb):p.getZ(vb))-v)<.002);
  if(!socket)unexpected++;
 }
 topology.push({kind:a.kind,zone:a.zoneId||null,triangles:idx.count/3,boundary,unexpected,nonmanifold});g.dispose();
}
const designs=map.POOL_CELLS.filter(c=>c.art).map(c=>{
 const inside=a=>{const x=a.cx??a.x??((a.x0+a.x1)/2),z=a.cz??a.z??((a.z0+a.z1)/2);return x>=c.x0&&x<=c.x1&&z>=c.z0&&z<=c.z1;};
 const parts=map.POOL_ARCH.filter(inside),platforms=map.PLATFORMS.filter(inside),waters=map.WATER_RECTS.filter(inside);
 const kinds=Object.fromEntries([...new Set(parts.map(p=>p.kind))].sort().map(t=>[t,parts.filter(p=>p.kind===t).length]));
 return {zone:c.zoneId,brief:c.art,width:c.width,depth:c.depth,ceiling:c.ceiling,portalCount:c.portals.length,kinds,pools:waters.length,poolLayout:waters.map(w=>[Math.round((w.cx-c.x)*10)/10,Math.round((w.cz-c.z)*10)/10,w.rx,w.rz,w.waterY]),elevations:[...new Set(platforms.map(p=>Math.round(p.y*10)/10))].sort((a,b)=>a-b),references:c.art.refs};
});
const similar=[];for(let i=0;i<designs.length;i++)for(let j=i+1;j<designs.length;j++){const a=designs[i],b=designs[j],matches={footprint:a.width===b.width&&a.depth===b.depth,ceiling:a.ceiling===b.ceiling,poolCount:a.pools===b.pools,elevations:JSON.stringify(a.elevations)===JSON.stringify(b.elevations),parts:JSON.stringify(a.kinds)===JSON.stringify(b.kinds),sockets:a.portalCount===b.portalCount};if(Object.values(matches).filter(Boolean).length>=4)similar.push({a:a.zone,b:b.zone,matches,review:'Review both clean and footage views; compare actual pool placement, partition paths and roof silhouettes. No uniqueness claim from colour or grammar labels.'});}
const report={method:'Per-primitive exact Float32 welded position edges. Tube boundaries at the four cell socket planes are intended. Similarity flags require at least four exact matches among six explicitly listed geometric/graph fields; no aesthetic score.',topology:{primitives:topology.length,unexpectedBoundaryEdges:topology.reduce((s,t)=>s+t.unexpected,0),nonmanifoldEdges:topology.reduce((s,t)=>s+t.nonmanifold,0),intentionalTubeBoundaryEdges:topology.filter(t=>t.kind==='tube_union').reduce((s,t)=>s+t.boundary-t.unexpected,0),failures:topology.filter(t=>t.unexpected||t.nonmanifold)},inventory:designs,similar};
report.manualReviews=similar.filter(p=>p.a==='zone_u'&&p.b==='zone_af').map(p=>({...p,resolution:'Retain the automatic similarity flag. U has two opposed apses and two end pools; AF has five alternating pointed/round arcades and one off-centre pool. Clean/footage views show different roof silhouettes, pool arrangements and paths. Shared26×28m footprint and8m ceiling are accepted; colour is not evidence of uniqueness.'}));

mkdirSync('research/poolrooms/v5',{recursive:true});
writeFileSync('research/poolrooms/v5/architecture-audit.json',JSON.stringify(report,null,2));console.log(JSON.stringify({topology:report.topology,zones:designs.length,similar:similar.length},null,2));if(report.topology.unexpectedBoundaryEdges||report.topology.nonmanifoldEdges)process.exitCode=1;
