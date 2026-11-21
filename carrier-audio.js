(() => {
 const toggle=document.getElementById('carrier-engine-sound'),badge=document.getElementById('carrier-engine-state');
 const feedback=document.getElementById('carrier-engine-feedback'),views=document.getElementById('carrier-views');
 if(!toggle||!badge||!feedback)return;
 const preference='rift-runner.carrier-engine-muted.v1';
 let muted=false,current=null,departing=false,visibleTried=false,viewTried=false,policyBlocked=false,unavailable=false;
 try{muted=globalThis.sessionStorage?.getItem(preference)==='1';}catch{}
 const messages={
  off:['Off','Engine sound is off.'],
  starting:['Starting…','Starting the carrier engine sound. Tap Engine Sound to turn it off.'],
  playing:['On','Carrier engine sound is playing.'],
  blocked:['Blocked','Automatic playback was blocked. Change the Carrier view or tap Engine Sound to try again.'],
  error:['Unavailable','Carrier engine sound is unavailable. Tap Engine Sound to try again.']
 };
 function show(state){
  toggle.dataset.state=state;
  toggle.setAttribute('aria-pressed',String(state==='playing'));
  badge.textContent=messages[state][0];
  feedback.textContent=state==='blocked'&&viewTried?'Playback was blocked. Tap Engine Sound to try again.':messages[state][1];
 }
 function remember(value){
  muted=value;
  try{if(value)globalThis.sessionStorage?.setItem(preference,'1');else globalThis.sessionStorage?.removeItem(preference);}catch{}
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
  // View/button retries call this play() synchronously in the real gesture.
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
   unavailable=policyBlocked=viewTried=false;attempt.started=true;show('playing');
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
  audio.src='./carrier-engine-loop.mp3';
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
 views?.addEventListener('click',event=>{
  if(event.isTrusted!==true||document.hidden||departing||muted||current||!policyBlocked||viewTried)return;
  if(!event.target?.closest?.('label, input[name="carrier-angle"]'))return;
  viewTried=true;start();
 });
 function quiet(){visibleTried=false;stop(waitState());}
 document.addEventListener('visibilitychange',()=>{if(document.hidden)quiet();else enterVisible();});
 globalThis.addEventListener('pagehide',()=>{departing=true;quiet();});
 globalThis.addEventListener('pageshow',()=>{departing=false;enterVisible();});
 function leave(event){
  if(event?.defaultPrevented||event?.metaKey||event?.ctrlKey||event?.shiftKey||event?.altKey)return;
  departing=true;quiet();
 }
 document.querySelector('.carrier-back')?.addEventListener('click',leave);
 for(const id of ['carrier-hangar','carrier-launch-practice','carrier-launch-vandul'])document.getElementById(id)?.addEventListener('click',leave);
 show('off');
 toggle.hidden=false;
 enterVisible();
})();
