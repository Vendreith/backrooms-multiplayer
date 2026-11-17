/* Copyright (c) 2026 Vendreith. Shared local/host endurance and ordinary pursuit policy. */
import {SPEED} from './constants.js';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export function pursuitLimits(archetype={}){
 const ceiling=SPEED.SURV_SPRINT*.75;
 const max=clamp(Number(archetype.maxChaseSpd)||SPEED.SURV_SPRINT*.72,SPEED.SURV_SPRINT*.65,ceiling);
 return {start:clamp(Number(archetype.chaseSpd)||SPEED.SURV_SPRINT*.65,0,max),max,acceleration:3.8,braking:8,attackRange:1.55,attackCooldown:2.6,loseTime:clamp(Number(archetype.loseTime)||3.4,2.4,4.2)};
}
export function threatProximity(player,roster,peaceful=false){
 if(peaceful||player.role!=='s')return 0;let nearest=Infinity;
 for(const p of Object.values(roster))if(p.role==='k'&&(p.levelId||'level0')===(player.levelId||'level0')&&!['dead','escaped'].includes(p.state))nearest=Math.min(nearest,Math.hypot(player.x-p.x,player.z-p.z));
 return clamp((18-nearest)/14,0,1);
}
export function advanceStamina(value,dt,{sprinting=false,chase=0,tactical=false}={}){
 const current=Number.isFinite(value)?value:SPEED.STAM_DRAIN,proximity=clamp(chase,0,1);
 const rate=sprinting&&!tactical?-(1-proximity*.42):SPEED.STAM_DRAIN/SPEED.STAM_REFILL*(1+proximity*.25);
 return clamp(current+Math.max(0,dt)*rate,0,SPEED.STAM_DRAIN);
}
