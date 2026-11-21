'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {setup,tick}=require('./ballistic.test.cjs');
const damage={blaster:3,ballistic:5,ak77:2};
const flight=(x,y,vx,vy)=>({x,y,vx,vy,a:Math.atan2(vy,vx)});
const player=(x,y,vx,vy,weapon='ballistic')=>({...flight(x,y,vx,vy),weapon,damage:damage[weapon]});
const enemy=(x,y,vx,vy,owner,life=1)=>({...flight(x,y,vx,vy),owner,life,damage:2});
const cone=(x,y)=>({id:31,x,y,r:15,vx:0,vy:0,angle:0,spin:0,hitGlow:0,wallFx:0,invMass:1});
const flashes=q=>q.inspect().rings.filter(r=>r.colour==='#c9f5ff');
async function duel(fit='ballistic'){
 const q=setup({saved:fit,savedFit:fit==='ak77'?JSON.stringify({version:1,primary:'ak77',secondary:'blaster'}):undefined});q.cover(false);q.open('start');await tick();q.step();q.target(true);
 const {p,vandul:v,cones}=q.inspect();
 cones.length=0;
 Object.assign(p,{x:420,y:920,vx:0,vy:0,aim:0});
 Object.assign(v,{x:700,y:940,vx:0,vy:0,nextLaser:60,nextDriveBy:60});
 return q;
}
test('live fire from all three guns trades one bolt for one and flashes without touching HP',async()=>{
 for(const weapon of Object.keys(damage)){
  const q=await duel(weapon),before=q.inspect();
  q.click('fire-button');
  const emitted=q.inspect().shots[0];
  assert.equal(emitted.weapon,weapon);
  before.vandulLasers.push(enemy(460,emitted.y,-335,0,before.vandul));
  for(let i=0;i<8&&!flashes(q).length;i++)q.step();
  const now=q.inspect();
  assert.equal(flashes(q).length,1);
  assert.ok(q.inspect().sparks.some(s=>s.tone==='#eafffb'),'visible burst spawns particles');
  assert.ok(flashes(q)[0].x>440&&flashes(q)[0].x<460,'flash appears at contact, not muzzle');
  assert.equal(now.vandulLasers.length,0);
  assert.ok(!now.shots.includes(emitted),'the exact player projectile disappears');
  assert.equal(now.p.hp,20);assert.equal(now.vandul.hp,20);assert.equal(now.practiceHits,0);
 }
});

test('relative sweep catches fast perpendicular passing, but ignores allied crossings',async()=>{
 const q=await duel(),s=q.inspect();
 s.shots.push(player(310,600,20000,0));
 s.vandulLasers.push(enemy(390,520,0,20000,s.vandul));
 s.shots.push(player(310,700,20000,0),player(390,620,0,20000));
 s.vandulLasers.push(enemy(610,570,20000,0,s.vandul),enemy(690,490,0,20000,s.vandul));
 q.step();
 const out=q.inspect();
 assert.equal(out.shots.length,2);assert.equal(out.vandulLasers.length,2);
 assert.equal(flashes(q).length,1);
 assert.ok(Math.abs(flashes(q)[0].x-390)<3&&Math.abs(flashes(q)[0].y-600)<3);
});

test('first physical cover or hull impact wins instead of a later interception',async()=>{
 {
  const q=await duel(),s=q.inspect(),cover=cone(331,600);
  s.cones.push(cover);
  s.shots.push(player(300,600,10000,0));
  s.vandulLasers.push(enemy(390,600,-10000,0,s.vandul));
  q.step();
  assert.equal(q.inspect().practiceHits,1);assert.ok(cover.hitGlow>0);assert.equal(flashes(q).length,0);
  assert.equal(q.inspect().shots.length,0);assert.equal(q.inspect().vandulLasers.length,0);
 }
 {
  const q=await duel(),s=q.inspect();
  Object.assign(s.p,{x:517,y:600});
  s.vandulLasers.push(enemy(553,600,-10000,0,s.vandul));
  s.shots.push(player(452,600,10000,0));
  q.step();
  assert.equal(s.p.hp,18);assert.equal(flashes(q).length,0);
  assert.equal(q.inspect().shots.length,1);
 }
 {
  const q=await duel(),s=q.inspect();
  Object.assign(s.vandul,{x:331,y:600,hp:5});
  s.shots.push(player(300,600,10000,0));
  s.vandulLasers.push(enemy(390,600,-10000,0,s.vandul));
  q.step();
  assert.equal(q.inspect().duelKills,1);
  assert.equal(q.inspect().vandulLasers.length,0,'a wrecked owner cannot leave a later bolt impact');
  assert.equal(flashes(q).length,0);
 }
});

test('one bolt cannot stop a second shot; a remaining pair may still clash later',async()=>{
 const q=await duel(),s=q.inspect();
 s.shots.push(player(350,550,10000,0),player(310,550,10000,0));
 s.vandulLasers.push(enemy(400,550,-10000,0,s.vandul),enemy(445,550,-10000,0,s.vandul));
 const trailing=player(310,650,10000,0);
 s.shots.push(player(350,650,10000,0),trailing);
 s.vandulLasers.push(enemy(400,650,-10000,0,s.vandul));
 q.step();
 assert.equal(flashes(q).length,3);
 assert.equal(q.inspect().vandulLasers.length,0);
 assert.equal(q.inspect().shots.length,1);assert.equal(q.inspect().shots[0],trailing);
});

test('dense volleys retain exact alternating survivors and bounded visible effects',async()=>{
 const q=await duel(),s=q.inspect(),survivors=[];
 for(let i=0;i<26;i++){
  const y=103+i*23;
  s.shots.push(player(350,y,6000,0,Object.keys(damage)[i%3]));
  s.vandulLasers.push(enemy(392,y,-6000,0,s.vandul));
  if(i%2===0){const bolt=player(308,y,6000,0);s.shots.push(bolt);survivors.push(bolt);}
 }
 q.step();
 const out=q.inspect();
 assert.equal(out.vandulLasers.length,0);
 assert.deepEqual(Array.from(out.shots),survivors);
 assert.equal(flashes(q).length,22,'existing visual ring cap holds under a crowded sweep');
 assert.equal(out.sparks.filter(s=>s.tone==='#eafffb').length,26*7);
 assert.equal(out.p.hp,20);assert.equal(out.vandul.hp,20);
});

test('an opposing bolt that expires before the crossing cannot block a shot',async()=>{
 const q=await duel(),s=q.inspect(),b=player(350,600,10000,0);
 s.shots.push(b);
 s.vandulLasers.push(enemy(400,600,-10000,0,s.vandul,.0005));
 q.step();
 assert.equal(flashes(q).length,0);
 assert.equal(q.inspect().vandulLasers.length,0);
 assert.equal(q.inspect().shots[0],b);
});
