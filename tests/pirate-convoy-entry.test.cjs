const test=require('node:test'), assert=require('node:assert/strict');
const {setup}=require('./ballistic.test.cjs');

test('actual Hangar click launches the isolated convoy; the idle player loses and can rematch',()=>{
 const storage=new Map();
 const q=setup({redGrinSim:true,cockpitUI:true,flightShell:true,buildUI:true,initialHe3:0,reducedMotion:true,
  sharedStorage:storage,address:{search:'?hangar=carrier&vessel=rift-carrier',hostname:'rift.example',origin:'https://rift.example'}});
 q.click('hangar-red-grin-escort');
 assert.equal(q.inspect().flightMode.id,'red-grin-escort');
 assert.equal(q.inspect().pirateCapitals[0].convoy.hp,18);
 assert.match(q.el['red-grin-stage-readout'].textContent,/Escort · 0%/);
 for(let i=0;i<3000&&q.inspect().state==='play';i++)q.step();
 assert.equal(q.inspect().duelResult,'lost');assert.equal(q.inspect().pirateCapitals[0].convoy.hp,0);
 assert.match(q.el.overlay.innerHTML,/Freighter lost/);
 q.choose('reset');
 assert.equal(q.inspect().state,'play');
 assert.equal(q.inspect().pirateCapitals[0].convoy.hp,18);
 for(const key of ['pilot-credits','hull-owned','mission-log','fighter-parking'])assert.ok(![...storage.keys()].some(k=>k.includes(key)));
});
