'use strict';
(()=>{
 const home=()=>{
  try{
   const profile=JSON.parse(window.localStorage.getItem('rift-runner.pilot-profile.v1'));
   if(profile?.version===2&&profile.companyVesselId==='bifrost')return 'bifrost';
  }catch{}
  return 'rift-carrier';
 };
 const key=id=>['rift-fighter','bastion-9','stocky-light-fighter'].includes(id)?'rift-runner.fighter-parking.v1.'+id:null;
 const get=id=>{
  try{
   const item=key(id),generation=window.localStorage.getItem('rift-runner.character-generation.v1')??null;
   const record=item&&JSON.parse(window.localStorage.getItem(item));
   if(record?.version===1&&record.hull===id&&record.generation===generation&&['rift-carrier','bifrost'].includes(record.vessel))return record.vessel;
  }catch{}
  return home();
 };
 window.RiftFighterParking=Object.freeze({home,get,key});
})();
