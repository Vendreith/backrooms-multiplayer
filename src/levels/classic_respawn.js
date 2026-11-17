/* Copyright (c) 2026 Vendreith. Host-only environmental fall recovery. */
import {classicPitAt} from './classic_layout.js';
export function respawnPitPlayer(p,map,now) {
  if(!map?.classic||p.levelId!=='level0'||p.isAI||!['s','k'].includes(p.role)||!['ok','down'].includes(p.state))return null;
  const pit=classicPitAt(map.classic,p.x,p.z,p.y);if(!pit||p.y>pit.threshold)return null;
  p.x=map.SPAWN.x;p.z=map.SPAWN.z-3.15;p.y=0;p.vy=0;p.spd=0;p.yaw=0;p.pitch=0;
  p.sliding=false;p.crouch=false;p.grounded=true;p.moveSprint=false;p.swingT=0;p.pitResets=(p.pitResets||0)+1;p.warpGuardUntil=now+850;
  if(p.weapon){p.weapon.reloadEnd=0;p.weapon.reloadRemaining=0;}
  return {ev:'pitRespawn',id:p.id,x:p.x,y:p.y,z:p.z,sequence:p.pitResets};
}
