'use strict';
const assert=require('node:assert/strict');
const {setup,tick}=require('./ballistic.test.cjs');

const fire=(q,type,id=3)=>q.pointer(type,id);
const aim=(q,type,x=464,y=360)=>q.pointer(type,16,'aim-pad',x,y);
const count=q=>q.inspect().practiceShots;
const choose=(q,gun)=>q.click('gun-'+gun,{detail:1,pointerType:'touch',pointerId:20});
const toggle=(q,gun)=>{choose(q,gun);q.step(6);choose(q,gun);};
async function start(saved='blaster'){
 const q=setup({saved});
 q.open('start');await tick();q.step(1);
 const {p,cones}=q.inspect();
 Object.assign(p,{x:240,y:360,vx:0,vy:0,aim:0});
 cones.splice(0);
 return q;
}
(async()=>{
 for(const gun of ['blaster','ballistic']){
  const q=await start(gun);
  toggle(q,gun);
  assert.equal(count(q),0,`${gun}: selector toggles mode without firing`);
  assert.match(q.el['gun-'+gun].textContent,/burst/i,'indicator names the active mode');
  // The primary right contact keeps aiming while the second contact presses Fire.
  aim(q,'pointerdown');
  fire(q,'pointerdown');
  assert.equal(count(q),1,`${gun}: first round in burst fires immediately`);
  aim(q,'pointermove',240,160); // remaining projectiles must use the starting angle
  q.step(3);assert.equal(count(q),1,`${gun}: not an instant triple`);
  q.step(1);assert.equal(count(q),2);
  q.step(4);assert.equal(count(q),3);
  const burst=q.inspect().shots;
  assert.equal(burst.length,3);
  assert.ok(burst.every(b=>b.weapon===gun&&Math.abs(b.a)<=.095),`${gun}: all rounds stay within about 5° of starting aim`);
  assert.ok(Math.min(...burst.map(b=>b.a))<-.04&&Math.max(...burst.map(b=>b.a))>.04,`${gun}: spread covers both sides`);
  assert.equal(q.inspect().aimPtr?.id,16);
  q.step(40);assert.equal(count(q),3,`${gun}: holding FIRE does not auto-repeat a burst`);
  fire(q,'pointerup');q.click('fire-button',{detail:1,pointerId:99});
  assert.equal(count(q),3,'pointer compatibility click cannot duplicate burst');
  // Tap and release still completes all three. Then a mode toggle restores Normal.
  fire(q,'pointerdown');fire(q,'pointerup');q.step(8);assert.equal(count(q),6);
  q.step(40);toggle(q,gun);
  assert.equal(count(q),6,'toggling burst off does not fire');
  fire(q,'pointerdown');fire(q,'pointerup');q.step(12);
  assert.equal(count(q),7,`${gun}: toggling again restores a single normal tap`);
 }
 const cooldown=await start();
 toggle(cooldown,'blaster');
 fire(cooldown,'pointerdown');fire(cooldown,'pointerup');cooldown.step(8);
 assert.equal(count(cooldown),3);
 cooldown.step(26); // 416 ms after the check on the final round; still inside 460 ms
 fire(cooldown,'pointerdown');assert.equal(count(cooldown),3,'fresh press is blocked during cooldown');
 cooldown.step(20);assert.equal(count(cooldown),3,'already-held blocked press does not fire when cooldown expires');
 fire(cooldown,'pointerup');fire(cooldown,'pointerdown');fire(cooldown,'pointerup');cooldown.step(8);
 assert.equal(count(cooldown),6,'new press starts another burst after cooldown');

 const separate=await start();
 toggle(separate,'blaster');
 choose(separate,'ballistic');
 fire(separate,'pointerdown');separate.step(52);fire(separate,'pointerup');
 assert.equal(count(separate),4,'Ballistic retains its ordinary repeat independently of Blaster Burst');
 separate.step(30);assert.equal(count(separate),4,'ordinary hold stops on release');
 choose(separate,'blaster');
 fire(separate,'pointerdown');fire(separate,'pointerup');separate.step(8);
 assert.equal(count(separate),7,'switching back remembers each gun’s own mode');

 for(const [why,selectors] of [
  ['slow',q=>{choose(q,'blaster');q.step(20);choose(q,'blaster');}],
  ['cross-gun',q=>{choose(q,'blaster');q.step(6);choose(q,'ballistic');q.step(6);choose(q,'blaster');}],
  ['keyboard/assistive',q=>{q.change('blaster');q.change('blaster');}],
 ]){
  const q=await start();selectors(q);
  assert.equal(count(q),0);
  fire(q,'pointerdown');fire(q,'pointerup');q.step(12);
  assert.equal(count(q),1,`${why} selection does not toggle Burst`);
 }
 for(const [why,interruption,after] of [
  ['switch',q=>q.change('ballistic')],
  ['pause',q=>q.key('keydown','KeyP'),q=>q.open('resume')],
  ['blur',q=>q.blur(),q=>q.open('resume')],
  ['hide',q=>q.hide(true),q=>{q.hide(false);q.open('resume');}],
  ['reset',q=>q.reset()],
 ]){
  const q=await start();toggle(q,'blaster');
  fire(q,'pointerdown');assert.equal(count(q),1);
  interruption(q);after?.(q);
  if(why==='switch'){
   fire(q,'pointerdown');fire(q,'pointerup');
   assert.equal(count(q),1,'switch cannot skip a started cooldown');
  }
  q.step(48);
  assert.equal(count(q),why==='reset'?0:1,`${why} cancels pending rounds`);
 }
 console.log('PASS selector double-tap for both guns, independent modes and live aim, staggered spread, cooldown/fresh press and lifecycle cancellation.');
})().catch(e=>{console.error(e);process.exitCode=1;});
