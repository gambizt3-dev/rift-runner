const test=require('node:test'),assert=require('node:assert/strict');
const {setup}=require('./ballistic.test.cjs');
const liftOff=q=>{q.click('scale-fly-land');q.step(87);};

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
 const {lengths,widths,factors}=lineup,stern=carrier.y+factors[0].stern*factors[0].y;
 assert.equal(carrier.vessel.name,'Pegasus');
 const visibleLength=58.24*266/320,visibleWidth=87.36*394/480;
 for(const [i,[len,beam,scale]] of [[605,278,.9],[255,54,1.875],[137,37,1.4]].entries()){
  assert.ok(Math.abs(lengths[i]/visibleLength-len*scale/29)<1e-9);
  assert.ok(Math.abs(widths[i]/visibleWidth-beam*scale/44)<1e-9);
  assert.ok(Math.abs([carrier,frigate,corvette][i].y+factors[i].stern*factors[i].y-stern)<1e-9);
 }
 assert.equal(hulls.length,3);assert.equal(start.pirateCapitals.length,0);
 assert.equal(lineup.parked.group,1);assert.equal(lineup.parked.index,4);
 assert.equal(p.x,lineup.parked.x);assert.equal(p.y,lineup.parked.y);
 liftOff(q);q.step(4);assert.equal(lineup.parked,null);
 q.click('flight-view-fleet');q.click('flight-view-focus');assert.equal(q.inspect().camera.zoom,1);
 Object.assign(p,{x:lineup.frigate.x,y:stern+100,vx:0,vy:0});
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
 liftOff(q);q.step(4);const fullWidth=paintWidth();
 const initial=[p.fighter,p.r,q.inspect().riftFourFlightLength,q.inspect().camera.zoom];
 const landedWidths=[],fleetWidths=[],fleetZooms=[];
 for(const pad of scaleFlyShips.pads){
  Object.assign(p,{x:pad.x,y:pad.y,vx:0,vy:0});q.step(4);
  assert.equal(button.hidden,false);assert.match(button.textContent,new RegExp('Land · '+pad.name));
  q.click('scale-fly-land');q.step(90);assert.equal(scaleFlyShips.parked,pad);assert.equal(button.textContent,'Launch');
  q.key('keydown','KeyD');q.step(16);q.key('keyup','KeyD');
  assert.equal(paintWidth(),fullWidth*scaleFlyShips.parkedScale);
  landedWidths.push(paintWidth());
  q.click('scale-fly-overview');q.step();
  fleetZooms.push(q.inspect().camera.zoom);
  fleetWidths.push(paintWidth());
  q.click('scale-fly-overview');
  assert.equal(p.x,pad.x);assert.equal(p.y,pad.y);
  assert.deepEqual([p.fighter,p.r,q.inspect().riftFourFlightLength,q.inspect().camera.zoom],initial);
  liftOff(q);q.step(4);
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
 liftOff(q);q.key('keydown','KeyD');q.step(30);
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
 q.click('hangar-scale-free-fly');liftOff(q);
 const {p,scaleFlyShips:s}=q.inspect(),pad=s.pads.find(p=>p.group===2);
 assert.deepEqual([pad.width,pad.height,pad.approachWidth,pad.approachHeight],[42,64,50,88]);
 const startY=pad.y+38;
 Object.assign(p,{x:pad.x+90,y:startY,vx:0,vy:0});
 q.key('keydown','KeyA');
 for(let i=0;i<85&&p.x>pad.x+22;i++)q.step();
 q.key('keyup','KeyA');
 assert.ok(p.x<=pad.x+22&&Math.abs(p.y-startY)<1,'side approach reaches the extended tray without being bounced');
 Object.assign(p,{vx:0,vy:0});q.step(2);
 assert.match(q.el['scale-fly-land'].textContent,/Land · Resolute/);
 assert.equal(q.el['scale-fly-land'].hidden,false);
 q.click('scale-fly-land');q.step(90);assert.equal(s.parked,pad);
 liftOff(q);q.step(55);
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
 q.click('hangar-scale-free-fly');liftOff(q);
 const {p,scaleFlyShips:s}=q.inspect(),pad=s.pads.find(pad=>pad.group===0);
 const detail=q.sprites.find(a=>a.src==='./carrier-top.webp'),base=q.sprites.find(a=>a.src?.includes('carrier-capital.webp'));
 assert.ok(detail&&base);
 base.complete=true;base.naturalWidth=512;detail.complete=false;
 const draw=()=>q.spriteFrames.filter(f=>f.asset===detail||f.asset===base).at(-1);
 Object.assign(p,{x:pad.x,y:pad.y,vx:0,vy:0});q.step();q.click('scale-fly-land');q.step(90);
 assert.equal(draw().asset,base);
 const bounds=draw().bounds;
 detail.complete=true;detail.naturalWidth=1024;q.step();
 assert.equal(draw().asset,detail);assert.deepEqual(draw().bounds,bounds);assert.equal(s.parked,pad);
 q.click('scale-fly-overview');q.step();assert.equal(draw().asset,base);assert.deepEqual(draw().bounds,bounds);
});


test('Fleet Overview draws all seven reference trios and keeps them out of player physics',()=>{
 const q=setup({redGrinSim:true,cockpitUI:true,flightShell:true,buildUI:true,reducedMotion:true,sprite:true,
  canvasBox:{width:390,height:608},
  address:{search:'?hangar=carrier&vessel=rift-carrier',hostname:'rift.example',origin:'https://rift.example'}});
 q.click('hangar-scale-free-fly');q.click('scale-fly-overview');
 const {p,scaleFlyShips:s,camera}=q.inspect();
 assert.equal(s.referenceFlights.length,7);
 assert.deepEqual(Array.from([0,1,2],i=>s.referenceFlights.filter(f=>f.group===i).length),[4,2,1]);
 assert.equal(s.referenceFlights.filter(f=>f.group===0&&f.side===-1).length,2);
 assert.equal(s.referenceFlights.filter(f=>f.group===0&&f.side===1).length,2);
 for(const f of s.referenceFlights){
  assert.ok(camera.x<=f.x-53&&f.x+53<=camera.x+camera.w);
  const hull=[s.carrier,s.frigate,s.corvette][f.group];
  assert.ok(Math.abs(f.x-hull.x)>s.widths[f.group]/2+46);
 }
 const asset=q.sprites.find(a=>a.src?.includes('fighter-winged.png'));
 asset.complete=true;asset.naturalWidth=760;
 const start=q.spriteFrames.length;q.step();
 const drawings=q.spriteFrames.slice(start).filter(f=>f.asset===asset);
 assert.equal(drawings.length,22,'21 decorative fighters plus the parked player');
 assert.ok(drawings.every(f=>Math.abs(f.bounds[2]-87.36*.33)<1e-8));
 liftOff(q);q.step();
 const group=s.referenceFlights[0];
 const [x,y]=[group.x,group.y];Object.assign(p,{x,y,vx:0,vy:0});q.step(50);
 assert.equal(p.x,x);assert.equal(p.y,y);
 assert.equal(q.inspect().shots.length,0);assert.equal(q.inspect().vandulLasers.length,0);
});


test('Resolute opens its bay before extending the tray and closes it only after retraction',()=>{
 const q=setup({redGrinSim:true,cockpitUI:true,flightShell:true,buildUI:true,initialHe3:20,
  canvasBox:{width:390,height:608},
  address:{search:'?hangar=carrier&vessel=rift-carrier',hostname:'rift.example',origin:'https://rift.example'}});
 q.click('hangar-scale-free-fly');liftOff(q);
 const {p,scaleFlyShips:s}=q.inspect(),pad=s.pads.at(-1),m=s.trayMotion,btn=q.el['scale-fly-land'];
 q.step(40);assert.equal(m.door,0);assert.equal(m.slide,0);
 Object.assign(p,{x:pad.x+10,y:pad.y,vx:0,vy:0});q.step(14);
 assert.ok(m.door>0&&m.door<1);assert.equal(m.slide,0);assert.equal(btn.disabled,true);
 q.click('scale-fly-land');assert.equal(s.parked,null);
 q.step(42);assert.equal(m.door,1);assert.ok(m.slide>0&&m.slide<1);
 q.step(84);assert.equal(m.slide,1);assert.equal(btn.disabled,false);
 q.click('scale-fly-land');q.step(110);assert.equal(s.parked,pad);assert.equal(m.slide,1);
 liftOff(q);Object.assign(p,{x:pad.x+160,y:pad.y,vx:0,vy:0});q.step(67);
 assert.equal(m.door,1);assert.ok(m.slide<1&&m.slide>0);
 q.step(54);assert.equal(m.slide,0);assert.ok(m.door<1);
 q.step(50);assert.equal(m.door,0);assert.equal(m.slide,0);
});


test('Pegasus accepts a rear approach from either side of center and keeps the outer hull solid',()=>{
 const q=setup({redGrinSim:true,cockpitUI:true,flightShell:true,buildUI:true,reducedMotion:true,initialHe3:20,
  canvasBox:{width:390,height:608},
  address:{search:'?hangar=carrier&vessel=rift-carrier',hostname:'rift.example',origin:'https://rift.example'}});
 q.click('hangar-scale-free-fly');liftOff(q);
 const {p,scaleFlyShips:s}=q.inspect(),lane=s.pegasusApproach;
 const startY=lane.rearRow+303,solidY=lane.rearRow+78;
 const drive=(x,waiting)=>{
  q.key('keydown',x);for(let i=0;i<220&&waiting();i++)q.step();q.key('keyup',x);
 };
 for(const [side,pad] of [[-1,s.pads[2]],[1,s.pads[3]]]){
  const x=lane.x+side*97;
  Object.assign(p,{x,y:startY,vx:0,vy:0,he3:20});
  drive('KeyW',()=>p.y>pad.y+9);
  assert.ok(p.y<=pad.y+9&&Math.abs(p.x-x)<1,'stern does not bounce the incoming fighter');
  Object.assign(p,{y:pad.y,vx:0,vy:0,he3:20});
  drive(side<0?'KeyD':'KeyA',()=>Math.abs(p.x-pad.x)>18);
  Object.assign(p,{vx:0,vy:0});q.step(2);
  assert.equal(q.el['scale-fly-land'].hidden,false);
  q.click('scale-fly-land');q.step(90);assert.equal(s.parked,pad);
  liftOff(q);
 }
 Object.assign(p,{x:lane.x+153,y:startY,vx:0,vy:0,he3:20});
 drive('KeyW',()=>p.y>solidY);
 assert.ok(p.y>solidY||p.x>lane.x+160,'outer engine hull still deflects the fighter');
});


test('Pegasus allows a side approach over the marked deck strip and keeps forward plating solid',()=>{
 const q=setup({redGrinSim:true,cockpitUI:true,flightShell:true,buildUI:true,reducedMotion:true,initialHe3:20,
  canvasBox:{width:390,height:608},
  address:{search:'?hangar=carrier&vessel=rift-carrier',hostname:'rift.example',origin:'https://rift.example'}});
 q.click('hangar-scale-free-fly');liftOff(q);
 const {p,scaleFlyShips:s}=q.inspect(),lane=s.pegasusApproach;
 const drive=(key,finish)=>{q.key('keydown',key);for(let i=0;i<260&&!finish();i++)q.step();q.key('keyup',key);};
 for(const [side,pad] of [[-1,s.pads[0]],[1,s.pads[1]]]){
  const startY=pad.y+12;
  const reached=()=>Math.abs(p.x-pad.x)<18;
  Object.assign(p,{x:lane.x+side*245,y:startY,vx:0,vy:0,he3:20});
  drive(side<0?'KeyD':'KeyA',reached);
  assert.ok(reached()&&Math.abs(p.y-startY)<1,'side flight crosses the outlined decking without collision');
  Object.assign(p,{vx:0,vy:0});q.step(2);
  assert.match(q.el['scale-fly-land'].textContent,/Land · Pegasus/);
  assert.equal(q.el['scale-fly-land'].hidden,false);
  q.click('scale-fly-land');q.step(90);assert.equal(s.parked,pad);
  liftOff(q);
 }
 Object.assign(p,{x:lane.x+225,y:lane.front-72,vx:0,vy:0,he3:20});
 const hit=()=>Math.hypot(s.carrier.vx,s.carrier.vy)>.02;
 drive('KeyA',hit);
 assert.ok(hit(),'forward hull still blocks a side approach outside the deck strip');
 assert.ok(p.x>lane.x+115,'first contact is at the outer hull, not inside it');
});

test('Fleet Overview hands off to every helm, fits its hull and returns to the same Rift-3',()=>{
 const q=setup({redGrinSim:true,cockpitUI:true,flightShell:true,buildUI:true,reducedMotion:true,
  canvasBox:{width:390,height:608},initialHe3:20,
  address:{search:'?hangar=carrier&vessel=rift-carrier',hostname:'rift.example',origin:'https://rift.example'}});
 q.click('hangar-scale-free-fly');
 const {p,scaleFlyShips:s}=q.inspect(),dock=s.parked;
 const menu=q.el['scale-fly-helm'];
 assert.equal(menu.hidden,true);
 q.click('scale-fly-overview');assert.equal(menu.hidden,false);
 const zoom=[],speed=[];
 for(const [i,key] of ['pegasus','crosswind','resolute'].entries()){
  const ship=s.fleet[i],firstY=ship.y;
  q.click('scale-helm-'+key);
  assert.equal(s.helm,i);assert.equal(s.overview,false);assert.equal(q.el['scale-fly-land'].hidden,true);
  assert.equal(q.el['scale-helm-'+key].attrs['aria-pressed'],'true');
  const cam=q.inspect().camera;zoom.push(cam.zoom);
  assert.ok(cam.y<=ship.y-s.lengths[i]/2&&cam.y+cam.h>=ship.y+s.lengths[i]/2);
  q.key('keydown','KeyW');q.step(68);q.key('keyup','KeyW');
  assert.ok(ship.y<firstY-9&&ship.thrust>.9);
  speed.push(Math.abs(ship.vy));
  const coastY=ship.y;q.step(12);assert.ok(ship.y<coastY);
  const fighterY=p.y;
  q.key('keydown','ArrowRight');q.step(25);q.key('keyup','ArrowRight');
  assert.ok(ship.yaw>0&&ship.yaw<Math.PI/2,'heavy helm turns gradually');
  assert.equal(s.parked,dock);
  if(i===1){assert.notEqual(p.y,fighterY);assert.equal(p.x,dock.x);assert.equal(p.y,dock.y);}
 }
 assert.ok(zoom[0]<zoom[1]&&zoom[1]<zoom[2]&&zoom[2]<1,'camera fits each different hull');
 assert.ok(speed[0]<speed[1]&&speed[1]<speed[2],'heavier hulls accelerate more slowly');
 assert.equal(p.he3,20,'helm does not spend fighter fuel');
 q.click('scale-helm-rift');
 assert.equal(s.helm,-1);assert.equal(q.inspect().camera.zoom,1);assert.equal(s.parked,dock);
 assert.equal(p.x,dock.x);assert.equal(p.y,dock.y);
 assert.equal(q.el['scale-fly-land'].hidden,false);
 liftOff(q);q.step(5);
 assert.equal(s.parked,null);assert.equal(q.inspect().camera.zoom,1);
});


test('the Pegasus helm can sustain cruise for far longer without changing the opening scale view',()=>{
 const q=setup({redGrinSim:true,cockpitUI:true,flightShell:true,buildUI:true,reducedMotion:true,
  canvasBox:{width:390,height:608},initialHe3:20,
  address:{search:'?hangar=carrier&vessel=rift-carrier',hostname:'rift.example',origin:'https://rift.example'}});
 q.click('hangar-scale-free-fly');q.click('scale-fly-overview');
 const {scaleFlyShips:s,arena,camera}=q.inspect();
 assert.ok(arena.right-arena.left>5300&&arena.bottom-arena.top>4100);
 assert.ok(camera.w<2000,'initial overview is still framed on the trio, not the expanded arena');
 assert.equal(s.frigate.x-s.carrier.x,760);assert.equal(s.corvette.x-s.frigate.x,370);
 q.click('scale-helm-pegasus');
 const start=s.carrier.y;
 q.key('keydown','KeyW');q.step(1000);q.key('keyup','KeyW');
 assert.ok(start-s.carrier.y>1150,'carrier cruises well past the old forward margin');
 assert.ok(Math.abs(s.carrier.vy)>85,'carrier is still cruising, not touching a boundary');
 assert.ok(s.carrier.y-s.lengths[0]/2>arena.top,'carrier remains within the test arena');
});

test('Crosswind can turn and steer away from a corner without clipping or dropping its parked fighter',()=>{
 const q=setup({redGrinSim:true,cockpitUI:true,flightShell:true,buildUI:true,reducedMotion:true,
  canvasBox:{width:390,height:608},initialHe3:20,
  address:{search:'?hangar=carrier&vessel=rift-carrier',hostname:'rift.example',origin:'https://rift.example'}});
 q.click('hangar-scale-free-fly');q.click('scale-fly-overview');q.click('scale-helm-crosswind');
 const {p,scaleFlyShips:s,arena}=q.inspect(),h=s.frigate,w=s.widths[1],l=s.lengths[1];
 const sweep=Math.hypot(w,l)/2+8;
 h.x=arena.right-Math.max(w/2+112,sweep)-48;h.y=arena.top+l/2+160;
 q.key('keydown','KeyW');q.key('keydown','KeyD');q.step(150);q.key('keyup','KeyD');
 assert.ok(h.y-l/2-arena.top>=64&&arena.right-h.x-w/2>=64,'hull stops clear of both walls');
 assert.equal(h.edgeAssist,true);
 q.key('keydown','ArrowRight');
 for(let i=0;i<180;i++){
  q.step();
  const c=Math.abs(Math.cos(h.yaw)),n=Math.abs(Math.sin(h.yaw));
  assert.ok(h.x+(w*c+l*n)/2<=arena.right+1e-8);
  assert.ok(h.y-(l*c+w*n)/2>=arena.top-1e-8);
  assert.equal(p.x,s.parked.x);assert.equal(p.y,s.parked.y);
 }
 q.key('keyup','ArrowRight');q.key('keyup','KeyW');
 assert.ok(h.yaw>.9,'turn input still works while pressing into the wall');
 const x=h.x;
 q.key('keydown','KeyA');q.step(140);q.key('keyup','KeyA');
 assert.ok(h.x<x-20,'Crosswind can pull left and clear the corner');
});

test('Heavy helms arc away from either side wall under thrust or Auto move',()=>{
 for(const [i,name] of ['pegasus','crosswind'].entries())for(const side of [-1,1]){
  const q=setup({redGrinSim:true,cockpitUI:true,flightShell:true,buildUI:true,reducedMotion:true,
   canvasBox:{width:390,height:608},initialHe3:20,
   address:{search:'?hangar=carrier&vessel=rift-carrier',hostname:'rift.example',origin:'https://rift.example'}});
  q.click('hangar-scale-free-fly');q.click('scale-fly-overview');q.click('scale-helm-'+name);
  const {scaleFlyShips:s,arena}=q.inspect(),h=s.fleet[i],w=s.widths[i],l=s.lengths[i];
  const wall=side>0?arena.right:arena.left, gap=()=>side*(wall-h.x)-(Math.abs(Math.cos(h.yaw))*w+Math.abs(Math.sin(h.yaw))*l)/2;
  h.yaw=h.wanted=side*Math.PI/2;h.x=wall-side*(l/2+320);h.y=arena.top+800;
  if(side<0)q.click('scale-auto-move');
  else q.pointer('pointerdown',3,'move-pad',80,460);
  q.step(185);
  assert.ok(side*h.vx>25,'touch thrust is active before the buffer');
  let turned=false,enteredBuffer=false;
  for(let j=0;j<160;j++){
   q.step(8);
   if(h.slowTurn?.edge){turned=true;assert.match(q.el['scale-fly-readout'].textContent,/Auto edge turn/);}
   if(gap()<250)enteredBuffer=true;
   assert.ok(gap()>0,'hull never crosses the hard boundary');
   assert.equal(s.sector,0);
  }
  if(side<0)q.click('scale-auto-move');
  else q.pointer('pointerup',3,'move-pad',80,460);
  assert.ok(turned,'forward motion activates the shared arc');
  assert.ok(enteredBuffer,'the hull can nose into the warning band');
  assert.ok(gap()>200,'the arc and continued thrust clear the side wall');
 }
});

test('reference Rift-3 trios fall behind and catch up on all three capital helms',()=>{
 for(const [i,ship] of ['pegasus','crosswind','resolute'].entries()){
  const q=setup({redGrinSim:true,cockpitUI:true,flightShell:true,buildUI:true,reducedMotion:true,
   canvasBox:{width:390,height:608},initialHe3:20,
   address:{search:'?hangar=carrier&vessel=rift-carrier',hostname:'rift.example',origin:'https://rift.example'}});
  q.click('hangar-scale-free-fly');q.click('scale-fly-overview');q.click('scale-helm-'+ship);
  const {scaleFlyShips:s}=q.inspect(),h=s.fleet[i],f=s.referenceFlights.find(f=>f.group===i);
  const lag=()=>f.y-(h.y+f.ly);
  q.key('keydown','KeyW');
  let fellBack=false,caughtUp=false,peak=0;
  for(let j=0;j<160;j++){
   q.step(5);peak=Math.max(peak,lag());
   if(lag()>45)fellBack=true;
   if(fellBack&&f.catching&&lag()<peak-23)caughtUp=true;
  }
  q.key('keyup','KeyW');
  assert.ok(fellBack&&caughtUp,ship+' escorts trail then close the gap under cruise');
  assert.ok(peak<145,ship+' escorts stay with the ship');
  q.key('keydown','ArrowRight');q.step(90);q.key('keyup','ArrowRight');
  assert.ok(Math.abs(h.yaw-f.yaw)>.03,'formation heading is not locked to the hull');
 }
});

test('stationary helms swing through the red buffer without shifting their center',()=>{
 for(const [i,name] of ['pegasus','crosswind','resolute'].entries()){
  const q=setup({redGrinSim:true,cockpitUI:true,flightShell:true,buildUI:true,reducedMotion:true,
   canvasBox:{width:390,height:608},initialHe3:20,traceClashPaint:true,
   address:{search:'?hangar=carrier&vessel=rift-carrier',hostname:'rift.example',origin:'https://rift.example'}});
  q.click('hangar-scale-free-fly');q.click('scale-fly-overview');q.click('scale-helm-'+name);
  assert.ok(!q.strokePaint.some(a=>a.color==='#ff6179ed'),'edge marking stays offscreen in open space');
  const {scaleFlyShips:s,arena}=q.inspect(),h=s.fleet[i],w=s.widths[i],l=s.lengths[i];
  const x=arena.right-Math.max(w/2+113,Math.hypot(w,l)/2+9),y=arena.top+1050;
  Object.assign(h,{x,y,vx:0,vy:0});
  q.pointer('pointerdown',16,'aim-pad',360,360);q.pointer('pointerup',16,'aim-pad');
  let crossed=false;
  for(let j=0;j<32;j++){
   q.step(13);
   const half=(w*Math.abs(Math.cos(h.yaw))+l*Math.abs(Math.sin(h.yaw)))/2;
   assert.equal(h.x,x);assert.equal(h.y,y);
   assert.ok(h.x+half<=arena.right);
   if(h.x+half>arena.right-112)crossed=true;
  }
  assert.ok(q.strokePaint.some(a=>a.color==='#ff6179ed'),'the soft boundary is drawn in red');
  assert.ok(crossed,name+' rotates into the buffer without crossing the hard edge');
  q.key('keydown','KeyA');q.step(140);q.key('keyup','KeyA');
  assert.ok(h.x<x-25,'can still steer inward');
 }
});

test('tapping a helm control starts one smooth, advancing quarter turn and allows cancellation',()=>{
 const q=setup({redGrinSim:true,cockpitUI:true,flightShell:true,buildUI:true,reducedMotion:true,
  canvasBox:{width:390,height:608},address:{search:'?hangar=carrier&vessel=rift-carrier'}});
 q.click('hangar-scale-free-fly');q.click('scale-fly-overview');
 assert.equal(q.el['scale-fly-turn'].hidden,true);
 q.click('scale-helm-pegasus');
 const ship=q.inspect().scaleFlyShips.carrier,{x,y}=ship;
 assert.equal(q.el['scale-fly-turn'].hidden,false);
 q.click('scale-turn-left');assert.equal(q.el['scale-turn-left'].attrs['aria-pressed'],'true');
 q.step(130);
 assert.ok(ship.yaw<-.1&&ship.yaw>-.45&&ship.y<y-40);
 for(let i=0;i<900;i++)q.step();
 assert.ok(Math.abs(ship.yaw+Math.PI/2)<1e-6&&ship.x<x-120);
 assert.equal(ship.slowTurn,null);
 q.click('scale-turn-right');q.step(110);
 assert.equal(q.el['scale-turn-right'].attrs['aria-pressed'],'true');
 q.click('scale-turn-right');assert.equal(ship.slowTurn,null);
 q.click('scale-turn-right');q.key('keydown','KeyW');q.step();q.key('keyup','KeyW');
 assert.equal(ship.slowTurn,null,'manual thrust overrides the maneuver');
 q.click('scale-helm-rift');assert.equal(q.el['scale-fly-turn'].hidden,true);
});

test('Free Fly Watch AI can execute the same moving quarter turn',()=>{
 const q=setup({redGrinSim:true,cockpitUI:true,flightShell:true,buildUI:true,reducedMotion:true,
  canvasBox:{width:390,height:608},address:{search:'?hangar=carrier&vessel=rift-carrier'}});
 q.click('hangar-watch-scale-free-fly');
 const ship=q.inspect().scaleFlyShips.carrier,{x,y}=ship;
 q.step(440);
 assert.ok(ship.slowTurn?.side===-1&&ship.yaw<-.2&&ship.y<y-55);
 q.step(690);
 assert.equal(ship.slowTurn,null);
 assert.ok(Math.abs(ship.yaw+Math.PI/2)<1e-6&&ship.x<x-120);
 assert.equal(q.el['scale-fly-turn'].hidden,true);
});

test('Crosswind and Resolute can fire their own guns during a moving arc; Pegasus stays unchanged',()=>{
 const q=setup({redGrinSim:true,cockpitUI:true,flightShell:true,buildUI:true,reducedMotion:true,
  canvasBox:{width:390,height:608},address:{search:'?hangar=carrier&vessel=rift-carrier'}});
 q.click('hangar-scale-free-fly');q.click('scale-fly-overview');
 const {scaleFlyShips:s,p}=q.inspect(),initialHp=p.hp;
 const menu=q.el['scale-fly-guns'];
 const name=q.el['scale-fly-gun-weapon'],status=q.el['scale-fly-gun-status'];
 assert.equal(menu.hidden,true);
 q.click('scale-helm-pegasus');assert.equal(menu.hidden,false);
 assert.equal(name.textContent,'Pegasus is unarmed');
 assert.equal(q.el['scale-fire-port'].hidden,true);
 q.click('scale-fire-port');assert.equal(s.helmShots.length,0);
 q.click('scale-helm-crosswind');assert.equal(menu.hidden,false);
 assert.equal(q.el['scale-fire-port'].hidden,false);
 assert.equal(name.textContent,'Broadside cannons');assert.equal(status.textContent,'Ready');
 assert.equal(q.el['arena-screen'].dataset.capitalHelm,'true');
 assert.equal(q.el['scale-helm-dock'].hidden,false);
 q.click('scale-turn-left');q.step(48);
 q.click('scale-fire-starboard');
 assert.equal(s.helmShots.length,1);
 assert.equal(q.el['scale-fire-port'].disabled,true);
 assert.equal(status.textContent,'Volley firing');
 q.click('scale-fire-port');
 q.step(32);
 assert.equal(s.helmShots.length,9);assert.ok(s.helmShots.every(b=>b.redGrinCannon&&b.group===1&&b.vx>0));
 assert.equal(s.frigate.slowTurn.side,-1);
 q.step(120);assert.equal(s.helmShots.length,0);assert.equal(q.el['scale-fire-port'].disabled,false);
 q.click('scale-helm-resolute');q.click('scale-turn-right');q.step(45);q.click('scale-fly-overview');
 assert.equal(menu.hidden,false);assert.ok(s.overview);
 assert.equal(name.textContent,'Twin-barrel turrets');assert.equal(status.textContent,'Independent fire');
 const fore=q.el['scale-turret-port-forward'],aft=q.el['scale-turret-port-aft'];
 q.click('scale-turret-port-forward');assert.equal(fore.disabled,true);assert.equal(aft.disabled,false);
 assert.equal(s.helmShots.length,2);
 q.click('scale-turret-port-forward');assert.equal(s.helmShots.length,2);
 q.click('scale-turret-port-aft');
 assert.equal(s.helmShots.length,4);assert.equal(aft.disabled,true);assert.ok(s.helmShots.every(b=>b.weapon==='ballistic'&&b.group===2&&b.vx<0));
 assert.equal(s.corvette.slowTurn.side,1);
 q.click('scale-helm-rift');assert.equal(menu.hidden,true);
 assert.equal(q.el['arena-screen'].dataset.capitalHelm,undefined);
 assert.equal(q.el['scale-helm-dock'].hidden,true);
 q.step(100);
 assert.equal(s.helmShots.length,0);assert.equal(p.hp,initialHp);assert.equal(q.inspect().shots.length,0);
});

test('Resolute auto move resumes along the new heading after an arc turn',()=>{
 const q=setup({redGrinSim:true,cockpitUI:true,flightShell:true,buildUI:true,reducedMotion:true,
  canvasBox:{width:390,height:608},address:{search:'?hangar=carrier&vessel=rift-carrier'}});
 q.click('hangar-scale-free-fly');q.click('scale-fly-overview');
 const toggle=q.el['scale-auto-move'];
 assert.equal(toggle.hidden,true);
 q.click('scale-helm-crosswind');
 assert.equal(toggle.hidden,false);
 q.click('scale-helm-resolute');
 const {corvette:h}=q.inspect().scaleFlyShips;
 const y=h.y;
 q.click('scale-fly-overview');
 assert.equal(toggle.hidden,false);q.click('scale-auto-move');
 assert.equal(toggle.attrs['aria-pressed'],'true');
 q.step(130);assert.ok(h.y<y-50);
 q.click('scale-turn-right');q.step(120);
 assert.ok(h.yaw>.15&&h.y<y-100);
 q.click('scale-turret-port-forward');q.step(520);
 assert.equal(h.slowTurn,null);assert.ok(Math.abs(h.yaw-Math.PI/2)<1e-6);
 assert.equal(h.autoMove,true);assert.ok(h.vx>65);
 const x=h.x;q.step(65);assert.ok(h.x>x+40);
 const manualY=h.y;
 q.key('keydown','KeyS');q.step(65);q.key('keyup','KeyS');
 assert.ok(h.y>manualY+15,'manual trim remains available during auto move');
 assert.equal(h.autoMove,true);
 q.step(130);assert.ok(h.vx>65,'cruise returns after manual input');
 q.click('scale-auto-move');assert.equal(toggle.attrs['aria-pressed'],'false');
 q.step(165);assert.ok(Math.hypot(h.vx,h.vy)<1e-8);
 q.click('scale-auto-move');q.click('scale-helm-rift');
 assert.equal(h.autoMove,false);assert.equal(toggle.hidden,true);
});

test('scale drill flies the three-host circuit with regular controls and records only actual landings',()=>{
 const storage=new Map();
 const q=setup({redGrinSim:true,cockpitUI:true,flightShell:true,buildUI:true,reducedMotion:true,initialHe3:20,
  canvasBox:{width:390,height:608},sharedStorage:storage,address:{search:'?hangar=carrier&vessel=rift-carrier',hostname:'rift.example',origin:'https://rift.example'}});
 q.click('hangar-scale-free-fly');
 const {p,scaleFlyShips:s}=q.inspect(),save=[...storage];
 const button=q.el['scale-fly-drill'],hud=q.el['scale-fly-readout'];
 assert.equal(button.hidden,false);q.click('scale-fly-drill');
 assert.match(hud.textContent,/Launch for Pegasus/);
 q.click('scale-fly-overview');q.click('scale-helm-crosswind');const t=s.drill.time;
 q.step(20);assert.equal(s.drill.time,t);assert.equal(button.hidden,true);
 q.click('scale-helm-rift');liftOff(q);
 let held=new Set();
 const set=keys=>{for(const k of held)if(!keys.includes(k))q.key('keyup',k);
  for(const k of keys)if(!held.has(k))q.key('keydown',k);held=new Set(keys);};
 function fly(goal,r=15,max=1500){
  for(let frame=0;frame<max;frame+=4){
   const dx=goal.x-p.x,dy=goal.y-p.y;
   if(Math.hypot(dx,dy)<r&&Math.hypot(p.vx,p.vy)<43){set([]);return;}
   const ax=dx-p.vx*.4,ay=dy-p.vy*.4;
   set([...(Math.abs(ax)>9?[ax>0?'KeyD':'KeyA']:[]),...(Math.abs(ay)>9?[ay>0?'KeyS':'KeyW']:[])]);
   q.step(4);
  }
  set([]);assert.fail(JSON.stringify({goal,p:{x:p.x,y:p.y,vx:p.vx,vy:p.vy},hud:hud.textContent,parking:s.parked?.name}));
 }
 const front=s.pads.find(a=>a.group===0),rear=s.pads.filter(a=>a.group===0).at(-1);
 const cross=s.pads.find(a=>a.group===1&&a.index===4),tray=s.pads.at(-1);
 const leg=(pad,gate,i)=>{
  assert.equal(s.drill.leg,i);
  fly(gate,52);assert.equal(s.drill.checkpoint,true);
  assert.match(hud.textContent,/Slow down and land/);
  fly(pad,16);for(let j=0;j<150&&q.el['scale-fly-land'].disabled;j++)q.step();
  assert.equal(q.el['scale-fly-land'].hidden,false);q.click('scale-fly-land');q.step(90);
  assert.equal(s.parked?.group,pad.group);assert.equal(s.drill.leg,i+1);
 };
 fly({x:cross.x,y:cross.y+220},45);
 leg(front,{x:front.x,y:rear.y+175},0);
 liftOff(q);fly({x:front.x,y:rear.y+230},44);
 fly({x:tray.x+135,y:rear.y+230},44);
 leg(tray,{x:tray.x+135,y:tray.y},1);
 liftOff(q);fly({x:tray.x+165,y:tray.y+170},48);
 fly({x:cross.x,y:cross.y+255},45);
 leg(cross,{x:cross.x,y:cross.y+175},2);
 assert.match(hud.textContent,/Drill complete · 3\/3 landings/);
 assert.deepEqual([...storage],save);
 assert.equal(button.textContent,'Retry drill');q.click('scale-fly-drill');
 assert.equal(s.drill.leg,0);assert.equal(s.drill.time,0);
 q.click('scale-fly-drill');assert.equal(s.drill,null);assert.equal(button.textContent,'Scale drill');
});

test('Scale Drill never requires free flyers or spectators to start a route and cannot skip a beacon',()=>{
 const opts={redGrinSim:true,cockpitUI:true,flightShell:true,buildUI:true,reducedMotion:true,
  address:{search:'?hangar=carrier&vessel=rift-carrier',hostname:'rift.example',origin:'https://rift.example'}};
 const q=setup(opts);q.click('hangar-scale-free-fly');const {p,scaleFlyShips:s}=q.inspect();
 const peg=s.pads.find(a=>a.group===0);
 q.click('scale-fly-drill');liftOff(q);
 Object.assign(p,{x:peg.x,y:peg.y,vx:0,vy:0});q.step(10);
 q.click('scale-fly-land');q.step(90);assert.equal(s.parked,peg);
 assert.equal(s.drill.leg,0,'an ordinary landing without the approach beacon does not count');
 q.click('scale-fly-drill');assert.equal(s.drill,null);
 const watch=setup(opts);watch.click('hangar-watch-scale-free-fly');watch.step(150);
 assert.equal(watch.el['scale-fly-drill'].hidden,true);
 assert.equal(watch.inspect().scaleFlyShips.drill,undefined);
});

test('Crosswind runway stays open through the bow on touch controls while both nose prongs stay solid',()=>{
 const q=setup({redGrinSim:true,cockpitUI:true,flightShell:true,buildUI:true,reducedMotion:true,initialHe3:20,
  canvasBox:{width:390,height:608},sharedStorage:new Map(),
  address:{search:'?hangar=carrier&vessel=rift-carrier',hostname:'rift.example',origin:'https://rift.example'}});
 q.click('hangar-scale-free-fly');
 const {p,scaleFlyShips:s}=q.inspect(),h=s.frigate,front=s.pads.find(pad=>pad.group===1);
 liftOff(q); // Release the starting aft pad, then land on the front pad.
 Object.assign(p,{x:front.x,y:front.y,vx:0,vy:0});q.step(2);
 q.click('scale-fly-land');q.step(90);assert.equal(s.parked,front);
 liftOff(q);assert.equal(s.parked,null);
 const tip=h.y+s.crosswindRails[0][0][1];
 const nose=s.hulls[1].filter(part=>part.y<tip+110);
 assert.ok(nose.some(part=>part.x+part.r<front.x)&&nose.some(part=>part.x-part.r>front.x),
  'capital collision also retains a solid prong on each side of the opening');
 assert.ok(nose.every(part=>Math.abs(part.x-front.x)>part.r),'no capital collision body plugs the bow opening');
 const touch=(down,y)=>q.pointer(down?'pointerdown':'pointerup',3,'move-pad',80,y);
 const straight=(y,until)=>{
  touch(true,y);
  for(let frame=0;frame<1000&&!until();frame++){
   q.step();assert.ok(Math.abs(p.x-front.x)<.01,'centerline is collision-free');
  }
  touch(false,y);assert.ok(until(),'touch flight clears or enters the bow');
 };
 straight(410,()=>p.y<tip-55);
 Object.assign(p,{vx:0,vy:0});
 straight(505,()=>p.y>front.y-22);
 for(const rail of s.crosswindRails){
  // At the upper side plating, thrust toward the closest prong from the outside.
  const [a,b]=rail,side=Math.sign(a[0]);
  const c=Math.cos(h.yaw),n=Math.sin(h.yaw),lx=(a[0]+b[0])/2,ly=(a[1]+b[1])/2;
  const x=h.x+c*lx-n*ly,y=h.y+n*lx+c*ly;
  Object.assign(h,{vx:0,vy:0,impactSpin:0});
  Object.assign(p,{x:x+side*40,y,vx:0,vy:0,he3:20});
  const key=side<0?'KeyD':'KeyA',hit=()=>Math.hypot(h.vx,h.vy)>.03;
  q.key('keydown',key);for(let i=0;i<105&&!hit();i++)q.step();q.key('keyup',key);
  assert.ok(hit(),'solid nose plating deflects the fighter and transfers impulse');
 }
});

test('landing eases position and scale for 1.35 seconds and cannot relaunch before touchdown',()=>{
 const q=setup({redGrinSim:true,cockpitUI:true,flightShell:true,buildUI:true,sprite:true,initialHe3:20,
  canvasBox:{width:390,height:608},sharedStorage:new Map(),
  address:{search:'?hangar=carrier&vessel=rift-carrier',hostname:'rift.example',origin:'https://rift.example'}});
 q.click('hangar-scale-free-fly');
 const {p,scaleFlyShips:s}=q.inspect(),pad=s.pads.find(pad=>pad.group===1),button=q.el['scale-fly-land'];
 const sprite=q.sprites.find(a=>a.src?.includes('fighter-winged.png'));
 sprite.complete=true;sprite.naturalWidth=760;
 const width=()=>q.spriteFrames.filter(f=>f.asset===sprite).at(-1).bounds[2];
 liftOff(q);
 Object.assign(p,{x:pad.x+17,y:pad.y+18,vx:0,vy:0});q.step(2);
 const full=width(),start={x:p.x,y:p.y};
 q.click('scale-fly-land');
 assert.deepEqual({x:p.x,y:p.y},start,'the tap itself does not move the fighter');
 assert.equal(s.parked,null);
 assert.equal(button.disabled,true);assert.match(button.textContent,/Touching down/);
 q.click('scale-fly-land');q.step(40);
 assert.ok(p.x<start.x&&p.x>pad.x&&p.y<start.y&&p.y>pad.y);
 assert.ok(width()<full&&width()>full*s.parkedScale);
 assert.equal(s.parked,null);assert.equal(button.disabled,true);
 q.step(45);
 assert.equal(s.parked,pad);assert.equal(s.landing,null);assert.equal(button.disabled,false);
 assert.equal(button.textContent,'Launch');
 assert.ok(Math.abs(p.x-pad.x)<1e-8&&Math.abs(p.y-pad.y)<1e-8);
 assert.equal(width(),full*s.parkedScale);
});


test('fighter and corvette transit the solid red band, preserving the ship and leaving the rest of the fleet behind',()=>{
 const q=setup({redGrinSim:true,cockpitUI:true,flightShell:true,buildUI:true,reducedMotion:true,traceClashPaint:true,
  canvasBox:{width:390,height:608},sharedStorage:new Map(),address:{search:'?hangar=carrier&vessel=rift-carrier'}});
 q.click('hangar-scale-free-fly');liftOff(q);
 const {p,scaleFlyShips:s,arena}=q.inspect(),hp=p.hp;
 Object.assign(p,{x:arena.right-220,y:1000,vx:0,vy:0});
 q.step(5);assert.equal(s.sector,0,'the red line itself is not a portal');
 q.key('keydown','KeyD');for(let i=0;i<500&&!s.sector;i++)q.step();q.key('keyup','KeyD');
 assert.equal(s.sector,1);assert.equal(s.fighterSector,1);assert.ok(p.x<arena.left+450&&p.vx>0);assert.equal(p.hp,hp);
 assert.ok(s.fleet.every(h=>h.sector===0),'only the piloted fighter crossed');
 assert.match(q.el['scale-fly-readout'].textContent,/Entered Scale Range 2/);
 q.click('scale-fly-overview');q.click('scale-helm-resolute');const h=s.corvette;
 assert.equal(s.sector,0);
 Object.assign(h,{x:1500,y:arena.top+300,yaw:0,wanted:0,vx:0,vy:0});
 q.key('keydown','KeyW');for(let i=0;i<500&&!s.sector;i++)q.step();q.key('keyup','KeyW');
 assert.equal(s.sector,1);assert.equal(h.sector,1);assert.equal(s.carrier.sector,0);assert.equal(s.frigate.sector,0);
 assert.ok(h.y>arena.bottom-600&&h.vy<0&&!h.slowTurn);
 assert.equal(q.el['scale-fly-gun-weapon'].textContent,'Twin-barrel turrets');
});

test('Crosswind drive-by fire hits high-HP dummies without damage to the pilot or cross-range hits',()=>{
 const q=setup({redGrinSim:true,cockpitUI:true,flightShell:true,buildUI:true,reducedMotion:true,
  address:{search:'?hangar=carrier&vessel=rift-carrier'}});
 q.click('hangar-scale-free-fly');q.click('scale-fly-overview');q.click('scale-helm-crosswind');
 const {p,scaleFlyShips:s}=q.inspect(),h=s.frigate,live=s.targets.find(a=>a.sector===0),other=s.targets.find(a=>a.sector===1);
 Object.assign(live,{x:h.x+260,y:h.y});Object.assign(other,{x:live.x,y:live.y});
 const initial=p.hp;q.click('scale-auto-move');q.step(30);const y=h.y;
 q.click('scale-fire-starboard');const first=s.helmShots[0];
 Object.assign(live,{x:first.x+first.vx*.48,y:first.y+first.vy*.48});Object.assign(other,{x:live.x,y:live.y});
 q.step(73);
 assert.ok(live.hp>0&&live.hp<live.maxHp);assert.equal(other.hp,other.maxHp);
 assert.ok(h.y<y-5);assert.equal(p.hp,initial);
});

test('impact shares velocity in both directions and the heavier hull changes speed less',()=>{
 const make=()=>{
  const q=setup({redGrinSim:true,cockpitUI:true,flightShell:true,buildUI:true,reducedMotion:true,
   address:{search:'?hangar=carrier&vessel=rift-carrier'}});
  q.click('hangar-scale-free-fly');return q;
 };
 const q=make();liftOff(q);
 const {p,scaleFlyShips:s}=q.inspect(),h=s.frigate;
 Object.assign(p,{x:h.x-74,y:h.y-40,vx:185,vy:0});
 for(let i=0;i<30&&h.vx===0;i++)q.step();
 assert.ok(h.vx>0&&h.vx<185-p.vx,'the fighter nudges a stationary heavy target');
 const v=h.vx;Object.assign(p,{x:h.x+76,y:h.y-40,vx:0,vy:0});h.vx=130;
 for(let i=0;i<30&&p.vx===0;i++)q.step();
 assert.ok(p.vx>v,'a moving heavy hull pushes the fighter farther');
 assert.ok(h.vx>0&&130-h.vx<p.vx,'the heavy hull also slows, by less');
});

test('Hyperdrive holds a four-second spool then launches a short boost with cooldown and cancels on handoff',()=>{
 const q=setup({redGrinSim:true,cockpitUI:true,flightShell:true,buildUI:true,reducedMotion:true,
  address:{search:'?hangar=carrier&vessel=rift-carrier'}});
 q.click('hangar-scale-free-fly');q.click('scale-fly-overview');q.click('scale-helm-crosswind');
 const {scaleFlyShips:s}=q.inspect(),h=s.frigate,button=q.el['scale-hyperdrive'];
 assert.equal(button.hidden,false);
 assert.equal(button.disabled,true);assert.match(button.textContent,/Build speed/);
 q.click('scale-hyperdrive');q.step(15);assert.equal(h.drive.chargeAt,null);
 q.click('scale-auto-move');q.step(135);assert.equal(button.disabled,false);
 const y=h.y,notes=()=>q.fallbackNotes.map(note=>note.frequency.sets[0]?.[0]);
 q.click('scale-hyperdrive');q.step(225);
 assert.match(button.textContent,/Spooling 1s/);assert.ok(h.y<y-100&&-h.vy<h.profile.max);
 assert.ok(notes().includes(95)&&notes().includes(215),'charge plays its rising audio cues');
 q.step(26);assert.equal(button.textContent,'Hyperdrive burst');assert.equal(button.disabled,true);
 q.step(45);assert.ok(h.vy<-h.profile.max*1.7);assert.ok(h.y<y-125);
 assert.ok(notes().includes(74)&&notes().includes(109),'boost plays its launch sound');
 q.step(65);assert.equal(button.textContent,'Drive cooldown');assert.equal(button.disabled,true);
 q.click('scale-helm-resolute');q.click('scale-auto-move');q.step(135);
 q.click('scale-hyperdrive');assert.notEqual(s.corvette.drive.chargeAt,null);
 q.click('scale-auto-move');q.step(90);assert.equal(s.corvette.drive.chargeAt,null,'slowing down cancels the spool');
 q.click('scale-auto-move');q.step(135);q.click('scale-hyperdrive');assert.notEqual(s.corvette.drive.chargeAt,null);
 q.click('scale-helm-pegasus');assert.equal(s.corvette.drive.chargeAt,null);
});

test('edge assist chooses the open arc when Resolute is in the turning lane',()=>{
 const q=setup({redGrinSim:true,cockpitUI:true,flightShell:true,buildUI:true,reducedMotion:true,
  address:{search:'?hangar=carrier&vessel=rift-carrier'}});
 q.click('hangar-scale-free-fly');q.click('scale-fly-overview');q.click('scale-helm-crosswind');
 const {scaleFlyShips:s,arena}=q.inspect(),h=s.frigate,b=s.corvette;
 const pose=(ship,x,y,a)=>{
  Object.assign(ship,{x,y,yaw:a,wanted:a,vx:0,vy:0});
  for(const part of s.hulls[ship.group]){
   part.x=x+part.lx*Math.cos(a)-part.ly*Math.sin(a);part.y=y+part.lx*Math.sin(a)+part.ly*Math.cos(a);
  }
 };
 pose(h,arena.right-s.lengths[1]/2-240,1450,Math.PI/2);
 pose(b,h.x+220,h.y+385,0);
 q.click('scale-auto-move');q.step(5);
 assert.ok(h.slowTurn?.edge);assert.equal(h.slowTurn.side,-1,'the ship takes the north swing away from Resolute');
 const y=h.y;
 q.step(268);assert.ok(h.y<y-45);assert.equal(s.sector,0);
 assert.equal(b.vx,0);assert.equal(b.vy,0);
});

test('a heavy hull transfers momentum to a lighter large ship rather than stopping both',()=>{
 const q=setup({redGrinSim:true,cockpitUI:true,flightShell:true,buildUI:true,reducedMotion:true,
  address:{search:'?hangar=carrier&vessel=rift-carrier'}});
 q.click('hangar-scale-free-fly');q.click('scale-fly-overview');q.click('scale-helm-crosswind');
 const {scaleFlyShips:s}=q.inspect(),h=s.frigate,b=s.corvette;
 const position=(ship,x,y)=>{
  Object.assign(ship,{x,y,yaw:0,wanted:0,vx:0,vy:0});
  for(const part of s.hulls[ship.group]){part.x=x+part.lx;part.y=y+part.ly;}
 };
 position(h,3100,1200);position(b,3100,590);
 q.key('keydown','KeyW');for(let i=0;i<450&&b.vy>=-1;i++)q.step();q.key('keyup','KeyW');
 assert.ok(b.vy< -1,'Resolute picks up motion from the heavier Crosswind');
 const start=b.y;q.step(10);assert.ok(b.y<start);
});

test('Rift-3 can fire in flight to drain and test recharging large-ship shields, never while parked',()=>{
 const storage=new Map();
 const q=setup({redGrinSim:true,cockpitUI:true,flightShell:true,buildUI:true,reducedMotion:true,initialHe3:20,
  sharedStorage:storage,address:{search:'?hangar=carrier&vessel=rift-carrier'}});
 q.click('hangar-scale-free-fly');const {p,scaleFlyShips:s}=q.inspect(),saved=[...storage];
 const initial=s.frigate.shield;
 q.click('fire-button');assert.equal(s.helmShots.length,0);
 liftOff(q);
 const cell=s.hulls[1].reduce((a,b)=>b.y+b.r>a.y+a.r?b:a);
 Object.assign(p,{x:cell.x,y:s.frigate.y+s.lengths[1]*.57+170,vx:0,vy:0});
 q.click('fire-button');assert.ok(s.helmShots.some(shot=>shot.group===-1));
 q.step(65);assert.ok(s.frigate.shield<initial);assert.equal(s.carrier.shield,s.carrier.shieldMax);
 assert.ok(s.frigate.shieldRipples.length>0,'hit location anchors a shield ripple beyond the stern');
 assert.ok(Math.sin(s.frigate.shieldRipples[0].angle)>.9);
 const low=s.frigate.shield;q.step(390);assert.ok(s.frigate.shield>low);
 const full=s.frigate.shield;Object.assign(p,{x:s.frigate.x,y:s.frigate.y,vx:0,vy:0,he3:20});
 q.click('fire-button');assert.ok(s.helmShots.some(shot=>shot.firedInside.includes(1)));
 q.step(65);assert.equal(s.frigate.shield,full,'a sheltered fighter fires out without hitting the shield');
 assert.deepEqual([...storage],saved);
});

test('Simulator tab owns every simulation and normal flight stays in its own picker',()=>{
 const q=setup({redGrinSim:true,cockpitUI:true,cockpitTabs:true,flightShell:true,buildUI:true,reducedMotion:true,
  pilotCredits:{getBuildState:()=>({origin:'legacy',owned:[]}),owns:()=>false},
  savedHull:JSON.stringify({version:1,hull:'rift-fighter',condition:'repaired',repairedAt:1}),
  address:{search:'?hangar=carrier&vessel=rift-carrier'}});
 q.click('hangar-board');
 assert.equal(q.el['hangar-cockpit'].hidden,false);
 q.click('cockpit-add-mode');
 const ids=()=>Array.from(q.el['cockpit-order'].options,o=>o.value).filter(Boolean);
 assert.deepEqual(ids(),['free-flight']);
 q.click('cockpit-mode-simulator');
 assert.deepEqual(ids(),['practice','fighter-battle','large-scale-battle','scale-free-fly','red-grin-solo','red-grin-escort','solo-training']);
 q.click('cockpit-mode-solo');assert.deepEqual(ids(),['free-flight']);
});

test('Resolute has four independent single pulses and optional AI that aims and fires only in range',()=>{
 const q=setup({redGrinSim:true,cockpitUI:true,flightShell:true,buildUI:true,reducedMotion:true,
  address:{search:'?hangar=carrier&vessel=rift-carrier'}});
 q.click('hangar-scale-free-fly');q.click('scale-fly-overview');q.click('scale-helm-resolute');
 const {scaleFlyShips:s}=q.inspect(),h=s.corvette;
 const ids=['port-forward','starboard-forward','port-aft','starboard-aft'].map(i=>'scale-turret-'+i);
 const ai=q.el['scale-turret-ai'];
 assert.equal(ai.attrs['aria-pressed'],'false');
 assert.equal(q.el['scale-fire-port'].hidden,true);
 for(const [i,id] of ids.entries()){
  assert.equal(q.el[id].disabled,false);q.click(id);assert.equal(q.el[id].disabled,true);
  assert.equal(s.helmShots.filter(shot=>shot.turret===i).length,2);
 }
 const pulse=new Set(s.helmShots);q.step(28);
 assert.ok(s.helmShots.every(shot=>pulse.has(shot)),'no extra shots queued after pressing the four triggers');
 q.step(75);assert.ok(ids.every(id=>!q.el[id].disabled));
 const dummy=s.targets[0];Object.assign(dummy,{x:h.x+215,y:h.y,hp:dummy.maxHp});
 const other=s.targets[1];Object.assign(other,{x:h.x+260,y:h.y+10});
 q.step(45);assert.equal(dummy.hp,dummy.maxHp,'Manual never fires without a tap');
 q.click('scale-turret-ai');assert.equal(ai.attrs['aria-pressed'],'true');
 assert.ok(ids.every(id=>q.el[id].disabled));
 q.step(190);assert.ok(dummy.hp<dummy.maxHp);
 assert.ok(h.resoluteGuns[1].readyAt>0&&h.resoluteGuns[3].readyAt>0);
 q.click('scale-turret-ai');assert.equal(ai.attrs['aria-pressed'],'false');
});

test('Lift off rises gradually before the Rift-3 leaves the pad at full flight size',()=>{
 const q=setup({redGrinSim:true,cockpitUI:true,flightShell:true,buildUI:true,sprite:true,initialHe3:20,
  canvasBox:{width:390,height:608},address:{search:'?hangar=carrier&vessel=rift-carrier'}});
 q.click('hangar-scale-free-fly');
 const {p,scaleFlyShips:s}=q.inspect(),pad=s.parked,button=q.el['scale-fly-land'];
 const sprite=q.sprites.find(a=>a.src?.includes('fighter-winged.png'));sprite.complete=true;sprite.naturalWidth=760;
 const width=()=>q.spriteFrames.filter(f=>f.asset===sprite).at(-1).bounds[2];
 q.step();const small=width();
 q.click('scale-fly-land');
 assert.equal(p.y,pad.y);assert.equal(s.launching.lift,0);
 assert.equal(button.disabled,true);assert.match(button.textContent,/Lifting off/);
 q.step(15);
 assert.equal(p.y,pad.y,'first part lifts over the pad before sliding forward');
 assert.ok(width()>small);assert.ok(s.launching.lift>0&&s.launching.lift<.2);
 q.click('fire-button');assert.equal(s.helmShots.length,0);
 q.step(34);const halfway=width();
 assert.ok(s.launching&&p.y<pad.y);assert.ok(halfway>small&&halfway<small/s.parkedScale);
 q.step(40);
 assert.equal(s.launching,null);assert.ok(p.y<pad.y-10);
 assert.ok(Math.abs(width()-small/s.parkedScale)<1e-8);
 q.click('fire-button');assert.ok(s.helmShots.some(a=>a.group===-1));
});

test('shield hits paint a wider inward bloom alongside the perimeter ripple, then fade',()=>{
 const q=setup({redGrinSim:true,cockpitUI:true,flightShell:true,buildUI:true,traceClashPaint:true,reducedMotion:true,
  address:{search:'?hangar=carrier&vessel=rift-carrier'}});
 q.click('hangar-scale-free-fly');q.click('scale-fly-overview');
 const {scaleFlyShips:s}=q.inspect(),h=s.frigate;
 const bloom=()=>q.radialPaint.filter(a=>a.stops.includes('#80d9ffba'));
 const rx=s.widths[1]*.64+42;
 assert.equal(bloom().length,0);
 h.shieldHitAt=0;h.shieldRipples.push({angle:0,at:0,broken:false});
 q.step(5);
 assert.ok(bloom().length>0);
 const [x,y,,,,r]=bloom().at(-1).args;
 assert.ok(x<rx&&x>rx*.50&&Math.abs(y)<1e-9,'the bloom starts inside the side of the shield');
 assert.ok(r>rx*.40,'the glow fills an area, not just a border stroke');
 assert.ok(q.strokePaint.some(line=>line.color==='#a6f4ff'),'the original ripple remains');
 q.step(12);
 const [laterX,,,,,laterR]=bloom().at(-1).args;
 assert.ok(laterX<x&&laterR>r,'the glow travels farther inward and spreads');
 q.step(42);const count=bloom().length;q.step(5);assert.equal(bloom().length,count);
});

test('the warped hex haze spans the dome but appears only during a shield hit',()=>{
 const q=setup({redGrinSim:true,cockpitUI:true,flightShell:true,buildUI:true,traceClashPaint:true,reducedMotion:true,
  address:{search:'?hangar=carrier&vessel=rift-carrier'}});
 q.click('hangar-scale-free-fly');q.click('scale-fly-overview');q.step(8);
 const {scaleFlyShips:s}=q.inspect(),h=s.frigate;
 const haze=()=>q.strokePaint.filter(a=>a.color==='#86d6ff');
 assert.equal(haze().length,0);assert.equal(h.shieldHex,undefined);
 h.shieldRipples.push({angle:0,at:0,broken:false});h.shieldHitAt=0;
 q.step(4);
 const mesh=h.shieldHex,rx=s.widths[1]*.64+42,ry=s.lengths[1]*.57+30;
 assert.ok(haze().at(-1).alpha>0&&haze().at(-1).alpha<.15);
 assert.ok(haze().at(-1).alpha<q.strokePaint.filter(a=>a.color==='#a6f4ff').at(-1).alpha);
 assert.ok(mesh.verts.some((v,i)=>i%2===0&&v<-rx*.95));
 assert.ok(mesh.verts.some((v,i)=>i%2===0&&v>rx*.95));
 assert.ok(mesh.verts.some((v,i)=>i%2===1&&v<-ry*.95));
 assert.ok(mesh.verts.some((v,i)=>i%2===1&&v>ry*.95));
 q.step(45);const finished=haze().length;q.step(12);
 assert.equal(haze().length,finished);assert.equal(h.shieldHex,mesh);
});

test('glancing collisions spin both ships, with larger hulls resisting rotation',()=>{
 const q=setup({redGrinSim:true,cockpitUI:true,flightShell:true,buildUI:true,reducedMotion:true,
  address:{search:'?hangar=carrier&vessel=rift-carrier'}});
 q.click('hangar-scale-free-fly');liftOff(q);
 const {p,scaleFlyShips:s}=q.inspect(),h=s.frigate,yaw=h.yaw,aim=p.aim;
 Object.assign(p,{x:h.x-92,y:h.y-170,vx:188,vy:46});
 for(let i=0;i<30&&Math.abs(h.impactSpin)<.001;i++)q.step();
 assert.ok(Math.abs(h.impactSpin)>.01,'off-center hit gives Crosswind torque');
 assert.ok(Math.abs(p.impactSpin)>Math.abs(h.impactSpin),'lighter fighter spins more on the glancing impact');
 q.step(15);assert.ok(Math.abs(h.yaw-yaw)>.004&&Math.abs(p.aim-aim)>.01);
});

test('only unshielded ballistic, cannon and missile impacts can push and spin a capital hull',()=>{
 const impact=(kind,dy,shield=0)=>{
  const q=setup({redGrinSim:true,cockpitUI:true,flightShell:true,buildUI:true,reducedMotion:true,
   address:{search:'?hangar=carrier&vessel=rift-carrier'}});
  q.click('hangar-scale-free-fly');liftOff(q);
  const {scaleFlyShips:s,p}=q.inspect(),h=s.frigate;
  h.shield=shield;h.shieldHitAt=1000;
  Object.assign(p,{x:1200,y:1000,vx:0,vy:0});
  const shot={group:kind==='cannon'?2:-1,weapon:kind==='cannon'?'blaster':kind,redGrinCannon:kind==='cannon',
   sector:0,life:2.1,x:h.x-260,y:h.y+dy,vx:550,vy:0,a:0,damage:5};
  s.helmShots.push(shot);
  for(let i=0;i<80&&s.helmShots.includes(shot);i++)q.step();
  assert.ok(!s.helmShots.includes(shot),'the shot actually hit');
  return h;
 };
 const high=impact('ballistic',-120),low=impact('ballistic',120),central=impact('ballistic',0);
 assert.ok(high.impactSpin>.007&&low.impactSpin<-.007,'opposite sides of the center turn opposite ways');
 assert.ok(central.vx>0&&Math.abs(central.impactSpin)<1e-8,'a centered hit only translates the hull');
 for(const type of ['cannon','missile'])assert.ok(impact(type,-120).impactSpin>high.impactSpin);
 const laser=impact('blaster',-120);assert.equal(laser.vx,0);assert.equal(laser.impactSpin,0);
 const shielded=impact('ballistic',-120,40);
 assert.equal(shielded.shield,35);assert.equal(shielded.vx,0);assert.equal(shielded.impactSpin,0);
});

test('an overpowered kinetic shot leaves three broken hexes and carries only its remaining damage to the hull',()=>{
 const q=setup({redGrinSim:true,cockpitUI:true,flightShell:true,buildUI:true,traceClashPaint:true,reducedMotion:true,
  address:{search:'?hangar=carrier&vessel=rift-carrier'}});
 q.click('hangar-scale-free-fly');q.click('scale-fly-overview');
 const {scaleFlyShips:s}=q.inspect(),h=s.frigate;
 const send=weapon=>{
  const a={group:-1,weapon,sector:0,life:2,x:h.x-260,y:h.y-120,vx:550,vy:0,a:0,damage:5};
  s.helmShots.push(a);return a;
 };
 h.shield=8;h.shieldHitAt=0;const soaked=send('ballistic');
 for(let i=0;i<55&&s.helmShots.includes(soaked);i++)q.step();
 assert.equal(h.shield,3);assert.equal(h.shieldRipples.at(-1).penetrated,false);assert.equal(h.vx,0);
 const through=send('ballistic');
 for(let i=0;i<55&&h.shield>0;i++)q.step();
 assert.equal(h.shield,0);assert.ok(s.helmShots.includes(through));assert.equal(through.damage,2);
 assert.equal(h.vx,0,'the hull has not been hit yet');
 assert.equal(h.shieldRipples.at(-1).cells.length,3);
 assert.ok(!q.strokePaint.some(e=>e.color==='#ffd8af'),'no long shard outlines are painted');
 assert.ok(q.radialPaint.some(e=>e.stops.includes('#a4d5ff85')),'the breach uses a diffuse cool bloom');
 assert.ok(!q.radialPaint.some(e=>e.stops.includes('#fff6d0')),'the bright yellow flash is gone');
 for(let i=0;i<55&&s.helmShots.includes(through);i++)q.step();
 assert.ok(h.vx>0&&h.impactSpin>0,'the same round reaches and turns the hull');
 h.shield=3;h.vx=0;h.impactSpin=0;const laser=send('blaster');
 for(let i=0;i<55&&s.helmShots.includes(laser);i++)q.step();
 assert.equal(h.shield,0);assert.equal(h.shieldRipples.at(-1).penetrated,false);
 assert.equal(h.vx,0);assert.ok(!s.helmShots.includes(laser));
});

test('a ballistic burst shows the breach even when the first round drains the shield to exactly zero',()=>{
 const q=setup({redGrinSim:true,cockpitUI:true,flightShell:true,buildUI:true,traceClashPaint:true,reducedMotion:true,
  address:{search:'?hangar=carrier&vessel=rift-carrier'}});
 q.click('hangar-scale-free-fly');q.click('scale-fly-overview');
 const {scaleFlyShips:s}=q.inspect(),h=s.corvette;
 const a={group:-1,weapon:'ballistic',sector:0,life:1.6,x:h.x-230,y:h.y-50,vx:570,vy:0,a:0,damage:5};
 const b={...a,x:a.x-25},c={...a,x:a.x-50};
 h.shield=5;h.shieldHitAt=0;s.helmShots.push(a,b,c);
 for(let i=0;i<60&&s.helmShots.includes(a);i++)q.step();
 assert.equal(h.shield,0);assert.equal(h.shieldRipples.at(-1).penetrated,false);
 assert.equal(h.shieldRipples.at(-1).depleted,true);
 assert.ok(q.strokePaint.some(r=>r.color==='#c9eaff'),'a separate whole-dome collapse appears on exact zero');
 assert.ok(!q.strokePaint.some(r=>r.color==='#ffd8af'),'the absorbed shot has not punched a hole');
 assert.ok(s.helmShots.includes(b));assert.equal(h.vx,0);
 for(let i=0;i<20&&!h.shieldRipples.some(r=>r.penetrated);i++)q.step();
 assert.ok(s.helmShots.includes(b));assert.equal(b.damage,5);
 assert.equal(h.shieldRipples.at(-1).cells.length,3);
 assert.equal(h.shieldRipples.at(-1).depleted,false);
 q.step(30);assert.equal(h.shieldRipples.filter(r=>r.penetrated).length,1);
 assert.ok(h.vx>0,'the following round is free to strike the hull');
});

test('a depleted shield flickers three times, with a single fade in reduced motion',()=>{
 for(const reducedMotion of [false,true]){
  const q=setup({redGrinSim:true,cockpitUI:true,flightShell:true,buildUI:true,traceClashPaint:true,reducedMotion,canvasBox:{width:390,height:608},
   address:{search:'?hangar=carrier&vessel=rift-carrier'}});
  q.click('hangar-scale-free-fly');q.click('scale-fly-overview');
  const {scaleFlyShips:s}=q.inspect(),h=s.frigate;
  h.shieldHitAt=0;h.shield=0;h.shieldRipples.push({angle:0,at:0,depleted:true});
  let last=false,on=0;
  for(let i=0;i<110;i++){
   const count=q.strokePaint.length;q.step();
   const lit=q.strokePaint.slice(count).some(x=>x.color==='#c9eaff'&&x.alpha>.025);
   if(lit&&!last)on++;
   last=lit;
  }
  assert.equal(on,reducedMotion?1:3);
  assert.equal(last,false);
 }
});

test('each depletion rolls 5 to 10 mixed-size glass chips once, including exact-zero breaks',()=>{
 const q=setup({redGrinSim:true,cockpitUI:true,flightShell:true,buildUI:true,
  address:{search:'?hangar=carrier&vessel=rift-carrier'}});
 q.click('hangar-scale-free-fly');q.click('scale-fly-overview');
 const {scaleFlyShips:s}=q.inspect(),h=s.frigate,counts=new Set();
 for(let i=0;i<36;i++){
  const weapon=i%2?'blaster':'ballistic';
  h.shield=i%3===0?4:5;h.shieldHitAt=Infinity;h.shieldRipples.length=0;h.shieldCollapseUntil=0;
  const shot={group:-1,weapon,sector:0,life:2,x:h.x-258+i*.1,y:h.y-110+i,vx:550,vy:0,a:0,damage:5};
  s.helmShots.push(shot);
  for(let step=0;step<55&&h.shield>0;step++)q.step();
  const impact=h.shieldRipples.at(-1);
  assert.equal(h.shield,0);assert.equal(impact.depleted,true);
  assert.ok(impact.chips.length>=5&&impact.chips.length<=10);
  assert.ok(new Set(Array.from(impact.chips,c=>c.size)).size>1);
  counts.add(impact.chips.length);
  const pieces=impact.chips;
  q.step(3);
  assert.equal(impact.chips,pieces,'chip shape, count and trajectory stay fixed across frames');
  for(const r of h.shieldRipples.filter(r=>!r.depleted))assert.equal(r.chips,undefined);
  s.helmShots.length=0;
 }
 assert.deepEqual([...counts].sort((a,b)=>a-b),[5,6,7,8,9,10]);
});

test('a full shield reveals its hexes with a moving wave at varied intervals, not an outline flash',()=>{
 const cue=stroke=>stroke.color?.stops?.some(([,color])=>color==='#c5f3ff');
 for(const reducedMotion of [false,true]){
  const q=setup({redGrinSim:true,cockpitUI:true,flightShell:true,buildUI:true,traceClashPaint:true,reducedMotion,canvasBox:{width:390,height:608},
   address:{search:'?hangar=carrier&vessel=rift-carrier'}});
  q.click('hangar-scale-free-fly');q.click('scale-fly-overview');
  const {scaleFlyShips:s}=q.inspect(),h=s.frigate;
  for(const ship of [s.carrier,s.corvette]){ship.shield=0;ship.shieldHitAt=Infinity;}
  q.step();
  let previous=-Infinity,dark=0;const waves=[];
  for(let i=0;i<1200;i++){
   const mark=q.strokePaint.length;q.step();
   const at=h.shieldFullCue.startedAt;
   if(at>previous){waves.push({at,frames:[]});previous=at;}
   const strokes=q.strokePaint.slice(mark);
   assert.ok(!strokes.some(x=>x.color==='#79cbe9'),'the old rim is gone');
   const painted=strokes.filter(cue).at(-1);
   if(painted){
    const layers=strokes.filter(cue);
    assert.equal(layers.length,4,'two faint edge layers, a hex glow, and the hex crest');
    assert.ok(layers.slice(0,2).every(layer=>layer.alpha<.06),'shade never turns into a bright rim');
    assert.ok(layers.every(layer=>layer.color===painted.color),'shade travels with the hex wave');
    waves.at(-1).frames.push(painted);
   }else dark++;
  }
  assert.ok(waves.length>=3);
  const intervals=waves.slice(1).map(({at},i)=>at-waves[i].at);
  assert.ok(intervals.every(sec=>sec>=4&&sec<=6.018));
  assert.ok(new Set(intervals.map(sec=>sec.toFixed(2))).size>1);
  const mesh=h.shieldShimmerMesh.verts,full=h.shieldHex.verts,rx=s.widths[1]*.64+42,ry=s.lengths[1]*.57+30;
  assert.ok(mesh.length>0&&mesh.length<full.length,'healthy shimmer draws only complete inset hexes');
  assert.ok(mesh.every((x,i)=>i%2||(x/rx)**2+(mesh[i+1]/ry)**2<(1-12/Math.min(rx,ry))**2));
  const frames=waves[0].frames;
  assert.ok(frames.length>(reducedMotion?45:125));
  assert.ok(frames[0].alpha<frames[Math.floor(frames.length/2)].alpha);
  assert.ok(frames.at(-1).alpha<frames[Math.floor(frames.length/2)].alpha);
  assert.equal(reducedMotion,frames[0].color.ends[1]===frames.at(-1).color.ends[1]);
  if(!reducedMotion)assert.ok(frames[0].color.ends[1]<0&&frames.at(-1).color.ends[1]>0);
  assert.ok(dark>400,'no permanent glow between waves');
  assert.ok(Math.max(...frames.map(f=>f.alpha))>=(reducedMotion?.56:.83),'the hex crest is bright enough to read in fleet overview');
  h.shield=h.shieldMax-1;h.shieldHitAt=Infinity;
  const mark=q.strokePaint.length;q.step(440);
  assert.equal(h.shieldFullCue,null);
  assert.ok(!q.strokePaint.slice(mark).some(cue));
  h.shield=h.shieldMax;q.step();
  assert.equal(h.shieldFullCue.startedAt,-Infinity,'refilling starts a fresh quiet interval');
 }
});


test('breaking glass starts across an inside arc and stays clipped to the shield dome',()=>{
 const glass=[];
 const q=setup({redGrinSim:true,cockpitUI:true,flightShell:true,buildUI:true,shieldGlassPaint:glass,
  address:{search:'?hangar=carrier&vessel=rift-carrier'}});
 q.click('hangar-scale-free-fly');q.click('scale-fly-overview');
 const {scaleFlyShips:s}=q.inspect(),h=s.frigate;
 for(const angle of [0,Math.PI/4,Math.PI/2,Math.PI,3*Math.PI/2]){
  const hit={angle,at:0,depleted:true,penetrated:true,broken:true};
  h.shieldRipples.length=0;
  // Capture the simulation clock without needing an exposed render hook.
  q.step(2);
  hit.at=q.inspect().elapsed;
  h.shieldRipples.push(hit);
  glass.length=0;q.step();
  assert.ok(glass.length>=5&&glass.length<=10);
  const positions=glass.map(({translation:[x,y],clip})=>{
   assert.ok(clip,'the chips use the dome as a canvas clip');
   const [cx,cy,rx,ry,left,right]=clip;
   assert.ok(right-left<Math.PI,'the clip is restricted to the opening, not the whole dome');
   assert.equal(cx,0);assert.equal(cy,0);
   assert.ok((x/rx)**2+(y/ry)**2<1);
   const d=Math.atan2(y/ry,x/rx)-angle;
   return Math.atan2(Math.sin(d),Math.cos(d));
  });
  assert.ok(Math.max(...positions)-Math.min(...positions)>.19,'chip origins span a curved strip');
  const initial=glass.map(piece=>piece.translation);
  glass.length=0;q.step(16);
  assert.ok(glass.length>=initial.length);
  let floated=false;
  for(let i=0;i<glass.length;i++){
   const [x,y]=glass[i].translation,[x0,y0]=initial[i%initial.length],drift=Math.hypot(x-x0,y-y0);
   assert.ok(drift<=2.31,'each chip hovers with no outward spray');
   floated||=drift>.01;
  }
  assert.ok(floated);
 }
});
