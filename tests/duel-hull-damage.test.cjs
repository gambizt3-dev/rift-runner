'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {setup}=require('./ballistic.test.cjs');
const hullKey='rift-runner.hull-owned.v1',shipKey='rift-runner.ship-build.v1',generationKey='rift-runner.character-generation.v1';
const hull=(condition,rest={})=>JSON.stringify({version:1,hull:'rift-fighter',condition,...rest});
const fit=JSON.stringify({version:1,hull:'rift-fighter',engine:'stock-thruster',core:'weifer-he3-core',battery:'kestrel-h20-reserve-cell',primary:'blaster',secondary:null,shield:'aegis-s3'});
const parts=Object.values(JSON.parse(fit)).filter(id=>typeof id==='string'&&id!=='rift-fighter');
const wallet={getBuildState:()=>({origin:'new',owned:parts,balance:35,kills:0}),owns:id=>parts.includes(id),ownsAegis:()=>true};
const save=()=>new Map([[hullKey,hull('repaired')],[shipKey,fit]]);
const make=(store,opts={})=>setup({sharedStorage:store,buildUI:true,pilotCredits:wallet,wallNow:()=>100000,fieldSeed:137,reducedMotion:true,...opts});
function parkForHit(q){
 q.step();q.target(true);
 const {p,cones,asteroids,sceneryDebris,vandul}=q.inspect();
 for(const fields of [cones,asteroids,sceneryDebris])fields.splice(0);
 Object.assign(p,{x:430,y:910,vx:0,vy:0});
 Object.assign(vandul,{x:430,y:750,vx:0,vy:0,nextDriveBy:999,nextLaser:999});
}
function launch(store,duel=true,opts={}){
 const q=make(store,opts);
 if(q.inspect().state==='menu')q.choose(duel?'start':'practice');assert.equal(q.inspect().state,'play');
 parkForHit(q);return q;
}
function laser(q,damage,kind='energy'){
 const {p,vandul,vandulLasers}=q.inspect();
 p.vx=p.vy=0;
 vandulLasers.push({x:p.x-32,y:p.y,vx:6400,vy:0,a:0,kind,life:1,damage,owner:vandul});
 q.step();
}
function wall(q){
 const {p,arena}=q.inspect();
 Object.assign(p,{x:arena.right-p.r-.1,y:900,vx:240,vy:0,impactCooldown:0});
 q.step();
}
function hangar(store,opts={}){
 const q=make(store,{address:{search:'?hangar=carrier',replace(){}},...opts});
 assert.equal(q.el.hangar.open,true);
 return q;
}
test('duel saves real laser damage per hit, survives reload, and repairs over four minutes without refitting',()=>{
 let now=100000;const store=save(),q=launch(store);
 laser(q,2);
 assert.equal(q.inspect().p.hp,18);assert.equal(q.inspect().state,'play','damage does not end a live battle');
 assert.equal(store.get(hullKey),hull('repaired',{hullHp:18,maxHullHp:20}));
 laser(q,2);
 assert.equal(store.get(hullKey),hull('repaired',{hullHp:16,maxHullHp:20}),'later damage by same flight lowers the saved HP');
 assert.equal(q.inspect().p.hp,16);assert.equal(store.get(shipKey),fit);
 // New document before pagehide: successful writes do not depend on teardown.
 const reload=make(store,{address:{search:'?launch=vandul',replace(){}}});
 assert.equal(reload.inspect().state,'play');assert.equal(reload.inspect().p.hp,16);assert.equal(reload.el.hangar.open,false);
 q.reset();assert.equal(q.inspect().state,'play');assert.equal(q.inspect().p.hp,16);
 const h=hangar(store,{wallNow:()=>now});
 assert.match(h.el['fit-build-status'].textContent,/Battle damage · 16 \/ 20 hull HP/);
 assert.equal(h.el['hangar-damaged-bay'].hidden,false);
 assert.equal(h.el['hangar-player-loadout'].hidden,false);
 assert.equal(h.el['fit-repair-direct'].hidden,false);
 h.click('fit-repair-direct');
 assert.equal(store.get(hullKey),hull('repairing',{readyAt:340000,durationMs:240000,hullHp:16,maxHullHp:20}));
 assert.equal(h.el['hangar-player-loadout'].hidden,true);
 now+=239999;
 const early=make(store,{wallNow:()=>now,address:{search:'?launch=vandul',replace(){}}});
 assert.equal(early.inspect().state,'menu');assert.match(early.el['fit-build-status'].textContent,/0:01 remaining/);
 now++;
 h.step();assert.equal(h.el['fit-build-status'].textContent,'Flight ready.');
 assert.equal(store.get(hullKey),hull('repaired',{repairedAt:340000}));
 assert.equal(store.get(shipKey),fit);
 const repaired=make(store,{wallNow:()=>now,address:{search:'?launch=vandul',replace(){}}});
 assert.equal(repaired.inspect().state,'play');assert.equal(repaired.inspect().p.hp,20);
});
test('shield absorption does not damage hull; fractional spill and lethal hits do',()=>{
 const store=save(),q=launch(store);
 q.key('keydown','KeyQ');
 laser(q,2);
 assert.equal(q.inspect().p.hp,20);assert.equal(store.get(hullKey),hull('repaired'));
 laser(q,3,'ballistic');
 assert.equal(q.inspect().p.hp,18.5);assert.equal(store.get(hullKey),hull('repaired',{hullHp:18.5,maxHullHp:20}));
 laser(q,25);
 assert.equal(q.inspect().state,'disabled');assert.equal(store.get(hullKey),hull('damaged',{hullHp:0,maxHullHp:20}));
 assert.match(q.el.overlay.innerHTML,/Repair your fighter in the Carrier Hangar before launching again/);
 assert.doesNotMatch(q.el.overlay.innerHTML,/Reset field/);
 q.reset();assert.equal(q.inspect().state,'menu');assert.equal(JSON.parse(store.get(hullKey)).hullHp,0);
 const next=make(store,{address:{search:'?launch=vandul',replace(){}}});
 assert.equal(next.inspect().state,'menu');assert.equal(next.el.hangar.open,true);
 assert.equal(next.el['hangar-damaged-bay'].hidden,false);
 assert.equal(next.el['fit-repair-hull'].hidden,false);
 next.click('fit-repair-hull');assert.equal(JSON.parse(store.get(hullKey)).hullHp,0);
 assert.equal(JSON.parse(store.get(hullKey)).durationMs,240000);
});
test('a wall crash persists in a Vandul battle, but Practice never persists wall or projectile damage',()=>{
 const store=save(),battle=launch(store);
 wall(battle);
 const hp=battle.inspect().p.hp;
 assert.ok(hp<20);assert.equal(store.get(hullKey),hull('repaired',{hullHp:hp,maxHullHp:20}));
 const trainingSave=save(),practice=launch(trainingSave,false);
 wall(practice);assert.ok(practice.inspect().p.hp<20);
 laser(practice,2);
 assert.equal(trainingSave.get(hullKey),hull('repaired'));
 practice.reset();assert.equal(practice.inspect().state,'play');assert.equal(practice.inspect().p.hp,20);
});
test('another tab’s hull and completed repair supersede an older running duel',()=>{
 let now=100000;const store=save(),a=launch(store),b=launch(store);
 laser(a,2);const damaged=store.get(hullKey);
 laser(b,4);assert.equal(b.inspect().p.hp,16);assert.equal(store.get(hullKey),damaged,'does not adopt a newer damage record from another duel');
 const h=hangar(store,{wallNow:()=>now});
 h.click('fit-repair-direct');const repairing=store.get(hullKey);
 laser(a,3);laser(b,3);assert.equal(store.get(hullKey),repairing);
 now+=240000;h.step();
 const repaired=hull('repaired',{repairedAt:340000});assert.equal(store.get(hullKey),repaired);
 laser(a,3);laser(b,3);a.pageHide();b.pageHide();
 assert.equal(store.get(hullKey),repaired,'a repaired revision is never mistaken for the pre-battle certificate');
});
test('old duel never writes damage into a replacement or freshly reset pilot',()=>{
 const store=save(),q=launch(store);
 store.set(generationKey,'new-generation');store.delete(hullKey);store.delete(shipKey);
 laser(q,3);assert.equal(q.inspect().p.hp,17);assert.equal(store.has(hullKey),false);
 store.set(shipKey,fit);store.set(hullKey,hull('repaired')); // exact same certificate, different generation
 laser(q,3);q.pageHide();assert.equal(store.get(hullKey),hull('repaired'));
});
test('victory and return to Carrier preserve damage while leaving the mission reward alone',()=>{
 const store=save(),visits=[];let victoryCount=0;
 const q=launch(store,true,{address:{search:'',replace:where=>visits.push(where)},pilotCredits:{
  ...wallet,awardVictory(){victoryCount++;return {saved:true,amount:20,balance:55};}
 }});
 laser(q,2);const saved=store.get(hullKey);
 q.armFinalForTest();
 const {p,vandul}=q.inspect();
 Object.assign(p,{x:430,y:910,vx:0,vy:0,aim:-Math.PI/2});
 Object.assign(vandul,{x:430,y:855,vx:0,vy:0,hp:3,nextDriveBy:999,nextLaser:999});
 q.click('fire-button');
 for(let i=0;i<20&&q.inspect().state==='play';i++)q.step();
 assert.equal(q.inspect().state,'depart');
 assert.equal(victoryCount,1);assert.match(q.el.overlay.innerHTML,/\+20 credits/);
 q.step(90);assert.equal(q.inspect().state,'complete');assert.deepEqual(visits,['./carrier.html']);
 assert.equal(store.get(hullKey),saved);assert.equal(store.get(shipKey),fit);
});
test('a failed zero-hull save blocks same-tab reset and navigation until the original damage is saved',()=>{
 const store=save(),write=store.set.bind(store);let denied=false;
 store.set=(key,value)=>{if(key===hullKey&&denied)throw Error('simulated storage write failure');return write(key,value);};
 const visits=[],q=launch(store,true,{address:{search:'?launch=vandul',replace:url=>visits.push(url)}});
 denied=true;
 laser(q,25);assert.equal(q.inspect().p.hp,0);assert.equal(q.inspect().state,'disabled');
 assert.match(q.el.overlay.innerHTML,/Could not save battle damage/);
 q.reset();q.click('return-main-menu');
 assert.equal(q.inspect().state,'disabled');assert.deepEqual(visits,[]);
 denied=false;q.click('return-main-menu');
 assert.equal(q.inspect().state,'menu');assert.deepEqual(visits,['./carrier.html']);
 assert.equal(store.get(hullKey),hull('damaged',{hullHp:0,maxHullHp:20}));
});
test('Practice starts at full simulated health without clearing prior live damage; recurring repair remains available',()=>{
 const store=save();
 store.set(hullKey,hull('repaired',{repairedAt:50000}));
 const first=launch(store);
 laser(first,2);
 const saved=store.get(hullKey);
 const practice=launch(store,false);
 assert.equal(practice.inspect().p.hp,20);
 wall(practice);
 assert.equal(store.get(hullKey),saved);
 const h=hangar(store);
 assert.equal(h.el['fit-repair-direct'].hidden,false);
 h.click('fit-repair-direct');
 assert.deepEqual(JSON.parse(store.get(hullKey)),{version:1,hull:'rift-fighter',condition:'repairing',readyAt:340000,durationMs:240000,hullHp:18,maxHullHp:20});
});
test('malformed combat-health fields never grant launch or a replacement claim',()=>{
 for(const damage of [{hullHp:0,maxHullHp:20},{hullHp:-1,maxHullHp:20},{hullHp:12},{maxHullHp:20}]){
  const store=save(),bad=hull('repaired',damage);store.set(hullKey,bad);
  const q=make(store,{address:{search:'?launch=vandul',replace(){}}});
  assert.equal(q.inspect().state,'menu');assert.equal(q.el.hangar.open,true);
  assert.match(q.el['fit-build-status'].textContent,/Ship ownership unavailable/);
  q.click('fit-claim-hull');assert.equal(store.get(hullKey),bad);
 }
});
