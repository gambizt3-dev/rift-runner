'use strict';
(() => {
const canvas=document.getElementById('game'),hud=document.getElementById('hud'),overlay=document.getElementById('overlay'),resetFieldButton=document.getElementById('reset-field'),shakeSwitch=document.getElementById('screen-shake'),movePad=document.getElementById('move-pad'),aimPad=document.getElementById('aim-pad'),fireButton=document.getElementById('fire-button'),soundSwitch=document.getElementById('sound-on'),soundTest=document.getElementById('test-sound'),engineTest=document.getElementById('test-engine'),gunBlaster=document.getElementById('gun-blaster'),gunBallistic=document.getElementById('gun-ballistic'),phoneTools=document.getElementById('phone-audio-tools'),phoneSwitch=document.getElementById('iphone-audio'),phoneTest=document.getElementById('test-phone-audio'),soundStatus=document.getElementById('sound-status'),aimSwitch=document.getElementById('aim-mode');
const duelSwitch=document.getElementById('vandul-duel-on'),duelReadout=document.getElementById('vandul-duel-readout');
const gunButtons={blaster:gunBlaster,ballistic:gunBallistic,ak77:document.getElementById('gun-ak77')};
const hangarDialog=document.getElementById('hangar'),openHangarButton=document.getElementById('open-hangar'),closeHangarButton=document.getElementById('close-hangar'),fitPrimary=document.getElementById('fit-primary'),fitSecondary=document.getElementById('fit-secondary'),fitStatus=document.getElementById('fit-status'),hangarTitle=document.getElementById('hangar-title');
const fitEngine=document.getElementById('fit-engine');
const fitHullStat=document.getElementById('fit-hull-stat'),fitWeightStat=document.getElementById('fit-weight-stat'),fitEngineStat=document.getElementById('fit-engine-stat'),fitPrimaryStat=document.getElementById('fit-primary-stat'),fitSecondaryStat=document.getElementById('fit-secondary-stat');
const canopyRig=document.getElementById('hangar-canopy-rig'),canopyButton=document.getElementById('hangar-canopy-button'),canopyHint=document.getElementById('canopy-hint'),hangarEngineTest=document.getElementById('hangar-test-engine');
if(!canvas||!hud||!overlay)return;
const g=canvas.getContext('2d',{alpha:false});
if(!g){overlay.textContent='This browser cannot display the game canvas.';return;}
const W=480,H=720,TAU=Math.PI*2,arena={left:12,right:468,top:12,bottom:708};
const fighterSprite=typeof window.Image==='function'?new window.Image():null;
if(fighterSprite)fighterSprite.src='./fighter-winged.png?v=23';
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
// Module ratings are dimensionless; the full starter fit anchors V34 handling.
const fighterProfiles={winged:{hullHp:20,weight:60,engine:'stock-thruster'}};
const engineProfiles={
 'stock-thruster':{weight:20,speedRating:10,acceleration:1750,audioProfile:'stock-loop'},
 'test-thruster':{weight:20,speedRating:1,acceleration:1750,audioProfile:'synth'}
};
const powerProfiles={'stock-core':{weight:8}};
const stockFitWeight=100,speedPerRating=22.2;
const hardImpactSpeed=185,hardImpactAlignment=.94;
const guns={
 blaster:{label:'Sterling',fullLabel:'Sterling C.32 Laser',kind:'energy',targetSpreadChance:0,weight:5,damage:3,holdRepeat:false,preview:'./blaster-test.mp3',speed:570,recoil:20,kick:.145,push:.286,pushMax:245,normalSpread:0,burstSpread:2.5,muzzle:13,edge:'#32a786',core:'#d4fff1',hit:'#d0fff2',ring:'#99ffe0'},
 ballistic:{label:'A-Alkine',fullLabel:'A-Alkine Ballistic Repeater',kind:'ballistic',targetSpreadChance:1,weight:7,damage:5,holdRepeat:true,preview:'./ballistic-test.mp3',speed:570,recoil:34,kick:.185,push:.422,pushMax:335,normalSpread:1.8,burstSpread:6,muzzle:17,edge:'#f49a31',core:'#fff4b8',hit:'#ffd387',ring:'#ffbc63'},
 ak77:{label:'AK77',fullLabel:'AK77 Gatling Ballistic',kind:'ballistic',targetSpreadChance:1,weight:9,damage:2,holdRepeat:false,burstOnly:true,
  burst:{pattern:[0,-.25,.25,-.5,.5,-.8,.8,-1,1,-.65,.65,0],interval:.045,recovery:1.15},
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
const fighterFit=readFighterFit();
const isMounted=name=>name===fighterFit.primary||name!==null&&name===fighterFit.secondary;
function preferredWeapon(){try{const key=localStorage.getItem(shotSoundKey);if(isMounted(key))return key;}catch{}return fighterFit.primary;}
const stockFighterId='winged';
function preferredEngine(){
 try{
  const saved=JSON.parse(localStorage.getItem(engineFitKey));
  if(saved?.version===1&&typeof saved.engine==='string'&&Object.hasOwn(engineProfiles,saved.engine))return saved.engine;
 }catch{}
 return fighterProfiles[stockFighterId].engine;
}
const fighterLoadout=Object.seal({fighter:stockFighterId,weapon:preferredWeapon(),engine:preferredEngine(),power:'stock-core',shield:null,countermeasure:null,utility:null});
const fittedFighter=()=>fighterProfiles[fighterLoadout.fighter],fittedEngine=()=>engineProfiles[fighterLoadout.engine];
const mountedGun=()=>guns[fighterLoadout.weapon];
function fittedWeight(){
 return fittedFighter().weight+fittedEngine().weight+powerProfiles[fighterLoadout.power].weight+
  guns[fighterFit.primary].weight+(guns[fighterFit.secondary]?.weight??0);
}
function syncFlightFit(){
 const weight=fittedWeight(),engine=fittedEngine(),massFactor=stockFitWeight/weight;
 Object.assign(p,{weight,speed:engine.speedRating*speedPerRating,acceleration:engine.acceleration*massFactor,invMass:.32*massFactor});
}
let shotSoundVersion=0;
const burstModes=Object.fromEntries(Object.entries(guns).map(([name,gun])=>[name,!!gun.burstOnly]));
const normalBurst={pattern:[0,-.5,.5,-1,1,0],interval:.055,recovery:.46};
const normalPattern=[1,-1,.55,-.55],normalShots=new Map(),degrees=Math.PI/180;
let lastGunTap=null,fireBurst=null,burstCooldown=0;
function showFire(){
 if(!fireButton)return;
 const mode=burstModes[fighterLoadout.weapon],phase=fireBurst?'burst':burstCooldown>0?'cooldown':'';
 fireButton.dataset.weapon=fighterLoadout.weapon;
 if(phase)fireButton.dataset.phase=phase;else delete fireButton.dataset.phase;
 fireButton.textContent=phase==='cooldown'?'COOLDOWN':mode?'BURST':'FIRE';
 const {label:name,holdRepeat}=mountedGun();
 fireButton.setAttribute?.('aria-label',phase==='cooldown'?'Cooling down':mode?'Fire '+name+' burst':holdRepeat?'Fire '+name+'; hold to repeat':'Fire '+name);
}
function showGun(){
 for(const [name,button] of Object.entries(gunButtons))if(button){
  button.setAttribute('aria-pressed',String(fighterLoadout.weapon===name));
  button.hidden=!isMounted(name);
  button.title=guns[name].fullLabel;
  button.textContent=guns[name].label+(burstModes[name]?' · Burst':'');
 }
 const first=gunButtons[fighterFit.primary],rack=first?.parentElement;
 if(rack&&rack.firstElementChild!==first)rack.insertBefore(first,rack.firstElementChild);
 showFire();
}
showGun();
function audioStatus(text){if(soundStatus&&soundStatus.textContent!==text)soundStatus.textContent=text;}
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
 if(event.isTrusted!==true||document.hidden)return;
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
 if(!isMounted(next)||next===fighterLoadout.weapon)return;
 stopBallisticHold();stopFirePointer();cancelFireBurst();lastGunTap=null;stopNativePreview();fighterLoadout.weapon=next;shotSoundVersion++;showGun();syncArenaMusic();
 try{localStorage.setItem(shotSoundKey,fighterLoadout.weapon);}catch{}
 audioStatus(soundOn?(mountedGun().label+' selected.'):'Sound off.');
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
 stopEffectVoices();
 if(old?.state!=='closed'&&old?.close){try{Promise.resolve(old.close()).catch(()=>{});}catch{}}
}
function parkAudio(){
 resumeAfterHangar=false;
 audioParked=true;stopNativePreview();releasePhoneAudio();cancelHangarPress();cancelCanopyAudio();retireAudio();
 if(state==='play')pause();
}
function showAudioReady(){
 if(!audioParked||document.hidden)return;
 audioParked=false;
 if(soundOn)audioStatus('Ready. Tap Resume flight or a sound test.');
}
function unlockAudio(onReady,event,keepEnginePress=null){
 if(event?.isTrusted===false||document.hidden)return;
 // Touch activation is delivered on release, not on pointerdown on iOS.
 if(event?.type==='pointerdown'&&event.pointerType&&event.pointerType!=='mouse')return;
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
  if(openingAudio?.context===context&&now<openingAudio.until){
   if(onReady){openingAudio.ready=onReady;openingAudio.testUntil=now+1100;}
   return;
  }
  // A previous resume() may never settle on iOS. Let a later real gesture
  // retry the same context without a timer that tries to start audio itself.
  attempt={context,until:now+420,ready:onReady,testUntil:onReady?now+1100:0};
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
soundSwitch?.addEventListener('change',event=>{
 soundOn=soundSwitch.checked;
 try{localStorage.setItem(soundKey,soundOn?'on':'off');}catch{}
 if(master){try{master.gain.value=soundOn?masterLevel:0;}catch{}}
 if(soundOn)unlockAudio(undefined,event);else{openingAudio=null;stopNativePreview();releasePhoneAudio();cancelEngineTest();cancelCanopyAudio();stopThruster(true);stopProjectileVoices();stopBurstEcho();stopArenaMusic();audioStatus('Sound off.');}
});
soundTest?.addEventListener('click',event=>{
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
function sound(kind){
 if(nativePreview)return null;
 if(kind==='shot'){
  if(!soundOn||!master||audio?.state!=='running'||voices.size>=11||document.hidden)return null;
  if(playShotSample())return 'recorded';
  if(mountedGun().kind==='ballistic'){tone('triangle',177,55,.105,.31);cannonCrack();}
  else{
   // A pitched electronic sweep, distinct from Ballistic's physical crack.
   tone('sine',940,340,.112,.25);tone('triangle',620,225,.085,.115,.013);
  }
  return 'built-in';
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
const thrusterTarget=(level,recorded)=>recorded?Math.min(.38,(level??.122)*1.8):level??.122;
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
 if(fittedEngine().audioProfile!=='stock-loop'||asset?.context!==context||!asset.buffer)return false;
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
  out.gain.setValueAtTime(0,t);out.gain.linearRampToValueAtTime(level===null?.154:Math.min(.22,level*1.18),t+.17);out.gain.setTargetAtTime(level??.122,t+.17,.13);
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
 const flight=state==='play'&&(input?(input.x!==0||input.y!==0):has('KeyA')!==has('KeyD')||has('KeyW')!==has('KeyS'));
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
 if(event.isTrusted!==true||document.hidden||nativePreview||enginePress||insideHangar!==!!hangarDialog?.open)return false;
 const press={kind,id,button,insideHangar,at:audioClock(),sound:false};
 enginePress=press;
 if(insideHangar)startHangarEngineVisual();
 const ready=()=>{
  if(enginePress!==press||insideHangar!==!!hangarDialog?.open||document.hidden||!soundOn||nativePreview)return;
  press.sound=true;updateThruster();
  if(thruster?.driving)audioStatus('Engine test requested in browser.');
 };
 // On iOS a cold touch can unlock audio on release for the next hold only.
 if(audio?.state==='running'&&master&&soundOn)ready();
 else if(kind==='key'||event.pointerType==='mouse'||!event.pointerType)unlockAudio(ready,event,press);
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
  if(event.detail>0&&audioClock()<(engineClickFence.get(button)??0))return;
  // Click-only activation has no held interval and can't trigger a late pulse.
  unlockAudio(()=>{if(!enginePress&&insideHangar===!!hangarDialog?.open)audioStatus('Sound ready. Hold Test engine to play it.');},event);
 });
}
window.addEventListener('pointerup',event=>endEnginePress(event,'pointer',event.pointerId),true);
window.addEventListener('pointercancel',cancelEnginePointer,true);
// A new preference defaults to direct aiming even for legacy Auto Aim users.
const aimAssistKey='rift-runner.aim-assist.v2';
function preferredAimAssist(){try{return localStorage.getItem(aimAssistKey)==='on';}catch{return false;}}
let aimAssist=preferredAimAssist(),aimManuallyPlaced=false,touchFlight=false,autoLock=null;
if(aimSwitch)aimSwitch.checked=aimAssist;
aimSwitch?.addEventListener('change',()=>{
 aimAssist=!!aimSwitch.checked;aimManuallyPlaced=false;autoLock=null;
 try{localStorage.setItem(aimAssistKey,aimAssist?'on':'off');}catch{}
});
function inputSource(isTouch){if(touchFlight!==isTouch){touchFlight=isTouch;autoLock=null;}}
function usingAimAssist(){return aimAssist&&touchFlight&&!aimManuallyPlaced&&!aimPtr;}
function autoTarget(){
 if(!usingAimAssist()){autoLock=null;return null;}
 const distance=c=>(c.x-p.x)**2+(c.y-p.y)**2;
 let nearest=null,best=Infinity;
 for(const c of cones){const gap=distance(c);if(gap<best){nearest=c;best=gap;}}
 const rival=vandulActive();
 if(rival){const gap=distance(rival);if(gap<best){nearest=rival;best=gap;}}
 if(nearest&&autoLock&&(autoLock===rival||cones.includes(autoLock))&&distance(autoLock)<=best*1.30)return autoLock;
 autoLock=nearest;return nearest;
}
function aimForTouchAssist(){
 const target=autoTarget();if(target)p.aim=Math.atan2(target.y-p.y,target.x-p.x);
 return target;
}
const stars=Array.from({length:150},(_,i)=>({x:(i*107+i*i*11)%W,y:(i*173+i*i*7)%H,r:i%17===0?1.65:i%3===0?1.04:.44,d:18+(i%13)*7,h:i%5===0?'#67c3d6':i%7===0?'#b853c2':'#b4d1ed'}));
let state='menu',p,elapsed=0,last=0,shake=0,frame=0,movePtr=null,moveKey=null,movePulse=null,heldMove=null,aimPtr=null,scale=1,dx=0,dy=0,cssScale=1,viewW=1,viewH=1,hiDpi=1;
let shots=[],cones=[],sparks=[],rings=[],recoil=0,practiceHits=0,practiceShots=0,hudKey='',hudNumbers=null;
let duelEnabled=false,vandul=null,vandulLasers=[],duelClock=0,duelResult=null,vandulSprite=null;
const vandulProfile={hullHp:20,radius:20,speed:63,acceleration:150,invMass:1,
 laser:{damage:2,speed:335,baseSpread:1.5,recovery:.48,grace:.95,windup:.26,life:2.25}};
const vandulStackSeconds=.5,laserPattern=[1,-1,.5,-.5,0];
let ballisticHold=null,firePointer=null,skipFireClickUntil=-Infinity;
const ballisticInterval=.25;
const kick=amount=>{shake=Math.max(shake,amount);};
const keys=new Set();
const has=(...a)=>a.some(k=>keys.has(k));
const trail=['#68ffe0','#97f5f3','#c6e0ff'];
function vandulActive(){return vandul&&!duelResult?vandul:null;}
function resetDuel(){
 if(autoLock===vandul)autoLock=null;
 vandulLasers=[];duelClock=0;duelResult=null;
 const {hullHp,radius,invMass,laser}=vandulProfile;
 if(duelEnabled&&!vandulSprite&&typeof window.Image==='function'){
  vandulSprite=new window.Image();vandulSprite.src='./vandul-ship.webp';
 }
 vandul=duelEnabled?{x:240,y:445,r:radius,vx:0,vy:0,angle:0,aim:Math.PI/2,spin:0,hitGlow:0,wallFx:0,invMass,
  hp:hullHp,maxHp:hullHp,rockSign:1,stacks:[],bonus:0,nextLaser:laser.grace,laserIndex:0,lastLaserBonus:null}:null;
 if(vandul&&p.hp===0)duelResult='lost';
 updateDuelReadout();
}
function updateDuelReadout(){
 if(!duelReadout)return;
 duelReadout.hidden=!vandul;
 if(!vandul)return;
 const text=duelResult==='won'?'VANDUL DESTROYED · You win · Reset for rematch':
  duelResult==='lost'?'VANDUL WINS · Your hull 0 HP · Reset to retry':
  'VANDUL '+vandul.hp+'/'+vandul.maxHp+' HP · Your hull '+p.hp+'/'+p.maxHp+' · Laser spread +'+vandul.bonus+'°'+(vandul.lastLaserBonus===null?'':' · Last shot +'+vandul.lastLaserBonus+'°');
 if(duelReadout.textContent!==text)duelReadout.textContent=text;
 duelReadout.dataset.result=duelResult??'';
}
if(duelSwitch)duelSwitch.checked=false;
duelSwitch?.addEventListener('change',()=>{
 if(duelEnabled===!!duelSwitch.checked)return;
 duelEnabled=!!duelSwitch.checked;
 resetDuel();
});
function updateHud(){
 const speed=p?Math.round(Math.hypot(p.vx,p.vy)/5)*5:0,values=[cones.length,speed,practiceHits,practiceShots,p?p.hp+'/'+p.maxHp:''];
 const key=values.join(':');if(key===hudKey)return;hudKey=key;
 if(!hudNumbers){
  hud.innerHTML=['CONES','SPEED','HITS','SHOTS','HULL'].map(name=>'<span class="rift-stat'+(name==='HULL'?' hull-stat':'')+'">'+name+' <b data-field-number></b></span>').join('')+
   (resetFieldButton?'':'<button id="reset-field" class="rift-reset" type="button">Reset field</button>');
  hudNumbers=Array.from(hud.querySelectorAll('[data-field-number]'));
 }
 hudNumbers.forEach((node,i)=>{node.textContent=String(values[i]);});
 hud.dataset.hull=p&&p.hp<=5?'critical':'healthy';
}
function button(label,action,id=''){return '<button type="button" class="rift-action" data-rift="'+action+'"'+(id?' id="'+id+'"':'')+'>'+label+'</button>';}
function menu(title,copy,action,label,kicker){
 overlay.hidden=false;overlay.innerHTML='<p class="rift-kicker">'+kicker+'</p><h2>'+title+'</h2><p>'+copy+'</p>'+button(label,action,action==='start'?'start':'');
}
function clearInput(){
 stopBallisticHold();stopFirePointer();stopNativePreview();cancelEngineTest();stopThruster();stopProjectileVoices();
 lastGunTap=null;cancelFireBurst(true);
 const release=[[movePad,movePtr?.id],[aimPad,aimPtr?.id]];
 keys.clear();movePtr=null;moveKey=null;movePulse=null;aimPtr=null;autoLock=null;
 paintMove();showStick(aimPad);
 for(const [pad,id] of release)if(id!==null&&id!==undefined){try{pad?.releasePointerCapture?.(id);}catch{}}
}
function liveFocus(){canvas.focus({preventScroll:true});}
const coneLayout=[[116,133],[235,104],[362,144],[148,258],[336,262],[245,345],[108,449],[367,467]];
function resetField(){
 clearInput();aimManuallyPlaced=false;
 const maxHp=fittedFighter().hullHp;
 p={x:W/2,y:H*.79,r:17,aim:-Math.PI/2,vx:0,vy:0,hp:maxHp,maxHp,inv:0,spin:0,wallFx:0,impactCooldown:0,craft:true};
 syncFlightFit();
 resetDuel();
 cones=coneLayout.map(([x,y],i)=>({id:i+1,x,y,r:15,vx:0,vy:0,angle:(i*.79)%TAU,spin:0,hitGlow:0,wallFx:0,invMass:1}));
 shots=[];sparks=[];rings=[];normalShots.clear();practiceHits=0;practiceShots=0;recoil=0;shake=0;hudKey='';updateHud();
}
function start(){resetField();state='play';overlay.hidden=true;liveFocus();syncArenaMusic();}
const restart=event=>{unlockAudio(undefined,event);start();};
resetFieldButton?.addEventListener('click',restart);
if(!resetFieldButton)hud.addEventListener('click',event=>{if(event.target.closest('#reset-field'))restart(event);});
function pause(){
 if(state==='pause'){state='play';overlay.hidden=true;liveFocus();syncArenaMusic();return;}
 if(state!=='play')return;
 state='pause';stopArenaMusic();clearInput();menu('Flight paused','Your ship is holding its position.','resume','Resume flight','RUN PAUSED');
 overlay.querySelector('button')?.focus({preventScroll:true});
}
let resumeAfterHangar=false;
function showFighterFit(prefix=''){
 if(fitEngine)fitEngine.value=fighterLoadout.engine;
 if(fitPrimary)fitPrimary.value=fighterFit.primary;
 if(fitSecondary)fitSecondary.value=fighterFit.secondary??'';
 if(fitHullStat)fitHullStat.textContent=' · Hull '+fittedFighter().hullHp+' HP';
 if(fitWeightStat)fitWeightStat.textContent=' · Weight '+fittedWeight();
 if(fitEngineStat)fitEngineStat.textContent='Speed rating '+fittedEngine().speedRating;
 const mountStats=id=>{
  const gun=guns[id];if(!gun)return 'No weapon fitted';
  const impact=Math.min(gun.speed*gun.push,gun.pushMax);
  const pushLabel=impact>=200?'Heavy':impact>=150?'Medium':'Light';
  return gun.damage+' damage / projectile'+(gun.burstOnly?' · '+gun.burst.pattern.length+' per burst · Weight '+gun.weight:'')+' · '+pushLabel+' target push';
 };
 if(fitPrimaryStat)fitPrimaryStat.textContent=mountStats(fighterFit.primary);
 if(fitSecondaryStat)fitSecondaryStat.textContent=mountStats(fighterFit.secondary);
 if(fitStatus){
  const primary=guns[fighterFit.primary].label,secondary=fighterFit.secondary?guns[fighterFit.secondary].label:'empty';
  fitStatus.textContent=prefix+primary+' primary · '+secondary+' secondary.';
 }
}
function changeFighterFit(slot,value){
 if(value!==null&&!Object.hasOwn(guns,value)||slot==='primary'&&value===null)return;
 if(fighterFit[slot]===value)return;
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
 if(fighterFit.primary!==previousPrimary||!isMounted(fighterLoadout.weapon))selectGun(fighterFit.primary);
 showGun();
 let saved=true;
 try{localStorage.setItem(fitKey,JSON.stringify({version:1,...fighterFit}));}catch{saved=false;}
 showFighterFit(saved?'Fit saved. ':'Fit updated for this session. ');
}
showFighterFit();
fitEngine?.addEventListener('change',()=>{
 const next=fitEngine.value;
 if(!hangarDialog?.open||!Object.hasOwn(engineProfiles,next)||next===fighterLoadout.engine){fitEngine.value=fighterLoadout.engine;return;}
 cancelHangarPress();
 fighterLoadout.engine=next;
 if(p)syncFlightFit();
 let saved=true;
 try{localStorage.setItem(engineFitKey,JSON.stringify({version:1,engine:next}));}catch{saved=false;}
 showFighterFit(saved?'Engine saved. ':'Engine updated for this session. ');
});
fitPrimary?.addEventListener('change',()=>{if(hangarDialog?.open)cancelHangarPress();changeFighterFit('primary',fitPrimary.value);});
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
 if(canopyRig)canopyRig.dataset.canopy=open?'open':'closed';
 if(canopyButton){
  canopyButton.setAttribute('aria-pressed',String(open));
  canopyButton.setAttribute('aria-label',open?'Close canopy':'Open canopy');
 }
 if(canopyHint)canopyHint.textContent=open?'Tap canopy to close':'Tap canopy to open';
}
canopyButton?.addEventListener('click',event=>{
 if(!hangarDialog?.open||!canopyRig)return;
 const open=canopyRig.dataset.canopy!=='open';
 setCanopy(open);
 requestCanopyAudio(open,event);
});
openHangarButton?.addEventListener('click',()=>{
 if(!hangarDialog||hangarDialog.open||typeof hangarDialog.showModal!=='function')return;
 try{hangarDialog.showModal();}catch{return;}
 resumeAfterHangar=state==='play';
 if(resumeAfterHangar)pause();else clearInput();
 showFighterFit();hangarTitle?.focus({preventScroll:true});
});
closeHangarButton?.addEventListener('click',()=>hangarDialog?.close());
hangarDialog?.addEventListener('cancel',()=>cancelHangarPress());
hangarDialog?.addEventListener('close',()=>{
 cancelHangarPress();cancelCanopyAudio();stopThruster(true);
 setCanopy(false);
 const shouldResume=resumeAfterHangar;resumeAfterHangar=false;
 if(shouldResume&&state==='pause'&&!document.hidden)pause();
 else openHangarButton?.focus({preventScroll:true});
});
overlay.addEventListener('click',ev=>{
 const bt=ev.target.closest('[data-rift]');if(!bt)return;
 const a=bt.dataset.rift;
 if(a!=='start'&&a!=='resume'&&a!=='reset')return;
 if(ev.pointerType==='touch'||ev.pointerType==='pen')inputSource(true);else if(ev.pointerType==='mouse')inputSource(false);
 if(a==='start'&&state==='menu'){unlockAudio(undefined,ev);start();}
 else if(a==='resume'&&state==='pause'){unlockAudio(undefined,ev);pause();}
 else if(a==='reset'&&state==='disabled')restart(ev);
});
const keyAim=()=>[Number(has('ArrowRight'))-Number(has('ArrowLeft')),Number(has('ArrowDown'))-Number(has('ArrowUp'))];
const flightKeys=new Set(['KeyA','KeyW','KeyD','KeyS','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space']);
window.addEventListener('keydown',e=>{
 if(hangarDialog?.open)return;
 if(['Digit1','Digit2'].includes(e.code)&&!e.repeat&&!e.ctrlKey&&!e.metaKey&&!e.altKey&&state==='play'){
  const active=document.activeElement;
  if(active===canvas||active&&Object.values(gunButtons).includes(active)){
   e.preventDefault();const name=e.code==='Digit2'?fighterFit.secondary:fighterFit.primary;
   if(name===null)return;
   lastGunTap=null;selectGun(name);if(e.shiftKey)toggleBurst(name);return;
  }
 }
 if(['Escape','KeyP'].includes(e.code)&&!e.repeat&&['play','pause'].includes(state)){e.preventDefault();pause();return;}
 if(state==='play'&&e.code==='Space'&&(mountedGun().holdRepeat||mountedGun().burstOnly)&&(document.activeElement===canvas||document.activeElement===fireButton)){
  e.preventDefault();
  if(!e.repeat){inputSource(document.activeElement===fireButton);unlockAudio(undefined,e);pressFire('key');}
  return;
 }
 if(state!=='play'||!flightKeys.has(e.code)||e.code==='Space'&&document.activeElement!==canvas)return;
 e.preventDefault();inputSource(false);if(!e.repeat)unlockAudio(undefined,e);keys.add(e.code);
 if(!aimPtr&&e.code.startsWith('Arrow')){const [x,y]=keyAim();if(x||y)p.aim=Math.atan2(y,x);}
 if(!e.repeat&&e.code==='Space')pressFire();
},{passive:false});
window.addEventListener('keyup',e=>{
 if(enginePress?.kind==='key'&&enginePress.id===e.code){e.preventDefault();endEnginePress(e,'key',e.code);}
 if(e.code==='Space'&&ballisticHold?.kind==='key'){e.preventDefault();stopBallisticHold();}
 keys.delete(e.code);
});
window.addEventListener('blur',()=>{if(hangarDialog?.open)cancelHangarPress();clearInput();if(state==='play')pause();});
document.addEventListener('visibilitychange',()=>{if(document.hidden)parkAudio();else showAudioReady();});
window.addEventListener('pagehide',parkAudio);
window.addEventListener('pageshow',showAudioReady);
function fieldPoint(e){
 const box=canvas.getBoundingClientRect();
 return {x:(e.clientX-box.left-dx/hiDpi)/cssScale,y:(e.clientY-box.top-dy/hiDpi)/cssScale};
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
 const button=target?.closest?.('[data-move]');
 return button&&movePad?.contains(button)&&Object.hasOwn(directions,button.dataset.move)?button:null;
}
function moveValue(button){const [x,y]=button?directions[button.dataset.move]:[0,0];return {x,y,button};}
function paintMove(){
 const button=(movePtr??moveKey??movePulse)?.button??null;
 if(button!==heldMove){if(heldMove)delete heldMove.dataset.held;heldMove=button;if(button)button.dataset.held='true';}
}
if(movePad){
 movePad.addEventListener('pointerdown',e=>{
  const button=moveButton(e.target);
  if(state!=='play'||e.button>0||!button||movePtr||aimPtr?.id===e.pointerId||heldFirePointer(e.pointerId))return;
  e.preventDefault();inputSource(true);unlockAudio(undefined,e);capture(movePad,e);movePulse=null;
  movePtr={id:e.pointerId,held:0,...moveValue(button)};paintMove();
 });
 movePad.addEventListener('pointermove',e=>{
  if(state!=='play'||movePtr?.id!==e.pointerId)return;
  e.preventDefault();
  const over=document.elementFromPoint?.(e.clientX,e.clientY);
  if(!document.elementFromPoint)return;
  const direction=moveButton(over);
  if(direction!==movePtr.button)Object.assign(movePtr,moveValue(direction),{held:0});
  paintMove();
 });
 for(const event of ['pointercancel','pointerup','lostpointercapture'])movePad.addEventListener(event,e=>{
  if(movePtr?.id!==e.pointerId||event==='lostpointercapture'&&e.target!==movePad)return;
  const pressed=movePtr;movePtr=null;
  if(event==='pointerup'&&state==='play')unlockAudio(undefined,e);
  if(event==='pointerup'&&pressed.button&&pressed.held===0)movePulse={...moveValue(pressed.button),left:.065};
  paintMove();
 });
 movePad.addEventListener('keydown',e=>{
  const button=moveButton(e.target);
  if(state!=='play'||!button||!['Space','Enter'].includes(e.code))return;
  e.preventDefault();if(moveKey||e.repeat)return;
  inputSource(true);unlockAudio(undefined,e);movePulse=null;moveKey={code:e.code,held:0,...moveValue(button)};paintMove();
 });
 movePad.addEventListener('keyup',e=>{
  if(moveKey?.code!==e.code)return;
  e.preventDefault();const pressed=moveKey;moveKey=null;
  if(!movePtr&&pressed.held===0)movePulse={...moveValue(pressed.button),left:.065};
  paintMove();
 });
 movePad.addEventListener('focusout',()=>{if(moveKey){moveKey=null;paintMove();}});
 // Screen reader and other assistive activations may send click without hold.
 movePad.addEventListener('click',e=>{
  const button=moveButton(e.target);
  if(state!=='play'||e.detail!==0||!button||movePtr||moveKey)return;
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
  if(v.angle!==null){aimManuallyPlaced=true;autoLock=null;p.aim=v.angle;}
 };
 aimPad.addEventListener('pointerdown',e=>{
  if(state!=='play'||e.button>0||aimPtr||movePtr?.id===e.pointerId||heldFirePointer(e.pointerId))return;
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
function startBallisticHold(kind,id=null){
 if(ballisticHold||state!=='play'||!mountedGun().holdRepeat||document.hidden)return false;
 ballisticHold={kind,id,wait:ballisticInterval};fireShot();return true;
}
function cancelFireBurst(reset=false){
 stopBurstEcho();
 if(fireBurst&&!reset)burstCooldown=fireBurst.profile.recovery;
 fireBurst=null;if(reset)burstCooldown=0;
 showFire();
}
function pressFire(kind,id=null){
 if(state!=='play'||document.hidden||fireBurst||burstCooldown>0)return;
 if(burstModes[fighterLoadout.weapon]){
  aimForTouchAssist();
  const gun=mountedGun(),profile=gun.burst??normalBurst;
  fireBurst={angle:p.aim,spread:gun.burstSpread*degrees,index:1,wait:profile.interval,profile};
  fireShot(fireBurst.angle);
  if(fighterLoadout.weapon==='ballistic')playBallisticBurstEcho();
  showFire();
 }else if(mountedGun().holdRepeat&&kind)startBallisticHold(kind,id);
 else fireShot();
}
function advanceBurst(dt){
 if(fireBurst){
  fireBurst.wait-=dt;
  if(fireBurst.wait<=0){
   const {profile,angle,spread}=fireBurst;
   fireShot(angle+spread*profile.pattern[fireBurst.index++],angle);
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
 if(state!=='play'||document.hidden||e.button!==0||firePointer!==null||ballisticHold||movePtr?.id===e.pointerId||aimPtr?.id===e.pointerId)return;
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
 if(state!=='play'||e.pointerType!=='mouse'||e.button!==0)return;
 const q=fieldPoint(e);e.preventDefault();inputSource(false);liveFocus();unlockAudio(undefined,e);
 if(!aimPtr)p.aim=angleTo(q.x,q.y);pressFire();
});
canvas.addEventListener('pointermove',e=>{
 if(state!=='play'||e.pointerType!=='mouse'||aimPtr)return;
 const q=fieldPoint(e);inputSource(false);p.aim=angleTo(q.x,q.y);
});
function layout(){
 const box=canvas.getBoundingClientRect();
 hiDpi=Math.min(2.5,window.devicePixelRatio||1);viewW=Math.max(2,Math.round(box.width*hiDpi));viewH=Math.max(2,Math.round(box.height*hiDpi));
 if(canvas.width!==viewW)canvas.width=viewW;if(canvas.height!==viewH)canvas.height=viewH;
 scale=Math.min(viewW/W,viewH/H);cssScale=scale/hiDpi;dx=(viewW-W*scale)/2;dy=(viewH-H*scale)/2;
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
function capVelocity(body,max){
 const speed=Math.hypot(body.vx,body.vy);
 if(speed>max){body.vx*=max/speed;body.vy*=max/speed;}
}
function fireShot(angle=null,heading=null){
 if(state!=='play'||document.hidden)return;
 const weapon=fighterLoadout.weapon,gun=mountedGun();
 if(angle===null){
  aimForTouchAssist();
  const i=normalShots.get(weapon)??0;
  angle=p.aim+normalPattern[i]*gun.normalSpread*degrees;
  normalShots.set(weapon,(i+1)%normalPattern.length);
 }
 const a=angle,ux=Math.cos(a),uy=Math.sin(a),x=p.x+Math.cos(heading??p.aim)*(p.r+4),y=p.y+Math.sin(heading??p.aim)*(p.r+4);
 const projectile={x,y,vx:ux*gun.speed,vy:uy*gun.speed,a,weapon,damage:gun.damage};
 shots.push(projectile);
 p.vx-=ux*gun.recoil;p.vy-=uy*gun.recoil;capVelocity(p,255);practiceShots++;updateHud();
 sound('shot');duckArenaMusic();startProjectileVoice(projectile);recoil=gun.kick;kick(gun.kick);burstRing(x,y,gun.muzzle,gun.ring);
}
function hardWallImpact(body,normal,approachSpeed){
 if(state!=='play'||body.impactCooldown>0||normal<hardImpactSpeed||normal<approachSpeed*hardImpactAlignment)return;
 body.impactCooldown=.30;
 const damage=Math.min(6,3+Math.floor((normal-hardImpactSpeed)/20));
 body.hp=Math.max(0,body.hp-damage);
 kick(.21);sound('hit');burstRing(body.x,body.y,26,'#ffad82');
 if(body.hp===0)disablePlayer(false);
}
function disablePlayer(laserHit){
 const lost=!!vandulActive();
 if(lost){duelResult='lost';vandulLasers=[];vandul.stacks=[];vandul.bonus=0;updateDuelReadout();}
 state='disabled';p.vx=p.vy=0;
 stopArenaMusic();clearInput();shots=[];
 menu(lost?'Vandul wins':'Hull disabled',laserHit?'Vandul’s lasers disabled your fighter. Reset for a rematch.':
  'Hard impact. Reset the field to repair your fighter.','reset','Reset field','HULL 0 HP');
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
function steerVandul(ship,dt){
 const dx=p.x-ship.x,dy=p.y-ship.y,distance=Math.hypot(dx,dy);
 if(distance<1e-6)return;
 const ux=dx/distance,uy=dy/distance;
 ship.aim=Math.atan2(dy,dx);
 const {speed,acceleration}=vandulProfile;
 const radial=clamp((distance-177)/115,-.60,.76),side=.62*Math.sin(duelClock*1.55+.70);
 const dirX=ux*radial-uy*side,dirY=uy*radial+ux*side;
 const dvx=dirX*speed-ship.vx,dvy=dirY*speed-ship.vy,gap=Math.hypot(dvx,dvy);
 if(gap>0){const blend=Math.min(1,acceleration*dt/gap);ship.vx+=dvx*blend;ship.vy+=dvy*blend;}
}
function advanceVandulLasers(dt){
 const ship=vandulActive();if(!ship)return;
 for(const bolt of vandulLasers){
  const dx=bolt.vx*dt,dy=bolt.vy*dt;
  const {hit,earliest}=firstSweep(bolt,dx,dy,[...cones,p]);
  if(hit){
   bolt.life=0;
   burstRing(bolt.x+dx*earliest,bolt.y+dy*earliest,15,'#ed7cae');
   if(hit===p){
    p.hp=Math.max(0,p.hp-bolt.damage);kick(.12);sound('hit');
    if(p.hp===0){disablePlayer(true);return;}
   }else hit.hitGlow=.25;
  }else{bolt.x+=dx;bolt.y+=dy;bolt.life-=dt;}
 }
 vandulLasers=vandulLasers.filter(b=>b.life>0&&b.x>=arena.left&&b.x<=arena.right&&b.y>=arena.top&&b.y<=arena.bottom);
 const end=duelClock+dt,laser=vandulProfile.laser;
 // Both guidance and the actual shot use the direct line to the player.
 // The timed offset belongs to this shot; later impacts don't steer it.
 ship.aim=Math.atan2(p.y-ship.y,p.x-ship.x);
 if(ship.nextLaser<=end){
  const firedAt=ship.nextLaser,bonus=ship.stacks.filter(stack=>stack.hitAt<=firedAt&&firedAt<stack.expiresAt).length;
  const a=ship.aim+(laser.baseSpread+bonus)*degrees*laserPattern[ship.laserIndex++%laserPattern.length];
  const muzzle=ship.r+3,x=ship.x+Math.cos(ship.aim)*muzzle,y=ship.y+Math.sin(ship.aim)*muzzle;
  vandulLasers.push({x,y,vx:Math.cos(a)*laser.speed,vy:Math.sin(a)*laser.speed,a,aim:ship.aim,bonus,damage:laser.damage,life:laser.life});
  ship.lastLaserBonus=bonus;ship.nextLaser+=laser.recovery;
 }
 ship.stacks=ship.stacks.filter(stack=>stack.expiresAt>end);
 ship.bonus=ship.stacks.length;duelClock=end;
 updateDuelReadout();
}
function firstSweep(b,dx,dy,bodies){
 let hit=null,earliest=Infinity;
 for(const body of bodies){
  if(body===vandul&&duelResult)continue;
  const t=sweptCircle(b.x-body.prevX,b.y-body.prevY,dx-(body.x-body.prevX),dy-(body.y-body.prevY),body.r+2);
  if(t!==null&&t<earliest){hit=body;earliest=t;}
 }
 return {hit,earliest};
}
function sweepShots(dt,bodies){
 for(const b of shots){
  const dx=b.vx*dt,dy=b.vy*dt;
  const {hit,earliest}=firstSweep(b,dx,dy,bodies);
  if(hit){
   b.x+=dx*earliest;b.y+=dy*earliest;b.spent=true;
   const ux=Math.cos(b.a),uy=Math.sin(b.a),cx=hit.prevX+(hit.x-hit.prevX)*earliest,cy=hit.prevY+(hit.y-hit.prevY)*earliest;
   const gun=guns[b.weapon]||guns.blaster; // Impact uses the gun frozen at launch.
   const force=clamp(((b.vx-hit.vx)*ux+(b.vy-hit.vy)*uy)*gun.push,35,gun.pushMax);
   hit.vx+=ux*force;hit.vy+=uy*force;capVelocity(hit,340);
   hit.spin=clamp(hit.spin+((b.x-cx)*uy-(b.y-cy)*ux)*force*.00233,-15,15);
   const heavy=gun.kind==='ballistic';
   if(hit===vandul){
    hit.hp=Math.max(0,hit.hp-b.damage);
    hit.rockSign*=-1;
    if(hit.hp===0){
     duelResult='won';vandulLasers=[];hit.stacks=[];hit.bonus=0;autoLock=null;
     burstRing(hit.x,hit.y,39,'#d3a6ff');updateDuelReadout();
    }else{
     const chance=gun.targetSpreadChance;
     if(chance>=1||chance>0&&Math.random()<chance){
      const hitAt=duelClock+dt*earliest;
      hit.stacks.push({hitAt,expiresAt:hitAt+vandulStackSeconds});
     }
    }
   }
   hit.hitGlow=.46;practiceHits++;sound('hit');blast(b.x,b.y,gun.hit,heavy?15:12,heavy?1:.83);burstRing(b.x,b.y,heavy?26:20,gun.ring);kick(heavy?.13:.10);
  }else{b.x+=dx;b.y+=dy;}
 }
 shots=shots.filter(b=>{
  const flying=!b.spent&&b.y>=arena.top&&b.y<=arena.bottom&&b.x>=arena.left&&b.x<=arena.right;
  if(!flying)releaseProjectileVoice(b);
  return flying;
 });
}
function physics(dt,moveX,moveY){
 const rival=vandulActive();
 if(rival){p.prevX=p.x;p.prevY=p.y;}
 const m=Math.max(1,Math.hypot(moveX,moveY));
 if(moveX||moveY){
  const dx=moveX/m*p.speed-p.vx,dy=moveY/m*p.speed-p.vy,change=Math.hypot(dx,dy),blend=change?Math.min(1,p.acceleration*dt/change):0;
  p.vx+=dx*blend;p.vy+=dy*blend;
 }else{const fade=Math.exp(-2.8*dt);p.vx*=fade;p.vy*=fade;}
 p.x+=p.vx*dt;p.y+=p.vy*dt;p.wallFx=Math.max(0,p.wallFx-dt);
 p.impactCooldown=Math.max(0,p.impactCooldown-dt);wall(p,true);
 if(state!=='play')return;
 const bodies=rival?[...cones,rival]:cones;
 if(rival)steerVandul(rival,dt);
 for(const c of bodies){
  c.prevX=c.x;c.prevY=c.y;c.wallFx=Math.max(0,c.wallFx-dt);c.hitGlow=Math.max(0,c.hitGlow-dt);
  const fade=Math.exp(-1.45*dt);c.vx*=fade;c.vy*=fade;c.spin*=Math.exp(-1.60*dt);
  c.x+=c.vx*dt;c.y+=c.vy*dt;c.angle=(c.angle+c.spin*dt)%TAU;wall(c);
 }
 for(let pass=0;pass<3;pass++){
  for(const c of bodies)contact(p,c,pass===0);
  for(let i=0;i<bodies.length;i++)for(let j=i+1;j<bodies.length;j++)contact(bodies[i],bodies[j],pass===0);
  wall(p);for(const c of bodies)wall(c);
 }
 sweepShots(dt,bodies);advanceVandulLasers(dt);
}
function simulate(dt){
 const move=movePtr??moveKey??movePulse;
 const x=move?.x??(Number(has('KeyD'))-Number(has('KeyA'))),y=move?.y??(Number(has('KeyS'))-Number(has('KeyW')));
 if(movePtr)movePtr.held+=dt;else if(moveKey)moveKey.held+=dt;
 if(movePulse){movePulse.left-=dt;if(movePulse.left<=0){movePulse=null;paintMove();}}
 if(dt>0){const steps=Math.ceil(dt/.009);for(let i=0;i<steps&&state==='play';i++)physics(dt/steps,x,y);}
 if(state==='play'&&!aimForTouchAssist()&&!aimPtr){const [ax,ay]=keyAim();if(ax||ay)p.aim=Math.atan2(ay,ax);}
 updateHud();
}
function poly(points){
 g.beginPath();points.forEach(([x,y],i)=>i?g.lineTo(x,y):g.moveTo(x,y));g.closePath();g.fill();if(g.lineWidth>0)g.stroke();
}
function flatFloor(){
 const concrete=g.createLinearGradient(0,0,0,H);
 concrete.addColorStop(0,'#242a2d');concrete.addColorStop(.52,'#1b2327');concrete.addColorStop(1,'#23282a');
 g.fillStyle=concrete;g.fillRect(0,0,W,H);
 g.lineWidth=1;g.strokeStyle='#65777a29';g.beginPath();
 for(let x=48;x<W;x+=48){g.moveTo(x,0);g.lineTo(x,H);}
 for(let y=48;y<H;y+=48){g.moveTo(0,y);g.lineTo(W,y);}
 g.stroke();
 g.strokeStyle='#101518';g.beginPath();
 g.moveTo(W/2-2,0);g.lineTo(W/2-2,H);g.moveTo(0,360);g.lineTo(W,360);g.stroke();
 g.setLineDash([18,16]);g.strokeStyle='#d9c88b4a';g.lineWidth=2;g.beginPath();
 g.moveTo(117,28);g.lineTo(117,H-28);g.moveTo(W-117,28);g.lineTo(W-117,H-28);g.stroke();g.setLineDash([]);
 g.strokeStyle='#83908c35';g.lineWidth=1;g.beginPath();
 g.arc(W/2,H/2,69,0,TAU);g.moveTo(W/2-82,H/2);g.lineTo(W/2+82,H/2);
 g.moveTo(W/2,H/2-82);g.lineTo(W/2,H/2+82);g.stroke();
 g.fillStyle='#c3cbb84a';g.font='700 11px ui-monospace,monospace';g.fillText('LOW ALT / TEST APRON',29,40);g.fillText('R-01',W-54,H-30);
 g.fillStyle='#111619';g.fillRect(0,0,W,12);g.fillRect(0,H-12,W,12);g.fillRect(0,12,12,H-24);g.fillRect(W-12,12,12,H-24);
 g.fillStyle='#d4a645';
 for(let x=2;x<W;x+=20){g.fillRect(x,4,9,4);g.fillRect(x,H-8,9,4);}
 for(let y=15;y<H-12;y+=20){g.fillRect(4,y,4,9);g.fillRect(W-8,y,4,9);}
 g.strokeStyle='#7f8b87';g.lineWidth=1;g.strokeRect(12.5,12.5,W-25,H-25);
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
function paintHover(x,y,a,t){
 const lively=!motion?.matches&&state==='play';
 const height=8+(lively?Math.sin(t*6)*1.25:0),push=lively?recoil*35:0;
 softShadow(x+4,y+7,31,23,.68);
 g.save();g.translate(x-Math.cos(a)*push,y-height-Math.sin(a)*push);g.rotate(a+Math.PI/2);
 const wash=g.createRadialGradient(0,14,2,0,14,26);
 wash.addColorStop(0,'#53fbe45c');wash.addColorStop(1,'#4ce9e000');
 g.fillStyle=wash;g.fillRect(-27,-13,54,54);
 // Enlarge only the drawing; keep the nose aligned with the existing muzzle.
 if(fighterSprite?.complete&&fighterSprite.naturalWidth>0)g.drawImage(fighterSprite,-39,-25.1,78,52);
 else{
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
 if(state==='play'&&recoil>0){
  g.globalAlpha=Math.min(1,recoil*13);g.lineWidth=0;g.fillStyle='#ffab49';
  poly([[0,-47],[-4,-35],[-12,-32],[-4,-28],[-2,-21],[2,-21],[4,-28],[12,-32],[4,-35]]);
  g.fillStyle='#fff3ce';poly([[0,-42],[-4,-31],[0,-24],[4,-31]]);
 }
 g.restore();
}
function paintVandul(ship){
 const {x,y,hitGlow,rockSign,aim}=ship;
 const rock=motion?.matches?0:rockSign*Math.sin(hitGlow*29)*hitGlow*.64+Math.sin(ship.angle)*.065;
 if(state==='play'&&ship.nextLaser-duelClock<=vandulProfile.laser.windup){
  const u=Math.cos(aim),v=Math.sin(aim),near=ship.r+4,far=near+50;
  g.save();g.strokeStyle='#ff9bb7';g.lineWidth=1.7;g.setLineDash([5,4]);
  g.beginPath();g.moveTo(x+u*near,y+v*near);g.lineTo(x+u*far,y+v*far);g.stroke();g.restore();
 }
 softShadow(x+4,y+6,27,24,.65);
 g.save();g.translate(x,y);g.rotate(aim+Math.PI/2+rock);
 if(vandulSprite?.complete&&vandulSprite.naturalWidth>0){
  const w=60,h=Math.min(62,w*vandulSprite.naturalHeight/vandulSprite.naturalWidth)||60;
  g.drawImage(vandulSprite,-w/2,-h/2,w,h);
 }else{
  g.fillStyle=hitGlow>0?'#936785':'#453654';g.strokeStyle='#d591e1';g.lineWidth=2;
  poly([[-26,-21],[-13,-12],[0,-4],[13,-12],[26,-21],[23,5],[13,16],[0,19],[-13,16],[-23,5]]);
  g.fillStyle='#ffc2d9';g.fillRect(-3,0,6,8);
 }
 g.restore();
 g.save();g.font='bold 12px system-ui';g.textAlign='center';g.lineWidth=3;
 g.strokeStyle='#23162c';g.fillStyle='#fed3ff';
 const label='VANDUL '+ship.hp+'/'+ship.maxHp+(ship.bonus?' · +'+ship.bonus+'°':''),labelY=y>arena.bottom-26?y-30:y+33;
 g.strokeText(label,x,labelY);g.fillText(label,x,labelY);g.restore();
}
function drawAim(){
 const u=Math.cos(p.aim),v=Math.sin(p.aim),x=p.x+u*62,y=p.y+v*62;
 g.save();g.strokeStyle='#bfffee7d';g.lineWidth=1.4;g.setLineDash([3,5]);g.beginPath();
 g.moveTo(p.x+u*27,p.y+v*27);g.lineTo(x-u*9,y-v*9);g.stroke();g.setLineDash([]);
 g.beginPath();g.arc(x,y,6,0,TAU);g.stroke();g.restore();
}
function draw(t){
 g.setTransform(1,0,0,1,0,0);g.fillStyle='#0d1217';g.fillRect(0,0,viewW,viewH);
 g.setTransform(scale,0,0,scale,dx,dy);g.save();g.beginPath();g.rect(0,0,W,H);g.clip();
 if(shake>0&&!motion?.matches&&(shakeSwitch?.checked??true))g.translate(Math.sin(t*71)*shake*17,Math.cos(t*64)*shake*13);
 flatFloor();
 if(p&&state==='play')drawAim();
 for(const cone of cones)paintCone(cone);
 const rival=vandulActive();if(rival)paintVandul(rival);
 for(const bolt of vandulLasers){
  g.save();g.translate(bolt.x,bolt.y);g.rotate(bolt.a);
  g.fillStyle='#cf6fff';g.fillRect(-24,-2,27,4);
  g.fillStyle='#ffc4d9';g.fillRect(-16,-.7,19,1.4);g.restore();
 }
 if(p)paintHover(p.x,p.y,p.aim,t);
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
 for(const r of rings){g.globalAlpha=Math.min(1,r.life/r.max*1.45);g.strokeStyle=r.colour;g.lineWidth=2;g.beginPath();g.arc(r.x,r.y,motion?.matches?r.size*.66:3+(1-r.life/r.max)*r.size,0,TAU);g.stroke();}
 for(const z of sparks){g.globalAlpha=z.life/z.max;g.fillStyle=z.tone;g.fillRect(z.x,z.y,z.r,z.r);}
 g.restore();
}
function tick(now){
 const dt=Math.min(.032,Math.max(0,(now-(last||now))/1000));last=now;
 if(!document.hidden&&state!=='pause'){
  elapsed+=dt;shake=Math.max(0,shake-dt);recoil=Math.max(0,recoil-dt);
  if(state==='play'){
   simulate(dt);
   advanceBurst(dt);
   if(ballisticHold){
    ballisticHold.wait-=dt;
    if(ballisticHold.wait<=0){ballisticHold.wait=ballisticInterval;fireShot();}
   }
  }
  for(const z of sparks){z.x+=z.dx*dt;z.y+=z.dy*dt;z.life-=dt;}
  sparks=sparks.filter(z=>z.life>0);
  for(const r of rings)r.life-=dt;rings=rings.filter(r=>r.life>0);
 }
 updateHangarEngineVisual();updateThruster();draw(elapsed);frame=requestAnimationFrame(tick);
}
layout();resetField();menu('Rift Runner','Slide the hovercraft, bump the cones or test both guns on them.','start','Start driving','HOVERCRAFT PLAYGROUND');
frame=requestAnimationFrame(tick);
})();
