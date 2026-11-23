'use strict';
(() => {
const canvas=document.getElementById('game'),hud=document.getElementById('hud'),overlay=document.getElementById('overlay'),resetFieldButton=document.getElementById('reset-field'),shakeSwitch=document.getElementById('screen-shake'),movePad=document.getElementById('move-pad'),aimPad=document.getElementById('aim-pad'),fireButton=document.getElementById('fire-button'),soundSwitch=document.getElementById('sound-on'),soundTest=document.getElementById('test-sound'),engineTest=document.getElementById('test-engine'),gunBlaster=document.getElementById('gun-blaster'),gunBallistic=document.getElementById('gun-ballistic'),phoneTools=document.getElementById('phone-audio-tools'),phoneSwitch=document.getElementById('iphone-audio'),phoneTest=document.getElementById('test-phone-audio'),soundStatus=document.getElementById('sound-status'),aimSwitch=document.getElementById('aim-mode');
const mainScreen=document.getElementById('main-menu'),arenaScreen=document.getElementById('arena-screen'),gameCabinet=document.getElementById('game-cabinet'),mainMenuCarrier=document.getElementById('main-menu-carrier'),mainMenuHangar=document.getElementById('main-menu-hangar'),returnMainMenu=document.getElementById('return-main-menu'),arenaSettings=document.getElementById('arena-settings');
const pauseFlightButton=document.getElementById('pause-flight');
const capitalHud=document.getElementById('capital-dock-hud'),capitalAction=document.getElementById('capital-dock-action'),capitalStore=document.getElementById('capital-store-action'),capitalStatus=document.getElementById('capital-dock-status'),capitalHangar=document.getElementById('capital-hangar');
const dockingComms=document.getElementById('docking-comms'),dockingCommsText=document.getElementById('docking-comms-text');
const dockVoice=document.getElementById('docking-control-voice'),dockReturnVoice=document.getElementById('docking-return-voice');
const dockPortrait=document.getElementById('dockmaster-portrait'),dockSurprisedPortrait=document.getElementById('dockmaster-portrait-surprised');
const escortHud=document.getElementById('escort-hud'),escortAction=document.getElementById('escort-action'),escortStatus=document.getElementById('escort-status');
const duelCountdownBadge=document.getElementById('vandul-countdown'),duelReadout=document.getElementById('vandul-duel-readout'),asteroidSwitch=document.getElementById('asteroid-cover-on');
const wingmanFormationButton=document.getElementById('wingman-formation');
const wingRadio=document.getElementById('wing-radio'),wingRadioCaption=document.getElementById('wing-radio-caption');
const wingRadioPortraits=[document.getElementById('wing-radio-leena'),document.getElementById('wing-radio-tomas')];
const wingRadioCues=[
 {speaker:'leena',text:'Leena here. I’m out in front. Stay with me.',start:.35,fade:3.78,end:4.1},
 {speaker:'tomas',text:'Tomas here. I’m with you.',start:4.35,fade:6.95,end:7.27}
];
let wingRadioRun=null,wingRadioStatic=null;
const gunButtons={blaster:gunBlaster,ballistic:gunBallistic,ak77:document.getElementById('gun-ak77')};
const hangarDialog=document.getElementById('hangar'),openHangarButton=document.getElementById('open-hangar'),closeHangarButton=document.getElementById('close-hangar'),fitPrimary=document.getElementById('fit-primary'),fitSecondary=document.getElementById('fit-secondary'),fitStatus=document.getElementById('fit-status'),hangarTitle=document.getElementById('hangar-title');
const playerHangarView=document.getElementById('player-hangar-view');
const hangarBayActions=document.getElementById('hangar-bay-actions'),hangarBoard=document.getElementById('hangar-board'),hangarCockpit=document.getElementById('hangar-cockpit'),cockpitTitle=document.getElementById('cockpit-title');
const hangarBoardStatus=document.getElementById('hangar-board-status');
const hangarShipChoice=document.getElementById('hangar-ship-choice'),hangarShipSelect=document.getElementById('hangar-ship'),hangarShipCaption=document.getElementById('hangar-ship-caption');
const cockpitQuestList=document.getElementById('cockpit-quest-list');
const cockpitOrder=document.getElementById('cockpit-order'),cockpitStatus=document.getElementById('cockpit-launch-status'),cockpitLaunch=document.getElementById('cockpit-launch'),cockpitExit=document.getElementById('cockpit-exit'),cockpitBridge=document.getElementById('cockpit-bridge');
const cockpitMission=document.getElementById('cockpit-mission'),cockpitPlanName=document.getElementById('cockpit-plan-name'),cockpitRemovePlan=document.getElementById('cockpit-remove-plan');
const cockpitPickers=Object.fromEntries(['mission','mode'].map(kind=>[kind,{
 picker:document.getElementById('cockpit-'+kind+'-picker'),
 add:document.getElementById('cockpit-add-'+kind),
 close:document.getElementById('cockpit-close-'+kind),
 select:kind==='mission'?cockpitMission:cockpitOrder
}]));
let cockpitSession=null,hangarLaunching=false,linkedHangarReturn,preferredHangarOrder=null;
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
const fitShield=document.getElementById('fit-shield'),fitAegis=document.getElementById('fit-aegis-option'),fitShieldStat=document.getElementById('fit-shield-stat');
const flightShield=document.getElementById('flight-shield');
const fitHullStat=document.getElementById('fit-hull-stat'),fitWeightStat=document.getElementById('fit-weight-stat'),fitEngineStat=document.getElementById('fit-engine-stat'),fitPrimaryStat=document.getElementById('fit-primary-stat'),fitSecondaryStat=document.getElementById('fit-secondary-stat');
const mainThrustButton=document.getElementById('main-thruster');
const hangarSoundArm=document.getElementById('hangar-engine-audio'),hangarSoundStatus=document.getElementById('hangar-engine-status');
const canopyRig=document.getElementById('hangar-canopy-rig'),canopyButton=document.getElementById('hangar-canopy-button'),canopyHint=document.getElementById('canopy-hint'),hangarEngineTest=document.getElementById('hangar-test-engine');
if(!canvas||!hud||!overlay)return;
const g=canvas.getContext('2d',{alpha:false});
if(!g){overlay.textContent='This browser cannot display the game canvas.';return;}
const VIEW_W=480,VIEW_H=720,W=960,H=1440,TAU=Math.PI*2,edge=12,arena={left:edge,right:W-edge,top:edge,bottom:H-edge};
const floorNorth=()=>arena.top-edge;
const launch={x:W/2,y:988.8},carrierArrival={seconds:2,fromY:H+73,exterior:190};
const missionFlight={hold:1.2,travel:1.4,toY:H+carrierArrival.exterior+76};
const arrivalDeck=document.getElementById('flight-deck'),arrivalRack=document.querySelector?.('.weapon-rack');
function flightCamera(ship=missionDeparture?.craft??p){
 const anchor=ship??launch;
 const outside=playerIngress||missionDeparture?.flying?clamp(anchor.y-(H-carrierArrival.exterior),0,carrierArrival.exterior):0;
 // Zoom only as the fighter descends. Reversing the lift returns smoothly
 // to the ordinary flight frame, with the same transform used by aiming.
 const close=capitalLocked()&&!motion?.matches?1-berthLift(capitalShip):0;
 const maxZoom=Math.min(1.28,Math.max(1,frameH/440),Math.max(1,frameW/325));
 const zoom=1+(maxZoom-1)*close,w=frameW/zoom,h=frameH/zoom;
 const x=close?anchor.x+clamp((capitalShip.x-anchor.x)*close*.58,-w*.30,w*.30):anchor.x;
 const y=close?anchor.y+clamp((capitalShip.y-anchor.y)*close*.58,-h*.30,h*.30):anchor.y;
 return {x:clamp(x-w/2,0,W-w),y:clamp(y-h/2,floorNorth(),H+outside-h),w,h,zoom};
}
const fighterSprite=typeof window.Image==='function'?new window.Image():null;
if(fighterSprite)fighterSprite.src='./fighter-winged.png?v=23';
const fighterBankArts={left:null,right:null};
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
const fighterProfiles={winged:{hullHp:20,weight:60,engine:'stock-thruster'}};
const engineProfiles={
 'stock-thruster':{weight:20,speedRating:10,strength:10,acceleration:1750,he3PerSecond:1,audioProfile:'stock-loop'},
 'test-thruster':{weight:14,speedRating:5,strength:7,acceleration:1750,he3PerSecond:1,audioProfile:'synth'}
};
const powerProfiles={'weifer-he3-core':{name:'Weifer He3 Generator Core',weight:8,he3PerSecond:2}};
const batteryProfiles={'kestrel-h20-reserve-cell':{name:'Kestrel H20 Reserve Cell',capacityHe3:20,weight:6,medium:'Superconducting ceramic lattice'}};
const shieldProfiles={'aegis-s3':{name:'Aegis S-3 Shield Generator',weight:12,capacity:5,duration:3,cooldown:10,absorption:{energy:1,ballistic:.5}}};
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
const flightEnvelope={strafe:.78,reverse:.72,strafeThrust:.34,reverseThrust:.62,noseTrim:.23,sideTrim:.72};
const flightMassRatios=weight=>{
 const impulse=clamp(stockFitWeight/weight,.72,1.27);
 return {impulse,speed:clamp(impulse**.95,.73,1.25),handling:clamp(impulse**2.15,.60,1.48)};
};
const hardImpactSpeed=185,hardImpactAlignment=.94;
const guns={
 blaster:{label:'Sterling',fullLabel:'Sterling C.32 Laser',kind:'energy',he3PerShot:1,normalInterval:.20,targetSpreadChance:0,weight:5,damage:3,holdRepeat:false,preview:'./blaster-test.mp3',speed:570,recoil:20,kick:.145,push:.286,pushMax:245,normalSpread:0,burstSpread:2.5,muzzle:13,edge:'#32a786',core:'#d4fff1',hit:'#d0fff2',ring:'#99ffe0'},
 ballistic:{label:'A-Alkine',fullLabel:'A-Alkine Ballistic Repeater',kind:'ballistic',normalInterval:.125,burst:{pattern:[0,-.5,.5,-1,1,0],interval:.043,recovery:.46},targetSpreadChance:1,weight:7,damage:5,holdRepeat:true,preview:'./ballistic-test.mp3',speed:570,recoil:34,kick:.185,push:.422,pushMax:335,normalSpread:1.8,burstSpread:6,muzzle:17,edge:'#f49a31',core:'#fff4b8',hit:'#ffd387',ring:'#ffbc63'},
 ak77:{label:'AK77',fullLabel:'AK77 Gatling Ballistic',kind:'ballistic',targetSpreadChance:1,weight:9,damage:2,holdRepeat:false,burstOnly:true,
  burst:{pattern:[0,-.25,.25,-.5,.5,-.8,.8,-1,1,-.65,.65,-.85,.85,-.55,.55,-.25,.25,0],interval:.035,recovery:1.75},
  preview:'./ballistic-test.mp3',speed:570,recoil:20,kick:.12,push:.245,pushMax:265,normalSpread:0,burstSpread:7,muzzle:15,edge:'#ef8147',core:'#fff4d3',hit:'#ffd2a0',ring:'#ff9964'}
};
const shotSoundKey='rift-runner.shot-sound.v1',fitKey='rift-runner.fighter-fit.v1',engineFitKey='rift-runner.engine-fit.v1';
function readFighterFit(){
 const standard={primary:'blaster',secondary:'ballistic'};
 try{
  const saved=JSON.parse(localStorage.getItem(fitKey));
  if(saved?.version===1&&Object.hasOwn(guns,saved.primary)){
   const alternate=Object.keys(guns).find(name=>name!==saved.primary);
   return {primary:saved.primary,secondary:saved.secondary===null?null:
    Object.hasOwn(guns,saved.secondary)&&saved.secondary!==saved.primary?saved.secondary:alternate};
  }
 }catch{}
 return standard;
}
const shipBuildKey='rift-runner.ship-build.v1',hullKey='rift-runner.hull-owned.v1',hullId='rift-fighter';
const hullRepairDurationMs=240000,legacyHullRepairDurationMs=60000;
let hullRepairReadyAt=0,hullRepairSpan=0,lastHullRepairRefresh=-Infinity;
function saveHullCertificate(condition,readyAt,expected,damage=null,generation=undefined){
 const data=JSON.stringify({version:1,hull:hullId,condition,...(condition==='repairing'?{readyAt,durationMs:hullRepairDurationMs}:condition==='repaired'?{repairedAt:readyAt}:{}),...damage});
 try{
  if(readHullRaw()!==expected||generation!==undefined&&currentCharacterGeneration()!==generation)return false;
  localStorage.setItem(hullKey,data);
  return readHullRaw()===data&&(generation===undefined||currentCharacterGeneration()===generation)?data:false;
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
 if(!managedBuild)return id!=='aegis-s3'||ownsAegis();
 try{return wallet.owned.includes(id)&&window.RiftCredits?.owns?.(id)===true;}catch{return false;}
}
function ownedSlot(slot,value,wallet){
 return typeof value==='string'&&Object.hasOwn(partProfiles[slot],value)&&ownsBuildPart(value,wallet)?value:null;
}
function readHullRaw(){
 try{return localStorage.getItem(hullKey)??null;}catch{return undefined;}
}
function hasFinishedHangarRepair(raw){
 try{const cert=JSON.parse(raw);return cert?.condition==='repaired'&&Number.isSafeInteger(cert.repairedAt)&&cert.repairedAt>0;}catch{return false;}
}
function fighterHullCondition(wallet=readBuildWallet(),raw=readHullRaw()){
 hullRepairReadyAt=hullRepairSpan=0;
 if(!wallet||raw===undefined)return 'unavailable';
 if(raw!==null){
  try{
   const cert=JSON.parse(raw);
   if(cert?.version!==1||cert.hull!==hullId)return 'unavailable';
   if(Object.hasOwn(cert,'hullHp')||Object.hasOwn(cert,'maxHullHp')){
    const damage=hullDamage(raw);
    if(!damage||cert.condition==='repaired'&&damage.hullHp===0||cert.condition==='damaged'&&damage.hullHp!==0)return 'unavailable';
   }
   if(['damaged','repaired'].includes(cert.condition))return cert.condition;
   if(cert.condition!=='repairing'||!Number.isSafeInteger(cert.readyAt)||cert.readyAt<=0||
    (Object.hasOwn(cert,'durationMs')&&cert.durationMs!==hullRepairDurationMs))return 'unavailable';
   if(Date.now()>=cert.readyAt&&saveHullCertificate('repaired',cert.readyAt,raw))return 'repaired';
   hullRepairReadyAt=cert.readyAt;
   hullRepairSpan=cert.durationMs??legacyHullRepairDurationMs;
   return 'repairing';
  }catch{return 'unavailable';}
 }
 if(wallet.origin==='legacy')return 'repaired';
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
function readShipRaw(){
 try{return localStorage.getItem(shipBuildKey)??null;}catch{return undefined;}
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
 if(!source&&wallet.origin==='legacy')source={...readFighterFit(),engine:preferredEngine(),core:coreId,battery:batteryId,shield:preferredShield()};
 if(!source)return empty;
 const fit=Object.fromEntries(Object.keys(empty).map(slot=>[slot,ownedSlot(slot,source[slot],wallet)]));
 if(fit.primary===fit.secondary)fit.secondary=null;
 return fit;
}
const initialBuild=readShipBuild(),fighterFit={primary:initialBuild.primary,secondary:initialBuild.secondary};
const isMounted=name=>typeof name==='string'&&(name===fighterFit.primary||name===fighterFit.secondary);
const activeGunKey=managedBuild?'rift-runner.ship-active-gun.v1':shotSoundKey;
function preferredWeapon(){
 try{const key=localStorage.getItem(activeGunKey)??(readBuildWallet()?.origin==='legacy'?localStorage.getItem(shotSoundKey):null);if(isMounted(key))return key;}catch{}
 return fighterFit.primary??fighterFit.secondary;
}
const fighterLoadout=Object.seal({fighter:stockFighterId,weapon:preferredWeapon(),engine:initialBuild.engine,power:initialBuild.core,battery:initialBuild.battery,shield:initialBuild.shield,countermeasure:null,utility:null});
function equippedSlot(slot){
 return slot==='core'?fighterLoadout.power:slot==='primary'||slot==='secondary'?fighterFit[slot]:fighterLoadout[slot];
}
function missingFitParts(wallet=readBuildWallet()){
 return primaryParts.filter(slot=>!ownedSlot(slot,equippedSlot(slot),wallet));
}
function refreshStoredFit(raw=readShipRaw()){
 if(!managedBuild||state!=='menu'||raw===undefined)return false;
 const found=readShipBuild(raw);
 if(Object.keys(partProfiles).every(slot=>equippedSlot(slot)===found[slot]))return true;
 Object.assign(fighterFit,{primary:found.primary,secondary:found.secondary});
 Object.assign(fighterLoadout,{engine:found.engine,power:found.core,battery:found.battery,shield:found.shield});
 if(!isMounted(fighterLoadout.weapon)){fighterLoadout.weapon=preferredWeapon();shotSoundVersion++;}
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
 const key=managedBuild?shipBuildKey:oldKey,value=managedBuild?serial:oldValue;
 try{
  if(managedBuild&&(expectedRaw===undefined||readShipRaw()!==expectedRaw))return false;
  localStorage.setItem(key,value);return localStorage.getItem(key)===value;
 }catch{return false;}
}
const fittedFighter=()=>fighterProfiles[fighterLoadout.fighter],fittedEngine=()=>engineProfiles[fighterLoadout.engine];
const mountedGun=()=>guns[fighterLoadout.weapon],fittedShield=()=>fighterLoadout.shield==='aegis-s3'&&shieldOwned?shieldProfiles['aegis-s3']:null;
let shieldOwned=fighterLoadout.shield==='aegis-s3',shieldClock=0,shieldHp=0,shieldUntil=0,shieldReadyAt=0,shieldHitAt=-Infinity;
function refreshShieldOwnership(){
 const old=shieldOwned;
 shieldOwned=ownsAegis();
 if(!shieldOwned)shieldHp=0;
 if(old!==shieldOwned&&p&&fighterLoadout.shield==='aegis-s3')syncFlightFit();
 return shieldOwned;
}
function shieldUp(at=shieldClock){return shieldHp>0&&at<shieldUntil-1e-8;}
function resetShield(){shieldClock=shieldHp=shieldUntil=shieldReadyAt=0;shieldHitAt=-Infinity;}
function showShieldControl(){
 if(!flightShield)return;
 const fitted=fittedShield();
 flightShield.hidden=!fitted||state!=='play'||capitalLocked()||document.hidden;
 if(flightShield.hidden)return;
 const active=shieldUp(),wait=shieldReadyAt-shieldClock;
 const phase=active?'active':wait>1e-8?'cooldown':'ready';
 const label=active?'Shield '+shieldHp+'/'+fitted.capacity+' · '+Math.ceil(shieldUntil-shieldClock)+'s':
  phase==='cooldown'?'Shield · '+Math.ceil(wait)+'s':'Shield ready';
 flightShield.disabled=phase!=='ready';flightShield.dataset.phase=phase;
 if(flightShield.textContent!==label)flightShield.textContent=label;
}
function activateShield(){
 if(fighterLoadout.shield!=='aegis-s3'||!refreshShieldOwnership())return false;
 const fitted=fittedShield();
 if(!fitted||state!=='play'||capitalLocked()||document.hidden||hangarDialog?.open||!p.hp||shieldClock+1e-8<shieldReadyAt)return false;
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
 if(shieldHp===0){shieldUntil=at;shieldReadyAt=at+fitted.cooldown;}
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
 const ready=p.he3+1e-8>=guns.blaster.he3PerShot;
 if(laserHe3Ready!==ready){laserHe3Ready=ready;showFire();}
 if(!flightHe3Meter||!flightHe3Amount)return;
 const capacity=fittedBattery()?.capacityHe3??0,value=Math.min(capacity,Math.floor(p.he3+1e-8));
 if(flightHe3Meter.max!==(capacity||1))flightHe3Meter.max=capacity||1;
 if(flightHe3Meter.value!==value)flightHe3Meter.value=value;
 const text=value+' / '+capacity;
 if(flightHe3Amount.textContent!==text)flightHe3Amount.textContent=text;
}
function fittedWeight(){
 return fittedFighter().weight+(fittedEngine()?.weight??0)+(fittedGenerator()?.weight??0)+
  (fittedBattery()?.weight??0)+(fittedShield()?.weight??0)+(guns[fighterFit.primary]?.weight??0)+(guns[fighterFit.secondary]?.weight??0);
}
function syncFlightFit(){
 const weight=fittedWeight(),engine=fittedEngine(),ratios=flightMassRatios(weight);
 const thrustFactor=((engine?.strength??0)/stockEngineStrength)*ratios.handling;
 Object.assign(p,{weight,recoilFactor:ratios.impulse,speed:(engine?.speedRating??0)*speedPerRating*ratios.speed,
  acceleration:(engine?.acceleration??0)*thrustFactor,brakeDamping:stockBrakeDamping*thrustFactor,invMass:.32*ratios.impulse});
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
 const gun=mountedGun();
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
 if(!hangarSoundArm||!hangarDialog?.open)return;
 const ready=soundOn&&audio?.state==='running'&&!!master;
 hangarSoundArm.hidden=ready||hangarEngineTest?.disabled===true;
 hangarSoundArm.textContent=soundOn?'Enable sound':'Turn sound on';
 if(hangarSoundStatus){
  const copy=hangarSoundArm.hidden?(ready?'Engine sound ready. Hold Test engine.':''):
   soundOn?'Tap Enable sound, then hold Test engine.':'Game sound is off.';
  if(hangarSoundStatus.textContent!==copy)hangarSoundStatus.textContent=copy;
 }
}
const audioReady=()=>audioStatus('Audio active in browser.');
const audioPending=()=>audioStatus('No audio yet. Tap a test button again.');
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
 try{localStorage.setItem(phoneKey,phoneAudioOn?'on':'off');}catch{}
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
 stopBallisticHold();stopFirePointer();cancelFireBurst();lastGunTap=null;stopNativePreview();fighterLoadout.weapon=next;shotSoundVersion++;showGun();syncArenaMusic();
 try{if(next!==null)localStorage.setItem(activeGunKey,next);}catch{}
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
function canPlayArenaMusic(){
 return soundOn&&master&&audio?.state==='running'&&state==='play'&&!audioParked&&!document.hidden&&!hangarDialog?.open&&!nativePreview;
}
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
 const old=audio,out=master;audio=null;master=null;openingAudio=null;
 blaster=null;ballistic=null;burstEchoAsset=null;arenaMusicAsset=null;thrusterAsset=null;noiseContext=null;noiseBuffer=null;stopBurstEcho();stopArenaMusic();
 if(enginePress!==keepEnginePress)cancelEngineTest();
 stopThruster(true);stopProjectileVoices();stopCanopyNodes();
 if(out){try{out.gain.value=0;out.disconnect();}catch{}}
 stopEffectVoices();stopWingRadioStatic();
 if(old?.state!=='closed'&&old?.close){try{Promise.resolve(old.close()).catch(()=>{});}catch{}}
}
function parkAudio(){
 resumeAfterHangar=false;
 audioParked=true;stopNativePreview();releasePhoneAudio();cancelHangarPress();cancelCanopyAudio();retireAudio();
 if(state==='play'||state==='arrive')pause();
}
function showAudioReady(){
 if(!audioParked||document.hidden)return;
 audioParked=false;
 if(soundOn)audioStatus('Ready. Tap Resume flight or a sound test.');
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
 soundOn=enabled;
 if(soundSwitch)soundSwitch.checked=enabled;
 try{localStorage.setItem(soundKey,soundOn?'on':'off');}catch{}
 if(master){try{master.gain.value=soundOn?masterLevel:0;}catch{}}
 if(soundOn)unlockAudio(undefined,event);else{openingAudio=null;stopDockVoice();stopWingRadioStatic();stopNativePreview();releasePhoneAudio();cancelEngineTest();cancelCanopyAudio();stopThruster(true);stopProjectileVoices();stopBurstEcho();stopArenaMusic();audioStatus('Sound off.');}
 refreshHangarEngineAudio();
}
soundSwitch?.addEventListener('change',event=>setGameSound(soundSwitch.checked,event));
hangarSoundArm?.addEventListener('click',event=>{
 if(!event.isTrusted||!hangarDialog?.open||document.hidden)return;
 if(!soundOn)setGameSound(true,event);else unlockAudio(refreshHangarEngineAudio,event);
});
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
function cannonCrack(){
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
  filter=audio.createBiquadFilter();filter.type='lowpass';filter.frequency.setValueAtTime(1600,t);filter.frequency.exponentialRampToValueAtTime(280,t+.052);
  env=audio.createGain();env.gain.setValueAtTime(.19,t);env.gain.exponentialRampToValueAtTime(.001,t+.065);
  hit.connect(filter);filter.connect(env);env.connect(master);voices.add(hit);
  hit.onended=()=>{voices.delete(hit);try{hit.disconnect();filter.disconnect();env.disconnect();}catch{}};
  hit.start(t);hit.stop(t+.067);
 }catch{if(hit)voices.delete(hit);try{hit?.disconnect();filter?.disconnect();env?.disconnect();}catch{}}
}
function playShotSample(){
 const token=shotToken(fighterLoadout.weapon);
 const buffer=token?.context===audio?token.buffer:null;
 if(!buffer)return false;
 let source,level;
 try{
  source=audio.createBufferSource();source.buffer=buffer;source.loop=false;
  level=audio.createGain();level.gain.value=.43;source.connect(level);level.connect(master);voices.add(source);
  source.onended=()=>{voices.delete(source);try{source.disconnect();level.disconnect();}catch{}};
  source.start(audio.currentTime);
  return true;
 }catch{if(source)voices.delete(source);try{source?.disconnect();level?.disconnect();}catch{}return false;}
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
let thruster=null,enginePress=null;
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
 const flight=state==='play'&&(thrustPtr||has('KeyE')||(input?(input.thrust||input.x!==0||input.y!==0):has('KeyA')!==has('KeyD')||has('KeyW')!==has('KeyS')));
 if(flight){startThruster();return;}
 if(enginePress?.sound){startThruster(enginePress.insideHangar?hangarGain(hangarPower(enginePress)):null);return;}
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
 if(event.isTrusted!==true||document.hidden||nativePreview||enginePress||insideHangar!==!!hangarDialog?.open||insideHangar&&fighterHullCondition()!=='repaired'||!fittedEngine())return false;
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
  if(event?.isTrusted!==true||document.hidden||nativePreview||insideHangar!==!!hangarDialog?.open||enginePress)return;
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
 const step=turnRate*dt;
 if(Math.abs(delta)<=step+1e-9)snapHeading(ship,target.angle);
 else ship.aim+=Math.sign(delta)*step;
}
const noseReady=(ship,heading)=>Math.abs(headingDelta(ship.aim,heading))<=npcShotArc;
function snapAim(angle){snapHeading(p,angle);}
if(aimSwitch)aimSwitch.checked=aimAssist;
aimSwitch?.addEventListener('change',()=>{
 aimAssist=!!aimSwitch.checked;aimManuallyPlaced=false;autoLock=null;
 try{localStorage.setItem(aimAssistKey,aimAssist?'on':'off');}catch{}
});
function inputSource(isTouch){if(touchFlight!==isTouch){touchFlight=isTouch;autoLock=null;}}
function usingAimAssist(){return aimAssist&&touchFlight&&!aimManuallyPlaced&&!aimPtr;}
function autoTarget(){
 if(!usingAimAssist()){autoLock=null;return null;}
 const camera=flightCamera(),visible=c=>c.x>=camera.x&&c.y>=camera.y&&c.x<=camera.x+camera.w&&c.y<=camera.y+camera.h;
 const distance=c=>(c.x-p.x)**2+(c.y-p.y)**2;
 let nearest=null,best=Infinity;
 for(const c of cones){if(!visible(c))continue;const gap=distance(c);if(gap<best){nearest=c;best=gap;}}
 let blockers;
 const rivals=activeVanduls().filter(ship=>visible(ship)&&playerCanSee(ship,blockers??=visionBlockers()));
 for(const rival of rivals){const gap=distance(rival);if(gap<best){nearest=rival;best=gap;}}
 if(nearest&&autoLock&&visible(autoLock)&&(rivals.includes(autoLock)||cones.includes(autoLock))&&distance(autoLock)<=best*1.30)return autoLock;
 autoLock=nearest;return nearest;
}
function aimForTouchAssist(){
 const target=autoTarget();if(target)snapAim(Math.atan2(target.y-p.y,target.x-p.x));
 return target;
}
const stars=Array.from({length:150},(_,i)=>({x:(i*107+i*i*11)%W,y:(i*173+i*i*7)%H,r:i%17===0?1.65:i%3===0?1.04:.44,d:18+(i%13)*7,h:i%5===0?'#67c3d6':i%7===0?'#b853c2':'#b4d1ed'}));
// Capital test is carrier operations only, not an enemy fight or an escort.
const capitalCourse={north:960,x:475,y:175,halfRun:390,radius:150,speed:38,width:292,height:438};
const capitalSections=[[0,-.36,25],[0,-.23,42],[0,-.03,60],[0,.16,76],[0,.29,84]];
const capitalWarning='Capital test · No credits or damage saved';
const pegasusCapital=Object.freeze({id:'pegasus',name:'Pegasus',art:'./carrier-capital.webp?v=133',sections:capitalSections});
const bifrostCapital=Object.freeze({id:'bifrost',name:'Bifrost',art:'./bifrost-top.webp',
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
 const capitalLocked=()=>!!capitalShip&&capitalShip.phase!=='flight';
const smoothBerth=(p)=>{const t=clamp(p,0,1);return t*t*(3-2*t);};
// These two crew flights are visual traffic in carrier-local lanes, not
// combat actors. The player's aft centerline and rear pads remain separate.
function advanceCapitalTraffic(ship,dt){
 if(!Number.isFinite(dt)||dt<=0)return;
 const b=capitalBerth,turn=Math.PI/2,frame=Math.min(dt,.1);
 for(const wing of ship.deckCrew??[]){
  const [px,py]=(ship.pads??capitalPads)[wing.pad],side=wing.side===-1?-1:wing.side===1?1:wing.pad===0?-1:1;
  const launchTime=b.launchSeconds+1,patrolTime=side<0?13.8:14.7,dockTime=b.dockSeconds+1.65;
  let left=frame;
  while(left>0){
   if(wing.phase==='parked'){
    const used=Math.min(left,Math.max(0,wing.wait));wing.wait-=used;left-=used;
    if(wing.wait>0)break;
    wing.phase='launching';wing.phaseTime=0;
   }else{
    const duration=wing.phase==='launching'?launchTime:wing.phase==='patrol'?patrolTime:dockTime;
    const used=Math.min(left,Math.max(0,duration-wing.phaseTime));wing.phaseTime+=used;left-=used;
    if(wing.phaseTime+1e-9<duration)break;
    if(wing.phase==='launching')wing.phase='patrol';
    else if(wing.phase==='patrol')wing.phase='docking';
    else{
     wing.phase='parked';wing.laps=(wing.laps??0)+1;
     wing.wait=(side<0?4.1:5.8)+(wing.laps%3)*1.15;
    }
    wing.phaseTime=0;
   }
  }
  if(wing.phase==='parked')Object.assign(wing,{lx:px,ly:py,heading:0,scale:b.parkScale});
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
 const d=capitalShip.distance,speed=capitalCourse.speed,h=.08;
 const a=berthWorld(capitalCoursePose(d-h),lx,ly),b=berthWorld(capitalCoursePose(d+h),lx,ly);
 return {x:(b.x-a.x)*speed/(2*h),y:(b.y-a.y)*speed/(2*h)};
}
function capitalDockCheck(){
 const c=capitalShip;if(!c||c.phase!=='flight'||!p.dockingClearance)return null;
 const port=berthWorld(c,0,capitalBerth.approach),v=berthVelocity(0,capitalBerth.approach);
 const gap=Math.hypot(p.x-port.x,p.y-port.y),speed=Math.hypot(p.vx-v.x,p.vy-v.y);
 const available=c.pilotPads.includes(c.pad)&&!c.deckCrew.some(member=>member.pad===c.pad);
 const inRange=gap<=capitalBerth.maxGap;
 // The visible hologram is the capture boundary. Bridge control aligns the
 // fighter after capture; speed is measured against the moving beacon.
 return {port,gap,speed,inRange,available,ready:available&&inRange&&speed<=capitalBerth.maxSpeed};
}
function updateCapitalHud(){
 if(capitalHangar){
  const stored=capitalShip?.phase==='stored';
  capitalHangar.hidden=!stored;
  capitalHangar.disabled=!stored||state!=='play';
 }
 if(!capitalHud)return;
 capitalHud.hidden=!capitalShip;
 if(!capitalShip){if(dockingComms)dockingComms.hidden=true;return;}
 const phase=capitalShip.phase,check=capitalDockCheck(),onBifrost=capitalShip.vessel===bifrostCapital;
 const available=phase==='docked'||phase==='stored',queued=!!p.dockQueuedUntil,canQueue=check?.available&&check.inRange;
 const label=available?'Launch':phase==='storing'?'Storing…':phase==='retrieving'?'Retrieving…':phase==='launching'?'Launching…':phase==='docking'?'Docking…':queued?'Cancel Dock':check?.ready?'Dock':check?'Queue Dock':'Request Docking';
 const text=phase==='docked'?'Aboard · Carrier underway':phase==='stored'?'Stored in internal hangar':
  phase==='storing'||phase==='retrieving'?'Shared lift in use':phase==='launching'?'Aft departure · Controls return at clearance':
  phase==='docking'?(capitalShip.berthMove.time>=capitalBerth.dockSeconds-capitalBerth.lowerSeconds?'Lowering to deck':'Aligning with pad '+(capitalShip.pad+1)):!check?'No clearance':
  check.ready?'In range · Tap Dock':!check.available?'Pad unavailable':!check.inRange?'Enter docking ring · '+Math.ceil(check.gap-capitalBerth.maxGap)+' u':
  (queued?'Queued · ':'')+'Slow down · '+Math.round(check.speed)+' u/s relative';
 const comms=phase==='docking'?'Approach confirmed. Your berth is ready.':!check?'':queued?'Dock queued. Slow down inside the ring.':
  capitalShip.returnGreeting?'Back so soon? All right, I’ve got a spot for you.':check.ready?'Your berth is ready. Tap Dock.':'Clearance granted. Enter the ring and slow down.';
 if(dockingComms){
  const hidden=state!=='play'||elapsed>=(capitalShip.commsUntil??0);
  if(dockingComms.hidden!==hidden)dockingComms.hidden=hidden;
  if(dockingCommsText&&dockingCommsText.textContent!==comms)dockingCommsText.textContent=comms;
 }
 const status=onBifrost?capitalShip.name+' · '+text:text;
 if(capitalStatus&&capitalStatus.textContent!==status)capitalStatus.textContent=status;
 if(capitalAction){
  if(capitalAction.textContent!==label)capitalAction.textContent=label;
  capitalAction.disabled=state!=='play'||(!available&&(phase!=='flight'||!!check&&!check.ready&&!queued&&!canQueue));
 }
 if(capitalStore){capitalStore.hidden=phase!=='docked';capitalStore.disabled=state!=='play'||phase!=='docked';}
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
   const at=c.pilotPads.indexOf(c.pad);c.pad=c.pilotPads[(at+1)%c.pilotPads.length];
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
 const offset=berthLocal(c,p.x,p.y),diff=p.aim-c.aim;
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
 if(!c||event.isTrusted!==true||state!=='play'||document.hidden||routeParked||hangarDialog?.open)return;
 if(c.phase==='flight'&&!p.dockingClearance){
  // Local clearance is granted to this fighter. A separate request to
  // capture must still pass the real position, relative speed and heading.
  p.dockingClearance=true;
  // First contact always uses standard clearance; only later requests can roll a return greeting.
  c.returnGreeting=++c.dockRequests>1&&!!dockReturnVoice?.src&&Math.random()<1/3;
  const fadeAt=c.returnGreeting?3.61:7.53;
  c.commsUntil=elapsed+fadeAt+.32;
  dockingComms?.style.setProperty('--dock-signoff',fadeAt+'s');
  setDockPortrait(c.returnGreeting);updateCapitalHud();speakDockClearance(event,c.returnGreeting);return;
 }
 if(c.phase==='docked'||c.phase==='stored'){c.phase=c.phase==='stored'?'retrieving':'launching';c.berthMove={time:0};}
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
 if(c?.phase!=='docked'||event.isTrusted!==true||state!=='play'||document.hidden||routeParked||hangarDialog?.open)return;
 // One latched berthing phase owns the internal lift. Exterior launches
 // never wait for or take this lift; this mode has no artificial NPC queue.
 c.phase='storing';c.berthMove={time:0};clearInput();syncArrivalControls();
}
let capitalShip=null;
const capitalArt=new Map();
function capitalCoursePose(distance,course=capitalCourse){
 const {x,y,halfRun,radius}=course;
 const line=2*halfRun,arc=Math.PI*radius,s=((distance%(2*(line+arc)))+2*(line+arc))%(2*(line+arc));
 if(s<line)return {x:x+radius,y:y+halfRun-s,aim:-Math.PI/2};
 if(s>=line+arc&&s<2*line+arc)return {x:x-radius,y:y-halfRun+s-line-arc,aim:Math.PI/2};
 const north=s<line+arc,a=north?-(s-line)/radius:Math.PI-(s-2*line-arc)/radius;
 return {x:x+radius*Math.cos(a),y:y+(north?-halfRun:halfRun)+radius*Math.sin(a),aim:Math.atan2(-Math.cos(a),Math.sin(a))};
}
function updateCapital(dt){
 if(!capitalShip)return;
 advanceCourseShip(capitalShip,capitalCourse,capitalShip.vessel.sections,dt);advanceCapitalTraffic(capitalShip,dt);
}
function advanceCourseShip(ship,course,sections,dt){
 ship.distance+=ship.speed*dt;
 Object.assign(ship,capitalCoursePose(ship.distance,course));
 const a=ship.aim+Math.PI/2,u=Math.cos(a),v=Math.sin(a);
 for(const [i,[x,y]] of sections.entries()){
  const piece=ship.hull[i],lx=x*course.width,ly=y*course.height;
  const X=ship.x+u*lx-v*ly,Y=ship.y+v*lx+u*ly;
  piece.prevX=dt>0?piece.x:X;piece.prevY=dt>0?piece.y:Y;piece.x=X;piece.y=Y;
  piece.vx=dt>0?(X-piece.prevX)/dt:0;piece.vy=dt>0?(Y-piece.prevY)/dt:0;
 }
}
function launchCapitalTest(vessel=pegasusCapital,launchNow=false){
 p.dockingClearance=false;
 for(const [clip,src] of [[dockVoice,'./dock-clearance-radio.mp3?v=154'],[dockReturnVoice,dockReturnVoice?.dataset.voiceSrc]]){
  if(clip&&src&&!clip.getAttribute('src')){clip.preload='auto';clip.setAttribute('src',src);}
 }
 setDockPortrait(false);
 const pads=vessel===bifrostCapital?bifrostPads:capitalPads,lift=vessel===bifrostCapital?bifrostLift:capitalLift;
 const deckCrew=[-1,1].map((side,pad)=>({pad,side,phase:'parked',wait:side<0?2.6:5.8,
  lx:pads[pad][0],ly:pads[pad][1],heading:0,scale:capitalBerth.parkScale}));
 capitalShip={vessel,name:vessel.name,lift,distance:0,speed:capitalCourse.speed,pad:2,pads,deckCrew,dockRequests:0,returnGreeting:false,pilotPads:[2,3],phase:'docked',
  berthMove:null,hull:vessel.sections.map(([, ,r])=>({capitalHull:true,r,invMass:0,spin:0}))};
 if(!capitalArt.has(vessel.id)&&typeof window.Image==='function'){
  const art=new window.Image();art.src=vessel.art;capitalArt.set(vessel.id,art);
 }
 if(vessel===bifrostCapital)loadCapitalIdentity(capitalShip);
 updateCapital(0);cones=[];
 placeBerthPilot(...pads[capitalShip.pad],0,0);
 if(launchNow){capitalShip.phase='launching';capitalShip.berthMove={time:0};}
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
let shots=[],cones=[],sparks=[],rings=[],clashBursts=[],recoil=0,practiceHits=0,practiceShots=0,hudKey='',hudNumbers=null;
let duelEnabled=false,vanduls=[],vandulIngress=null,vandulLasers=[],duelClock=0,duelCountdown=0,duelResult=null,vandulSprite=null;
const duelCountdownSeconds=3;
let wingman=null,testLead=null,testPlayerSlot=null,testLeadGuide=null,wingmanKills=0,wingmanOrder='formation';
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
 return {hull:fighterLoadout.fighter,r:p.r,maxHp:fittedFighter().hullHp,invMass:p.invMass,speed:p.speed,recoilFactor:p.recoilFactor,
  weapons,preferredBurst:Object.fromEntries(weapons.map(id=>[id,!!burstModes[id]])),
  he3Capacity:fittedBattery()?.capacityHe3??0,he3Rate:fittedGenerator()?.he3PerSecond??0};
}
function makeAlliedFighter(x,y,formation,role,displayName){
 const fit=alliedFighterFit();
 return {x,y,prevX:x,prevY:y,formation,role,displayName,allyShip:true,fit,r:fit.r,aim:-Math.PI/2,vx:0,vy:0,
  hp:fit.maxHp,maxHp:fit.maxHp,invMass:fit.invMass,spin:0,wallFx:0,hitGlow:0,fireWait:role==='lead'?.57:.35,
  he3:0,heat:0,coolAt:0,normalIndex:0,normalGroup:0,normalWeapon:null,volley:null,muzzleLight:0,
  loosePoint:null,looseContact:null,looseWait:0,formationBypass:null,formationClearFor:0};
}
const canCommandWingman=()=>state==='play'&&!document.hidden&&!routeParked&&!hangarDialog?.open&&p?.hp>0&&
 (wingman?.hp>0||testLead?.hp>0);
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
 for(const ship of [wingman,testLead])if(ship){
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
const waveSize=()=>isWingmanTest()?trainingPosts.length:duelWave>=6?3:duelWave>=4?2:1;
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
function buildDuelCover(occupied,random,squadron=false,extraBands=[]){
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
 return {rocks,scrap};
}
function resetAsteroids(){
 asteroids=[];sceneryDebris=[];if(!duelEnabled||!asteroidCover)return;
 if(!asteroidAtlas&&typeof window.Image==='function'){
  asteroidAtlas=new window.Image();asteroidAtlas.src='./rift-asteroid-atlas.webp';
 }
 const training=isWingmanTest();
 const held=training&&!vanduls.length?trainingPosts.map(({x,y})=>({x,y,r:vandulProfile.radius})):[];
 const {rocks,scrap}=buildDuelCover([...ingressBlockers(),...held],coverRandom(Math.floor(Math.random()*4294967296)>>>0),training,training?trainingCoverBands:[]);
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
 if(!duelEnabled||isWingmanTest()||state!=='play'||hangarDialog?.open||duelResult==='victory')return;
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
 if(!duelReadout)return;
 if(escortShip){duelReadout.hidden=false;duelReadout.dataset.result='';duelReadout.textContent='Escort test · No credits or damage saved';return;}
 if(capitalShip){
  duelReadout.hidden=false;duelReadout.dataset.result='';
  const label=flightMode.capitalAutoLaunch?'Free flight · No credits or damage saved':capitalWarning;
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
 if(!preserveDockVoice){stopDockVoice();if(capitalShip)capitalShip.commsUntil=0;if(dockingComms)dockingComms.hidden=true;}
 stopBallisticHold();stopFirePointer();stopNativePreview();cancelEngineTest();stopThruster();stopProjectileVoices();
 if(p)p.dockQueuedUntil=0;
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
 endWingRadio();
 playerIngress=null;missionDeparture=null;capitalShip=escortShip=null;wingman=testLead=testPlayerSlot=testLeadGuide=null;wingmanKills=0;wingmanOrder='formation';resetShield();syncArrivalControls();clearInput({resetBurstCooldown:true});aimManuallyPlaced=false;
 const maxHp=fittedFighter().hullHp;
 p={x:launch.x,y:launch.y,r:17,aim:-Math.PI/2,vx:0,vy:0,hp:maxHp,maxHp,he3:0,inv:0,spin:0,wallFx:0,impactCooldown:0,mainMomentum:false,mainThrustActive:false,craft:true,heat:0,coolAt:0};
 syncFlightFit();showFlightPower();showFlightHeat();
 cones=coneLayout.map(([x,y],i)=>({id:i+1,x,y,r:15,vx:0,vy:0,angle:(i*.79)%TAU,spin:0,hitGlow:0,wallFx:0,invMass:1}));
 resetDuel(delayOpeningWave?0:undefined);
 shots=[];sparks=[];rings=[];clashBursts=[];normalShots.clear();nextNormalShot.clear();practiceHits=0;practiceShots=0;recoil=0;shake=0;hudKey='';updateHud();
}
function showGameScreen(active){
 if(gameCabinet)gameCabinet.dataset.view=active?'arena':'menu';
 if(mainScreen)mainScreen.hidden=active;
 if(arenaScreen)arenaScreen.hidden=!active;
}
const carrierExitLabel='Return to Carrier';
const carrierReturnPath=mode=>mode?.capitalVessel===bifrostCapital?'./carrier.html?vessel=bifrost':'./carrier.html';
function syncFlightExit(){
 if(!returnMainMenu)return;
 returnMainMenu.textContent=returnFlightToCarrier?carrierExitLabel:'Menu';
 returnMainMenu.setAttribute('aria-label',returnFlightToCarrier?carrierExitLabel:'Return to Main Menu');
 returnMainMenu.setAttribute('title',returnFlightToCarrier?'End this run and return to the Carrier':'End this run and return to Main Menu');
}
function enterMainMenu(abandonQuest=false){
 if(state==='menu'||hangarDialog?.open)return;
 if(missionDeparture?.questSave==='pending'&&!abandonQuest){
  showMissionComplete(questFailure);return;
 }
 if(!flushBattleDamage()){warnDamageSave();return;}
 const toCarrier=returnFlightToCarrier,destination=carrierReturnPath(flightMode);returnFlightToCarrier=false;
 state='menu';duelEnabled=false;arena.top=edge;resumeAfterHangar=false;
 if(arenaSettings)arenaSettings.open=false;
 cancelHangarPress();cancelCanopyAudio();releasePhoneAudio();retireAudio();
 resetField();last=elapsed=0;overlay.hidden=true;showGameScreen(false);syncFlightExit();
 if(toCarrier){try{window.location.replace(destination);return;}catch{}}
 mainMenuCarrier?.focus({preventScroll:true});
}
function syncArrivalControls(){
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
const vandulFlight=Object.freeze({id:'vandul',duel:true,hull:'battle',credits:true,quest:'intercept',allies:'none'});
const soloTrainingFlight=Object.freeze({...vandulFlight,id:'solo-training',hull:'none',credits:false,quest:null});
const capitalTestFlight=Object.freeze({id:'capital-test',duel:false,hull:'none',credits:false,quest:null,allies:'none',capital:true});
const bifrostTestFlight=Object.freeze({...capitalTestFlight,capitalVessel:bifrostCapital});
const freeFlight=Object.freeze({...capitalTestFlight,id:'free-flight',capitalAutoLaunch:true});
const bifrostFreeFlight=Object.freeze({...freeFlight,capitalVessel:bifrostCapital});
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
const qualificationSpecs=window.RiftMissions?.qualifications??[];
const hangarOrderModes=new Map([
 ['intercept',vandulFlight],['rendezvous',wingmanTestFlight],['escort-drill',escortFlight],
 ...qualificationSpecs.map(({id})=>[id,carrierFlightRoutes.get('?launch=vandul&mission='+id)])
]);
const hangarOrderFromRoute=route=>{
 const prefix='?hangar=carrier&order=';
 if(typeof route!=='string'||!route.startsWith(prefix))return null;
 const order=route.slice(prefix.length);
 return hangarOrderModes.has(order)?order:null;
};
let flightGeneration,flightCanSave=false,flightHullRaw,pendingBattleDamage=null,flightQuest=null,flightMode=practiceFlight;
const persistsBattleDamage=()=>managedBuild&&flightMode.hull==='battle';
function currentCharacterGeneration(){
 try{return localStorage.getItem(characterGenerationKey)??null;}catch{return undefined;}
}
const isWingmanTest=()=>flightMode.id===wingmanTestFlight.id;
const requiresBattleRepair=()=>managedBuild&&flightMode.hull!=='none';
function canCreditThisFlight(){
 return flightMode.credits&&(!managedBuild||(flightCanSave&&currentCharacterGeneration()===flightGeneration));
}
function flushBattleDamage(){
 if(!pendingBattleDamage)return true;
 const generation=currentCharacterGeneration(),raw=readHullRaw();
 if(generation===undefined||raw===undefined)return false;
 if(generation!==flightGeneration||raw!==flightHullRaw){
  pendingBattleDamage=null;flightHullRaw=undefined;return true;
 }
 const saved=saveHullCertificate(pendingBattleDamage.hullHp>0?'repaired':'damaged',undefined,raw,pendingBattleDamage,flightGeneration);
 if(!saved)return false;
 flightHullRaw=saved;pendingBattleDamage=null;return true;
}
function loseHull(body,amount){
 const hp=Math.max(0,body.hp-amount);
 if(hp===body.hp)return;
 body.hp=hp;
 // Training preserves nonlethal damage only in memory, but a destroyed
 // pilot hull still requires normal Carrier repair.
 if(body!==p||!requiresBattleRepair()||(!persistsBattleDamage()&&hp>0)||flightHullRaw===undefined)return;
 pendingBattleDamage={hullHp:hp,maxHullHp:p.maxHp};flushBattleDamage();
}
function warnDamageSave(){
 if(state==='play')pause();
 const copy='Could not save battle damage. Keep this window open and try returning again.';
 if(missionDeparture)showMissionComplete(copy);
 else if(state==='disabled')menu('Hull disabled',copy,'main-menu',returnFlightToCarrier?carrierExitLabel:'Main Menu','HULL 0 HP');
 else{const note=overlay.querySelector('p:not(.rift-kicker)');if(note)note.textContent=copy;}
}
function start(mode,fromCarrier=false,checkCockpit){
 if(!canLaunchBuild())return false;
 const generation=currentCharacterGeneration(),raw=readHullRaw();
 if(managedBuild&&(generation===undefined||fighterHullCondition(readBuildWallet(),raw)!=='repaired'||
    currentCharacterGeneration()!==generation||readHullRaw()!==raw))return false;
 if(checkCockpit&&!checkCockpit(generation,raw))return false;
 flightGeneration=generation;flightCanSave=generation!==undefined;
 flightMode=mode;flightHullRaw=raw;
 const {duel,quest,allies}=mode,missions=window.RiftMissions;
 // Both Wingman sorties have more room to maneuver north of the old wall.
 arena.top=edge-((mode.capital||mode.escort)?capitalCourse.north:allies==='squadron'?northTrainingExtension:allies==='wingman'?northWingmanExtension:0);
 const active=persistsBattleDamage()?(quest==='intercept'?missions?.getIntercept?.():missions?.getQualification?.(quest)):null;
 flightQuest=active&&!active.victoryAt?{generation,acceptedAt:active.acceptedAt,quest}:null;
 if(fighterLoadout.shield==='aegis-s3')refreshShieldOwnership();
 const cinematic=duel&&fromCarrier&&!motion?.matches;
 duelEnabled=duel;resetField(cinematic);
 if(mode.capital){launchCapitalTest(mode.capitalVessel,mode.capitalAutoLaunch);updateDuelReadout();}
 if(mode.escort){launchEscort();updateDuelReadout();}
 if(persistsBattleDamage()){p.hp=Math.min(p.maxHp,hullDamage(raw)?.hullHp??p.maxHp);updateHud();}
 if(cinematic){playerIngress={elapsed:0};p.y=carrierArrival.fromY;}
 if(duel&&allies==='squadron'){
  const slots=squadronTestLayout(),formation=wingmanFormations[slots.wingman];
  testPlayerSlot=wingmanFormations[slots.player];
  testLeadGuide={...launch,idle:0,scouting:false,bypassX:null,bypassAtY:null};
  const rendezvous=window.RiftRendezvous;
  const roster=rendezvous&&rendezvous.generation()===generation&&rendezvous.get()?.completedAt?rendezvous.pilots:null;
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
 state=cinematic?'arrive':'play';syncArrivalControls();showGameScreen(true);layout();last=0;
 overlay.hidden=true;syncFlightExit();updateDuelCountdown();showShieldControl();
 if(['docked','stored'].includes(capitalShip?.phase))capitalAction?.focus({preventScroll:true});else liveFocus();
 syncArenaMusic();
 return true;
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
   fallback?'<a class="rift-action" href="./carrier.html">'+carrierExitLabel+'</a>':button(carrierExitLabel,'main-menu'));
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
 showMissionComplete(isWingmanTest()?testComplete:flightMode===soloTrainingFlight?soloTrainingComplete:questSave==='saved'?questComplete:
  'All Vandul fighters defeated. Returning to the Carrier.');
}
function finishMissionDeparture(dep){
 if(dep.done)return;
 dep.done=true;state='complete';
 if(!flushBattleDamage()){warnDamageSave();return;}
 showMissionComplete(isWingmanTest()?testComplete:flightMode===soloTrainingFlight?soloTrainingComplete:dep.questSave==='saved'?questComplete:
  'All Vandul fighters defeated. Select Return to Carrier if the view does not change.',true);
 try{window.location.replace('./carrier.html');}catch{}
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
 if(state==='menu'||playerIngress||missionDeparture||document.hidden||hangarDialog?.open)return;
 if(!flushBattleDamage()){warnDamageSave();return;}
 if((requiresBattleRepair()&&p.hp<=0)||!canLaunchBuild()){enterMainMenu();return;}
 unlockAudio(undefined,event);
 if(start(flightMode)&&arenaSettings)arenaSettings.open=false;
};
capitalAction?.addEventListener('click',requestCapitalManeuver);
capitalStore?.addEventListener('click',storeCapitalFighter);
capitalHangar?.addEventListener('click',event=>{
 const c=capitalShip;
 if(c?.phase!=='stored'||event.isTrusted!==true||state!=='play'||document.hidden||routeParked||hangarDialog?.open)return;
 const destination=c.vessel===bifrostCapital?'./index.html?hangar=carrier&vessel=bifrost':'./index.html?hangar=carrier';
 try{window.location.replace(destination);}catch{}
});
resetFieldButton?.addEventListener('click',restart);
if(!resetFieldButton)hud.addEventListener('click',event=>{if(event.target.closest('#reset-field'))restart(event);});
function canPauseFlight(){return state==='play'||state==='arrive';}
function syncPauseControl(){if(pauseFlightButton)pauseFlightButton.disabled=!canPauseFlight();}
function pause(){
 if(state==='pause'){state=playerIngress?'arrive':'play';updateWingRadio();syncPauseControl();if(playerIngress||duelCountdown>0||vandulIngress||capitalShip||escortShip)last=0;overlay.hidden=true;updateDuelCountdown();updateCapitalHud();if(['docked','stored'].includes(capitalShip?.phase))capitalAction?.focus({preventScroll:true});else liveFocus();syncArenaMusic();return;}
 if(!canPauseFlight())return;
 state='pause';updateWingRadio();syncPauseControl();updateDuelCountdown();updateCapitalHud();stopArenaMusic();clearInput();
 menu(playerIngress?'Entry paused':'Flight paused',playerIngress?'Resume to continue leaving the Carrier.':'Your ship is holding its position.','resume','Resume flight','RUN PAUSED');
 overlay.innerHTML+=button(returnFlightToCarrier?carrierExitLabel:'Main Menu','main-menu');
 overlay.querySelector('button')?.focus({preventScroll:true});
}
let resumeAfterHangar=false,hangarInvoker=null,returnHangarToCarrier=false;
// Recognize only our own literal route. There is no user-provided return URL.
let carrierLinkedRoute=window.location?.search,routeParked=false;
if(carrierLinkedRoute!=='?hangar=carrier'&&carrierLinkedRoute!=='?hangar=carrier&vessel=bifrost'&&!hangarOrderFromRoute(carrierLinkedRoute)&&!carrierFlightRoutes.has(carrierLinkedRoute))carrierLinkedRoute=null;
const fitLookup=id=>document.getElementById(id);
const weaponPicker=fitLookup('fit-weapon-picker'),weaponPickerGrid=fitLookup('fighter-fit-grid'),weaponPickerSlot=fitLookup('fit-picker-slot'),weaponPickerDone=fitLookup('fit-picker-done');
const weaponMounts=Object.fromEntries(['primary','secondary'].map(slot=>[slot,{
 button:fitLookup('fit-'+slot+'-picture'),image:fitLookup('fit-'+slot+'-image'),empty:fitLookup('fit-'+slot+'-empty'),
 title:fitLookup('fit-'+slot+'-title'),select:slot==='primary'?fitPrimary:fitSecondary
}]));
const weaponImages={blaster:'./sterling-module.webp?v=58',ballistic:'./alkine-module.webp?v=58',ak77:'./ak77-module.webp?v=58'};
const weaponCards=Object.fromEntries([...Object.keys(weaponImages),'empty'].map(id=>[id,{
 button:fitLookup('fit-pick-'+id),badge:fitLookup('fit-pick-'+id+'-status'),summary:fitLookup('fit-pick-'+id+'-summary')
}]));
const weaponPickerReady=!!(weaponPicker&&weaponPickerGrid&&weaponPickerSlot&&weaponPickerDone&&
 Object.values(weaponMounts).every(m=>m.button&&m.image&&m.empty&&m.title&&m.select)&&
 Object.values(weaponCards).every(c=>c.button&&c.badge));
let weaponSlot=null;
const slotTitle=slot=>slot==='primary'?'Primary weapon':'Secondary weapon';
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
  const value=id==='empty'?null:id,gun=guns[id];
  const selected=!!weaponSlot&&fighterFit[weaponSlot]===value;
  const other=weaponSlot==='primary'?'secondary':'primary';
  const onOther=!!value&&fighterFit[other]===value;
  const locked=!!gun&&!ownsBuildPart(id,wallet);
  c.button.hidden=id==='empty'&&weaponSlot!=='secondary'&&!managedBuild;
  c.button.disabled=locked;
  c.button.setAttribute('aria-pressed',String(selected));
  c.badge.textContent=locked?'Buy in Shop':selected?'Fitted':onOther?(fighterFit[weaponSlot]?'Swap mounts':'On primary'):'';
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
 for(const [id,{button}] of Object.entries(weaponCards))button.addEventListener('click',()=>{
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
 for(const option of select.options??[])if(option.value)option.disabled=!ownsBuildPart(option.value,wallet);
 select.value=value??'';
}
function showFighterFit(prefix=''){
 const saved=flushBattleDamage(),wallet=readBuildWallet(),condition=saved?fighterHullCondition(wallet):'unavailable',required=missingFitParts(wallet);
 const repairing=condition==='repairing',repaired=condition==='repaired';
 const raw=readHullRaw(),damage=hullDamage(raw),partial=repaired&&!!damage;
 const finished=repaired&&hasFinishedHangarRepair(raw);
 const hullOwned=repaired||repairing||condition==='damaged';
 if(hangarShipChoice)hangarShipChoice.hidden=!hullOwned;
 if(hangarShipSelect){
  hangarShipSelect.hidden=!hullOwned;
  hangarShipSelect.disabled=!hullOwned;
  hangarShipSelect.value=hullOwned?hullId:'';
 }
 if(hangarShipCaption){
  hangarShipCaption.hidden=!hullOwned;
  const caption=repairing?'Rift-4 repair in progress.':!repaired?'Rift-4 needs repairs.':'Your only owned fighter.';
  hangarShipCaption.textContent=hullOwned?caption:'';
 }
 if(directRepairButton){directRepairButton.hidden=!repaired||finished&&!partial;directRepairButton.disabled=!wallet;}
 if(parkedHullArt){
  const art=finished?'./fighter-winged.png?v=23':'./fighter-salvage-damaged.webp?v=76';
  if(parkedHullArt.getAttribute('src')!==art)parkedHullArt.setAttribute('src',art);
 }
 const remaining=repairing?clamp(hullRepairReadyAt-Date.now(),0,hullRepairSpan):0;
 const repairSeconds=Math.ceil(remaining/1000);
 if(repairProgress){
  const value=repairing?Math.floor(100*(hullRepairSpan-remaining)/hullRepairSpan):0;
  if(repairProgress.max!==100)repairProgress.max=100;
  if(repairProgress.value!==value)repairProgress.value=value;
 }
 if(repairProgressWrap)repairProgressWrap.hidden=!repairing;
 if(damagedBay)damagedBay.hidden=condition!=='damaged'&&!repairing&&!partial;
 if(repairedBay)repairedBay.hidden=!repaired||partial;
 if(playerLoadout)playerLoadout.hidden=!repaired;
 if(hangarBayActions)hangarBayActions.hidden=!repaired;
 if(hangarBoard){hangarBoard.hidden=!repaired;hangarBoard.disabled=!repaired||!wallet||state!=='menu'||!!boarding;}
 if(salvagePreview)salvagePreview.hidden=condition!=='unclaimed';
 const recoveryTitle=document.getElementById('fit-hull-recovery-title'),story=document.getElementById('fit-hull-recovery-story');
 if(recoveryTitle)recoveryTitle.textContent=damage?'Repair the Rift-4 Fighter':'Recover the Rift-4 Fighter';
 if(story)story.hidden=!!damage;
 const battle=damage?'Battle damage · '+damage.hullHp+' / '+damage.maxHullHp+' hull HP. ':'';
 const summary=!saved?'Could not save battle damage. Flight is locked.':!wallet?'Pilot inventory unavailable. Flight is locked.':
  condition==='unavailable'?'Ship ownership unavailable. Flight is locked.':
  condition==='unclaimed'?'No ship yet. Visit the Hangar to claim the Rift-4 Fighter.':
  condition==='damaged'?(battle||'Rift-4 Fighter recovered. ')+'Repair required before fitting or flight.':
  condition==='repairing'?battle+(repairSeconds?'Repair in progress · '+Math.floor(repairSeconds/60)+':'+String(repairSeconds%60).padStart(2,'0')+' remaining.':'Repair finished. Checking that it saved…'):required.length?
  battle+'Not launch-ready. Fit: '+required.map(slot=>fitLabels[slot]).join(', ')+'.':battle+(partial?'Flight ready or repair for free.':'Flight ready.');
 if(playerHangarView)playerHangarView.dataset.fighter=condition;
 if(claimHullButton){claimHullButton.hidden=condition!=='unclaimed';claimHullButton.disabled=!wallet;}
 if(repairHullButton){repairHullButton.hidden=condition!=='damaged';repairHullButton.disabled=!wallet;}
 for(const node of [buildStatus,mainBuildStatus,hullRecoveryStatus])if(node&&node.textContent!==summary)node.textContent=summary;
 const owned=refreshShieldOwnership(),fitted=fittedShield();
 if(fitAegis)fitAegis.disabled=!owned;
 if(fitShield)fitShield.value=fitted?'aegis-s3':'';
 if(fitShieldStat)fitShieldStat.textContent=fitted?fitted.capacity+' HP · '+fitted.duration+'s active · '+fitted.cooldown+'s cooldown · '+Math.round(fitted.absorption.energy*100)+'% laser / '+Math.round(fitted.absorption.ballistic*100)+'% ballistic · Weight '+fitted.weight:
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
  if(badge)badge.textContent=moduleId?'Equipped':'';
 }
 if(hangarEngineTest)hangarEngineTest.disabled=!fittedEngine();
 refreshHangarEngineAudio();
 refreshWeaponPictures(wallet);
 if(fitHullStat)fitHullStat.textContent=' · Hull '+(partial?damage.hullHp+'/':'')+fittedFighter().hullHp+' HP';
 if(fitWeightStat)fitWeightStat.textContent=' · Total weight '+fittedWeight();
 if(fitEngineStat){
  const engine=fittedEngine();
  fitEngineStat.textContent=engine?'Speed rating '+engine.speedRating+' · Rated '+engine.speedRating*speedPerRating+' u/s · Strength '+engine.strength+
   ' · Weight '+engine.weight+' · Fitted forward '+Math.round(engine.speedRating*speedPerRating*flightMassRatios(fittedWeight()).speed)+' u/s':'No engine fitted';
 }
 const mountStats=id=>{
  const gun=guns[id];if(!gun)return 'No weapon fitted';
  const impact=Math.min(gun.speed*gun.push,gun.pushMax);
  const pushLabel=impact>=200?'Heavy':impact>=150?'Medium':'Light';
  return gun.damage+' dmg/shot'+(gun.burstOnly?' · '+gun.burst.pattern.length+' per burst':'')+' · Weight '+gun.weight+' · '+pushLabel+' target push · '+gunRateText(gun);
 };
 if(fitPrimaryStat)fitPrimaryStat.textContent=mountStats(fighterFit.primary);
 if(fitSecondaryStat)fitSecondaryStat.textContent=mountStats(fighterFit.secondary);
 if(fitStatus){
  const primary=guns[fighterFit.primary]?.label??'Empty',secondary=guns[fighterFit.secondary]?.label??'empty';
  fitStatus.textContent=prefix+primary+' primary · '+secondary+' secondary.';
 }
}
function fittingAllowed(){
 return !!hangarDialog?.open&&!document.hidden&&(!managedBuild||state==='menu'&&fighterHullCondition()==='repaired');
}
function saveHullRecovery(event,expected,next){
 const wallet=readBuildWallet(),raw=readHullRaw();
 const generation=currentCharacterGeneration(),damage=hullDamage(raw);
 if(event.isTrusted!==true||!managedBuild||!wallet||state!=='menu'||document.hidden||pendingBattleDamage||generation===undefined||
  !hangarDialog?.open||fighterHullCondition(wallet,raw)!==expected||
  expected==='repaired'&&!damage&&hasFinishedHangarRepair(raw))return;
 if(!saveHullCertificate(next,next==='repairing'?Date.now()+hullRepairDurationMs:undefined,raw,damage,generation)){
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
 if(managedBuild&&!fittingAllowed()||value!==null&&!ownedSlot(slot,value,readBuildWallet())||
  slot==='primary'&&value===null&&!managedBuild){showFighterFit();return;}
 const raw=beginFitEdit();if(raw===undefined)return;
 if(fighterFit[slot]===value){showFighterFit();return;}
 const previousPrimary=fighterFit.primary;
 if(slot==='primary'){
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
 if(!hangarDialog?.open||!canopyRig||boarding||fighterHullCondition()!=='repaired')return;
 const open=canopyRig.dataset.canopy!=='open';
 setCanopy(open);
 requestCanopyAudio(open,event);
});
const cockpitIsBifrost=()=>linkedHangarReturn==='./carrier.html?vessel=bifrost';
function cockpitOrders(generation){
 const offers=[],missions=window.RiftMissions,rendezvous=window.RiftRendezvous;
 const bifrost=cockpitIsBifrost();
 if(generation===undefined||currentCharacterGeneration()!==generation)return offers;
 const add=(id,title,stage)=>{
  const mode=hangarOrderModes.get(id);if(!mode)return;
  const stamp=[stage.acceptedAt,stage.victoryAt,stage.lodgedAt,stage.completedAt].join(':');
  offers.push({id,title,mode,stamp,order:true});
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
 const mode=(id,title,flight,detail)=>offers.push({id,title,mode:flight,stamp:flight.capitalVessel?.id??'pegasus',detail});
 mode('free-flight','Free flight',bifrost?bifrostFreeFlight:freeFlight,'Launch from moving '+(bifrost?'Bifrost':'Pegasus')+'. No credits or damage saved.');
 mode('capital-test','Capital (test)',bifrost?bifrostTestFlight:capitalTestFlight,'Start docked. Practise launching and landing. No credits or damage saved.');
 if(!bifrost){
  mode('practice','Practice Alone',practiceFlight,'Practise controls and firing. No credits or damage saved.');
  mode('solo-training','Solo vs Vandul',soloTrainingFlight,'Fly six Vandul waves alone. No credits, damage, or career progress saved.');
  mode('escort-drill','Escort · Training',escortFlight,'Ready for Escort training. No career rewards or damage saved.');
  mode('wingman-test','Wingman vs Vandul · Training',wingmanTestFlight,'No career rewards. If destroyed, repair in the Hangar.');
 }
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
  add('Outfit the Rift-4',starter?'Completed':'Speak to Bishop');
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
 const rows=(entries.length?entries:[['',cockpitIsBifrost()?'Bishop issues orders aboard Pegasus.':'No Bishop quests available.']]).map(([title,status])=>{
  const row=document.createElement('li');
  row.textContent=title?title+' · '+status:status;return row;
 });
 cockpitQuestList.replaceChildren(...rows);
}
const cockpitPlanKind=offer=>offer.order?'mission':'mode';
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
  (select?.disabled?close:select)?.focus?.();
 }else if(restoreFocus&&previous)cockpitPickers[previous].add?.focus?.();
}
function selectCockpitPlan(id,kind){
 const session=cockpitSession;
 if(!session||session.picker!==kind||!id)return;
 const prior=session.orders.find(o=>o.id===id&&cockpitPlanKind(o)===kind);
 const current=cockpitOrders(session.generation).find(o=>o.id===id&&cockpitPlanKind(o)===kind);
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
 const same=currentCharacterGeneration()===session.generation,orders=cockpitOrders(session.generation);
 const signature=orders.map(({id,title,stamp})=>[id,title,stamp].join('|')).join(';');
 if(session.signature!==signature){
  session.signature=signature;
  const option=(id,title)=>{
   const node=document.createElement('option');node.value=id;node.textContent=title;return node;
  };
  for(const [kind,{select}] of Object.entries(cockpitPickers)){
   if(!select)continue;
   const choices=orders.filter(o=>cockpitPlanKind(o)===kind);
   const prompt=kind==='mission'?(choices.length?'Select a mission':'No accepted flight missions'):'Select a flight mode';
   select.replaceChildren(option('',prompt),...choices.map(({id,title})=>option(id,title)));
   select.disabled=!choices.length;
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
 const ready=!!(selected||fallback)&&canLaunchBuild();
 cockpitLaunch.disabled=!ready;
 if(cockpitPlanName)cockpitPlanName.textContent=selected?.title??'No sortie planned';
 if(cockpitRemovePlan){
  cockpitRemovePlan.hidden=!selected&&!session.orderChanged;
  cockpitRemovePlan.textContent=session.orderChanged?'Clear expired order':'Remove';
 }
 if(cockpitBridge)cockpitBridge.hidden=cockpitIsBifrost();
 renderCockpitQuests(session);
 const text=message??(!same?'The active pilot changed since you boarded. Exit and board again.':
  session.orderChanged?'That flight order changed or is no longer available. Clear it or add another mission or mode.':
  !ready?'Not ready to fly. Exit the cockpit to repair the hull or finish fitting the fighter.':
  !selected?'Leave the itinerary empty to launch from the moving carrier, or add a mission or flight mode.':
  selected.id==='rendezvous'?'Ready for Wingman vs Vandul training. No career rewards.':
  selected.detail??'Flight ready. Launch when you are ready to leave the carrier.');
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
 if(hangarCockpit)hangarCockpit.hidden=true;
 if(playerHangarView)playerHangarView.hidden=false;
 if(closeHangarButton)closeHangarButton.hidden=false;
 if(focus&&hangarDialog?.open){
  showFighterFit();
  hangarDialog.scrollTop=scroll;
  (hangarBoard?.hidden?hangarTitle:hangarBoard)?.focus();
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
 return boarding===run&&hangarDialog?.open&&state==='menu'&&!document.hidden&&!routeParked&&
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
 cockpitSession={generation:run.generation,signature:null,selected:preferredHangarOrder??'',orders:[],hangarScroll:run.scroll,picker:null};
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
hangarBoard?.addEventListener('click',event=>{
 if(event.isTrusted!==true||state!=='menu'||document.hidden||routeParked||!hangarDialog?.open||boarding||cockpitSession||!hangarCockpit||!cockpitOrder)return;
 const generation=currentCharacterGeneration(),condition=fighterHullCondition(),hull=readHullRaw();
 if(generation===undefined||hull===undefined||condition!=='repaired'){
  showFighterFit();
  showBoardMessage(generation===undefined||hull===undefined?'Could not read the pilot save. Try boarding again.':'The hull changed. Check its repair status before boarding.');
  hangarBoardStatus?.scrollIntoView?.({block:'nearest'});
  return;
 }
 cancelHangarPress();setWeaponPicker(null);showBoardMessage('');
 const hasCanopy=!!canopyRig&&repairedBay?.hidden===false;
 const wasOpen=hasCanopy&&canopyRig.dataset.canopy==='open';
 const run=boarding={generation,hull,wasOpen,scroll:hangarDialog.scrollTop??0,timer:null};
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
cockpitExit?.addEventListener('click',()=>leaveCockpit());
document.getElementById('cockpit-show-quests')?.addEventListener('click',()=>{
 if(!cockpitSession)return;
 const heading=document.getElementById('cockpit-quests-title');
 heading?.focus({preventScroll:true});heading?.scrollIntoView?.({block:'start'});
});
cockpitLaunch?.addEventListener('click',event=>{
 const session=cockpitSession;
 if(event.isTrusted!==true||!session||!hangarDialog?.open||state!=='menu'||document.hidden||routeParked)return;
 if(session.orderChanged)return;
 const id=session.selected||'free-flight',shown=session.orders.find(order=>order.id===id);
 const stillSelected=()=>cockpitOrders(session.generation).some(order=>order.id===id&&order.stamp===shown?.stamp&&order.mode===shown?.mode);
 if(!shown||!stillSelected()){
  refreshCockpit('Orders changed. Check the current preflight plan and try again.');return;
 }
 if(!canLaunchBuild()){refreshCockpit();return;}
 const expectedHull=readHullRaw(),expectedFit=readShipRaw();
 if(expectedHull===undefined||expectedFit===undefined){refreshCockpit('Could not read the current hull or fit. Nothing launched.');return;}
 const returning=returnFlightToCarrier;returnFlightToCarrier=true;
 if(!start(shown.mode,true,(generation,hull)=>generation===session.generation&&hull===expectedHull&&
    stillSelected()&&readShipRaw()===expectedFit&&readHullRaw()===expectedHull&&currentCharacterGeneration()===generation)){
  returnFlightToCarrier=returning;
  refreshCockpit('Preflight changed. Check your ship and orders before trying again.');return;
 }
 hangarLaunching=true;
 unlockAudio(undefined,event);
 hangarDialog.close();
});
function openHangarFrom(invoker,fromCarrier=false,gesture){
 if(document.hidden||!hangarDialog||hangarDialog.open||typeof hangarDialog.showModal!=='function')return;
 try{hangarDialog.showModal();}catch{return;}
 hangarInvoker=invoker;resumeAfterHangar=state==='play';returnHangarToCarrier=fromCarrier;
 if(closeHangarButton){
  const label=fromCarrier?'Back to Carrier':state==='menu'?'Back to menu':'Back to arena';
  closeHangarButton.textContent=label;closeHangarButton.setAttribute?.('aria-label',label);
 }
 if(resumeAfterHangar)pause();else clearInput();
 refreshStoredFit();setWeaponPicker(null);showFighterFit();hangarTitle?.focus({preventScroll:true});
 // A direct Carrier link has no gesture in this document. Menu and in-game
 // buttons do, and can silently ready the graph before Test engine is held.
 if(hangarSoundArm&&gesture?.isTrusted&&soundOn&&audio?.state!=='running')unlockAudio(refreshHangarEngineAudio,gesture);
}
function enterLinkedCarrierRoute(){
 if(!carrierLinkedRoute||routeParked||document.hidden||state!=='menu'||hangarDialog?.open)return;
 const route=carrierLinkedRoute;carrierLinkedRoute=null;
 const mode=carrierFlightRoutes.get(route);
 preferredHangarOrder=hangarOrderFromRoute(route);
 if(mode?.quest&&mode.quest!=='intercept'&&!window.RiftMissions?.getQualification?.(mode.quest)){
  if(mainBuildStatus)mainBuildStatus.textContent='Accept this qualification on the Carrier Bridge before launching.';
  return;
 }
 if(!mode||!canLaunchBuild()){
  linkedHangarReturn=carrierReturnPath(route==='?hangar=carrier&vessel=bifrost'?bifrostTestFlight:mode);
  openHangarFrom(mainMenuHangar,true);
  return;
 }
 returnFlightToCarrier=true;
 // A new document has no trusted arena gesture yet. Never unlock sound here.
 if(!start(mode,true)){returnFlightToCarrier=false;linkedHangarReturn=carrierReturnPath(mode);openHangarFrom(mainMenuHangar,true);}
}
openHangarButton?.addEventListener('click',event=>openHangarFrom(openHangarButton,false,event));
closeHangarButton?.addEventListener('click',()=>hangarDialog?.close());
hangarDialog?.addEventListener('cancel',event=>{
 if(boarding){event?.preventDefault();cancelBoarding('',true);return;}
 if(cockpitSession){event?.preventDefault();
  if(cockpitSession.picker)setCockpitPicker(null);else leaveCockpit();return;
 }
 if(weaponSlot){event?.preventDefault();setWeaponPicker(null,true);return;}
 cancelHangarPress();
});
hangarDialog?.addEventListener('close',()=>{
 const launched=hangarLaunching;hangarLaunching=false;cancelBoarding();leaveCockpit(false);
 cancelHangarPress();cancelCanopyAudio();stopThruster(true);
 setWeaponPicker(null);setCanopy(false);
 const shouldResume=resumeAfterHangar,invoker=hangarInvoker,goBackToCarrier=returnHangarToCarrier;
 resumeAfterHangar=false;hangarInvoker=null;returnHangarToCarrier=false;preferredHangarOrder=null;
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
pauseFlightButton?.addEventListener('click',event=>{
 if(event.isTrusted!==true||document.hidden||routeParked||hangarDialog?.open||!canPauseFlight())return;
 pause();
});
returnMainMenu?.addEventListener('click',()=>{if(!document.hidden)enterMainMenu();});
overlay.addEventListener('click',ev=>{
 const a=ev.target.closest('[data-rift]')?.dataset.rift;
 if(document.hidden||hangarDialog?.open)return;
 if(a==='retry-mission-save'){retryQuestVictory();return;}
 if(a==='abandon-mission-save'&&state==='complete'&&missionDeparture?.questSave==='pending'&&!routeParked){enterMainMenu(true);return;}
 if(!['resume','reset','main-menu'].includes(a))return;
 if(a==='main-menu'&&['pause','disabled','depart','complete'].includes(state)){enterMainMenu();return;}
 if(ev.pointerType==='touch'||ev.pointerType==='pen')inputSource(true);else if(ev.pointerType==='mouse')inputSource(false);
 if(a==='resume'&&state==='pause'){unlockAudio(undefined,ev);pause();}
 else if(a==='reset'&&state==='disabled')restart(ev);
});
const keyAim=()=>[Number(has('ArrowRight'))-Number(has('ArrowLeft')),Number(has('ArrowDown'))-Number(has('ArrowUp'))];
const flightKeys=new Set(['KeyA','KeyW','KeyD','KeyS','KeyE','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space']);
window.addEventListener('keydown',e=>{
 if(hangarDialog?.open||e.defaultPrevented)return;
 if(e.code==='KeyQ'&&state==='play'&&!e.repeat&&!e.ctrlKey&&!e.metaKey&&!e.altKey){
  if(activateShield())e.preventDefault();
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
 if(state==='play'&&!capitalLocked()&&e.code==='Space'&&(mountedGun().holdRepeat||mountedGun().burstOnly)&&(document.activeElement===canvas||document.activeElement===fireButton)){
  e.preventDefault();
  if(!e.repeat){inputSource(document.activeElement===fireButton);unlockAudio(undefined,e);pressFire('key');}
  return;
 }
 if(e.code==='KeyE'&&(e.ctrlKey||e.metaKey||e.altKey))return;
 if(state!=='play'||capitalLocked()||!flightKeys.has(e.code)||e.code==='Space'&&document.activeElement!==canvas)return;
 e.preventDefault();inputSource(false);if(!e.repeat)unlockAudio(undefined,e);keys.add(e.code);
 if(e.code==='KeyE')paintMove();
 if(!aimPtr&&e.code.startsWith('Arrow')){const [x,y]=keyAim();if(x||y)snapAim(Math.atan2(y,x));}
 if(!e.repeat&&e.code==='Space')pressFire();
},{passive:false});
window.addEventListener('keyup',e=>{
 if(enginePress?.kind==='key'&&enginePress.id===e.code){e.preventDefault();endEnginePress(e,'key',e.code);}
 if(e.code==='Space'&&ballisticHold?.kind==='key'){e.preventDefault();stopBallisticHold();}
 keys.delete(e.code);
 if(e.code==='KeyE'){resetReleasedThrust();paintMove();}
});
window.addEventListener('blur',()=>{if(hangarDialog?.open){cancelBoarding();cancelHangarPress();}clearInput();if(state==='play'||state==='arrive')pause();});
document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelBoarding();flushBattleDamage();parkAudio();}else{if(missionDeparture)last=0;enterLinkedCarrierRoute();showAudioReady();refreshHangarEngineAudio();}});
function refreshBuildDisplays(){
 if(boarding&&!boardingIsCurrent(boarding))cancelBoarding('Your pilot or hull changed. Check the Hangar before boarding.');
 if(state==='menu'){refreshStoredFit();showFighterFit();refreshCockpit();}
 else if(hangarDialog?.open)showFighterFit();
 else if(fighterLoadout.shield==='aegis-s3')refreshShieldOwnership();
}
window.addEventListener('storage',refreshBuildDisplays);
window.addEventListener('rift:walletchange',refreshBuildDisplays);
window.addEventListener('pagehide',()=>{cancelBoarding();flushBattleDamage();routeParked=true;endWingRadio();parkAudio();});
window.addEventListener('pageshow',()=>{refreshBuildDisplays();routeParked=false;if(missionDeparture)last=0;enterLinkedCarrierRoute();showAudioReady();});
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
  if(thrust)thrustPtr=press;else movePtr=press;
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
  if(pressed.thrust){thrustPtr=null;resetReleasedThrust();}else movePtr=null;
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
  inputSource(true);unlockAudio(undefined,e);movePulse={...moveValue(button),left:.065};paintMove();
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
  if(v.angle!==null){aimManuallyPlaced=true;autoLock=null;queueHeading(p,v.angle,stickInstantArc);}
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
 if(ballisticHold||state!=='play'||!mountedGun().holdRepeat||document.hidden)return false;
 ballisticHold={kind,id};fireNormalShot();return true;
}
function cancelFireBurst(reset=false){
 stopBurstEcho();
 if(fireBurst&&!reset)burstCooldown=fireBurst.profile.recovery;
 fireBurst=null;if(reset)burstCooldown=0;
 showFire();
}
function pressFire(kind,id=null){
 if(state!=='play'||capitalLocked()||document.hidden||fireBurst||burstCooldown>0)return;
 if(burstModes[fighterLoadout.weapon]){
  const gun=mountedGun(),profile=gun.burst??normalBurst;
  if(gun.he3PerShot&&p.he3+1e-8<gun.he3PerShot)return;
  aimForTouchAssist();
  const angle=p.aim;
  if(!fireShot(angle,null,true))return;
  fireBurst={angle,spread:gun.burstSpread*degrees,index:1,wait:profile.interval,profile};
  addFlightHeat(heatRules.burstActivation);
  if(fighterLoadout.weapon==='ballistic')playBallisticBurstEcho();
  showFire();
 }else if(mountedGun().holdRepeat&&kind)startBallisticHold(kind,id);
 else fireNormalShot();
}
function advanceBurst(dt){
 if(fireBurst){
  fireBurst.wait-=dt;
  if(fireBurst.wait<=0){
   const {profile,angle,spread}=fireBurst;
   if(!fireShot(angle+spread*profile.pattern[fireBurst.index++],angle,true)){cancelFireBurst();return;}
   if(fireBurst.index===profile.pattern.length){fireBurst=null;burstCooldown=profile.recovery;showFire();}
   else fireBurst.wait+=profile.interval;
  }
 }else if(burstCooldown>0){
  burstCooldown=Math.max(0,burstCooldown-dt);
  if(!burstCooldown)showFire();
 }
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
 if(!aimPtr)snapAim(angleTo(q.x,q.y));pressFire();
});
canvas.addEventListener('pointermove',e=>{
 if(state!=='play'||capitalLocked()||e.pointerType!=='mouse'||aimPtr)return;
 const q=fieldPoint(e);if(!q)return;inputSource(false);snapAim(angleTo(q.x,q.y));
});
function layout(){
 const box=canvas.getBoundingClientRect();
 hiDpi=Math.min(2.5,window.devicePixelRatio||1);viewW=Math.max(2,Math.round(box.width*hiDpi));viewH=Math.max(2,Math.round(box.height*hiDpi));
 if(canvas.width!==viewW)canvas.width=viewW;if(canvas.height!==viewH)canvas.height=viewH;
 // Keep the old uniform sprite scale, but use spare pixels to show more
 // world instead of drawing fixed-ratio black bars. Only extreme aspect
 // ratios zoom in enough to stay within the real world edges.
 const referenceScale=Math.min(viewW/VIEW_W,viewH/VIEW_H);
 const height=H-floorNorth();
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
function fireShot(angle=null,heading=null,burst=false){
 if(state!=='play'||capitalLocked()||document.hidden)return;
 const weapon=fighterLoadout.weapon,gun=mountedGun();
 if(!spendShotHe3(gun.he3PerShot))return false;
 if(angle===null){
  aimForTouchAssist();
  const i=normalShots.get(weapon)??0;
  angle=p.aim+normalPattern[i]*gun.normalSpread*degrees;
  normalShots.set(weapon,(i+1)%normalPattern.length);
 }
 const a=angle,ux=Math.cos(a),uy=Math.sin(a),x=p.x+Math.cos(heading??p.aim)*(p.r+4),y=p.y+Math.sin(heading??p.aim)*(p.r+4);
 const projectile={x,y,vx:ux*gun.speed,vy:uy*gun.speed,a,weapon,damage:gun.damage};
 shots.push(projectile);
 addFlightHeat(burst?heatRules.burstShot:heatRules.normalShot);
 p.vx-=ux*gun.recoil*p.recoilFactor;p.vy-=uy*gun.recoil*p.recoilFactor;capVelocity(p,255);practiceShots++;updateHud();
 sound('shot');duckArenaMusic();startProjectileVoice(projectile);recoil=gun.kick;kick(gun.kick);burstRing(x,y,gun.muzzle,gun.ring);
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
 const lost=activeVanduls().length>0;
 if(duelEnabled){
  duelResult='lost';vandulLasers=[];
  vanduls=[];autoLock=null;
  updateDuelReadout();
 }
 state='disabled';syncPauseControl();duelCountdown=0;vandulIngress=null;waveCountdownFresh=false;updateDuelCountdown();p.vx=p.vy=0;
 stopArenaMusic();clearInput();shots=[];
 const exit=returnFlightToCarrier?carrierExitLabel:'Main Menu';
 if(requiresBattleRepair()){
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
function livingAllies(){return [testLead,wingman].filter(body=>body?.hp>0);}
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
 const choices=[p,...livingAllies()];
 for(const target of choices){
  if(!target.hp)continue;
  const distance=Math.hypot(target.x-ship.x,target.y-ship.y);
  if(distance>maxRange)continue;
  const visible=(target===p?playerVisible:distance<=attackSelection.allyRange&&
   firstSightCover(ship,target,withPilot??=[...obstacles,p])===null)||thermalContact(ship,target);
  if(!visible)continue;
  // Prefer a closer clear lane. A modest escort bias gives wingmen a chance
  // to draw fire; retention prevents two nearly equal bearings flickering.
  const value=distance-(target===p?0:attackSelection.allyBias)-(target===ship.attackTarget?attackSelection.retainBias:0);
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
    duelResult=isWingmanTest()||duelWave===6?'victory':'won';
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
 if(duelResult==='victory')beginMissionDeparture();
}
function hitWithVandulLaser(b,hit,t,dt){
 b.life=0;
 const x=b.x+b.vx*dt*t,y=b.y+b.vy*dt*t;
 const damage=hit===p?shieldDamage(b.damage,b.kind??vandulProfile.laser.kind,shieldClock+dt*t):b.damage;
 if(damage<b.damage)burstRing(x,y,18,'#79efff');
 if(damage<=0)return;
 const cx=hit.prevX+(hit.x-hit.prevX)*t,cy=hit.prevY+(hit.y-hit.prevY)*t;
 applyShotImpact(hit,b,vandulProfile.laser,x,y,cx,cy);
 burstRing(x,y,15,'#ed7cae');
 if(hit===p){
  loseHull(p,damage);kick(.12);sound('hit');
  if(p.hp===0)disablePlayer(true);
 }else{
  hit.hitGlow=.25;
  if(hit.allyShip){
   hit.hp=Math.max(0,hit.hp-damage);
   if(!hit.hp){blast(hit.x,hit.y,'#8de0ff',18,1.2);burstRing(hit.x,hit.y,33,'#8de0ff');}
  }
 }
}
const clashRadius=6,clashCell=32;
function projectileTravel(b,dt,enemy){
 const dx=b.vx*dt,dy=b.vy*dt;
 if(b.x<arena.left||b.x>arena.right||b.y<arena.top||b.y>arena.bottom)return {b,dx,dy,end:-1,enemy};
 const limitX=dx>0?(arena.right-b.x)/dx:dx<0?(arena.left-b.x)/dx:1;
 const limitY=dy>0?(arena.bottom-b.y)/dy:dy<0?(arena.top-b.y)/dy:1;
 return {b,dx,dy,end:Math.min(1,limitX,limitY,enemy?b.life/dt:1),enemy};
}
function queueBodyContacts(t,bodies,events){
 const {b,dx,dy,end}=t;
 if(end<0)return;
 for(const body of bodies){
  const x=b.x-body.prevX,y=b.y-body.prevY;
  const time=sweptCircle(x,y,dx-(body.x-body.prevX),dy-(body.y-body.prevY),body.r+2);
  if(time!==null&&time<=end)events.push({time,t,body});
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
function sweepProjectiles(dt,bodies,obstacles){
 if(!shots.length&&!vandulLasers.length)return;
 const player=shots.map(b=>projectileTravel(b,dt,false));
 const hostile=vandulLasers.filter(b=>b.life>0).map(b=>projectileTravel(b,dt,true));
 const events=[];
 for(const t of player){
  queueBodyContacts(t,bodies,events);
  if(capitalShip||escortShip)queueBodyContacts(t,(capitalShip??escortShip).hull,events);
 }
 if(hostile.length){
  const targets=[...obstacles,p];
  if(wingman?.hp>0)targets.push(wingman);
  if(testLead?.hp>0)targets.push(testLead);
  for(const t of hostile)queueBodyContacts(t,targets,events);
  queueClashes(player,hostile,events);
 }
 // Earliest real contact wins. At an exact tie, solid hulls/cover take priority.
 // Keep all candidates so a later collision can still land if an earlier target
 // or opposing bolt was already destroyed by a different shot this substep.
 events.sort((a,b)=>a.time-b.time||Number(!!b.body)-Number(!!a.body));
 for(const {time,t,body,other} of events){
  const b=t.b;
  if(t.enemy?b.life<=0:b.spent)continue;
  if(body){
   if(body.capitalHull){b.spent=true;continue;}
   if(t.enemy){
    if(body.allyShip&&!body.hp)continue;
    hitWithVandulLaser(b,body,time,dt);
    if(state!=='play')return;
   }else if(!body.vandul||body.hp>0){
    hitWithPlayerShot(b,body,time,dt);
    if(state!=='play')return;
   }
  }else if(other.b.life>0){
   b.spent=true;other.b.life=0;
   const x=(b.x+other.b.x+(t.dx+other.dx)*time)*.5,y=(b.y+other.b.y+(t.dy+other.dy)*time)*.5;
   flashProjectileClash(x,y);
  }
 }
 shots=shots.filter(b=>{
  if(!b.spent){b.x+=b.vx*dt;b.y+=b.vy*dt;}
  const flying=!b.spent&&b.y>=arena.top&&b.y<=arena.bottom&&b.x>=arena.left&&b.x<=arena.right;
  if(!flying)releaseProjectileVoice(b);
  return flying;
 });
 vandulLasers=vandulLasers.filter(b=>{
  if(b.life<=0)return false;
  b.x+=b.vx*dt;b.y+=b.vy*dt;b.life-=dt;
  return b.life>0&&b.x>=arena.left&&b.x<=arena.right&&b.y>=arena.top&&b.y<=arena.bottom;
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
 const other=ally===testLead?wingman:testLead;
 const side=ally===testLead?-(Math.sign(wingman?.formation.followX)||1):(Math.sign(ally.formation.followX)||1);
 let goal=null,best=-Infinity;
 for(const [dx,dy] of [[side*172,-43],[-side*172,-43],[side*128,-127],[-side*128,-127],
                       [0,-172],[side*135,107],[-side*135,107],[0,150]]){
  const point={x:clamp(p.x+dx,arena.left+margin,arena.right-margin),
   y:clamp(p.y+dy,arena.top+margin,arena.bottom-margin)};
  if(Math.hypot(point.x-p.x,point.y-p.y)<55||other?.hp>0&&other.loosePoint&&
   Math.hypot(point.x-other.loosePoint.x,point.y-other.loosePoint.y)<72)continue;
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
function emitAllyShot(ally,weapon,angle,heading,mode){
 const gun=guns[weapon],cost=gun.he3PerShot??0;
 if(ally.he3+1e-8<cost)return false;
 ally.he3=Math.max(0,ally.he3-cost);
 addFlightHeat(mode==='burst'?heatRules.burstShot:heatRules.normalShot,ally);
 const u=Math.cos(angle),v=Math.sin(angle),offset=ally.r+4;
 const x=ally.x+Math.cos(heading)*offset,y=ally.y+Math.sin(heading)*offset;
 shots.push({x,y,vx:u*gun.speed,vy:v*gun.speed,a:angle,weapon,damage:gun.damage,ally:true,allyRole:ally.role,allyMode:mode});
 ally.vx-=u*gun.recoil*ally.fit.recoilFactor;ally.vy-=v*gun.recoil*ally.fit.recoilFactor;capVelocity(ally,Math.min(264,ally.fit.speed+38));
 ally.muzzleLight=.10;burstRing(x,y,gun.muzzle,gun.ring);
 return true;
}
function advanceAllyWeapon(ally,dt,target,blockers){
 ally.he3=Math.min(ally.fit.he3Capacity,ally.he3+ally.fit.he3Rate*dt);
 ally.muzzleLight=Math.max(0,ally.muzzleLight-dt);
 ally.fireWait-=dt;
 const clear=target&&target.hp>0&&(!ally.volley||ally.volley.target===target)&&!firstSightCover(ally,target,blockers,3);
 if(!clear){
  if(ally.volley){ally.fireWait=Math.max(0,ally.fireWait)+ally.volley.profile.recovery;ally.volley=null;}
  else ally.fireWait=Math.max(0,ally.fireWait);
  if(!target&&Math.hypot(ally.vx,ally.vy)>28)queueHeading(ally,Math.atan2(ally.vy,ally.vx));
  advanceHeading(ally,dt);
  ally.normalGroup=0;return;
 }
 const desired=bearing(ally,target),distance=Math.hypot(target.x-ally.x,target.y-ally.y);
 if(!ally.volley){queueHeading(ally,desired);advanceHeading(ally,dt);}
 const heading=ally.aim;
 if(ally.fireWait>1e-9)return;
 const volley=ally.volley;
 if(volley){
  const {profile,weapon,angle}=volley,gun=guns[weapon];
  const shotAngle=angle+profile.pattern[volley.index]*gun.burstSpread*degrees;
  if(!emitAllyShot(ally,weapon,shotAngle,heading,'burst')||++volley.index>=profile.pattern.length){
   ally.fireWait=profile.recovery;ally.volley=null;
  }else ally.fireWait+=profile.interval;
  return;
 }
 if(!noseReady(ally,desired)){ally.fireWait=0;return;}
 // Prefer the first fitted gun that can afford its intended firing mode.
 // A partly charged Sterling should not leave a loaded secondary idle.
 let weapon=null,wantsBurst=false,fallback=null;
 for(const id of ally.fit.weapons){
  const option=guns[id],charge=option.he3PerShot??0;
  const burst=option.burstOnly||distance<=(ally.fit.preferredBurst[id]?190:145);
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
  if(emitAllyShot(ally,weapon,heading+profile.pattern[0]*gun.burstSpread*degrees,heading,'burst')){
   addFlightHeat(heatRules.burstActivation,ally);
   ally.volley={weapon,profile,index:1,angle:heading,target};ally.fireWait=profile.interval;
  }
 }else if(gun.normalInterval){
  if(ally.normalWeapon!==weapon){ally.normalWeapon=weapon;ally.normalIndex=ally.normalGroup=0;}
  const spread=normalPattern[ally.normalIndex++%normalPattern.length]*gun.normalSpread*degrees;
  if(emitAllyShot(ally,weapon,heading+spread,heading,'normal')){
   // A repeat weapon takes short pairs at its true shot interval. Aiming
   // between these pairs / single taps keeps the allies from holding fire forever.
   const repeat=gun.holdRepeat&&++ally.normalGroup<2;
   ally.fireWait=repeat?gun.normalInterval:Math.max(gun.normalInterval,.52);
   if(!repeat)ally.normalGroup=0;
  }
 }
}
function flyWingman(ally,dt,obstacles,rivals){
 if(!ally?.hp)return;
 advanceFlightHeat(dt,ally);
 ally.prevX=ally.x;ally.prevY=ally.y;ally.hitGlow=Math.max(0,ally.hitGlow-dt);
 const other=ally===testLead?wingman:testLead;
 const blockers=[...obstacles,...rivals,p];
 if(other?.hp>0)blockers.push(other);
 let target=null,closest=410;
 for(const rival of rivals){
  const distance=Math.hypot(rival.x-ally.x,rival.y-ally.y);
  if(distance<closest&&(!firstSightCover(ally,rival,blockers,3)||thermalContact(ally,rival))){target=rival;closest=distance;}
 }
 // Hold the saved mission-north offset without orbiting as the player aims.
 const margin=ally.r+5,slot=ally.formation,anchor=ally===wingman&&testLead?.hp>0?testLead:p;
 const mirror=(slot.followX>0&&anchor.x>arena.right-88)||(slot.followX<0&&anchor.x<arena.left+88);
 const x=clamp(anchor.x+(mirror?-slot.followX:slot.followX)+anchor.vx*.13,arena.left+margin,arena.right-margin);
 const y=clamp(anchor.y+(anchor.y>arena.bottom-68?-slot.bottomY:slot.followY)+anchor.vy*.13,arena.top+margin,arena.bottom-margin);
 const loose=wingmanOrder==='loose';
 const point=loose?looseWingmanPoint(ally,dt,target,blockers,rivals):ally===testLead?squadronLeadPoint(ally,blockers,dt):null;
 let vx=((point?.x??x)-ally.x)*3.8,vy=((point?.y??y)-ally.y)*3.8;
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
function applyMainThrust(dt){
 const ux=Math.cos(p.aim),uy=Math.sin(p.aim),speed=Math.hypot(p.vx,p.vy);
 const forward=p.vx*ux+p.vy*uy;
 const push=clamp(p.speed-forward,0,p.acceleration*mainThrustRules.push*dt);
 p.vx+=ux*push;p.vy+=uy*push;
 capVelocity(p,Math.max(p.speed,speed));
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
function physics(dt,moveX,moveY,powered,mainThrust,assist){
 const rivals=activeVanduls();
 if(rivals.length){p.prevX=p.x;p.prevY=p.y;}
 const length=Math.hypot(moveX,moveY);
 p.mainThrustActive=powered&&mainThrust;
 if(p.mainThrustActive){
  applyMainThrust(dt);
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
 p.x+=p.vx*dt;p.y+=p.vy*dt;p.wallFx=Math.max(0,p.wallFx-dt);
 p.impactCooldown=Math.max(0,p.impactCooldown-dt);wall(p,!capitalShip&&!escortShip);
 if(state!=='play')return;
 if(capitalShip||escortShip){
  if(capitalShip)updateCapital(dt);else advanceCourseShip(escortShip,escortCourse,escortSections,dt);
  for(let pass=0;pass<3;pass++)for(const piece of (capitalShip??escortShip).hull)contact(p,piece,false);
  wall(p);
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
 if(testLead?.hp>0)flyWingman(testLead,dt,obstacles,rivals);
 if(wingman?.hp>0)flyWingman(wingman,dt,obstacles,rivals);
 if(activeWrecks.length)stepWreckage(dt,bodies);
 for(const a of asteroids){capVelocity(a,42);a.spin=clamp(a.spin,-.62,.62);}
 sweepProjectiles(dt,bodies,obstacles);
 if(state==='play')fireVandulLasers(dt);
}
function simulate(dt){
 const move=liveTrim(),mainThrust=holdsMainThrust();
 const x=move?.x??(Number(has('KeyD'))-Number(has('KeyA'))),y=move?.y??(Number(has('KeyS'))-Number(has('KeyW')));
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
   const assist=escortShip?escortAssistVelocity(manual):!manual&&formationAssistVelocity();
   const powered=!hangarDialog?.open&&simulateFlightPower(step,manual||!!assist);
   physics(step,x,y,powered,mainThrust,assist);shieldClock+=step;
  }
 }
 if(state==='play'&&!aimForTouchAssist()&&!aimPtr){const [ax,ay]=keyAim();if(ax||ay)snapAim(Math.atan2(ay,ax));}
 showFlightPower();updateHud();
}
function poly(points,ctx=g){
 ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();ctx.fill();if(ctx.lineWidth>0)ctx.stroke();
}
function paintFlightSpace(camera){
 const north=floorNorth(),south=H+carrierArrival.exterior+90,height=south-north;
 const tint=g.createLinearGradient(0,north,0,south);
 tint.addColorStop(0,'#071828');tint.addColorStop(.53,'#0b1428');tint.addColorStop(1,'#090d1f');
 g.fillStyle=tint;g.fillRect(camera.x,camera.y,camera.w,camera.h);
 const lag=motion?.matches?0:.19,lagX=(camera.x+camera.w*.5-W*.5)*lag,lagY=(camera.y-north)*lag;
 // A distant nebula drifts more slowly than the rocks. Soft falloff, no art edges.
 for(const cloud of flightNebula){
  const x=cloud.x+lagX,y=north+(height*cloud.y)+lagY,r=cloud.r;
  if(x+r<camera.x||x-r>camera.x+camera.w||y+r<camera.y||y-r>camera.y+camera.h)continue;
  const haze=g.createRadialGradient(x,y,0,x,y,r);
  haze.addColorStop(0,cloud.core);haze.addColorStop(.43,cloud.halo);haze.addColorStop(1,'#19223b00');
  g.fillStyle=haze;g.fillRect(camera.x,camera.y,camera.w,camera.h);
 }
 const first=Math.max(0,Math.floor((camera.y-north-lagY)/H)),last=Math.floor((camera.y+camera.h-north-lagY)/H);
 for(let band=first;band<=last;band++)for(const star of stars){
  const x=((star.x+band*311)%W)+lagX,y=north+band*H+star.y+lagY;
  if(y<camera.y-3||y>camera.y+camera.h+3||x<camera.x-3||x>camera.x+camera.w+3)continue;
  g.globalAlpha=star.d/111;g.fillStyle=star.h;g.fillRect(x,y,star.r,star.r);
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
function paintCapital(t,camera){
 const ship=capitalShip;if(!ship||!withinCamera(ship,camera,capitalCourse.height*.62))return;
 const {width:w,height:h}=capitalCourse,onBifrost=ship.vessel===bifrostCapital;
 const art=capitalArt.get(ship.vessel.id);
 g.save();g.translate(ship.x,ship.y);g.rotate(ship.aim+Math.PI/2);
 // The launch monitor's soft light follows the moving hull, not the camera.
 {
  g.save();g.translate(0,h*.13);g.scale(1,1.38);
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
 if(art?.complete&&art.naturalWidth>0)g.drawImage(art,-w/2,-h/2,w,h);
 else if(onBifrost){
  g.fillStyle='#372e52';g.strokeStyle='#ecc1ff';g.lineWidth=2;
  poly([[0,-h*.46],[28,-h*.23],[50,-h*.11],[134,h*.27],[117,h*.39],[65,h*.36],[42,h*.46],[-42,h*.46],[-65,h*.36],[-117,h*.39],[-134,h*.27],[-50,-h*.11],[-28,-h*.23]]);
 }
 else{
  g.fillStyle='#213547';g.strokeStyle='#6b969f';g.lineWidth=2;
  poly([[-34,-h*.48],[34,-h*.48],[70,-h*.16],[93,h*.22],[79,h*.42],[-79,h*.42],[-93,h*.22],[-70,-h*.16]]);
 }
 // Bifrost uses its painted runways. Pegasus retains its existing deck ticks.
 if(!onBifrost)for(const [i,[x,y]] of ship.pads.entries()){
  const active=i===ship.pad&&(ship.phase!=='stored'&&(ship.phase!=='flight'||p.dockingClearance));
  g.strokeStyle=active?'#abf5ddba':ship.deckCrew.some(crew=>crew.pad===i)?'#82b4e59e':'#d2b87d91';g.lineWidth=1;g.beginPath();
  for(const side of [-1,1])for(const end of [-1,1]){
   g.moveTo(x+side*10,y+end*4);g.lineTo(x+side*10,y+end*8);g.lineTo(x+side*6,y+end*8);
  }
  g.stroke();
 }
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
 g.setLineDash([11,14]);g.strokeRect(edge,north+edge,W-edge*2,height-edge*2);
 g.restore();
}
function softShadow(x,y,rx,ry,opacity=.48){
 g.save();g.translate(x,y);g.scale(rx,ry);
 const shade=g.createRadialGradient(0,0,.23,0,0,1);shade.addColorStop(0,'rgba(0,0,0,'+opacity+')');shade.addColorStop(1,'#0000');
 g.fillStyle=shade;g.fillRect(-1,-1,2,2);g.restore();
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
 if(ship===p&&target!==0&&fighterSprite){
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
function paintFighterArt(bank,size=1){
 const bounds=[-43.68*size,-28.22*size,87.36*size,58.24*size];
 const lean=Math.abs(bank),art=fighterBankArts[bank<0?'left':'right'];
 if(lean<.025||!art?.complete||art.naturalWidth<=0){
  g.drawImage(fighterSprite,...bounds);return;
 }
 // Both silhouette frames share exactly the same local center and nose.
 if(lean>=.985){g.drawImage(art,...bounds);return;}
 const opacity=g.globalAlpha;
 g.globalAlpha=opacity*(1-lean);g.drawImage(fighterSprite,...bounds);
 g.globalAlpha=opacity*lean;g.drawImage(art,...bounds);
 g.globalAlpha=opacity;
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
 if(!ship?.deckCrew.length)return;
 for(const member of ship.deckCrew){
  const point=berthWorld(ship,member.lx,member.ly),aim=ship.aim+member.heading;
  if(!withinCamera(point,camera,51))continue;
  g.save();g.translate(point.x,point.y);g.rotate(aim+Math.PI/2);
  if(fighterSprite?.complete&&fighterSprite.naturalWidth>0)paintFighterArt(0,member.scale);
  else paintFallbackFighter(member.scale);
  if(member.phase!=='parked'&&member.scale>.52){
   g.fillStyle='#82bff4be';g.beginPath();g.ellipse(0,27*member.scale,3.4,8*member.scale,0,0,TAU);g.fill();
  }
  g.restore();
  if(member.phase!=='parked'&&member.scale>.52){
   g.save();g.fillStyle='#bfe9ff';g.font='700 10px system-ui';g.textAlign='center';
   g.fillText('WING '+(member.pad+1),point.x,point.y+31);g.restore();
  }
 }
}
function paintHover(ship,t){
 const {x,y,aim:a}=ship,berthing=ship===p&&capitalLocked();
 if(berthing&&capitalShip.phase==='stored')return;
 const lift=berthing?berthLift(capitalShip):1,storage=berthing?storageProgress(capitalShip):0;
 const size=berthing?capitalBerth.parkScale+(1-capitalBerth.parkScale)*lift+
  (capitalBerth.innerScale-capitalBerth.parkScale)*storage:1;
 const lively=!berthing&&!motion?.matches&&(state==='play'||state==='arrive'||(state==='depart'&&missionDeparture?.flying)),pose=flightVisuals.get(ship);
 const height=8*lift+(lively?hoverBob(t,pose?.speed??0):0),push=lively?recoil*35:0;
 if(lift>0)softShadow(x+4*lift,y+7*lift,31*size,23*size,.68*lift);
 g.save();g.translate(x-Math.cos(a)*push,y-height-Math.sin(a)*push);g.rotate(a+Math.PI/2);
 if(storage>0)g.globalAlpha=capitalShip.deckCrew.length?
  1-smoothBerth((storage-.26)/.27):1-smoothBerth((storage-.70)/.30);
 if(lift>0){
 const wash=g.createRadialGradient(0,14,2,0,14,26);
 wash.addColorStop(0,'#53fbe45c');wash.addColorStop(1,'#4ce9e000');
 g.fillStyle=wash;g.fillRect(-27,-13,54,54);
 }
 if(!berthing&&ship===p&&ship.mainThrustActive&&holdsMainThrust()&&state==='play'&&!document.hidden)paintMainExhaust(t);
 // Enlarge only the drawing; keep the nose aligned with the existing muzzle.
 if(fighterSprite?.complete&&fighterSprite.naturalWidth>0)paintFighterArt(lively?(pose?.bank??0):0,size);
 else paintFallbackFighter(size);
 if(!berthing&&state==='play'&&recoil>0){
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
 const {x,y,hitGlow}=ship,lively=!motion?.matches&&state==='play',pose=flightVisuals.get(ship);
 const bank=lively?(pose?.bank??0):0,offset=lively?hoverBob(t+(ship.slot??1)*.10,pose?.speed??0):0;
 softShadow(x+4,y+6,27,24,.65);
 g.save();g.translate(x,y-offset);g.rotate(vandulHullAngle(ship));
 if(Math.abs(bank)>=.025)g.transform(1-.09*Math.abs(bank),0,.14*bank,1,0,0);
 if(vandulSprite?.complete&&vandulSprite.naturalWidth>0){
  const w=67.2,h=Math.min(69.44,w*vandulSprite.naturalHeight/vandulSprite.naturalWidth)||67.2;
  g.drawImage(vandulSprite,-w/2,-h/2,w,h);
 }else{
  g.fillStyle=hitGlow>0?'#936785':'#453654';g.strokeStyle='#d591e1';g.lineWidth=2;
  poly([[-26,-21],[-13,-12],[0,-4],[13,-12],[26,-21],[23,5],[13,16],[0,19],[-13,16],[-23,5]]);
  g.fillStyle='#ffc2d9';g.fillRect(-3,0,6,8);
 }
 g.restore();
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
 const label='VANDUL '+(waveSize()>1?ship.slot+' · ':'')+ship.hp+'/'+ship.maxHp+(ship.bonus?' · +'+ship.bonus+'°':''),labelY=y>arena.bottom-26?y-30:y+33;
 g.strokeText(label,x,labelY);g.fillText(label,x,labelY);
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
 if(wreckLayer){
  const north=floorNorth(),x=Math.max(0,Math.floor(camera.x)-32),y=Math.max(north,Math.floor(camera.y)-32);
  const w=Math.min(W-x,camera.w+65),h=Math.min(H-y,camera.h+65);
  g.drawImage(wreckLayer,x,y-north,w,h,x,y,w,h);
 }
 for(const old of archivedWrecks)if(!isWingmanTest()||[old.hull,...old.fragments].some(body=>withinCamera(body,camera)))paintOneWreck(g,old,false);
 for(const wreck of activeWrecks)paintOneWreck(g,wreck,true);
}
function drawAim(){
 const u=Math.cos(p.aim),v=Math.sin(p.aim),x=p.x+u*62,y=p.y+v*62;
 g.save();g.strokeStyle='#bfffee7d';g.lineWidth=1.4;g.setLineDash([3,5]);g.beginPath();
 g.moveTo(p.x+u*27,p.y+v*27);g.lineTo(x-u*9,y-v*9);g.stroke();g.setLineDash([]);
 g.beginPath();g.arc(x,y,6,0,TAU);g.stroke();g.restore();
}
function paintPlayerShield(t){
 if(state!=='play'||capitalLocked()||!shieldUp())return;
 const fitted=fittedShield();
 if(!fitted)return;
 const strength=shieldHp/fitted.capacity;
 const pulse=motion?.matches?0:(.5+.5*Math.sin(t*9))*.14;
 const recentlyHit=shieldClock-shieldHitAt<.15;
 const radius=p.r+8;
 g.save();g.beginPath();g.arc(p.x,p.y,radius,0,TAU);
 g.fillStyle=recentlyHit?'#82f4ff46':'#53cdef23';g.fill();
 g.strokeStyle=recentlyHit?'#c0ffff':'#73eaff';
 g.globalAlpha=.52+strength*.27+pulse;g.lineWidth=2;g.stroke();
 g.restore();
}
function paintWingman(a){
 if(!a||state==='depart'||state==='complete')return;
 softShadow(a.x+4,a.y+7,31,23,.68);
 g.save();g.translate(a.x,a.y-8);g.rotate(a.aim+Math.PI/2);
 const lead=a.role==='lead',marker=lead?'#ffe1a0':'#a8e9ff';
 g.strokeStyle=a.hp?marker:'#7a726d';g.lineWidth=1.6;
 if(a.fit.hull===stockFighterId&&fighterSprite?.complete&&fighterSprite.naturalWidth>0){
  if(!a.hp)g.globalAlpha=.58;
  paintFighterArt(0);g.globalAlpha=1;
 }else{
  g.fillStyle=a.hp?(a.hitGlow>0?'#aadbec':'#337369'):'#4b4745';
  poly([[0,-25],[8,-12],[24,-12],[36,10],[32,17],[14,14],[8,23],[-8,23],[-14,14],[-32,17],[-36,10],[-24,-12],[-8,-12]]);
  g.fillStyle=a.hp?'#a6c9c0':'#393431';
  poly([[0,-19],[6,-8],[5,7],[-5,7],[-6,-8]]);
 }
 if(a.hp){
  g.fillStyle=marker;g.fillRect(-19,15,7,2);g.fillRect(12,15,7,2);
  if(a.muzzleLight>0){g.globalAlpha=a.muzzleLight*10;g.fillRect(-2,-33,4,9);}
 }
 g.restore();
 g.save();g.font='bold 10px system-ui';g.textAlign='center';
 g.strokeStyle='#0d1e27';g.lineWidth=3;g.fillStyle=a.hp?'#abecff':'#b1aba5';
 const label=a.displayName?a.displayName.toUpperCase()+(a.hp?'':' DISABLED'):
  lead?(a.hp?'AI LEAD':'LEAD DISABLED'):(a.hp?'ALLY':'ALLY DISABLED');
 g.strokeText(label,a.x,a.y+24);g.fillText(label,a.x,a.y+24);g.restore();
}
function draw(t){
 g.setTransform(1,0,0,1,0,0);g.fillStyle='#0d1217';g.fillRect(0,0,viewW,viewH);
 const camera=flightCamera();
 const viewScale=scale*camera.zoom;
 g.setTransform(viewScale,0,0,viewScale,0,0);g.save();g.beginPath();g.rect(0,0,camera.w,camera.h);g.clip();
 g.translate(-camera.x,-camera.y);
 if(shake>0&&!motion?.matches&&(shakeSwitch?.checked??true))g.translate(Math.sin(t*71)*shake*17,Math.cos(t*64)*shake*13);
 paintFlightSpace(camera);
 if(capitalShip){paintCapital(t,camera);paintCapitalApproach(camera);}
 else if(escortShip)paintEscort(camera);
 else paintFlightGuide(camera,!duelEnabled);
 paintCapitalCrew(camera);
 if(p&&state==='play'&&!capitalLocked())drawAim();
 const inTraining=isWingmanTest(),drawn=body=>!inTraining||withinCamera(body,camera);
 for(const cone of cones)if(drawn(cone))paintCone(cone);
 for(const asteroid of asteroids)if(!inTraining||withinCamera(asteroid,camera,asteroid.r*2))paintAsteroid(asteroid);
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
 for(const bolt of vandulLasers){
  g.save();g.translate(bolt.x,bolt.y);g.rotate(bolt.a);
  if(bolt.twinbeam){
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
 paintWingman(testLead);paintWingman(wingman);
 if(p)paintHover(missionDeparture?.craft??p,t);
 paintPlayerShield(t);
 for(const b of shots){
  const gun=guns[b.weapon]||guns.blaster,heavy=gun.kind==='ballistic';
  g.save();g.translate(b.x,b.y);g.rotate(b.a);
  if(heavy){
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
 for(const z of sparks){g.globalAlpha=z.life/z.max;g.fillStyle=z.tone;g.fillRect(z.x,z.y,z.r,z.r);}
 g.restore();
}
function tick(now){
 if(hullRepairReadyAt&&state==='menu'&&!document.hidden&&now-lastHullRepairRefresh>=240){
  lastHullRepairRefresh=now;refreshBuildDisplays();
 }
 const dt=Math.min(.032,Math.max(0,(now-(last||now))/1000));last=now;
 if(!document.hidden&&!routeParked&&state!=='pause'&&state!=='menu'){
  elapsed+=dt;shake=Math.max(0,shake-dt);recoil=Math.max(0,recoil-dt);
  if(state==='arrive')advancePlayerIngress(dt);
  else if(state==='depart')advanceMissionDeparture(dt);
  else if(state==='play'&&capitalLocked()){advanceCapitalBerth(dt);shieldClock+=dt;showFlightPower();updateHud();}
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
  for(const z of sparks){z.x+=z.dx*dt;z.y+=z.dy*dt;z.life-=dt;}
  sparks=sparks.filter(z=>z.life>0);
  for(const r of rings)r.life-=dt;rings=rings.filter(r=>r.life>0);
  for(const fx of clashBursts)fx.life-=dt;clashBursts=clashBursts.filter(fx=>fx.life>0);
 }
 updateHangarEngineVisual();updateThruster();showShieldControl();syncWingmanCommands();updateCapitalHud();updateEscortHud();updateWingRadio(dt);if(state!=='menu')draw(elapsed);frame=requestAnimationFrame(tick);
}
resetField();overlay.hidden=true;showGameScreen(false);
enterLinkedCarrierRoute();
frame=requestAnimationFrame(tick);
})();
