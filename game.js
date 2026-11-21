'use strict';
(() => {
const canvas=document.getElementById('game'),hud=document.getElementById('hud'),overlay=document.getElementById('overlay'),resetFieldButton=document.getElementById('reset-field'),shakeSwitch=document.getElementById('screen-shake'),movePad=document.getElementById('move-pad'),aimPad=document.getElementById('aim-pad'),fireButton=document.getElementById('fire-button'),soundSwitch=document.getElementById('sound-on'),soundTest=document.getElementById('test-sound'),engineTest=document.getElementById('test-engine'),gunBlaster=document.getElementById('gun-blaster'),gunBallistic=document.getElementById('gun-ballistic'),phoneTools=document.getElementById('phone-audio-tools'),phoneSwitch=document.getElementById('iphone-audio'),phoneTest=document.getElementById('test-phone-audio'),soundStatus=document.getElementById('sound-status'),aimSwitch=document.getElementById('aim-mode');
if(!canvas||!hud||!overlay)return;
const g=canvas.getContext('2d',{alpha:false});
if(!g){overlay.textContent='This browser cannot display the game canvas.';return;}
const W=480,H=720,TAU=Math.PI*2,arena={left:12,right:468,top:12,bottom:708};
const clamp=(x,a,b)=>Math.min(b,Math.max(a,x)),rand=(a,b)=>a+Math.random()*(b-a);
const motion=window.matchMedia?.('(prefers-reduced-motion: reduce)');
if(shakeSwitch&&motion?.matches)shakeSwitch.checked=false;
motion?.addEventListener?.('change',e=>{if(e.matches&&shakeSwitch)shakeSwitch.checked=false;});
const soundKey='rift-runner.sound.v1';
function preferredSound(){try{const stored=localStorage.getItem(soundKey);if(stored==='on'||stored==='off')return stored==='on';}catch{}return soundSwitch?.checked??true;}
let soundOn=preferredSound(),audio=null,master=null,openingAudio=null,audioParked=false,interruptedRetryAt=-Infinity;
const voices=new Set(),masterLevel=.28;let noiseContext=null,noiseBuffer=null,blaster=null,ballistic=null;
if(soundSwitch)soundSwitch.checked=soundOn;
const audioClock=()=>globalThis.performance?.now?.()??Date.now();
const shotSoundKey='rift-runner.shot-sound.v1';
function preferredShotSound(){try{if(localStorage.getItem(shotSoundKey)==='ballistic')return 'ballistic';}catch{}return 'blaster';}
let shotSound=preferredShotSound(),shotSoundVersion=0;
function showGun(){
 gunBlaster?.setAttribute('aria-pressed',String(shotSound==='blaster'));
 gunBallistic?.setAttribute('aria-pressed',String(shotSound==='ballistic'));
 if(fireButton){
  fireButton.dataset.weapon=shotSound;
  fireButton.setAttribute?.('aria-label',shotSound==='ballistic'?'Fire Ballistic; hold to repeat':'Fire Blaster');
 }
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
 if(!phoneAudioOn){stopNativePreview();releasePhoneAudio();audioStatus(soundOn?'Silent Mode audio off.':'Sound off.');return;}
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
 stopNativePreview();if(openingAudio)openingAudio.ready=null;cancelEngineTest();stopThruster(true);stopEffectVoices();
 if(typeof window.Audio!=='function'){audioStatus('Browser media audio is unavailable here.');return;}
 let preview;
 const failed=()=>{if(!preview||nativePreview===preview){stopNativePreview();audioStatus('Phone audio did not start. Check media volume and output.');}};
 try{
  const element=new window.Audio(shotSound==='ballistic'?'./ballistic-test.mp3':'./blaster-test.mp3');preview={element,timeout:0};nativePreview=preview;
  element.preload='auto';element.loop=false;element.volume=.60;audioStatus('Starting phone audio…');
  element.onended=()=>{if(nativePreview===preview)stopNativePreview();};
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
 if(next===shotSound)return;
 stopBallisticHold();stopNativePreview();shotSound=next;shotSoundVersion++;showGun();
 try{localStorage.setItem(shotSoundKey,shotSound);}catch{}
 audioStatus(soundOn?(shotSound==='ballistic'?'Ballistic selected.':'Blaster selected.'):'Sound off.');
}
for(const [name,button] of [['blaster',gunBlaster],['ballistic',gunBallistic]])button?.addEventListener('click',event=>{
 selectGun(name);
 if(state==='play'&&event.pointerType==='mouse')liveFocus();
});
function shotToken(name){return name==='ballistic'?ballistic:blaster;}
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
}
// A mobile backend can stop output on background even when its JS context
// still reports "running". Retire the graph without starting a replacement.
function retireAudio(){
 const old=audio,out=master;audio=null;master=null;openingAudio=null;
 blaster=null;ballistic=null;noiseContext=null;noiseBuffer=null;
 engineTestUntil=0;stopThruster(true);
 if(out){try{out.gain.value=0;out.disconnect();}catch{}}
 stopEffectVoices();
 if(old?.state!=='closed'&&old?.close){try{Promise.resolve(old.close()).catch(()=>{});}catch{}}
}
function parkAudio(){
 audioParked=true;stopNativePreview();releasePhoneAudio();cancelEngineTest();retireAudio();
 if(state==='play')pause();
}
function showAudioReady(){
 if(!audioParked||document.hidden)return;
 audioParked=false;
 if(soundOn)audioStatus('Ready. Tap Resume flight or a sound test.');
}
function unlockAudio(onReady,event){
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
   interruptedRetryAt=now+420;retireAudio();
  }
  if(audio?.state==='closed')retireAudio();
  if(!audio){
   const AudioCtx=window.AudioContext||window.webkitAudioContext;
   if(!AudioCtx){audioStatus('No audio yet. Web Audio is unavailable here.');return;}
   audio=new AudioCtx();voices.clear();master=audio.createGain();master.gain.value=masterLevel;master.connect(audio.destination);
   const context=audio;context.addEventListener?.('statechange',()=>{
    if(audio!==context||!soundOn)return;
    if(context.state==='running'){
     if(!soundStatus?.textContent.includes('requested in browser.'))audioReady();
    }else audioPending();
   });
  }
  const context=audio;
  if(context.state==='running'){prepareShotSamples(context);audioReady();if(!document.hidden)onReady?.();return;}
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
   if(context.state==='running'){audioReady();if(!document.hidden&&audioClock()<=attempt.testUntil)attempt.ready?.();}
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
 if(soundOn)unlockAudio(undefined,event);else{openingAudio=null;stopNativePreview();releasePhoneAudio();cancelEngineTest();stopThruster(true);audioStatus('Sound off.');}
});
soundTest?.addEventListener('click',event=>{
 const version=shotSoundVersion;
 unlockAudio(()=>{
  if(version!==shotSoundVersion)return;
  const kind=sound('shot');
  if(kind)audioStatus(kind==='recorded'?(shotSound==='ballistic'?'Ballistic requested in browser.':'Custom blaster requested in browser.'):'Selected clip unavailable or loading. Built-in shot requested in browser.');
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
 const token=shotToken(shotSound);
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
  tone('triangle',177,55,.105,.31);cannonCrack();return 'built-in';
 }
 if(kind==='hit')tone('triangle',410,115,.083,.18);
 if(kind==='blast'){tone('sawtooth',145,43,.19,.20);tone('triangle',82,33,.22,.20,.017);}
 if(kind==='damage'){tone('square',218,66,.14,.17);tone('triangle',290,110,.17,.18,.025);}
}
// A single original Web Audio engine voice, separate from the combat voice
// limit. The game requests it for input held, never for residual velocity.
let thruster=null,engineTestUntil=0,engineTestRun=0;
function cancelEngineTest(){engineTestRun++;engineTestUntil=0;}
function holdParam(param,now){
 if(typeof param.cancelAndHoldAtTime==='function'){try{param.cancelAndHoldAtTime(now);return;}catch{}}
 const value=param.value;param.cancelScheduledValues(now);param.setValueAtTime(value,now);
}
function disposeThruster(){
 const voice=thruster;if(!voice)return;thruster=null;
 for(const osc of [voice.hum,voice.grit]){try{osc.stop();}catch{}try{osc.disconnect();}catch{}}
 for(const node of [voice.filter,voice.blend,voice.out]){try{node.disconnect();}catch{}}
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
function startThruster(){
 if(thruster&&thruster.context!==audio)disposeThruster();
 if(thruster?.driving)return;
 if(thruster){
  // Quick re-engagement rejoins sustain rather than retriggering ignition.
  const voice=thruster,t=voice.context.currentTime;
  try{holdParam(voice.out.gain,t);voice.out.gain.setTargetAtTime(.122,t,.045);voice.driving=true;return;}catch{disposeThruster();}
 }
 let hum,grit,blend,filter,out;
 try{
  const context=audio,t=context.currentTime;
  hum=context.createOscillator();grit=context.createOscillator();blend=context.createGain();filter=context.createBiquadFilter();out=context.createGain();
  hum.type='triangle';grit.type='sawtooth';blend.gain.value=.24;filter.type='lowpass';
  hum.frequency.setValueAtTime(86,t);hum.frequency.linearRampToValueAtTime(124,t+.18);hum.frequency.setTargetAtTime(109,t+.18,.12);
  grit.frequency.setValueAtTime(42,t);grit.frequency.linearRampToValueAtTime(59,t+.17);grit.frequency.setTargetAtTime(52,t+.17,.13);
  filter.frequency.setValueAtTime(160,t);filter.frequency.linearRampToValueAtTime(340,t+.18);filter.frequency.setTargetAtTime(280,t+.18,.14);
  out.gain.setValueAtTime(0,t);out.gain.linearRampToValueAtTime(.154,t+.17);out.gain.setTargetAtTime(.122,t+.17,.13);
  hum.connect(filter);grit.connect(blend);blend.connect(filter);filter.connect(out);out.connect(master);
  hum.start(t);grit.start(t);
  thruster={context,hum,grit,blend,filter,out,driving:true,releaseAt:0};
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
 if(flight||engineTestUntil>audioClock()){startThruster();return;}
 stopThruster();
 if(thruster&&!thruster.driving&&audioClock()>=thruster.releaseAt)disposeThruster();
}
engineTest?.addEventListener('click',event=>{
 const run=++engineTestRun;
 unlockAudio(()=>{
  if(run!==engineTestRun||document.hidden||!soundOn)return;
  engineTestUntil=audioClock()+850;updateThruster();
  if(thruster?.driving)audioStatus('Engine test requested in browser.');
 },event);
});
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
 if(nearest&&autoLock&&cones.includes(autoLock)&&distance(autoLock)<=best*1.30)return autoLock;
 autoLock=nearest;return nearest;
}
function aimForTouchAssist(){
 const target=autoTarget();if(target)p.aim=Math.atan2(target.y-p.y,target.x-p.x);
 return target;
}
const stars=Array.from({length:150},(_,i)=>({x:(i*107+i*i*11)%W,y:(i*173+i*i*7)%H,r:i%17===0?1.65:i%3===0?1.04:.44,d:18+(i%13)*7,h:i%5===0?'#67c3d6':i%7===0?'#b853c2':'#b4d1ed'}));
let state='menu',p,elapsed=0,last=0,shake=0,frame=0,movePtr=null,moveKey=null,movePulse=null,heldMove=null,aimPtr=null,scale=1,dx=0,dy=0,cssScale=1,viewW=1,viewH=1,hiDpi=1;
let shots=[],cones=[],sparks=[],rings=[],recoil=0,practiceHits=0,practiceShots=0,hudKey='',hudNumbers=null;
let ballisticHold=null,skipBallisticClick=null;
const ballisticInterval=.25;
const kick=amount=>{shake=Math.max(shake,amount);};
const keys=new Set();
const has=(...a)=>a.some(k=>keys.has(k));
const trail=['#68ffe0','#97f5f3','#c6e0ff'];
function updateHud(){
 const speed=p?Math.round(Math.hypot(p.vx,p.vy)/5)*5:0,values=[cones.length,speed,practiceHits,practiceShots];
 const key=values.join(':');if(key===hudKey)return;hudKey=key;
 if(!hudNumbers){
  hud.innerHTML=['CONES','SPEED','HITS','SHOTS'].map(name=>'<span class="rift-stat">'+name+' <b data-field-number></b></span>').join('')+
   (resetFieldButton?'':'<button id="reset-field" class="rift-reset" type="button">Reset field</button>');
  hudNumbers=Array.from(hud.querySelectorAll('[data-field-number]'));
 }
 hudNumbers.forEach((node,i)=>{node.textContent=String(values[i]);});
}
function button(label,action,id=''){return '<button type="button" class="rift-action" data-rift="'+action+'"'+(id?' id="'+id+'"':'')+'>'+label+'</button>';}
function menu(title,copy,action,label,kicker){
 overlay.hidden=false;overlay.innerHTML='<p class="rift-kicker">'+kicker+'</p><h2>'+title+'</h2><p>'+copy+'</p>'+button(label,action,action==='start'?'start':'');
}
function clearInput(){
 stopBallisticHold();stopNativePreview();cancelEngineTest();stopThruster();
 const release=[[movePad,movePtr?.id],[aimPad,aimPtr?.id]];
 keys.clear();movePtr=null;moveKey=null;movePulse=null;aimPtr=null;autoLock=null;
 paintMove();showStick(aimPad);
 for(const [pad,id] of release)if(id!==null&&id!==undefined){try{pad?.releasePointerCapture?.(id);}catch{}}
}
function liveFocus(){canvas.focus({preventScroll:true});}
const coneLayout=[[116,133],[235,104],[362,144],[148,258],[336,262],[245,345],[108,449],[367,467]];
function resetField(){
 clearInput();aimManuallyPlaced=false;p={x:W/2,y:H*.79,r:17,aim:-Math.PI/2,vx:0,vy:0,speed:222,inv:0,invMass:.32,spin:0,wallFx:0,craft:true};
 cones=coneLayout.map(([x,y],i)=>({id:i+1,x,y,r:15,vx:0,vy:0,angle:(i*.79)%TAU,spin:0,hitGlow:0,wallFx:0,invMass:1}));
 shots=[];sparks=[];rings=[];practiceHits=0;practiceShots=0;recoil=0;shake=0;hudKey='';updateHud();
}
function start(){resetField();state='play';overlay.hidden=true;liveFocus();}
const restart=event=>{unlockAudio(undefined,event);start();};
resetFieldButton?.addEventListener('click',restart);
if(!resetFieldButton)hud.addEventListener('click',event=>{if(event.target.closest('#reset-field'))restart(event);});
function pause(){
 if(state==='pause'){state='play';overlay.hidden=true;liveFocus();return;}
 if(state!=='play')return;
 state='pause';clearInput();menu('Flight paused','Your ship is holding its position.','resume','Resume flight','RUN PAUSED');
 overlay.querySelector('button')?.focus({preventScroll:true});
}
overlay.addEventListener('click',ev=>{
 const bt=ev.target.closest('[data-rift]');if(!bt)return;
 const a=bt.dataset.rift;
 if(a!=='start'&&a!=='resume')return;
 if(ev.pointerType==='touch'||ev.pointerType==='pen')inputSource(true);else if(ev.pointerType==='mouse')inputSource(false);
 if(a==='start'&&state==='menu'){unlockAudio(undefined,ev);start();}
 else if(a==='resume'&&state==='pause'){unlockAudio(undefined,ev);pause();}
});
const keyAim=()=>[Number(has('ArrowRight'))-Number(has('ArrowLeft')),Number(has('ArrowDown'))-Number(has('ArrowUp'))];
const flightKeys=new Set(['KeyA','KeyW','KeyD','KeyS','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space']);
window.addEventListener('keydown',e=>{
 if(['Digit1','Digit2'].includes(e.code)&&!e.repeat&&!e.ctrlKey&&!e.metaKey&&!e.altKey&&state==='play'){
  const active=document.activeElement;
  if(active===canvas||active===gunBlaster||active===gunBallistic){e.preventDefault();selectGun(e.code==='Digit2'?'ballistic':'blaster');return;}
 }
 if(['Escape','KeyP'].includes(e.code)&&!e.repeat&&['play','pause'].includes(state)){e.preventDefault();pause();return;}
 if(state==='play'&&e.code==='Space'&&shotSound==='ballistic'&&(document.activeElement===canvas||document.activeElement===fireButton)){
  e.preventDefault();
  if(!e.repeat){inputSource(document.activeElement===fireButton);unlockAudio(undefined,e);startBallisticHold('key');}
  return;
 }
 if(state!=='play'||!flightKeys.has(e.code)||e.code==='Space'&&document.activeElement!==canvas)return;
 e.preventDefault();inputSource(false);if(!e.repeat)unlockAudio(undefined,e);keys.add(e.code);
 if(!aimPtr&&e.code.startsWith('Arrow')){const [x,y]=keyAim();if(x||y)p.aim=Math.atan2(y,x);}
 if(!e.repeat&&e.code==='Space')fireShot();
},{passive:false});
window.addEventListener('keyup',e=>{
 if(e.code==='Space'&&ballisticHold?.kind==='key'){e.preventDefault();stopBallisticHold();}
 keys.delete(e.code);
});
window.addEventListener('blur',()=>{clearInput();if(state==='play')pause();});
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
 const update=e=>{
  const v=stickVector(aimPad,e);showStick(aimPad,v);
  if(v.angle!==null){aimManuallyPlaced=true;autoLock=null;p.aim=v.angle;}
 };
 aimPad.addEventListener('pointerdown',e=>{
  if(state!=='play'||e.button>0||aimPtr||movePtr?.id===e.pointerId||heldFirePointer(e.pointerId))return;
  e.preventDefault();inputSource(true);capture(aimPad,e);aimPtr={id:e.pointerId};update(e);
 });
 aimPad.addEventListener('pointermove',e=>{
  if(state!=='play'||aimPtr?.id!==e.pointerId)return;
  e.preventDefault();update(e);
 });
 for(const event of ['pointercancel','pointerup','lostpointercapture'])aimPad.addEventListener(event,e=>{
  if(aimPtr?.id!==e.pointerId)return;
  if(event==='pointerup'&&state==='play')unlockAudio(undefined,e);
  aimPtr=null;showStick(aimPad);
 });
}
fireButton?.addEventListener('keydown',e=>{
 if(e.repeat&&['Enter','Space'].includes(e.code))e.preventDefault();
});
function heldFirePointer(id){return ballisticHold?.kind==='pointer'&&ballisticHold.id===id;}
function stopBallisticHold(){
 const hold=ballisticHold;ballisticHold=null;
 if(hold?.kind==='pointer'){
  if(skipBallisticClick?.id===hold.id)skipBallisticClick.until=audioClock()+1500;
  try{fireButton?.releasePointerCapture?.(hold.id);}catch{}
 }
}
function startBallisticHold(kind,id=null){
 if(ballisticHold||state!=='play'||shotSound!=='ballistic'||document.hidden)return false;
 ballisticHold={kind,id,wait:ballisticInterval};fireShot();return true;
}
for(const node of [canvas,fireButton])node?.addEventListener('blur',()=>{if(ballisticHold?.kind==='key')stopBallisticHold();});
fireButton?.addEventListener('pointerdown',e=>{
 if(skipBallisticClick&&(skipBallisticClick.id===e.pointerId||!ballisticHold))skipBallisticClick=null;
 if(state!=='play'||shotSound!=='ballistic'||e.button!==0||ballisticHold||movePtr?.id===e.pointerId||aimPtr?.id===e.pointerId)return;
 e.preventDefault();
 inputSource(true);unlockAudio(undefined,e);
 if(startBallisticHold('pointer',e.pointerId)){
  skipBallisticClick={id:e.pointerId,until:audioClock()+1500};
  capture(fireButton,e);
 }
});
for(const event of ['pointerup','pointercancel','lostpointercapture'])fireButton?.addEventListener(event,e=>{
 if(ballisticHold?.kind!=='pointer'||ballisticHold.id!==e.pointerId)return;
 if(event==='pointerup'){unlockAudio(undefined,e);if(skipBallisticClick)skipBallisticClick.until=audioClock()+1500;}
 stopBallisticHold();
});
fireButton?.addEventListener('click',e=>{
 // WebKit may send MouseEvent click with no matching pointer ID; a real
 // next press clears this token on pointerdown. Keyboard clicks have detail 0.
 if(e?.detail>0&&skipBallisticClick&&audioClock()<=skipBallisticClick.until)return;
 if(state!=='play'||ballisticHold)return;
 inputSource(true);unlockAudio(undefined,e);fireShot();
});
canvas.addEventListener('pointerdown',e=>{
 if(state!=='play'||e.pointerType!=='mouse'||e.button!==0)return;
 const q=fieldPoint(e);e.preventDefault();inputSource(false);liveFocus();unlockAudio(undefined,e);
 if(!aimPtr)p.aim=angleTo(q.x,q.y);fireShot();
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
const guns={
 blaster:{speed:570,recoil:30,kick:.145,push:.286,pushMax:245,muzzle:13,edge:'#32a786',core:'#d4fff1',hit:'#d0fff2',ring:'#99ffe0'},
 ballistic:{speed:570,recoil:50,kick:.185,push:.422,pushMax:335,muzzle:17,edge:'#f49a31',core:'#fff4b8',hit:'#ffd387',ring:'#ffbc63'}
};
function fireShot(){
 if(state!=='play'||document.hidden)return;
 aimForTouchAssist();
 const a=p.aim,ux=Math.cos(a),uy=Math.sin(a),x=p.x+ux*(p.r+4),y=p.y+uy*(p.r+4);
 const weapon=shotSound,gun=guns[weapon];
 shots.push({x,y,vx:ux*gun.speed,vy:uy*gun.speed,a,weapon});
 p.vx-=ux*gun.recoil;p.vy-=uy*gun.recoil;capVelocity(p,255);practiceShots++;updateHud();
 sound('shot');recoil=gun.kick;kick(gun.kick);burstRing(x,y,gun.muzzle,gun.ring);
}
function wall(body){
 const l=arena.left+body.r,r=arena.right-body.r,t=arena.top+body.r,b=arena.bottom-body.r;
 let impulse=0;
 if(body.x<l||body.x>r){const sign=body.x<l?-1:1;body.x=clamp(body.x,l,r);if(body.vx*sign>0){impulse=Math.max(impulse,Math.abs(body.vx));body.vx=body.craft?0:-body.vx*.39;if(!body.craft)body.spin+=body.vy*sign*.014;}}
 if(body.y<t||body.y>b){const sign=body.y<t?-1:1;body.y=clamp(body.y,t,b);if(body.vy*sign>0){impulse=Math.max(impulse,Math.abs(body.vy));body.vy=body.craft?0:-body.vy*.39;if(!body.craft)body.spin-=body.vx*sign*.014;}}
 if(impulse>105&&body.wallFx<=0){body.wallFx=.23;blast(body.x,body.y,'#ffc390',4,.56);if(!body.craft)body.hitGlow=Math.max(body.hitGlow,.20);}
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
function sweepShots(dt){
 for(const b of shots){
  const dx=b.vx*dt,dy=b.vy*dt;
  let hit=null,earliest=Infinity;
  for(const cone of cones){
   const t=sweptCircle(b.x-cone.prevX,b.y-cone.prevY,dx-(cone.x-cone.prevX),dy-(cone.y-cone.prevY),cone.r+2);
   if(t!==null&&t<earliest){hit=cone;earliest=t;}
  }
  if(hit){
   b.x+=dx*earliest;b.y+=dy*earliest;b.spent=true;
   const ux=Math.cos(b.a),uy=Math.sin(b.a),cx=hit.prevX+(hit.x-hit.prevX)*earliest,cy=hit.prevY+(hit.y-hit.prevY)*earliest;
   const gun=guns[b.weapon]||guns.blaster; // Impact uses the gun frozen at launch.
   const force=clamp(((b.vx-hit.vx)*ux+(b.vy-hit.vy)*uy)*gun.push,35,gun.pushMax);
   hit.vx+=ux*force;hit.vy+=uy*force;capVelocity(hit,340);
   hit.spin=clamp(hit.spin+((b.x-cx)*uy-(b.y-cy)*ux)*force*.00233,-15,15);
   const heavy=b.weapon==='ballistic';
   hit.hitGlow=.46;practiceHits++;sound('hit');blast(b.x,b.y,gun.hit,heavy?15:12,heavy?1:.83);burstRing(b.x,b.y,heavy?26:20,gun.ring);kick(heavy?.13:.10);
  }else{b.x+=dx;b.y+=dy;}
 }
 shots=shots.filter(b=>!b.spent&&b.y>=arena.top&&b.y<=arena.bottom&&b.x>=arena.left&&b.x<=arena.right);
}
function physics(dt,moveX,moveY){
 const m=Math.max(1,Math.hypot(moveX,moveY));
 if(moveX||moveY){
  const dx=moveX/m*p.speed-p.vx,dy=moveY/m*p.speed-p.vy,change=Math.hypot(dx,dy),blend=change?Math.min(1,1750*dt/change):0;
  p.vx+=dx*blend;p.vy+=dy*blend;
 }else{const fade=Math.exp(-2.8*dt);p.vx*=fade;p.vy*=fade;}
 p.x+=p.vx*dt;p.y+=p.vy*dt;p.wallFx=Math.max(0,p.wallFx-dt);wall(p);
 for(const c of cones){
  c.prevX=c.x;c.prevY=c.y;c.wallFx=Math.max(0,c.wallFx-dt);c.hitGlow=Math.max(0,c.hitGlow-dt);
  const fade=Math.exp(-1.45*dt);c.vx*=fade;c.vy*=fade;c.spin*=Math.exp(-1.60*dt);
  c.x+=c.vx*dt;c.y+=c.vy*dt;c.angle=(c.angle+c.spin*dt)%TAU;wall(c);
 }
 for(let pass=0;pass<3;pass++){
  for(const c of cones)contact(p,c,pass===0);
  for(let i=0;i<cones.length;i++)for(let j=i+1;j<cones.length;j++)contact(cones[i],cones[j],pass===0);
  wall(p);for(const c of cones)wall(c);
 }
 sweepShots(dt);
}
function simulate(dt){
 const move=movePtr??moveKey??movePulse;
 const x=move?.x??(Number(has('KeyD'))-Number(has('KeyA'))),y=move?.y??(Number(has('KeyS'))-Number(has('KeyW')));
 if(movePtr)movePtr.held+=dt;else if(moveKey)moveKey.held+=dt;
 if(movePulse){movePulse.left-=dt;if(movePulse.left<=0){movePulse=null;paintMove();}}
 if(dt>0){const steps=Math.ceil(dt/.009);for(let i=0;i<steps;i++)physics(dt/steps,x,y);}
 if(!aimForTouchAssist()&&!aimPtr){const [ax,ay]=keyAim();if(ax||ay)p.aim=Math.atan2(ay,ax);}
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
 if(state==='play'&&recoil>0){
  g.globalAlpha=Math.min(1,recoil*13);g.lineWidth=0;g.fillStyle='#ffab49';
  poly([[0,-47],[-4,-35],[-12,-32],[-4,-28],[-2,-21],[2,-21],[4,-28],[12,-32],[4,-35]]);
  g.fillStyle='#fff3ce';poly([[0,-42],[-4,-31],[0,-24],[4,-31]]);
 }
 g.restore();
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
 if(p)paintHover(p.x,p.y,p.aim,t);
 for(const b of shots){
  const gun=guns[b.weapon]||guns.blaster,heavy=b.weapon==='ballistic';
  g.save();g.translate(b.x,b.y);g.rotate(b.a);
  g.fillStyle=gun.edge;g.fillRect(heavy?-24:-16,-2,heavy?28:20,4);
  g.fillStyle=gun.core;g.fillRect(heavy?-13:-10,-1,heavy?18:15,2);
  if(heavy){g.fillStyle=gun.edge;g.fillRect(-33,-1,5,2);}
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
   if(ballisticHold){
    ballisticHold.wait-=dt;
    if(ballisticHold.wait<=0){ballisticHold.wait=ballisticInterval;fireShot();}
   }
  }
  for(const z of sparks){z.x+=z.dx*dt;z.y+=z.dy*dt;z.life-=dt;}
  sparks=sparks.filter(z=>z.life>0);
  for(const r of rings)r.life-=dt;rings=rings.filter(r=>r.life>0);
 }
 updateThruster();draw(elapsed);frame=requestAnimationFrame(tick);
}
layout();resetField();menu('Rift Runner','Slide the hovercraft, bump the cones or test both guns on them.','start','Start driving','HOVERCRAFT PLAYGROUND');
frame=requestAnimationFrame(tick);
})();
