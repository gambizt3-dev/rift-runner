// Server-owned campaign rules. Neither a map tap nor a client battle report can mutate this state.
export const LOCKDOWN_WINDOW_MS=24*60*60_000;
export const LOCKDOWN_DURATION_MS=20*60_000;
export const LIBERATION_RANGE=260;
const inputId=/^[a-z0-9-]{1,48}$/;
const fresh=()=>({lastStartAt:null,active:null,lastLiberation:null});
const body=(c,p)=>c?.sector===p.sector&&Number.isFinite(c.x)&&Number.isFinite(c.y)&&
 Math.hypot(c.x-p.x,c.y-p.y)<=LIBERATION_RANGE;
const validPlanet=p=>p?.occupationEligible===true&&p.safeZone!==true&&p.essential!==true&&p.storyCritical!==true&&inputId.test(p.id??'')&&
 ['reach','frontier'].includes(p.sector)&&[p.x,p.y].every(Number.isFinite);
const expired=(event,now)=>now>=(event.endsAt??event.startAt+LOCKDOWN_DURATION_MS);
export function expireLockdown(state,now){
 if(!state?.active||!expired(state.active,now))return state;
 return {...state,lastStartAt:state.lastStartAt??state.active.startAt,active:null};
}
export function occupationTick(prior, {now,planets,roll,forcedCarrierInCombat=false}){
 const state=expireLockdown(prior??fresh(),now);
 if(!Number.isSafeInteger(now)||now<0||!Array.isArray(planets)||!Number.isFinite(roll)||roll<0||roll>=1)return prior??fresh();
 if(state.active||forcedCarrierInCombat||state.lastStartAt!=null&&now-state.lastStartAt<LOCKDOWN_WINDOW_MS)return state;
 const eligible=planets.filter(validPlanet).sort((a,b)=>a.id.localeCompare(b.id));
 const p=eligible[Math.floor(roll*eligible.length)];
 if(!p)return state;
 return {...state,lastStartAt:now,active:{id:'lockdown:'+p.id+':'+now,planetId:p.id,sector:p.sector,
  x:p.x,y:p.y,startAt:now,endsAt:now+LOCKDOWN_DURATION_MS,battleId:null,carriers:[]}};
}
export function planetAccess(state, planetId, now=Date.now()){
 return expireLockdown(state,now)?.active?.planetId===planetId?'lockdown':'open';
}
export function rallyCarrier(state,{eventId,carrier,makeBattleId,now=Date.now()}){
 const event=state?.active;
 if(!event||expired(event,now)||event.id!==eventId||!carrier||!inputId.test(carrier.id??'')||
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
 !Number.isSafeInteger(result.at)||result.at<a.startAt||expired(a,result.at))return state;
 if(result.outcome==='defenders')return {...state,active:{...a,battleId:null,battle:null,carriers:[],failedAttempts:(a.failedAttempts??0)+1}};
 if(result.outcome!=='liberators')return state;
 return {...state,active:null,lastStartAt:state.lastStartAt??a.startAt,lastLiberation:{eventId:a.id,planetId:a.planetId,at:result.at}};
}
export function lockdownMarker(state,now=Date.now()){
 const a=expireLockdown(state,now)?.active;
 return a?{id:a.id,planetId:a.planetId,sector:a.sector,startsAt:a.startAt,endsAt:a.endsAt??a.startAt+LOCKDOWN_DURATION_MS,status:'lockdown',
  reliefUnderway:a.battleId!==null,carrierCount:a.carriers.length}:null;
}
