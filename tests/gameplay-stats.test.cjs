'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {setup,tick}=require('./ballistic.test.cjs');
const fit=(primary,secondary)=>JSON.stringify({version:1,primary,secondary});
const tol=(a,b)=>assert.ok(Math.abs(a-b)<1e-9,`${a} != ${b}`);
async function arena(options){
 const q=setup(options);q.open('start');await tick();q.step();q.inspect().cones.splice(0);return q;
}
test('fitted mass changes acceleration, sustained speed and collision impulse',async()=>{
 const stock=await arena(),light=await arena({savedFit:fit('blaster',null)}),mid=await arena({savedFit:fit('ballistic',null)});
 for(const [q,weight] of [[stock,106],[light,99],[mid,101]]){
  const p=q.inspect().p;
  assert.equal(p.weight,weight);assert.equal(p.maxHp,20);tol(p.speed,222*(106/weight)**.95);
  assert.equal(q.el['fit-weight-stat'].textContent,' · Total weight '+weight);
  assert.equal(q.hudNumbers[4].textContent,'20/20');
  tol(p.invMass,.32*106/weight);tol(p.acceleration,1750*(106/weight)**2.15);
  Object.assign(p,{x:100,y:500,aim:0});q.key('keydown','KeyD');q.step();
  tol(p.vx,1750*(106/weight)**2.15*.016);
  q.step(20);tol(p.vx,p.speed);
  q.key('keyup','KeyD');
 }
 const imparted=[];
 for(const q of [stock,light]){
  const p=q.inspect().p;
  Object.assign(p,{x:100,y:420,vx:165,vy:0});
  const c={x:135,y:420,r:15,vx:0,vy:0,angle:0,spin:0,hitGlow:0,wallFx:0,invMass:1};
  q.inspect().cones.push(c);q.step(4);imparted.push(c.vx);assert.equal(p.hp,20,'hard cone bump is not hull damage');
 }
 assert.ok(imparted[0]>imparted[1]&&imparted[1]>100,'higher craft mass imparts more momentum');
 stock.click('open-hangar');stock.fit('primary','ballistic');
 assert.equal(stock.inspect().p.weight,106,'slot swap leaves identical total weight');
 stock.fit('secondary','');
 assert.equal(stock.inspect().p.weight,101,'live fit updates during Hangar without a reset');
 assert.equal(stock.inspect().p.hp,20);
 stock.click('close-hangar');stock.reset();assert.equal(stock.inspect().p.weight,101);
 const engine=stock.inspect().engineProfiles['stock-thruster'];engine.speedRating=8;
 stock.reset();stock.inspect().cones.splice(0);stock.inspect().p.aim=0;stock.key('keydown','KeyD');stock.step(20);
 tol(stock.inspect().p.vx,177.6*(106/101)**.95,'fixture-only engine rating changes actual top thrust speed');
 assert.equal(stock.inspect().p.weight,101);assert.equal(stock.inspect().p.hp,20);
});
test('only hard near-head-on wall crashes damage hull, once per collision, and touch/keyboard can recover',async()=>{
 const q=await arena(),p=q.inspect().p;
 function collision(vx,vy){
  Object.assign(p,{x:930.5,y:390,vx,vy});
  q.step(2);
  assert.equal(p.x,931);assert.equal(p.vx,0);
 }
 collision(70,0);assert.equal(p.hp,20,'soft nudge is safe');
 collision(230,110);assert.equal(p.hp,20,'high normal speed but glancing contact is safe');
 collision(170,0);assert.equal(p.hp,20,'below the hard-impact speed is safe');
 Object.assign(p,{wallFx:.9});collision(222,0);
 assert.equal(p.hp,16,'damage is independent from visual-effect cooldown');
 assert.equal(q.hudNumbers[4].textContent,'16/20');
 q.key('keydown','KeyD');q.step(45);q.key('keyup','KeyD');
 assert.equal(p.hp,16,'held throttle against the wall does not repeatedly drain HP');
 for(const expected of [12,8,4,0]){
  collision(222,0);assert.equal(p.hp,expected);
  if(expected>0)q.step(23);
 }
 assert.equal(q.inspect().state,'disabled');
 assert.equal(q.hudNumbers[4].textContent,'0/20');
 assert.equal(q.el.hud.dataset.hull,'critical');
 assert.match(q.el.overlay.innerHTML,/Hull disabled.*Reset the field.*data-rift="reset"/);
 assert.equal(q.el.overlay.hidden,false);
 q.pointer('pointerdown');q.pointer('pointerup');q.key('keydown','KeyA');q.step(20);
 assert.equal(q.inspect().practiceShots,0);assert.equal(p.x,931);assert.equal(p.hp,0);
 q.open('reset','touch');
 assert.equal(q.inspect().state,'play');assert.equal(q.inspect().p.hp,20);assert.equal(q.hudNumbers[4].textContent,'20/20');
 const second=q.inspect().p;
 Object.assign(second,{x:930.5,y:390,vx:222,vy:0,hp:1});q.step(2);
 assert.equal(second.hp,0,'clamped despite collision damage exceeding remaining HP');
 q.open('reset',''); // Native button keyboard activation dispatches click without a pointer type.
 assert.equal(q.inspect().state,'play');assert.equal(q.inspect().p.hp,20);assert.equal(q.el.overlay.hidden,true);
 q.key('keydown','KeyA');q.step(4);assert.ok(q.inspect().p.vx<0,'controls recover after Reset');
});

test('flight telemetry displays current vector speed rather than a five-unit bucket or the engine cap',async()=>{
 const q=await arena({saved:'ballistic'}),{p}=q.inspect(),speed=()=>Number(q.hudNumbers[0].textContent);
 assert.equal(speed(),0);
 Object.assign(p,{x:210,y:560,vx:4,vy:4.5,aim:-Math.PI/2});
 q.step();
 assert.equal(speed(),6,'two signed (x,y) components give a nearest-unit norm, not a five-unit bucket');
 assert.equal(speed(),Math.round(Math.hypot(p.vx,p.vy)));
 Object.assign(p,{vx:0,vy:0});
 q.click('fire-button');
 assert.equal(speed(),34,'recoil updates telemetry immediately');
 let former=speed();
 for(let i=0;i<5;i++){q.step(9);assert.equal(speed(),Math.round(Math.hypot(p.vx,p.vy)));assert.ok(speed()<former);former=speed();}
 q.key('keydown','KeyD');q.key('keydown','KeyW');q.step(70);
 assert.ok(p.vx>0&&p.vy<0);
 assert.equal(speed(),199,'45 degrees smoothly blends the forward and sideways caps');
});
test('Flight mass follows the physics mass immediately when the fit changes, with accessible units',async()=>{
 const q=await arena();
 assert.equal(q.hudNumbers[5].textContent,'106');
 assert.match(q.el.hud.innerHTML,/speed-stat" title="Actual speed in arena units per second"[^]*aria-hidden="true">u\/s[^]*sr-only"> arena units per second/);
 assert.match(q.el.hud.innerHTML,/mass-stat" title="Flight mass in game units"[^]*aria-hidden="true">u[^]*sr-only"> game units/);
 q.click('open-hangar');
 q.fit('secondary','');
 assert.equal(q.inspect().p.weight,99);
 assert.equal(q.hudNumbers[5].textContent,'99','HUD refreshed for the new fit before the next simulation frame');
 q.fit('secondary','ak77');
 assert.equal(q.inspect().p.weight,108);
 assert.equal(q.hudNumbers[5].textContent,'108');
 q.click('close-hangar');q.reset();
 assert.equal(q.hudNumbers[5].textContent,'108');
 assert.equal(q.hudNumbers[0].textContent,'0');
});

const fittedKey='rift-runner.ship-build.v1',hullKey='rift-runner.hull-owned.v1';
const battery='kestrel-h20-reserve-cell',shield='aegis-s3';
function configured(parts={},ownedOverride){
 const fit={engine:'stock-thruster',core:'weifer-he3-core',battery,primary:'blaster',secondary:'ballistic',...parts};
 const owned=ownedOverride??new Set([...Object.values(fit).filter(Boolean),battery,shield,'test-thruster']);
 return {q:setup({buildUI:true,initialHe3:20,
  sharedStorage:new Map([[fittedKey,JSON.stringify({version:1,hull:'rift-fighter',...fit})],
   [hullKey,JSON.stringify({version:1,hull:'rift-fighter',condition:'repaired'})]]),
  pilotCredits:{getBuildState:()=>({origin:'new',owned:[...owned],kills:0}),owns:id=>owned.has(id)}}),owned};
}
test('battery and paid shield mass update the fit and HUD on mount, removal and ownership refresh',()=>{
 const {q,owned}=configured();
 const mass=()=>q.inspect().p.weight,hudMass=()=>Number(q.hudNumbers[5].textContent);
 q.choose('hangar');assert.equal(mass(),106);
 q.fit('shield',shield);assert.equal(mass(),118);assert.equal(hudMass(),118);
 assert.match(q.el['fit-shield-stat'].textContent,/Weight 12/);
 assert.match(q.el['fit-engine-stat'].textContent,/Rated 222 u\/s.*Fitted forward 200 u\/s/);
 q.fit('shield','');assert.equal(mass(),106);assert.equal(hudMass(),106);
 q.fit('battery','');assert.equal(mass(),100);assert.equal(hudMass(),100);
 q.fit('battery',battery);assert.equal(mass(),106);assert.equal(hudMass(),106);
 q.fit('shield',shield);assert.equal(mass(),118);
 owned.delete(shield);
 q.outside('storage',{key:'rift-runner.pilot-credits.v1'});
 assert.equal(q.inspect().fighterLoadout.shield,null);assert.equal(mass(),106);assert.equal(hudMass(),106);
});
test('same-engine light and shielded/heavy ships differ in real run-up, reversal, drift, recoil and top speed',async()=>{
 const light=configured({primary:'ballistic',secondary:null}).q;
 const heavy=configured({primary:'ballistic',secondary:'ak77',shield}).q;
 const slow=configured({engine:'test-thruster',primary:'ballistic',secondary:'ak77',shield}).q;
 for(const q of [light,heavy,slow]){q.choose('practice');await tick();q.step();q.inspect().cones.splice(0);}
 const [l,h,s]=[light,heavy,slow].map(q=>q.inspect().p);
 assert.deepEqual([l.weight,h.weight,s.weight],[101,122,116]);
 function measure(q,p,action){
  Object.assign(p,{x:380,y:750,aim:0,vx:0,vy:0});
  return action(q,p);
 }
 const data=[];
 for(const [q,p] of [[light,l],[heavy,h],[slow,s]]){
  const forward=measure(q,p,()=>{
   q.key('keydown','KeyD');q.step(4);const accelerate=p.vx;
   q.step(35);q.key('keyup','KeyD');return [accelerate,Math.round(p.vx)];
  });
  const reversal=measure(q,p,()=>{
   p.vx=-120;q.key('keydown','KeyD');let frames=0;
   while(frames<30&&p.vx<120){q.step();frames++;}
   q.key('keyup','KeyD');return frames;
  });
  const coast=measure(q,p,()=>{p.vx=100;q.step(25);return p.vx;});
  const kick=measure(q,p,()=>{q.click('fire-button');return Math.hypot(p.vx,p.vy);});
  data.push({forward,reversal,coast,kick});
 }
 assert.deepEqual(data.map(x=>x.forward[1]),[232,194,102]);
 assert.ok(data[0].forward[0]>data[1].forward[0]*1.35);
 assert.ok(data[1].reversal>=data[0].reversal+3);
 assert.ok(data[1].coast>=data[0].coast+12);
 tol(data[0].kick,34*106/101);tol(data[1].kick,34*106/122);
 assert.equal(heavy.inspect().shots.at(-1)?.damage,5);
});
test('forward, reverse and strafe speeds follow live aim while the steering direction stays independent',async()=>{
 const q=await arena(),{p}=q.inspect();
 const east=()=>{
  q.key('keydown','KeyD');q.step(40);q.key('keyup','KeyD');
  assert.ok(p.vx>0&&Math.abs(p.vy)<1e-8);
  return p.vx;
 };
 Object.assign(p,{x:300,y:730,vx:0,vy:0});
 const northAim=east();tol(northAim,222*.78);
 q.pointer('pointerdown',16,'aim-pad',464,360);
 Object.assign(p,{x:300,y:730,vx:0,vy:0});tol(east(),222);
 q.pointer('pointermove',16,'aim-pad',26,360);
 Object.assign(p,{x:300,y:730,vx:0,vy:0});tol(east(),222*.72);
 q.pointer('pointerup',16,'aim-pad',26,360);
 Object.assign(p,{x:300,y:730,vx:0,vy:0});tol(east(),222*.72);
 assert.equal(q.inspect().practiceShots,0,'the aim pad never moves the pilot direction or triggers a shot');
});

test('a short sideways tap adds correction without cancelling forward glide; sustained strafe and release stay bounded',async()=>{
 const q=await arena(),{p}=q.inspect();
 Object.assign(p,{x:100,y:720,vx:0,vy:-222,aim:-Math.PI/2});
 q.key('keydown','KeyD');q.step();
 assert.ok(p.vx>5.8&&p.vx<6.1,'high-speed glide leaves around 62% across-track authority');
 assert.ok(p.vy< -219);
 q.step();
 assert.ok(p.vx>11.7&&p.vx<12.2,'correction still builds across frames');
 assert.ok(p.vy< -217,'two frames lateral preserve over 97% of forward cruise');
 assert.ok(Math.hypot(p.vx,p.vy)<=222);
 q.step(220);assert.ok(Math.abs(p.vx-222*.78)<.02,'sustained trim approaches its existing strafe speed cap');
 assert.ok(p.vy<0&&p.vy>-45,'continuing to strafe eventually bleeds most of the old momentum');
 const oldForward=p.vy;q.step(50);
 assert.ok(p.vy<0&&p.vy>oldForward,'high-speed inertia cannot lock the first heading');
 const before=Math.hypot(p.vx,p.vy);q.key('keyup','KeyD');q.step(42);
 assert.ok(Math.hypot(p.vx,p.vy)<before*.2,'released controls still use ordinary passive braking');
});
test('a 180° touch aim turn does not rotate velocity, but gentler reverse thrust deliberately brakes it',async()=>{
 const q=await arena(),{p}=q.inspect();
 Object.assign(p,{x:470,y:610,vx:140,vy:52,aim:0});
 q.pointer('pointerdown',16,'aim-pad',26,360);
 q.step(4);
 tol(Math.cos(p.aim),-1);tol(Math.sin(p.aim),0);
 const fade=Math.exp(-p.brakeDamping*.064);
 tol(p.vx,140*fade);tol(p.vy,52*fade);
 q.pointer('pointerup',16,'aim-pad',26,360);
 Object.assign(p,{x:470,y:610,vx:-125,vy:0});
 q.key('keydown','KeyD');q.step(4);
 tol(p.vx,-125+1750*.62*.064);
 assert.ok(p.vx<0,'short reverse presses brake instead of instantly reversing');
 q.step(32);tol(p.vx,222*.72);tol(p.vy,0);
 q.key('keyup','KeyD');
 assert.equal(q.inspect().practiceShots,0,'aim and lateral adjustments never fire');
});
test('for the same engine, a lighter fit corrects sideways faster than a shielded heavy fit',async()=>{
 const [light,heavy]=[configured({primary:'ballistic',secondary:null}),configured({primary:'ballistic',secondary:'ak77',shield})].map(({q})=>q);
 const adjust=[];
 for(const q of [light,heavy]){
  q.choose('practice');await tick();q.step();q.inspect().cones.splice(0);
  const {p}=q.inspect();Object.assign(p,{x:200,y:650,vx:0,vy:-180,aim:-Math.PI/2});
  q.key('keydown','KeyD');q.step(2);q.key('keyup','KeyD');
  adjust.push(p.vx);
  assert.ok(p.vy< -174.6,'both fits keep their existing line of travel during a short nudge');
 }
 assert.ok(adjust[0]>adjust[1]*1.4);
});
