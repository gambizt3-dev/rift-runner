'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {setup,tick}=require('./ballistic.test.cjs');
const engineKey='rift-runner.engine-fit.v1',weaponKey='rift-runner.fighter-fit.v1';
const saved=engine=>JSON.stringify({version:1,engine});
const engine=q=>q.inspect().fighterLoadout.engine;
const stats=q=>[q.inspect().p.weight,q.inspect().p.acceleration,q.inspect().p.invMass];
const closeEnough=(a,b)=>assert.ok(Math.abs(a-b)<1e-9,a+' != '+b);
const mount=(q,id)=>q.fit('engine',id);
const holdEast=q=>{q.key('keydown','KeyD');q.step(21);q.key('keyup','KeyD');};
async function launch(q){q.open('start');await tick();q.step();q.inspect().cones.splice(0);return q.inspect().p;}
test('Hangar engine choices change true powered speed without resetting the craft or weapons',async()=>{
 const weaponFit=JSON.stringify({version:1,primary:'ballistic',secondary:'blaster'});
 const q=setup({savedFit:weaponFit}),p=await launch(q);
 const starterStats=stats(q),originalWeapon=q.inspect().fighterLoadout.weapon;
 assert.equal(engine(q),'stock-thruster');assert.equal(q.el['fit-engine'].value,'stock-thruster');
 Object.assign(p,{x:100,y:460});holdEast(q);closeEnough(p.vx,222);
 mount(q,'test-thruster');assert.equal(engine(q),'stock-thruster','only fits in Hangar');
 p.hp=12;q.key('keydown','KeyD');
 q.click('open-hangar');mount(q,'test-thruster');
 assert.equal(q.el['fit-engine-stat'].textContent,'Speed rating 5');
 assert.equal(q.storage.get(engineKey),saved('test-thruster'));
 assert.equal(q.storage.get(weaponKey),weaponFit);
 assert.equal(q.inspect().fighterLoadout.weapon,originalWeapon);
 assert.deepEqual(stats(q),starterStats);
 const damaged=q.inspect().p;assert.equal(damaged.hp,12);
 assert.equal(damaged.vx,222,'coasting momentum is not overwritten on fit change');
 q.click('close-hangar');
 closeEnough(p.speed,111);
 assert.equal(q.inspect().p,damaged);assert.equal(p.hp,12);
 assert.equal(q.inspect().practiceShots,0);
 q.step();assert.ok(p.vx>111,'old input cleared; momentum coasts rather than immediately applying powered target');
 holdEast(q);closeEnough(p.vx,111);
 q.reset();assert.equal(engine(q),'test-thruster');closeEnough(q.inspect().p.speed,111);
 q.click('open-hangar');mount(q,'stock-thruster');q.click('close-hangar');
 assert.equal(q.inspect().p.speed,222);assert.equal(q.el['fit-engine-stat'].textContent,'Speed rating 10');
});
test('engine choice before launch persists independently and invalid values fall back safely',async()=>{
 const q=setup();
 q.click('open-hangar');mount(q,'test-thruster');q.click('close-hangar');
 assert.equal(q.inspect().state,'menu');assert.equal(engine(q),'test-thruster');
 const stored=q.storage.get(engineKey);
 const next=setup({savedEngine:stored});
 const p=await launch(next);assert.equal(engine(next),'test-thruster');closeEnough(p.speed,111);
 next.click('open-hangar');mount(next,'__proto__');assert.equal(engine(next),'test-thruster');
 assert.equal(next.el['fit-engine'].value,'test-thruster');assert.equal(next.storage.get(engineKey),stored);
 next.click('close-hangar');
 for(const invalid of ['broken JSON','"test-thruster"',saved('constructor'),saved(['test-thruster']),JSON.stringify({version:2,engine:'test-thruster'})]){
  const fallback=setup({savedEngine:invalid});const stock=await launch(fallback);
  assert.equal(engine(fallback),'stock-thruster');assert.equal(stock.speed,222);
 }
 assert.equal(q.inspect().engineProfiles['stock-thruster'].audioProfile,'stock-loop');
 assert.equal(q.inspect().engineProfiles['test-thruster'].audioProfile,'synth');
});
