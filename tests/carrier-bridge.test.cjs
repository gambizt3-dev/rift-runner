'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),test=require('node:test'),vm=require('node:vm');
const site=['../dist','..'].map(p=>path.join(__dirname,p)).find(p=>fs.existsSync(path.join(p,'carrier-bridge.html')));
const read=name=>fs.readFileSync(path.join(site,name),'utf8');
const stock={engine:'stock-thruster',core:'weifer-he3-core',battery:'kestrel-h20-reserve-cell',primary:'blaster'};
const build=slots=>({version:1,hull:'rift-fighter',...slots});
const owned=Object.values(stock);
function play({origin='new',parts=[],saved=null,hull=null,storage=new Map(),kills=()=>0}={}){
 const ids=['bridge-title','bridge-captain','bridge-mission','mission-parts','mission-status','mission-next','mission-shop','mission-hangar','mission-title','bridge-scene','captain-voice','mission-lodge','mission-accept','mission-launch','mission-picker','mission-select','mission-orders','mission-kicker','bridge-notice'];
 const node=()=>({hidden:true,dataset:{},attrs:{},listeners:{},children:[],textContent:'',
  focus(){this.focused=true;},append(...kids){this.children.push(...kids);},replaceChildren(...kids){this.children=kids;},
  contains(el){return el===this||[nodes['mission-title'],nodes['mission-lodge']].includes(el);},
  setAttribute(n,v){this.attrs[n]=v;},addEventListener(n,f){this.listeners[n]=f;},
  removeAttribute(n){if(n==='data-next')delete this.dataset.next;}
 });
 const nodes=Object.fromEntries(ids.map(id=>[id,node()]));
 const voice=nodes['captain-voice'];
 Object.assign(voice,{plays:0,pauses:0,currentTime:42,play(){this.plays++;return Promise.resolve();},pause(){this.pauses++;}});
 storage.set('rift-runner.ship-build.v1',JSON.stringify(saved));
 storage.set('rift-runner.hull-owned.v1',JSON.stringify(hull));
 const window={
  events:{},addEventListener(n,f){this.events[n]=f;},
  localStorage:{getItem:key=>storage.get(key)??null,setItem:(key,v)=>storage.set(key,v)}
 };
 const prices=[70,60,40,45,45,80],categories=['engine','core','battery','weapon','engine','weapon'];
 const catalog=[...owned,'test-thruster','ballistic'].map((id,i)=>({id,price:prices[i],category:categories[i],name:id}));
 window.RiftCredits={getBuildState:()=>({origin,owned:parts,kills:kills()}),getCatalog:()=>catalog};
 const document={getElementById:id=>nodes[id],createElement:node};
 const ctx=vm.createContext({document,window});
 for(const file of ['pilot-missions.js','carrier-bridge.js'])vm.runInContext(read(file),ctx);
 return {nodes,window,voice,storage,document,lodge:()=>nodes['mission-lodge'].listeners.click(),talk:()=>nodes['bridge-captain'].listeners.click(),
  rows:()=>nodes['mission-parts'].children.map(r=>[r.dataset.owned,...r.children.map(c=>c.textContent)])};
}
test('the carrier links to the bridge; captain artwork, dialog control and quest detours are available',()=>{
 assert.match(read('carrier.html'),/id="carrier-bridge" href="\.\/carrier-bridge\.html">Bridge/);
 const page=read('carrier-bridge.html');
 assert.match(page,/id="bridge-scene" data-captain="back"/);
 assert.match(page,/carrier-bridge-clean\.webp\?v=94/);
 assert.match(page,/captain-bridge-front\.webp\?v=94/);
 assert.match(page,/captain-bridge-back\.webp\?v=94/);
 assert.match(read('carrier-bridge.css'),/data-talking=true\] \.scene-art\{transform:scale/);
 assert.match(page,/aria-controls="bridge-mission" aria-expanded="false"/);
 assert.match(page,/href="\.\/carrier-shop\.html"/);
 assert.match(page,/href="\.\/index\.html\?hangar=carrier"/);

});
test('the captain starts a live read-only checklist; purchased parts are crossed off immediately',()=>{
 const parts=[stock.battery],q=play({parts});
 assert.equal(q.nodes['bridge-mission'].hidden,true);
 assert.equal(q.nodes['bridge-scene'].dataset.captain,'front');
 assert.equal(q.nodes['bridge-captain'].hidden,false);
 q.talk();
 assert.equal(q.nodes['bridge-mission'].hidden,false);
 assert.equal(q.nodes['bridge-captain'].attrs['aria-expanded'],'true');
 assert.equal(q.nodes['mission-title'].focused,true);
 assert.deepEqual(q.rows()[2],['true',stock.battery,'Owned']);
 assert.equal(q.nodes['mission-shop'].dataset.next,'true');
 assert.match(q.nodes['mission-next'].textContent,/stock-thruster/);
 parts.push(stock.engine);q.window.events['rift:walletchange']();
 assert.deepEqual(q.rows()[0],['true',stock.engine,'Owned']);
 assert.match(q.nodes['mission-status'].textContent,/2\/4 acquired · 0\/4 fitted/);
 q.talk();assert.equal(q.nodes['bridge-mission'].hidden,true);
});
test('the briefing points to the hangar after purchase, never claims a damaged ship is flight-ready',()=>{
 const q=play({parts:owned,saved:build(stock),hull:build({condition:'repairing'})});q.talk();
 assert.match(q.nodes['mission-status'].textContent,/4\/4 acquired · 0\/4 fitted/);
 assert.equal(q.nodes['mission-hangar'].dataset.next,'true');
 assert.match(q.nodes['mission-next'].textContent,/repair/);
});
test('already fitted and equivalent starter choices unlock turn-in without rebuying',()=>{
 const q=play({parts:[...owned.filter(id=>id!==stock.engine&&id!==stock.primary),'test-thruster','ballistic'],
  saved:build({...stock,engine:'test-thruster',primary:'ballistic'}),hull:build({condition:'repaired'})});q.talk();
 assert.equal(q.nodes['mission-status'].textContent,'Ready to turn in');
 assert.equal(q.nodes['mission-lodge'].hidden,false);
 assert.deepEqual(q.rows().map(r=>r[2]),['Fitted','Fitted','Fitted','Fitted']);
 assert.deepEqual(q.rows()[3],['true','ballistic','Fitted']);
});

test('captain audio starts on a tap, stops on close or navigation, and can replay',()=>{
 const q=play();
 const page=read('carrier-bridge.html');
 assert.match(page,/<audio id="captain-voice" src="\.\/captain-starter-ship-rift-four\.mp3\?v=90"/);
 assert.match(page,/Get that Rift Four ready to fly\. Mara has the parts in the shop\. Once you have them, fit them in the hangar\./);
 assert.ok(fs.statSync(path.join(site,'captain-starter-ship-rift-four.mp3')).size>0);
 assert.equal(q.voice.plays,0);
 q.talk();
 assert.equal(q.voice.plays,1);
 assert.equal(q.voice.currentTime,0);
 q.voice.currentTime=3;
 q.talk();
 assert.equal(q.voice.pauses,1);
 assert.equal(q.voice.currentTime,0);
 q.talk();
 assert.equal(q.voice.plays,2);
 q.window.events.pagehide();
 assert.equal(q.voice.pauses,2);
});
test('audio rejection leaves the briefing readable',async()=>{
 const q=play();
 q.voice.play=()=>Promise.reject(new Error('Playback blocked'));
 q.talk();
 await Promise.resolve();
 assert.equal(q.nodes['bridge-mission'].hidden,false);
 assert.equal(q.rows().length,4);
});

test('lodge only when ready, record once, survive unequipping and reload, and fence character resets',()=>{
 const q=play({parts:owned,saved:build(stock),hull:build({condition:'repaired'})});
 const key='rift-runner.mission-log.v1';
 q.lodge();assert.equal(q.storage.has(key),false);
 q.talk();assert.equal(q.storage.has(key),false);
 q.storage.set('rift-runner.ship-build.v1',JSON.stringify(build({...stock,engine:null})));
 q.lodge();assert.equal(q.storage.has(key),false,'even a stale visible button checks the fit again');
 q.storage.set('rift-runner.ship-build.v1',JSON.stringify(build(stock)));
 q.lodge();
 const raw=q.storage.get(key);
 assert.equal(q.nodes['bridge-mission'].hidden,true);
 assert.equal(q.nodes['bridge-captain'].attrs['aria-expanded'],'false');
 assert.match(q.nodes['bridge-notice'].textContent,/Completion saved/);
 assert.equal(q.nodes['bridge-scene'].dataset.captain,'front');
 assert.equal(q.nodes['bridge-captain'].hidden,false);
 assert.equal(q.nodes['bridge-title'].focused,true);
 assert.ok(JSON.parse(raw).completedAt>0);
 q.lodge();assert.equal(q.storage.get(key),raw);
 const reloaded=play({parts:owned,saved:build({...stock,engine:null}),hull:build({condition:'repaired'}),storage:q.storage});
 reloaded.talk();
 assert.equal(reloaded.nodes['bridge-mission'].hidden,false);
 assert.equal(reloaded.nodes['mission-title'].textContent,'Vandul Intercept');
 assert.equal(reloaded.nodes['bridge-scene'].dataset.captain,'front');
 assert.equal(reloaded.nodes['bridge-captain'].hidden,false);
 assert.equal(reloaded.nodes['bridge-notice'].textContent,'');
 assert.equal(reloaded.nodes['mission-lodge'].hidden,true);
 assert.equal(reloaded.voice.plays,0,'do not replay the old assignment for a completed quest');
 const before=reloaded.window.RiftMissions.generation();
 q.storage.set('rift-runner.character-generation.v1','different');
 assert.equal(reloaded.window.RiftMissions.getStarter(),null);
 assert.equal(reloaded.window.RiftMissions.lodgeStarter(before),null);
 assert.match(read('pilot-profile.html'),/Completed quests/);
 assert.match(read('pilot-profile.js'),/rift-runner\.mission-log\.v1/);
});
test('a failed save never shows the mission as lodged',()=>{
 const q=play({parts:owned,saved:build(stock),hull:build({condition:'repaired'})});
 q.talk();
 q.window.localStorage.setItem=()=>{throw Error('Quota');};
 q.lodge();
 assert.equal(q.nodes['mission-status'].textContent,'Ready to turn in');
 assert.match(q.nodes['mission-next'].textContent,/Could not save/);
 assert.equal(q.nodes['bridge-mission'].hidden,false);
});

test('completion saved in another tab closes an already open briefing',()=>{
 const q=play({parts:owned,saved:build(stock),hull:build({condition:'repaired'})});
 q.talk();
 const other=play({storage:q.storage,parts:owned,saved:build(stock),hull:build({condition:'repaired'})});
 other.talk();other.lodge();
 q.document.activeElement=q.nodes['mission-lodge'];
 q.window.events.storage();
 assert.equal(q.nodes['bridge-mission'].hidden,true);
 assert.equal(q.nodes['bridge-scene'].dataset.captain,'front');
 assert.equal(q.nodes['bridge-captain'].hidden,false);
 assert.equal(q.nodes['bridge-title'].focused,true);
 assert.equal(q.nodes['bridge-captain'].attrs['aria-expanded'],'false');
 assert.equal(q.voice.pauses,1);
});

test('starter completion in another tab switches the next available mission without stealing focus',()=>{
 const q=play();
 const other=play({storage:q.storage,parts:owned,saved:build(stock),hull:build({condition:'repaired'})});
 other.talk();other.lodge();
 q.document.activeElement=q.nodes['bridge-captain'];
 q.window.events.storage();
 assert.equal(q.nodes['bridge-captain'].hidden,false);
 assert.equal(q.nodes['bridge-scene'].dataset.captain,'front');
 assert.equal(q.nodes['bridge-title'].focused,undefined);
 q.talk();assert.equal(q.nodes['mission-title'].textContent,'Vandul Intercept');
 assert.equal(q.voice.plays,0);
});

test('Captain offers, accepts, tracks and lodges the second quest without replaying starter voice',()=>{
 const q=play({parts:owned,saved:build(stock),hull:build({condition:'repaired'})});
 const log=q.window.RiftMissions,gen=log.generation();
 assert.equal(log.acceptIntercept(gen),null,'starter quest must be lodged first');
 q.talk();q.lodge();q.talk();assert.equal(q.voice.plays,1);
 assert.equal(q.nodes['mission-title'].textContent,'Vandul Intercept');
 assert.equal(q.nodes['mission-accept'].hidden,false);
 assert.equal(q.nodes['mission-launch'].hidden,true);
 assert.match(read('carrier-bridge.html'),/id="mission-launch" href="\.\/index\.html\?launch=vandul"/);
 q.nodes['mission-accept'].listeners.click();
 const accepted=log.getIntercept();
 assert.ok(accepted.acceptedAt>0);
 assert.equal(q.nodes['mission-launch'].hidden,false);
 assert.equal(q.nodes['mission-accept'].hidden,true);
 q.lodge();assert.equal(log.getIntercept().lodgedAt,undefined);
 assert.equal(log.winIntercept('wrong-generation',accepted.acceptedAt),null);
 assert.equal(log.winIntercept(gen,accepted.acceptedAt+1),null);
 assert.ok(log.winIntercept(gen,accepted.acceptedAt).victoryAt>0);
 q.window.events.storage();assert.equal(q.nodes['mission-launch'].hidden,true);
 assert.equal(q.nodes['mission-lodge'].hidden,false);
 q.lodge();assert.ok(log.getIntercept().lodgedAt>0);
 const receipt=q.storage.get('rift-runner.mission-log.v1');
 assert.equal(q.nodes['bridge-scene'].dataset.captain,'back');
 assert.equal(q.nodes['bridge-captain'].hidden,true);
 assert.equal(q.nodes['bridge-mission'].hidden,true);
 q.lodge();assert.equal(q.storage.get('rift-runner.mission-log.v1'),receipt);
 assert.equal(log.getStarter().completedAt,JSON.parse(receipt).completedAt);
});

test('the tenth saved kill unlocks Wingman alongside an Intercept turn-in without awarding the badge',()=>{
 let kills=10;
 const q=play({parts:owned,saved:build(stock),hull:build({condition:'repaired'}),kills:()=>kills});
 const log=q.window.RiftMissions,gen=log.generation(),n=q.nodes;
 assert.equal(log.acceptWingman(gen),null,'starter still comes first');
 q.talk();q.lodge();q.talk();kills=9;q.window.events['rift:walletchange']();
 assert.equal(log.wingmanEligible(),false);
 assert.equal(log.acceptWingman(gen),null);
 assert.equal(n['mission-picker'].hidden,true);
 n['mission-accept'].listeners.click();
 const intercept=log.getIntercept();
 assert.ok(log.winIntercept(gen,intercept.acceptedAt));
 kills=10;q.window.events['rift:walletchange']();
 assert.equal(n['mission-lodge'].hidden,false,'first ten-kill victory can leave Intercept ready');
 assert.deepEqual(n['mission-select'].children.map(o=>o.textContent),['Vandul Intercept','Wingman Qualification']);
 assert.equal(log.getWingman(),null);
 n['mission-select'].value='wingman';n['mission-select'].listeners.change();
 assert.equal(n['mission-title'].textContent,'Wingman Qualification');
 assert.match(n['mission-orders'].textContent,/One allied fighter will launch alongside you/);
 assert.equal(n['mission-lodge'].hidden,true);
 assert.equal(n['mission-select'].value,'wingman');
 n['mission-accept'].listeners.click();
 const wingman=log.getWingman();
 assert.ok(wingman.acceptedAt);
 assert.equal(wingman.lodgedAt,undefined);
 assert.equal(n['mission-launch'].attrs.href,'./index.html?launch=vandul&mission=wingman');
 q.lodge();assert.equal(log.getWingman().lodgedAt,undefined);
 assert.equal(log.winWingman('wrong-generation',wingman.acceptedAt),null);
 assert.equal(log.winWingman(gen,wingman.acceptedAt+1),null);
 n['mission-select'].value='intercept';n['mission-select'].listeners.change();q.lodge();
 assert.ok(log.getIntercept().lodgedAt>0);
 if(n['bridge-mission'].hidden)q.talk();
 assert.equal(n['mission-title'].textContent,'Wingman Qualification');
 assert.match(n['mission-orders'].textContent,/One allied fighter will launch alongside you/);
 assert.ok(log.winWingman(gen,wingman.acceptedAt));
 q.window.events.pageshow();
 assert.equal(n['mission-status'].textContent,'Ready to turn in');
 assert.equal(log.getWingman().lodgedAt,undefined);
 q.lodge();const lodged=log.getWingman().lodgedAt;
 assert.ok(lodged>0);
 assert.equal(n['mission-launch'].textContent,'Re-fly Wingman sortie');
 assert.equal(n['mission-launch'].hidden,false);
 assert.equal(n['mission-lodge'].hidden,true);
 const raw=q.storage.get('rift-runner.mission-log.v1');
 assert.equal(log.lodgeWingman(gen,wingman.acceptedAt).lodgedAt,lodged);
 assert.equal(q.storage.get('rift-runner.mission-log.v1'),raw);
 const again=play({parts:owned,saved:build(stock),hull:build({condition:'repaired'}),storage:q.storage});
 again.talk();assert.equal(again.nodes['mission-launch'].textContent,'Re-fly Wingman sortie');
 assert.equal(again.nodes['mission-launch'].hidden,false);
});

test('all Captain qualifications require their exact kill threshold and the previous turn-in',()=>{
 let kills=0;
 const q=play({parts:owned,saved:build(stock),hull:build({condition:'repaired'}),kills:()=>kills});
 const log=q.window.RiftMissions,gen=log.generation(),n=q.nodes;
 const expected=[['wingman','Wingman',10],['ace','Ace',25],['flight-lead','Flight Lead',50],['veteran','Veteran',75],
  ['vanguard','Vanguard',150],['rift-legend','Rift Legend',300]];
 assert.deepEqual(JSON.parse(JSON.stringify(log.qualifications.map(x=>[x.id,x.rank,x.kills]))),expected);
 q.talk();q.lodge();q.talk();
 const saved={};
 for(const [i,[id,rank,threshold]] of expected.entries()){
  kills=threshold-1;
  assert.equal(log.qualificationEligible(id),false);
  assert.equal(log.acceptQualification(id,gen),null);
  kills=threshold;
  assert.equal(log.qualificationEligible(id),true);
  q.window.events['rift:walletchange']();
  n['mission-select'].value=id;n['mission-select'].listeners.change();
  assert.equal(n['mission-title'].textContent,rank+' Qualification');
  n['mission-accept'].listeners.click();
  const mission=log.getQualification(id);
  assert.ok(mission.acceptedAt);
  assert.equal(n['mission-launch'].attrs.href,'./index.html?launch=vandul&mission='+id);
  assert.equal(log.lodgeQualification(id,gen,mission.acceptedAt),null);
  if(i<expected.length-1){
   kills=expected[i+1][2];
   assert.equal(log.qualificationEligible(expected[i+1][0]),false,'threshold alone cannot skip the prior turn-in');
  }
  assert.ok(log.winQualification(id,gen,mission.acceptedAt)?.victoryAt);
  assert.equal(log.getQualification(id).lodgedAt,undefined);
  q.window.events.pageshow();q.lodge();
  saved[id]=log.getQualification(id).lodgedAt;
  assert.ok(saved[id]);
  assert.equal(n['mission-launch'].hidden,false);
  assert.equal(n['mission-launch'].textContent,'Re-fly '+rank+' sortie');
 }
 assert.equal(log.qualificationEligible('prototype'),false);
 assert.equal(log.getQualification('prototype'),null);
 assert.deepEqual(n['mission-select'].children.map(o=>o.value),['intercept',...expected.map(a=>a[0])]);
 const next=play({storage:q.storage,parts:owned,saved:build(stock),hull:build({condition:'repaired'}),kills:()=>300});
 next.talk();
 assert.equal(next.nodes['mission-title'].textContent,'Vandul Intercept');
 for(const [id] of expected)assert.equal(next.window.RiftMissions.getQualification(id).lodgedAt,saved[id]);
});

test('returning to the Bridge prioritizes ready turn-ins, then accepted or new briefings, ahead of replay',()=>{
 const key='rift-runner.mission-log.v1';
 const wingman={acceptedAt:4,victoryAt:5,lodgedAt:6},ace={acceptedAt:7,victoryAt:8};
 for(const [intercept,currentAce,expected] of [
  [{acceptedAt:2,victoryAt:3},ace,'Vandul Intercept'],
  [{acceptedAt:2},ace,'Ace Qualification'],
  [{acceptedAt:2,victoryAt:3,lodgedAt:9},{acceptedAt:7},'Ace Qualification'],
  [{acceptedAt:2,victoryAt:3,lodgedAt:9},undefined,'Ace Qualification']
 ]){
  const storage=new Map([[key,JSON.stringify({version:1,generation:null,completedAt:1,intercept,wingman,ace:currentAce})]]);
  const q=play({storage,kills:()=>25});q.talk();
  assert.equal(q.nodes['mission-title'].textContent,expected);
 }
});
