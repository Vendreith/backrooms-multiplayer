/*! Copyright (c) 2026 Vendreith. Licensing: see LICENSE.md and THIRD_PARTY_NOTICES.md. */
// Original realtime atmosphere: angular rays, a distant cloud bank, a layered
// cumulus slab and broad dream-cloud weather. No photographs or finite skybox.
export const POOL_SUN_DIRECTION=[.38,.68,.62];
export const POOL_SKY_VERTEX=`
varying vec3 vSkyWorld;
void main(){vec4 w=modelMatrix*vec4(position,1.0);vSkyWorld=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}`;
export const POOL_SKY_FRAGMENT=`
uniform float uTime;
uniform float uCloudAmount;
uniform vec3 uSunDirection;
varying vec3 vSkyWorld;
float hash31(vec3 p){p=fract(p*.1031);p+=dot(p,p.yzx+33.33);return fract((p.x+p.y)*p.z);}
float noise3(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(mix(hash31(i),hash31(i+vec3(1,0,0)),f.x),mix(hash31(i+vec3(0,1,0)),hash31(i+vec3(1,1,0)),f.x),f.y),mix(mix(hash31(i+vec3(0,0,1)),hash31(i+vec3(1,0,1)),f.x),mix(hash31(i+vec3(0,1,1)),hash31(i+vec3(1,1,1)),f.x),f.y),f.z);}
float billow(vec3 p){return noise3(p)*.57+noise3(p*2.07+13.1)*.28+noise3(p*4.19+7.3)*.15;}
vec4 cloudField(vec3 q){
 float d=(length(q*vec3(.65,1.65,1.0))-1.0)*.65;vec3 normal=normalize(q*vec3(.4225,2.7225,1.0)+.0001);
 for(int lobe=0;lobe<5;lobe++){
  vec4 sphere=lobe==0?vec4(-.8,.2,.0,.72):lobe==1?vec4(.8,.25,.0,.75):lobe==2?vec4(0,.7,.0,.80):lobe==3?vec4(-.52,.63,.12,.73):vec4(.57,.73,-.1,.69);
  vec3 delta=q-sphere.xyz;float sd=length(delta)-sphere.w,h=clamp(.5+.5*(sd-d)/.22,0.0,1.0);normal=normalize(mix(normalize(delta+.0001),normal,h));d=mix(sd,d,h)-.22*h*(1.0-h);
 }
 if(-q.y-.56>d){d=-q.y-.56;normal=vec3(0,-1,0);}
 return vec4(normal,d+(billow(q*3.1)-.5)*.23);
}
vec4 cloudCenter(int i){
 if(i==0)return vec4(5.8,2.0,5.3,.88);
 if(i==1)return vec4(-5.6,2.7,6.6,1.05);
 if(i==2)return vec4(-6.8,2.3,-5.0,1.15);
 if(i==3)return vec4(7.7,3.4,-5.3,1.3);
 if(i==4)return vec4(.8,1.3,9.5,1.15);
 if(i==5)return vec4(-1.2,4.8,-10.2,1.6);
 if(i==6)return vec4(11.2,5.7,2.5,1.8);
 return vec4(-10.2,7.7,4.2,2.15);
}
void main(){
 // Translation-free cloud origin makes every aperture a view of the same
 // atmosphere at infinity. Rotation, reflected cameras and perspective agree.
 vec3 rd=normalize(vSkyWorld-cameraPosition),sun=normalize(uSunDirection);
 float up=smoothstep(-.18,1.0,rd.y),mu=max(0.0,dot(rd,sun));
 vec3 azure=vec3(.015,.11,.50),horizon=vec3(.22,.52,.82);
 vec3 sky=mix(horizon,azure,pow(up,.28));
 sky+=vec3(.28,.20,.10)*pow(mu,10.0)*.28;
 float bank=noise3(rd*vec3(3.8,2.0,3.8)+vec3(.0,5.1,.0));
 float bankMask=smoothstep(.49,.69,bank)*(1.0-smoothstep(.0,.16,abs(rd.y)))*.24;
 sky=mix(sky,vec3(.75,.92,1.05),bankMask);
 vec3 accumulated=vec3(0.0);float trans=1.0;
 for(int cluster=0;cluster<8;cluster++){
  if(uCloudAmount<.01)break;
  vec4 formation=cloudCenter(cluster);vec3 center=formation.xyz+vec3(uTime*.0007,0.0,uTime*.0003);float scale=formation.w;
  float b=dot(rd,center),disc=b*b-dot(center,center)+6.25*scale*scale;
  if(disc>0.0&&b>0.0){
   float nearD=max(0.0,b-sqrt(disc)),farD=b+sqrt(disc),stepD=(farD-nearD)/float(CLOUD_STEPS);
   for(int sampleId=0;sampleId<CLOUD_STEPS;sampleId++){
    vec3 q=(rd*(nearD+(float(sampleId)+.5)*stepD)-center)/scale;
    vec4 field=cloudField(q);float density=clamp(-field.w*2.8,0.0,1.0);
    float shade=exp(-max(0.0,-cloudField(q+sun*.30).w)*2.7);
    float sculpt=.26+.74*(max(0.0,dot(field.xyz,sun))*.72+clamp(q.y*.45+.45,0.0,1.0)*.28);
    vec3 color=mix(vec3(.16,.27,.46),vec3(1.75,1.70,1.56),sculpt*(.65+.35*shade));
    color+=vec3(1.0,.87,.65)*pow(mu,14.0)*(1.0-density)*.12;
    float alpha=1.0-exp(-density*stepD*2.5*uCloudAmount/scale);
    accumulated+=trans*alpha*color;trans*=1.0-alpha;
   }
  }
 }
 sky=sky*trans+accumulated;
 sky+=vec3(8.0,6.8,4.6)*smoothstep(.99978,.99994,mu);
 gl_FragColor=vec4(sky,1.0);
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
}`;
