'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const dist=['../dist','..'].map(d=>path.join(__dirname,d)).find(d=>fs.existsSync(path.join(d,'galaxy-map.js')));
const read=f=>fs.readFileSync(path.join(dist,f),'utf8');
function setup({seed=13,reduced=false,width=390,height=780,briefings=()=>[]}={}){
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
 const images=[],img=function(){images.push(this);};
 let clock=100,raf=null,rng=seed;
 const math=Object.create(Math);math.random=()=>((rng=(Math.imul(rng,1664525)+1013904223)>>>0)/4294967296);
 const context={Math:math,document:{hidden:false,getElementById:el,createElement:node,createElementNS:(ns,t)=>node(t)},
  window:{Image:img,RiftMissions:{getNewBriefings:briefings},matchMedia:()=>({matches:reduced}),addEventListener:(a,b)=>events.set(a,b),requestAnimationFrame(fn){raf=fn;return 1;}}};
 vm.runInNewContext(read('galaxy-map.js'),context);
 const chart=el('galaxy-chart');
 const shape=()=>chart.attrs.get('viewBox').split(' ').map(Number);
 const pin=(id)=>el('galaxy-targets').kids[0].kids.find(n=>n.attrs.get('data-location')===id);
 const position=g=>g.attrs.get('transform').match(/^translate\(([-\d.]+) ([-\d.]+)\)$/).slice(1).map(Number);
 const carrier=el('galaxy-carrier').kids[0];
 const point=(x,y)=>{const [u,v,w,h]=shape();return [u+(x-rect.left)*w/rect.width,v+(y-rect.top)*h/rect.height];};
 const down=(x,y,pointerId=1,target=chart)=>chart.send('pointerdown',{button:0,pointerId,clientX:x,clientY:y,target});
 const next=(type,x,y,pointerId=1)=>events.get(type)({type,pointerId,clientX:x,clientY:y});
 return {el,events,images,rect,shape,pin,position,carrier,point,down,next,
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
 assert.match(html,/viewport-fit=cover/);assert.match(html,/galaxy-map.js\?v=159/);
 assert.doesNotMatch(html,/\bfire-button\b|\bgame\.js\b|galaxy-route|class="lanes"|galaxy-fly|galaxy-explore|galaxy-(east|west)/);
 assert.match(read('galaxy-map.css'),/\.viewport\{[^}]+touch-action:none/);
 assert.equal(q.el('galaxy-find').kids.length,18,'16 planets, the signal and the Carrier');
 assert.equal(q.carrier.attrs.get('aria-label'),'Your carrier');
 assert.equal(q.carrier.kids.find(n=>n.attrs.get('class')==='carrier-art-pin').kids.find(n=>n.tag==='use').attrs.get('href'),'#carrier-map-mark');
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

test('the crew picks different destinations, cruises at 122/s and holds without guest input',()=>{
 const a=setup({seed:13}),b=setup({seed:1721});
 const first=a.position(a.carrier);
 a.step(40);assert.deepEqual(a.position(a.carrier),first,'brief departure hold');
 a.step(26);b.step(66);
 const next=a.position(a.carrier);assert.notDeepEqual(next,first);
 assert.notDeepEqual(next,b.position(b.carrier),'different random crew courses');
 assert.ok(Math.hypot(...next.map((p,i)=>p-first[i]))<15,'first motion eases up from rest');
 let held=0,prev=a.position(a.carrier),top=0,nearStop=false,prevMotion=Infinity;
 for(let i=0;i<1000;i++){
  a.step();const pos=a.position(a.carrier),distance=Math.hypot(...pos.map((p,i)=>p-prev[i]));
  top=Math.max(top,distance/.016);
  if(distance===0)held++;
  if(held>=20){nearStop=prevMotion<.60;break;}
  if(distance>0)prevMotion=distance;
  prev=pos;
 }
 assert.ok(top>121&&top<123,'motion reaches but does not exceed cruise');
 assert.ok(held>=20&&nearStop,'carrier brakes to a real inter-leg pause');
 const parked=a.position(a.carrier);a.hide(true);a.step(180);assert.deepEqual(a.position(a.carrier),parked);
 a.hide(false);a.step(180);assert.notDeepEqual(a.position(a.carrier),parked);
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
 assert.equal(q.carrier.attrs.get('aria-label'),'Your carrier');
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

test('camera starts following and can detach, while Reduced Motion starts stationary',()=>{
 const q=setup({height:430}),reduced=setup({reduced:true,height:430}),initial=q.shape(),still=reduced.shape(),start=reduced.position(reduced.carrier);
 q.step(240);reduced.step(240);
 assert.notDeepEqual(q.shape(),initial);
 assert.deepEqual(reduced.shape(),still);assert.notDeepEqual(reduced.position(reduced.carrier),start);
 q.down(285,420);q.next('pointermove',205,462);q.next('pointerup',205,462);
 const browse=q.shape();q.step(135);assert.deepEqual(q.shape(),browse);
 q.el('galaxy-center').send('click');const follow=q.shape();q.step(220);assert.notDeepEqual(q.shape(),follow);
});

test('Corsair inspection is read-only; a crew close pass records the survey for later in this session',()=>{
 for(const seed of [13,321,424242]){
  const q=setup({seed}),finder=q.el('galaxy-find');
  finder.value='pirates';finder.send('change');
  assert.equal(q.el('location-title').textContent,'Corsair Cluster');
  assert.doesNotMatch(q.el('location-description').textContent,/Blackwake/);
  q.step(1250);
  assert.match(q.el('location-description').textContent,/Blackwake/);
  assert.equal(q.pin('pirates').attrs.has('data-surveyed'),true);
  q.tap(160,191,q.pin('marrow'));assert.doesNotMatch(q.el('location-description').textContent,/Blackwake/);
  q.tap(160,191,q.pin('pirates'));assert.match(q.el('location-description').textContent,/Blackwake/);
 }
});

test('the same sole carrier independently crosses to the empty neighboring tile and back',()=>{
 const q=setup(),sector=()=>q.el('galaxy-sector-title').textContent;
 const seek=target=>{for(let i=0;i<7000&&sector()!==target;i++)q.step();assert.equal(sector(),target);};
 seek('Uncharted Frontier');
 assert.equal(q.el('galaxy-targets').kids[0].attrs.get('display'),'none');
 assert.equal(q.el('galaxy-targets').kids[1].kids.length,0);
 assert.equal(q.el('galaxy-find').kids.length,1);
 assert.equal(q.el('galaxy-carrier').kids.length,1);near(q.position(q.carrier)[0],35);
 seek('The Outer Reach');near(q.position(q.carrier)[0],2715);
 assert.equal(q.el('galaxy-find').kids.length,18);
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

test('wide portrait browsing extends into the north and south fog without moving chart contacts',()=>{
 const q=setup(),chart=q.el('galaxy-chart');
 assert.match(read('galaxy-map.html'),/id="galaxy-fog" aria-hidden="true" pointer-events="none"/);
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
 assert.ok(Number(q.el('carrier-strip-speed').textContent)>0&&Number(q.el('carrier-strip-speed').textContent)<=122);
 assert.equal(q.el('galaxy-details').hidden,true);
});

test('Captain alert opens the Bridge only for currently available new briefings',()=>{
 let fresh=[];const q=setup({briefings:()=>fresh}),alert=q.el('galaxy-captain-alert');
 assert.equal(alert.hidden,true);
 assert.match(read('galaxy-map.html'),/id="galaxy-captain-alert" href="\.\/carrier-bridge\.html" hidden/);
 assert.match(read('galaxy-map.html'),/pilot-credits\.js\?v=159" data-read-only/);
 fresh=[{id:'wingman',title:'Wingman Qualification'}];q.events.get('storage')();
 assert.equal(alert.hidden,false);assert.match(alert.attrs.get('aria-label'),/Wingman Qualification/);
 fresh=[];q.events.get('pageshow')();assert.equal(alert.hidden,true);assert.equal(alert.attrs.has('aria-label'),false);
});
