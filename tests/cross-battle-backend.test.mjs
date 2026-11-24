import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import vm from 'node:vm';
import {handleCrossBattle} from '../server/cross-battle.mjs';
import {blackwakeWindow,galaxyBifrostSample,galaxyPlan,galaxySample} from '../server/galaxy-carrier.mjs';
import {handleFighterParking} from '../server/fighter-parking.mjs';
const bearer='54'.repeat(32),other='6a'.repeat(32),site='https://rift-runner.boundlessghost16.chatgpt.site',worker='https://rift-runner.gambizt3.workers.dev';
const hull='rift-fighter',vessel='rift-carrier',path='/api/encounters/blackwake';
function fixture(t){
 const db=new DatabaseSync(':memory:');t.after(()=>db.close());
 const epoch=Date.parse('2026-11-23T05:00:00Z'),seed=83045,plan=galaxyPlan(seed,'bifrost'),event=blackwakeWindow(plan,epoch);
 db.exec("CREATE TABLE rift_galaxy_carrier (carrier_id, model_version, seed, epoch_ms)");
 db.prepare("INSERT INTO rift_galaxy_carrier VALUES ('bifrost',1,?,?)").run(seed,epoch);
 let now=event.startsAt+1000;
 const clock=()=>now;
 for(const file of ['006_fighter_parking.sql','007_blackwake_encounter.sql']){
  const sql=readFileSync(new URL('../migrations/'+file,import.meta.url),'utf8');db.exec(sql);db.exec(sql);
 }
 const env={GALAXY_DB:{prepare(query){const sql=db.prepare(query);return {bind(...args){return {first:async()=>sql.get(Object.fromEntries(args.map((a,n)=>[String(n+1),a])))??null};}};}}};
 const request=(destination=path,{method='GET',secret,body,origin=site,headers={}}={})=>new Request(worker+destination,{method,
  headers:{origin,...(secret?{authorization:'Bearer '+secret}:{}),...(body?{'content-type':'application/json'}:{}),...headers},
  ...(body?{body:JSON.stringify(body)}:{})});
 const invoke=(opt)=>handleCrossBattle(request(path,opt),env,clock);
 const park=(v='rift-carrier',rev=0)=>handleFighterParking(request('/api/fighter-parking/'+hull,{method:'PUT',secret:bearer,body:{vessel:v,expectedRevision:rev}}),env);
 const join=(v,role,secret=bearer)=>invoke({method:'POST',secret,body:{vessel:v,hull,role}});
 return {db,env,invoke,park,join,clock,event,plan,epoch,setNow:t=>{now=t}};
}
test('one public authored encounter; parking proves player carrier without leaking browser or fleet data',async t=>{
 const {db,invoke,park,join}=fixture(t);
 const first=await invoke(),publicContact=await first.json();
 assert.equal(first.headers.get('access-control-allow-origin'),site);
 assert.equal(first.headers.get('access-control-allow-credentials'),null);
 assert.equal(publicContact.participation,null);
 assert.equal(publicContact.encounter.attacker.id,'bifrost');
 assert.equal(publicContact.encounter.pirate.id,'blackwake');
 assert.equal(publicContact.encounter.simulation,'local');
 assert.equal((await join(vessel,'reinforce')).status,409); // no D1 berth yet
 assert.equal((await park()).status,200);
 assert.equal((await join(vessel,'intercept',other)).status,409);
 assert.equal((await join('bifrost','intercept')).status,409);
 assert.equal((await join('bifrost','reinforce')).status,400);
 for(const role of ['intercept','intercept','reinforce']){
  const receipt=await join(vessel,role);
  assert.equal(receipt.status,200);
  assert.deepEqual(await receipt.json(),{...publicContact,participation:{hull,vessel,role}});
 }
 assert.equal(db.prepare('SELECT COUNT(*) AS n FROM rift_cross_battle_participation').get().n,1);
 assert.deepEqual(await (await invoke()).json(),publicContact);
 assert.equal((await park('bifrost',1)).status,200);
 assert.equal((await join(vessel,'reinforce')).status,409);
 assert.equal((await join('bifrost','intercept')).status,200);
});
test('adapter uses credentials-omitted exact origin and drops a stale pilot receipt',async t=>{
 const {env,park,clock}=fixture(t);await park();
 const store=new Map([['rift-runner.fighter-parking-access.v1',JSON.stringify({generation:null,bearer})]]);
 const seen=[];let stale=false;
 const window={location:{hostname:'rift-runner.boundlessghost16.chatgpt.site'},localStorage:{getItem:k=>store.get(k)??null},
  async fetch(url,opts){
   seen.push([url,opts]);
   const response=await handleCrossBattle(new Request(url,{...opts,headers:{...opts.headers,origin:site}}),env,clock);
   if(stale)store.set('rift-runner.character-generation.v1','new-pilot');
   return response;
  }};
 vm.runInNewContext(readFileSync(new URL('../dist/cross-battle.js',import.meta.url),'utf8'),{window});
 const {get,join}=window.RiftCrossBattle;
 assert.equal((await get()).encounter.id,'blackwake');
 assert.equal(seen[0][1].headers,undefined);
 assert.equal((await join(vessel,hull,'intercept')).participation.vessel,vessel);
 assert.equal(seen[1][0],worker+path);assert.equal(seen[1][1].credentials,'omit');assert.equal(seen[1][1].redirect,'error');
 assert.equal(seen[1][1].headers.Authorization,'Bearer '+bearer);
 assert.equal(await join('bifrost',hull,'reinforce'),null);
 stale=true;assert.equal(await join(vessel,hull,'reinforce'),null);
 const count=seen.length;assert.equal(await join(vessel,hull,'intercept'),null);assert.equal(seen.length,count);
});
test('cross-origin access and invalid writes are scoped to encounter and expected request shape',async t=>{
 const {invoke}=fixture(t);
 assert.equal((await invoke({origin:'https://other.example'})).status,403);
 assert.equal((await invoke({method:'OPTIONS',headers:{'access-control-request-method':'POST','access-control-request-headers':'authorization, content-type'}})).status,204);
 assert.equal((await invoke({method:'POST',body:{hull,vessel,role:'intercept'}})).status,401);
 assert.equal((await invoke({method:'POST',secret:bearer,body:{hull,vessel,role:'intercept',x:12}})).status,400);
 assert.equal(await handleCrossBattle(new Request(worker+'/api/galaxy/carrier'),{}),null);
});

test('Bifrost freezes continuously at the published approach edge for four hours, then resumes its ordinary route',async t=>{
 const {invoke,join,event,plan,epoch,setNow}=fixture(t),{startsAt,endsAt}=event;
 assert.equal(endsAt-startsAt,14400000);
 setNow(startsAt-1);assert.equal((await invoke()).status,404);
 const pre=galaxyBifrostSample(plan,epoch,startsAt-1);
 assert.equal(pre.trajectory.at(-1).startAt,startsAt);
 setNow(startsAt);const {encounter}=await (await invoke()).json();
 assert.equal(encounter.x,(encounter.attacker.x+encounter.pirate.x)/2);
 assert.equal(encounter.y,(encounter.attacker.y+encounter.pirate.y)/2);
 for(const now of [startsAt,startsAt+40000,endsAt-1]){
  const pose=galaxyBifrostSample(plan,epoch,now).carrier;
  assert.deepEqual([pose.sector,pose.x,pose.y,pose.heading,pose.speed],
   [encounter.sector,encounter.attacker.x,encounter.attacker.y,encounter.attacker.heading,0]);
 }
 const after=galaxyBifrostSample(plan,epoch,endsAt+1000),baseline=galaxySample(plan,epoch,startsAt+1000,'bifrost');
 assert.deepEqual(after.carrier,baseline.carrier);
 assert.equal(after.trajectory[0].startAt,baseline.trajectory[0].startAt+14400000);
 setNow(endsAt);assert.equal((await invoke()).status,404);
 assert.equal((await join(vessel,'intercept')).status,404);
});
