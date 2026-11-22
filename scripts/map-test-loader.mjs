// Node data tests use the unchanged spatial-grid class without loading browser-only PeerJS.
import fs from 'node:fs';
export async function load(url,context,nextLoad){
 if(url.endsWith('/src/engine.js')){
   const text=fs.readFileSync(new URL(url),'utf8').replaceAll('\r\n','\n');
   const start=text.indexOf('export class SpatialGrid2D');
   const end=text.indexOf('\n}\n',start);
   if(start<0||end<0)throw new Error('SpatialGrid2D test fixture could not be extracted');
   return{format:'module',shortCircuit:true,source:text.slice(start,end+3)};
 }
 return nextLoad(url,context);
}
