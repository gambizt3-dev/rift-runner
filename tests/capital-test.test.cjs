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
 assert.match(missions,/carrier-launch-test\.html">Launch \(test\)/);
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
