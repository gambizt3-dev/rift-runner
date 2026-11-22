'use strict';
(() => {
 const key='rift-runner.mission-log.v1', generationKey='rift-runner.character-generation.v1';
 const generation=()=>{try{return window.localStorage.getItem(generationKey);}catch{return undefined;}};
 function getStarter(){
  try{
   const storage=window.localStorage,raw=storage.getItem(key);
   if(raw===null)return null;
   const saved=JSON.parse(raw);
   return saved?.version===1&&saved.generation===storage.getItem(generationKey)&&
    Number.isSafeInteger(saved.completedAt)&&saved.completedAt>0?saved:null;
  }catch{return null;}
 }
 function lodgeStarter(expectedGeneration){
  if(expectedGeneration===undefined)return null;
  try{
   const storage=window.localStorage;
   if(storage.getItem(generationKey)!==expectedGeneration)return null;
   const existing=getStarter();
   if(existing)return existing;
   const saved={version:1,generation:expectedGeneration,completedAt:Date.now()},data=JSON.stringify(saved);
   storage.setItem(key,data);
   return storage.getItem(key)===data&&storage.getItem(generationKey)===expectedGeneration?saved:null;
  }catch{return null;}
 }
 const timestamp=value=>Number.isSafeInteger(value)&&value>0;
 function getIntercept(){
  const item=getStarter()?.intercept;
  return timestamp(item?.acceptedAt)&&(!Object.hasOwn(item,'victoryAt')||timestamp(item.victoryAt))&&
   (!Object.hasOwn(item,'lodgedAt')||timestamp(item.lodgedAt)&&timestamp(item.victoryAt))?item:null;
 }
 function updateIntercept(expected,change){
  if(expected===undefined)return null;
  try{
   const storage=window.localStorage,raw=storage.getItem(key),starter=getStarter();
   if(!starter||starter.generation!==expected)return null;
   const previous=getIntercept(),intercept=change(previous);
   if(!intercept)return null;
   if(intercept===previous)return previous;
   const data=JSON.stringify({...starter,intercept});
   if(storage.getItem(key)!==raw||generation()!==expected)return null;
   storage.setItem(key,data);
   return storage.getItem(key)===data&&generation()===expected?intercept:null;
  }catch{return null;}
 }
 const acceptIntercept=expected=>updateIntercept(expected,old=>old??{acceptedAt:Date.now()});
 const winIntercept=(expected,acceptedAt)=>updateIntercept(expected,old=>
  !old||old.acceptedAt!==acceptedAt?null:old.victoryAt?old:{...old,victoryAt:Date.now()});
 const lodgeIntercept=(expected,acceptedAt)=>updateIntercept(expected,old=>
  !old||old.acceptedAt!==acceptedAt||!old.victoryAt?null:old.lodgedAt?old:{...old,lodgedAt:Date.now()});
 window.RiftMissions=Object.freeze({generation,getStarter,lodgeStarter,getIntercept,acceptIntercept,winIntercept,lodgeIntercept});
})();
