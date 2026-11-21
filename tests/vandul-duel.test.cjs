'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {setup,tick,arrive}=require('./ballistic.test.cjs');
const almost=(n,v)=>assert.ok(Math.abs(n-v)<1e-8,n+' != '+v);
async function spawn({weapon='ballistic',empty=true,sprite=false}={}){
 const q=setup({saved:weapon,sprite});q.cover(false);q.open('start');await tick();q.step();
 if(empty)q.inspect().cones.splice(0);
 return q;
}
function immediateHit(q,weapon='ballistic',damage=5){
 const {vandul:e,shots}=q.inspect();
 shots.push({x:e.x,y:e.y,vx:570,vy:0,a:0,weapon,damage});
 q.step();
}
const hp=q=>q.inspect().p.hp;
const read=q=>q.el['vandul-duel-readout'];
test('lone practice unaffected; Vandul moves, aims, telegraphs and fires after grace',async()=>{
 const q=await spawn({empty:false,sprite:true});
 assert.equal(q.el['vandul-duel-on'],undefined);assert.equal(read(q).hidden,true);assert.equal(q.inspect().vandul,null);
 assert.equal(q.sprites.length,1,'no enemy sprite request while off');
 q.step(80);assert.equal(q.inspect().cones.length,8);assert.deepEqual(Array.from(q.inspect().vandulLasers),[]);
 q.target(true);
 const e=q.inspect().vandul,p=q.inspect().p;
 assert.equal(e.x,p.x);assert.ok(e.y<p.y);almost(p.aim,-Math.PI/2);
 assert.equal(q.sprites[1].src,'./vandul-ship.webp');
 assert.match(read(q).textContent,/VANDUL 20\/20 HP.*Your hull 20\/20.*spread \+0°/);
 Object.assign(q.sprites[1],{complete:true,naturalWidth:272,naturalHeight:272});
 q.click('fire-button');q.step(15);
 assert.equal(q.inspect().practiceHits,1,'fire from initial reticle hits opposing hull');
 assert.equal(e.hp,15);assert.equal(e.bonus,1);assert.ok(e.vy<0);assert.ok(e.y<445);
 assert.equal(e.rockSign,-1);
 assert.ok(Math.abs(q.spriteFrames.filter(r=>r.asset===q.sprites[1]).at(-1).rotation-e.aim-Math.PI/2)>.02,'visible rocking on hit');
 q.step(43);assert.equal(e.laserIndex,0);assert.equal(q.inspect().vandulLasers.length,0);
 assert.ok(q.spriteFrames.some(r=>r.asset===q.sprites[1]),'custom sprite draws in arena when ready');
 assert.ok(q.dashPatterns.some(dash=>dash[0]===5&&dash[1]===4),'forward aim telegraph drawn before firing');
 q.step(3);assert.equal(e.laserIndex,1);
 const bolt=q.inspect().vandulLasers[0];
 assert.ok(bolt);assert.equal(bolt.damage,2);
 assert.ok(Math.abs(bolt.aim-Math.atan2(p.y-e.y,p.x-e.x))<.012,'aim tracks player at fire, not next-frame location');
 assert.ok(hp(q)>=18);
 q.target(false);
 assert.equal(q.inspect().vandul,null);assert.equal(q.inspect().vandulLasers.length,0);
 assert.equal(read(q).hidden,true);assert.equal(q.inspect().cones.length,8);
});
test('staggered ballistic stacks alter actual fired laser angle and expire independently',async()=>{
 const q=await spawn();q.target(true);
 const e=q.inspect().vandul;e.nextLaser=.4;
 immediateHit(q);q.step(9);immediateHit(q,'ak77',2);q.step(9);immediateHit(q);
 assert.equal(e.bonus,3);
 for(const stack of e.stacks)almost(stack.expiresAt-stack.hitAt,.5);
 q.step(6);
 const bolt=q.inspect().vandulLasers[0];assert.equal(bolt.bonus,3);
 almost((bolt.a-bolt.aim)*180/Math.PI,4.5);
 assert.match(read(q).textContent,/Laser spread \+3°.*Last shot \+3°/);
 q.step(9);assert.equal(e.bonus,2);
 q.step(8);assert.equal(e.bonus,1);
 q.step(8);assert.equal(e.bonus,0);
 assert.match(read(q).textContent,/Laser spread \+0°.*Last shot \+3°/);
 q.step(7);const later=q.inspect().vandulLasers.find(b=>b!==bolt);
 assert.ok(later);assert.equal(later.bonus,0);almost((later.a-later.aim)*180/Math.PI,-1.5);
});
test('weapon push and damage apply, laser does not narrow or add a spread stack',async()=>{
 const forces={};
 for(const [weapon,damage] of [['blaster',3],['ballistic',5],['ak77',2]]){
  const q=await spawn();q.target(true);const e=q.inspect().vandul;
  immediateHit(q,weapon,damage);forces[weapon]=e.vx;
  assert.equal(e.hp,20-damage);assert.equal(e.bonus,weapon==='blaster'?0:1);
  assert.ok(e.hitGlow>0);assert.equal(e.rockSign,-1);
 }
 assert.ok(forces.ballistic>forces.blaster&&forces.blaster>forces.ak77);
});
test('real hostile laser scores hull damage, earliest cone can block',async()=>{
 const q=await spawn();q.target(true);q.step(106);
 assert.ok(hp(q)<20,'unblocked natural enemy fire reaches stationary player');
 for(const blocked of [false,true]){
  const probe=await spawn();probe.target(true);const d=probe.inspect(),p=d.p;
  if(blocked)d.cones.push({id:9,x:p.x,y:p.y-52,r:15,vx:0,vy:0,angle:0,spin:0,hitGlow:0,wallFx:0,invMass:1});
  d.vandulLasers.push({x:p.x,y:p.y-90,vx:0,vy:26000,a:Math.PI/2,life:1,damage:2});
  probe.step();
  assert.equal(hp(probe),blocked?20:18);
  assert.equal(probe.inspect().vandulLasers.length,0);
  if(blocked)assert.ok(d.cones[0].hitGlow>0);
 }
});
test('earliest moving target or cone takes player shot, not both',async()=>{
 for(const first of ['cone','vandul']){
  const q=await spawn();q.target(true);const e=q.inspect().vandul;
  const c={id:9,x:first==='cone'?205:285,y:445,r:15,vx:0,vy:0,angle:0,spin:0,hitGlow:0,wallFx:0,invMass:1};
  q.inspect().cones.push(c);
  q.inspect().shots.push({x:150,y:445,vx:26000,vy:0,a:0,weapon:'ballistic',damage:5});
  q.step();
  assert.equal(q.inspect().practiceHits,1);assert.equal(e.hp,first==='vandul'?15:20);
  assert.equal(c.vx>0,first==='cone');
 }
});
test('both zero-hull outcomes are clear and reset provides a clean rematch',async()=>{
 const q=await spawn();q.target(true);
 const s=q.inspect();
 s.vandulLasers.push({x:s.p.x,y:s.p.y-60,vx:0,vy:1000,a:Math.PI/2,life:1,damage:2});
 for(let i=0;i<4;i++)immediateHit(q);
 assert.equal(q.inspect().duelResult,'won');assert.equal(q.inspect().vandul.hp,0);
 assert.match(read(q).textContent,/You win/);assert.equal(q.inspect().vandulLasers.length,0);
 const hull=hp(q);q.step(100);assert.equal(hp(q),hull);assert.equal(q.inspect().vandul.laserIndex,0);
 q.reset();assert.equal(q.inspect().vandul,null);arrive(q);
 assert.equal(q.inspect().duelResult,null);assert.equal(q.inspect().vandul.hp,20);assert.equal(q.inspect().vandul.y,84);
 const p=q.inspect().p;p.hp=2;
 q.inspect().vandulLasers.push({x:p.x,y:p.y-30,vx:0,vy:26000,a:Math.PI/2,life:1,damage:2});
 q.step();
 assert.equal(q.inspect().duelResult,'lost');assert.equal(q.inspect().state,'disabled');assert.equal(hp(q),0);
 assert.equal(q.inspect().vandulLasers.length,0);assert.match(q.el.overlay.innerHTML,/Vandul wins/);
 q.open('reset');assert.equal(q.inspect().state,'play');assert.equal(hp(q),20);assert.equal(q.inspect().vandul,null);arrive(q);assert.equal(q.inspect().vandul.hp,20);
});
test('pause, background and off do not leave runaway attacks; rematch resets aim and spread',async()=>{
 const q=await spawn();q.target(true);const e=q.inspect().vandul;immediateHit(q);q.step(10);
 const before=q.inspect().duelClock,expires=e.stacks[0].expiresAt,beforeAim=e.aim;
 q.key('keydown','KeyP');q.step(100);
 assert.equal(q.inspect().duelClock,before);assert.equal(e.stacks[0].expiresAt,expires);
 assert.equal(e.aim,beforeAim);assert.equal(e.laserIndex,0);
 q.open('resume');q.step(6);assert.equal(e.bonus,1);
 q.hide(true);q.step(70);assert.equal(e.laserIndex,0);
 q.hide(false);q.open('resume');q.step(70);assert.ok(e.laserIndex>0);
 q.target(false);q.step(30);
 assert.equal(q.inspect().duelClock,0);assert.equal(q.inspect().vandulLasers.length,0);assert.equal(q.inspect().vandul,null);
 q.target(true);assert.equal(q.inspect().vandul.bonus,0);
});
