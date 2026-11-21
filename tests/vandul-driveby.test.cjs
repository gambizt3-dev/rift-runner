'use strict';
const {stageClassicCover}=require('./fixture-cover.cjs');
const test=require('node:test'),assert=require('node:assert/strict');
const {setup,tick,arrive}=require('./ballistic.test.cjs');
const speed=o=>Math.hypot(o.vx,o.vy),gap=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
async function duel(cover=false){
 const q=setup();q.cover(cover);q.open('start');await tick();q.step();q.target(true);q.inspect().cones.splice(0);if(cover)stageClassicCover(q.inspect());return q;
}
function place(q,cover){
 const {p,vandul:v}=q.inspect();
 Object.assign(p,cover?{x:480,y:988}:{x:240,y:432});
 Object.assign(v,cover?{x:480,y:765}:{x:240,y:240});
 return {p,v};
}
function cue(q,seed=0){const v=q.inspect().vandul;v.driveSeed=seed;v.nextDriveBy=.07;q.step(6);return v;}
test('stand-off retreats when crowded and approaches again from far away',async()=>{
 const q=await duel(),{p,v}=place(q,false);v.nextDriveBy=30;
 Object.assign(v,{x:240,y:340});
 const close=gap(v,p);q.step(64);assert.ok(gap(v,p)>close+25,'moves away from close player');
 Object.assign(v,{x:240,y:125,vx:0,vy:0});
 const far=gap(v,p);q.step(58);assert.ok(gap(v,p)<far-16,'returns from long range');
});
test('seeded feasible sides differ; signaled pass zooms past hull, fires, and pulls back without clipping',async()=>{
 for(const [cover,seed,expectedSide] of [[false,0,1],[false,1000,-1],[true,0,1]]){
  const q=await duel(cover),{p,v}=place(q,cover);
  cue(q,seed);assert.equal(v.drive.phase,'tell');assert.equal(v.drive.side,expectedSide);
  assert.ok(q.dashPatterns.some(a=>a[0]===7&&a[1]===5),'drive path is visibly telegraphed');
  assert.match(q.el['vandul-duel-readout'].textContent,/Drive-by incoming/);
  assert.equal(v.drive.reposition,cover,'blocked enemy chooses a cover-clearing reposition pass');
  const before=gap(v,p),rock=q.inspect().asteroids;
  let min=Infinity,top=0,shipClear=Infinity,zoomLasers=0,passed=false,recovered=false,maxJump=0;
  for(let f=0;f<250;f++){
   const x=v.x,y=v.y,phase=v.drive?.phase,laser=v.laserIndex;
   q.step();maxJump=Math.max(maxJump,Math.hypot(v.x-x,v.y-y));
   if(v.drive?.phase==='pass'){
    min=Math.min(min,gap(v,p));top=Math.max(top,speed(v));passed ||=v.y>p.y+28;
    for(const r of rock)shipClear=Math.min(shipClear,gap(v,r)-v.r-r.r);
   }
   if(phase==='pass'&&v.laserIndex>laser)zoomLasers++;
   recovered ||=v.drive?.phase==='recover';
  }
  assert.ok(before>165&&min>55&&min<89,'near pass without hull contact');
  assert.ok(top>155&&top<196,'genuinely faster than normal drift/steer');
  assert.ok(maxJump<4,'positions integrated each frame, no teleport');
  assert.ok(zoomLasers>=2,'actual laser schedule continues on the pass');assert.ok(passed&&recovered);
  assert.ok(shipClear>7,'no contact with any of the heavy cover bodies');
  assert.ok(gap(v,p)>150,'keeps distance again after recovery');
  assert.ok(v.nextDriveBy>q.inspect().duelClock+.3,'cannot chain immediate passes');
 }
});
test('new blocked route aborts safely; impossible path defers rather than looping',async()=>{
 const q=await duel(true),{v}=place(q,true);cue(q);
 assert.equal(v.drive.phase,'tell');
 const rock=q.inspect().asteroids[0];Object.assign(rock,{x:v.drive.gate.x,y:v.drive.gate.y,vx:0,vy:0});
 q.step();assert.equal(v.drive.phase,'recover');
 assert.ok(v.nextDriveBy>q.inspect().duelClock+2.8);
 const corner=await duel(),{p,v:c}=place(corner,false);
 Object.assign(p,{x:38,y:38});Object.assign(c,{x:40,y:240});cue(corner);
 assert.equal(c.drive,null);assert.ok(c.nextDriveBy>.99&&c.nextDriveBy<1.75);
});
test('pause and background freeze the tell; Reset clears it and schedules afresh',async()=>{
 const q=await duel();place(q,false);const v=cue(q);
 assert.equal(v.drive.phase,'tell');const when=v.drive.until,clock=q.inspect().duelClock;
 q.key('keydown','KeyP');q.step(80);assert.equal(v.drive.until,when);assert.equal(q.inspect().duelClock,clock);
 q.open('resume');q.hide(true);q.step(80);assert.equal(v.drive.phase,'tell');assert.equal(q.inspect().duelClock,clock);
 q.hide(false);q.open('resume');q.step(36);assert.equal(v.drive.phase,'pass');
 q.reset();assert.equal(q.inspect().vandul,null);arrive(q);const next=q.inspect().vandul;
 assert.notEqual(next,v);assert.equal(next.drive,null);assert.equal(q.inspect().duelClock,0);
 assert.ok(next.nextDriveBy>=2&&next.nextDriveBy<3.35);
});
