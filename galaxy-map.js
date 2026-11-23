'use strict';
(() => {
 const get=id=>document.getElementById(id);
 const chart=get('galaxy-chart'),view=get('galaxy-viewport'),markers=get('galaxy-targets'),sky=get('galaxy-stars');
 const finder=get('galaxy-find'),label=get('location-title'),kind=get('location-class'),sector=get('location-sector');
 const description=get('location-description'),status=get('location-route'),portrait=get('location-portrait');
 const plus=get('galaxy-plus'),minus=get('galaxy-minus'),center=get('galaxy-center');
 const flyButton=get('galaxy-fly'),hint=get('galaxy-hint'),explore=get('galaxy-explore');
 const gate={west:get('galaxy-west'),east:get('galaxy-east')};
 if(!chart||!view||!markers||!finder)return;
 const ns='http://www.w3.org/2000/svg',worldW=2750,worldH=1810,cruise=122;
 const data=[
  ['home','Rift Carrier','Carrier position','E–04',571,475,null,'Your squadron’s home berth in the Outer Reach.'],
  ['serein','Serein','Ocean planet','C–02',299,277,'ocean','Temperate seas surround a broken chain of emerald islands.'],
  ['talven','Talven','Rocky planet','D–03',427,399,'rust','Rust-colored uplands and long canyons mark this rocky world.'],
  ['marrow','Marrow','Ringed giant','F–03',721,362,'rings','Broad amber rings surround a banded gas giant.'],
  ['nacre','Nacre','Ice planet','H–02',920,235,'ice','Glacial shelves glow pale blue over an icebound surface.'],
  ['sable','Sable','Storm world','I–04',1050,525,'violet','Violet clouds hide the surface beneath restless storms.'],
  ['caldera','Caldera','Volcanic planet','G–05',821,621,'lava','A dark crust splits into glowing rivers of stone.'],
  ['brine','Brine','Ocean planet','C–06',359,643,'ocean','Shallow turquoise water covers most of this quiet world.'],
  ['tallow','Tallow','Rocky planet','K–03',1305,342,'rust','Broad rust plains and steep crater walls dominate the horizon.'],
  ['vesper','Vesper','Ringed giant','N–02',1635,296,'rings','One narrow arc of warm rings catches light from the sector’s edge.'],
  ['morren','Morren','Ice planet','M–06',1440,753,'ice','A remote, blue-white world with long glacial fissures.'],
  ['hearth','Hearth','Volcanic planet','I–09',1040,1030,'lava','Crimson seams trace the breaks in weathered volcanic rock.'],
  ['iren','Iren','Ocean planet','M–10',1440,1199,'ocean','Wide ocean basins echo the deep teal of the neighboring stars.'],
  ['hollow','Hollow','Rocky planet','O–09',1750,1070,'rust','A plain of low craters ends in a broken grey escarpment.'],
  ['nyx','Nyx','Storm world','Q–05',1960,621,'violet','Purple storms band the dayside of this distant world.'],
  ['kel','Kel','Ice planet','S–03',2225,394,'ice','The eastern edge of the chart holds this pale frozen planet.'],
  ['crook','Crook','Ringed giant','R–11',2080,1260,'rings','A gold-rimmed giant at the southern limit of the mapped Reach.']
 ].map(([id,name,type,code,x,y,art,copy])=>({id,name,type,code,x:Math.round(620+(x-620)*1.16),y:Math.round(469+(y-469)*1.13),art,copy}));
 data.push({id:'pirates',name:'Corsair Cluster',type:'Pirate signal',code:'C–10',x:365,y:1160,poi:true,
  copy:'An intermittent signal flickers among a cluster of derelicts. Fly closer to see what is there.',
  survey:'Survey complete: The derelicts conceal an abandoned pirate relay. A cold beacon still repeats the old call sign: Blackwake.'});
 // Adjacent chart tiles share one renderer. Blank neighbors have no destinations.
 const tiles={
  reach:{name:'The Outer Reach',col:0,row:0,worlds:data,links:{east:'frontier'},defaultWorld:'home',origin:[620,469]},
  frontier:{name:'Uncharted Frontier',col:1,row:0,worlds:[],links:{west:'reach'},defaultWorld:null,origin:[620,800]}
 };
 const home=data[0],pinsByTile=new Map(),find=(id)=>tile().worlds.find(w=>w.id===id);
 let tileId='reach',chosen=null,cameraX=620,cameraY=469,width=1,height=1,base=1,scale=1;
 let fly=false,follow=false,travel=null,frame=0,last=0,gesture=null;
 const pointers=new Map(),surveyed=new Set(),ship={x:home.x,y:home.y,aim:0};
 const tile=()=>tiles[tileId],clamp=(n,a,b)=>Math.min(b,Math.max(a,n));
 const frames={ocean:[0,0],lava:[50,0],rings:[100,0],ice:[0,100],violet:[50,100],rust:[100,100]};
 const make=(tag,attrs,parent)=>{const el=document.createElementNS(ns,tag);for(const [k,v] of Object.entries(attrs))el.setAttribute(k,v);parent.append(el);return el;};
 let rng=47;const random=()=>((rng=(Math.imul(rng,1664525)+1013904223)>>>0)/4294967296);
 for(let i=0;i<315;i++)make('circle',{cx:Math.round(random()*worldW),cy:Math.round(random()*worldH),r:i%23===0?1.9:i%4===0?1.12:.62,fill:i%12===0?'#87fef2':i%9===0?'#b49df9':'#e0e9ff',opacity:(.18+random()*.55).toFixed(2)},sky);
 const cap=make('g',{class:'carrier-pin target','data-carrier':'','data-location':'home',tabindex:0,role:'button','aria-label':'Your carrier'},get('galaxy-carrier'));
 const capHit=make('circle',{class:'world-hit',r:38},cap);
 make('circle',{class:'world-orbit',r:30},cap);
 const carrierArt=make('g',{class:'carrier-art-pin','pointer-events':'none'},cap);
 const hull=make('image',{href:'./carrier-capital.webp?v=133',x:-21,y:-32,width:42,height:64},carrierArt);
 make('text',{class:'target-name',y:49},carrierArt).textContent='Your carrier';
 function activatePin(pin,id){
  pin.addEventListener('click',e=>{if(e.detail===0&&pointers.size===0)pick(id,true);});
  pin.addEventListener('keydown',e=>{
   if(!e.repeat&&(e.key==='Enter'||e.key===' ')){e.preventDefault();fly&&id!=='home'?flyTo(find(id)):pick(id,true);}
  });
 }
 activatePin(cap,'home');
 for(const [id,record] of Object.entries(tiles)){
  const group=make('g',{'data-tile':id},markers),pin=new Map();
  pinsByTile.set(id,{group,pin});
  for(const w of record.worlds){
   if(w===home)continue;
   const g=make('g',{class:'target'+(w.poi?' signal':''),'data-location':w.id,tabindex:0,role:'button','aria-label':w.name+', '+w.type,'aria-pressed':'false',transform:'translate('+w.x+' '+w.y+')'},group);
   const hit=make('circle',{class:'world-hit',r:34},g);
   make('circle',{class:'world-orbit',r:28},g);
   if(w.poi){
    make('path',{d:'M0-23 24 0 0 23-24 0Z',fill:'#492d4d',stroke:'#f2b095','stroke-width':2},g);
    make('path',{d:'M-14 7l5-10 8-4 6 5 7-3 3 10-10 5zM-4-1l4 5 4-1',fill:'#a56275',stroke:'#ffb995','stroke-width':1.2},g);
    make('circle',{cx:9,cy:-12,r:2.5,fill:'#ffbd88'},g);
   }else make('use',{href:'#'+w.art,x:-30,y:-27,width:60,height:54,'pointer-events':'none'},g);
   make('text',{class:'target-name',y:47},g).textContent=w.name;
   pin.set(w.id,{g,hit});activatePin(g,w.id);
  }
 }
 let loaded=false;
 if(typeof window.Image==='function'){
  const image=new window.Image();image.onload=()=>{loaded=true;showPortrait(find(chosen));};image.src='./galaxy-planets.webp';
 }
 function showPortrait(w){
  portrait.hidden=!loaded||!w?.art;
  if(!portrait.hidden){const [x,y]=frames[w.art];portrait.style.setProperty('--portrait-x',x+'%');portrait.style.setProperty('--portrait-y',y+'%');}
 }
 function available(w){return !!w?.poi&&!travel&&Math.hypot(ship.x-w.x,ship.y-w.y)<=45;}
 function updateDetail(){
  const w=find(chosen),scanned=surveyed.has(chosen);
  label.textContent=w?.name??(chosen==='home'?'Rift Carrier':tile().name);
  kind.textContent=w?.type??(chosen==='home'?'Carrier position':'Uncharted tile');
  sector.textContent=w?.code??tileCode(tile());
  description.textContent=scanned?w.survey:w?.copy??(chosen==='home'?'Your carrier is exploring this stretch of space.':'No charted destinations yet. Your carrier can still fly through.');
  explore.hidden=!w?.poi||scanned;
  if(!explore.hidden){
   const near=available(w),approaching=travel?.spot===w.id;
   explore.textContent=near?'Explore signal':approaching?'Approaching…':'Fly to signal';explore.disabled=approaching;
  }
  showPortrait(w);
 }
 function pick(id,recenter=false){
  const w=find(id);if(!w&&id!=='home')return;
  const {pin}=pinsByTile.get(tileId);
  pin.get(chosen)?.g.setAttribute('aria-pressed','false');
  chosen=id;pin.get(id)?.g.setAttribute('aria-pressed','true');cap.setAttribute('aria-pressed',String(id==='home'));
  finder.value=id;updateDetail();
  if(recenter){follow=id==='home';cameraX=id==='home'?ship.x:w.x;cameraY=id==='home'?ship.y:w.y;render();}
 }
 function scaleLimit(next){return clamp(next,Math.min(width/(worldW+36),height/(worldH+36)),base*2.5);}
 function render(){
  const w=width/scale,h=height/scale;
  cameraX=w>=worldW?worldW/2:clamp(cameraX,w/2,worldW-w/2);
  cameraY=h>=worldH?worldH/2:clamp(cameraY,h/2,worldH-h/2);
  chart.setAttribute('viewBox',[cameraX-w/2,cameraY-h/2,w,h].map(n=>n.toFixed(3)).join(' '));
  const hit=Math.max(29,22/scale).toFixed(2);capHit.setAttribute('r',hit);
  for(const {hit:circle} of pinsByTile.get(tileId).pin.values())circle.setAttribute('r',hit);
  cap.setAttribute('transform','translate('+ship.x.toFixed(2)+' '+ship.y.toFixed(2)+')');
  carrierArt.setAttribute('transform','scale('+Math.max(1,.43/scale).toFixed(3)+')');
  hull.setAttribute('transform','rotate('+ship.aim.toFixed(1)+')');
  plus.disabled=scale>=base*2.5-1e-5;minus.disabled=scale<=scaleLimit(0)+1e-5;
 }
 function fit(){
  const rect=view.getBoundingClientRect();if(!rect.width||!rect.height)return;
  const ratio=scale/base;
  width=rect.width;height=rect.height;base=Math.max(width/1050,height/756);scale=scaleLimit(base*ratio);render();
 }
 function adjust(factor){scale=scaleLimit(scale*factor);render();}
 const tileCode=w=>String(w.col).padStart(2,'0')+' · '+String(w.row).padStart(2,'0');
 function enterTile(id,edge=null,y=home.y){
  tileId=id;const record=tile();chosen=null;
  for(const [name,{group,pin}] of pinsByTile){
   for(const {g} of pin.values())g.setAttribute('aria-pressed','false');
   if(name===id)group.removeAttribute('display');else group.setAttribute('display','none');
  }
  for(const name of ['galaxy-atlas-art','galaxy-sector-labels']){
   const el=get(name);if(record.worlds.length)el.removeAttribute('display');else el.setAttribute('display','none');
  }
  get('galaxy-sector-title').textContent=record.name;get('galaxy-sector-coordinate').textContent='TILE '+tileCode(record);
  for(const [side,button] of Object.entries(gate)){
   button.hidden=!record.links[side];if(!button.hidden)button.setAttribute('aria-label','Fly to '+tiles[record.links[side]].name);
  }
  finder.replaceChildren();
  for(const w of [home,...record.worlds.filter(w=>w!==home)]){
   const option=document.createElement('option');option.value=w.id;option.textContent=w.name;finder.append(option);
  }
  if(edge){ship.x=edge==='east'?35:worldW-35;ship.y=clamp(y,32,worldH-32);cameraX=ship.x;cameraY=ship.y;}
  else [cameraX,cameraY]=record.origin;
  pick('home');
  status.textContent=edge?'Entered '+record.name+'.':'Inspect locations, or tap Fly to set an autopilot destination.';
  render();
 }
 function takeoff(x,y,edge=null,spot=null){
  if(document.hidden)return;
  travel={x:clamp(x,0,worldW),y:clamp(y,20,worldH-20),edge,spot};follow=true;
  status.textContent=edge?'Flying to '+tiles[tile().links[edge]].name+'…':spot?'Approaching '+find(spot)?.name+'…':'Autopilot underway.';
  updateDetail();last=0;
  if(!frame)frame=window.requestAnimationFrame(advance);
 }
 function flyTo(w){if(w&&w!==home)takeoff(w.x,w.y,null,w.id);}
 function advance(now){
  frame=0;if(!travel)return;
  const dt=document.hidden?0:Math.min(.032,Math.max(0,(now-(last||now))/1000));last=document.hidden?0:now;
  const {x,y,spot,edge}=travel,dx=x-ship.x,dy=y-ship.y,gap=Math.hypot(dx,dy);
  const step=Math.min(gap,dt*cruise);
  if(gap>0&&step>0){
   ship.x+=dx*step/gap;ship.y+=dy*step/gap;
   const angle=90+Math.atan2(dy,dx)*180/Math.PI,delta=((angle-ship.aim+540)%360)-180;
   ship.aim=(ship.aim+clamp(delta,-410*dt,410*dt)+360)%360;
  }
  if(follow){cameraX=ship.x;cameraY=ship.y;}
  if(gap<=step){
   travel=null;
   if(edge)enterTile(tile().links[edge],edge,y);
   else{
    if(spot)pick(spot);
    status.textContent=find(spot)?.poi?'Signal in range. Explore it from the location panel.':'Carrier arrived.';
    updateDetail();
   }
  }else frame=window.requestAnimationFrame(advance);
  render();
 }
 function cross(side){
  if(!tile().links[side])return;
  takeoff(side==='east'?worldW:0,ship.y,side);chart.focus({preventScroll:true});
 }
 function recenter(){follow=true;cameraX=ship.x;cameraY=ship.y;render();}
 function setFly(value){
  fly=value;flyButton.setAttribute('aria-pressed',String(value));view.classList.toggle('flying',value);
  hint.textContent=value?'TAP TO FLY · DRAG OR PINCH':'DRAG / PINCH · TAP TO INSPECT';
  if(!travel)status.textContent=value?'Tap anywhere and autopilot will fly the carrier there.':'Inspect locations, or tap Fly to set an autopilot destination.';
 }
 explore.addEventListener('click',()=>{
  const w=find(chosen);if(!w?.poi)return;
  if(!available(w)){flyTo(w);return;}
  surveyed.add(w.id);status.textContent='Signal explored.';updateDetail();
 });
 flyButton.addEventListener('click',()=>setFly(!fly));
 for(const [side,button] of Object.entries(gate))button.addEventListener('click',()=>cross(side));
 plus.addEventListener('click',()=>adjust(1.44));minus.addEventListener('click',()=>adjust(1/1.44));
 center.addEventListener('click',recenter);finder.addEventListener('change',()=>pick(finder.value,true));
 chart.addEventListener('keydown',e=>{
  if(e.target!==chart||e.altKey||e.ctrlKey||e.metaKey)return;
  const moves={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]};
  if(moves[e.key]){const [x,y]=moves[e.key];follow=false;cameraX+=86*x/scale;cameraY+=86*y/scale;render();e.preventDefault();}
  else if(e.key==='Home'){recenter();e.preventDefault();}
  else if(e.key==='+'||e.key==='-'){adjust(e.key==='+'?1.44:1/1.44);e.preventDefault();}
  else if(fly&&!e.repeat&&e.key==='Enter'){takeoff(cameraX,cameraY);e.preventDefault();}
 });
 function offset(x,y){
  const rect=view.getBoundingClientRect();
  return {x:x-rect.left-width/2,y:y-rect.top-height/2};
 }
 function rebase(moved=false){
  const [a,b]=pointers.values();if(!a){gesture=null;return;}
  if(b){
   const midpoint=offset((a.x+b.x)/2,(a.y+b.y)/2);
   gesture={type:'pinch',gap:Math.max(12,Math.hypot(a.x-b.x,a.y-b.y)),scale,
    x:cameraX+midpoint.x/scale,y:cameraY+midpoint.y/scale};follow=false;
  }else gesture={type:'drag',x:a.x,y:a.y,cameraX,cameraY,moved,edge:null,single:!moved};
 }
 chart.addEventListener('pointerdown',e=>{
  if(e.button!==0||pointers.has(e.pointerId)||pointers.size>=2)return;
  const id=e.target?.closest?.('[data-location]')?.getAttribute('data-location');
  pointers.set(e.pointerId,{x:e.clientX,y:e.clientY,id});
  try{chart.setPointerCapture(e.pointerId);}catch{}
  rebase();
 });
 const move=e=>{
  const finger=pointers.get(e.pointerId);if(!finger||!gesture||!Number.isFinite(e.clientX)||!Number.isFinite(e.clientY))return;
  finger.x=e.clientX;finger.y=e.clientY;
  if(gesture.type==='pinch'){
   const [a,b]=pointers.values();if(!b)return;
   const mid=offset((a.x+b.x)/2,(a.y+b.y)/2);
   scale=scaleLimit(gesture.scale*Math.max(12,Math.hypot(a.x-b.x,a.y-b.y))/gesture.gap);
   cameraX=gesture.x-mid.x/scale;cameraY=gesture.y-mid.y/scale;render();return;
  }
  const x=finger.x-gesture.x,y=finger.y-gesture.y;
  if(!gesture.moved&&Math.hypot(x,y)<6)return;
  follow=false;gesture.moved=true;view.classList.add('dragging');
  cameraX=gesture.cameraX-x/scale;cameraY=gesture.cameraY-y/scale;
  const h=width/(2*scale),slack=90/scale;
  gesture.edge=gesture.single&&Math.abs(x)>Math.abs(y)*1.4?
   cameraX<Math.min(h,worldW/2)-slack?'west':cameraX>Math.max(worldW-h,worldW/2)+slack?'east':null:null;
  render();
 };
 const release=e=>{
  const finger=pointers.get(e.pointerId);if(!finger)return;
  if(e.type==='pointerup')move(e);
  const previous=gesture;pointers.delete(e.pointerId);rebase(true);
  if(pointers.size)return;
  view.classList.remove('dragging');
  if(e.type!=='pointerup'||previous?.type!=='drag')return;
  if(previous.moved){if(fly&&previous.edge)cross(previous.edge);return;}
  if(finger.id==='home'){pick('home');return;}
  if(fly){
   const w=find(finger.id),point=offset(finger.x,finger.y);
   if(w)flyTo(w);else takeoff(cameraX+point.x/scale,cameraY+point.y/scale);
  }else if(finger.id)pick(finger.id);
 };
 // Capture normally keeps all events on the chart; window also catches a
 // release if touch capture is interrupted by the browser or device.
 for(const [event,fn] of [['pointermove',move],['pointerup',release],['pointercancel',release]])window.addEventListener(event,fn);
 chart.addEventListener('lostpointercapture',release);
 window.addEventListener('blur',()=>{pointers.clear();rebase();view.classList.remove('dragging');});
 if(window.ResizeObserver){const observer=new window.ResizeObserver(fit);observer.observe(view);}
 else window.addEventListener('resize',fit);
 fit();enterTile('reach');
})();
