'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {setup,tick,arrive}=require('./ballistic.test.cjs');
const badge=q=>q.el['vandul-countdown'];
const htmlPath=['../dist/index.html','../index.html'].map(p=>path.join(__dirname,p)).find(p=>fs.existsSync(p));
const gap=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const positions=q=>[q.inspect().p,...q.inspect().cones,...q.inspect().asteroids];
test('Start counts down then eases in from above before combat becomes ready',async()=>{
 const q=setup({sprite:true});q.step(400);
 assert.match(q.el.overlay.innerHTML,/Start duel/);assert.match(q.el.overlay.innerHTML,/Practice alone/);
 assert.ok(!fs.readFileSync(htmlPath,'utf8').includes('id="vandul-duel-on"'));
 assert.equal(q.sprites.length,1);assert.equal(badge(q).hidden,true);
 q.choose('start');await tick();
 assert.equal(q.inspect().asteroids.length,3);
 assert.equal(q.inspect().vandul,null);assert.equal(badge(q).textContent,'Vandul incoming · 3');
 q.step(63);assert.equal(badge(q).textContent,'Vandul incoming · 2');
 q.step(63);assert.equal(badge(q).textContent,'Vandul incoming · 1');
 q.step(61);assert.equal(q.inspect().vandulIngress,null);
 q.step();const entry=q.inspect().vandulIngress;
 assert.ok(entry);assert.ok(entry.y< -30);assert.equal(q.inspect().vandul,null);
 assert.match(badge(q).textContent,/entering from the top/);
 Object.assign(q.sprites[1],{complete:true,naturalWidth:272,naturalHeight:272});
 let last={x:entry.x,y:entry.y},samples=0,prev=entry.y,visible=false;
 while(q.inspect().vandulIngress&&samples++<160){
  q.step();
  const now=q.inspect(),ship=now.vandulIngress??now.vandul;assert.ok(ship);
  assert.ok(ship.y>=prev-1e-7&&gap(last,ship)<=1.633,'moves down continuously, no pop-in');
  last={x:ship.x,y:ship.y};prev=ship.y;
  if(now.vandulIngress&&ship.y>18&&ship.y<55)visible=true;
  assert.equal(now.duelClock,0);assert.equal(now.vandulLasers.length,0);
  for(const obstacle of positions(q))assert.ok(gap(ship,obstacle)>20+obstacle.r,'safe full approach');
 }
 assert.ok(visible&&samples>50);
 const v=q.inspect().vandul;
 assert.ok(v);assert.equal(q.inspect().vandulIngress,null);
 assert.equal(v.y,84);assert.equal(v.hp,20);assert.equal(badge(q).hidden,true);
 assert.ok(q.spriteFrames.some(x=>x.asset===q.sprites[1]&&x.translation[1]>18&&x.translation[1]<55),'real sprite moves into arena');
 assert.equal(v.nextLaser,q.inspect().vandulProfile.laser.grace);
 assert.ok(v.nextDriveBy>=5&&v.nextDriveBy<8.5);
 q.step(57);assert.equal(v.laserIndex,0,'full post-entry grace');q.step(3);assert.equal(v.laserIndex,1);
 q.reset();assert.equal(q.inspect().vandul,null);assert.equal(q.inspect().vandulIngress,null);assert.equal(q.inspect().vandulLasers.length,0);
 assert.equal(badge(q).textContent,'Vandul incoming · 3');
 assert.notEqual(arrive(q),v);assert.equal(q.inspect().vandul.hp,20);
});
test('pause, background and Hangar freeze countdown and ingress; no wall-time catch-up',async()=>{
 const q=setup();q.cover(false);q.choose('start');await tick();q.step(40);
 const time=q.inspect().duelCountdown;
 q.key('keydown','KeyP');q.step(220);assert.equal(q.inspect().duelCountdown,time);assert.equal(badge(q).hidden,true);
 q.skipFrames(30000);q.choose('resume');q.step();
 assert.equal(q.inspect().duelCountdown,time);assert.equal(badge(q).hidden,false);
 for(let i=0;i<190&&!q.inspect().vandulIngress;i++)q.step();
 const entry=q.inspect().vandulIngress;assert.ok(entry);q.step(21);
 const before=[entry.x,entry.y];
 q.hide(true);q.step(220);assert.deepEqual([entry.x,entry.y],before);assert.equal(badge(q).hidden,true);
 q.hide(false);q.step(200);assert.deepEqual([entry.x,entry.y],before);
 q.skipFrames(30000);q.choose('resume');q.step();assert.deepEqual([entry.x,entry.y],before);
 q.click('open-hangar');q.step(220);q.reset();assert.deepEqual([entry.x,entry.y],before);
 q.click('close-hangar');assert.equal(q.inspect().state,'play');assert.equal(badge(q).hidden,false);
 assert.ok(arrive(q));assert.equal(q.inspect().vandulIngress,null);
});
test('dynamic player blockade makes ingress choose a clear lane, not pass through the hull',async()=>{
 const q=setup();q.choose('start');await tick();q.step(193);
 const {p,vandulIngress:entry}=q.inspect();assert.ok(entry);
 const oldLane=entry.lane,oldY=entry.y;
 Object.assign(p,{x:oldLane,y:70,vx:0,vy:0});
 for(let i=0;i<260&&!q.inspect().vandul;i++){
  q.step();const ship=q.inspect().vandulIngress??q.inspect().vandul;
  assert.ok(gap(ship,p)>p.r+20,'never walks through blocker');
 }
 assert.ok(q.inspect().vandul);assert.notEqual(q.inspect().vandul.x,oldLane);
 assert.ok(q.inspect().vandul.y>oldY);assert.equal(q.inspect().p.hp,20);
});
test('Practice alone keeps cones and weapon tests but never starts any arrival, including Reset',async()=>{
 const q=setup({sprite:true});q.choose('practice');await tick();q.step(450);
 assert.equal(q.inspect().state,'play');assert.equal(q.inspect().cones.length,8);
 assert.equal(q.inspect().vandul,null);assert.equal(q.inspect().vandulIngress,null);
 assert.equal(q.inspect().asteroids.length,0);assert.equal(q.sprites.length,1);
 assert.equal(badge(q).hidden,true);
 q.click('fire-button');assert.equal(q.inspect().practiceShots,1);
 q.reset();q.step(450);assert.equal(q.inspect().vandul,null);assert.equal(q.inspect().vandulIngress,null);assert.equal(q.inspect().duelCountdown,0);
});
