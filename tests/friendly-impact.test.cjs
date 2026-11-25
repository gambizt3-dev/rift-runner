'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const dir=['../dist','..'].map(d=>path.join(__dirname,d)).find(d=>fs.existsSync(path.join(d,'game.js')));
const source=fs.readFileSync(path.join(dir,'game.js'),'utf8');
const extract=(first,end)=>source.slice(source.indexOf(first),source.indexOf(end,source.indexOf(first)));
const program=[
 extract('function burstRing(', 'const clashLife='),
 extract('function sweptCircle(', '// Optics are separate'),
 extract('const clashRadius=','const wingmanLeash=')
].join('\n');
const ship=(x,other={})=>({x,y:0,prevX:x,prevY:0,r:10,hp:24,...other});
function run({carrier=null,corvette=null,hostile=[],friends=[],opponents=[],vanduls=[],shot=true,motion=false}={}){
 const shots=shot?[{x:0,y:0,vx:100,vy:0,damage:7}]:[];
 const c={capitalShip:carrier,escortShip:null,carrierHullOwner:new Map(carrier?.hull?.map(part=>[part,carrier])),
  shots,vandulLasers:hostile,sparks:[],rings:[],rangeTargets:[],pirateCapitals:[],vanduls,elapsed:10,state:'play',
  battleResolute:()=>corvette,livingAllies:()=>friends,isFourWayBattle:()=>false,releaseProjectileVoice(){},fittedShield:()=>null,
  hitWithPlayerShot(b,target){target.hp-=b.damage;b.spent=true;},hitWithVandulLaser(b,target){target.hp-=b.damage;b.life=0;},
  p:ship(175),wingman:null,testLead:null,guns:{},arena:{left:-10,right:400,top:-50,bottom:50},motion:{matches:motion},resoluteFlightLength:100,opponents};
 vm.runInNewContext(program+';sweepProjectiles(1,opponents,[]);',c);
 return c;
}
test('Pegasus and Resolute block the shot at the hull, add amber sparks, and keep HP',()=>{
 const hit=ship(40,{capitalHull:true}),carrier={hp:360,hull:[hit]};
 const pegasus=run({carrier});
 assert.equal(pegasus.shots.length,0);assert.equal(carrier.hp,360);
 assert.ok(Math.abs(pegasus.rings[0].x-28)<1e-8);assert.equal(pegasus.rings[0].colour,'#ffc57d');
 assert.equal(pegasus.sparks.length,7);
 const corvette=ship(80,{aegis:{hp:0,until:0,readyAt:30}});corvette.hullSections=[ship(80,{resoluteHull:corvette})];
 const resolute=run({corvette,motion:true});
 assert.equal(resolute.shots.length,0);assert.equal(corvette.hp,24);
 assert.equal(resolute.rings[0].x,68);assert.equal(resolute.sparks.length,3);
});
test('friendly Aegis flashes blue without draining hull or shield',()=>{
 const corvette=ship(80);corvette.hullSections=[ship(80,{resoluteHull:corvette})];
 const result=run({corvette});
 assert.equal(result.shots.length,0);assert.equal(corvette.hp,24);assert.equal(corvette.aegis.hp,25);
 assert.equal(result.rings[0].colour,'#79efff');
});
test('allied wingman blocks player fire before the enemy behind them',()=>{
 const friend=ship(35),enemy=ship(65);
 const result=run({friends:[friend],opponents:[enemy]});
 assert.equal(result.shots.length,0);assert.equal(friend.hp,24);assert.equal(enemy.hp,24);assert.equal(result.rings[0].x,23);
 assert.equal(run({opponents:[enemy]}).shots.length,0);assert.equal(enemy.hp,17);
});
test('opposing NPCs also block fire from their own faction without taking damage',()=>{
 const source=ship(0,{vandul:true}),teammate=ship(38,{vandul:true});
 const result=run({shot:false,vanduls:[source,teammate],hostile:[{x:0,y:0,vx:100,vy:0,life:2,damage:8,owner:source}]});
 assert.equal(teammate.hp,24);assert.equal(result.vandulLasers.length,0);
 assert.equal(result.rings[0].colour,'#ffc57d');
});
