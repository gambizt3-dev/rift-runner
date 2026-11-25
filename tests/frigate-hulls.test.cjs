'use strict';
const {readFileSync}=require('node:fs'),{runInNewContext}=require('node:vm'),assert=require('node:assert/strict'),test=require('node:test');
const root=new URL('../','file:'+__filename),read=f=>readFileSync(new URL(f,root),'utf8');
test('Crosswind standard hull can be shared without carrying a ship name, affiliation or captain',()=>{
 const ctx={window:{}};runInNewContext(read('frigate-hulls.js'),ctx);
 const h=ctx.window.RiftFrigateHulls.crosswind;
 assert.equal(h.id,'crosswind-class');assert.equal(h.length,350);assert.equal(h.pads.length,4);
 for(const key of ['affiliation','captain','shipName','equipment','fleet'])assert.equal(h[key],undefined);
 assert.ok(h.pads.every(Object.isFrozen));assert.ok(Object.isFrozen(h));
 const pirate=ctx.window.RiftFrigateVariants.redGrin;assert.equal(pirate.hullId,h.id);assert.equal(pirate.affiliation,'Pirates');assert.equal(pirate.status,'design-preview');assert.ok(read('ship-catalogue.html').includes('Red Grin'));
 for(const [page,consumer] of [['index.html','game.js'],['galaxy-map.html','galaxy-map.js']]){
  const s=read(page);assert.ok(s.indexOf('frigate-hulls.js?v=1')>=0&&s.indexOf('frigate-hulls.js?v=1')<s.indexOf(consumer+'?v='+ (page==='index.html'?'flight-clean-1':'chart-clean-1')));
  assert.match(read(consumer),/RiftFrigateHulls\?\.crosswind/);
 }
});
