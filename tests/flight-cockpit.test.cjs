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
function boot(address,traceClashPaint=false){
 const generation='cockpit-fixture';
 const owned=[core,battery,engine,'blaster','ballistic'];
 const storage=new Map([
  ['rift-runner.character-generation.v1',generation],
  ['rift-runner.ship-build.v1',JSON.stringify({version:1,hull:'rift-fighter',engine,core,battery,primary:'blaster',secondary:'ballistic'})],
  ['rift-runner.hull-owned.v1',JSON.stringify({version:1,hull:'rift-fighter',condition:'repaired'})],
  ['rift-runner.mission-log.v1',JSON.stringify({version:1,generation,completedAt:2,acceptedAt:3,wingman:{acceptedAt:4},ace:{acceptedAt:5}})]
 ]);
 return setup({traceClashPaint,flightShell:true,buildUI:true,loadPilotMissions:true,sharedStorage:storage,
  legacyArenaHangar:false,reducedMotion:true,fieldSeed:836,initialHe3:0,
  address:{search:address,replace(){}},pilotCredits:{getBuildState:()=>({origin:'new',owned,kills:25}),owns:id=>owned.includes(id)}});
}

test('shared cockpit is static markup with compact gauges, overlay details and independent controls',()=>{
 const html=read('index.html'),css=read('style.css');
 const settings=html.slice(html.indexOf('<details class="settings"'),html.indexOf('</details>'));
 const toolbar=html.slice(html.indexOf('id="arena-toolbar"'),html.indexOf('<div class="flight-action-strip">'));
 assert.match(settings,/<details class="settings" id="arena-settings">/,'details are closed by default');
 assert.match(settings,/id="flight-details"[\s\S]*id="hud"[\s\S]*id="vandul-duel-readout"[\s\S]*id="reset-field"/);
 assert.doesNotMatch(toolbar,/id="(?:hud|reset-field|vandul-duel-readout|wingman-formation)"/);
 for(const id of ['compact-hull-value','flight-he3-meter','flight-heat-meter','escort-hud'])
  assert.ok(toolbar.includes('id="'+id+'"'),id);
 assert.match(html,/class="flight-action-strip"[\s\S]*class="weapon-rack"[\s\S]*class="flight-cockpit-id"/);
 const stage=html.slice(html.indexOf('<div class="stage">'),html.indexOf('<div class="arena-toolbar"'));
 assert.match(stage,/<button id="wingman-formation"[^>]*aria-pressed="true"[^>]*hidden disabled>Formation<\/button>\s*<output id="vandul-countdown"/);
 assert.equal([...html.matchAll(/<button id="wingman-/g)].length,1,'only one wingman control');
 assert.match(css,/#wingman-formation\{[^}]*position:absolute[^}]*min-block-size:44px[^}]*min-inline-size:44px/);
 assert.match(css,/#wingman-formation:not\(\[hidden\]\)\+#vandul-countdown\{[^}]*max-width:calc\(100% - 97px\)/);
 assert.match(stage,/<aside class="docking-comms wing-radio" id="wing-radio"[^>]*hidden>[\s\S]*data-src="\.\/wing-comms-leena\.webp\?v=193"[\s\S]*data-src="\.\/wing-comms-tomas\.webp\?v=193"/);
 assert.match(css,/\.wing-radio\{[^}]*max-inline-size:min\(49vw,210px\)[^}]*pointer-events:none/);

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
  assert.equal(e['vandul-duel-readout'].parentElement,e['flight-details'],mode);
  assert.equal(e['compact-hull-value'].textContent,'20/20',mode);
  assert.equal(e['flight-he3-meter'].value,0,mode);
  assert.equal(e['flight-heat-meter'].value,0,mode);
  assert.equal(e['capital-dock-hud'].hidden,!capital,mode);
  assert.equal(e['escort-hud'].hidden,!escort,mode);
  assert.equal(e['wingman-formation'].parentElement,e['battle-stage'],mode);
  assert.equal(e['wingman-formation'].hidden,!squad,mode);
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

test('every sortie paints continuous space, with a practice-only training grid',()=>{
 for(const [mode,route] of Object.entries(routes)){
  const q=boot(route,true);q.step(2);
  assert.ok(q.radialPaint.some(p=>p.stops.includes('#19223b00')),mode+' draws nebula tones');
  assert.equal(q.strokePaint.some(p=>p.color==='#83bbb820'),mode==='Practice',mode+' grid');
 }
});
test('battlefield comes before all controls, with exit in the cockpit menu',()=>{
 const page=read('index.html'),css=read('style.css');
 for(const id of ['arena-toolbar','pause-flight','return-main-menu','arena-settings','flight-deck'])
  assert.ok(page.indexOf('id="game"')<page.indexOf('id="'+id+'"'),id);
 assert.match(page,/<details class="settings" id="arena-settings">[\s\S]*?<div class="settings-panel"[^>]*>\s*<button id="return-main-menu"/);
 assert.match(css,/\.flight-utility \.settings-panel\{top:auto;bottom:100%/);
 assert.match(css,/#arena-screen \.machine\{grid-template-rows:minmax\(0,1fr\) auto auto/);
});

test('narrow carrier cockpit reserves full width for docking status and wraps visible actions',()=>{
 const css=read('style.css');
 const html=read('index.html');
 const rules=css.slice(css.indexOf('/* Phone landscape reserves room'),css.indexOf('@media(pointer:coarse)',css.indexOf('/* Phone landscape reserves room')));
 assert.match(rules,/@media \(max-width:720px\),/);
 assert.match(rules,/\(orientation:landscape\) and \(max-height:530px\) and \(any-pointer:coarse\)/);
 assert.match(rules,/\.flight-action-strip\{flex-wrap:wrap/);
 assert.match(rules,/#capital-dock-hud\{\s*flex:0 0 100%;flex-wrap:wrap/);
 assert.match(rules,/#capital-dock-hud>output\{\s*flex:0 0 100%;min-width:0/);
 assert.match(rules,/#capital-dock-hud>button\{\s*min-width:44px/);
 assert.match(html,/<button id="resolute-drill" type="button" hidden>/);
 assert.match(rules,/#fleet-return-hud\{\s*order:-1;flex:0 0 100%;flex-wrap:wrap/);
 assert.match(rules,/#online-hud\{\s*flex:1 1 0;min-width:0/);
});


test('the unavailable-spectate shortcut remains hidden on the normal main menu',()=>{
 assert.match(read('index.html'),/class="menu-choice" id="cross-watch-unavailable" [^>]*hidden/);
 assert.match(read('style.css'),/\.menu-choice\[hidden\]\{display:none\}/);
});

test('camera presets show three steps, preserve the view during pause, and share the aiming transform',()=>{
 const q=boot(routes.Practice),e=q.el;
 q.step();
 assert.equal(e['flight-view'].hidden,false);
 const start=q.inspect().camera;
 q.click('flight-view-fleet');
 const wide=q.inspect().camera;
 assert.ok(wide.w>start.w&&wide.h>start.h);
 q.click('flight-view-focus');
 const close=q.inspect().camera,p=q.inspect().p;
 assert.ok(close.w<start.w&&close.h<start.h);
 assert.equal(e['flight-view-focus'].getAttribute('aria-pressed'),'true');
 assert.equal(e['flight-view-fleet'].getAttribute('aria-pressed'),'false');
 q.canvasPointer('pointermove',(p.x+40-close.x)*480/close.w,(p.y-close.y)*720/close.h);
 assert.ok(Math.abs(q.inspect().p.aim)<.001,'pointing east on the zoomed canvas still aims east');
 q.key('keydown','KeyP');q.step();assert.equal(e['flight-view'].hidden,true);
 q.key('keydown','KeyP');q.step();assert.equal(q.inspect().camera.zoom,close.zoom);
 q.click('flight-view-normal');
 assert.deepEqual(q.inspect().camera,start);
 assert.match(read('style.css'),/#flight-view button\{\s*min-inline-size:44px;min-block-size:44px/);
});
