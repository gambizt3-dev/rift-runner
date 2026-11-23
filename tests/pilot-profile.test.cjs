'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),test=require('node:test'),assert=require('node:assert/strict');
const {webcrypto}=require('node:crypto');
const site=['../dist','..'].map(dir=>path.join(__dirname,dir)).find(dir=>fs.existsSync(path.join(dir,'pilot-profile.html')));
const read=name=>fs.readFileSync(path.join(site,name),'utf8');
const program=read('pilot-profile.js'),html=read('pilot-profile.html'),css=read('pilot-profile.css');
const profileKey='rift-runner.pilot-profile.v1',buildKey='rift-runner.ship-build.v1',sessionKey='rift-runner.pilot-profile.unlocked.v1';
const names=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
const catalog=[
 {id:'motor',name:'Stock thruster',category:'engine',price:60},
 {id:'core',name:'Core',category:'core',price:60},
 {id:'battery',name:'Reserve Cell',category:'battery',price:40},
 {id:'blaster',name:'Sterling Laser',category:'weapon',price:45},
 {id:'shield',name:'Aegis Shield',category:'shield',price:200}
];
function element(){
 return {dataset:{},children:[],listeners:{},attrs:{},textContent:'',hidden:true,
  set innerHTML(v){throw Error('Never parse user text as HTML');},
  append(...items){this.children.push(...items);},replaceChildren(){this.children=[];},
  addEventListener(name,fn){this.listeners[name]=fn;},focus(){this.focused=true;},
  getAttribute(k){return this.attrs[k]??null;},setAttribute(k,v){this.attrs[k]=v;},removeAttribute(k){delete this.attrs[k];}};
}
function open({store=new Map(),session=new Map(),denyWrite=false,denyRead=false,denyRemove=null,route='',crypto=webcrypto,state={balance:250,owned:[],requiredReserve:190,canBuild:false},modules=catalog,hulls=[]}={}){
 const nodes=Object.fromEntries(names.map(name=>[name,element()])),listeners={},writes=[],removes=[];
 const window={crypto,location:new URL('https://rift.example/pilot-profile.html'+route),
  sessionStorage:{getItem(k){return session.get(k)??null;},setItem(k,v){session.set(k,v);},removeItem(k){session.delete(k);}},
  localStorage:{getItem(key){if(denyRead)throw Error('read denied');return store.get(key)??null;},setItem(key,value){if(denyWrite)throw Error('write denied');writes.push(key);store.set(key,value);},removeItem(key){if(denyRemove===key)throw Error('remove denied');removes.push(key);store.delete(key);}},
  RiftCredits:{getBuildState:()=>state,getCatalog:()=>modules,ownsHull:id=>hulls.includes(id)},
  addEventListener(name,fn){listeners[name]=fn;}
 };
 const document={getElementById:id=>nodes[id],createElement:element};
 const context=vm.createContext({window,document,TextEncoder});
 vm.runInContext(read('pilot-missions.js'),context);
 vm.runInContext(read('wing-rendezvous.js'),context);
 if(hulls.length)vm.runInContext(read('fighter-registry.js'),context);
 vm.runInContext(program,context);
 const submit=async(input,code='0123',avatar=undefined)=>{
  if(avatar!==undefined||nodes['identity-title'].textContent==='Create Character'){
   const chosen=avatar===undefined?'andy':avatar;
   for(const id of ['andy','aya','ellis','nia'])nodes['pilot-avatar-'+id].checked=id===chosen;
  }nodes['pilot-callsign'].value=input;nodes['pilot-pin'].value=code;let prevented=false;await nodes['pilot-callsign-form'].listeners.submit({preventDefault(){prevented=true;}});assert.equal(prevented,true);};
 return {nodes,listeners,writes,removes,submit,store,session,window,document,text:id=>nodes[id].textContent,lock:()=>nodes['pilot-profile-lock'].listeners.click()};
}
test('Create Character starts blank, hashes entered PIN and displays Pilot 001 only after unlock',async()=>{
 const q=open();assert.equal(q.nodes['pilot-callsign'].value,'');assert.deepEqual(q.writes,[]);
 assert.equal(q.nodes['pilot-portrait'].hidden,true);assert.equal(q.nodes['pilot-portrait-image'].attrs.src,undefined);
 await q.submit(' Andy ');
 assert.equal(q.text('pilot-saved-callsign'),'Andy');assert.deepEqual(q.writes,[profileKey]);
 const record=JSON.parse(q.store.get(profileKey));
 assert.deepEqual(Object.keys(record),['version','callsign','salt','verifier','iterations','avatar']);
 assert.match(record.salt,/^[0-9a-f]{32}$/);assert.match(record.verifier,/^[0-9a-f]{64}$/);assert.equal(record.iterations,310000);
 assert.equal(q.session.get(sessionKey),record.salt);assert.equal(q.nodes['pilot-pin'].value,'');
 assert.equal(q.nodes['pilot-portrait'].hidden,false);assert.match(q.nodes['pilot-portrait-image'].attrs.src,/pilot-001-andy.webp/);
 assert.equal(open({store:q.store,session:q.session}).text('pilot-saved-callsign'),'Andy');
 q.lock();assert.equal(q.text('identity-title'),'Unlock profile');assert.equal(q.nodes['pilot-portrait'].hidden,true);assert.equal(q.nodes['pilot-portrait-image'].attrs.src,undefined);
 const reopened=open({store:q.store});
 await reopened.submit('ignored','1111');assert.match(reopened.text('pilot-profile-feedback'),/did not match/);
 assert.equal(reopened.nodes['pilot-wallet-panel'].hidden,true);assert.deepEqual(reopened.writes,[]);
 await reopened.submit('ignored','0123');assert.equal(reopened.text('pilot-saved-callsign'),'Andy');
 await reopened.submit('Starling','0123','aya');assert.equal(reopened.text('pilot-saved-callsign'),'Starling');assert.match(reopened.nodes['pilot-portrait-image'].attrs.src,/pilot-002-aya.webp/);
 assert.equal(JSON.parse(q.store.get(profileKey)).verifier,record.verifier);
});
test('rejects invalid identity or PIN without writes; fails closed without crypto/storage',async()=>{
 for(const value of ['','   ','<img src=x>','me@example.org','x'.repeat(25)]){const q=open();await q.submit(value);assert.equal(q.nodes['pilot-callsign'].attrs['aria-invalid'],'true');assert.deepEqual(q.writes,[]);}
 for(const code of ['111','12345','１２３４',' 123','ab12']){const q=open();await q.submit('Pilot 2',code);assert.equal(q.nodes['pilot-pin'].attrs['aria-invalid'],'true');assert.deepEqual(q.writes,[]);}
 const q=open({denyWrite:true});await q.submit('Pilot 2');assert.match(q.text('pilot-profile-feedback'),/Could not complete/);
 assert.equal(open({crypto:null}).nodes['pilot-profile-submit'].disabled,true);
 assert.match(open({denyRead:true}).text('pilot-profile-feedback'),/storage is unavailable/);
 const broken=open({store:new Map([[profileKey,'invalid']])});await broken.submit('Pilot 2');
 assert.equal(broken.text('identity-title'),'Profile unavailable');assert.deepEqual(broken.writes,[]);
});
test('shows actual wallet, reserve, fitted owned items and real kill tally',async()=>{
 const state={balance:1520,owned:['motor','core','battery','blaster','shield'],requiredReserve:0,canBuild:true,kills:12};
 const store=new Map([[buildKey,JSON.stringify({version:1,hull:'rift-fighter',engine:'motor',core:'core',battery:'battery',primary:'blaster',secondary:'motor',shield:null})]]);
 const q=open({store,state});await q.submit('Pilot 2');
 assert.equal(q.text('pilot-balance'),'1,520');assert.equal(q.text('pilot-kills'),'12');assert.equal(q.text('pilot-build-status'),'Fighter build ready');
 assert.deepEqual(q.nodes['pilot-fitted-list'].children.map(n=>n.children[1].textContent),['Stock thruster','Core','Reserve Cell','Sterling Laser','Not fitted','Not fitted']);
 assert.deepEqual(q.nodes['pilot-parts-list'].children.map(n=>n.children[0].textContent),['Aegis Shield']);
 state.kills=13;state.balance=1522.5;q.listeners['rift:walletchange']();assert.equal(q.text('pilot-kills'),'13');assert.equal(q.text('pilot-balance'),'1,522.5');assert.deepEqual(q.writes,[profileKey]);
 const blank=open({store:q.store,session:q.session});assert.equal(blank.text('pilot-balance'),'250');assert.equal(blank.text('pilot-kills'),'0');assert.match(blank.text('pilot-build-detail'),/190 CR/);
 const unavailable=open({store:q.store,session:q.session,state:{balance:null,owned:[],canBuild:false}});assert.equal(unavailable.text('pilot-kills'),'—');assert.match(unavailable.text('pilot-parts-empty'),/unavailable/i);
});
test('responsive, local-only form, clear stops and versioned scripts',()=>{
 assert.match(html,/width=device-width, initial-scale=1/);assert.match(css,/@media\(max-width:640px\).*minmax\(0,1fr\)/s);
 assert.match(css,/min-block-size:44px/);assert.doesNotMatch(css,/overflow:\s*hidden/);
 assert.match(html,/href="\.\/index\.html"/);assert.match(html,/href="\.\/carrier-shop\.html"/);assert.match(html,/hangar=carrier/);
 assert.ok(html.includes('pilot-profile.css?v=173'));assert.ok(html.includes('pilot-profile.js?v=239'));
 assert.ok(html.includes('pilot-credits.js?v=239'));
 assert.match(html,/<input id="pilot-pin" type="password" inputmode="numeric"/);assert.match(html,/Fictional portrait of Pilot Andy/);
 assert.doesNotMatch(program,/\b(?:fetch|XMLHttpRequest)\b/);
});
test('legacy fits are kept without claiming unowned or new-pilot fittings',async()=>{
 const modules=[
  {id:'stock-thruster',name:'Stock thruster',category:'engine'},
  {id:'weifer-he3-core',name:'Weifer He3 Core',category:'core'},
  {id:'kestrel-h20-reserve-cell',name:'Kestrel H2O Reserve Cell',category:'battery'},
  {id:'blaster',name:'Sterling Laser',category:'weapon'},
  {id:'ballistic',name:'Ballistic Repeater',category:'weapon'},
  {id:'aegis-s3',name:'Aegis',category:'shield'}
 ];
 const store=new Map([['rift-runner.shield-fit.v1','aegis-s3'],['rift-runner.fighter-fit.v1','{"version":1,"primary":"ballistic","secondary":null}']]);
 const state={balance:0,origin:'legacy',owned:modules.slice(0,5).map(x=>x.id),canBuild:true};
 const q=open({modules,store,state});await q.submit('Pilot 2');
 assert.deepEqual(q.nodes['pilot-fitted-list'].children.map(n=>n.children[1].textContent),['Stock thruster','Weifer He3 Core','Kestrel H2O Reserve Cell','Ballistic Repeater','Not fitted','Not fitted']);
 assert.deepEqual(q.nodes['pilot-parts-list'].children.map(n=>n.children[0].textContent),['Sterling Laser']);
 const n=open({modules,store,session:q.session,state:{...state,origin:'new'}});
 assert.equal(n.text('pilot-build-status'),'Claim a ship to start your build');
 assert.ok(n.nodes['pilot-fitted-list'].children.every(row=>row.children[1].textContent==='Not fitted'));
});
test('an intervening character record is never overwritten by concurrent derivation',async()=>{
 let unblock;const wait=new Promise(resolve=>unblock=resolve);
 const crypto={getRandomValues:bytes=>webcrypto.getRandomValues(bytes),subtle:{importKey:(...args)=>webcrypto.subtle.importKey(...args),async deriveBits(...args){await wait;return webcrypto.subtle.deriveBits(...args);}}};
 const q=open({crypto}),submitted=q.submit('First');
 const other=open({store:q.store});await other.submit('Second');
 unblock();await submitted;
 assert.equal(JSON.parse(q.store.get(profileKey)).callsign,'Second');
 assert.deepEqual(q.writes,[]);
 assert.equal(q.text('identity-title'),'Unlock profile');
});

test('four radio cards, explicit choice on new profile, legacy neutral and unsupported ID',async()=>{
 const q=open();
 assert.equal(q.nodes['pilot-avatar-picker'].hidden,false);
 const expected={andy:'pilot-001-andy.webp?v=75',aya:'pilot-002-aya.webp?v=76',ellis:'pilot-003-ellis.webp?v=76',nia:'pilot-004-nia.webp?v=76'};
 for(const [id,asset] of Object.entries(expected)){
  assert.equal(q.nodes['pilot-avatar-'+id].checked,false);
  assert.ok(q.nodes['pilot-avatar-art-'+id].attrs.src.endsWith(asset));
  assert.match(html,new RegExp('id="pilot-avatar-'+id+'" type="radio" name="pilot-avatar"'));
 }
 await q.submit('Pilot','','');assert.deepEqual(q.writes,[]);
 await q.submit('Pilot','0123','');assert.match(q.text('pilot-profile-feedback'),/Choose a pilot portrait/);assert.deepEqual(q.writes,[]);
 await q.submit('Pilot','0123','nia');assert.equal(q.text('pilot-saved-callsign'),'Pilot');
 assert.equal(q.text('pilot-portrait-caption'),'Pilot 004 / Nia');
 let record=JSON.parse(q.store.get(profileKey));
 delete record.avatar;q.store.set(profileKey,JSON.stringify(record));
 const legacy=open({store:q.store,session:q.session});assert.equal(legacy.nodes['pilot-portrait'].hidden,true);
 await legacy.submit('Pilot2');assert.equal(JSON.parse(q.store.get(profileKey)).avatar,null);
 q.store.set(profileKey,JSON.stringify({...record,callsign:'aNdY'}));
 const andy=open({store:q.store,session:q.session});assert.equal(andy.nodes['pilot-avatar-andy'].checked,true);assert.equal(andy.nodes['pilot-portrait'].hidden,false);
 await andy.submit('Updated');assert.equal(JSON.parse(q.store.get(profileKey)).avatar,'andy');
 record={...record,avatar:'https://untrusted.invalid/file'};q.store.set(profileKey,JSON.stringify(record));
 const unsupported=open({store:q.store,session:q.session});assert.equal(unsupported.nodes['pilot-portrait-image'].attrs.src,undefined);
 const locked=open({store:q.store});assert.equal(locked.nodes['pilot-avatar-picker'].hidden,true);
 for(const id of Object.keys(expected))assert.equal(locked.nodes['pilot-avatar-art-'+id].attrs.src,undefined);
 assert.match(css,/@media\(max-width:500px\)\{\.portrait-options\{grid-template-columns:repeat\(2/);
});
test('service record shows Wing Rendezvous only after both pilots are met, without lodging the starter quest',async()=>{
 const q=open();await q.submit('Pilot');
 const mission=q.window.RiftRendezvous,gen=mission.generation(),accepted=mission.accept(gen);
 const show=()=>q.listeners.storage({key:mission.key});
 const record=q.nodes['pilot-rendezvous-quest'],starter=q.nodes['pilot-starter-quest'];
 mission.meet('aya','common',gen,accepted.acceptedAt);
 show();assert.equal(record.hidden,true);
 mission.meet('ellis','observation',gen,accepted.acceptedAt);
 show();assert.equal(record.hidden,false);
 assert.match(q.text('pilot-rendezvous-completed'),/^Completed /);
 assert.equal(q.nodes['pilot-quest-list'].hidden,false);
 assert.equal(q.nodes['pilot-quest-empty'].hidden,true);
 assert.equal(starter.hidden,true);
 q.store.set('rift-runner.character-generation.v1','other-pilot');
 show();assert.equal(record.hidden,true);assert.equal(q.nodes['pilot-quest-empty'].hidden,false);
});

test('qualified rank follows confirmed kills and the service record displays lodged quests',async()=>{
 const state={balance:250,owned:[],requiredReserve:190,canBuild:false,kills:0};
 const q=open({state});
 assert.equal(q.nodes['pilot-credentials-panel'].hidden,true);
 await q.submit('Pilot');
 assert.equal(q.nodes['pilot-credentials-panel'].hidden,false);
 state.kills=300;q.listeners['rift:walletchange']();assert.equal(q.text('pilot-rank'),'Cadet');
 assert.equal(q.nodes['pilot-quest-empty'].hidden,false);
 const log=q.window.RiftMissions;
 assert.ok(log.lodgeStarter(log.generation()));
 q.listeners.storage({key:'rift-runner.mission-log.v1'});
 assert.equal(q.nodes['pilot-quest-empty'].hidden,true);
 assert.equal(q.nodes['pilot-quest-list'].hidden,false);
 assert.match(q.text('pilot-starter-completed'),/^Lodged /);
 assert.equal(q.nodes['pilot-rank-quests'].hidden,true);
 const locked=open({store:q.store});
 assert.equal(locked.nodes['pilot-credentials-panel'].hidden,true);
 state.balance=null;q.listeners['rift:walletchange']();assert.equal(q.text('pilot-rank'),'—');
 q.lock();assert.equal(q.nodes['pilot-credentials-panel'].hidden,true);
});

const generationKey='rift-runner.character-generation.v1';
const localSaveKeys=[
 'rift-runner.pilot-credits.v1','rift-runner.hull-owned.v1',buildKey,'rift-runner.ship-active-gun.v1',
 'rift-runner.fighter-fit.v1','rift-runner.engine-fit.v1','rift-runner.shield-fit.v1',
 'rift-runner.shot-sound.v1'
];
const preserved=[['rift-runner.aim-assist.v2','on'],['rift-runner.sound.v1','off'],['rift-runner.iphone-audio.v1','on'],['unrelated.origin.setting','safe'],['rift-runner.future-key','preserved']];
async function withSaved(options={}){
 const store=new Map([...localSaveKeys.map(k=>[k,'fixture']),...preserved]);
 const q=open({store,...options});await q.submit('Pilot 7','1492','nia');return q;
}
function beginDelete(q){q.nodes['pilot-delete-open'].listeners.click();}
function cancelDelete(q){q.nodes['pilot-delete-cancel'].listeners.click();}
async function deleteSubmit(q,code='1492',confirmed=true){
 q.nodes['pilot-delete-pin'].value=code;q.nodes['pilot-delete-confirm'].checked=confirmed;
 let prevented=false;
 await q.nodes['pilot-delete-form'].listeners.submit({preventDefault(){prevented=true;}});
 assert.equal(prevented,true);
}
test('delete requires both explicit confirmation and the correct game PIN; Cancel is inert',async()=>{
 const q=await withSaved();const saved=q.store.get(profileKey);
 assert.equal(q.nodes['pilot-delete-panel'].hidden,false);
 assert.equal(q.nodes['pilot-delete-form'].hidden,true);
 beginDelete(q);assert.equal(q.nodes['pilot-delete-form'].hidden,false);
 await deleteSubmit(q,'1492',false);assert.match(q.text('pilot-delete-feedback'),/Confirm that you understand/);
 await deleteSubmit(q,'1515');assert.match(q.text('pilot-delete-feedback'),/did not match/);
 q.nodes['pilot-delete-pin'].value='1492';q.nodes['pilot-delete-confirm'].checked=true;
 cancelDelete(q);assert.equal(q.nodes['pilot-delete-form'].hidden,true);
 assert.equal(q.nodes['pilot-delete-pin'].value,'');assert.equal(q.nodes['pilot-delete-confirm'].checked,false);
 await deleteSubmit(q);assert.deepEqual(q.removes,[]);assert.equal(q.store.get(profileKey),saved);
 q.lock();assert.equal(q.nodes['pilot-delete-panel'].hidden,true);
 beginDelete(q);await deleteSubmit(q);assert.deepEqual(q.removes,[]);
});
test('accepted delete resets only the allowed gameplay keys and recreates a fresh wallet',async()=>{
 const q=await withSaved();beginDelete(q);await deleteSubmit(q);
 assert.deepEqual(q.removes,[...localSaveKeys,profileKey]);assert.deepEqual([...q.store].filter(([id])=>id!==generationKey),preserved);
 assert.match(q.store.get(generationKey),/^[a-f0-9]{32}$/);
 assert.equal(q.session.has(sessionKey),false);assert.equal(q.text('identity-title'),'Create Character');
 assert.equal(q.nodes['pilot-callsign'].value,'');assert.equal(q.nodes['pilot-delete-panel'].hidden,true);
 assert.match(q.text('pilot-profile-feedback'),/Character deleted/);
 vm.runInNewContext(read('pilot-credits.js'),{window:q.window,document:q.document,Event});
 const wallet=q.window.RiftCredits.getBuildState();
 assert.equal(wallet.balance,250);assert.equal(wallet.origin,'new');assert.equal(wallet.kills,0);assert.equal(wallet.owned.length,0);
 assert.equal(q.store.has(buildKey),false);assert.equal(q.store.has('rift-runner.hull-owned.v1'),false);assert.equal(q.store.has(profileKey),false);
});
test('blocked storage restores prior removals, and changed identity never gets removed',async()=>{
 const q=await withSaved({denyRemove:buildKey}),original=[...q.store];beginDelete(q);await deleteSubmit(q);
 assert.deepEqual([...q.store].sort(),original.sort());
 assert.ok(q.removes.includes(generationKey));assert.match(q.text('pilot-delete-feedback'),/Deletion was blocked/);
 assert.equal(q.text('identity-title'),'Your character');
 const r=await withSaved();beginDelete(r);
 const current=JSON.parse(r.store.get(profileKey));r.store.set(profileKey,JSON.stringify({...current,callsign:'Elsewhere'}));
 await deleteSubmit(r);assert.equal(JSON.parse(r.store.get(profileKey)).callsign,'Elsewhere');
 assert.deepEqual(r.removes,[]);assert.match(r.text('pilot-delete-feedback'),/character changed/);
});
test('reset guards async PIN verification between storage revisions and surfaces unsuccessful rollback',async()=>{
 let unblock;const wait=new Promise(resolve=>unblock=resolve);let block=false;
 const crypto={getRandomValues:bytes=>webcrypto.getRandomValues(bytes),subtle:{importKey:(...args)=>webcrypto.subtle.importKey(...args),async deriveBits(...args){if(block)await wait;return webcrypto.subtle.deriveBits(...args);}}};
 const q=await withSaved({crypto});beginDelete(q);block=true;
 const pending=deleteSubmit(q);
 const changed=JSON.parse(q.store.get(profileKey));q.store.set(profileKey,JSON.stringify({...changed,callsign:'OtherRevision'}));
 unblock();await pending;
 assert.deepEqual(q.removes,[]);assert.equal(JSON.parse(q.store.get(profileKey)).callsign,'OtherRevision');
 assert.match(q.text('pilot-delete-feedback'),/character changed/);
 const r=await withSaved({denyRemove:buildKey});
 const set=r.window.localStorage.setItem;
 r.window.localStorage.setItem=(key,value)=>{if(key===localSaveKeys[0])throw Error('rollback denied');set(key,value);};
 beginDelete(r);await deleteSubmit(r);
 assert.equal(r.text('identity-title'),'Profile unavailable');
 assert.match(r.text('pilot-profile-feedback'),/could not be restored/);
 assert.notEqual(r.store.get(profileKey),undefined);
 assert.equal(r.store.get('unrelated.origin.setting'),'safe');
});
test('Rift-4 salvage art and fitting only follow local owned condition',async()=>{
 const hullKey='rift-runner.hull-owned.v1';
 const state={balance:250,owned:['motor'],origin:'new',canBuild:false};
 const q=open({state});await q.submit('Pilot');
 assert.equal(q.nodes['pilot-ship-grid'].hidden,true);
 assert.equal(q.nodes['pilot-hull-art'].attrs.src,undefined);
 assert.match(q.text('pilot-hull-status'),/No ship owned/);
 q.store.set(buildKey,JSON.stringify({version:1,hull:'rift-fighter',engine:'motor'}));
 function read(condition,readyAt){q.store.set(hullKey,JSON.stringify({version:1,hull:'rift-fighter',condition,readyAt}));q.listeners.storage({key:hullKey});}
 read('damaged');
 assert.equal(q.nodes['pilot-ship-grid'].hidden,false);assert.equal(q.nodes['pilot-fitted-panel'].hidden,true);
 assert.match(q.nodes['pilot-hull-art'].attrs.src,/fighter-salvage-damaged.webp/);
 assert.deepEqual(q.nodes['pilot-parts-list'].children.map(n=>n.children[0].textContent),['Stock thruster']);
 read('repairing',Date.now()+20000);assert.match(q.text('pilot-hull-status'),/in progress/);
 read('repairing',Date.now()-5000);assert.match(q.text('pilot-hull-status'),/ready to finish/);
 assert.equal(q.nodes['pilot-fitted-panel'].hidden,true);
 assert.match(q.nodes['pilot-hull-art'].attrs.src,/fighter-salvage-damaged.webp/);
 read('repaired');assert.equal(q.nodes['pilot-fitted-panel'].hidden,false);
 assert.match(q.nodes['pilot-hull-art'].attrs.src,/fighter-winged.png/);
 assert.equal(q.text('pilot-hull-caption'),'Rift-4 Fighter');
 assert.equal(q.nodes['pilot-fitted-list'].children[0].children[1].textContent,'Stock thruster');
 read('bogus');assert.equal(q.nodes['pilot-ship-grid'].hidden,true);assert.match(q.text('pilot-hull-status'),/unavailable/);
 assert.deepEqual(q.writes,[profileKey]);
});

test('first Create Character adopts existing guest wallet, owned parts and hull with no reset',async()=>{
 const creditsKey='rift-runner.pilot-credits.v1',hullKey='rift-runner.hull-owned.v1';
 const store=new Map([
  [creditsKey,JSON.stringify({version:3,origin:'new',balance:207.5,kills:1,owned:['test-thruster']})],
  [hullKey,JSON.stringify({version:1,hull:'rift-fighter',condition:'repaired'})]
 ]);
 const clean=open();assert.equal(clean.nodes['pilot-create-progress'].hidden,true);
 const q=open({store});assert.equal(store.has(profileKey),false);
 assert.equal(q.nodes['pilot-create-progress'].hidden,false);
 assert.equal(q.text('pilot-profile-submit'),'Create profile and keep progress');
 vm.runInNewContext(read('pilot-credits.js'),{window:q.window,document:q.document,Event});
 const guest=[...store];
 await q.submit('Fresh Pilot');
 assert.equal(q.text('pilot-balance'),'207.5');assert.equal(q.text('pilot-kills'),'1');
 assert.equal(q.text('pilot-hull-status'),'Rift-4 Fighter owned.');
 assert.deepEqual([...store].filter(([key])=>key!==profileKey),guest);
 assert.deepEqual(q.writes,[profileKey]);
});
const retestHullKey='rift-runner.hull-owned.v1';
const retestHull=condition=>JSON.stringify({version:1,hull:'rift-fighter',condition,...(condition==='repairing'?{readyAt:Date.now()+60000}:{})});
const beginRetest=q=>q.nodes['pilot-retest-open'].listeners.click();
const submitRetest=q=>q.nodes['pilot-retest-form'].listeners.submit({preventDefault(){}});
test('repair re-test requires unlocked ownership and explicit confirmation; cancel/active are inert',async()=>{
 const store=new Map([[retestHullKey,retestHull('repaired')]]),q=open({store});
 assert.equal(q.nodes['pilot-ship-panel'].hidden,true);
 await q.submit('Andy');
 assert.equal(q.nodes['pilot-retest'].hidden,false);assert.equal(q.nodes['pilot-retest-form'].hidden,true);
 submitRetest(q);assert.deepEqual(q.writes,[profileKey]);
 beginRetest(q);assert.equal(q.nodes['pilot-retest-form'].hidden,false);
 q.nodes['pilot-retest-cancel'].listeners.click();
 submitRetest(q);assert.deepEqual(q.writes,[profileKey]);assert.equal(q.nodes['pilot-retest-form'].hidden,true);
 q.lock();assert.equal(q.nodes['pilot-ship-panel'].hidden,true);beginRetest(q);submitRetest(q);
 assert.deepEqual(q.writes,[profileKey]);await q.submit('ignored','0123');
 store.set(retestHullKey,retestHull('repairing'));const current=store.get(retestHullKey);
 q.listeners.storage({key:retestHullKey});assert.equal(q.nodes['pilot-retest'].hidden,true);
 beginRetest(q);submitRetest(q);assert.equal(store.get(retestHullKey),current);
 assert.deepEqual(q.writes,[profileKey]);
 assert.match(html,/id="starter-repair"/);assert.match(html,/href=".\/index.html\?hangar=carrier" hidden>Back to Hangar/);
});
test('re-test writes only damaged hull, preserving pilot, wallet, fitted bytes and settings',async()=>{
 const state={balance:132.5,origin:'new',owned:['motor'],kills:120,canBuild:false};
 const store=new Map([[retestHullKey,retestHull('repaired')],
  [buildKey,JSON.stringify({version:1,hull:'rift-fighter',engine:'motor'})],
  ['rift-runner.pilot-credits.v1','wallet-bytes'],['rift-runner.aim-assist.v2','on'],['other-character','unchanged']]);
 const q=open({store,state});await q.submit('Andy','0123','nia');
 const untouched=[...store].filter(([k])=>k!==retestHullKey);
 beginRetest(q);submitRetest(q);
 assert.deepEqual([...store].filter(([k])=>k!==retestHullKey),untouched);
 assert.equal(store.get(retestHullKey),retestHull('damaged'));assert.deepEqual(q.writes,[profileKey,retestHullKey]);
 assert.match(q.text('pilot-retest-feedback'),/Start the repair in the Hangar/);
 assert.equal(q.nodes['pilot-fitted-panel'].hidden,true);
 assert.equal(q.nodes['pilot-retest-back'].hidden,false);
 assert.deepEqual([q.text('pilot-balance'),q.text('pilot-kills'),q.text('pilot-rank')],['132.5','120','Cadet']);
 beginRetest(q);submitRetest(q);assert.deepEqual(q.writes,[profileKey,retestHullKey]);
});
test('legacy repaired can opt in, but stale profile/hull and unverified writes do not overwrite',async()=>{
 const legacy=open({state:{balance:26,origin:'legacy',owned:[]}});await legacy.submit('Andy');
 beginRetest(legacy);submitRetest(legacy);assert.equal(legacy.store.get(retestHullKey),retestHull('damaged'));
 const q=open({store:new Map([[retestHullKey,retestHull('repaired')]])});await q.submit('Andy');
 beginRetest(q);
 const next=retestHull('repairing');q.store.set(retestHullKey,next);submitRetest(q);
 assert.equal(q.store.get(retestHullKey),next);assert.match(q.text('pilot-retest-feedback'),/changed/);
 q.store.set(retestHullKey,retestHull('repaired'));q.listeners.storage({key:retestHullKey});beginRetest(q);
 const rec=JSON.parse(q.store.get(profileKey));q.store.set(profileKey,JSON.stringify({...rec,callsign:'New'}));
 submitRetest(q);assert.equal(q.store.get(retestHullKey),retestHull('repaired'));
 assert.match(q.text('pilot-retest-feedback'),/changed/);
 beginRetest(q);q.window.localStorage.setItem=()=>{};submitRetest(q);
 assert.equal(q.store.get(retestHullKey),retestHull('repaired'));
 assert.match(q.text('pilot-retest-feedback'),/Could not confirm/);assert.deepEqual(q.writes,[profileKey]);
});
test('Hangar link deep-focuses the repair action only after successful profile unlock',async()=>{
 const store=new Map([[retestHullKey,retestHull('repaired')]]),q=open({store});await q.submit('Andy');
 const linked=open({store,route:'#starter-repair'});
 assert.notEqual(linked.nodes['pilot-retest-open'].focused,true);
 await linked.submit('ignored','4321');assert.notEqual(linked.nodes['pilot-retest-open'].focused,true);
 await linked.submit('ignored','0123');assert.equal(linked.nodes['pilot-retest-open'].focused,true);
 const ordinary=open({store,session:linked.session});
 assert.notEqual(ordinary.nodes['pilot-retest-open'].focused,true);
});

test('rank insignia advances only on consecutive Captain turn-ins and never writes a separate badge save',async()=>{
 const state={balance:250,owned:[],requiredReserve:190,canBuild:false,kills:0};
 const q=open({state});await q.submit('Badge pilot');
 const writes=q.writes.length,current=q.nodes['pilot-current-badge'],icon=q.nodes['pilot-current-insignia'];
 const ladder=['Cadet','Wingman','Ace','Flight Lead','Veteran','Vanguard','Rift Legend'];
 const hint=q.nodes['pilot-rank-hint'],wingman=q.nodes['pilot-badge-1'];
 assert.equal(hint.hidden,true);
 for(const kills of [10,25,75]){
  state.kills=kills;q.listeners['rift:walletchange']();
  assert.equal(q.text('pilot-rank'),'Cadet');
  assert.equal(current.dataset.tier,'0');assert.equal(wingman.hidden,true);assert.equal(hint.hidden,false);
 }
 const records=new Map(),defs=q.window.RiftMissions.qualifications;
 q.window.RiftMissions={...q.window.RiftMissions,getQualification:id=>records.get(id)};
 records.set('ace',{lodgedAt:13});
 q.listeners.storage({key:'rift-runner.mission-log.v1'});
 assert.equal(q.text('pilot-rank'),'Cadet','cannot skip Wingman even with a later receipt');
 records.clear();
 state.kills=300;
 for(let tier=0;tier<ladder.length;tier++){
  if(tier)records.set(defs[tier-1].id,{lodgedAt:13+tier});
  q.listeners.storage({key:'rift-runner.mission-log.v1'});
  assert.equal(hint.hidden,tier===ladder.length-1);
  if(!hint.hidden)assert.match(q.text('pilot-rank-hint-text'),new RegExp('Qualify for '+ladder[tier+1]));
  assert.equal(q.nodes['pilot-rank-quests'].children.length,tier);
  assert.equal(q.text('pilot-rank'),ladder[tier]);
  assert.equal(current.hidden,false);assert.equal(current.dataset.tier,String(tier));
  assert.equal(icon.attrs.href,'#pin-'+tier);assert.equal(q.nodes['pilot-badges'].hidden,false);
  for(let i=0;i<ladder.length;i++){
   const tile=q.nodes['pilot-badge-'+i];
   assert.equal(tile.hidden,i>tier);assert.equal(tile.attrs['aria-current'],i===tier?'true':undefined);
  }
 }
 assert.equal(q.writes.length,writes,'ranks and badges are derived, not written to a separate save');
 state.balance=null;q.listeners['rift:walletchange']();
 assert.equal(current.hidden,true);assert.equal(icon.attrs.href,undefined);
 assert.equal(q.nodes['pilot-badges'].hidden,true);
 for(let i=0;i<ladder.length;i++)assert.equal(q.nodes['pilot-badge-'+i].hidden,true);
 assert.equal(new Set([...html.matchAll(/<g id="pin-\d+">([^]*?)<\/g>/g)].map(m=>m[1])).size,7,'every tier has a different insignia');
});

test('Player Status links to creation and never assigns an affiliation to a visitor',async()=>{
 const q=open({route:'?view=status'});
 assert.equal(q.document.title,'Player Status · Rift Runner');
 assert.equal(q.text('pilot-status-profile-link'),'Create character');
 assert.equal(q.nodes['pilot-status-profile-link'].hidden,false);
 assert.equal(q.nodes['pilot-callsign-form'].hidden,true);
 assert.equal(q.nodes['pilot-status-company'].hidden,true);
 await q.submit('Not created here');
 q.nodes['pilot-company-action'].listeners.click();
 assert.deepEqual(q.writes,[]);
});

test('Player Status shows pilot data and saves or clears Pegasus without changing progress',async()=>{
 const q=open();await q.submit('Andy','0123','aya');
 const before=JSON.parse(q.store.get(profileKey));
 const repairKey='rift-runner.hull-owned.v1';
 const hull=JSON.stringify({version:1,hull:'rift-fighter',condition:'repaired'});
 q.store.set(repairKey,hull);
 const state={balance:257.5,kills:3,owned:[],requiredReserve:190,canBuild:false};
 const route='?view=status#starter-repair';
 const s=open({store:q.store,route,state});
 assert.equal(s.nodes['pilot-callsign-form'].hidden,false);
 assert.equal(s.nodes['pilot-status-company'].hidden,true);
 assert.equal(s.nodes['pilot-wallet-panel'].hidden,true);
 await s.submit('', '0123');
 assert.equal(s.text('pilot-saved-callsign'),'Andy');
 assert.match(s.nodes['pilot-portrait-image'].attrs.src,/aya/);
 assert.equal(s.text('pilot-balance'),'257.5');
 assert.equal(s.text('pilot-rank'),'Cadet');
 assert.equal(s.text('pilot-kills'),'3');
 assert.match(s.text('pilot-hull-status'),/Rift-4 Fighter owned/);
 assert.equal(s.text('pilot-company-name'),'Independent');
 for(const id of ['pilot-callsign-form','pilot-delete-panel','pilot-retest','pilot-retest-back'])assert.equal(s.nodes[id].hidden,true,id);
 await s.submit('No changes');
 assert.deepEqual(s.writes,[]);
 s.nodes['pilot-company-select'].value='rift-carrier';
 s.nodes['pilot-company-action'].listeners.click();
 assert.equal(s.text('pilot-company-name'),'Pegasus');
 assert.deepEqual(JSON.parse(q.store.get(profileKey)),{...before,companyVesselId:'rift-carrier'});
 assert.equal(q.store.get(repairKey),hull);
 assert.deepEqual(s.writes,[profileKey]);
 const reopened=open({store:q.store,session:s.session,route,state});
 assert.equal(reopened.text('pilot-company-name'),'Pegasus');
 reopened.lock();
 assert.equal(reopened.nodes['pilot-status-company'].hidden,true);
 reopened.nodes['pilot-company-action'].listeners.click();
 assert.deepEqual(reopened.writes,[]);
 await reopened.submit('','0123');
 reopened.nodes['pilot-company-select'].value='';
 reopened.nodes['pilot-company-action'].listeners.click();
 assert.equal(reopened.text('pilot-company-name'),'Independent');
 assert.deepEqual(JSON.parse(q.store.get(profileKey)),before);
});

test('new pilots can select Pegasus or Bifrost and switch later without changing their career',async()=>{
 for(const [id,label] of [['rift-carrier','Pegasus'],['bifrost','Bifrost']]){
  const q=open();
  assert.equal(q.nodes['pilot-company-create'].hidden,false);
  q.nodes['pilot-company-on-create'].value=id;
  await q.submit('Nova','0123','nia');
  const profile=JSON.parse(q.store.get(profileKey));
  assert.equal(profile.companyVesselId,id);
  assert.equal(q.nodes['pilot-company-create'].hidden,true);
  const status=open({store:q.store,session:q.session,route:'?view=status',state:{balance:44.5,kills:9,owned:[]}});
  assert.equal(status.text('pilot-company-name'),label);
  assert.equal(status.nodes['pilot-company-select'].value,id);
  status.nodes['pilot-company-select'].value=id==='bifrost'?'rift-carrier':'bifrost';
  status.nodes['pilot-company-action'].listeners.click();
  assert.equal(status.text('pilot-company-name'),id==='bifrost'?'Pegasus':'Bifrost');
  const {companyVesselId,...remaining}=JSON.parse(q.store.get(profileKey));
  const {companyVesselId:previous,...old}=profile;
  assert.deepEqual(remaining,old);
  assert.equal(status.text('pilot-balance'),'44.5');
  assert.equal(status.text('pilot-kills'),'9');
 }
 const q=open();q.nodes['pilot-company-on-create'].value='arbitrary-vessel';
 await q.submit('Nova','0123','nia');assert.deepEqual(q.writes,[]);
});

test('the profile displays the active purchased hull and not the parked Rift-4 state',async()=>{
 const id='bastion-9',select='rift-runner.selected-fighter.v1',key='rift-runner.hull-owned.v1';
 const q=open({hulls:[id],store:new Map([[select,id],[key,JSON.stringify({version:1,hull:'rift-fighter',condition:'damaged'})]])});
 await q.submit('Andy');
 assert.equal(q.text('pilot-hull-caption'),'Bastion-9 Fleet Fighter');
 assert.equal(q.text('pilot-hull-status'),'Bastion-9 Fleet Fighter owned.');
 assert.equal(q.nodes['pilot-retest'].hidden,true);
 q.store.set(key+'.'+id,JSON.stringify({version:1,hull:id,condition:'damaged'}));
 q.listeners.pageshow();
 assert.match(q.text('pilot-hull-status'),/Bastion-9 .* Repair required/);
 assert.equal(JSON.parse(q.store.get(key)).condition,'damaged');
});
