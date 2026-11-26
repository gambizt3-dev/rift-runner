const {test}=require('node:test'),assert=require('node:assert/strict');
const {setup}=require('./ballistic.test.cjs');
function openBattle(extra={}){
 const q=setup({redGrinSim:true,cockpitUI:true,flightShell:true,buildUI:true,reducedMotion:true,initialHe3:0,
  canvasBox:{width:390,height:608},sharedStorage:new Map(),
  address:{search:'?hangar=carrier&vessel=rift-carrier',hostname:'rift.example',origin:'https://rift.example'},...extra});
 assert.equal(q.el.hangar.open,true);
 q.click('hangar-fighter-battle');
 return q;
}
function launch(extra={}){return commence(openBattle(extra));}
function commence(q){
 const sim=q.inspect().fighterBattle;
 q.click('fighter-cross-action');
 assert.equal(sim.phase,'combat');
 // These focused combat fixtures start with the deck clear. The full queue
 // is exercised without overrides in the manual and Watch tests.
 for(const ship of sim.bots){
  const col=ship.flight%8,row=Math.floor(ship.flight/8);
  const x=155+col*270+(ship.rank===1?-48:ship.rank===2?48:0);
  const y=ship.simTeam===1?2010+row*190+(ship.rank?55:0):490-row*190-(ship.rank?55:0);
  Object.assign(ship,{staged:false,departing:false,x,y,prevX:x,prevY:y});
 }
 sim.launching=false;
 return q;
}
test('Hangar launch loads limited pads, staggers trios, and sends each straight out without Fire',()=>{
 const q=openBattle(),{p,fighterBattle:s,flightMode,camera,pirateCapitals,scaleFlyShips}=q.inspect();
 assert.equal(s.blue.length,49);assert.equal(s.red.length,50);
 assert.equal(s.bots.length,99);assert.equal(s.blueCount,50);assert.equal(s.redCount,50);
 assert.equal(s.phase,'docked');
 assert.equal(q.el['fighter-cross-action'].textContent,'Launch fleets');
 assert.match(q.el['fighter-battle-readout'].textContent,/^Docked · Crosswind Home/);
 for(const a of s.bots){
  const pad=s.frigates[a.simTeam-1].pads[a.launchPad];
  assert.ok(a.staged);assert.equal(a.x,pad.x);assert.equal(a.y,pad.y);assert.notEqual(a.launchPad,2);
 }
 const playerPad=s.frigates[0].pads[2];assert.equal(p.x,playerPad.x);assert.equal(p.y,playerPad.y);
 assert.deepEqual(Array.from(s.flights[0],wing=>wing.length),[...Array(16).fill(3),1]);
 assert.deepEqual(Array.from(s.flights[1],wing=>wing.length),[...Array(16).fill(3),2]);
 assert.ok(s.flights.flat(2).every(a=>a!==p));
 assert.equal(camera.zoom,1);assert.ok(s.bots.every(c=>c.r===p.r));
 assert.equal(pirateCapitals.length,0);assert.equal(scaleFlyShips,null);
 assert.equal(flightMode.hull,'none');assert.equal(flightMode.credits,false);assert.equal(flightMode.loaner,'rift-fighter');
 q.click('fire-button');q.step(80);assert.equal(s.phase,'docked');assert.equal(s.time,0);
 q.click('fighter-cross-action');assert.equal(s.phase,'combat');
 const airborne=[new Map(),new Map()],formed=[new Map(),new Map()];
 let firstContact=null,firstLoadingSeen=false;
 for(let i=0;i<4600&&s.launching&&q.inspect().state==='play';i++){
  q.step();
  assert.equal(s.blueCount,49+Number(p.hp>0)-s.blue.filter(a=>a.hp<=0).length);
  assert.equal(s.redCount,50-s.red.filter(a=>a.hp<=0).length);
  for(const [team,flights] of s.flights.entries()){
   const loaded=flights.flat().filter(a=>a.staged&&a.loadAt<=s.time);
   assert.ok(loaded.length<=3);
   for(const a of loaded){
    const pad=s.frigates[team].pads[a.launchPad];
    assert.equal(a.x,pad.x);assert.equal(a.y,pad.y);
    if(team===0&&a.slot===0&&s.time>.55)firstLoadingSeen=true;
   }
   assert.equal(new Set(loaded.map(a=>a.launchPad)).size,loaded.length);
   for(const [i,wing] of flights.entries()){
    if(!wing[0].staged&&!airborne[team].has(i)){
     airborne[team].set(i,s.time);
     assert.ok(s.time>=wing[0].loadAt+.95&&wing.slice(1).every(a=>a.staged));
    }
    if(!wing[0].departing&&!formed[team].has(i)){
     formed[team].set(i,s.time);
     assert.ok(wing.every(a=>!a.staged&&!a.departing));
     assert.ok(wing.every(a=>Math.hypot(a.x-a.holdX,a.y-a.holdY)<22),JSON.stringify({team,i,time:s.time,wing:wing.map(a=>[a.x,a.y,a.holdX,a.holdY,a.hp])}));
    }
   }
  }
  if(!firstContact&&s.bots.some(a=>a.target?.simTeam))firstContact=s.time;
 }
 assert.ok(firstLoadingSeen,'the first fighter sits on its pad before taking off');
 assert.equal(s.launching,false,JSON.stringify({time:s.time,state:q.inspect().state,result:s.result}));
 for(let team=0;team<2;team++){
  const launchTimes=[...airborne[team].values()];
  assert.equal(launchTimes.length,17);assert.equal(formed[team].size,17);
  assert.ok(launchTimes.slice(1).every((t,i)=>t-launchTimes[i]>3.56));
  assert.ok(formed[team].get(0)<launchTimes[1]+.1);
  assert.ok(firstContact>0&&firstContact<launchTimes.at(-1));
 }
 assert.equal(q.inspect().practiceShots,0);
});
test('opposing formations trade fire, lose fighters, and keep the camera at 1x',()=>{
 const q=launch(),s=q.inspect().fighterBattle;
 let maxShots=0;const firingTeams=new Set();
 for(let i=0;i<5200&&q.inspect().state==='play';i++){
  q.step();const {shots,vandulLasers,camera}=q.inspect();
  maxShots=Math.max(maxShots,shots.length+vandulLasers.length);assert.equal(camera.zoom,1);
  for(const shot of [...shots,...vandulLasers])if(shot.owner?.simTeam)firingTeams.add(shot.owner.simTeam);
  if(firingTeams.size===2&&(s.blueCount<50||s.redCount<50))break;
 }
 assert.equal(firingTeams.size,2,'both sides’ fighters fire');
 assert.ok(maxShots<110,'bounded AI bolts: '+maxShots);
 assert.ok(s.blueCount<50||s.redCount<50,'at least one squad recorded losses');
 assert.ok(s.bots.every(c=>Number.isFinite(c.x)&&Number.isFinite(c.y)));
});
test('player shots damage an opponent; own squad blocks without taking damage',()=>{
 const q=launch(),{p,fighterBattle:s}=q.inspect();
 const red=s.red[0],blue=s.blue[0];
 p.x=p.prevX=560;p.y=p.prevY=1570;
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
 q.step(3);assert.match(q.el.overlay.innerHTML,/Crosswind wins/);
 assert.equal(q.inspect().state,'complete');
 q.choose('reset');assert.equal(q.inspect().fighterBattle.blueCount,50);assert.equal(q.inspect().fighterBattle.redCount,50);
 commence(q);
 const {p,fighterBattle:s,vandulLasers}=q.inspect();
 Object.assign(p,{x:540,prevX:540,y:1600,prevY:1600,vx:0,vy:0,hp:1});vandulLasers.push({x:p.x,y:p.y+35,vx:0,vy:-500,a:-Math.PI/2,life:1,damage:2});
 q.step(12);
 assert.equal(s.result,'disabled');assert.match(q.el.overlay.innerHTML,/Your fighter was disabled/);
 q.choose('reset');commence(q);q.inspect().fighterBattle.time=180;q.step(3);
 assert.match(q.el.overlay.innerHTML,/Time expired/);
 assert.equal(credits,0);
 assert.ok(![...q.storage.keys()].some(k=>/pilot-credits|hull-owned|mission-log|fighter-parking/.test(k)));
});
test('retreat flies south, safe zone blocks shots, repair and relaunch keep the same battle',()=>{
 const q=launch(),{p,fighterBattle:s}=q.inspect(),btn=q.el['fighter-cross-action'];
 Object.assign(p,{hp:7,x:800,prevX:800,y:1650,prevY:1650,vx:0,vy:0});q.step();
 assert.equal(btn.textContent,'Retreat to Crosswind');q.click('fighter-cross-action');
 assert.equal(btn.textContent,'Cancel retreat');assert.ok(s.retreat);
 for(let i=0;i<1100&&btn.textContent!=='Dock & repair';i++)q.step();
 assert.equal(btn.textContent,'Dock & repair',JSON.stringify({x:p.x,y:p.y,vx:p.vx,vy:p.vy}));
 assert.match(q.el['fighter-battle-readout'].textContent,/Crosswind Home/);
 const t=s.time,red=s.red[0],hp=p.hp,shots=q.inspect().practiceShots;
 q.click('fire-button');assert.equal(q.inspect().practiceShots,shots);
 q.inspect().vandulLasers.push({x:p.x,y:p.y+32,vx:0,vy:-500,a:-Math.PI/2,life:1,damage:8});
 q.step(12);assert.equal(p.hp,hp);
 q.click('fighter-cross-action');assert.equal(btn.disabled,true);
 q.key('keydown','KeyW');q.step(420);q.key('keyup','KeyW');
 assert.equal(btn.textContent,'Relaunch');assert.ok(p.hp===p.maxHp);
 assert.equal(p.y,2205);assert.ok(s.time>t+6);assert.equal(s.red[0],red);
 q.click('fighter-cross-action');assert.equal(s.repairAt,null);
 q.key('keydown','KeyW');q.step(225);q.key('keyup','KeyW');
 assert.match(q.el['fighter-battle-readout'].textContent,/Battle Map/);
 assert.equal(q.inspect().fighterBattle,s);
});
test('both sides can withdraw, heal and return without respawning destroyed fighters',()=>{
 const q=launch(),s=q.inspect().fighterBattle;
 const blue=s.blue[0],red=s.red[0],dead=s.red[1];
 blue.hp=red.hp=3;dead.hp=0;
 for(let i=0;i<1400&&!(blue.repaired&&red.repaired)&&q.inspect().state==='play';i++)q.step();
 assert.equal(blue.repaired,true);assert.equal(red.repaired,true);assert.ok(blue.hp>3&&red.hp>3);
 assert.equal(dead.hp,0);assert.ok(s.redCount<50);
});
test('both recovery frigates use the shared art, real deck pads and matching live defensive fire',()=>{
 const q=launch({sprite:true}),s=q.inspect().fighterBattle;
 const [peg,corsair]=s.frigates;
 assert.equal(peg.width,corsair.width);assert.equal(peg.length,corsair.length);
 assert.equal(peg.pads[2].y,2205);assert.equal(corsair.pads[2].y,295);
 assert.equal(peg.heading,-Math.PI/2);assert.equal(corsair.heading,Math.PI/2);
 assert.ok(peg.pads.every(p=>p.y===2205)&&corsair.pads.every(p=>p.y===295));
 assert.equal(peg.pads[2].x,1163);assert.equal(corsair.pads[2].x,1037);
 assert.equal(peg.pads.length,4);assert.equal(corsair.pads.length,4);
 const red=s.red[0],blue=s.blue[0],p=q.inspect().p;
 p.y=p.prevY=2210;
 for(const ship of s.bots){ship.fireAt=1e5;if(ship!==red&&ship!==blue)ship.bayUntil=1e5;}
 for(let i=0;i<210;i++){
  Object.assign(red,{x:peg.x,y:1840,vx:0,vy:0,returning:false});
  Object.assign(blue,{x:corsair.x,y:660,vx:0,vy:0,returning:false});
  q.step();
 }
 assert.ok(peg.shots>=9&&corsair.shots>=9,JSON.stringify({peg:peg.shots,corsair:corsair.shots}));
 assert.ok(red.hp<12&&blue.hp<12,JSON.stringify({blue:blue.hp,red:red.hp}));
 assert.ok(q.sprites.some(o=>o.src?.includes('red-grin-simulator.webp')));
});
test('the middle belt leaves clear lanes and stops shots and fighters',()=>{
 const q=launch(),{p,asteroids:rocks,fighterBattle:s,vandulLasers}=q.inspect();
 assert.equal(rocks.length,16);
 assert.ok(rocks.some(r=>r.r>=70));
 assert.ok(rocks.every(r=>Math.abs(r.y-1250)<170));
 const lanes=[335,760,1350,1810];
 for(const x of lanes)assert.ok(rocks.every(r=>Math.abs(r.x-x)>r.profile.drawSize/Math.SQRT2+55),'visible 110-unit lane at '+x);
 for(const [i,a] of rocks.entries())for(const b of rocks.slice(i+1))
  assert.ok(Math.hypot(a.x-b.x,a.y-b.y)>=a.r+b.r+20,'collision shapes stay separated');
 const rock=rocks.find(r=>r.x===1135),red=s.red[0];
 for(const bot of s.bots)bot.fireAt=1e5;
 Object.assign(p,{x:rock.x,prevX:rock.x,y:rock.y+155,prevY:rock.y+155,vx:0,vy:0});
 Object.assign(red,{x:rock.x,y:rock.y-155,vx:0,vy:0,returning:false});
 q.click('fire-button');
 vandulLasers.push({x:rock.x,y:rock.y-135,vx:0,vy:500,a:Math.PI/2,life:1,damage:2});
 q.step(42);assert.equal(p.hp,p.maxHp);assert.equal(red.hp,12);assert.ok(rock.hitGlow>0||q.inspect().practiceHits>0);
 for(const bot of s.bots)bot.bayUntil=1e5;
 const r=p.r;Object.assign(p,{x:rock.x,y:rock.y+rock.r+r+38,vx:0,vy:0});
 q.key('keydown','KeyW');q.step(90);q.key('keyup','KeyW');
 assert.ok(Math.hypot(p.x-rock.x,p.y-rock.y)>=rock.r+r-.1&&p.y>rock.y,'solid collision '+JSON.stringify({x:p.x,y:p.y}));
 for(const x of lanes){
  Object.assign(p,{x,prevX:x,y:1480,prevY:1480,vx:0,vy:0});
  q.key('keydown','KeyW');q.step(300);q.key('keyup','KeyW');
  assert.ok(p.y<1070,'open lane crosses the whole belt at '+x);
 }
});
test('a disabled Rift-3 sheds one random three-piece wreck; pieces drift and survive until rematch',()=>{
 const q=launch({sprite:true,initialHe3:20});
 const {p,fighterBattle:s}=q.inspect();
 const red=s.red[0];q.mockRandom(.04);
 p.x=p.prevX=550;p.y=p.prevY=1600;
 for(const b of s.bots)if(b!==red)b.bayUntil=1e5;
 red.hp=1;
 Object.assign(red,{x:p.x,y:p.y-94,vx:0,vy:0,fireAt:1e5});
 q.click('fire-button');const shot=q.inspect().shots[0];assert.ok(shot);Object.assign(shot,{x:red.x,y:red.y+19,vx:0,vy:-500,a:-Math.PI/2,damage:2});q.step(24);
 assert.equal(red.hp,0);
 const wrecks=q.inspect().riftWrecks;
 assert.equal(wrecks.length,1);assert.equal(wrecks[0].variant,0);assert.equal(wrecks[0].pieces.length,3);
 const first=wrecks[0].pieces.map(b=>[b.x,b.y,b.angle]);
 q.step(710);assert.equal(wrecks.length,1);assert.equal(wrecks[0].pieces.length,3);
 assert.ok(wrecks[0].pieces.every((b,i)=>Math.hypot(b.x-first[i][0],b.y-first[i][1])>5));
 q.mockRandom(.95);p.hp=1;for(const b of s.bots){b.x=b.prevX=1700;b.y=b.prevY=2200;}
 q.inspect().vandulLasers.push({x:p.x,y:p.y+35,vx:0,vy:-500,a:-Math.PI/2,life:1,damage:2});
 q.step(16);
 assert.equal(wrecks.length,2,JSON.stringify({x:p.x,y:p.y,hp:p.hp,id:p.fighter,state:q.inspect().state,bolts:q.inspect().vandulLasers}));assert.equal(wrecks[1].variant,2);assert.equal(wrecks[1].pieces.length,3);
 assert.equal(q.inspect().state,'complete');
 q.choose('reset');assert.equal(q.inspect().riftWrecks.length,0);
});
test('the core Rift-3 destruction also makes a wreck outside the fighter simulator',()=>{
 const q=setup({sprite:true,reducedMotion:true});
 q.open('practice');q.mockRandom(.42);
 const {p,vandulLasers,flightMode,riftWrecks}=q.inspect();
 assert.equal(flightMode.id,'practice');assert.equal(riftWrecks.length,0);
 Object.assign(p,{hp:1,prevX:p.x,prevY:p.y});
 vandulLasers.push({x:p.x,y:p.y+35,vx:0,vy:-500,a:-Math.PI/2,life:1,damage:2});
 q.step(25);
 assert.equal(q.inspect().state,'disabled');assert.equal(riftWrecks.length,1);
 assert.equal(riftWrecks[0].variant,1);assert.equal(riftWrecks[0].pieces.length,3);
});

test('Crosswind and Red Grin both absorb shots, take overflow hull damage and recharge their fitted shields',()=>{
 const q=launch({sprite:true}),{p,fighterBattle:s}=q.inspect();
 const [crosswind,grin]=s.frigates;
 assert.equal(crosswind.name,'Crosswind');assert.equal(grin.name,'Red Grin');
 for(const ship of s.frigates){
  assert.equal(ship.loadout.shield,'Frigate shield generator');assert.equal(ship.shieldHp,14);
  ship.fire.readyAt=1e5;
 }
 for(const ship of s.bots)ship.bayUntil=1e5;
 const shoot=(ship,damage)=>{
  const enemy=ship===crosswind,dir=enemy?1:-1;
  const b={x:ship.x,y:enemy?1940:560,vx:0,vy:dir*470,a:dir*Math.PI/2,life:2,simUntil:s.time+2,damage,kind:'ballistic',weapon:'ballistic'};
  q.inspect()[enemy?'vandulLasers':'shots'].push(b);
  q.step(47);
 };
 // Shots from the arena can reach either hull without harming parked fighters.
 for(const ship of s.frigates){
  shoot(ship,5);assert.equal(ship.shieldHp,9);assert.equal(ship.hp,66);
  shoot(ship,11);assert.equal(ship.shieldHp,0);assert.equal(ship.hp,64);
 }
 assert.equal(p.hp,p.maxHp);
 q.step(420);
 assert.ok(s.frigates.every(ship=>ship.shieldHp>0&&ship.shieldHp<14&&ship.hp===64));
 q.step(750);assert.ok(s.frigates.every(ship=>ship.shieldHp===14));
 shoot(grin,100);assert.equal(grin.hp,0);
 q.step(850);assert.equal(grin.shieldHp,0);
});

test('both AI fleets travel through the asteroid belt rather than getting stuck on their own side',()=>{
 const q=openBattle(),s=q.inspect().fighterBattle,through=[new Set(),new Set()];
 q.click('fighter-cross-action');
 for(let i=0;i<5500&&q.inspect().state==='play';i++){
  q.step();
  for(const ship of s.blue)if(ship.y<1110&&ship.hp>0)through[0].add(ship);
  for(const ship of s.red)if(ship.y>1390&&ship.hp>0)through[1].add(ship);
  if(through.every(t=>t.size>=12))break;
 }
 assert.ok(through.every(t=>t.size>=12),'bots crossing in each direction: '+through.map(t=>t.size));
});


test('the pilot can fly past the old north boundary and directly attack Red Grin',()=>{
 const q=launch({initialHe3:20}),{p,fighterBattle:s}=q.inspect();
 const red=s.frigates[1];
 for(const ship of s.bots)ship.bayUntil=1e5;
 Object.assign(p,{x:red.x,prevX:red.x,y:595,prevY:595,vx:0,vy:0});
 q.key('keydown','KeyW');
 for(let i=0;i<190&&p.y>435;i++)q.step();
 q.key('keyup','KeyW');
 assert.ok(p.y<450,'the fighter can cross into enemy home: '+p.y);
 q.click('fire-button');assert.ok(q.inspect().practiceShots>0);
 for(let i=0;i<60&&red.shieldHp===14;i++)q.step();
 assert.ok(red.shieldHp<14,'a real shot in Red Grin Home damages the frigate shield');
 assert.equal(s.frigates[0].shieldHp,14);
 Object.assign(p,{x:red.x,prevX:red.x,y:440,prevY:440,vx:0,vy:0});
 q.key('keydown','KeyW');q.step(180);q.key('keyup','KeyW');
 assert.ok(p.y>red.y+42,'the fighter cannot fly through the hull');
 assert.ok(red.shots>0,'the frigate can defend itself against the raid');
});

test('Large-Scale Battle is isolated, uses the Free Fly hull scale, and runs all 100 pilots through combat',()=>{
 const options={redGrinSim:true,cockpitUI:true,flightShell:true,buildUI:true,reducedMotion:true,initialHe3:0,
  canvasBox:{width:390,height:608},sharedStorage:new Map(),
  address:{search:'?hangar=carrier&vessel=rift-carrier',hostname:'rift.example',origin:'https://rift.example'}};
 const reference=setup({...options,sharedStorage:new Map()});
 reference.click('hangar-scale-free-fly');
 const mock=reference.inspect().scaleFlyShips;
 const q=setup(options);
 q.click('hangar-large-scale-battle');
 const {fighterBattle:s,p,flightMode,arena}=q.inspect();
 const saved=[...q.storage.entries()];
 assert.equal(flightMode.hull,'none');assert.equal(flightMode.credits,false);
 assert.equal(s.bots.length+1,100);assert.ok(s.bots.every(bot=>bot.r===p.r));
 assert.ok(arena.right-arena.left>3100);
 assert.ok(s.frigates.every(ship=>ship.width===mock.widths[1]&&ship.length===mock.lengths[1]));
 assert.equal(p.x,s.frigates[0].pads[2].x);assert.equal(p.y,s.frigates[0].pads[2].y);
 const view=q.el['fighter-scale-view'];assert.equal(view.hidden,false);
 q.click('fighter-scale-view');
 assert.ok(q.inspect().camera.zoom<.5);
 q.click('fighter-scale-view');assert.equal(q.inspect().camera.zoom,1);
 q.click('fighter-cross-action');
 q.step(4100);
 assert.ok(s.time>60);assert.equal(s.launching,false);
 assert.ok(s.redCount<50&&s.blueCount<50,'the two sides engage at the larger scale');
 assert.deepEqual([...q.storage.entries()],saved);
 const watch=setup({...options,sharedStorage:new Map()});
 watch.click('hangar-watch-large-scale-battle');watch.step(150);
 assert.equal(watch.inspect().fighterBattle.bots.length,100);
 assert.equal(watch.el['fighter-scale-view'].hidden,true);
});

test('both 50 vs 50 maps use the shield dome, absorb breaking lasers and show kinetic breaches',()=>{
 for(const large of [false,true]){
  const q=large?commence((()=>{
   const q=setup({redGrinSim:true,cockpitUI:true,flightShell:true,buildUI:true,reducedMotion:true,traceClashPaint:true,
    address:{search:'?hangar=carrier&vessel=rift-carrier'}});
   q.click('hangar-large-scale-battle');return q;
  })()):launch({traceClashPaint:true});
  const {fighterBattle:s,arena}=q.inspect(),h=s.frigates[1];
  for(const ship of s.bots)ship.bayUntil=1e5;
  for(const ship of s.frigates)ship.fire.readyAt=1e5;
  const send=(kind,damage,x,y)=>{
   const shot={x,y,vx:0,vy:-470,a:-Math.PI/2,simUntil:s.time+3,damage,kind,weapon:kind==='energy'?'blaster':'ballistic',frigateTarget:h};
   q.inspect().shots.push(shot);return shot;
  };
  const edge=h.y+h.width*.64+42,start=Math.min(arena.bottom-20,edge+150);
  let shot=send('energy',4,h.x,start);
  for(let i=0;i<80&&q.inspect().shots.includes(shot);i++)q.step();
  assert.equal(h.shieldHp,10);assert.equal(h.hp,66);assert.equal(h.shieldRipples.at(-1).depleted,false);
  shot=send('energy',18,h.x,start);
  for(let i=0;i<80&&q.inspect().shots.includes(shot);i++)q.step();
  assert.equal(h.shieldHp,0);assert.equal(h.hp,66,'energy does not overflow into the hull');
  assert.equal(h.shieldRipples.at(-1).depleted,true);
  shot=send('ballistic',5,h.x,edge+15);
  q.step(8);assert.equal(h.shieldRipples.at(-1).penetrated,true);assert.equal(h.hp,66);
  q.step(23);assert.equal(h.hp,61,'the original ballistic round reaches the hull');
 }
});
