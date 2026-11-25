'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {readFileSync}=require('node:fs'),path=require('node:path');
const {setup}=require('./ballistic.test.cjs');
const read=file=>readFileSync(path.join(__dirname,'../dist',file),'utf8');
const genKey='rift-runner.character-generation.v1',missionKey='rift-runner.mission-log.v1',buildKey='rift-runner.ship-build.v1',hullKey='rift-runner.hull-owned.v1';
const fit={engine:'stock-thruster',core:'weifer-he3-core',battery:'kestrel-h20-reserve-cell',primary:'blaster',secondary:null,shield:null};
const owned=Object.values(fit).filter(Boolean);
const generation='test-pilot',base={version:1,generation,completedAt:1};
const modes=['free-flight','capital-test','practice','solo-training','escort-drill','wingman-test'];
const accepted={acceptedAt:2},lodged={acceptedAt:2,victoryAt:3,lodgedAt:4},pending={acceptedAt:2,victoryAt:3};
function launch({route='?hangar=carrier',orderLog={intercept:accepted},leg='repaired',build=fit,rendezvous,fieldSeed=329,cinematic=false,animate=cinematic,beforeStorageRead,canvasBox,hulls=[],loadFighters=!!hulls.length,existingStorage,parkingSave,cloudHydrate,fleetApproach,galaxyWatch,crossBattle,wallNow,returnDockAudio,sessionData,hullBarPaint,resolutePaint,resoluteArtTrace,sprite,traceClashPaint,localResolute=false,multiplayer,host,homeVessel=route.includes('vessel=bifrost')?'bifrost':undefined}={}){
 const storage=existingStorage??new Map([[genKey,generation],[missionKey,JSON.stringify({...base,...orderLog})],
  [hullKey,JSON.stringify({version:1,hull:'rift-fighter',condition:leg})],[buildKey,JSON.stringify({version:1,hull:'rift-fighter',...build})]]);
 if(rendezvous)storage.set('rift-runner.wing-rendezvous.v1',JSON.stringify({version:1,generation,rooms:{aya:'common',ellis:'observation'},acceptedAt:8,completedAt:rendezvous==='done'?10:null,met:{aya:true,ellis:rendezvous==='done'}}));
 if(leg==='unclaimed'){storage.delete(hullKey);storage.delete(buildKey);}
 const visits=[],parkingWrites=[];
 const parkingAdapter=(remote,db)=>({...remote,
  hydrate:cloudHydrate?(id,options)=>cloudHydrate(id,options,db):remote.hydrate,
  async save(id,vessel,options){
   parkingWrites.push({id,vessel,options});
   if(parkingSave)return parkingSave(id,vessel,options,db);
   const key=remote.key(id),previous=JSON.parse(db.get(key)??'null');
   const parking={vessel,bay:4,revision:(previous?.revision??0)+1};
   db.set(key,JSON.stringify({version:1,hull:id,generation:db.get(genKey),...parking}));
   return {status:'ok',parking};
  }
 });
 const q=setup({cockpitUI:true,flightShell:true,sharedStorage:storage,loadPilotMissions:true,loadRendezvous:!!rendezvous,
  initialHe3:0,sprite,traceClashPaint,reducedMotion:!animate,fieldSeed,buildUI:true,beforeStorageRead,canvasBox,
  loadFighters,homeVessel,fleetApproach,galaxyWatch,crossBattle,wallNow,returnDockAudio,sessionData,hullBarPaint,resolutePaint,resoluteArtTrace,multiplayer,parkingAdapter,parkingCrypto:!!cloudHydrate,
  address:{search:route,origin:'https://rift.example',hostname:host??(localResolute?'localhost':'rift.example'),hash:localResolute?'#test-resolute-entry':'',replace(url){visits.push(url);},assign(url){visits.push(url);}},pilotCredits:{getBuildState:()=>({origin:'new',owned,kills:25}),owns:id=>owned.includes(id),ownsHull:id=>hulls.includes(id)}});
 const e=q.el,select=e['cockpit-order'],mission=e['cockpit-mission'];
 return {q,e,select,mission,visits,storage,parkingWrites,
  choose(id,kind=modes.includes(id)||id==='corsair-cross-tile'||id==='vandul'||id.startsWith('custom-')||id.startsWith('four-way-')?'mode':'mission'){
   q.click('cockpit-add-'+kind);const picker=kind==='mode'?select:mission;
   picker.value=id;picker.handlers.change();
  },
  board(wait=true){q.click('hangar-board');if(wait&&animate)q.advanceTimers(1440);},
  orderIds(){return mission.options?.map(o=>o.value);},
  modeIds(){return select.options?.map(o=>o.value);},
  plan(){return e['cockpit-plan-name'].textContent;}};
}
function reachDeparture(q){
 if(q.inspect().capitalShip?.phase==='docked')q.click('capital-dock-action');
 for(let n=0;n<180&&q.inspect().capitalShip?.phase==='launching';n++)q.step();
 const {capitalShip,p,arena}=q.inspect();
 assert.equal(capitalShip?.phase,'flight');
 Object.assign(p,{x:arena.right/2,y:arena.bottom-31,vx:0,vy:122,he3:20});
}
function flySouthAcrossDeparture(q){
 reachDeparture(q);q.key('keydown','KeyS');q.step(4);q.key('keyup','KeyS');
}
test('the hangar has a non-overlay Board fighter action and a compact cockpit containing orders and an explicit route to the launch deck',()=>{
 const html=read('index.html'),css=read('style.css');
 assert.match(html,/<\/figure>\s*<div class="hangar-bay-actions"[^>]*>[\s\S]*?id="hangar-board"[^>]*>Board fighter/);
 assert.match(html,/<section id="hangar-cockpit"[^>]*hidden>[\s\S]*?id="cockpit-order"[^>]*disabled[\s\S]*?id="cockpit-launch"[^>]*disabled>Go to launch deck[\s\S]*?id="cockpit-exit"[^>]*>Exit cockpit/);
 assert.match(html,/hangar-cockpit-pov-v2\.webp/);
 assert.match(css,/\.cockpit-scene\s*\{/);
 assert.doesNotMatch(html,/id="cockpit-(?:solo|wingman|escort)"/);
});
test('exact Bridge deep link opens the actual Personal Hangar, then preselects without boarding or launching',()=>{
 const {q,e,plan,visits,board,orderIds,modeIds}=launch({route:'?hangar=carrier&order=wingman',orderLog:{intercept:accepted,wingman:accepted},cinematic:true});
 assert.equal(q.inspect().state,'menu');
 assert.equal(e.hangar.open,true);assert.equal(e['hangar-cockpit'].hidden,true);assert.equal(e['hangar-board'].hidden,false);
 assert.equal(q.graphs.length,0);
 q.click('hangar-board',{isTrusted:false});assert.equal(e['hangar-cockpit'].hidden,true);
 board();
 assert.equal(q.inspect().state,'menu');assert.equal(e['hangar-cockpit'].hidden,false);
 assert.equal(q.focused,e['cockpit-title']);assert.equal(plan(),'Wingman Qualification');assert.deepEqual(orderIds(),['','intercept','wingman']);
 assert.deepEqual(modeIds(),['',...modes,'vandul']);
 assert.equal(e['player-hangar-view'].hidden,true);assert.equal(e['cockpit-launch'].disabled,false);
 q.click('cockpit-launch',{isTrusted:false});assert.equal(q.inspect().state,'menu');assert.equal(q.graphs.length,1,'Board may play the existing canopy sound');
 q.click('cockpit-launch');
 assert.equal(e.hangar.open,false);assert.equal(e['hangar-cockpit'].hidden,true);
 assert.equal(q.inspect().state,'play');assert.equal(q.inspect().flightMode.id,'carrier-departure');
 assert.equal(q.inspect().capitalShip.phase,'docked');assert.equal(q.inspect().wingman,null);
 q.step(180);assert.equal(q.inspect().capitalShip.phase,'docked','opening the deck never starts takeoff');
 q.click('capital-dock-action',{isTrusted:false});assert.equal(q.inspect().capitalShip.phase,'docked');
 flySouthAcrossDeparture(q);
 assert.equal(q.inspect().state,'play');assert.equal(q.inspect().flightMode.id,'wingman');
 assert.ok(q.inspect().wingman,'Wingman Qualification selects the existing allied mode');
 assert.equal(q.inspect().testLead,null);assert.equal(q.inspect().fighterLoadout.weapon,'blaster');
 assert.equal(q.graphs.length,1,'launch audio uses the explicit trusted gesture');
 assert.deepEqual(visits,[],'do not navigate to Carrier while closing the Hangar to launch');
 q.click('return-main-menu');assert.deepEqual(visits,['./carrier.html']);
});
test('only accepted or consistently repeatable orders appear; order ID chooses Wing or Solo automatically',()=>{
 const ready=launch({orderLog:{intercept:accepted,wingman:lodged,ace:pending,'flight-lead':accepted},rendezvous:'done'});
 ready.board();
 assert.deepEqual(ready.orderIds(),['','intercept','wingman','flight-lead','rendezvous']);
 assert.match(ready.mission.options[2].textContent,/Wingman Qualification.*Re-fly/);
 assert.equal(ready.plan(),'No sortie planned');
 assert.equal(ready.e['cockpit-launch'].disabled,false);
 ready.choose('rendezvous');assert.equal(ready.e['cockpit-launch'].disabled,false);
 assert.match(ready.e['cockpit-launch-status'].textContent,/training.*No career rewards/);
 ready.q.click('cockpit-launch');flySouthAcrossDeparture(ready.q);
 assert.equal(ready.q.inspect().flightMode.id,'wingman-test');
 assert.equal(ready.q.inspect().testLead.displayName,'Leena');
 assert.equal(ready.q.inspect().wingman.displayName,'Tomas');
 const solo=launch();solo.board();solo.choose('intercept');solo.q.click('cockpit-launch');flySouthAcrossDeparture(solo.q);
 assert.equal(solo.q.inspect().flightMode.id,'vandul');assert.equal(solo.q.inspect().wingman,null);
 const other=launch({orderLog:{ace:lodged}});other.board();other.choose('ace');other.q.click('cockpit-launch');flySouthAcrossDeparture(other.q);
 assert.equal(other.q.inspect().flightMode.id,'ace');assert.equal(other.q.inspect().wingman,null);
});
test('unfinished rendezvous, pending turn-ins and arbitrary route parameters do not unlock cockpit flights',()=>{
 const q=launch({route:'?hangar=carrier&order=rendezvous',orderLog:{intercept:pending,wingman:pending},rendezvous:'partial'});
 q.board();assert.deepEqual(q.orderIds(),['']);assert.equal(q.select.disabled,false);
 assert.equal(q.select.value,'');assert.equal(q.e['cockpit-launch'].disabled,true);
 q.q.click('cockpit-launch');assert.equal(q.q.inspect().state,'menu');
 assert.equal(q.e['cockpit-bridge'].hidden,false);
 for(const route of ['?hangar=carrier&order=escort','?hangar=carrier&order=intercept&x=1']){
  const invalid=launch({route});
  assert.equal(invalid.e.hangar.open,false);assert.equal(invalid.q.inspect().state,'menu');
 }
 const bifrost=launch({route:'?hangar=carrier&vessel=bifrost'});bifrost.board();
 assert.deepEqual(bifrost.modeIds(),['',...modes]);
 assert.deepEqual(bifrost.orderIds(),['']);bifrost.choose('free-flight');assert.match(bifrost.e['cockpit-launch-status'].textContent,/Launch from moving Bifrost/);
 assert.equal(bifrost.e['cockpit-bridge'].hidden,true);
 bifrost.q.click('cockpit-exit');bifrost.q.click('close-hangar');
 assert.deepEqual(bifrost.visits,['./carrier.html?vessel=bifrost']);
 const escort=launch({route:'?launch=escort'});
 assert.equal(escort.q.inspect().flightMode.id,'escort');assert.equal(escort.e.hangar.open,false);
});
test('Exit or Escape returns to the existing Hangar/loadout; not ready or stale sessions cannot launch',()=>{
 const q=launch();
 q.board();q.q.click('cockpit-exit');
 assert.equal(q.e.hangar.open,true);assert.equal(q.e['hangar-cockpit'].hidden,true);
 assert.equal(q.e['player-hangar-view'].hidden,false);assert.equal(q.q.focused,q.e['hangar-board']);
 q.board();let prevented=false;q.e.hangar.handlers.cancel({preventDefault(){prevented=true;}});
 assert.equal(prevented,true);assert.equal(q.e.hangar.open,true);assert.equal(q.e['hangar-cockpit'].hidden,true);
 q.board();q.choose('intercept');q.storage.set(missionKey,JSON.stringify({...base,intercept:pending}));
 q.q.click('cockpit-launch');
 assert.equal(q.q.inspect().state,'menu');assert.equal(q.e['cockpit-launch'].disabled,true);
 assert.match(q.e['cockpit-launch-status'].textContent,/Orders changed/);
 const stale=launch();stale.board();stale.choose('intercept');stale.storage.set(genKey,'new-pilot');stale.q.click('cockpit-launch');
 assert.equal(stale.q.inspect().state,'menu');assert.equal(stale.e.hangar.open,true);
 const fitting=launch();fitting.board();fitting.choose('intercept');fitting.storage.set(buildKey,JSON.stringify({version:1,hull:'rift-fighter',...fit,battery:null}));fitting.q.click('cockpit-launch');
 assert.equal(fitting.q.inspect().state,'menu');assert.equal(fitting.e.hangar.open,true);
 assert.equal(fitting.e['cockpit-launch'].disabled,true);assert.match(fitting.e['cockpit-launch-status'].textContent,/finish fitting/);
 const damaged=launch({leg:'damaged'});damaged.board();
 assert.equal(damaged.e['hangar-board'].hidden,true);assert.equal(damaged.e['hangar-cockpit'].hidden,true);
});
test('a build edit between cockpit checks does not start a mismatched sortie',()=>{
 let armed=false,reads=0;
 const q=launch({beforeStorageRead(key,storage){
  if(armed&&key===buildKey&&++reads===3)
   storage.set(buildKey,JSON.stringify({version:1,hull:'rift-fighter',...fit,secondary:'ballistic'}));
 }});
 q.board();q.choose('intercept');assert.equal(q.e['cockpit-launch'].disabled,false);
 armed=true;q.q.click('cockpit-launch');
 assert.ok(reads>=3);
 assert.equal(q.q.inspect().state,'menu');assert.equal(q.e.hangar.open,true);
 assert.match(q.e['cockpit-launch-status'].textContent,/Preflight changed/);
});

test('the Escort training card uses the Hangar and launches escort without creating an Admiral quest',()=>{
 const c=launch({route:'?hangar=carrier&order=escort-drill',orderLog:{}});
 const original=c.storage.get(missionKey);
 assert.equal(c.q.inspect().state,'menu'); assert.equal(c.e['hangar-cockpit'].hidden,true);
 c.board();
 assert.equal(c.plan(),'Escort · Training');
 assert.match(c.e['cockpit-launch-status'].textContent,/Escort training.*No career rewards/);
 c.q.click('cockpit-launch');flySouthAcrossDeparture(c.q);
 assert.equal(c.q.inspect().flightMode.id,'escort');assert.ok(c.q.inspect().escortShip);
 assert.equal(c.storage.get(missionKey),original);
});

test('a stale Bridge order does not silently pick the only remaining sortie',()=>{
 const c=launch({route:'?hangar=carrier&order=intercept',orderLog:{intercept:pending},rendezvous:'done'});
 c.board();assert.deepEqual(c.orderIds(),['','rendezvous']);
 assert.equal(c.plan(),'No sortie planned');assert.equal(c.e['cockpit-launch'].disabled,true);
 assert.match(c.e['cockpit-launch-status'].textContent,/no longer available/);
 c.q.click('cockpit-launch');assert.equal(c.q.inspect().state,'menu');
 c.choose('rendezvous');c.q.click('cockpit-launch');flySouthAcrossDeparture(c.q);
 assert.equal(c.q.inspect().flightMode.id,'wingman-test');
});

test('a selected sortie removed during refresh requires choosing the remaining order',()=>{
 const c=launch({orderLog:{intercept:accepted},rendezvous:'done'});
 c.board();c.choose('intercept');
 assert.equal(c.e['cockpit-launch'].disabled,false);
 c.storage.set(missionKey,JSON.stringify({...base,intercept:pending}));
 c.q.pageShow();
 assert.deepEqual(c.orderIds(),['','rendezvous']);assert.equal(c.select.value,'');
 assert.equal(c.e['cockpit-launch'].disabled,true);
 c.q.pageShow();c.q.click('cockpit-launch');assert.equal(c.q.inspect().state,'menu');
 c.choose('rendezvous');c.q.click('cockpit-launch');flySouthAcrossDeparture(c.q);
 assert.equal(c.q.inspect().flightMode.id,'wingman-test');
});

test('new refresh state for the same selected order requires a fresh selection',()=>{
 const c=launch({orderLog:{wingman:accepted}});
 c.board();c.choose('wingman');assert.equal(c.plan(),'Wingman Qualification');
 c.storage.set(missionKey,JSON.stringify({...base,wingman:lodged}));
 c.q.pageShow();
 assert.equal(c.plan(),'No sortie planned');assert.equal(c.e['cockpit-launch'].disabled,true);
 c.choose('wingman');c.q.click('cockpit-launch');flySouthAcrossDeparture(c.q);
 assert.equal(c.q.inspect().flightMode.id,'wingman');
});


test('an empty itinerary opens the moving carrier docked until the pilot clicks Launch',()=>{
 const c=launch({orderLog:{}});
 c.e.hangar.scrollTop=427;
 c.board();
 assert.equal(c.e.hangar.scrollTop,0);
 assert.equal(c.q.inspect().state,'menu');
 assert.equal(c.plan(),'No sortie planned');
 assert.equal(c.e['cockpit-launch'].disabled,false);
 assert.match(c.e['cockpit-launch-status'].textContent,/empty for Free Flight.*launch yourself/);
 assert.equal(c.e['cockpit-bridge'].hidden,false);
 const original=c.storage.get(missionKey);
 c.q.click('cockpit-launch');
 assert.equal(c.q.inspect().state,'play');
 assert.equal(c.q.inspect().flightMode.id,'free-flight');
 assert.equal(c.q.inspect().capitalShip.phase,'docked');
 const distance=c.q.inspect().capitalShip.distance;
 c.q.step(120);
 assert.equal(c.q.inspect().capitalShip.phase,'docked');
 assert.ok(c.q.inspect().capitalShip.distance>distance);
 c.q.click('capital-dock-action');
 assert.equal(c.q.inspect().capitalShip.phase,'launching');
 c.q.step(3);
 assert.equal(c.q.inspect().capitalShip.phase,'flight');
 assert.ok(c.q.inspect().capitalShip.distance>distance);
 assert.equal(c.q.inspect().capitalShip.vessel.id,'pegasus');
 assert.equal(c.q.inspect().flightMode.credits,false);
 assert.equal(c.storage.get(missionKey),original);
});

test('itinerary pickers are separate and start closed; selecting replaces the plan and removing clears it',()=>{
 const c=launch();c.board();
 assert.equal(c.e['cockpit-mode-picker'].hidden,true);
 assert.equal(c.e['cockpit-mission-picker'].hidden,true);
 assert.equal(c.e['cockpit-remove-plan'].hidden,true);
 assert.equal(c.e['cockpit-launch'].disabled,false);
 c.q.click('cockpit-add-mode');
 assert.equal(c.e['cockpit-mode-picker'].hidden,false);
 assert.equal(c.e['cockpit-add-mode'].getAttribute('aria-expanded'),'true');
 c.q.click('cockpit-add-mission');
 assert.equal(c.e['cockpit-mode-picker'].hidden,true);
 assert.equal(c.e['cockpit-mission-picker'].hidden,false);
 let stopped=false;c.e.hangar.handlers.cancel({preventDefault(){stopped=true;}});
 assert.equal(stopped,true);assert.equal(c.e['cockpit-mission-picker'].hidden,true);
 assert.equal(c.e['hangar-cockpit'].hidden,false);
 c.choose('intercept');
 assert.equal(c.plan(),'Vandul Intercept');
 assert.equal(c.e['cockpit-mission-picker'].hidden,true);
 assert.equal(c.e['cockpit-remove-plan'].hidden,false);
 c.choose('practice');
 assert.equal(c.plan(),'Practice Alone');
 assert.equal(c.e['cockpit-mode-picker'].hidden,true);
 assert.equal(c.q.inspect().state,'menu');
 c.q.click('cockpit-remove-plan');
 assert.equal(c.plan(),'No sortie planned');
 assert.equal(c.e['cockpit-launch'].disabled,false);
 assert.equal(c.q.inspect().state,'menu');
 c.choose('practice');c.q.click('cockpit-launch');flySouthAcrossDeparture(c.q);assert.equal(c.q.inspect().flightMode.id,'practice');
});

test('solo vs Vandul runs an enemy sortie without career, credits, or saved hull damage',()=>{
 const c=launch();c.board();const original=[c.storage.get(missionKey),c.storage.get(hullKey)];
 c.choose('solo-training');c.q.click('cockpit-launch');flySouthAcrossDeparture(c.q);
 const {flightMode,wingman}=c.q.inspect();
 assert.equal(flightMode.id,'solo-training');
 assert.equal(flightMode.duel,true);assert.equal(wingman,null);
 assert.equal(flightMode.hull,'none');assert.equal(flightMode.credits,false);assert.equal(flightMode.quest,null);
 assert.deepEqual([c.storage.get(missionKey),c.storage.get(hullKey)],original);
});

test('a mission that changes after opening the picker cannot replace an existing plan',()=>{
 const c=launch();c.board();c.choose('practice');c.q.click('cockpit-add-mission');
 c.storage.set(missionKey,JSON.stringify({...base,intercept:pending}));
 c.mission.value='intercept';c.mission.handlers.change();
 assert.equal(c.plan(),'Practice Alone');
 assert.equal(c.e['cockpit-mission-picker'].hidden,false);
 assert.match(c.e['cockpit-launch-status'].textContent,/no longer available/);
});

test('explicit Bifrost free flight launches from Bifrost and returns there; Capital test remains parked',()=>{
 const c=launch({route:'?hangar=carrier&vessel=bifrost'});c.board();c.choose('free-flight');c.q.click('cockpit-launch');
 assert.equal(c.q.inspect().capitalShip.vessel.id,'bifrost');
 assert.equal(c.q.inspect().capitalShip.phase,'docked');
 c.q.step(110);assert.equal(c.q.inspect().capitalShip.phase,'docked');
 c.q.click('capital-dock-action');assert.equal(c.q.inspect().capitalShip.phase,'launching');
 c.q.step(3);assert.equal(c.q.inspect().capitalShip.phase,'flight');
 c.q.click('return-main-menu');assert.deepEqual(c.visits,['./carrier.html?vessel=bifrost']);
 const parked=launch();parked.board();parked.choose('capital-test');parked.q.click('cockpit-launch');
 assert.equal(parked.q.inspect().capitalShip.phase,'docked');
 assert.equal(parked.q.inspect().flightMode.id,'capital-test');
 assert.ok(parked.q.inspect().capitalShip.stream,'cockpit Capital Test shares the streaming map');
});

test('Bishop briefing list reflects eligibility and save state without accepting missions',()=>{
 const c=launch({orderLog:{intercept:pending,wingman:lodged},rendezvous:'partial'});
 const original=c.storage.get(missionKey);
 c.board();
 assert.deepEqual(c.e['cockpit-quest-list'].children.map(row=>row.textContent),[
  'Outfit the Rift-3 · Completed','Vandul Intercept · Report to Bishop','Wingman Qualification · Completed · Can re-fly',
  'Ace Qualification · Accept on Bridge','Wing Rendezvous · Meet Leena and Tomas'
 ]);
 assert.equal(c.orderIds().includes('ace'),false);
 assert.equal(c.orderIds().includes('intercept'),false);
 assert.equal(c.storage.get(missionKey),original);
});

test('a pilot-save failure on Board shows readable feedback before entering the cockpit',()=>{
 let blocked=false;
 const c=launch({beforeStorageRead(key){if(blocked&&key===genKey)throw Error('storage denied');}});
 blocked=true;c.board();
 assert.equal(c.e['hangar-cockpit'].hidden,true);
 assert.match(c.e['fit-build-status'].textContent,/Could not read the pilot save/);
 blocked=false;c.board();
 assert.equal(c.e['hangar-cockpit'].hidden,false);
});


test('before buying another fighter, Hangar only shows recovered Rift-3, including when damaged',()=>{
 const unclaimed=launch({leg:'unclaimed'});
 assert.equal(unclaimed.e['hangar-ship-choice'].hidden,true);
 assert.equal(unclaimed.e['hangar-ship'].disabled,true);
 const damaged=launch({leg:'damaged'});
 assert.equal(damaged.e['hangar-ship-choice'].hidden,false);
 assert.equal(damaged.e['hangar-ship'].value,'rift-fighter');
 assert.match(damaged.e['hangar-ship-caption'].textContent,/needs repairs/);
 assert.equal(damaged.e['hangar-board'].hidden,true);
 const ready=launch();
 assert.equal(ready.e['hangar-ship-choice'].hidden,false);
 assert.match(ready.e['hangar-ship-caption'].textContent,/only owned fighter/);
});


test('both carriers can switch purchased hulls, preserving fitter and repairs per hull',()=>{
 const stock='stocky-light-fighter',bastion='bastion-9',selection='rift-runner.selected-fighter.v1';
 for(const carrier of ['rift-carrier','bifrost']){
  const fixture=launch({route:'?hangar=carrier&vessel='+carrier,hulls:[stock,bastion]});
  const {q,e,storage}=fixture;
  assert.equal(e['hangar-ship'].value,'rift-fighter');
  assert.equal(e['fit-shop-link'].getAttribute('href'),'./carrier-shop.html?vessel='+carrier);
  assert.equal(e['hangar-ship-next'].disabled,false);
  q.click('hangar-ship-next');assert.equal(e['hangar-ship'].value,stock);
  assert.equal(e['hangar-ship-name'].textContent,'Stocky-2 Light Fighter');
  assert.equal(storage.get(selection),stock);
  assert.equal(q.inspect().fighterLoadout.engine,null);
  storage.set(buildKey+'.'+bastion,JSON.stringify({version:1,hull:bastion,...fit}));
  storage.set(hullKey+'.'+stock,JSON.stringify({version:1,hull:stock,condition:'damaged'}));
  q.click('hangar-ship-next');
  assert.equal(e['hangar-ship'].value,bastion);
  assert.equal(q.inspect().fighterLoadout.engine,fit.engine);
  assert.equal(e['hangar-board'].hidden,false);
  q.click('hangar-ship-prev');assert.equal(e['hangar-board'].hidden,true);
  assert.equal(e['fit-repair-hull'].hidden,false);
  assert.equal(JSON.parse(storage.get(hullKey)).condition,'repaired');
  q.click('hangar-ship-prev');assert.equal(e['hangar-ship'].value,'rift-fighter');
  assert.equal(q.inspect().fighterLoadout.engine,fit.engine);
 }
});

test('boarding plays the whole closed-canopy animation and then the zoom, without launching',()=>{
 const c=launch({animate:true});const view=c.e['player-hangar-view'];
 c.board(false);
 assert.equal(c.e['hangar-canopy-rig'].dataset.canopy,'open');
 assert.equal(view.dataset.boarding,'canopy');
 assert.equal(c.e['hangar-board'].disabled,true);
 c.q.advanceTimers(1079);
 c.board(false); // A second trusted tap never restarts the clock.
 c.q.click('hangar-canopy-button');
 assert.equal(c.e['hangar-canopy-rig'].dataset.canopy,'open');
 assert.equal(c.e['hangar-cockpit'].hidden,true);
 c.q.advanceTimers(1);
 assert.equal(view.dataset.boarding,'zoom');
 c.q.advanceTimers(359);
 assert.equal(c.e['hangar-cockpit'].hidden,true);
 c.q.advanceTimers(1);
 assert.equal(c.e['hangar-cockpit'].hidden,false);
 assert.equal(view.dataset.boarding,undefined);
 assert.equal(c.q.inspect().state,'menu');
});

test('boarding waits only for the remaining canopy motion and skips it if already open',()=>{
 const c=launch({animate:true});const view=c.e['player-hangar-view'];
 c.q.click('hangar-canopy-button');c.q.advanceTimers(600);c.board(false);
 c.q.advanceTimers(479);assert.equal(view.dataset.boarding,'canopy');
 c.q.advanceTimers(1);assert.equal(view.dataset.boarding,'zoom');
 c.q.advanceTimers(360);assert.equal(c.e['hangar-cockpit'].hidden,false);
 c.q.click('cockpit-exit');assert.equal(c.e['hangar-board'].disabled,false);
 c.board(false);assert.equal(view.dataset.boarding,'zoom');
});

test('boarding cancels on tab hide, Hangar exit, or a stale pilot/hull, leaving no delayed launch',()=>{
 for(const stop of [
  c=>c.q.hide(true),c=>c.q.pageHide(),c=>c.q.click('close-hangar'),
  c=>c.storage.set(genKey,'new-pilot'),
  c=>c.storage.set(hullKey,JSON.stringify({version:1,hull:'rift-fighter',condition:'damaged'}))
 ]){
  const c=launch({animate:true});c.board(false);c.q.advanceTimers(1100);stop(c);
  c.q.advanceTimers(2000);
  assert.equal(c.e['hangar-cockpit'].hidden,true);
  assert.equal(c.e['player-hangar-view'].dataset.boarding,undefined);
  assert.equal(c.q.inspect().state,'menu');
 }
});

test('reduced motion skips boarding animation and opens first-person view immediately',()=>{
 const c=launch();c.board(false);
 assert.equal(c.e['hangar-cockpit'].hidden,false);
 assert.equal(c.e['player-hangar-view'].dataset.boarding,undefined);
 assert.equal(c.q.inspect().state,'menu');
});


test('flyable partial damage zooms the damaged bay without animating an invisible canopy',()=>{
 const c=launch({animate:true});
 c.storage.set(hullKey,JSON.stringify({version:1,hull:'rift-fighter',condition:'repaired',hullHp:16,maxHullHp:20}));
 c.q.pageShow();c.board(false);
 assert.equal(c.e['player-hangar-view'].dataset.boarding,'zoom');
 assert.equal(c.e['hangar-canopy-rig'].dataset.canopy,'closed');
 c.q.advanceTimers(360);assert.equal(c.e['hangar-cockpit'].hidden,false);
});


test('an expired itinerary can use blank takeoff only after the pilot deliberately clears the expired order',()=>{
 const c=launch({route:'?hangar=carrier&order=intercept',orderLog:{intercept:pending}});
 c.board();assert.equal(c.e['cockpit-launch'].disabled,true);
 c.q.click('cockpit-launch');assert.equal(c.q.inspect().state,'menu');
 assert.equal(c.e['cockpit-remove-plan'].textContent,'Clear expired order');
 c.q.click('cockpit-remove-plan');assert.equal(c.e['cockpit-launch'].disabled,false);
 c.q.click('cockpit-launch');assert.equal(c.q.inspect().flightMode.id,'free-flight');
 assert.equal(c.q.inspect().capitalShip.phase,'docked');
});


test('updated Carrier flight URLs wait for trusted takeoff, and drifting across the departure edge does not start a sortie',()=>{
 for(const [route,mode] of [['practice','practice'],['vandul','vandul'],['wingman-test','wingman-test'],['escort','escort']]){
  const c=launch({route:'?launch='+route+'&departure=carrier'});
  const {q}=c;
  assert.equal(q.inspect().flightMode.id,'carrier-departure');
  assert.equal(q.inspect().capitalShip.phase,'docked');
  assert.equal(q.el['capital-dock-action'].textContent,'Launch');
  q.step(45);q.click('capital-dock-action',{isTrusted:false});q.step(5);
  assert.equal(q.inspect().capitalShip.phase,'docked');
  q.click('capital-dock-action');reachDeparture(q);
  assert.match(q.el['capital-dock-status'].textContent,/Fly south/);
  q.step(5);assert.equal(q.inspect().flightMode.id,'carrier-departure');
  flySouthAcrossDeparture(q);
  assert.equal(q.inspect().flightMode.id,mode);assert.equal(q.inspect().capitalShip,null);
 }
});

test('Reset during transit re-arms the parked carrier, returning cancels, and a changed career order cannot transfer',()=>{
 const c=launch({route:'?hangar=carrier&order=intercept'});c.board();c.q.click('cockpit-launch');
 const {q}=c;reachDeparture(q);q.reset();
 assert.equal(q.inspect().capitalShip.phase,'docked');
 q.click('capital-dock-action');reachDeparture(q);
 c.storage.set(missionKey,JSON.stringify({...base,intercept:pending}));
 flySouthAcrossDeparture(q);
 assert.equal(q.inspect().flightMode.id,'carrier-departure');
 assert.equal(q.inspect().capitalShip.phase,'flight');
 assert.match(q.el['capital-dock-status'].textContent,/Flight plan or fighter changed/);
 assert.equal(q.el['capital-dock-action'].disabled,false);
 q.click('capital-dock-action');assert.ok(q.inspect().p.dockingClearance,'can still request docking');
 q.click('return-main-menu');assert.deepEqual(c.visits,['./carrier.html']);assert.equal(q.inspect().state,'menu');
});

test('the marked south boundary is reachable from real carrier takeoff with ordinary manual controls',()=>{
 const c=launch({route:'?launch=practice&departure=carrier',animate:true});
 const {q}=c;
 q.click('capital-dock-action');
 for(let i=0;i<180&&q.inspect().capitalShip?.phase==='launching';i++)q.step();
 assert.equal(q.inspect().capitalShip.phase,'flight');
 assert.ok(Math.sin(q.inspect().p.aim)>.95,'the aft departure points the fighter south');
 q.step(100);assert.equal(q.inspect().flightMode.id,'carrier-departure');
 q.key('keydown','KeyE');
 for(let i=0;i<420&&q.inspect().flightMode.id==='carrier-departure';i++)q.step();
 q.key('keyup','KeyE');
 assert.equal(q.inspect().flightMode.id,'practice');
});


test('manual south thrust arms coasting through the boundary, and can recover a late command beyond the marker',()=>{
 const pilot=()=>{const c=launch({route:'?launch=practice&departure=carrier'});c.q.click('capital-dock-action');reachDeparture(c.q);return c.q;};
 const coast=pilot(),{p,arena}=coast.inspect();
 p.y=arena.bottom-46;
 coast.key('keydown','KeyS');coast.step(2);coast.key('keyup','KeyS');
 assert.equal(coast.inspect().flightMode.id,'carrier-departure');
 coast.step(16);assert.equal(coast.inspect().flightMode.id,'practice');
 const late=pilot();
 late.step(8);assert.ok(late.inspect().p.y>=late.inspect().arena.bottom-30);
 assert.equal(late.inspect().flightMode.id,'carrier-departure');
 late.key('keydown','KeyS');late.step(2);late.key('keyup','KeyS');
 assert.equal(late.inspect().flightMode.id,'practice');
});

test('streaming Pegasus and Bifrost cruise north without wrapping, with long straight legs and gentle continuous turns',()=>{
 for(const route of ['?hangar=carrier','?hangar=carrier&vessel=bifrost']){
  const h=launch({route});h.board();h.q.click('cockpit-launch');const q=h.q;
  const {capitalShip:c,capitalCourse:course,arena}=q.inspect();
  assert.ok(c.stream,'blank takeoff uses the streaming scene on either vessel');
  const sample=distance=>{
   c.distance=distance;q.step();
   return {x:c.x,y:c.y,aim:c.aim};
  };
  const first=sample(0),long=sample(2300),turn=sample(2860),second=sample(3300),far=sample(330000);
  assert.equal(first.x,long.x);assert.equal(first.aim,long.aim);
  assert.ok(long.y-first.y<-2200);
  assert.ok(turn.aim>first.aim+.18&&turn.aim<first.aim+.21);
  assert.ok(second.x>first.x+75&&second.x<first.x+100);
  assert.equal(second.aim,first.aim);
  assert.ok(far.y<second.y-300000);
  assert.equal(arena.bottom-arena.top,2376);
  for(const join of [2420,2860,3300,5720,6160,6600]){
   sample(join-1);const before={x:c.x,y:c.y,aim:c.aim};q.step();
   assert.ok(Math.abs(c.aim-before.aim)<.001);
   assert.ok(Math.abs(Math.hypot(c.x-before.x,c.y-before.y)-course.speed*.016)<.002,
    'constant physical speed through entry, midpoint, and end of turns');
  }
  q.click('return-main-menu');
  assert.equal(arena.top,12);assert.equal(arena.bottom,1428);
 }
});

test('deterministic streamed star bands are bounded and are discarded as the active rectangle advances',()=>{
 const box={width:378,height:460,left:0,top:0};
 const h=launch({route:'?launch=practice&departure=carrier',canvasBox:box}),q=h.q;
 const {capitalShip:c,arena}=q.inspect();
 assert.ok(c.stream);q.step(3);
 const center=[...c.stream.bands.keys()].sort((a,b)=>a-b)[2];
 const snapshot=JSON.stringify(c.stream.bands.get(center));
 const first=[...c.stream.bands.keys()];
 for(let i=1;i<=48;i++){
  c.distance=i*1234;q.step();
  const {camera}=q.inspect();
  assert.equal(Math.round(arena.bottom-arena.top),2376);
  assert.ok(camera.y>=arena.top-12&&camera.y+camera.h<=arena.bottom+12);
  assert.ok(c.stream.bands.size<=Math.ceil(camera.h/512)+3);
 }
 Object.assign(box,{width:100,height:1200});q.outside('resize',{});q.step();
 assert.ok(q.inspect().camera.h<=2400,'a far-sector resize cannot expand the viewport beyond the original window');
 Object.assign(box,{width:378,height:460});q.outside('resize',{});q.step();
 assert.ok(first.every(index=>!c.stream.bands.has(index)),'old rear bands were freed');
 c.distance=0;q.step();
 assert.equal(JSON.stringify(c.stream.bands.get(center)),snapshot,'regeneration is independent of visit history');
});

test('streaming ship preserves berth pose and relative-speed docking through turns and bands',()=>{
 const h=launch({route:'?launch=practice&departure=carrier'}),q=h.q;
 const {capitalShip:c,p,berthWorld,berthLocal,berthVelocity,capitalBerth:b,capitalDockCheck}=q.inspect();
 c.distance=2750;q.step(3);
 assert.ok(c.aim> -Math.PI/2+.10);
 q.click('capital-dock-action');reachDeparture(q);
 const aft=berthWorld(c,0,b.approach),v=berthVelocity(0,b.approach);
 Object.assign(p,aft,{vx:v.x,vy:v.y});
 q.click('capital-dock-action');
 assert.ok(capitalDockCheck().ready);
 const old=aft;q.step();const next=berthWorld(c,0,b.approach);
 assert.ok(Math.hypot(next.x-old.x-v.x*.016,next.y-old.y-v.y*.016)<.002,
  'beacon velocity matches its actual movement through a bend');
 q.click('capital-dock-action');q.step(3);assert.equal(c.phase,'docked');
 assert.ok(Math.abs(berthLocal(c,p.x,p.y).y-c.pads[c.pad][1])<1e-7);
 q.click('capital-store-action');q.step(3);assert.equal(c.phase,'stored');
 assert.ok(Math.abs(berthLocal(c,p.x,p.y).y-c.lift.y)<1e-7);
 q.key('keydown','KeyP');const stopped=c.distance;q.step(30);assert.equal(c.distance,stopped);
 q.choose('resume');q.click('capital-dock-action');q.step(4);assert.equal(c.phase,'flight');
 assert.equal(q.inspect().flightMode.id,'carrier-departure');
});

test('rear edge sweeping across a stopped but previously armed player never starts a mission; deliberate departure does',()=>{
 const h=launch({route:'?launch=practice&departure=carrier'}),q=h.q;
 q.click('capital-dock-action');reachDeparture(q);
 const {p,arena}=q.inspect();
 // Arm with a genuine south command well inside the old boundary, then let
 // the carrier sweep its window north across the stationary fighter.
 p.y=arena.bottom-100;p.vy=0;q.key('keydown','KeyS');q.step(2);q.key('keyup','KeyS');p.vx=p.vy=0;
 q.step(152);assert.ok(p.y>=arena.bottom-30);
 assert.equal(q.inspect().flightMode.id,'carrier-departure');
 q.key('keydown','KeyS');q.step(2);q.key('keyup','KeyS');
 assert.equal(q.inspect().flightMode.id,'practice');
 assert.equal(q.inspect().capitalShip,null);
 assert.equal(arena.top,12);assert.equal(arena.bottom,1428);
});

test('free flight never transfers at the same moving rear boundary even with deliberate outbound thrust',()=>{
 const h=launch();h.board();h.q.click('cockpit-launch');const q=h.q;
 reachDeparture(q);
 q.key('keydown','KeyS');q.step(90);q.key('keyup','KeyS');
 const {p,arena,flightMode}=q.inspect();
 assert.ok(p.y>=arena.bottom-30);
 assert.equal(flightMode.id,'free-flight');
});


test('Go to launch deck keeps every itinerary parked until the separate trusted Launch click',()=>{
 for(const id of ['',...modes,'intercept']){
  const c=launch();c.board();if(id)c.choose(id);
  c.q.click('cockpit-launch');
  const {q}=c,ship=q.inspect().capitalShip;
  assert.ok(ship,id);assert.equal(ship.phase,'docked',id);
  assert.equal(q.el['capital-dock-action'].textContent,'Launch');
  q.key('keydown','KeyE');q.step(24);q.key('keyup','KeyE');
  q.click('capital-dock-action',{isTrusted:false});q.step(150);
  assert.equal(ship.phase,'docked',id);
  assert.ok(ship.distance>0,'the carrier itself still cruises');
  q.click('capital-dock-action');assert.equal(ship.phase,'launching',id);
 }
});


test('each shared Bifrost training mode stays aboard Bifrost until a manual launch and exits to its home vessel',()=>{
 for(const [mode,id] of [['practice','practice'],['solo-training','solo-training'],['escort-drill','escort'],['wingman-test','wingman-test']]){
  const c=launch({route:'?hangar=carrier&vessel=bifrost',orderLog:{intercept:accepted,wingman:accepted},rendezvous:'done'});
  c.board();
  assert.deepEqual(c.orderIds(),[''],'Pegasus orders do not leak into another company cockpit');
  c.choose(mode);c.q.click('cockpit-launch');
  const {capitalShip,flightMode}=c.q.inspect();
  assert.equal(flightMode.id,'carrier-departure');assert.equal(capitalShip.vessel.id,'bifrost');
  assert.equal(capitalShip.phase,'docked');assert.ok(capitalShip.stream);
  c.q.step(90);assert.equal(capitalShip.phase,'docked','opening deck does not launch');
  flySouthAcrossDeparture(c.q);
  const flight=c.q.inspect();
  assert.equal(flight.flightMode.id,id);assert.equal(flight.flightMode.capitalVessel.id,'bifrost');
  assert.equal(flight.capitalShip,null);
  if(id==='wingman-test'){
   assert.ok(flight.testLead&&flight.wingman);
   assert.notEqual(flight.testLead.displayName,'Leena');
  }
  c.q.click('return-main-menu');assert.deepEqual(c.visits,['./carrier.html?vessel=bifrost']);
 }
});

test('Bifrost training deep links use its own departure deck while Pegasus campaign links remain ineligible',()=>{
 const c=launch({route:'?launch=solo-training&vessel=bifrost&departure=carrier'});
 assert.equal(c.q.inspect().capitalShip.vessel.id,'bifrost');
 flySouthAcrossDeparture(c.q);
 assert.equal(c.q.inspect().flightMode.id,'solo-training');
 c.q.click('return-main-menu');assert.deepEqual(c.visits,['./carrier.html?vessel=bifrost']);
 for(const route of ['?launch=vandul&vessel=bifrost&departure=carrier','?launch=vandul&mission=wingman&vessel=bifrost&departure=carrier','?hangar=carrier&vessel=bifrost&order=intercept']){
  const protectedRoute=launch({route,orderLog:{intercept:accepted,wingman:accepted}});
  assert.equal(protectedRoute.q.inspect().state,'menu');assert.equal(protectedRoute.e.hangar.open,false);
 }
});


test('Bifrost exterior URL aliases retain departure and Escort cockpit context',()=>{
 const c=launch({route:'?launch=practice&departure=carrier&vessel=bifrost',animate:true});
 const {q}=c;
 assert.equal(q.inspect().capitalShip.vessel.id,'bifrost');
 q.click('capital-dock-action');
 for(let i=0;i<180&&q.inspect().capitalShip?.phase==='launching';i++)q.step();
 assert.equal(q.inspect().capitalShip.phase,'flight');
 assert.ok(Math.sin(q.inspect().p.aim)>.95);
 q.step(100);assert.equal(q.inspect().flightMode.id,'carrier-departure');
 q.key('keydown','KeyE');
 for(let i=0;i<420&&q.inspect().flightMode.id==='carrier-departure';i++)q.step();
 q.key('keyup','KeyE');
 assert.equal(q.inspect().flightMode.id,'practice');
 q.click('return-main-menu');assert.deepEqual(c.visits,['./carrier.html?vessel=bifrost']);
 for(const route of ['?hangar=carrier&order=escort-drill&vessel=bifrost','?hangar=carrier&vessel=bifrost&order=escort-drill']){
  const escort=launch({route});
  escort.board();assert.equal(escort.plan(),'Escort · Training');
  escort.q.click('cockpit-launch');assert.equal(escort.q.inspect().capitalShip.vessel.id,'bifrost');
  flySouthAcrossDeparture(escort.q);assert.ok(escort.q.inspect().escortShip);
 }
});

test('an explicit Pegasus guest route keeps Pegasus on closing Hangar and after the sortie',()=>{
 const route='?hangar=carrier&vessel=rift-carrier&order=intercept';
 const closed=launch({route});closed.q.click('close-hangar');
 assert.deepEqual(closed.visits,['./carrier.html?vessel=rift-carrier']);
 const pilot=launch({route});
 pilot.board();assert.equal(pilot.plan(),'Vandul Intercept');
 pilot.q.click('cockpit-launch');assert.equal(pilot.q.inspect().capitalShip.vessel.id,'pegasus');
 flySouthAcrossDeparture(pilot.q);
 assert.equal(pilot.q.inspect().flightMode.id,'vandul');
 pilot.q.click('return-main-menu');assert.deepEqual(pilot.visits,['./carrier.html?vessel=rift-carrier']);
});

test('Bifrost solo training victory, fallback and simulated destruction keep Bifrost without mutating pilot saves',()=>{
 const fly=()=>{
  const c=launch({route:'?hangar=carrier&vessel=bifrost'});c.board();c.choose('solo-training');
  c.q.click('cockpit-launch');flySouthAcrossDeparture(c.q);
  assert.deepEqual([c.q.inspect().flightMode.credits,c.q.inspect().flightMode.hull,c.q.inspect().flightMode.quest],[false,'none',null]);
  c.q.cover(false);c.q.target(true);
  const {p,vandul,cones,asteroids,sceneryDebris}=c.q.inspect();
  cones.splice(0);asteroids.splice(0);sceneryDebris.splice(0);
  Object.assign(p,{x:430,y:900,aim:-Math.PI/2,vx:0,vy:0,he3:20});
  Object.assign(vandul,{x:430,y:800,vx:0,vy:0,hp:1,nextLaser:1e4,nextDriveBy:1e4});
  return c;
 };
 const victory=fly(),{q}=victory,before=Array.from(victory.storage);
 q.armFinalForTest();
 q.inspect().shots.push({x:430,y:822,a:-Math.PI/2,vx:0,vy:-6400,life:2,weapon:'blaster',damage:5});
 for(let i=0;i<300&&!victory.visits.length;i++)q.step();
 assert.deepEqual(victory.visits,['./carrier.html?vessel=bifrost']);
 assert.match(q.el.overlay.innerHTML,/href="\.\/carrier\.html\?vessel=bifrost"/);
 assert.match(q.el.overlay.innerHTML,/No career progress was saved/);
 assert.deepEqual(Array.from(victory.storage),before);
 const disabled=fly(),{p,vandul,vandulLasers}=disabled.q.inspect(),save=Array.from(disabled.storage);
 vandulLasers.push({x:p.x-32,y:p.y,vx:6400,vy:0,a:0,kind:'energy',life:1,damage:99,owner:vandul});
 disabled.q.step();assert.equal(disabled.q.inspect().state,'disabled');
 disabled.q.choose('main-menu');
 assert.deepEqual(disabled.visits,['./carrier.html?vessel=bifrost']);
 assert.deepEqual(Array.from(disabled.storage),save);
});


test('cockpit groups all three Custom loaners for both vessels and starts the chosen hull docked without touching saves',()=>{
 const custom=['custom-bastion-9','custom-stocky-light-fighter','custom-rift-fighter'];
 for(const [vessel,leg] of [['rift-carrier','repaired'],['bifrost','unclaimed']]){
  const c=launch({route:'?hangar=carrier&vessel='+vessel,leg,loadFighters:true});
  const stored=[...c.storage];
  if(leg==='repaired')c.board();
  else{
   assert.equal(c.e['hangar-board'].hidden,true);
   assert.equal(c.e['hangar-loaner'].hidden,false);
   c.q.click('hangar-loaner',{isTrusted:false});assert.equal(c.e['hangar-cockpit'].hidden,true);
   c.q.click('hangar-loaner');assert.equal(c.e['cockpit-mode-picker'].hidden,false);
   assert.equal(c.e['cockpit-launch'].disabled,true);
  }
  assert.deepEqual(c.modeIds(),['',...(leg==='repaired'?[...modes,'vandul']:[]),...custom,'four-way-north','four-way-east','four-way-south','four-way-west']);
  if(leg==='repaired')c.choose('custom-stocky-light-fighter');
  else{c.select.value='custom-stocky-light-fighter';c.select.handlers.change();}
  assert.match(c.plan(),/Custom Mode · Stocky-2 Light Fighter/);
  assert.match(c.e['cockpit-launch-status'].textContent,/No purchase needed; no save changes/);
  assert.equal(c.q.inspect().state,'menu');
  c.q.click('cockpit-launch');
  assert.equal(c.q.inspect().flightMode.id,'custom');
  assert.equal(c.q.inspect().flightMode.loaner,'stocky-light-fighter');
  assert.equal(c.q.inspect().capitalShip.vessel.id,vessel==='bifrost'?'bifrost':'pegasus');
  assert.equal(c.q.inspect().capitalShip.phase,'docked');
  c.q.step(25);assert.equal(c.q.inspect().capitalShip.phase,'docked');
  c.q.click('return-main-menu');assert.deepEqual(c.visits,['./carrier.html?vessel='+vessel]);
  assert.deepEqual([...c.storage],stored);
 }
});

test('Fight Vandul preserves Pegasus battle persistence and is not offered aboard Bifrost',()=>{
 const pegasus=launch({route:'?hangar=carrier&vessel=rift-carrier',orderLog:{}});
 pegasus.board();pegasus.choose('vandul');
 pegasus.q.click('cockpit-launch');assert.equal(pegasus.q.inspect().capitalShip.phase,'docked');
 flySouthAcrossDeparture(pegasus.q);
 assert.equal(pegasus.q.inspect().flightMode.id,'vandul');
 assert.equal(pegasus.q.inspect().flightMode.credits,true);
 assert.equal(pegasus.q.inspect().flightMode.hull,'battle');
 const b=launch({route:'?hangar=carrier&vessel=bifrost'});b.board();
 assert.ok(b.modeIds().includes('solo-training'));
 assert.ok(!b.modeIds().includes('vandul'));
});

test('the active personal bay shares coordinates with the fighter art, leaving the NPC spots untouched',()=>{
 const html=read('index.html'),css=read('style.css');
 assert.match(html,/<p id="hangar-bay-heading" class="hangar-kicker">PERSONAL FIGHTER BAY · 01<\/p>/);
 assert.match(html,/<div class="hangar-content" id="player-hangar-view"[^>]*data-bay="01"/);
 assert.equal((html.match(/class="hangar-berth bay-0[35]"><span>0[35]<\/span><img class="parked-rift"/g)||[]).length,4);
 assert.match(css,/\.hangar-fleet\{[^}]*pointer-events:none/);
 assert.match(css,/data-bay="06"[^}]*--pilot-berth-x:65.75%;--pilot-berth-y:76%/);
 assert.match(css,/\.hangar-camera>\.hangar-fighter,\.hangar-camera>\.hangar-damaged-fighter\{[^}]*left:var\(--pilot-berth-x\);top:var\(--pilot-berth-y\)/);
 assert.match(css,/transform-origin:var\(--pilot-berth-x\) var\(--pilot-berth-y\)/);
});

test('visiting Bifrost cannot show, manage or launch the Pegasus fighter, but offers a safe loaner',()=>{
 const route='?hangar=carrier&vessel=bifrost';
 const c=launch({route,homeVessel:'rift-carrier',loadFighters:true});
 const original=[...c.storage];
 assert.equal(c.e.hangar.open,true);
 assert.equal(c.e['player-hangar-view'].hidden,true);
 assert.equal(c.e['guest-hangar-view'].hidden,false);
 assert.equal(c.e['guest-hangar-home'].getAttribute('href'),'./index.html?hangar=carrier&vessel=rift-carrier');
 c.q.click('hangar-board');
 c.q.click('fit-repair-direct');
 c.q.click('fit-repair-hull');
 c.q.click('fit-claim-hull');
 c.q.fit('engine','');
 assert.equal(c.e['hangar-cockpit'].hidden,true);
 assert.deepEqual([...c.storage],original);
 c.q.click('guest-hangar-loaner');
 assert.equal(c.e['hangar-cockpit'].hidden,false);
 assert.equal(c.e['guest-hangar-view'].hidden,true);
 assert.deepEqual(c.modeIds(),['','custom-bastion-9','custom-stocky-light-fighter','custom-rift-fighter','four-way-north','four-way-east','four-way-south','four-way-west']);
 c.select.value='custom-bastion-9';c.select.handlers.change();c.q.click('cockpit-launch');
 assert.equal(c.q.inspect().flightMode.loaner,'bastion-9');
 assert.equal(c.q.inspect().capitalShip.vessel.id,'bifrost');
 assert.equal(c.q.inspect().capitalShip.phase,'docked');
 c.q.click('return-main-menu');
 assert.deepEqual(c.visits,['./carrier.html?vessel=bifrost']);
 assert.deepEqual([...c.storage],original);
});
test('home may be Bifrost, but visiting Pegasus or requesting its story sortie still does not transfer a fighter',()=>{
 const home=launch({route:'?hangar=carrier',homeVessel:'bifrost'});
 assert.equal(home.e['player-hangar-view'].hidden,false);
 assert.equal(home.e['guest-hangar-view'].hidden,true);
 home.board();home.q.click('cockpit-launch');
 assert.equal(home.q.inspect().capitalShip.vessel.id,'bifrost');
 for(const route of ['?hangar=carrier&vessel=rift-carrier','?launch=vandul&departure=carrier','?hangar=carrier&order=intercept','?launch=capital-test&vessel=pegasus&departure=carrier']){
  const away=launch({route,homeVessel:'bifrost'});
  assert.equal(away.q.inspect().state,'menu',route);
  assert.equal(away.e['player-hangar-view'].hidden,true,route);
  assert.equal(away.e['guest-hangar-home'].getAttribute('href'),'./index.html?hangar=carrier&vessel=bifrost',route);
 }
 const pegasus=launch({route:'?hangar=carrier&vessel=rift-carrier',homeVessel:'rift-carrier'});
 assert.equal(pegasus.e['player-hangar-view'].hidden,false);
 for(const route of ['?launch=practice&vessel=bifrost&departure=carrier','?launch=capital-test&vessel=bifrost']){
  const away=launch({route,homeVessel:'rift-carrier'});
  assert.equal(away.e['guest-hangar-view'].hidden,false,route);
  assert.equal(away.q.inspect().capitalShip,null,route);
 }
 const arena=launch({route:'?launch=practice',homeVessel:'bifrost'});
 assert.equal(arena.q.inspect().flightMode.id,'practice');
 assert.equal(arena.q.inspect().state,'play');
 assert.notEqual(arena.e.hangar.open,true);
});

test('changing local home while departing cannot continue a previously armed personal sortie',()=>{
 const c=launch({route:'?hangar=carrier&vessel=rift-carrier',homeVessel:'rift-carrier'});
 c.board();c.choose('practice');c.q.click('cockpit-launch');
 assert.equal(c.q.inspect().capitalShip.phase,'docked');
 c.storage.set('rift-runner.pilot-profile.v1',JSON.stringify({version:2,companyVesselId:'bifrost'}));
 c.q.click('capital-dock-action');
 assert.equal(c.q.inspect().capitalShip.phase,'docked');
 assert.notEqual(c.q.inspect().flightMode.id,'practice');
});

const parkingKey='rift-runner.fighter-parking.v1.rift-fighter';
const flushParking=()=>new Promise(setImmediate);
function departTransfer(c){
 const q=c.q;
 assert.equal(q.inspect().capitalShip.phase,'docked');
 assert.match(c.e['capital-dock-status'].textContent,/Launch when ready/);
 q.step(20);assert.equal(q.inspect().capitalShip.phase,'docked','Galaxy selection does not launch the fighter');
 q.click('capital-dock-action');q.step(3);
 assert.equal(q.inspect().capitalShip.phase,'flight');
 assert.equal(q.el['fighter-transit'].hidden,false);
}
function approachOther(c){
 const {q}=c,from=q.inspect().capitalShip,p=q.inspect().p;
 assert.ok(from.transfer);
 assert.match(q.el['fighter-transit-chart'].getAttribute('src'),/galaxy-map.html\?transit=1&from=rift-carrier&to=bifrost/);
 const tickUpdates=[];
 q.el['fighter-transit-chart'].contentWindow={postMessage(payload){tickUpdates.push(payload);}};
 Object.assign(p,{hp:14,he3:9});
 const before={x:p.x,y:p.y,hp:p.hp,he3:p.he3};
 q.step(100);assert.equal(q.inspect().capitalShip,from,'chart clock waits until the view has loaded');
 assert.equal(p.x,before.x);assert.equal(p.y,before.y);
 q.el['fighter-transit-chart'].handlers.load();
 q.step(78);
 assert.equal(q.inspect().capitalShip,from,'travel is not instantaneous');
 const updates=tickUpdates.length;
 q.hide(true);q.step(250);
 assert.equal(tickUpdates.length,updates,'backgrounding does not advance travel');
 q.hide(false);
 assert.equal(q.inspect().state,'play','the foreground chart can finish without an inaccessible Resume control');
 q.step(150);
 const next=q.inspect();
 assert.notEqual(next.capitalShip,from);
 assert.equal(next.capitalShip.phase,'flight');
 assert.equal(p.dockingClearance,false);
 assert.equal(next.p,p,'flight preserves the same fighter and fit, not a reset');
 assert.equal(p.hp,before.hp);assert.ok(p.he3>=before.he3);
 assert.equal(q.el['fighter-transit'].hidden,true);
 assert.match(q.el['capital-dock-status'].textContent,/Battle Fleet Map.*Request docking clearance/);
 assert.equal(tickUpdates[0].type,'rift-fighter-transit');
 assert.equal(tickUpdates[0].to,'bifrost');
 assert.equal(tickUpdates.at(-1).progress,1);
 const approach=next.berthWorld(next.capitalShip,0,next.capitalBerth.approach);
 assert.ok(Math.hypot(p.x-approach.x,p.y-approach.y)>next.capitalBerth.maxGap,'arrives outside the other carrier clearance ring');
 assert.ok(approach.y>next.arena.top&&approach.y<next.arena.bottom,'approach is inside the new flight corridor bounds');
}
function requestAndDock(c){
 const {q}=c;
 q.click('capital-dock-action');assert.equal(q.inspect().p.dockingClearance,true);
 const {capitalShip,p,capitalBerth,berthWorld,berthVelocity}=q.inspect();
 const xy=berthWorld(capitalShip,0,capitalBerth.approach),v=berthVelocity(0,capitalBerth.approach);
 Object.assign(p,xy,{vx:v.x,vy:v.y,aim:capitalShip.aim,aimTarget:capitalShip.aim});
 q.click('capital-dock-action');
 assert.equal(capitalShip.phase,'docking');q.step(3);
 assert.equal(capitalShip.phase,'docked');
}
test('owned fighter transfer updates only that hull after Galaxy flight, clearance, dock and completed Store',async()=>{
 const c=launch({route:'?transfer=bifrost',homeVessel:'rift-carrier',hulls:['bastion-9']});
 const before=new Map(c.storage);
 departTransfer(c);
 approachOther(c);assert.equal(c.q.inspect().capitalShip.vessel.id,'bifrost');
 assert.equal(c.storage.has(parkingKey),false);
 requestAndDock(c);
 assert.equal(c.storage.has(parkingKey),false,'permission and exterior docking do not save a transfer');
 c.q.click('capital-store-action',{isTrusted:false});c.q.step(2);
 assert.equal(c.storage.has(parkingKey),false);
 c.q.click('capital-store-action');assert.equal(c.storage.has(parkingKey),false,'commit is after actual storage completes');
 c.q.step(3);
 assert.equal(c.q.inspect().capitalShip.phase,'storing');
 await flushParking();c.q.step(3);
 assert.equal(c.q.inspect().capitalShip.phase,'stored');
 assert.deepEqual(JSON.parse(c.storage.get(parkingKey)),{version:1,hull:'rift-fighter',generation,vessel:'bifrost',bay:4,revision:1});
 assert.deepEqual([...c.storage].filter(([key])=>key!==parkingKey),[...before]);
 const dest=launch({route:'?hangar=carrier&vessel=bifrost',homeVessel:'rift-carrier',existingStorage:c.storage,hulls:['bastion-9']});
 assert.equal(dest.e['player-hangar-view'].hidden,false);
 assert.equal(dest.e['player-hangar-view'].dataset.bay,'04');
 assert.equal(dest.e['hangar-bay-heading'].textContent,'PERSONAL FIGHTER BAY · 04');
 assert.equal(dest.e['hangar-repaired-bay-label'].textContent,'HANGAR DECK · BAY 04');
 dest.board();assert.equal(dest.e['cockpit-launch'].disabled,false);
 const origin=launch({route:'?hangar=carrier&vessel=rift-carrier',homeVessel:'rift-carrier',existingStorage:c.storage,hulls:['bastion-9']});
 assert.equal(origin.e['player-hangar-view'].hidden,true);
 assert.match(origin.e['guest-hangar-local'].textContent,/Bastion-2/);
 origin.q.click('guest-hangar-local');assert.equal(origin.e['player-hangar-view'].hidden,false);
 assert.equal(origin.e['hangar-ship-name'].textContent,'Bastion-2 Fleet Fighter');
 assert.match(origin.storage.get(parkingKey),/bifrost/);
});
test('a cancelled airborne transfer, a guest visit, Capital Test and a loaner never write fighter parking',()=>{
 const c=launch({route:'?transfer=bifrost',homeVessel:'rift-carrier',loadFighters:true});departTransfer(c);
 c.q.click('fighter-transit-abort');
 assert.equal(c.storage.has(parkingKey),false);
 const guest=launch({route:'?hangar=carrier&vessel=bifrost',homeVessel:'rift-carrier',existingStorage:c.storage,loadFighters:true});
 assert.equal(guest.e['player-hangar-view'].hidden,true);assert.equal(c.storage.has(parkingKey),false);
 for(const route of ['?launch=capital-test&departure=carrier','?launch=custom&fighter=bastion-9&vessel=bifrost']){
  const other=launch({route,loadFighters:true,homeVessel:'rift-carrier'});
  other.q.click('capital-dock-action');other.q.step(3);
  assert.equal(other.e['fighter-transit-chart'].getAttribute('src'),null,route);
  assert.equal(other.q.inspect().capitalShip.transfer,null);
  assert.equal(other.storage.has(parkingKey),false);
 }
});

test('a newer parking record cannot be overwritten by a stale dock-and-store maneuver',()=>{
 const c=launch({route:'?transfer=bifrost',homeVessel:'rift-carrier',loadFighters:true});
 departTransfer(c);approachOther(c);requestAndDock(c);
 const other=JSON.stringify({version:1,hull:'rift-fighter',generation,vessel:'bifrost'});
 c.storage.set(parkingKey,other);
 c.q.click('capital-store-action');c.q.step(3);
 assert.equal(c.storage.get(parkingKey),other);
 assert.equal(c.q.inspect().capitalShip.phase,'docked');
 assert.match(c.e['capital-dock-status'].textContent,/Could not save berth/);
});

test('Galaxy transfer links derive departure from the parked hull and ignore same-carrier, unfit or malformed plans',()=>{
 const original=launch({route:'?hangar=carrier',homeVessel:'rift-carrier',loadFighters:true});
 original.storage.set(parkingKey,JSON.stringify({version:1,hull:'rift-fighter',generation,vessel:'bifrost'}));
 const opts={homeVessel:'rift-carrier',loadFighters:true,existingStorage:original.storage};
 const reverse=launch({...opts,route:'?transfer=rift-carrier'});
 assert.equal(reverse.q.inspect().capitalShip.vessel.id,'bifrost');
 departTransfer(reverse);
 assert.match(reverse.e['fighter-transit-chart'].getAttribute('src'),/from=bifrost&to=rift-carrier/);
 const same=launch({...opts,route:'?transfer=bifrost'});
 assert.equal(same.q.inspect().state,'menu');
 assert.equal(same.e['player-hangar-view'].hidden,false);
 const damaged=launch({route:'?transfer=bifrost',leg:'damaged',homeVessel:'rift-carrier'});
 assert.equal(damaged.q.inspect().capitalShip,null);
 const invalid=launch({route:'?transfer=bifrost&from=bifrost',homeVessel:'rift-carrier'});
 assert.equal(invalid.q.inspect().capitalShip,null);
 assert.notEqual(invalid.e.hangar.open,true);
});

function getAirborne(c){
 c.board();c.q.click('cockpit-launch');
 assert.equal(c.e['capital-flight-map'].hidden,true);
 c.q.click('capital-dock-action');c.q.step(4);
 assert.equal(c.q.inspect().capitalShip.phase,'flight');
}
test('airborne Galaxy Map freezes the original flight while browsing and closes to the same moving fighter',()=>{
 const c=launch({route:'?hangar=carrier&vessel=rift-carrier',homeVessel:'rift-carrier'});
 getAirborne(c);assert.equal(c.e['capital-flight-map'].hidden,false);
 const {p,capitalShip}=c.q.inspect();
 Object.assign(p,{vx:44,vy:28,hp:16,he3:6});
 const read=()=>[p.x,p.y,p.vx,p.vy,p.hp,p.he3,capitalShip.distance];
 const before=read(),storage=[...c.storage];
 c.q.click('capital-flight-map',{isTrusted:false});
 assert.equal(c.e['fighter-transit-chart'].getAttribute('src'),null);
 c.q.click('capital-flight-map');
 assert.equal(c.e['fighter-transit-chart'].getAttribute('src'),'./galaxy-map.html?flight-map=1&from=rift-carrier');
 assert.equal(c.e['fighter-transit-chart'].getAttribute('tabindex'),'0');
 assert.equal(c.e['fighter-transit-abort'].textContent,'Back to flight');
 assert.equal(c.e['arena-screen'].inert,true);
 c.q.key('keydown','KeyP');c.q.blur();c.q.hide(true);c.q.step(120);c.q.hide(false);c.q.step(45);
 assert.deepEqual(read(),before);
 assert.deepEqual([...c.storage],storage);
 assert.equal(c.q.inspect().capitalShip,capitalShip);
 c.q.click('fighter-transit-abort');
 assert.equal(c.e['fighter-transit'].hidden,true);
 assert.equal(c.e['arena-screen'].inert,false);
 assert.equal(c.q.inspect().p,p);
 assert.deepEqual(read(),before);
 assert.deepEqual(c.visits,[]);
 c.q.step(2);assert.notEqual(p.x,before[0]);
});
test('airborne map accepts a valid choice only from its loaded same-origin iframe and arrives ready for normal docking',async()=>{
 for(const [origin,target] of [['rift-carrier','bifrost'],['bifrost','rift-carrier']]){
  const c=launch({route:'?hangar=carrier&vessel='+origin,homeVessel:origin});
  getAirborne(c);
  const source=c.e['fighter-transit-chart'].contentWindow={postMessage(){}};
  const data={type:'rift-fighter-transfer-select',from:origin,to:target};
  const send=(extra={})=>c.q.outside('message',{source,origin:'https://rift.example',data,...extra});
  c.q.click('capital-flight-map');send();
  assert.equal(c.e['fighter-transit'].dataset.chart,'picker','unloaded frame cannot select target');
  c.e['fighter-transit-chart'].handlers.load();
  send({origin:'https://wrong.example'});send({source:{}});send({data:{...data,to:origin}});send({data:{...data,from:target}});
  assert.equal(c.e['fighter-transit'].dataset.chart,'picker');
  const initial=c.q.inspect().p;
  send();assert.equal(c.e['fighter-transit'].dataset.chart,'transit');
  assert.equal(c.e['fighter-transit-chart'].getAttribute('src'),'./galaxy-map.html?transit=1&from='+origin+'&to='+target);
  assert.equal(c.e['fighter-transit-chart'].getAttribute('tabindex'),'-1');
  c.e['fighter-transit-chart'].handlers.load();c.q.step(220);
  assert.equal(c.q.inspect().capitalShip.vessel.id,target==='bifrost'?'bifrost':'pegasus');
  assert.equal(c.q.inspect().p,initial);
  assert.equal(c.q.inspect().p.dockingClearance,false);
  assert.match(c.e['capital-dock-status'].textContent,/Battle Fleet Map.*Request docking clearance/);
  assert.equal(c.storage.has(parkingKey),false);
  requestAndDock(c);c.q.click('capital-store-action');c.q.step(3);await flushParking();c.q.step(3);
  assert.equal(JSON.parse(c.storage.get(parkingKey)).vessel,target);
 }
});

test('an unavailable server never shows arrival as stored or changes the last confirmed berth',async()=>{
 let respond;
 const c=launch({route:'?transfer=bifrost',homeVessel:'rift-carrier',loadFighters:true,
  parkingSave:()=>new Promise(resolve=>{respond=resolve;})});
 departTransfer(c);approachOther(c);requestAndDock(c);
 c.q.click('capital-store-action');c.q.step(3);await flushParking();
 assert.equal(c.q.inspect().capitalShip.phase,'storing');
 assert.equal(c.e['capital-hangar'].hidden,true);
 assert.match(c.e['capital-dock-status'].textContent,/Saving fighter berth to server/);
 respond({status:'unavailable',parking:null});
 await flushParking();c.q.step(3);
 assert.equal(c.q.inspect().capitalShip.phase,'docked');
 assert.equal(c.e['capital-hangar'].hidden,true);
 assert.match(c.e['capital-dock-status'].textContent,/Could not save berth/);
 assert.equal(c.storage.has(parkingKey),false);
 assert.deepEqual(c.parkingWrites.map(({id,vessel})=>[id,vessel]),[['rift-fighter','bifrost']]);
});
test('owned Free Flight landing at home receives a cloud-assigned bay, but the initial unflown Store does not',async()=>{
 const c=launch({route:'?hangar=carrier&vessel=rift-carrier',homeVessel:'rift-carrier',loadFighters:true});
 c.board();c.q.click('cockpit-launch');
 c.q.click('capital-store-action');c.q.step(5);await flushParking();
 assert.equal(c.q.inspect().capitalShip.phase,'stored');
 assert.equal(c.parkingWrites.length,0);
 c.q.click('capital-dock-action');c.q.step(6);
 assert.equal(c.q.inspect().capitalShip.phase,'flight');
 requestAndDock(c);c.q.click('capital-store-action');c.q.step(3);await flushParking();c.q.step(3);
 assert.equal(c.q.inspect().capitalShip.phase,'stored');
 assert.deepEqual(c.parkingWrites.map(({id,vessel})=>[id,vessel]),[['rift-fighter','rift-carrier']]);
 assert.equal(JSON.parse(c.storage.get(parkingKey)).bay,4);
});
test('an owned direct entry waits for cloud hydration before deciding which carrier holds its fighter',async()=>{
 let hydrate;
 const c=launch({route:'?hangar=carrier&vessel=bifrost',homeVessel:'rift-carrier',loadFighters:true,
  cloudHydrate:(id,options,db)=>new Promise(resolve=>{
   assert.equal(id,'rift-fighter');assert.equal(options.migrate,true);
   hydrate=()=>{
    db.set(parkingKey,JSON.stringify({version:1,hull:id,generation,vessel:'bifrost',bay:6,revision:3}));
    resolve({status:'ok',parking:{vessel:'bifrost',bay:6,revision:3}});
   };
  })});
 assert.equal(c.e.hangar.open,false);
 await flushParking();
 hydrate();await flushParking();
 assert.equal(c.e.hangar.open,true);
 assert.equal(c.e['player-hangar-view'].hidden,false);
 assert.equal(c.e['player-hangar-view'].dataset.bay,'06');
 assert.equal(c.e['hangar-bay-heading'].textContent,'PERSONAL FIGHTER BAY · 06');
 assert.equal(JSON.parse(c.storage.get('rift-runner.pilot-profile.v1')).companyVesselId,'rift-carrier');
});

function crossTileCockpit({carrier='rift-carrier',initial,wallNow,traceClashPaint,localResolute}){
 let sample=initial;
 const c=launch({route:'?hangar=carrier&vessel='+carrier,homeVessel:carrier,fleetApproach:true,wallNow,traceClashPaint,localResolute,
  galaxyWatch:()=>({sample:()=>sample,close(){}})});
 c.board();assert.ok(c.modeIds().includes('corsair-cross-tile'));
 c.choose('corsair-cross-tile');c.q.click('cockpit-launch');
 assert.equal(c.q.inspect().capitalShip.phase,'docked');
 return {...c,setSample(value){sample=value;}};
}
test('cross-tile objective freezes actual chart position at manual launch and crosses only the marked boundary',()=>{
 let now=100000;
 const samples=[
  {carrier:'rift-carrier',first:{sector:'reach',x:195,y:1160,phase:'cruising'},exit:'east',entry:'west',heading:0,xSign:1,go:'KeyD'},
  {carrier:'rift-carrier',first:{sector:'reach',x:510,y:1160,phase:'cruising'},exit:'west',entry:'east',heading:Math.PI,xSign:-1,go:'KeyA'},
  {carrier:'bifrost',first:{sector:'reach',x:366,y:1620,phase:'holding'},exit:'north',entry:'south',heading:-Math.PI/2,xSign:0,go:'KeyW'}
 ];
 for(const {carrier,first,exit,entry,heading,xSign,go} of samples){
  const c=crossTileCockpit({carrier,initial:{phase:'connecting'},wallNow:()=>now}),{q}=c;
  const before=[...c.storage];
  assert.equal(q.el['capital-dock-action'].disabled,true);
  assert.match(q.el['capital-dock-status'].textContent,/Waiting for a valid Galaxy position/);
  q.click('capital-dock-action');assert.equal(q.inspect().capitalShip.phase,'docked');
  c.setSample(first);q.step(2);
  assert.equal(q.el['capital-dock-action'].disabled,false);
  q.click('capital-dock-action');q.step(3);
  assert.equal(q.inspect().capitalShip.phase,'flight');
  assert.equal(q.inspect().pendingCarrierSortie.approach.exitEdge,exit);
  assert.match(q.el['capital-dock-status'].textContent,new RegExp('Fly '+exit));
  c.setSample({phase:'cruising',sector:'frontier',x:1240,y:400});
  const {p,arena}=q.inspect();
  if(xSign)Object.assign(p,{x:xSign>0?arena.left+32:arena.right-32,y:arena.bottom-600,vx:-xSign*130,vy:0,he3:10});
  else Object.assign(p,{x:180,y:arena.bottom-32,vx:0,vy:130,he3:10});
  const wrong=xSign?(xSign>0?'KeyA':'KeyD'):'KeyS';
  q.key('keydown',wrong);q.step(4);q.key('keyup',wrong);
  assert.equal(q.inspect().flightMode.id,'carrier-departure');
  assert.equal(q.inspect().pendingCarrierSortie.approach.entryEdge,entry,'strategic movement after launch did not move the gate');
  Object.assign(p,{x:xSign?(xSign>0?arena.right-32:arena.left+32):180,
   y:xSign?arena.bottom-600:arena.top+32,vx:xSign*130,vy:xSign?0:-130,hp:15,he3:12});
  q.key('keydown',go);
  for(let n=0;n<12&&q.inspect().capitalShip;n++)q.step();
  q.key('keyup',go);
  const actual=q.inspect();
  assert.equal(actual.flightMode.id,'corsair-cross-tile');
  assert.equal(actual.vanduls.length,0,'Corsair no longer spawns alien-looking opponents');
  assert.equal(q.el['vandul-countdown'].hidden,true);assert.equal(q.el['vandul-countdown'].textContent,'');
  assert.equal(actual.pirateCapitals.length,3);
  assert.ok(actual.pirateCapitals.every(ship=>ship.hp===30&&ship.turret.weapon.damage===4));
  assert.equal(new Set(actual.pirateCapitals.map(ship=>ship.turret)).size,3);
  assert.ok(actual.pirateCapitals.every(ship=>ship.he3===40&&ship.loadout.generator.rate===4));
  assert.ok(actual.arena.bottom-actual.arena.top>1850);assert.equal(actual.arena.right-actual.arena.left,1296);
  assert.equal(actual.flightMode.loaner,undefined);
  assert.equal(actual.flightMode.hull,'none');assert.equal(actual.flightMode.credits,false);assert.equal(actual.flightMode.quest,null);
  assert.equal(actual.capitalShip,null);
  if(carrier==='bifrost')assert.equal(actual.flightMode.resolutePlan,null,'Bifrost cannot deploy the Pegasus escort');
  assert.equal(actual.p.aim,heading);assert.equal(actual.p.hp,15);assert.ok(actual.p.he3>11);
  assert.equal(actual.fighterLoadout.engine,fit.engine);
  if(entry==='west')assert.equal(actual.p.x,actual.arena.left+72);
  if(entry==='east')assert.equal(actual.p.x,actual.arena.right-72);
  if(entry==='south')assert.equal(actual.p.y,actual.arena.bottom-72);
  if(entry==='west'){
   const {blackwake,asteroids,sceneryDebris,pirateCapitals}=actual,arm=blackwake.turret;
   for(const list of [asteroids,sceneryDebris])list.splice(0);
   arm.nextShot=0;arm.aim=0;pirateCapitals.forEach(ship=>ship.ram={ready:Infinity});
   const starts=pirateCapitals.map(ship=>({x:ship.x,y:ship.y}));
   q.step(18);
   assert.equal(arm.target,null,'Blackwake will not shoot the other pirate hulls with the player out of range');
   assert.ok(pirateCapitals.every((ship,i)=>Math.hypot(ship.x-starts[i].x,ship.y-starts[i].y)>.01));
   Object.assign(actual.p,{x:arm.x+130,y:arm.y,hp:15,vx:0,vy:0});
   arm.aim=0;arm.nextShot=0;q.step(3);
   assert.equal(arm.target,actual.p);
   assert.equal(q.inspect().vandulLasers.find(b=>b.blackwakeTurret)?.damage,4);
   const slab=blackwake.pieces[2],pilot=actual.p;
   Object.assign(blackwake,{yaw:0,speed:0,kickX:0,kickY:0});
   blackwake.loadout={...blackwake.loadout,engine:{...blackwake.loadout.engine,patrolSpeed:0,turnRate:0}};
   q.step(3);
   blackwake.kickX=69;
   Object.assign(pilot,{x:slab.x+slab.r+pilot.r+8.8,y:slab.y,vx:-165,vy:0});
   q.step();
   assert.ok(blackwake.kickX<69&&pilot.vx>-135,'a real player collision also transfers momentum');
   assert.ok(Math.abs(pilot.impactTumble?.rate)>0,'a moving heavyweight also tumbles the human fighter');
   assert.ok(pilot.hp<15,'the human fighter also takes meaningful collision damage');
   assert.deepEqual([...c.storage],before);
  }

  if(carrier==='bifrost'){
   q.cover(false);
   const {p:pilot,arena:field,pirateCapitals:targets}=q.inspect();
   // Deliberately win on the wrong side. No automatic return until explicitly requested,
   // and the nearby north edge cannot substitute for the original south entrance.
   Object.assign(pilot,{x:420,y:field.top+32,hp:13,vx:0,vy:0});
   for(const [i,ship] of targets.entries()){
    const plate=ship.pieces[1];
    q.inspect().shots.push({x:plate.x-24,y:plate.y,vx:6400,vy:0,a:0,weapon:'blaster',damage:99});
    q.step(2);
    assert.equal(ship.hp,0);
    assert.equal(q.inspect().duelResult,i===2?'victory':null,'only the last freighter ends Corsair');
   }
   assert.match(q.el['fleet-return-status'].textContent,/south/);
   assert.equal(q.inspect().capitalShip,null);
   q.click('fleet-return-action');
   assert.equal(q.inspect().capitalShip,null,'button at the wrong edge starts flight, not traversal');
   q.click('fleet-return-action'); // cancel the route and manually reach the correct side
   Object.assign(pilot,{y:field.bottom-45,vx:0,vy:0,he3:9});
   q.step();
   assert.match(q.el['fleet-return-status'].textContent,/Ready/);
   assert.equal(q.inspect().capitalShip,null,'manual arrival still waits for Return');
   const fuel=pilot.he3;
   q.click('fleet-return-action');
   assert.equal(q.inspect().capitalShip.phase,'flight');
   assert.match(q.inspect().capitalShip.name,/Bifrost/);
   assert.equal(q.inspect().pendingCarrierSortie,null,'the original sortie cannot re-trigger');
   assert.equal(q.inspect().p,pilot);
   assert.equal(pilot.he3,fuel);assert.equal(pilot.hp,13);
   assert.equal(q.inspect().fighterLoadout.engine,fit.engine);
   const repair=q.el['fleet-repair-action'];
   assert.equal(repair.hidden,true);
   q.click('fleet-repair-action');assert.equal(pilot.hp,13,'cannot repair while flying');
   q.click('capital-dock-action');
   const {capitalShip:carrierShip,capitalBerth,berthWorld,berthVelocity}=q.inspect();
   const xy=berthWorld(carrierShip,0,capitalBerth.approach),v=berthVelocity(0,capitalBerth.approach);
   Object.assign(pilot,{x:xy.x,y:xy.y,vx:v.x,vy:v.y});
   q.click('capital-dock-action');
   assert.equal(carrierShip.phase,'docking');
   q.click('fleet-repair-action');assert.equal(pilot.hp,13,'cannot repair during capture');
   q.step(3);
   assert.equal(carrierShip.phase,'docked');
   assert.equal(repair.hidden,false);
   q.click('fleet-repair-action',{isTrusted:false});assert.equal(pilot.hp,13);
   Object.assign(pilot,{he3:7,heat:30});
   q.click('fleet-repair-action');
   assert.equal(pilot.hp,13);
   assert.match(repair.textContent,/30s/);
   q.click('capital-dock-action');q.click('capital-store-action');
   assert.equal(carrierShip.phase,'docked','lift and launch stay locked during repair');
   now+=29999;q.step();
   assert.equal(pilot.hp,13);
   now++;
   const beforeTick={he3:pilot.he3,heat:pilot.heat};
   q.step();
   assert.equal(pilot.hp,pilot.maxHp);
   assert.ok(Math.abs(pilot.he3-beforeTick.he3)<.1);
   assert.ok(Math.abs(pilot.heat-beforeTick.heat)<.5);
   assert.equal(carrierShip.phase,'docked');assert.equal(repair.hidden,true);
   assert.deepEqual([...c.storage],before);
  }
  q.click('return-main-menu');
  assert.deepEqual(c.visits,['./carrier.html?vessel='+carrier]);
  assert.deepEqual([...c.storage],before);
 }
});

const fourOrigins={
 north:{carrier:'Northwatch',entry:'north',exit:'south',key:'KeyS',dx:0,dy:1,heading:Math.PI/2},
 east:{carrier:'Dawnline',entry:'east',exit:'west',key:'KeyA',dx:-1,dy:0,heading:Math.PI},
 south:{carrier:'Meridian',entry:'south',exit:'north',key:'KeyW',dx:0,dy:-1,heading:-Math.PI/2},
 west:{carrier:'Westreach',entry:'west',exit:'east',key:'KeyD',dx:1,dy:0,heading:0},
};
function fourWay(edge,home='rift-carrier'){
 const c=launch({route:'?hangar=carrier&vessel='+home,homeVessel:home,leg:'unclaimed',loadFighters:true});
 const {q}=c,route=fourOrigins[edge];
 const before=[...c.storage];
 q.click('hangar-loaner');
 c.select.value='four-way-'+edge;c.select.handlers.change();
 assert.match(c.plan(),/4-Way Battle/);
 q.click('cockpit-launch');
 let scene=q.inspect();
 assert.equal(scene.capitalShip.name,route.carrier);
 assert.equal(scene.capitalShip.phase,'docked');
 assert.equal(scene.capitalShip.deckCrew.length,0,'only the contestant launches from this test carrier');
 assert.equal(scene.vanduls.length,0);
 q.step(75);assert.equal(scene.capitalShip.phase,'docked');
 q.click('capital-dock-action');q.step(4);
 assert.match(c.e['capital-dock-status'].textContent,new RegExp('Fly '+route.exit));
 scene=q.inspect();
 const {p,arena}=scene;
 Object.assign(p,{x:route.dx>0?arena.right-32:route.dx<0?arena.left+32:180,
  y:route.dy>0?arena.bottom-32:route.dy<0?arena.top+32:arena.bottom-600,
  vx:route.dx*133,vy:route.dy*133,he3:12});
 q.key('keydown',route.key);
 for(let n=0;n<12&&q.inspect().capitalShip;n++)q.step();
 q.key('keyup',route.key);
 return {...c,scene:q.inspect(),route,before};
}
test('Custom Flight 4-Way runs four selectable solo launches into one arena, three color-coded rivals and no allies',()=>{
 for(const edge of Object.keys(fourOrigins)){
  const c=fourWay(edge,edge==='east'?'bifrost':'rift-carrier'),{scene,route,q}=c;
  assert.equal(scene.flightMode.id,'custom-four-way');
  assert.equal(scene.capitalShip,null);
  assert.ok(scene.arena.bottom-scene.arena.top>1850,'central 4-way arena is roomier than the standard solo arena');
  assert.equal(scene.p.aim,route.heading);
  assert.equal(scene.vanduls.length,3);
  assert.equal(scene.blackwake,null,'ordinary four-way practice remains countership-free');
  assert.deepEqual(Array.from(scene.vanduls,ship=>ship.rivalEdge),Object.keys(fourOrigins).filter(other=>other!==edge));
  assert.equal(scene.wingman,null);assert.equal(scene.testLead,null);
  assert.match(c.e['vandul-duel-readout'].textContent,/4\/4 fighters/);
  q.click('return-main-menu');
  assert.deepEqual(c.visits,['./carrier.html?vessel='+(edge==='east'?'bifrost':'rift-carrier')]);
  assert.deepEqual([...c.storage],c.before);
 }
});
test('each AI can target and eliminate a different AI, and the last surviving human can fly back to their own fleet',()=>{
 const c=fourWay('south'),{q}=c;
 q.cover(false);
 let {p,vanduls}=q.inspect();
 const [a,b,d]=vanduls;
 Object.assign(p,{x:815,y:1100,vx:0,vy:0});
 Object.assign(a,{x:300,y:650,aim:0,vx:0,vy:0});
 Object.assign(b,{x:400,y:650,aim:Math.PI,vx:0,vy:0});
 Object.assign(d,{x:520,y:850,aim:Math.PI,vx:0,vy:0});
 q.step(5);
 assert.equal(a.attackTarget,b,'closer visible AI is hostile even with human alive');
 const friendlyHit=(from,to)=>{
  const aim=Math.atan2(to.y-from.y,to.x-from.x),dx=Math.cos(aim),dy=Math.sin(aim);
  q.inspect().vandulLasers.push({x:to.x-32*dx,y:to.y-32*dy,vx:6400*dx,vy:6400*dy,a:aim,kind:'energy',life:1,damage:99,owner:from});
  q.step(1);
 };
 friendlyHit(a,b);assert.equal(b.hp,0);assert.equal(q.inspect().vanduls.length,2);
 friendlyHit(a,d);assert.equal(d.hp,0);assert.equal(q.inspect().vanduls.length,1);
 assert.match(c.e['vandul-duel-readout'].textContent,/2\/4 fighters/);
 assert.equal(q.inspect().state,'play','AI taking a kill does not end the match early');
 q.inspect().shots.push({x:a.x-32,y:a.y,vx:6400,vy:0,a:0,weapon:'blaster',damage:99});
 q.step(2);
 assert.equal(q.inspect().state,'play');
 assert.equal(q.el.overlay.hidden,true);
 assert.equal(q.el['fleet-return-hud'].hidden,false);
 assert.equal(q.el['fleet-return-action'].textContent,'Return to Battle Fleet Map');
 const before=q.inspect().p;
 Object.assign(before,{x:815,y:850,vx:0,vy:0,hp:7});
 q.click('fleet-return-action',{isTrusted:false});q.step(10);
 assert.equal(q.inspect().capitalShip,null);
 assert.match(q.el['fleet-return-status'].textContent,/Victory/);
 q.click('fleet-return-action');q.step(20);
 assert.equal(q.inspect().capitalShip,null,'autopilot flies in the arena before returning');
 assert.ok(before.y>850);
 q.click('fleet-return-action');
 assert.match(q.el['fleet-return-status'].textContent,/Victory/);
 q.click('fleet-return-action');
 for(let i=0;i<650&&!q.inspect().capitalShip;i++)q.step(1);
 const landed=q.inspect();
 assert.equal(landed.capitalShip.phase,'flight');
 assert.equal(landed.capitalShip.name,'Meridian');
 assert.equal(landed.p,before,'fighter stays intact');
 assert.equal(landed.p.hp,7);
 assert.equal(landed.p.dockingClearance,false);
 assert.equal(q.el['capital-dock-action'].textContent,'Request Docking');
 assert.equal(q.el['fleet-return-hud'].hidden,true);
 assert.deepEqual([...c.storage],c.before);
});

test('an active match accepts manual early retreat only from its own entry edge',()=>{
 const c=fourWay('west'),{q}=c;
 const {p,arena,vanduls}=q.inspect();
 assert.equal(vanduls.length,3);
 Object.assign(p,{x:arena.right-30,y:arena.bottom-100,vx:0,vy:0});
 q.step();
 assert.equal(q.el['fleet-return-hud'].hidden,true);
 q.click('fleet-return-action');q.step(20);
 assert.equal(q.inspect().capitalShip,null,'combat cannot start autopilot from the opposite side');
 Object.assign(p,{x:arena.left+48,vx:0,vy:0});
 q.step();
 assert.match(q.el['fleet-return-status'].textContent,/Retreat · west edge/);
 q.click('fleet-return-action',{isTrusted:false});
 assert.equal(q.inspect().capitalShip,null);
 q.click('fleet-return-action');
 assert.equal(q.inspect().capitalShip?.name,'Westreach');
 assert.equal(q.inspect().capitalShip?.phase,'flight');
 assert.equal(q.inspect().vanduls.length,0);
 assert.deepEqual([...c.storage],c.before);
});

test('Galaxy Blackwake launch registers once and reinforces behind Bifrost or intercepts by Pegasus course',async()=>{
 const point={id:'blackwake',status:'active',simulation:'local',sector:'reach',x:365,y:1160,
  pirate:{id:'blackwake',name:'Blackwake'},attacker:{id:'bifrost',name:'Bifrost',x:550,y:1160}};
 for(const role of ['intercept','reinforce']){
  const calls=[];
  const c=launch({route:'?cross-battle=blackwake&join='+role+'&vessel=rift-carrier',fleetApproach:true,returnDockAudio:true,sessionData:new Map(),
   galaxyWatch:id=>({sample:()=>({phase:'cruising',sector:'reach',x:id==='bifrost'?550:175,y:1160}),close(){}}),
   crossBattle:{get:async()=>({encounter:point,participation:null}),join:async(vessel,hull,asked)=>{
    calls.push([vessel,hull,asked]);return {encounter:point,participation:{vessel,hull,role:asked}};
   }}});
  const {q}=c,before=[...c.storage];await flushParking();
  const {capitalShip:pegasus}=q.inspect();
  assert.equal(pegasus.phase,'docked');assert.equal(pegasus.name,'Pegasus');
  if(role==='reinforce'){
   assert.match(pegasus.supportFleet.name,/Bifrost/);
   assert.ok(pegasus.supportFleet.y<pegasus.y-440);
  }else assert.equal(pegasus.supportFleet,undefined);
  assert.deepEqual(calls,[]);
  q.click('capital-dock-action',{isTrusted:false});assert.deepEqual(calls,[]);
  q.click('capital-dock-action');q.click('capital-dock-action');await flushParking();
  assert.deepEqual(calls,[['rift-carrier','rift-fighter',role]]);
  q.step(3);assert.equal(pegasus.phase,'flight');
  q.mockRandom(0);q.click('capital-dock-action');
  assert.equal(q.el['docking-control-voice'].plays,1);
  const {p,arena,pendingCarrierSortie}=q.inspect();
  const reinforce=role==='reinforce';
  assert.equal(pendingCarrierSortie.approach.entryEdge,reinforce?'east':'west');
  assert.equal(pendingCarrierSortie.approach.bifrost.entryEdge,'east');
  const sign=reinforce?-1:1;
  Object.assign(p,{x:sign>0?arena.left+32:arena.right-32,y:arena.bottom-600,vx:-sign*130,vy:0,he3:10});
  const wrong=reinforce?'KeyD':'KeyA';
  q.key('keydown',wrong);q.step(4);q.key('keyup',wrong);
  assert.equal(q.inspect().capitalShip,pegasus);
  Object.assign(p,{x:sign>0?arena.right-32:arena.left+32,y:arena.bottom-600,vx:sign*130,vy:0,he3:10,hp:11});
  const right=reinforce?'KeyA':'KeyD';
  q.key('keydown',right);
  for(let n=0;n<12&&q.inspect().capitalShip;n++)q.step();
  q.key('keyup',right);
  assert.equal(q.inspect().testLead,null,'attacker staging also delays in Join');
  const pilot=q.inspect().p,arrival={x:pilot.x,y:pilot.y,vx:0,vy:0};
  assert.equal(pilot.hp,11,'ingress preserves the incoming hull');
  Object.assign(pilot,arrival);q.step(125);assert.equal(q.inspect().testLead,null);
  q.step(15);
  Object.assign(pilot,arrival);
  const scene=q.inspect();
  assert.equal(scene.capitalShip,null);
  assert.equal(scene.flightMode.id,'blackwake-cross-battle');
  assert.equal(scene.flightMode.tileApproach.entryEdge,reinforce?'east':'west');
  assert.equal(scene.flightMode.resolutePlan,null,'normal Blackwake play does not deploy Resolute');
  assert.equal(scene.vanduls.length,0);
  assert.equal(scene.pirateCapitals.length,3);
  assert.equal(scene.blackwake.hp,84);
  assert.deepEqual(Array.from(scene.pirateCapitals,ship=>ship.maxHp),[84,70,70]);
  assert.ok(scene.testLead.fit.singleOnly&&scene.wingman.fit.singleOnly);
  assert.equal(scene.testLead.entryEdge,'east');
  assert.equal(scene.wingman.entryEdge,'east');
  assert.ok(scene.testLead.x>480);
  assert.equal(scene.p.hp,11);
  assert.equal(scene.fighterLoadout.engine,fit.engine);
  assert.match(q.el['vandul-duel-readout'].textContent,/Local combat/);
  q.step();
  assert.ok(scene.testLead.x>480,'Bifrost fighters preserve their independent travel after ingress');
  if(role==='reinforce'){
   const at={x:scene.p.x,y:scene.p.y,vx:scene.p.vx,vy:scene.p.vy};
   const arm=scene.blackwake.turret;
   for(const list of [scene.asteroids,scene.sceneryDebris])list.splice(0);
   arm.aim=0;arm.nextShot=0;
   Object.assign(scene.p,{x:arm.x+105,y:arm.y,vx:0,vy:0});
   q.step(3);
   assert.equal(arm.target,scene.p,'in Join the real fighter is a lawful target');
   assert.ok(q.inspect().vandulLasers.some(bolt=>bolt.blackwakeTurret));
   const hp=scene.blackwake.hp;
   arm.nextShot=Infinity;arm.followAt=null;q.inspect().vandulLasers.splice(0);
   scene.p.aim=Math.PI;
   q.pointer('pointerdown',16,'aim-pad',16,360);
   q.pointer('pointerup',16,'aim-pad');
   q.click('fire-button');q.step(10);
   assert.ok(scene.blackwake.hp<hp,'a manually aimed touch shot can damage the pirate ship');
   Object.assign(scene.p,at);
   q.step();
  }
  q.click('fleet-return-action');
  const returned=q.inspect();
  assert.equal(returned.capitalShip,pegasus);assert.equal(pegasus.phase,'flight');assert.equal(returned.p.hp,11);
  assert.equal(returned.arena.right-returned.arena.left,936,'carrier fleet map returns to its ordinary width');
  assert.equal(returned.vanduls.length,0);assert.equal(returned.wingman,null);assert.equal(returned.blackwake,null);
  q.mockRandom(0);q.click('capital-dock-action');
  assert.equal(q.el['docking-return-voice'].plays,1,'normal landing request uses remembered Vale greeting after Blackwake');
  assert.deepEqual([...c.storage],before);
 }
});
test('failed Blackwake registration and stale route cannot launch a local battle',async()=>{
 const point={id:'blackwake',status:'active',simulation:'local',sector:'reach',x:365,y:1160,attacker:{id:'bifrost',x:550,y:1160}};
 const c=launch({route:'?cross-battle=blackwake&join=reinforce&vessel=rift-carrier',fleetApproach:true,
  galaxyWatch:()=>({sample:()=>({phase:'cruising',sector:'reach',x:550,y:1160}),close(){}}),
  crossBattle:{get:async()=>({encounter:point}),join:async()=>null}});
 await flushParking();c.q.click('capital-dock-action');await flushParking();c.q.step(8);
 assert.equal(c.q.inspect().capitalShip.phase,'docked');
 assert.match(c.e['capital-dock-status'].textContent,/Store Inside Pegasus/);
});

test('Blackwake Watch uses only GET and moves AI without a player launch, owned hull or write',async()=>{
 let gets=0,joins=0,hydrates=0;
 const e={id:'blackwake',status:'active',simulation:'local',sector:'reach',x:365,y:1160,attacker:{id:'bifrost',x:550,y:1160},startsAt:1000,endsAt:2000};
 const c=launch({route:'?cross-battle=blackwake&watch=1',leg:'unclaimed',fleetApproach:true,loadFighters:true,
  cloudHydrate:async()=>{hydrates++;throw Error('spectator must not hydrate parking');},
  crossBattle:{get:async()=>{gets++;return {encounter:e};},join(){joins++;throw Error('spectator must not join');}}});
 const {q}=c,before=[...c.storage];await flushParking();
 assert.deepEqual([gets,joins,hydrates],[1,0,0]);
 assert.match(c.e['cross-watch-status'].textContent,/Bifrost inbound/);
 assert.equal(q.inspect().testLead,null);q.step(140);
 const frame=q.inspect();
 assert.equal(frame.state,'watch');
 assert.equal(frame.capitalShip,null);assert.equal(frame.flightMode.id,'blackwake-watch');
 assert.equal(frame.p.hp,0,'render anchor is not a player craft');
 assert.equal(frame.vanduls.length,0);assert.equal(frame.pirateCapitals.length,3);assert.equal(frame.testLead.entryEdge,'east');
 assert.ok(frame.testLead.fit.weapons.includes('blaster'),'Bifrost keeps an armed fit with no pilot ship');
 assert.equal(c.e['cross-watch-hud'].hidden,false);
 assert.equal(q.el['vandul-countdown'].hidden,true);assert.equal(q.el['vandul-countdown'].textContent,'');
 assert.match(c.e['cross-watch-status'].textContent,/Bifrost 2 · Pirates 3\/3/);
 const anchor=[frame.p.x,frame.p.y],prev=frame.testLead.x;
 q.key('keydown','KeyW');q.click('fire-button');q.click('open-hangar');q.step(20);
 assert.ok(Math.abs(frame.testLead.x-prev)>1,'Bifrost moves independently');
 assert.deepEqual([frame.p.x,frame.p.y],anchor);
 assert.equal(q.el.hangar.open,false);
 let sawFire=false;
 for(let n=0;n<120&&!sawFire;n++){
  q.step(5);sawFire=q.inspect().shots.some(shot=>shot.ally)||q.inspect().vandulLasers.length>0;
 }
 assert.ok(sawFire,'the available local factions actually exchange fire');
 assert.deepEqual([...c.storage],before);
 assert.deepEqual(c.parkingWrites,[]);
 assert.deepEqual([gets,joins,hydrates],[1,0,0]);
 assert.match(read('index.html'),/id="cross-watch-back" href="\.\/galaxy-map\.html"/);
});

test('unavailable Watch offers a way back and never completes an unrelated pilot repair',async()=>{
 const here=new Map([[hullKey,JSON.stringify({version:1,hull:'rift-fighter',condition:'repairing',readyAt:1,durationMs:30000,hullHp:10,maxHullHp:20})]]);
 const old=[...here];
 const c=launch({route:'?cross-battle=blackwake&watch=1',existingStorage:here,fleetApproach:true,wallNow:()=>100000,
  crossBattle:{get:async()=>null,join(){assert.fail('must never join for Watch');}}});
 await flushParking();c.q.pageShow();c.q.step(5);
 assert.equal(c.q.inspect().state,'menu');
 assert.equal(c.e['cross-watch-unavailable'].hidden,false);
 assert.deepEqual([...here],old);
});

test('Watch framing keeps both fleets and Blackwake inside short and tall phone screens as they spread out',async()=>{
 const e={id:'blackwake',status:'active',simulation:'local',sector:'reach',x:365,y:1160,attacker:{id:'bifrost',x:550,y:1160}};
 const types=[[320,432],[390,532],[393,726],[430,812],[690,340]];
 for(const [width,height] of types){
  const c=launch({route:'?cross-battle=blackwake&watch=1',leg:'unclaimed',canvasBox:{width,height},
   fleetApproach:true,crossBattle:{get:async()=>({encounter:e})}});
  await flushParking();
  const {q}=c;q.step(140);const scene=q.inspect();
  assert.equal(q.el['game-cabinet'].dataset.watch,'true');
  const check=()=>{
   const {camera,testLead,wingman,pirateCapitals,vanduls}=q.inspect();
   const bounds=pirateCapitals.flatMap(ship=>{
    const u=Math.abs(Math.cos(ship.yaw)),v=Math.abs(Math.sin(ship.yaw));
    const length=2*58.24,width=length*104.25/282;
    const x=(width*u+length*v)/2,y=(length*u+width*v)/2;
    return [{x:ship.x-x,y:ship.y-y-14},{x:ship.x+x,y:ship.y+y}];
   });
   assert.ok(Math.abs(camera.w/camera.h-width/height)<.01,'matches the canvas ratio');
   for(const mark of [...bounds,...vanduls,testLead,wingman]){
    assert.ok(mark.x>=camera.x+8&&mark.x<=camera.x+camera.w-8,'both sides leave horizontal margins');
    assert.ok(mark.y>=camera.y+8&&mark.y<=camera.y+camera.h-8,'both sides leave vertical margins');
   }
  };
  check();
  Object.assign(scene.testLead,{x:scene.arena.left+24,y:scene.arena.top+24});
  Object.assign(scene.wingman,{x:scene.arena.right-24,y:scene.arena.bottom-24});
  check();
 }
 const css=read('style.css');
 assert.match(css,/#arena-screen\[data-watch\] :is\(\.arena-toolbar,\.flight-action-strip,\.flight-deck\)\{display:none\}/);
 assert.match(css,/\.cabinet\[data-watch\]\[data-view=arena\]\{[^}]*height:100dvh[^}]*overflow:hidden[^}]*safe-area-inset-bottom/);
});

test('Blackwake fits one hostile gimbal, observes range and cover, and has no escorts',async()=>{
 const e={id:'blackwake',status:'active',simulation:'local',sector:'reach',x:365,y:1160,attacker:{id:'bifrost',x:550,y:1160}};
 const c=launch({route:'?cross-battle=blackwake&watch=1',leg:'unclaimed',fleetApproach:true,
  crossBattle:{get:async()=>({encounter:e})}});
 const {q}=c,before=[...c.storage];await flushParking();q.step(140);
 const {blackwake,p,testLead,wingman,vanduls,asteroids,sceneryDebris,pirateCapitals}=q.inspect(),arm=blackwake.turret;
 for(const ship of pirateCapitals.slice(1))ship.turret.nextShot=Infinity;
 Object.assign(arm,{shots:0,followAt:null,burstRemaining:0});blackwake.he3=blackwake.he3Capacity;q.inspect().vandulLasers.splice(0);
 assert.equal(arm.weapon.size,3);assert.equal(arm.weapon.damage,4);assert.equal(arm.weapon.cooldown,4);
 assert.equal(arm.weapon.width,36*.65);assert.equal(arm.weapon.height,49.3*.65);assert.equal(arm.weapon.muzzle,29.5*.65);assert.equal(arm.weapon.range,430);assert.equal(arm.weapon.burstGap,.34);assert.equal(arm.weapon.burstShots,3);
 assert.deepEqual(Object.keys(blackwake.loadout),['generator','storage','engine']);assert.equal(blackwake.he3,40);assert.equal(blackwake.loadout.generator.rate,4);assert.equal(blackwake.loadout.storage.length,2);
 assert.equal(blackwake.loadout.engine.id,'hammerdrive-v1');assert.equal(blackwake.loadout.engine.patrolSpeed,22);assert.equal(blackwake.loadout.engine.turnRate,.775);assert.equal(arm.weapon.turn,2);
 const dx=arm.x-blackwake.x,dy=arm.y-blackwake.y,co=Math.cos(blackwake.yaw),si=Math.sin(blackwake.yaw);
 const length=58.24*2,width=length*104.25/282;
 assert.ok(Math.abs(dx*co+dy*si-(279/556-.5)*width)<1e-8);
 assert.ok(Math.abs(dy*co-dx*si-(383/1504-.5)*length)<1e-8,'turret stays on the rotated deck socket');
 assert.ok(Math.max(...blackwake.pieces.map(piece=>Math.abs(piece.dy)+piece.r))<=length/2+1,'the collision profile shrinks with the hull art');
 const [rock]=asteroids;
 asteroids.splice(0);sceneryDebris.splice(0);
 assert.equal(vanduls.length,0);
 Object.assign(testLead,{x:arm.x+490,y:arm.y,vx:0,vy:0,fireWait:Infinity});
 Object.assign(wingman,{x:arm.x+520,y:arm.y,vx:0,vy:0,fireWait:Infinity});
 arm.nextShot=0;arm.aim=0;
 q.step(4);
 assert.equal(arm.target,null,'out of range fighters and the camera cannot be targeted');
 assert.equal(arm.shots,0);
 Object.assign(testLead,{x:arm.x+120,y:arm.y,vx:0,vy:0});
 Object.assign(rock,{x:arm.x+65,y:arm.y,r:26,vx:0,vy:0});
 asteroids.push(rock);q.step(3);assert.equal(arm.shots,0,'cover prevents firing');
 asteroids.splice(0);
 const ahp=testLead.hp;
 q.step(12);
 assert.equal(arm.target,testLead);
 assert.equal(arm.shots,1);
 const first=q.inspect().vandulLasers.find(b=>b.blackwakeTurret&&b.owner===arm);
 assert.ok(first);assert.equal(first.damage,4);assert.ok(blackwake.he3>=38&&blackwake.he3<39);
 const fired=[first];
 for(let i=0;i<100&&fired.length<3;i++){
  q.step();
  for(const bolt of q.inspect().vandulLasers)if(bolt.blackwakeTurret&&bolt.owner===arm&&!fired.includes(bolt))fired.push(bolt);
 }
 assert.equal(fired.length,3);
 for(let i=1;i<3;i++){
  assert.equal(fired[i].damage,4);
  assert.ok(fired[i].firedAt-fired[i-1].firedAt>=.34&&fired[i].firedAt-fired[i-1].firedAt<.40);
 }
 assert.deepEqual(fired.map(bolt=>Math.round((bolt.a-bolt.aim)*180/Math.PI)),[-8,10,-11]);
 assert.ok(blackwake.he3>=36&&blackwake.he3<38);
 // Let one known 4-damage bolt meet the real moving hull; a free boosted
 // fighter can legitimately dodge the whole burst now.
 const last=fired[2];
 Object.assign(testLead,{x:last.x+last.vx*.06,y:last.y+last.vy*.06,vx:0,vy:0});
 q.step(30);
 assert.equal(arm.shots,3,'no fourth shot until the next burst interval');
 assert.ok(testLead.hp<=ahp-4&&testLead.hp>=ahp-12);
 assert.equal(p.hp,0);assert.deepEqual([...c.storage],before);
});

test('Blackwake defenders share long-range contact and two clear turrets fire overlapping bursts',async()=>{
 const encounter={id:'blackwake',status:'active',simulation:'local',sector:'reach',x:365,y:1160,attacker:{id:'bifrost',x:550,y:1160}};
 const c=launch({route:'?cross-battle=blackwake&watch=1',leg:'unclaimed',fleetApproach:true,
  crossBattle:{get:async()=>({encounter})}});
 await flushParking();
 const {q}=c;q.step(140);
 const {testLead,wingman,pirateCapitals,asteroids,sceneryDebris}=q.inspect();
 asteroids.splice(0);sceneryDebris.splice(0);
 wingman.hp=0;
 Object.assign(testLead,{x:805,y:640,vx:0,vy:0,fireWait:Infinity});
 const [lead,near,far]=pirateCapitals;q.inspect().vandulLasers.splice(0);
 for(const [ship,x,y] of [[lead,302,620],[near,90,850],[far,170,1040]]){
  Object.assign(ship,{anchor:{x,y},x,y,patrol:0,patrolPhase:0,patrolLane:null,yaw:0,speed:0});
  Object.assign(ship.turret,{aim:Math.PI,nextShot:0,shots:0,followAt:null,burstRemaining:0});
 }
 q.step(8);
 assert.ok(Math.hypot(near.x-testLead.x,near.y-testLead.y)>620,'second ship is beyond its own sensor');
 for(const ship of pirateCapitals){
  assert.ok(Math.abs(ship.turret.aim-Math.PI)>.15,'a shared detected contact pre-aligns every turret');
  assert.equal(ship.turret.target,null,'weapons still cannot fire past the weapon range');
  assert.equal(ship.turret.shots,0);
 }
 Object.assign(testLead,{x:520,y:725,vx:0,vy:0});
 for(const [ship,x,y] of [[lead,340,620],[near,340,802],[far,100,1030]]){
  Object.assign(ship,{anchor:{x,y},x,y,patrol:0,patrolPhase:0,patrolLane:null,yaw:0,speed:0});
  Object.assign(ship.turret,{aim:Math.atan2(testLead.y-y+29,testLead.x-x),nextShot:0});
 }
 q.step(20);
 const [a,b]=[lead.turret,near.turret];
 assert.equal(a.target,testLead);assert.equal(b.target,testLead);
 assert.ok(a.followAt!==null&&b.followAt!==null,'both ships have active bursts in the same window');
 const owners=q.inspect().vandulLasers.filter(bolt=>bolt.blackwakeTurret).map(bolt=>bolt.owner);
 assert.ok(owners.includes(a)&&owners.includes(b),'both actual projectile streams are present');
 assert.equal(far.turret.shots,0);
});

test('Watch naturally trades fire and moves the freighter and deck mount from every approach',async()=>{
 for(const [x,y] of [[550,1160],[170,1160],[365,850],[365,1500]])for(const fieldSeed of [4,329]){
  const encounter={id:'blackwake',status:'active',simulation:'local',sector:'reach',x:365,y:1160,attacker:{id:'bifrost',x,y}};
  const c=launch({route:'?cross-battle=blackwake&watch=1',leg:'unclaimed',fieldSeed,fleetApproach:true,
   crossBattle:{get:async()=>({encounter})}});
  await flushParking();
  const {blackwake:ship,arena,pirateCapitals}=c.q.inspect(),pivot=[ship.turret.x,ship.turret.y],left=[ship.x,ship.y];
  const opening=pirateCapitals.map(ship=>({x:ship.x,y:ship.y}));
  assert.equal(arena.right-arena.left,1296);assert.equal(arena.bottom-arena.top,1906);
  assert.ok(opening.every(ship=>ship.x<480&&ship.y<arena.top+(arena.bottom-arena.top)/2),'all pirate patrols start in the northwest regardless of approach');
  const rocks=c.q.inspect().asteroids.filter(r=>r.y<arena.top+286);
  assert.equal(rocks.length,3);
  for(const [i,rock] of rocks.entries()){
   assert.ok(rock.asteroid&&rock.y-rock.r>=arena.top+64);
   assert.ok(Math.abs(rock.x-480)>rock.r+90,'north approach and return stay open');
   assert.ok(opening.every(ship=>Math.hypot(ship.x-rock.x,ship.y-rock.y)>rock.r+145),'opening patrols have clear space');
   assert.ok(rocks.slice(0,i).every(other=>Math.hypot(other.x-rock.x,other.y-rock.y)>=rock.r+other.r+46),'open flight gaps between rocks');
  }
  assert.equal(c.q.inspect().testLead,null);c.q.step(125);
  assert.equal(c.q.inspect().testLead,null,'Bifrost genuinely delays coming in');
  assert.equal(c.q.inspect().duelResult,null);
  assert.ok(pirateCapitals.every((ship,i)=>Math.hypot(ship.x-opening[i].x,ship.y-opening[i].y)>24),'every defender is already cruising before the attacker arrives');
  assert.ok(pirateCapitals.every(ship=>ship.turret.shots===0),'no shots before arrival');
  c.q.step(15);
  const {testLead,wingman}=c.q.inspect();
  for(const fighter of [testLead,wingman]){
   const distance={east:arena.right-fighter.x,west:fighter.x-arena.left,north:fighter.y-arena.top,south:arena.bottom-fighter.y}[fighter.entryEdge];
   assert.ok(distance>=72&&distance<=102,'both Bifrost fighters start near the resolved arena edge');
  }
  for(const vessel of pirateCapitals){
   assert.ok(vessel.x>=arena.left+100&&vessel.x<=arena.right-100);
   assert.ok(vessel.y>=arena.top+140&&vessel.y<=arena.bottom-140);
   for(const fighter of [testLead,wingman])assert.ok(Math.hypot(vessel.x-fighter.x,vessel.y-fighter.y)>300);
  }
  const traded=()=>pirateCapitals.some(h=>h.turret.shots>0)&&pirateCapitals.some(h=>h.hp<h.maxHp);
  for(let i=0;i<1500&&!c.q.inspect().duelResult&&!traded();i++)c.q.step();
  assert.ok(Math.hypot(ship.x-left[0],ship.y-left[1])>4);
  assert.ok(Math.hypot(ship.turret.x-pivot[0],ship.turret.y-pivot[1])>4);
  assert.ok(traded(),'the groups trade actual shots without manual positioning for '+x+','+y+' seed '+fieldSeed);
  assert.equal(c.q.inspect().vanduls.length,0);
 }
});

test('Watch fighters sustain combat without burst and stay clear of moving hulls',async()=>{
 const encounter={id:'blackwake',status:'active',simulation:'local',sector:'reach',x:365,y:1160,attacker:{id:'bifrost',x:550,y:1160}};
 const c=launch({route:'?cross-battle=blackwake&watch=1',leg:'unclaimed',fieldSeed:329,fleetApproach:true,
  crossBattle:{get:async()=>({encounter})}});
 await flushParking();
 const {q}=c,before=[...c.storage];q.step(140);const fight=q.inspect();
 const clear=()=>{
  for(const ally of [fight.testLead,fight.wingman])if(ally.hp>0)for(const ship of fight.pirateCapitals)for(const part of ship.pieces){
   assert.ok(Math.hypot(part.x-ally.x,part.y-ally.y)>=part.r+ally.r+9,'living fighters remain visibly outside the hull');
  }
 };
 let tick=0,firstDisable,firstDamage,firstFire=new Map(),seenShots=new Set(),lastShots=new Map();
 for(;tick<4900&&!q.inspect().duelResult;tick++){
  q.step();
  if(tick%4===0)clear();
  if(firstDisable===undefined&&fight.pirateCapitals.some(ship=>ship.hp===0))firstDisable=tick;
  if(firstDamage===undefined&&fight.pirateCapitals.some(ship=>ship.hp<ship.maxHp))firstDamage=tick;
  for(const ship of fight.pirateCapitals)if(ship.turret.shots&&!firstFire.has(ship))firstFire.set(ship,tick);
  for(const bolt of q.inspect().shots)if(bolt.ally&&!seenShots.has(bolt)){
   assert.equal(bolt.allyMode,'normal');
   seenShots.add(bolt);
   if(lastShots.has(bolt.allyRole))assert.ok(tick-lastShots.get(bolt.allyRole)>=30,'one shot per firing cycle, no volley or ballistic double-tap');
   lastShots.set(bolt.allyRole,tick);
  }
 }
 assert.ok(tick*.016>6&&tick*.016<78,'the real preview lasts a sustained fight and comes to a result');
 assert.ok(firstDamage!==undefined&&tick>firstDamage+125,'the first ship survives more than two seconds of actual combat');
 if(firstDisable!==undefined){
  assert.ok(tick>firstDisable+60,'the first disabled ship does not end the battle');
  assert.ok((firstDisable-firstDamage)*.016>2,'the first ship survives more than two seconds of hits');
 }
 assert.ok([...firstFire.values()].filter(time=>time<(firstDisable??tick)).length>=2,'multiple defenders fire during natural evasive combat');
 assert.ok(seenShots.size>=6,'multiple real single shots are traded during moving passes');
 assert.ok(['victory','lost'].includes(q.inspect().duelResult));
 assert.match(c.e['cross-watch-status'].textContent,/Battle complete/);
 assert.deepEqual([...c.storage],before);
});

test('Blackwake Watch drives forward through loose cargo, allies push it too, and solid rocks are bypassed',async()=>{
 const encounter={id:'blackwake',status:'active',simulation:'local',sector:'reach',x:365,y:1160,attacker:{id:'bifrost',x:550,y:1160}};
 const c=launch({route:'?cross-battle=blackwake&watch=1',leg:'unclaimed',fleetApproach:true,
  crossBattle:{get:async()=>({encounter})}});
 await flushParking();
 const {q}=c,{blackwake:ship,cones,asteroids,sceneryDebris}=q.inspect(),rock=asteroids[0];
 assert.ok(rock&&cones.length>=2);
 const [cargo,nextCargo]=cones.splice(0,2);cones.splice(0);asteroids.splice(0);sceneryDebris.splice(0);
 const scenery=(body,x,y)=>Object.assign(body,{x,y,vx:0,vy:0,spin:0});
 const x0=ship.x,y0=ship.y;
 scenery(cargo,x0,y0+60);cones.push(cargo);
 for(let i=0;i<80;i++){
  const {x,y}=ship;q.step();
  const dx=ship.x-x,dy=ship.y-y;
  if(Math.hypot(dx,dy)>1e-7)assert.ok(Math.abs(dx*Math.cos(ship.yaw)+dy*Math.sin(ship.yaw))<.002,
   'rear drive movement follows the local nose, not a sideways slide');
 }
 assert.ok(ship.y-y0>18&&ship.driveBurn>.2,'patrol keeps driving after cargo contact without a shooting target');
 assert.ok(cargo.y>y0+70,'pirate deck physically deflects the orange crate');
 assert.ok(cargo.vy>0,'the push transfers momentum, rather than just hiding or deleting the obstacle');
 q.step(60);
 const ally=q.inspect().testLead;
 Object.assign(ally,{x:730,y:635,vx:-105,vy:0,fireWait:Infinity});
 scenery(nextCargo,701,635);cones.push(nextCargo);
 q.step(14);
 assert.ok(nextCargo.x<695&&nextCargo.vx<0,'a moving Bifrost fighter also pushes a crate through normal contact');
 // A large rock imposed into the active patrol lane cannot be displaced by
 // the freighter. The ship takes a side route rather than parking on impact.
 for(const body of q.inspect().pirateCapitals)body.turret.nextShot=Infinity;
 q.inspect().pirateCapitals.slice(1).forEach(body=>body.hp=0);
 q.inspect().wingman.hp=0;
 Object.assign(ship,{anchor:{x:480,y:720},x:480,y:720,patrol:0,patrolPhase:0,yaw:Math.PI/2,speed:17,he3:0,patrolLane:null});
 for(const part of ship.pieces){part.x=ship.x-part.dy;part.y=ship.y;}
 scenery(rock,565,680);rock.r=32;asteroids.push(rock);
 Object.assign(ally,{x:730,y:635,vx:0,vy:0,fireWait:Infinity});
 let stopped=0,sawBypass=false,clearAt=null,movedAfter=0;
 for(let i=0;i<650;i++){
  Object.assign(ally,{x:850,y:475,vx:0,vy:0,fireWait:Infinity});ship.he3=0;q.step();
  if(ship.rockBypass)sawBypass=true;
  else if(sawBypass&&!clearAt&&Math.hypot(ship.x-rock.x,ship.y-rock.y)>rock.r+67)clearAt=[ship.x,ship.y];
  if(clearAt)movedAfter=Math.max(movedAfter,Math.hypot(ship.x-clearAt[0],ship.y-clearAt[1]));
  stopped=ship.speed<1?stopped+1:0;
  assert.ok(stopped<120&&ship.driveBurn>=.118,'drive stays lit, with no prolonged dead stop or reliance on turret energy');
  for(const part of ship.pieces)assert.ok(Math.hypot(part.x-rock.x,part.y-rock.y)>=part.r+rock.r-1e-6,'solid rock remains outside the ship collision pose');
 }
 assert.equal(rock.x,565);assert.equal(rock.y,680);
 assert.ok(Math.abs(ship.y-720)>25,'patrol makes a clean side pass around the rock');
 assert.ok(clearAt&&movedAfter>42,'the ship leaves the rock diversion and continues onward');
});

test('a live Blackwake passes a contact tangentially and can train its turret across its forward flight path',async()=>{
 const encounter={id:'blackwake',status:'active',simulation:'local',sector:'reach',x:365,y:1160,attacker:{id:'bifrost',x:550,y:1160}};
 const c=launch({route:'?cross-battle=blackwake&watch=1',leg:'unclaimed',fleetApproach:true,
  crossBattle:{get:async()=>({encounter})}});
 await flushParking();
 const {q}=c;q.step(140);
 const {blackwake:ship,testLead,wingman,pirateCapitals,cones,asteroids,sceneryDebris}=q.inspect(),arm=ship.turret;
 ship.ram={ready:Infinity}; // an ordinary pass while the ram is rearming
 cones.splice(0);asteroids.splice(0);sceneryDebris.splice(0);wingman.hp=0;
 for(const raider of pirateCapitals.slice(1))raider.turret.nextShot=Infinity;
 Object.assign(ship,{x:480,y:720,yaw:Math.PI,anchor:{x:480,y:720},patrol:0,patrolPhase:0,speed:0,he3:25});
 Object.assign(arm,{aim:0,nextShot:0,burstRemaining:0,followAt:null});
 let across=false;
 for(let i=0;i<100;i++){
  Object.assign(testLead,{x:680,y:720,vx:0,vy:0,fireWait:Infinity});q.step();
  if(arm.target===testLead&&arm.shots&&Math.abs(Math.sin(arm.aim-(ship.yaw-Math.PI/2)))>.66)across=true;
 }
 assert.ok(ship.y>755&&ship.driveBurn>.3,'the freighter flies past rather than stopping at the firing range');
 assert.ok(across,'the gimbal still trains and shoots across the moving hull heading');
});

test('Bifrost repeats distinct boosted firing passes and does not cancel a committed course on target loss',async()=>{
 const encounter={id:'blackwake',status:'active',simulation:'local',sector:'reach',x:365,y:1160,attacker:{id:'bifrost',x:550,y:1160}};
 const c=launch({route:'?cross-battle=blackwake&watch=1',leg:'unclaimed',fleetApproach:true,
  crossBattle:{get:async()=>({encounter})}});
 await flushParking();
 const {q}=c;q.step(140);
 const {testLead:lead,wingman,pirateCapitals,cones,sceneryDebris,asteroids}=q.inspect();
 cones.splice(0);sceneryDebris.splice(0);asteroids.splice(0);wingman.hp=0;
 for(const [i,ship] of pirateCapitals.entries()){
  const x=490+i*52,y=400+i*160;
  Object.assign(ship,{x,y,anchor:{x,y},defenderOffset:null,patrol:0,patrolPhase:i*2.1,hp:500,maxHp:500});
  ship.turret.nextShot=Infinity;ship.ram={ready:Infinity};
 }
 Object.assign(lead,{x:770,y:490,vx:-65,vy:0,crossPass:null,fleetPressure:null});
 const firedByPass=new Set(),banked=new Set(),speeds=[],counts=new Map();
 let committed,locked,position,continued=false,lostAt;
 for(let step=0;step<3200&&(banked.size<3||firedByPass.size<2);step++){
  q.step();
  const pass=lead.crossPass;
  if(!pass?.count)continue;
  counts.set(pass.count,pass.wide);
  if(pass.exhaust>.6&&pass.phase==='run'){
   const speed=Math.hypot(lead.vx,lead.vy);
   if(speed>130)assert.ok((lead.vx*Math.cos(lead.aim)+lead.vy*Math.sin(lead.aim))/speed>.90,'powered movement follows the fighter nose');
   speeds.push(speed);
  }
  if(pass.phase==='run'&&q.inspect().shots.some(shot=>shot.ally&&shot.allyRole==='lead'&&shot.allyMode==='normal'))firedByPass.add(pass.count);
  if(pass.phase==='bank'&&pass.age>1.4)banked.add(pass.count);
  if(!committed&&pass.phase==='run'&&pass.count===2&&pass.age>.26){
   committed=pass.target;locked=pass.heading;position=[lead.x,lead.y];lostAt=step;
   // Neither a moved nor disabled target may cancel the committed pass.
   committed.x+=200;committed.hp=0;
  }else if(committed&&pass.count===2&&pass.phase!=='inbound'&&step>lostAt+30){
   assert.equal(pass.target,committed);assert.equal(pass.heading,locked);
   continued||=Math.hypot(lead.x-position[0],lead.y-position[1])>20;
  }
 }
 assert.equal(continued,true,'the fighter keeps flying after losing its target');
 assert.deepEqual([...counts.values()].slice(0,3),[false,true,false]);
 assert.ok(banked.size>=3&&firedByPass.size>=2,'surviving target acquisitions create repeated real firing passes separated by banks');
 assert.ok(Math.max(...speeds)>135,'the short boost visibly exceeds ordinary cruise pace');
});

test('Bifrost keeps the committed arc when the final pirate is disabled, without firing after victory',async()=>{
 const encounter={id:'blackwake',status:'active',simulation:'local',sector:'reach',x:365,y:1160,attacker:{id:'bifrost',x:550,y:1160}};
 const c=launch({route:'?cross-battle=blackwake&watch=1',leg:'unclaimed',fleetApproach:true,
  crossBattle:{get:async()=>({encounter})}});
 await flushParking();
 const {q}=c;q.step(140);
 const {testLead:lead,wingman,pirateCapitals,cones,sceneryDebris,asteroids}=q.inspect();
 cones.splice(0);sceneryDebris.splice(0);asteroids.splice(0);wingman.hp=0;
 for(const [i,ship] of pirateCapitals.entries()){ship.hp=i===0?4:0;ship.turret.nextShot=Infinity;}
 Object.assign(pirateCapitals[0],{x:470,y:490,defenderOffset:null,anchor:{x:470,y:490}});
 Object.assign(lead,{x:718,y:492,vx:-85,vy:0,crossPass:null});
 for(let i=0;i<1000&&!q.inspect().duelResult;i++)q.step();
 assert.equal(q.inspect().duelResult,'victory');
 assert.match(c.e['cross-watch-status'].textContent,/Battle complete · Pirate fleet disabled/);
 const pass=lead.crossPass,at=[lead.x,lead.y];assert.ok(['run','bank'].includes(pass.phase));
 const heading=pass.heading,count=pass.count;
 q.step(60);
 assert.equal(pass.heading,heading);assert.equal(pass.count,count);
 assert.ok(Math.hypot(lead.x-at[0],lead.y-at[1])>32);
 assert.equal(q.inspect().shots.length,0);assert.equal(q.inspect().vandulLasers.length,0);
});

test('a Bifrost spotter shares a pirate contact without allowing the other fighter to fire through a rock',async()=>{
 const encounter={id:'blackwake',status:'active',simulation:'local',sector:'reach',x:365,y:1160,attacker:{id:'bifrost',x:550,y:1160}};
 const c=launch({route:'?cross-battle=blackwake&watch=1',leg:'unclaimed',fleetApproach:true,
  crossBattle:{get:async()=>({encounter})}});
 await flushParking();
 const {q}=c;q.step(140);
 const {testLead,wingman,pirateCapitals,cones,sceneryDebris,asteroids}=q.inspect(),rock=asteroids[0],pirate=pirateCapitals[0];
 cones.splice(0);sceneryDebris.splice(0);asteroids.splice(0);
 Object.assign(rock,{x:620,y:500,r:46,vx:0,vy:0});asteroids.push(rock);
 Object.assign(pirate,{x:500,y:500,anchor:{x:500,y:500},defenderOffset:null,patrolPhase:0,patrol:0,speed:0});
 pirate.turret.nextShot=Infinity;pirateCapitals.slice(1).forEach(ship=>ship.hp=0);
 Object.assign(testLead,{x:740,y:500,vx:0,vy:0,fireWait:0,crossPass:null});
 Object.assign(wingman,{x:650,y:300,vx:0,vy:0,fireWait:Infinity,crossPass:null,hp:0});
 q.step(3);
 assert.equal(testLead.crossPass.target,null,'alone the fighter cannot acquire through cover');
 wingman.hp=wingman.maxHp;
 q.step(8);
 assert.equal(testLead.crossPass.target,pirate,'another pilot with a clear view shares the target');
 assert.equal(testLead.crossPass.phase,'run');
 assert.equal(q.inspect().shots.some(shot=>shot.allyRole==='lead'),false,'only a clear personal firing lane allows a shot');
});

test('an outnumbered Blackwake opens real distance under power, keeps aiming, and does not flip on a brief lull',async()=>{
 const encounter={id:'blackwake',status:'active',simulation:'local',sector:'reach',x:365,y:1160,attacker:{id:'bifrost',x:550,y:1160}};
 const c=launch({route:'?cross-battle=blackwake&watch=1',leg:'unclaimed',fleetApproach:true,
  crossBattle:{get:async()=>({encounter})}});
 await flushParking();
 const {q}=c;q.step(140);
 const {blackwake:ship,testLead,wingman,pirateCapitals,cones,sceneryDebris,asteroids}=q.inspect();
 cones.splice(0);sceneryDebris.splice(0);asteroids.splice(0);
 pirateCapitals.slice(1).forEach(body=>body.hp=0);
 Object.assign(ship,{x:480,y:475,anchor:{x:480,y:475},yaw:-Math.PI/2,speed:0,fleetPressure:null});
 ship.turret.aim=0;ship.turret.nextShot=0;
 const stage=(second=true)=>{
  Object.assign(testLead,{x:665,y:442,vx:0,vy:0,fireWait:Infinity,hp:20});
  Object.assign(wingman,{x:655,y:534,vx:0,vy:0,fireWait:Infinity,hp:second?20:0});
 };
 for(let i=0;i<20;i++){stage();q.step();}
 assert.equal(ship.fleetPressure.active,false,'fleeting contact does not trigger a reversal');
 for(let i=0;i<70;i++){stage();q.step();}
 assert.equal(ship.fleetPressure.active,true);
 const gap=Math.hypot(ship.x-655,ship.y-490),x=ship.x;
 for(let i=0;i<45;i++){stage();q.step();}
 assert.ok(ship.x<x-32&&Math.hypot(ship.x-655,ship.y-490)>gap+30);
 assert.ok(ship.driveBurn>.4&&ship.turret.shots>0,'retreat uses the drive and does not turn the turret off');
 for(let i=0;i<26;i++){stage(false);q.step();}
 assert.equal(ship.fleetPressure.active,true,'the course holds through a momentary break in pressure');
 for(let i=0;i<95;i++){stage(false);q.step();}
 assert.equal(ship.fleetPressure.active,false,'one remaining contact no longer overwhelms the healthy ship');
});

test('a wounded Bifrost fighter finishes its existing pass before opening distance',async()=>{
 const encounter={id:'blackwake',status:'active',simulation:'local',sector:'reach',x:365,y:1160,attacker:{id:'bifrost',x:550,y:1160}};
 const c=launch({route:'?cross-battle=blackwake&watch=1',leg:'unclaimed',fleetApproach:true,
  crossBattle:{get:async()=>({encounter})}});
 await flushParking();
 const {q}=c;q.step(140);
 const {testLead:lead,wingman,pirateCapitals,cones,sceneryDebris,asteroids}=q.inspect(),pirate=pirateCapitals[0];
 cones.splice(0);sceneryDebris.splice(0);asteroids.splice(0);wingman.hp=0;
 pirateCapitals.slice(1).forEach(ship=>ship.hp=0);
 Object.assign(pirate,{x:500,y:475,anchor:{x:500,y:475},defenderOffset:null,patrol:0,patrolPhase:0});
 pirate.turret.nextShot=Infinity;pirate.ram={ready:Infinity};pirate.hp=pirate.maxHp=500;
 Object.assign(lead,{x:719,y:475,vx:-75,vy:0,crossPass:null,fleetPressure:null});
 q.step(3);
 const pass=lead.crossPass,heading=pass.heading;
 assert.equal(pass.phase,'run');
 lead.hp=5;
 let holding=false;
 for(let i=0;i<160&&pass.phase!=='inbound';i++){
  q.step();
  if(lead.fleetPressure.active){
   assert.equal(pass.heading,heading);assert.equal(pass.count,1);assert.equal(pass.target,pirate);holding=true;
  }
 }
 assert.equal(holding,true,'pressure becomes active without replacing the already committed course');
 for(let i=0;i<400&&pass.phase!=='inbound';i++)q.step();
 assert.equal(pass.phase,'inbound');
 // The surrounding threat closes on the fighter again between runs.
 Object.assign(lead,{x:700,y:475,vx:63,vy:0});
 Object.assign(pirate,{x:lead.x-190,y:lead.y,anchor:{x:lead.x-190,y:lead.y},patrol:0,patrolPhase:0});
 const start=Math.hypot(lead.x-pirate.x,lead.y-pirate.y);
 q.step(82);
 assert.equal(pass.count,1,'the pressured fighter does not immediately commit to another shot');
 assert.ok(Math.hypot(lead.x-pirate.x,lead.y-pirate.y)>start+12,'it keeps moving and opens range');
 lead.hp=20;
 q.step(100);
 assert.equal(lead.fleetPressure.active,false);
});

test('Bifrost hull bars show real 20 HP, highlight one second per confirmed shot, and empty on the fifth hit',async()=>{
 const hullBarPaint=[];
 const encounter={id:'blackwake',status:'active',simulation:'local',sector:'reach',x:365,y:1160,attacker:{id:'bifrost',x:550,y:1160}};
 const c=launch({route:'?cross-battle=blackwake&watch=1',leg:'unclaimed',fleetApproach:true,hullBarPaint,
  crossBattle:{get:async()=>({encounter})}});
 await flushParking();
 const {q}=c;q.step(140);
 const {testLead:lead,wingman,pirateCapitals,cones,sceneryDebris,asteroids}=q.inspect(),ship=pirateCapitals[0],arm=ship.turret;
 cones.splice(0);sceneryDebris.splice(0);asteroids.splice(0);
 pirateCapitals.slice(1).forEach(other=>other.turret.nextShot=Infinity);
 assert.equal(lead.hp,20);assert.equal(lead.maxHp,20);
 assert.ok(hullBarPaint.some(r=>r.color==='#93e5f4'&&r.w===38));
 const stage=()=>Object.assign(lead,{x:arm.x+145,y:arm.y,vx:0,vy:0,fireWait:Infinity,crossPass:null});
 const hit=expected=>{
  arm.aim=0;arm.nextShot=0;arm.followAt=null;arm.burstRemaining=0;
  for(let i=0;i<15&&!q.inspect().vandulLasers.some(bolt=>bolt.owner===arm);i++){
   stage();q.step();
  }
  const shot=q.inspect().vandulLasers.find(bolt=>bolt.owner===arm);
  assert.equal(shot?.damage,4,'the live Blackwake gimbal emits the actual damage');
  arm.nextShot=Infinity;arm.followAt=null;arm.burstRemaining=0;
  Object.assign(lead,{x:shot.x+shot.vx*.02,y:shot.y+shot.vy*.02,vx:0,vy:0});
  hullBarPaint.length=0;q.step(2);
  assert.equal(lead.hp,expected);
  assert.ok(hullBarPaint.some(r=>r.color==='#946a3e'),'confirmed hits immediately paint the highlight');
  if(expected)assert.ok(hullBarPaint.some(r=>r.color==='#fff0a6'&&Math.abs(r.w-38*expected/20)<1e-6));
  else assert.ok(!hullBarPaint.some(r=>r.color==='#fff0a6'),'destroyed fighter has no filled ship-health bar');
 };
 hit(16);
 q.step(50);hullBarPaint.length=0;q.step();assert.ok(hullBarPaint.some(r=>r.color==='#fff0a6'));
 q.step(14);hullBarPaint.length=0;q.step();assert.ok(!hullBarPaint.some(r=>r.color==='#fff0a6'));
 assert.equal(lead.hp,16,'damage is not recovered after the flash');
 for(const hp of [12,8,4,0])hit(hp);
 q.step(120);assert.equal(lead.hp,0);assert.equal(q.inspect().testLead,lead);
 assert.ok(wingman.hp>0,'the other fighter has not been made invulnerable or replaced');
});

test('a pressured Bifrost fighter crosses behind nearby asteroid cover without stopping',async()=>{
 const encounter={id:'blackwake',status:'active',simulation:'local',sector:'reach',x:365,y:1160,attacker:{id:'bifrost',x:550,y:1160}};
 const c=launch({route:'?cross-battle=blackwake&watch=1',leg:'unclaimed',fleetApproach:true,crossBattle:{get:async()=>({encounter})}});
 await flushParking();
 const {q}=c;q.step(140);
 const {testLead:lead,wingman,pirateCapitals,cones,sceneryDebris,asteroids}=q.inspect(),pirate=pirateCapitals[0],rock=asteroids[0];
 cones.splice(0);sceneryDebris.splice(0);asteroids.splice(0);wingman.hp=0;pirateCapitals.slice(1).forEach(ship=>ship.hp=0);
 Object.assign(rock,{x:600,y:500,r:36,vx:0,vy:0});asteroids.push(rock);
 Object.assign(pirate,{x:450,y:480,anchor:{x:450,y:480},defenderOffset:null,patrol:0,patrolPhase:0});
 pirate.loadout={...pirate.loadout,engine:{...pirate.loadout.engine,patrolSpeed:0}};pirate.turret.nextShot=Infinity;
 Object.assign(lead,{x:680,y:600,vx:0,vy:-69,aim:-Math.PI/2,hp:5,crossPass:null,
  fleetPressure:{active:true,build:1,clear:0,threat:{x:450,y:480}}});
 const hidden=()=>{
  const dx=lead.x-pirate.x,dy=lead.y-pirate.y;
  return Math.abs(dx*(rock.y-pirate.y)-dy*(rock.x-pirate.x))/Math.hypot(dx,dy)<rock.r;
 };
 assert.equal(hidden(),false);
 let protectedAt;
 for(let i=0;i<80&&!protectedAt;i++){q.step();if(hidden())protectedAt=[lead.x,lead.y];}
 assert.ok(protectedAt,'the pullback actually puts the asteroid between fighter and threat');
 assert.equal(lead.crossPass.count,0);
 q.step(30);
 assert.ok(Math.hypot(lead.x-protectedAt[0],lead.y-protectedAt[1])>15,'cover is crossed under power, not camped indefinitely');
 assert.ok(Math.hypot(lead.x-rock.x,lead.y-rock.y)>rock.r+lead.r);
});

test('Blackwake begins nose-first south and repeats broad northbound returns until contact',async()=>{
 const encounter={id:'blackwake',status:'active',simulation:'local',sector:'reach',x:365,y:1160,attacker:{id:'bifrost',x:550,y:1160}};
 const c=launch({route:'?cross-battle=blackwake&watch=1',leg:'unclaimed',fleetApproach:true,crossBattle:{get:async()=>({encounter})}});
 await flushParking();
 const {q}=c,{pirateCapitals:ships}=q.inspect();
 const starts=ships.map(ship=>({x:ship.x,y:ship.y}));
 assert.ok(ships.every(ship=>Math.abs(ship.yaw-Math.PI)<1e-8));
 q.step(125);
 for(const [i,ship] of ships.entries()){
  assert.ok(ship.y-starts[i].y>30&&Math.abs(ship.x-starts[i].x)<1);
  assert.equal(ship.turret.shots,0);
 }
 q.step(15);
 const {testLead,wingman}=q.inspect(),south=starts.map(p=>p.y),north=[false,false,false],secondSouth=[false,false,false];
 for(let n=0;n<2450&&!secondSouth.every(Boolean);n++){
  Object.assign(testLead,{x:1000,y:1270,vx:0,vy:0});Object.assign(wingman,{x:1010,y:1340,vx:0,vy:0});
  const poses=ships.map(ship=>[ship.x,ship.y,ship.yaw]);q.step();
  for(const [i,ship] of ships.entries()){
   const [x,y,yaw]=poses[i],dx=ship.x-x,dy=ship.y-y;
   assert.ok(Math.abs(ship.yaw-yaw)<=.775*.016+1e-7);
   if(Math.hypot(dx,dy)>1e-7)assert.ok(dx*Math.sin(ship.yaw)-dy*Math.cos(ship.yaw)>0);
   south[i]=Math.max(south[i],ship.y);
   if(south[i]-ship.y>65&&dy<-.12)north[i]=true;
   if(north[i]&&ship.y<starts[i].y+45&&dy>.12)secondSouth[i]=true;
   assert.ok(ships.slice(0,i).every(other=>Math.hypot(other.x-ship.x,other.y-ship.y)>67),'separate patrol lanes never stack hull centers');
  }
 }
 assert.ok(north.every(Boolean)&&secondSouth.every(Boolean),'all three actually cruise back north and begin another southbound run');
 assert.ok(ships.every(ship=>ship.turret.shots===0));
});

test('Blackwake and fighter exchange mass-weighted impact and keep emitting long sparks only in contact',async()=>{
 const encounter={id:'blackwake',status:'active',simulation:'local',sector:'reach',x:365,y:1160,attacker:{id:'bifrost',x:550,y:1160}};
 const c=launch({route:'?cross-battle=blackwake&watch=1',leg:'unclaimed',fleetApproach:true,crossBattle:{get:async()=>({encounter})}});
 await flushParking();
 const {q}=c;q.step(140);
 const {testLead:lead,wingman,pirateCapitals,cones,asteroids,sceneryDebris}=q.inspect(),ship=pirateCapitals[0];
 cones.splice(0);asteroids.splice(0);sceneryDebris.splice(0);wingman.hp=0;
 pirateCapitals.slice(1).forEach(body=>body.hp=0);
 Object.assign(ship,{x:480,y:475,anchor:{x:480,y:475},defenderOffset:null,patrolLane:null,yaw:0,speed:0,kickX:0,kickY:0});
 ship.loadout={...ship.loadout,engine:{...ship.loadout.engine,patrolSpeed:0,turnRate:0}};ship.turret.nextShot=Infinity;
 Object.assign(lead,{x:750,y:475,vx:0,vy:0,fireWait:Infinity,crossPass:null});
 q.step(3);
 const part=ship.pieces[2],x0=ship.x,hp=[lead.hp,ship.hp],speed=120;
 Object.assign(lead,{x:part.x+part.r+lead.r+9.2,y:part.y,vx:-speed,vy:0,
  crossPass:{phase:'bank',side:1,count:1,age:0,heading:Math.PI,startX:part.x,startY:part.y}});
 q.step();
 assert.ok(ship.kickX< -10,'the heavy hull receives a clear kick');
 assert.ok(lead.vx>-speed+40,'the fighter loses substantially more of its closing speed');
 assert.ok(ship.x<x0);
 assert.ok(Math.abs((lead.vx+speed)/lead.invMass+ship.vx/ship.invMass)<220,'opposing velocity changes agree with the mass ratio');
 assert.ok(lead.hp<hp[0]&&ship.hp<hp[1]);
 assert.ok((hp[0]-lead.hp)/lead.maxHp>(hp[1]-ship.hp)/ship.maxHp,'the smaller fighter loses a larger percentage');
 assert.ok(hp[0]-lead.hp>hp[1]-ship.hp,'the heavier ship also loses fewer absolute hit points');
 assert.ok(lead.hullHitUntil>0,'a confirmed collision highlights the fighter health bar');
 const impactHp=[lead.hp,ship.hp];
 const first=new Set(q.inspect().sparks.filter(spark=>spark.scrape));
 assert.ok(first.size>0&&first.size<=3);
 assert.ok([...first].every(spark=>Math.abs(spark.dy)>Math.abs(spark.dx)&&Math.hypot(spark.dx,spark.dy)>.01));
 // Move clear: the heavy hull must carry the kick forward across updates
 // and no additional scrape particles should spawn while separated.
 const x1=ship.x;
 Object.assign(lead,{x:730,y:475,vx:0,vy:0});q.step(6);
 assert.ok(ship.x<x1-1,'the patrol update does not overwrite the kick');
 assert.ok(q.inspect().sparks.filter(spark=>spark.scrape).every(spark=>first.has(spark)));
 // Hold a sliding contact for several cooldown intervals. Emission
 // re-arms while touching but is bounded per individual ship pair.
 const more=new Set();
 for(let i=0;i<35;i++){
  Object.assign(lead,{x:part.x+part.r+lead.r+8.97,y:part.y,vx:ship.vx-1,vy:30});
  q.step();
  for(const spark of q.inspect().sparks)if(spark.scrape&&!first.has(spark))more.add(spark);
 }
 assert.ok(more.size>=2&&more.size<=19,'long sparks keep emitting at a bounded cadence during contact');
 assert.deepEqual([lead.hp,ship.hp],impactHp,'sliding contact does not inflict repeated damage');
 Object.assign(lead,{x:750,y:475,vx:0,vy:0});q.step(25);
 assert.equal(q.inspect().sparks.some(spark=>spark.scrape),false,'the final trails fade after the ships separate');
});

test('slower impacts cause less damage, matching masses split it evenly, and high speed remains bounded',async()=>{
 const encounter={id:'blackwake',status:'active',simulation:'local',sector:'reach',x:365,y:1160,attacker:{id:'bifrost',x:550,y:1160}};
 const c=launch({route:'?cross-battle=blackwake&watch=1',leg:'unclaimed',fleetApproach:true,crossBattle:{get:async()=>({encounter})}});
 await flushParking();
 const {q}=c;q.step(140);
 const {testLead:a,wingman:b,pirateCapitals,cones,sceneryDebris,asteroids}=q.inspect();
 cones.splice(0);sceneryDebris.splice(0);asteroids.splice(0);
 for(const ship of pirateCapitals)ship.turret.nextShot=Infinity;
 assert.equal(a.invMass,b.invMass);
 const stage=(vx,vy=0)=>{Object.assign(a,{x:765,y:900,aim:0,vx,vy,fireWait:Infinity,crossPass:null});
  Object.assign(b,{x:765+a.r+b.r+.1,y:900,aim:0,vx:0,vy:0,fireWait:Infinity,crossPass:null});};
 stage(5,188);q.step();assert.deepEqual([a.hp,b.hp],[20,20],'tangential speed does not count as a closing impact');
 stage(167);q.step();
 assert.ok(a.hp<20&&a.hp===b.hp,'matching masses split a real impact equally');
 const medium=20-a.hp;
 for(let i=0;i<36;i++){
  Object.assign(a,{x:500,y:900,vx:0,vy:0});Object.assign(b,{x:850,y:900,vx:0,vy:0});q.step();
 }
 const before=[a.hp,b.hp];
 stage(530);q.step();
 assert.ok(before[0]-a.hp>0&&before[1]-b.hp>0);
 assert.equal(before[0]-a.hp,before[1]-b.hp);
 assert.ok(before[1]-b.hp>medium&&before[1]-b.hp<=5,'faster hits hurt more without exceeding the cap');
});

test('Blackwake’s Hammerhead Prow reduces a frontal collision without changing outgoing damage',async()=>{
 const encounter={id:'blackwake',status:'active',simulation:'local',sector:'reach',x:365,y:1160,attacker:{id:'bifrost',x:550,y:1160}};
 async function impact(yaw){
  const c=launch({route:'?cross-battle=blackwake&watch=1',leg:'unclaimed',fleetApproach:true,crossBattle:{get:async()=>({encounter})}});
  await flushParking();
  const {q}=c;q.step(140);
  const {testLead:lead,wingman,pirateCapitals,cones,asteroids,sceneryDebris}=q.inspect(),ship=pirateCapitals[0];
  cones.splice(0);asteroids.splice(0);sceneryDebris.splice(0);wingman.hp=0;
  pirateCapitals.slice(1).forEach(body=>body.hp=0);
  Object.assign(ship,{x:480,y:475,anchor:{x:480,y:475},defenderOffset:null,patrolLane:null,yaw,speed:0,kickX:0,kickY:0});
  ship.loadout={...ship.loadout,engine:{...ship.loadout.engine,patrolSpeed:0,turnRate:0}};ship.turret.nextShot=Infinity;
  Object.assign(lead,{x:980,y:775,vx:0,vy:0,fireWait:Infinity,crossPass:null});q.step(3);
  const part=ship.pieces.reduce((right,next)=>next.x>right.x?next:right);
  const hp=[lead.hp,ship.hp];
  Object.assign(lead,{x:part.x+part.r+lead.r+9.13,y:part.y,vx:-235,vy:0});q.step();
  return [hp[0]-lead.hp,hp[1]-ship.hp];
 }
 const front=await impact(Math.PI/2),side=await impact(0),rear=await impact(-Math.PI/2);
 assert.deepEqual(side,rear);assert.deepEqual(side,[6,4],'hard side impacts allocate a 60/40 total budget before armor');
 assert.ok(front[1]<side[1],'only the touch at the reinforced front takes less HP');
 assert.equal(front[0],side[0],'the prow does not grant an outgoing ram bonus');
});

test('Blackwake prefers a clear nose-first ram but does not charge into rock or fight through overwhelm',async()=>{
 const encounter={id:'blackwake',status:'active',simulation:'local',sector:'reach',x:365,y:1160,attacker:{id:'bifrost',x:550,y:1160}};
 async function stage(){
  const c=launch({route:'?cross-battle=blackwake&watch=1',leg:'unclaimed',fleetApproach:true,crossBattle:{get:async()=>({encounter})}});
  await flushParking();
  const {q}=c;q.step(140);
  const {blackwake:ship,testLead:lead,wingman,pirateCapitals,cones,asteroids,sceneryDebris}=q.inspect(),rock=asteroids[0];
  cones.splice(0);asteroids.splice(0);sceneryDebris.splice(0);
  for(const body of pirateCapitals)body.turret.nextShot=Infinity;
  pirateCapitals.slice(1).forEach(body=>body.hp=0);
  Object.assign(ship,{x:480,y:475,anchor:{x:480,y:475},yaw:Math.PI/2,speed:0,kickX:0,kickY:0,ram:null,fleetPressure:null});
  const fighters=(second=false)=>{Object.assign(lead,{x:680,y:475,vx:0,vy:0,fireWait:Infinity});
   Object.assign(wingman,{x:690,y:538,vx:0,vy:0,fireWait:Infinity,hp:second?20:0});};
  return {q,ship,lead,rock,asteroids,pirateCapitals,fighters};
 }
 {
  const {q,ship,lead,fighters}=await stage();
  let max=0,committed=false,surge=false;
  for(let i=0;i<160&&lead.hp===20;i++){
   fighters();q.step();
   if(ship.ram.goal){
    committed=true;max=Math.max(max,ship.speed);
    if(ship.driveBurn>1.1&&ship.driveBurstUntil){surge=true;assert.ok(Math.abs(ship.driveReadyAt-ship.driveBurstUntil-(6-.56))<1e-7);}
    assert.ok(Math.abs(ship.yaw-Math.PI/2)<.18,'forward charge points the Hammerhead at the fighter');
   }
  }
  assert.ok(committed&&surge&&max>130&&max<=143&&lead.hp<20,'an unobstructed approach ends in actual velocity-based collision damage');
  for(let i=0;i<40;i++){fighters();q.step();assert.equal(ship.ram.goal,null);}
 }
 {
  const {q,ship,fighters}=await stage();
  const before=ship.he3;
  fighters();q.step();
  assert.ok(ship.driveReadyAt>ship.driveBurstUntil&&ship.he3<before-7);
  assert.equal(ship.loadout.engine.fit,'vessel');
  const cooldown=ship.driveReadyAt;
  for(let i=0;i<55;i++){fighters();q.step();}
  assert.ok(ship.driveBurn<=1.01,'the bright punch ends while the real ram continues');
  Object.assign(ship,{x:480,y:475,yaw:Math.PI/2,ram:{ready:0,goal:null},speed:30});
  fighters();q.step();
  assert.ok(ship.ram.goal&&ship.ram.surgeTried);
  assert.equal(ship.driveReadyAt,cooldown,'an early second charge cannot retrigger the engine');
  assert.equal(ship.driveBurstUntil,0);
 }
 {
  const {q,ship,rock,asteroids,pirateCapitals,fighters}=await stage();
  const spotter=pirateCapitals[1];
  Object.assign(spotter,{x:530,y:645,hp:70,anchor:{x:530,y:645},defenderOffset:null,patrolLane:null});
  spotter.ram={ready:Infinity};
  Object.assign(rock,{x:590,y:475,r:35,vx:0,vy:0});asteroids.push(rock);
  for(let i=0;i<75;i++){fighters();q.step();assert.equal(ship.ram.goal,null,'other pirate spotting cannot authorize a charge through solid cover');}
 }
 {
  const {q,ship,fighters}=await stage();
  for(let i=0;i<65;i++){fighters(true);q.step();}
  assert.equal(ship.fleetPressure.active,true);assert.equal(ship.ram.goal,null);
  assert.ok(ship.ram.ready>0,'the committed charge disengages for the overwhelmed fallback');
 }
});

test('Bifrost sidesteps a real opposing Hammerhead charge instead of boosting into it',async()=>{
 const encounter={id:'blackwake',status:'active',simulation:'local',sector:'reach',x:365,y:1160,attacker:{id:'bifrost',x:550,y:1160}};
 const c=launch({route:'?cross-battle=blackwake&watch=1',leg:'unclaimed',fleetApproach:true,crossBattle:{get:async()=>({encounter})}});
 await flushParking();
 const {q}=c;q.step(140);
 const {blackwake:ship,testLead:lead,wingman,pirateCapitals,cones,asteroids,sceneryDebris}=q.inspect();
 cones.splice(0);asteroids.splice(0);sceneryDebris.splice(0);wingman.hp=0;
 pirateCapitals.slice(1).forEach(body=>body.hp=0);
 Object.assign(ship,{x:480,y:475,anchor:{x:480,y:475},yaw:Math.PI/2,speed:50,kickX:0,kickY:0,ram:null,fleetPressure:null});
 ship.turret.nextShot=Infinity;
 Object.assign(lead,{x:738,y:475,aim:Math.PI,vx:-104,vy:0,fireWait:Infinity,crossPass:null,fleetPressure:null});
 let charged=false,evadedAt;
 for(let i=0;i<140;i++){
  q.step();
  charged||=!!ship.ram.goal;
  if(!evadedAt&&lead.crossPass?.escape)evadedAt={y:lead.y,count:lead.crossPass.count};
  assert.ok(!q.inspect().sparks.some(spark=>spark.scrape),'the offset pass avoids an unnecessary hull impact');
 }
 assert.ok(charged&&evadedAt&&evadedAt.count>0,'both the real ram and the committed fighter safety exception run');
 assert.ok(Math.abs(lead.y-evadedAt.y)>32,'fighter moves laterally past the charging hull');
 assert.equal(lead.hp,20);assert.equal(ship.hp,84);
});

test('Bifrost opens fire at over 400 units, but its own firing lane must still be clear',async()=>{
 const encounter={id:'blackwake',status:'active',simulation:'local',sector:'reach',x:365,y:1160,attacker:{id:'bifrost',x:550,y:1160}};
 for(const blocked of [false,true]){
  const c=launch({route:'?cross-battle=blackwake&watch=1',leg:'unclaimed',fleetApproach:true,crossBattle:{get:async()=>({encounter})}});
  await flushParking();
  const {q}=c;q.step(140);
  const {blackwake:ship,testLead:lead,wingman,pirateCapitals,cones,asteroids,sceneryDebris}=q.inspect(),rock=asteroids[0];
  cones.splice(0);asteroids.splice(0);sceneryDebris.splice(0);
  pirateCapitals.slice(1).forEach(body=>body.hp=0);
  Object.assign(ship,{x:480,y:475,anchor:{x:480,y:475},defenderOffset:null,patrolLane:null,yaw:0,speed:0,kickX:0,kickY:0});
  ship.loadout={...ship.loadout,engine:{...ship.loadout.engine,patrolSpeed:0,turnRate:0}};ship.turret.nextShot=Infinity;
  Object.assign(lead,{x:920,y:475,aim:Math.PI,vx:0,vy:0,fireWait:0,crossPass:null,fleetPressure:null});
  Object.assign(wingman,{x:710,y:270,vx:0,vy:0,hp:blocked?20:0,fireWait:Infinity,crossPass:null});
  if(blocked){Object.assign(rock,{x:690,y:475,r:54,vx:0,vy:0});asteroids.push(rock);}
  let first;
  for(let i=0;i<13&&!first;i++){
   q.step();
   if(q.inspect().shots.some(shot=>shot.allyRole==='lead'))first=Math.hypot(lead.x-ship.x,lead.y-ship.y);
  }
  assert.equal(lead.crossPass?.target,ship,'the ship is a known contact at this distance');
  if(blocked){assert.equal(first,undefined,'no shot through cover even with a wingmate spotting');continue;}
  assert.ok(first>400&&first<=465,'normal single-shot discharge begins far outside the old 315-unit engagement range');
  q.step(63);
  assert.ok(ship.hp<84,'the live projectile travels the distance and hits the hull');
 }
});

test('Blackwake’s Mini Turret can send a real bolt past 350 units without raising damage',async()=>{
 const encounter={id:'blackwake',status:'active',simulation:'local',sector:'reach',x:365,y:1160,attacker:{id:'bifrost',x:550,y:1160}};
 const c=launch({route:'?cross-battle=blackwake&watch=1',leg:'unclaimed',fleetApproach:true,crossBattle:{get:async()=>({encounter})}});
 await flushParking();
 const {q}=c;q.step(140);
 const {blackwake:ship,testLead:lead,wingman,pirateCapitals,cones,asteroids,sceneryDebris}=q.inspect(),arm=ship.turret;
 cones.splice(0);asteroids.splice(0);sceneryDebris.splice(0);wingman.hp=0;
 pirateCapitals.slice(1).forEach(body=>body.hp=0);
 Object.assign(ship,{x:480,y:475,anchor:{x:480,y:475},defenderOffset:null,patrolLane:null,yaw:0,speed:0,kickX:0,kickY:0});
 ship.loadout={...ship.loadout,engine:{...ship.loadout.engine,patrolSpeed:0,turnRate:0}};
 q.inspect().vandulLasers.splice(0);arm.nextShot=Infinity;q.step(3);
 Object.assign(lead,{x:arm.x+398,y:arm.y,vx:0,vy:0,fireWait:Infinity,crossPass:null});
 Object.assign(arm,{aim:0,nextShot:0,followAt:null,burstRemaining:0});
 q.step();
 const bolt=q.inspect().vandulLasers.find(shot=>shot.owner===arm);
 assert.equal(bolt?.damage,4);
 assert.ok(Math.hypot(lead.x-arm.x,lead.y-arm.y)>385);
 arm.nextShot=Infinity;arm.followAt=null;
 const dx=Math.cos(bolt.a),dy=Math.sin(bolt.a),x=arm.x+dx*396,y=arm.y+dy*396,hp=lead.hp;
 for(let i=0;i<90&&lead.hp===hp;i++){
  Object.assign(lead,{x,y,vx:0,vy:0,fireWait:Infinity});q.step();
 }
 assert.equal(lead.hp,hp-4,'the projectile can physically reach and damage a fighter beyond old range');
});

test('contact sparks crackle with sound enabled and only a damaging Hammerhead nose hit clangs',async()=>{
 const encounter={id:'blackwake',status:'active',simulation:'local',sector:'reach',x:365,y:1160,attacker:{id:'bifrost',x:550,y:1160}};
 const c=launch({route:'?cross-battle=blackwake&watch=1',leg:'unclaimed',fleetApproach:true,crossBattle:{get:async()=>({encounter})}});
 await flushParking();
 const {q}=c;q.step(140);
 const {blackwake:ship,testLead:lead,wingman,pirateCapitals,cones,asteroids,sceneryDebris}=q.inspect();
 cones.splice(0);asteroids.splice(0);sceneryDebris.splice(0);wingman.hp=0;
 pirateCapitals.slice(1).forEach(body=>body.hp=0);
 Object.assign(ship,{x:480,y:475,anchor:{x:480,y:475},defenderOffset:null,patrolLane:null,yaw:0,speed:0,kickX:0,kickY:0});
 ship.loadout={...ship.loadout,engine:{...ship.loadout.engine,patrolSpeed:0,turnRate:0}};ship.turret.nextShot=Infinity;
 const separated=()=>{Object.assign(lead,{x:800,y:530,vx:0,vy:0,fireWait:Infinity,crossPass:null});q.step(32);};
 separated();
 const tap=(speed=-2)=>{
  const part=ship.pieces.reduce((right,next)=>next.x>=right.x?next:right);
  Object.assign(lead,{x:part.x+part.r+lead.r+9,y:part.y,vx:speed,vy:0,fireWait:Infinity,
   crossPass:{phase:'bank',side:1,count:1,age:.7,heading:Math.PI,startX:part.x,startY:part.y}});
  q.step();
 };
 const count=f=>q.fallbackNotes.filter(voice=>voice.frequency.sets[0]?.[0]===f).length;
 const scrapes=()=>count(2260),clangs=()=>count(740),smashes=()=>count(168);
 for(let i=0;i<25;i++)tap();
 assert.equal(q.graphs.length,0,'visible sparks never unlock Watch sound');
 assert.equal(scrapes(),0);
 q.click('cross-watch-sound',{isTrusted:false});
 assert.equal(q.graphs.length,0);
 q.click('cross-watch-sound');await flushParking();
 for(let i=0;i<30;i++)tap();
 assert.ok(scrapes()>=2&&scrapes()<=3,'contact sounds repeat at a bounded rhythm');
 assert.equal(clangs(),0);assert.equal(smashes(),0,'gentle contact is only scrape');
 let n=scrapes();separated();assert.equal(scrapes(),n);
 const hp=lead.hp;tap(-175);assert.ok(lead.hp<hp);assert.equal(clangs(),0,'a hard side hit makes no Hammerhead clang');assert.equal(smashes(),1,'ordinary heavy contact has its own one-shot sound');
 separated();
 Object.assign(ship,{yaw:Math.PI/2,kickX:0,kickY:0});q.step(2);
 tap(-180);
 assert.equal(clangs(),1,'one new damaging nose hit gives the distinct metal clang');
 for(let i=0;i<20;i++)tap();
 assert.equal(clangs(),1,'holding contact does not repeat the clang');assert.equal(smashes(),1);
 q.click('cross-watch-sound');n=scrapes();
 for(let i=0;i<28;i++)tap();
 assert.equal(scrapes(),n);assert.equal(clangs(),1);
 q.hide(true);for(let i=0;i<18;i++)tap();assert.equal(scrapes(),n);
});

test('only a clean committed Hammerhead ram jolts the screen, respecting Reduced Motion',async()=>{
 const encounter={id:'blackwake',status:'active',simulation:'local',sector:'reach',x:365,y:1160,attacker:{id:'bifrost',x:550,y:1160}};
 for(const {animate,offset,committed} of [
  {animate:true,offset:0,committed:true},{animate:false,offset:0,committed:true},
  {animate:true,offset:.63,committed:true},{animate:true,offset:0,committed:false}]){
  const c=launch({route:'?cross-battle=blackwake&watch=1',leg:'unclaimed',fleetApproach:true,animate,crossBattle:{get:async()=>({encounter})}});
  await flushParking();
  const {q}=c;q.step(140);
  const {blackwake:ship,testLead:lead,wingman,pirateCapitals,cones,asteroids,sceneryDebris}=q.inspect();
  cones.splice(0);asteroids.splice(0);sceneryDebris.splice(0);wingman.hp=0;
  pirateCapitals.slice(1).forEach(body=>body.hp=0);
  Object.assign(ship,{x:480,y:475,anchor:{x:480,y:475},defenderOffset:null,patrolLane:null,yaw:Math.PI/2,speed:0,kickX:0,kickY:0});
  ship.loadout={...ship.loadout,engine:{...ship.loadout.engine,patrolSpeed:0,turnRate:0}};ship.turret.nextShot=Infinity;
  Object.assign(lead,{x:820,y:545,vx:0,vy:0,fireWait:Infinity,crossPass:null});q.step(3);
  const nose=ship.pieces.reduce((right,part)=>part.x>right.x?part:right),r=nose.r+lead.r+9;
  if(committed)ship.ram={goal:{x:755,y:475},target:lead,until:Infinity,ready:0,surgeTried:true};
  Object.assign(lead,{x:nose.x+r*Math.cos(offset),y:nose.y+r*Math.sin(offset),vx:-188*Math.cos(offset),vy:-188*Math.sin(offset),
   fireWait:Infinity,crossPass:{phase:'bank',side:1,count:1,age:.7,heading:Math.PI,startX:nose.x,startY:nose.y}});
  q.step();
  assert.ok(lead.hp<20,'same real collision triggers actual HP loss');
  const perfect=animate&&offset===0&&committed;
  assert.equal(q.inspect().shake>=.40,perfect);
 }
});

test('a moving heavy hull tumbles light fighters by an impact-derived amount and smoothly releases their heading',async()=>{
 const encounter={id:'blackwake',status:'active',simulation:'local',sector:'reach',x:365,y:1160,attacker:{id:'bifrost',x:550,y:1160}};
 async function impact({mass=248,drive=69,dive=-98,animate=true}={}){
  const c=launch({route:'?cross-battle=blackwake&watch=1',leg:'unclaimed',fleetApproach:true,animate,sprite:true,crossBattle:{get:async()=>({encounter})}});
  await flushParking();
  const {q}=c;q.step(140);
  const {blackwake:ship,testLead:lead,wingman,pirateCapitals,cones,asteroids,sceneryDebris}=q.inspect();
  const art=q.sprites.find(image=>image.src?.includes('fighter-winged'));
  Object.assign(art,{complete:true,naturalWidth:250,naturalHeight:166});
  cones.splice(0);asteroids.splice(0);sceneryDebris.splice(0);wingman.hp=0;
  pirateCapitals.slice(1).forEach(body=>body.hp=0);
  Object.assign(ship,{x:480,y:475,anchor:{x:480,y:475},defenderOffset:null,patrolLane:null,yaw:0,speed:0,kickX:0,kickY:0,invMass:1/mass});
  ship.loadout={...ship.loadout,engine:{...ship.loadout.engine,patrolSpeed:0,turnRate:0}};ship.turret.nextShot=Infinity;
  Object.assign(lead,{x:800,y:540,vx:0,vy:0,fireWait:Infinity,crossPass:null});q.step(3);
  const plate=ship.pieces[2];
  ship.kickX=drive;
  Object.assign(lead,{x:plate.x+plate.r+lead.r+9,y:plate.y,aim:Math.PI,vx:dive,vy:0,fireWait:Infinity,
   crossPass:{phase:'bank',side:1,count:1,age:0,heading:Math.PI,startX:plate.x,startY:plate.y}});
  q.step();
  return {q,lead,art};
 }
 const heavy=await impact(),lighter=await impact({mass:145}),slow=await impact({dive:-61});
 const rate=entry=>Math.abs(entry.lead.impactTumble?.rate??0);
 assert.ok(rate(heavy)>rate(lighter)&&rate(lighter)>0,'same hit, more incoming mass multiplies the spin');
 assert.ok(rate(heavy)>rate(slow)&&rate(slow)>0,'same mass, a harder hit increases angular impulse');
 assert.equal(rate(await impact({mass:60})),0,'same mass does not cause the heavy-impact tumble');
 assert.equal(rate(await impact({dive:-3})),0,'a slow contact does not tumble');
 assert.equal(rate(await impact({drive:0,dive:-165})),0,'hitting a stationary hull does not count as its incoming impulse');
 const renderOffset=({q,lead,art})=>{
  const frame=q.spriteFrames.findLast(c=>c.asset===art&&Math.abs(c.translation[0]-lead.x)<.01);
  assert.ok(frame);
  return frame.rotation-(lead.aim+Math.PI/2);
 };
 Object.assign(heavy.lead,{x:845,y:530});heavy.q.step(19);
 assert.ok(Math.abs(renderOffset(heavy))>2,'the fighter sprite visibly turns instead of the camera spinning');
 const reduced=await impact({animate:false});
 Object.assign(reduced.lead,{x:845,y:530});reduced.q.step(19);
 assert.ok(Math.abs(renderOffset(reduced))<=.2,'reduced motion limits the visible lean');
 assert.ok(rate(heavy)<rate(lighter),'spin naturally slows between contacts');
 heavy.q.step(260);
 assert.equal(heavy.lead.impactTumble,null);
 assert.ok(Math.abs(renderOffset(heavy))<.02,'the sprite eases back to the live heading without locking controls');
});

test('Pegasus manual launch reveals Resolute flying loosely clear of the deck and other flight modes stay unchanged',()=>{
 const samples=[];
 const c=launch({route:'?hangar=carrier&vessel=rift-carrier',resolutePaint:samples,canvasBox:{width:320,height:595}});
 c.board();c.choose('free-flight');c.q.click('cockpit-launch');c.q.step(4);
 assert.equal(samples.length,0,'a parked fighter is not yet in the Battle Fleet Map');
 reachDeparture(c.q);c.q.step(5);
 assert.match(samples.at(-1)?.label??'',/RESOLUTE · ALLIED CORVETTE/);
 const {resoluteFormation,resoluteFlightLength,capitalShip,berthLocal}=c.q.inspect();
 assert.equal(resoluteFlightLength,58.24*4.6);
 const first=resoluteFormation(capitalShip,0),later=resoluteFormation(capitalShip,5);
 assert.notEqual(first.heading,later.heading,'loose station heading changes');
 assert.ok(Math.abs(berthLocal(capitalShip,first.x,first.y).x)>150);
 assert.notEqual(berthLocal(capitalShip,first.x,first.y).x,berthLocal(capitalShip,later.x,later.y).x);
 assert.deepEqual(c.parkingWrites,[]);
 for(const [route,mode] of [['?hangar=carrier&vessel=bifrost','free-flight'],['?hangar=carrier&vessel=rift-carrier','capital-test']]){
  const spy=[];const other=launch({route,resolutePaint:spy});
  other.board();other.choose(mode);other.q.click('cockpit-launch');reachDeparture(other.q);other.q.step(10);
  assert.equal(spy.length,0);
 }
});

test('Resolute flight draws only the clipped Keel-4 from the approved top-down art when it becomes available',()=>{
 const trace=[],labels=[];
 const c=launch({route:'?hangar=carrier&vessel=rift-carrier',sprite:true,resoluteArtTrace:trace,resolutePaint:labels});
 c.board();c.choose('free-flight');c.q.click('cockpit-launch');reachDeparture(c.q);c.q.step(4);
 const art=c.q.sprites.find(img=>img.src==='./corvette-rift4-scale-v6.webp');
 assert.ok(art);
 assert.equal(trace.length,0,'pending sprite retains silhouette fallback');
 assert.ok(labels.length>0);
 Object.assign(art,{complete:true,naturalWidth:760,naturalHeight:700});
 c.q.step(1);
 const {bounds,clip}=trace.at(-1);
 assert.deepEqual(bounds,[235,118,168,475,235,118,168,475]);
 assert.ok(clip.length>40,'uses hull outline rather than rectangular crop');
 assert.ok(clip.every(([x,y])=>x>=246&&x<=393&&y>=125&&y<=584),'grid, border, labels and fighter remain outside hull clip');
 const painted=trace.length,priorLabels=labels.length;
 art.naturalWidth=0;c.q.step(1);
 assert.equal(trace.length,painted,'failed sprite never draws the rectangular board');
 assert.ok(labels.length>priorLabels,'failed sprite keeps the labeled vector fallback');
});

test('Resolute overlays four separate twin turrets in their own sockets, never in unrelated flights',()=>{
 const c=launch({route:'?hangar=carrier&vessel=rift-carrier',sprite:true});
 c.board();c.choose('free-flight');c.q.click('cockpit-launch');c.q.step(2);
 assert.ok(!c.q.sprites.some(img=>img.src==='./corvette-twin-s4.svg'),'parked flight does not load turret art');
 reachDeparture(c.q);
 const hull=c.q.sprites.find(img=>img.src==='./corvette-rift4-scale-v6.webp');
 const turret=c.q.sprites.find(img=>img.src==='./corvette-twin-s4.svg');
 assert.ok(hull&&turret);
 Object.assign(hull,{complete:true,naturalWidth:760,naturalHeight:700});
 Object.assign(turret,{complete:true,naturalWidth:160,naturalHeight:148});
 c.q.spriteFrames.length=0;c.q.step(1);
 const hullIndex=c.q.spriteFrames.findIndex(frame=>frame.asset===hull);
 const turretIndex=c.q.spriteFrames.findIndex(frame=>frame.asset===turret);
 assert.ok(hullIndex>=0&&turretIndex>hullIndex);
 assert.equal(c.q.spriteFrames.filter(frame=>frame.asset===turret).length,4);
 assert.deepEqual(c.q.spriteFrames[turretIndex].translation,[261-320,277-354.5]);
 assert.deepEqual(c.q.spriteFrames[turretIndex].bounds,[-22,-101*44/160,44,148*44/160]);
 const b=launch({route:'?hangar=carrier&vessel=bifrost',sprite:true});
 b.board();b.choose('free-flight');b.q.click('cockpit-launch');reachDeparture(b.q);
 assert.ok(!b.q.sprites.some(img=>img.src==='./corvette-twin-s4.svg'));
});

test('Resolute uses four independent turrets on randomized opt-in Pegasus drill drones; other carriers never arm it',()=>{
 const c=launch({route:'?hangar=carrier&vessel=rift-carrier',animate:true});
 c.board();c.choose('free-flight');c.q.click('cockpit-launch');
 assert.equal(c.e['resolute-drill'].hidden,true);
 reachDeparture(c.q);c.q.step(2);
 const {capitalShip,p}=c.q.inspect();
 const already=[...c.storage];
 assert.equal(c.e['resolute-drill'].hidden,false);
 c.q.step(45);
 assert.equal(c.q.inspect().shots.filter(s=>s.allyRole==='resolute').length,0);
 c.q.click('resolute-drill',{isTrusted:false});
 assert.equal(capitalShip.resoluteDrill,undefined);
 Object.assign(p,{x:capitalShip.x+140,y:capitalShip.y+110,vx:0,vy:0});
 c.q.click('resolute-drill');
 const drill=capitalShip.resoluteDrill;
 assert.equal(drill.drones.length,4);assert.ok(drill.drones.every(d=>d.hp===72));
 const positions=drill.drones.map(d=>[d.dx,d.dy].join(',')).join(';');
 const observed=new Map();let maxShake=0;
 for(let i=0;i<1800&&drill.drones.some(d=>d.hp);i++){
  c.q.step(1);
  maxShake=Math.max(maxShake,c.q.inspect().shake);
  const bolts=c.q.inspect().shots.filter(s=>s.allyRole==='resolute');
  for(const bolt of bolts){
   const pair=bolts.filter(s=>s.resoluteMount===bolt.resoluteMount);
   if(pair.length===2)observed.set(bolt.resoluteMount,pair);
  }
  if(i===0)for(const a of drill.drones)for(const b of drill.drones)if(a!==b)
   assert.ok(Math.hypot(a.x-b.x,a.y-b.y)>2*a.r);
 }
 assert.equal(observed.size,4);
 for(const pair of observed.values()){
  assert.notEqual(pair[0].x,pair[1].x);
  assert.ok(pair.every(shot=>shot.weapon==='ballistic'));
 }
 assert.ok(c.q.played.some(name=>name.startsWith('ballistic:')),'uses the existing recorded ballistic sound, not the player’s equipped blaster');
 assert.ok(new Set(capitalShip.resoluteGuns.map(g=>g.readyAt)).size>1,'separate aim and timing');
 assert.ok(drill.drones.every(d=>d.hp===0),drill.drones.map(d=>d.hp).join(','));
 assert.ok(drill.drones.every(d=>Math.hypot(d.kx,d.ky)>1),'hits produce actual persistent knockback offsets');
 assert.ok(maxShake>0&&maxShake<=.19,'nearby damage triggers a capped jolt');
 assert.deepEqual([...c.storage],already,'target practice writes no pilot progress');
 assert.equal(c.q.inspect().p.hp,c.q.inspect().p.maxHp);
 c.q.mute();const audioCount=c.q.played.length;
 c.q.click('resolute-drill');
 assert.notEqual(capitalShip.resoluteDrill.drones.map(d=>[d.dx,d.dy].join(',')).join(';'),positions);
 for(let i=0;i<180&&!c.q.inspect().shots.some(s=>s.resoluteDrill);i++)c.q.step(1);
 assert.ok(c.q.inspect().shots.some(s=>s.resoluteDrill));
 assert.equal(c.q.played.length,audioCount,'muted volley is silent');
 c.q.click('resolute-drill');assert.equal(capitalShip.resoluteDrill,null);
 assert.ok(!c.q.inspect().shots.some(s=>s.resoluteDrill));
 const b=launch({route:'?hangar=carrier&vessel=bifrost'});
 b.board();b.choose('free-flight');b.q.click('cockpit-launch');reachDeparture(b.q);b.q.step(2);
 assert.equal(b.e['resolute-drill'].hidden,true);b.q.click('resolute-drill');
 assert.equal(b.q.inspect().capitalShip.resoluteDrill,undefined);
});

test('Resolute side pads allow a local stow and relaunch without altering the fighter save',()=>{
 const c=launch({route:'?hangar=carrier&vessel=rift-carrier',animate:true,sprite:true});
 c.board();c.choose('free-flight');c.q.click('cockpit-launch');reachDeparture(c.q);c.q.step(2);
 const {capitalShip,p,berthWorld}=c.q.inspect();
 const buttons=c.e,original=[...c.storage],hp=p.hp;
 const approach=()=>{const at=berthWorld(capitalShip,-283,99);
  Object.assign(p,{...at,vx:Math.cos(capitalShip.aim)*capitalShip.speed,vy:Math.sin(capitalShip.aim)*capitalShip.speed});};
 approach();c.q.step(1);assert.equal(buttons['resolute-dock'].hidden,false);
 c.q.click('resolute-dock-action',{isTrusted:false});assert.equal(capitalShip.resoluteDock,undefined);
 c.q.click('resolute-dock-action');assert.equal(capitalShip.resoluteDock.phase,'approach');
 c.q.click('resolute-dock-cancel');assert.equal(capitalShip.resoluteDock,null);
 c.q.click('resolute-dock-action');c.q.step(65);approach();c.q.step(1);
 assert.equal(buttons['resolute-dock-action'].disabled,false);
 c.q.click('resolute-dock-action');assert.equal(capitalShip.resoluteDock.phase,'capturing');
 c.q.step(20);assert.ok(capitalShip.resoluteDock.scale<1&&capitalShip.resoluteDock.scale>.33);
 c.q.step(50);assert.equal(capitalShip.resoluteDock.phase,'docked');
 assert.equal(capitalShip.resoluteDock.scale,.33);
 const hull=c.q.sprites.find(img=>img.src==='./corvette-rift4-scale-v6.webp');
 Object.assign(hull,{complete:true,naturalWidth:760,naturalHeight:700});
 const fighter=c.q.sprites.find(img=>img.src==='./fighter-winged.png?v=23');
 Object.assign(fighter,{complete:true,naturalWidth:480,naturalHeight:320});
 c.q.spriteFrames.length=0;c.q.step(1);
 const drawings=c.q.spriteFrames;
 const fighterIndex=drawings.findIndex(frame=>frame.asset===fighter&&Math.abs(frame.bounds[2]-87.36*.33)<1e-6);
 const hullIndex=drawings.findIndex(frame=>frame.asset===hull);
 assert.ok(fighterIndex>=0&&hullIndex>fighterIndex,'docked fighter draws at carrier scale before the hull');
 assert.equal(buttons['resolute-dock-store'].hidden,false);
 c.q.click('resolute-dock-store');c.q.step(45);
 assert.ok(capitalShip.resoluteDock.scale<.33&&capitalShip.resoluteDock.scale>.20);
 c.q.step(45);assert.equal(capitalShip.resoluteDock.phase,'stored');assert.equal(capitalShip.resoluteDock.visible,false);
 c.q.click('resolute-dock-action');c.q.step(52);
 assert.ok(capitalShip.resoluteDock.scale>.33&&capitalShip.resoluteDock.scale<1);
 c.q.step(23);
 assert.equal(capitalShip.resoluteDock,null);assert.equal(capitalShip.phase,'flight');
 assert.equal(p.hp,hp);assert.deepEqual([...c.storage],original);
 const b=launch({route:'?hangar=carrier&vessel=bifrost'});
 b.board();b.choose('free-flight');b.q.click('cockpit-launch');reachDeparture(b.q);b.q.step(2);
 assert.equal(b.e['resolute-dock'].hidden,true);
});

test('Resolute leaves Pegasus formation through the planned gate, joins the same Corsair fight, and returns to formation',()=>{
 for(const [exit,entry,input,sign] of [['east','west','KeyD',1],['west','east','KeyA',-1]]){
  const c=crossTileCockpit({initial:{sector:'reach',x:365-sign*170,y:1160,phase:'cruising'},localResolute:true});
  const {q}=c;
  q.click('capital-dock-action');q.step(3);
  const {capitalShip:pegasus,p,arena,pendingCarrierSortie:sortie,resoluteFormation}=q.inspect();
  const roster=[...c.storage];
  assert.equal(sortie.approach.exitEdge,exit);
  assert.ok(resoluteFormation(pegasus,0),'visible alongside Pegasus before outbound input');
  assert.equal(sortie.resolute,undefined,'launch alone does not order the escort out');
  // First approach with the wrong direction: the escort is not ordered to leave.
  Object.assign(p,{x:sign>0?arena.left+32:arena.right-32,y:arena.bottom-600,vx:-sign*126,vy:0,he3:19});
  q.key('keydown',sign>0?'KeyA':'KeyD');q.step(3);q.key('keyup',sign>0?'KeyA':'KeyD');
  assert.equal(sortie.resolute,undefined);
  Object.assign(p,{x:sign>0?arena.right-32:arena.left+32,y:arena.bottom-600,vx:sign*126,vy:0,he3:19});
  q.key('keydown',input);
  for(let i=0;i<20&&q.inspect().capitalShip;i++)q.step();
  q.key('keyup',input);
  const scene=q.inspect(),plan=scene.flightMode.resolutePlan;
  assert.equal(plan.edge,entry);
  assert.ok(plan.delay>0);
  assert.equal(plan.craft,null,'an escort still en route cannot shoot from inside the battle');
  assert.equal(scene.flightMode.tileReturn.ship,pegasus);
  for(const list of [scene.asteroids,scene.sceneryDebris])list.splice(0);
  for(let i=0;i<600&&!plan.craft;i++){
   Object.assign(scene.p,{x:sign>0?scene.arena.left+74:scene.arena.right-74,vx:0,vy:0});
   q.step();
  }
  const craft=plan.craft;
  assert.ok(craft,'escort reaches the battle');
  assert.ok(Math.abs(craft.x-(sign>0?scene.arena.left:scene.arena.right))<40,'same entry edge');
  assert.ok(sign*craft.vx>0);
  assert.ok(Math.abs(craft.y-scene.p.y)>100);
  // Put one pirate ahead at engagement distance and leave the other two running.
  const targets=scene.pirateCapitals;
  const pirate=targets[0],destroyAt=()=>q.inspect().duelResult;
  Object.assign(pirate,{x:craft.x+sign*242,y:craft.y,speed:0});
  pirate.ram={ready:Infinity};
  for(const rock of scene.asteroids)rock.r=1;
  let fired=false;
  for(let i=0;i<190&&!fired;i++){
   q.step();
   fired=q.inspect().shots.some(b=>b.allyRole==='resolute');
  }
  assert.ok(fired,'the existing twin turrets fire in the battle');
  assert.equal(destroyAt(),null);
  const beforeHp=craft.hp;
  q.inspect().vandulLasers.push({x:craft.x-sign*30,y:craft.y,vx:sign*6400,vy:0,a:sign===1?0:Math.PI,life:3,damage:4,blackwakeTurret:true});
  q.step();
  assert.ok(craft.hp<beforeHp,'pirate fire can damage the escort');
  Object.assign(scene.p,{x:sign>0?scene.arena.left+32:scene.arena.right-32,vx:0,vy:0});
  q.step();q.click('fleet-return-action');
  assert.equal(q.inspect().capitalShip,pegasus);
  assert.equal(q.inspect().flightMode.resolutePlan,undefined);
  assert.ok(resoluteFormation(pegasus,0),'the original formation is restored');
  assert.deepEqual([...c.storage],roster,'does not alter save data or allegiance');
 }
});

test('damage smoke starts below half hull, stays behind the moving fighter, and fades after repair',()=>{
 const c=launch({route:'?launch=practice',traceClashPaint:true,animate:true}),{q}=c;
 const {p}=q.inspect();
 const smoke=()=>q.radialPaint.filter(fx=>fx.stops[0]==='#78838c');
 p.hp=p.maxHp/2;
 q.step(24);
 assert.equal(smoke().length,0,'exactly half hull does not emit');
 Object.assign(p,{hp:p.hp-1,aim:0,vx:110,vy:0});
 q.step(8);
 const first=smoke().at(-1)?.args;
 assert.ok(first&&first[0]<p.x-10,'emits at the aft of the craft');
 q.step(10);
 const recent=smoke().slice(-12).map(s=>s.args[0]);
 assert.ok(recent.some(x=>Math.abs(x-first[0])<7)&&recent.some(x=>x>first[0]+8),'separate world positions make a trail');
 p.hp=p.maxHp;
 q.radialPaint.length=0;q.step(155);
 assert.ok(smoke().length>0,'residual smoke fades, not a hard pop');
 q.radialPaint.length=0;q.step(20);
 assert.equal(smoke().length,0,'a repaired ship is no longer smoking');
 p.hp=0;
 q.step(20);
 assert.equal(smoke().length,0,'a destroyed hull does not emit continuing damage smoke');
});

test('the local Corsair fight renders damage smoke behind both a fighter and Blackwake',()=>{
 const c=crossTileCockpit({initial:{sector:'reach',x:195,y:1160,phase:'cruising'},traceClashPaint:true});
 const {q}=c;
 q.click('capital-dock-action');q.step(4);
 const {p,arena}=q.inspect();
 Object.assign(p,{x:arena.right-32,y:arena.bottom-600,vx:126,vy:0,he3:19});
 q.key('keydown','KeyD');
 for(let i=0;i<20&&q.inspect().capitalShip;i++)q.step();
 q.key('keyup','KeyD');
 const {blackwake,asteroids,sceneryDebris}=q.inspect();
 const live=q.inspect().p;
 for(const list of [asteroids,sceneryDebris])list.splice(0);
 Object.assign(live,{x:410,y:540,hp:8,vx:0,vy:0});
 Object.assign(blackwake,{x:500,y:540,hp:13});
 blackwake.ram={ready:Infinity};
 q.radialPaint.length=0;q.step(20);
 const smoke=q.radialPaint.filter(fx=>fx.stops[0]==='#78838c');
 assert.ok(smoke.some(fx=>Math.abs(fx.args[0]-live.x)<45),'player smoke');
 assert.ok(smoke.some(fx=>Math.abs(fx.args[0]-blackwake.x)<55),'larger opposing hull smoke');
});

test('Corsair retreat preserves hull damage, docked repair takes 30 seconds, and manual relaunch rejoins the active fight',()=>{
 let now=79000;
 const c=crossTileCockpit({initial:{sector:'reach',x:195,y:1160,phase:'cruising'},wallNow:()=>now}),{q}=c;
 const storage=[...c.storage];
 const cross=()=>{
  const {p,arena,capitalShip}=q.inspect();
  q.click('capital-dock-action');q.step(4);
  assert.equal(capitalShip.phase,'flight');
  Object.assign(p,{x:arena.right-32,y:arena.bottom-600,vx:126,vy:0,he3:19});
  q.key('keydown','KeyD');
  for(let i=0;i<20&&q.inspect().capitalShip;i++)q.step();
  q.key('keyup','KeyD');
  assert.equal(q.inspect().capitalShip,null);
  assert.equal(q.inspect().flightMode.resolutePlan,null,'production escort stays in formation');
 };
 cross();
 const {pirateCapitals,asteroids,sceneryDebris,p,arena}=q.inspect();
 for(const list of [asteroids,sceneryDebris])list.splice(0);
 // One disabled pirate and one damaged pirate are left in the fight.
 const strike=(pirate,damage)=>{
  const part=pirate.pieces[1];
  q.inspect().shots.push({x:part.x-24,y:part.y,vx:6400,vy:0,a:0,weapon:'blaster',damage});
  q.step();
 };
 strike(pirateCapitals[0],99);strike(pirateCapitals[1],7);
 assert.deepEqual(Array.from(pirateCapitals,s=>s.hp),[0,23,30]);
 Object.assign(p,{x:arena.left+46,vx:0,vy:0,hp:8});
 q.step();q.click('fleet-return-action');
 const {capitalShip,capitalBerth,berthWorld,berthVelocity,resoluteFormation}=q.inspect();
 assert.equal(capitalShip.name,'Pegasus');
 assert.ok(resoluteFormation(capitalShip,0));
 assert.equal(p.hp,8);
 q.click('capital-dock-action');
 const port=berthWorld(capitalShip,0,capitalBerth.approach),velocity=berthVelocity(0,capitalBerth.approach);
 Object.assign(p,port,{vx:velocity.x,vy:velocity.y});
 q.click('capital-dock-action');q.step(4);
 assert.equal(capitalShip.phase,'docked');
 q.click('fleet-repair-action');q.click('capital-dock-action');
 assert.equal(capitalShip.phase,'docked','cannot launch while repairs are in progress');
 now+=29999;q.step();assert.equal(p.hp,8);
 now++;q.step();
 assert.equal(p.hp,p.maxHp);
 assert.equal(capitalShip.phase,'docked','repairs do not auto-launch');
 cross();
 const returned=q.inspect();
 assert.equal(returned.flightMode.id,'corsair-cross-tile');
 assert.equal(returned.flightMode.tileApproach.entryEdge,'west');
 assert.equal(returned.p.hp,returned.p.maxHp);
 assert.equal(returned.pirateCapitals,pirateCapitals,'rejoined the same battle rather than spawning three new pirates');
 assert.deepEqual(Array.from(returned.pirateCapitals,s=>s.hp),[0,23,30]);
 assert.deepEqual([...c.storage],storage,'the local simulation never changes the saved career');
});

test('flight mode menu separates private simulations from shared battle and only reviews online entry on a trusted click',()=>{
 const joins=[];
 const multiplayer={join(...args){joins.push(args);}};
 for(const [vessel,side] of [['rift-carrier','allies'],['bifrost','opposition']]){
  const c=launch({route:'?hangar=carrier&vessel='+vessel,homeVessel:vessel,multiplayer});
  c.board();
  assert.deepEqual(c.select.groups.map(g=>g.label),['Solo · Private','Online · Shared']);
  const [solo,online]=c.select.groups;
  assert.ok(solo.children.some(o=>o.value==='solo-training'));
  assert.ok(solo.children.every(o=>!o.value.startsWith('online-')));
  assert.deepEqual(Array.from(online.children,o=>o.value),['online-blackwake-allies','online-blackwake-opposition']);
  c.choose('online-blackwake-'+side,'mode');
  assert.equal(c.e['cockpit-launch'].textContent,'Review online flight');
  assert.equal(c.q.inspect().state,'menu');
  c.q.click('cockpit-launch',{isTrusted:false});
  assert.deepEqual(c.visits,[]);
  c.q.click('cockpit-launch');
  assert.deepEqual(c.visits,['./index.html?multiplayer=blackwake&side='+side]);
  assert.deepEqual(joins,[],'opening the briefing does not contact the multiplayer room');
 }
});

test('private launch shows only active bots in the top flight readout',()=>{
 const {q}=launch({route:'?launch=practice'});
 q.step();
 assert.equal(q.el['flight-population'].textContent,'Solo · 0 bots');
 q.target(true,true);q.step();
 assert.equal(q.el['flight-population'].textContent,'Solo · 2 bots');
 q.inspect().vanduls[0].hp=0;q.step();
 assert.equal(q.el['flight-population'].textContent,'Solo · 1 bot');
});

test('cockpit in the private mirror reviews the public room without sharing the private hangar',()=>{
 const c=launch({multiplayer:{join(){assert.fail('room join before confirmation');}},host:'rift-runner.boundlessghost16.chatgpt.site'});
 c.board();c.choose('online-blackwake-allies','mode');c.q.click('cockpit-launch');
 assert.deepEqual(c.visits,['https://rift-runner.gambizt3.workers.dev/index.html?multiplayer=blackwake&side=allies']);
});
