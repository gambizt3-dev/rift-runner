'use strict';
const assert=require('node:assert/strict'),test=require('node:test'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const site=['../dist','..'].map(p=>path.join(__dirname,p)).find(p=>fs.existsSync(path.join(p,'carrier.html')));
const read=name=>fs.readFileSync(path.join(site,name),'utf8');
const source=read('carrier-audio.js'),tick=()=>new Promise(setImmediate);
function browser({unsupported=false,throws=null,noPromise=false,initiallyHidden=false,store=new Map(),tabStore=new Map()}={}){
 const handlers={},documentHandlers={},trace=[],clips=[],nodes={},plays=[];
 let gesture=false,nativeMounted=0;
 const make=()=>({dataset:{state:'off'},hidden:true,attrs:{},events:{},
  setAttribute(k,v){this.attrs[k]=v;},addEventListener(k,v){this.events[k]=v;}
 });
 for(const id of ['carrier-engine-sound','carrier-engine-state','carrier-engine-feedback','carrier-hangar','carrier-launch-practice','carrier-launch-vandul','carrier-shop','carrier-back','carrier-views'])nodes[id]=make();
 const document={hidden:initiallyHidden,getElementById:id=>nodes[id],querySelector:s=>s==='.carrier-back'?nodes['carrier-back']:null,
  addEventListener(k,f){documentHandlers[k]=f;},
  body:{append(a){trace.push('mount');nativeMounted++;a.attached=true;}},
  createElement(tag){
   assert.equal(tag,'audio');trace.push('create');
   let accept,reject;
   const ready=new Promise((ok,fail)=>{accept=ok;reject=fail;});
   const a={...make(),paused:true,currentTime:0,attached:false,
    begin(){this.paused=false;accept();},
    fail(name){reject({name});},
    set src(v){trace.push('source:'+v);this.source=v;},get src(){return this.source??'';},
    play(){plays.push(gesture);trace.push('play');if(throws)throw {name:throws};return noPromise?undefined:ready;},
    pause(){trace.push('pause');this.paused=true;this.events.pause?.();},
    load(){assert.equal(this.src,'','media I/O is cancelled without re-requesting file');trace.push('reset');},
    removeAttribute(k){assert.equal(k,'src');this.source='';trace.push('clear');},
    remove(){if(this.attached){this.attached=false;nativeMounted--;trace.push('detach');}}
   };
   if(unsupported)delete a.play;
   clips.push(a);return a;
  }
 };
 const storage=data=>({getItem:k=>data.get(k),setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)});
 vm.runInNewContext(source,{document,localStorage:storage(store),sessionStorage:storage(tabStore),addEventListener(k,fn){handlers[k]=fn;}});
 const button=nodes['carrier-engine-sound'],badge=nodes['carrier-engine-state'],status=nodes['carrier-engine-feedback'];
 const press=(trust=true)=>{gesture=trust;try{button.events.click({isTrusted:trust});}finally{gesture=false;}};
 const navigate=(target,extra={})=>nodes[target].events.click({isTrusted:true,...extra});
 const view=(trust=true,inPage=true)=>{gesture=trust;try{documentHandlers.click({isTrusted:trust,target:{closest:()=>inPage?null:{}}});}finally{gesture=false;}};
 const hide=state=>{document.hidden=state;documentHandlers.visibilitychange();};
 return {button,badge,status,press,view,navigate,hide,pagehide:()=>handlers.pagehide(),pageshow:()=>handlers.pageshow(),trace,clips,plays,store,mounted:()=>nativeMounted};
}
test('HTML provides a mute/retry control; autonomous attempt is script-coordinated on Carrier only',()=>{
 const carrier=read('carrier.html'),index=read('index.html');
 assert.match(carrier,/<button\b[^>]*id="carrier-engine-sound"[^>]*aria-pressed="false" hidden>/);
 assert.match(carrier,/<p\b[^>]*id="carrier-engine-feedback"[^>]*role="status"/);
 assert.doesNotMatch(carrier,/<audio\b|\bautoplay\b|carrier-engine-loop\.mp3|rel="preload"/);
 assert.match(carrier,/<script src="\.\/carrier-audio\.js\?v=\d+" defer>/);
 assert.doesNotMatch(index,/carrier-audio|carrier-engine-loop|carrier-engine-sound/);
 assert.doesNotMatch(read('game.js'),/carrier-engine-loop/);
 assert.match(fs.readFileSync(path.join(__dirname,'..','README.md'),'utf8'),/Space Flight 11 by bretbernhoft[^\n]*433378/);
 const clip=fs.readFileSync(path.join(site,'carrier-engine-loop.mp3'));
 assert.ok(clip.length>80_000&&clip.length<120_000);
});

const pref='rift-runner.carrier-engine-muted.v1';
test('allowed autoplay starts on visible entry once; state reports real playback and explicit Off persists',async()=>{
 const q=browser();
 assert.equal(q.button.hidden,false);assert.equal(q.badge.textContent,'Starting…');
 assert.deepEqual(q.trace,['create','mount','source:./carrier-engine-loop.mp3','play']);
 assert.deepEqual(q.plays,[false],'native automatic attempt does not fake a gesture');
 q.pageshow();q.hide(false);q.press(false);assert.equal(q.clips.length,1);
 const a=q.clips[0];assert.equal(a.loop,true);assert.equal(a.preload,'none');assert.equal(q.mounted(),1);
 assert.equal(q.button.attrs['aria-pressed'],'false');
 a.begin();await tick();assert.equal(q.badge.textContent,'On');assert.equal(q.button.attrs['aria-pressed'],'true');
 a.currentTime=5;q.press();
 assert.equal(q.mounted(),0);assert.equal(a.paused,true);assert.equal(a.currentTime,0);assert.equal(a.src,'');
 assert.equal(q.badge.textContent,'Off');assert.equal(q.button.attrs['aria-pressed'],'false');assert.equal(q.store.get(pref),'1');
 q.hide(true);q.hide(false);q.pagehide();q.pageshow();assert.equal(q.clips.length,1);
 const reload=browser({store:q.store});assert.equal(reload.badge.textContent,'Off');assert.equal(reload.clips.length,0);
 reload.view();assert.equal(reload.clips.length,0,'changing views does not unmute');
 reload.press();assert.deepEqual(reload.plays,[true]);assert.equal(reload.store.has(pref),false);
});

test('a tap turns off and disposes a pending start before late callbacks can assert sound is on',async()=>{
 const q=browser();const clip=q.clips[0];q.press();
 assert.equal(q.mounted(),0);assert.equal(q.badge.textContent,'Off');assert.equal(q.store.get(pref),'1');
 clip.begin();await tick();assert.equal(clip.paused,true);assert.equal(q.badge.textContent,'Off');
});

test('late pending work is fenced after hide and a newer visible attempt',async()=>{
 const q=browser();const stale=q.clips[0];q.hide(true);
 assert.equal(q.mounted(),0);assert.equal(q.badge.textContent,'Off');
 q.hide(false);q.pageshow();assert.equal(q.clips.length,2);assert.equal(q.mounted(),1);
 const fresh=q.clips[1];fresh.begin();await tick();assert.equal(q.badge.textContent,'On');
 stale.begin();stale.events.playing();await tick();
 assert.equal(stale.paused,true);assert.equal(fresh.paused,false);
 assert.equal(q.mounted(),1);assert.equal(q.badge.textContent,'On');
 stale.events.error?.();assert.equal(q.badge.textContent,'On');
 q.pagehide();assert.equal(q.mounted(),0);assert.equal(q.badge.textContent,'Off');
 q.hide(false);assert.equal(q.clips.length,2,'no restart while departing before pageshow');
 q.pageshow();q.hide(false);assert.equal(q.clips.length,3);assert.equal(q.mounted(),1);
});

test('blocked policy never loops; next real Carrier page tap is a synchronous native fallback',async()=>{
 const q=browser();q.clips[0].fail('NotAllowedError');await tick();
 assert.equal(q.badge.textContent,'Tap to play');assert.equal(q.button.attrs['aria-pressed'],'false');
 assert.equal(q.mounted(),0);assert.match(q.status.textContent,/Tap anywhere on the Carrier page/);
 q.hide(true);q.view();q.hide(false);q.pagehide();q.pageshow();q.view(false);q.view(true,false);
 assert.equal(q.clips.length,1);
 q.view();assert.deepEqual(q.plays,[false,true]);assert.equal(q.mounted(),1);
 q.view();assert.equal(q.clips.length,2,'duplicate label/input click cannot start multiple players');
 q.clips[1].begin();await tick();assert.equal(q.badge.textContent,'On');
 const denied=browser();denied.clips[0].fail('NotAllowedError');await tick();denied.view();
 denied.clips[1].fail('NotAllowedError');await tick();
 denied.view();assert.equal(denied.clips.length,2);
 assert.equal(denied.status.textContent,'Playback was blocked. Tap Engine Sound to try again.');
 denied.press();assert.equal(denied.clips.length,3);
 assert.deepEqual(denied.plays,[false,true,true]);
});

test('hidden initial entry, native navigation, and media interruptions leave no background audio',async()=>{
 const hidden=browser({initiallyHidden:true});hidden.pageshow();assert.equal(hidden.clips.length,0);
 hidden.hide(false);assert.equal(hidden.clips.length,1);
 for(const way of ['carrier-hangar','carrier-launch-practice','carrier-launch-vandul','carrier-shop','carrier-back','native-pause']){
  const q=browser();const a=q.clips[0];a.begin();await tick();a.currentTime=10;
  if(way==='native-pause')a.pause();else q.navigate(way);
  assert.equal(q.mounted(),0);assert.equal(q.badge.textContent,'Off');
  assert.equal(a.currentTime,0);assert.equal(a.src,'');
  assert.equal(q.clips.length,1);
 }
 const modified=browser();modified.navigate('carrier-back',{metaKey:true});
 assert.equal(modified.mounted(),1,'opening another tab does not incorrectly flag departure');
});

test('invalid file, unsupported and synchronous errors are nonplaying; user can retry explicitly',async()=>{
 const q=browser();q.clips[0].events.error();assert.equal(q.badge.textContent,'Unavailable');assert.equal(q.mounted(),0);
 q.clips[0].fail('NotSupportedError');await tick();assert.equal(q.badge.textContent,'Unavailable');
 q.view();q.hide(true);q.hide(false);assert.equal(q.clips.length,1,'unavailable is not a policy block');
 q.press();assert.equal(q.clips.length,2);
 const missing=browser({unsupported:true});assert.equal(missing.badge.textContent,'Unavailable');assert.deepEqual(missing.trace,['create']);
 const exception=browser({throws:'NotAllowedError'});assert.equal(exception.badge.textContent,'Tap to play');assert.equal(exception.mounted(),0);
 const legacy=browser({noPromise:true});assert.equal(legacy.badge.textContent,'Starting…');
 legacy.clips[0].paused=false;legacy.clips[0].events.playing();assert.equal(legacy.badge.textContent,'On');
});
