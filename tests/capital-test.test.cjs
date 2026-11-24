'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {setup}=require('./ballistic.test.cjs');
const load=(search='?launch=capital-test',opts={})=>{
 const returned=[];
 return {q:setup({address:{search,replace:to=>returned.push(to)},flightShell:true,homeVessel:!search.includes('launch=custom')&&search.includes('vessel=bifrost')?'bifrost':undefined,...opts}),returned};
};
const read=file=>fs.readFileSync(path.resolve(__dirname,'../dist',file),'utf8');
const near=(a,b,tol=1e-7)=>assert.ok(Math.abs(a-b)<=tol,`${a} != ${b}`);
const actionLabel=q=>q.el['capital-dock-action'].textContent;
const delta=(a,b)=>Math.atan2(Math.sin(a-b),Math.cos(a-b));
test('Capital is a distinct flight in the Hangar cockpit and uses the real fitted pilot with one lazy overhead texture',()=>{
 assert.doesNotMatch(read('carrier.html'),/Flight Shortcuts|id="carrier-launch-test"/);
 assert.match(read('game.js'),/mode\('capital-test','Capital \(test\)'/);
 const art=fs.readFileSync(path.resolve(__dirname,'../dist/carrier-capital.webp'));
 assert.equal(art.toString('ascii',8,16),'WEBPVP8X');assert.ok(art[20]&0x10);
 assert.deepEqual([art.readUIntLE(24,3)+1,art.readUIntLE(27,3)+1],[512,768]);
 assert.ok(art.length<45000);
 const standard=load('?launch=practice',{sprite:true}).q;
 assert.equal(standard.inspect().capitalShip,null);assert.equal(standard.el['vandul-duel-readout'].parentElement,standard.el['flight-details']);
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
 assert.equal(q.el['arena-screen'].hidden,true);assert.equal(q.el['vandul-duel-readout'].parentElement,q.el['flight-details']);
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
 assert.match(status.textContent,/Landing Page/);
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

test('surprise voice and portrait can vary at random but never before the pilot first contacts Vale',()=>{
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
 assert.deepEqual([normal.plays,surprise.plays],[2,2],'a newly constructed scene remembers prior calls');
});

test('Vale remembers valid calls across re-entry, stays occasional, and keeps a fresh pilot or vessel on the normal line',()=>{
 const sessionData=new Map(),sharedStorage=new Map();
 const get=(vessel='rift-carrier')=>load(vessel==='bifrost'?'?launch=capital-test&vessel=bifrost':undefined,{returnDockAudio:true,sessionData,sharedStorage}).q;
 const call=(q,random=.99)=>{
  q.mockRandom(random);q.click('capital-dock-action');awaitPhase(q,'flight');q.click('capital-dock-action');
  return [q.el['docking-control-voice'].plays,q.el['docking-return-voice'].plays];
 };
 assert.deepEqual(call(get(),0),[1,0],'first contact is never the alternate');
 assert.deepEqual(call(get()),[1,0]);
 assert.deepEqual(call(get()),[1,0]);
 assert.deepEqual(call(get()),[0,1],'four valid requests cannot all miss the alternate');
 assert.deepEqual(call(get(),0),[1,0],'the alternate never repeats immediately');
 assert.deepEqual(call(get(),0),[0,1],'eligible alternate follows the pilot over document navigation');
 assert.deepEqual(call(get('bifrost'),0),[1,0],'first call to the other carrier stays normal');
 sharedStorage.set('rift-runner.character-generation.v1','new-pilot');
 assert.deepEqual(call(get(),0),[1,0],'replacement pilot starts with normal clearance');
});
test('Bifrost uses the registered vessel and side deck berths; Capital launches, captures, stores, relaunches and returns without save writes',()=>{
 const {q,returned}=load('?launch=capital-test&vessel=bifrost',{sprite:true,savedEngine:JSON.stringify({version:1,engine:'test-thruster'})});
 const {capitalShip:c,p,capitalCourse:course,berthLocal}=q.inspect();
 assert.equal(c.vessel.id,'bifrost');assert.equal(q.inspect().fighterLoadout.engine,'test-thruster');
 const cap=q.sprites.find(art=>art.src==='./bifrost-top.webp');assert.ok(cap);
 assert.ok(!q.sprites.some(art=>art.src.includes('carrier-capital.webp')));
 Object.assign(cap,{complete:true,naturalWidth:480,naturalHeight:480});
 assert.match(q.el['capital-dock-status'].textContent,/Bifrost.*Landing Page/);
 assert.match(q.el['vandul-duel-readout'].textContent,/Bifrost.*No credits or damage saved/);
 assert.equal(c.deckCrew.length,2);assert.equal(c.pads.length,4);
 assert.deepEqual(Array.from(c.pads,([x])=>Math.sign(x)),[-1,1,-1,1]);
 assert.deepEqual(Array.from(c.pads,xy=>Array.from(xy)),[[-77,71],[77,71],[-88,112],[88,112]]);
 const deckPixels=c.pads.map(([x,y])=>[(x/course.width+.5)*480,(y/course.height+.5)*480]);
 // Match the center of the painted strips in the 480px overhead sprite.
 assert.ok(deckPixels[2][0]>=92&&deckPixels[2][0]<=100&&deckPixels[2][1]<370);
 assert.ok(deckPixels[3][0]>=380&&deckPixels[3][0]<=388&&deckPixels[3][1]<370);
 assert.ok(c.pads[2][1]-c.pads[0][1]>=36,'front and rear fighter positions remain separated');
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

test('Bifrost exhaust lights all three cowls and leaves its painted runways unobstructed',()=>{
 for(const vessel of ['', '&vessel=bifrost']){
  const {q}=load('?launch=capital-test'+vessel,{traceClashPaint:true});
  q.radialPaint.length=0;q.strokePaint.length=0;q.step();
  const plumes=q.radialPaint.filter(p=>p.stops.includes('#f6bcff5c'));
  const b=Boolean(vessel);
  assert.equal(plumes.length,b?3:0);
  if(b){
   assert.deepEqual(plumes.map(p=>Math.sign(p.args[0])),[-1,0,1]);
   const aft=q.inspect().capitalCourse.height;
   assert.ok(plumes.every(p=>(p.args[1]-9)/aft<.437),'plume root starts behind the cowl, not past it');
   assert.ok(!q.strokePaint.some(p=>['#abf5ddba','#82b4e59e','#d2b87d91','#e2b4ffac'].includes(p.color)));
  }else assert.ok(q.strokePaint.some(p=>p.color==='#abf5ddba'));
 }
});


test('the stored fighter opens the actual Personal Hangar on the same vessel; parked and busy phases never navigate',()=>{
 assert.match(read('index.html'),/<button[^>]*id="capital-hangar"[^>]*hidden[^>]*>Enter Hangar<\/button>/);
 for(const [route,destination] of [['?launch=capital-test','./index.html?hangar=carrier'],
  ['?launch=capital-test&vessel=bifrost','./index.html?hangar=carrier&vessel=bifrost'],
  ['?launch=capital-test&vessel=rift-carrier','./index.html?hangar=carrier&vessel=rift-carrier']]){
  const {q,returned}=load(route);
  const hangar=q.el['capital-hangar'],action=q.el['capital-dock-action'];
  q.step();q.click('capital-dock-action');awaitPhase(q,'flight');
  q.click('capital-dock-action');lineUp(q);q.click('capital-dock-action');
  assert.equal(hangar.hidden,true);q.click('capital-hangar');assert.deepEqual(returned,[]);
  awaitPhase(q,'docked');assert.equal(hangar.hidden,true);
  assert.match(q.el['capital-dock-status'].textContent,/Landing Page · Carrier underway/);
  q.click('capital-store-action');assert.equal(hangar.hidden,true);
  q.click('capital-hangar');assert.deepEqual(returned,[]);
  awaitPhase(q,'stored');
  assert.match(q.el['capital-dock-status'].textContent,/Landing Page · Stored in internal hangar/);
  assert.equal(hangar.hidden,false);assert.equal(hangar.disabled,false);
  assert.equal(action.textContent,'Launch');assert.equal(action.disabled,false);
  const before=Array.from(q.storage);q.key('keydown','KeyP');
  assert.equal(hangar.disabled,true);q.click('capital-hangar');assert.deepEqual(returned,[]);
  q.choose('resume');q.click('capital-hangar',{isTrusted:false});assert.deepEqual(returned,[]);
  const initial=q.inspect().camera;
  q.click('capital-hangar');assert.deepEqual(returned,[]);
  q.click('capital-hangar');q.click('capital-dock-action');
  assert.equal(q.inspect().capitalShip.phase,'stored');
  assert.equal(hangar.disabled,true);assert.equal(action.disabled,true);
  q.step(25);assert.deepEqual(returned,[]);
  assert.ok(q.inspect().camera.zoom>initial.zoom+.3,'eases inward as flight continues');
  const during=q.inspect();assert.ok(during.capitalShip.distance>0);
  q.step(35);assert.deepEqual(returned,[destination]);
  const end=q.inspect(),target=end.berthWorld(end.capitalShip,end.capitalShip.lift.x,end.capitalShip.lift.y);
  near(end.camera.x+end.camera.w/2,target.x,.01);
  near(end.camera.y+end.camera.h/2,target.y,.01);
  assert.ok(end.camera.zoom>during.camera.zoom);
  q.step(100);assert.deepEqual(returned,[destination],'navigation commits only once');
  assert.deepEqual(Array.from(q.storage),before);
  const {q:opened,returned:closed}=load(destination.split('index.html')[1]);
  assert.equal(opened.inspect().state,'menu');assert.equal(opened.inspect().capitalShip,null);
  assert.equal(opened.el.hangar.open,true);opened.click('close-hangar');
  assert.deepEqual(closed,['./carrier.html'+(route.includes('&vessel=')?'?vessel='+route.split('&vessel=')[1]:'')]);
 }
});


test('stored Hangar camera is canceled by pause, hide, or parking the page; reduced motion navigates immediately',()=>{
 for(const cancel of [q=>{q.key('keydown','KeyP');q.choose('resume');},q=>{q.hide(true);q.hide(false);},q=>{q.pageHide();q.pageShow();}]){
  const {q,returned}=load();q.click('capital-store-action');awaitPhase(q,'stored');
  const start=q.inspect().camera.zoom;
  q.click('capital-hangar');q.step(20);assert.ok(q.inspect().camera.zoom>start);
  cancel(q);if(q.inspect().state==='pause')q.choose('resume');q.step(90);
  assert.deepEqual(returned,[]);assert.equal(q.inspect().camera.zoom,start);
  assert.equal(q.el['capital-dock-action'].disabled,false);
  q.click('capital-dock-action');assert.equal(q.inspect().capitalShip.phase,'retrieving');awaitPhase(q,'flight');
 }
 const {q,returned}=load(undefined,{reducedMotion:true});
 q.click('capital-store-action');awaitPhase(q,'stored');
 q.click('capital-hangar');assert.deepEqual(returned,['./index.html?hangar=carrier']);
});

test('current Capital Test links stage on the cruising carrier and stay there after explicit takeoff',()=>{
 for(const [route,id] of [['?launch=capital-test&departure=carrier','pegasus'],
  ['?launch=capital-test&vessel=bifrost&departure=carrier','bifrost']]){
  const {q}=load(route,{reducedMotion:true});
  assert.equal(q.inspect().capitalShip.vessel.id,id);
  assert.ok(q.inspect().capitalShip.stream);
  assert.equal(q.inspect().capitalShip.phase,'docked');
  const old=q.inspect().capitalShip.y;
  q.click('capital-dock-action');q.step(180);
  assert.equal(q.inspect().capitalShip.phase,'flight');
  assert.ok(q.inspect().capitalShip.y<old);
  assert.equal(q.inspect().flightMode.id,'capital-test');
 }
 assert.equal(load('?launch=capital-test').q.inspect().capitalShip.stream,undefined,'legacy bookmarks remain compatible');
});

test('carrier berth and storage keep passive reactor charge and cooling alive without thrust or offline catch-up',()=>{
 for(const search of ['?launch=capital-test','?launch=capital-test&vessel=bifrost']){
  const {q}=load(search,{initialHe3:0,reducedMotion:true});
  const {capitalShip,p}=q.inspect();
  q.step();Object.assign(p,{he3:0,heat:90,coolAt:0});
  q.key('keydown','KeyE');q.step(125);q.key('keyup','KeyE');
  near(p.he3,4);assert.ok(p.heat<90);assert.equal(capitalShip.phase,'docked');
  assert.equal(q.el['flight-he3-meter'].value,4);
  q.click('capital-store-action');q.step(3);
  assert.equal(capitalShip.phase,'stored');
  const before=[p.he3,p.heat];
  q.hide(true);q.step(250);
  assert.deepEqual([p.he3,p.heat],before);
  q.hide(false);q.choose('resume');q.step(650);
  near(p.he3,20);assert.ok(p.heat<before[1]);
  assert.equal(capitalShip.phase,'stored','charging and cooling do not auto-launch the fighter');
 }
});

test('capturing the berth cancels a volley but lets the weapon recover without firing while latched',()=>{
 const {q}=load();
 q.click('capital-dock-action');awaitPhase(q,'flight');
 q.click('capital-dock-action');lineUp(q);
 const enable=()=>q.click('gun-blaster',{detail:1,pointerType:'touch',pointerId:20});
 enable();q.step(3);enable();
 q.click('fire-button');assert.ok(q.inspect().fireBurst);
 lineUp(q);q.click('capital-dock-action');
 assert.equal(q.inspect().capitalShip.phase,'docking');
 assert.equal(q.inspect().fireBurst,null);assert.ok(q.inspect().burstCooldown>0);
 const fired=q.inspect().practiceShots;
 awaitPhase(q,'docked');
 assert.equal(q.inspect().burstCooldown,0);
 assert.equal(q.inspect().practiceShots,fired);
});

test('only the active cruising carrier uses the Galaxy Map position to paint a nearby planet underneath the hull',()=>{
 for(const [query,id] of [['','rift-carrier'],['&vessel=bifrost','bifrost']]){
  const watched=[],closed=[],orbitMasks=[];
  let sample={sector:'reach',x:545,y:500,phase:'cruising'};
  const opt={sprite:true,orbitMasks,galaxyWatch(key){watched.push(key);return {sample:()=>sample,close:()=>closed.push(key)};}};
  const {q}=load('?launch=capital-test'+query+'&departure=carrier',opt);
  const {capitalShip:ship}=q.inspect(),original=Array.from(q.storage);
  assert.deepEqual(watched,[id]);q.step(42);
  const art=q.sprites.find(x=>x.src==='./galaxy-planets.webp'),hull=q.sprites.find(x=>x.src===ship.vessel.art);
  for(const [img,w,h] of [[art,900,600],[hull,480,480]])Object.assign(img,{complete:true,naturalWidth:w,naturalHeight:h});
  q.spriteFrames.length=0;q.step(2);
  const [tile]=orbitMasks;
  const i=q.spriteFrames.findIndex(x=>x.asset===tile);
  assert.ok(i>=0&&i<q.spriteFrames.findIndex(x=>x.asset===hull),'world paints behind the hull');
  assert.deepEqual(tile.source.slice(1,5),[600,300,300,300],'Talven uses the rocky atlas cell');
  assert.match(q.el['capital-orbital-view'].textContent,/Talven/);
  sample={sector:'frontier',x:545,y:500,phase:'cruising'};
  q.spriteFrames.length=0;q.step(5);
  assert.ok(q.spriteFrames.some(x=>x.asset===tile&&x.alpha>0),'no instant cut at a map transition');
  q.step(70);q.spriteFrames.length=0;q.step();
  assert.equal(q.spriteFrames.some(x=>x.asset===tile),false,'blank sector has no planet');
  assert.equal(q.el['capital-orbital-view'].textContent,'');
  assert.equal(ship.phase,'docked');assert.deepEqual(Array.from(q.storage),original);
  q.click('return-main-menu');assert.deepEqual(closed,[id]);
 }
 const watching=[];
 load('?launch=practice',{galaxyWatch:id=>watching.push(id)});
 load('?launch=capital-test',{galaxyWatch:id=>watching.push(id)});
 assert.deepEqual(watching,[],'normal arenas and the parked legacy test do not retrieve map scenery');
});

test('the atlas caches a feathered spherical limb, and unique ring art fits without trimming its width',()=>{
 const orbitMasks=[],galaxyWatch=()=>({sample:()=>({sector:'reach',x:595,y:-623,phase:'holding'})});
 const {q}=load('?launch=capital-test&departure=carrier',{sprite:true,orbitMasks,galaxyWatch});
 q.step(35);
 const atlas=q.sprites.find(x=>x.src==='./galaxy-planets.webp'),unique=q.sprites.find(x=>x.src==='./galaxy-planet-lyren.webp');
 Object.assign(atlas,{complete:true,naturalWidth:900,naturalHeight:600});
 Object.assign(unique,{complete:true,naturalWidth:0,naturalHeight:0});
 q.spriteFrames.length=0;q.step(31);
 assert.equal(orbitMasks.length,1,'failed unique art falls back to one cached atlas cell');
 const [tile]=orbitMasks;
 assert.deepEqual(tile.source.slice(1,5),[0,300,300,300]);
 assert.equal(tile.composite,'source-in');
 assert.deepEqual(tile.masks,[{axis:[151,146,110,151,146,117],stops:[[0,'#000'],[1,'#0000']],box:[0,0,300,300]}]);
 const fallback=q.spriteFrames.find(x=>x.asset===tile);assert.ok(fallback?.alpha>0);
 Object.assign(unique,{complete:true,naturalWidth:760,naturalHeight:420});
 q.spriteFrames.length=0;q.step();
 const mixed=q.spriteFrames.find(x=>x.asset===unique&&x.alpha>0),old=q.spriteFrames.find(x=>x.asset===tile&&x.alpha>0);
 assert.ok(mixed&&old,'arrived unique art crossfades over the intact fallback');
 const [x,y,w,h]=mixed.bounds,[fx,fy,fw,fh]=old.bounds;
 near(w/h,760/420);near(w,fw);near(x+w/2,fx+fw/2);near(y+h/2,fy+fh/2);
 q.step(40);q.spriteFrames.length=0;q.step();
 assert.ok(q.spriteFrames.some(x=>x.asset===unique));
 assert.ok(!q.spriteFrames.some(x=>x.asset===tile));
 assert.equal(orbitMasks.length,1);
});

test('docking offers clear milestones without reading constantly changing range: clearance remains deliberate',()=>{
 const {q}=load();const {capitalShip:c,p}=q.inspect();
 const hud=q.el['capital-dock-hud'],ann=q.el['capital-docking-announcement'],out=q.el['capital-dock-status'];
 assert.equal(hud.dataset.stage,'docked');assert.match(ann.textContent,/Launch or store/);
 q.click('capital-dock-action');awaitPhase(q,'flight');
 assert.equal(hud.dataset.stage,'request');assert.match(out.textContent,/Request clearance/);
 assert.equal(q.inspect().capitalDockCheck(),null);
 q.click('capital-dock-action');
 Object.assign(p,{x:c.x+228,y:c.y+4});q.step();
 assert.equal(hud.dataset.stage,'approach');
 const message=ann.textContent;assert.match(message,/Enter the marked approach ring/);
 p.x+=25;q.step();assert.equal(ann.textContent,message);
 lineUp(q,{extraVelocity:165});q.step();
 assert.equal(hud.dataset.stage,'slow');assert.match(out.textContent,/Match carrier speed/);
 q.click('capital-dock-action');
 assert.equal(hud.dataset.stage,'queued');assert.match(ann.textContent,/Docking queued/);
 q.click('capital-dock-action');lineUp(q);q.step();
 assert.equal(hud.dataset.stage,'ready');assert.match(ann.textContent,/Activate Dock/);
 assert.equal(c.phase,'flight','a prompt or color change cannot initiate docking');
 q.click('capital-dock-action');assert.equal(c.phase,'docking');assert.match(ann.textContent,/Docking in progress/);
});

const alternateFits=['stocky-light-fighter','bastion-9'];
function alternateFlight(id,search='?launch=capital-test&vessel=bifrost&departure=carrier',opts={}){
 const {fitOverrides,paid=0,noAlternateFit=false,...setupOpts}=opts;
 const fit={engine:'stock-thruster',core:'weifer-he3-core',battery:'kestrel-h20-reserve-cell',primary:'blaster',secondary:'nose-cannon',shield:null,...fitOverrides};
 const owned=Object.values(fit).filter(Boolean);
 const storage=new Map([['rift-runner.character-generation.v1','alternate-flight-pilot'],
  ['rift-runner.selected-fighter.v1',id],
  ['rift-runner.ship-build.v1.'+id,JSON.stringify({version:1,hull:id,...fit})],
  ['rift-runner.ship-build.v1',JSON.stringify({version:1,hull:'rift-fighter',...fit})],
  ['rift-runner.hull-owned.v1',JSON.stringify({version:1,hull:'rift-fighter',condition:'repaired'})]]);
 if(noAlternateFit)storage.delete('rift-runner.ship-build.v1.'+id);
 return load(search,{sprite:true,reducedMotion:!search.includes('capital-test'),loadFighters:true,buildUI:true,...setupOpts,sharedStorage:storage,pilotCredits:{
  getBuildState:()=>({origin:'new',owned}),owns:name=>owned.includes(name),ownsHull:name=>alternateFits.includes(name),weaponQuantity:id=>id==='sparrow-s2'?paid:0
 }});
}
test('both alternate fighters launch with their own stats and art, and berth on a turning carrier',()=>{
 const weights=[];
 for(const [id,art,hp] of [['bastion-9','./bastion-9-fighter.webp',16],['stocky-light-fighter','./stocky-light-fighter.webp',26]]){
  const {q,returned}=alternateFlight(id),{capitalShip:c,p,fighterLoadout,capitalCourse:course}=q.inspect();
  assert.equal(fighterLoadout.fighter,id);assert.equal(fighterLoadout.weapon,'sparrow-s2');
  assert.equal(p.fighter,id);assert.equal(p.maxHp,hp);weights.push([p.weight,p.speed]);
  assert.equal(c.phase,'docked');assert.equal(c.vessel.id,'bifrost');
  q.step(9);assert.equal(c.phase,'docked','must still explicitly launch');
  const image=q.sprites.find(x=>x.src===art);assert.ok(image);
  Object.assign(image,{complete:true,naturalWidth:480,naturalHeight:320});
  q.spriteFrames.length=0;q.step();assert.ok(q.spriteFrames.some(x=>x.asset===image));
  q.click('capital-dock-action');awaitPhase(q,'flight');
  q.key('keydown','Digit2');assert.equal(q.inspect().fighterLoadout.weapon,'sparrow-s2','incompatible nose gun is not a flight slot');
  p.he3=20;q.click('fire-button');assert.equal(q.inspect().shots.at(-1)?.weapon,'sparrow-s2');
  c.distance=course.halfRun*2+68;q.step(2);
  q.click('capital-dock-action');lineUp(q);q.click('capital-dock-action');awaitPhase(q,'docked');
  assert.equal(p.fighter,id);
  q.click('capital-store-action');awaitPhase(q,'stored');
  q.click('return-main-menu');assert.deepEqual(returned,['./carrier.html?vessel=bifrost']);
 }
 assert.ok(weights[0][0]<weights[1][0]&&weights[0][1]>weights[1][1],'lighter hull moves faster with equivalent fit');
});

test('changing the selected fighter in another tab cannot redirect battle damage to the wrong ship',()=>{
 const id='stocky-light-fighter',{q}=alternateFlight(id,'?launch=vandul');
 q.step();q.cover(false);q.target(true);
 const {p,vandul,vandulLasers,cones,asteroids,sceneryDebris}=q.inspect();
 for(const field of [cones,asteroids,sceneryDebris])field.splice(0);
 Object.assign(p,{x:430,y:900,vx:0,vy:0});
 Object.assign(vandul,{x:430,y:750,vx:0,vy:0,nextDriveBy:999,nextLaser:999});
 const starter=q.storage.get('rift-runner.hull-owned.v1');
 q.storage.set('rift-runner.selected-fighter.v1','bastion-9');
 vandulLasers.push({x:p.x-32,y:p.y,vx:6400,vy:0,a:0,kind:'energy',life:1,damage:4,owner:vandul});
 q.step();assert.equal(p.hp,22);
 assert.equal(q.storage.get('rift-runner.hull-owned.v1'),starter);
 assert.equal(q.storage.has('rift-runner.hull-owned.v1.bastion-9'),false);
 assert.equal(JSON.parse(q.storage.get('rift-runner.hull-owned.v1.stocky-light-fighter')).hullHp,22);
});

test('training wingmen keep the selected alternate hull and fit, not Rift-4 art',()=>{
 const {q}=alternateFlight('bastion-9','?launch=wingman-test');
 const {p,testLead,wingman}=q.inspect();
 assert.equal(p.fighter,'bastion-9');
 assert.ok(testLead&&wingman);
 for(const ally of [testLead,wingman]){
  assert.equal(ally.fit.hull,p.fighter);
  assert.equal(ally.r,p.r);assert.equal(ally.maxHp,p.maxHp);
  assert.equal(ally.turnMultiplier,p.turnMultiplier);
  assert.deepEqual(Array.from(ally.fit.weapons),['sparrow-s2']);
 }
 q.step();const sprite=q.sprites.find(x=>x.src==='./bastion-9-fighter.webp');
 assert.ok(sprite);Object.assign(sprite,{complete:true,naturalWidth:480,naturalHeight:320});
 q.spriteFrames.length=0;q.step();
 assert.equal(q.spriteFrames.filter(frame=>frame.asset===sprite).length,3);
});

test('alternate gimbals fire inside a 28-degree wedge without turning and turn only as much as needed outside it',()=>{
 for(const id of alternateFits){
  const {q}=alternateFlight(id,'?launch=practice'),{p}=q.inspect();
  const rad=Math.PI/180,forward=p.aim,small=forward+20*rad;
  const touchAt=(type,angle)=>q.pointer(type,16,'aim-pad',240+120*Math.cos(angle),360+120*Math.sin(angle));
  touchAt('pointerdown',small);q.step(8);
  near(delta(p.aim,forward),0);
  q.click('fire-button');near(delta(q.inspect().shots.at(-1).a,small),0);
  q.step(18);
  touchAt('pointermove',0);
  q.click('fire-button');
  near(delta(p.aim,forward),0);
  near(delta(q.inspect().shots.at(-1).a,forward+28*rad),0);
  q.step(30);
  near(delta(p.aim,-28*rad),0);
  q.click('fire-button');near(delta(q.inspect().shots.at(-1).a,0),0);
  touchAt('pointerup',0);
 }
 const base=load('?launch=practice').q,{p}=base.inspect(),before=p.aim;
 base.pointer('pointerdown',16,'aim-pad',280,245);base.step(8);
 assert.notEqual(p.aim,before,'Rift-4 aiming still turns the hull');
 base.click('fire-button');near(delta(base.inspect().shots.at(-1).a,p.aim),0);
});

test('stock alternate projectiles and flashes share the fitted wing pod; the Rift-4 nose is unchanged',()=>{
 for(const [id,outer,forward] of [['bastion-9',21.3,2.2],['stocky-light-fighter',15.2,7.4]]){
  const muzzlePaint=[],{q}=alternateFlight(id,'?launch=practice',{muzzlePaint,fitOverrides:{primary:'sparrow-s2',secondary:null}});
  q.step();const {p}=q.inspect(),a=p.aim+20*Math.PI/180;
  q.pointer('pointerdown',16,'aim-pad',240+120*Math.cos(a),360+120*Math.sin(a));
  const {x,y,he3}=p;
  q.click('fire-button');
  const first=q.inspect().shots.at(-1);
  near(first.x,x-outer);near(first.y,y-forward);near(delta(first.a,a),0);
  near(first.visual.y,-8);
  const ring=q.inspect().rings.at(-1);near(ring.x,first.x);near(ring.y,first.y-8);
  near(p.he3,he3-.5);assert.equal(q.inspect().practiceShots,1);
  q.step();assert.ok(muzzlePaint.some(({translation:[mx,my]})=>Math.abs(mx+outer)<1e-9&&Math.abs(my+forward)<1e-9));
  q.step(16);muzzlePaint.length=0;
  const next={x:p.x,y:p.y};
  q.click('fire-button');
  const second=q.inspect().shots.at(-1);
  near(second.x,next.x-outer);near(second.y,next.y-forward);
  q.step();assert.ok(muzzlePaint.some(({translation:[mx,my]})=>Math.abs(mx+outer)<1e-9&&Math.abs(my+forward)<1e-9));
  assert.equal(q.inspect().practiceShots,2);
 }
 const muzzlePaint=[],{q}=load('?launch=practice',{muzzlePaint}),{p}=q.inspect();
 q.step();const {x,y,r}=p;
 q.click('fire-button');const shot=q.inspect().shots.at(-1);
 near(shot.x,x);near(shot.y,y-r-4);assert.equal(shot.visual,undefined);q.step();assert.deepEqual(muzzlePaint,[]);
});

test('a wingman using a rotated alternate hull emits and renders from the same pod',()=>{
 const muzzlePaint=[],{q}=alternateFlight('bastion-9','?launch=wingman-test',{muzzlePaint,fitOverrides:{primary:'sparrow-s2',secondary:null}});
 q.step();const {wingman:a}=q.inspect();Object.assign(a,{aim:0,he3:20});
 const {x,y}=a;
 assert.equal(q.emitAllyShotForTest(a,'sparrow-s2',0,0,'normal'),true);
 const shot=q.inspect().shots.at(-1);
 near(shot.x,x+2.2);near(shot.y,y-21.3);near(shot.visual.y,-8);assert.equal(shot.ally,true);
 q.step();assert.ok(muzzlePaint.some(({translation:[mx,my]})=>Math.abs(mx+21.3)<1e-9&&Math.abs(my+2.2)<1e-9));
});

test('mouse aiming converges each equipped gimbal pod on the clicked point without turning the hull',()=>{
 for(const id of alternateFits){
  const {q}=alternateFlight(id,'?launch=practice',{paid:1,fitOverrides:{primary:'sparrow-s2',secondary:'sparrow-s2'}});
  q.step();const {p}=q.inspect(),forward=p.aim;
  const fireAt=point=>{
   const {camera}=q.inspect();
   q.canvasPointer('pointerdown',(point.x-camera.x)*480/camera.w,(point.y-camera.y)*720/camera.h);
   return q.inspect().shots.at(-1);
  };
  const point={x:p.x,y:p.y-90},prior=q.inspect().practiceShots;
  fireAt(point);
  assert.equal(q.inspect().practiceShots,prior+2);
  q.inspect().shots.slice(-2).forEach((shot,i)=>{
   assert.equal(Math.sign(shot.x-p.x),i===0?-1:1);
   near(delta(shot.a,Math.atan2(point.y-shot.y,point.x-shot.x)),0);
  });
  near(delta(p.aim,forward),0);q.step(15);
  const outside=fireAt({x:p.x+96,y:p.y-12});
  assert.ok(Math.abs(delta(outside.a,p.aim))<=28*Math.PI/180+1e-8,'physical gimbal stop still applies');
 }
});

test('Custom Mode loans unowned fighters, does not bootstrap a wallet, and allows manual launch, firing, docking and reset',()=>{
 for(const [id,vessel,hp] of [['bastion-9','rift-carrier',16],['stocky-light-fighter','bifrost',26],['rift-fighter','bifrost',20]]){
  const existing=new Map([['rift-runner.character-generation.v1','pilot-custom'],
   ['rift-runner.hull-owned.v1',JSON.stringify({version:1,hull:'rift-fighter',condition:'repairing',readyAt:1,durationMs:240000})]]);
  const before=Array.from(existing);
  const {q,returned}=load('?launch=custom&fighter='+id+'&vessel='+vessel,{
   loadCredits:true,loadFighters:true,buildUI:true,sharedStorage:existing,reducedMotion:true});
  const {capitalShip:c,p,flightMode}=q.inspect();
  assert.equal(flightMode.id,'custom');assert.equal(flightMode.loaner,id);
  assert.equal(p.maxHp,hp);assert.equal(c.vessel.id,vessel==='bifrost'?'bifrost':'pegasus');
  q.step(90);assert.equal(c.phase,'docked');
  assert.match(q.el['capital-dock-status'].textContent,/Custom Mode/);
  q.click('capital-dock-action',{isTrusted:false});assert.equal(c.phase,'docked');
  q.click('capital-dock-action');awaitPhase(q,'flight');
  p.he3=20;
  const stock=id==='rift-fighter'?'blaster':'sparrow-s2';
  q.click('fire-button');assert.equal(q.inspect().shots.at(-1).weapon,stock);
  if(id==='rift-fighter'){q.click('gun-ballistic');assert.equal(q.inspect().fighterLoadout.weapon,'ballistic');}q.mute();assert.deepEqual(Array.from(existing),before);
  q.click('capital-dock-action');lineUp(q);q.click('capital-dock-action');awaitPhase(q,'docked');
  q.click('capital-store-action');awaitPhase(q,'stored');
  if(q.el['capital-hangar'])assert.equal(q.el['capital-hangar'].hidden,true);
  q.reset();assert.equal(q.inspect().capitalShip.phase,'docked');
  assert.equal(q.inspect().fighterLoadout.weapon,stock);
  q.click('return-main-menu');
  assert.deepEqual(returned,['./carrier.html?vessel='+vessel]);assert.deepEqual(Array.from(existing),before);
  assert.notEqual(q.inspect().flightMode.id,'custom');assert.notEqual(q.inspect().fighterLoadout.fighter,id);
 }
});

test('invalid or ambiguous Custom Mode URLs cannot bypass the normal hull check',()=>{
 for(const query of ['?launch=custom&fighter=bastion-9&vessel=bifrost&credits=true',
  '?launch=custom&fighter=bastion-9&vessel=bifrost&fighter=rift-fighter',
  '?launch=custom&fighter=unknown&vessel=rift-carrier']){
  const {q}=load(query,{loadFighters:true,buildUI:true,sharedStorage:new Map()});
  assert.equal(q.inspect().state,'menu');assert.equal(q.inspect().capitalShip,null);
 }
});

test('Custom Mode range is opt-in after manual launch, counts real shots, and resets without any pilot writes',()=>{
 for(const [id,vessel] of [['bastion-9','rift-carrier'],['stocky-light-fighter','bifrost'],['rift-fighter','bifrost']]){
  const storage=new Map(),{q,returned}=load('?launch=custom&fighter='+id+'&vessel='+vessel,{
   loadCredits:true,loadFighters:true,buildUI:true,sharedStorage:storage,reducedMotion:true});
  const panel=q.el['custom-range'],button=q.el['custom-range-button'],status=q.el['custom-range-readout'];
  q.step();assert.equal(panel.hidden,true);
  q.click('custom-range-button');assert.equal(q.inspect().rangeTargets.length,0);
  q.click('capital-dock-action');awaitPhase(q,'flight');
  assert.equal(panel.hidden,false);assert.equal(button.textContent,'Target range');
  assert.equal(q.inspect().rangeTargets.length,0,'range is optional');
  q.click('custom-range-button',{isTrusted:false});assert.equal(q.inspect().rangeTargets.length,0);
  q.click('custom-range-button');
  const {rangeTargets,p,camera}=q.inspect(),center=rangeTargets[1];
  assert.equal(rangeTargets.length,3);assert.match(status.textContent,/0 hits · 3 \/ 3 ready/);
  assert.ok(rangeTargets.every(t=>!t.cleared&&t.r===16));
  p.he3=20;
  q.canvasPointer('pointerdown',(center.x-camera.x)*480/camera.w,(center.y-camera.y)*720/camera.h);
  for(let i=0;i<36&&!q.inspect().rangeScore;i++)q.step();
  assert.equal(q.inspect().rangeScore,1);assert.equal(center.cleared,true);
  assert.match(status.textContent,/1 hit · 2 \/ 3 ready/);assert.equal(storage.size,0);
  q.click('custom-range-button');
  assert.equal(q.inspect().rangeScore,0);assert.match(status.textContent,/0 hits · 3 \/ 3 ready/);
  assert.notEqual(q.inspect().rangeTargets,rangeTargets);
  q.reset();q.step();assert.equal(panel.hidden,true);assert.equal(q.inspect().rangeTargets.length,0);
  q.click('return-main-menu');assert.deepEqual(returned,['./carrier.html?vessel='+vessel]);assert.equal(storage.size,0);
 }
 const standard=load('?launch=practice').q;standard.step();standard.click('custom-range-button');
 assert.equal(standard.el['custom-range'].hidden,true);assert.equal(standard.inspect().rangeTargets.length,0);
});

test('a shop-sourced trial returns to the same Shop Fighters shelf from Pause without initializing a wallet',()=>{
 for(const [fighter,vessel] of [['stocky-light-fighter','rift-carrier'],['bastion-9','bifrost']]){
  const storage=new Map(),{q,returned}=load('?launch=custom&fighter='+fighter+'&vessel='+vessel+'&from=shop',{
   loadCredits:true,loadFighters:true,buildUI:true,sharedStorage:storage,reducedMotion:true});
  assert.equal(q.inspect().flightMode.loaner,fighter);
  assert.equal(q.inspect().capitalShip.phase,'docked');
  assert.equal(q.el['return-main-menu'].textContent,'Return to Shop');
  assert.equal(q.el['return-main-menu'].getAttribute('aria-label'),'Return to Shop');
  assert.equal(storage.size,0);
  q.click('capital-dock-action');awaitPhase(q,'flight');
  q.click('custom-range-button');
  q.key('keydown','KeyP');assert.match(q.el.overlay.innerHTML,/Return to Shop/);
  q.choose('main-menu');assert.deepEqual(returned,['./carrier-shop.html?vessel='+vessel+'&view=fighters']);
  setup({loadCredits:true,sharedStorage:storage,address:{pathname:'/carrier-shop.html',search:returned[0].split('.html')[1]}});
  assert.equal(storage.size,0,'a direct loaner link on a blank browser stays read-only through the return');
 }
 const blank=new Map();
 setup({loadCredits:true,sharedStorage:blank,address:{pathname:'/carrier-shop.html',search:''}});
 assert.ok(blank.has('rift-runner.pilot-credits.v1'),'the ordinary Shop still uses its existing bootstrap');
 const rejected=load('?launch=custom&fighter=bastion-9&vessel=bifrost&from=https://example.test',{
  loadFighters:true,buildUI:true,sharedStorage:new Map()}).q;
 assert.equal(rejected.inspect().state,'menu');assert.equal(rejected.inspect().capitalShip,null);
});

test('loaners show two Sparrow aim markers that track the actual two wing shots; Rift-4 is unchanged',()=>{
 for(const id of [...alternateFits,'rift-fighter']){
  const aimPaint=[],{q}=load('?launch=custom&fighter='+id+'&vessel=rift-carrier',{aimPaint,loadFighters:true,reducedMotion:true});
  q.step();assert.ok(!aimPaint.some(m=>m.color==='#9dd6ff'),'guides are hidden when docked');
  q.click('capital-dock-action');awaitPhase(q,'flight');
  const p=q.inspect().p;
  Object.assign(p,{aim:-Math.PI/2,gimbalTarget:-Math.PI/2,vx:0,vy:0});
  aimPaint.length=0;q.step();
  if(id==='rift-fighter'){
   assert.ok(aimPaint.some(m=>m.r===6&&m.color==='#bfffee7d'));
   assert.ok(!aimPaint.some(m=>m.color==='#9dd6ff'));
   continue;
  }
  const marks=aimPaint.filter(m=>m.color==='#9dd6ff'&&(m.r===4||m.r===5));
  assert.equal(marks.length,2);assert.ok(marks[0].x<marks[1].x-20);
  p.he3=1;q.click('fire-button');const bolts=q.inspect().shots.slice(-2);
  near(p.he3,0);assert.equal(bolts.length,2);
  bolts.forEach((shot,i)=>{near(Math.atan2(marks[i].y-shot.y,marks[i].x-shot.x),shot.a);assert.equal(shot.damage,2);});
 }
});

test('normal flight displays exactly one Sparrow indicator per fitted actual side',()=>{
 for(const id of alternateFits){
  const aimPaint=[],{q}=alternateFlight(id,'?launch=practice',{aimPaint,fitOverrides:{primary:'sparrow-s2',secondary:null}});q.step();
  assert.ok(aimPaint.some(m=>m.r===5&&m.color==='#9dd6ff'));
  assert.ok(!aimPaint.some(m=>m.r===4&&m.color==='#9dd6ff'));
  aimPaint.length=0;const {q:right}=alternateFlight(id,'?launch=practice',{aimPaint,fitOverrides:{primary:null,secondary:'sparrow-s2'}});right.step();
  assert.ok(!aimPaint.some(m=>m.r===5&&m.color==='#9dd6ff'));
  assert.ok(aimPaint.some(m=>m.r===4&&m.color==='#9dd6ff'));
 }
});

test('atlas ringed worlds keep a tilted feathered ring, and no raw tile is drawn without a mask',()=>{
 const galaxyWatch=()=>({sample:()=>({sector:'reach',x:851,y:158,phase:'holding'})});
 for(const maskAvailable of [true,false]){
  const orbitMasks=maskAvailable?[]:undefined;
  const {q}=load('?launch=capital-test&departure=carrier',{sprite:true,orbitMasks,galaxyWatch});
  q.step(35);
  const atlas=q.sprites.find(x=>x.src==='./galaxy-planets.webp');
  Object.assign(atlas,{complete:true,naturalWidth:900,naturalHeight:600});
  q.spriteFrames.length=0;q.step(31);
  assert.ok(!q.spriteFrames.some(frame=>frame.asset===atlas),'the raw atlas never touches the flight canvas');
  if(!maskAvailable)continue;
  assert.equal(orbitMasks.length,1);
  const [tile]=orbitMasks;
  assert.deepEqual(tile.source.slice(1,5),[600,0,300,300]);
  assert.equal(tile.composite,'source-in');
  assert.deepEqual(tile.masks.map(m=>m.axis),[[143,155,107,143,155,114],[0,0,0,0,0,1]]);
  assert.deepEqual(tile.translate,[144,160]);
  assert.deepEqual(tile.scale,[150,19]);assert.equal(tile.angle,-.351);
  assert.equal(tile.masks[1].stops.at(-1)[1],'#0000');
  assert.ok(q.spriteFrames.some(frame=>frame.asset===tile&&frame.alpha>0));
 }
});

test('range hits respawn independently after five seconds of unpaused free flight and award no save credit',()=>{
 const storage=new Map(),{q}=load('?launch=custom&fighter=stocky-light-fighter&vessel=rift-carrier',{
  loadFighters:true,buildUI:true,sharedStorage:storage,reducedMotion:true});
 q.step();q.click('capital-dock-action');awaitPhase(q,'flight');q.click('custom-range-button');
 const {rangeTargets:[left,center],p}=q.inspect();
 const fireAt=target=>{
  const score=q.inspect().rangeScore;
  const {camera}=q.inspect();p.he3=20;
  q.canvasPointer('pointerdown',(target.x-camera.x)*480/camera.w,(target.y-camera.y)*720/camera.h);
  for(let i=0;i<36&&q.inspect().rangeScore===score;i++)q.step();
  assert.equal(q.inspect().rangeScore,score+1);assert.equal(target.cleared,true);
 };
 fireAt(center);const original=[center.x,center.y];q.step(50);fireAt(left);
 assert.ok(left.respawnAt>center.respawnAt+.5);
 const deadline=center.respawnAt,clock=q.inspect().rangeClock;
 q.key('keydown','KeyP');q.step(400);assert.equal(q.inspect().rangeClock,clock);
 q.choose('resume');q.hide(true);q.step(400);assert.equal(q.inspect().rangeClock,clock);
 q.hide(false);q.choose('resume');
 for(let i=0;i<400&&q.inspect().rangeClock+.016<deadline;i++)q.step();
 assert.equal(center.cleared,true);assert.ok(q.inspect().rangeClock+.017>=deadline);
 q.step();assert.equal(center.cleared,false);assert.equal(left.cleared,true);
 assert.deepEqual([center.x,center.y],original);
 fireAt(center);assert.equal(q.inspect().rangeScore,3);assert.equal(storage.size,0);
 for(let i=0;i<400&&left.cleared;i++)q.step();
 assert.equal(left.cleared,false);assert.equal(center.cleared,true);
 q.click('custom-range-button');assert.equal(q.inspect().rangeScore,0);
 assert.ok(!q.inspect().rangeTargets.includes(center));
});

test('alternate hulls default to factory twins, without consuming paid copies or changing deliberate saves',()=>{
 const s='sparrow-s2',key=id=>'rift-runner.ship-build.v1.'+id;
 for(const id of alternateFits){
  const options={paid:1,cockpitUI:true};
  const fresh=alternateFlight(id,'',{...options,noAlternateFit:true}).q;
  fresh.choose('hangar');
  assert.deepEqual([fresh.inspect().fighterFit.primary,fresh.inspect().fighterFit.secondary],[s,s]);
  assert.equal(fresh.storage.has(key(id)),false,'read-only defaults do not write a build');
  const {q}=alternateFlight(id,'',{...options,fitOverrides:{primary:null,secondary:'blaster'}});
  q.choose('hangar');
  assert.deepEqual([q.inspect().fighterFit.primary,q.inspect().fighterFit.secondary],[s,s],'pre-Sparrow loadouts get twin factory weapons');
  assert.equal(JSON.parse(q.storage.get(key(id))).secondary,'blaster','old Size 3 fit stays stored until edited');
  q.fit('secondary',null);assert.equal(q.inspect().fighterFit.secondary,null);
  assert.equal(JSON.parse(q.storage.get(key(id))).secondary,null);
  q.fit('primary',null);
  assert.deepEqual([q.inspect().fighterFit.primary,q.inspect().fighterFit.secondary],[null,null]);
  q.fit('primary','blaster');assert.equal(q.inspect().fighterFit.primary,null,'Size 3 remains incompatible');
  q.fit('secondary',s);assert.equal(q.inspect().fighterFit.secondary,s);
  q.fit('primary',s);assert.equal(q.inspect().fighterFit.primary,s);
 }
 const {q:one}=alternateFlight('bastion-9','',{fitOverrides:{primary:s,secondary:null}});
 const {q:empty}=alternateFlight('bastion-9','',{fitOverrides:{primary:null,secondary:null}});
 assert.deepEqual([one.inspect().fighterFit.primary,one.inspect().fighterFit.secondary],[s,null]);
 assert.deepEqual([empty.inspect().fighterFit.primary,empty.inspect().fighterFit.secondary],[null,null]);
});

test('Sparrow burst follows Sterling timing per mount, spends one half He3 per shot and never fires half an unaffordable twin volley',()=>{
 for(const paired of [false,true]){
  const cfg={fitOverrides:{primary:'sparrow-s2',secondary:paired?'sparrow-s2':null}};
  const {q}=alternateFlight('bastion-9','?launch=practice',cfg);q.step();
  q.click('gun-sparrow-s2',{detail:1,pointerType:'touch'});q.step(2);q.click('gun-sparrow-s2',{detail:1,pointerType:'touch'});
  assert.equal(q.inspect().burstModes['sparrow-s2'],true);
  const {p}=q.inspect(),count=paired?2:1,cost=.5*count;
  p.he3=cost-.1;q.step();assert.equal(q.el['fire-button'].dataset.phase,'low-he3');
  q.click('fire-button');assert.equal(q.inspect().practiceShots,0);
  p.he3=12;q.click('fire-button');
  assert.equal(q.inspect().practiceShots,count);near(p.he3,12-cost);near(p.heat,3+count*2.5);
  q.step(19);assert.equal(q.inspect().practiceShots,6*count);
  near(p.he3,12+19*.016*2-6*cost);near(p.heat,3+6*count*2.5);
 }
});

test('cruising planet stays large in the same screen position during launch zoom, camera travel, and a changing bearing',()=>{
 const orbitMasks=[];
 let position={sector:'reach',x:545,y:500,phase:'cruising'};
 const {q}=load('?launch=capital-test&departure=carrier',{sprite:true,orbitMasks,galaxyWatch:()=>({sample:()=>position})});
 q.step(28);
 const atlas=q.sprites.find(x=>x.src==='./galaxy-planets.webp');
 Object.assign(atlas,{complete:true,naturalWidth:900,naturalHeight:600});
 const capture=()=>{
  q.spriteFrames.length=0;q.step();
  const {p,camera}=q.inspect(),tile=q.spriteFrames.find(f=>f.asset===orbitMasks[0]);
  assert.ok(tile);
  const [x,y,w,h]=tile.bounds;
  return {camera,player:[p.x,p.y],center:[(x+w/2-camera.x)/camera.w,(y+h/2-camera.y)/camera.h],size:[w/camera.w,h/camera.h],left:(x-camera.x)/camera.w};
 };
 const before=capture();
 near(before.center[0],.24);near(before.center[1],.33);
 assert.ok(before.left<-.09,'the art deliberately continues off the left edge');
 const previousDiameter=Math.min(before.camera.w*.75,before.camera.h*.85,455/before.camera.zoom);
 near(before.size[0]*before.camera.w,previousDiameter*1.45);
 q.click('capital-dock-action');awaitPhase(q,'flight');
 position={...position,x:594,y:455};q.step(38);
 const mid=capture();
 assert.ok(before.camera.zoom>mid.camera.zoom,'launch changes foreground zoom');
 assert.notDeepEqual(before.player,mid.player);
 for(let i=0;i<2;i++){near(mid.center[i],before.center[i]);near(mid.size[i],before.size[i]);}
 const {p}=q.inspect();Object.assign(p,{x:p.x+90,y:p.y-120});
 const after=capture();assert.notDeepEqual([mid.camera.x,mid.camera.y],[after.camera.x,after.camera.y]);
 for(let i=0;i<2;i++){near(after.center[i],before.center[i]);near(after.size[i],before.size[i]);}
});
