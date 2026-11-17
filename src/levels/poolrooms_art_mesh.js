/*! Copyright (c) 2026 Vendreith. Licensing: see LICENSE.md and THIRD_PARTY_NOTICES.md. */
import {createTubeUnion} from './poolrooms_implicit_mesh.js';
import {createWindowFrameGeometry} from './poolrooms_windows.js';
// Solid authored primitives. Every extruded shape has thickness and end caps.
export function createPoolArtGeometry(item,THREE) {
  const indexed=g=>{if(!g.index)g.setIndex(Array.from({length:g.attributes.position.count},(_,i)=>i));return g;};
  const extrude=(shape,depth)=>indexed(new THREE.ExtrudeGeometry(shape,{depth,bevelEnabled:false,curveSegments:40}));
  let g;
  if(item.kind==='sky_frame'){
    g=indexed(createWindowFrameGeometry(item,THREE));
  }else if(item.kind==='sky_ceiling'){
    const s=new THREE.Shape();s.moveTo(item.x0,item.z0);s.lineTo(item.x0,item.z1);s.lineTo(item.x1,item.z1);s.lineTo(item.x1,item.z0);s.closePath();
    for(const w of item.holes){const p=new THREE.Path();p.moveTo(w.x-w.width/2,w.z-w.height/2);p.lineTo(w.x+w.width/2,w.z-w.height/2);p.lineTo(w.x+w.width/2,w.z+w.height/2);p.lineTo(w.x-w.width/2,w.z+w.height/2);p.closePath();s.holes.push(p);}
    g=extrude(s,.32);g.rotateX(Math.PI/2);g.translate(0,item.y+.32,0);
  }else if(item.kind==='sky_mullion'){
    g=new THREE.BoxGeometry(item.width,item.height,item.depth);if(item.side==='e')g.rotateY(Math.PI/2);g.translate(item.x,item.y,item.z);
  }else if(item.kind==='hollow_sweep'){
    const curve=new THREE.CatmullRomCurve3(item.path.map(p=>new THREE.Vector3(...p))),rows=item.segments||100,cols=24,frames=curve.computeFrenetFrames(rows,false),positions=[],uvs=[],indices=[],stride=cols+1,layerSize=(rows+1)*stride;
    for(let layer=0;layer<2;layer++)for(let i=0;i<=rows;i++){const p=curve.getPointAt(i/rows),r=item.radius+layer*item.thickness;for(let j=0;j<=cols;j++){const a=(j===cols?0:j/cols*Math.PI*2),v=p.clone().addScaledVector(frames.normals[i],Math.cos(a)*r).addScaledVector(frames.binormals[i],Math.sin(a)*r);positions.push(v.x,v.y,v.z);uvs.push(j/cols,i/rows*curve.getLength()/4);}}
    for(let layer=0;layer<2;layer++)for(let i=0;i<rows;i++)for(let j=0;j<cols;j++){const a=layer*layerSize+i*stride+j,b=a+stride,c=a+1,d=b+1;if(layer===1)indices.push(a,c,b,c,d,b);else indices.push(a,b,c,c,b,d);}
    for(const i of[0,rows])for(let j=0;j<cols;j++){const a=i*stride+j,b=a+1,c=a+layerSize,d=b+layerSize;if(i===0)indices.push(a,b,c,b,d,c);else indices.push(a,c,b,b,c,d);}
    g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));g.setIndex(indices);g.computeVertexNormals();
  }else if(item.kind==='basin_bed'){
    const s=new THREE.Shape();for(let i=0;i<80;i++){const a=i/80*Math.PI*2;if(i)s.lineTo(Math.cos(a)*item.rx,Math.sin(a)*item.rz);else s.moveTo(item.rx,0);}s.closePath();g=extrude(s,.34);g.rotateX(Math.PI/2);g.translate(item.cx,item.bedY,item.cz);
  }else if(item.kind==='hollow_conduit'){
    const s=new THREE.Shape(),hole=new THREE.Path();for(let i=0;i<64;i++){const a=i/64*Math.PI*2,co=Math.cos(a),si=Math.sin(a);if(i){s.lineTo(co*(item.r+item.thickness),si*(item.r+item.thickness));hole.lineTo(co*item.r,si*item.r);}else{s.moveTo(item.r+item.thickness,0);hole.moveTo(item.r,0);}}s.closePath();hole.closePath();s.holes.push(hole);g=extrude(s,item.len);g.translate(0,0,-item.len/2);if(item.axis==='x')g.rotateY(Math.PI/2);g.translate(item.x,item.y,item.z);
  }else if(item.kind==='dome_shell'){
    const points=[];for(let i=0;i<=48;i++){const a=i/48*(Math.PI/2-.015);points.push(new THREE.Vector2(Math.cos(a)*(item.rx+item.thickness),item.y0+Math.sin(a)*(item.ry+item.thickness)));}for(let i=48;i>=0;i--){const a=i/48*(Math.PI/2-.015);points.push(new THREE.Vector2(Math.cos(a)*item.rx,item.y0+Math.sin(a)*item.ry));}points.push(points[0].clone());g=new THREE.LatheGeometry(points,64);g.translate(item.x,0,item.z);
  }else if(item.kind==='tube_union'){
    g=createTubeUnion(item,THREE);
  }else if(item.kind==='pipe_sweep'){
    const curve=new THREE.CatmullRomCurve3(item.path.map(p=>new THREE.Vector3(...p))),s=new THREE.Shape();for(let i=0;i<16;i++){const a=i/16*Math.PI*2;if(i)s.lineTo(Math.cos(a)*item.radius,Math.sin(a)*item.radius);else s.moveTo(item.radius,0);}s.closePath();
    g=indexed(new THREE.ExtrudeGeometry(s,{steps:item.segments||100,bevelEnabled:false,extrudePath:curve,curveSegments:8}));
  }else if(item.kind==='swept_channel'){
    const curve=new THREE.CatmullRomCurve3(item.path.map(p=>new THREE.Vector3(...p))),rows=item.segments||120,cols=24,positions=[],uvs=[],indices=[];
    for(let layer=0;layer<2;layer++)for(let i=0;i<=rows;i++){
      const t=i/rows,p=curve.getPoint(t),tangent=curve.getTangent(t).normalize(),side=new THREE.Vector3(tangent.z,0,-tangent.x).normalize(),up=new THREE.Vector3().crossVectors(tangent,side).normalize();
      const r=item.radius+layer*item.thickness;
      for(let j=0;j<=cols;j++){const a=j/cols*Math.PI,v=p.clone().addScaledVector(side,Math.cos(a)*r).addScaledVector(up,item.radius-Math.sin(a)*r);positions.push(v.x,v.y,v.z);uvs.push(j/cols*item.radius*Math.PI/2.4,t*curve.getLength()/2.4);}
    }
    const stride=cols+1,layerSize=(rows+1)*stride;
    for(let layer=0;layer<2;layer++)for(let i=0;i<rows;i++)for(let j=0;j<cols;j++){const a=layer*layerSize+i*stride+j,b=a+stride,c=a+1,d=b+1;if(layer===0)indices.push(a,c,b,c,d,b);else indices.push(a,b,c,c,b,d);}
    for(let i=0;i<rows;i++)for(const j of [0,cols]){const a=i*stride+j,b=a+stride,c=a+layerSize,d=b+layerSize;indices.push(a,b,c,b,d,c);}
    for(const i of [0,rows])for(let j=0;j<cols;j++){const a=i*stride+j,b=a+1,c=a+layerSize,d=b+layerSize;indices.push(a,c,b,b,c,d);}
    g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));g.setIndex(indices);g.computeVertexNormals();
  }else if(item.kind==='pool_deck'){
    const s=new THREE.Shape();s.moveTo(item.x0,item.z0);s.lineTo(item.x0,item.z1);s.lineTo(item.x1,item.z1);s.lineTo(item.x1,item.z0);s.closePath();
    for(const h of item.holes){const p=new THREE.Path();p.absellipse(h.cx,h.cz,h.rx,h.rz,0,Math.PI*2,false);s.holes.push(p);}
    g=extrude(s,item.thickness);g.rotateX(Math.PI/2);g.translate(0,item.y,0);
  }else if(item.kind==='basin_ring'){
    const s=new THREE.Shape();s.absellipse(item.cx,item.cz,item.rx+item.thickness,item.rz+item.thickness,0,Math.PI*2,false);
    const p=new THREE.Path();p.absellipse(item.cx,item.cz,item.rx,item.rz,0,Math.PI*2,false);s.holes.push(p);
    g=extrude(s,item.y1-item.y0);g.rotateX(Math.PI/2);g.translate(0,item.y1,0);
  }else if(item.kind==='arch_family'){
    const r=item.span/2,h=item.spring,rise=item.rise,t=item.rim,s=new THREE.Shape();
    s.moveTo(-r-t,0);s.lineTo(-r-t,h+rise+t);s.lineTo(r+t,h+rise+t);s.lineTo(r+t,0);s.lineTo(r,0);s.lineTo(r,h);
    if(item.family==='pointed'){s.quadraticCurveTo(r*.55,h+rise*.88,0,h+rise);s.quadraticCurveTo(-r*.55,h+rise*.88,-r,h);}
    else s.absellipse(0,h,r,rise,0,Math.PI,false);
    s.lineTo(-r,0);s.closePath();g=extrude(s,item.depth);g.translate(0,item.y0,-item.depth/2);g.rotateY(item.rotY);g.translate(item.x,0,item.z);
  }else if(item.kind==='barrel_vault'){
    const r=item.span/2,h=item.spring,rise=item.rise,t=item.thickness,s=new THREE.Shape();
    s.moveTo(-r-t,h);s.absellipse(0,h,r+t,rise+t,Math.PI,0,true);s.lineTo(r,h);s.absellipse(0,h,r,rise,0,Math.PI,false);s.closePath();
    g=extrude(s,item.len);g.translate(0,item.y0,-item.len/2);if(item.axis==='x')g.rotateY(Math.PI/2);g.translate(item.x,0,item.z);
  }else if(item.kind==='glow_panel'){
    g=new THREE.BoxGeometry(item.axis==='z'?.12:item.width,item.height,item.axis==='z'?item.width:.12);g.translate(item.x,item.y,item.z);
  }else return null;
  const uv=g.attributes.uv,p=g.attributes.position,n=g.attributes.normal;
  if(item.kind!=='swept_channel')for(let i=0;i<uv.count;i++){const nx=Math.abs(n.getX(i)),ny=Math.abs(n.getY(i));uv.setXY(i,(nx>.7?p.getZ(i):p.getX(i))/2.4,(ny>.7?p.getZ(i):p.getY(i))/2.4);}
  g.computeBoundingBox();g.computeBoundingSphere();return g;
}
