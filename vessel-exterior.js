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
  for(const node of ['carrier-shop','carrier-bridge','carrier-crew','carrier-galaxy-map','carrier-hangar','carrier-launch-practice','carrier-launch-capital-test','carrier-launch-escort','carrier-launch-vandul','carrier-launch-wingman-test']){
   const link=get(node),path=link?.getAttribute?.('href');
   if(path)link.setAttribute('href',href(path));
  }
 }
 if(id!=='bifrost'||!root)return;
 root.dataset.vessel='bifrost';
 scene.hidden=false;
 get('bifrost-exterior-image').src='./bifrost-carrier.webp';
 const portrait=get('carrier-guild-portrait'),notes=get('carrier-vessel-note');
 portrait.src='./admiral-adaline.webp';portrait.width=460;portrait.height=500;

 const fallback={name:'Bifrost',admiral:'Adaline',vesselClass:'Bifrost-class carrier',profession:'Military'};
 const render=v=>{
  const commander=v.admiral?'Admiral '+v.admiral:'Admiral unassigned';
  get('carrier-identity-name').textContent=v.name;
  get('carrier-company-name').textContent=v.name;
  get('carrier-guild-admiral').textContent=commander;
  portrait.alt='Portrait of Admiral Adaline';
  // Registry changes do not imply that the current portrait depicts a new commander.
  portrait.hidden=v.admiral!=='Adaline';
  get('carrier-guild-class').textContent=v.vesselClass;
  get('carrier-guild-profession').textContent=v.profession;
 };
 render(fallback);
 get('carrier-launch-capital-test').href='./index.html?launch=capital-test&vessel=bifrost&departure=carrier';
 get('carrier-launch-capital-test').title='Start a local Capital Test using Bifrost. No credits or damage saved.';
 for(const [node,path] of Object.entries({
  'carrier-shop':'./carrier-shop.html','carrier-bridge':'./carrier-bridge.html','carrier-crew':'./carrier-crew.html',
  'carrier-launch-practice':'./index.html?launch=practice',
  'carrier-launch-escort':'./index.html?launch=escort',
  'carrier-launch-vandul':'./index.html?launch=solo-training',
  'carrier-launch-wingman-test':'./index.html?launch=wingman-test'
 }))get(node).href=href(path)+(path.includes('launch=')?'&departure=carrier':'');
 const solo=get('carrier-launch-vandul');
 solo.textContent='Vandul Training';
 get('carrier-launch-escort').title='Fly the local Escort training exercise.';
 get('carrier-galaxy-map').href='./galaxy-map.html?vessel=bifrost';
 const hangar=get('carrier-hangar');
 hangar.href='./index.html?hangar=carrier&vessel=bifrost';
 hangar.title='Manage your personal fighter and equipment.';
 get('carrier-guild-directory').href='./carrier-multicrew.html#bifrost';
 const text=(v,max)=>typeof v==='string'&&v.length>0&&v.length<=max&&v===v.trim();
 const apiOrigin=window.location.hostname==='rift-runner.boundlessghost16.chatgpt.site'?'https://rift-runner.gambizt3.workers.dev':'';
 try{
  const response=await fetch(apiOrigin+'/api/multicrew/vessels/bifrost',{credentials:'omit',cache:'no-store',redirect:'error'});
  if(!response.ok)throw Error('Vessel registry unavailable');
  const reply=await response.json(),v=reply?.vessel;
  if(reply?.version!==1||reply.access!=='guest'||v?.id!=='bifrost'||v.kind!=='carrier'||
     !text(v.name??v.designation,80)||!text(v.vesselClass,60)||!text(v.profession,100)||
     (v.admiral!==null&&!text(v.admiral,64)))throw Error('Invalid vessel record');
  render({...v,name:v.name??v.designation});
 }catch{
  notes.hidden=false;notes.textContent='Registry details unavailable. Showing the last published vessel description.';
 }
})();
