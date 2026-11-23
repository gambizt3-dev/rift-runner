'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {setup,tick}=require('./ballistic.test.cjs');
async function stage(options={}){
 const q=setup(options);q.cover(false);q.choose('practice');await tick();q.step();
 q.target(true);const {p,vandul,cones}=q.inspect();
 cones.splice(0);Object.assign(p,{x:480,y:900,vx:0,vy:0});
 Object.assign(vandul,{x:480,y:740,vx:0,vy:0,aim:Math.PI/2,nextLaser:0,nextDriveBy:999});
 return q;
}
function until(q,predicate,limit=120){
 for(let i=0;i<limit&&!predicate();i++)q.step();
 assert.ok(predicate(),'expected game state was reached');
}
test('Twinbeam fires exactly two distinct real pulses per burst and cools down before a fresh pair',async()=>{
 const q=await stage(),{p,vandul:v,vandulProfile:{laser}}=q.inspect();
 until(q,()=>v.laserIndex===1);
 const first=q.inspect().vandulLasers[0];
 assert.equal(first.owner,v);assert.equal(first.twinbeam,true);assert.equal(first.second,false);
 assert.equal(first.damage,2);assert.ok(v.laserBurst);assert.equal(v.heat,17.5);
 q.key('keydown','KeyP');q.step(30);assert.equal(v.laserIndex,1);
 q.choose('resume');q.hide(true);q.step(30);assert.equal(v.laserIndex,1);
 q.hide(false);q.choose('resume');
 until(q,()=>v.laserIndex===2);
 const second=q.inspect().vandulLasers.find(b=>b.second);
 assert.ok(Math.abs(second.firedAt-first.firedAt-laser.burstGap)<.01);
 assert.equal(second.owner,v);assert.equal(second.damage,2);assert.equal(second.kind,'energy');
 assert.equal(v.laserBurst,null);assert.ok(v.nextLaser>=second.firedAt+laser.recovery-1e-8);
 until(q,()=>q.inspect().duelClock>=second.firedAt+.75);
 assert.equal(p.hp,16,'both beams actually resolve as 2 damage hits');
 assert.equal(v.laserIndex,2,'no third beam before the recovery period');
 until(q,()=>v.laserIndex>=3);
 const third=q.inspect().vandulLasers.find(b=>b.firedAt>second.firedAt);
 assert.ok(third.firedAt-second.firedAt>=laser.recovery-1e-8);assert.equal(third.second,false);
});
test('new cover blocks the existing beam and cancels the pending rail without a catch-up shot',async()=>{
 const q=await stage(),{p,vandul:v,cones,vandulProfile:{laser}}=q.inspect();
 until(q,()=>v.laserIndex===1);
 cones.push({id:1,x:480,y:820,r:22,vx:0,vy:0,angle:0,spin:0,hitGlow:0,wallFx:0,invMass:1});
 q.step(25);
 assert.equal(v.seesTarget,false);assert.equal(v.laserIndex,1);
 assert.equal(q.inspect().vandulLasers.length,0);assert.equal(p.hp,20);
 assert.equal(v.laserBurst,null);
 cones.length=0;const untilAt=v.nextLaser;
 while(q.inspect().duelClock<untilAt-.03)q.step();
 assert.equal(v.laserIndex,1,'uncovering the target does not refund recovery');
 until(q,()=>v.laserIndex===2);
 assert.equal(q.inspect().vandulLasers.at(-1).second,false,'next shot starts a new pair');
});
test('already-hot Vandul will not start a clean pair it cannot fire, and muted audio stays silent',async()=>{
 const q=await stage(),v=q.inspect().vandul;
 q.mute();Object.assign(v,{heat:97,heatAt:q.inspect().duelClock,heatRest:0});
 q.step(10);assert.equal(v.laserIndex,0);assert.equal(v.laserBurst,null);
 until(q,()=>v.laserIndex===1);until(q,()=>v.laserIndex===2);
 assert.equal(q.fallbackNotes.some(n=>n.frequency.sets[0]?.[0]===385),false);
});
test('actual discharge has the existing electronic sweep and a short unique alien overtone',async()=>{
 const q=await stage(),v=q.inspect().vandul;
 until(q,()=>v.laserIndex===1);
 const notes=q.fallbackNotes.map(n=>n.frequency.sets[0]?.[0]);
 assert.ok(notes.includes(940));assert.ok(notes.includes(620));assert.ok(notes.includes(385));
 const text=fs.readFileSync(path.join(__dirname,'../dist/game.js'),'utf8');
 assert.match(text,/if\(bolt\.twinbeam\)\{[\s\S]{0,400}?,4,78\)[\s\S]{0,250}?#b84bf5bb/);
});
