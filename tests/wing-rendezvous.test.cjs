'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),test=require('node:test'),vm=require('node:vm');
const site=['../dist','..'].map(p=>path.join(__dirname,p)).find(p=>fs.existsSync(path.join(p,'wing-rendezvous.js')));
const script=fs.readFileSync(path.join(site,'wing-rendezvous.js'),'utf8');
const generation='rift-runner.character-generation.v1';
function open(data=new Map()){
 const window={localStorage:{getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)}};
 vm.runInNewContext(script,{window});
 return {api:window.RiftRendezvous,window,data};
}
const json=x=>JSON.parse(JSON.stringify(x));
test('new missions use the pinboard and observation table and old missions keep their progress',()=>{
 const a=open(new Map([[generation,'char-a']])),quest=a.api.accept('char-a');
 assert.deepEqual(json(quest.rooms),{aya:'common',ellis:'observation'});
 assert.deepEqual(json(quest.met),{aya:false,ellis:false});
 assert.equal(quest.completedAt,null);
 const legacy={version:1,generation:'char-a',...quest,rooms:{aya:'observation',ellis:'galley'},met:{aya:true,ellis:false}};
 a.data.set(a.api.key,JSON.stringify(legacy));
 const b=open(a.data),restored=b.api.get();
 assert.deepEqual(json(restored.rooms),{aya:'common',ellis:'observation'});
 assert.deepEqual(json(restored.met),{aya:true,ellis:false});
 assert.equal(restored.acceptedAt,quest.acceptedAt);
 assert.equal(b.api.meet('ellis','galley','char-a',quest.acceptedAt),null);
 assert.ok(b.api.meet('ellis','observation','char-a',quest.acceptedAt).completedAt>=quest.acceptedAt);
});
test('only current assigned rooms count, either order works and both contacts complete exactly once',()=>{
 const {api,data}=open(new Map([[generation,'char-a']]));
 assert.equal(api.meet('aya','berths','char-a',1),null,'must accept on the bridge first');
 const a=api.accept('char-a'),t=a.acceptedAt;
 assert.equal(api.meet('prototype','berths','char-a',t),null);
 assert.equal(api.meet('aya','berths','char-a',t),null);
 assert.equal(api.meet('ellis','observation','stale',t),null);
 assert.equal(api.meet('ellis','observation','char-a',t+1),null);
 const b=api.meet('ellis','observation','char-a',t);
 assert.deepEqual(json(b.met),{aya:false,ellis:true});assert.equal(b.completedAt,null);
 const c=api.meet('aya','common','char-a',t);
 assert.ok(c.completedAt>=t);
 const saved=data.get(api.key);
 assert.equal(api.meet('aya','common','char-a',t).completedAt,c.completedAt);
 assert.equal(data.get(api.key),saved);
 data.set(generation,'char-b');
 assert.equal(api.get(),null);
 assert.equal(api.meet('ellis','observation','char-a',t),null);
});
test('unavailable or corrupt storage cannot silently accept meetings or form a wing',()=>{
 const {api,window,data}=open(new Map());
 window.localStorage.setItem=()=>{throw Error('Quota');};
 assert.equal(api.accept(null),null);
 assert.equal(api.get(),null);
 window.localStorage.setItem=(k,v)=>data.set(k,v);
 const a=api.accept(null);
 window.localStorage.setItem=()=>{throw Error('Quota');};
 assert.equal(api.meet('aya','common',null,a.acceptedAt),null);
 assert.equal(api.get().met.aya,false);
 data.set(api.key,JSON.stringify({version:1,generation:null,...a,rooms:{aya:'berths',ellis:'berths'}}));
 assert.equal(api.get(),null);
});
