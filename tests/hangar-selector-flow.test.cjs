'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {setup}=require('./ballistic.test.cjs');
const files=['../dist','..'].map(dir=>path.join(__dirname,dir)).find(dir=>fs.existsSync(path.join(dir,'index.html')));
const flt='rift-fighter',swift='bastion-9',key='rift-runner.selected-fighter.v1';
function fixture(ownsSwift=true,reducedMotion=true,bifrost=false){
 const parts={engine:'stock-thruster',core:'weifer-he3-core',battery:'kestrel-h20-reserve-cell',primary:'blaster'};
 const owned=Object.values(parts);
 const storage=new Map([['rift-runner.character-generation.v1','selector-fixture'],
  ['rift-runner.hull-owned.v1',JSON.stringify({version:1,hull:flt,condition:'repaired',repairedAt:1})],
  ['rift-runner.ship-build.v1',JSON.stringify({version:1,hull:flt,...parts})],
  ['rift-runner.hull-owned.v1.'+swift,JSON.stringify({version:1,hull:swift,condition:'repaired',repairedAt:1})]]);
 const q=setup({cockpitUI:true,flightShell:true,sharedStorage:storage,loadPilotMissions:true,loadFighters:true,buildUI:true,reducedMotion,
  homeVessel:bifrost?'bifrost':undefined,
  address:{search:bifrost?'?hangar=carrier&vessel=bifrost':'?hangar=carrier',origin:'https://rift.example'},
  pilotCredits:{getBuildState:()=>({origin:'new',owned}),owns:id=>owned.includes(id),ownsHull:id=>ownsSwift&&id===swift}});
 const e=q.el;
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
test('unowned banner is not selectable; rental stays on the private Free Flight route',()=>{
 const {q,e,storage}=fixture(false);
 q.click('hangar-ship-prev');
 const picker=e['hangar-preview-select'],rent=e['hangar-preview-rent'];
 assert.equal(picker.disabled,true);assert.equal(rent.hidden,false);
 assert.match(rent.getAttribute('href'),/^\.\/index\.html\?launch=custom&fighter=bastion-9&vessel=rift-carrier&from=hangar$/);
 q.click('hangar-preview-select',{currentTarget:picker});assert.equal(storage.get(key),undefined);
 assert.equal(q.inspect().state,'menu');
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
 assert.equal([...grid.matchAll(/type="radio"/g)].length,8);
 assert.doesNotMatch(css,/#hangar-wing-mount:has\(> \[hidden\]\)/);
 assert.match(css,/#hangar-wing-mount:not\(:has\(> :not\(\[hidden\]\)\)\)/);
 assert.match(css,/\.hangar-formation-room\{[^}]*inset:100% 0 auto/);
 assert.match(css,/\[data-formation="out"\][^}]*translateY\(-100%\)/);
 assert.match(css,/\[data-formation="align"\][^}]*left:50%/);
 assert.doesNotMatch(css,/translateX\(-100%\)/);
 assert.equal([...html.matchAll(/class="hangar-lift-smoke" aria-hidden="true">(?:<i><\/i>){8}/g)].length,2);
 assert.match(css,/animation:hangar-lift-dust/);
 assert.match(grid,/You · Lead/);assert.match(css,/grid-template-rows:repeat\(3,minmax\(0,1fr\)\)/);
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
 q.advanceTimers(760);assert.equal(view.dataset.formation,'settle');assert.equal(room.inert,true);
 assert.equal(q.inspect().engineVoiceActive,false,'engine fades as the fighter settles');
 q.advanceTimers(620);assert.equal(view.dataset.formation,'ready');assert.equal(room.inert,false);
 assert.equal(button.getAttribute('aria-expanded'),'true');
 q.click('hangar-formation-button');assert.equal(view.dataset.formation,'back');assert.equal(room.inert,true);
 q.advanceTimers(2560);assert.equal(view.dataset.formation,'park');
 q.advanceTimers(1020);assert.equal(view.dataset.formation,'lower');
 q.advanceTimers(420);assert.equal(view.dataset.formation,'');assert.equal(q.inspect().state,'menu');
});
test('reduced motion skips transit without skipping selection, and boarding restores the landing room',()=>{
 const {q,e}=fixture();
 q.click('hangar-formation-button');assert.equal(e['hangar-formation-room'].inert,false);
 q.click('hangar-board');assert.equal(e['hangar-formation-room'].inert,true);
 assert.equal(e['player-hangar-view'].dataset.formation,'');assert.equal(e['hangar-cockpit'].hidden,false);
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
test('Pegasus practice traffic taxis only after the player clears; the returning escort uses the opening and retains HP on relaunch',()=>{
 const {q,storage}=fixture(),api=q.wingDeckForTest;
 storage.set('rift-runner.corsair-wing.v1',JSON.stringify({generation:'selector-fixture',enabled:true}));
 q.mockRandom(0);q.click('hangar-board');q.click('cockpit-launch');
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

test('Bifrost keeps the hover button and the formation grid without advertising a Pegasus NPC',()=>{
 const {q,e}=fixture(true,true,true);
 assert.equal(e['hangar-formation-button'].hidden,false);
 q.click('hangar-formation-button');
 assert.equal(e['hangar-formation-room'].inert,false);
 assert.equal(e['corsair-wing-choice'].disabled,true);
 assert.match(e['corsair-wing-status'].textContent,/Bifrost wingmen/);
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
