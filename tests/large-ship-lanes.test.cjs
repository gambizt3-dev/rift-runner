'use strict';
const {readFileSync}=require('node:fs'),{runInNewContext}=require('node:vm'),assert=require('node:assert/strict'),test=require('node:test');
const src=readFileSync(new URL('../game.js','file:'+__filename),'utf8');
test('Outer Free Flight lanes clear Pegasus and its corvette even with both side pads open',()=>{
 const c={capitalCourse:{x:475,y:175,halfRun:390,radius:150},pegasusCapital:{},flightMode:{id:'free-flight'},pendingCarrierSortie:null,capitalShip:null};
 const code=src.slice(src.indexOf('function berthWorld('),src.indexOf('function berthLocal('))+
  src.slice(src.indexOf('const capitalCruise='),src.indexOf('function updateCapital('))+
  src.slice(src.indexOf('const crosswindFlightCourse='),src.indexOf('const crosswindHull=window'))+
  src.slice(src.indexOf('function resoluteFormation('),src.indexOf('const resoluteMounts='))+
  '\nObject.assign(globalThis,{capitalCruisePose,crosswindTrafficPose,resoluteFormation,berthWorld});';
 runInNewContext(code,c);
 // Conservatively enclose the painted Pegasus hull at multiple longitudinal bands.
 const carrierBands=[[-32,32,-221,-180],[-46,45,-184,-144],[-51,50,-148,-108],[-64,63,-112,-71],[-74,73,-75,-34],[-86,85,-38,2],[-86,85,-2,39],[-86,85,35,75],[-93,93,71,112],[-93,93,108,148],[-89,89,144,184],[-71,70,180,221]].flatMap(([l,r,t,b])=>[[l,t],[r,t],[l,b],[r,b]]);
 // The plan flies continuously in the chart. Check both arcs with extended side pads.
 let min=Infinity;
 for(let distance=0;distance<=13200;distance+=5){
  const t=distance/38,ship={...c.capitalCruisePose(distance),vessel:c.pegasusCapital,stream:{},phase:'flight'};
  const cross=c.crosswindTrafficPose(distance),r=c.resoluteFormation(ship,t);
  const left=Math.min(...carrierBands.map(([x,y])=>c.berthWorld(ship,x,y).x));
  const right=Math.max(...carrierBands.map(([x,y])=>c.berthWorld(ship,x,y).x));
  // Full outline envelopes rather than only docking-circle radii.
  const crossLeft=cross.x-50-Math.abs(Math.sin(cross.heading))*175;
  const resoluteRight=r.x+Math.max(76,45+Math.abs(Math.sin(r.heading))*134)+4;
  const separation=Math.min(crossLeft-right,left-resoluteRight);
  min=Math.min(min,separation);
  assert.ok(separation>=7,'clearance at distance '+distance+': '+separation);
 }
 assert.ok(Number.isFinite(min));
});
