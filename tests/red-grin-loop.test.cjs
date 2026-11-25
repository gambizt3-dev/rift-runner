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
 const ctx={document:{hidden:false,getElementById(id){return id==='hangar-red-grin-simulator'?{addEventListener(name,fn){click=fn;}}:null}},
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
test('Red Grin phase is readable on the battlefield without opening Settings',()=>{
 const html=read('index.html');
 assert.match(html,/<canvas id="game"[^]*?<output id="red-grin-stage-readout"[^]*?<details class="settings" id="arena-settings">/);
 assert.match(html,/#red-grin-stage-readout:not\(\[hidden\]\)\{[^}]*pointer-events:none/);
 const stage={hidden:true,dataset:{},textContent:''},settings={hidden:false};
 const ctx={redGrinStageReadout:stage,duelReadout:settings,flightMode:{redGrinSolo:true},duelResult:null,
  pirateCapitals:[{hp:66,maxHp:66,simPhase:'charging'}],isCrossBattleArena(){throw Error('unexpected branch');}};
 vm.runInNewContext(section('function updateDuelReadout(){',' if(isCrossBattleArena()){')+'\n}',ctx);
 ctx.updateDuelReadout();
 assert.equal(stage.hidden,false);assert.equal(settings.hidden,true);
 assert.match(stage.textContent,/Broadside incoming/);
 ctx.pirateCapitals[0].simPhase='reload';ctx.updateDuelReadout();assert.match(stage.textContent,/Your opening/);
 ctx.duelResult='victory';ctx.updateDuelReadout();assert.equal(stage.hidden,true);
 ctx.duelResult=null;ctx.pirateCapitals[0].simPhase='briefing';ctx.updateDuelReadout();assert.match(stage.textContent,/Approach the frigate/);
 ctx.flightMode={};ctx.updateDuelReadout();assert.equal(stage.hidden,true);assert.equal(stage.textContent,'');
});

function escort(){
 const {ctx}=scenario();
 ctx.p.x=480;ctx.p.y=989;ctx.launch.y=989;
 ctx.finishFourWay=()=>{ctx.vandulLasers=[];};
 ctx.clearInput=()=>{};ctx.syncArrivalControls=()=>{};
 ctx.contactTime=(x,y,dx,dy,r)=>{
  const a=dx*dx+dy*dy, b=2*(x*dx+y*dy),c=x*x+y*y-r*r,d=b*b-4*a*c;
  if(c<=0)return 0;if(!a||d<0)return null;
  const t=(-b-Math.sqrt(d))/(2*a);return t>=0&&t<=1?t:null;
 };
 ctx.headingDelta=(a,b)=>Math.atan2(Math.sin(b-a),Math.cos(b-a));
 ctx.blackwakeGimbal={muzzle:12};
 ctx.placeBlackwakeTurret=ship=>{ship.turret.x=ship.x;ship.turret.y=ship.y;};
 ctx.makeBlackwake=(at,aim,objective,name)=>({...at,name,turret:{aim,shots:0}});
 ctx.npcBattleShot=()=>{};ctx.burstRing=()=>{};
 const cargo=ctx.makeRedGrinConvoy();
 ctx.ship=ctx.makeConvoyRaider(cargo);ctx.pirateCapitals=[ctx.ship];
 const dt=1/120;
 function frame(position){
  position?.(cargo,ctx.p);
  ctx.elapsed+=dt;
  ctx.advanceRedGrinConvoy(cargo,dt);
  ctx.advanceConvoyRaider(ctx.ship,dt,[]);
  for(const bolt of ctx.vandulLasers){
   const dx=bolt.vx*dt,dy=bolt.vy*dt;
   if(ctx.contactTime(bolt.x-cargo.prevX,bolt.y-cargo.prevY,dx,dy-(cargo.y-cargo.prevY),cargo.r+2)!==null){
    cargo.hp=Math.max(0,cargo.hp-bolt.damage);bolt.life=0;
   }
   bolt.x+=dx;bolt.y+=dy;bolt.life-=dt;
  }
  ctx.vandulLasers=ctx.vandulLasers.filter(b=>b.life>0);
  ctx.finishRedGrinEscort(cargo);
 }
 return {ctx,cargo,frame};
}
test('abandoning the freighter halts its route and the single pirate turret can destroy it',()=>{
 const {ctx,cargo,frame}=escort();
 for(let i=0;i<13000&&!ctx.duelResult;i++)frame();
 assert.equal(ctx.duelResult,'lost');
 assert.equal(cargo.hp,0);
 assert.ok((cargo.fromY-cargo.y)/(cargo.fromY-cargo.gateY)<.3);
 assert.equal(ctx.summary[0],'Freighter lost');
});
test('pilot can draw turret fire so the freighter reaches the gate while the pirate survives',()=>{
 const {ctx,cargo,frame}=escort();
 for(let i=0;i<13000&&!ctx.duelResult;i++)frame((ship,p)=>{p.x=ship.x+148;p.y=ship.y+48;});
 assert.equal(ctx.duelResult,'victory');
 assert.ok(cargo.hp>0);
 assert.ok(ctx.elapsed-ctx.ship.simStartedAt>=47);
 assert.equal(ctx.ship.name,'Blackwake Raider');
 assert.equal(ctx.ship.simShield,undefined);
 assert.equal(ctx.ship.hp,ctx.ship.maxHp);
 assert.ok(ctx.ship.turret.shots>0);
 assert.equal(ctx.summary[0],'Freighter delivered');
 assert.match(ctx.summary[1],/100% of route.*No credits/);
});
test('disabling the pirate does not replace delivery, and the same shot sweep handles the convoy',()=>{
 const {ctx,cargo,frame}=escort();
 ctx.loseHull=(ship,damage)=>{ship.hp=Math.max(0,ship.hp-damage);};ctx.blast=()=>{};
 vm.runInNewContext(section('function damageBlackwake(', 'function damageAlliedHull('),ctx);
 ctx.damageBlackwake(ctx.ship,80);
 assert.equal(ctx.duelResult,null);
 for(let i=0;i<13000&&!ctx.duelResult;i++)frame((ship,p)=>{p.y=ship.y+100;});
 assert.equal(ctx.duelResult,'victory');
 const sweep=section('function sweepProjectiles(', 'const wingmanLeash=');
 assert.match(sweep,/queueBodyContacts\(t,\[redGrinConvoy\],events,true\)/);
 assert.match(sweep,/targets\.push\(redGrinConvoy\)/);
 assert.match(sweep,/target===redGrinConvoy[\s\S]*damageAlliedHull\(target,b.damage\)/);
});
test('convoy is separately selectable from Hangar and shares the no-save loaner mode',()=>{
 const html=read('index.html');
 assert.match(html,/id="hangar-red-grin-escort"/);
 const ctx={document:{hidden:false,getElementById:id=>({addEventListener(_kind,fn){ctx[id]=fn;}})},
   window:{RiftRedGrinBroadside:{},RiftFrigateHulls:{crosswind:{}}},state:'menu',routeParked:false,
   hangarDialog:{open:true,close(){this.open=false;}},boarding:null,cockpitSession:null,formationStage:null,
   returnFlightToCarrier:false,hangarLaunching:false,cockpitIsBifrost:()=>false,starterHullId:'rift-fighter',
   start(mode){ctx.launched=mode;return true;},unlockAudio(){},syncArenaMusic(){}};
 vm.runInNewContext(section('const practiceFlight=','const vandulFlight=')+
  section('const hangarSimulator=','cockpitExit?.addEventListener'),ctx);
 ctx['hangar-red-grin-escort']({isTrusted:true});
 assert.equal(ctx.launched.id,'red-grin-escort');
 assert.equal(ctx.launched.credits,false);assert.equal(ctx.launched.hull,'none');
 assert.equal(ctx.launched.loaner,'rift-fighter');
});

test('Red Grin shield takes damage first, passes overkill to hull, never recharges and resets for rematch',()=>{
 const {ctx}=scenario(),{ship}=ctx;
 ctx.loseHull=(body,damage)=>{body.hp-=damage;};
 const rings=[];
 ctx.burstRing=(...args)=>rings.push(args);
 vm.runInNewContext(section('function damageBlackwake(', 'function damageAlliedHull('),ctx);
 ctx.damageBlackwake(ship,5,{x:0,y:0});
 assert.equal(ship.simShield.hp,9);assert.equal(ship.hp,66);
 assert.equal(rings[0][3],'#8aefff');
 ctx.elapsed+=1;
 ctx.damageBlackwake(ship,12,{x:0,y:0});
 assert.equal(ship.simShield.hp,0);assert.equal(ship.hp,63);
 assert.equal(ship.simShield.brokenAt,ctx.elapsed);
 assert.equal(rings[1][3],'#d4fbff');
 ctx.elapsed+=60;
 ctx.damageBlackwake(ship,2);
 assert.equal(ship.simShield.hp,0);assert.equal(ship.hp,61);
 assert.equal(ctx.makeRedGrinSolo().simShield.hp,14);
});
