/* Carrier Shop ambience: Andy's uploaded spaceship recording, mixed below dialogue. */
(() => {
 'use strict';
 const voice=document.getElementById('shop-mara-voice');
 if(!voice||typeof Audio!=='function')return;
 const ambient=new Audio('./freesound_community-spaceship-ambient-27988.mp3');
 ambient.loop=true;
 ambient.preload='none';
 let offline=false,unlocked=false,leaving=false,dialogue=false;
 function play(){
  if(offline||!unlocked||leaving||dialogue|| (!voice.paused&&!voice.ended)||document.hidden||!ambient.paused)return;
  try{ambient.play()?.catch(()=>{});}catch{}
 }
 function start(event){
  if(event.isTrusted!==true)return;
  unlocked=true;
  play();
 }
 for(const type of ['click','touchend','keydown'])document.addEventListener(type,start,{passive:true});
 voice.addEventListener('play',()=>{dialogue=true;ambient.pause();});
 for(const type of ['ended','pause','error'])voice.addEventListener(type,()=>{dialogue=false;play();});
 document.addEventListener('visibilitychange',()=>{if(document.hidden)ambient.pause();else play();});
 window.addEventListener('pagehide',()=>{leaving=true;ambient.pause();});
 window.addEventListener('pageshow',()=>{leaving=false;play();});
 ambient.addEventListener('error',()=>{offline=true;ambient.pause();});
})();
