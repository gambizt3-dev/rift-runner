'use strict';
const assert=require('node:assert/strict');
const {setup,tick}=require('./ballistic.test.cjs');

const fire=(q,type,id=3)=>q.pointer(type,id);
const aim=(q,type,x=464,y=360)=>q.pointer(type,16,'aim-pad',x,y);
const count=q=>q.inspect().practiceShots;
const choose=(q,gun)=>q.click('gun-'+gun,{detail:1,pointerType:'touch',pointerId:20});
const toggle=(q,gun)=>{choose(q,gun);q.step(6);choose(q,gun);};
async function start(saved='blaster'){
 const q=setup({saved});
 q.open('start');await tick();q.step(1);
 const {p,cones}=q.inspect();
 Object.assign(p,{x:240,y:360,vx:0,vy:0,aim:0});
 cones.splice(0);
 return q;
}
(async()=>{
 for(const gun of ['blaster','ballistic']){
  const q=await start(gun);
  toggle(q,gun);
  assert.equal(count(q),0,`${gun}: selector toggles mode without firing`);
  assert.match(q.el['gun-'+gun].attrs['aria-label'],/burst/i,'indicator names the active mode');
  // The primary right contact keeps aiming while the second contact presses Fire.
  aim(q,'pointerdown');
  fire(q,'pointerdown');
  assert.equal(count(q),1,`${gun}: first round in burst fires immediately`);
  aim(q,'pointermove',240,160); // remaining projectiles must use the starting angle
  let previous=0;
  const checkpoints=gun==='blaster'?[[3,1],[4,2],[6,2],[7,3],[9,3],[10,4],[12,4],[13,5],[15,5],[16,6]]:
   [[2,1],[3,2],[5,2],[6,3],[8,3],[9,4],[10,4],[11,5],[13,5],[14,6]];
  for(const [frame,total] of checkpoints){
   q.step(frame-previous);previous=frame;
   assert.equal(count(q),total,`${gun}: shot count at ${frame*16} ms`);
  }
  const burst=q.inspect().shots;
  assert.equal(burst.length,6);
  const degrees=burst.map(b=>Math.round(b.a*180/Math.PI*1000)/1000);
  assert.ok(burst.every(b=>b.weapon===gun));
  assert.deepEqual(Array.from(degrees,v=>v||0),gun==='blaster'?[0,-1.25,1.25,-2.5,2.5,0]:[0,-3,3,-6,6,0],`${gun}: defined spread around starting aim`);
  assert.equal(q.inspect().aimPtr?.id,16);
  q.step(40);assert.equal(count(q),6,`${gun}: holding FIRE does not auto-repeat a burst`);
  fire(q,'pointerup');q.click('fire-button',{detail:1,pointerId:99});
  assert.equal(count(q),6,'pointer compatibility click cannot duplicate burst');
  // Tap and release still completes all six. Then a mode toggle restores Normal.
  fire(q,'pointerdown');fire(q,'pointerup');q.step(18);assert.equal(count(q),12);
  q.step(40);toggle(q,gun);
  assert.equal(count(q),12,'toggling burst off does not fire');
  fire(q,'pointerdown');fire(q,'pointerup');q.step(12);
  assert.equal(count(q),13,`${gun}: toggling again restores a single normal tap`);
 }
 for(const gun of ['blaster','ballistic']){
  const q=await start(gun),offsets=[];
  for(let i=0;i<4;i++){
   fire(q,'pointerdown');offsets.push(Math.round(q.inspect().shots.at(-1).a*180/Math.PI*100)/100||0);fire(q,'pointerup');q.step(gun==='blaster'?13:8);
  }
  assert.deepEqual(offsets,gun==='blaster'?[0,0,0,0]:[1.8,-1.8,.99,-.99]);
  assert.equal(q.inspect().fighterLoadout.weapon,gun);
  q.change(gun==='blaster'?'ballistic':'blaster');
  assert.equal(q.inspect().fighterLoadout.engine,'stock-thruster');
 }
 const cooldown=await start();
 toggle(cooldown,'blaster');
 fire(cooldown,'pointerdown');fire(cooldown,'pointerup');cooldown.step(18);
 assert.equal(count(cooldown),6);
 cooldown.step(24); // Still inside the 460ms cooldown measured from the last shot
 fire(cooldown,'pointerdown');assert.equal(count(cooldown),6,'fresh press is blocked during cooldown');
 cooldown.step(20);assert.equal(count(cooldown),6,'already-held blocked press does not fire when cooldown expires');
 fire(cooldown,'pointerup');fire(cooldown,'pointerdown');fire(cooldown,'pointerup');cooldown.step(18);
 assert.equal(count(cooldown),12,'new press starts another burst after cooldown');

 const separate=await start();
 toggle(separate,'blaster');
 choose(separate,'ballistic');
 fire(separate,'pointerdown');separate.step(25);fire(separate,'pointerup');
 assert.equal(count(separate),4,'Ballistic retains its ordinary repeat independently of Blaster Burst');
 separate.step(30);assert.equal(count(separate),4,'ordinary hold stops on release');
 choose(separate,'blaster');
 fire(separate,'pointerdown');fire(separate,'pointerup');separate.step(18);
 assert.equal(count(separate),10,'switching back remembers each gun’s own mode');

 for(const [why,selectors] of [
  ['slow',q=>{choose(q,'blaster');q.step(20);choose(q,'blaster');}],
  ['cross-gun',q=>{choose(q,'blaster');q.step(6);choose(q,'ballistic');q.step(6);choose(q,'blaster');}],
  ['keyboard/assistive',q=>{q.change('blaster');q.change('blaster');}],
 ]){
  const q=await start();selectors(q);
  assert.equal(count(q),0);
  fire(q,'pointerdown');fire(q,'pointerup');q.step(12);
  assert.equal(count(q),1,`${why} selection does not toggle Burst`);
 }
 for(const [why,interruption,after] of [
  ['switch',q=>q.change('ballistic')],
  ['pause',q=>q.key('keydown','KeyP'),q=>q.open('resume')],
  ['blur',q=>q.blur(),q=>q.open('resume')],
  ['hide',q=>q.hide(true),q=>{q.hide(false);q.open('resume');}],
  ['reset',q=>q.reset()],
 ]){
  const q=await start();toggle(q,'blaster');
  fire(q,'pointerdown');assert.equal(count(q),1);
  interruption(q);after?.(q);
  if(why==='switch'){
   fire(q,'pointerdown');fire(q,'pointerup');
   assert.equal(count(q),1,'switch cannot skip a started cooldown');
  }
  q.step(48);
  assert.equal(count(q),why==='reset'?0:1,`${why} cancels pending rounds`);
 }
 // Only active flight consumes recovery. Interruptions must never buy a new volley.
 const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-9,`expected cooldown ${b}, got ${a}`);
 const tap=q=>{fire(q,'pointerdown');fire(q,'pointerup');};
 for(const [why,interrupt,resume] of [
  ['pause',q=>q.key('keydown','KeyP'),q=>q.open('resume')],
  ['blur',q=>q.blur(),q=>q.open('resume')],
  ['visibility',q=>q.hide(true),q=>{q.hide(false);q.open('resume');}],
  ['pagehide',q=>q.pageHide(),q=>{q.pageShow();q.open('resume');}],
  ['Hangar',q=>q.click('open-hangar'),q=>q.click('close-hangar')],
 ]){
  for(const phase of ['earned','in-flight']){
   const q=await start();toggle(q,'blaster');tap(q);
   if(phase==='earned')q.step(21);
   const {practiceShots:before,fireBurst,burstCooldown}=q.inspect();
   const remaining=phase==='earned'?burstCooldown:fireBurst.profile.recovery;
   assert.ok(remaining>0&&remaining<=.46);
   interrupt(q);assert.equal(q.inspect().state,'pause',why);
   assert.equal(q.inspect().fireBurst,null,why);near(q.inspect().burstCooldown,remaining);
   q.step(120);near(q.inspect().burstCooldown,remaining);assert.equal(count(q),before);
   resume(q);assert.equal(q.inspect().state,'play',why);
   tap(q);assert.equal(count(q),before,`${why} ${phase}: fresh press still blocked`);
   q.step(40);assert.equal(count(q),before,`${why} ${phase}: no canceled/queued rounds`);
   near(q.inspect().burstCooldown,0);
   tap(q);assert.equal(count(q),before+1,`${why} ${phase}: resumes after active recovery`);
  }
 }
 // Real Capital approach/capture; this is a relaunch, not a fresh field.
 const docked=setup({saved:'blaster',address:{search:'?launch=capital-test',replace(){}}});docked.step();docked.click('capital-dock-action');
 const carrier=docked.inspect().capitalShip;for(let i=0;carrier.phase!=='flight'&&i<180;i++)docked.step();assert.equal(carrier.phase,'flight');
 toggle(docked,'blaster');tap(docked);
 const {capitalShip:c,p,capitalBerth:b,berthWorld,berthVelocity,fireBurst:volley}=docked.inspect();
 assert.equal(count(docked),1);
 docked.click('capital-dock-action');
 const velocity=berthVelocity(0,b.approach);
 Object.assign(p,berthWorld(c,0,b.approach),{vx:velocity.x,vy:velocity.y,aim:c.aim,aimTarget:c.aim});
 assert.equal(docked.inspect().capitalDockCheck().ready,true);
 docked.click('capital-dock-action');assert.equal(c.phase,'docking');near(docked.inspect().burstCooldown,volley.profile.recovery);
 const awaitPhase=phase=>{for(let i=0;c.phase!==phase&&i<400;i++)docked.step();assert.equal(c.phase,phase);};
 docked.step(10);
 assert.ok(docked.inspect().burstCooldown>0&&docked.inspect().burstCooldown<volley.profile.recovery,'elapsed flight time advances recovery during docking without waiving it');
 tap(docked);assert.equal(count(docked),1,'no firing or queued rounds during capture');
 awaitPhase('docked');docked.step(120);near(docked.inspect().burstCooldown,0);
 tap(docked);assert.equal(count(docked),1,'a parked fighter cannot fire after recovery');
 docked.click('capital-dock-action');awaitPhase('flight');near(docked.inspect().burstCooldown,0);
 tap(docked);assert.equal(count(docked),2,'an explicit press fires after enough recovery time has elapsed');
 docked.reset();near(docked.inspect().burstCooldown,0);assert.equal(docked.inspect().fireBurst,null);
 assert.equal(docked.inspect().capitalShip.phase,'docked');
 docked.click('capital-dock-action');
 for(let i=0;docked.inspect().capitalShip.phase!=='flight'&&i<180;i++)docked.step();
 assert.equal(docked.inspect().capitalShip.phase,'flight');
 tap(docked);assert.equal(count(docked),1,'new sortie may fire as soon as cleared for flight');

 console.log('PASS selector double-tap for both guns, independent modes and live aim, staggered spread, cooldown/fresh press and lifecycle cancellation.');
})().catch(e=>{console.error(e);process.exitCode=1;});
