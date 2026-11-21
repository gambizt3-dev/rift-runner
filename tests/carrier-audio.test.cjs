'use strict';
const assert=require('node:assert/strict'),test=require('node:test'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const site=['../dist','..'].map(p=>path.join(__dirname,p)).find(p=>fs.existsSync(path.join(p,'carrier.html')));
const read=name=>fs.readFileSync(path.join(site,name),'utf8');
const source=read('carrier-audio.js'),tick=()=>new Promise(setImmediate);
function browser({unsupported=false,throws=null,noPromise=false}={}){
 const handlers={},documentHandlers={},trace=[],clips=[],nodes={};
 let gesture=false,nativeMounted=0;
 const make=()=>({dataset:{state:'off'},hidden:true,attrs:{},events:{},
  setAttribute(k,v){this.attrs[k]=v;},addEventListener(k,v){this.events[k]=v;}
 });
 for(const id of ['carrier-engine-sound','carrier-engine-state','carrier-engine-feedback','carrier-hangar','carrier-back'])nodes[id]=make();
 const document={hidden:false,getElementById:id=>nodes[id],querySelector:s=>s==='.carrier-back'?nodes['carrier-back']:null,
  addEventListener(k,f){documentHandlers[k]=f;},
  body:{append(a){assert.ok(gesture,'mount must stay in trusted click');trace.push('mount');nativeMounted++;a.attached=true;}},
  createElement(tag){
   assert.equal(tag,'audio');assert.ok(gesture,'no media entity before trusted click');trace.push('create');
   let accept,reject;
   const ready=new Promise((ok,fail)=>{accept=ok;reject=fail;});
   const a={...make(),paused:true,currentTime:0,attached:false,
    begin(){this.paused=false;accept();},
    fail(name){reject({name});},
    set src(v){assert.ok(gesture,'the file request must be opt-in');trace.push('source:'+v);this.source=v;},get src(){return this.source??'';},
    play(){assert.ok(gesture,'play is synchronous in click, not deferred');trace.push('play');if(throws)throw {name:throws};return noPromise?undefined:ready;},
    pause(){trace.push('pause');this.paused=true;this.events.pause?.();},
    load(){assert.equal(this.src,'','media I/O is cancelled without re-requesting file');trace.push('reset');},
    removeAttribute(k){assert.equal(k,'src');this.source='';trace.push('clear');},
    remove(){if(this.attached){this.attached=false;nativeMounted--;trace.push('detach');}}
   };
   if(unsupported)delete a.play;
   clips.push(a);return a;
  }
 };
 vm.runInNewContext(source,{document,addEventListener(k,fn){handlers[k]=fn;}});
 const button=nodes['carrier-engine-sound'],badge=nodes['carrier-engine-state'],status=nodes['carrier-engine-feedback'];
 const press=(trust=true)=>{gesture=trust;try{button.events.click({isTrusted:trust});}finally{gesture=false;}};
 const navigate=target=>nodes[target].events.click({isTrusted:true});
 const hide=state=>{document.hidden=state;documentHandlers.visibilitychange();};
 return {button,badge,status,press,navigate,hide,pagehide:()=>handlers.pagehide(),trace,clips,mounted:()=>nativeMounted};
}
test('HTML provides one accessible opt-in and never includes a media source, preload or autoplay',()=>{
 const carrier=read('carrier.html'),index=read('index.html');
 assert.match(carrier,/<button\b[^>]*id="carrier-engine-sound"[^>]*aria-pressed="false" hidden>/);
 assert.match(carrier,/<p\b[^>]*id="carrier-engine-feedback"[^>]*role="status"/);
 assert.doesNotMatch(carrier,/<audio\b|\bautoplay\b|carrier-engine-loop\.mp3|rel="preload"/);
 assert.match(carrier,/<script src="\.\/carrier-audio\.js\?v=1" defer>/);
 assert.doesNotMatch(index,/carrier-audio|carrier-engine-loop|carrier-engine-sound/);
 assert.doesNotMatch(read('game.js'),/carrier-engine-loop/);
 assert.match(fs.readFileSync(path.join(__dirname,'..','README.md'),'utf8'),/Space Flight 11 by bretbernhoft[^\n]*433378/);
 const clip=fs.readFileSync(path.join(site,'carrier-engine-loop.mp3'));
 assert.ok(clip.length>80_000&&clip.length<120_000);
});

test('only a trusted, visible activation starts exactly one native loop and accurately reports playback',async()=>{
 const q=browser();
 assert.equal(q.button.hidden,false);assert.equal(q.badge.textContent,'Off');assert.deepEqual(q.trace,[]);
 q.press(false);q.hide(true);q.press();q.hide(false);assert.deepEqual(q.trace,[]);
 q.press();assert.deepEqual(q.trace,['create','mount','source:./carrier-engine-loop.mp3','play']);
 const a=q.clips[0];assert.equal(a.loop,true);assert.equal(a.preload,'none');assert.equal(q.mounted(),1);
 assert.equal(q.badge.textContent,'Starting…');assert.equal(q.button.attrs['aria-pressed'],'false');
 a.begin();await tick();assert.equal(q.badge.textContent,'On');assert.equal(q.button.attrs['aria-pressed'],'true');
 a.currentTime=5;q.press();
 assert.equal(q.mounted(),0);assert.equal(a.paused,true);assert.equal(a.currentTime,0);assert.equal(a.src,'');
 assert.equal(q.badge.textContent,'Off');assert.equal(q.button.attrs['aria-pressed'],'false');
});

test('a second tap cancels a pending start before it can assert that sound is on',async()=>{
 const q=browser();q.press();const clip=q.clips[0];q.press();
 assert.equal(q.mounted(),0);assert.equal(q.badge.textContent,'Off');
 clip.begin();await tick();assert.equal(clip.paused,true);assert.equal(q.badge.textContent,'Off');
});

test('late pending work is fenced after stop, hide and a newer attempt',async()=>{
 const q=browser();q.press();const stale=q.clips[0];q.hide(true);q.hide(false);
 assert.equal(q.mounted(),0);assert.equal(q.badge.textContent,'Off');assert.equal(q.clips.length,1);
 q.press();const fresh=q.clips[1];fresh.begin();await tick();assert.equal(q.badge.textContent,'On');
 stale.begin();stale.events.playing();await tick();
 assert.equal(stale.paused,true);assert.equal(fresh.paused,false);
 assert.equal(q.mounted(),1);assert.equal(q.badge.textContent,'On');
 stale.events.error?.();assert.equal(q.badge.textContent,'On');
 q.pagehide();assert.equal(q.mounted(),0);assert.equal(q.badge.textContent,'Off');
 q.hide(false);assert.equal(q.clips.length,2,'no automatic restart on show');
});

test('both native navigation targets and media interruption reset the loop while keeping links usable',async()=>{
 for(const way of ['carrier-hangar','carrier-back','native-pause']){
  const q=browser();q.press();const a=q.clips[0];a.begin();await tick();a.currentTime=10;
  if(way==='native-pause')a.pause();else q.navigate(way);
  assert.equal(q.mounted(),0);assert.equal(q.badge.textContent,'Off');
  assert.equal(a.currentTime,0);assert.equal(a.src,'');
 }
});

test('browser refusal, invalid file, unsupported and synchronous errors are nonplaying and retryable',async()=>{
 const rejected=browser();rejected.press();rejected.clips[0].fail('NotAllowedError');await tick();
 assert.equal(rejected.badge.textContent,'Blocked');assert.equal(rejected.button.attrs['aria-pressed'],'false');
 assert.equal(rejected.mounted(),0);assert.match(rejected.status.textContent,/Tap Engine Sound/);
 rejected.press();rejected.clips[1].events.error();assert.equal(rejected.badge.textContent,'Unavailable');assert.equal(rejected.mounted(),0);
 rejected.clips[1].fail('NotSupportedError');await tick();assert.equal(rejected.badge.textContent,'Unavailable');
 const missing=browser({unsupported:true});missing.press();assert.equal(missing.badge.textContent,'Unavailable');assert.deepEqual(missing.trace,['create']);
 const exception=browser({throws:'NotAllowedError'});exception.press();assert.equal(exception.badge.textContent,'Blocked');assert.equal(exception.mounted(),0);
 const legacy=browser({noPromise:true});legacy.press();assert.equal(legacy.badge.textContent,'Starting…');
 legacy.clips[0].paused=false;legacy.clips[0].events.playing();assert.equal(legacy.badge.textContent,'On');
});
