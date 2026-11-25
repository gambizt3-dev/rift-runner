import {corsairStore} from './corsair-event-store.mjs';
import {admitCorsair,inputCorsair,leaveCorsair,corsairView,corsairMarker,tickCorsair} from './corsair-event.mjs';

export const CORSAIR_EVENT_PATH='/api/galaxy/events/corsair';
const allowedHulls=new Set(['rift-fighter','stocky-light-fighter','bastion-9']);
const allowedVessels=new Set(['rift-carrier','bifrost']);
const allowedKeys={join:['eventId','hull'],leave:['eventId','hull'],step:['eventId','hull','seq','turn','thrust','strafe','fire']};
const berthSql='SELECT vessel_id AS vessel FROM rift_fighter_parking WHERE namespace_hash=?1 AND hull_id=?2';
const headers={'cache-control':'no-store','x-content-type-options':'nosniff','referrer-policy':'no-referrer'};
const reply=(data,status=200)=>Response.json(data,{status,headers});
const error=(key,status)=>reply({error:key},status);
function near(point,site,range){
 return point?.sector===site?.sector&&Number.isFinite(point.x)&&Number.isFinite(point.y)&&
  Math.hypot(point.x-site.x,point.y-site.y)<=range;
}
async function parse(request,action){
 if(!/^application\/json(?:\s*;|$)/i.test(request.headers.get('content-type')??'')||!request.body)return null;
 const reader=request.body.getReader(),decode=new TextDecoder('utf-8',{fatal:true});
 try{
  let size=0,raw='';
  for(;;){
   const {value,done}=await reader.read();if(done)break;
   size+=value.byteLength;if(size>600){await reader.cancel();return null;}
   raw+=decode.decode(value,{stream:true});
  }
  const d=JSON.parse(raw+decode.decode()),keys=allowedKeys[action];
  if(!d||typeof d!=='object'||Array.isArray(d)||Object.keys(d).length!==keys.length||keys.some(k=>!Object.hasOwn(d,k))||
   !allowedHulls.has(d.hull)||typeof d.eventId!=='string'||!/^corsair:(reach|frontier):\d{1,16}$/.test(d.eventId))return null;
  if(action==='step'&&(!Number.isSafeInteger(d.seq)||d.seq<1||
   ![d.turn,d.thrust,d.strafe].every(v=>Number.isFinite(v)&&Math.abs(v)<=1)||typeof d.fire!=='boolean'))return null;
  return d;
 }catch{return null;}finally{reader.releaseLock();}
}
/**
 * readCarrier(vessel, env, now) must use the authoritative Galaxy route, not
 * a request body. The scheduler passes a trusted NPC contact as opportunity.
 */
export function createCorsairHost({readCarrier,range=260,allowBifrost=false,clock=Date.now}){
 if(typeof readCarrier!=='function'||!Number.isFinite(range)||range<=0)throw Error('Missing Galaxy route lookup');
 return {
  async scheduled(env,now,opportunity=null){
   const store=corsairStore(env.GALAXY_DB),active=await store.active();
   if(active)return store.change(active.id,e=>tickCorsair(e,now));
   if(!opportunity||!Number.isSafeInteger(opportunity.startedAt)||now<opportunity.startedAt||now-opportunity.startedAt>90_000)return null;
   const pegasus=await readCarrier('rift-carrier',env,now);
   if(!near(pegasus,opportunity,range))return null;
   const event=await store.open({...opportunity,lead:'rift-carrier',twoCarriers:allowBifrost});
   if(!event||event.settlement)return event;
   return store.change(event.id,e=>tickCorsair(e,now));
  },
  async fetch(request,env){
   const url=new URL(request.url);
   if(url.pathname!==CORSAIR_EVENT_PATH&&!url.pathname.startsWith(CORSAIR_EVENT_PATH+'/'))return null;
   const action=url.pathname===CORSAIR_EVENT_PATH?'marker':url.pathname.slice(CORSAIR_EVENT_PATH.length+1);
   const origin=request.headers.get('origin');
   if(origin&&origin!==url.origin)return error('ORIGIN_NOT_ALLOWED',403);
   if(url.search||action!=='marker'&&!Object.hasOwn(allowedKeys,action))return error('INVALID_EVENT_ROUTE',404);
   if(request.method!==(action==='marker'?'GET':'POST'))return error('METHOD_NOT_ALLOWED',405);
   if(!env?.GALAXY_DB?.prepare)return error('EVENT_UNAVAILABLE',503);
   const db=env.GALAXY_DB,store=corsairStore(db),now=clock();
   try{
    if(action==='marker'){
     const active=await store.active();
     return reply({version:1,event:active?corsairMarker(active,now):null});
    }
    const token=/^Bearer ([0-9a-f]{64})$/.exec(request.headers.get('authorization')??'')?.[1];
    if(!token)return error('PARKING_TOKEN_REQUIRED',401);
    const data=await parse(request,action);if(!data)return error('INVALID_EVENT_REQUEST',400);
    const hash=await crypto.subtle.digest('SHA-256',new TextEncoder().encode('rift-runner:fighter-parking:v1:'+token));
    const pilot=Array.from(new Uint8Array(hash),b=>b.toString(16).padStart(2,'0')).join('');
    const berth=await db.prepare(berthSql).bind(pilot,data.hull).first();
    if(!allowedVessels.has(berth?.vessel))return error('PARKING_NOT_CONFIRMED',409);
    const origin=berth.vessel,guard={pilot,hull:data.hull,origin},previous=await store.get(data.eventId);
    if(!previous)return error('EVENT_NOT_FOUND',404);
    if(!previous.joinable.includes(origin))return error('ORIGIN_NOT_OPEN',409);
    const seat=previous.model.players.find(p=>p.pilot===pilot);
    if(seat&&(seat.ship.vessel!==origin||seat.ship.hull!==data.hull))return error('EVENT_SHIP_MISMATCH',409);
    if(action==='join'&&!seat&&!previous.settlement){
     const point=await readCarrier(origin,env,now);
     if(!near(point,previous,range))return error('EVENT_OUT_OF_RANGE',409);
    }
    let allowed=false;
    const event=await store.change(data.eventId,e=>{
     // Recheck the seat on a CAS retry to avoid accepting a competing hull.
     const match=e.model.players.find(p=>p.pilot===pilot);
     if(match&&(match.ship.vessel!==origin||match.ship.hull!==data.hull)){allowed=false;return;}
     const run=action==='join'?()=>admitCorsair(e,{...guard,eventId:data.eventId,verified:true},now):
      action==='step'?()=>inputCorsair(e,pilot,data,now):()=>leaveCorsair(e,pilot,now);
     allowed=!!run();
    },guard);
    if(!event)return error('PARKING_NOT_CONFIRMED',409);
    const view=corsairView(event,pilot,now);
    if(view&&(allowed||event.settlement))return reply(view);
    return error(event.settlement?'EVENT_CLOSED':action==='join'?'EVENT_NOT_JOINABLE':'JOIN_REQUIRED',409);
   }catch{return error('EVENT_UNAVAILABLE',503);}
  }
 };
}
