import assert from 'node:assert/strict';
import fs from 'node:fs';
import {HandheldCamera} from '../src/fps/handheld_motion.js';
import {buildClassicLayout} from '../src/levels/classic_layout.js';
import {composeClassicTemplate,CLASSIC_TEMPLATES} from '../src/levels/classic_templates.js';
import {exploreClassic} from '../src/levels/classic_graph.js';
const checks=[];function test(name,f){f();checks.push(name);}
const rms=values=>Math.sqrt(values.reduce((a,b)=>a+b*b,0)/values.length);
function signal(hz,mode,intensity=1,ads=0){const c=new HandheldCamera(),values=[];for(let i=0;i<hz*15;i++){const o=c.update(1/hz,{mode,intensity,ads});if(i>hz*3)values.push(o.fine.pitch);}return values;}
test('three perceptibly distinct fine-tremor amplitudes, bounded over a minute',()=>{
 const v=['subtle','natural','footage'].map(m=>rms(signal(60,m)));assert(v[1]>v[0]*2.5);assert(v[2]>v[1]*1.8);
 for(const hz of[15,24,30,60,144]){const c=new HandheldCamera();for(let i=0;i<hz*60;i++){const o=c.update(1/hz,{mode:'footage',intensity:2});assert(Object.values(o.fine).every(Number.isFinite));assert(Math.abs(o.fine.x)<=.0025&&Math.abs(o.fine.pitch)<.00262);}}
});
test('6–12Hz spectral structure is band-limited at low frame rates',()=>{
 const values=signal(60,'footage');const power=f=>{let a=0,b=0;for(let i=0;i<values.length;i++){a+=values[i]*Math.cos(2*Math.PI*f*i/60);b+=values[i]*Math.sin(2*Math.PI*f*i/60);}return (a*a+b*b)/values.length**2;};assert(power(7.1)>power(3)*100);assert(power(8.7)>power(4)*100);assert(power(10.6)>power(5)*40);
 assert(rms(signal(15,'footage'))>0&&rms(signal(15,'footage'))<rms(values)*.4);assert(rms(signal(24,'footage'))>0);assert(rms(signal(30,'footage'))<rms(values));
});
test('tremor slider zero, ADS attenuation, deterministic phase and reset',()=>{
 assert.equal(rms(signal(60,'footage',0)),0);assert(rms(signal(60,'footage',1,1))<rms(signal(60,'footage'))*.03);assert.deepEqual(signal(60,'natural'),signal(60,'natural'));
});
test('thirty geometric signatures, including actual decks and stairs, are distinct',()=>{
 const signatures=[];for(const type of CLASSIC_TEMPLATES){const walls=[],c={ceiling:2.9,decks:[],stairs:[],setPieces:[]};composeClassicTemplate(type,{x:0,z:0},(...args)=>walls.push(args),c);assert(walls.length||c.decks.length||c.stairs.length);signatures.push(JSON.stringify({walls,...c}));}assert.equal(new Set(signatures).size,30);
});
test('compact progression, shallow intentional leaves and discoverability simulations',()=>{
 const data=[];for(const seed of[2026,1337,91671]){const c=buildClassicLayout(seed),runs=Array.from({length:100},(_,i)=>exploreClassic(c,i+1)),found=runs.filter(r=>r.found),lengths=found.map(r=>r.metres+110).sort((a,b)=>a-b),median=lengths[Math.floor(lengths.length/2)];assert(c.metrics.maxDeadEndMetres<=18.75);assert(c.metrics.primaryCompositions>=12&&c.metrics.primaryCompositions<=20);assert(found.length>=98);assert(median/1.99<=180);data.push({seed,found:found.length,medianMetres:median,p90Metres:lengths[Math.floor(lengths.length*.9)],metrics:c.metrics});}
 fs.mkdirSync('output/playwright/level0-v12',{recursive:true});fs.writeFileSync('output/playwright/level0-v12/exploration.json',JSON.stringify({method:'Only visible portal width, local light, landmarks, heading continuity, visit history and 8% stochastic choices. No exit-distance or route-rank oracle. 110m transition allowance.',seeds:data},null,2));
});
console.log(JSON.stringify({passed:checks.length,checks},null,2));
