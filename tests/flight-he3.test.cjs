'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {setup,tick}=require('./ballistic.test.cjs');
const exact=(value,expected,error=1e-8)=>assert.ok(Math.abs(value-expected)<error,`${value} != ${expected}`);
const zero=opts=>setup({initialHe3:null,...opts});
const bank=q=>q.inspect().p.he3;
const meter=q=>q.el['flight-he3-meter'];
async function fly(q){q.choose('practice');await tick();q.step();return q.inspect().p;}
test('Weifer powers a distinct Kestrel display from zero; active-flight simulation caps at 20 and resets',async()=>{
 const html=fs.readFileSync(path.join(__dirname,'../dist/index.html'),'utf8');
 assert.match(html,/<meter id="flight-he3-meter" min="0" max="20" value="0" aria-label="Kestrel H20 He3 battery charge">/);
 assert.match(html,/weifer-he3-core\.webp\?v=74[^>]*width="320" height="180"[^>]*><strong>Weifer He3 Generator Core<\/strong>.*2 He3 per second · Weight 8/);
 assert.match(html,/kestrel-h20-cell\.webp\?v=74[^>]*width="320" height="180"[^>]*><strong>Kestrel H20 Reserve Cell<\/strong>.*20 He3 capacity · Superconducting ceramic lattice/);
 const q=zero();q.step(750);assert.equal(bank(q),0);assert.equal(meter(q).value,0);
 q.choose('hangar');q.step(250);assert.equal(bank(q),0);q.click('close-hangar');
 const p=await fly(q);
 assert.equal(q.inspect().fighterLoadout.power,'weifer-he3-core');
 assert.equal(q.inspect().fighterLoadout.battery,'kestrel-h20-reserve-cell');
 assert.equal(p.weight,100);assert.equal(bank(q),0);
 q.step(125);exact(bank(q),4);assert.equal(meter(q).value,4);assert.equal(meter(q).max,20);
 assert.equal(q.el['flight-he3-amount'].textContent,'4 / 20');
 q.key('keydown','KeyP');q.step(650);exact(bank(q),4);
 q.choose('resume');q.hide(true);q.step(650);exact(bank(q),4);
 q.hide(false);q.choose('resume');q.step(650);assert.equal(bank(q),20);assert.equal(meter(q).value,20);
 q.step(650);assert.equal(bank(q),20,'surplus generation does not exceed capacity');
 q.reset();assert.equal(bank(q),0);assert.equal(meter(q).value,0);
});
test('commanded thrust consumes 1 He3/s, coasting and passive braking consume none',async()=>{
 const q=zero(),p=await fly(q);
 q.key('keydown','KeyD');q.step(50);exact(bank(q),.8);
 assert.equal(p.vx,222,'default generator supplies commanded thrust even with zero stored');
 q.key('keyup','KeyD');q.step(50);exact(bank(q),2.4);
 assert.ok(p.vx<100,'passive braking costs no power');
 // Two diagonal inputs represent a single thrust command, not double draw.
 q.key('keydown','KeyA');q.key('keydown','KeyW');q.step(50);exact(bank(q),3.2);
 q.key('keyup','KeyA');q.key('keyup','KeyW');
});
test('Sterling spends one per actual projectile, empty triggers are inert, and ballistic remains free',async()=>{
 const q=zero(),p=await fly(q);
 assert.equal(q.el['fire-button'].dataset.phase,'low-he3');
 q.step(31);exact(bank(q),.992);
 const initialAudio=q.played.length;
 q.click('fire-button');assert.equal(q.inspect().practiceShots,0);assert.equal(q.inspect().shots.length,0);
 assert.equal(q.played.length,initialAudio);assert.equal(p.vx,0);assert.equal(p.vy,0);
 q.step();assert.equal(q.el['fire-button'].dataset.phase,undefined);
 q.click('fire-button');exact(bank(q),.024);
 assert.equal(q.inspect().practiceShots,1);assert.equal(q.inspect().shots[0].weapon,'blaster');
 assert.equal(q.el['fire-button'].dataset.phase,'low-he3');
 q.click('fire-button');assert.equal(q.inspect().practiceShots,1);exact(bank(q),.024);
 q.change('ballistic');q.click('fire-button');assert.equal(q.inspect().practiceShots,2);exact(bank(q),.024);
});
test('a partial Sterling burst ends at depletion without follow-up shots or bypassing recovery',async()=>{
 const q=zero();await fly(q);
 const choose=()=>q.click('gun-blaster',{detail:1,pointerType:'touch',pointerId:20});
 choose();q.step(4);choose();
 q.click('fire-button');assert.equal(q.inspect().fireBurst,null);assert.equal(q.inspect().burstCooldown,0,'empty click does not start cooldown');
 q.step(63);
 assert.ok(bank(q)>2&&bank(q)<3);
 q.click('fire-button');assert.equal(q.inspect().practiceShots,1);
 q.step(4);assert.equal(q.inspect().practiceShots,2);
 q.step(5);assert.equal(q.inspect().practiceShots,2);
 assert.equal(q.inspect().fireBurst,null);assert.ok(q.inspect().burstCooldown>0);
 q.click('fire-button');assert.equal(q.inspect().practiceShots,2);
 q.step(48);assert.equal(q.inspect().practiceShots,2,'recharge is not an automatic new shot or resumed volley');
 q.click('fire-button');assert.equal(q.inspect().practiceShots,3);
});
