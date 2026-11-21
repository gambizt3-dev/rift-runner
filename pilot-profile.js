'use strict';
(() => {
 const key='rift-runner.pilot-profile.v1', sessionKey='rift-runner.pilot-profile.unlocked.v1';
 const shipKey='rift-runner.ship-build.v1', iterations=310000, byId=id=>document.getElementById(id);
 const form=byId('pilot-callsign-form'), input=byId('pilot-callsign'),pin=byId('pilot-pin');
 const name=byId('pilot-saved-callsign'), feedback=byId('pilot-profile-feedback'), title=byId('identity-title');
 const nameField=byId('pilot-name-field'), pinField=byId('pilot-pin-field'),button=byId('pilot-profile-submit'),lock=byId('pilot-profile-lock');
 const portrait=byId('pilot-portrait'),portraitImage=byId('pilot-portrait-image');
 const sections=['pilot-wallet-panel','pilot-ship-panel','pilot-parts-panel'].map(byId);
 const balance=byId('pilot-balance'), build=byId('pilot-build-status'), detail=byId('pilot-build-detail');
 const kills=byId('pilot-kills'), fitted=byId('pilot-fitted-list');
 const slots=[['engine','Engine'],['core','Reactor core'],['battery','Battery'],['primary','Primary weapon'],['secondary','Secondary weapon'],['shield','Shield generator']];
 const empty=byId('pilot-parts-empty'), list=byId('pilot-parts-list');
 const number=value=>Number.isSafeInteger(value)&&value>=0;
 const format=value=>value.toLocaleString('en-US');
 const hex=bytes=>Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');
 const unhex=value=>Uint8Array.from(value.match(/../g),b=>parseInt(b,16));
 const clean=value=>{
  if(typeof value!=='string')return null;
  const trimmed=value.trim().replace(/ +/g,' ');
  return /^[\p{L}\p{N}][\p{L}\p{N} _-]{0,23}$/u.test(trimmed)&&trimmed.length<=24?trimmed:null;
 };
 let unlocked=null, mode='blocked', busy=false, epoch=0;
 try{unlocked=window.sessionStorage.getItem(sessionKey);}catch{}
 function readProfile(){
  let raw;
  try{raw=window.localStorage.getItem(key);}catch{return {status:'unavailable'};}
  if(raw===null)return {status:'empty'};
  try{
   const saved=JSON.parse(raw),callsign=clean(saved?.callsign);
   if(saved?.version===2&&callsign===saved.callsign&&callsign&&/^[a-f0-9]{32}$/.test(saved.salt)&&typeof saved.salt==='string'&&/^[a-f0-9]{64}$/.test(saved.verifier)&&typeof saved.verifier==='string'&&saved.iterations===iterations)
    return {status:'saved',raw,saved};
  }catch{}
  return {status:'invalid'};
 }
 function cryptoReady(){return Boolean(window.crypto?.getRandomValues&&window.crypto?.subtle);}
 function announce(message,state='ok'){feedback.textContent=message;feedback.dataset.state=state;}
 function markSession(salt){
  unlocked=salt;
  try{if(salt)window.sessionStorage.setItem(sessionKey,salt);else window.sessionStorage.removeItem(sessionKey);}catch{}
 }
 function renderIdentity(resetDraft=false){
  const profile=readProfile();
  mode=profile.status==='saved'?(unlocked===profile.saved.salt?'edit':'unlock'):profile.status==='empty'?'create':'blocked';
  title.textContent=mode==='edit'?'Your character':mode==='unlock'?'Unlock profile':mode==='create'?'Create Character':'Profile unavailable';
  form.hidden=mode==='blocked';
  nameField.hidden=mode==='unlock';pinField.hidden=mode==='edit';lock.hidden=mode!=='edit';
  name.hidden=mode!=='edit';name.textContent=mode==='edit'?profile.saved.callsign:'';
  const showPortrait=mode==='edit'&&profile.saved.callsign.toLowerCase()==='andy';
  portrait.hidden=!showPortrait;
  if(showPortrait)portraitImage.setAttribute('src','./pilot-001-andy.webp?v=75');else portraitImage.removeAttribute('src');
  button.textContent=mode==='edit'?'Save callsign':mode==='unlock'?'Unlock profile':'Create character';
  button.disabled=busy||(mode!=='edit'&&!cryptoReady());
  if(resetDraft){input.value=mode==='edit'?profile.saved.callsign:'';pin.value='';}
  for(const section of sections)section.hidden=mode!=='edit';
  if(mode==='edit')renderWallet();
  if(mode==='blocked')announce(profile.status==='invalid'?'Existing profile data could not be read. It has not been overwritten.':'Browser storage is unavailable.','error');
  else if(!cryptoReady()&&mode!=='edit')announce('Creating or unlocking a profile requires HTTPS and a browser with Web Crypto.','error');
 }
 async function derive(value,salt){
  const bits=window.crypto.subtle;
  const material=await bits.importKey('raw',new TextEncoder().encode(value),'PBKDF2',false,['deriveBits']);
  return hex(new Uint8Array(await bits.deriveBits({name:'PBKDF2',salt,iterations,hash:'SHA-256'},material,256)));
 }
 function equal(a,b){let mismatch=a.length^b.length;for(let i=0;i<a.length;i++)mismatch|=a.charCodeAt(i)^b.charCodeAt(i);return mismatch===0;}
 function saveIfCurrent(raw,value){
  const storage=window.localStorage,data=JSON.stringify(value);
  if(storage.getItem(key)!==raw)throw Error('Profile changed');
  storage.setItem(key,data);
  if(storage.getItem(key)!==data)throw Error('Save could not be confirmed');
 }
 function invalid(field,message){field.setAttribute('aria-invalid','true');field.focus();announce(message,'error');}
 form.addEventListener('submit',async event=>{
  event.preventDefault();
  if(busy||mode==='blocked')return;
  const profile=readProfile(),action=mode,stamp=epoch;
  if((action==='create'&&profile.status!=='empty')||(action!=='create'&&profile.status!=='saved')||(action==='edit'&&unlocked!==profile.saved.salt)){renderIdentity(true);return;}
  const callsign=action==='unlock'?null:clean(input.value),code=pin.value;
  if(action!=='unlock'&&!callsign){invalid(input,'Enter a valid callsign using the characters listed above.');return;}
  if(action!=='edit'&&!/^[0-9]{4}$/.test(code)){invalid(pin,'Enter exactly four digits.');return;}
  pin.value='';busy=true;button.disabled=true;
  try{
   if(action==='create'){
    const salt=window.crypto.getRandomValues(new Uint8Array(16)),verifier=await derive(code,salt);
    if(epoch!==stamp)return;
    const created={version:2,callsign,salt:hex(salt),verifier,iterations};
    saveIfCurrent(null,created);markSession(created.salt);
   }else if(action==='unlock'){
    const verifier=await derive(code,unhex(profile.saved.salt));
    if(epoch!==stamp)return;
    if(window.localStorage.getItem(key)!==profile.raw)throw Error('Profile changed');
    if(!equal(verifier,profile.saved.verifier)){invalid(pin,'That PIN did not match.');return;}
    markSession(profile.saved.salt);
   }else{
    saveIfCurrent(profile.raw,{...profile.saved,callsign});
   }
   announce(action==='create'?'Character saved in this browser.':action==='unlock'?'Profile unlocked.':'Callsign saved in this browser.');
  }catch{announce('Could not complete that action in this browser. Existing profile data was not replaced.','error');}
  finally{busy=false;renderIdentity(mode!=='create'||readProfile().status==='saved');}
 });
 for(const field of [input,pin])field.addEventListener('input',()=>field.removeAttribute('aria-invalid'));
 lock.addEventListener('click',()=>{epoch++;markSession(null);announce('Profile locked.');renderIdentity(true);pin.focus();});
 function readBuild(origin,parts){
  try{
   const storage=window.localStorage,raw=storage.getItem(shipKey);
   if(raw!==null){
    const saved=JSON.parse(raw);
    return saved?.version===1&&saved.hull==='rift-fighter'?saved:null;
   }
   if(origin!=='legacy')return null;
   const old=key=>{try{return JSON.parse(storage.getItem(key));}catch{return null;}};
   const fit=old('rift-runner.fighter-fit.v1'),engine=old('rift-runner.engine-fit.v1');
   const valid=(id,category)=>parts.get(id)?.category===category;
   const primary=fit?.version===1&&valid(fit.primary,'weapon')?fit.primary:'blaster';
   const secondary=fit?.version!==1?'ballistic':fit.secondary===null?null:
    valid(fit.secondary,'weapon')&&fit.secondary!==primary?fit.secondary:
    ['blaster','ballistic','ak77'].find(id=>id!==primary);
   return {
    engine:engine?.version===1&&valid(engine.engine,'engine')?engine.engine:'stock-thruster',
    core:'weifer-he3-core',battery:'kestrel-h20-reserve-cell',primary,secondary,
    shield:storage.getItem('rift-runner.shield-fit.v1')==='aegis-s3'?'aegis-s3':null
   };
  }catch{return null;}
 }
 function renderWallet(){
  let state,catalog;
  try{state=window.RiftCredits?.getBuildState?.();catalog=window.RiftCredits?.getCatalog?.();}catch{}
  const available=Boolean(state&&number(state.balance));
  balance.textContent=available?format(state.balance):'—';
  kills.textContent=available?format(number(state.kills)?state.kills:0):'—';
  detail.textContent='';
  const byPart=new Map(Array.isArray(catalog)?catalog.filter(part=>part&&typeof part.id==='string'&&typeof part.name==='string').map(part=>[part.id,part]):[]);
  const ids=new Set(Array.isArray(state?.owned)?state.owned:[]);
  const equipped=new Set();
  const ship=readBuild(state?.origin,byPart), fittedCategories={'engine':'engine','core':'core','battery':'battery','primary':'weapon','secondary':'weapon','shield':'shield'};
  let fittedRequired=0, primaryFitted=false;
  fitted.replaceChildren();
  for(const [slot,label] of slots){
   const part=ids.has(ship?.[slot])?byPart.get(ship[slot]):null;
   const active=part&&part.category===fittedCategories[slot]&&!equipped.has(part.id);
   const row=document.createElement('div'), term=document.createElement('dt'), value=document.createElement('dd');
   term.textContent=label;value.textContent=active?part.name:'Not fitted';
   if(active){equipped.add(part.id);if(['engine','core','battery'].includes(slot))fittedRequired++;if(slot==='primary')primaryFitted=true;}
   row.append(term,value);fitted.append(row);
  }
  if(!available)build.textContent='Build status unavailable';
  else if(fittedRequired===3&&primaryFitted)build.textContent='Fighter build ready';
  else if(state.canBuild===true)build.textContent='Parts available to fit';
  else build.textContent='Fighter build not ready';
  if(available&&number(state.requiredReserve)&&state.requiredReserve>0)detail.textContent='Minimum cost of missing essentials: '+format(state.requiredReserve)+' CR.';
  const parts=[...ids].filter(id=>!equipped.has(id)).map(id=>byPart.get(id)).filter(Boolean);
  list.replaceChildren();
  for(const part of parts){
   const row=document.createElement('li'),title=document.createElement('strong');
   title.textContent=part.name;row.append(title);
   if(typeof part.category==='string'){const category=document.createElement('small');category.textContent=part.category;row.append(category);}
   list.append(row);
  }
  list.hidden=parts.length===0;
  empty.hidden=parts.length!==0;
  empty.textContent=available&&Array.isArray(state.owned)?'No unfitted owned parts.':'Inventory unavailable.';
 }
 window.addEventListener('storage',event=>{
  if(event.key===key||event.key===null){epoch++;renderIdentity(true);}
  else if(mode==='edit')renderWallet();
 });
 window.addEventListener('rift:walletchange',()=>{if(mode==='edit')renderWallet();});
 window.addEventListener('pageshow',()=>renderIdentity(false));
 renderIdentity(true);
})();
