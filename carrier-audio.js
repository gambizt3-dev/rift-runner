(() => {
 const toggle=document.getElementById('carrier-engine-sound'),badge=document.getElementById('carrier-engine-state');
 const feedback=document.getElementById('carrier-engine-feedback');
 if(!toggle||!badge||!feedback)return;
 const preference='rift-runner.carrier-engine-muted.v1';
 let muted=false,current=null,departing=false,visibleTried=false,gestureTried=false,policyBlocked=false,unavailable=false;
 try{muted=globalThis.localStorage?.getItem(preference)==='1'||globalThis.sessionStorage?.getItem(preference)==='1';}catch{
  try{muted=globalThis.sessionStorage?.getItem(preference)==='1';}catch{}
 }
 const messages={
  off:['Off','Engine sound is off.'],
  starting:['Starting…','Starting the carrier engine sound. Tap Engine Sound to turn it off.'],
  playing:['On','Carrier engine sound is playing.'],
  blocked:['Tap to play','Tap anywhere on the Carrier page to start engine sound.'],
  error:['Unavailable','Carrier engine sound is unavailable. Tap Engine Sound to try again.']
 };
 function show(state){
  toggle.dataset.state=state;
  toggle.setAttribute('aria-pressed',String(state==='playing'));
  badge.textContent=messages[state][0];
  feedback.textContent=state==='blocked'&&gestureTried?'Playback was blocked. Tap Engine Sound to try again.':messages[state][1];
  refreshPrompt?.();
 }
 function remember(value){
  muted=value;
  for(const store of ['localStorage','sessionStorage']){
   try{if(value)globalThis[store]?.setItem(preference,'1');else globalThis[store]?.removeItem(preference);}catch{}
  }
 }
 function dispose(audio){
  // Detach the source to cancel pending I/O, not just audible playback.
  try{audio.pause();}catch{}
  try{audio.currentTime=0;}catch{}
  audio.removeAttribute('src');
  try{audio.load();}catch{}
  audio.remove();
 }
 function stop(state='off'){
  const attempt=current;
  current=null;
  if(attempt)dispose(attempt.audio);
  if(attempt||toggle.dataset.state!==state)show(state);
 }
 function waitState(){return muted?'off':unavailable?'error':policyBlocked?'blocked':'off';}
 function start(){
  if(muted||document.hidden||departing||current)return;
  // The visible-entry attempt is native and subject to browser policy.
  // Page tap retries call this play() synchronously in the real gesture.
  const audio=document.createElement('audio');
  if(typeof audio.play!=='function'){unavailable=true;show('error');return;}
  const attempt={audio,started:false};
  current=attempt;
  audio.preload='none';audio.loop=true;audio.hidden=true;
  audio.setAttribute('aria-hidden','true');
  show('starting');
  const playing=()=>{
   if(current!==attempt){try{audio.pause();}catch{}return;}
   if(document.hidden||departing||muted){stop(waitState());return;}
   if(audio.paused||attempt.started)return;
   unavailable=policyBlocked=gestureTried=false;attempt.started=true;show('playing');
  };
  const failed=error=>{
   if(current!==attempt)return;
   policyBlocked=error?.name==='NotAllowedError';unavailable=!policyBlocked;
   stop(waitState());
  };
  audio.addEventListener('playing',playing);
  audio.addEventListener('error',failed);
  audio.addEventListener('pause',()=>{if(current===attempt&&attempt.started)stop();});
  document.body.append(audio);
  audio.src='./carrier-engine-loop.mp3?v=2';
  try{audio.play()?.then(playing,failed);}catch(error){failed(error);}
 }
 function enterVisible(){
  if(document.hidden||departing||visibleTried)return;
  visibleTried=true;
  if(!muted&&!policyBlocked&&!unavailable&&!current)start();
 }
 toggle.addEventListener('click',event=>{
  if(event.isTrusted!==true||document.hidden||departing)return;
  if(current){remember(true);stop();return;}
  remember(false);start();
 });
 const refreshPrompt=globalThis.RiftSoundActivation?.({
  needed:()=>!muted&&!departing&&!unavailable&&!current?.started,
  skip:target=>!!target?.closest?.('a[href], #carrier-engine-sound'),
  start
 });
 if(!refreshPrompt)document.addEventListener('click',event=>{
  if(event.isTrusted!==true||document.hidden||departing||muted||current||!policyBlocked||gestureTried)return;
  // No stray burst when the gesture leaves the Carrier page or handles mute.
  if(event.defaultPrevented||event.target?.closest?.('a[href], #carrier-engine-sound'))return;
  gestureTried=true;start();
 });
 function quiet(){visibleTried=gestureTried=false;stop(waitState());}
 document.addEventListener('visibilitychange',()=>{if(document.hidden)quiet();else enterVisible();});
 globalThis.addEventListener('pagehide',()=>{departing=true;quiet();});
 globalThis.addEventListener('pageshow',()=>{departing=false;enterVisible();});
 function leave(event){
  if(event?.defaultPrevented||event?.metaKey||event?.ctrlKey||event?.shiftKey||event?.altKey)return;
  departing=true;quiet();
 }
 document.querySelector('.carrier-back')?.addEventListener('click',leave);
 for(const id of ['carrier-hangar','carrier-launch-practice','carrier-launch-vandul','carrier-shop'])document.getElementById(id)?.addEventListener('click',leave);
 show('off');
 toggle.hidden=false;
 enterVisible();
})();
