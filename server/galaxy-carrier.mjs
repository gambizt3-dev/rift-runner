// Creative-world authority; no account data, client commands, or timers needed.
const GALAXY_PATH='/api/galaxy/carrier',GALAXY_ID='rift-carrier',GALAXY_VERSION=1;
const GALAXY_W=2750,GALAXY_NORTH=-850,GALAXY_SOUTH=2660,GALAXY_CRUISE=76,GALAXY_HORIZON=45000;
const GALAXY_READ_MS=90000,GALAXY_CHECKPOINT_MS=180000,GALAXY_MAX_CACHE=8;
const GALAXY_HOME={sector:'reach',x:563,y:476},GALAXY_CORSAIR={x:365,y:1160},GALAXY_MOON={x:805,y:1920};
const GALAXY_DESTINATIONS={rendezvous:'Rift Rendezvous',corsair:'Corsair Cluster',moon:'Uncharted Moon',frontier:'Uncharted Frontier'};
const galaxyHeaders={'cache-control':'no-store','x-content-type-options':'nosniff','content-type':'application/json; charset=UTF-8',
 'access-control-allow-origin':'https://rift-runner.boundlessghost16.chatgpt.site'};
const galaxyClamp=(n,min,max)=>Math.min(max,Math.max(min,n));
const galaxyRead='SELECT model_version,seed,epoch_ms,checkpoint_at_ms FROM rift_galaxy_carrier WHERE carrier_id=?1';
const galaxySave=`UPDATE rift_galaxy_carrier SET checkpoint_at_ms=?1,checkpoint_sector=?2,checkpoint_x=?3,
 checkpoint_y=?4,checkpoint_heading=?5,checkpoint_speed=?6,checkpoint_corsair=?7
 WHERE carrier_id=?8 AND model_version=?9 AND seed=?10 AND epoch_ms=?11
 AND checkpoint_at_ms=?12 AND checkpoint_at_ms<=?13`;

/**
 * Generate a fixed loop of varied crew routes from a persisted seed. Merely
 * sampling the resulting function needs no DB writes, timer, job, or rider.
 * Keep model version 1's math stable after release; change via explicit migration.
 */
function galaxyPlan(seed){
 let state=seed>>>0,at=0,pos={...GALAXY_HOME},heading=0,surveyAt=0;
 const segments=[];
 const rand=()=>((state=(Math.imul(state,1664525)+1013904223)>>>0)/4294967296);
 function segment(x,y,dt,rampMs,destination,nextHeading=heading){
  segments.push({sector:pos.sector,fromX:pos.x,fromY:pos.y,toX:x,toY:y,startAt:at,endAt:at+dt,rampMs,heading:nextHeading,destination});
  at+=dt;heading=nextHeading;pos={sector:pos.sector,x,y};
 }
 function hold(destination){segment(pos.x,pos.y,680+Math.floor(rand()*780),0,destination);}
 function fly(x,y,destination){
  const dx=x-pos.x,dy=y-pos.y,range=Math.hypot(dx,dy);
  if(range===0)return;
  const ramp=1250,duration=Math.max(2*ramp,Math.ceil(1000*range/GALAXY_CRUISE)+ramp);
  segment(x,y,duration,ramp,destination,(450+Math.atan2(dy,dx)*180/Math.PI)%360);
 }
 function bearing(point,minimum,span){
  const a=rand()*2*Math.PI,d=minimum+rand()*span;
  return [point.x+Math.cos(a)*d,point.y+Math.sin(a)*d];
 }
 function gate(east,y,destination){
  y=galaxyClamp(y,GALAXY_NORTH+120,GALAXY_SOUTH-120);
  fly(east?GALAXY_W:0,y,destination);
  pos={sector:east?'frontier':'reach',x:east?35:GALAXY_W-35,y};
 }
 // Navigators choose a seeded approach for each named destination. Long
 // survey runs replace incidental waypoints; crossings do not insert holds.
 const {rendezvous,corsair,moon,frontier}=GALAXY_DESTINATIONS;
 for(let trip=0;trip<6;trip++){
  hold(rendezvous);fly(...bearing(GALAXY_CORSAIR,25,27),corsair);
  if(trip===0)surveyAt=at;
  hold(corsair);fly(...bearing(GALAXY_MOON,35,42),moon);hold(moon);
  const out=1410+rand()*450,back=325+rand()*510;
  gate(true,out,frontier);
  fly(900+rand()*330,galaxyClamp((out+back)/2+(rand()-.45)*380,GALAXY_NORTH+120,GALAXY_SOUTH-120),frontier);
  gate(false,back,rendezvous);
  fly(GALAXY_HOME.x,GALAXY_HOME.y,rendezvous);
 }
 return {duration:at,surveyAt,segments};
}
function galaxyPose(segment,at){
 const D=segment.endAt-segment.startAt,R=segment.rampMs,t=galaxyClamp(at-segment.startAt,0,D);
 const distance=Math.hypot(segment.toX-segment.fromX,segment.toY-segment.fromY);
 if(!R)return {x:segment.toX,y:segment.toY,speed:0,phase:'holding'};
 const area=t<R?t*t/(2*R):t>D-R?D-R-(D-t)**2/(2*R):t-R/2;
 const fraction=galaxyClamp(area/(D-R),0,1);
 return {x:segment.fromX+(segment.toX-segment.fromX)*fraction,y:segment.fromY+(segment.toY-segment.fromY)*fraction,
  speed:1000*distance/(D-R)*Math.min(1,t/R,(D-t)/R),phase:'cruising'};
}
function galaxyFind(plan,local){
 let start=0,end=plan.segments.length-1;
 while(start<end){
  const mid=(start+end)>>1;
  if(local>=plan.segments[mid].endAt)start=mid+1;else end=mid;
 }
 return start;
}
function galaxySample(plan,epoch,serverTime){
 const effective=Math.max(serverTime,epoch),age=effective-epoch,local=age%plan.duration;
 let cycleStart=effective-local,index=galaxyFind(plan,local);
 const trajectory=[];
 do{
  const {startAt,endAt,...rest}=plan.segments[index];
  trajectory.push({...rest,startAt:startAt+cycleStart,endAt:endAt+cycleStart});
  if(++index>=plan.segments.length){index=0;cycleStart+=plan.duration;}
 }while(trajectory.at(-1).endAt<effective+GALAXY_HORIZON);
 const current=trajectory[0];
 return {version:GALAXY_VERSION,serverTime,carrier:{id:GALAXY_ID,sector:current.sector,...galaxyPose(current,effective),
  heading:current.heading,destination:current.destination,corsairSurveyed:age>=plan.surveyAt},trajectory};
}

function makeGalaxyCarrierHandler({clock=()=>Date.now(),logger=console}={}){
 const cache=new WeakMap(),routeCache=new Map();
 const body=(value,status=200,headers={})=>new Response(JSON.stringify(value),{status,headers:{...galaxyHeaders,...headers}});
 function route(seed){
  let plan=routeCache.get(seed);
  if(!plan){
   if(routeCache.size>=GALAXY_MAX_CACHE)routeCache.delete(routeCache.keys().next().value);
   routeCache.set(seed,plan=galaxyPlan(seed));
  }
  return plan;
 }
 const fail=()=>body({error:'GALAXY_UNAVAILABLE'},503,{'retry-after':'30'});
 return async function handleGalaxyCarrier(request,env,ctx){
  if(new URL(request.url).pathname!==GALAXY_PATH)return null;
  if(request.method!=='GET')return body({error:'METHOD_NOT_ALLOWED'},405,{allow:'GET'});
  const db=env?.GALAXY_DB;if(!db?.prepare)return fail();
  let entry=cache.get(db),now=clock();
  if(!Number.isSafeInteger(now)||now<=0)return fail();
  try{
   if(!entry||now>=entry.expires||now<entry.readAt){
    const row=await db.prepare(galaxyRead).bind(GALAXY_ID).first();
    if(!row||row.model_version!==GALAXY_VERSION||!Number.isSafeInteger(row.seed)||row.seed<1||row.seed>4294967295||
      !Number.isSafeInteger(row.epoch_ms)||row.epoch_ms<=0||!Number.isSafeInteger(row.checkpoint_at_ms)||row.checkpoint_at_ms<row.epoch_ms)return fail();
    entry={row,readAt:now,expires:now+GALAXY_READ_MS,lastAttempt:row.checkpoint_at_ms};
    cache.set(db,entry);
   }
   now=clock();if(!Number.isSafeInteger(now)||now<=0)return fail();
   const row=entry.row;
   const snapshot=galaxySample(route(row.seed),row.epoch_ms,now);
   if(now-Math.max(row.checkpoint_at_ms,entry.lastAttempt)>=GALAXY_CHECKPOINT_MS){
    entry.lastAttempt=now;
    const {sector,x,y,heading,speed,corsairSurveyed}=snapshot.carrier;
    const checkpoint=Promise.resolve().then(()=>db.prepare(galaxySave).bind(now,sector,x,y,heading,speed,+corsairSurveyed,
     GALAXY_ID,GALAXY_VERSION,row.seed,row.epoch_ms,row.checkpoint_at_ms,now-GALAXY_CHECKPOINT_MS).run()).then(result=>{
      if(result?.meta?.changes===1)row.checkpoint_at_ms=now;
     }).catch(()=>logger?.warn?.('galaxy checkpoint failed'));
    if(ctx?.waitUntil)ctx.waitUntil(checkpoint);else await checkpoint;
   }
   return body(snapshot);
  }catch{
   logger?.warn?.('galaxy anchor unavailable');
   return fail();
  }
 };
}
const handleGalaxyCarrier=makeGalaxyCarrierHandler();
export {handleGalaxyCarrier,makeGalaxyCarrierHandler,galaxyPlan,galaxyPose,galaxySample,GALAXY_PATH};
