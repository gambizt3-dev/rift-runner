'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const gamePath=['../dist/game.js','../game.js','game.js'].map(f=>path.join(__dirname,f)).find(f=>fs.existsSync(f));
const text=fs.readFileSync(gamePath,'utf8');
const instrumented=text.replace(/\}\)\(\);\s*$/,"globalThis.inspect=()=>({state,p,shots,thruster,engineTestUntil,hangarPress,movePtr,moveKey,autoLock});})();");
function setup({pending=false}={}){
 let raf,clock=0,gesture=false,boxTarget=null;
 const motion={matches:false,addEventListener(k,f){this[k]=f;}};
 const events={},keys={},sounds=[],resumes=[],notes=[],storage=new Map();
 const elem=()=>({captured:null,handlers:{},dataset:{},styles:{},hidden:false,checked:true,style:{vars:{},setProperty(name,value){this.vars[name]=value;}},addEventListener(k,f){this.handlers[k]=f;},getBoundingClientRect:()=>({width:480,height:720,left:0,top:0}),querySelector:()=>({focus(){}}),querySelectorAll:()=>Array.from({length:4},()=>({textContent:""})),focus(){},setPointerCapture(id){this.captured=id;},releasePointerCapture(id){assert.equal(this.captured,id);this.captured=null;}});
 const draw=new Proxy({createRadialGradient:()=>({addColorStop(){}}),createLinearGradient:()=>({addColorStop(){}})},{get:(a,k)=>k in a?a[k]:()=>{}});
 const canvas=Object.assign(elem(),{getContext:()=>draw}),el={game:canvas,hud:elem(),overlay:elem(),'sound-on':elem(),'test-sound':elem(),'test-engine':elem(),'sound-status':elem(),'move-pad':elem(),'aim-pad':elem(),'fire-button':elem(),'aim-mode':elem(),'flight-deck':elem()};
 for(const id of ['screen-shake','hangar','open-hangar','close-hangar','hangar-title','hangar-test-engine','hangar-canopy-rig','fit-primary','fit-secondary'])el[id]=elem();
 const hero=elem();el['hangar-canopy-rig'].closest=selector=>selector==='.hangar-hero'?hero:null;
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
  createOscillator(){const n={frequency:param(),connect(){},disconnect(){},start(){notes.push(this);},stop(){this.stopped=true;this.onended?.();}};return n;}
  createBufferSource(){return{connect(){},disconnect(){},start(){sounds.push(this.buffer?.recorded?'blaster':'noise');},stop(){this.onended?.();}};}
  createBuffer(ch,n){const b=new Float32Array(n);return {getChannelData:()=>b};}
 }
 const window={AudioContext:Audio,RIFT_BLASTER_MP3_BASE64:'AAECAwQFBgc=',devicePixelRatio:1,matchMedia:()=>motion,addEventListener:(k,f)=>{const prior=keys[k];keys[k]=prior?(e=>{prior(e);f(e);}):f;}};
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
 const engine=(type,extra={},global=false)=>user(()=>{
  let prevented=false;
  const event={type,isTrusted:true,pointerType:'touch',pointerId:1,isPrimary:true,button:0,code:'Space',detail:1,preventDefault(){prevented=true;},...extra};
  (global?keys[type]:el['hangar-test-engine'].handlers[type])(event);
  return prevented;
 });
 return {get:sandbox.inspect,el,hero,step,open,point,key,click,engine,mute,hide,notes,resumes,sounds,keys,motion};
}
const later=()=>new Promise(setImmediate);
(async()=>{
 const css=fs.readFileSync(path.join(__dirname,'../dist/style.css'),'utf8');
 assert.match(css,/\.hangar-hero:has\(\[data-engine-test=held\]:is\(\[data-engine-shake=a\],\[data-engine-shake=b\]\)\)\{animation:bay-hold-shake/);
 assert.match(css,/#hangar-test-engine\{touch-action:none;user-select:none;-webkit-user-select:none;-webkit-touch-callout:none\}/);
 const rig=q=>q.el['hangar-canopy-rig'], button=q=>q.el['hangar-test-engine'];
 const visual=q=>rig(q).dataset.engineTest;
 const power=q=>Number(rig(q).style.vars['--engine-power']);
 // First cold iOS-like hold: visuals work without Web Audio construction at
 // touch down; trusted release unlocks only for the next press, no stale tone.
 const q=setup();q.click('open-hangar');
 assert(q.engine('contextmenu'),'native context menu is cancelled at the button only');
 assert.notEqual(visual(q),'active');
 q.engine('pointerdown',{isTrusted:false});assert.equal(q.get().hangarPress,null);
 q.engine('pointerdown');assert.equal(visual(q),'active');assert.equal(power(q),.2);assert.equal(button(q).captured,1);
 q.step(70);assert.equal(visual(q),'held');assert(power(q)>.2&&power(q)<1);assert.equal(q.notes.length,0);
 q.engine('pointerdown',{pointerId:2,isPrimary:false});
 q.engine('pointerup',{pointerId:2},true);
 q.engine('pointercancel',{pointerId:2},true);
 assert.equal(q.get().hangarPress.id,1,'an unrelated touch cannot release the owner');
 q.step(110);assert.equal(power(q),1);assert.equal(rig(q).style.vars['--engine-shake-strength'],'2.000px');assert.equal(q.hero.style.vars['--engine-shake-strength'],'2.000px');assert.equal(q.notes.length,0);
 q.engine('pointerup',{},true);assert.equal(q.get().hangarPress,null);assert.equal(button(q).captured,null);
 assert.equal(visual(q),'releasing');q.engine('click');await later();
 assert.match(q.el['sound-status'].textContent,/Hold Test engine again/);assert.equal(q.notes.length,0);
 q.step(15);assert.equal(visual(q),'idle');
 // Warm hold uses one original sound graph, ramps gain only in the hangar and
 // stays on well past the single-tap pulse until the owner releases.
 q.engine('pointerdown');const voice=q.get().thruster;assert(voice.driving);assert.equal(voice.level,.08);
 q.step(64);assert(voice.level>.08&&voice.level<.2);
 q.step(115);assert.equal(q.get().thruster,voice);assert.equal(voice.level,.2);assert.equal(q.notes.length,2);
 q.engine('pointerup',{pointerId:1},true);q.engine('click');assert.equal(visual(q),'releasing');
 assert.equal(voice.driving,false);assert(voice.out.gain.calls.some(c=>c[0]==='target'&&c[1]===0));
 q.step(16);assert.equal(q.get().thruster,null);assert.equal(visual(q),'idle');
 // A quick tap still has the bounded .85 s pulse, without a duplicate click.
 q.engine('pointerdown');q.step(4);q.engine('pointerup',{},true);q.engine('click');
 q.step(44);assert.equal(visual(q),'active');assert(q.get().thruster.driving);
 q.step(8);assert.equal(visual(q),'idle');assert.equal(q.get().thruster.driving,false);
 q.step(16);
 // Press owner cannot be replaced by other keys; repeated keydown doesn't
 // reset ramp or ignition. Keys and pointers are cancelled on lifecycle.
 assert(q.engine('keydown',{code:'Space'}));
 const owner=q.get().hangarPress;assert.equal(owner.kind,'key');
 q.engine('keyup',{code:'Enter'},true);q.step(25);
 assert(q.engine('keydown',{code:'Space',repeat:true}));assert.equal(q.get().hangarPress,owner);
 q.engine('keyup',{code:'Space'},true);assert.equal(q.get().hangarPress,null);
 for(const type of ['pointercancel','lostpointercapture','blur','cancel','change','pagehide']){
  q.step(20);q.engine('pointerdown');q.step(20);
  if(type==='pointercancel')q.engine(type,{},true);
  else if(type==='blur')q.keys.blur();
  else if(type==='cancel')q.el.hangar.handlers.cancel();
  else if(type==='change'){q.el['fit-primary'].value='ballistic';q.el['fit-primary'].handlers.change();}
  else if(type==='pagehide')q.keys.pagehide();
  else q.engine(type);
  assert.equal(visual(q),'idle',type);assert.equal(q.get().hangarPress,null,type);
  assert.equal(button(q).captured,null,type);
  q.engine('pointerup',{},true);
 }
 q.el['screen-shake'].checked=false;q.engine('pointerdown');q.step(50);
 assert.equal(rig(q).dataset.engineShake,'off');assert.equal(visual(q),'held');
 q.el['screen-shake'].checked=true;assert.equal(rig(q).dataset.engineShake,'off','settings do not restart an ignition');
 q.hide(true);assert.equal(visual(q),'idle');q.hide(false);
 q.motion.matches=true;q.engine('pointerdown');q.step(50);assert.equal(rig(q).dataset.engineShake,'off');assert(power(q)>.2);
 q.click('close-hangar');assert.equal(q.get().hangarPress,null);assert.equal(visual(q),'idle');
 assert.equal(q.get().shots.length,0);assert.equal(q.get().state,'menu');
 const late=setup({pending:true});late.click('open-hangar');late.engine('pointerdown',{pointerType:'mouse'});late.step(45);
 late.click('close-hangar');late.resumes[0]();await later();
 assert.equal(late.notes.length,0);assert.equal(visual(late),'idle');
 console.log('PASS hold ramp, armed iOS release, tap deduplication, keyboard ownership and blur/cancel/loadout/pagehide/reduced-motion cleanup; no arena effects');
})().catch(e=>{console.error(e);process.exitCode=1;});
