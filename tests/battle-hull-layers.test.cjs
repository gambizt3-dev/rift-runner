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
  paintBattleCloudBand:trace('cloud',(_,__,band)=>'cloud '+band),
  paintBlackwake:trace('pirate',(_,ship)=>ship.name),
  paintCapitalApproach:trace('docking markers'),paintSortieGate:trace('exit marker')
 });
 return calls;
}
test('fleet hull order is carriers first, Resolute in the middle, vessels on top, then docking markers',()=>{
 assert.deepEqual(order({capitalShip:{supportFleet:{name:'support carrier'}},pirateCapitals:[{name:'Blackwake'}]}),
 ['support carrier','carrier','cloud 0','formation Resolute','cloud 1','Blackwake','docking markers','exit marker']);
 assert.deepEqual(order({corvette:{},pirateCapitals:[{name:'Blackwake'}]}),['guide','cloud 0','battle Resolute','cloud 1','Blackwake']);
});
test('fighter art is drawn later in the foreground, and Orion remains in the shared vessel tier',()=>{
 assert.deepEqual(order({escortShip:{},pirateCapitals:[]}),['cloud 0','cloud 1','orion']);
 const draw=source.slice(b,source.indexOf('function paintOnlineBattle(',b));
 const layer=draw.indexOf('paintBattleHullLayers(t,camera);');
 assert.ok(layer>=0);
 for(const paint of ['paintVandul(rival,t)','paintOnlineBattle(camera)','paintWingman(testLead)','paintHover(missionDeparture?.craft??p,t)'])
  assert.ok(draw.indexOf(paint)>layer,paint);
});

test('cloud wisps bake once, drift slowly in world space, and hold still with Reduced Motion',()=>{
 const start=source.indexOf('const battleCloudBands='),draws=[],tiles=[];
 const motion={matches:false};
 const g={globalAlpha:1,save(){this.old=this.globalAlpha;},restore(){this.globalAlpha=this.old;},
  drawImage(sprite,x,y,w,h){draws.push({sprite,x,y,w,h,alpha:this.globalAlpha});}};
 const make=()=>({getContext:()=>({createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)}),
  putImageData(tile){tiles.push(tile.data);}})});
 const cloud=vm.runInNewContext(source.slice(start,a)+'\npaintBattleCloudBand',{motion,g,canvas:{ownerDocument:{createElement:make}}});
 const window={x:125,y:125,w:440,h:630};
 const sample=(t,band)=>{draws.length=0;cloud(t,window,band);return draws.slice();};
 const back=sample(0,0),front=sample(0,1);assert.ok(back.length>0&&front.length>0);
 assert.ok(Math.min(...back.map(x=>x.alpha))>Math.max(...front.map(x=>x.alpha)));
 assert.equal(g.globalAlpha,1,'other hulls must not inherit cloud opacity');
 assert.equal(tiles.length,4);
 for(const data of tiles){
  const alpha=Array.from(data).filter((_,i)=>i%4===3);
  assert.ok(Math.max(...alpha)>85);
  assert.ok(alpha.slice(0,144).every(x=>!x)&&alpha.slice(-144).every(x=>!x),'texture must fade to transparent before tile edge');
 }
 const later=sample(1,0),match=later.find(x=>x.w===back[0].w&&x.h===back[0].h);
 assert.ok(Math.abs(match.x-back[0].x-3.6)<1e-8&&Math.abs(match.y-back[0].y+1.2)<1e-8);
 motion.matches=true;
 assert.deepEqual(sample(95,0),back);
 assert.equal(tiles.length,4);
});
