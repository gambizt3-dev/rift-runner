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
 // Project the larger chart without changing shared coordinates, routes, or icon sizes.
 const chartExpansion=1.15;
 const project=value=>value*chartExpansion;
 const plot=value=>project(value).toFixed(2);
 const point=(x,y)=>plot(x)+' '+plot(y);
 const at=(x,y)=>'translate('+point(x,y)+')';
 const data=window.RiftGalaxyCatalog.worlds;
 // A permanent chart destination; the existing shared-room feed controls joining.
 const pirateHideout=Object.freeze({id:'pirate-hideout',name:'Pirate Hideout',type:'Hidden asteroid outpost',code:'F–11',x:690,y:1380,
  copy:'A pirate outpost tucked into a hollow asteroid near the Corsair Cluster. Launch an expedition into the shared Blackwake battle when the room is open.'});
 // Adjacent chart tiles share one renderer. Blank neighbors have no destinations.
 const tiles={
  reach:{name:'The Outer Reach',number:1,backdrop:'reach',col:0,row:0,worlds:[...data,pirateHideout],links:{east:'frontier'},defaultWorld:'home',origin:[620,469]},
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
 const capitalNext=get('galaxy-next-capital'),capitalCycle=[bifrostId,pegasusId];
 let quickCapital=bifrostId;
 function syncCapitalShortcut(){
  if(!bifrostButton)return;
  const id=picker?pickerTarget:quickCapital,name=vesselName(id);
  bifrostButton.textContent=name;
  changed(bifrostButton,'aria-label','Find '+name+' on the chart');
  changed(bifrostButton,'aria-pressed',String(vesselAt(chosen)===id));
 }
 const shortFlight=window.RiftShortFlight;
 const rangeNote=get('galaxy-flight-range'),eventAge=get('galaxy-event-age');
 const livePoint=id=>id===bifrostId?(cross?{...cross.attacker,sector:cross.location.sector}:bifrostOnline?.sample()):online?.sample();
 const distanceTo=(id,point)=>shortFlight.distance(livePoint(id),point);
 const withinRange=(id,point)=>{const d=distanceTo(id,point);return d!==null&&d<=shortFlight.maxRange;};
 let selectionSent=false,nextRangeRefresh=0;
 if(picker){
  selectFlight?.addEventListener('click',()=>{
   const id=vesselAt(chosen);
   if(selectionSent||!id||id!==pickerTarget||selectFlight.hidden||!withinRange(picker,livePoint(id)))return;
   selectionSent=true;selectFlight.disabled=true;
   window.parent.postMessage({type:'rift-fighter-transfer-select',from:picker,to:id},window.location.origin);
  });
 }
 function updatePickerLabel(){
  syncCapitalShortcut();
 }
 const privateMirror=window.location?.hostname==='rift-runner.boundlessghost16.chatgpt.site';
 const onlineGameOrigin=privateMirror?'https://rift-runner.gambizt3.workers.dev':'';
 const sharedId='blackwake-online',sharedAllies=get('galaxy-online-allies'),sharedOpposition=get('galaxy-online-opposition');
 let shared=null,sharedOption=null,sharedInFlight=false,sharedSettled=false,sharedChecked=-Infinity;
 const pirateId='blackwake',crossId='blackwake-engagement',crossAction=get('galaxy-cross-action');
 let cross=null,crossPending=false,crossChecked=-Infinity,pirateOption=null,engagementOption=null;
 const home=data[0],corsair=data.find(w=>w.id==='pirates'),pinsByTile=new Map(),
  find=(id)=>tile().worlds.find(w=>w.id===id);
 let tileId='reach',chosen=null,cameraX=620,cameraY=469,width=1,height=1,base=1,scale=1;
 let travel=null,last=null,gesture=null,hasFitted=false,sized='',figure='',readout='Connecting to the shared chart.',scaleShown=0;
 let helmMode=false,shipKnown=false,flightPhase='connecting',shipSector='reach',destination=null,planPoint=null;
 const pointers=new Map(),surveyed=new Set(),ship={x:home.x,y:home.y,aim:0,speed:0};
 const tile=()=>tiles[tileId],clamp=(n,a,b)=>Math.min(b,Math.max(a,n));
 const worldToScreen=()=>scale*chartExpansion;
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
   path='M'+point(a.x-tiles[sectorId].col*worldW,a.y)+' L'+point(b.x-tiles[sectorId].col*worldW,b.y);
  }else{
   // Keep a visible progress icon without inventing either carrier position.
   const half=width/worldToScreen()*.22;
   x=cameraX+interpolate(-half,half,progress);y=cameraY;
   path='M'+point(cameraX-half,y)+' H'+plot(cameraX+half);
  }
  if(a&&b){cameraX=x;cameraY=y;}
  changed(transferPath,'d',path);
  fighterPin.removeAttribute('display');
  changed(fighterPin,'transform',at(x,y));
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
   if(!selectFlight.hidden){selectFlight.textContent='Fly to '+vesselName(id);selectFlight.disabled=selectionSent||!withinRange(picker,livePoint(id));}
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
  const from=picker||parked,offered=!!(from&&id&&id!==from);
  const d=offered?distanceTo(from,livePoint(id)):null;
  if(rangeNote){
   rangeNote.hidden=!offered||d!==null&&d<=shortFlight.maxRange;
   const copy=d===null?'Waiting for both carrier signals.':'Outside short-flight range ('+Math.ceil(d)+' / '+shortFlight.maxRange+' u). Stay aboard until the carriers are closer.';
   if(!rangeNote.hidden&&rangeNote.textContent!==copy)rangeNote.textContent=copy;
  }
  flyToVessel.hidden=!offered||!!picker||d===null||d>shortFlight.maxRange;
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
  const berthed=publicContact&&parked?.vessel===pegasusId&&parked.revision;
  const eligible=berthed&&withinRange(pegasusId,cross.location);
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
   if(!hint.hidden)hint.textContent=berthed?'Blackwake is outside fighter range or Pegasus’s signal is unavailable. Move Pegasus closer before launching.':'To join this encounter, use an owned fighter with a confirmed berth on Pegasus.';
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
   return {location:{sector:e.sector,x:e.x,y:e.y},pirate:e.pirate,attacker:e.attacker,startsAt:e.startsAt,endsAt:e.endsAt};
  }).catch(()=>null).then(showCross).finally(()=>{crossPending=false;});
 }
 const invitationKey='rift-runner.galaxy-invite.blackwake.v1';
 const inviteAlert=get('galaxy-battle-alert'),invite=get('galaxy-battle-invite');
 const inviteName=get('galaxy-battle-admiral'),inviteMessage=get('galaxy-battle-message'),invitePortrait=get('galaxy-battle-portrait');
 const inviteJoin=get('galaxy-battle-join'),inviteDecline=get('galaxy-battle-decline');
 let seenInvite=null,openedInvite=null;
 try{seenInvite=window.sessionStorage?.getItem(invitationKey)??null;}catch{}
 const sharedLink=side=>(onlineGameOrigin?onlineGameOrigin+'/':'./')+'index.html?multiplayer=blackwake&side='+side;
 function updateInvite(){
  if(!invite||!inviteAlert)return;
  const round=!transit&&!picker&&shared?.joinable&&shared.status==='running'&&shared.sides.includes('allies')?shared.instance:null;
  if(!round||openedInvite&&openedInvite!==round){openedInvite=null;invite.hidden=true;}
  inviteAlert.hidden=!round||round===seenInvite||round===openedInvite;
  if(!round||openedInvite!==round)return;
  const id=window.RiftFighterParking.home(),entry=vessels.get(id),commander=entry?.commander;
  inviteName.textContent=commander?commanderLabel(id):'Fleet Command';
  inviteMessage.textContent='A Blackwake online test is running. Entering the test skips Galaxy Map travel and does not move your carrier.';
  const src=commanderArt.get(commander?.id);
  invitePortrait.hidden=!src;
  if(src){changed(invitePortrait,'src',src);changed(invitePortrait,'alt',commanderLabel(id));}
  else invitePortrait.removeAttribute('src');
  changed(inviteJoin,'href',sharedLink('allies'));
  invite.hidden=false;
 }
 function closeInvite(){
  openedInvite=null;
  if(invite)invite.hidden=true;
  if(!details.hidden)closeDetail?.focus?.({preventScroll:true});else chart.focus?.({preventScroll:true});
 }
 inviteAlert?.addEventListener('click',()=>{
  const round=shared?.instance;
  if(!round||inviteAlert.hidden)return;
  openedInvite=seenInvite=round;
  try{window.sessionStorage?.setItem(invitationKey,round);}catch{}
  details.hidden=true;updateInvite();inviteDecline?.focus?.({preventScroll:true});
 });
 inviteDecline?.addEventListener('click',closeInvite);
 invite?.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();closeInvite();}});
 function updateSharedEntry(){
  for(const [side,link] of [['allies',sharedAllies],['opposition',sharedOpposition]]){
   if(!link)continue;
   link.hidden=!(!transit&&!picker&&(chosen===sharedId||chosen===pirateHideout.id)&&shared?.joinable&&shared.sides.includes(side));
   if(link.hidden)link.removeAttribute('href');
   else changed(link,'href',sharedLink(side));
  }
 }
 function showSharedOption(){
  if(!sharedOption){
   sharedOption=document.createElement('option');sharedOption.value=sharedId;
   sharedOption.textContent='Blackwake · Online battle';finder.append(sharedOption);
  }
  sharedOption.hidden=sharedOption.disabled=shared?.status!=='running';
 }
 function refreshShared(now){
  const api=window.RiftMultiplayer;
  if(transit||picker||document.hidden||sharedInFlight||now-sharedChecked<12000||!api?.info)return;
  sharedInFlight=true;sharedChecked=now;
  api.info().then(data=>{
   const b=data?.battle;
   return data?.version===1&&b?.id==='blackwake'&&b.mode==='shared'&&['open','running','complete'].includes(b.status)&&
    Object.hasOwn(tiles,b.sector)&&Number.isFinite(b.x)&&Number.isFinite(b.y)&&b.x>=0&&b.x<=worldW&&b.y>=north&&b.y<=south&&
    typeof b.joinable==='boolean'&&Array.isArray(b.sides)&&b.sides.every(side=>side==='allies'||side==='opposition')?{
     x:b.x,y:b.y,sector:b.sector,status:b.status,age:Number.isSafeInteger(b.ageMs)&&b.ageMs>=0?b.ageMs:null,receivedAt:last??0,closeIn:Number.isSafeInteger(b.bifrostCloseInMs)&&b.bifrostCloseInMs>=0?b.bifrostCloseInMs:null,autonomous:b.autonomous===true&&b.status==='running',joinable:b.joinable&&b.status!=='complete',sides:[...b.sides],instance:typeof b.instance==='string'&&/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(b.instance)?b.instance:null
    }:null;
  }).catch(()=>null).then(result=>{
   const first=!sharedSettled;sharedSettled=true;
   if(!first&&!shared&&!result)return;
   shared=result;showSharedOption();updateInvite();
   if(chosen===sharedId){
    if(shared?.status==='running')updateDetail();
    else{chosen=null;details.hidden=true;sharedPin.setAttribute('aria-pressed','false');updateSharedEntry();}
   }else if(chosen===pirateHideout.id)updateDetail();
   render();
  }).finally(()=>{sharedInFlight=false;});
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
 function makeArmadaStars(pin){
  return make('g',{class:'armada-star',display:'none','aria-hidden':'true','pointer-events':'none'},pin);
 }
 const armadaStars=new Map([[pegasusId,makeArmadaStars(cap)],[bifrostId,makeArmadaStars(bifrostPin)]]);
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
 const sharedPin=make('g',{class:'target online-battle-pin',display:'none','data-location':sharedId,tabindex:0,role:'button',
  'aria-label':'Blackwake online battle','aria-pressed':'false'},get('galaxy-online'));
 const sharedArt=make('g',{},sharedPin);
 make('circle',{r:23,fill:'transparent'},sharedArt);
 make('path',{d:'M0-14 14 0 0 14-14 0Z',fill:'#113d43',stroke:'#8ff3e3','stroke-width':'2'},sharedArt);
 const sharedGlyph=make('path',{d:'M-7 2h3l2-6 3 8 2-3h4',fill:'none',stroke:'#d9fffa','stroke-width':'1.6','stroke-linejoin':'round'},sharedArt);
 const sharedLabel=make('text',{class:'target-name',y:24},sharedArt);
 activatePin(sharedPin,sharedId);
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
   if(companyLink)companyLink.textContent='View '+name+' in Guild Directory';
  }
  if(id===(picker?pickerTarget:quickCapital))syncCapitalShortcut();
  const option=Array.from(finder.options??[]).find(entry=>entry.value===id);
  if(option)option.textContent=guild+' · '+name;
  if(vesselAt(chosen)===id)updateDetail();
 }
 async function loadIdentity(id){
  const current=await identity?.load?.(id);
  if(current?.vessel.id!==id)return;
  vessels.set(id,current);
  paintIdentity(id);updateInvite();
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
   const g=make('g',{class:'target'+(w===pirateHideout?' hideout-pin':w.resupplyFor?' resupply-pin':w.resourceWorld?' resource-pin':w.poi?' signal':w.big?' moon':''),'data-location':w.id,tabindex:0,role:'button','aria-label':w.name+', '+w.type,'aria-pressed':'false',transform:at(w.x,w.y)},group);
   const hit=make('circle',{class:'world-hit',r:34},g);
   make('circle',{class:'world-orbit',r:w.resourceWorld?67:w.big?42:28},g);
   if(w===pirateHideout){
    make('path',{d:'M-23-8-15-20 7-24 21-13 25 5 13 20-9 22-24 11Z',fill:'#553727',stroke:'#f4bb83','stroke-width':'2.4'},g);
    make('path',{d:'M-11 11V-2L0-11 11-2V11H4V3H-4V11Z',fill:'#261b21',stroke:'#ffd098','stroke-width':'1.5'},g);
    make('circle',{cx:0,cy:-4,r:2.2,fill:'#f8ba77'},g);
   }else if(w.poi){
    make('path',{d:'M0-23 24 0 0 23-24 0Z',fill:'#492d4d',stroke:'#f2b095','stroke-width':2},g);
    make('path',{d:'M-14 7l5-10 8-4 6 5 7-3 3 10-10 5zM-4-1l4 5 4-1',fill:'#a56275',stroke:'#ffb995','stroke-width':1.2},g);
    make('circle',{cx:9,cy:-12,r:2.5,fill:'#ffbd88'},g);
   }else if(w.resupplyFor){
    const station=make('g',{class:'station-marker-art','pointer-events':'none','aria-hidden':'true'},g);
    make('image',{href:'./resupply-station-map.webp?v=2',x:-49.7,y:-41.2,width:84,height:84},station);
    for(const [cx,cy] of [[-39.2,-2.1],[.1,-31.9],[22.8,21.4]])make('circle',{class:'station-beacon',cx,cy,r:1.65},station);
   }
   else if(w.resourceWorld)make('use',{href:'#'+w.art,x:-82,y:-82,width:164,height:164,'pointer-events':'none'},g);
   else make('use',{href:'#'+w.art,x:w.big?-52:-30,y:w.big?-47:-27,width:w.big?104:60,height:w.big?94:54,'pointer-events':'none'},g);
   make('text',{class:'target-name',y:w.resourceWorld?91:w.resupplyFor?42:w.big?60:47},g).textContent=w.name;
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
 const manpowerPanel=get('location-manpower'),manpowerScore=get('location-manpower-score'),manpowerFactors=get('location-manpower-factors');
 const corvetteLoadout=get('location-corvette-loadout');
 const manpowerInputs=get('location-manpower-inputs'),manpowerCoverage=get('location-manpower-coverage');
 const armadas=new Map();
 function decodeArmada(body,id){
  const armada=body?.armada,list=armada?.vessels;
  if(body?.version!==1||body.vesselId!==id||!Array.isArray(list)||list.length<1||list.length>16||armada.vesselCount!==list.length)return null;
  if(new Set(list.map(v=>v?.id)).size!==list.length||
   list.filter(v=>v?.role==='command'&&v.id===id&&v.forward===0&&v.lateral===0).length!==1||
   !list.every(v=>typeof v?.id==='string'&&/^[a-z0-9-]{1,64}$/.test(v.id)&&typeof v.name==='string'&&v.name.length>0&&v.name.length<=80&&
    typeof v.vesselClass==='string'&&v.vesselClass.length>0&&v.vesselClass.length<=80&&
    (v.id===id?v.role==='command':v.role==='escort'&&[v.forward,v.lateral].every(n=>Number.isFinite(n)&&Math.abs(n)<=1500))))return null;
  const ready=armada.launchReady;
  const count=n=>Number.isSafeInteger(n)&&n>=0;
  const validPower=armada.coverage==='verified-npc-only'&&ready&&
   [ready.weaponPower,ready.manpower,ready.fighters,ready.availableNpcPilots,ready.deployedNpcPilots,
    ready.recoveringNpcPilots,ready.npcCapacity,ready.heldSwift,ready.heldBison].every(count)&&
   ready.availableNpcPilots===armada.availableNpcPilots&&
   ready.manpower===ready.weaponPower*ready.availableNpcPilots&&
   ready.availableNpcPilots+ready.deployedNpcPilots+ready.recoveringNpcPilots===ready.npcCapacity&&
   (ready.fighters>0||ready.weaponPower===0);
  const manpower=validPower?{power:ready.weaponPower,pilots:ready.availableNpcPilots,score:ready.manpower,
   fighters:ready.fighters,deployed:ready.deployedNpcPilots,recovering:ready.recoveringNpcPilots,
   capacity:ready.npcCapacity,swift:ready.heldSwift,bison:ready.heldBison}:null;
  return {manpower,vesselCount:list.length,vessels:list.map(v=>({
   id:v.id,name:v.name,vesselClass:v.vesselClass,role:v.role,forward:v.forward,lateral:v.lateral,
   ...(v.role==='escort'&&v.multicrew===true?{multicrew:true}:{}),
   ...(typeof v.hullModel==='string'&&/^[A-Za-z0-9][A-Za-z0-9 -]{0,39}$/.test(v.hullModel)&&v.hullModel.trim()===v.hullModel?{hullModel:v.hullModel}:{}),
   ...(v.role==='escort'&&v.multicrew===true&&v.commanderTitle==='Captain'&&typeof v.commanderName==='string'&&
    v.commanderName.trim()===v.commanderName&&v.commanderName.length>0&&v.commanderName.length<=80?{captain:v.commanderName}:{})
  }))};
 }
 function paintArmadaStars(overview){
  for(const [id,pin] of [[pegasusId,cap],[bifrostId,bifrostPin]]){
   const count=armadas.get(id)?.value?.vesselCount??0;
   const star=armadaStars.get(id);
   const active=!picker&&!transit&&count>1;
   if(active){
    const extra=count-1;
    if(star.getAttribute('data-members')!==String(extra)){
     star.replaceChildren();
     for(let i=0;i<extra;i++){
      const row=Math.floor(i/5),col=i%5,inRow=Math.min(5,extra-row*5);
      make('path',{d:'M0-7 2-2.2 7-2.2 3 1 4.4 6 0 3.1-4.4 6-3 1-7-2.2-2-2.2Z',
       transform:'translate('+((col-(inRow-1)/2)*15)+' '+(-row*15)+')',
       fill:'#ffdb6c',stroke:'#503719','stroke-width':1.15,'stroke-linejoin':'round'},star);
     }
     changed(star,'data-members',String(extra));
    }
    star.removeAttribute('display');
    changed(star,'transform','translate(0 '+(-(overview?15:28)/scale).toFixed(3)+') scale('+(1/scale).toFixed(4)+')');
   }else changed(star,'display','none');
   changed(pin,'aria-label',guildLabel(id)+' · '+vesselSubtitle(id)+(active?' · Armada of '+count+' vessels':''));
  }
 }
 const armadaRoster=get('location-armada-roster');
 const armadaArt=new Map([[pegasusId,'./carrier-capital.webp?v=133'],[bifrostId,'./bifrost-carrier.webp'],
  ['pegasus-corvette-escort','./corvette-rift4-scale-v6.webp']]);
 let rosterKey='';
 function paintArmadaRoster(id,formation){
  if(!armadaRoster)return;
  const list=formation?.vessels??[];
  armadaRoster.hidden=!list.length;
  const key=list.length?JSON.stringify([id,commanderLabel(id),list]):'';
  if(key===rosterKey)return;
  rosterKey=key;armadaRoster.replaceChildren();
  for(const vessel of [...list].sort((a,b)=>Number(b.role==='command')-Number(a.role==='command'))){
   const row=document.createElement('li'),source=armadaArt.get(vessel.id);
   const keel=vessel.id==='pegasus-corvette-escort';
   let toggle=null;
   if(source){
    const expander=document.createElement('details');
    expander.setAttribute('class','armada-ship-preview');
    expander.setAttribute('name','armada-ship-preview');
    toggle=document.createElement('summary');toggle.setAttribute('class','armada-ship-summary');
    const picture=(big)=>{
     const frame=document.createElement('span'),inside=document.createElement('span'),img=document.createElement('img');
     frame.setAttribute('class',big?'armada-ship-large':'armada-ship-thumbnail');
     inside.setAttribute('class',keel?'armada-keel-crop':'armada-ship-contain');
     img.setAttribute('alt',big?(keel?'Straight top-down view of the Keel-4 Corvette Resolute with four Size 4 Twin Turrets':'Top view of '+vessel.name):'');
     img.setAttribute('decoding','async');if(big)img.setAttribute('loading','lazy');
     img.addEventListener('error',()=>{inside.hidden=true;});img.setAttribute('src',source);
     inside.append(img);
     if(keel)for(const slot of ['port-forward','starboard-forward','port-aft','starboard-aft']){
      const turret=document.createElement('img');
      turret.setAttribute('class','armada-keel-turret');turret.setAttribute('data-socket',slot);
      turret.setAttribute('alt','');turret.setAttribute('aria-hidden','true');
      turret.setAttribute('decoding','async');if(big)turret.setAttribute('loading','lazy');
      turret.addEventListener('error',()=>{turret.hidden=true;});
      turret.setAttribute('src','./corvette-twin-s4.svg');
      inside.append(turret);
     }
     frame.append(inside);return frame;
    };
    toggle.append(picture(false));expander.append(toggle,picture(true));row.append(expander);
   }
   const copy=document.createElement('div'),name=document.createElement('strong'),desc=document.createElement('small');
   name.textContent=vessel.name;
   const lead=vessel.role==='command'?commanderLabel(id):vessel.captain?'Captain '+vessel.captain:null;
   desc.textContent=[vessel.hullModel,vessel.vesselClass,lead].filter(Boolean).join(' · ');
   copy.append(name,desc);
   if(toggle){
    const hint=document.createElement('small');
    hint.setAttribute('class','armada-ship-hint');hint.textContent='Tap to expand';
    copy.append(hint);toggle.append(copy);
   }else row.append(copy);
   armadaRoster.append(row);
  }
 }
 function paintManpower(id){
  if(corvetteLoadout){
   const hasCorvette=!picker&&!transit&&id===pegasusId&&armadas.get(id)?.value?.vessels.some(v=>v.role==='escort'&&v.vesselClass.toLowerCase()==='corvette');
   corvetteLoadout.hidden=!hasCorvette;
   if(hasCorvette)changed(corvetteLoadout,'href','./corvette-loadout.html');
   else corvetteLoadout.removeAttribute('href');
  }
  if(!manpowerPanel)return;
  manpowerPanel.hidden=!id||!!picker||!!transit;
  if(manpowerPanel.hidden){paintArmadaRoster(null,null);return;}
  const record=armadas.get(id),armada=record?.value;
  paintArmadaRoster(id,armada);
  const verified=armada?.manpower;
  const format=n=>n.toLocaleString('en-US',{maximumFractionDigits:2});
  manpowerScore.textContent=verified?format(verified.score):record?.pending?'Loading…':'Unavailable';
  const breakdown=get('location-manpower-breakdown'),inventory=get('location-manpower-inventory'),readiness=get('location-manpower-readiness');
  if(breakdown){
   breakdown.hidden=!verified;
   if(breakdown.getAttribute('data-vessel')!==id){breakdown.removeAttribute('open');breakdown.setAttribute('data-vessel',id);}
  }
  if(manpowerInputs){
   manpowerInputs.hidden=!verified;
   if(verified)manpowerInputs.textContent=format(verified.power)+' launch-ready weapon power × '+format(verified.pilots)+' ready NPC pilot'+(verified.pilots===1?'':'s');
  }
  if(verified){
   if(inventory)inventory.textContent=verified.fighters+' Rift-3 ready to launch. Held in reserve: '+verified.swift+' Swift-2 and '+verified.bison+' Bison-2. These are not counted until they can launch.';
   if(readiness)readiness.textContent=verified.pilots+'/'+verified.capacity+' NPC pilots ready · '+verified.deployed+' deployed · '+verified.recovering+' recovering.';
   if(manpowerCoverage)manpowerCoverage.textContent='NPC-only. Player-owned fighters, human pilots, and capital ship weapons are not counted.';
  }
  if(armada){
   const escorts=armada.vessels.filter(v=>v.role==='escort');
   manpowerFactors.textContent='Flying vessels in formation: '+armada.vesselCount+' (1 command carrier + '+escorts.length+' escort'+(escorts.length===1?'':'s')+')'+
    (escorts.length?' ('+escorts.map(v=>v.name+' · '+v.vesselClass+(v.multicrew?' · Multicrew':'')+(v.captain?' · Captain '+v.captain:'')).join(', ')+').':'.');
  }else manpowerFactors.textContent='Formation size unavailable.';
 }
 async function loadManpower(id){
  if(!id||!vessels.has(id)||picker||transit||document.hidden||typeof window.fetch!=='function')return;
  const earlier=armadas.get(id);
  if(earlier?.pending||earlier&&Date.now()-earlier.at<15000)return;
  const record={pending:true,value:earlier?.value??null,at:Date.now()};
  armadas.set(id,record);
  if(!details.hidden&&vesselAt(chosen)===id)paintManpower(id);
  try{
   const signal=window.AbortSignal?.timeout?.(5000);
   const reply=await window.fetch(onlineGameOrigin+'/api/multicrew/vessels/'+id+'/stats',{
    method:'GET',credentials:'omit',cache:'no-store',redirect:'error',...(signal?{signal}:{})});
   record.value=decodeArmada(reply.ok?await reply.json():null,id);
  }catch{record.value=null;}finally{
   record.pending=false;record.at=Date.now();
   if(!details.hidden&&vesselAt(chosen)===id)paintManpower(id);
   render();
  }
 }
 function updateDetail(){
  const w=find(chosen),scanned=surveyed.has(chosen),id=vesselAt(chosen);
  const onlineBattle=chosen===sharedId&&shared;
  const pirate=chosen===pirateId&&cross,engagement=chosen===crossId&&cross,bifrostView=chartBifrost();
  label.textContent=onlineBattle?'Blackwake Online Test':engagement?'Cross Battle':pirate?'Blackwake':id?guildLabel(id):w?.name??tile().name;
  kind.textContent=onlineBattle?'Shared multiplayer test':engagement?'Bifrost vs Blackwake':pirate?'Pirate multicrew vessel':id?vesselSubtitle(id):w?.type??'Uncharted tile';
  if(commanderDetail){commanderDetail.hidden=!id;commanderDetail.textContent=id?commanderLabel(id):'';}
  sector.textContent=onlineBattle?tiles[shared.sector].name:(pirate||engagement)?tiles[cross.location.sector].name:chosen==='bifrost'?(bifrostView?.sector?tiles[bifrostView.sector].name:'Signal pending'):w?.code??tileCode(tile());
  description.textContent=onlineBattle?(shared.autonomous?'NPC crews are already fighting. You can join the same live room on either side.':'Players on both sides enter the same live room.')+' This test opens directly; it does not fly your ship there. No career or faction changes.'+(privateMirror?' Opens in the public game, where you need a launch-ready owned fighter with a confirmed berth.':' Requires a launch-ready owned fighter with a confirmed berth.'):engagement?'Intercept from your own approach, reinforce Bifrost from its side, or watch the battle.':pirate?'Bifrost has intercepted this pirate vessel. Join the existing Cross Battle from your own approach.':id===bifrostId?(cross?'Bifrost is engaging Blackwake. Reinforcements join Bifrost’s side and approach.':'This vessel follows an independent patrol.'):id===pegasusId?'The carrier crew pilots this ship independently.':w===pirateHideout?w.copy+(!picker&&privateMirror?' Opens in the public game.':''):scanned?w.survey:w?.copy??'No charted destinations yet. Your carrier can still fly through.';
  const message=w===pirateHideout?(picker||transit?'Fixed landmark':shared?.joinable?'Online test available · Choose a side to enter directly.':!sharedSettled&&typeof window.RiftMultiplayer?.info==='function'?'Checking expedition status…':'Expedition unavailable · You can still inspect the hideout.'):onlineBattle?(shared.joinable?'Choose a side to enter.':'This room is not taking new pilots right now.'):(pirate||engagement)?'Cross Battle active.':chosen==='bifrost'?(cross?'Engaged with Blackwake · position held':bifrostReadout):scanned?'Survey recorded by the carrier crew.':w?.poi?'Awaiting a nearby crew survey.':readout;
  if(status.textContent!==message)status.textContent=message;
  paintEventAge(last??0);
  if(companyLink)companyLink.hidden=!!picker||chosen!=='bifrost';
  if(visitVessel){
   visitVessel.hidden=!!picker||!id;
   if(id&&!picker){changed(visitVessel,'href','./carrier.html?vessel='+id);visitVessel.textContent='Visit '+vesselName(id);}
  }
  showPortrait(w);showContactImages(id);paintManpower(id);updateFlightLink(id);updateCrossAction();updateSharedEntry();
 }
 function pick(id,recenter=false,reveal=false){
  if(reveal&&openedInvite){openedInvite=null;invite.hidden=true;}
  if(id===pegasusId)id='home';
  const pirate=(id===pirateId||id===crossId)&&cross;
  const sharedContact=id===sharedId&&shared;
  if(id===pirateHideout.id&&recenter&&!transit&&tileId!=='reach')enterTile('reach');
  const w=find(id);if(!pirate&&!sharedContact&&!w&&!vesselAt(id))return;
  if(sharedContact&&recenter){
   if(tileId!==shared.sector)enterTile(shared.sector);
   cameraX=shared.x;cameraY=shared.y;
  }
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
  sharedPin.setAttribute('aria-pressed',String(id===sharedId));
  piratePin.setAttribute('aria-pressed',String(id===pirateId));
  crossPin.setAttribute('aria-pressed',String(id===crossId));
  bifrostPin.setAttribute('aria-pressed',String(id==='bifrost'));
  syncCapitalShortcut();
  updateDetail();
  if(reveal){details.hidden=false;loadManpower(vesselAt(id));}
  if(recenter){if(id==='home'){locate();return;}if(id!=='bifrost'&&!pirate&&!sharedContact){cameraX=w.x;cameraY=w.y;}render();}
 }
 function paintEventAge(now){
  if(!eventAge)return;
  const local=cross&&[crossId,pirateId,bifrostId].includes(chosen);
  const exercise=shared?.status==='running'&&[sharedId,pirateHideout.id].includes(chosen);
  const ms=local&&Number.isSafeInteger(cross.startsAt)?Date.now()-cross.startsAt:exercise&&shared.age!==null?shared.age+Math.max(0,now-shared.receivedAt):null;
  eventAge.hidden=ms===null;
  if(ms===null)return;
  const format=secs=>{
   const hours=Math.floor(secs/3600);
   return (hours?hours+':':'')+String(Math.floor(secs/60)%60).padStart(2,'0')+':'+String(secs%60).padStart(2,'0');
  };
  const closing=exercise&&shared.closeIn!==null?' · Closing in '+format(Math.ceil(Math.max(0,shared.closeIn-(now-shared.receivedAt))/1000)):'';
  const copy='Elapsed '+format(Math.floor(Math.max(0,ms)/1000))+closing;
  if(eventAge.textContent!==copy)eventAge.textContent=copy;
 }
 function scaleLimit(next){
  const overview=Math.min(width/project(worldW+36),height/project(worldH+36));
  return clamp(next,Math.max(overview,width<690?Math.max(width/project(1725),height/project(south-north+36)):0),base*2.5);
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
  const w=width/worldToScreen(),h=height/worldToScreen();
  cameraX=w>=worldW?worldW/2:clamp(cameraX,w/2,worldW-w/2);
  cameraY=h>=south-north?(north+south)/2:clamp(cameraY,north+h/2,south-h/2);
  changed(chart,'viewBox',[cameraX-w/2,cameraY-h/2,w,h].map(n=>project(n).toFixed(3)).join(' '));
  // Backdrop moves less than the physical chart; nearby stars move faster than the nebula.
  const px=motion?.matches?0:cameraX-worldW/2,py=motion?.matches?0:cameraY-(north+south)/2;
  changed(nebula,'transform','translate('+point(px*.27,py*.21)+') scale('+chartExpansion+')');
  changed(sky,'transform','translate('+point(px*.12,py*.09)+') scale('+chartExpansion+')');
  const hit=Math.max(29,22/scale).toFixed(2),sizeKey=tileId+':'+hit;
  if(sized!==sizeKey){
   sized=sizeKey;capHit.setAttribute('r',hit);bifrostHit.setAttribute('r',hit);
   for(const {hit:circle} of pinsByTile.get(tileId).pin.values())circle.setAttribute('r',hit);
  }
  const showPirate=cross&&cross.location.sector===tileId&&!transit&&!picker;
  if(showPirate){
   piratePin.removeAttribute('display');
   changed(piratePin,'transform',at(cross.pirate.x,cross.pirate.y));
   changed(crossPin,'transform',at(cross.location.x,cross.location.y));
   changed(crossArt,'transform','scale('+(1/scale).toFixed(4)+')');
   crossPin.removeAttribute('display');
   changed(pirateHit,'r',hit);
  }else{changed(piratePin,'display','none');changed(crossPin,'display','none');}
  if(shared?.status==='running'&&shared.sector===tileId&&!transit&&!picker){
   sharedPin.removeAttribute('display');
   const title=shared.autonomous?'Online test · NPCs':'Online test';
   if(sharedLabel.textContent!==title)sharedLabel.textContent=title;
   changed(sharedPin,'aria-label','Blackwake · '+title);
   changed(sharedPin,'data-autonomous',String(shared.autonomous));
   changed(sharedGlyph,'d',shared.autonomous?'M-6-6 6 6 M6-6-6 6':'M-7 2h3l2-6 3 8 2-3h4');
   changed(sharedPin,'transform',at(shared.x,shared.y));
   changed(sharedArt,'transform','scale('+(1/scale).toFixed(4)+')');
  }else changed(sharedPin,'display','none');
  changed(cap,'transform',at(ship.x,ship.y));
  const overview=project(w)>1550,look=(overview?'blip:':'hull:')+scale.toFixed(5);
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
   changed(bifrostPin,'transform',at(shownBifrost.x,shownBifrost.y));
  }else changed(bifrostPin,'display','none');
  const onScreen=shipKnown&&shipSector===tileId;
  if(onScreen){if(cap.getAttribute('display')==='none')cap.removeAttribute('display');}
  else changed(cap,'display','none');
  paintArmadaStars(overview);
  const next=helmMode?travel:planPoint;
  if(onScreen&&next&&Math.hypot(next.x-ship.x,next.y-ship.y)>8){
   if(course.getAttribute('display')==='none')course.removeAttribute('display');
   changed(course,'d','M'+point(ship.x,ship.y)+'L'+point(next.x,next.y));
  }else changed(course,'display','none');
  const maxed=scale>=base*2.5-1e-5,mined=scale<=scaleLimit(0)+1e-5;
  if(plus.disabled!==maxed)plus.disabled=maxed;
  if(minus.disabled!==mined)minus.disabled=mined;
  if(scaleShown!==scale){
   scaleShown=scale;
   const unit=[20,50,100,200,500,1000].find(n=>n*worldToScreen()>=43)??1000;
   scaleLabel.textContent=unit+' u';scaleLine.style.setProperty('width',Math.round(unit*worldToScreen())+'px');
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
  const choices=record.worlds.filter(w=>w!==home);
  if(!transit&&!choices.includes(pirateHideout))choices.push(pirateHideout);
  for(const w of choices){
   const option=document.createElement('option');option.value=w.id;option.textContent=w.name;finder.append(option);
  }
  sharedOption=null;if(shared&&!transit&&!picker)showSharedOption();
  pirateOption=engagementOption=null;if(cross&&!transit&&!picker)paintPirateOption();
  finder.value='';
  if(arrival){cameraX=ship.x;cameraY=ship.y;}
  else [cameraX,cameraY]=record.origin;
  pick('home');updateCarrierStrip();render();
 }
 function announce(message){
  readout=message;
  if(chosen!=='bifrost'&&chosen!==pirateId&&chosen!==crossId&&chosen!==sharedId&&find(chosen)!==pirateHideout&&!find(chosen)?.poi&&status.textContent!==message)status.textContent=message;
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
  if(now>=nextRangeRefresh){
   nextRangeRefresh=now+500;
   updateFlightLink(vesselAt(chosen));updateCrossAction();paintEventAge(now);
  }
  paintTransit(snapshot);refreshCross(now);refreshShared(now);updateCarrierStrip();render();
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
 center.addEventListener('click',locate);bifrostButton?.addEventListener('click',()=>pick(picker?pickerTarget:quickCapital,true,true));
 if(capitalNext&&!picker&&!transit){
  capitalNext.hidden=false;
  capitalNext.addEventListener('click',()=>{
   quickCapital=capitalCycle[(capitalCycle.indexOf(quickCapital)+1)%capitalCycle.length];
   syncCapitalShortcut();
  });
 }
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
  if(moves[e.key]){const [x,y]=moves[e.key];cameraX+=86*x/worldToScreen();cameraY+=86*y/worldToScreen();render();e.preventDefault();}
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
    x:cameraX+midpoint.x/worldToScreen(),y:cameraY+midpoint.y/worldToScreen()};
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
   cameraX=gesture.x-mid.x/worldToScreen();cameraY=gesture.y-mid.y/worldToScreen();render();return;
  }
  const x=finger.x-gesture.x,y=finger.y-gesture.y;
  if(!gesture.moved&&Math.hypot(x,y)<6)return;
  gesture.moved=true;view.classList.add('dragging');
  cameraX=gesture.cameraX-x/worldToScreen();cameraY=gesture.cameraY-y/worldToScreen();
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
  else if(helmMode){const point=offset(finger.x,finger.y);steer(cameraX+point.x/worldToScreen(),cameraY+point.y/worldToScreen());}
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
 window.addEventListener('pageshow',()=>{for(const id of vessels.keys())loadManpower(id);});
 window.setInterval?.(()=>{if(!details.hidden)loadManpower(vesselAt(chosen));},15000);
 motion?.addEventListener?.('change',render);
 fit();enterTile('reach');useShared(online?.sample(),0);useBifrost(bifrostOnline?.sample());updateCarrierStrip();render();refreshParking();refreshCross(0);refreshShared(0);window.requestAnimationFrame(advance);
 for(const id of vessels.keys()){loadManpower(id);paintIdentity(id);loadIdentity(id).then(updatePickerLabel).catch(()=>{});}
})();
