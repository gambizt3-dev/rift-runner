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
const startMuted=(q,state='play')=>{
 assert.equal(q.inspect().state,state);
 assert.equal(q.el['arena-screen'].hidden,false);
 assert.equal(q.el['main-menu'].hidden,true);
 assert.equal(q.el['return-main-menu'].textContent,'Return to Carrier');
 assert.equal(q.el['return-main-menu'].attrs['aria-label'],'Return to Carrier');
 assert.equal(q.el.hangar.open,false);
 assert.equal(q.graphs.length,0,'cross-page launch cannot count as arena audio activation');
};
function stillDocked(q){
 assert.equal(q.inspect().state,'menu');assert.equal(q.el['arena-screen'].hidden,true);
 assert.equal(q.inspect().duelCountdown,0);assert.equal(q.inspect().vandul,null);
}
test('Carrier Missions groups flights, both tests, and the Captain’s briefings',()=>{
 const html=read('carrier.html'),css=read('carrier.css'),menu=read('index.html');
 const missions=html.match(/<details class="carrier-missions" id="carrier-missions"[^>]*>([\s\S]*?)<\/details>\s*(?=<details class="carrier-interior")/);
 assert.ok(missions,'Missions is a native disclosure, closed initially');
 assert.match(missions[1],/<summary[^>]*>Missions /);
 assert.match(missions[1],/<div class="carrier-launch-actions" role="group" aria-label="Launch fighter">/);
 for(const id of ['carrier-launch-practice','carrier-launch-vandul','carrier-launch-wingman-test','carrier-launch-capital-test']){
  assert.ok(missions[1].includes(id));
  assert.ok(!html.replace(missions[0],'').includes(id));
 }
 assert.match(html,/<a[^>]*id="carrier-launch-practice" href="\.\/index\.html\?launch=practice&amp;departure=carrier">Practice Alone<\/a>/);
 assert.match(html,/<a[^>]*id="carrier-launch-vandul" href="\.\/index\.html\?launch=vandul&amp;departure=carrier">Fight Vandul<\/a>/);
 assert.match(missions[1],/<a[^>]*id="carrier-launch-wingman-test" href="\.\/index\.html\?launch=wingman-test&amp;departure=carrier"[^>]*>Wingman vs Vandul<\/a>/);
 assert.doesNotMatch(missions[1],/carrier-bridge\.html/,'the Bridge belongs to Explore Ship Interior');
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
 assert.equal(Math.round(q.inspect().p.speed),117);
 q.step(540);assert.equal(q.inspect().vandul,null);assert.equal(q.inspect().duelCountdown,0);
 q.key('keydown','KeyD');q.key('keyup','KeyD');await tick();assert.equal(q.graphs.length,1,'first trusted local flight input starts audio');
 q.click('return-main-menu');stillDocked(q);
 assert.deepEqual(returned,['./carrier.html']);assert.equal(q.graphs[0].state,'closed');
 assert.equal(q.inspect().fighterLoadout.engine,'test-thruster');
 q.pageShow();q.hide(false);q.step(520);stillDocked(q);assert.deepEqual(returned,['./carrier.html']);
});
const finishEntry=q=>{
 for(let i=0;i<132&&q.inspect().playerIngress;i++)q.step();
 assert.equal(q.inspect().state,'play');assert.equal(q.inspect().playerIngress,null);
};
test('duel flies north from outside, locks controls, then starts the normal enemy countdown',()=>{
 const {q}=load('?launch=vandul');startMuted(q,'arrive');
 const first=q.inspect(),badge=q.el['vandul-countdown'];
 assert.ok(first.p.y>first.arena.bottom&&first.camera.y+first.camera.h>1440);
 assert.equal(first.p.x,first.launch.x);
 assert.equal(first.duelCountdown,0);assert.equal(first.duelClock,0);assert.equal(first.vandul,null);
 assert.ok(first.asteroids.length>=3&&first.asteroids.length<=7);assert.equal(badge.hidden,false);assert.match(badge.textContent,/Leaving Carrier/);
 assert.equal(q.el['flight-deck'].inert,true);assert.equal(q.rack.inert,true);
 assert.equal(q.focused,q.el.game);
 q.click('fire-button');q.pointer('pointerdown');q.canvasPointer('pointerdown',240,360);q.key('keydown','KeyA');q.reset();
 q.step(60);
 assert.equal(q.inspect().p.x,first.launch.x);assert.ok(q.inspect().p.y<first.carrierArrival.fromY);
 assert.equal(q.inspect().p.hp,20);assert.equal(q.inspect().practiceShots,0);assert.equal(q.inspect().duelCountdown,0);
 assert.equal(q.inspect().vandulLasers.length,0);assert.equal(q.inspect().vandulIngress,null);assert.equal(q.graphs.length,0);
 finishEntry(q);
 const landed=q.inspect();
 assert.equal(landed.p.y,landed.launch.y);assert.equal(landed.duelCountdown,3);
 assert.equal(landed.p.vy,0);assert.equal(landed.p.hp,20);
 assert.ok(landed.camera.y+landed.camera.h<=1440);assert.match(badge.textContent,/Vandul incoming · 3/);
 assert.equal(q.el['flight-deck'].inert,false);assert.equal(q.rack.inert,false);
 assert.ok(arrive(q));assert.equal(q.graphs.length,0);
 q.reset();assert.equal(q.inspect().playerIngress,null);assert.equal(q.inspect().duelCountdown,3);
 assert.equal(q.inspect().p.y,landed.launch.y,'Reset immediately starts in the arena, not outside');
});
test('entry/normal pause exits and loss return to Carrier without replay or inherited audio gesture',()=>{
 const direct=load('?launch=vandul');startMuted(direct.q,'arrive');
 direct.q.click('return-main-menu');stillDocked(direct.q);assert.deepEqual(direct.returned,['./carrier.html']);
 const paused=load('?launch=vandul');startMuted(paused.q,'arrive');
 paused.q.key('keydown','KeyP');assert.equal(paused.q.inspect().state,'pause');
 assert.match(paused.q.el.overlay.innerHTML,/Entry paused.*data-rift="main-menu">Return to Carrier/);
 paused.q.choose('main-menu');stillDocked(paused.q);assert.deepEqual(paused.returned,['./carrier.html']);
 const lost=load('?launch=vandul');startMuted(lost.q,'arrive');finishEntry(lost.q);assert.ok(arrive(lost.q));
 Object.assign(lost.q.inspect().p,{x:930,y:600,vx:255,vy:0,hp:1});lost.q.step(2);
 assert.equal(lost.q.inspect().state,'disabled');
 assert.match(lost.q.el.overlay.innerHTML,/data-rift="main-menu">Return to Carrier/);
 lost.q.choose('main-menu');stillDocked(lost.q);assert.deepEqual(lost.returned,['./carrier.html']);
});
test('hidden or blurred entry freezes across long RAF suspension and requires an explicit resume',()=>{
 const {q,returned}=load('?launch=vandul',{initialHidden:true,failReturn:true});
 stillDocked(q);q.step(450);assert.equal(q.graphs.length,0);
 q.pageHide();q.hide(false);stillDocked(q);
 q.pageShow();startMuted(q,'arrive');assert.equal(q.inspect().duelCountdown,0);
 q.step(40);const before=q.inspect().p.y,progress=q.inspect().playerIngress.elapsed;
 q.pageShow();assert.equal(q.inspect().playerIngress.elapsed,progress,'pageshow cannot restart a consumed route');
 q.blur();assert.equal(q.inspect().state,'pause');
 q.hide(true);q.step(300);q.skipFrames(60000);q.hide(false);q.step(30);
 assert.equal(q.inspect().p.y,before);assert.equal(q.inspect().playerIngress.elapsed,progress);
 q.choose('resume');q.step();assert.equal(q.inspect().state,'arrive');assert.equal(q.inspect().p.y,before);
 finishEntry(q);assert.equal(q.inspect().duelCountdown,3);
 q.reset();assert.equal(q.inspect().duelCountdown,3);assert.equal(q.el['return-main-menu'].textContent,'Return to Carrier');
 q.click('return-main-menu');stillDocked(q);assert.deepEqual(returned,[]);assert.equal(q.focused,q.el['main-menu-carrier']);
 q.pageShow();q.hide(false);q.step(450);stillDocked(q);
});
test('reduced motion enters the standard arena directly and does not request flight audio',()=>{
 const {q}=load('?launch=vandul',{reducedMotion:true});
 startMuted(q);assert.equal(q.inspect().playerIngress,null);
 assert.equal(q.inspect().p.y,q.inspect().launch.y);assert.equal(q.inspect().duelCountdown,3);
 assert.equal(q.el['flight-deck'].inert,false);assert.equal(q.rack.inert,false);
 assert.match(q.el['vandul-countdown'].textContent,/Vandul incoming/);
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
test('each public sortie has the same visible Return to Carrier control and save-safe route',()=>{
 const qualifications=['wingman','ace','flight-lead','veteran','vanguard','rift-legend'];
 const routes=['?launch=practice','?launch=vandul','?launch=wingman-test','?launch=capital-test',...qualifications.map(id=>'?launch=vandul&mission='+id)];
 const game=read('index.html'),css=read('style.css');
 assert.match(game,/<button id="return-main-menu"[^>]*aria-label="Return to Carrier"[^>]*>Return to Carrier<\/button>/);
 assert.match(css,/\.arena-menu-entry\{[^}]*min-height:44px[^}]*white-space:normal/);
 for(const route of routes){
  const log={version:1,generation:'pilot',completedAt:1,...Object.fromEntries(qualifications.map((id,i)=>[id,{acceptedAt:2+i}]))};
  const fixture=()=>({loadPilotMissions:true,sharedStorage:new Map([
   ['rift-runner.character-generation.v1','pilot'],['rift-runner.mission-log.v1',JSON.stringify(log)]
  ])});
  const direct=load(route,fixture());
  startMuted(direct.q,['?launch=practice','?launch=capital-test'].includes(route)?'play':'arrive');
  direct.q.click('return-main-menu');stillDocked(direct.q);assert.deepEqual(direct.returned,['./carrier.html']);
  const paused=load(route,{reducedMotion:true,...fixture()});startMuted(paused.q);
  paused.q.key('keydown','KeyP');
  assert.match(paused.q.el.overlay.innerHTML,/data-rift="main-menu">Return to Carrier/);
  paused.q.choose('main-menu');stillDocked(paused.q);assert.deepEqual(paused.returned,['./carrier.html']);
 }
});
test('Return to Carrier after one kill keeps exactly the earned 2.5 credits and hull damage, but no win or completed mission',()=>{
 const vm=require('node:vm');
 const generationKey='rift-runner.character-generation.v1',walletKey='rift-runner.pilot-credits.v1',
  shipKey='rift-runner.ship-build.v1',hullKey='rift-runner.hull-owned.v1',missionKey='rift-runner.mission-log.v1';
 const owned=['stock-thruster','weifer-he3-core','kestrel-h20-reserve-cell','blaster'];
 const fit=JSON.stringify({version:1,hull:'rift-fighter',engine:owned[0],core:owned[1],battery:owned[2],primary:owned[3],secondary:null,shield:null});
 const mission=JSON.stringify({version:1,generation:'pilot',completedAt:1,intercept:{acceptedAt:2}});
 const storage=new Map([[generationKey,'pilot'],[walletKey,JSON.stringify({version:3,origin:'new',owned,balance:35,kills:0})],
  [shipKey,fit],[hullKey,JSON.stringify({version:1,hull:'rift-fighter',condition:'repaired'})],[missionKey,mission]]);
 const win={localStorage:{getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,v)}};
 vm.runInNewContext(read('pilot-credits.js'),{window:win,document:{getElementById:()=>null}});
 const {q,returned}=load('?launch=vandul',{sharedStorage:storage,pilotCredits:win.RiftCredits,loadPilotMissions:true,
  buildUI:true,reducedMotion:true,initialHe3:null,fieldSeed:836});
 startMuted(q);q.cover(false);const e=arrive(q),p=q.inspect().p;
 assert.ok(e);q.inspect().cones.splice(0);
 Object.assign(p,{x:420,y:920,aim:-Math.PI/2,vx:0,vy:0});
 Object.assign(e,{x:420,y:850,hp:3,vx:0,vy:0,nextLaser:999,nextDriveBy:999});
 q.click('fire-button');
 for(let i=0;i<20&&e.hp>0;i++)q.step();
 assert.equal(e.hp,0);assert.equal(q.inspect().duelResult,'won','one wave won, not the full sortie');
 assert.equal(win.RiftCredits.getBalance(),37.5);
 assert.equal(win.RiftCredits.getBuildState().kills,1);
 const s=q.inspect();
 Object.assign(p,{x:s.arena.right-p.r-.1,y:920,vx:240,vy:0,impactCooldown:0});q.step();
 assert.ok(p.hp>0&&p.hp<p.maxHp);
 assert.equal(JSON.parse(storage.get(hullKey)).hullHp,p.hp);
 const damaged=storage.get(hullKey);
 q.click('return-main-menu');stillDocked(q);assert.deepEqual(returned,['./carrier.html']);
 q.click('return-main-menu');q.pageShow();q.step(250);
 assert.deepEqual(returned,['./carrier.html']);assert.equal(win.RiftCredits.getBalance(),37.5);
 assert.equal(win.RiftCredits.getBuildState().kills,1);assert.equal(storage.get(missionKey),mission);
 assert.equal(storage.get(hullKey),damaged);assert.equal(storage.get(shipKey),fit);
});
