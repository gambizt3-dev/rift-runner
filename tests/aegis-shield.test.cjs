'use strict';
const assert=require('node:assert/strict'),test=require('node:test'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {createRequire}=require('node:module');
// Reuse the arena DOM/audio clock harness without changing its baseline DOM.
const fixture=path.join(__dirname,'ballistic.test.cjs');
let harness=fs.readFileSync(fixture,'utf8');
for(const [a,b] of [
 ['function setup({saved,savedFit,savedEngine,','function setup({saved,savedFit,savedEngine,savedShield,'],
 ["['rift-runner.engine-fit.v1',savedEngine]","['rift-runner.engine-fit.v1',savedEngine],['rift-runner.shield-fit.v1',savedShield]"],
 ["['game','hud','overlay'","['fit-shield','fit-aegis-option','fit-shield-stat','flight-shield','game','hud','overlay'"],
 ['globalThis.inspect=()=>({shotSound:', 'globalThis.inspect=()=>({shieldClock,shieldHp,shieldUntil,shieldReadyAt,shieldProfiles,shotSound:']
]){
 assert.ok(harness.includes(a),'fixture extension '+a);harness=harness.replace(a,b);
}
const program={exports:{}},requiring=createRequire(fixture);
vm.runInThisContext('(function(require,module,__dirname){'+harness+'\n})')(requiring,program,__dirname);
const {setup,tick}=program.exports;
const shield='aegis-s3',storage='rift-runner.shield-fit.v1',purchased={ownsAegis:()=>true};
function mount(q,value=shield){q.choose('hangar');q.fit('shield',value);q.click('close-hangar');}
async function duel(opts={}){
 const q=setup({traceClashPaint:true,fieldSeed:137,pilotCredits:purchased,...opts});q.cover(false);mount(q);
 q.choose('practice');await tick();q.step();q.target(true);
 const {p,vandul,cones}=q.inspect();cones.splice(0);
 Object.assign(p,{x:430,y:910,vx:0,vy:0});
 Object.assign(vandul,{x:430,y:750,vx:0,vy:0,nextDriveBy:999,nextLaser:999});
 return q;
}
function incoming(q,amount,kind='energy'){
 const {p,vandul,vandulLasers}=q.inspect();
 p.vx=p.vy=0;
 vandulLasers.push({x:p.x-32,y:p.y,vx:6400,vy:0,a:0,kind,life:1,damage:amount,owner:vandul});
 q.step();
}
const control=q=>q.el['flight-shield'];
test('shield starts empty, only Hangar can fit it, and fitted preference is separate from the other equipment',async()=>{
 const q=setup({pilotCredits:purchased}),slot=q.el['fit-shield'];
 assert.equal(q.inspect().fighterLoadout.shield,null);assert.equal(slot.value,'');assert.equal(q.el['fit-aegis-option'].disabled,false);
 q.fit('shield',shield);assert.equal(q.inspect().fighterLoadout.shield,null);
 mount(q);assert.equal(q.storage.get(storage),shield);
 assert.equal(q.inspect().fighterLoadout.shield,shield);
 assert.match(q.el['fit-shield-stat'].textContent,/5 HP · 3s active · 10s cooldown · 100% laser \/ 50% ballistic/);
 const next=setup({savedShield:q.storage.get(storage),pilotCredits:purchased});
 assert.equal(next.inspect().fighterLoadout.shield,shield);
 const bad=setup({savedShield:'constructor',pilotCredits:purchased});assert.equal(bad.inspect().fighterLoadout.shield,null);
 mount(next,'');assert.equal(next.inspect().fighterLoadout.shield,null);
 next.choose('practice');await tick();next.step();assert.equal(control(next).hidden,true);
 next.key('keydown','KeyQ');assert.equal(next.inspect().shieldHp,0);
});
test('purchase is required at boot, for stale/forged fit changes, and for controls and damage',async()=>{
 const html=fs.readFileSync(path.join(__dirname,'../dist/index.html'),'utf8');
 assert.match(html,/<option id="fit-aegis-option" value="aegis-s3" disabled>/);
 assert.match(html,/pilot-credits\.js\?v=\d+[\s\S]*fighter-registry\.js\?v=\d+[\s\S]*game\.js\?v=\d+/);
 for(const api of [null,{}, {ownsAegis:()=>false}, {ownsAegis:()=>1}, {ownsAegis(){throw new Error('storage blocked');}}]){
  const locked=setup({savedShield:shield,pilotCredits:api});
  assert.equal(locked.inspect().fighterLoadout.shield,null,'old V67 choice is not evidence of ownership');
  assert.equal(locked.el['fit-aegis-option'].disabled,true);
  assert.match(locked.el['fit-shield-stat'].textContent,/Buy Aegis at the Carrier Shop · 200 credits/);
  mount(locked);assert.equal(locked.inspect().fighterLoadout.shield,null);
  locked.choose('practice');await tick();locked.step();
  assert.equal(control(locked).hidden,true);
  locked.key('keydown','KeyQ');locked.click('flight-shield');assert.equal(locked.inspect().shieldHp,0);
 }
 let owns=true;
 const q=await duel({pilotCredits:{ownsAegis:()=>owns}});
 q.key('keydown','KeyQ');assert.equal(q.inspect().shieldHp,5);
 owns=false;
 incoming(q,2);assert.equal(q.inspect().p.hp,18,'no damage absorption if ownership is no longer available');
 assert.equal(control(q).hidden,true);
});
test('touch/keyboard activate 5 HP for exactly 3 play seconds; 10-second cooldown, pause, hide, and reset',async()=>{
 const q=await duel();
 assert.equal(control(q).hidden,false);assert.equal(control(q).dataset.phase,'ready');
 q.click('flight-shield',{isTrusted:false});assert.equal(q.inspect().shieldHp,0);
 q.click('flight-shield');assert.equal(q.inspect().shieldHp,5);assert.equal(control(q).dataset.phase,'active');
 const expiry=q.inspect().shieldUntil;
 q.key('keydown','KeyP');q.step(90);assert.equal(q.inspect().shieldUntil,expiry);
 assert.equal(q.inspect().shieldClock,0);
 q.choose('resume');q.hide(true);q.step(150);assert.equal(q.inspect().shieldClock,0);
 q.hide(false);q.choose('resume');q.step(187);assert.equal(control(q).dataset.phase,'active');
 assert.ok(q.strokePaint.some(s=>s.color==='#73eaff'),'visible ring on the live hull');
 q.step();assert.equal(control(q).dataset.phase,'cooldown');
 q.key('keydown','KeyQ');assert.equal(q.inspect().shieldUntil,expiry,'cannot reuse during cooldown');
 q.step(624);assert.equal(control(q).dataset.phase,'cooldown');
 q.step();assert.equal(control(q).dataset.phase,'ready');
 q.key('keydown','KeyQ',true);assert.equal(control(q).dataset.phase,'ready','key repeats do not activate');
 q.key('keydown','KeyQ');assert.equal(control(q).dataset.phase,'active');
 q.reset();assert.equal(q.inspect().shieldHp,0);assert.equal(control(q).dataset.phase,'ready');
});
test('energy and ballistic use their distinct rates, fractions spill, and depletion starts cooldown immediately',async()=>{
 const example=await duel();example.key('keydown','KeyQ');incoming(example,2,'ballistic');
 assert.equal(example.inspect().shieldHp,4,'2 ballistic spends only 1 of the 5 shield HP');
 assert.equal(example.inspect().p.hp,19,'the other 1 ballistic damage reaches the hull');
 const q=await duel();
 q.key('keydown','KeyQ');
 incoming(q,2,'energy');assert.equal(q.inspect().p.hp,20);assert.equal(q.inspect().shieldHp,3);
 assert.equal(q.inspect().p.vx,0,'completely absorbed shot does not push the hull');
 incoming(q,3,'ballistic');assert.equal(q.inspect().p.hp,18.5);assert.equal(q.inspect().shieldHp,1.5);
 incoming(q,3,'energy');assert.equal(q.inspect().p.hp,17);assert.equal(q.inspect().shieldHp,0);
 assert.ok(q.inspect().shieldUntil<.1);
 assert.ok(Math.abs(q.inspect().shieldReadyAt-q.inspect().shieldUntil-10)<1e-8);
 assert.equal(control(q).dataset.phase,'cooldown');
 const r=await duel();r.key('keydown','KeyQ');incoming(r,5,'energy');
 assert.equal(r.inspect().p.hp,20);assert.equal(r.inspect().shieldHp,0);
 incoming(r,2,'energy');assert.equal(r.inspect().p.hp,18,'normal damage resumes immediately after exact depletion');
});
test('Vandul’s actual Twinbeam pulses carry energy type; an active shield does not stop wall damage',async()=>{
 const q=await duel();q.key('keydown','KeyQ');
 const {p,vandul}=q.inspect();vandul.nextLaser=.025;q.step(4);
 const pulse=q.inspect().vandulLasers[0];assert.ok(pulse);assert.equal(pulse.kind,'energy');
 q.step(32);assert.equal(p.hp,20);assert.equal(q.inspect().shieldHp,1);
 Object.assign(p,{x:930,y:700,vx:255,vy:0,hp:20});q.step(3);
 assert.ok(p.hp<20);assert.equal(q.inspect().shieldHp,1);
});

test('Aegis expires and cools down while the carrier flies with the fighter docked or stored',()=>{
 const q=setup({address:{search:'?launch=capital-test'},savedShield:shield,pilotCredits:purchased});
 q.step();
 const {p,capitalShip:c,capitalBerth:b,berthWorld,berthVelocity}=q.inspect();
 const finish=phase=>{
  for(let i=0;i<220&&c.phase!==phase;i++)q.step();
  assert.equal(c.phase,phase);
 };
 q.click('capital-dock-action');finish('flight');
 const v=berthVelocity(0,b.approach);
 Object.assign(p,berthWorld(c,0,b.approach),{aim:c.aim,vx:v.x,vy:v.y});
 q.key('keydown','KeyQ');q.key('keyup','KeyQ');
 assert.equal(control(q).dataset.phase,'active');
 const {shieldUntil,shieldReadyAt}=q.inspect();
 q.click('capital-dock-action');q.click('capital-dock-action');finish('docked');
 assert.ok(q.inspect().shieldClock>2&&q.inspect().shieldClock<shieldUntil);
 assert.equal(control(q).hidden,true);
 q.click('capital-store-action');q.step(10);
 assert.equal(c.phase,'storing');
 q.key('keydown','KeyP');const paused=q.inspect().shieldClock;q.step(100);
 assert.equal(q.inspect().shieldClock,paused);
 q.choose('resume');finish('stored');
 assert.ok(q.inspect().shieldClock>shieldUntil);
 q.hide(true);const hidden=q.inspect().shieldClock;q.step(125);
 assert.equal(q.inspect().shieldClock,hidden);
 q.hide(false);q.choose('resume');
 for(let i=0;i<800&&q.inspect().shieldClock<shieldReadyAt+.1;i++)q.step();
 assert.ok(q.inspect().shieldClock>=shieldReadyAt+.1);
 assert.equal(c.phase,'stored');
 q.click('capital-dock-action');q.step(16);
 assert.equal(c.phase,'retrieving');assert.ok(q.inspect().shieldClock>shieldReadyAt+.3);
 finish('flight');assert.equal(control(q).hidden,false);assert.equal(control(q).dataset.phase,'ready');
});
