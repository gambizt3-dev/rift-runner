'use strict';
(() => {
 const conversation=document.getElementById('shop-conversation'),trigger=document.getElementById('shop-talk-trigger');
 const topics=document.getElementById('shop-talk-topics'),reply=document.getElementById('shop-talk-reply');
 if(!conversation||!trigger||!topics||!reply)return;
 const responses={
  engines:'“Here are the two drives you can fit in the Hangar. Compare their speed and weight below. They’re not for sale.”',
  weapons:'“These are the fighter’s three weapon modules. Compare damage and firing patterns below. None are for sale.”',
  shields:'“The Aegis S-3 gives you a short shield burst. Fit it in the Hangar.”'
 };
 const greeting=reply.textContent;
 const catalogs={engines:document.getElementById('shop-catalog-engines'),weapons:document.getElementById('shop-catalog-weapons'),shields:document.getElementById('shop-catalog-shields')};
 const buttons=Array.from(topics.querySelectorAll('button[data-topic]'));
 function respond(topic){
  reply.textContent=topic?responses[topic]:greeting;
  for(const button of buttons)button.setAttribute('aria-pressed',String(button.dataset.topic===topic));
  for(const [key,panel] of Object.entries(catalogs))if(panel){
   panel.hidden=key!==topic;
   if(!panel.hidden)panel.scrollTop=0;
  }
 }
 for(const button of buttons)button.addEventListener('click',()=>{
  const topic=button.dataset.topic;
  if(conversation.open&&Object.hasOwn(responses,topic))respond(topic);
 });
 conversation.addEventListener('toggle',()=>{if(!conversation.open)respond(null);});
 conversation.addEventListener('keydown',event=>{
  if(!conversation.open||event.key!=='Escape')return;
  event.preventDefault();conversation.open=false;respond(null);trigger.focus();
 });
 topics.hidden=false;
})();
