'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {setup,tick}=require('./ballistic.test.cjs');
const weaponFit=(primary,secondary)=>JSON.stringify({version:1,primary,secondary});
const engineFit=engine=>JSON.stringify({version:1,engine});
const cap=(weight,rating)=>rating*22.2*(106/weight)**.95,handling=weight=>(106/weight)**2.15;
const approx=(x,y,tol=1e-8)=>assert.ok(Math.abs(x-y)<=tol,`${x} near ${y} within ${tol}`);
async function ready(q){
 q.choose('practice');await tick();q.step();q.inspect().cones.splice(0);return q.inspect().p;
}
const fitStat=(q,id)=>q.el[id].textContent;
test('mass and engine strength independently change thrust, reversal and braking, and fitted speed without changing engine rating',async()=>{
 const q0=setup(),qh=setup({savedFit:weaponFit('ak77','ballistic')}),qw=setup(),qt=setup({savedEngine:engineFit('test-thruster')});
 // Isolate strength by holding the engine choice, mass and speed rating fixed.
 qw.inspect().engineProfiles['stock-thruster'].strength=7;
 const [stock,heavy,weak,light]=await Promise.all([q0,qh,qw,qt].map(ready));
 assert.equal(stock.weight,106);assert.equal(stock.speed,222);assert.equal(stock.acceleration,1750);assert.equal(stock.brakeDamping,2.8);
 assert.equal(heavy.weight,110);approx(heavy.speed,cap(110,10));approx(heavy.acceleration,1750*handling(110));approx(heavy.brakeDamping,2.8*handling(110));
 assert.equal(weak.weight,106);assert.equal(weak.speed,222);approx(weak.acceleration,1750*.7);approx(weak.brakeDamping,2.8*.7);
 assert.equal(light.weight,100);approx(light.speed,cap(100,5));approx(light.acceleration,1750*.7*handling(100));approx(light.brakeDamping,2.8*.7*handling(100));
 assert.ok(heavy.invMass<stock.invMass);assert.equal(weak.invMass,stock.invMass);assert.ok(light.invMass>weak.invMass);
 assert.match(fitStat(qt,'fit-weight-stat'),/Total weight 100/);
 assert.equal(fitStat(qt,'fit-engine-stat'),'Speed rating 5 · Rated 111 u/s · Strength 7 · Weight 14 · Fitted forward 117 u/s');
 const pairs=[[q0,stock],[qh,heavy],[qw,weak],[qt,light]];
 function move(code,frames,vx){
  for(const [q,p] of pairs){
   Object.assign(p,{x:470,y:880,vx,vy:0,aim:0});
   if(code)q.key('keydown',code);q.step(frames);if(code)q.key('keyup',code);
  }
  return pairs.map(([,p])=>p.vx);
 }
 const [sStart,hStart,wStart,tStart]=move('KeyD',3,0);
 approx(sStart,1750*.048);assert.ok(sStart>hStart&&hStart>tStart&&tStart>wStart);
 const [sRev,hRev,wRev,tRev]=move('KeyA',6,125);
 approx(sRev,125-1750*.62*.096);assert.ok(sRev<hRev&&hRev<tRev&&tRev<wRev);
 const [sStop,hStop,wStop,tStop]=move(null,22,100);
 approx(sStop,100*Math.exp(-2.8*.352));assert.ok(sStop<hStop&&hStop<tStop&&tStop<wStop);
 const [sMax,hMax,wMax,tMax]=move('KeyD',26,0);
 const maxima=[222,cap(110,10),222,cap(100,5)];
 [sMax,hMax,wMax,tMax].forEach((v,i)=>approx(v,maxima[i]));
});
test('displayed burst rates match simulation volley counts, spacing and start-to-start recovery for all mounted guns',async()=>{
 for(const [id,rounds,spacing,recovery,text] of [
  ['blaster',6,.050,.46,'Normal: manual, up to 300 RPM · Burst: 1,200 RPM in volley, ~507 RPM with cooldown'],
  ['ballistic',6,.043,.46,'Normal: up to 480 RPM (tap or hold) · Burst: 1,395 RPM in volley, ~533 RPM with cooldown'],
  ['ak77',18,.035,1.75,'Burst only · Burst: 1,714 RPM in volley, ~461 RPM with cooldown']
 ]){
  const q=setup({saved:id,savedFit:weaponFit(id,null)});
  await ready(q);
  assert.ok(fitStat(q,'fit-primary-stat').endsWith(text));
  assert.ok(fitStat(q,'fit-pick-'+id+'-summary').endsWith(text));
  if(id!=='ak77'){
   const select=()=>q.click('gun-'+id,{detail:1,pointerType:'touch',pointerId:20});
   select();q.step(4);select();
  }
  q.click('fire-button');
  assert.equal(q.inspect().practiceShots,1,'first shot is immediate');
  const times=[0];let frame=0;
  while(q.inspect().fireBurst||q.inspect().burstCooldown>0){
   const before=q.inspect().practiceShots;
   q.step();frame++;const after=q.inspect().practiceShots;
   assert.ok(frame<180,'volley and cooldown are finite');
   if(after>before)times.push(frame*.016);
   if(q.inspect().fireBurst||q.inspect().burstCooldown>0){
    q.click('fire-button');assert.equal(q.inspect().practiceShots,after,'no extra shot before next allowed volley');
   }
  }
  assert.equal(times.length,rounds);
  for(let i=1;i<rounds;i++)approx(times[i],i*spacing,.0162);
  approx(frame*.016,(rounds-1)*spacing+recovery,.033);
  q.click('fire-button');assert.equal(q.inspect().practiceShots,rounds+1,'manual trigger allowed immediately after cooldown');
 }
});
test('Normal minimum intervals guard manual and held fire; no skipped frames or re-press bypass',async()=>{
 for(const [id,frames] of [['blaster',13],['ballistic',8]]){
  const q=setup({saved:id});await ready(q);
  q.click('fire-button');assert.equal(q.inspect().practiceShots,1);
  for(let i=1;i<frames;i++){
   q.step();q.click('fire-button');
   assert.equal(q.inspect().practiceShots,1,'reject every early repeat without a projectile');
  }
  q.step();q.click('fire-button');assert.equal(q.inspect().practiceShots,2);
 }
 const q=setup({saved:'ballistic'});await ready(q);
 q.pointer('pointerdown',21);assert.equal(q.inspect().practiceShots,1);
 q.pointer('pointerup',21);q.pointer('pointerdown',22);assert.equal(q.inspect().practiceShots,1);
 for(let i=1;i<=3;i++){
  q.step(7);assert.equal(q.inspect().practiceShots,i);
  q.step();assert.equal(q.inspect().practiceShots,i+1);
 }
 q.pointer('pointerup',22);q.step(20);assert.equal(q.inspect().practiceShots,4);
});
