// D1-backed polling simulation. All movement, shots and damage are server-owned.
const SHARED_FLIGHT_PATH='/api/multiplayer/battles/blackwake';
const sharedSite='https://rift-runner.boundlessghost16.chatgpt.site',sharedWorker='https://rift-runner.gambizt3.workers.dev';
const sharedTickMs=100,sharedDurationMs=600000,sharedWidth=1800,sharedHeight=2400,sharedSlotsPerSide=4,sharedIdleMs=30000,sharedDebriefMs=12000,sharedWingmateDelayMs=5000;
const sharedHulls=new Set(['rift-fighter','stocky-light-fighter','bastion-9']);
const sharedVessels=new Set(['rift-carrier','bifrost']);
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
function sharedNew(now){
 return {id:'blackwake',instance:crypto.randomUUID(),status:'running',tick:0,at:now,end:now+sharedDurationMs,
  players:[],wingmates:[],reinforcement:null,shots:[],shotId:0,pirates:[
   sharedShip('pirate-core','pirate','blackwake','pirate-multicrew',900,1000,Math.PI/2,75),
   sharedShip('pirate-1','pirate','blackwake','pirate-multicrew',690,1120,Math.PI/2,45),
   sharedShip('pirate-2','pirate','blackwake','pirate-multicrew',1110,1120,Math.PI/2,45)]};
}
function sharedPlayerShip(id,vessel,hull,side,slot){
 const left=vessel==='rift-carrier',opposition=side==='opposition';
 return sharedShip(id,opposition?'pirate':'ally',vessel,hull,opposition?745+slot*100:left?430:1380,
  opposition?730:1900+slot*44,opposition?Math.PI/2:-Math.PI/2,sharedHealth[hull]);
}
function sharedMove(ship,turn,thrust,strafe){
 ship.heading=sharedAngle(ship.heading+turn*.14);
 const c=Math.cos(ship.heading),s=Math.sin(ship.heading);
 ship.x=sharedBound(ship.x+thrust*c*17-strafe*s*11,25,sharedWidth-25);
 ship.y=sharedBound(ship.y+thrust*s*17+strafe*c*11,25,sharedHeight-25);
}
function sharedFire(model,ship){
 if(model.tick<ship.ready||model.shots.length>=120)return;
 const ai=ship.id.startsWith('pirate-')||ship.id.startsWith('navy-');
 ship.ready=model.tick+(ai?10:4);
 const c=Math.cos(ship.heading),s=Math.sin(ship.heading);
 model.shots.push({id:++model.shotId,team:ship.team,x:ship.x+c*25,y:ship.y+s*25,heading:ship.heading,life:24,damage:ai?2:3});
}
function sharedCollision(x,y,dx,dy,ship){
 const t=sharedBound(((ship.x-x)*dx+(ship.y-y)*dy)/(dx*dx+dy*dy),0,1);
 return Math.hypot(x+dx*t-ship.x,y+dy*t-ship.y)<(ship.hull==='pirate-multicrew'?46:22);
}
function sharedCanReset(model,now){return !model||now>=model.end||model.status==='complete'&&now>=model.completedAt+sharedDebriefMs;}
function sharedAdvance(model,now){
 if(model.status==='complete')return;
 if(now>=model.end){model.status='complete';model.completedAt=model.end;return;}
 // A suspended room doesn't replay minutes of stale fire on anyone's next visit.
 model.at=Math.max(model.at,now-1000);
 model.wingmates??=[];
 const waiting=model.reinforcement;
 if(waiting&&now>=waiting.at&&!model.wingmates.length){
  const left=waiting.vessel==='rift-carrier';
  model.wingmates=[1,2].map((n)=>({...sharedShip('navy-wingmate-'+n,'ally',waiting.vessel,
   'rift-fighter',(left?430:1380)+(n===1?-85:85),1850,-Math.PI/2,18),name:'Navy Wingmate '+n}));
 }
 const allies=[...model.wingmates,...model.players.filter(p=>p.ship.team==='ally').map(p=>p.ship)];
 const enemies=[...model.pirates,...model.players.filter(p=>p.ship.team==='pirate').map(p=>p.ship)];
 while(model.at+sharedTickMs<=now&&model.status==='running'){
  model.at+=sharedTickMs;model.tick++;
  for(const p of model.players){
   if(p.ship.hp<=0||!p.input||model.at-p.inputAt>=600)continue;
   const i=p.input;
   sharedMove(p.ship,i.turn,i.thrust,i.strafe);
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
   const hit=(shot.team==='ally'?enemies:allies).find(s=>s.hp>0&&sharedCollision(shot.x,shot.y,dx,dy,s));
   if(hit){hit.hp=Math.max(0,hit.hp-shot.damage);return false;}
   shot.x+=dx;shot.y+=dy;
   return --shot.life>0&&shot.x>=0&&shot.x<=sharedWidth&&shot.y>=0&&shot.y<=sharedHeight;
  });
  if(enemies.every(s=>s.hp<=0)||allies.length&&allies.every(s=>s.hp<=0)){model.status='complete';model.completedAt=model.at;}
 }
}
function sharedSnapshot(model,player){
 const ship=({id,team,vessel,hull,x,y,heading,hp,maxHp,name},npc)=>({id,team,vessel,hull,x,y,heading,hp,maxHp,npc,...(name?{name}:{})});
 const shot=({id,team,x,y,heading})=>({id,team,x,y,heading});
 return {version:1,self:player.ship.id,lastSeq:player.seq,state:{id:model.id,instance:model.instance,
  status:model.status,tick:model.tick,width:sharedWidth,height:sharedHeight,
  ships:[...model.players.map(p=>ship(p.ship,false)),...[...(model.wingmates??[]),...model.pirates].map(s=>ship(s,true))],shots:model.shots.map(shot)}};
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
 if(joining)return Object.keys(d).length===3&&(d.side==='allies'||d.side==='opposition');
 return Object.keys(d).length===8&&/^[\da-f-]{36}$/.test(d.instance??'')&&Number.isSafeInteger(d.seq)&&d.seq>0&&
  [d.turn,d.thrust,d.strafe].every(x=>Number.isFinite(x)&&Math.abs(x)<=1)&&typeof d.fire==='boolean';
}
async function handleSharedFlight(request,env,clock=Date.now){
 const url=new URL(request.url);
 const root=url.pathname===SHARED_FLIGHT_PATH,joining=url.pathname===SHARED_FLIGHT_PATH+'/join',stepping=url.pathname===SHARED_FLIGHT_PATH+'/step';
 if(!root&&!joining&&!stepping)return null;
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
   const status=sharedCanReset(model,clock())?'open':model.status;
   return send({version:1,battle:{id:'blackwake',mode:'shared',status,instance:status==='open'?null:model.instance,...sharedHome,
    joinable:status!=='complete',sides:['allies','opposition']}});
  }
  const secret=/^Bearer ([0-9a-f]{64})$/.exec(request.headers.get('authorization')??'')?.[1];
  if(!secret)return fail('PARKING_TOKEN_REQUIRED',401);
  const data=await sharedBody(request);
  if(!sharedValid(data,joining))return fail('INVALID_BATTLE_REQUEST',400);
  const hash=await crypto.subtle.digest('SHA-256',new TextEncoder().encode('rift-runner:fighter-parking:v1:'+secret));
  const namespace=Array.from(new Uint8Array(hash),byte=>byte.toString(16).padStart(2,'0')).join('');
  const berth=await db.prepare(sharedBerth).bind(namespace,data.hull).first();
  if(berth?.vessel!==data.vessel)return fail('PARKING_NOT_CONFIRMED',409);
  for(let i=0;i<6;i++){
   const row=await db.prepare(sharedRead).first();
   const now=clock();
   let model=row?JSON.parse(row.model):null;
   if(joining&&sharedCanReset(model,now))model=sharedNew(now);
   if(!model||stepping&&data.instance!==model.instance)return fail('BATTLE_INSTANCE_CHANGED',409);
   const beforeTick=model.tick,beforeStatus=model.status,beforeCount=model.players.length,beforeWings=model.wingmates?.length??0;
   if(model.status==='running'&&now<model.end)model.players=model.players.filter(p=>now-p.touchedAt<sharedIdleMs);
   sharedAdvance(model,now);
   let dirty=beforeTick!==model.tick||beforeStatus!==model.status||beforeCount!==model.players.length||beforeWings!==model.wingmates?.length;
   let p=model.players.find(p=>p.namespace===namespace);
   if(p&&(p.ship.hull!==data.hull||p.ship.vessel!==data.vessel))return fail('BATTLE_SLOT_CONFLICT',409);
   if(joining&&p&&p.side!==data.side)return fail('BATTLE_SIDE_LOCKED',409);
   if(joining&&!p){
    const slot=model.players.filter(other=>other.side===data.side).length;
    if(model.status!=='running'||slot>=sharedSlotsPerSide)return fail('BATTLE_NOT_JOINABLE',409);
    const ship=sharedPlayerShip(crypto.randomUUID(),data.vessel,data.hull,data.side,slot);
    model.players.push(p={namespace,ship,side:data.side,seq:0,touchedAt:now,inputAt:0,input:null});
    if(data.side==='allies'&&!model.reinforcement)model.reinforcement={at:now+sharedWingmateDelayMs,vessel:data.vessel};
    dirty=true;
   }
   if(!p)return fail('BATTLE_JOIN_REQUIRED',403);
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
export {handleSharedFlight,SHARED_FLIGHT_PATH};
