'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const dist=['../dist','..'].map(d=>path.join(__dirname,d)).find(d=>fs.existsSync(path.join(d,'galaxy-map.js')));
const {galaxyPlan,galaxySample}=require('../server/galaxy-carrier.mjs');
const read=f=>fs.readFileSync(path.join(dist,f),'utf8');
function setup({seed=13,reduced=false,width=390,height=780,briefings=()=>[],startAge=0,offline=false,bifrost=null,pegasus=null,parent=null,wallet=null,fetch=null,multiplayer=null,hostname='game.example',search='',identityRecords=null,storage=new Map(),session=new Map()}={}){
 const ids=new Map(),events=new Map(),rect={width,height,left:12,top:66};
 function node(tag){
  const kids=[],attrs=new Map(),listeners=new Map(),style=new Map(),classes=new Set();
  return {tag,kids,attrs,listeners,style:{setProperty:(a,b)=>style.set(a,b),getPropertyValue:a=>style.get(a)},classList:{add:a=>classes.add(a),remove:a=>classes.delete(a),toggle(a,b){if(b)classes.add(a);else classes.delete(a);}},
   append:n=>kids.push(n),replaceChildren:()=>{kids.length=0;},setAttribute:(a,b)=>attrs.set(a,String(b)),removeAttribute:a=>attrs.delete(a),getAttribute:a=>attrs.get(a),
   addEventListener:(a,b)=>listeners.set(a,b),getBoundingClientRect:()=>rect,setPointerCapture(){},focus(){this.focused=true;},
   closest(sel){return sel==='[data-location]'&&attrs.has('data-location')?this:null;},
   send(type,payload={}){const event={type,preventDefault(){this.defaultPrevented=true;},...payload};listeners.get(type)?.(event);return event;}
  };
 }
 const el=id=>{if(!ids.has(id))ids.set(id,node(id));return ids.get(id);};
 for(const id of ['location-pegasus-image','location-bifrost-image','location-bishop-image','location-adaline-image']){
  const img=read('galaxy-map.html').match(new RegExp('<img[^>]*id="'+id+'"[^>]*data-src="([^"]+)"[^>]*>'));
  if(img)el(id).setAttribute('data-src',img[1]);
 }
 const images=[],img=function(){images.push(this);};
 let clock=100,raf=null,rng=seed;
 const plan=galaxyPlan(seed),reference=t=>{
  if(pegasus)return pegasus(t);
  if(offline)return {phase:'unavailable'};
  const snap=galaxySample(plan,1,1+startAge+t-100),leg=snap.trajectory[0];
  return {...snap.carrier,next:leg.rampMs?{x:leg.toX,y:leg.toY}:null};
 };
 const math=Object.create(Math);math.random=()=>((rng=(Math.imul(rng,1664525)+1013904223)>>>0)/4294967296);
 const context={Math:math,document:{hidden:false,getElementById:el,createElement:node,createElementNS:(ns,t)=>node(t)},
  window:{Image:img,parent,fetch,RiftMultiplayer:multiplayer,RiftCredits:wallet,sessionStorage:{getItem:key=>session.get(key)??null,setItem:(key,value)=>session.set(key,value)},location:{search,hostname,origin:'https://game.example'},localStorage:{getItem:key=>{if(storage===null)throw Error('Storage blocked');return storage.get(key)??null;}},RiftGalaxyState:{watch:id=>({sample:(t=clock)=>id==='bifrost'?bifrost?.(t)??{phase:'unavailable'}:reference(t)})},RiftMissions:{getNewBriefings:briefings},matchMedia:()=>({matches:reduced}),addEventListener:(a,b)=>{const previous=events.get(a);events.set(a,event=>{previous?.(event);return b(event);});},requestAnimationFrame(fn){raf=fn;return 1;}}};
 vm.createContext(context);
 vm.runInContext(read('wing-rendezvous.js'),context);
 vm.runInContext(read('fighter-registry.js'),context);
 vm.runInContext(read('fighter-parking.js'),context);
 vm.runInContext(read('guild-vessel-identity.js'),context);
 if(identityRecords)context.window.RiftVesselIdentity=context.window.RiftVesselIdentity.createModel(identityRecords);
 const watcher=context.window.RiftGalaxyState;
 vm.runInContext(read('galaxy-shared.js'),context);
 context.window.RiftGalaxyState=watcher;
 vm.runInContext(read('cross-battle.js'),context);
 vm.runInContext(read('galaxy-map.js'),context);
 const chart=el('galaxy-chart');
 const shape=()=>chart.attrs.get('viewBox').split(' ').map(Number);
 const pin=(id)=>el('galaxy-targets').kids[0].kids.find(n=>n.attrs.get('data-location')===id);
 const position=g=>g.attrs.get('transform').match(/^translate\(([-\d.]+) ([-\d.]+)\)$/).slice(1).map(Number);
 const carrier=el('galaxy-carrier').kids[0];
 const point=(x,y)=>{const [u,v,w,h]=shape();return [u+(x-rect.left)*w/rect.width,v+(y-rect.top)*h/rect.height];};
 const down=(x,y,pointerId=1,target=chart)=>chart.send('pointerdown',{button:0,pointerId,clientX:x,clientY:y,target});
 const next=(type,x,y,pointerId=1)=>events.get(type)({type,pointerId,clientX:x,clientY:y});
 return {el,events,images,rect,shape,pin,position,carrier,point,down,next,reference:()=>reference(clock),
  tap(x,y,target=chart){down(x,y,1,target);next('pointerup',x,y);},
  step(n=1){while(n--&&raf){const advance=raf;raf=null;advance(clock+=16);}},
  hide(flag){context.document.hidden=flag;}
 };
}
const near=(a,b,tol=.05)=>assert.ok(Math.abs(a-b)<tol,`${a} vs ${b}`);
test('standalone Galaxy Map keeps planet inspection, real carrier art and open space with no fixed lines',()=>{
 const html=read('galaxy-map.html'),q=setup();
 assert.match(read('carrier.html'),/id="carrier-galaxy-map" href="\.\/galaxy-map\.html">Galaxy Map/);
 assert.match(html,/class="control back" href="\.\/carrier\.html"/);
 assert.doesNotMatch(html,/class="atlas-head"|class="chart-cap"|Rift Runner <span> \/ <\/span> Navigation/,'the map has no visible title or tile header');
 assert.match(html,/<h1 class="atlas-sr-only" id="galaxy-title">Galaxy Map<\/h1>/);
 assert.match(html,/viewport-fit=cover/);assert.match(html,/galaxy-map.js\?v=244/);
 assert.doesNotMatch(html,/\bfire-button\b|\bgame\.js\b|galaxy-route|class="lanes"|id="galaxy-fly"|galaxy-explore|galaxy-(east|west)/);
 assert.match(read('galaxy-map.css'),/\.viewport\{[^}]+touch-action:none/);
 assert.equal(q.el('galaxy-find').kids.length,28,'prompt, 19 planets, three moons, a giant asteroid, the signal, the hideout and two carriers');
 assert.equal(q.carrier.attrs.get('aria-label'),'Federal Navy · Pegasus — Pegasus-class carrier');
 assert.equal(q.carrier.kids.find(n=>n.attrs.get('class')==='carrier-art-pin').kids.find(n=>n.tag==='image').attrs.get('href'),'./captain-bridge-front.webp?v=94');
 assert.match(html,/<symbol id="carrier-map-mark"/);assert.ok(q.shape()[2]>=1200&&q.shape()[2]<=1280,'starts at the wider phone zoom');
 const before=q.position(q.carrier);
 q.tap(175,191,q.pin('serein'));
 assert.equal(q.el('location-title').textContent,'Serein');
 assert.equal(q.pin('serein').attrs.get('aria-pressed'),'true');
 assert.deepEqual(q.position(q.carrier),before);
 q.images[0].onload();assert.equal(q.el('location-portrait').hidden,false);
 const [x,y]=q.position(q.pin('pirates'));
 assert.ok(x<430&&y>1050&&x>100&&y<1650,'signal fills the lower-left gap without hugging the edge');
 assert.ok(q.position(q.pin('marrow'))[0]-q.position(q.pin('serein'))[0]>460,'formerly clustered planets spread further apart');
});

test('Outer Reach distributes the full contact catalog north and south without moving crew survey landmarks',()=>{
 const q=setup(),main=q.el('galaxy-targets').kids[0],html=read('galaxy-map.html');
 const points=main.kids.map(pin=>[pin.getAttribute('data-location'),...q.position(pin)]);
 const ids=new Set(points.map(([id])=>id));
 assert.equal(ids.size,25);
 assert.ok(points.filter(([,x,y])=>y<-400).length>=3,'several worlds in the far north');
 assert.ok(points.filter(([,x,y])=>y>1750).length>=5,'several worlds, moons and the giant asteroid in the south');
 assert.ok(Math.max(...points.map(p=>p[1]))-Math.min(...points.map(p=>p[1]))>2200);
 assert.ok(Math.max(...points.map(p=>p[2]))-Math.min(...points.map(p=>p[2]))>2900);
 assert.deepEqual(q.position(q.pin('pirates')),[365,1160]);
 assert.deepEqual(q.position(q.pin('south-moon')),[805,1920]);
 for(const [id,icon,type] of [
  ['lyren','azure-rings','Ringed ice giant'],['verdan','forest','Forest planet'],['siroc','dune','Desert planet'],
  ['kiva','ice-moon','Ice moon'],['cinder','cinder-moon','Volcanic moon'],['ironwake','iron-body','Planet-sized asteroid']
 ]){
  const p=q.pin(id),use=p.kids.find(child=>child.tag==='use');
  assert.equal(use.getAttribute('href'),'#'+icon);assert.ok(html.includes('<symbol id="'+icon+'"'));
  q.tap(180,215,p);assert.equal(q.el('location-class').textContent,type);
 }
 const width=Number(q.pin('ironwake').kids.find(child=>child.tag==='use').getAttribute('width'));
 assert.equal(width,Number(q.pin('serein').kids.find(child=>child.tag==='use').getAttribute('width')),'asteroid plots at planet marker scale');
});

test('the chart follows the shared carrier and does not invent a position while unavailable',()=>{
 const a=setup(),b=setup({startAge:25000}),lost=setup({offline:true});
 assert.notDeepEqual(a.position(a.carrier),b.position(b.carrier));
 assert.equal(lost.carrier.attrs.get('display'),'none');
 assert.equal(lost.el('carrier-strip-motion').textContent,'Signal unavailable');
 const lostButton=lost.el('galaxy-center'),lostShape=lost.shape();
 assert.equal(lostButton.disabled,true);
 lostButton.send('click');assert.deepEqual(lost.shape(),lostShape);
 a.step(250);const expected=a.reference();
 near(a.position(a.carrier)[0],expected.x);near(a.position(a.carrier)[1],expected.y);
 assert.ok(Number(a.el('carrier-strip-speed').textContent)<=76);
 const parked=a.position(a.carrier);a.hide(true);a.step(180);assert.deepEqual(a.position(a.carrier),parked);
 a.hide(false);a.step();assert.notDeepEqual(a.position(a.carrier),parked,'resume snaps to shared elapsed time');
});

test('location finder works without first opening a contact and returns focus after use',()=>{
 const q=setup({width:320}),details=q.el('galaxy-details'),menu=q.el('galaxy-location-finder'),select=q.el('galaxy-find');
 const html=read('galaxy-map.html'),css=read('galaxy-map.css');
 assert.match(html,/<details class="location-finder"[^]*?<summary[^]*?Find a location<[^]*?<select[^]*?id="galaxy-find"[^]*?<\/details>[^]*?<section class="details"/);
 assert.match(css,/\.finder-panel select\{[^}]*font-size:1rem/);
 assert.equal(details.hidden,true);
 menu.open=true;select.value='south-moon';select.send('change');
 assert.equal(menu.open,false);assert.equal(details.hidden,false);
 assert.equal(q.el('location-title').textContent,'Uncharted Moon');
 assert.equal(q.el('galaxy-finder-toggle').focused,true);
 menu.open=true;assert.equal(menu.send('keydown',{key:'Escape'}).defaultPrevented,true);
 assert.equal(menu.open,false);
});

test('location finder can open Pegasus on first use and inspect the same vessel again',()=>{
 const q=setup({width:320}),details=q.el('galaxy-details'),menu=q.el('galaxy-location-finder'),select=q.el('galaxy-find');
 const choose=id=>{
  menu.open=true;assert.notEqual(select.value,id,'native select needs a different value to emit change');
  select.value=id;select.send('change');
  assert.equal(select.value,'');assert.equal(menu.open,false);assert.equal(details.hidden,false);
  assert.equal(q.el('location-title').textContent,'Federal Navy');
  assert.equal(q.el('galaxy-visit-vessel').getAttribute('href'),'./carrier.html?vessel=rift-carrier');
 };
 assert.equal(select.kids[0].disabled,true);
 choose('rift-carrier');
 q.el('galaxy-detail-close').send('click');assert.equal(details.hidden,true);
 choose('rift-carrier');
});

test('guest taps, finder, arrows and pan never alter the same-seeded ship course',()=>{
 const a=setup(),control=setup(),chart=a.el('galaxy-chart');
 a.tap(300,380);a.tap(175,191,a.pin('serein'));
 a.pin('marrow').send('keydown',{key:'Enter'});
 const finder=a.el('galaxy-find');finder.value='kel';finder.send('change');
 chart.send('keydown',{target:chart,key:'Enter'});
 chart.send('keydown',{target:chart,key:'ArrowRight'});
 a.down(340,310);a.next('pointermove',15,310);a.next('pointerup',15,310);
 for(let i=0;i<650;i++){
  a.step();control.step();assert.deepEqual(a.position(a.carrier),control.position(control.carrier));
 }
});

test('pinch anchors the midpoint and rebase hands off without a phantom contact tap',()=>{
 const q=setup(),drawer=q.el('galaxy-details');
 const initial=q.shape(),before=q.point(205,535);
 // Start low enough to exercise the anchor without hitting the northern world boundary.
 q.down(140,535,1,q.pin('serein'));q.down(270,535,2);
 q.next('pointermove',95,540,1);q.next('pointermove',335,540,2);
 assert.ok(q.shape()[2]<initial[2]*.66);
 const after=q.point(215,540);near(after[0],before[0]);near(after[1],before[1]);
 const stable=q.shape();q.next('pointerup',335,540,2);assert.deepEqual(q.shape(),stable);
 q.next('pointermove',120,555,1);assert.notDeepEqual(q.shape(),stable);
 q.next('pointerup',120,555,1);assert.equal(drawer.hidden,true);
 q.tap(175,191,q.pin('serein'));assert.equal(drawer.hidden,false);
});

test('mobile zoom out stops at a readable overview and the camera can still pan side to side',()=>{
 const q=setup(),minus=q.el('galaxy-minus');
 near(q.shape()[2],1250);
 const icon=q.carrier.kids.find(n=>n.attrs.get('class')==='carrier-art-pin'),dot=q.carrier.kids.find(n=>n.attrs.get('class')==='carrier-blip');
 assert.equal(dot.attrs.get('display'),'none');assert.equal(icon.attrs.has('display'),false);
 for(let i=0;i<10;i++)minus.send('click');
 near(q.shape()[2],1725);assert.equal(minus.disabled,true);
 assert.equal(icon.attrs.get('display'),'none');assert.equal(dot.attrs.has('display'),false);
 assert.equal(q.carrier.attrs.get('aria-label'),'Federal Navy · Pegasus — Pegasus-class carrier');
 const hit=q.carrier.kids.find(n=>n.attrs.get('class')==='world-hit');
 assert.ok(+hit.attrs.get('r')*2*q.rect.width/q.shape()[2]>=43.9);
 const left=q.shape()[0];q.down(330,500);q.next('pointermove',110,500);q.next('pointerup',110,500);
 assert.ok(q.shape()[0]>left+300,'world still pans at wide mobile zoom');
 const stable=q.shape();
 q.down(40,420,1);q.down(350,420,2);q.next('pointermove',150,420,1);q.next('pointermove',230,420,2);
 near(q.shape()[2],stable[2]);assert.equal(minus.disabled,true);
 q.next('pointercancel',150,420,1);q.next('pointercancel',230,420,2);
 q.el('galaxy-plus').send('click');assert.equal(dot.attrs.get('display'),'none');assert.equal(icon.attrs.has('display'),false);
 const desktop=setup({width:900,height:530});for(let i=0;i<12;i++)desktop.el('galaxy-minus').send('click');
 assert.ok(desktop.shape()[2]>=2750,'desktop retains whole tile overview');
});

test('the chart never follows the carrier; Locate centers once and leaves it there',()=>{
 const q=setup({height:430}),initial=q.shape(),start=q.position(q.carrier);
 q.step(270);assert.deepEqual(q.shape(),initial);assert.notDeepEqual(q.position(q.carrier),start);
 q.down(285,420);q.next('pointermove',205,462);q.next('pointerup',205,462);
 const browse=q.shape();q.step(135);assert.deepEqual(q.shape(),browse);
 q.el('galaxy-center').send('click');const located=q.shape();assert.notDeepEqual(located,browse);
 q.step(220);assert.deepEqual(q.shape(),located);
});

test('Corsair inspection is read-only; a crew close pass records the survey for later in this session',()=>{
 for(const seed of [13,321,424242]){
  const q=setup({seed}),finder=q.el('galaxy-find');
  finder.value='pirates';finder.send('change');
  assert.equal(q.el('location-title').textContent,'Corsair Cluster');
  assert.doesNotMatch(q.el('location-description').textContent,/Blackwake/);
  q.step(1700);
  assert.match(q.el('location-description').textContent,/Blackwake/);
  assert.equal(q.pin('pirates').attrs.has('data-surveyed'),true);
  q.tap(160,191,q.pin('marrow'));assert.doesNotMatch(q.el('location-description').textContent,/Blackwake/);
  q.tap(160,191,q.pin('pirates'));assert.match(q.el('location-description').textContent,/Blackwake/);
 }
});

test('Go to Carrier appears only off-sector and jumps the guest chart once without following the carrier',()=>{
 const q=setup(),carrierSector=()=>q.el('carrier-strip-sector').textContent,chartSector=()=>q.el('galaxy-sector-title').textContent;
 const seek=target=>{for(let i=0;i<22000&&carrierSector()!==target;i++)q.step();assert.equal(carrierSector(),target);};
 assert.equal(chartSector(),'The Outer Reach');const initial=q.shape();
 const button=q.el('galaxy-center'),view=q.el('galaxy-viewport'),hint=q.el('galaxy-hint');
 assert.equal(button.textContent,'⌖');assert.equal(button.getAttribute('aria-label'),'Locate carrier');
 assert.equal(button.disabled,false);assert.equal(view.getAttribute('data-carrier-away'),'false');
 seek('Uncharted Frontier');
 assert.equal(chartSector(),'The Outer Reach');assert.deepEqual(q.shape(),initial);
 assert.equal(q.carrier.attrs.get('display'),'none');
 assert.equal(button.textContent,'Go to Carrier');assert.equal(button.getAttribute('aria-label'),'Go to Carrier');
 assert.match(button.getAttribute('title'),/Uncharted Frontier/);
 assert.equal(view.getAttribute('data-carrier-away'),'true');assert.equal(hint.textContent,'CARRIER OFF THIS CHART');
 const before=q.position(q.carrier);
 button.send('click');assert.equal(chartSector(),'Uncharted Frontier');
 assert.equal(q.el('galaxy-sector-number').textContent,'Sector 02');
 assert.equal(q.el('galaxy-backdrop-reach').attrs.get('display'),'none');
 assert.equal(q.el('galaxy-backdrop-frontier').attrs.has('display'),false);
 assert.equal(button.textContent,'⌖');assert.equal(view.getAttribute('data-carrier-away'),'false');
 assert.equal(hint.textContent,'DRAG / PINCH · TAP TO INSPECT');assert.deepEqual(q.position(q.carrier),before);
 const after=q.shape();q.step(60);assert.deepEqual(q.shape(),after,'camera stays put after the jump');
 assert.notDeepEqual(q.position(q.carrier),before,'server carrier still advances');
 assert.equal(q.el('galaxy-targets').kids[0].attrs.get('display'),'none');
 assert.equal(q.el('galaxy-targets').kids[1].kids.length,0);
 const globalFinder=q.el('galaxy-find');
 assert.equal(globalFinder.kids.length,4);
 assert.equal(globalFinder.kids.filter(option=>option.value==='pirate-hideout').length,1);
 globalFinder.value='pirate-hideout';globalFinder.send('change');
 assert.equal(chartSector(),'The Outer Reach');
 assert.equal(q.el('location-title').textContent,'Pirate Hideout');
 assert.equal(globalFinder.kids.filter(option=>option.value==='pirate-hideout').length,1);
 button.send('click');assert.equal(chartSector(),'Uncharted Frontier');
 assert.equal(q.el('galaxy-carrier').kids.length,1);near(before[0],35);
 seek('The Outer Reach');assert.equal(chartSector(),'Uncharted Frontier');
 assert.equal(q.el('galaxy-sector-number').textContent,'Sector 02');
 assert.equal(q.el('galaxy-backdrop-reach').attrs.get('display'),'none');
 assert.equal(q.el('galaxy-backdrop-frontier').attrs.has('display'),false);
 assert.equal(button.textContent,'Go to Carrier');assert.match(button.getAttribute('title'),/The Outer Reach/);
 button.send('click');assert.equal(chartSector(),'The Outer Reach');assert.equal(button.textContent,'⌖');near(q.position(q.carrier)[0],2715);
 assert.equal(q.el('galaxy-find').kids.length,28);
});

test('the contact drawer stays hidden until a contact tap and Escape closes it while crew remains independent',()=>{
 const q=setup(),drawer=q.el('galaxy-details'),close=q.el('galaxy-detail-close'),before=q.position(q.carrier);
 assert.equal(drawer.hidden,true);
 q.tap(200,210);assert.equal(drawer.hidden,true,'empty space does not open details');
 q.tap(165,185,q.pin('marrow'));
 assert.equal(drawer.hidden,false);assert.equal(q.el('location-title').textContent,'Marrow');
 close.send('click');assert.equal(drawer.hidden,true);assert.equal(q.el('galaxy-chart').focused,true);
 assert.deepEqual(q.position(q.carrier),before);
 q.tap(168,196,q.pin('pirates'));assert.equal(drawer.hidden,false);
 drawer.send('keydown',{key:'Escape'});assert.equal(drawer.hidden,true);
 assert.match(read('galaxy-map.css'),/100dvh - var\(--atlas-top\) - var\(--atlas-bottom\)/);
});

test('the full north and south chart are unmasked and pannable without moving contacts',()=>{
 const q=setup(),chart=q.el('galaxy-chart');
 const html=read('galaxy-map.html');
 assert.doesNotMatch(html,/galaxy-fog|uncharted-(?:north|south)/);
 assert.match(html,/id="galaxy-stars"/);assert.match(html,/id="galaxy-atlas-art" mask="url\(#atlas-feather\)"/);
 q.tap(180,191,q.pin('south-moon'));
 assert.match(q.el('location-description').textContent,/far south/);
 const mark=q.position(q.pin('pirates')),start=q.shape()[1];
 for(let i=0;i<24;i++)chart.send('keydown',{target:chart,key:'ArrowUp'});
 assert.ok(q.shape()[1]<Math.min(-700,start),'north expansion is pannable');
 for(let i=0;i<45;i++)chart.send('keydown',{target:chart,key:'ArrowDown'});
 assert.ok(q.shape()[1]+q.shape()[3]>2500,'south expansion is pannable');
 assert.deepEqual(q.position(q.pin('pirates')),mark);
});

test('capital ship strip stays below the chart and shows live speed even when no contact drawer is open',()=>{
 const q=setup(),html=read('galaxy-map.html'),css=read('galaxy-map.css');
 assert.match(html,/<section id="carrier-chart-status" class="carrier-strip" aria-labelledby="carrier-strip-title">/);
 assert.match(css,/100dvh - var\(--atlas-top\) - var\(--atlas-bottom\) - 2px - var\(--carrier-strip\) - var\(--strip-gap\)/);
 assert.equal(q.el('galaxy-details').hidden,true);
 assert.equal(q.el('carrier-strip-sector').textContent,'The Outer Reach');
 assert.equal(q.el('carrier-strip-speed').textContent,'0');
 assert.equal(q.el('carrier-strip-motion').textContent,'Holding position');
 q.step(180);assert.equal(q.el('carrier-strip-motion').textContent,'Underway');
 assert.ok(Number(q.el('carrier-strip-speed').textContent)>0&&Number(q.el('carrier-strip-speed').textContent)<=76);
 assert.equal(q.el('galaxy-details').hidden,true);
});

test('Captain alert opens the Bridge only for currently available new briefings',()=>{
 let fresh=[];const q=setup({briefings:()=>fresh,storage:null}),alert=q.el('galaxy-captain-alert');
 assert.equal(alert.hidden,true);
 assert.match(read('galaxy-map.html'),/id="galaxy-captain-alert" href="\.\/carrier-bridge\.html\?vessel=rift-carrier" hidden/);
 assert.match(read('galaxy-map.html'),/pilot-credits\.js\?v=250" data-read-only/);
 fresh=[{id:'wingman',title:'Wingman Qualification'}];q.events.get('storage')();
 assert.equal(alert.hidden,false);assert.match(alert.attrs.get('aria-label'),/Wingman Qualification/);
 fresh=[];q.events.get('pageshow')();assert.equal(alert.hidden,true);assert.equal(alert.attrs.has('aria-label'),false);
});

test('Galaxy Back preserves either incoming carrier and leaves the legacy home route otherwise',()=>{
 for(const id of ['bifrost','rift-carrier']){
  const q=setup({search:'?vessel='+id});
  assert.equal(q.el('galaxy-back').attrs.get('href'),'./carrier.html?vessel='+id);
 }
 for(const search of ['','?vessel=unknown','?vessel=bifrost&vessel=rift-carrier']){
  assert.equal(setup({search}).el('galaxy-back').attrs.has('href'),false);
 }
 assert.match(read('galaxy-map.html'),/href="\.\/carrier\.html" id="galaxy-back"/);
});

test('Wing Rendezvous alert is offered before acceptance and directs Bifrost guests to the correct Bridge',()=>{
 const generation='pilot-1',key='rift-runner.wing-rendezvous.v1';
 const storage=new Map([['rift-runner.character-generation.v1',generation]]);
 const q=setup({storage,search:'?vessel=bifrost'}),alert=q.el('galaxy-captain-alert');
 assert.equal(alert.hidden,false);
 assert.match(alert.attrs.get('title'),/Wing Rendezvous/);
 const save={version:1,generation,rooms:{aya:'common',ellis:'observation'},acceptedAt:40,met:{aya:false,ellis:false},completedAt:null};
 storage.set(key,JSON.stringify(save));q.events.get('storage')();
 assert.equal(alert.hidden,true);
 storage.set(key,JSON.stringify({...save,met:{aya:true,ellis:true},completedAt:45}));q.events.get('pageshow')();
 assert.equal(alert.hidden,true);
 storage.set('rift-runner.character-generation.v1','new-pilot');q.events.get('storage')();
 assert.equal(alert.hidden,false,'another pilot’s completed order does not suppress the offer');
});

test('Take Helm steers only the local test; releasing restores the shared carrier and the moon is inspectable',()=>{
 const q=setup(),other=setup(),helm=q.el('galaxy-helm');const before=q.position(q.carrier);
 helm.send('click');assert.equal(helm.attrs.get('aria-pressed'),'true');
 assert.equal(q.el('carrier-strip-motion').textContent,'Local helm test');
 q.tap(355,650);q.step(2400);other.step(2400);
 assert.ok(Number(q.el('carrier-strip-speed').textContent)>0&&Number(q.el('carrier-strip-speed').textContent)<=16);
 assert.notDeepEqual(q.position(q.carrier),before);assert.notDeepEqual(q.position(q.carrier),other.position(other.carrier));
 helm.send('click');assert.equal(helm.textContent,'Take Helm');
 assert.deepEqual(q.position(q.carrier),other.position(other.carrier));
 q.tap(155,600,q.pin('south-moon'));
 assert.equal(q.el('location-title').textContent,'Uncharted Moon');
 assert.equal(q.el('location-portrait').hidden,true);
 assert.match(q.el('location-description').textContent,/cratered moon/);
 assert.ok(q.position(q.pin('south-moon'))[1]>1800);
});

test('current course shows a single dashed active leg and the scale represents real world units',()=>{
 const initial=setup(),line=initial.el('carrier-current-course');
 assert.equal(line.attrs.get('display'),'none');
 initial.step(260);
 assert.match(line.attrs.get('d'),/^M[\d. -]+L[\d. -]+$/);
 assert.match(read('galaxy-map.html'),/id="carrier-current-course"[^>]*stroke-dasharray="4 6"/);
 assert.match(initial.el('carrier-strip-destination').textContent,/^To /);
 const scale=initial.el('galaxy-scale-label'),pixels=parseFloat(initial.el('galaxy-scale-line').style.getPropertyValue('width'));
 near(parseFloat(scale.textContent)*initial.rect.width/initial.shape()[2],pixels,1);
});

test('generated north/south artwork has depth without moving sector contacts or the HUD',()=>{
 const q=setup(),quiet=setup({reduced:true}),html=read('galaxy-map.html');
 assert.equal(q.el('galaxy-sector-number').textContent,'Sector 01');
 assert.ok(fs.statSync(path.join(dist,'galaxy-atlas-north.webp')).size>1000);
 assert.ok(fs.statSync(path.join(dist,'galaxy-atlas-south.webp')).size>1000);
 assert.match(html,/id="galaxy-backdrop-frontier"[\s\S]*?galaxy-atlas-south\.webp/);
 const position=q.position(q.pin('marrow'));
 const delta=(game,id)=>Number(game.el(id).attrs.get('transform').match(/translate\(([-.\d]+)/)[1]);
 const a=delta(q,'galaxy-nebula-layer'),b=delta(q,'galaxy-stars');
 for(const game of [q,quiet]){
  const chart=game.el('galaxy-chart');chart.send('keydown',{target:chart,key:'ArrowRight'});
 }
 const da=Math.abs(delta(q,'galaxy-nebula-layer')-a),db=Math.abs(delta(q,'galaxy-stars')-b);
 assert.ok(da>db&&db>0,'far nebula countershifts more than nearer stars during panning');
 assert.equal(delta(quiet,'galaxy-nebula-layer'),0);
 assert.equal(delta(quiet,'galaxy-stars'),0);
 assert.deepEqual(q.position(q.pin('marrow')),position);
});

test('Outer Reach southern artwork blends across the middle plate on a continuous haze',()=>{
 const doc=fs.readFileSync(path.join(dist,'galaxy-map.html'),'utf8');
 const south=doc.match(/<image href="\.\/galaxy-atlas-south\.webp[^"]*"[^>]* y="(\d+)"[^>]* height="(\d+)"/);
 const main=doc.match(/<image id="galaxy-atlas-art"[^>]* height="(\d+)"/);
 assert.ok(south&&main);
 assert.ok(Number(main[1])-Number(south[1])>=500,'southern artwork overlaps the middle artwork');
 assert.ok(Number(south[1])+Number(south[2])>2660,'southern artwork extends past the chart');
 assert.match(doc,/<g id="galaxy-backdrop-reach">\s*<ellipse[^>]+fill="url\(#atlas-south-haze\)"/);
 assert.match(doc,/id="atlas-feather-vertical"[^>]*>[\s\S]*?offset="\.72"/);
});

const bifrostPose=(t,sector='reach')=>({id:'bifrost',sector,x:810+(t-100)/30,y:1140,heading:79,speed:36,phase:'cruising',destination:'Outer Reach Sweep'});
test('Bifrost is an independent inspectable vessel with its own marker and no helm actions',()=>{
 const q=setup({bifrost:bifrostPose}),pin=q.el('galaxy-bifrost').kids[0],before=q.position(pin);
 const initial=q.shape();
 assert.equal(pin.getAttribute('display'),undefined);
 assert.equal(pin.getAttribute('aria-label'),'Federal Navy · Bifrost — Bifrost-class carrier');
 assert.equal(pin.kids.find(n=>n.attrs.get('class')==='bifrost-art-pin').kids.find(n=>n.tag==='image').attrs.get('href'),'./admiral-adaline.webp');
 q.step(60);
 assert.ok(q.position(pin)[0]>before[0]);assert.deepEqual(q.shape(),initial);
 q.tap(185,195,pin);
 assert.equal(q.el('location-title').textContent,'Federal Navy');
 assert.match(q.el('location-commander').textContent,/Admiral Adaline/);
 assert.match(q.el('location-route').textContent,/Outer Reach Sweep/);
 assert.equal(q.el('galaxy-bifrost-company').hidden,false);
 assert.equal(q.el('galaxy-visit-vessel').hidden,false);
 assert.equal(q.el('galaxy-visit-vessel').getAttribute('href'),'./carrier.html?vessel=bifrost');
 const patrol=q.position(pin);
 q.el('galaxy-helm').send('click');q.tap(140,380);q.step(60);
 assert.ok(q.position(pin)[0]>patrol[0],'local Pegasus helm never steers Bifrost');
 assert.match(read('galaxy-map.html'),/carrier-multicrew\.html#bifrost/);
});
test('Bifrost deep link and locator jump across sectors only once',()=>{
 const far=t=>bifrostPose(t,'frontier'),q=setup({bifrost:far,search:'?vessel=bifrost'});
 const pin=q.el('galaxy-bifrost').kids[0];
 assert.equal(q.el('galaxy-sector-title').textContent,'Uncharted Frontier');
 assert.equal(q.el('location-title').textContent,'Federal Navy');
 assert.equal(q.el('galaxy-details').hidden,false);
 assert.equal(pin.getAttribute('display'),undefined);
 assert.equal(q.carrier.getAttribute('display'),'none');
 const camera=q.shape(),before=q.position(pin);
 q.step(70);
 assert.notDeepEqual(q.position(pin),before);
 assert.deepEqual(q.shape(),camera);
 const manual=setup({bifrost:far});
 assert.equal(manual.el('galaxy-bifrost').kids[0].getAttribute('display'),'none');
 manual.el('galaxy-locate-bifrost').send('click');
 assert.equal(manual.el('galaxy-sector-title').textContent,'Uncharted Frontier');
 assert.equal(manual.el('location-title').textContent,'Federal Navy');
});
test('an unavailable Bifrost feed shows a signal message and no invented chart position',()=>{
 const q=setup({bifrost:()=>({phase:'unavailable'})});
 q.el('galaxy-locate-bifrost').send('click');
 assert.equal(q.el('galaxy-bifrost').kids[0].getAttribute('display'),'none');
 assert.equal(q.el('location-title').textContent,'Federal Navy');
 assert.match(q.el('location-route').textContent,/signal is unavailable/);
 assert.equal(q.el('galaxy-bifrost-company').hidden,false);
 assert.equal(q.el('galaxy-visit-vessel').hidden,false);
 assert.equal(q.el('galaxy-visit-vessel').getAttribute('href'),'./carrier.html?vessel=bifrost');
});

test('both moving contacts show upright clipped portraits with a same-size fallback',()=>{
 const q=setup({bifrost:bifrostPose});
 for(const [pin,kind,asset,letter] of [
  [q.carrier,'carrier','./captain-bridge-front.webp?v=94','B'],
  [q.el('galaxy-bifrost').kids[0],'bifrost','./admiral-adaline.webp','A']
 ]){
  const art=pin.kids.find(n=>n.attrs.get('class')===kind+'-art-pin');
  const image=art.kids.find(n=>n.tag==='image'),fallback=art.kids.find(n=>n.attrs.get('class')==='map-admiral-initials');
  assert.equal(image.getAttribute('href'),asset);
  assert.equal(image.getAttribute('clip-path'),'url(#map-admiral-disc)');
  assert.equal(image.getAttribute('visibility'),'hidden');
  assert.equal(fallback.textContent,letter);
  image.send('load');
  assert.equal(image.getAttribute('visibility'),undefined);
  assert.equal(fallback.getAttribute('visibility'),'hidden');
  q.step(100);
  assert.doesNotMatch(art.getAttribute('transform'),/rotate/);
  assert.equal(image.getAttribute('transform'),undefined);
  image.send('error');
  assert.equal(image.getAttribute('visibility'),'hidden');
  assert.equal(fallback.getAttribute('visibility'),undefined);
 }
 assert.match(read('galaxy-map.html'),/<clipPath id="map-admiral-disc"><circle r="21"\/><\/clipPath>/);
});

test('two ships of the same configured guild retain separate markers, commanders, selections, and Deck Maps',()=>{
 const guildId='test-fleet',guild='Fixture Fleet';
 const identityRecords={
  guilds:[{id:guildId,name:guild,type:'military'}],
  commanders:[{id:'fixture-admiral',name:'Morgan',title:'Admiral'},{id:'fixture-captain',name:'Rao',title:'Captain'}],
  vessels:[
   {id:'rift-carrier',designation:'Rift Carrier',name:'Pegasus',kind:'carrier',vesselClass:'Pegasus-class carrier',profession:'Military',guildId,commanderId:'fixture-admiral'},
   {id:'bifrost',designation:'Bifrost',name:'Bifrost',kind:'carrier',vesselClass:'Bifrost-class carrier',profession:'Military',guildId,commanderId:'fixture-captain'}
  ]
 };
 const q=setup({identityRecords,bifrost:bifrostPose}),bf=q.el('galaxy-bifrost').kids[0];
 assert.equal(q.carrier.getAttribute('data-location'),'rift-carrier');
 assert.equal(bf.getAttribute('data-location'),'bifrost');
 assert.match(q.carrier.getAttribute('aria-label'),/^Fixture Fleet · Pegasus — Pegasus-class carrier$/);
 assert.match(bf.getAttribute('aria-label'),/^Fixture Fleet · Bifrost — Bifrost-class carrier$/);
 assert.equal(q.el('carrier-strip-title').textContent,guild);
 for(const [marker,id,name,commander] of [[q.carrier,'rift-carrier','Pegasus','Admiral Morgan'],[bf,'bifrost','Bifrost','Captain Rao']]){
  q.tap(185,195,marker);
  assert.equal(marker.getAttribute('aria-pressed'),'true');
  assert.equal(q.el('location-title').textContent,guild);
  assert.match(q.el('location-class').textContent,new RegExp('^'+name+' — '));
  assert.equal(q.el('location-commander').textContent,commander);
  const art=marker.kids.find(n=>n.attrs.get('class')?.endsWith('-art-pin'));
  assert.equal(art.kids.find(n=>n.tag==='image').getAttribute('href'),undefined,'does not reuse another commander’s portrait');
  assert.equal(art.kids.find(n=>n.attrs.get('class')==='map-admiral-initials').textContent,commander.split(' ')[1][0]);
  assert.equal(q.el('galaxy-visit-vessel').getAttribute('href'),'./carrier.html?vessel='+id);
 }
 const choices=q.el('galaxy-find').kids;
 assert.ok(choices.some(o=>o.value==='rift-carrier'&&o.textContent==='Fixture Fleet · Pegasus'));
 assert.ok(choices.some(o=>o.value==='bifrost'&&o.textContent==='Fixture Fleet · Bifrost'));
 assert.equal(q.carrier.getAttribute('aria-pressed'),'false');
});

test('vessel details show the selected ship art and hide stale, failed, and planet-inapplicable images',()=>{
 const q=setup({bifrost:bifrostPose}),peg=q.el('location-pegasus-image'),bif=q.el('location-bifrost-image');
 const bishop=q.el('location-bishop-image'),adaline=q.el('location-adaline-image'),media=q.el('location-contact-media');
 assert.equal(peg.hidden,true);assert.equal(bif.hidden,true);assert.equal(media.hidden,true);
 q.tap(170,195,q.carrier);
 assert.equal(peg.getAttribute('src'),'./carrier-capital.webp?v=133');
 assert.equal(peg.getAttribute('alt'),'Top view of Pegasus');
 assert.equal(bishop.getAttribute('src'),'./captain-bridge-front.webp?v=94');
 assert.equal(bishop.getAttribute('alt'),'Portrait of Admiral Bishop');
 const marker=q.el('galaxy-bifrost').kids[0];
 q.tap(185,195,marker);peg.send('load');bishop.send('load');
 assert.equal(bishop.hidden,true,'the old commander cannot flash');
 assert.equal(peg.hidden,true,'the old art must not appear if it loads after switching ships');
 assert.equal(bif.getAttribute('src'),'./bifrost-carrier.webp');
 assert.equal(bif.getAttribute('alt'),'Top view of Bifrost');
 bif.send('load');adaline.send('load');assert.equal(bif.hidden,false);assert.equal(adaline.hidden,false);assert.equal(media.hidden,false);
 assert.equal(adaline.getAttribute('alt'),'Portrait of Admiral Adaline');
 q.tap(150,180,q.carrier);
 assert.equal(peg.hidden,false);assert.equal(bif.hidden,true);assert.equal(bishop.hidden,false);assert.equal(adaline.hidden,true);
 peg.send('error');assert.equal(peg.hidden,true);
 q.images[0].onload();
 q.tap(182,215,q.pin('serein'));
 assert.equal(peg.hidden,true);assert.equal(bif.hidden,true);
 assert.equal(q.el('location-portrait').hidden,false,'planets still show their own atlas portrait');
 assert.equal(media.hidden,true);assert.equal(bishop.hidden,true);assert.equal(adaline.hidden,true);
 assert.match(read('galaxy-map.css'),/location-contact-media[^\n]+display:grid/);
 assert.match(read('galaxy-map.css'),/location-vessel-image[^\n]+object-fit:contain/);
});

test('Fly and Visit stay separate; only an owned active fighter parked elsewhere can take the transfer route',()=>{
 const storage=new Map([['rift-runner.hull-owned.v1',JSON.stringify({version:1,hull:'rift-fighter',condition:'repaired'})]]);
 const wallet={getBuildState:()=>({origin:'new'}),ownsHull:()=>false};
 const q=setup({storage,wallet,bifrost:bifrostPose}),peg=q.carrier,bif=q.el('galaxy-bifrost').kids[0];
 const fly=q.el('galaxy-fly-to-vessel'),visit=q.el('galaxy-visit-vessel'),before=Array.from(storage);
 q.tap(170,195,bif);
 assert.equal(fly.hidden,false);assert.equal(fly.getAttribute('href'),'./index.html?transfer=bifrost');
 assert.equal(visit.getAttribute('href'),'./carrier.html?vessel=bifrost');
 q.tap(170,195,peg);assert.equal(fly.hidden,true);
 q.tap(170,195,bif);assert.deepEqual(Array.from(storage),before);
 storage.delete('rift-runner.hull-owned.v1');q.events.get('storage')();
 assert.equal(fly.hidden,true);assert.equal(fly.getAttribute('href'),undefined);
 assert.equal(visit.getAttribute('href'),'./carrier.html?vessel=bifrost');
 storage.set('rift-runner.hull-owned.v1',before[0][1]);
 storage.set('rift-runner.pilot-profile.v1',JSON.stringify({version:2,companyVesselId:'bifrost'}));
 q.tap(170,195,peg);
 assert.equal(fly.hidden,false);assert.equal(fly.getAttribute('href'),'./index.html?transfer=rift-carrier');
});

test('embedded transit accepts only validated parent progress and crosses sectors without changing saves',()=>{
 const parent={},url='?transit=1&from=rift-carrier&to=bifrost';
 const sign=(x,y,sector,id)=>({x,y,sector,id,heading:0,speed:0,phase:'holding'});
 const storage=new Map(),q=setup({search:url,parent,storage,
  pegasus:()=>sign(2000,1000,'reach','rift-carrier'),bifrost:()=>sign(250,1080,'frontier','bifrost')});
 const [route,marker]=q.el('galaxy-fighter-transit').kids;
 assert.equal(q.el('galaxy-atlas').getAttribute('data-transit'),'true');
 assert.equal(q.el('galaxy-chart').getAttribute('inert'),'');
 const update=(progress,rest={},source=parent,origin='https://game.example')=>{
  q.events.get('message')({data:{type:'rift-fighter-transit',from:'rift-carrier',to:'bifrost',progress,...rest},source,origin});q.step();
 };
 update(1,{},{});update(1,{},parent,'https://elsewhere.example');update(1,{to:'rift-carrier'});
 assert.equal(marker.getAttribute('display'),'none');
 update(0);assert.deepEqual(q.position(marker),[2000,1000]);assert.match(route.getAttribute('d'),/^M/);
 update(.4);assert.deepEqual(q.position(marker),[2400,1032]);
 update(.8);assert.deepEqual(q.position(marker),[50,1064]);assert.equal(q.el('galaxy-sector-title').textContent,'Uncharted Frontier');
 update(.1);assert.deepEqual(q.position(marker),[50,1064],'late packets do not rewind the fighter');
 update(1);assert.deepEqual(q.position(marker),[250,1080]);
 assert.match(q.el('galaxy-transit-status').textContent,/Bifrost · 100%/);
 assert.equal(storage.size,0);
 assert.equal(setup({search:url}).el('galaxy-atlas').getAttribute('data-transit'),undefined,'top-level query cannot enter transit');
});

test('the brief embedded chart starts showing progress even when carrier signals are unavailable',()=>{
 const parent={},q=setup({search:'?transit=1&from=bifrost&to=rift-carrier',parent,offline:true});
 const [route,marker]=q.el('galaxy-fighter-transit').kids;
 const update=progress=>{q.events.get('message')({source:parent,origin:'https://game.example',data:{type:'rift-fighter-transit',from:'bifrost',to:'rift-carrier',progress}});q.step();};
 update(0);const start=q.position(marker);assert.match(route.getAttribute('d'),/ H/);
 update(.5);assert.ok(q.position(marker)[0]>start[0]);assert.match(q.el('galaxy-transit-status').textContent,/Pegasus · 50% · Carrier signal pending/);
});

test('airborne picker sends one scoped choice in both directions without navigating its frame',()=>{
 for(const [from,to,name] of [['rift-carrier','bifrost','Bifrost'],['bifrost','rift-carrier','Pegasus']]){
  const sent=[],parent={postMessage:(data,origin)=>sent.push({...data,origin})};
  const p=setup({search:'?flight-map=1&from='+from,parent,offline:true});
  assert.equal(p.el('galaxy-atlas').getAttribute('data-flight-map'),'true');
  assert.equal(p.el('galaxy-locate-bifrost').textContent,name);
  const menu=p.el('galaxy-find');menu.value=from;menu.send('change');
  assert.equal(p.el('galaxy-select-flight').hidden,true,'cannot select departure carrier');
  p.el('galaxy-locate-bifrost').send('click');
  assert.equal(p.el('galaxy-visit-vessel').hidden,true);
  assert.equal(p.el('galaxy-bifrost-company').hidden,true);
  assert.equal(p.el('galaxy-fly-to-vessel').hidden,true);
  const choice=p.el('galaxy-select-flight');
  assert.equal(choice.hidden,false);assert.equal(choice.textContent,'Fly to '+name);
  choice.send('click');choice.send('click');
  assert.deepEqual(sent,[{type:'rift-fighter-transfer-select',from,to,origin:'https://game.example'}]);
  assert.equal(choice.disabled,true);
 }
 assert.equal(setup({search:'?flight-map=1&from=bifrost'}).el('galaxy-atlas').getAttribute('data-flight-map'),undefined);
 assert.equal(setup({search:'?flight-map=1&from=bifrost&extra=1',parent:{}}).el('galaxy-atlas').getAttribute('data-flight-map'),undefined);
});

test('a stored hull shows its confirmed bay only on the carrier where it is parked',()=>{
 const storage=new Map([['rift-runner.character-generation.v1','pilot-1'],
  ['rift-runner.fighter-parking.v1.rift-fighter',JSON.stringify({version:1,hull:'rift-fighter',generation:'pilot-1',vessel:'bifrost',bay:4,revision:1})]]);
 const q=setup({storage,wallet:{getBuildState:()=>({origin:'legacy'})}});
 q.el('galaxy-locate-bifrost').send('click');
 assert.equal(q.el('location-fighter-parking').hidden,false);
 assert.match(q.el('location-fighter-parking').textContent,/Rift-4 Fighter · Bay 04/);
 assert.equal(q.el('galaxy-fly-to-vessel').hidden,true);
 q.carrier.send('keydown',{key:'Enter'});
 assert.equal(q.el('location-fighter-parking').hidden,true);
 assert.equal(q.el('galaxy-fly-to-vessel').getAttribute('href'),'./index.html?transfer=rift-carrier');
});

test('My fighter opens the parked carrier Deck Map without selecting or flying there first',()=>{
 const writes=new Map([['rift-runner.character-generation.v1','same-pilot'],
  ['rift-runner.fighter-parking.v1.rift-fighter',JSON.stringify({version:1,hull:'rift-fighter',generation:'same-pilot',vessel:'bifrost',bay:2,revision:1})]]);
 const original=[...writes],wallet={getBuildState:()=>({origin:'legacy'})};
 const q=setup({storage:writes,wallet});
 const link=q.el('galaxy-fighter-deck');
 assert.equal(link.hidden,false);
 assert.equal(link.getAttribute('href'),'./carrier.html?vessel=bifrost');
 assert.match(link.getAttribute('aria-label'),/Bifrost · Deck Map/);
 q.carrier.send('keydown',{key:'Enter'});
 assert.equal(q.el('galaxy-visit-vessel').getAttribute('href'),'./carrier.html?vessel=rift-carrier');
 assert.equal(link.getAttribute('href'),'./carrier.html?vessel=bifrost');
 assert.deepEqual([...writes],original,'shortcut neither changes parking nor affiliation');
 const embedded=setup({storage:writes,wallet,parent:{},search:'?flight-map=1&from=bifrost'});
 assert.equal(embedded.el('galaxy-fighter-deck').hidden,true);
 assert.equal(setup().el('galaxy-fighter-deck').hidden,true,'unowned pilot sees no fighter shortcut');
});

test('Blackwake and Bifrost link into the same active Cross Battle with distinct roles',async()=>{
 const stock='rift-fighter',generation='same-pilot',key='rift-runner.fighter-parking.v1.'+stock;
 const parking=vessel=>new Map([['rift-runner.character-generation.v1',generation],
  [key,JSON.stringify({version:1,hull:stock,generation,vessel,bay:4,revision:1})]]);
 const wallet={getBuildState:()=>({origin:'legacy'})};
 const encounter={id:'blackwake',status:'active',sector:'reach',x:365,y:1160,startsAt:Date.now()-1000,endsAt:Date.now()-1000+4*60*60*1000,pirate:{id:'blackwake',name:'Blackwake',x:520,y:1160,heading:270},attacker:{id:'bifrost',name:'Bifrost',x:210,y:1160,heading:90},simulation:'local'};
 const calls=[];
 const fetch=async(url,opts)=>{
  calls.push([url,opts]);return {ok:true,json:async()=>({version:1,encounter,participation:null})};
 };
 const ready=()=>new Promise(resolve=>setImmediate(resolve));
 const storage=parking('rift-carrier'),before=[...storage];
 const q=setup({fetch,wallet,storage});await ready();
 const pirate=q.el('galaxy-pirate').kids[0],action=q.el('galaxy-cross-action');
 const marker=q.el('galaxy-engagement').kids[0],bifrost=q.el('galaxy-bifrost').kids[0];
 assert.deepEqual(q.position(pirate),[520,1160]);assert.deepEqual(q.position(bifrost),[210,1160]);
 assert.deepEqual(q.position(marker),[365,1160]);
 q.step(30);assert.deepEqual(q.position(bifrost),[210,1160],'engaged Bifrost stays fixed even without live patrol feed');
 marker.send('keydown',{key:'Enter'});
 assert.equal(q.el('location-title').textContent,'Cross Battle');
 assert.equal(q.el('galaxy-cross-reinforce').getAttribute('href'),'./index.html?cross-battle=blackwake&join=reinforce&vessel=rift-carrier');
 assert.equal(q.el('galaxy-cross-watch').getAttribute('href'),'./index.html?cross-battle=blackwake&watch=1');
 assert.equal(action.getAttribute('href'),'./index.html?cross-battle=blackwake&join=intercept&vessel=rift-carrier');
 assert.equal(pirate.getAttribute('display'),undefined);
 pirate.send('keydown',{key:'Enter'});
 assert.equal(q.el('location-title').textContent,'Blackwake');
 assert.equal(q.el('galaxy-visit-vessel').hidden,true);
 assert.equal(action.textContent,'Intercept Blackwake');
 assert.equal(action.getAttribute('href'),'./index.html?cross-battle=blackwake&join=intercept&vessel=rift-carrier');
 q.el('galaxy-locate-bifrost').send('click');
 assert.equal(action.textContent,'Reinforce Bifrost');
 assert.equal(action.getAttribute('href'),'./index.html?cross-battle=blackwake&join=reinforce&vessel=rift-carrier');
 assert.equal(q.el('galaxy-visit-vessel').getAttribute('href'),'./carrier.html?vessel=bifrost');
 assert.equal(q.el('galaxy-fly-to-vessel').getAttribute('href'),'./index.html?transfer=bifrost');
 assert.ok(calls.every(([url,opts])=>url!=='/api/encounters/blackwake'||!opts.method&&!opts.headers),'public chart does not post or transmit bearer');
 assert.deepEqual([...storage],before,'chart does not change parking');
 encounter.status='closed';q.step(1000);await ready();
 assert.equal(action.hidden,true);
 assert.equal(pirate.getAttribute('display'),'none');
 encounter.status='active';
 const guest=setup({fetch,wallet,storage:parking('bifrost')});await ready();
 guest.el('galaxy-locate-bifrost').send('click');
 assert.equal(guest.el('galaxy-cross-action').hidden,true,'Bifrost parked hull does not reinforce itself');
 assert.equal(guest.el('galaxy-cross-eligibility').hidden,false);
 assert.match(guest.el('galaxy-cross-eligibility').textContent,/confirmed berth on Pegasus/);
 const finder=guest.el('galaxy-find');
 assert.ok(finder.kids.some(option=>option.value==='blackwake-engagement'&&!option.hidden));
 finder.value='blackwake-engagement';finder.send('change');
 assert.equal(guest.el('galaxy-cross-watch').hidden,false,'spectating requires no eligible berth');
 assert.equal(guest.el('galaxy-cross-action').hidden,true);
 assert.equal(guest.el('galaxy-cross-reinforce').hidden,true);
 const count=calls.filter(([url])=>url==='/api/encounters/blackwake').length;
 setup({fetch,wallet,storage:parking('rift-carrier'),search:'?flight-map=1&from=rift-carrier',parent:{}});await ready();
 assert.equal(calls.filter(([url])=>url==='/api/encounters/blackwake').length,count,'embedded picker remains separate from encounter discovery');
});

test('separate online contact remains discoverable after the old event and routes both sides to one room',async()=>{
 const ready=()=>new Promise(resolve=>setImmediate(resolve));
 const battle={id:'blackwake',mode:'shared',status:'open',sector:'reach',x:700,y:900,joinable:true,sides:['allies','opposition']};
 let scans=0;
 const multiplayer={info:async()=>{scans++;return {version:1,battle};}};
 const q=setup({multiplayer});await ready();
 const marker=q.el('galaxy-online').kids[0],local=q.el('galaxy-engagement').kids[0];
 assert.equal(local.getAttribute('display'),'none','old local encounter is unavailable');
 assert.deepEqual(q.position(marker),[700,900]);
 const finder=q.el('galaxy-find');
 assert.ok(finder.kids.some(option=>option.value==='blackwake-online'&&!option.hidden));
 finder.value='blackwake-online';finder.send('change');
 assert.equal(q.el('location-title').textContent,'Blackwake Online Battle');
 assert.match(q.el('location-description').textContent,/same live room/);
 assert.equal(q.el('galaxy-online-allies').getAttribute('href'),'./index.html?multiplayer=blackwake&side=allies');
 assert.equal(q.el('galaxy-online-opposition').getAttribute('href'),'./index.html?multiplayer=blackwake&side=opposition');
 assert.equal(q.el('galaxy-cross-watch').hidden,true);
 q.carrier.send('keydown',{key:'Enter'});
 assert.equal(q.el('galaxy-online-allies').hidden,true);
 marker.send('keydown',{key:'Enter'});
 battle.sides=['allies'];q.step(770);await ready();
 assert.equal(q.el('galaxy-online-allies').hidden,false);
 assert.equal(q.el('galaxy-online-opposition').hidden,true,'unavailable side never appears');
 battle.joinable=false;q.step(770);await ready();
 assert.equal(q.el('galaxy-online-allies').getAttribute('href'),undefined);
 assert.match(q.el('location-route').textContent,/not taking new pilots/);
 battle.joinable=true;
 const mirror=setup({multiplayer,hostname:'rift-runner.boundlessghost16.chatgpt.site'});await ready();
 mirror.el('galaxy-online').kids[0].send('keydown',{key:'Enter'});
 assert.equal(mirror.el('galaxy-online-allies').getAttribute('href'),'https://rift-runner.gambizt3.workers.dev/index.html?multiplayer=blackwake&side=allies');
 assert.match(mirror.el('location-description').textContent,/Opens in the public game.*confirmed berth/);
 const n=scans;
 setup({multiplayer,parent:{},search:'?flight-map=1&from=rift-carrier'});await ready();
 assert.equal(scans,n);
});

test('Pirate Hideout is a stationary and inspectable when shared battle is unavailable',()=>{
 const q=setup(),hideout=q.pin('pirate-hideout'),finder=q.el('galaxy-find');
 assert.ok(finder.kids.some(option=>option.value==='pirate-hideout'&&option.textContent==='Pirate Hideout'));
 assert.deepEqual(q.position(hideout),[690,1380]);
 assert.deepEqual(q.position(q.pin('pirates')),[365,1160]);
 finder.value='pirate-hideout';finder.send('change');q.step(120);
 assert.deepEqual(q.position(hideout),[690,1380]);
 assert.equal(q.el('location-title').textContent,'Pirate Hideout');
 assert.equal(q.el('location-class').textContent,'Hidden asteroid outpost');
 assert.equal(q.el('location-route').textContent,'Expedition unavailable · You can still inspect the hideout.');
 for(const id of ['galaxy-visit-vessel','galaxy-fly-to-vessel','galaxy-cross-action','galaxy-online-allies','galaxy-online-opposition'])
  assert.equal(q.el(id).hidden,true);
});

test('Pirate Hideout offers the same shared expedition when open and stays inspectable on outage',async()=>{
 const ready=()=>new Promise(resolve=>setImmediate(resolve));
 let available=true;
 const multiplayer={info:async()=>available?{version:1,battle:{id:'blackwake',mode:'shared',status:'open',sector:'reach',x:365,y:1160,joinable:true,sides:['allies','opposition']}}:null};
 const q=setup({multiplayer});
 q.pin('pirate-hideout').send('keydown',{key:'Enter'});
 await ready();
 assert.equal(q.el('location-title').textContent,'Pirate Hideout');
 assert.match(q.el('location-route').textContent,/Expedition open/);
 assert.equal(q.el('galaxy-online-allies').getAttribute('href'),'./index.html?multiplayer=blackwake&side=allies');
 assert.equal(q.el('galaxy-online-opposition').getAttribute('href'),'./index.html?multiplayer=blackwake&side=opposition');
 assert.equal(q.el('galaxy-cross-action').hidden,true);
 available=false;q.step(790);await ready();
 assert.equal(q.el('galaxy-details').hidden,false);
 assert.match(q.el('location-route').textContent,/Expedition unavailable/);
 assert.equal(q.el('galaxy-online-allies').getAttribute('href'),undefined);
 assert.equal(q.el('galaxy-online-opposition').getAttribute('href'),undefined);
});

test('running raid alerts open the home admiral invitation, never auto-join, and can be declined once per round',async()=>{
 const ready=()=>new Promise(resolve=>setImmediate(resolve));
 const round='095b095b-095b-4095-a095-095b095b095b';
 const battle={id:'blackwake',mode:'shared',status:'running',sector:'reach',x:365,y:1160,joinable:true,sides:['allies','opposition'],instance:round};
 const multiplayer={info:async()=>({version:1,battle}),join(){assert.fail('the chart must never join automatically');}};
 for(const [home,name,portrait] of [['rift-carrier','Admiral Bishop','captain-bridge-front'],['bifrost','Admiral Adaline','admiral-adaline']]){
  const storage=new Map([['rift-runner.pilot-profile.v1',JSON.stringify({version:2,companyVesselId:home})]]);
  const session=new Map(),q=setup({multiplayer,storage,session});await ready();
  const alert=q.el('galaxy-battle-alert'),panel=q.el('galaxy-battle-invite');
  assert.equal(alert.hidden,false);
  assert.equal(session.size,0,'receipt of the public alert alone does not acknowledge it');
  alert.send('click');
  assert.equal(panel.hidden,false);assert.equal(alert.hidden,true);
  assert.equal(q.el('galaxy-battle-admiral').textContent,name);
  assert.ok(q.el('galaxy-battle-portrait').getAttribute('src').includes(portrait));
  assert.equal(q.el('galaxy-battle-join').getAttribute('href'),'./index.html?multiplayer=blackwake&side=allies');
  q.el('galaxy-battle-decline').send('click');assert.equal(panel.hidden,true);
  q.step(790);await ready();assert.equal(alert.hidden,true,'polling does not repeat same invitation');
  const reopened=setup({multiplayer,storage,session});await ready();
  assert.equal(reopened.el('galaxy-battle-alert').hidden,true,'reload keeps current round acknowledged');
  assert.equal(storage.size,1,'invitation does not change career or affiliation');
 }
 const session=new Map([['rift-runner.galaxy-invite.blackwake.v1',round]]);
 const q=setup({multiplayer,session});await ready();
 battle.instance='ff0cff0c-ff0c-4ff0-aff0-ff0cff0cff0c';
 q.step(790);await ready();assert.equal(q.el('galaxy-battle-alert').hidden,false,'new round has a fresh invitation');
});

test('NPC-originated shared round marks one X and keeps the same join choices',async()=>{
 const ready=()=>new Promise(resolve=>setImmediate(resolve));
 const battle={id:'blackwake',mode:'shared',status:'running',sector:'reach',x:365,y:1160,joinable:true,sides:['allies','opposition'],autonomous:true,
  instance:'11111111-1111-4111-a111-111111111111'};
 const q=setup({multiplayer:{info:async()=>({version:1,battle})}});await ready();
 const marker=q.el('galaxy-online').kids[0];
 assert.equal(q.el('galaxy-online').kids.length,1);
 assert.equal(marker.getAttribute('data-autonomous'),'true');
 assert.equal(marker.kids[0].kids[2].getAttribute('d'),'M-6-6 6 6 M6-6-6 6');
 marker.send('keydown',{key:'Enter'});
 assert.match(q.el('location-description').textContent,/NPC crews are already fighting/);
 assert.equal(q.el('galaxy-online-allies').getAttribute('href'),'./index.html?multiplayer=blackwake&side=allies');
 assert.equal(q.el('galaxy-online-opposition').getAttribute('href'),'./index.html?multiplayer=blackwake&side=opposition');
 assert.equal(q.el('galaxy-battle-alert').hidden,false);
 battle.status='complete';battle.joinable=false;
 q.step(790);await ready();
 assert.equal(marker.getAttribute('data-autonomous'),'false','X ends with the active autonomous round');
 assert.equal(q.el('galaxy-online-allies').hidden,true);
 assert.equal(q.el('galaxy-battle-alert').hidden,true);
});

test('Armada power uses token-free scoped stats, never mixes delayed vessels, and hides for other contacts',async()=>{
 const pending=new Map(),requests=[];
 const fetch=(url,options)=>{
  if(!url.endsWith('/stats'))return Promise.resolve({ok:false});
  requests.push([url,options]);
  return new Promise(resolve=>pending.set(url.split('/').at(-2),resolve));
 };
 const flush=()=>new Promise(resolve=>setImmediate(resolve));
 const command=id=>({id,name:id,vesselClass:'Carrier',role:'command',forward:0,lateral:0});
 const escort={id:'pegasus-corvette-escort',name:'Corvette Escort',vesselClass:'Corvette',role:'escort',forward:-55,lateral:42};
 const respond=(id,list)=>pending.get(id)({ok:true,json:async()=>({version:1,vesselId:id,availableShips:20,availablePilots:2,manpower:40,armada:{vesselCount:list.length,vessels:list}})});
 const q=setup({fetch,hostname:'rift-runner.boundlessghost16.chatgpt.site'});
 const starFor=pin=>pin.kids.find(k=>k.getAttribute('class')==='armada-star');
 const pegasusStar=starFor(q.carrier),bifrostStar=starFor(q.el('galaxy-bifrost').kids[0]);
 assert.equal(pegasusStar.getAttribute('display'),'none','unknown formation shows no star');
 assert.equal(bifrostStar.getAttribute('display'),'none');
 assert.equal(requests.length,2,'each formation is loaded once at startup');
 q.carrier.send('keydown',{key:'Enter'});
 assert.equal(q.el('location-manpower-score').textContent,'Loading…');
 q.el('galaxy-locate-bifrost').send('click');
 respond('bifrost',[command('bifrost')]);await flush();
 assert.equal(q.el('location-manpower-score').textContent,'1');
 assert.match(q.el('location-manpower-factors').textContent,/1 command carrier \+ 0 escorts/);
 respond('rift-carrier',[command('rift-carrier'),escort]);await flush();
 assert.equal(q.el('location-manpower-score').textContent,'1','late Pegasus response does not overwrite Bifrost');
 assert.equal(pegasusStar.getAttribute('display'),undefined,'confirmed multi-vessel formation has one star before selection');
 assert.match(q.carrier.getAttribute('aria-label'),/Armada of 2 vessels/);
 assert.equal(pegasusStar.kids.length,1);
 assert.match(pegasusStar.getAttribute('transform'),/^translate\(0 -/);
 assert.equal(pegasusStar.getAttribute('pointer-events'),'none');
 assert.equal(bifrostStar.getAttribute('display'),'none','single command vessel has no star');
 q.carrier.send('keydown',{key:'Enter'});assert.equal(q.el('location-manpower-score').textContent,'2');
 assert.match(q.el('location-manpower-factors').textContent,/1 command carrier \+ 1 escort \(Corvette Escort · Corvette\)/);
 assert.equal(q.el('galaxy-carrier').kids.length,1,'Pegasus formation has one visible map marker');
 assert.equal(q.el('galaxy-bifrost').kids.length,1,'Bifrost keeps its own independent command marker');
 assert.doesNotMatch(read('galaxy-map.html'),/galaxy-armada-escorts/);
 q.step(150);
 assert.equal(requests.length,2);
 for(const [url,options] of requests){assert.match(url,/^https:\/\/rift-runner\.gambizt3\.workers\.dev\/api\/multicrew\/vessels\//);assert.equal(options.credentials,'omit');assert.equal(options.headers,undefined);}
 q.pin('pirate-hideout').send('keydown',{key:'Enter'});assert.equal(q.el('location-manpower').hidden,true);
 const unavailable=setup({fetch:async()=>({ok:false})});unavailable.carrier.send('keydown',{key:'Enter'});await flush();
 assert.equal(unavailable.el('location-manpower-score').textContent,'Unavailable');
});

test('Armada renders one centered gold star for every ship beyond the lead carrier',async()=>{
 const command={id:'rift-carrier',name:'Pegasus',vesselClass:'Carrier',role:'command',forward:0,lateral:0};
 const vessels=[command,...[1,2,3].map(i=>({id:'escort-'+i,name:'Corvette '+i,vesselClass:'Corvette',role:'escort',forward:-55,lateral:42*i}))];
 const fetch=async url=>url.endsWith('/rift-carrier/stats')?
  {ok:true,json:async()=>({version:1,vesselId:command.id,armada:{vesselCount:4,vessels}})}:{ok:false};
 const q=setup({fetch});await new Promise(resolve=>setImmediate(resolve));
 const stars=q.carrier.kids.find(k=>k.getAttribute('class')==='armada-star');
 assert.equal(q.el('galaxy-carrier').kids.length,1);
 assert.equal(stars.kids.length,3);
 assert.deepEqual(stars.kids.map(k=>k.getAttribute('transform')),['translate(-15 0)','translate(0 0)','translate(15 0)']);
 assert.ok(stars.kids.every(k=>k.getAttribute('fill')==='#ffdb6c'));
 assert.match(q.carrier.getAttribute('aria-label'),/Armada of 4 vessels/);
});
