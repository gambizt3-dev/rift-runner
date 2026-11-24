'use strict';
const {withFlightFixture,openFixture}=require('./fixture-flight.cjs');
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const gamePath=['../dist/game.js','../game.js','game.js'].map(f=>path.join(__dirname,f)).find(f=>fs.existsSync(f));
const text=fs.readFileSync(gamePath,'utf8');
const instrumented=text.replace(/\}\)\(\);\s*$/,"globalThis.inspect=()=>({audio,master,openingAudio,blaster,voices,state,p,cones,shots,thruster,watchSound,enginePress,movePtr,moveKey,autoLock,practiceHits,practiceShots,arena,sparks,rings});globalThis.fixture={watch:()=>{state='watch';watchSound=false;duelResult=null;p={x:0,y:0};pirateCapitals=[{x:10,y:20,hp:5,driveBurn:.6}];syncWatchSound();},field:()=>{state='play';flightMode={...flightMode,tileApproach:{}};},cue:npcBattleShot,updateThruster,sweptCircle,narrow:(list)=>{cones=list;shots=[];},ball:(b)=>shots.push(b)};})();");
function setup({pending=false,decodePending=false,initialSound='on'}={}){
 let raf,clock=0,gesture=false,boxTarget=null;
 const events={},keys={},sounds=[],resumes=[],notes=[],contexts=[],decodes=[],storage=new Map([['rift-runner.sound.v1',initialSound]]);
 const elem=()=>({handlers:{},dataset:{},styles:{},hidden:false,checked:true,style:{setProperty(){}},addEventListener(k,f){this.handlers[k]=f;},setAttribute(k,v){this[k]=v;},getBoundingClientRect:()=>({width:480,height:720,left:0,top:0}),querySelector:()=>({focus(){}}),querySelectorAll:()=>Array.from({length:4},()=>({textContent:''})),focus(){},setPointerCapture(){},releasePointerCapture(){}});
 const draw=new Proxy({createRadialGradient:()=>({addColorStop(){}}),createLinearGradient:()=>({addColorStop(){}})},{get:(a,k)=>k in a?a[k]:()=>{}});
 const canvas=Object.assign(elem(),{getContext:()=>draw}),el={game:canvas,hud:elem(),overlay:elem(),'main-menu':elem(),'sound-on':elem(),'test-sound':elem(),'test-engine':elem(),'cross-watch-sound':elem(),'sound-status':elem(),'move-pad':elem(),'aim-pad':elem(),'fire-button':elem(),'aim-mode':elem(),'flight-deck':elem(),'pause-flight':elem()};
 const buttons={};for(const d of ['n','ne','e','se','s','sw','w','nw'])buttons[d]={dataset:{move:d},closest:()=>buttons[d]};
 el['move-pad'].contains=b=>Object.values(buttons).includes(b);
 const document={activeElement:canvas,hidden:false,getElementById:k=>el[k],elementFromPoint:()=>boxTarget,addEventListener:(k,f)=>events[k]=f};
 const param=()=>({value:0,calls:[],setValueAtTime(...a){this.value=a[0];this.calls.push(['set',...a]);},linearRampToValueAtTime(...a){this.calls.push(['ramp',...a]);},exponentialRampToValueAtTime(...a){this.calls.push(['exp',...a]);},setTargetAtTime(...a){this.calls.push(['target',...a]);},cancelScheduledValues(t){this.calls.push(['cancel',t]);},cancelAndHoldAtTime(t){this.calls.push(['hold',t]);}});
 class Audio {
  constructor(){assert(gesture);this.state='suspended';this.destination={};this.sampleRate=8000;this.closedCount=0;this.id=contexts.length+1;contexts.push(this);}
  get currentTime(){return clock/1000;}
  resume(){assert(gesture);if(!pending){this.state='running';return Promise.resolve();}return new Promise(resolve=>resumes.push(()=>{this.state='running';resolve();}));}
  decodeAudioData(){const buffer={duration:.26,recorded:true,id:this.id};if(!decodePending)return Promise.resolve(buffer);return new Promise(resolve=>decodes.push(()=>resolve(buffer)));}
  close(){this.closedCount++;return Promise.resolve();}
  createGain(){return {gain:param(),connect(){},disconnect(){this.disconnected=true;}};}
  createBiquadFilter(){return {frequency:param(),connect(){},disconnect(){}};}
  createOscillator(){const n={frequency:param(),connect(){},disconnect(){},start(){notes.push(this);},stop(){this.stopped=true;this.onended?.();}};return n;}
  createBufferSource(){return{connect(){},disconnect(){},start(){sounds.push(this.buffer?.recorded?'blaster:'+this.buffer.id:'noise');},stop(){this.onended?.();}};}
  createBuffer(ch,n){const b=new Float32Array(n);return {getChannelData:()=>b};}
 }
 const window={AudioContext:Audio,RIFT_BLASTER_MP3_BASE64:'AAECAwQFBgc=',devicePixelRatio:1,matchMedia:()=>({matches:false}),addEventListener:(k,f)=>keys[k]=f};
 const sandbox={window,document,atob,performance:{now:()=>clock},localStorage:{getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v)},requestAnimationFrame:f=>{raf=f;return 1;}};
 vm.runInNewContext(withFlightFixture(instrumented),sandbox);
 const user=f=>{gesture=true;try{return f();}finally{gesture=false;}};
 const step=(n=1)=>{while(n--)raf(clock+=16);};
 const open=(name,isTrusted=true)=>user(()=>openFixture(sandbox,el.overlay,name,{isTrusted,duel:true}));
 const point=(act,d,id=1)=>user(()=>{boxTarget=buttons[d];el['move-pad'].handlers[act]({type:act,isTrusted:true,pointerType:'touch',target:buttons[d],pointerId:id,button:0,clientX:50,clientY:50,preventDefault(){}});});
 const key=(act,code,options={})=>user(()=>keys[act]({type:act,code,isTrusted:true,repeat:false,preventDefault(){},...options}));
 const click=(id,isTrusted=true)=>user(()=>el[id].handlers.click({type:'click',isTrusted}));
 const hold=()=>user(()=>el['test-engine'].handlers.pointerdown({type:'pointerdown',isTrusted:true,button:0,pointerType:'mouse',pointerId:76}));
 const mute=on=>user(()=>{el['sound-on'].checked=!on;el['sound-on'].handlers.change({type:'change',isTrusted:true});});
 const hide=on=>{document.hidden=on;events.visibilitychange();};
 return {get:sandbox.inspect,fixture:sandbox.fixture,el,step,open,point,key,click,hold,mute,hide,notes,resumes,sounds,contexts,decodes,storage,page:name=>keys[name]({persisted:true})};
}
const later=()=>new Promise(setImmediate);
(async()=>{
 const watch=setup(),offWatch=setup({initialSound:'off'}),pendingWatch=setup({pending:true});
 pendingWatch.fixture.watch();pendingWatch.click('cross-watch-sound');pendingWatch.click('cross-watch-sound');
 pendingWatch.resumes[0]();await later();pendingWatch.fixture.updateThruster();
 assert.equal(pendingWatch.get().watchSound,false,'second tap cancels pending watch sound');
 assert.equal(pendingWatch.get().thruster,null);
 for(const fixture of [watch,offWatch])fixture.fixture.watch();
 watch.fixture.cue(12,12,true);watch.fixture.updateThruster();
 assert.equal(watch.contexts.length,0);assert.equal(watch.notes.length,0);
 watch.click('cross-watch-sound',false);
 assert.equal(watch.contexts.length,0,'synthetic watch click cannot unlock');
 offWatch.click('cross-watch-sound');
 assert.equal(offWatch.contexts.length,0,'watch opt-in does not override global mute');
 watch.click('cross-watch-sound');await later();
 assert.equal(watch.get().watchSound,true);
 assert.equal(watch.el['cross-watch-sound']['aria-pressed'],'true');
 watch.fixture.updateThruster();assert.ok(watch.get().thruster,'one nearby NPC engine bed');
 const prior=watch.notes.length;
 for(let i=0;i<4;i++)watch.fixture.cue(12,12,true);
 assert.equal(watch.notes.length,prior+8,'each audible pirate shot gets its own two-tone cue');
 watch.fixture.cue(2000,2000,false);assert.equal(watch.notes.length,prior+8,'distant shot is quiet');
 watch.click('cross-watch-sound');
 assert.equal(watch.get().thruster,null,'preview mute stops engine immediately');
 watch.fixture.cue(12,12,true);assert.equal(watch.notes.length,prior+8);
 assert.equal(watch.storage.get('rift-runner.sound.v1'),'on','preview listener never changes global setting');
 watch.click('cross-watch-sound');await later();watch.hide(true);watch.hide(false);
 assert.equal(watch.get().watchSound,false,'backgrounding requires another explicit Watch tap');
 const q=setup();assert.equal(q.contexts.length,0);
 q.open('start');await later();const first=q.contexts[0],out=q.get().master;
 q.click('fire-button');assert.deepEqual(q.sounds,['blaster:1']);
 q.point('pointerdown','n');q.step(5);assert(q.get().thruster);
 q.hide(true);assert.equal(first.state,'running','fixture reproduces misleading JS running status');
 assert.equal(first.closedCount,1);assert.equal(out.gain.value,0);assert(out.disconnected);
 assert.equal(q.get().audio,null);assert.equal(q.get().thruster,null);assert.equal(q.get().state,'pause');
 q.page('pagehide');assert.equal(first.closedCount,1,'dual events idempotent');
 q.hide(false);q.page('pageshow');q.step(6);
 assert.equal(q.contexts.length,1,'foreground events only update status; do not unlock');
 assert.match(q.el['sound-status'].textContent,/Resume flight/);
 q.click('test-engine',false);assert.equal(q.contexts.length,1,'synthetic click cannot unlock');
 q.open('resume');await later();assert.equal(q.contexts.length,2);assert.equal(q.get().state,'play');
 q.step(14);q.click('fire-button');assert.deepEqual(q.sounds,['blaster:1','blaster:2']);
 q.contexts[1].state='interrupted';q.hold();await later();
 assert.equal(q.contexts[1].closedCount,1);assert.equal(q.contexts.length,3);assert(q.get().thruster?.driving);
 q.click('test-sound');assert.deepEqual(q.sounds,['blaster:1','blaster:2','blaster:3']);
 q.mute(true);q.hide(true);q.hide(false);q.click('test-sound');assert.equal(q.contexts.length,3);assert.equal(q.storage.get('rift-runner.sound.v1'),'off');
 const pauseHeader=setup(),pauseButton=pauseHeader.el['pause-flight'];
 assert.equal(pauseButton.disabled,true,'menu starts with Pause inactive');
 pauseHeader.open('practice',false);assert.equal(pauseButton.disabled,false);
 pauseHeader.click('pause-flight',false);assert.equal(pauseHeader.get().state,'play','synthetic click cannot pause');
 pauseHeader.click('pause-flight');assert.equal(pauseHeader.get().state,'pause');assert.equal(pauseButton.disabled,true);
 assert.equal(pauseHeader.contexts.length,0,'intentional Pause does not start audio');
 pauseHeader.click('pause-flight');assert.equal(pauseHeader.get().state,'pause','header Pause does not resume');
 pauseHeader.key('keydown','KeyP',{metaKey:true});assert.equal(pauseHeader.get().state,'pause','Cmd+P remains a browser shortcut');
 pauseHeader.key('keydown','Escape',{repeat:true});assert.equal(pauseHeader.get().state,'pause','held Escape cannot resume');
 pauseHeader.hide(true);pauseHeader.key('keydown','KeyP');assert.equal(pauseHeader.get().state,'pause','hidden input cannot resume');
 pauseHeader.hide(false);pauseHeader.page('pageshow');assert.equal(pauseHeader.contexts.length,0);
 pauseHeader.key('keydown','KeyP');await later();assert.equal(pauseHeader.get().state,'play');assert.equal(pauseButton.disabled,false);
 assert.equal(pauseHeader.contexts.length,1,'trusted keyboard resume restores audio');
 pauseHeader.hide(true);pauseHeader.page('pagehide');pauseHeader.hide(false);
 pauseHeader.key('keydown','Escape');assert.equal(pauseHeader.get().state,'pause','parked route cannot resume');
 pauseHeader.page('pageshow');pauseHeader.key('keydown','Escape');await later();assert.equal(pauseHeader.get().state,'play');
 assert.equal(pauseHeader.contexts.length,2,'trusted Escape restores a fresh audio context after park');
 const html=fs.readFileSync(path.join(__dirname,'../dist/index.html'),'utf8');
 const css=fs.readFileSync(path.join(__dirname,'../dist/style.css'),'utf8');
 assert.match(html,/<button id="pause-flight"[^>]+aria-label="Pause flight"[^>]*>/);
 assert.match(html,/<button id="return-main-menu"[^>]*>Return to Carrier<\/button>/);
 assert.match(css,/\.flight-pause\{[\s\S]*?width:44px;height:44px/);
 assert.match(css,/@media\(max-width:420px\)\{\s*\.topline\{display:grid;grid-template-columns:minmax\(0,1fr\) auto/);
 const touch=setup();touch.open('start',false);touch.point('pointerdown','n');touch.step(3);assert.equal(touch.contexts.length,0);
 touch.point('pointerup','n');assert.equal(touch.contexts.length,1,'trusted touch release unlocks');
 const pending=setup({pending:true,decodePending:true});pending.click('test-sound');
 assert.equal(pending.resumes.length,1);assert.equal(pending.decodes.length,1);
 const stale=pending.contexts[0];pending.hide(true);pending.hide(false);pending.hold();
 assert.equal(stale.closedCount,1);assert.equal(pending.contexts.length,2);
 pending.resumes[0]();pending.decodes[0]();await later();
 assert.deepEqual(pending.sounds,[]);assert.equal(pending.get().thruster,null);assert.equal(pending.get().blaster.buffer,null);
 pending.decodes[1]();pending.resumes[1]();await later();assert(pending.get().thruster?.driving);
 pending.click('test-sound');assert.deepEqual(pending.sounds,['blaster:2']);assert.equal(pending.get().shots.length,0);
 const throttle=setup({pending:true});throttle.click('test-engine');throttle.contexts[0].state='interrupted';
 throttle.click('test-engine');assert.equal(throttle.contexts.length,1);
 throttle.step(28);throttle.click('test-engine');assert.equal(throttle.contexts.length,2);
 throttle.contexts[1].state='interrupted';throttle.click('test-engine');assert.equal(throttle.contexts.length,2);
 const muted=setup({initialSound:'off'});muted.click('test-sound');muted.page('pagehide');muted.page('pageshow');
 assert.equal(muted.contexts.length,0);assert.equal(muted.el['sound-on'].checked,false);
 console.log('PASS iOS fresh audio context after backdrop even falsely running, interrupted throttle, trusted release, stale decode/resume no sound, pagehide idempotent, mute, independent thruster/recorded blaster.');
})();
