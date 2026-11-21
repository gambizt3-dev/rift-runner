'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {setup,tick,arrive}=require('./ballistic.test.cjs');
async function run(cover=false,art=false,opts={}){
 const q=setup({saved:'ballistic',canvasArchive:art,sprite:art,...opts});q.cover(cover);
 if(!opts.address)q.choose('start');
 await tick();waitFor(q,s=>s.vandul);q.inspect().cones.splice(1);return q;
}
function finish(q,x=250,y=315,v=q.inspect().vandul){
 const {p}=q.inspect();assert.ok(v&&v.hp>0);
 Object.assign(v,{x,y,vx:-25,vy:0,hp:5,nextDriveBy:50,nextLaser:10});
 Object.assign(p,{x,y:y+70,aim:-Math.PI/2,vx:0,vy:0});
 q.inspect().vandulLasers.push({x:440,y:36,vx:0,vy:335,a:Math.PI/2,life:1,damage:2,owner:v});
 q.click('fire-button');
 for(let i=0;i<11&&v.hp>0;i++)q.step();
 assert.equal(v.hp,0);
 const s=q.inspect();assert.equal(s.vandulLasers.some(l=>l.owner===v),false,'dead enemy loses its shots');
 return {v,w:s.wreckage};
}
test('sequential real finishes keep HP, settings, positions and old debris throughout each next wave',async()=>{
 const q=await run(true),start=q.inspect(),{p,cones,asteroids}=start;
 p.hp=12;
 assert.equal(start.duelKills,0);
 assert.match(q.el['vandul-duel-readout'].textContent,/Wave 1/);
 const first=finish(q),n=q.inspect();
 assert.equal(n.duelKills,1);assert.equal(n.activeWrecks.length,1);assert.equal(n.activeWrecks[0],first.w);
 assert.match(q.el['vandul-countdown'].textContent,/Wave 2.*3/);
 const x=p.x,before=p.y;
 q.step(185);
 assert.equal(q.inspect().vandul,null);assert.equal(first.v.hp,0);assert.equal(q.inspect().vandulIngress,null);
 assert.equal(q.inspect().vandulLasers.length,0);
 const second=arriveAfterDefeat(q,first.v);assert.ok(second);
 assert.equal(second.hp,20);assert.notEqual(second,first.v);
 assert.equal(q.inspect().duelClock,0);assert.equal(q.inspect().duelKills,1);
 assert.equal(q.inspect().p,p);assert.equal(p.hp,12);assert.ok(Math.abs(p.x-x)<16);assert.ok(Math.abs(p.y-before)<48);
 assert.equal(q.inspect().cones,cones);assert.equal(q.inspect().asteroids,asteroids);
 assert.equal(q.inspect().activeWrecks[0],first.w);assert.match(q.el['vandul-duel-readout'].textContent,/Kills 1.*Wave 2/);
 const next=finish(q,180,355);assert.equal(q.inspect().duelKills,2);
 assert.deepEqual(Array.from(q.inspect().activeWrecks),[first.w,next.w]);
 assert.ok(arriveAfterDefeat(q,next.v));assert.match(q.el['vandul-duel-readout'].textContent,/Kills 2.*Wave 3/);
 q.reset();
 assert.equal(q.inspect().p.hp,20);assert.equal(q.inspect().duelKills,0);
 assert.equal(q.inspect().activeWrecks.length,0);assert.equal(q.inspect().wreckLayer,null);
 assert.equal(q.inspect().vandul,null);assert.match(q.el['vandul-countdown'].textContent,/3/);
 assert.ok(arrive(q));assert.match(q.el['vandul-duel-readout'].textContent,/Kills 0.*Wave 1/);
});
function arriveAfterDefeat(q,old){
 for(let i=0;i<480;i++){
  q.step();const s=q.inspect();
  assert.ok(s.vanduls.length<=3,'bounded active actors');
  assert.ok(!s.vandulLasers.length,'old-wave shots do not resurrect');
  if(s.vandul&&s.vandul!==old)return s.vandul;
 }
 return null;
}
test('older visible wrecks bake into one bounded graphics layer, only three keep physics',async()=>{
 const q=await run(false,true);
 const wrecks=[];
 for(const [x,y] of [[240,313],[168,423],[350,333],[112,540],[330,460]]){
  const won=finish(q,x,y);wrecks.push(won.w);
  assert.ok(q.inspect().activeWrecks.length<=3);
  if(wrecks.length<5)assert.ok(arriveAfterDefeat(q,won.v));
 }
 const s=q.inspect();
 assert.equal(s.duelKills,5);
 assert.deepEqual(Array.from(s.activeWrecks),wrecks.slice(-3));
 assert.equal(s.archivedWrecks.length,0);
 const layer=s.wreckLayer;assert.ok(layer);assert.equal(layer.width,960);assert.equal(layer.height,1440);
 assert.ok(layer.fills>=12,'older hull and fragments were stamped');
 assert.ok(q.spriteFrames.some(frame=>frame.asset===layer),'baked layer draws alongside current wrecks');
 q.reset();assert.equal(q.inspect().wreckLayer,null);assert.equal(q.inspect().activeWrecks.length,0);
});
test('inter-wave countdown freezes in pause, hidden and Hangar; hull loss cancels remaining arrivals',async()=>{
 const q=await run();const won=finish(q);q.step(25);
 const c=q.inspect().duelCountdown;
 q.key('keydown','KeyP');q.step(260);assert.equal(q.inspect().duelCountdown,c);
 q.open('resume');q.hide(true);q.step(260);assert.equal(q.inspect().duelCountdown,c);
 q.hide(false);q.open('resume');q.click('open-hangar');q.step(260);assert.equal(q.inspect().duelCountdown,c);
 q.click('close-hangar');assert.equal(q.inspect().vandul,null);
 const {p}=q.inspect();Object.assign(p,{x:930,y:600,vx:255,vy:0,hp:1});
 q.step(2);assert.equal(q.inspect().state,'disabled');assert.equal(q.inspect().duelResult,'lost');
 assert.equal(q.inspect().duelCountdown,0);q.step(390);
 assert.equal(q.inspect().vandulIngress,null);assert.equal(q.inspect().duelKills,1);
 assert.equal(q.inspect().vandul,null);assert.equal(q.inspect().wreckage,won.w);
 assert.match(q.el['vandul-duel-readout'].textContent,/RUN ENDED.*Kills 1/);
});

function waitFor(q,predicate,frames=780){
 for(let i=0;i<frames;i++){
  q.step();const s=q.inspect();
  if(predicate(s))return s;
 }
 assert.fail('Timed out: '+q.el['vandul-duel-readout'].textContent+' / '+q.el['vandul-countdown'].textContent);
}
function quiet(s){
 for(const ship of s.vanduls){
  ship.nextLaser=1e4;ship.nextDriveBy=1e4;ship.drive=null;
 }
}
function stageSurvivors(s,target){
 let i=0;
 for(const ship of s.vanduls)if(ship!==target)
  Object.assign(ship,{x:680+i++*130,y:1000,vx:0,vy:0,nextDriveBy:1e4,nextLaser:1e4,drive:null});
}
function fry(q,target,kill){
 stageSurvivors(q.inspect(),target);
 return finish(q,125+210*(kill%4),290+140*Math.floor(kill/4),target);
}
async function goToWaveFour(opts={}){
 const q=await run(false,true,opts);
 for(let killed=0;killed<3;killed++){
  const s=q.inspect();
  assert.equal(s.duelWave,killed+1);assert.equal(s.vanduls.length,1);
  fry(q,s.vandul,killed);
  assert.equal(q.inspect().duelCountdown,3,'one full inter-wave countdown');
  waitFor(q,s=>s.vandul);
 }
 assert.equal(q.inspect().duelWave,4);return q;
}

test('ten real kills across six waves give the reward once and visibly depart, without any wave seven',async()=>{
 let credits=0;const visits=[];
 const q=await goToWaveFour({fieldSeed:836,address:{search:'?launch=vandul',replace:url=>visits.push(url)},
  pilotCredits:{awardVictory(){credits++;return {saved:true,amount:20,balance:40};}}});
 const {p,cones,asteroids}=q.inspect();
 Object.assign(q.sprites[0],{complete:true,naturalWidth:480,naturalHeight:320});
 p.hp=14;
 const tracked=[];
 for(const [wave,total] of [[4,2],[5,2],[6,3]]){
  const s=waitFor(q,s=>{
   quiet(s);
   assert.ok(s.vanduls.length<=total);
   assert.ok(s.waveAdmitted<=total);
   assert.equal(s.duelWave,wave);
   if(s.vandulIngress){
    assert.ok(s.vanduls.every(ship=>Math.hypot(ship.x-s.vandulIngress.x,ship.y-s.vandulIngress.y)>ship.r+20),
     'next ingress never crosses an admitted ship');
   }
   return s.vanduls.length===total;
  });
  const group=Array.from(s.vanduls);
  assert.ok(group.every(e=>e.hp===20&&e.stacks.length===0&&e.bonus===0));
  assert.equal(new Set(group.map(e=>e.driveSeed)).size,total);
  assert.equal(new Set(group.map(e=>e.slot)).size,total);
  assert.equal(new Set(group.map(e=>e.orbitPhase)).size,total);
  assert.ok(group.every((a,ia)=>group.every((b,ib)=>ia===ib||Math.hypot(a.x-b.x,a.y-b.y)>=a.r+b.r-.05)));
  assert.match(q.el['vandul-duel-readout'].textContent,new RegExp(total+'/'+total+' Vandul remaining'));
  for(const [index,ship] of group.entries()){
   const before=q.inspect().duelKills;
   tracked.push(fry(q,ship,before).w);
   const now=q.inspect();
   assert.equal(now.duelKills,before+1);
   assert.equal(now.duelWave,wave);
   assert.equal(now.p,p);assert.equal(p.hp,14);
   assert.equal(now.cones,cones);assert.equal(now.asteroids,asteroids);
   if(index<total-1){
    assert.equal(now.duelResult,null);
    assert.equal(now.duelCountdown,0);
    assert.equal(now.vanduls.length,total-index-1);
    assert.match(q.el['vandul-duel-readout'].textContent,new RegExp((total-index-1)+'/'+total+' Vandul remaining'));
   }
  }
  if(wave<6){
   assert.equal(credits,0,'no reward while the mission is unfinished');
   assert.equal(q.inspect().duelResult,'won');assert.equal(q.inspect().duelCountdown,3);
   waitFor(q,s=>s.vandul&&s.duelWave===wave+1);
  }
 }
 let s=q.inspect();
 assert.equal(s.duelKills,10);assert.equal(s.duelResult,'victory');
 assert.equal(s.duelCountdown,0);assert.equal(s.vandulIngress,null);assert.equal(s.vanduls.length,0);
 assert.equal(s.vandulLasers.length,0);assert.equal(s.shots.length,0);
 assert.ok(q.graphs.length>0&&q.graphs.every(graph=>graph.state==="closed"),"flight audio stops on success");
 assert.equal(s.state,'depart');assert.equal(q.el.overlay.hidden,false);assert.equal(credits,1);
 assert.match(q.el.overlay.innerHTML,/Mission Complete · \+20 credits/);
 assert.match(q.el['vandul-duel-readout'].textContent,/Mission Complete · 6 waves cleared.*14\/20 HP.*Kills 10/);
 assert.equal(q.el['vandul-countdown'].hidden,true);
 assert.deepEqual(Array.from(s.activeWrecks),tracked.slice(-3));assert.ok(s.wreckLayer?.fills>40);
 const stable=[p.x,p.y,p.hp],shotCount=s.practiceShots,dep=s.missionDeparture;
 q.key('keydown','KeyA');q.click('fire-button');q.reset();q.step(32);
 assert.deepEqual([p.x,p.y,p.hp],stable);assert.equal(q.inspect().practiceShots,shotCount);
 assert.equal(q.inspect().missionDeparture,dep);assert.equal(dep.flying,false);assert.deepEqual(visits,[]);
 let sawVisibleCraft=false;
 for(let f=0;f<139&&!dep.done;f++){
  q.spriteFrames.length=0;q.step();
  const latest=q.inspect();
  assert.equal(latest.duelWave,6);assert.equal(latest.vanduls.length,0);
  assert.equal(latest.vandulIngress,null);assert.equal(latest.duelCountdown,0);
  if(dep.flying&&!dep.done){
   const rendered=q.spriteFrames.find(f=>f.asset===q.sprites[0]);
   if(rendered&&rendered.translation[1]<latest.camera.y+latest.camera.h-15)sawVisibleCraft=true;
   assert.equal(q.el.overlay.hidden,true);
  }
 }
 s=q.inspect();
 assert.ok(sawVisibleCraft,'player is drawn visibly during the cinematic');
 assert.ok(dep.craft.y>s.camera.y+s.camera.h+50,'whole fighter flies below the visible camera');
 assert.equal(s.state,'complete');assert.equal(s.duelResult,'victory');
 assert.deepEqual(Array.from(s.activeWrecks),tracked.slice(-3),'preserve wrecks until actual departure');
 assert.deepEqual(visits,['./carrier.html']);assert.equal(credits,1);
 q.step(750);assert.deepEqual(visits,['./carrier.html']);assert.equal(credits,1);
});

test('no wave completes when the first enemy dies while a second is still inbound',async()=>{
 const q=await goToWaveFour(),first=q.inspect().vandul;
 assert.equal(q.inspect().waveAdmitted,1);
 fry(q,first,3);
 let s=q.inspect();
 assert.equal(s.duelResult,null);assert.equal(s.duelCountdown,0);assert.equal(s.vanduls.length,0);
 assert.equal(s.duelWave,4);assert.equal(s.duelKills,4);
 assert.match(q.el['vandul-duel-readout'].textContent,/1\/2 Vandul remaining.*1 inbound/);
 const next=waitFor(q,s=>s.vandul).vandul;
 assert.equal(next.slot,2);
 assert.notEqual(next,first);assert.equal(next.hp,20);
 assert.equal(next.laserIndex,0);assert.equal(next.bonus,0);
 assert.equal(next.nextLaser-q.inspect().duelClock,q.inspect().vandulProfile.laser.grace);
 fry(q,next,4);
 assert.equal(q.inspect().duelResult,'won');assert.equal(q.inspect().duelCountdown,3);
});

test('in a pair, earliest actual hull alone takes spread, lasers retain exact owner, and loss cancels all',async()=>{
 const q=await goToWaveFour();
 const s=waitFor(q,now=>{quiet(now);return now.vanduls.length===2;});
 const [a,b]=s.vanduls,{p,cones}=s;
 cones.splice(0);
 Object.assign(p,{x:430,y:1120,aim:-Math.PI/2,vx:0,vy:0});
 Object.assign(a,{x:430,y:1050,vx:0,vy:0});
 Object.assign(b,{x:430,y:990,vx:0,vy:0});
 q.click('fire-button');waitFor(q,()=>a.hp<20,18);
 assert.equal(a.hp,15);assert.equal(b.hp,20,'not the second hull along the projectile path');
 assert.equal(a.bonus,1);assert.equal(b.bonus,0);
 const next=q.inspect().duelClock+.02;
 a.nextLaser=next;b.nextLaser=next+.012;
 q.step(4);
 const emitted=q.inspect().vandulLasers;
 assert.equal(emitted.find(bolt=>bolt.owner===a)?.bonus,1);assert.equal(emitted.find(bolt=>bolt.owner===b)?.bonus,0);
 fry(q,a,3);
 assert.equal(q.inspect().vandulLasers.some(l=>l.owner===a),false);
 assert.equal(q.inspect().vandulLasers.some(l=>l.owner===b),true,'other actor retains its laser');
 assert.equal(q.inspect().vanduls[0],b);
 p.hp=2;Object.assign(p,{x:475,y:1120,vx:0,vy:0});
 q.inspect().vandulLasers.push({x:p.x,y:p.y-38,vx:0,vy:5200,a:Math.PI/2,life:1,damage:2,owner:b});
 q.step(2);
 assert.equal(q.inspect().state,'disabled');assert.equal(q.inspect().duelResult,'lost');
 assert.equal(q.inspect().vanduls.length,0);assert.equal(q.inspect().vandulLasers.length,0);
 q.step(750);assert.equal(q.inspect().duelWave,4);assert.equal(q.inspect().vandulIngress,null);
 q.choose('main-menu');q.choose('practice');q.step(750);
 assert.equal(q.inspect().state,'play');assert.equal(q.inspect().vandulIngress,null);assert.equal(q.inspect().vanduls.length,0);
});

test('default cover still admits the fourth-wave pair in short, separate safe lanes',async()=>{
 const q=setup({saved:'ballistic',fieldSeed:836});q.choose('start');await tick();
 let s=waitFor(q,s=>s.vandul);
 assert.ok(s.asteroids.length>=3&&s.asteroids.length<=7);assert.equal(s.cones.length,8);
 for(let k=0;k<3;k++){
  fry(q,s.vandul,k);
  Object.assign(s.p,{x:480,y:1160,vx:0,vy:0});
  s=waitFor(q,s=>s.vandul);
 }
 assert.equal(s.duelWave,4);assert.equal(s.vanduls.length,1);
 const firstLane=s.vandul.x;
 const ingress=waitFor(q,s=>s.vandulIngress,22).vandulIngress;
 const frozen=[ingress.x,ingress.y];
 q.key('keydown','KeyP');q.step(200);assert.deepEqual([ingress.x,ingress.y],frozen);
 q.choose('resume');q.step();assert.deepEqual([ingress.x,ingress.y],frozen);
 s=waitFor(q,s=>{
  if(s.vandulIngress&&!s.vandulIngress.waiting){
   for(const body of [...s.vanduls,...s.asteroids,...s.sceneryDebris,...s.cones])
    assert.ok(Math.hypot(body.x-ingress.x,body.y-ingress.y)>body.r+20,'no approach contact');
  }
  return s.vanduls.length===2;
 },216);
 assert.ok(Math.abs(firstLane-s.vanduls[1].x)>=64,'reserved lanes are genuinely distinct');
 assert.equal(s.vandulIngress,null);
 assert.equal(q.el['vandul-countdown'].hidden,true);
 assert.ok(s.vanduls[1].nextLaser-s.duelClock>.94,'second arrival has its own full grace');
});
