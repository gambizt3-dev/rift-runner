'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {setup,tick}=require('./ballistic.test.cjs');

const logKey='rift-runner.mission-log.v1',generationKey='rift-runner.character-generation.v1';
const fit={engine:'stock-thruster',core:'weifer-he3-core',battery:'kestrel-h20-reserve-cell',primary:'ballistic'};
function launch({mode='wingman',record=true,replay=false,reducedMotion=true,formation,formationGeneration='pilot',allyPaint,ready=true,hullHp,layout,layoutGeneration='pilot',resumeBag}={}){
 const log={version:1,generation:'pilot',completedAt:2,
  wingman:record?{acceptedAt:3,...(replay?{victoryAt:4,lodgedAt:5}:{})}:undefined,
  ace:{acceptedAt:6}};
 const bag=resumeBag??new Map([[logKey,JSON.stringify(log)],[generationKey,'pilot'],
  ['rift-runner.hull-owned.v1',JSON.stringify({version:1,hull:'rift-fighter',condition:'repaired',...(hullHp===undefined?{}:{hullHp,maxHullHp:20})})],
  ['rift-runner.ship-build.v1',JSON.stringify({version:1,hull:'rift-fighter',...fit,...(ready?{}:{battery:null})})]]);
 if(formation!==undefined)bag.set('rift-runner.squadron-formation.v1',JSON.stringify({version:1,generation:formationGeneration,formation}));
 if(layout)bag.set('rift-runner.squadron-test-layout.v1',JSON.stringify({version:1,generation:layoutGeneration,layout}));
 let personalKills=0,rewards=0;const visits=[];
 const search=mode==='practice'?'?launch=practice':mode==='duel'?'?launch=vandul':mode==='wingman-test'?'?launch=wingman-test':'?launch=vandul&mission='+mode;
 const q=setup({buildUI:true,loadPilotMissions:true,sharedStorage:bag,reducedMotion,allyPaint,fieldSeed:777,
  address:{search,replace(url){visits.push(url);}},pilotCredits:{getBuildState:()=>({origin:'new',owned:Object.values(fit),kills:10}),
   owns:id=>Object.values(fit).includes(id),recordEnemyKill(){personalKills++;return {saved:true,amount:2.5};},
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
 assert.match(q.el['vandul-duel-readout'].textContent,/Ally 12\/12 HP · Ally kills 0/);
 assert.equal(q.inspect().shots.length,0);
 q.step(48);const y=q.inspect().p.y;
 q.hide(true);q.step(200);
 assert.equal(q.inspect().p.y,y);assert.equal(q.inspect().shots.length,0);
 q.hide(false);q.open('resume');
 assert.equal(until(q,()=>q.inspect().state==='play',270),true);
 assert.match(q.el['vandul-duel-readout'].textContent,/Ally 12\/12 HP/);
 q.reset();assert.match(q.el['vandul-duel-readout'].textContent,/Ally 12\/12 HP · Ally kills 0/);
 const replay=launch({replay:true}).q;assert.match(replay.el['vandul-duel-readout'].textContent,/Ally 12\/12 HP/);
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
 assert.equal(shot.damage,2);
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
 for(let i=0;i<6;i++)q.inspect().vandulLasers.push({x,y,vx:0,vy:0,a:0,life:1,damage:2,owner:target});
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
 assert.equal(q.inspect().duelCountdown,3);
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
test('Wingman Test final player kill advances its own wave and returns, never writing a receipt or credits',()=>{
 const {q,bag,visits,personalKills,rewards}=launch({mode:'wingman-test'});
 const original=JSON.stringify([...bag]),target=stageEnemy(q,5);
 q.armFinalForTest();
 const {p}=q.inspect();Object.assign(target,{x:p.x,y:p.y-75});
 Object.assign(p,{aim:-Math.PI/2,vx:0,vy:0});
 q.click('fire-button');assert.equal(until(q,()=>target.hp===0),true);
 assert.equal(q.inspect().duelKills,10);
 assert.equal(q.inspect().duelResult,'victory');
 assert.equal(q.el['wingman-commands'].hidden,true);
 assert.match(q.el.overlay.innerHTML,/Wingman Test Complete.*No career progress was saved/);
 assert.doesNotMatch(q.el.overlay.innerHTML,/credits|Report to the Captain/);
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
 for(const label of ['AI LEAD','ALLY'])assert.ok(lastShip(initial,label).y-12>arena.bottom);
});
test('in Formation the second AI follows an autonomous lead instead of the pilot, who keeps manual controls',()=>{
 const draws=[],{q}=launch({mode:'wingman-test',allyPaint:draws,layout:{player:'echelon-left',wingman:'line-abreast'}});
 q.cover(false);q.inspect().cones.splice(0);q.step();
 const start=lastShip(draws,'AI LEAD'),{p}=q.inspect(),initialP=[p.x,p.y];
 q.step(62);
 const lead=lastShip(draws,'AI LEAD'),wing=lastShip(draws,'ALLY');
 assert.ok(lead.y<start.y-58,'lead advances independently while player does nothing');
 closeOffset([p.x,p.y],initialP,.1);
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
 for(let i=0;i<6;i++)q.inspect().vandulLasers.push({x,y,vx:0,vy:0,a:0,life:1,damage:2,owner:target});
 q.step(2);
 assert.match(q.el['vandul-duel-readout'].textContent,/AI lead disabled · Ally 12\/12 HP/);
 assert.equal(q.el['wingman-commands'].hidden,false);
 assert.equal(q.inspect().state,'play');assert.equal(p.hp,20);
 q.click('wingman-loose');assert.equal(q.el['wingman-loose'].getAttribute('aria-pressed'),'true');
 assert.equal(JSON.stringify([...bag]),original);
 assert.equal(personalKills(),0);assert.equal(rewards(),0);
});
