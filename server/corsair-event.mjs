import {GalaxyFight} from './shared-flight.mjs';
const life=12*60_000,npcWaveDelay=60_000,withdrawalDelay=120_000,lease=12_000,slots=6,maxCatchup=180_000;
const hulls=new Set(['rift-fighter','bastion-9','stocky-light-fighter']);
const validTime=ms=>Number.isSafeInteger(ms)&&ms>=0;
export function openCorsair({startedAt,sector,x,y,lead='rift-carrier',twoCarriers=false}){
 if(!validTime(startedAt)||!['reach','frontier'].includes(sector)||!Number.isFinite(x)||!Number.isFinite(y)||lead!=='rift-carrier')throw Error('Invalid Galaxy event');
 const model=GalaxyFight.create(startedAt);
 const id='corsair:'+sector+':'+startedAt;
 model.id=id;model.instance=id;model.end=startedAt+life;
 const event={id,sector,x,y,lead,joinable:twoCarriers?[lead,'bifrost']:[lead],start:startedAt,end:model.end,withdrawalAt:null,settlement:null,npcWaveSent:false,model};
 return event;
}
export function corsairMarker(event,now){
 return {id:event.id,sector:event.sector,x:event.x,y:event.y,lead:event.lead,joinable:[...event.joinable],
  start:event.start,elapsedMs:Math.max(0,Math.min(now,event.settlement?.at??event.end)-event.start),
  players:event.model.players.filter(p=>p.ship.hp>0&&p.present&&now-p.touchedAt<lease).length,
  piratesLeft:event.model.pirates.filter(p=>p.hp>0).length,withdrawalAt:event.withdrawalAt,
  status:event.settlement?'finished':'active',result:event.settlement?.result??null};
}
function settle(e,result,at){
 if(e.settlement)return;
 e.model.status='complete';e.model.completedAt=at;e.model.shots=[];
 e.settlement={id:e.id,result,at};
}
export function tickCorsair(e,now){
 if(!validTime(now)||e.settlement||now<e.model.at)return;
 const living=e.model.players.filter(p=>p.present&&p.ship.hp>0);
 if(living.length&&!living.some(p=>now-p.touchedAt<lease)&&e.withdrawalAt===null)
  e.withdrawalAt=Math.max(...living.map(p=>p.touchedAt))+lease+withdrawalDelay;
 const until=Math.min(now,e.end-1,e.withdrawalAt??Infinity);
 // Use fixed ticks and bounded catch-up; an unattended event is advanced by
 // the host timer as well as player input. Missing more than three minutes
 // freezes the missed interval instead of allowing an unbounded CPU burst.
 if(e.model.at<until-maxCatchup)e.model.at=until-maxCatchup;
 for(let t=e.model.at+GalaxyFight.tickMs;t<=until&&e.model.status==='running';t+=GalaxyFight.tickMs){
  // Leave a visible window to join before the NPC reserve wave engages.
  // Requests and scheduled ticks share the same one-shot roster flag.
  if(!e.npcWaveSent&&t>=e.start+npcWaveDelay){
   GalaxyFight.assignNpc(e.model,t,e.lead,2,null);e.npcWaveSent=true;
  }
  // Detached pilots retain their ship and damage but are not NPC targets,
  // nor can a half-received disconnect keep firing without them.
  const all=e.model.players;
  e.model.players=all.filter(p=>p.present&&t-p.touchedAt<lease);
  try{GalaxyFight.advance(e.model,t,true);}finally{e.model.players=all;}
  if(e.model.pirates.every(s=>s.hp<=0)){settle(e,'victory',t);return;}
  if(e.model.status==='complete'){
   if(all.some(p=>p.present&&p.ship.hp>0&&t-p.touchedAt<lease)||e.model.wingmates.some(p=>p.hp>0)){
    e.model.status='running';e.model.completedAt=null;
   }else {settle(e,'defeat',t);return;}
  }
 }
 if(e.withdrawalAt!==null&&now>=e.withdrawalAt){settle(e,'withdrawn',e.withdrawalAt);return;}
 if(now>=e.end)settle(e,'expired',e.end);
}
// Admission is internal. The online host must derive verified, pilot and
// origin from berth ownership plus a Galaxy approach receipt, never a client flag.
export function admitCorsair(e,admission,now){
 tickCorsair(e,now);
 const {pilot,hull,origin,eventId,verified}=admission??{};
 if(e.settlement||!validTime(now)||eventId!==e.id||verified!==true||
    typeof pilot!=='string'||!pilot||!hulls.has(hull)||!e.joinable.includes(origin))return null;
 let player=e.model.players.find(p=>p.pilot===pilot);
 if(player){
  if(player.ship.hull!==hull||player.ship.vessel!==origin||player.ship.hp<=0)return null;
 }else{
  if(e.model.players.length>=slots)return null;
  const slot=e.model.players.filter(p=>p.ship.vessel===origin).length;
  player={pilot,ship:GalaxyFight.spawn(crypto.randomUUID(),origin,hull,'allies',slot),
   side:'allies',seq:0,touchedAt:now,inputAt:0,input:null,present:true};
  e.model.players.push(player);
 }
 if(!player.present||now-player.touchedAt>=lease)player.input=null;
 player.touchedAt=now;player.present=true;e.withdrawalAt=null;
 return corsairView(e,pilot,now);
}
export function inputCorsair(e,pilot,data,now){
 tickCorsair(e,now);
 const player=e.model.players.find(p=>p.pilot===pilot),input=data??{};
 if(!player||!player.present||now-player.touchedAt>=lease||input.eventId!==e.id)return null;
 if(!e.settlement&&player.ship.hp>0&&Number.isSafeInteger(input.seq)&&input.seq>player.seq&&input.seq<=player.seq+100&&
    [input.turn,input.thrust,input.strafe].every(v=>Number.isFinite(v)&&Math.abs(v)<=1)&&typeof input.fire==='boolean'){
  player.seq=input.seq;player.inputAt=now;player.touchedAt=now;
  player.input={turn:input.turn,thrust:input.thrust,strafe:input.strafe,fire:input.fire};
 }
 return corsairView(e,pilot,now);
}
export function leaveCorsair(e,pilot,now){
 tickCorsair(e,now);
 const player=e.model.players.find(p=>p.pilot===pilot);
 if(!player||e.settlement)return null;
 player.present=false;player.input=null;
 if(!e.model.players.some(p=>p.present&&p.ship.hp>0&&now-p.touchedAt<lease)&&e.withdrawalAt===null)e.withdrawalAt=now+withdrawalDelay;
 return corsairView(e,pilot,now);
}
export function corsairView(e,pilot,now){
 const seat=e.model.players.find(p=>p.pilot===pilot);
 if(!seat)return null;
 const snapshot=GalaxyFight.snapshot(e.model,seat),seen=new Set(e.model.players.filter(p=>p===seat||p.present&&now-p.touchedAt<lease).map(p=>p.ship.id));
 snapshot.state.ships=snapshot.state.ships.filter(s=>s.npc||seen.has(s.id));
 return {...snapshot,event:corsairMarker(e,now),settlement:e.settlement&&{...e.settlement}};
}
