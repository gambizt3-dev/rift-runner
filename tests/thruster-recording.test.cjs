'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {setup,tick}=require('./ballistic.test.cjs');
const thrusterBytes=Buffer.from('fixed rocket MP3 mock bytes'),musicAsset=Buffer.from('independent music mock bytes');
const reply=bytes=>async()=>({ok:true,arrayBuffer:async()=>Uint8Array.from(bytes).buffer});
const fixture=(p={})=>setup({thrusterBytes,thrusterFetch:reply(thrusterBytes),musicAsset,musicFetch:reply(musicAsset),...p});
const release=q=>q.outside('pointerup',{pointerId:77});
const press=(q,id='test-engine')=>q.testEngine(id,'pointerdown');
test('recorded rocket shares one held voice with Hangar tests, does not replace guns/music, and stops on lifecycle',async()=>{
 const q=fixture();assert.equal(q.thrusterFetches.length,0);
 q.open('start');await tick();q.step();
 assert.equal(q.thrusterFetches.length,1);assert.equal(q.thrusterVoices.length,0,'decode/preload does not autoplay');
 assert.equal(q.musicVoices.length,1,'ambient loop remains independent');
 q.key('keydown','KeyD');q.step();
 const first=q.thrusterVoices[0];assert(first);assert.equal(first.loopStart,0);assert.equal(first.loopEnd,4.10);
 assert.equal(first.offset,0);assert.equal(first.level.gain.ramps[0][0],3*(.122*1.8));
 q.key('keyup','KeyD');q.key('keydown','KeyA');q.step(4);assert.equal(q.thrusterVoices.length,1,'reversal reuses source');
 q.click('fire-button');assert.ok(q.played.includes('blaster:1'));assert.equal(q.thrusterVoices.length,1);assert.equal(q.musicVoices.length,1);
 q.key('keyup','KeyA');q.step();
 assert.equal(first.level.gain.targets.at(-1)[0],0);assert.equal(q.inspect().thruster.driving,false);
 q.step(15);assert.equal(first.disconnected,true);assert.equal(first.stops.length,1);
 press(q);q.step(65);assert.equal(q.inspect().thruster.driving,true,'Settings test lasts for the whole hold');
 release(q);q.click('test-engine',{detail:1});assert.equal(q.inspect().thruster.driving,false);
 q.step(16);assert.equal(q.thrusterVoices.length,2,'compatibility click cannot restart test');
 q.click('open-hangar');press(q,'hangar-test-engine');const hangar=q.thrusterVoices.at(-1);
 assert.equal(hangar.level.gain.ramps[0][0],3*(.08*1.8));
 q.step(170);assert.equal(q.inspect().thruster.level,.2,'Hangar hold progressively ramps');
 assert.ok(Math.abs(hangar.level.gain.targets.at(-1)[0]-1.08)<1e-9);
 q.outside('pointercancel',{pointerId:77});assert.equal(q.inspect().thruster.driving,false);
 q.click('close-hangar');assert.equal(hangar.disconnected,true);
 q.key('keydown','KeyD');q.step();let voice=q.thrusterVoices.at(-1);q.reset();q.step(16);
 assert.equal(voice.disconnected,true);assert.equal(q.inspect().thruster,null);
 q.key('keydown','KeyD');q.step();voice=q.thrusterVoices.at(-1);
 q.click('test-phone-audio');assert.equal(voice.disconnected,true);
 q.key('keyup','KeyD');q.native[0].onended();q.step();assert.equal(q.inspect().thruster,null);
 press(q);q.mute();assert.equal(q.inspect().thruster,null);q.mute(false);q.step();assert.equal(q.inspect().thruster,null,'no stale held test after unmute');
 press(q);assert(q.inspect().thruster.driving);q.blur();q.step(16);assert.equal(q.inspect().thruster,null);
 q.open('resume');q.step();q.key('keydown','KeyD');q.step();assert(q.inspect().thruster.recorded);
 q.hide(true);assert.equal(q.inspect().thruster,null);q.hide(false);q.step();assert.equal(q.thrusterFetches.length,1);
 q.open('resume');await tick();q.key('keydown','KeyD');q.step();assert.equal(q.thrusterVoices.at(-1).buffer.id,2);assert.equal(q.thrusterFetches.length,2);
});
test('cold/failed sample falls back and decode never restarts a released press or an old context',async()=>{
 const q=fixture({thrusterDecodePending:true});
 press(q);q.step(30);assert.equal(q.graphs.length,0,'cold iOS pointerdown cannot unlock');
 release(q);await tick();assert.equal(q.graphs.length,1);assert.equal(q.inspect().thruster,null,'no post-release pulse');
 press(q);assert.equal(q.inspect().thruster.recorded,undefined);const synth=q.inspect().thruster;
 assert.equal(synth.out.gain.ramps[0][0],.154*3);assert.equal(synth.out.gain.targets[0][0],.122*3);
 const sample=q.decodes.find(x=>x.name==='thruster');sample.finish();q.step(3);assert.equal(q.inspect().thruster,synth,'no cold mid-press layer switch');
 release(q);q.step(16);press(q);assert.equal(q.thrusterVoices.length,1,'next distinct hold uses buffered recording');
 q.hide(true);q.hide(false);q.open('start');await tick();
 q.decodes.find(x=>x.name==='thruster'&&x.id===2).fail();
 q.key('keydown','KeyD');q.step();assert.equal(q.inspect().thruster.recorded,undefined);
 const padded=fixture({thrusterDuration:4.14});padded.open('start');await tick();padded.key('keydown','KeyD');padded.step();
 const nonGapless=padded.thrusterVoices[0];assert.ok(nonGapless);assert.equal(nonGapless.loopStart,1105/32000);
 assert.ok(Math.abs(nonGapless.loopEnd-nonGapless.loopStart-4.1)<1e-8);
 const invalid=fixture({thrusterDuration:2});invalid.open('start');await tick();invalid.key('keydown','KeyD');invalid.step();
 assert.equal(invalid.thrusterVoices.length,0);assert.equal(invalid.inspect().thruster.recorded,undefined);
});

test('cold direct Carrier Hangar shows sound action and opens the real loop on its next held touch',async()=>{
 const q=fixture({address:{search:'?hangar=carrier'},hangarAudioUI:true});
 const arm=q.el['hangar-engine-audio'],status=q.el['hangar-engine-status'],button=q.el['hangar-test-engine'];
 assert.ok(q.el.hangar.open);assert.equal(q.graphs.length,0,'no autoplay from a new document');
 assert.equal(arm.hidden,false);assert.match(status.textContent,/Tap Enable sound/);
 press(q,'hangar-test-engine');q.step(28);
 assert.equal(q.graphs.length,0,'cold touch-down is not WebKit activation');
 assert.equal(q.el['hangar-canopy-rig'].dataset.engineTest,'held','visuals still respond');
 q.outside('touchend',{changedTouches:[{target:button}],touches:[]});await tick();
 assert.equal(q.inspect().enginePress,null);assert.equal(q.inspect().thruster,null,'never play a late pulse');
 assert.equal(q.graphs.length,1);assert.equal(arm.hidden,true);assert.match(status.textContent,/sound ready/);
 press(q,'hangar-test-engine');
 assert.equal(q.inspect().thruster?.recorded,true);
 assert.equal(q.thrusterVoices.length,1);
 release(q);assert.equal(q.inspect().thruster.driving,false);
 q.step(17);assert.equal(q.thrusterVoices[0].disconnected,true);
});

test('real Hangar opening or explicit sound action preps silently and respects deliberate mute',async()=>{
 const warm=fixture({hangarAudioUI:true});
 warm.menuAction('hangar');await tick();
 assert.equal(warm.graphs.length,1);
 assert.equal(warm.el['hangar-engine-audio'].hidden,true);
 assert.equal(warm.thrusterVoices.length,0);
 press(warm,'hangar-test-engine');
 assert.equal(warm.thrusterVoices.length,1,'first hold is ready in an already activated document');
 warm.click('close-hangar');
 assert.equal(warm.inspect().thruster,null);
 const q=fixture({address:{search:'?hangar=carrier'},hangarAudioUI:true});
 q.mute(true);assert.equal(q.el['hangar-engine-audio'].textContent,'Turn sound on');
 press(q,'hangar-test-engine');release(q);await tick();
 assert.equal(q.graphs.length,0);assert.equal(q.thrusterVoices.length,0);
 q.click('hangar-engine-audio',{isTrusted:false});assert.equal(q.graphs.length,0);
 q.click('hangar-engine-audio');await tick();
 assert.equal(q.el['sound-on'].checked,true);assert.equal(q.el['hangar-engine-audio'].hidden,true);
 assert.equal(q.thrusterVoices.length,0,'enable is silent by itself');
 press(q,'hangar-test-engine');assert.equal(q.thrusterVoices.length,1);
});

test('true release can retry a tentative iOS Hangar unlock; async success after release is fenced',async()=>{
 const q=fixture({address:{search:'?hangar=carrier'},hangarAudioUI:true,userActivation:{hasBeenActive:true},resumePending:true});
 press(q,'hangar-test-engine');assert.equal(q.resumes.length,1);
 release(q);assert.equal(q.resumes.length,2,'genuine release retries the tentative down request without waiting 420ms');
 q.resumes[0]();await tick();q.resumes[1]();await tick();
 assert.equal(q.inspect().thruster,null);assert.equal(q.thrusterVoices.length,0);
 assert.equal(q.el['hangar-engine-audio'].hidden,true);
 press(q,'hangar-test-engine');assert.equal(q.thrusterVoices.length,1);
 q.hide(true);assert.equal(q.inspect().thruster,null);
});

test('Hangar uses two feathered nozzles with subtle exhausted particles and a reduced-motion fallback',()=>{
 const path=require('node:path'),fs=require('node:fs');
 const root=['../dist','..'].map(f=>path.join(__dirname,f)).find(f=>fs.existsSync(path.join(f,'index.html')));
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8'),css=fs.readFileSync(path.join(root,'style.css'),'utf8');
 assert.match(html,/<use href="#hangar-exhaust-nozzle" x="204" y="279"\/><use href="#hangar-exhaust-nozzle" x="276" y="279"\/>/);
 for(const id of ['core','blue','smoke']){
  const gradient=html.match(new RegExp('<radialGradient id="hangar-exhaust-'+id+'">([^<]*(?:<stop[^>]*>)*[^<]*)</radialGradient>'));
  assert.ok(gradient);assert.match(gradient[1],/offset="1"[^>]*stop-opacity="0"/);
 }
 assert.match(html,/<g class="hangar-exhaust-smoke"><use href="#hangar-nozzle-smoke"/);
 assert.match(html,/<g class="hangar-exhaust-sparks"><use href="#hangar-nozzle-sparks"/);
 assert.match(css,/engine-test=releasing[^}]*opacity:0/);
 assert.match(css,/hangar-exhaust-sparks\{animation:none;display:none\}/);
 assert.match(html,/<button id="hangar-engine-audio"[^>]*type="button" hidden>Enable sound/);
});
