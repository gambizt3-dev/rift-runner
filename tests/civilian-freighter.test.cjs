'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {setup}=require('./ballistic.test.cjs');
const root=['../dist','..'].map(rel=>path.join(__dirname,rel)).find(dir=>fs.existsSync(path.join(dir,'index.html')));
const shop=fs.readFileSync(path.join(root,'carrier-shop.html'),'utf8');
const route=shop.match(/href="\.\/index\.html([^"]+)" data-civ-trial/)[1].replaceAll('&amp;','&');
test('shop links to a private unarmed vessel trial with a working engine, power core and cell',()=>{
 for(const vessel of ['rift-carrier','bifrost']){
  let destination;
  const storage=new Map([['rift-runner.ship-build.v1',JSON.stringify({version:1,hull:'rift-fighter',primary:'blaster'})]]);
  const q=setup({address:{search:route.replace('rift-carrier',vessel),origin:'https://rift.example',replace:href=>destination=href},
   sharedStorage:storage,flightShell:true,loadFighters:true,reducedMotion:true});
  const before=[...storage];
  assert.equal(q.inspect().state,'play');assert.equal(q.inspect().flightMode.duel,false);
  assert.equal(q.inspect().capitalShip,null);
  assert.equal(q.inspect().p.fighter,'civilian-freighter');
  assert.equal(q.inspect().fighterLoadout.engine,'hauler-drive');
  assert.equal(q.inspect().fighterLoadout.power,'weifer-he3-core');
  assert.equal(q.inspect().fighterLoadout.battery,'kestrel-h20-reserve-cell');
  assert.equal(q.inspect().fighterFit.primary,null);assert.equal(q.inspect().fighterFit.secondary,null);
  assert.equal(q.el['fire-button'].disabled,true);
  q.click('fire-button');q.pointer('pointerdown');q.pointer('pointerup');q.key('keydown','Space');q.key('keyup','Space');q.step(10);
  assert.equal(q.inspect().shots.length,0);
  q.key('keydown','KeyE');q.step(30);q.key('keyup','KeyE');
  assert.ok(Math.hypot(q.inspect().p.vx,q.inspect().p.vy)>0,'the installed drive moves the freighter');
  q.click('return-main-menu');
  assert.equal(destination,'./carrier-shop.html?vessel='+vessel+'&view=freighters');
  assert.deepEqual([...storage],before);
 }
});
test('freighter cannot use the hangar test route or access a mission with extra query parameters',()=>{
 for(const search of [route.replace('from=shop','from=hangar'),route+'&mission=corsair']){
  const q=setup({address:{search,origin:'https://rift.example'},flightShell:true,loadFighters:true});
  assert.equal(q.inspect().state,'menu');assert.notEqual(q.inspect().p.fighter,'civilian-freighter');
 }
});
