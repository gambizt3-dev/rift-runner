'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const gamePath=['../dist/game.js','../game.js'].map(f=>path.join(__dirname,f)).find(f=>fs.existsSync(f));
const dir=path.dirname(gamePath),source=fs.readFileSync(gamePath,'utf8');
const files={blaster:'RIFT_BLASTER_MP3_BASE64',ballistic:'RIFT_BALLISTIC_MP3_BASE64'};
const encoded={};
for(const [name,global] of Object.entries(files)){
 const asset=fs.readFileSync(path.join(dir,name+'-sfx.js'),'utf8');
 const match=asset.match(new RegExp(global+"='([A-Za-z0-9+/]+={0,2})'"));
 assert.ok(match,name+' Base64 asset');
 encoded[global]=match[1];
 assert.equal(Buffer.from(match[1],'base64').toString('base64'),match[1],name+' canonical Base64');
 assert.deepEqual(Buffer.from(match[1],'base64'),fs.readFileSync(path.join(dir,name+'-test.mp3')),name+' same native and WebAudio source');
}
assert.notEqual(encoded.RIFT_BLASTER_MP3_BASE64,encoded.RIFT_BALLISTIC_MP3_BASE64);
function setup({saved,aimAssist=false,missing=false,decodePending=false,resumePending=false}={}){
 let gesture=false,clock=0,raf,lastContext=0;
 const ends=new Map();
 const played=[],flightNotes=[],fallbackNotes=[],native=[],decodes=[],resumes=[],events={},keys={},storage=new Map([['rift-runner.shot-sound.v1',saved],['rift-runner.iphone-audio.v1','on'],['rift-runner.aim-mode.v1','auto'],['rift-runner.aim-assist.v2',aimAssist?'on':undefined]]);
 const elem=()=>({handlers:{},dataset:{},attrs:{},hidden:false,value:'',checked:true,setAttribute(k,v){this.attrs[k]=v;},setPointerCapture(i){this.capture=i;},releasePointerCapture(i){if(this.capture===i)this.capture=null;},style:{setProperty(){}},addEventListener(k,f){this.handlers[k]=f;},getBoundingClientRect:()=>({width:480,height:720,left:0,top:0}),querySelector:()=>({focus(){}}),querySelectorAll:()=>Array.from({length:4},()=>({textContent:''})),focus(){}});
 const draw=new Proxy({createRadialGradient:()=>({addColorStop(){}}),createLinearGradient:()=>({addColorStop(){}})},{get:(a,k)=>k in a?a[k]:()=>{}});
 const el=Object.fromEntries(['game','hud','overlay','sound-on','test-sound','sound-status','gun-blaster','gun-ballistic','phone-audio-tools','iphone-audio','test-phone-audio','fire-button','aim-mode','aim-pad'].map(k=>[k,elem()]));
 el.game.getContext=()=>draw;
 const document={activeElement:el.game,hidden:false,getElementById:k=>el[k],addEventListener:(k,f)=>events[k]=f};
 const param=()=>({value:0,sets:[],ramps:[],setValueAtTime(...a){this.sets.push(a);},linearRampToValueAtTime(...a){this.ramps.push(a);},exponentialRampToValueAtTime(){},cancelAndHoldAtTime(){}});
 const record=()=>({connect(){},disconnect(){}});
 class Graph{
  constructor(){assert(gesture,'AudioContext constructed in a gesture');this.id=++lastContext;this.state='suspended';this.destination={};this.sampleRate=8000;}
  get currentTime(){return clock/1000;}
  resume(){assert(gesture);const ok=()=>{this.state='running';};if(!resumePending){ok();return Promise.resolve();}return new Promise(resolve=>resumes.push(()=>{ok();resolve();}));}
  decodeAudioData(bytes,callback){
   const data=Buffer.from(bytes).toString('base64');
   const name=data===encoded.RIFT_BALLISTIC_MP3_BASE64?'ballistic':data===encoded.RIFT_BLASTER_MP3_BASE64?'blaster':null;
   assert.ok(name,'recognized exact asset');
   const decoded={duration:name==='ballistic'?.836:.261,name,id:this.id};
   const item={name,id:this.id,finish:()=>callback(decoded)};decodes.push(item);
   if(!decodePending){item.finish();return Promise.resolve(decoded);}
  }
  close(){this.state='closed';return Promise.resolve();}
  createGain(){return {...record(),gain:param()};}
  createBiquadFilter(){return {...record(),frequency:param()};}
  createOscillator(){return {...record(),frequency:param(),stops:[],start(t){
   this.begins=t;
   if([274,720].includes(this.frequency.sets[0]?.[0]))flightNotes.push(this);else{played.push('synth-tone');fallbackNotes.push(this);}
  },stop(t){this.stops.push(t);if(t===undefined){ends.delete(this);this.onended?.();}else ends.set(this,t*1000);},disconnect(){this.disconnected=true;}};}
  createBufferSource(){return {...record(),start(){assert.notEqual(this.loop,true);played.push(this.buffer?.name?this.buffer.name+':'+this.buffer.id:'synth-noise');},stop(){this.onended?.();}};}
  createBuffer(ch,n){const b=new Float32Array(n);return {getChannelData:()=>b};}
 }
 class Native{
  constructor(src){assert(gesture);this.src=src;this.original=src;this.plays=0;this.pauses=0;native.push(this);}
  play(){assert(gesture,'native play synchronous in click');this.plays++;return new Promise(resolve=>{this.resolve=resolve;});}
  pause(){this.pauses++;}
  removeAttribute(name){if(name==='src')this.src='';}
  load(){}
 }
 const window={...encoded,navigator:{userAgent:'iPhone',audioSession:{type:'auto'}},AudioContext:Graph,Audio:Native,setTimeout:()=>1,clearTimeout(){},devicePixelRatio:1,matchMedia:()=>({matches:false}),addEventListener:(k,f)=>keys[k]=f};
 if(missing==='blaster')delete window.RIFT_BLASTER_MP3_BASE64;else if(missing)delete window.RIFT_BALLISTIC_MP3_BASE64;
 const sandbox={window,document,atob,performance:{now:()=>clock},localStorage:{getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v)},requestAnimationFrame:f=>{raf=f;return 1;}};
 vm.runInNewContext(source.replace(/\}\)\(\);\s*$/,"globalThis.inspect=()=>({shotSound,practiceShots,practiceHits,state,blaster,ballistic,ballisticHold,p,shots,cones,rings,aimPtr,aimAssist,autoLock,projectileVoices});})();"),sandbox);
 const act=f=>{gesture=true;try{return f();}finally{gesture=false;}};
 const click=(id,extra={})=>act(()=>el[id].handlers.click({type:'click',isTrusted:true,...extra}));
 const pointer=(type,id=3,node='fire-button',x=240,y=360)=>act(()=>el[node].handlers[type]?.({type,isTrusted:true,button:0,pointerType:'touch',pointerId:id,isPrimary:id===16,clientX:x,clientY:y,preventDefault(){}}));
 const key=(type,code,repeat=false)=>act(()=>keys[type]({type,code,repeat,isTrusted:true,preventDefault(){}}));
 const open=name=>act(()=>el.overlay.handlers.click({type:'click',isTrusted:true,pointerType:'touch',target:{closest:()=>({dataset:{rift:name}})}}));
 const change=(id,key,value)=>act(()=>{el[id][key]=value;el[id].handlers.change({type:'change',isTrusted:true});});
 return {el,click,open,pointer,key,blur:()=>keys.blur(),played,flightNotes,fallbackNotes,native,decodes,resumes,storage,inspect:sandbox.inspect,
  step:(n=1)=>{while(n--){clock+=16;for(const [osc,due] of ends){if(due<=clock){ends.delete(osc);osc.onended?.();}}raf(clock);}},change:(name)=>click('gun-'+name),
  mute:(on=true)=>change('sound-on','checked',!on),reset:()=>act(()=>el.hud.handlers.click({isTrusted:true,target:{closest:()=>true}})),assist:on=>change('aim-mode','checked',on),hide:on=>{document.hidden=on;events.visibilitychange();}};
}
const tick=()=>new Promise(setImmediate);
module.exports={setup,tick};
if(require.main===module)(async()=>{
 const q=setup({saved:'invalid'});
 assert.equal(q.el['gun-blaster'].attrs['aria-pressed'],'true');assert.equal(q.el['gun-ballistic'].attrs['aria-pressed'],'false');
 q.open('start');await tick();
 assert.deepEqual(q.decodes.map(({name,id})=>[name,id]),[['blaster',1],['ballistic',1]]);
 q.click('fire-button');assert.deepEqual(q.played,['blaster:1']);assert.equal(q.inspect().practiceShots,1);
 q.change('ballistic');assert.equal(q.storage.get('rift-runner.shot-sound.v1'),'ballistic');assert.equal(q.storage.get('rift-runner.iphone-audio.v1'),'on');
 assert.deepEqual(q.played,['blaster:1'],'select never autoplays');
 q.click('fire-button');assert.deepEqual(q.played,['blaster:1','ballistic:1']);assert.equal(q.inspect().practiceShots,2);
 q.click('test-sound');assert.deepEqual(q.played,['blaster:1','ballistic:1','ballistic:1']);assert.match(q.el['sound-status'].textContent,/Ballistic requested/);
 assert.equal(q.inspect().practiceShots,2,'test does not fire a real shot');
 q.click('test-phone-audio');assert.equal(q.native[0].original,'./ballistic-test.mp3');assert.equal(q.native[0].plays,1);assert.equal(q.native[0].loop,false);assert.equal(q.played.length,3);
 q.change('blaster');assert.equal(q.native[0].pauses,1);q.native[0].resolve();await tick();assert.equal(q.el['sound-status'].textContent,'Blaster selected.');
 q.click('test-phone-audio');assert.equal(q.native[1].original,'./blaster-test.mp3');
 q.mute();assert.equal(q.native[1].pauses,1);q.click('test-phone-audio');q.click('test-sound');q.click('fire-button');
 assert.equal(q.native.length,2);assert.equal(q.played.length,3);
 const persisted=setup({saved:'ballistic'});assert.equal(persisted.el['gun-ballistic'].attrs['aria-pressed'],'true');assert.equal(persisted.decodes.length,0);
 persisted.click('test-sound');await tick();assert.deepEqual(persisted.played,['ballistic:1']);
 const missing=setup({saved:'ballistic',missing:true});
 missing.open('start');await tick();missing.click('test-sound');
 assert.deepEqual(missing.played,['synth-tone','synth-noise'],'fallback is one layered sound; never the incorrect recorded Blaster');assert.match(missing.el['sound-status'].textContent,/unavailable or loading/);
 assert.deepEqual(missing.fallbackNotes.map(n=>n.type),['triangle']);
 const missingBlaster=setup({missing:'blaster'});
 missingBlaster.click('test-sound');await tick();
 assert.deepEqual(missingBlaster.played,['synth-tone','synth-tone'],'energy fallback has no Ballistic noise crack');
 assert.deepEqual(missingBlaster.fallbackNotes.map(n=>n.type),['sine','triangle']);
 assert.deepEqual(missingBlaster.fallbackNotes.map(n=>n.frequency.sets[0][0]),[940,620]);
 const pending=setup({saved:'ballistic',decodePending:true,resumePending:true});
 pending.click('test-sound');pending.change('blaster');pending.change('ballistic');
 pending.decodes.forEach(row=>row.finish());pending.resumes.shift()();await tick();assert.deepEqual(pending.played,[]);
 pending.click('test-sound');assert.deepEqual(pending.played,['ballistic:1']);
 const stale=setup({saved:'ballistic',decodePending:true});
 stale.open('start');await tick();stale.hide(true);stale.hide(false);stale.open('resume');await tick();
 assert.deepEqual(stale.decodes.map(({id})=>id),[1,1,2,2]);stale.decodes[1].finish();assert.equal(stale.inspect().ballistic.buffer,null);
 stale.decodes[3].finish();stale.click('fire-button');assert.deepEqual(stale.played,['ballistic:2']);
 const held=setup({saved:'ballistic'});held.open('start');await tick();
 held.pointer('pointerdown');assert.equal(held.inspect().practiceShots,1);assert.equal(held.el['fire-button'].capture,3);
 held.pointer('pointerup');held.click('fire-button',{detail:1,pointerId:19});assert.equal(held.inspect().practiceShots,1,'tap emits one despite click following pointerup');
 held.pointer('pointerdown');held.step(50);assert.equal(held.inspect().practiceShots,5,'one on press and three repeats by .8s');assert.equal(held.played.filter(x=>x==='ballistic:1').length,5);
 held.pointer('pointercancel');held.step(50);assert.equal(held.inspect().practiceShots,5);
 held.pointer('pointerdown');held.step(8);held.change('blaster');held.click('fire-button',{detail:1,pointerId:3});held.step(35);
 assert.equal(held.inspect().ballisticHold,null);assert.equal(held.inspect().practiceShots,6,'switch stops repeats and suppresses old click');
 held.pointer('pointerdown');held.step(40);assert.equal(held.inspect().practiceShots,7,'Blaster fires on down but never repeats');
 held.pointer('pointerup');held.click('fire-button',{detail:1,pointerId:99});assert.equal(held.inspect().practiceShots,7);
 held.click('fire-button',{detail:0,pointerId:-1,pointerType:''});assert.equal(held.inspect().practiceShots,8,'keyboard/assistive click survives the pointer deduplication fence');
 held.pointer('pointerdown');held.pointer('pointercancel');held.click('fire-button',{detail:1,pointerId:23});held.step(30);
 assert.equal(held.inspect().practiceShots,9,'cancellation neither repeats nor admits a trailing click');
 held.pointer('pointerdown');held.pointer('pointerup');held.pointer('pointerdown');held.pointer('pointerup');
 assert.equal(held.inspect().practiceShots,11,'subsequent distinct presses have no new cooldown');
 const cancelled=setup({saved:'ballistic'});cancelled.open('start');await tick();
 cancelled.pointer('pointerdown');cancelled.pointer('lostpointercapture');cancelled.step(50);
 assert.equal(cancelled.inspect().practiceShots,1);
 cancelled.pointer('pointerdown');cancelled.key('keydown','KeyP');cancelled.open('resume');cancelled.step(50);
 assert.equal(cancelled.inspect().practiceShots,2,'pause cancels hold');
 assert.equal(cancelled.el['aim-mode'].checked,false,'legacy Auto Aim setting does not take over V15');
 cancelled.pointer('pointerdown',16,'aim-pad',464,360);cancelled.step(20);
 assert.equal(cancelled.inspect().practiceShots,2,'aim never shoots on hold');
 cancelled.pointer('pointerdown',3);
 assert.equal(cancelled.inspect().shots.at(-1).a,0,'Ballistic fires in aim-pad direction');
 cancelled.pointer('pointermove',16,'aim-pad',240,160);cancelled.step(17);
 assert.equal(cancelled.inspect().shots.at(-1).a,-Math.PI/2,'Ballistic repeats toward latest right-pad aim');
 cancelled.pointer('pointerup',16,'aim-pad',240,360);
 const count=cancelled.inspect().practiceShots;
 cancelled.step(18);
 assert.equal(cancelled.inspect().practiceShots,count+1,'releasing aim does not cancel separate Fire hold');
 assert.equal(cancelled.inspect().p.aim,-Math.PI/2,'aim release preserves last directional angle');
 cancelled.pointer('pointerup',3);cancelled.click('fire-button',{detail:1,pointerId:23});cancelled.step(20);
 assert.equal(cancelled.inspect().practiceShots,count+1,'no aim release shot and no duplicate Fire click');
 const assisted=setup({aimAssist:true});assisted.open('start');await tick();assisted.step(2);
 assert.ok(assisted.inspect().autoLock,'optional touch assist starts when explicitly enabled');
 assisted.pointer('pointerdown',16,'aim-pad',464,360);assisted.pointer('pointerup',16,'aim-pad');assisted.step(4);
 assert.equal(assisted.inspect().autoLock,null);
 assert.equal(assisted.inspect().p.aim,0);
 assisted.click('fire-button');assert.equal(assisted.inspect().shots.at(-1).a,0,'assist does not override the aimed heading');
 assisted.assist(false);assisted.assist(true);assisted.step(2);
 assert.ok(assisted.inspect().autoLock,'turning assist back on re-arms assist');
 const keyboard=setup({saved:'ballistic'});keyboard.open('start');await tick();
 keyboard.key('keydown','Space');keyboard.key('keydown','Space',true);keyboard.step(33);
 assert.equal(keyboard.inspect().practiceShots,3);keyboard.key('keyup','Space');keyboard.step(33);assert.equal(keyboard.inspect().practiceShots,3);
 keyboard.key('keydown','Space');keyboard.mute();keyboard.step(33);assert.equal(keyboard.inspect().practiceShots,6);
 assert.equal(keyboard.played.filter(x=>x==='ballistic:1').length,4,'mute does not stop hold but does silence it');
 keyboard.blur();keyboard.step(33);assert.equal(keyboard.inspect().practiceShots,6);assert.equal(keyboard.inspect().ballisticHold,null);
 keyboard.open('resume');keyboard.key('keydown','Space');keyboard.hide(true);keyboard.hide(false);keyboard.open('resume');keyboard.step(40);
 assert.equal(keyboard.inspect().practiceShots,7,'hide releases hold; returning cannot resume fire');
 keyboard.key('keydown','Digit1');assert.equal(keyboard.inspect().shotSound,'blaster');
 keyboard.key('keydown','Space');keyboard.key('keydown','Space',true);keyboard.step(44);assert.equal(keyboard.inspect().practiceShots,8);
 function measure(name,switchTo){
  const sim=setup({saved:name});sim.open('start');
  const f=sim.inspect();f.p.x=240;f.p.y=360;f.p.vx=0;f.p.vy=0;f.p.aim=0;
  const cone=f.cones[0];f.cones.splice(1);cone.x=320;cone.y=360;cone.vx=0;cone.vy=0;
  sim.key('keydown','Space');sim.key('keyup','Space');const launch=sim.inspect();
  assert.equal(launch.shots[0].weapon,name);const kick=Math.abs(launch.p.vx);
  sim.change(switchTo);sim.step(10);
  assert.equal(sim.inspect().practiceHits,1);assert.equal(sim.inspect().shots.length,0);
  return [kick,cone.vx,sim.inspect().rings.at(-1).colour];
 }
 const lighter=measure('blaster','ballistic'),heavier=measure('ballistic','blaster');
 assert.deepEqual([lighter[0],heavier[0]],[30,50]);
 assert.ok(heavier[1]>lighter[1]*1.4);assert.notEqual(lighter[2],heavier[2]);
 console.log('PASS pointer/key hold, taps, cancellation, hide/blur, mute, selection and per-projectile recoil/impact.');
 console.log('PASS default, persistence, exact two assets, real shots, both test paths, mute, one voice/no autoplay, synth fallback, stale selection and retired decode.');
})().catch(e=>{console.error(e);process.exitCode=1;});
