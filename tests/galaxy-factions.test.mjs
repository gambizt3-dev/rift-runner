import test from 'node:test';
import assert from 'node:assert/strict';
import '../galaxy-factions.js';

const {entries,contact,patrol}=globalThis.RiftGalaxyFactions;
test('Navy carriers, pirates and aliens resolve by stable contact ID',()=>{
 assert.equal(contact('rift-carrier'),entries.navy);
 assert.equal(contact('bifrost'),entries.navy);
 assert.equal(contact('blackwake'),entries.pirates);
 assert.equal(contact('alien-patrol'),entries.aliens);
 assert.equal(contact('corsair'),null);
 assert.equal(contact('constructor'),null);
});
test('Independence is an unaffiliated status, not another allegiance',()=>{
 assert.equal(entries.independent.kind,'Unaffiliated');
 assert.equal(contact('independent-player'),null);
 assert.equal(Object.values(entries).filter(x=>x.kind.endsWith('faction')).length,3);
});
test('Patrol is deterministic, in bounds and does not jump when it loops',()=>{
 const start=Date.UTC(2026,0,1),cycle=36*60*1000;
 assert.deepEqual(patrol(start),patrol(start+cycle));
 assert.notDeepEqual(patrol(start),patrol(start+60_000));
 const a=patrol(start-1),b=patrol(start);
 assert.ok(Math.hypot(a.x-b.x,a.y-b.y)<.01);
 for(let n=0;n<360;n++){
  const {x,y}=patrol(start+n*6000);
  assert.ok(x>0&&x<2750&&y>0&&y<1810);
 }
});
