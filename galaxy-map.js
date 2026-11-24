'use strict';
(() => {
 const get=id=>document.getElementById(id);
 const chart=get('galaxy-chart'),view=get('galaxy-viewport'),markers=get('galaxy-targets'),sky=get('galaxy-stars');
 const finder=get('galaxy-find'),label=get('location-title'),kind=get('location-class'),sector=get('location-sector');
 const description=get('location-description'),status=get('location-route'),portrait=get('location-portrait');
 const plus=get('galaxy-plus'),minus=get('galaxy-minus'),center=get('galaxy-center');
 const course=get('carrier-current-course'),scaleLabel=get('galaxy-scale-label'),scaleLine=get('galaxy-scale-line');
 const nebula=get('galaxy-nebula-layer'),motion=window.matchMedia?.('(prefers-reduced-motion: reduce)');
 const hint=get('galaxy-hint'),captainAlert=get('galaxy-captain-alert'),helm=get('galaxy-helm');
 const online=window.RiftGalaxyState?.watch?.();
 const bifrostOnline=window.RiftGalaxyState?.watch?.('bifrost');
 const bifrostButton=get('galaxy-locate-bifrost'),companyLink=get('galaxy-bifrost-company'),visitVessel=get('galaxy-visit-vessel');
 const search=window.location?.search??'';
 const match=/^\?transit=1&from=(rift-carrier|bifrost)&to=(rift-carrier|bifrost)$/.exec(search);
 const embedded=window.parent&&window.parent!==window;
 const transit=embedded&&match&&match[1]!==match[2]?{from:match[1],to:match[2],progress:null}:null;
 const picker=embedded&&/^\?flight-map=1&from=(rift-carrier|bifrost)$/.exec(search)?.[1]||null;
 const selectFlight=get('galaxy-select-flight');
 if(picker)get('galaxy-atlas')?.setAttribute('data-flight-map','true');
 const flyToVessel=get('galaxy-fly-to-vessel'),transitStatus=get('galaxy-transit-status');
 const requestedParams=search.slice(1).split('&');
 const incomingVessels=requestedParams.filter(param=>param.startsWith('vessel='));
 const returnVessel=incomingVessels.length===1?incomingVessels[0]:null;
 const bifrostRequested=returnVessel==='vessel=bifrost';
 if(bifrostRequested||returnVessel==='vessel=rift-carrier')
  get('galaxy-back')?.setAttribute('href','./carrier.html?'+returnVessel);
 let pendingPegasusLocate=requestedParams.includes('vessel=rift-carrier')&&!bifrostRequested;
 let pendingBifrostLocate=bifrostRequested,bifrostSelected=bifrostRequested,bifrostSnapshot=null,bifrostReadout='';
 const stripSector=get('carrier-strip-sector'),stripMotion=get('carrier-strip-motion'),stripSpeed=get('carrier-strip-speed'),stripDestination=get('carrier-strip-destination');
 const details=get('galaxy-details'),closeDetail=get('galaxy-detail-close');
 if(!chart||!view||!markers||!finder)return;
 const ns='http://www.w3.org/2000/svg',worldW=2750,worldH=1810,north=-850,south=2660,helmTimeScale=5,cruise=76/helmTimeScale,throttle=65/helmTimeScale**2,brake=94/helmTimeScale**2;
 const data=window.RiftGalaxyCatalog.worlds;
 // Adjacent chart tiles share one renderer. Blank neighbors have no destinations.
 const tiles={
  reach:{name:'The Outer Reach',number:1,backdrop:'reach',col:0,row:0,worlds:data,links:{east:'frontier'},defaultWorld:'home',origin:[620,469]},
  frontier:{name:'Uncharted Frontier',number:2,backdrop:'frontier',col:1,row:0,worlds:[],links:{west:'reach'},defaultWorld:null,origin:[620,800]}
 };
 const pegasusId='rift-carrier',bifrostId='bifrost';
 const identity=window.RiftVesselIdentity,vessels=new Map([
  [pegasusId,{vessel:{id:pegasusId,name:'Pegasus',vesselClass:'Pegasus-class carrier'},commander:{id:'bishop',title:'Admiral',name:'Bishop'},guildLabel:'Unassigned guild'}],
  [bifrostId,{vessel:{id:bifrostId,name:'Bifrost',vesselClass:'Bifrost-class carrier'},commander:{id:'adaline',title:'Admiral',name:'Adaline'},guildLabel:'Unassigned guild'}]
 ]);
 const vesselAt=id=>id==='home'?pegasusId:id===bifrostId?bifrostId:null;
 for(const id of vessels.keys()){const known=identity?.get?.(id);if(known?.vessel.id===id)vessels.set(id,known);}
 const vesselName=id=>vessels.get(id).vessel.name;
 const vesselSubtitle=id=>{const v=vessels.get(id).vessel;return v.name+' — '+v.vesselClass;};
 const commanderLabel=id=>{const c=vessels.get(id).commander;return c?c.title+' '+c.name:'Commander unknown';};
 const guildLabel=id=>vessels.get(id).guildLabel;
 const pickerTarget=picker===bifrostId?pegasusId:bifrostId;
 let selectionSent=false;
 if(picker){
  selectFlight?.addEventListener('click',()=>{
   const id=vesselAt(chosen);
   if(selectionSent||!id||id!==pickerTarget||selectFlight.hidden)return;
   selectionSent=true;selectFlight.disabled=true;
   window.parent.postMessage({type:'rift-fighter-transfer-select',from:picker,to:id},window.location.origin);
  });
 }
 function updatePickerLabel(){
  if(!picker||!bifrostButton)return;
  bifrostButton.textContent=vesselName(pickerTarget);
  changed(bifrostButton,'aria-label','Find '+vesselName(pickerTarget)+' on the chart');
 }
 const pirateId='blackwake',crossId='blackwake-engagement',crossAction=get('galaxy-cross-action');
 let cross=null,crossPending=false,crossChecked=-Infinity,pirateOption=null,engagementOption=null;
 const home=data[0],corsair=data.find(w=>w.id==='pirates'),pinsByTile=new Map(),
  find=(id)=>tile().worlds.find(w=>w.id===id);
 let tileId='reach',chosen=null,cameraX=620,cameraY=469,width=1,height=1,base=1,scale=1;
 let travel=null,last=null,gesture=null,hasFitted=false,sized='',figure='',readout='Connecting to the shared chart.',scaleShown=0;
 let helmMode=false,shipKnown=false,flightPhase='connecting',shipSector='reach',destination=null,planPoint=null;
 const pointers=new Map(),surveyed=new Set(),ship={x:home.x,y:home.y,aim:0,speed:0};
 const tile=()=>tiles[tileId],clamp=(n,a,b)=>Math.min(b,Math.max(a,n));
 const frames=window.RiftGalaxyCatalog.frames;
 const changed=(el,key,value)=>{if(el.getAttribute(key)!==value)el.setAttribute(key,value);};
 const make=(tag,attrs,parent)=>{const el=document.createElementNS(ns,tag);for(const [k,v] of Object.entries(attrs))el.setAttribute(k,v);parent.append(el);return el;};
 const transitLayer=transit&&get('galaxy-fighter-transit');
 const transferPath=transitLayer&&make('path',{fill:'none',stroke:'#80f7df','stroke-width':1.5,'stroke-dasharray':'4 6','stroke-opacity':.64,'vector-effect':'non-scaling-stroke','pointer-events':'none'},transitLayer);
 const fighterPin=transitLayer&&make('g',{display:'none','pointer-events':'none'},transitLayer);
 const fighterIcon=fighterPin&&make('g',{},fighterPin);
 if(fighterPin){
  make('circle',{r:13,fill:'#71faff',opacity:.17},fighterIcon);
  make('path',{d:'M12 0 -8 -8 -5 0 -8 8Z',fill:'#d3fff8',stroke:'#298786','stroke-width':1},fighterIcon);
  get('galaxy-atlas')?.setAttribute('data-transit','true');
  chart.setAttribute('inert','');chart.setAttribute('tabindex','-1');
  chart.setAttribute('aria-label','Galaxy Map · fighter in transit');
  if(transitStatus){transitStatus.hidden=false;transitStatus.textContent='Preparing transfer chart…';}
 }
 const livePose=snapshot=>snapshot&&Object.hasOwn(tiles,snapshot.sector)&&
  Number.isFinite(snapshot.x)&&Number.isFinite(snapshot.y)&&!['stale','connecting','unavailable'].includes(snapshot.phase)
  ?{sector:snapshot.sector,x:snapshot.x+tiles[snapshot.sector].col*worldW,y:snapshot.y}:null;
 const interpolate=(a,b,t)=>a+(b-a)*t;
 function paintTransit(snapshot){
  if(!fighterPin||transit.progress===null)return;
  const a=livePose(transit.from===pegasusId?snapshot:bifrostSnapshot),b=livePose(transit.to===pegasusId?snapshot:bifrostSnapshot);
  const progress=transit.progress,percent=Math.floor(progress*10)*10;
  let x,y,angle=0,path;
  if(a&&b){
   // Sector offsets keep the flight continuous across the chart seam.
   const globalX=interpolate(a.x,b.x,progress),sectorId=globalX>=worldW?'frontier':'reach';
   if(tileId!==sectorId)enterTile(sectorId);
   x=globalX-tiles[sectorId].col*worldW;y=interpolate(a.y,b.y,progress);
   angle=Math.atan2(b.y-a.y,b.x-a.x)*180/Math.PI;
   path='M'+(a.x-tiles[sectorId].col*worldW).toFixed(2)+' '+a.y.toFixed(2)+' L'+(b.x-tiles[sectorId].col*worldW).toFixed(2)+' '+b.y.toFixed(2);
  }else{
   // Keep a visible progress icon without inventing either carrier position.
   const half=width/scale*.22;
   x=cameraX+interpolate(-half,half,progress);y=cameraY;
   path='M'+(cameraX-half).toFixed(2)+' '+y.toFixed(2)+' H'+(cameraX+half).toFixed(2);
  }
  if(a&&b){cameraX=x;cameraY=y;}
  changed(transferPath,'d',path);
  fighterPin.removeAttribute('display');
  changed(fighterPin,'transform','translate('+x.toFixed(2)+' '+y.toFixed(2)+')');
  changed(fighterIcon,'transform','rotate('+angle.toFixed(2)+') scale('+(1/scale).toFixed(3)+')');
  if(transitStatus){
   const unavailable=a&&b?'':' · Carrier signal pending';
   const copy='Fighter in transit to '+vesselName(transit.to)+' · '+percent+'%'+unavailable;
   if(transitStatus.textContent!==copy)transitStatus.textContent=copy;
  }
 }
 if(transit)window.addEventListener('message',e=>{
  const data=e.data;
  if(e.source!==window.parent||e.origin!==window.location.origin||!data||data.type!=='rift-fighter-transit'||
   data.from!==transit.from||data.to!==transit.to||!Number.isFinite(data.progress)||data.progress<0||data.progress>1||
   transit.progress!==null&&data.progress<transit.progress)return;
  transit.progress=data.progress;
 });
 function activeOwnedFighter(){
  const registry=window.RiftFighters,parking=window.RiftFighterParking;
  if(!registry||!parking)return null;
  try{
   const id=registry.selected(), wallet=window.RiftCredits?.getBuildState?.();
   if(!wallet||!registry.get(id))return null;
   if(id===registry.starter){
    const cert=JSON.parse(window.localStorage.getItem(registry.hullKey(id)));
    if(cert===null){
     const old=JSON.parse(window.localStorage.getItem(registry.buildKey(id)));
     if(wallet.origin!=='legacy'&&(old?.version!==1||old.hull!==id||![old.engine,old.core,old.battery,old.primary].some(part=>typeof part==='string'&&window.RiftCredits.owns?.(part))))return null;
    }else if(cert.version!==1||cert.hull!==id||!['damaged','repairing','repaired'].includes(cert.condition))return null;
   }else if(!registry.owned(id))return null;
   return id;
  }catch{return null;}
 }
 function updateFlightLink(id){
  if(!flyToVessel)return;
  if(selectFlight){
   selectFlight.hidden=!picker||id!==pickerTarget;
   if(!selectFlight.hidden)selectFlight.textContent='Fly to '+vesselName(id);
  }
  const active=transit||picker?null:activeOwnedFighter();
  const parking=active?window.RiftFighterParking.details(active):null;
  const parked=parking?.vessel;
  const fighterDeck=get('galaxy-fighter-deck');
  if(fighterDeck){
   fighterDeck.hidden=!vessels.has(parked);
   if(fighterDeck.hidden)fighterDeck.removeAttribute('href');
   else{
    const name=vesselName(parked);
    changed(fighterDeck,'href','./carrier.html?vessel='+parked);
    changed(fighterDeck,'aria-label','Go to my fighter on '+name+' · Deck Map');
    changed(fighterDeck,'title',name+' Deck Map');
   }
  }
  const note=get('location-fighter-parking');
  if(note){
   note.hidden=!(parking?.bay&&parked===id);
   if(!note.hidden)note.textContent=window.RiftFighters.get(active).name+' · Bay '+String(parking.bay).padStart(2,'0');
  }
  flyToVessel.hidden=!parked||!id||id===parked;
  if(flyToVessel.hidden){flyToVessel.removeAttribute('href');return;}
  changed(flyToVessel,'href','./index.html?transfer='+id);
  flyToVessel.textContent='Fly to '+vesselName(id);
 }
 let checkingParking=null;
 function refreshParking(){
  updateFlightLink(vesselAt(chosen));updateCrossAction();
  if(transit||picker)return;
  const id=activeOwnedFighter();
  if(!id||checkingParking===id)return;
  checkingParking=id;
  window.RiftFighterParking.hydrate(id).then(()=>{updateFlightLink(vesselAt(chosen));updateCrossAction();}).finally(()=>{
   if(checkingParking===id)checkingParking=null;
  });
 }
 for(const event of ['pageshow','storage','rift:walletchange'])window.addEventListener(event,refreshParking);
 function updateCrossAction(){
  if(!crossAction)return;
  const fighter=cross&&!transit&&!picker?activeOwnedFighter():null;
  const parked=fighter?window.RiftFighterParking.details(fighter):null;
  const publicContact=cross&&!transit&&!picker;
  const intercept=chosen===pirateId||chosen===crossId;
  const reinforce=chosen===bifrostId||chosen===crossId;
  const eligible=publicContact&&parked?.vessel===pegasusId&&parked.revision;
  const link=(node,visible,href,copy)=>{
   if(!node)return;
   node.hidden=!visible;
   if(visible){changed(node,'href',href);node.textContent=copy;}else node.removeAttribute('href');
  };
  const join='./index.html?cross-battle=blackwake&join=';
  link(crossAction,eligible&&(intercept||reinforce),join+(intercept?'intercept':'reinforce')+'&vessel='+pegasusId,
   intercept?'Intercept Blackwake':'Reinforce Bifrost');
  link(get('galaxy-cross-reinforce'),eligible&&chosen===crossId,join+'reinforce&vessel='+pegasusId,'Reinforce Bifrost');
  link(get('galaxy-cross-watch'),publicContact&&chosen===crossId,'./index.html?cross-battle=blackwake&watch=1','Watch Battle');
  const hint=get('galaxy-cross-eligibility');
  if(hint){
   hint.hidden=!(publicContact&&(intercept||reinforce)&&!eligible);
   if(!hint.hidden)hint.textContent='To join this test, use an owned fighter with a confirmed berth on Pegasus.';
  }
 }
 function paintPirateOption(){
  if(!pirateOption){pirateOption=document.createElement('option');pirateOption.value=pirateId;pirateOption.textContent='Blackwake · Pirate vessel';finder.append(pirateOption);}
  if(!engagementOption){engagementOption=document.createElement('option');engagementOption.value=crossId;engagementOption.textContent='Cross Battle · Watch or join';finder.append(engagementOption);}
  for(const option of [pirateOption,engagementOption]){option.hidden=!cross;option.disabled=!cross;}
 }
 function showCross(result){
  if(!result&&!cross)return;
  cross=result;paintPirateOption();
  if((chosen===pirateId||chosen===crossId)&&!cross){chosen=null;details.hidden=true;piratePin.setAttribute('aria-pressed','false');crossPin.setAttribute('aria-pressed','false');}
  if(chosen===pirateId||chosen===bifrostId||chosen===crossId)updateDetail();
  else updateCrossAction();
  render();
 }
 function refreshCross(now){
  if(cross&&Date.now()>=cross.endsAt)showCross(null);
  const client=window.RiftCrossBattle;
  if(transit||picker||document.hidden||crossPending||now-crossChecked<15000||!client?.get)return;
  crossChecked=now;crossPending=true;
  client.get().then(data=>{
   const e=data?.encounter;
   if(!e||Date.now()>=e.endsAt||!Object.hasOwn(tiles,e.sector)||[e,e.pirate,e.attacker].some(p=>!Number.isFinite(p?.x)||!Number.isFinite(p?.y)))return null;
   return {location:{sector:e.sector,x:e.x,y:e.y},pirate:e.pirate,attacker:e.attacker,endsAt:e.endsAt};
  }).catch(()=>null).then(showCross).finally(()=>{crossPending=false;});
 }
 let rng=47;const random=()=>((rng=(Math.imul(rng,1664525)+1013904223)>>>0)/4294967296);
 const starBands=new Map();
 for(let i=0;i<480;i++){
  const x=Math.round(random()*worldW),y=Math.round(north+random()*(south-north)),bright=random()>.65;
  const r=i%23===0?1.9:i%4===0?1.12:.62,fill=i%12===0?'#87fef2':i%9===0?'#b49df9':'#e0e9ff';
  const key=[r,fill,bright?.61:.32].join('|');
  starBands.set(key,(starBands.get(key)??'')+'M'+x+' '+y+'h.01');
 }
 for(const [key,d] of starBands){const [r,stroke,opacity]=key.split('|');make('path',{d,fill:'none',stroke,'stroke-width':Number(r)*2,'stroke-linecap':'round',opacity},sky);}
 const cap=make('g',{class:'carrier-pin target',display:'none','data-carrier':'','data-location':pegasusId,tabindex:0,role:'button','aria-label':'Your carrier'},get('galaxy-carrier'));
 const capHit=make('circle',{class:'world-hit',r:38},cap);
 const blip=make('g',{class:'carrier-blip','pointer-events':'none',display:'none'},cap);
 make('circle',{r:7,fill:'#69ffed',opacity:.17},blip);
 make('circle',{r:4,fill:'#affff4',stroke:'#6ee5e8','stroke-width':.7},blip);
 const carrierBlipName=make('text',{class:'target-name',y:17},blip);
 const carrierBlipVessel=make('text',{class:'target-name vessel-marker-subtitle',y:28},blip);
 const commanderArt=new Map([['bishop','./captain-bridge-front.webp?v=94'],['adaline','./admiral-adaline.webp']]);
 function admiralMedallion(parent,hue){
  make('circle',{r:23,fill:'#07131f',stroke:hue,'stroke-width':2.8},parent);
  const backup=make('text',{class:'map-admiral-initials','text-anchor':'middle',y:5,fill:hue},parent);
  const picture=make('image',{x:-52,y:-23,width:104,height:113,'clip-path':'url(#map-admiral-disc)',visibility:'hidden','aria-hidden':'true'},parent);
  picture.addEventListener('load',()=>{if(picture.getAttribute('href')){picture.removeAttribute('visibility');backup.setAttribute('visibility','hidden');}});
  picture.addEventListener('error',()=>{picture.setAttribute('visibility','hidden');backup.removeAttribute('visibility');});
  return commander=>{
   const asset=commanderArt.get(commander?.id);
   backup.textContent=commander?.name?.[0]?.toUpperCase()??'?';
   if(picture.getAttribute('href')===asset)return;
   picture.setAttribute('visibility','hidden');backup.removeAttribute('visibility');
   if(asset)picture.setAttribute('href',asset);else picture.removeAttribute('href');
  };
 }
 const carrierArt=make('g',{class:'carrier-art-pin','pointer-events':'none'},cap);
 const carrierCommanderPortrait=admiralMedallion(carrierArt,'#80e5eb');
 const carrierArtName=make('text',{class:'target-name',y:40},carrierArt);
 const carrierArtVessel=make('text',{class:'target-name vessel-marker-subtitle',y:54},carrierArt);
 const bifrostPin=make('g',{class:'bifrost-pin target',display:'none','data-location':'bifrost',tabindex:0,role:'button',
  'aria-label':'Bifrost, guild vessel','aria-pressed':'false'},get('galaxy-bifrost'));
 const bifrostHit=make('circle',{class:'world-hit',r:38},bifrostPin);
 const bifrostBlip=make('g',{class:'bifrost-blip','pointer-events':'none',display:'none'},bifrostPin);
 make('path',{d:'M0-6 6 0 0 6-6 0Z',fill:'#f1bbec',stroke:'#eda5e6','stroke-width':.8},bifrostBlip);
 const bifrostBlipName=make('text',{class:'target-name',y:17},bifrostBlip);
 const bifrostBlipVessel=make('text',{class:'target-name vessel-marker-subtitle',y:28},bifrostBlip);
 const bifrostArt=make('g',{class:'bifrost-art-pin','pointer-events':'none'},bifrostPin);
 const bifrostCommanderPortrait=admiralMedallion(bifrostArt,'#ecc1ff');
 const bifrostArtName=make('text',{class:'target-name',y:40},bifrostArt);
 const bifrostArtVessel=make('text',{class:'target-name vessel-marker-subtitle',y:54},bifrostArt);
 const piratePin=make('g',{class:'pirate-map-pin target',display:'none','data-location':pirateId,tabindex:0,role:'button',
  'aria-label':'Blackwake, pirate vessel','aria-pressed':'false'},get('galaxy-pirate'));
 const pirateHit=make('circle',{class:'world-hit',r:38},piratePin);
 const pirateArt=make('g',{'pointer-events':'none'},piratePin);
 make('path',{d:'M0-15 13 8 0 5-13 8Z',fill:'#751d38',stroke:'#ffb4a4','stroke-width':2},pirateArt);
 make('text',{class:'target-name',y:24},pirateArt).textContent='Blackwake';
 activatePin(piratePin,pirateId);
 const crossPin=make('g',{class:'target cross-map-pin',display:'none','data-location':crossId,tabindex:0,role:'button',
  'aria-label':'Cross Battle: Blackwake and Bifrost','aria-pressed':'false'},get('galaxy-engagement'));
 const crossArt=make('g',{},crossPin);
 make('circle',{r:24,fill:'transparent'},crossArt);
 make('circle',{r:14,fill:'#351d30',stroke:'#ffac93','stroke-width':2},crossArt);
 make('path',{d:'M-6-6 6 6 M6-6-6 6',fill:'none',stroke:'#fff0e3','stroke-width':3,'stroke-linecap':'round'},crossArt);
 activatePin(crossPin,crossId);
 const chartBifrost=()=>cross?{...cross.attacker,sector:cross.location.sector,phase:'engaged'}:bifrostSnapshot;
 const carrierStripTitle=get('carrier-strip-title'),carrierStripVessel=get('carrier-strip-vessel');
 const commanderDetail=get('location-commander');
 const contactMedia=get('location-contact-media');
 const vesselImages=new Map([[pegasusId,get('location-pegasus-image')],[bifrostId,get('location-bifrost-image')]]);
 const commanderImages=new Map([['bishop',get('location-bishop-image')],['adaline',get('location-adaline-image')]]);
 const contactImagesReady=new Set();
 for(const image of [...vesselImages.values(),...commanderImages.values()]){
  image?.addEventListener('load',()=>{contactImagesReady.add(image);showContactImages(vesselAt(chosen));});
  image?.addEventListener('error',()=>{contactImagesReady.delete(image);showContactImages(vesselAt(chosen));});
 }
 function showContactImages(id){
  const cmd=id?vessels.get(id).commander:null;
  const shipImage=vesselImages.get(id),commanderImage=commanderImages.get(cmd?.id);
  const show=(images,selected,alt)=>{
   for(const image of images.values())if(image)image.hidden=image!==selected||!contactImagesReady.has(image);
   if(!selected)return false;
   changed(selected,'alt',alt);
   const source=selected.getAttribute('data-src');
   if(source&&!selected.getAttribute('src'))selected.setAttribute('src',source);
   return !selected.hidden;
  };
  const shipReady=show(vesselImages,shipImage,id?'Top view of '+vesselName(id):'');
  const commanderReady=show(commanderImages,commanderImage,cmd?'Portrait of '+commanderLabel(id):'');
  if(contactMedia)contactMedia.hidden=!shipReady&&!commanderReady;
 }
 function paintIdentity(id){
  const guild=guildLabel(id),subtitle=vesselSubtitle(id),name=vesselName(id);
  if(id===pegasusId){
   carrierCommanderPortrait(vessels.get(id).commander);
   carrierArtName.textContent=carrierBlipName.textContent=guild;
   carrierArtVessel.textContent=carrierBlipVessel.textContent=subtitle;
   cap.setAttribute('aria-label',guild+' · '+subtitle);
   if(carrierStripTitle)carrierStripTitle.textContent=guild;
   if(carrierStripVessel)carrierStripVessel.textContent=subtitle;
  }else{
   bifrostCommanderPortrait(vessels.get(id).commander);
   bifrostArtName.textContent=bifrostBlipName.textContent=guild;
   bifrostArtVessel.textContent=bifrostBlipVessel.textContent=subtitle;
   bifrostPin.setAttribute('aria-label',guild+' · '+subtitle);
   if(bifrostButton&&!picker){bifrostButton.textContent=name;bifrostButton.setAttribute('aria-label','Find '+name+' on the chart');}
   if(companyLink)companyLink.textContent='View '+name+' in Guild Directory';
  }
  const option=Array.from(finder.options??[]).find(entry=>entry.value===id);
  if(option)option.textContent=guild+' · '+name;
  if(vesselAt(chosen)===id)updateDetail();
 }
 async function loadIdentity(id){
  const current=await identity?.load?.(id);
  if(current?.vessel.id!==id)return;
  vessels.set(id,current);
  paintIdentity(id);
 }

 function activatePin(pin,id){
  pin.addEventListener('click',e=>{if(!transit&&e.detail===0&&pointers.size===0)pick(id,true,true);});
  pin.addEventListener('keydown',e=>{
   if(!transit&&!e.repeat&&(e.key==='Enter'||e.key===' ')){e.preventDefault();pick(id,true,true);}
  });
 }
 activatePin(cap,pegasusId);activatePin(bifrostPin,'bifrost');
 for(const [id,record] of Object.entries(tiles)){
  const group=make('g',{'data-tile':id},markers),pin=new Map();
  pinsByTile.set(id,{group,pin});
  for(const w of record.worlds){
   if(w===home)continue;
   const g=make('g',{class:'target'+(w.poi?' signal':w.big?' moon':''),'data-location':w.id,tabindex:0,role:'button','aria-label':w.name+', '+w.type,'aria-pressed':'false',transform:'translate('+w.x+' '+w.y+')'},group);
   const hit=make('circle',{class:'world-hit',r:34},g);
   make('circle',{class:'world-orbit',r:w.big?42:28},g);
   if(w.poi){
    make('path',{d:'M0-23 24 0 0 23-24 0Z',fill:'#492d4d',stroke:'#f2b095','stroke-width':2},g);
    make('path',{d:'M-14 7l5-10 8-4 6 5 7-3 3 10-10 5zM-4-1l4 5 4-1',fill:'#a56275',stroke:'#ffb995','stroke-width':1.2},g);
    make('circle',{cx:9,cy:-12,r:2.5,fill:'#ffbd88'},g);
   }else make('use',{href:'#'+w.art,x:w.big?-52:-30,y:w.big?-47:-27,width:w.big?104:60,height:w.big?94:54,'pointer-events':'none'},g);
   make('text',{class:'target-name',y:w.big?60:47},g).textContent=w.name;
   pin.set(w.id,{g,hit});activatePin(g,w.id);
  }
 }
 let loaded=false;
 if(typeof window.Image==='function'){
  const image=new window.Image();image.onload=()=>{loaded=true;showPortrait(find(chosen));};image.src='./galaxy-planets.webp';
 }
 function showPortrait(w){
  portrait.hidden=!loaded||!frames[w?.art];
  if(!portrait.hidden){const [x,y]=frames[w.art];portrait.style.setProperty('--portrait-x',x+'%');portrait.style.setProperty('--portrait-y',y+'%');}
 }
 function updateDetail(){
  const w=find(chosen),scanned=surveyed.has(chosen),id=vesselAt(chosen);
  const pirate=chosen===pirateId&&cross,engagement=chosen===crossId&&cross,bifrostView=chartBifrost();
  label.textContent=engagement?'Cross Battle':pirate?'Blackwake':id?guildLabel(id):w?.name??tile().name;
  kind.textContent=engagement?'Bifrost vs Blackwake':pirate?'Pirate multicrew vessel':id?vesselSubtitle(id):w?.type??'Uncharted tile';
  if(commanderDetail){commanderDetail.hidden=!id;commanderDetail.textContent=id?commanderLabel(id):'';}
  sector.textContent=(pirate||engagement)?tiles[cross.location.sector].name:chosen==='bifrost'?(bifrostView?.sector?tiles[bifrostView.sector].name:'Signal pending'):w?.code??tileCode(tile());
  description.textContent=engagement?'Intercept from your own approach, reinforce Bifrost from its side, or watch the battle.':pirate?'Bifrost has intercepted this pirate vessel. Join the existing Cross Battle from your own approach.':id===bifrostId?(cross?'Bifrost is engaging Blackwake. Reinforcements join Bifrost’s side and approach.':'This vessel follows an independent patrol.'):id===pegasusId?'The carrier crew pilots this ship independently.':scanned?w.survey:w?.copy??'No charted destinations yet. Your carrier can still fly through.';
  const message=(pirate||engagement)?'Cross Battle active.':chosen==='bifrost'?(cross?'Engaged with Blackwake · position held':bifrostReadout):scanned?'Survey recorded by the carrier crew.':w?.poi?'Awaiting a nearby crew survey.':readout;
  if(status.textContent!==message)status.textContent=message;
  if(companyLink)companyLink.hidden=!!picker||chosen!=='bifrost';
  if(visitVessel){
   visitVessel.hidden=!!picker||!id;
   if(id&&!picker){changed(visitVessel,'href','./carrier.html?vessel='+id);visitVessel.textContent='Visit '+vesselName(id);}
  }
  showPortrait(w);showContactImages(id);updateFlightLink(id);updateCrossAction();
 }
 function pick(id,recenter=false,reveal=false){
  if(id===pegasusId)id='home';
  const pirate=(id===pirateId||id===crossId)&&cross;
  const w=find(id);if(!pirate&&!w&&!vesselAt(id))return;
  if(pirate&&recenter){
   if(tileId!==cross.location.sector)enterTile(cross.location.sector);
   const point=id===pirateId?cross.pirate:cross.location;cameraX=point.x;cameraY=point.y;
  }
  if(id!=='home'&&reveal)pendingPegasusLocate=false;
  if(id==='bifrost'&&recenter){
   bifrostSelected=true;
   const b=chartBifrost();
   if(b?.sector){
    pendingBifrostLocate=false;
    if(tileId!==b.sector)enterTile(b.sector);
    cameraX=b.x;cameraY=b.y;
   }else pendingBifrostLocate=true;
  }
  else if(id!=='bifrost'&&reveal)pendingBifrostLocate=false;
  const {pin}=pinsByTile.get(tileId);
  pin.get(chosen)?.g.setAttribute('aria-pressed','false');
  chosen=id;pin.get(id)?.g.setAttribute('aria-pressed','true');cap.setAttribute('aria-pressed',String(id==='home'));
  piratePin.setAttribute('aria-pressed',String(id===pirateId));
  crossPin.setAttribute('aria-pressed',String(id===crossId));
  bifrostPin.setAttribute('aria-pressed',String(id==='bifrost'));
  if(bifrostButton)bifrostButton.setAttribute('aria-pressed',String(vesselAt(id)===(picker?pickerTarget:bifrostId)));
  updateDetail();
  if(reveal)details.hidden=false;
  if(recenter){if(id==='home'){locate();return;}if(id!=='bifrost'&&!pirate){cameraX=w.x;cameraY=w.y;}render();}
 }
 function scaleLimit(next){
  const overview=Math.min(width/(worldW+36),height/(worldH+36));
  return clamp(next,Math.max(overview,width<690?Math.max(width/1725,height/(south-north+36)):0),base*2.5);
 }
 function canLocate(){return shipKnown&&(helmMode||!['connecting','unavailable','stale'].includes(flightPhase));}
 function renderLocate(){
  const ready=canLocate(),away=ready&&shipSector!==tileId;
  const text=away?'Go to Carrier':'⌖';
  if(center.textContent!==text)center.textContent=text;
  if(center.disabled!==!ready)center.disabled=!ready;
  changed(center,'aria-label',away?'Go to Carrier':'Locate carrier');
  changed(center,'title',away?'View the carrier in '+tiles[shipSector].name:ready?'Center the chart on the carrier':'Carrier signal unavailable');
  changed(view,'data-carrier-away',String(away));
  const copy=helmMode?'HELM TEST · TAP SPACE TO STEER':away?'CARRIER OFF THIS CHART':'DRAG / PINCH · TAP TO INSPECT';
  if(hint.textContent!==copy)hint.textContent=copy;
 }
 function render(){
  renderLocate();
  const w=width/scale,h=height/scale;
  cameraX=w>=worldW?worldW/2:clamp(cameraX,w/2,worldW-w/2);
  cameraY=h>=south-north?(north+south)/2:clamp(cameraY,north+h/2,south-h/2);
  changed(chart,'viewBox',[cameraX-w/2,cameraY-h/2,w,h].map(n=>n.toFixed(3)).join(' '));
  // Backdrop moves less than the physical chart; nearby stars move faster than the nebula.
  const px=motion?.matches?0:cameraX-worldW/2,py=motion?.matches?0:cameraY-(north+south)/2;
  changed(nebula,'transform','translate('+(px*.27).toFixed(2)+' '+(py*.21).toFixed(2)+')');
  changed(sky,'transform','translate('+(px*.12).toFixed(2)+' '+(py*.09).toFixed(2)+')');
  const hit=Math.max(29,22/scale).toFixed(2),sizeKey=tileId+':'+hit;
  if(sized!==sizeKey){
   sized=sizeKey;capHit.setAttribute('r',hit);bifrostHit.setAttribute('r',hit);
   for(const {hit:circle} of pinsByTile.get(tileId).pin.values())circle.setAttribute('r',hit);
  }
  const showPirate=cross&&cross.location.sector===tileId&&!transit&&!picker;
  if(showPirate){
   piratePin.removeAttribute('display');
   changed(piratePin,'transform','translate('+cross.pirate.x.toFixed(2)+' '+cross.pirate.y.toFixed(2)+')');
   changed(crossPin,'transform','translate('+cross.location.x.toFixed(2)+' '+cross.location.y.toFixed(2)+')');
   changed(crossArt,'transform','scale('+(1/scale).toFixed(4)+')');
   crossPin.removeAttribute('display');
   changed(pirateHit,'r',hit);
  }else{changed(piratePin,'display','none');changed(crossPin,'display','none');}
  changed(cap,'transform','translate('+ship.x.toFixed(2)+' '+ship.y.toFixed(2)+')');
  const overview=w>1550,look=(overview?'blip:':'hull:')+scale.toFixed(5);
  if(figure!==look){
   figure=look;
   if(overview){
    carrierArt.setAttribute('display','none');blip.removeAttribute('display');
    blip.setAttribute('transform','scale('+(1/scale).toFixed(3)+')');
    bifrostArt.setAttribute('display','none');bifrostBlip.removeAttribute('display');
    bifrostBlip.setAttribute('transform','scale('+(1/scale).toFixed(3)+')');
   }else{
    blip.setAttribute('display','none');carrierArt.removeAttribute('display');
    const transform='scale('+(clamp(.26+scale*1.05,.57,.76)/scale).toFixed(3)+')';
    carrierArt.setAttribute('transform',transform);
    bifrostBlip.setAttribute('display','none');bifrostArt.removeAttribute('display');
    bifrostArt.setAttribute('transform',transform);
   }
  }
  const shownBifrost=chartBifrost();
  if(shownBifrost?.sector===tileId){
   if(bifrostPin.getAttribute('display')==='none')bifrostPin.removeAttribute('display');
   changed(bifrostPin,'transform','translate('+shownBifrost.x.toFixed(2)+' '+shownBifrost.y.toFixed(2)+')');
  }else changed(bifrostPin,'display','none');
  const onScreen=shipKnown&&shipSector===tileId;
  if(onScreen){if(cap.getAttribute('display')==='none')cap.removeAttribute('display');}
  else changed(cap,'display','none');
  const next=helmMode?travel:planPoint;
  if(onScreen&&next&&Math.hypot(next.x-ship.x,next.y-ship.y)>8){
   if(course.getAttribute('display')==='none')course.removeAttribute('display');
   changed(course,'d','M'+ship.x.toFixed(2)+' '+ship.y.toFixed(2)+'L'+next.x.toFixed(2)+' '+next.y.toFixed(2));
  }else changed(course,'display','none');
  const maxed=scale>=base*2.5-1e-5,mined=scale<=scaleLimit(0)+1e-5;
  if(plus.disabled!==maxed)plus.disabled=maxed;
  if(minus.disabled!==mined)minus.disabled=mined;
  if(scaleShown!==scale){
   scaleShown=scale;
   const unit=[20,50,100,200,500,1000].find(n=>n*scale>=43)??1000;
   scaleLabel.textContent=unit+' u';scaleLine.style.setProperty('width',Math.round(unit*scale)+'px');
  }
 }
 function updateCarrierStrip(){
  const motion=helmMode?'helm':flightPhase,speed=shipKnown?String(Math.round(ship.speed)):'—';
  const text={transit:'Sector transit',cruising:'Underway',holding:'Holding position',helm:'Local helm test',
   connecting:'Connecting…',unavailable:'Signal unavailable',stale:'Last known position'}[motion];
  if(stripMotion&&stripMotion.textContent!==text){
   stripMotion.textContent=text;stripMotion.setAttribute('data-motion',motion);
  }
  if(stripSpeed&&stripSpeed.textContent!==speed)stripSpeed.textContent=speed;
  if(stripSector){const sector=shipKnown?tiles[shipSector].name:'Shared chart';if(stripSector.textContent!==sector)stripSector.textContent=sector;}
  if(stripDestination){
   const to=!helmMode&&destination&&(flightPhase==='cruising'||flightPhase==='transit')?'To '+destination:'';
   if(stripDestination.hidden!==!to)stripDestination.hidden=!to;
   if(stripDestination.textContent!==to)stripDestination.textContent=to;
  }
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
 function enterTile(id,arrival=false){
  tileId=id;const record=tile();chosen=null;details.hidden=true;
  for(const [name,{group,pin}] of pinsByTile){
   for(const {g} of pin.values())g.setAttribute('aria-pressed','false');
   if(name===id)group.removeAttribute('display');else group.setAttribute('display','none');
  }
  for(const name of ['galaxy-atlas-art','galaxy-sector-labels']){
   const el=get(name);if(record.worlds.length)el.removeAttribute('display');else el.setAttribute('display','none');
  }
  get('galaxy-sector-title').textContent=record.name;get('galaxy-sector-coordinate').textContent='TILE '+tileCode(record);
  get('galaxy-sector-number').textContent='Sector '+String(record.number).padStart(2,'0');
  for(const style of ['reach','frontier']){
   const group=get('galaxy-backdrop-'+style);
   if(record.backdrop===style)group.removeAttribute('display');else group.setAttribute('display','none');
  }
  finder.replaceChildren();
  const placeholder=document.createElement('option');
  placeholder.value='';placeholder.disabled=true;placeholder.textContent='Choose a location';finder.append(placeholder);
  for(const id of vessels.keys()){
   const option=document.createElement('option');option.value=id;option.textContent=guildLabel(id)+' · '+vesselName(id);finder.append(option);
  }
  for(const w of record.worlds.filter(w=>w!==home)){
   const option=document.createElement('option');option.value=w.id;option.textContent=w.name;finder.append(option);
  }
  pirateOption=engagementOption=null;if(cross&&!transit&&!picker)paintPirateOption();
  finder.value='';
  if(arrival){cameraX=ship.x;cameraY=ship.y;}
  else [cameraX,cameraY]=record.origin;
  pick('home');updateCarrierStrip();render();
 }
 function announce(message){
  readout=message;
  if(chosen!=='bifrost'&&chosen!==pirateId&&chosen!==crossId&&!find(chosen)?.poi&&status.textContent!==message)status.textContent=message;
 }
 function updateAngle(angle,dt){
  const delta=((angle-ship.aim+540)%360)-180;
  const turn=clamp(delta*(1-Math.exp(-dt*3.2)),-94*dt,94*dt);
  ship.aim=(ship.aim+turn+360)%360;
 }
 function localFlight(dt){
  if(!travel)return;
  const dx=travel.x-ship.x,dy=travel.y-ship.y,gap=Math.hypot(dx,dy);
  const goal=(450+Math.atan2(dy,dx)*180/Math.PI)%360;
  const delta=((goal-ship.aim+540)%360)-180;
  ship.aim=(ship.aim+clamp(delta,-42*dt/helmTimeScale,42*dt/helmTimeScale)+360)%360;
  const along=Math.max(0,Math.cos(delta*Math.PI/180));
  const desired=Math.min(cruise,Math.sqrt(2*brake*gap))*along**2;
  const prior=ship.speed;ship.speed=prior+clamp(desired-prior,-brake*dt,throttle*dt);
  const step=Math.min(gap,(prior+ship.speed)*.5*dt),heading=ship.aim*Math.PI/180;
  ship.x=clamp(ship.x+Math.sin(heading)*step,42,worldW-42);
  ship.y=clamp(ship.y-Math.cos(heading)*step,north+42,south-42);
  if(gap<5){ship.speed=0;travel=null;}
 }
 const phaseText={cruising:'Carrier cruising under crew control.',holding:'Carrier holding position before its next course.',
  transit:'The carrier is crossing into the next sector.',connecting:'Connecting to the shared chart.',
  unavailable:'The shared carrier signal is unavailable.',stale:'Signal lost. Showing the last known position.'};
 function syncSurvey(snapshot){
  if(!snapshot?.corsairSurveyed||surveyed.has(corsair.id))return;
  surveyed.add(corsair.id);
  pinsByTile.get('reach').pin.get(corsair.id).g.setAttribute('data-surveyed','');
  if(chosen===corsair.id)updateDetail();
 }
 function useShared(snapshot,dt,snap=false){
  const phase=snapshot?.phase??'unavailable';
  if(flightPhase!==phase||snap){flightPhase=phase;announce(phaseText[phase]??phaseText.unavailable);}
  if(!snapshot?.sector||!tiles[snapshot.sector])return;
  const first=!shipKnown,crossed=shipSector!==snapshot.sector;
  shipKnown=true;shipSector=snapshot.sector;destination=snapshot.destination??null;planPoint=snapshot.next??null;
  ship.x=snapshot.x;ship.y=snapshot.y;ship.speed=snapshot.speed;
  if(first||snap||crossed)ship.aim=snapshot.heading;else updateAngle(snapshot.heading,dt);
  if(first&&!bifrostSelected&&snapshot.sector!==tileId)enterTile(snapshot.sector);
  if(pendingPegasusLocate&&canLocate()){pendingPegasusLocate=false;pick('home',true,true);}
 }
 function useBifrost(snapshot){
  const current=snapshot?.id==='bifrost'&&Object.hasOwn(tiles,snapshot.sector)?snapshot:null;
  const prior=bifrostSnapshot;
  bifrostSnapshot=current;
  const phase=current?.phase??(snapshot?.phase==='connecting'?'connecting':'unavailable');
  const text={
   connecting:'Waiting for Bifrost’s signal.',
   unavailable:'Bifrost’s live signal is unavailable.',
   stale:'Signal lost. Showing Bifrost’s last known position.',
   transit:'Bifrost is crossing to the next sector.',
   holding:'Bifrost is holding position.',
   cruising:'Bifrost is underway.'
  };
  const message=(text[phase]??text.unavailable)+(current?.destination&&phase==='cruising'?' Destination: '+current.destination+'.':'');
  if(message!==bifrostReadout||prior?.sector!==current?.sector){
   bifrostReadout=message;
   if(chosen==='bifrost')updateDetail();
  }
  if(current&&pendingBifrostLocate)pick('bifrost',true,true);
 }
 function advance(now){
  window.requestAnimationFrame(advance);
  if(document.hidden){last=null;return;}
  const dt=last===null?0:Math.min(.18,Math.max(0,(now-last)/1000));last=now;
  const snapshot=online?.sample(now);
  syncSurvey(snapshot);
  const disabled=!helmMode&&(!snapshot?.sector||snapshot.phase==='stale');
  if(helm.disabled!==disabled)helm.disabled=disabled;
  if(helmMode){const count=Math.max(1,Math.ceil(dt/.032));for(let n=0;n<count;n++)localFlight(dt/count);}
  else useShared(snapshot,Math.min(dt,.05));
  useBifrost(bifrostOnline?.sample(now));
  paintTransit(snapshot);refreshCross(now);updateCarrierStrip();render();
 }
 function steer(x,y){
  if(!helmMode)return;
  travel={x:clamp(x,42,worldW-42),y:clamp(y,north+42,south-42)};
  details.hidden=true;
 }
 helm.addEventListener('click',()=>{
  if(picker||transit)return;
  const snapshot=online?.sample();
  if(!helmMode&&(!snapshot?.sector||snapshot.phase==='stale'))return;
  helmMode=!helmMode;travel=null;
  helm.setAttribute('aria-pressed',String(helmMode));
  helm.textContent=helmMode?'Release Helm':'Take Helm';
  if(helmMode){ship.speed=0;locate();announce('Local helm test. The shared carrier keeps moving independently.');}
  else{useShared(snapshot,0,true);if(!snapshot?.sector){shipKnown=false;cap.setAttribute('display','none');}}
  updateCarrierStrip();render();
 });
 function locate(){if(!canLocate())return;if(tileId!==shipSector)enterTile(shipSector);cameraX=ship.x;cameraY=ship.y;render();}
 plus.addEventListener('click',()=>adjust(1.44));minus.addEventListener('click',()=>adjust(1/1.44));
 center.addEventListener('click',locate);bifrostButton?.addEventListener('click',()=>pick(picker?pickerTarget:'bifrost',true,true));
 updatePickerLabel();
 const finderMenu=get('galaxy-location-finder'),finderToggle=get('galaxy-finder-toggle');
 const closeFinder=()=>{
  if(!finderMenu?.open)return;
  finderMenu.open=false;finderToggle?.focus({preventScroll:true});
 };
 finder.addEventListener('change',()=>{
  const id=finder.value;if(!id)return;
  finder.value='';pick(id,true,true);closeFinder();
 });
 finderMenu?.addEventListener('keydown',e=>{if(e.key==='Escape'&&finderMenu.open){e.preventDefault();closeFinder();}});
 const clearDetails=()=>{details.hidden=true;chart.focus({preventScroll:true});};
 closeDetail.addEventListener('click',clearDetails);
 details.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();clearDetails();}});
 chart.addEventListener('keydown',e=>{
  if(transit||e.target!==chart||e.altKey||e.ctrlKey||e.metaKey)return;
  const moves={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]};
  if(moves[e.key]){const [x,y]=moves[e.key];cameraX+=86*x/scale;cameraY+=86*y/scale;render();e.preventDefault();}
  else if(e.key==='Home'){locate();e.preventDefault();}
  else if(e.key==='Enter'&&helmMode){steer(cameraX,cameraY);e.preventDefault();}
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
    x:cameraX+midpoint.x/scale,y:cameraY+midpoint.y/scale};
  }else gesture={type:'drag',x:a.x,y:a.y,cameraX,cameraY,moved};
 }
 chart.addEventListener('pointerdown',e=>{
  if(transit||e.button!==0||pointers.has(e.pointerId)||pointers.size>=2)return;
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
  gesture.moved=true;view.classList.add('dragging');
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
  else if(helmMode){const point=offset(finger.x,finger.y);steer(cameraX+point.x/scale,cameraY+point.y/scale);}
 };
 // Capture normally keeps all events on the chart; window also catches a
 // release if touch capture is interrupted by the browser or device.
 for(const [event,fn] of [['pointermove',move],['pointerup',release],['pointercancel',release]])window.addEventListener(event,fn);
 chart.addEventListener('lostpointercapture',release);
 window.addEventListener('blur',()=>{pointers.clear();rebase();view.classList.remove('dragging');});
 if(window.ResizeObserver){const observer=new window.ResizeObserver(fit);observer.observe(view);}
 else window.addEventListener('resize',fit);
 function refreshCaptainAlert(){
  if(!captainAlert)return;
  const fresh=[...(window.RiftMissions?.getNewBriefings?.()??[])];
  const rendezvous=window.RiftRendezvous;
  if(rendezvous&&rendezvous.generation()!==undefined&&!rendezvous.get())
   fresh.push({id:'rendezvous',title:'Wing Rendezvous'});
  captainAlert.hidden=fresh.length===0;
  if(fresh.length){
   const names=fresh.map(item=>item.title).join(', ');
   captainAlert.setAttribute('title','Available briefings: '+names);
   captainAlert.setAttribute('aria-label','Admiral Bishop: new mission available. '+names+'. Go to the Bridge.');
  }else{
   captainAlert.removeAttribute('title');captainAlert.removeAttribute('aria-label');
  }
 }
 for(const event of ['pageshow','storage','rift:walletchange'])window.addEventListener(event,refreshCaptainAlert);
 refreshCaptainAlert();
 motion?.addEventListener?.('change',render);
 fit();enterTile('reach');useShared(online?.sample(),0);useBifrost(bifrostOnline?.sample());updateCarrierStrip();render();refreshParking();refreshCross(0);window.requestAnimationFrame(advance);
 for(const id of vessels.keys()){paintIdentity(id);loadIdentity(id).then(updatePickerLabel).catch(()=>{});}
})();
