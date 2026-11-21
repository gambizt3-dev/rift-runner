'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {setup,tick}=require('./ballistic.test.cjs');
const key='rift-runner.ship-build.v1';
const stock='stock-thruster',testDrive='test-thruster',core='weifer-he3-core',battery='kestrel-h20-reserve-cell';
function services({origin='new',items=[],alwaysCanBuild=true}={}){
 const set=new Set(items);let kills=0;
 return {add:id=>set.add(id),remove:id=>set.delete(id),get kills(){return kills;},getBuildState:()=>({origin,owned:[...set],canBuild:alwaysCanBuild,kills,balance:0}),
  owns:id=>set.has(id),recordEnemyKill(){kills++;return {saved:true,kills};}};
}
const managed=(pilotCredits,options={})=>setup({buildUI:true,initialHe3:null,legacyArenaHangar:false,pilotCredits,...options});
const summary=q=>q.el['fit-build-status'].textContent;
const choose=q=>{q.choose('hangar');assert.equal(q.el.hangar.open,true);};
const build=(parts={})=>({version:1,hull:'rift-fighter',engine:null,core:null,battery:null,primary:null,secondary:null,shield:null,...parts});
const saved=(q)=>JSON.parse(q.storage.get(key));
test('fresh hull stays bare; direct linked launch and fixture restart/start cannot skip shopping or fit',async()=>{
 const api=services();
 const q=managed(api,{address:{search:'?launch=vandul',replace(){}}});
 assert.equal(q.inspect().state,'menu');assert.equal(q.el.hangar.open,true);
 assert.match(summary(q),/Fit: engine, power core, reserve cell, primary weapon/);
 const {p,fighterLoadout,fighterFit}=q.inspect();
 assert.equal(p.weight,60);assert.deepEqual([fighterLoadout.engine,fighterLoadout.power,fighterLoadout.battery,fighterLoadout.shield,fighterFit.primary,fighterFit.secondary],[null,null,null,null,null,null]);
 assert.equal(q.el['fit-pick-blaster'].disabled,true);assert.equal(q.el['hangar-test-engine'].disabled,true);
 q.fit('engine',stock);q.fit('core',core);q.fit('battery',battery);q.fit('primary','blaster');q.fit('shield','aegis-s3');
 assert.equal(q.storage.get(key),undefined);assert.equal(p.speed,0);assert.equal(p.he3,0);
 q.step(650);assert.equal(q.inspect().duelCountdown,0);assert.equal(q.inspect().vandul,null);assert.equal(q.graphs.length,0);
 const local=managed(api);local.choose('practice');assert.equal(local.inspect().state,'menu');
 assert.equal(local.inspect().duelCountdown,0);
 for(const path of ['?launch=practice','?launch=vandul']){
  const unavailable=managed(null,{address:{search:path}});
  assert.equal(unavailable.inspect().state,'menu');assert.equal(unavailable.el.hangar.open,true);
  assert.match(summary(unavailable),/inventory unavailable/);
 }
});
test('purchased parts appear without auto-fit, persist individually and validated routes let an exact minimal build launch',async()=>{
 const api=services(),q=managed(api);choose(q);
 for(const id of [stock,core,battery,'blaster'])api.add(id);
 q.outside('rift:walletchange',{});
 assert.equal(q.el['fit-pick-blaster'].disabled,false);
 assert.match(q.el['fit-core-badge'].textContent,/Owned · not fitted/);
 assert.equal(q.inspect().fighterFit.primary,null);assert.equal(q.inspect().fighterLoadout.power,null);
 assert.equal(q.storage.get(key),undefined);
 q.fit('engine',stock);assert.deepEqual(saved(q),build({engine:stock}));
 q.fit('core',core);assert.deepEqual(saved(q),build({engine:stock,core}));
 q.fit('battery',battery);assert.deepEqual(saved(q),build({engine:stock,core,battery}));
 assert.match(summary(q),/Fit: primary weapon/);
 q.click('fit-primary-picture');q.click('fit-pick-blaster');
 assert.deepEqual(saved(q),build({engine:stock,core,battery,primary:'blaster'}));
 assert.equal(q.storage.has('rift-runner.shield-fit.v1'),false);
 assert.equal(q.storage.get('rift-runner.engine-fit.v1'),undefined);
 assert.equal(q.storage.get('rift-runner.fighter-fit.v1'),undefined);
 assert.equal(summary(q),'Flight ready.');
 q.fit('secondary','ballistic');assert.equal(saved(q).secondary,null);
 q.click('close-hangar');
 const stored=q.storage.get(key);
 const direct=managed(api,{savedBuild:stored,address:{search:'?launch=practice'}});
 assert.equal(direct.inspect().state,'play');assert.equal(direct.el.hangar.open,false);assert.equal(direct.graphs.length,0);
 assert.equal(direct.inspect().p.weight,93);assert.equal(direct.inspect().p.he3,0);
 const duel=managed(api,{savedBuild:stored,address:{search:'?launch=vandul'}});
 assert.equal(duel.inspect().state,'arrive');assert.equal(duel.graphs.length,0);
 api.remove(core);
 const stale=managed(api,{savedBuild:stored,address:{search:'?launch=practice'}});
 assert.equal(stale.inspect().state,'menu');assert.equal(stale.inspect().fighterLoadout.power,null);
 assert.match(summary(stale),/Fit: power core/);
});
test('malformed or nonowned slots fail closed; legacy engines and weapons carry through and purchased Aegis still fits',()=>{
 const api=services({items:[stock,core,battery,'blaster','aegis-s3']});
 for(const raw of ['garbage',JSON.stringify({version:2,hull:'rift-fighter'}),JSON.stringify(build({hull:'constructor'}))]){
  const q=managed(api,{savedBuild:raw,address:{search:'?launch=practice'}});
  assert.equal(q.inspect().state,'menu');assert.equal(q.inspect().p.weight,60);
 }
 const bad=managed(api,{savedBuild:JSON.stringify(build({engine:'constructor',core,battery,primary:'blaster',secondary:'blaster',shield:'__proto__'})),
  address:{search:'?launch=vandul'}});
 assert.equal(bad.inspect().state,'menu');assert.equal(bad.inspect().fighterLoadout.engine,null);
 assert.equal(bad.inspect().fighterFit.secondary,null);assert.equal(bad.inspect().fighterLoadout.shield,null);
 const legacy=services({origin:'legacy',items:[stock,testDrive,core,battery,'blaster','ballistic','ak77','aegis-s3']});
 const q=managed(legacy,{savedFit:JSON.stringify({version:1,primary:'ak77',secondary:'ballistic'}),savedEngine:JSON.stringify({version:1,engine:testDrive}),legacyShield:'aegis-s3'});
 assert.equal(q.inspect().fighterLoadout.engine,testDrive);assert.equal(q.inspect().fighterLoadout.power,core);
 assert.equal(q.inspect().fighterFit.primary,'ak77');assert.equal(q.inspect().fighterFit.secondary,'ballistic');
 assert.equal(q.inspect().fighterLoadout.shield,'aegis-s3','owned legacy mounted shield is preserved');
 choose(q);q.fit('shield','');q.fit('shield','aegis-s3');assert.equal(saved(q).shield,'aegis-s3');
 q.click('close-hangar');q.choose('practice');assert.equal(q.inspect().state,'play');
});
test('wallet receives exactly one true enemy destruction, never a chip hit or a reset',async()=>{
 const api=services({items:[stock,core,battery,'ballistic']});
 const q=managed(api,{savedBuild:JSON.stringify(build({engine:stock,core,battery,primary:'ballistic'}))});
 q.choose('practice');await tick();q.step();q.target(true);
 const {vandul,p,cones,asteroids,sceneryDebris}=q.inspect();cones.splice(0);asteroids.splice(0);sceneryDebris.splice(0);
 Object.assign(p,{x:480,y:920,vx:0,vy:0,aim:-Math.PI/2});
 Object.assign(vandul,{x:480,y:847,vx:0,vy:0,hp:9,nextLaser:999,nextDriveBy:999});
 q.click('fire-button');q.step(12);assert.equal(vandul.hp,4);assert.equal(api.kills,0);
 q.click('fire-button');q.click('fire-button');q.step(14);
 assert.equal(vandul.hp,0);assert.equal(q.inspect().duelKills,1);assert.equal(api.kills,1);
 q.reset();q.step(50);assert.equal(api.kills,1);
});
