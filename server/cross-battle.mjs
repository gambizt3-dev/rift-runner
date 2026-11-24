import {blackwakeWindow,galaxyPlan} from './galaxy-carrier.mjs';
const CROSS_BATTLE_PATH='/api/encounters/blackwake';
const crossBattleSite='https://rift-runner.boundlessghost16.chatgpt.site',crossBattleWorker='https://rift-runner.gambizt3.workers.dev';
const crossBattleHulls=new Set(['rift-fighter','stocky-light-fighter','bastion-9']);
const crossBattleVessels=new Set(['rift-carrier','bifrost']);
const crossBattleAnchor='SELECT model_version,seed,epoch_ms FROM rift_galaxy_carrier WHERE carrier_id=?1';
async function readBlackwakeEncounter(db,now){
 const row=await db.prepare(crossBattleAnchor).bind('bifrost').first();
 if(row?.model_version!==1||!Number.isSafeInteger(row.seed)||row.seed<1||row.seed>4294967295||
  !Number.isSafeInteger(row.epoch_ms)||row.epoch_ms<=0)throw new Error('Bifrost anchor unavailable');
 const event=blackwakeWindow(galaxyPlan(row.seed,'bifrost'),row.epoch_ms);
 if(!event||now<event.startsAt||now>=event.endsAt)return null;
 const {startsAt,endsAt,sector,x,y,heading,px,py}=event;
 return {id:'blackwake',status:'active',sector,x:(x+px)/2,y:(y+py)/2,startsAt,endsAt,
  pirate:{id:'blackwake',name:'Blackwake',x:px,y:py,heading:(heading+180)%360},
  attacker:{id:'bifrost',name:'Bifrost',x,y,heading},simulation:'local'};
}
// The private parked hull, not the submitted vessel alone, authorizes the
// registration. Repeated identical joins converge on one row.
const crossBattleWrite=`INSERT INTO rift_cross_battle_participation (encounter_id,namespace_hash,hull_id,vessel_id,role)
 SELECT 'blackwake',namespace_hash,hull_id,vessel_id,?4 FROM rift_fighter_parking
 WHERE namespace_hash=?1 AND hull_id=?2 AND vessel_id=?3
 ON CONFLICT(encounter_id,namespace_hash,hull_id) DO UPDATE SET vessel_id=excluded.vessel_id,role=excluded.role
 RETURNING hull_id AS hull,vessel_id AS vessel,role`;
async function crossBattleBody(request){
 if(!/^application\/json(?:\s*;|$)/i.test(request.headers.get('content-type')??'')||!request.body)return null;
 const reader=request.body.getReader(),decoder=new TextDecoder('utf-8',{fatal:true});
 let text='',length=0;
 try{
  while(true){
   const {value,done}=await reader.read();if(done)break;
   if((length+=value.byteLength)>256){void reader.cancel().catch(()=>{});return null;}
   text+=decoder.decode(value,{stream:true});
  }
  const data=JSON.parse(text+decoder.decode());
  return data&&Object.keys(data).length===3&&crossBattleHulls.has(data.hull)&&crossBattleVessels.has(data.vessel)&&
   (data.role==='intercept'||data.role==='reinforce'&&data.vessel==='rift-carrier')?data:null;
 }catch{return null;}finally{reader.releaseLock();}
}
async function handleCrossBattle(request,env,clock=Date.now){
 const url=new URL(request.url);if(url.pathname!==CROSS_BATTLE_PATH)return null;
 const origin=request.headers.get('origin');
 const headers={'cache-control':'no-store','x-content-type-options':'nosniff','referrer-policy':'no-referrer',vary:'Origin'};
 if(origin===crossBattleSite)headers['access-control-allow-origin']=crossBattleSite;
 const reply=(value,status=200,extras={})=>new Response(value===null?null:JSON.stringify(value),{
  status,headers:{...headers,'content-type':'application/json; charset=utf-8',...extras}});
 const fail=(error,status)=>reply({error},status);
 const result=(encounter,participation)=>reply({version:1,encounter,participation});
 if(origin&&origin!==crossBattleSite&&origin!==crossBattleWorker)return fail('ORIGIN_NOT_ALLOWED',403);
 if(url.search)return fail('INVALID_ENCOUNTER_REQUEST',400);
 if(request.method==='OPTIONS'){
  if(origin!==crossBattleSite||request.headers.get('access-control-request-method')!=='POST'||
   (request.headers.get('access-control-request-headers')??'').split(',').map(v=>v.trim().toLowerCase()).some(v=>v&&v!=='authorization'&&v!=='content-type'))
   return fail('PREFLIGHT_NOT_ALLOWED',403);
  return reply(null,204,{'access-control-allow-methods':'GET, POST','access-control-allow-headers':'Authorization, Content-Type','access-control-max-age':'600'});
 }
 if(request.method==='GET'){
  try{
   const encounter=await readBlackwakeEncounter(env.GALAXY_DB,clock());
   return encounter?result(encounter,null):fail('ENCOUNTER_INACTIVE',404);
  }catch{return fail('ENCOUNTER_UNAVAILABLE',503);}
 }
 if(request.method!=='POST')return reply({error:'METHOD_NOT_ALLOWED'},405,{allow:'GET, POST, OPTIONS'});
 const secret=/^Bearer ([0-9a-f]{64})$/.exec(request.headers.get('authorization')??'')?.[1];
 if(!secret)return fail('PARKING_TOKEN_REQUIRED',401);
 if(!env?.GALAXY_DB?.prepare)return fail('ENCOUNTER_UNAVAILABLE',503);
 const data=await crossBattleBody(request);if(!data)return fail('INVALID_ENCOUNTER_REQUEST',400);
 try{
  const encounter=await readBlackwakeEncounter(env.GALAXY_DB,clock());
  if(!encounter)return fail('ENCOUNTER_INACTIVE',404);
  const hash=await crypto.subtle.digest('SHA-256',new TextEncoder().encode('rift-runner:fighter-parking:v1:'+secret));
  const namespace=Array.from(new Uint8Array(hash),byte=>byte.toString(16).padStart(2,'0')).join('');
  const joined=await env.GALAXY_DB.prepare(crossBattleWrite).bind(namespace,data.hull,data.vessel,data.role).first();
  if(!joined)return fail('PARKING_NOT_CONFIRMED',409);
  if(joined.hull!==data.hull||joined.vessel!==data.vessel||joined.role!==data.role)return fail('ENCOUNTER_UNAVAILABLE',503);
  return result(encounter,{hull:joined.hull,vessel:joined.vessel,role:joined.role});
 }catch{return fail('ENCOUNTER_UNAVAILABLE',503);}
}
export {handleCrossBattle,CROSS_BATTLE_PATH};
