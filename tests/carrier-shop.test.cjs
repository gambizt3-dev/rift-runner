'use strict';
const assert=require('node:assert/strict'),test=require('node:test'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const site=['../dist','..'].map(p=>path.join(__dirname,p)).find(p=>fs.existsSync(path.join(p,'carrier-shop.html')));
const read=name=>fs.readFileSync(path.join(site,name),'utf8');
test('Carrier links to a dedicated Shop without adding any Main Menu or Arena shop action',()=>{
 const html=read('carrier.html'),index=read('index.html'),shop=read('carrier-shop.html');
 assert.match(html,/<a[^>]+id="carrier-shop" href="\.\/carrier-shop\.html">Shop<\/a>/);
 const interior=html.match(/<details[^>]+id="carrier-interior"[^>]*>([\s\S]*?)<\/details>/)?.[1];
 assert.ok(interior,'Explore Ship Interior is a native disclosure');
 assert.match(interior,/<summary[^>]*>Explore Ship Interior/);
 assert.deepEqual([...interior.matchAll(/href="(\.\/carrier-[a-z]+\.html)"/g)].map(m=>m[1]),['./carrier-shop.html','./carrier-bridge.html','./carrier-crew.html']);
 assert.doesNotMatch(html.replace(interior,''),/href="\.\/carrier-(?:shop|bridge|crew)\.html"/,'rooms are not duplicated on the exterior rail or in Missions');
 assert.doesNotMatch(index.slice(0,index.indexOf('<dialog id="hangar"')),/carrier-shop\.html|id="carrier-shop"/);
 assert.match(index,/class="fit-shop-link" href="\.\/carrier-shop\.html"/);
 assert.match(shop,/<a class="shop-back" href="\.\/carrier\.html">[^\n]+Back to Deck Map<\/a>/);
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
 assert.deepEqual(shop.match(/<script[^>]*>/g),['<script src="./vessel-exterior.js?v=214" defer>','<script src="./pilot-credits.js?v=250" defer>','<script src="./carrier-shop-talk.js?v=252" defer>','<script src="./carrier-shop-ambient.js?v=2" defer>']);
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
 assert.deepEqual([...read('carrier-shop.html').matchAll(/<button type="button" data-topic="([^"]+)"/g)].map(r=>r[1]),['fighters','freighters','engines','weapons','power','shields']);
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
test('catalog cards match module profiles and wallet prices',()=>{
 const game=read('game.js'),html=read('carrier-shop.html'),rules=read('index.html'),css=read('carrier-shop.css');
 const block=(name)=>game.match(new RegExp('^const '+name+'=[\\s\\S]*?^};','m'))[0];
 const inline=name=>game.match(new RegExp('^const '+name+'=[^\\n]+','m'))[0];
 const rateFormatter=game.match(/^function gunRateText\(gun\)\{[\s\S]*?^\}/m)[0];
 const actual=vm.runInNewContext('(()=>{'+[
  block('engineProfiles'),inline('shieldProfiles'),inline('powerProfiles'),inline('batteryProfiles'),inline('sparrow'),block('guns'),inline('normalBurst'),inline('rpmText'),inline('stockFitWeight'),rateFormatter
 ].join('\n')+';return {engineProfiles,shieldProfiles,powerProfiles,batteryProfiles,guns,normalBurst,gunRateText,speedPerRating};})()');
 const clean=html.replace(/<div class="shop-card-buy">[^\n]+?<\/div>/g,'');
 const content=Object.fromEntries([...clean.matchAll(/data-catalog-id="([^"]+)"><img src="([^"]+)"[^>]+><div><strong>([^<]+)<\/strong><span>([^<]+)<\/span>(?:<span class="shop-fire-rate">([^<]+)<\/span>)?<\/div><\/li>/g)].map(([,id,src,name,stats,rate])=>[id,{src,name,stats,...rate&&{rate}}]));
 assert.deepEqual(Object.keys(content),['stocky-light-fighter','bastion-9','stock-thruster','test-thruster','surge-7-thruster','blaster','ballistic','ak77','sparrow-s2','weifer-he3-core','weifer-he3-core-mk2','weifer-he3-core-mk3','kestrel-h20-reserve-cell','kestrel-h30-reserve-cell','aegis-s3']);
 for(const [id,p] of Object.entries(actual.engineProfiles)){
  const expectedName=rules.match(new RegExp('<option value="'+id+'">([^<]+)</option>'))[1];
  const {rate,...engine}=content[id];
  assert.deepEqual(engine,{src:'./shop-'+id+'.webp',name:expectedName,stats:'Speed rating '+p.speedRating+' · '+(p.speedRating*actual.speedPerRating)+' u/s · Strength '+p.strength+' · Weight '+p.weight});
 }
 assert.match(content['surge-7-thruster'].rate,/Double-tap the main thruster \(THR\) within 0\.35 s.*0\.6 s burst.*330 u\/s.*4 He3.*14 heat.*6 s.*1\.4 He3\/s/);
 assert.deepEqual(content['sparrow-s2'],{src:'./sparrow-s2-gimbal-laser.webp',name:'Sparrow S2 Gimbal Laser',stats:'Size 2 · 2 damage per projectile · Single: one shot per pod · Burst: six shots per pod',rate:'The Stocky Light Fighter and Bastion-9 come with two fitted. No extra purchase needed for the stock fit. Additional guns are sold individually.'});
 const weaponPics={blaster:'sterling',ballistic:'alkine',ak77:'ak77'};
 for(const [id,p] of Object.entries(actual.guns)){
  if(id==='sparrow-s2'){assert.equal(p.damage,2);continue;}
  const rounds=(p.burst??actual.normalBurst).pattern.length,rate=actual.gunRateText(p);
  assert.deepEqual(content[id],{src:'./'+weaponPics[id]+'-module.webp?v=58',name:p.fullLabel,
   stats:'Size 3 · '+p.damage+' damage / shot · '+(p.burstOnly?rounds+'-shot burst only · '+p.burst.recovery+' s cooldown':rounds+' in Burst')+' · Weight '+p.weight,rate});
 }
 assert.match(html,/class="shop-catalog"[^>]*tabindex="0" hidden/);
 const shield=actual.shieldProfiles['aegis-s3'];
 assert.deepEqual(content['aegis-s3'],{src:'./shop-aegis-s3.webp?v=75',name:shield.name,stats:shield.capacity+' HP · '+shield.duration+' s active · '+shield.cooldown+' s cooldown · Laser '+shield.absorption.energy*100+'% · Ballistic '+shield.absorption.ballistic*100+'%. The shield extends past the hull and draws '+shield.he3PerSecond+' He3/s while active. It drops if He3 runs out.'});
 const win={localStorage:{getItem:()=>null,setItem(){}}};
 vm.runInNewContext(read('pilot-credits.js'),{document:{getElementById:()=>null},window:win});
 const parts=[...win.RiftCredits.getCatalog(),...win.RiftCredits.getHullCatalog()];
 assert.deepEqual(Object.keys(content).sort(),Array.from(parts,part=>part.id).sort());
 const pricing=Object.fromEntries([...html.matchAll(/data-shop-buy="([^"]+)" data-price="(\d+)"/g)].map(([,id,n])=>[id,+n]));
 for(const part of parts){assert.equal(pricing[part.id],part.price);assert.equal(content[part.id].name,part.name);}
 const mk2=actual.powerProfiles['weifer-he3-core-mk2'],h30=actual.batteryProfiles['kestrel-h30-reserve-cell'];
 assert.deepEqual(content['weifer-he3-core-mk2'],{src:'./shop-weifer-mk2.webp',name:mk2.name,stats:'Generates '+mk2.he3PerSecond+' He3 per second · Weight '+mk2.weight});
 const mk3=actual.powerProfiles['weifer-he3-core-mk3'];
 assert.deepEqual(content['weifer-he3-core-mk3'],{src:'./shop-weifer-mk3.webp',name:mk3.name,stats:'Generates '+mk3.he3PerSecond+' He3 per second · Weight '+mk3.weight});
 assert.deepEqual(content['kestrel-h30-reserve-cell'],{src:'./shop-kestrel-h30.webp',name:h30.name,stats:'Stores '+h30.capacityHe3+' He3 · Weight '+h30.weight});
 assert.match(content['weifer-he3-core'].stats,/2 He3 per second/);
 assert.match(content['kestrel-h20-reserve-cell'].stats,/20 He3.*ceramic lattice/);
 assert.match(css,/\.shop-catalog\{\s*max-block-size:[^;]+;overflow:auto;overscroll-behavior:contain/);
});
test('the fighter listing buys both hulls into the same wallet and directs the pilot to the hangar',()=>{
 const ids=['stocky-light-fighter','bastion-9'],listeners={};
 const key='rift-runner.pilot-credits.v1',moduleIds=['blaster','stock-thruster','weifer-he3-core','kestrel-h20-reserve-cell'];
 const bag=new Map([[key,JSON.stringify({version:3,origin:'new',balance:900,kills:13,owned:[...moduleIds]})]]);
 const nodes=ids.map(id=>({dataset:{shopBuy:id},textContent:'',parentElement:{querySelector:()=>({})},
  setAttribute(){},addEventListener(_,fn){this.click=fn;}}));
 const win={localStorage:{getItem:k=>bag.get(k)??null,setItem:(k,v)=>bag.set(k,v)},
  addEventListener:(n,f)=>(listeners[n]??=[]).push(f)};
 const status={textContent:''},hangar={hidden:true};
 const fixture=shopFixture({extra:{'shop-sale-status':status,'shop-fit-next':hangar},win});
 fixture.document.querySelectorAll=selector=>selector==='button[data-shop-buy]'?nodes:[];
 vm.runInContext(read('pilot-credits.js'),fixture.context);vm.runInContext(read('carrier-shop-talk.js'),fixture.context);
 for(const [i,id] of ids.entries()){
  const button=nodes[i];assert.equal(button.disabled,false);button.click();
  assert.equal(button.disabled,true);assert.match(button.textContent,/^Owned/);
  assert.match(status.textContent,/Select it in the Hangar.*Two Sparrow S2 lasers fitted.*sold separately/);
  assert.equal(hangar.hidden,false);assert.equal(fixture.window.RiftCredits.ownsHull(id),true);
  button.click();
 }
 const saved=JSON.parse(bag.get(key));
 assert.deepEqual(saved,{version:3,origin:'new',balance:100,kills:13,owned:[...moduleIds,...ids]});
});

test('Shop reserves starter funds, deducts credits, and shows ownership without duplicate charging',()=>{
 const handlers={},key='rift-runner.pilot-credits.v1',bag=new Map(),listeners={};
 const mk=id=>{const note={textContent:''},buy={dataset:{shopBuy:id},textContent:'',disabled:false,parentElement:{querySelector:()=>note},
  setAttribute(){},addEventListener(n,f){(handlers[id]??={})[n]=f;}};return {note,buy};};
 const parts=['aegis-s3','stock-thruster','weifer-he3-core','kestrel-h20-reserve-cell','blaster'].map(mk);
 const [shield,engine]=parts,status={textContent:''},fitNext={hidden:true};
 const window={localStorage:{getItem:k=>bag.get(k)??null,setItem:(k,v)=>bag.set(k,v)},
  addEventListener:(n,f)=>(listeners[n]??=[]).push(f)};
 const fixture=shopFixture({extra:{'shop-sale-status':status,'shop-fit-next':fitNext},win:window});
 fixture.document.querySelectorAll=selector=>selector==='button[data-shop-buy]'?parts.map(x=>x.buy):[];
 vm.runInContext(read('pilot-credits.js'),fixture.context);vm.runInContext(read('carrier-shop-talk.js'),fixture.context);
 assert.equal(fixture.window.RiftCredits.getBalance(),250);
 assert.equal(shield.buy.disabled,true);assert.equal(shield.buy.textContent,'Buy · 200 credits');
 assert.match(shield.note.textContent,/basic parts/);
 assert.equal(fitNext.hidden,true);
 assert.match(read('carrier-shop.html'),/id="shop-fit-next" href="\.\/index\.html\?hangar=carrier" hidden/);
 assert.equal(engine.buy.disabled,false);handlers['stock-thruster'].click();
 assert.equal(engine.buy.textContent,'Owned · 70 credits');assert.equal(engine.buy.disabled,true);
 assert.equal(status.textContent,'Stock thruster purchased. Fit it in the Hangar.');
 assert.equal(fitNext.hidden,false);
 assert.equal(fixture.window.RiftCredits.getBalance(),180);
 handlers['stock-thruster'].click();assert.equal(fixture.window.RiftCredits.getBalance(),180);
 for(const id of ['weifer-he3-core','kestrel-h20-reserve-cell','blaster'])handlers[id].click();
 assert.equal(fixture.window.RiftCredits.getBuildState().canBuild,true);
 assert.equal(fixture.window.RiftCredits.getBalance(),35);
 fixture.emit(fixture.back,'click');
 assert.equal(fitNext.hidden,true);assert.equal(status.textContent,'');
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

test('short landscape catalog height wins over the base rule without changing touch target size',()=>{
 const css=read('carrier-shop.css');
 const base=css.indexOf('max-block-size:clamp(92px,26dvh,215px)');
 const low=css.indexOf('max-block-size:clamp(58px,25dvh,105px)');
 assert.ok(base>=0&&low>base);
 assert.match(css,/@media\(max-height:500px\) and \(orientation:landscape\)\{\s*\.shop-catalog\{max-block-size:clamp\(58px,25dvh,105px\)/);
 assert.match(css,/\.shop-back\{[^}]*min-block-size:44px/);
});

test('fighter buy cards show a large uncropped single ship above the price and leave module thumbnails compact',()=>{
 const shop=read('carrier-shop.html'),css=read('carrier-shop.css');
 assert.match(shop,/carrier-shop\.css\?v=243/);
 const fighters=shop.match(/<section class="shop-catalog" id="shop-catalog-fighters"[\s\S]*?<\/section>/)?.[0];
 assert.ok(fighters);
 for(const [id,asset,price] of [['stocky-light-fighter','stocky-light-fighter.webp',325],['bastion-9','bastion-9-fighter.webp',475]]){
  const card=fighters.match(new RegExp('data-catalog-id="'+id+'"[^]*?</li>'))?.[0];
  assert.ok(card);
  assert.match(card,/Two Sparrow S2 lasers fitted\. Other modules sold separately\./);
  assert.ok(card.indexOf('src="./'+asset+'"')>=0);
  assert.ok(card.indexOf('data-shop-buy="'+id+'" data-price="'+price+'"')>card.indexOf(asset));
  assert.ok(fs.statSync(path.join(site,asset)).size>1000);
 }
 assert.match(css,/\.shop-catalog-card img\{[^}]*height:39px/);
 assert.match(css,/#shop-catalog-fighters \.shop-catalog-card\{grid-template-columns:minmax\(0,1fr\)/);
 assert.match(css,/#shop-catalog-fighters \.shop-catalog-card img\{[^}]*width:100%;height:clamp\(125px,[^}]*object-fit:contain/);
});


test('a pilot short of the list price sees the exact balance needed including protected starter credits',()=>{
 const key='rift-runner.pilot-credits.v1',bag=new Map(),listeners={};
 const note={textContent:''},buy={dataset:{shopBuy:'stocky-light-fighter'},setAttribute(){},addEventListener(){},
  parentElement:{querySelector:()=>note}};
 const win={localStorage:{getItem:k=>bag.get(k)??null,setItem:(k,v)=>bag.set(k,v)},
  addEventListener:(n,f)=>(listeners[n]??=[]).push(f)};
 const fixture=shopFixture({win});
 fixture.document.querySelectorAll=selector=>selector==='button[data-shop-buy]'?[buy]:[];
 vm.runInContext(read('pilot-credits.js'),fixture.context);vm.runInContext(read('carrier-shop-talk.js'),fixture.context);
 assert.equal(buy.disabled,true);
 assert.equal(note.textContent,'Need 265 more credits to buy and keep enough for basic parts.');
 for(const [balance,missing] of [[325,190],[514,1],[515,0]]){
  bag.set(key,JSON.stringify({version:3,origin:'new',balance,kills:0,owned:[]}));
  for(const refresh of listeners.pageshow)refresh();
  assert.equal(buy.disabled,missing>0);
  assert.equal(note.textContent,missing?'Need '+missing+' more credit'+(missing===1?'':'s')+' to buy and keep enough for basic parts.':'');
 }
});

test('shop exits and purchase handoff stay with the explicit visited carrier even when the pilot belongs elsewhere',async()=>{
 for(const [vessel,affiliation] of [['rift-carrier','bifrost'],['bifrost','rift-carrier']]){
  const links=['./carrier.html','./index.html?hangar=carrier'].map(href=>({
   href,getAttribute(){return this.href;},setAttribute(_,value){this.href=value;}
  }));
  const title={textContent:'Carrier Shop'},interior={dataset:{},querySelector:()=>null,querySelectorAll:selector=>selector.startsWith('a[')?links:[]};
  const document={getElementById:id=>id==='carrier-shop-title'?title:null,querySelector:()=>interior};
  const window={location:{search:'?vessel='+vessel},localStorage:{getItem:()=>JSON.stringify({version:2,companyVesselId:affiliation})}};
  await vm.runInNewContext(read('vessel-exterior.js'),{window,document,URLSearchParams});
  assert.equal(interior.dataset.vessel,vessel);
  assert.deepEqual(links.map(link=>link.href),['./carrier.html?vessel='+vessel,'./index.html?hangar=carrier&vessel='+vessel]);
 }
});

test('free Test Fly offers both loaners from either visited shop and silently reopens Fighters after return',()=>{
 const html=read('carrier-shop.html'),css=read('carrier-shop.css');
 assert.match(html,/id="shop-test-flight-note">Free loaner flight\. No progress or damage saved\./);
 assert.match(css,/\.shop-test-fly\{[^}]*min-block-size:44px/);
 assert.match(css,/\.shop-test-fly:focus-visible\{outline:/);
 const ids=[...html.matchAll(/data-shop-test="([^"]+)" href="\.\/index\.html\?launch=custom&amp;fighter=([^"]+?)&amp;vessel=rift-carrier&amp;from=shop"/g)]
  .map(([,id,query])=>{assert.equal(id,query);return id;});
 assert.deepEqual(ids,['stocky-light-fighter','bastion-9']);
 for(const scope of ['rift-carrier','bifrost']){
  const panel={hidden:true};
  const fixture=shopFixture({extra:{'shop-catalog-fighters':panel},win:{
   RiftVessel:{id:scope},location:{search:'?vessel='+scope+'&view=fighters'},
   RiftCredits:{get buy(){assert.fail('Test Fly must not call purchase code');}}
  }});
  const links=ids.map(id=>({dataset:{shopTest:id},setAttribute(key,value){this[key]=value;}}));
  fixture.document.querySelectorAll=selector=>selector==='a[data-shop-test]'?links:[];
  vm.runInContext(read('carrier-shop-talk.js'),fixture.context);
  assert.deepEqual(links.map(link=>link.href),ids.map(id=>'./index.html?launch=custom&fighter='+id+'&vessel='+scope+'&from=shop'));
  assert.equal(fixture.conversation.hidden,false);assert.equal(panel.hidden,false);
  assert.equal(fixture.scene.dataset.focus,'true');assert.deepEqual(fixture.audio,[]);
 }
});

test('Sparrow Buy one action charges per gun and stays enabled until the paid copy limit',()=>{
 const key='rift-runner.pilot-credits.v1',id='sparrow-s2';
 const bag=new Map([[key,JSON.stringify({version:3,origin:'new',balance:600,kills:0,owned:[]})]]);
 const note={textContent:''},buy={dataset:{shopBuy:id},setAttribute(){},addEventListener(_,fn){this.click=fn;},
  parentElement:{querySelector:()=>note}};
 const fixture=shopFixture({win:{localStorage:{getItem:k=>bag.get(k)??null,setItem:(k,v)=>bag.set(k,v)}}});
 fixture.document.querySelectorAll=selector=>selector==='button[data-shop-buy]'?[buy]:[];
 vm.runInContext(read('pilot-credits.js'),fixture.context);vm.runInContext(read('carrier-shop-talk.js'),fixture.context);
 for(let n=0;n<4;n++){
  assert.equal(buy.disabled,false);assert.equal(buy.textContent,'Buy one · 65 credits');
  assert.match(note.textContent,new RegExp('Paid copies: '+n+' / 4'));
  buy.click();
 }
 assert.equal(buy.disabled,true);assert.equal(buy.textContent,'Owned · 4 / 4');
 buy.click();assert.equal(fixture.window.RiftCredits.getBalance(),340);
});

test('Mara shows the two approved freighters without a price or test flight',()=>{
 const html=read('carrier-shop.html'),css=read('carrier-shop.css');
 const pane=html.match(/<section class="shop-catalog" id="shop-catalog-freighters"[\s\S]*?<\/section>/)?.[0];
 assert.ok(pane);
 assert.match(pane,/Civilian Freighter[\s\S]*Vessel class · Cargo transport · 2 seats[\s\S]*?2× Rift-4 hull length · Preview only, not for sale/);
 assert.match(pane,/<strong>Blackwake<\/strong><span>Vessel class · Pirate freighter · 2× Rift-4 hull length · Hammerhead Prow: reduced front impact damage · Preview only, not for sale/);
 assert.doesNotMatch(pane,/data-shop-buy|data-price|data-shop-test|launch=/);
 assert.match(pane,/src="\.\/civilian-freighter-terminal-preview\.webp" width="1260" height="420"/);
 assert.match(css,/#shop-catalog-freighters \.shop-freighter-preview img\{[^}]*aspect-ratio:3\/1[^}]*object-fit:contain/);
 assert.equal((pane.match(/class="shop-catalog-card shop-freighter-preview"/g)||[]).length,2);
 const pictures=[...pane.matchAll(/src="\.\/([^"]+\.webp)" width="1260" height="420"/g)].map(match=>match[1]);
 assert.deepEqual(pictures,['civilian-freighter-terminal-preview.webp','blackwake-aft-turret-shop-preview.webp']);
 for(const filename of pictures){
  const art=fs.readFileSync(path.resolve(__dirname,'../dist',filename));
  assert.equal(art.toString('ascii',8,12),'WEBP');assert.ok(art.length<115000);
 }
 const panel={hidden:true,scrollTop:9},fixture=shopFixture({extra:{'shop-catalog-freighters':panel}});
 const freighters={dataset:{topic:'freighters'},events:{},setAttribute(key,value){this[key]=value;},
  addEventListener(name,fn){this.events[name]=[fn];}};
 fixture.buttons.push(freighters);
 vm.runInNewContext(read('carrier-shop-talk.js'),fixture.context);
 fixture.emit(fixture.trigger,'click',{isTrusted:true});
 fixture.emit(freighters,'click');
 assert.equal(panel.hidden,false);assert.equal(panel.scrollTop,0);
 assert.equal(freighters['aria-pressed'],'true');
 fixture.emit(fixture.back,'click');
 assert.equal(panel.hidden,true);
});
