'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {setup}=require('./ballistic.test.cjs');
const files=['../dist','..'].map(dir=>path.join(__dirname,dir)).find(dir=>fs.existsSync(path.join(dir,'index.html')));
const flt='rift-fighter',swift='bastion-9',key='rift-runner.selected-fighter.v1';
function fixture(ownsSwift=true){
 const parts={engine:'stock-thruster',core:'weifer-he3-core',battery:'kestrel-h20-reserve-cell',primary:'blaster'};
 const owned=Object.values(parts);
 const storage=new Map([['rift-runner.character-generation.v1','selector-fixture'],
  ['rift-runner.hull-owned.v1',JSON.stringify({version:1,hull:flt,condition:'repaired',repairedAt:1})],
  ['rift-runner.ship-build.v1',JSON.stringify({version:1,hull:flt,...parts})],
  ['rift-runner.hull-owned.v1.'+swift,JSON.stringify({version:1,hull:swift,condition:'repaired',repairedAt:1})]]);
 const q=setup({cockpitUI:true,flightShell:true,sharedStorage:storage,loadPilotMissions:true,loadFighters:true,buildUI:true,reducedMotion:true,
  address:{search:'?hangar=carrier',origin:'https://rift.example'},
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
 assert.ok(html.indexOf('id="hangar-preview-select"')<html.indexOf('id="hangar-repaired-bay"'));
 assert.match(html,/<figure class="hangar-ship-banner">[\s\S]*?<button id="hangar-preview-select"[^>]*type="button"/);
 assert.match(html,/id="hangar-board"[^>]*>Get in cockpit<\/button>/);
 assert.match(html,/hangar-cockpit-pov-v2\.webp/);
});
test('a scrollable ten-bay deck opens on four bays, including the active berth',()=>{
 const read=f=>fs.readFileSync(path.join(files,f),'utf8'),html=read('index.html'),css=read('style.css'),game=read('game.js');
 for(const id of ['hangar-repaired-bay','hangar-damaged-bay']){
  const figure=html.slice(html.indexOf('id="'+id+'"'));const body=figure.slice(0,figure.indexOf('</figure>'));
  assert.equal(new Set([...body.matchAll(/hangar-berth bay-(\d+)/g)].map(m=>m[1])).size,10);
  assert.match(body,/class="hangar-deck-scroll"/);
  assert.match(body,/hangar-ten-bay-deck\.webp/);
 }
 assert.match(css,/\.hangar-deck-scroll>\.hangar-camera\{[^}]*height:250%/);
 assert.match(css,/\.hangar-deck-scroll\{[^}]*overflow-y:auto[^}]*scroll-snap-type:y proximity/);
 assert.match(game,/viewport.scrollTop=bay==='06'\?viewport.clientHeight\/2:0/);
});
