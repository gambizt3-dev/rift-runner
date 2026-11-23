'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {setup,tick}=require('./ballistic.test.cjs');
const fit=(primary,secondary)=>JSON.stringify({version:1,primary,secondary});
const tol=(a,b)=>assert.ok(Math.abs(a-b)<1e-9,`${a} != ${b}`);
async function arena(options){
 const q=setup(options);q.open('start');await tick();q.step();q.inspect().cones.splice(0);return q;
}
test('module weight changes acceleration and collision while engine rating alone governs sustained speed',async()=>{
 const stock=await arena(),light=await arena({savedFit:fit('blaster',null)}),mid=await arena({savedFit:fit('ballistic',null)});
 for(const [q,weight] of [[stock,100],[light,93],[mid,95]]){
  const p=q.inspect().p;
  assert.equal(p.weight,weight);assert.equal(p.maxHp,20);assert.equal(p.speed,222);
  assert.equal(q.el['fit-weight-stat'].textContent,' · Total weight '+weight);
  assert.equal(q.hudNumbers[4].textContent,'20/20');
  tol(p.invMass,.32*100/weight);tol(p.acceleration,1750*100/weight);
  Object.assign(p,{x:100,y:500});q.key('keydown','KeyD');q.step();
  tol(p.vx,1750*100/weight*.016);
  q.step(20);assert.equal(p.vx,222);
  q.key('keyup','KeyD');
 }
 const imparted=[];
 for(const q of [stock,light]){
  const p=q.inspect().p;
  Object.assign(p,{x:100,y:420,vx:165,vy:0});
  const c={x:135,y:420,r:15,vx:0,vy:0,angle:0,spin:0,hitGlow:0,wallFx:0,invMass:1};
  q.inspect().cones.push(c);q.step(4);imparted.push(c.vx);assert.equal(p.hp,20,'hard cone bump is not hull damage');
 }
 assert.ok(imparted[0]>imparted[1]&&imparted[1]>100,'higher craft mass imparts more momentum');
 stock.click('open-hangar');stock.fit('primary','ballistic');
 assert.equal(stock.inspect().p.weight,100,'slot swap leaves identical total weight');
 stock.fit('secondary','');
 assert.equal(stock.inspect().p.weight,95,'live fit updates during Hangar without a reset');
 assert.equal(stock.inspect().p.hp,20);
 stock.click('close-hangar');stock.reset();assert.equal(stock.inspect().p.weight,95);
 const engine=stock.inspect().engineProfiles['stock-thruster'];engine.speedRating=8;
 stock.reset();stock.inspect().cones.splice(0);stock.key('keydown','KeyD');stock.step(20);
 tol(stock.inspect().p.vx,177.6,'fixture-only engine rating changes actual top thrust speed');
 assert.equal(stock.inspect().p.weight,95);assert.equal(stock.inspect().p.hp,20);
});
test('only hard near-head-on wall crashes damage hull, once per collision, and touch/keyboard can recover',async()=>{
 const q=await arena(),p=q.inspect().p;
 function collision(vx,vy){
  Object.assign(p,{x:930.5,y:390,vx,vy});
  q.step(2);
  assert.equal(p.x,931);assert.equal(p.vx,0);
 }
 collision(70,0);assert.equal(p.hp,20,'soft nudge is safe');
 collision(230,110);assert.equal(p.hp,20,'high normal speed but glancing contact is safe');
 collision(170,0);assert.equal(p.hp,20,'below the hard-impact speed is safe');
 Object.assign(p,{wallFx:.9});collision(222,0);
 assert.equal(p.hp,16,'damage is independent from visual-effect cooldown');
 assert.equal(q.hudNumbers[4].textContent,'16/20');
 q.key('keydown','KeyD');q.step(45);q.key('keyup','KeyD');
 assert.equal(p.hp,16,'held throttle against the wall does not repeatedly drain HP');
 for(const expected of [12,8,4,0]){
  collision(222,0);assert.equal(p.hp,expected);
  if(expected>0)q.step(23);
 }
 assert.equal(q.inspect().state,'disabled');
 assert.equal(q.hudNumbers[4].textContent,'0/20');
 assert.equal(q.el.hud.dataset.hull,'critical');
 assert.match(q.el.overlay.innerHTML,/Hull disabled.*Reset the field.*data-rift="reset"/);
 assert.equal(q.el.overlay.hidden,false);
 q.pointer('pointerdown');q.pointer('pointerup');q.key('keydown','KeyA');q.step(20);
 assert.equal(q.inspect().practiceShots,0);assert.equal(p.x,931);assert.equal(p.hp,0);
 q.open('reset','touch');
 assert.equal(q.inspect().state,'play');assert.equal(q.inspect().p.hp,20);assert.equal(q.hudNumbers[4].textContent,'20/20');
 const second=q.inspect().p;
 Object.assign(second,{x:930.5,y:390,vx:222,vy:0,hp:1});q.step(2);
 assert.equal(second.hp,0,'clamped despite collision damage exceeding remaining HP');
 q.open('reset',''); // Native button keyboard activation dispatches click without a pointer type.
 assert.equal(q.inspect().state,'play');assert.equal(q.inspect().p.hp,20);assert.equal(q.el.overlay.hidden,true);
 q.key('keydown','KeyA');q.step(4);assert.ok(q.inspect().p.vx<0,'controls recover after Reset');
});

test('flight telemetry displays current vector speed rather than a five-unit bucket or the engine cap',async()=>{
 const q=await arena({saved:'ballistic'}),{p}=q.inspect(),speed=()=>Number(q.hudNumbers[0].textContent);
 assert.equal(speed(),0);
 Object.assign(p,{x:210,y:560,vx:4,vy:4.5,aim:-Math.PI/2});
 q.step();
 assert.equal(speed(),6,'two signed (x,y) components give a nearest-unit norm, not a five-unit bucket');
 assert.equal(speed(),Math.round(Math.hypot(p.vx,p.vy)));
 Object.assign(p,{vx:0,vy:0});
 q.click('fire-button');
 assert.equal(speed(),34,'recoil updates telemetry immediately');
 let former=speed();
 for(let i=0;i<5;i++){q.step(9);assert.equal(speed(),Math.round(Math.hypot(p.vx,p.vy)));assert.ok(speed()<former);former=speed();}
 q.key('keydown','KeyD');q.key('keydown','KeyW');q.step(70);
 assert.ok(p.vx>0&&p.vy<0);
 assert.equal(speed(),222,'diagonal input reports the normalized engine speed, not axes added together');
});
test('Flight mass follows the physics mass immediately when the fit changes, with accessible units',async()=>{
 const q=await arena();
 assert.equal(q.hudNumbers[5].textContent,'100');
 assert.match(q.el.hud.innerHTML,/speed-stat" title="Actual speed in arena units per second"[^]*aria-hidden="true">u\/s[^]*sr-only"> arena units per second/);
 assert.match(q.el.hud.innerHTML,/mass-stat" title="Flight mass in game units"[^]*aria-hidden="true">u[^]*sr-only"> game units/);
 q.click('open-hangar');
 q.fit('secondary','');
 assert.equal(q.inspect().p.weight,93);
 assert.equal(q.hudNumbers[5].textContent,'93','HUD refreshed for the new fit before the next simulation frame');
 q.fit('secondary','ak77');
 assert.equal(q.inspect().p.weight,102);
 assert.equal(q.hudNumbers[5].textContent,'102');
 q.click('close-hangar');q.reset();
 assert.equal(q.hudNumbers[5].textContent,'102');
 assert.equal(q.hudNumbers[0].textContent,'0');
});
