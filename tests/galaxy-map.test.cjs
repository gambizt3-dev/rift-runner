'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const dist=['../dist','..'].map(d=>path.join(__dirname,d)).find(d=>fs.existsSync(path.join(d,'galaxy-map.js')));
const read=f=>fs.readFileSync(path.join(dist,f),'utf8');
function setup(){
 const ids=new Map(),events=new Map(),rect={width:390,height:430,left:12,top:66};
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
 let clock=100,raf=null;
 const context={document:{getElementById:el,createElement:node,createElementNS:(ns,t)=>node(t)},
  window:{Image:img,addEventListener:(a,b)=>events.set(a,b),requestAnimationFrame(fn){raf=fn;return 1;}}};
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
  flying:()=>!!raf
 };
}
const near=(a,b,tol=.05)=>assert.ok(Math.abs(a-b)<tol,`${a} vs ${b}`);
test('standalone Galaxy Map keeps planet inspection, real carrier art and open space with no fixed lines',()=>{
 const html=read('galaxy-map.html'),q=setup();
 assert.match(read('carrier.html'),/id="carrier-galaxy-map" href="\.\/galaxy-map\.html">Galaxy Map/);
 assert.match(html,/class="control back" href="\.\/carrier\.html"/);
 assert.doesNotMatch(html,/class="atlas-head"|class="chart-cap"|Rift Runner <span> \/ <\/span> Navigation/,'the map has no visible title or tile header');
 assert.match(html,/<h1 class="atlas-sr-only" id="galaxy-title">Galaxy Map<\/h1>/);
 assert.match(html,/viewport-fit=cover/);assert.match(html,/galaxy-map.js\?v=155/);
 assert.doesNotMatch(html,/\bfire-button\b|\bgame\.js\b|galaxy-route|class="lanes"/);
 assert.match(read('galaxy-map.css'),/\.viewport\{[^}]+touch-action:none/);
 assert.equal(q.el('galaxy-find').kids.length,18,'16 planets, the signal and the Carrier');
 assert.equal(q.carrier.attrs.get('aria-label'),'Your carrier');
 assert.equal(q.carrier.kids.find(n=>n.attrs.get('class')==='carrier-art-pin').kids.find(n=>n.tag==='image').attrs.get('href'),'./carrier-capital.webp?v=133');
 const before=q.position(q.carrier);
 q.tap(175,191,q.pin('serein'));
 assert.equal(q.el('location-title').textContent,'Serein');
 assert.equal(q.pin('serein').attrs.get('aria-pressed'),'true');
 assert.deepEqual(q.position(q.carrier),before);assert.equal(q.flying(),false);
 q.images[0].onload();assert.equal(q.el('location-portrait').hidden,false);
 const [x,y]=q.position(q.pin('pirates'));
 assert.ok(x<430&&y>1050&&x>100&&y<1650,'signal fills the lower-left gap without hugging the edge');
 assert.ok(q.position(q.pin('marrow'))[0]-q.position(q.pin('serein'))[0]>460,'formerly clustered planets spread further apart');
});
test('Fly animates the Carrier toward arbitrary tapped space, not an inspection target or a line',()=>{
 const q=setup(),before=q.position(q.carrier),point=q.point(304,319);
 q.el('galaxy-fly').send('click');assert.equal(q.el('galaxy-fly').attrs.get('aria-pressed'),'true');
 q.tap(304,319);assert.equal(q.flying(),true);assert.equal(q.el('location-route').textContent,'Autopilot underway.');q.step(3);assert.notDeepEqual(q.position(q.carrier),before);
 q.step(440);const pos=q.position(q.carrier);near(pos[0],point[0]);near(pos[1],point[1]);
 assert.equal(q.flying(),false);
 assert.equal(q.el('location-route').textContent,'Carrier arrived.');
});
test('pinch anchors the midpoint, hands off to one-finger drag without jump, and never launches with a phantom tap',()=>{
 const q=setup();q.el('galaxy-fly').send('click');
 const initial=q.shape(),before=q.point(205,235);
 q.down(140,235,1);q.down(270,235,2);
 q.next('pointermove',95,240,1);q.next('pointermove',335,240,2);
 assert.ok(q.shape()[2]<initial[2]*.66);
 const after=q.point(215,240);near(after[0],before[0]);near(after[1],before[1]);
 const stable=q.shape();q.next('pointerup',335,240,2);assert.deepEqual(q.shape(),stable);
 q.next('pointermove',120,255,1);assert.notDeepEqual(q.shape(),stable);
 q.next('pointerup',120,255,1);
 assert.equal(q.flying(),false);
 q.down(160,180,1);q.next('pointermove',205,210,1);q.next('pointercancel',205,210,1);
 assert.equal(q.flying(),false);
 q.tap(210,160);assert.equal(q.flying(),true,'fresh tap remains armed after pinch and cancellation');
});
test('Corsair Cluster needs actual arrival and an explicit survey before revealing what is inside',()=>{
 const q=setup(),finder=q.el('galaxy-find'),button=q.el('galaxy-explore');
 finder.value='pirates';finder.send('change');
 assert.equal(q.el('location-title').textContent,'Corsair Cluster');
 assert.equal(button.textContent,'Fly to signal');assert.doesNotMatch(q.el('location-description').textContent,/Blackwake/);
 button.send('click');assert.equal(button.disabled,true);
 q.step(680);assert.equal(button.textContent,'Explore signal');
 assert.doesNotMatch(q.el('location-description').textContent,/Blackwake/);
 button.send('click');assert.match(q.el('location-description').textContent,/Blackwake/);
 assert.equal(button.hidden,true);
});
test('adjacent gates carry the only ship into an empty tile and back; map pans alone do not move it',()=>{
 const q=setup(),east=q.el('galaxy-east'),west=q.el('galaxy-west');
 const before=q.position(q.carrier);
 q.el('galaxy-find').value='kel';q.el('galaxy-find').send('change');
 q.down(165,210);q.next('pointermove',5,210);q.next('pointerup',5,210);
 assert.equal(q.flying(),false);assert.deepEqual(q.position(q.carrier),before);
 assert.equal(east.hidden,false);east.send('click');
 assert.match(q.el('galaxy-sector-title').textContent,/Outer Reach/);
 q.step(1650);
 assert.equal(q.el('galaxy-sector-title').textContent,'Uncharted Frontier');
 assert.equal(q.el('galaxy-targets').kids[0].attrs.get('display'),'none');
 assert.equal(q.el('galaxy-targets').kids[1].kids.length,0);
 assert.equal(q.el('galaxy-find').kids.length,1);assert.equal(east.hidden,true);assert.equal(west.hidden,false);
 near(q.position(q.carrier)[0],35);
 west.send('click');q.step(300);
 assert.equal(q.el('galaxy-sector-title').textContent,'The Outer Reach');
 near(q.position(q.carrier)[0],2750-35);
 assert.equal(q.pin('kel').attrs.get('aria-pressed'),'false');
});

test('deliberate Fly-mode drag across a real world edge travels; a pinch handoff never does',()=>{
 const q=setup(),finder=q.el('galaxy-find');
 q.el('galaxy-fly').send('click');
 finder.value='kel';finder.send('change');
 q.down(220,220);q.down(280,220,2);q.next('pointermove',360,220,2);
 q.next('pointerup',360,220,2);q.next('pointermove',25,220);q.next('pointerup',25,220);
 assert.equal(q.flying(),false,'remaining pinch finger cannot launch or cross a gate');
 finder.send('change');
 q.down(379,220);q.next('pointermove',12,220);q.next('pointerup',12,220);
 assert.equal(q.flying(),true);
 q.step(1650);assert.equal(q.el('galaxy-sector-title').textContent,'Uncharted Frontier');
});
