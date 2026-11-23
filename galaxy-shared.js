'use strict';
(() => {
 const worker='https://rift-runner.gambizt3.workers.dev';
 const paths=new Map([['rift-carrier','/api/galaxy/carrier'],['bifrost','/api/galaxy/vessels/bifrost']]);
 const now=()=>window.performance.now();
 const destinations=new Set(['Rift Rendezvous','Corsair Cluster','Uncharted Moon','Uncharted Frontier']);
 const bifrostDestinations=new Set(['Uncharted Frontier','Frontier Survey Arc','Outer Reach Sweep']);
 const target=(name,id)=>name===undefined||(id==='bifrost'?bifrostDestinations:destinations).has(name);
 const sector=id=>id==='reach'||id==='frontier';
 const num=(value,lo,hi)=>Number.isFinite(value)&&value>=lo&&value<=hi;
 const epoch=n=>Number.isSafeInteger(n)&&n>=0;
 const xy=(x,y)=>num(x,0,2750)&&num(y,-850,2660);
 function validate(data,id='rift-carrier'){
  const ship=data?.carrier,legs=data?.trajectory;
  if(data?.version!==1||!paths.has(id)||!epoch(data.serverTime)||ship?.id!==id||!sector(ship.sector)||
    !xy(ship.x,ship.y)||!num(ship.heading,0,360)||!num(ship.speed,0,123)||
    !['holding','cruising'].includes(ship.phase)||!target(ship.destination,id)||typeof ship.corsairSurveyed!=='boolean'||!Array.isArray(legs)||legs.length<1||legs.length>100)return null;
  let previous=null;
  for(const p of legs){
   if(!p||!sector(p.sector)||!epoch(p.startAt)||!epoch(p.endAt)||(previous!==null&&p.startAt!==previous)||p.endAt<=p.startAt||
    !target(p.destination,id)||!num(p.rampMs,0,(p.endAt-p.startAt)/2)||!num(p.heading,0,360)||!xy(p.fromX,p.fromY)||!xy(p.toX,p.toY))return null;
   const legLength=Math.hypot(p.toX-p.fromX,p.toY-p.fromY),legTime=p.endAt-p.startAt-p.rampMs;
   if(!p.rampMs?legLength!==0:1000*legLength/legTime>123)return null;
   previous=p.endAt;
  }
  const active=legs.find(p=>p.startAt<=data.serverTime&&p.endAt>data.serverTime);
  if(!active||active.sector!==ship.sector)return null;
  const exact=at(active,data.serverTime,ship.corsairSurveyed,false,id);
  if(Math.hypot(exact.x-ship.x,exact.y-ship.y)>.001||Math.abs(exact.speed-ship.speed)>.001)return null;
  return data;
 }
 function at(p,serverTime,corsairSurveyed,stale,id){
  const len=p.endAt-p.startAt,r=p.rampMs,t=Math.max(0,Math.min(len,serverTime-p.startAt));
  const area=r===0?0:t<r?t*t/(2*r):t>len-r?len-r-(len-t)**2/(2*r):t-r/2;
  const fraction=r?area/(len-r):0,d=Math.hypot(p.toX-p.fromX,p.toY-p.fromY);
  return {id,sector:p.sector,x:p.fromX+(p.toX-p.fromX)*fraction,y:p.fromY+(p.toY-p.fromY)*fraction,
   heading:p.heading,destination:p.destination,next:r&&!stale?{x:p.toX,y:p.toY}:null,phase:stale?'stale':r&&d?(p.toX<=0||p.toX>=2750?'transit':'cruising'):'holding',
   speed:r&&!stale?1000*d*Math.min(1,t/r,(len-t)/r)/(len-r):0,corsairSurveyed};
 }
 function watch(id='rift-carrier'){
  const path=paths.get(id);if(!path)return null;
  const url=(window.location?.hostname==='rift-runner.boundlessghost16.chatgpt.site'?worker:'.')+path;
  let state=null,mark=0,anchor=0,failed=false,pending=null,timer=null;
  function schedule(ms){
   window.clearTimeout(timer);
   if(!document.hidden)timer=window.setTimeout(refresh,ms);
  }
  async function refresh(){
   if(document.hidden||pending)return;
   const request=new AbortController(),started=now();
   pending=request;
   const timeout=window.setTimeout(()=>request.abort(),6500);
   try{
    const reply=await window.fetch(url,{cache:'no-store',credentials:'omit',signal:request.signal});
    if(!reply.ok)throw Error('Galaxy unavailable');
    const data=validate(await reply.json(),id);
    if(!data)throw Error('Invalid carrier snapshot');
    if(document.hidden||pending!==request||state&&data.serverTime<state.serverTime)return;
    mark=now();
    anchor=data.serverTime+Math.min(1200,(mark-started)/2);
    state=data;failed=false;
   }catch{if(!document.hidden)failed=true;}
   finally{
    window.clearTimeout(timeout);
    if(pending===request)pending=null;
    if(!document.hidden)schedule(failed?5000:16000);
   }
  }
  function wake(){
   if(document.hidden){window.clearTimeout(timer);return;}
   const age=now()-mark;
   if(!state||age>2500){window.clearTimeout(timer);refresh();}
   else if(!pending)schedule(Math.max(1000,16000-age));
  }
  document.addEventListener('visibilitychange',wake);
  window.addEventListener('pageshow',wake);
  refresh();
  return Object.freeze({
   sample(time=now()){
    if(!state)return {phase:failed?'unavailable':'connecting'};
    const t=anchor+Math.max(0,time-mark),legs=state.trajectory,tail=legs.at(-1);
    const leg=legs.find(p=>p.startAt<=t&&t<p.endAt);
    if(leg)return at(leg,t,state.carrier.corsairSurveyed,false,id);
    if(t>=tail.endAt)return at(tail,tail.endAt,state.carrier.corsairSurveyed,true,id);
    return state.carrier;
   }
  });
 }
 window.RiftGalaxyState=Object.freeze({watch,validate});
})();
