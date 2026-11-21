'use strict';
const assert=require('node:assert/strict'),test=require('node:test'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const site=['../dist','..'].map(p=>path.join(__dirname,p)).find(p=>fs.existsSync(path.join(p,'carrier-shop.html')));
const read=name=>fs.readFileSync(path.join(site,name),'utf8');
test('Carrier links to a dedicated Shop without adding any Main Menu or Arena shop action',()=>{
 const html=read('carrier.html'),index=read('index.html'),shop=read('carrier-shop.html');
 assert.match(html,/<a[^>]+id="carrier-shop" href="\.\/carrier-shop\.html">Shop<\/a>/);
 assert.match(html,/<div class="carrier-left-rail">\s*<div class="carrier-launch-actions" role="group" aria-label="Launch fighter">[\s\S]*?<\/div>\s*<a[^>]+id="carrier-shop"/,'link is outside the launch group');
 assert.doesNotMatch(index,/carrier-shop\.html|id="carrier-shop"/);
 assert.match(shop,/<a class="shop-back" href="\.\/carrier\.html">[^\n]+Back to Carrier<\/a>/);
 assert.match(read('carrier-audio.js'),/\['carrier-hangar','carrier-launch-practice','carrier-launch-vandul','carrier-shop'\]/);
});
test('Shop has responsive fixed artwork, safe-area responsive layout, and no invented stock or audio',()=>{
 const shop=read('carrier-shop.html'),css=read('carrier-shop.css');
 assert.match(shop,/<main[^>]+aria-labelledby="carrier-shop-title"/);
 assert.match(shop,/<h1 id="carrier-shop-title">Carrier Shop<\/h1>/);
 assert.match(shop,/<img src="\.\/carrier-shop\.webp\?v=65" width="1024" height="1536" alt="[^"]+" fetchpriority="high">/);
 assert.match(shop,/<source media="\(min-aspect-ratio: 5\/4\)" srcset="\.\/carrier-shop-wide\.webp\?v=65"/);
 assert.match(shop,/>Outfitting counter<\/h2>/);
 assert.match(shop,/alt="A circular quartermaster counter[^"]+deep space/);
 assert.match(shop,/<details id="shop-conversation"[^>]*>/);
 assert.doesNotMatch(shop,/<details[^>]*\bopen/);
 assert.deepEqual(shop.match(/<script[^>]*>/g),['<script src="./pilot-credits.js?v=2" defer>','<script src="./carrier-shop-talk.js?v=3" defer>']);
 assert.doesNotMatch(shop,/<audio\b|<form\b|<canvas\b|arena-background|carrier-engine-loop/);
 assert.match(css,/env\(safe-area-inset-left/);assert.match(css,/env\(safe-area-inset-right/);
 assert.match(css,/env\(safe-area-inset-top/);assert.match(css,/env\(safe-area-inset-bottom/);
 assert.match(css,/min-block-size:100dvh/);assert.match(css,/object-fit:cover/);
 assert.match(css,/min-block-size:44px/);assert.match(css,/\.shop-back:focus-visible/);
 assert.doesNotMatch(css,/@keyframes|\banimation:/);
});
test('Shop reuses the exact read-only browser-local credits display',()=>{
 const html=read('carrier-shop.html'),nodes={
  'carrier-pilot-credits':{hidden:true},'carrier-credit-value':{textContent:'0'}
 };
 const balanceKey='rift-runner.pilot-credits.v1';
 let readCount=0;const events={};
 const window={localStorage:{getItem:key=>{assert.equal(key,balanceKey);readCount++;return '40';},setItem(){assert.fail('Shop must not write credits');}},addEventListener:(name,callback)=>{events[name]=callback;}};
 vm.runInNewContext(read('pilot-credits.js'),{window,document:{getElementById:id=>nodes[id]??null}});
 assert.match(html,/id="carrier-pilot-credits" aria-live="polite" aria-atomic="true"/);
 assert.equal(nodes['carrier-pilot-credits'].hidden,false);
 assert.equal(nodes['carrier-credit-value'].textContent,'40');
 events.pageshow();
 assert.equal(readCount,2);
});
test('quartermaster conversation is local, keyboard dismissible, and repeatable',()=>{
 const html=read('carrier-shop.html'),script=read('carrier-shop-talk.js'),css=read('carrier-shop.css');
 assert.match(html,/<summary id="shop-talk-trigger"[^>]*>\s*<span><strong>Talk to Mara Venn/);
 assert.match(html,/<p id="shop-talk-reply"[^>]*role="status" aria-live="polite" aria-atomic="true"/);
 assert.deepEqual([...html.matchAll(/<button type="button" data-topic="([^"]+)"/g)].map(r=>r[1]),['engines','weapons','shields']);
 assert.match(css,/\.shop-talk-topics button\{\s*[^}]*min-block-size:44px/);
 assert.match(css,/\.shop-talk-topics button:focus-visible\{outline:/);
 assert.doesNotMatch(script,/fetch\s*\(|XMLHttpRequest|localStorage|awardVictory/);
 let focused=false,prevented=false;
 const mkTopic=topic=>({
  dataset:{topic},attrs:{},events:{},setAttribute(k,v){this.attrs[k]=v;},addEventListener(name,fn){this.events[name]=fn;}
 });
 const buttons=['engines','weapons','shields','constructor'].map(mkTopic);
 const conversation={
  open:false,events:{},addEventListener(name,fn){this.events[name]=fn;}
 };
 const trigger={focus(){focused=true;}};
 const reply={textContent:'Welcome, pilot.'},topics={hidden:true,querySelectorAll:()=>buttons};
 const catalogs=[{hidden:true,scrollTop:38},{hidden:true,scrollTop:23},{hidden:true,scrollTop:41}];
 const nodes={'shop-conversation':conversation,'shop-talk-trigger':trigger,'shop-talk-reply':reply,'shop-talk-topics':topics,
  'shop-catalog-engines':catalogs[0],'shop-catalog-weapons':catalogs[1],'shop-catalog-shields':catalogs[2]};
 vm.runInNewContext(script,{document:{getElementById:id=>nodes[id]??null}});
 assert.equal(topics.hidden,false);
 buttons[0].events.click();assert.equal(reply.textContent,'Welcome, pilot.','closed conversation cannot change response');
 conversation.open=true;
 let last;
 for(const [i,words] of [[0,/speed and weight/],[1,/damage and firing patterns/],[2,/Aegis S-3/]]){
  buttons[i].events.click();assert.match(reply.textContent,words);assert.notEqual(reply.textContent,last);last=reply.textContent;
  assert.deepEqual(catalogs.map(c=>c.hidden),[i!==0,i!==1,i!==2]);
  assert.equal(catalogs[i].scrollTop,0);
  assert.equal(buttons[i].attrs['aria-pressed'],'true');
  assert.ok(buttons.filter((_,j)=>j!==i).every(button=>button.attrs['aria-pressed']==='false'));
 }
 buttons[3].events.click();assert.equal(reply.textContent,last,'unknown topic is ignored');
 conversation.events.keydown({key:'Escape',preventDefault(){prevented=true;}});
 assert.equal(prevented&&focused,true);assert.equal(conversation.open,false);assert.equal(reply.textContent,'Welcome, pilot.');
 assert.ok(buttons.every(button=>button.attrs['aria-pressed']==='false'));
 assert.ok(catalogs.every(c=>c.hidden));
 conversation.open=true;buttons[1].events.click();assert.match(reply.textContent,/weapon modules/);
 conversation.open=false;conversation.events.toggle();assert.equal(reply.textContent,'Welcome, pilot.');
 assert.ok(catalogs.every(c=>c.hidden));
});
test('catalog cards match module profiles; Aegis is the only purchasable item',()=>{
 const game=read('game.js'),html=read('carrier-shop.html'),rules=read('index.html'),css=read('carrier-shop.css');
 const block=(name)=>game.match(new RegExp('^const '+name+'=[\\s\\S]*?^};','m'))[0];
 const inline=name=>game.match(new RegExp('^const '+name+'=[^\\n]+','m'))[0];
 const actual=vm.runInNewContext('(()=>{'+[block('engineProfiles'),inline('shieldProfiles'),block('guns'),inline('normalBurst'),inline('stockFitWeight')].join('\n')+';return {engineProfiles,shieldProfiles,guns,normalBurst,speedPerRating};})()');
 const content=Object.fromEntries([...html.matchAll(/data-catalog-id="([^"]+)"><img src="([^"]+)"[^>]+><div><strong>([^<]+)<\/strong><span>([^<]+)<\/span><\/div><\/li>/g)].map(([,id,src,name,stats])=>[id,{src,name,stats}]));
 assert.deepEqual(Object.keys(content),['stock-thruster','test-thruster','blaster','ballistic','ak77','aegis-s3']);
 for(const [id,p] of Object.entries(actual.engineProfiles)){
  const expectedName=rules.match(new RegExp('<option value="'+id+'">([^<]+)</option>'))[1];
  assert.deepEqual(content[id],{src:'./shop-'+id+'.webp',name:expectedName,stats:'Speed rating '+p.speedRating+' · '+(p.speedRating*actual.speedPerRating)+' u/s · Weight '+p.weight});
 }
 const weaponPics={blaster:'sterling',ballistic:'alkine',ak77:'ak77'};
 for(const [id,p] of Object.entries(actual.guns)){
  const rounds=(p.burst??actual.normalBurst).pattern.length;
  assert.deepEqual(content[id],{src:'./'+weaponPics[id]+'-module.webp?v=58',name:p.fullLabel,
   stats:p.damage+' damage / shot · '+(p.burstOnly?rounds+'-shot burst only':rounds+' in Burst')+' · Weight '+p.weight});
 }
 assert.match(html,/class="shop-catalog"[^>]*tabindex="0" hidden/);
 const shield=actual.shieldProfiles['aegis-s3'];
 assert.deepEqual(content['aegis-s3'],{src:'./shop-aegis-s3.svg',name:shield.name,stats:shield.capacity+' HP · '+shield.duration+' s active · '+shield.cooldown+' s cooldown · Laser '+shield.absorption.energy*100+'% · Ballistic '+shield.absorption.ballistic*100+'%'});
 assert.match(read('shop-aegis-s3.svg'),/<svg[^>]+viewBox="0 0 320 180"/);
 assert.deepEqual([...html.matchAll(/id="shop-buy-([^"]+)"/g)].map(m=>m[1]),['aegis']);
 assert.match(html,/id="shop-buy-aegis">Buy · 200 credits/);
 assert.match(css,/\.shop-catalog\{\s*max-block-size:[^;]+;overflow:auto;overscroll-behavior:contain/);
});
test('Shop offers the Aegis only when affordable, deducts credits and clearly shows ownership',()=>{
 const buttons={},key='rift-runner.pilot-credits.v1',bag=new Map([[key,'199']]),listeners={};
 const buy={textContent:'',disabled:false,addEventListener(name,cb){buttons[name]=cb;}};
 const nodes={'shop-conversation':{addEventListener(){}},'shop-talk-trigger':{},
  'shop-talk-topics':{querySelectorAll:()=>[]},'shop-talk-reply':{textContent:'Welcome, pilot.'},
  'shop-aegis-purchase':{hidden:true},'shop-buy-aegis':buy,'shop-aegis-status':{textContent:''}};
 const window={localStorage:{getItem:k=>bag.get(k)??null,setItem:(k,v)=>bag.set(k,v)},
  addEventListener:(n,f)=>(listeners[n]??=[]).push(f)};
 const context=vm.createContext({window,document:{getElementById:id=>nodes[id]??null}});
 vm.runInContext(read('pilot-credits.js'),context);vm.runInContext(read('carrier-shop-talk.js'),context);
 assert.equal(nodes['shop-aegis-purchase'].hidden,false);
 assert.equal(buy.disabled,true);assert.equal(buy.textContent,'Buy · 200 credits');
 assert.equal(nodes['shop-aegis-status'].textContent,'Need 1 more credit.');
 bag.set(key,'220');listeners.storage.forEach(f=>f({key}));assert.equal(buy.disabled,false);
 buttons.click();assert.equal(buy.textContent,'Owned');assert.equal(buy.disabled,true);
 assert.equal(nodes['shop-aegis-status'].textContent,'Purchased. Fit it in the Hangar.');
 assert.equal(window.RiftCredits.getBalance(),20);
 buttons.click();assert.equal(window.RiftCredits.getBalance(),20);
});
