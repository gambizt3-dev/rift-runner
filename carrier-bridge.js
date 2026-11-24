'use strict';
(() => {
 const get=id=>document.getElementById(id);
 const captain=get('bridge-captain'),brief=get('bridge-mission'),parts=get('mission-parts');
 if(!captain||!brief||!parts)return;
 const vessel=window.RiftVessel;
 if(vessel?.id==='bifrost'){
  const scene=get('bridge-scene'),briefings=get('bifrost-bridge-briefings');
  const talk=get('bifrost-talk-action'),background=get('bifrost-bridge-interior'),fallback=get('pegasus-bridge-interior');
  const integrated=get('bifrost-bridge-crew'),portrait=get('bifrost-bridge-admiral');
  const showIntegrated=()=>{
   scene.dataset.art='integrated';
   integrated.hidden=false;background.hidden=true;fallback.hidden=true;portrait.hidden=true;
  };
  integrated.addEventListener('load',showIntegrated,{once:true});
  background.addEventListener('load',()=>{
   if(scene.dataset.art==='integrated')return;
   background.hidden=false;fallback.hidden=true;
  },{once:true});
  integrated.src='./bifrost-bridge-crew.webp';
  background.src='./bifrost-bridge-interior.webp';
  captain.querySelector('span').textContent='Talk to Admiral Adaline';
  captain.setAttribute('aria-label','Talk to Admiral Adaline');
  captain.setAttribute('aria-controls','bifrost-bridge-briefings');
  captain.tabIndex=-1; // The below-scene control is the single keyboard tab stop.
  talk.hidden=false;captain.hidden=false;scene.dataset.captain='front';
  const toggleBriefings=()=>{
   const open=briefings.hidden;
   briefings.hidden=!open;
   for(const control of [captain,talk])control.setAttribute('aria-expanded',String(open));
   scene.dataset.talking=String(open);
   if(open)get('bifrost-briefing-title').focus({preventScroll:true});
   else talk.focus({preventScroll:true});
  };
  captain.addEventListener('click',toggleBriefings);
  talk.addEventListener('click',toggleBriefings);
  return; // Pegasus commissioning and qualification progression is not reissued under Adaline.
 }
 const voice=get('captain-voice'),lodge=get('mission-lodge'),notice=get('bridge-notice');
 const accept=get('mission-accept'),launch=get('mission-launch'),picker=get('mission-picker'),selector=get('mission-select');
 const log=window.RiftMissions,scene=get('bridge-scene'),qualifications=log?.qualifications??[];
 const rendezvous=window.RiftRendezvous,crew=get('mission-crew'),wing='rendezvous';
 const wingTitle='Wing Rendezvous',wingLines=[
  ['Ah, there you are, pilot. Come in. I’m glad you’ve got a ship of your own now.','./Order6wingman1.mp3?v=191'],
  ['Time to find you a wing. Look for Leena by the Common Room pinboard and Tomas behind the table in the Observation Lounge.','./Order6wingman2.mp3'],
  ['Tell them I’m putting the three of you together. Ask them to saddle up, then meet them in the Refuelling Bay to get acquainted and talk through your formation.','./Order6wingman3.mp3']
 ];
 const wingVoice=get('wing-briefing-voice'),wingControls=get('wing-briefing-controls'),wingStep=get('wing-briefing-step');
 const wingNext=get('wing-briefing-next'),wingReplay=get('wing-briefing-replay');
 let wingParagraph=0;
 const moreWingBriefing=()=>wingParagraph<wingLines.length-1;
 const missionCards=new Map([['intercept',{
  title:'Vandul Intercept',number:'04',order:'“Vandul fighters are approaching the carrier. Intercept them, clear all six waves, then report back to me.”'
 }],...qualifications.map(({id,rank})=>[id,{rank,title:rank+' Qualification',
  order:id==='wingman'?'“One allied fighter will launch alongside you. Clear all six Vandul waves together, then report back to earn your Wingman badge.”':
   '“You’re ready to qualify for the '+rank+' badge. Clear a fresh Vandul sortie, all six waves, then report back to me.”'
 }])]);
 let shown,selected,choiceSignature='';
 const choices=()=>[
  ...(!log?.getStarter()?['starter']:[
   ...(!log.getIntercept()?.lodgedAt?['intercept']:[]),
   ...qualifications.map(({id})=>id).filter(id=>log.getQualification(id)||log.qualificationEligible(id))
  ]),
  ...(rendezvous&&rendezvous.generation()!==undefined?[wing]:[])
 ];
 const missionFor=stage=>stage===wing?rendezvous?.get():stage==='intercept'?log?.getIntercept():log?.getQualification?.(stage);
 const phase=()=>{
  const options=choices();
  if(options.includes(selected))return selected;
  const entries=options.map(id=>({id,mission:missionFor(id)}));
  return (entries.find(({mission})=>mission?.victoryAt&&!mission.lodgedAt)??
   entries.find(({mission})=>mission&&!mission.victoryAt&&!mission.completedAt)??
   entries.find(({id,mission})=>id!==wing&&!mission)??
   entries.filter(({id})=>id!==wing).at(-1)??entries.at(-1))?.id??'none';
 };
 const titleFor=stage=>stage===wing?wingTitle:missionCards.get(stage)?.title??'Outfit the Rift-3';
 function renderPicker(stage){
  if(!picker||!selector)return;
  const options=choices(),signature=options.join(',');
  picker.hidden=options.length<2;
  if(signature!==choiceSignature){
   choiceSignature=signature;
   selector.replaceChildren(...options.map(id=>{
    const option=document.createElement('option');option.value=id;option.textContent=titleFor(id);return option;
   }));
  }
  selector.value=stage;
 }
 const setCaptain=available=>{
  scene.dataset.captain=available?'front':'back';
  captain.hidden=!available;
 };
 function showBrief(open){
  shown=open?phase():null;
  if(shown===wing)wingParagraph=0;
  brief.hidden=!open;
  captain.setAttribute('aria-expanded',String(open));
  scene.dataset.talking=String(open);
 }

 let voiceAttempt=0,blockedVoice=null;
 const refreshSoundPrompt=window.RiftSoundActivation?.({
  needed:()=>!!blockedVoice&&!brief.hidden,
  skip:target=>!!target?.closest?.('a[href], button'),
  start:()=>{if(blockedVoice)tryVoice(blockedVoice);}
 });
 const resetAudio=audio=>{if(audio){audio.pause();audio.currentTime=0;}};
 function clearBlockedVoice(){voiceAttempt++;blockedVoice=null;refreshSoundPrompt?.();}
 const stopVoice=()=>{clearBlockedVoice();resetAudio(voice);resetAudio(wingVoice);};
 function tryVoice(clip){
  clearBlockedVoice();
  const attempt=voiceAttempt;
  const failed=error=>{
   if(attempt===voiceAttempt&&!brief.hidden&&error?.name==='NotAllowedError'){
    blockedVoice=clip;refreshSoundPrompt?.();
   }
  };
  try{clip.play()?.catch(failed);}catch(error){failed(error);}
 }
 const playVoice=()=>{if(voice){voice.currentTime=0;tryVoice(voice);}};
 const playWingLine=()=>{
  if(!wingVoice||brief.hidden||shown!==wing)return;
  clearBlockedVoice();resetAudio(wingVoice);
  const path=wingLines[wingParagraph][1];
  if(!path){wingVoice.removeAttribute('src');return;}
  if(wingVoice.getAttribute('src')!==path)wingVoice.setAttribute('src',path);
  tryVoice(wingVoice);
 };
 wingNext?.addEventListener('click',()=>{
  if(brief.hidden||shown!==wing||!moreWingBriefing())return;
  wingParagraph++;render();playWingLine();
  if(!moreWingBriefing())(accept&&!accept.hidden?accept:wingReplay)?.focus();
 });
 wingReplay?.addEventListener('click',playWingLine);
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
  const generation=log?.generation(),stage=phase(),card=missionCards.get(stage),mission=missionFor(stage);
  const status=get('mission-status'),next=get('mission-next');
  const shop=get('mission-shop'),hangar=get('mission-hangar');
  const combat=!!card,isWing=stage===wing;
  const title=get('mission-title'),kicker=get('mission-kicker'),orders=get('mission-orders');
  title.textContent=titleFor(stage);
  if(kicker)kicker.textContent=isWing?'Pegasus crew mission':card?.rank?'Pilot rank qualification':card?'Combat mission '+card.number:'Starter mission 01';
  if(orders)orders.textContent=isWing?wingLines[wingParagraph][0]:card?.order??starterOrders;
  if(wingControls)wingControls.hidden=!isWing;
  if(wingStep&&isWing)wingStep.textContent='Written orders · Paragraph '+(wingParagraph+1)+' of '+wingLines.length;
  if(wingNext)wingNext.hidden=!isWing||!moreWingBriefing();
  if(wingReplay)wingReplay.hidden=!isWing||!wingLines[wingParagraph][1];
  renderPicker(stage);
  if(lodge){lodge.hidden=true;lodge.textContent=combat?'Turn in mission':'Lodge mission completion';}
  if(accept)accept.hidden=!(combat||isWing)||!!mission;
  if(crew)crew.hidden=!isWing||!mission||!!mission.completedAt;
  if(launch){
   launch.hidden=isWing?!mission?.completedAt:!combat||!mission||!!mission.victoryAt&&!mission.lodgedAt;
   launch.textContent='Go to Hangar';
   const path='./index.html?hangar=carrier&order='+encodeURIComponent(stage);
   launch.setAttribute('href',vessel?.href(path)??path);
  }
  // Combat and wing briefings use only the staged Hangar link so the accepted
  // order stays attached. The generic detour is for the outfitting checklist.
  const outfit=stage==='starter';
  parts.hidden=shop.hidden=hangar.hidden=!outfit;
  if(isWing){
   const met=Number(!!mission?.met.aya)+Number(!!mission?.met.ellis);
   status.textContent=mission?.completedAt?'Wing formed':mission?met+'/2 pilots met':'Mission available';
   next.textContent=mission?.completedAt?'You, Leena and Tomas are ready to fly as a three-pilot wing. Board your fighter in the Hangar to launch.':mission?
    'Visit the Crew Quarters and talk to both pilots. Check the different rooms: they won’t both be in the same place.':
    'Accept the mission, then go to the Crew Quarters to find Leena and Tomas.';
   return;
  }
  if(stage==='none')return;
  if(combat){
   status.textContent=mission?.lodgedAt?card.rank+' badge earned':mission?.victoryAt?'Ready to turn in':mission?'Mission accepted':'Mission available';
   next.textContent=mission?.lodgedAt?'You can fly this sortie again any time.':mission?.victoryAt?'All six waves cleared. Report your victory to Admiral Bishop.':
    mission?'Board your fighter in the Hangar to launch. If it was destroyed, repair it there first.':'Accept the mission before launching. Practice or an earlier victory does not count.';
   if(mission?.victoryAt&&!mission.lodgedAt&&lodge)lodge.hidden=generation===undefined;
   return {generation,mission};
  }
  const wallet=window.RiftCredits?.getBuildState?.(),catalog=window.RiftCredits?.getCatalog?.();
  shop.removeAttribute('data-next');hangar.removeAttribute('data-next');parts.replaceChildren();
  if(!wallet?.origin||!Array.isArray(catalog)){
   status.textContent='Saved progress is unavailable.';
   next.textContent='Open the game in the same browser where you bought your parts.';
   return;
  }
  const fitCategory=(part,category)=>part.category===category&&(category!=='weapon'||(part.size??3)===3);
  const hull=load(keys.hull),build=load(keys.build);
  const savedFit=build?.version===1&&build.hull==='rift-fighter'?build:null;
  const repaired=hull?.version===1&&hull.hull==='rift-fighter'&&hull.condition==='repaired'||
   !hull&&(wallet.origin==='legacy'||Boolean(savedFit&&goals.some(([slot,category])=>
    catalog.some(p=>p.id===savedFit[slot]&&fitCategory(p,category)&&wallet.owned.includes(p.id)))));
  const legacyFit=load(keys.fit),legacyEngine=load(keys.engine);
  const legacySlot=(slot,fallback)=>{
   const record=slot==='engine'?legacyEngine:legacyFit;
   const entry=record?.version===1?record[slot]:null;
   return catalog.some(p=>p.id===entry&&fitCategory(p,slot==='engine'?'engine':'weapon'))?entry:fallback;
  };
  const fit=repaired?(savedFit??(wallet.origin==='legacy'?{
   engine:legacySlot('engine','stock-thruster'),core:'weifer-he3-core',
   battery:'kestrel-h20-reserve-cell',primary:legacySlot('primary','blaster')
  }:{})):{};
  let owned=0,fitted=0,firstMissing;
  for(const [slot,category,fallback] of goals){
   const options=catalog.filter(p=>fitCategory(p,category)),owns=p=>wallet.owned.includes(p.id);
   const fittedPart=options.find(p=>p.id===fit[slot]&&owns(p));
   const part=fittedPart??options.find(p=>p.id===fallback&&owns(p))??options.find(owns)??options.find(p=>p.id===fallback);
   if(!part)continue;
   const hasPart=owns(part);
   if(hasPart)owned++;else firstMissing??=part;
   if(fittedPart)fitted++;
   const row=document.createElement('li'),name=document.createElement('span'),state=document.createElement('span');
   row.dataset.owned=String(hasPart);name.className='part-name';name.textContent=part.name+(category==='weapon'?' · Size 3':'');
   state.className='part-state';state.textContent=fittedPart?'Fitted':hasPart?'Owned':part.price+' credits';
   row.append(name,state);parts.append(row);
  }
  const ready=fitted===goals.length;
  status.textContent=ready?'Ready to turn in':owned+'/'+goals.length+' acquired · '+fitted+'/'+goals.length+' fitted';
  if(ready){
   next.textContent='All four parts are fitted. Lodge the mission with Admiral Bishop.';
   if(lodge)lodge.hidden=generation===undefined;
  }else if(firstMissing){
   next.textContent='Next: get '+firstMissing.name+(firstMissing.category==='weapon'?' (Size 3)':'')+' from Mara.';
   shop.dataset.next='true';
  }else{
   next.textContent=repaired?'Next: fit your parts in the Hangar.':'Next: claim or repair your Rift-3 in the Hangar, then fit your parts.';
   hangar.dataset.next='true';
  }
  return {ready,generation};
 }
 accept?.addEventListener('click',()=>{
  const stage=phase();
  if(brief.hidden||shown!==stage||stage!==wing&&!missionCards.has(stage)||missionFor(stage))return;
  const gen=stage===wing?rendezvous.generation():log.generation();
  const receipt=stage===wing?rendezvous.accept(gen):stage==='intercept'?log.acceptIntercept(gen):log.acceptQualification(stage,gen);
  if(!receipt){get('mission-next').textContent='Could not accept the mission in this browser. Try again.';return;}
  render();(stage===wing?crew:launch)?.focus();
 });
 lodge?.addEventListener('click',()=>{
  if(brief.hidden||shown!==phase())return;
  const progress=render(),card=missionCards.get(shown),combat=!!card;
  if(combat?(!progress?.mission?.victoryAt||progress.mission.lodgedAt):!progress?.ready)return;
  const receipt=!combat?log?.lodgeStarter(progress.generation):shown==='intercept'?
   log.lodgeIntercept(progress.generation,progress.mission.acceptedAt):
   log.lodgeQualification(shown,progress.generation,progress.mission.acceptedAt);
  if(!receipt){get('mission-next').textContent='Could not save the mission in this browser. Try again.';return;}
  refresh();get('bridge-title').focus({preventScroll:true});
  notice.textContent=card?.rank?card.rank+' badge saved to your Pilot Profile.':'Completion saved to your Pilot Profile.';
 });
 selector?.addEventListener('change',()=>{
  if(brief.hidden||!choices().includes(selector.value))return;
  if(shown===selector.value)return;
  stopVoice();selected=selector.value;showBrief(true);render();
  if(shown===wing)playWingLine();
 });
 captain.addEventListener('click',()=>{
  if(captain.hidden||phase()==='none'){refresh();return;}
  notice.textContent='';
  const opening=brief.hidden;
  showBrief(opening);
  if(opening){
   if(shown==='starter')playVoice();
   render();
   if(shown===wing)playWingLine();
   get('mission-title').focus();
  }else stopVoice();
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
