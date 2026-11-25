import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const root=new URL('../',import.meta.url);
const read=name=>readFileSync(new URL(existsSync(new URL('live/'+name,root))?'live/'+name:name,root),'utf8');
const html=read('fleet-space-beta.html'),script=read('fleet-space-beta.js');
const hull='rift-fighter',gen='qa-pilot',token='c'.repeat(64),name='Rift-3 Fighter';
function client({repair='repaired',berth='bifrost',withAccess=true,sortie=null,market=null}={}){
 const elements=Object.fromEntries([...html.matchAll(/id="([^"]+)"/g)].map(([,id])=>[id,{}]));
 const canvas={width:480,height:600,getContext:()=>new Proxy({},{get:()=>()=>{}})};
 const d={getElementById:id=>elements[id],querySelector:()=>canvas,querySelectorAll:()=>[]};
 const storage=new Map([['rift-runner.character-generation.v1',gen],
  ['rift-runner.fighter-parking-access.v1',withAccess?JSON.stringify({generation:gen,bearer:token}):null],
  ['hull',JSON.stringify({condition:repair,hull})],['fit',JSON.stringify({hull,engine:'engine',core:'core',battery:'battery'})]]);
 const calls=[],navigations=[];let tick;
 const shipId='abcdefgh-test';
 runInNewContext(script,{document:d,localStorage:{getItem:key=>storage.get(key)??null},
  location:{search:market?'?station='+market:sortie?'?sortie='+encodeURIComponent(sortie):'',assign:url=>navigations.push(url)},URLSearchParams,AbortSignal,setInterval(f){tick=f;},Image:class {},
  window:{addEventListener(){},RiftMarketStations:market?{get:id=>id===market?{id,name:'Marketplace'}:null,returnY:2150,map:{x:900,y:1000,diameter:500}}:undefined,RiftFighters:{selected:()=>hull,get:()=>({name}),hullKey:()=> 'hull',buildKey:()=> 'fit'},
   RiftFighterParking:{hydrate:async()=>({status:'ok',parking:berth?{vessel:berth,revision:1}:null})},RiftCredits:{owns:()=>true}},
  fetch:async(url,opts)=>{
   const action=url.split('/').at(-1);calls.push({url,opts});
   if(action==='station-return')return {ok:false,json:async()=>({error:'CARRIER_OUT_OF_RANGE'})};
   if(action==='to-station'||action==='station-step')return {ok:true,json:async()=>({station:market,self:shipId,lastSeq:4,state:{name:'Marketplace',ships:[{id:shipId,x:900,y:2190,phase:'station',heading:0}]}})};
   return {ok:true,json:async()=>action==='status'?{name:'Bifrost',phase:'stored',shipId}:
    action==='depart'?{sortie:{eventId:sortie}}:
    {self:shipId,docking:{place:null,inRange:false},state:{name:'Bifrost',pads:[{id:0,x:900,y:1700}],recoveryPad:0,
     ships:[{id:shipId,x:900,y:action==='launch'?155:1700,heading:0,pad:action==='launch'?null:0,
      phase:action==='store'?'stored':action==='launch'?'airborne':'pad'}]}}};
  }});
 return {elements,calls,navigations,poll:()=>tick()};
}
const flush=()=>new Promise(resolve=>setImmediate(resolve));
test('live beta uses the pilot’s confirmed carrier and returns to its actual private Hangar after confirmed store',async()=>{
 const {elements:e,calls,navigations}=client();
 await flush();assert.equal(e.hangar.hidden,false);
 assert.match(e['hangar-title'].textContent,/Bifrost/);
 assert.equal(calls[0].url,'/api/fleet-space/bifrost/status');
 assert.equal(calls[0].opts.headers.Authorization,'Bearer '+token);
 assert.deepEqual(JSON.parse(calls[0].opts.body),{hull});
 await e.enter.onclick();
 assert.equal(e.fleet.hidden,false);
 await e.store.onclick();
 assert.deepEqual(navigations,['./index.html?hangar=carrier&vessel=bifrost']);
 assert.equal(calls.map(x=>x.url.split('/').at(-1)).join(','),'status,enter,store');
});
test('missing access, unconfirmed berth and broken fighters do not join or write fleet state',async()=>{
 for(const config of [{withAccess:false},{berth:null},{repair:'damaged'}]){
  const c=client(config);await flush();assert.deepEqual(c.calls,[]);
  assert.match(c.elements.status.textContent,/Confirm your berth|Repair your selected fighter/);
 }
});
test('Galaxy beta link is scoped to a carrier contact with a confirmed fighter parking notice',()=>{
 const galaxy=read('galaxy-map.html');
 assert.match(galaxy,/<p id="location-fighter-parking" hidden><\/p>\s*<a[^>]+href="\.\/fleet-space-beta\.html"/);
 assert.match(galaxy,/#location-fighter-parking\[hidden\]\+#shared-fleet-beta\{display:none\}/);
 assert.doesNotMatch(script,/\/fixture\?/);
});

test('a chart sortie lights the gate action only after clearance and carries the same event to battle',async()=>{
 const id='corsair:reach:500000';
 const {elements:e,calls,navigations}=client({sortie:id});await flush();
 await e.enter.onclick();assert.equal(e.sortie.disabled,true);
 await e.launch.onclick();assert.equal(e.sortie.disabled,false);
 await e.sortie.onclick();assert.deepEqual(navigations,['./index.html?galaxy-event='+encodeURIComponent(id)]);
 assert.equal(JSON.parse(calls.at(-1).opts.body).eventId,id);
});

test('an out-of-range station return retains the connection and polling',async()=>{
 const {elements:e,calls,navigations,poll}=client({market:'waypost-ring'});await flush();
 await e.enter.onclick();await e.launch.onclick();await e.sortie.onclick();
 assert.equal(e.sortie.textContent,'Return to carrier');assert.equal(e.sortie.disabled,false);
 await e.sortie.onclick();
 assert.match(e.status.textContent,/carrier is out of range/);
 assert.equal(e.rejoin.disabled,true);assert.deepEqual(navigations,[]);
 await poll();assert.match(calls.at(-1).url,/station-step$/);assert.match(e.status.textContent,/carrier is out of range/);
});
