'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {setup}=require('./ballistic.test.cjs');
const read=name=>fs.readFileSync(path.join(__dirname,'../dist',name),'utf8');
const walletKey='rift-runner.pilot-credits.v1',shipKey='rift-runner.ship-build.v1',hullKey='rift-runner.hull-owned.v1';
const carrier=read('carrier.html');
const route=id=>new URL(carrier.match(new RegExp('id="'+id+'" href="([^"]+)"'))[1],'https://rift-runner.test/carrier.html');
const dom=extra=>({hidden:true,dataset:{},attrs:{},events:{},style:{setProperty(){}},setAttribute(k,v){this.attrs[k]=v;},
 addEventListener(k,fn){(this.events[k]??=[]).push(fn);},focus(){},...extra});
function browserWallet(storage,{withShop=false,change=()=>{}}={}){
 const events={},buyIds=[...read('carrier-shop.html').matchAll(/data-shop-buy="([^"]+)"/g)].map(m=>m[1]);
 const cards=Object.fromEntries(buyIds.map(id=>[id,dom({dataset:{shopBuy:id}})]));
 const categories=Object.fromEntries(['engines','weapons','power','shields'].map(topic=>[topic,dom({dataset:{topic}})]));
 const panels=Object.fromEntries(Object.keys(categories).map(id=>['shop-catalog-'+id,dom()]));
 const elements={'carrier-pilot-credits':dom(),'carrier-credit-value':dom(),'shop-conversation':dom(),'shop-talk-trigger':dom(),
  'shop-talk-topics':dom({querySelectorAll:()=>Object.values(categories)}),'shop-scene':dom({clientWidth:390,clientHeight:844}),
  'shop-camera-back':dom(),'shop-sale-status':dom(),...panels};
 const window={localStorage:{getItem:k=>storage.get(k)??null,setItem(k,v){change(k,v);storage.set(k,v);}},
  addEventListener(name,fn){(events[name]??=[]).push(fn);},dispatchEvent(e){for(const fn of events[e.type]??[])fn(e);}};
 const document={getElementById:id=>elements[id]??null,querySelectorAll:()=>Object.values(cards)};
 const ctx=vm.createContext({window,document,Event});
 vm.runInContext(read('pilot-credits.js'),ctx);
 if(withShop)vm.runInContext(read('carrier-shop-talk.js'),ctx);
 const tap=node=>{for(const fn of node.events.click??[])fn({isTrusted:true});};
 return {api:window.RiftCredits,elements,cards,categories,tap};
}
test('V78 real same-browser wallet + Shop + Hangar + flight: an unclaimed pilot can salvage, purchase, fit and earn credits',()=>{
 const store=new Map();let now=1000000;
 const home=browserWallet(store);assert.equal(home.elements['carrier-credit-value'].textContent,'250');
 assert.equal(home.api.getBuildState().origin,'new');assert.equal(store.has(hullKey),false);
 const launch=route('carrier-launch-vandul'),hangar=route('carrier-hangar'),shopURL=route('carrier-shop');
 assert.equal(launch.search,'?launch=vandul');assert.equal(hangar.search,'?hangar=carrier');assert.equal(shopURL.pathname,'/carrier-shop.html');
 const game=url=>setup({pilotCredits:browserWallet(store).api,sharedStorage:store,buildUI:true,initialHe3:null,
  address:{search:url.search,replace(){}},legacyArenaHangar:false,wallNow:()=>now,fieldSeed:137});
 const blocked=game(launch);
 assert.equal(blocked.inspect().state,'menu');assert.equal(blocked.el.hangar.open,true);assert.match(blocked.el['fit-build-status'].textContent,/No ship yet/);
 const h=game(hangar);h.click('fit-claim-hull');assert.equal(JSON.parse(store.get(hullKey)).condition,'damaged');
 assert.equal(home.api.getBalance(),250);assert.deepEqual(Array.from(home.api.getBuildState().owned),[]);
 h.click('fit-repair-hull');
 const pending=JSON.parse(store.get(hullKey));assert.equal(pending.condition,'repairing');assert.equal(pending.readyAt,now+240000);
 now+=239999;assert.equal(game(launch).inspect().state,'menu');assert.equal(JSON.parse(store.get(hullKey)).condition,'repairing');
 now++;const repaired=game(hangar);assert.equal(JSON.parse(store.get(hullKey)).condition,'repaired');
 assert.match(repaired.el['fit-build-status'].textContent,/Fit: engine, power core, reserve cell, primary weapon/);
 assert.equal(store.has(shipKey),false,'repair does not auto-fit');
 const shop=browserWallet(store,{withShop:true});shop.tap(shop.elements['shop-talk-trigger']);
 for(const [tab,id] of [['engines','stock-thruster'],['power','weifer-he3-core'],['power','kestrel-h20-reserve-cell'],['weapons','blaster']]){
  shop.tap(shop.categories[tab]);assert.equal(shop.elements['shop-catalog-'+tab].hidden,false);
  assert.equal(shop.cards[id].disabled,false);shop.tap(shop.cards[id]);assert.match(shop.elements['shop-sale-status'].textContent,/purchased/);
  assert.equal(shop.cards[id].disabled,true);assert.equal(shop.api.owns(id),true);
 }
 assert.equal(shop.elements['carrier-credit-value'].textContent,'35');assert.equal(store.has(shipKey),false);
 const fitter=game(hangar);
 fitter.fit('engine','stock-thruster');fitter.fit('core','weifer-he3-core');fitter.fit('battery','kestrel-h20-reserve-cell');
 fitter.click('fit-primary-picture');fitter.click('fit-pick-blaster');assert.equal(fitter.el['fit-build-status'].textContent,'Flight ready.');
 fitter.fit('battery','');assert.equal(fitter.el['fit-battery-module'].hidden,true);assert.equal(fitter.el['fit-battery-empty'].hidden,false);assert.equal(home.api.owns('kestrel-h20-reserve-cell'),true);
 assert.equal(game(launch).inspect().state,'menu');
 fitter.fit('battery','kestrel-h20-reserve-cell');assert.equal(fitter.el['fit-build-status'].textContent,'Flight ready.');
 const flight=game(launch);assert.equal(flight.inspect().state,'arrive');assert.equal(flight.inspect().p.he3,0);
 flight.cover(false);for(let i=0;i<800&&!flight.inspect().vandul;i++)flight.step();const v=flight.inspect().vandul;assert.ok(v);
 const {p,cones}=flight.inspect(),cone=cones[0];cones.splice(1);
 Object.assign(p,{x:480,y:960,vx:0,vy:0,aim:-Math.PI/2});Object.assign(cone,{x:480,y:900,vx:0,vy:0});
 Object.assign(v,{x:480,y:840,vx:0,vy:0,hp:3,nextLaser:999,nextDriveBy:999});
 flight.click('fire-button');flight.step(12);assert.equal(v.hp,3);assert.equal(home.api.getBalance(),35);
 cones.splice(0);flight.step(2);flight.click('fire-button');flight.step(25);
 assert.equal(v.hp,0);assert.equal(flight.inspect().duelKills,1);
 const returned=browserWallet(store,{withShop:true});assert.equal(returned.api.getBuildState().kills,1);
 assert.equal(returned.elements['carrier-credit-value'].textContent,'37.5');
 flight.reset();assert.equal(returned.api.getBuildState().kills,1);assert.equal(returned.api.getBalance(),37.5);
 assert.equal(JSON.parse(store.get(walletKey)).balance,37.5);
});

const stock='stock-thruster',testEngine='test-thruster',core='weifer-he3-core',battery='kestrel-h20-reserve-cell';
const fit=(parts={})=>({version:1,hull:'rift-fighter',engine:null,core:null,battery:null,primary:null,secondary:null,shield:null,...parts});
function staffedHangar(parts){
 const owned=[stock,testEngine,core,battery,'blaster','ballistic'];
 return new Map([[walletKey,JSON.stringify({version:3,origin:'new',balance:20,kills:0,owned})],
  [hullKey,JSON.stringify({version:1,hull:'rift-fighter',condition:'repaired'})],
  [shipKey,JSON.stringify(fit(parts))]]);
}
function tab(store,options={}){
 return setup({pilotCredits:browserWallet(store).api,sharedStorage:store,buildUI:true,initialHe3:null,legacyArenaHangar:false,
  address:{search:'?hangar=carrier',replace(){}},...options});
}
test('idle tabs adopt newer loadouts and merge one edit against the latest raw record even without a storage event',()=>{
 const store=staffedHangar(),a=tab(store),b=tab(store),c=tab(store);
 a.fit('engine',stock);a.fit('core',core);
 b.outside('storage',{key:shipKey});assert.equal(b.inspect().fighterLoadout.engine,stock);
 assert.equal(b.el['fit-core-module'].hidden,false);
 c.fit('battery',battery); // C has not received StorageEvent yet.
 assert.deepEqual(JSON.parse(store.get(shipKey)),fit({engine:stock,core,battery}));
 a.pageShow();assert.equal(a.inspect().fighterLoadout.battery,battery);
 b.fit('primary','blaster');assert.deepEqual(JSON.parse(store.get(shipKey)),fit({engine:stock,core,battery,primary:'blaster'}));
});
test('if another tab writes between read and write, do not overwrite; show latest saved fit',()=>{
 const store=staffedHangar({engine:stock,core}),other=JSON.stringify(fit({engine:stock,core,primary:'blaster'}));
 let reads=0,armed=false;
 const a=tab(store,{beforeStorageRead:(key,map)=>{if(armed&&key===shipKey&&++reads===2)map.set(shipKey,other);}});
 armed=true;a.fit('battery',battery);armed=false;
 assert.equal(store.get(shipKey),other);
 assert.equal(a.inspect().fighterFit.primary,'blaster');assert.equal(a.inspect().fighterLoadout.battery,null);
 assert.match(a.el['fit-status'].textContent,/Fit not saved/);
});
test('a fresh launch sees the latest fit, but live and paused flight keep their original loadout',()=>{
 const store=staffedHangar({engine:stock,core,battery,primary:'blaster'});
 const idle=tab(store,{address:null}),h=tab(store);
 h.fit('engine',testEngine);h.fit('primary','ballistic');
 idle.choose('practice');assert.equal(idle.inspect().state,'play');
 assert.equal(Math.round(idle.inspect().p.speed),123);assert.equal(idle.inspect().fighterFit.primary,'ballistic');
 h.fit('engine',stock);h.fit('primary','blaster');
 idle.outside('storage',{key:shipKey});assert.equal(Math.round(idle.inspect().p.speed),123);assert.equal(idle.inspect().fighterFit.primary,'ballistic');
 idle.key('keydown','KeyP');idle.pageShow();assert.equal(idle.inspect().state,'pause');
 assert.equal(Math.round(idle.inspect().p.speed),123);assert.equal(idle.inspect().fighterFit.primary,'ballistic');
 idle.choose('main-menu');idle.choose('practice');
 assert.equal(Math.round(idle.inspect().p.speed),237);assert.equal(idle.inspect().fighterFit.primary,'blaster');
});
