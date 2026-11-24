import {sharedRosterSummary,sharedCarrierReserve,sharedCarrierShipsInside,sharedRiftReserveVolleyDamage} from './shared-flight.mjs';
// Public stock and aggregate berth occupancy only; never serialize berth rows.
const carrierStatsPath=/^\/api\/multicrew\/vessels\/(rift-carrier|bifrost)\/stats$/;
const carrierStatsSite='https://rift-runner.boundlessghost16.chatgpt.site';
const carrierStatsWorker='https://rift-runner.gambizt3.workers.dev';
// Authored overworld formation, separate from reserve hulls and live berth counts.
const carrierStatsFormations={
 'rift-carrier':[
  {id:'rift-carrier',name:'Pegasus',vesselClass:'Pegasus-class carrier',role:'command',forward:0,lateral:0},
  {id:'pegasus-corvette-escort',name:'Resolute',guildId:'federal-navy',vesselClass:'Corvette',hullModel:'Keel-4',multicrew:true,commanderName:'Imani Rook',commanderTitle:'Captain',role:'escort',forward:-55,lateral:42}
 ],
 bifrost:[
  {id:'bifrost',name:'Bifrost',vesselClass:'Bifrost-class carrier',role:'command',forward:0,lateral:0}
 ]
};
// Assigned reserve profiles are distinct from a player's fitted inventory.
const carrierReserveWingFit=Object.freeze({engine:'stock-thruster',core:'weifer-he3-core',battery:'kestrel-h20-reserve-cell',
 weapons:Object.freeze(['sparrow-s2','sparrow-s2'])});
const carrierFitsByHull=Object.freeze({'bastion-9':carrierReserveWingFit,'stocky-light-fighter':carrierReserveWingFit});
// Standard-volley damage: reserve Rift-4 uses the actual online NPC shot;
 // a Sparrow S2 does 2 per projectile in the fighter fitter and both mounted
 // Sparrows fire together. Burst/reload, preview turrets, and personal fits
 // are out of scope, as are player readiness and any unverified escort stores.
const carrierSparrowVolleyDamage=2;
const carrierReserveWeaponPower={
 'rift-fighter':sharedRiftReserveVolleyDamage,
 ...Object.fromEntries(Object.entries(carrierFitsByHull).map(([hull,fit])=>
  [hull,fit.weapons.reduce((sum,id)=>sum+(id==='sparrow-s2'?carrierSparrowVolleyDamage:0),0)]))
};
function carrierArmadaPower(formation,carrierShipsByHull,availableNpcPilots){
 const storedWeaponPower=Object.entries(carrierShipsByHull).reduce((total,[hull,count])=>
  total+count*(carrierReserveWeaponPower[hull]??0),0);
 return {vesselCount:formation.length,vessels:formation,manpower:storedWeaponPower*availableNpcPilots,
  storedWeaponPower,availableNpcPilots,availablePlayerPilots:null,playerStoredWeaponPower:null,
  coverage:'verified-npc-only'};
}
const carrierStatsRead=`WITH battle AS (
 SELECT model FROM rift_shared_flight WHERE battle_id='blackwake'
 ), active_flights AS (
 SELECT json_extract(p.value,'$.namespace') AS owner, json_extract(p.value,'$.ship.hull') AS hull
 FROM battle,json_each(battle.model,'$.players') AS p
 WHERE json_extract(battle.model,'$.status')='running'
 AND json_extract(battle.model,'$.end')>?2
 AND json_extract(p.value,'$.touchedAt')>?2-30000
 AND json_extract(p.value,'$.ship.vessel')=?1
 ), stored AS (
 SELECT namespace_hash,hull_id FROM rift_fighter_parking AS berth
 WHERE berth.vessel_id=?1 AND berth.bay IN (1,2,4,6)
 AND berth.hull_id IN ('rift-fighter','bastion-9','stocky-light-fighter')
 AND NOT EXISTS(SELECT 1 FROM active_flights AS f WHERE f.owner=berth.namespace_hash AND f.hull=berth.hull_id)
 ), totals AS (
 SELECT COUNT(DISTINCT namespace_hash) AS owners,
 COUNT(CASE WHEN hull_id='rift-fighter' THEN 1 END) AS rift,
 COUNT(CASE WHEN hull_id='bastion-9' THEN 1 END) AS bastion,
 COUNT(CASE WHEN hull_id='stocky-light-fighter' THEN 1 END) AS stocky
 FROM stored
 )
 SELECT supply,totals.*,(SELECT model FROM battle) AS battleModel
 FROM rift_carrier_supplies CROSS JOIN totals WHERE vessel_id=?1`;
async function handleCarrierStats(request,env,clock=Date.now){
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
  const now=clock(),row=await env.GALAXY_DB.prepare(carrierStatsRead).bind(vesselId,now).first();
  if(row&&[row.supply,row.owners,row.rift,row.bastion,row.stocky].every(n=>Number.isSafeInteger(n)&&n>=0)){
   const battle=row.battleModel?JSON.parse(row.battleModel):null;
   const npcPilots=sharedRosterSummary(battle,now)[vesselId];
   const availablePilots=npcPilots.available,{storedStock,availableShips}=sharedCarrierReserve(battle,vesselId,now);
   const formation=carrierStatsFormations[vesselId],carrierShipsByHull=sharedCarrierShipsInside(battle,vesselId,now);
   return send({version:1,vesselId,supply:row.supply,playerPilotsAboard:row.owners,
    armada:carrierArmadaPower(formation,carrierShipsByHull,availablePilots),
    playersWithInsideShips:row.owners,npcPilotsAboard:availablePilots,carrierRift4sInside:availableShips,
    carrierShipsByHull,carrierFitsByHull,
    playerShipsByHull:{'rift-fighter':row.rift,'bastion-9':row.bastion,'stocky-light-fighter':row.stocky},
    npcPilots,availableShips,availablePilots,carrierFighterStock:storedStock,manpower:availableShips*availablePilots},200,
    {'cache-control':'public, max-age=15'});
  }
 }catch{/* Fail closed without exposing query details. */}
 return send({error:'CARRIER_STATS_UNAVAILABLE'},503);
}
export {handleCarrierStats};
