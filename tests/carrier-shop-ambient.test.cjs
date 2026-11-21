'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const dir=['../dist','..'].map(p=>path.join(__dirname,p)).find(p=>fs.existsSync(path.join(p,'carrier-shop-ambient.js')));
const script=fs.readFileSync(path.join(dir,'carrier-shop-ambient.js'),'utf8');
test('the shop-only loop waits for a real gesture, yields to Mara, and stops when leaving',()=>{
 const handlers={},voiceHandlers={},windowHandlers={},ambientHandlers={};
 const voice={paused:true,ended:false,addEventListener:(t,fn)=>voiceHandlers[t]=fn};
 let elem;
 class Audio{
  constructor(src){this.src=src;this.paused=true;this.plays=0;elem=this;}
  addEventListener(t,cb){ambientHandlers[t]=cb;}
  play(){this.paused=false;this.plays++;return Promise.resolve();}
  pause(){this.paused=true;}
 }
 const document={hidden:false,getElementById:id=>id==='shop-mara-voice'?voice:null,addEventListener:(t,cb)=>handlers[t]=cb};
 const window={addEventListener:(t,cb)=>windowHandlers[t]=cb};
 vm.runInNewContext(script,{document,window,Audio});
 assert.equal(elem.src,'./freesound_community-spaceship-ambient-27988.mp3');
 assert.equal(elem.loop,true);assert.equal(elem.preload,'none');assert.equal(elem.plays,0);
 handlers.click({isTrusted:false});assert.equal(elem.plays,0);
 voice.paused=false;handlers.click({isTrusted:true});assert.equal(elem.plays,0,'first tap on Mara does not compete with dialogue');
 voiceHandlers.play();assert.equal(elem.paused,true);
 voice.ended=true;voiceHandlers.ended();assert.equal(elem.plays,1);
 voice.ended=false;voiceHandlers.play();assert.equal(elem.paused,true);
 voice.paused=true;voiceHandlers.pause();assert.equal(elem.plays,2);
 document.hidden=true;handlers.visibilitychange();assert.equal(elem.paused,true);
 document.hidden=false;handlers.visibilitychange();assert.equal(elem.plays,3);
 windowHandlers.pagehide();handlers.click({isTrusted:true});assert.equal(elem.paused,true);assert.equal(elem.plays,3);
 windowHandlers.pageshow();assert.equal(elem.plays,4);
 ambientHandlers.error();handlers.click({isTrusted:true});assert.equal(elem.plays,4);assert.equal(elem.paused,true);
});
