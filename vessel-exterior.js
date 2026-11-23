'use strict';
(async()=>{
 const get=id=>document.getElementById(id);
 const scene=get('carrier-scene-bifrost'),root=scene?.closest('.carrier-view');
 if(!root)return;
 const selected=new URLSearchParams(window.location.search).get('vessel');
 let id=selected==='bifrost'||selected==='rift-carrier'?selected:null;
 if(!id)try{
  // The selected guild only changes which ship is pictured. It confers no access.
  const profile=JSON.parse(window.localStorage.getItem('rift-runner.pilot-profile.v1'));
  if(profile?.version===2&&profile.companyVesselId==='bifrost')id='bifrost';
 }catch{}
 if(id!=='bifrost')return;
 root.dataset.vessel='bifrost';
 scene.hidden=false;
 get('bifrost-exterior-image').src='./bifrost-carrier.webp';
 const portrait=get('carrier-guild-portrait'),notes=get('carrier-vessel-note');
 portrait.src='./admiral-adaline.webp';portrait.width=460;portrait.height=500;
 notes.hidden=false;
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
  notes.textContent='Registry details unavailable. Showing the last published vessel description. Guild interiors and membership are not available here.';
 }
})();
