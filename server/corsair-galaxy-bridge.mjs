import {createCorsairHost} from './corsair-event-host.mjs';
import {GALAXY_PATH,BIFROST_PATH,BIFROST_ID,makeGalaxyCarrierHandler} from './galaxy-carrier.mjs';

const site=Object.freeze({sector:'reach',x:365,y:1160}),cycleMs=20*60_000;
export function makeCorsairGalaxyBridge({clock=Date.now,allowBifrost=false}={}){
 const endpoints={
  'rift-carrier':{path:GALAXY_PATH,handler:makeGalaxyCarrierHandler({clock})},
  bifrost:{path:BIFROST_PATH,handler:makeGalaxyCarrierHandler({clock,id:BIFROST_ID,path:BIFROST_PATH})}
 };
 const host=createCorsairHost({clock,allowBifrost,requireApproach:true,async readCarrier(vessel,env){
  const source=endpoints[vessel];if(!source)return null;
  const response=await source.handler(new Request('https://internal.invalid'+source.path),env);
  return response?.ok?(await response.json()).carrier:null;
 }});
 return {
  fetch:host.fetch,
  scheduled(event,env){
   const now=event.scheduledTime;if(!Number.isSafeInteger(now))return null;
   // A stable window ID fences cron retries; only a fleet close to Corsair
   // at the start of a window can open a new occurrence.
   const startedAt=Math.floor(now/cycleMs)*cycleMs;
   return host.scheduled(env,now,{...site,startedAt});
  }
 };
}
