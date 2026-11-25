const test=require('node:test'), assert=require('node:assert/strict');
const {setup}=require('./ballistic.test.cjs');

test('actual Hangar click launches the isolated convoy; the idle player loses and can rematch',()=>{
 const storage=new Map();
 const q=setup({redGrinSim:true,cockpitUI:true,flightShell:true,buildUI:true,initialHe3:0,reducedMotion:true,
  sharedStorage:storage,address:{search:'?hangar=carrier&vessel=rift-carrier',hostname:'rift.example',origin:'https://rift.example'}});
 q.click('hangar-red-grin-escort');
 assert.equal(q.inspect().flightMode.id,'red-grin-escort');
 assert.equal(q.inspect().pirateCapitals[0].convoy.hp,22);
 assert.equal(q.inspect().pirateCapitals[0].name,'Blackwake Raider');
 assert.equal(q.inspect().pirateCapitals[0].simShield,undefined);
 assert.match(q.el['red-grin-stage-readout'].textContent,/Escort · 0%/);
 for(let i=0;i<7500&&q.inspect().state==='play';i++)q.step();
 assert.equal(q.inspect().duelResult,'lost');assert.equal(q.inspect().pirateCapitals[0].convoy.hp,0);
 assert.match(q.el.overlay.innerHTML,/Freighter lost/);
 q.choose('reset');
 assert.equal(q.inspect().state,'play');
 assert.equal(q.inspect().pirateCapitals[0].convoy.hp,22);
 assert.equal(q.inspect().pirateCapitals[0].name,'Blackwake Raider');
 assert.equal(q.inspect().pirateCapitals[0].simShield,undefined);
 for(const key of ['pilot-credits','hull-owned','mission-log','fighter-parking'])assert.ok(![...storage.keys()].some(k=>k.includes(key)));
});

test('full arena can deliver a convoy with a living pirate after the extended run',()=>{
 const q=setup({redGrinSim:true,cockpitUI:true,flightShell:true,buildUI:true,initialHe3:0,reducedMotion:true,
  sharedStorage:new Map(),address:{search:'?hangar=carrier&vessel=rift-carrier',hostname:'rift.example',origin:'https://rift.example'}});
 q.click('hangar-red-grin-escort');
 let frames=0;
 while(frames<6400&&q.inspect().state==='play'){
  // Model a pilot staying on the far side of the freighter as it travels.
  const {p,pirateCapitals}=q.inspect(),c=pirateCapitals[0].convoy;
  p.x=c.x-110;p.y=c.y+35;p.vx=p.vy=0;
  q.step();frames++;
 }
 const final=q.inspect();
 assert.ok(frames>=47*60);
 assert.equal(final.duelResult,'victory');
 assert.ok(final.pirateCapitals[0].hp>0);
 assert.match(q.el.overlay.innerHTML,/Freighter delivered/);
});
