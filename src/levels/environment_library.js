/* Copyright (c) 2026 Vendreith. Original reusable environmental silhouettes, dimensions in metres. */
export const ENV_FAMILIES={
 domestic:'chair stool rocking_chair bench sofa armchair bed mattress wardrobe dresser fridge washing_machine oven microwave floor_lamp side_table dining_table bookcase coat_stand fan'.split(' '),
 office:'desk corner_desk office_chair filing_cabinet locker printer copier crt_computer flat_computer whiteboard corkboard conference_table vending water_cooler server_rack mail_sorter archive_cart stacked_trays projector_stand folding_screen'.split(' '),
 industrial:'generator electrical_cabinet maintenance_cart tool_chest workbench steel_shelf ladder scaffold duct_elbow pipe_manifold pressure_tank pump valve_stand cable_reel vent_fan control_console pallet_stack barrier gas_cylinder work_light'.split(' '),
 dream:'statue_geometric stacked_rings tilted_cube door_frame nested_frames stair_pedestal forked_column orb_plinth levitating_blocks mirror_portal obelisk twin_monolith empty_pedestal chair_tower oversized_phone upturned_table spiral_steps cube_lattice suspended_frame folded_plane'.split(' '),
 aquatic:'lifering_stand pool_ladder diving_block deck_chair lounger shower towel_rack rescue_pole kickboard_rack ball_cart lifeguard_chair umbrella flamingo_float duck_float pool_sign pool_bench swim_locker chemical_drum filtration_pump ring_stack'.split(' '),
 landmark:'bridge_arch wide_nested_portal stilt_platform ventilation_gate column_arcade ceiling_grid gantry_crane pipe_cathedral'.split(' ')
};
export function environmentRecipe(type){
 const parts=[],b=(x,y,z,w,h,d,mat='wood',rz=0)=>parts.push({shape:'box',x,y,z,w,h,d,mat,rz});
 const cy=(x,y,z,r,h,mat='metal',rz=0)=>parts.push({shape:'cylinder',x,y,z,w:r*2,h,d:r*2,mat,rz});
 const sphere=(x,y,z,r,mat='stone')=>parts.push({shape:'sphere',x,y,z,w:r*2,h:r*2,d:r*2,mat});
 const ring=(x,y,z,r,t=.08,mat='ceramic',rx=0)=>parts.push({shape:'torus',x,y,z,w:(r+t)*2,h:(r+t)*2,d:t*2,r,t,mat,rx});
 const legs=(w,d,h=.7,mat='metal')=>{for(const x of[-w/2,w/2])for(const z of[-d/2,d/2])b(x,h/2,z,.065,h,.065,mat);};
 const table=(w=1.4,d=.8,h=.76)=>{legs(w-.15,d-.15,h-.06);b(0,h,0,w,.08,d);};
 const chair=(w=.55,h=.9,mat='wood')=>{legs(w-.12,.42,.44);b(0,.47,0,w,.1,.56,mat);b(0,(h+.48)/2,.25,w,h-.48,.09,mat);};
 const cabinet=(w=.75,h=1.6,d=.6,n=3,mat='metal')=>{b(0,h/2,0,w,h,d,mat);for(let i=0;i<n;i++){b(0,(i+.5)*h/n,-d/2-.012,w-.07,h/n-.04,.025,mat==='metal'?'cream':'wood');b(w*.25,(i+.5)*h/n,-d/2-.04,.14,.025,.04,'metal');}};
 const shelf=(w=1.2,h=1.8,d=.5,n=4)=>{for(const x of[-w/2,w/2])b(x,h/2,0,.065,h,d,'metal');for(let i=0;i<n;i++)b(0,.08+i*(h-.1)/(n-1),0,w,.055,d);};
 const monitor=(x=0,y=1.12,flat=false)=>{b(x,y,0,.58,.45,flat?.06:.42,'plastic');b(x,y,-(flat?.04:.22),.5,.36,.02,'screen');b(x,y-.31,0,.12,.18,.12,'metal');};
 const wheels=(w,d)=>{for(const x of[-w/2,w/2])for(const z of[-d/2,d/2])sphere(x,.12,z,.11,'black');};
 const plinth=(h=.65)=>b(0,h/2,0,1.0,h,1.0,'stone');
 switch(type){
 case'chair':chair();break;
 case'stool':legs(.46,.46,.55);b(0,.58,0,.65,.09,.65);break;
 case'rocking_chair':chair(.62,1.15);for(const x of[-.31,.31])b(x,.08,0,.08,.09,.98);b(0,.7,-.08,.74,.06,.65);break;
 case'bench':legs(1.6,.5,.45);b(0,.48,0,1.9,.1,.64);b(0,.83,.28,1.9,.6,.1);break;
 case'sofa':b(0,.38,0,2.05,.62,.82,'fabric');b(0,.85,.32,2.05,.55,.2,'fabric');for(const x of[-.96,.96])b(x,.68,0,.2,.45,.9,'fabric');for(const x of[-.48,.48])b(x,.71,-.05,.9,.14,.65,'cream');break;
 case'armchair':b(0,.4,0,.94,.6,.85,'fabric');b(0,.88,.3,.94,.55,.2,'fabric');for(const x of[-.42,.42])b(x,.67,0,.17,.4,.85,'fabric');break;
 case'bed':legs(1.2,1.7,.3);b(0,.4,0,1.45,.25,2.0);b(0,.57,0,1.38,.2,1.94,'fabric');b(0,.75,.9,1.5,.8,.12);b(0,.7,.62,.9,.12,.4,'cream');break;
 case'mattress':b(0,.18,0,1.25,.36,1.9,'fabric');for(let i=0;i<5;i++)b(0,.368,-.7+i*.35,1.1,.012,.018,'cream');break;
 case'wardrobe':cabinet(1.15,2.05,.65,1,'wood');b(0,1.05,-.35,.025,1.9,.03,'metal');break;
 case'dresser':cabinet(1.3,.95,.58,4,'wood');break;
 case'fridge':cabinet(.8,1.9,.72,2,'plastic');b(-.26,1.34,-.42,.045,.4,.04,'metal');break;
 case'washing_machine':b(0,.47,0,.75,.94,.7,'cream');ring(0,.48,-.36,.23,.045,'metal');cy(0,.48,-.38,.18,.06,'screen',Math.PI/2);b(0,.87,-.36,.63,.07,.03,'plastic');break;
 case'oven':b(0,.46,0,.75,.92,.7,'metal');b(0,.4,-.36,.6,.48,.03,'screen');for(const x of[-.19,.19])for(const z of[-.19,.19])ring(x,.93,z,.11,.025,'black',Math.PI/2);break;
 case'microwave':table(.85,.65,.7);b(0,.93,0,.7,.38,.43,'cream');b(-.07,.93,-.23,.48,.25,.02,'screen');break;
 case'floor_lamp':cy(0,.04,0,.28,.08);cy(0,.85,0,.025,1.65);cy(0,1.65,0,.35,.35,'cream');break;
 case'side_table':table(.65,.65,.62);b(0,.32,0,.55,.04,.55);break;
 case'dining_table':table(1.65,1.0);b(0,.82,0,.55,.02,.35,'cream');break;
 case'bookcase':shelf(1.25,1.9,.5,5);for(let i=0;i<12;i++)b(-.48+i*.085,.48+(i%3)*.41,-.02,.065,.27,.3,i%2?'fabric':'cream');break;
 case'coat_stand':cy(0,.9,0,.035,1.8);for(let i=0;i<4;i++){const a=i*Math.PI/2;b(Math.cos(a)*.18,.08,Math.sin(a)*.18,.42,.08,.1);b(Math.cos(a)*.18,1.6,Math.sin(a)*.18,.36,.05,.06);}break;
 case'fan':cy(0,.04,0,.25,.08);cy(0,.7,0,.025,1.3);ring(0,1.35,0,.36,.04,'metal');for(let i=0;i<3;i++)b(0,1.35,0,.07,.65,.04,'cream',i*Math.PI/3);break;
 case'desk':table();b(-.45,.37,0,.42,.66,.7,'cream');break;
 case'corner_desk':table(1.8,.7);b(.6,.76,.45,.55,.08,1.15);legs(1.4,1.0);break;
 case'office_chair':cy(0,.3,0,.045,.5);chair(.62,1.12,'fabric');for(let i=0;i<5;i++){const a=i*Math.PI*2/5;b(Math.cos(a)*.22,.12,Math.sin(a)*.22,.42,.04,.07,'metal',0);}break;
 case'filing_cabinet':cabinet(.65,1.45,.6,4);break;
 case'locker':cabinet(.54,1.95,.55,1);for(let i=0;i<4;i++)b(0,1.65-i*.09,-.29,.3,.018,.02,'black');break;
 case'printer':table(.9,.7,.68);b(0,.94,0,.65,.4,.5,'plastic');b(0,1.16,.05,.5,.06,.45,'cream');b(0,.94,-.27,.45,.06,.07,'black');break;
 case'copier':b(0,.61,0,.95,1.22,.75,'cream');b(0,1.27,.03,.92,.08,.7,'plastic');b(.34,1.32,-.2,.2,.12,.2,'screen');break;
 case'crt_computer':table(1.15,.8);monitor();b(.4,1.03,.1,.23,.5,.4,'cream');b(-.18,.83,-.26,.5,.035,.18,'plastic');break;
 case'flat_computer':table(1.25,.75);monitor(0,1.16,true);b(0,.83,-.2,.55,.035,.2,'plastic');break;
 case'whiteboard':legs(1.4,.55,1.55);b(0,1.4,0,1.7,1.05,.06,'cream');b(-.2,1.45,-.04,.75,.025,.02,'black');break;
 case'corkboard':legs(1.1,.5,1.4);b(0,1.25,0,1.35,.9,.09);for(let i=0;i<4;i++)b(-.4+i*.26,1.28,-.06,.18,.26,.01,'cream');break;
 case'conference_table':table(2.3,1.0);cy(-.85,.4,0,.1,.75);cy(.85,.4,0,.1,.75);break;
 case'vending':cabinet(1.0,2.05,.8,1);b(-.1,1.28,-.43,.6,1.15,.04,'screen');for(let i=0;i<4;i++)b(-.1,.95+i*.22,-.46,.52,.08,.025,'cream');break;
 case'water_cooler':b(0,.63,0,.5,1.26,.48,'cream');cy(0,1.49,0,.23,.46,'blue');b(0,.92,-.26,.3,.22,.04,'black');break;
 case'server_rack':cabinet(.8,2.15,.75,8);for(let i=0;i<8;i++)b(-.22,.15+i*.25,-.41,.04,.04,.03,'screen');break;
 case'mail_sorter':shelf(1.4,1.65,.45,5);for(const x of[-.45,0,.45])b(x,.82,0,.025,1.6,.45);break;
 case'archive_cart':shelf(.8,1.25,.55,3);wheels(.72,.46);b(.48,.9,0,.06,.5,.6,'metal');break;
 case'stacked_trays':table(.9,.65,.72);for(let i=0;i<4;i++){b(0,.83+i*.12,0,.65,.035,.4,'plastic');b(.3,.87+i*.12,0,.04,.1,.4,'plastic');}break;
 case'projector_stand':table(.7,.6,1.1);b(0,1.26,0,.42,.25,.35,'plastic');cy(0,1.27,-.2,.09,.06,'screen',Math.PI/2);break;
 case'folding_screen':for(let i=0;i<3;i++)b(-.6+i*.6,1.0,i%2*.15,.58,2,.08,'fabric');break;
 case'generator':b(0,.38,0,1.5,.76,.8,'metal');cy(-.3,.65,0,.24,.55,'black',Math.PI/2);b(.45,.95,.16,.13,1.15,.15,'metal');wheels(1.2,.66);break;
 case'electrical_cabinet':cabinet(.9,1.95,.6,2);b(0,1.4,-.33,.45,.25,.02,'black');break;
 case'maintenance_cart':shelf(1.1,1.1,.65,3);wheels(.95,.55);b(.62,.95,0,.08,.55,.65,'metal');break;
 case'tool_chest':cabinet(1.1,.95,.58,5);wheels(.95,.45);break;
 case'workbench':table(1.8,.8,.9);b(0,1.35,.35,1.8,.85,.06,'metal');for(let i=0;i<5;i++)b(-.65+i*.3,1.35,.3,.055,.4,.05,'black');break;
 case'steel_shelf':shelf(1.5,2.2,.65,5);for(let i=0;i<3;i++)b(-.45+i*.45,.42,0,.35,.4,.45,'cream');break;
 case'ladder':for(const x of[-.34,.34])b(x,1.22,0,.07,2.45,.08,'metal');for(let i=0;i<8;i++)b(0,.15+i*.29,0,.65,.05,.07,'metal');break;
 case'scaffold':for(const x of[-.65,.65])for(const z of[-.4,.4])b(x,1.3,z,.055,2.6,.055,'metal');b(0,1.4,0,1.4,.08,.9);b(0,2.6,0,1.4,.06,.9,'metal');break;
 case'duct_elbow':b(0,1.2,0,.7,2.4,.7,'metal');b(.5,2.18,0,1.65,.65,.65,'metal');for(let i=0;i<4;i++)b(0,.3+i*.5,-.36,.73,.04,.03,'black');break;
 case'pipe_manifold':for(const x of[-.45,0,.45])cy(x,1.2,0,.1,2.4,'metal');b(0,.6,0,1.35,.18,.18,'metal');for(const x of[-.45,.45])ring(x,1.3,-.2,.2,.035,'rust');break;
 case'pressure_tank':cy(0,1.05,0,.48,1.9,'metal');sphere(0,1.95,0,.48,'metal');legs(.6,.6,.25);break;
 case'pump':cy(0,.42,0,.32,.65,'metal',Math.PI/2);b(.43,.35,0,.55,.65,.45,'rust');b(0,.1,0,1.35,.15,.7,'metal');break;
 case'valve_stand':cy(0,.8,0,.1,1.6,'metal');ring(0,1.5,0,.36,.045,'rust',Math.PI/2);cy(0,.07,0,.4,.14);break;
 case'cable_reel':cy(0,.55,0,.42,.75,'black',Math.PI/2);for(const x of[-.4,.4])cy(x,.55,0,.58,.08,'wood',Math.PI/2);break;
 case'vent_fan':b(0,1.1,0,1.35,1.35,.5,'metal');ring(0,1.1,-.27,.52,.045,'black');for(let i=0;i<4;i++)b(0,1.1,-.3,.13,.95,.06,'cream',i*Math.PI/4);legs(1.0,.4,.5);break;
 case'control_console':b(0,.65,0,1.55,1.3,.75,'metal');for(const x of[-.45,0,.45])b(x,1.03,-.4,.32,.25,.05,'screen');for(let i=0;i<7;i++)cy(-.6+i*.2,.75,-.4,.035,.03,'rust',Math.PI/2);break;
 case'pallet_stack':for(let i=0;i<4;i++)for(let j=0;j<4;j++)b(-.45+j*.3,.08+i*.16,0,.22,.08,1.0);break;
 case'barrier':for(const x of[-.65,.65])b(x,.6,0,.1,1.2,.1,'metal');b(0,.95,0,1.7,.25,.12,'rust');b(0,.4,0,1.6,.15,.1,'cream');break;
 case'gas_cylinder':cy(0,.75,0,.21,1.4,'blue');sphere(0,1.4,0,.21,'blue');b(0,1.62,0,.08,.15,.08,'metal');break;
 case'work_light':legs(.65,.55,.9);cy(0,1.1,0,.025,2.1);b(0,1.95,0,.65,.4,.12,'metal');b(0,1.95,-.08,.55,.3,.02,'cream');break;
 case'statue_geometric':plinth();b(0,1.45,0,.6,1.0,.4,'stone');sphere(0,2.2,0,.32);for(const x of[-.5,.5])b(x,1.55,0,.25,.95,.25,'stone',x*.7);break;
 case'stacked_rings':plinth(.25);for(let i=0;i<4;i++)ring(0,.65+i*.6,0,.58,.12,'stone',i%2?Math.PI/2:0);break;
 case'tilted_cube':plinth();b(0,1.35,0,.95,.95,.95,'stone',Math.PI/4);break;
 case'door_frame':for(const x of[-.65,.65])b(x,1.4,0,.25,2.8,.35,'stone');b(0,2.7,0,1.55,.3,.35,'stone');break;
 case'nested_frames':for(let i=0;i<3;i++){const w=1.5-i*.3,h=2.7-i*.35;for(const x of[-w/2,w/2])b(x,h/2,i*.22,.12,h,.13,'stone');b(0,h,i*.22,w,.12,.13,'stone');}break;
 case'stair_pedestal':for(let i=0;i<6;i++)b(0,.14*(i+1),-.7+i*.28,1.1,.28*(i+1),.28,'stone');break;
 case'forked_column':b(0,.8,0,.45,1.6,.5,'stone');for(const x of[-.35,.35])b(x,2.05,0,.38,1.5,.5,'stone',x*.45);break;
 case'orb_plinth':plinth(1.0);sphere(0,1.65,0,.5,'ceramic');break;
 case'levitating_blocks':plinth(.25);for(let i=0;i<3;i++)b((i%2-.5)*.35,.8+i*.85,0,.62,.5,.62,'stone',i*.22);break;
 case'mirror_portal':b(0,1.35,0,.9,2.7,.2,'metal');b(0,1.35,-.12,.75,2.5,.025,'screen');legs(.8,.55,.3);break;
 case'obelisk':plinth(.25);b(0,1.65,0,.55,2.9,.55,'stone');b(0,3.2,0,.25,.35,.25,'stone',.3);break;
 case'twin_monolith':for(const x of[-.4,.4])b(x,1.5,0,.45,3,.65,'stone');b(0,2.7,0,1.2,.25,.55,'stone');break;
 case'empty_pedestal':plinth(1.3);b(0,1.32,0,1.2,.08,1.2,'cream');break;
 case'chair_tower':for(let i=0;i<3;i++){b(0,.4+i*.85,0,.65,.12,.65);b(-.28,.72+i*.85,0,.08,.75,.65);b(.28,.72+i*.85,0,.08,.75,.65);}break;
 case'oversized_phone':plinth(.5);b(0,.95,0,1.3,.7,.9,'plastic');b(0,1.5,0,1.65,.25,.32,'black');for(let i=0;i<3;i++)for(let j=0;j<3;j++)b(-.3+j*.3,1.32,-.2+i*.2,.15,.03,.12,'cream');break;
 case'upturned_table':b(0,.12,0,1.5,.1,.85);for(const x of[-.6,.6])for(const z of[-.3,.3])b(x,.6,z,.08,.9,.08);break;
 case'spiral_steps':for(let i=0;i<10;i++){const a=i*.65;b(Math.cos(a)*.42,.12+i*.23,Math.sin(a)*.42,.7,.15,.5,'stone');}cy(0,1.2,0,.07,2.4,'metal');break;
 case'cube_lattice':for(const x of[-.4,.4])for(const y of[.45,1.25,2.05])for(const z of[-.4,.4])b(x,y,z,.15,.75,.15,'metal');for(const y of[.1,.9,1.7,2.5])b(0,y,0,1.0,.08,1.0,'stone');break;
 case'suspended_frame':for(const x of[-.6,.6])b(x,1.8,0,.1,2.8,.12,'metal');b(0,2.3,0,1.3,.12,.12,'metal');b(0,1.1,0,1.3,.12,.12,'metal');break;
 case'folded_plane':b(-.25,1.25,0,.08,2.5,1,'stone',-.3);b(.4,1.25,0,.08,2.5,1,'cream',.3);break;
 case'lifering_stand':legs(.55,.5,1.0);ring(0,1.3,0,.42,.1,'rust');break;
 case'pool_ladder':for(const x of[-.35,.35])cy(x,.9,0,.04,1.8);for(let i=0;i<5;i++)b(0,.2+i*.3,0,.7,.04,.18,'metal');break;
 case'diving_block':legs(.62,.65,.62);b(0,.7,0,.85,.2,.8,'blue');b(0,.83,0,.75,.04,.7,'cream');break;
 case'deck_chair':chair(.7,1.15,'blue');for(const x of[-.4,.4])b(x,.65,0,.08,.08,.75,'cream');break;
 case'lounger':legs(.65,1.5,.3);b(0,.38,-.2,.8,.12,1.5,'cream');b(0,.65,.65,.8,.8,.12,'fabric');break;
 case'shower':cy(0,1.2,0,.035,2.4);b(0,2.4,-.25,.1,.08,.55,'metal');cy(0,2.35,-.5,.2,.06);cy(0,.04,0,.42,.08,'ceramic');break;
 case'towel_rack':for(const x of[-.5,.5])b(x,.9,0,.05,1.8,.05,'metal');for(const y of[.7,1.2,1.7])b(0,y,0,1.05,.04,.04,'metal');b(-.12,1.4,-.04,.55,.6,.04,'fabric');break;
 case'rescue_pole':cy(0,1.45,0,.035,2.9,'rust');ring(0,2.65,0,.23,.04,'cream');cy(0,.04,0,.25,.08);break;
 case'kickboard_rack':shelf(1.1,1.5,.45,3);for(let i=0;i<5;i++)b(-.4+i*.2,.8,0,.12,.65,.33,'blue');break;
 case'ball_cart':shelf(.9,.9,.7,2);wheels(.8,.6);for(const x of[-.25,.25])for(const z of[-.2,.2])sphere(x,.65,z,.2,'rust');break;
 case'lifeguard_chair':legs(.9,.85,1.4);b(0,1.5,0,1.0,.12,.9,'cream');b(0,1.9,.4,1,.8,.1,'cream');for(let i=0;i<5;i++)b(0,.2+i*.25,-.55,.7,.06,.2,'metal');break;
 case'umbrella':cy(0,1.2,0,.025,2.4);cy(0,2.3,0,.95,.12,'fabric');cy(0,.05,0,.4,.1,'stone');break;
 case'flamingo_float':ring(0,.3,0,.48,.13,'rust',Math.PI/2);cy(.36,.7,0,.1,.85,'rust');sphere(.36,1.1,-.05,.19,'rust');b(.36,1.1,-.25,.15,.1,.23,'black');break;
 case'duck_float':sphere(0,.3,0,.43,'cream');sphere(0,.7,-.28,.24,'cream');b(0,.66,-.55,.3,.12,.2,'rust');break;
 case'pool_sign':legs(.5,.4,1.4);b(0,1.3,0,.8,.75,.08,'blue');ring(0,1.35,-.05,.22,.03,'cream');break;
 case'pool_bench':legs(1.4,.45,.43);for(let i=0;i<4;i++)b(0,.48,-.22+i*.15,1.75,.06,.1,'cream');break;
 case'swim_locker':cabinet(.72,1.85,.52,2,'plastic');b(0,.95,-.29,.03,1.7,.02,'blue');break;
 case'chemical_drum':cy(0,.5,0,.35,1,'blue');for(const y of[.15,.85])ring(0,y,0,.36,.025,'metal',Math.PI/2);break;
 case'filtration_pump':cy(-.3,.7,0,.32,1.3,'cream');b(.35,.35,0,.55,.65,.6,'blue');b(0,.95,0,1.15,.12,.12,'metal');break;
 case'ring_stack':for(let i=0;i<4;i++)ring(0,.15+i*.2,0,.48,.09,i%2?'blue':'cream',Math.PI/2);break;
 case'bridge_arch':case'wide_nested_portal':case'column_arcade':{
   const n=type==='column_arcade'?3:type==='wide_nested_portal'?2:1;for(let i=0;i<n;i++){for(const x of[-3.8,3.8])b(x,1.7,-i*3.8,.75,3.4,.75,'stone');b(0,3.4,-i*3.8,8.35,.5,.8,'stone');}break;}
 case'stilt_platform':for(const x of[-3.8,3.8])for(const z of[-1.9,1.9])b(x,1.35,z,.5,2.7,.5,'metal');b(0,2.9,0,8.1,.4,4.3,'stone');break;
 case'ventilation_gate':for(const x of[-3.8,3.8])b(x,1.65,0,.6,3.3,.6,'metal');for(let i=0;i<8;i++)b(-3.3+i*.94,3.1,0,.55,.65,1.2,'metal');break;
 case'ceiling_grid':for(const x of[-3.8,3.8])for(const z of[-3.8,3.8])b(x,1.6,z,.45,3.2,.45,'metal');for(let i=0;i<5;i++){b(0,3.35,-3.8+i*1.9,8.1,.2,.15,'metal');b(-3.8+i*1.9,3.35,0,.15,.2,8.1,'metal');}break;
 case'gantry_crane':for(const x of[-3.8,3.8]){b(x,1.6,0,.5,3.2,.8,'rust');b(x,.25,0,1.1,.5,1.5,'metal');}b(0,3.35,0,8.1,.45,.75,'rust');b(0,2.7,0,.05,1.1,.05,'metal');ring(0,2.2,0,.18,.04,'metal');break;
 case'pipe_cathedral':for(const x of[-3.8,3.8])for(let i=0;i<3;i++)cy(x,1.6,-.4+i*.4,.14,3.2,'metal');for(let i=0;i<3;i++)b(0,3.2,-.4+i*.4,7.6,.25,.25,'metal');break;
 default:throw Error('Unknown environmental archetype: '+type);
 }
 const bounds={x0:Infinity,x1:-Infinity,y0:Infinity,y1:-Infinity,z0:Infinity,z1:-Infinity};for(const p of parts){const cz=Math.abs(Math.cos(p.rz||0)),sz=Math.abs(Math.sin(p.rz||0)),cx=Math.abs(Math.cos(p.rx||0)),sx=Math.abs(Math.sin(p.rx||0)),w=p.w*cz+p.h*sz,zh=p.h*cz+p.w*sz,h=zh*cx+p.d*sx,d=p.d*cx+zh*sx;bounds.x0=Math.min(bounds.x0,p.x-w/2);bounds.x1=Math.max(bounds.x1,p.x+w/2);bounds.y0=Math.min(bounds.y0,p.y-h/2);bounds.y1=Math.max(bounds.y1,p.y+h/2);bounds.z0=Math.min(bounds.z0,p.z-d/2);bounds.z1=Math.max(bounds.z1,p.z+d/2);}
 return {type,parts,bounds,landmark:ENV_FAMILIES.landmark.includes(type),passThrough:ENV_FAMILIES.landmark.includes(type)||['door_frame','nested_frames','forked_column','cube_lattice','suspended_frame','folded_plane'].includes(type)};
}
export const ENV_LIBRARY=Object.freeze(Object.fromEntries(Object.values(ENV_FAMILIES).flat().map(type=>[type,environmentRecipe(type)])));
