'use strict';
(() => {
 const conversation=document.getElementById('shop-conversation'),trigger=document.getElementById('shop-talk-trigger');
 const topics=document.getElementById('shop-talk-topics'),voice=document.getElementById('shop-mara-voice');
 const scene=document.getElementById('shop-scene'),plate=document.getElementById('shop-clean-plate'),back=document.getElementById('shop-camera-back');
 if(!conversation||!trigger||!topics||!scene||!back)return;
 const wideView=window.matchMedia?.('(min-aspect-ratio: 5/4)');
 // Both the visual cutout and the tap target are defined in source-image pixels.
 const art={
  portrait:{width:1024,height:1536,x:517,y:624,zoom:2.18,box:[398,582,634,779],
   cut:[[397,775],[422,758],[433,757],[450,730],[458,709],[464,688],[471,673],[488,664],[493,659],
    [484,644],[484,620],[492,599],[508,583],[532,583],[546,593],[552,611],[554,634],[550,649],
    [548,662],[568,667],[581,679],[587,703],[593,728],[608,756],[628,760],[635,774],[613,776],[584,774],[528,773],[470,774],[437,779],[406,779]]},
  landscape:{width:1536,height:1024,x:771,y:468,zoom:2.06,box:[685,441,860,600],
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
  const [l,t,r,b]=f.box,bw=Math.max(44,(r-l)*fit),bh=Math.max(44,(b-t)*fit);
  const values={
   x:unit(clamp(x((l+r)/2)-bw/2,0,Math.max(0,w-bw))),
   y:unit(clamp(y((t+b)/2)-bh/2,0,Math.max(0,h-bh))),w:unit(bw),h:unit(bh),
   'pan-x':unit(clamp(w*.5-x(f.x)*f.zoom,w*(1-f.zoom),0)),
   'pan-y':unit(clamp(h*.38-y(f.y)*f.zoom,h*(1-f.zoom),0)),
   zoom:String(f.zoom),outline:'polygon('+f.cut.map(([cx,cy])=>unit(x(cx))+' '+unit(y(cy))).join(', ')+')'
  };
  for(const [k,value] of Object.entries(values))scene.style.setProperty('--mara-'+k,value);
  scene.dataset.composite=String(plate?.complete===true&&plate.naturalWidth===f.width&&plate.naturalHeight===f.height);
  trigger.hidden=false;
 }
 layoutCamera();
 window.addEventListener?.('resize',layoutCamera);
 wideView?.addEventListener?.('change',layoutCamera);
 plate?.addEventListener?.('load',layoutCamera);
 plate?.addEventListener?.('error',layoutCamera);
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
 const catalogs={engines:document.getElementById('shop-catalog-engines'),weapons:document.getElementById('shop-catalog-weapons'),shields:document.getElementById('shop-catalog-shields')};
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
  else{stopVoice();selectTopic(null);trigger.focus({preventScroll:true});}
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
 const purchase=document.getElementById('shop-aegis-purchase'),buy=document.getElementById('shop-buy-aegis');
 const status=document.getElementById('shop-aegis-status'),wallet=typeof window!=='undefined'?window.RiftCredits:null;
 if(purchase&&buy&&status&&wallet){
  const format=n=>n.toLocaleString('en-US');
  function updatePurchase(){
   const balance=wallet.getBalance(),owned=wallet.ownsAegis(),price=wallet.aegisPrice;
   buy.textContent=owned?'Owned':'Buy · '+format(price)+' credits';
   buy.disabled=owned||balance===null||balance<price;
   status.textContent=owned?'Ready to fit in the Hangar.':balance===null?'Credits unavailable.':
    balance<price?'Need '+format(price-balance)+' more '+(price-balance===1?'credit.':'credits.'):'';
  }
  buy.addEventListener('click',()=>{
   const result=wallet.buyAegis();
   updatePurchase();
   if(result.status==='unavailable')status.textContent='Could not save. No purchase confirmed.';
   if(result.status==='purchased')status.textContent='Purchased. Fit it in the Hangar.';
  });
  window.addEventListener?.('pageshow',updatePurchase);
  window.addEventListener?.('storage',updatePurchase);
  updatePurchase();
  purchase.hidden=false;
 }
})();
