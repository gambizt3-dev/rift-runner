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
   send:(action,extra={},override={},armada=pegasus)=>handleFleetSpace(new Request(origin+FLEET_SPACE_PATH+'/'+armada+'/'+action,{
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
 await ok(pilots[0].send('launch'));
 assert.equal((await pilots[3].send('enter')).status,409,'pad stays occupied until the ship clears it');
 await ok(pilots[0].send('step',{seq:1,turn:0,thrust:1}));f.advance(300);
 assert.equal(own(await ok(pilots[3].send('enter'))).pad,own(entered[0]).pad);
});
test('server enforces the berth and movement input shape without changing the live career or battle tables',async t=>{
 const f=fixture(t),a=f.player(10);await a.park();await ok(a.send('enter'));
 assert.equal((await a.send('step',{seq:1,turn:0,thrust:1,x:2000})).status,400);
 assert.equal((await a.send('enter',{}, {origin:'https://unrelated.example'})).status,403);
 assert.equal((await a.park('bifrost',1)).status,200);
 assert.equal((await a.send('launch')).status,409);
});
test('Pegasus and Bifrost use the same flight rules with independent ships and carrier-specific pads',async t=>{
 const f=fixture(t),pilots=[11,12,13,14].map(f.player);
 const names=[pegasus,pegasus,'bifrost','bifrost'];
 await Promise.all(pilots.map((p,i)=>p.park(names[i])));
 const call=(i,action,data={})=>pilots[i].send(action,data,{},names[i]);
 const opened=await Promise.all(pilots.map((_,i)=>ok(call(i,'enter'))));
 assert.deepEqual(opened.map(v=>v.state.name),['Pegasus','Pegasus','Bifrost','Bifrost']);
 assert.notDeepEqual(opened[0].state.pads,opened[2].state.pads);
 for(let i=0;i<4;i++){
  const o=own(opened[i]),pad=opened[i].state.pads[o.pad];
  assert.deepEqual([o.x,o.y],[pad.x,pad.y]);
  assert.notEqual(o.pad,opened[i].state.recoveryPad);
 }
 await Promise.all(pilots.map((_,i)=>ok(call(i,'launch'))));
 await ok(call(2,'step',{seq:1,thrust:1,turn:0}));f.advance(200);
 const [peg,other]=await Promise.all([0,3].map(i=>ok(call(i,'step',{seq:1,thrust:0,turn:0}))));
 assert.deepEqual(peg.state.ships.map(s=>s.id).sort(),opened.slice(0,2).map(p=>p.self).sort());
 assert.deepEqual(other.state.ships.map(s=>s.id).sort(),opened.slice(2).map(p=>p.self).sort());
 assert.ok(other.state.ships.find(p=>p.id===opened[2].self).y<own(opened[2]).y);
 const dropped=await ok(call(2,'disconnect'));f.advance(500);
 const back=await ok(call(2,'enter'));assert.equal(back.self,opened[2].self);
 assert.deepEqual([own(back).x,own(back).y],[own(dropped).x,own(dropped).y]);
 assert.equal((await pilots[2].send('enter')).status,409);
});

const headingDelta=(a,b)=>Math.atan2(Math.sin(a-b),Math.cos(a-b));
async function approach(f,p,target,state,armada){
 let seq=state.lastSeq;
 const send=(turn,thrust)=>ok(p.send('step',{seq:++seq,turn,thrust},{},armada));
 for(let i=0;i<48;i++){
  const ship=own(state),distance=Math.hypot(target.x-ship.x,target.y-ship.y);
  if(distance<=8&&ship.pad===null)return state;
  const desired=Math.atan2(target.y-ship.y,target.x-ship.x);
  const delta=headingDelta(desired,ship.heading);
  const turn=Math.min(1,Math.max(-1,delta/.52));
  const thrust=Math.abs(delta)>.06?0:Math.min(1,distance/29);
  await send(turn,thrust);f.advance(200);state=await send(0,0);
 }
 throw Error('Ship did not reach the recovery pad');
}
for(const armada of [pegasus,'bifrost'])test(armada+' concurrent recovery gives one pilot the pad; Store Inside hands it to the waiting pilot',async t=>{
 const f=fixture(t),a=f.player(15),b=f.player(16);
 const request=(p,action,data={})=>p.send(action,data,{},armada);
 await Promise.all([a.park(armada),b.park(armada)]);
 const entered=await ok(request(a,'enter'));await ok(request(b,'enter'));
 const pad=entered.state.pads.find(p=>p.id===entered.state.recoveryPad);
 const [aLaunch,bLaunch]=await Promise.all([ok(request(a,'launch')),ok(request(b,'launch'))]);
 const aa=await approach(f,a,pad,aLaunch,armada);
 const bb=await approach(f,b,pad,bLaunch,armada);
 const [ar,br]=await Promise.all([ok(request(a,'dock')),ok(request(b,'dock'))]);
 const [aState,bState]=await Promise.all([ok(request(a,'step',{seq:aa.lastSeq+1,turn:0,thrust:0})),ok(request(b,'step',{seq:bb.lastSeq+1,turn:0,thrust:0}))]);
 const ships=aState.state.ships;assert.equal(ships.filter(s=>s.pad===pad.id).length,1);
 const first=ships.find(s=>s.pad===pad.id).id===ar.self?a:b;
 const waiting=first===a?b:a,held=first===a?bState:aState;
 assert.equal(held.docking.place,1);
 const stored=await ok(request(first,'store'));assert.equal(own(stored).phase,'stored');
 const next=await ok(request(waiting,'step',{seq:held.lastSeq+1,turn:0,thrust:0}));
 assert.equal(next.state.ships.length,1,'stored ship is no longer in the shared exterior');
 assert.equal(own(next).pad,pad.id);assert.equal(own(next).phase,'pad');
 const back=await ok(request(first,'enter'));assert.equal(back.self,stored.self);assert.notEqual(own(back).pad,pad.id);
});
