import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import {makeGalaxyCarrierHandler,galaxyPlan,galaxySample,BIFROST_ID,BIFROST_PATH,GALAXY_PATH} from '../server/galaxy-carrier.mjs';
import {handleMulticrew,MULTICREW_PATH,MULTICREW_BIFROST_PATH} from '../server/multicrew.mjs';

const base='https://rift-runner.example';
const epoch=1795449600000;
const migration=f=>readFileSync(new URL('../migrations/'+f,import.meta.url),'utf8');
const prior=['001_galaxy_carrier.sql','002_multicrew_vessels.sql','003_multicrew_pegasus.sql'];
const feature='004_bifrost_vessel.sql';
function setup(t){
 const db=new DatabaseSync(':memory:');
 t.after(()=>db.close());
 db.exec('PRAGMA foreign_keys=ON;');
 prior.forEach(file=>db.exec(migration(file)));
 const read=(table,key,id)=>({...db.prepare('SELECT * FROM '+table+' WHERE '+key+'=?').get(id)});
 const navigation=id=>read('rift_galaxy_carrier','carrier_id',id);
 const registry=id=>read('rift_multicrew_vessel','vessel_id',id);
 const env={GALAXY_DB:{prepare(sql){
  const q=db.prepare(sql);
  return {bind(...args){
   const params=Object.fromEntries(args.map((value,index)=>[String(index+1),value]));
   return {async run(){const result=q.run(params);return {meta:{changes:result.changes}};},
    async first(){return q.get(params)??null;}};
  }};
 }}};
 return {db,navigation,registry,env,install:()=>db.exec(migration(feature))};
}

test('Bifrost migration is idempotent and leaves existing Pegasus identity and motion unchanged',t=>{
 const s=setup(t),p=s.navigation('rift-carrier'),pc=s.registry('rift-carrier');
 s.install();
 const anchor=s.navigation('bifrost'),company=s.registry('bifrost');
 assert.equal(anchor.model_version,1);
 assert.ok(anchor.seed>0);
 assert.equal(anchor.checkpoint_at_ms,anchor.epoch_ms);
 assert.deepEqual(company,{vessel_id:'bifrost',designation:'Bifrost',vessel_name:'Bifrost',
  vessel_class:'Bifrost-class carrier',profession:'Military',admiral:'Adruline',vessel_kind:'carrier',galaxy_carrier_id:'bifrost'});
 s.install();
 assert.deepEqual(s.navigation('bifrost'),anchor);
 assert.deepEqual(s.registry('bifrost'),company);
 assert.deepEqual(s.navigation('rift-carrier'),p);
 assert.deepEqual(s.registry('rift-carrier'),pc);
 assert.deepEqual(s.db.prepare('PRAGMA foreign_key_check').all(),[]);
});

test('separate persistent route is repeatable, traverses both sectors, and crosses in sync for independent clients',async t=>{
 const s=setup(t);s.install();
 s.db.prepare('UPDATE rift_galaxy_carrier SET seed=?,epoch_ms=?,checkpoint_at_ms=?').run(18977,epoch,epoch);
 const route=galaxyPlan(18977,'bifrost'),pegasus=galaxyPlan(18977);
 assert.notDeepEqual(route.segments,pegasus.segments);
 const frontier=route.segments.find(seg=>seg.sector==='frontier');
 assert.ok(frontier&&route.segments.some(seg=>seg.sector==='reach'));
 let time=epoch+frontier.startAt+5700;
 const make=()=>makeGalaxyCarrierHandler({id:BIFROST_ID,path:BIFROST_PATH,clock:()=>time,logger:{warn(){}}});
 const read=async handler=>{
  const r=await handler(new Request(base+BIFROST_PATH),s.env);
  assert.equal(r.status,200);
  assert.equal(r.headers.get('cache-control'),'no-store');
  return r.json();
 };
 const one=make(),two=make(),point=await read(one);
 assert.equal(point.carrier.id,'bifrost');
 assert.equal(point.carrier.sector,'frontier');
 assert.equal(point.carrier.corsairSurveyed,false);
 assert.deepEqual(await read(two),point);
 assert.deepEqual(point,galaxySample(route,epoch,time,BIFROST_ID));
 assert.ok(point.trajectory.at(-1).endAt>=time+45000);
 const pegasusBefore=s.navigation('rift-carrier');
 time+=3*3600000;
 const later=await read(one);
 assert.notDeepEqual(later.carrier,point.carrier);
 assert.equal(s.navigation('bifrost').checkpoint_at_ms,time);
 assert.equal(s.navigation('bifrost').checkpoint_x,later.carrier.x);
 assert.deepEqual(s.navigation('rift-carrier'),pegasusBefore);
 assert.equal(await one(new Request(base+GALAXY_PATH),s.env),null);
 assert.equal((await one(new Request(base+BIFROST_PATH,{method:'POST'}),s.env)).status,405);
});

test('registry allows Bifrost and Pegasus lookup but never public access to other inserted rows or mutation',async t=>{
 const s=setup(t);s.install();
 s.db.exec("INSERT INTO rift_multicrew_vessel VALUES ('private','Private',NULL,'Carrier','Military',NULL,'carrier',NULL)");
 const publicRow=await handleMulticrew(new Request(base+MULTICREW_BIFROST_PATH),s.env);
 assert.equal(publicRow.status,200);
 assert.deepEqual(await publicRow.json(),{version:1,vessel:{id:'bifrost',designation:'Bifrost',name:'Bifrost',
  kind:'carrier',vesselClass:'Bifrost-class carrier',profession:'Military',admiral:'Adruline'},access:'guest'});
 assert.equal((await handleMulticrew(new Request(base+MULTICREW_PATH),s.env)).status,200);
 assert.equal(await handleMulticrew(new Request(base+'/api/multicrew/vessels/private'),s.env),null);
 assert.equal((await handleMulticrew(new Request(base+MULTICREW_BIFROST_PATH,{method:'POST'}),s.env)).status,405);
});

test('Adaline rename is idempotent and does not change Bifrost course or Pegasus identity',async t=>{
 const s=setup(t);s.install();
 const before=s.navigation('bifrost'),p=s.registry('rift-carrier');
 const rename=migration('005_bifrost_adaline.sql');s.db.exec(rename);s.db.exec(rename);
 const response=await handleMulticrew(new Request(base+MULTICREW_BIFROST_PATH),s.env);
 assert.equal((await response.json()).vessel.admiral,'Adaline');
 assert.deepEqual(s.navigation('bifrost'),before);
 assert.deepEqual(s.registry('rift-carrier'),p);
});
