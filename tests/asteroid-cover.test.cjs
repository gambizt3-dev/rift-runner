'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {setup,tick}=require('./ballistic.test.cjs');
const speed=body=>Math.hypot(body.vx,body.vy);
async function withFlight(options={}){
 const q=setup(options);q.open('start');await tick();q.step();return q;
}
function directHit(q,rock,weapon){
 q.inspect().shots.push({x:rock.x-1,y:rock.y,vx:570,vy:0,a:0,damage:5,weapon});
 q.step();
}
const rockState=({asteroids})=>Array.from(asteroids,r=>[r.profile.id,r.x,r.y,r.r,r.invMass]);
test('three independently sized rocks cover the optional duel only, with exact atlas tiles and lifecycle',async()=>{
 const q=await withFlight({sprite:true}),before=q.inspect();
 assert.equal(q.el['asteroid-cover-on'].checked,true);
 assert.equal(before.asteroids.length,0);assert.equal(before.cones.length,8);
 assert.equal(q.sprites.length,1,'optional art not fetched in base sandbox');
 q.target(true);const duel=q.inspect(),{p,vandul}=duel;
 assert.deepEqual(rockState(duel),[
  ['crater',397,385,27,1/8],['shard',240,506,30,1/12],['split',102,350,36,1/18]]);
 assert.equal(duel.cones.length,8);
 for(const r of duel.asteroids)for(const ship of [p,vandul]){
  assert.ok(Math.hypot(r.x-ship.x,r.y-ship.y)>r.r+ship.r,'starting passable ship-rock gap');
  assert.ok(r.profile.drawSize>78);
 }
 const atlas=q.sprites.find(img=>img.src==='./rift-asteroid-atlas.webp');assert.ok(atlas);
 Object.assign(atlas,{complete:true,naturalWidth:576,naturalHeight:192});
 q.step();
 const cropped=q.spriteFrames.filter(frame=>frame.asset===atlas).slice(-3).map(frame=>frame.bounds);
 assert.deepEqual(cropped.map(a=>a.slice(0,4)),[[0,0,192,192],[192,0,192,192],[384,0,192,192]]);
 assert.deepEqual(cropped.map(a=>a[6]),[86,96,108]);
 const damaged=duel.asteroids[1];directHit(q,damaged,'ballistic');assert.ok(speed(damaged)>0);
 q.reset();assert.notEqual(q.inspect().asteroids[1],damaged);assert.equal(speed(q.inspect().asteroids[1]),0);
 q.cover(false);assert.equal(q.inspect().asteroids.length,0);assert.ok(q.inspect().vandul);
 q.reset();assert.equal(q.inspect().asteroids.length,0,'bare aim setting survives Reset');
 q.cover(true);assert.equal(q.inspect().asteroids.length,3);
 q.target(false);assert.equal(q.inspect().asteroids.length,0);assert.equal(q.inspect().vandul,null);
 q.target(true);assert.equal(q.inspect().asteroids.length,3);
});
test('small laser shove vs each ballistic weapon; independent bodies turn gently and settle',async()=>{
 const movement={};
 for(const weapon of ['blaster','ak77','ballistic']){
  const q=await withFlight();q.target(true);
  const [r,s,t]=q.inspect().asteroids;
  directHit(q,r,weapon);movement[weapon]={speed:speed(r),spin:Math.abs(r.spin)};
  assert.equal(speed(s),0);assert.equal(speed(t),0);
  assert.ok(r.spin!==0&&Math.abs(r.spin)<.62,'even centered hit starts a small turn');
  q.step(7);assert.ok(r.x>397);assert.notEqual(r.angle,r.profile.phase);
  // Move the player away to keep the duel from sending a second hit here.
  Object.assign(q.inspect().p,{x:180,y:650,vx:0,vy:0});
  q.step(170);assert.ok(speed(r)<.09);assert.ok(Math.abs(r.spin)<.012);
  assert.ok(Math.abs(r.angle-r.profile.phase)<.24);
 }
 assert.ok(movement.blaster.speed<6);
 assert.ok(movement.ak77.speed>movement.blaster.speed*4);
 assert.ok(movement.ballistic.speed>movement.ak77.speed);
 assert.ok(movement.ak77.spin>movement.blaster.spin*2);
});
test('swept near cover saves both ships and only the first obstacle takes a hit',async()=>{
 const q=await withFlight({saved:'ballistic'});q.target(true);
 const {p,vandul,asteroids,cones}=q.inspect();cones.splice(0);
 q.click('fire-button');q.step(11);
 assert.equal(vandul.hp,20);assert.ok(asteroids[1].vy<0,'player hits center cover, not Vandul');
 q.inspect().vandulLasers.push({x:240,y:450,vx:0,vy:30000,a:Math.PI/2,damage:2,life:1});
 q.step();assert.equal(p.hp,20);assert.equal(q.inspect().vandulLasers.length,0);
 const a=asteroids[1],beforeSpeed=speed(a);
 assert.ok(beforeSpeed>0&&beforeSpeed<42);
 const first=await withFlight();first.target(true);
 const lane=first.inspect(),shield=lane.asteroids[1];lane.cones.splice(0);
 Object.assign(lane.p,{x:140,y:620});
 lane.cones.push({id:9,x:240,y:584,r:12,vx:0,vy:0,angle:0,spin:0,hitGlow:0,wallFx:0,invMass:1});
 lane.shots.push({x:240,y:625,vx:0,vy:-25500,a:-Math.PI/2,weapon:'ballistic',damage:5});
 first.step();assert.ok(lane.cones[0].vy<0);assert.equal(shield.vy,0,'later rock does not absorb the same projectile');
});
test('ship-body collision transfers modest movement; cover blocks the opener without trapping Vandul',async()=>{
 const q=await withFlight();q.target(true);
 const {p,vandul,asteroids,cones}=q.inspect();cones.splice(0);
 q.step(71);
 assert.equal(p.hp,20,'central cover blocks the opening shot');
 assert.ok(Math.abs(vandul.x-240)>15,'starts a lateral maneuver when LOS is covered');
 q.step(260);
 assert.ok(p.hp<20,'Vandul works around central cover to land a later laser');
 q.reset();
 const d=q.inspect();d.cones.splice(0);const rock=d.asteroids[0];
 Object.assign(d.p,{x:rock.x-49,y:rock.y,vx:180,vy:0});
 q.step(4);
 assert.ok(speed(rock)>0&&speed(rock)<42,'ordinary contact nudges the heavy body');
 assert.equal(d.p.hp,20,'rock contact is not suddenly hull damage');
});
