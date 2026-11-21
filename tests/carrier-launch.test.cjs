'use strict';
const assert=require('node:assert/strict'),test=require('node:test'),fs=require('node:fs'),path=require('node:path');
const {setup,tick,arrive}=require('./ballistic.test.cjs');
const site=['../dist','..'].map(f=>path.join(__dirname,f)).find(f=>fs.existsSync(path.join(f,'carrier.html')));
const read=name=>fs.readFileSync(path.join(site,name),'utf8');
function load(search,options={}){
 const returned=[],address={search,replace(url){if(options.failReturn)throw Error('unavailable');returned.push(url);}};
 const q=setup({address,legacyArenaHangar:false,...options});
 return {q,returned};
}
const startMuted=q=>{
 assert.equal(q.inspect().state,'play');
 assert.equal(q.el['arena-screen'].hidden,false);
 assert.equal(q.el['main-menu'].hidden,true);
 assert.equal(q.el['return-main-menu'].textContent,'Carrier');
 assert.equal(q.el['return-main-menu'].attrs['aria-label'],'Return to Carrier');
 assert.equal(q.el.hangar.open,false);
 assert.equal(q.graphs.length,0,'cross-page launch cannot count as arena audio activation');
};
function stillDocked(q){
 assert.equal(q.inspect().state,'menu');assert.equal(q.el['arena-screen'].hidden,true);
 assert.equal(q.inspect().duelCountdown,0);assert.equal(q.inspect().vandul,null);
}
test('only Carrier exposes native launch choices and compact accessible side rails',()=>{
 const html=read('carrier.html'),css=read('carrier.css'),menu=read('index.html');
 assert.match(html,/<div class="carrier-launch-actions" role="group" aria-label="Launch fighter">/);
 assert.match(html,/<a[^>]*id="carrier-launch-practice" href="\.\/index\.html\?launch=practice">Practice Alone<\/a>/);
 assert.match(html,/<a[^>]*id="carrier-launch-vandul" href="\.\/index\.html\?launch=vandul">Fight Vandul<\/a>/);
 assert.match(css,/\.carrier-berth\{[^}]*min-height:44px/);
 assert.match(css,/--rail:clamp\(68px,21vw,127px\)/);
 assert.match(css,/\.carrier-footer\{[^}]*justify-content:space-between[^}]*pointer-events:none/);
 assert.match(css,/\.carrier-launch-actions,\.carrier-side-utilities\{[^}]*width:var\(--rail\)[^}]*pointer-events:auto/);
 assert.match(css,/\.carrier-art\{[^}]*inset-inline:calc\(var\(--rail-left\) \+ \.48 \* var\(--rail\) \+ var\(--rail-gap\)\)/);
 assert.match(css,/\.carrier-launch-actions \.carrier-berth,\.carrier-side-utilities \.carrier-berth\{[^}]*white-space:normal/);
 assert.match(css,/env\(safe-area-inset-bottom/);
 assert.match(menu,/<a class="menu-choice menu-choice-primary" id="main-menu-carrier"/);
 assert.doesNotMatch(menu,/<[^>]*[?&]launch=|>Fight Vandul<|>Practice Alone</);
});
test('practice starts without audio or enemies, keeps actual fit, and exits to Carrier',async()=>{
 const {q,returned}=load('?launch=practice',{savedEngine:JSON.stringify({version:1,engine:'test-thruster'})});
 startMuted(q);assert.equal(q.inspect().cones.length,8);assert.equal(q.inspect().asteroids.length,0);
 assert.equal(q.inspect().p.speed,22.2);
 q.step(540);assert.equal(q.inspect().vandul,null);assert.equal(q.inspect().duelCountdown,0);
 q.key('keydown','KeyD');q.key('keyup','KeyD');await tick();assert.equal(q.graphs.length,1,'first trusted local flight input starts audio');
 q.click('return-main-menu');stillDocked(q);
 assert.deepEqual(returned,['./carrier.html']);assert.equal(q.graphs[0].state,'closed');
 assert.equal(q.inspect().fighterLoadout.engine,'test-thruster');
 q.pageShow();q.hide(false);q.step(520);stillDocked(q);assert.deepEqual(returned,['./carrier.html']);
});
test('duel route runs the normal countdown/entry with no audio, and pause/loss exit return to Carrier',()=>{
 const paused=load('?launch=vandul');startMuted(paused.q);
 assert.equal(paused.q.inspect().duelCountdown,3);assert.equal(paused.q.inspect().asteroids.length,3);
 assert.ok(arrive(paused.q));assert.equal(paused.q.graphs.length,0);
 paused.q.key('keydown','KeyP');assert.equal(paused.q.inspect().state,'pause');
 assert.match(paused.q.el.overlay.innerHTML,/data-rift="main-menu">Back to Carrier/);
 paused.q.choose('main-menu');stillDocked(paused.q);assert.deepEqual(paused.returned,['./carrier.html']);
 const lost=load('?launch=vandul');startMuted(lost.q);assert.ok(arrive(lost.q));
 Object.assign(lost.q.inspect().p,{x:930,y:600,vx:255,vy:0,hp:1});lost.q.step(2);
 assert.equal(lost.q.inspect().state,'disabled');
 assert.match(lost.q.el.overlay.innerHTML,/data-rift="main-menu">Back to Carrier/);
 lost.q.choose('main-menu');stillDocked(lost.q);assert.deepEqual(lost.returned,['./carrier.html']);
});
test('a hidden launch waits once; parked page, return failure and reset cannot cause a duplicate launch',()=>{
 const {q,returned}=load('?launch=vandul',{initialHidden:true,failReturn:true});
 stillDocked(q);q.step(450);assert.equal(q.graphs.length,0);
 q.pageHide();q.hide(false);stillDocked(q);
 q.pageShow();startMuted(q);assert.equal(q.inspect().duelCountdown,3);
 q.step(75);const before=q.inspect().duelCountdown;
 q.pageShow();assert.equal(q.inspect().duelCountdown,before,'pageshow cannot restart a used route');
 q.reset();assert.equal(q.inspect().duelCountdown,3);assert.equal(q.el['return-main-menu'].textContent,'Carrier');
 q.click('return-main-menu');stillDocked(q);assert.deepEqual(returned,[]);assert.equal(q.focused,q.el['main-menu-carrier']);
 q.pageShow();q.hide(false);q.step(450);stillDocked(q);
});
test('ambiguous or tampered routes stay docked and cannot clash with the existing linked Hangar',()=>{
 for(const query of ['','?launch=Practice','?launch=practice&hangar=carrier','?hangar=carrier&launch=vandul','?launch=vandul&return=https://example.invalid','?launch=wreck','?launch=%76andul']){
  const {q}=load(query);stillDocked(q);assert.equal(q.el.hangar.open,false);
  q.menuAction('start');q.menuAction('practice');stillDocked(q);assert.equal(q.graphs.length,0);
 }
 const hangar=load('?hangar=carrier');stillDocked(hangar.q);assert.equal(hangar.q.el.hangar.open,true);
 assert.equal(hangar.q.el['close-hangar'].textContent,'Back to Carrier');
 hangar.q.click('close-hangar');assert.deepEqual(hangar.returned,['./carrier.html']);
});
