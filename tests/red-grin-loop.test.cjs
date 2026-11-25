const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const read=name=>fs.readFileSync(new URL('../'+name,'file:'+__filename),'utf8');
const src=read('game.js');
const section=(start,end)=>src.slice(src.indexOf(start),src.indexOf(end,src.indexOf(start)+1));
function scenario(){
 let hudChanges=0;
 const ctx={window:{},redGrinSoloArt:null,launch:{x:480},elapsed:10,p:{hp:10,maxHp:10,x:480,y:989},state:'play',
  duelResult:null,vandulLasers:[],clamp:(x,a,b)=>Math.max(a,Math.min(b,x)),
  placeBlackwakeTurret(){},firstSightCover(){return ctx.blocked;},motion:{matches:true},
  updateDuelReadout(){hudChanges++;},emitRedGrinMuzzleClouds(){},nearBattleGain(){return 0;},
  menu(...args){ctx.summary=args;},button(label,action){return label+':'+action;},
  overlay:{innerHTML:'',querySelector(){return null;}}};
 vm.runInNewContext(read('red-grin-broadside.js'),ctx);
 vm.runInNewContext(section('function makeRedGrinSolo(', 'function playRedGrinCannonPulse(')+'\nship=makeRedGrinSolo();',ctx);
 ctx.pirateCapitals=[ctx.ship];
 const tick=(increment,{face=true,reverse=false}={})=>{
  ctx.elapsed+=increment;
  const phase=ctx.ship.phase+increment*.225;
  if(face){
   const x=ctx.launch.x+142*Math.cos(phase),y=633+111*Math.sin(phase);
   const heading=Math.atan2(-142*Math.sin(phase),-111*Math.cos(phase));
   ctx.p.x=x+(reverse?-1:1)*240*Math.cos(heading);
   ctx.p.y=y+(reverse?-1:1)*240*Math.sin(heading);
  }
  ctx.advanceRedGrinSolo(ctx.ship,increment,[]);
 };
 return {ctx,tick,changes:()=>hudChanges};
}
test('briefing, warning, staggered volley, and reload give distinct windows',()=>{
 const {ctx,tick,changes}=scenario();
 tick(2.1);assert.equal(ctx.ship.simPhase,'briefing');
 tick(.11);assert.equal(ctx.ship.simPhase,'charging');assert.equal(ctx.vandulLasers.length,0);
 tick(.8);assert.equal(ctx.vandulLasers.length,0);
 tick(.06);assert.equal(ctx.ship.simPhase,'firing');assert.equal(ctx.vandulLasers.length,1);
 for(let i=0;i<50&&ctx.ship.simPhase==='firing';i++)tick(.016);
 assert.equal(ctx.ship.simVolleys,1);assert.equal(ctx.vandulLasers.length,9);
 assert.equal(new Set(ctx.vandulLasers.map(s=>s.firedAt)).size,9);
 assert.equal(ctx.ship.simPhase,'reload');const count=changes();
 tick(.8);assert.equal(changes(),count);assert.equal(ctx.vandulLasers.length,9);
 tick(.5);assert.equal(ctx.ship.simPhase,'charging');
});
test('cover or changing sides during the warning cancels rather than snapping the cannons around',()=>{
 for(const type of ['cover','side']){
  const {ctx,tick}=scenario();tick(2.22);
  assert.equal(ctx.ship.simPhase,'charging');
  ctx.blocked=type==='cover';tick(.20,{reverse:type==='side'});
  assert.equal(ctx.ship.telegraph,null);assert.equal(ctx.ship.simPhase,'reload');
  assert.equal(ctx.vandulLasers.length,0);
 }
});
test('debrief reports the supplied fighter and offers rematch or hangar; next run starts clean',()=>{
 const {ctx,tick}=scenario();tick(2.23);tick(.86);ctx.elapsed=75;ctx.p.hp=3;ctx.ship.hp=0;
 ctx.showRedGrinDebrief(true);
 assert.equal(ctx.summary[0],'Red Grin disabled');
 assert.match(ctx.summary[1],/1:05.*Your hull 3\/10.*Red Grin hull 0\/66.*1 volley fired.*No credits/);
 assert.deepEqual(ctx.summary.slice(2),['reset','Rematch','SIMULATOR DEBRIEF']);
 assert.match(ctx.overlay.innerHTML,/Return to Hangar:main-menu/);
 const next=ctx.makeRedGrinSolo();assert.equal(next.simVolleys,0);assert.equal(next.hp,next.maxHp);assert.equal(next.simPhase,'briefing');
});
test('Hangar simulator button launches a supplied hull without testing owned hull condition',()=>{
 assert.match(read('index.html'),/id="hangar-red-grin-simulator"/);
 const stub={hidden:false,open:true,close(){this.open=false;}};
 let click,mode;
 const ctx={document:{hidden:false,getElementById(){return {addEventListener(name,fn){click=fn;}}}},
 window:{RiftRedGrinBroadside:{},RiftFrigateHulls:{crosswind:{}}},hangarDialog:stub,
 redGrinSoloFlight:{redGrinSolo:true,loaner:'rift-fighter'},state:'menu',routeParked:false,
 cockpitIsBifrost:()=>false,boarding:null,cockpitSession:null,formationStage:null,
 returnFlightToCarrier:false,hangarLaunching:false,
 start(m){mode=m;return true;},unlockAudio(){},syncArenaMusic(){}};
 vm.runInNewContext(section('const hangarSimulator=','cockpitExit?.addEventListener'),ctx);
 click({isTrusted:false});assert.equal(mode,undefined);
 click({isTrusted:true});assert.equal(mode,ctx.redGrinSoloFlight);
 assert.equal(stub.open,false);assert.equal(ctx.hangarLaunching,true);assert.equal(ctx.returnFlightToCarrier,true);
});
