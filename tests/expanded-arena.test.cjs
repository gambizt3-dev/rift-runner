'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {setup,tick}=require('./ballistic.test.cjs');
const near=(n,w)=>assert.ok(Math.abs(n-w)<1e-8,n+' != '+w);
const frame=(q,state)=>{const c=q.inspect().camera;near(c.x,state[0]);near(c.y,state[1]);};
test('960 × 1440 world keeps the original sprite scale in a taller viewport, follows and clamps at each edge',async()=>{
 const box={width:300,height:590,left:17,top:23};
 const q=setup({canvasBox:box,dpr:2.5,sprite:true});q.choose('practice');await tick();q.step();
 const {p,arena,launch,layoutStats,cones}=q.inspect();
 assert.deepEqual([arena.left,arena.right,arena.top,arena.bottom],[12,948,12,1428]);
 assert.deepEqual([p.x,p.y],[launch.x,launch.y]);near(p.r,17);near(p.speed,222);near(layoutStats.cssScale,.625);
 near(layoutStats.cssScale*480,300);near(layoutStats.cssScale*720,450);
 assert.equal(q.inspect().camera.w,480);assert.equal(q.inspect().camera.h,944);
 frame(q,[240,496]);
 Object.assign(p,{x:100,y:100});frame(q,[0,0]);
 Object.assign(p,{x:900,y:1380});frame(q,[480,496]);
 Object.assign(p,{x:480,y:800});frame(q,[240,328]);
 cones.splice(0);
 q.key('keydown','KeyD');q.step(100);assert.ok(p.x>720,'flies through the former right edge into the new area');
 assert.equal(q.inspect().camera.x,480);q.key('keyup','KeyD');
});
test('mouse aim uses the full portrait canvas at device pixel ratio with page and camera offsets',async()=>{
 const box={width:300,height:590,left:17,top:23};
 const q=setup({canvasBox:box,dpr:2.5});q.choose('practice','mouse');await tick();q.step();
 const {p,cones}=q.inspect();cones.splice(0);
 const screen=(worldX,worldY)=>{
  const {camera}=q.inspect();
  return [box.left+(worldX-camera.x)*box.width/camera.w,box.top+(worldY-camera.y)*box.height/camera.h];
 };
 q.canvasPointer('pointermove',...screen(p.x+110,p.y));near(p.aim,0);
 q.canvasPointer('pointermove',...screen(p.x,p.y+100));near(p.aim,Math.PI/2);
 q.canvasPointer('pointerdown',box.left+150,box.top-12);assert.equal(q.inspect().practiceShots,0,'outside canvas cannot fire');
 Object.assign(p,{x:905,y:1350});frame(q,[480,496]);
 q.canvasPointer('pointerdown',...screen(p.x,p.y-115));
 near(p.aim,-Math.PI/2);assert.equal(q.inspect().practiceShots,1);
 assert.ok(q.inspect().shots[0].vy<-550);
 q.pointer('pointerdown',16,'aim-pad',464,360);near(p.aim,0);
 q.pointer('pointerup',16,'aim-pad',464,360);near(p.aim,0);
 assert.equal(q.inspect().practiceShots,1,'touch aim never fires on release');
});
test('the iPhone-style wide stage shows world to both display edges without scaling sprites up',async()=>{
 const box={width:282,height:247,left:11,top:160};
 const q=setup({canvasBox:box,dpr:3});q.choose('practice','mouse');await tick();q.step();
 const {camera,layoutStats:s,p}=q.inspect();
 const priorScale=Math.min(s.viewW/480,s.viewH/720);
 near(s.scale,priorScale);
 assert.ok(camera.w>800&&camera.w<850,'the black strips now reveal surrounding world');
 near(camera.h,720);near(camera.w*s.scale,s.viewW);near(camera.h*s.scale,s.viewH);
 assert.deepEqual(q.transforms.at(-1),[s.scale,0,0,s.scale,0,0]);
 assert.deepEqual(q.rectangles.at(-1),[0,0,camera.w,camera.h]);
 q.inspect().cones.splice(0);
 q.canvasPointer('pointerdown',box.left+box.width-3,box.top+box.height/2);
 near(p.aim,0);assert.equal(q.inspect().practiceShots,1,'former right black strip is interactive');
 Object.assign(p,{x:925,y:1000});near(q.inspect().camera.x+q.inspect().camera.w,960);
 q.canvasPointer('pointermove',box.left+5,box.top+box.height/2);
 near(Math.abs(p.aim),Math.PI);
});
test('wide desktop and square views cover the entire canvas without rendering past the world',async()=>{
 for(const [width,height] of [[970,480],[580,620],[480,720],[330,1200]]){
  const q=setup({canvasBox:{width,height,left:3,top:5},dpr:1.25});q.choose('practice');await tick();q.step();
  const {camera:c,layoutStats:s,p}=q.inspect();
  near(c.w*s.scale,s.viewW);near(c.h*s.scale,s.viewH);
  assert.ok(c.w<=960&&c.h<=1440);
  assert.deepEqual(q.transforms.at(-1),[s.scale,0,0,s.scale,0,0]);
  assert.deepEqual(q.rectangles.at(-1),[0,0,c.w,c.h]);
  Object.assign(p,{x:931,y:1411});
  const edge=q.inspect().camera;near(edge.x+edge.w,960);near(edge.y+edge.h,1440);
  if(width===480&&height===720){near(c.w,480);near(c.h,720);}
 }
});
test('first hostile is rendered inside the unchanged camera view before admission and can engage by seven seconds',async()=>{
 const q=setup({sprite:true});q.choose('start');await tick();
 Object.assign(q.sprites[1],{complete:true,naturalWidth:272,naturalHeight:272});
 let firstVisible=null,admitted=null,laser=null;
 for(let i=0;i<438;i++){
  q.step();const time=i*.016,{camera,vandulIngress,vandul,vandulLasers,p}=q.inspect();
  if(vandulIngress&&vandulIngress.x>=camera.x&&vandulIngress.x<=camera.x+camera.w&&vandulIngress.y>=camera.y){
   firstVisible??=time;
   assert.ok(q.spriteFrames.some(f=>f.asset===q.sprites[1]&&f.translation[0]===vandulIngress.x&&f.translation[1]===vandulIngress.y));
   assert.equal(vandulLasers.length,0,'entry remains noncombative');
  }
  if(vandul&&admitted===null){admitted=time;assert.ok(Math.hypot(vandul.x-p.x,vandul.y-p.y)<170);}
  if(vandulLasers.length&&laser===null)laser=time;
 }
 assert.ok(firstVisible>=3.2&&firstVisible<4.35,firstVisible);
 assert.ok(admitted>firstVisible&&admitted<5.4,admitted);
 assert.ok(laser>=admitted+.90&&laser<6.5,laser);
 console.log('V47 timings at default launch: first visible '+firstVisible.toFixed(3)+'s, admitted '+admitted.toFixed(3)+'s, first laser '+laser.toFixed(3)+'s.');
});
