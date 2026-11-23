'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {readFileSync}=require('node:fs'),path=require('node:path');
const {setup}=require('./ballistic.test.cjs');
const read=file=>readFileSync(path.join(__dirname,'../dist',file),'utf8');

const routes={
 Practice:'?launch=practice',Vandul:'?launch=vandul',Training:'?launch=wingman-test',Wingman:'?launch=vandul&mission=wingman',
 Ace:'?launch=vandul&mission=ace',Escort:'?launch=escort',Capital:'?launch=capital-test',LegacyCapital:'?launch=carrier-launch'
};
const core='weifer-he3-core',battery='kestrel-h20-reserve-cell',engine='stock-thruster';
function boot(address){
 const generation='cockpit-fixture';
 const owned=[core,battery,engine,'blaster','ballistic'];
 const storage=new Map([
  ['rift-runner.character-generation.v1',generation],
  ['rift-runner.ship-build.v1',JSON.stringify({version:1,hull:'rift-fighter',engine,core,battery,primary:'blaster',secondary:'ballistic'})],
  ['rift-runner.hull-owned.v1',JSON.stringify({version:1,hull:'rift-fighter',condition:'repaired'})],
  ['rift-runner.mission-log.v1',JSON.stringify({version:1,generation,completedAt:2,acceptedAt:3,wingman:{acceptedAt:4},ace:{acceptedAt:5}})]
 ]);
 return setup({flightShell:true,buildUI:true,loadPilotMissions:true,sharedStorage:storage,
  legacyArenaHangar:false,reducedMotion:true,fieldSeed:836,initialHe3:0,
  address:{search:address,replace(){}},pilotCredits:{getBuildState:()=>({origin:'new',owned,kills:25}),owns:id=>owned.includes(id)}});
}

test('shared cockpit is static markup with compact gauges, overlay details and independent controls',()=>{
 const html=read('index.html'),css=read('style.css');
 const settings=html.slice(html.indexOf('<details class="settings"'),html.indexOf('</details>'));
 const toolbar=html.slice(html.indexOf('id="arena-toolbar"'),html.indexOf('<div class="stage">'));
 assert.match(settings,/<details class="settings" id="arena-settings">/,'details are closed by default');
 assert.match(settings,/id="flight-details"[\s\S]*id="hud"[\s\S]*id="reset-field"/);
 assert.doesNotMatch(toolbar,/id="(?:hud|reset-field)"/);
 for(const id of ['compact-hull-value','flight-he3-meter','flight-heat-meter','escort-hud','wingman-commands','vandul-duel-readout'])
  assert.ok(toolbar.includes('id="'+id+'"'),id);
 assert.match(html,/class="flight-action-strip"[\s\S]*class="weapon-rack"[\s\S]*class="flight-cockpit-id"/);
 for(const id of ['fire-button','main-thruster','aim-pad','flight-shield'])assert.ok(html.includes('id="'+id+'"'),id);
 assert.match(css,/\.flight-action-strip\s*\{[^}]*rift4-flight-cockpit\.webp/);
 assert.match(css,/\.flight-vitals\{[^}]*auto repeat\(2,minmax\(0,1fr\)\)/);
 assert.match(css,/\.settings-panel\{[^}]*position:absolute[^}]*overflow:auto/);
 assert.doesNotMatch(css,/data-flight-layout/);
});

test('all real Carrier routes expose live vital gauges, correct controls, and mission information in its intended place',()=>{
 for(const [mode,route] of Object.entries(routes)){
  const q=boot(route),e=q.el,s=q.inspect();
  const capital=['LegacyCapital','Capital'].includes(mode),escort=mode==='Escort',squad=['Training','Wingman'].includes(mode);
  assert.equal(s.state,'play',mode);assert.equal(e['game-cabinet'].dataset.view,'arena',mode);
  assert.equal(e.hud.parentElement,e['flight-details'],mode);
  assert.equal(e['reset-field'].parentElement,e['flight-details'],mode);
  assert.equal(e['vandul-duel-readout'].parentElement,e[capital||escort?'flight-details':'arena-toolbar'],mode);
  assert.equal(e['compact-hull-value'].textContent,'20/20',mode);
  assert.equal(e['flight-he3-meter'].value,0,mode);
  assert.equal(e['flight-heat-meter'].value,0,mode);
  assert.equal(e['capital-dock-hud'].hidden,!capital,mode);
  assert.equal(e['escort-hud'].hidden,!escort,mode);
  assert.equal(e['wingman-commands'].hidden,!squad,mode);
  if(mode==='Training')assert.match(e['vandul-duel-readout'].textContent,/Vandul remaining/);
  if(mode==='Practice'){
   assert.equal(s.cones.length,8);
   assert.equal(s.vandul,null);
   assert.equal(e['vandul-duel-readout'].hidden,true);
  }
 }
});

test('Practice keeps critical hull, firing and actual Settings Reset available',()=>{
 const q=boot(routes.Practice),e=q.el,{p,arena}=q.inspect();
 const crash=()=>{Object.assign(p,{x:arena.right-p.r-1,y:800,vx:250,vy:0,impactCooldown:0});q.step(2);};
 p.hp=10;crash();
 assert.equal(p.hp,5);assert.equal(e['compact-hull-value'].textContent,'5/20');
 assert.equal(e['compact-hull-value'].dataset.hull,'critical');
 q.change('ballistic');q.click('fire-button');assert.equal(q.inspect().practiceShots,1);
 e['arena-settings'].open=true;q.reset();
 assert.equal(q.inspect().p.hp,20);
 assert.equal(e['compact-hull-value'].textContent,'20/20');
 assert.equal(e['arena-settings'].open,false,'reset returns focus to unobstructed flight');
});
