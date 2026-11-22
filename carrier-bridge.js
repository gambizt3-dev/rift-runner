'use strict';
(() => {
 const get=id=>document.getElementById(id);
 const captain=get('bridge-captain'),brief=get('bridge-mission'),parts=get('mission-parts');
 if(!captain||!brief||!parts)return;
 const voice=get('captain-voice'),lodge=get('mission-lodge'),notice=get('bridge-notice');
 const accept=get('mission-accept'),launch=get('mission-launch');
 const phase=()=>!log?.getStarter()?'starter':log.getIntercept()?.lodgedAt?'none':'intercept';
 let shown;
 const log=window.RiftMissions,scene=get('bridge-scene');
 const setCaptain=available=>{
  scene.dataset.captain=available?'front':'back';
  captain.hidden=!available;
 };
 function showBrief(open){
  shown=open?phase():null;
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
 const starterOrders=get('mission-orders')?.textContent;
 function render(){
  const generation=log?.generation(),stage=phase(),intercept=log?.getIntercept();
  const status=get('mission-status'),next=get('mission-next');
  const shop=get('mission-shop'),hangar=get('mission-hangar');
  const combat=stage==='intercept';
  const title=get('mission-title'),kicker=get('mission-kicker'),orders=get('mission-orders');
  title.textContent=combat?'Vandul Intercept':'Outfit the Rift-4';
  if(kicker)kicker.textContent=combat?'Combat mission 02':'Starter mission 01';
  if(orders)orders.textContent=combat?'“Vandul fighters are approaching the carrier. Intercept them, clear all six waves, then report back to me.”':starterOrders;
  if(lodge){lodge.hidden=true;lodge.textContent=combat?'Turn in mission':'Lodge mission completion';}
  if(accept)accept.hidden=!combat||!!intercept;
  if(launch)launch.hidden=!combat||!intercept||!!intercept.victoryAt;
  parts.hidden=combat;shop.hidden=combat;hangar.hidden=combat&&(!intercept||!!intercept.victoryAt);
  if(stage==='none')return;
  if(combat){
   status.textContent=intercept?.victoryAt?'Ready to turn in':intercept?'Mission accepted':'Mission available';
   next.textContent=intercept?.victoryAt?'All six waves cleared. Report your victory to the Captain.':
    intercept?'Launch when your fighter is ready. If it was destroyed, repair it in the Hangar first.':'Accept the mission before launching. Practice or an earlier victory does not count.';
   if(intercept?.victoryAt&&lodge)lodge.hidden=generation===undefined;
   return {generation,intercept};
  }
  const wallet=window.RiftCredits?.getBuildState?.(),catalog=window.RiftCredits?.getCatalog?.();
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
 accept?.addEventListener('click',()=>{
  if(brief.hidden||phase()!=='intercept'||log.getIntercept())return;
  if(!log.acceptIntercept(log.generation())){get('mission-next').textContent='Could not accept the mission in this browser. Try again.';return;}
  render();launch?.focus();
 });
 lodge?.addEventListener('click',()=>{
  if(brief.hidden||shown!==phase())return;
  const progress=render(),combat=shown==='intercept';
  if(combat?!progress?.intercept?.victoryAt:!progress?.ready)return;
  const receipt=combat?log.lodgeIntercept(progress.generation,progress.intercept.acceptedAt):log?.lodgeStarter(progress.generation);
  if(!receipt){get('mission-next').textContent='Could not save the mission in this browser. Try again.';return;}
  refresh();get('bridge-title').focus({preventScroll:true});
  notice.textContent='Completion saved to your Pilot Profile.';
 });
 captain.addEventListener('click',()=>{
  if(captain.hidden||phase()==='none'){refresh();return;}
  notice.textContent='';
  const opening=brief.hidden,previous=shown;
  showBrief(opening);
  if(opening){if(shown==='starter')playVoice();render();get('mission-title').focus();}
  else if(previous==='starter')stopVoice();
 });
 const refresh=()=>{
  const stage=phase(),available=stage!=='none';
  const wasFocused=brief.contains?.(document.activeElement)||!available&&document.activeElement===captain;
  if(!brief.hidden&&shown!==stage){stopVoice();showBrief(false);if(wasFocused)get('bridge-title').focus({preventScroll:true});}
  setCaptain(available);
  if(!available&&wasFocused)get('bridge-title').focus({preventScroll:true});
  if(available&&!brief.hidden)render();
 };
 window.addEventListener('pagehide',stopVoice);
 window.addEventListener('pageshow',refresh);
 window.addEventListener('storage',refresh);
 window.addEventListener('rift:walletchange',refresh);
 refresh();
})();
