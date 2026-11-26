const {test}=require('node:test'),assert=require('node:assert/strict');
const {setup}=require('./ballistic.test.cjs');
const address={search:'?hangar=carrier&vessel=rift-carrier',hostname:'rift.example',origin:'https://rift.example'};
function hangar(){
 return setup({redGrinSim:true,cockpitUI:true,flightShell:true,buildUI:true,reducedMotion:true,sprite:true,initialHe3:20,
  sharedStorage:new Map(),address,canvasBox:{width:390,height:608}});
}
function watch(key){
 const q=hangar();q.click('hangar-watch-'+key);
 const {flightMode,state}=q.inspect();
 assert.equal(state,'play');assert.ok(flightMode.simWatch);assert.equal(flightMode.hull,'none');assert.equal(flightMode.credits,false);
 assert.equal(q.el['arena-screen'].dataset.simWatch,'true');assert.equal(q.el['sim-watch-hud'].hidden,false);
 return q;
}
test('50 vs 50 Watch runs all 100 bots, launches and holds before auto-start, then both teams fight',()=>{
 const q=watch('fighter-battle'),{p,fighterBattle:s}=q.inspect();
 assert.equal(p.hp,0);assert.equal(s.blue.length,50);assert.equal(s.red.length,50);
 assert.equal(s.phase,'deploying');assert.equal(q.el['fighter-cross-action'].hidden,true);
 const view=q.inspect().camera;q.click('sim-watch-camera');assert.ok(q.inspect().camera.zoom<view.zoom);
 q.click('sim-watch-camera');assert.equal(q.inspect().camera.zoom,view.zoom);
 q.step(80);q.click('sim-watch-pause');const clock=s.deploymentTime;
 q.step(160);assert.equal(s.deploymentTime,clock);q.choose('resume');assert.equal(q.inspect().state,'play');
 while(s.phase==='deploying'&&s.deploymentTime<22)q.step();
 assert.equal(s.phase,'ready');assert.equal(s.time,0);
 q.click('fire-button');assert.equal(s.phase,'ready');
 q.step(120);assert.equal(s.phase,'combat');assert.ok(s.time>0);
 for(let i=0;i<2300&&s.blueCount===50&&s.redCount===50;i++)q.step();
 assert.ok(s.blueCount<50||s.redCount<50,'AI scores a real elimination');
 assert.equal(q.inspect().practiceShots,0);
 for(const ship of s.blue)ship.hp=0;
 q.step(2);assert.equal(s.result,'red-won');
 assert.match(q.el.overlay.innerHTML,/Red Grin wins/);
 q.choose('reset');assert.equal(q.inspect().fighterBattle.blue.length,50);
});
test('Red Grin Watch flies and fires without input, ends with a debrief, and can rematch',()=>{
 const q=watch('red-grin-simulator');
 for(let i=0;i<2000&&q.inspect().state==='play';i++)q.step();
 const r=q.inspect();assert.ok(r.practiceShots>2);
 assert.equal(r.state,'complete');assert.ok(r.duelResult==='victory'||r.duelResult==='lost');
 assert.match(q.el.overlay.innerHTML,/AI fighter hull/);
 q.choose('reset');assert.ok(q.inspect().flightMode.simWatch);assert.equal(q.inspect().state,'play');
});
test('AI escorts the freighter to an actual result, with no pilot or hull changes saved',()=>{
 const q=watch('red-grin-escort'),initial=q.inspect().redGrinConvoy.y,before=[...q.storage.entries()];
 q.step(920);assert.ok(q.inspect().redGrinConvoy.y<initial-200);assert.ok(q.inspect().practiceShots>0);
 for(let i=0;i<3650&&q.inspect().state==='play';i++)q.step();
 assert.equal(q.inspect().state,'complete');
 assert.match(q.el.overlay.innerHTML,/Freighter delivered|Freighter lost|Extraction missed|Escort fighter disabled/);
 assert.deepEqual([...q.storage.entries()],before);
});
test('Scale Free Fly Watch launches from Crosswind and tours the lineup without shooting',()=>{
 const q=watch('scale-free-fly'),{p,scaleFlyShips:s}=q.inspect();
 assert.equal(s.parked.group,1);const fromX=p.x;
 q.step(1030);assert.equal(s.parked,null);assert.ok(p.x>fromX+600);
 assert.equal(q.inspect().practiceShots,0);
});
test('Practice and Solo vs Vandul also have autonomous no-save runs',()=>{
 const practice=watch('practice');practice.step(620);assert.ok(practice.inspect().practiceShots>0);
 const solo=watch('solo-training');solo.step(1050);
 assert.ok(solo.inspect().practiceShots>0);assert.ok(solo.inspect().duelWave>=2||solo.inspect().duelKills>0);
 assert.equal(solo.inspect().flightMode.quest,null);
});
test('original simulator buttons still start player-controlled flight',()=>{
 const q=hangar();q.click('hangar-fighter-battle');
 assert.equal(q.inspect().flightMode.simWatch,undefined);assert.equal(q.inspect().fighterBattle.phase,'docked');
 assert.equal(q.el['sim-watch-hud'].hidden,true);assert.equal(q.inspect().fighterBattle.blue.length,49);
});
function disableAiPilot(q){
 const {p,vandulLasers}=q.inspect();p.hp=1;
 vandulLasers.push({x:p.x,y:p.y+34,vx:0,vy:-500,a:-Math.PI/2,damage:4,life:1});
 for(let i=0;i<30&&p.hp;i++)q.step();
 assert.equal(p.hp,0);
}
test('losing the escort moves Watch to the freighter and leaves the convoy and raider running',()=>{
 const q=watch('red-grin-escort');q.step(155);
 const {redGrinConvoy:c,pirateCapitals:[raider]}=q.inspect();
 disableAiPilot(q);assert.equal(q.inspect().state,'play');assert.ok(q.inspect().simDirector.pilotDown);
 assert.equal(q.el.overlay.hidden,true);assert.equal(q.el['sim-watch-hud'].hidden,false);
 const y=c.y;q.step(700);
 assert.ok(c.y<y-230);assert.ok(raider.turret.shots>0);
 assert.ok(c.hp<c.maxHp,'raider can still hit the freighter');
 for(let i=0;i<4500&&q.inspect().state==='play';i++)q.step();
 assert.equal(q.inspect().state,'complete');
 assert.match(q.el.overlay.innerHTML,/Freighter delivered|Freighter lost|Extraction missed/);
});
test('a lone AI fighter loss shows the surviving opponent before offering the debrief',()=>{
 const q=watch('red-grin-simulator');q.step(70);
 disableAiPilot(q);assert.equal(q.inspect().state,'play');assert.equal(q.el.overlay.hidden,true);
 const {pirateCapitals:[boss]}=q.inspect();const x=boss.x;
 q.step(125);assert.notEqual(boss.x,x);assert.equal(q.inspect().state,'play');
 q.step(170);assert.equal(q.inspect().state,'complete');assert.match(q.el.overlay.innerHTML,/AI fighter disabled/);
});
test('escort loss in normal fly mode still takes the player to the loss screen',()=>{
 const q=hangar();q.click('hangar-red-grin-escort');q.step(140);
 disableAiPilot(q);assert.equal(q.inspect().state,'disabled');
 assert.match(q.el.overlay.innerHTML,/Escort fighter disabled/);
});
