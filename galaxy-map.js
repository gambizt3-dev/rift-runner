'use strict';
(() => {
 const get=id=>document.getElementById(id);
 const chart=get('galaxy-chart'),view=get('galaxy-viewport'),markers=get('galaxy-targets'),sky=get('galaxy-stars');
 const finder=get('galaxy-find'),label=get('location-title'),kind=get('location-class'),sector=get('location-sector');
 const description=get('location-description'),status=get('location-route'),portrait=get('location-portrait');
 const plus=get('galaxy-plus'),minus=get('galaxy-minus'),center=get('galaxy-center');
 const hint=get('galaxy-hint');
 const details=get('galaxy-details'),closeDetail=get('galaxy-detail-close');
 if(!chart||!view||!markers||!finder)return;
 const ns='http://www.w3.org/2000/svg',worldW=2750,worldH=1810,north=-850,south=2660,cruise=122,throttle=112,brake=130;
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
  copy:'An intermittent signal flickers among a cluster of derelicts. The crew can survey it as the carrier passes.',
  survey:'Survey complete: The derelicts conceal an abandoned pirate relay. A cold beacon still repeats the old call sign: Blackwake.'});
 // Adjacent chart tiles share one renderer. Blank neighbors have no destinations.
 const tiles={
  reach:{name:'The Outer Reach',col:0,row:0,worlds:data,links:{east:'frontier'},defaultWorld:'home',origin:[620,469]},
  frontier:{name:'Uncharted Frontier',col:1,row:0,worlds:[],links:{west:'reach'},defaultWorld:null,origin:[620,800]}
 };
 const home=data[0],corsair=data.find(w=>w.id==='pirates'),pinsByTile=new Map(),find=(id)=>tile().worlds.find(w=>w.id===id);
 let tileId='reach',chosen=null,cameraX=620,cameraY=469,width=1,height=1,base=1,scale=1;
 const reduced=window.matchMedia?.('(prefers-reduced-motion: reduce)');
 let follow=!reduced?.matches,travel=null,last=null,gesture=null,hasFitted=false,sized='',figure='',readout='Departing soon.';
 let hold=.75,passed=0,trafficAfter=0,elapsed=0,surveyNoticeUntil=0;
 // Each session gets autonomous routes. One of its first two legs includes
 // a different survey approach so a guest won't have to wait indefinitely.
 const surveyLeg=Math.random()<.5?0:1;
 const pointers=new Map(),surveyed=new Set(),ship={x:home.x,y:home.y,aim:0,speed:0};
 const tile=()=>tiles[tileId],clamp=(n,a,b)=>Math.min(b,Math.max(a,n));
 const frames={ocean:[0,0],lava:[50,0],rings:[100,0],ice:[0,100],violet:[50,100],rust:[100,100]};
 const changed=(el,key,value)=>{if(el.getAttribute(key)!==value)el.setAttribute(key,value);};
 const make=(tag,attrs,parent)=>{const el=document.createElementNS(ns,tag);for(const [k,v] of Object.entries(attrs))el.setAttribute(k,v);parent.append(el);return el;};
 let rng=47;const random=()=>((rng=(Math.imul(rng,1664525)+1013904223)>>>0)/4294967296);
 for(let i=0;i<480;i++)make('circle',{cx:Math.round(random()*worldW),cy:Math.round(north+random()*(south-north)),r:i%23===0?1.9:i%4===0?1.12:.62,fill:i%12===0?'#87fef2':i%9===0?'#b49df9':'#e0e9ff',opacity:(.18+random()*.55).toFixed(2)},sky);
 const cap=make('g',{class:'carrier-pin target','data-carrier':'','data-location':'home',tabindex:0,role:'button','aria-label':'Your carrier'},get('galaxy-carrier'));
 const capHit=make('circle',{class:'world-hit',r:38},cap);
 const blip=make('g',{class:'carrier-blip','pointer-events':'none',display:'none'},cap);
 make('circle',{r:7,fill:'#69ffed',opacity:.17},blip);
 make('circle',{r:4,fill:'#affff4',stroke:'#6ee5e8','stroke-width':.7},blip);
 const carrierArt=make('g',{class:'carrier-art-pin','pointer-events':'none'},cap);
 const hull=make('use',{href:'#carrier-map-mark',class:'carrier-mini-hull',x:-21,y:-32,width:42,height:64},carrierArt);
 make('text',{class:'target-name',y:51},carrierArt).textContent='Carrier';
 function activatePin(pin,id){
  pin.addEventListener('click',e=>{if(e.detail===0&&pointers.size===0)pick(id,true,true);});
  pin.addEventListener('keydown',e=>{
   if(!e.repeat&&(e.key==='Enter'||e.key===' ')){e.preventDefault();pick(id,true,true);}
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
 function updateDetail(){
  const w=find(chosen),scanned=surveyed.has(chosen);
  label.textContent=w?.name??(chosen==='home'?'Rift Carrier':tile().name);
  kind.textContent=w?.type??(chosen==='home'?'Carrier position':'Uncharted tile');
  sector.textContent=w?.code??tileCode(tile());
  description.textContent=scanned?w.survey:w?.copy??(chosen==='home'?'Your carrier is exploring this stretch of space.':'No charted destinations yet. Your carrier can still fly through.');
  const message=scanned?'Survey recorded by the carrier crew.':w?.poi?'Awaiting a nearby crew survey.':readout;
  if(status.textContent!==message)status.textContent=message;
  showPortrait(w);
 }
 function pick(id,recenter=false,reveal=false){
  const w=find(id);if(!w&&id!=='home')return;
  const {pin}=pinsByTile.get(tileId);
  pin.get(chosen)?.g.setAttribute('aria-pressed','false');
  chosen=id;pin.get(id)?.g.setAttribute('aria-pressed','true');cap.setAttribute('aria-pressed',String(id==='home'));
  finder.value=id;updateDetail();
  if(reveal){details.hidden=false;if(id!=='home')follow=false;}
  if(recenter){if(id!=='home')follow=false;cameraX=id==='home'?ship.x:w.x;cameraY=id==='home'?ship.y:w.y;render();}
 }
 function scaleLimit(next){
  const overview=Math.min(width/(worldW+36),height/(worldH+36));
  return clamp(next,Math.max(overview,width<690?Math.max(width/1725,height/(south-north+36)):0),base*2.5);
 }
 function render(){
  const w=width/scale,h=height/scale;
  cameraX=w>=worldW?worldW/2:clamp(cameraX,w/2,worldW-w/2);
  cameraY=h>=south-north?(north+south)/2:clamp(cameraY,north+h/2,south-h/2);
  changed(chart,'viewBox',[cameraX-w/2,cameraY-h/2,w,h].map(n=>n.toFixed(3)).join(' '));
  const hit=Math.max(29,22/scale).toFixed(2),sizeKey=tileId+':'+hit;
  if(sized!==sizeKey){
   sized=sizeKey;capHit.setAttribute('r',hit);
   for(const {hit:circle} of pinsByTile.get(tileId).pin.values())circle.setAttribute('r',hit);
  }
  changed(cap,'transform','translate('+ship.x.toFixed(2)+' '+ship.y.toFixed(2)+')');
  const overview=w>1550,look=(overview?'blip:':'hull:')+scale.toFixed(5);
  if(figure!==look){
   figure=look;
   if(overview){
    carrierArt.setAttribute('display','none');blip.removeAttribute('display');
    blip.setAttribute('transform','scale('+(1/scale).toFixed(3)+')');
   }else{
    blip.setAttribute('display','none');carrierArt.removeAttribute('display');
    carrierArt.setAttribute('transform','scale('+(clamp(.22+scale*1.05,.44,.70)/scale).toFixed(3)+')');
   }
  }
  if(!overview)changed(hull,'transform','rotate('+ship.aim.toFixed(1)+')');
  plus.disabled=scale>=base*2.5-1e-5;minus.disabled=scale<=scaleLimit(0)+1e-5;
 }
 function fit(){
  const rect=view.getBoundingClientRect();if(!rect.width||!rect.height)return;
  const ratio=scale/base;
  width=rect.width;height=rect.height;
  const framingHeight=width<690?Math.min(height,width*1.22):height;
  base=Math.max(width/1050,framingHeight/756);
  scale=scaleLimit(!hasFitted&&width<690?width/1250:base*ratio);hasFitted=true;render();
 }
 function adjust(factor){scale=scaleLimit(scale*factor);render();}
 const tileCode=w=>String(w.col).padStart(2,'0')+' · '+String(w.row).padStart(2,'0');
 function enterTile(id,edge=null,y=home.y){
  tileId=id;const record=tile();chosen=null;details.hidden=true;passed=0;
  trafficAfter=id==='frontier'?2:4+Math.floor(Math.random()*3);
  for(const [name,{group,pin}] of pinsByTile){
   for(const {g} of pin.values())g.setAttribute('aria-pressed','false');
   if(name===id)group.removeAttribute('display');else group.setAttribute('display','none');
  }
  for(const name of ['galaxy-atlas-art','galaxy-sector-labels']){
   const el=get(name);if(record.worlds.length)el.removeAttribute('display');else el.setAttribute('display','none');
  }
  get('galaxy-sector-title').textContent=record.name;get('galaxy-sector-coordinate').textContent='TILE '+tileCode(record);
  finder.replaceChildren();
  for(const w of [home,...record.worlds.filter(w=>w!==home)]){
   const option=document.createElement('option');option.value=w.id;option.textContent=w.name;finder.append(option);
  }
  if(edge){ship.x=edge==='east'?35:worldW-35;ship.y=clamp(y,north+32,south-32);cameraX=ship.x;cameraY=ship.y;}
  else [cameraX,cameraY]=record.origin;
  readout=edge?'Entered '+record.name+'.':'The carrier crew pilots this ship independently.';
  pick('home');render();
 }
 function announce(message){
  readout=message;
  if(!find(chosen)?.poi&&status.textContent!==message)status.textContent=message;
 }
 function nextLeg(){
  if(tileId==='reach'&&!surveyed.has(corsair.id)&&passed>=surveyLeg){
   const a=Math.random()*2*Math.PI,d=21+Math.random()*39;
   return {x:corsair.x+Math.cos(a)*d,y:corsair.y+Math.sin(a)*d};
  }
  const links=Object.keys(tile().links);
  if(passed>=trafficAfter&&links.length){
   const edge=links[Math.floor(Math.random()*links.length)];
   return {x:edge==='east'?worldW:0,y:clamp(ship.y+(Math.random()-.5)*400,north+120,south-120),edge};
  }
  for(let i=0;i<5;i++){
   const a=Math.random()*2*Math.PI,d=240+Math.random()*310;
   const x=clamp(ship.x+Math.cos(a)*d,95,worldW-95),y=clamp(ship.y+Math.sin(a)*d,north+95,south-95);
   if(Math.hypot(x-ship.x,y-ship.y)>165)return {x,y};
  }
  // A docked chart-edge position always has an inward course.
  return {x:ship.x+(ship.x<worldW/2?270:-270),y:ship.y};
 }
 function surveyNearCarrier(){
  if(tileId!=='reach'||surveyed.has(corsair.id)||Math.hypot(ship.x-corsair.x,ship.y-corsair.y)>78)return;
  surveyed.add(corsair.id);surveyNoticeUntil=elapsed+4;
  pinsByTile.get(tileId).pin.get(corsair.id).g.setAttribute('data-surveyed','');
  if(chosen===corsair.id)updateDetail();
 }
 function advance(now){
  window.requestAnimationFrame(advance);
  if(document.hidden){last=null;return;}
  const dt=last===null?0:Math.min(.032,Math.max(0,(now-last)/1000));last=now;elapsed+=dt;
  const copy=elapsed<surveyNoticeUntil?'CORSAIR SURVEY LOGGED':'DRAG / PINCH · TAP TO INSPECT';
  if(hint.textContent!==copy)hint.textContent=copy;
  if(!travel){
   hold-=dt;if(hold>0)return;
   travel=nextLeg();
   announce(travel.edge?'Crew en route to '+tiles[tile().links[travel.edge]].name+'…':'Carrier cruising under crew control.');
  }
  const {x,y,edge}=travel,dx=x-ship.x,dy=y-ship.y,gap=Math.hypot(dx,dy);
  // Approach cruising speed gradually and reduce thrust before arrival.
  const prior=ship.speed,desired=Math.min(cruise,Math.sqrt(2*brake*gap));
  ship.speed=prior+clamp(desired-prior,-brake*dt,throttle*dt);
  const step=Math.min(gap,(prior+ship.speed)*.5*dt);
  if(gap>0&&step>0){
   ship.x+=dx*step/gap;ship.y+=dy*step/gap;
   const angle=90+Math.atan2(dy,dx)*180/Math.PI,delta=((angle-ship.aim+540)%360)-180;
   const turn=clamp(delta*(1-Math.exp(-dt*3.2)),-94*dt,94*dt);
   ship.aim=(ship.aim+turn+360)%360;
  }
  surveyNearCarrier();
  if(follow){
   const blend=1-Math.exp(-dt*8);
   cameraX+=(ship.x-cameraX)*blend;cameraY+=(ship.y-cameraY)*blend;
  }
  if(gap-step<1e-6){
   ship.speed=0;travel=null;hold=.72+Math.random()*1.45;passed++;
   if(edge)enterTile(tile().links[edge],edge,y);
   else announce('Carrier holding position before its next course.');
  }
  render();
 }
 function recenter(){follow=true;cameraX=ship.x;cameraY=ship.y;render();}
 plus.addEventListener('click',()=>adjust(1.44));minus.addEventListener('click',()=>adjust(1/1.44));
 center.addEventListener('click',recenter);finder.addEventListener('change',()=>pick(finder.value,true,true));
 const clearDetails=()=>{details.hidden=true;chart.focus({preventScroll:true});};
 closeDetail.addEventListener('click',clearDetails);
 details.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();clearDetails();}});
 chart.addEventListener('keydown',e=>{
  if(e.target!==chart||e.altKey||e.ctrlKey||e.metaKey)return;
  const moves={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]};
  if(moves[e.key]){const [x,y]=moves[e.key];follow=false;cameraX+=86*x/scale;cameraY+=86*y/scale;render();e.preventDefault();}
  else if(e.key==='Home'){recenter();e.preventDefault();}
  else if(e.key==='+'||e.key==='-'){adjust(e.key==='+'?1.44:1/1.44);e.preventDefault();}
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
  }else gesture={type:'drag',x:a.x,y:a.y,cameraX,cameraY,moved};
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
  render();
 };
 const release=e=>{
  const finger=pointers.get(e.pointerId);if(!finger)return;
  if(e.type==='pointerup')move(e);
  const previous=gesture;pointers.delete(e.pointerId);rebase(true);
  if(pointers.size)return;
  view.classList.remove('dragging');
  if(e.type!=='pointerup'||previous?.type!=='drag'||previous.moved)return;
  if(finger.id)pick(finger.id,false,true);
 };
 // Capture normally keeps all events on the chart; window also catches a
 // release if touch capture is interrupted by the browser or device.
 for(const [event,fn] of [['pointermove',move],['pointerup',release],['pointercancel',release]])window.addEventListener(event,fn);
 chart.addEventListener('lostpointercapture',release);
 window.addEventListener('blur',()=>{pointers.clear();rebase();view.classList.remove('dragging');});
 if(window.ResizeObserver){const observer=new window.ResizeObserver(fit);observer.observe(view);}
 else window.addEventListener('resize',fit);
 fit();enterTile('reach');window.requestAnimationFrame(advance);
})();
