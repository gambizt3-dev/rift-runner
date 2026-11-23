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
function harness({hostname='rift-runner.gambizt3.workers.dev',start=0,id,replies=[payload(data())]}={}){
 let mono=start,serial=0;
 const timers=new Map(),listeners=new Map(),seen=[];
 const doc={hidden:false,addEventListener:(event,fn)=>listeners.set('doc:'+event,fn)};
 const window={location:{hostname},performance:{now:()=>mono},
  addEventListener:(event,fn)=>listeners.set('win:'+event,fn),
  fetch(url,opts){seen.push({url,opts,mono});return Promise.resolve(replies.shift()??payload(null,503));},
  setTimeout(fn,ms){const id=++serial;timers.set(id,{fn,due:mono+ms});return id;},
  clearTimeout:id=>timers.delete(id)};
 vm.runInNewContext(fs.readFileSync(ROOT,'utf8'),{window,document:doc,AbortController});
 const api=window.RiftGalaxyState,watch=api.watch(id);
 return {api,catalog:window.RiftGalaxyCatalog,close:()=>watch.close(),seen,replies,sample:()=>copy(watch.sample()),get time(){return mono;},
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

test('Bifrost watcher uses only its approved feed and retains its own identity in projection',async()=>{
 const sample=copy(data());sample.carrier.id='bifrost';sample.carrier.corsairSurveyed=false;
 sample.carrier.destination='Frontier Survey Arc';
 for(const leg of sample.trajectory)leg.destination='Frontier Survey Arc';
 const q=harness({id:'bifrost',hostname:origin,replies:[payload(sample)]});
 await spin();assert.equal(q.sample().id,'bifrost');
 assert.equal(q.sample().destination,'Frontier Survey Arc');
 assert.equal(q.seen[0].url,'https://rift-runner.gambizt3.workers.dev/api/galaxy/vessels/bifrost');
 assert.equal(q.seen[0].opts.credentials,'omit');
 assert.equal(q.api.validate(sample),null,'the Pegasus watch cannot consume the Bifrost payload');
 assert.equal(q.api.validate(data(),'bifrost'),null,'the Bifrost watch cannot consume the Pegasus payload');
 assert.equal(q.api.watch('arbitrary'),null);
 await q.pass(1200);assert.equal(q.sample().id,'bifrost');
});

test('both shared watches project the authoritative 1/5 cruise through a cutover with no positional reset',async()=>{
 const {galaxySlowdownBoundary}=require('../server/galaxy-carrier.mjs');
 for(const id of ['rift-carrier','bifrost']){
  const plan=galaxyPlan(274265,id),cutover=clockEpoch+17_000;
  const boundary=galaxySlowdownBoundary(plan,clockEpoch,cutover);
  const normal=at=>galaxySample(plan,clockEpoch,at,id,Number.MAX_SAFE_INTEGER);
  const slow=at=>galaxySample(plan,clockEpoch,at,id,cutover);
  assert.ok(boundary>=cutover);
  assert.deepEqual(slow(boundary-1).carrier,normal(boundary-1).carrier);
  assert.deepEqual(slow(boundary).carrier,normal(boundary).carrier);
  const initial=slow(boundary-300);
  const q=harness({id,replies:[payload(initial),payload(slow(boundary+15_700))]});
  await spin();
  assert.ok(q.api.validate(initial,id),'a trajectory containing both time scales validates');
  let elapsed=0,moved=false;
  for(const delay of [300,805,5525,7645,11700]){
   await q.pass(delay-elapsed);elapsed=delay;
   const when=initial.serverTime+delay,expected=slow(when),current=q.sample();
   const vanilla=normal(boundary+(when-boundary)/5);
   assert.equal(current.sector,expected.carrier.sector);
   for(const field of ['x','y','speed']){
    assert.ok(Math.abs(current[field]-expected.carrier[field])<1e-9,field+' client/server');
    assert.ok(Math.abs(current[field]-vanilla.carrier[field]/(field==='speed'?5:1))<0.000001,field+' original trajectory');
   }
   moved||=current.speed>0;
  }
  assert.equal(moved,true);
 }
});


test('the shared catalog selects actual charted planets only in range and never invents one in the frontier',()=>{
 const {catalog,close}=harness();close();
 const nearest=(x,y,sector='reach')=>catalog.nearPlanet({x,y,sector});
 assert.equal(nearest(545,500).world.name,'Talven');
 assert.equal(nearest(851,158).world.name,'Marrow');
 assert.equal(nearest(851,158,'frontier'),null);
 assert.equal(nearest(2680,2620),null,'no planet out in open chart space');
 assert.equal(nearest(0,0,'invalid'),null);
 assert.notEqual(nearest(805,1920)?.world.id,'south-moon');
 assert.notEqual(nearest(1450,2380)?.world.id,'ironwake');
});

test('disposing a carrier scenery feed prevents background repolls or visibility wakeups',async()=>{
 const q=harness();await spin();assert.equal(q.seen.length,1);
 q.close();await q.pass(48000);await q.hide(true);await q.hide(false);await q.show();
 assert.equal(q.seen.length,1);
});
