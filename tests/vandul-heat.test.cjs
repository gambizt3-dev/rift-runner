'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {setup}=require('./ballistic.test.cjs');
const nearby=(q,e)=>Object.assign(e,{x:480,y:740,vx:0,vy:0,nextDriveBy:999});
function field(options={},pair=false){
 const q=setup(options);
 q.cover(false);q.choose('practice');q.step();q.target(true,pair);
 const s=q.inspect();s.cones.splice(0);
 Object.assign(s.p,{x:480,y:900,vx:0,vy:0});
 nearby(q,s.vandul);
 if(pair)Object.assign(s.vanduls[1],{x:625,y:765,vx:0,vy:0,nextDriveBy:999});
 return q;
}
function advance(q,predicate,limit=700){
 for(let i=0;i<limit;i++){
  if(predicate())return;
  q.inspect().vandulLasers.splice(0); // sustain contact without defeating the stationary test pilot
  q.step();
 }
 assert.fail('timed out');
}
test('natural enemy fire heats on actual shots, locks after four and re-arms with a new windup',()=>{
 const q=field(),v=q.inspect().vandul,p=q.inspect().p;
 assert.equal(v.heat,0);
 advance(q,()=>v.laserIndex===1);
 assert.equal(v.heat,35);assert.equal(p.heat,0,'enemy fire does not feed player heat');
 advance(q,()=>v.overheated);
 assert.equal(v.laserIndex,4);assert.ok(v.heat>99.9&&v.heat<=100);
 const hotAt=q.inspect().duelClock;
 q.inspect().vandulLasers.splice(0);
 q.step(187);assert.equal(v.laserIndex,4);assert.equal(v.overheated,true);
 advance(q,()=>!v.overheated,35);
 assert.ok(v.heat<=45);assert.equal(v.laserIndex,4);
 assert.ok(v.nextLaser-q.inspect().duelClock>.24,'fresh aim tell after cooling');
 advance(q,()=>v.laserIndex===5,24);
 assert.ok(q.inspect().duelClock-hotAt>=3.5&&q.inspect().duelClock-hotAt<3.8);
 assert.ok(v.heat>70&&v.heat<80);
});
test('each ship has its own thermal state; heat and firing park during pause, hide and reset',()=>{
 const paint=[],q=field({heatPaint:paint},true),[a,b]=q.inspect().vanduls;
 b.nextLaser=999;
 advance(q,()=>a.overheated);
 assert.equal(b.heat,0);assert.equal(b.laserIndex,0);
 paint.length=0;q.step();
 assert.ok(paint.some(x=>/^COOLING /.test(x.label)&&x.x<550));
 assert.ok(paint.some(x=>x.label==='HEAT 0%'&&x.x>550));
 const thermal=a.heat,clock=q.inspect().duelClock;
 q.key('keydown','KeyP');q.step(180);
 assert.equal(a.heat,thermal);assert.equal(q.inspect().duelClock,clock);
 q.choose('resume');q.hide(true);q.step(220);
 assert.equal(a.heat,thermal);assert.equal(q.inspect().duelClock,clock);
 q.hide(false);q.choose('resume');
 b.nextLaser=clock;
 advance(q,()=>b.laserIndex===1,12);
 assert.ok(b.heat>0);assert.equal(a.laserIndex,4,'other ship can fire while first ship vents');
 q.target(false);q.target(true);
 assert.equal(q.inspect().vandul.heat,0);assert.equal(q.inspect().vandul.overheated,false);
});
test('vent is subtle/static in Reduced Motion and heat text/smoke do not reveal an occluded ship',()=>{
 const heatPaint=[],q=field({heatPaint,reducedMotion:true}),v=q.inspect().vandul;
 advance(q,()=>v.overheated);
 heatPaint.length=0;q.step();
 assert.ok(heatPaint.some(x=>/^COOLING /.test(x.label)));
 assert.equal(heatPaint.filter(x=>x.vent).length,1);
 const {p,asteroids}=q.inspect();
 nearby(q,v);Object.assign(p,{x:480,y:900,vx:0,vy:0});
 asteroids.push({x:480,y:823,r:36,asteroid:true,profile:{tile:0,drawSize:90,mass:12},invMass:1/12,vx:0,vy:0,angle:0,spin:0,wallFx:0,hitGlow:0,rockSign:1});
 heatPaint.length=0;q.step();
 assert.equal(v.seesPlayer,false);assert.equal(v.overheated,true);
 assert.deepEqual(heatPaint,[],'no thermal marker or smoke through cover');
});
