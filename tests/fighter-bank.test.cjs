'use strict';
const assert=require('node:assert/strict'),test=require('node:test'),fs=require('node:fs'),path=require('node:path');
const {setup,tick}=require('./ballistic.test.cjs');
const bankSrc=side=>'./fighter-bank-'+side+'.webp';
const load=(art,width=480)=>Object.assign(art,{complete:true,naturalWidth:width,naturalHeight:width/1.5});
const frame=(q)=>{q.spriteFrames.length=0;q.step();return q.spriteFrames;};
async function launch(opts={}){
 const q=setup({sprite:true,...opts});const neutral=load(q.sprites[0]);
 q.choose('practice');await tick();q.step();
 q.inspect().cones.splice(0);
 return {q,neutral,p:q.inspect().p};
}
test('fighter banks right from a north-facing strafe then eases back as drift stops',async()=>{
 const {q,neutral,p}=await launch();
 assert.deepEqual(q.sprites.map(s=>s.src),['./fighter-winged.png?v=23']);
 q.key('keydown','KeyD');q.step(11);
 const right=q.sprites.find(x=>x.src===bankSrc('right'));
 assert.ok(right,'right asset starts loading from actual lateral movement');
 assert.ok(p.vx>0);assert.equal(q.sprites.some(x=>x.src===bankSrc('left')),false);
 assert.deepEqual(frame(q).map(f=>f.asset),[neutral],'still neutral while loading');
 load(right);
 const blended=frame(q);
 assert.deepEqual(blended.map(f=>f.asset),[neutral,right]);
 assert.ok(blended[1].alpha>0&&blended[1].alpha<1,'eased art blend');
 assert.equal(blended[0].alpha+blended[1].alpha,1);
 assert.deepEqual(blended[0].bounds,[-43.68,-28.22,87.36,58.24]);
 assert.deepEqual(blended[1].bounds,blended[0].bounds);
 assert.deepEqual(blended[0].translation,blended[1].translation,'aligned visual pivot');
 assert.equal(blended[1].rotation,0,'no altered aim/heading rotation');
 const initialAlpha=blended[1].alpha;q.step(35);
 assert.ok(frame(q).at(-1).alpha>initialAlpha,'held strafe reaches stronger bank');
 q.key('keyup','KeyD');
 assert.equal(frame(q).at(-1).asset,right,'released strafe still has inertial drift');
 q.step(135);
 assert.deepEqual(frame(q).map(f=>f.asset),[neutral],'once drift dissipates, settle in the exact neutral art');
 assert.equal(q.sprites.filter(x=>x.src===bankSrc('right')).length,1,'assets load only once');
 assert.equal(p.r,17);
});

test('left/right are local to the heading, pure fore/aft stays neutral, and reset clears lean',async()=>{
 const {q,neutral,p}=await launch();
 p.aim=0;
 for(const velocity of [125,-125]){
  Object.assign(p,{vx:velocity,vy:0});
  assert.deepEqual(frame(q).map(f=>f.asset),[neutral]);
 }
 assert.equal(q.sprites.length,1,'straight motion never asks for any bank art');
 q.key('keydown','KeyW');q.step(17);q.key('keyup','KeyW');
 const left=q.sprites.find(x=>x.src===bankSrc('left'));
 assert.ok(left,'east-facing craft strafing north banks LEFT instead of using screen x');
 assert.ok(p.vy<0);
 load(left);
 assert.equal(frame(q).at(-1).asset,left);
 assert.equal(frame(q).at(-1).rotation,Math.PI/2);
 q.reset();assert.deepEqual(frame(q).map(f=>f.asset),[neutral]);
 const after=q.inspect().p;
 Object.assign(after,{aim:Math.PI,vx:0,vy:-160});
 assert.deepEqual(frame(q).map(f=>f.asset),[neutral],'west-facing craft strafing north asks for right, not left');
 const right=q.sprites.find(x=>x.src===bankSrc('right'));assert.ok(right);
 load(right);
 assert.equal(frame(q).at(-1).asset,right);
});

test('failed or unavailable bank art and reduced motion keep existing neutral geometry',async()=>{
 const {q,neutral,p}=await launch();
 Object.assign(p,{aim:0,vx:0,vy:-140});
 assert.deepEqual(frame(q).map(f=>f.asset),[neutral]);
 const left=q.sprites.find(x=>x.src===bankSrc('left'));assert.ok(left);
 load(left,0);
 for(let i=0;i<10;i++)assert.deepEqual(frame(q).map(f=>f.asset),[neutral]);
 const safe=await launch({reducedMotion:true});
 Object.assign(safe.p,{aim:0,vx:0,vy:180});
 for(let i=0;i<10;i++)assert.deepEqual(frame(safe.q).map(f=>f.asset),[safe.neutral]);
 assert.equal(safe.q.sprites.length,1,'motion preference does not even load bank art');
});

test('published left and right art have the neutral sprite canvas and actual transparency',()=>{
 const art=['../dist','..'].map(p=>path.join(__dirname,p)).find(p=>fs.existsSync(path.join(p,'fighter-winged.png')));
 const images=['left','right'].map(side=>fs.readFileSync(path.join(art,'fighter-bank-'+side+'.webp')));
 for(const b of images){
  assert.equal(b.toString('ascii',0,4),'RIFF');assert.equal(b.toString('ascii',8,12),'WEBP');
  assert.equal(b.toString('ascii',12,16),'VP8X');assert.ok(b[20]&0x10);
  assert.equal(b.readUIntLE(24,3)+1,480);assert.equal(b.readUIntLE(27,3)+1,320);
 }
 assert.notDeepEqual(images[0],images[1],'left and right are individually supplied frames');
});

test('hover bob stays visible at speed and through banking without moving the shadow or aim',async()=>{
 const idle=await launch(),moving=await launch(),reduced=await launch({reducedMotion:true});
 const levels={idle:[],flight:[],reduced:[]};
 for(let i=0;i<77;i++){
  Object.assign(moving.p,{x:480,y:980,vx:145,vy:0});
  Object.assign(reduced.p,{x:480,y:980,vx:145,vy:0});
  for(const [label,{q,p}] of Object.entries({idle,flight:moving,reduced})){
   q.shadows.length=0;
   const frames=frame(q),art=q.sprites.find(x=>x.src===bankSrc('right'));
   if(art&&!art.complete)load(art);
   if(label==='flight'&&i>20)assert.equal(frames.at(-1).asset,art);
   assert.ok(frames.every(f=>f.translation[1]===frames[0].translation[1]&&f.rotation===0));
   assert.deepEqual(q.shadows.at(-1),[p.x+4,p.y+7]);
   assert.equal(p.aim,-Math.PI/2);
   levels[label].push(p.y-frames.at(-1).translation[1]);
  }
 }
 const span=key=>Math.max(...levels[key])-Math.min(...levels[key]);
 assert.ok(span('idle')>2.45&&span('idle')<2.51,'original idle bob amplitude');
 assert.ok(span('flight')>4.85&&span('flight')<=4.91,'visible continued bob at speed');
 assert.equal(span('reduced'),0);
 assert.ok(levels.flight.every((n,i)=>(n-8)*(levels.idle[i]-8)>=-1e-10),'flight and idle retain the same phase');
});

test('two live Vanduls bank independently by opposite lateral velocity and keep fixed shadows and aim',async()=>{
 for(const reducedMotion of [false,true]){
  const {q,p}=await launch({reducedMotion});q.cover(false);q.target(true,true);
  const art=q.sprites.find(s=>s.src==='./vandul-ship.webp');
  Object.assign(art,{complete:true,naturalWidth:272,naturalHeight:272});
  const [a,b]=q.inspect().vanduls,heights=[[],[]];
  assert.ok(a&&b);
  q.inspect().cones.splice(0);
  for(let i=0;i<77;i++){
   Object.assign(p,{x:480,y:989,vx:0,vy:0});
   Object.assign(a,{x:430,y:849,vx:125,vy:0,nextLaser:1e4,nextDriveBy:1e4});
   Object.assign(b,{x:550,y:649,vx:-125,vy:0,nextLaser:1e4,nextDriveBy:1e4});
   q.shadows.length=0;
   const artFrames=frame(q).filter(f=>f.asset===art);
   assert.equal(artFrames.length,2);
   for(const [index,ship] of [a,b].entries()){
    const sprite=artFrames[index];
    assert.equal(sprite.translation[0],ship.x);
    assert.deepEqual(q.shadows[index],[ship.x+4,ship.y+6]);
    const desired=Math.atan2(p.y-ship.y,p.x-ship.x);
    assert.ok(Math.abs(ship.aim-desired)<(i<4?.34:.013),'heading slews toward line of sight independent of bank');
    assert.equal(ship.r,20);
    heights[index].push(sprite.translation[1]-ship.y);
   }
   if(reducedMotion){
    assert.ok(artFrames.every(f=>!f.warp));
   }else if(i>20){
    assert.ok(artFrames[0].warp[2]<-.12&&artFrames[1].warp[2]>.12,'each hull follows its own signed lateral speed');
    assert.ok(artFrames[0].warp[0]<.93&&artFrames[1].warp[0]<.93);
   }
  }
  for(const h of heights)assert.ok(reducedMotion?h.every(y=>y===0):Math.max(...h)-Math.min(...h)>4.8);
 }
});
