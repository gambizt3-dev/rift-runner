'use strict';
(() => {
const canvas=document.getElementById('game'),hud=document.getElementById('hud'),overlay=document.getElementById('overlay'),shakeSwitch=document.getElementById('screen-shake'),movePad=document.getElementById('move-pad'),aimPad=document.getElementById('aim-pad'),fireButton=document.getElementById('fire-button'),soundSwitch=document.getElementById('sound-on'),soundTest=document.getElementById('test-sound'),engineTest=document.getElementById('test-engine'),soundStatus=document.getElementById('sound-status'),aimSwitch=document.getElementById('aim-mode'),deck=document.getElementById('flight-deck'),touchHelp=document.getElementById('touch-help');
if(!canvas||!hud||!overlay)return;
const g=canvas.getContext('2d',{alpha:false});
if(!g){overlay.textContent='This browser cannot display the game canvas.';return;}
const W=480,H=720,save='rift-runner.high-score.v1',TAU=Math.PI*2;
const clamp=(x,a,b)=>Math.min(b,Math.max(a,x)),rand=(a,b)=>a+Math.random()*(b-a);
const past=()=>{try{const x=Number(localStorage.getItem(save));return Number.isSafeInteger(x)&&x>=0?x:0;}catch{return 0;}};
const motion=window.matchMedia?.('(prefers-reduced-motion: reduce)');
if(shakeSwitch&&motion?.matches)shakeSwitch.checked=false;
motion?.addEventListener?.('change',e=>{if(e.matches&&shakeSwitch)shakeSwitch.checked=false;});
const soundKey='rift-runner.sound.v1';
function preferredSound(){try{const stored=localStorage.getItem(soundKey);if(stored==='on'||stored==='off')return stored==='on';}catch{}return soundSwitch?.checked??true;}
let soundOn=preferredSound(),audio=null,master=null,openingAudio=null;
const voices=new Set(),masterLevel=.28;let noiseContext=null,noiseBuffer=null,blaster=null;
if(soundSwitch)soundSwitch.checked=soundOn;
const audioClock=()=>globalThis.performance?.now?.()??Date.now();
function audioStatus(text){if(soundStatus&&soundStatus.textContent!==text)soundStatus.textContent=text;}
const audioReady=()=>audioStatus('Audio active in browser.');
const audioPending=()=>audioStatus('No audio yet. Tap a test button again.');
audioStatus(soundOn?'Ready. Tap Test blaster or Test engine.':'Sound off.');
function prepareBlaster(context){
 if(blaster?.context===context)return;
 const token={context,buffer:null};blaster=token;
 const encoded=window.RIFT_BLASTER_MP3_BASE64;
 if(typeof encoded!=='string'||encoded.length<8||encoded.length>1500000||typeof context.decodeAudioData!=='function')return;
 try{
  const bytes=Uint8Array.from(atob(encoded),byte=>byte.charCodeAt(0));
  let settled=false;
  const complete=buffer=>{
   if(settled)return;settled=true;
   if(blaster===token&&audio===context&&Number.isFinite(buffer?.duration)&&buffer.duration>0&&buffer.duration<=2)token.buffer=buffer;
  };
  const fail=()=>{settled=true;};
  // Some WebKit versions use callbacks; modern ones also return a promise.
  // Call decode exactly once and fence completion from a replaced context.
  const pending=context.decodeAudioData(bytes.buffer,complete,fail);
  if(pending&&typeof pending.then==='function')pending.then(complete,fail);
 }catch{} // Missing, late or unsupported data keeps the synthesized cannon.
}
function unlockAudio(onReady){
 if(!soundOn){audioStatus('Sound off. Turn Sound on to test.');return;}
 let attempt;
 try{
  if(!audio||audio.state==='closed'){
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
  if(context.state==='running'){prepareBlaster(context);audioReady();if(!document.hidden)onReady?.();return;}
  const now=audioClock();
  if(openingAudio?.context===context&&now<openingAudio.until){
   if(onReady){openingAudio.ready=onReady;openingAudio.testUntil=now+1100;}
   return;
  }
  // A previous resume() may never settle on iOS. Let a later real gesture
  // retry the same context without a timer that tries to start audio itself.
  attempt={context,until:now+420,ready:onReady,testUntil:onReady?now+1100:0};
  openingAudio=attempt;audioPending();
  const resumed=context.resume();prepareBlaster(context);
  Promise.resolve(resumed).then(()=>{
   if(openingAudio!==attempt||audio!==context||!soundOn)return;
   if(context.state==='running'){audioReady();if(!document.hidden&&audioClock()<=attempt.testUntil)attempt.ready?.();}
   else audioPending();
  },()=>{if(openingAudio===attempt&&soundOn)audioPending();}).finally(()=>{
   if(openingAudio===attempt)openingAudio=null;
  });
 }catch{if(openingAudio===attempt)openingAudio=null;audioPending();}
}
soundSwitch?.addEventListener('change',()=>{
 soundOn=soundSwitch.checked;
 try{localStorage.setItem(soundKey,soundOn?'on':'off');}catch{}
 if(master){try{master.gain.value=soundOn?masterLevel:0;}catch{}}
 if(soundOn)unlockAudio();else{openingAudio=null;cancelEngineTest();stopThruster(true);audioStatus('Sound off.');}
});
soundTest?.addEventListener('click',()=>unlockAudio(()=>{
 const kind=sound('shot');
 if(kind)audioStatus(kind==='recorded'?'Custom blaster requested in browser.':'Built-in blaster requested in browser.');
}));
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
function playBlaster(){
 const buffer=blaster?.context===audio?blaster.buffer:null;
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
 if(kind==='shot'){
  if(!soundOn||!master||audio?.state!=='running'||voices.size>=11||document.hidden)return null;
  if(playBlaster())return 'recorded';
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
 if(!soundOn||document.hidden||audio?.state!=='running'||!master){stopThruster(true);return;}
 const input=movePtr??moveKey;
 const flight=state==='play'&&(input?(input.x!==0||input.y!==0):has('KeyA')!==has('KeyD')||has('KeyW')!==has('KeyS'));
 if(flight||engineTestUntil>audioClock()){startThruster();return;}
 stopThruster();
 if(thruster&&!thruster.driving&&audioClock()>=thruster.releaseAt)disposeThruster();
}
engineTest?.addEventListener('click',()=>{
 const run=++engineTestRun;
 unlockAudio(()=>{
  if(run!==engineTestRun||document.hidden||!soundOn)return;
  engineTestUntil=audioClock()+850;updateThruster();
  if(thruster?.driving)audioStatus('Engine test requested in browser.');
 });
});
const aimKey='rift-runner.aim-mode.v1';
function preferredAim(){try{const stored=localStorage.getItem(aimKey);if(stored==='manual'||stored==='auto')return stored==='auto';}catch{}return true;}
let autoAim=preferredAim(),touchPilot=false,autoLock=null;
const usingAutoAim=()=>autoAim&&touchPilot;
function selectInput(touch){if(touchPilot!==touch){touchPilot=touch;autoLock=null;}}
function showAimMode(){
 if(aimSwitch)aimSwitch.checked=autoAim;
 if(deck)deck.dataset.mode=autoAim?'auto':'manual';
 if(touchHelp)touchHelp.textContent=autoAim?'Hold a direction to steer. Tap FIRE for one shot. Auto Aim only tracks.':'Hold a direction to steer. Drag to aim and release for one shot. Tap the centre to shoot straight ahead.';
}
showAimMode();
aimSwitch?.addEventListener('change',()=>{
 autoAim=aimSwitch.checked;autoLock=null;
 const old=aimPtr;aimPtr=null;showStick(aimPad);
 if(old){try{aimPad?.releasePointerCapture?.(old.id);}catch{}}
 try{localStorage.setItem(aimKey,autoAim?'auto':'manual');}catch{}
 showAimMode();
});
const stars=Array.from({length:150},(_,i)=>({x:(i*107+i*i*11)%W,y:(i*173+i*i*7)%H,r:i%17===0?1.65:i%3===0?1.04:.44,d:18+(i%13)*7,h:i%5===0?'#67c3d6':i%7===0?'#b853c2':'#b4d1ed'}));
let best=past(),state='menu',p,wave,score,remaining,spawnIn,elapsed=0,last=0,flash=0,shake=0,frame=0,nextWaveIn=0,waveCue=0,movePtr=null,moveKey=null,movePulse=null,heldMove=null,aimPtr=null,scale=1,dx=0,dy=0,cssScale=1,viewW=1,viewH=1,hiDpi=1;
let shots=[],foeShots=[],foes=[],sparks=[],rings=[],recoil=0;
const kick=amount=>{shake=Math.max(shake,amount);};
const keys=new Set();
const has=(...a)=>a.some(k=>keys.has(k));
const fmt=n=>Math.floor(n).toLocaleString('en-AU');
const trail=['#68ffe0','#97f5f3','#c6e0ff'];
function updateHud(){
 hud.innerHTML='<span class="rift-stat">WAVE <b>'+String(wave??1).padStart(2,'0')+'</b></span><span class="rift-stat">HULL <b>'+(p?p.hp+' / '+p.max:'4 / 4')+'</b></span><span class="rift-stat">SCORE <b>'+fmt(score??0)+'</b></span><span class="rift-stat">BEST <b>'+fmt(best)+'</b></span>';
}
function button(label,action,id=''){return '<button type="button" class="rift-action" data-rift="'+action+'"'+(id?' id="'+id+'"':'')+'>'+label+'</button>';}
function menu(title,copy,action,label,kicker){
 overlay.hidden=false;overlay.innerHTML='<p class="rift-kicker">'+kicker+'</p><h2>'+title+'</h2><p>'+copy+'</p>'+button(label,action,action==='start'?'start':'');
}
function clearInput(){
 cancelEngineTest();stopThruster();
 const release=[[movePad,movePtr?.id],[aimPad,aimPtr?.id]];
 keys.clear();movePtr=null;moveKey=null;movePulse=null;aimPtr=null;autoLock=null;
 paintMove();showStick(aimPad);
 for(const [pad,id] of release)if(id!==null&&id!==undefined){try{pad?.releasePointerCapture?.(id);}catch{}}
}
function record(){if(score>best){best=score;try{localStorage.setItem(save,String(best));}catch{}}}
function liveFocus(){canvas.focus({preventScroll:true});}
function start(){
 p={x:W/2,y:H*.82,hp:4,max:4,speed:245,damage:1,inv:0,vx:0,vy:0,aim:-Math.PI/2};
 score=0;wave=1;elapsed=0;flash=0;shake=0;recoil=0;clearInput();
 beginWave();liveFocus();
}
function beginWave(){
 remaining=Math.min(30,5+wave*2);spawnIn=.25;shots=[];foeShots=[];foes=[];sparks=[];rings=[];autoLock=null;
 p.inv=Math.max(.4,p.inv);recoil=0;nextWaveIn=0;waveCue=1.25;state='play';overlay.hidden=true;updateHud();
}
function dead(){
 state='dead';p.hp=0;record();clearInput();updateHud();
 menu('Signal lost','You reached wave '+wave+' with '+fmt(score)+' points.','start','Try again','RUN COMPLETE');
 overlay.querySelector('button')?.focus({preventScroll:true});
}
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
 if(ev.pointerType==='touch'||ev.pointerType==='pen')selectInput(true);else if(ev.pointerType==='mouse')selectInput(false);
 if(a==='start'&&['menu','dead'].includes(state)){unlockAudio();start();}
 else if(a==='resume'&&state==='pause'){unlockAudio();pause();}
});
const keyAim=()=>[Number(has('ArrowRight'))-Number(has('ArrowLeft')),Number(has('ArrowDown'))-Number(has('ArrowUp'))];
const flightKeys=new Set(['KeyA','KeyW','KeyD','KeyS','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space']);
window.addEventListener('keydown',e=>{
 if(['Escape','KeyP'].includes(e.code)&&!e.repeat&&['play','pause'].includes(state)){e.preventDefault();pause();return;}
 if(state!=='play'||!flightKeys.has(e.code)||e.code==='Space'&&document.activeElement!==canvas)return;
 e.preventDefault();selectInput(false);if(!e.repeat)unlockAudio();keys.add(e.code);
 if(e.code.startsWith('Arrow')){const [x,y]=keyAim();if(x||y)p.aim=Math.atan2(y,x);}
 if(!e.repeat&&e.code==='Space')fireShot();
},{passive:false});
window.addEventListener('keyup',e=>keys.delete(e.code));
window.addEventListener('blur',()=>{clearInput();if(state==='play')pause();});
document.addEventListener('visibilitychange',()=>{if(document.hidden){if(openingAudio)openingAudio.ready=null;cancelEngineTest();stopThruster(true);if(state==='play')pause();}});
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
  if(state!=='play'||e.button>0||!button||movePtr||aimPtr?.id===e.pointerId)return;
  e.preventDefault();selectInput(true);unlockAudio();capture(movePad,e);movePulse=null;
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
  if(event==='pointerup'&&pressed.button&&pressed.held===0)movePulse={...moveValue(pressed.button),left:.065};
  paintMove();
 });
 movePad.addEventListener('keydown',e=>{
  const button=moveButton(e.target);
  if(state!=='play'||!button||!['Space','Enter'].includes(e.code))return;
  e.preventDefault();if(moveKey||e.repeat)return;
  selectInput(true);unlockAudio();movePulse=null;moveKey={code:e.code,held:0,...moveValue(button)};paintMove();
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
  selectInput(true);unlockAudio();movePulse={...moveValue(button),left:.065};paintMove();
 });
}
if(aimPad){
 const update=e=>{
  const v=stickVector(aimPad,e);Object.assign(aimPtr,v);showStick(aimPad,v);
  if(v.angle!==null)p.aim=v.angle;
 };
 aimPad.addEventListener('pointerdown',e=>{
  if(state!=='play'||e.button>0||autoAim||aimPtr||movePtr?.id===e.pointerId)return;
  e.preventDefault();selectInput(true);unlockAudio();capture(aimPad,e);
  aimPtr={id:e.pointerId};update(e);
 });
 aimPad.addEventListener('pointermove',e=>{
  if(state!=='play'||aimPtr?.id!==e.pointerId)return;
  e.preventDefault();update(e);
 });
 for(const event of ['pointercancel','pointerup','lostpointercapture'])aimPad.addEventListener(event,e=>{
  if(aimPtr?.id!==e.pointerId)return;
  if(event==='pointerup'&&state==='play'){
   unlockAudio();fireShot();
  }
  aimPtr=null;showStick(aimPad);
 });
 // Keyboard and assistive button activation, separate from pointer releases.
 aimPad.addEventListener('click',e=>{
  if(e.detail!==0||aimPtr||autoAim||state!=='play')return;
  selectInput(true);unlockAudio();fireShot();
 });
}
for(const trigger of [aimPad,fireButton])trigger?.addEventListener('keydown',e=>{
 if(e.repeat&&['Enter','Space'].includes(e.code))e.preventDefault();
});
fireButton?.addEventListener('click',()=>{
 if(state!=='play'||!autoAim)return;
 selectInput(true);unlockAudio();fireShot();
});
canvas.addEventListener('pointerdown',e=>{
 if(state!=='play'||e.pointerType!=='mouse'||e.button!==0)return;
 const q=fieldPoint(e);e.preventDefault();selectInput(false);liveFocus();unlockAudio();
 p.aim=angleTo(q.x,q.y);fireShot();
});
canvas.addEventListener('pointermove',e=>{
 if(state!=='play'||e.pointerType!=='mouse'||aimPtr||usingAutoAim())return;
 const q=fieldPoint(e);p.aim=angleTo(q.x,q.y);
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
function enter(){
 const tank=(remaining+wave)%3===0,seed=rand(0,TAU),x=rand(45,W-45),hp=tank?3+Math.floor(wave/4):1+Math.floor(wave/7);
 foes.push({x,y:-25,center:x,seed,age:0,next:rand(1.05,2),tank,hp,max:hp,r:tank?19:13,speed:tank?38+wave*2:65+wave*4});
}
const hit=(a,b,r)=>Math.hypot(a.x-b.x,a.y-b.y)<r;
function damage(x,y){
 if(!p||p.inv>0)return;
 p.hp--;p.inv=.85;flash=.22;kick(.28);sound('damage');blast(x,y,'#ff79b1',26,1.2);burstRing(x,y,25,'#ff81ab');
 updateHud();if(p.hp===0)dead();
}
function pew(f){
 const a=Math.atan2(p.y-f.y,p.x-f.x),fan=f.tank?[-.26,0,.26]:[0];
 for(const t of fan){
  const v=Math.min(f.tank?210+wave*8:150+wave*8,350);
  foeShots.push({x:f.x,y:f.y+9,vx:Math.cos(a+t)*v,vy:Math.sin(a+t)*v,heavy:f.tank});
 }
}
function autoTarget(){
 if(!usingAutoAim()){autoLock=null;return null;}
 const visible=f=>f.hp>0&&f.y>=0&&f.y<=H&&f.x>=0&&f.x<=W;
 const distance=f=>(f.x-p.x)**2+(f.y-p.y)**2;
 let nearest=null,bestDistance=Infinity;
 for(const f of foes)if(visible(f)){const gap=distance(f);if(gap<bestDistance){nearest=f;bestDistance=gap;}}
 // Keep the live lock if it is within ~14% of the nearest distance.
 if(nearest&&autoLock&&visible(autoLock)&&foes.includes(autoLock)&&distance(autoLock)<=bestDistance*1.30)return autoLock;
 autoLock=nearest;return autoLock;
}
// Only explicit input events can call this. Aiming never pulls the trigger.
function fireShot(){
 if(state!=='play'||document.hidden)return;
 const target=autoTarget();
 if(target)p.aim=Math.atan2(target.y-p.y,target.x-p.x);
 const a=p.aim,ux=Math.cos(a),uy=Math.sin(a),x=p.x+ux*20,y=p.y+uy*20;
 shots.push({x,y,vx:ux*480,vy:uy*480,a,d:p.damage});
 sound('shot');recoil=.145;kick(.145);burstRing(x,y,13,'#ffca8c');
}
function simulate(dt){
 p.inv-=dt;spawnIn-=dt;waveCue=Math.max(0,waveCue-dt);
 const move=movePtr??moveKey??movePulse;
 const x=move?.x??(Number(has('KeyD'))-Number(has('KeyA'))),y=move?.y??(Number(has('KeyS'))-Number(has('KeyW'))),m=Math.max(1,Math.hypot(x,y));
 if(movePtr)movePtr.held+=dt;else if(moveKey)moveKey.held+=dt;
 if(movePulse){movePulse.left-=dt;if(movePulse.left<=0){movePulse=null;paintMove();}}
 if(x||y){
  const dx=x/m*p.speed-p.vx,dy=y/m*p.speed-p.vy,change=Math.hypot(dx,dy),blend=change?Math.min(1,1250*dt/change):0;
  p.vx+=dx*blend;p.vy+=dy*blend;
 }else{
  // Coasting preserves heading; light drag gradually bleeds speed.
  const keep=Math.exp(-.72*dt);p.vx*=keep;p.vy*=keep;
 }
 const left=21,right=W-21,top=42,bottom=H-24,px=p.x+p.vx*dt,py=p.y+p.vy*dt;
 p.x=clamp(px,left,right);p.y=clamp(py,top,bottom);
 if(px<=left&&p.vx<0||px>=right&&p.vx>0)p.vx=0;
 if(py<=top&&p.vy<0||py>=bottom&&p.vy>0)p.vy=0;
 if(nextWaveIn>0){nextWaveIn-=dt;if(nextWaveIn<=0){wave++;beginWave();}}
 if(remaining>0&&spawnIn<=0){enter();remaining--;spawnIn=Math.max(.33,1.04-wave*.055);}
 const target=autoTarget();
 if(target)p.aim=Math.atan2(target.y-p.y,target.x-p.x);
 else if(!usingAutoAim()){
  const [ax,ay]=keyAim();
  if(ax||ay)p.aim=Math.atan2(ay,ax);
 }
 for(const f of foes){
  f.age+=dt;
  if(f.tank&&f.y>120){f.y+=(124+20*Math.sin(f.age*.75)-f.y)*dt;f.x=clamp(f.center+Math.sin(f.age+f.seed)*65,23,W-23);}
  else{
   f.y+=f.speed*dt;
   f.x=clamp(f.center+Math.sin(f.age*(f.tank?1.1:2.2)+f.seed)*(f.tank?35:50),21,W-21);
  }
  if(f.age>f.next&&f.y>42&&f.y<p.y+10){pew(f);f.next=f.age+Math.max(.65,(f.tank?1.7:2.2)-wave*.07)+rand(0,.35);}
  if(hit(f,p,f.r+11)){f.hp=0;sound('blast');blast(f.x,f.y,'#ffae64',18);burstRing(f.x,f.y,f.r+14,'#ffb67d');damage(p.x,p.y);}
  if(state!=='play')return;
 }
 for(const b of shots){b.y+=b.vy*dt;b.x+=b.vx*dt;for(const f of foes){
  if(f.hp<=0||!hit(f,b,f.r+3))continue;
  b.spent=true;f.hp-=b.d;blast(b.x,b.y,f.hp<=0?'#ffc47d':'#d5fff4',f.hp<=0?23:10,f.tank?1.22:1);
  burstRing(b.x,b.y,f.hp<=0?f.r+14:12,f.hp<=0?'#ffca8c':'#abfff0');
  if(f.hp<=0){sound('blast');kick(f.tank?.22:.14);score+=(f.tank?175:80)+wave*10;record();updateHud();}else sound('hit');break;
 }}
 for(const b of foeShots){b.x+=b.vx*dt;b.y+=b.vy*dt;if(hit(b,p,12)){b.y=H+100;damage(p.x,p.y);if(state!=='play')return;}}
 shots=shots.filter(b=>!b.spent&&b.y>-25&&b.y<H+25&&b.x>-25&&b.x<W+25);
 foeShots=foeShots.filter(b=>b.y>-25&&b.y<H+25&&b.x>-25&&b.x<W+25);
 const missed=foes.some(f=>f.hp>0&&f.y>H+16);foes=foes.filter(f=>f.hp>0&&f.y<=H+16);
 if(missed){damage(p.x,p.y);if(state!=='play')return;}
 if(!remaining&&!foes.length&&nextWaveIn===0){score+=wave*120;record();updateHud();nextWaveIn=1.45;foeShots=[];}
}
function poly(points){g.beginPath();points.forEach(([x,y],i)=>i===0?g.moveTo(x,y):g.lineTo(x,y));g.closePath();g.fill();if(g.lineWidth)g.stroke();}
function shooter(x,y,a=-Math.PI/2,t=0){
 const push=state==='play'&&!motion?.matches?recoil*58:0;
 g.save();g.translate(x-Math.cos(a)*push,y-Math.sin(a)*push);g.rotate(a+Math.PI/2);g.globalAlpha=p?.inv>0&&Math.floor(t*16)%2===0?.48:1;
 g.fillStyle=trail[Math.floor(t*28)%trail.length];g.strokeStyle='#07313e';g.lineWidth=1;
 poly([[-7,11],[0,23+Math.sin(t*44)*4],[7,11]]);
 g.fillStyle='#137b89';g.strokeStyle='#71f2e2';g.lineWidth=1.5;
 poly([[0,-21],[20,12],[10,9],[7,14],[-7,14],[-10,9],[-20,12]]);
 g.fillStyle='#d5ffed';g.strokeStyle='#5bdcd9';g.lineWidth=1;
 poly([[0,-15],[6,3],[0,10],[-6,3]]);
 if(state==='play'&&recoil>0){g.globalAlpha=Math.min(1,recoil*11);g.fillStyle='#fff2b3';g.strokeStyle='#a2ffec';poly([[0,-42],[-4,-28],[-12,-25],[-4,-21],[0,-17],[4,-21],[12,-25],[4,-28]]);g.fillStyle='#ffffff';g.fillRect(-2,-28,4,9);}
 g.restore();
}
function enemy(f,t){
 g.save();g.translate(f.x,f.y);g.rotate(Math.sin(t*2+f.seed)*.13);g.strokeStyle=f.tank?'#ffb468':'#ff9ac6';g.lineWidth=1.6;g.fillStyle=f.tank?'#4d2119':'#601e49';
 if(f.tank)poly([[-23,-10],[-12,-15],[-6,-8],[6,-8],[12,-15],[23,-10],[14,12],[0,16],[-14,12]]);
 else poly([[-15,-10],[-5,-5],[0,-12],[5,-5],[15,-10],[11,5],[0,14],[-11,5]]);
 g.fillStyle=f.tank?'#ffbb79':'#ff80bd';g.fillRect(-4,-3,8,8);
 if(f.max>1){g.fillStyle='#352838';g.fillRect(-15,-23,30,3);g.fillStyle=f.tank?'#ffac67':'#ff83b5';g.fillRect(-15,-23,30*Math.max(0,f.hp/f.max),3);}
 g.restore();
}
function drawAim(){
 if(usingAutoAim()){
  if(!autoLock||autoLock.hp<=0||autoLock.y<0||autoLock.y>H)return;
  const {x,y,r}=autoLock,s=r+6,l=7;
  g.save();g.strokeStyle='rgba(146,255,230,.80)';g.lineWidth=1.4;g.beginPath();
  for(const [u,v] of [[-1,-1],[1,-1],[-1,1],[1,1]]){
   g.moveTo(x+u*(s-l),y+v*s);g.lineTo(x+u*s,y+v*s);g.lineTo(x+u*s,y+v*(s-l));
  }
  g.stroke();g.restore();
 }
 const vx=Math.cos(p.aim),vy=Math.sin(p.aim),x=p.x+vx*62,y=p.y+vy*62;
 g.save();g.strokeStyle='rgba(146,255,230,.56)';g.lineWidth=1.35;g.setLineDash([3,5]);g.beginPath();
 g.moveTo(p.x+vx*28,p.y+vy*28);g.lineTo(x-vx*10,y-vy*10);g.stroke();g.setLineDash([]);
 g.beginPath();g.arc(x,y,7,0,TAU);g.moveTo(x-11,y);g.lineTo(x-5,y);g.moveTo(x+5,y);g.lineTo(x+11,y);g.moveTo(x,y-11);g.lineTo(x,y-5);g.moveTo(x,y+5);g.lineTo(x,y+11);g.stroke();g.restore();
}
function draw(t){
 g.setTransform(1,0,0,1,0,0);g.fillStyle='#050615';g.fillRect(0,0,viewW,viewH);
 g.setTransform(scale,0,0,scale,dx,dy);g.save();g.beginPath();g.rect(0,0,W,H);g.clip();
 let neb=g.createRadialGradient(W*.72,H*.4,24,W*.67,H*.43,H*.72);neb.addColorStop(0,'#261536');neb.addColorStop(.52,'#101a36');neb.addColorStop(1,'#07091b');
 g.fillStyle=neb;g.fillRect(0,0,W,H);
 g.globalAlpha=.27;g.lineWidth=1;g.strokeStyle='#4e4770';
 for(let i=0;i<7;i++){g.beginPath();g.ellipse(405,215,130+i*20,38+i*12,-.35,0,TAU);g.stroke();}
 g.globalAlpha=1;
 for(const a of stars){g.fillStyle=a.h;const y=(a.y+t*a.d)%H;g.globalAlpha=a.r>1?.64:.38;g.fillRect(a.x,y,a.r,a.r*(a.r>1?2:1));}
 g.globalAlpha=1;g.strokeStyle='#6d5180';g.lineWidth=2;g.strokeRect(2,2,W-4,H-4);
 if(shake>0&&(shakeSwitch?.checked??!motion?.matches))g.translate(Math.sin(t*71)*shake*16,Math.cos(t*64)*shake*13);
 if(!p||state==='menu'){shooter(W*.5,H*.74,-Math.PI/2,t);enemy({x:W*.18,y:H*.21,tank:false,max:1,seed:1},t);enemy({x:W*.79,y:H*.27,tank:true,max:3,hp:3,seed:2},t);}
 if(p&&state==='play')drawAim();
 if(p&&state!=='dead')shooter(p.x,p.y,p.aim,t);
 for(const f of foes)if(f.hp>0)enemy(f,t);
 for(const b of shots){g.save();g.translate(b.x,b.y);g.rotate(b.a);g.fillStyle='#3adac4';g.fillRect(-11,-2,16,4);g.fillStyle='#c6fff2';g.fillRect(-8,-.65,12,1.3);g.restore();}
 for(const b of foeShots){g.fillStyle=b.heavy?'#ffac68':'#ff66ae';g.beginPath();g.arc(b.x,b.y,b.heavy?4.1:3.3,0,TAU);g.fill();g.fillStyle='#fff0d8';g.fillRect(b.x-1,b.y-1,2,2);}
 for(const r of rings){g.globalAlpha=Math.min(1,r.life/r.max*1.45);g.strokeStyle=r.colour;g.lineWidth=2;g.beginPath();g.arc(r.x,r.y,motion?.matches?r.size*.66:3+(1-r.life/r.max)*r.size,0,TAU);g.stroke();}
 for(const z of sparks){g.globalAlpha=z.life/z.max;g.fillStyle=z.tone;g.fillRect(z.x,z.y,z.r,z.r);}
 g.globalAlpha=1;
 if(state==='play'&&(nextWaveIn>0||waveCue>0)){
  g.fillStyle='rgba(9,13,27,.83)';g.fillRect(W/2-148,H*.45-23,296,48);g.lineWidth=1;g.strokeStyle='#477585';g.strokeRect(W/2-148,H*.45-23,296,48);g.textAlign='center';g.textBaseline='middle';g.fillStyle='#a3ffec';g.font='700 20px ui-monospace, monospace';g.fillText(nextWaveIn>0?'WAVE '+wave+' CLEARED':'WAVE '+String(wave).padStart(2,'0'),W/2,H*.45);
 }
 if(flash>0){g.strokeStyle='rgba(255,88,126,'+(!motion?.matches?flash*2:.3)+')';g.lineWidth=10;g.strokeRect(5,5,W-10,H-10);}
 g.restore();
}
function tick(now){
 const dt=Math.min(.032,Math.max(0,(now-(last||now))/1000));last=now;
 if(!document.hidden&&state!=='pause'){
  elapsed+=dt;flash=Math.max(0,flash-dt);shake=Math.max(0,shake-dt);recoil=Math.max(0,recoil-dt);
  if(state==='play')simulate(dt);
  for(const z of sparks){z.x+=z.dx*dt;z.y+=z.dy*dt;z.life-=dt;}
  sparks=sparks.filter(z=>z.life>0);
  for(const r of rings)r.life-=dt;rings=rings.filter(r=>r.life>0);
 }
 updateThruster();draw(elapsed);frame=requestAnimationFrame(tick);
}
layout();updateHud();menu('Rift Runner','Dodge enemy fire and survive as many waves as you can.','start','Launch run','ARCADE SURVIVAL');
frame=requestAnimationFrame(tick);
})();
