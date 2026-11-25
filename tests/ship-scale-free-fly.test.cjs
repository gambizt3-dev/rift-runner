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
 const {carrier,frigate,corvette,hulls,pads}=lineup;
 const {lengths,widths,factors}=lineup;
 assert.equal(carrier.vessel.name,'Pegasus');
 const visibleLength=58.24*266/320,visibleWidth=87.36*394/480;
 for(const [i,[len,beam]] of [[605,278],[255,54],[137,37]].entries()){
  assert.ok(Math.abs(lengths[i]/visibleLength-len/29)<1e-9);
  assert.ok(Math.abs(widths[i]/visibleWidth-beam/44)<1e-9);
  assert.ok(Math.abs([carrier,frigate,corvette][i].y+factors[i].stern*factors[i].y-1420)<1e-9);
 }
 assert.equal(hulls.length,3);assert.equal(start.pirateCapitals.length,0);
 q.click('flight-view-fleet');q.click('flight-view-focus');assert.equal(q.inspect().camera.zoom,1);
 const originalX=p.x;
 q.key('keydown','KeyD');q.step(65);q.key('keyup','KeyD');
 assert.ok(p.x>originalX+20);assert.equal(q.inspect().camera.zoom,1);
 q.click('fire-button');assert.equal(q.inspect().shots.length,0);
 p.x=hulls[0][2].x;p.y=hulls[0][2].y;p.vx=0;p.vy=0;q.step(2);
 assert.ok(Math.hypot(p.x-hulls[0][2].x,p.y-hulls[0][2].y)>50);assert.equal(p.hp,p.maxHp);
 q.step();
 assert.ok(q.sprites.some(i=>i.src?.includes('carrier-capital.webp')));
 assert.ok(q.sprites.some(i=>i.src?.includes('blackwater-frigate.webp')));
 Object.assign(p,{x:pads.at(-1).x,y:pads.at(-1).y,vx:0,vy:0});q.step();
 assert.ok(q.sprites.some(i=>i.src?.includes('corvette-rift4-scale-v6.webp')));
 assert.deepEqual([0,1,2].map(group=>pads.filter(pad=>pad.group===group).length),[4,4,1]);
 for(const pad of pads.filter(p=>p.group===1)){
  assert.ok(pad.parkedScale>=.55&&pad.parkedScale<.76);
  assert.ok(pad.width>1.8*pad.nativeWidth);
 }
 for(const pad of pads){assert.ok(pad.width+1e-8>=visibleWidth*pad.parkedScale+3);assert.ok(pad.height+1e-8>=visibleLength*pad.parkedScale+3);}
 for(const [i,a] of pads.entries())for(const b of pads.slice(i+1))if(a.group===b.group)
  assert.ok(Math.abs(a.x-b.x)>=(a.width+b.width)/2||Math.abs(a.y-b.y)>=(a.height+b.height)/2,'pads do not overlap');
 for(const key of ['pilot-credits','hull-owned','mission-log','fighter-parking'])assert.ok(![...storage.keys()].some(k=>k.includes(key)));
});

test('real Hangar mode lands and relaunches Rift-3 on each large ship with deck-specific shrink only on touchdown and fixed zoom',()=>{
 const q=setup({redGrinSim:true,cockpitUI:true,flightShell:true,buildUI:true,reducedMotion:true,sprite:true,initialHe3:0,
  sharedStorage:new Map(),address:{search:'?hangar=carrier&vessel=rift-carrier',hostname:'rift.example',origin:'https://rift.example'}});
 q.click('hangar-scale-free-fly');
 const {p,scaleFlyShips}=q.inspect(),button=q.el['scale-fly-land'];
 const fighter=q.sprites.find(asset=>asset.src?.includes('fighter-winged.png'));
 fighter.complete=true;fighter.naturalWidth=760;
 const paintWidth=()=>q.spriteFrames.filter(frame=>frame.asset===fighter).at(-1).bounds[2];
 q.step(2);const fullWidth=paintWidth();
 const initial=[p.fighter,p.r,q.inspect().riftFourFlightLength,q.inspect().camera.zoom];
 for(const group of [0,1,2]){
  const pad=scaleFlyShips.pads.find(x=>x.group===group);
  Object.assign(p,{x:pad.x,y:pad.y,vx:0,vy:0});q.step(4);
  assert.equal(button.hidden,false);assert.match(button.textContent,new RegExp('Land · '+pad.name));
  q.click('scale-fly-land');assert.equal(scaleFlyShips.parked,pad);assert.equal(button.textContent,'Launch');
  q.key('keydown','KeyD');q.step(16);q.key('keyup','KeyD');
  assert.equal(paintWidth(),fullWidth*pad.parkedScale);
  assert.equal(p.x,pad.x);assert.equal(p.y,pad.y);
  assert.deepEqual([p.fighter,p.r,q.inspect().riftFourFlightLength,q.inspect().camera.zoom],initial);
  q.click('scale-fly-land');q.step(4);
  assert.equal(scaleFlyShips.parked,null);
  assert.equal(paintWidth(),fullWidth);
  assert.ok(p.y<pad.y);
 }
});

test('fleet overview snaps out and back without changing world size or fighter state',()=>{
 const q=setup({redGrinSim:true,cockpitUI:true,flightShell:true,buildUI:true,reducedMotion:true,initialHe3:0,
  canvasBox:{width:390,height:608},sharedStorage:new Map(),
  address:{search:'?hangar=carrier&vessel=rift-carrier',hostname:'rift.example',origin:'https://rift.example'}});
 q.click('hangar-scale-free-fly');
 const {p,scaleFlyShips:lineup,camera,arena}=q.inspect(),before=[p.x,p.y,p.r,...lineup.lengths,...lineup.widths];
 q.click('scale-fly-overview');const out=q.inspect().camera;
 assert.ok(out.zoom<1);
 assert.ok(out.zoom>camera.w/(arena.right+12),'tight overview frames the ships, not the whole board');
 const {left,right,top,bottom}=lineup.overview;
 assert.ok(out.x<=left+1e-8&&out.y<=top+1e-8&&out.x+out.w+1e-8>=right&&out.y+out.h+1e-8>=bottom);
 assert.deepEqual([p.x,p.y,p.r,...lineup.lengths,...lineup.widths],before);
 assert.equal(q.el['scale-fly-overview'].textContent,'Back to fighter');
 q.click('scale-fly-overview');assert.deepEqual(q.inspect().camera,camera);
});
