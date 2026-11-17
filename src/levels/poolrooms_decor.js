/*! Copyright (c) 2026 Vendreith. Licensing: see LICENSE.md and THIRD_PARTY_NOTICES.md. */
import {AQUA_COLORS as C} from './poolrooms_prop_assets.js';
import {getTerrainAt,initTerrainIndex} from './terrain.js';
export const POOL_RICH_ACTIVE=new Set(['AL','AJ','P','I','B','AM','AN','E','A','D','G','J','C','H','K','L','M','N','O','Q','R','S','T','U','V','W','X','Y','Z','AA','AB','AC','AD','AE','AF','AG','AH','AI','AK','F']);
// [curatorial theme, floating/underwater objects, deck equipment, accents, quiet]
export const POOL_DECOR_PROFILES={
 A:['first forgotten swim',['ring','beach_ball'],['depth_marker','bench','goggles'],['cyan','yellow']],
 B:['abandoned pavilion resort',['swan','mattress','ring'],['lounger','table','pool_ladder','shower'],['blue','pink']],
 C:['blue service conduits',['clear_ring'],['rescue_pole','thermometer','depth_marker'],['blue','cyan']],
 D:['submerged spectator toys',['diving_rings','kickboard'],['bench','towel_rack','life_ring'],['lavender','orange']],
 E:['forgotten splash playground',['fish','arm_floaties','beach_ball'],['playground','bucket_fountain','basket','water_jets'],['red','yellow']],
 F:['silent flooded nave',['clear_ring'],['depth_marker','chair'],['blue','white'],true],
 G:['suspended recreation decks',['ring','striped_ball'],['lifeguard_chair','lounger','life_ring'],['red','blue']],
 H:['pump keeper equipment',['cushion'],['cleaning_cart','rescue_pole','storage_cabinet','thermometer'],['orange','green']],
 I:['pastel thermal retreat',['flamingo','cushion'],['lounger','table','towel_rack','shower','bench','thermometer'],['pink','mint']],
 J:['unattended swimming lanes',['lane_divider','kickboard'],['pool_ladder','depth_marker','life_ring','basket'],['blue','red']],
 K:['pristine changing corners',['arm_floaties'],['locker','open_locker','bench'],['green','cyan']],
 L:['parallel lane practice',['lane_divider','diving_rings'],['pool_ladder','kickboard','depth_marker'],['red','white']],
 M:['one toy beyond the arches',['striped_ball'],['chair','depth_marker'],['orange','white'],true],
 N:['underwater lesson abandoned',['diving_rings','goggles','swim_cap'],['pool_ladder','rescue_pole','basket'],['yellow','cyan']],
 O:['perfect circle of rings',['rainbow_ring','ring'],['rope_barrier','bench','depth_marker'],['lavender','cyan']],
 P:['the sunken toy observatory',['duck','small_duck','fish'],['goggles','kickboard','diving_rings','basket','depth_marker'],['yellow','cyan']],
 Q:['green serpentine play channel',['dolphin','ring'],['slide_mouth','stool','pool_ladder'],['green','yellow']],
 R:['the red return pipe',['clear_ring'],['rescue_pole','life_ring','depth_marker'],['red','blue']],
 S:['upper-deck lounge abandoned',['mattress','cushion'],['lounger','table','chair','towel_rack'],['pink','lavender']],
 T:['sunlit ball court',['striped_ball','beach_ball'],['stool','basket','depth_marker'],['yellow','orange']],
 U:['chairs facing an empty apse',['clear_ring'],['chair','bench'],['white','blue'],true],
 V:['inflatable storage behind the wall',['ring','mattress'],['open_locker','plastic_container','basket','noodles'],['pink','cyan']],
 W:['one duck beneath the drip well',['small_duck'],['thermometer','depth_marker'],['yellow','white'],true],
 X:['toys below the crossing',['fish','diving_rings'],['pool_ladder','life_ring','chair'],['blue','yellow']],
 Y:['abandoned swim lesson exit',['kickboard'],['chair','rescue_pole','goggles'],['red','white'],true],
 Z:['an impossible ball in the spiral',['striped_ball','rainbow_ring'],['stool','towel_rack','depth_marker'],['lavender','yellow']],
 AA:['rose inflatable chapel',['flamingo','cushion'],['stool','towel_shelf','shower'],['pink','white']],
 AB:['amber bath accessories',['fish','ring'],['bench','basket','thermometer'],['orange','yellow']],
 AC:['toys on the reservoir floor',['diving_rings','small_duck'],['depth_marker','rescue_pole'],['blue','cyan'],true],
 AD:['pristine equipment alcoves',['swim_cap'],['open_locker','towel_shelf','goggles','shower'],['lavender','cyan']],
 AE:['floodgate play machinery',['lane_divider'],['bucket_fountain','life_ring','cleaning_cart'],['yellow','red']],
 AF:['a single swan in shadow',['swan'],['chair','depth_marker'],['white','lavender'],true],
 AG:['rainbow slide exchange',['ring','dolphin','beach_ball'],['slide_mouth','lifeguard_chair','basket','life_ring'],['red','blue','green','yellow']],
 AH:['rings around the rotunda',['rainbow_ring','clear_ring'],['mushroom_fountain','bench','depth_marker'],['lavender','cyan']],
 AI:['quiet steam baths',['cushion'],['bench','towel_shelf','shower','thermometer'],['pink','white']],
 AJ:['rubber duck sanctuary',['duck','small_duck','turtle','fish'],['playground','mushroom_fountain','basket','stool','depth_marker'],['yellow','green']],
 AK:['the silent swan overlook',['swan','mattress'],['lounger','table','rescue_pole','life_ring'],['white','blue']],
 AL:['the giant abandoned waterpark',['rainbow_ring','ring','striped_ball','dolphin'],['lifeguard_chair','pool_ladder','locker','life_ring','bucket_fountain','depth_marker'],['yellow','red','blue','green']],
 AM:['red tubes in the vertical shaft',['clear_ring','ring'],['rescue_pole','pool_ladder','depth_marker','cleaning_cart'],['red','cyan']],
 AN:['chromatic water attractions',['flamingo','swan','rainbow_ring'],['waterfall','lounger','table','mushroom_fountain','depth_marker'],['pink','blue','orange']]
};
export function populatePoolDecor({cells,zones,index,seed,POOL_ARCH,WATER_RECTS,PLATFORMS,RAMPS,SLIDES,RECTS,WALLS,LIGHT_VOLUMES,stairs,platform,column}){
 const props=[],clusters=[],attractions=[],allFloats=new Set(['duck','small_duck','flamingo','swan','dolphin','fish','turtle','ring','clear_ring','rainbow_ring','beach_ball','striped_ball','mattress','cushion','lane_divider','arm_floaties']);
 const terrain={WATER_RECTS,PLATFORMS,RAMPS,SLIDES,_poolCellGrid:index,baseFloorY:-.3};initTerrainIndex(terrain);
 const emit=(c,cluster,kind,x,y,z,scale=1,color=C.cyan,float=false,ry=0)=>{const p={id:props.length,kind,x,y,z,scale,color,float,ry,zoneId:c.zoneId,cellId:c.id,clusterId:cluster.id,phase:(seed*.013+props.length*2.399)%6.283};if(kind==='depth_marker'){const w=WATER_RECTS.reduce((a,b)=>{const dist=w=>Math.hypot(Math.max(w.x0-x,0,x-w.x1),Math.max(w.z0-z,0,z-w.z1));return !a||dist(b)<dist(a)?b:a;},null);p.depth=w?Math.round((w.waterY-w.bedY)*10)/10:0;}props.push(p);cluster.props.push(p.id);return p;};
 const cluster=(c,name)=>{const d={id:clusters.length,zoneId:c.zoneId,cellId:c.id,name,props:[]};clusters.push(d);return d;};
 const waterProp=(c,cl,kind,i,scale=1)=>{
  const waters=c.poolShapes||[],w=waters[kind==='duck'&&c.zoneId==='zone_aj'?1:i%waters.length];if(!w){if(c.tubeNetwork){const p=c.tubeNetwork.paths[9].a;emit(c,cl,kind,p[0],c.floorY-.055,p[2],scale,C.cyan,allFloats.has(kind));}return;}
  const a=(i*2.399+.5),r=kind==='duck'?.04:.44,x=kind==='duck'&&c.zoneId==='zone_p'?w.cx+2.3:w.cx+Math.cos(a)*w.rx*r,z=kind==='duck'&&c.zoneId==='zone_p'?w.cz+2.5:w.cz+Math.sin(a)*w.rz*r;
  emit(c,cl,kind,x,w.waterY+.025,z,scale,C[(POOL_DECOR_PROFILES[c.zoneId.slice(5).toUpperCase()]?.[3]||['cyan'])[i%2]]||C.cyan,allFloats.has(kind),kind==='duck'&&c.zoneId==='zone_p'?0:a);
 };
 const placeDeck=(c,cl,kind,i,color)=>{
  // Candidate positions are composed perimeter bays. Protect all sockets,
  // teleports, corridor footprints and cell centres before adding a proxy.
  const slots=Math.max(c.width,c.depth)<40?32:16;
  const candidates=c.tubeNetwork?[-6,-3,0,3,6].map(x=>[c.x+x,c.z+c.depth*.18+.72,0]):Array.from({length:slots},(_,j)=>{const side=j%4,t=(Math.floor(j/4)+.5)/(slots/4);return side===0?[c.x0+.7,c.z0+2+t*(c.depth-4),-Math.PI/2]:side===1?[c.x1-.7,c.z0+2+t*(c.depth-4),Math.PI/2]:side===2?[c.x0+2+t*(c.width-4),c.z0+.7,Math.PI]:[c.x0+2+t*(c.width-4),c.z1-.7,0];});
  const off=(i*7)%candidates.length,zone=zones.find(z=>z.id===c.zoneId);
  for(let j=0;j<candidates.length;j++){
   const[x,z,ry]=candidates[(off+j)%candidates.length],floor=getTerrainAt(x,z,terrain,c.tubeNetwork?c.floorY+1.8:0);
   if(floor.inWater||Math.hypot(x-zone.teleX,z-zone.teleZ)<3||Math.hypot(x-c.x,z-c.z)<2)continue;
   if(c.portals.some(p=>{const px=p.side==='w'?c.x0:p.side==='e'?c.x1:p.at,pz=p.side==='n'?c.z0:p.side==='s'?c.z1:p.at;return Math.hypot(x-px,z-pz)<p.width/2+2.2;}))continue;
   if(!c.tubeNetwork&&index.queryNear(x,z,1.2).some(n=>n!==c&&n.kind==='corridor'&&x>n.x0-1&&x<n.x1+1&&z>n.z0-1&&z<n.z1+1))continue;
   if(props.some(p=>!p.float&&Math.hypot(x-p.x,z-p.z)<1.35))continue;
   const scale=c.tubeNetwork ? .7 : kind==='playground' ? .65 : kind.includes('fountain') ? .65 : kind==='waterfall' ? .7 : 1;
   emit(c,cl,kind,x,floor.floorY,z,scale,color,false,ry);
   // Belongings rest on the actual furniture surface. They share its bay and
   // collision footprint, rather than filling the protected walking route.
   if(c.art&&!POOL_DECOR_PROFILES[c.zoneId.slice(5).toUpperCase()][4]){
    const on=(k,lx,ly,lz,s=.5)=>emit(c,cl,k,x+Math.cos(ry)*lx+Math.sin(ry)*lz,floor.floorY+ly,z-Math.sin(ry)*lx+Math.cos(ry)*lz,s,color,false,ry);
    if(kind==='bench'){on('goggles',-.6,.5,0);on('swim_cap',.6,.5,0);}
    if(kind==='table')on('basket',0,.875,0,.55);
    if(kind==='lounger')on('goggles',0,.375,-.35);
    if(kind==='open_locker'){on('swim_cap',-.22,.63,-.02);on('goggles',.18,1.25,-.02);}
   }
   if(['chair','lounger','locker','open_locker','bench','storage_cabinet','lifeguard_chair'].includes(kind))RECTS.push({x0:x-.4,x1:x+.4,z0:z-.4,z1:z+.4,minY:floor.floorY,maxY:floor.floorY+(kind==='lifeguard_chair'?2:1),half:true,decor:true});
   return true;
  }return false;
 };
 const tube=(c,path,color,r=1.25,translucent=false,hangers=true)=>{attractions.push({kind:'hollow_sweep',path,radius:r,thickness:.16,segments:100,color,translucent,zoneId:c.zoneId,decorative:true});
  if(hangers)for(const p of path.slice(1,-1))if(c.floorY+c.ceiling-p[1]-r>.3)POOL_ARCH.push({kind:'pipe_sweep',path:[[p[0],p[1]+r,p[2]],[p[0],c.floorY+c.ceiling-.12,p[2]]],radius:.065,segments:1});
 };
 for(const c of cells.filter(c=>c.kind!=='corridor')){
  const code=c.zoneId.slice(5).toUpperCase();if(!POOL_RICH_ACTIVE.has(code))continue;const profile=POOL_DECOR_PROFILES[code],palette=profile[3].map(n=>C[n]||C.green);
  if(!c.art){
   const order=Number(c.id.split(':').at(-1));if(order%5===0)continue;
   const cl=cluster(c,'quiet approach / '+profile[0]);placeDeck(c,cl,profile[2][order%profile[2].length],order,palette[order%palette.length]);
   continue;
  }
  c.decorTheme=profile[0];const quiet=!!profile[4],count=quiet?2:c.landmark?10:Math.max(c.width,c.depth)>=40?7:4;
  for(let i=0;i<count;i++){
   const cl=cluster(c,`${profile[0]} / bay ${i+1}`),kind=profile[2][i%profile[2].length];placeDeck(c,cl,kind,i,palette[i%palette.length]);
   if(i<profile[1].length){const fk=profile[1][i],giant=fk==='duck'&&(code==='AJ'||code==='P');waterProp(c,cl,fk,i,giant?(code==='P'?1.8:2.6):code==='T'&&fk==='striped_ball'?2.2:fk==='small_duck'?.24:fk==='lane_divider'?.8:.7);}
  }
  if(code==='AJ'){
   const cl=cluster(c,'ducklings surrounding an oversized float');for(let i=0;i<5;i++)waterProp(c,cl,'small_duck',i+1,.22);
   const w=c.poolShapes[2];emit(c,cl,'mushroom_fountain',w.cx,w.bedY,w.cz,1.4,C.pink,false);
  }
  if(code==='P'){
   const w=c.poolShapes[0],cl=cluster(c,'toys visible through submerged glass');for(let i=0;i<7;i++)emit(c,cl,['goggles','diving_rings','kickboard','fish'][i%4],w.cx+2.1,w.bedY+.07,c.z-5+i*1.6,.3,palette[i%palette.length],false,i*.6);
  }
  if(c.tubeNetwork){const cl=cluster(c,'maintenance catwalk edge fittings');for(const dx of[-3.5,3.5])emit(c,cl,'rope_barrier',c.x+dx,c.floorY+1.8,c.z+c.depth*.18+.84,.8,C.orange,false);}
  if(code==='O'){
   const cl=cluster(c,'a suspiciously perfect circle');for(let i=0;i<8;i++){const a=i/8*Math.PI*2+Math.PI/8;emit(c,cl,'ring',c.x+Math.cos(a)*7,c.floorY-.055,c.z+Math.sin(a)*7,.48,palette[i%palette.length],true,a);}
  }
  if(code==='V'){
   for(let bay=0;bay<2;bay++){const cl=cluster(c,'carefully stacked inflatable storage');if(placeDeck(c,cl,'bench',bay+9,palette[bay%palette.length])){const base=props.find(p=>p.clusterId===cl.id&&p.kind==='bench');for(let j=0;j<5;j++)emit(c,cl,'ring',base.x,base.y+.54+j*.21,base.z,.52,palette[(bay+j)%palette.length],false,base.ry);if(bay===0)c.views[0]={name:'abandoned-inflatable-storage',position:[base.x-Math.sin(base.ry)*5.5,base.y+1.62,base.z-Math.cos(base.ry)*5.5],target:[base.x,base.y+1,base.z]};}}
  }
  if(['AL','AG','B','AM','AN'].includes(code)){
   const half=c.width/2,y=c.floorY;
   if(code==='AM'){
    tube(c,[[c.x+8.5,y+4,c.z+4],[c.x+8.5,y+10,c.z+4],[c.x+8.5,y+18,c.z+4],[c.x+12,y+24,c.z+4]],C.red,1.65,false,false);
    for(const h of[9,16])POOL_ARCH.push({kind:'pipe_sweep',path:[[c.x+10.31,y+h,c.z+4],[c.x+19.6,y+h,c.z+4]],radius:.08,segments:1});
    tube(c,[[c.x-32,y+21,c.z0-.5],[c.x-33,y+22,c.z-8],[c.x-31,y+21,c.z+10],[c.x-33,y+21,c.z1+.5]],C.blue,1.15);
    tube(c,[[c.x0-.5,y+26.6,c.z-18],[c.x-20,y+26.5,c.z-17],[c.x+20,y+26.7,c.z-18],[c.x1+.5,y+26.6,c.z-17]],C.cyan,1.05,true);
   }else{
    const redY=code==='AL'?16.5:code==='AG'?8.5:code==='B'?13.8:17,blueY=code==='AL'?15:code==='AG'?7:code==='B'?12:14.5,front=code==='AG'?-9:code==='B'?-16:-14,back=code==='AG'?10:code==='B'?17:16;
    tube(c,[[c.x0-.5,y+redY,c.z+front],[c.x-half*.45,y+redY+.15,c.z+front+1],[c.x+half*.35,y+redY-.1,c.z+front-1],[c.x1+.5,y+redY-.3,c.z+front+2]],C.red,code==='AG'?.85:1.35);
    tube(c,[[c.x0-.5,y+blueY,c.z+back],[c.x-half*.4,y+blueY+.2,c.z+back+1],[c.x+half*.4,y+blueY-.1,c.z+back-1],[c.x1+.5,y+blueY-.3,c.z+back+1]],C.blue,code==='AG'?.7:1.15);
    if(c.landmark){const x=c.x1-2.3;tube(c,[[x,y+9,c.z0-.5],[x-.4,y+9.5,c.z-8],[x,y+9,c.z+8],[x-.3,y+8.8,c.z1+.5]],C.cyan,1.05,true);}
   }
  }
  if(code==='AL'){
   let n=0;for(const a of POOL_ARCH)if(a.kind==='swept_channel'&&a.path[0][0]>=c.x0&&a.path[0][0]<=c.x1&&a.path[0][2]>=c.z0&&a.path[0][2]<=c.z1){a.render=false;attractions.push({...a,color:[C.yellow,C.green,C.white][n++%3],zoneId:c.zoneId,decorative:true});}
  }
  if(['AJ','E','AG'].includes(code)){
   const w=c.poolShapes?.[0];if(w){const x=w.cx,z=c.z0+2,height=3.5,len=Math.min(11,c.depth-5),width=2.5;
    const side=code==='AJ'?1:-1,stairX=x+side*2.5;
    SLIDES.push({x0:x-width/2,x1:x+width/2,z0:z,z1:z+len,axis:'z',y0:c.floorY+height,y1:c.floorY+.12,dirX:0,dirZ:1,speed:8,render:false,color:C.green,zoneId:c.zoneId,richChute:true,stairX});
    attractions.push({kind:'swept_channel',path:[[x,c.floorY+height,z],[x,c.floorY+height+(.12-height)*.55,z+len*.55],[x,c.floorY+.12,z+len]],radius:width/2,thickness:.15,segments:60,color:C.green,zoneId:c.zoneId,decorative:true});
    stairs(stairX,z,2,8,c.floorY+height,c.floorY);platform(Math.min(stairX-1,x-1.3),z-.8,Math.max(stairX+1,x+1.3),z+.8,c.floorY+height);platform(stairX-1,z+7,stairX+1,z+10,c.floorY-.15);
    if(code==='AG')c.views[0]={name:'colourful-slide-exchange',position:[c.x+10,c.floorY+1.62,c.z+10],target:[x,c.floorY+3,c.z-6]};
   }
  }
  if(['AL','AJ'].includes(code)){
   const v=c.views[0],dx=v.target[0]-v.position[0],dz=v.target[2]-v.position[2],n=Math.hypot(dx,dz),fx=dx/n,fz=dz/n,cl=cluster(c,'foreground belongings without an owner');
   const x=v.position[0]+fx*5-fz*2,z=v.position[2]+fz*5+fx*2,floor=getTerrainAt(x,z,terrain,0);
   if(!floor.inWater){emit(c,cl,code==='AL'?'chair':'stool',x,floor.floorY,z,1,palette[0],false,Math.atan2(-fx,-fz));emit(c,cl,code==='AL'?'life_ring':'basket',x-fz*1.3,floor.floorY,z+fx*1.3,.7,palette[1],false);emit(c,cl,'kickboard',x+fz,floor.floorY+.02,z-fx,.7,palette[0],false,.3);}
  }
  if(palette.length){LIGHT_VOLUMES.push({x:c.x-c.width*.25,z:c.z,y:c.floorY+2,r:5,rgb:[(palette[0]>>16&255)/255,(palette[0]>>8&255)/255,(palette[0]&255)/255],strength:.06});}
 }
 return {POOL_DECOR:props,POOL_DECOR_CLUSTERS:clusters,POOL_WATERPARK:attractions};
}
