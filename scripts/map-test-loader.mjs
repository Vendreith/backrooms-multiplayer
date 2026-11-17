// Node data tests use the unchanged spatial-grid class without loading browser-only PeerJS.
import fs from 'node:fs';
export async function load(url,context,nextLoad){
 if(url.endsWith('/src/engine.js')){const text=fs.readFileSync(new URL(url),'utf8'),start=text.indexOf('export class SpatialGrid2D'),end=text.indexOf('\n}\n',start)+3;return{format:'module',shortCircuit:true,source:text.slice(start,end)};}
 return nextLoad(url,context);
}
