// Public stock and aggregate berth occupancy only; never serialize berth rows.
const carrierStatsPath=/^\/api\/multicrew\/vessels\/(rift-carrier|bifrost)\/stats$/;
const carrierStatsSite='https://rift-runner.boundlessghost16.chatgpt.site';
const carrierStatsWorker='https://rift-runner.gambizt3.workers.dev';
const carrierStatsRead=`SELECT supply,
 (SELECT COUNT(DISTINCT namespace_hash) FROM rift_fighter_parking WHERE vessel_id=?1) AS playerPilotsAboard
 FROM rift_carrier_supplies WHERE vessel_id=?1`;
async function handleCarrierStats(request,env){
 const url=new URL(request.url),vesselId=carrierStatsPath.exec(url.pathname)?.[1];
 if(!vesselId)return null;
 const origin=request.headers.get('origin');
 const headers={'content-type':'application/json; charset=utf-8','cache-control':'no-store',
  'x-content-type-options':'nosniff',vary:'Origin'};
 if(origin===carrierStatsSite)headers['access-control-allow-origin']=carrierStatsSite;
 const send=(data,status=200,extra={})=>new Response(JSON.stringify(data),{status,headers:{...headers,...extra}});
 if(origin&&origin!==carrierStatsSite&&origin!==carrierStatsWorker)return send({error:'ORIGIN_NOT_ALLOWED'},403);
 if(request.method!=='GET')return send({error:'METHOD_NOT_ALLOWED'},405,{allow:'GET'});
 if(url.search)return send({error:'INVALID_STATS_REQUEST'},400);
 try{
  const row=await env.GALAXY_DB.prepare(carrierStatsRead).bind(vesselId).first();
  if(row&&[row.supply,row.playerPilotsAboard].every(n=>Number.isSafeInteger(n)&&n>=0)){
   return send({version:1,vesselId,supply:row.supply,playerPilotsAboard:row.playerPilotsAboard},200,
    {'cache-control':'public, max-age=15'});
  }
 }catch{/* Fail closed without exposing query details. */}
 return send({error:'CARRIER_STATS_UNAVAILABLE'},503);
}
export {handleCarrierStats};
