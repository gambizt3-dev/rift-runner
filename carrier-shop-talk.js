'use strict';
(() => {
 const conversation=document.getElementById('shop-conversation'),trigger=document.getElementById('shop-talk-trigger');
 const topics=document.getElementById('shop-talk-topics'),voice=document.getElementById('shop-mara-voice');
 const scene=document.getElementById('shop-scene'),plate=document.getElementById('shop-clean-plate'),sprite=document.getElementById('shop-mara-sprite'),back=document.getElementById('shop-camera-back');
 if(!conversation||!trigger||!topics||!scene||!back)return;
 const wideView=window.matchMedia?.('(min-aspect-ratio: 5/4)');
 // All boxes and face anchors use clean-plate source pixels.
 // A tighter sprite uses its real aspect ratio, contained and bottom-aligned
 // to spriteBox. Adjust the bottom edge of spriteBox to seat the hands.
 const art={
  portrait:{width:1024,height:1536,x:517,y:624,zoom:2.18,box:[398,582,634,779],
   sprite:'mara-portrait.webp',spriteBox:[398,578,634,775],
   cut:[[397,775],[422,758],[433,757],[450,730],[458,709],[464,688],[471,673],[488,664],[493,659],
    [484,644],[484,620],[492,599],[508,583],[532,583],[546,593],[552,611],[554,634],[550,649],
    [548,662],[568,667],[581,679],[587,703],[593,728],[608,756],[628,760],[635,774],[613,776],[584,774],[528,773],[470,774],[437,779],[406,779]]},
  landscape:{width:1536,height:1024,x:771,y:468,zoom:2.06,box:[685,441,860,600],
   sprite:'mara-wide.webp',spriteBox:[685,438,860,597],
   cut:[[686,602],[694,590],[716,583],[727,563],[735,521],[742,509],[750,506],[757,499],
    [753,490],[750,476],[754,459],[765,446],[781,444],[792,450],[800,464],[799,479],[797,490],
    [790,501],[802,506],[813,512],[824,540],[831,570],[841,586],[856,592],[860,602],[832,602],[776,600],[715,603]]}
 };
 const clamp=(n,min,max)=>Math.min(max,Math.max(min,n));
 function layoutCamera(){
  const w=scene.clientWidth,h=scene.clientHeight;
  if(!(w>0&&h>0))return;
  const f=art[wideView?.matches?'landscape':'portrait'];
  const fit=Math.max(w/f.width,h/f.height),x0=(w-f.width*fit)*.5,y0=(h-f.height*fit)*.54;
  const x=n=>x0+n*fit,y=n=>y0+n*fit;
  const unit=n=>Math.round(n*1000)/1000+'px';
  const cleanReady=plate?.complete===true&&plate.naturalWidth===f.width&&plate.naturalHeight===f.height;
  const loadedSprite=(sprite?.currentSrc||'').split(/[?#]/,1)[0].split('/').pop();
  const sharp=cleanReady&&sprite?.complete===true&&sprite.naturalWidth>0&&sprite.naturalHeight>0&&loadedSprite===f.sprite;
  const [sl,st,sr,sb]=f.spriteBox;
  const [l,t,r,b]=sharp?f.spriteBox:f.box,bw=Math.max(44,(r-l)*fit),bh=Math.max(44,(b-t)*fit);
  const values={
   x:unit(clamp(x((l+r)/2)-bw/2,0,Math.max(0,w-bw))),
   y:unit(clamp(y((t+b)/2)-bh/2,0,Math.max(0,h-bh))),w:unit(bw),h:unit(bh),
   'pan-x':unit(clamp(w*.5-x(f.x)*f.zoom,w*(1-f.zoom),0)),
   'pan-y':unit(clamp(h*.38-y(f.y)*f.zoom,h*(1-f.zoom),0)),
   'sprite-x':unit(x(sl)),'sprite-y':unit(y(st)),'sprite-w':unit((sr-sl)*fit),'sprite-h':unit((sb-st)*fit),
   zoom:String(f.zoom),outline:'polygon('+f.cut.map(([cx,cy])=>unit(x(cx))+' '+unit(y(cy))).join(', ')+')'
  };
  for(const [k,value] of Object.entries(values))scene.style.setProperty('--mara-'+k,value);
  scene.dataset.composite=String(cleanReady);
  scene.dataset.foreground=sharp?'sharp':'legacy';
  trigger.hidden=false;
 }
 layoutCamera();
 window.addEventListener?.('resize',layoutCamera);
 wideView?.addEventListener?.('change',layoutCamera);
 plate?.addEventListener?.('load',layoutCamera);
 plate?.addEventListener?.('error',layoutCamera);
 sprite?.addEventListener?.('load',layoutCamera);
 sprite?.addEventListener?.('error',layoutCamera);
 function stopVoice(){
  if(!voice)return;
  voice.pause();
  try{voice.currentTime=0;}catch{}
 }
 function playVoice(){
  if(!voice||document.hidden)return;
  stopVoice();
  try{voice.play()?.catch(()=>{});}catch{}
 }
 document.addEventListener?.('visibilitychange',()=>{if(document.hidden)stopVoice();});
 window.addEventListener?.('pagehide',stopVoice);
 const catalogs={fighters:document.getElementById('shop-catalog-fighters'),engines:document.getElementById('shop-catalog-engines'),weapons:document.getElementById('shop-catalog-weapons'),shields:document.getElementById('shop-catalog-shields'),power:document.getElementById('shop-catalog-power')};
 const status=document.getElementById('shop-sale-status'),fitNext=document.getElementById('shop-fit-next');
 const buttons=Array.from(topics.querySelectorAll('button[data-topic]'));
 function selectTopic(topic){
  for(const button of buttons)button.setAttribute('aria-pressed',String(button.dataset.topic===topic));
  for(const [key,panel] of Object.entries(catalogs))if(panel){
   panel.hidden=key!==topic;
   if(!panel.hidden)panel.scrollTop=0;
  }
 }
 function setFocus(on){
  scene.dataset.focus=String(on);
  conversation.hidden=!on;
  trigger.setAttribute('aria-expanded',String(on));
  trigger.setAttribute('aria-label',on?'End conversation with Mara Venn':'Talk to Mara Venn, quartermaster');
  if(on)back.focus({preventScroll:true});
  else{
   stopVoice();selectTopic(null);
   if(status)status.textContent='';
   if(fitNext)fitNext.hidden=true;
   trigger.focus({preventScroll:true});
  }
 }
 trigger.addEventListener('click',event=>{
  if(document.hidden)return;
  if(!conversation.hidden){setFocus(false);return;}
  // Keep playback in the original trusted pointer/keyboard click (iOS activation).
  if(event.isTrusted===true)playVoice();
  setFocus(true);
 });
 back.addEventListener('click',()=>setFocus(false));
 document.addEventListener?.('keydown',event=>{
  if(conversation.hidden||event.key!=='Escape')return;
  event.preventDefault();setFocus(false);
 });
 for(const button of buttons)button.addEventListener('click',()=>{
  const topic=button.dataset.topic;
  if(!conversation.hidden&&Object.hasOwn(catalogs,topic))selectTopic(topic);
 });
 const testVessel=window.RiftVessel?.id==='bifrost'?'bifrost':'rift-carrier';
 for(const link of document.querySelectorAll?.('a[data-shop-test]')??[]){
  const id=link.dataset.shopTest;
  if(id==='stocky-light-fighter'||id==='bastion-9')
   link.setAttribute('href','./index.html?launch=custom&fighter='+id+'&vessel='+testVessel+'&from=shop');
 }
 if((window.location?.search??'').slice(1).split('&').includes('view=fighters')&&catalogs.fighters){
  setFocus(true);selectTopic('fighters');
 }
 const wallet=window.RiftCredits;
 const sales=Array.from(document.querySelectorAll?.('button[data-shop-buy]')??[]);
 if(wallet?.getCatalog&&wallet?.canBuy&&wallet?.buy){
  const catalog=new Map([...wallet.getCatalog(),...(wallet.getHullCatalog?.()??[])].map(part=>[part.id,part]));
  const format=n=>n.toLocaleString('en-US');
  const refresh=()=>{
   for(const buy of sales){
    const id=buy.dataset.shopBuy,part=catalog.get(id),quote=wallet.canBuy(id);
    if(!part)continue;
    const counted=Number.isSafeInteger(part.maxQuantity),cost=format(part.price)+' credits';
    buy.textContent=counted?(quote.status==='limit'?'Owned · '+quote.quantity+' / '+part.maxQuantity:'Buy one · '+cost):
     quote.status==='owned'?'Owned · '+cost:'Buy · '+cost;
    buy.setAttribute('aria-label',(quote.status==='owned'||quote.status==='limit'?'Owned: ':counted?'Buy one ':'Buy ')+part.name+' · '+cost);
    buy.disabled=quote.status!=='available';
    const note=buy.parentElement?.querySelector('[data-shop-note]');
    const paid=counted&&Number.isSafeInteger(quote.quantity)?'Paid copies: '+quote.quantity+' / '+part.maxQuantity+'.':'';
    if(note&&['reserved','insufficient'].includes(quote.status)){
     // The listed price excludes the protected credits for the pilot's basic fit.
     const missing=part.price+quote.requiredReserve-quote.balance;
     note.textContent='Need '+format(missing)+' more credit'+(missing===1?'':'s')+
      (quote.requiredReserve>0?' to buy and keep enough for basic parts.':'.')+(paid?' '+paid:'');
    }else if(note)note.textContent=quote.status==='unavailable'?'Credits unavailable.':paid;
   }
  };
  for(const buy of sales)buy.addEventListener('click',()=>{
   const id=buy.dataset.shopBuy,result=wallet.buy(id);
   refresh();
   if(fitNext&&result.status==='purchased')fitNext.hidden=false;
   if(status)status.textContent=result.status==='purchased'?catalog.get(id).name+(catalog.get(id).category==='hull'?' purchased. Select it in the Hangar. Two Sparrow S2 lasers fitted; other modules sold separately.':' purchased. Fit it in the Hangar.'):
    result.status==='unavailable'?'Could not save. No purchase confirmed.':'';
  });
  for(const event of ['pageshow','storage','rift:walletchange'])window.addEventListener?.(event,refresh);
  refresh();
 }
})();
