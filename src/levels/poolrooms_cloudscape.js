/*! Copyright (c) 2026 Vendreith. Licensing: see LICENSE.md and THIRD_PARTY_NOTICES.md. */
// V6 sky corrections. Distances below are virtual kilometres; horizontal camera
// translation never approaches this environment. The ocean and cumuli integrate
// three-dimensional density; distant banks use three
// atmospheric distance shells. No images, sprites or finite external scene.
import {createCloudNoise} from './poolrooms_cloud_noise.js';
export const CLOUD_OCEAN={
 id:'cloud_ocean',name:'Floating cloud ocean',eye:2.45,seed:14.7,
 sun:[.38,.68,.62],zenith:[.018,.14,.55],horizon:[.36,.63,.87],
 sunColour:[1.0,.95,.85],shade:[.10,.20,.40],light:[0xffefd6,3.1,[.035,.073,.095]],
 ocean:[.12,.95,1,.035],weather:[14.7,.9,.9,.12],
 clouds:[
  [[-7,2.6,14,0],[2.1,1.1,1.8,2.1]],[[6,3.3,17,3],[2.5,1.7,2.2,4.7]],
  [[-8,4.5,-5,0],[1.2,1.1,1.0,8.2]],[[7,5.5,-6,3],[1.7,1.6,1.2,3.3]],
  [[-.8,3.0,24,1],[3.0,2.6,2.4,7.1]],[[13,2.2,12,4],[1.9,.8,1.3,9.5]],
  [[-13,3.0,12,2],[3.1,.7,1.5,5.9]],[[1,6.5,-14,1],[2.1,2.4,1.6,1.3]],
  [[16,4.2,3,0],[2.0,1.3,1.5,6.6]], [[-17,5.8,-4,3],[2.4,1.9,1.5,8.8]],
  [[2,4.1,22,2],[5.2,1.0,2.6,11.2]], [[-10,6.5,24,1],[3.0,3.5,2.2,13.4]]
 ]
};
export const CLOUDSCAPE_VERTEX=`varying vec3 vSkyWorld;void main(){vec4 w=modelMatrix*vec4(position,1.0);vSkyWorld=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}`;
export const CLOUDSCAPE_FRAGMENT=`
precision highp sampler3D;
out vec4 cloudscapeColour;
#define gl_FragColor cloudscapeColour
uniform sampler3D uNoiseVolume;
uniform float uTime,uEye,uCloudAmount,uCloudStepScale;
uniform vec3 uSunDirection,uSunColour,uShade,uZenith,uHorizon;
uniform vec4 uOcean,uWeather,uCloudCentre[12],uCloudScale[12];
varying vec3 vSkyWorld;
float hash31(vec3 p){p=fract(p*.1031);p+=dot(p,p.yzx+33.33);return fract((p.x+p.y)*p.z);}
float noise3(vec3 p){return textureLod(uNoiseVolume,p*.125,0.0).r;}
float fbm(vec3 p){return noise3(p)*.57+noise3(p*2.03+7.1)*.29+noise3(p*4.11+19.3)*.14;}
float smoothUnion(float a,float b,float k){float h=clamp(.5+.5*(b-a)/k,0.0,1.0);return mix(b,a,h)-k*h*(1.0-h);}
float ellipse(vec3 p,vec3 s){return (length(p/s)-1.0)*min(s.x,min(s.y,s.z));}
float cloudField(vec3 q,float family,float seed){
 float d;
 if(family<.5){
  d=ellipse(q,vec3(1.2,.55,.75));
  d=smoothUnion(d,length(q-vec3(-.6,.45,.05))-.75,.28);
  d=smoothUnion(d,length(q-vec3(.6,.63,-.07))-.83,.28);
  d=smoothUnion(d,length(q-vec3(.02,.9,.12))-.67,.22);
 }else if(family<1.5){
  d=ellipse(q-vec3(0,.25,0),vec3(.66,1.25,.58));
  d=smoothUnion(d,ellipse(q-vec3(-.18,1.15,0),vec3(.94,.75,.72)),.25);
  d=smoothUnion(d,ellipse(q-vec3(.45,1.65,.1),vec3(.7,.67,.6)),.2);
  d=smoothUnion(d,ellipse(q+vec3(.25,.55,0),vec3(1.1,.4,.8)),.25);
  d=smoothUnion(d,length(q-vec3(.45,.1,.12))-.76,.2);
  d=smoothUnion(d,length(q-vec3(-.42,.6,-.1))-.76,.2);
 }else if(family<2.5){
  d=ellipse(q,vec3(1.7,.42,.9));
  d=smoothUnion(d,ellipse(q-vec3(-.85,.24,.05),vec3(.95,.6,.8)),.25);
  d=smoothUnion(d,ellipse(q-vec3(.85,.18,-.1),vec3(.86,.53,.74)),.24);
 }else if(family<3.5){
  d=ellipse(q,vec3(1.1,.6,.9));
  for(int j=0;j<5;j++){float a=float(j)*2.399+seed;vec3 c=vec3(cos(a)*.66,.45+float(j)*.24,sin(a)*.4);d=smoothUnion(d,length(q-c)-(.64+float(j)*.025),.2);}
 }else{
  d=min(length(q-vec3(-.9,.15,0))-.62,length(q-vec3(.65,.4,-.2))-.72);
  d=smoothUnion(d,length(q-vec3(.0,-.05,.25))-.66,.16);
 }
 // Density erosion affects the boundary in three dimensions; it is not a
 // colour texture pasted over one common silhouette.
 vec3 shape=textureLod(uNoiseVolume,q*.43+seed*.137,0.0).rgb;
 float erosion=(1.0-shape.g)*.72+(fbm(q*5.3+seed)-.5)*.28;
 return d+erosion-.25;
}
float density(vec3 q,float family,float seed){return 1.0-smoothstep(-.22,.08,cloudField(q,family,seed));}
float seaDensity(vec3 p,float lod){
 vec3 wind=vec3(uTime*.0004,0,uTime*.00015),n=textureLod(uNoiseVolume,p*.17+wind+uWeather.x*.031,lod).rgb;
 float top=uOcean.x+uOcean.y*(.2+n.r*1.15);
 float vertical=smoothstep(uOcean.x-uOcean.y*.5,uOcean.x,p.y)*(1.0-smoothstep(top-.85*uOcean.y,top+.08,p.y));
 float body=smoothstep(.27,.65,n.g*.85+n.r*.15);
 return max(0.0,body*vertical-(1.0-n.b)*.08)*uOcean.z*1.8;
}
vec4 ocean(vec3 ro,vec3 rd,vec3 air){
 if(uOcean.z<.01||rd.y>=-.001)return vec4(air,120.0);
 float nearD=max(.02,(uOcean.x+uOcean.y*1.9-ro.y)/rd.y),farD=min(120.0,(uOcean.x-uOcean.y*.55-ro.y)/rd.y);
 if(nearD>=farD)return vec4(air,120.0);
 float stepD=(farD-nearD)/float(SEA_STEPS),trans=1.0,solid=120.0;
 float lod=clamp(log2(max(.02,stepD)*.8),0.0,3.0);vec3 accumulated=vec3(0),sun=normalize(uSunDirection);
 for(int i=0;i<SEA_STEPS;i++){
  float t=nearD+(float(i)+.5)*stepD;vec3 p=ro+rd*t;float d=seaDensity(p,lod);if(d<.005)continue;
  float tau=seaDensity(p+sun*.35,lod)*.35+seaDensity(p+sun*.85,lod)*.5+seaDensity(p+sun*1.5,lod)*.65;
  float lighting=exp(-tau*4.8);
  vec3 col=uShade*(.65+.35*smoothstep(uOcean.x,uOcean.x+uOcean.y,p.y))+uSunColour*1.85*(.03+.97*lighting);
  col=mix(col,air,1.0-exp(-t*uOcean.w));float alpha=1.0-exp(-d*stepD*2.5);
  accumulated+=trans*alpha*col;trans*=1.0-alpha;
  if(trans<.12&&solid>100.0)solid=t;if(trans<.02)break;
 }
 return vec4(air*trans+accumulated,solid);
}
vec3 horizonBanks(vec3 ro,vec3 rd,vec3 sky){
 vec2 az=normalize(rd.xz+vec2(.00001));float elevation=rd.y/max(.05,length(rd.xz));
 for(int layer=2;layer>=0;layer--){
  float f=float(layer),distance=22.0+f*18.0;
  float broad=fbm(vec3(az*(2.7+f*.8),uWeather.x+f*7.0));
  float crest=1.1+broad*(3.6-f*.6),y=ro.y+elevation*distance;
  float a=(1.0-smoothstep(crest-.35,crest+.45,y))*smoothstep(-.6,.1,y);
  a*=smoothstep(.25,.48,broad)*uWeather.y*(.72-f*.13);
  vec3 bank=mix(vec3(.63,.76,.94),vec3(1.5,1.55,1.53),smoothstep(crest-.9,crest+.2,y));
  bank=mix(bank,uHorizon,.22+f*.22);sky=mix(sky,bank,clamp(a,0.0,.9));
 }
 return sky;
}
void main(){
 vec3 rd=normalize(vSkyWorld-cameraPosition),sun=normalize(uSunDirection),ro=vec3(0,uEye,0);
 float up=smoothstep(-.15,.95,rd.y),mu=max(0.0,dot(rd,sun));
 vec3 air=mix(uHorizon,uZenith,pow(up,.42));
 air+=vec3(.23,.16,.07)*pow(mu,12.0)*.35;
 air=horizonBanks(ro,rd,air);
 float wisps=smoothstep(.58,.79,fbm(vec3(rd.x*10.0,rd.y*24.0,rd.z*4.0)+uWeather.x));
 air=mix(air,vec3(1.0,1.08,1.2),wisps*smoothstep(.35,.8,rd.y)*uWeather.w);
 vec4 sea=ocean(ro,rd,air);vec3 accumulated=vec3(0);float trans=1.0;
 for(int cluster=0;cluster<12;cluster++){
  if(trans<.025||uCloudAmount<.01)break;
  vec4 c=uCloudCentre[cluster],s=uCloudScale[cluster];vec3 centre=c.xyz+vec3(uTime*.0005,0,uTime*.00022);
  vec3 boundMin=c.w<.5?vec3(-2,-1.1,-1.4):c.w<1.5?vec3(-1.8,-1.5,-1.4):c.w<2.5?vec3(-2.2,-.95,-1.5):c.w<3.5?vec3(-1.9,-1.2,-1.7):vec3(-1.9,-1.1,-1.4);
  vec3 boundMax=c.w<.5?vec3(2,2.2,1.4):c.w<1.5?vec3(1.8,2.9,1.5):c.w<2.5?vec3(2.2,1.4,1.5):c.w<3.5?vec3(1.9,2.6,1.7):vec3(1.9,1.5,1.4);
  vec3 origin=(ro-centre)/s.xyz,inv=1.0/(rd/s.xyz+vec3(.000001)),ta=(boundMin-origin)*inv,tb=(boundMax-origin)*inv,lower=min(ta,tb),upper=max(ta,tb);
  float nearD=max(0.0,max(lower.x,max(lower.y,lower.z))),farD=min(sea.w,min(upper.x,min(upper.y,upper.z)));
  if(farD>nearD){
   int activeSteps=max(4,int(float(CLOUD_STEPS)*clamp(uCloudStepScale,.25,1.0)+.5));
   float stepD=(farD-nearD)/float(activeSteps);
   for(int j=0;j<CLOUD_STEPS;j++){
    if(j>=activeSteps||trans<.025)break;
    vec3 p=ro+rd*(nearD+(float(j)+.5)*stepD),q=(p-centre)/s.xyz;
    float den=density(q,c.w,s.w);if(den<.005)continue;
    vec3 l=sun/s.xyz;float tau=density(q+l*.18,c.w,s.w)*.3+density(q+l*.6,c.w,s.w)*.55+density(q+l*1.5,c.w,s.w)*1.1;
    float direct=exp(-tau*3.0),ambient=.45+.3*smoothstep(-.4,1.4,q.y);
    vec3 col=uShade*ambient+uSunColour*2.05*(.018+.982*direct);
    col+=vec3(.7,.65,.5)*pow(mu,14.0)*(1.0-den)*.14;
    col=mix(col,uHorizon,1.0-exp(-(nearD+float(j)*stepD)*.012));
    float a=1.0-exp(-den*stepD*3.3*uCloudAmount);
    accumulated+=trans*a*col;trans*=1.0-a;
   }
  }
 }
 vec3 colour=sea.rgb*trans+accumulated;
 colour+=uSunColour*7.0*smoothstep(.99978,.99994,mu);
 gl_FragColor=vec4(colour,1.0);
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
}`;
export function createCloudscape(THREE,profile=CLOUD_OCEAN,quality='high',resources){
 const steps=['low','mobile'].includes(quality)?8:quality==='med'?14:quality==='ultra'?32:24;
 const ordered=profile.clouds.slice().sort((a,b)=>Math.hypot(a[0][0],a[0][1]-profile.eye,a[0][2])-Math.hypot(b[0][0],b[0][1]-profile.eye,b[0][2]));
 const uniforms={uTime:{value:0},uEye:{value:profile.eye},uCloudAmount:{value:1},uCloudStepScale:{value:quality==='low'||quality==='mobile'?.38:quality==='med'?.65:quality==='high'?.88:1.0},uSunDirection:{value:new THREE.Vector3(...profile.sun).normalize()},uSunColour:{value:new THREE.Vector3(...profile.sunColour)},uShade:{value:new THREE.Vector3(...profile.shade)},uZenith:{value:new THREE.Vector3(...profile.zenith)},uHorizon:{value:new THREE.Vector3(...profile.horizon)},uOcean:{value:new THREE.Vector4(...profile.ocean)},uWeather:{value:new THREE.Vector4(...profile.weather)},uCloudCentre:{value:profile.clouds.map(c=>new THREE.Vector4(...c[0]))},uCloudScale:{value:profile.clouds.map(c=>new THREE.Vector4(...c[1]))}};
 uniforms.uCloudCentre.value=ordered.map(c=>new THREE.Vector4(...c[0]));uniforms.uCloudScale.value=ordered.map(c=>new THREE.Vector4(...c[1]));
 const noise=resources?.noise||createCloudNoise(THREE);uniforms.uNoiseVolume={value:noise};
 const material=new THREE.ShaderMaterial({uniforms,glslVersion:THREE.GLSL3,defines:{CLOUD_STEPS:steps,SEA_STEPS:['low','mobile'].includes(quality)?16:48},vertexShader:CLOUDSCAPE_VERTEX,fragmentShader:CLOUDSCAPE_FRAGMENT,side:THREE.DoubleSide});
 return {profile,material,noise,setQuality(q){uniforms.uCloudStepScale.value=q==='low'||q==='mobile'?.38:q==='med'?.65:q==='high'?.88:1.0;},update(time,localEye){uniforms.uTime.value=time;uniforms.uEye.value=profile.eye+Math.max(-2,Math.min(25,localEye))*.035;}};
}
