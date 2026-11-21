'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {setup,tick,arrive}=require('./ballistic.test.cjs');
async function run(cover=false,art=false){
 const q=setup({saved:'ballistic',canvasArchive:art,sprite:art});q.cover(cover);q.choose('start');await tick();
 assert.ok(arrive(q));q.inspect().cones.splice(1);return q;
}
function finish(q,x=250,y=315){
 const {p,vandul:v}=q.inspect();assert.ok(v&&v.hp>0);
 Object.assign(v,{x,y,vx:-25,vy:0,hp:5,nextDriveBy:50,nextLaser:10});
 Object.assign(p,{x,y:y+70,aim:-Math.PI/2,vx:0,vy:0});
 q.inspect().vandulLasers.push({x:440,y:36,vx:0,vy:335,a:Math.PI/2,life:1,damage:2});
 q.click('fire-button');
 for(let i=0;i<11&&v.hp>0;i++)q.step();
 assert.equal(v.hp,0);
 const s=q.inspect();assert.equal(s.duelCountdown,3);assert.equal(s.vandulLasers.length,0);
 assert.equal(s.duelResult,'won');
 return {v,w:s.wreckage};
}
test('sequential real finishes keep HP, settings, positions and old debris throughout each next wave',async()=>{
 const q=await run(true),start=q.inspect(),{p,cones,asteroids}=start;
 p.hp=12;
 assert.equal(start.duelKills,0);
 assert.match(q.el['vandul-duel-readout'].textContent,/Wave 1/);
 const first=finish(q),n=q.inspect();
 assert.equal(n.duelKills,1);assert.equal(n.activeWrecks.length,1);assert.equal(n.activeWrecks[0],first.w);
 assert.match(q.el['vandul-countdown'].textContent,/Wave 2.*3/);
 const x=p.x,before=p.y;
 q.step(185);
 assert.equal(q.inspect().vandul,first.v);assert.equal(first.v.hp,0);assert.equal(q.inspect().vandulIngress,null);
 assert.equal(q.inspect().vandulLasers.length,0);
 const second=arriveAfterDefeat(q,first.v);assert.ok(second);
 assert.equal(second.hp,20);assert.notEqual(second,first.v);
 assert.equal(q.inspect().duelClock,0);assert.equal(q.inspect().duelKills,1);
 assert.equal(q.inspect().p,p);assert.equal(p.hp,12);assert.ok(Math.abs(p.x-x)<16);assert.ok(Math.abs(p.y-before)<48);
 assert.equal(q.inspect().cones,cones);assert.equal(q.inspect().asteroids,asteroids);
 assert.equal(q.inspect().activeWrecks[0],first.w);assert.match(q.el['vandul-duel-readout'].textContent,/Kills 1.*Wave 2/);
 const next=finish(q,180,355);assert.equal(q.inspect().duelKills,2);
 assert.deepEqual(Array.from(q.inspect().activeWrecks),[first.w,next.w]);
 assert.ok(arriveAfterDefeat(q,next.v));assert.match(q.el['vandul-duel-readout'].textContent,/Kills 2.*Wave 3/);
 q.reset();
 assert.equal(q.inspect().p.hp,20);assert.equal(q.inspect().duelKills,0);
 assert.equal(q.inspect().activeWrecks.length,0);assert.equal(q.inspect().wreckLayer,null);
 assert.equal(q.inspect().vandul,null);assert.match(q.el['vandul-countdown'].textContent,/3/);
 assert.ok(arrive(q));assert.match(q.el['vandul-duel-readout'].textContent,/Kills 0.*Wave 1/);
});
function arriveAfterDefeat(q,old){
 for(let i=0;i<480;i++){
  q.step();const s=q.inspect();
  assert.ok(!(s.vandul?.hp>0&&s.vandulIngress),'exactly one actor pathway');
  assert.ok(!s.vandulLasers.length,'old-wave shots do not resurrect');
  if(s.vandul&&s.vandul!==old)return s.vandul;
 }
 return null;
}
test('older visible wrecks bake into one bounded graphics layer, only three keep physics',async()=>{
 const q=await run(false,true);
 const wrecks=[];
 for(const [x,y] of [[240,313],[168,423],[350,333],[112,540],[330,460]]){
  const won=finish(q,x,y);wrecks.push(won.w);
  assert.ok(q.inspect().activeWrecks.length<=3);
  if(wrecks.length<5)assert.ok(arriveAfterDefeat(q,won.v));
 }
 const s=q.inspect();
 assert.equal(s.duelKills,5);
 assert.deepEqual(Array.from(s.activeWrecks),wrecks.slice(-3));
 assert.equal(s.archivedWrecks.length,0);
 const layer=s.wreckLayer;assert.ok(layer);assert.equal(layer.width,480);assert.equal(layer.height,720);
 assert.ok(layer.fills>=12,'older hull and fragments were stamped');
 assert.ok(q.spriteFrames.some(frame=>frame.asset===layer),'baked layer draws alongside current wrecks');
 q.reset();assert.equal(q.inspect().wreckLayer,null);assert.equal(q.inspect().activeWrecks.length,0);
});
test('inter-wave countdown freezes in pause, hidden and Hangar; hull loss cancels remaining arrivals',async()=>{
 const q=await run();const won=finish(q);q.step(25);
 const c=q.inspect().duelCountdown;
 q.key('keydown','KeyP');q.step(260);assert.equal(q.inspect().duelCountdown,c);
 q.open('resume');q.hide(true);q.step(260);assert.equal(q.inspect().duelCountdown,c);
 q.hide(false);q.open('resume');q.click('open-hangar');q.step(260);assert.equal(q.inspect().duelCountdown,c);
 q.click('close-hangar');assert.equal(q.inspect().vandul,won.v);
 const {p}=q.inspect();Object.assign(p,{x:450,y:600,vx:255,vy:0,hp:1});
 q.step(2);assert.equal(q.inspect().state,'disabled');assert.equal(q.inspect().duelResult,'lost');
 assert.equal(q.inspect().duelCountdown,0);q.step(390);
 assert.equal(q.inspect().vandulIngress,null);assert.equal(q.inspect().duelKills,1);
 assert.equal(q.inspect().vandul,won.v);assert.equal(q.inspect().wreckage,won.w);
 assert.match(q.el['vandul-duel-readout'].textContent,/RUN ENDED.*Kills 1/);
});
