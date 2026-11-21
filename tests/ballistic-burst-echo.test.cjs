'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {setup,tick}=require('./ballistic.test.cjs');
const filename=['../dist/ballistic-burst-echo-sfx.js','../ballistic-burst-echo-sfx.js']
 .map(file=>path.join(__dirname,file)).find(file=>fs.existsSync(file));
assert.ok(filename,'packaged echo asset');
const encoded=fs.readFileSync(filename,'utf8').match(/RIFT_BALLISTIC_BURST_ECHO_MP3_BASE64='([A-Za-z0-9+/=]+)'/)[1];
const echoAsset=Buffer.from(encoded,'base64');
assert.equal(echoAsset.toString('base64'),encoded,'canonical embedded audio');
assert.ok(echoAsset.length>4000&&echoAsset.length<10000,'small gameplay asset');
const ready=async(saved='ballistic',opts={})=>{
 const q=setup({saved,echoAsset,...opts});
 assert.equal(q.decodes.length,0,'decode begins only at unlock');
 q.open('start');await tick();return q;
};
const select=(q,gun)=>q.click('gun-'+gun,{detail:1,pointerType:'touch',pointerId:20});
const toggle=(q,gun='ballistic')=>{select(q,gun);q.step(6);select(q,gun);};
const fire=q=>{q.pointer('pointerdown');q.pointer('pointerup');};
const volley=q=>{fire(q);q.step(18);};
const count=(q,gun)=>q.played.filter(s=>s.startsWith(gun+':')).length;
(async()=>{
 const q=await ready();
 assert.deepEqual(q.decodes.map(x=>x.name),['blaster','ballistic','echo']);
 toggle(q);fire(q);
 assert.deepEqual(q.played,['ballistic:1','echo:1'],'first normal shot still fires before the layer');
 const first=q.echoes[0];
 assert.ok(Math.abs(first.startAt-.196)<1e-9,'delayed 100 ms');
 assert.deepEqual(first.level.gain.ramps,[[.32,first.startAt+.055],[0,first.startAt+.98]]);
 q.step(18);assert.equal(count(q,'ballistic'),6);assert.equal(q.echoes.length,1);
 assert.equal(q.native.length,0,'no separate mobile/player clip');
 q.step(34);assert.equal(first.disconnected,undefined,'tail extends past the original six shots');
 volley(q);assert.equal(first.disconnected,true,'a newer volley stops the old tail before a new one starts');assert.equal(count(q,'ballistic'),12);assert.equal(q.echoes.length,2,'one additional layer for next volley');
 assert.equal(q.decodes.filter(x=>x.name==='echo').length,1,'one embedded decode per AudioContext');
 for(const [why,action] of [
  ['weapon switch',x=>x.change('blaster')],['mode toggled off',x=>toggle(x)],
  ['pause',x=>x.key('keydown','KeyP')],['blur',x=>x.blur()],['hide',x=>x.hide(true)],
  ['reset',x=>x.reset()],['mute',x=>x.mute()],['native preview',x=>x.click('test-phone-audio')],
  ['audio interruption',x=>{const ctx=x.graphs[0];ctx.state='interrupted';ctx.handlers.statechange();}]
 ]){
  const c=await ready();toggle(c);fire(c);
  action(c); assert.equal(c.echoes[0].stops.at(-1),undefined,why+' stops pending layer immediately');
  assert.equal(c.echoes[0].disconnected,true,why+' disconnects layer');
  c.step(70);assert.equal(c.echoes.length,1,why+' starts no later layer');
 }
 const normal=await ready();fire(normal);
 normal.pointer('pointerdown');normal.step(65);normal.pointer('pointerup');
 assert.ok(count(normal,'ballistic')>4,'normal repeat still plays');assert.equal(normal.echoes.length,0);
 const energy=await ready('blaster');toggle(energy,'blaster');volley(energy);
 assert.equal(count(energy,'blaster'),6);assert.equal(energy.echoes.length,0);
 const failing=await ready('ballistic',{echoAsset:null});toggle(failing);volley(failing);
 assert.equal(count(failing,'ballistic'),6);assert.equal(failing.echoes.length,0);
 const late=await ready('ballistic',{echoDecodePending:true});toggle(late);fire(late);
 late.decodes.find(x=>x.name==='echo').finish();
 await tick();late.step(18);assert.equal(late.echoes.length,0,'decode during a volley cannot retroactively start layer');
 late.step(35);volley(late);assert.equal(late.echoes.length,1,'later fresh volley uses warmed data');
 const retired=await ready('ballistic',{echoDecodePending:true});toggle(retired);retired.hide(true);retired.hide(false);retired.open('resume');await tick();
 retired.decodes.find(x=>x.name==='echo'&&x.id===1).finish();
 volley(retired);assert.equal(retired.echoes.length,0,'old context cannot arm a new context');
 retired.decodes.find(x=>x.name==='echo'&&x.id===2).finish();
 retired.step(35);volley(retired);assert.deepEqual(retired.echoes.map(x=>x.buffer.id),[2]);
 const fallback=await ready('ballistic',{missing:true,echoDecodePending:true});
 fallback.decodes.find(x=>x.name==='echo').fail();toggle(fallback);volley(fallback);
 assert.equal(fallback.inspect().practiceShots,6);
 assert.equal(fallback.played.filter(x=>x==='synth-tone').length,6);
 assert.equal(fallback.echoes.length,0,'decode rejection leaves synth fallback unchanged');
 console.log('PASS one audible delayed layer with longer tail only for Ballistic Burst; six original shots, cache, no mobile duplicate or stale/cancelled playback.');
})().catch(e=>{console.error(e);process.exitCode=1;});
