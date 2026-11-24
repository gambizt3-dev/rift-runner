'use strict';
(() => {
 const key='rift-runner.pilot-credits.v1',reward=20,killReward=2.5,maxBalance=999999999,startingBalance=250;
 const generationKey='rift-runner.character-generation.v1';
 const catalog=Object.freeze([
  {id:'stock-thruster',name:'Stock thruster',category:'engine',price:70},
  {id:'test-thruster',name:'Test thruster',category:'engine',price:45},
  {id:'surge-7-thruster',name:'Surge-7 thruster',category:'engine',price:280,requiresPurchase:true},
  {id:'weifer-he3-core',name:'Weifer He3 Generator Core',category:'core',price:60},
  {id:'kestrel-h20-reserve-cell',name:'Kestrel H20 Reserve Cell',category:'battery',price:40},
  {id:'blaster',name:'Sterling C.32 Laser',category:'weapon',price:45},
  {id:'ballistic',name:'A-Alkine Ballistic Repeater',category:'weapon',price:80},
  {id:'ak77',name:'AK77 Gatling Ballistic',category:'weapon',price:130},
  {id:'aegis-s3',name:'Aegis S-3 Shield Generator',category:'shield',price:200}
 ].map(Object.freeze));
 const hullCatalog=Object.freeze([
  {id:'stocky-light-fighter',name:'Stocky Light Fighter',category:'hull',price:325},
  {id:'bastion-9',name:'Bastion-9 Fleet Fighter',category:'hull',price:475}
 ].map(Object.freeze));
 const modules=new Map(catalog.map(part=>[part.id,part]));
 const hulls=new Map(hullCatalog.map(hull=>[hull.id,hull]));
 const aegisId='aegis-s3',aegisPrice=modules.get(aegisId).price;
 const requiredCategories=Object.freeze(['engine','core','battery','weapon']);
 const minimumByCategory=new Map(requiredCategories.map(category=>[
  category,Math.min(...catalog.filter(part=>part.category===category).map(part=>part.price))
 ]));
 const legacyFreeParts=catalog.filter(part=>part.category!=='shield'&&!part.requiresPurchase).map(part=>part.id);
 const legacyFitKey='rift-runner.fighter-fit.v1',legacyEngineKey='rift-runner.engine-fit.v1',legacyShotKey='rift-runner.shot-sound.v1';
 const validOrigins=new Set(['new','legacy']);
 const validBalance=value=>typeof value==='number'&&Number.isSafeInteger(value*2)&&value>=0&&value<=maxBalance;
 const validKills=value=>Number.isSafeInteger(value)&&value>=0;
 const isCategory=(id,category)=>modules.get(id)?.category===category;
 const failedReward=()=>({saved:false,amount:0,balance:null});
 const parseJSON=value=>{try{return typeof value==='string'?JSON.parse(value):null;}catch{return null;}};
 function hasLegacyFit(storage){
  const fit=parseJSON(storage.getItem(legacyFitKey));
  if(fit?.version===1&&isCategory(fit.primary,'weapon'))return true;
  const engine=parseJSON(storage.getItem(legacyEngineKey));
  if(engine?.version===1&&isCategory(engine.engine,'engine')&&!modules.get(engine.engine).requiresPurchase)return true;
  return isCategory(storage.getItem(legacyShotKey),'weapon');
 }
 const legacyWallet=(balance,hasAegis)=>({
  version:3,origin:'legacy',balance,kills:0,owned:hasAegis?[...legacyFreeParts,aegisId]:[...legacyFreeParts]
 });
 const newWallet=()=>({version:3,origin:'new',balance:startingBalance,kills:0,owned:[]});
 function decodeWallet(stored){
  if(typeof stored!=='string')return null;
  if(/^(0|[1-9][0-9]{0,8})$/.test(stored))return legacyWallet(Number(stored),false);
  const data=parseJSON(stored);
  if(!data||!validBalance(data.balance))return null;
  if(data.version===2&&data.aegis===true&&Number.isSafeInteger(data.balance))return legacyWallet(data.balance,true);
  const kills=Object.hasOwn(data,'kills')?data.kills:0;
  if(data.version!==3||!validOrigins.has(data.origin)||!validKills(kills)||!Array.isArray(data.owned)||
    data.owned.length>128||!data.owned.every(id=>typeof id==='string'&&/^[a-z0-9][a-z0-9-]{0,63}$/.test(id))||
    new Set(data.owned).size!==data.owned.length)return null;
  // Keep well-formed unknown future module IDs without giving them any current privileges.
  return {version:3,origin:data.origin,balance:data.balance,kills,owned:data.owned};
 }
 function readRecord(){
  try{
   const storage=window.localStorage,raw=storage.getItem(key);
   if(raw!==null){
    const wallet=decodeWallet(raw);
    return wallet?{storage,raw,wallet}:null;
   }
   return {storage,raw,wallet:hasLegacyFit(storage)?legacyWallet(0,false):newWallet()};
  }catch{return null;}
 }
 function saveWallet(record,wallet,expectedGeneration){
  const data=JSON.stringify(wallet);
  try{
   // Update the balance and inventory in one localStorage record, never two writes.
   // The precheck detects an intervening tab update but is not cross-tab locking.
   if(record.storage.getItem(key)!==record.raw)return false;
   if(expectedGeneration!==undefined&&(record.storage.getItem(generationKey)??null)!==expectedGeneration)return false;
   record.storage.setItem(key,data);
   if(record.storage.getItem(key)!==data)return false;
  }catch{return false;}
  refreshBadge(wallet.balance);
  try{window.dispatchEvent?.(new Event('rift:walletchange'));}catch{}
  return true;
 }
 const getCatalog=()=>catalog,getHullCatalog=()=>hullCatalog;
 const getOwnedHullIds=()=>readRecord()?.wallet.owned.filter(id=>hulls.has(id))??[];
 const ownsHull=id=>hulls.has(id)&&getOwnedHullIds().includes(id);
 const getBalance=()=>readRecord()?.wallet.balance??null;
 const owns=id=>modules.has(id)&&(readRecord()?.wallet.owned.includes(id)??false);
 const ownsAegis=()=>owns(aegisId);
 function requiredReserve(owned){
  const categories=new Set(owned.map(id=>modules.get(id)?.category));
  return requiredCategories.reduce((total,category)=>total+(categories.has(category)?0:minimumByCategory.get(category)),0);
 }
 function getBuildState(){
  const w=readRecord()?.wallet;
  if(!w)return {balance:null,owned:[],origin:null,kills:null,requiredReserve:null,canBuild:false};
  const reserve=requiredReserve(w.owned);
  return {balance:w.balance,owned:w.owned.filter(id=>modules.has(id)),origin:w.origin,kills:w.kills,requiredReserve:reserve,canBuild:reserve===0};
 }
 function quotePurchase(w,id){
  const part=modules.get(id)??hulls.get(id);
  if(!w)return {status:'unavailable'};
  if(!part)return {status:'unknown',balance:w.balance};
  const quote={balance:w.balance,price:part.price,requiredReserve:requiredReserve([...w.owned,id])};
  if(w.owned.includes(id))return {status:'owned',...quote};
  if(w.balance<part.price)return {status:'insufficient',...quote};
  if(w.balance-part.price<quote.requiredReserve)return {status:'reserved',...quote};
  if(w.owned.length>=128)return {status:'unavailable'};
  return {status:'available',...quote};
 }
 const canBuy=id=>quotePurchase(readRecord()?.wallet,id);
 function buy(id){
  let generation;
  if(hulls.has(id))try{generation=window.localStorage.getItem(generationKey)??null;}
  catch{return {status:'unavailable'};}
  const record=readRecord(),q=quotePurchase(record?.wallet,id);
  if(q.status!=='available')return q;
  const balance=q.balance-q.price;
  const next={...record.wallet,balance,owned:[...record.wallet.owned,id]};
  return saveWallet(record,next,generation)?{status:'purchased',balance,price:q.price}:{status:'unavailable'};
 }
 function buyAegis(){
  const result=buy(aegisId);
  // Original callers only knew a generic insufficient status; the new catalog
  // can show the reserve reason to pilots who use canBuy()/buy().
  const status=result.status==='reserved'?'insufficient':result.status;
  return result.balance===undefined?{status}:{status,balance:result.balance};
 }
 function awardVictory(expectedGeneration){
  const record=readRecord(),w=record?.wallet;
  if(!w||w.balance>maxBalance-reward)return failedReward();
  const balance=w.balance+reward;
  return saveWallet(record,{...w,balance},expectedGeneration)?{saved:true,amount:reward,balance}:failedReward();
 }
 function recordEnemyKill(expectedGeneration){
  const record=readRecord(),w=record?.wallet,failed={saved:false,kills:null};
  if(!w||w.kills>=Number.MAX_SAFE_INTEGER||w.balance>maxBalance-killReward)return failed;
  const kills=w.kills+1;
  return saveWallet(record,{...w,kills,balance:w.balance+killReward},expectedGeneration)?{saved:true,kills,amount:killReward}:failed;
 }
 function refreshBadge(balance){
  const holder=document.getElementById('carrier-pilot-credits'),value=document.getElementById('carrier-credit-value');
  if(!holder||!value)return;
  const next=balance===null?'Unavailable':balance.toLocaleString('en-US');
  if(value.textContent!==next)value.textContent=next;
  holder.hidden=false;
 }
 // Decide new-vs-legacy before launch/fitting handlers on this page can write their
 // own preferences. A failed bootstrap is read-only until the next successful write.
 window.RiftCredits=Object.freeze({getBalance,awardVictory,ownsAegis,buyAegis,aegisPrice,getCatalog,getHullCatalog,getOwnedHullIds,ownsHull,getBuildState,owns,canBuy,buy,recordEnemyKill});
 const initial=readRecord();
 const customFlight=/^\?launch=custom&(?:fighter|hull)=(?:bastion-9|stocky-light-fighter|rift-fighter)&vessel=(?:rift-carrier|bifrost)(?:&from=shop)?$/.test(window.location?.search??'');
 const trialShop=window.location?.pathname==='/carrier-shop.html'&&/^\?vessel=(?:rift-carrier|bifrost)&view=fighters$/.test(window.location.search);
 if(!customFlight&&!trialShop&&initial?.raw===null&&!document.currentScript?.hasAttribute?.('data-read-only'))saveWallet(initial,initial.wallet);
 const refresh=()=>{
  if(document.getElementById('carrier-pilot-credits'))refreshBadge(getBalance());
 };
 window.addEventListener?.('pageshow',refresh);
 window.addEventListener?.('storage',event=>{if(event.key===key||event.key===null)refresh();});
 if(document.getElementById('carrier-pilot-credits'))refreshBadge(initial?.wallet.balance??null);
})();
