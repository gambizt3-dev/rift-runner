'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {setup,tick}=require('./ballistic.test.cjs');
const localBack={search:'',replace(){}};
async function finalShot(opts={}){
 const q=setup({saved:'ballistic',fieldSeed:971,...opts});
 q.cover(false);q.choose('practice');await tick();q.step();
 q.target(true);q.armFinalForTest();
 const {p,vandul,cones,shots}=q.inspect();
 cones.splice(0);
 Object.assign(vandul,{x:426,y:755,vx:0,vy:0,hp:5,nextLaser:1e4,nextDriveBy:1e4});
 Object.assign(p,{x:426,y:835,aim:-Math.PI/2,vx:0,vy:0});
 q.click('fire-button');
 // Another projectile that would remain flying after the hit in ordinary play.
 shots.push({x:700,y:740,vx:-80,vy:0,a:Math.PI,weapon:'ballistic',damage:5});
 for(let i=0;i<18&&!q.inspect().missionDeparture;i++)q.step();
 assert.equal(q.inspect().state,'depart');
 return q;
}
test('hidden and pagehide freeze departure; Reduced Motion preserves the readable hold and skips flight',async()=>{
 const visits=[],q=await finalShot({reducedMotion:true,address:{search:'',replace:url=>visits.push(url)}});
 const dep=q.inspect().missionDeparture,p=q.inspect().p,origin=[p.x,p.y,p.aim];
 assert.match(q.el.overlay.innerHTML,/Mission Complete/);
 assert.doesNotMatch(q.el.overlay.innerHTML,/credits/,'no claim if API unavailable');
 q.step(62);assert.ok(dep.elapsed>.9&&dep.elapsed<1.2);
 q.hide(true);const frozen=dep.elapsed;q.step(300);assert.equal(dep.elapsed,frozen);
 q.pageHide();q.hide(false);q.step(200);assert.equal(dep.elapsed,frozen);assert.equal(dep.flying,false);
 q.pageShow();q.step();assert.equal(dep.elapsed,frozen,'no catch-up from or into background');
 q.step(25);assert.deepEqual(visits,['./carrier.html']);assert.equal(dep.flying,false);assert.equal(dep.done,true);
 assert.deepEqual([dep.craft.x,dep.craft.y,dep.craft.aim],origin);
 q.pageShow();q.step(200);assert.deepEqual(visits,['./carrier.html'],'one navigation even when restoring cached document');
});
test('manual exit during the cinematic does not repeat the saved reward or schedule another visit',async()=>{
 let earned=0;const visits=[];
 const q=await finalShot({address:{search:'',replace:url=>visits.push(url)},
  pilotCredits:{awardVictory(){earned++;return {saved:true,amount:20,balance:20};}}});
 const dep=q.inspect().missionDeparture;assert.match(q.el.overlay.innerHTML,/\+20 credits/);
 q.step(84);assert.equal(dep.flying,true);assert.equal(q.el.overlay.hidden,true);
 const stopY=dep.craft.y;
 q.hide(true);q.step(300);assert.equal(dep.craft.y,stopY);
 q.hide(false);q.step();assert.equal(dep.craft.y,stopY);
 q.click('return-main-menu');
 assert.equal(q.inspect().state,'menu');assert.equal(q.inspect().missionDeparture,null);
 q.step(400);assert.deepEqual(visits,['./carrier.html']);assert.equal(earned,1);
});
test('failed credit or navigation never blocks the banner or its native Carrier fallback',async()=>{
 let attempts=0;
 const q=await finalShot({reducedMotion:true,address:{search:'',replace(){attempts++;throw Error('no navigation');}},
  pilotCredits:{awardVictory(){return {saved:false,amount:0,balance:null};}}});
 q.step(170);
 assert.equal(q.inspect().state,'complete');assert.equal(attempts,1);assert.equal(q.el.overlay.hidden,false);
 assert.match(q.el.overlay.innerHTML,/Mission Complete/);assert.doesNotMatch(q.el.overlay.innerHTML,/credits/);
 assert.match(q.el.overlay.innerHTML,/<a class="rift-action" href="\.\/carrier\.html">Back to Carrier<\/a>/);
 const wreck=q.inspect().wreckage;q.step(400);assert.equal(attempts,1);assert.equal(q.inspect().wreckage,wreck);
 assert.equal(q.inspect().vandulIngress,null);
});
test('practice and losing a final-wave duel do not start the exit or award credits',async()=>{
 let writes=0;
 const q=setup({address:localBack,pilotCredits:{awardVictory(){writes++;return {saved:true,amount:20,balance:20};}}});
 q.choose('practice');await tick();q.step(500);
 assert.equal(q.inspect().state,'play');assert.equal(q.inspect().missionDeparture,null);assert.equal(writes,0);
 q.target(true);q.armFinalForTest();
 Object.assign(q.inspect().p,{x:930,y:630,vx:255,vy:0,hp:1});q.step(3);
 assert.equal(q.inspect().duelResult,'lost');assert.equal(q.inspect().state,'disabled');
 assert.equal(q.inspect().missionDeparture,null);assert.equal(writes,0);
});
