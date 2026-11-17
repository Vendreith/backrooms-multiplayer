/* Copyright (c) 2026 Vendreith. Thirty original structural compositions, not palette variants. */
export const CLASSIC_TEMPLATES=[
 'deep_offset','double_bend','s_corridor','heavy_junction','four_columns','hollow_square',
 'layered_walls','staggered_portals','fluorescent_sequence','broken_symmetry','deep_recess',
 'multi_alcove','misaligned_door','wide_to_narrow','low_ceiling','double_colonnade',
 'suspended_partition','nested_rectangle','hollow_block','offset_t','split_level','shallow_stairs',
 'shadow_channel','office_cells','diagonal_sightline','cross_connected','waiting_hall',
 'false_continuation','domestic_niche','exit_threshold'];
export function composeClassicTemplate(type,room,wall,c){
 const x=room.x,z=room.z,H=c.ceiling;
 const b=(ox,oz,w,d,h=H,y=0)=>{if(y===0&&h>=H-.01){if(w<=1.2&&d<=1.2){w=Math.max(.9,w*1.15);d=Math.max(.9,d*1.15);}else if(w<d&&w<=.7)w=w<=.45?.6:.85;else if(d<=.7)d=d<=.45?.6:.85;}return wall(x+ox,z+oz,w,d,h,y,'composition');};
 const col=(ox,oz,w=.85)=>b(ox,oz,w,w);
 const portal=(oz,width=2.35,offset=0,th=.55)=>{b(offset-width/2-.3,oz,.6,th);b(offset+width/2+.3,oz,.6,th);b(offset,oz,width,.55,.4,H-.4);};
 // Features live in a 12.5m composition; its four quadrants usually retain their small-room divisions.
 switch(type){
  case'deep_offset':b(-1.7,-1.7,.6,3);b(1.7,1.8,.6,3.2);break;
  case'double_bend':b(-1.7,-2.5,3,.45);b(1.7,0,3,.45);b(-1.7,2.5,3,.45);break;
  case's_corridor':b(-1.8,-1.2,3.2,.4);b(1.8,1.2,3.2,.4);b(-3.3,2,.5,2);break;
  case'heavy_junction':for(const a of[-2.8,2.8])for(const d of[-2.8,2.8])b(a,d,1.15,1.15);break;
  case'four_columns':for(const a of[-2.2,2.2])for(const d of[-2.2,2.2])col(a,d,.9);break;
  case'hollow_square':for(const [a,d,w,l]of[[-1.4,0,.55,3.35],[1.4,0,.55,3.35],[0,-1.4,2.3,.55]])b(a,d,w,l);break;
  case'layered_walls':b(-2.8,0,.36,4.5);b(-1.2,-2.1,.45,3.4);b(2,1.8,.55,3.8);break;
  case'staggered_portals':for(let i=0;i<3;i++)portal(-2.4+i*2.4,2.25,[-.6,.55,0][i],.48);break;
  case'fluorescent_sequence':for(let i=0;i<5;i++)b(0,-3.6+i*1.8,7,.32,.24,H-.24);break;
  case'broken_symmetry':b(-2,-2,3,.5);b(-3.25,-.5,.5,2.5);col(2.2,2.2,1.15);b(1.2,-2.2,2,.36,1.95);break;
  case'deep_recess':b(-2.7,-2.5,.65,3.4);b(.1,-2.5,.65,3.4);b(-1.3,-4.1,2.8,.65);break;
  case'multi_alcove':for(let i=0;i<3;i++){b(-3+i*2.4,-3.3,.45,2.4);b(-2+i*2.4,-4.4,2,.45);}break;
  case'misaligned_door':portal(-1.6,1.95,-.9,.6);portal(1.6,2.3,.8,.6);break;
  case'wide_to_narrow':portal(-3,3.1,0,.65);portal(0,2.6,0,.6);portal(3,1.9,0,.5);break;
  case'low_ceiling':b(0,0,5,4,.38,2.14);b(-2.65,0,.45,4);b(2.65,0,.45,4);break;
  case'double_colonnade':for(const a of[-1.8,1.8])for(const d of[-3,0,3])col(a,d,.65);break;
  case'suspended_partition':b(0,0,5.2,.65,.8,2.1);col(-3.2,0,1.05);col(3.2,0,1.05);break;
  case'nested_rectangle':b(-2.4,0,.4,5.2);b(2.4,0,.4,5.2);b(0,-2.4,4.4,.4);b(-.9,.7,.45,2.2);break;
  case'hollow_block':b(-.95,0,.75,3);b(.95,0,.75,3);b(0,-1.15,1.2,.7);b(0,1.2,1.2,.7,1.15);break;
  case'offset_t':b(-1.3,0,.6,5);b(1.1,-1,4.2,.6);break;
  case'split_level':c.decks.push({x0:x-2.5,x1:x+2.5,z0:z-3.8,z1:z-1,y:.28});c.stairs.push({x:x-2.5,z:z-.5,width:2,steps:3,rise:.093,run:.4,rot:0});break;
  case'shallow_stairs':c.stairs.push({x:x-2,z:z,width:2.2,steps:4,rise:.085,run:.42,rot:0});b(1.5,1.8,3,.65,1.1);break;
  case'shadow_channel':for(const a of[-1.2,1.2])b(a,0,.55,6.8);portal(3.2,1.85,0,.55);break;
  case'office_cells':for(const a of[-2.6,2.6]){b(a,0,.36,5.2);b(a-Math.sign(a)*1.1,0,2.2,.36);}break;
  case'diagonal_sightline':for(let i=0;i<4;i++)b(-2.8+i*1.5,-2.8+i*1.5,1.1,1.1);break;
  case'cross_connected':for(const [a,d,w,l]of[[-2.3,-2,3,.45],[2.3,2,3,.45],[-2,2.3,.45,3],[2,-2.3,.45,3]])b(a,d,w,l);break;
  case'waiting_hall':b(-3.5,0,.65,6);b(3.5,0,.65,6);b(0,-3.5,5.8,.55,1.2);c.setPieces.push({type:'waiting',x,z});break;
  case'false_continuation':b(0,-1.7,3.2,.65);b(2.3,1.8,.5,3);b(-2.6,2.3,2,.45);break;
  case'domestic_niche':b(-3.1,-2.6,.55,3.4);b(-1.5,-4.1,3.6,.55);c.setPieces.push({type:'domestic',x:x-1.6,z:z-2.8});break;
  case'exit_threshold':portal(-2.4,3.4,0,.65);portal(2.4,3.05,0,.65);b(-3.2,0,1.1,7);b(3.2,0,1.1,7);break;
 }
}
