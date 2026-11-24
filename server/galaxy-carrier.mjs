// Creative-world authority; no account data, client commands, or timers needed.
const GALAXY_PATH='/api/galaxy/carrier',GALAXY_ID='rift-carrier',GALAXY_VERSION=1;
const BIFROST_PATH='/api/galaxy/vessels/bifrost',BIFROST_ID='bifrost';
const GALAXY_W=2750,GALAXY_NORTH=-850,GALAXY_SOUTH=2660,GALAXY_CRUISE=76,GALAXY_HORIZON=45000;
// Both vessels retain their seeded model-1 paths. Stretch wall time only from
// the first non-gate leg boundary after this shared, immutable rollout instant.
const GALAXY_TIME_SCALE=5,GALAXY_SLOWDOWN_NOT_BEFORE_MS=1795466520000; // 2026-11-23 20:42 UTC
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
const BIFROST_HOME={sector:'reach',x:1700,y:-340};
function galaxyPlan(seed,id=GALAXY_ID){
 const bifrost=id===BIFROST_ID,start=bifrost?BIFROST_HOME:GALAXY_HOME;
 let state=seed>>>0,at=0,pos={...start},heading=0,surveyAt=0;
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
  const ramp=1250,cruise=bifrost?68:GALAXY_CRUISE,duration=Math.max(2*ramp,Math.ceil(1000*range/cruise)+ramp);
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
 if(bifrost){
  // Bifrost surveys the outer reaches rather than following Pegasus.
  // It uses different gates, observation points, and a separate timing anchor.
  const sweep='Outer Reach Sweep',arc='Frontier Survey Arc';
  for(let trip=0;trip<6;trip++){
   const out=-450+rand()*690,back=1320+rand()*940;
   gate(true,out,frontier);
   fly(1420+rand()*580,235+rand()*580,arc);
   fly(940+rand()*800,1410+rand()*930,arc);hold(arc);
   gate(false,back,sweep);
   fly(1420+rand()*480,1030+rand()*460,sweep);
   fly(start.x,start.y,sweep);
  }
  // This encounter belongs to Pegasus, not to the independent Bifrost route.
  return {duration:at,surveyAt:Infinity,segments};
 }
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
function galaxySlowdownBoundary(plan,epoch,notBefore=GALAXY_SLOWDOWN_NOT_BEFORE_MS){
 if(notBefore<=epoch)return epoch;
 const age=notBefore-epoch,local=age%plan.duration,segments=plan.segments;
 let cycleStart=notBefore-local,index=galaxyFind(plan,local);
 // Gate crossings retain their ordinary coordinate wrap. Do not make the
 // speed cutover at the same instant as that pre-existing sector change.
 if(local!==segments[index].startAt&&++index===segments.length){index=0;cycleStart+=plan.duration;}
 while(segments[index].sector!==segments[(index+segments.length-1)%segments.length].sector){
  if(++index===segments.length){index=0;cycleStart+=plan.duration;}
 }
 return cycleStart+segments[index].startAt;
}
function galaxySample(plan,epoch,serverTime,id=GALAXY_ID,notBefore=GALAXY_SLOWDOWN_NOT_BEFORE_MS){
 const effective=Math.max(serverTime,epoch),boundary=galaxySlowdownBoundary(plan,epoch,notBefore);
 const original=effective>boundary?boundary+(effective-boundary)/GALAXY_TIME_SCALE:effective;
 const timeFor=at=>at>boundary?boundary+(at-boundary)*GALAXY_TIME_SCALE:at;
 const age=original-epoch,local=age%plan.duration;
 let cycleStart=epoch+Math.floor(age/plan.duration)*plan.duration,index=galaxyFind(plan,local);
 const trajectory=[];
 do{
  const {startAt,endAt,rampMs,...rest}=plan.segments[index],start=startAt+cycleStart;
  trajectory.push({...rest,startAt:timeFor(start),endAt:timeFor(endAt+cycleStart),rampMs:rampMs*(start>=boundary?GALAXY_TIME_SCALE:1)});
  if(++index>=plan.segments.length){index=0;cycleStart+=plan.duration;}
 }while(trajectory.at(-1).endAt<effective+GALAXY_HORIZON);
 const current=trajectory[0];
 return {version:GALAXY_VERSION,serverTime,carrier:{id,sector:current.sector,...galaxyPose(current,effective),
  heading:current.heading,destination:current.destination,corsairSurveyed:age>=plan.surveyAt},trajectory};
}

// One bounded test event. Use a routine Reach waypoint, where speed is
// already zero, to freeze and then resume without teleporting the vessel.
const CROSS_BATTLE_CUTOFF=Date.parse('2026-11-24T06:50:00Z');
const CROSS_BATTLE_DURATION=4*60*60*1000;
function blackwakeWindow(plan,epoch){
 const threshold=Math.max(epoch,CROSS_BATTLE_CUTOFF),boundary=galaxySlowdownBoundary(plan,epoch);
 const wall=at=>at>boundary?boundary+(at-boundary)*GALAXY_TIME_SCALE:at;
 const original=threshold>boundary?boundary+(threshold-boundary)/GALAXY_TIME_SCALE:threshold;
 const cycle=Math.floor((original-epoch)/plan.duration);
 for(let n=cycle;n<=cycle+1;n++){
  for(let j=0;j<plan.segments.length;j++){
   const segment=plan.segments[j],prior=plan.segments[(j+plan.segments.length-1)%plan.segments.length];
   const startsAt=wall(epoch+n*plan.duration+segment.startAt);
   if(startsAt<threshold||segment.sector!=='reach'||prior.sector!==segment.sector||
    segment.fromX<100||segment.fromX>GALAXY_W-100)continue;
   const {fromX:x,fromY:y}=segment,endsAt=startsAt+CROSS_BATTLE_DURATION;
   const dx=GALAXY_CORSAIR.x-x,dy=GALAXY_CORSAIR.y-y,d=Math.hypot(dx,dy);
   const px=x+(d>1?dx/d*85:85),py=y+(d>1?dy/d*85:0);
   const heading=(450+Math.atan2(py-y,px-x)*180/Math.PI)%360;
   return {startsAt,endsAt,sector:'reach',x,y,heading,px,py,destination:segment.destination};
  }
 }
 return null;
}
function galaxyBifrostSample(plan,epoch,now){
 const event=blackwakeWindow(plan,epoch);
 if(!event)return galaxySample(plan,epoch,now,BIFROST_ID);
 const {startsAt,endsAt,x,y,heading,sector,destination}=event;
 const hold={sector,fromX:x,fromY:y,toX:x,toY:y,startAt:startsAt,endAt:endsAt,rampMs:0,heading,destination};
 if(now>=startsAt&&now<endsAt)return {version:GALAXY_VERSION,serverTime:now,
  carrier:{id:BIFROST_ID,sector,x,y,speed:0,phase:'holding',heading,destination,corsairSurveyed:false},trajectory:[hold]};
 const delay=now>=endsAt?CROSS_BATTLE_DURATION:0;
 const snapshot=galaxySample(plan,epoch,now-delay,BIFROST_ID);
 snapshot.serverTime=now;
 if(delay)snapshot.trajectory=snapshot.trajectory.map(s=>({...s,startAt:s.startAt+delay,endAt:s.endAt+delay}));
 else if(snapshot.trajectory.at(-1).endAt>=startsAt)
  snapshot.trajectory=[...snapshot.trajectory.filter(s=>s.startAt<startsAt),hold];
 return snapshot;
}
function makeGalaxyCarrierHandler({clock=()=>Date.now(),logger=console,id=GALAXY_ID,path=GALAXY_PATH}={}){
 const cache=new WeakMap(),routeCache=new Map();
 const body=(value,status=200,headers={})=>new Response(JSON.stringify(value),{status,headers:{...galaxyHeaders,...headers}});
 function route(seed){
  let plan=routeCache.get(seed);
  if(!plan){
   if(routeCache.size>=GALAXY_MAX_CACHE)routeCache.delete(routeCache.keys().next().value);
   routeCache.set(seed,plan=galaxyPlan(seed,id));
  }
  return plan;
 }
 const fail=()=>body({error:'GALAXY_UNAVAILABLE'},503,{'retry-after':'30'});
 return async function handleGalaxyCarrier(request,env,ctx){
  if(new URL(request.url).pathname!==path)return null;
  if(request.method!=='GET')return body({error:'METHOD_NOT_ALLOWED'},405,{allow:'GET'});
  const db=env?.GALAXY_DB;if(!db?.prepare)return fail();
  let entry=cache.get(db),now=clock();
  if(!Number.isSafeInteger(now)||now<=0)return fail();
  try{
   if(!entry||now>=entry.expires||now<entry.readAt){
    const row=await db.prepare(galaxyRead).bind(id).first();
    if(!row||row.model_version!==GALAXY_VERSION||!Number.isSafeInteger(row.seed)||row.seed<1||row.seed>4294967295||
      !Number.isSafeInteger(row.epoch_ms)||row.epoch_ms<=0||!Number.isSafeInteger(row.checkpoint_at_ms)||row.checkpoint_at_ms<row.epoch_ms)return fail();
    entry={row,readAt:now,expires:now+GALAXY_READ_MS,lastAttempt:row.checkpoint_at_ms};
    cache.set(db,entry);
   }
   now=clock();if(!Number.isSafeInteger(now)||now<=0)return fail();
   const row=entry.row;
   const snapshot=id===BIFROST_ID?galaxyBifrostSample(route(row.seed),row.epoch_ms,now):galaxySample(route(row.seed),row.epoch_ms,now,id);
   if(now-Math.max(row.checkpoint_at_ms,entry.lastAttempt)>=GALAXY_CHECKPOINT_MS){
    entry.lastAttempt=now;
    const {sector,x,y,heading,speed,corsairSurveyed}=snapshot.carrier;
    const checkpoint=Promise.resolve().then(()=>db.prepare(galaxySave).bind(now,sector,x,y,heading,speed,+corsairSurveyed,
     id,GALAXY_VERSION,row.seed,row.epoch_ms,row.checkpoint_at_ms,now-GALAXY_CHECKPOINT_MS).run()).then(result=>{
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
const handleBifrost=makeGalaxyCarrierHandler({id:BIFROST_ID,path:BIFROST_PATH});
export {blackwakeWindow,galaxyBifrostSample,handleGalaxyCarrier,handleBifrost,BIFROST_PATH,BIFROST_ID,makeGalaxyCarrierHandler,galaxyPlan,galaxyPose,galaxySample,galaxySlowdownBoundary,GALAXY_SLOWDOWN_NOT_BEFORE_MS,GALAXY_PATH};
