'use strict';
(() => {
 const get=id=>document.getElementById(id);
 const chart=get('galaxy-chart'),view=get('galaxy-viewport'),markers=get('galaxy-targets'),sky=get('galaxy-stars');
 const finder=get('galaxy-find'),route=get('galaxy-route'),label=get('location-title'),kind=get('location-class'),sector=get('location-sector');
 const description=get('location-description'),status=get('location-route'),portrait=get('location-portrait');
 const plus=get('galaxy-plus'),minus=get('galaxy-minus'),center=get('galaxy-center');
 const gate={west:get('galaxy-west'),east:get('galaxy-east')};
 if(!chart||!view||!markers||!finder)return;
 const ns='http://www.w3.org/2000/svg',worldW=2400,worldH=1600;
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
 ].map(([id,name,type,code,x,y,art,copy])=>({id,name,type,code,x,y,art,copy}));
 // Adjacent chart tiles share one renderer. Blank neighbors have no destinations.
 const tiles={
  reach:{name:'The Outer Reach',col:0,row:0,worlds:data,links:{east:'frontier'},defaultWorld:'home',origin:[620,469]},
  frontier:{name:'Uncharted Frontier',col:1,row:0,worlds:[],links:{west:'reach'},defaultWorld:null,origin:[620,800]}
 };
 const home=data[0],pinsByTile=new Map();
 let tileId='reach',chosen=null,cameraX=620,cameraY=469,zoom=1,width=1,height=1,base=1,scale=1,ride=null,suppressUntil=-Infinity;
 const tile=()=>tiles[tileId];
 const frames={ocean:[0,0],lava:[50,0],rings:[100,0],ice:[0,100],violet:[50,100],rust:[100,100]};
 const clamp=(n,min,max)=>Math.min(max,Math.max(min,n));
 const make=(tag,attrs,parent)=>{const el=document.createElementNS(ns,tag);for(const [k,v] of Object.entries(attrs))el.setAttribute(k,v);parent.append(el);return el;};
 let rng=47;const random=()=>((rng=(Math.imul(rng,1664525)+1013904223)>>>0)/4294967296);
 for(let i=0;i<260;i++)make('circle',{cx:Math.round(random()*worldW),cy:Math.round(random()*worldH),r:i%23===0?1.9:i%4===0?1.12:.62,fill:i%12===0?'#87fef2':i%9===0?'#b49df9':'#e0e9ff',opacity:(.18+random()*.55).toFixed(2)},sky);
 for(const [id,record] of Object.entries(tiles)){
  const group=make('g',{'data-tile':id},markers),pin=new Map();
  pinsByTile.set(id,{group,pin});
  for(const w of record.worlds){
   const g=make('g',{class:'target','data-location':w.id,tabindex:0,role:'button','aria-label':w===home?'Your carrier':w.name+', '+w.type,'aria-pressed':'false',transform:'translate('+w.x+' '+w.y+')'},group);
  const hit=make('circle',{class:'world-hit',r:34},g);
  make('circle',{class:'world-orbit',r:28},g);
  if(w.art)make('use',{href:'#'+w.art,x:-30,y:-27,width:60,height:54,'pointer-events':'none'},g);
  else{
   make('circle',{r:25,fill:'#123b4b',stroke:'#98f6dd','stroke-width':1.5},g);
   make('image',{href:'./carrier-capital.webp?v=133',x:-19,y:-28,width:38,height:56,'pointer-events':'none'},g);
  }
  const name=make('text',{class:'target-name',y:47},g);name.textContent=w===home?'Your carrier':w.name;
   pin.set(w.id,{g,hit});
   g.addEventListener('click',e=>{if(e.timeStamp<suppressUntil){e.preventDefault();return;}pick(w.id);});
   g.addEventListener('keydown',e=>{if(!e.repeat&&(e.key==='Enter'||e.key===' ')){e.preventDefault();pick(w.id,true);}});
  }
 }
 let loaded=false;
 if(typeof window.Image==='function'){
  const image=new window.Image();
  image.onload=()=>{loaded=true;showPortrait(tile().worlds.find(w=>w.id===chosen));};
  image.src='./galaxy-planets.webp';
 }
 function showPortrait(w){
  portrait.hidden=!loaded||!w?.art;
  if(!portrait.hidden){const [x,y]=frames[w.art];portrait.style.setProperty('--portrait-x',x+'%');portrait.style.setProperty('--portrait-y',y+'%');}
 }
 function pick(id,recenter=false){
  const w=tile().worlds.find(w=>w.id===id);if(!w)return;
  const {pin}=pinsByTile.get(tileId);
  pin.get(chosen)?.g.setAttribute('aria-pressed','false');
  chosen=id;pin.get(id).g.setAttribute('aria-pressed','true');
  finder.value=id;label.textContent=w.name;kind.textContent=w.type;sector.textContent=w.code;description.textContent=w.copy;
  if(w===home)route.setAttribute('display','none');
  else{route.removeAttribute('display');route.setAttribute('d','M'+home.x+' '+home.y+'L'+w.x+' '+w.y);}
  status.textContent=w===home?'Select a planet to preview a course.':'Course preview · Rift Carrier to '+w.name+'.';
  showPortrait(w);
  if(recenter){cameraX=w.x;cameraY=w.y;render();}
 }
 function render(){
  const minScale=Math.min(width/(worldW+36),height/(worldH+36));
  const maxScale=base*2.25;
  scale=clamp(base*zoom,minScale,maxScale);
  zoom=scale/base;
  const w=width/scale,h=height/scale;
  cameraX=w>=worldW?worldW/2:clamp(cameraX,w/2,worldW-w/2);
  cameraY=h>=worldH?worldH/2:clamp(cameraY,h/2,worldH-h/2);
  chart.setAttribute('viewBox',[(cameraX-w/2),(cameraY-h/2),w,h].map(n=>n.toFixed(3)).join(' '));
  for(const {hit} of pinsByTile.get(tileId).pin.values())hit.setAttribute('r',Math.max(29,22/scale).toFixed(2));
  plus.disabled=scale>=maxScale-1e-5;minus.disabled=scale<=minScale+1e-5;
 }
 function fit(){
  const rect=view.getBoundingClientRect();if(!rect.width||!rect.height)return;
  width=rect.width;height=rect.height;base=Math.max(width/1050,height/690);render();
 }
 function adjust(factor){zoom*=factor;render();}
 const tileCode=record=>String(record.col).padStart(2,'0')+' · '+String(record.row).padStart(2,'0');
 function enterTile(id,edge=null){
  tileId=id;const record=tile();
  for(const [name,{group,pin}] of pinsByTile){
   for(const {g} of pin.values())g.setAttribute('aria-pressed','false');
   if(name===id)group.removeAttribute('display');else group.setAttribute('display','none');
  }
  const illustrated=record.worlds.length>0;
  for(const name of ['galaxy-atlas-art','galaxy-sector-labels','galaxy-lanes']){
   const el=get(name);if(illustrated)el.removeAttribute('display');else el.setAttribute('display','none');
  }
  get('galaxy-sector-title').textContent=record.name;
  get('galaxy-sector-coordinate').textContent='TILE '+tileCode(record);
  for(const [side,button] of Object.entries(gate)){
   button.hidden=!record.links[side];
   if(!button.hidden)button.setAttribute('aria-label','Cross to '+tiles[record.links[side]].name);
  }
  finder.replaceChildren();
  for(const w of record.worlds){
   const option=document.createElement('option');option.value=w.id;option.textContent=w.name;finder.append(option);
  }
  finder.disabled=!illustrated;
  if(record.defaultWorld)pick(record.defaultWorld);
  else{
   chosen=null;route.setAttribute('display','none');label.textContent=record.name;kind.textContent='Uncharted tile';
   sector.textContent=tileCode(record);description.textContent='No destinations have been charted in this sector yet.';
   const exits=Object.entries(record.links);
   status.textContent=exits.length===1?'Use the '+exits[0][0]+' gate to reach '+tiles[exits[0][1]].name+'.':'Choose a gate to continue.';
   showPortrait(null);
  }
  if(edge){cameraX=edge==='east'?0:worldW;cameraY=clamp(cameraY,0,worldH);}
  else [cameraX,cameraY]=record.origin;
  render();
 }
 function cross(side){
  const id=tile().links[side];if(!id)return;
  enterTile(id,side);chart.focus({preventScroll:true});
 }
 function recenter(){zoom=1;enterTile('reach');}
 for(const [side,button] of Object.entries(gate))button.addEventListener('click',()=>cross(side));
 plus.addEventListener('click',()=>adjust(1.44));
 minus.addEventListener('click',()=>adjust(1/1.44));
 center.addEventListener('click',recenter);
 finder.addEventListener('change',()=>pick(finder.value,true));
 chart.addEventListener('keydown',e=>{
  if(e.target!==chart||e.altKey||e.ctrlKey||e.metaKey)return;
  const moves={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]};
  if(moves[e.key]){const [x,y]=moves[e.key];cameraX+=86*x/scale;cameraY+=86*y/scale;render();e.preventDefault();}
  else if(e.key==='Home'){recenter();e.preventDefault();}
  else if(e.key==='+'||e.key==='-'){adjust(e.key==='+'?1.44:1/1.44);e.preventDefault();}
 });
 chart.addEventListener('pointerdown',e=>{
  if(ride||e.button!==0)return;
  suppressUntil=-Infinity;
  ride={id:e.pointerId,x:e.clientX,y:e.clientY,cameraX,cameraY,dragged:false,edge:null};
 });
 chart.addEventListener('pointermove',e=>{
  if(ride?.id!==e.pointerId)return;
  const x=e.clientX-ride.x,y=e.clientY-ride.y;
  if(!ride.dragged){
   if(Math.hypot(x,y)<7)return;
   ride.dragged=true;view.classList.add('dragging');try{chart.setPointerCapture(e.pointerId);}catch{}
  }
  cameraX=ride.cameraX-x/scale;cameraY=ride.cameraY-y/scale;
  const h=width/(2*scale),slack=86/scale,side=cameraX<Math.min(h,worldW/2)-slack?'west':
   cameraX>Math.max(worldW-h,worldW/2)+slack?'east':null;
  ride.edge=Math.abs(x)>Math.abs(y)*1.35?side:null;render();
 });
 const release=e=>{
  if(ride?.id!==e.pointerId)return;
  const edge=ride.dragged&&e.type==='pointerup'?ride.edge:null;
  if(ride.dragged)suppressUntil=e.timeStamp+380;
  ride=null;view.classList.remove('dragging');
  if(edge)cross(edge);
 };
 for(const event of ['pointerup','pointercancel'])window.addEventListener(event,release);
 chart.addEventListener('lostpointercapture',release);
 if(window.ResizeObserver){const observer=new window.ResizeObserver(fit);observer.observe(view);}
 else window.addEventListener('resize',fit);
 fit();enterTile('reach');
})();
