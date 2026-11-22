/*! Copyright (c) 2026 Vendreith. Licensing: see LICENSE.md and THIRD_PARTY_NOTICES.md. */
// Authored destinations and sightlines. Seed changes surface detail, never the composition.
const smoothRoad = (points, width, kind='path') => {
  const pts=[];
  for(let i=0;i<points.length-1;i++){
    const a=points[Math.max(0,i-1)],b=points[i],c=points[i+1],d=points[Math.min(points.length-1,i+2)];
    const steps=Math.max(4,Math.ceil(Math.hypot(c[0]-b[0],c[1]-b[1])/2));
    for(let j=0;j<steps;j++){const t=j/steps,t2=t*t,t3=t2*t;pts.push([0,1].map(k=>.5*((2*b[k])+(-a[k]+c[k])*t+(2*a[k]-5*b[k]+4*c[k]-d[k])*t2+(-a[k]+3*b[k]-3*c[k]+d[k])*t3)));}
  }
  pts.push(points.at(-1));return{pts,w:width,kind};
};
export const HILLS_PATHS=[
 smoothRoad([[264,438],[268,420],[286,390],[298,362],[301,333],[283,307],[260,292],[234,280],[218,260],[214,224],[214,176],[214,112]],4.8,'road'),
 smoothRoad([[260,292],[239,305],[217,322],[194,331],[170,326],[150,312],[151,288],[164,269],[190,258],[218,260]],4.5,'road'),
 smoothRoad([[298,362],[316,369],[338,367],[348,351],[345,330],[340,310],[356,285],[368,258],[373,221],[378,183],[383,147]],2.6),
 smoothRoad([[190,258],[165,251],[140,242],[120,235],[108,238]],2.4),
 smoothRoad([[150,312],[132,319],[112,326],[94,333]],2.4),
 smoothRoad([[368,258],[396,271],[415,293],[428,324]],2.5),
 smoothRoad([[164,269],[147,238],[135,208],[146,182],[159,170]],2.2)
];
const site=(id,x,z,variantId,rotation=0,region='crescent',extra={})=>({id,x,z,variantId,rotation,region,...extra});
export const HILLS_HOUSE_SITES=[
 site('welcome',303,406,'twin_window',-Math.PI/2,'welcome',{palette:{wall:0xefe0a6,roof:0x758486,trim:0xfff9e9}}),
 site('overlook',330,350,'hilltop_solitary',0,'overlook',{padR:23,palette:{wall:0xf7e9b9,roof:0x8c5f4d,trim:0xfffbec}}),
 site('crescent_blue',240,329,'pastel_blue_cottage',Math.PI,'crescent'),
 site('crescent_corner',207,349,'quiet_corner',Math.PI,'crescent'),
 site('crescent_porch',169,347,'white_porch',Math.PI,'crescent'),
 site('crescent_tall',130,300,'two_story_dream',Math.PI/2,'crescent'),
 site('valley',178,229,'long_narrow',0,'valley'),
 site('tower_home',316,250,'two_story_dream',0,'tower'),
 site('tall_roof',367,202,'tall_roof_landmark',0,'tower'),
 site('red_roof',277,181,'isolated_red_roof',0,'north'),
 site('threshold_home',132,263,'threshold_house',Math.PI/2,'threshold'),
 site('strange_familiar',159,156,'strange_familiar',0,'isolated')
];
// Distant houses follow miniature streets on separate hill chains, with large gaps between groups.
const distantGroups=[
 {name:'west',points:[[44,178],[54,160],[64,142],[78,126],[95,116],[114,110],[133,108]]},
 {name:'northwest',points:[[152,52],[169,44],[188,40],[207,42],[224,49],[241,59],[254,72]]},
 {name:'northeast',points:[[332,52],[352,60],[372,70],[391,84],[408,103],[422,123],[432,145]]},
 {name:'east',points:[[474,231],[483,252],[486,274],[482,295],[474,317],[460,335],[444,350]]},
 {name:'southwest',points:[[28,324],[35,346],[47,365],[63,381],[81,392],[101,402],[124,409]]}
];
const variants=['classic_small','tall_roof','two_story_dream','cream_gabled','quiet_corner','long_narrow','isolated_red_roof'];
export const HILLS_SCENIC_SITES=distantGroups.flatMap((g,gi)=>g.points.map(([x,z],i)=>site(`scenic_${g.name}_${i}`,x,z,variants[(i+gi)%variants.length],gi%2?Math.PI/2:0,g.name,{scenic:true}))).concat([
 site('scenic_lone_north',286,4,'single_room',0,'solitary',{scenic:true}),site('scenic_lone_east',535,160,'tall_roof',0,'solitary',{scenic:true}),site('scenic_lone_west',-25,232,'strange_familiar',0,'solitary',{scenic:true})
]);
for(const s of HILLS_SCENIC_SITES){const r=Math.hypot(s.x-256,s.z-256);if(r<208){s.x=256+(s.x-256)*208/r;s.z=256+(s.z-256)*208/r;}}
export const WATER_TOWER={x:354,z:215,height:18,tankRadius:3.5};
export const HILLS_REGIONS=[
 {id:'welcome',name:'Welcome fold',focus:'A nearby yellow house, framed by white fences; the landmark porch is visible across the valley.'},
 {id:'crescent',name:'Crescent Lane',focus:'Four homes follow a looping miniature road, with unequal setbacks and roof silhouettes.'},
 {id:'overlook',name:'The long porch',focus:'One substantial house on a broad smooth hill; clear lawn and a small approach path.'},
 {id:'tower',name:'Water-tower hill',focus:'A pale water tank on slender braced legs, visible above two smaller homes.'},
 {id:'valley',name:'Quiet valley',focus:'Open grass and a lone narrow home; a low sightline through overlapping hills.'}
];
export const HILLS_VIEWS=[
 {id:'spawn',x:264,z:438,target:[315,350],targetHeight:6},
 {id:'nearby-house',x:280,z:410,target:[303,406],targetHeight:2.2},
 {id:'hilltop',x:318,z:350,target:[210,287],targetHeight:2},
 {id:'road-cluster',x:224,z:318,target:[184,342],targetHeight:3},
 {id:'water-tower',x:322,z:273,target:[354,215],targetHeight:13},
 {id:'cloud-horizon',x:281,z:316,target:[265,40],targetHeight:15},
 {id:'valley',x:243,z:278,target:[178,229],targetHeight:2},
 {id:'exit',x:121,z:249,target:[108,238],targetHeight:1.6}
];
