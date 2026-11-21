'use strict';
const fs=require('node:fs'),path=require('node:path'),test=require('node:test'),assert=require('node:assert/strict');
const {setup,tick}=require('./ballistic.test.cjs');
const dir=['../dist','..'].map(v=>path.join(__dirname,v)).find(v=>fs.existsSync(path.join(v,'game.js')));
const html=fs.readFileSync(path.join(dir,'index.html'),'utf8');
const sound=fs.readFileSync(path.join(dir,'ballistic-burst-echo-sfx.js'),'utf8').match(/RIFT_BALLISTIC_BURST_ECHO_MP3_BASE64='([^']+)'/)[1];
const echoAsset=Buffer.from(sound,'base64');
const fit=(primary,secondary)=>JSON.stringify({version:1,primary,secondary});
const choose=(q,id)=>q.click('gun-'+id,{detail:1,pointerType:'touch',pointerId:10});
const ptr=(q,type,id=3)=>q.pointer(type,id);
const tap=q=>{ptr(q,'pointerdown');ptr(q,'pointerup');};
const count=q=>q.inspect().practiceShots;
const fitKey='rift-runner.fighter-fit.v1';
const visible=q=>['blaster','ballistic','ak77'].filter(id=>q.el['gun-'+id].hidden===false);
async function launch(opt={}){const q=setup({echoAsset,...opt});q.open('start');await tick();q.inspect().cones.splice(0);Object.assign(q.inspect().p,{x:380,y:360,aim:0});return q;}
test('AK77 fits either slot without changing defaults, persisted old fits or two-button rack',async()=>{
 assert.match(html,/<select id="fit-primary"[^>]*>[^<]*(?:<option[^>]*>[^<]*<\/option>)*<option value="ak77">AK77 Gatling Ballistic<\/option><\/select>/);
 assert.match(html,/<select id="fit-secondary"[^>]*>[^<]*(?:<option[^>]*>[^<]*<\/option>)*<option value="ak77">AK77 Gatling Ballistic<\/option><\/select>/);
 const q=await launch();
 assert.deepEqual(visible(q),['blaster','ballistic']);
 assert.equal(q.inspect().fighterLoadout.weapon,'blaster');
 choose(q,'ak77');assert.equal(q.inspect().fighterLoadout.weapon,'blaster','not mounted, not selectable');
 q.click('open-hangar');q.fit('secondary','ak77');q.click('close-hangar');
 assert.deepEqual(visible(q),['blaster','ak77']);
 assert.equal(q.storage.get(fitKey),fit('blaster','ak77'));
 assert.match(q.el['fit-secondary-stat'].textContent,/2 dmg\/shot.*12 per burst.*Weight 9.*Light target push/);
 assert.equal(q.inspect().p.weight,102);
 q.key('keydown','Digit2');assert.equal(q.inspect().fighterLoadout.weapon,'ak77');
 q.click('open-hangar');q.fit('primary','ak77');q.click('close-hangar');
 assert.equal(q.rack.firstElementChild,q.el['gun-ak77']);
 assert.equal(q.storage.get(fitKey),fit('ak77','blaster'),'same weapon switches slots without duplicates');
 const reload=await launch({savedFit:q.storage.get(fitKey),saved:'ak77'});
 assert.equal(reload.inspect().fighterLoadout.weapon,'ak77');assert.deepEqual(visible(reload),['blaster','ak77']);
 const old=await launch({savedFit:fit('ballistic',null),saved:'ballistic'});
 assert.deepEqual(visible(old),['ballistic']);assert.equal(old.inspect().fighterLoadout.weapon,'ballistic');
});
test('fixed AK77 burst: 12 timed ballistic rounds, no echo or auto-repeat, 1.15s cooldown',async()=>{
 const q=await launch({savedFit:fit('ak77','blaster')});
 choose(q,'ak77');q.step(5);choose(q,'ak77');
 assert.equal(q.inspect().burstModes.ak77,true);assert.equal(count(q),0);
 ptr(q,'pointerdown');assert.equal(count(q),1);
 q.step(2);assert.equal(count(q),1);
 q.step(1);assert.equal(count(q),2,'second shot near 45ms');
 q.step(27);assert.equal(count(q),11);
 q.step(1);assert.equal(count(q),12,'final round after ~11*45ms');
 assert.equal(q.inspect().burstCooldown,1.15);
 assert.ok(q.inspect().shots.every(x=>x.weapon==='ak77'&&x.damage===2));
 assert.equal(q.played.filter(x=>x==='ballistic:1').length,12);
 assert.equal(q.echoes.length,0);
 ptr(q,'pointerup');
 q.click('fire-button',{detail:1,pointerId:99});assert.equal(count(q),12,'no compatibility click volley');
 q.step(70);ptr(q,'pointerdown');assert.equal(count(q),12,'cannot fire before 1.15s cooldown');
 q.step(20);assert.equal(count(q),12,'held input does not auto-fire after cooldown');
 ptr(q,'pointerup');
 q.key('keydown','Space');q.step(31);q.key('keydown','Space',true);q.step(90);q.key('keydown','Space',true);
 assert.equal(count(q),24,'holding and key-repeat do not start another volley');
 q.key('keyup','Space');
 q.key('keydown','Space');q.key('keyup','Space');q.step(31);assert.equal(count(q),36);
});
test('switch and lifecycle cancel pending AK77 rounds; canceled volley retains long cooldown',async()=>{
 for(const [name,op,expected] of [
  ['switch',q=>choose(q,'blaster'),1],
  ['pause',q=>q.key('keydown','KeyP'),1],['hangar',q=>q.click('open-hangar'),1],
  ['hide',q=>q.hide(true),1],['reset',q=>q.reset(),0]
 ]){
  const q=await launch({savedFit:fit('ak77','blaster')});tap(q);assert.equal(count(q),1);
  op(q);
  if(name==='switch'){
   assert.equal(q.inspect().burstCooldown,1.15);tap(q);assert.equal(count(q),1);
  }
  q.step(35);assert.equal(count(q),expected,name+' cancels rest of volley');
 }
});

test('target knockback is separate from owner recoil and distinct per projectile',async()=>{
 const deltas={};
 for(const id of ['blaster','ballistic','ak77']){
  const q=setup({savedFit:fit(id,null), saved:id});
  q.open('start');await tick();
  const {p,cones}=q.inspect(),cone=cones[0];cones.splice(1);
  Object.assign(p,{x:240,y:360,vx:0,vy:0,aim:0});
  Object.assign(cone,{x:300,y:360,vx:0,vy:0,spin:0});
  tap(q);q.step(4);
  assert.equal(q.inspect().practiceHits,1,'one target hit for the comparison');
  deltas[id]=cone.vx;
 }
 assert.ok(deltas.ak77<deltas.blaster && deltas.blaster<deltas.ballistic,JSON.stringify(deltas));
});
