const test=require('node:test'),assert=require('node:assert/strict');
const {runInNewContext}=require('node:vm'),{readFileSync}=require('node:fs');
const c={window:{}};runInNewContext(readFileSync(new URL('../red-grin-broadside.js','file:'+__filename),'utf8'),c);
const a=c.window.RiftRedGrinBroadside;
const upright={x:100,y:300,heading:0};
const offsets=side=>({x:100+220*side,y:300});
test('three mounts each side; no turret placed on the landing stripes',()=>{
 for(const side of [-1,1]){
  const list=a.mounts.filter(m=>m.side===side);
  assert.equal(list.length,3);assert.equal(new Set(list.map(m=>m.y)).size,3);
  assert.ok(list.every(m=>Math.abs(m.x)>25&&Math.sign(m.x)===side));
 }
});
test('three pulses give each cannon exactly three shots, with the opposite bank locked through reload',()=>{
 const f=a.state();
 const p0=a.request(f,upright,offsets(-1),2);
 assert.equal(p0.side,-1);assert.equal(p0.shots.length,3);
 assert.equal(a.advance(f,upright,2.11),null);
 assert.equal(a.request(f,upright,offsets(1),2.12),null);
 const moved={...upright,x:120,y:290};
 const p1=a.advance(f,moved,2.12);
 assert.equal(a.request(f,upright,offsets(1),2.24),null);
 const p2=a.advance(f,moved,2.24);
 const shots=[...p0.shots,...p1.shots,...p2.shots];
 assert.equal(shots.length,9);
 assert.ok(shots.every(s=>s.side===-1&&s.a===Math.PI));
 for(let cannon=0;cannon<3;cannon++)
  assert.deepEqual(Array.from(shots.filter(s=>s.cannon===cannon),s=>s.pulse),[0,1,2]);
 assert.ok(Math.abs(p1.shots[0].x-p0.shots[0].x-20)<1e-9,'later pulses use moving muzzle');
 assert.equal(a.advance(f,moved,2.50),null);
 assert.equal(a.request(f,upright,offsets(1),3.48),null);
 const starboard=a.request(f,upright,offsets(1),3.49);
 assert.equal(starboard.side,1);assert.equal(starboard.shots.length,3);
});
test('a busy deck cancels remaining pulses and the reload still applies',()=>{
 const f=a.state();a.request(f,upright,offsets(1),4);
 assert.equal(a.advance(f,upright,4.13,{deckBusy:true}),null);
 assert.equal(f.burst,null);assert.equal(a.advance(f,upright,4.25),null);
 assert.equal(a.request(f,upright,offsets(-1),4.14),null);
});
test('bow and stern are dead arcs, the firing bank turns with the ship, and a busy flight deck holds fire',()=>{
 const f=a.state();
 for(const y of [0,600])assert.equal(a.request(f,upright,{x:100,y},1),null);
 assert.equal(a.request(f,upright,offsets(1),1,{deckBusy:true}),null);
 const turned={...upright,heading:Math.PI/2};
 assert.equal(a.request(f,turned,offsets(1),1),null);
 const volley=a.request(f,turned,{x:100,y:540},1);
 assert.equal(volley.side,1);assert.ok(volley.shots.every(s=>s.y>300&&s.a===Math.PI/2));
});
test('both banks traverse at most 30 degrees from outward, in either direction',()=>{
 const near=(x,y)=>assert.ok(Math.abs(x-y)<1e-9);
 for(const side of [-1,1])for(const deg of [-31,-30,-15,0,15,30,31]){
  const pose={x:30,y:40,heading:.34},out=pose.heading+(side<0?Math.PI:0),bearing=out+deg*Math.PI/180;
  const target={x:pose.x+300*Math.cos(bearing),y:pose.y+300*Math.sin(bearing)};
  const volley=a.request(a.state(),pose,target,1);
  if(Math.abs(deg)>30){assert.equal(volley,null);continue;}
  assert.equal(volley.side,side);assert.equal(volley.shots.length,3);
  for(const b of volley.shots){near(b.a,bearing);assert.ok(Math.cos(b.a-out)>=Math.cos(a.halfArc)-1e-9);}
 }
});
