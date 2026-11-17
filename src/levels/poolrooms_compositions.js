/*! Copyright (c) 2026 Vendreith. Licensing: see LICENSE.md and THIRD_PARTY_NOTICES.md. */
// Shared construction vocabulary; each case defines its own spatial programme.
export function buildPoolComposition(c,k,h){
 const {platform,wall,stairs,column,POOL_ARCH,SLIDES}=k,{pool,deck,arch,light,pools}=h,y=c.floorY,g=c.art.grammar,w=c.width,d=c.depth;
 const slab=(dx,dz,sx,sz,top)=>platform(c.x+dx-sx/2,c.z+dz-sz/2,c.x+dx+sx/2,c.z+dz+sz/2,y+top);
 const screen=(dx,dz,sx,sz,height,base=0)=>wall(c.x+dx-sx/2,c.z+dz-sz/2,c.x+dx+sx/2,c.z+dz+sz/2,y+base,y+base+height,{half:height<1});
 const vault=(dx,dz,span,len,spring,rise,axis='z')=>POOL_ARCH.push({kind:'barrel_vault',x:c.x+dx,z:c.z+dz,span,len,spring,rise,y0:y,thickness:.3,axis});
 const glow=(dx,dz,top,width,height,hex=0xffe7c4,axis='z')=>POOL_ARCH.push({kind:'glow_panel',x:c.x+dx,z:c.z+dz,y:y+top,width,height,hex,axis});
 const spiral=(radius,height,turns=1,dx=0,dz=0)=>{
   const count=Math.ceil(height/.145),cx=c.x+dx,cz=c.z+dz;
   for(let i=0;i<count;i++){const a=i/count*Math.PI*2*turns,b=(i+1)/count*Math.PI*2*turns,px=cx+Math.cos(a)*radius,pz=cz+Math.sin(a)*radius,qx=cx+Math.cos(b)*radius,qz=cz+Math.sin(b)*radius;platform(Math.min(px,qx)-1.2,Math.min(pz,qz)-1.2,Math.max(px,qx)+1.2,Math.max(pz,qz)+1.2,y+(i+1)/count*height);}
   for(const r of [radius-1.25,radius+1.25]){const path=Array.from({length:count+1},(_,i)=>{const a=i/count*Math.PI*2*turns;return[cx+Math.cos(a)*r,y+i/count*height+.92,cz+Math.sin(a)*r];});POOL_ARCH.push({kind:'pipe_sweep',radius:.065,segments:Math.min(200,count*2),path});for(let i=1;i<path.length;i++){const a=path[i-1],b=path[i];wall(Math.min(a[0],b[0])-.05,Math.min(a[2],b[2])-.05,Math.max(a[0],b[0])+.05,Math.max(a[2],b[2])+.05,Math.min(a[1],b[1])-.2,Math.max(a[1],b[1])+.05,{half:true,collisionOnly:true});k.WALLS.pop();}}
 };
 const gallery=(top,side=-1)=>{slab(side*(w/2-3),0,3,d-4,top);stairs(c.x+side*(w/2-3),c.z0+2,3,Math.min(d-7,top*3),y,y+top);};
 const chute=(dx,dz,width,len,height)=>{SLIDES.push({x0:c.x+dx-width/2,x1:c.x+dx+width/2,z0:c.z+dz,z1:c.z+dz+len,axis:'z',y0:y+height,y1:y+.1,dirX:0,dirZ:1,speed:8,color:0xe9eee8});stairs(c.x+dx-width/2-1.8,c.z+dz,2,Math.max(6,len),y,y+height);slab(dx-1.4,dz,6,2,height);};
 switch(g){
 case'vestibule':
   pool(-5,-4,3,4);pool(4,3,4,5);pool(-5,8,2.2,2);for(const [dx,dz,a]of[[-5,0,'x'],[4,-4,'z'],[0,8,'x']])arch(c.x+dx,c.z+dz,8,2.4,1.8,a);break;
 case'amphitheatre':{
   const p=pool(0,1,13,9,y-.08,1.4);for(let i=0;i<4;i++){const r=15+i*.75,rz=10+i*.75;POOL_ARCH.push({kind:'basin_ring',cx:c.x,cz:c.z+1,rx:r,rz,y0:y-.2,y1:y+i*.17,thickness:.65});platform(c.x-r-.65,c.z+1-rz-.65,c.x+r+.65,c.z+1+rz+.65,y+i*.17,{draw:false,shape:'ellipse',cx:c.x,cz:c.z+1,rx:r+.65,rz:rz+.65,holes:[{cx:c.x,cz:c.z+1,rx:r,rz}]});}stairs(c.x,c.z0+2,6,8,y+.5,p.bedY);for(const z of[-9,0,10])vault(0,z,35,5,3.2,4);break;}
 case'cascade':
   for(let i=0;i<3;i++){const dx=-15+i*15,p=pool(dx,i%2?5:-3,6,7,y-.08+i*.6,1);deck({x0:c.x+dx-7.5,x1:c.x+dx+7.5,z0:c.z-13,z1:c.z+13},y+i*.6,[p]);if(i)stairs(c.x+dx-7.5,c.z+10,3,5,y+(i-1)*.6,y+i*.6,'x');vault(dx,0,14,26,4+i*.6,3);}break;
 case'basilica':
   pool(-16,0,5,12,y-.08,1.8);pool(16,0,5,12,y-.08,1.8);for(const z of[-11,-4,4,11]){arch(c.x,c.z+z,20,5,6,'z','pointed');for(const x of[-10,10])column(c.x+x,c.z+z,.7,7,y);}slab(0,0,6,d-3,.2);break;
 case'scissor':
   pool(-10,0,9,11);pool(11,0,9,11);gallery(2.4,-1);gallery(4.8,1);slab(0,-5,w-6,3,2.4);slab(0,6,w-6,3,4.8);for(const z of[-10,0,10])arch(c.x,c.z+z,w-6,5,5);break;
 case'pump_cloister':
   for(const x of[-8,0,8]){pool(x,0,2.8,6);for(const z of[-7,7]){column(c.x+x,c.z+z,.4,4,y);arch(c.x+x,c.z+z,6,2.4,1.5);}}vault(0,0,25,20,3,3);break;
 case'braid':
   for(const x of[-17,0,17])pool(x,0,5,12);for(let i=0;i<4;i++)slab(i%2?-9:9,-10+i*6,28,2.2,.6);for(const x of[-17,0,17])vault(x,0,12,27,3.5,4);stairs(c.x,c.z0+2,3,4,y,y+.6);break;
 case'compression':
   for(let i=0;i<4;i++){const s=i%2?1:-1;pool(s*5,-8+i*5,2,1.5);screen(s*4,-8+i*5,8,.35,2.6);slab(0,-8+i*5,w-2,2,3.2);}break;
 case'split_lap':
   pool(-6,0,3.3,10);pool(6,0,3.3,10);slab(0,0,3,d-2,.45);vault(-6,0,10,d-2,2.6,2.8);vault(6,0,10,d-2,2.6,2.8);stairs(c.x,c.z0+1,3,3,y,y+.45);break;
 case'procession':
   pool(-6,5,3.4,6);pool(6,-5,3.4,6);for(let i=0;i<6;i++)arch(c.x,c.z-11+i*4.4,18-i*1.25,2.4,4-i*.3);break;
 case'submerged_steps':{
   const p=pool(0,2,10,9,y-.08,1.4);stairs(c.x,c.z0+2,10,15,y,p.bedY);for(let i=0;i<5;i++)slab(0,-9+i*4,w-3,.45,6-i*.6);break;}
 case'mirror_island':
   pool(0,0,10,10,y-.08,1.25);slab(0,0,5,5,.7);slab(0,-6,2,12,.1);stairs(c.x,c.z-4,2,3,y+.1,y+.7);for(const r of[5,8,11])POOL_ARCH.push({kind:'basin_ring',cx:c.x,cz:c.z,rx:r,rz:r,y0:y+5,y1:y+5.3,thickness:.24});break;
 case'glass_gallery':
   pool(4,0,4.8,11,y-.08,2.2);POOL_ARCH.push({kind:'glass_wall',x0:c.x-1,x1:c.x-.88,z0:c.z-10,z1:c.z+10,y0:y-2.2,y1:y+1});slab(-4,0,4,d-2,.1);gallery(1.8,-1);for(const z of[-9,0,9])arch(c.x+3,c.z+z,12,2.7,3);
   // An optional flooded observation bore below the surface, entered on real
   // submerged stairs. It contains water, rather than an unexplained air pocket.
   POOL_ARCH.push({kind:'hollow_conduit',glass:true,x:c.x+4,z:c.z,y:y-1.2,r:1.05,thickness:.08,len:14,axis:'z'});slab(4,0,1.2,14,-2);
   for(const z of[-6,-2,2,6])POOL_ARCH.push({kind:'hollow_conduit',x:c.x+4,z:c.z+z,y:y-1.2,r:1.05,thickness:.14,len:.16,axis:'z'});
   stairs(c.x+4,c.z-13,1.4,6,y,y-2);stairs(c.x+4,c.z+7,1.4,6,y-2,y);break;
 case'serpent':
   for(let i=0;i<3;i++)pool((i%2?1:-1)*5,-7+i*7,5,4.5);for(const [x,z]of[[5,-7],[-5,0],[5,7]])column(c.x+x,c.z+z,1.4,6,y);chute(-8,-9,2.4,17,2.5);break;
 case'split_level':
   pool(0,0,9,9);gallery(2.6,-1);slab(1,6,w-7,3,2.6);slab(6,-2,3,18,2.6);vault(0,0,22,d-3,3.8,3.8);break;
 case'sawtooth':
   pool(0,0,8,8,.0,.55);for(let i=0;i<5;i++){slab(-8+i*4,0,2.6,d-3,6.3+i*.45);glow(-6+i*4,0,7+i*.45,d-4,1.2,0xffeac9);}break;
 case'reverse_echo':
   pool(0,-7,8,4);pool(4,8,5,4);vault(0,-7,21,8,2.6,4,'x');vault(0,7,21,8,2.6,4,'x');screen(0,0,12,.4,1.1);break;
 case'hidden_wall':
   pool(5,6,4.5,5);pool(-6,-7,2.7,3);screen(0,0,16,.45,4.8);glow(0,1,4,8,1,0xc3f1db);vault(0,7,20,10,2.6,2.5);break;
 case'drip':
   pool(0,0,7,7,y-.08,1.8);for(let i=0;i<4;i++)POOL_ARCH.push({kind:'basin_ring',cx:c.x,cz:c.z,rx:4+i*1.7,rz:4+i*1.7,y0:y+7-i*.65,y1:y+7.3-i*.65,thickness:.6});glow(0,0,7,3,1,0xd6f2ec,'x');break;
 case'underbridge':
   pool(0,0,9,10,y-.08,1.3);slab(0,0,w-3,3,3);slab(5,0,3,d-3,5);gallery(3,-1);stairs(c.x+5,c.z0+2,3,12,y+3,y+5);for(const x of[-8,8])column(c.x+x,c.z,1,3,y-1.3);break;
 case'false_end':
   pool(0,7,6,3);screen(0,0,17,.5,4.9);screen(-8,6,.5,12,4.9);arch(c.x,c.z-7,15,2.5,2.2);glow(7,10,3,4,2,0xe6edc6);break;
 case'helix':
   pool(0,0,5,5,y-.08,1.2);spiral(8,4.8);column(c.x,c.z,1,8,y-1.2);slab(8,0,4,7,4.8);break;
 case'rose_cross':
   for(const x of[-6,6])for(const z of[-7,7])pool(x,z,3.2,3.2);for(const z of[-5,5])arch(c.x,c.z+z,7,3,3);for(const x of[-5,5])arch(c.x+x,c.z,9,3,3,'x');slab(0,0,5,5,.3);break;
 case'linked_baths':
   for(const [x,z,r]of[[-6,-7,4.3],[2,0,4],[6,8,3]]){pool(x,z,r,r);vault(x,z,r*2+2,r*2+2,2.8,2.5);}break;
 case'blue_depth':
   pool(3,0,6,11,y-.08,2);stairs(c.x+3,c.z0+1,5,12,y,y-2);slab(-7,0,3,d-2,.2);glow(w/2-.3,0,4,d-5,3,0xb3c7f2);break;
 case'niches':
   pool(0,0,4,4);for(const [x,z,a]of[[-8,0,'x'],[8,0,'x'],[0,8,'z']]){arch(c.x+x,c.z+z,5,2.2,2.4,a);glow(x*(x?1.3:1),z*(z?1.3:1),3,4,3,0xffebc5,a==='x'?'z':'x');}slab(0,0,14,14,5.4);break;
 case'floodgate':
   pool(0,-7,10,4.5);pool(0,7,10,4.5);for(const x of[-8,0,8])arch(c.x+x,c.z,6.4,2.5,3,'z','pointed');slab(0,0,w-3,3,2.8);stairs(c.x0+3,c.z0+1,3,10,y,y+2.8);break;
 case'shadow_arcade':
   pool(5,0,4.5,10);for(let i=0;i<5;i++){arch(c.x-5,c.z-10+i*5,11,2.4,i%2?3.8:2.4,'z',i%2?'pointed':'elliptical');column(c.x-10,c.z-10+i*5,.45,4,y);}vault(-5,0,12,d-2,3,4);break;
 case'slide_exchange':
   pool(0,4,10,8);chute(-6,-10,2.6,20,3);chute(6,-10,2.6,20,4);slab(0,-10,20,3,4);arch(c.x,c.z+8,23,4,4.5);break;
 case'rotunda':
   pool(0,0,12,12,y-.08,1.4);for(let i=0;i<12;i++){const a=i/12*Math.PI*2;column(c.x+Math.cos(a)*17,c.z+Math.sin(a)*17,.7,7,y);if(i%3===0)pool(Math.cos(a)*19,Math.sin(a)*17,3,3);}POOL_ARCH.push({kind:'dome_shell',x:c.x,z:c.z,y0:y+4,rx:23,ry:8,thickness:.3});slab(0,0,3,30,.4);break;
 case'steam':
   for(const [x,z]of[[-15,-3],[0,3],[15,-3]]){pool(x,z,5.5,6);vault(x,z,14,17,2.7,3.7);for(const dz of[-7,7])arch(c.x+x,c.z+z+dz,10,2.5,3.4);}for(const x of[-15,15])k.ANIM_PROPS.push({kind:'steam_vent',x:c.x+x,z:c.z-3,y:y-.05,s:.3});break;
 case'garden':
   for(const [x,z,rx,rz]of[[-15,-7,7,6],[0,5,7,9],[15,-6,6,7],[-15,10,4,4],[16,11,4,4]])pool(x,z,rx,rz);for(const [x,z]of[[-9,3],[8,-6],[8,9],[-17,-14],[18,3]]){slab(x,z,5,5,1.2);column(c.x+x,c.z+z,.6,7,y);slab(x,z,9,8,8);}stairs(c.x-9,c.z-8,3,10,y,y+1.2);break;
 case'observatory':
   pool(0,2,17,12,y-.08,2.2);gallery(3,-1);gallery(6,1);slab(0,-12,w-6,3,6);stairs(c.x0+4,c.z0+2,3,20,y,y+6);for(const x of[-19,19])for(const z of[-10,10])column(c.x+x,c.z+z,.7,11,y);slab(0,0,w-3,d-3,13);break;
 case'aquatic_atrium':
   for(const [x,z]of[[-27,-6],[-8,7],[13,-5],[31,7]]){pool(x,z,8,8);vault(x,z,18,19,3.2,4.2);for(const dz of[-9,9])arch(c.x+x,c.z+z+dz,15,3,4);for(const dx of[-8,8])column(c.x+x+dx,c.z+z,.65,7,y);}gallery(3,-1);gallery(6,1);slab(0,-13,w-7,3,6);slab(0,13,w-7,3,3);for(const z of[-18,18])arch(c.x,c.z+z,w-9,10,7);break;
 case'vertical_conduit':
   pool(0,0,18,18,y-.08,2.2);spiral(15,18,2.2);slab((15+w/2)/2,0,w/2-15+3,3,0);for(const level of[6,12,18]){slab(0,0,w-8,2.8,level);slab(0,0,2.8,d-4,level);const a=level/18*4.4*Math.PI,px=Math.cos(a)*15,pz=Math.sin(a)*15;slab(px,pz/2,3,Math.abs(pz)+2.8,level);for(const x of[-21,21])column(c.x+x,c.z,.9,24,y);}for(const z of[-11,10]){const cy=z<0?9.2:15.2,floor=cy-3.2*.74;POOL_ARCH.push({kind:'hollow_conduit',x:c.x,z:c.z+z,y:y+cy,r:3.2,thickness:.28,len:72,axis:'x'});slab(0,z,72,4.2,floor);for(const side of[-1,1]){slab(side*37,z,6,4,floor-.8);stairs(c.x+side*37,c.z+z-5,3,4,y+floor-.8,y+floor);}POOL_ARCH.push({kind:'glass_wall',x0:c.x-30,x1:c.x+30,z0:c.z+z-1.2,z1:c.z+z-1.1,y0:y+floor,y1:y+floor+1.2});}
   for(let i=0;i<16;i++){const a=i/16*Math.PI*2;POOL_ARCH.push({kind:'curved_wall',cx:c.x,cz:c.z,radius:20,ang0:a+.035,ang1:a+Math.PI*2/16-.035,h:21,y0:y+4,thick:.35,segments:5});}gallery(6,-1);break;
 case'chromatic':
   pool(-30,0,12,19,y-.08,1.6);pool(0,0,10,17,y-.08,1.4);pool(30,0,12,19,y-.08,1.6);for(const z of[-20,-7,7,20]){arch(c.x,c.z+z,86,10,11,'z','pointed');for(const x of[-43,-15,15,43])column(c.x+x,c.z+z,.95,12,y);}gallery(3,-1);gallery(6,1);slab(0,0,w-7,4,3);stairs(c.x-42,c.z0+2,5,16,y,y+3);for(const z of[-17,0,17]){glow(-47.7,z,12,8,14,0xffd6a3);glow(47.7,z,12,8,14,0xb6d9f3);}break;
 default:throw new Error('Missing pool composition '+g);
 }
 deck(c,y,pools);
 // Every authored space has two dry perimeter viewpoints and directional keys.
 const tall=c.ceiling>14,baseIntensity=tall?2600:w>=40?900:380;
 light(g==='vertical_conduit'?-7:-w*.26,g==='vertical_conduit'?-8:-d*.22,g==='vertical_conduit'?22:Math.min(c.ceiling-1,tall?13:5.4),0xffe8c8,baseIntensity,[0,g==='vertical_conduit'?5:0,0],.95);
 light(g==='vertical_conduit'?7:w*.28,g==='vertical_conduit'?8:d*.22,g==='vertical_conduit'?14:Math.min(c.ceiling-1,tall?12:5),0xc4e7ea,baseIntensity*.75,[0,1,0],.95);
 if(!['chromatic','sawtooth','niches'].includes(g))glow(w/2-.25,0,c.ceiling*.62,Math.min(10,d*.4),Math.min(5,c.ceiling*.35));
 c.poolShapes=pools;c.composition=c.art.title;
 c.views=[{name:'entry-reveal',position:[c.x,y+1.62,c.z0+1.6],target:[c.x,y+c.ceiling*.32,c.z+3]},
 {name:'return-perimeter',position:[c.x1-1.6,y+1.62,c.z1-1.6],target:[c.x-w*.1,y+c.ceiling*.27,c.z-d*.1]}];
 if(g==='vertical_conduit'){c.views[0]={name:'shaft-entrance',position:[c.x+8,y+1.62,c.z0+1.6],target:[c.x,y+12,c.z+5]};c.views[1]={name:'upper-shaft',position:[c.x+1,y+19.62,c.z-18],target:[c.x+12,y+3,c.z+3]};}
 if(g==='aquatic_atrium')c.views[1]={name:'pavilion-gallery',position:[c.x0+3,y+4.62,c.z+9],target:[c.x+18,y+4,c.z]};
 if(g==='observatory')c.views[1]={name:'high-overlook',position:[c.x1-3,y+7.62,c.z+7],target:[c.x-7,y+.5,c.z]};
 if(g==='rotunda')c.views[0]={name:'peristyle-reveal',position:[c.x+6.5,y+1.62,c.z0+1.7],target:[c.x,y+4,c.z+3]};
 if(g==='glass_gallery')c.views[1]={name:'submerged-observation-bore',position:[c.x+4,y-.38,c.z-4],target:[c.x+4,y-.25,c.z+5]};
 if(g==='chromatic')c.views[1]={name:'cool-gallery',position:[c.x1-3,y+7.62,c.z+16],target:[c.x-20,y+6,c.z-6]};
}
