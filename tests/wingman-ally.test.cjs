'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {setup,tick}=require('./ballistic.test.cjs');

const logKey='rift-runner.mission-log.v1',generationKey='rift-runner.character-generation.v1';
const fit={engine:'stock-thruster',core:'weifer-he3-core',battery:'kestrel-h20-reserve-cell',primary:'ballistic'};
function launch({mode='wingman',record=true,replay=false,reducedMotion=true,formation,formationGeneration='pilot',allyPaint}={}){
 const log={version:1,generation:'pilot',completedAt:2,
  wingman:record?{acceptedAt:3,...(replay?{victoryAt:4,lodgedAt:5}:{})}:undefined,
  ace:{acceptedAt:6}};
 const bag=new Map([[logKey,JSON.stringify(log)],[generationKey,'pilot'],
  ['rift-runner.hull-owned.v1',JSON.stringify({version:1,hull:'rift-fighter',condition:'repaired'})],
  ['rift-runner.ship-build.v1',JSON.stringify({version:1,hull:'rift-fighter',...fit})]]);
 if(formation!==undefined)bag.set('rift-runner.squadron-formation.v1',JSON.stringify({version:1,generation:formationGeneration,formation}));
 let personalKills=0,rewards=0;
 const search=mode==='practice'?'?launch=practice':mode==='duel'?'?launch=vandul':'?launch=vandul&mission='+mode;
 const q=setup({buildUI:true,loadPilotMissions:true,sharedStorage:bag,reducedMotion,allyPaint,fieldSeed:777,
  address:{search,replace(){}},pilotCredits:{getBuildState:()=>({origin:'new',owned:Object.values(fit),kills:10}),
   owns:id=>Object.values(fit).includes(id),recordEnemyKill(){personalKills++;return {saved:true,amount:2.5};},
   awardVictory(){rewards++;return {saved:true,amount:20};}}});
 return {q,bag,personalKills:()=>personalKills,rewards:()=>rewards};
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
