// D1-backed polling simulation. All movement, shots and damage are server-owned.
const SHARED_FLIGHT_PATH='/api/multiplayer/battles/blackwake';
const sharedSite='https://rift-runner.boundlessghost16.chatgpt.site',sharedWorker='https://rift-runner.gambizt3.workers.dev';
const sharedTickMs=100,sharedDurationMs=600000,sharedWidth=1800,sharedHeight=2400,sharedSlotsPerSide=4,sharedIdleMs=30000,sharedDebriefMs=12000,sharedPilotRecoveryMs=86400000,sharedAutoPeriodMs=1800000,sharedAutoLifetimeMs=360000;
const sharedQuietMs=120000;
const sharedHulls=new Set(['rift-fighter','stocky-light-fighter','bastion-9']);
const sharedVessels=new Set(['rift-carrier','bifrost']);
const sharedRiftReserveVolleyDamage=2;
const sharedHealth={'rift-fighter':24,'stocky-light-fighter':20,'bastion-9':32};
const sharedHome={sector:'reach',x:365,y:1160};
const sharedBerth='SELECT vessel_id AS vessel FROM rift_fighter_parking WHERE namespace_hash=?1 AND hull_id=?2';
const sharedRead="SELECT revision,model FROM rift_shared_flight WHERE battle_id='blackwake'";
const sharedInsert=`INSERT OR IGNORE INTO rift_shared_flight(battle_id,revision,model)
 SELECT 'blackwake',1,?1 WHERE EXISTS (
  SELECT 1 FROM rift_fighter_parking WHERE namespace_hash=?2 AND hull_id=?3 AND vessel_id=?4
 ) RETURNING revision`;
const sharedUpdate=`UPDATE rift_shared_flight SET revision=revision+1,model=?1
 WHERE battle_id='blackwake' AND revision=?5 AND EXISTS (
  SELECT 1 FROM rift_fighter_parking WHERE namespace_hash=?2 AND hull_id=?3 AND vessel_id=?4
 ) RETURNING revision`;
const sharedBound=(x,low,high)=>Math.min(high,Math.max(low,x));
const sharedAngle=x=>Math.atan2(Math.sin(x),Math.cos(x));
const sharedShip=(id,team,vessel,hull,x,y,heading,maxHp)=>({id,team,vessel,hull,x,y,heading,hp:maxHp,maxHp,ready:0});
const sharedModes={solo:0,wingmen:1,fleet:2},sharedInitialCarrierStock=20;
const sharedRosterCapacity=50;
function sharedRosterExpand(existing=[]){
 const keys=new Set(existing.map(n=>n.vessel+':'+n.slot));
 return [...existing,...[...sharedVessels].flatMap(vessel=>
  Array.from({length:sharedRosterCapacity},(_,i)=>i+1)
   .filter(slot=>!keys.has(vessel+':'+slot))
   .map(slot=>({vessel,slot,generation:1,readyAt:0,lease:null})))];
}
function sharedRosterSummary(model,now){
 const entries=sharedRosterExpand(model?.roster);
 return Object.fromEntries([...sharedVessels].map(vessel=>{
  const students=entries.filter(p=>p.vessel===vessel),replenishing=students.filter(p=>p.readyAt>now).length,
   deployed=model?.status==='running'&&now<model.end?students.filter(p=>p.lease===model.instance).length:0;
  return [vessel,{available:students.length-deployed-replenishing,deployed,replenishing,capacity:students.length}];
 }));
}
function sharedCarrierReserve(model,vessel,now){
 const storedStock=model?.carrierStock?.[vessel]??sharedInitialCarrierStock;
 const deployed=sharedRosterSummary(model,now)[vessel].deployed;
 return {storedStock,availableShips:Math.max(0,storedStock-deployed)};
}
// Additional carrier-owned reserves are not used by the current Rift-4 sorties.
const sharedCivilianFreighter='civilian-freighter';
const sharedInitialCivilianReserve=vessel=>vessel==='rift-carrier'?5:0;
function sharedSpecialStockSeed(){
 return Object.fromEntries([...sharedVessels].map(vessel=>[vessel,{'bastion-9':4,'stocky-light-fighter':4,[sharedCivilianFreighter]:sharedInitialCivilianReserve(vessel)}]));
}
function sharedCarrierShipsInside(model,vessel,now){
 const extras=model?.carrierSpecialStock?.[vessel]??sharedSpecialStockSeed()[vessel];
 return {'rift-fighter':sharedCarrierReserve(model,vessel,now).availableShips,
  'bastion-9':extras['bastion-9'],'stocky-light-fighter':extras['stocky-light-fighter'],
  [sharedCivilianFreighter]:extras[sharedCivilianFreighter]??sharedInitialCivilianReserve(vessel)};
}
function sharedNew(now,previous,autonomous=false){
 const roster=sharedRosterExpand(previous?.roster);
 for(const pilot of roster)pilot.lease=null;
 return {id:'blackwake',instance:crypto.randomUUID(),status:'running',tick:0,startsAt:now,lastActionAt:now,at:now,end:now+(autonomous?sharedAutoLifetimeMs:sharedDurationMs),
  players:[],wingmates:[],roster,portOrders:previous?.portOrders??{},portRestockedAt:previous?.portRestockedAt??{},carrierSpecialStock:previous?.carrierSpecialStock??sharedSpecialStockSeed(),carrierStock:previous?.carrierStock??Object.fromEntries([...sharedVessels].map(id=>[id,sharedInitialCarrierStock])),autonomous,autoWindow:previous?.autoWindow??-1,shots:[],shotId:0,pirates:[
   sharedShip('pirate-core','pirate','blackwake','pirate-multicrew',900,1000,Math.PI/2,75),
   sharedShip('pirate-1','pirate','blackwake','pirate-multicrew',690,1120,Math.PI/2,45),
   sharedShip('pirate-2','pirate','blackwake','pirate-multicrew',1110,1120,Math.PI/2,45)]};
}
function sharedAssign(model,now,vessel,count,owner){
 const available=sharedCarrierReserve(model,vessel,now).availableShips;
 const eligible=model.roster.filter(n=>n.vessel===vessel&&!n.lease&&n.readyAt<=now).slice(0,Math.min(count,available));
 for(const [i,npc] of eligible.entries()){
  npc.lease=model.instance;
  const host=model.players.find(p=>p.ship.id===owner)?.ship,fleet=vessel==='rift-carrier'?670:1130;
  model.wingmates.push({...sharedShip('navy-'+vessel+'-'+npc.slot+'-'+npc.generation,'ally',vessel,'rift-fighter',
   (host?.x??fleet)+(-1+i*2)*80,host?host.y-65:1460,-Math.PI/2,18),
   name:'Navy Pilot '+npc.slot+'.'+npc.generation,rosterId:npc.slot,owner});
 }
 return eligible.length;
}
function sharedSyncRoster(model,now){
 let changed=false;
 for(const pilot of model.roster){
  if(pilot.lease!==model.instance)continue;
  const wing=model.wingmates.find(s=>s.vessel===pilot.vessel&&s.id==='navy-'+pilot.vessel+'-'+pilot.slot+'-'+pilot.generation);
  if(wing?.hp<=0){
   // The carrier loses the hull; the same NPC pilot returns after recovery.
   pilot.lease=null;pilot.readyAt=now+sharedPilotRecoveryMs;
   model.carrierStock[pilot.vessel]=Math.max(0,model.carrierStock[pilot.vessel]-1);changed=true;
  }else if(!wing||model.status!=='running'||now>=model.end||
    wing.owner&&!model.players.some(p=>p.ship.id===wing.owner)){
   pilot.lease=null;changed=true;
   if(wing&&model.status==='running')model.wingmates=model.wingmates.filter(s=>s!==wing);
  }
 }
 return changed;
}
function sharedInitRoster(model){
 let lackedStock=!model.carrierStock||!model.carrierSpecialStock;
 model.carrierSpecialStock??=sharedSpecialStockSeed();
 for(const [vessel,seed] of Object.entries(sharedSpecialStockSeed())){
  if(!Object.hasOwn(model.carrierSpecialStock,vessel)){model.carrierSpecialStock[vessel]=seed;lackedStock=true;}
  else if(!Object.hasOwn(model.carrierSpecialStock[vessel],sharedCivilianFreighter)){
   model.carrierSpecialStock[vessel][sharedCivilianFreighter]=seed[sharedCivilianFreighter];lackedStock=true;
  }
 }
 model.carrierStock??=Object.fromEntries([...sharedVessels].map(id=>[id,sharedInitialCarrierStock]));
 const original=model.roster,expanded=sharedRosterExpand(original);
 if(!original){
  // Discard only pre-feature untracked NPCs, not players or their battle.
  model.wingmates=[];
 }
 if(!original||original.length!==expanded.length)model.roster=expanded;
 return lackedStock||!original||original.length!==expanded.length;
}
function sharedPlayerShip(id,vessel,hull,side,slot){
 const left=vessel==='rift-carrier',opposition=side==='opposition';
 return sharedShip(id,opposition?'pirate':'ally',vessel,hull,opposition?745+slot*100:left?430:1380,
  opposition?730:1900+slot*44,opposition?Math.PI/2:-Math.PI/2,sharedHealth[hull]);
}
function sharedMove(ship,turn,thrust,strafe){
 ship.heading=sharedAngle(ship.heading+turn*.14*(ship.handling??1));
 const c=Math.cos(ship.heading),s=Math.sin(ship.heading),pace=ship.pace??1;
 ship.x=sharedBound(ship.x+(thrust*c*17-strafe*s*11)*pace,25,sharedWidth-25);
 ship.y=sharedBound(ship.y+(thrust*s*17+strafe*c*11)*pace,25,sharedHeight-25);
}
function sharedFire(model,ship){
 if(model.tick<ship.ready||model.shots.length>=120)return;
 const ai=ship.id.startsWith('pirate-')||ship.id.startsWith('navy-');
 ship.ready=model.tick+(ai?10:4);
 const c=Math.cos(ship.heading),s=Math.sin(ship.heading);
 model.lastActionAt=model.at;
 model.shots.push({id:++model.shotId,owner:ship.id,team:ship.team,x:ship.x+c*25,y:ship.y+s*25,heading:ship.heading,life:24,damage:ship.id.startsWith('navy-')?sharedRiftReserveVolleyDamage:ai?2:3});
}
function sharedCollision(x,y,dx,dy,ship){
 const r=ship.hull==='pirate-multicrew'?46:22,px=x-ship.x,py=y-ship.y,c=px*px+py*py-r*r;
 if(c<=0)return 0;
 const a=dx*dx+dy*dy,b=px*dx+py*dy,disc=b*b-a*c;
 if(b>=0||disc<0||a<=0)return null;
 const t=(-b-Math.sqrt(disc))/a;return t<=1?t:null;
}
function sharedStart(model){
 return model.startsAt??(model.autonomous&&model.autoWindow>=0?model.autoWindow*sharedAutoPeriodMs:model.end-(model.autonomous?sharedAutoLifetimeMs:sharedDurationMs));
}
function sharedBifrostPresent(model,now){
 return model.wingmates?.some(s=>s.vessel==='bifrost'&&s.hp>0)||
  model.players.some(p=>p.ship.vessel==='bifrost'&&p.side==='allies'&&p.ship.hp>0&&now-p.touchedAt<sharedIdleMs);
}
function sharedClosure(model,now){
 if(!model||model.status!=='running')return null;
 if(!sharedBifrostPresent(model,now)&&model.bifrostAwayAt!=null&&now-model.bifrostAwayAt>=sharedQuietMs)return 'bifrost-left';
 // Offline NPC rounds get their first scheduled simulation before we measure inactivity.
 if(model.autonomous&&model.tick===0&&model.wingmates?.some(s=>s.hp>0))return null;
 if(now-(model.lastActionAt??sharedStart(model))>=sharedQuietMs)return 'inactive';
 return null;
}
function sharedPresence(model,now){
 if(model.status!=='running')return false;
 if(sharedBifrostPresent(model,now)){
  if(model.bifrostSeen&&model.bifrostAwayAt==null)return false;
  model.bifrostSeen=true;model.bifrostAwayAt=null;return true;
 }
 if(model.bifrostSeen&&model.bifrostAwayAt==null){model.bifrostAwayAt=now;return true;}
 return false;
}
function sharedCanReset(model,now){return !model||now>=model.end||model.status==='complete'&&now>=model.completedAt+sharedDebriefMs;}
function sharedFinishQuiet(model,now){
 const reason=sharedClosure(model,now);
 if(!reason)return false;
 model.status='complete';model.completedAt=now;model.closeReason=reason;model.shots=[];
 return true;
}
function sharedAdvance(model,now,scheduled=false){
 if(model.status==='complete')return;
 if(now>=model.end){model.status='complete';model.completedAt=model.end;return;}
 // No human-input catch-up beyond one second. NPC-only rounds can simulate a
 // bounded eighteen seconds per scheduled wake, even with no browser present.
 model.at=Math.max(model.at,now-(scheduled&&!model.players.length?18000:1000));
 const allies=[...model.wingmates,...model.players.filter(p=>p.ship.team==='ally').map(p=>p.ship)];
 const enemies=[...model.pirates,...model.players.filter(p=>p.ship.team==='pirate').map(p=>p.ship)];
 while(model.at+sharedTickMs<=now&&model.status==='running'){
  model.at+=sharedTickMs;model.tick++;
  for(const p of model.players){
   if(p.ship.hp<=0||!p.input||model.at-p.inputAt>=600)continue;
   const i=p.input;
   const x=p.ship.x,y=p.ship.y;
   sharedMove(p.ship,i.turn,i.thrust,i.strafe);
   if(p.ship.x!==x||p.ship.y!==y)model.lastActionAt=model.at;
   if(i.fire)sharedFire(model,p.ship);
  }
  const active=team=>model.players.filter(p=>p.ship.team===team&&p.ship.hp>0&&model.at-p.touchedAt<5000).map(p=>p.ship);
  const track=(ai,targetSet)=>{
   const targets=targetSet.filter(s=>s.hp>0);
   if(ai.hp<=0||!targets.length)return;
   const range=s=>Math.hypot(ai.x-s.x,ai.y-s.y);
   const target=targets.reduce((a,b)=>range(a)<range(b)?a:b);
   const dx=target.x-ai.x,dy=target.y-ai.y,distance=Math.hypot(dx,dy);
   const heading=sharedAngle(Math.atan2(dy,dx)-ai.heading);
   sharedMove(ai,sharedBound(heading*2,-.5,.5),distance>250?(ai.team==='ally'?.65:.34):0,0);
   if(distance<900&&Math.abs(heading)<.2)sharedFire(model,ai);
  };
  const allyTargets=[...active('ally'),...model.wingmates],pirateTargets=[...active('pirate'),...model.pirates];
  for(const pirate of model.pirates)track(pirate,allyTargets);
  for(const wingmate of model.wingmates)track(wingmate,pirateTargets);
  model.shots=model.shots.filter(shot=>{
   const dx=Math.cos(shot.heading)*40,dy=Math.sin(shot.heading)*40;
   const friends=shot.team==='ally'?allies:enemies,opponents=shot.team==='ally'?enemies:allies;
   let hit=null,time=Infinity;
   for(const group of shot.owner?[opponents,friends]:[opponents])for(const ship of group){
    if(ship.hp<=0||ship.id===shot.owner)continue;
    const contact=sharedCollision(shot.x,shot.y,dx,dy,ship);
    if(contact!==null&&contact<time){hit=ship;time=contact;}
   }
   if(hit){
    if(hit.team!==shot.team)hit.hp=Math.max(0,hit.hp-shot.damage);
    else{
     model.friendlyImpactSeq=(model.friendlyImpactSeq??0)+1;
     (model.friendlyImpacts??=[]).push({id:model.friendlyImpactSeq,tick:model.tick,x:shot.x+dx*time,y:shot.y+dy*time,heading:shot.heading});
     if(model.friendlyImpacts.length>32)model.friendlyImpacts.shift();
    }
    model.lastActionAt=model.at;return false;
   }
   shot.x+=dx;shot.y+=dy;
   return --shot.life>0&&shot.x>=0&&shot.x<=sharedWidth&&shot.y>=0&&shot.y<=sharedHeight;
  });
  const alliesAlive=allies.some(s=>s.hp>0),piratesAlive=enemies.some(s=>s.hp>0);
  if(!piratesAlive||allies.length&&!alliesAlive){
   model.winner=alliesAlive?'allies':piratesAlive?'opposition':null;
   model.status='complete';model.completedAt=model.at;model.closeReason='eliminated';model.shots=[];
  }
  if(model.id==='blackwake')sharedPresence(model,model.at);
 }
}
function sharedSnapshot(model,player){
 const ship=({id,team,vessel,hull,x,y,heading,hp,maxHp,name},npc)=>({id,team,vessel,hull,x,y,heading,hp,maxHp,npc,...(name?{name}:{})});
 const shot=({id,team,x,y,heading})=>({id,team,x,y,heading});
 return {version:1,self:player.ship.id,lastSeq:player.seq,wingmatesAssigned:player.wingmatesAssigned??0,state:{id:model.id,instance:model.instance,
  status:model.status,...(model.waiting?{waiting:true}:{}),closeReason:model.closeReason??null,winner:model.winner??null,tick:model.tick,width:sharedWidth,height:sharedHeight,
  ships:[...model.players.map(p=>ship(p.ship,false)),...[...(model.wingmates??[]),...model.pirates].map(s=>ship(s,true))],shots:model.shots.map(shot),friendlyImpacts:(model.friendlyImpacts??[]).filter(event=>model.tick-event.tick<=10)}};
}
async function sharedBody(req){
 if(!/^application\/json(?:\s*;|$)/i.test(req.headers.get('content-type')??'')||!req.body)return null;
 const reader=req.body.getReader();let n=0,value='';const decoder=new TextDecoder('utf-8',{fatal:true});
 try{
  while(true){const r=await reader.read();if(r.done)break;
   if((n+=r.value.byteLength)>512){void reader.cancel().catch(()=>{});return null;}
   value+=decoder.decode(r.value,{stream:true});
  }
  return JSON.parse(value+decoder.decode());
 }catch{return null;}finally{reader.releaseLock();}
}
function sharedValid(d,joining){
 if(!d||!sharedVessels.has(d.vessel)||!sharedHulls.has(d.hull))return false;
 if(joining)return (d.mode===undefined?Object.keys(d).length===3:Object.keys(d).length===4&&typeof d.mode==='string'&&Object.hasOwn(sharedModes,d.mode))&&(d.side==='allies'||d.side==='opposition');
 return Object.keys(d).length===8&&/^[\da-f-]{36}$/.test(d.instance??'')&&Number.isSafeInteger(d.seq)&&d.seq>0&&
  [d.turn,d.thrust,d.strafe].every(x=>Number.isFinite(x)&&Math.abs(x)<=1)&&typeof d.fire==='boolean';
}
async function handleSharedFlight(request,env,clock=Date.now){
 const url=new URL(request.url);
 if(url.pathname.startsWith(corsairTestPath+'/'))return handleCorsairTestFlight(request,env,clock);
 const root=url.pathname===SHARED_FLIGHT_PATH,joining=url.pathname===SHARED_FLIGHT_PATH+'/join',stepping=url.pathname===SHARED_FLIGHT_PATH+'/step',leaving=url.pathname===SHARED_FLIGHT_PATH+'/leave';
 if(!root&&!joining&&!stepping&&!leaving)return null;
 const origin=request.headers.get('origin');
 const headers={'cache-control':'no-store','x-content-type-options':'nosniff','referrer-policy':'no-referrer',vary:'Origin'};
 if(origin===sharedSite)headers['access-control-allow-origin']=sharedSite;
 const send=(d,status=200)=>new Response(d===null?null:JSON.stringify(d),{status,headers:{...headers,'content-type':'application/json; charset=utf-8'}});
 const fail=(error,status)=>send({error},status);
 if(origin&&origin!==sharedSite&&origin!==sharedWorker)return fail('ORIGIN_NOT_ALLOWED',403);
 if(url.search)return fail('INVALID_BATTLE_REQUEST',400);
 if(request.method==='OPTIONS'){
  if(origin!==sharedSite||root||request.headers.get('access-control-request-method')!=='POST'||
   (request.headers.get('access-control-request-headers')??'').split(',').map(v=>v.trim().toLowerCase()).some(v=>v&&v!=='authorization'&&v!=='content-type'))
   return fail('PREFLIGHT_NOT_ALLOWED',403);
  headers['access-control-allow-methods']='POST';
  headers['access-control-allow-headers']='Authorization, Content-Type';
  headers['access-control-max-age']='600';
  return send(null,204);
 }
 if(request.method!==(root?'GET':'POST'))return fail('METHOD_NOT_ALLOWED',405);
 const db=env?.GALAXY_DB;
 if(!db?.prepare)return fail('BATTLE_UNAVAILABLE',503);
 try{
  if(root){
   const row=await db.prepare(sharedRead).first(),model=row?JSON.parse(row.model):null;
   const now=clock(),status=sharedCanReset(model,now)?'open':sharedClosure(model,now)?'complete':model.status;
   return send({version:1,battle:{id:'blackwake',mode:'shared',status,instance:status==='open'?null:model.instance,...sharedHome,
    autonomous:status==='running'&&model.autonomous===true,ageMs:status==='running'?Math.max(0,now-sharedStart(model)):null,bifrostCloseInMs:status==='running'&&model.bifrostAwayAt!=null&&!sharedBifrostPresent(model,now)?Math.max(0,sharedQuietMs-(now-model.bifrostAwayAt)):null,roster:sharedRosterSummary(model,now),
    joinable:status!=='complete',sides:['allies','opposition']}});
  }
  const secret=/^Bearer ([0-9a-f]{64})$/.exec(request.headers.get('authorization')??'')?.[1];
  if(!secret)return fail('PARKING_TOKEN_REQUIRED',401);
  const data=await sharedBody(request);
  if(leaving?!(data&&Object.keys(data).length===3&&sharedVessels.has(data.vessel)&&sharedHulls.has(data.hull)&&/^[\da-f-]{36}$/.test(data.instance??'')):!sharedValid(data,joining))return fail('INVALID_BATTLE_REQUEST',400);
  const hash=await crypto.subtle.digest('SHA-256',new TextEncoder().encode('rift-runner:fighter-parking:v1:'+secret));
  const namespace=Array.from(new Uint8Array(hash),byte=>byte.toString(16).padStart(2,'0')).join('');
  const berth=await db.prepare(sharedBerth).bind(namespace,data.hull).first();
  if(berth?.vessel!==data.vessel)return fail('PARKING_NOT_CONFIRMED',409);
  for(let i=0;i<6;i++){
   const row=await db.prepare(sharedRead).first();
   const now=clock();
   let model=row?JSON.parse(row.model):null;
   if(joining&&sharedCanReset(model,now))model=sharedNew(now,model);
   if(!model||(stepping||leaving)&&data.instance!==model.instance)return fail('BATTLE_INSTANCE_CHANGED',409);
   if(leaving){
    const pilot=model.players.find(p=>p.namespace===namespace);
    if(!pilot)return send(null,204);
    if(pilot.ship.hull!==data.hull||pilot.ship.vessel!==data.vessel)return fail('BATTLE_SLOT_CONFLICT',409);
    model.players=model.players.filter(p=>p!==pilot);
    sharedInitRoster(model);
    sharedSyncRoster(model,now);
    sharedPresence(model,now);
    if(await db.prepare(sharedUpdate).bind(JSON.stringify(model),namespace,data.hull,data.vessel,row.revision).first())return send(null,204);
    continue;
   }
   const initialized=sharedInitRoster(model);
   const beforeTick=model.tick,beforeStatus=model.status,beforeCount=model.players.length,beforeWings=model.wingmates?.length??0;
   if(model.status==='running'&&now<model.end)model.players=model.players.filter(p=>now-p.touchedAt<sharedIdleMs);
   const left=sharedSyncRoster(model,now);
   const presence=sharedPresence(model,now);
   if(!sharedFinishQuiet(model,now))sharedAdvance(model,now);
   const synced=sharedSyncRoster(model,now);
   let dirty=initialized||left||synced||presence||beforeTick!==model.tick||beforeStatus!==model.status||beforeCount!==model.players.length||beforeWings!==model.wingmates?.length;
   let p=model.players.find(p=>p.namespace===namespace);
   if(p&&(p.ship.hull!==data.hull||p.ship.vessel!==data.vessel))return fail('BATTLE_SLOT_CONFLICT',409);
   if(joining&&p&&p.side!==data.side)return fail('BATTLE_SIDE_LOCKED',409);
   if(joining&&!p){
    const slot=model.players.filter(other=>other.side===data.side).length;
    if(model.status!=='running'||slot>=sharedSlotsPerSide)return fail('BATTLE_NOT_JOINABLE',409);
    const ship=sharedPlayerShip(crypto.randomUUID(),data.vessel,data.hull,data.side,slot);
    model.players.push(p={namespace,ship,side:data.side,seq:0,touchedAt:now,inputAt:0,input:null});
    p.wingmatesAssigned=data.side==='allies'?sharedAssign(model,now,data.vessel,sharedModes[data.mode??'fleet'],ship.id):0;
    dirty=true;
   }
   if(!p)return fail('BATTLE_JOIN_REQUIRED',403);
   dirty=sharedPresence(model,now)||dirty;
   if(stepping&&data.seq>p.seq&&data.seq<=p.seq+100&&now-p.inputAt>=sharedTickMs&&model.status==='running'){
    const {turn,thrust,strafe,fire}=data;
    p.seq=data.seq;p.inputAt=now;p.touchedAt=now;p.input={turn,thrust,strafe,fire};dirty=true;
   }
   if(!dirty)return send(sharedSnapshot(model,p));
   const args=[JSON.stringify(model),namespace,data.hull,data.vessel];
   const stmt=row?db.prepare(sharedUpdate).bind(...args,row.revision):db.prepare(sharedInsert).bind(...args);
   if(await stmt.first())return send(sharedSnapshot(model,p));
  }
  return fail('BATTLE_BUSY',503);
 }catch{return fail('BATTLE_UNAVAILABLE',503);}
}
// The cron never starts a second round atop an active player room, never
// recreates a completed automatic window, and never consumes player seats.
function sharedPortRestock(model,services,now){
 let changed=false;
 if(!model)return false;
 for(const [vessel,visit] of Object.entries(services)){
  if(!sharedVessels.has(vessel)||!/^(?:meridian|lyren|serein|verdan|siroc)-resupply$/.test(visit?.stationId)||!Number.isSafeInteger(visit.arrivedAt)||
     !Number.isSafeInteger(visit.departAt)||visit.readyAt!==visit.arrivedAt+300000||now<visit.readyAt||now>=visit.departAt||
     (model.portRestockedAt?.[vessel]??0)>=visit.arrivedAt)continue;
  model.portRestockedAt??={};
  model.portRestockedAt[vessel]=visit.arrivedAt;
  for(const pilot of model.roster){
   if(pilot.vessel===vessel&&!pilot.lease&&pilot.readyAt>now)pilot.readyAt=0;
  }
  model.carrierStock[vessel]=Math.max(sharedInitialCarrierStock,model.carrierStock[vessel]);
  changed=true;
 }
 return changed;
}
async function tickSharedFlightRoster(env,now=Date.now(),services={}){
 const db=env?.GALAXY_DB;
 if(!db?.prepare||!Number.isSafeInteger(now))return false;
 const window=Math.floor(now/sharedAutoPeriodMs);
 try{
  for(let tries=0;tries<4;tries++){
   const row=await db.prepare(sharedRead).first();
   let model=row?JSON.parse(row.model):null,dirty=false;
   if(model){
    dirty=sharedInitRoster(model);
    const tick=model.tick,status=model.status,count=model.players.length;
    if(status==='running'&&now<model.end)model.players=model.players.filter(p=>now-p.touchedAt<sharedIdleMs);
    const left=sharedSyncRoster(model,now);
    // Cron drives only auto rounds or finalizes old rounds; manual combat stays request-driven.
    const presence=sharedPresence(model,now);
    const closed=sharedFinishQuiet(model,now);
    if(!closed&&(model.autonomous||now>=model.end))sharedAdvance(model,now,true);
    const synced=sharedSyncRoster(model,now);
    dirty=sharedPortRestock(model,services,now)||dirty||left||synced||presence||closed||tick!==model.tick||status!==model.status||count!==model.players.length;
   }
   if(sharedCanReset(model,now)&&now%sharedAutoPeriodMs<sharedAutoLifetimeMs&&model?.autoWindow!==window){
    const carrierOrder=window%2?['bifrost','rift-carrier']:['rift-carrier','bifrost'];
    const summary=sharedRosterSummary(model,now);
    const vessel=carrierOrder.find(id=>summary[id].available>0&&sharedCarrierReserve(model,id,now).availableShips>0);
    if(vessel){
     model=sharedNew(now,model,true);model.autoWindow=window;
     model.end=(window*sharedAutoPeriodMs)+sharedAutoLifetimeMs;
     sharedAssign(model,now,vessel,2,null);
     sharedPresence(model,now);
     dirty=true;
    }
   }
   if(!dirty)return false;
   const json=JSON.stringify(model);
   const stmt=row?db.prepare("UPDATE rift_shared_flight SET revision=revision+1,model=?1 WHERE battle_id='blackwake' AND revision=?2 RETURNING revision").bind(json,row.revision):
    db.prepare("INSERT OR IGNORE INTO rift_shared_flight(battle_id,revision,model) VALUES('blackwake',1,?1) RETURNING revision").bind(json);
   if(await stmt.first())return true;
  }
 }catch{/* Existing scheduled jobs must continue on storage trouble. */}
 return false;
}
const corsairTestPath='/api/multiplayer/battles/corsair-test';
const corsairTestRead='SELECT revision,model FROM rift_corsair_test WHERE vessel_id=?1';
const corsairTestBerthCheck='EXISTS (SELECT 1 FROM rift_fighter_parking WHERE vessel_id=?1 AND namespace_hash=?3 AND hull_id=?4)';
const corsairTestInsert='INSERT OR IGNORE INTO rift_corsair_test(vessel_id,revision,model) SELECT ?1,1,?2 WHERE '+corsairTestBerthCheck+' RETURNING revision';
const corsairTestUpdate='UPDATE rift_corsair_test SET revision=revision+1,model=?2 WHERE vessel_id=?1 AND revision=?5 AND '+corsairTestBerthCheck+' RETURNING revision';
const corsairTestOpenMs=180000, corsairTestRoundMs=360000;
// Match local hull durability and keep the roles distinct in co-op.
// The co-op test still standardizes weapon damage regardless of loadout.
const corsairTestFighters={
 'rift-fighter':{hp:20,pace:1,handling:1},
 'stocky-light-fighter':{hp:26,pace:.88,handling:.92},
 'bastion-9':{hp:16,pace:1.12,handling:1.08}
};
function corsairTestNew(now){
 return {id:'corsair-test',instance:crypto.randomUUID(),status:'running',waiting:true,at:now,end:now+corsairTestOpenMs,
  tick:0,players:[],shots:[],shotId:0,wingmates:[],pirates:[
   sharedShip('pirate-core','pirate','blackwake','pirate-multicrew',900,1040,Math.PI/2,75),
   sharedShip('pirate-1','pirate','blackwake','pirate-multicrew',705,1160,Math.PI/2,45),
   sharedShip('pirate-2','pirate','blackwake','pirate-multicrew',1095,1160,Math.PI/2,45)]};
}
const corsairTestDead=(model,now)=>!model||now>=model.end||model.waiting&&now-model.players[0].touchedAt>=sharedIdleMs||
 model.status==='complete'&&now>=model.completedAt+sharedDebriefMs||
 !model.waiting&&model.players.every(p=>now-p.touchedAt>=sharedIdleMs);
async function handleCorsairTestFlight(request,env,clock){
 const url=new URL(request.url),action=url.pathname.slice(corsairTestPath.length+1);
 const send=(data,status=200)=>Response.json(data,{status,headers:{'cache-control':'no-store','x-content-type-options':'nosniff','referrer-policy':'no-referrer'}});
 const fail=(error,status)=>send({error},status);
 if(url.search||!['status','join','step'].includes(action))return fail('INVALID_TEST_REQUEST',400);
 if(request.headers.get('origin')&&request.headers.get('origin')!==sharedWorker)return fail('ORIGIN_NOT_ALLOWED',403);
 if(request.method!=='POST')return fail('METHOD_NOT_ALLOWED',405);
 const secret=/^Bearer ([0-9a-f]{64})$/.exec(request.headers.get('authorization')??'')?.[1];
 if(!secret)return fail('PARKING_TOKEN_REQUIRED',401);
 const db=env?.GALAXY_DB;
 if(!db?.prepare)return fail('TEST_UNAVAILABLE',503);
 try{
  const data=await sharedBody(request);
  if(!data||!sharedVessels.has(data.vessel)||!sharedHulls.has(data.hull))return fail('INVALID_TEST_REQUEST',400);
  const validId=id=>typeof id==='string'&&/^[\da-f-]{36}$/.test(id);
  const keys=Object.keys(data).length;
  if(action==='status'&&keys!==2||action==='join'&&(keys!==3||data.instance!==null&&!validId(data.instance))||
   action==='step'&&(!validId(data.instance)||!sharedValid(data,false)))return fail('INVALID_TEST_REQUEST',400);
  const hash=await crypto.subtle.digest('SHA-256',new TextEncoder().encode('rift-runner:fighter-parking:v1:'+secret));
  const namespace=Array.from(new Uint8Array(hash),byte=>byte.toString(16).padStart(2,'0')).join('');
  const {vessel,hull}=data;
  for(let i=0;i<6;i++){
   const berth=await db.prepare(sharedBerth).bind(namespace,hull).first();
   if(berth?.vessel!==vessel)return fail('PARKING_NOT_CONFIRMED',409);
   const row=await db.prepare(corsairTestRead).bind(vessel).first(),now=clock();
   let model=row?JSON.parse(row.model):null;
   if(corsairTestDead(model,now)){
    if(action==='status')return send({status:'open',instance:null,players:0});
    if(action==='join'&&data.instance===null)model=corsairTestNew(now);
    else if(action==='step'&&model?.instance===data.instance){
     const p=model.players.find(x=>x.namespace===namespace&&x.ship.hull===hull);
     if(p){model.waiting=false;model.status='complete';return send(sharedSnapshot(model,p));}
     return fail('TEST_JOIN_REQUIRED',403);
    }else return fail('TEST_INSTANCE_CHANGED',409);
   }else if(action!=='status'&&data.instance!==model.instance)return fail('TEST_INSTANCE_CHANGED',409);
   let p=model.players.find(x=>x.namespace===namespace);
   if(action==='status')return send({status:model.status==='complete'?'complete':p?.ship.hull===hull?'seated':model.waiting?'waiting':'running',
    instance:model.instance,players:model.players.length});
   if(p&&p.ship.hull!==hull)return fail('TEST_SLOT_CONFLICT',409);
   if(action==='join'&&!p){
    if(!model.waiting||model.status!=='running'||model.players.length>=2)return fail('TEST_NOT_JOINABLE',409);
    const slot=model.players.length;
    const {hp,pace,handling}=corsairTestFighters[hull];
    const ship=Object.assign(sharedShip(crypto.randomUUID(),'ally',vessel,hull,850+slot*100,1680,-Math.PI/2,hp),{pace,handling});
    model.players.push(p={namespace,ship,seq:0,touchedAt:now,inputAt:0,input:null});
    if(model.players.length===2){
     model.waiting=false;model.at=now;model.end=now+corsairTestRoundMs;
     for(const person of model.players){person.touchedAt=now;person.input=null;}
    }
   }
   if(!p)return fail('TEST_JOIN_REQUIRED',403);
   if(!model.waiting)sharedAdvance(model,now);
   if(action==='join')p.touchedAt=now;
   if(action==='step'&&model.status==='running'&&data.seq>p.seq&&data.seq<=p.seq+100&&now-p.inputAt>=sharedTickMs){
    const {turn,thrust,strafe,fire}=data;
    p.seq=data.seq;p.touchedAt=p.inputAt=now;
    p.input=model.waiting?null:{turn,thrust,strafe,fire};
   }
   const args=[vessel,JSON.stringify(model),namespace,hull];
   const stmt=row?db.prepare(corsairTestUpdate).bind(...args,row.revision):db.prepare(corsairTestInsert).bind(...args);
   if(await stmt.first())return send(sharedSnapshot(model,p));
  }
  return fail('TEST_BUSY',503);
 }catch{return fail('TEST_UNAVAILABLE',503);}
}
export {handleSharedFlight,SHARED_FLIGHT_PATH,sharedRosterSummary,sharedCarrierReserve,sharedCarrierShipsInside,sharedRiftReserveVolleyDamage,tickSharedFlightRoster};

// Internal simulator interface for Galaxy encounters. The existing shared
// exercise keeps its own rooms, routes and lifecycle.
export const GalaxyFight=Object.freeze({
 create:sharedNew,advance:sharedAdvance,spawn:sharedPlayerShip,tickMs:sharedTickMs,
 snapshot:sharedSnapshot,assignNpc:sharedAssign,rosterCapacity:sharedRosterCapacity
});
