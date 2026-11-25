'use strict';
const {readFileSync}=require('node:fs');
const {runInNewContext}=require('node:vm');
const assert=require('node:assert/strict');
const test=require('node:test');
const game=readFileSync(new URL('../game.js', 'file:'+__filename),'utf8');
const html=readFileSync(new URL('../index.html', 'file:'+__filename),'utf8');
function run(mode='free-flight'){
 const calls=[],pegasusCapital={},gradient={addColorStop(){}};
 const sandbox={blackwaterLandingAction:null,blackwaterLandingCancel:null,pegasusCapital,flightMode:{id:mode},withinCamera:()=>true,window:{Image:class{complete=true;naturalWidth=210;}},
  g:{save(){},restore(){},translate(){},rotate(){},fillRect(){},createLinearGradient(){return gradient;},drawImage(...args){calls.push(args);}}};
 runInNewContext(game.slice(game.indexOf('function berthWorld('),game.indexOf('function berthLocal('))+
  game.slice(game.indexOf('const blackwaterFlightLength='),game.indexOf('let resoluteArt,'))+
  '\nObject.assign(globalThis,{blackwaterFleetPose,paintBlackwaterEscort});',sandbox);
 return {calls,sandbox,carrier:{vessel:pegasusCapital,phase:'flight',stream:{},x:300,y:550,aim:-Math.PI/2}};
}
test('Pegasus Battle Fleet Map adds a visual-only starboard frigate in the Resolute render layer',()=>{
 assert.match(game,/mode\('free-flight','Free Flight',bifrost\?bifrostFreeFlight:freeFlight,'Launch into the Battle Fleet Map/);
 assert.match(game,/paintAtOpacity\(fleet\.corvette,paintResolute[^\n]+\n[^\n]+paintAtOpacity\(fleet\.corvette,paintBlackwaterEscort/);
 assert.match(html,/game\.js\?v=blackwater-4/);
 const {sandbox:s,calls,carrier}=run();
 for(const t of [0,1,15,80]){
  const a=s.blackwaterFleetPose(carrier,t);
  assert.ok(a.x-carrier.x>=168&&a.x-carrier.x<=180);
  assert.ok(Math.abs(a.heading)<.04);
  s.paintBlackwaterEscort(carrier,t,{});
 }
 assert.equal(calls.length,4);
 assert.equal(calls[0][0].src,'./blackwater-frigate.webp');assert.equal(calls[0][4],350);
 assert.deepEqual(Object.keys(s.blackwaterFleetPose(carrier,0)).sort(),['heading','x','y']);
 const north=s.blackwaterFleetPose(carrier,10); carrier.aim=0;
 const east=s.blackwaterFleetPose(carrier,10);
 assert.ok(Math.abs(east.y-carrier.y-(north.x-carrier.x))<1e-6);
});
test('same visual escort resumes on actual fleet return; no escort on other carriers or missions',()=>{
 const {sandbox:s,carrier}=run();
 for(const patch of [{vessel:{}},{stream:null},{testCarrier:true},{transfer:{}},{phase:'docked'}]){
  assert.equal(s.blackwaterFleetPose({...carrier,...patch},1),null);
 }
 const mission=run('pirate-sortie');
 assert.equal(mission.sandbox.blackwaterFleetPose(mission.carrier,1),null);
 assert.ok(mission.sandbox.blackwaterFleetPose({...mission.carrier,roundTripReturned:true},1));
});
