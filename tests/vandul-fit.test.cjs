'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {setup,tick}=require('./ballistic.test.cjs');
const speed=o=>Math.hypot(o.vx,o.vy);
const near=(a,b,tol=.002)=>assert.ok(Math.abs(a-b)<=tol,a+' != '+b);
async function fitted(engineExtra=0,laserExtra=0){
 const q=setup();q.cover(false);q.open('start');await tick();q.step();
 const {vandulLoadout:fit,vandulModules:modules}=q.inspect();
 modules.engines[fit.engine].weight+=engineExtra;modules.lasers[fit.primary].weight+=laserExtra;
 q.target(true);q.inspect().cones.splice(0);
 const {p,vandul:v}=q.inspect();
 Object.assign(p,{x:380,y:550,vx:0,vy:0});
 Object.assign(v,{x:90,y:250,vx:0,vy:0,nextDriveBy:80});
 return {q,p,v};
}
test('fitted hull, drive, power and laser each contribute actual independent weight',async()=>{
 const {q,p,v}=await fitted(),{vandulLoadout:f,vandulModules:m,vandulProfile:s}=q.inspect();
 assert.equal(f.core,'vandul-core');
 assert.equal(f.secondary,null);assert.equal(f.shield,null);
 assert.deepEqual([m.hulls[f.hull].weight,m.engines[f.engine].weight,m.cores[f.core].weight,m.lasers[f.primary].weight],[65,20,8,7]);
 assert.deepEqual([v.hp,v.weight,v.invMass,p.weight,p.invMass],[20,100,1,106,.32]);
 assert.deepEqual([s.hullWeight,s.weight,s.speed,s.driveBy.topSpeed,s.laser.damage],[65,100,63,190,2]);
 const heavy=await fitted(25,13);
 assert.equal(heavy.v.weight,138);near(heavy.v.invMass,100/138);
 const next=heavy.q.inspect().vandulProfile;
 assert.equal(next.weight,138);assert.equal(next.hullWeight,65);assert.equal(next.speed,s.speed);
});
test('engine or laser mass lowers actual normal and drive-by acceleration, not top speed',async()=>{
 const baseline=await fitted(),engine=await fitted(25,0),weapon=await fitted(0,25);
 for(const c of [baseline,engine,weapon])c.q.step();
 const initial=speed(baseline.v);
 assert.ok(initial>2.2);
 near(speed(engine.v)/initial,.8);
 near(speed(weapon.v)/initial,.8);
 for(const c of [baseline,engine,weapon]){
  Object.assign(c.v,{x:90,y:250,vx:0,vy:0,drive:{phase:'pass',leg:0,until:2.4,gate:{x:430,y:250},exit:{x:430,y:420}}});
  c.q.step(3);
 }
 assert.ok(speed(baseline.v)>20);
 near(speed(engine.v)/speed(baseline.v),.8);
 near(speed(weapon.v)/speed(baseline.v),.8);
 for(const c of [baseline,engine,weapon]){
  c.q.step(39);
  assert.ok(speed(c.v)>185&&speed(c.v)<190,'drive-by reaches same nominal speed');
  assert.equal(c.q.inspect().vandulProfile.driveBy.topSpeed,190);
  assert.equal(c.p.speed,222);
 }
 near(speed(engine.v),speed(baseline.v));
 near(speed(weapon.v),speed(baseline.v));
});
test('heavier fits receive less actual projectile impulse without changing any damage or owner recoil',async()=>{
 const results=[];
 for(const add of [[0,0],[25,0],[0,25]]){
  const c=await fitted(...add);
  Object.assign(c.v,{x:250,y:320,vx:0,vy:0,drive:{phase:'tell',until:1,leg:0,gate:{x:95,y:320},exit:{x:95,y:430}}});
  const s=c.q.inspect();s.shots.push({x:c.v.x,y:c.v.y+8,vx:570,vy:0,a:0,damage:3,weapon:'blaster'});
  c.q.step();
  assert.equal(c.v.hp,17);assert.equal(c.p.hp,20);assert.equal(c.p.vx,0);
  results.push({linear:c.v.vx,angular:c.v.spin});
 }
 assert.ok(results[0].linear>150);
 near(results[1].linear/results[0].linear,.80,.008);
 near(results[2].linear/results[0].linear,.80,.008);
 near(results[1].angular/results[0].angular,.80,.008);
 near(results[2].angular/results[0].angular,.80,.008);
});
