import {test} from 'node:test';
import assert from 'node:assert/strict';
import {openCorsair,corsairMarker,tickCorsair,admitCorsair,inputCorsair,leaveCorsair,corsairView} from '../server/corsair-event.mjs';
const start=57000,sector='reach',x=365,y=1160,pegasus='rift-carrier',hull='rift-fighter';
const open=twoCarriers=>openCorsair({startedAt:start,sector,x,y,twoCarriers});
const ticket=(e,pilot,origin=pegasus)=>({pilot,hull,origin,eventId:e.id,verified:true});
const cmd=(e,seq,more={})=>({eventId:e.id,seq,turn:0,thrust:0,strafe:0,fire:false,...more});
test('two Pegasus pilots see one Galaxy event, both ships, one pirate force and one timer',()=>{
 const e=open();
 assert.deepEqual(corsairMarker(e,start).joinable,[pegasus]);
 assert.equal(admitCorsair(e,ticket(e,'bifrost-pilot','bifrost'),start),null);
 assert.equal(admitCorsair(e,{...ticket(e,'bad'),verified:false},start),null);
 const a=admitCorsair(e,ticket(e,'atlas'),start),b=admitCorsair(e,ticket(e,'nova'),start);
 assert.notEqual(a.self,b.self);assert.equal(a.event.id,b.event.id);
 assert.equal(b.state.ships.filter(s=>!s.npc).length,2);
 assert.deepEqual(e.model.pirates.length,3);
 const aa=inputCorsair(e,'atlas',cmd(e,1,{fire:true}),start);
 const bb=inputCorsair(e,'nova',cmd(e,1,{fire:true}),start+100);
 assert.equal(aa.event.id,bb.event.id);assert.equal(bb.event.elapsedMs,100);
 assert.ok(bb.state.ships.some(s=>s.id===a.self));assert.notEqual(bb.state.shots.length,0);
 for(const p of e.model.pirates)p.hp=0;
 tickCorsair(e,start+200);
 const final=corsairView(e,'atlas',start+200);
 assert.equal(final.settlement.result,'victory');
 assert.deepEqual(final.settlement,corsairView(e,'nova',start+300).settlement);
 assert.equal(admitCorsair(e,ticket(e,'late'),start+500),null);
 tickCorsair(e,start+800000);assert.deepEqual(e.settlement,final.settlement);
});
test('the optional Bifrost rollout joins the same event from a distinct fleet approach',()=>{
 const e=open(true),a=admitCorsair(e,ticket(e,'atlas'),start),b=admitCorsair(e,ticket(e,'ember','bifrost'),start);
 assert.equal(a.event.id,b.event.id);
 assert.notEqual(b.state.ships.find(s=>s.id===a.self).x,b.state.ships.find(s=>s.id===b.self).x);
 assert.equal(admitCorsair(e,ticket(e,'atlas','bifrost'),start),null);
});
test('NPC combat advances without a human connection',()=>{
 const e=open();
 tickCorsair(e,start+59_000);
 assert.equal(e.settlement,null);assert.equal(e.model.wingmates.length,0);
 tickCorsair(e,start+65_000);
 assert.ok(e.model.tick>100);
 assert.equal(e.model.wingmates.length,2);
 assert.equal(corsairMarker(e,start+65_000).players,0);
 assert.ok(e.model.shotId>0);
 assert.ok(e.model.pirates.some(s=>s.hp<s.maxHp)||e.model.wingmates.some(s=>s.hp<s.maxHp));
});
test('leaving starts one countdown; rejoin restores the same seat, then final departure closes once',()=>{
 const e=open(),a=admitCorsair(e,ticket(e,'atlas'),start),b=admitCorsair(e,ticket(e,'nova'),start);
 leaveCorsair(e,'atlas',start+100);
 assert.equal(e.withdrawalAt,null);
 leaveCorsair(e,'nova',start+200);
 assert.equal(e.withdrawalAt,start+120200);
 const returned=admitCorsair(e,ticket(e,'atlas'),start+250);
 assert.equal(returned.self,a.self);assert.equal(e.withdrawalAt,null);
 assert.ok(!returned.state.ships.some(s=>s.id===b.self));
 assert.equal(inputCorsair(e,'atlas',{...cmd(e,1),eventId:'another-event'},start+250),null);
 // Isolate the withdrawal path from an NPC victory/defeat in this timer test.
 for(const ship of e.model.pirates)Object.assign(ship,{x:25,y:25,ready:Infinity});
 e.npcWaveSent=true;
 for(const ship of e.model.wingmates)Object.assign(ship,{x:1750,y:2250,ready:Infinity,hp:999});
 leaveCorsair(e,'atlas',start+300);
 tickCorsair(e,start+120299);assert.equal(e.settlement,null);
 tickCorsair(e,start+120300);assert.deepEqual(e.settlement,{id:e.id,result:'withdrawn',at:start+120300});
});
test('competing event opens and concurrent joins persist one occurrence and one immutable settlement',async t=>{
 const {readFileSync}=await import('node:fs'),{DatabaseSync}=await import('node:sqlite');
 const {corsairStore}=await import('../server/corsair-event-store.mjs');
 const sql=new DatabaseSync(':memory:');t.after(()=>sql.close());
 sql.exec(readFileSync(new URL('../migrations/011_galaxy_corsair.sql',import.meta.url),'utf8'));
 const store=corsairStore({prepare(q){
  const s=sql.prepare(q);return {first:async()=>s.get()??null,bind(...v){
   return {first:async()=>s.get(Object.fromEntries(v.map((val,i)=>[i+1,val])))??null};
  }};
 }});
 const [e,same]=await Promise.all([store.open({startedAt:start,sector,x,y}),store.open({startedAt:start+100,sector,x,y})]);
 assert.equal(e.id,same.id);
 await Promise.all(['atlas','nova'].map(pilot=>store.change(e.id,d=>admitCorsair(d,ticket(d,pilot),start+200))));
 const full=await store.get(e.id);assert.equal(full.model.players.length,2);
 const defeatPirates=d=>{for(const p of d.model.pirates)p.hp=0;tickCorsair(d,start+400);};
 const [a,b]=await Promise.all([store.change(e.id,defeatPirates),store.change(e.id,defeatPirates)]);
 assert.deepEqual(a.settlement,b.settlement);assert.equal(a.settlement.result,'victory');
 assert.equal(await store.active(),null);
 const sameFinished=await store.open({startedAt:start,sector,x,y});
 assert.deepEqual(sameFinished.settlement,a.settlement);
});
test('two player-controlled ships fire in one battle and the pirate formation takes damage',()=>{
 const e=open();const atlas=admitCorsair(e,ticket(e,'atlas'),start),nova=admitCorsair(e,ticket(e,'nova'),start);
 const shooters=new Set(),pirateStart=e.model.pirates.reduce((n,p)=>n+p.hp,0);
 for(let i=1;i<100&&!e.settlement&&shooters.size<2;i++){
  const now=start+i*100;
  for(const name of ['atlas','nova']){
   const self=e.model.players.find(p=>p.pilot===name).ship;
   const target=e.model.pirates.filter(p=>p.hp>0).sort((a,b)=>Math.hypot(a.x-self.x,a.y-self.y)-Math.hypot(b.x-self.x,b.y-self.y))[0];
   if(!target)break;
   const dx=target.x-self.x,dy=target.y-self.y,delta=Math.atan2(dy,dx)-self.heading;
   inputCorsair(e,name,cmd(e,i,{turn:Math.max(-1,Math.min(1,Math.atan2(Math.sin(delta),Math.cos(delta))/.14)),
    thrust:Math.hypot(dx,dy)>470?.8:0,fire:true}),now);
   for(const shot of e.model.shots)if(shot.owner===atlas.self||shot.owner===nova.self)shooters.add(shot.owner);
  }
 }
 assert.equal(shooters.size,2);
 tickCorsair(e,e.model.at+1500);
 assert.ok(e.model.pirates.reduce((n,p)=>n+p.hp,0)<pirateStart);
});
