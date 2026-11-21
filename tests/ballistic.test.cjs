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
function setup({saved,missing=false,decodePending=false,resumePending=false}={}){
 let gesture=false,clock=0,raf,lastContext=0;
 const played=[],native=[],decodes=[],resumes=[],events={},keys={},storage=new Map([['rift-runner.shot-sound.v1',saved],['rift-runner.iphone-audio.v1','on']]);
 const elem=()=>({handlers:{},dataset:{},hidden:false,value:'',checked:true,style:{setProperty(){}},addEventListener(k,f){this.handlers[k]=f;},getBoundingClientRect:()=>({width:480,height:720,left:0,top:0}),querySelector:()=>({focus(){}}),querySelectorAll:()=>Array.from({length:4},()=>({textContent:''})),focus(){}});
 const draw=new Proxy({createRadialGradient:()=>({addColorStop(){}}),createLinearGradient:()=>({addColorStop(){}})},{get:(a,k)=>k in a?a[k]:()=>{}});
 const el=Object.fromEntries(['game','hud','overlay','sound-on','test-sound','sound-status','shot-sound','phone-audio-tools','iphone-audio','test-phone-audio','fire-button'].map(k=>[k,elem()]));
 el.game.getContext=()=>draw;
 const document={activeElement:el.game,hidden:false,getElementById:k=>el[k],addEventListener:(k,f)=>events[k]=f};
 const param=()=>({value:0,setValueAtTime(){},linearRampToValueAtTime(){},exponentialRampToValueAtTime(){}});
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
  createOscillator(){return {...record(),frequency:param(),start(){played.push('synth-tone');},stop(){this.onended?.();}};}
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
 if(missing)delete window.RIFT_BALLISTIC_MP3_BASE64;
 const sandbox={window,document,atob,performance:{now:()=>clock},localStorage:{getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v)},requestAnimationFrame:f=>{raf=f;return 1;}};
 vm.runInNewContext(source.replace(/\}\)\(\);\s*$/,"globalThis.inspect=()=>({shotSound,practiceShots,state,blaster,ballistic});})();"),sandbox);
 const act=f=>{gesture=true;try{return f();}finally{gesture=false;}};
 const click=id=>act(()=>el[id].handlers.click({type:'click',isTrusted:true}));
 const open=name=>act(()=>el.overlay.handlers.click({type:'click',isTrusted:true,pointerType:'touch',target:{closest:()=>({dataset:{rift:name}})}}));
 const change=(id,key,value)=>act(()=>{el[id][key]=value;el[id].handlers.change({type:'change',isTrusted:true});});
 return {el,click,open,played,native,decodes,resumes,storage,inspect:sandbox.inspect,
  step:(n=1)=>{while(n--)raf(clock+=16);},change:(name)=>change('shot-sound','value',name),
  mute:()=>change('sound-on','checked',false),hide:on=>{document.hidden=on;events.visibilitychange();}};
}
const tick=()=>new Promise(setImmediate);
(async()=>{
 const q=setup({saved:'invalid'});
 assert.equal(q.el['shot-sound'].value,'blaster');
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
 const persisted=setup({saved:'ballistic'});assert.equal(persisted.el['shot-sound'].value,'ballistic');assert.equal(persisted.decodes.length,0);
 persisted.click('test-sound');await tick();assert.deepEqual(persisted.played,['ballistic:1']);
 const missing=setup({saved:'ballistic',missing:true});
 missing.open('start');await tick();missing.click('test-sound');
 assert.deepEqual(missing.played,['synth-tone','synth-noise'],'fallback is one layered sound; never the incorrect recorded Blaster');assert.match(missing.el['sound-status'].textContent,/unavailable or loading/);
 const pending=setup({saved:'ballistic',decodePending:true,resumePending:true});
 pending.click('test-sound');pending.change('blaster');pending.change('ballistic');
 pending.decodes.forEach(row=>row.finish());pending.resumes.shift()();await tick();assert.deepEqual(pending.played,[]);
 pending.click('test-sound');assert.deepEqual(pending.played,['ballistic:1']);
 const stale=setup({saved:'ballistic',decodePending:true});
 stale.open('start');await tick();stale.hide(true);stale.hide(false);stale.open('resume');await tick();
 assert.deepEqual(stale.decodes.map(({id})=>id),[1,1,2,2]);stale.decodes[1].finish();assert.equal(stale.inspect().ballistic.buffer,null);
 stale.decodes[3].finish();stale.click('fire-button');assert.deepEqual(stale.played,['ballistic:2']);
 console.log('PASS default, persistence, exact two assets, real shots, both test paths, mute, one voice/no autoplay, synth fallback, stale selection and retired decode.');
})().catch(e=>{console.error(e);process.exitCode=1;});
