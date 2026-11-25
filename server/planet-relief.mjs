// Single-craft relief battle using the same server flight simulation as online ship combat.
import {GalaxyFight} from './shared-flight.mjs';
const lease=12_000,limit=6,life=8*60_000;
const hulls=new Set(['rift-fighter','bastion-9','stocky-light-fighter']);
export function openRelief(event,now){
 const m=GalaxyFight.create(now);
 m.id=event.battleId;m.instance=event.battleId;m.end=now+life;
 m.pirates=[{...m.pirates[0],id:'alien-blockade-craft',vessel:'alien-patrol',hp:65,maxHp:65}];
 return {eventId:event.id,model:m};
}
export function advanceRelief(b,now){
 const m=b.model;
 if(!m.players.length)return;
 const pilots=m.players;
 for(const p of pilots)if(now-p.touchedAt>=lease)p.input=null;
 GalaxyFight.advance(m,now);
}
export function seatRelief(b, event, {carrierId,hull,verifiedShipId,pilotKey}, now){
 const m=b.model;
 if(b.eventId!==event.id||m.id!==event.battleId||m.status!=='running'||!event.carriers.includes(carrierId)||
    !hulls.has(hull)||typeof verifiedShipId!=='string'||!verifiedShipId||typeof pilotKey!=='string'||!pilotKey)return false;
 const current=m.players.find(p=>p.pilotKey===pilotKey);
 if(current){
  if(current.ship.id!==verifiedShipId||current.ship.hp<=0)return false;
  current.touchedAt=now;current.input=null;return true;
 }
 if(m.players.length>=limit||m.players.some(p=>p.ship.id===verifiedShipId))return false;
 const slot=m.players.filter(p=>p.ship.vessel===carrierId).length;
 m.players.push({pilotKey,ship:GalaxyFight.spawn(verifiedShipId,carrierId,hull,'allies',slot),seq:0,touchedAt:now,inputAt:0,input:null});
 return true;
}
export function reliefInput(b,pilotKey,d,now){
 const p=b.model.players.find(p=>p.pilotKey===pilotKey);
 if(!p||b.model.status!=='running'||now-p.touchedAt>=lease||p.ship.hp<=0||
    !Number.isSafeInteger(d?.seq)||d.seq<=p.seq||d.seq>p.seq+100||
    ![d.turn,d.thrust,d.strafe].every(v=>Number.isFinite(v)&&Math.abs(v)<=1)||typeof d.fire!=='boolean')return false;
 p.seq=d.seq;p.touchedAt=now;p.inputAt=now;p.input={turn:d.turn,thrust:d.thrust,strafe:d.strafe,fire:d.fire};return true;
}
export function reliefOutcome(b){
 const m=b.model;
 if(m.status!=='complete')return null;
 return {eventId:b.eventId,battleId:m.id,at:m.completedAt,outcome:m.winner==='allies'?'liberators':'defenders'};
}
