'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {setup,tick}=require('./ballistic.test.cjs');
const base=['../dist','..'].map(dir=>path.join(__dirname,dir)).find(dir=>fs.existsSync(path.join(dir,'index.html')));
const read=name=>fs.readFileSync(path.join(base,name),'utf8');
test('Enemy Ships lists a read-only Vandul entry matching the live combat profile and sprite',()=>{
 const {vandulProfile:m}=setup().inspect();
 const panel=read('carrier-crew.html').match(/<dialog id="crew-enemy-list"[^]*?<\/dialog>/)[0];
 assert.match(panel,/<ul class="enemy-ships">\s*<li><details>\s*<summary>Vandul Fighter<\/summary>/);
 assert.match(panel,/src="\.\/vandul-ship\.webp"/);
 for(const expected of [m.hullHp+' HP · Hull weight '+m.hullWeight,m.weight+' weight units',
  'Vandul thruster · Cruise '+m.speed+' u/s · Drive-by '+m.driveBy.topSpeed+' u/s',
  'Pulse laser · '+m.laser.damage+' damage / shot · '+m.laser.speed+' u/s · '+m.laser.recovery+' s cooldown',
  '<dt>Secondary weapon</dt><dd>Empty</dd>','<dt>Shield</dt><dd>Empty</dd>']){
  assert.ok(panel.includes(expected),expected);
 }
 assert.doesNotMatch(panel,/<(select|input)\b/i);
 assert.ok(fs.statSync(path.join(base,'vandul-ship.webp')).size>1000);
 assert.doesNotMatch(read('index.html'),/Inspect Vandul|inspect-vandul|vandul-hangar-view|vandul-inspection-title/i);
});
test('the player hangar still pauses flight and keeps the test engine and canopy available',async()=>{
 const q=setup();q.choose('start');await tick();for(let i=0;i<400&&!q.inspect().vandul;i++)q.step();
 const {p,vandul}=q.inspect();assert.ok(vandul);
 q.click('open-hangar');assert.equal(q.inspect().state,'pause');
 const before={clock:q.inspect().duelClock,p:p.hp,v:vandul.hp};
 q.click('hangar-canopy-button');
 assert.equal(q.el['hangar-canopy-rig'].dataset.canopy,'open');
 q.testEngine('hangar-test-engine','pointerdown');assert.ok(q.inspect().enginePress);
 q.step(300);assert.equal(q.inspect().duelClock,before.clock);
 assert.equal(p.hp,before.p);assert.equal(vandul.hp,before.v);
 q.outside('pointerup',{pointerId:77});q.fit('engine','test-thruster');
 assert.equal(q.inspect().fighterLoadout.engine,'test-thruster');
 q.click('close-hangar');assert.equal(q.inspect().state,'play');assert.equal(q.inspect().vandul,vandul);
});
