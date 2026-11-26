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
 for(const [i,[len,beam,scale]] of [[605,278,.9],[255,54,1.875],[137,37,1.4]].entries()){
  assert.ok(Math.abs(lengths[i]/visibleLength-len*scale/29)<1e-9);
  assert.ok(Math.abs(widths[i]/visibleWidth-beam*scale/44)<1e-9);
  assert.ok(Math.abs([carrier,frigate,corvette][i].y+factors[i].stern*factors[i].y-1420)<1e-9);
 }
 assert.equal(hulls.length,3);assert.equal(start.pirateCapitals.length,0);
 assert.equal(lineup.parked.group,1);assert.equal(lineup.parked.index,4);
 assert.equal(p.x,lineup.parked.x);assert.equal(p.y,lineup.parked.y);
 q.click('scale-fly-land');q.step(4);assert.equal(lineup.parked,null);
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
  assert.ok(Math.abs(pad.width-widths[1]*50/209)<1e-9);
  assert.ok(pad.approachWidth>pad.width);
 }
 const tray=pads.find(pad=>pad.group===2),hullEdge=corvette.x+widths[2]/2;
 assert.ok(tray.height>tray.width*1.5);
 assert.ok(tray.x-tray.width/2<hullEdge&&tray.x+tray.width/2>hullEdge,'tray underlaps the hull');
 assert.equal(lineup.parkedScale,.33);
 for(const pad of pads){assert.ok(pad.width+1e-8>=visibleWidth*lineup.parkedScale+6);assert.ok(pad.height+1e-8>=visibleLength*lineup.parkedScale+6);}
 for(const [i,a] of pads.entries())for(const b of pads.slice(i+1))if(a.group===b.group)
  assert.ok(Math.abs(a.x-b.x)>=(a.width+b.width)/2||Math.abs(a.y-b.y)>=(a.height+b.height)/2,'pads do not overlap');
 for(const key of ['pilot-credits','hull-owned','mission-log','fighter-parking'])assert.ok(![...storage.keys()].some(k=>k.includes(key)));
});

test('real Hangar mode lands and relaunches Rift-3 on all nine pads with one parked size, full flight size, and fixed zoom',()=>{
 const q=setup({redGrinSim:true,cockpitUI:true,flightShell:true,buildUI:true,reducedMotion:true,sprite:true,initialHe3:0,
  sharedStorage:new Map(),address:{search:'?hangar=carrier&vessel=rift-carrier',hostname:'rift.example',origin:'https://rift.example'}});
 q.click('hangar-scale-free-fly');
 const {p,scaleFlyShips}=q.inspect(),button=q.el['scale-fly-land'];
 const fighter=q.sprites.find(asset=>asset.src?.includes('fighter-winged.png'));
 fighter.complete=true;fighter.naturalWidth=760;
 const paintWidth=()=>q.spriteFrames.filter(frame=>frame.asset===fighter).at(-1).bounds[2];
 q.click('scale-fly-land');q.step(4);const fullWidth=paintWidth();
 const initial=[p.fighter,p.r,q.inspect().riftFourFlightLength,q.inspect().camera.zoom];
 const landedWidths=[],fleetWidths=[],fleetZooms=[];
 for(const pad of scaleFlyShips.pads){
  Object.assign(p,{x:pad.x,y:pad.y,vx:0,vy:0});q.step(4);
  assert.equal(button.hidden,false);assert.match(button.textContent,new RegExp('Land · '+pad.name));
  q.click('scale-fly-land');assert.equal(scaleFlyShips.parked,pad);assert.equal(button.textContent,'Launch');
  q.key('keydown','KeyD');q.step(16);q.key('keyup','KeyD');
  assert.equal(paintWidth(),fullWidth*scaleFlyShips.parkedScale);
  landedWidths.push(paintWidth());
  q.click('scale-fly-overview');q.step();
  fleetZooms.push(q.inspect().camera.zoom);
  fleetWidths.push(paintWidth());
  q.click('scale-fly-overview');
  assert.equal(p.x,pad.x);assert.equal(p.y,pad.y);
  assert.deepEqual([p.fighter,p.r,q.inspect().riftFourFlightLength,q.inspect().camera.zoom],initial);
  q.click('scale-fly-land');q.step(4);
  assert.equal(scaleFlyShips.parked,null);
  assert.equal(paintWidth(),fullWidth);
  assert.ok(p.y<pad.y);
 }
 assert.equal(new Set(landedWidths).size,1);
 assert.equal(new Set(fleetZooms).size,1,'Fleet overview uses the same zoom on every pad');
 assert.ok(fleetWidths.every(w=>Math.abs(w-fleetWidths[0])<1e-8));
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


test('Scale Free Fly stays in flight on focus loss, freezes while hidden, and still pauses on purpose',()=>{
 const q=setup({redGrinSim:true,cockpitUI:true,flightShell:true,buildUI:true,reducedMotion:true,
  canvasBox:{width:390,height:608}, sharedStorage:new Map(),
  address:{search:'?hangar=carrier&vessel=rift-carrier',hostname:'rift.example',origin:'https://rift.example'}});
 q.click('hangar-scale-free-fly');
 const {p}=q.inspect(),pause=q.el['scale-fly-pause'];
 assert.equal(pause.hidden,false);assert.equal(pause.disabled,false);
 q.click('scale-fly-land');q.key('keydown','KeyD');q.step(30);
 q.blur();assert.equal(q.inspect().state,'play');assert.equal(q.el.overlay.hidden,true);
 const before=[p.x,p.y];q.hide(true);q.step(150);assert.deepEqual([p.x,p.y],before);
 q.hide(false);q.step(40);assert.equal(q.inspect().state,'play');
 q.pageHide();q.step(60);q.pageShow();assert.equal(q.inspect().state,'play');
 const fromX=p.x;q.key('keydown','KeyD');q.step(35);q.key('keyup','KeyD');assert.ok(p.x>fromX);
 q.click('scale-fly-pause');assert.equal(q.inspect().state,'pause');assert.match(q.el.overlay.innerHTML,/Flight paused/);
 q.blur();q.hide(true);q.hide(false);assert.equal(q.inspect().state,'pause');
 q.choose('resume');assert.equal(q.inspect().state,'play');
});


test('Resolute has an outboard approach, a taller capture zone, and clear takeoff without opening the hull',()=>{
 const q=setup({redGrinSim:true,cockpitUI:true,flightShell:true,buildUI:true,reducedMotion:true,
  canvasBox:{width:390,height:608},initialHe3:20,
  address:{search:'?hangar=carrier&vessel=rift-carrier',hostname:'rift.example',origin:'https://rift.example'}});
 q.click('hangar-scale-free-fly');q.click('scale-fly-land');
 const {p,scaleFlyShips:s}=q.inspect(),pad=s.pads.find(p=>p.group===2);
 assert.ok(pad.width>=50&&pad.height>=88);
 const startY=pad.y+38;
 Object.assign(p,{x:pad.x+90,y:startY,vx:0,vy:0});
 q.key('keydown','KeyA');
 for(let i=0;i<85&&p.x>pad.x+22;i++)q.step();
 q.key('keyup','KeyA');
 assert.ok(p.x<=pad.x+22&&Math.abs(p.y-startY)<1,'side approach reaches the extended tray without being bounced');
 Object.assign(p,{vx:0,vy:0});q.step(2);
 assert.match(q.el['scale-fly-land'].textContent,/Land · Resolute/);
 assert.equal(q.el['scale-fly-land'].hidden,false);
 q.click('scale-fly-land');assert.equal(s.parked,pad);
 q.click('scale-fly-land');q.step(55);
 assert.equal(s.parked,null);
 assert.ok(p.x>pad.x+25,'takeoff clears the hull toward open space '+(p.x-pad.x));
 const cell=s.hulls[2][1];
 Object.assign(p,{x:cell.x,y:cell.y,vx:0,vy:0});q.step(2);
 assert.ok(Math.hypot(p.x-cell.x,p.y-cell.y)>20,'forward hull still collides outside the landing corridor');
});


test('Pegasus close-up uses the original high-resolution art with a seamless low-resolution fallback',()=>{
 const q=setup({redGrinSim:true,cockpitUI:true,flightShell:true,buildUI:true,reducedMotion:true,sprite:true,
  canvasBox:{width:390,height:608},
  address:{search:'?hangar=carrier&vessel=rift-carrier',hostname:'rift.example',origin:'https://rift.example'}});
 q.click('hangar-scale-free-fly');q.click('scale-fly-land');
 const {p,scaleFlyShips:s}=q.inspect(),pad=s.pads.find(pad=>pad.group===0);
 const detail=q.sprites.find(a=>a.src==='./carrier-top.webp'),base=q.sprites.find(a=>a.src?.includes('carrier-capital.webp'));
 assert.ok(detail&&base);
 base.complete=true;base.naturalWidth=512;detail.complete=false;
 const draw=()=>q.spriteFrames.filter(f=>f.asset===detail||f.asset===base).at(-1);
 Object.assign(p,{x:pad.x,y:pad.y,vx:0,vy:0});q.step();q.click('scale-fly-land');q.step();
 assert.equal(draw().asset,base);
 const bounds=draw().bounds;
 detail.complete=true;detail.naturalWidth=1024;q.step();
 assert.equal(draw().asset,detail);assert.deepEqual(draw().bounds,bounds);assert.equal(s.parked,pad);
 q.click('scale-fly-overview');q.step();assert.equal(draw().asset,base);assert.deepEqual(draw().bounds,bounds);
});
