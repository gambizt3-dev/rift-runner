'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {setup}=require('./ballistic.test.cjs');
const files=['../dist','..'].map(dir=>path.join(__dirname,dir)).find(dir=>fs.existsSync(path.join(dir,'index.html')));
const flt='rift-fighter',swift='bastion-9',key='rift-runner.selected-fighter.v1';
function fixture(ownsSwift=true,reducedMotion=true,bifrost=false,readyCount=6,replace,pilotCount=5,sprite=false){
 const parts={engine:'stock-thruster',core:'weifer-he3-core',battery:'kestrel-h20-reserve-cell',primary:'blaster'};
 const owned=Object.values(parts);
 const storage=new Map([['rift-runner.character-generation.v1','selector-fixture'],
  ['rift-runner.hull-owned.v1',JSON.stringify({version:1,hull:flt,condition:'repaired',repairedAt:1})],
  ['rift-runner.ship-build.v1',JSON.stringify({version:1,hull:flt,...parts})],
  ['rift-runner.hull-owned.v1.'+swift,JSON.stringify({version:1,hull:swift,condition:'repaired',repairedAt:1})]]);
 const q=setup({sprite,cockpitUI:true,flightShell:true,sharedStorage:storage,loadPilotMissions:true,loadFighters:true,buildUI:true,reducedMotion,
  homeVessel:bifrost?'bifrost':undefined,
  wingStats:async url=>({ok:true,json:async()=>({version:1,vesselId:url.split('/').at(-2),
   armada:{launchReady:{fighters:readyCount,availableNpcPilots:pilotCount}}})}),
  address:{search:bifrost?'?hangar=carrier&vessel=bifrost':'?hangar=carrier',origin:'https://rift.example',replace},
  pilotCredits:{getBuildState:()=>({origin:'new',owned}),owns:id=>owned.includes(id),ownsHull:id=>ownsSwift&&id===swift}});
 const e=q.el;
 e['formation-pilot'].options=[{value:'basic',textContent:''}];
 return {q,e,storage};
}
test('tap the banner to show the bay; cockpit and launch require separate taps',()=>{
 const {q,e,storage}=fixture();
 const picker=e['hangar-preview-select'];
 let scrolled=0;e['hangar-repaired-bay'].scrollIntoView=()=>scrolled++;
 q.click('hangar-preview-select',{currentTarget:picker});
 assert.equal(scrolled,1);assert.equal(storage.get(key),undefined);assert.equal(q.inspect().state,'menu');
 q.click('hangar-ship-prev'); // Rift -> Swift, preview only.
 assert.equal(e['hangar-ship-name'].textContent,'Swift-2 Fleet Fighter');assert.equal(storage.get(key),undefined);
 q.click('hangar-preview-select',{currentTarget:picker});
 assert.equal(storage.get(key),swift);assert.equal(scrolled,2);
 assert.match(e['hangar-fighter-art'].getAttribute('src'),/bastion-9-fighter/);
 assert.notEqual(e['hangar-cockpit'].hidden,false);assert.equal(q.inspect().state,'menu');
 q.click('hangar-board');
 assert.equal(e['hangar-cockpit'].hidden,false);assert.equal(q.inspect().state,'menu');
 const starter=fixture();
 starter.q.click('hangar-preview-select',{currentTarget:starter.e['hangar-preview-select']});
 starter.q.click('hangar-board');
 starter.q.click('cockpit-launch');
 assert.equal(starter.q.inspect().capitalShip.phase,'docked','preflight goes to the launch deck without launching unattended');
 starter.q.click('capital-dock-action');
 assert.equal(starter.q.inspect().capitalShip.phase,'launching');
});
test('an unowned fighter can park as a temporary loaner, board, and fly solo without buying it',()=>{
 const {q,e,storage}=fixture(false);
 const saved=[...storage];
 q.click('hangar-ship-prev');
 const picker=e['hangar-preview-select'],rent=e['hangar-preview-rent'];
 assert.equal(picker.disabled,false);assert.equal(rent.hidden,false);
 q.click('hangar-preview-rent',{currentTarget:rent});
 assert.match(e['hangar-fighter-art'].getAttribute('src'),/bastion-9-fighter/);
 assert.equal(e['hangar-player-loadout'].hidden,true);
 assert.equal(e['hangar-formation-button'].hidden,true);
 assert.equal(q.inspect().state,'menu');
 assert.deepEqual([...storage],saved);
 q.click('hangar-board');
 assert.equal(e['hangar-cockpit'].hidden,false);
 assert.deepEqual(e['cockpit-order'].options.map(option=>option.value),['','loaner-test']);
 q.click('cockpit-launch');
 const {capitalShip,flightMode}=q.inspect();
 assert.equal(flightMode.loaner,swift);
 assert.equal(flightMode.hangarTrial,true);
 assert.equal(capitalShip.phase,'docked');
 assert.equal(capitalShip.wingDeckOrder,undefined);
 assert.deepEqual([...storage],saved);
});
test('returning a test fighter restores the owned hull and saved fitting',()=>{
 const {q,e,storage}=fixture(false);
 const build=storage.get('rift-runner.ship-build.v1');
 q.click('hangar-ship-prev');q.click('hangar-preview-select');
 q.click('hangar-return-loaner');
 assert.equal(e['hangar-fighter-art'].getAttribute('src'),'./fighter-winged.png?v=23');
 assert.equal(e['hangar-player-loadout'].hidden,false);
 assert.equal(q.inspect().fighterFit.primary,'blaster');
 assert.equal(storage.get('rift-runner.ship-build.v1'),build);
 assert.equal(storage.has(key),false);
});
test('Hangar has a tap target in the banner, with the same cockpit art and a separate boarding button',()=>{
 const html=fs.readFileSync(path.join(files,'index.html'),'utf8');
 const picker=html.indexOf('id="hangar-preview-select"');
 assert.ok(picker>html.indexOf('id="hangar-repaired-bay"'));
 assert.ok(picker>html.indexOf('id="hangar-bay-actions"'));
 const wing=html.indexOf('id="hangar-wing-mount"');
 assert.ok(wing>html.indexOf('id="hangar-bay-actions"')&&wing<picker);
 assert.match(html,/<figure class="hangar-ship-banner">[\s\S]*?<button id="hangar-preview-select"[^>]*type="button"/);
 assert.match(html,/id="hangar-board"[^>]*>Get in cockpit<\/button>/);
 assert.match(html,/hangar-cockpit-pov-v2\.webp/);
});
test('two distinct hangar rooms show exactly four landing pads and a 3×3 planning grid',()=>{
 const read=f=>fs.readFileSync(path.join(files,f),'utf8'),html=read('index.html'),css=read('style.css');
 for(const id of ['hangar-repaired-bay','hangar-damaged-bay']){
  const figure=html.slice(html.indexOf('id="'+id+'"'));const body=figure.slice(0,figure.indexOf('</figure>'));
  assert.equal(new Set([...body.matchAll(/hangar-berth bay-(\d+)/g)].map(m=>m[1])).size,4);
  assert.match(body,/class="hangar-deck-window"/);
  assert.doesNotMatch(body,/hangar-deck-scroll/);
 }
 const grid=html.match(/<fieldset id="corsair-wing-slot"[\s\S]*?<\/fieldset>/)[0];
 assert.equal([...grid.matchAll(/id="wing-pad-/g)].length,8);
 assert.doesNotMatch(grid,/<img[^>]+src=/);
 assert.match(css,/hangar-formation-hall\.webp/);
 assert.doesNotMatch(css,/230% 240% no-repeat/);
 assert.match(css,/\.hangar-camera::after\{[^}]*inset:100% 0 auto;z-index:5;[^}]*pointer-events:none/);
 assert.match(css,/height:100%;z-index:0;background:url\("\.\/hangar-ten-bay-deck\.webp"\) center top\/100% 240%/);
 assert.doesNotMatch(css,/#hangar-wing-mount:has\(> \[hidden\]\)/);
 assert.match(css,/#hangar-wing-mount:not\(:has\(> :not\(\[hidden\]\)\)\)/);
 assert.match(css,/\.hangar-formation-room\{[^}]*inset:100% 0 auto/);
 assert.match(css,/\[data-formation="out"\][^}]*translateY\(-100%\)/);
 assert.match(css,/\[data-formation="align"\][^}]*left:50%/);
 assert.doesNotMatch(css,/translateX\(-100%\)/);
 assert.equal([...html.matchAll(/class="hangar-lift-smoke" aria-hidden="true">(?:<i><\/i>){8}/g)].length,2);
 assert.match(css,/animation:hangar-lift-dust/);
 assert.match(css,/data-formation="turn"[^}]*data-formation="arrival-turn"[^}]*animation:hangar-hover-dust \.82s linear infinite/);
 assert.match(css,/data-formation="return-lift"[^}]*top:var\(--formation-lead-y\)/);
 assert.match(css,/data-formation="touchdown"[^}]*top:var\(--formation-lead-y\)/);
 assert.match(grid,/id="wing-pad-front-left"[\s\S]*You · Lead[\s\S]*id="wing-pad-front-right"/);
 assert.match(grid,/id="wing-pad-front" aria-label="Centre"/);
 assert.match(css,/--formation-lead-y:calc\(124\.6667%/);assert.match(css,/grid-template-rows:repeat\(3,minmax\(0,1fr\)\)/);
});
test('formation button spools the engine, lifts and turns before taxiing down the lane',async()=>{
 const {q,e}=fixture(true,false);
 const view=e['player-hangar-view'],room=e['hangar-formation-room'],button=e['hangar-formation-button'];
 assert.equal(button.hidden,false);
 q.click('hangar-formation-button');
 assert.equal(view.dataset.formation,'spool');assert.equal(room.inert,true);
 await new Promise(resolve=>setImmediate(resolve));
 assert.equal(q.inspect().formationEngine?.ready,true);
 assert.equal(q.inspect().engineVoiceActive,true,'engine is active before lifting');
 q.advanceTimers(319);assert.equal(view.dataset.formation,'spool');
 q.advanceTimers(1);assert.equal(view.dataset.formation,'lift');
 q.advanceTimers(520);assert.equal(view.dataset.formation,'turn','fighter turns while still hovering over its pad');
 q.advanceTimers(610);assert.equal(view.dataset.formation,'align');assert.equal(room.inert,true);
 q.advanceTimers(1020);assert.equal(view.dataset.formation,'out');assert.equal(room.inert,true);
 q.advanceTimers(1800);assert.equal(view.dataset.formation,'out','taxi continues at a slow pace down the lane');
 q.advanceTimers(760);assert.equal(view.dataset.formation,'arrival-turn');assert.equal(room.inert,true);
 q.advanceTimers(1120);assert.equal(view.dataset.formation,'settle');assert.equal(room.inert,true);
 assert.equal(q.inspect().engineVoiceActive,false,'engine fades as the fighter settles');
 q.advanceTimers(600);assert.equal(view.dataset.formation,'touchdown');assert.equal(room.inert,true);
 q.advanceTimers(500);assert.equal(view.dataset.formation,'ready');assert.equal(room.inert,false);
 assert.equal(button.getAttribute('aria-expanded'),'true');
 q.click('hangar-formation-button');assert.equal(view.dataset.formation,'return-spool');assert.equal(room.inert,true);
 q.advanceTimers(320);assert.equal(view.dataset.formation,'return-lift');
 q.advanceTimers(640);assert.equal(view.dataset.formation,'back');
 q.advanceTimers(2560);assert.equal(view.dataset.formation,'park');
 q.advanceTimers(1020);assert.equal(view.dataset.formation,'lower');
 q.advanceTimers(420);assert.equal(view.dataset.formation,'');assert.equal(q.inspect().state,'menu');
});
test('the pilot can board from the formation hall and return without going back to their landing pad',()=>{
 const {q,e}=fixture();
 q.click('hangar-formation-button');assert.equal(e['hangar-formation-room'].inert,false);
 q.click('hangar-board');assert.equal(e['hangar-cockpit'].hidden,false);
 assert.equal(e['player-hangar-view'].dataset.formation,'ready');
 q.click('cockpit-exit');
 assert.equal(e['hangar-cockpit'].hidden,true);
 assert.equal(e['player-hangar-view'].dataset.formation,'ready');
 assert.equal(e['hangar-formation-room'].inert,false);
});
test('formation hall to cockpit to the Battle Fleet Map starts docked on a real carrier pad on both carriers',()=>{
 for(const bifrost of [false,true]){
  const {q,e}=fixture(true,true,bifrost);
  q.click('hangar-formation-button');q.click('hangar-board');
  assert.equal(e['hangar-cockpit'].hidden,false);
  assert.match(e['cockpit-launch-status'].textContent,/launch pad on the Battle Fleet Map/);
  q.click('cockpit-launch');
  const {capitalShip:ship}=q.inspect();
  assert.equal(ship.phase,'docked');
  assert.equal(ship.pads.length,4);
  assert.ok(ship.pads[ship.pad]);
  assert.equal(ship.name,bifrost?'Bifrost':'Pegasus');
  q.click('capital-dock-action');assert.equal(ship.phase,'launching');
 }
});
test('the boarding animation zooms onto the formation lead rather than resetting the camera',()=>{
 const {q,e}=fixture(true,false);
 q.click('hangar-formation-button');
 assert.equal(e['hangar-board'].disabled,true,'wait for the ferry to the formation hall');
 q.click('hangar-board');assert.equal(e['hangar-cockpit'].hidden,true);
 q.advanceTimers(7250);
 q.click('hangar-board');
 assert.equal(e['player-hangar-view'].dataset.formation,'ready');
 assert.equal(e['player-hangar-view'].dataset.boarding,'canopy');
 q.advanceTimers(1080);
 assert.equal(e['player-hangar-view'].dataset.boarding,'zoom');
 q.advanceTimers(360);
 assert.equal(e['hangar-cockpit'].hidden,false);
});
test('the pad allocator keeps one random recovery pad open and fits nine fighters in three FIFO waves',()=>{
 const {q}=fixture(),{chooseRecoveryPad,wingLaunchWave}=q.wingDeckForTest;
 const pads=[0,1,2,3],busy=new Set([2]);
 assert.equal(chooseRecoveryPad(pads,busy,0),0);
 assert.equal(chooseRecoveryPad(pads,busy,.5),1);
 assert.equal(chooseRecoveryPad(pads,busy,.99),3);
 const fighters=Array.from({length:9},(_,i)=>i+1);
 const reserved=chooseRecoveryPad(pads,busy,.5);
 assert.deepEqual(Array.from(wingLaunchWave(fighters,pads,reserved,busy),x=>x.pad),[0,3]);
 for(let i=0;i<9;i+=3){
  assert.deepEqual(Array.from(wingLaunchWave(fighters.slice(i),pads,reserved,new Set()),x=>[x.pad,x.craft]),[[0,i+1],[2,i+2],[3,i+3]]);
 }
});
test('Pegasus practice traffic taxis only after the player clears; the returning escort uses the opening and retains HP on relaunch',async()=>{
 const {q,storage}=fixture(),api=q.wingDeckForTest;
 storage.set('rift-runner.corsair-wing.v1',JSON.stringify({generation:'selector-fixture',enabled:true}));
 q.mockRandom(0);q.click('hangar-formation-button');q.click('hangar-board');
 await new Promise(resolve=>setImmediate(resolve));q.click('cockpit-launch');
 const ship=q.inspect().capitalShip;
 assert.equal(ship.phase,'docked');
 assert.ok(ship.wingDeckOrder);
 assert.notEqual(ship.recoveryPad,ship.pad);
 api.advanceCapitalTraffic(ship,.09);
 assert.ok(!ship.deckCrew.some(crew=>crew.corsair));
 q.click('capital-dock-action');q.step(4);
 assert.equal(ship.phase,'flight');
 for(let i=0;i<4;i++)api.advanceCapitalTraffic(ship,.09);
 const departure=ship.deckCrew.find(crew=>crew.corsair);
 assert.equal(departure.phase,'taxi');assert.notEqual(departure.pad,ship.recoveryPad);
 for(let i=0;i<150;i++)api.advanceCapitalTraffic(ship,.09);
 const escort=q.inspect().wingman;
 assert.ok(escort?.corsairWing);
 escort.hp=7;escort.he3=11;
 api.startCapitalCapture();
 assert.equal(q.inspect().wingman,null);
 assert.equal(ship.wingIntake.craft,escort);
 for(let i=0;i<150;i++)api.advanceCapitalTraffic(ship,.09);
 assert.equal(ship.storedWing,escort);
 assert.equal(ship.wingIntake,null);
 ship.phase='docked';ship.berthMove=null;
 q.click('capital-dock-action');q.step(4);
 for(let i=0;i<150;i++)api.advanceCapitalTraffic(ship,.09);
 assert.equal(q.inspect().wingman,escort);
 assert.equal(escort.hp,7);assert.equal(escort.he3,11);
});

test('Bifrost can assign a carrier wingman without changing Pegasus’s slot',async()=>{
 const {q,e,storage}=fixture(true,true,true);
 q.click('hangar-formation-button');q.click('formation-add-wing');q.click('wing-pad-trail');
 await new Promise(resolve=>setImmediate(resolve));
 assert.equal(e['formation-pad-picker'].hidden,false);
 assert.equal(e['formation-pad-assign'].disabled,false);
 q.click('formation-pad-assign');
 assert.equal(JSON.parse(storage.get('rift-runner.corsair-wing.v1.bifrost')).pad,'trail');
 assert.equal(storage.has('rift-runner.corsair-wing.v1'),false);
 assert.equal(e['wing-art-trail'].hidden,false);
});
test('four-pad boarding remains solo even if an escort is assigned, but formation-hall boarding queues it on each carrier’s own deck',async()=>{
 for(const bifrost of [false,true]){
  const key='rift-runner.corsair-wing.v1'+(bifrost?'.bifrost':'');
  const prep=q=>q.storage.set(key,JSON.stringify({generation:'selector-fixture',enabled:true,pad:'side-left'}));
  const solo=fixture(true,true,bifrost);
  prep(solo.q);solo.q.click('hangar-board');solo.q.click('cockpit-launch');
  const soloShip=solo.q.inspect().capitalShip;
  assert.equal(soloShip.phase,'docked');
  assert.equal(soloShip.wingDeckOrder,undefined);
  const wing=fixture(true,true,bifrost);
  prep(wing.q);wing.q.click('hangar-formation-button');wing.q.click('hangar-board');wing.q.click('cockpit-launch');
  await new Promise(resolve=>setImmediate(resolve));
  const ship=wing.q.inspect().capitalShip;
  assert.equal(ship.phase,'docked');
  assert.deepEqual(Array.from(ship.pads,pad=>Array.from(pad)),bifrost?[[-77,71],[77,71],[-88,112],[88,112]]:[[-12,84],[12,84],[-12,128],[12,128]]);
  assert.equal(ship.lift.x,bifrost?-50:0);
  assert.equal(ship.wingDeckOrder.name,(bifrost?'Bifrost':'Pegasus')+' Wing Two');
  assert.notEqual(ship.recoveryPad,ship.pad);
  wing.q.click('capital-dock-action');wing.q.step(6);
  for(let i=0;i<150;i++)wing.q.wingDeckForTest.advanceCapitalTraffic(ship,.09);
  assert.equal(wing.q.inspect().wingman?.displayName,(bifrost?'Bifrost':'Pegasus')+' Wing Two');
 }
});
test('Bifrost retains the assignment when there is no fighter available and does not conjure a wingman',async()=>{
 const {q,e,storage}=fixture(true,true,true,0);
 storage.set('rift-runner.corsair-wing.v1.bifrost',JSON.stringify({generation:'selector-fixture',enabled:true,pad:'trail'}));
 q.click('hangar-formation-button');q.click('hangar-board');q.click('cockpit-launch');
 await new Promise(resolve=>setImmediate(resolve));
 assert.equal(q.inspect().capitalShip,null);
 assert.match(e['cockpit-launch-status'].textContent,/Wingman cannot launch/);
 assert.equal(JSON.parse(storage.get('rift-runner.corsair-wing.v1.bifrost')).pad,'trail');
});
test('Add wingman opens the selected pad, saves independent pilot and hull keys, adds and removes independent pads without placeholder art',async()=>{
 const {q,e,storage}=fixture();
 const flush=()=>new Promise(resolve=>setImmediate(resolve));
 q.click('hangar-formation-button');
 assert.equal(e['wing-art-front-left'].hidden,true);
 q.click('wing-pad-front-left');
 assert.notEqual(e['formation-pad-picker'].hidden,false,'an unarmed empty pad does not open by mistake');
 q.click('formation-add-wing');
 assert.equal(e['formation-add-wing'].getAttribute('aria-pressed'),'true');
 q.click('wing-pad-front-left');await flush();
 assert.equal(e['formation-pad-picker'].getAttribute('data-pad'),'front-left');
 assert.equal(e['formation-pad-assign'].disabled,false);
 q.click('formation-pad-assign');
 const data=JSON.parse(storage.get('rift-runner.corsair-wing.v1'));
 assert.equal(data.pilot,'basic');assert.equal(data.fighter,'rift-fighter');assert.equal(data.enabled,true);
 assert.equal(e['wing-art-front-left'].hidden,false);assert.equal(e['wing-art-trail'].hidden,true);
 q.click('formation-add-wing');q.click('wing-pad-trail');q.click('formation-pad-assign');
 assert.equal(e['wing-art-front-left'].hidden,false);assert.equal(e['wing-art-trail'].hidden,false);
 q.click('wing-pad-trail');q.click('formation-pad-remove');
 assert.equal(e['wing-art-trail'].hidden,true);
 assert.deepEqual(JSON.parse(storage.get('rift-runner.corsair-wing.v1')).slots,['front-left']);
 q.click('wing-pad-front-left');q.click('formation-pad-remove');
 assert.equal(JSON.parse(storage.get('rift-runner.corsair-wing.v1')).enabled,false);
});
test('Basic NPC count goes down once per planned bot and restores on removal',async()=>{
 const {q,e}=fixture(),option=e['formation-pilot'].options[0];
 q.click('hangar-formation-button');
 const open=()=>{q.click('formation-add-wing');q.click('wing-pad-trail');};
 open();
 assert.equal(option.textContent,'Basic NPC - (checking…)');
 await new Promise(resolve=>setImmediate(resolve));
 assert.equal(option.textContent,'Basic NPC - (5 left)');
 q.click('formation-pad-assign');q.click('wing-pad-trail');
 assert.equal(option.textContent,'Basic NPC - (4 left)');
 q.click('formation-pad-assign');q.click('wing-pad-trail');
 assert.equal(option.textContent,'Basic NPC - (4 left)');
 q.click('formation-pad-remove');open();
 assert.equal(option.textContent,'Basic NPC - (5 left)');
});
test('decorative ship art never enables an assignment when real launch inventory has no Rift-3s',async()=>{
 const {q,e,storage}=fixture(true,true,false,0);
 q.click('hangar-formation-button');q.click('formation-add-wing');q.click('wing-pad-trail');
 await new Promise(resolve=>setImmediate(resolve));
 assert.equal(e['formation-pad-assign'].disabled,true);
 assert.match(e['formation-pad-note'].textContent,/No launch-ready Rift-3/);
 q.click('formation-pad-assign');
 assert.equal(storage.has('rift-runner.corsair-wing.v1'),false);
});
test('Loadout belongs to the selected parked fighter, and previewing never swaps or overwrites it',()=>{
 const {q,e,storage}=fixture();
 const select=()=>q.click('hangar-preview-select',{currentTarget:e['hangar-preview-select']});
 const riftSave=storage.get('rift-runner.ship-build.v1');
 assert.equal(q.inspect().fighterFit.primary,'blaster');
 assert.equal(q.inspect().fighterLoadout.engine,'stock-thruster');
 q.click('hangar-ship-prev');
 assert.equal(q.inspect().fighterFit.primary,'blaster');
 select();
 assert.equal(q.inspect().fighterLoadout.fighter,'bastion-9');
 assert.equal(q.inspect().fighterFit.primary,'sparrow-s2');
 assert.equal(q.inspect().fighterFit.secondary,'sparrow-s2');
 assert.equal(q.inspect().fighterLoadout.engine,null);
 q.click('hangar-ship-next');select();
 assert.equal(q.inspect().fighterFit.primary,'blaster');
 assert.equal(q.inspect().fighterLoadout.engine,'stock-thruster');
 assert.equal(storage.get('rift-runner.ship-build.v1'),riftSave);
});
test('decorative parked fighters vary by visit, never occupy the player berth, and leave an empty pad on both carriers',()=>{
 for(const bifrost of [false,true]){
  const {q,e,storage}=fixture(true,true,bifrost),api=q.hangarAmbientForTest;
  const bays=['01','02','04','06'];
  const before=[...storage];
  const visible=(view)=>bays.filter(bay=>!e['hangar-ambient-'+view+'-'+bay].hidden);
  for(const bay of bays){
   api.paintHangarAmbient(bay);
   const occupied=visible('ready');
   assert.ok(occupied.length===1||occupied.length===2);
   assert.ok(!occupied.includes(bay));
   assert.deepEqual(occupied,visible('damaged'));
   assert.ok(occupied.every(b=>/fighter|winged/.test(e['hangar-ambient-ready-'+b].getAttribute('src'))));
  }
  assert.deepEqual([...storage],before,'decorative traffic never changes saved roster, inventory or berths');
  const small=api.rollHangarAmbient(()=>0),large=api.rollHangarAmbient(()=>.99);
  assert.equal(small.count,1);assert.equal(large.count,2);
  assert.notEqual(small.order.join(','),large.order.join(','));
  assert.notEqual(small.hulls['01'],large.hulls['01']);
 }
});
test('the unarmed Civilian Freighter previews, parks and launches from either carrier’s hangar selector',()=>{
 for(const bifrost of [false,true]){
  let destination;
  const {q,e,storage}=fixture(true,true,bifrost,6,href=>destination=href,5,true);
  const saved=[...storage];
  q.click('hangar-ship-prev');q.click('hangar-ship-prev');
  assert.equal(e['hangar-ship-name'].textContent,'Civilian Freighter');
  assert.match(e['hangar-ship-banner-art'].getAttribute('src'),/civilian-freighter-terminal-preview/);
  q.click('hangar-preview-select',{currentTarget:e['hangar-preview-select']});
  assert.equal(e['hangar-fighter-art'].getAttribute('src'),'./civilian-freighter-pad.webp');
  assert.equal(e['hangar-repaired-bay'].hidden,false);
  assert.equal(e['hangar-player-loadout'].hidden,true);
  assert.equal(e['hangar-formation-button'].hidden,true);
  q.click('hangar-return-loaner');
  assert.match(e['hangar-fighter-art'].getAttribute('src'),/fighter-winged/);
  q.click('hangar-ship-prev');q.click('hangar-ship-prev');
  q.click('hangar-preview-rent',{currentTarget:e['hangar-preview-rent']});
  q.click('hangar-board');
  assert.deepEqual(e['cockpit-order'].options.map(option=>option.value),['','loaner-test']);
  assert.equal(e['cockpit-scene-art'].getAttribute('src'),bifrost?'./civilian-freighter-cockpit.webp':'./civilian-freighter-pegasus-cockpit.webp');
  assert.match(e['cockpit-scene-art'].getAttribute('alt'),/co-pilot/);
  assert.equal(e['cockpit-launch'].textContent,'Go to launch deck');
  q.click('cockpit-exit');q.click('hangar-return-loaner');q.click('hangar-board');
  assert.equal(e['cockpit-scene-art'].getAttribute('src'),'./rift-3-hangar-cockpit-wide.webp');
  q.click('cockpit-exit');q.click('hangar-ship-prev');q.click('hangar-ship-prev');
  q.click('hangar-preview-rent',{currentTarget:e['hangar-preview-rent']});q.click('hangar-board');
  q.click('cockpit-launch');
  const run=q.inspect();
  assert.equal(run.state,'play');
  assert.equal(run.flightMode.hangarTrial,true);
  assert.equal(run.flightMode.id,'free-flight');
  assert.ok(run.capitalShip.stream);
  q.step();
  const freighter=q.sprites.find(frame=>frame.src==='./civilian-freighter-pad.webp');
  assert.ok(freighter,'the live flight renderer requests the approved freighter art');
  Object.assign(freighter,{complete:true,naturalWidth:594,naturalHeight:650});
  q.step();const drawn=q.spriteFrames.find(frame=>frame.asset===freighter);
  assert.ok(drawn);
  if(run.capitalShip){
   const riftOnPadLength=56.44*.33;
   assert.ok(drawn.bounds[3]>riftOnPadLength*1.25&&drawn.bounds[3]<riftOnPadLength*1.45);
  }
  if(run.capitalShip){
   assert.equal(run.capitalShip.vessel.name,bifrost?'Bifrost':'Pegasus');
   assert.equal(run.capitalShip.phase,'docked');
   q.click('capital-dock-action');assert.equal(q.inspect().capitalShip.phase,'launching');
   q.step(5);assert.equal(q.inspect().capitalShip.phase,'flight');
   q.spriteFrames.length=0;q.step();assert.equal(q.spriteFrames.find(frame=>frame.asset===freighter)?.bounds[3],116.48);
  }else assert.equal(!!run.capitalShip,false);
  assert.equal(!!q.inspect().resoluteFormation(run.capitalShip,10),!bifrost);
  assert.equal(e['freighter-view-open'].hidden,false);
  q.click('freighter-view-open');
  assert.equal(e['freighter-cockpit-view'].open,true);
  assert.equal(e['freighter-flight-art'].getAttribute('src'),'./civilian-freighter-cockpit.webp');
  assert.equal(run.flightMode.duel,false);
  assert.equal(run.p.fighter,'civilian-freighter');
  assert.equal(run.fighterLoadout.engine,'hauler-drive');
  assert.equal(run.fighterFit.primary,null);assert.equal(run.fighterFit.secondary,null);
  assert.equal(e['fire-button'].disabled,true);
  q.click('return-main-menu');
  assert.equal(destination,'./index.html?hangar=carrier&vessel='+(bifrost?'bifrost':'rift-carrier'));
  assert.equal(q.inspect().fighterFit.primary,'blaster');
  assert.deepEqual([...storage],saved);
 }
});

test('eight selected wingmen launch on Free Flight in waves of three, three, and two with a recovery pad',async()=>{
 const slots=['front-left','front-right','side-left','front','line-abreast','echelon-left','trail','echelon-right'];
 for(const bifrost of [false,true]){
  const {q,e,storage}=fixture(true,true,bifrost,8,undefined,8);
  q.click('hangar-formation-button');
  for(const slot of slots){
   q.click('formation-add-wing');q.click('wing-pad-'+slot);
   await new Promise(resolve=>setImmediate(resolve));
   assert.equal(e['formation-pad-assign'].disabled,false);
   q.click('formation-pad-assign');
   assert.equal(e['wing-pad-'+slot].getAttribute('aria-pressed'),'true');
  }
  const key='rift-runner.corsair-wing.v1'+(bifrost?'.bifrost':'');
  assert.deepEqual(JSON.parse(storage.get(key)).slots,slots);
  q.click('hangar-board');q.click('cockpit-launch');
  const ship=q.inspect().capitalShip;
  assert.equal(ship.phase,'docked');assert.equal(ship.formationTestQueue.length,8);
  assert.notEqual(ship.recoveryPad,ship.pad);
  q.click('capital-dock-action');q.step(6);
  const waves=[];
  let loaded=8;
  for(let i=0;i<400;i++){
   q.wingDeckForTest.advanceCapitalTraffic(ship,.09);
   const orders=Array.from(ship.deckCrew).filter(order=>order.formationTest);
   assert.ok(orders.length<=3);
   assert.equal(new Set(orders.map(order=>order.pad)).size,orders.length);
   assert.ok(orders.every(order=>order.pad!==ship.recoveryPad));
   if(ship.formationTestQueue.length<loaded){waves.push(loaded-ship.formationTestQueue.length);loaded=ship.formationTestQueue.length;}
  }
  assert.deepEqual(waves,[3,3,2]);assert.equal(ship.deckCrew.length,0);
  q.wingDeckForTest.startCapitalCapture();
  assert.equal(ship.formationTestQueue.length,8,'all eight living simulation craft return to the queue');
  assert.ok(ship.formationTestQueue.every(order=>order.craft.hp>0));
 }
});
test('an extra pad is unavailable after the last launch-ready pilot or Rift-3 is assigned',async()=>{
 for(const [fighters,pilots] of [[1,4],[4,1]]){
  const {q,e}=fixture(true,true,false,fighters,undefined,pilots);
  q.click('hangar-formation-button');q.click('formation-add-wing');q.click('wing-pad-trail');
  await new Promise(resolve=>setImmediate(resolve));q.click('formation-pad-assign');
  q.click('formation-add-wing');q.click('wing-pad-front-left');
  assert.equal(e['formation-pad-assign'].disabled,true);
  assert.match(e['formation-pad-note'].textContent,/No spare/);
 }
});

test('flight telemetry is below the cockpit banner and above the touch controls',()=>{
 const html=fs.readFileSync(path.join(files,'index.html'),'utf8');
 const banner=html.indexOf('id="flight-action-strip"'),hud=html.indexOf('id="flight-vitals"'),controls=html.indexOf('id="flight-deck"');
 assert.ok(banner>0&&banner<hud&&hud<controls);
 for(const id of ['compact-hull','flight-he3-meter','flight-heat-meter']){
  assert.equal(html.split('id="'+id+'"').length,2);
  assert.ok(html.indexOf('id="'+id+'"')>hud);
 }
});


test('airborne carrier patrols and freighter exchange momentum by fitted mass without friendly damage',()=>{
 const {q,e}=fixture();
 q.click('hangar-ship-prev');q.click('hangar-ship-prev');
 q.click('hangar-preview-rent',{currentTarget:e['hangar-preview-rent']});q.click('hangar-board');q.click('cockpit-launch');
 q.click('capital-dock-action');q.step(5);
 const {p,capitalShip,berthWorld}=q.inspect(),crew=capitalShip.deckCrew[0];
 assert.ok(crew);assert.equal(capitalShip.phase,'flight');
 crew.phase='patrol';crew.phaseTime=5;
 q.step();
 const at=berthWorld(capitalShip,crew.lx,crew.ly),hp=p.hp;
 Object.assign(p,{x:at.x-9,y:at.y,vx:50,vy:0});
 q.step();
 const next=berthWorld(capitalShip,crew.lx,crew.ly);
 assert.equal(p.weight,174,'130 hull + 30 engine + 8 generator + 6 battery');
 assert.ok(Math.hypot(next.x+crew.drift.x-p.x,next.y+crew.drift.y-p.y)>p.r+16.9);
 assert.ok(crew.drift.x>at.x-p.x-9,'the lighter Rift gives more ground than the freighter');
 assert.equal(p.hp,hp);
});


test('the freighter can redock at Pegasus, store, and open the hangar without changing player ownership',()=>{
 let destination;
 const {q,e,storage}=fixture(true,true,false,6,href=>destination=href);
 const save=[...storage];
 q.click('hangar-ship-prev');q.click('hangar-ship-prev');
 q.click('hangar-preview-rent',{currentTarget:e['hangar-preview-rent']});q.click('hangar-board');q.click('cockpit-launch');
 q.click('capital-dock-action');q.step(5);
 const {p,capitalShip,capitalDockCheck,berthVelocity}=q.inspect();
 q.click('capital-dock-action');
 const check=capitalDockCheck(),v=berthVelocity(...capitalShip.pads[capitalShip.pad]);
 Object.assign(p,{x:check.port.x,y:check.port.y,vx:v.x,vy:v.y});
 q.click('capital-dock-action');q.step(4);
 assert.equal(capitalShip.phase,'docked');
 assert.equal(e['capital-store-action'].hidden,false);
 q.click('capital-store-action');q.step(4);assert.equal(capitalShip.phase,'stored');
 assert.equal(e['capital-hangar'].hidden,false);
 q.click('capital-hangar');
 assert.equal(destination,'./index.html?hangar=carrier&vessel=rift-carrier');
 assert.deepEqual([...storage],save);
});


test('camera controls are inside Flight Settings and the utility buttons sit below the dashboard',()=>{
 const html=fs.readFileSync(path.join(files,'index.html'),'utf8');
 const cockpit=html.indexOf('id="flight-action-strip"'),instruments=html.indexOf('id="arena-toolbar"');
 const settings=html.indexOf('id="arena-settings"'),camera=html.indexOf('id="flight-view"');
 assert.ok(cockpit<instruments&&instruments<html.indexOf('id="pause-flight"'));
 assert.ok(html.indexOf('id="pause-flight"')<settings&&settings<camera);
 assert.ok(camera<html.indexOf('</details>',settings));
});

test('own Rift-3 opens its own night cockpit and keeps the window clear of the flight controls',()=>{
 const {q,e}=fixture();q.click('hangar-board');q.click('cockpit-launch');
 assert.equal(e['flight-canopy'].dataset.hull,'rift-fighter');
 q.click('freighter-view-open');
 assert.equal(e['freighter-cockpit-view'].getAttribute('aria-label'),'Rift-3 cockpit');
 assert.equal(e['freighter-flight-art'].getAttribute('src'),'./rift-3-space-cockpit.webp');
 const html=fs.readFileSync(path.join(files,'index.html'),'utf8');
 assert.ok(html.indexOf('id="flight-canopy"')<html.indexOf('id="flight-action-strip"'));
});
test('every trial hull can dock and store at either home carrier regardless of entry route',()=>{
 for(const hull of ['rift-fighter','bastion-9','stocky-light-fighter','civilian-freighter'])for(const vessel of ['rift-carrier','bifrost'])for(const from of ['shop','hangar']){
  if(hull==='civilian-freighter'&&from==='hangar')continue; // selector route tested below
  let destination;const storage=new Map();
  const q=setup({cockpitUI:true,loadFighters:true,reducedMotion:true,sharedStorage:storage,
   address:{search:'?launch=custom&fighter='+hull+'&vessel='+vessel+'&from='+from,origin:'https://rift.example',replace:href=>destination=href}});
  assert.equal(q.inspect().flightMode.loaner,hull);
  completeLoanerDock(q,vessel,storage,()=>destination);
 }
 for(const bifrost of [false,true]){
  let destination;
  const {q,e,storage}=fixture(true,true,bifrost,6,href=>destination=href);
  q.click('hangar-ship-prev');q.click('hangar-ship-prev');
  q.click('hangar-preview-rent',{currentTarget:e['hangar-preview-rent']});q.click('hangar-board');q.click('cockpit-launch');
  completeLoanerDock(q,bifrost?'bifrost':'rift-carrier',storage,()=>destination);
 }
});
function completeLoanerDock(q,vessel,storage,destination){
 const before=[...storage];
 q.click('capital-dock-action');q.step(5);
 const {p,capitalShip,capitalDockCheck,berthVelocity}=q.inspect();
 assert.equal(capitalShip.phase,'flight');
 q.click('capital-dock-action');
 const check=capitalDockCheck(),v=berthVelocity(...capitalShip.pads[capitalShip.pad]);
 Object.assign(p,{x:check.port.x,y:check.port.y,vx:v.x,vy:v.y});
 q.click('capital-dock-action');q.step(4);
 assert.equal(capitalShip.phase,'docked');
 q.click('capital-store-action');q.step(4);
 assert.equal(capitalShip.phase,'stored');
 assert.equal(q.el['capital-hangar'].hidden,false);
 q.click('capital-hangar');
 assert.equal(destination(),'./index.html?hangar=carrier&vessel='+vessel);
 assert.deepEqual([...storage],before);
}

test('eight wingmen hold separate flight stations with the lead’s firing lane clear through a turn',async()=>{
 const {q}=fixture(true,true,false,10,undefined,10);
 q.click('hangar-formation-button');
 for(const slot of ['front-left','front-right','side-left','front','line-abreast','echelon-left','trail','echelon-right']){
  q.click('formation-add-wing');q.click('wing-pad-'+slot);await new Promise(resolve=>setImmediate(resolve));q.click('formation-pad-assign');
 }
 q.click('hangar-board');q.click('cockpit-launch');q.click('capital-dock-action');q.step(6);
 const {p,arena,capitalShip,inPlayerFireLane,flyWingman}=q.inspect();
 const settle=heading=>{
  Object.assign(p,{x:(arena.left+arena.right)/2,y:arena.top+350,vx:0,vy:0,aim:heading});
  const wings=q.inspect().formationEscorts;
  for(const [i,wing] of wings.entries()){wing.x=p.x+i;wing.y=p.y-55+i;wing.vx=wing.vy=0;}
  for(let i=0;i<290;i++)for(const wing of wings)flyWingman(wing,.016,[],[]);
  assert.equal(wings.length,8);
  assert.ok(wings.every(m=>!inPlayerFireLane(m,m.r)));
  for(const [i,a] of wings.entries())for(const b of wings.slice(i+1))assert.ok(Math.hypot(a.x-b.x,a.y-b.y)>a.r+b.r+12,JSON.stringify([heading,a.displayName,b.displayName,[a.x,a.y],[b.x,b.y],p.x,p.y,arena,a.formation,b.formation,a.formationHeading,p.aim]));
 };
 for(let i=0;i<460;i++)q.wingDeckForTest.advanceCapitalTraffic(capitalShip,.09);
 settle(-Math.PI/2);settle(Math.PI/2);
});

test('the owned cockpit shows only three flight modes; active Corsair remains on the Galaxy Map',()=>{
 for(const bifrost of [false,true]){
  const {q,e}=fixture(true,true,bifrost);
  q.click('hangar-board');q.click('cockpit-add-mode');
  assert.deepEqual(e['cockpit-order'].options.map(option=>option.value),['','free-flight','practice','solo-training']);
  assert.equal(e['cockpit-mode-picker'].hidden,false);
 }
 const chart=fs.readFileSync(path.join(files,'galaxy-map.js'),'utf8');
 assert.match(chart,/const join='.\/index\.html\?cross-battle=blackwake&join='/);
 assert.match(chart,/join\+'reinforce/);
 assert.match(chart,/refreshCross\(now\);updateCarrierStrip/);
 assert.doesNotMatch(chart,/refreshShared\((?:now|0)\);/);
});

test('Pegasus Free Flight launches the selected Swift-2, Bison-2, and unarmed Civilian Freighter',async()=>{
 const {q,e,storage}=fixture(true,true,false,4,undefined,4);
 q.click('hangar-formation-button');
 const plan={'front-left':'bastion-9','front-right':'stocky-light-fighter','trail':'civilian-freighter'};
 for(const [slot,hull] of Object.entries(plan)){
  q.click('formation-add-wing');q.click('wing-pad-'+slot);await new Promise(resolve=>setImmediate(resolve));
  e['formation-fighter'].value=hull;e['formation-fighter'].handlers.change({isTrusted:true});
  assert.equal(e['formation-pad-assign'].disabled,false);
  q.click('formation-pad-assign');
 }
 assert.deepEqual(JSON.parse(storage.get('rift-runner.corsair-wing.v1')).hulls,plan);
 assert.match(e['wing-art-trail'].getAttribute('src'),/civilian-freighter-pad/);
 q.click('hangar-board');q.click('cockpit-launch');q.click('capital-dock-action');q.step(6);
 const {capitalShip}=q.inspect();
 for(let i=0;i<430;i++)q.wingDeckForTest.advanceCapitalTraffic(capitalShip,.09);
 const escorts=Array.from(q.inspect().formationEscorts);
 assert.deepEqual(escorts.map(wing=>wing.fit.hull),Object.values(plan));
 assert.equal(escorts.at(-1).fit.weapons.length,0);
 assert.equal(escorts.at(-1).fit.weight,174);
 q.wingDeckForTest.startCapitalCapture();
 assert.deepEqual(Array.from(capitalShip.formationTestQueue,wing=>wing.hull),Object.values(plan));
});
