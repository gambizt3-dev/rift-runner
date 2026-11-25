// First shared-exterior slice. No combat, economy or writes to the parked berth.
export const FLEET_SPACE_PATH='/api/fleet-space';
const rooms=Object.freeze({'rift-carrier':{name:'Pegasus',padXs:[650,810,970,1130],padY:1830}});
const hulls=new Set(['rift-fighter','bastion-9','stocky-light-fighter']);
const shapes={enter:['hull'],launch:['hull'],step:['hull','seq','turn','thrust'],disconnect:['hull']};
const read='SELECT model, revision FROM rift_fleet_space WHERE armada_id=?1';
const berth='SELECT vessel_id AS vessel FROM rift_fighter_parking WHERE namespace_hash=?1 AND hull_id=?2';
const add=`INSERT OR IGNORE INTO rift_fleet_space(armada_id,revision,model)
 SELECT ?1,1,?2 WHERE EXISTS(SELECT 1 FROM rift_fighter_parking WHERE namespace_hash=?3 AND hull_id=?4 AND vessel_id=?1)
 RETURNING revision`;
const write=`UPDATE rift_fleet_space SET model=?2,revision=revision+1 WHERE armada_id=?1 AND revision=?5
 AND EXISTS(SELECT 1 FROM rift_fighter_parking WHERE namespace_hash=?3 AND hull_id=?4 AND vessel_id=?1)
 RETURNING revision`;
const width=1800,height=2400,leaseMs=12000,padGraceMs=30000,staleMs=30*60*1000,maxSeats=16;
const clamp=(n,a,b)=>Math.min(b,Math.max(a,n));
const closedInput={turn:0,thrust:0};
function advance(player,now){
 if(player.phase!=='airborne')return;
 const maxTime=Math.min(now,player.inputAt+400);
 let remaining=Math.max(0,maxTime-player.movedAt);
 while(remaining>0){
  const dt=Math.min(remaining,50)/1000;remaining-=dt*1000;
  player.heading+=player.input.turn*2.6*dt;
  const a=player.heading,pace=player.input.thrust*145;
  player.x=clamp(player.x+Math.cos(a)*pace*dt,24,width-24);
  player.y=clamp(player.y+Math.sin(a)*pace*dt,24,height-24);
 }
 player.movedAt=now;
}
function active(p,now){return p.connected&&now-p.seen<leaseMs;}
function expose(p,now){
 return {id:p.id,hull:p.hull,x:p.x,y:p.y,heading:p.heading,phase:p.phase,pad:p.pad,connected:active(p,now)};
}
async function body(request){
 const reader=request.body?.getReader();if(!reader)return null;
 const decoder=new TextDecoder('utf-8',{fatal:true});let raw='',size=0;
 try{
  for(;;){
   const {done,value}=await reader.read();if(done)break;
   size+=value.byteLength;if(size>600){await reader.cancel();return null;}
   raw+=decoder.decode(value,{stream:true});
  }
  return JSON.parse(raw+decoder.decode());
 }catch{return null;}finally{reader.releaseLock();}
}
function valid(action,d){
 if(!d||Array.isArray(d)||typeof d!=='object'||!hulls.has(d.hull))return false;
 const shape=shapes[action];if(Object.keys(d).length!==shape.length||shape.some(k=>!Object.hasOwn(d,k)))return false;
 return action!=='step'||Number.isSafeInteger(d.seq)&&d.seq>0&&Number.isFinite(d.turn)&&Math.abs(d.turn)<=1&&
  Number.isFinite(d.thrust)&&d.thrust>=0&&d.thrust<=1;
}
export async function handleFleetSpace(request,env,clock=Date.now){
 const url=new URL(request.url);
 if(!url.pathname.startsWith(FLEET_SPACE_PATH+'/'))return null;
 const response=(data,status=200)=>Response.json(data,{status,headers:{'cache-control':'no-store','x-content-type-options':'nosniff'}});
 const error=(key,status)=>response({error:key},status);
 const [,armada,action]=new RegExp('^'+FLEET_SPACE_PATH+'/([a-z-]+)/([a-z]+)$').exec(url.pathname)??[];
 if(!armada||!Object.hasOwn(rooms,armada)||!Object.hasOwn(shapes,action)||url.search)return error('UNKNOWN_FLEET_ACTION',404);
 if(request.method!=='POST')return error('METHOD_NOT_ALLOWED',405);
 // The prototype is same-origin only; its beta UI must be served by the Worker.
 const origin=request.headers.get('origin');
 if(origin&&origin!==url.origin)return error('ORIGIN_NOT_ALLOWED',403);
 const token=/^Bearer ([0-9a-f]{64})$/.exec(request.headers.get('authorization')??'')?.[1];
 if(!token)return error('BERTH_ACCESS_REQUIRED',401);
 if(!request.headers.get('content-type')?.toLowerCase().startsWith('application/json'))return error('INVALID_FLEET_REQUEST',400);
 const data=await body(request);
 if(!valid(action,data))return error('INVALID_FLEET_REQUEST',400);
 const db=env?.GALAXY_DB;if(!db?.prepare)return error('FLEET_UNAVAILABLE',503);
 const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode('rift-runner:fighter-parking:v1:'+token));
 const pilot=Array.from(new Uint8Array(bytes),b=>b.toString(16).padStart(2,'0')).join('');
 const room=rooms[armada];
 try{
  const verified=await db.prepare(berth).bind(pilot,data.hull).first();
  if(verified?.vessel!==armada)return error('PARKING_NOT_CONFIRMED',409);
  for(let attempt=0;attempt<6;attempt++){
   const now=clock(),row=await db.prepare(read).bind(armada).first();
   const model=row?JSON.parse(row.model):{lastUpdated:0,players:[]};
   const at=Math.max(now,model.lastUpdated);
   const all=model.players.filter(p=>at-p.seen<=staleMs);
   model.players=all;
   let player=all.find(p=>p.pilot===pilot);
   if(player&&player.hull!==data.hull)return error('SELECTED_SHIP_CHANGED',409);
   if(action!=='enter'&&(!player||!active(player,at)))return error('ENTER_FLEET_FIRST',409);
   for(const p of all){
    advance(p,at);
    if(p.phase==='pad'&&at-p.seen>=padGraceMs){p.phase='standby';p.pad=null;}
   }
   if(action==='enter'){
    if(!player&&all.length>=maxSeats)return error('FLEET_IS_FULL',409);
    if(!player){
     player={pilot,id:crypto.randomUUID(),hull:data.hull,phase:'standby',pad:null,x:900,y:1900,heading:-Math.PI/2,seq:0,input:closedInput,inputAt:at,movedAt:at,connected:false,seen:at};
     all.push(player);
    }
    if(player.phase==='standby'){
     // Pad 3 is not offered for outbound launches; it remains open for recovery.
     const pad=room.padXs.findIndex((_,i)=>i!==room.padXs.length-1&&!all.some(p=>p.pad===i));
     if(pad===-1)return error('LAUNCH_PADS_BUSY',409);
     Object.assign(player,{phase:'pad',pad,x:room.padXs[pad],y:room.padY,heading:-Math.PI/2});
    }
    if(!active(player,at)){player.input=closedInput;player.inputAt=at;player.movedAt=at;}
    player.connected=true;
   }else if(action==='launch'){
    if(player.phase==='pad')Object.assign(player,{phase:'airborne',pad:null,input:closedInput,inputAt:at,movedAt:at});
   }else if(action==='step'&&data.seq>player.seq&&data.seq<=player.seq+100){
    // Clients cannot set coordinates or reuse an old input sequence.
    player.seq=data.seq;player.input={turn:data.turn,thrust:data.thrust};player.inputAt=at;
   }else if(action==='disconnect'){
    player.connected=false;player.input=closedInput;player.inputAt=at;player.movedAt=at;
   }
   player.seen=at;model.lastUpdated=at;
   const args=[armada,JSON.stringify(model),pilot,data.hull];
   const saved=await (row?db.prepare(write).bind(...args,row.revision):db.prepare(add).bind(...args)).first();
   if(saved)return response({version:1,self:player.id,lastSeq:player.seq,state:{armada,name:room.name,revision:saved.revision,width,height,
    ships:all.filter(p=>p===player||active(p,at)).map(p=>expose(p,at))}});
  }
  return error('FLEET_BUSY',503);
 }catch{return error('FLEET_UNAVAILABLE',503);}
}
