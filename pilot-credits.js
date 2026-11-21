'use strict';
(() => {
 const key='rift-runner.pilot-credits.v1',reward=20,maxBalance=999999999;
 function getBalance(){
  try{
   const stored=window.localStorage.getItem(key);
   if(stored===null)return 0;
   if(typeof stored!=='string'||!/^(0|[1-9][0-9]{0,8})$/.test(stored))return null;
   const balance=Number(stored);
   return Number.isSafeInteger(balance)&&balance>=0&&balance<=maxBalance?balance:null;
  }catch{return null;}
 }
 function awardVictory(){
  const balance=getBalance();
  const failed={saved:false,amount:0,balance:null};
  if(balance===null||balance>maxBalance-reward)return failed;
  const next=balance+reward;
  try{
   window.localStorage.setItem(key,String(next));
   if(window.localStorage.getItem(key)!==String(next))return failed;
  }catch{return failed;}
  refreshBadge(next);
  return {saved:true,amount:reward,balance:next};
 }
 function refreshBadge(balance){
  const holder=document.getElementById('carrier-pilot-credits'),value=document.getElementById('carrier-credit-value');
  if(!holder||!value)return;
  const next=balance===null?'Unavailable':balance.toLocaleString('en-US');
  if(value.textContent!==next)value.textContent=next;
  holder.hidden=false;
 }
 window.RiftCredits=Object.freeze({getBalance,awardVictory});
 const refresh=()=>{
  if(document.getElementById('carrier-pilot-credits'))refreshBadge(getBalance());
 };
 window.addEventListener?.('pageshow',refresh);
 window.addEventListener?.('storage',event=>{if(event.key===key||event.key===null)refresh();});
 refresh();
})();
