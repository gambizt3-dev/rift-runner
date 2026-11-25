'use strict';
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const path=require('node:path');
const test=require('node:test');
const vm=require('node:vm');
const source=readFileSync(path.join(__dirname,'../dist/game.js'),'utf8');
const a=source.indexOf('function paintBattleHullLayers('),b=source.indexOf('function draw(t)',a);
function order({capitalShip=null,escortShip=null,corvette=null,pirateCapitals=[],hazeOpacity=1}={}){
 const calls=[];
 const trace=(name,get=()=>name)=>(...args)=>calls.push(get(...args));
 vm.runInNewContext(source.slice(a,b)+'\npaintBattleHullLayers(0,{},hazeOpacity);',{
  hazeOpacity,
  capitalShip,escortShip,pirateCapitals,duelEnabled:false,battleResolute:()=>corvette,
  paintCrossVessel:trace('support',ship=>ship.name),paintCapital:trace('carrier',(_,__,___,opacity)=>opacity===0?'carrier: original art':'carrier'),
  paintFlightGuide:trace('guide'),paintEscort:trace('orion'),
  paintResolute:trace('corvette',ship=>ship===capitalShip?'formation Resolute':'battle Resolute'),
  paintBattleCloudBand:trace('cloud',(_,__,band,opacity)=>'cloud '+band+(opacity<1?' @ '+opacity:'')),
  paintBlackwake:trace('pirate',(_,ship)=>ship.name),
  paintResoluteDockGuide:trace('corvette guide'),paintCapitalApproach:trace('docking markers'),paintSortieGate:trace('exit marker')
 });
 return calls;
}
test('fleet hull order is carriers first, Resolute in the middle, vessels on top, then docking markers',()=>{
 assert.deepEqual(order({capitalShip:{supportFleet:{name:'support carrier'}},pirateCapitals:[{name:'Blackwake'}]}),
 ['support carrier','carrier','cloud 0','formation Resolute','cloud 1','Blackwake','corvette guide','docking markers','exit marker']);
 assert.deepEqual(order({corvette:{},pirateCapitals:[{name:'Blackwake'}]}),['guide','cloud 0','battle Resolute','cloud 1','Blackwake']);
});
test('fighter art is drawn later in the foreground, and Orion remains in the shared vessel tier',()=>{
 assert.deepEqual(order({escortShip:{},pirateCapitals:[]}),['cloud 0','cloud 1','orion']);
 const draw=source.slice(b,source.indexOf('function paintOnlineBattle(',b));
 const layer=draw.indexOf('paintBattleHullLayers(t,camera,hazeOpacity);');
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

test('carrier atmospheric grade is cached and tint stays inside the hull alpha',()=>{
 const begin=source.indexOf('const capitalDepthArt='),end=source.indexOf('function paintCapital(t,camera',begin);
 const art={naturalWidth:600,naturalHeight:900},calls=[];
 const ctx={drawImage(...args){calls.push(['art',...args]);},
  fillRect(...args){calls.push(['tint',this.globalCompositeOperation,this.fillStyle,...args]);}};
 const layer={getContext:()=>ctx};
 const grade=vm.runInNewContext(source.slice(begin,end)+'\ncapitalDepthSprite',{
  canvas:{ownerDocument:{createElement:()=>layer}}
 });
 assert.equal(grade(art),layer);
 assert.equal(grade(art),layer);
 assert.deepEqual(calls,[['art',art,0,0,347,520],['tint','source-atop','#59789359',0,0,347,520]]);
});

test('the docking camera keeps hulls and guides but renders neither haze band nor the carrier color grade',()=>{
 assert.deepEqual(order({capitalShip:{},hazeOpacity:0}),
 ['carrier: original art','formation Resolute','corvette guide','docking markers','exit marker']);
 const draw=source.slice(b,source.indexOf('function paintOnlineBattle(',b));
 assert.match(draw,/const hazeOpacity=departureHazeOpacity\(t,capitalLocked\(\)\);/);
 assert.equal([...draw.matchAll(/paintFlightSpace\(camera,hazeOpacity\)/g)].length,2);
 assert.match(source,/if\(hazeOpacity>0\)for\(const \{x,y,r,core,edge\} of chunk\.haze\)/);
 assert.match(source,/const graded=hazeOpacity>0\?capitalDepthSprite\(art\):art/);
});

test('departing the clear dock eases both drifting bands back in on flight time',()=>{
 const begin=source.indexOf('const departureHazeSeconds=');
 const fade=vm.runInNewContext(source.slice(begin,source.indexOf('function draw(t)',begin))+'\ndepartureHazeOpacity');
 assert.equal(fade(0,false),1,'an already airborne scene starts at full mist');
 assert.equal(fade(3,true),0);
 assert.equal(fade(6,true),0,'last moment of launch stays clear');
 assert.equal(fade(8,false),0,'first free-flight frame does not flash');
 const middle=fade(8.7,false);
 assert.ok(Math.abs(middle-.5)<1e-9);
 assert.equal(fade(8.7,false),middle,'paused flight preserves the transition');
 assert.equal(fade(9.5,false),1);
 assert.deepEqual(order({capitalShip:{},hazeOpacity:.5}),
 ['carrier','cloud 0 @ 0.5','formation Resolute','cloud 1 @ 0.5','corvette guide','docking markers','exit marker']);
 assert.equal(fade(10,true),0);
 assert.equal(fade(11,false),0);
 assert.equal(fade(0,false),1,'a reset airborne scene does not inherit a prior fade');
});
