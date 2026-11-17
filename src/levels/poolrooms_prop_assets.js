/*! Copyright (c) 2026 Vendreith. Licensing: see LICENSE.md and THIRD_PARTY_NOTICES.md. */
// Original procedural pool equipment. No downloaded model or image assets.
export const AQUA_COLORS={yellow:0xffd82f,red:0xe94349,blue:0x278fdb,green:0x63bc77,mint:0xa1d6bc,cyan:0x7ae5e8,pink:0xf4a6c8,lavender:0xb8a0e3,orange:0xffa14c,white:0xf4f3e9,steel:0xabc1c5,dark:0x233b4b};
const C=AQUA_COLORS,PI=Math.PI;
export const POOL_PROP_LIBRARY={
 duck:'inflatable',small_duck:'toy',flamingo:'inflatable',swan:'inflatable',dolphin:'inflatable',fish:'inflatable',turtle:'inflatable',ring:'inflatable',clear_ring:'inflatable',rainbow_ring:'inflatable',beach_ball:'inflatable',striped_ball:'inflatable',mattress:'inflatable',cushion:'inflatable',arm_floaties:'equipment',
 goggles:'equipment',swim_cap:'equipment',kickboard:'equipment',noodles:'equipment',diving_rings:'equipment',lane_divider:'equipment',pool_ladder:'equipment',life_ring:'equipment',rescue_pole:'equipment',depth_marker:'equipment',thermometer:'equipment',cleaning_cart:'equipment',basket:'equipment',towel_rack:'furniture',chair:'furniture',lounger:'furniture',table:'furniture',stool:'furniture',bench:'furniture',locker:'furniture',open_locker:'furniture',shower:'equipment',towel_shelf:'furniture',storage_cabinet:'furniture',plastic_container:'equipment',lifeguard_chair:'furniture',bucket_fountain:'attraction',mushroom_fountain:'attraction',water_jets:'attraction',waterfall:'attraction',playground:'attraction',rope_barrier:'equipment',slide_mouth:'attraction'
};

// Unit primitives are transformed and instanced by the renderer. The y=0 plane
// is the deck or waterline; submerged toys may use a negative world elevation.
export function poolPropParts(kind,color=C.cyan){
 const p=[],add=(geo,x,y,z,sx,sy,sz,c=color,rx=0,ry=0,rz=0,mat='wet')=>p.push({geo,pos:[x,y,z],scale:[sx,sy,sz],rot:[rx,ry,rz],color:c,mat});
 const box=(x,y,z,sx,sy,sz,c=color,rx=0,ry=0,rz=0,mat='wet')=>add('box',x,y,z,sx,sy,sz,c,rx,ry,rz,mat);
 const ball=(x,y,z,sx,sy=sx,sz=sx,c=color,mat='wet')=>add('sphere',x,y,z,sx,sy,sz,c,0,0,0,mat);
 const rod=(x,y,z,r,h,c=C.steel,rx=0,ry=0,rz=0)=>add('cylinder',x,y,z,r,h,r,c,rx,ry,rz,'metal');
 const ring=(x,y,z,r,c=color,rx=PI/2,mat='wet',sy=1)=>add('torus',x,y,z,r,r*sy,r,c,rx,0,0,mat);
 const eyes=(x,y,z,span=.3)=>{for(const s of[-1,1]){ball(x+s*span,y,z,.075,.09,.055,C.dark);ball(x+s*span-.015,y+.025,z-.04,.022,.022,.018,C.white);}};
 const floatRing=(c=color,mat='wet')=>ring(0,.12,0,1,c,PI/2,mat,.95);
 const chair=(height=.45)=>{box(0,height,0,.66,.09,.65,C.white);box(0,height+.36,.29,.66,.7,.085,C.white,.08);for(const x of[-.25,.25])for(const z of[-.25,.25])rod(x,height/2,z,.035,height,C.white);};
 const shelf=(locker=false)=>{for(const x of[-.5,.5])box(x,.95,0,.06,1.9,.58,C.white);box(0,.95,.26,1,1.9,.06,C.white);for(const y of[.06,.6,1.22,1.86])box(0,y,0,1,.06,.58,C.white);if(!locker)for(const y of[.7,1.3])for(const x of[-.27,.27])box(x,y,-.02,.4,.15,.43,x<0?C.cyan:C.white);};
 if(kind==='duck'||kind==='small_duck'){
   ball(0,.25,.05,1.05,.62,1.35,C.yellow);ball(0,.78,-.8,.43,.62,.45,C.yellow);ball(0,1.08,-1.13,.58,.58,.58,C.yellow);box(0,.99,-1.7,.67,.17,.48,C.orange);eyes(0,1.25,-1.6,.32);for(const s of[-1,1])ball(s*.88,.35,.08,.24,.36,.72,0xffcb23);add('cone',0,.5,1.18,.35,.8,.35,C.yellow,.7);ring(0,.1,.08,.82,0xffe758);
 }else if(['flamingo','swan'].includes(kind)){
   const c=kind==='swan'?C.white:C.pink;floatRing(c);for(const s of[-1,1])ball(s*.7,.36,.15,.38,.23,.9,c);add('bird_neck',0,0,0,1,1,1,c);ball(0,2,-.91,.31,.28,.35,c);box(0,1.94,-1.28,.22,.15,.4,kind==='swan'?C.orange:C.dark);eyes(0,2.08,-1.13,.19);
 }else if(kind==='dolphin'||kind==='fish'||kind==='turtle'){
   if(kind==='turtle'){ball(0,.22,0,.9,.36,1.03,C.green);ball(0,.2,-1,.32,.24,.4,C.green);for(const s of[-1,1])for(const z of[-.5,.5])ball(s*.8,.05,z,.52,.1,.27,C.green);eyes(0,.3,-1.27,.17);}
   else{ball(0,.3,0,.6,.48,1.35,color);ball(0,.37,-1.25,.28,.2,.55,color);for(const s of[-1,1])add('cone',s*.6,.18,.05,.35,.8,.15,color,0,0,s*PI/2);add('cone',0,.77,.1,.22,.65,.45,color);for(const s of[-1,1])ball(s*.28,.25,1.3,.5,.13,.35,color);eyes(0,.52,-1,.3);}
 }else if(['ring','clear_ring','rainbow_ring','life_ring','diving_rings'].includes(kind)){
   if(kind==='life_ring'){ring(0,1.2,0,1,C.white,0);for(const s of[-1,1])box(0,1.2+s*.85,-.18,.4,.3,.1,C.red);rod(0,.6,.15,.03,1.2);box(0,.04,.15,.55,.08,.45,C.white);}
   else if(kind==='diving_rings')for(let i=0;i<3;i++)ring((i-1)*.45,.09,i*.12,.36,[C.red,C.yellow,C.blue][i]);
   else{floatRing(color,kind==='clear_ring'?'clear':'wet');if(kind==='rainbow_ring')for(let i=0;i<8;i++){const a=i/8*PI*2;ball(Math.cos(a),.12,Math.sin(a),.26,.19,.26,Object.values(C)[i]);}}
 }else if(kind==='beach_ball'||kind==='striped_ball'){
   add('striped_sphere',0,.65,0,.72,.72,.72,C.white);ball(0,1.37,0,.09,.025,.09,C.white);
 }else if(kind==='mattress'){
   for(let i=0;i<6;i++)add('capsule',(i-2.5)*.25,.12,0,.12,1.0,.12,color,PI/2);ball(0,.24,-1.2,.8,.2,.25,color);
 }else if(kind==='cushion'){ball(0,.12,0,.65,.22,.65,color);ring(0,.25,0,.25,C.white);}
 else if(kind==='arm_floaties'){for(const x of[-.3,.3]){box(x,.18,0,.42,.35,.45,color);ring(x,.18,0,.14,C.white,0);}}
 else if(kind==='goggles'){for(const x of[-.16,.16]){ball(x,.06,0,.16,.07,.11,C.dark,'clear');ring(x,.06,0,.15,color,PI/2);}box(0,.06,0,.11,.05,.04,color);ring(0,.05,.02,.4,color,PI/2,'wet',.6);}
 else if(kind==='swim_cap'){ball(0,.09,0,.28,.14,.26,color);ring(0,.03,0,.27,C.white);}
 else if(kind==='kickboard'){ball(0,.07,0,.42,.09,.65,color);for(const x of[-.18,.18])ball(x,.15,-.25,.055,.015,.12,C.white);}
 else if(kind==='noodles'){for(let i=0;i<4;i++)add('capsule',(i-1.5)*.2,.13+i*.015,0,.08,.9,.08,[C.yellow,C.pink,C.green,C.blue][i],PI/2,0,.12*(i-1.5));}
 else if(kind==='lane_divider'){rod(0,.05,0,.018,7,C.white,0,0,PI/2);for(let i=0;i<20;i++)ball(-3.2+i*.34,.07,0,.14,.12,.14,i%4<2?C.red:C.white);}
 else if(kind==='pool_ladder'){for(const x of[-.43,.43]){rod(x,.6,0,.055,2.8);add('torus',x,1.73,.1,.28,.28,.28,C.steel,0,PI/2,0,'metal');}for(let i=0;i<6;i++)rod(0,-.65+i*.38,0,.04,.86,C.steel,0,0,PI/2);}
 else if(kind==='rescue_pole'){rod(0,1.8,0,.025,3.6);ring(0,3.65,0,.24,C.red,0);box(0,.05,0,.5,.1,.4,C.white);}
 else if(kind==='depth_marker'){box(0,.45,0,.75,.9,.08,C.white);add('sign',0,.45,-.047,.62,.62,1,C.white,0,0,0,'sign');}
 else if(kind==='thermometer'){box(0,.7,0,.13,1.4,.09,C.white);box(0,.7,-.05,.035,1.1,.015,C.red);for(let i=0;i<9;i++)box(.05,.2+i*.12,-.06,.055,.015,.01,C.dark);}
 else if(kind==='basket'||kind==='plastic_container'){box(0,.06,0,.72,.1,.56,color);for(const x of[-.35,.35])box(x,.23,0,.055,.36,.56,color);for(const z of[-.26,.26])box(0,.23,z,.72,.36,.055,color);if(kind==='basket')for(let i=0;i<5;i++)box((i-2)*.13,.22,-.3,.045,.35,.03,C.white);}
 else if(kind==='chair')chair();
 else if(kind==='lifeguard_chair'){chair(1.8);for(const x of[-.45,.45])rod(x,.9,-.65,.035,2);for(let i=0;i<6;i++)rod(0,.2+i*.29,-.65,.035,.9,C.white,0,0,PI/2);box(0,2.7,.4,1.2,.07,1.1,color);}
 else if(kind==='lounger'){box(0,.3,0,.72,.08,1.7,C.white);box(0,.65,.85,.72,.08,1.05,C.white,-.65);for(const x of[-.28,.28])for(const z of[-.65,.65])rod(x,.16,z,.035,.32,C.white);for(let i=0;i<10;i++)box(0,.35,-.72+i*.15,.68,.025,.04,color);}
 else if(kind==='table'){rod(0,.4,0,.055,.8,C.white);add('cylinder',0,.83,0,.65,.09,.65,C.white);for(const x of[-.35,.35])box(x,.05,0,.1,.1,.8,C.white);}
 else if(kind==='stool'){add('cylinder',0,.48,0,.34,.08,.34,color);for(const x of[-.22,.22])for(const z of[-.22,.22])rod(x,.23,z,.03,.46,C.white);}
 else if(kind==='bench'){box(0,.42,0,2.6,.16,.65,C.white);box(0,.84,.29,2.6,.66,.13,C.white);for(const x of[-.95,.95])box(x,.19,0,.24,.38,.55,C.white);}
 else if(kind==='towel_shelf'||kind==='storage_cabinet'){shelf();if(kind==='storage_cabinet')for(const x of[-.25,.25]){box(x,.95,-.33,.46,1.75,.04,color);rod(x+(x<0?.13:-.13),.95,-.38,.025,.2);}}
 else if(kind==='locker'||kind==='open_locker'){shelf(true);if(kind==='locker')box(0,.95,-.32,.95,1.76,.045,color);else box(.76,.95,-.56,.95,1.76,.045,color,0,-1.1);for(let i=0;i<3;i++)box(0,1.48+i*.07,-.35,.48,.018,.01,C.dark);}
 else if(kind==='towel_rack'){for(const x of[-.55,.55])rod(x,.65,0,.035,1.3);for(const y of[.5,1.2]){rod(0,y,0,.025,1.1,C.steel,0,0,PI/2);box(0,y-.2,-.035,.65,.42,.06,color);}}
 else if(kind==='shower'){rod(0,1.2,0,.035,2.4);rod(0,2.4,-.22,.035,.45,C.steel,PI/2);add('cylinder',0,2.36,-.45,.15,.06,.15,C.steel);for(const x of[-.12,.12])ball(x,1,0,.055,.055,.055,x<0?C.red:C.blue);}
 else if(kind==='cleaning_cart'){box(0,.5,0,.68,.6,.8,color);for(const x of[-.3,.3])for(const z of[-.3,.3])ball(x,.13,z,.12,.12,.12,C.dark);rod(.3,1.4,.4,.025,2.4,C.steel,0,0,.2);box(.55,.15,.4,.5,.16,.2,C.white);ring(0,1,0,.35,C.white);}
 else if(kind==='bucket_fountain'){for(const x of[-.8,.8])for(const z of[-.6,.6])rod(x,1.5,z,.08,3,C.blue);add('cylinder',0,3.4,0,.95,1.1,.95,color,.24);add('cylinder',0,3.94,0,.85,.025,.85,C.cyan);rod(0,3.3,0,.04,2.2,C.steel,0,0,PI/2);}
 else if(kind==='mushroom_fountain'){rod(0,1,0,.17,2,C.yellow);ball(0,2.1,0,1.3,.22,1.3,color);for(let i=0;i<10;i++){const a=i/10*PI*2;add('cylinder',Math.cos(a)*1.17,1.05,Math.sin(a)*1.17,.025,1.9,.025,C.cyan,0,0,0,'clear');}add('cylinder',0,.06,0,1.5,.12,1.5,C.white);}
 else if(kind==='water_jets'){for(let i=0;i<5;i++){add('cylinder',(i-2)*.45,.6+i*.1,0,.035,1.2+i*.2,.035,C.cyan,0,0,0,'clear');add('cylinder',(i-2)*.45,.02,0,.1,.04,.1,C.steel);}}
 else if(kind==='waterfall'){for(const x of[-1.3,1.3])box(x,1.5,0,.3,3,.6,C.white);box(0,3,0,2.9,.25,.7,C.white);box(0,1.5,0,2.3,2.8,.04,C.cyan,0,0,0,'clear');}
 else if(kind==='playground'){for(const x of[-.9,.9])for(const z of[-.9,.9])rod(x,1,z,.1,2,[C.blue,C.green][x>0?1:0]);box(0,1.6,0,2.2,.18,2.2,C.yellow);add('cone',0,3.2,0,1.8,.9,1.8,C.red);for(let i=0;i<5;i++)box(0,.2+i*.3,-1.6+i*.13,1.1,.13,.3,C.cyan);rod(0,2.4,0,.08,1.2,C.orange);}
 else if(kind==='rope_barrier'){for(const x of[-1.3,1.3]){rod(x,.45,0,.04,.9);add('cylinder',x,.04,0,.25,.08,.25,C.white);}rod(0,.8,0,.025,2.6,color,0,0,PI/2);}
 else if(kind==='slide_mouth'){ring(0,1.25,0,1.2,color,0);for(const x of[-1.15,1.15])rod(x,.6,0,.07,1.2,C.white);}
 else throw new Error('Unknown aquatic prop '+kind);
 return p;
}
