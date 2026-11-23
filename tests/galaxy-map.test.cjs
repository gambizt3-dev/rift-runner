'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const dist=['../dist','..'].map(d=>path.join(__dirname,d)).find(d=>fs.existsSync(path.join(d,'galaxy-map.js')));
const read=f=>fs.readFileSync(path.join(dist,f),'utf8');
function setup(){
 const ids=new Map(),events=new Map(),rect={width:390,height:430};
 function node(tag){
  const kids=[],attrs=new Map(),listeners=new Map(),style=new Map(),classes=new Set();
  return {tag,kids,attrs,listeners,style:{setProperty:(a,b)=>style.set(a,b),getPropertyValue:a=>style.get(a)},classList:{add:a=>classes.add(a),remove:a=>classes.delete(a)},
   append:n=>kids.push(n),replaceChildren:()=>{kids.length=0;},setAttribute:(a,b)=>attrs.set(a,String(b)),removeAttribute:a=>attrs.delete(a),
   addEventListener:(a,b)=>listeners.set(a,b),getBoundingClientRect:()=>rect,setPointerCapture(){},focus(){this.focused=true;},
   dispatch(type,payload={}){const event={type,timeStamp:100,preventDefault(){this.defaultPrevented=true;},...payload};listeners.get(type)?.(event);return event;}
  };
 }
 const el=id=>{if(!ids.has(id))ids.set(id,node(id));return ids.get(id);};
 const images=[],img=function(){images.push(this);};
 const context={document:{getElementById:el,createElement:node,createElementNS:(ns,t)=>node(t)},
  window:{Image:img,addEventListener:(a,b)=>events.set(a,b)}};
 vm.runInNewContext(read('galaxy-map.js'),context);
 return {el,events,images,rect,shape:()=>el('galaxy-chart').attrs.get('viewBox').split(' ').map(Number),
  worlds:()=>el('galaxy-targets').kids[0]?.kids??[]};
}

test('Carrier links to a standalone same-origin Galaxy Map, not to an arena or a flight action',()=>{
 const html=read('galaxy-map.html');
 assert.match(read('carrier.html'),/id="carrier-galaxy-map" href="\.\/galaxy-map\.html">Galaxy Map/);
 assert.match(html,/class="control back" href="\.\/carrier\.html"/);
 assert.match(html,/\bviewport-fit=cover/);assert.match(html,/id="galaxy-chart"[^>]*tabindex="0"/);
 assert.match(html,/galaxy-atlas\.webp/);assert.doesNotMatch(html,/\bfire-button\b|\bgame\.js\b|launch=/);
 assert.match(read('galaxy-map.css'),/\.viewport\{[^}]+touch-action:none/);
});

test('the only ship is the existing mini Carrier; planet selection plots a route preview with no travel or writes',()=>{
 const q=setup(),find=q.el('galaxy-find'),worlds=q.worlds();
 assert.equal(worlds.length,17);assert.equal(find.kids.length,17);
 assert.equal(worlds[0].attrs.get('aria-label'),'Your carrier');
 assert.equal(worlds[0].kids.find(n=>n.tag==='image').attrs.get('href'),'./carrier-capital.webp?v=133');
 assert.equal(worlds.slice(1).filter(w=>w.kids.some(n=>n.tag==='image')).length,0);
 const route=q.el('galaxy-route');
 assert.equal(route.attrs.get('display'),'none');
 worlds[1].dispatch('click');
 assert.equal(q.el('location-title').textContent,'Serein');
 assert.equal(route.attrs.get('display'),undefined);assert.equal(route.attrs.get('d'),'M571 475L299 277');
 assert.match(q.el('location-route').textContent,/Course preview/);
 assert.equal(worlds[1].attrs.get('aria-pressed'),'true');
 assert.equal(q.el('location-portrait').hidden,true);
 q.images[0].onload();assert.equal(q.el('location-portrait').hidden,false);
 assert.equal(q.el('location-portrait').style.getPropertyValue('--portrait-x'),'0%');
 const select=q.el('galaxy-find');select.value='kel';select.dispatch('change');
 assert.equal(q.el('location-title').textContent,'Kel');assert.ok(q.shape()[0]>1500);
 const hit=Number(worlds.at(-2).kids[0].attrs.get('r'));assert.ok(hit*2*q.rect.width/q.shape()[2]>=43.9,'touch hit diameter is at least 44 CSS pixels');
});

test('east gate physically links a populated tile to a truly empty neighbor; west returns at the facing edge',()=>{
 const q=setup(),east=q.el('galaxy-east'),west=q.el('galaxy-west'),route=q.el('galaxy-route');
 q.worlds()[2].dispatch('click');
 assert.equal(east.hidden,false);assert.equal(west.hidden,true);
 east.dispatch('click');
 assert.equal(q.el('galaxy-sector-title').textContent,'Uncharted Frontier');
 assert.equal(q.el('galaxy-targets').kids[0].attrs.get('display'),'none');
 assert.equal(q.el('galaxy-targets').kids[1].kids.length,0);
 assert.equal(q.el('galaxy-atlas-art').attrs.get('display'),'none');
 assert.equal(q.el('galaxy-find').disabled,true);assert.equal(q.el('galaxy-find').kids.length,0);
 assert.equal(route.attrs.get('display'),'none');assert.ok(Math.abs(q.shape()[0])<.01);
 assert.equal(east.hidden,true);assert.equal(west.hidden,false);
 west.dispatch('click');
 assert.equal(q.el('galaxy-sector-title').textContent,'The Outer Reach');
 assert.ok(q.shape()[0]>1000);assert.equal(q.worlds()[2].attrs.get('aria-pressed'),'false');
 assert.equal(q.worlds()[0].attrs.get('aria-pressed'),'true');
 q.el('galaxy-center').dispatch('click');assert.ok(q.shape()[0]<1000);
});

test('only a deliberate released edge pan crosses; cancelled/vertical drags and zoom do not change sectors',()=>{
 const q=setup(),finder=q.el('galaxy-find'),chart=q.el('galaxy-chart'),rect=q.rect;
 const down=(id=1)=>chart.dispatch('pointerdown',{button:0,pointerId:id,clientX:190,clientY:200});
 const move=(x,y,id=1)=>chart.dispatch('pointermove',{pointerId:id,clientX:x,clientY:y});
 const release=(type,id=1)=>q.events.get(type)({type,pointerId:id,timeStamp:160});
 finder.value='kel';finder.dispatch('change');
 down();move(20,205);release('pointercancel');
 assert.equal(q.el('galaxy-sector-title').textContent,'The Outer Reach');
 down();move(20,395);release('pointerup');
 assert.equal(q.el('galaxy-sector-title').textContent,'The Outer Reach');
 Object.assign(rect,{width:420,height:445});q.events.get('resize')();
 q.el('galaxy-plus').dispatch('click');assert.equal(q.el('galaxy-sector-title').textContent,'The Outer Reach');
 finder.dispatch('change');
 down();move(10,205,2);release('pointerup',2);
 assert.equal(q.el('galaxy-sector-title').textContent,'The Outer Reach');
 move(10,205);release('pointerup');
 assert.equal(q.el('galaxy-sector-title').textContent,'Uncharted Frontier');
 down();move(365,205);release('pointerup');
 assert.equal(q.el('galaxy-sector-title').textContent,'The Outer Reach');
});
