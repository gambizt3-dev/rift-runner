'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const code=fs.readFileSync(path.join(__dirname,'../dist/fighter-parking.js'),'utf8');
const hull='rift-fighter',gen='rift-runner.character-generation.v1',access='rift-runner.fighter-parking-access.v1',key='rift-runner.fighter-parking.v1.'+hull;
function setup(initial=[],hostname='rift-runner.gambizt3.workers.dev'){
 const disk=new Map([[gen,'pilot-1'],...initial]),calls=[],writes=[],queue=[];
 const window={location:{hostname},crypto:{getRandomValues:bytes=>bytes.fill(37)},localStorage:{getItem:k=>disk.get(k)??null,setItem:(k,v)=>{disk.set(k,v);writes.push(k);}},
  fetch:async(url,options)=>{
   calls.push({url,...options});
   const reply=queue.shift();if(!reply)throw Error('Offline');
   return typeof reply==='function'?reply():reply;
  }};
 vm.runInNewContext(code,{window});
 const reply=(status,parking,id=hull)=>queue.push({status,json:async()=>({version:1,hull:id,parking})});
 return {disk,calls,writes,reply,queue,api:window.RiftFighterParking};
}
const legacy=JSON.stringify({version:1,hull,generation:'pilot-1',vessel:'bifrost'});
test('anonymous read-only use neither provisions a token nor promotes a legacy berth',async()=>{
 const q=setup([[key,legacy]]);
 assert.equal(q.api.get(hull),'bifrost');
 assert.equal(q.api.details(hull).bay,null);
 assert.equal((await q.api.hydrate(hull)).status,'unavailable');
 assert.deepEqual(q.writes,[]);assert.deepEqual(q.calls,[]);
});
test('opted-in legacy migration requires authoritative null and caches the assigned bay',async()=>{
 const q=setup([[key,legacy]],'rift-runner.boundlessghost16.chatgpt.site');
 q.reply(200,null);q.reply(200,{vessel:'bifrost',bay:4,revision:1});
 assert.equal((await q.api.hydrate(hull,{migrate:true})).status,'ok');
 assert.equal(q.calls[0].url,'https://rift-runner.gambizt3.workers.dev/api/fighter-parking/rift-fighter');
 assert.equal(q.calls[0].headers.Authorization,'Bearer '+'25'.repeat(32));
 assert.equal(q.calls[1].body,'{"vessel":"bifrost","expectedRevision":0}');
 assert.equal(q.api.details(hull).bay,4);
 q.reply(200,{vessel:'bifrost',bay:4,revision:1});
 const n=q.writes.length;await q.api.hydrate(hull);assert.equal(q.writes.length,n,'same receipt does not churn storage');
});
test('first save requires GET and confirmed target receipt; offline first store does not record parking',async()=>{
 const q=setup();
 assert.equal((await q.api.save(hull,'bifrost')).status,'unavailable');
 assert.equal(q.calls.at(-1).method,'GET');assert.equal(q.disk.has(key),false);
 q.reply(200,null);q.reply(200,{vessel:'rift-carrier',bay:1,revision:1});
 assert.equal((await q.api.save(hull,'bifrost')).status,'unavailable');
 assert.equal(q.disk.has(key),false);
 q.reply(200,null);q.reply(200,{vessel:'bifrost',bay:6,revision:1});
 assert.equal((await q.api.save(hull,'bifrost')).status,'ok');assert.equal(q.api.get(hull),'bifrost');
});
test('stale store reports conflict, adopts the server bay, and never retries a write',async()=>{
 const q=setup([[key,JSON.stringify({version:1,hull,generation:'pilot-1',vessel:'bifrost',bay:2,revision:1})],
  [access,JSON.stringify({generation:'pilot-1',bearer:'aa'.repeat(32)})]]);
 q.reply(409,{vessel:'bifrost',bay:4,revision:2});
 const result=await q.api.save(hull,'rift-carrier',{expectedVessel:'bifrost',expectedRevision:1});
 assert.equal(result.status,'conflict');assert.equal(q.api.details(hull).bay,4);
 assert.equal(q.calls.length,1);assert.equal(q.calls[0].body,'{"vessel":"rift-carrier","expectedRevision":1}');
 assert.equal((await q.api.save(hull,'rift-carrier',{expectedRevision:1})).status,'conflict');
 assert.equal(q.calls.length,1);
});
test('profile generation changes invalidate prior receipts and tokens',async()=>{
 const q=setup([[access,JSON.stringify({generation:'pilot-1',bearer:'ab'.repeat(32)})]]);
 q.queue.push(()=>{q.disk.set(gen,'pilot-2');return {status:200,json:async()=>({version:1,hull,parking:{vessel:'bifrost',bay:2,revision:1}})};});
 assert.equal((await q.api.hydrate(hull)).status,'unavailable');assert.equal(q.disk.has(key),false);
 await q.api.hydrate(hull);assert.equal(q.calls.length,1,'old token is not used again');
});
