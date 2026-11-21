'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const gamePath=['../dist/game.js','../game.js','game.js'].map(f=>path.join(__dirname,f)).find(f=>fs.existsSync(f));
const text=fs.readFileSync(gamePath,'utf8');
const instrumented=text.replace(/\}\)\(\);\s*$/,"globalThis.inspect=()=>({state,p,shots,thruster,enginePress,movePtr,moveKey,autoLock});})();");
function setup({pending=false}={}){
 let raf,clock=0,gesture=false,boxTarget=null;
 const events={},keys={},sounds=[],resumes=[],notes=[],storage=new Map();
 const elem=()=>({handlers:{},dataset:{},styles:{},hidden:false,checked:true,style:{setProperty(){}},addEventListener(k,f){this.handlers[k]=f;},getBoundingClientRect:()=>({width:480,height:720,left:0,top:0}),querySelector:()=>({focus(){}}),querySelectorAll:()=>Array.from({length:4},()=>({textContent:""})),focus(){},setPointerCapture(){},releasePointerCapture(){}});
 const draw=new Proxy({createRadialGradient:()=>({addColorStop(){}}),createLinearGradient:()=>({addColorStop(){}})},{get:(a,k)=>k in a?a[k]:()=>{}});
 const canvas=Object.assign(elem(),{getContext:()=>draw}),el={game:canvas,hud:elem(),overlay:elem(),'main-menu':elem(),'sound-on':elem(),'test-sound':elem(),'test-engine':elem(),'sound-status':elem(),'move-pad':elem(),'aim-pad':elem(),'fire-button':elem(),'aim-mode':elem(),'flight-deck':elem()};
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
  createOscillator(){const n={frequency:param(),connect(){},disconnect(){},start(){notes.push(this);},stop(){this.stopped=true;this.onended?.();}};return n;}
  createBufferSource(){return{connect(){},disconnect(){},start(){sounds.push(this.buffer?.recorded?'blaster':'noise');},stop(){this.onended?.();}};}
  createBuffer(ch,n){const b=new Float32Array(n);return {getChannelData:()=>b};}
 }
 const window={AudioContext:Audio,RIFT_BLASTER_MP3_BASE64:'AAECAwQFBgc=',devicePixelRatio:1,matchMedia:()=>({matches:false}),addEventListener:(k,f)=>{const prev=keys[k];keys[k]=prev?(e=>{prev(e);f(e);}):f;}};
 const sandbox={window,document,atob,performance:{now:()=>clock},localStorage:{getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v)},requestAnimationFrame:f=>{raf=f;return 1;}};
 vm.runInNewContext(instrumented,sandbox);
 const user=f=>{gesture=true;try{return f();}finally{gesture=false;}};
 const step=(n=1)=>{while(n--)raf(clock+=16);};
 const open=name=>user(()=>el[name==='start'||name==='practice'?'main-menu':'overlay'].handlers.click({pointerType:'touch',target:{closest:()=>({dataset:{rift:name==='start'?'practice':name}})}}));
 const point=(act,d,id=1)=>user(()=>{boxTarget=buttons[d];el['move-pad'].handlers[act]({target:buttons[d],pointerId:id,button:0,clientX:50,clientY:50,preventDefault(){}});});
 const key=(act,code)=>user(()=>keys[act]({code,repeat:false,preventDefault(){}}));
 const click=id=>user(()=>el[id].handlers.click({type:'click',isTrusted:true}));
 const hold=(id='test-engine',extra={})=>user(()=>el[id].handlers.pointerdown({type:'pointerdown',isTrusted:true,button:0,pointerId:76,pointerType:'mouse',...extra}));
 const release=(extra={})=>user(()=>keys.pointerup({type:'pointerup',isTrusted:true,pointerId:76,pointerType:'mouse',...extra}));
 const mute=on=>user(()=>{el['sound-on'].checked=!on;el['sound-on'].handlers.change();});
 const hide=on=>{document.hidden=on;events.visibilitychange();};
 return {get:sandbox.inspect,el,step,open,point,key,click,hold,release,mute,hide,notes,resumes,sounds};
}
const later=()=>new Promise(setImmediate);
(async()=>{
 const q=setup();assert.equal(q.notes.length,0);assert.equal(q.sounds.length,0);
 q.click('test-engine');await later();assert.equal(q.get().thruster,null,'click alone cannot play after release');
 q.hold();await later();
 assert.equal(q.get().state,'menu');const testVoice=q.get().thruster;assert(testVoice.driving);
 assert.equal(q.get().shots.length,0);assert.equal(q.sounds.length,0);assert.equal(q.notes.length,2);
 assert(q.notes[0].frequency.calls.some(c=>c[0]==='ramp'&&c[1]>86));assert.match(q.el['sound-status'].textContent,/Engine test requested/);
 q.step(45);assert.equal(q.get().thruster,testVoice);assert.equal(q.notes.length,2);
 q.step(19);assert.equal(testVoice.driving,true,'no fixed tap timer');q.release();assert.equal(testVoice.driving,false);assert(testVoice.out.gain.calls.some(c=>c[0]==='target'&&c[1]===0));
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
 const pending=setup({pending:true});pending.hold();assert.equal(pending.resumes.length,1);assert.equal(pending.notes.length,0);
 pending.hide(true);pending.hide(false);pending.resumes[0]();await later();
 assert.equal(pending.get().thruster,null);assert.equal(pending.notes.length,0,'no stale test tone after background');
 pending.hold();assert.equal(pending.resumes.length,2,'fresh context after background');assert.equal(pending.notes.length,0);
 pending.resumes[1]();await later();assert.equal(pending.notes.length,2);assert.equal(pending.get().shots.length,0);
 pending.mute(true);assert.equal(pending.get().thruster,null);
 console.log('PASS thruster attack/sustain/release, D-pad and WASD, direction/quick re-entry, coasting silence, one blaster per fire, mute/pause/hidden, bounded isolated Test engine, stale unlock.');
})();
