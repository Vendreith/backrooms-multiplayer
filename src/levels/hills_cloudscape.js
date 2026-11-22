/*! Copyright (c) 2026 Vendreith. Licensing: see LICENSE.md and THIRD_PARTY_NOTICES.md. */
// Reuse the Poolrooms volumetric kernel/noise with authored summer cloud groups.
import {createCloudscape,CLOUDSCAPE_FRAGMENT,CLOUD_OCEAN} from './poolrooms_cloudscape.js';
export const SUMMER_SKY={...CLOUD_OCEAN,id:'summer_hills',eye:.2,sun:[-.45,.72,.5],zenith:[.012,.085,.38],horizon:[.50,.73,.98],shade:[.36,.47,.65],ocean:[0,0,0,0],weather:[7.9,.28,.8,.12],clouds:[
 [[-4,8,-18,3],[2.8,1.5,1.9,7.1]], [[5,6.8,-21,0],[3.3,1.8,2.6,2.1]],
 [[18,10,-28,3],[3.0,2.1,2.2,13.4]], [[-2,16,-25,1],[1.8,1.0,1.8,3.7]],
 [[-23,6,6,0],[3.3,1.4,2.3,5.1]], [[23,5.5,8,3],[3.0,1.6,2.1,4.6]],
 [[-7,7.5,25,3],[3.1,1.5,2.2,9.2]], [[14,4.5,30,0],[3.5,1.3,2.0,8.5]],
 ...Array.from({length:8},(_,i)=>{const a=i*Math.PI/4+.22,d=42+(i%3)*7;return[[Math.sin(a)*d,2.7+(i%3)*.45,Math.cos(a)*d,i%2?0:3],[3.9+(i%3)*.6,.9+(i%2)*.3,1.7+(i%2)*.5,31+i*2.1]];})
]};
const landscape=`
vec3 distantLandscape(vec3 rd,vec3 sky){
 float a=atan(rd.z,rd.x),e=rd.y/max(.05,length(rd.xz));
 // Integer angular frequencies close continuously at atan's -PI/PI seam.
 for(int i=2;i>=0;i--){float f=float(i),crest=.012+sin(a*(2.+f)+f*2.2)*.043+sin(a*(5.+f)+f)*.016-f*.009;
 float cover=1.-smoothstep(crest-.002,crest+.003,e);
 vec3 land=mix(vec3(.16,.29,.12),uHorizon,.34+f*.22);
 land+=vec3(.013,.018,.009)*sin(a*(4.+f)+e*20.);
 sky=mix(sky,land,cover);}
 return sky;
}
`;
export function createHillsCloudscape(THREE,quality){
 const sky=createCloudscape(THREE,SUMMER_SKY,quality);
 sky.material.fragmentShader=CLOUDSCAPE_FRAGMENT
  .replace('void main(){',landscape+'void main(){')
  .replace('air=horizonBanks(ro,rd,air);','air=horizonBanks(ro,rd,air);air=distantLandscape(rd,air);')
  .replace('smoothstep(-.22,.08,cloudField','smoothstep(-.24,.16,cloudField')
  .replace('q*5.3+seed','q*3.1+seed')
  .replace('(float(j)+.5)*stepD','(float(j)+hash31(vec3(gl_FragCoord.xy,17.7)))*stepD');
 const steps=q=>['low','mobile'].includes(q)?20:q==='med'?32:q==='ultra'?80:64;
 sky.material.defines.CLOUD_STEPS=steps(quality);
 sky.material.needsUpdate=true;
 const setQuality=sky.setQuality;
 sky.setQuality=q=>{setQuality(q);if(sky.material.defines.CLOUD_STEPS!==steps(q)){sky.material.defines.CLOUD_STEPS=steps(q);sky.material.needsUpdate=true;}};
 const update=sky.update;sky.update=(time,eye)=>update(time,eye*.035);
 return sky;
}
