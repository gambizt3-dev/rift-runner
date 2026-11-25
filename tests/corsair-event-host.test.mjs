import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {createCorsairHost,CORSAIR_EVENT_PATH as path} from '../server/corsair-event-host.mjs';
const pegasus='rift-carrier',bifrost='bifrost',hull='rift-fighter',start=500000;
const url='https://rift-runner.gambizt3.workers.dev'+path;
const site={sector:'reach',x:365,y:1160,startedAt:start};
function setup(t,allowBifrost=false){
 const sql=new DatabaseSync(':memory:');t.after(()=>sql.close());
 for(const name of ['006_fighter_parking','011_galaxy_corsair'])
  sql.exec(readFileSync(new URL('../migrations/'+name+'.sql',import.meta.url),'utf8'));
 const db={prepare(q){const s=sql.prepare(q);return {first:async()=>s.get()??null,bind(...args){
  return {first:async()=>s.get(Object.fromEntries(args.map((arg,i)=>[i+1,arg])))??null};
 }};}};
 const env={GALAXY_DB:db};let now=start;
 const coords={[pegasus]:{...site,x:210},[bifrost]:{...site,x:550}};
 const host=createCorsairHost({allowBifrost,clock:()=>now,readCarrier:vessel=>coords[vessel]});
 const pilot=async (n,vessel)=>{
  const token=n.toString(16).padStart(64,'0'),hash=await crypto.subtle.digest('SHA-256',new TextEncoder().encode('rift-runner:fighter-parking:v1:'+token));
  const namespace=Buffer.from(hash).toString('hex');
  if(vessel)sql.prepare("INSERT INTO rift_fighter_parking(namespace_hash,hull_id,vessel_id,bay,revision) VALUES(?,?,?,?,?)").run(namespace,hull,vessel,1,1);
  const send=(a,b)=>host.fetch(new Request(url+'/'+a,{method:'POST',headers:{authorization:'Bearer '+token,'content-type':'application/json'},body:JSON.stringify({hull,...b})}),env);
  return {send,namespace};
 };
 const get=()=>host.fetch(new Request(url),env);
 return {pilot,coords,get,sql,scheduled:(event=site)=>host.scheduled(env,now,event),advance:ms=>{now+=ms;}};
}
const json=async(p,status=200)=>{const r=await p,d=await r.json();assert.equal(r.status,status,JSON.stringify(d));return d;};
test('public chart returns one marker; two distinct Pegasus berths join and see the same ships',async t=>{
 const f=setup(t),a=await f.pilot(1,pegasus),b=await f.pilot(2,pegasus);
 assert.equal((await json(f.get())).event,null);
 const opened=await f.scheduled(),marker=(await json(f.get())).event;
 assert.equal(marker.id,opened.id);
 const opts={eventId:marker.id};
 const [first,second]=await Promise.all([json(a.send('join',opts)),json(b.send('join',opts))]);
 assert.notEqual(first.self,second.self);
 const step=await json(a.send('step',{...opts,seq:1,turn:0,thrust:0,strafe:0,fire:true}));
 assert.equal(step.state.ships.filter(x=>!x.npc).length,2);
 assert.equal(step.event.id,marker.id);assert.equal(step.event.players,2);
 assert.ok(!JSON.stringify(step).includes(a.namespace));
 await json(a.send('leave',opts));assert.equal((await json(a.send('join',opts))).self,first.self);
});
test('origin and range come from the server, and a prototype cannot write another fleet state',async t=>{
 const f=setup(t),b=await f.pilot(3,bifrost),a=await f.pilot(4,pegasus),none=await f.pilot(5);
 f.coords[pegasus].x=1000;assert.equal(await f.scheduled(),null);
 f.coords[pegasus].x=210;const event=await f.scheduled(),opts={eventId:event.id};
 assert.equal((await json(b.send('join',opts),409)).error,'ORIGIN_NOT_OPEN');
 assert.equal((await json(none.send('join',opts),409)).error,'PARKING_NOT_CONFIRMED');
 assert.equal((await json(a.send('join',{...opts,verified:true}),400)).error,'INVALID_EVENT_REQUEST');
 f.coords[pegasus].sector='frontier';
 assert.equal((await json(a.send('join',opts),409)).error,'EVENT_OUT_OF_RANGE');
});
test('the scheduler can advance NPC combat without relying on a chart visitor',async t=>{
 const f=setup(t),e=await f.scheduled();
 f.advance(65000);
 const e2=await f.scheduled(null);
 assert.equal(e.id,e2.id);assert.equal(e2.model.players.length,0);assert.ok(e2.model.shotId>0);
 assert.equal((await json(f.get())).event.id,e.id);
});
test('Galaxy bridge opens from the real route sample and keeps one event across cron retries',async t=>{
 const {makeCorsairGalaxyBridge}=await import('../server/corsair-galaxy-bridge.mjs');
 const {galaxyPlan,galaxySample}=await import('../server/galaxy-carrier.mjs');
 const sql=new DatabaseSync(':memory:');t.after(()=>sql.close());
 for(const name of ['001_galaxy_carrier','011_galaxy_corsair'])sql.exec(readFileSync(new URL('../migrations/'+name+'.sql',import.meta.url),'utf8'));
 const epoch=Date.parse('2026-11-25T00:00:00Z'),seed=127,plan=galaxyPlan(seed,pegasus);
 const candidate=Array.from({length:1000},(_,n)=>epoch+n*1_200_000).find(at=>{
  const p=galaxySample(plan,epoch,at,pegasus).carrier;
  return p.sector===site.sector&&Math.hypot(p.x-site.x,p.y-site.y)<=250;
 });
 assert.ok(candidate,'fixture has an in-range route window');
 sql.prepare("UPDATE rift_galaxy_carrier SET seed=?,epoch_ms=?,checkpoint_at_ms=? WHERE carrier_id=?").run(seed,epoch,candidate,pegasus);
 let now=candidate;
 const bridge=makeCorsairGalaxyBridge({clock:()=>now});
 const env={GALAXY_DB:{prepare(q){const stmt=sql.prepare(q);return {first:async()=>stmt.get()??null,bind(...args){
  const bind=Object.fromEntries(args.map((a,i)=>[i+1,a]));return {
   first:async()=>stmt.get(bind)??null,run:async()=>({meta:{changes:stmt.run(bind).changes}})
  };
 }};}}};
 const a=await bridge.scheduled({scheduledTime:now},env);
 assert.ok(a);now+=65000;const b=await bridge.scheduled({scheduledTime:now},env);
 assert.equal(b.id,a.id);assert.ok(b.model.shotId>0);
 const marker=await json(bridge.fetch(new Request(url),env));
 assert.equal(marker.event.id,a.id);assert.deepEqual(marker.event.joinable,[pegasus]);
});
