'use strict';
(()=>{
 const key='rift-runner.fighter-parking-access.v1',generationKey='rift-runner.character-generation.v1';
 const origin=window.location?.hostname==='rift-runner.boundlessghost16.chatgpt.site'?'https://rift-runner.gambizt3.workers.dev':'';
 const path='/api/encounters/blackwake',vessels=new Set(['rift-carrier','bifrost']),hulls=new Set(['rift-fighter','stocky-light-fighter','bastion-9']);
 const authorized=(vessel,role)=>vessels.has(vessel)&&(role==='intercept'||role==='reinforce'&&vessel==='rift-carrier');
 function normalized(data,participation){
  const e=data?.encounter,p=data?.participation;
  const pose=(v,id,name)=>v?.id===id&&v.name===name&&Number.isFinite(v.x)&&v.x>=0&&v.x<=2750&&
   Number.isFinite(v.y)&&v.y>=-850&&v.y<=2660&&Number.isFinite(v.heading)&&v.heading>=0&&v.heading<360;
  if(data?.version!==1||e?.id!=='blackwake'||e.status!=='active'||e.sector!=='reach'||
   !Number.isSafeInteger(e.startsAt)||!Number.isSafeInteger(e.endsAt)||e.endsAt-e.startsAt!==4*60*60*1000||
   !pose(e.pirate,'blackwake','Blackwake')||!pose(e.attacker,'bifrost','Bifrost')||
   e.x!==(e.pirate.x+e.attacker.x)/2||e.y!==(e.pirate.y+e.attacker.y)/2||e.simulation!=='local'||
   (participation?(p?.vessel!==participation.vessel||p?.hull!==participation.hull||p?.role!==participation.role):p!==null))return null;
  return {version:1,encounter:{id:e.id,status:e.status,sector:e.sector,x:e.x,y:e.y,startsAt:e.startsAt,endsAt:e.endsAt,
   pirate:{id:e.pirate.id,name:e.pirate.name,x:e.pirate.x,y:e.pirate.y,heading:e.pirate.heading},
   attacker:{id:e.attacker.id,name:e.attacker.name,x:e.attacker.x,y:e.attacker.y,heading:e.attacker.heading},simulation:e.simulation},
   participation:participation&&{...participation}};
 }
 const options={credentials:'omit',cache:'no-store',redirect:'error'};
 const mayTimeout=()=>typeof window.AbortSignal?.timeout==='function'?{signal:window.AbortSignal.timeout(7000)}:{};
 async function get(){
  try{
   const response=await window.fetch(origin+path,{...options,...mayTimeout()});
   return response.ok?normalized(await response.json(),null):null;
  }catch{return null;}
 }
 async function join(vessel,hull,role){
  if(!authorized(vessel,role)||!hulls.has(hull))return null;
  try{
   const s=window.localStorage,generation=s.getItem(generationKey)??null,raw=s.getItem(key);
   const token=JSON.parse(raw);
   if(token?.generation!==generation||!/^[0-9a-f]{64}$/.test(token.bearer??''))return null;
   const participation={vessel,hull,role};
   const response=await window.fetch(origin+path,{...options,...mayTimeout(),method:'POST',
    headers:{Authorization:'Bearer '+token.bearer,'Content-Type':'application/json'},body:JSON.stringify(participation)});
   const result=response.ok?normalized(await response.json(),participation):null;
   return s.getItem(generationKey)===generation&&s.getItem(key)===raw?result:null;
  }catch{return null;}
 }
 window.RiftCrossBattle=Object.freeze({get,join});
})();
