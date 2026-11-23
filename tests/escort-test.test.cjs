'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {setup}=require('./ballistic.test.cjs');
const launch=(options={})=>{
 const returned=[];
 return {q:setup({address:{search:'?launch=escort',replace:to=>returned.push(to)},...options}),returned};
};
const length=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const clearance=(p,hull)=>Math.min(...hull.map(body=>length(p,body)-p.r-body.r));

test('portrait Escort follows Orion outside the hull for a full loop with either fitted drive',()=>{
 for(const engine of ['stock-thruster','test-thruster']){
  const {q}=launch({savedEngine:JSON.stringify({version:1,engine}),initialHe3:0,
   canvasBox:{width:390,height:650,left:0,top:0}});
  q.step();
  const {escortShip:c,escortPoint,escortCourse:course,p,arena}=q.inspect(),hud=q.el['escort-hud'];
  const loop=4*course.halfRun+2*Math.PI*course.radius,initialAim=p.aim;
  assert.equal(q.inspect().fighterLoadout.engine,engine);
  assert.equal(q.inspect().capitalShip,null);assert.equal(q.el['capital-dock-hud'].hidden,true);
  assert.equal(q.el['flight-deck'].inert,false);assert.equal(hud.hidden,false);assert.equal(hud.dataset.mode,'formation');
  assert.equal(q.inspect().vanduls.length,0);assert.equal(q.inspect().cones.length,0);
  assert.equal(q.graphs.length,0,'linked route must not unlock audio');
  let worst=0,maxStep=0,previous={...p},turned=false;
  while(c.distance<loop*1.10){
   q.step();
   const target=escortPoint();
   assert.ok(target.x>arena.left+p.r&&target.x<arena.right-p.r&&target.y>arena.top+p.r&&target.y<arena.bottom-p.r);
   worst=Math.max(worst,length(p,target));maxStep=Math.max(maxStep,length(p,previous));previous={...p};
   if(c.aim>0)turned=true;
  }
  assert.ok(turned&&worst<4,'tracks through both ends of a full course');
  assert.ok(maxStep<p.speed*.016+.05,'no teleport, snap or lock step');
  assert.ok(clearance(p,c.hull)>45);
  assert.equal(p.aim,initialAim,'position follows turns but pilot orientation is free');
 }
});

test('formation allows independent phone aim/fire; explicit break and either manual control release tracking',()=>{
 const {q}=launch();q.step(40);
 const {escortShip:c,p}=q.inspect(),button=q.el['escort-action'];
 q.pointer('pointerdown',16,'aim-pad',240,360);q.pointer('pointermove',16,'aim-pad',345,360);q.step(30);
 assert.ok(Math.abs(p.aim)<.06,'aim can move independently');
 const before=q.inspect().practiceShots;
 q.pointer('pointerdown',42,'fire-button');q.pointer('pointerup',42,'fire-button');
 q.pointer('pointerup',16,'aim-pad');q.step();
 assert.equal(q.inspect().practiceShots,before+1);
 assert.equal(c.following,true);
 q.click('escort-action',{isTrusted:false});assert.equal(c.following,true);
 q.click('escort-action');assert.equal(c.following,false);assert.equal(button.textContent,'Rejoin');
 q.step(90);assert.equal(c.following,false);assert.match(q.el['escort-status'].textContent,/Free flight/);
 q.click('escort-action');assert.equal(c.following,true);
 q.pointer('pointerdown',18,'move-pad',340,360,{target:q.moveButtons.e});q.step();
 assert.equal(c.following,false,'manual trim overrides immediately');
 q.pointer('pointerup',18,'move-pad');q.step(30);
 assert.equal(c.following,false,'movement release never auto-rejoins');
 q.click('escort-action');
 q.pointer('pointerdown',19,'move-pad',240,360,{target:q.el['main-thruster']});q.step();
 assert.equal(c.following,false,'main thruster overrides immediately');
 q.pointer('pointercancel',19,'move-pad');q.step(25);
 assert.equal(c.following,false);
});

test('opposite-flank Rejoin uses bounded physical detour around either end, including a turn',()=>{
 for(const [wait,y] of [[0,10],[0,-10],[700,10]]){
  const {q}=launch();q.step(wait+1);
  const {p,escortShip:c,berthWorld,escortPoint,escortPathClear,berthLocal}=q.inspect();
  q.click('escort-action');assert.equal(c.following,false);
  Object.assign(p,berthWorld(c,-125,y),{vx:0,vy:0});
  const slot=escortPoint();assert.equal(escortPathClear(slot.x,slot.y),false,'hull blocks the direct route');
  const before={x:p.x,y:p.y};q.click('escort-action');
  assert.equal(length(p,before),0,'click cannot attach or move player');
  assert.equal(q.el['escort-hud'].dataset.mode,'rejoining');
  let gap=Infinity,maxStep=0,across=false;
  for(let i=0;i<620&&q.el['escort-hud'].dataset.mode!=='formation';i++){
   const prev={x:p.x,y:p.y};q.step();
   gap=Math.min(gap,clearance(p,c.hull));maxStep=Math.max(maxStep,length(p,prev));
   const pos=berthLocal(c,p.x,p.y);if(Math.abs(pos.y)>100&&Math.abs(pos.x)<55)across=true;
  }
  assert.ok(across,'actually went around the end, not through the hull');
  assert.equal(q.el['escort-hud'].dataset.mode,'formation');assert.ok(gap>6);assert.ok(maxStep<2.4);
 }
});

test('solid freighter, pause/hidden/reset/return, and sandbox do not mutate progress',()=>{
 const wallet='rift-runner.pilot-credits.v1',hull='rift-runner.hull-owned.v1';
 const storage=new Map([[wallet,'sentinel']]);
 const {q,returned}=launch({sharedStorage:storage});
 q.step();const {p,escortShip:c,arena}=q.inspect(),body=c.hull[1];
 q.click('escort-action');Object.assign(p,{x:body.x-body.r-p.r-4,y:body.y,vx:160,vy:0});
 q.step(10);assert.ok(clearance(p,c.hull)>-.02);assert.ok(p.vx<30);assert.equal(p.hp,p.maxHp);
 Object.assign(p,{x:body.x-body.r-44,y:body.y,vx:0,vy:0,aim:0});
 q.click('fire-button');assert.equal(q.inspect().shots.length,1);
 q.step(12);assert.equal(q.inspect().shots.length,0);assert.equal(q.inspect().practiceHits,0);
 Object.assign(p,{x:arena.right-p.r-.1,y:280,vx:240,vy:0,impactCooldown:0});q.step(3);
 assert.equal(p.hp,p.maxHp,'Escort physics does not damage pilot at boundary');
 q.key('keydown','KeyP');const at=c.distance;q.step(80);assert.equal(c.distance,at);
 q.choose('resume');q.hide(true);q.step(80);assert.equal(c.distance,at);
 q.hide(false);q.choose('resume');q.step(5);assert.ok(c.distance>at);
 q.reset();assert.notEqual(q.inspect().escortShip,c);assert.equal(q.inspect().escortShip.following,true);
 q.click('return-main-menu');assert.deepEqual(returned,['./carrier.html']);
 assert.equal(q.inspect().escortShip,null);assert.equal(q.el['escort-hud'].hidden,true);
 assert.equal(storage.get(wallet),'sentinel');assert.equal(storage.has(hull),false);
});

test('no escort HUD, ship, or closed controls leak to other modes',()=>{
 for(const search of ['?launch=practice','?launch=capital-test','?launch=carrier-launch']){
  const q=setup({address:{search}});q.step();
  assert.equal(q.inspect().escortShip,null);assert.equal(q.el['escort-hud'].hidden,true);
  assert.equal(q.el['capital-dock-hud'].hidden,search.endsWith('practice'));
 }
});
