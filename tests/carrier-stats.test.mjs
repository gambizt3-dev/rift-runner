import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {handleCarrierStats} from '../server/carrier-stats.mjs';

const site='https://rift-runner.boundlessghost16.chatgpt.site',host='https://rift-runner.gambizt3.workers.dev';
const pegasusArmada={vesselCount:2,vessels:[
 {id:'rift-carrier',name:'Pegasus',vesselClass:'Pegasus-class carrier',role:'command',forward:0,lateral:0},
 {id:'pegasus-corvette-escort',name:'Corvette Escort',vesselClass:'Corvette',role:'escort',forward:-55,lateral:42}
]};
const bifrostArmada={vesselCount:1,vessels:[
 {id:'bifrost',name:'Bifrost',vesselClass:'Bifrost-class carrier',role:'command',forward:0,lateral:0}
]};
function fixture(t){
 const db=new DatabaseSync(':memory:');t.after(()=>db.close());
 const migration=id=>db.exec(readFileSync(new URL('../migrations/'+id+'.sql',import.meta.url),'utf8'));
 migration('006_fighter_parking');migration('008_shared_flight');migration('009_carrier_supplies');
 let now=1000000;
 const env={GALAXY_DB:{prepare(q){return {bind(v,at){return {first:async()=>db.prepare(q).get({1:v,2:at})};}};}}};
 const fetch=(id,method='GET',origin=site,query='')=>handleCarrierStats(
  new Request(host+'/api/multicrew/vessels/'+id+'/stats'+query,{method,headers:{origin}}),env,()=>now);
 const park=(secret,hull,vessel,bay)=>db.prepare('INSERT INTO rift_fighter_parking VALUES(?,?,?,?,1)').run(secret.repeat(64),hull,vessel,bay);
 return {db,fetch,park,migration,time:()=>now,advance:ms=>{now+=ms;}};
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
 assert.deepEqual(await pegasus.json(),{version:1,vesselId:'rift-carrier',armada:pegasusArmada,supply:100,playerPilotsAboard:2,playersWithInsideShips:2,npcPilotsAboard:2,carrierRift4sInside:20,playerShipsByHull:{'rift-fighter':2,'bastion-9':1,'stocky-light-fighter':0},availableShips:20,availablePilots:2,carrierFighterStock:20,manpower:40,npcPilots:{available:2,deployed:0,replenishing:0,capacity:2}});
 assert.deepEqual(await (await fetch('bifrost')).json(),{version:1,vesselId:'bifrost',armada:bifrostArmada,supply:93,playerPilotsAboard:1,playersWithInsideShips:1,npcPilotsAboard:2,carrierRift4sInside:20,playerShipsByHull:{'rift-fighter':0,'bastion-9':0,'stocky-light-fighter':1},availableShips:20,availablePilots:2,carrierFighterStock:20,manpower:40,npcPilots:{available:2,deployed:0,replenishing:0,capacity:2}});
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
test('carrier-owned Rift-4 stock minus active deployments times ready NPC pilots defines manpower',async t=>{
 const {db,fetch,park,time,advance}=fixture(t);
 park('a','rift-fighter','bifrost',1);park('b','bastion-9','bifrost',1);
 const model={status:'running',instance:'opaque',end:time()+120000,carrierStock:{bifrost:19,'rift-carrier':20},
  roster:[{vessel:'bifrost',readyAt:0,lease:'opaque'},{vessel:'bifrost',readyAt:0,lease:null}]};
 db.prepare("INSERT INTO rift_shared_flight VALUES('blackwake',1,?)").run(JSON.stringify(model));
 const stats=await (await fetch('bifrost')).json();
 assert.deepEqual(stats.armada,bifrostArmada);
 assert.equal(stats.availableShips,18);assert.equal(stats.carrierFighterStock,19);
 assert.equal(stats.availablePilots,1);assert.equal(stats.manpower,18);
 assert.equal(stats.playerPilotsAboard,2);assert.equal(JSON.stringify(stats).includes('opaque'),false);
 advance(120001);
 const stale=await (await fetch('bifrost')).json();
 assert.equal(stale.availableShips,19);assert.equal(stale.manpower,38);
});
test('counts internal hulls only and excludes the particular hull actively away in a shared round',async t=>{
 const {db,fetch,park,time,advance}=fixture(t);
 park('a','rift-fighter','bifrost',1);park('a','bastion-9','bifrost',2);park('b','stocky-light-fighter','rift-carrier',6);
 // Production storage currently rejects other bays; simulate a future exterior row.
 db.exec('PRAGMA ignore_check_constraints=ON');park('c','stocky-light-fighter','bifrost',7);db.exec('PRAGMA ignore_check_constraints=OFF');
 const model={status:'running',instance:'private-round-id',end:time()+120000,
  players:[{namespace:'a'.repeat(64),touchedAt:time(),ship:{vessel:'bifrost',hull:'rift-fighter'}},
   {namespace:'b'.repeat(64),touchedAt:time(),ship:{vessel:'bifrost',hull:'stocky-light-fighter'}}],
  roster:[{vessel:'bifrost',readyAt:0,lease:'private-round-id'},{vessel:'bifrost',readyAt:time()+120000,lease:null}]};
 db.prepare("INSERT INTO rift_shared_flight VALUES('blackwake',1,?)").run(JSON.stringify(model));
 const inside=await (await fetch('bifrost')).json();
 assert.deepEqual(inside.playerShipsByHull,{'rift-fighter':0,'bastion-9':1,'stocky-light-fighter':0});
 assert.equal(inside.playersWithInsideShips,1);
 assert.equal(inside.npcPilotsAboard,0);
 assert.equal(inside.carrierRift4sInside,19);
 assert.equal(JSON.stringify(inside).includes('private-round-id'),false);
 assert.equal(JSON.stringify(inside).includes('a'.repeat(64)),false);
 assert.equal((await (await fetch('rift-carrier')).json()).playerShipsByHull['stocky-light-fighter'],1);
 advance(30001);
 const released=await (await fetch('bifrost')).json();
 assert.equal(released.playerShipsByHull['rift-fighter'],1);
 assert.equal(released.playersWithInsideShips,1);
});
