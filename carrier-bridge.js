'use strict';
(() => {
 const get=id=>document.getElementById(id);
 const captain=get('bridge-captain'),brief=get('bridge-mission'),parts=get('mission-parts');
 if(!captain||!brief||!parts)return;
 const voice=get('captain-voice'),lodge=get('mission-lodge'),notice=get('bridge-notice');
 const log=window.RiftMissions,scene=get('bridge-scene');
 const setCaptain=available=>{
  scene.dataset.captain=available?'front':'back';
  captain.hidden=!available;
 };
 function showBrief(open){
  brief.hidden=!open;
  captain.setAttribute('aria-expanded',String(open));
  scene.dataset.talking=String(open);
 }

 const stopVoice=()=>{if(voice){voice.pause();voice.currentTime=0;}};
 const playVoice=()=>{if(voice){voice.currentTime=0;voice.play()?.catch(()=>{});}};
 const keys={hull:'rift-runner.hull-owned.v1',build:'rift-runner.ship-build.v1',fit:'rift-runner.fighter-fit.v1',engine:'rift-runner.engine-fit.v1'};
 const goals=[
  ['engine','engine','stock-thruster'],
  ['core','core','weifer-he3-core'],
  ['battery','battery','kestrel-h20-reserve-cell'],
  ['primary','weapon','blaster']
 ];
 const load=key=>{try{return JSON.parse(window.localStorage.getItem(key));}catch{return null;}};
 function render(){
  const generation=log?.generation(),completed=log?.getStarter();
  if(lodge)lodge.hidden=true;
  if(completed)return;
  const wallet=window.RiftCredits?.getBuildState?.(),catalog=window.RiftCredits?.getCatalog?.();
  const status=get('mission-status'),next=get('mission-next');
  const shop=get('mission-shop'),hangar=get('mission-hangar');
  shop.removeAttribute('data-next');hangar.removeAttribute('data-next');parts.replaceChildren();
  if(!wallet?.origin||!Array.isArray(catalog)){
   status.textContent='Saved progress is unavailable.';
   next.textContent='Open the game in the same browser where you bought your parts.';
   return;
  }
  const hull=load(keys.hull),build=load(keys.build);
  const savedFit=build?.version===1&&build.hull==='rift-fighter'?build:null;
  const repaired=hull?.version===1&&hull.hull==='rift-fighter'&&hull.condition==='repaired'||
   !hull&&(wallet.origin==='legacy'||Boolean(savedFit&&goals.some(([slot,category])=>
    catalog.some(p=>p.id===savedFit[slot]&&p.category===category&&wallet.owned.includes(p.id)))));
  const legacyFit=load(keys.fit),legacyEngine=load(keys.engine);
  const legacySlot=(slot,fallback)=>{
   const record=slot==='engine'?legacyEngine:legacyFit;
   const entry=record?.version===1?record[slot]:null;
   return catalog.some(p=>p.id===entry&&p.category===(slot==='engine'?'engine':'weapon'))?entry:fallback;
  };
  const fit=repaired?(savedFit??(wallet.origin==='legacy'?{
   engine:legacySlot('engine','stock-thruster'),core:'weifer-he3-core',
   battery:'kestrel-h20-reserve-cell',primary:legacySlot('primary','blaster')
  }:{})):{};
  let owned=0,fitted=0,firstMissing;
  for(const [slot,category,fallback] of goals){
   const options=catalog.filter(p=>p.category===category),owns=p=>wallet.owned.includes(p.id);
   const fittedPart=options.find(p=>p.id===fit[slot]&&owns(p));
   const part=fittedPart??options.find(p=>p.id===fallback&&owns(p))??options.find(owns)??options.find(p=>p.id===fallback);
   if(!part)continue;
   const hasPart=owns(part);
   if(hasPart)owned++;else firstMissing??=part;
   if(fittedPart)fitted++;
   const row=document.createElement('li'),name=document.createElement('span'),state=document.createElement('span');
   row.dataset.owned=String(hasPart);name.className='part-name';name.textContent=part.name;
   state.className='part-state';state.textContent=fittedPart?'Fitted':hasPart?'Owned':part.price+' credits';
   row.append(name,state);parts.append(row);
  }
  const ready=fitted===goals.length;
  status.textContent=ready?'Ready to turn in':owned+'/'+goals.length+' acquired · '+fitted+'/'+goals.length+' fitted';
  if(ready){
   next.textContent='All four parts are fitted. Lodge the mission with the Captain.';
   if(lodge)lodge.hidden=generation===undefined;
  }else if(firstMissing){
   next.textContent='Next: get '+firstMissing.name+' from Mara.';
   shop.dataset.next='true';
  }else{
   next.textContent=repaired?'Next: fit your parts in the Hangar.':'Next: claim or repair your Rift-4 in the Hangar, then fit your parts.';
   hangar.dataset.next='true';
  }
  return {ready,generation};
 }
 lodge?.addEventListener('click',()=>{
  if(brief.hidden)return;
  const progress=render();
  if(!progress?.ready)return;
  if(!log?.lodgeStarter(progress.generation)){
   get('mission-next').textContent='Could not save the mission in this browser. Try again.';
   return;
  }
  refresh();get('bridge-title').focus({preventScroll:true});
  notice.textContent='Completion saved to your Pilot Profile.';
 });
 captain.addEventListener('click',()=>{
  if(captain.hidden||log?.getStarter()){refresh();return;}
  notice.textContent='';
  const opening=brief.hidden;
  showBrief(opening);
  if(opening){playVoice();render();get('mission-title').focus();}
  else stopVoice();
 });
 const refresh=()=>{
  const available=!log?.getStarter();
  const focused=document.activeElement===captain||brief.contains?.(document.activeElement);
  if(!available&&!brief.hidden){stopVoice();showBrief(false);}
  setCaptain(available);
  if(!available&&focused)get('bridge-title').focus({preventScroll:true});
  if(available&&!brief.hidden)render();
 };
 window.addEventListener('pagehide',stopVoice);
 window.addEventListener('pageshow',refresh);
 window.addEventListener('storage',refresh);
 window.addEventListener('rift:walletchange',refresh);
 refresh();
})();
