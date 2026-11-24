'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),test=require('node:test');
const read=name=>fs.readFileSync(path.join(__dirname,'../dist',name),'utf8');
test('public fighter and Corvette models use new names without migrating any IDs, saves, or audio',()=>{
 const store=new Map([['rift-runner.selected-fighter.v1','bastion-9']]);
 const window={RiftCredits:{ownsHull:id=>id==='bastion-9'},localStorage:{getItem:key=>store.get(key),setItem:(k,v)=>store.set(k,v)}};
 vm.runInNewContext(read('fighter-registry.js'),{window});
 const registry=window.RiftFighters;
 assert.equal(registry.starter,'rift-fighter');
 assert.equal(registry.selected(),'bastion-9');
 assert.equal(registry.get('rift-fighter').name,'Rift-3 Fighter');
 assert.equal(registry.get('bastion-9').name,'Bastion-2 Fleet Fighter');
 assert.equal(registry.get('stocky-light-fighter').name,'Stocky-2 Light Fighter');
 assert.equal(registry.buildKey('rift-fighter'),'rift-runner.ship-build.v1');
 assert.equal(registry.hullKey('bastion-9'),'rift-runner.hull-owned.v1.bastion-9');
 assert.equal(registry.get('rift-fighter').cardArt,'./rift4-ship-card-v2.webp');
 assert.match(read('carrier-bridge.html'),/captain-starter-ship-rift-four\.mp3/);
 assert.match(read('corvette-loadout.html'),/Resolute<\/h1><p>Corvette · Keel-4 hull · Captain Imani Rook/);
});
