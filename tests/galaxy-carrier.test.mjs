import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {makeGalaxyCarrierHandler,galaxyPlan,galaxyPose,galaxySample,GALAXY_PATH} from '../server/galaxy-carrier.mjs';
const sql=readFileSync(new URL('../migrations/001_galaxy_carrier.sql',import.meta.url),'utf8');
const endpoint=(method='GET',path=GALAXY_PATH)=>new Request('https://rift-runner.example'+path,{method});
const epoch=1795449600000;
function setup(t,filename=':memory:',initialize=true){
 const db=new DatabaseSync(filename);
 const binding={reads:0,attempts:0,writes:0,prepare(query){
  const statement=db.prepare(query);
  return {bind(...args){return {
   async first(){binding.reads++;return statement.get(Object.fromEntries(args.map((arg,i)=>[String(i+1),arg])))??null;},
   async run(){
    binding.attempts++;
    const r=statement.run(Object.fromEntries(args.map((arg,i)=>[String(i+1),arg])));binding.writes+=r.changes;
    return {meta:{changes:r.changes}};
   }
  };}};
 }};
 if(initialize){
  db.exec(sql);
  db.prepare("UPDATE rift_galaxy_carrier SET seed=274265,epoch_ms=?,checkpoint_at_ms=?,guild_id='guild-private'").run(epoch,epoch);
 }
 t.after(()=>{try{db.close();}catch{}});
 return {db,binding,env:{GALAXY_DB:binding},
  row:()=>db.prepare('SELECT * FROM rift_galaxy_carrier').get()};
}
const silent={warn(){}};
const futureDestination=(plan,epoch,leg)=>galaxySample(plan,epoch,epoch+leg.startAt+1).carrier.destination;
const near=(a,b,tol=1e-6)=>assert.ok(Math.abs(a-b)<=tol,`${a} != ${b}`);
test('D1 migration is idempotent and schema can represent additional stable carrier IDs later',t=>{
 const s=setup(t);const first={...s.row()};
 s.db.exec(sql);assert.deepEqual({...s.row()},first);
 s.db.exec("INSERT INTO rift_galaxy_carrier SELECT 'other-capital', NULL, model_version, seed, epoch_ms, checkpoint_at_ms,checkpoint_sector,checkpoint_x,checkpoint_y,checkpoint_heading,checkpoint_speed,checkpoint_corsair FROM rift_galaxy_carrier WHERE carrier_id='rift-carrier'");
 assert.equal(s.db.prepare('SELECT count(*) n FROM rift_galaxy_carrier').get().n,2);
});
test('two independent clients share the identical authoritative snapshot without leaking anchor or guild details',async t=>{
 const s=setup(t);let now=epoch+17000;const clock=()=>now;
 const a=makeGalaxyCarrierHandler({clock,logger:silent}),b=makeGalaxyCarrierHandler({clock,logger:silent});
 const r1=await a(endpoint(),s.env),r2=await b(endpoint(),s.env);
 assert.equal(r1.status,200);assert.equal(r1.headers.get('cache-control'),'no-store');
 assert.equal(r1.headers.get('x-content-type-options'),'nosniff');
 assert.equal(r1.headers.get('access-control-allow-origin'),'https://rift-runner.boundlessghost16.chatgpt.site');
 assert.equal(r1.headers.has('access-control-allow-credentials'),false);
 const body=await r1.json();assert.deepEqual(body,await r2.json());
 assert.deepEqual(Object.keys(body),['version','serverTime','carrier','trajectory']);
 assert.deepEqual(Object.keys(body.carrier).sort(),['corsairSurveyed','destination','heading','id','phase','sector','speed','x','y']);
 assert.doesNotMatch(JSON.stringify(body),/guild-private|seed|epoch|checkpoint/);
 assert.equal(body.serverTime,now);
 assert.ok(body.trajectory.at(-1).endAt>=now+45000);
 assert.deepEqual(galaxyPose(body.trajectory[0],now),{x:body.carrier.x,y:body.carrier.y,speed:body.carrier.speed,phase:body.carrier.phase});
 for(const v of [15000,30000,60000]){now=epoch+17000+v;await a(endpoint(),s.env);}
 assert.equal(s.binding.reads,2,'one anchor read per warmed handler cache');assert.equal(s.binding.writes,0);
});
test('actual on-disk SQLite reopens hours later: without visits time moved the exact same ship',async t=>{
 const dir=mkdtempSync(join(tmpdir(),'rr-shared-galaxy-'));const file=join(dir,'galaxy.sqlite');
 t.after(()=>rmSync(dir,{recursive:true,force:true}));
 const old=setup(t,file);let now=epoch+5000;const clock=()=>now;
 const one=makeGalaxyCarrierHandler({clock,logger:silent});
 const before=await (await one(endpoint(),old.env)).json();old.db.close();
 now=epoch+7*3600000+56543;
 const restored=setup(t,file,false);
 const two=makeGalaxyCarrierHandler({clock,logger:silent});
 const after=await (await two(endpoint(),restored.env)).json();
 assert.notDeepEqual(after.carrier,before.carrier);
 assert.deepEqual(after,galaxySample(galaxyPlan(274265),epoch,now));
 assert.equal(after.carrier.corsairSurveyed,true);
 const row=restored.row();assert.equal(row.checkpoint_at_ms,now);assert.equal(row.checkpoint_sector,after.carrier.sector);
 assert.equal(row.checkpoint_x,after.carrier.x);assert.equal(row.checkpoint_corsair,1);
});
test('concurrent origin calls schedule checkpoint work but atomic SQL writes once and never rewinds',async t=>{
 const s=setup(t);let now=epoch+181000;const clock=()=>now;
 const pending=[];const ctx={waitUntil(p){pending.push(p);}};
 const a=makeGalaxyCarrierHandler({clock,logger:silent}),b=makeGalaxyCarrierHandler({clock,logger:silent});
 const replies=await Promise.all([a(endpoint(),s.env,ctx),b(endpoint(),s.env,ctx)]);
 assert.equal(replies[0].status,200);assert.equal(replies[1].status,200);
 await Promise.all(pending);
 assert.equal(s.binding.writes,1);assert.equal(s.row().checkpoint_at_ms,now);
 now=epoch+100000;
 await a(endpoint(),s.env,ctx);assert.equal(s.row().checkpoint_at_ms,epoch+181000);
 now=epoch+381000;
 const body=await (await b(endpoint(),s.env)).json();
 assert.equal(s.binding.writes,2);
 assert.equal(s.row().checkpoint_at_ms,now);assert.equal(s.row().checkpoint_y,body.carrier.y);
});
test('routes vary, roll through a seam, obey the speed limit and discover Corsair',()=>{
 const a=galaxyPlan(274265),b=galaxyPlan(314159);
 assert.notDeepEqual(a,b);assert.ok(a.duration>300000&&a.duration<1200000);
 for(const [i,seg] of a.segments.entries()){
  if(i)assert.equal(a.segments[i-1].endAt,seg.startAt);
  if(seg.rampMs){
   const mid=(seg.startAt+seg.endAt)/2;
   assert.ok(galaxyPose(seg,mid).speed<=76);
   near(galaxyPose(seg,seg.startAt).speed,0);near(galaxyPose(seg,seg.endAt).speed,0);
   near(galaxyPose(seg,seg.endAt).x,seg.toX);near(galaxyPose(seg,seg.endAt).y,seg.toY);
  }
 }
 const vertical=a.segments.flatMap(segment=>[segment.fromY,segment.toY]);
 assert.ok(vertical.every(y=>y>=-850&&y<=2660));
 assert.ok(vertical.some(y=>y<0||y>1810),'roaming uses extended V158 chart bounds');
 const seam=a.segments.find(segment=>segment.sector==='frontier'),cross=galaxySample(a,epoch,epoch+seam.startAt);
 assert.equal(cross.carrier.sector,'frontier');near(cross.carrier.x,35);
 assert.equal(galaxySample(a,epoch,epoch+a.surveyAt-1).carrier.corsairSurveyed,false);
 assert.equal(galaxySample(a,epoch,epoch+a.surveyAt).carrier.corsairSurveyed,true);
 const cycle=galaxySample(a,epoch,epoch+a.duration).carrier;near(cycle.x,563);near(cycle.y,476);
 const destinations=['Rift Rendezvous','Corsair Cluster','Uncharted Moon','Uncharted Frontier'];
 assert.deepEqual([...new Set(a.segments.map(s=>s.destination))],destinations);
 assert.equal(a.segments.filter(s=>s.rampMs===0).length,18,'stops only for the three staffed observation points each trip');
 const moon=a.segments.find(s=>s.destination==='Uncharted Moon'&&s.rampMs>0);
 assert.ok(Math.hypot(moon.toX-805,moon.toY-1920)<78);
 assert.ok(a.segments.filter(s=>s.rampMs>0).every(s=>s.endAt-s.startAt>=8000),'all moving legs are purposeful and long');
 assert.equal(futureDestination(a,epoch,moon),moon.destination);
 const future=galaxySample(a,epoch,epoch+366*86400000+57117);
 assert.ok(future.carrier.x>=0&&future.carrier.x<=2750);
 assert.ok(future.trajectory.length<90,'bounded projection network cost even after a year offline');
});
test('no client mutation, unsafe methods or fallback local position on missing/malformed D1',async t=>{
 const s=setup(t),a=makeGalaxyCarrierHandler({clock:()=>epoch,logger:silent});
 assert.equal(await a(endpoint('GET','/carrier.html'),s.env),null);
 for(const method of ['POST','HEAD','PUT','OPTIONS']){
  const r=await a(endpoint(method),s.env);
  assert.equal(r.status,405);assert.equal(r.headers.get('allow'),'GET');
 }
 assert.equal(s.binding.reads,0);
 const missing=await a(endpoint(),{});
 assert.equal(missing.status,503);assert.equal(missing.headers.get('retry-after'),'30');
 assert.deepEqual(await missing.json(),{error:'GALAXY_UNAVAILABLE'});
 s.db.exec('UPDATE rift_galaxy_carrier SET model_version=2');
 const invalid=await a(endpoint(),s.env);
 assert.equal(invalid.status,503);assert.equal(s.binding.writes,0);
});
