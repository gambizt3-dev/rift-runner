import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {handleCarrierStats} from '../server/carrier-stats.mjs';

const site='https://rift-runner.boundlessghost16.chatgpt.site',host='https://rift-runner.gambizt3.workers.dev';
function fixture(t){
 const db=new DatabaseSync(':memory:');t.after(()=>db.close());
 const migration=id=>db.exec(readFileSync(new URL('../migrations/'+id+'.sql',import.meta.url),'utf8'));
 migration('006_fighter_parking');migration('009_carrier_supplies');
 const env={GALAXY_DB:{prepare(q){return {bind(v){return {first:async()=>db.prepare(q).get({1:v})};}};}}};
 const fetch=(id,method='GET',origin=site,query='')=>handleCarrierStats(
  new Request(host+'/api/multicrew/vessels/'+id+'/stats'+query,{method,headers:{origin}}),env);
 const park=(secret,hull,vessel,bay)=>db.prepare('INSERT INTO rift_fighter_parking VALUES(?,?,?,?,1)').run(secret.repeat(64),hull,vessel,bay);
 return {db,fetch,park,migration};
}
test('stocks seed once and distinct berth owners count independently on each carrier',async t=>{
 const {db,fetch,park,migration}=fixture(t);
 db.exec("UPDATE rift_carrier_supplies SET supply=93 WHERE vessel_id='bifrost'");
 migration('009_carrier_supplies');
 park('a','rift-fighter','rift-carrier',1);
 park('a','bastion-9','rift-carrier',2);
 park('b','rift-fighter','rift-carrier',1);
 park('a','stocky-light-fighter','bifrost',4);
 const pegasus=await fetch('rift-carrier');
 assert.equal(pegasus.headers.get('access-control-allow-origin'),site);
 assert.equal(pegasus.headers.get('access-control-allow-credentials'),null);
 assert.equal(pegasus.headers.get('cache-control'),'public, max-age=15');
 assert.deepEqual(await pegasus.json(),{version:1,vesselId:'rift-carrier',supply:100,playerPilotsAboard:2});
 assert.deepEqual(await (await fetch('bifrost')).json(),{version:1,vesselId:'bifrost',supply:93,playerPilotsAboard:1});
 db.exec("UPDATE rift_fighter_parking SET vessel_id='bifrost' WHERE namespace_hash LIKE 'b%'");
 assert.equal((await (await fetch('rift-carrier')).json()).playerPilotsAboard,1);
 assert.equal((await (await fetch('bifrost')).json()).playerPilotsAboard,2);
});
test('other routes are unclaimed and writes, cross-origin access, and missing stock fail closed',async t=>{
 const {db,fetch}=fixture(t);
 assert.equal(await fetch('blackwake'),null);
 assert.equal((await fetch('bifrost','POST')).status,405);
 assert.equal((await fetch('bifrost','GET','https://example.com')).status,403);
 assert.equal((await fetch('bifrost','GET',site,'?roster=true')).status,400);
 db.exec("DELETE FROM rift_carrier_supplies WHERE vessel_id='bifrost'");
 const failure=await fetch('bifrost');
 assert.equal(failure.status,503);
 assert.equal(failure.headers.get('cache-control'),'no-store');
 assert.deepEqual(await failure.json(),{error:'CARRIER_STATS_UNAVAILABLE'});
});
