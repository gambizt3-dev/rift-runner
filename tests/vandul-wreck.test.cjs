'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {setup,tick,arrive}=require('./ballistic.test.cjs');
const near=(a,b,margin=1e-6)=>assert.ok(Math.abs(a-b)<margin,a+' != '+b);
const snapshot=w=>Array.from(w.bodies,d=>[d.x,d.y,d.vx,d.vy,d.angle,d.spin]);
const gap=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const speed=d=>Math.hypot(d.vx,d.vy);
async function start(sprite=false,seed=13){
 const q=setup({saved:'ballistic',sprite});q.cover(false);q.open('start');await tick();q.step();q.target(true);
 const {vandul,p,cones}=q.inspect();cones.splice(0);
 Object.assign(vandul,{x:250,y:315,vx:-46,vy:13,hp:5,driveSeed:seed});
 Object.assign(p,{x:250,y:388,aim:-Math.PI/2});
 return q;
}
function fire(q){q.click('fire-button');for(let i=0;i<10&&!q.inspect().wreckage;i++)q.step();}
test('a real finishing shot swaps to one ruined hull and distinct procedurally cut debris, leaving active flight',async()=>{
 const q=await start(true),first=q.inspect();
 assert.equal(first.wreckage,null);assert.equal(q.sprites.length,2);
 Object.assign(q.sprites[1],{complete:true,naturalWidth:272,naturalHeight:272});
 fire(q);const {wreckage:w,duelResult,state,vandul:e}=q.inspect();
 assert.ok(w);assert.equal(duelResult,'won');assert.equal(e.hp,0);assert.equal(state,'play');
 assert.equal(q.el.overlay.hidden,true);assert.match(q.el['vandul-duel-readout'].textContent,/You win/);
 assert.ok(w.fragments.length>=5&&w.fragments.length<=8);assert.equal(w.bodies.length,w.fragments.length+1);
 assert.equal(new Set(w.fragments.map(f=>f.r)).size,w.fragments.length);
 assert.equal(new Set(w.fragments.map(f=>JSON.stringify(f.shape))).size,w.fragments.length);
 assert.ok(w.fragments.every(f=>Number.isFinite(f.sampleX)&&f.sampleX>0&&f.sampleX<1));
 assert.ok(w.fragments.some(f=>gap(f,w.hull)>20));
 assert.ok(gap(w.hull,e)<3,'hull starts at impact pose');
 near(w.hull.angle,e.aim+Math.PI/2,.06);assert.ok(speed(w.hull)>30);
 const doomed=q.sprites.find(x=>x.src==='./vandul-wreck.webp');assert.ok(doomed);
 Object.assign(doomed,{complete:true,naturalWidth:272,naturalHeight:272});
 q.spriteFrames.length=0;q.step(3);
 assert.ok(q.spriteFrames.some(frame=>frame.asset===doomed));
 assert.ok(q.spriteFrames.filter(frame=>frame.asset===q.sprites[1]).length>=w.fragments.length,'intact texture clipped separately to shards');
 const poses=snapshot(w);
 q.step(20);assert.notDeepEqual(snapshot(w),poses);assert.ok(gap(w.hull,e)>8,'hull drifts on its own');
 const x=q.inspect().p.x;q.key('keydown','KeyD');q.step(14);q.key('keyup','KeyD');
 assert.ok(q.inspect().p.x>x);assert.equal(q.inspect().p.hp,20);
 assert.equal(q.inspect().wreckage,w);assert.equal(q.inspect().vandulLasers.length,0);
 const j=q.inspect().practiceShots;q.click('fire-button');assert.equal(q.inspect().practiceShots,j+1);
});
test('distinct seeds cut physically distinct pieces and a pause/hidden round preserves debris until Reset',async()=>{
 const a=await start(false,10),b=await start(false,284);
 fire(a);fire(b);
 const w=a.inspect().wreckage,other=b.inspect().wreckage;
 assert.notDeepEqual(Array.from(w.fragments,x=>x.shape),Array.from(other.fragments,x=>x.shape));
 a.step(15);const still=snapshot(w);
 a.key('keydown','KeyP');a.step(120);assert.deepEqual(snapshot(w),still);
 a.open('resume');a.hide(true);a.step(120);assert.deepEqual(snapshot(w),still);
 a.hide(false);a.open('resume');a.step(165);
 assert.equal(a.inspect().wreckage,w);
 for(const d of w.bodies){
  assert.ok(d.x>=12+d.r&&d.x<=468-d.r&&d.y>=12+d.r&&d.y<=708-d.r,'retained and bounded');
  assert.ok(speed(d)<6,'residual motion damped before the next opponent reaches flight');
 }
 a.reset();assert.equal(a.inspect().wreckage,null);assert.equal(a.inspect().vandul,null);
 arrive(a);assert.equal(a.inspect().vandul.hp,20);assert.equal(a.inspect().wreckage,null);
 b.target(false);assert.equal(b.inspect().wreckage,null,'exit/practice clears all debris');
});
test('debris contact nudges the ruined hull rather than leaving a live enemy or damaging the player',async()=>{
 const q=await start();fire(q);q.step(160);
 const {p,wreckage:w,vandul:e}=q.inspect(),h=w.hull;
 Object.assign(p,{x:h.x-41,y:h.y,vx:205,vy:0});
 Object.assign(h,{vx:0,vy:0});
 q.step(6);assert.ok(h.vx>0);assert.equal(p.hp,20);
 assert.equal(e.x!==h.x||e.y!==h.y,true);
 assert.equal(q.inspect().vandulLasers.length,0);
});
