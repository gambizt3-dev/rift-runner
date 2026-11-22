'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {setup,tick}=require('./ballistic.test.cjs');
const localBack={search:'',replace(){}};
async function finalShot(opts={},duel=false){
 const q=setup({saved:'ballistic',fieldSeed:971,...opts});
 q.cover(false);q.choose(duel?'start':'practice');await tick();q.step();
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
  pilotCredits:{recordEnemyKill(){return {saved:true,amount:2.5};},awardVictory(){return {saved:false,amount:0,balance:null};}}});
 assert.deepEqual(q.hudNumbers.slice(1,3).map(n=>n.textContent),['10','2.5']);
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

test('only a pre-accepted Duel victory advances the quest; the completion bonus is unchanged',async()=>{
 const key='rift-runner.mission-log.v1',generationKey='rift-runner.character-generation.v1';
 const fit={engine:'stock-thruster',core:'weifer-he3-core',battery:'kestrel-h20-reserve-cell',primary:'ballistic'};
 const fresh=intercept=>new Map([
  [key,JSON.stringify({version:1,generation:'pilot',completedAt:2,intercept})],[generationKey,'pilot'],
  ['rift-runner.hull-owned.v1',JSON.stringify({version:1,hull:'rift-fighter',condition:'repaired'})],
  ['rift-runner.ship-build.v1',JSON.stringify({version:1,hull:'rift-fighter',...fit})]
 ]);
 for(const [duel,accepted,qualifies] of [[false,true,false],[true,false,false],[true,true,true]]){
  const storage=fresh(accepted?{acceptedAt:3}:undefined);let rewards=0;
  const q=await finalShot({buildUI:true,loadPilotMissions:true,sharedStorage:storage,reducedMotion:true,address:localBack,
   pilotCredits:{getBuildState:()=>({origin:'new',owned:Object.values(fit)}),owns:id=>Object.values(fit).includes(id),
    awardVictory(){rewards++;return {saved:true,amount:20};}}},duel);
  assert.equal(!!JSON.parse(storage.get(key)).intercept?.victoryAt,qualifies);
  assert.equal(Boolean(q.el.overlay.innerHTML.includes('Report to the Captain on the Bridge')),qualifies);
  const saved=storage.get(key);q.step(170);
  assert.equal(storage.get(key),saved);assert.equal(rewards,1);
 }
});
