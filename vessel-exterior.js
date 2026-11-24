'use strict';
(async()=>{
 const get=id=>document.getElementById(id);
 const scene=get('carrier-scene-bifrost'),root=scene?.closest('.carrier-view');
 const selected=new URLSearchParams(window.location.search).get('vessel');
 let id=selected==='bifrost'||selected==='rift-carrier'?selected:null;
 // Explicit visits always keep their vessel. The generic Deck follows an
 // owned active fighter's recorded berth, without changing affiliation.
 const fighters=window.RiftFighters,parking=window.RiftFighterParking;
 if(!id&&root&&fighters&&parking){
  try{
   const active=fighters.selected(),wallet=window.RiftCredits?.getBuildState?.();
   let owned=Boolean(wallet&&fighters.get(active)&&fighters.owned(active));
   if(wallet&&active===fighters.starter){
    const cert=JSON.parse(window.localStorage.getItem(fighters.hullKey(active)));
    owned=cert?.version===1&&cert.hull===active&&['damaged','repairing','repaired'].includes(cert.condition);
    if(cert===null){
     const old=JSON.parse(window.localStorage.getItem(fighters.buildKey(active)));
     owned=wallet.origin==='legacy'||old?.version===1&&old.hull===active&&
      [old.engine,old.core,old.battery,old.primary].some(part=>typeof part==='string'&&window.RiftCredits.owns?.(part));
    }
   }
   if(owned){
    const cached=parking.details(active);
    if(cached?.bay==null)await parking.hydrate?.(active,{migrate:false});
    const parked=parking.get(active);
    if(parked==='bifrost'||parked==='rift-carrier')id=parked;
   }
  }catch{}
 }
 if(!id)try{
  // Interior fallback context does not confer access.
  const profile=JSON.parse(window.localStorage.getItem('rift-runner.pilot-profile.v1'));
  if(profile?.version===2&&profile.companyVesselId==='bifrost')id='bifrost';
 }catch{}
 if(!id)id='rift-carrier';
 const pinPegasus=id==='rift-carrier'&&(selected==='rift-carrier'||
  root&&window.RiftFighterParking?.home()==='bifrost');
 const href=path=>{
  if(id!=='bifrost'&&!pinPegasus||/[?&]vessel=/.test(path))return path;
  const tail=path.search(/&(?:order|departure)=/),scope=(path.includes('?')?'&':'?')+'vessel='+id;
  return tail<0?path+scope:path.slice(0,tail)+scope+path.slice(tail);
 };
 window.RiftVessel=Object.freeze({id,href});
 const interior=document.querySelector?.('.bridge,.quarters,.carrier-shop');
 if(interior){
  interior.dataset.vessel=id;
  // Preserve explicit Pegasus when a Bifrost-affiliated pilot visits as a guest.
  for(const link of interior.querySelectorAll('a[href="./carrier.html"],a[href="./carrier-crew.html"],a[href="./carrier-shop.html"],a[href="./corvette-loadout.html"],a[href^="./index.html?hangar=carrier"]')){
   if(id==='bifrost'||selected==='rift-carrier')link.setAttribute('href',href(link.getAttribute('href')));
  }
  if(id==='bifrost'){
   for(const [node,label] of [['bridge-title','Bifrost Bridge'],['quarters-title','Bifrost Crew Quarters'],['carrier-shop-title','Bifrost Shop']]){
    if(!get(node))continue;
    get(node).textContent=label;
    document.title=label+' · Rift Runner';
   }
   for(const node of interior.querySelectorAll('[data-vessel-prefix]'))node.textContent=node.textContent.replace(/^Pegasus/,'Bifrost');
   const rank=get('quarters-title')&&interior.querySelector('.rank-requirement');
   if(rank)rank.textContent='Pilot rank requirements are fleet-wide. Admiral Bishop issues the qualification orders on Pegasus.';
   const missionNotice=get('crew-mission-reference');
   if(missionNotice)missionNotice.textContent='Pegasus campaign reference only. Story orders are not available aboard Bifrost yet.';
   const bay=interior.querySelector('.room-refuelling-art');
   if(bay)bay.alt=bay.alt.replace('the Pegasus hangar','the Bifrost hangar');
   const certification=get('formation-mode')?.querySelector('option[value="qualification"]');
   if(certification)certification.remove();
   const admiral=get('bifrost-bridge-admiral');
   if(admiral){admiral.src='./admiral-adaline.webp';admiral.hidden=false;}
   const voice=get('captain-voice');
   if(voice){voice.removeAttribute('src');voice.preload='none';}
  }
 }
 if(root&&pinPegasus){
  get('carrier-guild-directory').href='./carrier-multicrew.html#rift-carrier';
  for(const node of ['carrier-shop','carrier-bridge','carrier-crew','carrier-galaxy-map','carrier-hangar']){
   const link=get(node),path=link?.getAttribute?.('href');
   if(path)link.setAttribute('href',href(path));
  }
 }
 if(!root)return;
 // Nominal cruise targets from the Galaxy route model, not current speed.
 const cruise=get('carrier-spec-cruise');if(cruise)cruise.textContent=(id==='bifrost'?68:76)+' map units/s';
 const panel=get('carrier-company'),supply=get('carrier-stat-supply'),pilots=get('carrier-stat-pilots'),npc=get('carrier-stat-npc');
 const inside=get('carrier-inside'),insideFeedback=get('carrier-inside-feedback');
 if(inside){
  const reveal=()=>{inside.open=true;};
  get('carrier-inside-open')?.addEventListener?.('click',reveal);
  get('carrier-inside-close')?.addEventListener?.('click',()=>{inside.open=false;});
  if(window.location.hash==='#carrier-inside-title')reveal();
 }
 const stockModels=['bastion-9','stocky-light-fighter'];
 const insideFields={
  players:get('carrier-inside-players'),npc:get('carrier-inside-npc'),reserve:get('carrier-inside-reserve'),
  ...Object.fromEntries(['rift-fighter','bastion-9','stocky-light-fighter'].map(hull=>[hull,get('carrier-inside-'+hull)]))
 };
 if(panel?.addEventListener&&supply&&pilots&&npc){
  const origin=window.location.hostname==='rift-runner.boundlessghost16.chatgpt.site'?'https://rift-runner.gambizt3.workers.dev':'';
  let pending=false;
  const refresh=async()=>{
   if((!panel.open&&!inside?.open)||document.hidden||pending)return;
   pending=true;
   const count=n=>Number.isSafeInteger(n)&&n>=0;
   const renderInside=data=>{
    const values={players:data?.playersWithInsideShips,npc:data?.npcPilotsAboard,reserve:data?.carrierRift4sInside};
    for(const hull of ['rift-fighter','bastion-9','stocky-light-fighter'])values[hull]=data?.playerShipsByHull?.[hull];
    if(data?.carrierShipsByHull)values.reserve=data.carrierShipsByHull['rift-fighter'];
    for(const hull of stockModels){
     const key='stock-'+hull,node=get('carrier-'+key),fitLabel=get('carrier-stock-fit-'+hull);
     const stock=data?.carrierShipsByHull?.[hull],fit=data?.carrierFitsByHull?.[hull];
     values[key]=stock;
     if(node)node.textContent=count(stock)?String(stock):'Unavailable';
     if(fitLabel){
      const standard=fit?.engine==='stock-thruster'&&fit.core==='weifer-he3-core'&&fit.battery==='kestrel-h20-reserve-cell'&&
       Array.isArray(fit.weapons)&&fit.weapons.length===2&&fit.weapons.every(weapon=>weapon==='sparrow-s2');
      fitLabel.hidden=!standard;
      fitLabel.textContent=standard?'2 × Sparrow S2 · starter engine, generator and cell':'';
     }
    }
    for(const [key,node] of Object.entries(insideFields))if(node)node.textContent=count(values[key])?String(values[key]):'Unavailable';
    const copy=Object.values(values).every(count)?'Internal hangar counts updated.':'Some internal hangar counts are unavailable.';
    if(insideFeedback&&insideFeedback.textContent!==copy)insideFeedback.textContent=copy;
   };
   try{
    const limit=window.AbortSignal?.timeout?.(5000);
    const reply=await window.fetch(origin+'/api/multicrew/vessels/'+id+'/stats',{
     credentials:'omit',cache:'no-store',redirect:'error',...(limit?{signal:limit}:{})});
    const data=reply.ok?await reply.json():null;
    if(data?.version!==1||data.vesselId!==id)throw Error('No current stats');
    renderInside(data);
    supply.textContent=count(data.supply)?data.supply+' units':'Unavailable';
    pilots.textContent=count(data.playerPilotsAboard)?data.playerPilotsAboard+' with confirmed berths':'Unavailable';
    const {available,deployed,replenishing,capacity}=data.npcPilots??{};
    npc.textContent=[available,deployed,replenishing,capacity].every(n=>Number.isSafeInteger(n)&&n>=0)&&available+deployed+replenishing===capacity
     ? available+' ready · '+deployed+' deployed · '+replenishing+' replacing · '+capacity+' total'
     : 'Unavailable';
   }catch{
    supply.textContent=pilots.textContent=npc.textContent='Unavailable';
    renderInside(null);
   }finally{pending=false;}
  };
  panel.addEventListener('toggle',refresh);
  inside?.addEventListener?.('toggle',refresh);
  document.addEventListener?.('visibilitychange',refresh);
  window.setInterval?.(refresh,30000);
  refresh();
 }
 const portrait=get('carrier-guild-portrait'),notes=get('carrier-vessel-note');
 const registry=window.RiftVesselIdentity;
 function renderIdentity(record){
  if(!record)return;
  const {vessel,commander,guildLabel}=record;
  const commanderLabel=commander?[commander.title,commander.name].filter(Boolean).join(' '):'Unassigned commander';
  get('carrier-identity-name').textContent=vessel.name??vessel.designation;
  get('carrier-company-name').textContent=guildLabel;
  if(get('carrier-guild-vessel'))get('carrier-guild-vessel').textContent=vessel.name??vessel.designation;
  get('carrier-guild-admiral').textContent=commanderLabel;
  portrait.hidden=commander?.name!==(id==='bifrost'?'Adaline':'Bishop')||commander?.title!=='Admiral';
  get('carrier-guild-class').textContent=vessel.vesselClass;
  get('carrier-guild-profession').textContent=vessel.profession;
  notes.hidden=record.status==='live';
  notes.textContent=notes.hidden?'':'Showing the published vessel description while the registry is unavailable.';
 }
 if(id==='bifrost'){
 root.dataset.vessel='bifrost';
 get('carrier-identity-name').textContent='Bifrost';
 scene.hidden=false;
 get('bifrost-exterior-image').src='./bifrost-carrier.webp';
 portrait.src='./admiral-adaline.webp';portrait.width=460;portrait.height=500;
 portrait.alt='Portrait of Admiral Adaline';
 for(const page of ['shop','bridge','crew'])get('carrier-'+page).href=href('./carrier-'+page+'.html');
 get('carrier-galaxy-map').href='./galaxy-map.html?vessel=bifrost';
 const hangar=get('carrier-hangar');
 hangar.href='./index.html?hangar=carrier&vessel=bifrost';
 hangar.title='Open the Hangar aboard Bifrost.';
 get('carrier-guild-directory').href='./carrier-multicrew.html#bifrost';
 }
 renderIdentity(registry?.get(id));
 if(registry)renderIdentity(await registry.load(id));
})();
