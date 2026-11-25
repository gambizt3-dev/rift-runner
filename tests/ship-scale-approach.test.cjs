const {test}=require('node:test');
const assert=require('node:assert/strict');
const {setup}=require('./ballistic.test.cjs');
function launch(){
 const q=setup({redGrinSim:true,cockpitUI:true,flightShell:true,buildUI:true,reducedMotion:true,initialHe3:0,
  canvasBox:{width:390,height:608},sharedStorage:new Map(),
  address:{search:'?hangar=carrier&vessel=rift-carrier',hostname:'rift.example',origin:'https://rift.example'}});
 q.click('hangar-scale-free-fly');return q;
}
for(const [label,group,axis,code] of [['Crosswind',1,'y','KeyW'],['Resolute',2,'x','KeyA'],['Pegasus',0,'y','KeyW']]){
 test(label+' continuous approach from open space at phone size',()=>{
  const q=launch(),{p,scaleFlyShips}=q.inspect();
  const pad=scaleFlyShips.pads.filter(p=>p.group===group).at(-1);
  Object.assign(p,{x:pad.x+(axis==='x'?240:0),y:axis==='y'?1570:pad.y,vx:0,vy:0});
  let pressed=false,closest=Infinity;
  for(let i=0;i<900&&q.el['scale-fly-land'].hidden;i++){
   const remaining=p[axis]-pad[axis],travel=Math.abs(axis==='x'?p.vx:p.vy);
   closest=Math.min(closest,Math.abs(remaining));
   const push=remaining>Math.max(7,travel*.34);
   if(push!==pressed){q.key(push?'keydown':'keyup',code);pressed=push;}
   q.step();
  }
  if(pressed)q.key('keyup',code);
  assert.equal(q.el['scale-fly-land'].hidden,false,JSON.stringify({x:p.x,y:p.y,targetX:pad.x,targetY:pad.y,closest}));
  q.click('scale-fly-land');assert.equal(scaleFlyShips.parked,pad);
  q.click('scale-fly-land');q.step(30);
  assert.ok(p.y<pad.y);assert.equal(q.inspect().camera.zoom,1);
 });
}
