'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),test=require('node:test'),vm=require('node:vm');
const site=['../dist','..'].map(p=>path.join(__dirname,p)).find(p=>fs.existsSync(path.join(p,'wing-rendezvous.js')));
const script=fs.readFileSync(path.join(site,'wing-rendezvous.js'),'utf8');
const generation='rift-runner.character-generation.v1';
function open(data=new Map(),draws=[0,0]){
 const window={localStorage:{getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)}};
 const random=()=>{assert.ok(draws.length,'no reroll should be needed');return draws.shift();};
 const MathWithRandom=Object.create(Math,{random:{value:random}});
 vm.runInNewContext(script,{window,Math:MathWithRandom});
 return {api:window.RiftRendezvous,window,data};
}
const json=x=>JSON.parse(JSON.stringify(x));
test('accept samples distinct rest rooms and never rerolls across reload or duplicate acceptance',()=>{
 const a=open(new Map([[generation,'char-a']]),[.999,.999]),quest=a.api.accept('char-a');
 assert.deepEqual(json(quest.rooms),{aya:'observation',ellis:'galley'});
 assert.deepEqual(json(quest.met),{aya:false,ellis:false});
 assert.equal(quest.completedAt,null);
 const b=open(a.data,[]);
 assert.deepEqual(json(b.api.get()),json(quest));
 assert.deepEqual(json(b.api.accept('char-a')),json(quest));
 const c=open(new Map(),[0,0]);
 assert.deepEqual(json(c.api.accept(null).rooms),{aya:'berths',ellis:'common'});
});
test('only current assigned rooms count, either order works and both contacts complete exactly once',()=>{
 const {api,data}=open(new Map([[generation,'char-a']]));
 assert.equal(api.meet('aya','berths','char-a',1),null,'must accept on the bridge first');
 const a=api.accept('char-a'),t=a.acceptedAt;
 assert.equal(api.meet('prototype','berths','char-a',t),null);
 assert.equal(api.meet('aya','common','char-a',t),null);
 assert.equal(api.meet('ellis','common','stale',t),null);
 assert.equal(api.meet('ellis','common','char-a',t+1),null);
 const b=api.meet('ellis','common','char-a',t);
 assert.deepEqual(json(b.met),{aya:false,ellis:true});assert.equal(b.completedAt,null);
 const c=api.meet('aya','berths','char-a',t);
 assert.ok(c.completedAt>=t);
 const saved=data.get(api.key);
 assert.equal(api.meet('aya','berths','char-a',t).completedAt,c.completedAt);
 assert.equal(data.get(api.key),saved);
 data.set(generation,'char-b');
 assert.equal(api.get(),null);
 assert.equal(api.meet('ellis','common','char-a',t),null);
});
test('unavailable or corrupt storage cannot silently accept meetings or form a wing',()=>{
 const {api,window,data}=open(new Map(),[0,0,0,0]);
 window.localStorage.setItem=()=>{throw Error('Quota');};
 assert.equal(api.accept(null),null);
 assert.equal(api.get(),null);
 window.localStorage.setItem=(k,v)=>data.set(k,v);
 const a=api.accept(null);
 window.localStorage.setItem=()=>{throw Error('Quota');};
 assert.equal(api.meet('aya','berths',null,a.acceptedAt),null);
 assert.equal(api.get().met.aya,false);
 data.set(api.key,JSON.stringify({version:1,generation:null,...a,rooms:{aya:'berths',ellis:'berths'}}));
 assert.equal(api.get(),null);
});
