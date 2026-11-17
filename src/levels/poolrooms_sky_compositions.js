/*! Copyright (c) 2026 Vendreith. Licensing: see LICENSE.md and THIRD_PARTY_NOTICES.md. */
import {CLOUD_OCEAN} from './poolrooms_cloudscape.js';
// Authored distributions, not rotations or colour variants of a common cloud map.
// Six arrangements are intentionally reused across twelve window chambers.
const cloud=(x,y,z,f,sx,sy,sz,seed)=>[[x,y,z,f],[sx,sy,sz,seed]];
export const SKY_COMPOSITIONS={
 ocean:CLOUD_OCEAN,
 cathedral:{id:'cathedral',name:'Celestial cathedral',eye:1.4,sun:[.25,.56,.79],sunColour:[1,.94,.82],shade:[.13,.23,.44],zenith:[.025,.17,.49],horizon:[.43,.65,.87],ocean:[-.6,.7,.8,.028],weather:[24.1,.95,1,.05],light:[0xffefd3,3.25,[.055,.075,.1]],clouds:[
 cloud(-9,2,15,1,3.2,3.6,2.8,1.2),cloud(5,2.6,18,3,3.6,3.8,2.8,3.7),cloud(15,3,22,1,4,4.5,3.1,6.4),cloud(-23,4,26,3,4,4.6,3.5,8.2),cloud(0,1.4,34,2,7,1.5,3,4.8),cloud(28,1.1,36,2,8,1,4,9.5),cloud(-25,1,45,2,10,1.5,4,2.5),cloud(-8,7,-16,3,3,3,2,3.3),cloud(12,5,-14,1,2,3,2,7.7),cloud(-20,4,2,0,3,2,2,1.7),cloud(25,4,0,3,4,2,3,4.7),cloud(2,10,3,0,2,1.3,2,8.1)]},
 azure:{id:'azure',name:'Azure infinity',eye:.7,sun:[-.34,.79,.52],sunColour:[1,.98,.91],shade:[.07,.16,.4],zenith:[.008,.075,.38],horizon:[.25,.5,.82],ocean:[-1,.6,.5,.025],weather:[41.7,.55,.65,.3],light:[0xfff4dc,3.15,[.026,.065,.11]],clouds:[
 cloud(-11,5.4,17,0,2.5,1.4,2,2.3),cloud(8,6,19,3,2.7,1.7,2.1,8.8),cloud(0,3.7,31,2,5,1.1,2.7,1.1),cloud(22,2.7,29,0,3.2,1.6,2.5,6.2),cloud(-25,3.5,40,3,4.6,2.7,3.2,2.7),cloud(4,8,45,1,3.5,3.1,2.6,8.4),cloud(-18,9,-13,4,3,1.5,2,4.2),cloud(20,7,-18,0,3,2,2.3,7.6),cloud(-32,4,4,2,6,1.6,3,3.4),cloud(34,4,5,2,6,1.6,3,8.3),cloud(1,14,2,4,3,1,2,5.6),cloud(-4,3,-42,2,6,1.3,3,9.9)]},
 golden:{id:'golden',name:'Golden dream',eye:1.1,sun:[-.52,.24,.82],sunColour:[1.15,.73,.38],shade:[.14,.19,.36],zenith:[.07,.24,.49],horizon:[.86,.55,.3],ocean:[-.4,.85,.85,.028],weather:[63.3,.8,1,.14],light:[0xffc381,3.8,[.1,.058,.037]],clouds:[
 cloud(-12,1,19,2,5,.9,2.4,2.6),cloud(8,1.7,23,2,6,1.2,3.1,5.3),cloud(19,3,36,3,4,2.8,3,7.7),cloud(-28,2.6,38,0,5,2.2,4,1.8),cloud(0,4.8,48,1,3.8,4,3,4.1),cloud(24,6,15,4,2.5,1,2,8.4),cloud(-20,7,8,2,5,.6,2,9.7),cloud(-20,3,-22,0,4,1.7,3,3.5),cloud(20,4,-18,2,5,1.3,3,2.2),cloud(40,2,0,2,6,1.2,3,1.3),cloud(-40,2,2,3,3,2.3,2,7.2),cloud(3,10,-6,4,2,1,2,6.5)]},
 pastel:{id:'pastel',name:'Pastel sanctuary',eye:1.8,sun:[.6,.36,.71],sunColour:[1.1,.77,.68],shade:[.22,.14,.36],zenith:[.16,.2,.49],horizon:[.74,.45,.59],ocean:[-.3,1.2,1,.03],weather:[81.5,1,1,.22],light:[0xffc8cb,2.8,[.11,.052,.105]],clouds:[
 cloud(-10,2.1,13,2,4,1.4,3,2.7),cloud(7,2.8,20,0,4,2.3,3,6.1),cloud(0,6,35,3,4,3.8,3,5.8),cloud(-25,4.6,30,3,5,3,3.6,8.4),cloud(24,1.3,32,2,8,1,4,3.5),cloud(-4,1.2,50,2,12,1.4,5,1.3),cloud(26,6,9,4,3,1.3,2,4.8),cloud(-26,7,0,0,3,2,2,8.9),cloud(2,6,-18,0,5,2,3,3.4),cloud(-20,3,-25,2,7,1,4,7.5),cloud(25,3,-20,3,4,2.5,3,2.2),cloud(0,12,4,4,3,1,3,9.3)]},
 mint:{id:'mint',name:'Mint horizon',eye:1.25,sun:[-.2,.7,.69],sunColour:[1,.98,.84],shade:[.08,.29,.34],zenith:[.035,.26,.43],horizon:[.39,.7,.71],ocean:[-.6,.9,.8,.025],weather:[105.4,1,1,.08],light:[0xffeed2,2.7,[.045,.11,.095]],clouds:[
 cloud(-4,5.1,24,2,7.5,2.2,3.5,7.2),cloud(12,2,25,0,4.7,2.3,3.3,1.4),cloud(-20,4.5,31,1,3.7,3.7,3,4.5),cloud(0,1,44,2,13,1.2,5,8.1),cloud(28,2,36,3,4,2.8,3,9.4),cloud(0,8,23,4,2,1,2,2.5),cloud(-17,8,5,4,3,1.1,2,5.2),cloud(24,6,4,0,3,2,2.4,3.8),cloud(-8,3,-25,2,7,1,4,1.9),cloud(20,5,-20,3,4,2.4,3,8.3),cloud(-35,3,0,0,4,2,3,6.4),cloud(33,3,-8,2,6,1.2,4,5.7)]}
};
export const ZONE_SKY={zone_ak:'ocean',zone_b:'cathedral',zone_al:'azure',zone_an:'cathedral',zone_f:'cathedral',zone_i:'mint',zone_s:'mint',zone_z:'golden',zone_j:'golden',zone_aj:'golden',zone_ah:'pastel',zone_aa:'pastel'};
