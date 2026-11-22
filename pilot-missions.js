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
 window.RiftMissions=Object.freeze({generation,getStarter,lodgeStarter});
})();
