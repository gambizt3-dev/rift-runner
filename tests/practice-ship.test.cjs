'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {setup,tick}=require('./ballistic.test.cjs');
const almost=(n,v)=>assert.ok(Math.abs(n-v)<1e-8,n+' != '+v);
async function spawn({weapon='ballistic',empty=true}={}){
 const q=setup({saved:weapon});q.open('start');await tick();q.step();
 if(empty)q.inspect().cones.splice(0);
 return q;
}
function hit(q,weapon='ballistic'){
 const {practiceShip:s,shots}=q.inspect();
 shots.push({x:s.x,y:s.y,vx:570,vy:0,a:0,weapon,damage:5});
 q.step();
}
function pulse(q,time,expected){
 const bolts=q.inspect().practiceRounds.filter(b=>Math.abs(b.pulseAt-time)<1e-8);
 assert.equal(bolts.length,3,'one visible 3-bolt fan at '+time);
 const angles=bolts.map(b=>(b.angle+Math.PI/2)*180/Math.PI).sort((a,b)=>a-b);
 almost(angles[0],-expected);almost(angles[1],0);almost(angles[2],expected);
 assert.equal(bolts.filter(b=>b.outer).length,1);
}
test('default cones-only; practice on default aim line, optional and harmless',async()=>{
 const q=await spawn({empty:false});
 assert.equal(q.el['practice-ship-on'].checked,false);
 assert.equal(q.el['practice-ship-readout'].hidden,true);
 assert.equal(q.inspect().practiceShip,null);q.step(40);
 assert.equal(q.inspect().cones.length,8);
 assert.equal(q.inspect().practiceRounds.length,0);
 q.target(true);
 const ship=q.inspect().practiceShip,p=q.inspect().p;
 assert.equal(ship.x,p.x);assert.ok(ship.y<p.y);almost(p.aim,-Math.PI/2);
 assert.equal(q.el['practice-ship-readout'].textContent,'PRACTICE SHIP · Bonus spread +0°');
 q.click('fire-button');q.step(15);
 assert.equal(q.inspect().practiceHits,1,'actual default shot reaches dummy before cones');
 assert.equal(ship.bonus,1);assert.ok(ship.vy<0);assert.ok(ship.y<445);
 assert.equal(q.el['practice-ship-readout'].textContent,'PRACTICE SHIP · Bonus spread +1°');
 q.target(false);
 assert.equal(q.inspect().practiceShip,null);assert.equal(q.inspect().practiceRounds.length,0);
 assert.equal(q.el['practice-ship-readout'].hidden,true);assert.equal(q.inspect().cones.length,8);

 const inert=await spawn();inert.target(true);
 Object.assign(inert.inspect().p,{x:240,y:350,vx:0,vy:0});
 inert.step(46);
 assert.equal(inert.inspect().p.hp,20);assert.equal(inert.inspect().practiceHits,0);assert.equal(inert.inspect().practiceShots,0);
 assert.ok(inert.inspect().practiceRounds.some(b=>b.y<350),'practice projectiles pass through the player without harm');
});
test('per-projectile ballistic stacks expire independently; outgoing headings follow them',async()=>{
 const q=await spawn();q.target(true);
 hit(q);q.step(9);hit(q,'ak77');q.step(9);hit(q);
 assert.equal(q.inspect().practiceShip.bonus,3);
 assert.equal(q.inspect().p.hp,20);
 const s=q.inspect().practiceShip;
 assert.equal(s.stacks.length,3);
 for(const stack of s.stacks)almost(stack.expiresAt-stack.hitAt,.5);
 q.step(9);pulse(q,.12,5);pulse(q,.24,6);pulse(q,.36,7);pulse(q,.48,7);
 const first=q.inspect().practiceRounds.find(b=>Math.abs(b.pulseAt-.36)<1e-8);
 const second=q.inspect().practiceRounds.find(b=>Math.abs(b.pulseAt-.48)<1e-8);
 assert.ok(first.angle> -Math.PI/2&&second.angle< -Math.PI/2,'outer order alternates');
 q.step(8);assert.equal(s.bonus,2);pulse(q,.60,6);
 q.step(8);assert.equal(s.bonus,1);pulse(q,.72,5);
 q.step(7);assert.equal(s.bonus,0);pulse(q,.84,4);
 assert.equal(q.el['practice-ship-readout'].textContent,'PRACTICE SHIP · Bonus spread +0°');
});
test('weapon force, not owner recoil, governs target displacement; laser does not stack',async()=>{
 const forces={};
 for(const weapon of ['blaster','ballistic','ak77']){
  const q=await spawn();q.target(true);
  const s=q.inspect().practiceShip;
  hit(q,weapon);forces[weapon]=s.vx;
  assert.equal(s.bonus,weapon==='blaster'?0:1);
  assert.ok(s.hitGlow>0);assert.equal(s.rockSign,-1);
  q.step(4);assert.ok(s.x>240);
 }
 assert.ok(forces.ballistic>forces.blaster&&forces.blaster>forces.ak77);
});
test('swept impact chooses earliest of target or cone without hitting both',async()=>{
 for(const first of ['cone','ship']){
  const q=await spawn();q.target(true);
  const s=q.inspect().practiceShip;
  const c={id:9,x:first==='cone'?205:285,y:445,r:15,vx:0,vy:0,angle:0,spin:0,hitGlow:0,wallFx:0,invMass:1};
  q.inspect().cones.push(c);
  q.inspect().shots.push({x:150,y:445,vx:26000,vy:0,a:0,weapon:'ballistic',damage:5});
  q.step();
  assert.equal(q.inspect().practiceHits,1);
  assert.equal(s.bonus,first==='ship'?1:0);
  assert.equal(c.vx>0,first==='cone');
 }
});
test('pause freezes sample clock and stack duration; reset and disabling clear all practice evidence',async()=>{
 const q=await spawn();q.target(true);hit(q);q.step(10);
 const prior=q.inspect(),frozen=prior.practiceShip.stacks[0].expiresAt;
 q.key('keydown','KeyP');q.step(80);
 assert.equal(q.inspect().practiceClock,prior.practiceClock);
 assert.equal(q.inspect().practiceShip.stacks[0].expiresAt,frozen);
 assert.deepEqual(q.inspect().practiceRounds,prior.practiceRounds);
 q.open('resume');q.step(6);assert.equal(q.inspect().practiceShip.bonus,1);
 q.reset();
 assert.equal(q.inspect().practiceShip.x,240);assert.equal(q.inspect().practiceShip.y,445);
 assert.equal(q.inspect().practiceShip.bonus,0);assert.equal(q.inspect().practiceRounds.length,0);
 q.hide(true);q.step(70);assert.equal(q.inspect().practiceClock,0);
 q.hide(false);q.open('resume');q.step(10);assert.ok(q.inspect().practiceRounds.length>0);
 q.target(false);q.step(30);assert.equal(q.inspect().practiceClock,0);
 assert.equal(q.inspect().practiceRounds.length,0);assert.equal(q.inspect().practiceShip,null);
 q.target(true);assert.equal(q.inspect().practiceShip.bonus,0);
});
