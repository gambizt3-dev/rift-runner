'use strict';
(() => {
const onlineCorsair=window.location?.search==='?multiplayer=corsair-test';
const onlineMatch=/^\?multiplayer=blackwake&side=(allies|opposition)$/.exec(window.location?.search??'')||(onlineCorsair?['corsair-test','allies']:null);
const onlineUi=Object.fromEntries(['entry','brief','join','hud','status','deployment','mode','dispatch','back','title'].map(key=>[key,document.getElementById('online-'+key)]));
let onlineImpactSeq=0,onlineSession=null,onlineBattle=null,onlineAim=null,onlineTap=false,onlineBlendAt=0,onlineBlendDuration=.17;
const onlinePos=new Map(),onlineShots=new Map(),onlinePirates=new Map();
const onlineBlackwake=ship=>ship.hull==='pirate-multicrew';
const onlineBot=ship=>ship.npc===true||onlineBlackwake(ship);
const canvas=document.getElementById('game'),hud=document.getElementById('hud'),overlay=document.getElementById('overlay'),resetFieldButton=document.getElementById('reset-field'),shakeSwitch=document.getElementById('screen-shake'),movePad=document.getElementById('move-pad'),aimPad=document.getElementById('aim-pad'),fireButton=document.getElementById('fire-button'),soundSwitch=document.getElementById('sound-on'),soundTest=document.getElementById('test-sound'),engineTest=document.getElementById('test-engine'),gunBlaster=document.getElementById('gun-blaster'),gunBallistic=document.getElementById('gun-ballistic'),phoneTools=document.getElementById('phone-audio-tools'),phoneSwitch=document.getElementById('iphone-audio'),phoneTest=document.getElementById('test-phone-audio'),soundStatus=document.getElementById('sound-status'),aimSwitch=document.getElementById('aim-mode');
const mainScreen=document.getElementById('main-menu'),arenaScreen=document.getElementById('arena-screen'),gameCabinet=document.getElementById('game-cabinet'),mainMenuCarrier=document.getElementById('main-menu-carrier'),mainMenuHangar=document.getElementById('main-menu-hangar'),returnMainMenu=document.getElementById('return-main-menu'),arenaSettings=document.getElementById('arena-settings');
const pauseFlightButton=document.getElementById('pause-flight'),scaleFlyPauseButton=document.getElementById('scale-fly-pause'), flightPopulation=document.getElementById('flight-population');
const resoluteDrillButton=document.getElementById('resolute-drill');
const blackwaterLandingHud=document.getElementById('blackwater-landing'),blackwaterLandingAction=document.getElementById('blackwater-landing-action');
const blackwaterLandingNote=document.getElementById('blackwater-landing-note'),blackwaterLandingCancel=document.getElementById('blackwater-landing-cancel');
const resoluteDockHud=document.getElementById('resolute-dock'),resoluteDockAction=document.getElementById('resolute-dock-action');
const resoluteDockStore=document.getElementById('resolute-dock-store'),resoluteDockCancel=document.getElementById('resolute-dock-cancel'),resoluteDockNote=document.getElementById('resolute-dock-note');
const flightMapButton=document.getElementById('capital-flight-map'),transferTitle=document.getElementById('fighter-transit-title');
const transferView=document.getElementById('fighter-transit'),transferChart=document.getElementById('fighter-transit-chart');
const transferStatus=document.getElementById('fighter-transit-status'),transferAbort=document.getElementById('fighter-transit-abort');
const crossBattleWatchRequest=window.location?.search==='?cross-battle=blackwake&watch=1';
const crossWatchSound=document.getElementById('cross-watch-sound');
let watchSound=false;
const crossWatchHud=document.getElementById('cross-watch-hud'),crossWatchStatus=document.getElementById('cross-watch-status'),crossWatchBack=document.getElementById('cross-watch-back');
const crossBattleRequest=/^\?cross-battle=blackwake&join=(intercept|reinforce)&vessel=rift-carrier$/.exec(window.location?.search??'');
const galaxyTransferRequest=/^\?transfer=(bifrost|rift-carrier)$/.exec(window.location?.search??'');
let transferTransit=null;
let fleetReturnAuto=false;
const fleetReturnHud=document.getElementById('fleet-return-hud'),fleetReturnStatus=document.getElementById('fleet-return-status'),fleetReturnAction=document.getElementById('fleet-return-action');
const fleetRepairAction=document.getElementById('fleet-repair-action');
const capitalHud=document.getElementById('capital-dock-hud'),capitalAction=document.getElementById('capital-dock-action'),capitalStore=document.getElementById('capital-store-action'),capitalStatus=document.getElementById('capital-dock-status'),capitalHangar=document.getElementById('capital-hangar');
const rangePanel=document.getElementById('custom-range'),rangeButton=document.getElementById('custom-range-button'),rangeReadout=document.getElementById('custom-range-readout');
let rangeTargets=[],rangeScore=0,rangeCycle=0,rangeClock=0,rangeMessage='';
const rangeRespawnSeconds=5;
const dockingAnnouncement=document.getElementById('capital-docking-announcement'),dockStageNote=document.getElementById('capital-dock-stage-note');
const orbitalView=document.getElementById('capital-orbital-view');
const dockingComms=document.getElementById('docking-comms'),dockingCommsText=document.getElementById('docking-comms-text');
const dockVoice=document.getElementById('docking-control-voice'),dockReturnVoice=document.getElementById('docking-return-voice');
const dockPortrait=document.getElementById('dockmaster-portrait'),dockSurprisedPortrait=document.getElementById('dockmaster-portrait-surprised');
const escortHud=document.getElementById('escort-hud'),escortAction=document.getElementById('escort-action'),escortStatus=document.getElementById('escort-status');
const redGrinStageReadout=document.getElementById('red-grin-stage-readout');
const duelCountdownBadge=document.getElementById('vandul-countdown'),duelReadout=document.getElementById('vandul-duel-readout'),asteroidSwitch=document.getElementById('asteroid-cover-on');
const wingmanFormationButton=document.getElementById('wingman-formation');
const wingRadio=document.getElementById('wing-radio'),wingRadioCaption=document.getElementById('wing-radio-caption');
const wingRadioPortraits=[document.getElementById('wing-radio-leena'),document.getElementById('wing-radio-tomas')];
const wingRadioCues=[
 {speaker:'leena',text:'Leena here. I’m out in front. Stay with me.',start:.35,fade:3.78,end:4.1},
 {speaker:'tomas',text:'Tomas here. I’m with you.',start:4.35,fade:6.95,end:7.27}
];
let wingRadioRun=null,wingRadioStatic=null;
const gunButtons={blaster:gunBlaster,ballistic:gunBallistic,ak77:document.getElementById('gun-ak77'),'sparrow-s2':document.getElementById('gun-sparrow-s2')};
const hangarDialog=document.getElementById('hangar'),openHangarButton=document.getElementById('open-hangar'),closeHangarButton=document.getElementById('close-hangar'),fitPrimary=document.getElementById('fit-primary'),fitSecondary=document.getElementById('fit-secondary'),fitStatus=document.getElementById('fit-status'),hangarTitle=document.getElementById('hangar-title');
const playerHangarView=document.getElementById('player-hangar-view'),guestHangarView=document.getElementById('guest-hangar-view');
const guestLocalFighter=document.getElementById('guest-hangar-local');
const guestLoaner=document.getElementById('guest-hangar-loaner');
function hangarHomeVessel(){
 if(window.RiftFighterParking)return window.RiftFighterParking.home();
 try{
  const profile=JSON.parse(localStorage.getItem('rift-runner.pilot-profile.v1'));
  if(profile?.version===2&&profile.companyVesselId==='bifrost')return 'bifrost';
 }catch{}
 return 'rift-carrier';
}
const vesselName=id=>id==='bifrost'?'Bifrost':'Pegasus';

const hangarBayActions=document.getElementById('hangar-bay-actions'),hangarBoard=document.getElementById('hangar-board'),hangarCockpit=document.getElementById('hangar-cockpit'),cockpitTitle=document.getElementById('cockpit-title');
const hangarLoaner=document.getElementById('hangar-loaner');
const hangarBoardStatus=document.getElementById('hangar-board-status');
const hangarShipChoice=document.getElementById('hangar-ship-choice'),hangarShipSelect=document.getElementById('hangar-ship'),hangarShipCaption=document.getElementById('hangar-ship-caption');
const cockpitQuestList=document.getElementById('cockpit-quest-list');
const corsairWingPanel=document.getElementById('corsair-wing-panel'),corsairWingStatus=document.getElementById('corsair-wing-status');
const cockpitOrder=document.getElementById('cockpit-order'),cockpitStatus=document.getElementById('cockpit-launch-status'),cockpitLaunch=document.getElementById('cockpit-launch'),cockpitExit=document.getElementById('cockpit-exit'),cockpitBridge=document.getElementById('cockpit-bridge');
const cockpitMission=document.getElementById('cockpit-mission'),cockpitPlanName=document.getElementById('cockpit-plan-name'),cockpitRemovePlan=document.getElementById('cockpit-remove-plan');
const cockpitPickers=Object.fromEntries(['mission','mode'].map(kind=>[kind,{
 picker:document.getElementById('cockpit-'+kind+'-picker'),
 add:document.getElementById('cockpit-add-'+kind),
 close:document.getElementById('cockpit-close-'+kind),
 select:kind==='mission'?cockpitMission:cockpitOrder
}]));
let cockpitSession=null,hangarLaunching=false,linkedHangarReturn,preferredHangarOrder=null;
let hangarVessel=null;
const aboardGuestHangar=()=>!!hangarVessel&&hangarVessel!==fighterParkedVessel();
let boarding=null,canopyOpenedAt=-Infinity;
// Match the lift, pause and slide timings on the Hangar canopy rig.
const boardingCanopyMs=180+190+710,boardingZoomMs=360;
const fitEngine=document.getElementById('fit-engine'),fitCore=document.getElementById('fit-core'),fitBattery=document.getElementById('fit-battery');
const claimHullButton=document.getElementById('fit-claim-hull'),repairHullButton=document.getElementById('fit-repair-hull'),hullRecoveryStatus=document.getElementById('fit-hull-recovery-status');
const directRepairButton=document.getElementById('fit-repair-direct'),parkedHullArt=document.getElementById('hangar-fighter-art');
const repairProgressWrap=document.getElementById('fit-repair-progress-wrap'),repairProgress=document.getElementById('fit-repair-progress');
const damagedBay=document.getElementById('hangar-damaged-bay'),repairedBay=document.getElementById('hangar-repaired-bay'),playerLoadout=document.getElementById('hangar-player-loadout'),salvagePreview=document.getElementById('fit-salvage-preview');
const mainBuildStatus=document.getElementById('menu-build-status'),buildStatus=document.getElementById('fit-build-status'),fitCoreBadge=document.getElementById('fit-core-badge'),fitBatteryBadge=document.getElementById('fit-battery-badge');
// The actual build screen fails closed even if its wallet script is unavailable.
const managedBuild=!!buildStatus||typeof window.RiftCredits?.getBuildState==='function';
const customFlightRequest=/^\?launch=custom&(?:fighter|hull)=(bastion-9|stocky-light-fighter|rift-fighter|civilian-freighter)&vessel=(rift-carrier|bifrost)(?:&from=(shop|hangar))?$/.exec(window.location?.search??'');
let loanerSnapshot=null;
const fitShield=document.getElementById('fit-shield'),fitAegis=document.getElementById('fit-aegis-option'),fitShieldStat=document.getElementById('fit-shield-stat');
const flightShield=document.getElementById('flight-shield');
const fitHullStat=document.getElementById('fit-hull-stat'),fitWeightStat=document.getElementById('fit-weight-stat'),fitEngineStat=document.getElementById('fit-engine-stat'),fitPrimaryStat=document.getElementById('fit-primary-stat'),fitSecondaryStat=document.getElementById('fit-secondary-stat');
const mainThrustButton=document.getElementById('main-thruster'),surgeLabel=document.getElementById('surge-thruster-label'),surgeStatus=document.getElementById('surge-status');
const hangarSoundStatus=document.getElementById('hangar-engine-status');
const canopyRig=document.getElementById('hangar-canopy-rig'),canopyButton=document.getElementById('hangar-canopy-button'),canopyHint=document.getElementById('canopy-hint'),hangarEngineTest=document.getElementById('hangar-test-engine');
if(!canvas||!hud||!overlay)return;
const g=canvas.getContext('2d',{alpha:false});
if(!g){overlay.textContent='This browser cannot display the game canvas.';return;}
const riftFourFlightLength=58.24;
const VIEW_W=480,VIEW_H=720,W=960,H=1440,TAU=Math.PI*2,edge=12,arena={left:edge,right:W-edge,top:edge,bottom:H-edge};
const floorNorth=()=>arena.top-edge;
function setArenaWidth(wide=false){
 const extra=wide?180:0;arena.left=edge-extra;arena.right=W-edge+extra;
}
const flightView=document.getElementById('flight-view');
const flightViews=Object.fromEntries(['fleet','normal','focus'].map(id=>[id,document.getElementById('flight-view-'+id)]));
let flightViewMode='normal';
function canSwitchFlightView(){
 return state==='play'&&!flightMode.scaleFly&&!document.hidden&&!routeParked&&!hangarDialog?.open&&!capitalLocked()&&!transferTransit&&!playerIngress&&!capitalHangarApproach;
}
function syncFlightView(){
 if(!flightView)return;
 const hidden=!canSwitchFlightView();if(flightView.hidden!==hidden)flightView.hidden=hidden;
}
for(const [mode,control] of Object.entries(flightViews)){
 control?.addEventListener('click',()=>{
  if(!canSwitchFlightView()||flightViewMode===mode)return;
  flightViewMode=mode;
  for(const [id,b] of Object.entries(flightViews))b?.setAttribute('aria-pressed',String(id===mode));
 });
}
const launch={x:W/2,y:988.8},carrierArrival={seconds:2,fromY:H+73,exterior:190};
const missionFlight={hold:1.2,travel:1.4,toY:H+carrierArrival.exterior+76};
const arrivalDeck=document.getElementById('flight-deck'),arrivalRack=document.querySelector?.('.weapon-rack');
function crossWatchCamera(){
 let left=Infinity,right=-Infinity,top=Infinity,bottom=-Infinity;
 const hull=blackwakeHull;
 for(const ship of pirateCapitals){
  const u=Math.abs(Math.cos(ship.yaw)),v=Math.abs(Math.sin(ship.yaw));
  const a=(hull.width*u+hull.height*v)/2,b=(hull.height*u+hull.width*v)/2;
  left=Math.min(left,ship.x-a-32);right=Math.max(right,ship.x+a+32);
  top=Math.min(top,ship.y-b-33);bottom=Math.max(bottom,ship.y+b+20);
 }
 for(const ship of [...vanduls,...livingAllies()]){
  left=Math.min(left,ship.x-92);right=Math.max(right,ship.x+92);
  top=Math.min(top,ship.y-58);bottom=Math.max(bottom,ship.y+63);
 }
 const zoom=Math.min(1,frameW/(right-left),frameH/(bottom-top));
 const w=frameW/zoom,h=frameH/zoom;
 // A portrait window may show extra sky beyond the map's vertical bounds.
 // Center the action instead of clamping away any participant.
 return {x:(left+right-w)/2,y:(top+bottom-h)/2,w,h,zoom};
}
// This simulator owns only transient state. Its fighters share the normal world scale.
const fighterBattleReadout=document.getElementById('fighter-battle-readout');
const simTeamColors=['#6de4ff','#ff8092'];
const fighterCross=Object.freeze({north:520,south:1980,mid:1250,
 friendly:{x:1163,y:2205,name:'Crosswind'},hostile:{x:1037,y:295,name:'Red Grin'}});
const fighterCrossAction=document.getElementById('fighter-cross-action');
const fighterWave=Object.freeze({interval:3.6,loadGap:.24,liftTime:.48,takeoff:.96,spacing:58,depth:155,lanes:[760,1350,335,1810]});
function fighterRecoveryFrigates(){
 const hull=window.RiftFrigateHulls?.crosswind;
 const variants=window.RiftFrigateVariants;
 const deck=hull?.pads??[{x:-2,y:-71},{x:-2,y:-5},{x:-2,y:63},{x:-2,y:100}];
 const anchor=deck[2],length=hull?.length??350,width=hull?.width??95;
 if(!redGrinSoloArt&&typeof window.Image==='function'){
  redGrinSoloArt=new window.Image();redGrinSoloArt.src='./red-grin-simulator.webp';
 }
 return [fighterCross.friendly,fighterCross.hostile].map((base,i)=>{
  const direction=i?1:-1,heading=direction*Math.PI/2,x=base.x+direction*anchor.y,y=base.y-direction*anchor.x;
  const toWorld=({x:px,y:py})=>({x:x-direction*py,y:y+direction*px});
  const variant=i?variants?.redGrin:variants?.crosswind;
  const frigate={x,y,direction,team:i+1,heading,width,length,base,pads:deck.map(toWorld),toWorld,
   name:base.name,loadout:variant?.loadout,hp:66,maxHp:66,hitAt:-Infinity,
   shieldSpec:hull?.shield,shieldHp:variant?.loadout.shield?hull.shield.capacity:0,
   fire:window.RiftRedGrinBroadside?.state(),warning:null,flashUntil:0,shot:null,shots:0};
  frigate.hitCells=[-.39,-.26,-.13,0,.13,.26,.39].map(offset=>{
   const {x,y}=toWorld({x:0,y:offset*length});
   return {x,y,prevX:x,prevY:y,r:width*(Math.abs(offset)>.3?.36:.47),vx:0,vy:0,spin:0,invMass:0,simFrigate:frigate};
  });
  return frigate;
 });
}
function simRoundBounds(b){
 // Home zones protect fighters and pads, not an enemy frigate targeted from combat space.
 return {top:b.simBattery===2||b.fleetRaid||b.frigateTarget?.team===2?arena.top:fighterCross.north,
  bottom:b.simBattery===1||b.frigateTarget?.team===1?arena.bottom:fighterCross.south};
}
function simRoundInside(b){
 const {top,bottom}=simRoundBounds(b);return b.y>=top&&b.y<=bottom;
}
function tagFrigateShot(b,enemy){
 if(b.frigateTarget!==undefined)return;
 b.frigateTarget=null;
 // A piloted Rift can raid Red Grin's home zone; its parked fighters stay protected.
 b.fleetRaid=!enemy&&!b.ally&&b.y<fighterCross.north;
 if(!b.fleetRaid&&(!inFighterBattleCenter(b.y)||(enemy?b.vy:-b.vy)<=0))return;
 const frigate=fighterBattle.frigates[enemy?0:1];
 for(const cell of frigate.hitCells){
  if(sweptCircle(b.x-cell.x,b.y-cell.y,b.vx*8,b.vy*8,cell.r+2)!==null){b.frigateTarget=frigate;break;}
 }
}
function hitSimFrigate(frigate,b,t,time){
 const at=fighterBattle.time;
 frigate.hitAt=at;
 if(t.enemy)b.life=0;else b.spent=true;
 const damage=Math.max(0,b.damage??0),absorbed=Math.min(frigate.shieldHp,damage);
 frigate.shieldHp-=absorbed;
 frigate.hp=Math.max(0,frigate.hp-(damage-absorbed));
 if(!frigate.hp){frigate.warning=null;if(frigate.fire)frigate.fire.burst=null;}
 burstRing(b.x+t.dx*time,b.y+t.dy*time,absorbed?23:15,absorbed?'#79efff':'#ffc188');
}
function stepRecoveryGuns(sim,blueTargets,redTargets,dt){
 const broadside=window.RiftRedGrinBroadside;if(!broadside)return;
 for(const frigate of sim.frigates){
  const t=sim.time,fire=frigate.fire,shield=frigate.shieldSpec;
  if(!frigate.hp||!fire)continue;
  if(shield&&frigate.loadout?.shield&&t-frigate.hitAt>=shield.rechargeDelay)
   frigate.shieldHp=Math.min(shield.capacity,frigate.shieldHp+dt*shield.rechargeRate);
  let volley;
  if(fire.burst)volley=broadside.advance(fire,frigate,t);
  else if(t>=fire.readyAt){
   const candidates=frigate.team===1?redTargets:
    !flightMode.simWatch&&p.y<fighterCross.north?[...blueTargets,p]:blueTargets;
   const eligible=body=>body?.hp&&(inFighterBattleCenter(body.y)||(frigate.team===2&&body===p&&body.y<fighterCross.north))&&Math.hypot(body.x-frigate.x,body.y-frigate.y)<550
    &&broadside.candidate(frigate,body)&&!firstSightCover(frigate,body,asteroids);
   if(frigate.warning&&!eligible(frigate.warning.target))frigate.warning=null;
   if(frigate.warning){
    if(t>=frigate.warning.at){
     const {target}=frigate.warning;frigate.warning=null;
     volley=broadside.request(fire,frigate,target,t,{random:Math.random});
    }
   }else{
    let target=null,range=Infinity;
    for(const body of candidates){
     const gap=(body.x-frigate.x)**2+(body.y-frigate.y)**2;
     if(gap<range&&eligible(body)){target=body;range=gap;}
    }
    if(target)frigate.warning={target,side:broadside.candidate(frigate,target).side,at:t+.85};
   }
  }
  if(!volley)continue;
  if(volley.last)fire.readyAt=Math.max(fire.readyAt,t+2.5);
  for(const shot of volley.shots){
   const b={...shot,vx:Math.cos(shot.a)*400,vy:Math.sin(shot.a)*400,damage:1,kind:'energy',
    simBattery:frigate.team,redGrinCannon:true};
   if(frigate.team===1)shots.push({...b,weapon:'blaster',ally:true,simUntil:t+1.47});
   else vandulLasers.push({...b,life:1.47});
   frigate.shots++;frigate.flashUntil=t+.10;frigate.shot=shot;
  }
  const muzzle=volley.shots[0],gain=nearBattleGain(muzzle.x,muzzle.y);
  if(withinCamera(frigate,flightCamera(),240)){
   emitRedGrinMuzzleClouds(volley.shots);
   if(gain>.035)playRedGrinCannonPulse(gain,volley.last,muzzle.cannon===0?1:.62);
   if(!motion?.matches&&(shakeSwitch?.checked??true)&&gain>.08&&muzzle.cannon===0)kick(.10+.24*gain);
  }
 }
}
const inFighterBattleCenter=y=>y>=fighterCross.north&&y<=fighterCross.south;
function makeFighterAsteroidBelt(){
 if(!asteroidAtlas&&typeof window.Image==='function'){
  asteroidAtlas=new window.Image();asteroidAtlas.src='./rift-asteroid-atlas.webp';
 }
 // Broken clusters leave four obvious, straight lanes. Size the actual
 // art as well as collision circles so a clear route looks clear from the cockpit.
 const layout=[[135,-14,64],[550,18,68],[970,-30,62],[1135,32,74],[1570,-22,64],[2050,12,66],
  [165,-143,30],[178,128,28],[525,-145,31],[563,163,24],[1010,-155,27],[1159,165,28],
  [1545,-155,26],[1590,146,31],[2031,-147,29],[2040,158,28]];
 return layout.map(([x,offset,r],i)=>{
  const y=fighterCross.mid+offset,base=asteroidProfiles[i%asteroidProfiles.length];
  return {x,y,prevX:x,prevY:y,r,asteroid:true,profile:{...base,drawSize:r*2.45},
   vx:0,vy:0,spin:0,invMass:0,angle:i*1.71,rockSign:1,wallFx:0,hitGlow:0};
 });
}
function fighterBeltSteering(ship,vx,vy,side=1){
 const speed=Math.hypot(vx,vy);
 if(speed<1||Math.abs(ship.y-fighterCross.mid)>355||!asteroids.length)return {x:vx,y:vy};
 const angle=Math.atan2(vy,vx),reach=Math.min(119,Math.max(47,speed*.77)),pad=ship.r+11;
 const nearby=asteroids.filter(r=>Math.abs(r.x-ship.x)<reach+pad+r.r&&Math.abs(r.y-ship.y)<reach+pad+r.r);
 const project=a=>({x:ship.x+Math.cos(a)*reach,y:ship.y+Math.sin(a)*reach});
 const rock=firstSightCover(ship,project(angle),nearby,pad);
 if(!rock)return {x:vx,y:vy};
 for(const turn of [.47,-.47,.85,-.85,1.29,-1.29,1.67,-1.67]){
  const a=angle+turn*side,goal=project(a);
  if(goal.x<arena.left+pad||goal.x>arena.right-pad||firstSightCover(ship,goal,nearby,ship.r+7))continue;
  return {x:Math.cos(a)*speed,y:Math.sin(a)*speed};
 }
 const away=Math.atan2(ship.y-rock.y,ship.x-rock.x)+side*.53;
 return {x:Math.cos(away)*speed*.72,y:Math.sin(away)*speed*.72};
}
function startFighterBattle(){
 Object.assign(arena,{left:edge,top:edge,right:2200-edge,bottom:2500-edge});
 cones=[];asteroids=makeFighterAsteroidBelt();sceneryDebris=[];
 const blue=[],red=[],flights=[[],[]],frigates=fighterRecoveryFrigates();
 const launchPads=frigates.map(f=>f.pads.map((_,i)=>i).filter(i=>i!==2).sort((a,b)=>f.pads[a].x-f.pads[b].x));
 for(const [team,roster] of [[1,blue],[2,red]]){
  for(let slot=0;slot<50;slot++){
   const frigate=frigates[team-1],aim=team===1?-Math.PI/2:Math.PI/2;
   if(team===1&&slot===49&&!flightMode.simWatch){const {x,y}=frigate.pads[2];Object.assign(p,{x,y,prevX:x,prevY:y,vx:0,vy:0});snapAim(aim);continue;}
   const flight=Math.floor(slot/3),rank=slot%3,wing=flights[team-1][flight]??=[];
   const pads=launchPads[team-1],launchPad=pads[rank===0?1:rank===1?0:2],{x,y}=frigate.pads[launchPad];
   const centerX=frigate.pads[pads[1]].x,startAt=flight*fighterWave.interval;
   const holdX=centerX+(rank===1?-fighterWave.spacing:rank===2?fighterWave.spacing:0);
   const holdY=y+frigate.direction*(fighterWave.depth-(rank?fighterWave.spacing:0));
   const ship={simTeam:team,x,y,prevX:x,prevY:y,vx:0,vy:0,aim,r:p.r,craft:true,invMass:p.invMass,spin:0,
    staged:true,departing:true,launchPad,loadAt:startAt+rank*fighterWave.loadGap,
    launchAt:startAt+fighterWave.takeoff+rank*fighterWave.loadGap,holdX,holdY,
    ingressX:fighterWave.lanes[(flight+(team-1))%fighterWave.lanes.length],
    hp:12,maxHp:12,hitGlow:0,wallFx:0,slot,flight,rank,side:slot%2?1:-1,retarget:slot%11*.023,fireAt:1.5+(slot%13)*.13};
   wing.push(ship);roster.push(ship);
  }
 }
 fighterBattle={blue,red,flights,frigates,bots:[...blue,...red],phase:'docked',launching:true,time:0,blueCount:50,redCount:50,nextAudio:0,retreat:false,repairAt:null};
}
function fleetRepairReady(){
 const base=fighterCross.friendly;
 return Math.hypot(p.x-base.x,p.y-base.y)<=95&&Math.hypot(p.vx,p.vy)<45;
}
function updateFighterBattleReadout(active=true){
 const sim=fighterBattle;
 if(fighterBattleReadout){
  fighterBattleReadout.hidden=!(active&&sim);
  if(!fighterBattleReadout.hidden){
   const zone=p.y>=fighterCross.south?'Crosswind Home':p.y<=fighterCross.north?'Red Grin Home':'Battle Map';
   const phase=sim.phase==='docked'?'Docked':sim.launching?'Combat · Launching waves':'Combat';
   const text=phase+' · '+(flightMode.simWatch?'':zone+' · ')+'Crosswind '+sim.blueCount+'/50 · Red Grin '+sim.redCount+'/50';
   if(fighterBattleReadout.textContent!==text)fighterBattleReadout.textContent=text;
  }
 }
 if(!fighterCrossAction)return;
 fighterCrossAction.hidden=!(active&&sim&&!sim.result&&!flightMode.simWatch);
 if(fighterCrossAction.hidden)return;
 if(sim.phase!=='combat'){
  fighterCrossAction.disabled=false;
  fighterCrossAction.textContent='Launch fleets';return;
 }
 const waiting=sim.repairAt!==null&&sim.time<sim.repairAt;
 fighterCrossAction.disabled=waiting;
 const label=waiting?'Repairing · '+Math.ceil(sim.repairAt-sim.time)+'s':sim.repairAt!==null?'Relaunch':fleetRepairReady()?'Dock & repair':sim.retreat?'Cancel retreat':'Retreat to Crosswind';
 if(fighterCrossAction.textContent!==label)fighterCrossAction.textContent=label;
}
fighterCrossAction?.addEventListener('click',event=>{
 const sim=fighterBattle;
 if(!event.isTrusted||!sim||flightMode.simWatch||state!=='play'||document.hidden||sim.result)return;
 if(sim.phase==='docked'){
  sim.phase='combat';clearInput();snapAim(-Math.PI/2);p.vy=-45;
  updateFighterBattleReadout();liveFocus();return;
 }
 if(sim.phase!=='combat')return;
 if(sim.repairAt!==null){
  if(sim.time<sim.repairAt)return;
  sim.repairAt=null;clearInput();snapAim(-Math.PI/2);p.vy=-45;
 }else if(fleetRepairReady()){
  clearInput();sim.retreat=false;sim.repairAt=sim.time+6;
  const {x,y}=fighterCross.friendly;
  Object.assign(p,{x,y,prevX:x,prevY:y,vx:0,vy:0,mainThrustActive:false,mainMomentum:false});
  snapAim(sim.frigates[0].heading-Math.PI/2);
 }else{clearInput();sim.retreat=!sim.retreat;}
 updateFighterBattleReadout();liveFocus();
});
function fighterCrossRetreatVelocity(){
 const base=fighterCross.friendly,dx=base.x-p.x,dy=base.y-p.y,gap=Math.hypot(dx,dy);
 if(fleetRepairReady()){fighterBattle.retreat=false;return {x:0,y:0};}
 const v=gap?Math.min(145,gap*1.55)/gap:0;
 return fighterBeltSteering(p,dx*v,dy*v);
}
function flySimPoint(ship,x,y,dt,multi=1,lead=null){
 const dx=x-ship.x,dy=y-ship.y,gap=Math.hypot(dx,dy),v=gap?Math.min(131*multi,gap*2.4)/gap:0;
 const blend=Math.min(1,dt*4.5);
 const side=(ship.side??1)*(ship.simTeam===2?-1:1);
 const want=fighterBeltSteering(ship,dx*v+(lead?.vx??0)*.78,dy*v+(lead?.vy??0)*.78,side);
 ship.vx+=(want.x-ship.vx)*blend;
 ship.vy+=(want.y-ship.vy)*blend;
 capVelocity(ship,146*multi);ship.x+=ship.vx*dt;ship.y+=ship.vy*dt;
 const aim=lead?.aim??(gap>1?Math.atan2(dy,dx):ship.aim);
 ship.aim+=clamp(headingDelta(ship.aim,aim),-3.7*dt,3.7*dt);
 return gap;
}
function paintFighterCrossZones(camera){
 g.save();
 for(const [line,base,color] of [[fighterCross.north,fighterCross.hostile,simTeamColors[1]],[fighterCross.south,fighterCross.friendly,simTeamColors[0]]]){
  const south=line===fighterCross.south;
  if(south?camera.y+camera.h>line:camera.y<line){
   g.globalAlpha=.10;g.fillStyle=color;
   g.fillRect(camera.x,south?line:arena.top,camera.w,south?arena.bottom-line:line-arena.top);
  }
  if(line>=camera.y&&line<=camera.y+camera.h){
   g.globalAlpha=.6;g.strokeStyle=color;g.lineWidth=2;g.setLineDash([20,13]);g.beginPath();
   g.moveTo(camera.x,line);g.lineTo(camera.x+camera.w,line);g.stroke();g.setLineDash([]);
   g.fillStyle=color;g.font='700 12px system-ui';g.textAlign='center';
   g.fillText(south?'CROSSWIND HOME · FIGHTER SAFE ZONE':'RED GRIN HOME · FIGHTER SAFE ZONE',camera.x+camera.w/2,line+(south?28:-18));
  }
  const ship=fighterBattle.frigates[south?0:1];
  if(!withinCamera(ship,camera,ship.length*.62))continue;
  g.globalAlpha=1;
  if(!south&&redGrinSoloArt?.complete&&redGrinSoloArt.naturalWidth>0){
   g.save();g.translate(ship.x,ship.y);g.rotate(ship.heading);
   g.drawImage(redGrinSoloArt,-ship.width/2,-ship.length/2,ship.width,ship.length);g.restore();
  }else if(window.RiftFrigateHulls?.crosswind){
   paintCrosswindPose({...ship,scaleFly:true},camera);
  }
  g.fillStyle=color;g.font='800 11px system-ui';g.textAlign='center';g.fillText(base.name.toUpperCase(),ship.x,ship.y+ship.width*.76);
  const shieldFlash=clamp(1-(fighterBattle.time-ship.hitAt)/.35,0,1);
  if(shieldFlash&&ship.shieldHp>0){
   g.save();g.globalAlpha=.65*shieldFlash;g.strokeStyle='#79efff';g.lineWidth=2;
   g.beginPath();g.ellipse(ship.x,ship.y,ship.length*.54,ship.width*.62,0,0,TAU);g.stroke();g.restore();
  }
  const barY=ship.y+ship.width*.76+7;
  g.fillStyle='#172732';g.fillRect(ship.x-30,barY,60,3);g.fillRect(ship.x-30,barY+5,60,3);
  g.fillStyle='#65e8ff';g.fillRect(ship.x-30,barY,60*(ship.shieldHp/(ship.shieldSpec?.capacity||1)),3);
  g.fillStyle=color;g.fillRect(ship.x-30,barY+5,60*ship.hp/ship.maxHp,3);
  const {x,y}=ship.pads[2];
  g.save();g.translate(x,y);g.rotate(ship.heading);g.strokeStyle=color;g.lineWidth=1;
  g.setLineDash([4,4]);g.strokeRect(-15,-19,30,38);g.restore();
  const broadside=window.RiftRedGrinBroadside;
  for(const mount of broadside?.mounts??[]){
   const {x,y}=ship.toWorld(mount),aiming=ship.warning?.side===mount.side||ship.fire?.burst?.side===mount.side;
   const near=ship.shot&&Math.hypot(ship.shot.x-x,ship.shot.y-y)<12;
   const firing=ship.flashUntil>fighterBattle.time&&near;
   g.save();g.translate(x,y);g.rotate(firing?ship.shot.a:ship.heading+(mount.side<0?Math.PI:0));
   g.fillStyle='#243240';g.strokeStyle=aiming?'#ffc47a':color;g.fillRect(-5,-4,10,8);g.strokeRect(-5,-4,10,8);
   g.fillStyle=firing?'#fff1c9':aiming?'#ffc47a':color;g.fillRect(3,-1,8,2);if(firing)g.fillRect(11,-3,6,6);
   g.restore();
  }
 }
 g.restore();
}
function hitFighterBattleBot(ship,damage,x,y){
 loseHull(ship,damage);ship.hitGlow=.16;
 if(!withinCamera(ship,flightCamera(),110))return;
 if(!ship.hp){blast(x,y,simTeamColors[ship.simTeam-1],10,.85);burstRing(x,y,28,simTeamColors[ship.simTeam-1]);}
 else burstRing(x,y,11,'#ffe0a8');
}
function finishFighterBattle(reason){
 if(fighterBattle.result)return;
 fighterBattle.result=reason;
 const blue=fighterBattle.blue.filter(ship=>ship.hp>0).length+Number(!flightMode.simWatch&&p.hp>0);
 const red=fighterBattle.red.filter(ship=>ship.hp>0).length;
 fighterBattle.blueCount=blue;fighterBattle.redCount=red;updateFighterBattleReadout();
 state='complete';clearInput();finishFourWay();syncArrivalControls();
 const title=reason==='red-won'?'Red Grin wins':reason==='won'?'Crosswind wins':reason==='disabled'?'Your fighter was disabled':'Time expired';
 menu(title,'Crosswind '+blue+'/50 · Red Grin '+red+'/50 · '+Math.floor(fighterBattle.time)+' seconds<br>No credits, resources or damage saved.','reset','Rematch','FIGHTER SIMULATOR');
 overlay.innerHTML+=button('Return to Hangar','main-menu');
 overlay.querySelector('button')?.focus({preventScroll:true});
}
function stepFighterLaunches(sim,dt){
 if(!sim.launching)return;
 let pending=false;
 for(const flights of sim.flights)for(const wing of flights){
  if(!wing[0].departing)continue;
  let formed=true;
  for(const ship of wing){
   if(sim.time<ship.launchAt){formed=false;continue;}
   ship.staged=false;
   ship.prevX=ship.x;ship.prevY=ship.y;
   const gap=flySimPoint(ship,ship.holdX,ship.holdY,dt,1.26);
   if(gap>6||Math.hypot(ship.vx,ship.vy)>13)formed=false;
   else Object.assign(ship,{x:ship.holdX,y:ship.holdY,vx:0,vy:0});
   const aim=ship.simTeam===1?-Math.PI/2:Math.PI/2;
   if(gap<42)ship.aim+=clamp(headingDelta(ship.aim,aim),-3.7*dt,3.7*dt);
  }
  if(formed)for(const ship of wing)ship.departing=false;
  else pending=true;
 }
 sim.launching=pending;
}
function stepFighterBattle(dt){
 const sim=fighterBattle;
 if(sim.phase!=='combat'){updateFighterBattleReadout();return;}
 const clock=sim.time+=dt;
 stepFighterLaunches(sim,dt);
 const blue=sim.blue.filter(ship=>ship.hp>0&&!ship.departing),red=sim.red.filter(ship=>ship.hp>0&&!ship.departing),all=[...blue,...red];
 const blues=flightMode.simWatch?blue:[...blue,p],gain=Math.min(1,dt*2.6);
 if(sim.repairAt!==null&&clock>=sim.repairAt&&p.hp<p.maxHp){p.hp=p.maxHp;p.heat=0;updateHud();}
 for(const ship of all)if(ship.hp<=6&&!ship.repaired&&!ship.returning&&!ship.bayUntil)ship.returning=true;
 const active=ship=>!ship.bayUntil&&inFighterBattleCenter(ship.y);
 const blueTargets=blues.filter(active),redTargets=red.filter(active);
 const pressure=new Map();
 const reserve=(target,n)=>{if(target)pressure.set(target,(pressure.get(target)??0)+n);};
 for(const ship of all)if(!ship.returning&&!ship.bayUntil&&ship.target?.hp&&active(ship.target))reserve(ship.target,1);
 // Turn order alternates. One side no longer always updates against stale positions.
 const order=sim.reverse?[...red,...blue]:all;sim.reverse=!sim.reverse;
 for(const ship of order){
  ship.prevX=ship.x;ship.prevY=ship.y;ship.hitGlow=Math.max(0,ship.hitGlow-dt);
  if(ship.bayUntil){
   if(clock<ship.bayUntil)continue;
   const pad=sim.frigates[ship.simTeam-1].pads[ship.recoveryPad];
   if(pad?.owner===ship)pad.owner=null;
   ship.recoveryPad=null;ship.hp=ship.maxHp;ship.bayUntil=0;ship.repaired=true;ship.fireAt=clock+.6;
  }
  if(ship.returning){
   const frigate=sim.frigates[ship.simTeam-1];
   if(ship.recoveryPad==null&&Math.abs(ship.y-frigate.base.y)<280){
    const queued=sim.flights[ship.simTeam-1].some(wing=>wing.some(a=>a.staged));
    const index=frigate.pads.findIndex((pad,i)=>!pad.owner?.hp&&
     (i===2?(flightMode.simWatch||ship.simTeam===2||Math.hypot(p.x-pad.x,p.y-pad.y)>45):!queued));
    if(index>=0){ship.recoveryPad=index;frigate.pads[index].owner=ship;}
   }
   const berth=frigate.pads[ship.recoveryPad],holdX=frigate.base.x+((ship.flight%9)-4)*70;
   const holdY=frigate.base.y-frigate.direction*(90+ship.rank*49);
   if(flySimPoint(ship,berth?.x??holdX,berth?.y??holdY,dt,1.18)<21&&berth){
    Object.assign(ship,{x:berth.x,y:berth.y,vx:0,vy:0,aim:frigate.heading-Math.PI/2,returning:false,bayUntil:clock+6});
   }
   continue;
  }
  if(!ship.target?.hp||!active(ship.target)||clock>=ship.retarget){
   const opposing=ship.simTeam===1?redTargets:blueTargets;
   if(ship.target?.hp&&active(ship.target))reserve(ship.target,-1);
   let best=Infinity;ship.target=null;
   for(const target of opposing){
    const d=(target.x-ship.x)**2+(target.y-ship.y)**2+Math.max(0,pressure.get(target)??0)*185**2;
    if(d<best){best=d;ship.target=target;}
   }
   reserve(ship.target,1);ship.retarget=clock+.35+(ship.slot%9)*.019;
  }
  const wing=sim.flights[ship.simTeam-1][ship.flight];
  const leadShip=wing.find(a=>a!==p&&a.hp&&!a.returning&&!a.bayUntil);
  const targetGap=ship.target?Math.hypot(ship.target.x-ship.x,ship.target.y-ship.y):Infinity;
  // Hold the V on ingress, break for a close pass, and reform around a surviving lead.
  if(leadShip&&leadShip!==ship&&targetGap>255){
   const forwardX=Math.cos(leadShip.aim),forwardY=Math.sin(leadShip.aim);
   const side=(ship.rank===2?-1:1)*(ship.simTeam===1?-1:1),back=59,lateral=side*58;
   flySimPoint(ship,leadShip.x-forwardX*back-forwardY*lateral,leadShip.y-forwardY*back+forwardX*lateral,dt,1.12,leadShip);
   continue;
  }
  if(!ship.target){
   const approachY=fighterCross.mid+(ship.simTeam===1?360:-360);
   if(!ship.linedUp&&Math.hypot(ship.x-ship.ingressX,ship.y-approachY)<46)ship.linedUp=true;
   flySimPoint(ship,ship.ingressX,ship.linedUp?fighterCross.mid+(ship.simTeam===1?95:-95):approachY,dt);
   continue;
  }
  const dx=ship.target.x-ship.x,dy=ship.target.y-ship.y,gap=Math.max(1,Math.hypot(dx,dy)),ux=dx/gap,uy=dy/gap;
  // Give each pilot a different lateral break so close passes don't form a single pile.
  const speed=105+ship.slot%7*5,side=ship.side*(ship.simTeam===1?1:-1)*(gap<260?.85:.16),drive=clamp((gap-115)/165,-.65,1);
  const avoidX=clamp((arena.left+120-ship.x)/70,0,1)-clamp((ship.x-arena.right+120)/70,0,1);
  const avoidY=clamp((arena.top+120-ship.y)/70,0,1)-clamp((ship.y-arena.bottom+120)/70,0,1);
  const want=fighterBeltSteering(ship,(ux*drive-uy*side+avoidX)*speed,(uy*drive+ux*side+avoidY)*speed,Math.sign(side));
  ship.vx+=(want.x-ship.vx)*gain;
  ship.vy+=(want.y-ship.vy)*gain;
  ship.x+=ship.vx*dt;ship.y+=ship.vy*dt;wall(ship);
  const lead=Math.min(.46,gap/440);
  const desired=Math.atan2(dy+ship.target.vy*lead,dx+ship.target.vx*lead);
  ship.aim+=clamp(headingDelta(ship.aim,desired),-3.7*dt,3.7*dt);
  if(inFighterBattleCenter(ship.y)&&gap<310&&gap>40&&clock>=ship.fireAt&&Math.abs(headingDelta(ship.aim,desired))<.21&&!firstSightCover(ship,ship.target,asteroids)){
   const offset=((ship.slot%5)-2)*.015*(ship.simTeam===1?1:-1),a=ship.aim+offset,cx=Math.cos(a),cy=Math.sin(a);
   const b={x:ship.x+cx*31,y:ship.y+cy*31,vx:cx*440,vy:cy*440,a,owner:ship,damage:2,kind:'energy'};
   if(ship.simTeam===1)shots.push({...b,weapon:'blaster',ally:true,simUntil:clock+.82});
   else vandulLasers.push({...b,life:.82});
   ship.fireAt=clock+1.65+(ship.slot%9)*.125;
   if(clock>=sim.nextAudio&&withinCamera(ship,flightCamera(),45)){
    sim.nextAudio=clock+.33;npcBattleShot(ship.x,ship.y,ship.simTeam===2);
   }
  }
 }
 // Sweep-and-prune rejects distant pairs before the normal contact solver.
 const sorted=[...all.filter(a=>!a.bayUntil),...(!flightMode.simWatch&&sim.repairAt===null?[p]:[])].sort((a,b)=>a.x-b.x),diameter=Math.max(40,p.r*2);
 for(let i=0;i<sorted.length;i++)for(let j=i+1;j<sorted.length&&sorted[j].x-sorted[i].x<diameter;j++){
  const a=sorted[i],b=sorted[j];
  if(Math.abs(a.y-b.y)<a.r+b.r)contact(a,b,false);
 }
 for(const ship of sorted){
  if(Math.abs(ship.y-fighterCross.mid)<245)for(const rock of asteroids)contact(ship,rock,false);
  wall(ship);
  if(ship.simTeam===2&&ship.y>fighterCross.south-ship.r){ship.y=fighterCross.south-ship.r;ship.vy=Math.min(0,ship.vy);}
  if(ship===p&&ship.y<fighterCross.north)for(const cell of sim.frigates[1].hitCells)contact(ship,cell,false);
  if(ship.simTeam===1&&ship.y<fighterCross.north+ship.r){ship.y=fighterCross.north+ship.r;ship.vy=Math.max(0,ship.vy);}
 }
 stepRecoveryGuns(sim,blueTargets,redTargets,dt);
 sweepProjectiles(dt,redTargets,asteroids);
 if(state!=='play')return;
 sim.blueCount=sim.blue.reduce((n,b)=>n+Number(b.hp>0),Number(!flightMode.simWatch&&p.hp>0));
 sim.redCount=sim.red.reduce((n,b)=>n+Number(b.hp>0),0);
 updateFighterBattleReadout();
 if(!sim.redCount)finishFighterBattle('won');
 else if(flightMode.simWatch&&!sim.blueCount)finishFighterBattle('red-won');
 else if(sim.time>=180)finishFighterBattle('timeout');
}
function paintFighterBattle(camera){
 paintFighterCrossZones(camera);
 for(const ship of fighterBattle.bots){
  const loading=ship.staged&&fighterBattle.phase==='combat'&&fighterBattle.time>=ship.loadAt;
  if(!ship.hp||(ship.staged&&!loading)||!withinCamera(ship,camera,53))continue;
  const color=simTeamColors[ship.simTeam-1];
  g.save();g.translate(ship.x,ship.y);g.rotate(ship.aim+Math.PI/2);if(ship.bayUntil)g.scale(.46,.46);
  if(loading){
   const lift=clamp((fighterBattle.time-ship.loadAt)/fighterWave.liftTime,0,1);
   g.strokeStyle=color;g.globalAlpha=.35+(1-lift)*.45;g.strokeRect(-23,-27,46,54);
   g.globalAlpha=lift;const size=.65+.35*lift;g.scale(size,size);
  }
  const painted=paintFighterArt(0,1,starterHullId);
  if(!painted){
   g.lineWidth=1;g.strokeStyle=color;g.fillStyle='#29506b';
   poly([[0,-27],[10,-9],[31,13],[25,18],[7,13],[0,23],[-7,13],[-25,18],[-31,13],[-10,-9]]);
  }
  g.fillStyle=ship.hitGlow>0?'#fff6d9':color;
  g.fillRect(-25,10,12,3);g.fillRect(13,10,12,3);
  g.restore();
 }
}
function paintFighterBattleRadar(camera){
 const w=103,h=81,x=frameW-115,y=41;
 const sx=w/(arena.right-arena.left),sy=h/(arena.bottom-arena.top);
 const mapX=n=>x+(n-arena.left)*sx,mapY=n=>y+(n-arena.top)*sy;
 g.save();g.setTransform(scale,0,0,scale,0,0);
 g.fillStyle='#0b1624e8';g.fillRect(x,y,w,h);
 g.lineWidth=1;g.strokeStyle='#46637c';g.strokeRect(x,y,w,h);
 g.beginPath();g.rect(x,y,w,h);g.clip();
 g.fillStyle='#71374c';g.fillRect(x,y,w,mapY(fighterCross.north)-y);
 g.fillStyle='#235672';g.fillRect(x,mapY(fighterCross.south),w,y+h-mapY(fighterCross.south));
 for(const base of [fighterCross.friendly,fighterCross.hostile]){g.strokeStyle='#caecc7';g.strokeRect(mapX(base.x)-3,mapY(base.y)-3,6,6);}
 g.strokeStyle='#85a5bd';g.strokeRect(mapX(camera.x),mapY(camera.y),camera.w*sx,camera.h*sy);
 g.fillStyle='#a28d75';
 for(const rock of asteroids){
  const r=Math.max(1,rock.r*sx*.6);g.fillRect(mapX(rock.x)-r,mapY(rock.y)-r,r*2,r*2);
 }
 for(const ship of fighterBattle.bots)if(ship.hp&&!ship.staged){
  g.fillStyle=simTeamColors[ship.simTeam-1];g.fillRect(mapX(ship.x)-1,mapY(ship.y)-1,2,2);
 }
 if(!flightMode.simWatch){g.fillStyle='#fff3b8';g.fillRect(mapX(p.x)-2,mapY(p.y)-2,4,4);}
 g.restore();
}

function flightCamera(ship=missionDeparture?.craft??p){
 if(isCrossWatch())return crossWatchCamera();
 if(flightMode.simWatch&&fighterBattle)return simulatorFleetCamera();
 const follow=flightMode.simWatch&&simDirector?.pilotDown?
  (redGrinConvoy??pirateCapitals.find(a=>a.hp>0)??activeVanduls()[0]):null;
 const anchor=follow??ship??launch;
 if(flightMode.scaleFly&&scaleFlyShips?.overview){
  const {left,right,top,bottom}=scaleFlyShips.overview;
  const zoom=Math.min(1,frameW/(right-left),frameH/(bottom-top)),w=frameW/zoom,h=frameH/zoom;
  return {x:(left+right-w)/2,y:(top+bottom-h)/2,w,h,zoom};
 }
 if(flightMode.scaleFly||flightMode.fighterBattle)return {x:clamp(anchor.x-frameW/2,0,Math.max(0,arena.right+edge-frameW)),
  y:clamp(anchor.y-frameH/2,0,Math.max(0,arena.bottom+edge-frameH)),w:frameW,h:frameH,zoom:1};
 const outside=playerIngress||missionDeparture?.flying?clamp(anchor.y-(H-carrierArrival.exterior),0,carrierArrival.exterior):0;
 // Zoom only as the fighter descends. Reversing the lift returns smoothly
 // to the ordinary flight frame, with the same transform used by aiming.
 const close=capitalLocked()&&!blackwaterLatched()&&!motion?.matches?1-berthLift(capitalShip):0;
 const maxZoom=Math.min(1.28,Math.max(1,frameH/440),Math.max(1,frameW/325));
 const baseZoom=1+(maxZoom-1)*close,baseW=frameW/baseZoom,baseH=frameH/baseZoom;
 let x=close?anchor.x+clamp((capitalShip.x-anchor.x)*close*.58,-baseW*.30,baseW*.30):anchor.x;
 let y=close?anchor.y+clamp((capitalShip.y-anchor.y)*close*.58,-baseH*.30,baseH*.30):anchor.y;
 let zoom=baseZoom;
 if(capitalHangarApproach?.ship&&capitalHangarApproach.ship===capitalShip&&!motion?.matches){
  // The lift is a deck-local point. Resolve it every frame so the camera
  // approaches the entrance while the carrier continues moving and turning.
  const carrier=capitalShip,{lift}=carrier,target=berthWorld(carrier,lift.x,lift.y);
  const progress=clamp(capitalHangarApproach.elapsed/capitalHangarZoomSeconds,0,1);
  const ease=smoothBerth(progress);
  x+=(target.x-x)*ease;y+=(target.y-y)*ease;
  zoom=baseZoom*(1+1.05*ease);
 }
 const south=capitalShip?.stream||onlineBattle?arena.bottom+edge:H+outside;
 if(flightViewMode!=='normal'&&!capitalLocked()&&!playerIngress&&!missionDeparture?.flying){
  const escort=resoluteFormation(capitalShip,elapsed);
  if(flightViewMode==='fleet'){
   zoom=.72;
   if(capitalShip&&Math.hypot(capitalShip.x-anchor.x,capitalShip.y-anchor.y)<680){
    let l=anchor.x-38,r=anchor.x+38,t=anchor.y-38,b=anchor.y+38;
    const include=(point,radius)=>{
     l=Math.min(l,point.x-radius);r=Math.max(r,point.x+radius);
     t=Math.min(t,point.y-radius);b=Math.max(b,point.y+radius);
    };
    include(capitalShip,Math.hypot(capitalCourse.width,capitalCourse.height)/2+16);
    if(escort)include(escort,resoluteFlightLength*.55);
    if(capitalShip.supportFleet)include(capitalShip.supportFleet,Math.hypot(capitalCourse.width,capitalCourse.height)/2+16);
    x=(l+r)/2;y=(t+b)/2;
    zoom=Math.max(.46,Math.min(zoom,frameW/(r-l),frameH/(b-t)));
   }
  }else{
   zoom=1.58;
   // Focus the visible escort when nearby; otherwise inspect the fighter.
   if(escort&&Math.hypot(escort.x-anchor.x,escort.y-anchor.y)<Math.min(frameW,frameH)*.95){
    x=escort.x;y=escort.y;
   }
  }
  const w=frameW/zoom,h=frameH/zoom;
  const fit=(center,a,b,span)=>span>=b-a?(a+b-span)/2:clamp(center-span/2,a,b-span);
  return {x:fit(x,arena.left-edge,arena.right+edge,w),y:fit(y,floorNorth(),south,h),w,h,zoom};
 }
 const w=frameW/zoom,h=frameH/zoom;
 return {x:clamp(x-w/2,arena.left-edge,arena.right+edge-w),y:clamp(y-h/2,floorNorth(),south-h),w,h,zoom};
}
const fighterSprite=typeof window.Image==='function'?new window.Image():null;
if(fighterSprite)fighterSprite.src='./fighter-winged.png?v=23';
const fighterBankArts={left:null,right:null},altFighterArts=new Map();
function flightSpriteFor(id){
 if(id===stockFighterId)return fighterSprite;
 const profile=id===civilianFreighter.id?civilianFreighter:window.RiftFighters?.get?.(id);
 if(!profile?.flightArt||typeof window.Image!=='function')return null;
 if(!altFighterArts.has(id)){const art=new window.Image();art.src=profile.flightArt;altFighterArts.set(id,art);}
 return altFighterArts.get(id);
}
const flightVisuals=new WeakMap();
const clamp=(x,a,b)=>Math.min(b,Math.max(a,x)),rand=(a,b)=>a+Math.random()*(b-a);
const motion=window.matchMedia?.('(prefers-reduced-motion: reduce)');
if(shakeSwitch&&motion?.matches)shakeSwitch.checked=false;
motion?.addEventListener?.('change',e=>{if(e.matches){if(shakeSwitch)shakeSwitch.checked=false;cancelCanopyAudio();}});
const soundKey='rift-runner.sound.v1';
function preferredSound(){try{const stored=localStorage.getItem(soundKey);if(stored==='on'||stored==='off')return stored==='on';}catch{}return soundSwitch?.checked??true;}
let soundOn=preferredSound(),audio=null,master=null,openingAudio=null,audioParked=false,interruptedRetryAt=-Infinity;
const voices=new Set(),masterLevel=.28;let noiseContext=null,noiseBuffer=null,blaster=null,ballistic=null;
let burstEchoAsset=null,burstEchoVoice=null,arenaMusicAsset=null,arenaMusic=null,thrusterAsset=null;
const thrusterLoopLength=4.10,thrusterPriming=1105/32000;
const arenaMusicGain=.10,arenaMusicDuck=.036,arenaLoopLength=10.56,arenaLoopPad=.096;
if(soundSwitch)soundSwitch.checked=soundOn;
const audioClock=()=>globalThis.performance?.now?.()??Date.now();
// Module ratings are dimensionless; the standard unshielded fit anchors forward handling.
const civilianFreighter=Object.freeze({id:'civilian-freighter',name:'Civilian Freighter',hullClass:'vessel',
 art:'./civilian-freighter-pad.webp',flightArt:'./civilian-freighter-pad.webp',cardArt:'./civilian-freighter-terminal-preview.webp',hullHp:52,weight:130,radius:29,turnMultiplier:.65,artLengthScale:2});
const fighterProfiles={[civilianFreighter.id]:civilianFreighter,winged:{hullHp:20,weight:60,engine:'stock-thruster'}};
const engineProfiles={
 'stock-thruster':{weight:20,speedRating:10,strength:10,acceleration:1750,he3PerSecond:1,audioProfile:'stock-loop'},
 'hauler-drive':{weight:30,speedRating:10,strength:12,acceleration:1650,he3PerSecond:1.25,audioProfile:'stock-loop'},
 'test-thruster':{weight:14,speedRating:5,strength:7,acceleration:1750,he3PerSecond:1,audioProfile:'synth'},
 'surge-7-thruster':{weight:22,speedRating:11,strength:11,acceleration:1750,he3PerSecond:1.4,audioProfile:'synth',surge:true}
};
const surgeRules=Object.freeze({tap:.35,active:.60,cooldown:6,cost:4,heat:14,speed:1.45,maxSpeed:330});
let surgeTap=null,surgeUntil=0,surgeReadyAt=0,surgeLowUntil=0;
const surgeActive=()=>surgeUntil>elapsed;
function pressSurge(event,source){
 if(onlineBattle)return false;
 if(event.isTrusted!==true||state!=='play'||document.hidden||routeParked||capitalLocked()||hangarDialog?.open||
    !fittedEngine()?.surge||!p.hp||elapsed<surgeReadyAt)return;
 const prior=surgeTap;
 if(!prior||prior.source!==source||elapsed-prior.at>surgeRules.tap){surgeTap={source,at:elapsed};return;}
 surgeTap=null;
 if(!spendShotHe3(surgeRules.cost)){surgeLowUntil=elapsed+1.3;updateSurgeHud();return;}
 surgeUntil=elapsed+surgeRules.active;surgeReadyAt=elapsed+surgeRules.cooldown;
 addFlightHeat(surgeRules.heat);
 burstRing(p.x,p.y,32,'#cfa5ff');showFlightPower();updateSurgeHud();
}
function updateSurgeHud(){
 if(!surgeLabel||!mainThrustButton)return;
 const equipped=!!fittedEngine()?.surge,visible=equipped&&state==='play'&&!capitalLocked();
 const phase=!visible?'':surgeActive()?'active':elapsed<surgeReadyAt?'cooldown':elapsed<surgeLowUntil?'fuel':'ready';
 const label=phase==='ready'?'SURGE':phase==='active'?'BOOST':phase==='cooldown'?Math.ceil(surgeReadyAt-elapsed)+'s':phase==='fuel'?'LOW':'THR';
 if(surgeLabel.textContent!==label)surgeLabel.textContent=label;
 if(mainThrustButton.dataset.surge!==phase){
  if(phase)mainThrustButton.dataset.surge=phase;else delete mainThrustButton.dataset.surge;
  if(surgeStatus)surgeStatus.textContent=phase==='ready'?'Surge ready. Double-tap the main thruster or E.':phase==='active'?'Surge boost active.':
   phase==='cooldown'?'Surge is cooling down.':phase==='fuel'?'Surge needs 4 He3.':'';
 }
}
const powerProfiles={'weifer-he3-core':{name:'Weifer He3 Power Generator',weight:8,he3PerSecond:2},'weifer-he3-core-mk2':{name:'Weifer He3 Power Generator Mk II',weight:13,he3PerSecond:3.5,art:'./shop-weifer-mk2.webp',requiresPurchase:true},'weifer-he3-core-mk3':{name:'Weifer He3 Power Generator Mk III',weight:21,he3PerSecond:5,art:'./shop-weifer-mk3.webp',requiresPurchase:true}};
const batteryProfiles={'kestrel-h20-reserve-cell':{name:'Kestrel H20 He3 Power Storage Cell',capacityHe3:20,weight:6,medium:'Superconducting ceramic lattice'},'kestrel-h30-reserve-cell':{name:'Kestrel H30 He3 Power Storage Cell',capacityHe3:30,weight:10,art:'./shop-kestrel-h30.webp',medium:'Superconducting ceramic lattice',requiresPurchase:true}};
const shieldProfiles={'aegis-s3':{name:'Aegis S-3 Shield Generator',weight:12,capacity:5,duration:5,cooldown:10,he3PerSecond:3,radius:48,absorption:{energy:1,ballistic:.5}}};
const shieldFitKey='rift-runner.shield-fit.v1';
function ownsAegis(){
 if(managedBuild)return ownsBuildPart('aegis-s3');
 try{return window.RiftCredits?.ownsAegis?.()===true;}catch{return false;}
}
function preferredShield(){
 try{const saved=localStorage.getItem(shieldFitKey);if(saved==='aegis-s3'&&ownsAegis())return saved;}catch{}
 return null;
}
const stockFitWeight=106,speedPerRating=22.2,stockEngineStrength=10,stockBrakeDamping=2.8;
const contactMassScale=.32*stockFitWeight;
const flightEnvelope={strafe:.78,reverse:.72,strafeThrust:.34,reverseThrust:.62,noseTrim:.23,sideTrim:.72};
const flightMassRatios=weight=>{
 const impulse=clamp(stockFitWeight/weight,.72,1.27);
 return {impulse,speed:clamp(impulse**.95,.73,1.25),handling:clamp(impulse**2.15,.60,1.48)};
};
const hardImpactSpeed=185,hardImpactAlignment=.94;
const sparrow='sparrow-s2';
const guns={
 [sparrow]:{label:'Sparrow S2',fullLabel:'Sparrow S2 Gimbal Laser',size:2,wingMount:true,kind:'energy',he3PerShot:.5,normalInterval:.20,targetSpreadChance:0,weight:3,damage:2,holdRepeat:false,preview:'./blaster-test.mp3',speed:570,recoil:10,kick:.10,push:.18,pushMax:140,normalSpread:0,burstSpread:2.5,muzzle:11,edge:'#58a9f0',core:'#e2f8ff',hit:'#bedfff',ring:'#9dd6ff'},
 blaster:{label:'Sterling',fullLabel:'Sterling C.32 Laser',kind:'energy',he3PerShot:1,normalInterval:.20,targetSpreadChance:0,weight:5,damage:3,holdRepeat:false,preview:'./blaster-test.mp3',speed:570,recoil:20,kick:.145,push:.286,pushMax:245,normalSpread:0,burstSpread:2.5,muzzle:13,edge:'#32a786',core:'#d4fff1',hit:'#d0fff2',ring:'#99ffe0'},
 ballistic:{label:'A-Alkine',fullLabel:'A-Alkine Ballistic Repeater',kind:'ballistic',normalInterval:.125,burst:{pattern:[0,-.5,.5,-1,1,0],interval:.043,recovery:.46},targetSpreadChance:1,weight:7,damage:5,holdRepeat:true,preview:'./ballistic-test.mp3',speed:570,recoil:34,kick:.185,push:.422,pushMax:335,normalSpread:1.8,burstSpread:6,muzzle:17,edge:'#f49a31',core:'#fff4b8',hit:'#ffd387',ring:'#ffbc63'},
 ak77:{label:'AK77',fullLabel:'AK77 Gatling Ballistic',kind:'ballistic',targetSpreadChance:1,weight:9,damage:2,holdRepeat:false,burstOnly:true,
  burst:{pattern:[0,-.25,.25,-.5,.5,-.8,.8,-1,1,-.65,.65,-.85,.85,-.55,.55,-.25,.25,0],interval:.035,recovery:1.75},
  preview:'./ballistic-test.mp3',speed:570,recoil:20,kick:.12,push:.245,pushMax:265,normalSpread:0,burstSpread:4.5,muzzle:15,edge:'#ef8147',core:'#fff4d3',hit:'#ffd2a0',ring:'#ff9964'}
};
const shotSoundKey='rift-runner.shot-sound.v1',fitKey='rift-runner.fighter-fit.v1',engineFitKey='rift-runner.engine-fit.v1';
function readFighterFit(){
 const standard={primary:'blaster',secondary:'ballistic'};
 try{
  const saved=JSON.parse(localStorage.getItem(fitKey));
  if(saved?.version===1&&Object.hasOwn(guns,saved.primary)&&!guns[saved.primary].wingMount){
   const alternate=Object.keys(guns).find(name=>name!==saved.primary&&!guns[name].wingMount);
   return {primary:saved.primary,secondary:saved.secondary===null?null:
    Object.hasOwn(guns,saved.secondary)&&!guns[saved.secondary].wingMount&&saved.secondary!==saved.primary?saved.secondary:alternate};
  }
 }catch{}
 return standard;
}
const fighterRegistry=window.RiftFighters,starterHullId='rift-fighter';
const shipBuildKey='rift-runner.ship-build.v1',hullKey='rift-runner.hull-owned.v1';
let hullId=managedBuild?fighterRegistry?.selected()??starterHullId:starterHullId,hangarPreviewId=null,hangarTryHull=null;
const ownsExtraHull=id=>fighterRegistry?.owned(id)===true;
const ownedHullChoices=()=>[starterHullId,...(fighterRegistry?.ids.filter(ownsExtraHull)??[])];
const parkingKey=id=>'rift-runner.fighter-parking.v1.'+id;
function readParking(id){
 try{return localStorage.getItem(parkingKey(id))??null;}catch{return undefined;}
}
const parkingAPI=window.RiftFighterParking;
const fighterParkedVessel=(id=hullId)=>parkingAPI?.get(id)??hangarHomeVessel();
const parkedBay=id=>[1,2,4,6].includes(parkingAPI?.details?.(id)?.bay)?parkingAPI.details(id).bay:1;
const parkingHydrations=new Map();
function hydrateFighterParking(id){
 if(!window.crypto?.getRandomValues||!parkingAPI?.hydrate||!managedBuild)return null;
 const generation=currentCharacterGeneration();
 if(generation===undefined||id===starterHullId&&!readHullRaw(id)||id!==starterHullId&&!ownsExtraHull(id))return null;
 const key=String(generation)+':'+id;
 if(parkingHydrations.has(key))return parkingHydrations.get(key);
 const status={pending:true};
 parkingHydrations.set(key,status);
 const complete=()=>{status.pending=false;enterLinkedCarrierRoute();if(hangarDialog?.open)refreshBuildDisplays();};
 Promise.resolve().then(()=>parkingAPI.hydrate(id,{migrate:true})).then(complete,complete);
 return status;
}
const selectableHulls=()=>ownedHullChoices().filter(id=>!hangarVessel||fighterParkedVessel(id)===hangarVessel);
const currentCapitalId=ship=>ship?.vessel===bifrostCapital?'bifrost':'rift-carrier';
const hullRepairDurationMs=240000,partialHullRepairDurationMs=60000,legacyHullRepairDurationMs=60000;
const hullRepairDuration=damage=>damage?.hullHp>0?partialHullRepairDurationMs:hullRepairDurationMs;
let hullRepairReadyAt=0,hullRepairSpan=0,lastHullRepairRefresh=-Infinity;
function saveHullCertificate(condition,readyAt,expected,damage=null,generation=undefined,id=hullId){
 if(crossBattleWatchRequest)return false;
 const target=fighterRegistry?.hullKey(id)??(id===starterHullId?hullKey:null);
 if(!target||id!==starterHullId&&!ownsExtraHull(id))return false;
 const data=JSON.stringify({version:1,hull:id,condition,...(condition==='repairing'?{readyAt,durationMs:hullRepairDuration(damage)}:condition==='repaired'?{repairedAt:readyAt}:{}),...damage});
 try{
  if(readHullRaw(id)!==expected||generation!==undefined&&currentCharacterGeneration()!==generation)return false;
  localStorage.setItem(target,data);
  return readHullRaw(id)===data&&(generation===undefined||currentCharacterGeneration()===generation)?data:false;
 }catch{return false;}
}
function hullDamage(raw){
 try{
  const {hullHp,maxHullHp}=JSON.parse(raw);
  return Number.isFinite(hullHp)&&Number.isFinite(maxHullHp)&&hullHp>=0&&hullHp<maxHullHp?{hullHp,maxHullHp}:null;
 }catch{return null;}
}
const coreId='weifer-he3-core',batteryId='kestrel-h20-reserve-cell',stockFighterId='winged';
const partProfiles={engine:engineProfiles,core:powerProfiles,battery:batteryProfiles,primary:guns,secondary:guns,shield:shieldProfiles};
const primaryParts=['engine','core','battery','primary'];
function readBuildWallet(){
 if(!managedBuild)return {origin:'legacy'};
 try{
  const wallet=window.RiftCredits?.getBuildState?.();
  return (wallet?.origin==='new'||wallet?.origin==='legacy')&&Array.isArray(wallet.owned)?wallet:null;
 }catch{return null;}
}
function ownsBuildPart(id,wallet=readBuildWallet()){
 if(!wallet||typeof id!=='string')return false;
 if(!managedBuild)return id==='aegis-s3'?ownsAegis():!powerProfiles[id]?.requiresPurchase&&!batteryProfiles[id]?.requiresPurchase;
 try{return wallet.owned.includes(id)&&window.RiftCredits?.owns?.(id)===true;}catch{return false;}
}
const gunFitSize=id=>fighterRegistry?.get(id)?.weaponSize??3;
const compatibleGun=id=>Object.hasOwn(guns,id)&&(guns[id].size??3)===gunFitSize(hullId);
const sparrowSides=fit=>[...(fit.primary===sparrow?[-1]:[]),...(fit.secondary===sparrow?[1]:[])];
const stockSparrowCount=id=>fighterRegistry?.get(id)?.stockSparrows??0;
function availableSparrows(){
 const paid=window.RiftCredits?.weaponQuantity?.(sparrow)??0;
 if(!Number.isSafeInteger(paid)||paid<0||paid>4)return stockSparrowCount(hullId);
 let allocated=0;
 for(const id of fighterRegistry?.ids??[]){
  if(id===hullId||gunFitSize(id)!==2||!ownsExtraHull(id))continue;
  try{const fit=JSON.parse(readShipRaw(id));if(fit?.version===1&&fit.hull===id)allocated+=Math.max(0,sparrowSides(fit).length-stockSparrowCount(id));}catch{}
 }
 return stockSparrowCount(hullId)+Math.max(0,paid-allocated);
}
const volleyHe3=(gun,sides=gun?.wingMount?sparrowSides(fighterFit):[])=>(gun?.he3PerShot??0)*(gun?.wingMount?sides.length:1);
function ownedSlot(slot,value,wallet){
 if(slot==='primary'||slot==='secondary'){
  if(!compatibleGun(value))return null;
  if(gunFitSize(hullId)===2)return wallet&&value===sparrow&&availableSparrows()>0?sparrow:null;
 }
 return typeof value==='string'&&Object.hasOwn(partProfiles[slot],value)&&ownsBuildPart(value,wallet)?value:null;
}
function readHullRaw(id=hullId){
 const key=fighterRegistry?.hullKey(id)??(id===starterHullId?hullKey:null);
 try{return key?localStorage.getItem(key)??null:undefined;}catch{return undefined;}
}
function hasFinishedHangarRepair(raw){
 try{const cert=JSON.parse(raw);return cert?.condition==='repaired'&&Number.isSafeInteger(cert.repairedAt)&&cert.repairedAt>0;}catch{return false;}
}
function fighterHullCondition(wallet=readBuildWallet(),raw=readHullRaw(),id=hullId){
 hullRepairReadyAt=hullRepairSpan=0;
 if(!wallet||raw===undefined||id!==starterHullId&&!ownsExtraHull(id))return 'unavailable';
 if(raw!==null){
  try{
   const cert=JSON.parse(raw);
   if(cert?.version!==1||cert.hull!==id)return 'unavailable';
   if(Object.hasOwn(cert,'hullHp')||Object.hasOwn(cert,'maxHullHp')){
    const damage=hullDamage(raw);
    if(!damage||cert.condition==='repaired'&&damage.hullHp===0||cert.condition==='damaged'&&damage.hullHp!==0)return 'unavailable';
   }
   if(['damaged','repaired'].includes(cert.condition))return cert.condition;
   if(cert.condition!=='repairing'||!Number.isSafeInteger(cert.readyAt)||cert.readyAt<=0||
    (Object.hasOwn(cert,'durationMs')&&cert.durationMs!==hullRepairDurationMs&&
     (![30000,partialHullRepairDurationMs].includes(cert.durationMs)||!(hullDamage(raw)?.hullHp>0))))return 'unavailable';
   if(Date.now()>=cert.readyAt&&saveHullCertificate('repaired',cert.readyAt,raw,null,undefined,id))return 'repaired';
   hullRepairReadyAt=cert.readyAt;
   hullRepairSpan=cert.durationMs??legacyHullRepairDurationMs;
   return 'repairing';
  }catch{return 'unavailable';}
 }
 if(id!==starterHullId||wallet.origin==='legacy')return 'repaired';
 try{
  const old=JSON.parse(localStorage.getItem(shipBuildKey));
  if(old?.version===1&&old.hull===hullId&&Object.keys(partProfiles).some(slot=>ownedSlot(slot,old[slot],wallet)))return 'repaired';
 }catch{}
 return 'unclaimed';
}
function preferredEngine(){
 try{
  const saved=JSON.parse(localStorage.getItem(engineFitKey));
  if(saved?.version===1&&typeof saved.engine==='string'&&Object.hasOwn(engineProfiles,saved.engine))return saved.engine;
 }catch{}
 return fighterProfiles[stockFighterId].engine;
}
function readShipRaw(id=hullId){
 const key=fighterRegistry?.buildKey(id)??(id===starterHullId?shipBuildKey:null);
 try{return key?localStorage.getItem(key)??null:undefined;}catch{return undefined;}
}
function readShipBuild(stored=readShipRaw()){
 const wallet=readBuildWallet(),empty={engine:null,core:null,battery:null,primary:null,secondary:null,shield:null};
 if(fighterHullCondition(wallet)!=='repaired')return empty;
 let source;
 if(managedBuild){
  try{
   if(stored===undefined)return empty;
   if(stored!==null){
    const build=JSON.parse(stored);
    if(build?.version!==1||build.hull!==hullId)return empty;
    source=build;
   }
  }catch{return empty;}
 }
 if(!source&&hullId===starterHullId&&wallet.origin==='legacy')source={...readFighterFit(),engine:preferredEngine(),core:coreId,battery:batteryId,shield:preferredShield()};
 if(!source)return stockSparrowCount(hullId)?{...empty,primary:sparrow,secondary:stockSparrowCount(hullId)>1?sparrow:null}:empty;
 const fit=Object.fromEntries(Object.keys(empty).map(slot=>[slot,ownedSlot(slot,source[slot],wallet)]));
 if(gunFitSize(hullId)===2){
  // Recognize the pre-Sparrow layout without overwriting saved slot choices.
  const oldSlots=[source.primary,source.secondary];
  if(!oldSlots.includes(sparrow)&&oldSlots.some(id=>Object.hasOwn(guns,id)&&(guns[id].size??3)===3)){
   fit.primary=sparrow;
   fit.secondary=stockSparrowCount(hullId)>1?sparrow:null;
  }
  if(sparrowSides(fit).length>availableSparrows())fit.secondary=null;
 }else if(fit.primary===fit.secondary)fit.secondary=null;
 return fit;
}
const initialBuild=customFlightRequest?{}:readShipBuild(),fighterFit={primary:initialBuild.primary,secondary:initialBuild.secondary};
const isMounted=name=>typeof name==='string'&&(name===fighterFit.primary||name===fighterFit.secondary);
const activeGunKey=()=>managedBuild?fighterRegistry?.gunKey(hullId)??'rift-runner.ship-active-gun.v1':shotSoundKey;
function preferredWeapon(){
 try{const key=localStorage.getItem(activeGunKey())??(hullId===starterHullId&&readBuildWallet()?.origin==='legacy'?localStorage.getItem(shotSoundKey):null);if(isMounted(key))return key;}catch{}
 return fighterFit.primary??fighterFit.secondary;
}
const fighterLoadout=Object.seal({fighter:hullId===starterHullId?stockFighterId:hullId,weapon:preferredWeapon(),engine:initialBuild.engine,power:initialBuild.core,battery:initialBuild.battery,shield:initialBuild.shield,countermeasure:null,utility:null});
function equippedSlot(slot){
 return slot==='core'?fighterLoadout.power:slot==='primary'||slot==='secondary'?fighterFit[slot]:fighterLoadout[slot];
}
function missingFitParts(wallet=readBuildWallet()){
 return primaryParts.filter(slot=>slot==='primary'&&gunFitSize(hullId)===2?!sparrowSides(fighterFit).length:!ownedSlot(slot,equippedSlot(slot),wallet));
}
function refreshStoredFit(raw=readShipRaw()){
 if(!managedBuild||state!=='menu'||raw===undefined)return false;
 const found=readShipBuild(raw),fighter=hullId===starterHullId?stockFighterId:hullId,changed=fighterLoadout.fighter!==fighter;
 if(!changed&&Object.keys(partProfiles).every(slot=>equippedSlot(slot)===found[slot]))return true;
 Object.assign(fighterFit,{primary:found.primary,secondary:found.secondary});
 Object.assign(fighterLoadout,{fighter,engine:found.engine,power:found.core,battery:found.battery,shield:found.shield});
 if(changed||!isMounted(fighterLoadout.weapon)){fighterLoadout.weapon=preferredWeapon();shotSoundVersion++;}
 if(p){syncFlightFit();showFlightPower();}
 showGun();
 return true;
}
function canLaunchBuild(){
 if(!flushBattleDamage())return false;
 if(managedBuild&&state==='menu'&&!refreshStoredFit())return false;
 const wallet=readBuildWallet();
 if(fighterHullCondition(wallet)!=='repaired'||missingFitParts(wallet).length)return false;
 return ['secondary','shield'].every(slot=>!equippedSlot(slot)||ownedSlot(slot,equippedSlot(slot),wallet));
}
function saveShipBuild(oldKey,oldValue,expectedRaw){
 const serial=JSON.stringify({version:1,hull:hullId,...Object.fromEntries(Object.keys(partProfiles).map(slot=>[slot,equippedSlot(slot)]))});
 const key=managedBuild?(fighterRegistry?.buildKey(hullId)??shipBuildKey):oldKey,value=managedBuild?serial:oldValue;
 try{
  if(managedBuild&&(expectedRaw===undefined||readShipRaw()!==expectedRaw))return false;
  localStorage.setItem(key,value);return localStorage.getItem(key)===value;
 }catch{return false;}
}
const fittedFighter=()=>fighterProfiles[fighterLoadout.fighter]??window.RiftFighters?.get?.(fighterLoadout.fighter)??fighterProfiles.winged,fittedEngine=()=>engineProfiles[fighterLoadout.engine];
const mountedGun=()=>fighterLoadout.fighter===civilianFreighter.id?undefined:guns[fighterLoadout.weapon],fittedShield=()=>fighterLoadout.shield==='aegis-s3'&&shieldOwned?shieldProfiles['aegis-s3']:null;
let shieldOwned=fighterLoadout.shield==='aegis-s3',shieldClock=0,shieldHp=0,shieldUntil=0,shieldReadyAt=0,shieldHitAt=-Infinity,shieldPowerWindow=null;
function refreshShieldOwnership(){
 const old=shieldOwned;
 shieldOwned=ownsAegis();
 if(!shieldOwned)shieldHp=0;
 if(old!==shieldOwned&&p&&fighterLoadout.shield==='aegis-s3')syncFlightFit();
 return shieldOwned;
}
function shieldUp(at=shieldClock){return shieldHp>0&&at<Math.min(shieldUntil,shieldPowerWindow?.until??Infinity)-1e-8;}
function dropShield(at,fitted){
 shieldHp=0;shieldUntil=at;shieldReadyAt=at+fitted.cooldown;
}
function beginShieldPower(){
 const fitted=fittedShield();
 if(!fitted||!shieldUp())return;
 const until=shieldClock+p.he3/fitted.he3PerSecond;
 if(until<=shieldClock+1e-8)dropShield(shieldClock,fitted);
 else shieldPowerWindow={fitted,until};
}
function endShieldPower(dt){
 const window=shieldPowerWindow;shieldPowerWindow=null;
 if(!window)return;
 const poweredUntil=Math.min(shieldClock+dt,shieldUntil,window.until);
 const used=Math.max(0,poweredUntil-shieldClock)*window.fitted.he3PerSecond;
 p.he3=Math.max(0,p.he3-used);
 if(shieldHp>0&&window.until<shieldUntil-1e-8&&window.until<=shieldClock+dt+1e-8)dropShield(window.until,window.fitted);
}
function resetShield(){shieldClock=shieldHp=shieldUntil=shieldReadyAt=0;shieldHitAt=-Infinity;shieldPowerWindow=null;}
function showShieldControl(){
 if(!flightShield)return;
 const fitted=fittedShield();
 flightShield.hidden=!fitted||state!=='play'||capitalLocked()||document.hidden;
 if(flightShield.hidden)return;
 const active=shieldUp(),wait=shieldReadyAt-shieldClock;
 const phase=active?'active':wait>1e-8?'cooldown':p.he3<=1e-8?'fuel':'ready';
 const label=active?'Shield '+shieldHp+'/'+fitted.capacity+' · '+Math.ceil(shieldUntil-shieldClock)+'s':
  phase==='cooldown'?'Shield · '+Math.ceil(wait)+'s':phase==='fuel'?'Shield · Low He3':'Shield ready';
 flightShield.disabled=phase!=='ready';flightShield.dataset.phase=phase;
 if(flightShield.textContent!==label)flightShield.textContent=label;
}
function activateShield(){
 if(onlineBattle)return false;
 if(fighterLoadout.shield!=='aegis-s3'||!refreshShieldOwnership())return false;
 const fitted=fittedShield();
 if(!fitted||state!=='play'||capitalLocked()||document.hidden||hangarDialog?.open||!p.hp||p.he3<=1e-8||shieldClock+1e-8<shieldReadyAt)return false;
 shieldHp=fitted.capacity;shieldUntil=shieldClock+fitted.duration;shieldReadyAt=shieldUntil+fitted.cooldown;
 shieldHitAt=-Infinity;showShieldControl();return true;
}
flightShield?.addEventListener('click',event=>{if(event.isTrusted===true)activateShield();});
function shieldDamage(damage,kind,at){
 if(!shieldUp(at)||!refreshShieldOwnership())return damage;
 const fitted=fittedShield();
 if(!fitted||!Object.hasOwn(fitted.absorption,kind))return damage;
 const absorbed=Math.min(shieldHp,damage*fitted.absorption[kind]);
 shieldHp-=absorbed;shieldHitAt=at;
 if(shieldHp===0)dropShield(at,fitted);
 return damage-absorbed;
}
const fittedGenerator=()=>powerProfiles[fighterLoadout.power],fittedBattery=()=>batteryProfiles[fighterLoadout.battery];
const flightHe3Meter=document.getElementById('flight-he3-meter'),flightHe3Amount=document.getElementById('flight-he3-amount');
let laserHe3Ready=false;
const flightHeatMeter=document.getElementById('flight-heat-meter'),flightHeatAmount=document.getElementById('flight-heat-amount');
const heatEye=document.getElementById('flight-heat-eye'),heatAlarm=document.getElementById('flight-heat-alert');
const heatRules={max:100,revealAt:80,revealRange:300,normalShot:2,burstShot:2.5,burstActivation:3,coolPerSecond:8,coolDelay:.35};
const heatExposed=ship=>ship.hp>0&&ship.heat>=heatRules.revealAt;
const thermalContact=(observer,target)=>heatExposed(target)&&Math.hypot(target.x-observer.x,target.y-observer.y)<=heatRules.revealRange;
function showFlightHeat(){
 const value=Math.round(p.heat);
 if(flightHeatMeter&&flightHeatMeter.value!==value)flightHeatMeter.value=value;
 const text=value+' / '+heatRules.max;
 if(flightHeatAmount&&flightHeatAmount.textContent!==text)flightHeatAmount.textContent=text;
 const exposed=heatExposed(p);
 if(heatEye&&heatEye.hidden===exposed){
  heatEye.hidden=!exposed;
  if(heatAlarm)heatAlarm.textContent=exposed?'Heat signature exposed. Nearby Vandul can track you behind cover.':'';
 }
}
function addFlightHeat(amount,ship=p){
 ship.heat=Math.min(heatRules.max,ship.heat+amount);
 ship.coolAt=elapsed+heatRules.coolDelay;
 if(ship===p)showFlightHeat();
}
function advanceFlightHeat(dt,ship=p){
 if(ship.heat>0){
  const cooling=Math.max(0,Math.min(dt,elapsed-ship.coolAt));
  if(cooling){
   ship.heat=Math.max(0,ship.heat-heatRules.coolPerSecond*cooling);
   if(ship===p)showFlightHeat();
  }
 }
}
function simulateFlightPower(dt,commanded){
 const available=p.he3+fittedGenerator().he3PerSecond*dt;
 const draw=commanded?fittedEngine().he3PerSecond*dt:0;
 const powered=available+1e-8>=draw;
 p.he3=clamp(available-(powered?draw:0),0,fittedBattery().capacityHe3);
 return powered;
}
function spendShotHe3(cost){
 if(!cost)return true;
 if(p.he3+1e-8<cost)return false;
 p.he3=Math.max(0,p.he3-cost);
 return true;
}
function showFlightPower(){
 const ready=p.he3+1e-8>=volleyHe3(mountedGun());
 if(laserHe3Ready!==ready){laserHe3Ready=ready;showFire();}
 if(!flightHe3Meter||!flightHe3Amount)return;
 const battery=fittedBattery(),capacity=battery?.capacityHe3??0,value=Math.min(capacity,Math.floor(p.he3+1e-8));
 const chargeLabel=(battery?battery.name+' · ':'')+'He3 battery charge';
 if(flightHe3Meter.getAttribute('aria-label')!==chargeLabel)flightHe3Meter.setAttribute('aria-label',chargeLabel);
 if(flightHe3Meter.max!==(capacity||1))flightHe3Meter.max=capacity||1;
 if(flightHe3Meter.value!==value)flightHe3Meter.value=value;
 const text=value+' / '+capacity;
 if(flightHe3Amount.textContent!==text)flightHe3Amount.textContent=text;
}
function fittedWeight(){
 return fittedFighter().weight+(fittedEngine()?.weight??0)+(fittedGenerator()?.weight??0)+
  (fittedBattery()?.weight??0)+(fittedShield()?.weight??0)+(guns[fighterFit.primary]?.weight??0)+(guns[fighterFit.secondary]?.weight??0);
}
const riftCockpitArt='./rift-3-space-cockpit.webp';
const cockpitArtFor=hull=>hull===civilianFreighter.id?freighterCockpitArt:(hull==='rift-fighter'||hull==='winged')?riftCockpitArt:null;
const flightCanopy=document.getElementById('flight-canopy');
const freighterCockpitArt='./civilian-freighter-cockpit.webp';
const freighterView=document.getElementById('freighter-cockpit-view'),freighterViewOpen=document.getElementById('freighter-view-open');
freighterViewOpen?.addEventListener('click',event=>{
 const viewArt=cockpitArtFor(fighterLoadout.fighter);
 if(!event.isTrusted||!viewArt||state!=='play'||freighterView?.open)return;
 const art=document.getElementById('freighter-flight-art');
 const cargo=fighterLoadout.fighter===civilianFreighter.id;
 if(art){
  if(art.getAttribute('src')!==viewArt)art.setAttribute('src',viewArt);
  art.setAttribute('alt',cargo?'Pilot and co-pilot seats looking out at the stars':'Rift-3 fighter canopy looking out at the stars');
 }
 freighterView?.setAttribute('aria-label',cargo?'Civilian Freighter cockpit':'Rift-3 cockpit');
 if(arenaSettings)arenaSettings.open=false;
 freighterView?.showModal?.();
});
const fighterDisplayCode=()=>fittedFighter().name?.replace(/ (?:fleet )?fighter$/i,'').toUpperCase()??'RIFT-3';
function syncFlightFit(){
 const weight=fittedWeight(),engine=fittedEngine(),ratios=flightMassRatios(weight);
 const hull=fittedFighter(),thrustFactor=((engine?.strength??0)/stockEngineStrength)*ratios.handling*(hull.thrustMultiplier??1);
 Object.assign(p,{fighter:fighterLoadout.fighter,r:hull.radius??17,turnMultiplier:hull.turnMultiplier??1,weight,recoilFactor:ratios.impulse,speed:(engine?.speedRating??0)*speedPerRating*ratios.speed,
  acceleration:(engine?.acceleration??0)*thrustFactor,brakeDamping:stockBrakeDamping*thrustFactor,invMass:contactMassScale/weight});
 const label=document.getElementById('flight-fighter-id'),display=fighterDisplayCode();
 if(label&&label.textContent!==display)label.textContent=display;
 const art=cockpitArtFor(fighterLoadout.fighter);
 if(freighterViewOpen)freighterViewOpen.hidden=!art;
 if(freighterView?.open)freighterView.close();
 if(flightCanopy){
  flightCanopy.dataset.hull=fighterLoadout.fighter==='winged'?'rift-fighter':fighterLoadout.fighter;
  const dashboard=fighterLoadout.fighter===civilianFreighter.id?'./civ-freighter-flight-dash.webp':
   fighterLoadout.fighter==='bastion-9'?'./swift-2-flight-dash-rounded.webp':fighterLoadout.fighter==='stocky-light-fighter'?'./bison-2-flight-dash.webp':art?'./rift-3-flight-dash.webp':null;
  flightCanopy.hidden=!dashboard;
  flightCanopy.style?.setProperty('background-image',dashboard?'url("'+dashboard+'")':'');
 }
 updateHud();
}
let shotSoundVersion=0;
const burstModes=Object.fromEntries(Object.entries(guns).map(([name,gun])=>[name,!!gun.burstOnly]));
const normalBurst={pattern:[0,-.5,.5,-1,1,0],interval:.050,recovery:.46};
const rpmText=n=>Math.round(n).toLocaleString('en-US');
function gunRateText(gun){
 const burst=gun.burst??normalBurst,n=burst.pattern.length;
 // First shot is immediate; cooldown starts as the last shot fires.
 const repeated=60*n/((n-1)*burst.interval+burst.recovery);
 const normal=gun.burstOnly?'Burst only':gun.holdRepeat?'Normal: up to '+rpmText(60/gun.normalInterval)+' RPM (tap or hold)':
  'Normal: manual, up to '+rpmText(60/gun.normalInterval)+' RPM';
 return normal+' · Burst: '+rpmText(60/burst.interval)+' RPM in volley, ~'+rpmText(repeated)+' RPM with cooldown';
}
const normalPattern=[1,-1,.55,-.55],normalShots=new Map(),nextNormalShot=new Map(),degrees=Math.PI/180;
let lastGunTap=null,fireBurst=null,burstCooldown=0;
function showFire(){
 if(!fireButton)return;
 if(onlineBattle){fireButton.textContent='FIRE';fireButton.disabled=onlineBattle.state.status==='complete'||p.hp<=0;return;}
 const gun=mountedGun();
 fireButton.disabled=!gun;
 if(!gun){delete fireButton.dataset.weapon;delete fireButton.dataset.phase;fireButton.textContent='NO WEAPON';fireButton.setAttribute?.('aria-label','No weapon fitted');return;}
 const {label:name,holdRepeat,he3PerShot}=gun;
 const mode=burstModes[fighterLoadout.weapon],phase=fireBurst?'burst':burstCooldown>0?'cooldown':he3PerShot&&!laserHe3Ready?'low-he3':'';
 fireButton.dataset.weapon=fighterLoadout.weapon;
 if(phase)fireButton.dataset.phase=phase;else delete fireButton.dataset.phase;
 fireButton.textContent=phase==='cooldown'?'COOLDOWN':phase==='low-he3'?'LOW HE3':mode?'BURST':'FIRE';
 fireButton.setAttribute?.('aria-label',phase==='cooldown'?'Cooling down':phase==='low-he3'?name+' requires He3':mode?'Fire '+name+' burst':holdRepeat?'Fire '+name+'; hold to repeat':'Fire '+name);
}
function showGun(){
 for(const [name,button] of Object.entries(gunButtons))if(button){
  button.setAttribute('aria-pressed',String(fighterLoadout.weapon===name));
  button.hidden=!isMounted(name);
  const burst=!!burstModes[name];
  button.title=guns[name].fullLabel;
  button.setAttribute('aria-label',guns[name].fullLabel+(burst?' · Burst':''));
  if(burst)button.dataset.burst='true';else delete button.dataset.burst;
 }
 const first=gunButtons[fighterFit.primary],rack=first?.parentElement;
 if(rack&&rack.firstElementChild!==first)rack.insertBefore(first,rack.firstElementChild);
 showFire();
}
showGun();
function audioStatus(text){
 if(soundStatus&&soundStatus.textContent!==text)soundStatus.textContent=text;
 refreshHangarEngineAudio();
}
function refreshHangarEngineAudio(){
 if(!hangarDialog?.open)return;
 const ready=soundOn&&audio?.state==='running'&&!!master;
 if(hangarSoundStatus){
  const copy=ready?'Engine sound ready. Hold Test engine.':soundOn?'Audio starts on the first tap.':'Game sound is off.';
  if(hangarSoundStatus.textContent!==copy)hangarSoundStatus.textContent=copy;
 }
}
const audioReady=()=>{audioStatus('Audio active in browser.');refreshSoundActivation?.();};
const audioPending=()=>{audioStatus('No audio yet. Tap a test button again.');refreshSoundActivation?.();};
audioStatus(soundOn?'Ready. Tap Test shot or Test engine.':'Sound off.');
const phoneKey='rift-runner.iphone-audio.v1';
function preferredPhoneAudio(){try{return localStorage.getItem(phoneKey)==='on';}catch{return false;}}
let phoneAudioOn=preferredPhoneAudio(),phoneSession=null,nativePreview=null;
if(phoneSwitch)phoneSwitch.checked=phoneAudioOn;
function availablePhoneAudio(){
 try{
  const n=window.navigator,session=n?.audioSession;
  if(session&&'type'in session)return true;
  const apple=/iPhone|iPad|iPod/i.test(n?.userAgent||'')||/Mac/i.test(n?.platform||'')&&n?.maxTouchPoints>1;
  return !!apple&&typeof window.Audio==='function';
 }catch{
  const n=window.navigator;
  return /iPhone|iPad|iPod/i.test(n?.userAgent||'')&&typeof window.Audio==='function';
 }
}
if(phoneTools)phoneTools.hidden=!availablePhoneAudio();
function stopEffectVoices(){
 for(const note of voices){try{note.stop();}catch{}try{note.disconnect();}catch{}}
 voices.clear();
}
function releasePhoneAudio(){
 const old=phoneSession;phoneSession=null;
 if(old){try{if(old.session.type==='playback')old.session.type=old.prior;}catch{}}
}
function requestPhoneAudio(event){
 if(!phoneAudioOn||!soundOn||document.hidden||event?.isTrusted!==true)return false;
 try{
  const session=window.navigator?.audioSession;
  if(!session||!('type'in session))return false;
  if(phoneSession?.session!==session)releasePhoneAudio();
  if(session.type==='playback')return true;
  const prior=session.type;
  session.type='playback';
  if(session.type!=='playback')return false;
  phoneSession={session,prior};return true;
 }catch{return false;}
}
function stopNativePreview(){
 const current=nativePreview;if(!current)return;
 nativePreview=null;window.clearTimeout(current.timeout);
 try{current.element.pause();current.element.removeAttribute?.('src');current.element.load?.();}catch{}
}
phoneSwitch?.addEventListener('change',event=>{
 if(event.isTrusted!==true){phoneSwitch.checked=phoneAudioOn;return;}
 phoneAudioOn=phoneSwitch.checked;
 try{if(!loanerSnapshot)localStorage.setItem(phoneKey,phoneAudioOn?'on':'off');}catch{}
 if(!phoneAudioOn){stopNativePreview();releasePhoneAudio();syncArenaMusic();audioStatus(soundOn?'Silent Mode audio off.':'Sound off.');return;}
 if(!soundOn){audioStatus('Sound off. Turn Sound on to use Silent Mode audio.');return;}
 const applied=requestPhoneAudio(event);
 if(applied)audioStatus('Silent Mode audio requested. Use Test phone audio to check.');
 else audioStatus('Media mode is unavailable here. You can try Test phone audio.');
});
phoneTest?.addEventListener('click',event=>{
 if(event.isTrusted!==true||document.hidden||!mountedGun())return;
 if(!soundOn){audioStatus('Sound off. Turn Sound on to test.');return;}
 if(!phoneAudioOn){audioStatus('Turn on Silent Mode audio before using Test phone audio.');return;}
 requestPhoneAudio(event);
 stopNativePreview();stopArenaMusic();if(openingAudio)openingAudio.ready=null;cancelEngineTest();cancelCanopyAudio();stopThruster(true);stopProjectileVoices();stopBurstEcho();stopEffectVoices();
 if(typeof window.Audio!=='function'){audioStatus('Browser media audio is unavailable here.');return;}
 let preview;
 const failed=()=>{if(!preview||nativePreview===preview){stopNativePreview();syncArenaMusic();audioStatus('Phone audio did not start. Check media volume and output.');}};
 try{
  const element=new window.Audio(mountedGun().preview);preview={element,timeout:0};nativePreview=preview;
  element.preload='auto';element.loop=false;element.volume=.60;audioStatus('Starting phone audio…');
  element.onended=()=>{if(nativePreview===preview){stopNativePreview();syncArenaMusic();}};
  element.onerror=failed;
  preview.timeout=window.setTimeout(failed,5000);
  // Keep .play() in the original click, not a promise callback; no Web Audio
  // or synth is started for this diagnostic.
  Promise.resolve(element.play()).then(()=>{
   if(nativePreview===preview&&soundOn&&phoneAudioOn&&!document.hidden)audioStatus('Phone clip started in browser. Could you hear it?');
  },failed);
 }catch{failed();}
});
function selectGun(next){
 if(next!==null&&!isMounted(next)||next===fighterLoadout.weapon)return;
 stopBallisticHold();stopFirePointer();cancelFireBurst();lastGunTap=null;stopNativePreview();fighterLoadout.weapon=next;shotSoundVersion++;if(p)showFlightPower();showGun();syncArenaMusic();
 try{if(!loanerSnapshot&&next!==null)localStorage.setItem(activeGunKey(),next);}catch{}
 audioStatus(soundOn?(mountedGun()?mountedGun().label+' selected.':'No weapon fitted.'):'Sound off.');
}
for(const [name,button] of Object.entries(gunButtons))button?.addEventListener('click',event=>{
 if(!isMounted(name))return;
 selectGun(name);
 if(!guns[name].burstOnly&&event.isTrusted&&((event.detail??0)>0||event.pointerType)){
  const now=audioClock();
  if(lastGunTap?.name===name&&now-lastGunTap.at<=300){
   lastGunTap=null;toggleBurst(name);
  }else lastGunTap={name,at:now};
 }else lastGunTap=null;
 if(state==='play'&&event.pointerType==='mouse')liveFocus();
});
function toggleBurst(name){
 if(guns[name].burstOnly)return;
 stopBallisticHold();stopFirePointer();cancelFireBurst();burstModes[name]=!burstModes[name];showGun();
}
function shotToken(name){return guns[name]?.kind==='ballistic'?ballistic:blaster;}
function prepareShotSample(context,name,encoded){
 if(shotToken(name)?.context===context)return;
 const token={context,buffer:null};
 if(name==='ballistic')ballistic=token;else blaster=token;
 if(typeof encoded!=='string'||encoded.length<8||encoded.length>1500000||typeof context.decodeAudioData!=='function')return;
 try{
  const bytes=Uint8Array.from(atob(encoded),byte=>byte.charCodeAt(0));
  let settled=false;
  const complete=buffer=>{
   if(settled)return;settled=true;
   if(shotToken(name)===token&&audio===context&&Number.isFinite(buffer?.duration)&&buffer.duration>0&&buffer.duration<=2)token.buffer=buffer;
  };
  const fail=()=>{settled=true;};
  // Some WebKit versions use callbacks; modern ones also return a promise.
  // Call decode exactly once and fence completion from a replaced context.
  const pending=context.decodeAudioData(bytes.buffer,complete,fail);
  if(pending&&typeof pending.then==='function')pending.then(complete,fail);
 }catch{} // Missing, late or unsupported data keeps the synthesized cannon.
}
function prepareShotSamples(context){
 prepareShotSample(context,'blaster',window.RIFT_BLASTER_MP3_BASE64);
 prepareShotSample(context,'ballistic',window.RIFT_BALLISTIC_MP3_BASE64);
 prepareBurstEcho(context);
 prepareThrusterSample(context);
}
function prepareBurstEcho(context){
 if(burstEchoAsset?.context===context)return;
 const token=burstEchoAsset={context,buffer:null},encoded=window.RIFT_BALLISTIC_BURST_ECHO_MP3_BASE64;
 if(typeof encoded!=='string'||encoded.length<8||encoded.length>16000||typeof context.decodeAudioData!=='function')return;
 // The tiny clip travels with the initial page scripts; no fetch between
 // a trusted audio unlock and decode. A late decode never replays a burst.
 try{
  const bytes=Uint8Array.from(atob(encoded),byte=>byte.charCodeAt(0));
  let settled=false;
  const complete=buffer=>{
   if(settled)return;settled=true;
   if(burstEchoAsset===token&&audio===context&&Number.isFinite(buffer?.duration)&&buffer.duration>0&&buffer.duration<=1.1)token.buffer=buffer;
  };
  const fail=()=>{settled=true;};
  const pending=context.decodeAudioData(bytes.buffer,complete,fail);
  pending?.then?.(complete,fail);
 }catch{} // Unsupported or missing bytes leave the original six shots alone.
}
function releaseBurstEcho(voice,stop){
 if(!voice)return;
 if(burstEchoVoice===voice)burstEchoVoice=null;
 voice.source.onended=null;
 if(stop){try{voice.source.stop();}catch{}}
 for(const node of [voice.source,voice.level]){try{node.disconnect();}catch{}}
}
function stopBurstEcho(){releaseBurstEcho(burstEchoVoice,true);}
function playBallisticBurstEcho(){
 const context=audio;
 if(!soundOn||!master||context?.state!=='running'||document.hidden||nativePreview)return;
 const buffer=burstEchoAsset?.context===context?burstEchoAsset.buffer:null;
 if(!buffer)return;
 stopBurstEcho(); // One optional layer, never competing for the shot voice budget.
 let source,level,voice;
 try{
  const t=context.currentTime+.10,length=Math.min(1.01,buffer.duration);
  source=context.createBufferSource();source.buffer=buffer;source.loop=false;
  level=context.createGain();
  level.gain.setValueAtTime(0,t);
  level.gain.linearRampToValueAtTime(.32,t+Math.min(.055,length*.2));
  level.gain.setValueAtTime(.32,t+length*.63);
  level.gain.linearRampToValueAtTime(0,t+length);
  source.connect(level);level.connect(master);
  voice=burstEchoVoice={source,level};
  source.onended=()=>releaseBurstEcho(voice,false);
  source.start(t);source.stop(t+length);
 }catch{
  if(voice)releaseBurstEcho(voice,true);
  else for(const node of [source,level]){try{node?.disconnect();}catch{}}
 }
}
function battleAudioOpen(){
 return soundOn&&master&&audio?.state==='running'&&!audioParked&&!document.hidden&&!routeParked&&!hangarDialog?.open&&!nativePreview&&
  (state==='play'||state==='watch'&&watchSound);
}
function canPlayArenaMusic(){return battleAudioOpen()&&(state!=='watch'||!duelResult);}
function prepareArenaMusic(context){
 if(arenaMusicAsset?.context===context||typeof window.fetch!=='function'||typeof context.decodeAudioData!=='function')return;
 const token=arenaMusicAsset={context,buffer:null};
 const current=()=>arenaMusicAsset===token&&audio===context;
 try{
  window.fetch('./arena-background-1.mp3?v=1').then(response=>{
   if(current()&&response.ok)return response.arrayBuffer();
  }).then(bytes=>{
   if(!current()||!bytes?.byteLength||bytes.byteLength>120000)return;
   let settled=false;
   const complete=buffer=>{
    if(settled)return;settled=true;
    if(!current()||!Number.isFinite(buffer?.duration))return;
    // Circular audio padding protects the seam from edge artifacts. Some
    // decoders also expose MP3 priming instead of removing it via metadata.
    const padded=arenaLoopLength+2*arenaLoopPad;
    const gapless=Math.abs(buffer.duration-padded)<.008;
    if(!gapless&&Math.abs(buffer.duration-10.8)>=.008)return;
    token.start=arenaLoopPad+(gapless?0:1105/24000);token.buffer=buffer;
    syncArenaMusic();
   };
   const fail=()=>{settled=true;};
   const pending=context.decodeAudioData(bytes,complete,fail);
   pending?.then?.(complete,fail);
  }).catch(()=>{});
 }catch{} // Ambient music is optional; flight, weapons and device audio still work.
}
function prepareThrusterSample(context){
 if(thrusterAsset?.context===context||typeof window.fetch!=='function'||typeof context.decodeAudioData!=='function')return;
 const token=thrusterAsset={context,buffer:null};
 const current=()=>thrusterAsset===token&&audio===context;
 try{
  window.fetch('./stock-thruster-loop.mp3').then(response=>{
   if(current()&&response.ok)return response.arrayBuffer();
  }).then(bytes=>{
   if(!current()||!bytes?.byteLength||bytes.byteLength>120000)return;
   let settled=false;
   const complete=buffer=>{
    if(settled)return;settled=true;
    if(!current()||!Number.isFinite(buffer?.duration))return;
    const gapless=Math.abs(buffer.duration-thrusterLoopLength)<.004;
    if(!gapless&&Math.abs(buffer.duration-4.14)>=.004)return;
    token.start=gapless?0:thrusterPriming;token.buffer=buffer;
   };
   const fail=()=>{settled=true;};
   const pending=context.decodeAudioData(bytes,complete,fail);
   pending?.then?.(complete,fail);
  }).catch(()=>{});
 }catch{} // Cold, unsupported or unavailable recording keeps the original engine tone.
}
function stopArenaMusic(){
 const voice=arenaMusic;arenaMusic=null;
 if(!voice)return;
 try{voice.source.stop();}catch{}
 for(const node of [voice.source,voice.level]){try{node.disconnect();}catch{}}
}
function syncArenaMusic(){
 if(!canPlayArenaMusic()){stopArenaMusic();return;}
 if(arenaMusic)return;
 const context=audio;
 prepareArenaMusic(context);
 const token=arenaMusicAsset;
 if(token?.context!==context||!token.buffer)return;
 let source,level;
 try{
  const t=context.currentTime;
  source=context.createBufferSource();source.buffer=token.buffer;source.loop=true;
  source.loopStart=token.start;source.loopEnd=token.start+arenaLoopLength;
  level=context.createGain();level.gain.setValueAtTime(0,t);level.gain.linearRampToValueAtTime(arenaMusicGain,t+.4);
  source.connect(level);level.connect(master);
  source.start(t,token.start);
  arenaMusic={source,level,from:0,attackStart:t,attackEnd:t+.4,to:arenaMusicGain,holdEnd:Infinity,releaseEnd:Infinity};
 }catch{
  for(const node of [source,level]){try{node?.disconnect();}catch{}}
 }
}
function duckArenaMusic(){
 const voice=arenaMusic;if(!voice||!canPlayArenaMusic())return;
 const t=audio.currentTime,{from,attackStart,attackEnd,to,holdEnd,releaseEnd}=voice;
 const level=t<attackEnd?from+(to-from)*clamp((t-attackStart)/(attackEnd-attackStart),0,1):
  t<holdEnd?to:t<releaseEnd?to+(arenaMusicGain-to)*(t-holdEnd)/(releaseEnd-holdEnd):arenaMusicGain;
 const gain=voice.level.gain,end=t+.025,held=t+.16,recovered=t+.43,target=Math.min(level,arenaMusicDuck);
 try{
  gain.cancelScheduledValues(t);gain.setValueAtTime(level,t);gain.linearRampToValueAtTime(target,end);
  gain.setValueAtTime(target,held);gain.linearRampToValueAtTime(arenaMusicGain,recovered);
  Object.assign(voice,{from:level,attackStart:t,attackEnd:end,to:target,holdEnd:held,releaseEnd:recovered});
 }catch{}
}
// A mobile backend can stop output on background even when its JS context
// still reports "running". Retire the graph without starting a replacement.
function retireAudio(keepEnginePress=null){
 const old=audio,out=master;audio=null;master=null;openingAudio=null;refreshSoundActivation?.();
 blaster=null;ballistic=null;burstEchoAsset=null;arenaMusicAsset=null;thrusterAsset=null;noiseContext=null;noiseBuffer=null;stopBurstEcho();stopArenaMusic();
 if(enginePress!==keepEnginePress)cancelEngineTest();
 stopThruster(true);stopProjectileVoices();stopCanopyNodes();
 if(out){try{out.gain.value=0;out.disconnect();}catch{}}
 stopEffectVoices();stopWingRadioStatic();
 if(old?.state!=='closed'&&old?.close){try{Promise.resolve(old.close()).catch(()=>{});}catch{}}
}
function parkAudio(){
 resumeAfterHangar=false;
 audioParked=true;watchSound=false;syncWatchSound();stopNativePreview();releasePhoneAudio();cancelHangarPress();cancelCanopyAudio();retireAudio();
 if(!transferTransit&&!flightMode.scaleFly&&(state==='play'||state==='arrive'))pause();
}
function showAudioReady(){
 if(!audioParked||document.hidden)return;
 audioParked=false;
 if(soundOn)audioStatus(flightMode.scaleFly&&state==='play'?'Ready. Tap a flight control to enable sound.':'Ready. Tap Resume flight or a sound test.');
}
function unlockAudio(onReady,event,keepEnginePress=null){
 if(event?.isTrusted===false||document.hidden)return;
 // Touch activation is delivered on release, not on pointerdown on iOS.
 const touchDown=event?.type==='pointerdown'&&event.pointerType&&event.pointerType!=='mouse';
 if(touchDown&&!(keepEnginePress?.insideHangar&&window.navigator?.userActivation?.hasBeenActive))return;
 showAudioReady();
 if(!soundOn){audioStatus('Sound off. Turn Sound on to test.');return;}
 requestPhoneAudio(event);
 let attempt;
 try{
  const now=audioClock();
  if(audio?.state==='interrupted'&&now>=interruptedRetryAt&&!(openingAudio?.context===audio&&now<openingAudio.until)){
   interruptedRetryAt=now+420;retireAudio(keepEnginePress);
  }
  if(audio?.state==='closed')retireAudio(keepEnginePress);
  if(!audio){
   const AudioCtx=window.AudioContext||window.webkitAudioContext;
   if(!AudioCtx){audioStatus('No audio yet. Web Audio is unavailable here.');return;}
   audio=new AudioCtx();voices.clear();master=audio.createGain();master.gain.value=masterLevel;master.connect(audio.destination);
   const context=audio;context.addEventListener?.('statechange',()=>{
    if(audio!==context||!soundOn)return;
    if(context.state==='running'){
     if(!soundStatus?.textContent.includes('requested in browser.'))audioReady();
     syncArenaMusic();
    }else{stopThruster(true);stopProjectileVoices();stopBurstEcho();stopArenaMusic();audioPending();}
   });
  }
  const context=audio;
  if(context.state==='running'){prepareShotSamples(context);audioReady();syncArenaMusic();if(!document.hidden)onReady?.();return;}
  if(openingAudio?.context===context&&now<openingAudio.until&&!(openingAudio.hangarTouchDown&&!touchDown)){
   if(onReady){openingAudio.ready=onReady;openingAudio.testUntil=now+1100;}
   return;
  }
  // A previous resume() may never settle on iOS. Let a later real gesture
  // retry the same context without a timer that tries to start audio itself.
  attempt={context,until:now+420,ready:onReady,testUntil:onReady?now+1100:0,hangarTouchDown:!!touchDown};
  openingAudio=attempt;audioPending();
  const resumed=context.resume();prepareShotSamples(context);
  Promise.resolve(resumed).then(()=>{
   if(openingAudio!==attempt||audio!==context||!soundOn)return;
   if(context.state==='running'){audioReady();syncArenaMusic();if(!document.hidden&&audioClock()<=attempt.testUntil)attempt.ready?.();}
   else audioPending();
  },()=>{if(openingAudio===attempt&&soundOn)audioPending();}).finally(()=>{
   if(openingAudio===attempt)openingAudio=null;
  });
 }catch{if(openingAudio===attempt)openingAudio=null;audioPending();}
}
function stopDockVoice(){
 for(const clip of [dockVoice,dockReturnVoice]){
  if(!clip)continue;
  try{clip.pause();clip.currentTime=0;}catch{}
 }
}
// The dockmaster recognizes a pilot's repeat calls across launches and
// Hangar navigation, not just while one carrier object happens to exist.
const dockSpeechMemory=new Map(),dockSpeechKey='rift-runner.vale-clearance.v1.';
function chooseDockGreeting(ship){
 const generation=currentCharacterGeneration(),vessel=ship.vessel.id;
 const key=dockSpeechKey+JSON.stringify([generation??null,ship.testCarrier??vessel]);
 let prior=dockSpeechMemory.get(key)??0;
 try{
  const saved=window.sessionStorage?.getItem(key);
  if(saved!==null&&saved!==undefined&&/^[0-3]$/.test(saved))prior=Number(saved);
 }catch{}
 const available=!!dockReturnVoice?.getAttribute('src')&&soundOn;
 // Fresh contacts are always normal, and no two surprise calls are
 // back-to-back. Subsequent normal calls get progressively less unlucky.
 const surprise=available&&prior>0&&(prior>=3||Math.random()<1/3);
 // Zero in storage means the last call was the surprise. An absent key
 // means the pilot hasn't called before; both get the regular greeting.
 const next=surprise?0:Math.min(3,prior+1);
 if(available||prior===0){
  dockSpeechMemory.set(key,next);
  try{window.sessionStorage?.setItem(key,String(next));}catch{}
 }
 return surprise;
}
function speakDockClearance(event,returnGreeting){
 const clip=returnGreeting?dockReturnVoice:dockVoice;
 if(!clip?.src||event?.isTrusted!==true||!soundOn||document.hidden||routeParked)return;
 stopDockVoice();
 // Request playback within the actual Docking button gesture on iPhone.
 try{Promise.resolve(clip.play()).catch(()=>{});}catch{}
}
function setDockPortrait(surprised){
 if(dockPortrait)dockPortrait.hidden=surprised;
 if(dockSurprisedPortrait)dockSurprisedPortrait.hidden=!surprised;
}
function stopWingRadioStatic(stop=true){
 const tone=wingRadioStatic;wingRadioStatic=null;
 if(!tone)return;
 tone.source.onended=null;
 if(stop){try{tone.source.stop();}catch{}}
 for(const node of [tone.source,tone.band,tone.gain]){try{node.disconnect();}catch{}}
}
function playWingRadioStatic(){
 // Follow the same trusted-gesture audio path as flight sounds. Do not queue
 // a burst if the iPhone has not granted audio, is muted or is paused.
 if(!soundOn||!master||audio?.state!=='running'||nativePreview||document.hidden||routeParked||state!=='play')return;
 stopWingRadioStatic();
 const ctx=audio,t=ctx.currentTime,len=.085;
 let source,band,gain;
 try{
  const clip=ctx.createBuffer(1,Math.ceil(ctx.sampleRate*len),ctx.sampleRate);
  const samples=clip.getChannelData(0);
  let seed=4819;
  for(let i=0;i<samples.length;i++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;samples[i]=seed/2147483648-1;}
  source=ctx.createBufferSource();source.buffer=clip;
  band=ctx.createBiquadFilter();band.type='bandpass';band.frequency.setValueAtTime(1350,t);
  gain=ctx.createGain();gain.gain.setValueAtTime(0,t);gain.gain.linearRampToValueAtTime(.064,t+.012);gain.gain.linearRampToValueAtTime(0,t+len);
  source.connect(band);band.connect(gain);gain.connect(master);
  wingRadioStatic={source,band,gain};
  source.onended=()=>{if(wingRadioStatic?.source===source)stopWingRadioStatic(false);};
  source.start(t);source.stop(t+len);
 }catch{
  if(wingRadioStatic?.source===source)stopWingRadioStatic();
  else for(const node of [source,band,gain]){try{node?.disconnect();}catch{}}
 }
}
function armWingRadio(){
 if(!wingRadio||!wingRadioCaption)return;
 for(const image of wingRadioPortraits){if(image?.dataset.src&&!image.getAttribute('src'))image.setAttribute('src',image.dataset.src);}
 wingRadioRun={clock:0,index:-1,phase:''};
}
function endWingRadio(){
 wingRadioRun=null;
 if(wingRadio)wingRadio.hidden=true;
 stopWingRadioStatic();
}
function updateWingRadio(dt=0){
 const run=wingRadioRun;
 if(!run)return;
 if(state==='pause'||document.hidden||routeParked||hangarDialog?.open){
  wingRadio.hidden=true;stopWingRadioStatic();return;
 }
 if(state==='arrive')return;
 if(state!=='play'||!p?.hp||duelResult){endWingRadio();return;}
 run.clock+=dt;
 if(run.clock>=wingRadioCues.at(-1).end){endWingRadio();return;}
 const index=wingRadioCues.findIndex(cue=>run.clock>=cue.start&&run.clock<cue.end);
 if(index===-1){wingRadio.hidden=true;return;}
 const cue=wingRadioCues[index],phase=run.clock>=cue.fade?'fade':'receive';
 if(run.index!==index){
  run.index=index;run.phase=phase;
  wingRadio.dataset.speaker=cue.speaker;wingRadio.dataset.phase=phase;wingRadio.hidden=false;
  for(const [i,image] of wingRadioPortraits.entries()){if(image)image.hidden=i!==index;}
  wingRadioCaption.textContent=cue.text;playWingRadioStatic();
 }else if(run.phase!==phase){
  run.phase=phase;
  if(!wingRadio.hidden){wingRadio.dataset.phase=phase;playWingRadioStatic();}
 }else if(wingRadio.hidden&&phase!=='fade'){
  // Resume the current card in place. Its opening static/animation has already run.
  wingRadio.dataset.phase='hold';wingRadio.hidden=false;
 }
}

function setGameSound(enabled,event){
 soundOn=enabled;refreshSoundActivation?.();
 if(soundSwitch)soundSwitch.checked=enabled;
 try{if(!loanerSnapshot)localStorage.setItem(soundKey,soundOn?'on':'off');}catch{}
 if(master){try{master.gain.value=soundOn?masterLevel:0;}catch{}}
 if(soundOn)unlockAudio(undefined,event);else{openingAudio=null;stopDockVoice();stopWingRadioStatic();stopNativePreview();releasePhoneAudio();cancelEngineTest();cancelCanopyAudio();stopThruster(true);stopProjectileVoices();stopBurstEcho();stopArenaMusic();audioStatus('Sound off.');}
 refreshHangarEngineAudio();
}
soundSwitch?.addEventListener('change',event=>setGameSound(soundSwitch.checked,event));
soundTest?.addEventListener('click',event=>{
 if(!mountedGun())return;
 const version=shotSoundVersion;
 unlockAudio(()=>{
  if(version!==shotSoundVersion)return;
  const kind=sound('shot');
  if(kind)audioStatus(kind==='recorded'?(mountedGun().label+' requested in browser.'):'Selected clip unavailable or loading. Built-in shot requested in browser.');
 },event);
});
function tone(type,from,to,duration,volume,delay=0){
 if(!soundOn||!master||audio?.state!=='running'||voices.size>=11||document.hidden)return;
 let note,level;
 try{
  const t=audio.currentTime+delay;
  note=audio.createOscillator();level=audio.createGain();note.type=type;
  note.frequency.setValueAtTime(from,t);note.frequency.exponentialRampToValueAtTime(to,t+duration);
  level.gain.setValueAtTime(.001,t);level.gain.linearRampToValueAtTime(volume,t+.007);level.gain.exponentialRampToValueAtTime(.001,t+duration);
  note.connect(level);level.connect(master);voices.add(note);
  note.onended=()=>{voices.delete(note);try{note.disconnect();level.disconnect();}catch{}};
  note.start(t);note.stop(t+duration+.012);
 }catch{if(note)voices.delete(note);try{note?.disconnect();level?.disconnect();}catch{}}
}
function cannonCrack(gain=1,metal=false){
 if(!soundOn||!master||audio?.state!=='running'||voices.size>=11||document.hidden)return;
 let hit,filter,env;
 try{
  if(noiseContext!==audio){
   const size=Math.ceil(audio.sampleRate*.065),buf=audio.createBuffer(1,size,audio.sampleRate),samples=buf.getChannelData(0);
   let seed=9137,tail=0;
   for(let i=0;i<size;i++){seed=(seed*1664525+1013904223)>>>0;const white=(seed/2147483648)-1;tail=.38*tail+.62*white;samples[i]=.8*tail;}
   noiseContext=audio;noiseBuffer=buf;
  }
  const t=audio.currentTime;
  hit=audio.createBufferSource();hit.buffer=noiseBuffer;
  filter=audio.createBiquadFilter();filter.type=metal?'bandpass':'lowpass';
  filter.frequency.setValueAtTime(metal?3400:1600,t);filter.frequency.exponentialRampToValueAtTime(metal?1380:280,t+.052);
  env=audio.createGain();env.gain.setValueAtTime((metal?.12:.19)*gain,t);env.gain.exponentialRampToValueAtTime(.001,t+.065);
  hit.connect(filter);filter.connect(env);env.connect(master);voices.add(hit);
  hit.onended=()=>{voices.delete(hit);try{hit.disconnect();filter.disconnect();env.disconnect();}catch{}};
  hit.start(t);hit.stop(t+.067);
 }catch{if(hit)voices.delete(hit);try{hit?.disconnect();filter?.disconnect();env?.disconnect();}catch{}}
}
function playShotSample(name=fighterLoadout.weapon,gain=1,echo=false){
 const token=shotToken(name);
 const buffer=token?.context===audio?token.buffer:null;
 if(!buffer)return false;
 let source,level;
 try{
  source=audio.createBufferSource();source.buffer=buffer;source.loop=false;
  level=audio.createGain();level.gain.value=.43*gain;source.connect(level);level.connect(master);voices.add(source);
  source.onended=()=>{voices.delete(source);try{source.disconnect();level.disconnect();}catch{}};
  const at=audio.currentTime+(echo?.10:0);
  if(echo){
   level.gain.setValueAtTime(.43*gain,at);
   level.gain.exponentialRampToValueAtTime(.001,at+.22);
  }
  source.start(at);
  if(echo)source.stop(at+.23);
  return true;
 }catch{if(source)voices.delete(source);try{source?.disconnect();level?.disconnect();}catch{}return false;}
}
function syncWatchSound(){
 if(!crossWatchSound)return;
 const ready=watchSound&&audio?.state==='running';
 crossWatchSound.setAttribute('aria-pressed',String(!!ready));
 crossWatchSound.textContent=watchSound?'Mute':'Sound';
 crossWatchSound.disabled=!soundOn;
 crossWatchSound.title=soundOn?'Toggle sound for this preview':'Sound is off in game settings';
}
crossWatchSound?.addEventListener('click',event=>{
 if(event.isTrusted!==true||state!=='watch'||document.hidden||routeParked||!soundOn)return;
 if(watchSound){
  watchSound=false;stopArenaMusic();stopThruster(true);stopEffectVoices();syncWatchSound();return;
 }
 watchSound=true;syncWatchSound();
 unlockAudio(syncWatchSound,event);
});
function nearBattleGain(x,y){
 if(!battleAudioOpen()||!p)return 0;
 return Math.max(0,1-Math.hypot(x-p.x,y-p.y)/(state==='watch'?760:560));
}
function npcBattleShot(x,y,pirate){
 const gain=nearBattleGain(x,y);
 if(gain<.035)return;
 if(pirate){
  tone('triangle',510,155,.11,.18*gain);tone('sawtooth',230,76,.075,.072*gain);
 }else laserShotTone(.52*gain);
}
function laserShotTone(gain=1){
 tone('sine',940,340,.112,.25*gain);tone('triangle',620,225,.085,.115*gain,.013);
}
function sound(kind){
 if(nativePreview)return null;
 if(kind==='shot'){
  if(!soundOn||!master||audio?.state!=='running'||voices.size>=11||document.hidden)return null;
  if(playShotSample())return 'recorded';
  if(mountedGun().kind==='ballistic'){tone('triangle',177,55,.105,.31);cannonCrack();}
  else{
   // A pitched electronic sweep, distinct from Ballistic's physical crack.
   laserShotTone();
  }
  return 'built-in';
 }
 if(kind==='vandul-shot'){
  laserShotTone(.49);
  tone('sawtooth',385,1030,.092,.074,.02);
 }
 if(kind==='hit')tone('triangle',410,115,.083,.18);
 if(kind==='blast'){tone('sawtooth',145,43,.19,.20);tone('triangle',82,33,.22,.20,.017);}
 if(kind==='damage'){tone('square',218,66,.14,.17);tone('triangle',290,110,.17,.18,.025);}
}
// A voice belongs to one real projectile, never to the current weapon UI.
// Start only at launch against the already-running graph: no deferred replay
// after a late browser unlock, mute, pause, or return from the background.
const projectileVoices=new Map(),projectileVoiceCap=4;
function closeProjectileVoice(voice,halt){
 try{voice.osc.onended=null;}catch{}
 if(halt){try{voice.osc.stop();}catch{}}
 try{voice.osc.disconnect();}catch{}
 try{voice.level.disconnect();}catch{}
}
function stopProjectileVoice(projectile){
 const voice=projectileVoices.get(projectile);if(!voice)return;
 projectileVoices.delete(projectile);closeProjectileVoice(voice,true);
}
function stopProjectileVoices(){
 for(const projectile of projectileVoices.keys())stopProjectileVoice(projectile);
}
function releaseProjectileVoice(projectile){
 const voice=projectileVoices.get(projectile);
 if(!voice||voice.releasing)return;
 const now=voice.context.currentTime,end=Math.min(now+.014,voice.endAt);
 if(voice.context.state!=='running'||now<voice.startAt||end<=now+.001){stopProjectileVoice(projectile);return;}
 try{
  holdParam(voice.level.gain,now);voice.level.gain.linearRampToValueAtTime(0,end);
  voice.releasing=true;voice.osc.stop(end);
 }catch{stopProjectileVoice(projectile);}
}
function startProjectileVoice(projectile){
 if(!soundOn||!master||audio?.state!=='running'||document.hidden||nativePreview)return;
 const heavy=guns[projectile.weapon]?.kind==='ballistic';
 const context=audio,t=context.currentTime+.022,duration=heavy?.58:1.42;
 let osc,level;
 try{
  osc=context.createOscillator();level=context.createGain();
  osc.type=heavy?'sine':'triangle';
  osc.frequency.setValueAtTime(heavy?720:274,t);
  osc.frequency.exponentialRampToValueAtTime(heavy?260:188,t+(heavy?.20:.72));
  level.gain.setValueAtTime(.001,t);
  level.gain.linearRampToValueAtTime(heavy?.078:.070,t+(heavy?.016:.042));
  level.gain.exponentialRampToValueAtTime(heavy?.012:.035,t+(heavy?.24:.70));
  level.gain.exponentialRampToValueAtTime(.001,t+duration);
  osc.connect(level);level.connect(master);
  if(projectileVoices.size>=projectileVoiceCap)stopProjectileVoice(projectileVoices.keys().next().value);
  const voice={context,osc,level,startAt:t,endAt:t+duration,releasing:false};
  projectileVoices.set(projectile,voice);
  osc.onended=()=>{
   if(projectileVoices.get(projectile)!==voice)return;
   projectileVoices.delete(projectile);closeProjectileVoice(voice,false);
  };
  osc.start(t);osc.stop(t+duration);
 }catch{
  if(projectileVoices.has(projectile))stopProjectileVoice(projectile);
  else if(osc&&level)closeProjectileVoice({osc,level},true);
  else{try{osc?.disconnect();}catch{}try{level?.disconnect();}catch{}}
 }
}
// A single original Web Audio engine voice, separate from the combat voice
// limit. The game requests it for input held, never for residual velocity.
let thruster=null,enginePress=null,hangarFormationEngine=null;
function cancelEngineTest(){
 const press=enginePress;enginePress=null;
 releaseEngineCapture(press);
 if(press?.insideHangar)clearHangarEngineVisual();
}
function holdParam(param,now){
 if(typeof param.cancelAndHoldAtTime==='function'){try{param.cancelAndHoldAtTime(now);return;}catch{}}
 const value=param.value;param.cancelScheduledValues(now);param.setValueAtTime(value,now);
}
// Boost only the engine bus; leave the master and all other sounds alone.
const thrusterVolume=3;
const thrusterTarget=(level,recorded)=>thrusterVolume*(recorded?Math.min(.38,(level??.122)*1.8):level??.122);
function disposeThruster(){
 const voice=thruster;if(!voice)return;thruster=null;
 for(const source of [voice.hum,voice.grit,voice.source]){if(source){try{source.stop();}catch{}try{source.disconnect();}catch{}}}
 for(const node of [voice.filter,voice.blend,voice.out]){try{node?.disconnect();}catch{}}
}
function stopThruster(hard=false){
 const voice=thruster;if(!voice)return;
 if(hard||voice.context.state!=='running'){disposeThruster();return;}
 if(!voice.driving)return;
 try{
  const t=voice.context.currentTime;holdParam(voice.out.gain,t);voice.out.gain.setTargetAtTime(0,t,.044);
  voice.driving=false;voice.releaseAt=audioClock()+230;
 }catch{disposeThruster();}
}
function startRecordedThruster(level){
 const context=audio,asset=thrusterAsset;
 if(fittedEngine()?.audioProfile!=='stock-loop'||asset?.context!==context||!asset.buffer)return false;
 let source,out;
 try{
  const t=context.currentTime;
  source=context.createBufferSource();source.buffer=asset.buffer;
  source.loop=true;source.loopStart=asset.start;source.loopEnd=Math.min(asset.start+thrusterLoopLength,asset.buffer.duration);
  out=context.createGain();
  out.gain.setValueAtTime(0,t);out.gain.linearRampToValueAtTime(thrusterTarget(level,true),t+.16);
  source.connect(out);out.connect(master);source.start(t,source.loopStart);
  thruster={context,source,out,level,recorded:true,driving:true,releaseAt:0};
  return true;
 }catch{
  try{source?.stop();}catch{}
  for(const node of [source,out]){try{node?.disconnect();}catch{}}
  return false;
 }
}
function startThruster(level=null){
 if(thruster&&thruster.context!==audio)disposeThruster();
 if(thruster?.driving){
  if(thruster.level!==level){
   const voice=thruster,t=voice.context.currentTime;
   try{holdParam(voice.out.gain,t);voice.out.gain.setTargetAtTime(thrusterTarget(level,voice.recorded),t,.055);voice.level=level;}catch{disposeThruster();}
  }
  if(thruster?.driving)return;
 }
 if(thruster){
  // Quick re-engagement rejoins sustain rather than retriggering ignition.
  const voice=thruster,t=voice.context.currentTime;
  try{holdParam(voice.out.gain,t);voice.out.gain.setTargetAtTime(thrusterTarget(level,voice.recorded),t,.045);voice.level=level;voice.driving=true;return;}catch{disposeThruster();}
 }
 if(startRecordedThruster(level))return;
 let hum,grit,blend,filter,out;
 try{
  const context=audio,t=context.currentTime;
  hum=context.createOscillator();grit=context.createOscillator();blend=context.createGain();filter=context.createBiquadFilter();out=context.createGain();
  hum.type='triangle';grit.type='sawtooth';blend.gain.value=.24;filter.type='lowpass';
  hum.frequency.setValueAtTime(86,t);hum.frequency.linearRampToValueAtTime(124,t+.18);hum.frequency.setTargetAtTime(109,t+.18,.12);
  grit.frequency.setValueAtTime(42,t);grit.frequency.linearRampToValueAtTime(59,t+.17);grit.frequency.setTargetAtTime(52,t+.17,.13);
  filter.frequency.setValueAtTime(160,t);filter.frequency.linearRampToValueAtTime(340,t+.18);filter.frequency.setTargetAtTime(280,t+.18,.14);
  out.gain.setValueAtTime(0,t);out.gain.linearRampToValueAtTime(thrusterVolume*(level===null?.154:Math.min(.22,level*1.18)),t+.17);out.gain.setTargetAtTime(thrusterTarget(level,false),t+.17,.13);
  hum.connect(filter);grit.connect(blend);blend.connect(filter);filter.connect(out);out.connect(master);
  hum.start(t);grit.start(t);
  thruster={context,hum,grit,blend,filter,out,level,driving:true,releaseAt:0};
 }catch{
  for(const osc of [hum,grit]){try{osc?.stop();}catch{}try{osc?.disconnect();}catch{}}
  for(const node of [blend,filter,out]){try{node?.disconnect();}catch{}}
 }
}
function updateThruster(){
 if(nativePreview){stopThruster(true);return;}
 if(!soundOn||document.hidden||audio?.state!=='running'||!master){stopThruster(true);return;}
 const input=movePtr??moveKey;
 const flight=state==='play'&&(surgeActive()||thrustPtr||has('KeyE')||(input?(input.thrust||input.x!==0||input.y!==0):has('KeyA')!==has('KeyD')||has('KeyW')!==has('KeyS')));
 if(flight){startThruster();return;}
 if(enginePress?.sound){startThruster(enginePress.insideHangar?hangarGain(hangarPower(enginePress)):null);return;}
 if(hangarFormationEngine?.ready&&hangarDialog?.open){
  const age=audioClock()-hangarFormationEngine.at;
  startThruster(age<320?.06:age<1510?.145:age<2850?.105:.08);return;
 }
 if((state==='watch'||isTileBattle())&&!duelResult&&battleAudioOpen()){
  let level=0;
  for(const ship of pirateCapitals)if(ship.hp>0)level=Math.max(level,nearBattleGain(ship.x,ship.y)*(.024+.046*(ship.driveBurn??0)));
  for(const ally of livingAllies())level=Math.max(level,nearBattleGain(ally.x,ally.y)*Math.min(.056,Math.hypot(ally.vx,ally.vy)*.00046));
  if(level>.003){startThruster(Math.round(level*200)/200);return;}
 }
 stopThruster();
 if(thruster&&!thruster.driving&&audioClock()>=thruster.releaseAt)disposeThruster();
}
const ENGINE_HOLD_MS=240,ENGINE_RELEASE_MS=210,ENGINE_RAMP_MS=2450;
let hangarEngineUntil=0,hangarEnginePhase='b';
const engineClickFence=new WeakMap();
function hangarPower(press,now=audioClock()){
 const progress=Math.max(0,Math.min(1,(now-press.at)/ENGINE_RAMP_MS));
 return .2+.8*progress;
}
function hangarGain(power){return Math.round((.05+.15*power)*100)/100;}
function setHangarPower(power){
 if(!canopyRig)return;
 canopyRig.style.setProperty('--engine-power',power.toFixed(3));
 canopyRig.style.setProperty('--engine-flame-scale',(.3+.88*power).toFixed(3));
 canopyRig.style.setProperty('--engine-flame-opacity',(.35+.63*power).toFixed(3));
 const shake=(.3+1.7*power).toFixed(3)+'px';
 canopyRig.style.setProperty('--engine-shake-strength',shake);
 canopyRig.closest?.('.hangar-hero')?.style.setProperty('--engine-shake-strength',shake);
}
function canShakeHangar(){return !motion?.matches&&(shakeSwitch?.checked??true);}
function clearHangarEngineVisual(){
 hangarEngineUntil=0;
 if(canopyRig){canopyRig.dataset.engineTest='idle';canopyRig.dataset.enginePulse='off';canopyRig.dataset.engineShake='off';}
}
function startHangarEngineVisual(){
 if(!canopyRig)return;
 hangarEngineUntil=Infinity;setHangarPower(.2);
 hangarEnginePhase=hangarEnginePhase==='a'?'b':'a';
 canopyRig.dataset.engineTest='active';
 canopyRig.dataset.enginePulse=hangarEnginePhase;
 canopyRig.dataset.engineShake=canShakeHangar()?hangarEnginePhase:'off';
}
function updateHangarEngineVisual(){
 if(!hangarEngineUntil||!canopyRig)return;
 if(document.hidden||!hangarDialog?.open){cancelHangarPress();return;}
 const now=audioClock();
 const press=enginePress?.insideHangar?enginePress:null;
 if(press&&now-press.at>=ENGINE_HOLD_MS){
  setHangarPower(hangarPower(press,now));
  canopyRig.dataset.engineTest='held';canopyRig.dataset.enginePulse='off';
 }else if(!press&&now>=hangarEngineUntil){clearHangarEngineVisual();return;}
 if(!canShakeHangar()&&canopyRig?.dataset.engineShake!=='off')canopyRig.dataset.engineShake='off';
}
function beginEnginePress(event,button,insideHangar,kind,id){
 if(insideHangar&&aboardGuestHangar()||event.isTrusted!==true||document.hidden||nativePreview||enginePress||insideHangar!==!!hangarDialog?.open||insideHangar&&fighterHullCondition()!=='repaired'||!fittedEngine())return false;
 const press={kind,id,button,insideHangar,at:audioClock(),touch:event.pointerType==='touch',sound:false};
 enginePress=press;
 if(insideHangar)startHangarEngineVisual();
 const ready=()=>{
  if(enginePress!==press||insideHangar!==!!hangarDialog?.open||document.hidden||!soundOn||nativePreview)return;
  press.sound=true;updateThruster();
  if(thruster?.driving)audioStatus('Engine test requested in browser.');
 };
 // An untouched iPhone document cannot play from touch-down. A previous
 // trusted activation may already allow this hold to use Web Audio.
 if(audio?.state==='running'&&master&&soundOn)ready();
 else if(kind==='key'||event.pointerType==='mouse'||!event.pointerType||
  insideHangar&&window.navigator?.userActivation?.hasBeenActive)unlockAudio(ready,event,press);
 else if(soundOn)audioStatus('Release to enable sound, then hold Test engine again.');
 return true;
}
function releaseEngineCapture(press){
 if(press?.kind==='pointer')try{press.button.releasePointerCapture(press.id);}catch{}
}
function cancelHangarPress(){
 if(enginePress?.insideHangar)cancelEngineTest();
 clearHangarEngineVisual();updateThruster();
}
function endEnginePress(event,kind,id){
 const press=enginePress;
 if(!press||press.kind!==kind||press.id!==id||event.isTrusted!==true)return;
 enginePress=null;releaseEngineCapture(press);
 if(kind==='pointer')engineClickFence.set(press.button,audioClock()+800);
 if(press.insideHangar&&hangarDialog?.open&&!document.hidden&&canopyRig){
  canopyRig.dataset.engineTest='releasing';canopyRig.dataset.enginePulse='off';
  hangarEngineUntil=audioClock()+ENGINE_RELEASE_MS;
 }
 updateThruster();
 if(!press.sound&&kind==='pointer'&&event.pointerType!=='mouse'&&soundOn&&!document.hidden&&!nativePreview){
  unlockAudio(()=>{
   if(!enginePress&&press.insideHangar===!!hangarDialog?.open&&!document.hidden&&!nativePreview)audioStatus('Sound ready. Hold Test engine again.');
  },event);
 }
}
function cancelEnginePointer(event){
 if(enginePress?.kind!=='pointer'||enginePress.id!==event.pointerId)return;
 engineClickFence.set(enginePress.button,audioClock()+800);cancelEngineTest();updateThruster();
}
for(const [button,insideHangar] of [[engineTest,false],[hangarEngineTest,true]])if(button){
 button.addEventListener('contextmenu',event=>event.preventDefault());
 button.addEventListener('pointerdown',event=>{
  if(event.button!==0||event.isPrimary===false)return;
  if(beginEnginePress(event,button,insideHangar,'pointer',event.pointerId)){
   event.preventDefault?.();
   engineClickFence.set(button,audioClock()+800);
   try{button.setPointerCapture(event.pointerId);}catch{}
  }
 });
 button.addEventListener('lostpointercapture',cancelEnginePointer);
 button.addEventListener('keydown',event=>{
  if(!['Space','Enter','NumpadEnter'].includes(event.code)||event.altKey||event.ctrlKey||event.metaKey)return;
  event.preventDefault();
  if(!event.repeat)beginEnginePress(event,button,insideHangar,'key',event.code);
 });
 button.addEventListener('blur',()=>{
  if(enginePress?.button===button){cancelEngineTest();updateThruster();}
 });
 button.addEventListener('click',event=>{
  if(insideHangar&&aboardGuestHangar()||event?.isTrusted!==true||document.hidden||nativePreview||insideHangar!==!!hangarDialog?.open||enginePress)return;
  if(event.detail>0&&audioClock()<(engineClickFence.get(button)??0)&&(!insideHangar||audio?.state==='running'))return;
  // Click-only activation has no held interval and can't trigger a late pulse.
  unlockAudio(()=>{if(!enginePress&&insideHangar===!!hangarDialog?.open)audioStatus('Sound ready. Hold Test engine to play it.');},event);
 });
}
window.addEventListener('pointerup',event=>endEnginePress(event,'pointer',event.pointerId),true);
window.addEventListener('pointercancel',cancelEnginePointer,true);
for(const type of ['touchend','touchcancel'])window.addEventListener(type,event=>{
 const press=enginePress;
 if(!press?.insideHangar||!press.touch||!event.isTrusted)return;
 const same=touch=>touch.target===press.button||press.button.contains?.(touch.target);
 if(!Array.from(event.changedTouches??[]).some(same)||Array.from(event.touches??[]).some(same))return;
 if(type==='touchend')endEnginePress(event,'pointer',press.id);
 else cancelEnginePointer({pointerId:press.id});
},{capture:true,passive:true});
// A new preference defaults to direct aiming even for legacy Auto Aim users.
const aimAssistKey='rift-runner.aim-assist.v2';
function preferredAimAssist(){try{return localStorage.getItem(aimAssistKey)==='on';}catch{return false;}}
let aimAssist=preferredAimAssist(),aimManuallyPlaced=false,touchFlight=false,autoLock=null;
const headingTurns=new WeakMap(),turnRate=400*degrees,stickInstantArc=6*degrees,oppositeArc=8*degrees,npcShotArc=2*degrees;
const headingDelta=(from,to)=>Math.atan2(Math.sin(to-from),Math.cos(to-from));
const bearing=(from,to)=>Math.atan2(to.y-from.y,to.x-from.x);
function snapHeading(ship,angle){headingTurns.delete(ship);ship.aim=angle;}
function queueHeading(ship,angle,immediate=0){
 const delta=headingDelta(ship.aim,angle);
 if(Math.abs(delta)<=immediate+1e-9){snapHeading(ship,angle);return;}
 const previous=headingTurns.get(ship);
 let side=0,opposite=angle;
 if(previous?.side&&Math.abs(headingDelta(previous.opposite,angle))<=2*oppositeArc){
  side=previous.side;opposite=previous.opposite;
 }else if(Math.abs(delta)>=Math.PI-oppositeArc){
  const lateral=-Math.sin(ship.aim)*(ship.vx??0)+Math.cos(ship.aim)*(ship.vy??0);
  side=lateral<-4?-1:1;
 }
 if(previous){previous.angle=angle;previous.side=side;previous.opposite=opposite;}
 else headingTurns.set(ship,{angle,side,opposite});
}
function advanceHeading(ship,dt){
 const target=headingTurns.get(ship);
 if(!target)return;
 let delta=headingDelta(ship.aim,target.angle);
 // An analog reversal can jitter across the antipode. Keep the committed
 // side during the long sweep, but allow small corrections near the target.
 if(target.side&&Math.abs(delta)>Math.PI/2&&Math.sign(delta)!==target.side)delta+=target.side*TAU;
 const step=turnRate*dt*(ship.turnMultiplier??1);
 if(Math.abs(delta)<=step+1e-9)snapHeading(ship,target.angle);
 else ship.aim+=Math.sign(delta)*step;
}
const noseReady=(ship,heading)=>Math.abs(headingDelta(ship.aim,heading))<=npcShotArc;
const gimbalArc=28*degrees;
const hasGimbal=ship=>['bastion-9','stocky-light-fighter'].includes(ship?.fighter??ship?.fit?.hull);
const gimbalBearing=(ship,target=ship.gimbalTarget)=>{
 return hasGimbal(ship)&&Number.isFinite(target)?ship.aim+clamp(headingDelta(ship.aim,target),-gimbalArc,gimbalArc):ship.aim;
};
function commandPilotAim(angle,stick=false,point=null){
 if(onlineBattle){onlineAim=angle;return;}
 if(!hasGimbal(p)){if(stick)queueHeading(p,angle,stickInstantArc);else snapAim(angle);return;}
 p.gimbalTarget=angle;p.gimbalPoint=point;
 if(point)angle=podBearingToPoint(p,point)??angle;
 const delta=headingDelta(p.aim,angle);
 // Let the mounted gun absorb small corrections. Only aim beyond its
 // travel asks the hull to turn, and then only far enough to reach the arc.
 if(Math.abs(delta)>gimbalArc)queueHeading(p,angle-Math.sign(delta)*gimbalArc);
 else headingTurns.delete(p);
}
function snapAim(angle){snapHeading(p,angle);}
if(aimSwitch)aimSwitch.checked=aimAssist;
aimSwitch?.addEventListener('change',()=>{
 aimAssist=!!aimSwitch.checked;aimManuallyPlaced=false;autoLock=null;
 try{if(!loanerSnapshot)localStorage.setItem(aimAssistKey,aimAssist?'on':'off');}catch{}
});
function inputSource(isTouch){if(touchFlight!==isTouch){touchFlight=isTouch;autoLock=null;}}
function usingAimAssist(){return aimAssist&&touchFlight&&!aimManuallyPlaced&&!aimPtr;}
function autoTarget(){
 if(!usingAimAssist()){autoLock=null;return null;}
 const camera=flightCamera(),visible=c=>c.x>=camera.x&&c.y>=camera.y&&c.x<=camera.x+camera.w&&c.y<=camera.y+camera.h;
 const distance=c=>(c.x-p.x)**2+(c.y-p.y)**2;
 let nearest=null,best=Infinity;
 for(const c of rangeTargets.length?[...cones,...rangeTargets]:cones){if(c.rangeTarget&&c.cleared||!visible(c))continue;const gap=distance(c);if(gap<best){nearest=c;best=gap;}}
 let blockers;
 const rivals=[...activeVanduls(),...pirateCapitals.filter(ship=>ship.hp>0),...(fighterBattle?.red??[]).filter(ship=>ship.hp>0)].filter(ship=>visible(ship)&&playerCanSee(ship,blockers??=visionBlockers()));
 for(const rival of rivals){const gap=distance(rival);if(gap<best){nearest=rival;best=gap;}}
 if(nearest&&autoLock&&visible(autoLock)&&(rivals.includes(autoLock)||cones.includes(autoLock)||rangeTargets.includes(autoLock)&&!autoLock.cleared)&&distance(autoLock)<=best*1.30)return autoLock;
 autoLock=nearest;return nearest;
}
function aimForTouchAssist(){
 const target=autoTarget();
 if(target){
  const angle=Math.atan2(target.y-p.y,target.x-p.x);
  if(!hasGimbal(p))snapAim(angle);
  // The existing opt-in assist can use the new mount, never steer the hull.
  else{p.gimbalPoint=null;p.gimbalTarget=Math.abs(headingDelta(p.aim,angle))<=gimbalArc?angle:undefined;}
 }
 return target;
}
const stars=Array.from({length:150},(_,i)=>({x:(i*107+i*i*11)%W,y:(i*173+i*i*7)%H,r:i%17===0?1.65:i%3===0?1.04:.44,d:18+(i%13)*7,h:i%5===0?'#67c3d6':i%7===0?'#b853c2':'#b4d1ed'}));
// Capital test is carrier operations only, not an enemy fight or an escort.
const capitalCourse={north:960,x:475,y:175,halfRun:390,radius:150,speed:38,width:292,height:438};
const capitalSections=[[0,-.36,25],[0,-.23,42],[0,-.03,60],[0,.16,76],[0,.29,84]];
// Additional bolt-only cover follows the painted bow, aft deck and shoulders.
const pegasusShotCover=[[0,-.407,22],[0,.369,46],[-.21,.225,29],[.21,.225,29]];
const bifrostShotCover=[[0,-.418,10],[-.354,.201,25],[.354,.201,25],[-.34,.294,23],[.34,.294,23]];
const carrierMaxHp=360,carrierHullOwner=new WeakMap();
const dockableMulticrewClasses=new Set(['corvette','frigate','cruiser','carrier']);
const canDockShipClass=(craft,host)=>dockableMulticrewClasses.has(host)&&(craft==='fighter'||craft==='vessel');
const currentDockingShipClass=()=>fittedFighter()?.hullClass??'fighter';
const capitalWarning='Capital test · No credits or damage saved';
const pegasusCapital=Object.freeze({id:'pegasus',name:'Pegasus',hullClass:'carrier',art:'./carrier-capital.webp?v=133',sections:capitalSections});
const bifrostCapital=Object.freeze({id:'bifrost',name:'Bifrost',hullClass:'carrier',art:'./bifrost-top.webp',
 // The forked hull is wider at the rear. The same scale, course and four-slot
 // berth template preserve fit and traffic; these circles cover its wings.
 sections:[[0,-.36,24],[0,-.24,40],[0,-.09,53],[0,.08,69],[0,.27,82],[-.27,.26,55],[.27,.26,55],[0,.39,45]]});
const capitalBerth=Object.freeze({launchEnd:294,approach:310,maxGap:114,maxSpeed:115,queueSeconds:8,
 launchSeconds:2.05,dockSeconds:2.45,liftSeconds:.57,approachSeconds:1.63,lowerSeconds:.66,parkScale:.33,
 innerScale:.31,storageSeconds:1.0});
 // Four berths and one shared lift on the gold-lined deck of the 292×438 art.
 // The fore and aft rows give the pilot's full-size approach room past the wingmen.
 const capitalPads=[[-12,84],[12,84],[-12,128],[12,128]],capitalLift={x:0,y:79};
// Two rows on the left and right striped side decks. The internal lift
 // sits just inboard of the port deck, not in any aft engine opening.
 // Keep parked fighters centered between the painted runway stripes, with
 // the aft pair a full fighter length clear of the deck's back corners.
 const bifrostPads=[[-77,71],[77,71],[-88,112],[88,112]],bifrostLift={x:-50,y:102};
 const capitalLocked=()=>!!capitalShip&&(capitalShip.phase!=='flight'||resoluteLatched()||blackwaterLatched());
const smoothBerth=(p)=>{const t=clamp(p,0,1);return t*t*(3-2*t);};
// Crew traffic is normally scenery. An assigned Wing Two uses the same deck
// departure, then hands off once to the formation AI.
const wingReloadSeconds=2.4;
function chooseRecoveryPad(pads,blocked,roll){
 const available=pads.filter(pad=>!blocked.has(pad));
 return available.length?available[Math.floor(roll*available.length)]:null;
}
function wingLaunchWave(queue,pads,reserved,busy){
 const available=pads.filter(pad=>pad!==reserved&&!busy.has(pad)).slice(0,3);
 return available.slice(0,queue.length).map((pad,i)=>({pad,craft:queue[i]}));
}
function beginWingIntake(ship){
 if(ship?.formationTestQueue){
  const waiting=ship.deckCrew.filter(order=>order.formationTest&&!order.deployed);
  ship.deckCrew=ship.deckCrew.filter(order=>!order.formationTest);
  const returning=formationEscorts.filter(craft=>craft.hp>0).map(craft=>({...craft.formationTestOrder,craft}));
  ship.formationTestQueue.unshift(...returning,...waiting);
  formationEscorts=[];syncWingmanCommands();return;
 }
 const craft=wingman;
 if(![pegasusCapital,bifrostCapital].includes(ship?.vessel)||!craft?.corsairWing||craft.hp<=0||ship.wingIntake||ship.storedWing)return;
 const from=berthLocal(ship,craft.x,craft.y);
 const aim=headingDelta(ship.aim,craft.aim);
 ship.wingIntake={craft,from,aim,time:0,duration:Math.max(2.4,Math.hypot(from.x-ship.lift.x,from.y-ship.lift.y)/120)};
 wingman=null;syncWingmanCommands();
}
function advanceWingDeckQueue(ship,dt){
 if(ship.formationTestQueue){
  // Drain one wave at a time; docking still owns its reserved pad.
  if(ship.phase!=='flight'||ship.deckCrew.some(order=>order.formationTest))return;
  const pads=ship.pads.map((_,i)=>i),busy=new Set(ship.deckCrew.map(crew=>crew.pad));
  if(p.dockingClearance)busy.add(ship.pad);
  const wave=wingLaunchWave(ship.formationTestQueue,pads,ship.recoveryPad,busy);
  for(const {pad,craft:order} of wave){
   Object.assign(order,{phase:'taxi',wait:0,phaseTime:0,pad,side:pad%2===0?-1:1,
    lx:ship.lift.x,ly:ship.lift.y,heading:0,scale:.14,deployed:false});
   ship.deckCrew.push(order);
  }
  ship.formationTestQueue.splice(0,wave.length);
  return;
 }
 const intake=ship.wingIntake;
 if(intake){
  intake.time=Math.min(intake.duration,intake.time+dt);
  if(intake.time>=intake.duration){
   ship.storedWing=intake.craft;ship.wingIntake=null;
  }
 }
 const order=ship.wingDeckOrder;
 if(!order||ship.phase!=='flight'||ship.wingIntake)return;
 const craft=order.craft??ship.storedWing;
 const pads=ship.pads.map((_,i)=>i),busy=new Set(ship.deckCrew.map(crew=>crew.pad));
 if(p.dockingClearance)busy.add(ship.pad);
 const [next]=wingLaunchWave([craft],pads,ship.recoveryPad,busy);
 if(!next)return;
 Object.assign(order,{phase:'taxi',wait:0,phaseTime:0,pad:next.pad,side:next.pad%2===0?-1:1,
  lx:ship.lift.x,ly:ship.lift.y,heading:0,scale:.14,craft:next.craft});
 ship.deckCrew.push(order);ship.wingDeckOrder=null;ship.storedWing=null;
}
function advanceCapitalTraffic(ship,dt){
 if(!Number.isFinite(dt)||dt<=0)return;
 const b=capitalBerth,turn=Math.PI/2,frame=Math.min(dt,.1);
 advanceWingDeckQueue(ship,frame);
 for(const wing of ship.deckCrew??[]){
  if(wing.corsair&&wing.phase==='taxi'&&ship.phase!=='flight')continue;
  if(wing.corsair&&wing.phase==='parked'&&!['launching','flight'].includes(ship.phase))continue;
  const [px,py]=(ship.pads??capitalPads)[wing.pad],side=wing.side===-1?-1:wing.side===1?1:wing.pad===0?-1:1;
  const launchTime=b.launchSeconds+1,patrolTime=side<0?13.8:14.7,dockTime=b.dockSeconds+1.65;
  let left=frame;
  while(left>0){
   if(wing.phase==='parked'){
    const used=Math.min(left,Math.max(0,wing.wait));wing.wait-=used;left-=used;
    if(wing.wait>0)break;
    wing.phase='launching';wing.phaseTime=0;
   }else{
    const duration=wing.phase==='taxi'?wingReloadSeconds:wing.phase==='launching'?launchTime:wing.phase==='patrol'?patrolTime:dockTime;
    const used=Math.min(left,Math.max(0,duration-wing.phaseTime));wing.phaseTime+=used;left-=used;
    if(wing.phaseTime+1e-9<duration)break;
    if(wing.phase==='taxi')wing.phase='launching';
    else if(wing.phase==='launching')wing.phase='patrol';
    else if(wing.phase==='patrol')wing.phase='docking';
    else{
     wing.phase='parked';wing.laps=(wing.laps??0)+1;
     wing.wait=(side<0?4.1:5.8)+(wing.laps%3)*1.15;
    }
    wing.phaseTime=0;
   }
  }
  if(wing.corsair&&wing.phase==='patrol'){
   const fy=220+(wing.formationTest&&wing.pad>=2?54:0),ready=berthWorld(ship,side*170,fy),heading=ship.aim+side*turn,velocity=berthVelocity(side*170,fy);
   wing.deployed=true;
   const fit=wing.formationTest?wingTestFit(wing.hull):crossEscortFit;
   const craft=wing.craft??Object.assign(makeAlliedFighter(ready.x,ready.y,wing.corsair,'wingman',wing.name??'Wing Two',fit),{he3:fit.he3Capacity});
   Object.assign(craft,{x:ready.x,y:ready.y,prevX:ready.x,prevY:ready.y,corsairWing:true,
    formationHeading:pendingCarrierSortie?.approach?.heading??(flightMode.id===freeFlight.id?ship.aim+Math.PI:ship.aim),
    aim:heading,vx:velocity.x+Math.cos(heading)*44,vy:velocity.y+Math.sin(heading)*44});
   if(wing.formationTest){craft.formationTestOrder={corsair:wing.corsair,name:wing.name,hull:wing.hull,formationTest:true};formationEscorts.push(craft);}else wingman=craft;
   syncWingmanCommands();continue;
  }
  if(wing.phase==='taxi'){
   const q=smoothBerth(wing.phaseTime/wingReloadSeconds);
   Object.assign(wing,{lx:ship.lift.x+(px-ship.lift.x)*q,ly:ship.lift.y+(py-ship.lift.y)*q,heading:0,scale:.14+(b.parkScale-.14)*q});
  }else if(wing.phase==='parked')Object.assign(wing,{lx:px,ly:py,heading:0,scale:b.parkScale});
  else if(wing.phase==='launching'){
   const time=wing.phaseTime,q=smoothBerth((time-.22)/(launchTime-.22));
   const lateral=ship.vessel===bifrostCapital?1-(1-q)**3:q+.16*Math.sin(Math.PI*q);
   Object.assign(wing,{lx:px+(side*170-px)*lateral,ly:py+(220-py)*(ship.vessel===bifrostCapital?q**2:q),
    heading:side*turn*smoothBerth(time/(launchTime*.75)),
    scale:b.parkScale+(1-b.parkScale)*smoothBerth((time-b.liftSeconds)/(launchTime*.55))});
  }else if(wing.phase==='patrol'){
   const a=2*Math.PI*smoothBerth(wing.phaseTime/patrolTime);
   Object.assign(wing,{lx:side*(170+42*Math.sin(a)),ly:220*Math.cos(a),
    heading:Math.atan2(side*42*Math.cos(a),220*Math.sin(a)),scale:1});
  }else{
   const time=wing.phaseTime,q=smoothBerth((time-.62)/(dockTime-.62-b.lowerSeconds));
   const direction=turn*(1-smoothBerth(time/.80))-.80*smoothBerth((time-.12)/.86)*(1-smoothBerth((time-1.5)/1.8));
   const lower=smoothBerth((time-(dockTime-b.lowerSeconds))/b.lowerSeconds);
   const lateral=ship.vessel===bifrostCapital?q**3:q-.16*Math.sin(Math.PI*q);
   Object.assign(wing,{lx:side*170+(px-side*170)*lateral,ly:220+(py-220)*(ship.vessel===bifrostCapital?1-(1-q)**2:q),
    heading:side*direction,scale:1-(1-b.parkScale)*lower});
  }
 }
 if(ship.deckCrew?.some(member=>member.deployed))ship.deckCrew=ship.deckCrew.filter(member=>!member.deployed);
}
// Fully airborne deck patrols drift when bumped, then gently recover their lane.
function resolveDeckTrafficContacts(ship,dt){
 if(ship.phase!=='flight'||dt<=0)return;
 for(const member of ship.deckCrew){
  if(member.corsair||member.scale<.83||!['launching','patrol','docking'].includes(member.phase)){member.contactPoint=member.drift=null;continue;}
  const point=berthWorld(ship,member.lx,member.ly),prior=member.contactPoint;
  member.contactPoint=point;
  const v=prior?{x:(point.x-prior.x)/dt,y:(point.y-prior.y)/dt}:berthVelocity(member.lx,member.ly);
  const drift=member.drift??={x:0,y:0,vx:0,vy:0};
  const fade=Math.exp(-4*dt);
  drift.vx=(drift.vx-drift.x*3*dt)*fade;drift.vy=(drift.vy-drift.y*3*dt)*fade;
  drift.x+=drift.vx*dt;drift.y+=drift.vy*dt;
  const body={x:point.x+drift.x,y:point.y+drift.y,r:17*member.scale,vx:v.x+drift.vx,vy:v.y+drift.vy,
   spin:0,craft:true,invMass:contactMassScale/stockFitWeight};
  contact(p,body,false);
  drift.x=body.x-point.x;drift.y=body.y-point.y;
  drift.vx=body.vx-v.x;drift.vy=body.vy-v.y;
 }
}
function berthLift(ship){
 const b=capitalBerth,time=ship.berthMove?.time??0;
 if(['docked','storing','stored','retrieving'].includes(ship.phase))return 0;
 if(ship.phase==='launching')return smoothBerth(time/b.liftSeconds);
 if(ship.phase==='docking')return 1-smoothBerth((time-(b.dockSeconds-b.lowerSeconds))/b.lowerSeconds);
 return 1;
}
function storageProgress(ship){
 const progress=(ship.berthMove?.time??0)/capitalBerth.storageSeconds;
 return ship.phase==='storing'?smoothBerth(progress):ship.phase==='retrieving'?smoothBerth(1-progress):0;
}
// Shared carrier-local frame. Future fixed modules can use it directly;
// docking uses it only while latched, and Escort only to navigate its slot.
function berthWorld(pose,lx,ly){
 const c=Math.cos(pose.aim+Math.PI/2),s=Math.sin(pose.aim+Math.PI/2);
 return {x:pose.x+c*lx-s*ly,y:pose.y+s*lx+c*ly};
}
function berthLocal(pose,x,y){
 const dx=x-pose.x,dy=y-pose.y,c=Math.cos(pose.aim+Math.PI/2),s=Math.sin(pose.aim+Math.PI/2);
 return {x:c*dx+s*dy,y:-s*dx+c*dy};
}
function berthVelocity(lx,ly){
 const c=capitalShip,d=c.distance,speed=c.speed,h=.08,pose=c.stream?capitalCruisePose:capitalCoursePose;
 const a=berthWorld(pose(d-h),lx,ly),b=berthWorld(pose(d+h),lx,ly);
 return {x:(b.x-a.x)*speed/(2*h),y:(b.y-a.y)*speed/(2*h)};
}
function capitalDockCheck(){
 const c=capitalShip;if(!c||c.phase!=='flight'||!p.dockingClearance||!canDockShipClass(currentDockingShipClass(),c.vessel.hullClass))return null;
 const port=berthWorld(c,0,capitalBerth.approach),v=berthVelocity(0,capitalBerth.approach);
 const gap=Math.hypot(p.x-port.x,p.y-port.y),speed=Math.hypot(p.vx-v.x,p.vy-v.y);
 const available=c.pilotPads.includes(c.pad)&&!c.deckCrew.some(member=>member.pad===c.pad);
 const inRange=gap<=capitalBerth.maxGap;
 // The visible hologram is the capture boundary. Bridge control aligns the
 // fighter after capture; speed is measured against the moving beacon.
 return {port,gap,speed,inRange,available,ready:available&&inRange&&speed<=capitalBerth.maxSpeed};
}
const dockStageAnnouncements=Object.freeze({
 docked:'Docked. Launch or store the fighter.',stored:'Fighter stored. Launch or enter the hangar.',
 launching:'Launching.',docking:'Docking in progress.',approach:'Docking clearance granted. Enter the marked approach ring.',
 slow:'In the docking ring. Match the carrier speed or queue docking.',ready:'Docking available. Activate Dock when ready.',
 queued:'Docking queued. You can cancel while waiting.'
});
function canRepairFleetReturn(){
 return !!(capitalShip?.roundTripReturned&&capitalShip.pilotLanded&&capitalShip.phase==='docked'&&
  state==='play'&&p.hp>0&&p.hp<p.maxHp);
}
function repairFleetReturnHull(event){
 if(event.isTrusted!==true||document.hidden||routeParked||hangarDialog?.open||!canRepairFleetReturn()||capitalShip.repairReadyAt)return;
 capitalShip.repairReadyAt=Date.now()+partialHullRepairDurationMs;
 updateCapitalHud();
}
fleetRepairAction?.addEventListener('click',repairFleetReturnHull);
function updateCapitalHud(){
 if(canRepairFleetReturn()&&capitalShip.repairReadyAt&&Date.now()>=capitalShip.repairReadyAt){
  capitalShip.repairReadyAt=0;p.hp=p.maxHp;updateHud();
 }
 if(fleetRepairAction){
  const secs=capitalShip?.repairReadyAt?Math.max(0,Math.ceil((capitalShip.repairReadyAt-Date.now())/1000)):0;
  const label=secs?'Repair '+secs+'s':'Repair hull';
  if(fleetRepairAction.textContent!==label)fleetRepairAction.textContent=label;
  fleetRepairAction.hidden=!canRepairFleetReturn();
  fleetRepairAction.disabled=fleetRepairAction.hidden||!!capitalShip?.repairReadyAt||document.hidden||routeParked||!!hangarDialog?.open;
 }
 if(flightMapButton){
  const available=flightMapVisible();
  flightMapButton.hidden=!available;
  flightMapButton.disabled=!available||Boolean(transferTransit);
 }
 if(capitalHangar){
  const stored=capitalShip?.phase==='stored';
  capitalHangar.hidden=!stored;
  capitalHangar.disabled=!stored||state!=='play'||!!capitalHangarApproach;
 }
 if(resoluteDrillButton){
  resoluteDrillButton.hidden=!canRunResoluteDrill();
  const text=capitalShip?.resoluteDrill?.drones.some(d=>d.hp>0)?'End turret drill':'Test Resolute turret';
  if(resoluteDrillButton.textContent!==text)resoluteDrillButton.textContent=text;
  resoluteDrillButton.dataset.compact=text==='End turret drill'?'End':'Drill';
 }
 if(dockStageNote&&(!capitalShip||state!=='play'))dockStageNote.hidden=true;
 if(!capitalHud)return;
 capitalHud.hidden=!capitalShip||resoluteLatched()||blackwaterLatched();
 if(!capitalShip){if(dockingComms)dockingComms.hidden=true;if(dockingAnnouncement)dockingAnnouncement.textContent='';return;}
 const phase=capitalShip.phase,check=capitalDockCheck(),onBifrost=capitalShip.vessel===bifrostCapital;
 const testPlan=pendingCarrierSortie?.mode.tileTest?pendingCarrierSortie:null;
 const cross=testPlan?.mode.crossBattle;
 const returnedCross=flightMode.crossBattle&&capitalShip.roundTripReturned;
 const repairReturn=!!testPlan?.resume&&!testPlan.failed;
 const waitingForChart=(phase==='docked'||phase==='stored')&&testPlan&&!testPlan.approach&&!sortieApproach(testPlan);
 const available=phase==='docked'||phase==='stored',queued=!!p.dockQueuedUntil,canQueue=check?.available&&check.inRange;
 const awaiting=phase==='flight'&&pendingCarrierSortie&&!check;
 const stage=phase!=='flight'?phase:!check?'request':queued?'queued':!check.available?'busy':!check.inRange?'approach':check.ready?'ready':'slow';
 // Announce only meaningful transitions, not telemetry that can change every frame.
 const announcement=testPlan?.crossNotice|| (waitingForChart?(cross?'Blackwake must be within short-flight range. Checking fleet positions.':'Waiting for a valid Galaxy position for the cross-tile test.'):awaiting?(testPlan?.approach?tileExitStatus(testPlan):'Fly south to continue your flight plan.'):dockStageAnnouncements[stage]??'');
 if(dockingAnnouncement&&dockingAnnouncement.textContent!==announcement)dockingAnnouncement.textContent=announcement;
 if(capitalHud.dataset.stage!==stage)capitalHud.dataset.stage=stage;
 const label=available?'Launch':phase==='storing'?'Storing…':phase==='retrieving'?'Retrieving…':phase==='launching'?'Launching…':phase==='docking'?'Docking…':queued?'Cancel Dock':check?.ready?'Dock':check?'Queue Dock':'Request Docking';
 const text=testPlan?.crossNotice||capitalShip.transferNotice|| (returnedCross&&phase==='flight'&&!check?'Battle Fleet Map · Pegasus approach · Request Docking':cross&&available&&!waitingForChart?'Blackwake · '+(cross.role==='reinforce'?'Follow Bifrost':'Pegasus intercept')+' · Local combat':capitalShip.transferSaveFailed?'Could not save berth · Fighter still parked at '+vesselName(fighterParkedVessel(flightHullId)):
  capitalShip.transfer?.arrived&&phase==='flight'&&!check?'Battle Fleet Map · '+capitalShip.name+' approach. Request docking clearance.':
  capitalShip.transfer&&!capitalShip.transfer.arrived?'Course set to '+vesselName(capitalShip.transfer.target)+' · Launch when ready':
  pendingCarrierSortie?.failed?'Flight plan or fighter changed · Return to Carrier':
  waitingForChart?(cross?'Blackwake · Waiting for fleet positions':'Corsair Cluster · Waiting for a valid Galaxy position'):
  phase==='docked'?(repairReturn?'Docked · Repair or launch to rejoin Corsair Cluster':flightMode.fourWay?capitalShip.name+' · Launch into the fleet tile':flightMode.loaner?'Battle Fleet Map · '+(hangarDisplayHull(flightMode.loaner)?.name??'Loaner'):pendingCarrierSortie?'Landing Page · Ready for '+pendingCarrierSortie.title:'Landing Page · Carrier underway'):phase==='stored'?(capitalHangarApproach?'Entering Hangar…':(flightMode.loaner?'':'Landing Page · ')+'Stored in internal hangar'):
  phase==='storing'&&capitalShip.parkingCommit?.status==='pending'?'Saving fighter berth to server…':
  phase==='storing'||phase==='retrieving'?'Shared lift in use':phase==='launching'?'Aft departure · Controls return at clearance':
  phase==='docking'?(capitalShip.berthMove.time>=capitalBerth.dockSeconds-capitalBerth.lowerSeconds?'Lowering to deck':'Aligning with pad '+(capitalShip.pad+1)):!check?(awaiting?(testPlan?.approach?tileExitStatus(testPlan):'Fly south to '+pendingCarrierSortie.title):'Request clearance to show docking ring'):
  check.ready?'In range · Tap Dock':!check.available?'Pad unavailable':!check.inRange?'Enter docking ring · '+Math.ceil(check.gap-capitalBerth.maxGap)+' u':
  (queued?'Queued · ':'')+'Match carrier speed · '+Math.round(check.speed)+' u/s relative');
 const comms=phase==='docking'?'Approach confirmed. Your berth is ready.':!check?'':queued?'Dock queued. Slow down inside the ring.':
  capitalShip.returnGreeting?'Back so soon? All right, I’ve got a spot for you.':check.ready?'Your berth is ready. Tap Dock.':'Clearance granted. Enter the ring and slow down.';
 if(dockingComms){
  const hidden=state!=='play'||elapsed>=(capitalShip.commsUntil??0);
  if(dockingComms.hidden!==hidden)dockingComms.hidden=hidden;
  if(dockingCommsText&&dockingCommsText.textContent!==comms)dockingCommsText.textContent=comms;
 }
 const status=onBifrost&&!flightMode.fourWay?capitalShip.name+' · '+text:text;
 if(capitalStatus&&capitalStatus.textContent!==status)capitalStatus.textContent=status;
 if(dockStageNote){
  dockStageNote.hidden=resoluteLatched()||blackwaterLatched()||state!=='play'||(stage==='request'&&!awaiting&&!testPlan?.crossNotice&&!capitalShip.transferNotice&&!capitalShip.transfer)||!!transferTransit;
  if(dockStageNote.textContent!==status)dockStageNote.textContent=status;
 }
 if(capitalAction){
  if(capitalAction.textContent!==label)capitalAction.textContent=label;
  capitalAction.dataset.compact=label==='Request Docking'?'Dock':label==='Cancel Dock'?'Cancel':label==='Queue Dock'?'Queue':
   label==='Retrieving…'?'Lift':label.endsWith('…')?label.slice(0,4)+'…':label;
  capitalAction.disabled=!!capitalShip.resoluteDock||!!capitalShip.repairReadyAt||state!=='play'||Boolean(waitingForChart)||!!testPlan?.joining||!!capitalHangarApproach||available&&!!pendingCarrierSortie?.failed||(!available&&(phase!=='flight'||!!check&&!check.ready&&!queued&&!canQueue));
 }
 if(capitalStore){capitalStore.hidden=phase!=='docked';capitalStore.disabled=!!capitalShip.repairReadyAt||state!=='play'||phase!=='docked';}
 capitalHud.dataset.phase=phase;
}
function placeBerthPilot(x,y,aim,dt){
 const next=berthWorld(capitalShip,x,y),world=berthVelocity(x,y);
 p.prevX=p.x;p.prevY=p.y;
 p.vx=dt>0?(next.x-p.x)/dt:world.x;p.vy=dt>0?(next.y-p.y)/dt:world.y;
 p.x=next.x;p.y=next.y;snapAim(capitalShip.aim+aim);
}
function advanceCapitalBerth(dt){
 const c=capitalShip;updateCapital(dt);
 const phase=c.phase,[px,py]=c.pads[c.pad],b=capitalBerth,lift=c.lift;
 if(phase==='docked'){placeBerthPilot(px,py,0,dt);return;}
 if(phase==='stored'){placeBerthPilot(lift.x,lift.y,0,dt);return;}
 if(phase==='storing'||phase==='retrieving'){
  const line=c.berthMove;
  line.time=motion?.matches?b.storageSeconds:Math.min(b.storageSeconds,line.time+dt);
  const ease=storageProgress(c);
  placeBerthPilot(px+(lift.x-px)*ease,py+(lift.y-py)*ease,0,dt);
  if(line.time>=b.storageSeconds){
   if(phase==='storing'&&needsParkingCommit(c)){
    if(!c.parkingCommit){commitFighterParking(c);return;}
    if(c.parkingCommit.status==='pending')return;
    if(c.parkingCommit.status!=='saved'){
     c.phase='docked';c.berthMove=null;c.transferSaveFailed=true;placeBerthPilot(px,py,0,0);syncArrivalControls();return;
    }
   }
   c.phase=phase==='storing'?'stored':'launching';c.berthMove=c.phase==='stored'?null:{time:0};
   syncArrivalControls();
   if(c.phase==='stored')capitalAction?.focus({preventScroll:true});
  }
  return;
 }
 const line=c.berthMove,duration=phase==='launching'?b.launchSeconds:b.dockSeconds;
 line.time=motion?.matches?duration:Math.min(duration,line.time+dt);
 if(phase==='launching'){
  const t=clamp((line.time-b.liftSeconds)/(duration-b.liftSeconds),0,1),ease=smoothBerth(t);
  const sideExit=c.vessel===bifrostCapital,y=py+(b.launchEnd-py)*t*t*(2-t);
  const x=sideExit?Math.sign(px)*(Math.abs(px)+24*smoothBerth(t/.4))*(1-smoothBerth((y-246)/48)):px*(1-ease);
  placeBerthPilot(x,y,Math.PI*ease*(sideExit?Math.sign(px):1),dt);
  if(line.time>=duration){
   const v=berthVelocity(0,b.launchEnd),speed=Math.min(66,p.speed*.50);
   p.vx=v.x-Math.cos(c.aim)*speed;p.vy=v.y-Math.sin(c.aim)*speed;
   p.mainMomentum=true;c.phase='flight';c.berthMove=null;
   const pads=c.pilotPads.filter(index=>index!==c.recoveryPad&&!c.deckCrew.some(crew=>crew.pad===index&&!crew.deployed));
   if(pads.length)c.pad=pads[Math.floor(Math.random()*pads.length)];
   syncArrivalControls();liveFocus();
  }
 }else{
  const ease=smoothBerth(line.time/b.approachSeconds);
  const y=line.y+(py-line.y)*ease;
  const x=c.vessel===bifrostCapital?line.x*(1-ease)+px*ease+.4*px*Math.sin(Math.PI*ease):line.x+(px-line.x)*ease;
  placeBerthPilot(x,y,line.aim*(1-ease),dt);
  if(line.time>=duration){
   c.phase='docked';c.berthMove=null;placeBerthPilot(px,py,0,0);syncArrivalControls();
   capitalAction?.focus({preventScroll:true});
  }
 }
}
function startCapitalCapture(){
 const c=capitalShip;
 c.pilotLanded=true;if(c.transfer?.arrived)c.transfer.captured=true;
 const offset=berthLocal(c,p.x,p.y),diff=p.aim-c.aim;
 beginWingIntake(c);
 c.phase='docking';c.berthMove={...offset,time:0,aim:Math.atan2(Math.sin(diff),Math.cos(diff))};
 p.dockingClearance=false;clearInput({preserveDockVoice:true});shots=[];p.mainMomentum=p.mainThrustActive=false;syncArrivalControls();
}
function advanceQueuedDock(){
 if(!p.dockQueuedUntil)return;
 const check=capitalDockCheck();
 if(!check||elapsed>=p.dockQueuedUntil||!check.inRange||!check.available){p.dockQueuedUntil=0;return;}
 if(check.ready)startCapitalCapture();
}
function requestCapitalManeuver(event){
 const c=capitalShip;
 if(!c||c.resoluteDock||c.repairReadyAt||transferTransit||event.isTrusted!==true||state!=='play'||document.hidden||routeParked||hangarDialog?.open||capitalHangarApproach)return;
 if(c.phase==='flight'&&!p.dockingClearance){
  if(!canDockShipClass(currentDockingShipClass(),c.vessel.hullClass))return;
  // Local clearance is granted to this fighter. A separate request to
  // capture must still pass the real position, relative speed and heading.
   p.dockingClearance=true;
  // First contact always uses standard clearance; only later requests can roll a return greeting.
  c.returnGreeting=chooseDockGreeting(c);
  const fadeAt=c.returnGreeting?3.61:7.53;
  c.commsUntil=elapsed+fadeAt+.32;
  dockingComms?.style.setProperty('--dock-signoff',fadeAt+'s');
  setDockPortrait(c.returnGreeting);updateCapitalHud();speakDockClearance(event,c.returnGreeting);return;
 }
 if(c.phase==='docked'||c.phase==='stored'){
  if(c.transfer&&!c.transfer.arrived&&!transferPlanValid(c.transfer)){
   c.transfer=null;c.transferSaveFailed=true;syncArrivalControls();return;
  }
  if(pendingCarrierSortie&&!carrierSortieCurrent(pendingCarrierSortie)){failCarrierSortie(pendingCarrierSortie);return;}
  if(pendingCarrierSortie?.mode.crossBattle&&!pendingCarrierSortie.receipt){
   authorizeCrossLaunch(pendingCarrierSortie,event);return;
  }
  if(pendingCarrierSortie?.mode.tileTest&&!pendingCarrierSortie.approach){
   const approach=sortieApproach(pendingCarrierSortie);
   if(!approach||!tileGate(approach.exitEdge)){updateCapitalHud();return;}
   pendingCarrierSortie.approach=approach;
  }
  if(c.storedWing||c.wingIntake){
   const deck=queueCarrierWingTwo(c,true);
   if(deck&&pendingCarrierSortie)pendingCarrierSortie.deckWing=deck;
  }
  c.phase=c.phase==='stored'?'retrieving':'launching';c.berthMove={time:0};}
 else if(c.phase==='flight'){
  const check=capitalDockCheck();
  if(p.dockQueuedUntil)p.dockQueuedUntil=0;
  else if(check?.ready)startCapitalCapture();
  else if(check?.available&&check.inRange)p.dockQueuedUntil=elapsed+capitalBerth.queueSeconds;
  updateCapitalHud();unlockAudio(undefined,event);return;
 }else return;
 p.dockingClearance=false;clearInput();shots=[];p.mainMomentum=p.mainThrustActive=false;syncArrivalControls();
 unlockAudio(undefined,event);
}
function storeCapitalFighter(event){
 const c=capitalShip;
 if(c?.phase!=='docked'||c.repairReadyAt||c.transfer?.arrived&&!c.transfer.captured||event.isTrusted!==true||state!=='play'||document.hidden||routeParked||hangarDialog?.open)return;
 // One latched berthing phase owns the internal lift. Exterior launches
 // never wait for or take this lift; this mode has no artificial NPC queue.
 c.transferSaveFailed=false;c.parkingCommit=null;c.parkingRevision=parkingAPI?.details?.(flightHullId)?.revision??undefined;c.phase='storing';c.berthMove={time:0};clearInput();syncArrivalControls();
}
let capitalShip=null,capitalHangarApproach=null,pendingCarrierSortie=null,blackwake=null,pirateCapitals=[];
const capitalHangarZoomSeconds=.88;
const sortieGateY=()=>arena.bottom-30;
const fourWayOrigins=Object.freeze({
 north:Object.freeze({carrier:'Northwatch',heading:Math.PI/2,color:'#67e6ff',capital:'pegasus'}),
 east:Object.freeze({carrier:'Dawnline',heading:Math.PI,color:'#ffbd62',capital:'bifrost'}),
 south:Object.freeze({carrier:'Meridian',heading:-Math.PI/2,color:'#8aef9d',capital:'pegasus'}),
 west:Object.freeze({carrier:'Westreach',heading:0,color:'#e5a7ff',capital:'bifrost'})
});
const tileDirections=Object.freeze({north:[0,-1],east:[1,0],south:[0,1],west:[-1,0]});
function tileGate(edge){
 const vector=tileDirections[edge];if(!vector)return null;
 const axis=vector[0]?'x':'y',sign=vector[0]||vector[1];
 const line=axis==='x'?(sign>0?arena.right-30:arena.left+30):(sign>0?arena.bottom-30:arena.top+30);
 return {axis,sign,line,vector};
}
function corsairApproach(){
 const helper=window.RiftFleetApproach;
 return helper?.plan(capitalShip?.stream?.chart?.sample?.(),helper.encounter)??null;
}
function sortieApproach(sortie){
 const cross=sortie?.mode.crossBattle;
 if(!cross)return corsairApproach();
 const helper=window.RiftFleetApproach,bifrost=cross.bifrostApproach;
 const source=capitalShip?.stream?.chart?.sample?.(),short=window.RiftShortFlight;
 const d=short?.distance(source,cross.point)??null;
 if(d===null||d>short.maxRange)return null;
 const pilot=cross.role==='reinforce'?bifrost:helper?.plan(source,cross.point);
 return pilot&&bifrost?{...pilot,bifrost}:null;
}
async function authorizeCrossLaunch(sortie,event){
 if(sortie.joining||!carrierSortieCurrent(sortie))return;
 const approach=sortieApproach(sortie),ship=capitalShip,hull=flightHullId;
 if(!approach||!ship)return;
 sortie.joining=true;sortie.crossNotice='Blackwake · Confirming your flight';updateCapitalHud();
 let receipt=null;
 try{receipt=await window.RiftCrossBattle?.join('rift-carrier',hull,sortie.mode.crossBattle.role);}catch{}
 if(sortie!==pendingCarrierSortie||ship!==capitalShip)return;
 sortie.joining=false;
 if(!receipt){sortie.crossNotice='Berth not confirmed. Dock and Store Inside Pegasus, then retry.';updateCapitalHud();return;}
 if(state!=='play'||document.hidden||routeParked||!carrierSortieCurrent(sortie)){
  sortie.crossNotice='Flight not started. Tap Launch to retry.';updateCapitalHud();return;
 }
 const {encounter,participation}=receipt,cross=sortie.mode.crossBattle;
 if(encounter?.id!=='blackwake'||encounter.startsAt!==cross.startsAt||encounter.endsAt!==cross.endsAt||encounter.sector!==cross.point.sector||encounter.x!==cross.point.x||encounter.y!==cross.point.y||
    participation?.hull!==hull||participation.vessel!=='rift-carrier'||participation.role!==cross.role){
  sortie.crossNotice='This battle could not be verified.';updateCapitalHud();return;
 }
 sortie.approach=approach;sortie.receipt=true;sortie.crossNotice='';
 requestCapitalManeuver(event);
}
function tileExitStatus(sortie){
 if(sortie.deckWing&&!sortie.deckWing.deployed)return 'Wing Two launching · Exit '+sortie.approach.exitEdge;
 return 'Fly '+sortie.approach.exitEdge+(sortie.resume?' to rejoin Corsair Cluster':' to '+sortie.title);
}
const capitalArt=new Map();
function capitalCoursePose(distance,course=capitalCourse){
 const {x,y,halfRun,radius}=course;
 const line=2*halfRun,arc=Math.PI*radius,s=((distance%(2*(line+arc)))+2*(line+arc))%(2*(line+arc));
 if(s<line)return {x:x+radius,y:y+halfRun-s,aim:-Math.PI/2};
 if(s>=line+arc&&s<2*line+arc)return {x:x-radius,y:y-halfRun+s-line-arc,aim:Math.PI/2};
 const north=s<line+arc,a=north?-(s-line)/radius:Math.PI-(s-2*line-arc)/radius;
 return {x:x+radius*Math.cos(a),y:y+(north?-halfRun:halfRun)+radius*Math.sin(a),aim:Math.atan2(-Math.cos(a),Math.sin(a))};
}
// A long straight leg, then two shallow arcs. Northward travel never
// wraps. Only the lateral lane alternates, within the fixed side walls.
const capitalCruise=Object.freeze({leg:3300,arc:440,turn:.20,band:512});
function capitalCruisePose(distance,course=capitalCourse){
 const {leg,arc,turn}=capitalCruise,straight=leg-2*arc,r=arc/turn;
 const lane=2*r*(1-Math.cos(turn)),northLeg=straight+2*r*Math.sin(turn);
 const cycle=Math.floor(distance/leg),step=distance-cycle*leg,odd=Math.abs(cycle%2)===1,side=odd?-1:1;
 let x=course.x+course.radius+(odd?lane:0),north=cycle*northLeg,aim=-Math.PI/2;
 if(step<=straight){north+=step;}
 else{
  const along=step-straight,angle=along<=arc?along/r:(2*arc-along)/r;
  const lateral=r*(1-Math.cos(angle)),travel=r*Math.sin(angle);
  x+=side*(along<=arc?lateral:lane-lateral);
  north+=straight+(along<=arc?travel:2*r*Math.sin(turn)-travel);
  aim+=side*angle;
 }
 return {x,y:course.y+course.halfRun-north,aim};
}
function updateCapital(dt){
 const c=capitalShip;if(!c)return;
 advanceCourseShip(c,capitalCourse,c.vessel.sections,dt,c.stream?capitalCruisePose:capitalCoursePose);
 updateCapitalShotHull(c,dt>0);
 if(c.stream){
  const offset=c.y-capitalCourse.y-capitalCourse.halfRun;
  arena.top=edge-capitalCourse.north+offset;arena.bottom=H-edge+offset;
 }
 advanceCapitalTraffic(c,dt);
 if(c.supportFleet)updateSupportFleet(c);
}
function advanceCourseShip(ship,course,sections,dt,pose=capitalCoursePose){
 ship.distance+=ship.speed*dt;
 Object.assign(ship,pose(ship.distance,course)); const a=ship.aim+Math.PI/2,u=Math.cos(a),v=Math.sin(a);
 for(const [i,[x,y]] of sections.entries()){
  const piece=ship.hull[i],lx=x*course.width,ly=y*course.height;
  const X=ship.x+u*lx-v*ly,Y=ship.y+v*lx+u*ly;
  piece.prevX=dt>0?piece.x:X;piece.prevY=dt>0?piece.y:Y;piece.x=X;piece.y=Y;
  piece.vx=dt>0?(X-piece.prevX)/dt:0;piece.vy=dt>0?(Y-piece.prevY)/dt:0;
 }
}
function updateCapitalShotHull(ship,moved=true){
 const layout=ship.vessel===bifrostCapital?bifrostShotCover:pegasusShotCover;
 const hull=ship.shotHull??=layout.map(([, ,r])=>{
  const part={capitalHull:true,r};carrierHullOwner.set(part,ship);return part;
 });
 for(const [i,[x,y]] of layout.entries()){
  const part=hull[i],at=berthWorld(ship,x*capitalCourse.width,y*capitalCourse.height);
  Object.assign(part,{prevX:moved?part.x??at.x:at.x,prevY:moved?part.y??at.y:at.y,...at});
 }
}
function launchCapitalTest(vessel=pegasusCapital,stream=false,rendezvous=null,testCarrier=null){
 p.dockingClearance=false;
 for(const [clip,src] of [[dockVoice,'./dock-clearance-radio.mp3?v=154'],[dockReturnVoice,dockReturnVoice?.dataset.voiceSrc]]){
  if(clip&&src&&!clip.getAttribute('src')){clip.preload='auto';clip.setAttribute('src',src);}
 }
 setDockPortrait(false);
 const pads=vessel===bifrostCapital?bifrostPads:capitalPads,lift=vessel===bifrostCapital?bifrostLift:capitalLift;
 const deckCrew=(testCarrier?[]:[-1,1]).map((side,pad)=>({pad,side,phase:'parked',wait:side<0?2.6:5.8,
  lx:pads[pad][0],ly:pads[pad][1],heading:0,scale:capitalBerth.parkScale}));
 capitalShip={vessel,name:testCarrier??vessel.name,testCarrier,hp:carrierMaxHp,maxHp:carrierMaxHp,lift,distance:rendezvous?.distance??0,speed:capitalCourse.speed,pad:2,pads,deckCrew,returnGreeting:false,pilotPads:[2,3],phase:rendezvous?'flight':'docked',transfer:rendezvous??null,
  ...(stream?{stream:{bands:new Map(),seed:vessel===bifrostCapital?0x4f3c:0x7531,chart:testCarrier?undefined:window.RiftGalaxyState?.watch?.(vessel===bifrostCapital?'bifrost':'rift-carrier')}}:{}),
  berthMove:null,hull:vessel.sections.map(([, ,r])=>({capitalHull:true,r,invMass:0,spin:0}))};
 for(const part of capitalShip.hull)carrierHullOwner.set(part,capitalShip);
 if(!capitalArt.has(vessel.id)&&typeof window.Image==='function'){
  const art=new window.Image();art.src=vessel.art;capitalArt.set(vessel.id,art);
 }
 if(vessel===bifrostCapital&&!testCarrier)loadCapitalIdentity(capitalShip);
 updateCapital(0);
 if(!rendezvous){cones=[];placeBerthPilot(...pads[capitalShip.pad],0,0);}
}
function transferAvailable(){
 return !!(capitalShip?.stream&&flightMode.id==='free-flight'&&managedBuild&&!loanerSnapshot&&
  flightCanSave&&flightHullId&&currentCharacterGeneration()===flightGeneration);
}
function transferPlanValid(plan){
 return transferAvailable()&&plan.id===flightHullId&&plan.generation===flightGeneration&&
  currentFlightHullId()===plan.id&&readParking(plan.id)===plan.raw&&
  fighterParkedVessel(plan.id)===plan.origin&&readHullRaw(plan.id)===flightHullRaw;
}
const transferSeconds=3;
function closeGalaxyTransfer(){
 if(!transferTransit)return;
 transferTransit.targetChart?.close?.();
 transferTransit=null;refreshSoundActivation?.();
 if(transferView){transferView.hidden=true;delete transferView.dataset.chart;}
 transferChart?.removeAttribute('src');
 if(arenaScreen)arenaScreen.inert=false;
}
function showGalaxyView(chart,from,url){
 if(!transferView||!transferChart||!transferStatus)return false;
 transferTransit={chart,from,elapsed:0,waiting:0,ready:false,url};
 transferView.dataset.chart=chart;transferView.hidden=false;refreshSoundActivation?.();
 if(arenaScreen)arenaScreen.inert=true;
 if(transferTitle)transferTitle.textContent=chart==='picker'?'Galaxy Map':'Galaxy Map · In Transit';
 if(transferAbort)transferAbort.textContent=chart==='picker'?'Back to flight':'Abort transfer';
 transferChart.setAttribute('tabindex',chart==='picker'?'0':'-1');
 transferChart.setAttribute('src',url);
 transferAbort?.focus({preventScroll:true});
 if(chart==='picker'){
  const queue=p.dockQueuedUntil;
  clearInput({preserveDockVoice:true});p.dockQueuedUntil=queue;
 }else clearInput();
 return true;
}
function flightMapVisible(){
 return !!(state==='play'&&capitalShip?.phase==='flight'&&!capitalShip.transfer&&!capitalShip.resoluteDock&&!document.hidden&&!routeParked&&
  flightMode.id==='free-flight'&&managedBuild&&!loanerSnapshot&&flightCanSave&&flightHullId);
}
function canOpenFlightMap(){
 return flightMapVisible()&&transferAvailable()&&currentFlightHullId()===flightHullId&&fighterParkedVessel(flightHullId)===currentCapitalId(capitalShip);
}
flightMapButton?.addEventListener('click',event=>{
 if(event.isTrusted!==true||transferTransit||hangarDialog?.open||!canOpenFlightMap())return;
 const from=capitalShip,origin=currentCapitalId(from);
 if(showGalaxyView('picker',from,'./galaxy-map.html?flight-map=1&from='+origin))
  transferStatus.textContent='Choose another carrier to plot a course.';
});
transferChart?.addEventListener('load',()=>{
 if(transferTransit&&transferChart.getAttribute('src')===transferTransit.url)transferTransit.ready=true;
});
function exitFlightMap(){
 closeGalaxyTransfer();syncArrivalControls();
 if(!flightMapButton?.hidden)flightMapButton?.focus({preventScroll:true});else liveFocus();
}
transferAbort?.addEventListener('click',event=>{
 if(event.isTrusted!==true||!transferTransit)return;
 if(transferTransit.chart==='picker')exitFlightMap();else enterMainMenu();
});
window.addEventListener('message',event=>{
 const picker=transferTransit,data=event.data,from=capitalShip;
 if(picker?.chart!=='picker'||!picker.ready||picker.from!==from||!transferChart?.contentWindow||
  event.source!==transferChart.contentWindow||event.origin!==window.location.origin||
  data?.type!=='rift-fighter-transfer-select'||!canOpenFlightMap())return;
 const origin=currentCapitalId(from),target=origin==='bifrost'?'rift-carrier':'bifrost',id=flightHullId,raw=readParking(id);
 if(data.from!==origin||data.to!==target||raw===undefined)return;
 const plan={id,origin,target,generation:flightGeneration,raw,revision:parkingAPI?.details?.(id)?.revision??undefined};
 if(!transferPlanValid(plan))return;
 closeGalaxyTransfer();
 p.dockingClearance=false;p.dockQueuedUntil=0;from.commsUntil=0;
 from.transfer=plan;from.transferNotice=null;
 advanceCarrierTransfer(0);
});
function advanceCarrierTransfer(dt){
 const from=capitalShip,plan=from?.transfer;
 if(!plan||plan.arrived||from.phase!=='flight')return;
 if(!transferPlanValid(plan)){
  closeGalaxyTransfer();from.transfer=null;from.transferSaveFailed=true;return;
 }
 if(!transferView||!transferChart||!transferStatus)return;
 if(!transferTransit){
  const url='./galaxy-map.html?transit=1&from='+plan.origin+'&to='+plan.target;
  if(showGalaxyView('transit',from,url)){
   transferTransit.targetChart=window.RiftGalaxyState?.watch?.(plan.target);
   transferStatus.textContent='Checking distance to '+vesselName(plan.target)+'…';
  }
  return;
 }
 if(transferTransit.from!==from){
  closeGalaxyTransfer();from.transfer=null;from.transferSaveFailed=true;return;
 }
 const transit=transferTransit;
 if(!transit.ready){
  transit.waiting+=dt;
  if(transit.waiting>=6&&!transit.notified){
   transit.notified=true;transferStatus.textContent='Galaxy chart unavailable. Abort to return to '+vesselName(plan.origin)+'.';
  }
  return;
 }
 const short=window.RiftShortFlight;
 const d=short?.distance(from.stream?.chart?.sample?.(),transit.targetChart?.sample?.())??null;
 if(d===null||d>short.maxRange){
  transit.waiting+=dt;
  if(d!==null||transit.waiting>=7){
   closeGalaxyTransfer();from.transfer=null;
   from.transferNotice=d===null?'No live carrier signal. Transfer canceled.':'Destination outside short-flight range. Transfer canceled.';
   syncArrivalControls();liveFocus();
  }
  return;
 }
 transferStatus.textContent=vesselName(plan.origin)+' → '+vesselName(plan.target);
 transit.elapsed=Math.min(transferSeconds,transit.elapsed+dt);
 transferChart.contentWindow?.postMessage({type:'rift-fighter-transit',from:plan.origin,to:plan.target,progress:transit.elapsed/transferSeconds},window.location.origin);
 if(transit.elapsed<transferSeconds)return;
 closeGalaxyTransfer();
 from.stream?.chart?.close?.();
 const vessel=plan.target==='bifrost'?bifrostCapital:pegasusCapital;
 // The chart covers the passage; the fighter resumes well aft of the target.
 // Keep the same player object / loadout, fuel, damage and simulation state.
 p.dockingClearance=false;p.dockQueuedUntil=0;
 launchCapitalTest(vessel,true,{...plan,arrived:true,captured:false,distance:from.distance});
 p.x=clamp(capitalShip.x-210,arena.left+60,arena.right-60);
 p.y=clamp(capitalShip.y+560,arena.top+80,arena.bottom-80);
 p.prevX=p.x;p.prevY=p.y;p.vx=0;p.vy=0;
 clearInput();snapAim(-Math.PI/2);p.mainMomentum=p.mainThrustActive=false;
 syncArrivalControls();liveFocus();
}
function needsParkingCommit(ship){
 return !!(ship.transfer?.arrived||ship.pilotLanded&&flightMode.id==='free-flight'&&managedBuild&&!flightMode.loaner);
}
function validParkingCommit(ship,id,generation){
 const plan=ship.transfer,target=currentCapitalId(ship);
 return transferAvailable()&&ship===capitalShip&&ship.phase==='storing'&&ship.pilotLanded&&
  currentCharacterGeneration()===generation&&currentFlightHullId()===id&&readHullRaw(id)===flightHullRaw&&
  (id===starterHullId||ownsExtraHull(id))&&
  (plan?plan.arrived&&plan.captured&&plan.id===id&&plan.generation===generation&&plan.target===target&&
    fighterParkedVessel(id)===plan.origin&&readParking(id)===plan.raw:fighterParkedVessel(id)===target);
}
function commitFighterParking(ship){
 const id=flightHullId,generation=flightGeneration,target=currentCapitalId(ship),plan=ship.transfer;
 const commit={status:'pending'};ship.parkingCommit=commit;
 if(!parkingAPI?.save||!validParkingCommit(ship,id,generation)){commit.status='failed';return;}
 Promise.resolve().then(()=>{
  if(validParkingCommit(ship,id,generation))return parkingAPI.save(id,target,{expectedVessel:plan?.origin??target,expectedRevision:plan?.revision??ship.parkingRevision});
 }).then(result=>{
  if(result?.status!=='ok'||result.parking?.vessel!==target||![1,2,4,6].includes(result.parking?.bay)||
    !Number.isSafeInteger(result.parking?.revision)||result.parking.revision<1||
    currentCharacterGeneration()!==generation||currentFlightHullId()!==id||capitalShip!==ship){
   commit.status='failed';return;
  }
  commit.status='saved';commit.bay=result.parking.bay;
  if(plan){
   ship.transfer=null;
   flightMode=target==='bifrost'?bifrostFreeFlight:atPegasus(freeFlight);
  }
 },()=>{commit.status='failed';});
}
async function loadCapitalIdentity(ship){
 if(typeof window.fetch!=='function')return;
 const origin=window.location?.hostname==='rift-runner.boundlessghost16.chatgpt.site'?'https://rift-runner.gambizt3.workers.dev':'';
 try{
  const res=await window.fetch(origin+'/api/multicrew/vessels/bifrost',{cache:'no-store',credentials:'omit',redirect:'error'});
  if(!res.ok)return;
  const record=await res.json(),entry=record?.vessel,name=entry?.name;
  if(ship!==capitalShip||record?.version!==1||record.access!=='guest'||entry?.id!==ship.vessel.id||
    typeof name!=='string'||!name||name.length>80||name.trim()!==name)return;
  ship.name=name;updateCapitalHud();updateDuelReadout();
 }catch{}
}
const escortCourse={x:480,y:245,halfRun:275,radius:190,width:70,height:120};
const escortSections=[[0,-.32,23],[0,0,34],[0,.31,25]],escortSlot={x:112,y:31};
let escortShip=null;
function escortPoint(x=escortSlot.x,y=escortSlot.y){
 return berthWorld(escortShip,x,y);
}
function escortVelocity(x=escortSlot.x,y=escortSlot.y){
 const point=berthWorld(capitalCoursePose(escortShip.distance+.1,escortCourse),x,y);
 const from=berthWorld(capitalCoursePose(escortShip.distance-.1,escortCourse),x,y);
 return {x:(point.x-from.x)*escortShip.speed/0.2,y:(point.y-from.y)*escortShip.speed/0.2};
}
function launchEscort(){
 escortShip={distance:0,speed:Math.min(52,p.speed*.45),following:true,detour:0,
  hull:escortSections.map(([, ,r])=>({capitalHull:true,r,invMass:0,spin:0}))};
 advanceCourseShip(escortShip,escortCourse,escortSections,0);cones=[];
 const point=escortPoint(),v=escortVelocity();Object.assign(p,point,{vx:v.x,vy:v.y});
 snapAim(escortShip.aim);
}
function escortPathClear(x,y){
 return escortShip.hull.every(body=>{
  const rx=p.x-body.x,ry=p.y-body.y,dx=x-p.x,dy=y-p.y,r=body.r+p.r+9;
  if(rx*rx+ry*ry<=r*r&&rx*dx+ry*dy>0)return true;
  return sweptCircle(rx,ry,dx,dy,r)===null;
 });
}
function escortAssistVelocity(manual){
 const ship=escortShip;if(!ship)return null;
 if(manual){ship.following=false;ship.detour=0;ship.detourAcross=false;return null;}
 if(!ship.following)return null;
 let target=escortPoint(),vx,vy;
 const local=berthLocal(ship,p.x,p.y);
 if(ship.detour&&local.x>=70)ship.detour=0;
 if(ship.detour||!escortPathClear(target.x,target.y)){
  // Opposite flank: take two staggered waypoints around the near end.
  if(!ship.detour)ship.detour=local.y<0?-1:1;
  const end=ship.detour;
  if(end*local.y>=107)ship.detourAcross=true;
  if(end*local.y<100)ship.detourAcross=false;
  const side=ship.detourAcross?112:local.x<0?-95:95,margin=127*end;
  target=escortPoint(side,margin);
  if(!escortPathClear(target.x,target.y))return {x:0,y:0};
  ({x:vx,y:vy}=escortVelocity(side,margin));
 }else{
  ship.detourAcross=false;
  ({x:vx,y:vy}=escortVelocity());
 }
 vx+=(target.x-p.x)*1.65;vy+=(target.y-p.y)*1.65;
 const speed=Math.hypot(vx,vy),cap=Math.min(142,p.speed*.88);
 if(speed>cap){vx*=cap/speed;vy*=cap/speed;}
 if(!escortPathClear(p.x+vx*.52,p.y+vy*.52))return {x:0,y:0};
 return {x:vx,y:vy};
}
function updateEscortHud(){
 if(!escortHud)return;
 escortHud.hidden=!escortShip;
 if(!escortShip)return;
 const on=escortShip.following,target=escortPoint(),v=escortVelocity();
 const gap=Math.hypot(target.x-p.x,target.y-p.y),tracked=gap<19&&Math.hypot(p.vx-v.x,p.vy-v.y)<16;
 const text='Orion · '+(on?(tracked?'In formation':'Rejoining · '+Math.round(gap)+' u'):'Free flight · Slot '+Math.round(gap)+' u');
 escortHud.dataset.mode=on?(tracked?'formation':'rejoining'):'free';
 if(escortStatus.textContent!==text)escortStatus.textContent=text;
 const label=on?'Break away':'Rejoin';
 if(escortAction.textContent!==label)escortAction.textContent=label;
 escortAction.disabled=state!=='play';
}
escortAction?.addEventListener('click',event=>{
 if(!escortShip||event.isTrusted!==true||state!=='play'||routeParked||document.hidden||hangarDialog?.open)return;
 escortShip.following=!escortShip.following;escortShip.detour=0;escortShip.detourAcross=false;updateEscortHud();
 liveFocus();unlockAudio(undefined,event);
});
let returnFlightToCarrier=false;
let state='menu',p,playerIngress=null,missionDeparture=null,elapsed=0,last=0,shake=0,frame=0,movePtr=null,thrustPtr=null,moveKey=null,movePulse=null,heldMove=null,aimPtr=null,scale=1,viewW=1,viewH=1,hiDpi=1,frameW=VIEW_W,frameH=VIEW_H;
const refreshSoundActivation=window.RiftSoundActivation?.({
 needed:()=>soundOn&&!routeParked&&!transferTransit&&state!=='watch'&&audio?.state!=='running'&&
  !!(window.AudioContext||window.webkitAudioContext),
 host:()=>hangarDialog?.open?hangarDialog:document.querySelector('dialog[open]')??document.body,
 skip:target=>!!(target?.closest?.('a[href], #sound-on, #test-sound, #test-engine, #test-phone-audio')||target?.closest?.('label')?.querySelector?.('#sound-on')),
 start:event=>unlockAudio(refreshHangarEngineAudio,event)
});
let shots=[],cones=[],sparks=[],rings=[],clashBursts=[],recoil=0,practiceHits=0,practiceShots=0,hudKey='',hudNumbers=null;
let duelEnabled=false,vanduls=[],vandulIngress=null,vandulLasers=[],duelClock=0,duelCountdown=0,duelResult=null,vandulSprite=null;
const duelCountdownSeconds=3;
let formationEscorts=[],wingman=null,testLead=null,testPlayerSlot=null,testLeadGuide=null,wingmanKills=0,wingmanOrder='formation';
let testThrustHeld=0,testThrustLatched=false;
const wingmanFormations=Object.freeze({
 // Mission north is negative world y. Even the lead slot starts outside
 // the map: the southern spawn buffer is 73 and the wingman radius is 12.
 'front-left':Object.freeze({entryX:-30,entryY:-36,followX:-54,followY:-54,bottomY:54}),
 front:Object.freeze({entryX:0,entryY:-56,followX:0,followY:-76,bottomY:76}),
 'front-right':Object.freeze({entryX:30,entryY:-36,followX:54,followY:-54,bottomY:54}),
 'side-left':Object.freeze({entryX:-30,entryY:0,followX:-70,followY:0,bottomY:0}),
 'echelon-right':Object.freeze({entryX:30,entryY:36,followX:54,followY:54,bottomY:52}),
 'echelon-left':Object.freeze({entryX:-30,entryY:36,followX:-54,followY:54,bottomY:52}),
 trail:Object.freeze({entryX:0,entryY:56,followX:0,followY:76,bottomY:72}),
 'line-abreast':Object.freeze({entryX:30,entryY:0,followX:70,followY:0,bottomY:0})
});
const formationRoom=document.getElementById('hangar-formation-room'),formationButton=document.getElementById('hangar-formation-button');
let formationStage='',formationTimers=[];
function showHangarFormation(stage){
 formationStage=stage;
 if(playerHangarView)playerHangarView.dataset.formation=stage;
 const ready=stage==='ready',moving=!!stage&&!ready;
 if(hangarBoard&&!hangarBoard.hidden)hangarBoard.disabled=moving||state!=='menu'||!readBuildWallet()||!!boarding;
 if(!stage||stage==='ready'||stage==='settle'||stage==='lower'){
  if(hangarFormationEngine){hangarFormationEngine=null;updateThruster();}
 }
 if(!ready)closeFormationPad(false);
 if(formationRoom)formationRoom.inert=!ready;
 if(ready)void refreshFormationRoster();
 if(corsairWingPanel)corsairWingPanel.hidden=!ready;
 if(formationButton){
  formationButton.disabled=moving;
  formationButton.setAttribute('aria-expanded',String(ready));
  const label=formationButton.querySelector?.('strong');
  if(label)label.textContent=moving?'Moving through hangar…':ready?'Back to Landing Pads':'Wingman Formation';
 }
}
function clearHangarFormationTimers(){
 for(const timer of formationTimers)window.clearTimeout(timer);
 formationTimers=[];
}
function resetHangarFormation(){
 clearHangarFormationTimers();
 showHangarFormation('');
}
function startHangarFormationEngine(event){
 if(!event?.isTrusted||!soundOn||document.hidden)return;
 const run=hangarFormationEngine={at:audioClock(),ready:false};
 const ready=()=>{
  if(hangarFormationEngine!==run||document.hidden||!hangarDialog?.open||!soundOn)return;
  run.ready=true;updateThruster();
 };
 if(audio?.state==='running'&&master)ready();else unlockAudio(ready,event);
}
function moveHangarFormation(out,event){
 const bay=[repairedBay,damagedBay].find(panel=>panel&&!panel.hidden);
 if(!bay||!formationRoom||!formationButton)return;
 clearHangarFormationTimers();
 const later=(ms,stage)=>formationTimers.push(window.setTimeout(()=>showHangarFormation(stage),ms));
 if(out){
  cancelHangarPress();setCanopy(false);
  const camera=bay.querySelector?.('.hangar-camera');
  if(camera&&formationRoom.parentNode!==camera)camera.prepend(formationRoom);
  bay.scrollIntoView?.({block:'nearest',behavior:'instant'});
  if(motion?.matches){showHangarFormation('ready');return;}
  showHangarFormation('spool');
  startHangarFormationEngine(event);
  later(320,'lift');
  later(840,'turn');
  later(1450,'align');
  later(2470,'out');
  later(5030,'arrival-turn');
  later(6150,'settle');
  later(6750,'touchdown');
  later(7250,'ready');
 }else if(motion?.matches)resetHangarFormation();
 else{
  // Reverse through the same clear centre lane before sliding onto the berth.
  showHangarFormation('return-spool');
  startHangarFormationEngine(event);
  later(320,'return-lift');
  later(960,'back');
  later(3520,'park');
  later(4540,'lower');
  later(4960,'');
 }
}
formationButton?.addEventListener('click',event=>{
 if(event.isTrusted!==true||!hangarDialog?.open||document.hidden||boarding||cockpitSession||formationButton.hidden||formationButton.disabled)return;
 moveHangarFormation(formationStage!=='ready',event);
});
const corsairWingKey='rift-runner.corsair-wing.v1';
const wingCarrier=id=>id==='rift-carrier'||id==='bifrost';
const wingSettingKey=id=>id==='bifrost'?corsairWingKey+'.bifrost':corsairWingKey;
function carrierWingSetting(vessel='rift-carrier'){
 if(!wingCarrier(vessel))return null;
 try{
  const data=JSON.parse(window.localStorage.getItem(wingSettingKey(vessel))),generation=currentCharacterGeneration();
  return generation!==undefined&&data?.generation===generation?data:null;
 }catch{return null;}
}
const corsairWingEnabled=(vessel='rift-carrier')=>carrierWingSetting(vessel)?.enabled===true;
const formationSlots=Object.keys(wingmanFormations),formationGrid=[
 'front-left',null,'front-right','side-left','front','line-abreast','echelon-left','trail','echelon-right'];
const formationPads=new Map(formationSlots.map(slot=>[slot,document.getElementById('wing-pad-'+slot)]));
const formationAdd=document.getElementById('formation-add-wing'),formationPicker=document.getElementById('formation-pad-picker');
const formationPilot=document.getElementById('formation-pilot'),formationFighter=document.getElementById('formation-fighter');
const formationAssign=document.getElementById('formation-pad-assign'),formationRemove=document.getElementById('formation-pad-remove');
const formationPadNote=document.getElementById('formation-pad-note');
let formationPad=null,formationArmed=false,formationRoster=null;
function savedWingPads(vessel=hangarVessel){
 const data=carrierWingSetting(vessel);
 if(!data?.enabled)return [];
 const legacy=data.pad??(vessel==='rift-carrier'?window.RiftMissions?.getSquadronFormation?.():null)??'echelon-right';
 return [...new Set(Array.isArray(data.slots)?data.slots:[legacy])].filter(slot=>formationGrid.includes(slot)&&slot!==null);
}
const wingTestHulls=['rift-fighter','bastion-9','stocky-light-fighter','civilian-freighter'];
function savedWingHull(pad,vessel=hangarVessel){
 const id=carrierWingSetting(vessel)?.hulls?.[pad];
 return wingTestHulls.includes(id)?id:'rift-fighter';
}
const selectedWingPad=(vessel=hangarVessel)=>savedWingPads(vessel)[0]??'echelon-right';
function formationHint(text){
 if(corsairWingStatus){corsairWingStatus.textContent=text;corsairWingStatus.hidden=!text;}
}
function closeFormationPad(refocus=false){
 const pad=formationPads.get(formationPad);
 formationPad=null;formationArmed=false;
 if(formationPicker)formationPicker.hidden=true;
 formationAdd?.setAttribute('aria-pressed','false');
 if(formationRoom)formationRoom.dataset.pickPad='false';
 formationHint('');
 if(refocus)pad?.focus?.({preventScroll:true});
}
function rosterAllowsFormation(count=1,riftCount=count){
 return formationRoster?.vessel===hangarVessel&&formationRoster.ok&&
  Date.now()-formationRoster.at<=20000&&formationRoster.fighters>=riftCount&&formationRoster.pilots>=count;
}
function canAssignWingHull(id,pad){
 const rest=savedWingPads().filter(slot=>slot!==pad).map(slot=>savedWingHull(slot));
 return wingTestHulls.includes(id)&&!!hangarDisplayHull(id)&&
  (id!=='civilian-freighter'||hangarVessel==='rift-carrier'&&rest.filter(hull=>hull===id).length<5)&&
  rosterAllowsFormation(rest.length+1,rest.filter(hull=>hull==='rift-fighter').length+(id==='rift-fighter'?1:0));
}
function updatePadChooser(){
 if(!formationPad||!formationPicker)return;
 const planned=savedWingPads(),occupied=planned.includes(formationPad);
 const supported=wingCarrier(hangarVessel);
 const ready=supported&&canAssignWingHull(formationFighter?.value,formationPad);
 if(formationFighter?.options)for(const option of formationFighter.options)option.disabled=!supported||!canAssignWingHull(option.value,formationPad);
 if(formationPilot){
  formationPilot.disabled=!ready;
  const record=formationRoster?.vessel===hangarVessel?formationRoster:null;

  const remaining=record?.ok&&Date.now()-record.at<=20000?Math.max(0,record.pilots-planned.length)+' left':record?.pending?'checking…':'count unavailable';
  if(formationPilot.options?.[0])formationPilot.options[0].textContent='Basic NPC - ('+remaining+')';
 }
 if(formationFighter)formationFighter.disabled=!supported||!formationRoster?.ok;
 if(formationAssign)formationAssign.disabled=!ready;
 if(formationRemove)formationRemove.hidden=!(supported&&occupied);
 if(formationPadNote)formationPadNote.textContent=!supported?'No carrier wing dispatch here.':
  formationRoster?.pending?'Checking carrier readiness…':!formationRoster?.ok?'Carrier readiness unavailable. Try reopening this pad.':
  ready?(hangarDisplayHull(formationFighter.value)?.name??'Fighter')+' · Free Flight test only.':!formationRoster.fighters&&formationFighter?.value==='rift-fighter'?'No launch-ready Rift-3s on this carrier.':'No spare ready pilots or selected hulls for this pad.';
}
async function refreshFormationRoster(){
 const vessel=hangarVessel;
 if(!vessel||typeof window.fetch!=='function')return;
 if(formationRoster?.vessel===vessel&&(formationRoster.pending||formationRoster.ok&&Date.now()-formationRoster.at<10000))return formationRoster.done;
 const record=formationRoster={vessel,pending:true,ok:false,at:Date.now()};
 updatePadChooser();
 record.done=(async()=>{
 try{
  const mirror=window.location?.hostname==='rift-runner.boundlessghost16.chatgpt.site';
  const reply=await window.fetch((mirror?'https://rift-runner.gambizt3.workers.dev':'')+'/api/multicrew/vessels/'+encodeURIComponent(vessel)+'/stats',
   {method:'GET',credentials:'omit',cache:'no-store',redirect:'error',signal:window.AbortSignal?.timeout?.(5000)});
  const body=reply.ok?await reply.json():null,ready=body?.armada?.launchReady;
  if(body?.version===1&&body.vesselId===vessel&&ready&&
   [ready.fighters,ready.availableNpcPilots].every(n=>Number.isSafeInteger(n)&&n>=0)){
   Object.assign(record,{ok:true,fighters:ready.fighters,pilots:ready.availableNpcPilots});
  }
 }catch{}
 record.pending=false;record.at=Date.now();
 if(formationRoster===record)updatePadChooser();
 })();
 return record.done;
}
function syncCorsairWingSetup(repaired){
 if(!corsairWingPanel)return;
 const pegasus=hangarVessel==='rift-carrier';
 const available=repaired&&!hangarTryHull&&!boarding&&!cockpitSession&&!aboardGuestHangar()&&state==='menu';
 const boardingInHall=formationStage==='ready'&&(boarding?.fromFormation||cockpitSession?.fromFormation);
 if(!available&&formationStage&&!boardingInHall)resetHangarFormation();
 if(formationButton)formationButton.hidden=!available;
 if(!available)return;
 const selected=savedWingPads();
 const title=document.getElementById('formation-room-title');
 if(title)title.textContent=(pegasus?'PEGASUS':'BIFROST')+' · FORMATION BAY';
 const summary=document.getElementById('corsair-wing-summary');
 if(summary)summary.textContent=selected.length?selected.length+' wingmen · Free Flight test':'Solo';
 for(const [slot,pad] of formationPads)if(pad){
  const occupied=selected.includes(slot),art=pad.querySelector?.('img'),hull=occupied?savedWingHull(slot):'';
  pad.dataset.hull=hull;
  pad.setAttribute('aria-pressed',String(occupied));
  if(art){
   art.hidden=!occupied;
   if(occupied){const src=hangarDisplayHull(hull)?.art??'./fighter-winged.png?v=23';if(art.getAttribute('src')!==src)art.setAttribute('src',src);}
  }
 }
}
const formationCanPick=event=>event.isTrusted===true&&formationStage==='ready'&&hangarDialog?.open&&!document.hidden&&!boarding&&!cockpitSession;
formationAdd?.addEventListener('click',event=>{
 if(!formationCanPick(event))return;
 if(formationArmed&&!formationPad){closeFormationPad();formationHint('');return;}
 closeFormationPad();formationArmed=true;
 formationAdd.setAttribute('aria-pressed','true');
 if(formationRoom)formationRoom.dataset.pickPad='true';
 formationHint('Tap a formation pad.');
 formationRoom?.scrollIntoView?.({block:'nearest'});
 void refreshFormationRoster();
});
for(const [slot,pad] of formationPads)pad?.addEventListener('click',event=>{
 if(!formationCanPick(event)||!formationPicker)return;
 if(!formationArmed&&pad.getAttribute('aria-pressed')!=='true')return;
 formationPad=slot;
 formationArmed=false;
 formationAdd?.setAttribute('aria-pressed','false');
 if(formationRoom)formationRoom.dataset.pickPad='false';
 formationHint('');
 const i=formationGrid.indexOf(slot),top=i<3?'26%':i<6?'50%':'73%';
 formationPicker.style.setProperty('--picker-x',['31%','50%','69%'][i%3]);
 formationPicker.style.setProperty('--picker-y',top);
 formationPicker.setAttribute('data-pad',slot);
 document.getElementById('formation-pad-title').textContent=pad.getAttribute('aria-label');
 if(formationPilot)formationPilot.value='basic';
 if(formationFighter)formationFighter.value=savedWingHull(slot);
 formationPicker.hidden=false;
 void refreshFormationRoster();updatePadChooser();
});
document.getElementById('formation-pad-close')?.addEventListener('click',event=>{
 if(formationCanPick(event))closeFormationPad(true);
});
formationFighter?.addEventListener('change',updatePadChooser);
function storeFormationWing(enabled,pad=selectedWingPad(),hull='rift-fighter'){
 const generation=currentCharacterGeneration();
 if(generation===undefined)return false;
 try{
  const existing=savedWingPads(),slots=enabled?[...new Set([...existing,pad])]:existing.filter(slot=>slot!==pad);
  const hulls=Object.fromEntries(slots.map(slot=>[slot,slot===pad?hull:savedWingHull(slot)]));
  const data=JSON.stringify({generation,enabled:!!slots.length,pad:slots[0]??pad,slots,...(slots.length?{pilot:'basic',fighter:hulls[slots[0]],hulls}:{})});
  const key=wingSettingKey(hangarVessel),previous=window.localStorage.getItem(key);
  window.localStorage.setItem(key,data);
  if(window.localStorage.getItem(key)!==data||currentCharacterGeneration()!==generation)return false;
  if(hangarVessel==='rift-carrier'&&slots.length&&slots[0]!==existing[0]&&
     !window.RiftMissions?.setSquadronFormation?.(slots[0],generation)){
   if(previous===null)window.localStorage.removeItem(key);else window.localStorage.setItem(key,previous);
   return false;
  }
  return true;
 }catch{return false;}
}
formationAssign?.addEventListener('click',event=>{
 const hull=formationFighter?.value;
 if(!formationCanPick(event)||!formationPad||!wingCarrier(hangarVessel)||!canAssignWingHull(hull,formationPad)||
    formationPilot?.value!=='basic')return;
 if(!storeFormationWing(true,formationPad,hull)){formationHint('Could not save the wingman.');return;}
 closeFormationPad(true);
 syncCorsairWingSetup(true);
});
formationRemove?.addEventListener('click',event=>{
 if(!formationCanPick(event)||!wingCarrier(hangarVessel)||!formationPad||
    !savedWingPads().includes(formationPad))return;
 if(!storeFormationWing(false,formationPad)){formationHint('Could not remove the wingman.');return;}
 closeFormationPad(true);syncCorsairWingSetup(true);
});
function wingmanFormation(){
 try{
  const id=window.RiftMissions?.getSquadronFormation?.();
  if(typeof id==='string'&&Object.hasOwn(wingmanFormations,id))return wingmanFormations[id];
 }catch{/* A blocked board preference keeps the original formation. */}
 return wingmanFormations['echelon-right'];
}
function squadronTestLayout(){
 const fallback={player:'echelon-left',wingman:'echelon-right'};
 try{
  const saved=window.RiftMissions?.getSquadronTestLayout?.();
  if(saved&&Object.hasOwn(wingmanFormations,saved.player)&&Object.hasOwn(wingmanFormations,saved.wingman)&&
   saved.player!==saved.wingman)return saved;
 }catch{/* Fall back to two distinct tiles around the AI lead. */}
 return fallback;
}
function alliedFighterFit(){
 const weapons=[fighterLoadout.weapon,fighterFit.primary,fighterFit.secondary].filter((id,i,list)=>
  Object.hasOwn(guns,id)&&list.indexOf(id)===i&&(id===fighterFit.primary||id===fighterFit.secondary));
 return {hull:fighterLoadout.fighter,weight:p.weight,r:p.r,maxHp:fittedFighter().hullHp,invMass:p.invMass,speed:p.speed,recoilFactor:p.recoilFactor,
  weapons,sparrowSides:sparrowSides(fighterFit),preferredBurst:Object.fromEntries(weapons.map(id=>[id,!!burstModes[id]])),
  he3Capacity:fittedBattery()?.capacityHe3??0,he3Rate:fittedGenerator()?.he3PerSecond??0};
}
function makeAlliedFighter(x,y,formation,role,displayName,fit=alliedFighterFit()){
 return {x,y,prevX:x,prevY:y,formation,role,displayName,allyShip:true,fit,r:fit.r,turnMultiplier:fit.turnMultiplier??p.turnMultiplier,aim:-Math.PI/2,vx:0,vy:0,
  hp:fit.maxHp,maxHp:fit.maxHp,invMass:fit.invMass,spin:0,wallFx:0,hitGlow:0,fireWait:role==='lead'?.57:.35,
  he3:0,heat:0,coolAt:0,normalIndex:0,normalGroup:0,normalWeapon:null,volley:null,muzzleLight:0,
  loosePoint:null,looseContact:null,looseWait:0,formationBypass:null,formationClearFor:0};
}
const canCommandWingman=()=>!isCrossBattleArena()&&state==='play'&&!document.hidden&&!routeParked&&!hangarDialog?.open&&p?.hp>0&&
 livingAllies().length>0;
function syncWingmanCommands(){
 const button=wingmanFormationButton;
 if(!button)return;
 const available=canCommandWingman();
 if(button.hidden===available)button.hidden=!available;
 if(button.disabled===available)button.disabled=!available;
 const pressed=String(wingmanOrder==='formation');
 if(button.getAttribute('aria-pressed')!==pressed)button.setAttribute('aria-pressed',pressed);
}
function updateTestLeadGuide(){
 if(!testLeadGuide)return;
 testLeadGuide.x=p.x-testPlayerSlot.entryX*1.8;
 testLeadGuide.y=p.y-testPlayerSlot.entryY;
}
function setWingmanOrder(command){
 if(wingmanOrder===command)return;
 wingmanOrder=command;
 if(command==='formation'&&testLeadGuide){
  updateTestLeadGuide();testLeadGuide.idle=0;testLeadGuide.scouting=false;testLeadGuide.bypassX=testLeadGuide.bypassAtY=null;
  // If Formation was explicitly chosen during a held boost, the stick
  // release must start a new hold before it can switch to Loose again.
  testThrustLatched=holdsMainThrust();
 }
 for(const ship of livingAllies()){
  ship.loosePoint=ship.looseContact=null;ship.looseWait=0;
  ship.formationBypass=null;ship.formationClearFor=0;
 }
 syncWingmanCommands();
}
wingmanFormationButton?.addEventListener('pointerdown',event=>event.stopPropagation());
wingmanFormationButton?.addEventListener('click',event=>{
 event.stopPropagation();
 if(event.isTrusted===true&&canCommandWingman())setWingmanOrder(wingmanOrder==='formation'?'loose':'formation');
});
let duelKills=0,sortieCredits=0,duelWave=1,waveAdmitted=0,waveCountdownFresh=false,entrySpacing=0,waveEntryLanes=[];
// Training is one battlefield, not the official six-wave progression.
const trainingAlertRange=370,northWingmanExtension=400,northTrainingExtension=4080;
const trainingPatrols=[
 {x:470,y:770,offsets:[[-114,0],[123,12]]},
 {x:466,y:-1045,offsets:[[0,-55],[-95,11],[95,11],[0,89]]},
 {x:500,y:-3600,offsets:[[0,-55],[-95,11],[95,11],[0,89]]}
];
const trainingPosts=trainingPatrols.flatMap((patrol,group)=>patrol.offsets.map(([ox,oy])=>
 ({x:patrol.x+ox,y:patrol.y+oy,ox,oy,group})));
const trainingCoverBands=[[-680,-60],[-2080,-1320],[-3270,-2480],[-3910,-3370]];
const waveSize=()=>isTileBattle()?3:isWingmanTest()?trainingPosts.length:duelWave>=6?3:duelWave>=4?2:1;
const waitingVanduls=()=>waveSize()-waveAdmitted;
const vandulEntry={get aboveY(){return floorNorth()-36;},finishY:840,speed:155,transitSpeed:780,slowAt:650,slowDistance:140,engageRange:305,
 lanes:[480,424,536,344,616,298,662,384,576,240,720,168,792,96,864]};
let asteroidCover=true,asteroids=[],sceneryDebris=[],asteroidAtlas=null;
let wreckage=null,wreckSprite=null,activeWrecks=[],archivedWrecks=[],wreckLayer=null,wreckLayerContext=null;
let archivedFallbackLimited=false;
const physicalWreckLimit=3,archivedFallbackLimit=64;
const asteroidImpulse={laser:{linear:.20,spin:.30},ballistic:{linear:1.30,spin:1}};
const asteroidProfiles=[
 {id:'crater',tile:0,r:27,mass:8,drawSize:86},
 {id:'shard',tile:1,r:30,mass:12,drawSize:96},
 {id:'split',tile:2,r:36,mass:18,drawSize:108}
];
const vandulLoadout={hull:'crescent-hull',engine:'vandul-drive',core:'vandul-core',primary:'twinbeam',secondary:null,shield:null};
const vandulModules={
 hulls:{'crescent-hull':{hullHp:20,radius:20,weight:65}},
 engines:{'vandul-drive':{weight:20,speed:63,acceleration:150,
  driveBy:{windup:.54,topSpeed:190,acceleration:580,recoveryAcceleration:320,runLimit:2.55,pullback:1.26,minGap:66}}},
 cores:{'vandul-core':{weight:8}},
 lasers:{twinbeam:{name:'Vandul Twinbeam',weight:7,kind:'energy',damage:2,speed:335,push:.26,pushMax:106,baseSpread:1.5,burstGap:.14,recovery:.88,grace:.95,windup:.26,life:2.25,coverPush:91}}
};
const vandulHull=vandulModules.hulls[vandulLoadout.hull],vandulEngine=vandulModules.engines[vandulLoadout.engine],
 vandulCore=vandulModules.cores[vandulLoadout.core],vandulLaser=vandulModules.lasers[vandulLoadout.primary];
const vandulReferenceWeight=100;
const vandulProfile={
 hullHp:vandulHull.hullHp,radius:vandulHull.radius,speed:vandulEngine.speed,acceleration:vandulEngine.acceleration,
 driveBy:vandulEngine.driveBy,laser:vandulLaser,
 get hullWeight(){return vandulHull.weight;},
 get weight(){return this.hullWeight+vandulEngine.weight+vandulCore.weight+vandulLaser.weight;},
 get invMass(){return vandulReferenceWeight/this.weight;}
};
const vandulHeat={max:100,shot:17.5,rest:.30,rate:18,resume:45,ventAt:62};
const vandulContactSeconds=1.5,vandulSearchSeconds=3,vandulStackSeconds=.5,laserPattern=[1,-1,.5,-.5,0],driveByRules=vandulProfile.driveBy;
let ballisticHold=null,firePointer=null,skipFireClickUntil=-Infinity;
const kick=amount=>{shake=Math.max(shake,amount);};
const keys=new Set();
const has=(...a)=>a.some(k=>keys.has(k));
const trail=['#68ffe0','#97f5f3','#c6e0ff'];
const noVanduls=Object.freeze([]);
function activeVanduls(){return duelResult?noVanduls:vanduls;}
function ingressBlockers(){return [p,...livingAllies(),...vanduls,...asteroids,...sceneryDebris,...cones,...activeWrecks.flatMap(w=>w.bodies)];}
const coverIngressLanes=[298,480,720],sidePassage=91;
function coverRandom(seed){
 return ()=>{seed=(Math.imul(1664525,seed)+1013904223)>>>0;return seed/4294967296;};
}
function buildDuelCover(occupied,random,squadron=false,extraBands=[],northRockBand=null){
 const rocks=[],scrap=[],taken=occupied.filter(Boolean),lerp=(lo,hi)=>lo+(hi-lo)*random();
 const place=(r,gap,band)=>{
  const left=arena.left+sidePassage+r,right=arena.right-sidePassage-r;
  const top=(band?.[0]??edge+H*.38)+r,bottom=(band?.[1]??arena.bottom-H*.12)-r;
  const fits=(x,y)=>{
   // Keep side passages full-length and three roomier northern admission
   // lanes open; keep the player apron clear even when re-enabling cover.
   if(Math.hypot(x-launch.x,y-launch.y)<r+(squadron?106:69))return false;
   if(y+r+28>=launch.y&&Math.abs(x-launch.x)<r+(squadron?75:43))return false;
   if(y-r-28<=vandulEntry.finishY&&coverIngressLanes.some(lane=>Math.abs(x-lane)<r+vandulProfile.radius+12))return false;
   return taken.every(body=>Math.hypot(x-body.x,y-body.y)>=r+body.r+(body.craft?36:gap));
  };
  for(let attempt=0;attempt<42;attempt++){
   const x=lerp(left,right),y=lerp(top,bottom);
   if(fits(x,y))return {x,y};
  }
  // A crowded re-enable may reject a body. Never use an unchecked fallback.
  for(let y=top;y<=bottom;y+=73)for(let x=left;x<=right;x+=73)if(fits(x,y))return {x,y};
  return null;
 };
 const addRocks=(count,shift,band,largeRadius)=>{
  for(let i=0;i<count;i++){
   const base=asteroidProfiles[(i+shift)%asteroidProfiles.length];
   let scale=i===0&&largeRadius?largeRadius/base.r:lerp(.74,1.26),r=base.r*scale,pos=place(r,46,band);
   if(i===0&&!pos&&r>44){r=44;scale=r/base.r;pos=place(r,46,band);}
   if(!pos)continue;
   const profile={...base,r,drawSize:base.drawSize*scale,mass:base.mass*scale*scale,phase:lerp(-Math.PI,Math.PI)};
   const body={...pos,asteroid:true,profile,r,vx:0,vy:0,angle:profile.phase,spin:0,
    wallFx:0,hitGlow:0,invMass:1/profile.mass,rockSign:i%2===0?1:-1};
   rocks.push(body);taken.push(body);
  }
 };
 const addScrap=(count,band)=>{
  for(let i=0;i<count;i++){
   const r=lerp(7,13),pos=place(r,37,band);if(!pos)continue;
   const shape=Array.from({length:5},(_,j)=>{
    const a=j*TAU/5,reach=r*lerp(.70,1);
    return [Math.cos(a)*reach,Math.sin(a)*reach];
   });
   const body={...pos,debris:true,r,shape,vx:0,vy:0,angle:lerp(-Math.PI,Math.PI),spin:0,
    wallFx:0,hitGlow:0,invMass:lerp(.48,.87)};
   scrap.push(body);taken.push(body);
  }
 };
 const count=3+Math.floor(random()*5),shift=Math.floor(random()*asteroidProfiles.length);
 addRocks(count,shift,null,lerp(44,59));
 addScrap(3+Math.floor(random()*3));
 for(const [i,band] of extraBands.entries()){
  addRocks(2,shift+i,band);
  addScrap(1,band);
 }
 if(northRockBand){taken.push(...northRockBand.held);addRocks(3,shift+1,northRockBand.bounds);}
 return {rocks,scrap};
}
function tileArrivalPoint(edge,inset=72){
 return {
  x:edge==='west'?arena.left+inset:edge==='east'?arena.right-inset:(arena.left+arena.right)/2,
  y:edge==='north'?arena.top+inset:edge==='south'?arena.bottom-inset:(arena.top+arena.bottom)/2
 };
}
function crossPiratePatrolStarts(){
 return [[.21,305],[.39,390],[.245,530]].map(([fraction,north])=>({
  x:arena.left+(arena.right-arena.left)*fraction,y:arena.top+north}));
}
function northernCrossRockBand(){
 const held=[];
 const origins=new Set([flightMode.tileApproach?.entryEdge,flightMode.tileApproach?.bifrost?.entryEdge,'north'].filter(Boolean));
 for(const side of origins){
  const start=tileArrivalPoint(side),next=tileArrivalPoint(side,348);
  for(let n=0;n<=3;n++)held.push({x:start.x+(next.x-start.x)*n/3,y:start.y+(next.y-start.y)*n/3,r:90});
 }
 if(flightMode.crossBattle)for(const start of crossPiratePatrolStarts())held.push({...start,r:108});
 else for(const [x,y] of [[480,(arena.top+arena.bottom)/2],[695,(arena.top+arena.bottom)/2-390],[265,(arena.top+arena.bottom)/2+370]])held.push({x,y,r:104});
 return {bounds:[arena.top+64,arena.top+286],held};
}
function resetAsteroids(){
 asteroids=[];sceneryDebris=[];if(fighterBattle){if(asteroidCover)asteroids=makeFighterAsteroidBelt();return;}
 if(!duelEnabled||!asteroidCover)return;
 if(!asteroidAtlas&&typeof window.Image==='function'){
  asteroidAtlas=new window.Image();asteroidAtlas.src='./rift-asteroid-atlas.webp';
 }
 const training=isWingmanTest();
 const held=training&&!vanduls.length?trainingPosts.map(({x,y})=>({x,y,r:vandulProfile.radius})):[];
 if(isFourWayBattle())for(const edge of Object.keys(fourWayOrigins))held.push({...tileArrivalPoint(edge),r:108});
 else if(flightMode.tileApproach)held.push({...tileArrivalPoint(flightMode.tileApproach.entryEdge),r:108});
 // Keep the opening firing lane visible in the close Watch setup; cover
 // further from the encounter still influences both sides as they spread.
 if(isCrossWatch()){
  const heading=flightMode.tileApproach.heading,x=W*.5,y=(arena.top+arena.bottom)/2;
  const dx=Math.cos(heading),dy=Math.sin(heading);
  for(const [forward,side,r] of [[-145,0,135],[0,0,230],[145,0,165],[232,-224,175],[232,224,175]]){
   held.push({x:x+dx*forward-dy*side,y:y+dy*forward+dx*side,r});
  }
 }
 const {rocks,scrap}=buildDuelCover([...ingressBlockers(),...held],coverRandom(Math.floor(Math.random()*4294967296)>>>0),training,training?trainingCoverBands:[],
  flightMode.crossBattle||flightMode.pirateCapital?northernCrossRockBand():null);
 asteroids=rocks;sceneryDebris=scrap;
}
function resetDuel(countdown=duelEnabled&&!isWingmanTest()?duelCountdownSeconds:0){
 duelKills=0;sortieCredits=0;waveCountdownFresh=false;wreckage=null;activeWrecks=[];archivedWrecks=[];
 wreckLayer=null;wreckLayerContext=null;archivedFallbackLimited=false;
 if(vanduls.includes(autoLock))autoLock=null;
 vanduls=[];vandulIngress=null;vandulLasers=[];duelClock=0;duelResult=null;duelCountdown=countdown;
 duelWave=1;waveAdmitted=0;entrySpacing=0;waveEntryLanes=[];
 if(duelEnabled&&!vandulSprite&&typeof window.Image==='function'){
  vandulSprite=new window.Image();vandulSprite.src='./vandul-ship.webp';
 }
 resetAsteroids();updateDuelReadout();updateDuelCountdown();
}
function admitVandul(x,y,vx=0,vy=0,post=null,aim=Math.PI/2){
 const trainingGuard=!!post;
 if(!duelEnabled||!waitingVanduls()||duelResult||state!=='play'&&!trainingGuard||!p.hp)return;
 const {hullHp,radius,weight,invMass,laser}=vandulProfile,slot=++waveAdmitted;
 const seed=Math.floor(Math.random()*4294967296)>>>0;
 const ship={vandul:true,slot,x,y,r:radius,trainingGuard,post,vx,vy,angle:0,aim,spin:0,hitGlow:0,wallFx:0,invMass,weight,
  hp:hullHp,maxHp:hullHp,rockSign:1,stacks:[],bonus:0,nextLaser:duelClock+laser.grace,laserIndex:0,lastLaserBonus:null,laserBurst:null,
  heat:0,heatAt:duelClock,heatRest:duelClock,overheated:false,
  attackTarget:null,seesTarget:false,seesPlayer:false,thermalTracking:false,playerSightLostAt:null,lastSeen:null,laserLockLost:false,sightLostAt:null,searchPrediction:null,searchPath:null,flankedCover:null,searchSide:0,blindShot:null,blindAttempted:false,patrolAnchor:{x,y},patrolLeg:0,playerContact:null,
  driveSeed:slot===1?seed:(seed^Math.imul(slot,0x9e3779b9))>>>0,drive:null,orbitPhase:(slot-1)*2.1,laserPhase:(slot-1)*2};
 ship.nextDriveBy=duelClock+2.0+driveRandom(ship)*1.35;
 vanduls.push(ship);
 if(!trainingGuard){waveEntryLanes.push(x);vandulIngress=null;entrySpacing=.22;updateDuelReadout();updateDuelCountdown();}
}
function entrySegmentClear(x,y,toX,toY,occupied){
 const dx=toX-x,dy=toY-y,r=vandulProfile.radius;
 return occupied.every(body=>sweptCircle(x-body.x,y-body.y,dx,dy,r+body.r+8)===null);
}
function entryPathClear(x,y,lane,occupied){
 return entrySegmentClear(x,y,lane,y,occupied)&&entrySegmentClear(lane,y,lane,vandulEntry.finishY,occupied);
}
function beginVandulIngress(){
 const {aboveY,lanes}=vandulEntry,occupied=ingressBlockers();
 // Prefer a different safe lane behind earlier arrivals. Recheck dynamically on descent.
 const center=lanes[0],target=center+(waveAdmitted===1?-1:1)*142;
 const score=x=>Math.abs(x-target)+220*Number(waveEntryLanes.some(lane=>Math.abs(x-lane)<64));
 const preferred=waveAdmitted===0?lanes:[...lanes].sort((a,b)=>score(a)-score(b));
 const clear=preferred.find(x=>entryPathClear(x,aboveY,x,occupied));
 const x=clear??preferred[0];
 vandulIngress={x,y:aboveY,aim:Math.PI/2,angle:0,rockSign:1,hitGlow:0,lane:x,waiting:clear===undefined};
}
function advanceVandulIngress(dt){
 const entry=vandulIngress;if(!entry||dt<=0)return;
 const occupied=ingressBlockers();
 // Cross the rim with the entire hull before transitioning into live combat.
 // A close, unobstructed contact can cut the long transit short; without
 // one, continue the original safe lane and let normal combat search there.
 const inset=vandulProfile.radius+8;
 if(entry.y>=arena.top+inset&&entry.y<vandulEntry.finishY&&entry.x>=arena.left+inset&&entry.x<=arena.right-inset&&
  entrySegmentClear(entry.x,entry.y,entry.x,entry.y,occupied)){
  const blockers=visionBlockers();
  if(chooseVandulTarget(entry,blockers,!!p.hp&&playerCanSee(entry,blockers),vandulEntry.engageRange)){
   admitVandul(entry.x,entry.y,0,vandulProfile.speed*.78,null,entry.aim);
   return;
  }
 }
 if(!entryPathClear(entry.x,entry.y,entry.lane,occupied)){
  const clear=vandulEntry.lanes.filter(x=>entryPathClear(entry.x,entry.y,x,occupied))
   .sort((a,b)=>Math.abs(a-entry.x)-Math.abs(b-entry.x));
  if(!clear.length){entry.waiting=true;return;}
  entry.lane=clear[0];
 }
 entry.waiting=false;
 // Reroute across a clear level first, rather than crossing a newly
 // blocked lane on a long diagonal before the pass can reach its new column.
 const dx=entry.lane-entry.x,sideStep=Math.abs(dx)>.0001,dy=sideStep?0:vandulEntry.finishY-entry.y;
 const gap=sideStep?Math.abs(dx):Math.abs(dy);
 if(gap<.0001){admitVandul(entry.x,entry.y,0,0,null,entry.aim);return;}
 const ux=sideStep?Math.sign(dx):0,uy=sideStep?0:Math.sign(dy),t=clamp((vandulEntry.slowAt-entry.y)/vandulEntry.slowDistance,0,1);
 const speed=vandulEntry.speed+(vandulEntry.transitSpeed-vandulEntry.speed)*t*t*(3-2*t);
 const step=Math.min(gap,dt*speed);
 queueHeading(entry,Math.atan2(uy,ux));advanceHeading(entry,dt);
 entry.x+=ux*step;entry.y+=uy*step;entry.vx=ux*step/dt;entry.vy=uy*step/dt;
 if(step===gap&&!sideStep){
  const speed=vandulProfile.speed*.78;
  admitVandul(entry.x,entry.y,ux*speed,uy*speed,null,entry.aim);
 }
}
function updateDuelCountdown(){
 if(!duelCountdownBadge)return;
 // Tile encounters are populated directly; no Vandul wave is inbound.
 if(isTileBattle()){duelCountdownBadge.hidden=true;duelCountdownBadge.textContent='';return;}
 if(playerIngress&&state==='arrive'&&!document.hidden&&!hangarDialog?.open){
  duelCountdownBadge.hidden=false;
  if(duelCountdownBadge.textContent!=='Leaving Carrier')duelCountdownBadge.textContent='Leaving Carrier';
  return;
 }
 const visible=duelEnabled&&!isWingmanTest()&&(duelCountdown>0||waitingVanduls()>0)&&state==='play'&&!document.hidden&&!hangarDialog?.open;
 duelCountdownBadge.hidden=!visible;if(!visible)return;
 const arrival=duelCountdown>0?'Vandul incoming · '+Math.ceil(duelCountdown):
  vandulIngress?.waiting?'Vandul incoming · Finding a clear entry lane':
  vandulIngress?'Vandul entering from the top':'Next Vandul inbound';
 const wave=duelResult==='won'?duelWave+1:duelWave;
 const text=wave>1?'Wave '+wave+' · '+arrival:arrival;
 if(duelCountdownBadge.textContent!==text)duelCountdownBadge.textContent=text;
}
function advanceDuelArrival(dt){
 if(isTileBattle())return;
 if(!duelEnabled||isWingmanTest()||state!=='play'||hangarDialog?.open||duelResult==='victory'||flightMode.simWatch&&simDirector?.pilotDown)return;
 if(waveCountdownFresh){waveCountdownFresh=false;updateDuelCountdown();return;}
 if(duelCountdown>0){
  duelCountdown=Math.max(0,duelCountdown-dt);
  if(duelCountdown<1e-8){
   duelCountdown=0;
   if(duelResult==='won'){
    duelWave++;waveAdmitted=0;waveEntryLanes=[];duelResult=null;duelClock=0;updateDuelReadout();
   }
   beginVandulIngress();
  }
 }else if(vandulIngress)advanceVandulIngress(dt);
 else if(waitingVanduls()>0){
  entrySpacing=Math.max(0,entrySpacing-dt);
  if(entrySpacing<=0)beginVandulIngress();
 }
 updateDuelCountdown();
}
function updateDuelReadout(){
 if(!flightMode.redGrinSolo&&redGrinStageReadout&&!redGrinStageReadout.hidden){
  redGrinStageReadout.hidden=true;redGrinStageReadout.textContent='';
 }
 if(!duelReadout&&!redGrinStageReadout)return;
 if(flightMode.redGrinSolo){
  const frigate=pirateCapitals[0];
  const phase=frigate?.simPhase;
  const convoy=flightMode.redGrinEscort?redGrinConvoy:null;
  const hint=phase==='briefing'?(flightMode.simWatch?'AI approaching the frigate':'Approach the frigate'):
   phase==='charging'?'Broadside incoming! Break away':
   phase==='firing'?'Volley in progress':
   phase==='reload'?'Reloading · Your opening':'Flank the bow or stern';
  const outcome=duelResult==='victory'?'Frigate disabled':duelResult==='lost'?'Fighter disabled':
   convoy?'Escort · '+Math.floor(convoyProgress(convoy)*100)+'% · Freighter '+convoy.hp+'/'+convoy.maxHp+' HP · '+
    (flightMode.simWatch&&simDirector?.pilotDown?'Escort down · Watching freighter':phase==='charging'?(frigate.telegraph?.target===p?'Turret on you':'Turret on the freighter'):convoy.holding?(flightMode.simWatch?'Freighter holding':'Freighter holding · Move closer'):
    phase==='briefing'?'Follow the green route north':!frigate?.hp?'Raider disabled · Finish the route':phase==='reload'?'Pirate reloading':'Stay with the freighter'):
   frigate?'Red Grin · '+frigate.hp+'/'+frigate.maxHp+' HP · '+hint:'Simulator briefing';
  const shield=frigate?.simShield;
  const shieldStatus=shield&&frigate.hp?(shield.hp>0?' · Shield '+shield.hp+'/'+shield.maxHp:' · Shield down'):'';
  const readout=duelResult?outcome:outcome+shieldStatus;
  if(duelReadout)duelReadout.hidden=true;
  if(redGrinStageReadout){
   redGrinStageReadout.hidden=!!duelResult;
   const phaseKey=phase??'briefing';
   if(redGrinStageReadout.dataset.phase!==phaseKey)redGrinStageReadout.dataset.phase=phaseKey;
   if(redGrinStageReadout.textContent!==readout)redGrinStageReadout.textContent=readout;
  }
  return;
 }
 if(!duelReadout)return;
 if(isCrossBattleArena()){
  duelReadout.hidden=false;duelReadout.dataset.result=duelResult??'';
  duelReadout.textContent='Blackwake · '+(duelResult==='victory'?'Pirate fleet disabled · Return via '+flightMode.tileApproach.entryEdge:
   duelResult==='lost'?'Your fighter was eliminated':pirateCapitals.filter(ship=>ship.hp>0).length+'/3 pirate vessels · Local combat');
  return;
 }
 if(flightMode.pirateCapital&&!flightMode.capital){
  duelReadout.hidden=false;duelReadout.dataset.result=duelResult??'';
  const count=pirateCapitals.filter(ship=>ship.hp>0).length;
  const status=duelResult==='victory'?'Patrol disabled · Return via '+flightMode.tileApproach.entryEdge:
   duelResult==='lost'?'Your fighter was eliminated':count+'/3 pirate freighters · Local combat';
  duelReadout.textContent='Corsair Cluster · '+status;
  return;
 }
 if(isFourWayBattle()){
  duelReadout.hidden=false;duelReadout.dataset.result=duelResult??'';
  const live=Number(p.hp>0)+vanduls.filter(ship=>ship.hp>0).length;
  const label=flightMode.fourWaySource?'Corsair Cluster':'4-Way Battle';
  duelReadout.textContent=label+' · '+(duelResult==='victory'?'Last fighter standing · Return via '+flightMode.tileApproach.entryEdge:duelResult==='lost'?'Your fighter was eliminated':live+'/4 fighters · All rivals hostile');
  return;
 }
 if(escortShip){duelReadout.hidden=false;duelReadout.dataset.result='';duelReadout.textContent='Escort test · No credits or damage saved';return;}
 if(capitalShip){
  duelReadout.hidden=false;duelReadout.dataset.result='';
  const label=capitalShip.formationTestQueue?'Formation Free Flight test · No carrier resources used':flightMode.crossBattle&&capitalShip.roundTripReturned?'Blackwake · Returning to Pegasus · Local combat':pendingCarrierSortie?pendingCarrierSortie.title+' · Carrier departure':flightMode.hangarTrial?'Free Flight rental · No credits or damage saved':flightMode.loaner?'Custom Mode · Loaner flight · No credits or damage saved':flightMode.id==='free-flight'?'Free flight · No credits or damage saved':capitalWarning;
  const warning=capitalShip?.vessel===bifrostCapital?capitalShip.name+' · '+label:label;
  if(duelReadout.textContent!==warning)duelReadout.textContent=warning;
  return;
 }
 const rivals=activeVanduls(),lead=rivals[0],multi=waveSize()>1;
 const blockers=rivals.length?visionBlockers():null,visible=rivals.filter(ship=>playerCanSee(ship,blockers));
 duelReadout.hidden=!duelEnabled||(!lead&&!duelResult&&!duelKills&&!wingman);
 if(duelReadout.hidden)return;
 const driveStatus=ship=>({tell:'Drive-by incoming',pass:'Drive-by',recover:'Pulling back'})[ship.drive.phase];
 const test=isWingmanTest();
 const status=duelResult==='victory'?'Mission Complete · '+(test?'10 Vandul defeated':'6 waves cleared')+' · Your hull '+p.hp+'/'+p.maxHp+' HP':
  duelResult==='won'?'VANDUL DESTROYED · You win this wave':
  duelResult==='lost'?'RUN ENDED · Your hull 0 HP · '+(requiresBattleRepair()?'Repair in Hangar':'Reset to retry'):
  test?rivals.length+'/'+trainingPosts.length+' Vandul remaining · Your hull '+p.hp+'/'+p.maxHp+' HP':
  multi?(rivals.length+waitingVanduls())+'/'+waveSize()+' Vandul remaining'+(waitingVanduls()?' ('+waitingVanduls()+' inbound)':'')+
    ' · Your hull '+p.hp+'/'+p.maxHp+(visible.length?' · '+visible.map(ship=>'V'+ship.slot+' '+ship.hp+'/'+ship.maxHp+' HP'+(ship.bonus?' +'+ship.bonus+'°':'')).join(' · '):'')+
    (visible.some(ship=>ship.drive?.phase==='tell')?' · Drive-by incoming':''):
  !lead?'Next Vandul approaching':
  !visible.length?'Vandul out of sight · Your hull '+p.hp+'/'+p.maxHp+' HP':
  'VANDUL '+lead.hp+'/'+lead.maxHp+' HP · Your hull '+p.hp+'/'+p.maxHp+' · Laser spread +'+lead.bonus+'°'+(lead.lastLaserBonus===null?'':' · Last shot +'+lead.lastLaserBonus+'°')+
  (!lead.seesTarget?' · Searching':lead.drive?' · '+driveStatus(lead):'');
 const text=status+' · Kills '+duelKills+(test?'':lead||multi?' · Wave '+duelWave:'')+
  (testLead?' · '+(testLead.displayName??'AI lead')+' '+(testLead.hp>0?testLead.hp+'/'+testLead.maxHp+' HP':'disabled'):'')+
  (wingman?' · '+(wingman.displayName??'Ally')+' '+(wingman.hp>0?wingman.hp+'/'+wingman.maxHp+' HP':'disabled')+' · Ally kills '+wingmanKills:'')+
  (archivedFallbackLimited?' · Oldest wreck marks limited':'');
 if(duelReadout.textContent!==text)duelReadout.textContent=text;
 duelReadout.dataset.result=duelResult??'';
}
if(asteroidSwitch)asteroidSwitch.checked=true;
asteroidSwitch?.addEventListener('change',()=>{
 if(asteroidCover===!!asteroidSwitch.checked)return;
 asteroidCover=!!asteroidSwitch.checked;resetAsteroids();
});
const compactHullValue=document.getElementById('compact-hull-value');
const hudFields=[
 ['SPEED','speed-stat','Actual speed in arena units per second','u/s','arena units per second'],
 ['KILLS'],['CREDITS'],['SHOTS'],['HULL','hull-stat'],
 ['MASS','mass-stat','Flight mass in game units','u','game units']
];
function updateHud(){
 const speed=p?Math.round(Math.hypot(p.vx,p.vy)):0,values=[speed,duelKills,sortieCredits,practiceShots,p?p.hp+'/'+p.maxHp:'',p?.weight??0];
 const key=values.join(':');if(key===hudKey)return;hudKey=key;
 if(!hudNumbers){
  hud.innerHTML=hudFields.map(([name,css,title,unit,unitName])=>'<span class="rift-stat'+(css?' '+css:'')+'"'+
   (title?' title="'+title+'"':'')+'><span>'+name+'</span><span class="rift-stat-value"><b data-field-number></b>'+
   (unit?'<small aria-hidden="true">'+unit+'</small><span class="sr-only"> '+unitName+'</span>':'')+'</span></span>').join('')+
   (resetFieldButton?'':'<button id="reset-field" class="rift-reset" type="button">Reset field</button>');
  hudNumbers=Array.from(hud.querySelectorAll('[data-field-number]'));
 }
 hudNumbers.forEach((node,i)=>{const text=String(values[i]);if(node.textContent!==text)node.textContent=text;});
 const condition=p&&p.hp<=5?'critical':'healthy';
 hud.dataset.hull=condition;
 if(compactHullValue){
  if(compactHullValue.textContent!==values[4])compactHullValue.textContent=values[4];
  compactHullValue.dataset.hull=condition;
 }
}
function button(label,action,id=''){return '<button type="button" class="rift-action" data-rift="'+action+'"'+(id?' id="'+id+'"':'')+'>'+label+'</button>';}
function menu(title,copy,action,label,kicker){
 overlay.hidden=false;overlay.innerHTML='<p class="rift-kicker">'+kicker+'</p><h2>'+title+'</h2><p>'+copy+'</p>'+button(label,action,action==='start'?'start':'');
}
function clearInput({resetBurstCooldown=false,preserveDockVoice=false}={}){
 surgeTap=null;surgeUntil=0;surgeLowUntil=0;
 if(!preserveDockVoice){stopDockVoice();if(capitalShip)capitalShip.commsUntil=0;if(dockingComms)dockingComms.hidden=true;}
 stopBallisticHold();stopFirePointer();stopNativePreview();cancelEngineTest();stopThruster();stopProjectileVoices();
 if(p){p.dockQueuedUntil=0;p.gimbalTarget=undefined;p.gimbalPoint=null;}
 // Interrupt a volley without waiving its recovery; only a field reset starts fresh.
 lastGunTap=null;cancelFireBurst(resetBurstCooldown);
 const release=[[movePad,movePtr?.id],[movePad,thrustPtr?.id],[aimPad,aimPtr?.id]];
 keys.clear();movePtr=null;thrustPtr=null;moveKey=null;movePulse=null;aimPtr=null;autoLock=null;
 testThrustHeld=0;testThrustLatched=false;
 paintMove();showStick(aimPad);
 for(const [pad,id] of release)if(id!==null&&id!==undefined){try{pad?.releasePointerCapture?.(id);}catch{}}
}
function liveFocus(){canvas.focus({preventScroll:true});}
const coneLayout=[[356,553],[409,524],[602,564],[388,678],[576,682],[548,765],[348,869],[607,887]];
function resetField(delayOpeningWave=false){
 riftWrecks=[];riftBroken=new WeakSet();
 resetDamageSmoke();fleetReturnAuto=false;
 closeGalaxyTransfer();
 surgeReadyAt=0;
 rangeTargets=[];rangeScore=0;rangeClock=0;rangeMessage='';
 endWingRadio();
 capitalShip?.stream?.chart?.close?.();
 if(orbitalView)orbitalView.textContent='';
 formationEscorts=[];playerIngress=null;missionDeparture=null;capitalHangarApproach=null;pendingCarrierSortie=null;blackwake=null;pirateCapitals=[];redGrinConvoy=null;scaleFlyShips=null;fighterBattle=null;capitalShip=escortShip=null;wingman=testLead=testPlayerSlot=testLeadGuide=null;wingmanKills=0;wingmanOrder='formation';resetShield();syncArrivalControls();clearInput({resetBurstCooldown:true});aimManuallyPlaced=false;
 const maxHp=fittedFighter().hullHp;
 p={x:launch.x,y:launch.y,r:17,aim:-Math.PI/2,vx:0,vy:0,hp:maxHp,maxHp,he3:0,inv:0,spin:0,wallFx:0,impactCooldown:0,mainMomentum:false,mainThrustActive:false,craft:true,heat:0,coolAt:0};
 syncFlightFit();showFlightPower();showFlightHeat();
 cones=coneLayout.map(([x,y],i)=>({id:i+1,x,y,r:15,vx:0,vy:0,angle:(i*.79)%TAU,spin:0,hitGlow:0,wallFx:0,invMass:1}));
 resetDuel(delayOpeningWave?0:undefined);
 shots=[];sparks=[];rings=[];clashBursts=[];normalShots.clear();nextNormalShot.clear();practiceHits=0;practiceShots=0;recoil=0;shake=0;hudKey='';updateHud();
}
function showGameScreen(active){
 refreshSoundActivation?.();
 const simWatch=active&&!!flightMode.simWatch;
 for(const surface of [arenaScreen,gameCabinet])if(surface){
  if(simWatch){surface.dataset.simWatch='true';surface.dataset.watch='true';}
  else if(surface.dataset.simWatch){delete surface.dataset.simWatch;delete surface.dataset.watch;}
 }
 if(simWatchHud)simWatchHud.hidden=!simWatch;
 if(simWatch&&simWatchTitle)simWatchTitle.textContent='Watching · '+flightMode.simWatch;
 if(gameCabinet){
  gameCabinet.dataset.view=active?'arena':'menu';
  if(active&&flightMode.scaleFly)gameCabinet.dataset.scaleFly='true';else delete gameCabinet.dataset.scaleFly;
 }
 const banner=document.getElementById('scale-fly-readout');
 if(banner)banner.hidden=!(active&&flightMode.scaleFly);
 if(scaleFlyPauseButton)scaleFlyPauseButton.hidden=!(active&&flightMode.scaleFly&&!simWatch);
 updateFighterBattleReadout(active);
 syncScaleFlyOverview();updateScaleFlyLandingHud();syncFlightView();
 if(mainScreen)mainScreen.hidden=active;
 if(arenaScreen)arenaScreen.hidden=!active;
}
const carrierExitLabel='Return to Carrier';
const flightExitLabel=()=>flightMode.redGrinSolo?'Return to Hangar':flightMode.hangarTrial?'Return to Hangar':flightMode.shopTrial?'Return to Shop':carrierExitLabel;
const carrierReturnPath=mode=>mode?.fourWayReturn?carrierReturnPath(mode.fourWayReturn):(mode?.hangarTrial||mode?.redGrinSolo)?'./index.html?hangar=carrier&vessel='+(mode.capitalVessel===bifrostCapital?'bifrost':'rift-carrier'):mode?.shopTrial?'./carrier-shop.html?vessel='+(mode.capitalVessel===bifrostCapital?'bifrost':'rift-carrier')+'&view='+(mode.loaner===civilianFreighter.id?'freighters':'fighters'):mode?.capitalVessel===bifrostCapital?'./carrier.html?vessel=bifrost':mode?.explicitPegasus?'./carrier.html?vessel=rift-carrier':'./carrier.html';
function syncFlightExit(){
 if(!returnMainMenu)return;
 returnMainMenu.textContent=returnFlightToCarrier?flightExitLabel():'Menu';
 returnMainMenu.setAttribute('aria-label',returnFlightToCarrier?flightExitLabel():'Return to Main Menu');
 returnMainMenu.setAttribute('title',returnFlightToCarrier?('End this run · '+flightExitLabel()):'End this run and return to Main Menu');
}
function enterMainMenu(abandonQuest=false,storedLoaner=false){
 if(state==='menu'||hangarDialog?.open)return;
 if(missionDeparture?.questSave==='pending'&&!abandonQuest){
  showMissionComplete(questFailure);return;
 }
 if(!flushBattleDamage()){warnDamageSave();return;}
 const toCarrier=storedLoaner||returnFlightToCarrier;
 const destination=storedLoaner?'./index.html?hangar=carrier&vessel='+currentCapitalId(capitalShip):carrierReturnPath(flightMode);
 returnFlightToCarrier=false;
 state='menu';simDirector=null;duelEnabled=false;setArenaWidth();arena.top=edge;arena.bottom=H-edge;resumeAfterHangar=false;
 if(arenaSettings)arenaSettings.open=false;
 cancelHangarPress();cancelCanopyAudio();releasePhoneAudio();retireAudio();
 if(loanerSnapshot)exitLoanerFit();
 resetField();last=elapsed=0;overlay.hidden=true;showGameScreen(false);syncFlightExit();
 if(toCarrier){try{window.location.replace(destination);return;}catch{}}
 mainMenuCarrier?.focus({preventScroll:true});
}
function syncArrivalControls(){
 refreshSoundActivation?.();
 syncPauseControl();
 const locked=!!(playerIngress||missionDeparture);
 if(arenaSettings){
  if(missionDeparture)arenaSettings.open=false;
  arenaSettings.inert=!!missionDeparture;
 }
 if(resetFieldButton)resetFieldButton.disabled=locked;
 if(arrivalDeck)arrivalDeck.inert=locked||capitalLocked();
 if(arrivalRack)arrivalRack.inert=locked||capitalLocked();
 syncWingmanCommands();updateCapitalHud();updateEscortHud();updateWingRadio();
}
const characterGenerationKey='rift-runner.character-generation.v1';
// Arena modes only choose scenario/persistence. Every route starts the same
// fitted player, flight controls, physics, and weapons through start().
const practiceFlight=Object.freeze({id:'practice',duel:false,hull:'none',credits:false,quest:null,allies:'none'});
let redGrinConvoy=null,scaleFlyShips=null,fighterBattle=null;
const fighterBattleFlight=Object.freeze({...practiceFlight,id:'fighter-battle',fighterBattle:true,hangarTrial:true,loaner:starterHullId});
const scaleFlyFlight=Object.freeze({...practiceFlight,id:'scale-free-fly',scaleFly:true,hangarTrial:true,loaner:starterHullId});
const redGrinSoloFlight=Object.freeze({...practiceFlight,id:'red-grin-solo',redGrinSolo:true,loaner:starterHullId});
const redGrinEscortFlight=Object.freeze({...redGrinSoloFlight,id:'red-grin-escort',redGrinEscort:true});
const vandulFlight=Object.freeze({id:'vandul',duel:true,hull:'battle',credits:true,quest:'intercept',allies:'none'});
const soloTrainingFlight=Object.freeze({...vandulFlight,id:'solo-training',hull:'none',credits:false,quest:null});
const simulatorWatchRoutes=Object.freeze({
 'red-grin-simulator':[redGrinSoloFlight,'Red Grin'],
 'red-grin-escort':[redGrinEscortFlight,'Convoy Escort'],
 'fighter-battle':[fighterBattleFlight,'50 vs 50 Fighters'],
 'scale-free-fly':[scaleFlyFlight,'Ship Scale Free Fly'],
 practice:[practiceFlight,'Practice'],
 'solo-training':[soloTrainingFlight,'Solo vs Vandul']
});
const simWatchHud=document.getElementById('sim-watch-hud'),simWatchTitle=document.getElementById('sim-watch-title');
const simWatchCamera=document.getElementById('sim-watch-camera'),simWatchPause=document.getElementById('sim-watch-pause');
let simDirector=null;
function simulatorFleetCamera(){
 const sim=fighterBattle;
 const deploy=sim.time<8&&sim.launching,lane=deploy?Number(sim.time>=4):0;
 const scout=deploy?sim.frigates[lane]:null;
 const approach=clamp((sim.time-2)/8,0,1);
 const zoom=simDirector?.wide?Math.min(.62,frameW/2220,frameH/2510):Math.min(1,Math.max(.34,frameW/1000));
 const w=frameW/zoom,h=frameH/zoom,x=scout?.x??(arena.left+arena.right)/2;
 const y=scout?.y??(fighterCross.mid+360*(1-approach));
 return {x:simDirector?.wide?(arena.left+arena.right-w)/2:clamp(x-w/2,0,Math.max(0,arena.right+edge-w)),
  y:simDirector?.wide?(arena.top+arena.bottom-h)/2:clamp(y-h/2,0,Math.max(0,arena.bottom+edge-h)),w,h,zoom};
}
function watchPilotVector(dt){
 const d=simDirector;
 if(!d||d.pilotDown||fighterBattle)return null;
 const {left,right,top,bottom}=arena;
 if(scaleFlyShips){
  if(scaleFlyShips.parked){
   if(elapsed<1.6)return null;
   scaleFlyShips.parked=null;p.vy=52;snapAim(Math.PI/2);
  }
  const loop=[[1350,1650],[2030,1640],[2110,850],[2110,375],[1350,315],[775,335],[210,420],[180,1080],[300,1615],[1110,1645]];
  let [x,y]=loop[d.waypoint%loop.length];
  if(Math.hypot(p.x-x,p.y-y)<30){d.waypoint++;[x,y]=loop[d.waypoint%loop.length];}
  const ax=x-p.x,ay=y-p.y,gap=Math.hypot(ax,ay),speed=Math.min(135,gap*1.8);
  if(gap<1e-5)return {x:0,y:0};
  queueHeading(p,Math.atan2(ay,ax));return {x:ax*speed/gap,y:ay*speed/gap};
 }
 const convoy=redGrinConvoy;
 const rival=pirateCapitals.find(a=>a.hp>0)??activeVanduls().reduce((best,a)=>
  !best||Math.hypot(a.x-p.x,a.y-p.y)<Math.hypot(best.x-p.x,best.y-p.y)?a:best,null);
 const practice=flightMode.id==='practice';
 let goal;
 if(convoy){
  goal={x:convoy.x+64*Math.sin(elapsed*.68),y:convoy.y-89};
 }else if(practice){
  const course=[[438,1030],[685,950],[746,630],[514,400],[274,535],[252,897],[380,1037]];
  let [x,y]=course[d.waypoint%course.length];if(Math.hypot(x-p.x,y-p.y)<35){d.waypoint++;[x,y]=course[d.waypoint%course.length];}
  goal={x,y};
 }else if(rival){
  const bearing=Math.atan2(p.y-rival.y,p.x-rival.x);
  const wingBearing=flightMode.redGrinSolo?rival.yaw-Math.PI/2:bearing+.40;
  const a=flightMode.redGrinSolo?wingBearing+(Math.cos(bearing-wingBearing)<0?Math.PI:0)+.24*Math.sin(elapsed*.8):wingBearing;
  const radius=flightMode.redGrinSolo?218:156;
  goal={x:rival.x+Math.cos(a)*radius,y:rival.y+Math.sin(a)*radius};
 }else goal={x:launch.x+85*Math.sin(elapsed*.70),y:launch.y-120};
 goal.x=clamp(goal.x,left+45,right-45);goal.y=clamp(goal.y,top+45,bottom-45);
 const cover=[...cones,...asteroids,...sceneryDebris];
 const body={...p};
 steerAroundVandulCover(body,goal.x-p.x,goal.y-p.y,cover,145,2400,dt);
 const target=rival??(practice?cones.reduce((best,a)=>!best||Math.hypot(a.x-p.x,a.y-p.y)<Math.hypot(best.x-p.x,best.y-p.y)?a:best,null):null);
 if(target){
  const gap=Math.hypot(target.x-p.x,target.y-p.y),gun=mountedGun(),lead=Math.min(.55,gap/(gun?.speed??500));
  const a=Math.atan2(target.y-p.y+(target.vy??0)*lead,target.x-p.x+(target.vx??0)*lead);
  queueHeading(p,a);
  if(gap<440&&gap>48&&Math.abs(headingDelta(p.aim,a))<.21&&elapsed>=d.nextShot&&
   !firstSightCover(p,target,cover.filter(piece=>piece!==target))&&fireShot(a))d.nextShot=elapsed+(flightMode.redGrinSolo?.48:.30);
 }else if(Math.hypot(body.vx,body.vy)>10)queueHeading(p,Math.atan2(body.vy,body.vx));
 return {x:body.vx,y:body.vy};
}
const corsairTileTest=Object.freeze({...soloTrainingFlight,id:'corsair-cross-tile',tileTest:true,pirateCapital:true});
const capitalTestFlight=Object.freeze({id:'capital-test',duel:false,hull:'none',credits:false,quest:null,allies:'none',capital:true});
const carrierDepartureFlight=Object.freeze({...capitalTestFlight,id:'carrier-departure',capitalStream:true});
const bifrostTestFlight=Object.freeze({...capitalTestFlight,capitalVessel:bifrostCapital});
const cruisingCapitalTestFlight=Object.freeze({...capitalTestFlight,capitalStream:true});
const bifrostCruisingCapitalTestFlight=Object.freeze({...bifrostTestFlight,capitalStream:true});
const customHullChoices=Object.freeze([
 ['bastion-9','Swift-2'],['stocky-light-fighter','Bison-2 Light Fighter'],['rift-fighter','Rift-3']
]);
const customModes=new Map();
function customMode(loaner,vessel,shopTrial=false,hangarTrial=false){
 const key=[loaner,vessel,shopTrial,hangarTrial].join(':');
 if(!customModes.has(key)){
  // A loan changes the temporary loadout and return route, not the fleet map.
  const base=vessel==='bifrost'?atBifrost(freeFlight):atPegasus(freeFlight);
  customModes.set(key,Object.freeze({...base,loaner,shopTrial,hangarTrial}));
 }
 return customModes.get(key);
}
const freeFlight=Object.freeze({...capitalTestFlight,id:'free-flight',capitalStream:true});
const bifrostModes=new WeakMap();
const atBifrost=mode=>{
 if(!bifrostModes.has(mode))bifrostModes.set(mode,Object.freeze({...mode,capitalVessel:bifrostCapital}));
 return bifrostModes.get(mode);
};
const pegasusModes=new WeakMap();
const atPegasus=mode=>{
 if(!pegasusModes.has(mode))pegasusModes.set(mode,Object.freeze({...mode,explicitPegasus:true}));
 return pegasusModes.get(mode);
};
const bifrostFreeFlight=atBifrost(freeFlight),bifrostDepartureFlight=atBifrost(carrierDepartureFlight);
const escortFlight=Object.freeze({...practiceFlight,id:'escort',escort:true});
const wingmanTestFlight=Object.freeze({id:'wingman-test',duel:true,hull:'destruction',credits:false,quest:null,allies:'squadron'});
const carrierFlightRoutes=new Map([
 ['?launch=practice',practiceFlight],['?launch=vandul',vandulFlight],['?launch=wingman-test',wingmanTestFlight],
 ['?launch=escort',escortFlight],['?launch=capital-test',capitalTestFlight],['?launch=carrier-launch',capitalTestFlight],
 ...['capital-test','carrier-launch'].flatMap(launch=>['pegasus','bifrost'].flatMap(vessel=>{
  const mode=vessel==='bifrost'?bifrostTestFlight:capitalTestFlight;
  return [['?launch='+launch+'&vessel='+vessel,mode],['?vessel='+vessel+'&launch='+launch,mode]];
 })),
 ...(window.RiftMissions?.qualifications??[]).map(({id})=>[
  '?launch=vandul&mission='+id,Object.freeze({...vandulFlight,id,quest:id,allies:id==='wingman'?'wingman':'none'})
 ])
]);
for(const [route,mode] of [...carrierFlightRoutes]){
 if(route.includes('&vessel=')||route.startsWith('?vessel='))continue;
 carrierFlightRoutes.set(route+'&vessel=rift-carrier',atPegasus(mode));
 if(!mode.capital&&!mode.quest&&mode.id!==vandulFlight.id)carrierFlightRoutes.set(route+'&vessel=bifrost',atBifrost(mode));
}
carrierFlightRoutes.set('?launch=solo-training&vessel=bifrost',atBifrost(soloTrainingFlight));
carrierFlightRoutes.set('?launch=solo-training&vessel=rift-carrier',atPegasus(soloTrainingFlight));
const stagedCarrierRoutes=new Map([...carrierFlightRoutes].map(([route,mode])=>[route+'&departure=carrier',mode.capital?
 (mode.capitalVessel===bifrostCapital?bifrostCruisingCapitalTestFlight:mode.explicitPegasus?atPegasus(cruisingCapitalTestFlight):cruisingCapitalTestFlight):mode]));
// Accept both historical query orders, but not extra or ambiguous parameters.
for(const [route,mode] of [...stagedCarrierRoutes]){
 const alternate=route.replace(/&vessel=(bifrost|rift-carrier)&departure=carrier$/,'&departure=carrier&vessel=$1');
 if(alternate!==route)stagedCarrierRoutes.set(alternate,mode);
}
const qualificationSpecs=window.RiftMissions?.qualifications??[];
const hangarOrderModes=new Map([
 ['intercept',vandulFlight],['rendezvous',wingmanTestFlight],['escort-drill',escortFlight],
 ...qualificationSpecs.map(({id})=>[id,carrierFlightRoutes.get('?launch=vandul&mission='+id)])
]);
const bifrostHangarRoutes=new Set(['?hangar=carrier&vessel=bifrost','?hangar=carrier&vessel=bifrost&order=escort-drill','?hangar=carrier&order=escort-drill&vessel=bifrost']);
const pegasusHangar='?hangar=carrier&vessel=rift-carrier';
const pegasusHangarOrder=route=>typeof route==='string'&&(/^\?hangar=carrier&vessel=rift-carrier&order=([a-z-]+)$/.exec(route)||/^\?hangar=carrier&order=([a-z-]+)&vessel=rift-carrier$/.exec(route))?.[1];
const hangarOrderFromRoute=route=>{
 if(bifrostHangarRoutes.has(route))return route.includes('&order=')?'escort-drill':null;
 const match=typeof route==='string'&&/^\?hangar=carrier&order=([a-z-]+)$/.exec(route);
 const order=match?.[1]||pegasusHangarOrder(route);
 return hangarOrderModes.has(order)?order:null;
};
let flightGeneration,flightCanSave=false,flightHullId,flightHullRaw,pendingBattleDamage=null,flightQuest=null,flightMode=practiceFlight;
const persistsBattleDamage=()=>managedBuild&&flightMode.hull==='battle';
function currentCharacterGeneration(){
 try{return localStorage.getItem(characterGenerationKey)??null;}catch{return undefined;}
}
const isWingmanTest=()=>flightMode.id===wingmanTestFlight.id;
const isFourWayBattle=()=>!!flightMode.fourWay&&!flightMode.capital;
const isCrossBattleArena=()=>!!flightMode.crossBattle&&!flightMode.capital;
const isCrossWatch=()=>flightMode.crossBattle?.role==='watch';
const isTileBattle=()=>isFourWayBattle()||isCrossBattleArena();
const requiresBattleRepair=()=>managedBuild&&flightMode.hull!=='none';
function canCreditThisFlight(){
 return flightMode.credits&&(!managedBuild||(flightCanSave&&currentCharacterGeneration()===flightGeneration));
}
function flushBattleDamage(){
 if(!pendingBattleDamage)return true;
 const generation=currentCharacterGeneration(),raw=readHullRaw(flightHullId);
 if(generation===undefined||raw===undefined)return false;
 if(generation!==flightGeneration||raw!==flightHullRaw){
  pendingBattleDamage=null;flightHullRaw=undefined;return true;
 }
 const saved=saveHullCertificate(pendingBattleDamage.hullHp>0?'repaired':'damaged',undefined,raw,pendingBattleDamage,flightGeneration,flightHullId);
 if(!saved)return false;
 flightHullRaw=saved;pendingBattleDamage=null;return true;
}
function loseHull(body,amount){
 const hp=Math.max(0,body.hp-amount);
 if(hp===body.hp)return;
 body.hp=hp;
 if(hp===0)breakRiftFighter(body);
 // Training preserves nonlethal damage only in memory, but a destroyed
 // pilot hull still requires normal Carrier repair.
 if(body!==p||!requiresBattleRepair()||(!persistsBattleDamage()&&hp>0)||flightHullRaw===undefined)return;
 pendingBattleDamage={hullHp:hp,maxHullHp:p.maxHp};flushBattleDamage();
}
function warnDamageSave(){
 if(state==='play')pause();
 const copy='Could not save battle damage. Keep this window open and try returning again.';
 if(missionDeparture)showMissionComplete(copy);
 else if(state==='disabled')menu('Hull disabled',copy,'main-menu',returnFlightToCarrier?flightExitLabel():'Main Menu','HULL 0 HP');
 else{const note=overlay.querySelector('p:not(.rift-kicker)');if(note)note.textContent=copy;}
}
const currentFlightHullId=()=>window.RiftFighters?.selected?.()??hullId;
function carrierSortieCurrent(sortie){
 if(sortie.mode.fourWay&&sortie.mode.loaner)return !sortie.failed&&!!loanerSnapshot&&sortie.check();
 const generation=currentCharacterGeneration(),hull=readHullRaw();
 return !sortie.failed&&generation!==undefined&&hull!==undefined&&
  canLaunchBuild()&&sortie.check(generation,hull);
}
function failCarrierSortie(sortie){
 if(pendingCarrierSortie!==sortie||!capitalShip)return;
 sortie.failed=true;
 syncArrivalControls();updateDuelReadout();
}
// The carrier hall runs forward from the lead on the front-middle pad.
 // Other mission formation boards keep their existing flight layouts.
function carrierWingFormation(slot){
 const i=formationGrid.indexOf(slot);
 if(i<0)return null;
 const lateral=(i%3-1)*82,row=Math.floor(i/3),aft=22+row*74;
 return {entryX:lateral,entryY:aft,followX:lateral,followY:aft,bottomY:aft};
}
function queueCarrierWingTwo(ship,relaunch=false,wingOrigin){
 if(![pegasusCapital,bifrostCapital].includes(ship?.vessel)||!ship.stream||ship.testCarrier||ship.transfer)return null;
 const vessel=currentCapitalId(ship);
 if(!relaunch&&(wingOrigin==='solo'||wingOrigin===undefined&&vessel!=='rift-carrier'||!corsairWingEnabled(vessel)))return null;
 if(ship.wingDeckOrder)return ship.wingDeckOrder;
 if(ship.recoveryPad==null){
  ship.recoveryPad=chooseRecoveryPad(ship.pads.map((_,i)=>i),new Set([ship.pad]),Math.random());
  ship.deckCrew=ship.deckCrew.filter(crew=>crew.pad!==ship.recoveryPad);
 }
 const formation=relaunch?ship.wingFormation:carrierWingFormation(selectedWingPad(vessel));
 ship.wingFormation=formation??wingmanFormations['echelon-right'];
 return ship.wingDeckOrder={corsair:ship.wingFormation,name:ship.name+' Wing Two',wait:0,deployed:false};
}
function stageCarrierSortie(mode,title,check,wingOrigin){
 const origin=mode.loaner?mode.fourWay:null;
 const originInfo=origin?fourWayOrigins[origin]:null;
 const base=mode.capitalVessel===bifrostCapital?bifrostDepartureFlight:mode.explicitPegasus?atPegasus(carrierDepartureFlight):carrierDepartureFlight;
 const departure=origin?{...base,loaner:mode.loaner,fourWay:origin,
  capitalVessel:originInfo.capital==='bifrost'?bifrostCapital:pegasusCapital,testCarrier:originInfo.carrier}:base;
 const flight=mode.tileTest&&!mode.loaner?{...departure,trackOwnedHealth:true,...(mode.crossBattle?{crossBattle:mode.crossBattle}:{})}:departure;
 if(!start(flight,false,check))return false;
 if(origin)flightMode={...flightMode,fourWayReturn:mode};
 pendingCarrierSortie={mode,title,check,failed:false,piloted:false,
  ...(origin?{approach:Object.freeze({entryEdge:origin,exitEdge:{north:'south',south:'north',east:'west',west:'east'}[origin],heading:originInfo.heading})}:{})};
 if(mode.crossBattle?.role==='reinforce')capitalShip.supportFleet=makeSupportFleet(capitalShip);
 if(mode.id===corsairTileTest.id){
  const deck=queueCarrierWingTwo(capitalShip,false,wingOrigin);
  if(deck)pendingCarrierSortie.deckWing=deck;
 }
 syncArrivalControls();updateDuelReadout();
 return true;
}
// Tactical separation never changes the Resolute's strategic Armada membership.
const resoluteSortiePace=148,resoluteBattleHP=110;
// Ready for local playtesting only; live sorties do not dispatch Resolute.
const testResoluteBattleEntry=window.location?.hostname==='localhost'&&window.location?.hash==='#test-resolute-entry';
function resoluteSortieEdge(sortie){
 return capitalShip?.vessel===pegasusCapital&&capitalShip.stream&&!capitalShip.testCarrier&&!capitalShip.transfer&&
  !sortie.mode.loaner&&!sortie.mode.fourWay&&(sortie.mode.pirateCapital||sortie.mode.crossBattle&&sortie.receipt)
  ?sortie.approach?.exitEdge:null;
}
function advanceResoluteDeparture(sortie,dt){
 const gate=tileGate(resoluteSortieEdge(sortie));
 if(!testResoluteBattleEntry||!gate||!sortie.piloted||capitalShip?.resoluteEscort?.hp===0)return;
 const ship=capitalShip,[dx,dy]=gate.vector,axis=gate.axis;
 const flight=sortie.resolute??={...resoluteFormation(ship,elapsed),heading:ship.aim+Math.PI/2,cleared:false};
 if(flight.cleared)return;
 const distance=(gate.line-flight[axis])*gate.sign;
 const travel=Math.min(Math.max(0,distance),resoluteSortiePace*dt);
 flight.x+=dx*travel;flight.y+=dy*travel;
 flight.heading+=clamp(headingDelta(flight.heading,sortie.approach.heading+Math.PI/2),-1.6*dt,1.6*dt);
 flight.cleared=distance<=travel;
}
function resoluteBattlePlan(sortie){
 if(!testResoluteBattleEntry||capitalShip?.resoluteEscort?.hp===0)return null;
 const edge=resoluteSortieEdge(sortie),gate=tileGate(edge);
 if(!gate)return null;
 const pose=sortie.resolute??resoluteFormation(capitalShip,elapsed);
 if(!pose)return null;
 const remain=pose.cleared?0:Math.max(0,(gate.line-pose[gate.axis])*gate.sign);
 return {edge:sortie.approach.entryEdge,heading:sortie.approach.heading,delay:remain/resoluteSortiePace,hp:capitalShip.resoluteEscort?.hp??resoluteBattleHP,wait:0,craft:null};
}
function transferCarrierSortie(sortie){
 if(pendingCarrierSortie!==sortie||sortie.failed||state!=='play'||document.hidden||routeParked||capitalShip?.phase!=='flight')return;
 if(!carrierSortieCurrent(sortie)){failCarrierSortie(sortie);return;}
 if(sortie.deckWing&&!sortie.deckWing.deployed)return;
 // Departure has already been shown. Start the selected arena without its
 // old standalone arrival and with the original build and order checked.
 if(sortie.mode.tileTest){
  const approach=sortie.approach;
  if(!approach)return;
  const resources={hp:p.hp,he3:p.he3,heat:p.heat,coolAt:p.coolAt};
  const speed=Math.hypot(p.vx,p.vy);
  const mode=sortie.mode===corsairTileTest||sortie.mode.id===corsairTileTest.id
   ?{...sortie.mode,fourWay:approach.entryEdge,fourWaySource:sortie.mode}
   :sortie.mode;
  const tileReturn={ship:capitalShip,mode:flightMode,bounds:{...arena},sortie};
  const resolutePlan=resoluteBattlePlan(sortie),escort=wingman?.corsairWing&&wingman.hp>0?wingman:null;
  if(!start(Object.freeze({...mode,tileApproach:approach,tileReturn,resolutePlan}),false,sortie.check)){failCarrierSortie(sortie);return;}
  if(sortie.resume){
   ({pirateCapitals,blackwake,asteroids,sceneryDebris,cones}=sortie.resume);
   // Drop stale aiming at the pre-repair pilot object. Preserve each ship,
   // disabled hull, patrol/position and HP, not shots already in transit.
   for(const pirate of pirateCapitals){
    pirate.ram={ready:Math.max(pirate.ram?.ready??0,elapsed+.9),goal:null};
    pirate.turret.target=null;pirate.turret.followAt=null;pirate.turret.burstRemaining=0;
   }
   updateDuelReadout();
  }
  Object.assign(p,resources);
  const inward=Math.min(speed,p.speed);
  p.vx=Math.cos(approach.heading)*inward;p.vy=Math.sin(approach.heading)*inward;
  if(escort){wingman=escort;placeCorsairWingman(escort,approach.heading);syncWingmanCommands();}
  p.mainMomentum=inward>.25;showFlightPower();showFlightHeat();updateHud();
 }else if(!start(sortie.mode,false,sortie.check))failCarrierSortie(sortie);
}
function directCarrierSortieCheck(mode){
 const home=fighterParkedVessel();
 const id=hullId,generation=currentCharacterGeneration(),hull=readHullRaw(id),fit=readShipRaw(id);
 if(generation===undefined||hull===undefined||fit===undefined)return ()=>false;
 const accepted=mode.quest==='intercept'?()=>window.RiftMissions?.getIntercept?.():mode.quest?()=>window.RiftMissions?.getQualification?.(mode.quest):()=>null;
 const stamp=()=>{const order=accepted();return order?[order.acceptedAt,order.victoryAt,order.lodgedAt].join(':'):'';};
 const expected=stamp();
 return (actual,raw)=>fighterParkedVessel(id)===home&&currentFlightHullId()===id&&actual===generation&&raw===hull&&readHullRaw(id)===hull&&readShipRaw(id)===fit&&stamp()===expected;
}
function carrierSortieTitle(mode){
 return ({practice:'Practice Alone',vandul:'Fight Vandul','wingman-test':'Wingman vs Vandul',escort:'Escort'})[mode.id]??
  (qualificationSpecs.find(q=>q.id===mode.id)?.rank??'Selected')+' Qualification';
}
function applyLoanerFit(id){
 const unarmed=id===civilianFreighter.id;
 if(!unarmed&&id!==starterHullId&&!fighterRegistry?.get(id))return false;
 if(!loanerSnapshot)loanerSnapshot={fit:{...fighterFit},loadout:{...fighterLoadout},bursts:{...burstModes},soundOn,phoneAudioOn,aimAssist};
 const paired=!unarmed&&gunFitSize(id)===2;
 Object.assign(fighterFit,{primary:unarmed?null:paired?sparrow:'blaster',secondary:unarmed?null:paired?sparrow:'ballistic'});
 Object.assign(fighterLoadout,{fighter:id===starterHullId?stockFighterId:id,weapon:fighterFit.primary,
  engine:unarmed?'hauler-drive':'stock-thruster',power:coreId,battery:batteryId,shield:null});
 for(const [weapon,gun] of Object.entries(guns))burstModes[weapon]=!!gun.burstOnly;
 shotSoundVersion++;showGun();
 if(openHangarButton)openHangarButton.hidden=true;
 return true;
}
function exitLoanerFit(){
 const snapshot=loanerSnapshot;loanerSnapshot=null;flightMode=practiceFlight;
 Object.assign(fighterFit,snapshot.fit);Object.assign(fighterLoadout,snapshot.loadout);Object.assign(burstModes,snapshot.bursts);
 ({soundOn,phoneAudioOn,aimAssist}=snapshot);
 if(soundSwitch)soundSwitch.checked=soundOn;
 if(phoneSwitch)phoneSwitch.checked=phoneAudioOn;
 if(aimSwitch)aimSwitch.checked=aimAssist;
 shotSoundVersion++;showGun();
 if(openHangarButton)openHangarButton.hidden=false;
}
function start(mode,fromCarrier=false,checkCockpit,wingOrigin){
 loadRiftWreckArt();
 if(mode.redGrinSolo&&(!window.RiftRedGrinBroadside||!window.RiftFrigateHulls?.crosswind)||mode.scaleFly&&!window.RiftFrigateHulls?.crosswind)return false;
 const custom=!!mode.loaner;
 if(mode.loaner===civilianFreighter.id&&(mode.id!==freeFlight.id||!(mode.shopTrial||mode.hangarTrial)||mode.duel||mode.quest))return false;
 if(custom?!applyLoanerFit(mode.loaner):loanerSnapshot||!canLaunchBuild())return false;
 const id=custom?mode.loaner:hullId,generation=custom?undefined:currentCharacterGeneration(),raw=custom?undefined:readHullRaw(id);
 if(!custom&&managedBuild&&(generation===undefined||fighterHullCondition(readBuildWallet(),raw)!=='repaired'||
    currentCharacterGeneration()!==generation||currentFlightHullId()!==id||readHullRaw(id)!==raw))return false;
 if(checkCockpit&&!checkCockpit(generation,raw))return false;
 flightGeneration=generation;flightCanSave=generation!==undefined;
 flightMode=mode;flightHullId=id;flightHullRaw=raw;
 const {duel,quest,allies}=mode,missions=window.RiftMissions;
 // Both Wingman sorties have more room to maneuver north of the old wall.
 setArenaWidth(!mode.capital&&!!(mode.crossBattle||mode.pirateCapital));
 arena.top=edge-(mode.redGrinEscort?930:(mode.capital||mode.escort)?capitalCourse.north:(mode.fourWay||mode.crossBattle)?Math.round(H*.34):allies==='squadron'?northTrainingExtension:allies==='wingman'?northWingmanExtension:0);
 arena.bottom=H-edge;
 const active=persistsBattleDamage()?(quest==='intercept'?missions?.getIntercept?.():missions?.getQualification?.(quest)):null;
 flightQuest=active&&!active.victoryAt?{generation,acceptedAt:active.acceptedAt,quest}:null;
 if(fighterLoadout.shield==='aegis-s3')refreshShieldOwnership();
 const cinematic=duel&&fromCarrier&&!motion?.matches;
 duelEnabled=duel;resetField(cinematic);
 if(mode.tileApproach){
  const {entryEdge,heading}=mode.tileApproach;
  Object.assign(p,tileArrivalPoint(entryEdge));
  p.prevX=p.x;p.prevY=p.y;snapAim(heading);
 }
 if(mode.capital){
  launchCapitalTest(mode.capitalVessel,mode.capitalStream,null,mode.testCarrier);
  if(!custom&&managedBuild&&mode.id===freeFlight.id&&wingOrigin==='formation-test'){
   const pads=savedWingPads(currentCapitalId(capitalShip));
   capitalShip.recoveryPad=chooseRecoveryPad(capitalShip.pads.map((_,i)=>i),new Set([capitalShip.pad]),Math.random());
   capitalShip.deckCrew=[];
   capitalShip.formationTestQueue=pads.map((slot,i)=>({corsair:carrierWingFormation(slot),name:'Wing '+(i+1),hull:savedWingHull(slot,currentCapitalId(capitalShip)),formationTest:true}));
  }else if(!custom&&managedBuild&&(mode.id===freeFlight.id||wingOrigin==='formation'&&mode.id===capitalTestFlight.id))queueCarrierWingTwo(capitalShip,false,wingOrigin);
  updateDuelReadout();
 }
 if(mode.escort){launchEscort();updateDuelReadout();}
 if(!custom&&(persistsBattleDamage()||mode.trackOwnedHealth||mode.id==='free-flight')){p.hp=Math.min(p.maxHp,hullDamage(raw)?.hullHp??p.maxHp);updateHud();}
 if(cinematic){playerIngress={elapsed:0};p.y=carrierArrival.fromY;}
 if(duel&&allies==='squadron'){
  const slots=squadronTestLayout(),formation=wingmanFormations[slots.wingman];
  testPlayerSlot=wingmanFormations[slots.player];
  testLeadGuide={...launch,idle:0,scouting:false,bypassX:null,bypassAtY:null};
  const rendezvous=window.RiftRendezvous;
  const roster=mode.capitalVessel!==bifrostCapital&&rendezvous&&rendezvous.generation()===generation&&rendezvous.get()?.completedAt?rendezvous.pilots:null;
  if(roster?.[0]?.name==='Leena'&&roster?.[1]?.name==='Tomas')armWingRadio();
  testLead=makeAlliedFighter(launch.x,p.y,wingmanFormations['echelon-left'],'lead',roster?.[0]?.name);
  wingman=makeAlliedFighter(launch.x+formation.entryX*1.8,p.y+formation.entryY,formation,'wingman',roster?.[1]?.name);
  p.x+=testPlayerSlot.entryX*1.8;p.y+=testPlayerSlot.entryY;
  for(const post of trainingPosts)admitVandul(post.x,post.y,0,0,post);
  updateDuelReadout();
 }else if(duel&&allies==='wingman'&&active){
  const formation=wingmanFormation();
  wingman=makeAlliedFighter(p.x+formation.entryX,p.y+formation.entryY,formation,'wingman');
  updateDuelReadout();
 }
 state=cinematic?'arrive':'play';
 if(mode.scaleFly){
  Object.assign(arena,{left:edge,top:edge,right:2450-edge,bottom:1760-edge});
  cones=[];asteroids=[];sceneryDebris=[];scaleFlyShips=makeScaleFlyLineup();
  const pad=scaleFlyShips.pads.find(pad=>pad.group===1&&pad.index===4);
  scaleFlyShips.parked=pad;
  Object.assign(p,{x:pad.x,y:pad.y,prevX:pad.x,prevY:pad.y,vx:0,vy:0});snapAim(-Math.PI/2);
 }
 if(mode.fighterBattle)startFighterBattle();
 simDirector=mode.simWatch?{nextShot:0,waypoint:0,wide:false}:null;
 if(mode.simWatch){
  if(fighterBattle){p.hp=0;p.vx=p.vy=0;fighterBattle.phase='combat';}
  else if(!mode.scaleFly){fighterLoadout.weapon='ballistic';showGun();}
  if(simWatchCamera){simWatchCamera.hidden=!fighterBattle;simWatchCamera.textContent='Overview';simWatchCamera.setAttribute('aria-pressed','false');}
  if(simWatchPause)simWatchPause.textContent='Pause';
 }
 if(mode.redGrinSolo){
  cones=[];
  if(mode.redGrinEscort){
   asteroids=[];sceneryDebris=[];redGrinConvoy=makeRedGrinConvoy();
   pirateCapitals=[makeConvoyRaider(redGrinConvoy)];
  }else pirateCapitals=[makeRedGrinSolo()];
  updateDuelReadout();
 }
 if(isCrossBattleArena())seedCrossFighters(mode);
 if(isFourWayBattle()){
  if(mode.pirateCapital){
   const y=(arena.top+arena.bottom)/2;
   pirateCapitals=[[0,0],[215,-390],[-215,370]].map(([dx,dy],index)=>{
    const ship=makeBlackwake({x:W*.5+dx,y:y+dy},-Math.PI/2,true,index?'Blackwake Raider '+(index+1):'Blackwake');
    ship.patrolPhase=index*2.1;ship.hp=ship.maxHp=30;
    ship.yaw=Math.atan2(Math.cos(ship.patrolPhase),.75*Math.sin(ship.patrolPhase));placeBlackwakeTurret(ship);
    return ship;
   });
   blackwake=pirateCapitals[0];
  }
  duelCountdown=0;
  if(!mode.pirateCapital)for(const [edge,direction] of Object.entries(fourWayOrigins)){
   if(edge===mode.fourWay)continue;
   const at=tileArrivalPoint(edge),pace=43;
   admitVandul(at.x,at.y,Math.cos(direction.heading)*pace,Math.sin(direction.heading)*pace,null,direction.heading);
   const rival=vanduls.at(-1);rival.rivalEdge=edge;rival.hp=rival.maxHp=p.maxHp;
  }
  updateDuelReadout();updateDuelCountdown();
 }
 syncArrivalControls();showGameScreen(true);layout();last=0;
 overlay.hidden=true;syncFlightExit();updateDuelCountdown();showShieldControl();
 if(['docked','stored'].includes(capitalShip?.phase))capitalAction?.focus({preventScroll:true});else liveFocus();
 syncArenaMusic();
 return true;
}
// Bifrost brings its own fighter build into the encounter, independent of the observer or player.
const crossEscortFit=Object.freeze({hull:stockFighterId,weight:stockFitWeight,r:14,maxHp:20,invMass:contactMassScale/stockFitWeight,speed:155,recoilFactor:1,turnMultiplier:1,singleOnly:true,
 weapons:Object.freeze(['blaster','ballistic']),sparrowSides:Object.freeze([]),preferredBurst:Object.freeze({blaster:false,ballistic:false}),
 he3Capacity:20,he3Rate:2});
function wingTestFit(id){
 const hull=hangarDisplayHull(id);
 if(!hull||id==='rift-fighter')return crossEscortFit;
 const cargo=id===civilianFreighter.id,weight=hull.weight+(cargo?44:40);
 return {...crossEscortFit,hull:id,weight,invMass:contactMassScale/weight,r:hull.radius,maxHp:hull.hullHp,
  speed:cargo?140:id==='bastion-9'?178:152,turnMultiplier:hull.turnMultiplier,
  weapons:cargo?[]:[sparrow],sparrowSides:cargo?[]:[-1,1],preferredBurst:{}};
}
function seedCrossFighters(mode,watch=false){
  duelCountdown=0;
  const entry=mode.tileApproach.bifrost;
  const dx=Math.cos(entry.heading),dy=Math.sin(entry.heading);
  pirateCapitals=crossPiratePatrolStarts().map((point,index)=>{
   const side=[0,-174,174][index];
   const ship=makeBlackwake(point,entry.heading+Math.PI,true,
    ['Blackwake','Blackwake Raider 2','Blackwake Raider 3'][index]);
   ship.hp=ship.maxHp=index?70:84;
   ship.defenderOffset={x:-dy*side*.74,y:dx*side*.74};ship.passSide=index===2?-1:1;
   ship.patrolPhase=index*2.1;ship.turret.nextShot+=index*.12;
   ship.patrolLane={leg:138+index*31,side:index===0?-1:1,distance:0};
   ship.yaw=Math.PI;placeBlackwakeTurret(ship);
   return ship;
  });
  blackwake=pirateCapitals[0];
  const start=tileArrivalPoint(entry.entryEdge),arrivalOffset=watch?22:112,ux=Math.cos(entry.heading),uy=Math.sin(entry.heading);
  const ally=(side,role,name)=>{
   const ship=makeAlliedFighter(clamp(start.x+ux*arrivalOffset-uy*side*50,arena.left+26,arena.right-26),
    clamp(start.y+uy*arrivalOffset+ux*side*50,arena.top+26,arena.bottom-26),wingmanFormations[side<0?'echelon-left':'echelon-right'],role,name,crossEscortFit);
   ship.aim=entry.heading;ship.vx=ux*43;ship.vy=uy*43;ship.entryEdge=entry.entryEdge;
   return ship;
  };
  blackwake.supportArrival={lead:ally(-1,'lead','Bifrost Lead'),wing:ally(1,'wingman','Bifrost Two'),delay:2.2};
  wingmanOrder='loose';
  updateDuelReadout();updateDuelCountdown();
}
function advancePlayerIngress(dt){
 if(!playerIngress)return;
 playerIngress.elapsed=motion?.matches?carrierArrival.seconds:Math.min(carrierArrival.seconds,playerIngress.elapsed+dt);
 const t=playerIngress.elapsed/carrierArrival.seconds,ease=t*t*(3-2*t);
 const centerY=t>=1-1e-9?launch.y:carrierArrival.fromY+(launch.y-carrierArrival.fromY)*ease;
 p.y=centerY+(testPlayerSlot?.entryY??0);
 if(wingman)wingman.y=centerY+wingman.formation.entryY;
 if(testLead)testLead.y=centerY;
 if(t>=1-1e-9){
  playerIngress=null;state='play';duelCountdown=isWingmanTest()?0:duelCountdownSeconds;
  syncArrivalControls();updateDuelCountdown();liveFocus();syncArenaMusic();
 }else updateFlightVisual(p,dt,p.speed,true);
}
function showMissionComplete(copy,fallback=false){
 const {amount:reward,questSave}=missionDeparture,pending=questSave==='pending';
 overlay.hidden=false;
 overlay.innerHTML='<p class="rift-kicker">'+(isWingmanTest()?'10 VANDUL DEFEATED':'6 WAVES CLEARED')+'</p><h2 role="status">'+(isWingmanTest()?'Wingman Test Complete':'Mission Complete')+
  (reward?' · +'+reward+' credits':'')+'</h2><p>'+copy+'</p>'+
  (pending?button('Retry save','retry-mission-save')+button('Return without saving','abandon-mission-save'):
   fallback?'<a class="rift-action" href="'+carrierReturnPath(flightMode)+'">'+carrierExitLabel+'</a>':button(carrierExitLabel,'main-menu'));
 (!pending&&fallback?overlay.querySelector('a'):overlay.querySelector('button'))?.focus({preventScroll:true});
}
function saveQuestVictory(){
 if(!flightQuest)return 'none';
 const {generation,acceptedAt,quest}=flightQuest,missions=window.RiftMissions;
 const current=currentCharacterGeneration();
 if(current===undefined)return 'pending';
 if(current!==generation)return 'stale';
 const accepted=quest==='intercept'?missions?.getIntercept?.():missions?.getQualification?.(quest);
 if(accepted&&accepted.acceptedAt!==acceptedAt)return 'stale';
 const saved=quest==='intercept'?missions?.winIntercept?.(generation,acceptedAt):
  missions?.winQualification?.(quest,generation,acceptedAt);
 if(saved)return 'saved';
 const after=currentCharacterGeneration();
 return after!==undefined&&after!==generation?'stale':'pending';
}
const questFailure='You won, but the mission result is not saved. Retry before returning to the Carrier.';
const staleQuest='This sortie belongs to an earlier pilot or mission. Its result was not saved.';
const questComplete='All six waves cleared. Report to Admiral Bishop on the Bridge.';
const testComplete='All 10 Vandul defeated. No career progress was saved.';
const soloTrainingComplete='All six Vandul waves cleared. No career progress was saved.';
function holdQuestVictory(dep){
 dep.done=true;state='complete';
 showMissionComplete(dep.questSave==='stale'?staleQuest:questFailure);
}
function retryQuestVictory(){
 const dep=missionDeparture;
 if(state!=='complete'||dep?.questSave!=='pending'||routeParked)return;
 dep.questSave=saveQuestVictory();
 if(dep.questSave!=='saved'){holdQuestVictory(dep);return;}
 // Only the quest record is retried. The victory reward was already handled.
 dep.done=false;finishMissionDeparture(dep);
}
function beginMissionDeparture(){
 if(missionDeparture||!duelEnabled||duelResult!=='victory'||state!=='play')return;
 if(flightMode.simWatch){
  state='complete';clearInput();syncArrivalControls();
  menu('Six waves cleared','The AI pilot completed the training run. No progress saved.','reset','Watch again','SIMULATOR DEBRIEF');
  overlay.innerHTML+=button('Return to Hangar','main-menu');return;
 }
 let amount=0;
 try{
  const reward=canCreditThisFlight()?window.RiftCredits?.awardVictory(managedBuild?flightGeneration:undefined):null;
  if(reward?.saved===true&&Number.isSafeInteger(reward.amount)&&reward.amount>0)amount=reward.amount;
 }catch{}
 sortieCredits+=amount;
 const questSave=saveQuestVictory();
 missionDeparture={elapsed:0,from:{x:p.x,y:p.y,aim:p.aim},craft:{...p},amount,questSave,flying:false,done:false};
 state='depart';returnFlightToCarrier=true;syncFlightExit();syncArrivalControls();showShieldControl();
 p.vx=p.vy=0;clearInput();releasePhoneAudio();retireAudio();
 shots=[];vandulLasers=[];vandulIngress=null;duelCountdown=0;waveCountdownFresh=false;
 updateHud();updateDuelCountdown();updateDuelReadout();
 if(questSave==='pending'||questSave==='stale'){holdQuestVictory(missionDeparture);return;}
 showMissionComplete(isWingmanTest()?testComplete:(flightMode.id===soloTrainingFlight.id||flightMode.tileTest)?soloTrainingComplete:questSave==='saved'?questComplete:
  'All Vandul fighters defeated. Returning to the Carrier.');
}
function finishMissionDeparture(dep){
 if(dep.done)return;
 dep.done=true;state='complete';
 if(!flushBattleDamage()){warnDamageSave();return;}
 showMissionComplete(isWingmanTest()?testComplete:(flightMode.id===soloTrainingFlight.id||flightMode.tileTest)?soloTrainingComplete:dep.questSave==='saved'?questComplete:
  'All Vandul fighters defeated. Select Return to Carrier if the view does not change.',true);
 try{window.location.replace(carrierReturnPath(flightMode));}catch{}
}
function advanceMissionDeparture(dt){
 const dep=missionDeparture;
 if(!dep||dep.done||routeParked)return;
 dep.elapsed+=dt;
 if(dep.elapsed<missionFlight.hold)return;
 if(motion?.matches){finishMissionDeparture(dep);return;}
 if(!dep.flying){dep.flying=true;overlay.hidden=true;liveFocus();}
 const t=clamp((dep.elapsed-missionFlight.hold)/missionFlight.travel,0,1);
 const ease=t*t*(3-2*t),from=dep.from,craft=dep.craft;
 // Follow a southbound visual arc into the reserved apron. The real player
 // never moves, fires or touches cover/wrecks after the final kill.
 craft.x=launch.x+(from.x-launch.x)*(1-ease)**3;
 craft.y=from.y+(missionFlight.toY-from.y)*ease;
 const heading=Math.atan2(missionFlight.toY-from.y,3*(launch.x-from.x)*(1-ease)**2);
 const turn=((heading-from.aim+3*Math.PI)%TAU)-Math.PI;
 const blend=clamp(t/.21,0,1);
 craft.aim=from.aim+turn*blend*blend*(3-2*blend);
 updateFlightVisual(craft,dt,p.speed,true);
 if(t>=1-1e-9)finishMissionDeparture(dep);
}
const restart=event=>{
 if(onlineBattle||isCrossWatch()||state==='menu'||transferTransit||playerIngress||missionDeparture||document.hidden||hangarDialog?.open)return;
 if(!flushBattleDamage()){warnDamageSave();return;}
 if((requiresBattleRepair()&&p.hp<=0)||!loanerSnapshot&&!canLaunchBuild()){enterMainMenu();return;}
 unlockAudio(undefined,event);
 const sortie=pendingCarrierSortie;
 if(sortie&&!carrierSortieCurrent(sortie)){failCarrierSortie(sortie);return;}
 const rematch=isTileBattle()?flightMode.tileReturn?.sortie:null;
 const result=sortie?stageCarrierSortie(sortie.mode,sortie.title,sortie.check):rematch?stageCarrierSortie(rematch.mode,rematch.title,rematch.check):start(flightMode);
 if(result&&arenaSettings)arenaSettings.open=false;
};
function updateCustomRange(){
 if(!rangePanel)return;
 const available=!!flightMode.loaner&&state==='play'&&capitalShip?.phase==='flight'&&!document.hidden&&!routeParked;
 rangePanel.hidden=!available;
 if(!available)return;
 const label=rangeTargets.length?'Reset range':'Target range';
 if(rangeButton.textContent!==label)rangeButton.textContent=label;
 const status=rangeMessage||(rangeTargets.length?rangeScore+(rangeScore===1?' hit':' hits')+' · '+rangeTargets.filter(target=>!target.cleared).length+' / '+rangeTargets.length+' ready':'Optional · no saves');
 if(rangeReadout.textContent!==status)rangeReadout.textContent=status;
}
rangeButton?.addEventListener('click',event=>{
 if(event.isTrusted!==true||!flightMode.loaner||state!=='play'||capitalShip?.phase!=='flight'||document.hidden||routeParked)return;
 const view=flightCamera(),bounds=capitalShip.hull,valid=point=>
  Math.hypot(point.x-p.x,point.y-p.y)>75&&point.x>=Math.max(view.x+35,arena.left+25)&&point.x<=Math.min(view.x+view.w-35,arena.right-25)&&
  point.y>=Math.max(view.y+62,arena.top+25)&&point.y<=Math.min(view.y+view.h-30,arena.bottom-25)&&
  bounds.every(b=>sweptCircle(p.x-b.x,p.y-b.y,point.x-p.x,point.y-p.y,b.r+17)===null);
 for(const turn of [0,.84,-.84,1.66,-1.66,2.53,-2.53,Math.PI]){
  const angle=p.aim+turn,u=Math.cos(angle),v=Math.sin(angle);
  const positions=[[-49,118],[0,156],[49,118]].map(([x,y])=>({x:p.x-v*x+u*y,y:p.y+u*x+v*y}));
  if(!positions.every(valid))continue;
  rangeCycle++;rangeScore=0;rangeClock=0;rangeMessage='';
  rangeTargets=positions.map(({x,y})=>({x,y,prevX:x,prevY:y,r:16,rangeTarget:true,cleared:false}));
  autoLock=null;updateCustomRange();liveFocus();return;
 }
 rangeMessage='Fly clear, then try again';updateCustomRange();
});
capitalAction?.addEventListener('click',requestCapitalManeuver);
capitalStore?.addEventListener('click',storeCapitalFighter);
function cancelCapitalHangarApproach(){
 if(!capitalHangarApproach)return;
 capitalHangarApproach=null;updateCapitalHud();
}
function finishCapitalHangarApproach(){
 const approach=capitalHangarApproach,ship=capitalShip;
 if(loanerSnapshot||!approach||approach.navigating||approach.ship!==ship||ship?.phase!=='stored'||
  state!=='play'||document.hidden||routeParked||hangarDialog?.open)return;
 approach.navigating=true;
 const destination='./index.html?hangar=carrier'+(ship.vessel===bifrostCapital?'&vessel=bifrost':flightMode.explicitPegasus?'&vessel=rift-carrier':'');
 try{window.location.replace(destination);}catch{cancelCapitalHangarApproach();}
}
capitalHangar?.addEventListener('click',event=>{
 const c=capitalShip;
 if(c?.phase!=='stored'||event.isTrusted!==true||state!=='play'||document.hidden||routeParked||hangarDialog?.open||capitalHangarApproach)return;
 if(loanerSnapshot){
  enterMainMenu(false,true);
  return;
 }
 capitalHangarApproach={ship:c,elapsed:0,navigating:false};
 updateCapitalHud();
 if(motion?.matches)finishCapitalHangarApproach();
});
resetFieldButton?.addEventListener('click',restart);
if(!resetFieldButton)hud.addEventListener('click',event=>{if(event.target.closest('#reset-field'))restart(event);});
function canPauseFlight(){return !onlineBattle&&(state==='play'||state==='arrive');}
function syncPauseControl(){for(const btn of [pauseFlightButton,scaleFlyPauseButton])if(btn)btn.disabled=!canPauseFlight();}
function pause(){
 if(state==='pause'){state=playerIngress?'arrive':'play';if(flightMode.simWatch&&simWatchPause)simWatchPause.textContent='Pause';updateWingRadio();syncPauseControl();if(playerIngress||duelCountdown>0||vandulIngress||capitalShip||escortShip)last=0;overlay.hidden=true;updateDuelCountdown();updateCapitalHud();if(['docked','stored'].includes(capitalShip?.phase))capitalAction?.focus({preventScroll:true});else liveFocus();syncArenaMusic();return;}
 if(!canPauseFlight())return;
 state='pause';if(flightMode.simWatch&&simWatchPause)simWatchPause.textContent='Resume';cancelCapitalHangarApproach();updateWingRadio();syncPauseControl();updateDuelCountdown();updateCapitalHud();stopArenaMusic();clearInput();
 menu(flightMode.simWatch?'Simulator paused':playerIngress?'Entry paused':'Flight paused',flightMode.simWatch?'Resume to keep watching.':playerIngress?'Resume to continue leaving the Carrier.':'Your ship is holding its position.','resume',flightMode.simWatch?'Resume watching':'Resume flight','RUN PAUSED');
 overlay.innerHTML+=button(returnFlightToCarrier?flightExitLabel():'Main Menu','main-menu');
 overlay.querySelector('button')?.focus({preventScroll:true});
}
let resumeAfterHangar=false,hangarInvoker=null,returnHangarToCarrier=false;
// Recognize only our own literal route. There is no user-provided return URL.
let carrierLinkedRoute=window.location?.search,routeParked=false;
if(!crossBattleWatchRequest&&!crossBattleRequest&&!galaxyTransferRequest&&!customFlightRequest&&carrierLinkedRoute!=='?hangar=carrier'&&carrierLinkedRoute!==pegasusHangar&&!bifrostHangarRoutes.has(carrierLinkedRoute)&&!hangarOrderFromRoute(carrierLinkedRoute)&&!carrierFlightRoutes.has(carrierLinkedRoute)&&!stagedCarrierRoutes.has(carrierLinkedRoute))carrierLinkedRoute=null;
const fitLookup=id=>document.getElementById(id);
const weaponPicker=fitLookup('fit-weapon-picker'),weaponPickerGrid=fitLookup('fighter-fit-grid'),weaponPickerSlot=fitLookup('fit-picker-slot'),weaponPickerDone=fitLookup('fit-picker-done');
const weaponMounts=Object.fromEntries(['primary','secondary'].map(slot=>[slot,{
 button:fitLookup('fit-'+slot+'-picture'),image:fitLookup('fit-'+slot+'-image'),empty:fitLookup('fit-'+slot+'-empty'),
 title:fitLookup('fit-'+slot+'-title'),select:slot==='primary'?fitPrimary:fitSecondary
}]));
const weaponImages={[sparrow]:'./sparrow-s2-gimbal-laser.webp',blaster:'./sterling-module.webp?v=58',ballistic:'./alkine-module.webp?v=58',ak77:'./ak77-module.webp?v=58'};
const weaponCards=Object.fromEntries([...Object.keys(weaponImages),'empty'].map(id=>[id,{
 button:fitLookup('fit-pick-'+id),badge:fitLookup('fit-pick-'+id+'-status'),summary:fitLookup('fit-pick-'+id+'-summary')
}]));
const weaponPickerReady=!!(weaponPicker&&weaponPickerGrid&&weaponPickerSlot&&weaponPickerDone&&
 Object.values(weaponMounts).every(m=>m.button&&m.image&&m.empty&&m.title&&m.select)&&
 Object.entries(weaponCards).every(([id,c])=>id===sparrow||c.button&&c.badge));
let weaponSlot=null;
const slotTitle=slot=>gunFitSize(hullId)===2?(slot==='primary'?'Left Size 2 wing mount':'Right Size 2 wing mount'):(slot==='primary'?'Primary weapon':'Secondary weapon');
function refreshWeaponPictures(wallet=readBuildWallet()){
 if(!weaponPickerReady)return;
 for(const [slot,m] of Object.entries(weaponMounts)){
  const id=fighterFit[slot],title=guns[id]?.fullLabel??'Empty slot';
  m.title.textContent=title;m.button.setAttribute('aria-label','Choose '+slotTitle(slot).toLowerCase()+'. Currently '+title);
  if(id&&m.image.getAttribute('src')!==weaponImages[id])m.image.setAttribute('src',weaponImages[id]);
  if(!id)m.image.removeAttribute('src');
  m.image.hidden=!id;m.empty.hidden=!!id;
  m.button.setAttribute('aria-expanded',String(weaponSlot===slot));
 }
 for(const [id,c] of Object.entries(weaponCards)){
  if(!c.button||!c.badge)continue;
  const value=id==='empty'?null:id,gun=guns[id];
  const selected=!!weaponSlot&&fighterFit[weaponSlot]===value;
  const other=weaponSlot==='primary'?'secondary':'primary';
  const onOther=!!value&&fighterFit[other]===value;
  const twin=gunFitSize(hullId)===2;
  const locked=!!gun&&(!ownedSlot(weaponSlot??'primary',id,wallet)||twin&&!selected&&sparrowSides(fighterFit).length>=availableSparrows());
  c.button.hidden=twin?id!==sparrow&&id!=='empty': id===sparrow||id==='empty'&&weaponSlot!=='secondary'&&!managedBuild;
  c.button.disabled=locked;
  c.button.setAttribute('aria-pressed',String(selected));
  c.badge.textContent=locked?(twin?'No spare copy':'Buy in Shop'):selected?'Fitted':!twin&&onOther?(fighterFit[weaponSlot]?'Swap mounts':'On primary'):'';
  c.badge.hidden=!c.badge.textContent;
  if(c.summary&&gun)c.summary.textContent=gun.damage+' dmg/shot · Weight '+gun.weight+' · '+(gun.burst??normalBurst).pattern.length+' rounds/volley · '+gunRateText(gun);
 }
}
function setWeaponPicker(slot,returnFocus=false){
 if(!weaponPickerReady)return;
 const previous=weaponSlot;weaponSlot=slot;
 weaponPicker.hidden=!slot;weaponPickerGrid.hidden=!!slot;
 refreshWeaponPictures();
 if(slot){
  weaponPickerSlot.textContent=slotTitle(slot);
  const selected=weaponCards[fighterFit[slot]??'empty']?.button;
  const next=selected&&!selected.hidden&&!selected.disabled?selected:weaponPickerDone;
  next.focus();
 }else if(returnFocus&&previous)weaponMounts[previous].button.focus();
}
if(weaponPickerReady){
 for(const [slot,m] of Object.entries(weaponMounts)){
  m.select.hidden=true;m.button.hidden=false;
  m.button.addEventListener('click',()=>{
   if(fittingAllowed())setWeaponPicker(slot);
  });
 }
 for(const [id,{button}] of Object.entries(weaponCards))button?.addEventListener('click',()=>{
  if(!weaponSlot||!fittingAllowed())return;
  const slot=weaponSlot,value=id==='empty'?null:id;
  if(value===null&&slot!=='secondary'&&!managedBuild)return;
  cancelHangarPress();changeFighterFit(slot,value);
  if(fighterFit[slot]===value)setWeaponPicker(null,true);
 });
 weaponPickerDone.addEventListener('click',()=>setWeaponPicker(null,true));
 weaponPicker.addEventListener('keydown',event=>{
  if(event.key!=='Escape'&&event.code!=='Escape')return;
  event.preventDefault();event.stopPropagation();setWeaponPicker(null,true);
 });
}
const fitLabels={engine:'engine',core:'power core',battery:'reserve cell',primary:'primary weapon'};
function showFitSelect(select,value,wallet){
 if(!select)return;
 for(const option of select.options??[])if(option.value){
  const weapon=select===fitPrimary||select===fitSecondary;
  option.hidden=weapon&&!compatibleGun(option.value);
  option.disabled=option.hidden||!(weapon?ownedSlot(select===fitPrimary?'primary':'secondary',option.value,wallet):ownsBuildPart(option.value,wallet))||
   weapon&&option.value===sparrow&&option.value!==value&&sparrowSides(fighterFit).length>=availableSparrows();
 }
 select.value=value??'';
}
// Ambient pad traffic is visual only. It does not touch the carrier's roster,
 // ship stock, parking receipts, or launch-ready strength.
const hangarAmbientBays=['01','02','04','06'];
const hangarAmbientHulls=['rift-fighter','bastion-9','stocky-light-fighter'];
const hangarAmbientImages=['ready','damaged'].map(view=>hangarAmbientBays.map(bay=>
 document.getElementById('hangar-ambient-'+view+'-'+bay)));
let hangarAmbientVisit=null,hangarAmbientLastBerth=null;
function rollHangarAmbient(random=Math.random){
 const order=hangarAmbientBays.slice();
 for(let i=order.length-1;i>0;i--){
  const j=Math.floor(random()*(i+1));
  [order[i],order[j]]=[order[j],order[i]];
 }
 return {order,count:1+Math.floor(random()*2),hulls:Object.fromEntries(order.map(bay=>
  [bay,hangarAmbientHulls[Math.floor(random()*hangarAmbientHulls.length)]]))};
}
function paintHangarAmbient(berth){
 if(!hangarAmbientVisit||berth===hangarAmbientLastBerth)return;
 hangarAmbientLastBerth=berth;
 const occupied=new Set(hangarAmbientVisit.order.filter(bay=>bay!==berth).slice(0,hangarAmbientVisit.count));
 for(const view of hangarAmbientImages)for(const [i,img] of view.entries()){
  if(!img)continue;
  const bay=hangarAmbientBays[i];
  if(!occupied.has(bay)){img.hidden=true;continue;}
  const hull=hangarAmbientVisit.hulls[bay],art=fighterRegistry?.get(hull)?.art??'./fighter-winged.png?v=23';
  img.dataset.hull=hull;
  if(img.getAttribute('src')!==art)img.setAttribute('src',art);
  img.hidden=false;
 }
}
function showFighterFit(prefix=''){
 if(crossBattleWatchRequest||loanerSnapshot||customFlightRequest&&!hangarDialog?.open)return;
 if(hangarDialog?.open){
  const guest=aboardGuestHangar(),home=fighterParkedVessel();
  if(playerHangarView)playerHangarView.hidden=guest||!!cockpitSession;
  if(guestHangarView)guestHangarView.hidden=!guest||!!cockpitSession;
  const heading=document.getElementById('hangar-bay-heading');
  if(heading)heading.textContent=guest?'GUEST HANGAR · '+vesselName(hangarVessel).toUpperCase():'PERSONAL FIGHTER BAY · 01';
  if(guest){
   const link=document.getElementById('guest-hangar-home'),note=document.getElementById('guest-hangar-note');
   link?.setAttribute('href','./index.html?hangar=carrier&vessel='+home);
   if(note)note.textContent='Your selected fighter is at '+vesselName(home)+'. You can test a loaner here.';
   if(link)link.textContent=home===hangarHomeVessel()?'Go to Home Hangar':'Go to Fighter Hangar';
   if(guestLocalFighter){
    const id=selectableHulls()[0];
    guestLocalFighter.hidden=!id||!fighterRegistry;
    if(id)guestLocalFighter.textContent='Use local '+fighterRegistry.get(id).name;
   }
   if(guestLoaner)guestLoaner.disabled=!fighterRegistry;
   return;
  }
 }
 const berth=parkedBay(hullId),bay=String(berth===6?4:berth===4?3:berth).padStart(2,'0');
 const berthId=String(berth).padStart(2,'0');
 if(playerHangarView)playerHangarView.dataset.bay=berthId;
 if(hangarDialog?.open)paintHangarAmbient(berthId);
 const bayTitle=document.getElementById('hangar-bay-heading');
 if(bayTitle&&hangarDialog?.open)bayTitle.textContent='PERSONAL FIGHTER BAY · '+bay;
 for(const id of ['hangar-damaged-bay-label','hangar-repaired-bay-label']){
  const label=document.getElementById(id);
  if(label)label.textContent='HANGAR DECK · BAY '+bay;
 }
 const saved=flushBattleDamage(),wallet=readBuildWallet(),condition=saved?fighterHullCondition(wallet):'unavailable',required=missingFitParts(wallet);
 const repairing=condition==='repairing',repaired=condition==='repaired';
 const raw=readHullRaw(),damage=hullDamage(raw),partial=repaired&&!!damage;
 const finished=repaired&&hasFinishedHangarRepair(raw);
 const hullOwned=repaired||repairing||condition==='damaged';
 const hull=fighterRegistry?.get(hullId),name=hull?.name??'Rift-3 Fighter',choices=selectableHulls(),alternate=hullId!==starterHullId;
 const trial=hangarDialog?.open?hangarDisplayHull(hangarTryHull):null;
 renderHangarFighterPreview(condition,hullOwned,choices);
 if(directRepairButton){directRepairButton.hidden=!repaired||(alternate||finished)&&!partial;directRepairButton.disabled=!wallet;}
 if(parkedHullArt){
  const art=trial?.art??(alternate?hull.art:finished?'./fighter-winged.png?v=23':'./fighter-salvage-damaged.webp?v=76');
  if(parkedHullArt.getAttribute('src')!==art)parkedHullArt.setAttribute('src',art);
  parkedHullArt.style?.setProperty('scale',trial?.id===civilianFreighter.id?'1.36':'');
 }
 const brokenArt=document.getElementById('hangar-damage-fighter');
 if(brokenArt){
  const art=hull?.damageArt??'./fighter-salvage-damaged.webp?v=76';
  if(brokenArt.getAttribute('src')!==art)brokenArt.setAttribute('src',art);
  brokenArt.setAttribute('alt',alternate?name+' with hull damage':'Rift-3 with chipped wings and a cracked canopy');
  brokenArt.style?.setProperty('filter',alternate?'saturate(.4) brightness(.75)':'');
 }
 if(damagedBay)damagedBay.setAttribute('aria-label','Damaged '+name+' in Bay '+bay);
 if(repairedBay)repairedBay.setAttribute('aria-label',(trial?.name??name)+' in Bay '+bay);
 const rig=document.getElementById('hangar-rift-rig');
 rig?.setAttribute('visibility',alternate||trial?'hidden':'visible');
 if(canopyButton)canopyButton.hidden=alternate||!!trial;
 if(canopyHint)canopyHint.hidden=alternate||!!trial;
 const gimbalNote=document.getElementById('fit-gimbal-note');
 if(gimbalNote){gimbalNote.hidden=!alternate;if(alternate)gimbalNote.textContent='Size 2 gimbal mounts only. Both Sparrow S2s come fitted from the factory. You can remove either one. Size 3 guns remain in inventory.';}
 const twin=gunFitSize(hullId)===2,mountLabel=document.getElementById('fit-primary-label'),secondaryLabel=document.getElementById('fit-secondary-label');
 if(mountLabel)mountLabel.textContent=twin?'Left Size 2 wing mount':'Primary Size 3 weapon';
 if(secondaryLabel)secondaryLabel.textContent=twin?'Right Size 2 wing mount':'Secondary Size 3 weapon';
 const remaining=repairing?clamp(hullRepairReadyAt-Date.now(),0,hullRepairSpan):0;
 const repairSeconds=Math.ceil(remaining/1000);
 if(repairProgress){
  const value=repairing?Math.floor(100*(hullRepairSpan-remaining)/hullRepairSpan):0;
  if(repairProgress.max!==100)repairProgress.max=100;
  if(repairProgress.value!==value)repairProgress.value=value;
 }
 if(repairProgressWrap)repairProgressWrap.hidden=!repairing;
 if(damagedBay)damagedBay.hidden=!!trial||condition!=='damaged'&&!repairing&&!partial;
 if(repairedBay)repairedBay.hidden=!trial&&(!repaired||partial);
 if(playerLoadout)playerLoadout.hidden=!repaired||!!trial;
 if(hangarBayActions)hangarBayActions.hidden=!repaired&&!trial;
 syncCorsairWingSetup(repaired);
 if(hangarLoaner)hangarLoaner.hidden=state!=='menu'||!!boarding||!!trial||repaired&&!!wallet||!fighterRegistry;
 if(hangarBoard){hangarBoard.hidden=!repaired&&!trial;hangarBoard.disabled=!trial&&(!repaired||!wallet)||state!=='menu'||!!boarding||!!formationStage&&formationStage!=='ready';}
 if(salvagePreview)salvagePreview.hidden=condition!=='unclaimed';
 const recoveryTitle=document.getElementById('fit-hull-recovery-title'),story=document.getElementById('fit-hull-recovery-story');
 if(recoveryTitle)recoveryTitle.textContent=(alternate||damage?'Repair the ':'Recover the ')+name;
 if(story)story.hidden=alternate||!!damage;
 const battle=damage?'Battle damage · '+damage.hullHp+' / '+damage.maxHullHp+' hull HP. ':'';
 const summary=!saved?'Could not save battle damage. Flight is locked.':!wallet?'Pilot inventory unavailable. Flight is locked.':
  condition==='unavailable'?'Ship ownership unavailable. Flight is locked.':
  condition==='unclaimed'?'No ship yet. Visit the Hangar to claim the Rift-3 Fighter.':
  condition==='damaged'?(battle||'Rift-3 Fighter recovered. ')+'Repair required before fitting or flight.':
  condition==='repairing'?battle+(repairSeconds?'Repair in progress · '+Math.floor(repairSeconds/60)+':'+String(repairSeconds%60).padStart(2,'0')+' remaining.':'Repair finished. Checking that it saved…'):required.length?
  battle+'Not launch-ready. Fit: '+required.map(slot=>slot==='primary'&&twin?'at least one wing laser':fitLabels[slot]).join(', ')+'.':battle+(partial?'Flight ready or repair for free.':'Flight ready.');
 if(playerHangarView){playerHangarView.dataset.fighter=trial?'repaired':condition;playerHangarView.dataset.loaner=trial?'true':'false';}
 if(claimHullButton){claimHullButton.hidden=condition!=='unclaimed';claimHullButton.disabled=!wallet;}
 if(repairHullButton){repairHullButton.hidden=condition!=='damaged';repairHullButton.disabled=!wallet;}
 for(const node of [buildStatus,mainBuildStatus,hullRecoveryStatus])if(node&&node.textContent!==summary)node.textContent=summary;
 const owned=refreshShieldOwnership(),fitted=fittedShield();
 if(fitAegis)fitAegis.disabled=!owned;
 if(fitShield)fitShield.value=fitted?'aegis-s3':'';
 if(fitShieldStat)fitShieldStat.textContent=fitted?fitted.capacity+' HP · '+fitted.duration+'s active · '+fitted.cooldown+'s cooldown · '+Math.round(fitted.absorption.energy*100)+'% laser / '+Math.round(fitted.absorption.ballistic*100)+'% ballistic · Weight '+fitted.weight+' · '+fitted.he3PerSecond+' He3/s active':
  owned?'No shield fitted':'Buy Aegis at the Carrier Shop · 200 credits';
 showFitSelect(fitEngine,fighterLoadout.engine,wallet);
 showFitSelect(fitCore,fighterLoadout.power,wallet);
 showFitSelect(fitBattery,fighterLoadout.battery,wallet);
 showFitSelect(fitPrimary,fighterFit.primary,wallet);
 showFitSelect(fitSecondary,fighterFit.secondary,wallet);
 for(const [id,moduleId,badge] of [['core',fighterLoadout.power,fitCoreBadge],['battery',fighterLoadout.battery,fitBatteryBadge]]){
  const module=document.getElementById('fit-'+id+'-module'),empty=document.getElementById('fit-'+id+'-empty');
  if(module)module.hidden=!moduleId;
  if(empty)empty.hidden=!!moduleId;
  document.getElementById('fit-'+id)?.setAttribute('aria-describedby','fit-'+id+(moduleId?'-spec':'-empty'));
  const part=moduleId?partProfiles[id][moduleId]:null;
  const title=document.getElementById('fit-'+id+'-title'),spec=document.getElementById('fit-'+id+'-spec');
  if(part){
   const art=document.getElementById('fit-'+id+'-art'),source=part.art??(id==='core'?'./weifer-he3-core.webp?v=74':'./kestrel-h20-cell.webp?v=74');
   if(art&&art.getAttribute('src')!==source)art.setAttribute('src',source);
   if(title)title.textContent=part.name;
   if(spec)spec.textContent=id==='core'?part.he3PerSecond+' He3 per second · Weight '+part.weight:
    part.capacityHe3+' He3 capacity · Weight '+part.weight+' · '+part.medium;
  }
  if(badge)badge.textContent=moduleId?'Equipped':'';
 }
 if(hangarEngineTest)hangarEngineTest.disabled=!!trial||!fittedEngine();
 refreshHangarEngineAudio();
 refreshWeaponPictures(wallet);
 if(fitHullStat)fitHullStat.textContent=' · Hull '+(partial?damage.hullHp+'/':'')+fittedFighter().hullHp+' HP';
 if(fitWeightStat)fitWeightStat.textContent=' · Total weight '+fittedWeight();
 if(fitEngineStat){
  const engine=fittedEngine();
  fitEngineStat.textContent=engine?'Speed rating '+engine.speedRating+' · Rated '+engine.speedRating*speedPerRating+' u/s · Strength '+engine.strength+
   ' · Weight '+engine.weight+' · Fitted forward '+Math.round(engine.speedRating*speedPerRating*flightMassRatios(fittedWeight()).speed)+' u/s'+(engine.surge?' · Surge: double-tap main thrust or E. 4 He3 · 6s cooldown.':''):'No engine fitted';
 }
 const mountStats=id=>{
  const gun=guns[id];if(!gun)return 'No weapon fitted';
  const impact=Math.min(gun.speed*gun.push,gun.pushMax);
  const pushLabel=impact>=200?'Heavy':impact>=150?'Medium':'Light';
  return gun.damage+' dmg/shot'+(gun.wingMount?' · 0.5 He3/shot':'')+(gun.burstOnly?' · '+gun.burst.pattern.length+' per burst':'')+' · Weight '+gun.weight+' · '+pushLabel+' target push · '+gunRateText(gun);
 };
 if(fitPrimaryStat)fitPrimaryStat.textContent=mountStats(fighterFit.primary);
 if(fitSecondaryStat)fitSecondaryStat.textContent=mountStats(fighterFit.secondary);
 if(fitStatus){
  const primary=guns[fighterFit.primary]?.label??'Empty',secondary=guns[fighterFit.secondary]?.label??'empty';
  fitStatus.textContent=prefix+primary+(twin?' left · ':' primary · ')+secondary+(twin?' right.':' secondary.');
 }
}
// Include the civilian trial in the preview carousel only, never in owned hulls.
const hangarDisplayHull=id=>id===civilianFreighter.id?civilianFreighter:fighterRegistry?.get(id);
function hangarPreviewHulls(){
 const ids=fighterRegistry?.ids;
 return ids?[...ids.slice(0,-1),civilianFreighter.id,ids.at(-1)]:[hullId];
}
function renderHangarFighterPreview(condition,hullOwned,ownedHere=selectableHulls()){
 const ids=hangarPreviewHulls();
 if(!ids.includes(hangarPreviewId))hangarPreviewId=hullId;
 const id=hangarPreviewId,profile=hangarDisplayHull(id),active=id===hullId;
 const owned=ownedHullChoices().includes(id),local=ownedHere.includes(id);
 const available=!aboardGuestHangar()&&managedBuild&&state==='menu'&&!boarding&&!cockpitSession;
 const rental=available&&!active&&!owned&&!!profile?.art,trying=id===hangarTryHull;
 const canSelect=available&&(rental||(active?hullOwned:local));
 if(hangarShipChoice)hangarShipChoice.hidden=!(hullOwned||managedBuild&&ids.length>1);
 if(hangarShipSelect){hangarShipSelect.value=hullOwned||ownedHere.length>1?hullId:'';hangarShipSelect.disabled=true;}
 for(const key of ['prev','next']){
  const arrow=document.getElementById('hangar-ship-'+key);
  if(arrow)arrow.disabled=!available||ids.length<2;
 }
 const name=profile?.name??'Rift-3 Fighter',title=document.getElementById('hangar-ship-name'),card=document.getElementById('hangar-ship-banner-art');
 if(title)title.textContent=name;
 if(card&&profile?.cardArt&&card.getAttribute('src')!==profile.cardArt)card.setAttribute('src',profile.cardArt);
 if(hangarShipCaption){
  hangarShipCaption.hidden=false;
  hangarShipCaption.textContent=id===civilianFreighter.id?(trying?'Vessel Class · On your pad · Unarmed':'Vessel Class · Unarmed · Solo Free Flight'):trying?'Loaner on your pad · Solo Free Flight':active?(condition==='repairing'?'Repair in progress.':condition==='unclaimed'?'Unclaimed salvage.':condition==='repaired'?'Selected · Tap to see it in the hangar.':name+' needs repairs.'):local?'Tap the banner to select this fighter.':owned?'Owned · Parked at another carrier.':'Try without buying · Solo Free Flight.';
 }
 const controls=document.getElementById('hangar-preview-actions'),select=document.getElementById('hangar-preview-select'),rent=document.getElementById('hangar-preview-rent');
 const returnLoaner=document.getElementById('hangar-return-loaner');
 if(controls)controls.hidden=!rental&&!hangarTryHull;
 if(select){select.disabled=!canSelect;select.setAttribute('aria-label',rental?'Try '+name+' on your pad':active?'Show '+name+' in hangar':'Select '+name+' and show it in the hangar');}
 if(rent)rent.hidden=!rental||trying;
 if(returnLoaner)returnLoaner.hidden=!hangarTryHull;
}
for(const [key,step] of [['prev',-1],['next',1]]){
 document.getElementById('hangar-ship-'+key)?.addEventListener('click',()=>{
  if(aboardGuestHangar()||!managedBuild||!fighterRegistry||!hangarDialog?.open||state!=='menu'||boarding||cockpitSession)return;
  const ids=hangarPreviewHulls();
  if(ids.length<2)return;
  hangarPreviewId=ids[(ids.indexOf(hangarPreviewId??hullId)+step+ids.length)%ids.length];
  const condition=fighterHullCondition();
  renderHangarFighterPreview(condition,['repaired','repairing','damaged'].includes(condition));
 });
}
function pickHangarFighter(event){
 if(event.isTrusted!==true||event.currentTarget?.disabled||aboardGuestHangar()||!managedBuild||!hangarDialog?.open||
    state!=='menu'||document.hidden||routeParked||boarding||cockpitSession||!flushBattleDamage())return;
 const id=hangarPreviewId;
 if(id!==hullId&&hangarDisplayHull(id)?.art&&!ownedHullChoices().includes(id)){
  cancelHangarPress();setWeaponPicker(null);setCanopy(false);resetHangarFormation();
  hangarTryHull=id;showFighterFit();repairedBay?.focus?.({preventScroll:true});repairedBay?.scrollIntoView?.({block:'start'});return;
 }
 if(!selectableHulls().includes(id))return;
 hangarTryHull=null;
 if(id!==hullId){
  if(!fighterRegistry?.select(id))return;
  cancelHangarPress();setWeaponPicker(null);setCanopy(false);hullId=id;
  hydrateFighterParking(id);refreshStoredFit();
 }
 showFighterFit();refreshCockpit();
 const bay=[repairedBay,damagedBay].find(panel=>panel&&!panel.hidden);
 if(bay){resetHangarFormation();bay.focus?.({preventScroll:true});bay.scrollIntoView?.({block:'start',inline:'nearest'});}
}
document.getElementById('hangar-preview-select')?.addEventListener('click',pickHangarFighter);
document.getElementById('hangar-preview-rent')?.addEventListener('click',pickHangarFighter);
document.getElementById('hangar-return-loaner')?.addEventListener('click',event=>{
 if(event.isTrusted!==true||!hangarTryHull||!hangarDialog?.open||boarding||cockpitSession)return;
 hangarTryHull=null;hangarPreviewId=hullId;showFighterFit();
});
guestLocalFighter?.addEventListener('click',event=>{
 if(event.isTrusted!==true||!hangarDialog?.open||!aboardGuestHangar()||state!=='menu'||cockpitSession||document.hidden||routeParked)return;
 const next=selectableHulls()[0];
 if(!next||!fighterRegistry?.select(next))return;
 hullId=next;hydrateFighterParking(next);refreshStoredFit();showFighterFit();hangarTitle?.focus();
});
function fittingAllowed(){
 if(hangarTryHull)return false;
 return !!hangarDialog?.open&&!aboardGuestHangar()&&!document.hidden&&(!managedBuild||state==='menu'&&fighterHullCondition()==='repaired');
}
function saveHullRecovery(event,expected,next){
 if(aboardGuestHangar())return;
 const wallet=readBuildWallet(),raw=readHullRaw();
 const generation=currentCharacterGeneration(),damage=hullDamage(raw);
 if(event.isTrusted!==true||!managedBuild||!wallet||state!=='menu'||document.hidden||pendingBattleDamage||generation===undefined||
  !hangarDialog?.open||fighterHullCondition(wallet,raw)!==expected||
  expected==='repaired'&&!damage&&hasFinishedHangarRepair(raw))return;
 if(!saveHullCertificate(next,next==='repairing'?Date.now()+hullRepairDuration(damage):undefined,raw,damage,generation)){
  const status=expected==='repaired'?buildStatus:hullRecoveryStatus;
  if(status)status.textContent='Could not save the hull. No change confirmed.';
  return;
 }
 showFighterFit();
 (next==='damaged'?repairHullButton:hangarTitle)?.focus({preventScroll:true});
}
claimHullButton?.addEventListener('click',event=>saveHullRecovery(event,'unclaimed','damaged'));
repairHullButton?.addEventListener('click',event=>saveHullRecovery(event,'damaged','repairing'));
directRepairButton?.addEventListener('click',event=>saveHullRecovery(event,'repaired','repairing'));
function beginFitEdit(){
 const raw=managedBuild?readShipRaw():null;
 if(managedBuild&&!refreshStoredFit(raw)){
  showFighterFit('Fit not changed. Saved fit is unavailable. ');
  return undefined;
 }
 return raw;
}
function finishFitEdit(saved,success='Fit saved. ',legacyFailure='Fit updated for this session. '){
 if(saved){showFighterFit(success);return;}
 if(managedBuild){
  refreshStoredFit();showFighterFit('Fit not saved. Check the latest saved fit and try again. ');
 }else showFighterFit(legacyFailure);
}
function changeFighterFit(slot,value){
 if(aboardGuestHangar()||managedBuild&&!fittingAllowed()||value!==null&&!ownedSlot(slot,value,readBuildWallet())||
  slot==='primary'&&value===null&&!managedBuild){showFighterFit();return;}
 const raw=beginFitEdit();if(raw===undefined)return;
 if(fighterFit[slot]===value){showFighterFit();return;}
 const previousPrimary=fighterFit.primary;
 if(gunFitSize(hullId)===2){
  if(value===sparrow&&sparrowSides(fighterFit).length>=availableSparrows()){showFighterFit();if(fitStatus)fitStatus.textContent='No spare Sparrow S2. Buy one or free a copy from another mount.';return;}
  fighterFit[slot]=value;
 }else if(slot==='primary'){
  if(value===fighterFit.secondary)fighterFit.secondary=previousPrimary;
  fighterFit.primary=value;
 }else{
  if(value===fighterFit.primary){
   if(fighterFit.secondary===null){showFighterFit();if(fitStatus)fitStatus.textContent='That weapon is already on the primary mount.';return;}
   fighterFit.primary=fighterFit.secondary;
  }
  fighterFit.secondary=value;
 }
 if(p)syncFlightFit();
 if(fighterFit.primary!==previousPrimary||!isMounted(fighterLoadout.weapon))selectGun(fighterFit.primary??fighterFit.secondary);
 showGun();
 const saved=saveShipBuild(fitKey,JSON.stringify({version:1,...fighterFit}),raw);
 finishFitEdit(saved);
}
showFighterFit();
for(const [slot,select] of [['engine',fitEngine],['core',fitCore],['battery',fitBattery]])select?.addEventListener('change',()=>{
 const value=select.value||null;
 if(!fittingAllowed()||value!==null&&!ownedSlot(slot,value,readBuildWallet())||
  value===null&&!managedBuild){showFighterFit();return;}
 const raw=beginFitEdit();if(raw===undefined)return;
 if(value===equippedSlot(slot)){showFighterFit();return;}
 cancelHangarPress();
 fighterLoadout[slot==='core'?'power':slot]=value;
 if(p){syncFlightFit();showFlightPower();}
 const saved=saveShipBuild(engineFitKey,JSON.stringify({version:1,engine:fighterLoadout.engine}),raw);
 finishFitEdit(saved);
});
fitShield?.addEventListener('change',()=>{
 const value=fitShield.value||null;
 if(state!=='menu'||!fittingAllowed()||value!==null&&!ownedSlot('shield',value,readBuildWallet())){showFighterFit();return;}
 const raw=beginFitEdit();if(raw===undefined)return;
 if(value===fighterLoadout.shield){showFighterFit();return;}
 fighterLoadout.shield=value;resetShield();refreshShieldOwnership();
 if(p)syncFlightFit();
 const saved=saveShipBuild(shieldFitKey,value??'',raw);
 finishFitEdit(saved,'Shield fit saved. ','Shield fit updated for this session. ');
});
fitPrimary?.addEventListener('change',()=>{if(hangarDialog?.open)cancelHangarPress();changeFighterFit('primary',fitPrimary.value||null);});
fitSecondary?.addEventListener('change',()=>{if(hangarDialog?.open)cancelHangarPress();changeFighterFit('secondary',fitSecondary.value||null);});
// Match the V30 CSS lift, rest and rail movement, using one bounded cue run.
let canopyAudioRun=0;
const canopyNodes=new Set();
function releaseCanopyNode(voice,stop){
 if(!canopyNodes.delete(voice))return;
 voice.source.onended=null;
 if(stop){try{voice.source.stop();}catch{}}
 for(const node of [voice.source,voice.filter,voice.level]){try{node?.disconnect();}catch{}}
}
function stopCanopyNodes(){for(const voice of canopyNodes)releaseCanopyNode(voice,true);}
function cancelCanopyAudio(){canopyAudioRun++;stopCanopyNodes();}
function canopyPart(hiss,from,to,volume,start,end,elapsed){
 const length=end-Math.max(start,elapsed);
 if(length<.035)return;
 const context=audio,t=context.currentTime+Math.max(0,start-elapsed);
 let source,filter,level,voice;
 try{
  level=context.createGain();
  if(hiss){
   const buffer=context.createBuffer(1,Math.ceil(context.sampleRate*length),context.sampleRate);
   const samples=buffer.getChannelData(0);
   let seed=4711,low=0;
   for(let i=0;i<samples.length;i++){seed=(seed*1664525+1013904223)>>>0;low=.18*low+.82*(seed/2147483648-1);samples[i]=low;}
   source=context.createBufferSource();source.buffer=buffer;
   filter=context.createBiquadFilter();filter.type='bandpass';filter.frequency.setValueAtTime(from,t);filter.frequency.exponentialRampToValueAtTime(to,t+length);
   source.connect(filter);filter.connect(level);
  }else{
   source=context.createOscillator();source.type='triangle';
   source.frequency.setValueAtTime(from,t);source.frequency.exponentialRampToValueAtTime(to,t+length);source.connect(level);
  }
  level.gain.setValueAtTime(0,t);level.gain.linearRampToValueAtTime(volume,t+Math.min(.035,length*.24));level.gain.linearRampToValueAtTime(0,t+length);
  level.connect(master);voice={source,filter,level};canopyNodes.add(voice);
  source.onended=()=>releaseCanopyNode(voice,false);
  source.start(t);source.stop(t+length);
 }catch{
  if(voice)releaseCanopyNode(voice,true);
  else for(const node of [source,filter,level]){try{node?.disconnect();}catch{}}
 }
}
function requestCanopyAudio(open,event){
 cancelCanopyAudio();
 if(!event?.isTrusted||!soundOn||document.hidden||motion?.matches||nativePreview)return;
 const run=canopyAudioRun,clickedAt=audioClock();
 unlockAudio(()=>{
  if(run!==canopyAudioRun||!hangarDialog?.open||document.hidden||!soundOn||motion?.matches||nativePreview||!master||audio?.state!=='running')return;
  const elapsed=Math.max(0,(audioClock()-clickedAt)/1000);
  if(open){
   canopyPart(true,1200,390,.064,0,.18,elapsed);
   canopyPart(false,116,80,.032,.37,1.08,elapsed);
  }else{
   canopyPart(false,84,112,.029,0,.48,elapsed);
   canopyPart(true,780,260,.041,.48,.66,elapsed);
  }
 },event);
}
function setCanopy(open){
 if(canopyRig){
  if(open&&canopyRig.dataset.canopy!=='open')canopyOpenedAt=performance.now();
  if(!open)canopyOpenedAt=-Infinity;
  canopyRig.dataset.canopy=open?'open':'closed';
 }
 if(canopyButton){
  canopyButton.setAttribute('aria-pressed',String(open));
  canopyButton.setAttribute('aria-label',open?'Close canopy':'Open canopy');
 }
 if(canopyHint)canopyHint.textContent=open?'Tap canopy to close':'Tap canopy to open';
}
canopyButton?.addEventListener('click',event=>{
 if(aboardGuestHangar()||!hangarDialog?.open||!canopyRig||boarding||fighterHullCondition()!=='repaired')return;
 const open=canopyRig.dataset.canopy!=='open';
 setCanopy(open);
 requestCanopyAudio(open,event);
});
const cockpitOrigin=()=>hangarVessel==='bifrost'?'bifrost':linkedHangarReturn==='./carrier.html?vessel=rift-carrier'||hangarHomeVessel()==='bifrost'?'rift-carrier':'';
const cockpitIsBifrost=()=>cockpitOrigin()==='bifrost';
const cockpitOnlineLink=side=>(window.location?.hostname==='rift-runner.boundlessghost16.chatgpt.site'
 ?'https://rift-runner.gambizt3.workers.dev/':'./')+'index.html?multiplayer='+(side==='corsair-test'?'corsair-test':'blackwake&side='+side);
function cockpitOrders(generation,origin=cockpitOrigin(),loanerOnly=false,testHull=null){
 const bifrost=origin==='bifrost',explicitPegasus=origin==='rift-carrier';
 const offers=[],missions=window.RiftMissions,rendezvous=window.RiftRendezvous;
 if(generation===undefined||currentCharacterGeneration()!==generation)return offers;
 const addLoaners=()=>{
  for(const [hull,name] of customHullChoices){
   if(!fighterRegistry?.get(hull))continue;
   offers.push({id:'custom-'+hull,title:'Custom Mode · '+name,group:'Custom Mode',
    mode:customMode(hull,bifrost?'bifrost':'rift-carrier'),stamp:origin||'pegasus',detail:'Loaner fighter. No purchase needed; no save changes.'});
  }
 };
 if(testHull&&hangarDisplayHull(testHull)){
  const title=hangarDisplayHull(testHull).name+' · Solo Free Flight';
  return [{id:'loaner-test',title,mode:customMode(testHull,bifrost?'bifrost':'rift-carrier',false,true),stamp:origin||'pegasus',
   detail:'Temporary loaner. No credits, damage, or ownership changes are saved.'}];
 }
 if(loanerOnly){addLoaners();return offers;}
 const add=(id,title,stage)=>{
  const mode=hangarOrderModes.get(id);if(!mode)return;
  const stamp=[stage.acceptedAt,stage.victoryAt,stage.lodgedAt,stage.completedAt].join(':');
  offers.push({id,title,mode:explicitPegasus?atPegasus(mode):mode,stamp,order:true});
 };
 if(!bifrost&&missions?.generation?.()===generation){
  const intercept=missions.getIntercept?.();
  if(intercept&&!intercept.victoryAt)add('intercept','Vandul Intercept',intercept);
  for(const {id,rank} of qualificationSpecs){
   const qualification=missions.getQualification?.(id);
   if(qualification&&(!qualification.victoryAt||qualification.lodgedAt))
    add(id,rank+' Qualification'+(qualification.lodgedAt?' · Re-fly':''),qualification);
  }
 }
 if(!bifrost&&rendezvous?.generation?.()===generation){
  const wing=rendezvous.get?.();
  if(wing?.completedAt)add('rendezvous','Wing Rendezvous · Wingman vs Vandul',wing);
 }
 const mode=(id,title,flight,detail)=>offers.push({id,title,mode:bifrost&&flight.capitalVessel!==bifrostCapital?atBifrost(flight):explicitPegasus?atPegasus(flight):flight,stamp:origin||'pegasus',detail});
 mode('free-flight','Free Flight',bifrost?bifrostFreeFlight:freeFlight,'Launch into the Battle Fleet Map from '+(bifrost?'Bifrost':'Pegasus')+'.');
 mode('practice','Practice',practiceFlight,'Practise controls and firing. No credits or damage saved.');
 mode('fighter-battle','Simulator: 50 vs 50 Fighters',fighterBattleFlight,
  'Spawn aboard your frigate. Launch both fleets from three deck pads in staggered waves. Each group forms up and heads straight into combat. Retreat to Crosswind to repair. No progress saved.');
 if(window.RiftFrigateHulls?.crosswind)mode('scale-free-fly','Simulator: Ship Scale Free Fly',scaleFlyFlight,
  'Fly a supplied Rift-3 alongside Pegasus, Crosswind and Resolute. One plane and fixed zoom. No combat or saved progress.');
 if(window.RiftRedGrinBroadside&&window.RiftFrigateHulls?.crosswind)
  {
   mode('red-grin-solo','Simulator: Red Grin',redGrinSoloFlight,'Defeat the frigate in a supplied fighter. Amber turrets warn of a broadside. Strike during reload. No damage, credits or resources are saved.');
   mode('red-grin-escort','Simulator: Convoy Escort',redGrinEscortFlight,'Escort a civilian freighter to the extraction gate. Stay close, intercept the pirate’s shots, or draw its turret fire. No damage, credits or resources are saved.');
  }
 mode('solo-training','Solo vs Vandul',soloTrainingFlight,'Fly six Vandul waves alone in the Battle Map. No credits, damage, or career progress saved.');
 return offers;
}
function cockpitQuestEntries(generation){
 const missions=window.RiftMissions,rendezvous=window.RiftRendezvous,quests=[];
 if(cockpitIsBifrost()||generation===undefined||currentCharacterGeneration()!==generation)return quests;
 const add=(title,status)=>quests.push([title,status]);
 const combat=(title,mission,replay=false)=>add(title,mission?.lodgedAt?(replay?'Completed · Can re-fly':'Completed'):
  mission?.victoryAt?'Report to Bishop':mission?'Ready to launch':'Accept on Bridge');
 if(missions?.generation?.()===generation){
  const starter=missions.getStarter?.();
  add('Outfit the Rift-3',starter?'Completed':'Speak to Bishop');
  if(starter){
   combat('Vandul Intercept',missions.getIntercept?.());
   for(const {id,rank} of qualificationSpecs){
    const mission=missions.getQualification?.(id);
    if(mission||missions.qualificationEligible?.(id))combat(rank+' Qualification',mission,true);
   }
  }
 }
 if(rendezvous?.generation?.()===generation){
  const wing=rendezvous.get?.();
  add('Wing Rendezvous',wing?.completedAt?'Completed · Wing formed':wing?'Meet Leena and Tomas':'Accept on Bridge');
 }
 return quests;
}
function renderCockpitQuests(session){
 if(!cockpitQuestList)return;
 const entries=cockpitQuestEntries(session.generation),signature=JSON.stringify(entries);
 if(session.questSignature===signature)return;
 session.questSignature=signature;
 const rows=(entries.length?entries:[['',cockpitIsBifrost()?'No Bifrost flight orders available.':'No Bishop quests available.']]).map(([title,status])=>{
  const row=document.createElement('li');
  row.textContent=title?title+' · '+status:status;return row;
 });
 cockpitQuestList.replaceChildren(...rows);
}
const cockpitPlanKind=offer=>offer.order?'mission':'mode';
const cockpitSoloTab=document.getElementById('cockpit-mode-solo'),cockpitOnlineTab=document.getElementById('cockpit-mode-online');
const cockpitCategoryLabel=document.getElementById('cockpit-category-label');
const hasCockpitTabs=!!(cockpitSoloTab&&cockpitOnlineTab);
for(const [tab,category] of [[cockpitSoloTab,'solo'],[cockpitOnlineTab,'online']])tab?.addEventListener('click',()=>{
 if(cockpitSession?.picker!=='mode'||tab.disabled)return;
 cockpitSession.modeCategory=category;refreshCockpit();
});
function setCockpitPicker(kind,restoreFocus=true){
 const session=cockpitSession;
 if(!session)return;
 const previous=session.picker;
 session.picker=kind;
 for(const [name,{picker,add,select}] of Object.entries(cockpitPickers)){
  const open=kind===name;
  if(picker)picker.hidden=!open;
  add?.setAttribute('aria-expanded',String(open));
  if(select)select.value='';
 }
 if(kind){
  const {select,close}=cockpitPickers[kind];
  if(kind==='mode'&&hasCockpitTabs)(session.modeCategory==='online'?cockpitOnlineTab:cockpitSoloTab).focus?.();
  else (select?.disabled?close:select)?.focus?.();
 }else if(restoreFocus&&previous)cockpitPickers[previous].add?.focus?.();
}
function selectCockpitPlan(id,kind){
 const session=cockpitSession;
 if(!session||session.picker!==kind||!id)return;
 const prior=session.orders.find(o=>o.id===id&&cockpitPlanKind(o)===kind);
 if(kind==='mode'&&hasCockpitTabs&&!!prior?.mode.onlineSide!==(session.modeCategory==='online'))return;
 const current=cockpitOrders(session.generation,cockpitOrigin(),session.loanerOnly,session.testHull).find(o=>o.id===id&&cockpitPlanKind(o)===kind);
 if(!prior||prior.stamp!==current?.stamp||prior.mode!==current?.mode){
  const select=cockpitPickers[kind].select;
  if(select)select.value='';
  refreshCockpit('That choice is no longer available. Choose another flight plan.');return;
 }
 session.selected=id;session.orderChanged=false;
 setCockpitPicker(null);refreshCockpit();
}
function refreshCockpit(message){
 if(!cockpitSession||!hangarDialog?.open||!cockpitStatus||!cockpitLaunch)return;
 const session=cockpitSession;
 const cargo=session.testHull===civilianFreighter.id,scene=document.getElementById('cockpit-scene-art');
 if(scene){
  const boardedHull=session.testHull??hullId;
  const art=cargo?(cockpitIsBifrost()?freighterCockpitArt:'./civilian-freighter-pegasus-cockpit.webp'):
   boardedHull==='bastion-9'?'./swift-2-hangar-cockpit.webp':boardedHull==='stocky-light-fighter'?'./bison-2-hangar-cockpit.webp':boardedHull===starterHullId?'./rift-3-hangar-cockpit-wide.webp':'./hangar-cockpit-pov-v2.webp';
  if(scene.getAttribute('src')!==art)scene.setAttribute('src',art);
  scene.setAttribute('alt',cargo?'Civilian Freighter cockpit with pilot and co-pilot seats':boardedHull==='bastion-9'?'The slim single-seat Swift-2 cockpit looking across the hangar':boardedHull==='stocky-light-fighter'?'The armored single-seat Bison-2 cockpit looking across the hangar':'View through the fighter’s canopy looking across the Hangar');
  scene.style?.setProperty('object-fit',cargo?'contain':'cover');
  document.getElementById('cockpit-scene-frame')?.style?.setProperty('aspect-ratio',cargo?'16 / 9':'3 / 2');
 }
 syncCorsairWingSetup(fighterHullCondition()==='repaired');
 if(aboardGuestHangar()&&!session.loanerOnly){leaveCockpit();return;}
 const same=currentCharacterGeneration()===session.generation,orders=cockpitOrders(session.generation,cockpitOrigin(),session.loanerOnly,session.testHull);
 const onlineAvailable=orders.some(o=>o.mode.onlineSide);
 const category=hasCockpitTabs&&onlineAvailable&&session.modeCategory==='online'?'online':'solo';
 if(hasCockpitTabs){
  session.modeCategory=category;
  cockpitSoloTab.setAttribute('aria-pressed',String(category==='solo'));
  cockpitOnlineTab.setAttribute('aria-pressed',String(category==='online'));
  cockpitOnlineTab.disabled=!onlineAvailable;
  if(cockpitCategoryLabel)cockpitCategoryLabel.textContent=category==='online'?'Choose a shared online flight':'Choose a private solo flight';
 }
 const signature=category+';'+orders.map(({id,title,stamp})=>[id,title,stamp].join('|')).join(';');
 if(session.signature!==signature){
  session.signature=signature;
  const option=(id,title)=>{
   const node=document.createElement('option');node.value=id;node.textContent=title;return node;
  };
  for(const [kind,{select}] of Object.entries(cockpitPickers)){
   if(!select)continue;
   const choices=orders.filter(o=>cockpitPlanKind(o)===kind);
   const prompt=kind==='mission'?(choices.length?'Select a mission':'No accepted flight missions'):'Select a flight mode';
   const options=choices.map(({id,title})=>option(id,title));
   select.replaceChildren(option('',prompt),...options);
   select.disabled=options.length===0;
  }
 }
 const prior=session.orders.find(o=>o.id===session.selected);
 const updated=orders.find(o=>o.id===session.selected);
 if(session.selected&&(!updated||(prior&&(prior.stamp!==updated.stamp||prior.mode!==updated.mode)))){
  session.selected='';session.orderChanged=true;
 }
 session.orders=orders;
 const selected=orders.find(o=>o.id===session.selected);
 const fallback=!session.selected&&!session.orderChanged&&orders.find(o=>o.id==='free-flight');
 const ready=!!(selected||fallback)&&(!!selected?.mode.loaner||canLaunchBuild());
 cockpitLaunch.disabled=!ready;
 cockpitLaunch.textContent=(selected?.mode.redGrinSolo||selected?.mode.fighterBattle)?'Start Simulator':selected?.mode.onlineSide?'Review online flight':'Go to launch deck';
 if(cockpitPlanName)cockpitPlanName.textContent=selected?.title??'No sortie planned';
 if(cockpitRemovePlan){
  cockpitRemovePlan.hidden=!selected&&!session.orderChanged;
  cockpitRemovePlan.textContent=session.orderChanged?'Clear expired order':'Remove';
 }
 if(cockpitBridge){
  cockpitBridge.hidden=session.loanerOnly||cockpitIsBifrost();
  cockpitBridge.setAttribute('href',cockpitOrigin()==='rift-carrier'?'./carrier-bridge.html?vessel=rift-carrier':'./carrier-bridge.html');
 }
 renderCockpitQuests(session);
 const text=message??(!same?'The active pilot changed since you boarded. Exit and board again.':
  session.orderChanged?'That flight order changed or is no longer available. Clear it or add another mission or mode.':
  session.loanerOnly&&!selected?'Choose a Custom Mode loaner to test fly. No purchase needed; no save changes.':
  !ready?'Not ready to fly. Exit the cockpit to repair the hull or finish fitting the fighter.':
  !selected&&session.fromFormation?'Go straight to a launch pad on the Battle Fleet Map. '+(corsairWingEnabled(hangarVessel)?
   'Free Flight test: the selected wingmen follow in waves. Nothing is deducted from the carrier.':'No wingman assigned, so this flight is solo.'):
  !selected?'Leave the itinerary empty for Free Flight (private). You will launch yourself from the moving carrier’s deck.':
  (selected.mode.redGrinSolo||selected.mode.fighterBattle)?selected.detail:
  selected.mode.onlineSide?selected.detail+' A confirmed berth is required in the public game.':
  (selected.id==='rendezvous'?'Ready for Wingman vs Vandul training. No career rewards.':selected.detail??'Flight ready.')+' Press Launch when you reach the deck.');
 if(cockpitStatus.textContent!==text)cockpitStatus.textContent=text;
}
for(const [kind,{add,close,select}] of Object.entries(cockpitPickers)){
 add?.addEventListener('click',()=>setCockpitPicker(cockpitSession?.picker===kind?null:kind));
 close?.addEventListener('click',()=>setCockpitPicker(null));
 select?.addEventListener('change',()=>selectCockpitPlan(select.value,kind));
}
cockpitRemovePlan?.addEventListener('click',()=>{
 if(!cockpitSession)return;
 cockpitSession.selected='';cockpitSession.orderChanged=false;
 setCockpitPicker(null,false);refreshCockpit();cockpitPickers.mode.add?.focus?.();
});
function leaveCockpit(focus=true){
 if(!cockpitSession)return;
 const scroll=cockpitSession.hangarScroll;
 setCockpitPicker(null,false);cockpitSession=null;
 syncCorsairWingSetup(fighterHullCondition()==='repaired');
 if(hangarCockpit)hangarCockpit.hidden=true;
 if(playerHangarView)playerHangarView.hidden=aboardGuestHangar();
 if(guestHangarView)guestHangarView.hidden=!aboardGuestHangar();
 if(closeHangarButton)closeHangarButton.hidden=false;
 if(focus&&hangarDialog?.open){
  showFighterFit();
  hangarDialog.scrollTop=scroll;
  (aboardGuestHangar()?guestLoaner:hangarBoard?.hidden?(hangarLoaner?.hidden?hangarTitle:hangarLoaner??hangarTitle):hangarBoard)?.focus();
 }
}
function showBoardMessage(message){
 const status=hangarBoardStatus??(hangarBoard?.hidden?hullRecoveryStatus:buildStatus);
 if(hangarBoardStatus)hangarBoardStatus.hidden=!message;
 if(status&&(message||hangarBoardStatus))status.textContent=message;
}
function setBoardingPhase(phase){
 if(playerHangarView){
  if(phase)playerHangarView.dataset.boarding=phase;
  else delete playerHangarView.dataset.boarding;
 }
}
function boardingIsCurrent(run){
 return !aboardGuestHangar()&&boarding===run&&hangarDialog?.open&&state==='menu'&&!document.hidden&&!routeParked&&
  currentCharacterGeneration()===run.generation&&readHullRaw()===run.hull&&fighterHullCondition()==='repaired';
}
function cancelBoarding(message='',focus=false){
 if(!boarding)return;
 const run=boarding;
 boarding=null;window.clearTimeout(run.timer);setBoardingPhase(null);cancelCanopyAudio();
 if(!run.wasOpen)setCanopy(false);
 if(hangarDialog?.open){
  showFighterFit();showBoardMessage(message);
  if(focus)(hangarBoard?.hidden?hangarTitle:hangarBoard)?.focus({preventScroll:true});
 }
}
function finishBoarding(run){
 if(boarding!==run)return;
 if(!boardingIsCurrent(run)){cancelBoarding('Your pilot or hull changed. Check the Hangar before boarding.');return;}
 boarding=null;setBoardingPhase(null);
 const identity=document.getElementById('cockpit-fighter-id');
 if(identity)identity.textContent=fighterDisplayCode()+' / PREFLIGHT';
 cockpitSession={generation:run.generation,signature:null,selected:preferredHangarOrder??'',orders:[],hangarScroll:run.scroll,fromFormation:run.fromFormation,picker:null};
 hangarCockpit.hidden=false;if(playerHangarView)playerHangarView.hidden=true;if(closeHangarButton)closeHangarButton.hidden=true;
 hangarDialog.scrollTop=0;
 showBoardMessage('');
 setCockpitPicker(null,false);refreshCockpit();cockpitTitle?.focus({preventScroll:true});
}
function zoomIntoCockpit(run){
 if(boarding!==run)return;
 if(!boardingIsCurrent(run)){cancelBoarding('Your pilot or hull changed. Check the Hangar before boarding.');return;}
 setBoardingPhase('zoom');
 run.timer=window.setTimeout(()=>finishBoarding(run),boardingZoomMs);
}
for(const button of [hangarLoaner,guestLoaner])button?.addEventListener('click',event=>{
 if(event.isTrusted!==true||state!=='menu'||document.hidden||routeParked||!hangarDialog?.open||boarding||cockpitSession||button.hidden||
  (button===guestLoaner)!==aboardGuestHangar()||!hangarCockpit||!fighterRegistry)return;
 const generation=currentCharacterGeneration();
 if(generation===undefined)return;
 cockpitSession={generation,signature:null,selected:'',orders:[],hangarScroll:hangarDialog.scrollTop??0,picker:null,loanerOnly:true};
 const identity=document.getElementById('cockpit-fighter-id');
 if(identity)identity.textContent='LOANER / PREFLIGHT';
 if(guestHangarView)guestHangarView.hidden=true;
 hangarCockpit.hidden=false;if(playerHangarView)playerHangarView.hidden=true;if(closeHangarButton)closeHangarButton.hidden=true;
 hangarDialog.scrollTop=0;
 setCockpitPicker(null,false);refreshCockpit();setCockpitPicker('mode',false);
});
hangarBoard?.addEventListener('click',event=>{
 if(aboardGuestHangar()||event.isTrusted!==true||state!=='menu'||document.hidden||routeParked||!hangarDialog?.open||boarding||cockpitSession||!hangarCockpit||!cockpitOrder||formationStage&&formationStage!=='ready')return;
 if(hangarTryHull){
  const generation=currentCharacterGeneration(),hull=hangarDisplayHull(hangarTryHull);
  if(generation===undefined||!hull)return;
  cockpitSession={generation,signature:null,selected:'loaner-test',orders:[],hangarScroll:hangarDialog.scrollTop??0,picker:null,
   loanerOnly:true,testHull:hangarTryHull};
  const identity=document.getElementById('cockpit-fighter-id');
  if(identity)identity.textContent=hull.name.toUpperCase()+' / LOANER';
  hangarCockpit.hidden=false;if(playerHangarView)playerHangarView.hidden=true;if(closeHangarButton)closeHangarButton.hidden=true;
  hangarDialog.scrollTop=0;setCockpitPicker(null,false);refreshCockpit();cockpitTitle?.focus?.({preventScroll:true});
  return;
 }
 const generation=currentCharacterGeneration(),condition=fighterHullCondition(),hull=readHullRaw();
 if(generation===undefined||hull===undefined||condition!=='repaired'){
  showFighterFit();
  showBoardMessage(generation===undefined||hull===undefined?'Could not read the pilot save. Try boarding again.':'The hull changed. Check its repair status before boarding.');
  hangarBoardStatus?.scrollIntoView?.({block:'nearest'});
  return;
 }
 cancelHangarPress();setWeaponPicker(null);showBoardMessage('');
 const fromFormation=formationStage==='ready';
 if(fromFormation)closeFormationPad(false);else resetHangarFormation();
 const hasCanopy=hullId===starterHullId&&!!canopyRig&&repairedBay?.hidden===false;
 const wasOpen=hasCanopy&&canopyRig.dataset.canopy==='open';
 const run=boarding={generation,hull,wasOpen,fromFormation,scroll:hangarDialog.scrollTop??0,timer:null};
 if(motion?.matches){finishBoarding(run);return;}
 hangarBoard.disabled=true;
 // Partially damaged but flyable ships use a flat damage sprite; there is no
 // canopy geometry to animate on that layer. Zoom the visible bay instead.
 if(!hasCanopy){zoomIntoCockpit(run);return;}
 repairedBay.scrollIntoView?.({block:'nearest'});
 if(!wasOpen){setCanopy(true);requestCanopyAudio(true,event);}
 const remaining=Math.max(0,boardingCanopyMs-(performance.now()-canopyOpenedAt));
 if(!remaining){zoomIntoCockpit(run);return;}
 setBoardingPhase('canopy');
 run.timer=window.setTimeout(()=>zoomIntoCockpit(run),remaining);
});
const hangarSimulator=document.getElementById('hangar-red-grin-simulator');
const hangarEscort=document.getElementById('hangar-red-grin-escort');
if(hangarEscort)hangarEscort.disabled=!window.RiftRedGrinBroadside||!window.RiftFrigateHulls?.crosswind;
if(hangarSimulator)hangarSimulator.disabled=!window.RiftRedGrinBroadside||!window.RiftFrigateHulls?.crosswind;
function launchRedGrinSimulator(event,scenario){
 if(event.isTrusted!==true||state!=='menu'||document.hidden||routeParked||
    !hangarDialog?.open||boarding||cockpitSession||formationStage)return;
 const mode=cockpitIsBifrost()?atBifrost(scenario):scenario;
 const returning=returnFlightToCarrier;returnFlightToCarrier=true;
 if(!start(mode,true)){returnFlightToCarrier=returning;return;}
 hangarLaunching=true;unlockAudio(undefined,event);hangarDialog.close();syncArenaMusic();
}
hangarSimulator?.addEventListener('click',event=>launchRedGrinSimulator(event,redGrinSoloFlight));
hangarEscort?.addEventListener('click',event=>launchRedGrinSimulator(event,redGrinEscortFlight));
const hangarScaleFly=document.getElementById('hangar-scale-free-fly');
if(hangarScaleFly)hangarScaleFly.disabled=!window.RiftFrigateHulls?.crosswind;
hangarScaleFly?.addEventListener('click',event=>launchRedGrinSimulator(event,scaleFlyFlight));
document.getElementById('hangar-fighter-battle')?.addEventListener('click',event=>launchRedGrinSimulator(event,fighterBattleFlight));
for(const [id,[scenario,label]] of Object.entries(simulatorWatchRoutes)){
 const option=document.getElementById('hangar-watch-'+id);
 if(option){
  option.disabled=!!((scenario.redGrinSolo&&!window.RiftRedGrinBroadside)||((scenario.redGrinSolo||scenario.scaleFly)&&!window.RiftFrigateHulls?.crosswind));
  option.addEventListener('click',event=>launchRedGrinSimulator(event,{...scenario,loaner:starterHullId,hangarTrial:true,simWatch:label}));
 }
}
simWatchCamera?.addEventListener('click',event=>{
 if(event.isTrusted!==true||!flightMode.simWatch||!simDirector||!fighterBattle||document.hidden)return;
 simDirector.wide=!simDirector.wide;simWatchCamera.textContent=simDirector.wide?'Follow':'Overview';
 simWatchCamera.setAttribute('aria-pressed',String(simDirector.wide));
});
simWatchPause?.addEventListener('click',event=>{
 if(event.isTrusted!==true||!flightMode.simWatch||document.hidden||!simDirector||!['play','pause'].includes(state))return;
 if(state==='pause')unlockAudio(undefined,event);
 pause();simWatchPause.textContent=state==='pause'?'Resume':'Pause';
});
document.getElementById('sim-watch-exit')?.addEventListener('click',event=>{
 if(event.isTrusted===true&&flightMode.simWatch&&!document.hidden)enterMainMenu();
});
cockpitExit?.addEventListener('click',()=>leaveCockpit());
document.getElementById('cockpit-show-quests')?.addEventListener('click',()=>{
 if(!cockpitSession)return;
 const heading=document.getElementById('cockpit-quests-title');
 heading?.focus({preventScroll:true});heading?.scrollIntoView?.({block:'start'});
});
cockpitLaunch?.addEventListener('click',async event=>{
 const session=cockpitSession;
 if(event.isTrusted!==true||!session||!hangarDialog?.open||state!=='menu'||document.hidden||routeParked)return;
 if(session.orderChanged||session.checkingWing)return;
 const origin=cockpitOrigin(),id=session.selected||'free-flight',shown=session.orders.find(order=>order.id===id);
 const stillSelected=()=>cockpitOrders(session.generation,origin,session.loanerOnly,session.testHull).some(order=>order.id===id&&order.stamp===shown?.stamp&&order.mode===shown?.mode);
 if(!shown||!stillSelected()){
  refreshCockpit('Orders changed. Check the current preflight plan and try again.');return;
 }
 if(shown.mode.loaner){
  const returning=returnFlightToCarrier;returnFlightToCarrier=true;
  const launched=shown.mode.fourWay?stageCarrierSortie(shown.mode,shown.title,()=>currentCharacterGeneration()===session.generation):start(shown.mode,true);
  if(!launched){returnFlightToCarrier=returning;refreshCockpit('Could not prepare that loaner. Nothing launched.');return;}
  hangarLaunching=true;unlockAudio(undefined,event);hangarDialog.close();
  if(shown.mode.redGrinSolo)syncArenaMusic();
  return;
 }
 if(aboardGuestHangar()||!canLaunchBuild()){refreshCockpit();return;}
 if(shown.mode.onlineSide){
  try{window.location.assign(cockpitOnlineLink(shown.mode.onlineSide));}
  catch{refreshCockpit('Could not open the online briefing. Try again.');}
  return;
 }
 const launchVessel=hangarVessel,idAtBoard=hullId,expectedHull=readHullRaw(idAtBoard),expectedFit=readShipRaw(idAtBoard);
 if(expectedHull===undefined||expectedFit===undefined){refreshCockpit('Could not read the current hull or fit. Nothing launched.');return;}
 const returning=returnFlightToCarrier;returnFlightToCarrier=true;
 const supportsDeckWing=[freeFlight.id,capitalTestFlight.id,corsairTileTest.id].includes(shown.mode.id);
 const wantsWing=session.fromFormation&&supportsDeckWing&&corsairWingEnabled(launchVessel);
 const wingPlan=wantsWing?savedWingPads(launchVessel):[];
 const wingHulls=wingPlan.map(slot=>savedWingHull(slot,launchVessel));
 const mixed=wingHulls.some(hull=>hull!=='rift-fighter');
 if(wantsWing&&(wingPlan.length>1||mixed)&&shown.mode.id!==freeFlight.id){
  returnFlightToCarrier=returning;
  refreshCockpit('Mixed or multiple wingmen are Free Flight test only. Pick Free Flight or use one Rift-3 for this mission.');return;
 }
 const wingCount=wantsWing&&shown.mode.id===freeFlight.id?wingPlan.length:1;
 const riftCount=mixed?wingHulls.filter(hull=>hull==='rift-fighter').length:wingCount;
 if(wantsWing&&!rosterAllowsFormation(wingCount,riftCount)){
  session.checkingWing=true;
  refreshCockpit('Checking the carrier for a ready pilot and Rift-3…');
  await refreshFormationRoster();
  session.checkingWing=false;
  if(cockpitSession!==session||!hangarDialog?.open||document.hidden||state!=='menu'||!stillSelected())return;
  if(!rosterAllowsFormation(wingCount,riftCount)){
   refreshCockpit('Wingman cannot launch: not enough verified pilots and Rift-3s on this carrier. Return to the hangar to fly solo or check availability later.');
   return;
  }
 }
 const wingOrigin=wantsWing?(shown.mode.id===freeFlight.id&&(wingCount>1||mixed)?'formation-test':'formation'):'solo';
 const check=(generation,hull)=>currentFlightHullId()===idAtBoard&&generation===session.generation&&hull===expectedHull&&
  launchVessel===fighterParkedVessel(idAtBoard)&&(!wantsWing||(savedWingPads(launchVessel).join(',')===wingPlan.join(',')&&wingPlan.every((slot,i)=>savedWingHull(slot,launchVessel)===wingHulls[i])))&&stillSelected()&&readShipRaw(idAtBoard)===expectedFit&&readHullRaw(idAtBoard)===expectedHull&&currentCharacterGeneration()===generation;
 const launched=shown.mode.capital||shown.mode.redGrinSolo?start(shown.mode,true,check,wingOrigin):stageCarrierSortie(shown.mode,shown.title,check,wingOrigin);
 if(!launched){
  returnFlightToCarrier=returning;
  refreshCockpit('Preflight changed. Check your ship and orders before trying again.');return;
 }
 hangarLaunching=true;
 unlockAudio(undefined,event);
 hangarDialog.close();
});
function openHangarFrom(invoker,fromCarrier=false,gesture){
 if(crossBattleWatchRequest||isCrossWatch()||loanerSnapshot||document.hidden||!hangarDialog||hangarDialog.open||typeof hangarDialog.showModal!=='function')return;
 try{hangarDialog.showModal();refreshSoundActivation?.();}catch{return;}
 hangarPreviewId=hullId;hangarTryHull=null;
 hangarAmbientVisit=rollHangarAmbient();hangarAmbientLastBerth=null;
 resetHangarFormation();
 hangarInvoker=invoker;resumeAfterHangar=state==='play';returnHangarToCarrier=fromCarrier;
 hangarVessel=linkedHangarReturn==='./carrier.html?vessel=bifrost'?'bifrost':
  linkedHangarReturn==='./carrier.html?vessel=rift-carrier'?'rift-carrier':capitalShip?(capitalShip.vessel===bifrostCapital?'bifrost':'rift-carrier'):hangarHomeVessel();
 const shop=document.getElementById('fit-shop-link'),vessel=fromCarrier?cockpitOrigin():'';
 shop?.setAttribute('href','./carrier-shop.html'+(vessel?'?vessel='+vessel:''));
 if(closeHangarButton){
  const label=fromCarrier?'Back to Carrier':state==='menu'?'Back to menu':'Back to arena';
  closeHangarButton.textContent=label;closeHangarButton.setAttribute?.('aria-label',label);
 }
 if(resumeAfterHangar)pause();else clearInput();
 hydrateFighterParking(hullId);
 if(!aboardGuestHangar())refreshStoredFit();setWeaponPicker(null);showFighterFit();hangarTitle?.focus({preventScroll:true});
 // A direct Carrier link has no gesture in this document. Menu and in-game
 // buttons do, and can silently ready the graph before Test engine is held.
 if(!aboardGuestHangar()&&gesture?.isTrusted&&soundOn&&audio?.state!=='running')unlockAudio(refreshHangarEngineAudio,gesture);
}
function resolveCrossEncounter(e,role){
 if(e?.id!=='blackwake'||e.status!=='active'||e.simulation!=='local'||e.attacker?.id!=='bifrost')return null;
 const point=Object.freeze({sector:e.sector,x:e.x,y:e.y});
 const bifrostApproach=window.RiftFleetApproach?.plan({sector:e.sector,x:e.attacker.x,y:e.attacker.y,phase:'holding'},point);
 if(!bifrostApproach)return null;
 return Object.freeze({role,point,bifrostApproach,startsAt:e.startsAt,endsAt:e.endsAt});
}
async function prepareCrossWatch(){
 if(mainBuildStatus)mainBuildStatus.textContent='Checking the Blackwake encounter…';
 let snapshot=null;
 try{snapshot=await window.RiftCrossBattle?.get();}catch{}
 if(state!=='menu'||document.hidden||routeParked||hangarDialog?.open)return;
 const cross=resolveCrossEncounter(snapshot?.encounter,'watch');
 if(!cross){
  if(mainBuildStatus)mainBuildStatus.textContent='Blackwake is not engaged.';
  const fallback=document.getElementById('cross-watch-unavailable');
  if(fallback){fallback.hidden=false;fallback.focus({preventScroll:true});}
  return;
 }
 const approach={...cross.bifrostApproach,bifrost:cross.bifrostApproach};
 flightMode={...soloTrainingFlight,id:'blackwake-watch',crossBattle:cross,tileApproach:approach};
 flightCanSave=false;flightGeneration=flightHullId=flightHullRaw=undefined;flightQuest=null;
 returnFlightToCarrier=false;
 setArenaWidth(true);arena.top=edge-Math.round(H*.34);arena.bottom=H-edge;
 duelEnabled=true;resetField();
 state='play';seedCrossFighters(flightMode,true);
 // A camera anchor only: no player craft, collision target or controls.
 p.x=W*.5;p.y=(arena.top+arena.bottom)/2;p.hp=0;
 state='watch';refreshSoundActivation?.();
 if(arenaScreen)arenaScreen.dataset.watch='true';
 if(gameCabinet)gameCabinet.dataset.watch='true';
 if(crossWatchHud)crossWatchHud.hidden=false;
 watchSound=false;syncWatchSound();
 updateCrossWatchStatus();showGameScreen(true);layout();last=0;overlay.hidden=true;
 crossWatchBack?.focus({preventScroll:true});
}
async function prepareLinkedCrossBattle(role){
 const id=hullId,check=directCarrierSortieCheck(practiceFlight);
 const ownsReady=()=>managedBuild&&fighterParkedVessel(id)==='rift-carrier'&&canLaunchBuild()&&check(currentCharacterGeneration(),readHullRaw(id));
 if(!ownsReady()){
  linkedHangarReturn='./carrier.html?vessel=rift-carrier';openHangarFrom(mainMenuHangar,true);
  showBoardMessage('Use a launch-ready fighter parked aboard Pegasus.');return;
 }
 if(mainBuildStatus)mainBuildStatus.textContent='Checking the Blackwake encounter…';
 let snapshot=null;
 try{snapshot=await window.RiftCrossBattle?.get();}catch{}
 if(state!=='menu'||document.hidden||routeParked||hangarDialog?.open)return;
 const cross=resolveCrossEncounter(snapshot?.encounter,role);
 if(!ownsReady()||!cross){
  if(mainBuildStatus)mainBuildStatus.textContent='Blackwake unavailable. Return to the Galaxy Map to try again.';
  return;
 }
 const mode=atPegasus(Object.freeze({...soloTrainingFlight,id:'blackwake-cross-battle',tileTest:true,
  crossBattle:cross}));
 returnFlightToCarrier=true;
 if(!stageCarrierSortie(mode,'Blackwake · '+(role==='reinforce'?'Reinforcement':'Intercept'),check))returnFlightToCarrier=false;
}
function enterLinkedCarrierRoute(){
 if(!carrierLinkedRoute||routeParked||document.hidden||state!=='menu'||hangarDialog?.open)return;
 const route=carrierLinkedRoute;
 if(!crossBattleWatchRequest&&!customFlightRequest&&hydrateFighterParking(hullId)?.pending)return;
 carrierLinkedRoute=null;
 if(crossBattleWatchRequest){void prepareCrossWatch();return;}
 if(crossBattleRequest&&route===crossBattleRequest[0]){void prepareLinkedCrossBattle(crossBattleRequest[1]);return;}
 if(galaxyTransferRequest&&route===galaxyTransferRequest[0]){
  const target=galaxyTransferRequest[1],id=hullId,origin=fighterParkedVessel(id),raw=readParking(id);
  const generation=currentCharacterGeneration();
  const ready=raw!==undefined&&generation!==undefined&&currentFlightHullId()===id&&canLaunchBuild();
  if(origin===target||!managedBuild||!ready){
   linkedHangarReturn='./carrier.html?vessel='+origin;
   openHangarFrom(mainMenuHangar,true);
   showBoardMessage(origin===target?'This fighter is already parked on '+vesselName(target)+'.':'Fit and repair your own fighter before plotting a transfer.');
   return;
  }
  returnFlightToCarrier=true;
  if(start(origin==='bifrost'?bifrostFreeFlight:atPegasus(freeFlight),true)){
   capitalShip.transfer={id,origin,target,generation,raw,revision:parkingAPI?.details?.(id)?.revision??undefined};
   updateCapitalHud();
  }else returnFlightToCarrier=false;
  return;
 }
 if(customFlightRequest&&route===customFlightRequest[0]){
  const [,loaner,vessel,origin]=customFlightRequest;
  if(loaner===civilianFreighter.id&&origin!=='shop')return;
  returnFlightToCarrier=true;
  if(!start(customMode(loaner,vessel,origin==='shop',origin==='hangar'),true))returnFlightToCarrier=false;
  return;
 }
 const staged=stagedCarrierRoutes.get(route);
 let mode=staged??carrierFlightRoutes.get(route);
 const onBifrost=bifrostHangarRoutes.has(route)||mode?.capitalVessel===bifrostCapital;
 preferredHangarOrder=hangarOrderFromRoute(route);
 const storyOrder=preferredHangarOrder&&preferredHangarOrder!=='escort-drill';
 const pegasusRoute=route===pegasusHangar||pegasusHangarOrder(route)||mode?.explicitPegasus||/[?&]vessel=pegasus(?:&|$)/.test(route);
 const onPegasus=storyOrder||!!(staged&&mode?.quest)||pegasusRoute;
 const vessel=onBifrost?'bifrost':onPegasus?'rift-carrier':hangarHomeVessel();
 const scoped=!mode||staged||mode.capital||onBifrost||onPegasus;
 if(scoped&&vessel!==fighterParkedVessel()){
  linkedHangarReturn='./carrier.html?vessel='+vessel;
  openHangarFrom(mainMenuHangar,true);return;
 }
 if(scoped&&mode&&vessel==='bifrost'&&!onBifrost)mode=atBifrost(mode);
 else if(scoped&&mode&&pegasusRoute&&!mode.explicitPegasus)mode=atPegasus(mode);
 if(mode?.quest&&mode.quest!=='intercept'&&!window.RiftMissions?.getQualification?.(mode.quest)){
  if(mainBuildStatus)mainBuildStatus.textContent='Accept this qualification on the Carrier Bridge before launching.';
  return;
 }
 if(!mode||!canLaunchBuild()){
  linkedHangarReturn=carrierReturnPath(vessel==='bifrost'?bifrostTestFlight:pegasusRoute?atPegasus(capitalTestFlight):mode);
  openHangarFrom(mainMenuHangar,true);
  return;
 }
 returnFlightToCarrier=true;
 // A new document has no trusted arena gesture yet. Never unlock sound here.
 const launched=staged&&!mode.capital?stageCarrierSortie(mode,carrierSortieTitle(mode),directCarrierSortieCheck(mode)):start(mode,true);
 if(!launched){returnFlightToCarrier=false;linkedHangarReturn=carrierReturnPath(mode);openHangarFrom(mainMenuHangar,true);}
}
openHangarButton?.addEventListener('click',event=>openHangarFrom(openHangarButton,false,event));
closeHangarButton?.addEventListener('click',()=>hangarDialog?.close());
hangarDialog?.addEventListener('cancel',event=>{
 if(boarding){event?.preventDefault();cancelBoarding('',true);return;}
 if(cockpitSession){event?.preventDefault();
  if(cockpitSession.picker)setCockpitPicker(null);else leaveCockpit();return;
 }
 if(formationPad){event?.preventDefault();closeFormationPad(true);return;}
 if(formationStage){event?.preventDefault();if(formationStage==='ready')moveHangarFormation(false);else resetHangarFormation();return;}
 if(weaponSlot){event?.preventDefault();setWeaponPicker(null,true);return;}
 cancelHangarPress();
});
hangarDialog?.addEventListener('close',()=>{
 resetHangarFormation();
 const launched=hangarLaunching;hangarLaunching=false;cancelBoarding();leaveCockpit(false);hangarTryHull=null;
 cancelHangarPress();cancelCanopyAudio();stopThruster(true);
 setWeaponPicker(null);setCanopy(false);
 const shouldResume=resumeAfterHangar,invoker=hangarInvoker,goBackToCarrier=returnHangarToCarrier;
 resumeAfterHangar=false;hangarInvoker=null;returnHangarToCarrier=false;preferredHangarOrder=null;hangarVessel=null;
 if(launched){linkedHangarReturn=undefined;syncArrivalControls();updateDuelCountdown();liveFocus();return;}
 if(goBackToCarrier){
  // Fixed local destination; replace avoids routing Back into a newly opened modal.
  const target=linkedHangarReturn??'./carrier.html';linkedHangarReturn=undefined;
  try{window.location.replace(target);return;}catch{}
 }
 if(shouldResume&&state==='pause'&&!document.hidden)pause();
 else (invoker??(state==='menu'?mainMenuHangar:openHangarButton))?.focus({preventScroll:true});
});
mainScreen?.addEventListener('click',ev=>{
 const choice=ev.target.closest('[data-rift]'),a=choice?.dataset.rift;
 if(state!=='menu'||document.hidden||hangarDialog?.open)return;
 if(a==='hangar')openHangarFrom(mainMenuHangar??choice,false,ev);
});
for(const btn of [pauseFlightButton,scaleFlyPauseButton])btn?.addEventListener('click',event=>{
 if(event.isTrusted!==true||document.hidden||routeParked||hangarDialog?.open||!canPauseFlight())return;
 pause();
});
returnMainMenu?.addEventListener('click',()=>{if(document.hidden)return;if(onlineBattle){if(!onlineCorsair)void onlineSession?.leave?.();window.location?.replace(onlineCorsair?corsairBackHref():'./galaxy-map.html');return;}if(!isCrossWatch())enterMainMenu();});
overlay.addEventListener('click',ev=>{
 const a=ev.target.closest('[data-rift]')?.dataset.rift;
 if(document.hidden||hangarDialog?.open)return;
 if(a==='retry-mission-save'){retryQuestVictory();return;}
 if(a==='abandon-mission-save'&&state==='complete'&&missionDeparture?.questSave==='pending'&&!routeParked){enterMainMenu(true);return;}
 if(!['resume','reset','main-menu'].includes(a))return;
 if(a==='main-menu'&&['pause','disabled','depart','complete'].includes(state)){enterMainMenu();return;}
 if(ev.pointerType==='touch'||ev.pointerType==='pen')inputSource(true);else if(ev.pointerType==='mouse')inputSource(false);
 if(a==='resume'&&state==='pause'){unlockAudio(undefined,ev);pause();}
 else if(a==='reset'&&(state==='disabled'||state==='complete'&&(isFourWayBattle()||flightMode.redGrinSolo||flightMode.fighterBattle||flightMode.simWatch)))restart(ev);
});
const keyAim=()=>[Number(has('ArrowRight'))-Number(has('ArrowLeft')),Number(has('ArrowDown'))-Number(has('ArrowUp'))];
const flightKeys=new Set(['KeyA','KeyW','KeyD','KeyS','KeyE','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space']);
window.addEventListener('keydown',e=>{
 if(hangarDialog?.open||e.defaultPrevented)return;
 if(flightMode.simWatch&&(flightKeys.has(e.code)||['Digit1','Digit2','KeyQ'].includes(e.code))){if(document.activeElement===canvas)e.preventDefault();return;}
 if(transferTransit){
  if(e.code==='Escape'&&transferTransit.chart==='picker'){e.preventDefault();exitFlightMap();}
  return;
 }
 if(e.code==='KeyQ'&&state==='play'&&!e.repeat&&!e.ctrlKey&&!e.metaKey&&!e.altKey){
  if(!onlineBattle&&activateShield())e.preventDefault();
  return;
 }
 if(['Digit1','Digit2'].includes(e.code)&&!e.repeat&&!e.ctrlKey&&!e.metaKey&&!e.altKey&&state==='play'){
  const active=document.activeElement;
  if(active===canvas||active&&Object.values(gunButtons).includes(active)){
   e.preventDefault();const name=e.code==='Digit2'?fighterFit.secondary:fighterFit.primary;
   if(name===null)return;
   lastGunTap=null;selectGun(name);if(e.shiftKey)toggleBurst(name);return;
  }
 }
 if(['Escape','KeyP'].includes(e.code)&&!e.repeat&&!e.ctrlKey&&!e.metaKey&&!e.altKey&&
    !document.hidden&&!routeParked&&(canPauseFlight()||state==='pause')){
  e.preventDefault();
  if(state==='pause'&&e.isTrusted===true)unlockAudio(undefined,e);
  pause();return;
 }
 if(state==='play'&&!capitalLocked()&&e.code==='Space'&&(mountedGun()?.holdRepeat||mountedGun()?.burstOnly)&&(document.activeElement===canvas||document.activeElement===fireButton)){
  e.preventDefault();
  if(!e.repeat){inputSource(document.activeElement===fireButton);unlockAudio(undefined,e);pressFire('key');}
  return;
 }
 if(e.code==='KeyE'&&(e.ctrlKey||e.metaKey||e.altKey))return;
 if(state!=='play'||capitalLocked()||!flightKeys.has(e.code)||e.code==='Space'&&document.activeElement!==canvas)return;
 e.preventDefault();inputSource(false);if(!e.repeat){unlockAudio(undefined,e);if(e.code==='KeyE'&&!holdsPhysicalThrust())pressSurge(e,'e');}keys.add(e.code);
 if(e.code==='KeyE')paintMove();
 if(!aimPtr&&e.code.startsWith('Arrow')){const [x,y]=keyAim();if(x||y)commandPilotAim(Math.atan2(y,x));}
 if(!e.repeat&&e.code==='Space')pressFire();
},{passive:false});
window.addEventListener('keyup',e=>{
 if(enginePress?.kind==='key'&&enginePress.id===e.code){e.preventDefault();endEnginePress(e,'key',e.code);}
 if(e.code==='Space'&&ballisticHold?.kind==='key'){e.preventDefault();stopBallisticHold();}
 keys.delete(e.code);
 if(e.code==='KeyE'){resetReleasedThrust();paintMove();}
});
window.addEventListener('blur',()=>{
 if(hangarDialog?.open){cancelBoarding();cancelHangarPress();}
 if(transferTransit)return;
 clearInput();
 // Free Fly is a no-save test. Safari can drop window focus during normal
 // touch interaction; release the controls without throwing up a pause menu.
 if(flightMode.scaleFly){last=0;return;}
 if(state==='play'||state==='arrive')pause();
});
document.addEventListener('visibilitychange',()=>{
 if(flightMode.scaleFly){last=0;if(document.hidden)clearInput();}
 if(document.hidden){
  if(formationStage&&formationStage!=='ready')resetHangarFormation();
  cancelBoarding();cancelCapitalHangarApproach();flushBattleDamage();parkAudio();
 }else{
  if(missionDeparture)last=0;
  enterLinkedCarrierRoute();showAudioReady();refreshHangarEngineAudio();
 }
});
function refreshBuildDisplays(){
 if(onlineMatch)return;
 if(crossBattleWatchRequest||loanerSnapshot||customFlightRequest&&carrierLinkedRoute)return;
 if(hangarDialog?.open&&aboardGuestHangar()){
  if(boarding)cancelBoarding();
  cancelHangarPress();showFighterFit();refreshCockpit();return;
 }
 if(boarding&&!boardingIsCurrent(boarding))cancelBoarding('Your pilot or hull changed. Check the Hangar before boarding.');
 if(state==='menu'){if(!boarding&&!pendingBattleDamage&&managedBuild&&fighterRegistry)hullId=fighterRegistry.selected();refreshStoredFit();showFighterFit();refreshCockpit();}
 else if(hangarDialog?.open)showFighterFit();
 else if(fighterLoadout.shield==='aegis-s3')refreshShieldOwnership();
}
window.addEventListener('storage',refreshBuildDisplays);
window.addEventListener('rift:walletchange',refreshBuildDisplays);
window.addEventListener('pagehide',()=>{if(onlineSession){onlineSession.close();onlineSession=null;}cancelBoarding();cancelCapitalHangarApproach();flushBattleDamage();routeParked=true;endWingRadio();parkAudio();});
window.addEventListener('pageshow',event=>{if(event?.persisted&&onlineBattle&&!onlineSession){window.location?.reload?.();return;}refreshBuildDisplays();routeParked=false;if(missionDeparture||flightMode.scaleFly)last=0;enterLinkedCarrierRoute();showAudioReady();});
function fieldPoint(e){
 const box=canvas.getBoundingClientRect();
 if(box.width<=0||box.height<=0)return null;
 const x=(e.clientX-box.left)/box.width,y=(e.clientY-box.top)/box.height;
 if(x<0||y<0||x>1||y>1)return null;
 const camera=flightCamera();return {x:camera.x+x*camera.w,y:camera.y+y*camera.h};
}
function angleTo(x,y){
 const vx=x-p.x,vy=y-p.y;
 return Math.hypot(vx,vy)>9?Math.atan2(vy,vx):p.aim;
}
function capture(pad,e){try{pad.setPointerCapture(e.pointerId);}catch{}}
function showStick(pad,v=null){
 if(!pad)return;
 pad.style.setProperty('--stick-x',(v?.dx??0).toFixed(1)+'px');
 pad.style.setProperty('--stick-y',(v?.dy??0).toFixed(1)+'px');
 if(v)pad.dataset.active='true';else delete pad.dataset.active;
}
function stickVector(pad,e){
 const box=pad.getBoundingClientRect(),x=e.clientX-box.left-box.width/2,y=e.clientY-box.top-box.height/2,m=Math.hypot(x,y);
 const radius=clamp(Math.min(box.width,box.height)*.30,13,34),dead=radius*.19;
 const power=Math.pow(clamp((m-dead)/(radius-dead),0,1),1.38),u=m?x/m:0,v=m?y/m:0;
 return {x:u*power,y:v*power,dx:u*Math.min(radius,m),dy:v*Math.min(radius,m),angle:m>dead?Math.atan2(y,x):null};
}
const directions={n:[0,-1],ne:[Math.SQRT1_2,-Math.SQRT1_2],e:[1,0],se:[Math.SQRT1_2,Math.SQRT1_2],s:[0,1],sw:[-Math.SQRT1_2,Math.SQRT1_2],w:[-1,0],nw:[-Math.SQRT1_2,-Math.SQRT1_2]};
function moveButton(target){
 if(mainThrustButton&&(target===mainThrustButton||mainThrustButton.contains?.(target)))return mainThrustButton;
 const button=target?.closest?.('[data-move]');
 return button&&movePad?.contains(button)&&Object.hasOwn(directions,button.dataset.move)?button:null;
}
function moveValue(button){
 const thrust=!!button&&button===mainThrustButton,[x,y]=thrust||!button?[0,0]:directions[button.dataset.move];
 return {x,y,button,thrust};
}
const holdsPhysicalThrust=()=>!!(thrustPtr||has('KeyE')||moveKey?.thrust);
const holdsMainThrust=()=>holdsPhysicalThrust()||movePulse?.thrust===true;
function resetReleasedThrust(){if(!holdsPhysicalThrust()){testThrustHeld=0;testThrustLatched=false;}}
const liveTrim=()=>movePtr??(moveKey?.thrust?null:moveKey)??(movePulse?.thrust?null:movePulse);
const ownsMovementPointer=id=>id!=null&&(movePtr?.id===id||thrustPtr?.id===id);
function paintMove(){
 const button=liveTrim()?.button??null,thrust=holdsMainThrust();
 if(movePad)movePad.dataset.steering=button||thrust?'true':'false';
 if(mainThrustButton){if(thrust)mainThrustButton.dataset.held='true';else delete mainThrustButton.dataset.held;}
 if(button!==heldMove){if(heldMove)delete heldMove.dataset.held;heldMove=button;if(button)button.dataset.held='true';}
}
if(movePad){
 const sectors=['e','se','s','sw','w','nw','n','ne'];
 function moveAt(e,allowThrust=false){
  const {left,top,width,height}=movePad.getBoundingClientRect();
  if(!width||!height||!Number.isFinite(e.clientX)||!Number.isFinite(e.clientY))return null;
  const x=(e.clientX-left)/width-.5,y=(e.clientY-top)/height-.5;
  if(Math.hypot(x,y)<.12)return allowThrust?mainThrustButton:null;
  const sector=sectors[(Math.round(Math.atan2(y,x)/(Math.PI/4))+8)%8];
  return movePad.querySelector('[data-move="'+sector+'"]');
 }
 movePad.addEventListener('pointerdown',e=>{
  if(state!=='play'||capitalLocked()||e.button>0||ownsMovementPointer(e.pointerId)||aimPtr?.id===e.pointerId||heldFirePointer(e.pointerId))return;
  const button=moveButton(e.target)??moveAt(e,true),thrust=!!button&&button===mainThrustButton;
  if(thrust?thrustPtr:movePtr)return;
  e.preventDefault();inputSource(true);unlockAudio(undefined,e);movePulse=null;
  const press={id:e.pointerId,held:0,touch:e.pointerType==='touch',...moveValue(button)};
  if(thrust){if(!holdsPhysicalThrust())pressSurge(e,'pointer');thrustPtr=press;}else movePtr=press;
  capture(movePad,e);paintMove();
 });
 const dragMove=e=>{
  if(state!=='play'||movePtr?.id!==e.pointerId)return;
  e.preventDefault();
  // Keep steering while a captured thumb slides off the buttons, including
  // through the middle. Use direction from the pad's center, not hit testing.
  const button=moveAt(e);
  if(button&&button!==movePtr.button)Object.assign(movePtr,moveValue(button));
  paintMove();
 };
 const endMove=(e,id=e.pointerId)=>{
  const pressed=thrustPtr?.id===id?thrustPtr:movePtr?.id===id?movePtr:null;
  if(!pressed)return;
  if(pressed.thrust){if(!['pointerup','touchend'].includes(e.type))surgeTap=null;thrustPtr=null;resetReleasedThrust();}else movePtr=null;
  try{movePad.releasePointerCapture?.(pressed.id);}catch{}
  if((e.type==='pointerup'||e.type==='touchend')&&state==='play'){
   unlockAudio(undefined,e);
   if(pressed.button&&!pressed.thrust&&pressed.held===0)movePulse={...moveValue(pressed.button),left:.065};
  }
  paintMove();
 };
 movePad.addEventListener('pointermove',dragMove);
 window.addEventListener('pointermove',e=>{if(!movePad.contains(e.target))dragMove(e);},true);
 for(const event of ['pointercancel','pointerup']){
  window.addEventListener(event,endMove,true);
  movePad.addEventListener(event,endMove);
 }
 movePad.addEventListener('lostpointercapture',e=>{if(e.target===movePad)endMove(e);});
 const moveTouch=touch=>touch.target===movePad||movePad.contains(touch.target);
 const isCenterTouch=touch=>moveButton(touch.target)===mainThrustButton||
  touch.target===movePad&&moveAt(touch,true)===mainThrustButton;
 const endMoveTouch=e=>{
  // Native touch lists retain the contact's start target; use them only
  // as a fallback if an iOS pointer release was not delivered.
  const changed=Array.from(e.changedTouches??[]).filter(moveTouch),still=Array.from(e.touches??[]).filter(moveTouch);
  for(const press of [thrustPtr,movePtr]){
   if(!press?.touch||!changed.length)continue;
   const matches=touch=>isCenterTouch(touch)===press.thrust;
   if(!still.length||changed.some(matches)&&!still.some(matches))endMove(e,press.id);
  }
 };
 for(const event of ['touchend','touchcancel'])window.addEventListener(event,endMoveTouch,{capture:true,passive:true});
 movePad.addEventListener('keydown',e=>{
  const button=moveButton(e.target);
  if(state!=='play'||!button||!['Space','Enter'].includes(e.code))return;
  e.preventDefault();if(moveKey||e.repeat)return;
  if(button===mainThrustButton&&!holdsPhysicalThrust())pressSurge(e,'control');
  inputSource(true);unlockAudio(undefined,e);movePulse=null;moveKey={code:e.code,held:0,...moveValue(button)};paintMove();
 });
 movePad.addEventListener('keyup',e=>{
  if(moveKey?.code!==e.code)return;
  e.preventDefault();const pressed=moveKey;moveKey=null;resetReleasedThrust();
  if(!movePtr&&!pressed.thrust&&pressed.held===0)movePulse={...moveValue(pressed.button),left:.065};
  paintMove();
 });
 movePad.addEventListener('focusout',()=>{if(moveKey){moveKey=null;resetReleasedThrust();paintMove();}});
 // Screen reader and other assistive activations may send click without hold.
 movePad.addEventListener('click',e=>{
  const button=moveButton(e.target);
  if(state!=='play'||e.detail!==0||(e.pointerType&&e.pointerId>=0)||!button||movePtr||moveKey)return;
  inputSource(true);unlockAudio(undefined,e);if(button===mainThrustButton)pressSurge(e,'accessible');movePulse={...moveValue(button),left:.065};paintMove();
 });
}
if(aimPad){
 const endAim=()=>{
  if(!aimPtr)return false;
  const {id}=aimPtr;aimPtr=null;showStick(aimPad);
  try{aimPad.releasePointerCapture?.(id);}catch{}
  return true;
 };
 const endAimPointer=e=>{
  if(aimPtr?.id!==e.pointerId)return;
  if(endAim()&&e.type==='pointerup'&&state==='play')unlockAudio(undefined,e);
 };
 const update=e=>{
  const v=stickVector(aimPad,e);showStick(aimPad,v);
  if(v.angle!==null){aimManuallyPlaced=true;autoLock=null;commandPilotAim(v.angle,true);}
 };
 aimPad.addEventListener('pointerdown',e=>{
  if(state!=='play'||capitalLocked()||e.button>0||aimPtr||ownsMovementPointer(e.pointerId)||heldFirePointer(e.pointerId))return;
  e.preventDefault();inputSource(true);aimPtr={id:e.pointerId,touch:e.pointerType==='touch'};capture(aimPad,e);update(e);
 });
 aimPad.addEventListener('pointermove',e=>{
  if(state!=='play'||aimPtr?.id!==e.pointerId)return;
  e.preventDefault();update(e);
 });
 for(const event of ['pointercancel','pointerup']){
  // Capture can fail. Observe releases outside the pad as well.
  window.addEventListener(event,endAimPointer,true);
  aimPad.addEventListener(event,endAimPointer);
 }
 aimPad.addEventListener('lostpointercapture',e=>{if(e.target===aimPad)endAimPointer(e);});
 const fromAim=touch=>touch.target===aimPad||aimPad.contains?.(touch.target);
 const endAimTouch=e=>{
  // Touch identifiers aren't pointer IDs. Check each touch's original target
  // so lifting the Fire or movement thumb cannot end a held aim.
  if(!aimPtr?.touch||!Array.from(e.changedTouches??[]).some(fromAim)||Array.from(e.touches??[]).some(fromAim))return;
  if(endAim()&&e.type==='touchend'&&state==='play')unlockAudio(undefined,e);
 };
 for(const event of ['touchend','touchcancel'])window.addEventListener(event,endAimTouch,{capture:true,passive:true});
}
fireButton?.addEventListener('keydown',e=>{
 if(e.repeat&&['Enter','Space'].includes(e.code))e.preventDefault();
});
function heldFirePointer(id){return firePointer!==null&&firePointer===id;}
function stopFirePointer(){
 if(firePointer===null)return;
 const id=firePointer;firePointer=null;skipFireClickUntil=audioClock()+1500;
 try{fireButton?.releasePointerCapture?.(id);}catch{}
}
function stopBallisticHold(){
 const hold=ballisticHold;ballisticHold=null;
 if(hold?.kind==='pointer'&&heldFirePointer(hold.id))stopFirePointer();
}
function fireNormalShot(){
 const id=fighterLoadout.weapon,gun=mountedGun();
 if(!gun?.normalInterval||elapsed+1e-9<(nextNormalShot.get(id)??0)||!fireShot())return false;
 nextNormalShot.set(id,elapsed+gun.normalInterval);
 return true;
}
function startBallisticHold(kind,id=null){
 if(flightMode.scaleFly||ballisticHold||state!=='play'||!mountedGun()?.holdRepeat||document.hidden)return false;
 ballisticHold={kind,id};fireNormalShot();return true;
}
function cancelFireBurst(reset=false){
 stopBurstEcho();
 if(fireBurst&&!reset)burstCooldown=fireBurst.profile.recovery;
 fireBurst=null;if(reset)burstCooldown=0;
 showFire();
}
function pressFire(kind,id=null){
 if(flightMode.simWatch)return;
 if(onlineBattle){if(p.hp>0)onlineTap=true;return;}
 if(fighterBattle&&fighterBattle.phase!=='combat')return;
 if(state!=='play'||capitalLocked()||document.hidden||fireBurst||burstCooldown>0)return;
 const gun=mountedGun();if(!gun)return;
 if(burstModes[fighterLoadout.weapon]){
  const profile=gun.burst??normalBurst;
  if(gun.he3PerShot&&p.he3+1e-8<volleyHe3(gun))return;
  aimForTouchAssist();
  const angle=pilotWeaponAim(),point=p.gimbalPoint;
  if(!fireShot(angle,null,true))return;
  fireBurst={angle,point,spread:gun.burstSpread*degrees,index:1,wait:profile.interval,profile};
  addFlightHeat(heatRules.burstActivation);
  if(fighterLoadout.weapon==='ballistic')playBallisticBurstEcho();
  showFire();
 }else if(gun.holdRepeat&&kind)startBallisticHold(kind,id);
 else fireNormalShot();
}
function advanceBurst(dt){
 if(fireBurst){
  fireBurst.wait-=dt;
  if(fireBurst.wait<=0){
   const {profile,angle,point,spread}=fireBurst;
   const aim=point?pilotWeaponAim(point):angle;
   if(!fireShot(aim+spread*profile.pattern[fireBurst.index],angle,true,spread*profile.pattern[fireBurst.index++],point)){cancelFireBurst();return;}
   if(fireBurst.index===profile.pattern.length){fireBurst=null;burstCooldown=profile.recovery;showFire();}
   else fireBurst.wait+=profile.interval;
  }
 }else advanceBurstRecovery(dt);
}
function advanceBurstRecovery(dt){
 if(burstCooldown<=0)return;
 burstCooldown=Math.max(0,burstCooldown-dt);
 if(!burstCooldown)showFire();
}
for(const node of [canvas,fireButton])node?.addEventListener('blur',()=>{if(ballisticHold?.kind==='key')stopBallisticHold();});
fireButton?.addEventListener('pointerdown',e=>{
 if(state!=='play'||capitalLocked()||document.hidden||e.button!==0||firePointer!==null||ballisticHold||ownsMovementPointer(e.pointerId)||aimPtr?.id===e.pointerId)return;
 e.preventDefault();inputSource(true);unlockAudio(undefined,e);
 // Don't wait for a synthetic click: multitouch can deliver down/up with
 // no click at all. Any independent pointer can press Fire.
 firePointer=e.pointerId;capture(fireButton,e);
 pressFire('pointer',e.pointerId);
});
for(const event of ['pointerup','pointercancel','lostpointercapture'])fireButton?.addEventListener(event,e=>{
 if(!heldFirePointer(e.pointerId))return;
 if(event==='pointerup')unlockAudio(undefined,e);
 if(ballisticHold?.kind==='pointer')stopBallisticHold();
 else stopFirePointer();
});
fireButton?.addEventListener('click',e=>{
 // Some browsers follow a pointer release with a compatibility click
 // carrying another pointer ID. Keyboard/assistive activations have no
 // pointer metadata and remain usable, including just after a touch.
 const fromPointer=e?.detail>0||!!(e?.pointerType&&e.pointerId>=0);
 if(fromPointer&&(firePointer!==null||audioClock()<=skipFireClickUntil))return;
 if(state!=='play'||ballisticHold)return;
 inputSource(true);unlockAudio(undefined,e);pressFire();
});
canvas.addEventListener('pointerdown',e=>{
 if(state!=='play'||capitalLocked()||e.pointerType!=='mouse'||e.button!==0)return;
 const q=fieldPoint(e);if(!q)return;e.preventDefault();inputSource(false);liveFocus();unlockAudio(undefined,e);
 if(!aimPtr)commandPilotAim(angleTo(q.x,q.y),false,q);pressFire();
});
canvas.addEventListener('pointermove',e=>{
 if(state!=='play'||capitalLocked()||e.pointerType!=='mouse'||aimPtr)return;
 const q=fieldPoint(e);if(!q)return;inputSource(false);commandPilotAim(angleTo(q.x,q.y),false,q);
});
function layout(){
 const box=canvas.getBoundingClientRect();
 hiDpi=Math.min(2.5,window.devicePixelRatio||1);viewW=Math.max(2,Math.round(box.width*hiDpi));viewH=Math.max(2,Math.round(box.height*hiDpi));
 if(canvas.width!==viewW)canvas.width=viewW;if(canvas.height!==viewH)canvas.height=viewH;
 // Keep the old uniform sprite scale, but use spare pixels to show more
 // world instead of drawing fixed-ratio black bars. Only extreme aspect
 // ratios zoom in enough to stay within the real world edges.
 const referenceScale=Math.min(viewW/VIEW_W,viewH/VIEW_H);
 const height=arena.bottom+edge-floorNorth();
 scale=Math.max(referenceScale,viewW/W,viewH/height);
 frameW=Math.min(W,viewW/scale);frameH=Math.min(height,viewH/scale);
}
if(window.ResizeObserver)new ResizeObserver(layout).observe(canvas);else window.addEventListener('resize',layout);
function blast(x,y,tone,count=12,base=1){
 const n=motion?.matches?Math.ceil(count/3):count;
 for(let i=0;i<n;i++){
  const a=rand(0,TAU),v=rand(28,155)*base,life=rand(.12,.52);
  sparks.push({x,y,dx:Math.cos(a)*v,dy:Math.sin(a)*v,life,max:life,r:rand(1,3)*base,tone});
 }
 if(sparks.length>420)sparks.splice(0,sparks.length-420);
}
function burstRing(x,y,size,colour){
 const life=.19;
 rings.push({x,y,size,colour,life,max:life});if(rings.length>22)rings.shift();
}
// Friendly fire is harmless, but a hull impact still needs visible feedback.
function flashFriendlyHull(x,y,dx,dy){
 burstRing(x,y,19,'#ffc57d');
 const light=motion?.matches;
 const back=Math.atan2(-dy,-dx);
 for(let i=0;i<(light?3:7);i++){
  const angle=back+(i-3)*.28,speed=light?0:74+i*11,life=light?.12:.23+i*.022;
  sparks.push({x:x+(light?i*3-3:0),y,dx:Math.cos(angle)*speed,dy:Math.sin(angle)*speed,
   life,max:life,r:i%2?2.5:3.5,tone:i%2?'#ffc075':'#fff0ce'});
 }
 if(sparks.length>420)sparks.splice(0,sparks.length-420);
}
const clashLife=.34,clashBurstLimit=12,clashColours=['#a9f7ff','#fceca5','#d9bdff','#f0ffff'];
function flashProjectileClash(x,y){
 // Keep the existing transient and its random stream. The added
 // cosmetic fan uses a position-derived angle, not combat RNG.
 blast(x,y,'#eafffb',7,.76);burstRing(x,y,12,'#c9f5ff');
 if(motion?.matches)for(const spark of sparks.slice(-3)){
  spark.dx=spark.dy=0;spark.life=spark.max=Math.min(.095,spark.life);
 }
 clashBursts.push({x,y,life:clashLife,twist:(x*.11+y*.07+elapsed)*1.7%TAU});
 if(clashBursts.length>clashBurstLimit)clashBursts.shift();
}
function paintClashBurst(fx){
 const age=clashLife-fx.life,reduced=motion?.matches;
 if(reduced&&age>.105)return;
 // Keep a roughly 26px visible footprint on a small phone canvas.
 const k=clamp(.60/Math.max(.24,scale/hiDpi),.82,2.35);
 const {x,y,twist}=fx;
 g.save();
 if(!reduced){
  // Three soft ion clouds separate and fade, below the bright spark fan.
  const cloud=Math.min(1,age/.043)*Math.max(0,1-age/clashLife);
  for(let i=0;i<3&&cloud>0;i++){
   const a=twist+i*TAU/3,spread=(3+age*(35+i*11))*k;
   const cx=x+Math.cos(a)*spread,cy=y+Math.sin(a)*spread,r=(6+age*33)*k;
   const mist=g.createRadialGradient(cx,cy,0,cx,cy,r);
   mist.addColorStop(0,'#d6edf5d9');mist.addColorStop(.51,'#92c7d88a');mist.addColorStop(1,'#8fb5ce00');
   g.globalAlpha=cloud*.49;g.fillStyle=mist;g.fillRect(cx-r,cy-r,r*2,r*2);
  }
  if(age<.22){
   g.lineCap='round';
   g.globalAlpha=Math.pow(1-age/.22,1.35);
   for(let i=0;i<9;i++){
    const a=twist+i*TAU/9+(i%2?.09:-.08),u=Math.cos(a),v=Math.sin(a);
    const reach=(9+age*(73+(i%3)*28))*k,len=(6+i%3*2.2)*(1-age/.25)*k;
    g.strokeStyle=clashColours[i%clashColours.length];g.lineWidth=(i%3===0?2.45:1.65)*k;g.beginPath();
    g.moveTo(x+u*reach,y+v*reach);g.lineTo(x+u*(reach+len),y+v*(reach+len));g.stroke();
   }
  }
 }
 if(age<.105){
  const f=1-age/.105,r=(reduced?17:23)*k;
  const halo=g.createRadialGradient(x,y,0,x,y,r);
  halo.addColorStop(0,'#ffffff');halo.addColorStop(.26,'#dbfbff');halo.addColorStop(.62,'#92ecff94');halo.addColorStop(1,'#80ddff00');
  g.globalAlpha=f*(reduced?.63:1);g.fillStyle=halo;g.fillRect(x-r,y-r,r*2,r*2);
  g.beginPath();g.lineWidth=1.5*k;g.strokeStyle='#d4f9ff';g.globalAlpha=f*.76;
  g.arc(x,y,(reduced?11:12+age*58)*k,0,TAU);g.stroke();
 }
 g.restore();
}
function capVelocity(body,max){
 const speed=Math.hypot(body.vx,body.vy);
 if(speed>max){body.vx*=max/speed;body.vy*=max/speed;}
}
// Emitter centres measured against the full-size, north-facing flight sprites.
const wingPodOffsets=Object.freeze({'bastion-9':[21.3,-2.2],'stocky-light-fighter':[15.2,-7.4]});
function fighterMuzzle(ship,heading,shot=ship.lastMuzzle){
 const offsets=wingPodOffsets[ship.fighter??ship.fit?.hull];
 if(!offsets)return {x:ship.x+Math.cos(heading)*(ship.r+4),y:ship.y+Math.sin(heading)*(ship.r+4)};
 const side=shot?.side??-1,localX=side*offsets[0],localY=offsets[1],u=Math.cos(ship.aim),v=Math.sin(ship.aim);
 return {localX,localY,x:ship.x-v*localX-u*localY,y:ship.y+u*localX-v*localY};
}
const nextMuzzle=ship=>fighterMuzzle(ship,ship.aim,{side:ship.lastMuzzle?-ship.lastMuzzle.side:-1});
function podBearingToPoint(ship,point){
 const from=nextMuzzle(ship),dx=point.x-from.x,dy=point.y-from.y;
 return Math.hypot(dx,dy)>9?Math.atan2(dy,dx):undefined;
}
function pilotWeaponAim(point=p.gimbalPoint){
 return gimbalBearing(p,point?podBearingToPoint(p,point)??p.gimbalTarget:p.gimbalTarget);
}
function pairedAim(ship,point,angle,spread=0){
 return (ship===p?sparrowSides(fighterFit):ship.fit.sparrowSides).map(side=>{
  const mount=fighterMuzzle(ship,ship.aim,{side});
  const a=point?gimbalBearing(ship,Math.atan2(point.y-mount.y,point.x-mount.x)+spread):gimbalBearing(ship,angle);
  return {side,mount,a};
 });
}
function markFighterMuzzle(ship,angle){
 ship.lastMuzzles=null;
 if(!wingPodOffsets[ship.fighter??ship.fit?.hull])return;
 ship.lastMuzzle={side:ship.lastMuzzle?-ship.lastMuzzle.side:-1,angle};
}
function paintWingPodFlash(ship,alpha){
 const mounts=ship.lastMuzzles??(ship.lastMuzzle?[ship.lastMuzzle]:[]);
 if(!mounts.length||!wingPodOffsets[ship.fighter??ship.fit?.hull])return false;
 for(const shot of mounts){
  const mount=fighterMuzzle(ship,ship.aim,shot);
  g.save();g.translate(mount.localX,mount.localY);g.rotate(headingDelta(ship.aim,shot.angle));
  g.globalAlpha=alpha;g.fillStyle='#ffcd76';g.fillRect(-2.5,-7,5,8);
  g.fillStyle='#fff3ce';g.fillRect(-1.2,-8,2.4,8);g.restore();
 }
 return true;
}
function wingPodVisualStart(ship,mount,kick=0){
 if(mount.localX===undefined)return null;
 if(ship!==p)return {x:0,y:-8,at:elapsed};
 const lively=!motion?.matches,push=lively?kick*35:0;
 const bob=lively?hoverBob(elapsed,flightVisuals.get(ship)?.speed??0):0;
 return {x:-Math.cos(ship.aim)*push,y:-8-bob-Math.sin(ship.aim)*push,at:elapsed};
}
function pilotNormalBearing(weapon,index=normalShots.get(weapon)??0){
 return pilotWeaponAim()+normalPattern[index]*guns[weapon].normalSpread*degrees;
}
function fireShot(angle=null,heading=null,burst=false,pairSpread=0,pairPoint=p.gimbalPoint){
 if(onlineBattle||flightMode.scaleFly||fighterBattle&&(fighterBattle.phase!=='combat'||p.y>fighterCross.south))return false;
 if(state!=='play'||capitalLocked()||document.hidden)return;
 const weapon=fighterLoadout.weapon,gun=mountedGun();
 if(!gun||!spendShotHe3(volleyHe3(gun)))return false;
 if(angle===null){
  aimForTouchAssist();
  const i=normalShots.get(weapon)??0;
  angle=pilotNormalBearing(weapon,i);
  normalShots.set(weapon,(i+1)%normalPattern.length);
 }
 if(gun.wingMount){
  const emit=(mount,a)=>{const u=Math.cos(a),v=Math.sin(a),{x,y}=mount,visual=wingPodVisualStart(p,mount,gun.kick);
   const projectile={x,y,vx:u*gun.speed,vy:v*gun.speed,a,weapon,damage:gun.damage,visual,...(flightMode.loaner?{rangeCycle}:{})};
   shots.push(projectile);startProjectileVoice(projectile);
   p.vx-=u*gun.recoil*p.recoilFactor;p.vy-=v*gun.recoil*p.recoilFactor;
   practiceShots++;addFlightHeat(burst?heatRules.burstShot:heatRules.normalShot);
   burstRing(x+(visual?.x??0),y+(visual?.y??0),gun.muzzle,gun.ring);
  };
  p.lastMuzzles=pairedAim(p,pairPoint,angle,pairSpread).map(({mount,a,side})=>{emit(mount,a);return {side,angle:a};});
  capVelocity(p,255);sound('shot');duckArenaMusic();recoil=gun.kick;kick(gun.kick);showFlightPower();updateHud();
  return true;
 }
 const a=hasGimbal(p)?gimbalBearing(p,angle):angle,ux=Math.cos(a),uy=Math.sin(a);
 markFighterMuzzle(p,a);
 const mount=fighterMuzzle(p,heading??p.aim),{x,y}=mount,visual=wingPodVisualStart(p,mount,gun.kick);
 const projectile={x,y,vx:ux*gun.speed,vy:uy*gun.speed,a,weapon,damage:gun.damage,...(visual?{visual}:{}),...(flightMode.loaner?{rangeCycle}:{})};
 shots.push(projectile);
 addFlightHeat(burst?heatRules.burstShot:heatRules.normalShot);
 p.vx-=ux*gun.recoil*p.recoilFactor;p.vy-=uy*gun.recoil*p.recoilFactor;capVelocity(p,255);practiceShots++;updateHud();
 sound('shot');duckArenaMusic();startProjectileVoice(projectile);recoil=gun.kick;kick(gun.kick);burstRing(x+(visual?.x??0),y+(visual?.y??0),gun.muzzle,gun.ring);
 if(gun.he3PerShot)showFlightPower();
 return true;
}
function hardWallImpact(body,normal,approachSpeed){
 if(state!=='play'||duelResult==='victory'||body.impactCooldown>0||normal<hardImpactSpeed||normal<approachSpeed*hardImpactAlignment)return;
 body.impactCooldown=.30;
 const damage=Math.min(6,3+Math.floor((normal-hardImpactSpeed)/20));
 loseHull(body,damage);
 kick(.21);sound('hit');burstRing(body.x,body.y,26,'#ffad82');
 if(body.hp===0)disablePlayer(false);
}
function disablePlayer(laserHit){
 breakRiftFighter(p);
 if(flightMode.simWatch&&!fighterBattle&&simDirector){
  if(!simDirector.pilotDown){
   simDirector.pilotDown=true;simDirector.pilotDownAt=elapsed;p.vx=p.vy=0;
   clearInput();updateDuelReadout();
  }
  return;
 }
 if(fighterBattle){finishFighterBattle('disabled');return;}
 const lost=activeVanduls().length>0;
 if(duelEnabled){
  duelResult='lost';vandulLasers=[];
  vanduls=[];autoLock=null;
  updateDuelReadout();
 }
 state='disabled';syncPauseControl();duelCountdown=0;vandulIngress=null;waveCountdownFresh=false;updateDuelCountdown();p.vx=p.vy=0;
 stopArenaMusic();clearInput();shots=[];
 const exit=returnFlightToCarrier?flightExitLabel():'Main Menu';
 if(flightMode.redGrinSolo){
  duelResult='lost';vandulLasers=[];updateDuelReadout();
  showRedGrinDebrief(false);
 }else if(isTileBattle()){
  menu('Fighter eliminated','You’re out of the battle. No career progress was saved.','reset','Rematch','TEST COMPLETE');
  overlay.innerHTML+=button(exit,'main-menu');
 }else if(requiresBattleRepair()){
  menu(lost?'Vandul wins':'Hull disabled','Repair your fighter in the Carrier Hangar before launching again.','main-menu',exit,'HULL 0 HP');
  if(pendingBattleDamage)warnDamageSave();
 }else{
  menu(lost?'Vandul wins':'Hull disabled',laserHit?'Vandul’s lasers disabled your fighter. Reset for a rematch.':
   'Hard impact. Reset the field to retry.','reset','Reset field','HULL 0 HP');
  overlay.innerHTML+=button(exit,'main-menu');
 }
 overlay.querySelector('button')?.focus({preventScroll:true});
}
function wall(body,damage=false){
 const l=arena.left+body.r,r=arena.right-body.r,t=arena.top+body.r,b=arena.bottom-body.r;
 const approachSpeed=damage?Math.hypot(body.vx,body.vy):0;
 let impulse=0;
 if(body.x<l||body.x>r){const sign=body.x<l?-1:1;body.x=clamp(body.x,l,r);if(body.vx*sign>0){impulse=Math.max(impulse,Math.abs(body.vx));body.vx=body.craft?0:-body.vx*.39;if(!body.craft)body.spin+=body.vy*sign*.014;}}
 if(body.y<t||body.y>b){const sign=body.y<t?-1:1;body.y=clamp(body.y,t,b);if(body.vy*sign>0){impulse=Math.max(impulse,Math.abs(body.vy));body.vy=body.craft?0:-body.vy*.39;if(!body.craft)body.spin-=body.vx*sign*.014;}}
 if(impulse>105&&body.wallFx<=0){body.wallFx=.23;blast(body.x,body.y,'#ffc390',4,.56);if(!body.craft)body.hitGlow=Math.max(body.hitGlow,.20);}
 if(damage&&body.craft)hardWallImpact(body,impulse,approachSpeed);
}
function contact(a,b,fx){
 const dx=b.x-a.x,dy=b.y-a.y,sum=a.r+b.r,ds=dx*dx+dy*dy;
 if(ds>=sum*sum)return;
 const d=Math.sqrt(ds),nx=d>1e-6?dx/d:1,ny=d>1e-6?dy/d:0,tx=-ny,ty=nx;
 const w=a.invMass+b.invMass,over=Math.max(0,sum-d-.008)/w;
 a.x-=nx*over*a.invMass;a.y-=ny*over*a.invMass;b.x+=nx*over*b.invMass;b.y+=ny*over*b.invMass;
 const rvx=b.vx-a.vx,rvy=b.vy-a.vy,normal=rvx*nx+rvy*ny;
 if(normal>=0)return;
 const j=-(1+((a.craft||b.craft)?.19:.34))*normal/w,an=a.craft?0:2*a.invMass/(a.r*a.r),bn=b.craft?0:2*b.invMass/(b.r*b.r);
 const vt=rvx*tx+rvy*ty-a.spin*a.r-b.spin*b.r,jt=clamp(-vt/(w+an*a.r*a.r+bn*b.r*b.r),-j*.36,j*.36);
 const ix=nx*j+tx*jt,iy=ny*j+ty*jt;
 a.vx-=ix*a.invMass;a.vy-=iy*a.invMass;b.vx+=ix*b.invMass;b.vy+=iy*b.invMass;
 a.spin=clamp(a.spin-a.r*jt*an,-15,15);b.spin=clamp(b.spin-b.r*jt*bn,-15,15);
 if(fx&&-normal>78&&(a.wallFx<=0||b.wallFx<=0)){
  a.wallFx=.20;b.wallFx=.20;
  if(!a.craft)a.hitGlow=Math.max(a.hitGlow,.25);if(!b.craft)b.hitGlow=Math.max(b.hitGlow,.25);
  blast(a.x+nx*a.r,a.y+ny*a.r,'#ffc390',5,.58);sound('hit');
 }
}
// Earliest intersection of a projectile and a moving circle during this step.
function sweptCircle(x,y,dx,dy,r){
 const c=x*x+y*y-r*r;if(c<=0)return 0;
 const a=dx*dx+dy*dy;if(a<1e-10)return null;
 const b=x*dx+y*dy;if(b>=0)return null;
 const disc=b*b-a*c;if(disc<0)return null;
 const t=(-b-Math.sqrt(disc))/a;return t>=0&&t<=1?t:null;
}
// Optics are separate from projectile policy. Only real physical bodies
// (including solid wreck pieces and other ships) are occluders, not old decals.
function livingAllies(){return [testLead,wingman,...formationEscorts].filter(body=>body?.hp>0);}
function visionBlockers(scenery=[...cones,...asteroids,...sceneryDebris]){
 return [...scenery,...vanduls,...livingAllies(),...activeWrecks.flatMap(w=>w.bodies)];
}
function playerCanSee(ship,blockers){return firstSightCover(p,ship,blockers)===null;}
function firstSightCover(from,to,obstacles,padding=0){
 const dx=to.x-from.x,dy=to.y-from.y;
 let closest=null,first=Infinity;
 for(const body of obstacles){
  if(body===from||body===to)continue;
  const t=sweptCircle(from.x-body.x,from.y-body.y,dx,dy,body.r+padding);
  if(t!==null&&t<first){first=t;closest=body;}
 }
 return closest;
}
function predictVandulSearch(last,radius){
 if(!last)return null;
 const lead=.78,n=Math.hypot(last.vx,last.vy)*lead,scale=n>80?80/n:1;
 return {x:clamp(last.x+last.vx*lead*scale,arena.left+radius,arena.right-radius),
  y:clamp(last.y+last.vy*lead*scale,arena.top+radius,arena.bottom-radius)};
}
function rememberVandulContact(ship,target,at){
 if(!ship.lastSeen){ship.lastSeen={x:target.x,y:target.y,at,vx:0,vy:0};return;}
 const last=ship.lastSeen,dt=at-last.at;
 if(dt>0){
  last.vx=dt<=.05?(target.x-last.x)/dt:0;last.vy=dt<=.05?(target.y-last.y)/dt:0;
  last.x=target.x;last.y=target.y;last.at=at;
 }
}
const attackSelection=Object.freeze({allyBias:24,retainBias:32,allyRange:570});
function chooseVandulTarget(ship,obstacles,playerVisible,maxRange=Infinity){
 let best=null,score=Infinity,withPilot;
 const choices=isFourWayBattle()?[p,...vanduls.filter(other=>other!==ship)]:[p,...livingAllies()];
 for(const target of choices){
  if(!target.hp)continue;
  const distance=Math.hypot(target.x-ship.x,target.y-ship.y);
  if(distance>maxRange)continue;
  const visible=(target===p?playerVisible:distance<=attackSelection.allyRange&&
   firstSightCover(ship,target,withPilot??=[...obstacles,p])===null)||thermalContact(ship,target);
  if(!visible)continue;
  // Prefer a closer clear lane. A modest escort bias gives wingmen a chance
  // to draw fire; retention prevents two nearly equal bearings flickering.
  const value=distance-(target===p||isFourWayBattle()?0:attackSelection.allyBias)-(target===ship.attackTarget?attackSelection.retainBias:0);
  if(value<score){best=target;score=value;}
 }
 return best;
}
function updatePlayerVandulContact(ship,visible,at){
 if(visible){
  ship.playerSightLostAt=null;ship.playerContact={x:ship.x,y:ship.y,at};
 }else if(ship.playerContact){
  ship.playerSightLostAt??=at;
  if(at-ship.playerSightLostAt<vandulContactSeconds-1e-8)ship.playerContact={x:ship.x,y:ship.y,at};
  else ship.playerContact=null;
 }
}
function updateVandulSight(ship,obstacles,at,sample){
 const playerVisible=!!p.hp&&playerCanSee(ship,obstacles);
 const viable=chooseVandulTarget(ship,obstacles,playerVisible,ship.trainingGuard?trainingAlertRange:Infinity);
 const optical=viable===p?playerVisible:!!viable&&!firstSightCover(ship,viable,[...obstacles,p]);
 ship.thermalTracking=!!viable&&!optical;
 if(ship.trainingGuard){
  if(viable){
   ship.trainingGuard=false;ship.nextLaser=at+vandulProfile.laser.grace+(ship.slot%4)*.19;
   ship.nextDriveBy=at+2.0+driveRandom(ship)*1.35;
  }else{
   ship.seesTarget=false;ship.seesPlayer=playerVisible;
   if(sample)updatePlayerVandulContact(ship,playerVisible,at);
   return null;
  }
 }
 const previous=ship.attackTarget;
 const target=viable??(previous?.hp>0?previous:null);
 ship.seesPlayer=playerVisible;
 if(sample)updatePlayerVandulContact(ship,playerVisible,at);
 ship.seesTarget=!!viable;
 if(target!==previous){
  ship.attackTarget=target;
  ship.lastSeen=null;ship.sightLostAt=null;ship.searchPrediction=null;ship.searchPath=null;
  ship.flankedCover=null;ship.searchSide=0;ship.blindShot=null;ship.blindAttempted=false;
  if(previous){
   if(ship.drive&&ship.drive.phase!=='recover')finishDriveBy(ship);
   ship.laserLockLost=true;
   if(!target){ship.patrolAnchor={x:ship.x,y:ship.y};ship.patrolLeg=0;}
  }
 }
 if(!viable){
  if(ship.sightLostAt===null)ship.sightLostAt=at;
  ship.laserLockLost=true;
  const lostFor=at-ship.sightLostAt;
  if(target&&ship.lastSeen&&lostFor<vandulContactSeconds-1e-8){
   // During grace the fading contact follows motion without authorizing
   // fire. After grace no new position of the hidden target is sampled.
   if(sample)rememberVandulContact(ship,target,at);
   queueHeading(ship,bearing(ship,target));
  }else if(ship.lastSeen){
   if(lostFor>=vandulContactSeconds+vandulSearchSeconds-1e-8){
    ship.lastSeen=null;ship.searchPath=null;ship.searchPrediction=null;ship.flankedCover=null;
    ship.blindShot=null;ship.searchSide=0;ship.patrolAnchor={x:ship.x,y:ship.y};ship.patrolLeg=0;
   }else if(!ship.searchPrediction)ship.searchPrediction=predictVandulSearch(ship.lastSeen,ship.r);
  }
  if(ship.drive&&ship.drive.phase!=='recover')finishDriveBy(ship);
  return null;
 }
 if(sample)rememberVandulContact(ship,target,at);
 ship.sightLostAt=null;ship.searchPrediction=null;ship.blindShot=null;
 if(ship.thermalTracking){
  // Heat supplies a position to flank, never a clear firing lane or return sight.
  ship.laserLockLost=true;
  return target;
 }
 ship.searchSide=0;ship.searchPath=null;ship.flankedCover=null;
 queueHeading(ship,bearing(ship,target));
 if(ship.laserLockLost){
  ship.nextLaser=Math.max(ship.nextLaser,at+vandulProfile.laser.windup);
  ship.laserLockLost=false;
 }
 return target;
}
function driveRandom(ship){
 ship.driveSeed=(Math.imul(1664525,ship.driveSeed)+1013904223)>>>0;
 return ship.driveSeed/4294967296;
}
function clearDrivePath(ship,from,to,margin){
 const inside=pt=>pt.x>=arena.left+ship.r+7&&pt.x<=arena.right-ship.r-7&&pt.y>=arena.top+ship.r+7&&pt.y<=arena.bottom-ship.r-7;
 if(!inside(to))return false;
 const dx=to.x-from.x,dy=to.y-from.y;
 return [p,...livingAllies(),...asteroids,...vanduls].every(body=>body===ship||sweptCircle(from.x-body.x,from.y-body.y,dx,dy,ship.r+body.r+margin)===null);
}
function planDriveBy(ship,target,ux,uy,distance){
 if(distance<132)return null;
 const preference=driveRandom(ship)<.5?1:-1;
 for(const side of [preference,-preference])for(const gap of [driveByRules.minGap,84,102]){
  // First join an offset lane, then pass it all the way to the far side.
  const laneX=target.x-uy*gap*side,laneY=target.y+ux*gap*side;
  const gate={x:laneX-ux*66,y:laneY-uy*66},exit={x:laneX+ux*84,y:laneY+uy*84};
  if(clearDrivePath(ship,ship,gate,10)&&clearDrivePath(ship,gate,exit,10))
   return {phase:'tell',until:duelClock+driveByRules.windup,gate,exit,side,leg:0};
 }
 return null;
}
// Redirection is relative to travel, not aim. Along-track thrust and braking
// remain available; lateral correction progressively loses authority at speed
// and while the main drive is pushing. Shared by player and both AI teams.
function applySteeringCorrection(ship,dx,dy,reference,mainDrive=false){
 const speed=Math.hypot(ship.vx,ship.vy);
 if(speed>1e-8){
  const ratio=speed/Math.max(1,reference);
  const speedLoad=clamp((ratio-.20)/.80,0,1);
  const driveLoad=mainDrive?clamp((ratio-.06)/.52,0,1):0;
  const loss=.38*speedLoad*speedLoad+.30*driveLoad;
  const ux=ship.vx/speed,uy=ship.vy/speed,cross=(dy*ux-dx*uy)*loss;
  dx+=cross*uy;dy-=cross*ux;
 }
 ship.vx+=dx;ship.vy+=dy;
}
function steerVelocity(ship,vx,vy,acceleration,dt,mainDrive=false){
 const dx=vx-ship.vx,dy=vy-ship.vy,gap=Math.hypot(dx,dy);
 if(gap>0){
  const blend=Math.min(1,acceleration*dt/gap);
  applySteeringCorrection(ship,dx*blend,dy*blend,driveByRules.topSpeed,mainDrive);
 }
}
function finishDriveBy(ship){
 ship.drive={phase:'recover',until:duelClock+driveByRules.pullback};
 ship.nextDriveBy=ship.drive.until+1.7+driveRandom(ship)*1.3;
}
function steerDriveBy(ship,target,ux,uy,distance,dt){
 const rules=driveByRules;
 if(!ship.drive&&duelClock>=ship.nextDriveBy){
  ship.drive=planDriveBy(ship,target,ux,uy,distance);
  if(!ship.drive)ship.nextDriveBy=duelClock+.95+driveRandom(ship)*.65;
 }
 const move=ship.drive;if(!move)return false;
 if(move.phase==='recover'){
  if(duelClock>=move.until){ship.drive=null;return false;}
  return false; // Normal cover-aware steering with a stronger initial pullback.
 }
 if(move.phase==='tell'){
  if(!clearDrivePath(ship,ship,move.gate,9)||!clearDrivePath(ship,move.gate,move.exit,9)){
   finishDriveBy(ship);return false;
  }
  if(duelClock<move.until){steerVelocity(ship,0,0,rules.acceleration*.50*ship.invMass,dt);return true;}
  move.phase='pass';move.until=duelClock+rules.runLimit;
 }
 if(move.leg===0&&Math.hypot(move.gate.x-ship.x,move.gate.y-ship.y)<18)move.leg=1;
 const waypoint=move.leg===0?move.gate:move.exit;
 const dx=waypoint.x-ship.x,dy=waypoint.y-ship.y,gap=Math.hypot(dx,dy);
 const forecast={x:ship.x+ship.vx*.13,y:ship.y+ship.vy*.13};
 if(duelClock>=move.until||(move.leg===1&&gap<16)||!clearDrivePath(ship,ship,waypoint,8)||
  (Math.hypot(ship.vx,ship.vy)>55&&!clearDrivePath(ship,ship,forecast,4))){
  finishDriveBy(ship);return false;
 }
 const speed=Math.min(rules.topSpeed,Math.max(110,gap*5));
 steerVelocity(ship,dx*speed/gap,dy*speed/gap,rules.acceleration*ship.invMass,dt,true);
 return true;
}
function steerAroundVandulCover(ship,dirX,dirY,obstacles,pace,acceleration,dt){
 for(const a of obstacles){
  if(a===ship)continue;
  const rx=ship.x-a.x,ry=ship.y-a.y,d=Math.hypot(rx,ry),safe=a.r+ship.r+27;
  if(d<1||d>=safe)continue;
  const ax=rx/d,ay=ry/d,inward=Math.min(0,dirX*ax+dirY*ay),avoid=.55*(safe-d)/27-inward;
  dirX+=ax*avoid;dirY+=ay*avoid;
 }
 const magnitude=Math.max(1,Math.hypot(dirX,dirY));
 steerVelocity(ship,dirX*pace/magnitude,dirY*pace/magnitude,acceleration*ship.invMass,dt);
}
function safeSearchLeg(ship,from,to,bodies){
 const inset=ship.r+6;
 return to.x>=arena.left+inset&&to.x<=arena.right-inset&&to.y>=arena.top+inset&&to.y<=arena.bottom-inset&&
  firstSightCover(from,to,bodies,ship.r+4)===null;
}
function chooseSearchFlank(ship,target,predicted,blocker,bodies){
 const dx=target.x-ship.x,dy=target.y-ship.y,gap=Math.hypot(dx,dy);
 if(gap<1e-6)return null;
 const ux=dx/gap,uy=dy/gap,r=blocker.r+ship.r+12;
 let path=null,shortest=Infinity;
 for(const side of [1,-1])for(const widen of [1,1.25]){
  const x=blocker.x-uy*r*widen*side,y=blocker.y+ux*r*widen*side;
  const gate={x:x-ux*r*.95,y:y-uy*r*.95},peek={x:x+ux*r*.90,y:y+uy*r*.90};
  if(!safeSearchLeg(ship,ship,gate,bodies)||!safeSearchLeg(ship,gate,peek,bodies))continue;
  const cost=Math.hypot(gate.x-ship.x,gate.y-ship.y)+.35*Math.hypot(peek.x-predicted.x,peek.y-predicted.y);
  if(cost<shortest){shortest=cost;path={blocker,gate,peek,leg:0};}
 }
 return path;
}
function searchForTarget(ship,dt,obstacles,current=null){
 const target=current??ship.lastSeen,predicted=current??ship.searchPrediction??target;
 const phase=duelClock*1.22+ship.orbitPhase,bodies=obstacles.filter(body=>body!==ship);
 let dirX=.55*Math.sin(phase),dirY=.30*Math.cos(phase);
 if(target){
  const dx=target.x-ship.x,dy=target.y-ship.y,distance=Math.hypot(dx,dy);
  if(distance>1e-6)queueHeading(ship,Math.atan2(dy,dx));
  const blocker=firstSightCover(ship,target,obstacles);
  if(!ship.searchPath&&blocker&&blocker!==ship.flankedCover)ship.searchPath=chooseSearchFlank(ship,target,predicted,blocker,bodies);
  const path=ship.searchPath;
  if(path){
   if(path.leg===0&&Math.hypot(path.gate.x-ship.x,path.gate.y-ship.y)<10)path.leg=1;
   const waypoint=path.leg===0?path.gate:path.peek;
   const sx=waypoint.x-ship.x,sy=waypoint.y-ship.y,gap=Math.hypot(sx,sy);
   if(path.leg===1&&gap<10){
    ship.flankedCover=path.blocker;ship.searchPath=null;
   }else if(safeSearchLeg(ship,ship,waypoint,bodies)){
    const pace=Math.min(112,Math.max(62,gap*4));
    steerVelocity(ship,sx*pace/gap,sy*pace/gap,driveByRules.acceleration*.54*ship.invMass,dt);
    return;
   }else ship.searchPath=null;
  }
  if(blocker&&blocker!==ship.flankedCover&&distance>1e-6){
   const ux=dx/distance,uy=dy/distance;
   if(!ship.searchSide)ship.searchSide=(-uy*(W/2-ship.x)+ux*((H+floorNorth())/2-ship.y)>=0?1:-1);
   dirX=ux*.24-uy*.93*ship.searchSide;dirY=uy*.24+ux*.93*ship.searchSide;
  }else{
   const sx=predicted.x-ship.x,sy=predicted.y-ship.y,gap=Math.hypot(sx,sy);
   if(gap>42){dirX=sx/gap*.70;dirY=sy/gap*.70;}
  }
 }else{
  // A ship without a tracked target patrols around its own admission point.
  // Its starting side is slot-based, independent of where the player is hiding.
  const side=ship.slot%2===0?-1:1,inset=ship.r+32;
  const points=[[100*side,16],[62*side,62],[-94*side,36],[-61*side,-24]];
  const [ox,oy]=points[ship.patrolLeg];
  const tx=clamp(ship.patrolAnchor.x+ox,arena.left+inset,arena.right-inset),ty=clamp(ship.patrolAnchor.y+oy,arena.top+inset,arena.bottom-inset);
  const dx=tx-ship.x,dy=ty-ship.y,gap=Math.hypot(dx,dy);
  if(gap<15)ship.patrolLeg=(ship.patrolLeg+1)%points.length;
  else{dirX=dx/gap*.78;dirY=dy/gap*.78;queueHeading(ship,Math.atan2(dy,dx));}
 }
 // Search uses only the frozen sighting/prediction, nearby bodies and arena bounds.
 const inset=ship.r+58;
 if(ship.x<arena.left+inset)dirX=Math.max(dirX,.36);
 if(ship.x>arena.right-inset)dirX=Math.min(dirX,-.36);
 if(ship.y<arena.top+inset)dirY=Math.max(dirY,.36);
 if(ship.y>arena.bottom-inset)dirY=Math.min(dirY,-.36);
 steerAroundVandulCover(ship,dirX,dirY,bodies,vandulProfile.speed,vandulProfile.acceleration,dt);
}
function steerTrainingPatrol(ship,dt,obstacles){
 const {group,ox,oy}=ship.post,patrol=trainingPatrols[group];
 const t=(duelClock+.25)*(.40+group*.045),side=group===1?-1:1;
 const x=patrol.x+side*92*Math.sin(t)+ox,y=patrol.y+66*(Math.cos(t)-1)+oy;
 const dx=x-ship.x,dy=y-ship.y;
 const close=ship.r+30;
 const local=obstacles.filter(body=>Math.abs(body.y-ship.y)<body.r+close+95);
 queueHeading(ship,Math.atan2(-66*Math.sin(t),side*92*Math.cos(t)));
 steerAroundVandulCover(ship,dx/31,dy/31,local,55,vandulProfile.acceleration,dt);
}
function steerVandul(ship,dt,obstacles){
 const at=duelClock+dt;
 const target=updateVandulSight(ship,obstacles,at,false);
 if(!target){
  if(ship.trainingGuard){steerTrainingPatrol(ship,dt,obstacles);return;}
  if(isFourWayBattle()&&!ship.lastSeen){
   const dx=(arena.left+arena.right)/2-ship.x,dy=(arena.top+arena.bottom)/2-ship.y,d=Math.hypot(dx,dy);
   if(d>68){queueHeading(ship,Math.atan2(dy,dx));steerAroundVandulCover(ship,dx/d,dy/d,obstacles,95,vandulProfile.acceleration,dt);return;}
  }
  if(ship.lastSeen&&at<ship.sightLostAt+vandulContactSeconds-1e-8)
   steerVelocity(ship,0,0,vandulProfile.acceleration*ship.invMass,dt);
  else searchForTarget(ship,dt,ship.attackTarget?.allyShip?[...obstacles,p]:obstacles);
  return;
 }
 if(ship.thermalTracking){searchForTarget(ship,dt,target===p?obstacles:[...obstacles,p],target);return;}
 const dx=target.x-ship.x,dy=target.y-ship.y,distance=Math.hypot(dx,dy);
 if(distance<1e-6)return;
 const ux=dx/distance,uy=dy/distance;
 if(steerDriveBy(ship,target,ux,uy,distance,dt))return;
 const recovering=ship.drive?.phase==='recover';
 const {speed,acceleration}=vandulProfile;
 let radial=distance<190?clamp((distance-190)/72,-1,0):clamp((distance-214)/100,0,.80);
 const side=.59*Math.sin(duelClock*1.55+.70+ship.orbitPhase);
 if(recovering&&distance<193)radial=Math.min(radial,-.76);
 steerAroundVandulCover(ship,ux*radial-uy*side,uy*radial+ux*side,[...asteroids,...vanduls,...livingAllies()],
  recovering?speed*1.27:speed,recovering?driveByRules.recoveryAcceleration:acceleration,dt);
}
function nudgeAsteroid(body,ux,uy,force,x,y,material){
 const {linear,spin}=asteroidImpulse[material];
 body.vx+=ux*force*body.invMass*linear;body.vy+=uy*force*body.invMass*linear;capVelocity(body,42);
 const lever=clamp(((x-body.x)*uy-(y-body.y)*ux)/body.r,-1,1);
 body.rockSign*=-1;
 body.spin=clamp(body.spin+spin*(Math.abs(lever)<.10?body.rockSign*.18:Math.sign(lever)*(.16+.36*Math.abs(lever))),-.62,.62);
 body.hitGlow=.25;
}
function applyShotImpact(hit,bolt,gun,x,y,cx,cy){
 const ux=Math.cos(bolt.a),uy=Math.sin(bolt.a);
 const force=clamp(((bolt.vx-hit.vx)*ux+(bolt.vy-hit.vy)*uy)*gun.push,35,gun.pushMax);
 if(hit.asteroid){
  nudgeAsteroid(hit,ux,uy,gun.coverPush??force,x,y,gun.kind==='ballistic'?'ballistic':'laser');return;
 }
 const impulse=hit.craft||hit.allyShip||hit.vandul||hit.debris?force*hit.invMass:force;
 hit.vx+=ux*impulse;hit.vy+=uy*impulse;capVelocity(hit,hit.craft?255:340);
 if(!hit.craft)hit.spin=clamp(hit.spin+((x-cx)*uy-(y-cy)*ux)*impulse*.00233,-15,15);
}
function coolVandul(ship,at){
 ship.heat=Math.max(0,ship.heat-vandulHeat.rate*Math.max(0,at-Math.max(ship.heatAt,ship.heatRest)));
 ship.heatAt=Math.max(ship.heatAt,at);
 if(ship.overheated&&ship.heat<=vandulHeat.resume){
  ship.overheated=false;
  ship.nextLaser=Math.max(ship.nextLaser,at+vandulProfile.laser.windup);
 }
}
function emitVandulLaser(ship,aim,firedAt,blindGuess=false,second=false){
 if(ship.overheated)return;
 coolVandul(ship,firedAt);
 ship.heat=Math.min(vandulHeat.max,ship.heat+vandulHeat.shot);
 ship.heatRest=ship.heatAt+vandulHeat.rest;
 if(ship.heat>=vandulHeat.max){ship.overheated=true;ship.blindShot=null;ship.laserBurst=null;}
 const {laser}=vandulProfile,bonus=ship.stacks.filter(stack=>stack.hitAt<=firedAt&&firedAt<stack.expiresAt).length;
 const pattern=(ship.laserIndex+ship.laserPhase)%laserPattern.length;ship.laserIndex++;
 const a=aim+(laser.baseSpread+bonus)*degrees*laserPattern[pattern];
 const muzzle=ship.r+3,rail=second?5:-5;
 const x=ship.x+Math.cos(aim)*muzzle-Math.sin(aim)*rail,y=ship.y+Math.sin(aim)*muzzle+Math.cos(aim)*rail;
 vandulLasers.push({x,y,vx:Math.cos(a)*laser.speed,vy:Math.sin(a)*laser.speed,a,aim,bonus,kind:laser.kind,damage:laser.damage,
  life:laser.life,owner:ship,blindGuess,twinbeam:true,second,firedAt});
 if(Math.hypot(x-p.x,y-p.y)<520)sound('vandul-shot');
 ship.lastLaserBonus=bonus;
 ship.nextLaser=Math.max(ship.nextLaser,firedAt+laser.recovery+(second?0:laser.burstGap));
}
function beginVandulBurst(ship,firedAt,target,guess=null){
 // Do not begin a pair if the first pulse alone would overheat it.
 if(ship.heat+vandulHeat.shot>=vandulHeat.max-1e-8)return;
 emitVandulLaser(ship,ship.aim,firedAt,!!guess);
 if(!ship.overheated)ship.laserBurst={at:firedAt+vandulProfile.laser.burstGap,target,guess};
}
function advanceVandulBurst(ship,visible,obstacles,end){
 const pending=ship.laserBurst;
 if(!pending)return false;
 if(end<pending.at)return true;
 const {target,guess}=pending,point=guess?.target??target;
 // Recheck optical LOS, target identity and real muzzle direction on each
 // rail. A blocked/vanished target aborts; never emit a stale second pulse.
 const live=guess?!visible&&obstacles.includes(guess.cover):visible===target&&!ship.thermalTracking;
 if(live&&point&&!firstSightCover(ship,point,obstacles,2)){
  const range=Math.hypot(point.x-ship.x,point.y-ship.y);
  const nose={x:ship.x+Math.cos(ship.aim)*range,y:ship.y+Math.sin(ship.aim)*range};
  if(noseReady(ship,bearing(ship,point))&&!firstSightCover(ship,nose,obstacles,2)){
   emitVandulLaser(ship,ship.aim,actualLaserTime(pending.at,end),!!guess,true);ship.laserBurst=null;
   return true;
  }
  if(end<pending.at+.12)return true;
 }
 ship.laserBurst=null;
 return true;
}
const actualLaserTime=(scheduled,end)=>scheduled<=duelClock?end:scheduled;
function tryVandulPredictionShot(ship,obstacles,end){
 const {laser}=vandulProfile,shot=ship.blindShot;
 if(shot){
  if(!obstacles.includes(shot.cover)||firstSightCover(ship,shot.target,obstacles,2))ship.blindShot=null;
  else if(shot.at<=end){
   const heading=bearing(ship,shot.target),range=Math.hypot(shot.target.x-ship.x,shot.target.y-ship.y);
   const nose={x:ship.x+Math.cos(ship.aim)*range,y:ship.y+Math.sin(ship.aim)*range};
   if(noseReady(ship,heading)&&!firstSightCover(ship,nose,obstacles,2)){
    beginVandulBurst(ship,actualLaserTime(shot.at,end),null,shot);ship.blindShot=null;
   }else if(end>=shot.at+.25)ship.blindShot=null;
  }
  return;
 }
 const seen=ship.lastSeen,target=ship.searchPrediction;
 const graceEnds=ship.sightLostAt+vandulContactSeconds;
 if(ship.blindAttempted||!seen||!target||end<graceEnds-1e-8||end>graceEnds+.85||Math.hypot(target.x-seen.x,target.y-seen.y)<12)return;
 const cover=firstSightCover(ship,seen,obstacles),at=end+laser.windup;
 // A guess has to peek past the specific cover on the last sight line.
 // Unhelpful, distant or still blocked estimates stay search-only.
 if(!cover||Math.hypot(target.x-cover.x,target.y-cover.y)>cover.r+110||
  Math.hypot(target.x-ship.x,target.y-ship.y)<ship.r+24||
  firstSightCover(ship,target,obstacles,2)||ship.nextLaser>at)return;
 ship.blindShot={target,cover,at};ship.blindAttempted=true;
}
// The hull owns one auto-fitted, fixed-base 360° local gimbal. Its bolts
// follow the same swept collision and shield paths as other hostile shots.
const blackwakeScale=riftFourFlightLength*2/282;
const blackwakeHull=Object.freeze({width:104.25*blackwakeScale,height:riftFourFlightLength*2,slotX:279/556,slotY:383/1504});
const blackwakeTurretVisualScale=.65;
const blackwakeGimbal=Object.freeze({size:3,width:36*blackwakeTurretVisualScale,height:49.3*blackwakeTurretVisualScale,
 pivotX:178/357,pivotY:303/489,muzzle:29.5*blackwakeTurretVisualScale,
 range:430,speed:375,damage:4,cooldown:4,burstGap:.34,burstShots:3,spread:Object.freeze([-8,10,-11]),he3PerShot:2,turn:2.0});
const blackwakeLoadout=Object.freeze({
 generator:Object.freeze({id:coreId,rate:2*powerProfiles[coreId].he3PerSecond}),
 storage:Object.freeze(['port','starboard'].map(slot=>Object.freeze({slot,id:batteryId,capacity:batteryProfiles[batteryId].capacityHe3}))),
 engine:Object.freeze({id:'hammerdrive-v1',name:'Hammerdrive V-1',fit:'vessel',patrolSpeed:22,turnRate:.775,acceleration:92,
  surge:Object.freeze({pace:143,acceleration:340,seconds:.56,cooldown:6,cost:8})})
});
const blackwakeArt={hull:null,turret:null};
function makeBlackwake(center,openingAim=-Math.PI/2,objective=false,name='Blackwake'){
 if(typeof window.Image==='function'){
  for(const [part,file] of [['hull','./blackwake-multicrew-top.webp'],['turret','./blackwake-gimbal-turret.webp']]){
   if(!blackwakeArt[part]){const art=new window.Image();art.src=file;blackwakeArt[part]=art;}
  }
 }
 const ship={...center,anchor:center,patrol:0,patrolPhase:0,yaw:Math.PI/2,speed:0,driveBurn:0,driveReadyAt:0,driveBurstUntil:0,invMass:1/248,hammerheadProw:true,kickX:0,kickY:0,r:44*blackwakeScale,hp:48,maxHp:48,objective,name,
  loadout:blackwakeLoadout,he3Capacity:blackwakeLoadout.storage.reduce((sum,cell)=>sum+cell.capacity,0),he3:0,
  pieces:[],turret:{
  weapon:blackwakeGimbal,aim:openingAim,nextShot:elapsed+.78,followAt:null,burstRemaining:0,flashUntil:0,shots:0,target:null}};
 ship.he3=ship.he3Capacity;
 if(objective)ship.pieces=[-97,-37,25,89].map(dy=>({dy:dy*blackwakeScale,r:43*blackwakeScale,blackwakePart:ship}));
 placeBlackwakeTurret(ship);
 return ship;
}
function placeBlackwakeTurret(ship,remember=true){
 const {width,height,slotX,slotY}=blackwakeHull;
 const lx=(slotX-.5)*width,ly=(slotY-.5)*height,co=Math.cos(ship.yaw),si=Math.sin(ship.yaw);
 ship.turret.x=ship.x+lx*co-ly*si;ship.turret.y=ship.y+lx*si+ly*co;
 for(const piece of ship.pieces){
  const x=ship.x-piece.dy*si,y=ship.y+piece.dy*co;
  if(remember){piece.prevX=piece.x??x;piece.prevY=piece.y??y;}
  piece.x=x;piece.y=y;
 }
}
const blackwakeSensorRange=620;
function blackwakeFleetContacts(cover,candidates){
 const contacts=new Set();
 let closest=null,range=blackwakeSensorRange;
 for(const ship of pirateCapitals)if(ship.hp>0){
  for(const target of candidates){
   const distance=Math.hypot(ship.x-target.x,ship.y-target.y);
   if(target.hp<=0||distance>blackwakeSensorRange||firstSightCover(ship,target,cover,2))continue;
   contacts.add(target);
   if(distance<range){closest=target;range=distance;}
  }
 }
 return {closest,contacts:[...contacts]};
}
// Both NPC sides weigh only their own fleet's spotted, nearby opposition.
// Normalizing by each hull's own health avoids comparing a freighter's raw
// HP with a fighter's. A short entry dwell and longer release dwell keep a
// single sighting, shot or boundary crossing from flipping the course.
function updateFleetPressure(ship,friendlies,contacts,dt){
 const state=ship.fleetPressure??={build:0,clear:0,active:false,threat:null};
 const nearby=body=>body.hp>0&&Math.hypot(body.x-ship.x,body.y-ship.y)<=380;
 const strength=body=>.48+.52*clamp(body.hp/body.maxHp,0,1);
 const threats=contacts.filter(nearby),friendly=friendlies.filter(nearby).reduce((sum,body)=>sum+strength(body),0);
 const hostile=threats.reduce((sum,body)=>sum+strength(body),0),ratio=hostile/Math.max(.45,friendly);
 const closest=threats.reduce((best,body)=>!best||Math.hypot(body.x-ship.x,body.y-ship.y)<Math.hypot(best.x-ship.x,best.y-ship.y)?body:best,null);
 if(closest)state.threat={x:closest.x,y:closest.y};
 if(state.active){
  const easing=!closest||(ratio<1.28&&(ship.hp/ship.maxHp>.42||Math.hypot(closest.x-ship.x,closest.y-ship.y)>275));
  state.clear=easing?state.clear+dt:0;
  if(state.clear>1.25){state.active=false;state.clear=state.build=0;state.threat=null;}
 }else{
  const severe=!!closest&&(ratio>1.75||(ship.hp/ship.maxHp<.34&&Math.hypot(closest.x-ship.x,closest.y-ship.y)<245));
  state.build=severe?state.build+dt:Math.max(0,state.build-dt*2);
  if(state.build>.58){state.active=true;state.clear=0;}
 }
 return state.active?state.threat:null;
}
function fleetStandOffHeading(ship,threat,side,margin){
 const away=Math.atan2(ship.y-threat.y,ship.x-threat.x);
 const original=Math.hypot(ship.x-threat.x,ship.y-threat.y);
 let best=away,score=-Infinity;
 for(const bearing of [away+side*.25,away-side*.25,away+side*1.02,away-side*1.02,away+side*1.52,away-side*1.52,away+side*2.15,away-side*2.15]){
  const x=ship.x+Math.cos(bearing)*130,y=ship.y+Math.sin(bearing)*130;
  const outside=Math.hypot(x-clamp(x,arena.left+margin,arena.right-margin),y-clamp(y,arena.top+margin,arena.bottom-margin));
  const gain=Math.hypot(x-threat.x,y-threat.y)-original-outside*4;
  if(gain>score){best=bearing;score=gain;}
 }
 return best;
}
function blackwakeRockCourse(ship,goal,rocks){
 const inset=blackwakeHull.height/2+7;
 const dx=goal.x-ship.x,dy=goal.y-ship.y,d=Math.hypot(dx,dy);
 const look=d>115?{x:ship.x+dx/d*115,y:ship.y+dy/d*115}:goal;
 const rock=firstSightCover(ship,look,rocks,inset);
 if(!rock){ship.rockBypass=null;return goal;}
 const ox=ship.x-rock.x,oy=ship.y-rock.y,gap=Math.hypot(ox,oy);
 const ux=gap>1e-6?ox/gap:Math.cos(ship.patrolPhase),uy=gap>1e-6?oy/gap:Math.sin(ship.patrolPhase);
 const radial=clamp((rock.r+inset+12-gap)/25,-.15,1.6);
 const sidePoint=side=>({x:ship.x+(ux*radial-uy*side)*80,y:ship.y+(uy*radial+ux*side)*80});
 if(ship.rockBypass?.rock!==rock){
  const left=sidePoint(1),right=sidePoint(-1);
  const cost=point=>Math.hypot(point.x-goal.x,point.y-goal.y)+
   4*Math.hypot(point.x-clamp(point.x,arena.left+68,arena.right-68),point.y-clamp(point.y,arena.top+68,arena.bottom-68));
  ship.rockBypass={rock,side:cost(left)<=cost(right)?1:-1};
 }
 return sidePoint(ship.rockBypass.side);
}
function blackwakeClearPose(ship,x,y,yaw,rocks){
 const sin=Math.sin(yaw),cos=Math.cos(yaw);
 return ship.pieces.every(piece=>{
  const px=x-piece.dy*sin,py=y+piece.dy*cos;
  return rocks.every(rock=>{
   const radius=rock.r+piece.r,d=Math.hypot(px-rock.x,py-rock.y);
   return d>=radius||d>=Math.hypot(piece.x-rock.x,piece.y-rock.y)-1e-7;
  });
 });
}
function pushLooseFlightBodies(craft,obstacles){
 for(const body of obstacles)if(!body.asteroid&&(body.debris||cones.includes(body))){
  contact(craft,body,false);wall(body);
 }
}
function blackwakeRamCourse(ship,target,rocks,standOff){
 const ram=ship.ram??={ready:0,goal:null};
 if(!ship.loadout.engine.patrolSpeed)return null;
 if(standOff){if(ram.goal)ram.ready=elapsed+2;ram.goal=null;return null;}
 const clear=point=>point.x>=arena.left+68&&point.x<=arena.right-68&&point.y>=arena.top+68&&point.y<=arena.bottom-68&&
  !firstSightCover(ship,point,rocks,58)&&!pirateCapitals.some(other=>other!==ship&&other.hp>0&&firstSightCover(ship,point,other.pieces,48));
 if(ram.goal){
  if(elapsed<ram.until&&!ram.hit&&ram.target.hp>0&&Math.hypot(ram.goal.x-ship.x,ram.goal.y-ship.y)>32&&clear(ram.goal))return ram.goal;
  ram.goal=null;ram.ready=elapsed+3;return null;
 }
 if(!target?.hp||elapsed<ram.ready)return null;
 const gap=Math.hypot(target.x-ship.x,target.y-ship.y);
 if(gap<76||gap>275)return null;
 const lead=Math.min(.75,gap/195);
 const x=target.x+target.vx*lead,y=target.y+target.vy*lead,angle=Math.atan2(y-ship.y,x-ship.x);
 const point={x:x+Math.cos(angle)*84,y:y+Math.sin(angle)*84};
 if(!clear(point))return null;
 const into=(ship.x-target.x)*target.vx+(ship.y-target.y)*target.vy;
 if(into<-110*gap)return null; // a fighter already outrunning the approach
 if(Math.abs(headingDelta(ship.yaw,angle+Math.PI/2))>.30)return {x,y};
 ram.goal=point;ram.until=elapsed+2.7;ram.hit=false;ram.target=target;ram.surgeTried=false;
 return point;
}
function blackwakeRamSurge(ship){
 const {ram,loadout}=ship,surge=loadout.engine.surge;
 if(!ram.goal||!surge){ship.driveBurstUntil=0;return false;}
 if(!ram.surgeTried&&Math.hypot(ram.target.x-ship.x,ram.target.y-ship.y)<=232){
  ram.surgeTried=true;
  if(elapsed>=ship.driveReadyAt&&ship.he3>=surge.cost){
   ship.he3-=surge.cost;
   ship.driveBurstUntil=elapsed+surge.seconds;ship.driveReadyAt=elapsed+surge.cooldown;
   const level=nearBattleGain(ship.x,ship.y);
   if(level>.035){tone('triangle',54,106,.49,.26*level);tone('sawtooth',31,58,.44,.09*level);}
  }
 }
 if(elapsed>=ship.driveBurstUntil)ship.driveBurstUntil=0;
 return !!ship.driveBurstUntil;
}
function advanceBlackwakePatrol(ship,dt,contact,rocks,standOff,ramTarget){
 ship.patrol+=dt;
 const t=ship.patrol,phase=ship.patrolPhase,{patrolSpeed,turnRate,acceleration}=ship.loadout.engine;
 const drift=t*patrolSpeed/64+phase;
 const px=ship.anchor.x+64*(Math.sin(drift)-Math.sin(phase));
 const py=ship.anchor.y+48*(Math.cos(drift)-Math.cos(phase));
 let x=px,y=py;
 if(!contact&&ship.patrolLane){
  const lane=ship.patrolLane,r=44,bend=Math.PI*r,end=lane.leg+bend;
  lane.distance=(lane.distance+patrolSpeed*dt)%(2*end);
  const progress=(lane.distance+42)%(2*end),returning=progress>=end,d=progress%end,arc=clamp((d-lane.leg)/r,0,Math.PI);
  const offset=r*(returning?1+Math.cos(arc):1-Math.cos(arc));
  x=ship.anchor.x+lane.side*offset;
  y=ship.anchor.y+(returning?lane.leg-Math.min(d,lane.leg)-r*Math.sin(arc):Math.min(d,lane.leg)+r*Math.sin(arc));
 }
 if(contact&&ship.defenderOffset){
  const dx=contact.x-px,dy=contact.y-py,d=Math.max(1,Math.hypot(dx,dy));
  const shift=clamp(d-190,0,228);
  x+=dx/d*shift+ship.defenderOffset.x*.5;
  y+=dy/d*shift+ship.defenderOffset.y*.5;
  const tx=contact.x-ship.x,ty=contact.y-ship.y,range=Math.max(1,Math.hypot(tx,ty));
  // Commit to a broad pass as the contact gets close. The deck gimbal
  // still follows its own target, independent of the forward hull heading.
  const blend=clamp((340-range)/105,0,1),radial=clamp((range-205)/105,-1,1),sweep=ship.passSide;
  const passX=ship.x+(tx*radial-ty*sweep)/range*118,passY=ship.y+(ty*radial+tx*sweep)/range*118;
  x+=(passX-x)*blend;y+=(passY-y)*blend;
  for(const other of pirateCapitals){
   if(other===ship||other.hp<=0)continue;
   const ox=ship.x-other.x,oy=ship.y-other.y,space=Math.max(1,Math.hypot(ox,oy));
   if(space<132){x+=ox/space*(132-space);y+=oy/space*(132-space);}
  }
 }
 if(standOff){
  const heading=fleetStandOffHeading(ship,standOff,ship.passSide,76);
  x=ship.x+Math.cos(heading)*145;y=ship.y+Math.sin(heading)*145;
 }
 const ram=blackwakeRamCourse(ship,ramTarget,rocks,standOff);
 const goal=blackwakeRockCourse(ship,ram??{x,y},rocks);
 const dx=clamp(goal.x,arena.left+68,arena.right-68)-ship.x,dy=clamp(goal.y,arena.top+68,arena.bottom-68)-ship.y;
 const surging=blackwakeRamSurge(ship),surge=ship.loadout.engine.surge;
 const distance=Math.hypot(dx,dy),pace=surging?surge.pace:ship.ram.goal?108:ram||standOff||contact&&ship.defenderOffset?70:patrolSpeed;
 const wanted=distance>.04?Math.atan2(dx,-dy):ship.yaw,error=headingDelta(ship.yaw,wanted);
 const turn=turnRate*(surging?.5:1)*dt,yaw=ship.yaw+clamp(error,-turn,turn);
 const aligned=Math.max(0,Math.cos(headingDelta(yaw,wanted)));
 const desired=Math.min(pace,distance*2.7)*aligned;
 const speed=ship.speed+clamp(desired-ship.speed,-acceleration*2*dt,(surging?surge.acceleration:acceleration)*dt);
 const travel=Math.min(distance,speed*dt)*aligned;
 const x0=ship.x,y0=ship.y,kx=ship.kickX,ky=ship.kickY;
 const nx=x0+Math.sin(yaw)*travel+kx*dt,ny=y0-Math.cos(yaw)*travel+ky*dt;
 if(blackwakeClearPose(ship,nx,ny,yaw,rocks)&&nx>=arena.left+61&&nx<=arena.right-61&&ny>=arena.top+61&&ny<=arena.bottom-61){
  ship.x=nx;ship.y=ny;ship.yaw=yaw;ship.speed=speed;
  ship.kickX*=Math.exp(-1.6*dt);ship.kickY*=Math.exp(-1.6*dt);
 }else{
  if(blackwakeClearPose(ship,ship.x,ship.y,yaw,rocks))ship.yaw=yaw;
  ship.speed=0;ship.kickX=ship.kickY=0;
 }
 ship.vx=(ship.x-x0)/dt;ship.vy=(ship.y-y0)/dt;
 const burn=surging?1.65:clamp(.12+ship.speed/81,0,1);
 ship.driveBurn+=clamp(burn-ship.driveBurn,-4*dt,4*dt);
 placeBlackwakeTurret(ship);
}

function advanceBlackwakeTurret(dt,cover,ship,candidates,contact,rocks,contacts){
 if(!ship||ship.hp<=0||!isTileBattle()||duelResult||state!=='watch'&&state!=='play')return;
 const standOff=contacts?updateFleetPressure(ship,pirateCapitals,contacts,dt):null;
 advanceBlackwakePatrol(ship,dt,contacts?contact:null,rocks,standOff,contact);
 // A driven deck deflects loose cargo, while its course planner avoids rock.
 for(const piece of ship.pieces){
  const proxy={x:piece.x,y:piece.y,r:piece.r,invMass:0,craft:true,spin:0,vx:(piece.x-piece.prevX)/dt,vy:(piece.y-piece.prevY)/dt};
  pushLooseFlightBodies(proxy,cover);
 }
 ship.he3=Math.min(ship.he3Capacity,ship.he3+ship.loadout.generator.rate*dt);
 const arm=ship.turret,weapon=arm.weapon;
 // Pirate ships share a faction and are never turret targets.
 let target=null,distance=Infinity;
 for(const other of candidates){
  if(other.hp<=0)continue;
  const range=Math.hypot(other.x-arm.x,other.y-arm.y);
  if(range>=distance||range<32||range>weapon.range||firstSightCover(arm,other,cover,2))continue;
  target=other;distance=range;
 }
 arm.target=target;
 const inBurst=arm.followAt!==null;
 if(inBurst&&elapsed>arm.followAt+.16){arm.followAt=null;arm.burstRemaining=0;return;}
 const tracking=target??contact;
 if(!tracking)return;
 const angle=bearing(arm,tracking),turn=weapon.turn*dt;
 arm.aim+=clamp(headingDelta(arm.aim,angle),-turn,turn);
 if(!target)return;
 if(elapsed<(inBurst?arm.followAt:arm.nextShot)||ship.he3+1e-8<weapon.he3PerShot||Math.abs(headingDelta(arm.aim,angle))>.075)return;
 ship.he3=Math.max(0,ship.he3-weapon.he3PerShot);
 const {muzzle,speed,range,damage,cooldown}=weapon,ux=Math.cos(arm.aim),uy=Math.sin(arm.aim);
 const i=inBurst?weapon.burstShots-arm.burstRemaining:0;
 const a=arm.aim+weapon.spread[i]*degrees;
 const barrel=Math.min(muzzle,Math.max(5,distance-target.r-3));
 const x=arm.x+ux*barrel,y=arm.y+uy*barrel;
 vandulLasers.push({x,y,vx:Math.cos(a)*speed,vy:Math.sin(a)*speed,a,aim:arm.aim,kind:'energy',life:(range-barrel)/speed,
  damage,owner:arm,friendlyOwner:ship,blackwakeTurret:true,firedAt:elapsed});
 npcBattleShot(x,y,true);
 if(inBurst)arm.burstRemaining--;
 else{arm.burstRemaining=weapon.burstShots-1;arm.nextShot=elapsed+cooldown;}
 arm.followAt=arm.burstRemaining>0?elapsed+weapon.burstGap:null;
 arm.flashUntil=elapsed+.10;arm.shots++;
 burstRing(arm.x+ux*muzzle,arm.y+uy*muzzle,12,'#ffc188');
}
// The simulator is client-local and reuses the fighter controls and projectile contacts.
let redGrinSoloArt;
function makeRedGrinSolo(){
 const ship={x:launch.x,y:744,pauseAt:elapsed+2.2,vx:0,vy:0,r:47,invMass:0,yaw:Math.PI*1.5,
  simStartedAt:elapsed,simPhase:'briefing',simVolleys:0,telegraph:null,
  objective:true,redGrinSolo:true,name:'Red Grin',hp:66,maxHp:66,phase:Math.PI/2,
  simShield:{hp:14,maxHp:14,hitAt:-Infinity,brokenAt:-Infinity},
  broadside:window.RiftRedGrinBroadside.state(),turret:{},pieces:[]};
 ship.pieces=[-142,-99,-52,-4,45,93,139].map(dy=>({dy,r:Math.abs(dy)>125?28:43,blackwakePart:ship}));
 placeBlackwakeTurret(ship);
 if(!redGrinSoloArt&&typeof window.Image==='function'){redGrinSoloArt=new window.Image();redGrinSoloArt.src='./red-grin-simulator.webp';}
 return ship;
}
function advanceRedGrinSolo(ship,dt,cover){
 if(!ship?.hp||duelResult||dt<=0)return;
 const previous={x:ship.x,y:ship.y};
 ship.phase+=dt*.225;const t=ship.phase;
 ship.x=launch.x+142*Math.cos(t);ship.y=633+111*Math.sin(t);
 ship.yaw=Math.atan2(-142*Math.sin(t),-111*Math.cos(t));
 ship.vx=(ship.x-previous.x)/dt;ship.vy=(ship.y-previous.y)/dt;
 placeBlackwakeTurret(ship);
 if(!p.hp||elapsed<ship.pauseAt)return;
 const broadside=window.RiftRedGrinBroadside,pose={x:ship.x,y:ship.y,heading:ship.yaw};
 const fire=ship.broadside;
 let volley=null;
 if(fire.burst){
  setRedGrinPhase(ship,'firing');
  volley=broadside.advance(fire,pose,elapsed);
 }else if(elapsed<fire.readyAt){
  setRedGrinPhase(ship,'reload');
 }else{
  const candidate=target=>target?.hp&&Math.hypot(target.x-ship.x,target.y-ship.y)<405&&!firstSightCover(ship,target,cover)
   ?broadside.candidate(pose,target):null;
  const aim=candidate(p);
  if(!aim||ship.telegraph&&aim.side!==ship.telegraph.side){
   if(ship.telegraph)fire.readyAt=elapsed+.7;
   ship.telegraph=null;
   setRedGrinPhase(ship,elapsed<fire.readyAt?'reload':'approach');
  }else if(!ship.telegraph){
   ship.telegraph={side:aim.side,at:elapsed+.85};
   setRedGrinPhase(ship,'charging');
  }else if(elapsed>=ship.telegraph.at){
   ship.telegraph=null;
   volley=broadside.request(fire,pose,p,elapsed,{random:Math.random});
   if(volley){ship.simVolleys++;setRedGrinPhase(ship,'firing');}
  }
 }
 if(!volley)return;
 if(volley.last)setRedGrinPhase(ship,'reload');
 for(const shot of volley.shots)vandulLasers.push({...shot,vx:Math.cos(shot.a)*300,vy:Math.sin(shot.a)*300,
  aim:shot.a,kind:'energy',life:1.18,damage:1,owner:ship.turret,friendlyOwner:ship,blackwakeTurret:true,redGrinCannon:true,firedAt:elapsed});
 emitRedGrinMuzzleClouds(volley.shots);
 const muzzle=volley.shots[0],near=clamp(1-Math.hypot(muzzle.x-p.x,muzzle.y-p.y)/535,0,1);
 if(!motion?.matches&&(shakeSwitch?.checked??true)&&near>.04&&muzzle.cannon===0)kick(.10+.37*near);
 const volume=nearBattleGain(muzzle.x,muzzle.y);
 if(volume>.035)playRedGrinCannonPulse(volume,volley.last,muzzle.cannon===0?1:.62);
}
function setRedGrinPhase(ship,phase){
 if(ship.simPhase===phase)return;
 ship.simPhase=phase;updateDuelReadout();
}
function showRedGrinDebrief(won){
 const ship=pirateCapitals[0];
 const seconds=Math.max(0,Math.floor(elapsed-(ship?.simStartedAt??elapsed)));
 const clock=Math.floor(seconds/60)+':'+String(seconds%60).padStart(2,'0');
 const volleys=ship?.simVolleys??0;
 const convoy=ship?.convoy;
 const count=convoy?' · '+ship.turret.shots+' pirate shots fired':' · '+volleys+' '+(volleys===1?'volley':'volleys')+' fired';
 const report='Time '+clock+' · '+(flightMode.simWatch?'AI fighter hull ':'Your hull ')+p.hp+'/'+p.maxHp+' · '+(ship?.name??'Red Grin')+' hull '+(ship?.hp??0)+'/'+(ship?.maxHp??66)+count;
 const title=convoy?(won?'Freighter delivered':convoy.hp===0?'Freighter lost':p.hp===0&&!flightMode.simWatch?'Escort fighter disabled':'Extraction missed'):
  won?'Red Grin disabled':flightMode.simWatch?'AI fighter disabled':'Fighter disabled';
 const cargo=convoy?' · Freighter '+convoy.hp+'/'+convoy.maxHp+' HP · '+Math.floor(convoyProgress(convoy)*100)+'% of route.':'.';
 menu(title,report+cargo+'<br>No credits, resources or damage saved.','reset','Rematch','SIMULATOR DEBRIEF');
 overlay.innerHTML+=button('Return to Hangar','main-menu');
 overlay.querySelector('button')?.focus({preventScroll:true});
}
function makeRedGrinConvoy(){
 const y=launch.y-104;
 return {x:launch.x,y,prevX:launch.x,prevY:y,fromY:y,gateY:-755,
  hp:22,maxHp:22,r:33,holding:false,hitGlow:0,allyShip:true,deadline:elapsed+100};
}
function makeConvoyRaider(convoy){
 const ship=makeBlackwake({x:convoy.x+334,y:convoy.y-98},Math.PI,true,'Blackwake Raider');
 Object.assign(ship,{hp:30,maxHp:30,convoy,simStartedAt:elapsed,pauseAt:elapsed+7.5,
  simPhase:'briefing',telegraph:null,yaw:0,vx:0,vy:0,hammerheadProw:false});
 ship.turret.nextShot=ship.pauseAt;
 placeBlackwakeTurret(ship,false);
 return ship;
}
function advanceConvoyRaider(ship,dt,cover){
 if(!ship?.hp||duelResult||dt<=0)return;
 const convoy=ship.convoy,age=elapsed-ship.simStartedAt, arm=ship.turret;
 // A single repurposed freighter sweeps one flank, never rams or uses a broadside.
 const band=clamp((age-7.5)/4,0,1);
 const nx=convoy.x+334+band*(-112+39*Math.cos(age*.29));
 const ny=convoy.y-98+band*(72+64*Math.sin(age*.26));
 ship.vx=(nx-ship.x)/dt;ship.vy=(ny-ship.y)/dt;
 if(Math.hypot(ship.vx,ship.vy)>1)ship.yaw+=clamp(headingDelta(ship.yaw,Math.atan2(ship.vx,-ship.vy)),-1.4*dt,1.4*dt);
 ship.x=nx;ship.y=ny;ship.driveBurn=.37;
 placeBlackwakeTurret(ship);
 if(elapsed<ship.pauseAt)return;
 const visible=target=>target.hp>0&&Math.hypot(target.x-arm.x,target.y-arm.y)<330&&!firstSightCover(arm,target,cover);
 if(!ship.telegraph){
  if(elapsed<arm.nextShot){setRedGrinPhase(ship,'reload');return;}
  const gap=Math.hypot(p.x-arm.x,p.y-arm.y);
  const target=gap<180&&visible(p)?p:visible(convoy)?convoy:null;
  if(!target){setRedGrinPhase(ship,'approach');return;}
  ship.telegraph={target,at:elapsed+1.05,aim:null};
  setRedGrinPhase(ship,'charging');
 }
 const warning=ship.telegraph,target=warning.target;
 if(warning.aim===null){
  const lead=Math.hypot(target.x-arm.x,target.y-arm.y)/325+.32;
  const vy=target===convoy?(convoy.y-convoy.prevY)/dt:target.vy??0;
  arm.aim=Math.atan2(target.y+clamp(vy,-100,100)*lead-arm.y,target.x+clamp(target.vx??0,-100,100)*lead-arm.x);
  if(elapsed>=warning.at-.32)warning.aim=arm.aim;
 }
 if(elapsed<warning.at)return;
 ship.telegraph=null;arm.nextShot=elapsed+4.6;setRedGrinPhase(ship,'reload');
 if(!target.hp)return;
 const a=warning.aim??arm.aim,x=arm.x+Math.cos(a)*blackwakeGimbal.muzzle,y=arm.y+Math.sin(a)*blackwakeGimbal.muzzle;
 vandulLasers.push({x,y,vx:Math.cos(a)*325,vy:Math.sin(a)*325,aim:a,kind:'energy',life:1.35,damage:2,
  owner:arm,friendlyOwner:ship,blackwakeTurret:true,firedAt:elapsed});
 arm.flashUntil=elapsed+.12;arm.shots++;
 npcBattleShot(x,y,true);burstRing(x,y,12,'#ffc188');
}
const convoyProgress=convoy=>clamp((convoy.fromY-convoy.y)/(convoy.fromY-convoy.gateY),0,1);
function advanceRedGrinConvoy(convoy,dt){
 if(!convoy||duelResult||dt<=0)return;
 convoy.prevX=convoy.x;convoy.prevY=convoy.y;
 convoy.hitGlow=Math.max(0,convoy.hitGlow-dt);
 convoy.holding=!(flightMode.simWatch&&simDirector?.pilotDown)&&Math.hypot(p.x-convoy.x,p.y-convoy.y)>(convoy.holding?205:235);
 if(!convoy.holding&&elapsed>=pirateCapitals[0].simStartedAt+2.2)convoy.y=Math.max(convoy.gateY,convoy.y-35*dt);
 updateDuelReadout();
}
function finishRedGrinEscort(convoy){
 if(state!=='play'||!convoy||duelResult)return;
 if(convoy.hp>0&&convoy.y>convoy.gateY&&elapsed<convoy.deadline)return;
 const won=convoy.hp>0&&convoy.y<=convoy.gateY;
 duelResult=won?'victory':'lost';finishFourWay();
 state='complete';clearInput();syncArrivalControls();
 showRedGrinDebrief(won);
}
function playRedGrinCannonPulse(volume,last,weight=1){
 const gain=Math.min(1,volume*1.7)*weight;
 duckArenaMusic();
 cannonCrack(gain);
 tone('sine',155,48,.174,.31*gain);
 tone('triangle',426,103,.10,.18*gain);
 if(last){
  tone('triangle',205,65,.20,.10*gain,.24);
  tone('sine',136,49,.24,.048*gain,.45);
 }
}
function emitRedGrinMuzzleClouds(shots){
 // A fresh cloud at each nozzle on every pulse, never a continuous jet.
 for(const tip of shots){
  const reduced=motion?.matches,count=reduced?2:5;
  for(let i=0;i<count;i++){
   const a=tip.a+(i-(count-1)/2)*.25,pace=20+i*8,life=.34+i*.057;
   sparks.push({x:tip.x,y:tip.y,dx:Math.cos(a)*pace,dy:Math.sin(a)*pace,r:4.4+(i%3)*1.9,life,max:life,redGrinMuzzle:true});
  }
 }
}
function paintRedGrinMuzzlePuff(z){
 const age=1-z.life/z.max,r=z.r*(1+age*2.1);
 const cloud=g.createRadialGradient(z.x,z.y,0,z.x,z.y,r);
 cloud.addColorStop(0,age<.18?'#ffe4beaa':'#c3af9e99');
 cloud.addColorStop(.47,'#b49a8788');cloud.addColorStop(1,'#84777100');
 g.fillStyle=cloud;g.beginPath();g.arc(z.x,z.y,r,0,TAU);g.fill();
}
// A short tapered streak aligned to the shot; smoke is emitted separately at the muzzle.
function paintRedGrinCannonStreak(bolt){
 const fade=Math.max(.48,Math.min(1,bolt.life/.25));
 g.save();g.globalAlpha*=fade;
 const glow=g.createLinearGradient(-19,0,6,0);
 glow.addColorStop(0,'#ff693300');glow.addColorStop(.48,'#ff7938b0');
 glow.addColorStop(.81,'#ffc081');glow.addColorStop(1,'#fff3d6');
 g.fillStyle=glow;g.beginPath();
 g.moveTo(-19,0);g.quadraticCurveTo(-5,-3.2,2,-2.4);g.quadraticCurveTo(8,0,2,2.4);
 g.quadraticCurveTo(-5,3.2,-19,0);g.fill();g.restore();
}
function paintRedGrinSolo(ship,camera){
 const hull=window.RiftFrigateHulls.crosswind,w=hull.width,h=hull.length;
 if(ship.hp&&state==='play'&&!withinCamera(ship,camera,-30))paintRedGrinContact(ship,camera);
 if(!withinCamera(ship,camera,h*.55))return;
 g.save();g.translate(ship.x,ship.y);g.rotate(ship.yaw);if(!ship.hp)g.globalAlpha=.46;
 if(redGrinSoloArt?.complete&&redGrinSoloArt.naturalWidth>0)g.drawImage(redGrinSoloArt,-w/2,-h/2,w,h);
 else{
  g.fillStyle='#482027';g.fillRect(-w*.45,-h*.4,w*.9,h*.83);
  g.fillStyle='#141b22';g.fillRect(-w*.18,-h*.4,w*.36,h*.83);
 }
 const shield=ship.simShield,flash=shield?clamp(1-(elapsed-shield.hitAt)/.28,0,1):0;
 const collapse=shield?clamp(1-(elapsed-shield.brokenAt)/.48,0,1):0;
 if(ship.hp&&(shield?.hp>0||collapse>0)){
  g.save();
  const flare=motion?.matches?0:flash;
  g.globalAlpha=shield.hp>0?.18+.46*flare:.72*collapse;
  g.strokeStyle=shield.hp>0?'#62daff':'#d4fbff';g.lineWidth=shield.hp>0?1.5+2*flare:2.2;
  if(!shield.hp)g.setLineDash([9,8]);
  g.beginPath();g.ellipse(0,0,w*.57,h*.52,0,0,TAU);g.stroke();
  g.restore();
 }
 if(ship.telegraph){
  g.fillStyle='#ffd58c';g.strokeStyle='#ff883f';g.lineWidth=2;
  for(const mount of window.RiftRedGrinBroadside.mounts){
   if(mount.side!==ship.telegraph.side)continue;
   g.beginPath();g.arc(mount.x,mount.y,5,0,TAU);g.fill();g.stroke();
  }
 }
 g.restore();
 g.save();g.textAlign='center';g.font='700 11px system-ui';g.fillStyle='#ffd0a6';
 const labelY=ship.y+h*.57;
 g.fillText('RED GRIN · PIRATE FRIGATE',ship.x,labelY);
 g.fillStyle='#210e17';g.fillRect(ship.x-41,labelY+6,82,5);
 g.fillStyle=ship.telegraph?'#ffcc78':'#ee9675';g.fillRect(ship.x-41,labelY+6,82*ship.hp/ship.maxHp,5);
 if(shield){
  g.fillStyle='#132330';g.fillRect(ship.x-41,labelY+13,82,3);
  g.fillStyle='#72dfff';g.fillRect(ship.x-41,labelY+13,82*shield.hp/shield.maxHp,3);
 }
 g.restore();
}
function paintRedGrinConvoy(ship,camera){
 g.save();
 g.setLineDash([6,9]);g.strokeStyle='#77dfca88';g.lineWidth=2;
 g.beginPath();g.moveTo(ship.x,ship.gateY);g.lineTo(ship.x,ship.y);g.stroke();g.setLineDash([]);
 g.strokeStyle='#82f4d8';g.beginPath();g.arc(ship.x,ship.gateY,46,0,TAU);g.stroke();
 g.font='700 11px system-ui';g.textAlign='center';g.fillStyle='#aaf7e5';
 g.fillText('EXTRACTION GATE',ship.x,ship.gateY-56);
 if(ship.hp){
  g.translate(ship.x,ship.y);
  if(!paintFighterArt(0,1,civilianFreighter.id)){
   g.fillStyle='#d49546';g.fillRect(-23,-33,46,68);
   g.fillStyle='#d5e4ec';g.fillRect(-9,-39,18,74);
   g.fillStyle='#243845';g.fillRect(-8,-33,16,11);
  }
  g.fillStyle=ship.hitGlow?'#ffbb88':'#aaf7e5';
  g.fillText('CIV FREIGHTER',0,48);
 }
 g.restore();
 if(ship.hp&&!withinCamera(ship,camera,0))paintRedGrinContact(ship,camera,'#82f4d8');
}
function paintRedGrinContact(ship,camera,color){
 const cx=camera.x+camera.w*.5,cy=camera.y+camera.h*.5;
 const dx=ship.x-cx,dy=ship.y-cy;
 const k=Math.min((camera.w*.5-40)/Math.max(1,Math.abs(dx)),(camera.h*.5-27)/Math.max(1,Math.abs(dy)));
 if(k<=0||k>=1)return;
 const x=cx+dx*k,y=cy+dy*k,angle=Math.atan2(dy,dx);
 g.save();g.translate(x,y);
 g.fillStyle='#27121cf2';g.beginPath();g.arc(0,0,12,0,TAU);g.fill();
 g.rotate(angle);g.fillStyle=color??(ship.telegraph?'#ffd58c':'#ffab86');
 g.beginPath();g.moveTo(7,0);g.lineTo(-4,-5);g.lineTo(-4,5);g.fill();
 g.restore();
}
function advanceBlackwakeFleet(dt,cover){
 if(!blackwake)return;
 const candidates=state==='watch'?livingAllies():[p,...livingAllies()];
 const corvette=battleResolute();if(corvette?.hp>0)candidates.push(corvette);
 const sight=blackwakeFleetContacts(cover,candidates),named=isCrossBattleArena();
 for(const ship of pirateCapitals)advanceBlackwakeTurret(dt,cover,ship,candidates,sight.closest,asteroids,named?sight.contacts:null);
}
let scrapeContext=null,nextScrapeSound=0;
function playTileScrape(x,y,pair){
 const gain=nearBattleGain(x,y);
 if(gain<.06||voices.size>8)return;
 if(scrapeContext!==audio){scrapeContext=audio;nextScrapeSound=0;}
 const t=audio.currentTime;
 if(pair.soundContext!==audio){pair.soundContext=audio;pair.sound=0;}
 if(t<nextScrapeSound||t<pair.sound)return;
 nextScrapeSound=t+.12;pair.sound=t+.19;
 cannonCrack(gain,true);tone('triangle',2260,790,.056,.093*gain);
}
const tileContactPairs=new WeakMap();
function sparkTileContact(a,b,left,right,pair){
 if(elapsed<pair.spark)return;
 pair.spark=elapsed+(motion?.matches?.18:.085);
 const normal=Math.atan2(right.y-left.y,right.x-left.x);
 const slip=(b.vy-a.vy)*Math.cos(normal)-(b.vx-a.vx)*Math.sin(normal);
 const angle=normal+(slip<0?-1:1)*Math.PI/2;
 const x=left.x+Math.cos(normal)*left.r,y=left.y+Math.sin(normal)*left.r;
 playTileScrape(x,y,pair);
 for(let i=0;i<(motion?.matches?1:3);i++){
  const ray=angle+(i-1)*.26,speed=130+38*i,life=.30;
  sparks.push({x,y,dx:Math.cos(ray)*speed,dy:Math.sin(ray)*speed,life,max:life,r:1.4,tone:'#ffe6a3',scrape:true});
 }
 if(sparks.length>420)sparks.splice(0,sparks.length-420);
}
function damageBlackwake(ship,damage,mark){
 const shield=ship.simShield;
 if(shield?.hp>0&&damage>0){
  const blocked=Math.min(shield.hp,damage);shield.hp-=blocked;damage-=blocked;
  shield.hitAt=elapsed;
  if(shield.hp===0)shield.brokenAt=elapsed;
  if(mark)burstRing(mark.x,mark.y,shield.hp>0?20:32,shield.hp>0?'#8aefff':'#d4fbff');
  if(damage<=0){updateDuelReadout();return;}
 }
 loseHull(ship,damage);
 if(mark)burstRing(mark.x,mark.y,15,'#ffc188');
 if(!ship.hp){
  ship.turret.followAt=null;ship.turret.burstRemaining=0;
  for(const bolt of vandulLasers)if(bolt.owner===ship.turret)bolt.life=0;
  blast(ship.x,ship.y,'#ffbc7e',28,1.5);
  if(ship.convoy){ship.telegraph=null;ship.simPhase='approach';updateDuelReadout();return;}
  if(p.hp>0||state==='watch'){
   if(pirateCapitals.every(vessel=>!vessel.hp)){
    duelResult='victory';finishFourWay();
    if(flightMode.redGrinSolo){
     state='complete';clearInput();syncArrivalControls();
     showRedGrinDebrief(true);
    }
    return;
   }
  }
 }
 updateDuelReadout();
}
function damageAlliedHull(ship,damage){
 loseHull(ship,damage);ship.hitGlow=.25;
 if(isCrossBattleArena()||ship.resoluteCombat||ship.resoluteEscort)ship.hullHitUntil=elapsed+1;
 if(!ship.hp){blast(ship.x,ship.y,'#8de0ff',18,1.2);burstRing(ship.x,ship.y,33,'#8de0ff');}
}
const tileInvMass=ship=>ship===p?1/(p.weight||60):ship.fit?.weight?1/ship.fit.weight:ship.vandul&&ship.weight?1/ship.weight:ship.invMass;
const tileProwContact=(ship,nx,ny,arc=40)=>ship.hammerheadProw&&nx*Math.sin(ship.yaw)-ny*Math.cos(ship.yaw)>Math.cos(arc*degrees);
function playTileSmash(x,y,hammerhead){
 const gain=nearBattleGain(x,y);
 if(gain<.06||voices.size>8)return;
 if(hammerhead){
  tone('triangle',740,210,.16,.21*gain);tone('sine',81,38,.21,.19*gain);
 }else tone('triangle',168,61,.105,.16*gain);
}
function impartFighterTumble(light,heavy,nx,ny,closing,incoming){
 const ratio=tileInvMass(light)/tileInvMass(heavy);
 if(light.pieces||light.resoluteCombat||light.resoluteEscort||closing<114||incoming<42||ratio<2.1)return;
 const slip=(light.vy-heavy.vy)*nx-(light.vx-heavy.vx)*ny;
 const flank=Math.cos(light.aim)*ny-Math.sin(light.aim)*nx;
 const sign=Math.sign(Math.abs(slip)>12?slip:flank)||1;
 const power=clamp(((closing-100)*.11+incoming*.045)*Math.sqrt(ratio/2)+Math.min(4,Math.abs(slip)*.035),8,29);
 const spin=light.impactTumble??={angle:0,rate:0};
 spin.rate=clamp(spin.rate+sign*power,-29,29);
}
function advanceFighterTumbles(dt){
 for(const ship of [p,testLead,wingman]){
  const spin=ship?.impactTumble;
  if(!spin)continue;
  spin.angle+=spin.rate*dt;spin.rate*=Math.exp(-2.5*dt);
  if(Math.abs(spin.rate)<1.8){
   spin.angle=headingDelta(0,spin.angle)*Math.exp(-7*dt);
   if(Math.abs(spin.angle)<.01&&Math.abs(spin.rate)<.1)ship.impactTumble=null;
  }
 }
}
function fighterTumbleAngle(ship){
 const angle=ship.impactTumble?.angle??0;
 return motion?.matches?.19*Math.sin(angle):angle;
}
function damageTileImpact(a,b,left,right,pair){
 if(pair.hit||elapsed<(pair.damage??0))return;
 const angle=Math.atan2(right.y-left.y,right.x-left.x),nx=Math.cos(angle),ny=Math.sin(angle);
 const aIn=a.vx*nx+a.vy*ny,bIn=-b.vx*nx-b.vy*ny,closing=aIn+bIn;
 if(closing<=70)return;
 // One kinetic damage budget scales with reduced mass and the closing
 // speed. An incoming heavier body can add modest severity, while the
 // fixed allocation is 60/40 (or 50/50 for matching masses).
 const ia=tileInvMass(a),ib=tileInvMass(b),total=ia+ib,equal=Math.abs(ia-ib)<1e-6;
 const driving=.90+.10*(clamp(aIn/closing,0,1)*ib+clamp(bIn/closing,0,1)*ia)/total;
 const energy=Math.min(10,(closing*closing-70*70)*driving/total/145000);
 const budget=equal?2*Math.round(energy/2):Math.round(energy);
 const light=Math.round(.60*budget);
 const amount=ship=>{
  const sign=ship===a?1:-1;
  const prow=tileProwContact(ship,sign*nx,sign*ny)?.70:1;
  const share=equal?budget/2:(ship===a?ia>ib:ib>ia)?light:budget-light;
  return Math.round(share*prow);
 };
 if(!amount(a)&&!amount(b))return;
 pair.hit=true;pair.damage=elapsed+.25;
 if(ia>ib)impartFighterTumble(a,b,nx,ny,closing,bIn);
 else if(ib>ia)impartFighterTumble(b,a,-nx,-ny,closing,aIn);
 const hammerhead=(!b.hammerheadProw&&tileProwContact(a,nx,ny))||(!a.hammerheadProw&&tileProwContact(b,-nx,-ny));
 playTileSmash(left.x+nx*left.r,left.y+ny*left.r,hammerhead);
 if(hammerhead&&closing>=125&&!motion?.matches&&(shakeSwitch?.checked??true)&&
    ((a.ram?.goal&&a.ram.target===b&&tileProwContact(a,nx,ny,15))||
     (b.ram?.goal&&b.ram.target===a&&tileProwContact(b,-nx,-ny,15))))kick(.44);
 for(const ship of [a,b]){
  const damage=amount(ship);
  if(!damage)continue;
  if(ship===p){loseHull(ship,damage);updateHud();}
  else if(ship.pieces)damageBlackwake(ship,damage);
  else if(ship.allyShip)damageAlliedHull(ship,damage);
 }
 if(state==='play'&&!p.hp)disablePlayer(false);
}
function resolveTileShipContacts(fleetCorvette=null){
 const ships=[...(state==='watch'?[]:[p]),...livingAllies(),fleetCorvette??battleResolute(),...pirateCapitals,...activeVanduls()].filter(ship=>ship?.hp>0);
 for(let i=0;i<ships.length;i++)for(let j=i+1;j<ships.length;j++){
  const a=ships[i],b=ships[j],padding=a.pieces||b.pieces?9.04:0;
  if(fleetCorvette&&a!==fleetCorvette&&b!==fleetCorvette)continue;
  if(duelResult)return;
  if(!a.hp||!b.hp)continue;
  let pairs=tileContactPairs.get(a);
  if(!pairs){pairs=new WeakMap();tileContactPairs.set(a,pairs);}
  let pair=pairs.get(b);
  let left,right,depth=-.65;
  for(const x of a.solidSections??a.pieces??[a])for(const y of b.solidSections??b.pieces??[b]){
   const overlap=x.r+y.r+padding-Math.hypot(x.x-y.x,x.y-y.y);
   if(overlap>depth){depth=overlap;left=x;right=y;}
  }
  if(!left){if(pair)pair.hit=false;continue;}
  // Friendly hulls push without damage, sparks or impact sound.
  // Carrier sections use the separate silent contact path below in physics().
  const friendlyContact=(a===p||a.allyShip)&&(b===p||b.allyShip);
  if(!friendlyContact){
   if(!pair){pair={spark:0,hit:false};pairs.set(b,pair);}
   sparkTileContact(a,b,left,right,pair);
  }
  if(depth<=0)continue;
  if(!friendlyContact){
   if(a.ram?.target===b)a.ram.hit=true;
   if(b.ram?.target===a)b.ram.hit=true;
   damageTileImpact(a,b,left,right,pair);
  }
  if(state==='disabled')return;
  // One normal for the whole ship pair, even when multiple deck sections
  // overlap. Reuse the mass-weighted fighter/contact impulse.
  const proxy=(ship,section)=>({x:section.x,y:section.y,r:section.r+padding*.5,
   vx:ship.vx,vy:ship.vy,spin:0,craft:true,invMass:tileInvMass(ship)});
  const ax=proxy(a,left),bx=proxy(b,right);
  contact(ax,bx,false);
  for(const [ship,section,body] of [[a,left,ax],[b,right,bx]]){
   let x=ship.x+(body.x-section.x),y=ship.y+(body.y-section.y);
   if(ship.hullSections||ship.redGrinSolo||ship.convoy){
    // The escort retains its assigned lane and the test unit retains its AI
    // route. Both take the impact while the smaller ship can be deflected.
    continue;
   }
   if(ship.pieces){
    x=clamp(x,arena.left+61,arena.right-61);y=clamp(y,arena.top+61,arena.bottom-61);
    if(blackwakeClearPose(ship,x,y,ship.yaw,asteroids)){ship.x=x;ship.y=y;}
    ship.kickX+=body.vx-ship.vx;ship.kickY+=body.vy-ship.vy;placeBlackwakeTurret(ship,false);
   }else{ship.x=x;ship.y=y;wall(ship);}
   ship.vx=body.vx;ship.vy=body.vy;
  }
 }
}
function fireVandulLasers(dt){
 const rivals=activeVanduls();if(!rivals.length)return;
 const obstacles=visionBlockers();
 const end=duelClock+dt;
 for(const ship of rivals){
  // Retest the actual positions after physics and cover impacts. Shot offsets
  // still belong to one discharge; existing bolts are not homing.
  const visible=updateVandulSight(ship,obstacles,end,true);
  if(!ship.trainingGuard&&!ship.overheated){
   const shotCover=ship.attackTarget?.allyShip?[...obstacles,p]:obstacles;
   if(!advanceVandulBurst(ship,visible,shotCover,end)){
    if(visible){
     if(!ship.thermalTracking&&ship.nextLaser<=end&&noseReady(ship,bearing(ship,visible)))beginVandulBurst(ship,actualLaserTime(ship.nextLaser,end),visible);
    }else tryVandulPredictionShot(ship,shotCover,end);
   }
  }
  coolVandul(ship,end);
  ship.stacks=ship.stacks.filter(stack=>stack.expiresAt>end);
  ship.bonus=ship.stacks.length;
 }
 duelClock=end;
 updateDuelReadout();
}
function vandulHullAngle(ship){
 const {aim,hitGlow,rockSign,angle}=ship;
 const rock=motion?.matches?0:rockSign*Math.sin(hitGlow*29)*hitGlow*.64+Math.sin(angle)*.065;
 return aim+Math.PI/2+rock;
}
// Shared fighter destruction effect. Flight saves and kill rules are unrelated.
let riftWreckArt,riftWrecks=[],riftBroken=new WeakSet();
const riftBreakLayouts=[
 [[-22,8,32], [0,0,57], [22,8,32]],
 [[-15,10,43], [0,-15,36], [20,11,36]],
 [[-18,-3,39], [0,15,34], [16,-9,43]]
];
function loadRiftWreckArt(){
 if(!riftWreckArt&&typeof window.Image==='function'){
  riftWreckArt=new window.Image();riftWreckArt.src='./rift-3-wreck-parts.webp';
 }
}
function breakRiftFighter(ship){
 const hull=ship.simTeam?starterHullId:ship.fit?.hull??ship.fighter;
 if(hull!==starterHullId&&hull!==stockFighterId||riftBroken.has(ship))return;
 riftBroken.add(ship);loadRiftWreckArt();
 const variant=Math.floor(Math.random()*riftBreakLayouts.length);
 const angle=(ship.aim??-Math.PI/2)+Math.PI/2,c=Math.cos(angle),s=Math.sin(angle);
 const pieces=riftBreakLayouts[variant].map(([x,y,size],i)=>{
  const bearing=angle+Math.atan2(y,x)+(Math.random()-.5)*.36;
  const reduced=motion?.matches,kick=(reduced?12:23)+Math.random()*(reduced?8:24);
  return {x:ship.x+(x*c-y*s)*.74,y:ship.y+(x*s+y*c)*.74,
   vx:(ship.vx??0)*.38+Math.cos(bearing)*kick,vy:(ship.vy??0)*.38+Math.sin(bearing)*kick,
   r:size*.24,size,angle,spin:(Math.random()-.5)*(reduced?.42:2.10),invMass:.8,wallFx:0,hitGlow:0,index:i};
 });
 riftWrecks.push({variant,pieces,age:0});
}
function advanceRiftWrecks(dt){
 const fade=Math.exp(-.93*dt),turn=Math.exp(-1.13*dt);
 for(const wreck of riftWrecks){
  if(wreck.age>=8)continue;
  wreck.age+=dt;
  for(const pce of wreck.pieces){
   pce.x+=pce.vx*dt;pce.y+=pce.vy*dt;pce.angle+=pce.spin*dt;
   pce.vx*=fade;pce.vy*=fade;pce.spin*=turn;
   if(state==='play'){
    if(p?.hp&&fighterBattle?.repairAt==null)contact(p,pce,false);
    for(const rock of asteroids)if(Math.abs(rock.x-pce.x)<rock.r+pce.r&&Math.abs(rock.y-pce.y)<rock.r+pce.r)contact(rock,pce,false);
   }
   containDebris(pce);
  }
 }
}
function paintRiftWrecks(camera){
 const ready=riftWreckArt?.complete&&riftWreckArt.naturalWidth>=480;
 for(const wreck of riftWrecks)for(const pce of wreck.pieces){
  if(!withinCamera(pce,camera,pce.size))continue;
  const d=pce.size/2;
  g.save();g.translate(pce.x,pce.y);g.rotate(pce.angle);
  if(ready)g.drawImage(riftWreckArt,pce.index*160,wreck.variant*160,160,160,-d,-d,pce.size,pce.size);
  else{
   g.fillStyle='#253b37';g.strokeStyle='#8f6453';g.lineWidth=1.4;
   poly([[-d*.7,-d*.13],[d*.34,-d*.78],[d*.69,-d*.29],[d*.41,d*.09],[d*.58,d*.24],[d*.27,d*.70],[-d*.67,d*.42]]);
  }
  g.restore();
 }
}

function archiveWreck(wreck){
 if(!isWingmanTest()&&!wreckLayerContext&&typeof document.createElement==='function'){
  try{
   const layer=document.createElement('canvas');layer.width=W;layer.height=H-floorNorth();
   const context=layer.getContext('2d');
   if(context){
    context.translate(0,-floorNorth());
    wreckLayer=layer;wreckLayerContext=context;
    for(const old of archivedWrecks)paintOneWreck(context,old,false);
    archivedWrecks=[];
   }
  }catch{/* bounded visual fallback below */}
 }
 if(wreckLayerContext){paintOneWreck(wreckLayerContext,wreck,false);return;}
 archivedWrecks.push(wreck);
 if(archivedWrecks.length>archivedFallbackLimit){archivedWrecks.shift();archivedFallbackLimited=true;}
}
function breakVandul(ship){
 if(!wreckSprite&&typeof window.Image==='function'){
  wreckSprite=new window.Image();wreckSprite.src='./vandul-wreck.webp';
 }
 const value=()=>driveRandom(ship);
 const count=5+Math.floor(value()*4),phase=value()*TAU;
 const hull={x:ship.x,y:ship.y,r:ship.r,vx:ship.vx,vy:ship.vy,angle:vandulHullAngle(ship),
  spin:clamp(ship.spin*.12+(value()-.5)*.34,-.43,.43),invMass:.16};
 const fragments=Array.from({length:count},(_,i)=>{
  const theta=phase+TAU*(i+(value()-.5)*.58)/count,offset=ship.r-3+value()*12,shove=31+value()*46;
  const r=3+i*.68+value()*.42,u=Math.cos(theta),v=Math.sin(theta);
  const vertices=4+Math.floor(value()*3);
  const shape=Array.from({length:vertices},(_,j)=>{
   const a=j*TAU/vertices,length=r*(.70+value()*.54);return [Math.cos(a)*length,Math.sin(a)*length];
  });
  return {x:clamp(ship.x+u*offset,arena.left+r,arena.right-r),y:clamp(ship.y+v*offset,arena.top+r,arena.bottom-r),
   r,vx:ship.vx*.42+u*shove,vy:ship.vy*.42+v*shove,angle:value()*TAU,
   spin:(.18+value()*1.18)*(i%2?1:-1),invMass:1.4-r*.1,shape,
   sampleX:.5+u*(.18+value()*.11),sampleY:.49+v*(.13+value()*.15),
   color:['#7b5f55','#685767','#805c4e','#635c67'][i%4]};
 });
 wreckage={hull,fragments,bodies:[hull,...fragments]};
 if(activeWrecks.length>=physicalWreckLimit)archiveWreck(activeWrecks.shift());
 activeWrecks.push(wreckage);
}
function containDebris(body){
 const x=clamp(body.x,arena.left+body.r,arena.right-body.r);
 const y=clamp(body.y,arena.top+body.r,arena.bottom-body.r);
 if(x!==body.x){body.x=x;body.vx*=-.28;body.spin*=.78;}
 if(y!==body.y){body.y=y;body.vy*=-.28;body.spin*=.78;}
}
function stepWreckage(dt,obstacles){
 if(!activeWrecks.length)return;
 for(const wreck of activeWrecks)for(const piece of wreck.bodies){
  const hull=piece===wreck.hull,damp=Math.exp(-(hull?1.46:1.66)*dt);
  piece.vx*=damp;piece.vy*=damp;piece.spin*=Math.exp(-(hull?1.10:1.37)*dt);
  if(Math.hypot(piece.vx,piece.vy)<.025)piece.vx=piece.vy=0;
  if(Math.abs(piece.spin)<.003)piece.spin=0;
  piece.x+=piece.vx*dt;piece.y+=piece.vy*dt;piece.angle+=piece.spin*dt;
  containDebris(piece);
  // Solid to hulls and the environment, not a new target or shot blocker.
  contact(p,piece,false);
  for(const body of obstacles)contact(body,piece,false);
  capVelocity(piece,hull?340:175);piece.spin=clamp(piece.spin,hull?-.56:-1.6,hull?.56:1.6);
  containDebris(piece);
 }
 wall(p);
 for(const body of obstacles)wall(body);
}
function hitWithPlayerShot(b,hit,earliest,dt){
 b.x+=b.vx*dt*earliest;b.y+=b.vy*dt*earliest;b.spent=true;
 if(hit.resoluteDrone){
  hit.hp=Math.max(0,hit.hp-b.damage);
  hit.kvx=(hit.kvx??0)+Math.cos(b.a)*38;hit.kvy=(hit.kvy??0)+Math.sin(b.a)*38;
  if(!motion?.matches&&(shakeSwitch?.checked??true)&&Math.hypot(hit.x-p.x,hit.y-p.y)<440)kick(hit.hp?.11:.19);
  burstRing(b.x,b.y,hit.hp?16:30,hit.hp?'#7df4ee':'#f6d78c');
  return;
 }
 if(hit.blackwakePart){
  if(hit.blackwakePart.hp>0)damageBlackwake(hit.blackwakePart,b.damage,b);
  return;
 }
 if(hit.simTeam){
  hitFighterBattleBot(hit,b.damage,b.x,b.y);
  if(!b.ally){practiceHits++;sound('hit');kick(.08);}
  return;
 }
 if(hit.rangeTarget){
  hit.cleared=true;hit.respawnAt=rangeClock+dt*earliest+rangeRespawnSeconds;rangeScore++;practiceHits++;rangeMessage='';
  if(autoLock===hit)autoLock=null;
  sound('hit');burstRing(hit.x,hit.y,28,'#95ffe9');updateCustomRange();return;
 }
 const cx=hit.prevX+(hit.x-hit.prevX)*earliest,cy=hit.prevY+(hit.y-hit.prevY)*earliest;
 const gun=guns[b.weapon]||guns.blaster; // Impact uses the gun frozen at launch.
 applyShotImpact(hit,b,gun,b.x,b.y,cx,cy);
 const heavy=gun.kind==='ballistic';
 if(hit.vandul){
  hit.hp=Math.max(0,hit.hp-b.damage);
  if(hit.hp===0){
   breakVandul(hit);vanduls.splice(vanduls.indexOf(hit),1);
   if(b.ally)wingmanKills++;
   else{
    duelKills++;
    try{
    const receipt=canCreditThisFlight()?window.RiftCredits?.recordEnemyKill?.(managedBuild?flightGeneration:undefined):null;
    if(receipt?.saved===true&&Number.isFinite(receipt.amount)&&receipt.amount>0)sortieCredits+=receipt.amount;
    }catch{/* A local save error does not interrupt the fight. */}
   }
   if(autoLock===hit)autoLock=null;
   hit.stacks=[];hit.bonus=0;hit.drive=null;
   if(!vanduls.length&&!waitingVanduls()){
    duelResult=isTileBattle()||isWingmanTest()||duelWave===6?'victory':'won';
    if(duelResult==='won'){duelCountdown=duelCountdownSeconds;waveCountdownFresh=true;}
   }
   for(const bolt of vandulLasers)if(duelResult||bolt.owner===hit)bolt.life=0;
   burstRing(hit.x,hit.y,39,'#d3a6ff');updateDuelReadout();updateDuelCountdown();
  }else{
   hit.rockSign*=-1;
   const chance=gun.targetSpreadChance;
   if(chance>=1||chance>0&&Math.random()<chance){
    const hitAt=duelClock+dt*earliest;
    hit.stacks.push({hitAt,expiresAt:hitAt+vandulStackSeconds});
   }
  }
 }
 hit.hitGlow=.46;
 if(!b.ally){practiceHits++;sound('hit');kick(heavy?.13:.10);}
 blast(b.x,b.y,b.ally?'#9deaff':gun.hit,heavy?15:12,heavy?1:.83);burstRing(b.x,b.y,heavy?26:20,b.ally?'#6cbfff':gun.ring);
 if(duelResult==='victory'){if(isTileBattle())finishFourWay();else beginMissionDeparture();}
}
function fleetReturnGate(){
 return state==='play'&&isTileBattle()&&(duelResult===null||duelResult==='victory')&&p.hp>0&&flightMode.tileReturn
  ?tileGate(flightMode.tileApproach.entryEdge):null;
}
function nearFleetReturn(gate){
 return !!gate&&(p[gate.axis]-gate.line)*gate.sign>=-56;
}
function updateFleetReturnHud(){
 const gate=fleetReturnGate();
 if(!fleetReturnHud)return;
 const ready=nearFleetReturn(gate);
 fleetReturnHud.hidden=!gate||duelResult!=='victory'&&!ready;
 if(fleetReturnHud.hidden)return;
 const edge=flightMode.tileApproach.entryEdge;
 const status=fleetReturnAuto?'Autopilot · '+edge+' edge':ready?(duelResult==='victory'?'Ready · ':'Retreat · ')+edge+' edge':'Victory · Return via '+edge;
 if(fleetReturnStatus.textContent!==status)fleetReturnStatus.textContent=status;
 const label=fleetReturnAuto?'Cancel Return':'Return to Battle Fleet Map';
 if(fleetReturnAction.textContent!==label)fleetReturnAction.textContent=label;
 fleetReturnAction.disabled=document.hidden||routeParked||!!hangarDialog?.open;
}
function returnToBattleFleet(event){
 const gate=fleetReturnGate();
 if(event.isTrusted!==true||document.hidden||routeParked||hangarDialog?.open||!gate)return;
 if(fleetReturnAuto){fleetReturnAuto=false;updateFleetReturnHud();liveFocus();return;}
 if(nearFleetReturn(gate)){joinBattleFleet();return;}
 if(duelResult!=='victory')return;
 clearInput();fleetReturnAuto=true;updateFleetReturnHud();liveFocus();
}
function joinBattleFleet(){
 resetDamageSmoke();fleetReturnAuto=false;
 const {ship,mode,bounds,sortie}=flightMode.tileReturn;
 const escort=wingman?.corsairWing&&wingman.hp>0?wingman:null;
 // Keep the unfinished local encounter in this flight session. Navigation
 // away still ends the exercise; no change to multiplayer or save data.
 const rejoin=duelResult===null&&flightMode.id===corsairTileTest.id?{
  mode:sortie.mode,title:'Rejoin Corsair Cluster',check:sortie.check,approach:sortie.approach,failed:false,piloted:false,
  resume:{pirateCapitals,blackwake,asteroids,sceneryDebris,cones}
 }:null;
 const corvette=battleResolute();
 if(corvette&&ship.resoluteEscort){
  ship.resoluteEscort.hp=corvette.hp;
  ship.resoluteEscort.hullHitUntil=corvette.hullHitUntil;
 }
 flightMode=mode;capitalShip=ship;
 Object.assign(arena,bounds);
 if(ship.stream)ship.stream.chart=mode.testCarrier
  ?undefined:window.RiftGalaxyState?.watch?.(ship.vessel===bifrostCapital?'bifrost':'rift-carrier');
 ship.phase='flight';ship.roundTripReturned=true;ship.berthMove=null;ship.pilotLanded=false;ship.transfer=null;ship.commsUntil=0;ship.parkingCommit=null;
 ship.returnGreeting=false;pendingCarrierSortie=rejoin;duelEnabled=false;
 cones=[];shots=[];sparks=[];rings=[];clashBursts=[];testLead=wingman=null;blackwake=null;pirateCapitals=[];resetDuel();
 if(ship.supportFleet)updateSupportFleet(ship);
 p.dockingClearance=false;p.dockQueuedUntil=0;
 // Reversing a tile crossing brings the same fighter through the fleet's
 // original exit edge. Inward momentum makes the arrival fly in, not jump
 // to the carrier; the saved outbound gate remains available for rejoin.
 const edge=sortie.approach.exitEdge,[dx,dy]=tileDirections[edge];
 const heading=Math.atan2(-dy||0,-dx||0),pace=Math.min(62,p.speed*.48);
 Object.assign(p,tileArrivalPoint(edge,Math.max(58,p.r+22)));
 p.prevX=p.x;p.prevY=p.y;p.vx=-dx*pace;p.vy=-dy*pace;
 clearInput();snapAim(heading);p.mainMomentum=pace>.25;p.mainThrustActive=false;
 if(escort){wingman=escort;placeCorsairWingman(escort,heading);syncWingmanCommands();}
 updateFleetReturnHud();syncArrivalControls();updateDuelReadout();updateHud();liveFocus();syncArenaMusic();
}
fleetReturnAction?.addEventListener('click',returnToBattleFleet);
function fleetReturnVelocity(){
 const gate=fleetReturnAuto&&fleetReturnGate();
 if(!gate)return null;
 const [x,y]=gate.vector,pace=Math.min(165,p.speed*.83),blocks=visionBlockers();
 // Choose a steerable detour around nearby cover, never move the craft directly.
 for(const turn of [0,.60,-.60,1.15,-1.15,1.57,-1.57]){
  const angle=Math.atan2(y,x)+turn,vx=Math.cos(angle)*pace,vy=Math.sin(angle)*pace;
  const t=.54,nx=p.x+vx*t,ny=p.y+vy*t;
  if(gate.axis!=='x'&&(nx<arena.left+p.r||nx>arena.right-p.r)||
     gate.axis!=='y'&&(ny<arena.top+p.r||ny>arena.bottom-p.r))continue;
  if(blocks.every(b=>{
   const dx=p.x-b.x,dy=p.y-b.y,r=p.r+b.r+12;
   return dx*dx+dy*dy<=r*r?dx*vx+dy*vy>0:sweptCircle(dx,dy,vx*t,vy*t,r)===null;
  })){
   queueHeading(p,angle);
   return {x:vx,y:vy};
  }
 }
 return {x:0,y:0};
}
function finishFourWay(){
 for(const bolt of vandulLasers)bolt.life=0;
 for(const shot of shots)shot.spent=true;
 shots=[];vandulLasers=[];stopArenaMusic();
 updateDuelReadout();updateFleetReturnHud();
}
function hitWithVandulLaser(b,hit,t,dt){
 b.life=0;
 const x=b.x+b.vx*dt*t,y=b.y+b.vy*dt*t;
 const damage=b.damage;
 if(damage<=0)return;
 if(hit.simTeam){hitFighterBattleBot(hit,damage,x,y);return;}
 const cx=hit.prevX+(hit.x-hit.prevX)*t,cy=hit.prevY+(hit.y-hit.prevY)*t;
 applyShotImpact(hit,b,vandulProfile.laser,x,y,cx,cy);
 burstRing(x,y,15,'#ed7cae');
 if(hit===p){
  loseHull(p,damage);kick(.12);sound('hit');
  if(p.hp===0)disablePlayer(true);
 }else{
  hit.hitGlow=.25;
  if(isFourWayBattle()&&hit.rivalEdge){
   hit.hp=Math.max(0,hit.hp-damage);
   if(!hit.hp){
    breakVandul(hit);vanduls.splice(vanduls.indexOf(hit),1);
    if(autoLock===hit)autoLock=null;
    for(const bolt of vandulLasers)if(bolt.owner===hit)bolt.life=0;
    updateDuelReadout();
   }
  }else if(hit.allyShip)damageAlliedHull(hit,damage);
 }
}
const clashRadius=6,clashCell=32;
function projectileTravel(b,dt,enemy){
 const dx=b.vx*dt,dy=b.vy*dt;
 if(fighterBattle)tagFrigateShot(b,enemy);
 if(fighterBattle&&!simRoundInside(b))return {b,dx,dy,end:-1,enemy};
 if(b.x<arena.left||b.x>arena.right||b.y<arena.top||b.y>arena.bottom)return {b,dx,dy,end:-1,enemy};
 const limitX=dx>0?(arena.right-b.x)/dx:dx<0?(arena.left-b.x)/dx:1;
 const {top,bottom}=fighterBattle?simRoundBounds(b):arena;
 const limitY=dy>0?(bottom-b.y)/dy:dy<0?(top-b.y)/dy:1;
 return {b,dx,dy,end:Math.min(1,limitX,limitY,enemy?b.life/dt:1),enemy};
}
function queueBodyContacts(t,bodies,events,friendly=false){
 const {b,dx,dy,end}=t;
 if(end<0)return;
 for(const body of bodies){
  const x=b.x-body.prevX,y=b.y-body.prevY;
  const vx=dx-(body.x-body.prevX),vy=dy-(body.y-body.prevY),r=body.r+2;
  if(fighterBattle&&(body===b.owner||Math.abs(x)>Math.abs(vx)+r||Math.abs(y)>Math.abs(vy)+r))continue;
  const time=sweptCircle(x,y,vx,vy,r);
  if(time!==null&&time<=end)events.push({time,t,body,friendly});
 }
}
function projectileCells(t,pad,visit){
 const {b,dx,dy,end}=t;
 if(end<0)return;
 const endX=b.x+dx*end,endY=b.y+dy*end;
 const x0=Math.floor((Math.min(b.x,endX)-pad)/clashCell),x1=Math.floor((Math.max(b.x,endX)+pad)/clashCell);
 const y0=Math.floor((Math.min(b.y,endY)-pad)/clashCell),y1=Math.floor((Math.max(b.y,endY)+pad)/clashCell);
 for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++)visit(x+128*y);
}
function queueClashes(players,hostiles,events){
 if(!players.length||!hostiles.length)return;
 // Index only hostile swept bounds. A player shot checks the small set
 // sharing its path cells and cannot collide with a friendly projectile.
 const grid=new Map();
 for(const h of hostiles)projectileCells(h,0,key=>{
  const list=grid.get(key);
  if(list)list.push(h);else grid.set(key,[h]);
 });
 for(const t of players){
  const seen=new Set();
  projectileCells(t,clashRadius,key=>{
   for(const h of grid.get(key)??[]){
    if(seen.has(h))continue;
    seen.add(h);
    const time=sweptCircle(t.b.x-h.b.x,t.b.y-h.b.y,t.dx-h.dx,t.dy-h.dy,clashRadius);
    if(time!==null&&time<=Math.min(t.end,h.end))events.push({time,t,other:h});
   }
  });
 }
}
// Aegis S-3 tuned for the larger Resolute hull; the fighter fit is unchanged.
const resoluteAegis=Object.freeze({capacity:25,duration:5,recharge:2});
function queueResoluteAegis(t,craft,events){
 if(!craft?.hp||t.b.ally||t.b.resoluteShieldResolved||t.end<0)return;
 const {b,dx,dy,end}=t;
 const x=b.x-craft.prevX,y=b.y-craft.prevY,vx=dx-(craft.x-craft.prevX),vy=dy-(craft.y-craft.prevY);
 const radius=resoluteFlightLength*.56;
 if(x*x+y*y<radius*radius&&x*vx+y*vy>=0)return;
 const time=sweptCircle(x,y,vx,vy,radius);
 if(time!==null&&time<=end)events.push({time,t,resoluteShield:craft});
}
function resolveResoluteAegis(craft,b,at,friendly=false){
 if(!craft.hp||b.resoluteShieldResolved||!(b.damage>0))return false;
 let field=craft.aegis;
 if(!field||at>=field.readyAt){
  field=craft.aegis={hp:resoluteAegis.capacity,until:at+resoluteAegis.duration,readyAt:at+resoluteAegis.duration+resoluteAegis.recharge,hitAt:at};
 }
 if(field.hp<=0||at>=field.until)return false;
 if(friendly){field.hitAt=at;b.resoluteShieldResolved=true;return true;}
 const ballistic=(b.kind??guns[b.weapon]?.kind)==='ballistic';
 const absorbed=Math.min(field.hp,b.damage*(ballistic?.5:1));
 field.hp-=absorbed;field.hitAt=at;b.damage-=absorbed;b.resoluteShieldResolved=true;
 if(field.hp<=0){field.until=at;field.readyAt=at+resoluteAegis.recharge;}
 return true;
}
function sweepProjectiles(dt,bodies,obstacles,fleetCorvette=null){
 if(!shots.length&&!vandulLasers.length)return;
 const player=shots.map(b=>projectileTravel(b,dt,false));
 const hostile=vandulLasers.filter(b=>b.life>0).map(b=>projectileTravel(b,dt,true));
 const events=[],stations=rangeTargets.length?rangeTargets.filter(point=>!point.cleared):rangeTargets;
 const shotCorvette=fleetCorvette??battleResolute(),squad=fighterBattle?fighterBattle.blue.filter(ship=>ship.hp>0&&inFighterBattleCenter(ship.y)):livingAllies();
 for(const t of player){
  if(t.b.frigateTarget)queueBodyContacts(t,t.b.frigateTarget.hitCells,events);
  if(t.b.resoluteDrill){
   if(t.b.resoluteDrill===capitalShip?.resoluteDrill)queueBodyContacts(t,t.b.resoluteDrill.drones.filter(d=>d.hp>0),events);
   queueBodyContacts(t,obstacles,events);
  }else{queueBodyContacts(t,bodies,events);if(fighterBattle)queueBodyContacts(t,obstacles,events);}
  if(!t.b.resoluteDrill)for(const ship of pirateCapitals)if(ship.hp>0)queueBodyContacts(t,ship.pieces,events);
  if(!t.b.resoluteDrill&&stations.length&&t.b.rangeCycle===rangeCycle)queueBodyContacts(t,stations,events);
  if(capitalShip||escortShip)queueBodyContacts(t,(capitalShip??escortShip).hull,events);
  if(!t.b.resoluteDrill){
   queueBodyContacts(t,squad.filter(ship=>ship!==t.b.owner),events,true);
   if(redGrinConvoy?.hp>0)queueBodyContacts(t,[redGrinConvoy],events,true);
   if(t.b.ally&&state!=='watch'&&!flightMode.simWatch&&p.hp>0&&(!fighterBattle||inFighterBattleCenter(p.y)))queueBodyContacts(t,[p],events,true);
  }
  if(t.b.ally&&shotCorvette?.hp>0&&t.b.owner!==shotCorvette&&!t.b.resoluteDrill)
   queueBodyContacts(t,shotCorvette.hullSections,events,true);
  if(!t.b.ally){
   if(capitalShip?.shotHull)queueBodyContacts(t,capitalShip.shotHull,events);
   const support=capitalShip?.supportFleet;
   if(support){queueBodyContacts(t,support.hull,events);if(support.shotHull)queueBodyContacts(t,support.shotHull,events);}
   if(shotCorvette?.hp>0){queueResoluteAegis(t,shotCorvette,events);queueBodyContacts(t,shotCorvette.hullSections,events);}
  }
 }
 if(hostile.length){
  const targets=state==='watch'||flightMode.simWatch&&simDirector?.pilotDown||fighterBattle&&(flightMode.simWatch||p.y>fighterCross.south)?[...obstacles]:[...obstacles,p];
  if(capitalShip){
   targets.push(...capitalShip.hull,...(capitalShip.shotHull??[]));
   const support=capitalShip.supportFleet;
   if(support)targets.push(...support.hull,...(support.shotHull??[]));
  }
  if(redGrinConvoy?.hp>0)targets.push(redGrinConvoy);
  if(fighterBattle)targets.push(...squad);
  if(wingman?.hp>0)targets.push(wingman);
  if(testLead?.hp>0)targets.push(testLead);
  if(shotCorvette?.hp>0)targets.push(...shotCorvette.hullSections);
  for(const t of hostile){
   if(t.b.frigateTarget)queueBodyContacts(t,t.b.frigateTarget.hitCells,events);
   queueBodyContacts(t,isFourWayBattle()?[...targets,...vanduls.filter(ship=>ship!==t.b.owner&&ship.hp>0)]:targets,events);
   if(fighterBattle)queueBodyContacts(t,bodies,events,true);
   // Four-way rivals belong to separate factions. In ordinary sorties
   // Vanduul share one team, and Blackwake crews share a different team.
   if(t.b.blackwakeTurret){
    for(const ship of pirateCapitals)if(ship.hp>0&&ship!==t.b.friendlyOwner)queueBodyContacts(t,ship.pieces,events,true);
   }else if(t.b.owner?.vandul&&!isFourWayBattle()){
    queueBodyContacts(t,vanduls.filter(ship=>ship.hp>0&&ship!==t.b.owner),events,true);
   }
   queueResoluteAegis(t,shotCorvette,events);
   const shield=fittedShield();
   if(state==='watch'||flightMode.simWatch&&simDirector?.pilotDown||fighterBattle&&p.y>fighterCross.south||!shield||!shieldUp()||t.b.shieldResolved)continue;
   const {b,dx,dy,end}=t;
   const x=b.x-p.prevX,y=b.y-p.prevY,vx=dx-(p.x-p.prevX),vy=dy-(p.y-p.prevY);
   // Hostiles already inside the field may still be coming toward the hull.
   if(x*x+y*y<shield.radius**2&&x*vx+y*vy>=0)continue;
   const time=sweptCircle(x,y,vx,vy,shield.radius);
   if(time!==null&&time<=end)events.push({time,t,shield:true});
  }
  queueClashes(fighterBattle?player.filter(t=>!t.b.ally):player,hostile,events);
 }
 // Earliest real contact wins. At an exact tie, solid hulls/cover take priority.
 // Keep all candidates so a later collision can still land if an earlier target
 // or opposing bolt was already destroyed by a different shot this substep.
 const priority=event=>event.shield||event.resoluteShield?1:event.body===p?2:event.body?0:3;
 events.sort((a,b)=>a.time-b.time||priority(a)-priority(b));
 for(const {time,t,body,other,shield,resoluteShield,friendly} of events){
  const b=t.b;
  if(t.enemy?b.life<=0:b.spent)continue;
  if(resoluteShield){
   if(resolveResoluteAegis(resoluteShield,b,elapsed+dt*time,!t.enemy)){
    burstRing(b.x+t.dx*time,b.y+t.dy*time,21,'#79efff');
    if(!t.enemy)b.spent=true;else if(b.damage<=0)b.life=0;
   }
   continue;
  }
  if(shield){
   if(b.shieldResolved)continue;
   const remainder=shieldDamage(b.damage,b.kind??vandulProfile.laser.kind,shieldClock+dt*time);
   if(remainder===b.damage)continue;
   b.shieldResolved=true;b.damage=remainder;
   burstRing(b.x+t.dx*time,b.y+t.dy*time,18,'#79efff');
   if(remainder<=0)b.life=0;
   continue;
  }
  if(body){
   if(body.simFrigate){hitSimFrigate(body.simFrigate,b,t,time);continue;}
   if(friendly){
    if((body.resoluteHull??body.blackwakePart??body).hp===0)continue;
    if(t.enemy)b.life=0;else b.spent=true;
    flashFriendlyHull(b.x+t.dx*time,b.y+t.dy*time,t.dx,t.dy);
    continue;
   }
   if(body.capitalHull){
    if(!t.enemy){
     b.spent=true;
     if(!b.resoluteDrill)flashFriendlyHull(b.x+t.dx*time,b.y+t.dy*time,t.dx,t.dy);
    }
    else{
     b.life=0;
     const carrier=carrierHullOwner.get(body);
     if(carrier?.hp>0&&b.damage>0){
      carrier.hp=Math.max(0,carrier.hp-b.damage);carrier.hullHitUntil=elapsed+1;
      burstRing(b.x+t.dx*time,b.y+t.dy*time,15,'#ed7cae');
     }
    }
    continue;
   }
   // Player rounds stop on the full mid-layer silhouette, without hull damage.
   if(!t.enemy&&body.resoluteHull){
    if(body.resoluteHull.hp>0){
     b.spent=true;
     if(!b.resoluteDrill)flashFriendlyHull(b.x+t.dx*time,b.y+t.dy*time,t.dx,t.dy);
    }
    continue;
   }
   if(body.rangeTarget&&body.cleared||body.blackwakePart?.hp===0||body.resoluteDrone&&body.hp===0)continue;
   if(t.enemy){
    const target=body.resoluteHull??body;
    if((target.allyShip||target.vandul)&&!target.hp)continue;
    if(target===redGrinConvoy){
     b.life=0;damageAlliedHull(target,b.damage);
     burstRing(b.x+t.dx*time,b.y+t.dy*time,15,'#f3b087');
    }else hitWithVandulLaser(b,target,time,dt);
    if(state!=='play'&&state!=='watch')return;
   }else if(!body.vandul||body.hp>0){
    hitWithPlayerShot(b,body,time,dt);
    if(state!=='play'&&state!=='watch')return;
   }
  }else if(other.b.life>0){
   b.spent=true;other.b.life=0;
   const x=(b.x+other.b.x+(t.dx+other.dx)*time)*.5,y=(b.y+other.b.y+(t.dy+other.dy)*time)*.5;
   flashProjectileClash(x,y);
  }
 }
 shots=shots.filter(b=>{
  if(!b.spent){b.x+=b.vx*dt;b.y+=b.vy*dt;}
  const flying=!b.spent&&(!fighterBattle||simRoundInside(b))&&(!b.simUntil||fighterBattle?.time<b.simUntil)&&b.y>=arena.top&&b.y<=arena.bottom&&b.x>=arena.left&&b.x<=arena.right;
  if(!flying)releaseProjectileVoice(b);
  return flying;
 });
 vandulLasers=vandulLasers.filter(b=>{
  if(b.life<=0)return false;
  b.x+=b.vx*dt;b.y+=b.vy*dt;b.life-=dt;
  return b.life>0&&(!fighterBattle||simRoundInside(b))&&b.x>=arena.left&&b.x<=arena.right&&b.y>=arena.top&&b.y<=arena.bottom;
 });
}
const wingmanLeash=235;
function looseWingmanPoint(ally,dt,target,blockers,rivals){
 // Use the ally's own contact or one the player can actually see. Briefly
 // remember the last confirmed point, not a live position behind cover.
 let contact=target;
 if(!contact){
  let range=410;
  for(const rival of rivals){
   const d=Math.hypot(rival.x-p.x,rival.y-p.y);
   if(d<range&&(playerCanSee(rival,blockers)||thermalContact(p,rival))){contact=rival;range=d;}
  }
 }
 if(contact)ally.looseContact={x:contact.x,y:contact.y,rival:contact,remaining:1.2};
 else if(ally.looseContact){
  ally.looseContact.remaining-=dt;
  if(ally.looseContact.remaining<=0||!rivals.includes(ally.looseContact.rival))ally.looseContact=null;
 }
 const known=ally.looseContact,margin=ally.r+8;
 ally.looseWait-=dt;
 const current=ally.loosePoint;
 if(current&&ally.looseWait>0&&Math.hypot(current.x-p.x,current.y-p.y)<wingmanLeash-24)return current;
 const stations=livingAllies().filter(mate=>mate!==ally&&mate.loosePoint);
 const side=ally===testLead?-(Math.sign(wingman?.formation.followX)||1):(Math.sign(ally.formation.followX)||1);
 let goal=null,best=-Infinity;
 for(const [dx,dy] of [[side*172,-43],[-side*172,-43],[side*128,-127],[-side*128,-127],
                       [0,-172],[side*135,107],[-side*135,107],[0,150]]){
  const point={x:clamp(p.x+dx,arena.left+margin,arena.right-margin),
   y:clamp(p.y+dy,arena.top+margin,arena.bottom-margin)};
  if(Math.hypot(point.x-p.x,point.y-p.y)<55||stations.some(mate=>Math.hypot(point.x-mate.loosePoint.x,point.y-mate.loosePoint.y)<68)||
   !!ally.formationTestOrder&&inPlayerFireLane(point,ally.r))continue;
  if(firstSightCover(ally,point,blockers,ally.r+3))continue;
  // Skip the observed hull itself when evaluating the line to its known position.
  const blocked=known&&firstSightCover(point,known,blockers.filter(body=>body!==known.rival),3);
  const distance=known?Math.hypot(point.x-known.x,point.y-known.y):0;
  const score=(known&&!blocked&&distance<=410?600:0)-
   (known?Math.abs(distance-182)*.73:0)-Math.hypot(point.x-ally.x,point.y-ally.y)*.19;
  if(score>best){best=score;goal=point;}
 }
 ally.loosePoint=goal;ally.looseWait=.46;
 return goal;
}
// A stopped pilot gives the lead one stable station, not a sequence of
// patrol waypoints. A blocked path may use a held alternate station.
const leadStationBypasses=[[-88,-106],[88,-106],[-142,-106],[142,-106],[-116,-50],[116,-50]];
function squadronLeadPoint(lead,blockers,dt){
 const margin=lead.r+6,{x,y}=testLeadGuide??launch;
 const station=(dx,dy)=>({x:clamp(x+dx,arena.left+margin,arena.right-margin),
  y:clamp(y+dy,arena.top+margin,arena.bottom-margin)});
 const target=station(0,-106);
 const clear=point=>{
  const dx=point.x-lead.x,dy=point.y-lead.y;
  return blockers.every(body=>{
   const rx=lead.x-body.x,ry=lead.y-body.y,r=body.r+margin;
   const endGap=Math.hypot(point.x-body.x,point.y-body.y);
   // Moving wing slots must not permanently prohibit a clear route;
   // local steering still separates friendly hulls during the approach.
   if(body.craft||body.allyShip)return endGap>r;
   // If reserve circles already overlap, let the lead move outward.
   if(rx*rx+ry*ry<=r*r&&rx*dx+ry*dy>0&&endGap>r)return true;
   return sweptCircle(rx,ry,dx,dy,r)===null;
  });
 };
 const direct=clear(target);
 lead.formationClearFor=direct?Math.min(.35,lead.formationClearFor+dt):0;
 if(direct&&(!lead.formationBypass||lead.formationClearFor>=.35)){
  lead.formationBypass=null;return target;
 }
 if(lead.formationBypass){
  const held=station(...lead.formationBypass);
  if(clear(held))return held;
  lead.formationBypass=null;
 }
 let alternative=null,best=Infinity;
 for(const offset of leadStationBypasses){
  const point=station(...offset);
  if(!clear(point))continue;
  const score=Math.hypot(point.x-target.x,point.y-target.y)+.18*Math.hypot(point.x-lead.x,point.y-lead.y);
  if(score<best){best=score;alternative=offset;}
 }
 lead.formationBypass=alternative;
 return alternative?station(...alternative):direct?target:{x:lead.x,y:lead.y};
}
function emitAllyShot(ally,weapon,angle,heading,mode,target=null){
 const gun=guns[weapon],cost=volleyHe3(gun,ally.fit.sparrowSides);
 if(ally.he3+1e-8<cost)return false;
 ally.he3=Math.max(0,ally.he3-cost);
 if(gun.wingMount){
  ally.lastMuzzles=pairedAim(ally,target,angle,headingDelta(heading,angle)).map(({mount,a,side})=>{
   const u=Math.cos(a),v=Math.sin(a),{x,y}=mount,visual=wingPodVisualStart(ally,mount);
   shots.push({x,y,vx:u*gun.speed,vy:v*gun.speed,a,weapon,damage:gun.damage,ally:true,owner:ally,allyRole:ally.role,allyMode:mode,visual});
   addFlightHeat(mode==='burst'?heatRules.burstShot:heatRules.normalShot,ally);
   ally.vx-=u*gun.recoil*ally.fit.recoilFactor;ally.vy-=v*gun.recoil*ally.fit.recoilFactor;
   burstRing(x+(visual?.x??0),y+(visual?.y??0),gun.muzzle,gun.ring);
   return {side,angle:a};
  });
  capVelocity(ally,Math.min(264,ally.fit.speed+38));ally.muzzleLight=.10;if(isTileBattle())npcBattleShot(ally.x,ally.y,false);return true;
 }
 addFlightHeat(mode==='burst'?heatRules.burstShot:heatRules.normalShot,ally);
 const u=Math.cos(angle),v=Math.sin(angle);
 markFighterMuzzle(ally,angle);
 const mount=fighterMuzzle(ally,heading),{x,y}=mount,visual=wingPodVisualStart(ally,mount);
 shots.push({x,y,vx:u*gun.speed,vy:v*gun.speed,a:angle,weapon,damage:gun.damage,ally:true,owner:ally,allyRole:ally.role,allyMode:mode,...(visual?{visual}:{})});
 ally.vx-=u*gun.recoil*ally.fit.recoilFactor;ally.vy-=v*gun.recoil*ally.fit.recoilFactor;capVelocity(ally,Math.min(264,ally.fit.speed+38));
 ally.muzzleLight=.10;burstRing(x+(visual?.x??0),y+(visual?.y??0),gun.muzzle,gun.ring);
 if(isTileBattle())npcBattleShot(x,y,false);
 return true;
}
function advanceAllyWeapon(ally,dt,target,blockers,steerAim=true){
 ally.he3=Math.min(ally.fit.he3Capacity,ally.he3+ally.fit.he3Rate*dt);
 ally.muzzleLight=Math.max(0,ally.muzzleLight-dt);
 ally.fireWait-=dt;
 const clear=target&&target.hp>0&&(!ally.volley||ally.volley.target===target)&&!firstSightCover(ally,target,blockers,3);
 if(!clear){
  if(ally.volley){ally.fireWait=Math.max(0,ally.fireWait)+ally.volley.profile.recovery;ally.volley=null;}
  else ally.fireWait=Math.max(0,ally.fireWait);
  if(steerAim){if(!target&&Math.hypot(ally.vx,ally.vy)>28)queueHeading(ally,Math.atan2(ally.vy,ally.vx));advanceHeading(ally,dt);}
  ally.normalGroup=0;return;
 }
 const desired=bearing(ally,target),distance=Math.hypot(target.x-ally.x,target.y-ally.y);
 if(!ally.volley&&steerAim){queueHeading(ally,desired);advanceHeading(ally,dt);}
 const heading=ally.aim;
 if(ally.fireWait>1e-9)return;
 const volley=ally.volley;
 if(volley){
  const {profile,weapon,angle}=volley,gun=guns[weapon];
  const shotAngle=angle+profile.pattern[volley.index]*gun.burstSpread*degrees;
  if(!emitAllyShot(ally,weapon,shotAngle,heading,'burst',target)||++volley.index>=profile.pattern.length){
   ally.fireWait=profile.recovery;ally.volley=null;
  }else ally.fireWait+=profile.interval;
  return;
 }
 if(!noseReady(ally,desired)){ally.fireWait=0;return;}
 // Prefer the first fitted gun that can afford its intended firing mode.
 // A partly charged Sterling should not leave a loaded secondary idle.
 let weapon=null,wantsBurst=false,fallback=null;
 for(const id of ally.fit.weapons){
  const option=guns[id],charge=volleyHe3(option,ally.fit.sparrowSides);
  const burst=!ally.fit.singleOnly&&(option.burstOnly||distance<=(ally.fit.preferredBurst[id]?190:145));
  const rounds=(option.burst??normalBurst).pattern.length;
  if((burst||option.normalInterval)&&ally.he3+1e-8>=charge*(burst?rounds:1)){
   weapon=id;wantsBurst=burst;break;
  }
  if(!fallback&&!option.burstOnly&&option.normalInterval&&ally.he3+1e-8>=charge)fallback=id;
 }
 weapon??=fallback;
 if(!weapon){ally.fireWait=0;return;}
 const gun=guns[weapon],profile=gun.burst??normalBurst;
 if(wantsBurst){
  ally.normalGroup=0;
  if(emitAllyShot(ally,weapon,heading+profile.pattern[0]*gun.burstSpread*degrees,heading,'burst',target)){
   addFlightHeat(heatRules.burstActivation,ally);
   ally.volley={weapon,profile,index:1,angle:heading,target};ally.fireWait=profile.interval;
  }
 }else if(gun.normalInterval){
  if(ally.normalWeapon!==weapon){ally.normalWeapon=weapon;ally.normalIndex=ally.normalGroup=0;}
  const spread=normalPattern[ally.normalIndex++%normalPattern.length]*gun.normalSpread*degrees;
  if(emitAllyShot(ally,weapon,heading+spread,heading,'normal',target)){
   // A repeat weapon takes short pairs at its true shot interval. Aiming
   // between these pairs / single taps keeps the allies from holding fire forever.
   const repeat=!ally.fit.singleOnly&&gun.holdRepeat&&++ally.normalGroup<2;
   ally.fireWait=repeat?gun.normalInterval:Math.max(gun.normalInterval,.52);
   if(!repeat)ally.normalGroup=0;
  }
 }
}
const bifrostAttackRange=465;
function bifrostFleetContacts(rivals,obstacles){
 const allies=livingAllies(),cover=[...obstacles,...rivals,...allies];
 if(state!=='watch')cover.push(p);
 return rivals.filter(target=>allies.some(ally=>Math.hypot(target.x-ally.x,target.y-ally.y)<=bifrostAttackRange+55&&
  !firstSightCover(ally,target,cover,3)));
}
function bifrostCoverHeading(ship,threat){
 let best=null,distance=260;
 for(const rock of asteroids){
  const angle=bearing(threat,rock),reach=rock.r+ship.r+26;
  const point={x:rock.x+Math.cos(angle)*reach,y:rock.y+Math.sin(angle)*reach};
  const gap=Math.hypot(ship.x-point.x,ship.y-point.y);
  if(gap<32||gap>=distance||!safeSearchLeg(ship,ship,point,asteroids)||
     firstSightCover(point,threat,asteroids)!==rock)continue;
  if(Math.hypot(point.x-threat.x,point.y-threat.y)<Math.hypot(ship.x-threat.x,ship.y-threat.y)-30)continue;
  best=point;distance=gap;
 }
 return best?bearing(ship,best):null;
}
// Forecast relative motion, not just where the freighter is now: a
// committed Hammerhead charge can close faster than a nose-mounted ray.
function bifrostHullThreat(ally,vx,vy,horizon=.82){
 let threat=null,first=Infinity;
 for(const ship of pirateCapitals)if(ship.hp>0){
  const dx=(vx-(ship.vx??0))*horizon,dy=(vy-(ship.vy??0))*horizon;
  for(const part of ship.pieces){
   const t=sweptCircle(ally.x-part.x,ally.y-part.y,dx,dy,ally.r+part.r+17);
   if(t!==null&&t<first){first=t;threat=ship;}
  }
 }
 return threat;
}
function bifrostSidestep(ally,ship,side){
 const angle=bearing(ally,ship),wing=ally===testLead?wingman:testLead;
 for(const turn of [side*1.48,-side*1.48,side*2.1,-side*2.1,Math.PI]){
  const aim=angle+turn,vx=Math.cos(aim)*125,vy=Math.sin(aim)*125,point={x:ally.x+vx*.75,y:ally.y+vy*.75};
  if(point.x<arena.left+38||point.x>arena.right-38||point.y<arena.top+38||point.y>arena.bottom-38||
     firstSightCover(ally,point,asteroids,ally.r+12)||bifrostHullThreat(ally,vx,vy)||
     (wing?.hp>0&&sweptCircle(ally.x-wing.x,ally.y-wing.y,(vx-wing.vx)*.72,(vy-wing.vy)*.72,ally.r+wing.r+12)!==null))continue;
  return aim;
 }
 return angle+Math.PI;
}
// Bifrost flies through a firing lane, banks away, then comes around for
// another run. A target lost during the pull-out does not stop the fighter.
function flyBifrostPass(ally,dt,blockers,contacts=[]){
 const watching=state==='watch';
 const nearest=contacts.reduce((best,rival)=>!best||Math.hypot(ally.x-rival.x,ally.y-rival.y)<Math.hypot(ally.x-best.x,ally.y-best.y)?rival:best,null);
 const {side=ally.role==='lead'?1:-1}=ally.crossPass??{};
 const pass=ally.crossPass??={phase:'inbound',side,count:0};
 const standOff=updateFleetPressure(ally,livingAllies(),contacts,dt);
 if(pass.phase==='inbound'&&!contacts.includes(pass.target))pass.target=nearest;
 const target=pass.target;
 if(pass.phase==='inbound'&&target&&!standOff){
  const gap=Math.hypot(target.x-ally.x,target.y-ally.y);
  if(gap>=145&&gap<=bifrostAttackRange){
   pass.phase='run';pass.age=0;pass.wide=(pass.count+++(ally.role==='lead'?0:1))%2!==0;
   const heading=bearing(ally,target),lane=pass.wide?122:82;
   const point=side=>({x:target.x-Math.sin(heading)*side*lane,y:target.y+Math.cos(heading)*side*lane});
   const cost=p=>Math.hypot(p.x-clamp(p.x,arena.left+58,arena.right-58),p.y-clamp(p.y,arena.top+58,arena.bottom-58));
   if(cost(point(-pass.side))+4<cost(point(pass.side)))pass.side*=-1;
   const gate=point(pass.side);
   pass.heading=bearing(ally,gate);pass.runLength=Math.hypot(gate.x-ally.x,gate.y-ally.y)*.86;
   pass.runSeconds=clamp(pass.runLength/114,2.9,3.55);
   pass.startX=ally.x;pass.startY=ally.y;
  }
 }
 let aim,attack=null;
 if(pass.phase==='run'){
  aim=pass.heading;pass.age+=dt;
  const progress=(ally.x-pass.startX)*Math.cos(aim)+(ally.y-pass.startY)*Math.sin(aim);
  if(progress>=pass.runLength||pass.age>(pass.runSeconds??2.9)){
   pass.phase='bank';pass.age=0;pass.startX=ally.x;pass.startY=ally.y;
  }else if(target?.hp>0&&Math.hypot(target.x-ally.x,target.y-ally.y)<=bifrostAttackRange&&
    Math.abs(headingDelta(aim,bearing(ally,target)))<.69&&
    !firstSightCover(ally,target,blockers,3))attack=target;
 }else if(pass.phase==='bank'){
  pass.age+=dt;
  aim=pass.heading+pass.side*Math.min(2.7,pass.age*(pass.wide?.75:1.08));
  const traveled=Math.hypot(ally.x-pass.startX,ally.y-pass.startY);
  const bankTime=pass.wide?3.1:2.35,exitDistance=pass.wide?180:136;
  if(pass.age>bankTime&&(traveled>exitDistance||pass.age>bankTime+.65)){
   pass.phase='inbound';pass.side*=-1;pass.target=null;
  }
 }else if(standOff){
  aim=bifrostCoverHeading(ally,standOff)??fleetStandOffHeading(ally,standOff,pass.side,ally.r+64);
 }else if(target){
  const close=Math.hypot(target.x-ally.x,target.y-ally.y)<145;
  aim=bearing(ally,target)+(close?pass.side*2.15:0);
 }else{
  const center={x:W*.5,y:(arena.top+arena.bottom)/2},distance=Math.hypot(center.x-ally.x,center.y-ally.y);
  aim=distance>140?bearing(ally,center):Math.atan2(ally.vy,ally.vx)+pass.side*.7;
 }
 const threat=bifrostHullThreat(ally,ally.vx,ally.vy);
 if(threat&&(pass.phase==='run'||threat.ram?.goal)){
  if(pass.phase==='run'){pass.phase='bank';pass.age=0;pass.startX=ally.x;pass.startY=ally.y;}
  if(!pass.escape||elapsed>=pass.escape.until){
   pass.escape={aim:bifrostSidestep(ally,threat,ally===testLead?1:-1),until:elapsed+.62};
  }
 }
 const escaping=pass.escape&&elapsed<pass.escape.until;
 if(escaping){aim=pass.escape.aim;attack=null;}
 const keepClear=[...blockers,...pirateCapitals.flatMap(ship=>ship.pieces)];
 const edgePad=ally.r+64;
 const edgeX=clamp((arena.left+edgePad-ally.x)/45,0,1)-clamp((ally.x-arena.right+edgePad)/45,0,1);
 const edgeY=clamp((arena.top+edgePad-ally.y)/45,0,1)-clamp((ally.y-arena.bottom+edgePad)/45,0,1);
 const dx=Math.cos(aim)+edgeX*1.6,dy=Math.sin(aim)+edgeY*1.6,course=Math.atan2(dy,dx);
 const shotDelta=attack?headingDelta(course,bearing(ally,attack)):0;
 queueHeading(ally,course+clamp(shotDelta,-.44,.44));advanceHeading(ally,dt);
 const nx=Math.cos(ally.aim),ny=Math.sin(ally.aim);
 const clear=()=>!firstSightCover(ally,{x:ally.x+nx*70,y:ally.y+ny*70},keepClear,ally.r+5);
 const boosting=!escaping&&pass.phase==='run'&&pass.age<1.8&&ally.he3>=.85*dt&&
  !bifrostHullThreat(ally,nx*155,ny*155,.74)&&
  Math.abs(headingDelta(course,ally.aim))<.58&&clear();
 pass.exhaust=clamp((pass.exhaust??0)+(boosting?6:-5)*dt,0,1);
 const pace=pass.phase==='bank'?(pass.wide?104:90):watching?105:120;
 if(boosting){
  ally.he3-=.85*dt;
  const speed=ally.vx*nx+ally.vy*ny,forward=clamp(speed+172*dt,0,ally.fit.speed*1.12);
  const blend=Math.min(1,dt*6.2);
  ally.vx+=(nx*speed-ally.vx)*blend+nx*(forward-speed);
  ally.vy+=(ny*speed-ally.vy)*blend+ny*(forward-speed);
 }else steerAroundVandulCover(ally,dx,dy,keepClear,escaping?130:Math.min(pace,ally.fit.speed),escaping?16500:watching?1850:1650,dt);
 ally.x+=ally.vx*dt;ally.y+=ally.vy*dt;wall(ally);
 const spin=ally.impactTumble?.angle??0;
 advanceAllyWeapon(ally,dt,Math.abs(headingDelta(0,spin))>.45?null:attack,blockers,false);
}
function corsairWingOffset(ally){
 const a=ally.formationHeading+Math.PI/2,u=Math.cos(a),v=Math.sin(a),slot=ally.formation;
 return {x:u*slot.followX-v*slot.followY,y:v*slot.followX+u*slot.followY};
}
function placeCorsairWingman(ally,heading){
 ally.formationHeading=heading;
 const offset=corsairWingOffset(ally),margin=ally.r+5;
 ally.x=clamp(p.x+offset.x,arena.left+margin,arena.right-margin);
 ally.y=clamp(p.y+offset.y,arena.top+margin,arena.bottom-margin);
 ally.prevX=ally.x;ally.prevY=ally.y;ally.aim=heading;ally.vx=p.vx;ally.vy=p.vy;ally.aimGoal=null;
}
function inPlayerFireLane(point,radius){
 const ux=Math.cos(p.aim),uy=Math.sin(p.aim),dx=point.x-p.x,dy=point.y-p.y,forward=dx*ux+dy*uy;
 return forward>0&&forward<240&&Math.abs(-dx*uy+dy*ux)<radius+18;
}
function flyWingman(ally,dt,obstacles,rivals,contacts){
 if(!ally?.hp)return;
 advanceFlightHeat(dt,ally);
 ally.prevX=ally.x;ally.prevY=ally.y;ally.hitGlow=Math.max(0,ally.hitGlow-dt);
 const blockers=state==='watch'?[...obstacles,...rivals]:[...obstacles,...rivals,p];
 blockers.push(...livingAllies().filter(mate=>mate!==ally));
 if(ally.corsairWing&&capitalShip)blockers.push(...capitalShip.hull);
 if(isCrossBattleArena()){flyBifrostPass(ally,dt,blockers,contacts);return;}
 let target=null,closest=410;
 for(const rival of rivals){
  const distance=Math.hypot(rival.x-ally.x,rival.y-ally.y);
  if(distance<closest&&(!firstSightCover(ally,rival,blockers,3)||thermalContact(ally,rival))){target=rival;closest=distance;}
 }
 // Hold the saved mission-north offset without orbiting as the player aims.
 const margin=ally.r+5,slot=ally.formation,anchor=ally===wingman&&testLead?.hp>0?testLead:p;
 const testWing=!!ally.formationTestOrder;
 if(testWing)ally.formationHeading+=headingDelta(ally.formationHeading,p.aim)*(1-Math.exp(-8*dt));
 const offset=ally.corsairWing?corsairWingOffset(ally):{x:slot.followX,y:slot.followY};
 const mirror=!testWing&&((offset.x>0&&anchor.x>arena.right-88)||(offset.x<0&&anchor.x<arena.left+88));
 const x=clamp(anchor.x+(mirror?-offset.x:offset.x)+anchor.vx*.13,arena.left+margin,arena.right-margin);
 const y=clamp(anchor.y+(!testWing&&anchor.y>arena.bottom-68?(ally.corsairWing?-Math.abs(offset.y):-slot.bottomY):offset.y)+anchor.vy*.13,arena.top+margin,arena.bottom-margin);
 const loose=wingmanOrder==='loose';
 const point=loose?looseWingmanPoint(ally,dt,target,blockers,rivals):ally===testLead?squadronLeadPoint(ally,blockers,dt):null;
 let vx=((point?.x??x)-ally.x)*3.8,vy=((point?.y??y)-ally.y)*3.8;
 if(testWing&&inPlayerFireLane(ally,ally.r)){
  const ux=Math.cos(p.aim),uy=Math.sin(p.aim),side=-uy*(ally.x-p.x)+ux*(ally.y-p.y);
  const direction=Math.abs(side)>6?Math.sign(side):Math.sign(slot.followX)||1;
  vx-=uy*direction*155;vy+=ux*direction*155;
 }
 for(const body of blockers){
  const dx=ally.x-body.x,dy=ally.y-body.y,d=Math.hypot(dx,dy),gap=body.r+ally.r+17;
  if(d>1e-4&&d<gap){const away=(gap-d)*7/d;vx+=dx*away;vy+=dy*away;}
 }
 const pursuitCap=Math.max(128,Math.min(264,ally.fit.speed+38));
 const limit=ally===testLead&&!loose&&Math.hypot(p.x-ally.x,p.y-ally.y)<155?Math.min(94,ally.fit.speed):pursuitCap;
 const speed=Math.hypot(vx,vy),scale=speed>limit?limit/speed:1;
 const response=1-Math.exp(-9*dt);
 const dx=(vx*scale-ally.vx)*response,dy=(vy*scale-ally.vy)*response;
 const driving=speed*scale>ally.fit.speed*.70&&dx*ally.vx+dy*ally.vy>0;
 applySteeringCorrection(ally,dx,dy,ally.fit.speed,driving);
 ally.x+=ally.vx*dt;ally.y+=ally.vy*dt;
 if(loose){
  const dx=ally.x-p.x,dy=ally.y-p.y,distance=Math.hypot(dx,dy);
  if(distance>wingmanLeash){
   const u=dx/distance,v=dy/distance,outward=(ally.vx-p.vx)*u+(ally.vy-p.vy)*v;
   ally.x=p.x+u*wingmanLeash;ally.y=p.y+v*wingmanLeash;
   if(outward>0){ally.vx-=outward*u;ally.vy-=outward*v;}
  }
 }
 wall(ally);
 advanceAllyWeapon(ally,dt,target,blockers);
}
function applyDirectionalThrust(dt,moveX,moveY,length,mainDrive=false){
 const ux=Math.cos(p.aim),uy=Math.sin(p.aim),sx=-uy,sy=ux;
 const forward=clamp((moveX*ux+moveY*uy)/length,-1,1),side=clamp((moveX*sx+moveY*sy)/length,-1,1);
 const throttle=Math.min(1,length);
 if(mainDrive){
  const push=p.acceleration*dt*throttle;
  const n=forward*(forward<0?flightEnvelope.reverseThrust:1)*push,s=side*flightEnvelope.strafeThrust*push;
  const ceiling=Math.max(p.speed,Math.hypot(p.vx,p.vy));
  applySteeringCorrection(p,n*ux+s*sx,n*uy+s*sy,p.speed,true);
  capVelocity(p,ceiling);
  return;
 }
 const top=p.speed*Math.hypot(forward*(forward<0?flightEnvelope.reverse:1),side*flightEnvelope.strafe);
 const previousSpeed=Math.hypot(p.vx,p.vy);
 const noseSpeed=p.vx*ux+p.vy*uy,sideSpeed=p.vx*sx+p.vy*sy;
 const trim=(current,target,command,thrust,drag)=>{
  const nudged=current+clamp(target-current,-thrust,thrust);
  const coasting=current*Math.exp(-p.brakeDamping*drag*dt);
  // Blend trim in smoothly across aim changes near a pure side / forward input.
  return coasting+(nudged-coasting)*Math.min(1,Math.abs(command)*4);
 };
 const forwardV=trim(noseSpeed,forward*top*throttle,forward,p.acceleration*dt*(forward<0?flightEnvelope.reverseThrust:1),flightEnvelope.noseTrim);
 const maxSide=Math.sqrt(Math.max(0,p.speed*p.speed-forwardV*forwardV));
 const sideV=trim(sideSpeed,clamp(side*top*throttle,-maxSide,maxSide),side,p.acceleration*dt*flightEnvelope.strafeThrust,flightEnvelope.sideTrim);
 const nextX=forwardV*ux+sideV*sx,nextY=forwardV*uy+sideV*sy;
 const changeX=nextX-p.vx,changeY=nextY-p.vy,change=Math.hypot(changeX,changeY);
 // A diagonal can't stack two trim actuators into more than the rated
 // single trim thrust; the stronger main thruster is rated separately.
 const fraction=change>0?Math.min(1,p.acceleration*dt/change):0;
 applySteeringCorrection(p,changeX*fraction,changeY*fraction,p.speed);
 // Thrust cannot manufacture speed above the fitted cap; real recoil or
 // collisions may carry the craft faster, and are allowed to decay naturally.
 const ceiling=Math.max(p.speed,previousSpeed);
 capVelocity(p,ceiling);
}
const mainThrustRules=Object.freeze({push:6,coast:.4,settle:8});
function applyMainThrust(dt,boosted=false){
 const ux=Math.cos(p.aim),uy=Math.sin(p.aim),speed=Math.hypot(p.vx,p.vy);
 const forward=p.vx*ux+p.vy*uy;
 const top=boosted?Math.min(surgeRules.maxSpeed,p.speed*surgeRules.speed):p.speed;
 const push=clamp(top-forward,0,p.acceleration*mainThrustRules.push*dt*(boosted?1.6:1));
 p.vx+=ux*push;p.vy+=uy*push;
 capVelocity(p,boosted?top:Math.max(top,speed));
 p.mainMomentum=true;
}
const formationScout=Object.freeze({idleDelay:.65,speed:42,sight:355,trailMax:82});
function advanceFormationScout(dt,manual){
 const guide=testLeadGuide,lead=testLead,slot=testPlayerSlot;
 if(!guide)return;
 guide.scouting=false;
 if(manual||wingmanOrder!=='formation'||!lead?.hp||duelResult||!p.hp){guide.idle=0;guide.bypassX=guide.bypassAtY=null;return;}
 guide.idle=Math.min(formationScout.idleDelay,guide.idle+dt);
 if(guide.idle<formationScout.idleDelay)return;
 const rivals=activeVanduls(),group=livingAllies();group.push(p);
 // Contact pauses the guide; it never redirects it to an enemy coordinate.
 // A brief fresh idle interval prevents repeated stop-start at a cover edge.
 const nearby=rivals.filter(rival=>group.some(view=>Math.hypot(view.x-rival.x,view.y-rival.y)<=formationScout.sight));
 const blockers=visionBlockers();
 if(nearby.length){
  const sight=[...blockers,p];
  if(nearby.some(rival=>group.some(view=>Math.hypot(view.x-rival.x,view.y-rival.y)<=formationScout.sight&&
   firstSightCover(view,rival,sight)===null))){guide.idle=0;return;}
 }
 const playerLag=Math.hypot(p.x-lead.x-slot.followX,p.y-lead.y-slot.followY);
 if(playerLag>formationScout.trailMax||lead.y>guide.y-106+70)return;
 const forwardSlot=Math.max(0,-slot.followY,-(wingman?.hp>0?wingman.formation.followY:0));
 const limit=arena.top+lead.r+9+106+forwardSlot;
 if(guide.y<=limit)return;
 const solid=blockers.filter(body=>!body.allyShip);
 const lanesClear=(side,north,shift=0)=>group.every(body=>{
  const x=body.x+shift,y=body.y;
  if(x+side<arena.left+body.r+4||x+side>arena.right-body.r-4||y+north<arena.top+body.r+4)return false;
  return solid.every(other=>{
   const rx=x-other.x,ry=y-other.y,r=body.r+other.r+3;
   if(rx*rx+ry*ry<=r*r&&rx*side+ry*north>0&&Math.hypot(rx+side,ry+north)>r)return true;
   return sweptCircle(rx,ry,side,north,r)===null;
  });
 });
 if(guide.bypassX!==null){
  const difference=guide.bypassX-guide.x;
  if(Math.abs(difference)>.01){
   const travel=Math.sign(difference)*Math.min(14,Math.abs(difference));
   if(lanesClear(travel,0)){
    guide.x+=Math.sign(difference)*Math.min(Math.abs(difference),formationScout.speed*.8*dt);guide.scouting=true;
   }
   return;
  }
  if(Math.abs(lead.x-guide.x)>14||Math.abs(p.x-lead.x-slot.followX)>18||
   wingman?.hp>0&&Math.abs(wingman.x-lead.x-wingman.formation.followX)>20)return;
  guide.bypassX=null;
 }
 let pace=formationScout.speed;
 if(!lanesClear(0,-32)){
  // A little local lookahead lets the whole formation change lanes,
  // but do not move the guide through a tight slot or remote cover.
  if(guide.bypassAtY===null||guide.y<guide.bypassAtY-8)
   for(const distance of [46,70,96,124])for(const side of [-1,1]){
   const shift=distance*side;
   if(lanesClear(shift,0)&&lanesClear(0,-64,shift)){
    guide.bypassX=guide.x+shift;guide.bypassAtY=guide.y;return;
   }
  }
  if(!lanesClear(0,-12))return;
  pace*=.55;
 }
 guide.y=Math.max(limit,guide.y-pace*dt);guide.scouting=true;
}
function formationAssistVelocity(){
 if(!testPlayerSlot||!testLead?.hp||wingmanOrder!=='formation'||duelResult||!p.hp)return null;
 const slot=testPlayerSlot,lead=testLead,margin=p.r+7;
 const x=clamp(lead.x+slot.followX,arena.left+margin,arena.right-margin);
 const y=clamp(lead.y+slot.followY,arena.top+margin,arena.bottom-margin);
 const dx=x-p.x,dy=y-p.y;
 if(Math.hypot(dx,dy)<5&&Math.hypot(lead.vx,lead.vy)<5&&Math.hypot(p.vx,p.vy)<7)return null;
 const vx=lead.vx+dx*2.6,vy=lead.vy+dy*2.6,speed=Math.hypot(vx,vy);
 const limit=Math.min(148,p.speed*.72),scale=speed>limit?limit/speed:1;
 const point={x:p.x+vx*scale*.37,y:p.y+vy*scale*.37};
 const blockers=visionBlockers();
 for(const body of blockers){
  const rx=p.x-body.x,ry=p.y-body.y,r=body.r+p.r+3;
  if(rx*rx+ry*ry<=r*r&&rx*vx+ry*vy>=0)continue;
  if(sweptCircle(rx,ry,point.x-p.x,point.y-p.y,r)!==null)
   return Math.hypot(p.vx,p.vy)>7?{x:0,y:0}:null;
 }
 return {x:vx*scale,y:vy*scale};
}
function applyFormationAssist(dt,velocity){
 const dx=velocity.x-p.vx,dy=velocity.y-p.vy,gap=Math.hypot(dx,dy);
 if(!gap)return;
 const scale=Math.min(1,p.acceleration*.25*dt/gap);
 applySteeringCorrection(p,dx*scale,dy*scale,p.speed);
}
function stepWatchAfterPilot(dt){
 const obstacles=[...cones,...asteroids,...sceneryDebris];
 if(redGrinConvoy){
  advanceRedGrinConvoy(redGrinConvoy,dt);
  advanceConvoyRaider(pirateCapitals[0],dt,obstacles);
  sweepProjectiles(dt,obstacles,obstacles);
  finishRedGrinEscort(redGrinConvoy);
  return;
 }
 if(flightMode.redGrinSolo)advanceRedGrinSolo(pirateCapitals[0],dt,obstacles);
 else for(const ship of activeVanduls()){
  ship.prevX=ship.x;ship.prevY=ship.y;
  ship.x+=ship.vx*dt;ship.y+=ship.vy*dt;wall(ship);advanceHeading(ship,dt);
 }
 advanceFighterTumbles(dt);
 if(elapsed-simDirector.pilotDownAt<3.5)return;
 duelResult='lost';state='complete';syncArrivalControls();stopArenaMusic();clearInput();
 if(flightMode.redGrinSolo)showRedGrinDebrief(false);
 else{
  menu('AI fighter disabled','The simulated run has ended. No progress was saved.','reset','Watch again','SIMULATOR DEBRIEF');
  overlay.innerHTML+=button('Return to Hangar','main-menu');
  overlay.querySelector('button')?.focus({preventScroll:true});
 }
}
function physics(dt,moveX,moveY,powered,mainThrust,assist,boosted=false){
 if(flightMode.simWatch&&fighterBattle){stepFighterBattle(dt);return 0;}
 if(flightMode.simWatch&&simDirector?.pilotDown){stepWatchAfterPilot(dt);return 0;}
 if(scaleFlyShips?.parked){p.vx=p.vy=0;return 0;}
 if(fighterBattle?.phase==='docked'||fighterBattle?.repairAt!=null){p.vx=p.vy=0;stepFighterBattle(dt);return 0;}
 if(!duelResult&&isCrossBattleArena())advanceBifrostArrival(dt);
 const rivals=activeVanduls();
 if(rivals.length||pirateCapitals.length||fighterBattle){p.prevX=p.x;p.prevY=p.y;}
 const length=Math.hypot(moveX,moveY);
 p.mainThrustActive=powered&&mainThrust;
 if(p.mainThrustActive){
  applyMainThrust(dt,boosted);
  if(length)applyDirectionalThrust(dt,moveX,moveY,length,true);
 }else{
  if(powered&&length)applyDirectionalThrust(dt,moveX,moveY,length);
  else if(powered&&assist)applyFormationAssist(dt,assist);
  else{
   const fade=Math.exp(-p.brakeDamping*(p.mainMomentum?mainThrustRules.coast:1)*dt);
   p.vx*=fade;p.vy*=fade;
  }
  if(p.mainMomentum&&Math.hypot(p.vx,p.vy)<=mainThrustRules.settle)p.mainMomentum=false;
 }
 const travelY=p.vy*dt;
 p.x+=p.vx*dt;p.y+=travelY;p.wallFx=Math.max(0,p.wallFx-dt);
 p.impactCooldown=Math.max(0,p.impactCooldown-dt);wall(p,!fighterBattle&&!scaleFlyShips&&!capitalShip&&!escortShip);
 if(scaleFlyShips){
  const permitted=new Set(scaleFlyShips.pads.filter(pad=>scaleFlyApproach(pad,p)).map(pad=>pad.group));
  for(const [i,hull] of scaleFlyShips.hulls.entries())if(!permitted.has(i))for(const part of hull)contact(p,part,false);
  wall(p);updateScaleFlyLandingHud();
 }
 if(state!=='play')return;
 if(fighterBattle){stepFighterBattle(dt);return travelY;}
 let fleetCorvette=null;
 if(capitalShip||escortShip){
  if(capitalShip){updateCapital(dt);resolveDeckTrafficContacts(capitalShip,dt);}else advanceCourseShip(escortShip,escortCourse,escortSections,dt);
  const hull=capitalShip?.supportFleet?[...capitalShip.hull,...capitalShip.supportFleet.hull]:(capitalShip??escortShip).hull;
  for(let pass=0;pass<3;pass++)for(const piece of hull)contact(p,piece,false);
  wall(p);
  fleetCorvette=capitalShip&&advanceFleetResolute(capitalShip,dt);
  if(state!=='play')return travelY;
 }
 if(testLeadGuide&&wingmanOrder==='formation'&&(mainThrust||length))updateTestLeadGuide();
 const obstacles=asteroids.length||sceneryDebris.length?[...cones,...asteroids,...sceneryDebris]:cones,bodies=rivals.length?[...obstacles,...rivals]:obstacles;
 if(rivals.length){
  const blockers=visionBlockers(obstacles);
  for(const rival of rivals){
   steerVandul(rival,dt,blockers);
   const guess=rival.blindShot??(!rival.seesTarget?rival.laserBurst?.guess:null);
   if(guess)queueHeading(rival,bearing(rival,guess.target));
   advanceHeading(rival,dt);
  }
 }
 for(const c of bodies){
  c.prevX=c.x;c.prevY=c.y;c.wallFx=Math.max(0,c.wallFx-dt);c.hitGlow=Math.max(0,c.hitGlow-dt);
  const fade=Math.exp(-(c.asteroid?3.3:1.45)*dt);c.vx*=fade;c.vy*=fade;c.spin*=Math.exp(-(c.asteroid?3.15:1.60)*dt);
  if(c.asteroid){
   capVelocity(c,42);c.spin=clamp(c.spin,-.62,.62);
   if(Math.hypot(c.vx,c.vy)<.04)c.vx=c.vy=0;
   if(Math.abs(c.spin)<.004)c.spin=0;
  }
  c.x+=c.vx*dt;c.y+=c.vy*dt;c.angle=(c.angle+c.spin*dt)%TAU;wall(c);
 }
 for(let pass=0;pass<3;pass++){
  for(const c of bodies)contact(p,c,pass===0);
  for(let i=0;i<bodies.length;i++)for(let j=i+1;j<bodies.length;j++)contact(bodies[i],bodies[j],pass===0);
  wall(p);for(const c of bodies)wall(c);
 }
 const cross=isCrossBattleArena(),wingTargets=cross||wingman?.corsairWing&&flightMode.id===corsairTileTest.id?pirateCapitals.filter(ship=>ship.hp>0):rivals;
 const contacts=cross?bifrostFleetContacts(wingTargets,obstacles):null;
 if(testLead?.hp>0)flyWingman(testLead,dt,obstacles,wingTargets,contacts);
 if(wingman?.hp>0)flyWingman(wingman,dt,obstacles,wingTargets,contacts);
 for(const escort of formationEscorts)if(escort.hp>0)flyWingman(escort,dt,obstacles,wingTargets,contacts);
 if(isTileBattle())for(const ally of livingAllies())pushLooseFlightBodies(ally,obstacles);
 if(activeWrecks.length)stepWreckage(dt,bodies);
 advanceBattleResolute(dt,obstacles);
 if(redGrinConvoy){
  advanceRedGrinConvoy(redGrinConvoy,dt);
  if(redGrinConvoy.hp>0)contact(p,{x:redGrinConvoy.x,y:redGrinConvoy.y,r:redGrinConvoy.r,vx:0,vy:(redGrinConvoy.y-redGrinConvoy.prevY)/dt,spin:0,invMass:0,craft:true},false);
 }
 if(redGrinConvoy)advanceConvoyRaider(pirateCapitals[0],dt,obstacles);
 else if(flightMode.redGrinSolo)advanceRedGrinSolo(pirateCapitals[0],dt,obstacles);else advanceBlackwakeFleet(dt,obstacles);
 advanceFighterTumbles(dt);
 if(!pirateCapitals.length&&!battleResolute()?.hp){
  const allies=livingAllies();
  for(let i=0;i<allies.length;i++){
   contact(p,allies[i],false);
   for(let j=i+1;j<allies.length;j++)contact(allies[i],allies[j],false);
  }
 }
 if(fleetCorvette)resolveTileShipContacts(fleetCorvette);
 else if(pirateCapitals.length||battleResolute()?.hp>0)resolveTileShipContacts();
 if(state!=='play')return travelY;
 for(const a of asteroids){capVelocity(a,42);a.spin=clamp(a.spin,-.62,.62);}
 advanceResoluteGun(dt,battleResolute()?[...rivals,...pirateCapitals]:rivals,obstacles);
 sweepProjectiles(dt,bodies,obstacles,fleetCorvette);
 if(redGrinConvoy)finishRedGrinEscort(redGrinConvoy);
 if(state==='play')fireVandulLasers(dt);
 return travelY;
}
function simulate(dt){
 const watching=!!flightMode.simWatch,move=watching?null:liveTrim(),boosted=!watching&&!fleetReturnAuto&&surgeActive(),mainThrust=!watching&&!fleetReturnAuto&&(holdsMainThrust()||boosted);
 const x=watching||fleetReturnAuto?0:move?.x??(Number(has('KeyD'))-Number(has('KeyA'))),y=watching||fleetReturnAuto?0:move?.y??(Number(has('KeyS'))-Number(has('KeyW')));
 const manual=mainThrust||!!(x||y);
 if(testLeadGuide&&dt>0){
  if(!holdsPhysicalThrust())resetReleasedThrust();
  else if(!testThrustLatched&&wingmanOrder==='formation'&&canCommandWingman()){
   testThrustHeld+=dt;
   if(testThrustHeld>=.18-1e-8){testThrustLatched=true;setWingmanOrder('loose');}
  }
 }
 for(const input of [movePtr,thrustPtr,moveKey])if(input)input.held+=dt;
 if(movePulse){movePulse.left-=dt;if(movePulse.left<=0){movePulse=null;paintMove();}}
 if(dt>0){
  const steps=Math.ceil(dt/.009),step=dt/steps;
  for(let i=0;i<steps&&state==='play';i++){
   advanceHeading(p,step);
   advanceFormationScout(step,manual);
   if(manual&&fighterBattle?.retreat)fighterBattle.retreat=false;
   const assist=watching?watchPilotVector(step):fighterBattle?.retreat?fighterCrossRetreatVelocity():fleetReturnAuto?fleetReturnVelocity():escortShip?escortAssistVelocity(manual):!manual&&formationAssistVelocity();
   const powered=!hangarDialog?.open&&simulateFlightPower(step,manual||!!assist);
   const fromX=p.x,fromY=p.y,oldGate=sortieGateY();
   const crossTile=pendingCarrierSortie?.approach,oldTileGate=crossTile?tileGate(crossTile.exitEdge):null;
   beginShieldPower();
   const travelY=physics(step,x,y,powered,mainThrust,assist,boosted);endShieldPower(step);shieldClock+=step;
   if(fleetReturnAuto&&nearFleetReturn(fleetReturnGate())){joinBattleFleet();break;}
   if(rangeTargets.length&&flightMode.loaner&&capitalShip?.phase==='flight'){
    rangeClock+=step;
    let respawned=false;
    for(const target of rangeTargets)if(target.cleared&&rangeClock+1e-8>=target.respawnAt){
     target.cleared=false;delete target.respawnAt;respawned=true;
    }
    if(respawned)updateCustomRange();
   }
   const sortie=pendingCarrierSortie;
   if(sortie&&!sortie.failed&&capitalShip?.phase==='flight'){
    if(sortie.mode.tileTest){
     const gate=oldTileGate&&tileGate(crossTile.exitEdge);
     if(gate){
      const [dx,dy]=gate.vector,prior=gate.axis==='x'?fromX:fromY;
      const input=powered&&(x*dx+y*dy>.08||mainThrust&&(Math.cos(p.aim)*dx+Math.sin(p.aim)*dy)>.08);
      if(input)sortie.piloted=true;
      advanceResoluteDeparture(sortie,step);
      const outbound=(p[gate.axis]-prior)*gate.sign>1e-4;
      if(sortie.piloted&&outbound&&(p[gate.axis]-gate.line)*gate.sign>=0&&((prior-oldTileGate.line)*gate.sign<0||input)){
       transferCarrierSortie(sortie);break;
      }
     }
     continue;
    }
    const southInput=powered&&(y>0||mainThrust&&Math.sin(p.aim)>.08);
    if(southInput)sortie.piloted=true;
    // Even after a prior south command, a moving gate sweeping over
    // a stopped fighter isn't a departure. Intentional outbound coast
    // still counts; a new south command can recover beyond the marker.
    if(sortie.piloted&&travelY>1e-4&&p.y>=sortieGateY()&&(fromY<oldGate||southInput)){
     transferCarrierSortie(sortie);break;
    }
   }
  }
 }
 if(state==='play'&&!watching&&!aimForTouchAssist()&&!aimPtr){const [ax,ay]=keyAim();if(ax||ay)commandPilotAim(Math.atan2(ay,ax));}
 showFlightPower();updateHud();
}
function poly(points,ctx=g){
 ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();ctx.fill();if(ctx.lineWidth>0)ctx.stroke();
}
function cruiseSpaceBand(index,seed){
 const random=coverRandom((Math.imul(index,0x9e3779b9)^seed)>>>0),height=capitalCruise.band;
 const stars=Array.from({length:91},(_,i)=>({
  x:random()*W,y:index*height+random()*height,
  r:i%23===0?1.65:i%4===0?.91:.47,alpha:.16+random()*(i%23===0?.56:.37),
  colour:i%6===0?'#89c9db':i%9===0?'#c4a3d9':'#c2d4ed',near:i%4===0
 }));
 const violet=random()<.5,x=100+random()*(W-200),y=index*height+random()*height,r=365+random()*135;
 const haze=[
  {x,y,r,core:violet?'#63407943':'#3268803d',edge:violet?'#3c31562c':'#24466425'},
  {x:x+(random()-.5)*335,y:y+(random()-.5)*190,r:r*.74,core:violet?'#264c7637':'#5844773e',edge:'#232d4929'}
 ];
 return {stars,haze};
}
let orbitAtlas;
const orbitArt=new Map(),orbitTiles=new Map();
const uniqueOrbitArt=new Set(['lyren','verdan','siroc']);
const loadedOrbitArt=image=>!!(image?.complete&&image.naturalWidth>0&&image.naturalHeight>0);
// Centers and limbs, measured in the shipped 300×300 atlas cells.
const atlasLimbs={
 '0:0':[152,154,116],'50:0':[143,155,117],'100:0':[143,155,114],
 '0:100':[151,146,117],'50:100':[144,145,116],'100:100':[143,146,116]
};
function featheredOrbitTile(col,row){
 const key=col+':'+row;
 if(orbitTiles.has(key))return orbitTiles.get(key);
 const tile=document.createElement?.('canvas'),ctx=tile?.getContext?.('2d'),limb=atlasLimbs[key];
 if(!ctx||!limb){orbitTiles.set(key,null);return null;}
 tile.width=tile.height=300;
 const [x,y,r]=limb;
 const sphere=ctx.createRadialGradient(x,y,r-7,x,y,r);
 sphere.addColorStop(0,'#000');sphere.addColorStop(1,'#0000');
 ctx.fillStyle=sphere;ctx.fillRect(0,0,300,300);
 if(key==='100:0'){
  // The golden ring is a tilted, narrow ellipse, independent of the sphere.
  // Composite both masks before applying the art, to retain the bright tips.
  ctx.save();ctx.translate(144,160);ctx.rotate(-.351);ctx.scale(150,19);
  const rim=ctx.createRadialGradient(0,0,0,0,0,1);
  rim.addColorStop(0,'#0000');rim.addColorStop(.68,'#0000');rim.addColorStop(.81,'#000');
  rim.addColorStop(.94,'#000');rim.addColorStop(1,'#0000');
  ctx.fillStyle=rim;ctx.fillRect(-1,-1,2,2);ctx.restore();
 }
 ctx.globalCompositeOperation='source-in';
 ctx.drawImage(orbitAtlas,col*6,row*3,300,300,0,0,300,300);
 orbitTiles.set(key,tile);
 return tile;
}
const planetPassSeconds=24,carrierInfluenceRange=390;
function cruiseRegionGain(position,world){
 if(position?.sector!=='reach'||position.phase==='stale'||!world||!Number.isFinite(position.x)||!Number.isFinite(position.y))return 0;
 const distance=Math.hypot(world.x-position.x,world.y-position.y);
 return clamp((carrierInfluenceRange-distance)/85,0,1);
}
const pirateSceneryPoints=[{x:365,y:1160},{x:690,y:1380}];
function pirateSceneryGain(position,inPirateBattle){
 return inPirateBattle?1:Math.max(...pirateSceneryPoints.map(world=>cruiseRegionGain(position,world)));
}
let pirateBackdropArt;
function paintPirateBackdrop(camera,gain){
 if(gain<=0||typeof window.Image!=='function')return;
 if(!pirateBackdropArt){pirateBackdropArt=new window.Image();pirateBackdropArt.src='./pirate-hideout-backdrop.webp';}
 if(!loadedOrbitArt(pirateBackdropArt))return;
 const ratio=pirateBackdropArt.naturalWidth/pirateBackdropArt.naturalHeight;
 const w=Math.max(camera.w,camera.h*ratio),h=w/ratio;
 g.save();g.globalAlpha*=gain*.85;
 g.drawImage(pirateBackdropArt,camera.x,camera.y-(h-camera.h)*.35,w,h);g.restore();
}
function advanceCruisePlanetPass(stream,dt){
 const pos=stream.planetChart,next=stream.targetPlanet;
 const fresh=pos&&pos.phase!=='stale'&&Number.isFinite(pos.x)&&Number.isFinite(pos.y);
 if(fresh){
  const id=next?.world.id??null;
  if(id!==stream.planetContactId){
   stream.planetContactId=id;stream.planetPending=next??null;
  }
 }
 if(!stream.orbit&&fresh&&stream.planetPending){
  stream.orbit={...stream.planetPending,alpha:1,pass:{progress:0}};
  stream.planetPending=null;
 }
 const orbit=stream.orbit;
 if(!orbit)return;
 // Once underway, the backdrop travels at a steady speed even between map snapshots.
 orbit.pass.progress=Math.min(1,orbit.pass.progress+Math.max(0,dt)/planetPassSeconds);
 if(orbit.pass.progress>=1)stream.orbit=null;
}
function cruisePlanetViewport(orbit){
 const phase=orbit.pass?.progress??0;
 return {x:.24,y:-.64+2.28*phase,fade:Math.min(1,phase/.09,(1-phase)/.09)};
}
function updateCruisePlanet(stream,dt){
 if(!stream?.chart||!window.RiftGalaxyCatalog)return;
 if(!Number.isFinite(stream.chartAt)||elapsed>=stream.chartAt+.25){
  stream.chartAt=elapsed;
  const position=stream.planetChart=stream.chart.sample();
  if(position?.phase!=='stale')stream.targetPlanet=window.RiftGalaxyCatalog.nearPlanet(position,stream.planetContactId);
 }
 advanceCruisePlanetPass(stream,dt);
 if(stream.orbit&&typeof window.Image==='function'){
  if(!orbitAtlas){orbitAtlas=new window.Image();orbitAtlas.src='./galaxy-planets.webp';}
  const id=stream.orbit.world.id;
  if(uniqueOrbitArt.has(id)&&!orbitArt.has(id)){
   const image=new window.Image();image.src='./galaxy-planet-'+id+'.webp';orbitArt.set(id,image);
  }
  if(loadedOrbitArt(orbitArt.get(id)))stream.orbit.artMix=Math.min(1,(stream.orbit.artMix??0)+dt*2);
 }
 const description=stream.orbit&&cruiseRegionGain(stream.planetChart,stream.orbit.world)>.3?'Nearby planet: '+stream.orbit.world.name:'';
 if(orbitalView&&orbitalView.textContent!==description)orbitalView.textContent=description;
}
function paintCruisePlanet(camera,orbit,gain=1){
 if(!orbit?.alpha||gain<=0)return;
 const art=orbitArt.get(orbit.world.id),hasArt=loadedOrbitArt(art),hasAtlas=loadedOrbitArt(orbitAtlas);
 if(!hasArt&&!hasAtlas)return;
 // Anchor to the viewport, never to the fighter, zoom or foreground shake.
 // A nearby confirmed Galaxy Map contact starts one top-to-bottom pass.
 const view=cruisePlanetViewport(orbit);
 const diameter=Math.min(camera.w*.75,camera.h*.85,455/camera.zoom)*1.45;
 const x=camera.x+camera.w*view.x,y=camera.y+camera.h*view.y;
 const [col,row]=orbit.frame,opacity=view.fade*orbit.alpha*gain*(.39+.22*(1-clamp(orbit.distance/390,0,1)));
 const tile=hasAtlas?featheredOrbitTile(col,row):null;
 const mix=hasArt?(tile?(orbit.artMix??0):1):0;
 if(!tile&&!hasArt)return; // Never show the raw rectangular atlas tile.
 g.save();
 if(tile&&mix<1){
  const [lx,ly,r]=atlasLimbs[col+':'+row],rx=x+diameter*(lx/300-.5),ry=y+diameter*(ly/300-.5),radius=diameter*r/300;
  const glow=g.createRadialGradient(rx,ry,radius*.9,rx,ry,radius*1.19);
  const tint=row===100&&col===100?'#d3aa9150':row===0&&col===100?'#e5af635b':'#7095b74a';
  glow.addColorStop(0,tint);glow.addColorStop(.38,tint);glow.addColorStop(1,'#0000');
  g.globalAlpha=opacity*(1-mix)*.66;g.fillStyle=glow;g.fillRect(rx-radius*1.2,ry-radius*1.2,radius*2.4,radius*2.4);
  g.globalAlpha=opacity*(1-mix);g.drawImage(tile,x-diameter/2,y-diameter/2,diameter,diameter);
 }
 if(hasArt&&mix>0){
  // Preserve the centered transparent art's aspect ratio and full ring span.
  const size=diameter/Math.max(art.naturalWidth,art.naturalHeight),w=art.naturalWidth*size,h=art.naturalHeight*size;
  g.globalAlpha=opacity*mix;g.drawImage(art,x-w/2,y-h/2,w,h);
 }
 g.restore();
}
function paintCruiseSpace(camera,stream,hazeOpacity){
 const h=capitalCruise.band,low=camera.y,high=low+camera.h;
 const first=Math.floor(low/h)-1,last=Math.floor(high/h)+1;
 // Keep only visible bands plus neighboring haze. Stable world IDs make
 // regenerated chunks identical, without tying them to game randomness.
 for(const band of stream.bands.keys())if(band<first||band>last)stream.bands.delete(band);
 g.fillStyle='#070e1e';g.fillRect(camera.x,low,camera.w,camera.h);
 const lag=motion?.matches?0:(camera.x+camera.w*.5-W*.5)*.19;
 for(let band=first;band<=last;band++){
  let chunk=stream.bands.get(band);
  if(!chunk){chunk=cruiseSpaceBand(band,stream.seed);stream.bands.set(band,chunk);}
  if(hazeOpacity>0)for(const {x,y,r,core,edge} of chunk.haze){
   const hx=x+lag;
   if(y+r<low||y-r>high||hx+r<camera.x||hx-r>camera.x+camera.w)continue;
   const haze=g.createRadialGradient(hx,y,0,hx,y,r);
   haze.addColorStop(0,core);haze.addColorStop(.46,edge);haze.addColorStop(1,'#191f3900');
   g.globalAlpha=hazeOpacity*.42;g.fillStyle=haze;g.fillRect(camera.x,low,camera.w,camera.h);
  }
 }
 for(const {stars} of stream.bands.values())for(const star of stars){
  const x=star.x+lag*(star.near?.36:.82);
  if(star.y<low-3||star.y>high+3||x<camera.x-3||x>camera.x+camera.w+3)continue;
  g.globalAlpha=Math.min(1,star.alpha*(star.near?1.38:1.18));g.fillStyle=star.colour;
  const size=star.r*(star.near?1.17:1);g.fillRect(x,star.y,size,size);
 }
 g.globalAlpha=1;
}
function paintFlightSpace(camera,hazeOpacity){
 if(capitalShip?.stream){paintCruiseSpace(camera,capitalShip.stream,hazeOpacity);return;}
 const north=floorNorth(),south=H+carrierArrival.exterior+90,height=south-north;
 const tint=g.createLinearGradient(0,north,0,south);
 tint.addColorStop(0,'#071828');tint.addColorStop(.53,'#0b1428');tint.addColorStop(1,'#090d1f');
 g.fillStyle=tint;g.fillRect(camera.x,camera.y,camera.w,camera.h);
 const lag=motion?.matches?0:.19,lagX=(camera.x+camera.w*.5-W*.5)*lag,lagY=(camera.y-north)*lag;
 // A distant nebula drifts more slowly than the rocks. Soft falloff, no art edges.
 if(hazeOpacity>0)for(const cloud of flightNebula){
  const x=cloud.x+lagX,y=north+(height*cloud.y)+lagY,r=cloud.r;
  if(x+r<camera.x||x-r>camera.x+camera.w||y+r<camera.y||y-r>camera.y+camera.h)continue;
  const haze=g.createRadialGradient(x,y,0,x,y,r);
  haze.addColorStop(0,cloud.core);haze.addColorStop(.43,cloud.halo);haze.addColorStop(1,'#19223b00');
  g.globalAlpha=hazeOpacity*.42;g.fillStyle=haze;g.fillRect(camera.x,camera.y,camera.w,camera.h);
 }
 const first=Math.max(0,Math.floor((camera.y-north-lagY)/H)),last=Math.floor((camera.y+camera.h-north-lagY)/H);
 for(let band=first;band<=last;band++)for(const star of stars){
  const x=arena.left-edge+((star.x+band*311)%W)*(arena.right-arena.left+2*edge)/W+lagX,y=north+band*H+star.y+lagY;
  if(y<camera.y-3||y>camera.y+camera.h+3||x<camera.x-3||x>camera.x+camera.w+3)continue;
  g.globalAlpha=Math.min(1,star.d/92);g.fillStyle=star.h;g.fillRect(x,y,star.r,star.r);
 }
 g.globalAlpha=1;
}
const flightNebula=[
 {x:205,y:.11,r:570,core:'#346a7984',halo:'#29476f38'},
 {x:805,y:.38,r:650,core:'#633d927f',halo:'#4a36665c'},
 {x:130,y:.68,r:510,core:'#293f737d',halo:'#3c508647'},
 {x:740,y:.86,r:590,core:'#60357268',halo:'#51365843'}
];

function paintBifrostExhaust(t,w,h){
 // Each root starts just inside the overhead sprite's engine cowling.
 // The ship is drawn on top, so only the anchored light behind it is visible.
 const aft=h*.428,steady=motion?.matches;
 for(const [i,offset] of [-.168,0,.168].entries()){
  const x=offset*w,wave=steady?0:Math.sin(t*4.8+i*1.9);
  const length=49+(i===1?6:0)+wave*4,drift=wave*2;
  const glow=g.createRadialGradient(x,aft+9,1,x,aft+9,21);
  glow.addColorStop(0,'#f6bcff5c');glow.addColorStop(.46,'#b06cff38');glow.addColorStop(1,'#9245ef00');
  g.fillStyle=glow;g.fillRect(x-21,aft-12,42,42);
  const tail=g.createLinearGradient(0,aft,0,aft+length);
  tail.addColorStop(0,'#f4aefad0');tail.addColorStop(.29,'#b166e99c');
  tail.addColorStop(.64,'#793ddf45');tail.addColorStop(1,'#6b35d400');
  g.fillStyle=tail;g.beginPath();g.moveTo(x-9,aft);
  g.quadraticCurveTo(x-13,aft+length*.34,x+drift,aft+length);
  g.quadraticCurveTo(x+13,aft+length*.34,x+9,aft);g.closePath();g.fill();
  const core=g.createLinearGradient(0,aft,0,aft+length*.8);
  core.addColorStop(0,'#fff7ff');core.addColorStop(.24,'#ffd1fbe8');
  core.addColorStop(.55,'#db83ff83');core.addColorStop(1,'#c379ff00');
  g.fillStyle=core;g.beginPath();g.moveTo(x-4.5,aft);
  g.quadraticCurveTo(x-5,aft+length*.3,x+drift,aft+length*.8);
  g.quadraticCurveTo(x+5,aft+length*.3,x+4.5,aft);g.closePath();g.fill();
 }
}
function makeSupportFleet(ship){
 if(!capitalArt.has(bifrostCapital.id)&&typeof window.Image==='function'){
  const art=new window.Image();art.src=bifrostCapital.art;capitalArt.set(bifrostCapital.id,art);
 }
 const fleet={vessel:bifrostCapital,name:'Bifrost · Lead fleet',hp:carrierMaxHp,maxHp:carrierMaxHp,pads:[],deckCrew:[],phase:'flight',
  hull:bifrostCapital.sections.map(([, ,r])=>({capitalHull:true,r,invMass:0,spin:0}))};
 for(const part of fleet.hull)carrierHullOwner.set(part,fleet);
 updateSupportFleet(ship,fleet);
 return fleet;
}
function updateSupportFleet(ship,fleet=ship.supportFleet){
 if(!fleet)return;
 const pos=berthWorld(ship,0,-485);
 Object.assign(fleet,pos,{aim:ship.aim});
 updateCapitalShotHull(fleet);
 const {width,height}=capitalCourse;
 for(const [i,[lx,ly]] of bifrostCapital.sections.entries()){
  const piece=fleet.hull[i],at=berthWorld(fleet,lx*width,ly*height);
  Object.assign(piece,{...at,prevX:at.x,prevY:at.y,vx:Math.cos(ship.aim)*ship.speed,vy:Math.sin(ship.aim)*ship.speed});
 }
}
const resoluteFlightLength=riftFourFlightLength*4.6;
// Free People deck encounter geometry. Never spawn this contact in navy Free Flight.
const crosswindFlightCourse=Object.freeze({lane:888,span:6,frequency:.064,speed:38});
function crosswindTrafficPose(distance){
 const c=crosswindFlightCourse,age=distance/c.speed,n=age*c.frequency;
 const dx=c.span*c.frequency*Math.cos(n),dy=-c.speed+.75*Math.cos(age*.025);
 return {x:c.lane+c.span*Math.sin(n),y:521-distance+30*Math.sin(age*.025),heading:Math.atan2(dy,dx)+Math.PI/2};
}
const crosswindHull=window.RiftFrigateHulls?.crosswind;
const blackwaterFlightLength=crosswindHull?.length??0;
const blackwaterFlightWidth=crosswindHull?.width??0;
let blackwaterFlightArt;
function blackwaterFleetPose(carrier,t){
 if(!flightMode.crosswindVisit||!crosswindHull||!carrier||carrier.testCarrier||!carrier.stream||carrier.transfer||
    !['flight','docking'].includes(carrier.phase)||
    (flightMode.id!=='free-flight'&&!carrier.roundTripReturned))return null;
 return crosswindTrafficPose(carrier.distance??0);
}
// The visible center runway has four painted bays, numbered nose to tail.
const blackwaterLandingPads=Object.freeze(crosswindHull?.pads.map(p=>p.y)??[]);
const crosswindPadX=crosswindHull?.pads[0].x??0;
const blackwaterLandingRange=210,blackwaterClearanceRange=280;
function blackwaterLandingTarget(){
 if(state!=='play'||routeParked||transferTransit||hangarDialog?.open||p.hp<=0||
    capitalShip?.phase!=='flight'||resoluteLatched()||pendingCarrierSortie||loanerSnapshot||
    onlineBattle||flightMode.id!=='free-flight')return null;
 return blackwaterFleetPose(capitalShip,elapsed);
}
const blackwaterLatched=()=>Boolean(capitalShip?.blackwaterLanding&&capitalShip.blackwaterLanding.phase!=='approach');
const blackwaterParkSize=()=>p.fighter===civilianFreighter.id?.28:.34;
function blackwaterDockPoint(pose,x,y){
 return berthWorld({...pose,aim:pose.heading-Math.PI/2},x,y);
}
function blackwaterDockVelocity(x,y){
 const c=capitalShip,h=.035;
 const sample=delta=>blackwaterDockPoint(crosswindTrafficPose(c.distance+c.speed*delta),x,y);
 const a=sample(-h),b=sample(h);
 return {vx:(b.x-a.x)/(2*h),vy:(b.y-a.y)/(2*h)};
}
function blackwaterApproachCheck(pose,d){
 const y=blackwaterLandingPads[d.pad],pad=blackwaterDockPoint(pose,crosswindPadX,y),v=blackwaterDockVelocity(crosswindPadX,y);
 const gap=Math.hypot(p.x-pad.x,p.y-pad.y),speed=Math.hypot(p.vx-v.vx,p.vy-v.vy);
 return {gap,speed,ready:gap<=42&&speed<=80};
}
function updateBlackwaterLandingHud(){
 if(!blackwaterLandingHud)return;
 const pose=blackwaterLandingTarget(),gap=pose?Math.hypot(p.x-pose.x,p.y-pose.y):Infinity;
 if(pose&&capitalShip.blackwaterLanding?.phase==='approach'&&gap>blackwaterClearanceRange)capitalShip.blackwaterLanding=null;
 const d=capitalShip?.blackwaterLanding,phase=d?.phase;
 blackwaterLandingHud.hidden=!pose||(!d&&gap>blackwaterLandingRange);
 if(blackwaterLandingHud.hidden)return;
 const check=phase==='approach'?blackwaterApproachCheck(pose,d):null;
 const label=!d?'Request Crosswind Landing':phase==='approach'?'Land on Pad '+(d.pad+1):phase==='capturing'?'Landing…':phase==='launching'?'Launching…':'Launch from Crosswind';
 const info=phase==='approach'?(check.ready?'Ready to land':check.gap>42?'Fly into the marked ring':'Match Crosswind’s speed'):
  phase==='docked'?'Landed':phase==='capturing'?'Touching down':phase==='launching'?'Leaving deck':'';
 if(blackwaterLandingAction.textContent!==label)blackwaterLandingAction.textContent=label;
 blackwaterLandingAction.disabled=phase==='launching'||phase==='capturing';
 blackwaterLandingAction.toggleAttribute('data-ready',!!check?.ready);
 if(blackwaterLandingCancel)blackwaterLandingCancel.hidden=phase!=='approach';
 const note=d?'Crosswind · Pad '+(d.pad+1)+' · '+info:'';
 if(blackwaterLandingNote.textContent!==note)blackwaterLandingNote.textContent=note;
}
blackwaterLandingAction?.addEventListener('click',e=>{
 const pose=blackwaterLandingTarget();
 if(!e.isTrusted||document.hidden||!pose)return;
 const c=capitalShip,d=c.blackwaterLanding;
 if(!d){
  if(Math.hypot(p.x-pose.x,p.y-pose.y)>blackwaterLandingRange)return;
  c.blackwaterLanding={phase:'approach',pad:Math.floor(Math.random()*blackwaterLandingPads.length)};
 }else if(d.phase==='approach'){
  if(!blackwaterApproachCheck(pose,d).ready)return;
  d.from=berthLocal({...pose,aim:pose.heading-Math.PI/2},p.x,p.y);
  d.fromAim=headingDelta(pose.heading-Math.PI/2,p.aim);
  d.phase='capturing';d.at=elapsed;d.scale=1;
  if(c.resoluteDock?.phase==='approach')c.resoluteDock=null;
  p.dockingClearance=false;p.dockQueuedUntil=0;
  clearInput();p.mainMomentum=p.mainThrustActive=false;syncArrivalControls();
 }else if(d.phase==='docked'){
  d.phase='launching';d.at=elapsed;syncArrivalControls();
 }
 updateCapitalHud();updateBlackwaterLandingHud();
});
blackwaterLandingCancel?.addEventListener('click',e=>{
 if(!e.isTrusted||document.hidden||!blackwaterLandingTarget()||capitalShip.blackwaterLanding?.phase!=='approach')return;
 capitalShip.blackwaterLanding=null;updateBlackwaterLandingHud();
});
function advanceBlackwaterLanding(){
 const c=capitalShip,d=c.blackwaterLanding,pose=blackwaterFleetPose(c,elapsed);
 if(!pose){c.blackwaterLanding=null;syncArrivalControls();return;}
 let x=crosswindPadX,y=blackwaterLandingPads[d.pad],heading=pose.heading-Math.PI/2;
 const progress=seconds=>clamp((elapsed-d.at)/seconds,0,1);
 const parked=blackwaterParkSize();
 d.scale=parked;
 if(d.phase==='capturing'){
  const u=progress(.85),s=smoothBerth(u);
  x+=(d.from.x-x)*(1-s);y+=(d.from.y-y)*(1-s);heading+=d.fromAim*(1-s);
  d.scale=1+(parked-1)*s;
  if(u===1)d.phase='docked';
 }else if(d.phase==='launching'){
  const u=progress(1.05),s=smoothBerth(u);
  x+=24*s;y-=108*s;heading+=.2*s;d.scale=parked+(1-parked)*s;
  if(u===1){
   const at=blackwaterDockPoint(pose,x,y),v=blackwaterDockVelocity(x,y);
   Object.assign(p,{...at,prevX:at.x,prevY:at.y,vx:v.vx+Math.cos(heading)*48,vy:v.vy+Math.sin(heading)*48});
   snapAim(heading);c.blackwaterLanding=null;syncArrivalControls();liveFocus();return;
  }
 }
 const at=blackwaterDockPoint(pose,x,y),v=blackwaterDockVelocity(x,y);
 Object.assign(p,{prevX:p.x,prevY:p.y,...at,...v});snapAim(heading);
}
function paintBlackwaterLandingGuide(t,camera){
 const request=capitalShip?.blackwaterLanding;
 if(request?.phase!=='approach'||!blackwaterLandingTarget())return;
 const pose=blackwaterFleetPose(capitalShip,t);
 const pad=berthWorld({...pose,aim:pose.heading-Math.PI/2},crosswindPadX,blackwaterLandingPads[request.pad]);
 if(!withinCamera(pad,camera,30))return;
 g.save();g.translate(pad.x,pad.y);
 // Blink the four actual deck corners; keep the approach number readable.
 g.save();g.rotate(pose.heading);
 const pulse=motion?.matches?1:.23+.77*Math.pow(.5+.5*Math.cos(t*TAU*1.1),2);
 g.globalAlpha=pulse;
 for(const x of [-12.4,12.4])for(const y of [-17,17]){
  g.fillStyle='#45ffcb55';g.beginPath();g.arc(x,y,5.2,0,TAU);g.fill();
  g.fillStyle='#a7ffe4';g.beginPath();g.arc(x,y,2.65,0,TAU);g.fill();
 }
 g.restore();
 g.lineWidth=2.5;g.strokeStyle='#98ffe5';g.fillStyle='#082a2dd9';
 g.beginPath();g.arc(0,0,12,0,TAU);g.fill();g.stroke();
 g.fillStyle='#c9fff1';g.font='bold 12px system-ui';g.textAlign='center';g.textBaseline='middle';
 g.fillText(String(request.pad+1),0,0);g.restore();
}
function paintBlackwaterEscort(carrier,t,camera){
 paintCrosswindPose(blackwaterFleetPose(carrier,t),camera);
}
function paintCrosswindPose(pose,camera){
 if(!pose||!withinCamera(pose,camera,blackwaterFlightLength/2))return;
 if(blackwaterFlightArt===undefined){
  blackwaterFlightArt=typeof window.Image==='function'?new window.Image():null;
  if(blackwaterFlightArt)blackwaterFlightArt.src=crosswindHull.art;
 }
 if(!blackwaterFlightArt?.complete||!blackwaterFlightArt.naturalWidth)return;
 const w=blackwaterFlightWidth,h=blackwaterFlightLength;
 g.save();g.translate(pose.x,pose.y);g.rotate(pose.heading);
 const exhaust=g.createLinearGradient(0,h*.48,0,h*.56);
 exhaust.addColorStop(0,'#8deaffb3');exhaust.addColorStop(1,'#459fe000');
 g.fillStyle=exhaust;
 for(const x of [-.245,.164])g.fillRect(x*w-4,h*.48,8,h*.08);
 g.drawImage(blackwaterFlightArt,-w/2,-h/2,w,h);g.restore();
 g.save();g.fillStyle='#aef0de';g.textAlign='center';g.font='700 10px system-ui';
 if(!pose.scaleFly)g.fillText('CROSSWIND · FREE PEOPLE',pose.x,pose.y+h*.59);g.restore();
}

let resoluteArt,resoluteTurretArt;
// Source coordinates of the original Keel-4 hull. Exclude the comparison grid and Rift-3.
const resoluteTrace=[
 [313,125],[327,125],[339,143],[347,162],[354,192],[365,224],[373,246],[382,264],[389,278],[388,292],
 [382,301],[388,314],[388,337],[383,348],[386,365],[393,380],[392,414],[388,445],[379,457],[373,475],
 [383,488],[389,504],[388,537],[384,550],[376,567],[358,581],[348,584],[330,578],[320,571],[310,578],
 [290,584],[280,581],[264,568],[255,551],[250,536],[250,505],[256,488],[266,475],[261,457],[251,446],
 [247,415],[246,383],[253,368],[256,351],[250,339],[249,316],[255,303],[250,292],[250,279],[258,265],
 [268,245],[275,223],[285,191],[291,166],[300,144]
];
function paintResoluteArt(turrets){
 if(resoluteArt===undefined){
  resoluteArt=typeof window.Image==='function'?new window.Image():null;
  if(resoluteArt){
   resoluteArt.src='./corvette-rift4-scale-v6.webp';
   resoluteTurretArt=new window.Image();
   resoluteTurretArt.src='./corvette-twin-s4.svg';
  }
 }
 if(!resoluteArt?.complete||resoluteArt.naturalWidth!==760||resoluteArt.naturalHeight!==700)return false;
 // Hull is 459 source pixels tall. Keep the original sprite scale measured at the hull, not the crop.
 const unit=180/459,ox=320,oy=354.5,x=235,y=118,w=168,h=475;
 g.save();g.scale(unit,unit);g.translate(-ox,-oy);g.beginPath();
 for(let i=0;i<resoluteTrace.length;i++){
  const [px,py]=resoluteTrace[i];if(i)g.lineTo(px,py);else g.moveTo(px,py);
 }
 g.closePath();g.clip();g.drawImage(resoluteArt,x,y,w,h,x,y,w,h);g.restore();
 // Place each detachable SVG at its own painted socket after the hull clip is restored.
 if(resoluteTurretArt?.complete&&resoluteTurretArt.naturalWidth>0)resoluteMounts.forEach((mount,i)=>{
  g.save();g.scale(unit,unit);g.translate(mount.x-ox,mount.y-oy);g.rotate(turrets?.[i]?.yaw??mount.rest);
  g.drawImage(resoluteTurretArt,-22,-101*44/160,44,148*44/160);g.restore();
 });
 return true;
}
// Keel-4 collision circles lie inside the traced flight silhouette.
const resoluteSectionLayout=[
 [0,-.41,.082],[0,-.285,.103],[0,-.128,.134],[0,.018,.144],
 [0,.157,.144],[0,.295,.132],[-.074,.393,.075],[.074,.393,.075]
];
function positionResoluteHull(craft){
 const sections=craft.hullSections??=resoluteSectionLayout.map(()=>({resoluteHull:craft}));
 // Shot contacts cover the full hull; flight contacts only the raised spine.
 craft.solidSections??=sections.slice(2,5).map(()=>({}));
 for(const [i,[x,y,r]] of resoluteSectionLayout.entries()){
  const piece=sections[i],pose=resoluteOffset(craft,craft.heading,x*resoluteFlightLength,y*resoluteFlightLength);
  Object.assign(piece,{prevX:piece.x??pose.x,prevY:piece.y??pose.y,...pose,r:r*resoluteFlightLength});
  if(i>=2&&i<=4)Object.assign(craft.solidSections[i-2],pose,{r:.083*resoluteFlightLength});
 }
}
function advanceFleetResolute(ship,dt){
 const pose=resoluteFormation(ship,elapsed);
 if(!pose||ship.transfer||ship.phase!=='flight')return null;
 const craft=ship.resoluteEscort??={...pose,resoluteEscort:true,allyShip:true,hp:resoluteBattleHP,maxHp:resoluteBattleHP,
  vx:Math.cos(ship.aim)*ship.speed,vy:Math.sin(ship.aim)*ship.speed,invMass:1/230,spin:0};
 const moved=pose.x!==craft.x||pose.y!==craft.y;
 if(moved&&dt>0){
  const dx=pose.x-craft.x,dy=pose.y-craft.y;
  if(Math.hypot(dx,dy)<300*dt){craft.vx=dx/dt;craft.vy=dy/dt;}
  else{craft.vx=Math.cos(ship.aim)*ship.speed;craft.vy=Math.sin(ship.aim)*ship.speed;}
 }
 Object.assign(craft,{prevX:craft.x,prevY:craft.y},pose);
 positionResoluteHull(craft);
 return craft;
}
function resoluteFormation(ship,t){
 if(ship?.resoluteEscort?.hp===0)return null;
 if(ship?.vessel!==pegasusCapital||ship.testCarrier||!ship.stream||!['flight','docking'].includes(ship.phase))return null;
 const sortie=pendingCarrierSortie;
 if(ship===capitalShip&&sortie&&!sortie.failed&&resoluteSortieEdge(sortie)){
  if(sortie.resolute)return sortie.resolute.cleared?null:sortie.resolute;
 }else if(flightMode.id!=='free-flight'&&!ship.roundTripReturned)return null;
 const sweep=t*.31;
 const at=berthWorld(ship, -246+Math.sin(sweep)*9,99+Math.sin(sweep*.71+.6)*24);
 return {...at,heading:ship.aim+Math.PI/2+Math.cos(sweep)*.12};
}
const resoluteMounts=[
 {id:'port-forward',x:261,y:277,rest:.52,lane:[-138,-202]},
 {id:'starboard-forward',x:379,y:277,rest:-.52,lane:[53,-267]},
 {id:'port-aft',x:275,y:428,rest:-.64,lane:[-205,48]},
 {id:'starboard-aft',x:364,y:428,rest:.64,lane:[58,220]}
];
function canRunResoluteDrill(){
 return state==='play'&&p.hp>0&&capitalShip?.phase==='flight'&&!capitalShip.transfer&&!capitalShip.resoluteDock&&!pendingCarrierSortie&&
  flightMode.id==='free-flight'&&Boolean(resoluteFormation(capitalShip,elapsed));
}
function clearResoluteDrill(ship){
 const drill=ship.resoluteDrill;if(!drill)return;
 ship.resoluteDrill=null;shots=shots.filter(shot=>shot.resoluteDrill!==drill);
}
resoluteDrillButton?.addEventListener('click',event=>{
 if(event.isTrusted!==true||document.hidden||routeParked||transferTransit||!canRunResoluteDrill())return;
 const ship=capitalShip,active=ship.resoluteDrill?.drones.some(d=>d.hp>0);
 clearResoluteDrill(ship);
 if(!active){
  unlockAudio(undefined,event);
  ship.resoluteDrill={activityUntil:elapsed+68,drones:resoluteMounts.map(({lane:[x,y]},i)=>({
  resoluteDrone:true,id:i+1,hp:72,maxHp:72,r:24,dx:x+(Math.random()-.5)*42,dy:y+(Math.random()-.5)*50,phase:Math.random()*TAU
 }))};
 }
 updateCapitalHud();
});
function resoluteOffset(anchor,angle,x,y){
 const u=Math.cos(angle),v=Math.sin(angle);
 return {x:anchor.x+u*x-v*y,y:anchor.y+v*x+u*y};
}
// Local hangar add-on. This never changes the persistent Pegasus berth.
const resolutePad={root:38,outer:74,height:40,y:0,center:56,radius:50,speed:110,range:450,parkScale:capitalBerth.parkScale,innerScale:.20,extend:.58,capture:.85,store:1.14,launch:1.04};
const resoluteLatched=()=>!!capitalShip?.resoluteDock&&capitalShip.resoluteDock.phase!=='approach';
function resoluteDockPose(){
 const c=capitalShip;
 if(c?.phase!=='flight'||blackwaterLatched()||c.transfer||pendingCarrierSortie||loanerSnapshot||state==='watch'||onlineBattle||flightMode.id!=='free-flight')return null;
 const craft=resoluteFormation(c,elapsed);
 return craft&&canDockShipClass(currentDockingShipClass(),'corvette')?{...craft,aim:craft.heading-Math.PI/2}:null;
}
function resoluteDockCheck(craft,dock){
 const pad=berthWorld(craft,dock.side*resolutePad.center,resolutePad.y),v=resoluteDockVelocity(craft,dock.side*resolutePad.center,resolutePad.y);
 const gap=Math.hypot(p.x-pad.x,p.y-pad.y),speed=Math.hypot(p.vx-v.x,p.vy-v.y);
 return {pad,gap,speed,ready:elapsed-dock.at>=resolutePad.extend&&gap<=resolutePad.radius&&speed<=resolutePad.speed};
}
function resoluteDockVelocity(craft,x,y){
 // Observe the moving carrier and formation's pad over two nearby samples.
 const c=capitalShip,h=.04;
 const sample=delta=>{
  const pose=capitalCruisePose(c.distance+c.speed*delta);
  const escort=resoluteFormation({...c,...pose},elapsed+delta);
  return berthWorld({...escort,aim:escort.heading-Math.PI/2},x,y);
 };
 const a=sample(-h),b=sample(h);
 return {x:(b.x-a.x)/(2*h),y:(b.y-a.y)/(2*h)};
}
function setResoluteDockPhase(dock,phase){dock.phase=phase;dock.at=elapsed;syncArrivalControls();}
function canUseResoluteDock(e){return e.isTrusted===true&&state==='play'&&!document.hidden&&!routeParked&&!transferTransit&&!hangarDialog?.open&&p.hp>0;}
resoluteDockAction?.addEventListener('click',e=>{
 if(!canUseResoluteDock(e))return;
 const craft=resoluteDockPose(),c=capitalShip,dock=c?.resoluteDock;
 if(!craft)return;
 if(!dock){
  if(c.resoluteDrill?.drones.some(d=>d.hp>0)||Math.hypot(p.x-craft.x,p.y-craft.y)>resolutePad.range)return;
  c.resoluteDock={phase:'approach',side:berthLocal(craft,p.x,p.y).x<0?-1:1,at:elapsed};
  p.dockingClearance=false;p.dockQueuedUntil=0;unlockAudio(undefined,e);updateCapitalHud();return;
 }
 if(dock.phase==='approach'&&resoluteDockCheck(craft,dock).ready){
  dock.from=berthLocal(craft,p.x,p.y);dock.fromAim=headingDelta(craft.aim,p.aim);
  clearInput();shots=[];p.mainMomentum=p.mainThrustActive=false;setResoluteDockPhase(dock,'capturing');
 }else if(dock.phase==='docked'||dock.phase==='stored'){
  dock.fromStored=dock.phase==='stored';setResoluteDockPhase(dock,'launching');
 }
});
resoluteDockStore?.addEventListener('click',e=>{
 const dock=capitalShip?.resoluteDock;
 if(canUseResoluteDock(e)&&dock?.phase==='docked')setResoluteDockPhase(dock,'storing');
});
resoluteDockCancel?.addEventListener('click',e=>{
 if(canUseResoluteDock(e)&&capitalShip?.resoluteDock?.phase==='approach'){capitalShip.resoluteDock=null;updateCapitalHud();}
});
function updateResoluteDockHud(){
 if(!resoluteDockHud)return;
 const craft=resoluteDockPose(),dock=capitalShip?.resoluteDock;
 const visible=state==='play'&&p.hp>0&&craft&&!transferTransit&&
  (dock||!capitalShip.resoluteDrill?.drones.some(d=>d.hp>0)&&Math.hypot(p.x-craft.x,p.y-craft.y)<=resolutePad.range);
 resoluteDockHud.hidden=!visible;
 if(!visible)return;
 const phase=dock?.phase;
 const check=phase==='approach'?resoluteDockCheck(craft,dock):null;
 const label=!phase?'Request Resolute Docking':phase==='approach'?'Dock at Resolute':phase==='capturing'?'Docking…':
  phase==='storing'?'Storing…':phase==='launching'?'Launching…':'Launch';
 const side=dock?.side<0?'Port':'Starboard';
 const note=phase==='approach'?(check.ready?side+' pad ready':side+' pad · '+(check.gap>resolutePad.radius?'Enter ring':'Match speed')):
  phase==='docked'?side+' pad · Docked':phase==='stored'?'Stored inside Resolute · This flight only':'';
 if(resoluteDockAction.textContent!==label)resoluteDockAction.textContent=label;
 resoluteDockAction.disabled=phase==='approach'?!check.ready:!!phase&&phase!=='docked'&&phase!=='stored';
 resoluteDockStore.hidden=phase!=='docked';resoluteDockCancel.hidden=phase!=='approach';
 if(resoluteDockNote.textContent!==note)resoluteDockNote.textContent=note;
}
function advanceResoluteDock(){
 const c=capitalShip,d=c.resoluteDock,craft=resoluteDockPose();
 if(!craft)return;
 const {phase,side}=d,k=resolutePad,time=elapsed-d.at,level=(duration)=>motion?.matches?1:clamp(time/duration,0,1);
 let x=side*k.center,y=k.y,aim=0,scale=k.parkScale,visible=true;
 if(phase==='capturing'){
  const t=smoothBerth(level(k.capture));
  x=d.from.x+(x-d.from.x)*t;y=d.from.y+(y-d.from.y)*t;aim=d.fromAim*(1-t);scale=1+(k.parkScale-1)*t;
  if(t===1)setResoluteDockPhase(d,'docked');
 }else if(phase==='storing'||phase==='stored'||phase==='launching'&&d.fromStored){
  const t=phase==='storing'?smoothBerth(level(k.store)):phase==='stored'?1:1-smoothBerth(level(k.launch*.68));
  x*=1-t;scale=k.parkScale+(k.innerScale-k.parkScale)*t;visible=t<.85;
  if(phase==='storing'&&t===1)setResoluteDockPhase(d,'stored');
 }
 if(phase==='launching'){
  const t=smoothBerth(clamp((level(k.launch)-(d.fromStored?.68:0))/(d.fromStored?.32:1),0,1));
  x+=side*111*t;aim=side*Math.PI/2*t;scale+=(1-k.parkScale)*t;
  if(t===1){
   const v=resoluteDockVelocity(craft,x,y),at=berthWorld(craft,x,y),heading=craft.aim+aim;
   Object.assign(p,{x:at.x,y:at.y,prevX:at.x,prevY:at.y,vx:v.x+Math.cos(heading)*42,vy:v.y+Math.sin(heading)*42});
   snapAim(heading);c.resoluteDock=null;syncArrivalControls();liveFocus();return;
  }
 }
 const at=berthWorld(craft,x,y),v=resoluteDockVelocity(craft,x,y);
 Object.assign(p,{prevX:p.x,prevY:p.y,x:at.x,y:at.y,vx:v.x,vy:v.y});snapAim(craft.aim+aim);
 d.scale=scale;d.visible=visible;
}
function paintResolutePads(dock){
 if(!dock)return;
 const k=resolutePad,time=elapsed-dock.at;
 const extend=motion?.matches?1:smoothBerth(time/k.extend);
 const ease=duration=>motion?.matches?1:smoothBerth(time/duration);
 for(const sign of [-1,1]){
  const active=sign===dock.side;
  const width=k.outer-k.root;
  const opened=dock.phase==='approach'?extend:dock.phase==='stored'?0:dock.phase==='storing'?
   (active?1-ease(k.store):1-ease(.48)):dock.phase==='launching'&&dock.fromStored?ease(k.launch*.48):
   (active||dock.phase==='capturing'||dock.phase==='docked'?1:0);
  if(opened<=0)continue;
  const w=width*opened,h=k.height,x=sign<0?-k.root-w:k.root,y=k.y-h/2;
  g.save();g.fillStyle='#17252f';g.fillRect(x,y,w,h);
  g.lineWidth=2;g.strokeStyle='#7b818c';g.strokeRect(x,y,w,h);
  if(w>16){
   g.fillStyle=active?'#f3c87a':'#a48458';g.fillRect(x+4,y+5,w-8,2);g.fillRect(x+4,y+h-7,w-8,2);
   g.fillStyle='#77dcdc';for(const a of [x+5,x+w-8])for(const b of [y+10,y+h-14])g.fillRect(a,b,3,3);
  }
  g.restore();
 }
}
const battleResolute=()=>flightMode.resolutePlan?.craft;
function advanceBattleResolute(dt,obstacles){
 const plan=flightMode.resolutePlan;
 if(!plan||duelResult)return;
 const {heading,edge,delay}=plan,dx=Math.cos(heading),dy=Math.sin(heading);
 if(!plan.craft){
  plan.wait+=dt;
  if(plan.wait<delay)return;
  // A parallel lane avoids spawning over the fighter's own arrival point.
  const a=tileArrivalPoint(edge,34);
  plan.craft={x:a.x-dy*142,y:a.y+dx*142,heading:heading+Math.PI/2,
   resoluteCombat:true,allyShip:true,hp:plan.hp,maxHp:resoluteBattleHP,
   vx:0,vy:0,spin:0,invMass:1/230,r:28,travel:0};
 }
 const c=plan.craft;if(c.hp<=0)return;
 c.prevX=c.x;c.prevY=c.y;
 const entry=c.travel<180;
 const goal=entry?{x:c.x+dx*100,y:c.y+dy*100}:{
  x:clamp(p.x-dy*138-dx*105,arena.left+74,arena.right-74),
  y:clamp(p.y+dx*138-dy*105,arena.top+74,arena.bottom-74)
 };
 const range=Math.hypot(goal.x-c.x,goal.y-c.y);
 const aim=range>9?bearing(c,goal):c.heading-Math.PI/2;
 for(const offset of [0,.58,-.58,1.1,-1.1,1.55,-1.55]){
  const angle=aim+offset,dist=Math.min(range,(entry?resoluteSortiePace:112)*dt);
  if(range<=9)break;
  const next={x:c.x+Math.cos(angle)*dist,y:c.y+Math.sin(angle)*dist};
  if(next.x<arena.left+30||next.x>arena.right-30||next.y<arena.top+30||next.y>arena.bottom-30)continue;
  if(obstacles.some(b=>{
   const x=c.x-b.x,y=c.y-b.y,nx=next.x-b.x,ny=next.y-b.y,r=b.r+c.r+3;
   return nx*nx+ny*ny<r*r&&nx*nx+ny*ny<x*x+y*y;
  }))continue;
  c.heading+=clamp(headingDelta(c.heading,angle+Math.PI/2),-1.6*dt,1.6*dt);
  Object.assign(c,next);c.travel+=Math.max(0,(c.x-c.prevX)*dx+(c.y-c.prevY)*dy);break;
 }
 c.vx=(c.x-c.prevX)/dt;c.vy=(c.y-c.prevY)/dt;
 positionResoluteHull(c);
}
function advanceResoluteGun(dt,rivals,obstacles){
 const ship=capitalShip??battleResolute();if(!ship)return;
 const craft=ship.resoluteCombat?(ship.hp>0&&!duelResult?ship:null):ship.phase==='flight'&&!ship.transfer?resoluteFormation(ship,elapsed):null;
 if(!craft||ship.resoluteDrill&&elapsed>=ship.resoluteDrill.activityUntil)clearResoluteDrill(ship);
 if(!craft)return;
 const drill=ship.resoluteDrill,drones=drill?.drones??[];
 for(const drone of drones){
  const at=resoluteOffset(craft,craft.heading,drone.dx+11*Math.sin(elapsed*1.1+drone.phase),
   drone.dy+9*Math.cos(elapsed*.85+drone.phase));
  const drag=Math.exp(-dt*4.3),vx=(drone.kvx??0)*drag,vy=(drone.kvy??0)*drag;
  const offsetX=clamp((drone.kx??0)+vx*dt,-26,26),offsetY=clamp((drone.ky??0)+vy*dt,-26,26);
  drone.prevX=drone.x??at.x;drone.prevY=drone.y??at.y;
  Object.assign(drone,{x:at.x+offsetX,y:at.y+offsetY,kx:offsetX,ky:offsetY,kvx:vx,kvy:vy});
 }
 const turrets=ship.resoluteGuns??=resoluteMounts.map(m=>({yaw:m.rest,readyAt:0}));
 const sourceScale=resoluteFlightLength/459,muzzleScale=sourceScale*44/160;
 const cover=[...obstacles,...(ship.hull??[]),p,...livingAllies()],targets=[...rivals,...drones],claimed=new Set();
 for(const [i,slot] of resoluteMounts.entries()){
  const gun=turrets[i],mount=resoluteOffset(craft,craft.heading,(slot.x-320)*sourceScale,(slot.y-354.5)*sourceScale);
  let target=null,score=Infinity;
  for(const candidate of targets){
   const r=Math.hypot(candidate.x-mount.x,candidate.y-mount.y);
   if(candidate.hp<=0||r>=420||firstSightCover(mount,candidate,cover,3))continue;
   const priority=r+(claimed.has(candidate)?600:0)+(candidate===drones[i]?-430:0);
   if(priority<score){target=candidate;score=priority;}
  }
  if(target)claimed.add(target);
  const desired=target?bearing(mount,target)-craft.heading+Math.PI/2:slot.rest;
  const turn=headingDelta(gun.yaw,desired);
  gun.yaw+=clamp(turn,-dt*2.4,dt*2.4);
  if(!target||Math.abs(turn)>.075||elapsed<gun.readyAt)continue;
  const angle=craft.heading+gun.yaw-Math.PI/2;
  const tips=[-18,22].map(x=>resoluteOffset(mount,angle+Math.PI/2,x*muzzleScale,-96*muzzleScale));
  if(tips.some(tip=>firstSightCover(tip,target,cover,3)))continue;
  gun.readyAt=elapsed+1.05;
  const gain=nearBattleGain(mount.x,mount.y);
  if(gain>=.035&&voices.size<10){
   const volume=Math.min(gain,.55);
   if(!playShotSample('ballistic',volume)){
    tone('triangle',177,55,.105,.24*volume);cannonCrack(volume);
   }else if(elapsed>=(ship.resoluteEchoAt??0)){
    ship.resoluteEchoAt=elapsed+.24;playShotSample('ballistic',volume*.22,true);
   }
  }
  for(const tip of tips){
   const speed=520;shots.push({...tip,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed,a:angle,weapon:'ballistic',damage:6,ally:true,owner:ship,allyRole:'resolute',
    resoluteMount:slot.id,...(target.resoluteDrone?{resoluteDrill:drill}:{})});
   burstRing(tip.x,tip.y,13,guns.ballistic.ring);
  }
 }
}
function paintResolute(ship,t,camera){
 const corvette=ship.resoluteCombat?ship:resoluteFormation(ship,t);
 if(!corvette||corvette.hp===0||!withinCamera(corvette,camera,resoluteFlightLength/2))return;
 g.save();g.translate(corvette.x,corvette.y);g.rotate(corvette.heading);
 paintResolutePads(ship.resoluteDock);
 // Draw the latched fighter above the pads but behind the original hull.
 const dock=ship.resoluteDock;
 if(dock&&dock.phase!=='approach'&&dock.phase!=='stored'&&dock.visible!==false){
  const dx=p.x-corvette.x,dy=p.y-corvette.y,u=Math.cos(corvette.heading),v=Math.sin(corvette.heading);
  g.save();g.translate(u*dx+v*dy,u*dy-v*dx);g.rotate(p.aim+Math.PI/2-corvette.heading);
  if(!paintFighterArt(0,dock.scale??1,p.fighter??stockFighterId))paintFallbackFighter(dock.scale??1);
  g.restore();
 }
 const unit=resoluteFlightLength/180;g.scale(unit,unit);
 const engine=g.createLinearGradient(0,83,0,109);engine.addColorStop(0,'#88ecff');engine.addColorStop(1,'#4276de00');
 g.fillStyle=engine;g.fillRect(-19,81,8,28);g.fillRect(11,81,8,28);
 if(!paintResoluteArt(ship.resoluteGuns)){
 // While the original art loads, use the existing simplified silhouette.
 const outline=[[-4,-90],[4,-90],[11,-67],[24,-48],[31,-28],[31,39],[22,55],[22,85],[11,90],
  [9,62],[-9,62],[-11,90],[-22,85],[-22,55],[-31,39],[-31,-28],[-24,-48],[-11,-67]];
 g.beginPath();outline.forEach(([x,y],i)=>i?g.lineTo(x,y):g.moveTo(x,y));g.closePath();
 g.fillStyle='#344d5d';g.strokeStyle='#a4bfcb';g.lineWidth=1.4;g.fill();g.stroke();
 g.beginPath();g.moveTo(-8,-58);g.lineTo(8,-58);g.lineTo(15,42);g.lineTo(0,62);g.lineTo(-15,42);g.closePath();
 g.fillStyle='#182a3a';g.fill();g.strokeStyle='#618291';g.stroke();
 for(const y of [-29,28])for(const x of [-23,23]){
  g.fillStyle='#13212d';g.strokeStyle='#91a4ad';g.beginPath();g.arc(x,y,5.8,0,TAU);g.fill();g.stroke();
 }
 g.fillStyle='#819eaa';g.fillRect(-27,-43,2,39);g.fillRect(25,-43,2,39);
 g.fillStyle='#c3ede6';g.fillRect(-7,-23,14,2.2);
 }
 g.restore();
 g.save();g.textAlign='center';g.font='bold 10px system-ui';g.strokeStyle='#101720';g.lineWidth=3;g.fillStyle='#b8f0e6';
 if(!ship.scaleFly){
  g.strokeText('RESOLUTE · ALLIED CORVETTE',corvette.x,corvette.y+resoluteFlightLength*.57);
  g.fillText('RESOLUTE · ALLIED CORVETTE',corvette.x,corvette.y+resoluteFlightLength*.57);
 }
 const health=corvette.resoluteCombat?corvette:ship.resoluteEscort;
 const shield=health?.aegis,flash=shield&&Math.abs(t-shield.hitAt)<.18;
 if(shield&&(flash||shield.hp>0&&t<shield.until)){
  g.save();g.beginPath();g.arc(corvette.x,corvette.y,resoluteFlightLength*.56,0,TAU);
  g.fillStyle=flash?'#82f4ff42':'#53cdef20';g.fill();
  g.strokeStyle=flash?'#c0ffff':'#73eaff90';g.lineWidth=flash?3:1.5;g.stroke();g.restore();
 }
 if(health&&!ship.scaleFly){
  const y=corvette.y+resoluteFlightLength*.57+6,hit=(health.hullHitUntil??0)>t;
  g.fillStyle='#20363e';g.fillRect(corvette.x-28,y,56,3);
  g.fillStyle=hit?'#ffc188':'#8bf1d8';g.fillRect(corvette.x-28,y,56*health.hp/health.maxHp,3);
 }
 g.restore();
 for(const drone of ship.resoluteDrill?.drones??[]){
 if(!Number.isFinite(drone.x)||!withinCamera(drone,camera,50))continue;
 g.save();g.translate(drone.x,drone.y);g.strokeStyle=drone.hp?'#f8d48c':'#879caa';
 g.lineWidth=2;g.beginPath();g.moveTo(0,-13);g.lineTo(13,0);g.lineTo(0,13);g.lineTo(-13,0);g.closePath();g.stroke();
 g.font='bold 10px system-ui';g.textAlign='center';g.fillStyle='#fce4a8';
 g.fillText('DRILL '+drone.id+' · '+(drone.hp?drone.hp+' HP':'DISABLED'),0,28);g.restore();
 }
}
const capitalDepthArt=new WeakMap();
function capitalDepthSprite(art){
 if(capitalDepthArt.has(art))return capitalDepthArt.get(art);
 // Bake a cool atmospheric grade into the opaque hull, never into the sky,
 // engine exhaust or landing lights. The cache is only for flight rendering.
 const h=Math.min(520,art.naturalHeight||520),w=Math.max(1,Math.round(h*292/438));
 let layer=typeof OffscreenCanvas==='function'?new OffscreenCanvas(w,h):null,ctx=layer?.getContext('2d');
 if(!ctx){
  layer=canvas.ownerDocument?.createElement('canvas');if(!layer)return art;
  layer.width=w;layer.height=h;ctx=layer.getContext?.('2d');
 }
 if(!ctx)return art;
 ctx.imageSmoothingQuality='high';
 ctx.drawImage(art,0,0,w,h);
 ctx.globalCompositeOperation='source-atop';
 ctx.fillStyle='#59789359';ctx.fillRect(0,0,w,h);
 capitalDepthArt.set(art,layer);
 return layer;
}
function paintCapital(t,camera,ship=capitalShip,hazeOpacity=1){if(!ship||!withinCamera(ship,camera,capitalCourse.height*.62))return;
 const {width:w,height:h}=capitalCourse,onBifrost=ship.vessel===bifrostCapital;
 const art=capitalArt.get(ship.vessel.id);
 g.save();g.translate(ship.x,ship.y);g.rotate(ship.aim+Math.PI/2);
 // The launch monitor's soft light follows the moving hull, not the camera.
 if(hazeOpacity>0){
  g.save();g.globalAlpha*=hazeOpacity;g.translate(0,h*.13);g.scale(1,1.38);
  const wash=g.createRadialGradient(0,0,32,0,0,213);
  wash.addColorStop(0,onBifrost?'#c282ff35':'#6cb1cd35');wash.addColorStop(.55,onBifrost?'#9864d227':'#4488aa27');wash.addColorStop(1,onBifrost?'#9864d200':'#4488aa00');
  g.fillStyle=wash;g.fillRect(-213,-213,426,426);g.restore();
 }
 if(onBifrost)paintBifrostExhaust(t,w,h);
 else{
  const aft=h*.448,flame=motion?.matches?23:23+2.5*Math.sin(t*2.8);
  const exhaust=g.createLinearGradient(0,aft,0,aft+flame);
  exhaust.addColorStop(0,'#99f6efbb');exhaust.addColorStop(.3,'#5ccdff61');exhaust.addColorStop(1,'#396bb100');
  g.fillStyle=exhaust;
  for(const x of [-.144,-.049,.049,.148]){
   g.beginPath();g.ellipse(x*w,aft+flame*.45,7,flame*.57,0,0,TAU);g.fill();
  }
 }
 if(art?.complete&&art.naturalWidth>0){
  const graded=hazeOpacity>0?capitalDepthSprite(art):art;
  if(hazeOpacity<1||graded===art)g.drawImage(art,-w/2,-h/2,w,h);
  if(graded!==art){
   g.save();g.globalAlpha*=hazeOpacity;g.drawImage(graded,-w/2,-h/2,w,h);g.restore();
  }
 }
 else if(onBifrost){
  g.fillStyle='#455370';g.strokeStyle='#a7bad3';g.lineWidth=2;
  poly([[0,-h*.46],[28,-h*.23],[50,-h*.11],[134,h*.27],[117,h*.39],[65,h*.36],[42,h*.46],[-42,h*.46],[-65,h*.36],[-117,h*.39],[-134,h*.27],[-50,-h*.11],[-28,-h*.23]]);
 }
 else{
  g.fillStyle='#344e66';g.strokeStyle='#93acbf';g.lineWidth=2;
  poly([[-34,-h*.48],[34,-h*.48],[70,-h*.16],[93,h*.22],[79,h*.42],[-79,h*.42],[-93,h*.22],[-70,-h*.16]]);
 }
 // Bifrost uses its painted runways. Pegasus retains its existing deck ticks.
 if(!onBifrost)for(const [i,[x,y]] of ship.pads.entries()){
  const active=i===ship.pad&&(ship.phase!=='stored'&&(ship.phase!=='flight'||p.dockingClearance));
  g.strokeStyle=active?'#abf5ddba':i===ship.recoveryPad?'#79c8e7cf':ship.deckCrew.some(crew=>crew.pad===i)?'#82b4e59e':'#d2b87d91';g.lineWidth=1;g.beginPath();
  for(const side of [-1,1])for(const end of [-1,1]){
   g.moveTo(x+side*10,y+end*4);g.lineTo(x+side*10,y+end*8);g.lineTo(x+side*6,y+end*8);
  }
  g.stroke();
 }
 g.restore();
}
function paintCapitalHullStatus(ship,camera){
 if(!ship?.maxHp)return;
 const anchor=berthWorld(ship,0,capitalCourse.height*.53);
 if(!withinCamera(anchor,camera,62))return;
 const {x,y}=anchor,w=104;
 g.save();g.textAlign='center';g.font='bold 10px system-ui';g.strokeStyle='#101720';g.lineWidth=3;
 g.fillStyle='#d1e6ff';const label=ship.name.toUpperCase()+' · '+Math.ceil(ship.hp)+' / '+ship.maxHp+' HP';
 g.strokeText(label,x,y);g.fillText(label,x,y);
 g.fillStyle='#20363e';g.fillRect(x-w/2,y+4,w,3);
 g.fillStyle=(ship.hullHitUntil??0)>elapsed?'#ffc188':'#8ac6fb';g.fillRect(x-w/2,y+4,w*ship.hp/ship.maxHp,3);
 g.restore();
}
function paintCrossVessel(ship,t,camera,hazeOpacity){
 paintCapital(t,camera,ship,hazeOpacity);
 if(!withinCamera(ship,camera,0))return;
 g.save();g.textAlign='center';g.font='bold 13px system-ui';g.fillStyle='#eed6ff';g.strokeStyle='#07121a';g.lineWidth=4;
 g.strokeText(ship.name,ship.x,ship.y);g.fillText(ship.name,ship.x,ship.y);g.restore();
}
function paintBlackwake(camera,ship=blackwake){
 if(ship?.redGrinSolo){paintRedGrinSolo(ship,camera);return;}
 if(ship?.convoy&&ship.hp&&state==='play'&&!withinCamera(ship,camera,-30))paintRedGrinContact(ship,camera);
 if(!ship||!withinCamera(ship,camera,165))return;
 const {x,y,turret}=ship,{width:w,height:h}=blackwakeHull;
 const hull=blackwakeArt.hull,weapon=blackwakeArt.turret;
 g.save();g.translate(x,y);g.lineWidth=3;
 g.save();if(!ship.hp)g.globalAlpha=.52;g.rotate(ship.yaw);
 if(ship.hp&&!duelResult&&ship.driveBurn>.035){
  const burn=ship.driveBurn,start=h*.44,spread=w*.22;
  const hot=burn>1.1,length=12+burn*36+(motion?.matches?0:Math.sin(elapsed*31+ship.patrolPhase)*2.5);
  const flame=g.createLinearGradient(0,start,0,start+length);
  flame.addColorStop(0,hot?'#fffef2':'#fff3c8');flame.addColorStop(.22,hot?'#ffedaa':'#ffb56e');
  flame.addColorStop(.57,'#ff653479');flame.addColorStop(1,'#ff482400');
  g.fillStyle=flame;
  for(const n of [-1,1]){
   const x=spread*n,edge=3+burn*3;
   g.beginPath();g.moveTo(x-edge,start);g.quadraticCurveTo(x-edge*1.1,start+length*.5,x,start+length);
   g.quadraticCurveTo(x+edge*1.1,start+length*.50,x+edge,start);g.closePath();g.fill();
   if(hot){
    g.fillStyle='#ffe09f';
    for(let i=0;i<(motion?.matches?1:4);i++){
     const t=motion?.matches?.62:(elapsed*7+i*.236+n*.5+1)%1;
     g.fillRect(x+n*t*8+(i-1.5)*2,start+length*.27+t*length*.94,1.3,4-2.4*t);
    }
    g.fillStyle=flame;
   }
  }
 }
 if(hull?.complete&&hull.naturalWidth>0)g.drawImage(hull,-w/2,-h/2,w,h);
 else{
  g.save();g.scale(w/170,h/256);
  g.fillStyle='#381c29';g.strokeStyle='#ffac91';
  poly([[-70,-83],[0,-128],[70,-83],[60,-38],[85,53],[46,98],[0,83],[-46,98],[-85,53],[-60,-38]]);
  g.fillStyle='#9e4e45';g.strokeStyle='#e78a77';
  poly([[0,-89],[29,-38],[22,38],[47,64],[0,47],[-47,64],[-22,38],[-29,-38]]);
  g.fillStyle='#ffa783';g.fillRect(-31,83,13,8);g.fillRect(18,83,13,8);g.restore();
 }
 g.restore();
 g.save();g.translate(turret.x-x,turret.y-y);g.rotate(turret.aim+Math.PI/2);
 const {width,height,pivotX,pivotY,muzzle}=blackwakeGimbal;
 if(weapon?.complete&&weapon.naturalWidth>0)g.drawImage(weapon,-width*pivotX,-height*pivotY,width,height);
 else{
  g.strokeStyle='#b9b5a0';g.fillStyle='#555359';g.beginPath();g.arc(0,0,11,0,TAU);g.fill();g.stroke();
  g.fillStyle='#a4a198';g.fillRect(-5,-muzzle,10,muzzle+5);
 }
 if(ship.convoy&&ship.telegraph){
  g.strokeStyle='#ffd996';g.lineWidth=2;g.beginPath();g.arc(0,0,14,0,TAU);g.stroke();
 }
 if(elapsed<turret.flashUntil){
  g.fillStyle='#ffd4a0';g.beginPath();g.arc(0,-muzzle,4,0,TAU);g.fill();
 }
 g.restore();
 g.fillStyle='#ffbfaa';g.textAlign='center';g.font='bold 13px system-ui';g.lineWidth=4;g.strokeStyle='#140e17';
 const labelY=-Math.abs(Math.cos(ship.yaw))*h/2-Math.abs(Math.sin(ship.yaw))*w/2-14;
 const name=ship.name.toUpperCase()+(ship.hp?'':' DISABLED');
 g.strokeText(name,0,labelY);g.fillText(name,0,labelY);
 if(ship.objective&&ship.hp){g.fillStyle='#291924';g.fillRect(-32,labelY+5,64,3);
  g.fillStyle='#ffab7e';g.fillRect(-32,labelY+5,64*ship.hp/ship.maxHp,3);}
 g.restore();
}
function paintEscort(camera){
 const ship=escortShip,target=escortPoint();
 if(withinCamera(ship,camera,80)){
  g.save();g.translate(ship.x,ship.y);g.rotate(ship.aim+Math.PI/2);
  const plume=g.createLinearGradient(0,55,0,76);
  plume.addColorStop(0,'#9cfbffb8');plume.addColorStop(1,'#4dcaff00');g.fillStyle=plume;
  for(const x of [-14,14]){g.beginPath();g.ellipse(x,63,5,13,0,0,TAU);g.fill();}
  g.fillStyle='#382f2d';g.strokeStyle='#ca925c';g.lineWidth=2;
  poly([[-32,-36],[-20,-56],[20,-56],[32,-36],[32,40],[20,56],[-20,56],[-32,40]]);
  g.fillStyle='#765a40';g.fillRect(-23,-17,46,41);
  g.fillStyle='#bb9d63';
  for(const y of [-15,-2,11])g.fillRect(-23,y,46,4);
  g.fillStyle='#87e8e4';g.fillRect(-12,-41,24,5);
  g.fillStyle='#ffc289';g.fillRect(-23,46,46,4);g.restore();
  g.fillStyle='#f8d6a8';g.font='700 12px system-ui';g.textAlign='center';g.fillText('ORION',ship.x,ship.y-72);
 }
 g.save();g.strokeStyle='#82e4e3';g.fillStyle='#a4f9ef';g.lineWidth=1.5;
 if(withinCamera(target,camera,-22)){
  g.setLineDash([4,5]);g.beginPath();g.arc(target.x,target.y,24,0,TAU);g.stroke();g.setLineDash([]);
  g.font='700 10px system-ui';g.textAlign='center';g.fillText('ESCORT SLOT',target.x,target.y+34);
 }else{
  const x=camera.x+camera.w/2,y=camera.y+camera.h/2,dx=target.x-x,dy=target.y-y;
  const t=Math.min((camera.w/2-22)/Math.max(.001,Math.abs(dx)),(camera.h/2-22)/Math.max(.001,Math.abs(dy)));
  g.translate(x+t*dx,y+t*dy);g.rotate(Math.atan2(dy,dx));g.lineWidth=0;poly([[10,0],[-7,-7],[-3,0],[-7,7]]);
 }
 g.restore();
}
function paintResoluteDockGuide(t,camera){
 const dock=capitalShip?.resoluteDock;
 if(dock?.phase!=='approach')return;
 const k=resolutePad;
 if(!motion?.matches&&(elapsed-dock.at)/k.extend<.22)return;
 const craft=resoluteFormation(capitalShip,t);
 if(!craft||!withinCamera(craft,camera,resoluteFlightLength*.75))return;
 g.save();g.translate(craft.x,craft.y);g.rotate(craft.heading);
 g.beginPath();g.arc(dock.side*k.center,k.y,k.radius,0,TAU);
 g.strokeStyle='#92fce6';g.lineWidth=2;g.stroke();g.restore();
}
function paintCapitalApproach(camera){
 const check=capitalDockCheck();if(!check)return;
 const {port,ready}=check,c=capitalShip,padding=25,r=capitalBerth.maxGap;
 const inside=withinCamera(port,camera,-padding);
 const teal=ready?'#8effbe':'#53e1dc',pulse=motion?.matches?.78:.78+.14*Math.sin(elapsed*3.2);
 g.save();g.strokeStyle=teal;g.fillStyle=teal;
 if(withinCamera(port,camera,r)){
  g.save();g.translate(port.x,port.y);g.rotate(c.aim+Math.PI/2);
  const light=g.createRadialGradient(0,0,2,0,0,r);
  light.addColorStop(0,ready?'#54e3a24a':'#41d7df42');
  light.addColorStop(.42,'#2cdbe51d');light.addColorStop(.87,'#31cdd31c');light.addColorStop(1,'#31cdd300');
  g.fillStyle=light;g.fillRect(-r,-r,r*2,r*2);
  g.globalAlpha=pulse*.77;g.lineWidth=2;
  for(let i=0;i<4;i++){
   const start=i*Math.PI/2+.13;
   g.beginPath();g.arc(0,0,r,start,start+1.31);g.stroke();
  }
  g.globalAlpha=pulse;g.lineWidth=2;g.beginPath();
  for(const y of [42,62,82]){
   g.moveTo(-9,y);g.lineTo(0,y-8);g.lineTo(9,y);
  }
  g.moveTo(0,-14);g.lineTo(0,7);g.moveTo(-8,-6);g.lineTo(0,-14);g.lineTo(8,-6);g.stroke();
  g.restore();
 }
 if(inside){
  g.font='750 11px system-ui';g.textAlign='center';g.fillText(ready?'DOCK READY':'AFT DOCK',port.x,port.y-46);
 }else{
  const x=camera.x+camera.w/2,y=camera.y+camera.h/2,dx=port.x-x,dy=port.y-y;
  const dist=Math.min((camera.w/2-padding)/Math.max(.001,Math.abs(dx)),(camera.h/2-padding)/Math.max(.001,Math.abs(dy)));
  g.translate(x+dx*dist,y+dy*dist);g.rotate(Math.atan2(dy,dx));g.lineWidth=0;poly([[12,0],[-7,-8],[-3,0],[-7,8]]);
 }
 g.restore();
}
function paintTileGate(camera,edge,fourWay=false,returning=false,cross=false,rejoin=false){
 const gate=tileGate(edge);if(!gate)return;
 const v=gate.axis==='x',start=v?camera.x:camera.y,span=v?camera.w:camera.h;
 const end=start+span;
 const shown=gate.line>=start+12&&gate.line<=end-12;
 const mark=clamp(gate.line,start+36,end-36),x=v?mark:camera.x+camera.w/2,y=v?camera.y+camera.h/2:mark;
 const [dx,dy]=gate.vector;
 g.save();g.strokeStyle='#a5ffc5';g.fillStyle='#c9ffe1';g.lineWidth=2;
 if(shown){
  g.beginPath();
  if(v){g.moveTo(gate.line,camera.y);g.lineTo(gate.line,camera.y+camera.h);}
  else{g.moveTo(camera.x,gate.line);g.lineTo(camera.x+camera.w,gate.line);}
  g.stroke();
 }
 g.save();g.translate(x-dx*11,y-dy*11);g.rotate(Math.atan2(dy,dx));
 g.lineWidth=0;poly([[8,0],[-6,-6],[-6,6]]);g.restore();
 const label=(returning?'RETURN TO BATTLE FLEET MAP':rejoin?'REJOIN CORSAIR':cross?'BLACKWAKE':fourWay?'4-WAY ARENA':'CORSAIR CLUSTER')+' · '+edge.toUpperCase();
 g.font='bold 11px system-ui';g.textAlign='center';g.strokeStyle='#081925';g.lineWidth=3;
 const tx=clamp(x,camera.x+85,camera.x+camera.w-85),ty=y-dy*17+(v?-19:0);
 g.strokeText(label,tx,ty);g.fillText(label,tx,ty);g.restore();
}
function paintSortieGate(camera){
 const sortie=pendingCarrierSortie;
 if(!sortie||sortie.failed||capitalShip?.phase!=='flight')return;
 if(sortie.mode.tileTest){if(sortie.approach)paintTileGate(camera,sortie.approach.exitEdge,!!sortie.mode.fourWay,false,!!sortie.mode.crossBattle,!!sortie.resume);return;}
 const y=sortieGateY(),onscreen=y<=camera.y+camera.h-16;
 const cx=clamp(p.x,camera.x+28,camera.x+camera.w-28);
 g.save();g.strokeStyle='#7cf6da';g.fillStyle='#b8ffef';g.lineWidth=2;
 g.beginPath();
 if(onscreen){
  g.moveTo(Math.max(arena.left,camera.x),y);g.lineTo(Math.min(arena.right,camera.x+camera.w),y);g.stroke();
 }
 const markerY=onscreen?y-20:camera.y+camera.h-25;
 g.beginPath();g.moveTo(cx-7,markerY-6);g.lineTo(cx,markerY);g.lineTo(cx+7,markerY-6);g.stroke();
 g.textAlign='center';g.font='bold 11px system-ui';
 g.strokeStyle='#081925';g.lineWidth=3;
 const label=onscreen?'DEPARTURE BOUNDARY':'FLY SOUTH TO DEPART';
 g.strokeText(label,camera.x+camera.w/2,markerY-12);g.fillText(label,camera.x+camera.w/2,markerY-12);
 g.restore();
}
function paintFlightGuide(camera,training){
 const north=floorNorth(),height=H-north;
 g.save();
 if(training){
  g.lineWidth=1;g.strokeStyle='#83bbb820';g.beginPath();
  for(let x=48;x<W;x+=48){g.moveTo(x,camera.y);g.lineTo(x,camera.y+camera.h);}
  for(let y=Math.max(north+48,Math.ceil(camera.y/48)*48);y<Math.min(H,camera.y+camera.h);y+=48){
   g.moveTo(camera.x,y);g.lineTo(camera.x+camera.w,y);
  }
  g.stroke();
 }
 // The navigable limit remains legible without painting a floor over space.
 g.strokeStyle=training?'#8dbab66b':'#638eaa53';g.lineWidth=1.3;
 g.setLineDash([11,14]);g.strokeRect(arena.left,north+edge,arena.right-arena.left,height-edge*2);
 g.restore();
}
function softShadow(x,y,rx,ry,opacity=.48){
 g.save();g.translate(x,y);g.scale(rx,ry);
 const shade=g.createRadialGradient(0,0,.23,0,0,1);shade.addColorStop(0,'rgba(0,0,0,'+opacity+')');shade.addColorStop(1,'#0000');
 g.fillStyle=shade;g.fillRect(-1,-1,2,2);g.restore();
}
function paintRangeTarget(target){
 if(target.cleared)return;
 const {x,y,r}=target;
 g.save();g.strokeStyle='#8cf3e3';g.fillStyle='#102c3c';g.lineWidth=2;
 g.beginPath();g.arc(x,y,r,0,TAU);g.fill();g.stroke();
 g.lineWidth=1.35;g.beginPath();g.arc(x,y,r*.55,0,TAU);g.stroke();
 g.fillStyle='#9af9e7';g.beginPath();g.arc(x,y,2.5,0,TAU);g.fill();g.restore();
}
function paintCone(c){
 const {x,y,r}=c,k=r/13;
 softShadow(x+5,y+6,r*1.40,r*1.07,.62);
 g.save();g.translate(x,y);g.rotate(c.angle??0);g.scale(k,k);
 g.fillStyle='#3c2d20';g.strokeStyle='#1b1612';g.lineWidth=1.4;
 poly([[-10,-11],[10,-11],[13,-7],[13,7],[9,11],[-9,11],[-13,7],[-13,-7]]);
 g.fillStyle='#d3591d';g.strokeStyle='#722c16';g.lineWidth=1.2;
 poly([[-8,6],[-4,-8],[2,-10],[7,-3],[8,6],[2,9],[-3,9]]);
 g.fillStyle='#ffad27';g.lineWidth=0;
 poly([[-8,6],[-4,-8],[0,-10],[0,3],[-3,9]]);
 g.fillStyle='#fff3b7';poly([[-6,-1],[5,-1],[6,2],[-7,3]]);
 g.fillStyle='#fff6bd';g.beginPath();g.ellipse(0,-7,2.8,2.3,0,0,TAU);g.fill();
 g.restore();
}
function updateFlightVisual(ship,dt,cruiseSpeed,entering=false){
 let pose=flightVisuals.get(ship);
 if(!pose){pose={x:ship.x,y:ship.y,bank:0,speed:0};flightVisuals.set(ship,pose);}
 const vx=entering?(dt>0?(ship.x-pose.x)/dt:0):ship.vx;
 const vy=entering?(dt>0?(ship.y-pose.y)/dt:0):ship.vy;
 pose.x=ship.x;pose.y=ship.y;
 if(motion?.matches){pose.bank=pose.speed=0;return;}
 pose.speed=Math.hypot(vx,vy);
 // Project onto each ship's local right axis, not the screen's X axis.
 const lateral=-Math.sin(ship.aim)*vx+Math.cos(ship.aim)*vy;
 const deadZone=clamp(cruiseSpeed*.09,3.5,18),span=Math.max(8,cruiseSpeed*.31);
 const target=Math.sign(lateral)*clamp((Math.abs(lateral)-deadZone)/span,0,1);
 pose.bank+=(target-pose.bank)*(1-Math.exp(-12*dt));
 if(!target&&Math.abs(pose.bank)<.02)pose.bank=0;
 if(ship===p&&ship.fighter===stockFighterId&&target!==0&&fighterSprite){
  const side=target<0?'left':'right';
  if(!fighterBankArts[side]){
   const sprite=new window.Image();fighterBankArts[side]=sprite;
   sprite.src='./fighter-bank-'+side+'.webp';
  }
 }
}
function hoverBob(t,speed){
 // Same phase at idle and in flight, with a more readable swing at speed.
 return Math.sin(t*6)*(1.25+1.20*clamp(speed/120,0,1));
}
function paintFighterArt(bank,size=1,id=stockFighterId){
 const sprite=flightSpriteFor(id);
 if(id===civilianFreighter.id)size*=civilianFreighter.artLengthScale;
 if(!sprite?.complete||sprite.naturalWidth<=0)return false;
 if(id!==stockFighterId){
  const height=sprite.naturalHeight||sprite.naturalWidth,scale=Math.min(87.36/sprite.naturalWidth,58.24/height)*size;
  const w=sprite.naturalWidth*scale,h=height*scale;
  g.drawImage(sprite,-w/2,-h/2,w,h);return true;
 }
 const bounds=[-43.68*size,-28.22*size,87.36*size,riftFourFlightLength*size];
 const lean=Math.abs(bank),art=fighterBankArts[bank<0?'left':'right'];
 if(lean<.025||!art?.complete||art.naturalWidth<=0){
  g.drawImage(fighterSprite,...bounds);return true;
 }
 // Both silhouette frames share exactly the same local center and nose.
 if(lean>=.985){g.drawImage(art,...bounds);return true;}
 const opacity=g.globalAlpha;
 g.globalAlpha=opacity*(1-lean);g.drawImage(fighterSprite,...bounds);
 g.globalAlpha=opacity*lean;g.drawImage(art,...bounds);
 g.globalAlpha=opacity;return true;
}
// Damage smoke is cosmetic and stays at its world position when a ship
// turns. It does not consume gameplay RNG, affect spotting, or modify HP.
const damageSmoke=[];
let damageSmokeStep=0,damageSmokeSerial=0;
function resetDamageSmoke(){damageSmoke.length=0;damageSmokeStep=0;damageSmokeSerial=0;}
function smokeEligible(ship){
 return ship&&Number.isFinite(ship.hp)&&Number.isFinite(ship.maxHp)&&ship.maxHp>0&&ship.hp>0&&ship.hp<ship.maxHp*.5;
}
function emitDamageSmoke(ship,heading,size,reduced,armadaRole){
 if(!smokeEligible(ship)||!Number.isFinite(heading)||!Number.isFinite(ship.x)||!Number.isFinite(ship.y))return;
 const serial=++damageSmokeSerial,ux=Math.cos(heading),uy=Math.sin(heading);
 const severity=1-ship.hp/ship.maxHp,drift=Math.sin(serial*2.399)*size;
 const aft=riftFourFlightLength*.39*size,life=(reduced?.83:1.65)*Math.min(size,1.25);
 damageSmoke.push({x:ship.x-ux*aft,y:ship.y-uy*aft,r:(6+severity*5)*Math.sqrt(size),life,born:elapsed,armadaRole,
  vx:-ux*11-uy*drift*5,vy:-uy*11+ux*drift*5});
}
function advanceDamageSmoke(dt){
 while(damageSmoke.length&&damageSmoke[0].born+2.1<=elapsed)damageSmoke.shift();
 damageSmokeStep+=dt;
 const reduced=!!motion?.matches,interval=reduced?.25:.11;
 if(damageSmokeStep<interval)return;
 damageSmokeStep%=interval;
 if(onlineBattle){
  for(const ship of onlineBattle.state.ships){
   const pose=onlinePos.get(ship.id)?.draw??ship;
   emitDamageSmoke(pose,pose.heading,onlineBlackwake(ship)?2:1,reduced);
  }
 }else if(state==='play'||state==='watch'||state==='arrive'||state==='depart'){
  const player=missionDeparture?.craft??p;
  if(!isCrossWatch()&&!capitalLocked())emitDamageSmoke(player,player.aim,1,reduced);
  for(const ally of livingAllies())emitDamageSmoke(ally,ally.aim,1,reduced);
  const rivals=[...activeVanduls(),...(vandulIngress?[vandulIngress]:[])].filter(smokeEligible);
  if(rivals.length){
   const blockers=visionBlockers();
   for(const body of rivals)if(playerCanSee(body,blockers))emitDamageSmoke(body,body.aim,1,reduced);
  }
  for(const ship of pirateCapitals)emitDamageSmoke(ship,ship.yaw-Math.PI/2,2,reduced);
  const corvette=battleResolute()??capitalShip?.resoluteEscort;
  if(corvette)emitDamageSmoke(corvette,corvette.heading-Math.PI/2,4.6,reduced,capitalShip?'corvette':undefined);
  // Some formation scenery is not damageable yet. Use a real HP pair
  // when one exists rather than treating an undefined health as damage.
  for(const ship of [capitalShip,capitalShip?.supportFleet,escortShip])
   if(ship)emitDamageSmoke(ship,ship.aim,5,reduced,ship===capitalShip?'carrier':ship===capitalShip?.supportFleet?'support':undefined);
 }
 if(damageSmoke.length>180)damageSmoke.splice(0,damageSmoke.length-180);
}
function paintDamageSmoke(camera,t,fleet){
 if(!damageSmoke.length)return;
 g.save();
 for(const puff of damageSmoke){
  const age=t-puff.born,f=age/puff.life,opacity=fleet[puff.armadaRole]??1;
  if(f>=1||opacity===0)continue;
  const x=puff.x+puff.vx*age,y=puff.y+puff.vy*age,r=puff.r*(1+f*1.35);
  if(x+r<camera.x||x-r>camera.x+camera.w||y+r<camera.y||y-r>camera.y+camera.h)continue;
  const haze=g.createRadialGradient(x,y,0,x,y,r);
  haze.addColorStop(0,'#78838c');haze.addColorStop(.55,'#606a74');haze.addColorStop(1,'#545d6600');
  g.globalAlpha=opacity*.56*(1-f)**1.45;
  g.fillStyle=haze;g.fillRect(x-r,y-r,r*2,r*2);
 }
 g.restore();
}
function paintMainExhaust(t){
 // Local positive Y is aft. A few analytical particles keep the effect
 // soft and lively without keeping an emitter alive after boost release.
 const steady=motion?.matches,length=steady?61:69+4*Math.sin(t*19);
 g.save();g.lineWidth=0;
 for(let i=0;i<(steady?2:3);i++){
  const age=steady?.42+i*.22:(t*.84+i*.337)%1;
  const x=(i-1)*age*16+(steady?0:Math.sin(t*5+i*2.2)*age*7);
  const y=48+age*49,r=5+age*18;
  const smoke=g.createRadialGradient(x,y,0,x,y,r);
  smoke.addColorStop(0,'#9aafbcba');smoke.addColorStop(.48,'#768d9c73');smoke.addColorStop(1,'#6d879700');
  g.globalAlpha=.17*Math.sin(age*Math.PI);g.fillStyle=smoke;
  g.beginPath();g.ellipse(x,y,r*.8,r,0,0,TAU);g.fill();
 }
 g.globalCompositeOperation='screen';
 const halo=g.createRadialGradient(0,42,1,0,47,28);
 halo.addColorStop(0,'#55e9ff70');halo.addColorStop(.5,'#36c3f635');halo.addColorStop(1,'#238beb00');
 g.globalAlpha=.52;g.fillStyle=halo;g.fillRect(-34,14,68,66);
 for(const [at,width,reach,strength,color] of [
  [.14,8,.23,.80,'#fffbe0'],[.31,11,.29,.63,'#a8fff2'],
  [.55,9,.31,.48,'#52d8fa'],[.80,5.8,.20,.33,'#359ef7']
 ]){
  g.save();g.translate(steady?0:Math.sin(t*13+at*5)*at*2,18+at*length);
  g.scale(width,reach*length);
  const lobe=g.createRadialGradient(0,0,0,0,0,1);
  lobe.addColorStop(0,color);lobe.addColorStop(.36,color+'94');lobe.addColorStop(1,'#2e8ffd00');
  g.globalAlpha=strength;g.fillStyle=lobe;g.beginPath();g.arc(0,0,1,0,TAU);g.fill();
  g.restore();
 }
 if(!steady)for(let i=0;i<7;i++){
  const age=(t*(2.25+(i%3)*.39)+i*.147)%1;
  const x=(i%2?-1:1)*(2+age*(5+i*1.9)),y=23+age*(46+i*4);
  g.globalAlpha=.59*Math.sin(age*Math.PI)*(1-age*.45);g.fillStyle='#cafff2';
  g.fillRect(x,y,.7+(.35*(i%3)),1.4+age*1.9);
 }
 g.globalAlpha=1;g.restore();
}
function paintFallbackFighter(size){
  if(size!==1)g.scale(size,size);
  g.fillStyle='#122729';g.strokeStyle='#080e12';g.lineWidth=3;
  poly([[-22,-10],[-13,-18],[13,-18],[22,-10],[23,12],[15,19],[-15,19],[-23,12]]);
  g.fillStyle='#337369';g.strokeStyle='#a7e9ce';g.lineWidth=1.1;
  poly([[-21,-8],[-13,-16],[13,-16],[21,-8],[20,10],[14,16],[-14,16],[-20,10]]);
  g.fillStyle='#113435';g.strokeStyle='#72c5b2';
  poly([[-19,-10],[-13,-11],[-10,7],[-14,14],[-21,9]]);
  poly([[19,-10],[13,-11],[10,7],[14,14],[21,9]]);
  g.fillStyle='#a6c9c0';g.strokeStyle='#153d3d';
  poly([[0,-20],[10,-9],[8,10],[0,14],[-8,10],[-10,-9]]);
  g.fillStyle='#122732';g.strokeStyle='#a8e3d8';g.lineWidth=1;
  poly([[-5,-7],[0,-12],[5,-7],[4,3],[-4,3]]);
  g.fillStyle='#f2aa58';g.fillRect(-3,-22,6,8);
  g.fillStyle='#6affd4';g.fillRect(-16,11,4,4);g.fillRect(12,11,4,4);

}
function paintCapitalCrew(camera){
 const ship=capitalShip;
 if(!ship)return;
 const intake=ship.wingIntake,visual=ship.deckCrew.slice();
 if(intake){
  const t=intake.time/intake.duration,q=smoothBerth(t),fade=smoothBerth((t-.8)/.2);
  visual.push({phase:'intake',lx:intake.from.x+(ship.lift.x-intake.from.x)*q,
   ly:intake.from.y+(ship.lift.y-intake.from.y)*q,heading:intake.aim*(1-q),scale:1-.86*fade,opacity:1-fade});
 }
 for(const member of visual){
  const point=berthWorld(ship,member.lx,member.ly),aim=ship.aim+member.heading;
  point.x+=member.drift?.x??0;point.y+=member.drift?.y??0;
  if(!withinCamera(point,camera,51))continue;
  g.save();g.globalAlpha*=member.opacity??1;g.translate(point.x,point.y);g.rotate(aim+Math.PI/2);
  if(!paintFighterArt(0,member.scale,member.hull??stockFighterId))paintFallbackFighter(member.scale);
  if(member.phase!=='parked'&&member.scale>.52){
   g.fillStyle='#82bff4be';g.beginPath();g.ellipse(0,27*member.scale,3.4,8*member.scale,0,0,TAU);g.fill();
  }
  g.restore();
  if(member.phase!=='parked'&&member.scale>.52){
   g.save();g.fillStyle='#bfe9ff';g.font='700 10px system-ui';g.textAlign='center';
   g.fillText(member.corsair||member.phase==='intake'?'WING TWO':'WING '+(member.pad+1),point.x,point.y+31);g.restore();
  }
 }
}
function paintHover(ship,t){
 const {x,y,aim:a}=ship,berthing=ship===p&&capitalLocked();
 if(ship===p&&resoluteLatched())return;
 if(berthing&&capitalShip.phase==='stored')return;
 const bw=ship===p&&blackwaterLatched()?capitalShip.blackwaterLanding:null;
 const recoveryParked=ship===p&&fighterBattle?.repairAt!=null;
 const scaleParked=ship===p&&(!!scaleFlyShips?.parked||recoveryParked);
 const lift=bw||scaleParked?0:berthing?berthLift(capitalShip):1,storage=berthing&&!bw?storageProgress(capitalShip):0;
 // Fit the wider vessel within one carrier bay while docked, then blend to its normal flight size.
 const parkedScale=capitalBerth.parkScale*(ship.fighter===civilianFreighter.id?.66:1);
 const size=recoveryParked?.46:scaleParked?scaleFlyShips.parked.parkedScale:bw?bw.scale:berthing?parkedScale+(1-parkedScale)*lift+(capitalBerth.innerScale-parkedScale)*storage:1;
 const lively=!berthing&&!scaleParked&&!motion?.matches&&(state==='play'||state==='arrive'||(state==='depart'&&missionDeparture?.flying)),pose=flightVisuals.get(ship);
 const height=8*lift+(lively?hoverBob(t,pose?.speed??0):0),push=lively?recoil*35:0;
 if(lift>0)softShadow(x+4*lift,y+7*lift,31*size,23*size,.68*lift);
 g.save();g.translate(x-Math.cos(a)*push,y-height-Math.sin(a)*push);g.rotate(a+Math.PI/2+fighterTumbleAngle(ship));
 if(storage>0)g.globalAlpha=capitalShip.deckCrew.length?
  1-smoothBerth((storage-.26)/.27):1-smoothBerth((storage-.70)/.30);
 if(lift>0){
 const wash=g.createRadialGradient(0,14,2,0,14,26);
 wash.addColorStop(0,'#53fbe45c');wash.addColorStop(1,'#4ce9e000');
 g.fillStyle=wash;g.fillRect(-27,-13,54,54);
 }
 if(!berthing&&ship===p&&ship.mainThrustActive&&(holdsMainThrust()||surgeActive())&&state==='play'&&!document.hidden){
  if(surgeActive()){g.save();g.scale(1.22,1.22);paintMainExhaust(t);g.restore();}
  else paintMainExhaust(t);
 }
 // Enlarge only the drawing; keep the nose aligned with the existing muzzle.
 if(!paintFighterArt(lively?(pose?.bank??0):0,size,ship.fighter??stockFighterId))paintFallbackFighter(size);
 if(!berthing&&state==='play'&&recoil>0&&!paintWingPodFlash(ship,Math.min(1,recoil*13))){
  g.globalAlpha=Math.min(1,recoil*13);g.lineWidth=0;g.fillStyle='#ffab49';
  poly([[0,-47],[-4,-35],[-12,-32],[-4,-28],[-2,-21],[2,-21],[4,-28],[12,-32],[4,-35]]);
  g.fillStyle='#fff3ce';poly([[0,-42],[-4,-31],[0,-24],[4,-31]]);
 }
 g.restore();
}
function paintFieldDebris(body){
 const {x,y,r,angle,shape,hitGlow}=body;
 softShadow(x+2,y+2,r*1.12,r*.77,.42);
 g.save();g.translate(x,y);g.rotate(angle);
 g.fillStyle=hitGlow>0?'#708a92':'#3e4752';g.strokeStyle='#6f8391';g.lineWidth=.9;poly(shape);
 g.fillStyle='#a09e80';g.fillRect(-r*.38,-r*.12,r*.69,1);g.restore();
}
function paintAsteroid(body){
 const {x,y,r,angle,profile}=body,d=profile.drawSize/2;
 softShadow(x+6,y+8,r*1.16,r*.85,.73);
 g.save();g.translate(x,y);g.rotate(angle);
 if(asteroidAtlas?.complete&&asteroidAtlas.naturalWidth>=576&&asteroidAtlas.naturalHeight>=192){
  g.drawImage(asteroidAtlas,profile.tile*192,0,192,192,-d,-d,d*2,d*2);
 }else{
  const shape=Array.from({length:9},(_,i)=>{
   const a=TAU*i/9,v=d*(.69+.14*Math.sin(i*13+profile.tile*3));return [Math.cos(a)*v,Math.sin(a)*v];
  });
  g.fillStyle=['#786b5c','#596575','#6d666c'][profile.tile];g.strokeStyle='#948982';g.lineWidth=2;poly(shape);
  g.fillStyle='#393d3e';g.lineWidth=0;poly([[-d*.37,-d*.2],[-d*.19,-d*.37],[d*.16,-d*.16],[d*.24,d*.12],[-d*.24,d*.18]]);
 }
 g.restore();
}
function paintVandulBody(ship,t){
 const {x,y,hitGlow}=ship,lively=!motion?.matches&&(state==='play'||state==='watch'),pose=flightVisuals.get(ship);
 const bank=lively?(pose?.bank??0):0,offset=lively?hoverBob(t+(ship.slot??1)*.10,pose?.speed??0):0;
 softShadow(x+4,y+6,27,24,.65);
 g.save();g.translate(x,y-offset);g.rotate(vandulHullAngle(ship));
 if(Math.abs(bank)>=.025)g.transform(1-.09*Math.abs(bank),0,.14*bank,1,0,0);
 if(ship.rivalEdge){
  if(!paintFighterArt(bank,1,stockFighterId))paintFallbackFighter(1);
 }else if(vandulSprite?.complete&&vandulSprite.naturalWidth>0){
  const w=67.2,h=Math.min(69.44,w*vandulSprite.naturalHeight/vandulSprite.naturalWidth)||67.2;
  g.drawImage(vandulSprite,-w/2,-h/2,w,h);
 }else{
  g.fillStyle=hitGlow>0?'#936785':'#453654';g.strokeStyle='#d591e1';g.lineWidth=2;
  poly([[-26,-21],[-13,-12],[0,-4],[13,-12],[26,-21],[23,5],[13,16],[0,19],[-13,16],[-23,5]]);
  g.fillStyle='#ffc2d9';g.fillRect(-3,0,6,8);
 }
 g.restore();
 if(ship.rivalEdge||ship.pirateEscort){
  g.save();g.textAlign='center';g.font='bold 11px system-ui';g.lineWidth=3;g.strokeStyle='#07121a';g.fillStyle=ship.pirateEscort?'#ffad91':fourWayOrigins[ship.rivalEdge].color;
  const label=ship.pirateEscort?'PIRATE ESCORT '+ship.slot:ship.rivalEdge.toUpperCase()+' RIVAL';
  g.strokeText(label,x,y-40);g.fillText(label,x,y-40);g.restore();
 }
}
function paintThermalContact(ship){
 g.save();g.strokeStyle='#ffad82';g.lineWidth=1.5;g.globalAlpha=.85;
 g.setLineDash([4,3]);g.beginPath();g.arc(ship.x,ship.y,15,0,TAU);g.stroke();g.restore();
}
function paintVandulContact(ship){
 const seen=ship.playerContact;
 if(!seen)return;
 const left=1-(duelClock-(ship.playerSightLostAt??seen.at))/vandulContactSeconds;
 if(left<=0)return;
 g.save();g.strokeStyle='#f4c9f7';g.lineWidth=1.3;g.globalAlpha=.70*left;
 g.setLineDash([3,4]);g.beginPath();g.arc(seen.x,seen.y,13,0,TAU);g.stroke();g.restore();
}
function paintVandul(ship,t){
 const {x,y,aim}=ship;
 if(state==='play'&&ship.drive?.phase==='tell'){
  const {gate,exit}=ship.drive;
  g.save();g.strokeStyle='#bb9aff';g.globalAlpha=.7;g.lineWidth=2;g.setLineDash([7,5]);
  g.beginPath();g.moveTo(x,y);g.lineTo(gate.x,gate.y);g.lineTo(exit.x,exit.y);g.stroke();g.restore();
 }
 const guess=ship.blindShot?.target??ship.laserBurst?.guess?.target;
 const charging=ship.laserBurst||ship.heat+vandulHeat.shot<vandulHeat.max&&ship.nextLaser-duelClock<=vandulProfile.laser.windup;
 if(state==='play'&&!ship.overheated&&(guess||ship.seesTarget&&!ship.thermalTracking&&charging)){
  const u=Math.cos(aim),v=Math.sin(aim),near=ship.r+4,far=near+50;
  g.save();g.strokeStyle=guess?'#fdd68e':'#ff9bb7';g.lineWidth=1.7;g.setLineDash([5,4]);
  g.beginPath();g.moveTo(x+u*near,y+v*near);g.lineTo(x+u*far,y+v*far);g.stroke();g.restore();
 }
 if(ship.heat>=vandulHeat.ventAt||ship.overheated){
  const still=motion?.matches,u=Math.cos(aim),v=Math.sin(aim);
  g.save();g.fillStyle='#bac9d3';
  for(let i=0;i<(still?1:3);i++){
   const k=still?.4:(t*.95+i/3)%1,d=ship.r+4+13*k,side=(i-1)*5;
   g.globalAlpha=(ship.overheated?.36:.20)*(1-k*.75);
   g.beginPath();g.ellipse(x-u*d-v*side,y-v*d+u*side,4+6*k,2+4*k,aim,0,TAU);g.fill();
  }
  g.restore();
 }
 paintVandulBody(ship,t);
 g.save();g.font='bold 12px system-ui';g.textAlign='center';g.lineWidth=3;
 g.strokeStyle='#23162c';g.fillStyle='#fed3ff';
 const label=isCrossWatch()?ship.hp+'/'+ship.maxHp+' HP':'VANDUL '+(waveSize()>1?ship.slot+' · ':'')+ship.hp+'/'+ship.maxHp+(ship.bonus?' · +'+ship.bonus+'°':''),labelY=y>arena.bottom-26?y-30:y+33;
 g.strokeText(label,x,labelY);g.fillText(label,x,labelY);
 if(isCrossWatch()){g.restore();return;}
 const heatY=labelY+(labelY<y?-13:13),pct=Math.round(ship.heat),heat=(ship.overheated?'COOLING ':'HEAT ')+pct+'%';
 g.font='bold 10px system-ui';g.fillStyle=ship.overheated?'#ffd295':'#f4bd9c';
 g.strokeText(heat,x,heatY);g.fillText(heat,x,heatY);
 g.fillStyle='#4a3746';g.fillRect(x-20,heatY+3,40,3);
 g.fillStyle=ship.overheated?'#ffd295':'#e09167';g.fillRect(x-20,heatY+3,40*ship.heat/vandulHeat.max,3);
 g.restore();
}
function paintOneWreck(ctx,wreck,detailed){
 const {hull,fragments}=wreck;
 for(const piece of fragments){
  ctx.save();ctx.translate(piece.x,piece.y);ctx.rotate(piece.angle);
  ctx.fillStyle=piece.color;ctx.strokeStyle='#a18c82';ctx.lineWidth=.85;poly(piece.shape,ctx);
  if(vandulSprite?.complete&&vandulSprite.naturalWidth>0){
   // Reuse the intact hull texture inside each newly cut polygon. The
   // metal undercoat remains visible where the ship image is transparent.
   ctx.clip();ctx.globalAlpha=.70;
   ctx.drawImage(vandulSprite,-67.2*piece.sampleX,-67.2*piece.sampleY,67.2,67.2);
   ctx.globalAlpha=.26;ctx.fillStyle='#261c22';ctx.fillRect(-piece.r*2,-piece.r*2,piece.r*4,piece.r*4);
  }
  ctx.restore();
 }
 if(detailed)softShadow(hull.x+4,hull.y+6,26,23,.52);
 ctx.save();ctx.translate(hull.x,hull.y);ctx.rotate(hull.angle);
 if(wreckSprite?.complete&&wreckSprite.naturalWidth>0){
  const w=67.2,h=Math.min(69.44,w*wreckSprite.naturalHeight/wreckSprite.naturalWidth)||67.2;
  ctx.drawImage(wreckSprite,-w/2,-h/2,w,h);
 }else{
  ctx.fillStyle='#514044';ctx.strokeStyle='#987467';ctx.lineWidth=1.6;
  poly([[-25,-20],[-9,-11],[-5,-3],[7,-1],[15,-12],[24,-19],[23,8],[11,16],[3,13],[-6,18],[-17,11],[-22,4]],ctx);
  ctx.fillStyle='#251e25';ctx.lineWidth=0;
  poly([[-12,-3],[0,-2],[5,6],[-1,12],[-10,6]],ctx);
  ctx.fillStyle='#625955';ctx.fillRect(-2,5,6,2);
 }
 ctx.restore();
 if(!detailed)return;
 ctx.save();ctx.fillStyle='#a7a09b';ctx.strokeStyle='#1b2024';ctx.lineWidth=2.4;
 ctx.font='bold 10px system-ui';ctx.textAlign='center';
 const labelY=hull.y>arena.bottom-30?hull.y-35:hull.y+36;
 ctx.strokeText('WRECK',hull.x,labelY);ctx.fillText('WRECK',hull.x,labelY);ctx.restore();
}
function withinCamera(body,camera,margin=78){
 return body.x>=camera.x-margin&&body.x<=camera.x+camera.w+margin&&
  body.y>=camera.y-margin&&body.y<=camera.y+camera.h+margin;
}
function paintWreckage(camera){
 paintRiftWrecks(camera);
 if(wreckLayer){
  const north=floorNorth(),x=Math.max(0,Math.floor(camera.x)-32),y=Math.max(north,Math.floor(camera.y)-32);
  const w=Math.min(W-x,camera.w+65),h=Math.min(H-y,camera.h+65);
  g.drawImage(wreckLayer,x,y-north,w,h,x,y,w,h);
 }
 for(const old of archivedWrecks)if(!isWingmanTest()||[old.hull,...old.fragments].some(body=>withinCamera(body,camera)))paintOneWreck(g,old,false);
 for(const wreck of activeWrecks)paintOneWreck(g,wreck,true);
}
function nextWeaponMarkerBearing(weapon,selected){
 const gun=guns[weapon];
 if(selected&&fireBurst){
  const {angle,point,spread,profile,index}=fireBurst;
  return gimbalBearing(p,(point?pilotWeaponAim(point):angle)+spread*profile.pattern[index]);
 }
 return gimbalBearing(p,burstModes[weapon]||gun.burstOnly?pilotWeaponAim():pilotNormalBearing(weapon));
}
function drawGimbalAim(){
 if(!fighterFit.primary&&!fighterFit.secondary)return;
 const origin=nextMuzzle(p);
 g.save();
 g.strokeStyle='#eab86c85';g.lineWidth=1.25;g.beginPath();g.arc(p.x,p.y,53,p.aim-gimbalArc,p.aim+gimbalArc);g.stroke();
 if(fighterLoadout.weapon===sparrow){
  const spread=fireBurst?fireBurst.spread*fireBurst.profile.pattern[fireBurst.index]:0;
  const point=fireBurst?fireBurst.point:p.gimbalPoint,angle=nextWeaponMarkerBearing(sparrow,true);
  for(const {side,mount,a} of pairedAim(p,point,angle,spread)){
   const u=Math.cos(a),v=Math.sin(a),distance=side<0?58:72;
   g.strokeStyle=guns[sparrow].ring;g.lineWidth=1.6;g.globalAlpha=.48;g.setLineDash([3,5]);g.beginPath();
   g.moveTo(mount.x+u*23,mount.y+v*23);g.lineTo(mount.x+u*(distance-9),mount.y+v*(distance-9));g.stroke();
   g.setLineDash([]);g.globalAlpha=.95;g.beginPath();g.arc(mount.x+u*distance,mount.y+v*distance,side<0?5:4,0,TAU);g.stroke();
  }
  g.restore();return;
 }
 for(const [slot,weapon] of [fighterFit.primary,fighterFit.secondary].entries()){
  if(!guns[weapon])continue;
  const selected=weapon===fighterLoadout.weapon;
  // Either weapon would use the same next pod. Stagger the distance
  // along each true ray so the two marks stay distinct when aim coincides.
  const distance=fighterFit.primary&&fighterFit.secondary?(slot?79:58):62;
  const bearing=nextWeaponMarkerBearing(weapon,selected),u=Math.cos(bearing),v=Math.sin(bearing),x=origin.x+u*distance,y=origin.y+v*distance;
  const color=guns[weapon].ring;
  g.strokeStyle=color;g.lineWidth=selected?1.8:1.4;
  if(selected){
   g.globalAlpha=.48;g.setLineDash([3,5]);g.beginPath();
   g.moveTo(origin.x+u*27,origin.y+v*27);g.lineTo(origin.x+u*48,origin.y+v*48);g.stroke();g.setLineDash([]);
  }
  g.globalAlpha=selected?.95:.68;g.beginPath();
  g.arc(x,y,slot?4:6,0,TAU);g.stroke();
 }
 g.restore();
}
function drawAim(){
 if(hasGimbal(p)){drawGimbalAim();return;}
 const origin=p,bearing=pilotWeaponAim(),u=Math.cos(bearing),v=Math.sin(bearing),x=origin.x+u*62,y=origin.y+v*62;
 g.save();
 g.strokeStyle='#bfffee7d';g.lineWidth=1.4;g.setLineDash([3,5]);g.beginPath();
 g.moveTo(origin.x+u*27,origin.y+v*27);g.lineTo(x-u*9,y-v*9);g.stroke();g.setLineDash([]);
 g.beginPath();g.arc(x,y,6,0,TAU);g.stroke();g.restore();
}
function paintPlayerShield(t){
 if(state!=='play'||capitalLocked()||!shieldUp())return;
 const fitted=fittedShield();
 if(!fitted)return;
 const strength=shieldHp/fitted.capacity;
 const pulse=motion?.matches?0:(.5+.5*Math.sin(t*9))*.14;
 const recentlyHit=shieldClock-shieldHitAt<.15;
 const radius=fitted.radius;
 g.save();g.beginPath();g.arc(p.x,p.y,radius,0,TAU);
 g.fillStyle=recentlyHit?'#82f4ff46':'#53cdef23';g.fill();
 g.strokeStyle=recentlyHit?'#c0ffff':'#73eaff';
 g.globalAlpha=.52+strength*.27+pulse;g.lineWidth=2;g.stroke();
 g.restore();
}
function paintWingman(a){
 if(!a||riftBroken.has(a)||state==='depart'||state==='complete')return;
 softShadow(a.x+4,a.y+7,31,23,.68);
 g.save();g.translate(a.x,a.y-8);g.rotate(a.aim+Math.PI/2+fighterTumbleAngle(a));
 const lead=a.role==='lead',marker=lead?'#ffe1a0':'#a8e9ff';
 g.strokeStyle=a.hp?marker:'#7a726d';g.lineWidth=1.6;
 const boost=a.crossPass?.exhaust??0;
 if(a.hp&&boost>.04){
  g.save();g.translate(0,14);g.scale(.46,.24+.32*boost);
  paintMainExhaust(elapsed+(lead?0:.72));g.restore();
 }
 if(!a.hp)g.globalAlpha=.58;
 const painted=paintFighterArt(0,1,a.fit.hull);g.globalAlpha=1;
 if(!painted){
  g.fillStyle=a.hp?(a.hitGlow>0?'#aadbec':'#337369'):'#4b4745';
  poly([[0,-25],[8,-12],[24,-12],[36,10],[32,17],[14,14],[8,23],[-8,23],[-14,14],[-32,17],[-36,10],[-24,-12],[-8,-12]]);
  g.fillStyle=a.hp?'#a6c9c0':'#393431';
  poly([[0,-19],[6,-8],[5,7],[-5,7],[-6,-8]]);
 }
 if(a.hp){
  g.fillStyle=marker;g.fillRect(-19,15,7,2);g.fillRect(12,15,7,2);
  if(a.muzzleLight>0&&!paintWingPodFlash(a,a.muzzleLight*10)){g.globalAlpha=a.muzzleLight*10;g.fillRect(-2,-33,4,9);}
 }
 g.restore();
 g.save();g.font='bold 10px system-ui';g.textAlign='center';
 g.strokeStyle='#0d1e27';g.lineWidth=3;g.fillStyle=a.hp?'#abecff':'#b1aba5';
 const label=a.displayName?a.displayName.toUpperCase()+(a.hp?'':' DISABLED'):
  lead?(a.hp?'AI LEAD':'LEAD DISABLED'):(a.hp?'ALLY':'ALLY DISABLED');
 g.strokeText(label,a.x,a.y+24);g.fillText(label,a.x,a.y+24);
 if(isCrossBattleArena()){
  const hurt=elapsed<(a.hullHitUntil??0),x=a.x-20,y=a.y+28;
  // A steady one-second color highlight also reads in Reduced Motion.
  g.fillStyle=hurt?'#946a3e':'#14252e';g.fillRect(x,y,40,5);
  if(a.hp>0){
   g.fillStyle=hurt?'#fff0a6':'#93e5f4';g.fillRect(x+1,y+1,38*clamp(a.hp/a.maxHp,0,1),3);
  }
 }
 g.restore();
}
const battleCloudBands=[
 {w:650,h:500,vx:3.6,vy:-1.2,x:0,y:0,opacity:.64,empty:.31},
 {w:740,h:610,vx:5.4,vy:1.5,x:228,y:146,opacity:.27,empty:.55}
];
let battleCloudArt;
function battleCloudHash(x,y,salt){
 let n=Math.imul(x,1597334677)^Math.imul(y,3812015801)^Math.imul(salt,195766327);
 n=Math.imul(n^(n>>>16),0x45d9f3b);
 return ((n^(n>>>16))>>>0)/4294967296;
}
function battleCloudNoise(x,y,salt){
 const i=Math.floor(x),j=Math.floor(y),u=x-i,v=y-j;
 const a=u*u*(3-2*u),b=v*v*(3-2*v);
 const lo=battleCloudHash(i,j,salt)*(1-a)+battleCloudHash(i+1,j,salt)*a;
 const hi=battleCloudHash(i,j+1,salt)*(1-a)+battleCloudHash(i+1,j+1,salt)*a;
 return lo*(1-b)+hi*b;
}
function buildBattleCloudArt(){
 // Bake four soft, irregular wisps once. No image loads or per-frame noise.
 const w=144,h=72,atlas=[];
 for(let k=0;k<4;k++){
  let sprite=typeof OffscreenCanvas==='function'?new OffscreenCanvas(w,h):null,ctx=sprite?.getContext('2d');
  if(!ctx){
   sprite=canvas.ownerDocument?.createElement('canvas');if(!sprite)return [];
   sprite.width=w;sprite.height=h;ctx=sprite.getContext?.('2d');
  }
  if(!ctx?.createImageData||!ctx?.putImageData)return [];
  const tile=ctx.createImageData(w,h),p=tile?.data;
  if(!p)return [];
  const lobes=Array.from({length:5},(_,i)=>({
   x:-.64+i*.32,y:(battleCloudHash(i,k,6)-.5)*.60,
   rx:.31+battleCloudHash(i,k,11)*.23,ry:.28+battleCloudHash(i,k,21)*.30
  }));
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){
   const u=x/(w-1)*2-1,v=y/(h-1)*2-1,index=(y*w+x)*4;
   const n=battleCloudNoise(u*4.5+13,v*3.1+13,4+k),n2=battleCloudNoise(u*10+13,v*8+13,17+k);
   const edge=Math.max(0,Math.min(1,(1-Math.abs(u))*5,(1-Math.abs(v))*5));
   let shape=0;
   for(const l of lobes){
    const a=(u-l.x)/l.rx,b=(v-l.y-(n-.5)*.35)/l.ry;
    shape=Math.max(shape,Math.max(0,1-a*a-b*b));
   }
   const vapour=Math.max(0,shape*.91+n*.35+n2*.16-.26)*edge;
   const tint=.68+n*.22+n2*.10;
   p[index]=(103+k*3)*tint;p[index+1]=(142-k*5)*tint;p[index+2]=(176+k*3)*tint;
   p[index+3]=Math.min(1,vapour*.88)*145;
  }
  ctx.putImageData(tile,0,0);atlas.push(sprite);
 }
 return atlas;
}
function paintBattleCloudBand(t,camera,band,hazeOpacity=1){
 const palette=battleCloudArt??=buildBattleCloudArt();
 if(!palette.length)return;
 const b=battleCloudBands[band],time=motion?.matches?0:t;
 const dx=b.x+b.vx*time,dy=b.y+b.vy*time;
 const bounds=1300; // More distant watch cameras need a bounded paint budget.
 if(!Number.isFinite(camera.w)||!Number.isFinite(camera.h)||Math.max(camera.w,camera.h)>bounds*4)return;
 const left=Math.floor((camera.x-dx)/b.w)-1,right=Math.floor((camera.x+camera.w-dx)/b.w)+1;
 const top=Math.floor((camera.y-dy)/b.h)-1,bottom=Math.floor((camera.y+camera.h-dy)/b.h)+1;
 g.save();
 for(let row=top;row<=bottom;row++)for(let col=left;col<=right;col++){
  if(battleCloudHash(col,row,79+band)<b.empty)continue;
  const x=col*b.w+dx+(battleCloudHash(col,row,7+band)-.5)*198;
  const y=row*b.h+dy+(battleCloudHash(col,row,13+band)-.5)*136;
  const w=(band===0?420:338)+battleCloudHash(col,row,31+band)*235;
  const h=w*((band===0?.45:.32)+battleCloudHash(col,row,43+band)*.14);
  if(x+w/2<camera.x||x-w/2>camera.x+camera.w||y+h/2<camera.y||y-h/2>camera.y+camera.h)continue;
  g.globalAlpha=hazeOpacity*b.opacity*(.76+battleCloudHash(col,row,59+band)*.24);
  g.drawImage(palette[Math.floor(battleCloudHash(col,row,67+band)*palette.length)],x-w/2,y-h/2,w,h);
 }
 g.restore();
}
function armadaVisibility(ship,pullback){
 const usingCorvette=ship?.resoluteDock&&ship.resoluteDock.phase!=='approach';
 return {carrier:usingCorvette?pullback:1,corvette:usingCorvette?1:pullback,support:pullback};
}
function paintAtOpacity(opacity,paint,...args){
 if(opacity<=0)return;
 if(opacity>=1){paint(...args);return;}
 g.save();g.globalAlpha*=opacity;paint(...args);g.restore();
}
// Chart silhouettes measured on the same image, nose-to-tail × beam:
// Rift 29×44, Pegasus 605×278, Crosswind 255×54, Resolute 137×37.
// Use the chart as the base, then upsize the two midweight hulls for play.
// Scale visible art rather than the transparent margins; keep each hull's aspect ratio.
const scaleFlyStern=1420;
const scaleFlyFighterSize=Object.freeze({length:58.24*266/320,width:87.36*394/480});
const scaleFlyArt=Object.freeze([
 {scale:.9,chart:[605,278],asset:[512,768],alpha:[97,7,416,733],frame:[292,438]},
 {scale:1.875,chart:[255,54],asset:[215,780],alpha:[3,2,212,777],frame:[blackwaterFlightWidth,blackwaterFlightLength]},
 {scale:1.4,chart:[137,37],asset:[147,459],alpha:[0,0,147,459],frame:[resoluteFlightLength*147/459,resoluteFlightLength]}
]);
const scaleFlyLand=document.getElementById('scale-fly-land');
const scaleFlyView=document.getElementById('scale-fly-overview');
function syncScaleFlyOverview(){
 if(!scaleFlyView)return;
 const active=!!scaleFlyShips,wide=active&&scaleFlyShips.overview;
 scaleFlyView.hidden=!active;
 scaleFlyView.textContent=wide?'Back to fighter':'Fleet overview';
 scaleFlyView.setAttribute('aria-pressed',String(!!wide));
}
scaleFlyView?.addEventListener('click',event=>{
 if(!scaleFlyShips||state!=='play'||document.hidden||event.isTrusted!==true)return;
 if(scaleFlyShips.overview)scaleFlyShips.overview=false;
 else{
  const {carrier,corvette,widths,lengths,pads}=scaleFlyShips;
  scaleFlyShips.overview={
   left:Math.min(carrier.x-widths[0]/2,p.x)-85,
   right:Math.max(corvette.x+widths[2]/2,...pads.map(pad=>pad.x+pad.width/2),p.x)+85,
   top:Math.min(scaleFlyStern-lengths[0],p.y)-105,
   bottom:Math.max(scaleFlyStern,p.y)+145
  };
 }
 syncScaleFlyOverview();liveFocus();
});
function makeScaleFlyLineup(){
 const stern=scaleFlyStern;
 const lengths=scaleFlyArt.map(a=>a.scale*a.chart[0]/29*scaleFlyFighterSize.length);
 const widths=scaleFlyArt.map(a=>a.scale*a.chart[1]/44*scaleFlyFighterSize.width);
 const factors=scaleFlyArt.map(({asset:[aw,ah],alpha:[l,t,r,b],frame:[fw,fh]},i)=>({
  x:widths[i]/((r-l)*fw/aw),y:lengths[i]/((b-t)*fh/ah),stern:(b/ah-.5)*fh
 }));
 const [fc,ff,fr]=factors;
 const carrier={x:590,y:stern-fc.y*fc.stern,aim:-Math.PI/2,vessel:pegasusCapital,
  pads:[],pad:-1,phase:'flight',deckCrew:[]};
 const frigate={x:1350,y:stern-ff.y*ff.stern,heading:0,scaleFly:true};
 const corvette={x:1720,y:stern-fr.y*fr.stern,heading:0,resoluteCombat:true,scaleFly:true};
 if(!capitalArt.has(pegasusCapital.id)&&typeof window.Image==='function'){
  const art=new window.Image();art.src=pegasusCapital.art;capitalArt.set(pegasusCapital.id,art);
 }
 const cell=(x,y,r)=>({x,y,r,invMass:0,spin:0,vx:0,vy:0,craft:true});
 const carrierCells=pegasusCapital.sections.map(([x,y,r])=>
  cell(carrier.x+x*capitalCourse.width*fc.x,carrier.y+y*capitalCourse.height*fc.y,r*Math.min(fc.x,fc.y)));
 const frigateCells=[-.33,-.16,0,.16,.33].flatMap(y=>[-.21,.21].map(x=>
  cell(frigate.x+x*blackwaterFlightWidth*ff.x,frigate.y+y*blackwaterFlightLength*ff.y,blackwaterFlightWidth*.23*ff.x)));
 const corvetteCells=resoluteSectionLayout.map(([x,y,r])=>
  cell(corvette.x+x*resoluteFlightLength*fr.x,corvette.y+y*resoluteFlightLength*fr.y,r*fr.x*resoluteFlightLength));
 const point=(ship,group,name,index,x,y,width,height)=>{
  const clearance=group===1?3:6;
  const parkedScale=Math.min(.88,(width-clearance)/scaleFlyFighterSize.width,(height-clearance)/scaleFlyFighterSize.length);
  return {x:ship.x+x,y:ship.y+y,id:group+'-'+index,group,name,index,width,height,parkedScale};
 };
 // Locate the bay lights in the actual deck artwork rather than drawing
 // a new rectangle over the runway. Resolute retains one small side tray.
 const authored=(ship,group,name,index,x,y,w,h)=>{
  const {asset:[aw,ah],frame:[fw,fh]}=scaleFlyArt[group],f=factors[group];
  return point(ship,group,name,index,(x/aw-.5)*fw*f.x,(y/ah-.5)*fh*f.y,w/aw*fw*f.x,h/ah*fh*f.y);
 };
 const pads=[
  ...[[229,537],[281,537],[229,607],[281,607]].map(([x,y],i)=>authored(carrier,0,'Pegasus',i+1,x,y,46,60)),
  ...[232,379,526,606].map((y,i)=>{
   const painted=authored(frigate,1,'Crosswind',i+1,102,y,50,68);
   const wider=point(frigate,1,'Crosswind',i+1,painted.x-frigate.x,painted.y-frigate.y,[43,52,54,46][i]*scaleFlyArt[1].scale,painted.height);
   return {...wider,nativeWidth:painted.width};
  }),
  point(corvette,2,'Resolute',1,widths[2]/2+23,0,60,53)
 ];
 return {carrier,frigate,corvette,pads,lengths,widths,factors,overview:false,hulls:[carrierCells,frigateCells,corvetteCells],parked:null};
}
function scaleFlyApproach(pad,ship){
 if(pad.group===2)return ship.x>=pad.x-pad.width*.65&&ship.x<=pad.x+pad.width&&Math.abs(ship.y-pad.y)<pad.height*.56;
 return Math.abs(ship.x-pad.x)<pad.width*.65&&ship.y>=pad.y-pad.height*.67&&ship.y<=scaleFlyStern+120;
}
function scaleFlyReadyPad(){
 if(!scaleFlyShips||Math.hypot(p.vx,p.vy)>48)return null;
 return scaleFlyShips.pads.find(pad=>Math.abs(p.x-pad.x)<=Math.min(26,pad.width/2)&&Math.abs(p.y-pad.y)<=Math.min(29,pad.height/2))??null;
}
function updateScaleFlyLandingHud(){
 if(!scaleFlyLand)return;
 const parked=scaleFlyShips?.parked,pad=scaleFlyShips&&state==='play'?(parked??scaleFlyReadyPad()):null;
 scaleFlyLand.hidden=!pad;
 if(pad){
  const label=parked?'Launch':'Land · '+pad.name+' '+pad.index;
  if(scaleFlyLand.textContent!==label)scaleFlyLand.textContent=label;
 }
}
scaleFlyLand?.addEventListener('click',event=>{
 if(!scaleFlyShips||state!=='play'||document.hidden||event.isTrusted!==true)return;
 if(scaleFlyShips.parked){
  scaleFlyShips.parked=null;clearInput();p.vy=-43;liveFocus();
 }else{
  const pad=scaleFlyReadyPad();if(!pad)return;
  clearInput();scaleFlyShips.parked=pad;
  Object.assign(p,{x:pad.x,y:pad.y,prevX:pad.x,prevY:pad.y,vx:0,vy:0});snapAim(-Math.PI/2);
 }
 updateScaleFlyLandingHud();
});
function paintScaleFlyLineup(t,camera,{carrier,frigate,corvette,pads,factors}){
 // Each hull has a fixed, measured length. Only the parked fighter drawing
 // changes size; the camera and the Rift-3's flight geometry stay fixed.
 function drawHull(ship,f,draw){
  const local={x:(camera.x-ship.x)/f.x,y:(camera.y-ship.y)/f.y,w:camera.w/f.x,h:camera.h/f.y};
  g.save();g.translate(ship.x,ship.y);g.scale(f.x,f.y);draw({...ship,x:0,y:0},local);g.restore();
 }
 drawHull(carrier,factors[0],(pose,cam)=>paintCapital(t,cam,pose,0));
 drawHull(frigate,factors[1],paintCrosswindPose);
 drawHull(corvette,factors[2],(pose,cam)=>paintResolute(pose,t,cam));
 const ready=scaleFlyShips.parked??scaleFlyReadyPad();
 g.save();g.textAlign='center';g.font='700 12px system-ui';g.lineWidth=2;
 for(const pad of pads)if(withinCamera(pad,camera,110)){
  const {x,y,width:w,height:h}=pad;
  if(pad.nativeWidth){
   // Narrow extensions sit flush with the original lighting and runway;
   // leave the original center stripe and bay lights visible.
   const inboard=pad.nativeWidth/2,outer=w/2;
   for(const side of [-1,1]){
    const left=side<0?x-outer:x+inboard;
    g.fillStyle='#304348';g.fillRect(left,y-h/2+2,outer-inboard,h-4);
    const seam=x+side*(outer-1);
    g.strokeStyle='#6a8f8d';g.lineWidth=1;g.beginPath();g.moveTo(seam,y-h/2+4);g.lineTo(seam,y+h/2-4);g.stroke();
   }
  }
  if(pad.group===2){
   g.fillStyle='#343840';g.fillRect(x-w/2,y-h/2,w,h);
   g.strokeStyle='#a69578';g.strokeRect(x-w/2,y-h/2,w,h);
   g.fillStyle='#efd9a2';g.fillRect(x-w/2+7,y-h/2+5,w-13,2);g.fillRect(x-w/2+7,y+h/2-7,w-13,2);
  }
  if(pad===ready){
   g.strokeStyle='#a1ffee';g.setLineDash([5,4]);g.strokeRect(x-w/2,y-h/2,w,h);g.setLineDash([]);
  }
 }
 if(scaleFlyShips.overview){
  const z=camera.zoom;
  g.font='700 '+(11/z)+'px system-ui';g.fillStyle='#c7ebef';g.strokeStyle='#111c27';g.lineWidth=3/z;
  for(const [ship,label] of [[carrier,'Pegasus'],[frigate,'Crosswind'],[corvette,'Resolute']]){
   g.strokeText(label,ship.x,scaleFlyStern+49);g.fillText(label,ship.x,scaleFlyStern+49);
  }
 }
 g.restore();
}
function paintBattleHullLayers(t,camera,hazeOpacity=1,fleet=armadaVisibility(capitalShip,hazeOpacity)){
 if(scaleFlyShips){paintScaleFlyLineup(t,camera,scaleFlyShips);return;}
 // Back: Cruiser / Carrier. Support carriers belong here too.
 if(capitalShip){
  if(capitalShip.supportFleet)paintAtOpacity(fleet.support,paintCrossVessel,capitalShip.supportFleet,t,camera,hazeOpacity);
  paintAtOpacity(fleet.carrier,paintCapital,t,camera,capitalShip,hazeOpacity);
 }else if(!escortShip)paintFlightGuide(camera,!duelEnabled);
 if(hazeOpacity>0)paintBattleCloudBand(t,camera,0,hazeOpacity); // Deep haze only covers Cruiser / Carrier.
 // Middle: Corvette / Frigate. Resolute uses this pass in either flight scene.
 if(capitalShip)paintAtOpacity(fleet.corvette,paintResolute,capitalShip,t,camera);
 if(capitalShip)paintBlackwaterEscort(capitalShip,t,camera);
 const corvette=battleResolute();
 if(corvette)paintResolute(corvette,t,camera);
 if(hazeOpacity>0)paintBattleCloudBand(t,camera,1,hazeOpacity); // Thin mist covers the two tiers behind it.
 // Front: Vessel / Fighter. The smaller fighter actors finish the same tier
 // later in draw(), above the freighter hulls; no separate altitude simulation.
 if(escortShip&&!capitalShip)paintEscort(camera);
 if(redGrinConvoy)paintRedGrinConvoy(redGrinConvoy,camera);
 for(const ship of pirateCapitals)paintBlackwake(camera,ship);
 if(capitalShip){paintBlackwaterLandingGuide(t,camera);paintResoluteDockGuide(t,camera);paintCapitalApproach(camera);paintSortieGate(camera);}
}
function dockZoomHazeOpacity(ship,t){
 if(!ship)return 1;
 if(motion?.matches)return capitalLocked()?0:1;
 const dock=ship.resoluteDock;
 if(dock&&dock.phase!=='approach'){
  // Resolute uses a side pad, so track the visible side departure instead
  // of the carrier's aft lift. An internal launch stays clear until emerging.
  if(dock.phase==='launching'){
   const start=dock.fromStored?.68:0;
   return smoothBerth(((t-dock.at)/resolutePad.launch-start)/(1-start));
  }
  if(dock.phase==='capturing')return 1-smoothBerth((t-dock.at)/resolutePad.capture);
  return 0;
 }
 // flightCamera() eases the close-up using the inverse of this same lift.
 return berthLift(ship);
}
function draw(t){
 const hazeOpacity=dockZoomHazeOpacity(capitalShip,t),fleet=armadaVisibility(capitalShip,hazeOpacity);
 g.setTransform(1,0,0,1,0,0);g.fillStyle='#0d1217';g.fillRect(0,0,viewW,viewH);
 const camera=flightCamera();
 const viewScale=scale*camera.zoom;
 g.setTransform(viewScale,0,0,viewScale,0,0);g.save();g.beginPath();g.rect(0,0,camera.w,camera.h);g.clip();
 g.translate(-camera.x,-camera.y);
 const shaking=shake>0&&!motion?.matches&&(shakeSwitch?.checked??true);
 const kickX=shaking?Math.sin(t*71)*shake*17:0,kickY=shaking?Math.cos(t*64)*shake*13:0;
 const stream=capitalShip?.stream,orbit=stream?.orbit;
 const pirateGain=pirateSceneryGain(stream?.planetChart,!!(flightMode.pirateCapital&&!flightMode.capital||isCrossBattleArena()||onlineBattle?.state?.id==='blackwake'))*hazeOpacity;
 const planetGain=cruiseRegionGain(stream?.planetChart,orbit?.world)*(1-pirateGain);
 if(shaking&&(planetGain>0||pirateGain>0)){
  g.save();g.translate(kickX,kickY);paintFlightSpace(camera,hazeOpacity);g.restore();
  paintPirateBackdrop(camera,pirateGain);paintCruisePlanet(camera,orbit,planetGain);g.translate(kickX,kickY);
 }else{
  if(shaking)g.translate(kickX,kickY);
  paintFlightSpace(camera,hazeOpacity);
  paintPirateBackdrop(camera,pirateGain);paintCruisePlanet(camera,orbit,planetGain);
 }
 paintDamageSmoke(camera,t,fleet);
 // Shared battle space: each tier draws over the decks of the tier below.
 // Flight collisions, projectile hitboxes and docking retain their own geometry.
 paintBattleHullLayers(t,camera,hazeOpacity,fleet);
 paintAtOpacity(fleet.carrier,paintCapitalHullStatus,capitalShip,camera);
 paintAtOpacity(fleet.support,paintCapitalHullStatus,capitalShip?.supportFleet,camera);
 if(fleetReturnGate())paintTileGate(camera,flightMode.tileApproach.entryEdge,false,true);
 paintAtOpacity(fleet.carrier,paintCapitalCrew,camera);
 if(p&&state==='play'&&!capitalLocked()&&!scaleFlyShips?.parked)drawAim();
 const inTraining=isWingmanTest(),drawn=body=>!inTraining||withinCamera(body,camera);
 for(const station of rangeTargets)if(withinCamera(station,camera))paintRangeTarget(station);
 for(const cone of cones)if(drawn(cone))paintCone(cone);
 for(const asteroid of asteroids)if(!inTraining&&!fighterBattle||withinCamera(asteroid,camera,asteroid.r*2))paintAsteroid(asteroid);
 for(const piece of sceneryDebris)if(drawn(piece))paintFieldDebris(piece);
 paintWreckage(camera);
 const rivals=activeVanduls(),blockers=rivals.length||vandulIngress?visionBlockers():null;
 for(const rival of rivals){
  if(!drawn(rival))continue;
  if(playerCanSee(rival,blockers))paintVandul(rival,t);
  else if(thermalContact(p,rival))paintThermalContact(rival);
  else paintVandulContact(rival);
 }
 if(vandulIngress&&playerCanSee(vandulIngress,blockers)){
  g.save();g.beginPath();g.rect(arena.left,arena.top,arena.right-arena.left,arena.bottom-arena.top);g.clip();
  paintVandulBody(vandulIngress,t);g.restore();
 }
 if(fighterBattle)paintFighterBattle(camera);
 for(const bolt of vandulLasers){
  if(fighterBattle&&!withinCamera(bolt,camera,36))continue;
  g.save();g.translate(bolt.x,bolt.y);g.rotate(bolt.a);
  if(bolt.redGrinCannon){
   paintRedGrinCannonStreak(bolt);
  }else if(bolt.blackwakeTurret){
   g.fillStyle='#ffab66';g.fillRect(-22,-2.5,27,5);
   g.fillStyle='#fff2d4';g.fillRect(-14,-.8,19,1.6);
  }else if(bolt.twinbeam){
   // Tail length follows actual travel, so a new beam never paints behind
   // its emitter. Like all projectiles, collision removes the entire beam.
   const tail=clamp((vandulProfile.laser.life-bolt.life)*vandulProfile.laser.speed,4,78);
   const rail=g.createLinearGradient(-tail,0,6,0);
   rail.addColorStop(0,'#8b20e300');rail.addColorStop(.62,'#b84bf5bb');rail.addColorStop(1,'#ffc1ff');
   g.fillStyle=rail;g.fillRect(-tail,-2.5,tail+6,5);
   g.fillStyle='#ffd9ff';g.fillRect(-tail*.52,-.8,tail*.52+5,1.6);
   g.fillStyle=bolt.second?'#9b73ff':'#f748d6';g.fillRect(-tail*.72,3,tail*.66,1);
  }else{
   g.fillStyle='#cf6fff';g.fillRect(-24,-2,27,4);
   g.fillStyle='#ffc4d9';g.fillRect(-16,-.7,19,1.4);
  }
  g.restore();
 }
 if(onlineBattle)paintOnlineBattle(camera);
 paintWingman(testLead);paintWingman(wingman);for(const escort of formationEscorts)paintWingman(escort);
 if(!isCrossWatch()&&!(flightMode.simWatch&&fighterBattle)&&p&&!riftBroken.has(p)){paintHover(missionDeparture?.craft??p,t);paintPlayerShield(t);}
 for(const b of shots){
  if(fighterBattle&&!withinCamera(b,camera,36))continue;
  const gun=guns[b.weapon]||guns.blaster,heavy=gun.kind==='ballistic';
  // Bridge the articulated art's small hover/recoil lift without changing
  // the projectile's physical coordinates, collision line, or lifetime.
  const lift=b.visual?1-smoothBerth((elapsed-b.visual.at)/.12):0;
  g.save();g.translate(b.x+(b.visual?.x??0)*lift,b.y+(b.visual?.y??0)*lift);g.rotate(b.a);
  if(b.redGrinCannon)paintRedGrinCannonStreak(b);
  else if(heavy){
   g.fillStyle=gun.edge;g.fillRect(-24,-2,28,4);g.fillRect(-33,-1,5,2);
   g.fillStyle=gun.core;g.fillRect(-13,-1,18,2);
  }else{
   g.globalAlpha=.5;g.fillStyle=gun.edge;g.fillRect(-29,-2,34,4);
   g.globalAlpha=1;g.fillStyle=gun.core;g.fillRect(-24,-.65,29,1.3);
  }
  g.restore();
 }
 for(const fx of clashBursts)paintClashBurst(fx);
 for(const r of rings){g.globalAlpha=Math.min(1,r.life/r.max*1.45);g.strokeStyle=r.colour;g.lineWidth=2;g.beginPath();g.arc(r.x,r.y,motion?.matches?r.size*.66:3+(1-r.life/r.max)*r.size,0,TAU);g.stroke();}
 for(const z of sparks){
  g.globalAlpha=z.life/z.max;
  if(z.redGrinMuzzle)paintRedGrinMuzzlePuff(z);
  else if(z.scrape){
   g.strokeStyle=z.tone;g.lineWidth=z.r;g.beginPath();g.moveTo(z.x,z.y);
   g.lineTo(z.x-z.dx*.18,z.y-z.dy*.18);g.stroke();
  }else{g.fillStyle=z.tone;g.fillRect(z.x,z.y,z.r,z.r);}
 }
 g.restore();
 if(fighterBattle&&state==='play')paintFighterBattleRadar(camera);
}
function updateCrossWatchStatus(){
 if(!crossWatchStatus)return;
 const count=pirateCapitals.filter(ship=>ship.hp>0).length;
 const text=duelResult==='victory'?'Battle complete · Pirate fleet disabled':duelResult==='lost'?'Battle complete · Pirates held':
  (blackwake?.supportArrival?'Bifrost inbound':'Bifrost '+livingAllies().length)+' · Pirates '+count+'/3';
 if(crossWatchStatus.textContent!==text)crossWatchStatus.textContent=text;
}
function keepWatchFighterClear(ally,wrecksOnly=false){
 if(!blackwake)return;
 // Steering gives the hull a wide berth; this projection handles momentum
 // and the freighter's own movement deterministically at close range.
 for(let pass=0;pass<6;pass++)for(const ship of pirateCapitals)for(const section of (wrecksOnly&&ship.hp?[]:ship.pieces)){
  const dx=ally.x-section.x,dy=ally.y-section.y,d=Math.hypot(dx,dy),gap=section.r+ally.r+15;
  if(d>=gap)continue;
  const ux=d>1e-7?dx/d:ally===testLead?-1:1,uy=d>1e-7?dy/d:0;
  ally.x=section.x+ux*gap;ally.y=section.y+uy*gap;
  const inward=Math.min(0,ally.vx*ux+ally.vy*uy);
  ally.vx-=inward*ux;ally.vy-=inward*uy;
 }
}
function finishCrossWatchFlyby(dt){
 // The encounter is already over. Let surviving Bifrost fighters move off
 // the stationary wreck without firing or staying visually stacked on it.
 if(!blackwake)return;
 blackwake.watchFlyby=Math.min(2.6,(blackwake.watchFlyby??0)+dt);
 const pace=70*(1-blackwake.watchFlyby/2.6);
 for(const ally of livingAllies()){
  if(['run','bank'].includes(ally.crossPass?.phase)){
   flyBifrostPass(ally,dt,[...cones,...asteroids,...sceneryDebris]);keepWatchFighterClear(ally);continue;
  }
  if(!ally.watchDeparture){
   const nearest=pirateCapitals.reduce((best,ship)=>!best||Math.hypot(ally.x-ship.x,ally.y-ship.y)<Math.hypot(ally.x-best.x,ally.y-best.y)?ship:best,null);
   const dx=ally.x-nearest.x,dy=ally.y-nearest.y;
   const gap=Math.hypot(dx,dy);
   const angle=gap>1?Math.atan2(dy,dx):ally===testLead?Math.PI:0;
   // If the wreck was near an edge, peel alongside it rather than getting
   // pinned against the boundary with a constant outward heading.
   for(const offset of [0,.75,-.75,1.5,-1.5,2.25,-2.25,Math.PI]){
    const x=Math.cos(angle+offset),y=Math.sin(angle+offset);
    const tx=ally.x+x*75,ty=ally.y+y*75;
    if(tx<arena.left+ally.r||tx>arena.right-ally.r||ty<arena.top+ally.r||ty>arena.bottom-ally.r)continue;
    if(pirateCapitals.some(ship=>ship.pieces.some(section=>Math.hypot(tx-section.x,ty-section.y)<section.r+ally.r+17)))continue;
    ally.watchDeparture={x,y};break;
   }
   ally.watchDeparture??={x:Math.cos(angle),y:Math.sin(angle)};
  }
  ally.vx=pace*ally.watchDeparture.x;ally.vy=pace*ally.watchDeparture.y;
  if(pace>2)queueHeading(ally,Math.atan2(ally.vy,ally.vx));
  advanceHeading(ally,dt);
  ally.x+=ally.vx*dt;ally.y+=ally.vy*dt;wall(ally);keepWatchFighterClear(ally);
 }
}
function advanceBifrostArrival(dt){
 const inbound=blackwake?.supportArrival;
 if(!inbound||(inbound.delay-=dt)>0)return;
 testLead=inbound.lead;wingman=inbound.wing;blackwake.supportArrival=null;
}
function simulateCrossWatch(dt){
 if(dt<=0)return;
 if(duelResult){
  advanceFighterTumbles(dt);
  if(duelResult==='victory'&&(blackwake?.watchFlyby??0)<2.6)finishCrossWatchFlyby(dt);
  return;
 }
 const steps=Math.ceil(dt/.009),step=dt/steps;
 for(let i=0;i<steps&&!duelResult;i++){
  advanceBifrostArrival(step);
  const scenery=[...cones,...asteroids,...sceneryDebris],rivals=activeVanduls(),blockers=visionBlockers(scenery);
  for(const body of scenery)if(!body.asteroid){
   body.prevX=body.x;body.prevY=body.y;
   body.wallFx=Math.max(0,body.wallFx-step);body.hitGlow=Math.max(0,body.hitGlow-step);
   body.vx*=Math.exp(-1.45*step);body.vy*=Math.exp(-1.45*step);body.spin*=Math.exp(-1.60*step);
   body.x+=body.vx*step;body.y+=body.vy*step;body.angle+=body.spin*step;wall(body);
  }
  for(let a=0;a<scenery.length;a++)for(let b=a+1;b<scenery.length;b++){
   const first=scenery[a],second=scenery[b];
   if(!first.asteroid&&!second.asteroid)contact(first,second,false);
   else if(first.asteroid!==second.asteroid){
    const rock=first.asteroid?first:second,loose=first.asteroid?second:first;
    contact({x:rock.x,y:rock.y,r:rock.r,vx:0,vy:0,spin:0,invMass:0,craft:true},loose,false);
    wall(loose);
   }
  }
  for(const ship of rivals){
   ship.prevX=ship.x;ship.prevY=ship.y;
   steerVandul(ship,step,blockers);advanceHeading(ship,step);
   ship.x+=ship.vx*step;ship.y+=ship.vy*step;wall(ship);
  }
  const targets=pirateCapitals.filter(ship=>ship.hp>0);
  const contacts=bifrostFleetContacts(targets,scenery);
  for(const ally of livingAllies()){flyWingman(ally,step,scenery,targets,contacts);pushLooseFlightBodies(ally,scenery);}
  advanceBlackwakeFleet(step,scenery);
  advanceFighterTumbles(step);resolveTileShipContacts();
  for(const ally of livingAllies())keepWatchFighterClear(ally,true);
  fireVandulLasers(step);sweepProjectiles(step,[...scenery,...rivals],scenery);
  if(!duelResult&&!blackwake?.supportArrival&&!livingAllies().length){duelResult='lost';shots=[];vandulLasers=[];}
 }
 updateCrossWatchStatus();
}
function applyOnlineBattle(receipt,failures=0){
 const self=receipt.state.ships.find(ship=>ship.id===receipt.self);
 if(!self)return;
 if(!failures){
  if(!onlineBattle)onlineImpactSeq=0;
  for(const impact of receipt.state.friendlyImpacts??[]){
   if(!Number.isSafeInteger(impact?.id)||impact.id<=onlineImpactSeq||
    ![impact.x,impact.y,impact.heading].every(Number.isFinite))continue;
   onlineImpactSeq=impact.id;
   flashFriendlyHull(impact.x,impact.y,Math.cos(impact.heading),Math.sin(impact.heading));
  }
  const interval=elapsed-onlineBlendAt;
  onlineBlendDuration=onlineBattle?clamp(interval,.17,.65):.17;
  onlineBlendAt=elapsed;
  const shots=new Map(receipt.state.shots.map(shot=>{
   const from=onlineShots.get(shot.id)?.draw??shot;
   return [shot.id,{from,to:shot,draw:{...from}}];
  }));
  onlineShots.clear();
  for(const [id,visual] of shots)onlineShots.set(id,visual);
  for(const ship of receipt.state.ships){
   const last=onlinePos.get(ship.id);
   onlinePos.set(ship.id,{from:last?.draw??ship,to:ship,draw:last?.draw??ship});
  }
  for(const id of onlinePos.keys())if(!receipt.state.ships.some(ship=>ship.id===id))onlinePos.delete(id);
 }
 onlineBattle=receipt;
 p.hp=self.hp;p.maxHp=self.maxHp;
 p.fighter=self.hull==='rift-fighter'?stockFighterId:self.hull;
 const pilots=receipt.state.ships.filter(ship=>!onlineBot(ship));
 const friends=pilots.filter(ship=>ship.team===self.team&&ship.id!==self.id).length;
 const enemies=pilots.filter(ship=>ship.team!==self.team).length;
 const bots=receipt.state.ships.filter(onlineBot), alliedCrew=bots.filter(ship=>ship.team===self.team).length;
 const copy=failures?'Reconnecting · awaiting server':receipt.state.status==='complete'?(
  (self.hp>0?'':'Fighter disabled · ')+(receipt.state.winner?(receipt.state.winner==='allies'?'Allies win':'Blackwake wins'):
   receipt.state.closeReason==='bifrost-left'?'Bifrost withdrew · Battle closed':receipt.state.closeReason==='inactive'?'Battle closed · Inactive':'Exercise complete')):
  receipt.state.waiting?'Corsair Test · Waiting for a second pilot from your carrier':

  (self.hp>0?'Shared Battle · ':'Disabled · ')+friends+' allied '+(friends===1?'pilot':'pilots')+' · '+enemies+' opposing '+(enemies===1?'pilot':'pilots')+
  ' · '+alliedCrew+' allied NPC · '+(bots.length-alliedCrew)+' opposing NPC';
 if(onlineUi.status&&onlineUi.status.textContent!==copy)onlineUi.status.textContent=copy;
 blendOnlineBattle();updateHud();showFire();
}
function blendOnlineBattle(){
 const k=clamp((elapsed-onlineBlendAt)/onlineBlendDuration,0,1);
 for(const visual of onlinePos.values()){
  const {from,to}=visual;
  visual.draw={...to,x:from.x+(to.x-from.x)*k,y:from.y+(to.y-from.y)*k,heading:from.heading+headingDelta(from.heading,to.heading)*k};
 }
 for(const {from,to,draw} of onlineShots.values()){
  draw.x=from.x+(to.x-from.x)*k;draw.y=from.y+(to.y-from.y)*k;
 }
 const own=onlinePos.get(onlineBattle.self)?.draw;
 if(own){p.x=own.x;p.y=own.y;snapAim(own.heading);}
}
function updateOnlineBattle(now,dt){
 blendOnlineBattle();
 const move=liveTrim(),x=move?.x??(Number(has('KeyD'))-Number(has('KeyA'))),y=move?.y??(Number(has('KeyS'))-Number(has('KeyW')));
 const heading=onlinePos.get(onlineBattle.self)?.to.heading??p.aim,c=Math.cos(heading),s=Math.sin(heading),forward=x*c+y*s;
 const input={turn:onlineAim===null?0:clamp(headingDelta(heading,onlineAim)*1.35,-1,1),thrust:holdsMainThrust()?1:clamp(forward,-1,1),
  strafe:clamp(-x*s+y*c,-1,1),fire:p.hp>0&&(onlineTap||!!firePointer||has('Space'))};
 if(onlineSession?.update(now,input))onlineTap=false;
 if(movePulse){movePulse.left-=dt;if(movePulse.left<=0)movePulse=null;}
}
function paintOnlineBattle(camera){
 const self=onlineBattle.state.ships.find(ship=>ship.id===onlineBattle.self);
 for(const {draw:shot} of onlineShots.values()){
  if(!withinCamera(shot,camera,32))continue;
  g.save();g.translate(shot.x,shot.y);g.rotate(shot.heading);g.fillStyle=shot.team===self.team?'#96f7f0':'#ff9d7d';g.fillRect(-16,-1.4,21,2.8);g.restore();
 }
 for(const sent of onlineBattle.state.ships){
  const ship=onlinePos.get(sent.id)?.draw??sent;
  if(!withinCamera(ship,camera,140))continue;
  const mine=ship.id===self.id,friend=ship.team===self.team,color=mine?'#f5eeab':friend?'#9debe7':'#ffad98';
  if(onlineBlackwake(ship)){
   let art=onlinePirates.get(ship.id);
   if(!art){art=makeBlackwake({x:ship.x,y:ship.y},ship.heading);onlinePirates.set(ship.id,art);}
   Object.assign(art,{x:ship.x,y:ship.y,hp:ship.hp,maxHp:ship.maxHp,yaw:ship.heading+Math.PI/2,
    name:friend?'Allied NPC · Blackwake':'Opposing NPC · Blackwake',objective:true});
   art.turret.aim=ship.heading;placeBlackwakeTurret(art);paintBlackwake(camera,art);continue;
  }
  if(!mine){
   g.save();g.translate(ship.x,ship.y);g.rotate(ship.heading+Math.PI/2);if(!ship.hp)g.globalAlpha=.42;
   if(!paintFighterArt(0,1,ship.hull==='rift-fighter'?stockFighterId:ship.hull))paintFallbackFighter(1);
   g.restore();
  }
  g.save();g.fillStyle=color;g.strokeStyle='#101720';g.lineWidth=3;g.font='bold 11px system-ui';g.textAlign='center';
  const role=friend?'ALLIED ':'OPPOSING ';
  const label=(mine?'YOU':onlineBot(ship)?role+'NPC · '+(ship.name||'Navy Wingmate'):role+'PILOT')+(ship.hp?'':' · DISABLED');
  g.strokeText(label,ship.x,ship.y+40);g.fillText(label,ship.x,ship.y+40);
  g.fillStyle='#172931';g.fillRect(ship.x-18,ship.y+46,36,4);g.fillStyle=color;
  g.fillRect(ship.x-18,ship.y+46,36*clamp(ship.hp/ship.maxHp,0,1),4);g.restore();
 }
}
let corsairLobby=null,corsairLobbyBusy=false,corsairJoining=false,corsairNextCheck=0;
const corsairBackHref=()=> './carrier.html?vessel='+((corsairLobby?.vessel??fighterParkedVessel(hullId))==='bifrost'?'bifrost':'rift-carrier');
async function refreshCorsairLobby(){
 if(corsairLobbyBusy||corsairJoining||state!=='menu'||document.hidden||routeParked||onlineUi.entry?.hidden)return;
 corsairLobbyBusy=true;
 try{
  const id=hullId,generation=currentCharacterGeneration();
  const berth=managedBuild&&canLaunchBuild()?await parkingAPI?.hydrate?.(id,{migrate:false}):null;
  const vessel=berth?.status==='ok'&&berth.parking?.revision>0?berth.parking.vessel:null;
  const room=vessel?await window.RiftMultiplayer?.corsair?.status(vessel,id):null;
  if(corsairJoining||hullId!==id||currentCharacterGeneration()!==generation||state!=='menu'||document.hidden||routeParked)return;
  corsairLobby=room?{...room,vessel,id,generation}:null;
  if(onlineUi.back)onlineUi.back.href=corsairBackHref();
  onlineUi.join.disabled=!room||!['open','waiting','seated'].includes(room.status);
  onlineUi.join.textContent=room?.status==='waiting'?'Join Corsair Test':room?.status==='seated'?'Rejoin Corsair Test':'Open Corsair Test';
  onlineUi.brief.textContent=!room?(vessel?'Corsair Test is unavailable. Checking again…':'A launch-ready fighter with a confirmed carrier berth is required.'):
   room.status==='open'?'Open a test room, then have a second pilot on '+vesselName(vessel)+' select Corsair · Online Test.':
   room.status==='waiting'?'One pilot from '+vesselName(vessel)+' is waiting. Join to start the exercise.':
   room.status==='seated'?'Resume your seat in this Corsair Test.':room.status==='running'?'Both seats are taken. Wait for the next test.':'Test complete. A new room will be available shortly.';
 }catch{
  corsairLobby=null;onlineUi.join.disabled=true;
  if(state==='menu')onlineUi.brief.textContent='Corsair Test is unavailable. Checking again…';
 }finally{corsairLobbyBusy=false;}
}
if(onlineMatch&&onlineUi.entry){
 onlineUi.entry.hidden=false;
 const ally=!onlineCorsair&&onlineMatch[1]==='allies';
 if(onlineUi.deployment)onlineUi.deployment.hidden=!ally;
 if(onlineCorsair){
  if(onlineUi.title)onlineUi.title.textContent='Corsair · Online Test';
  if(onlineUi.back){onlineUi.back.textContent='Back to Deck Map';onlineUi.back.href=corsairBackHref();}
  onlineUi.join.disabled=true;onlineUi.join.textContent='Open Corsair Test';
  onlineUi.brief.textContent='Checking your carrier’s test room…';
 }else onlineUi.brief.textContent=ally?'Choose a flight group for your parked fighter. Exercise only; no career changes.':'Enter as Opposition with your fighter only. Exercise only; no career changes.';
}
onlineUi.join?.addEventListener('click',async event=>{
 if(!onlineMatch||event.isTrusted!==true||document.hidden||routeParked||state!=='menu'||onlineUi.join.disabled)return;
 onlineUi.join.disabled=true;corsairJoining=onlineCorsair;
 const network=window.RiftMultiplayer,client=window.RiftOnlineBattleClient,id=hullId,generation=currentCharacterGeneration();
 const lobby=onlineCorsair?corsairLobby:null;
 const api=onlineCorsair?(lobby&&network?.corsair?{
  join:(v,h)=>network.corsair.join(v,h,lobby.instance),step:network.corsair.step
 }:null):network;
 const choice=onlineMatch[1]==='allies'&&onlineUi.mode?.value;
 const mode=['solo','wingmen','fleet'].includes(choice)?choice:'solo';
 onlineUi.brief.textContent='Joining shared battle…';
 try{
  if(!api||!client)throw Error('service');
  if(!managedBuild||!canLaunchBuild())throw Error('fighter');
  const berth=await parkingAPI?.hydrate?.(id,{migrate:false});
  if(berth?.status!=='ok'||!(berth.parking?.revision>0))throw Error('berth');
  if(onlineCorsair&&(lobby?.vessel!==berth.parking.vessel||lobby.id!==id||lobby.generation!==generation))throw Error('berth');
  if(state!=='menu'||document.hidden||routeParked||hangarDialog?.open||hullId!==id||currentCharacterGeneration()!==generation)throw Error('stale');
  onlineSession=client.create(api,berth.parking.vessel,id,onlineMatch[1],(receipt,failures)=>{if(state==='play'&&onlineBattle)applyOnlineBattle(receipt,failures);else onlineBattle=receipt;},mode);
  if(!await onlineSession.join())throw Error('service');
  if(state!=='menu'||document.hidden||routeParked||hangarDialog?.open||hullId!==id||currentCharacterGeneration()!==generation)throw Error('stale');
  const receipt=onlineBattle;
  if(onlineUi.dispatch){
   const requested=mode==='fleet'?2:mode==='wingmen'?1:0,assigned=receipt.wingmatesAssigned;
   const short=Number.isInteger(assigned)&&assigned>=0&&assigned<requested;
   onlineUi.dispatch.hidden=!short;
   onlineUi.dispatch.textContent=short?assigned+' of '+requested+' requested NPC pilots dispatched.':'';
  }
  onlineBattle=null;flightMode=practiceFlight;duelEnabled=false;setArenaWidth();
  resetField();onlinePos.clear();onlineShots.clear();onlinePirates.clear();cones=[];Object.assign(arena,{left:0,right:1800,top:0,bottom:2400});
  flightCanSave=false;flightGeneration=flightHullId=flightHullRaw=undefined;flightQuest=null;
  state='play';onlineAim=null;onlineTap=false;onlineUi.hud.hidden=false;gameCabinet.dataset.online='true';
  returnFlightToCarrier=false;showGameScreen(true);applyOnlineBattle(receipt);layout();overlay.hidden=true;syncPauseControl();liveFocus();
 }catch(error){
  onlineSession?.close();onlineSession=null;onlineBattle=null;
  onlineUi.brief.textContent=error.message==='fighter'?'A launch-ready fighter parked on a carrier is required.':error.message==='berth'?'Dock and Store Inside a carrier first to confirm your fighter’s berth.':'Shared battle unavailable. Check your berth or try again.';
  corsairJoining=false;onlineUi.join.disabled=onlineCorsair;
  if(onlineCorsair){corsairNextCheck=0;void refreshCorsairLobby();}
 }
});
function updateFlightPopulation(){
 if(!flightPopulation||state==='menu')return;
 const count=(n,label)=>n+' '+label+(n===1?'':'s');
 let text;
 if(onlineBattle){
  const ships=onlineBattle.state.ships,bots=ships.filter(onlineBot);
  text='Online · '+count(bots.filter(ship=>ship.hp>0).length,'bot')+' · '+count(ships.length-bots.length,'player');
 }else{
  const bots=[...activeVanduls(),vandulIngress,...(fighterBattle?.bots??[]),...livingAllies(),...pirateCapitals,battleResolute()]
   .filter(ship=>ship?.hp>0);
  text=(flightMode.simWatch?'Watching · ':'Solo · ')+count(bots.length,'bot');
 }
 if(flightPopulation.textContent!==text)flightPopulation.textContent=text;
}
function tick(now){
 if(onlineCorsair&&state==='menu'&&!document.hidden&&!routeParked&&!corsairLobbyBusy&&now>=corsairNextCheck){
  corsairNextCheck=now+2800;void refreshCorsairLobby();
 }
 if(hullRepairReadyAt&&state==='menu'&&!document.hidden&&now-lastHullRepairRefresh>=240){
  lastHullRepairRefresh=now;refreshBuildDisplays();
 }
 const dt=Math.min(.032,Math.max(0,(now-(last||now))/1000));last=now;
 if(!document.hidden&&!routeParked&&state==='play'&&transferTransit?.chart==='picker'){
  if(!canOpenFlightMap()){closeGalaxyTransfer();syncArrivalControls();liveFocus();}
 }else if(!document.hidden&&!routeParked&&state!=='pause'&&state!=='menu'){
  elapsed+=dt;shake=Math.max(0,shake-dt);recoil=Math.max(0,recoil-dt);
  if(onlineBattle)updateOnlineBattle(now,dt);
  else if(state==='play'&&capitalShip?.stream)updateCruisePlanet(capitalShip.stream,dt);
  if(onlineBattle){}
  else if(state==='watch'){simulateCrossWatch(dt);if(duelResult&&arenaMusic)stopArenaMusic();}
  else if(state==='arrive')advancePlayerIngress(dt);
  else if(state==='depart')advanceMissionDeparture(dt);
  else if(state==='play'&&capitalLocked()){
   // The carrier moves the latched fighter, so its engine draws no thrust
   // power, but its own generator and passive cooling still run in flight time.
   simulateFlightPower(dt,false);advanceFlightHeat(dt);advanceBurstRecovery(dt);
   beginShieldPower();if(blackwaterLatched()){updateCapital(dt);advanceBlackwaterLanding();}else if(resoluteLatched()){updateCapital(dt);advanceResoluteDock();}else advanceCapitalBerth(dt);endShieldPower(dt);shieldClock+=dt;showFlightPower();updateHud();
   if(capitalHangarApproach?.ship===capitalShip)capitalHangarApproach.elapsed=Math.min(capitalHangarZoomSeconds,capitalHangarApproach.elapsed+dt);
  }
  else if(state==='play'&&capitalShip?.transfer&&!capitalShip.transfer.arrived&&capitalShip.phase==='flight'){
   advanceCarrierTransfer(dt);
  }
  else if(state==='play'){
   advanceFlightHeat(dt);
   simulate(dt);
   advanceQueuedDock();
   advanceDuelArrival(dt);
   advanceBurst(dt);
   if(ballisticHold)fireNormalShot();
   if(state==='play'){
    updateFlightVisual(p,dt,p.speed);
    for(const ship of activeVanduls())updateFlightVisual(ship,dt,vandulProfile.speed);
    if(vandulIngress)updateFlightVisual(vandulIngress,dt,vandulProfile.speed,true);
   }
  }
  advanceRiftWrecks(dt);
  advanceDamageSmoke(dt);
  for(const z of sparks){z.x+=z.dx*dt;z.y+=z.dy*dt;z.life-=dt;}
  const cruise=capitalShip?.stream,visibleLife=fx=>fx.life>0&&(!cruise||fx.y>=arena.top-80&&fx.y<=arena.bottom+80);
  sparks=sparks.filter(visibleLife);
  for(const r of rings)r.life-=dt;rings=rings.filter(visibleLife);
  for(const fx of clashBursts)fx.life-=dt;clashBursts=clashBursts.filter(visibleLife);
 }
 updateFlightPopulation();updateFleetReturnHud();updateHangarEngineVisual();updateThruster();showShieldControl();syncWingmanCommands();updateCapitalHud();updateEscortHud();updateCustomRange();updateSurgeHud();updateWingRadio(dt);syncFlightView();updateResoluteDockHud();updateBlackwaterLandingHud();if(state!=='menu')draw(elapsed);
 if(capitalHangarApproach&&(motion?.matches||capitalHangarApproach.elapsed>=capitalHangarZoomSeconds))finishCapitalHangarApproach();
 frame=requestAnimationFrame(tick);
}
resetField();overlay.hidden=true;showGameScreen(false);
enterLinkedCarrierRoute();
frame=requestAnimationFrame(tick);
})();
