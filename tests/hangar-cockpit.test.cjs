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
function launch({route='?hangar=carrier',orderLog={intercept:accepted},leg='repaired',build=fit,rendezvous,cinematic=false,animate=cinematic,beforeStorageRead,canvasBox,hulls=[],loadFighters=!!hulls.length,existingStorage,homeVessel=route.includes('vessel=bifrost')?'bifrost':undefined}={}){
 const storage=existingStorage??new Map([[genKey,generation],[missionKey,JSON.stringify({...base,...orderLog})],
  [hullKey,JSON.stringify({version:1,hull:'rift-fighter',condition:leg})],[buildKey,JSON.stringify({version:1,hull:'rift-fighter',...build})]]);
 if(rendezvous)storage.set('rift-runner.wing-rendezvous.v1',JSON.stringify({version:1,generation,rooms:{aya:'common',ellis:'observation'},acceptedAt:8,completedAt:rendezvous==='done'?10:null,met:{aya:true,ellis:rendezvous==='done'}}));
 if(leg==='unclaimed'){storage.delete(hullKey);storage.delete(buildKey);}
 const visits=[];
 const q=setup({cockpitUI:true,flightShell:true,sharedStorage:storage,loadPilotMissions:true,loadRendezvous:!!rendezvous,
  initialHe3:0,reducedMotion:!animate,fieldSeed:329,buildUI:true,beforeStorageRead,canvasBox,
  loadFighters,homeVessel,
  address:{search:route,origin:'https://rift.example',replace(url){visits.push(url);}},pilotCredits:{getBuildState:()=>({origin:'new',owned,kills:25}),owns:id=>owned.includes(id),ownsHull:id=>hulls.includes(id)}});
 const e=q.el,select=e['cockpit-order'],mission=e['cockpit-mission'];
 return {q,e,select,mission,visits,storage,
  choose(id,kind=modes.includes(id)||id==='vandul'||id.startsWith('custom-')?'mode':'mission'){
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
  'Outfit the Rift-4 · Completed','Vandul Intercept · Report to Bishop','Wingman Qualification · Completed · Can re-fly',
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


test('before buying another fighter, Hangar only shows recovered Rift-4, including when damaged',()=>{
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
  assert.equal(e['hangar-ship-name'].textContent,'Stocky Light Fighter');
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
  assert.deepEqual(c.modeIds(),['',...(leg==='repaired'?[...modes,'vandul']:[]),...custom]);
  if(leg==='repaired')c.choose('custom-stocky-light-fighter');
  else{c.select.value='custom-stocky-light-fighter';c.select.handlers.change();}
  assert.match(c.plan(),/Custom Mode · Stocky Light Fighter/);
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

test('Bay 01 is the visible personal assignment on both hull scenes, without adding a blocking control',()=>{
 const html=read('index.html'),css=read('style.css');
 assert.match(html,/<p id="hangar-bay-heading" class="hangar-kicker">PERSONAL FIGHTER BAY · 01<\/p>/);
 const scenes=[...html.matchAll(/<figure class="hangar-hero(?: hangar-damaged-bay)?" id="hangar-(damaged|repaired)-bay"[^>]*>[\s\S]*?<div class="hangar-fleet" aria-hidden="true">([\s\S]*?)bay-06[^>]*>/g)];
 assert.deepEqual(scenes.map(([,state])=>state),['damaged','repaired']);
 for(const [,,berths] of scenes){
  assert.match(berths,/<div class="hangar-berth bay-01 hangar-pilot-berth"><span>01 · PLAYER<\/span><\/div>/);
  assert.equal((berths.match(/hangar-pilot-berth/g)||[]).length,1);
 }
 assert.match(css,/\.hangar-fleet\{[^}]*pointer-events:none/);
 assert.match(css,/\.bay-01\{--x:var\(--pilot-berth-x\);--y:50%\}/);
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
 assert.deepEqual(c.modeIds(),['','custom-bastion-9','custom-stocky-light-fighter','custom-rift-fighter']);
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
test('owned fighter transfer updates only that hull after Galaxy flight, clearance, dock and completed Store',()=>{
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
 assert.equal(c.q.inspect().capitalShip.phase,'stored');
 assert.deepEqual(JSON.parse(c.storage.get(parkingKey)),{version:1,hull:'rift-fighter',generation,vessel:'bifrost'});
 assert.deepEqual([...c.storage].filter(([key])=>key!==parkingKey),[...before]);
 const dest=launch({route:'?hangar=carrier&vessel=bifrost',homeVessel:'rift-carrier',existingStorage:c.storage,hulls:['bastion-9']});
 assert.equal(dest.e['player-hangar-view'].hidden,false);
 dest.board();assert.equal(dest.e['cockpit-launch'].disabled,false);
 const origin=launch({route:'?hangar=carrier&vessel=rift-carrier',homeVessel:'rift-carrier',existingStorage:c.storage,hulls:['bastion-9']});
 assert.equal(origin.e['player-hangar-view'].hidden,true);
 assert.match(origin.e['guest-hangar-local'].textContent,/Bastion-9/);
 origin.q.click('guest-hangar-local');assert.equal(origin.e['player-hangar-view'].hidden,false);
 assert.equal(origin.e['hangar-ship-name'].textContent,'Bastion-9 Fleet Fighter');
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
test('airborne map accepts a valid choice only from its loaded same-origin iframe and arrives ready for normal docking',()=>{
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
  requestAndDock(c);c.q.click('capital-store-action');c.q.step(3);
  assert.equal(JSON.parse(c.storage.get(parkingKey)).vessel,target);
 }
});
