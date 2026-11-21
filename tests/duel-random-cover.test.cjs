'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {setup,tick,arrive}=require('./ballistic.test.cjs');
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const lanes=[298,480,720];
const coords=bs=>Array.from(bs,b=>[b.x,b.y,b.r]);
const span=(min,max)=>Array.from({length:max-min+1},(_,i)=>min+i);
function checkCover(info,bodies){
 const {launch,arena,vandulEntry}=info;
 for(const b of bodies){
  assert.ok(b.x-b.r>=arena.left+91&&b.x+b.r<=arena.right-91,'two continuous side paths');
  assert.ok(b.y-b.r>arena.top&&b.y+b.r<arena.bottom);
  assert.ok(distance(b,launch)>=b.r+69,'launch apron stays clear');
  if(b.y+b.r+28>=launch.y)assert.ok(Math.abs(b.x-launch.x)>=b.r+43,'future southern flight approach');
  if(b.y-b.r-28<=vandulEntry.finishY)for(const lane of lanes)assert.ok(Math.abs(b.x-lane)>=b.r+32,'three clear northern approaches');
  for(const c of info.cones)assert.ok(distance(c,b)>=c.r+b.r+36.99,'no initial cone overlap and room to pass');
 }
 for(let i=0;i<bodies.length;i++)for(let j=0;j<i;j++)
  assert.ok(distance(bodies[i],bodies[j])>=bodies[i].r+bodies[j].r+36.99,'no initial contact on collision spawn');
}
test('160 seeded fields vary count, position, size and retain three asteroid types, safe approaches and fly-throughs',()=>{
 const q=setup(),scene=q.inspect(),occupied=[scene.p,...scene.cones];
 const seen=new Set(),counts=new Set(),scrapCounts=new Set(),types=new Map(scene.asteroidProfiles.map(p=>[p.tile,p]));
 for(let i=0;i<160;i++){
  const seed=Math.imul(0x9e3779b9,i+1)>>>0;
  const {rocks,scrap}=q.fieldForTest(seed,occupied);
  checkCover(scene,[...rocks,...scrap]);
  assert.ok(rocks.length>=3&&rocks.length<=7);assert.ok(scrap.length>=3&&scrap.length<=5);
  counts.add(rocks.length);scrapCounts.add(scrap.length);
  assert.equal(new Set(rocks.map(r=>r.profile.tile)).size,3);
  assert.ok(rocks[0].r>=44&&rocks[0].r<=59);
  assert.ok(rocks[0].profile.drawSize>=130,'larger artwork is not only a collision size change');
  for(const r of rocks){
   const original=types.get(r.profile.tile),scale=r.r/original.r;
   assert.ok(Math.abs(r.profile.drawSize-original.drawSize*scale)<1e-7);
   assert.ok(Math.abs(r.invMass-1/(original.mass*scale*scale))<1e-7);
   assert.equal(r.vx,0);assert.equal(r.vy,0);
  }
  for(const d of scrap){
   assert.equal(d.debris,true);assert.equal(d.asteroid,undefined);
   assert.ok(d.r>=7&&d.r<=13&&d.shape.length===5);
   assert.ok(d.shape.every(([x,y])=>Math.hypot(x,y)<=d.r+1e-8));
  }
  const signature=JSON.stringify([coords(rocks),coords(scrap)]);
  assert.equal(seen.has(signature),false);seen.add(signature);
  if(i===7){const repeat=q.fieldForTest(seed,occupied);assert.equal(JSON.stringify([coords(repeat.rocks),coords(repeat.scrap)]),signature);}
 }
 assert.deepEqual([...counts].sort(),span(3,7));assert.deepEqual([...scrapCounts].sort(),span(3,5));
 const blocked=q.fieldForTest(242,[{x:450,y:850,r:1200}]);
 assert.equal(blocked.rocks.length,0);assert.equal(blocked.scrap.length,0,'full obstruction fails closed without overlapping');
});

test('live routed duel fields reroll on reset, and covering changes never relocate old wrecks',async()=>{
 const q=setup({address:{search:'?launch=vandul'},fieldSeed:836,saved:'ballistic'});q.step(130);
 const initial=q.inspect(),before=[coords(initial.asteroids),coords(initial.sceneryDebris)];
 checkCover(initial,[...initial.asteroids,...initial.sceneryDebris]);
 q.reset();
 const next=q.inspect();checkCover(next,[...next.asteroids,...next.sceneryDebris]);
 assert.notDeepEqual([coords(next.asteroids),coords(next.sceneryDebris)],before);
 const ship=arrive(q);assert.ok(ship);
 const {p}=q.inspect();
 Object.assign(ship,{x:320,y:340,vx:0,vy:0,hp:5,nextLaser:999,nextDriveBy:999});
 Object.assign(p,{x:320,y:420,vx:0,vy:0,aim:-Math.PI/2});
 q.click('fire-button');q.step(13);
 const wreck=q.inspect().wreckage;assert.ok(wreck);
 const wreckPose=coords(wreck.bodies),cones=q.inspect().cones;
 q.cover(false);assert.equal(q.inspect().asteroids.length,0);assert.equal(q.inspect().sceneryDebris.length,0);
 q.cover(true);
 const refreshed=q.inspect();
 assert.equal(refreshed.wreckage,wreck);assert.deepEqual(coords(wreck.bodies),wreckPose);
 assert.equal(refreshed.cones,cones);
 for(const b of [...refreshed.asteroids,...refreshed.sceneryDebris])for(const d of wreck.bodies)assert.ok(distance(b,d)>b.r+d.r);
});

test('new small scrap is physical cover, practice keeps original cone geometry and no added clutter',async()=>{
 const practice=setup({address:{search:'?launch=practice'},fieldSeed:42});
 const fixed=coords(practice.inspect().cones);assert.equal(fixed.length,8);
 assert.equal(practice.inspect().asteroids.length,0);assert.equal(practice.inspect().sceneryDebris.length,0);
 practice.reset();assert.deepEqual(coords(practice.inspect().cones),fixed);
 const q=setup({address:{search:'?launch=vandul'},fieldSeed:2026,saved:'ballistic'});q.step(130);await tick();
 const {p,asteroids,cones,sceneryDebris,shots}=q.inspect();
 const body=sceneryDebris[0];sceneryDebris.splice(1);asteroids.splice(0);cones.splice(0);
 Object.assign(body,{x:380,y:880,vx:0,vy:0});
 const launchX=body.x;
 shots.push({x:launchX-63,y:body.y,vx:17000,vy:0,a:0,weapon:'ballistic',damage:5});
 q.step(2);
 assert.ok(body.vx>30&&body.hitGlow>0);assert.equal(q.inspect().practiceHits,1);
 assert.equal(q.inspect().shots.length,0,'scrap physically blocks a swept round');
 Object.assign(body,{x:380,y:880,vx:0,vy:0});
 Object.assign(p,{x:body.x-body.r-p.r-1,y:body.y,vx:156,vy:0});
 q.step(5);assert.ok(body.vx>0);assert.equal(p.hp,20,'small scrap nudges, not hull damage');
});
