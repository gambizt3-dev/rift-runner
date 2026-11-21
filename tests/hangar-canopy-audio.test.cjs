'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const gamePath=['../dist/game.js','../game.js','game.js'].map(f=>path.join(__dirname,f)).find(f=>fs.existsSync(f));
const text=fs.readFileSync(gamePath,'utf8');
const instrumented=text.replace(/\}\)\(\);\s*$/,"globalThis.inspect=()=>({state,p,shots,thruster,engineTestUntil,movePtr,moveKey,autoLock});})();");
function setup({pending=false}={}){
 let raf,clock=0,gesture=false,boxTarget=null;
 const motion={matches:false,addEventListener(k,f){this[k]=f;}};const scheduled=[];
 const events={},keys={},sounds=[],resumes=[],notes=[],storage=new Map();
 const elem=()=>({handlers:{},dataset:{},styles:{},hidden:false,checked:true,setAttribute(k,v){this.styles[k]=v;},style:{setProperty(){}},addEventListener(k,f){this.handlers[k]=f;},getBoundingClientRect:()=>({width:480,height:720,left:0,top:0}),querySelector:()=>({focus(){}}),querySelectorAll:()=>Array.from({length:4},()=>({textContent:""})),focus(){},setPointerCapture(){},releasePointerCapture(){}});
 const draw=new Proxy({createRadialGradient:()=>({addColorStop(){}}),createLinearGradient:()=>({addColorStop(){}})},{get:(a,k)=>k in a?a[k]:()=>{}});
 const canvas=Object.assign(elem(),{getContext:()=>draw}),el={game:canvas,hud:elem(),overlay:elem(),'sound-on':elem(),'test-sound':elem(),'test-engine':elem(),'sound-status':elem(),'move-pad':elem(),'aim-pad':elem(),'fire-button':elem(),'aim-mode':elem(),'flight-deck':elem()};
 for(const id of ['screen-shake','hangar','open-hangar','close-hangar','hangar-title','hangar-canopy-rig','hangar-canopy-button','canopy-hint','hangar-test-engine'])el[id]=elem();
 el['hangar-canopy-rig'].dataset.canopy='closed';
 Object.assign(el.hangar,{open:false,showModal(){this.open=true;},close(){if(this.open){this.open=false;this.handlers.close?.();}}});
 const buttons={};for(const d of ['n','ne','e','se','s','sw','w','nw'])buttons[d]={dataset:{move:d},closest:()=>buttons[d]};
 el['move-pad'].contains=b=>Object.values(buttons).includes(b);
 const document={activeElement:canvas,hidden:false,getElementById:k=>el[k],elementFromPoint:()=>boxTarget,addEventListener:(k,f)=>events[k]=f};
 const param=()=>({value:0,calls:[],setValueAtTime(...a){this.value=a[0];this.calls.push(['set',...a]);},linearRampToValueAtTime(...a){this.calls.push(['ramp',...a]);},exponentialRampToValueAtTime(...a){this.calls.push(['exp',...a]);},setTargetAtTime(...a){this.calls.push(['target',...a]);},cancelScheduledValues(t){this.calls.push(['cancel',t]);},cancelAndHoldAtTime(t){this.calls.push(['hold',t]);}});
 class Audio {
  constructor(){assert(gesture);this.state='suspended';this.destination={};this.sampleRate=8000;}
  get currentTime(){return clock/1000;}
  resume(){assert(gesture);if(!pending){this.state='running';return Promise.resolve();}return new Promise(resolve=>resumes.push(()=>{this.state='running';resolve();}));}
  decodeAudioData(){return Promise.resolve({duration:.26,recorded:true});}
  createGain(){return {gain:param(),connect(){},disconnect(){}};}
  createBiquadFilter(){return {frequency:param(),connect(){},disconnect(){}};}
  createOscillator(){const n={frequency:param(),connect(){},disconnect(){},start(t){this.startAt=t;notes.push(this);if([84,116].includes(this.frequency.value)||[84,116].includes(this.frequency.calls[0]?.[1]))scheduled.push(this);},stop(t){if(t!==undefined){this.stopAt=t;return;}this.stopped=true;this.onended?.();}};return n;}
  createBufferSource(){return{connect(){},disconnect(){},start(t){if(this.buffer?.canopy){this.startAt=t;scheduled.push(this);}else sounds.push(this.buffer?.recorded?'blaster':'noise');},stop(t){if(t!==undefined){this.stopAt=t;return;}this.stopped=true;this.onended?.();}};}
  createBuffer(ch,n){const b=new Float32Array(n);return {canopy:n>900,getChannelData:()=>b};}
 }
 const window={AudioContext:Audio,RIFT_BLASTER_MP3_BASE64:'AAECAwQFBgc=',devicePixelRatio:1,matchMedia:()=>motion,addEventListener:(k,f)=>keys[k]=f};
 const sandbox={window,document,atob,performance:{now:()=>clock},localStorage:{getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v)},requestAnimationFrame:f=>{raf=f;return 1;}};
 vm.runInNewContext(instrumented,sandbox);
 const user=f=>{gesture=true;try{return f();}finally{gesture=false;}};
 const step=(n=1)=>{while(n--)raf(clock+=16);};
 const open=name=>user(()=>el.overlay.handlers.click({pointerType:'touch',target:{closest:()=>({dataset:{rift:name}})}}));
 const point=(act,d,id=1)=>user(()=>{boxTarget=buttons[d];el['move-pad'].handlers[act]({target:buttons[d],pointerId:id,button:0,clientX:50,clientY:50,preventDefault(){}});});
 const key=(act,code)=>user(()=>keys[act]({code,repeat:false,preventDefault(){}}));
 const click=(id,extra={})=>user(()=>el[id].handlers.click({type:'click',isTrusted:true,...extra}));
 const mute=on=>user(()=>{el['sound-on'].checked=!on;el['sound-on'].handlers.change();});
 const hide=on=>{document.hidden=on;events.visibilitychange();};
 return {get:sandbox.inspect,el,step,open,point,key,click,mute,hide,notes,resumes,sounds,keys,motion,scheduled};
}
const later=()=>new Promise(setImmediate);
(async()=>{
 const q=setup();assert.equal(q.notes.length,0);assert.equal(q.sounds.length,0);
 q.click('test-engine');await later();
 assert.equal(q.get().state,'menu');const testVoice=q.get().thruster;assert(testVoice.driving);
 assert.equal(q.get().shots.length,0);assert.equal(q.sounds.length,0);assert.equal(q.notes.length,2);
 assert(q.notes[0].frequency.calls.some(c=>c[0]==='ramp'&&c[1]>86));assert.match(q.el['sound-status'].textContent,/Engine test requested/);
 q.step(45);assert.equal(q.get().thruster,testVoice);assert.equal(q.notes.length,2);
 q.step(11);assert.equal(testVoice.driving,false);assert(testVoice.out.gain.calls.some(c=>c[0]==='target'&&c[1]===0));
 q.step(16);assert.equal(q.get().thruster,null);assert(q.notes.every(n=>n.stopped));
 q.open('start');q.get().p.inv=1000;q.step(2);assert.equal(q.get().thruster,null);
 q.point('pointerdown','n');q.step(15);
 const flight=q.get().thruster;assert(flight.driving);assert.equal(q.notes.length,4);assert(q.get().p.vy<0);
 q.point('pointermove','s');q.step(8);assert.equal(q.get().thruster,flight);assert.equal(q.notes.length,4);
 q.point('pointerup','s');const vy=q.get().p.vy;q.step();assert.notEqual(vy,0);assert.notEqual(q.get().p.vy,0);assert.equal(flight.driving,false);
 q.point('pointerdown','w',2);q.step(1);assert.equal(q.get().thruster,flight);assert.equal(flight.driving,true);assert.equal(q.notes.length,4);
 q.click('fire-button');assert.equal(q.get().shots.length,1);assert.deepEqual(q.sounds,['blaster']);assert.equal(q.get().thruster,flight);
 q.key('keydown','Escape');assert.equal(q.get().state,'pause');assert.equal(flight.driving,false);
 q.step(17);assert.equal(q.get().thruster,null);q.open('resume');q.step(2);assert.equal(q.get().thruster,null);
 q.key('keydown','KeyD');q.step(3);assert(q.get().thruster.driving);
 q.key('keydown','KeyA');q.step(2);assert.equal(q.get().thruster.driving,false,'net-zero opposite input is neutral');
 q.key('keyup','KeyA');q.step(2);assert(q.get().thruster.driving);
 q.mute(true);assert.equal(q.get().thruster,null);q.step(4);assert.equal(q.get().thruster,null);
 q.mute(false);q.step(2);assert(q.get().thruster.driving);
 q.hide(true);assert.equal(q.get().thruster,null);assert.equal(q.get().state,'pause');
 q.hide(false);q.step(8);assert.equal(q.get().thruster,null);
 const pending=setup({pending:true});pending.click('test-engine');assert.equal(pending.resumes.length,1);assert.equal(pending.notes.length,0);
 pending.hide(true);pending.hide(false);pending.resumes[0]();await later();
 assert.equal(pending.get().thruster,null);assert.equal(pending.notes.length,0,'no stale test tone after background');
 pending.click('test-engine');assert.equal(pending.resumes.length,2,'fresh context after background');assert.equal(pending.notes.length,0);
 pending.resumes[1]();await later();assert.equal(pending.notes.length,2);assert.equal(pending.get().shots.length,0);
 pending.mute(true);assert.equal(pending.get().thruster,null);
 console.log('PASS thruster attack/sustain/release, D-pad and WASD, direction/quick re-entry, coasting silence, one blaster per fire, mute/pause/hidden, bounded isolated Test engine, stale unlock.');
 const h=setup(),tap=(g,extra={})=>g.click('hangar-canopy-button',extra);
 const phase=(voice,start,end)=>{assert(Math.abs(voice.startAt-start)<.000001);assert(Math.abs(voice.stopAt-end)<.000001);};
 tap(h);assert.equal(h.scheduled.length,0);
 h.click('open-hangar');tap(h,{isTrusted:false});
 assert.equal(h.el['hangar-canopy-rig'].dataset.canopy,'open');assert.equal(h.scheduled.length,0);
 tap(h,{isTrusted:false});tap(h,{detail:0});await later();
 assert.equal(h.el['hangar-canopy-rig'].dataset.canopy,'open');assert.equal(h.scheduled.length,2);
 const [hiss,slide]=h.scheduled;assert(hiss.buffer.canopy);assert.equal(slide.type,'triangle');
 phase(hiss,0,.18);phase(slide,.37,1.08);
 h.step(8);tap(h);await later();
 assert(hiss.stopped&&slide.stopped,'rapid reversal stops present and scheduled voices');
 const [reverse,lower]=h.scheduled.slice(2);
 assert.equal(reverse.type,'triangle');assert(lower.buffer.canopy);
 phase(reverse,.128,.608);phase(lower,.608,.788);
 h.mute(true);assert(reverse.stopped&&lower.stopped);tap(h);await later();assert.equal(h.scheduled.length,4);
 h.mute(false);await later();h.motion.matches=true;tap(h);await later();assert.equal(h.scheduled.length,4);
 h.motion.matches=false;tap(h);await later();assert.equal(h.scheduled.length,6);
 h.motion.matches=true;h.motion.change({matches:true});
 assert(h.scheduled[4].stopped&&h.scheduled[5].stopped);
 h.motion.matches=false;tap(h);await later();
 h.click('close-hangar');assert(h.scheduled[6].stopped&&h.scheduled[7].stopped);
 h.click('open-hangar');tap(h);await later();h.hide(true);
 assert(h.scheduled[8].stopped&&h.scheduled[9].stopped);h.hide(false);h.step(80);assert.equal(h.scheduled.length,10);
 const k=setup({pending:true});k.click('open-hangar');tap(k);k.step(19);k.resumes[0]();await later();
 assert.equal(k.scheduled.length,1,'late resume skips stale hiss and keeps rail aligned');phase(k.scheduled[0],.37,1.08);
 k.keys.pagehide();assert(k.scheduled[0].stopped);
 const j=setup({pending:true});j.click('open-hangar');tap(j);j.click('close-hangar');j.resumes[0]();await later();
 assert.equal(j.scheduled.length,0,'delayed unlock after close cannot play');
 const y=setup({pending:true});y.click('open-hangar');tap(y);tap(y);y.resumes[0]();await later();
 assert.equal(y.scheduled.length,2,'rapid reversal before unlock yields exactly one direction pair');assert.equal(y.scheduled[0].type,'triangle');
 console.log('PASS canopy phase timing, trusted keyboard click, reversal and late resume alignment, mute/reduced-motion/hide/pagehide/close cleanup, and no duplicate voices.');

})();
