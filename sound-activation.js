// A page's audio owner supplies the existing playback call. Never synthesize a tap.
window.RiftSoundActivation=({needed,start,host=()=>document.body,skip=()=>false})=>{
 let button,delay,elapsed=false,parked=false;
 const refresh=()=>{
  const visible=elapsed&&!parked&&!document.hidden&&needed();
  if(!visible){if(button){button.hidden=true;button.style.display='none';};return;}
  const parent=host();
  if(!parent)return;
  if(!button){
   button=document.createElement('button');button.type='button';button.textContent='Tap to enable sound';
   button.className='rift-sound-activation';
   Object.assign(button.style,{position:'fixed',top:'max(.55rem, env(safe-area-inset-top))',left:'50%',
    transform:'translateX(-50%)',margin:'0',zIndex:'1000',minHeight:'44px',padding:'.4rem .8rem',
    border:'1px solid #83bcc4',borderRadius:'2rem',background:'#102733',color:'#eefbff',font:'600 .85rem system-ui'});
  }
  if(button.parentNode!==parent)parent.append(button);
  button.hidden=false;button.style.display='block';
 };
 const rearm=()=>{
  clearTimeout(delay);elapsed=false;refresh();
  if(!parked&&!document.hidden)delay=setTimeout(()=>{elapsed=true;refresh();},1000);
 };
 function tapped(event){
  if(!event.isTrusted||parked||document.hidden||!needed()||event.repeat||
   event.type==='keydown'&&['Shift','Alt','Control','Meta','Tab','Escape'].includes(event.key))return;
  if(event.target!==button&&skip(event.target,event))return;
  if(event.target===button&&event.type!=='click')return; // native button click also covers keyboard activation.
  start(event);refresh();
 }
 for(const type of ['touchend','click','keydown'])document.addEventListener(type,tapped,{capture:true,passive:true});
 document.addEventListener('visibilitychange',rearm);
 window.addEventListener('pagehide',()=>{parked=true;rearm();});
 window.addEventListener('pageshow',event=>{if(event.persisted){parked=false;rearm();}});
 rearm();
 return refresh;
};
