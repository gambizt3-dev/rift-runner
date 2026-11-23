'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {setup,tick}=require('./ballistic.test.cjs');

const logKey='rift-runner.mission-log.v1',generationKey='rift-runner.character-generation.v1';
const fit={engine:'stock-thruster',core:'weifer-he3-core',battery:'kestrel-h20-reserve-cell',primary:'ballistic'};
function launch({mode='wingman',record=true,replay=false,reducedMotion=true,formation,formationGeneration='pilot',allyPaint,ready=true,hullHp,layout,layoutGeneration='pilot',resumeBag,primary='ballistic',secondary=null,active,sprite=false,canvasArchive=false,seed=777}={}){
 const equipped={...fit,primary,secondary};const available=Object.values(equipped).filter(Boolean);
 const log={version:1,generation:'pilot',completedAt:2,
  wingman:record?{acceptedAt:3,...(replay?{victoryAt:4,lodgedAt:5}:{})}:undefined,
  ace:{acceptedAt:6}};
 const bag=resumeBag??new Map([[logKey,JSON.stringify(log)],[generationKey,'pilot'],
  ['rift-runner.hull-owned.v1',JSON.stringify({version:1,hull:'rift-fighter',condition:'repaired',...(hullHp===undefined?{}:{hullHp,maxHullHp:20})})],
  ['rift-runner.ship-build.v1',JSON.stringify({version:1,hull:'rift-fighter',...equipped,...(ready?{}:{battery:null})})]]);
 if(formation!==undefined)bag.set('rift-runner.squadron-formation.v1',JSON.stringify({version:1,generation:formationGeneration,formation}));
 if(active)bag.set('rift-runner.ship-active-gun.v1',active);
 if(layout)bag.set('rift-runner.squadron-test-layout.v1',JSON.stringify({version:1,generation:layoutGeneration,layout}));
 let personalKills=0,rewards=0;const visits=[];
 const search=mode==='practice'?'?launch=practice':mode==='duel'?'?launch=vandul':mode==='wingman-test'?'?launch=wingman-test':'?launch=vandul&mission='+mode;
 const q=setup({buildUI:true,loadPilotMissions:true,sharedStorage:bag,reducedMotion,allyPaint,sprite,fieldSeed:seed,canvasArchive,
  address:{search,replace(url){visits.push(url);}},pilotCredits:{getBuildState:()=>({origin:'new',owned:available,kills:10}),
   owns:id=>available.includes(id),recordEnemyKill(){personalKills++;return {saved:true,amount:2.5};},
   awardVictory(){rewards++;return {saved:true,amount:20};}}});
 return {q,bag,visits,personalKills:()=>personalKills,rewards:()=>rewards};
}
function stageEnemy(q,hp=2){
 q.cover(false);q.target(true);
 const {p,vandul,cones}=q.inspect();cones.splice(0);
 Object.assign(vandul,{x:p.x+78,y:p.y-180,vx:0,vy:0,hp,nextLaser:1e4,nextDriveBy:1e4});
 return vandul;
}
function until(q,check,max=130){
 for(let i=0;i<max;i++){q.step();if(check())return true;}
 return false;
}
test('one allied fighter joins boarding fly-in, survives reset, and is restricted to explicit Wingman sorties',async()=>{
 const {q}=launch({reducedMotion:false});await tick();
 assert.equal(q.inspect().state,'arrive');
 assert.match(q.el['vandul-duel-readout'].textContent,/Ally 20\/20 HP · Ally kills 0/);
 assert.equal(q.inspect().shots.length,0);
 q.step(48);const y=q.inspect().p.y;
 q.hide(true);q.step(200);
 assert.equal(q.inspect().p.y,y);assert.equal(q.inspect().shots.length,0);
 q.hide(false);q.open('resume');
 assert.equal(until(q,()=>q.inspect().state==='play',270),true);
 assert.match(q.el['vandul-duel-readout'].textContent,/Ally 20\/20 HP/);
 q.reset();assert.match(q.el['vandul-duel-readout'].textContent,/Ally 20\/20 HP · Ally kills 0/);
 const replay=launch({replay:true}).q;assert.match(replay.el['vandul-duel-readout'].textContent,/Ally 20\/20 HP/);
 for(const mode of ['duel','ace','practice']){
  const other=launch({mode,formation:'echelon-left'}).q;await tick();other.step(10);
  assert.doesNotMatch(other.el['vandul-duel-readout'].textContent??'',/Ally/);
 }
 const unauth=launch({record:false}).q;await tick();unauth.step(10);
 assert.equal(unauth.inspect().state,'menu');
 assert.doesNotMatch(unauth.el['vandul-duel-readout'].textContent??'',/Ally/);
});
test('AI allied shots finish a wave but never claim pilot kills, shots, or bonus credits',()=>{
 const {q,personalKills,rewards}=launch();
 const target=stageEnemy(q);
 assert.equal(until(q,()=>q.inspect().shots.some(b=>b.ally)),true,'live AI fires an actual projectile');
 const shot=q.inspect().shots.find(b=>b.ally);
 assert.equal(shot.damage,5);
 assert.ok(shot.x>q.inspect().p.x+19,'projectile originates at ally, not player');
 assert.equal(until(q,()=>target.hp===0),true);
 assert.equal(q.inspect().duelResult,'won');
 assert.equal(q.inspect().duelKills,0);
 assert.match(q.el['vandul-duel-readout'].textContent,/Kills 0.*Ally kills 1/);
 assert.equal(q.inspect().practiceShots,0);
 assert.equal(personalKills(),0);assert.equal(rewards(),0);
});
test('an ally final blow completes the sortie using the normal victory reward and no personal final kill',()=>{
 const {q,bag,personalKills,rewards}=launch();
 const target=stageEnemy(q);q.armFinalForTest();
 assert.equal(until(q,()=>target.hp===0),true);
 assert.equal(q.inspect().duelResult,'victory');
 assert.equal(q.inspect().duelKills,9);
 assert.equal(personalKills(),0);
 assert.equal(rewards(),1);
 assert.equal(!!JSON.parse(bag.get(logKey)).wingman.victoryAt,true);
 assert.equal(JSON.parse(bag.get(logKey)).wingman.lodgedAt,undefined);
 q.step(240);assert.equal(rewards(),1);
});
test('the ally holds fire behind cover and can be disabled without ending the sortie',()=>{
 const {q}=launch(),target=stageEnemy(q,20),{p,cones}=q.inspect();
 cones.push({x:p.x+69,y:p.y-54,r:29,angle:0,vx:0,vy:0,spin:0,hitGlow:0,wallFx:0,invMass:1});
 assert.equal(until(q,()=>q.inspect().shots.some(b=>b.ally),48),false);
 assert.equal(target.hp,20);
 cones.splice(0);
 assert.equal(until(q,()=>q.inspect().shots.some(b=>b.ally)),true);
 const muzzle=q.inspect().shots.find(b=>b.ally),x=muzzle.x-Math.cos(muzzle.a)*22,y=muzzle.y-Math.sin(muzzle.a)*22;
 for(let i=0;i<10;i++)q.inspect().vandulLasers.push({x,y,vx:0,vy:0,a:0,life:1,damage:2,owner:target});
 q.step(2);
 assert.match(q.el['vandul-duel-readout'].textContent,/Ally disabled/);
 assert.equal(p.hp,p.maxHp);assert.equal(q.inspect().state,'play');
 q.step(180);assert.equal(q.inspect().shots.some(b=>b.ally),false,'disabled ally stops shooting');
});
const formations=[
 ['front-left',[-30,-36],[-54,-54]],
 ['front',[0,-56],[0,-76]],
 ['front-right',[30,-36],[54,-54]],
 ['side-left',[-30,0],[-70,0]],
 ['echelon-right',[30,36],[54,54]],
 ['echelon-left',[-30,36],[-54,54]],
 ['trail',[0,56],[0,76]],
 ['line-abreast',[30,0],[70,0]]
];
function offset(q,draws){
 const ally=draws.at(-1),{p}=q.inspect();
 assert.ok(ally,'exact ally position is observed from rendered marker');
 return [ally.x-p.x,ally.y-p.y];
}
function closeOffset(current,expected,tolerance){
 current.forEach((value,i)=>assert.ok(Math.abs(value-expected[i])<=tolerance,`${current.join(',')} expected ${expected.join(',')}`));
}
test('all eight saved formations move arrival and follow, with mission north independent of aim and on replay',()=>{
 for(const [formation,entry,follow] of formations){
  const draws=[],{q}=launch({formation,replay:true,reducedMotion:false,allyPaint:draws});
  assert.equal(q.inspect().state,'arrive');
  q.step(1);closeOffset(offset(q,draws),entry,.001);
  assert.ok(draws.at(-1).y-12>q.inspect().arena.bottom,'entire ally collider begins outside the southern wall');
  q.step(39);closeOffset(offset(q,draws),entry,.001);
  q.cover(false);q.inspect().cones.splice(0);
  assert.equal(until(q,()=>q.inspect().state==='play',240),true);
  q.step(65);closeOffset(offset(q,draws),follow,2);
  q.inspect().p.aim=Math.PI/2;
  q.step(30);closeOffset(offset(q,draws),follow,2);
  q.key('keydown','KeyD');q.step(32);q.key('keyup','KeyD');q.step(93);
  closeOffset(offset(q,draws),follow,5);
 }
});
test('invalid and wrong-pilot formation records safely retain original Echelon right',()=>{
 for(const [formation,formationGeneration] of [[undefined,'pilot'],['invalid','pilot'],['__proto__','pilot'],['echelon-left','different-pilot']]){
  const draws=[],{q}=launch({formation,formationGeneration,reducedMotion:false,allyPaint:draws});
  q.step(18);closeOffset(offset(q,draws),[30,36],.001);
 }
});
test('Formation is the default; Loose has bounded separation and rejoin returns to the saved tile',()=>{
 const draws=[],{q}=launch({formation:'echelon-left',allyPaint:draws});
 const controls=q.el['wingman-commands'],form=q.el['wingman-formation'],loose=q.el['wingman-loose'];
 assert.equal(controls.hidden,false);
 assert.equal(form.getAttribute('aria-pressed'),'true');
 assert.equal(loose.getAttribute('aria-pressed'),'false');
 q.cover(false);q.inspect().cones.splice(0);q.step(58);
 closeOffset(offset(q,draws),[-54,54],4);
 q.click('wingman-loose',{isTrusted:false});
 assert.equal(form.getAttribute('aria-pressed'),'true');
 let stopped=0;q.click('wingman-loose',{stopPropagation(){stopped++;}});
 assert.equal(stopped,1);assert.equal(loose.getAttribute('aria-pressed'),'true');
 q.step(60);assert.ok(Math.hypot(...offset(q,draws))>120);
 q.key('keydown','KeyD');
 for(let i=0;i<44;i++){q.step();assert.ok(Math.hypot(...offset(q,draws))<=235.00001);}
 q.key('keyup','KeyD');
 q.click('wingman-formation');
 q.step(78);closeOffset(offset(q,draws),[-54,54],5);
 assert.equal(form.getAttribute('aria-pressed'),'true');
 assert.equal(q.inspect().practiceShots,0);
});
test('the Loose order opens a nearby firing lane that Formation could not shoot through',()=>{
 const draws=[],{q}=launch({allyPaint:draws}),target=stageEnemy(q,20),{p,cones}=q.inspect();
 cones.push({x:p.x+69,y:p.y-54,r:29,angle:0,vx:0,vy:0,spin:0,hitGlow:0,wallFx:0,invMass:1});
 assert.equal(until(q,()=>q.inspect().shots.some(b=>b.ally),48),false);
 q.click('wingman-loose');
 assert.equal(until(q,()=>q.inspect().shots.some(b=>b.ally),100),true);
 assert.ok(Math.hypot(...offset(q,draws))<=235);
 assert.equal(until(q,()=>target.hp<20,70),true);
 assert.equal(q.inspect().practiceShots,0);
});
test('commands are hidden outside active Wingman flight, and pausing preserves the order',async()=>{
 const {q}=launch({reducedMotion:false}),controls=q.el['wingman-commands'],loose=q.el['wingman-loose'];
 await tick();assert.equal(controls.hidden,true);
 q.click('wingman-loose');assert.equal(loose.getAttribute('aria-pressed'),'false');
 assert.equal(until(q,()=>q.inspect().state==='play',270),true);assert.equal(controls.hidden,false);
 q.click('wingman-loose');q.key('keydown','KeyP');q.step();
 assert.equal(controls.hidden,true);
 q.open('resume');q.step();
 assert.equal(controls.hidden,false);assert.equal(loose.getAttribute('aria-pressed'),'true');
 q.hide(true);q.step();assert.equal(controls.hidden,true);
 q.hide(false);q.open('resume');q.step();
 assert.equal(controls.hidden,false);
 q.reset();q.step();assert.equal(loose.getAttribute('aria-pressed'),'false');
 q.click('return-main-menu');q.step();assert.equal(controls.hidden,true);
 for(const mode of ['duel','ace','practice'])assert.equal(launch({mode}).q.el['wingman-commands'].hidden,true);
});

test('Wingman Test skips qualification, uses formation and fit, and sends unready builds to Hangar',()=>{
 const draws=[],{q,bag,visits}=launch({mode:'wingman-test',record:false,layout:{player:'trail',wingman:'front-left'},allyPaint:draws,hullHp:7});
 const original=JSON.stringify([...bag]);
 assert.equal(q.inspect().state,'play');
 assert.equal(q.inspect().duelCountdown,0);
 assert.equal(q.inspect().vanduls.length,10);
 assert.equal(q.inspect().fighterLoadout.weapon,'ballistic');
 assert.equal(q.inspect().p.hp,20,'test uses temporary full hull, not saved battle damage');
 assert.equal(q.el['wingman-commands'].hidden,false);
 q.step(1);closeOffset(offset(q,draws),[-54,-92],1);
 q.click('wingman-loose');assert.equal(q.el['wingman-loose'].getAttribute('aria-pressed'),'true');
 q.click('return-main-menu');assert.deepEqual(visits,['./carrier.html']);
 assert.equal(JSON.stringify([...bag]),original);
 const nope=launch({mode:'wingman-test',record:false,ready:false}).q;
 assert.equal(nope.inspect().state,'menu');
 assert.equal(nope.el.hangar.open,true);
 assert.equal(nope.el['wingman-commands'].hidden,true);
});
test('Wingman Test needs a real knockout of all 10 deployed Vandul, returns without career writes',()=>{
 const {q,bag,visits,personalKills,rewards}=launch({mode:'wingman-test',canvasArchive:true});
 const original=JSON.stringify([...bag]),initial=q.inspect(),{p}=initial;
 const rivals=Array.from(initial.vanduls);
 assert.equal(rivals.length,10);
 q.cover(false);initial.cones.splice(0);
 for(const ally of [initial.testLead,initial.wingman])ally.fireWait=1e4;
 for(let i=0;i<rivals.length;i++){
  const target=rivals[i];
  for(const ship of q.inspect().vanduls)Object.assign(ship,{x:ship===target?480:120,y:ship===target?925:-275+ship.slot*78,
   vx:0,vy:0,nextLaser:1e4,nextDriveBy:1e4});
  target.hp=5;
  Object.assign(p,{x:480,y:1000,aim:-Math.PI/2,vx:0,vy:0});
  q.click('fire-button');assert.equal(until(q,()=>target.hp===0),true,'registered a physical finishing projectile');
  assert.equal(q.inspect().duelKills,i+1);
  assert.equal(q.inspect().vanduls.length,9-i);
  assert.equal(q.inspect().duelResult,i===9?'victory':null);
  assert.equal(q.inspect().duelCountdown,0);assert.equal(q.inspect().vandulIngress,null);
  if(i!==9){assert.match(q.el['vandul-duel-readout'].textContent,new RegExp((9-i)+'/10 Vandul remaining'));q.step(9);}
 }
 assert.equal(q.inspect().wreckLayer,null,'never allocate a world-sized bitmap for training wreckage');
 assert.equal(q.inspect().archivedWrecks.length,7);
 assert.equal(q.inspect().activeWrecks.length,3);
 assert.equal(q.el['wingman-commands'].hidden,true);
 assert.match(q.el.overlay.innerHTML,/10 VANDUL DEFEATED.*Wingman Test Complete.*No career progress was saved/);
 assert.doesNotMatch(q.el.overlay.innerHTML,/credits|Report to the Captain|waves/i);
 assert.equal(personalKills(),0);assert.equal(rewards(),0);
 q.step(185);assert.deepEqual(visits,['./carrier.html']);
 assert.equal(JSON.stringify([...bag]),original);
});
test('Wingman Test destruction requires Hangar repair but surviving damage stays transient',()=>{
 const {q,bag,visits,personalKills,rewards}=launch({mode:'wingman-test',record:false,hullHp:11});
 const hullKey='rift-runner.hull-owned.v1',original=new Map(bag);
 const target=stageEnemy(q,20),{p}=q.inspect();
 function hostileHit(damage){
  q.inspect().vandulLasers.push({x:p.x,y:p.y,a:0,vx:0,vy:0,life:1,damage,owner:target});
  q.step(3);
 }
 q.click('wingman-loose');hostileHit(2);
 assert.equal(p.hp,18);
 assert.deepEqual(bag,original,'surviving practice damage is not written');
 p.hp=1;hostileHit(2);
 assert.equal(q.inspect().state,'disabled');assert.equal(p.hp,0);
 assert.equal(q.el['wingman-commands'].hidden,true);
 assert.doesNotMatch(q.el.overlay.innerHTML,/Reset field/);
 assert.match(q.el.overlay.innerHTML,/Repair your fighter/);
 const saved=JSON.parse(bag.get(hullKey));
 assert.equal(saved.condition,'damaged');assert.equal(saved.hullHp,0);assert.equal(saved.maxHullHp,20);
 const delta=new Map(bag);delta.set(hullKey,original.get(hullKey));
 assert.deepEqual(delta,original,'only the hull certificate changes on a test loss');
 q.open('reset');q.step();
 assert.equal(q.inspect().state,'menu','a stale restart control cannot bypass repair');
 assert.deepEqual(visits,['./carrier.html']);
 const retry=launch({mode:'wingman-test',resumeBag:bag}).q;
 assert.equal(retry.inspect().state,'menu');assert.equal(retry.el.hangar.open,true);
 assert.equal(personalKills(),0);assert.equal(rewards(),0);
});

test('Wingman Test voluntary reset restores the sortie without changing pilot data',()=>{
 const {q,bag}=launch({mode:'wingman-test',record:false,hullHp:11});
 const original=new Map(bag);q.inspect().p.hp=8;
 q.click('wingman-loose');q.reset();q.step();
 assert.equal(q.inspect().state,'play');assert.equal(q.inspect().p.hp,20);
 assert.equal(q.el['wingman-formation'].getAttribute('aria-pressed'),'true');
 assert.deepEqual(bag,original);
});

const lastShip=(draws,label)=>draws.findLast(item=>item.label===label);
test('training flies in as three ships: AI lead centered, two distinct saved slots, and safe southern clearance',()=>{
 const draws=[],{q}=launch({mode:'wingman-test',record:false,reducedMotion:false,allyPaint:draws,layout:{player:'front',wingman:'side-left'}});
 q.step(28);
 assert.equal(q.inspect().state,'arrive');
 const lead=lastShip(draws,'AI LEAD'),wing=lastShip(draws,'ALLY'),{p,arena,launch:apron}=q.inspect();
 assert.equal(lead.x,apron.x);
 closeOffset([p.x-lead.x,p.y-lead.y],[0,-56],.001);
 closeOffset([wing.x-lead.x,wing.y-lead.y],[-54,0],.001);
 assert.equal(q.inspect().shots.length,0);
 const initial=[],start=launch({mode:'wingman-test',record:false,reducedMotion:false,allyPaint:initial,
  layout:{player:'front',wingman:'side-left'}}).q;
 start.step();
 assert.ok(start.inspect().p.y-start.inspect().p.r>arena.bottom);
 for(const label of ['AI LEAD','ALLY'])assert.ok(lastShip(initial,label).y-17>arena.bottom);
});
test('in Formation both ships hold their own relative slots with the AI lead, and pilot keeps manual controls',()=>{
 const draws=[],{q}=launch({mode:'wingman-test',allyPaint:draws,layout:{player:'echelon-left',wingman:'line-abreast'}});
 q.cover(false);q.inspect().cones.splice(0);q.step();
 const start=lastShip(draws,'AI LEAD'),{p}=q.inspect(),initialP=[p.x,p.y];
 q.step(62);
 const lead=lastShip(draws,'AI LEAD'),wing=lastShip(draws,'ALLY');
 assert.ok(lead.y<start.y-58,'lead advances independently while player does nothing');
 assert.ok(p.y<initialP[1]-45,'idle pilot receives gentle slot correction');
 closeOffset([p.x-lead.x,p.y-lead.y],[-54,54],14);
 assert.ok(Math.abs(wing.x-lead.x-70)<15,'wing stays beside the moving lead');
 assert.ok(Math.abs(wing.y-lead.y)<35);
 q.key('keydown','KeyA');q.step(20);q.key('keyup','KeyA');
 assert.ok(p.x<initialP[0]-12,'human can independently steer');
});
test('Loose sends the two AI into distinct lanes, then Formation re-joins; official route still has only one ally',()=>{
 const draws=[],{q}=launch({mode:'wingman-test',allyPaint:draws,layout:{player:'front-left',wingman:'echelon-right'}});
 q.cover(false);q.inspect().cones.splice(0);q.step();
 const {p}=q.inspect();
 q.click('wingman-loose');q.step(80);
 const lead=lastShip(draws,'AI LEAD'),wing=lastShip(draws,'ALLY');
 assert.ok(Math.hypot(lead.x-wing.x,lead.y-wing.y)>90,'independent reservations separate lanes');
 for(const ai of [lead,wing])assert.ok(Math.hypot(ai.x-p.x,ai.y-p.y)<=235);
 q.click('wingman-formation');q.step(85);
 const regroupedLead=lastShip(draws,'AI LEAD'),regroupedWing=lastShip(draws,'ALLY');
 assert.ok(Math.hypot(regroupedLead.x-regroupedWing.x,regroupedLead.y-regroupedWing.y)<115);
 const officialDraws=[],official=launch({allyPaint:officialDraws,formation:'front-left',
  layout:{player:'front',wingman:'trail'}}).q;
 official.step(2);
 assert.equal(lastShip(officialDraws,'AI LEAD'),undefined);
 closeOffset(offset(official,officialDraws),[-30,-36],1);
});
test('both test AI fire independently; disabling the lead leaves the other wing and training intact',()=>{
 const draws=[],{q,bag,personalKills,rewards}=launch({mode:'wingman-test',allyPaint:draws});
 const original=JSON.stringify([...bag]);
 const target=stageEnemy(q,20),{p}=q.inspect();
 Object.assign(target,{x:480,y:768});q.step(3);
 const sources=new Set();
 assert.equal(until(q,()=>{
  for(const shot of q.inspect().shots)if(shot.ally)sources.add(shot.allyRole);
  return sources.size===2;
 },125),true);
 assert.deepEqual([...sources].sort(),['lead','wingman']);
 const {x,y}=lastShip(draws,'AI LEAD');
 for(let i=0;i<10;i++)q.inspect().vandulLasers.push({x,y,vx:0,vy:0,a:0,life:1,damage:2,owner:target});
 q.step(2);
 assert.match(q.el['vandul-duel-readout'].textContent,/AI lead disabled · Ally 20\/20 HP/);
 assert.equal(q.el['wingman-commands'].hidden,false);
 assert.equal(q.inspect().state,'play');assert.equal(p.hp,20);
 q.click('wingman-loose');assert.equal(q.el['wingman-loose'].getAttribute('aria-pressed'),'true');
 assert.equal(JSON.stringify([...bag]),original);
 assert.equal(personalKills(),0);assert.equal(rewards(),0);
});

function captureAllyShots(q,at,untilShots,frames=260){
 const seen=new Set(),found=[];
 for(let frame=1;frame<=frames;frame++){
  at?.();
  q.step();
  for(const shot of q.inspect().shots)if(shot.ally&&!seen.has(shot)){
   seen.add(shot);found.push({shot,time:frame*.016});
  }
  if(found.length>=untilShots)break;
 }
 return found;
}
function pinTarget(q,target,draws,dx,dy){
 const ally=lastShip(draws,'ALLY'),{p}=q.inspect();
 Object.assign(target,{x:(ally?.x??p.x+54)+dx,y:(ally?.y??p.y+54)+dy,vx:0,vy:0,
  nextLaser:1e4,nextDriveBy:1e4});
}
test('A-Alkine ally chooses normal at range, then switches to the real six-shot burst close in',()=>{
 const draws=[],{q}=launch({allyPaint:draws});
 const target=stageEnemy(q,5000);
 const pair=captureAllyShots(q,()=>pinTarget(q,target,draws,0,-235),2);
 assert.equal(pair.length,2);
 for(const {shot} of pair){
  assert.equal(shot.weapon,'ballistic');assert.equal(shot.allyMode,'normal');assert.equal(shot.damage,5);
  assert.ok(Math.abs(Math.hypot(shot.vx,shot.vy)-570)<1e-6);
 }
 assert.ok(Math.abs(pair[1].time-pair[0].time-.125)<=.017,'normal pair uses actual weapon cadence');
 q.inspect().shots.splice(0);
 const bursts=captureAllyShots(q,()=>pinTarget(q,target,draws,26,-75),7);
 assert.equal(bursts.length,7);
 for(let i=0;i<bursts.length;i++){
  assert.equal(bursts[i].shot.allyMode,'burst');assert.equal(bursts[i].shot.damage,5);
  if(i>0&&i<6)assert.ok(Math.abs(bursts[i].time-bursts[i-1].time-.043)<=.017);
 }
 assert.ok(Math.abs(bursts[6].time-bursts[5].time-.46)<=.018,'full volley obeys weapon recovery');
 assert.ok(Math.abs(bursts[2].shot.a-bursts[0].shot.a)>.01,'rounds use the module spread pattern');
 assert.equal(q.inspect().practiceShots,0);
});
test('the loadout is frozen at launch: an equipped AK77 stays burst-only after the player switches weapons',()=>{
 const draws=[],{q}=launch({primary:'ballistic',secondary:'ak77',active:'ak77',allyPaint:draws});
 assert.equal(q.inspect().fighterLoadout.weapon,'ak77');
 const target=stageEnemy(q,10000);
 q.change('ballistic');
 assert.equal(q.inspect().fighterLoadout.weapon,'ballistic');
 const shots=captureAllyShots(q,()=>pinTarget(q,target,draws,0,-253),19,290);
 assert.equal(shots.length,19);
 for(let i=0;i<shots.length;i++){
  assert.equal(shots[i].shot.weapon,'ak77');assert.equal(shots[i].shot.allyMode,'burst');assert.equal(shots[i].shot.damage,2);
  if(i>0&&i<18)assert.ok(Math.abs(shots[i].time-shots[i-1].time-.035)<=.018);
 }
 assert.ok(Math.abs(shots[18].time-shots[17].time-1.75)<=.019);
});
test('a Sterling-only ally draws its own charge and shares the player fighter art, not the enemy hull or gun',()=>{
 const draws=[],{q}=launch({primary:'blaster',allyPaint:draws,sprite:true});
 const target=stageEnemy(q,1000);
 const sprite=q.sprites.find(image=>image.src.startsWith('./fighter-winged.png'));
 Object.assign(sprite,{complete:true,naturalWidth:480,naturalHeight:320});
 q.spriteFrames.length=0;q.step(1);
 assert.ok(q.spriteFrames.filter(frame=>frame.asset===sprite).length>=2,'both the player and ally render the fitted fighter art');
 assert.equal(q.inspect().vandulLoadout.hull,'crescent-hull');
 assert.equal(q.inspect().vandulLoadout.primary,'pulse-laser');
 assert.equal(q.inspect().vandulProfile.laser.damage,2);
 const shots=captureAllyShots(q,()=>pinTarget(q,target,draws,0,-235),2,120);
 assert.equal(shots.length,2);
 assert.ok(shots[0].time>=.48,'AI charge starts empty');
 assert.ok(shots[1].time-shots[0].time>=.5);
 for(const {shot} of shots){
  assert.equal(shot.weapon,'blaster');assert.equal(shot.damage,3);assert.equal(shot.allyMode,'normal');
 }
 assert.equal(q.inspect().p.he3,20,'AI firing does not debit the pilot battery');
 assert.equal(q.inspect().p.heat,0);
});

test('2/4/4 moving patrols stay in their bands until local sight; the squad can cross the long north map',()=>{
 const {q}=launch({mode:'wingman-test',layout:{player:'echelon-left',wingman:'echelon-right'}});
 const {p,vanduls,testLead,wingman,arena,asteroids,sceneryDebris,cones,vandulEntry}=q.inspect();
 assert.deepEqual([arena.left,arena.right,arena.top,arena.bottom],[12,948,-4068,1428]);
 assert.equal(arena.bottom-arena.top+24,5520);
 const fixed=Array.from(vanduls),groups=[fixed.slice(0,2),fixed.slice(2,6),fixed.slice(6)];
 assert.ok(groups[0].every(v=>v.y>700&&p.y-v.y>165));
 assert.ok(groups[1].every(v=>p.y-v.y>1900&&p.y-v.y<2300));
 assert.ok(groups[2].every(v=>p.y-v.y>4400&&p.y-v.y<4900));
 assert.ok(vandulEntry.aboveY<arena.top-20);
 assert.ok(asteroids.length>=11&&asteroids.length<=15);
 assert.ok(sceneryDebris.length>=7&&sceneryDebris.length<=9);
 assert.ok(asteroids.some(v=>v.y<-3350)&&asteroids.some(v=>v.y>-2100&&v.y<-1320),'far end and midfield have sparse cover');
 for(const [i,ship] of fixed.entries()){
  for(const item of [...fixed.slice(i+1),...asteroids,...sceneryDebris,...cones])
   assert.ok(Math.hypot(ship.x-item.x,ship.y-item.y)>ship.r+item.r+5);
  Object.assign(ship,{overheated:true,heat:100,heatRest:1e4});
 }
 q.cover(false);cones.splice(0);
 const starts=groups.slice(1).map(group=>group.map(v=>[v.x,v.y]));
 for(const ally of [testLead,wingman])ally.fireWait=1e4;
 q.step(110);
 groups.slice(1).forEach((group,i)=>{
  const [x,y]=starts[i][0];
  const drift=Math.hypot(group[0].x-x,group[0].y-y);
  assert.ok(drift>35&&drift<135,'unengaged squad is visibly moving on local patrol');
  group.forEach((v,j)=>{
   assert.ok(v.trainingGuard&&!v.attackTarget&&v.laserIndex===0);
   assert.ok(Math.abs(v.x-group[0].x-(starts[i][j][0]-x))<9);
   assert.ok(Math.abs(v.y-group[0].y-(starts[i][j][1]-y))<9);
  });
 });
 q.key('keydown','ArrowUp');q.step();q.key('keyup','ArrowUp');
 q.key('keydown','KeyE');
 assert.ok(until(q,()=>p.y<-1250,760),'pilot actually travels through past the midfield');
 assert.ok(testLead.y<-1010&&wingman.y<-1010&&[testLead,wingman].every(a=>Math.hypot(a.x-p.x,a.y-p.y)<=235+1e-8),'both AIs move north with pilot: '+[p.y,testLead.y,wingman.y]);
 assert.ok(groups[1].some(v=>!v.trainingGuard),'nearby middle patrol broke formation on contact');
 assert.ok(groups[2].every(v=>v.trainingGuard),'no remote far-band response');
 assert.ok(until(q,()=>p.y<-3450,880),'pilot reaches far north under normal physics');
 q.key('keyup','KeyE');
 assert.ok(groups[2].some(v=>!v.trainingGuard),'far patrol responds only once the squad gets close');
 assert.equal(q.inspect().duelCountdown,0);
 Object.assign(p,{x:460,y:-3920,vx:0,vy:0});q.step();
 const {camera}=q.inspect();
 assert.equal(camera.y,-4080,'camera shows extra northern arena');
 const boxX=(p.x-camera.x)/camera.w*480,boxY=(p.y-70-camera.y)/camera.h*720;
 q.canvasPointer('pointerdown',boxX,boxY);
 assert.ok(Math.abs(p.aim+Math.PI/2)<1e-6,'mouse aims correctly at negative world Y');
 assert.ok(q.inspect().shots.at(-1)?.y<0,'fires a real projectile in the north extension');
 Object.assign(p,{x:460,y:-4300,vx:0,vy:0});q.step();
 assert.equal(p.y,arena.top+p.r,'extended north wall has working collision');
 const official=launch().q.inspect();
 assert.equal(official.arena.top,-388);assert.equal(official.vanduls.length,0);assert.equal(official.duelCountdown,3);
 for(const mode of ['duel','ace','practice'])assert.equal(launch({mode}).q.inspect().arena.top,12);
});
test('enemy lasers physically hit the exposed lead and wingman, then re-acquire a visible player',()=>{
 const {q}=launch({mode:'wingman-test',sprite:true});
 const {p,testLead,wingman,cones}=q.inspect(),v=stageEnemy(q,20);
 const art=q.sprites.find(s=>s.src==='./vandul-ship.webp');
 Object.assign(art,{complete:true,naturalWidth:272,naturalHeight:272});
 testLead.fireWait=wingman.fireWait=1e4;
 const put=(body,x,y)=>Object.assign(body,{x,y,vx:0,vy:0});
 const block={x:480,y:909,r:29,vx:0,vy:0,spin:0,angle:0,wallFx:0,hitGlow:0,invMass:1};
 cones.push(block);
 const step=()=>{put(p,480,1020);put(v,480,795);put(testLead,420,875);put(wingman,628,914);q.step();};
 const untilStep=(f,max=90)=>{for(let i=0;i<max&&!f();i++)step();assert.ok(f(),'combat condition reached');};
 v.nextLaser=0;
 q.step();q.spriteFrames.length=0;step();
 assert.equal(v.attackTarget,testLead);assert.equal(v.seesTarget,true);assert.equal(v.seesPlayer,false);
 assert.equal(v.playerContact,null);
 assert.ok(!q.spriteFrames.some(f=>f.asset===art),'enemy sight of ally does not leak live enemy art to player');
 assert.doesNotMatch(q.el['vandul-duel-readout'].textContent,/Laser spread|VANDUL 20/);
 untilStep(()=>testLead.hp<20);
 assert.equal(p.hp,20);assert.equal(wingman.hp,20);
 testLead.hp=0;const prior=v.laserIndex;
 step();
 assert.equal(v.attackTarget,wingman);assert.ok(v.nextLaser-q.inspect().duelClock>=.25,'changes target with a fresh windup');
 assert.equal(v.laserIndex,prior);
 untilStep(()=>wingman.hp<20);
 assert.equal(p.hp,20);
 wingman.hp=0;cones.splice(0);step();
 assert.equal(v.attackTarget,p);assert.equal(v.seesPlayer,true);
 untilStep(()=>p.hp<20);
});

test('Vandul keeps its viable target through small distance changes, but drops a blocked ally in official sorties',()=>{
 const {q}=launch(),v=stageEnemy(q,20),{p,wingman,cones}=q.inspect();
 wingman.fireWait=1e4;
 const put=(body,x,y)=>Object.assign(body,{x,y,vx:0,vy:0});
 const position=(x=405,y=915)=>{put(p,560,938);put(v,480,780);put(wingman,x,y);};
 position();q.step(2);assert.equal(v.attackTarget,wingman);
 position(390,938);q.step();assert.equal(v.attackTarget,wingman,'minor changes do not flip the visible lock');
 position();
 cones.push({x:441,y:848,r:24,vx:0,vy:0,angle:0,spin:0,wallFx:0,hitGlow:0,invMass:1});
 const before=v.laserIndex;v.nextLaser=0;q.step();
 assert.equal(v.attackTarget,p);assert.equal(v.laserIndex,before);
 assert.ok(v.nextLaser-q.inspect().duelClock>=.25);
});

function clearFormationTest(q){
 q.cover(false);q.step();
 const s=q.inspect();s.cones.splice(0);s.vanduls.splice(0);
 return s;
}
test('test slot gently catches drift, holds while aiming and firing, and cannot ratchet the lead north',()=>{
 const {q}=launch({mode:'wingman-test',layout:{player:'trail',wingman:'line-abreast'}});
 const {p,testLead,wingman,testLeadGuide,launch:apron}=clearFormationTest(q);
 const home=[testLeadGuide.x,testLeadGuide.y];
 Object.assign(p,{x:p.x+85,y:p.y+70,vx:65,vy:44,he3:0});
 const first=[p.x,p.y];q.step();
 assert.ok(Math.hypot(p.x-first[0],p.y-first[1])<1.5,'assist never snaps to tile');
 assert.ok(p.he3<.024&&p.he3>0,'correction uses the normal generator/engine power path');
 q.pointer('pointerdown',3,'aim-pad',419,360);
 q.step(158);
 assert.ok(Math.abs(p.x-testLead.x)<14&&Math.abs(p.y-testLead.y-76)<16,'drift is corrected to assigned trail tile: '+[p.x-testLead.x,p.y-testLead.y]);
 assert.ok(Math.cos(p.aim)>.99,'assist does not aim');
 q.click('fire-button');assert.equal(q.inspect().practiceShots,1);
 q.pointer('pointerup',3,'aim-pad');
 assert.equal(q.inspect().wingmanOrder,'formation');
 q.step(980);
 assert.deepEqual([testLeadGuide.x,testLeadGuide.y],home,'pilot assist has not advanced the guide');
 assert.ok([p,testLead,wingman].every(a=>a.y>apron.y-270&&a.y<apron.y+145),'no feedback loop drags squad north');
 assert.ok(Math.hypot(p.x-testLead.x,p.y-testLead.y-76)<28);
});
test('touch THR requires a continuous deliberate hold, then Loose persists until a gentle Formation rejoin',()=>{
 const {q}=launch({mode:'wingman-test'});
 const {p,testLead,testLeadGuide}=clearFormationTest(q);
 const pad=q.el['main-thruster'];
 const thrust=(type,id)=>q.pointer(type,id,'move-pad',80,460,{target:pad});
 // Two short presses across the same RAF boundary must not accumulate.
 thrust('pointerdown',16);q.step(8);thrust('pointerup',16);
 thrust('pointerdown',18);q.step(8);
 assert.equal(q.inspect().wingmanOrder,'formation');
 q.step(4);assert.equal(q.inspect().wingmanOrder,'loose');
 assert.equal(q.el['wingman-loose'].getAttribute('aria-pressed'),'true');
 q.click('wingman-formation');assert.equal(q.inspect().wingmanOrder,'formation');
 q.step(15);assert.equal(q.inspect().wingmanOrder,'formation','click during one hold does not thrash back to Loose');
 thrust('pointerup',18);
 q.key('keydown','KeyE');q.step(11);assert.equal(q.inspect().wingmanOrder,'formation');
 q.step();assert.equal(q.inspect().wingmanOrder,'loose');q.key('keyup','KeyE');
 const manualGuide=testLeadGuide.y;
 q.step(45);assert.equal(q.inspect().wingmanOrder,'loose');
 assert.equal(testLeadGuide.y,manualGuide,'still in manual Loose mode after release');
 q.click('wingman-formation');
 assert.equal(q.inspect().wingmanOrder,'formation');
 assert.ok(Math.abs(testLeadGuide.y-(p.y-36))<.01,'explicit rejoin anchors to the pilot’s new location');
 const at=p.y;q.step();assert.ok(Math.abs(p.y-at)<p.speed*.016+1e-5,'rejoin cannot teleport');
 q.step(120);
 assert.ok(Math.hypot(p.x-testLead.x+54,p.y-testLead.y-54)<22,'real flight steers gently to the saved slot');
});

test('cover can pause slot correction without damage; disabled lead returns the pilot to manual flight',()=>{
 const {q}=launch({mode:'wingman-test',layout:{player:'trail',wingman:'line-abreast'}});
 const {p,cones,testLead,wingman}=clearFormationTest(q);
 Object.assign(testLead,{x:480,y:882,vx:0,vy:0});
 Object.assign(p,{x:480,y:1065,vx:0,vy:0});
 cones.push({x:480,y:1013,r:27,vx:0,vy:0,angle:0,spin:0,wallFx:0,hitGlow:0,invMass:1});
 q.step(25);
 assert.ok(p.y>1046&&p.hp===20,'formation stops for a physical obstruction');
 cones.splice(0);q.step(100);
 assert.ok(p.y<987,'returns to the slot after the obstruction clears');
 testLead.hp=0;
 Object.assign(p,{x:520,y:900,vx:60,vy:32,mainMomentum:false});
 q.step(4);
 const fade=Math.exp(-p.brakeDamping*.064);
 assert.ok(Math.abs(p.vx-60*fade)<1e-6&&Math.abs(p.vy-32*fade)<1e-6,'no assist without a live lead');
 assert.equal(q.el['wingman-commands'].hidden,false,'surviving wing remains controllable');
 q.step(100);
 assert.ok(Math.hypot(wingman.x-p.x-70,wingman.y-p.y)<30,'surviving wing can fall back to player formation');
 const official=launch().q,other=clearFormationTest(official);
 official.key('keydown','KeyE');official.step(20);official.key('keyup','KeyE');
 assert.equal(official.inspect().wingmanOrder,'formation','automatic boost override never applies to official Wingman');
 assert.equal(other.testLead,null);
});

test('an idle Training formation settles instead of orbiting, preserving distinct saved side or trail slots',()=>{
 function position(a){return [a.x,a.y];}
 for(const [layout,playerSlot,allySlot] of [
  [{player:'side-left',wingman:'line-abreast'},[-70,0],[70,0]],
  [{player:'trail',wingman:'front-left'},[0,76],[-54,-54]]
 ]){
  const {q}=launch({mode:'wingman-test',layout});
  const {p,testLead,wingman,testLeadGuide}=clearFormationTest(q),ships=[p,testLead,wingman];
  const startY=testLead.y;
  q.step(170);
  assert.ok(testLead.y<startY-96,'lead makes the initial move to its guide station');
  closeOffset([p.x-testLead.x,p.y-testLead.y],playerSlot,9);
  closeOffset([wingman.x-testLead.x,wingman.y-testLead.y],allySlot,9);
  const held=ships.map(position),guide=position(testLeadGuide);
  for(let i=0;i<10;i++){
   q.step(80);
   for(const [j,a] of ships.entries()){
    closeOffset(position(a),held[j],6);
    assert.ok(Math.hypot(a.vx,a.vy)<4,'quiet formation has naturally settled');
   }
  }
  assert.deepEqual(position(testLeadGuide),guide);
  q.key('keydown','KeyW');q.step(155);q.key('keyup','KeyW');
  assert.equal(q.inspect().wingmanOrder,'formation','manual trim does not activate Loose');
  assert.ok(testLeadGuide.y<guide[1]-300,'intentional travel advances formation guide');
  q.step(85);
  assert.ok(ships.every((a,i)=>a.y<held[i][1]-260),'all three ships travel with the manual advance');
 }
});
test('a fixed obstruction yields one safe held lead bypass, then it returns to the stable station',()=>{
 const {q}=launch({mode:'wingman-test',layout:{player:'trail',wingman:'side-left'}});
 const {p,cones,testLead,wingman,testLeadGuide}=clearFormationTest(q);
 const station={x:testLeadGuide.x,y:testLeadGuide.y-106};
 const obstacle={...station,r:34,vx:0,vy:0,angle:0,spin:0,wallFx:0,hitGlow:0,invMass:1};
 cones.push(obstacle);
 q.step(340);
 assert.ok(testLead.formationBypass,'blocked station chose an alternate');
 const side=[...testLead.formationBypass],positions=[p,testLead,wingman].map(a=>[a.x,a.y]);
 assert.ok(Math.hypot(testLead.x-obstacle.x,testLead.y-obstacle.y)>testLead.r+obstacle.r);
 q.step(480);
 assert.deepEqual([...testLead.formationBypass],side,'does not orbit around a persistently blocked station');
 assert.ok([p,testLead,wingman].every((a,i)=>Math.hypot(a.x-positions[i][0],a.y-positions[i][1])<12));
 cones.splice(0);q.step(175);
 assert.equal(testLead.formationBypass,null);
 assert.ok(Math.hypot(testLead.x-station.x,testLead.y-station.y)<4);
 assert.ok(Math.hypot(testLead.vx,testLead.vy)<4);
});
