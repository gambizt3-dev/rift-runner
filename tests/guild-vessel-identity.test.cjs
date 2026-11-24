'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm');
const {readFileSync}=require('node:fs'),path=require('node:path');
const program=readFileSync(path.join(__dirname,'../dist/guild-vessel-identity.js'),'utf8');
const clean=x=>JSON.parse(JSON.stringify(x));
function run(hostname='rift.example',fetch){
 const window={location:{hostname},fetch};
 vm.runInNewContext(program,{window});return window.RiftVesselIdentity;
}
test('public seeds preserve physical carrier and commander identity under the shared Federal Navy guild',()=>{
 const api=run();
 assert.deepEqual(clean(api.ids),['rift-carrier','bifrost']);
 for(const [id,name,commanderId] of [['rift-carrier','Pegasus','bishop'],['bifrost','Bifrost','adaline']]){
  const record=api.get(id);
  assert.equal(record.vessel.id,id);assert.equal(record.vessel.locationVesselId,id);assert.deepEqual(clean(record.vessel.crewRefs),[]);assert.equal(record.vessel.name,name);assert.equal(record.vessel.profession,'Military');
  assert.deepEqual(clean(record.guild),{id:'federal-navy',name:'Federal Navy',type:'military'});
  assert.equal(record.vessel.guildId,'federal-navy');assert.equal(record.guildLabel,'Federal Navy');
  assert.equal(record.commander.id,commanderId);assert.equal(record.commander.title,'Admiral');
  assert.ok(Object.isFrozen(record)&&Object.isFrozen(record.vessel)&&Object.isFrozen(record.commander));
 }
 assert.deepEqual(clean(api.listGuild('federal-navy')).map(record=>record.vessel.id),['rift-carrier','bifrost']);
 assert.equal(api.get('pegasus'),null);
});
test('one guild can own separately identified vessels; replacing one preserves guild without copying assignments',()=>{
 const api=run(),guild={id:'fixture-guild',name:'Fixture Guild',type:'military',members:['fixture-pilot']};
 const c1={id:'c1',name:'One',title:'Captain'},c2={id:'c2',name:'Two',title:'Captain'};
 const vessel=(id,commanderId)=>({id,name:'Same class',designation:'Same class',kind:'frigate',vesselClass:'Frigate',profession:'Military',
  guildId:guild.id,commanderId,location:{sector:2},fighters:['owned'],crewRefs:['fixture-pilot']});
 const prior=api.createModel({guilds:[guild],commanders:[c1,c2],vessels:[vessel('v1','c1'),vessel('v2','c2')]});
 assert.deepEqual(clean(prior.listGuild(guild.id)).map(x=>[x.vessel.id,x.commander.id]),[['v1','c1'],['v2','c2']]);
 const loc=new Map([['v1',{sector:'reach'}]]),dockedFighters=new Map([['owned','v1']]);
 const next=prior.replaceVessel('v1',vessel('v3','c2'));
 assert.equal(prior.get('v1').commander.id,'c1');assert.equal(next.get('v1'),null);
 assert.deepEqual(clean(next.listGuild(guild.id)).map(x=>x.vessel.id),['v2','v3']);
 assert.deepEqual(clean(next.get('v3').guild),{id:guild.id,name:guild.name,type:guild.type});
 assert.deepEqual(clean(prior.get('v1').vessel.crewRefs),['fixture-pilot']);
 assert.deepEqual(clean(next.get('v3').vessel.crewRefs),[]);
 assert.ok(Object.isFrozen(next.get('v3').vessel.crewRefs));
 assert.equal(next.get('v3').vessel.locationVesselId,'v3');
 assert.equal(loc.has('v3'),false);
 assert.deepEqual(loc.get('v1'),{sector:'reach'});
 assert.equal(dockedFighters.get('owned'),'v1');
 assert.doesNotMatch(JSON.stringify(next.get('v3')),/fighters|members|sector/);
 assert.throws(()=>prior.replaceVessel('v1',vessel('v1','c2')),/Invalid vessel replacement/);
 assert.throws(()=>prior.replaceVessel('v1',{...vessel('v3','c2'),guildId:null}),/Invalid vessel replacement/);
});
test('public identity loader validates exact vessel and does not trust embedded memberships or location',async()=>{
 const calls=[];
 const valid={id:'bifrost',name:'Bifrost',designation:'Bifrost',kind:'carrier',vesselClass:'Bifrost-class carrier',profession:'Military',admiral:'Adaline'};
 let payload={version:1,access:'guest',vessel:{...valid,guildId:'not-verified',location:{x:2}}};
 const api=run('rift-runner.boundlessghost16.chatgpt.site',async(url,options)=>{calls.push([url,options]);return {ok:true,json:async()=>payload};});
 const [a,b]=await Promise.all([api.load('bifrost'),api.load('bifrost')]);
 assert.deepEqual(clean(calls),[['https://rift-runner.gambizt3.workers.dev/api/multicrew/vessels/bifrost',{credentials:'omit',cache:'no-store',redirect:'error'}]]);
 assert.equal(a,b);assert.equal(a.status,'live');assert.equal(a.guild.id,'federal-navy');assert.equal(a.commander.id,'adaline');assert.equal(a.vessel.location,undefined);
 assert.equal(await api.load('unknown'),null);
 payload={...payload,vessel:{...valid,id:'rift-carrier'}};assert.equal((await api.load('bifrost')).status,'fallback');
 payload={...payload,vessel:{...valid,admiral:'Someone New'}};const newCommander=(await api.load('bifrost')).commander;
 assert.equal(newCommander.name,'Someone New');assert.equal(newCommander.id,null);
 payload={...payload,vessel:{...valid,admiral:null}};assert.equal((await api.load('bifrost')).commander,null);
 const offline=run('rift-runner.boundlessghost16.chatgpt.site.spoof',async url=>{assert.ok(url.startsWith('/api/'));throw Error('offline');});
 assert.equal((await offline.load('rift-carrier')).status,'fallback');
});
