'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {setup}=require('./ballistic.test.cjs');
const center=(q,type,id=16)=>q.pointer(type,id,'move-pad',80,460,{target:q.el['main-thruster']});
const near=(actual,expected,tol=1e-6)=>assert.ok(Math.abs(actual-expected)<=tol,`${actual} near ${expected}`);
function prepare(q){
 q.step();
 const {p,cones,asteroids,sceneryDebris}=q.inspect();
 cones.splice(0);asteroids.splice(0);sceneryDebris.splice(0);
 Object.assign(p,{x:485,y:755,aim:0,vx:0,vy:0});
 return p;
}
test('center has exactly 6× the strongest trim push, but uses the same fitted cap and coast is longer',()=>{
 const qs=[setup(),setup(),setup()];
 for(const q of qs)q.choose('practice');
 const [main,trim,diagonal]=qs.map(prepare);
 center(qs[0],'pointerdown');
 qs[1].key('keydown','KeyD');
 qs[2].key('keydown','KeyD');qs[2].key('keydown','KeyS');
 for(const q of qs)q.step();
 near(main.vx,trim.vx*6);
 assert.ok(Math.hypot(diagonal.vx,diagonal.vy)<=trim.vx+1e-8);
 assert.equal(main.mainMomentum,true);
 assert.equal(trim.mainMomentum,false);assert.equal(diagonal.mainMomentum,false);
 qs[0].step(30);qs[1].step(30);
 near(main.vx,main.speed);near(trim.vx,trim.speed);
 assert.equal(qs[0].el['main-thruster'].dataset.held,'true');
 center(qs[0],'pointerup');qs[1].key('keyup','KeyD');
 assert.equal(qs[0].el['main-thruster'].dataset.held,undefined);
 assert.equal(qs[0].inspect().movePulse,null);
 const starts=[main.x,trim.x];qs[0].step(26);qs[1].step(26);
 near(main.vx,main.speed*Math.exp(-main.brakeDamping*.4*.416));
 near(trim.vx,trim.speed*Math.exp(-trim.brakeDamping*.416));
 assert.ok(main.vx>trim.vx*1.9);assert.ok(main.x-starts[0]>(trim.x-starts[1])*1.3);
 qs[0].key('keydown','KeyA');qs[0].step(11);qs[0].key('keyup','KeyA');
 assert.ok(main.vx<0,'an explicit trim input can brake and reverse main-thrust glide');
 assert.equal(main.mainMomentum,false,'crossing near zero clears the special coast');
 qs[0].reset();assert.equal(qs[0].inspect().p.mainMomentum,false);
});
test('aim independently while holding, then spin 180° without rotating the released momentum',()=>{
 const q=setup(),control=q.el['main-thruster'];
 q.choose('practice');const p=prepare(q);
 center(q,'pointerdown');
 q.pointer('pointerdown',17,'aim-pad',420,360);
 q.step(2);
 assert.ok(p.vx>80&&Math.abs(p.vy)<1e-6);
 q.pointer('pointermove',17,'aim-pad',240,700);q.step();
 assert.ok(p.vx>80&&p.vy>0&&p.vy<30,'the initial turn adds a small, gradual side component');
 q.step(14);assert.ok(p.vx>80&&p.vy>80,'new nose force adds to, not replaces, the old travel vector');
 q.pointer('pointermove',16,'move-pad',145,460);
 assert.equal(q.inspect().thrustPtr.button,control,'captured center contact remains the main thruster when dragged');
 const before=[p.vx,p.vy],turn=p.aim+Math.PI;
 center(q,'pointerup');assert.equal(q.inspect().aimPtr.id,17);
 q.pointer('pointermove',17,'aim-pad',240,20);q.step(3);
 assert.ok(Math.abs(Math.sin(p.aim)-Math.sin(turn))>.25);
 near(p.vx,p.vy*before[0]/before[1]);q.step(26);
 near(Math.cos(p.aim),Math.cos(turn));near(Math.sin(p.aim),Math.sin(turn));
 near(p.vx,p.vy*before[0]/before[1]);
 assert.ok(p.vx>0&&p.vy>0&&p.vy<before[1]);
 q.pointer('pointerup',17,'aim-pad');
});
test('E, accessible center keyboard, pointer cancellation and iOS touch fallback cannot leave thrust stuck',()=>{
 const q=setup();q.choose('practice');const p=prepare(q),button=q.el['main-thruster'],pad=q.el['move-pad'];
 q.key('keydown','KeyE');q.step(2);q.key('keyup','KeyE');
 assert.ok(p.vx>80);assert.equal(button.dataset.held,undefined);
 assert.equal(q.inspect().practiceShots,0);
 const act=(type,code='Space')=>pad.handlers[type]({type,code,target:button,isTrusted:true,preventDefault(){}});
 act('keydown');q.step();act('keyup');
 assert.equal(q.inspect().movePulse,null);assert.equal(button.dataset.held,undefined);
 assert.equal(q.inspect().practiceShots,0);
 center(q,'pointerdown');center(q,'pointercancel');
 assert.equal(q.inspect().thrustPtr,null);assert.equal(button.dataset.held,undefined);
 center(q,'pointerdown');q.pointer('lostpointercapture',16,'move-pad');
 assert.equal(q.inspect().thrustPtr,null);
 center(q,'pointerdown');q.outside('touchend',{changedTouches:[{target:q.el['aim-pad']}],touches:[{target:button}]});
 assert.equal(q.inspect().thrustPtr.id,16);
 q.outside('touchcancel',{changedTouches:[{target:button}],touches:[]});
 assert.equal(q.inspect().thrustPtr,null);
 center(q,'pointerdown');q.blur();
 assert.equal(q.inspect().thrustPtr,null);assert.equal(q.inspect().state,'pause');assert.equal(button.dataset.held,undefined);
 const html=fs.readFileSync(['../dist/index.html','../index.html'].map(x=>path.join(__dirname,x)).find(x=>fs.existsSync(x)),'utf8');
 assert.match(html,/<button class="dpad-centre" id="main-thruster" type="button" aria-label="Hold main thruster" aria-keyshortcuts="E"/);
});

test('boost and trim can be held by independent pointers, and turning gets easier as propulsion and speed fall',()=>{
 function nudge(speed,powered){
  const q=setup();q.choose('practice');const p=prepare(q),pad=q.el['main-thruster'];
  p.vx=speed;
  if(powered)center(q,'pointerdown',16);
  q.pointer('pointerdown',17,'move-pad',80,509,{target:q.moveButtons.s});
  assert.equal(q.el['main-thruster'].dataset.held,powered?'true':undefined);
  assert.equal(q.moveButtons.s.dataset.held,'true');
  q.step();
  if(powered){
   assert.equal(q.inspect().thrustPtr.id,16);assert.equal(q.inspect().movePtr.id,17);
   q.outside('touchend',{changedTouches:[{target:pad}],touches:[{target:q.moveButtons.s}]});
   assert.equal(q.inspect().thrustPtr,null);assert.equal(q.inspect().movePtr.id,17);
  }
  const speedAfter=Math.hypot(p.vx,p.vy);
  assert.ok(speedAfter<=p.speed+1e-8);
  return {side:p.vy,forward:p.vx};
 }
 const active=nudge(222,true),fast=nudge(222,false),slow=nudge(55,false);
 assert.ok(active.side>2.8&&active.side<3.3,'full boost still permits a small lateral correction');
 assert.ok(fast.side>5.8&&fast.side<6.1,'fast glide bends farther than boosted flight');
 assert.ok(slow.side>9.2&&slow.side<9.6,'the same trim bends most at low speed');
 assert.ok(active.forward>221&&fast.forward>219);
});

test('actual player, both Wingmen, and Vandul call the same across-track response',()=>{
 const trace=[];
 const q=setup({address:{search:'?launch=wingman-test'},reducedMotion:true,fieldSeed:836,
  steeringTrace:row=>{if(trace.length<2000)trace.push(row);}});
 const p=prepare(q),{testLead,wingman,vandul}=q.inspect();
 Object.assign(p,{x:480,y:950,vx:180,vy:0,aim:0});
 Object.assign(testLead,{x:441,y:897,vx:90,vy:17});
 Object.assign(wingman,{x:560,y:902,vx:-50,vy:40});
 Object.assign(vandul,{x:355,y:750,vx:92,vy:55});
 q.key('keydown','KeyE');q.key('keydown','KeyS');q.step(25);
 q.key('keyup','KeyE');q.key('keyup','KeyS');
 for(const ship of [p,testLead,wingman,vandul]){
  const rows=trace.filter(r=>r.ship===ship&&Math.hypot(...r.before)>1);
  assert.ok(rows.length,'ship used the common steering path');
  let resistant=0;
  for(const {before:[x,y],after:[X,Y],dx,dy,ref,drive} of rows){
   const speed=Math.hypot(x,y),u=x/speed,v=y/speed;
   const along=dx*u+dy*v,across=dy*u-dx*v;
   near((X-x)*u+(Y-y)*v,along,1e-8);
   const ratio=speed/ref,limit=z=>Math.min(1,Math.max(0,z));
   const gain=1-.38*limit((ratio-.2)/.8)**2-(drive?.30*limit((ratio-.06)/.52):0);
   near((Y-y)*u-(X-x)*v,across*gain,1e-8);
   if(Math.abs(across)>1e-4&&gain<.999)resistant++;
  }
  assert.ok(resistant>0,'observed real correction reduced by motion in '+(ship.role??(ship.vandul?'vandul':'player')));
 }
 assert.equal(q.inspect().practiceShots,0);
});

test('main thrust paints a large flame behind the actual nose, never trim-only, and stops on release',()=>{
 for(const reducedMotion of [false,true]){
  const flarePaint=[],q=setup({reducedMotion,flarePaint});q.choose('practice');const p=prepare(q);
  q.key('keydown','KeyD');q.step();q.key('keyup','KeyD');assert.equal(flarePaint.length,0);
  center(q,'pointerdown');q.step();
  assert.equal(p.mainThrustActive,true);assert.equal(flarePaint.length,4);
  const layers=flarePaint.slice(),[head,,,tail]=layers;
  assert.ok(head.translation[1]-head.scaleXY[1]<18,'starts at the rear of the fighter art');
  assert.ok(tail.translation[1]+tail.scaleXY[1]>75,'large exhaust plume runs beyond the hull');
  assert.ok(layers.every(layer=>layer.stops.at(-1)[1]==='#2e8ffd00'),'each lobe feathers to transparent around the entire edge');
  near(head.rotation,Math.PI/2);
  q.pointer('pointerdown',17,'aim-pad',240,700);q.step();
  near(flarePaint[4].rotation,p.aim+Math.PI/2);
  assert.ok(flarePaint[4].rotation>Math.PI/2&&flarePaint[4].rotation<Math.PI);
  if(reducedMotion)assert.deepEqual(head.scaleXY,flarePaint[4].scaleXY,'Reduced Motion keeps static flame size');
  center(q,'pointerup');q.step();
  assert.equal(flarePaint.length,8,'release hides flame while momentum continues');
  assert.equal(p.mainMomentum,true);assert.equal(p.mainThrustActive,false);
 }
});

test('powered exhaust layers translucent flame, bounded soft smoke and short sparking particles',()=>{
 for(const reducedMotion of [false,true]){
  const flarePaint=[],exhaustPaint=[],q=setup({reducedMotion,flarePaint,exhaustPaint});
  q.choose('practice');prepare(q);center(q,'pointerdown');q.step();
  assert.equal(flarePaint.length,4);
  assert.ok(flarePaint.every(e=>e.alpha>0&&e.alpha<.82));
  assert.ok(flarePaint.every(e=>/^#[\da-f]{6}94$/i.test(e.stops[1][1])));
  assert.ok(flarePaint[3].alpha<flarePaint[0].alpha,'tail is substantially more translucent');
  const smoke=exhaustPaint.filter(e=>e.kind==='smoke'),sparks=exhaustPaint.filter(e=>e.kind==='spark');
  assert.equal(smoke.length,reducedMotion?2:3);
  assert.equal(sparks.length,reducedMotion?0:7);
  assert.ok(smoke.every(e=>e.alpha<.18&&e.stops.at(-1)[1].endsWith('00')));
  assert.ok(sparks.every(e=>e.alpha<.6&&e.h<4&&e.y>18));
  exhaustPaint.length=0;q.step();
  if(!reducedMotion)assert.notDeepEqual(exhaustPaint.filter(e=>e.kind==='spark'),sparks,'sparks advance each frame');
  else assert.deepEqual(exhaustPaint.filter(e=>e.kind==='smoke').map(x=>x.args),smoke.map(x=>x.args));
  exhaustPaint.length=0;center(q,'pointerup');q.step();
  assert.equal(exhaustPaint.length,0,'no stale smoke or sparks on coast');
 }
});

const surgeID='surge-7-thruster';
function surgeFlight(options={}){
 const q=setup({savedEngine:JSON.stringify({version:1,engine:surgeID}),...options});
 if(q.inspect().state==='menu')q.choose('practice');
 return q;
}
test('Surge-7 double-tap burns one charge and holds a bounded high boost before rearming',()=>{
 const q=surgeFlight(),p=prepare(q),button=q.el['main-thruster'];
 near(p.speed,11*22.2*Math.pow(106/(p.weight),.95));
 center(q,'pointerdown',16);q.step();center(q,'pointerup',16);
 const before=p.he3;
 center(q,'pointerdown',17);center(q,'pointerup',17);
 near(p.he3,before-4);near(p.heat,14);
 assert.equal(button.dataset.surge,'active');assert.match(q.el['surge-status'].textContent,/boost active/i);
 q.step(6);assert.ok(Math.hypot(p.vx,p.vy)>p.speed*1.3&&Math.hypot(p.vx,p.vy)<=330.001);
 const ready=q.inspect().surgeReadyAt;
 center(q,'pointerdown',18);center(q,'pointerup',18);
 center(q,'pointerdown',19);center(q,'pointerup',19);
 assert.equal(q.inspect().surgeReadyAt,ready);
 q.step(39);assert.equal(button.dataset.surge,'cooldown');assert.match(q.el['surge-thruster-label'].textContent,/s$/);
 q.step(344);assert.equal(button.dataset.surge,'ready');
});

test('E needs two deliberate edges, and low He3, pause and locked carrier cannot activate boost',()=>{
 const q=surgeFlight(),p=prepare(q),button=q.el['main-thruster'];
 q.key('keydown','KeyE');q.step(3);
 q.key('keydown','KeyE',true);q.key('keydown','KeyE');
 assert.equal(q.inspect().surgeUntil,0,'repeat and a duplicated down cannot be the second tap');
 q.key('keyup','KeyE');p.he3=3;
 q.key('keydown','KeyE');q.key('keyup','KeyE');
 assert.equal(q.inspect().surgeUntil,0);assert.equal(button.dataset.surge,'fuel');near(p.heat,0);
 q.step(6);p.he3=20;
 q.key('keydown','KeyE');q.key('keyup','KeyE');q.step(3);q.key('keydown','KeyE');q.key('keyup','KeyE');
 assert.ok(q.inspect().surgeUntil>0);
 q.key('keydown','KeyP');assert.equal(q.inspect().surgeUntil,0);
 const ready=q.inspect().surgeReadyAt;
 q.step(500);assert.equal(q.inspect().surgeReadyAt,ready);
 q.choose('resume');q.step();
 assert.equal(button.dataset.surge,'cooldown');
 q.reset();q.step();assert.equal(button.dataset.surge,'ready');
 const locked=surgeFlight({address:{search:'?launch=capital-test'},reducedMotion:true});
 locked.step();assert.equal(locked.inspect().capitalShip.phase,'docked');
 locked.key('keydown','KeyE');locked.key('keyup','KeyE');locked.key('keydown','KeyE');locked.key('keyup','KeyE');
 center(locked,'pointerdown');center(locked,'pointerup');
 assert.equal(locked.inspect().surgeUntil,0);assert.equal(locked.el['main-thruster'].dataset.surge,undefined);
 assert.equal(locked.inspect().capitalShip.phase,'docked');
 const stock=setup();stock.choose('practice');stock.step();
 for(let i=0;i<2;i++){stock.key('keydown','KeyE');stock.key('keyup','KeyE');}
 assert.equal(stock.inspect().surgeUntil,0);assert.equal(stock.el['main-thruster'].dataset.surge,undefined);
});

test('Surge-7 still accelerates from normal fitted cruise and stays below the burst ceiling',()=>{
 const q=surgeFlight(),p=prepare(q);
 Object.assign(p,{vx:p.speed,vy:0,he3:20});
 center(q,'pointerdown',16);q.step();center(q,'pointerup',16);
 near(p.vx,p.speed);
 center(q,'pointerdown',17);center(q,'pointerup',17);
 q.step(6);
 assert.ok(p.vx>p.speed*1.3&&p.vx<=Math.min(330,p.speed*1.45)+1e-6);
});

test('canceling a pointer or pausing between taps cannot complete a Surge-7 double tap',()=>{
 const q=surgeFlight(),p=prepare(q);
 center(q,'pointerdown',16);center(q,'pointercancel',16);
 center(q,'pointerdown',17);center(q,'pointerup',17);
 assert.equal(q.inspect().surgeUntil,0);near(p.heat,0);
 q.key('keydown','KeyP');q.choose('resume');
 center(q,'pointerdown',18);center(q,'pointerup',18);
 assert.equal(q.inspect().surgeUntil,0);near(p.heat,0);
 center(q,'pointerdown',19);center(q,'pointerup',19);
 assert.ok(q.inspect().surgeUntil>0,'two new deliberate taps still trigger');
});
