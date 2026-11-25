import {openRelief,advanceRelief,seatRelief,reliefInput,reliefOutcome} from './planet-relief.mjs';
import {occupationTick,rallyCarrier,settleLiberation,lockdownMarker,planetAccess} from './planet-lockdown.mjs';

export const LOCKDOWN_PATH='/api/galaxy/planet-lockdown';
export const OCCUPATION_PLANETS=Object.freeze([
 Object.freeze({id:'meridian',sector:'reach',x:1375,y:905,occupationEligible:true})
]);
const select='SELECT revision,state FROM rift_planet_lockdown WHERE slot=1';
const save='UPDATE rift_planet_lockdown SET revision=revision+1,state=?1 WHERE slot=1 AND revision=?2';
const insert='INSERT OR IGNORE INTO rift_planet_lockdown(slot,revision,state) VALUES(1,1,?1)';
const load=async db=>{
 const row=await db.prepare(select).first();
 return row?{revision:row.revision,state:JSON.parse(row.state)}:{revision:0,state:null};
};
async function update(db,reduce){
 for(let n=0;n<6;n++){
  const {revision,state}=await load(db),next=reduce(state);
  if(next===state||!next)return next;
  const q=revision?db.prepare(save).bind(JSON.stringify(next),revision):db.prepare(insert).bind(JSON.stringify(next));
  if((await q.run()).meta.changes===1)return next;
 }
 throw Error('Lockdown state changed concurrently; retry');
}
// This host is opt-in. Private methods take server-verified inputs and are not request routes.
function progress(s,now){
 if(!s?.active?.battle)return s;
 const settled=s.active.battle.model.status==='complete';
 const next=structuredClone(s);
 if(!settled)advanceRelief(next.active.battle,now);
 const outcome=reliefOutcome(next.active.battle);
 if(!outcome&&now-next.active.battle.model.startsAt>=8*60_000){
  return settleLiberation(next,{eventId:next.active.id,battleId:next.active.battleId,at:now,outcome:'defenders'});
 }
 if(outcome)return settleLiberation(next,outcome);
 return next.active.battle.model.at===s.active.battle.model.at? s:next;
}
export function makePlanetLockdownHost({planets=OCCUPATION_PLANETS,random=Math.random,clock=Date.now}={}){
 return {
  async fetch(request,env){
   const url=new URL(request.url);
   if(url.pathname!==LOCKDOWN_PATH)return null;
   const json=(data,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
   if(request.method!=='GET')return json({error:'METHOD_NOT_ALLOWED'},405);
   if(url.search)return json({error:'INVALID_CHART_REQUEST'},400);
   try{return json({version:1,event:lockdownMarker((await load(env.GALAXY_DB)).state)});}
   catch{return json({error:'CHART_UNAVAILABLE'},503);}
  },
  scheduled(env,now,{forcedCarrierInCombat=false}={}){
   const roll=random();
   return update(env.GALAXY_DB,s=>occupationTick(progress(s,now),{now,planets,roll,forcedCarrierInCombat}));
  },
  rally(env,eventId,carrier){
   // The attempt number is part of the stable ID so retries share an arena,
   // but a new relief after a lost fight cannot consume its stale receipt.
   const now=clock();
   return update(env.GALAXY_DB,s=>{
    const next=rallyCarrier(s,{eventId,carrier,makeBattleId:id=>'liberation:'+id+':'+(s.active.failedAttempts??0)});
    if(!next||next===s)return next;
    return {...next,active:{...next.active,battle:s.active.battle??openRelief(next.active,now)}};
   });
  },
  seat(env,battleId,verifiedAdmission){
   const now=clock();
   return update(env.GALAXY_DB,s=>{
    if(s?.active?.battleId!==battleId||!s?.active?.battle)return null;
    const copy=structuredClone(s);
    return seatRelief(copy.active.battle,copy.active,verifiedAdmission,now)?copy:null;
   });
  },
  input(env,battleId,pilot,d){
   const now=clock();
   return update(env.GALAXY_DB,s=>{
    if(s?.active?.battleId!==battleId||!s?.active?.battle)return null;
    const next=progress(s,now);
    if(next.active?.battleId!==battleId)return next;
    const copy=structuredClone(next);
    return reliefInput(copy.active.battle,pilot,d,now)?copy:next;
   });
  },
  async access(env,planetId){return planetAccess((await load(env.GALAXY_DB)).state,planetId);}
 };
}
