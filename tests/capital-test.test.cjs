'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {setup}=require('./ballistic.test.cjs');
const load=(search='?launch=capital-test',opts={})=>{
 const returned=[];
 return {q:setup({address:{search,replace:to=>returned.push(to)},...opts}),returned};
};
const read=file=>fs.readFileSync(path.resolve(__dirname,'../dist',file),'utf8');
const near=(a,b,tol=1e-7)=>assert.ok(Math.abs(a-b)<=tol,`${a} != ${b}`);
const delta=(a,b)=>Math.atan2(Math.sin(a-b),Math.cos(a-b));
test('Capital is a distinct flight under Carrier Missions and uses the real fitted pilot with one lazy overhead texture',()=>{
 const html=read('carrier.html'),missions=html.match(/<details class="carrier-missions" id="carrier-missions">([\s\S]*?)<\/details>/)[1];
 assert.match(missions,/<a [^>]*id="carrier-launch-capital-test" href="\.\/index\.html\?launch=capital-test"[^>]*>Capital \(test\)<\/a>/);
 assert.match(missions,/index\.html\?launch=carrier-launch"[^>]*>Launch/);
 const art=fs.readFileSync(path.resolve(__dirname,'../dist/carrier-capital.webp'));
 assert.equal(art.toString('ascii',8,16),'WEBPVP8X');assert.ok(art[20]&0x10);
 assert.deepEqual([art.readUIntLE(24,3)+1,art.readUIntLE(27,3)+1],[512,768]);
 assert.ok(art.length<45000);
 const standard=load('?launch=practice',{sprite:true}).q;
 assert.equal(standard.inspect().capitalShip,null);
 assert.equal(standard.sprites.some(art=>art.src.startsWith('./carrier-capital')),false);
 const {q}=load(undefined,{sprite:true,savedEngine:JSON.stringify({version:1,engine:'test-thruster'})});
 assert.equal(q.inspect().state,'play');assert.equal(q.inspect().fighterLoadout.engine,'test-thruster');
 assert.ok(q.inspect().p.speed<130);
 assert.equal(q.el['return-main-menu'].textContent,'Return to Carrier');
 assert.match(q.el['vandul-duel-readout'].textContent,/Capital test.*No credits or damage saved/);
 assert.equal(q.graphs.length,0);
 const cap=q.sprites.find(art=>art.src==='./carrier-capital.webp?v=133');assert.ok(cap);
 Object.assign(cap,{complete:true,naturalWidth:512,naturalHeight:768});
 q.step();const s=q.inspect();
 assert.equal(s.arena.bottom-s.arena.top,2376);assert.equal(s.camera.w,480);assert.equal(s.camera.h,720);
 assert.deepEqual([s.cones.length,s.asteroids.length,s.sceneryDebris.length,s.vanduls.length,s.duelCountdown],[0,0,0,0,0]);
 assert.ok(q.spriteFrames.some(f=>f.asset===cap&&f.bounds[2]===s.capitalCourse.width));
 q.key('keydown','KeyE');q.step(12);assert.ok(s.p.vy< -40,'normal fitted fighter thruster actually flies');
});
test('capital patrol is tangent-continuous through all eight orientations, bounded, and parks/resets/returns',()=>{
 const {q,returned}=load();q.step();
 const {capitalShip:c,capitalCourse:spec,capitalCoursePose:pose,arena}=q.inspect();
 const initial=[c.x,c.y,c.aim];
 q.step(125);near(c.y,initial[1]-spec.speed*2);near(c.x,initial[0]);near(c.aim,initial[2]);
 const loop=4*spec.halfRun+2*Math.PI*spec.radius,span=loop/1024;
 const seen=new Set();
 for(let i=0;i<1024;i++){
  const p=pose(i*span),n=pose((i+1)*span);
  assert.ok(Math.abs(delta(n.aim,p.aim))<.02,'no heading discontinuity at waypoints');
  assert.ok(Math.hypot(p.x-n.x,p.y-n.y)<=span+1e-7);
  const clearance=Math.hypot(spec.width/2,spec.height/2);
  assert.ok(p.x-clearance>arena.left&&p.x+clearance<arena.right&&p.y-clearance>arena.top&&p.y+clearance<arena.bottom);
  seen.add((Math.round(p.aim/(Math.PI/4))+8)%8);
 }
 assert.equal(seen.size,8);
 assert.deepEqual(pose(0),pose(loop));
 const frozen=c.distance;q.key('keydown','KeyP');q.step(60);near(c.distance,frozen);
 q.choose('resume');q.hide(true);q.step(40);near(c.distance,frozen);
 q.hide(false);q.choose('resume');q.step(20);assert.ok(c.distance>frozen);
 q.reset();const next=q.inspect().capitalShip;assert.notEqual(next,c);near(next.distance,0);
 q.click('return-main-menu');assert.deepEqual(returned,['./carrier.html']);assert.equal(q.inspect().capitalShip,null);
 assert.equal(q.inspect().arena.top,12);assert.equal(q.el['vandul-duel-readout'].hidden,true);
});
test('carrier is solid but non-damaging, absorbs shots without points, and does not mutate the pilot save',()=>{
 const hullKey='rift-runner.hull-owned.v1',buildKey='rift-runner.ship-build.v1',walletKey='rift-runner.pilot-credits.v1';
 const parts=['stock-thruster','weifer-he3-core','kestrel-h20-reserve-cell','blaster'];
 const storage=new Map([[hullKey,JSON.stringify({version:1,hull:'rift-fighter',condition:'repaired',hullHp:11,maxHullHp:20})],
  [buildKey,JSON.stringify({version:1,hull:'rift-fighter',engine:parts[0],core:parts[1],battery:parts[2],primary:parts[3],secondary:null,shield:null})],
  [walletKey,'save sentinel']]);
 const before=Array.from(storage),{q,returned}=load(undefined,{sharedStorage:storage,buildUI:true,pilotCredits:{
  getBuildState:()=>({origin:'new',owned:parts}),owns:x=>parts.includes(x),awardVictory(){assert.fail('victory reward');},recordEnemyKill(){assert.fail('kill reward');}
 }});
 q.step();const {capitalShip:c,p,arena}=q.inspect(),stern=c.hull.at(-1);
 Object.assign(p,{x:stern.x-stern.r-p.r-5,y:stern.y,vx:190,vy:0});
 q.step(8);
 assert.ok(Math.hypot(p.x-stern.x,p.y-stern.y)>stern.r+p.r-.02,'hull repels the smaller fighter');
 assert.ok(p.vx<60);assert.equal(p.hp,20);near(c.x,625);
 Object.assign(p,{x:stern.x-stern.r-45,y:stern.y,aim:0,vx:0,vy:0});
 q.click('fire-button');assert.equal(q.inspect().shots.length,1);
 q.step(8);assert.equal(q.inspect().shots.length,0);assert.equal(q.inspect().practiceHits,0);
 Object.assign(p,{x:arena.right-p.r-.1,y:600,vx:240,vy:0,impactCooldown:0});q.step(3);
 assert.equal(p.hp,20,'capital testing walls cannot damage the real fitted hull');
 q.click('return-main-menu');assert.deepEqual(returned,['./carrier.html']);
 assert.deepEqual(Array.from(storage).filter(([key])=>[hullKey,buildKey,walletKey].includes(key)),before);
});

function awaitPhase(q,phase,max=200){
 for(let i=0;i<max&&q.inspect().capitalShip.phase!==phase;i++)q.step();
 assert.equal(q.inspect().capitalShip.phase,phase);
}
function lineUp(q,{side=0,aft=0,extraVelocity=0,heading=0}={}){
 const {capitalShip:c,p,capitalBerth:b,berthWorld,berthVelocity}=q.inspect();
 const xy=berthWorld(c,side,b.approach+aft),v=berthVelocity(0,b.approach);
 Object.assign(p,xy,{vx:v.x+extraVelocity,vy:v.y,aim:c.aim+heading,aimTarget:c.aim+heading});
}
test('new Mission Launch starts aboard and moves with the carrier before a deliberate launch',()=>{
 const {q,returned}=load('?launch=carrier-launch');
 const a=q.inspect(),c=a.capitalShip,{p,capitalBerth:b,berthLocal,berthVelocity}=a;
 const action=q.el['capital-dock-action'],status=q.el['capital-dock-status'],deck=q.el['flight-deck'];
 assert.equal(action.textContent,'Launch');assert.equal(action.disabled,false);
 assert.equal(q.focused,action);assert.equal(deck.inert,true);assert.equal(q.graphs.length,0);
 assert.equal(c.phase,'docked');near(berthLocal(c,p.x,p.y).y,b.bay);
 q.click('capital-dock-action',{isTrusted:false});assert.equal(c.phase,'docked');
 q.key('keydown','KeyE');q.key('keydown','Space');q.click('fire-button');q.step(35);
 near(berthLocal(c,p.x,p.y).y,b.bay);assert.ok(c.distance>17);assert.equal(q.inspect().shots.length,0);
 assert.match(status.textContent,/Aboard/);
 q.click('capital-dock-action');assert.equal(c.phase,'launching');assert.equal(action.disabled,true);
 const start=c.distance;q.step(45);
 assert.ok(c.distance>start&&berthLocal(c,p.x,p.y).y>b.bay+25);
 assert.equal(deck.inert,true);
 q.key('keydown','KeyP');const frozen=[c.distance,p.x,p.y];q.step(60);
 assert.deepEqual([c.distance,p.x,p.y],frozen);q.choose('resume');
 awaitPhase(q,'flight');assert.equal(deck.inert,false);assert.equal(q.focused,q.el.game);
 assert.equal(action.textContent,'Request Docking');
 near(berthLocal(c,p.x,p.y).y,b.launchEnd,.01);
 const v=berthVelocity(0,b.launchEnd);
 assert.ok((p.vx-v.x)*-Math.cos(c.aim)+(p.vy-v.y)*-Math.sin(c.aim)>55,'handoff inherits carrier velocity plus outbound drift');
 const before=p.vx;q.key('keydown','KeyD');q.step(4);q.key('keyup','KeyD');assert.ok(p.vx>before,'normal fitted controls resume');
 q.click('return-main-menu');assert.deepEqual(returned,['./carrier.html']);assert.equal(q.el['capital-dock-hud'].hidden,true);
});

test('both capital gameplay routes require real aft position, heading and relative speed, then capture and relaunch',()=>{
 for(const route of ['?launch=capital-test','?launch=carrier-launch']){
  const {q}=load(route),a=q.inspect(),c=a.capitalShip,{p,capitalBerth:b,berthLocal,capitalDockCheck}=a;
  q.step();
  if(c.phase==='docked'){q.click('capital-dock-action');awaitPhase(q,'flight');}
  assert.equal(capitalDockCheck(),null);
  q.click('capital-dock-action');assert.ok(capitalDockCheck());
  for(const miss of [{side:b.maxGap+5},{extraVelocity:b.maxSpeed+4},{heading:b.maxHeading+.10}]){
   lineUp(q,miss);const before=capitalDockCheck();assert.equal(before.ready,false);
   q.click('capital-dock-action');assert.equal(c.phase,'flight');
  }
  lineUp(q);assert.equal(capitalDockCheck().ready,true);
  q.click('capital-dock-action');assert.equal(c.phase,'docking');assert.equal(q.el['flight-deck'].inert,true);
  q.step(36);assert.ok(berthLocal(c,p.x,p.y).y<b.approach-12&&c.phase==='docking');
  const hold=c.distance;q.hide(true);q.step(90);near(c.distance,hold);
  q.hide(false);q.choose('resume');awaitPhase(q,'docked');
  near(berthLocal(c,p.x,p.y).y,b.bay);near(delta(p.aim,c.aim),0);
  assert.equal(q.el['capital-dock-action'].textContent,'Launch');
  q.click('capital-dock-action');awaitPhase(q,'flight');
  assert.equal(q.inspect().capitalShip,c,'one continuous carrier and patrol, not a page reload');
  assert.equal(capitalDockCheck(),null,'launch never preserves prior clearance');
  q.click('capital-dock-action');assert.ok(capitalDockCheck());
  q.reset();assert.equal(capitalDockCheck(),null,'reset clears pending clearance');
  assert.equal(q.inspect().capitalShip.phase,route.endsWith('carrier-launch')?'docked':'flight','Reset restores each original entry');
 }
});

test('approach clearance is safe through all eight headings and Reduced Motion preserves launch/dock readiness',()=>{
 const {q}=load('?launch=carrier-launch',{reducedMotion:true});
 const {capitalCourse:spec,capitalCoursePose:pose,arena,berthWorld,capitalBerth:b}=q.inspect();
 const span=4*spec.halfRun+2*Math.PI*spec.radius;
 for(let i=0;i<360;i++){
  const c=pose(i/360*span),mark=berthWorld(c,0,b.approach),exit=berthWorld(c,0,b.launchEnd);
  assert.ok(mark.x>arena.left+b.maxGap&&mark.x<arena.right-b.maxGap&&mark.y>arena.top+b.maxGap&&mark.y<arena.bottom-b.maxGap);
  assert.ok(exit.x>arena.left+17&&exit.x<arena.right-17&&exit.y>arena.top+17&&exit.y<arena.bottom-17);
 }
 q.click('capital-dock-action');q.step(2);assert.equal(q.inspect().capitalShip.phase,'flight');
 lineUp(q);q.click('capital-dock-action');assert.equal(q.inspect().capitalShip.phase,'flight');
 q.click('capital-dock-action');q.step(2);assert.equal(q.inspect().capitalShip.phase,'docked');
 const practice=load('?launch=practice').q;practice.click('capital-dock-action');
 assert.equal(practice.el['capital-dock-hud'].hidden,true);assert.equal(practice.inspect().capitalShip,null);
});

test('initial mobile docked frame and resize retain the attached fighter with no free-flight flash',()=>{
 const box={width:378,height:430,left:0,top:0};
 const {q}=load('?launch=carrier-launch',{canvasBox:box,sprite:true});
 const a=q.inspect(),c=a.capitalShip,{p,capitalBerth:b,berthLocal}=a;
 assert.equal(c.phase,'docked');near(berthLocal(c,p.x,p.y).y,b.bay);
 assert.equal(q.el['flight-deck'].inert,true);
 for(const art of q.sprites){
  const cap=art.src.includes('carrier-capital');
  Object.assign(art,{complete:true,naturalWidth:cap?512:480,naturalHeight:cap?768:320});
 }
 q.step();
 assert.ok(q.spriteFrames.some(f=>f.asset.src.includes('carrier-capital')));
 assert.ok(q.spriteFrames.some(f=>f.asset.src.includes('fighter-winged')&&Math.hypot(f.translation[0]-p.x,f.translation[1]-p.y)<12));
 Object.assign(box,{width:635,height:307});q.outside('resize',{});q.step();
 assert.equal(c.phase,'docked');near(berthLocal(c,p.x,p.y).y,b.bay);
 assert.ok(q.inspect().camera.w>q.inspect().camera.h);
 assert.equal(q.el['flight-deck'].inert,true);assert.equal(q.inspect().practiceShots,0);
});
test('the carrier underglow renders in both live flight modes, not in Practice',()=>{
 for(const route of ['?launch=capital-test','?launch=carrier-launch','?launch=practice']){
  const q=load(route,{traceClashPaint:true}).q;q.step(3);
  const wash=q.radialPaint.find(p=>p.args.length===6&&p.args[5]===213&&p.stops.includes('#4488aa00'));
  assert.equal(Boolean(wash),!route.endsWith('practice'));
 }
});

test('both routes require a clearance request before showing an approach guide, with two deliberate actions even when lined up',()=>{
 const html=read('index.html');
 assert.match(html,/<div class="flight-action-strip">\s*<div id="capital-dock-hud"[^>]*>[\s\S]*?<\/div>\s*<div class="weapon-rack"/);
 for(const route of ['?launch=capital-test','?launch=carrier-launch']){
  const {q}=load(route),{capitalShip:c,capitalDockCheck,p}=q.inspect();
  const action=q.el['capital-dock-action'],status=q.el['capital-dock-status'];
  const drawn=()=>q.dashPatterns.filter(p=>p[0]===5&&p[1]===6).length;
  if(c.phase==='docked'){assert.equal(q.rack.inert,true);q.click('capital-dock-action');awaitPhase(q,'flight');}
  lineUp(q);q.step();
  assert.equal(action.textContent,'Request Docking');assert.equal(action.disabled,false);
  assert.equal(drawn(),0,'no ring before clearance even when perfectly aligned');
  q.click('capital-dock-action',{isTrusted:false});assert.equal(capitalDockCheck(),null);
  const prior=[p.x,p.y,p.vx,p.vy,p.aim];
  q.click('capital-dock-action');
  assert.equal(c.phase,'flight');assert.deepEqual([p.x,p.y,p.vx,p.vy,p.aim],prior);
  assert.equal(action.textContent,'Dock');assert.match(status.textContent,/Aligned/);
  q.step();assert.ok(drawn()>0,'ring displayed after clearance');
  q.key('keydown','KeyD');q.step(4);q.key('keyup','KeyD');
  assert.ok(capitalDockCheck(),'clearance persists through another maneuver');
  q.key('keydown','KeyP');q.step(2);assert.equal(action.disabled,true);
  q.click('capital-dock-action');assert.equal(c.phase,'flight');
  q.choose('resume');assert.ok(capitalDockCheck());
  lineUp(q);q.click('capital-dock-action');
  assert.equal(c.phase,'docking');assert.equal(capitalDockCheck(),null,'capture consumes clearance');
  const stopped=drawn();q.step(3);assert.equal(drawn(),stopped,'guide leaves immediately when docking begins');
 }
});
test('cockpit strip preserves the weapon selector and uses a small separate WebP backdrop',()=>{
 const html=read('index.html'),css=read('style.css');
 assert.match(html,/class="flight-action-strip">\s*<div id="capital-dock-hud"[\s\S]*?<\/div>\s*<div class="weapon-rack"/);
 assert.match(css,/flight-action-strip:has\(>#capital-dock-hud:not\(\[hidden\]\)\)[^{]*\{[^}]*rift4-flight-cockpit\.webp\?v=138/);
 const art=fs.readFileSync(path.resolve(__dirname,'../dist/rift4-flight-cockpit.webp'));
 assert.equal(art.toString('ascii',8,12),'WEBP');assert.ok(art.length<16000);
});
