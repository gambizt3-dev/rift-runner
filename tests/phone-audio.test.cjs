'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const gamePath=['../dist/game.js','../game.js','game.js'].map(f=>path.join(__dirname,f)).find(f=>fs.existsSync(f));
const text=fs.readFileSync(gamePath,'utf8');
const instrumented=text.replace(/\}\)\(\);\s*$/,"globalThis.inspect=()=>({audio,master,openingAudio,blaster,voices,nativePreview,phoneAudioOn,state,p,cones,shots,thruster,enginePress,movePtr,moveKey,autoLock,practiceHits,practiceShots,arena,sparks,rings});globalThis.fixture={sweptCircle,narrow:(list)=>{cones=list;shots=[];},ball:(b)=>shots.push(b)};})();");
function setup({pending=false,decodePending=false,initialSound='on',initialPhone='off',platform='supported',reject=false}={}){
 let raf,clock=0,gesture=false,boxTarget=null;
 const events={},keys={},sounds=[],resumes=[],notes=[],contexts=[],decodes=[],native=[],category=[],timers=new Map(),storage=new Map([['rift-runner.sound.v1',initialSound],['rift-runner.iphone-audio.v1',initialPhone]]);
 const elem=()=>({handlers:{},dataset:{},styles:{},hidden:false,checked:true,style:{setProperty(){}},addEventListener(k,f){this.handlers[k]=f;},getBoundingClientRect:()=>({width:480,height:720,left:0,top:0}),querySelector:()=>({focus(){}}),querySelectorAll:()=>Array.from({length:4},()=>({textContent:''})),focus(){},setPointerCapture(){},releasePointerCapture(){}});
 const draw=new Proxy({createRadialGradient:()=>({addColorStop(){}}),createLinearGradient:()=>({addColorStop(){}})},{get:(a,k)=>k in a?a[k]:()=>{}});
 const canvas=Object.assign(elem(),{getContext:()=>draw}),el={game:canvas,hud:elem(),overlay:elem(),'sound-on':elem(),'test-sound':elem(),'test-engine':elem(),'sound-status':elem(),'phone-audio-tools':elem(),'iphone-audio':elem(),'test-phone-audio':elem(),'move-pad':elem(),'aim-pad':elem(),'fire-button':elem(),'aim-mode':elem(),'flight-deck':elem()};
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
 let currentCategory='auto',timerID=0;
 const session={get type(){return currentCategory;},set type(value){currentCategory=value;category.push(value);}};
 const nav=platform==='supported'?{userAgent:'iPhone',audioSession:session}:platform==='ios-native'?{userAgent:'iPhone'}:{userAgent:'Chrome Linux'};
 class Native {
  constructor(src){assert(gesture);this.src=src;this.record={paused:0,calls:0,node:this};native.push(this.record);}
  play(){assert(gesture,'native play occurs synchronously in trusted gesture');this.record.calls++;return reject?Promise.reject(Error('NotAllowedError')):new Promise(resolve=>{this.record.resolve=resolve;});}
  pause(){this.record.paused++;}
  removeAttribute(name){if(name==='src')this.src='';}
  load(){}
 }
 const window={navigator:nav,Audio:Native,setTimeout:f=>{timers.set(++timerID,f);return timerID;},clearTimeout:id=>timers.delete(id),AudioContext:Audio,RIFT_BLASTER_MP3_BASE64:'AAECAwQFBgc=',devicePixelRatio:1,matchMedia:()=>({matches:false}),addEventListener:(k,f)=>keys[k]=f};
 const sandbox={window,document,atob,performance:{now:()=>clock},localStorage:{getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v)},requestAnimationFrame:f=>{raf=f;return 1;}};
 vm.runInNewContext(instrumented,sandbox);
 const user=f=>{gesture=true;try{return f();}finally{gesture=false;}};
 const step=(n=1)=>{while(n--)raf(clock+=16);};
 const open=(name,isTrusted=true)=>user(()=>el.overlay.handlers.click({type:'click',isTrusted,pointerType:'touch',target:{closest:()=>({dataset:{rift:name}})}}));
 const point=(act,d,id=1)=>user(()=>{boxTarget=buttons[d];el['move-pad'].handlers[act]({type:act,isTrusted:true,pointerType:'touch',target:buttons[d],pointerId:id,button:0,clientX:50,clientY:50,preventDefault(){}});});
 const key=(act,code)=>user(()=>keys[act]({code,repeat:false,preventDefault(){}}));
 const click=(id,isTrusted=true)=>user(()=>el[id].handlers.click({type:'click',isTrusted}));
 const option=(on,isTrusted=true)=>user(()=>{el['iphone-audio'].checked=on;el['iphone-audio'].handlers.change({type:'change',isTrusted});});
 const mute=on=>user(()=>{el['sound-on'].checked=!on;el['sound-on'].handlers.change({type:'change',isTrusted:true});});
 const hide=on=>{document.hidden=on;events.visibilitychange();};
 return {get:sandbox.inspect,fixture:sandbox.fixture,el,step,open,point,key,click,mute,hide,notes,resumes,sounds,contexts,decodes,storage,native,category,option,timers,page:name=>keys[name]({persisted:true})};
}
const later=()=>new Promise(setImmediate);
(async()=>{
 const q=setup();
 assert.equal(q.el['phone-audio-tools'].hidden,false);
 assert.equal(q.el['iphone-audio'].checked,false);
 assert.deepEqual(q.category,[]);assert.equal(q.contexts.length,0);
 q.click('test-phone-audio');assert.equal(q.native.length,0);
 q.option(true,false);assert.equal(q.el['iphone-audio'].checked,false);assert.deepEqual(q.category,[]);
 q.option(true);assert.deepEqual(q.category,['playback']);assert.equal(q.storage.get('rift-runner.iphone-audio.v1'),'on');
 assert.equal(q.native.length,0,'setting is not autoplay');assert.equal(q.contexts.length,0,'setting does not start WebAudio');
 q.click('test-phone-audio');assert.equal(q.native.length,1);assert.equal(q.native[0].node.src,'./blaster-test.mp3');assert.equal(q.native[0].calls,1);assert.equal(q.native[0].node.loop,false);assert.equal(q.contexts.length,0);assert.equal(q.sounds.length,0);
 q.native[0].resolve();await later();assert.match(q.el['sound-status'].textContent,/started in browser/);assert.equal(q.get().shots.length,0);
 q.click('test-phone-audio');assert.equal(q.native.length,2);assert.equal(q.native[0].paused,1);
 q.hide(true);assert.equal(q.native[1].paused,1);assert.deepEqual(q.category,['playback','auto']);
 const afterHide=q.el['sound-status'].textContent;q.native[1].resolve();await later();assert.equal(q.el['sound-status'].textContent,afterHide);
 q.hide(false);q.page('pageshow');assert.deepEqual(q.category,['playback','auto']);
 q.open('start');await later();assert.deepEqual(q.category,['playback','auto','playback']);
 q.click('fire-button');assert.deepEqual(q.sounds,['blaster:1']);
 q.click('test-phone-audio');assert.equal(q.native.length,3);
 const prior=q.get().shots.length;q.click('fire-button');assert.equal(q.get().shots.length,prior+1);
 assert.deepEqual(q.sounds,['blaster:1'],'native preview never layers a Web Audio blaster');
 q.native[2].node.onended();q.click('fire-button');assert.deepEqual(q.sounds,['blaster:1','blaster:1']);
 q.click('test-phone-audio');q.mute(true);assert.equal(q.native[3].paused,1);assert.equal(q.category.at(-1),'auto');
 q.click('test-phone-audio');assert.equal(q.native.length,4);assert.match(q.el['sound-status'].textContent,/Sound off/);
 q.option(false);q.mute(false);assert.equal(q.category.at(-1),'auto');assert.equal(q.storage.get('rift-runner.iphone-audio.v1'),'off');
 const persisted=setup({initialPhone:'on'});assert.equal(persisted.el['iphone-audio'].checked,true);assert.deepEqual(persisted.category,[]);
 persisted.page('pageshow');assert.deepEqual(persisted.category,[]);persisted.click('test-sound');assert.deepEqual(persisted.category,['playback']);
 const noSession=setup({platform:'ios-native'});assert.equal(noSession.el['phone-audio-tools'].hidden,false);
 noSession.option(true);assert.match(noSession.el['sound-status'].textContent,/unavailable/);noSession.click('test-phone-audio');
 assert.equal(noSession.native.length,1);assert.deepEqual(noSession.category,[]);assert.equal(noSession.contexts.length,0);
 const desktop=setup({platform:'desktop'});assert.equal(desktop.el['phone-audio-tools'].hidden,true);
 const failed=setup({reject:true});failed.option(true);failed.click('test-phone-audio');await later();
 assert.match(failed.el['sound-status'].textContent,/did not start/);assert.equal(failed.native[0].paused,1);assert.equal(failed.get().nativePreview,null);
 console.log('PASS default-off, trusted supported category, restore on mute/hidden/off, no foreground autoplay, iOS native fallback and unsupported desktop, one direct media clip, stale/rejection handling, no doubled game sound.');
})();
