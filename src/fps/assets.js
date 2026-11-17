/* Copyright (c) 2026 Vendreith. Original models; see models/fps/PROVENANCE.md. */
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { buildMeridian } from './relic_asset.js';

const TAU = Math.PI * 2;
export function createWeaponAssets() {
  const resources = new Set();
  const keep = r => { resources.add(r); return r; };
  const material = (color, metalness, roughness) => {
    const m = keep(new THREE.MeshStandardMaterial({ color, metalness, roughness, fog: false, depthTest: true, depthWrite: true }));
    // Reserve the nearest depth interval for the viewmodel, retaining correct self-occlusion.
    // It stays in the existing scene/post pipeline and needs no second render pass.
    m.onBeforeCompile = shader => {
      shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\n varying vec3 vFpsSurface;').replace('#include <project_vertex>', '#include <project_vertex>\n vFpsSurface = position;\n gl_Position.z = -gl_Position.w + (gl_Position.z + gl_Position.w) * 0.008;');
      shader.fragmentShader = shader.fragmentShader.replace('#include <common>', '#include <common>\n varying vec3 vFpsSurface;');
      if (metalness > .5) shader.fragmentShader = shader.fragmentShader.replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\n float grainCoord = dot(vFpsSurface, vec3(18900.0, 173.0, 97.0)); float grainFilter = 1.0 / (1.0 + fwidth(grainCoord)); roughnessFactor = clamp(roughnessFactor + sin(grainCoord) * 0.018 * grainFilter, 0.12, 1.0);');
      // A handheld light can sit centimetres from this rig. Preserve midtones and hue while
      // rolling off only extreme near-field highlights, before the unchanged world post stack.
      shader.fragmentShader = shader.fragmentShader.replace('#include <opaque_fragment>', 'float fpsLuma = max(dot(outgoingLight, vec3(0.2126, 0.7152, 0.0722)), 0.00001); if (fpsLuma > 0.8) { float fpsShoulder = 0.8 + 0.4 * (1.0 - exp(-(fpsLuma - 0.8) / 0.4)); outgoingLight *= fpsShoulder / fpsLuma; }\n#include <opaque_fragment>');
    };
    m.customProgramCacheKey = () => 'fps-view-depth-brush-shoulder-v3-' + (metalness > .5 ? 'metal' : 'matte');
    return m;
  };
  const mats = {
    steel: material(0x8d979d, .88, .26), edge: material(0xc3c8cb, .94, .19), dark: material(0x20282c, .8, .37),
    black: material(0x10181b, .25, .62), rubber: material(0x202a2c, .08, .87), brass: material(0xb18c45, .82, .29),
    glove: material(0x29332f, .02, .87), pad: material(0x424c42, .02, .78), seam: material(0x676c58, 0, .96),
    sleeve: material(0x746e53, 0, .96), cuff: material(0x454a3b, 0, .92), dot: material(0xc3d8b2, .1, .44),
    ceramic: material(0xd3c7a7,.05,.43),wood: material(0x453038,.03,.42),copper: material(0x9e6b4a,.75,.31),energy: material(0x5ca9b7,.35,.26),machined:material(0x777f84,.78,.38)
  };
  const box = (w, h, d, r = .002) => keep(new RoundedBoxGeometry(w, h, d, 2, Math.min(r, w / 3, h / 3, d / 3)));
  const cyl = (r, h, n = 16) => keep(new THREE.CylinderGeometry(r, r, h, n));
  function mesh(parent, geo, mat, pos = [0, 0, 0], rot = [0, 0, 0]) {
    const m = new THREE.Mesh(geo, mat); m.position.set(...pos); m.rotation.set(...rot);
    m.renderOrder = 900; m.frustumCulled = false; parent.add(m); return m;
  }
  function profile(points, thickness, holes = []) {
    const s = new THREE.Shape(); points.forEach(([x, y], i) => i ? s.lineTo(x, y) : s.moveTo(x, y)); s.closePath();
    for (const pts of holes) { const h = new THREE.Path(); pts.forEach(([x, y], i) => i ? h.lineTo(x, y) : h.moveTo(x, y)); h.closePath(); s.holes.push(h); }
    const g = new THREE.ExtrudeGeometry(s, { depth: thickness, bevelEnabled: true, bevelSize: .0008, bevelThickness: .0008, bevelSegments: 2, steps: 1, curveSegments: 12 });
    g.translate(0, 0, -thickness / 2); return keep(g);
  }
  function sideProfile(points, thickness, holes = []) { const g = profile(points, thickness, holes); g.rotateY(-Math.PI / 2); return g; }
  function bolt(parent, x, y, z, side = 1, r = .003) {
    mesh(parent, cyl(r, .0017, 12), mats.dark, [x, y, z], [0, 0, Math.PI / 2]);
    mesh(parent, box(.0018, .0007, r * 1.1, .0002), mats.edge, [x + side * .001, y, z]);
  }
  // All static pieces sharing a material become a single draw, while animated pivots stay independent.
  function bake(group) {
    group.updateMatrix();
    const byMaterial = new Map();
    for (const child of [...group.children]) {
      if (!child.isMesh) continue;
      child.updateMatrix();
      let g = child.geometry.clone(); g.applyMatrix4(child.matrix);
      // Rounded boxes and extrusions have different index layouts; unify attributes.
      if (g.index) { const old = g; g = g.toNonIndexed(); old.dispose(); }
      g.deleteAttribute('uv'); g.clearGroups();
      const list = byMaterial.get(child.material) || []; list.push(g); byMaterial.set(child.material, list); group.remove(child);
    }
    for (const [mat, list] of byMaterial) {
      const g = keep(mergeGeometries(list, false)); list.forEach(x => x.dispose()); mesh(group, g, mat);
    }
  }
  function pistol() {
    const root = new THREE.Group(), body = new THREE.Group(), slide = new THREE.Group(), mag = new THREE.Group();
    root.name = 'DesertEagle_Original'; slide.name = 'Slide'; mag.name = 'Magazine'; root.add(body, slide, mag);
    // Distinct fixed polygonal barrel, open muzzle, sculpted frame, slide rails and angled grip.
    mesh(body, sideProfile([[-.222, .019], [-.226, .040], [-.207, .055], [-.073, .055], [-.045, .028], [-.052, .004], [-.21, .004]], .033), mats.steel);
    mesh(body, cyl(.0092, .014, 24), mats.dark, [0, .028, -.227], [Math.PI / 2, 0, 0]);
    mesh(body, keep(new THREE.TorusGeometry(.0087, .0014, 6, 24)), mats.edge, [0, .028, -.235]);
    mesh(body, cyl(.0058, .002, 24), mats.black, [0, .028, -.237], [Math.PI / 2, 0, 0]);
    mesh(body, sideProfile([[-.13, -.002], [-.044, .008], [.035, .008], [.048, -.012], [.023, -.118], [-.013, -.12], [-.032, -.042], [-.10, -.04]], .032), mats.steel);
    // Trigger guard has real negative space; trigger remains visible inside it.
    const guard = [[-.094, -.013], [-.095, -.041], [-.078, -.055], [-.029, -.052], [-.023, -.025]];
    for (let i = 0; i < guard.length - 1; i++) {
      const [z0, y0] = guard[i], [z1, y1] = guard[i + 1];
      const m = mesh(body, box(.014, .006, Math.hypot(z1 - z0, y1 - y0)), mats.steel, [0, (y0 + y1) / 2, (z0 + z1) / 2]);
      m.rotation.x = -Math.atan2(y1 - y0, z1 - z0);
    }
    mesh(body, sideProfile([[-.058, -.014], [-.062, -.033], [-.056, -.040], [-.051, -.034], [-.052, -.014]], .006), mats.dark);
    const grip = [[-.014, -.027], [.033, -.014], [.017, -.111], [-.012, -.113], [-.029, -.045]];
    for (const side of [-1, 1]) {
      mesh(body, sideProfile(grip, .003), mats.rubber, [side * .018, 0, 0]);
      for (let row = 0; row < 13; row++) for (let col = 0; col < 4; col++) {
        mesh(body, box(.0012, .0025, .0027, .0003), mats.black, [side * .0205, -.038 - row * .0047, -.013 + col * .008 + row * .0007], [side * .3, 0, .3]);
      }
      bolt(body, side * .022, -.04, .006, side, .0035); bolt(body, side * .022, -.097, .003, side, .0035);
      mesh(body, box(.003, .005, .029), mats.dark, [side * .019, -.009, -.022]);
      mesh(body, box(.004, .013, .015), mats.dark, [side * .021, .006, .018], [0, 0, -.18]);
      bolt(body, side * .019, -.006, -.065, side, .0025);
    }
    mesh(body, box(.032, .006, .08), mats.dark, [0, .004, -.031]);
    mesh(body, box(.012, .019, .012), mats.dark, [0, .017, .045], [.35, 0, 0]); // hammer
    // Slide split rails leave the ejection port open on the right.
    mesh(slide, box(.035, .027, .058), mats.steel, [0, .027, .015]);
    mesh(slide, box(.004, .031, .042), mats.steel, [-.017, .027, -.034]);
    mesh(slide, box(.035, .007, .047), mats.steel, [0, .042, -.034]);
    mesh(slide, box(.035, .007, .047), mats.dark, [0, .011, -.034]);
    mesh(slide, box(.034, .029, .018), mats.steel, [0, .026, -.065]);
    mesh(body, box(.025, .013, .033), mats.dark, [0, .027, -.033]);
    for (const side of [-1, 1]) {
      for (let i = 0; i < 9; i++) mesh(slide, box(.0018, .023, .0015, .0004), mats.dark, [side * .0184, .026, -.008 + i * .0046], [-.12, 0, 0]);
      for (let i = 0; i < 5; i++) mesh(body, box(.002, .001, .018, .0002), mats.edge, [side * .0172, .033 + i * .003, -.173]);
    }
    // Rear notch and front post share a measured y=.062 sight axis, parallel to -Z.
    mesh(slide, box(.035, .011, .012), mats.dark, [0, .046, .033]);
    for (const side of [-1, 1]) {
      mesh(slide, box(.009, .012, .011), mats.dark, [side * .0105, .057, .033]);
      mesh(slide, box(.002, .002, .001), mats.dot, [side * .0105, .061, .039]);
    }
    mesh(body, box(.004, .011, .011), mats.dark, [0, .057, -.200]);
    mesh(body, box(.0014, .0016, .001), mats.dot, [0, .061, -.194]);
    mesh(mag, box(.024, .097, .032), mats.dark, [0, -.062, .008], [-.17, 0, 0]);
    mesh(mag, box(.037, .008, .044), mats.black, [0, -.116, .016]);
    for (let i = 0; i < 5; i++) mesh(mag, cyl(.0016, .025, 8), mats.black, [0, -.033 - i * .012, .025], [0, 0, Math.PI / 2]);
    mesh(mag, cyl(.005, .022, 12), mats.brass, [0, -.01, .008], [Math.PI / 2, 0, 0]);
    bake(body); bake(slide); bake(mag);
    const muzzle = new THREE.Object3D(); muzzle.name = 'Muzzle'; muzzle.position.set(0, .028, -.244); root.add(muzzle);
    const rearSight = new THREE.Object3D(), frontSight = new THREE.Object3D(); rearSight.name = 'RearSightAxis'; frontSight.name = 'FrontSightAxis';
    rearSight.position.set(0, .062, .033); frontSight.position.set(0, .062, -.20); root.add(rearSight, frontSight);
    return { root, body, slide, mag, muzzle, rearSight, frontSight, sightY: .062 };
  }
  function knife() {
    const root = new THREE.Group(), blade = new THREE.Group(), a = new THREE.Group(), b = new THREE.Group();
    root.name = 'Butterfly_Original'; blade.name = 'Blade'; a.name = 'SafeHandleHinge'; b.name = 'FreeHandleHinge';
    a.position.x = -.012; b.position.x = .012; root.add(blade, a, b);
    // A tapered, bevelled spear blade with a separate polished cutting edge.
    const bladeVertices=[],bladeIndices=[];
    for(const[y,w,h]of[[-.008,.012,.0018],[.026,.015,.003],[.119,.013,.0028]])bladeVertices.push(-w,y,0,0,y,h,w,y,0,0,y,-h);
    bladeVertices.push(0,.176,0);
    for(let ring=0;ring<2;ring++)for(let side=0;side<4;side++){const a=ring*4+side,b=ring*4+(side+1)%4,c=(ring+1)*4+side,d=(ring+1)*4+(side+1)%4;bladeIndices.push(a,b,c,b,d,c);}
    for(let side=0;side<4;side++)bladeIndices.push(8+side,8+(side+1)%4,12);bladeIndices.push(0,2,1,0,3,2);
    const bladeGeo=new THREE.BufferGeometry();bladeGeo.setAttribute('position',new THREE.Float32BufferAttribute(bladeVertices,3));bladeGeo.setIndex(bladeIndices);const flatBlade=bladeGeo.toNonIndexed();bladeGeo.dispose();flatBlade.computeVertexNormals();mesh(blade,keep(flatBlade),mats.edge);
    for(const side of[-1,1])for(let i=0;i<3;i++)mesh(blade,box(.0008,.008,.0008,.0002),mats.brass,[side*(.004+i*.0025),.012,side*.0015],[0,0,-side*.15]);
    for (const h of [a, b]) {
      for (const side of [-1, 1]) {
        const outline = [[-.010, .004], [-.012, -.017], [-.010, -.127], [-.005, -.139], [.007, -.139], [.012, -.127], [.010, .004]];
        const holes = [];
        for (let i = 0; i < 4; i++) { const y = -.025 - i * .024; holes.push([[-.004, y], [-.004, y - .014], [.004, y - .014], [.004, y]]); }
        mesh(h, profile(outline, .0028, holes), mats.dark, [0, 0, side * .006]);
        mesh(h, box(.0015, .11, .0015, .0004), mats.brass, [side * .0084, -.071, side * .008]);
        for (const y of [-.012, -.123]) {
          mesh(h, cyl(.0034, .0018, 12), mats.steel, [0, y, side * .0087], [Math.PI / 2, 0, 0]);
          mesh(h, box(.0033, .0007, .0006, .0002), mats.black, [0, y, side * .0098]);
        }
        mesh(h, cyl(.0063, .002, 20), mats.brass, [0, 0, side * .008], [Math.PI / 2, 0, 0]);
        mesh(h, cyl(.0034, .0022, 12), mats.dark, [0, 0, side * .009], [Math.PI / 2, 0, 0]);
      }
      mesh(h, box(.012, .009, .014), mats.ceramic, [0, -.129, 0]); bake(h);
    }
    bake(blade);
    const latch = mesh(a, box(.004, .023, .005), mats.steel, [0, -.14, 0], [0, 0, .2]); latch.name = 'Latch';
    return { root, blade, a, b, latch };
  }
  function hand(side) {
    const root = new THREE.Group(), palm = new THREE.Group(); root.name = side > 0 ? 'RightHand' : 'LeftHand'; root.add(palm);
    const palmGeo = keep(new THREE.SphereGeometry(1,16,12));palmGeo.scale(.014,.039,.031);mesh(palm,palmGeo,mats.glove,[0,0,.012]);
    const thenar = keep(new THREE.SphereGeometry(1,12,8));thenar.scale(.014,.024,.022);mesh(palm,thenar,mats.glove,[-side*.004,.023,.032],[0,0,.3]);
    mesh(palm, box(.007, .060, .043, .003), mats.pad, [side * .013, .001, .015]);
    for (let i = 0; i < 9; i++) mesh(palm, box(.0009, .0022, .001, .0002), mats.seam, [side * .017, -.025 + i * .006, .036]);
    const fingers = [];
    for (let i = 0; i < 5; i++) {
      let parent = root; const chain = [], isThumb = i === 4;
      const sizes = isThumb ? [.027, .022] : [.027 + (i === 1 ? .005 : 0), .023, .018];
      for (let j = 0; j < sizes.length; j++) {
        const joint = new THREE.Group(); joint.name = `${side > 0 ? 'Right' : 'Left'}Finger${i}Joint${j}`; joint.position.set(j ? -side * sizes[j - 1] : -side * .008, j ? 0 : isThumb ? .040 : -.028 + i * .018, j ? 0 : isThumb ? .030 : -.016);
        parent.add(joint); const pad = new THREE.Group(); joint.add(pad);
        const len = sizes[j], thick = isThumb ? .018 : .014;
        mesh(pad, box(len, thick, thick * .95, .004), mats.glove, [-side * len / 2, 0, 0]);
        mesh(pad, box(len * .72, thick * .72, .003, .001), mats.pad, [-side * len / 2, 0, -.007]);
        bake(pad); chain.push(joint); parent = joint;
      }
      fingers.push(chain);
    }
    bake(palm);
    const sleeve = new THREE.Group(); sleeve.name = 'Sleeve';
    const sleeveGeo = keep(new THREE.CylinderGeometry(.032, .047, 1, 16, 12));
    const attr = sleeveGeo.attributes.position;
    for (let i = 0; i < attr.count; i++) { const y = attr.getY(i), fold = 1 + .06 * Math.sin((y + .5) * TAU * 5) * Math.sin((y + .5) * Math.PI); attr.setX(i, attr.getX(i) * fold); attr.setZ(i, attr.getZ(i) * fold); }
    sleeveGeo.computeVertexNormals(); const foreSleeve = mesh(sleeve, sleeveGeo, mats.sleeve);
    const upperSleeve = mesh(sleeve, keep(new THREE.CylinderGeometry(.047,.055,1,16,8)),mats.sleeve);
    const cuff = mesh(root, cyl(.031, .028, 16), mats.cuff, [.009 * side, -.012, .057], [Math.PI / 2, 0, 0]);
    const wrist = new THREE.Object3D();wrist.name=side>0?'RightWristContact':'LeftWristContact';wrist.position.set(.009*side,-.012,.070);root.add(wrist);
    return { root, fingers, sleeve, foreSleeve, upperSleeve, cuff, wrist, side };
  }
  const deagle = pistol(), butterfly = knife(), relic = buildMeridian({THREE,mesh,box,cyl,profile,sideProfile,bake,bolt,mats,keep}), right = hand(1), left = hand(-1);
  return { mats, deagle, butterfly, relic, right, left, resources, dispose() { for (const r of resources) r.dispose(); resources.clear(); } };
}
