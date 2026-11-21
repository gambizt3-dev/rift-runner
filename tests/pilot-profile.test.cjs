'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),test=require('node:test'),assert=require('node:assert/strict');
const {webcrypto}=require('node:crypto');
const read=name=>fs.readFileSync(path.join(__dirname,'../dist',name),'utf8');
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
  setAttribute(k,v){this.attrs[k]=v;},removeAttribute(k){delete this.attrs[k];}};
}
function open({store=new Map(),session=new Map(),denyWrite=false,denyRead=false,crypto=webcrypto,state={balance:250,owned:[],requiredReserve:190,canBuild:false},modules=catalog}={}){
 const nodes=Object.fromEntries(names.map(name=>[name,element()])),listeners={},writes=[];
 const window={crypto,location:new URL('https://rift.example/pilot-profile.html?callsign=Andy'),
  sessionStorage:{getItem(k){return session.get(k)??null;},setItem(k,v){session.set(k,v);},removeItem(k){session.delete(k);}},
  localStorage:{getItem(key){if(denyRead)throw Error('read denied');return store.get(key)??null;},setItem(key,value){if(denyWrite)throw Error('write denied');writes.push(key);store.set(key,value);}},
  RiftCredits:{getBuildState:()=>state,getCatalog:()=>modules},
  addEventListener(name,fn){listeners[name]=fn;}
 };
 const document={getElementById:id=>nodes[id],createElement:element};
 vm.runInNewContext(program,{window,document,TextEncoder});
 const submit=async(input,code='0123')=>{nodes['pilot-callsign'].value=input;nodes['pilot-pin'].value=code;let prevented=false;await nodes['pilot-callsign-form'].listeners.submit({preventDefault(){prevented=true;}});assert.equal(prevented,true);};
 return {nodes,listeners,writes,submit,store,session,text:id=>nodes[id].textContent,lock:()=>nodes['pilot-profile-lock'].listeners.click()};
}
test('Create Character starts blank, hashes entered PIN and displays Pilot 001 only after unlock',async()=>{
 const q=open();assert.equal(q.nodes['pilot-callsign'].value,'');assert.deepEqual(q.writes,[]);
 assert.equal(q.nodes['pilot-portrait'].hidden,true);assert.equal(q.nodes['pilot-portrait-image'].attrs.src,undefined);
 await q.submit(' Andy ');
 assert.equal(q.text('pilot-saved-callsign'),'Andy');assert.deepEqual(q.writes,[profileKey]);
 const record=JSON.parse(q.store.get(profileKey));
 assert.deepEqual(Object.keys(record),['version','callsign','salt','verifier','iterations']);
 assert.match(record.salt,/^[0-9a-f]{32}$/);assert.match(record.verifier,/^[0-9a-f]{64}$/);assert.equal(record.iterations,310000);
 assert.equal(q.session.get(sessionKey),record.salt);assert.equal(q.nodes['pilot-pin'].value,'');
 assert.equal(q.nodes['pilot-portrait'].hidden,false);assert.match(q.nodes['pilot-portrait-image'].attrs.src,/pilot-001-andy.webp/);
 assert.equal(open({store:q.store,session:q.session}).text('pilot-saved-callsign'),'Andy');
 q.lock();assert.equal(q.text('identity-title'),'Unlock profile');assert.equal(q.nodes['pilot-portrait'].hidden,true);assert.equal(q.nodes['pilot-portrait-image'].attrs.src,undefined);
 const reopened=open({store:q.store});
 await reopened.submit('ignored','1111');assert.match(reopened.text('pilot-profile-feedback'),/did not match/);
 assert.equal(reopened.nodes['pilot-wallet-panel'].hidden,true);assert.deepEqual(reopened.writes,[]);
 await reopened.submit('ignored','0123');assert.equal(reopened.text('pilot-saved-callsign'),'Andy');
 await reopened.submit('Starling');assert.equal(reopened.text('pilot-saved-callsign'),'Starling');assert.equal(reopened.nodes['pilot-portrait'].hidden,true);
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
 state.kills=13;q.listeners['rift:walletchange']();assert.equal(q.text('pilot-kills'),'13');assert.deepEqual(q.writes,[profileKey]);
 const blank=open({store:q.store,session:q.session});assert.equal(blank.text('pilot-balance'),'250');assert.equal(blank.text('pilot-kills'),'0');assert.match(blank.text('pilot-build-detail'),/190 CR/);
 const unavailable=open({store:q.store,session:q.session,state:{balance:null,owned:[],canBuild:false}});assert.equal(unavailable.text('pilot-kills'),'—');assert.match(unavailable.text('pilot-parts-empty'),/unavailable/i);
});
test('responsive, local-only form, clear stops and versioned scripts',()=>{
 assert.match(html,/width=device-width, initial-scale=1/);assert.match(css,/@media\(max-width:640px\).*minmax\(0,1fr\)/s);
 assert.match(css,/min-block-size:44px/);assert.doesNotMatch(css,/overflow:\s*hidden/);
 assert.match(html,/href="\.\/index\.html"/);assert.match(html,/href="\.\/carrier-shop\.html"/);assert.match(html,/hangar=carrier/);
 for(const file of ['pilot-profile.css','pilot-credits.js','pilot-profile.js'])assert.ok(html.includes(file+'?v=75'));
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
 assert.equal(n.text('pilot-build-status'),'Parts available to fit');
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
