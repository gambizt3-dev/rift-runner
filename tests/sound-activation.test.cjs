'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=['../dist','..'].map(x=>path.join(__dirname,x)).find(x=>fs.existsSync(path.join(x,'sound-activation.js')));
const read=name=>fs.readFileSync(path.join(root,name),'utf8');
function harness({hidden=false}={}){
 const doc={},win={},timers=new Map();
 let now=0,id=0,blocked=true,muted=false,attempts=0,success=true;
 const host=()=>({append(node){node.parentNode=this;this.child=node;}});
 const document={hidden,body:host(),createElement:tag=>({tag,style:{}}),addEventListener(k,fn,opts){doc[k]=fn;if(k!=='visibilitychange')assert.equal(opts.capture,true);}};
 const window={addEventListener:(k,fn)=>win[k]=fn};
 vm.runInNewContext(read('sound-activation.js'),{document,window,setTimeout(fn,ms){timers.set(++id,[now+ms,fn]);return id;},clearTimeout:i=>timers.delete(i)});
 let parent=document.body;
 const refresh=window.RiftSoundActivation({needed:()=>blocked&&!muted,host:()=>parent,skip:target=>!!target?.navigation,
  start(){attempts++;if(success)blocked=false;}});
 return {document,win,refresh,get attempts(){return attempts;},get button(){return parent.child;},fail(){success=false;},allow(){success=true;},
  setMuted(value){muted=value;refresh();},move(){parent=host();refresh();},
  advance(ms){now+=ms;for(const [i,[when,fn]] of [...timers])if(when<=now){timers.delete(i);fn();}},
  fire(type,props={}){doc[type]({type,isTrusted:true,target:{},...props});}};
}
test('a real first tap unlocks immediately without injecting or consuming a click',()=>{
 const h=harness();
 h.advance(999);assert.equal(h.button,undefined);
 h.fire('click',{isTrusted:false});assert.equal(h.attempts,0);
 h.fire('touchend',{target:{navigation:true}});assert.equal(h.attempts,0);
 h.fire('touchend');assert.equal(h.attempts,1);
 h.fire('click');assert.equal(h.attempts,1,'paired click does not retry ready audio');
 h.advance(1);assert.equal(h.button,undefined);
});
test('after one second the prompt stays retryable until worked, then hides; mute and visibility are respected',()=>{
 const h=harness();h.advance(1000);
 assert.equal(h.button.textContent,'Tap to enable sound');assert.equal(h.button.hidden,false);
 h.fail();h.fire('click',{target:h.button});assert.equal(h.attempts,1);assert.equal(h.button.hidden,false);
 h.setMuted(true);assert.equal(h.button.hidden,true);
 h.fire('click');assert.equal(h.attempts,1);
 h.setMuted(false);assert.equal(h.button.hidden,false);
 h.move();assert.equal(h.button.hidden,false,'prompt can move inside an open dialog');
 h.win.pagehide();assert.equal(h.button.hidden,true);
 h.fire('click');assert.equal(h.attempts,1);
 h.win.pageshow({persisted:true});h.advance(999);assert.equal(h.button.hidden,true);
 h.advance(1);assert.equal(h.button.hidden,false);
 h.allow();h.fire('keydown',{key:'Tab'});assert.equal(h.attempts,1);
 h.fire('click',{target:h.button});assert.equal(h.attempts,2);assert.equal(h.button.hidden,true);
});
test('every page with page-owned game audio loads the helper before its controller',()=>{
 for(const [page,controller] of Object.entries({'index.html':'game.js','carrier.html':'carrier-audio.js','carrier-shop.html':'carrier-shop-ambient.js','carrier-bridge.html':'carrier-bridge.js'})){
  const html=read(page);
  const helper=html.indexOf('sound-activation.js?v=1'),handler=html.indexOf(controller+'?v=');
  assert.ok(helper>=0&&handler>helper,page);
  assert.match(read(controller),/RiftSoundActivation/);
 }
 assert.doesNotMatch(read('galaxy-map.html'),/sound-activation\.js/);
});
