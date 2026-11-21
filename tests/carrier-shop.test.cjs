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
test('Shop layers responsive artwork with a native Mara hotspot and no written dialogue',()=>{
 const shop=read('carrier-shop.html'),css=read('carrier-shop.css');
 assert.match(shop,/<main[^>]+aria-labelledby="carrier-shop-title"/);
 assert.match(shop,/<h1 id="carrier-shop-title">Carrier Shop<\/h1>/);
 assert.match(shop,/<img src="\.\/carrier-shop\.webp\?v=65" width="1024" height="1536" alt="" fetchpriority="high">/);
 assert.match(shop,/<source media="\(min-aspect-ratio: 5\/4\)" srcset="\.\/carrier-shop-wide\.webp\?v=65"/);
 assert.match(shop,/srcset="\.\/carrier-shop-wide-empty\.webp\?v=69"/);
 assert.match(shop,/src="\.\/carrier-shop-empty\.webp\?v=69"/);
 assert.match(shop,/<picture class="shop-mara-sprite" aria-hidden="true">/);
 assert.match(shop,/srcset="\.\/mara-wide\.webp\?v=71"/);
 assert.match(shop,/id="shop-mara-sprite" src="\.\/mara-portrait\.webp\?v=71" alt=""/);
 assert.match(shop,/<button id="shop-talk-trigger"[^>]+aria-label="Talk to Mara Venn, quartermaster"[^>]+aria-expanded="false"[^>]+aria-controls="shop-conversation"[^>]+hidden><\/button>/);
 assert.match(shop,/<section class="shop-manifest" id="shop-conversation"[^>]*hidden>/);
 assert.match(shop,/class="shop-sr-only">Welcome aboard/);
 assert.doesNotMatch(shop,/<details|<summary|shop-talk-reply/);
 assert.deepEqual(shop.match(/<script[^>]*>/g),['<script src="./pilot-credits.js?v=2" defer>','<script src="./carrier-shop-talk.js?v=72" defer>','<script src="./carrier-shop-ambient.js?v=2" defer>']);
 assert.match(shop,/<audio id="shop-mara-voice" src="\.\/mara-shop-greeting\.mp3" preload="none"><\/audio>/);
 assert.doesNotMatch(shop,/<form\b|<canvas\b|arena-background|carrier-engine-loop/);
 assert.match(css,/env\(safe-area-inset-left/);assert.match(css,/env\(safe-area-inset-right/);
 assert.match(css,/env\(safe-area-inset-top/);assert.match(css,/env\(safe-area-inset-bottom/);
 assert.match(css,/block-size:100dvh/);assert.match(css,/object-fit:cover;object-position:50% 54%/);
 assert.match(css,/\[data-focus="true"\] .shop-camera\{transform:translate/);
 assert.match(css,/\[data-composite="true"\]:not\(\[data-foreground="sharp"\]\) .shop-mara-art\{clip-path:/);
 assert.match(css,/\[data-foreground="sharp"\] .shop-mara-art\{visibility:hidden\}/);
 assert.match(css,/\[data-foreground="sharp"\] .shop-mara-sprite\{visibility:visible\}/);
 assert.match(css,/\.shop-mara-sprite img\{object-fit:contain;object-position:50% 100%\}/);
 assert.match(css,/prefers-reduced-motion:reduce\)\{\.shop-camera\{transition:none/);
 assert.match(css,/min-block-size:44px/);assert.match(css,/\.shop-back:focus-visible/);
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
function shopFixture({width=390,height=844,wide=false,extra={},win={}}={}){
 const mk=props=>({dataset:{},attrs:{},events:{},hidden:true,focus(){this.focused=true;},
  setAttribute(k,v){this.attrs[k]=v;},addEventListener(name,fn){(this.events[name]??=[]).push(fn);},...props});
 const values={},buttons=['engines','weapons','shields','constructor'].map(topic=>mk({dataset:{topic}}));
 const [engines,weapons,shields]=[38,23,41].map(scrollTop=>mk({scrollTop}));
 const trigger=mk(),back=mk(),conversation=mk(),scene=mk({clientWidth:width,clientHeight:height,style:{setProperty(k,v){values[k]=v;}}});
 const audio=[],voice=mk({currentTime:19,play(){audio.push(['play',this.currentTime]);return Promise.reject(new Error('mock iOS media rejection'));},pause(){audio.push(['pause']);}});
 const plate=mk({complete:false,naturalWidth:0,naturalHeight:0}),sprite=mk({complete:false,naturalWidth:0,naturalHeight:0,currentSrc:''}),query=mk({matches:wide});
 const nodes={'shop-conversation':conversation,'shop-talk-trigger':trigger,'shop-camera-back':back,'shop-scene':scene,'shop-clean-plate':plate,'shop-mara-sprite':sprite,
  'shop-mara-voice':voice,'shop-talk-topics':mk({querySelectorAll:()=>buttons}),
  'shop-catalog-engines':engines,'shop-catalog-weapons':weapons,'shop-catalog-shields':shields,...extra};
 const document=mk({hidden:false,getElementById:id=>nodes[id]??null}),window=mk({matchMedia:()=>query,...win});
 const emit=(node,name,event={})=>{for(const listener of node.events[name]??[])listener(event);};
 const context=vm.createContext({window,document});
 return {context,values,buttons,catalogs:[engines,weapons,shields],trigger,back,conversation,scene,audio,voice,plate,sprite,query,document,window,emit};
}
test('Mara hotspot centers zoom from the real cropped portrait and landscape assets',()=>{
 const s=shopFixture(),{values,scene,emit,query,window,plate,trigger}=s;
 vm.runInContext(read('carrier-shop-talk.js'),s.context);
 const n=key=>parseFloat(values['--mara-'+key]);
 function check(w,h,cw,ch,sx,sy){
  assert.equal(trigger.hidden,false);
  const scale=Math.max(w/cw,h/ch),headX=(w-cw*scale)*.5+sx*scale,headY=(h-ch*scale)*.54+sy*scale;
  assert.ok(headX>=n('x')&&headX<=n('x')+n('w'));
  assert.ok(headY>=n('y')&&headY<=n('y')+n('h'));
  assert.ok(n('w')>=44&&n('h')>=44);
  assert.ok(Math.abs(headX*n('zoom')+n('pan-x')-w*.5)<1e-3);
  assert.ok(Math.abs(headY*n('zoom')+n('pan-y')-h*.38)<1e-3);
  assert.ok(n('pan-x')<=0&&n('pan-x')>=w*(1-n('zoom')));
  assert.ok(n('pan-y')<=0&&n('pan-y')>=h*(1-n('zoom')));
  assert.match(values['--mara-outline'],/^polygon\([\d.-]+px [\d.-]+px,/);
 }
 check(390,844,1024,1536,517,624);
 assert.equal(scene.dataset.composite,'false','original scene fills fallback');
 Object.assign(plate,{complete:true,naturalWidth:1024,naturalHeight:1536});emit(plate,'load');
 assert.equal(scene.dataset.composite,'true');
 Object.assign(scene,{clientWidth:844,clientHeight:390});query.matches=true;emit(query,'change');
 check(844,390,1536,1024,771,468);
 assert.equal(scene.dataset.composite,'false','do not pair stale different-orientation plate');
 Object.assign(plate,{naturalWidth:1536,naturalHeight:1024});emit(plate,'load');
 assert.equal(scene.dataset.composite,'true');
 Object.assign(plate,{naturalWidth:0,naturalHeight:0});emit(plate,'error');
 assert.equal(scene.dataset.composite,'false');
});
test('trusted tap controls zoom and audio, categories stay functional, Escape and the return button clean up',async()=>{
 const s=shopFixture(),{trigger,back,conversation,scene,emit,buttons,catalogs,audio,voice,document,window}=s;
 const script=read('carrier-shop-talk.js'),css=read('carrier-shop.css');
 assert.deepEqual([...read('carrier-shop.html').matchAll(/<button type="button" data-topic="([^"]+)"/g)].map(r=>r[1]),['engines','weapons','shields']);
 assert.match(css,/\.shop-talk-topics button\{\s*[^}]*min-block-size:44px/);
 assert.match(css,/\.shop-talk-topics button:focus-visible\{\s*outline:/);
 assert.doesNotMatch(script,/fetch\s*\(|XMLHttpRequest|localStorage|awardVictory/);
 vm.runInContext(script,s.context);
 assert.equal(conversation.hidden,true);
 emit(buttons[0],'click');assert.ok(catalogs.every(c=>c.hidden));
 emit(trigger,'click',{isTrusted:true});
 assert.equal(scene.dataset.focus,'true');assert.equal(trigger.attrs['aria-expanded'],'true');
 assert.equal(back.focused,true);assert.equal(conversation.hidden,false);
 assert.deepEqual(audio,[['pause'],['play',0]]);
 for(let i=0;i<3;i++){
  emit(buttons[i],'click');assert.deepEqual(catalogs.map(c=>c.hidden),[i!==0,i!==1,i!==2]);
  assert.equal(catalogs[i].scrollTop,0);
  assert.equal(buttons[i].attrs['aria-pressed'],'true');
  assert.ok(buttons.filter((_,j)=>j!==i).every(button=>button.attrs['aria-pressed']==='false'));
 }
 emit(buttons[3],'click');assert.equal(catalogs[2].hidden,false,'unknown topic ignored');
 let prevented=false;
 emit(document,'keydown',{key:'Escape',preventDefault(){prevented=true;}});
 assert.equal(prevented&&trigger.focused,true);assert.equal(conversation.hidden,true);
 assert.equal(scene.dataset.focus,'false');assert.equal(trigger.attrs['aria-expanded'],'false');
 assert.ok(catalogs.every(c=>c.hidden));
 assert.ok(buttons.every(button=>button.attrs['aria-pressed']==='false'));
 emit(trigger,'click',{isTrusted:false});assert.equal(conversation.hidden,false);
 assert.equal(audio.filter(([kind])=>kind==='play').length,1,'untrusted calls do not request sound');
 emit(back,'click');assert.equal(conversation.hidden,true);
 emit(trigger,'click',{isTrusted:true});voice.currentTime=6;
 document.hidden=true;emit(document,'visibilitychange');assert.equal(voice.currentTime,0);
 voice.currentTime=5;emit(window,'pagehide');assert.equal(voice.currentTime,0);
 assert.equal(audio.filter(([kind])=>kind==='play').length,2,'neither park event retries playback');
 await Promise.resolve();
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
 const nodes={'shop-aegis-purchase':{hidden:true},'shop-buy-aegis':buy,'shop-aegis-status':{textContent:''}};
 const window={localStorage:{getItem:k=>bag.get(k)??null,setItem:(k,v)=>bag.set(k,v)},
  addEventListener:(n,f)=>(listeners[n]??=[]).push(f)};
 const fixture=shopFixture({extra:nodes,win:window});
 vm.runInContext(read('pilot-credits.js'),fixture.context);vm.runInContext(read('carrier-shop-talk.js'),fixture.context);
 assert.equal(nodes['shop-aegis-purchase'].hidden,false);
 assert.equal(buy.disabled,true);assert.equal(buy.textContent,'Buy · 200 credits');
 assert.equal(nodes['shop-aegis-status'].textContent,'Need 1 more credit.');
 bag.set(key,'220');listeners.storage.forEach(f=>f({key}));assert.equal(buy.disabled,false);
 buttons.click();assert.equal(buy.textContent,'Owned');assert.equal(buy.disabled,true);
 assert.equal(nodes['shop-aegis-status'].textContent,'Purchased. Fit it in the Hangar.');
 assert.equal(fixture.window.RiftCredits.getBalance(),20);
 buttons.click();assert.equal(fixture.window.RiftCredits.getBalance(),20);
});
test('separate sharp sprites take over only when their matching clean plate and orientation are both ready',()=>{
 const s=shopFixture(),{values,scene,emit,query,plate,sprite}=s;
 vm.runInContext(read('carrier-shop-talk.js'),s.context);
 const n=key=>parseFloat(values['--mara-'+key]);
 const path='https://rift.local/';
 assert.equal(scene.dataset.foreground,'legacy');assert.equal(scene.dataset.composite,'false');
 Object.assign(sprite,{complete:true,naturalWidth:980,naturalHeight:1055,currentSrc:path+'mara-portrait.webp?v=71'});
 emit(sprite,'load');assert.equal(scene.dataset.foreground,'legacy','never overlay a sprite on the uncut fallback');
 Object.assign(plate,{complete:true,naturalWidth:1024,naturalHeight:1536});emit(plate,'load');
 assert.equal(scene.dataset.foreground,'sharp');assert.equal(scene.dataset.composite,'true');
 assert.ok(n('sprite-w')>75&&n('sprite-h')>75);
 assert.ok(n('sprite-x')+n('sprite-w')/2>=n('x')&&n('sprite-x')+n('sprite-w')/2<=n('x')+n('w'));
 assert.ok(n('sprite-y')+n('sprite-h')/2>=n('y')&&n('sprite-y')+n('sprite-h')/2<=n('y')+n('h'));
 const oldWidth=n('sprite-w');
 Object.assign(scene,{clientWidth:844,clientHeight:390});query.matches=true;emit(query,'change');
 assert.equal(scene.dataset.foreground,'legacy');assert.equal(scene.dataset.composite,'false');
 Object.assign(plate,{naturalWidth:1536,naturalHeight:1024});emit(plate,'load');
 assert.equal(scene.dataset.composite,'true');
 assert.equal(scene.dataset.foreground,'legacy','correct plate with stale portrait sprite still uses old layered art');
 Object.assign(sprite,{currentSrc:path+'mara-wide.webp?v=71',complete:false});emit(sprite,'load');
 assert.equal(scene.dataset.foreground,'legacy','request not complete');
 Object.assign(sprite,{complete:true,naturalWidth:880,naturalHeight:770});emit(sprite,'load');
 assert.equal(scene.dataset.foreground,'sharp');assert.notEqual(n('sprite-w'),oldWidth);
 Object.assign(sprite,{naturalWidth:0,naturalHeight:0});emit(sprite,'error');
 assert.equal(scene.dataset.foreground,'legacy');assert.equal(scene.dataset.composite,'true');
 Object.assign(plate,{naturalWidth:0,naturalHeight:0});emit(plate,'error');
 assert.equal(scene.dataset.composite,'false');
});

test('Mara’s jacket is occluded at the rim while her palms remain on the counter',()=>{
 const css=read('carrier-shop.css'),script=read('carrier-shop-talk.js');
 assert.match(css,/clip-path:polygon\(0 0,100% 0,100% 100%,76% 100%,72% 95%,28% 95%,24% 100%,0 100%\)/);
 assert.match(css,/\.shop-mara-sprite::before\{left:2%\}/);
 assert.match(css,/\.shop-mara-sprite::after\{right:2%\}/);
 assert.match(script,/spriteBox:\[398,578,634,775\]/);
 assert.match(script,/spriteBox:\[685,438,860,597\]/);
});
