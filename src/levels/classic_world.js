/* Copyright (c) 2026 Vendreith. Original geometry, props, materials and static irradiance. */
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { inClassic, segmentHitsBox } from './classic_layout.js';

export function sampleClassicLight(c,x,y,z,nx=0,ny=1,nz=0) {
  const px=x+nx*.035,pz=z+nz*.035,py=y+ny*.025;
  let value=.006;const walls=c.wallIndex.near(px,pz,8);
  for(const l of c.lightIndex.near(px,pz,8)){
    const dx=l.x-px,dz=l.z-pz,dy=l.y-py,d=Math.hypot(dx,dy,dz);if(d>8.2)continue;
    if(walls.some(w=>w.y1>Math.min(py,l.y)+.005&&w.y0<Math.max(py,l.y)&&segmentHitsBox(px,pz,l.x,l.z,w)))continue;
    const cosine=Math.max(0,(dx*nx+dy*ny+dz*nz)/Math.max(.01,d));
    value+=(cosine*2.4+.22)*l.gain*(1-d/8.2)**2;
  }
  return value*Math.exp(Math.min(0,y)*.17);
}
function textileTexture(kind) {
  const canvas=document.createElement('canvas');canvas.width=canvas.height=128;const ctx=canvas.getContext('2d');
  if(kind==='ceiling'){ctx.fillStyle='#bdbeb4';ctx.fillRect(0,0,128,128);ctx.fillStyle='#72766f';ctx.fillRect(0,0,2,128);ctx.fillRect(0,0,128,2);ctx.fillStyle='#c9c9c0';ctx.fillRect(3,3,124,124);for(let i=0;i<350;i++){const x=(i*53)%124+3,y=(i*71)%124+3;ctx.fillStyle='rgba(65,66,59,.055)';ctx.fillRect(x,y,1,1);}}
  else{ctx.fillStyle='#a99b71';ctx.fillRect(0,0,128,128);for(let i=0;i<9000;i++){const x=(i*37+Math.floor(i/128)*13)%128,y=(i*71+Math.floor(i/57)*29)%128;ctx.fillStyle=i%2?'rgba(54,44,25,.08)':'rgba(225,216,179,.10)';ctx.fillRect(x,y,1,i%3?1:2);}}
  const t=new THREE.CanvasTexture(canvas);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=4;return t;
}
function litMaterial(color,roughness=1,map=null) {
  const m=new THREE.MeshStandardMaterial({color,roughness,metalness:0,map});
  m.onBeforeCompile=s=>{
    s.vertexShader='attribute float classicIrradiance; varying float vClassicIrradiance;\n'+s.vertexShader;
    s.vertexShader=s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvClassicIrradiance=classicIrradiance;');
    s.fragmentShader='varying float vClassicIrradiance;\n'+s.fragmentShader;
    // Static direct + indirect are visibility-baked. Existing dynamic flashlights still use Standard shadowing.
    // Global ambient is deliberately excluded here; the legacy world's lighting remains untouched.
    s.fragmentShader=s.fragmentShader.replace('vec3 totalDiffuse = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse;','vec3 totalDiffuse = reflectedLight.directDiffuse + diffuseColor.rgb * vClassicIrradiance;');
  };m.customProgramCacheKey=()=> 'classic-occluded-irradiance-v10';return m;
}
export function buildClassicWorld(root,c,track) {
  const began=performance.now(),carpet=track(textileTexture('carpet')),tiles=track(textileTexture('ceiling'));
  const mats={wall:track(litMaterial(0xb9ad70)),floor:track(litMaterial(0xb3a276,1,carpet)),ceiling:track(litMaterial(0xffffff,1,tiles)),trim:track(litMaterial(0x716a4d)),wood:track(litMaterial(0x67503c,.86)),fabric:track(litMaterial(0x716c55)),plastic:track(litMaterial(0xaaa99b,.8)),metal:track(litMaterial(0x777c77,.68)),black:track(litMaterial(0x171a18,.76)),white:track(litMaterial(0xcecdbf)),glass:track(litMaterial(0x52605a,.45)),rust:track(litMaterial(0x735247)),green:track(litMaterial(0x4b5a3f)),shaft:track(litMaterial(0x626052))};
  const cellSize=25,buckets=new Map(),chunks=[],lampBuckets=new Map();
  const chunkKey=(x,z)=>Math.floor((x-c.x0)/cellSize)+','+Math.floor((z-c.z0)/cellSize);
  const irradianceCache=new Map();
  const bake=g=>{const pos=g.attributes.position,n=g.attributes.normal,data=new Float32Array(pos.count);for(let i=0;i<pos.count;i++){const x=pos.getX(i),y=pos.getY(i),z=pos.getZ(i),nx=n.getX(i),ny=n.getY(i),nz=n.getZ(i);const k=[Math.round(x*4),Math.round(y*4),Math.round(z*4),Math.round(nx),Math.round(ny),Math.round(nz)].join(',');let v=irradianceCache.get(k);if(v===undefined){v=sampleClassicLight(c,x,y,z,nx,ny,nz);irradianceCache.set(k,v);}data[i]=v;}g.setAttribute('classicIrradiance',new THREE.BufferAttribute(data,1));return g;};
  const add=(g,mat,x,z)=>{bake(g);const k=chunkKey(x,z)+'|'+mat;if(!buckets.has(k))buckets.set(k,[]);buckets.get(k).push(g);};
  const box=(x,y,z,w,h,d,mat='wall',rot=0,detail=false)=>{const g=new THREE.BoxGeometry(w,h,d,detail?1:Math.max(1,Math.ceil(w/1.1)),detail?1:Math.max(1,Math.ceil(h/.9)),detail?1:Math.max(1,Math.ceil(d/1.1)));if(rot)g.rotateY(rot);g.translate(x,y,z);add(g,mat,x,z);};
  const surface=(b,y,ceiling=false)=>{if(b.x1-b.x0<.005||b.z1-b.z0<.005)return;const w=b.x1-b.x0,d=b.z1-b.z0,x=(b.x0+b.x1)/2,z=(b.z0+b.z1)/2,g=new THREE.PlaneGeometry(w,d,Math.ceil(w/1.1),Math.ceil(d/1.1));g.rotateX(ceiling?Math.PI/2:-Math.PI/2);g.translate(x,y,z);const p=g.attributes.position,uv=g.attributes.uv;for(let i=0;i<p.count;i++)uv.setXY(i,(p.getX(i)-(ceiling?c.x0:0))/(ceiling?1.25:.8),(p.getZ(i)-(ceiling?c.z0:0))/(ceiling?1.25:.8));add(g,ceiling?'ceiling':'floor',x,z);};
  const subtract=(a,b)=>{if(a.x1<=b.x0||a.x0>=b.x1||a.z1<=b.z0||a.z0>=b.z1)return[a];return[{x0:a.x0,x1:Math.max(a.x0,b.x0),z0:a.z0,z1:a.z1},{x0:Math.min(a.x1,b.x1),x1:a.x1,z0:a.z0,z1:a.z1},{x0:Math.max(a.x0,b.x0),x1:Math.min(a.x1,b.x1),z0:a.z0,z1:Math.max(a.z0,b.z0)},{x0:Math.max(a.x0,b.x0),x1:Math.min(a.x1,b.x1),z0:Math.min(a.z1,b.z1),z1:a.z1}].filter(r=>r.x1>r.x0&&r.z1>r.z0);};
  for(const r of c.rooms){let parts=[r];for(const p of c.pits)parts=parts.flatMap(a=>subtract(a,p));for(const b of parts)surface(b,0);const cabin={x0:c.elevator.x-1.85,x1:c.elevator.x+1.85,z0:c.elevator.z-1.65,z1:c.elevator.z+1.65};for(const ceil of subtract(r,cabin))surface(ceil,c.ceiling,true);}
  for(const con of c.connectors)for(const floor of con.floors){surface(floor,.003);surface(floor,floor.ceiling,true);}
  for(const w of c.walls){if(w.prop||w.skipRender)continue;box((w.x0+w.x1)/2,(w.y0+w.y1)/2,(w.z0+w.z1)/2,w.x1-w.x0,w.y1-w.y0,w.z1-w.z0,w.shaft?'shaft':'wall');if(!w.shaft&&w.y0===0){const width=w.x1-w.x0,depth=w.z1-w.z0;if(width>1||depth>1)box((w.x0+w.x1)/2,.045,(w.z0+w.z1)/2,width+.025,.09,depth+.025,'trim',0,true);}}
  for(const p of c.pits){for(const bridge of p.bridges){surface(bridge,.015);box((bridge.x0+bridge.x1)/2,-.08,(bridge.z0+bridge.z1)/2,bridge.x1-bridge.x0,.16,bridge.z1-bridge.z0,'wood');}surface(p,-p.depth);for(let y=-2;y>-p.depth;y-=3){box((p.x0+p.x1)/2,y,p.z0-.025,p.x1-p.x0,.05,.09,'trim',0,true);box((p.x0+p.x1)/2,y,p.z1+.025,p.x1-p.x0,.05,.09,'trim',0,true);}}
  // Every type is a distinct reusable silhouette, assembled from original geometry.
  const prop=p=>{
    const R=p.rot||0,cs=Math.cos(R),sn=Math.sin(R),base=p.y||0;
    const b=(x,y,z,w,h,d,m='wood')=>box(p.x+x*cs+z*sn,base+y,p.z+z*cs-x*sn,w,h,d,m,R,true);
    const cylinder=(x,y,z,rad,h,m='metal',axis='y')=>{const g=new THREE.CylinderGeometry(rad,rad,h,12);if(axis==='z')g.rotateX(Math.PI/2);g.rotateY(R);g.translate(p.x+x*cs+z*sn,base+y,p.z+z*cs-x*sn);add(g,m,p.x,p.z);};
    const legs=(w=.55,d=.5,h=.45)=>{for(const x of[-w/2,w/2])for(const z of[-d/2,d/2])b(x,h/2,z,.045,h,.045,'metal');};
    const t=p.type;
    if(['chair','stool','bench','sofa'].includes(t)){const w=t==='sofa'?1.65:t==='bench'?1.5:.55;legs(w-.12,.45,.43);b(0,.46,0,w,.13,.57,t==='sofa'?'fabric':'wood');if(t!=='stool')b(0,.8,.25,w,.57,.12,t==='sofa'?'fabric':'wood');if(t==='sofa'){b(-.77,.62,0,.17,.3,.6,'fabric');b(.77,.62,0,.17,.3,.6,'fabric');b(0,.54,-.04,1.3,.1,.5,'fabric');}}
    else if(['table','folding_table'].includes(t)){legs(1.25,.65,.71);b(0,.74,0,1.6,.055,.9,t==='table'?'wood':'plastic');if(t==='folding_table'){b(0,.35,0,1.1,.025,.05,'metal');}}
    else if(t==='mattress'){b(0,.13,0,1.25,.26,.95,'fabric');for(const x of[-.45,-.15,.15,.45])b(x,.268,0,.012,.009,.85,'white');}
    else if(t==='floor_lamp'){cylinder(0,.03,0,.24,.06);cylinder(0,.8,0,.022,1.6);const g=new THREE.CylinderGeometry(.19,.32,.32,16,1,true);g.rotateY(R);g.translate(p.x,base+1.6,p.z);add(g,'fabric',p.x,p.z);}
    else if(t==='fan'){cylinder(0,.04,0,.24,.08);b(0,.5,0,.045,.9,.045,'metal');cylinder(0,1.02,0,.31,.09,'metal','z');cylinder(0,1.02,-.06,.25,.016,'black','z');for(let a=0;a<5;a++){const angle=a*Math.PI*2/5;b(Math.sin(angle)*.12,1.02+Math.cos(angle)*.12,-.08,.1,.19,.025,'plastic');}}
    else if(['television','monitor','microwave'].includes(t)){b(0,.36,0,.72,.58,.5,'plastic');b(-.05,.39,-.26,.53,.4,.025,'black');b(-.05,.4,-.277,.45,.32,.014,'glass');b(.29,.47,-.28,.06,.06,.03,'metal');if(t==='monitor')b(0,.06,0,.42,.08,.35,'black');if(t==='microwave')b(.3,.26,-.28,.035,.17,.035,'black');}
    else if(['cabinet','filing_cabinet','refrigerator','vending','dispenser'].includes(t)){const h=t==='cabinet'?1.15:t==='filing_cabinet'?1.3:1.85;b(0,h/2,0,.7,h,.6,t==='cabinet'?'wood':'white');const parts=t==='filing_cabinet'?4:t==='cabinet'?2:2;for(let i=0;i<parts;i++){b(0,(i+.5)*h/parts,-.31,.64,h/parts-.025,.025,t==='cabinet'?'wood':'plastic');b(.2,(i+.5)*h/parts,-.34,.07,.025,.035,'metal');}if(t==='vending')b(-.09,1.15,-.34,.44,.8,.02,'glass');if(t==='dispenser'){cylinder(0,2.01,0,.24,.4,'glass');b(0,1.22,-.34,.3,.35,.05,'black');}}
    else if(['bookcase','shelf'].includes(t)){b(-.43,.82,0,.055,1.64,.45);b(.43,.82,0,.055,1.64,.45);b(0,.82,.21,.9,1.64,.035);for(let i=0;i<5;i++)b(0,.04+i*.39,0,.9,.045,.45,t==='shelf'?'metal':'wood');}
    else if(['clock','mirror','frame','screen'].includes(t)){if(t==='clock'){cylinder(0,.73,0,.3,.08,'wood','z');cylinder(0,.73,-.05,.26,.012,'white','z');b(0,.79,-.065,.018,.18,.01,'black');b(.05,.73,-.065,.12,.018,.01,'black');legs(.48,.3,.43);}else{const h=t==='screen'?1.65:1.2,w=t==='screen'?1.15:.65;legs(w-.1,.3,.2);b(0,h/2+.1,0,w,h,.08,'wood');b(0,h/2+.1,-.05,w-.09,h-.09,.02,t==='mirror'?'glass':'fabric');}}
    else if(['bin','bucket','laundry','container'].includes(t)){const h=t==='laundry'?.5:.4;const g=new THREE.CylinderGeometry(.25,.2,h,12,1,true);g.translate(p.x,base+h/2,p.z);add(g,t==='bin'?'metal':'plastic',p.x,p.z);cylinder(0,.04,0,.195,.02,'black');if(t==='bucket'){b(-.27,.46,0,.025,.22,.025,'metal');b(.27,.46,0,.025,.22,.025,'metal');b(0,.57,0,.54,.025,.025,'metal');}}
    else if(t==='mop'){b(0,.8,0,.025,1.55,.025,'wood');b(0,.055,0,.48,.08,.18,'fabric');}
    else if(t==='vacuum'){b(0,.25,0,.36,.42,.37,'plastic');cylinder(-.2,.1,0,.1,.07,'black','z');cylinder(.2,.1,0,.1,.07,'black','z');b(.25,.59,.08,.045,.85,.045,'metal');b(.25,.025,-.27,.42,.04,.25,'black');}
    else if(t==='boxes'){b(-.16,.18,0,.52,.36,.48,'wood');b(.14,.49,.02,.38,.25,.38,'wood');b(-.16,.365,0,.055,.009,.48,'plastic');}
    else if(t==='toy'){b(0,.1,0,.4,.16,.22,'rust');for(const x of[-.16,.16])for(const z of[-.12,.12])cylinder(x,.065,z,.07,.04,'black','z');b(0,.23,0,.17,.1,.18,'plastic');}
    else if(t==='luggage'){b(0,.34,0,.49,.65,.28,'fabric');b(0,.69,0,.22,.045,.06,'black');for(const x of[-.19,.19])cylinder(x,.04,.06,.045,.035,'black','z');}
    else if(t==='telephone'){b(0,.4,0,.52,.7,.38,'wood');b(0,.78,0,.29,.08,.24,'black');b(0,.87,0,.42,.08,.1,'black');for(let i=0;i<3;i++)b(0,.832,-.045+i*.04,.1,.012,.018,'white');}
    else if(t==='coat_stand'){cylinder(0,.85,0,.035,1.7,'wood');for(let i=0;i<4;i++){const a=i*Math.PI/2;b(Math.cos(a)*.2,.06,Math.sin(a)*.2,.4,.05,.05);b(Math.cos(a)*.15,1.55,Math.sin(a)*.15,.3,.04,.05);}}
    else if(t==='plant'){cylinder(0,.18,0,.21,.36,'rust');b(0,.65,0,.035,.8,.035,'wood');for(let i=0;i<8;i++){const a=i*2.4;b(Math.cos(a)*.16,.55+i*.07,Math.sin(a)*.16,.22,.045,.13,'green');}}
  };
  for(const d of c.decks)box((d.x0+d.x1)/2,d.y/2,(d.z0+d.z1)/2,d.x1-d.x0,d.y,d.z1-d.z0,'floor');
  for(const st of c.stairs)for(let i=0;i<st.steps;i++)box(st.x,st.rise*(i+1)/2,st.z+st.run*(i+.5),st.width,st.rise*(i+1),st.run,'wall');
  for(const piece of c.setPieces){if(piece.type==='waiting')for(let i=0;i<3;i++)prop({type:'chair',x:piece.x-1.7+i*1.7,z:piece.z-2.5,y:0,rot:.1*i});if(piece.type==='domestic')prop({type:'sofa',x:piece.x,z:piece.z,y:0,rot:0});}
  for(const p of c.props)prop(p);
  for(const d of c.dreams){
    if(d.type==='hollow_columns'){for(const [x,z] of [[-3,-3],[3,-2],[-2,3],[3,3]]){for(const [ox,oz,w,dep]of[[-.38,0,.16,.92],[.38,0,.16,.92],[0,-.38,.6,.16]])box(d.x+x+ox,1.45,d.z+z+oz,w,2.9,dep);}}
    if(d.type==='doorway_recurrence')for(let i=0;i<5;i++){const z=d.z-4+i*2;box(d.x-1.3,1.45,z,.3,2.9,.25);box(d.x+1.3,1.45,z,.3,2.9,.25);box(d.x,2.65,z,2.6,.5,.25);}
    if(d.type==='suspended_domestic'){box(d.x,.5,d.z,4,.18,3,'wood');prop({type:'sofa',x:d.x,z:d.z+.6,y:.59});prop({type:'table',x:d.x,z:d.z-1,y:.59});}
    if(d.type==='stair_to_false_landing'){for(let i=0;i<7;i++)box(d.x-2+i*.33,.09*(i+1),d.z,.34,.18*(i+1),1.25,'wall');box(d.x+.45,1.15,d.z,1.2,.15,1.25,'floor');box(d.x+.95,1.92,d.z,.2,1.9,1.8,'wall');}
    if(d.type==='waiting_room')for(let i=0;i<4;i++)prop({type:'chair',x:d.x-2.4+i*1.5,z:d.z,y:0,rot:i%2?.2:Math.PI});
  }
  for(const [k,geoms]of buckets){const mat=k.split('|')[1],g=track(mergeGeometries(geoms,false));for(const a of geoms)a.dispose();g.computeBoundingBox();const mesh=new THREE.Mesh(g,mats[mat]);mesh.castShadow=true;mesh.receiveShadow=true;mesh.userData.classic=true;root.add(mesh);const bb=g.boundingBox;chunks.push({mesh,minX:bb.min.x,maxX:bb.max.x,minZ:bb.min.z,maxZ:bb.max.z,prop:!['wall','floor','ceiling','trim','shaft'].includes(mat)});}
  const frame=track(new THREE.MeshBasicMaterial({color:0x363b35})),active=track(new THREE.MeshBasicMaterial({color:new THREE.Color().setRGB(1.65,1.65,1.65),toneMapped:false})),dead=track(litMaterial(0x8a8c81));
  for(const l of c.fixtures){const k=chunkKey(l.x,l.z);if(!lampBuckets.has(k))lampBuckets.set(k,[]);lampBuckets.get(k).push(l);}
  for(const lights of lampBuckets.values()){
    for(const status of ['frame','active','dead']){const list=status==='frame'?lights:lights.filter(l=>(status==='dead')===l.dead);if(!list.length)continue;const g=track(new THREE.BoxGeometry(status==='frame'?1.28:1.18,status==='frame'?.06:.013,status==='frame'?1.28:1.18));if(status==='dead'){const vals=new Float32Array(g.attributes.position.count).fill(.1);g.setAttribute('classicIrradiance',new THREE.BufferAttribute(vals,1));}const inst=new THREE.InstancedMesh(g,status==='frame'?frame:status==='active'?active:dead,list.length),m=new THREE.Matrix4();for(let i=0;i<list.length;i++){m.makeTranslation(list[i].x,(list[i].y??c.ceiling-.04)+(status==='frame'?.015:-.022),list[i].z);inst.setMatrixAt(i,m);}inst.computeBoundingBox();root.add(inst);const bb=inst.boundingBox;chunks.push({mesh:inst,minX:bb.min.x,maxX:bb.max.x,minZ:bb.min.z,maxZ:bb.max.z});}
  }
  const stats={buildMs:performance.now()-began,chunks:chunks.length,visible:0,cacheSamples:irradianceCache.size,fixtures:c.fixtures.length,activeFixtures:c.fixtures.filter(l=>!l.dead).length};irradianceCache.clear();
  return {stats,chunks,update(position,range=90){let visible=0;for(const ch of chunks){const dx=Math.max(ch.minX-position.x,0,position.x-ch.maxX),dz=Math.max(ch.minZ-position.z,0,position.z-ch.maxZ),limit=ch.prop?Math.min(range,65):Math.min(range,115);ch.mesh.visible=dx*dx+dz*dz<(limit+8)**2;if(ch.mesh.visible)visible++;}stats.visible=visible;},contains:(x,z)=>inClassic(c,x,z)};
}
