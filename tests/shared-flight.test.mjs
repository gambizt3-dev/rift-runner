import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import vm from 'node:vm';
import {handleFighterParking} from '../server/fighter-parking.mjs';
import {handleSharedFlight,tickSharedFlightRoster,SHARED_FLIGHT_PATH as path} from '../server/shared-flight.mjs';
const host='https://rift-runner.gambizt3.workers.dev',site='https://rift-runner.boundlessghost16.chatgpt.site';
const hull='rift-fighter',pegasus='rift-carrier',bifrost='bifrost';
function fixture(t){
 let now=Date.parse('2026-11-24T14:30:00Z');
 const db=new DatabaseSync(':memory:');
 t.after(()=>db.close());
 for(const migration of ['006_fighter_parking','008_shared_flight','010_corsair_test']){
  const sql=readFileSync(new URL('../migrations/'+migration+'.sql',import.meta.url),'utf8');db.exec(sql);db.exec(sql);
 }
 const env={GALAXY_DB:{prepare(q){
  const stmt=db.prepare(q);
  const first=async (...a)=>stmt.get(...(a.length?[Object.fromEntries(a.map((v,i)=>[i+1,v]))]:[]))??null;
  return {first,bind(...args){return {first:()=>first(...args)};}};
 }}};
 const shared=r=>handleSharedFlight(r,env,()=>now);
 async function pilot(n,vessel,initial=true,pilotHull=hull){
  const bearer=n.toString(16).padStart(64,'0'),auth={Authorization:'Bearer '+bearer,'Content-Type':'application/json',origin:site};
  const s=new Map([['rift-runner.fighter-parking-access.v1',JSON.stringify({generation:null,bearer})]]);
  const calls=[];
  const win={location:{hostname:new URL(site).hostname},localStorage:{getItem:k=>s.get(k)??null},async fetch(url,opts){
   calls.push([url,opts]);return shared(new Request(url,{...opts,headers:{...opts.headers,origin:url.includes('/corsair-test/')?host:site}}));
  }};
  vm.runInNewContext(readFileSync(new URL('../dist/rift-multiplayer.js',import.meta.url),'utf8'),{window:win});
  const park=(v,expectedRevision=0)=>handleFighterParking(new Request(host+'/api/fighter-parking/'+pilotHull,{
   method:'PUT',headers:auth,body:JSON.stringify({vessel:v,expectedRevision})}),env);
  if(initial)assert.equal((await park(vessel)).status,200);
  const input=(seq,extra={})=>({seq,turn:0,thrust:0,strafe:0,fire:false,...extra});
  return {auth,bearer,vessel,calls,park,corsair:win.RiftMultiplayer.corsair,info:()=>win.RiftMultiplayer.info(),join:(side,d=vessel,mode)=>win.RiftMultiplayer.join(d,hull,side,mode),
   step:(seq,extra)=>win.RiftMultiplayer.step(vessel,hull,input(seq,extra)),
   raw:(endpoint,body)=>shared(new Request(host+path+'/'+endpoint,{method:'POST',headers:auth,body:JSON.stringify(body)}))};
 }
 return {db,pilot,advance:ms=>{now+=ms},scheduled:()=>tickSharedFlightRoster(env,now)};
}
test('three distinct berth-backed pilots share one round; two allies see the same human opposition, which cannot change sides mid-round',async t=>{
 const f=fixture(t);
 const [a,b,c]=await Promise.all([f.pilot(1,pegasus),f.pilot(2,bifrost),f.pilot(3,bifrost)]);
 assert.deepEqual((await a.info()).battle.sides,['allies','opposition']);
 assert.equal((await a.info()).battle.status,'open');
 const joined=await Promise.all([a.join('allies'),b.join('allies'),c.join('opposition')]);
 assert.ok(joined.every(Boolean));
 assert.equal(new Set(joined.map(j=>j.state.instance)).size,1);
 assert.equal(new Set(joined.map(j=>j.self)).size,3);
 assert.equal((await c.join('allies')),null);
 const ready=await Promise.all([a.step(1),b.step(1),c.step(1)]);
 for(const r of ready){
  const human=joined.map(j=>r.state.ships.find(s=>s.id===j.self));
  assert.deepEqual(human.map(s=>s.team),['ally','ally','pirate']);
  assert.ok(!JSON.stringify(r).includes(c.bearer));
 }
 assert.equal((await a.join('allies')).lastSeq,1);
 assert.equal((await a.info()).battle.status,'running');
 assert.equal(a.calls[0][1].headers,undefined);
 assert.equal(a.calls.at(-2)[1].credentials,'omit');
});
test('opposing players apply server-simulated hits and share the same hull HP and shot coordinates; steps cannot invent damage',async t=>{
 const f=fixture(t);
 const [a,b]=await Promise.all([f.pilot(4,bifrost),f.pilot(5,bifrost)]);
 const [ally,pirate]=await Promise.all([a.join('allies',bifrost,'solo'),b.join('opposition')]);
 // Isolate the two human pilots: only the opposition pilot can originate damage.
 const row=f.db.prepare("SELECT model FROM rift_shared_flight").get();
 const model=JSON.parse(row.model);for(const ai of model.pirates)ai.hp=0;
 f.db.prepare("UPDATE rift_shared_flight SET model=?").run(JSON.stringify(model));
 // Drive both ships toward one another through real input and observe every tick;
 // steer the opponent directly toward the ally, using only public coordinates.
 let player=ally,enemy=pirate;
 const steer=(self,target)=>Math.max(-1,Math.min(1,Math.atan2(Math.sin(Math.atan2(target.y-self.y,target.x-self.x)-self.heading),Math.cos(Math.atan2(target.y-self.y,target.x-self.x)-self.heading))/.14));
 let opponentShot=false,didDamage=false;
 for(let i=1;i<=67;i++){
  const p=player.state.ships.find(s=>s.id===ally.self),o=enemy.state.ships.find(s=>s.id===pirate.self);
  f.advance(100);
  enemy=await b.step(i,{turn:steer(o,p),thrust:1,fire:true});
  player=await a.step(i);
  assert.equal(player.state.tick,enemy.state.tick);
  assert.deepEqual(player.state.shots,enemy.state.shots);
  assert.deepEqual(player.state.ships.map(s=>s.hp),enemy.state.ships.map(s=>s.hp));
  if(enemy.state.shots.some(s=>s.team==='pirate'&&s.y<1000))opponentShot=true;
  if(opponentShot&&player.state.ships.find(s=>s.id===ally.self).hp<24){didDamage=true;break;}
 }
 assert.ok(opponentShot&&didDamage);
 const bad=await a.raw('step',{vessel:bifrost,hull,instance:ally.state.instance,seq:68,turn:0,thrust:0,strafe:0,fire:false,hp:10000});
 assert.equal(bad.status,400);
});
test('match reset rejects delayed writes and a vessel moved out from under the authenticated berth',async t=>{
 const f=fixture(t),a=await f.pilot(6,pegasus),other=await f.pilot(7,bifrost,false);
 assert.equal(await other.join('opposition'),null);
 assert.equal(await a.join('allies',bifrost),null);
 const round=await a.join('allies');
 assert.equal((await a.step(1,{thrust:1})).lastSeq,1);
 assert.equal((await a.step(2,{thrust:1})).lastSeq,1);
 f.advance(100);
 assert.equal((await a.step(2,{thrust:1})).lastSeq,2);
 f.advance(610000);
 assert.equal((await a.step(3)).state.status,'complete');
 const next=await a.join('allies');
 assert.notEqual(next.state.instance,round.state.instance);
 assert.equal((await a.raw('step',{vessel:pegasus,hull,instance:round.state.instance,seq:4,turn:0,thrust:0,strafe:0,fire:false})).status,409);
 assert.equal((await a.park(bifrost,1)).status,200);
 assert.equal(await a.step(1),null);
});
test('per-side capacity is fixed and enforced even on concurrent admissions',async t=>{
 const f=fixture(t),players=await Promise.all([10,11,12,13,14].map(n=>f.pilot(n,pegasus)));
 const r=await Promise.all(players.map(p=>p.join('allies')));
 assert.equal(r.filter(Boolean).length,4);
 const pirate=await f.pilot(15,bifrost);assert.ok(await pirate.join('opposition'));
});
test('disconnected pilots release seats and completed rounds reopen after debrief',async t=>{
 const f=fixture(t);
 const [a,b,c,d,e]=await Promise.all([20,21,22,23,24].map(n=>f.pilot(n,pegasus)));
 const joined=await Promise.all([a,b,c,d].map(p=>p.join('allies')));
 assert.ok(joined.every(Boolean));assert.equal(await e.join('allies'),null);
 f.advance(31000);
 const fresh=await e.join('allies');
 assert.equal(fresh.state.instance,joined[0].state.instance);
 assert.equal(fresh.state.ships.filter(s=>s.team==='ally'&&!s.npc).length,1);
 assert.equal(await a.step(1),null);
 const row=f.db.prepare("SELECT model FROM rift_shared_flight").get(),model=JSON.parse(row.model);
 model.players[0].ship.hp=0;
 for(const npc of model.wingmates)npc.hp=0;
 f.db.prepare("UPDATE rift_shared_flight SET model=?").run(JSON.stringify(model));
 f.advance(100);
 assert.equal((await e.step(1)).state.status,'complete');
 assert.equal((await e.info()).battle.status,'complete');
 assert.equal(await a.join('allies'),null);
 f.advance(13000);
 assert.equal((await e.info()).battle.status,'open');
 assert.notEqual((await a.join('allies')).state.instance,fresh.state.instance);
});
test('Private pilot property is never used to exceed scarce carrier fighters; surviving NPC keeps identity after 24 hours',async t=>{
 const f=fixture(t);
 const [a,b,c,d]=await Promise.all([f.pilot(31,pegasus),f.pilot(32,pegasus),f.pilot(33,pegasus),f.pilot(34,bifrost)]);
 assert.equal((await a.join('allies',pegasus,'solo')).wingmatesAssigned,0);
 const read=()=>JSON.parse(f.db.prepare("SELECT model FROM rift_shared_flight").get().model);
 const write=model=>f.db.prepare("UPDATE rift_shared_flight SET model=?").run(JSON.stringify(model));
 const seed=read();seed.carrierStock[pegasus]=1;write(seed);
 const [one,two]=await Promise.all([b.join('allies',pegasus,'wingmen'),c.join('allies',pegasus,'fleet')]);
 assert.equal(one.wingmatesAssigned+two.wingmatesAssigned,1);
 const model=read(),dead=model.wingmates.find(w=>w.vessel===pegasus),original=model.roster.find(n=>n.vessel===pegasus&&n.slot===dead.rosterId).generation;
 assert.equal(model.wingmates.filter(w=>w.vessel===pegasus).length,1);
 dead.hp=0;write(model);
 f.advance(100);await a.step(1);
 const down=read();
 assert.equal(down.carrierStock[pegasus],0);
 assert.equal(down.carrierStock[bifrost],20);
 assert.equal(down.roster.find(n=>n.vessel===pegasus&&n.slot===dead.rosterId).generation,original);
 assert.deepEqual((await a.info()).battle.roster[pegasus],{available:14,deployed:0,replenishing:1,capacity:15});
 f.advance(86400000-1);
 assert.equal((await a.info()).battle.roster[pegasus].replenishing,1);
 f.advance(1);
 assert.equal((await a.info()).battle.roster[pegasus].replenishing,0);
 const empty=await d.join('allies',bifrost,'solo');
 const noHull=await a.join('allies',pegasus,'fleet');
 assert.notEqual(noHull.state.instance,one.state.instance);
 assert.equal(noHull.wingmatesAssigned,0);
 const resupplied=read();resupplied.carrierStock[pegasus]=1;write(resupplied);
 const recovered=await b.join('allies',pegasus,'wingmen');
 assert.equal(recovered.wingmatesAssigned,1);
 assert.ok(recovered.state.ships.some(s=>s.npc&&s.id===dead.id));
 assert.equal(read().carrierStock[pegasus],1);
 assert.equal(f.db.prepare("SELECT COUNT(*) AS n FROM rift_fighter_parking").get().n,4);
 assert.ok(empty);
});
test('scheduled autonomous battle is unique per window, shares same instance with real pilots and expires without another X',async t=>{
 const f=fixture(t),a=await f.pilot(51,pegasus);
 assert.equal((await a.info()).battle.autonomous,false);
 assert.equal(await f.scheduled(),true);
 const active=(await a.info()).battle;
 assert.equal(active.autonomous,true);
 assert.equal(await f.scheduled(),false);
 const joined=await a.join('allies',pegasus,'solo');
 assert.equal(joined.state.instance,active.instance);
 assert.equal(joined.state.ships.filter(s=>s.npc&&s.team==='ally').length,2);
 f.advance(360001);await f.scheduled();
 assert.equal((await a.info()).battle.autonomous,false);
 assert.equal(await f.scheduled(),false);
});
test('autonomous rounds advance real firing and hull damage via the scheduler with no browser battle inputs',async t=>{
 const f=fixture(t);
 assert.equal(await f.scheduled(),true);
 const read=()=>JSON.parse(f.db.prepare("SELECT model FROM rift_shared_flight").get().model);
 const launch=read();
 assert.equal(launch.tick,0);
 assert.equal(launch.players.length,0);
 f.advance(300000);
 assert.equal(await f.scheduled(),true);
 const later=read();
 assert.ok(later.tick>0&&later.tick<=180);
 assert.ok(later.shotId>0);
 assert.ok([...later.pirates,...later.wingmates].some(s=>s.hp<s.maxHp));
 f.advance(301000);await f.scheduled();
 const finish=read();
 assert.equal(finish.status,'complete');
 assert.ok(finish.roster.every(p=>!p.lease));
});
test('legacy two-slot rosters expand on reads and persist once without resetting leases, casualties, or carrier stock',async t=>{
 const f=fixture(t),a=await f.pilot(61,pegasus);
 const round=await a.join('allies',pegasus,'wingmen');
 const raw=()=>f.db.prepare("SELECT revision,model FROM rift_shared_flight").get();
 const legacy=JSON.parse(raw().model);
 legacy.roster=legacy.roster.filter(n=>n.slot<=2);
 const vacancy=legacy.roster.find(n=>n.vessel===pegasus&&n.slot===2);
 vacancy.generation=4;vacancy.readyAt=legacy.at+80000;
 legacy.carrierStock[pegasus]=17;delete legacy.carrierSpecialStock;
 f.db.prepare("UPDATE rift_shared_flight SET model=?").run(JSON.stringify(legacy));
 assert.deepEqual((await a.info()).battle.roster[pegasus],{available:13,deployed:1,replenishing:1,capacity:15});
 assert.deepEqual((await a.info()).battle.roster[bifrost],{available:15,deployed:0,replenishing:0,capacity:15});
 assert.equal(JSON.parse(raw().model).roster.length,4); // DB reads don't mutate
 assert.equal(await f.scheduled(),true);
 const after=raw(),expanded=JSON.parse(after.model);
 assert.equal(expanded.roster.length,30);
 assert.equal(new Set(expanded.roster.map(n=>n.vessel+':'+n.slot)).size,30);
 assert.equal(expanded.carrierStock[pegasus],17);
 assert.deepEqual(expanded.carrierSpecialStock,{[pegasus]:{'bastion-9':4,'stocky-light-fighter':4},[bifrost]:{'bastion-9':4,'stocky-light-fighter':4}});
 assert.equal(expanded.instance,round.state.instance);
 assert.deepEqual(expanded.roster.slice(0,4),legacy.roster);
 assert.equal(await f.scheduled(),false);
 assert.deepEqual(raw(),after);
});

test('Corsair uses a private-per-carrier waiting room, two distinct pilots, and shared authoritative damage',async t=>{
 const f=fixture(t),[a,b,c,d]=await Promise.all([f.pilot(901,pegasus),f.pilot(902,pegasus),f.pilot(903,bifrost),f.pilot(904,pegasus)]);
 const status=(p,v=p.vessel)=>p.corsair.status(v,hull);
 const join=(p,instance,v=p.vessel)=>p.corsair.join(v,hull,instance);
 const input=(p,seq,extra={})=>p.corsair.step(p.vessel,hull,{seq,turn:0,thrust:0,strafe:0,fire:false,...extra});
 assert.deepEqual(await status(a),{status:'open',instance:null,players:0});
 const open=await join(a,null);
 assert.ok(open.state.waiting);
 assert.equal(open.state.ships.length,4);
 assert.equal(open.state.tick,0);
 f.advance(2000);
 const noCombat=await input(a,1,{fire:true,thrust:1});
 assert.equal(noCombat.state.tick,0);assert.deepEqual(noCombat.state.shots,[]);
 assert.deepEqual(await status(b),{status:'waiting',instance:open.state.instance,players:1});
 assert.equal(await status(c,pegasus),null);
 assert.equal((await status(c)).status,'open');
 assert.equal(await join(c,open.state.instance,pegasus),null);
 assert.equal(await join(d,'11111111-1111-1111-1111-111111111111'),null);
 const want=await Promise.all([join(b,open.state.instance),join(d,open.state.instance)]);
 assert.equal(want.filter(Boolean).length,1);
 const second=want[0]?b:d,receipt=want.find(Boolean);
 assert.notEqual(receipt.self,open.self);assert.equal(receipt.state.waiting,undefined);
 assert.equal(receipt.state.ships.filter(s=>!s.npc).length,2);
 assert.equal(receipt.state.ships.filter(s=>s.npc).length,3);
 assert.ok(receipt.state.ships.filter(s=>!s.npc).every(s=>s.team==='ally'));
 let damage=false,view=receipt;
 for(let i=2;i<85;i++){
  const own=view.state.ships.find(s=>s.id===open.self),target=view.state.ships.find(s=>s.id==='pirate-core');
  const error=Math.atan2(target.y-own.y,target.x-own.x)-own.heading;
  const turn=Math.max(-1,Math.min(1,Math.atan2(Math.sin(error),Math.cos(error))/.14));
  f.advance(100);
  const shooter=view=await input(a,i,{fire:true,thrust:1,turn});
  const observer=await input(second,i);
  assert.equal(shooter.state.instance,receipt.state.instance);
  assert.deepEqual(shooter.state.ships,observer.state.ships);
  if(shooter.state.ships.some(ship=>ship.npc&&ship.hp<ship.maxHp)){damage=true;break;}
 }
 assert.ok(damage,'both clients observe the same damage from real server simulation');
 assert.equal(await join(second,null),null,'retry cannot replace a running room');
 assert.equal(f.db.prepare('SELECT count(*) AS count FROM rift_shared_flight').get().count,0,'Galaxy fight untouched');
 assert.equal(f.db.prepare('SELECT count(*) AS count FROM rift_fighter_parking').get().count,4,'no berth writes');
});

test('Corsair co-op keeps the tough Stocky and fast Bastion hull roles without changing Galaxy battle balance', async t=>{
 const f=fixture(t),stock='stocky-light-fighter',fast='bastion-9';
 const a=await f.pilot(405,pegasus,true,stock),b=await f.pilot(406,pegasus,true,fast);
 const open=await a.corsair.join(pegasus,stock,null),joined=await b.corsair.join(pegasus,fast,open.state.instance);
 const hulls=state=>state.state.ships.filter(ship=>!ship.npc);
 assert.deepEqual(hulls(joined).map(s=>s.maxHp),[26,16]);
 const commands={seq:1,turn:0,thrust:1,strafe:0,fire:false};
 await a.corsair.step(pegasus,stock,commands);
 await b.corsair.step(pegasus,fast,commands);
 f.advance(100);
 const moved=await a.corsair.step(pegasus,stock,{...commands,seq:2});
 assert.ok(hulls(moved)[1].y<hulls(moved)[0].y,'Bastion covers more ground under the same thrust');
 const old=await b.join('allies',pegasus,'solo');assert.equal(old,null,'the wrong fitted hull cannot use this berth');
 const g=await f.pilot(407,pegasus);
 const legacy=await g.join('allies',pegasus,'solo');
 assert.equal(legacy.state.ships.find(s=>s.id===legacy.self).maxHp,24,'Galaxy exercise remains distinct');
});

test('Galaxy battle closes after two minutes without action, even if the map is open',async t=>{
 const f=fixture(t),a=await f.pilot(310,pegasus);
 const first=await a.join('opposition',pegasus,'solo');
 assert.equal(first.state.status,'running');
 f.advance(119000);let b=(await a.info()).battle;
 assert.equal(b.status,'running');assert.equal(b.ageMs,119000);
 f.advance(1000);b=(await a.info()).battle;
 assert.equal(b.status,'complete');assert.equal(b.joinable,false);
 await f.scheduled();
 const model=JSON.parse(f.db.prepare('SELECT model FROM rift_shared_flight').get().model);
 assert.equal(model.closeReason,'inactive');
});
test('last Bifrost fighter away starts a resettable countdown; two minutes closes even during other activity',async t=>{
 const f=fixture(t),a=await f.pilot(311,bifrost),b=await f.pilot(312,pegasus);
 const get=()=>JSON.parse(f.db.prepare('SELECT model FROM rift_shared_flight').get().model);
 const set=x=>f.db.prepare('UPDATE rift_shared_flight SET model=?').run(JSON.stringify(x));
 await a.join('allies',bifrost,'solo');await b.join('opposition',pegasus,'solo');
 const old=(await b.info()).battle.instance;
 assert.equal((await a.raw('leave',{vessel:bifrost,hull,instance:old})).status,204);
 let m=get();assert.ok(m.bifrostAwayAt);assert.equal((await b.info()).battle.bifrostCloseInMs,120000);
 await a.join('allies',bifrost,'solo');
 m=get();assert.equal(m.bifrostAwayAt,null);
 m.bifrostAwayAt=m.at-120000;m.players=m.players.filter(p=>p.ship.vessel!==bifrost);m.lastActionAt=m.at;set(m);
 assert.equal((await b.info()).battle.status,'complete');
 m.players.find(p=>p.ship.vessel===pegasus).touchedAt=m.at;set(m);
 const round=await b.step(2,{thrust:1});
 assert.equal(round.state.closeReason,'bifrost-left');
});

test('the surviving side wins and the event closes after the last deployed enemy is disabled',async t=>{
 const f=fixture(t),a=await f.pilot(313,pegasus);
 await a.join('allies',pegasus,'solo');
 const model=JSON.parse(f.db.prepare('SELECT model FROM rift_shared_flight').get().model);
 model.pirates.forEach((p,i)=>{p.hp=i===0?1:0;});
 const p=model.pirates[0];
 model.shots.push({id:1,team:'ally',x:p.x-5,y:p.y,heading:0,life:10,damage:3});
 f.db.prepare('UPDATE rift_shared_flight SET model=?').run(JSON.stringify(model));
 f.advance(100);
 const round=await a.step(1);
 assert.equal(round.state.status,'complete');
 assert.equal(round.state.winner,'allies');
 assert.equal((await a.info()).battle.joinable,false);
});
