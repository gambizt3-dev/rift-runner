'use strict';
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const path=require('node:path');
const test=require('node:test');
const vm=require('node:vm');
const source=readFileSync(path.join(__dirname,'../dist/game.js'),'utf8');
const a=source.indexOf('function paintBattleHullLayers('),b=source.indexOf('function draw(t)',a);
function order({capitalShip=null,escortShip=null,corvette=null,pirateCapitals=[]}={}){
 const calls=[];
 const trace=(name,get=()=>name)=>(...args)=>calls.push(get(...args));
 vm.runInNewContext(source.slice(a,b)+'\npaintBattleHullLayers(0,{});',{
  capitalShip,escortShip,pirateCapitals,duelEnabled:false,battleResolute:()=>corvette,
  paintCrossVessel:trace('support',ship=>ship.name),paintCapital:trace('carrier'),
  paintFlightGuide:trace('guide'),paintEscort:trace('orion'),
  paintResolute:trace('corvette',ship=>ship===capitalShip?'formation Resolute':'battle Resolute'),
  paintBlackwake:trace('pirate',(_,ship)=>ship.name),
  paintCapitalApproach:trace('docking markers'),paintSortieGate:trace('exit marker')
 });
 return calls;
}
test('fleet hull order is carriers first, Resolute in the middle, vessels on top, then docking markers',()=>{
 assert.deepEqual(order({capitalShip:{supportFleet:{name:'support carrier'}},pirateCapitals:[{name:'Blackwake'}]}),
 ['support carrier','carrier','formation Resolute','Blackwake','docking markers','exit marker']);
 assert.deepEqual(order({corvette:{},pirateCapitals:[{name:'Blackwake'}]}),['guide','battle Resolute','Blackwake']);
});
test('fighter art is drawn later in the foreground, and Orion remains in the shared vessel tier',()=>{
 assert.deepEqual(order({escortShip:{},pirateCapitals:[]}),['orion']);
 const draw=source.slice(b,source.indexOf('function paintOnlineBattle(',b));
 const layer=draw.indexOf('paintBattleHullLayers(t,camera);');
 assert.ok(layer>=0);
 for(const paint of ['paintVandul(rival,t)','paintOnlineBattle(camera)','paintWingman(testLead)','paintHover(missionDeparture?.craft??p,t)'])
  assert.ok(draw.indexOf(paint)>layer,paint);
});
