'use strict';
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const path=require('node:path');
const test=require('node:test');
const vm=require('node:vm');
const source=readFileSync(path.join(__dirname,'../dist/game.js'),'utf8');
const a=source.indexOf('function armadaVisibility('),b=source.indexOf('function draw(t)',a);
function order({capitalShip=null,escortShip=null,corvette=null,pirateCapitals=[],hazeOpacity=1}={}){
 const calls=[];
 const g={globalAlpha:1,save(){this.old=this.globalAlpha;},restore(){this.globalAlpha=this.old;}};
 const trace=(name,get=()=>name)=>(...args)=>{
  const label=get(...args);
  calls.push(label+(g.globalAlpha<1?' α'+g.globalAlpha:''));
 };
 vm.runInNewContext(source.slice(a,b)+'\npaintBattleHullLayers(0,{},hazeOpacity);',{
  hazeOpacity,g,
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
 const layer=draw.indexOf('paintBattleHullLayers(t,camera,hazeOpacity,fleet);');
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
 const window={x:-520,y:-510,w:1500,h:1550};
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
 // Across phone-sized views, clear space is the rule, not the exception.
 let total=0,empty=0;
 for(let y=-1700;y<=1900;y+=300)for(let x=-1500;x<=1500;x+=300){
  draws.length=0;
  const view={x,y,w:390,h:520};
  cloud(0,view,0);cloud(0,view,1);
  total+=draws.length;if(!draws.length)empty++;
 }
 assert.ok(total/143<2.15&&empty>10,'sample count '+total+' across 143 views, clear '+empty);
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
 ['carrier: original art','corvette guide','docking markers','exit marker']);
 const draw=source.slice(b,source.indexOf('function paintOnlineBattle(',b));
 assert.match(draw,/const hazeOpacity=dockZoomHazeOpacity\(capitalShip,t\),fleet=armadaVisibility\(capitalShip,hazeOpacity\);/);
 assert.equal([...draw.matchAll(/paintFlightSpace\(camera,hazeOpacity\)/g)].length,2);
 assert.match(source,/if\(hazeOpacity>0\)for\(const \{x,y,r,core,edge\} of chunk\.haze\)/);
 assert.match(source,/const graded=hazeOpacity>0\?capitalDepthSprite\(art\):art/);
});

test('carrier haze follows the same lift curve as camera zoom throughout takeoff and landing',()=>{
 const begin=source.indexOf('function dockZoomHazeOpacity('),lift=source.indexOf('function berthLift(');
 const motion={matches:false};
 const smoothBerth=x=>{const y=Math.min(1,Math.max(0,x));return y*y*(3-2*y);};
 let locked=true;
 const fade=vm.runInNewContext(source.slice(lift,source.indexOf('function storageProgress(',lift))+source.slice(begin,source.indexOf('function draw(t)',begin))+'\ndockZoomHazeOpacity',{
  motion,smoothBerth,capitalLocked:()=>locked,capitalBerth:{liftSeconds:.57,dockSeconds:2.45,lowerSeconds:.66},
  resolutePad:{launch:1,capture:1}
 });
 const cam=source.slice(source.indexOf('function flightCamera('),source.indexOf('const fighterSprite='));
 assert.match(cam,/1-berthLift\(capitalShip\)/);
 const ship={phase:'docked'};
 assert.equal(fade(null,0),1);assert.equal(fade(ship,0),0);
 Object.assign(ship,{phase:'launching',berthMove:{time:0}});
 assert.equal(fade(ship,3),0);
 ship.berthMove.time=.285;
 assert.equal(fade(ship,3.285),.5,'mist is halfway back halfway through the zoom');
 assert.deepEqual(order({capitalShip:{},hazeOpacity:.5}),
 ['carrier','cloud 0 @ 0.5','formation Resolute α0.5','cloud 1 @ 0.5','corvette guide','docking markers','exit marker']);
 ship.berthMove.time=.57;
 assert.equal(fade(ship,3.57),1,'zoom completion restores mist before flight controls are returned');
 ship.phase='docking';ship.berthMove.time=2.12;
 assert.ok(Math.abs(fade(ship,4)-.5)<1e-9);
 ship.phase='flight';ship.resoluteDock={phase:'launching',at:5,fromStored:true};
 assert.equal(fade(ship,5.5),0);
 assert.ok(Math.abs(fade(ship,5.84)-.5)<1e-9);
 motion.matches=true;
 assert.equal(fade(ship,5.84),0);locked=false;assert.equal(fade(ship,6),1);
});

test('other Armada hulls phase in together while the ship holding the player remains solid',()=>{
 const supportFleet={name:'support'};
 const carrier={supportFleet};
 assert.deepEqual(order({capitalShip:carrier,hazeOpacity:.5}),
 ['support α0.5','carrier','cloud 0 @ 0.5','formation Resolute α0.5','cloud 1 @ 0.5','corvette guide','docking markers','exit marker']);
 const corvetteDock={supportFleet,resoluteDock:{phase:'docked'}};
 assert.deepEqual(order({capitalShip:corvetteDock,hazeOpacity:0}),
 ['formation Resolute','corvette guide','docking markers','exit marker']);
 const draw=source.slice(b,source.indexOf('function paintOnlineBattle(',b));
 assert.match(draw,/paintAtOpacity\(fleet\.support,paintCapitalHullStatus/);
 assert.match(draw,/paintDamageSmoke\(camera,t,fleet\)/);
});
