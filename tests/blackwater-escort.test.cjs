'use strict';
const {readFileSync}=require('node:fs');
const {runInNewContext}=require('node:vm');
const assert=require('node:assert/strict');
const test=require('node:test');
const game=readFileSync(new URL('../game.js', 'file:'+__filename),'utf8');
const html=readFileSync(new URL('../index.html', 'file:'+__filename),'utf8');
function run(mode='free-flight'){
 const calls=[],pegasusCapital={},gradient={addColorStop(){}};
 const sandbox={blackwaterLandingAction:null,blackwaterLandingCancel:null,pegasusCapital,flightMode:{id:mode,crosswindVisit:true},withinCamera:()=>true,window:{Image:class{complete=true;naturalWidth=210;}},
  g:{save(){},restore(){},translate(){},rotate(){},fillRect(){},fillText(){},createLinearGradient(){return gradient;},drawImage(...args){calls.push(args);}}};
 runInNewContext(readFileSync(new URL("../frigate-hulls.js","file:"+__filename),"utf8"),sandbox);
 runInNewContext(game.slice(game.indexOf('function berthWorld('),game.indexOf('function berthLocal('))+
  game.slice(game.indexOf('const crosswindFlightCourse='),game.indexOf('let resoluteArt,'))+
  '\nObject.assign(globalThis,{blackwaterFleetPose,paintBlackwaterEscort});',sandbox);
 return {calls,sandbox,carrier:{vessel:pegasusCapital,phase:'flight',stream:{},x:300,y:550,aim:-Math.PI/2}};
}
test('Independent Crosswind encounter geometry stays in its own lane',()=>{
 assert.match(game,/mode\('free-flight','Free Flight',bifrost\?bifrostFreeFlight:freeFlight,'Launch into the Battle Fleet Map/);
 assert.match(game,/paintAtOpacity\(fleet\.corvette,paintResolute[^\n]+\n[^\n]+paintBlackwaterEscort/);
 assert.match(html,/game\.js\?v=red-grin-loop-1/);
 const {sandbox:s,calls,carrier}=run();
 for(const t of [0,1,15,80]){
  carrier.distance=38*t;const a=s.blackwaterFleetPose(carrier,t);
  assert.ok(a.x>=882&&a.x<=894);
  assert.ok(Math.abs(a.heading)<.04);
  s.paintBlackwaterEscort(carrier,t,{});
 }
 assert.equal(calls.length,4);
 assert.equal(calls[0][0].src,'./blackwater-frigate.webp');assert.equal(calls[0][4],350);
 assert.deepEqual(Object.keys(s.blackwaterFleetPose(carrier,0)).sort(),['heading','x','y']);
 const north=s.blackwaterFleetPose(carrier,10); carrier.aim=0;carrier.x+=100;carrier.y+=200;
 const east=s.blackwaterFleetPose(carrier,10);
 assert.deepEqual(east,north,'contact does not turn or reposition with Pegasus');
});
test('Crosswind encounter geometry stays off ordinary fleet flight and missions',()=>{
 const {sandbox:s,carrier}=run();
 for(const patch of [{stream:null},{testCarrier:true},{transfer:{}},{phase:'docked'}]){
  assert.equal(s.blackwaterFleetPose({...carrier,...patch},1),null);
 }
 const mission=run('pirate-sortie');
 const pegasus=run();pegasus.sandbox.flightMode.crosswindVisit=false;assert.equal(pegasus.sandbox.blackwaterFleetPose(pegasus.carrier,1),null);pegasus.sandbox.paintBlackwaterEscort(pegasus.carrier,1,{});assert.equal(pegasus.calls.length,0);
 assert.equal(mission.sandbox.blackwaterFleetPose(mission.carrier,1),null);
 assert.ok(mission.sandbox.blackwaterFleetPose({...mission.carrier,roundTripReturned:true},1));
});

test('only the assigned approach pad gets four blinking lights, or four steady lights with reduced motion',()=>{
 const arcs=[],call={labels:[],angles:[]};
 const ctx={capitalShip:{blackwaterLanding:{phase:'approach',pad:2}},blackwaterLandingTarget:()=>true,
  blackwaterFleetPose:()=>({heading:.4}),berthWorld:()=>({x:5,y:7}),crosswindPadX:-2,blackwaterLandingPads:[-71,-5,63,100],
  withinCamera:()=>true,TAU:2*Math.PI,motion:{matches:false}};
 ctx.g={globalAlpha:1,save(){},restore(){this.globalAlpha=1;},translate(){},rotate(a){call.angles.push(a);},beginPath(){},
  arc(x,y,r){arcs.push([x,y,r,this.globalAlpha]);},fill(){},stroke(){},fillText(n){call.labels.push(n);}};
 runInNewContext(game.slice(game.indexOf('function paintBlackwaterLandingGuide('),game.indexOf('function paintBlackwaterEscort('))+'\nglobalThis.paint=paintBlackwaterLandingGuide;',ctx);
 ctx.paint(0,{});assert.equal(arcs.filter(a=>a[2]===2.65&&a[3]===1).length,4);assert.equal(call.angles[0],.4);assert.equal(call.labels[0],'3');
 arcs.length=0;ctx.paint(.5/1.1,{});assert.equal(arcs.filter(a=>a[2]===2.65&&a[3]===.23).length,4);
 arcs.length=0;ctx.motion.matches=true;ctx.paint(.5/1.1,{});assert.equal(arcs.filter(a=>a[2]===2.65&&a[3]===1).length,4);
 arcs.length=0;ctx.capitalShip.blackwaterLanding.phase='docked';ctx.paint(0,{});assert.equal(arcs.length,0);
});
