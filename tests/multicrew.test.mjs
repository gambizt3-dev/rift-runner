import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import vm from 'node:vm';
import {handleMulticrew,MULTICREW_PATH} from '../server/multicrew.mjs';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const prior=read('migrations/001_galaxy_carrier.sql'),sql=read('migrations/002_multicrew_vessels.sql');
const endpoint=(method='GET',path=MULTICREW_PATH)=>new Request('https://rift-runner.gambizt3.workers.dev'+path,{method});
const identity={version:1,vessel:{id:'rift-carrier',designation:'Rift Carrier',name:null,kind:'carrier',vesselClass:'Carrier',profession:'Military',admiral:null},access:'guest'};
function dbFixture(t){
 const db=new DatabaseSync(':memory:');
 db.exec('PRAGMA foreign_keys=ON;'+prior);
 t.after(()=>db.close());
 let reads=0;
 const env={GALAXY_DB:{prepare(query){
  assert.match(query,/^SELECT vessel_id,designation,vessel_name,vessel_class,profession,admiral,vessel_kind FROM rift_multicrew_vessel WHERE vessel_id=\?1$/);
  return {bind(id){return {async first(){reads++;return db.prepare(query).get({'1':id});}};}};
 }}};
 return {db,env,reads:()=>reads,carrier:()=>({...db.prepare('SELECT * FROM rift_galaxy_carrier WHERE carrier_id=?').get('rift-carrier')})};
}
test('idempotent vessel seed references the existing stable carrier and preserves its exact movement row',t=>{
 const s=dbFixture(t);const movement=s.carrier();
 s.db.exec(sql);s.db.exec(sql);
 assert.deepEqual(s.carrier(),movement);
 assert.deepEqual({...s.db.prepare('SELECT * FROM rift_multicrew_vessel').get()},
  {vessel_id:'rift-carrier',designation:'Rift Carrier',vessel_name:null,vessel_class:'Carrier',profession:'Military',admiral:null,vessel_kind:'carrier',galaxy_carrier_id:'rift-carrier'});
 assert.throws(()=>s.db.exec("DELETE FROM rift_galaxy_carrier WHERE carrier_id='rift-carrier'"),/FOREIGN KEY/);
 assert.throws(()=>s.db.exec("INSERT INTO rift_multicrew_vessel VALUES ('ghost','No carrier',NULL,'Capital','Support',NULL,'capital','ghost')"),/FOREIGN KEY/);
 s.db.exec("INSERT INTO rift_multicrew_vessel VALUES ('future-ship','Future multicrew vessel',NULL,'Support craft','Support',NULL,'multicrew',NULL)");
 assert.equal(s.db.prepare('SELECT count(*) AS total FROM rift_multicrew_vessel').get().total,2);
});

test('GET exposes exactly the official public identity where movement and account data stay private',async t=>{
 const s=dbFixture(t);s.db.exec(sql);
 s.db.exec("UPDATE rift_galaxy_carrier SET guild_id='internal-example'");
 s.db.exec("INSERT INTO rift_multicrew_vessel VALUES ('same-room-secret','Not yet public',NULL,'Capital','Support',NULL,'capital',NULL)");
 const response=await handleMulticrew(endpoint(),s.env);
 assert.equal(response.status,200);assert.equal(response.headers.get('access-control-allow-origin'),'https://rift-runner.boundlessghost16.chatgpt.site');
 assert.equal(response.headers.get('cache-control'),'no-store');
 assert.equal(response.headers.has('access-control-allow-credentials'),false);
 assert.deepEqual(await response.json(),identity);
 assert.equal(await handleMulticrew(endpoint('GET','/api/multicrew/vessels/same-room-secret'),s.env),null);
 assert.equal(await handleMulticrew(endpoint('GET','/api/galaxy/carrier'),s.env),null);
 for(const method of ['POST','PUT','DELETE','HEAD']){
  const invalid=await handleMulticrew(endpoint(method),s.env);assert.equal(invalid.status,405);
  assert.equal(invalid.headers.get('allow'),'GET');
 }
 assert.equal(s.reads(),1,'unrecognized paths and mutations make no DB read or write');
});

test('missing binding, unapplied migration and DB errors are honestly unavailable',async t=>{
 const s=dbFixture(t);
 for(const env of [{},s.env,{GALAXY_DB:{prepare(){throw Error('private persistence error');}}}]){
  const r=await handleMulticrew(endpoint(),env);
  assert.equal(r.status,503);assert.equal(r.headers.get('retry-after'),'30');
  assert.deepEqual(await r.json(),{error:'MULTICREW_UNAVAILABLE'});
 }
});

test('phone-friendly vessel page uses the exact shared public API and requests no credentials',async()=>{
 const html=read('dist/carrier-multicrew.html'),carrier=read('dist/carrier.html');
 assert.match(carrier,/<details class="carrier-interior"[\s\S]*?<a [^>]+id="carrier-multicrew" href="\.\/carrier-multicrew\.html">Multicrew<\/a>[\s\S]*?<\/details>/);
 assert.match(html,/viewport-fit=cover/);assert.match(html,/env\(safe-area-inset-left\)/);
 assert.match(html,/<a href="\.\/carrier\.html">/);
 assert.match(html,/Guest aboard/);assert.match(html,/Joining is not open yet/);
 assert.doesNotMatch(html,/guild|localStorage|sessionStorage|credential.?=|<form\b/i);
 const script=html.match(/<script>([^]*?)<\/script>/)[1];
 async function run(hostname,result,apiBody=identity){
  const nodes=Object.fromEntries(['vessel','state','name','class','profession','admiral'].map(id=>['multicrew-'+id,{}])),calls=[];
  await vm.runInNewContext(script,{
   document:{getElementById:k=>nodes[k]},window:{location:{hostname}},
   async fetch(url,options){calls.push({url,...options});return {ok:result,json:async()=>apiBody};}
  });
  return {calls,title:nodes['multicrew-vessel'],status:nodes['multicrew-state'],nodes};
 }
 const origin='https://rift-runner.gambizt3.workers.dev',privateHost='rift-runner.boundlessghost16.chatgpt.site';
 const same=await run('rift-runner.gambizt3.workers.dev',true),cross=await run(privateHost,true);
 assert.deepEqual(same.calls,[{url:MULTICREW_PATH,credentials:'omit',cache:'no-store',redirect:'error'}]);
 assert.equal(cross.calls[0].url,origin+MULTICREW_PATH);
 assert.equal(cross.status.textContent,'Vessel registry connected.');
 assert.equal(cross.title.textContent,'Rift Carrier');
 assert.equal(cross.nodes['multicrew-name'].textContent,'Not named yet');
 assert.equal(cross.nodes['multicrew-class'].textContent,'Carrier');
 assert.equal(cross.nodes['multicrew-admiral'].textContent,'Unassigned');
 assert.equal(cross.nodes['multicrew-profession'].textContent,'Military');
 const other=await run(privateHost+'.invalid',false);
 assert.equal(other.calls[0].url,MULTICREW_PATH,'only exact shipped private host uses the public registry origin');
 assert.equal(other.status.textContent,'Vessel registry unavailable.');
 const malformed=await run(privateHost,true,{...identity,vessel:{...identity.vessel,id:'other-vessel'}});
 assert.equal(malformed.status.textContent,'Vessel registry unavailable.');
});

test('Pegasus registry metadata never changes ship position or grants command permissions',async t=>{
 const s=dbFixture(t);const movement=s.carrier();
 s.db.exec(sql);const registration=read('migrations/003_multicrew_pegasus.sql');
 s.db.exec(registration);s.db.exec(registration);
 const {vessel,access}=await (await handleMulticrew(endpoint(),s.env)).json();
 assert.deepEqual(vessel,{...identity.vessel,name:'Pegasus',vesselClass:'Pegasus-class carrier',admiral:'Bishop'});
 assert.equal(access,'guest');assert.deepEqual(s.carrier(),movement);
 s.db.exec("UPDATE rift_multicrew_vessel SET vessel_name='Future rename',admiral='Another officer' WHERE vessel_id='rift-carrier'");
 s.db.exec(registration);
 assert.equal(s.db.prepare('SELECT vessel_name FROM rift_multicrew_vessel').get().vessel_name,'Future rename');
 assert.equal(s.db.prepare('SELECT admiral FROM rift_multicrew_vessel').get().admiral,'Another officer');
});
