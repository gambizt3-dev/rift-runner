import {openCorsair} from './corsair-event.mjs';
const readOpen='SELECT event_id,revision,model,settled_at FROM rift_galaxy_corsair WHERE settled_at IS NULL';
const read='SELECT event_id,revision,model,settled_at FROM rift_galaxy_corsair WHERE event_id=?1';
const insert='INSERT OR IGNORE INTO rift_galaxy_corsair(event_id,revision,model) VALUES(?1,1,?2) RETURNING event_id';
const update=`UPDATE rift_galaxy_corsair SET model=?2,settled_at=?3,revision=revision+1
 WHERE event_id=?1 AND revision=?4 AND settled_at IS NULL RETURNING event_id`;
const guardedUpdate=update.replace(' RETURNING event_id',` AND EXISTS(SELECT 1 FROM rift_fighter_parking
 WHERE namespace_hash=?5 AND hull_id=?6 AND vessel_id=?7) RETURNING event_id`);
const checkBerth='SELECT vessel_id AS vessel FROM rift_fighter_parking WHERE namespace_hash=?1 AND hull_id=?2';
function decode(row){return row?JSON.parse(row.model):null;}
export function corsairStore(db){
 return {
  async active(){return decode(await db.prepare(readOpen).first());},
  async get(id){return decode(await db.prepare(read).bind(id).first());},
  // Only the trusted Galaxy scheduler opens an occurrence. If another
  // invocation won the race, return that occurrence instead of spawning more.
  async open(site){
   const next=openCorsair(site);
   if(await db.prepare(insert).bind(next.id,JSON.stringify(next)).first())return next;
   return decode(await db.prepare(readOpen).first()??await db.prepare(read).bind(next.id).first());
  },
  async change(id,apply,berth=null){
   for(let attempt=0;attempt<8;attempt++){
    const row=await db.prepare(read).bind(id).first();
    if(!row)return null;
    const event=decode(row);
    if(row.settled_at!==null)return event;
    // apply mutates a private copy only and must have no external side effects.
    apply(event);
    if(event.id!==id)throw Error('Cannot change a Corsair event identity');
    const args=[id,JSON.stringify(event),event.settlement?.at??null,row.revision];
    if(berth)args.push(berth.pilot,berth.hull,berth.origin);
    const saved=await db.prepare(berth?guardedUpdate:update).bind(...args).first();
    if(saved)return event;
    if(berth&&(await db.prepare(checkBerth).bind(berth.pilot,berth.hull).first())?.vessel!==berth.origin)return null;
   }
   throw Error('Corsair event busy');
  }
 };
}
