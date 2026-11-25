import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {handleFleetSpace} from '../server/fleet-space.mjs';
import {galaxyPlan,galaxyPortSample} from '../server/galaxy-carrier.mjs';
const vessel='rift-carrier',hull='rift-fighter',epoch=Date.parse('2026-11-25T00:00:00Z');
const chart=globalThis.RiftMarketStations,seed=127;
const json=async(p,status=200)=>{const r=await p,b=await r.json();assert.equal(r.status,status,JSON.stringify(b));return b;};
test('market route rejects teleporting; two pilots see the same station and can fly into its opening',async t=>{
 const sql=new DatabaseSync(':memory:');t.after(()=>sql.close());
 for(const name of ['001_galaxy_carrier','006_fighter_parking','010_fleet_space','011_galaxy_corsair'])
  sql.exec(readFileSync(new URL('../migrations/'+name+'.sql',import.meta.url),'utf8'));
 const env={GALAXY_DB:{prepare(q){
  const s=sql.prepare(q);
  return {first:async()=>s.get()??null,bind(...args){
   const binds=Object.fromEntries(args.map((arg,i)=>[i+1,arg]));
   return {first:async()=>s.get(binds)??null,run:async()=>({meta:s.run(binds)}),all:async()=>({results:s.all(binds)})};
  }};
 }}};
 const target=chart.get('waypost-ring'),plan=galaxyPlan(seed,vessel);
 let now=Array.from({length:3000},(_,i)=>epoch+i*30_000).find(at=>{
  const p=galaxyPortSample(plan,epoch,at,vessel).carrier;
  return p.sector===target.sector&&Math.hypot(p.x-target.x,p.y-target.y)<chart.range-120;
 });
 assert.ok(now,'carrier fixture passes within range');
 sql.prepare('UPDATE rift_galaxy_carrier SET seed=?,epoch_ms=?,checkpoint_at_ms=? WHERE carrier_id=?').run(seed,epoch,now,vessel);
 const pilot=async n=>{
  const token=n.toString(16).padStart(64,'0'),hash=await crypto.subtle.digest('SHA-256',new TextEncoder().encode('rift-runner:fighter-parking:v1:'+token));
  sql.prepare('INSERT INTO rift_fighter_parking(namespace_hash,hull_id,vessel_id,bay,revision) VALUES(?,?,?,?,?)').run(Buffer.from(hash).toString('hex'),hull,vessel,1,1);
  return (action,data={})=>handleFleetSpace(new Request('https://game.test/api/fleet-space/'+vessel+'/'+action,{method:'POST',
   headers:{authorization:'Bearer '+token,'content-type':'application/json'},body:JSON.stringify({hull,...data})}),env,()=>now);
 };
 const [a,b]=await Promise.all([pilot(100),pilot(200)]),dest={station:target.id};
 assert.equal((await json(a('station-enter',dest),409)).error,'STATION_ARRIVAL_REQUIRED');
 const ships=[];for(const v of [a,b]){ships.push((await json(v('enter'))).self);await json(v('launch'));}
 assert.equal((await json(a('to-station',dest),409)).error,'FLY_TO_STATION_GATE');
 let seq=1,step;
 for(;seq<=65;seq++){
  now+=250;
  step=await Promise.all([a,b].map(v=>json(v('step',{seq,turn:0,thrust:1}))));
  if(step.every(d=>d.state.ships.find(s=>s.id===d.self).y<=chart.gateY))break;
 }
 assert.ok(step.every(d=>d.state.ships.find(s=>s.id===d.self).y<=chart.gateY));
 assert.equal((await json(a('to-station',{station:'frontier-ring'}),409)).error,'STATION_OUT_OF_RANGE');
 const first=await json(a('to-station',dest));assert.equal(first.self,ships[0]);
 const second=await json(b('to-station',dest));assert.equal(second.self,ships[1]);
 assert.deepEqual(new Set(second.state.ships.map(x=>x.id)),new Set(ships));
 assert.equal(second.state.armada,target.id);
 assert.equal((await json(a('enter'),409)).error,'FIGHTER_AT_STATION');
 assert.equal((await json(a('station-enter',{station:'meridian-ring'}),409)).error,'STATION_ARRIVAL_REQUIRED');
 assert.equal((await json(a('station-return',dest),409)).error,'FLY_TO_RETURN_GATE');
 for(let i=0;i<30;i++){seq++;now+=250;step=await json(a('station-step',{...dest,seq,turn:0,thrust:1}));}
 const here=step.state.ships.find(s=>s.id===ships[0]);
 assert.ok(Math.hypot(here.x-chart.map.x,here.y-chart.map.y)<chart.map.innerRadius,'fighter can cross the centre of the ring');
 const joined=await json(b('station-enter',dest));
 assert.equal(joined.self,ships[1]);assert.equal(joined.state.ships.find(s=>s.id===ships[0]).y,here.y);
 for(let i=0;i<6;i++){seq++;now+=250;step=await json(a('station-step',{...dest,seq,turn:.8,thrust:0}));}
 for(let i=0;i<45;i++){
  seq++;now+=250;step=await json(a('station-step',{...dest,seq,turn:0,thrust:1}));
  if(step.state.ships.find(s=>s.id===ships[0]).y>=chart.returnY)break;
 }
 let response=await a('station-return',dest);
 if(response.status===409){
  assert.equal((await response.json()).error,'CARRIER_OUT_OF_RANGE');
  const later=Array.from({length:25000},(_,i)=>now+(i+1)*5_000).find(at=>{
   const p=galaxyPortSample(plan,epoch,at,vessel).carrier;
   return p.sector===target.sector&&Math.hypot(p.x-target.x,p.y-target.y)<chart.range-30;
  });
  assert.ok(later);now=later;
  await json(a('station-enter',dest));
  response=await a('station-return',dest);
 }
 const returned=await json(response);
 assert.equal(returned.self,ships[0]);assert.equal(returned.state.armada,vessel);
 assert.equal(returned.state.ships.find(s=>s.id===ships[0]).phase,'airborne');
 assert.equal((await json(a('station-enter',dest),409)).error,'STATION_ARRIVAL_REQUIRED');
 const remaining=await json(b('station-enter',dest));
 assert.equal(remaining.state.ships.some(x=>x.id===ships[0]),false);
});
