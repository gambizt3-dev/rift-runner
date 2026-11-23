'use strict';
(() => {
 const ships=Object.freeze([
  {name:'Your Rift-4',parkedX:297,parkedY:420,laneX:98,clearY:610,start:1},
  {name:'Wing 1',parkedX:320,parkedY:420,laneX:181,clearY:646,start:6.1},
  {name:'Wing 2',parkedX:343,parkedY:420,laneX:256,clearY:615,start:11.2},
  {name:'Orion',parkedX:297,parkedY:388,laneX:320,clearY:647,start:16.3},
  {name:'Vega',parkedX:320,parkedY:388,laneX:428,clearY:646,start:21.4},
  {name:'Atlas',parkedX:343,parkedY:388,laneX:529,clearY:623,start:26.5}
 ].map(Object.freeze));
 const flightTime=4.8,finishTime=ships.at(-1).start+flightTime;
 const aftClearY=562,clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
 const ease=n=>n*n*(3-2*n);
 function position(ship,t){
  // Center only after the bay parking line, then pass straight over the
  // aft hull before fanning out into the separate external lanes.
  const p=clamp(t,0,1);
  if(p<.25){
   const p0=p/.25;
   return {x:ship.parkedX+(320-ship.parkedX)*ease(clamp((p0-.27)/.73,0,1)),y:ship.parkedY+(471-ship.parkedY)*p0};
  }
  if(p<.66)return {x:320,y:471+(aftClearY-471)*(p-.25)/.41};
  const p1=(p-.66)/.34;
  return {x:320+(ship.laneX-320)*ease(p1),y:aftClearY+(ship.clearY-aftClearY)*p1};
 }
 function sample(t){
  return ships.map(ship=>{
   const raw=(t-ship.start)/flightTime,progress=raw>=1-1e-9?1:clamp(raw,0,1),loc=position(ship,progress);
   const previous=position(ship,Math.max(0,progress-.001)),next=position(ship,Math.min(1,progress+.001));
   const angle=Math.atan2(next.y-previous.y,next.x-previous.x)*180/Math.PI+90;
   const phase=t<ship.start?'docked':progress>=1-1e-9?'clear':'departing';
   return {...loc,angle,phase,name:ship.name};
  });
 }
 function mount(document,window){
  const get=id=>document.getElementById(id);
  const play=get('launch-play'),replay=get('launch-replay'),report=get('launch-status'),clock=get('launch-clock'),bar=get('launch-progress');
  const actors=ships.map((_,i)=>({sprite:get('launch-craft-'+i),phase:get('launch-phase-'+i)}));
  if(!play||!replay||!report||!clock||!bar||actors.some(a=>!a.sprite||!a.phase))return;
  const motion=window.matchMedia?.('(prefers-reduced-motion: reduce)');
  const label={docked:'Docked',departing:'Departing',clear:'Clear'};
  let time=0,frame=null,previous=null,paused=!!document.hidden||!!motion?.matches,shown='';
  function render(){
   const state=sample(time),clear=state.filter(a=>a.phase==='clear').length;
   const active=state.find(a=>a.phase==='departing');
   for(let i=0;i<state.length;i++){
    const a=state[i],node=actors[i];
    node.sprite.setAttribute('transform',`translate(${a.x.toFixed(2)} ${a.y.toFixed(2)}) rotate(${a.angle.toFixed(2)})`);
    node.sprite.dataset.phase=a.phase;
    if(node.phase.textContent!==label[a.phase])node.phase.textContent=label[a.phase];
   }
   bar.value=clear;
   clock.textContent='T+'+time.toFixed(1).padStart(4,'0');
   const status=clear===ships.length?'All six ships clear.':active?active.name+' departing · '+clear+'/6 clear':
    clear?'Hold traffic · '+clear+'/6 clear':'Squadron and three freighters docked.';
   if(status!==shown){report.textContent=status;shown=status;}
   play.disabled=clear===ships.length;
   play.textContent=motion?.matches?'Next departure':paused?'Resume':'Pause';
  }
  function step(now){
   frame=null;
   if(paused||document.hidden||motion?.matches)return;
   if(previous!==null)time=Math.min(finishTime,time+clamp((now-previous)/1000,0,.075));
   previous=now;render();queue();
  }
  function queue(){
   if(frame===null&&!paused&&!document.hidden&&!motion?.matches&&time<finishTime)frame=window.requestAnimationFrame(step);
  }
  function pause(){
   paused=true;previous=null;
   if(frame!==null){window.cancelAnimationFrame(frame);frame=null;}
   render();
  }
  play.hidden=replay.hidden=false;
  play.addEventListener('click',()=>{
   if(document.hidden||time>=finishTime)return;
   if(motion?.matches){
    const next=ships.find(v=>time<v.start+flightTime-1e-9);
    if(next)time=next.start+flightTime;
   }else if(paused){paused=false;previous=null;queue();}
   else pause();
   render();
  });
  replay.addEventListener('click',()=>{
   if(document.hidden)return;
   pause();time=0;paused=!!motion?.matches;render();queue();
  });
  document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();});
  window.addEventListener('pagehide',pause);
  motion?.addEventListener?.('change',pause);
  render();queue();
  return Object.freeze({status:()=>({time,paused,aircraft:sample(time)})});
 }
 if(typeof module==='object'&&module.exports)module.exports={mount,sample,ships,flightTime,finishTime,aftClearY};
 else if(typeof window!=='undefined')mount(window.document,window);
})();
