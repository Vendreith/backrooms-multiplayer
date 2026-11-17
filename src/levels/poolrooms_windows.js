/*! Copyright (c) 2026 Vendreith. Licensing: see LICENSE.md and THIRD_PARTY_NOTICES.md. */
// Intentional sealed apertures. They retain the original collision wall and
// show one shared procedural infinite atmosphere through a thick ceramic reveal.
export const POOL_SKY_ACTIVE=new Set(['AK','B','I','Z','AL','AN','AH','F','J','S','AA','AJ']);
export const POOL_SKY_PROFILES={
 AK:{name:'cloud observatory',palette:'heavenly blue',windows:[{side:'s',shape:'rect',width:32,height:8.5,bottom:3.5,panels:4,type:'panoramic'}]},
 B:{name:'heavenly aquatic atrium',palette:'celestial white',windows:[{side:'s',shape:'rect',width:42,height:11,bottom:5,panels:6,type:'multi-panel glass wall'},{side:'roof',shape:'rect',width:14,height:8,bottom:0,dx:2,dz:7,type:'vaulted skylight'}]},
 I:{name:'celestial thermal sanctuary',palette:'mint aquatic',shafts:false,windows:[{side:'s',shape:'arch',width:24,height:4.3,bottom:2.5,type:'curved panoramic opening'}]},
 Z:{name:'sunlit spiral staircase',palette:'golden afternoon',windows:[{side:'s',shape:'arch',width:10,height:5,bottom:3.7,type:'monumental arched window'}]},
 AL:{name:'sky above the slides',palette:'heavenly blue',windows:[{side:'s',shape:'arch',width:28,height:13,bottom:4,dx:-24,type:'monumental arched window'},{side:'s',shape:'arch',width:28,height:13,bottom:4,dx:24,type:'monumental arched window'}]},
 AN:{name:'sun shaft cathedral',palette:'celestial white',windows:[{side:'s',shape:'rect',width:8,height:18,bottom:.8,dx:-34,panels:2,type:'floor-to-ceiling window'},{side:'s',shape:'rect',width:8,height:18,bottom:.8,dx:34,panels:2,type:'floor-to-ceiling window'}]},
 AH:{name:'circular cloud rotunda',palette:'lavender sanctuary',windows:[{side:'s',shape:'circle',width:9,height:9,bottom:2.2,dx:17,type:'circular sky window'}]},
 F:{name:'distant daylight in the nave',palette:'deep shadow',windows:[-17,-11,14].map(dx=>({side:'s',shape:'rect',width:1.2,height:8,bottom:2.2,dx,type:'narrow light slit'}))},
 J:{name:'infinite window water corridor',palette:'golden afternoon',windows:[-19,0,19].map(dx=>({side:'s',shape:'rect',width:6,height:5.5,bottom:2.5,dx,type:'window corridor'}))},
 S:{name:'elevated sky observation',palette:'mint aquatic',shafts:false,windows:[{side:'s',shape:'rect',width:10,height:5,bottom:2.6,panels:2,type:'elevated observation window'}]},
 AA:{name:'rose dream beyond the chapel',palette:'rose dream',shafts:false,windows:[{side:'s',shape:'circle',width:4,height:4,bottom:1.8,type:'circular sky window'}]},
 AJ:{name:'forgotten summer paradise',palette:'golden afternoon',windows:[{side:'s',shape:'rect',width:24,height:7,bottom:3,panels:3,type:'panoramic'}]},
};
export function windowOutline(w,inset=0){
 const rx=w.width/2-inset,ry=w.height/2-inset,points=[];
 if(w.shape==='circle')for(let i=0;i<80;i++){const a=i/80*Math.PI*2;points.push([Math.cos(a)*rx,Math.sin(a)*ry]);}
 else if(w.shape==='arch'){
  const spring=-ry+w.height*.46;points.push([-rx,-ry],[rx,-ry],[rx,spring]);
  for(let i=1;i<=64;i++){const a=i/64*Math.PI;points.push([Math.cos(a)*rx,spring+Math.sin(a)*(ry-spring)]);}
 }else points.push([-rx,-ry],[rx,-ry],[rx,ry],[-rx,ry]);
 return points;
}
export function windowShape(w,THREE){const s=new THREE.Shape(),p=windowOutline(w);p.forEach(([x,y],i)=>i?s.lineTo(x,y):s.moveTo(x,y));s.closePath();return s;}
export function placeWindowGeometry(g,w){
 if(w.side==='roof')g.rotateX(-Math.PI/2);else if(w.side==='e')g.rotateY(Math.PI/2);
 g.translate(w.x,w.y,w.z);return g;
}
export function createWindowFrameGeometry(w,THREE){
 const r=w.rim??.65,s=new THREE.Shape();s.moveTo(-w.width/2-r,-w.height/2-r);s.lineTo(w.width/2+r,-w.height/2-r);s.lineTo(w.width/2+r,w.height/2+r);s.lineTo(-w.width/2-r,w.height/2+r);s.closePath();
 const hole=new THREE.Path(),p=windowOutline(w).reverse();p.forEach(([x,y],i)=>i?hole.lineTo(x,y):hole.moveTo(x,y));hole.closePath();s.holes.push(hole);
 const g=new THREE.ExtrudeGeometry(s,{depth:w.thickness??.8,bevelEnabled:false});g.translate(0,0,-(w.thickness??.8)/2);return placeWindowGeometry(g,w);
}
export function isWindowRay(w,origin,dir,maxDistance=Infinity){
 const axis=w.side==='roof'?'y':w.side==='e'?'x':'z',delta=dir[axis];if(Math.abs(delta)<1e-7)return false;
 const t=(w[axis]-origin[axis])/delta;if(t<.02||t>maxDistance+.9)return false;
 const p={x:origin.x+dir.x*t,y:origin.y+dir.y*t,z:origin.z+dir.z*t};
 const u=w.side==='e'?-(p.z-w.z):p.x-w.x,v=w.side==='roof'?-(p.z-w.z):p.y-w.y;
 if(Math.abs(u)>w.width/2-.015||Math.abs(v)>w.height/2-.015)return false;
 if(w.shape==='circle')return (u/(w.width/2))**2+(v/(w.height/2))**2<.998;
 if(w.shape==='arch'){const ry=w.height/2,spring=-ry+w.height*.46;if(v>spring)return (u/(w.width/2))**2+((v-spring)/(ry-spring))**2<.998;}
 return true;
}
export function installPoolWindows({cells,WALLS,RECTS,PLATFORMS,POOL_ARCH,LIGHT_VOLUMES}){
 const windows=[];
 for(const c of cells.filter(c=>c.art&&POOL_SKY_ACTIVE.has(c.zoneId.slice(5).toUpperCase()))){
  const p=POOL_SKY_PROFILES[c.zoneId.slice(5).toUpperCase()];c.daylightPalette=p.palette;c.daylightShafts=p.shafts!==false;
  for(const part of POOL_ARCH)if(part.kind==='glow_panel'&&part.x>=c.x0&&part.x<=c.x1&&part.z>=c.z0&&part.z<=c.z1&&part.width>3)part.render=false;
  for(const [i,spec]of p.windows.entries()){
   const w={...spec,id:`${c.zoneId}:sky:${i}`,zoneId:c.zoneId,cellId:c.id,rim:.65,thickness:.8,x:c.x+(spec.dx||0),y:c.floorY+spec.bottom+spec.height/2,z:c.z+(spec.dz||0)};
   if(w.side==='s')w.z=c.z1-.25;if(w.side==='e')w.x=c.x1-.25;if(w.side==='roof')w.y=c.floorY+c.ceiling;
   windows.push(w);POOL_ARCH.push({...w,kind:'sky_frame'});
   if(w.side!=='roof')RECTS.push({x0:w.side==='e'?w.x-.3:w.x-w.width/2,x1:w.side==='e'?w.x+.3:w.x+w.width/2,z0:w.side==='s'?w.z-.3:w.z-w.width/2,z1:w.side==='s'?w.z+.3:w.z+w.width/2,minY:w.y-w.height/2,maxY:w.y+w.height/2,skyWindowId:w.id});
   else {RECTS.push({x0:w.x-w.width/2,x1:w.x+w.width/2,z0:w.z-w.height/2,z1:w.z+w.height/2,minY:w.y-.3,maxY:w.y+.3,skyWindowId:w.id});const roof=POOL_ARCH.find(a=>a.kind==='ceil_vault'&&Math.abs(a.x0-(c.x0-.14))<.01&&Math.abs(a.z0-(c.z0-.14))<.01);if(roof){roof.kind='sky_ceiling';(roof.holes??=[]).push(w);}}
   for(let panel=1;panel<(w.panels||1);panel++)POOL_ARCH.push({...w,kind:'sky_mullion',x:w.x+(w.side==='s'?-w.width/2+panel*w.width/w.panels:0),z:w.z+(w.side==='e'?-w.width/2+panel*w.width/w.panels:0),width:.2,height:w.height,depth:1});
   LIGHT_VOLUMES.push({x:w.x-(w.side==='e'?4:0),y:Math.min(w.y,c.floorY+3),z:w.z-(w.side==='s'?4:0),r:Math.min(w.width,20),rgb:[.55,.78,1],strength:.18});
  }
  // The original observation balcony remains; these views use its real deck.
  if(c.zoneId==='zone_ak'){
   const top=c.floorY+6,z=c.z1-6.5;
   PLATFORMS.push({x0:c.x-16,x1:c.x+22.5,z0:z,z1:c.z1-.15,y:top,yBase:top-.4,draw:true,surface:'tile'});
   POOL_ARCH.push({kind:'sky_mullion',side:'s',x:c.x+1.65,y:top+.95,z,width:35.3,height:.08,depth:.08});
   for(const dx of[-16,-12,-8,-4,0,4,8,12,16,19.3])POOL_ARCH.push({kind:'sky_mullion',side:'s',x:c.x+dx,y:top+.47,z,width:.06,height:.94,depth:.06});
   RECTS.push({x0:c.x-16,x1:c.x+19.3,z0:z-.07,z1:z+.07,minY:top,maxY:top+1,half:true});
   for(const dx of[-13,13]){POOL_ARCH.push({kind:'round_col',x:c.x+dx,z:z+.2,r:.28,h:6,y0:c.floorY,mintBand:false});RECTS.push({x0:c.x+dx-.28,x1:c.x+dx+.28,z0:z-.08,z1:z+.48,minY:c.floorY,maxY:top});}
   c.views=[{name:'heavenly-pool-reveal',position:[c.x-15,c.floorY+1.62,c.z-10],target:[c.x+3,c.floorY+7,c.z1]},{name:'cloud-observatory-balcony',position:[c.x-5,top+1.62,c.z1-6],target:[c.x+3,top+1.5,c.z1]}];
  }
  if(c.zoneId==='zone_z')c.views[1]={name:'sunlit-stair-landing',position:[c.x+8,c.floorY+6.42,c.z],target:[c.x,c.floorY+6.2,c.z1]};
  if(c.zoneId==='zone_ah')c.views[1]={name:'round-sky-beyond-the-dome',position:[c.x+18,c.floorY+1.62,c.z+14],target:[c.x+17,c.floorY+6.7,c.z1]};
 }
 // Rectangular shell cuts are filled by watertight spandrels around the exact
 // shaped aperture. The collision wall is deliberately retained for safety.
 for(const w of windows.filter(w=>w.side!=='roof')){
  const horizontal=w.side==='s',fixed=(horizontal?w.z:w.x)+.25,u=horizontal?w.x:w.z,a=u-w.width/2-.02,b=u+w.width/2+.02,lo=w.y-w.height/2-.02,hi=w.y+w.height/2+.02;
  const next=[];
  for(const box of WALLS){const normal0=horizontal?box.z0:box.x0,normal1=horizontal?box.z1:box.x1,min=horizontal?box.x0:box.z0,max=horizontal?box.x1:box.z1;
   if(normal1-normal0>.8||normal0>fixed+.3||normal1<fixed-.3||max<=a||min>=b||box.y1<=lo||box.y0>=hi){next.push(box);continue;}
   const add=(u0,u1,y0,y1)=>{if(u1-u0>.015&&y1-y0>.015)next.push({...box,[horizontal?'x0':'z0']:u0,[horizontal?'x1':'z1']:u1,y0,y1});};
   add(min,Math.max(min,a),box.y0,box.y1);add(Math.min(max,b),max,box.y0,box.y1);const l=Math.max(min,a),r=Math.min(max,b);add(l,r,box.y0,Math.max(box.y0,lo));add(l,r,Math.min(box.y1,hi),box.y1);
  }
  WALLS.splice(0,WALLS.length,...next);
 }
 return windows;
}
