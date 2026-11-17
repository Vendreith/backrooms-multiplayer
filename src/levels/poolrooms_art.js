/*! Copyright (c) 2026 Vendreith. Licensing: see LICENSE.md and THIRD_PARTY_NOTICES.md. */
/* Authored Level 37 compositions. General architectural principles, no copied assets. */
import {makeTubeNetwork,tubeDistance} from './poolrooms_tubes.js';
import {ADDITIONAL_POOL_DESIGNS} from './poolrooms_designs.js';
import {buildPoolComposition} from './poolrooms_compositions.js';
export const POOL_ART_ACTIVE = new Set(['I','AL','C','R','A','D','E','F','G','H','J','K','L','M','N','O','P','Q','S','T','U','V','W','X','Y','Z','AA','AB','AC','AD','AE','AF','AG','AH','AI','AJ','B','AK','AM','AN']);
export const POOL_ZONE_ART = {
  ...ADDITIONAL_POOL_DESIGNS,
  C:{title:'The Submerged Confluence',grammar:'tubes',size:[30,40,10],shape:'two sinuous cylindrical conduits with fused crossings',ceiling:'continuous 9.2m circular section',water:'shallow continuous water following curved channels',elevation:'curved submerged bed and raised maintenance walk',lighting:['cold blue','pale aquatic'],primary:'seamless tube intersection',secondary:['overhead service walk','observation bay'],navigation:'curved north-south spine crossed by lateral conduit',sound:'hollow resonant tube with long water echoes',liminal:'a pipe large enough to become architecture',refs:['R53','R54','W02']},
  R:{title:'The Return Conduits',grammar:'return_tubes',size:[26,28,8],shape:'compressed curved pipes with orthogonal feeder mouths',ceiling:'6.4m circular conduits',water:'deep central water beneath a maintenance crossing',elevation:'submerged channel and 1.8m service catwalk',lighting:['mint','warm service lantern'],primary:'intersecting return pipes',secondary:['maintenance crossing','recessed feeder mouths'],navigation:'tight sinuous crossing with elevated bypass',sound:'short metallic drain resonance',liminal:'utility infrastructure at an impossible human scale',refs:['R53','R40','W02']},
  I: { title:'The Dreamcore Thermal Sanctuary', grammar:'thermal', size:[50,32,8], shape:'asymmetric three-pool bathhouse', ceiling:'elliptical barrel + low side galleries', water:'three separate calm terraced basins', elevation:'submerged steps and 0.65m warm pool terrace', lighting:['warm ivory','mint reflected fill'], primary:'off-centre oval bathing pool', secondary:['twin colonnades','raised pocket bath','clerestory lanterns'], navigation:'two perimeter routes, axial view and side reveals', sound:'warm chamber, long soft decay with pauses', liminal:'a bright intimate bath beneath a much larger roof', refs:['W03','R13','R106'] },
  AL:{title:'Grand Water Slide Cathedral',grammar:'slide_cathedral',size:[96,48,21],shape:'three interleaved helical silhouettes inside an axial cathedral',ceiling:'high elliptical vault and transverse ribs',water:'shared oval receiving pool with two quiet side basins',elevation:'0 / 4 / 8 / 12m walkable galleries and spiral ascent',lighting:['overhead warm ivory','cool reflected turquoise'],primary:'three white ceramic spiral slides',secondary:['grand spiral ascent','two gallery tiers','overhead crossing conduits'],navigation:'ground bypass, stair ascent and three downhill returns',sound:'long sparse decay and hollow tube resonance',liminal:'enormous slides revealed through a compact bathing antechamber',refs:['R65','R64','W03']}
};
for(const a of Object.values(POOL_ZONE_ART)){a.style??='pristine white ceramic aquatic architecture';a.roomDistribution??=[6,9,a.size[0]];a.waterBehavior??='calm surface, player ripples and depth-based attenuation';}
export function getPoolroomsArt(code) { return POOL_ART_ACTIVE.has(code) ? POOL_ZONE_ART[code] : null; }

export function buildAuthoredPoolCell(c,zone,k) {
  const {wall,platform,stairs,column,POOL_ARCH,WATER_RECTS,LIGHTS,LIGHT_VOLUMES,SPIRAL_SLIDES,SLIDES}=k;
  const y=c.floorY,art=c.art;
  const pools=[];
  const pool=(dx,dz,rx,rz,top=y-.08,depth=1.1)=>{
    const p={shape:'ellipse',cx:c.x+dx,cz:c.z+dz,rx,rz,x0:c.x+dx-rx,x1:c.x+dx+rx,z0:c.z+dz-rz,z1:c.z+dz+rz,waterY:top,bedY:top-depth,temp:.16,noCoping:true,lightRgb:[.78,.94,.86]};
    WATER_RECTS.push(p);pools.push(p);POOL_ARCH.push({kind:'basin_ring',...p,y0:p.bedY,y1:top+.08,thickness:.24});return p;
  };
  const deck=(bounds,top,holes)=>{
    platform(bounds.x0,bounds.z0,bounds.x1,bounds.z1,top,{draw:false,holes});
    POOL_ARCH.push({...bounds,kind:'pool_deck',y:top,holes,thickness:.3});
  };
  const arch=(x,z,span,spring,rise,axis='z',family='elliptical')=>POOL_ARCH.push({kind:'arch_family',x,z,span,spring,rise,y0:y,rotY:axis==='x'?Math.PI/2:0,depth:.55,rim:.28,family});
  const light=(dx,dz,height,hex,intensity=300,target=[0,0,0],angle=.6)=>{
    const l={x:c.x+dx,z:c.z+dz,y:y+height,hex,colorHex:hex,intensity:3.8,gain:1,dist:28,hero:true,cellId:c.id,
      spot:{intensity,target:[c.x+target[0],y+target[1],c.z+target[2]],angle,penumbra:.65,distance:90}};
    LIGHTS.push(l);LIGHT_VOLUMES.push({x:l.x,y:l.y,z:l.z,r:24,rgb:[(hex>>16&255)/255,(hex>>8&255)/255,(hex&255)/255],strength:.7,cellId:c.id});
  };
  if(art.grammar==='tubes'||art.grammar==='return_tubes'){
    c.tubeNetwork=makeTubeNetwork(c);
    // Closed structural backing below both bores and their interstitial space.
    platform(c.x0-3,c.z0-3,c.x1+3,c.z1+3,y-3.18,{terrainIgnore:true});
    POOL_ARCH.push({...c,kind:'tube_union',network:c.tubeNetwork});
    WATER_RECTS.push({shape:'tube',network:c.tubeNetwork,floorY:y,x0:c.x0,x1:c.x1,z0:c.z0,z1:c.z1,waterY:y-.08,bedY:y-1,noCoping:true,temp:-.2});
    // Collision follows the same implicit volume, sampled conservatively on a 1m lattice.
    for(let x=c.x0+.5;x<c.x1;x++)for(let z=c.z0+.5;z<c.z1;z++)if(tubeDistance(c.tubeNetwork,x,1.2,z)>-.55)wall(x-.5,z-.5,x+.5,z+.5,y-1,y+c.ceiling,{collisionOnly:true,visualOnly:false});
    // Drop proxy render boxes: the continuous tube surface is the visible wall.
    const proxies=k.WALLS;
    if(proxies)for(let i=proxies.length-1;i>=0;i--)if(proxies[i].collisionOnly)proxies.splice(i,1);
    platform(c.x-7,c.z+c.depth*.18-1.15,c.x+7,c.z+c.depth*.18+1.15,y+1.8);
    stairs(c.x-12,c.z+c.depth*.17,2.3,6,y-.8,y+1.8,'x');
    if(art.grammar==='tubes'){
      // Optional half-flooded side bore. The central raised walk keeps the
      // player above its 2.5m-deep water; the cross-route has a shallow bypass.
      for(let dx=-14;dx<-6;dx+=.5){const z=c.z+Math.sin((c.x+dx-(c.x0-1))/(c.width+2)*Math.PI)*c.depth*.18;platform(c.x+dx-.06,z-1.1,c.x+dx+.56,z+1.1,y-.65);}
      for(const e of c.tubeNetwork.entries.filter(e=>e.socket.side==='w')){const a=e.points[1],b=e.points[2],n=Math.ceil(Math.hypot(b[0]-a[0],b[2]-a[2])/.4);for(let i=0;i<=n;i++){const t=i/n,x=a[0]+(b[0]-a[0])*t,z=a[2]+(b[2]-a[2])*t;platform(x-.8,z-.8,x+.8,z+.8,y-.65);}}
      platform(c.x-10.85,c.z-8,c.x-9.15,c.z+3,y-.1);
      stairs(c.x-10,c.z+3,1.7,3.5,y-.1,y-.65);
      for(const dz of[-6,-1,3])column(c.x-10,c.z+dz,.18,2.55,y-2.65);
      light(-10,-4,1.8,0xa5e7e9,45,[-10,-.3,0],.9);
    }
    for(const z of [-8,7])POOL_ARCH.push({kind:'glass_wall',x0:c.x-2.3,x1:c.x+2.3,z0:c.z+z,z1:c.z+z+.08,y0:y-.8,y1:y+1.2});
    light(4,-8,Math.min(c.ceiling-1,5),0xbadce9,190,[4,0,-7],.95);light(2,5,4.8,0xd9ffe3,150,[0,1,6],.9);
    c.views=[{name:'inside-continuous-conduit',position:[c.x+Math.sin(5/(c.depth+2)*Math.PI*2)*c.width*.19,y+1.1,c.z0+4],target:[c.x+c.width*.16,y+2.7,c.z-3]},
      {name:'maintenance-crossing',position:[c.x-6,y+3.42,c.z+c.depth*.18],target:[c.x+4,y+2,c.z+3]}];
    c.composition=art.title;return;
  }
  if(art.grammar==='slide_cathedral'){
    const main=pool(0,0,37,17,y-.08,1.45);pool(-42,10,3.2,5,y-.08,.7);pool(42,-10,3.2,5,y-.08,.7);deck(c,y,pools);
    for(const x of [-41,41])for(const z of [-17,0,17])column(c.x+x,c.z+z,1.05,12,y);
    for(const z of [-18,-5,8,20])arch(c.x,c.z+z,82,11,8.2,'z','elliptical');
    POOL_ARCH.push({kind:'barrel_vault',x:c.x,z:c.z,span:84,len:46,spring:11,rise:9,y0:y,thickness:.4,axis:'z'});
    for(const [dx,dz,radius,height,turns] of [[-18,0,13,12,1.25],[17,-3,9,9,1.1],[30,10,6,6,1.35]]){
      const slide={kind:'spiral_slide',cx:c.x+dx,cz:c.z+dz,radius,turns,yTop:y+height,yBot:y+.15,width:3.4,ccw:false,angStart:0,speed:9,render:false,waterSegments:Math.ceil(turns*90)};
      SPIRAL_SLIDES.push(slide);POOL_ARCH.push(slide);
      const path=Array.from({length:181},(_,i)=>{const t=i/180,a=t*turns*Math.PI*2;return[slide.cx+Math.cos(a)*radius,y+height-(height-.15)*t,slide.cz+Math.sin(a)*radius];});
      POOL_ARCH.push({kind:'swept_channel',path,radius:1.7,thickness:.2,segments:180});
      column(slide.cx,slide.cz,.85,height+.8,y-1.45);
      stairs(slide.cx+radius,main.z0,3,4,y,main.bedY);
    }
    const count=84,r=18,cx=c.x-18,cz=c.z;
    for(let i=0;i<count;i++){
      const a=i/count*Math.PI*2,b=(i+1)/count*Math.PI*2,px=cx+Math.cos(a)*r,pz=cz+Math.sin(a)*r,qx=cx+Math.cos(b)*r,qz=cz+Math.sin(b)*r;
      platform(Math.min(px,qx)-1.4,Math.min(pz,qz)-1.4,Math.max(px,qx)+1.4,Math.max(pz,qz)+1.4,y+(i+1)/count*12);
    }
    for(const offset of [-1.45,1.45])for(const [height,radius] of [[-.27,.22],[.95,.07]]){
      const path=Array.from({length:85},(_,i)=>{const a=i/84*Math.PI*2;return[cx+Math.cos(a)*(r+offset),y+i/84*12+height,cz+Math.sin(a)*(r+offset)];});
      POOL_ARCH.push({kind:'pipe_sweep',path,radius,segments:120});
    }
    platform(cx+r-1.5,c.z0,cx+r+1.5,cz+1.5,y);
    platform(cx+12,cz-1.7,cx+19.5,cz+1.7,y+12);
    for(const height of [4,8]){
      platform(c.x0+1,c.z0+3,c.x0+5,c.z1-3,y+height);
      const a=height/12*Math.PI*2,px=cx+Math.cos(a)*r,pz=cz+Math.sin(a)*r;
      platform(c.x0+1,pz-1.4,px+1.4,pz+1.4,y+height);
      wall(c.x0+5,c.z0+3,c.x0+5.16,c.z1-3,y+height,y+height+.8,{half:true});
    }
    platform(c.x0+3,c.z-11,c.x1-3,c.z-8,y+2.1);stairs(c.x-40,c.z-19,3,8,y,y+2.1);
    SLIDES.push({x0:c.x+35,x1:c.x+38,z0:c.z-18,z1:c.z+12,axis:'z',y0:y+5,y1:y+.15,dirX:0,dirZ:1,speed:9,color:0xe8eee5});
    for(const z of [-16,-5,7,16])POOL_ARCH.push({kind:'glow_panel',x:c.x+47.7,z:c.z+z,y:y+13,width:6,height:9,axis:'z',hex:0xffe7c3});
    light(-25,-13,15,0xffe5bb,3600,[0,0,0],.8);light(30,12,13,0xc9efec,2400,[0,1,0],.8);
    c.views=[{name:'cathedral-reveal',position:[c.x+35,y+1.62,c.z0+3.6],target:[c.x-9,y+7,c.z+2]},
      {name:'upper-gallery',position:[c.x0+3,y+9.62,c.z-11],target:[c.x+8,y+5,c.z+1]}];
    c.poolShapes=pools;c.composition=art.title;return;
  }
  if(art.grammar!=='thermal'){buildPoolComposition(c,k,{pool,deck,arch,light,pools});return;}
  const central=pool(-2,0,9,8),side=pool(-17,-7,3.2,4,.0,.65),upper=pool(15,5,4.3,4.3,.57,1.0);
  deck(c,y,pools);
  deck({x0:c.x+9.8,x1:c.x+21,z0:c.z-1,z1:c.z+12},y+.65,[upper]);
  stairs(c.x+15,c.z-5,3.2,4,y,y+.65);
  stairs(central.cx,central.z0,3.5,4.5,y,central.bedY);
  stairs(side.cx,side.z0,2,2.4,y,side.bedY);
  for(const x of [-12,12])for(const z of [-10,-3.5,3.5,10])column(c.x+x,c.z+z,.48,4.2,y);
  for(const z of [-10,0,10])arch(c.x,c.z+z,24,4.1,3.1);
  POOL_ARCH.push({kind:'barrel_vault',x:c.x,z:c.z,span:25.5,len:29,spring:4.1,rise:3.45,y0:y,thickness:.28,axis:'z'});
  for(const z of [-11,-3,5,11]){
    POOL_ARCH.push({kind:'glow_panel',x:c.x+24.75,z:c.z+z,y:y+4.8,width:3.8,height:3.2,axis:'z',hex:0xffe6bf});
    wall(c.x-23,c.z+z-.55,c.x-18,c.z+z+.55,y,y+.46,{half:true});
  }
  light(-8,-11,6.5,0xffe5b8,650,[-2,0,4],.68);
  light(20,9,5.8,0xc4f3e9,290,[3,0,2],.75);
  c.views=[{name:'entrance-reveal',position:[c.x,c.floorY+1.62,c.z0+2.5],target:[c.x-1,y+2.4,c.z+4]},
    {name:'warm-terrace',position:[c.x+18,y+2.27,c.z+10],target:[c.x-6,y+1.7,c.z-6]}];
  c.poolShapes=pools;c.composition=art.title;
}
