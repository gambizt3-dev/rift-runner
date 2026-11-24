'use strict';
(async()=>{
 const get=id=>document.getElementById(id);
 const scene=get('carrier-scene-bifrost'),root=scene?.closest('.carrier-view');
 const selected=new URLSearchParams(window.location.search).get('vessel');
 let id=selected==='bifrost'||selected==='rift-carrier'?selected:null;
 if(!id)try{
  // The selected guild only changes which ship is pictured. It confers no access.
  const profile=JSON.parse(window.localStorage.getItem('rift-runner.pilot-profile.v1'));
  if(profile?.version===2&&profile.companyVesselId==='bifrost')id='bifrost';
 }catch{}
 if(!id)id='rift-carrier';
 const href=path=>{
  if(id!=='bifrost'&&selected!=='rift-carrier'||/[?&]vessel=/.test(path))return path;
  const tail=path.search(/&(?:order|departure)=/),scope=(path.includes('?')?'&':'?')+'vessel='+id;
  return tail<0?path+scope:path.slice(0,tail)+scope+path.slice(tail);
 };
 window.RiftVessel=Object.freeze({id,href});
 const interior=document.querySelector?.('.bridge,.quarters,.carrier-shop');
 if(interior){
  interior.dataset.vessel=id;
  // Preserve explicit Pegasus when a Bifrost-affiliated pilot visits as a guest.
  for(const link of interior.querySelectorAll('a[href="./carrier.html"],a[href="./carrier-crew.html"],a[href="./carrier-shop.html"],a[href^="./index.html?hangar=carrier"]')){
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
 if(id==='rift-carrier'&&root&&selected==='rift-carrier'){
  get('carrier-guild-directory').href='./carrier-multicrew.html#rift-carrier';
  for(const node of ['carrier-shop','carrier-bridge','carrier-crew','carrier-galaxy-map','carrier-hangar']){
   const link=get(node),path=link?.getAttribute?.('href');
   if(path)link.setAttribute('href',href(path));
  }
 }
 if(!root)return;
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
 scene.hidden=false;
 get('bifrost-exterior-image').src='./bifrost-carrier.webp';
 portrait.src='./admiral-adaline.webp';portrait.width=460;portrait.height=500;
 portrait.alt='Portrait of Admiral Adaline';
 for(const page of ['shop','bridge','crew'])get('carrier-'+page).href=href('./carrier-'+page+'.html');
 get('carrier-galaxy-map').href='./galaxy-map.html?vessel=bifrost';
 const hangar=get('carrier-hangar');
 hangar.href='./index.html?hangar=carrier&vessel=bifrost';
 hangar.title='Manage your personal fighter and equipment.';
 get('carrier-guild-directory').href='./carrier-multicrew.html#bifrost';
 }
 renderIdentity(registry?.get(id));
 if(registry)renderIdentity(await registry.load(id));
})();
