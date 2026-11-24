'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const dir=['../dist','..'].map(name=>path.join(__dirname,name)).find(name=>fs.existsSync(path.join(name,'pilot-credits.js')));
const read=name=>fs.readFileSync(path.join(dir,name),'utf8');
const key='rift-runner.pilot-credits.v1',script=read('pilot-credits.js');
function open({stored=null,bag=new Map(stored===null?[]:[[key,stored]]),denyRead=false,denyWrite=false,suppressWrite=false,badge=true}={}){
 const writes=[],emitted=[];const listeners={},holder={hidden:true},value={textContent:'0'},nodes=badge?{'carrier-pilot-credits':holder,'carrier-credit-value':value}:{};
 const window={
  addEventListener(name,fn){listeners[name]=fn;},
  dispatchEvent(event){emitted.push(event.type);},
  localStorage:{
   getItem(id){if(denyRead)throw Error('blocked');return bag.get(id)??null;},
   setItem(id,val){writes.push([id,val]);if(denyWrite)throw Error('quota');if(!suppressWrite)bag.set(id,val);}
  }
 };
 vm.runInNewContext(script,{window,Event,document:{getElementById:id=>nodes[id]??null}});
 return {api:window.RiftCredits,listeners,holder,value,bag,writes,emitted};
}
const plain=value=>JSON.parse(JSON.stringify(value));
const failure={saved:false,amount:0,balance:null};
test('Vandul victory awards exactly 20 credits and a new document reads the persisted balance',()=>{
 const duel=open({stored:'0',badge:false});
 assert.equal(duel.api.getBalance(),0);
 assert.deepEqual(plain(duel.api.awardVictory()),{saved:true,amount:20,balance:20});
 assert.deepEqual(plain(duel.api.awardVictory()),{saved:true,amount:20,balance:40});
 assert.equal(JSON.parse(duel.bag.get(key)).balance,40);
 const carrier=open({bag:duel.bag});
 assert.equal(carrier.holder.hidden,false);
 assert.equal(carrier.api.getBalance(),40);assert.equal(carrier.value.textContent,'40');
});
test('bad, denied, overflow and unconfirmed writes do not report a reward',()=>{
 for(const stored of ['-1','1.5','42e3','0x9','010','-0',' 0','{}','1000000000','Infinity','NaN','999999999999999999999']){
  const q=open({stored});assert.equal(q.api.getBalance(),null);
  assert.deepEqual(plain(q.api.awardVictory()),failure);assert.equal(q.bag.get(key),stored);
  assert.equal(q.value.textContent,'Unavailable');
 }
 for(const option of ['denyRead','denyWrite','suppressWrite']){
  const q=open({[option]:true});assert.deepEqual(plain(q.api.awardVictory()),failure);
 }
 const cap=open({stored:'999999979'});
 assert.deepEqual(plain(cap.api.awardVictory()),{saved:true,amount:20,balance:999999999});
 assert.deepEqual(plain(cap.api.awardVictory()),failure);assert.equal(JSON.parse(cap.bag.get(key)).balance,999999999);
});
test('Carrier shows stored balance and reloads read-only on restore and storage changes',()=>{
 const q=open({stored:'0'});
 assert.equal(q.holder.hidden,false);assert.equal(q.value.textContent,'0');
 q.bag.set(key,'1020');q.listeners.storage({key:'unrelated'});
 assert.equal(q.value.textContent,'0');
 q.listeners.storage({key});assert.equal(q.value.textContent,'1,020');
 q.bag.set(key,'1040');q.listeners.pageshow();assert.equal(q.value.textContent,'1,040');
 q.bag.clear();q.listeners.storage({key:null});assert.equal(q.value.textContent,'250');
 assert.equal(q.writes.length,0);
 q.api.awardVictory();assert.equal(q.value.textContent,'270');
 const site=read('carrier.html'),index=read('index.html'),css=read('carrier.css');
 assert.match(site,/<p[^>]+id="carrier-pilot-credits" aria-live="polite" aria-atomic="true" hidden><span>Pilot credits<\/span><strong id="carrier-credit-value">0/);
 assert.match(site,/<script src="\.\/pilot-credits\.js\?v=\d+" defer>/);
 assert.match(index,/<script src="pilot-credits\.js\?v=\d+" defer><\/script>\s*(?:<script src="\.\/fighter-registry\.js\?v=\d+" defer><\/script>\s*)?<script src="game\.js\?v=\d+" defer>/);
 assert.match(css,/\.carrier-pilot-credits\{display:flex;flex-wrap:wrap/);
 assert.match(css,/\.carrier-pilot-credits\[hidden\]\{display:none\}/);
});
test('Aegis purchase debits exactly 200 and saves ownership in the same write, only once',()=>{
 const q=open({stored:'200'});
 assert.equal(q.api.aegisPrice,200);assert.equal(q.api.ownsAegis(),false);
 assert.deepEqual(plain(q.api.buyAegis()),{status:'purchased',balance:0});
 assert.equal(q.value.textContent,'0');assert.equal(q.api.ownsAegis(),true);
 assert.deepEqual(JSON.parse(q.bag.get(key)),{version:3,origin:'legacy',balance:0,kills:0,owned:plain(q.api.getCatalog().filter(part=>!part.requiresPurchase).map(part=>part.id))});
 assert.equal(q.writes.length,1);
 const next=open({bag:q.bag});
 assert.equal(next.api.ownsAegis(),true);
 assert.deepEqual(plain(next.api.buyAegis()),{status:'owned',balance:0});
 assert.deepEqual(plain(next.api.awardVictory()),{saved:true,amount:20,balance:20});
 assert.equal(next.api.ownsAegis(),true);assert.equal(JSON.parse(q.bag.get(key)).balance,20);
});
test('a refused or unconfirmed Aegis purchase never grants ownership, nor misreports credits',()=>{
 const q=open({stored:'199'});
 assert.deepEqual(plain(q.api.buyAegis()),{status:'insufficient',balance:199});
 assert.equal(q.bag.get(key),'199');assert.equal(q.api.ownsAegis(),false);
 for(const option of ['denyRead','denyWrite','suppressWrite']){
  const q=open({stored:'200',[option]:true});
  assert.deepEqual(plain(q.api.buyAegis()),{status:'unavailable'});
  assert.equal(q.bag.get(key),'200');assert.equal(q.api.ownsAegis(),false);
 }
 const invalid=open({stored:'{"version":2,"balance":-1,"aegis":true}'});
 assert.equal(invalid.api.ownsAegis(),false);
 assert.deepEqual(plain(invalid.api.buyAegis()),{status:'unavailable'});
});
test('only a genuinely new pilot gets a bare 250-credit wallet; all essentials are affordable',()=>{
 const q=open();
 const expected={origin:'new',balance:250,kills:0,owned:[],requiredReserve:190,canBuild:false};
 assert.deepEqual(plain(q.api.getBuildState()),expected);
 assert.equal(q.value.textContent,'250');assert.equal(q.writes.length,1);
 assert.deepEqual(JSON.parse(q.bag.get(key)),{version:3,origin:'new',balance:250,kills:0,owned:[]});
 q.bag.set('rift-runner.fighter-fit.v1','{"version":1,"primary":"ak77"}');
 assert.deepEqual(plain(open({bag:q.bag}).api.getBuildState()),expected);
 assert.equal(q.api.canBuy('aegis-s3').status,'reserved');
 assert.equal(q.api.canBuy('ak77').status,'reserved');
 assert.equal(q.api.canBuy('ballistic').status,'available');
 for(const id of ['stock-thruster','weifer-he3-core','kestrel-h20-reserve-cell','blaster']){
  assert.equal(q.api.buy(id).status,'purchased');
  assert.equal(q.api.owns(id),true);
 }
 assert.equal(q.api.getBalance(),35);assert.equal(q.value.textContent,'35');
 const next=open({bag:q.bag});
 assert.equal(next.api.buy('blaster').status,'owned');
 assert.equal(next.api.getBuildState().canBuild,true);
 assert.equal(next.api.getBuildState().requiredReserve,0);
 assert.equal(next.api.getBalance(),35);
});
test('a richer initial weapon is allowed only when reserve remains, including exact zero-credit completion',()=>{
 const q=open();
 for(const id of ['stock-thruster','ballistic','weifer-he3-core','kestrel-h20-reserve-cell']){
  assert.equal(q.api.canBuy(id).status,'available',id);
  assert.equal(q.api.buy(id).status,'purchased',id);
 }
 assert.equal(q.api.getBuildState().canBuild,true);
 assert.equal(q.api.getBalance(),0);
 assert.equal(q.api.owns('blaster'),false);
 const r=open();
 assert.equal(r.api.buy('stock-thruster').status,'purchased');
 assert.equal(r.api.buy('test-thruster').status,'reserved');
 assert.equal(r.api.owns('test-thruster'),false);
});
test('migration preserves legacy cash and free fit privileges without turning a stale shield preference into paid ownership',()=>{
 const catalog=open().api.getCatalog();
 const expected=plain(catalog.filter(part=>part.category!=='shield'&&!part.requiresPurchase).map(part=>part.id));
 const validPrefs=[
  ['rift-runner.fighter-fit.v1','{"version":1,"primary":"ak77","secondary":null}'],
  ['rift-runner.engine-fit.v1','{"version":1,"engine":"test-thruster"}'],
  ['rift-runner.shot-sound.v1','ballistic']
 ];
 for(const pref of validPrefs){
  const q=open({bag:new Map([pref,['rift-runner.shield-fit.v1','aegis-s3']])});
  assert.deepEqual(plain(q.api.getBuildState()),{balance:0,owned:expected,origin:'legacy',kills:0,requiredReserve:0,canBuild:true});
  assert.equal(q.bag.get(pref[0]),pref[1]);
  assert.equal(q.api.ownsAegis(),false);
 }
 for(const balance of [0,23,250]) {
  const q=open({stored:String(balance)});
  assert.deepEqual(plain(q.api.getBuildState()),{balance,owned:expected,origin:'legacy',kills:0,requiredReserve:0,canBuild:true});
  assert.equal(q.writes.length,0);
  assert.equal(q.api.awardVictory().saved,true);
  assert.equal(q.api.getBalance(),balance+20);
 }
 const old=open({stored:'{"version":2,"balance":4,"aegis":true}'});
 assert.equal(old.api.ownsAegis(),true);assert.equal(old.api.getBalance(),4);
 assert.equal(old.api.buyAegis().status,'owned');assert.equal(old.writes.length,0);
 assert.equal(old.api.awardVictory().saved,true);assert.equal(old.api.ownsAegis(),true);
 const notFit=open({bag:new Map([['rift-runner.sound.v1','on'],['rift-runner.fighter-fit.v1','{"version":1,"primary":"prototype"}'],['rift-runner.shield-fit.v1','aegis-s3']])});
 assert.equal(notFit.api.getBuildState().origin,'new');assert.equal(notFit.api.ownsAegis(),false);
});
test('catalog is immutable and modern wallet validation preserves unknown well-formed IDs without granting current rights',()=>{
 const q=open({stored:'{"version":3,"origin":"new","balance":250,"owned":["future-laser"]}'});
 const list=q.api.getCatalog();
 assert.equal(Object.isFrozen(list),true);assert.equal(Object.isFrozen(list[0]),true);
 assert.deepEqual(plain(list.map(({id,category,price})=>[id,category,price])),[
  ['stock-thruster','engine',70],['test-thruster','engine',45],['surge-7-thruster','engine',280],['weifer-he3-core','core',60],['weifer-he3-core-mk2','core',240],['kestrel-h20-reserve-cell','battery',40],['kestrel-h30-reserve-cell','battery',180],
  ['blaster','weapon',45],['ballistic','weapon',80],['ak77','weapon',130],['aegis-s3','shield',200]
 ]);
 assert.equal(q.api.buy('future-laser').status,'unknown');assert.equal(q.api.owns('future-laser'),false);
 assert.equal(q.api.buy('blaster').status,'purchased');assert.equal(q.api.getBalance(),205);
 assert.deepEqual(JSON.parse(q.bag.get(key)).owned,['future-laser','blaster']);
 for(const w of [
  {version:3,origin:'new',balance:250,kills:0,owned:['blaster','blaster']},
  {version:3,origin:'new',balance:250,kills:0,owned:[null]},
  {version:3,origin:'fake',balance:250,owned:[]},
  {version:3,origin:'legacy',balance:-1,owned:['aegis-s3']}
 ]){
  const stored=JSON.stringify(w),bad=open({stored});
  assert.equal(bad.api.getBalance(),null);
  assert.equal(bad.api.buy('blaster').status,'unavailable');
  assert.equal(bad.bag.get(key),stored);assert.equal(bad.writes.length,0);
 }
});
test('failed or suppressed writes do not update a new pilot’s balance, ownership or badge',()=>{
 for(const option of ['denyWrite','suppressWrite']){
  const q=open({[option]:true});
  assert.equal(q.api.buy('blaster').status,'unavailable');
  assert.equal(q.api.owns('blaster'),false);
  assert.equal(q.api.getBalance(),250);
  assert.equal(q.value.textContent,'250');
 }
 const q=open({stored:'0'});
 q.api.awardVictory();const fit=q.api.getBuildState();
 assert.equal(q.api.buy('unknown').status,'unknown');
 fit.owned.length=0;assert.equal(q.api.owns('blaster'),true);
});
test('enemy kills update count and +2.5 credits atomically without dropping ownership',()=>{
 const q=open({stored:'{"version":2,"balance":6,"aegis":true}'});
 assert.equal(q.api.getBuildState().kills,0);assert.equal(q.writes.length,0);
 assert.deepEqual(plain(q.api.recordEnemyKill()),{saved:true,kills:1,amount:2.5});
 assert.equal(q.writes.length,1);assert.equal(q.value.textContent,'8.5');
 assert.equal(JSON.parse(q.writes[0][1]).kills,1);assert.equal(JSON.parse(q.writes[0][1]).balance,8.5);
 assert.deepEqual(plain(q.api.recordEnemyKill()),{saved:true,kills:2,amount:2.5});
 assert.deepEqual(q.emitted,['rift:walletchange','rift:walletchange']);
 assert.equal(q.api.getBalance(),11);assert.equal(q.api.ownsAegis(),true);
 const same=open({bag:q.bag});
 assert.equal(same.api.getBuildState().kills,2);
 assert.equal(same.api.awardVictory().saved,true);
 assert.equal(same.api.getBuildState().kills,2);assert.equal(same.api.getBalance(),31);
 const beforeKills=open({stored:'{"version":3,"origin":"new","balance":250,"owned":[]}'});
 assert.equal(beforeKills.api.getBuildState().kills,0);
 assert.equal(beforeKills.api.recordEnemyKill().saved,true);
 assert.equal(beforeKills.api.buy('blaster').status,'purchased');
 assert.equal(beforeKills.api.getBuildState().kills,1);
 assert.equal(beforeKills.api.getBalance(),207.5);
});
test('kill acknowledgement is unavailable on denied, malformed or overflow records',()=>{
 for(const option of ['denyRead','denyWrite','suppressWrite']){
  const q=open({stored:'0',[option]:true});
  assert.deepEqual(plain(q.api.recordEnemyKill()),{saved:false,kills:null});
  assert.equal(q.bag.get(key),'0');assert.deepEqual(q.emitted,[]);
 }
 for(const kills of [-1,null,1.25,Number.MAX_SAFE_INTEGER,Number.MAX_SAFE_INTEGER+1]){
  const stored=JSON.stringify({version:3,origin:'legacy',balance:0,owned:[],kills});
  const q=open({stored});
  assert.deepEqual(plain(q.api.recordEnemyKill()),{saved:false,kills:null});
  assert.equal(q.api.getBuildState().kills,kills===Number.MAX_SAFE_INTEGER?kills:null);
  assert.equal(q.bag.get(key),stored);assert.deepEqual(q.emitted,[]);
 }
});
test('every reachable purchase sequence retains funding for a flight-ready set of module categories',()=>{
 const modules=open().api.getCatalog(),queue=[null],visited=new Set();
 while(queue.length){
  const q=open({stored:queue.shift(),badge:false});
  const {balance,owned,requiredReserve,canBuild}=q.api.getBuildState();
  const fingerprint=owned.slice().sort().join(',');
  if(visited.has(fingerprint))continue;
  visited.add(fingerprint);
  assert.ok(balance>=requiredReserve,fingerprint);
  assert.equal(canBuild,['engine','core','battery','weapon'].every(kind=>owned.some(id=>modules.find(part=>part.id===id).category===kind)));
  for(const {id} of modules){
   const attempt=open({stored:q.bag.get(key),badge:false});
   if(attempt.api.buy(id).status==='purchased')queue.push(attempt.bag.get(key));
  }
 }
 assert.ok(visited.size>30);
});

test('wallet accepts exact half credits, rejects other fractions/strings, and keeps the cap atomic',()=>{
 for(const balance of [0.1,7.25,-.5,'2.5',1000000000]){
  const q=open({stored:JSON.stringify({version:3,origin:'new',balance,owned:[],kills:4})});
  assert.equal(q.api.getBalance(),null);assert.equal(q.api.recordEnemyKill().saved,false);assert.equal(q.writes.length,0);
 }
 const q=open({stored:JSON.stringify({version:3,origin:'new',balance:999999996.5,owned:[],kills:4})});
 assert.equal(q.api.recordEnemyKill().saved,true);assert.equal(q.api.getBalance(),999999999);
 assert.equal(q.api.recordEnemyKill().saved,false);assert.equal(q.api.getBuildState().kills,5);
 assert.equal(q.writes.length,1);
});
test('mission reward operations reject stale generation; current guest save and current generation work',()=>{
 const generation='rift-runner.character-generation.v1',fresh='a'.repeat(32),next='b'.repeat(32);
 const q=open({badge:false});
 assert.equal(q.api.recordEnemyKill(null).saved,true);
 assert.equal(q.api.getBalance(),252.5);
 q.bag.set(generation,fresh);const n=q.writes.length;
 assert.equal(q.api.awardVictory(null).saved,false);
 assert.equal(q.api.recordEnemyKill(null).saved,false);
 assert.equal(q.writes.length,n);
 assert.equal(q.api.awardVictory(fresh).saved,true);
 assert.equal(q.api.recordEnemyKill(fresh).saved,true);
 q.bag.set(generation,next);const last=q.api.getBalance();
 assert.equal(q.api.awardVictory(fresh).saved,false);
 assert.equal(q.api.recordEnemyKill(fresh).saved,false);
 assert.equal(q.api.getBalance(),last);
});

test('paid hulls preserve the basic build reserve and existing wallet fields without becoming modules',()=>{
 const id='stocky-light-fighter',hull='bastion-9';
 const record=balance=>JSON.stringify({version:3,origin:'new',balance,kills:12,owned:['future-part-id']});
 const insufficient=open({stored:record(324.5)});
 assert.equal(insufficient.api.buy(id).status,'insufficient');
 assert.equal(insufficient.writes.length,0);
 const reserved=open({stored:record(514.5)});
 assert.equal(reserved.api.buy(id).status,'reserved');
 assert.equal(reserved.writes.length,0);
 const exact=open({stored:record(515)});
 assert.equal(exact.api.getBuildState().requiredReserve,190);
 assert.equal(exact.api.buy(id).status,'purchased');
 assert.equal(exact.api.buy(id).status,'owned');
 assert.equal(exact.api.buy(hull).status,'insufficient');
 assert.equal(exact.writes.length,1);
 assert.deepEqual(JSON.parse(exact.bag.get(key)),{version:3,origin:'new',balance:190,kills:12,owned:['future-part-id',id]});
 assert.deepEqual(plain(exact.api.getBuildState().owned),[]);
 assert.equal(exact.api.getCatalog().some(part=>part.id===id),false);
 assert.equal(exact.api.owns(id),false);assert.equal(exact.api.ownsHull(id),true);
 assert.deepEqual(plain(open({bag:exact.bag}).api.getOwnedHullIds()),[id]);
 assert.deepEqual(plain(open({stored:'500'}).api.getOwnedHullIds()),[],'legacy gear does not grant fighters');
 assert.equal(open({stored:record(1000),denyWrite:true}).api.buy(hull).status,'unavailable');
});

test('Surge-7 is an optional purchase and is never free in starter or legacy wallets',()=>{
 const id='surge-7-thruster',ready=balance=>JSON.stringify({version:3,origin:'new',balance,kills:0,owned:[]});
 for(const stored of [null,'600','{"version":2,"balance":600,"aegis":true}']){
  const q=open({stored});assert.equal(q.api.owns(id),false);assert.equal(q.api.getBuildState().owned.includes(id),false);
 }
 const unknownOld=open({bag:new Map([['rift-runner.engine-fit.v1','{"version":1,"engine":"surge-7-thruster"}']])});
 assert.equal(unknownOld.api.getBuildState().origin,'new');
 const q=open({stored:ready(424.5)});
 assert.equal(q.api.canBuy(id).status,'reserved');assert.equal(q.api.canBuy(id).requiredReserve,145);
 assert.equal(q.api.buy(id).status,'reserved');assert.equal(q.writes.length,0);
 const enough=open({stored:ready(425)});
 assert.equal(enough.api.buy(id).status,'purchased');assert.equal(enough.api.buy(id).status,'owned');
 assert.equal(enough.api.getBalance(),145);assert.equal(enough.writes.length,1);
 assert.equal(enough.api.owns(id),true);
 assert.equal(open({bag:enough.bag}).api.owns(id),true);
});

test('high-capacity battery and Mk II generator preserve starter reserve and never come free',()=>{
 const core='weifer-he3-core-mk2',cell='kestrel-h30-reserve-cell',wallet=balance=>JSON.stringify({version:3,origin:'new',balance,kills:2,owned:[]});
 for(const stored of [null,'600','{"version":2,"balance":600,"aegis":true}']){
  const q=open({stored});assert.equal(q.api.owns(core),false);assert.equal(q.api.owns(cell),false);
 }
 const poor=open({stored:wallet(250)});
 assert.equal(poor.api.getBuildState().requiredReserve,190);
 const almost=open({stored:wallet(509.5)});
 assert.equal(almost.api.buy(core).status,'purchased');
 assert.equal(almost.api.buy(cell).status,'reserved');
 assert.equal(almost.api.getBalance(),269.5);
 const enough=open({stored:wallet(510)});
 assert.equal(enough.api.buy(core).status,'purchased');assert.equal(enough.api.buy(cell).status,'purchased');
 assert.equal(enough.api.buy(core).status,'owned');assert.equal(enough.api.buy(cell).status,'owned');
 assert.equal(enough.writes.length,2);assert.equal(enough.api.getBalance(),90);
 const resumed=open({bag:enough.bag});
 assert.deepEqual(plain(resumed.api.getBuildState()),{balance:90,owned:[core,cell],origin:'new',kills:2,requiredReserve:90,canBuild:false});
});
