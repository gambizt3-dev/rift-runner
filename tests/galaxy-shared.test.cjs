'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const {galaxyPlan,galaxyPose,galaxySample}=require('../server/galaxy-carrier.mjs');
const ROOT=path.join(__dirname,'../dist/galaxy-shared.js'),clockEpoch=1795449600000;
const plan=galaxyPlan(274265);
const data=(elapsed=17000)=>galaxySample(plan,clockEpoch,clockEpoch+elapsed);
const spin=()=>new Promise(setImmediate);
const copy=val=>JSON.parse(JSON.stringify(val));
const origin='rift-runner.boundlessghost16.chatgpt.site';
const payload=(value,status=200)=>({status,ok:status>=200&&status<300,async json(){return copy(value);}});
function harness({hostname='rift-runner.gambizt3.workers.dev',start=0,replies=[payload(data())]}={}){
 let mono=start,serial=0;
 const timers=new Map(),listeners=new Map(),seen=[];
 const doc={hidden:false,addEventListener:(event,fn)=>listeners.set('doc:'+event,fn)};
 const window={location:{hostname},performance:{now:()=>mono},
  addEventListener:(event,fn)=>listeners.set('win:'+event,fn),
  fetch(url,opts){seen.push({url,opts,mono});return Promise.resolve(replies.shift()??payload(null,503));},
  setTimeout(fn,ms){const id=++serial;timers.set(id,{fn,due:mono+ms});return id;},
  clearTimeout:id=>timers.delete(id)};
 vm.runInNewContext(fs.readFileSync(ROOT,'utf8'),{window,document:doc,AbortController});
 const api=window.RiftGalaxyState,watch=api.watch();
 return {api,seen,replies,sample:()=>copy(watch.sample()),get time(){return mono;},
  async pass(ms){
   const until=mono+ms;
   for(let i=0;i<2000;i++){
    const next=[...timers].filter(([,timer])=>timer.due<=until).sort(([,a],[,b])=>a.due-b.due)[0];
    if(!next){mono=until;await spin();return;}
    const [id,timer]=next;mono=timer.due;timers.delete(id);timer.fn();await spin();
   }
   assert.fail('timer loop');
  },
  async hide(flag){doc.hidden=flag;listeners.get('doc:visibilitychange')();await spin();},
  async show(){listeners.get('win:pageshow')();await spin();}
 };
}
test('same backend interval appears identical on clients with different monotonic time origins',async()=>{
 const a=harness(),b=harness({start:240000});
 assert.equal(a.sample().phase,'connecting');
 await spin();
 assert.deepEqual(a.sample(),b.sample());
 await a.pass(1000);await b.pass(1000);
 assert.deepEqual(a.sample(),b.sample());
 const before=data(),expected=galaxyPose(before.trajectory.find(p=>p.startAt<=before.serverTime+1000&&p.endAt>before.serverTime+1000),before.serverTime+1000);
 assert.ok(Math.abs(a.sample().x-expected.x)<1e-9&&Math.abs(a.sample().y-expected.y)<1e-9);
 for(const q of [a,b])assert.ok(q.seen.every(x=>x.url==='./api/galaxy/carrier'&&x.opts.cache==='no-store'&&x.opts.credentials==='omit'));
});
test('only exact private hostname uses approved public origin without credentials',async()=>{
 const q=harness({hostname:origin}),lookalike=harness({hostname:origin+'.example'});
 await spin();
 assert.equal(q.seen[0].url,'https://rift-runner.gambizt3.workers.dev/api/galaxy/carrier');
 assert.equal(q.seen[0].opts.credentials,'omit');
 assert.equal(lookalike.seen[0].url,'./api/galaxy/carrier');
});
test('initial 503 is unavailable, while a later failure preserves projection then freezes as stale',async()=>{
 const unavailable=harness({replies:[payload(null,503),payload(data(22000))]});
 await spin();
 assert.deepEqual(unavailable.sample(),{phase:'unavailable'});
 await unavailable.pass(5200);assert.equal(unavailable.seen.length,2);
 assert.equal(unavailable.sample().id,'rift-carrier');
 const existing=harness({replies:[payload(data()),payload(null,503)]});await spin();
 await existing.pass(17000);assert.notEqual(existing.sample().phase,'unavailable');
 const snapshot=data(),last=snapshot.trajectory.at(-1);
 await existing.pass(last.endAt-snapshot.serverTime);
 assert.equal(existing.sample().phase,'stale');assert.equal(existing.sample().speed,0);
 assert.equal(existing.sample().x,last.toX);assert.equal(existing.sample().y,last.toY);
 const hold=existing.sample();await existing.pass(90000);assert.deepEqual(existing.sample(),hold);
});
test('malformed server coordinates and shapes are rejected, and bad later polls cannot replace position',async()=>{
 const invalid=copy(data());invalid.carrier.y=2661;
 const q=harness({replies:[payload(data()),payload(invalid)]});await spin();
 assert.equal(q.api.validate(invalid),null);
 for(const alter of [
  d=>{d.trajectory[0].fromX=-1;},d=>{d.trajectory[0].rampMs=Infinity;},d=>{d.carrier.sector='bad';},d=>{d.trajectory=[];},
  d=>{d.trajectory[1].startAt=d.trajectory[0].startAt;}
 ]){const tampered=copy(data());alter(tampered);assert.equal(q.api.validate(tampered),null);}
 await q.pass(16000);assert.notEqual(q.sample().id,undefined);assert.ok(q.sample().y<=2660);
});
test('quick visibility round trip always resumes normal polling',async()=>{
 const q=harness({replies:[payload(data()),payload(data(33000))]});await spin();
 await q.pass(200);await q.hide(true);await q.pass(650);assert.equal(q.seen.length,1);
 await q.hide(false);await q.pass(17000);
 assert.equal(q.seen.length,2,'the quick return must either fetch or schedule the next poll');
});
