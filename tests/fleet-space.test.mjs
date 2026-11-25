import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {handleFighterParking} from '../server/fighter-parking.mjs';
import {handleFleetSpace,FLEET_SPACE_PATH} from '../server/fleet-space.mjs';
const origin='https://rift-runner.gambizt3.workers.dev',pegasus='rift-carrier',hull='rift-fighter';
function fixture(t){
 const db=new DatabaseSync(':memory:');t.after(()=>db.close());
 for(const f of ['006_fighter_parking','010_fleet_space']){
  const sql=readFileSync(new URL('../migrations/'+f+'.sql',import.meta.url),'utf8');db.exec(sql);db.exec(sql);
 }
 let now=10000;
 const env={GALAXY_DB:{prepare(q){
  const s=db.prepare(q);return {bind(...a){return {first:async()=>s.get(Object.fromEntries(a.map((v,i)=>[i+1,v])))??null};}};
 }}};
 const player=n=>{
  const token=n.toString(16).padStart(64,'0'),headers={authorization:'Bearer '+token,'content-type':'application/json',origin};
  return {token,park:(vessel=pegasus,expectedRevision=0)=>handleFighterParking(new Request(origin+'/api/fighter-parking/'+hull,{
   method:'PUT',headers,body:JSON.stringify({vessel,expectedRevision})}),env),
   send:(action,extra={},override={})=>handleFleetSpace(new Request(origin+FLEET_SPACE_PATH+'/'+pegasus+'/'+action,{
    method:'POST',headers:{...headers,...override},body:JSON.stringify({hull,...extra})}),env,()=>now)};
 };
 return {player,advance:ms=>{now+=ms}};
}
const ok=async request=>{const r=await request,d=await r.json();assert.equal(r.status,200,JSON.stringify(d));return d;};
const own=d=>d.state.ships.find(p=>p.id===d.self);
test('two independently parked pilots launch into one Pegasus exterior and see each other move',async t=>{
 const f=fixture(t),a=f.player(1),b=f.player(2);
 assert.equal((await a.park()).status,200);assert.equal((await b.park()).status,200);
 const entered=await Promise.all([ok(a.send('enter')),ok(b.send('enter'))]);
 assert.ok(entered.every(p=>p.state.armada===pegasus));
 assert.notEqual(entered[0].self,entered[1].self);
 assert.notEqual(own(entered[0]).pad,own(entered[1]).pad);
 const [left,right]=await Promise.all([ok(a.send('launch')),ok(b.send('launch'))]);
 assert.equal(own(left).phase,'airborne');assert.equal(own(right).phase,'airborne');
 await ok(a.send('step',{seq:1,turn:0,thrust:1}));f.advance(250);
 const view=await ok(b.send('step',{seq:1,turn:0,thrust:0}));
 assert.equal(view.state.ships.length,2);
 assert.ok(view.state.ships.find(ship=>ship.id===left.self).y<own(left).y);
 assert.ok(!JSON.stringify(view).includes(a.token));
});
test('refresh and disconnect retain ship identity, position and sequence while the other pilot remains live',async t=>{
 const f=fixture(t),a=f.player(3),b=f.player(4);
 await a.park();await b.park();await ok(a.send('enter'));await ok(b.send('enter'));await ok(a.send('launch'));await ok(b.send('launch'));
 await ok(a.send('step',{seq:1,turn:.5,thrust:1}));f.advance(300);
 const gone=await ok(a.send('disconnect'));f.advance(1000);
 assert.equal((await ok(b.send('step',{seq:1,turn:0,thrust:0}))).state.ships.length,1);
 assert.equal((await a.send('step',{seq:2,turn:0,thrust:0})).status,409);
 const rejoin=await ok(a.send('enter'));assert.equal(rejoin.self,gone.self);assert.equal(rejoin.lastSeq,1);
 assert.equal(own(rejoin).x,own(gone).x);assert.equal(own(rejoin).y,own(gone).y);
 assert.equal(rejoin.state.ships.length,2);
 f.advance(500);const after=await ok(a.send('step',{seq:1,turn:1,thrust:1}));
 assert.equal(after.lastSeq,1);assert.equal(own(after).heading,own(gone).heading);
});
test('independent pilots cannot enter from a different berth or book the reserved recovery pad',async t=>{
 const f=fixture(t),away=f.player(5),pilots=[6,7,8,9].map(f.player);
 await away.park('bifrost');assert.equal((await away.send('enter')).status,409);
 await Promise.all(pilots.map(p=>p.park()));
 const entered=await Promise.all(pilots.slice(0,3).map(p=>ok(p.send('enter'))));
 assert.deepEqual(entered.map(p=>own(p).pad).sort(),[0,1,2]);
 assert.equal((await pilots[3].send('enter')).status,409);
 await ok(pilots[0].send('launch'));assert.equal(own(await ok(pilots[3].send('enter'))).pad,own(entered[0]).pad);
});
test('server enforces the berth and movement input shape without changing the live career or battle tables',async t=>{
 const f=fixture(t),a=f.player(10);await a.park();await ok(a.send('enter'));
 assert.equal((await a.send('step',{seq:1,turn:0,thrust:1,x:2000})).status,400);
 assert.equal((await a.send('enter',{}, {origin:'https://unrelated.example'})).status,403);
 assert.equal((await a.park('bifrost',1)).status,200);
 assert.equal((await a.send('launch')).status,409);
});
