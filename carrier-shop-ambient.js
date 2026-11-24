/* Carrier Shop ambience: Andy's uploaded spaceship recording, mixed below dialogue. */
(() => {
 'use strict';
 const voice=document.getElementById('shop-mara-voice');
 if(!voice||typeof Audio!=='function')return;
 const ambient=new Audio('./freesound_community-spaceship-ambient-27988.mp3');
 ambient.loop=true;
 ambient.preload='none';
 let offline=false,unlocked=false,leaving=false,dialogue=false;
 const muted=()=>{try{return window.localStorage?.getItem('rift-runner.sound.v1')==='off';}catch{return false;}};
 const refreshPrompt=window.RiftSoundActivation?.({
  needed:()=>!offline&&!muted()&&!leaving&&!dialogue&&ambient.paused,
  skip:target=>!!target?.closest?.('a[href]'),
  start
 });
 function play(){
  if(offline||muted()||!unlocked||leaving||dialogue|| (!voice.paused&&!voice.ended)||document.hidden||!ambient.paused)return;
  try{
   const attempt=ambient.play();
   if(refreshPrompt)attempt?.then(refreshPrompt,error=>{
    if(error?.name==='NotSupportedError')offline=true;
    refreshPrompt();
   });else attempt?.catch(()=>{});
  }catch{refreshPrompt?.();}
 }
 function start(event){
  if(event.isTrusted!==true)return;
  unlocked=true;
  play();
 }
 if(!refreshPrompt)for(const type of ['click','touchend','keydown'])document.addEventListener(type,start,{passive:true});
 voice.addEventListener('play',()=>{dialogue=true;ambient.pause();refreshPrompt?.();});
 for(const type of ['ended','pause','error'])voice.addEventListener(type,()=>{dialogue=false;play();refreshPrompt?.();});
 document.addEventListener('visibilitychange',()=>{if(document.hidden)ambient.pause();else play();});
 window.addEventListener('pagehide',()=>{leaving=true;ambient.pause();});
 window.addEventListener('pageshow',()=>{leaving=false;play();});
 if(refreshPrompt){unlocked=true;play();}
 ambient.addEventListener('error',()=>{offline=true;ambient.pause();refreshPrompt?.();});
})();
