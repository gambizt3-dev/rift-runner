(() => {
 const toggle=document.getElementById('carrier-engine-sound'),badge=document.getElementById('carrier-engine-state');
 const feedback=document.getElementById('carrier-engine-feedback');
 if(!toggle||!badge||!feedback)return;
 let current=null;
 const messages={
  off:['Off','Engine sound is off.'],
  starting:['Starting…','Starting the carrier engine sound. Tap again to cancel.'],
  playing:['On','Carrier engine sound is playing.'],
  blocked:['Blocked','Playback was blocked. Tap Engine Sound to try again.'],
  error:['Unavailable','Carrier engine sound is unavailable. Tap Engine Sound to try again.']
 };
 function show(state){
  toggle.dataset.state=state;
  toggle.setAttribute('aria-pressed',String(state==='playing'));
  badge.textContent=messages[state][0];
  feedback.textContent=messages[state][1];
 }
 function dispose(audio){
  // Clear the source before resetting the media element to cancel pending I/O.
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
 function start(){
  // Construct and attach the native player only within a trusted click.
  // The clip already has a quiet baked-in level; iOS may ignore JS volume.
  const audio=document.createElement('audio');
  if(typeof audio.play!=='function'){show('error');return;}
  const attempt={audio,started:false};
  current=attempt;
  audio.preload='none';audio.loop=true;audio.hidden=true;
  audio.setAttribute('aria-hidden','true');
  show('starting');
  const playing=()=>{
   if(current!==attempt){try{audio.pause();}catch{}return;}
   if(document.hidden){stop();return;}
   if(audio.paused||attempt.started)return;
   attempt.started=true;show('playing');
  };
  const failed=error=>{
   if(current!==attempt)return;
   stop(error?.name==='NotAllowedError'?'blocked':'error');
  };
  audio.addEventListener('playing',playing);
  audio.addEventListener('error',failed);
  audio.addEventListener('pause',()=>{if(current===attempt&&attempt.started)stop();});
  document.body.append(audio);
  audio.src='./carrier-engine-loop.mp3';
  try{audio.play()?.then(playing,failed);}catch(error){failed(error);}
 }
 toggle.addEventListener('click',event=>{
  if(event.isTrusted!==true||document.hidden)return;
  if(current)stop();else start();
 });
 function quiet(){stop();}
 document.addEventListener('visibilitychange',()=>{if(document.hidden)quiet();});
 globalThis.addEventListener('pagehide',quiet);
 document.querySelector('.carrier-back')?.addEventListener('click',quiet);
 document.getElementById('carrier-hangar')?.addEventListener('click',quiet);
 show('off');
 toggle.hidden=false;
})();
