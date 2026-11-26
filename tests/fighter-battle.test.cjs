const {test}=require('node:test'),assert=require('node:assert/strict');
const {setup}=require('./ballistic.test.cjs');
function launch(extra={}){
 const q=setup({redGrinSim:true,cockpitUI:true,flightShell:true,buildUI:true,reducedMotion:true,initialHe3:0,
  canvasBox:{width:390,height:608},sharedStorage:new Map(),
  address:{search:'?hangar=carrier&vessel=rift-carrier',hostname:'rift.example',origin:'https://rift.example'},...extra});
 assert.equal(q.el.hangar.open,true);
 q.click('hangar-fighter-battle');
 return q;
}
test('real Hangar route launches 49 wingmates and 50 opponents at fixed normal size',()=>{
 const q=launch(),{p,fighterBattle:s,flightMode,camera,pirateCapitals,scaleFlyShips}=q.inspect();
 assert.equal(s.blue.length,49);assert.equal(s.red.length,50);
 for(const a of s.blue){const b=s.red.find(b=>b.slot===a.slot);assert.equal(a.x,b.x);assert.equal(a.y+b.y,1700);assert.equal(a.hp,b.hp);}
 assert.equal(s.bots.length,99);assert.equal(s.blueCount,50);assert.equal(s.redCount,50);
 assert.equal(new Set([...s.bots,p].map(c=>c.x+':'+c.y)).size,100);
 assert.equal(q.el['fighter-battle-readout'].textContent,'Blue 50 / 50  ·  Red 50 / 50');
 assert.equal(camera.zoom,1);assert.ok(s.bots.every(c=>c.r===p.r));
 assert.equal(pirateCapitals.length,0);assert.equal(scaleFlyShips,null);
 assert.equal(flightMode.hull,'none');assert.equal(flightMode.credits,false);assert.equal(flightMode.loaner,'rift-fighter');
 q.step(80);assert.equal(q.inspect().camera.zoom,1);
 assert.ok(s.red[0].vy>0);assert.ok(s.blue[0].vy<0);
});
test('opposing formations trade fire, lose fighters, and keep the camera at 1x',()=>{
 const q=launch(),s=q.inspect().fighterBattle;
 let maxShots=0;
 for(let i=0;i<950&&q.inspect().state==='play';i++){
  q.step();const {shots,vandulLasers,camera}=q.inspect();
  maxShots=Math.max(maxShots,shots.length+vandulLasers.length);assert.equal(camera.zoom,1);
 }
 assert.ok(maxShots>20&&maxShots<110,'bounded AI bolts: '+maxShots);
 assert.ok(s.blueCount<50||s.redCount<50,'at least one squad recorded losses');
 assert.ok(s.bots.every(c=>Number.isFinite(c.x)&&Number.isFinite(c.y)));
});
test('player shots damage an opponent; own squad blocks without taking damage',()=>{
 const q=launch(),{p,fighterBattle:s}=q.inspect();
 const red=s.red[0],blue=s.blue[0];
 Object.assign(red,{x:p.x,y:p.y-94,vx:0,vy:0});
 Object.assign(blue,{x:p.x,y:p.y-64,vx:0,vy:0});
 q.click('fire-button');q.step(8);assert.equal(blue.hp,12);assert.equal(red.hp,12);
 Object.assign(blue,{x:p.x+180,y:p.y-64,vx:0,vy:0});
 q.step(60);Object.assign(red,{x:p.x,y:p.y-94,vx:0,vy:0});
 q.click('fire-button');q.step(14);assert.ok(red.hp<12);
});
test('win, loss, timeout and rematch do not persist damage or credits',()=>{
 let credits=0;
 const q=launch({pilotCredits:{recordEnemyKill(){credits++;return {saved:true,amount:99};}}});
 const first=q.inspect().fighterBattle;
 for(const bot of first.red)bot.hp=0;
 q.step(3);assert.match(q.el.overlay.innerHTML,/Blue squadron wins/);
 assert.equal(q.inspect().state,'complete');
 q.choose('reset');assert.equal(q.inspect().fighterBattle.blueCount,50);assert.equal(q.inspect().fighterBattle.redCount,50);
 const {p,fighterBattle:s,vandulLasers}=q.inspect();
 p.hp=1;vandulLasers.push({x:p.x,y:p.y+35,vx:0,vy:-500,a:-Math.PI/2,life:1,damage:2});
 q.step(12);
 assert.equal(s.result,'disabled');assert.match(q.el.overlay.innerHTML,/Your fighter was disabled/);
 q.choose('reset');q.inspect().fighterBattle.time=120;q.step(3);
 assert.match(q.el.overlay.innerHTML,/Time expired/);
 assert.equal(credits,0);
 assert.ok(![...q.storage.keys()].some(k=>/pilot-credits|hull-owned|mission-log|fighter-parking/.test(k)));
});
