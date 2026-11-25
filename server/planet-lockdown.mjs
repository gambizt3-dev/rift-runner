// Server-owned campaign rules. Neither a map tap nor a client battle report can mutate this state.
export const LOCKDOWN_WINDOW_MS=20*60_000;
export const LIBERATION_RANGE=260;
const cooldown=40*60_000;
const inputId=/^[a-z0-9-]{1,48}$/;
const fresh=()=>({lastWindow:null,active:null,lastLiberation:null});
const body=(c,p)=>c?.sector===p.sector&&Number.isFinite(c.x)&&Number.isFinite(c.y)&&
 Math.hypot(c.x-p.x,c.y-p.y)<=LIBERATION_RANGE;
const validPlanet=p=>p?.occupationEligible===true&&p.safeZone!==true&&inputId.test(p.id??'')&&
 ['reach','frontier'].includes(p.sector)&&[p.x,p.y].every(Number.isFinite);
export function occupationTick(prior, {now,planets,roll,forcedCarrierInCombat=false}){
 const state=prior??fresh();
 if(!Number.isSafeInteger(now)||now<0||!Array.isArray(planets)||!Number.isFinite(roll)||roll<0||roll>=1)return state;
 const window=Math.floor(now/LOCKDOWN_WINDOW_MS);
 if(state.active||state.lastWindow!==null&&window<=state.lastWindow)return state;
 const checked={...state,lastWindow:window};
 if(forcedCarrierInCombat||roll>=0.22)return checked;
 const eligible=planets.filter(validPlanet).filter(p=>p.id!==state.lastLiberation?.planetId||
  now-state.lastLiberation.at>=cooldown).sort((a,b)=>a.id.localeCompare(b.id));
 const p=eligible[Math.floor(roll/0.22*eligible.length)];
 if(!p)return checked;
 return {...checked,active:{id:'lockdown:'+p.id+':'+window,planetId:p.id,sector:p.sector,
  x:p.x,y:p.y,startAt:now,battleId:null,carriers:[]}};
}
export function planetAccess(state, planetId){
 return state?.active?.planetId===planetId?'lockdown':'open';
}
export function rallyCarrier(state,{eventId,carrier,makeBattleId}){
 const event=state?.active;
 if(!event||event.id!==eventId||!carrier||!inputId.test(carrier.id??'')||
   carrier.canDeploy!==true||carrier.allegiance==='aliens'||!body(carrier,event))return null;
 if(event.carriers.includes(carrier.id))return state;
 const battleId=event.battleId??makeBattleId?.(event.id);
 if(typeof battleId!=='string'||!/^liberation:[a-z0-9:-]{1,90}$/.test(battleId))return null;
 return {...state,active:{...event,battleId,carriers:[...event.carriers,carrier.id]}};
}
// Call only after loading the final outcome from the trusted shared battle record.
export function settleLiberation(state,result){
 const a=state?.active;
 if(!a?.battleId||!result||result.eventId!==a.id||result.battleId!==a.battleId||
 !Number.isSafeInteger(result.at)||result.at<a.startAt)return state;
 if(result.outcome==='defenders')return {...state,active:{...a,battleId:null,battle:null,carriers:[],failedAttempts:(a.failedAttempts??0)+1}};
 if(result.outcome!=='liberators')return state;
 return {...state,active:null,lastLiberation:{eventId:a.id,planetId:a.planetId,at:result.at}};
}
export function lockdownMarker(state){
 const a=state?.active;
 return a?{id:a.id,planetId:a.planetId,sector:a.sector,startsAt:a.startAt,status:'lockdown',
  reliefUnderway:a.battleId!==null,carrierCount:a.carriers.length}:null;
}
