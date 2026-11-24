const PARKING_PATH='/api/fighter-parking/';
const PARKING_HULLS=new Set(['rift-fighter','stocky-light-fighter','bastion-9']);
const PARKING_VESSELS=new Set(['rift-carrier','bifrost']);
const PARKING_BAYS=new Set([1,2,4,6]);
const PARKING_SITE='https://rift-runner.boundlessghost16.chatgpt.site';
const PARKING_WORKER='https://rift-runner.gambizt3.workers.dev';
const parkingRead=`SELECT vessel_id AS vessel, bay, revision FROM rift_fighter_parking
 WHERE namespace_hash=?1 AND hull_id=?2`;
// The free-bay selection and revision check share the write statement. An
// old revision cannot overwrite a newer store or a first browser import.
const parkingWrite=`WITH bays(bay) AS (VALUES (1),(2),(4),(6))
 INSERT INTO rift_fighter_parking (namespace_hash,hull_id,vessel_id,bay,revision)
 SELECT ?1,?2,?3,bay,?4+1 FROM bays
 WHERE ((?4=0 AND NOT EXISTS (SELECT 1 FROM rift_fighter_parking WHERE namespace_hash=?1 AND hull_id=?2))
  OR EXISTS (SELECT 1 FROM rift_fighter_parking WHERE namespace_hash=?1 AND hull_id=?2 AND revision=?4 AND vessel_id<>?3))
 AND NOT EXISTS (SELECT 1 FROM rift_fighter_parking WHERE namespace_hash=?1 AND vessel_id=?3 AND rift_fighter_parking.bay=bays.bay)
 ORDER BY RANDOM() LIMIT 1
 ON CONFLICT(namespace_hash,hull_id) DO UPDATE SET vessel_id=excluded.vessel_id,bay=excluded.bay,revision=excluded.revision
 WHERE rift_fighter_parking.revision=?4
 RETURNING vessel_id AS vessel,bay,revision`;
const parkingSafeRevision=n=>Number.isSafeInteger(n)&&n>=0&&n<Number.MAX_SAFE_INTEGER;
function parkingValidRow(row){
 if(row==null)return null;
 if(!PARKING_VESSELS.has(row.vessel)||!PARKING_BAYS.has(row.bay)||!Number.isSafeInteger(row.revision)||row.revision<1)throw Error('Invalid parking row');
 return {vessel:row.vessel,bay:row.bay,revision:row.revision};
}
async function parkingReadBody(request){
 if(!request.headers.get('content-type')?.match(/^application\/json(?:\s*;|$)/i)||!request.body)return null;
 const reader=request.body.getReader(),decoder=new TextDecoder('utf-8',{fatal:true});
 let body='',length=0;
 try{
  while(true){
   const {done,value}=await reader.read();
   if(done)break;
   length+=value.byteLength;
   if(length>256){void reader.cancel().catch(()=>{});return null;}
   body+=decoder.decode(value,{stream:true});
  }
  const payload=JSON.parse(body+decoder.decode());
  return payload&&Object.keys(payload).length===2&&PARKING_VESSELS.has(payload.vessel)&&parkingSafeRevision(payload.expectedRevision)?payload:null;
 }catch{return null;}finally{reader.releaseLock();}
}
async function handleFighterParking(request,env){
 const {pathname,search}=new URL(request.url);
 if(!pathname.startsWith(PARKING_PATH))return null;
 const origin=request.headers.get('origin');
 const headers={'cache-control':'private, no-store','x-content-type-options':'nosniff','referrer-policy':'no-referrer',vary:'Origin'};
 if(origin===PARKING_SITE)headers['access-control-allow-origin']=PARKING_SITE;
 const reply=(value,status=200,extra={})=>new Response(value===null?null:JSON.stringify(value),{status,headers:{
  ...headers,'content-type':'application/json; charset=utf-8',...extra}});
 const fail=(status,error)=>reply({error},status);
 const unavailable=()=>reply({error:'PARKING_UNAVAILABLE'},503,{'retry-after':'5'});
 if(origin&&origin!==PARKING_SITE&&origin!==PARKING_WORKER)return fail(403,'ORIGIN_NOT_ALLOWED');
 const hull=pathname.slice(PARKING_PATH.length);
 if(search||!PARKING_HULLS.has(hull))return fail(404,'PARKING_NOT_FOUND');
 const method=request.method;
 if(method==='OPTIONS'){
  if(origin!==PARKING_SITE||!['GET','PUT'].includes(request.headers.get('access-control-request-method'))||
   (request.headers.get('access-control-request-headers')??'').split(',').map(v=>v.trim().toLowerCase()).some(v=>v&&v!=='authorization'&&v!=='content-type'))
   return fail(403,'PREFLIGHT_NOT_ALLOWED');
  return reply(null,204,{'access-control-allow-methods':'GET, PUT','access-control-allow-headers':'Authorization, Content-Type','access-control-max-age':'600'});
 }
 if(method!=='GET'&&method!=='PUT')return reply({error:'METHOD_NOT_ALLOWED'},405,{allow:'GET, PUT, OPTIONS'});
 const secret=/^Bearer ([0-9a-f]{64})$/.exec(request.headers.get('authorization')??'')?.[1];
 if(!secret)return fail(401,'PARKING_TOKEN_REQUIRED');
 const db=env?.GALAXY_DB;
 if(!db?.prepare)return unavailable();
 const wanted=method==='PUT'?await parkingReadBody(request):null;
 if(method==='PUT'&&!wanted)return fail(400,'INVALID_PARKING_REQUEST');
 try{
  const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode('rift-runner:fighter-parking:v1:'+secret));
  const namespace=Array.from(new Uint8Array(bytes),n=>n.toString(16).padStart(2,'0')).join('');
  const output=(parking,status=200)=>reply({version:1,hull,parking},status);
  if(wanted){
   const updated=parkingValidRow(await db.prepare(parkingWrite).bind(namespace,hull,wanted.vessel,wanted.expectedRevision).first());
   if(updated)return output(updated);
  }
  const current=parkingValidRow(await db.prepare(parkingRead).bind(namespace,hull).first());
  if(!wanted||(current?.revision===wanted.expectedRevision&&current.vessel===wanted.vessel))return output(current);
  if((current?.revision??0)!==wanted.expectedRevision)return output(current,409);
  return fail(409,'NO_OPEN_BAY');
 }catch{return unavailable();}
}
export {handleFighterParking,PARKING_PATH};
