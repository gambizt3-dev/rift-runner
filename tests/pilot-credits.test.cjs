'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const dir=['../dist','..'].map(name=>path.join(__dirname,name)).find(name=>fs.existsSync(path.join(name,'pilot-credits.js')));
const read=name=>fs.readFileSync(path.join(dir,name),'utf8');
const key='rift-runner.pilot-credits.v1',script=read('pilot-credits.js');
function open({stored=null,bag=new Map(stored===null?[]:[[key,stored]]),denyRead=false,denyWrite=false,suppressWrite=false,badge=true}={}){
 const listeners={},holder={hidden:true},value={textContent:'0'},nodes=badge?{'carrier-pilot-credits':holder,'carrier-credit-value':value}:{};
 const window={
  addEventListener(name,fn){listeners[name]=fn;},
  localStorage:{
   getItem(id){if(denyRead)throw Error('blocked');return bag.get(id)??null;},
   setItem(id,val){if(denyWrite)throw Error('quota');if(!suppressWrite)bag.set(id,val);}
  }
 };
 vm.runInNewContext(script,{window,document:{getElementById:id=>nodes[id]??null}});
 return {api:window.RiftCredits,listeners,holder,value,bag};
}
const plain=value=>JSON.parse(JSON.stringify(value));
const failure={saved:false,amount:0,balance:null};
test('Vandul victory awards exactly 20 credits and a new document reads the persisted balance',()=>{
 const duel=open({badge:false});
 assert.equal(duel.api.getBalance(),0);
 assert.deepEqual(plain(duel.api.awardVictory()),{saved:true,amount:20,balance:20});
 assert.deepEqual(plain(duel.api.awardVictory()),{saved:true,amount:20,balance:40});
 assert.equal(duel.bag.get(key),'40');
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
 assert.deepEqual(plain(cap.api.awardVictory()),failure);assert.equal(cap.bag.get(key),'999999999');
});
test('Carrier shows zero, reloads on restore and storage changes, and remains read-only',()=>{
 const q=open();
 assert.equal(q.holder.hidden,false);assert.equal(q.value.textContent,'0');
 q.bag.set(key,'1020');q.listeners.storage({key:'unrelated'});
 assert.equal(q.value.textContent,'0');
 q.listeners.storage({key});assert.equal(q.value.textContent,'1,020');
 q.bag.set(key,'1040');q.listeners.pageshow();assert.equal(q.value.textContent,'1,040');
 q.bag.clear();q.listeners.storage({key:null});assert.equal(q.value.textContent,'0');
 q.api.awardVictory();assert.equal(q.value.textContent,'20');
 const site=read('carrier.html'),index=read('index.html'),css=read('carrier.css');
 assert.match(site,/<p[^>]+id="carrier-pilot-credits" aria-live="polite" aria-atomic="true" hidden><span>Pilot credits<\/span><strong id="carrier-credit-value">0/);
 assert.match(site,/<script src="\.\/pilot-credits\.js\?v=1" defer>/);
 assert.match(index,/<script src="pilot-credits\.js\?v=1" defer><\/script>\s*<script src="game\.js\?v=\d+" defer>/);
 assert.match(css,/\.carrier-pilot-credits\{display:flex;flex-wrap:wrap/);
 assert.match(css,/\.carrier-pilot-credits\[hidden\]\{display:none\}/);
});
