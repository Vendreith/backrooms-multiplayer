/* Copyright (c) 2026 Vendreith. MERIDIAN-6: original frontier surveyor's sidearm.
 * No imported models, skin patterns, marks, animation data or sound recordings. */
export function buildMeridian({ THREE, mesh, box, cyl, profile, sideProfile, bake, bolt, mats, keep }) {
  const root = new THREE.Group(), body = new THREE.Group(), crane = new THREE.Group(), cylinder = new THREE.Group(), hammer = new THREE.Group();
  root.name = 'Meridian6_Original'; body.name = 'RelicFrame'; crane.name = 'CylinderCrane'; cylinder.name = 'SixChamberCylinder'; hammer.name = 'HammerPivot';
  root.add(body, crane, hammer); crane.position.set(-.023, -.008, .004); cylinder.position.set(.023, .034, -.042); crane.add(cylinder);
  // Long stepped bridge, underslung counterweight, open frame and shallow ceramic grip form a new silhouette.
  const frame = [[-.107,.062],[-.093,.071],[.057,.071],[.078,.050],[.079,.021],[.057,-.021],[.080,-.113],[.066,-.128],[.021,-.122],[-.009,-.064],[-.044,-.052],[-.099,-.022]];
  const window = [[-.079,-.007],[.022,-.007],[.025,.058],[-.079,.058]];
  mesh(body, sideProfile(frame, .034, [window]), mats.dark);
  mesh(body, sideProfile([[-.272,.031],[-.266,.056],[-.241,.064],[-.106,.064],[-.088,.047],[-.095,.020],[-.250,.019]], .033), mats.machined);
  mesh(body, sideProfile([[-.251,.017],[-.249,.006],[-.174,-.004],[-.105,.007],[-.104,.018]], .027), mats.dark);
  for (const side of [-1,1]) {
    mesh(body, box(.0025,.005,.119,.001), mats.brass, [side*.0174,.044,-.179]);
    for(let j=0;j<4;j++) mesh(body, box(.003,.007,.013,.001), mats.black, [side*.016,.019,-.132-j*.027], [.23,0,0]);
    mesh(body, sideProfile([[.032,-.024],[.055,-.028],[.073,-.105],[.060,-.116],[.032,-.109],[.005,-.054]], .004), mats.ceramic, [side*.019,0,0]);
    mesh(body, sideProfile([[.047,-.033],[.056,-.039],[.069,-.098],[.062,-.105],[.053,-.097],[.029,-.051]], .0018), mats.wood, [side*.0222,0,0]);
    bolt(body,side*.023,-.042,.045,side,.0031);bolt(body,side*.023,-.102,.057,side,.0031);
    // Original contour engravings: continuous surveyed isobars, deliberately unrelated to any game skin.
    for(let j=0;j<5;j++) {
      const pts=[];for(let i=0;i<=24;i++){const t=i/24;pts.push(new THREE.Vector3(side*.0182,.064-j*.00125+.0012*Math.sin(t*6.8+j*.7),-.090+t*.117));}
      mesh(body,keep(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts),24,.00028,4,false)),mats.brass);
    }
    for(let j=0;j<4;j++) {
      const pts=[];for(let i=0;i<=12;i++){const t=i/12;pts.push(new THREE.Vector3(side*.0215,-.053-t*.040,.024+t*.014+j*.004+.0016*Math.sin(t*8+j)));}
      mesh(body,keep(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts),12,.00030,4,false)),mats.brass);
    }
    mesh(body,box(.002,.010,.020,.001),mats.steel,[side*.019,.019,.045]);
    mesh(body,box(.0022,.002,.009,.0005),mats.energy,[side*.0204,.021,.045]);
  }
  // Actual open muzzle and a small recessed annulus, not a painted circle.
  mesh(body,cyl(.010,.014,24),mats.dark,[0,.040,-.271],[Math.PI/2,0,0]);
  mesh(body,keep(new THREE.TorusGeometry(.0083,.0015,6,24)),mats.edge,[0,.040,-.279]);
  mesh(body,cyl(.0066,.003,24),mats.black,[0,.040,-.281],[Math.PI/2,0,0]);
  mesh(body,box(.032,.009,.016),mats.dark,[0,.065,.054]);
  mesh(body,box(.027,.029,.003,.002),mats.machined,[0,.036,.078]);
  for(const x of[-.010,.010])mesh(body,cyl(.0018,.001,10),mats.brass,[x,.027,.080],[Math.PI/2,0,0]);
  for(const side of [-1,1]) {
    mesh(body,box(.008,.013,.010),mats.dark,[side*.010,.075,.054]);
    mesh(body,box(.0018,.0016,.001),mats.dot,[side*.010,.079,.060]);
  }
  mesh(body,box(.011,.009,.013),mats.dark,[0,.064,-.240]);
  mesh(body,box(.0035,.012,.010),mats.dark,[0,.075,-.240]);
  mesh(body,box(.0012,.0015,.001),mats.dot,[0,.079,-.234]);
  // Sculpted open trigger guard and trigger; the guard is the physical finger-twirl pivot.
  const guard=[[-.079,-.025],[-.088,-.048],[-.072,-.063],[-.025,-.062],[-.010,-.045]];
  for(let i=1;i<guard.length;i++) {
    const[z0,y0]=guard[i-1],[z1,y1]=guard[i],part=mesh(body,box(.012,.005,Math.hypot(z1-z0,y1-y0)),mats.brass,[0,(y0+y1)/2,(z0+z1)/2]);part.rotation.x=-Math.atan2(y1-y0,z1-z0);
  }
  mesh(body,sideProfile([[-.052,-.019],[-.057,-.039],[-.052,-.049],[-.047,-.046],[-.047,-.022]],.005),mats.steel);
  hammer.position.set(0,.053,.066);mesh(hammer,box(.012,.020,.008),mats.dark,[0,.008,.003],[.25,0,0]);mesh(hammer,box(.020,.005,.017),mats.steel,[0,.020,.011],[.24,0,0]);
  // Six through-bores in a fluted cylinder. Face holes, cartridges and extractor are all geometry.
  const outline=[],holes=[];
  for(let i=0;i<96;i++){const angle=i/96*Math.PI*2,r=.031-.0017*(.5+.5*Math.cos(angle*6));outline.push([Math.cos(angle)*r,Math.sin(angle)*r]);}
  for(let i=0;i<6;i++){const angle=i/6*Math.PI*2,points=[];for(let j=0;j<20;j++){const a=-j/20*Math.PI*2;points.push([Math.cos(angle)*.0185+Math.cos(a)*.0062,Math.sin(angle)*.0185+Math.sin(a)*.0062]);}holes.push(points);}
  mesh(cylinder,profile(outline,.061,holes),mats.machined);
  for(const z of [-.0315,.0315]) {
    mesh(cylinder,keep(new THREE.TorusGeometry(.0295,.0011,5,48)),mats.brass,[0,0,z]);
    mesh(cylinder,cyl(.003,.005,12),mats.dark,[0,0,z],[Math.PI/2,0,0]);
  }
  const rounds=[];
  for(let i=0;i<6;i++) {
    const angle=i/6*Math.PI*2,round=new THREE.Group();round.name='RelicCartridge'+i;round.position.set(Math.cos(angle)*.0185,Math.sin(angle)*.0185,0);cylinder.add(round);
    mesh(round,cyl(.0054,.041,12),mats.brass,[0,0,.008],[Math.PI/2,0,0]);
    mesh(round,cyl(.006,.002,16),mats.brass,[0,0,.030],[Math.PI/2,0,0]);
    const primer=mesh(round,cyl(.002,.0022,12),mats.edge,[0,0,.0314],[Math.PI/2,0,0]);
    const tip=mesh(round,keep(new THREE.SphereGeometry(.0052,12,8)),mats.copper,[0,0,-.018]);tip.scale.z=1.5;
    rounds.push({root:round,primer,tip});
  }
  const extractor=new THREE.Group();extractor.name='ExtractorRod';cylinder.add(extractor);mesh(extractor,cyl(.002,.061,12),mats.dark,[0,0,.036],[Math.PI/2,0,0]);mesh(extractor,cyl(.007,.002,6),mats.brass,[0,0,.034],[Math.PI/2,0,0]);
  const loader=new THREE.Group();loader.name='SixRoundLoader';root.add(loader);mesh(loader,cyl(.029,.013,18),mats.dark,[0,0,.015],[Math.PI/2,0,0]);
  for(let i=0;i<6;i++){const a=i/6*Math.PI*2;mesh(loader,cyl(.0052,.045,12),mats.brass,[Math.cos(a)*.0185,Math.sin(a)*.0185,-.009],[Math.PI/2,0,0]);}
  mesh(loader,cyl(.010,.020,12),mats.ceramic,[0,0,.030],[Math.PI/2,0,0]);bake(loader);
  const rearSight=new THREE.Object3D(),frontSight=new THREE.Object3D(),muzzle=new THREE.Object3D();rearSight.name='RelicRearSightAxis';frontSight.name='RelicFrontSightAxis';muzzle.name='RelicMuzzle';
  rearSight.position.set(0,.080,.054);frontSight.position.set(0,.080,-.240);muzzle.position.set(0,.040,-.283);root.add(rearSight,frontSight,muzzle);
  bake(body);bake(hammer);bake(cylinder);
  return{root,body,crane,cylinder,hammer,rounds,extractor,loader,rearSight,frontSight,muzzle,sightY:.080};
}
