'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {setup}=require('./ballistic.test.cjs');
const toRad=a=>Math.PI*a/180;
const arc=(from,to)=>Math.atan2(Math.sin(to-from),Math.cos(to-from));
const near=(a,b,t=1e-8)=>assert.ok(Math.abs(a-b)<=t,`${a} not within ${t} of ${b}`);
function stick(q,type,angle=90,mouse=false){
 const a=toRad(angle);q.pointer(type,91,'aim-pad',240+170*Math.cos(a),360+170*Math.sin(a),{pointerType:mouse?'mouse':'touch'});
}
function stage(opts={}){
 const q=setup(opts);q.cover(false);if(!opts.address)q.choose('practice');q.step();
 const s=q.inspect();s.cones.splice(0);s.asteroids.splice(0);s.sceneryDebris.splice(0);
 return q;
}
test('a southward half-turn follows east/west drift, ignores analog jitter, and completes after release without rotating momentum',()=>{
 for(const drift of [116,-116,0]){
  const q=stage(),p=q.inspect().p,sign=drift<0?-1:1;
  Object.assign(p,{x:430,y:780,aim:toRad(-90),vx:drift,vy:0});
  stick(q,'pointerdown',90);
  assert.equal(p.aim,toRad(-90));
  p.vx*=-1;stick(q,'pointermove',94);stick(q,'pointermove',86);
  p.vx*=-1;stick(q,'pointermove',90);
  q.step();near(arc(toRad(-90),p.aim),sign*toRad(6.4));
  stick(q,'pointerup');
  q.step(6);near(arc(toRad(-90),p.aim),sign*toRad(44.8));
  assert.equal(p.vy,0);near(p.vx,drift*Math.exp(-p.brakeDamping*.112));
  q.step(21);near(arc(toRad(-90),p.aim),sign*toRad(179.2));q.step();near(arc(p.aim,toRad(90)),0);
  assert.equal(p.vy,0);near(p.vx,drift*Math.exp(-p.brakeDamping*.464));
 }
});
test('the right joystick crosses the ±180° seam by the short arc and takes tiny mouse-pad corrections immediately',()=>{
 const q=stage(),p=q.inspect().p;
 p.aim=toRad(172);p.vy=-130;
 stick(q,'pointerdown',-171,true);
 near(p.aim,toRad(172));q.step();near(arc(toRad(172),p.aim),toRad(6.4));
 q.step(2);near(arc(p.aim,toRad(-171)),0);
 stick(q,'pointermove',-167,true);near(arc(p.aim,toRad(-167)),0);
 stick(q,'pointerup',-167,true);
});
test('joystick slew parks in pause/background and desktop mouse and keyboard can take over immediately',()=>{
 const q=stage(),p=q.inspect().p;
 stick(q,'pointerdown',90);q.step(4);const intermediate=p.aim;
 q.key('keydown','KeyP');q.step(100);assert.equal(p.aim,intermediate);
 q.choose('resume');q.hide(true);q.step(120);assert.equal(p.aim,intermediate);
 q.hide(false);q.choose('resume');
 q.key('keydown','ArrowLeft');assert.equal(p.aim,Math.PI);q.key('keyup','ArrowLeft');q.step(15);assert.equal(p.aim,Math.PI);
 stick(q,'pointerdown',0);stick(q,'pointerup',0);q.step();
 q.canvasPointer('pointermove',240,195);near(p.aim,-Math.PI/2);q.step(18);near(p.aim,-Math.PI/2);
 stick(q,'pointerdown',90);stick(q,'pointerup',90);
 q.reset();q.step(22);near(q.inspect().p.aim,-Math.PI/2);
});
test('with THR and right aim held, a shot comes from the actual muzzle and uses the current nose',()=>{
 const q=stage(),p=q.inspect().p;
 stick(q,'pointerdown',90);q.key('keydown','KeyE');q.step(5);
 assert.equal(p.mainThrustActive,true);
 const before=p.aim;
 assert.ok(before>-Math.PI/2&&before<Math.PI/2);
 q.click('fire-button');
 const shot=q.inspect().shots[0],muzzle=p.r+4;
 assert.ok(shot);near(arc(shot.a,before),0);
 near(shot.x,p.x+Math.cos(before)*muzzle);
 near(shot.y,p.y+Math.sin(before)*muzzle);
});
test('Vanduls use the same signed half-turn, do not fire sideways and have fresh recovery after delay',()=>{
 for(const drift of [115,-115]){
  const q=stage();q.target(true);
  const {p,vandul:v,cones}=q.inspect();cones.splice(0);
  Object.assign(p,{x:480,y:945,vx:0,vy:0});
  Object.assign(v,{x:480,y:765,vx:drift,vy:0,aim:toRad(-90),nextLaser:0,nextDriveBy:999});
  q.step();near(arc(toRad(-90),v.aim),Math.sign(drift)*toRad(6.4));assert.equal(v.laserIndex,0);
  let frames=1;
  for(;frames<34&&!v.laserIndex;frames++)q.step();
  assert.ok(frames>=24&&frames<34);assert.equal(v.laserIndex,1);
  const {duelClock,vandulLasers}=q.inspect(),bolt=vandulLasers.at(-1);
  assert.ok(bolt);near(arc(v.aim,bolt.aim),0,toRad(1));
  assert.ok(v.nextLaser-duelClock>=.47,'delay does not accumulate overdue firings');
  q.step(22);assert.equal(v.laserIndex,1);
 }
});
test('allied fighter sweeps in drift direction and waits to start a volley until its nose lines up',()=>{
 const q=stage({reducedMotion:true,address:{search:'?launch=wingman-test'},fieldSeed:836});q.target(true);
 const {p,vandul:v,wingman,cones,asteroids,sceneryDebris,testLead}=q.inspect();
 for(const b of [cones,asteroids,sceneryDebris])b.splice(0);
 Object.assign(p,{x:830,y:1070,vx:0,vy:0});
 Object.assign(testLead,{x:755,y:950,vx:0,vy:0,fireWait:999});
 Object.assign(wingman,{x:480,y:805,vx:-118,vy:0,aim:toRad(-90),fireWait:0});
 Object.assign(v,{x:480,y:963,vx:0,vy:0,nextLaser:999,nextDriveBy:999});
 q.step();near(arc(toRad(-90),wingman.aim),toRad(-6.4));assert.equal(q.inspect().shots.length,0);
 q.step(7);assert.equal(q.inspect().shots.length,0);
 for(let i=0;i<35&&!q.inspect().shots.some(b=>b.ally);i++)q.step();
 const shot=q.inspect().shots.find(b=>b.ally);
 assert.ok(shot);assert.ok(Math.abs(arc(wingman.aim,shot.a))<toRad(5));
 if(wingman.volley){
  const locked=wingman.aim;v.x+=27;q.step(3);near(arc(wingman.aim,locked),0);
 }
});
test('explicitly enabling auto assist can take over a dropped right-stick turn without changing its direct aim',()=>{
 const q=stage(),p=q.inspect().p;
 stick(q,'pointerdown',90);stick(q,'pointerup',90);q.step(4);
 const before=p.aim;
 q.target(true);const v=q.inspect().vandul;q.inspect().cones.splice(0);
 Object.assign(p,{x:420,y:950,vx:0,vy:0});
 Object.assign(v,{x:530,y:950,vx:0,vy:0,nextLaser:999,nextDriveBy:999});
 q.assist(true);q.step();
 assert.notEqual(before,p.aim);
 assert.equal(q.inspect().autoLock,v);
 near(p.aim,Math.atan2(v.y-p.y,v.x-p.x));
});
