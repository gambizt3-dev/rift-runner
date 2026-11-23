'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {setup}=require('./ballistic.test.cjs');

const hullKey='rift-runner.hull-owned.v1',missionKey='rift-runner.mission-log.v1';
const modules={engine:'test-thruster',core:'weifer-he3-core',battery:'kestrel-h20-reserve-cell',primary:'ballistic',secondary:'blaster'};
const routes={Practice:'?launch=practice',Vandul:'?launch=vandul',Training:'?launch=wingman-test',
 Wingman:'?launch=vandul&mission=wingman',Ace:'?launch=vandul&mission=ace'};
function launch(route,{build=modules,record=true,storedHp=20}={}){
 const owned=Object.values(modules);
 const log={version:1,generation:'parity',completedAt:2,acceptedAt:3,
  wingman:{acceptedAt:4},ace:{acceptedAt:5}};
 const bag=new Map([
  ['rift-runner.character-generation.v1','parity'],
  ['rift-runner.ship-build.v1',JSON.stringify({version:1,hull:'rift-fighter',...build})],
  [hullKey,JSON.stringify({version:1,hull:'rift-fighter',condition:'repaired',...(storedHp<20?{hullHp:storedHp,maxHullHp:20}:{})})]
 ]);
 if(record)bag.set(missionKey,JSON.stringify(log));
 const q=setup({buildUI:true,loadPilotMissions:true,sharedStorage:bag,reducedMotion:true,legacyArenaHangar:false,fieldSeed:836,
  address:{search:route,replace(){}},pilotCredits:{getBuildState:()=>({origin:'new',owned,kills:25}),owns:id=>owned.includes(id)}});
 return {q,bag};
}
const aim=(q,who)=>{q.key('keydown',who);q.step();q.key('keyup',who);};
function commonTimeline(q){
 const {p,cones,asteroids,sceneryDebris}=q.inspect();
 // Set the same clear test lane on real launch. Route-specific starting formations
 // and layouts intentionally differ; no enemy is admitted during this comparison.
 cones.splice(0);asteroids.splice(0);sceneryDebris.splice(0);
 Object.assign(p,{x:480,y:820,vx:0,vy:0});
 const fit=[p.weight,p.speed,p.acceleration,p.brakeDamping,p.recoilFactor,p.hp];
 const trace=[];
 const record=()=>trace.push([p.x,p.y,p.vx,p.vy,p.aim]);
 aim(q,'ArrowRight');q.key('keydown','KeyD');q.step(20);q.key('keyup','KeyD');record();
 q.pointer('pointerdown',16,'move-pad',80,500,{target:q.moveButtons.s});
 q.pointer('pointerup',16,'move-pad',80,500,{target:q.moveButtons.s});
 q.step(3);record();
 assert.ok(p.vx>.9*fit[1]&&p.vy>0,'side correction leaves forward inertia while adding sideways speed');
 aim(q,'ArrowLeft');q.step();record();
 assert.ok(p.vx>0&&p.vy>0&&Math.cos(p.aim)<-.999,'the nose turns while the flight vector still coasts');
 const weapon=[];
 function shoot(damage,name){
  q.click('fire-button');
  const b=q.inspect().shots.filter(shot=>!shot.ally).at(-1);
  assert.equal(b.weapon,name);assert.equal(b.damage,damage);
  weapon.push([b.weapon,b.damage,b.vx,b.vy,p.vx,p.vy,q.inspect().practiceShots]);
 }
 shoot(5,'ballistic');q.change('blaster');shoot(3,'blaster');
 const center=q.el['main-thruster'];
 q.pointer('pointerdown',16,'move-pad',80,460,{target:center});
 q.step(2);record();
 assert.equal(p.mainMomentum,true,'actual central thruster uses the same shared flight physics');
 q.pointer('pointerup',16,'move-pad',80,460,{target:center});
 q.step(3);record();
 return {fit,trace,weapon};
}
test('every real Carrier launch uses one equipped ship, thrust/drift, damage and recoil simulation',()=>{
 const all=Object.entries(routes).map(([name,url])=>{
  const {q}=launch(url),game=q.inspect();
  assert.equal(game.state,'play',name);assert.equal(q.graphs.length,0,'cross-page launch never unlocks audio');
  assert.equal(game.duelCountdown,['Practice','Training'].includes(name)?0:3,name);
  assert.equal(game.fighterLoadout.engine,'test-thruster');assert.equal(game.fighterFit.primary,'ballistic');
  assert.equal(game.fighterFit.secondary,'blaster');assert.equal(game.fighterLoadout.battery,'kestrel-h20-reserve-cell');
  const stats=commonTimeline(q);
  assert.deepEqual(stats.fit.slice(0,2),[100,111*(106/100)**.95]);
  return [name,stats];
 });
 for(const [name,actual] of all.slice(1))assert.deepEqual(actual,all[0][1],name);
});

test('fit gates every launch, while an unaccepted qualification stays on the menu',()=>{
 for(const url of Object.values(routes)){
  const {q}=launch(url,{build:{...modules,battery:null}});
  assert.equal(q.inspect().state,'menu',url);assert.equal(q.el.hangar.open,true,url);
 }
 const {q}=launch(routes.Wingman,{record:false});
 assert.equal(q.inspect().state,'menu');assert.equal(q.el.hangar.open,false);
 assert.match(q.el['menu-build-status'].textContent,/Accept this qualification/);
});

test('same hull crash damage, different intentional save and repair policies',()=>{
 for(const [name,url] of Object.entries(routes)){
  const {q,bag}=launch(url,{storedHp:17}),{p,arena}=q.inspect();
  const battle=name!=='Practice'&&name!=='Training';
  const safe=bag.get(hullKey);
  assert.equal(p.hp,battle?17:20,name);
  const hit=()=>{
   Object.assign(p,{x:arena.right-p.r-1,y:800,vx:250,vy:0,impactCooldown:0});q.step(2);
  };
  const initial=p.hp;hit();
  assert.equal(initial-p.hp,6,name);
  if(battle)assert.equal(JSON.parse(bag.get(hullKey)).hullHp,p.hp,name);
  else assert.equal(bag.get(hullKey),safe,name);
  p.hp=1;hit();
  assert.equal(p.hp,0,name);assert.equal(q.inspect().state,'disabled',name);
  if(name==='Practice')assert.equal(bag.get(hullKey),safe);
  else assert.equal(JSON.parse(bag.get(hullKey)).condition,'damaged',name);
 }
});
