const test=require('node:test'),assert=require('node:assert/strict');
const {setup}=require('./ballistic.test.cjs');

test('Hangar launches a no-save Rift-3 on the same fixed scale as all three ships',()=>{
 const storage=new Map();
 const q=setup({redGrinSim:true,cockpitUI:true,flightShell:true,buildUI:true,reducedMotion:true,sprite:true,initialHe3:0,
  sharedStorage:storage,address:{search:'?hangar=carrier&vessel=rift-carrier',hostname:'rift.example',origin:'https://rift.example'}});
 q.click('hangar-scale-free-fly');
 const start=q.inspect(),{p,scaleFlyShips:lineup,riftFourFlightLength,capitalCourse,resoluteFlightLength}=start;
 assert.equal(start.flightMode.id,'scale-free-fly');assert.equal(start.flightMode.loaner,'rift-fighter');
 assert.equal(start.flightMode.hull,'none');assert.equal(start.flightMode.credits,false);
 assert.equal(q.el['scale-fly-readout'].hidden,false);
 assert.equal(q.el['flight-view'].hidden,true);
 const {carrier,frigate,corvette,hulls}=lineup;
 assert.equal(carrier.vessel.name,'Pegasus');
 assert.equal(carrier.y+capitalCourse.height/2,836);
 assert.equal(frigate.y+350/2,836);
 assert.equal(corvette.y+resoluteFlightLength/2,836);
 assert.ok(capitalCourse.height>350&&350>resoluteFlightLength&&resoluteFlightLength>riftFourFlightLength);
 assert.equal(hulls.length,3);assert.equal(start.pirateCapitals.length,0);
 q.click('flight-view-fleet');q.click('flight-view-focus');assert.equal(q.inspect().camera.zoom,1);
 const originalX=p.x;
 q.key('keydown','KeyD');q.step(65);q.key('keyup','KeyD');
 assert.ok(p.x>originalX+20);assert.equal(q.inspect().camera.zoom,1);
 q.click('fire-button');assert.equal(q.inspect().shots.length,0);
 p.x=hulls[0][2].x;p.y=hulls[0][2].y;p.vx=0;p.vy=0;q.step(2);
 assert.ok(Math.hypot(p.x-hulls[0][2].x,p.y-hulls[0][2].y)>50);assert.equal(p.hp,p.maxHp);
 assert.ok(q.sprites.some(i=>i.src?.includes('carrier-capital.webp')));
 assert.ok(q.sprites.some(i=>i.src?.includes('blackwater-frigate.webp')));
 assert.ok(q.sprites.some(i=>i.src?.includes('corvette-rift4-scale-v6.webp')));
 for(const key of ['pilot-credits','hull-owned','mission-log','fighter-parking'])assert.ok(![...storage.keys()].some(k=>k.includes(key)));
});
