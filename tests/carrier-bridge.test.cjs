'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),test=require('node:test'),vm=require('node:vm');
const site=['../dist','..'].map(p=>path.join(__dirname,p)).find(p=>fs.existsSync(path.join(p,'carrier-bridge.html')));
const read=name=>fs.readFileSync(path.join(site,name),'utf8');
const stock={engine:'stock-thruster',core:'weifer-he3-core',battery:'kestrel-h20-reserve-cell',primary:'blaster'};
const build=slots=>({version:1,hull:'rift-fighter',...slots});
const owned=Object.values(stock);
function play({origin='new',parts=[],saved=null,hull=null}={}){
 const ids=['bridge-captain','bridge-mission','mission-parts','mission-status','mission-next','mission-shop','mission-hangar','mission-title','bridge-scene'];
 const node=()=>({hidden:true,dataset:{},attrs:{},listeners:{},children:[],textContent:'',
  focus(){this.focused=true;},append(...kids){this.children.push(...kids);},replaceChildren(){this.children=[];},
  setAttribute(n,v){this.attrs[n]=v;},addEventListener(n,f){this.listeners[n]=f;},
  removeAttribute(n){if(n==='data-next')delete this.dataset.next;}
 });
 const nodes=Object.fromEntries(ids.map(id=>[id,node()]));
 const window={
  events:{},addEventListener(n,f){this.events[n]=f;},
  localStorage:{getItem(key){return {'rift-runner.ship-build.v1':JSON.stringify(saved),'rift-runner.hull-owned.v1':JSON.stringify(hull)}[key]??null;}}
 };
 const prices=[70,60,40,45,45,80],categories=['engine','core','battery','weapon','engine','weapon'];
 const catalog=[...owned,'test-thruster','ballistic'].map((id,i)=>({id,price:prices[i],category:categories[i],name:id}));
 window.RiftCredits={getBuildState:()=>({origin,owned:parts}),getCatalog:()=>catalog};
 vm.runInNewContext(read('carrier-bridge.js'),{document:{getElementById:id=>nodes[id],createElement:node},window});
 return {nodes,window,talk:()=>nodes['bridge-captain'].listeners.click(),
  rows:()=>nodes['mission-parts'].children.map(r=>[r.dataset.owned,...r.children.map(c=>c.textContent)])};
}
test('the carrier links to the bridge; captain artwork, dialog control and quest detours are available',()=>{
 assert.match(read('carrier.html'),/id="carrier-bridge" href="\.\/carrier-bridge\.html">Bridge/);
 const page=read('carrier-bridge.html');
 assert.match(page,/carrier-bridge\.webp\?v=89/);
 assert.match(page,/aria-controls="bridge-mission" aria-expanded="false"/);
 assert.match(page,/href="\.\/carrier-shop\.html"/);
 assert.match(page,/href="\.\/index\.html\?hangar=carrier"/);
 assert.equal(fs.readFileSync(path.join(site,'carrier-bridge.webp')).toString('ascii',8,12),'WEBP');
});
test('the captain starts a live read-only checklist; purchased parts are crossed off immediately',()=>{
 const parts=[stock.battery],q=play({parts});
 assert.equal(q.nodes['bridge-mission'].hidden,true);
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
test('already fitted and equivalent starter choices complete the mission without rebuying',()=>{
 const q=play({parts:[...owned.filter(id=>id!==stock.engine&&id!==stock.primary),'test-thruster','ballistic'],
  saved:build({...stock,engine:'test-thruster',primary:'ballistic'}),hull:build({condition:'repaired'})});q.talk();
 assert.equal(q.nodes['mission-status'].textContent,'Mission complete');
 assert.deepEqual(q.rows().map(r=>r[2]),['Fitted','Fitted','Fitted','Fitted']);
 assert.deepEqual(q.rows()[3],['true','ballistic','Fitted']);
});
