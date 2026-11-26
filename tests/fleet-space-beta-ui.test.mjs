import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const root=new URL('../',import.meta.url);
const read=name=>readFileSync(new URL(existsSync(new URL('live/'+name,root))?'live/'+name:name,root),'utf8');
const html=read('fleet-space-beta.html'),script=read('fleet-space-beta.js');
const hull='rift-fighter',gen='qa-pilot',token='c'.repeat(64),name='Rift-3 Fighter';
function client({repair='repaired',berth='bifrost',withAccess=true,radio=false,replyPose=null}={}){
 const elements=Object.fromEntries([...html.matchAll(/id="([^"]+)"/g)].map(([,id])=>[id,{}]));
 const drawn=[],markers=[],rotations=[],frames=[],timers=[];let clock=0;
 const keys=Object.fromEntries(['ArrowLeft','ArrowRight','ArrowUp'].map(key=>[key,{dataset:{key}}]));
 const canvas={width:480,height:600,getContext:()=>new Proxy({},{get:(_,method)=>method==='fillText'?(text,x,y)=>{drawn.push(text);markers.push({x,y});}:method==='rotate'?a=>rotations.push(a):method==='createLinearGradient'?()=>({addColorStop(){}}):()=>{}})};
 const d={getElementById:id=>elements[id],querySelector:()=>canvas,querySelectorAll:()=>Object.values(keys)};
 const storage=new Map([['rift-runner.character-generation.v1',gen],
  ['rift-runner.fighter-parking-access.v1',withAccess?JSON.stringify({generation:gen,bearer:token}):null],
  ['hull',JSON.stringify({condition:repair,hull})],['fit',JSON.stringify({hull,engine:'engine',core:'core',battery:'battery'})]]);
 const calls=[],navigations=[];let playCalls=0;
 elements['dock-radio-voice'].play=async()=>{if(++playCalls===1)throw Error('iPhone needs a tap');};
 const shipId='abcdefgh-test';
 runInNewContext(script,{document:d,localStorage:{getItem:key=>storage.get(key)??null},
  location:{assign:url=>navigations.push(url)},AbortSignal,performance:{now:()=>clock},requestAnimationFrame:f=>frames.push(f),setInterval:f=>timers.push(f),
  window:{addEventListener(){},RiftFighters:{selected:()=>hull,get:()=>({name}),hullKey:()=> 'hull',buildKey:()=> 'fit'},
   RiftFighterParking:{hydrate:async()=>({status:'ok',parking:berth?{vessel:berth,revision:1}:null})},RiftCredits:{owns:()=>true}},
  fetch:async(url,opts)=>{
   const action=url.split('/').at(-1);calls.push({url,opts});
   return {ok:true,json:async()=>action==='status'?{name:'Bifrost',phase:'stored',shipId}:
    {self:shipId,lastSeq:action==='step'?JSON.parse(opts.body).seq:0,docking:{place:radio&&action==='dock'?1:null,inRange:radio},state:{name:'Bifrost',pads:[{id:0,x:900,y:1700}],recoveryPad:0,
     ships:[{id:shipId,x:900,y:1700,heading:0,...(replyPose?.(action,clock,JSON.parse(opts.body))??{}),phase:action==='store'?'stored':radio&&action!=='enter'?'airborne':'pad'}]}}};
  }});
 return {elements,calls,navigations,drawn,markers,rotations,keys,poll:()=>timers[0](),plays:()=>playCalls,frame:t=>{clock=t;frames.shift()?.(t);}};
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


test('requesting docking opens Elias radio and offers a fallback tap when audio is blocked',async()=>{
 const c=client({radio:true});await flush();const e=c.elements;
 await e.enter.onclick();await e.launch.onclick();
 assert.equal(e['dock-radio'].hidden,true);
 await e.dock.onclick();await flush();
 assert.equal(e['dock-radio'].hidden,false);
 assert.match(e['dock-radio-text'].textContent,/Queue #1/);
 assert.equal(c.plays(),1);
 assert.equal(e['dock-radio-replay'].hidden,false);
 await e['dock-radio-replay'].onclick();
 assert.equal(c.plays(),2);assert.equal(e['dock-radio-replay'].hidden,true);
 await e.dock.onclick();assert.equal(e['dock-radio'].hidden,true);
});


test('shared flight marks your fighter on the deck and in flight',async()=>{
 const {elements:e,drawn}=client({radio:true});
 await flush();assert.equal(drawn.includes('YOU'),false);
 await e.enter.onclick();assert.equal(drawn.at(-1),'YOU');
 await e.launch.onclick();assert.equal(drawn.at(-1),'YOU');
 assert.match(e.status.textContent,/airborne/);
});


test('online thrust sends immediately, predicts short motion, then sends zero on release',async()=>{
 const {elements:e,calls,markers,keys,frame}=client({radio:true});
 await flush();await e.enter.onclick();await e.launch.onclick();
 e['fleet-view'].onclick();assert.equal(e['fleet-view'].textContent,'Follow my fighter');
 const anchor=markers.at(-1);
 await keys.ArrowUp.onpointerdown({pointerId:4});
 assert.deepEqual(JSON.parse(calls.at(-1).opts.body),{hull,seq:1,turn:0,thrust:1});
 frame(16);frame(64);frame(120);
 assert.ok(markers.at(-1).x>anchor.x,'visible prediction moves while awaiting a new position');
 for(let t=136;t<1000;t+=16)frame(t);
 assert.ok(markers.at(-1).x-anchor.x<16,'prediction never runs beyond the authoritative input horizon');
 await keys.ArrowUp.onpointerup();
 assert.deepEqual(JSON.parse(calls.at(-1).opts.body),{hull,seq:2,turn:0,thrust:0});
});


test('holding thrust suppresses text selection and the iOS context menu',async()=>{
 const {elements:e,keys}=client({radio:true});
 await flush();await e.enter.onclick();await e.launch.onclick();
 const control=keys.ArrowUp;
 let blocked=0;
 const event={pointerId:1,preventDefault(){blocked++;}};
 await control.onpointerdown(event);control.onselectstart(event);control.oncontextmenu(event);
 assert.equal(blocked,3);
 await control.onpointercancel();
 assert.match(html,/\.flight-steering[^\n]*-webkit-user-select:none[^\n]*-webkit-touch-callout:none/);
});


test('late online snapshots do not jerk a held thrust or turn backward',async()=>{
 let ackX=900,ackHeading=0;
 const {elements:e,markers,rotations,keys,frame,poll}=client({radio:true,replyPose:()=>({x:ackX,heading:ackHeading})});
 await flush();await e.enter.onclick();await e.launch.onclick();e['fleet-view'].onclick();
 await keys.ArrowUp.onpointerdown({pointerId:2});
 let previous=markers.at(-1).x;
 for(let t=16;t<=768;t+=16){
  frame(t);
  if(t%192===0){ackX+=15;await poll();}
  assert.ok(markers.at(-1).x>=previous-1e-6,'no reverse hop across a flight receipt');
  previous=markers.at(-1).x;
 }
 assert.ok(previous>244);
 await keys.ArrowUp.onpointerup();
 await keys.ArrowRight.onpointerdown({pointerId:3});
 let angle=rotations.at(-1);
 for(let t=784;t<=1536;t+=16){
  frame(t);
  if(t%192===0){ackHeading+=.23;await poll();}
  assert.ok(rotations.at(-1)>=angle-1e-6,'no backward twitch during a held right turn');
  angle=rotations.at(-1);
 }
 assert.ok(angle>2);
});
test('right stick sends proportional steering and springs to neutral on release',async()=>{
 const {elements:e,calls}=client({radio:true});
 await flush();await e.enter.onclick();await e.launch.onclick();
 const stick=e['turn-stick'];stick.getBoundingClientRect=()=>({left:0,width:100});
 await stick.onpointerdown({pointerId:9,clientX:68});
 assert.equal(JSON.parse(calls.at(-1).opts.body).turn,.5);
 await stick.onpointerup({pointerId:9});
 assert.equal(JSON.parse(calls.at(-1).opts.body).turn,0);
});
