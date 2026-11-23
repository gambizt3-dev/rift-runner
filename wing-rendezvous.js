'use strict';
(() => {
 const key='rift-runner.wing-rendezvous.v1', generationKey='rift-runner.character-generation.v1';
 const pilots=Object.freeze([
  Object.freeze({id:'aya',name:'Leena'}),
  Object.freeze({id:'ellis',name:'Tomas'})
 ]);
 const rooms=Object.freeze({berths:'Crew Berths',common:'Common Room',galley:'Galley',observation:'Observation Lounge'});
 const roomIds=Object.keys(rooms);
 const stations=Object.freeze({aya:'common',ellis:'observation'});
 const generation=()=>{try{return window.localStorage.getItem(generationKey);}catch{return undefined;}};
 const timestamp=value=>Number.isSafeInteger(value)&&value>0;
 const parse=(raw,gen)=>{
  if(!raw||gen===undefined)return null;
  try{
   const save=JSON.parse(raw),{rooms:places,met,acceptedAt,completedAt}=save;
   if(save.version!==1||save.generation!==gen||!timestamp(acceptedAt)||
    !roomIds.includes(places?.aya)||!roomIds.includes(places?.ellis)||places.aya===places.ellis||
    typeof met?.aya!=='boolean'||typeof met?.ellis!=='boolean'||
    (met.aya&&met.ellis?!timestamp(completedAt)||completedAt<acceptedAt:completedAt!==null))return null;
   return {acceptedAt,rooms:{...stations},met:{aya:met.aya,ellis:met.ellis},completedAt};
  }catch{return null;}
 };
 const get=()=>{try{return parse(window.localStorage.getItem(key),generation());}catch{return null;}};
 function update(expected,change){
  if(expected===undefined)return null;
  try{
   const storage=window.localStorage,raw=storage.getItem(key);
   if(generation()!==expected)return null;
   const previous=parse(raw,expected),next=change(previous);
   if(!next||next===previous)return next;
   if(storage.getItem(key)!==raw||generation()!==expected)return null;
   const data=JSON.stringify({version:1,generation:expected,...next});
   storage.setItem(key,data);
   return storage.getItem(key)===data&&generation()===expected?next:null;
  }catch{return null;}
 }
 const accept=expected=>update(expected,old=>{
  if(old)return old;
  return {acceptedAt:Date.now(),rooms:{...stations},met:{aya:false,ellis:false},completedAt:null};
 });
 const meet=(id,room,expected,acceptedAt)=>update(expected,old=>{
  if(!old||old.acceptedAt!==acceptedAt||!pilots.some(pilot=>pilot.id===id)||old.rooms[id]!==room)return null;
  if(old.met[id])return old;
  const met={...old.met,[id]:true};
  return {...old,met,completedAt:met.aya&&met.ellis?Math.max(Date.now(),acceptedAt):null};
 });
 window.RiftRendezvous=Object.freeze({key,generation,get,accept,meet,pilots,rooms});
})();
