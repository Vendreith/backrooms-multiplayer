/*! Copyright (c) 2026 Vendreith. Licensing: see LICENSE.md and THIRD_PARTY_NOTICES.md. */
// World-space porcelain avoids normal-threshold UV seams and cylinder stretching.
export function createTubeMaterial(base){
 const m=base.clone();m.bumpMap=null;m.roughness=.38;
 m.onBeforeCompile=shader=>{
  const vary='varying vec3 vTubePosition,vTubeNormal;\n';
  shader.vertexShader=vary+shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvTubePosition=(modelMatrix*vec4(position,1.0)).xyz;vTubeNormal=normalize(mat3(modelMatrix)*normal);');
  shader.fragmentShader=vary+shader.fragmentShader.replace('#include <map_fragment>',`
    vec3 tubeWeight=pow(abs(normalize(vTubeNormal)),vec3(6.0));tubeWeight/=max(.0001,tubeWeight.x+tubeWeight.y+tubeWeight.z);
    vec4 tubeTexel=texture2D(map,vTubePosition.yz/2.4)*tubeWeight.x+texture2D(map,vTubePosition.xz/2.4)*tubeWeight.y+texture2D(map,vTubePosition.xy/2.4)*tubeWeight.z;
    diffuseColor*=tubeTexel;
  `);
 };m.customProgramCacheKey=()=> 'pool-tube-triplanar-v1';return m;
}
