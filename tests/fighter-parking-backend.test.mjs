import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import {handleFighterParking} from '../server/fighter-parking.mjs';
const site='https://rift-runner.boundlessghost16.chatgpt.site',worker='https://rift-runner.gambizt3.workers.dev';
const alpha='7b'.repeat(32),beta='5a'.repeat(32);
const sql=readFileSync(new URL('../migrations/006_fighter_parking.sql',import.meta.url),'utf8');
function setup(t){
 const db=new DatabaseSync(':memory:');t.after(()=>db.close());
 db.exec(sql);db.exec(sql); // Safe to replay without changing records.
 const binding={prepare(query){const stmt=db.prepare(query);return {bind(...args){return {first:async()=>stmt.get(Object.fromEntries(args.map((a,n)=>[String(n+1),a])))??null};}};}};
 const env={GALAXY_DB:binding};
 function request({hull='rift-fighter',method='GET',secret=alpha,origin=site,body,headers={},suffix=''}={}){
  return new Request(worker+'/api/fighter-parking/'+hull+suffix,{method,headers:{
   ...(secret?{authorization:'Bearer '+secret}:{}),...(origin?{origin}:{}),
   ...(body?{'content-type':'application/json'}:{}),...headers
  },...(body?{body:typeof body==='string'?body:JSON.stringify(body)}:{})});
 }
 const call=(options={},en=env)=>handleFighterParking(request(options),en);
 const put=(vessel,expectedRevision,options)=>call({method:'PUT',body:{vessel,expectedRevision},...options});
 return {db,call,put};
}
test('first parking preserves a legacy Bifrost destination, and retries do not reorder or allocate another bay',async t=>{
 const {db,call,put}=setup(t);
 assert.deepEqual(await (await call()).json(),{version:1,hull:'rift-fighter',parking:null});
 const result=await put('bifrost',0),record=await result.json();
 assert.equal(result.status,200);assert.equal(result.headers.get('cache-control'),'private, no-store');
 assert.equal(result.headers.get('access-control-allow-origin'),site);
 assert.equal(result.headers.get('access-control-allow-credentials'),null);
 assert.equal(record.parking.vessel,'bifrost');assert.equal(record.parking.revision,1);
 assert.ok([1,2,4,6].includes(record.parking.bay));
 assert.deepEqual(await (await put('bifrost',1)).json(),record);
 const stale=await put('rift-carrier',0);assert.equal(stale.status,409);assert.deepEqual(await stale.json(),record);
 assert.deepEqual(await (await call()).json(),record);
 const row=db.prepare('select * from rift_fighter_parking').get();
 assert.equal(row.namespace_hash,createHash('sha256').update('rift-runner:fighter-parking:v1:'+alpha).digest('hex'));
 assert.ok(!JSON.stringify(row).includes(alpha));
});
test('known hulls on one carrier get distinct bays per browser and competing moves use exact revisions',async t=>{
 const {call,put}=setup(t);
 const hulls=['rift-fighter','bastion-9','stocky-light-fighter'];
 const results=await Promise.all(hulls.map(hull=>put('bifrost',0,{hull})));
 assert.ok(results.every(result=>result.status===200));
 const parked=await Promise.all(results.map(x=>x.json()));
 assert.equal(new Set(parked.map(x=>x.parking.bay)).size,3);
 assert.deepEqual(await (await call({secret:beta})).json(),{version:1,hull:'rift-fighter',parking:null});
 assert.equal((await put('bifrost',0,{secret:beta})).status,200);
 const [a,b]=await Promise.all([put('rift-carrier',1),put('rift-carrier',1)]);
 assert.deepEqual([a.status,b.status].sort(),[200,409]);
 const final=await (await call()).json();
 assert.equal(final.parking.vessel,'rift-carrier');assert.equal(final.parking.revision,2);
 assert.equal((await (await call({secret:beta})).json()).parking.vessel,'bifrost');
});
test('endpoint scopes origins, preflight and body to the known feature',async t=>{
 const {call,put,db}=setup(t);
 assert.equal((await call({secret:''})).status,401);
 assert.equal((await call({secret:'bad'})).status,401);
 assert.equal((await call({hull:'other'})).status,404);
 assert.equal((await call({suffix:'?token=anything'})).status,404);
 assert.equal((await call({origin:'https://other.example'})).status,403);
 assert.equal((await call({method:'POST'})).status,405);
 assert.equal((await call({},{})).status,503);
 const preflight=await call({method:'OPTIONS',secret:'',headers:{'access-control-request-method':'PUT','access-control-request-headers':'authorization, content-type'}});
 assert.equal(preflight.status,204);assert.equal(preflight.headers.get('access-control-allow-headers'),'Authorization, Content-Type');
 assert.equal((await call({method:'OPTIONS',headers:{'access-control-request-method':'DELETE'}})).status,403);
 for(const args of [[{},0],['bifrost',-1],['bifrost','0'],['unknown',0]])assert.equal((await put(...args)).status,400);
 assert.equal((await call({method:'PUT',body:{vessel:'bifrost',expectedRevision:0,bay:5}})).status,400);
 assert.equal((await call({method:'PUT',body:'{'+' '.repeat(257)+'}' })).status,400);
 assert.equal(db.prepare('SELECT COUNT(*) AS n FROM rift_fighter_parking').get().n,0);
});
