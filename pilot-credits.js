'use strict';
(() => {
 const key='rift-runner.pilot-credits.v1',reward=20,maxBalance=999999999,aegisPrice=200;
 const validBalance=value=>Number.isSafeInteger(value)&&value>=0&&value<=maxBalance;
 function readWallet(){
  try{
   const stored=window.localStorage.getItem(key);
   if(stored===null)return {balance:0,aegis:false};
   if(typeof stored!=='string')return null;
   if(/^(0|[1-9][0-9]{0,8})$/.test(stored))return {balance:Number(stored),aegis:false};
   const w=JSON.parse(stored);
   if(w?.version!==2||w.aegis!==true||!validBalance(w.balance))return null;
   return {balance:w.balance,aegis:true};
  }catch{return null;}
 }
 const getBalance=()=>readWallet()?.balance??null;
 const ownsAegis=()=>readWallet()?.aegis===true;
 function saveWallet(balance,aegis){
  const data=aegis?JSON.stringify({version:2,balance,aegis:true}):String(balance);
  try{
   window.localStorage.setItem(key,data);
   if(window.localStorage.getItem(key)!==data)return false;
  }catch{return false;}
  refreshBadge(balance);
  return true;
 }
 function awardVictory(){
  const w=readWallet(),failed={saved:false,amount:0,balance:null};
  if(!w||w.balance>maxBalance-reward)return failed;
  const next=w.balance+reward;
  if(!saveWallet(next,w.aegis))return failed;
  return {saved:true,amount:reward,balance:next};
 }
 function buyAegis(){
  const w=readWallet();
  if(!w)return {status:'unavailable'};
  if(w.aegis)return {status:'owned',balance:w.balance};
  if(w.balance<aegisPrice)return {status:'insufficient',balance:w.balance};
  const balance=w.balance-aegisPrice;
  return saveWallet(balance,true)?{status:'purchased',balance}:{status:'unavailable'};
 }
 function refreshBadge(balance){
  const holder=document.getElementById('carrier-pilot-credits'),value=document.getElementById('carrier-credit-value');
  if(!holder||!value)return;
  const next=balance===null?'Unavailable':balance.toLocaleString('en-US');
  if(value.textContent!==next)value.textContent=next;
  holder.hidden=false;
 }
 window.RiftCredits=Object.freeze({getBalance,awardVictory,ownsAegis,buyAegis,aegisPrice});
 const refresh=()=>{
  if(document.getElementById('carrier-pilot-credits'))refreshBadge(getBalance());
 };
 window.addEventListener?.('pageshow',refresh);
 window.addEventListener?.('storage',event=>{if(event.key===key||event.key===null)refresh();});
 refresh();
})();
