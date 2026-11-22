'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {setup,tick}=require('./ballistic.test.cjs');
const key='rift-runner.ship-build.v1',hullKey='rift-runner.hull-owned.v1';
const stock='stock-thruster',testDrive='test-thruster',core='weifer-he3-core',battery='kestrel-h20-reserve-cell';
function services({origin='new',items=[],alwaysCanBuild=true}={}){
 const set=new Set(items);let kills=0;
 return {add:id=>set.add(id),remove:id=>set.delete(id),get kills(){return kills;},getBuildState:()=>({origin,owned:[...set],canBuild:alwaysCanBuild,kills,balance:0}),
  owns:id=>set.has(id),recordEnemyKill(){kills++;return {saved:true,kills,amount:2.5};}};
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
 assert.match(summary(q),/No ship yet/);
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
 let now=100000;const api=services(),q=managed(api,{wallNow:()=>now});choose(q);
 q.click('fit-claim-hull');q.click('fit-repair-hull');now+=240000;q.step();
 for(const id of [stock,core,battery,'blaster'])api.add(id);
 q.outside('rift:walletchange',{});
 assert.equal(q.el['fit-pick-blaster'].disabled,false);
 assert.equal(q.el['fit-core-empty'].hidden,false);assert.equal(q.el['fit-core-module'].hidden,true);
 assert.equal(q.inspect().fighterFit.primary,null);assert.equal(q.inspect().fighterLoadout.power,null);
 assert.equal(q.storage.get(key),undefined);
 q.fit('engine',stock);assert.deepEqual(saved(q),build({engine:stock}));
 q.fit('core',core);assert.deepEqual(saved(q),build({engine:stock,core}));
 q.fit('battery',battery);assert.deepEqual(saved(q),build({engine:stock,core,battery}));
 for(const [slot,id] of [['core',core],['battery',battery]]){
  assert.equal(q.el['fit-'+slot+'-module'].hidden,false);assert.equal(q.el['fit-'+slot+'-empty'].hidden,true);
  q.fit(slot,'');assert.equal(q.el['fit-'+slot+'-module'].hidden,true);assert.equal(q.el['fit-'+slot+'-empty'].hidden,false);
  assert.equal(q.el['fit-'+slot].attrs['aria-describedby'],'fit-'+slot+'-empty');
  assert.equal(api.owns(id),true);q.fit(slot,id);
 }
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

function bayVisibility(q){
 return ['fit-salvage-preview','hangar-damaged-bay','hangar-repaired-bay','hangar-player-loadout','fit-repair-progress-wrap'].map(id=>!q.el[id].hidden);
}
test('claimed Rift-4 remains visibly damaged for four real minutes across reloads, with live repair progress',()=>{
 let now=100000;const api=services({items:[stock,core,battery,'blaster']}),wallet=api.getBuildState();
 const options={wallNow:()=>now,address:{search:'?launch=practice',replace(){}}},q=managed(api,options);
 assert.match(summary(q),/No ship yet/);q.fit('engine',stock);assert.equal(q.storage.get(key),undefined);
 assert.deepEqual(bayVisibility(q),[true,false,false,false,false]);
 q.click('fit-claim-hull');assert.equal(JSON.parse(q.storage.get(hullKey)).condition,'damaged');
 assert.deepEqual(bayVisibility(q),[false,true,false,false,false]);
 q.click('fit-repair-hull');const pending=q.storage.get(hullKey);
 assert.deepEqual(JSON.parse(pending),{version:1,hull:'rift-fighter',condition:'repairing',readyAt:340000,durationMs:240000});
 assert.deepEqual(bayVisibility(q),[false,true,false,false,true]);
 assert.match(summary(q),/4:00 remaining/);assert.equal(q.el['fit-repair-progress'].value,0);
 q.click('fit-repair-hull');assert.equal(q.storage.get(hullKey),pending);
 now=220000;q.step(16);
 assert.match(summary(q),/2:00 remaining/);assert.equal(q.el['fit-repair-progress'].value,50);
 now=339999;q.step(16);assert.match(summary(q),/0:01 remaining/);
 const early=managed(api,{...options,savedHull:pending});
 assert.deepEqual(bayVisibility(early),[false,true,false,false,true]);
 assert.equal(early.el['fit-repair-progress'].value,99);
 assert.equal(early.inspect().state,'menu');assert.equal(early.storage.get(hullKey),pending);
 now=340000;const complete=managed(api,{...options,savedHull:pending});
 assert.equal(JSON.parse(complete.storage.get(hullKey)).condition,'repaired');
 assert.deepEqual(bayVisibility(complete),[false,false,true,true,false]);
 assert.match(summary(complete),/Fit: engine/);assert.equal(complete.inspect().state,'menu');
 assert.deepEqual(api.getBuildState(),wallet);
});

test('existing 60-second repairs retain their original progress span and deadline on the new build',()=>{
 let now=130000;
 const api=services(),pending=JSON.stringify({version:1,hull:'rift-fighter',condition:'repairing',readyAt:160000});
 const q=managed(api,{savedHull:pending,wallNow:()=>now,address:{search:'?hangar=carrier',replace(){}}});
 assert.match(summary(q),/0:30 remaining/);assert.equal(q.el['fit-repair-progress'].value,50);
 assert.equal(q.storage.get(hullKey),pending);assert.deepEqual(bayVisibility(q),[false,true,false,false,true]);
 now=160000;q.step();assert.equal(JSON.parse(q.storage.get(hullKey)).condition,'repaired');
 assert.deepEqual(bayVisibility(q),[false,false,true,true,false]);
});

test('a malformed explicit hull certificate fails closed instead of granting a legacy migration or permitting overwrite',()=>{
 const api=services({origin:'legacy',items:[stock,core,battery,'blaster']});
 const bad=managed(api,{savedHull:'{"version":1,"hull":"rift-fighter","condition":"repairing"}',address:{search:'?launch=practice',replace(){}}});
 assert.match(summary(bad),/Ship ownership unavailable/);assert.equal(bad.inspect().state,'menu');
 assert.equal(bad.el['fit-claim-hull'].hidden,true);assert.equal(bad.el['fit-repair-hull'].hidden,true);
 bad.click('fit-claim-hull');assert.equal(JSON.parse(bad.storage.get(hullKey)).condition,'repairing');
});

test('an old active mission cannot credit a newly reset profile after another tab deletes it',async()=>{
 const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
 const walletKey='rift-runner.pilot-credits.v1',profileKey='rift-runner.pilot-profile.v1',generationKey='rift-runner.character-generation.v1';
 const data=new Map([[walletKey,JSON.stringify({version:3,origin:'new',balance:35,kills:55,owned:[stock,core,battery,'ballistic']})]]);
 const localStorage={getItem:i=>data.get(i)??null,setItem:(i,v)=>data.set(i,v)};
 const walletWindow={localStorage};
 vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../dist/pilot-credits.js'),'utf8'),{window:walletWindow,document:{getElementById:()=>null},Event});
 const q=managed(walletWindow.RiftCredits,{savedBuild:JSON.stringify(build({engine:stock,core,battery,primary:'ballistic'})),
   savedHull:JSON.stringify({version:1,hull:'rift-fighter',condition:'repaired'})});
 q.storage.set(profileKey,'original-profile');
 q.choose('practice');await tick();q.step();q.target(true);
 const {vandul,p,cones,asteroids,sceneryDebris}=q.inspect();cones.splice(0);asteroids.splice(0);sceneryDebris.splice(0);
 Object.assign(p,{x:480,y:920,vx:0,vy:0,aim:-Math.PI/2});
 Object.assign(vandul,{x:480,y:847,vx:0,vy:0,hp:4,nextLaser:999,nextDriveBy:999});
 const generation='a'.repeat(32);q.storage.set(generationKey,generation);data.set(generationKey,generation);
 q.storage.delete(profileKey);q.storage.delete(key);q.storage.delete(hullKey);data.delete(walletKey);
 q.outside('storage',{key:profileKey,newValue:null});q.outside('storage',{key:walletKey,newValue:null});
 assert.equal(walletWindow.RiftCredits.getBuildState().kills,0);
 q.click('fire-button');q.step(14);
 assert.equal(walletWindow.RiftCredits.getBuildState().kills,0);
 assert.equal(walletWindow.RiftCredits.getBalance(),250);
});

test('after a starter repair re-test, the same open Hangar reloads preserved fittings at completion',()=>{
 let now=100000;
 const api=services({items:[stock,core,battery,'blaster']});
 const originalFit=JSON.stringify(build({engine:stock,core,battery,primary:'blaster'}));
 const damaged=JSON.stringify({version:1,hull:'rift-fighter',condition:'damaged'});
 const q=managed(api,{savedBuild:originalFit,savedHull:damaged,wallNow:()=>now,address:{search:'?hangar=carrier',replace(){}}});
 assert.equal(q.el['hangar-damaged-bay'].hidden,false);
 assert.equal(q.el['hangar-player-loadout'].hidden,true);
 q.click('fit-repair-hull');
 now+=240000;q.step();
 assert.equal(q.el['hangar-player-loadout'].hidden,false);
 assert.equal(q.el['fit-engine'].value,stock);
 assert.equal(q.el['fit-core'].value,core);
 assert.equal(q.el['fit-battery'].value,battery);
 assert.equal(q.el['fit-primary'].value,'blaster');
 assert.match(summary(q),/Flight ready/);
 assert.equal(q.storage.get(key),originalFit);
});

test('damaged picture on an existing owned ship offers one-tap Hangar repair with no redirect',()=>{
 let now=100000;
 const api=services({items:[stock,core,battery,'blaster']}),wallet=api.getBuildState();
 const fit=JSON.stringify(build({engine:stock,core,battery,primary:'blaster'}));
 const savedHull=JSON.stringify({version:1,hull:'rift-fighter',condition:'repaired'});
 const q=managed(api,{savedBuild:fit,savedHull,wallNow:()=>now,address:{search:'?hangar=carrier',replace(){assert.fail('repair must stay in the Hangar');}}});
 assert.equal(q.el['fit-repair-direct'].hidden,false);
 q.click('fit-repair-direct');
 assert.equal(q.el.hangar.open,true);
 assert.match(summary(q),/4:00 remaining/);
 assert.equal(q.el['fit-repair-progress-wrap'].hidden,false);
 assert.equal(q.el['hangar-damaged-bay'].hidden,false);
 assert.equal(q.el['fit-repair-direct'].hidden,true);
 const pending=q.storage.get(hullKey);
 now+=120000;q.step();q.click('fit-repair-direct');
 assert.equal(q.storage.get(hullKey),pending);
 assert.equal(q.el['fit-repair-progress'].value,50);
 now+=120000;q.step(20);
 assert.equal(q.el['hangar-fighter-art'].getAttribute('src'),'./fighter-winged.png?v=23');
 assert.equal(q.el['fit-repair-direct'].hidden,true);
 assert.equal(q.storage.get(key),fit);
 assert.deepEqual(api.getBuildState(),wallet);
});

test('repeated fitting keeps the hull visible and does not reload the picture',()=>{
 let now=100000;
 const q=managed(services({items:[stock,core,battery,'blaster']}),{wallNow:()=>now});
 choose(q);q.click('fit-claim-hull');q.click('fit-repair-hull');now+=240000;q.step();
 const art=q.el['hangar-fighter-art'],src=art.getAttribute('src');
 assert.equal(src,'./fighter-winged.png?v=23');
 let writes=0;
 const original=art.setAttribute;
 art.setAttribute=function(k,v){if(k==='src')writes++;original.call(this,k,v);};
 for(let i=0;i<3;i++){
  q.fit('engine',stock);assert.equal(q.el['hangar-test-engine'].disabled,false);
  q.fit('core',core);q.fit('battery',battery);q.fit('primary','blaster');
  q.fit('primary','');q.fit('battery','');q.fit('core','');q.fit('engine','');
  assert.equal(q.el['hangar-test-engine'].disabled,true);
  assert.equal(q.el['hangar-repaired-bay'].hidden,false);
  assert.equal(art.getAttribute('src'),src);
 }
 assert.equal(writes,0);
});
