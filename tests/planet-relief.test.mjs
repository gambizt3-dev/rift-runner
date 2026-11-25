import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {makePlanetLockdownHost,LOCKDOWN_PATH} from '../server/planet-lockdown-host.mjs';

test('shared SQL room takes real combat input from both carriers, then clears the Galaxy marker', async t=>{
 const sql=new DatabaseSync(':memory:');t.after(()=>sql.close());
 sql.exec(readFileSync(new URL('../migrations/012_planet_lockdown.sql',import.meta.url),'utf8'));
 const env={GALAXY_DB:{prepare(q){
  const stmt=sql.prepare(q);
  return {first:async()=>stmt.get()??null,bind(...args){
   const bindings=Object.fromEntries(args.map((a,i)=>[i+1,a]));
   return {run:async()=>({meta:stmt.run(bindings)})};
  }};
 }}};
 let now=2_400_000;
 const host=makePlanetLockdownHost({random:()=>0,clock:()=>now});
 const read=()=>host.fetch(new Request('https://example.test'+LOCKDOWN_PATH),env).then(r=>r.json());
 const opened=await host.scheduled(env,now),id=opened.active.id;
 assert.equal((await read()).event.planetId,'meridian');
 const origins=['rift-carrier','bifrost'],pilots=['pilot-1','pilot-2'];
 await Promise.all(origins.map(carrierId=>host.rally(env,id,{id:carrierId,sector:'reach',x:1375,y:920,canDeploy:true,allegiance:'navy'})));
 assert.equal((await read()).event.carrierCount,2);
 const battleId='liberation:'+id+':0';
 let state;
 for(const [i,carrierId] of origins.entries()) state=await host.seat(env,battleId,{carrierId,pilotKey:pilots[i],hull:'rift-fighter',verifiedShipId:'verified-ship-'+i});
 assert.equal(state.active.battle.model.players.length,2);
 assert.equal(state.active.battle.model.pirates.length,1);
 const angle=d=>Math.atan2(Math.sin(d),Math.cos(d));
 for(let n=1;n<400&&state.active?.battle;n++){
  now+=100;
  const enemy=state.active.battle.model.pirates[0];
  for(const [i,pilot] of pilots.entries()){
   const ship=state.active.battle.model.players[i].ship;
   const dx=enemy.x-ship.x,dy=enemy.y-ship.y,d=angle(Math.atan2(dy,dx)-ship.heading);
   state=await host.input(env,battleId,pilot,{seq:n,turn:Math.max(-1,Math.min(1,d*5)),thrust:Math.hypot(dx,dy)>285&&Math.abs(d)<.5?1:0,strafe:0,fire:Math.abs(d)<.16});
   if(!state.active?.battle)break;
  }
 }
 assert.equal(state.lastLiberation?.eventId,id);
 assert.equal(await host.access(env,'meridian'),'open');
 assert.equal((await read()).event,null);
});
