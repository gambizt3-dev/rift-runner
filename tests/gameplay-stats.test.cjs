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
  assert.equal(q.el['fit-weight-stat'].textContent,' · Weight '+weight);
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
