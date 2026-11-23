'use strict';
(() => {
 const key='rift-runner.mission-log.v1', generationKey='rift-runner.character-generation.v1';
 const generation=()=>{try{return window.localStorage.getItem(generationKey);}catch{return undefined;}};
 const formationKey='rift-runner.squadron-formation.v1',defaultFormation='echelon-right';
 const formations=new Set([defaultFormation,'echelon-left','trail','line-abreast','front-left','front','front-right','side-left']);
 function getSquadronFormation(){
  try{
   const current=generation(),saved=JSON.parse(window.localStorage.getItem(formationKey));
   return current!==undefined&&saved?.version===1&&saved.generation===current&&formations.has(saved.formation)?saved.formation:defaultFormation;
  }catch{return defaultFormation;}
 }
 function setSquadronFormation(formation,expectedGeneration){
  if(!formations.has(formation)||expectedGeneration===undefined||generation()!==expectedGeneration)return false;
  try{
   const data=JSON.stringify({version:1,generation:expectedGeneration,formation});
   window.localStorage.setItem(formationKey,data);
   return generation()===expectedGeneration&&window.localStorage.getItem(formationKey)===data;
  }catch{return false;}
 }
 const testLayoutKey='rift-runner.squadron-test-layout.v1';
 const testDefault=Object.freeze({player:'echelon-left',wingman:'echelon-right'});
 const validTestLayout=layout=>!!layout&&formations.has(layout.player)&&formations.has(layout.wingman)&&layout.player!==layout.wingman;
 function getSquadronTestLayout(){
  try{
   const current=generation(),saved=JSON.parse(window.localStorage.getItem(testLayoutKey));
   if(current!==undefined&&saved?.version===1&&current===saved.generation&&validTestLayout(saved.layout))
    return {player:saved.layout.player,wingman:saved.layout.wingman};
  }catch{}
  return {...testDefault};
 }
 function setSquadronTestLayout(layout,expectedGeneration){
  if(!validTestLayout(layout)||expectedGeneration===undefined||generation()!==expectedGeneration)return false;
  try{
   const data=JSON.stringify({version:1,generation:expectedGeneration,layout:{player:layout.player,wingman:layout.wingman}});
   window.localStorage.setItem(testLayoutKey,data);
   return generation()===expectedGeneration&&window.localStorage.getItem(testLayoutKey)===data;
  }catch{return false;}
 }
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
 function readMission(field){
  const item=getStarter()?.[field];
  return timestamp(item?.acceptedAt)&&(!Object.hasOwn(item,'victoryAt')||timestamp(item.victoryAt))&&
   (!Object.hasOwn(item,'lodgedAt')||timestamp(item.lodgedAt)&&timestamp(item.victoryAt))?item:null;
 }
 function updateMission(field,read,expected,change){
  if(expected===undefined)return null;
  try{
   const storage=window.localStorage,raw=storage.getItem(key),starter=getStarter();
   if(!starter||starter.generation!==expected)return null;
   const previous=read(),mission=change(previous);
   if(!mission)return null;
   if(mission===previous)return previous;
   const data=JSON.stringify({...starter,[field]:mission});
   if(storage.getItem(key)!==raw||generation()!==expected)return null;
   storage.setItem(key,data);
   return storage.getItem(key)===data&&generation()===expected?mission:null;
  }catch{return null;}
 }
 const savedKillsMeet=threshold=>{
  try{
   const kills=window.RiftCredits?.getBuildState?.()?.kills;
   return Number.isSafeInteger(kills)&&kills>=threshold;
  }catch{return false;}
 };
 function mission(field,eligible){
  const get=()=>readMission(field);
  const update=(expected,change)=>updateMission(field,get,expected,change);
  return {
   get,eligible,
   accept:expected=>update(expected,old=>old??(eligible()?{acceptedAt:Date.now()}:null)),
   win:(expected,acceptedAt)=>update(expected,old=>
    !old||old.acceptedAt!==acceptedAt?null:old.victoryAt?old:{...old,victoryAt:Date.now()}),
   lodge:(expected,acceptedAt)=>update(expected,old=>
    !old||old.acceptedAt!==acceptedAt||!old.victoryAt?null:old.lodgedAt?old:{...old,lodgedAt:Date.now()})
  };
 }
 const intercept=mission('intercept',()=>!!getStarter());
 const qualifications=Object.freeze([
  {id:'wingman',rank:'Wingman',kills:10},
  {id:'ace',rank:'Ace',kills:25},
  {id:'flight-lead',rank:'Flight Lead',kills:50},
  {id:'veteran',rank:'Veteran',kills:75},
  {id:'vanguard',rank:'Vanguard',kills:150},
  {id:'rift-legend',rank:'Rift Legend',kills:300}
 ].map(Object.freeze));
 const qualifiers=new Map();
 for(const [i,spec] of qualifications.entries()){
  const previous=qualifications[i-1]?.id;
  qualifiers.set(spec.id,mission(spec.id,()=>!!getStarter()&&
   (!previous||!!qualifiers.get(previous).get()?.lodgedAt)&&savedKillsMeet(spec.kills)));
 }
 const getQualification=id=>qualifiers.get(id)?.get()??null;
 const qualificationEligible=id=>qualifiers.get(id)?.eligible()??false;
 const acceptQualification=(id,expected)=>qualifiers.get(id)?.accept(expected)??null;
 const winQualification=(id,expected,acceptedAt)=>qualifiers.get(id)?.win(expected,acceptedAt)??null;
 const lodgeQualification=(id,expected,acceptedAt)=>qualifiers.get(id)?.lodge(expected,acceptedAt)??null;
 function getNewBriefings(){
  if(!getStarter())return [{id:'starter',title:'Outfit the Rift-4'}];
  const fresh=[];
  if(!intercept.get())fresh.push({id:'intercept',title:'Vandul Intercept'});
  for(const {id,rank} of qualifications){
   if(!getQualification(id)&&qualificationEligible(id))fresh.push({id,title:rank+' Qualification'});
  }
  return fresh;
 }
 const wingman=qualifiers.get('wingman'),ace=qualifiers.get('ace');
 window.RiftMissions=Object.freeze({generation,getStarter,lodgeStarter,getSquadronFormation,setSquadronFormation,getSquadronTestLayout,setSquadronTestLayout,
  getIntercept:intercept.get,acceptIntercept:intercept.accept,winIntercept:intercept.win,lodgeIntercept:intercept.lodge,
  qualifications,getQualification,getNewBriefings,qualificationEligible,acceptQualification,winQualification,lodgeQualification,
  getWingman:wingman.get,wingmanEligible:wingman.eligible,acceptWingman:wingman.accept,winWingman:wingman.win,lodgeWingman:wingman.lodge,
  getAce:ace.get,aceEligible:ace.eligible,acceptAce:ace.accept,winAce:ace.win,lodgeAce:ace.lodge
 });
})();
