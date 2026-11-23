'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {setup}=require('./ballistic.test.cjs');
const load=(search='?launch=capital-test',opts={})=>{
 const returned=[];
 return {q:setup({address:{search,replace:to=>returned.push(to)},flightShell:true,...opts}),returned};
};
const read=file=>fs.readFileSync(path.resolve(__dirname,'../dist',file),'utf8');
const near=(a,b,tol=1e-7)=>assert.ok(Math.abs(a-b)<=tol,`${a} != ${b}`);
const actionLabel=q=>q.el['capital-dock-action'].textContent;
const delta=(a,b)=>Math.atan2(Math.sin(a-b),Math.cos(a-b));
test('Capital is a distinct flight under Carrier Missions and uses the real fitted pilot with one lazy overhead texture',()=>{
 const html=read('carrier.html'),missions=html.match(/<details class="carrier-missions" id="carrier-missions"[^>]*>([\s\S]*?)<\/details>/)[1];
 assert.match(missions,/<a [^>]*id="carrier-launch-capital-test" href="\.\/index\.html\?launch=capital-test"[^>]*>Capital \(test\)<\/a>/);
 assert.doesNotMatch(missions,/launch=carrier-launch|id="carrier-launch-test"/);
 const art=fs.readFileSync(path.resolve(__dirname,'../dist/carrier-capital.webp'));
 assert.equal(art.toString('ascii',8,16),'WEBPVP8X');assert.ok(art[20]&0x10);
 assert.deepEqual([art.readUIntLE(24,3)+1,art.readUIntLE(27,3)+1],[512,768]);
 assert.ok(art.length<45000);
 const standard=load('?launch=practice',{sprite:true}).q;
 assert.equal(standard.inspect().capitalShip,null);assert.equal(standard.el['vandul-duel-readout'].parentElement,standard.el['arena-toolbar']);
 assert.equal(standard.sprites.some(art=>art.src.startsWith('./carrier-capital')),false);
 const {q}=load(undefined,{sprite:true,savedEngine:JSON.stringify({version:1,engine:'test-thruster'})});
 assert.equal(q.inspect().state,'play');assert.equal(q.inspect().fighterLoadout.engine,'test-thruster');
 assert.equal(q.el['vandul-duel-readout'].parentElement,q.el['flight-details']);assert.equal(q.el['compact-hull-value'].textContent,'20/20');
 assert.ok(q.inspect().p.speed<130);
 assert.equal(q.el['return-main-menu'].textContent,'Return to Carrier');
 assert.match(q.el['vandul-duel-readout'].textContent,/Capital test.*No credits or damage saved/);
 assert.equal(q.graphs.length,0);
 const cap=q.sprites.find(art=>art.src==='./carrier-capital.webp?v=133');assert.ok(cap);
 Object.assign(cap,{complete:true,naturalWidth:512,naturalHeight:768});
 q.step();assert.equal(q.inspect().capitalShip.phase,'docked');
 q.click('capital-dock-action');awaitPhase(q,'flight');const s=q.inspect();
 assert.equal(s.arena.bottom-s.arena.top,2376);assert.equal(s.camera.w,480);assert.equal(s.camera.h,720);
 assert.deepEqual([s.cones.length,s.asteroids.length,s.sceneryDebris.length,s.vanduls.length,s.duelCountdown],[0,0,0,0,0]);
 assert.ok(q.spriteFrames.some(f=>f.asset===cap&&f.bounds[2]===s.capitalCourse.width));
 q.key('keydown','ArrowUp');q.step();q.key('keyup','ArrowUp');
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
 assert.equal(q.el['arena-screen'].hidden,true);assert.equal(q.el['vandul-duel-readout'].parentElement,q.el['arena-toolbar']);
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
 q.step();q.click('capital-dock-action');awaitPhase(q,'flight');
 const {capitalShip:c,p,arena}=q.inspect(),stern=c.hull.at(-1);
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
test('the old Launch bookmark opens Capital with the same crew and deliberate launch controls',()=>{
 const {q,returned}=load('?launch=carrier-launch');
 const a=q.inspect(),c=a.capitalShip,{p,capitalBerth:b,berthLocal,berthVelocity}=a;
 const action=q.el['capital-dock-action'],status=q.el['capital-dock-status'],deck=q.el['flight-deck'];
 const primary=load().q.inspect().capitalShip;
 assert.deepEqual(JSON.parse(JSON.stringify(c)),JSON.parse(JSON.stringify(primary)),'same starting Capital state, including both wingmen and reserved pads');
 assert.equal(action.textContent,'Launch');assert.equal(action.disabled,false);
 assert.equal(q.focused,action);assert.equal(deck.inert,true);assert.equal(q.graphs.length,0);
 assert.equal(c.phase,'docked');near(berthLocal(c,p.x,p.y).y,c.pads[c.pad][1]);
 q.click('capital-dock-action',{isTrusted:false});assert.equal(c.phase,'docked');
 q.key('keydown','KeyE');q.key('keydown','Space');q.click('fire-button');q.step(35);
 near(berthLocal(c,p.x,p.y).y,c.pads[c.pad][1]);assert.ok(c.distance>17);assert.equal(q.inspect().shots.length,0);
 assert.match(status.textContent,/Aboard/);
 q.click('capital-dock-action');assert.equal(c.phase,'launching');assert.equal(action.disabled,true);
 const start=c.distance;q.step(70);
 assert.ok(c.distance>start&&berthLocal(c,p.x,p.y).y>c.pads[c.pad][1]+25);
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

test('Capital and its legacy URL require the aft zone and relative speed, then capture and relaunch',()=>{
 for(const route of ['?launch=capital-test','?launch=carrier-launch']){
  const {q}=load(route),a=q.inspect(),c=a.capitalShip,{p,capitalBerth:b,berthLocal,capitalDockCheck}=a;
  q.step();
  if(c.phase==='docked'){q.click('capital-dock-action');awaitPhase(q,'flight');}
  assert.equal(capitalDockCheck(),null);
  q.click('capital-dock-action');assert.ok(capitalDockCheck());
  for(const miss of [{side:b.maxGap+5},{extraVelocity:b.maxSpeed+4}]){
   lineUp(q,miss);const before=capitalDockCheck();assert.equal(before.ready,false);
   q.click('capital-dock-action');assert.equal(c.phase,'flight');
   if(before.inRange){assert.equal(actionLabel(q),'Cancel Dock');q.click('capital-dock-action');}
   else assert.equal(q.el['capital-dock-action'].disabled,true);
  }
  lineUp(q);assert.equal(capitalDockCheck().ready,true);
  q.click('capital-dock-action');assert.equal(c.phase,'docking');assert.equal(q.el['flight-deck'].inert,true);
  q.step(36);assert.ok(berthLocal(c,p.x,p.y).y<b.approach-12&&c.phase==='docking');
  const hold=c.distance;q.hide(true);q.step(90);near(c.distance,hold);
  q.hide(false);q.choose('resume');awaitPhase(q,'docked');
  near(berthLocal(c,p.x,p.y).y,c.pads[c.pad][1]);near(delta(p.aim,c.aim),0);
  assert.equal(q.el['capital-dock-action'].textContent,'Launch');
  q.click('capital-dock-action');awaitPhase(q,'flight');
  assert.equal(q.inspect().capitalShip,c,'one continuous carrier and patrol, not a page reload');
  assert.equal(capitalDockCheck(),null,'launch never preserves prior clearance');
  q.click('capital-dock-action');assert.ok(capitalDockCheck());
  q.reset();assert.equal(capitalDockCheck(),null,'reset clears pending clearance');
  assert.equal(q.inspect().capitalShip.phase,'docked','Reset restores each parked entry');
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
 assert.equal(c.phase,'docked');near(berthLocal(c,p.x,p.y).y,c.pads[c.pad][1]);
 assert.equal(q.el['flight-deck'].inert,true);
 for(const art of q.sprites){
  const cap=art.src.includes('carrier-capital');
  Object.assign(art,{complete:true,naturalWidth:cap?512:480,naturalHeight:cap?768:320});
 }
 q.step();
 assert.ok(q.spriteFrames.some(f=>f.asset.src.includes('carrier-capital')));
 assert.ok(q.spriteFrames.some(f=>f.asset.src.includes('fighter-winged')&&Math.hypot(f.translation[0]-p.x,f.translation[1]-p.y)<12));
 Object.assign(box,{width:635,height:307});q.outside('resize',{});q.step();
 assert.equal(c.phase,'docked');near(berthLocal(c,p.x,p.y).y,c.pads[c.pad][1]);
 assert.ok(q.inspect().camera.w>q.inspect().camera.h);
 assert.equal(q.el['flight-deck'].inert,true);assert.equal(q.inspect().practiceShots,0);
});
test('the carrier underglow renders on both Capital URLs, not in Practice',()=>{
 for(const route of ['?launch=capital-test','?launch=carrier-launch','?launch=practice']){
  const q=load(route,{traceClashPaint:true}).q;q.step(3);
  const wash=q.radialPaint.find(p=>p.args.length===6&&p.args[5]===213&&p.stops.includes('#4488aa00'));
  assert.equal(Boolean(wash),!route.endsWith('practice'));
 }
});

test('Capital and its legacy URL require a clearance request before showing an approach guide, with two deliberate actions even when lined up',()=>{
 const html=read('index.html');
 assert.match(html,/<div class="flight-action-strip">\s*<div id="capital-dock-hud"[^>]*>[\s\S]*?<\/div>\s*<div class="weapon-rack"/);
 for(const route of ['?launch=capital-test','?launch=carrier-launch']){
  const {q}=load(route,{traceClashPaint:true}),{capitalShip:c,capitalDockCheck,p,capitalBerth}=q.inspect();
  const action=q.el['capital-dock-action'],status=q.el['capital-dock-status'];
  const drawn=()=>q.radialPaint.filter(x=>x.args[5]===capitalBerth.maxGap&&x.stops.includes('#31cdd300')).length;
  if(c.phase==='docked'){assert.equal(q.rack.inert,true);q.click('capital-dock-action');awaitPhase(q,'flight');}
  lineUp(q);q.step();
  assert.equal(action.textContent,'Request Docking');assert.equal(action.disabled,false);
  assert.equal(drawn(),0,'no ring before clearance even when perfectly aligned');
  q.click('capital-dock-action',{isTrusted:false});assert.equal(capitalDockCheck(),null);
  const prior=[p.x,p.y,p.vx,p.vy,p.aim];
  q.click('capital-dock-action');
  assert.equal(c.phase,'flight');assert.deepEqual([p.x,p.y,p.vx,p.vy,p.aim],prior);
  assert.equal(action.textContent,'Dock');assert.match(status.textContent,/In range/);
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
 assert.match(css,/\.flight-action-strip\s*\{[^}]*rift4-flight-cockpit\.webp\?v=138/,'shared cockpit art is also visible in carrier flight');
 const art=fs.readFileSync(path.resolve(__dirname,'../dist/rift4-flight-cockpit.webp'));
 assert.equal(art.toString('ascii',8,12),'WEBP');assert.ok(art.length<16000);
});

test('four deck marks fit the painted carrier, with a fixed relative parked fighter through turns',()=>{
 const {q}=load('?launch=carrier-launch',{sprite:true}),a=q.inspect(),c=a.capitalShip,{p,berthLocal,capitalPads:pads,capitalBerth:b}=a;
 const art=q.sprites.find(art=>art.src.includes('fighter-winged'));Object.assign(art,{complete:true,naturalWidth:480,naturalHeight:320});
 const frame=()=>q.spriteFrames.filter(f=>f.asset===art).at(-1);
 // Pixel-measured playable portion of the gold deck, in model coordinates.
 // Source alpha >5 measured x=[43,437), y=[24,292) at 480×320.
 const left=(43/480*87.36-43.68)*b.parkScale,right=(437/480*87.36-43.68)*b.parkScale;
 const top=(24/320*58.24-28.22)*b.parkScale,bottom=(292/320*58.24-28.22)*b.parkScale;
 assert.equal(pads.length,4);assert.ok(b.parkScale>=.33&&b.innerScale>=.31&&b.innerScale<b.parkScale);
 for(const [i,[x,y]] of pads.entries()){
  assert.ok(x+left>=-24&&x+right<=24&&y+top>=74&&y+bottom<=141);
  for(const [u,v] of pads.slice(i+1))assert.ok(Math.abs(u-x)>right-left||Math.abs(v-y)>bottom-top);
 }
 const start=c.aim;
 for(let i=0;i<1300;i+=10){
  q.step(10);const f=frame(),local=berthLocal(c,...f.translation);
  near(local.x,pads[c.pad][0]);near(local.y,pads[c.pad][1]);
  near(f.bounds[2],87.36*b.parkScale);near(delta(f.rotation,c.aim+Math.PI/2),0);
 }
 assert.notEqual(c.aim,start,'sample a real bank of the moving carrier');
 assert.equal(q.shadows.length,0,'parked fighter has no detached hover shadow');
});

test('Launch lifts before departure; cleared docking lines up full size before fixed-local shrinking/landing',()=>{
 const {q}=load('?launch=carrier-launch',{sprite:true}),a=q.inspect(),c=a.capitalShip,{p,berthLocal,capitalPads:pads,capitalBerth:b}=a;
 const art=q.sprites.find(art=>art.src.includes('fighter-winged'));Object.assign(art,{complete:true,naturalWidth:480,naturalHeight:320});
 const drawnSize=()=>q.spriteFrames.filter(f=>f.asset===art).at(-1).bounds[2]/87.36;
 const atPad=()=>{const local=berthLocal(c,p.x,p.y);near(local.x,pads[c.pad][0]);near(local.y,pads[c.pad][1]);};
 q.step();near(drawnSize(),b.parkScale);atPad();
 q.click('capital-dock-action');q.step(15);
 assert.ok(drawnSize()>b.parkScale&&drawnSize()<.89);atPad();
 q.step(43);near(drawnSize(),1);assert.ok(berthLocal(c,p.x,p.y).y>pads[c.pad][1]+5);
 awaitPhase(q,'flight');near(drawnSize(),1);
 lineUp(q);q.click('capital-dock-action');q.click('capital-dock-action');
 for(let i=0;c.berthMove.time<b.approachSeconds&&i<200;i++){
  q.step();near(drawnSize(),1);
 }
 atPad();near(drawnSize(),1);
 for(let i=0;c.berthMove.time<b.dockSeconds-.34&&i<100;i++)q.step();
 assert.ok(drawnSize()<1&&drawnSize()>b.parkScale);atPad();
 assert.match(q.el['capital-dock-status'].textContent,/Lowering/);
 awaitPhase(q,'docked');atPad();near(drawnSize(),b.parkScale);
});

test('the shared lift stores the actual fighter out of sight, and Launch retrieves it before departure',()=>{
 for(const route of ['?launch=carrier-launch','?launch=capital-test']){
  const {q}=load(route,{sprite:true}),a=q.inspect(),{capitalShip:c,p,capitalBerth:b,capitalLift:lift,berthLocal}=a;
  const art=q.sprites.find(art=>art.src.includes('fighter-winged'));Object.assign(art,{complete:true,naturalWidth:480,naturalHeight:320});
  const playerFrame=()=>{
   q.spriteFrames.length=0;q.step();
   return q.spriteFrames.find(f=>f.asset===art&&Math.hypot(f.translation[0]-p.x,f.translation[1]-p.y)<.1&&f.alpha>0);
  };
  const store=q.el['capital-store-action'],action=q.el['capital-dock-action'];
  if(c.phase==='flight'){
   assert.equal(store.hidden,true);q.click('capital-store-action');assert.equal(c.phase,'flight');
   lineUp(q);q.click('capital-dock-action');q.click('capital-dock-action');awaitPhase(q,'docked');
  }
  assert.equal(store.hidden,false);assert.equal(action.disabled,false);
  q.click('capital-store-action',{isTrusted:false});assert.equal(c.phase,'docked');
  const fitted=p.speed;q.click('capital-store-action');assert.equal(c.phase,'storing');assert.equal(action.disabled,true);
  assert.match(q.el['capital-dock-status'].textContent,/Shared lift in use/);
  q.click('capital-dock-action');assert.equal(c.phase,'storing','no action can take the shared lift twice');
  q.step(c.deckCrew.length?26:45);
  const frame=playerFrame();assert.ok(frame);
  assert.ok(frame.bounds[2]<87.36*b.parkScale&&frame.bounds[2]>=87.36*b.innerScale);
  assert.ok(frame.alpha<1&&frame.alpha>0);
  const clock=c.distance;q.hide(true);q.step(60);near(c.distance,clock);
  q.hide(false);q.choose('resume');awaitPhase(q,'stored');
  q.step(150);assert.equal(playerFrame(),undefined,'no exterior player fighter once inside');
  near(berthLocal(c,p.x,p.y).x,lift.x);near(berthLocal(c,p.x,p.y).y,lift.y);
  assert.ok(c.distance>clock);assert.equal(store.hidden,true);assert.equal(action.textContent,'Launch');
  q.click('capital-dock-action');assert.equal(c.phase,'retrieving');
  q.step(39);assert.ok(playerFrame());assert.equal(c.phase,'retrieving');
  awaitPhase(q,'launching');assert.equal(c.phase,'launching');
  awaitPhase(q,'flight');assert.equal(q.inspect().p,p);assert.equal(p.speed,fitted);
  assert.equal(q.inspect().capitalDockCheck(),null);
 }
});

test('docked mobile camera enlarges the fighter, keeps the carrier bow in view and hands back exact flight aim',()=>{
 const box={width:390,height:532,left:8,top:60};
 const {q}=load('?launch=carrier-launch',{canvasBox:box,dpr:2}),first=q.inspect();
 const {capitalShip:c,p,capitalCourse:course,berthWorld}=first;
 q.step();const dock=q.inspect().camera, spec=q.inspect().layoutStats;
 near(dock.zoom,1.28);
 const bow=berthWorld(c,0,-course.height*.49);
 assert.ok(bow.y>dock.y&&bow.y<dock.y+dock.h,'north heading bow stays visible');
 assert.ok(Math.abs(dock.y+dock.h/2-c.y)<Math.abs(p.y-c.y),'camera biases to carrier midpoint');
 near(q.transforms.at(-1)[0],spec.scale*dock.zoom);near(dock.w*spec.scale*dock.zoom,spec.viewW);
 near(dock.h*spec.scale*dock.zoom,spec.viewH);assert.deepEqual(q.rectangles.at(-1),[0,0,dock.w,dock.h]);
 q.click('capital-dock-action');
 for(let prev=dock.zoom;c.phase!=='flight';){
  q.step();const camera=q.inspect().camera;
  assert.ok(camera.zoom<=prev&&prev-camera.zoom<.013,'no abrupt lift zoom jump');prev=camera.zoom;
 }
 const free=q.inspect().camera;
 near(free.zoom,1);near(free.w*spec.scale,spec.viewW);near(free.h*spec.scale,spec.viewH);
 const point={x:p.x+32,y:p.y-57};
 q.canvasPointer('pointermove',box.left+(point.x-free.x)*box.width/free.w,box.top+(point.y-free.y)*box.height/free.h);
 near(delta(p.aim,Math.atan2(-57,32)),0);
 const port=q.inspect().capitalDockCheck;assert.equal(port(),null);
 lineUp(q);q.click('capital-dock-action');q.click('capital-dock-action');
 for(let prev=free.zoom;c.phase!=='docked';){
  q.step();const next=q.inspect().camera.zoom;
  assert.ok(next>=prev&&next-prev<.012,'no abrupt lowering zoom jump');prev=next;
 }
 near(q.inspect().camera.zoom,1.28);
 Object.assign(box,{width:700,height:220});q.outside('resize',{});q.step();
 const narrow=q.inspect().camera;
 assert.ok(narrow.zoom<1.28&&p.x>narrow.x&&p.x<narrow.x+narrow.w&&p.y>narrow.y&&p.y<narrow.y+narrow.h);
 near(load('?launch=carrier-launch',{canvasBox:box,reducedMotion:true}).q.inspect().camera.zoom,1);
});

test('Bridge comms appear only after clearance and Queue Dock catches a valid window during a turn',()=>{
 const {q}=load(),{capitalShip:c,capitalDockCheck,capitalCourse:course}=q.inspect();
 q.click('capital-dock-action');awaitPhase(q,'flight');
 // Place the moving carrier beyond the straight leg in a genuine bank.
 c.distance=course.halfRun*2+60;q.step(2);
 assert.ok(c.aim< -Math.PI/2-.25);
 const comms=q.el['docking-comms'],copy=q.el['docking-comms-text'];
 assert.equal(comms.hidden,true);
 q.click('capital-dock-action');
 assert.equal(comms.hidden,false);assert.match(copy.textContent,/Clearance granted|Turn assist is available/i);
 lineUp(q,{extraVelocity:165});
 assert.equal(capitalDockCheck().ready,false);
 q.click('capital-dock-action');
 assert.equal(actionLabel(q),'Cancel Dock');assert.equal(c.phase,'flight');
 q.step();assert.equal(c.phase,'flight','no auto capture while misaligned');
 lineUp(q);q.step();
 assert.equal(c.phase,'docking','capture the next physically valid frame, without a second precisely timed tap');
 assert.match(copy.textContent,/berth is ready/i);
 awaitPhase(q,'docked');assert.equal(comms.hidden,false,'the portrait stays through a quick landing until the radio signs off');
 assert.equal(comms.style['--dock-signoff'],'7.53s');
 q.step(550);assert.equal(comms.hidden,true,'the portrait clears after the closing static');
});

test('Dock queue can be cancelled or interrupted and never auto-lands on a clearance request alone',()=>{
 const {q}=load(),{capitalShip:c,capitalDockCheck}=q.inspect();
 q.click('capital-dock-action');awaitPhase(q,'flight');
 q.click('capital-dock-action');lineUp(q);q.step();assert.equal(c.phase,'flight');
 lineUp(q,{extraVelocity:165});q.click('capital-dock-action');q.click('capital-dock-action');lineUp(q);q.step();assert.equal(c.phase,'flight');
 lineUp(q,{extraVelocity:165});q.click('capital-dock-action');
 q.key('keydown','KeyP');q.choose('resume');lineUp(q);q.step();assert.equal(c.phase,'flight');
 assert.ok(capitalDockCheck(),'cancelling the queue keeps clearance');
});

test('Capital draws three distinct settled Rift-4s, reserves wing pads, and cycles only player pads',()=>{
 const {q,returned}=load(undefined,{sprite:true,canvasBox:{width:390,height:520,left:0,top:0}});
 const {capitalShip:c,p,berthLocal,capitalCourse:course,capitalBerth:b}=q.inspect();
 const art=q.sprites.find(img=>img.src.includes('fighter-winged'));Object.assign(art,{complete:true,naturalWidth:480,naturalHeight:320});
 const frames=()=>q.spriteFrames.filter(f=>f.asset===art);
 assert.equal(c.phase,'docked');assert.equal(c.deckCrew.length,2);
 assert.deepEqual(Array.from(c.pilotPads),[2,3]);assert.deepEqual(Array.from(c.deckCrew,m=>m.pad),[0,1]);
 c.distance=course.halfRun*2+64;q.step(2);assert.ok(c.aim < -Math.PI/2-.3);
 for(let i=0;i<20;i++){
  q.spriteFrames.length=0;q.step();
  assert.equal(frames().length,3);
  const local=frames().map(f=>{near(f.bounds[2],87.36*b.parkScale);near(delta(f.rotation,c.aim+Math.PI/2),0);return berthLocal(c,...f.translation);});
  local.forEach(({x,y},j)=>{near(x,c.pads[j][0]);near(y,c.pads[j][1]);});
  // Alpha >5 dimensions of the actual fighter: distinct outlines on both rows.
  const [aa,bb]=local;
  assert.ok(bb.x-aa.x>(437-43)/480*87.36*b.parkScale);
  assert.ok(local[2].y-aa.y>(292-24)/320*58.24*b.parkScale);
  near(berthLocal(c,p.x,p.y).y,c.pads[2][1]);assert.equal(q.shadows.length,0);
 }
 for(const pad of [3,2,3,2]){
  q.click('capital-dock-action');awaitPhase(q,'flight');
  assert.equal(c.pad,pad);
  q.click('capital-dock-action');lineUp(q);
  const reserved=c.pad;c.pad=0;
  assert.equal(q.inspect().capitalDockCheck().ready,false,'an occupied slot cannot capture');
  c.pad=reserved;q.click('capital-dock-action');awaitPhase(q,'docked');
  const local=berthLocal(c,p.x,p.y);near(local.x,c.pads[pad][0]);near(local.y,c.pads[pad][1]);
 }
 assert.equal(load('?launch=carrier-launch').q.inspect().capitalShip.deckCrew.length,2);
 q.reset();assert.equal(q.inspect().capitalShip.phase,'docked');
 assert.equal(q.inspect().capitalShip.pad,2);assert.equal(q.inspect().capitalShip.deckCrew.length,2);
 q.click('return-main-menu');assert.deepEqual(returned,['./carrier.html']);
});

test('Capital wing crews leave independently, stay readable in portrait, return and use only their own pads',()=>{
 const {q}=load(undefined,{sprite:true,canvasBox:{width:390,height:520,left:0,top:0}});
 const {capitalShip:c,berthWorld,arena,capitalBerth:b}=q.inspect();
 const visible=[0,0],patrol=[0,0],events=[[],[]],begun=[null,null];
 const art=q.sprites.find(img=>img.src.includes('fighter-winged'));Object.assign(art,{complete:true,naturalWidth:480,naturalHeight:320});
 q.step();
 for(let i=0;i<3000;i++){
  const phases=c.deckCrew.map(w=>w.phase);q.spriteFrames.length=0;q.step();
  const {camera}=q.inspect();
  for(const [j,w] of c.deckCrew.entries()){
   const point=berthWorld(c,w.lx,w.ly);
   if(w.phase!==phases[j])events[j].push(w.phase);
   if(w.phase==='launching'&&begun[j]===null)begun[j]=c.distance/c.speed;
   assert.equal(w.pad,j);assert.equal(Math.sign(w.lx),w.side);
   assert.ok(point.x>arena.left+17&&point.x<arena.right-17&&point.y>arena.top+17&&point.y<arena.bottom-17);
   if(w.phase==='parked')assert.deepEqual([w.lx,w.ly,w.heading,w.scale],[...c.pads[j],0,b.parkScale]);
   if(w.phase==='patrol'){
    assert.ok(Math.abs(w.lx)>=128&&w.ly>=-220&&w.ly<=220);
    patrol[j]++;
    if(point.x>camera.x&&point.x<camera.x+camera.w&&point.y>camera.y&&point.y<camera.y+camera.h){
     visible[j]++;
     assert.ok(q.spriteFrames.some(f=>f.asset===art&&Math.hypot(f.translation[0]-point.x,f.translation[1]-point.y)<.1));
    }
   }
   if(w.ly>112&&w.ly<151)assert.ok(Math.abs(w.lx)>42,'wing traffic bypasses pilot rear-pad column');
   assert.ok(w.ly<248,'wing traffic never uses the pilot aft gate');
  }
  assert.ok(Math.abs(c.deckCrew[0].lx-c.deckCrew[1].lx)>=24-1e-8,'separate mirrored lanes');
  if(i===400){
   const snapshot=JSON.stringify(c.deckCrew),at=c.distance;q.hide(true);q.step(40);
   assert.equal(JSON.stringify(c.deckCrew),snapshot);near(c.distance,at);
   q.hide(false);q.choose('resume');
  }
 }
 assert.equal(c.phase,'docked');assert.equal(actionLabel(q),'Launch');
 for(const [j,seq] of events.entries()){
  assert.deepEqual(seq.slice(0,4),['launching','patrol','docking','parked']);
  assert.ok(visible[j]/patrol[j]>.70,'patrol is observable from the parked mobile camera');
  assert.ok(c.deckCrew[j].laps>=1);
 }
 assert.ok(begun[1]-begun[0]>3,'crew does not depart together');
});

test('pilot can launch and redock while the two wing ships cycle, without traffic claiming a player pad',()=>{
 for(const seconds of [2.8,5.8,14,21.8,22.8,29.5]){
  const {q}=load(),{capitalShip:c,p,berthLocal,berthLift,capitalBerth:b}=q.inspect();
  q.step(1+Math.round(seconds/.016));
  assert.equal(q.el['capital-dock-action'].disabled,false);
  const sample=()=>{
   const f=berthLocal(c,p.x,p.y),scale=b.parkScale+(1-b.parkScale)*berthLift(c);
   for(const mate of c.deckCrew){
    const gap=Math.hypot(mate.lx-f.x,mate.ly-f.y);
    assert.ok(gap>17*(mate.scale+scale)+3,`controlled paths keep physical ship centers separated ${seconds} phase=${c.phase} mate=${mate.phase} gap=${gap} scaled=${scale}/${mate.scale}`);
    assert.notEqual(mate.pad,c.pad);
   }
  };
  q.click('capital-dock-action');assert.equal(c.phase,'launching');
  for(let i=0;c.phase!=='flight'&&i<180;i++){q.step();sample();}
  assert.equal(c.phase,'flight');assert.equal(c.pad,3);
  lineUp(q);q.click('capital-dock-action');q.click('capital-dock-action');assert.equal(c.phase,'docking');
  for(let i=0;c.phase!=='docked'&&i<180;i++){q.step();sample();}
  assert.equal(c.phase,'docked');assert.equal(c.pad,3);
 }
});

test('the single outer ring catches a slow fighter on either turn and on a straight, with automatic heading alignment',()=>{
 for(const route of ['?launch=capital-test','?launch=carrier-launch']){
  for(const turn of [0,1]){
   const {q}=load(route),{capitalShip:c,p,capitalCourse:course,capitalDockCheck,capitalBerth:b}=q.inspect();
   q.click('capital-dock-action');awaitPhase(q,'flight');
   c.distance=course.halfRun*(turn?4:2)+turn*Math.PI*course.radius+68;q.step(2);
   q.click('capital-dock-action');
   lineUp(q,{side:104,heading:2.30});p.vx=p.vy=0;
   const check=capitalDockCheck();
   assert.ok(check.inRange&&check.ready);
   assert.ok(check.speed>59&&check.gap>b.maxGap-11);
   q.step();assert.equal(c.phase,'flight','clearance alone does not engage assist');
   lineUp(q,{side:104,heading:2.30});p.vx=p.vy=0;
   assert.equal(actionLabel(q),'Dock');
   const prior=[p.x,p.y];q.click('capital-dock-action');
   assert.equal(c.phase,'docking');assert.deepEqual([p.x,p.y],prior,'no instant jump');
   awaitPhase(q,'docked');assert.ok(c.pilotPads.includes(c.pad));
  }
 }
 const {q}=load('?launch=carrier-launch');
 q.click('capital-dock-action');awaitPhase(q,'flight');q.click('capital-dock-action');
 lineUp(q,{side:104,heading:2.30});q.inspect().p.vx=q.inspect().p.vy=0;
 assert.equal(q.inspect().capitalDockCheck().ready,true,'same capture zone on a straight');
});

test('Vale comms show a large avatar without visible text and keep compact HUD numbers',()=>{
 const html=read('index.html'),css=read('style.css');
 const panel=html.match(/<aside class="docking-comms"[\s\S]*?<\/aside>/)[0];
 assert.match(panel,/Dockmaster Elias Vale/);assert.match(panel,/dockmaster-vale\.webp/);
 assert.doesNotMatch(panel,/captain-bridge-front/);
 assert.match(read('carrier-bridge.html'),/captain-bridge-front\.webp/);
 assert.match(panel,/class="sr-only" id="docking-comms-text" role="status"/);
 assert.doesNotMatch(panel,/>Bridge Control</);
 assert.match(css,/dock-signal-lock \.68s/);assert.match(css,/prefers-reduced-motion:reduce/);
 assert.match(css,/width:clamp\(68px,20vw,88px\)/);
 assert.match(css,/\.flight-vitals meter\{width:100%;min-width:0\}/);
});

test('Vale’s clearance plays once from a genuine docking request, respects mute and stops on pause and hide',()=>{
 const {q}=load(),voice=q.el['docking-control-voice'],s=q.inspect();
 assert.equal(voice.getAttribute('src'),'./dock-clearance-radio.mp3?v=154');assert.equal(voice.plays,0);
 assert.equal(q.el['docking-return-voice'].getAttribute('src'),null,'no placeholder audio is loaded');
 q.click('capital-dock-action');awaitPhase(q,'flight');assert.equal(voice.plays,0);
 q.click('capital-dock-action',{isTrusted:false});assert.equal(voice.plays,0);
 q.click('capital-dock-action');assert.equal(voice.plays,1);assert.equal(voice.paused,false);
 q.step(12);assert.equal(voice.plays,1);
 lineUp(q);q.click('capital-dock-action');assert.equal(s.capitalShip.phase,'docking');assert.equal(voice.paused,false,'capture does not cut off the radio line');
 q.hide(true);assert.equal(voice.paused,true);
 q.hide(false);q.choose('resume');assert.equal(voice.plays,1,'a resume does not replay clearance');
 q.reset();q.click('capital-dock-action');awaitPhase(q,'flight');
 q.mute();q.click('capital-dock-action');assert.equal(voice.plays,1);
 assert.equal(load('?launch=practice').q.el['docking-control-voice'].getAttribute('src'),null);
});

test('surprise voice and portrait can vary at random but never on first clearance of a sortie',()=>{
 const {q}=load(undefined,{returnDockAudio:true}),normal=q.el['docking-control-voice'],surprise=q.el['docking-return-voice'];
 const calm=q.el['dockmaster-portrait'],raised=q.el['dockmaster-portrait-surprised'];
 assert.equal(surprise.getAttribute('src'),'./dock-return-radio.mp3?v=154');
 const launch=()=>{q.click('capital-dock-action');awaitPhase(q,'flight');};
 const berth=()=>{lineUp(q);q.click('capital-dock-action');awaitPhase(q,'docked');};
 q.mockRandom(0);launch();q.click('capital-dock-action');
 assert.deepEqual([normal.plays,surprise.plays,calm.hidden,raised.hidden],[1,0,false,true]);
 berth();launch();q.click('capital-dock-action');
 assert.deepEqual([normal.plays,surprise.plays,calm.hidden,raised.hidden],[1,1,true,false]);
 assert.match(q.el['docking-comms-text'].textContent,/Back so soon/);
 assert.equal(q.el['docking-comms'].style['--dock-signoff'],'3.61s');
 berth();launch();q.mockRandom(.99);q.click('capital-dock-action');
 assert.deepEqual([normal.plays,surprise.plays,calm.hidden,raised.hidden],[2,1,false,true]);
 q.reset();launch();q.mockRandom(0);q.click('capital-dock-action');
 assert.deepEqual([normal.plays,surprise.plays],[3,1]);
});

test('Bifrost uses the registered vessel and side deck berths; Capital launches, captures, stores, relaunches and returns without save writes',()=>{
 const {q,returned}=load('?launch=capital-test&vessel=bifrost',{sprite:true,savedEngine:JSON.stringify({version:1,engine:'test-thruster'})});
 const {capitalShip:c,p,capitalCourse:course,berthLocal}=q.inspect();
 assert.equal(c.vessel.id,'bifrost');assert.equal(q.inspect().fighterLoadout.engine,'test-thruster');
 const cap=q.sprites.find(art=>art.src==='./bifrost-carrier.webp');assert.ok(cap);
 assert.ok(!q.sprites.some(art=>art.src.includes('carrier-capital.webp')));
 Object.assign(cap,{complete:true,naturalWidth:480,naturalHeight:480});
 assert.match(q.el['capital-dock-status'].textContent,/Bifrost.*Aboard/);
 assert.match(q.el['vandul-duel-readout'].textContent,/Bifrost.*No credits or damage saved/);
 assert.equal(c.deckCrew.length,2);assert.equal(c.pads.length,4);
 assert.deepEqual(Array.from(c.pads,([x])=>Math.sign(x)),[-1,1,-1,1]);
 assert.ok(c.pads.every(([x,y])=>Math.abs(x)>=80&&y>=70&&y<=130));
 assert.equal(c.hull.length,8);
 q.step();
 assert.ok(q.spriteFrames.some(f=>f.asset===cap&&f.bounds[2]===course.width&&f.bounds[3]===course.height));
 const saved=Array.from(q.storage);
 q.click('capital-dock-action');
 let sampled=0;
 while(c.phase==='launching'&&sampled++<180){
  q.step();
  const {x,y}=berthLocal(c,p.x,p.y);
  if(y>145&&y<246)assert.ok(x< -100,'left deck departs outboard of engine bells');
 }
 assert.equal(c.phase,'flight');assert.equal(c.pad,3);
 c.distance=course.halfRun*2+68;q.step(2);
 q.click('capital-dock-action');lineUp(q);q.click('capital-dock-action');awaitPhase(q,'docked');
 near(berthLocal(c,p.x,p.y).x,c.pads[3][0]);near(berthLocal(c,p.x,p.y).y,c.pads[3][1]);
 q.click('capital-store-action');awaitPhase(q,'stored');
 near(berthLocal(c,p.x,p.y).x,c.lift.x);near(berthLocal(c,p.x,p.y).y,c.lift.y);
 q.click('capital-dock-action');assert.equal(c.phase,'retrieving');awaitPhase(q,'flight');
 assert.deepEqual(Array.from(q.storage),saved);
 q.click('return-main-menu');assert.deepEqual(returned,['./carrier.html?vessel=bifrost']);
 assert.equal(load('?launch=carrier-launch&vessel=bifrost').q.inspect().capitalShip.vessel.id,'bifrost');
 assert.equal(load('?launch=capital-test&vessel=pegasus').q.inspect().capitalShip.vessel.id,'pegasus');
 assert.equal(load('?launch=capital-test&vessel=arbitrary').q.inspect().capitalShip,null);
});

test('the Bifrost personal Hangar link closes back to the same Company Vessel',()=>{
 const {q,returned}=load('?hangar=carrier&vessel=bifrost');
 assert.equal(q.el.hangar.open,true);assert.equal(q.inspect().capitalShip,null);
 q.click('close-hangar');assert.deepEqual(returned,['./carrier.html?vessel=bifrost']);
});
