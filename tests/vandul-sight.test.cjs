'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {setup,tick}=require('./ballistic.test.cjs');
const fix=(body,x,y)=>Object.assign(body,{x,y,vx:0,vy:0});
const rockAt=(x,y,r=30)=>({x,y,r,asteroid:true,profile:{tile:0,drawSize:r*3,mass:12},invMass:1/12,vx:0,vy:0,angle:0,spin:0,wallFx:0,hitGlow:0,rockSign:1});
const near=(a,b,tol=1e-6)=>assert.ok(Math.abs(a-b)<=tol,`${a} near ${b}`);
function advance(q,condition,limit=300){for(let i=0;i<limit;i++){if(condition())return;q.step();}assert.fail('timed out');}
async function stage({pair=false,sight=true,pX=480}={}){
 const q=setup({aimAssist:true,sprite:true,traceClashPaint:true,fieldSeed:31});
 q.cover(false);q.choose('practice');await tick();q.step();q.target(true,pair);
 const s=q.inspect(),v=s.vandul,{p,cones,asteroids}=s;cones.splice(0);asteroids.splice(0);
 fix(v,480,740);fix(p,pX,900);v.nextDriveBy=999;v.nextLaser=999;
 const art=q.sprites.find(x=>x.src==='./vandul-ship.webp');
 Object.assign(art,{complete:true,naturalWidth:272,naturalHeight:272});
 if(sight)q.step(2);
 return {q,v,p,art,rocks:asteroids,other:s.vanduls[1]};
}
const frameArt=(q,art)=>q.spriteFrames.filter(f=>f.asset===art);
test('mutual concealment follows actual motion for 1.5 simulation seconds with no charge, sprite, aim assist, or live HP',async()=>{
 const {q,v,p,art,rocks}=await stage();
 assert.equal(v.seesPlayer,true);assert.equal(q.inspect().autoLock,v);
 const rock=rockAt(480,820);rocks.push(rock);
 v.nextLaser=q.inspect().duelClock+.09;v.drive={phase:'tell',until:999,gate:{x:400,y:830},exit:{x:400,y:960},leg:0};
 q.spriteFrames.length=0;q.strokePaint.length=0;q.step();
 const loss=v.sightLostAt;
 assert.equal(v.seesPlayer,false);assert.equal(v.drive.phase,'recover');assert.equal(v.laserIndex,0);
 assert.equal(q.inspect().autoLock,null);assert.equal(frameArt(q,art).length,0);
 assert.ok(q.strokePaint.some(s=>s.color==='#f4c9f7'),'draw a hollow contact, not the live sprite');
 assert.ok(!q.strokePaint.some(s=>s.color==='#ff9bb7'),'cancel visible attack charge');
 assert.match(q.el['vandul-duel-readout'].textContent,/Vandul out of sight.*Wave 1/);
 assert.doesNotMatch(q.el['vandul-duel-readout'].textContent,/Laser spread|VANDUL 20/);
 fix(v,487,740);fix(p,505,902);q.step(10);
 assert.equal(v.sightLostAt,loss,'continuous obstruction does not restart timer');
 assert.ok(v.lastSeen.x>500&&v.playerContact.x>485,'grace tracks motion in both directions');
 assert.equal(v.blindShot,null);assert.equal(v.searchPath,null);assert.equal(v.laserIndex,0);
 const before=q.inspect().duelClock;q.key('keydown','KeyP');q.step(80);
 assert.equal(q.inspect().duelClock,before);assert.ok(v.playerContact);
 q.choose('resume');
 advance(q,()=>q.inspect().duelClock-loss>=1.48);
 assert.ok(v.playerContact,'contact remains just before cutoff');assert.equal(v.searchPath,null);
 q.step(3);assert.equal(v.playerContact,null);assert.ok(v.searchPrediction,'bounded search now available');
 assert.equal(v.laserIndex,0,'stationary contact does not authorize a prediction shot');
 fix(p,655,900);v.nextLaser=0;
 q.spriteFrames.length=0;q.step();
 assert.equal(v.seesPlayer,true);assert.equal(v.searchPath,null);assert.equal(v.sightLostAt,null);
 assert.equal(q.inspect().autoLock,v);assert.ok(frameArt(q,art).length);
 assert.ok(v.nextLaser-q.inspect().duelClock>=.25);assert.equal(v.laserIndex,0);
 advance(q,()=>v.laserIndex===1,25);
});
test('after grace each search and clear exit shot derives from the same frozen history, not two different hidden paths',async()=>{
 async function begin(){
  const x=await stage(),{q,v,p,rocks}=x,cover=rockAt(480,840,31);
  rocks.push(cover);v.nextLaser=0;q.step();
  const loss=v.sightLostAt;
  advance(q,()=>q.inspect().duelClock-loss>1.35);
  while(q.inspect().duelClock-loss<1.5){
   p.vx=150;
   q.step();
  }
  assert.equal(v.seesPlayer,false);assert.equal(v.playerContact,null);assert.ok(v.searchPrediction);
  assert.ok(Math.hypot(v.searchPrediction.x-v.lastSeen.x,v.searchPrediction.y-v.lastSeen.y)<=80.00001);
  return {...x,cover,loss};
 }
 const a=await begin(),b=await begin();
 const snapshot=x=>[x.v.lastSeen.x,x.v.lastSeen.y,x.v.lastSeen.vx,x.v.lastSeen.vy,x.v.searchPrediction.x,x.v.searchPrediction.y];
 assert.deepEqual(snapshot(a),snapshot(b));
 for(const [x,hiddenX] of [[a,475],[b,490]])fix(x.p,hiddenX,902);
 const firing=[];
 for(const x of [a,b]){
  const {q,v,cover,p}=x;
  q.step();
  assert.ok(v.searchPath&&v.searchPath.blocker===cover,'flank selects the actual intervening obstacle');
  assert.ok(v.blindShot&&v.blindShot.cover===cover,'safe predicted exit wins at most one amber windup');
  assert.notEqual(v.blindShot.target.x,p.x);
  advance(q,()=>q.inspect().vandulLasers.some(b=>b.blindGuess),28);
  const bolt=q.inspect().vandulLasers.find(b=>b.blindGuess);
  assert.equal(v.seesPlayer,false);assert.equal(v.laserIndex,1);
  assert.equal(v.heat,17.5,'a real predictive bolt generates the same heat as a visible shot');
  assert.ok(Math.abs(bolt.aim-Math.atan2(p.y-v.y,p.x-v.x))>.06,'not the current unseen bearing');
  firing.push([bolt.aim,bolt.a,v.searchPrediction.x,v.searchPrediction.y,v.x,v.y]);
  q.step(20);
  const blind=q.inspect().vandulLasers.filter(b=>b.blindGuess);
  assert.equal(blind.length,2);assert.equal(blind[1].second,true);
  assert.ok(Math.abs(blind[1].aim-Math.atan2(p.y-v.y,p.x-v.x))>.06,'second rail also uses the frozen estimate');
 }
 assert.deepEqual(firing[0],firing[1]);
});
test('never-acquired ships do not get grace; other craft, active wreck and thin debris occlude bidirectionally',async()=>{
 const {q,v,p,other}=await stage({pair:true,sight:false});
 fix(other,480,815);other.nextLaser=999;other.nextDriveBy=999;
 q.step(3);
 assert.equal(v.seesPlayer,false);assert.equal(v.lastSeen,null);assert.equal(v.playerContact,null);
 assert.equal(v.searchPrediction,null);assert.equal(other.seesPlayer,true);
 const hud=q.el['vandul-duel-readout'].textContent;
 assert.match(hud,/2\/2 Vandul remaining/);assert.doesNotMatch(hud,/V1 20/);assert.match(hud,/V2 20/);
 fix(other,700,740);fix(v,480,740);fix(p,480,900);
 const hull={x:480,y:820,r:20,vx:0,vy:0,spin:0,angle:0,invMass:.16};
 q.inspect().activeWrecks.push({hull,fragments:[],bodies:[hull]});
 q.step();assert.equal(v.seesPlayer,false);
 q.inspect().activeWrecks.splice(0);
 const thin={x:495.6,y:820,r:16,shape:[[-3,0],[0,3],[3,0],[0,-3]],debris:true,vx:0,vy:0,wallFx:0,hitGlow:0,invMass:.6,angle:0,spin:0};
 q.inspect().sceneryDebris.push(thin);
 fix(v,480,740);q.step();assert.equal(v.seesPlayer,false,'positive-radius, narrow grazing intersection');
 thin.x=496.5;fix(v,480,740);q.step();assert.equal(v.seesPlayer,true,'nearby but not touching ray');
 thin.x=480;thin.y=p.y+28;fix(v,480,740);q.step();assert.equal(v.seesPlayer,true,'finite ray ignores cover beyond the target');
});

test('hot fighter contacts work in either direction through cover, without exposing the full hull or letting lasers through',async()=>{
 const {q,v,p,art,rocks}=await stage();
 const rock=rockAt(480,820,45);rocks.push(rock);
 v.nextLaser=0;
 Object.assign(p,{heat:78.5,coolAt:Infinity});
 Object.assign(v,{heat:88,heatAt:0,heatRest:Infinity,overheated:true});
 q.click('fire-button');
 assert.equal(q.el['flight-heat-eye'].hidden,false);
 assert.match(q.el['flight-heat-alert'].textContent,/track you behind cover/);
 const fireIndex=v.laserIndex;
 q.spriteFrames.length=0;q.strokePaint.length=0;q.step(2);
 assert.equal(v.thermalTracking,true);assert.equal(v.seesPlayer,false);
 assert.equal(v.attackTarget,p);
 assert.equal(v.laserIndex,fireIndex);
 assert.equal(frameArt(q,art).length,0);
 assert.ok(q.strokePaint.some(s=>s.color==='#ffad82'),'draw thermal contact, not the live hull');
 v.overheated=false;q.step(5);
 assert.equal(v.laserIndex,fireIndex,'a ready Vandul still cannot fire through cover');
 fix(p,480,1140);fix(v,480,740);q.step();
 assert.equal(v.thermalTracking,false,'hot contacts are range limited');
 fix(p,480,900);fix(v,480,740);
 p.heat=80;p.coolAt=0;v.heat=0;
 q.step(3);
 assert.equal(q.el['flight-heat-eye'].hidden,true,'eye clears as the player cools');
 assert.equal(v.thermalTracking,false);
});
