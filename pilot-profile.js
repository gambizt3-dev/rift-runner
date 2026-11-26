'use strict';
(() => {
 const statusView=/(?:^|[?&])view=status(?:&|$)/.test(window.location?.search??'');
 const registry=window.RiftVesselIdentity,identityRecords=new Map();
 const companies=new Map([['rift-carrier','Pegasus'],['bifrost','Bifrost']]);
 const identity=id=>identityRecords.get(id)??registry?.get(id);
 const vesselLabel=id=>identity(id)?.vessel.name??identity(id)?.vessel.designation??companies.get(id);
 const key='rift-runner.pilot-profile.v1', sessionKey='rift-runner.pilot-profile.unlocked.v1';
 const generationKey='rift-runner.character-generation.v1';
 const shipKey='rift-runner.ship-build.v1', hullKey='rift-runner.hull-owned.v1', iterations=310000, byId=id=>document.getElementById(id);
 const createProgress=byId('pilot-create-progress');
 const form=byId('pilot-callsign-form'), input=byId('pilot-callsign'),pin=byId('pilot-pin');
 const name=byId('pilot-saved-callsign'), feedback=byId('pilot-profile-feedback'), title=byId('identity-title');
 const nameField=byId('pilot-name-field'), pinField=byId('pilot-pin-field'),button=byId('pilot-profile-submit'),lock=byId('pilot-profile-lock');
 const portrait=byId('pilot-portrait'),portraitImage=byId('pilot-portrait-image'),portraitCaption=byId('pilot-portrait-caption');
 const picker=byId('pilot-avatar-picker');
 const avatars=new Map([
  ['andy',{label:'Andy',title:'Pilot 001 / Andy',src:'./pilot-001-andy.webp?v=75'}],
  ['aya',{label:'Aya',title:'Pilot 002 / Aya',src:'./pilot-002-aya.webp?v=76'}],
  ['ellis',{label:'Ellis',title:'Pilot 003 / Ellis',src:'./pilot-003-ellis.webp?v=76'}],
  ['nia',{label:'Nia',title:'Pilot 004 / Nia',src:'./pilot-004-nia.webp?v=76'}]
 ]);
 const avatarOptions=[...avatars].map(([id,art])=>({id,art,radio:byId('pilot-avatar-'+id),image:byId('pilot-avatar-art-'+id)}));
 const savedAvatar=profile=>Object.hasOwn(profile,'avatar')?(avatars.has(profile.avatar)?profile.avatar:null):
  profile.callsign.toLowerCase()==='andy'?'andy':null;

 const sections=['pilot-wallet-panel','pilot-ship-panel','pilot-parts-panel','pilot-credentials-panel'].map(byId);
 const deletePanel=byId('pilot-delete-panel'),deleteOpen=byId('pilot-delete-open'),deleteForm=byId('pilot-delete-form');
 const deletePin=byId('pilot-delete-pin'),deleteConfirm=byId('pilot-delete-confirm'),deleteCancel=byId('pilot-delete-cancel'),deleteButton=byId('pilot-delete-submit'),deleteFeedback=byId('pilot-delete-feedback');
 // Exact gameplay keys only. The old shot-sound key was the selected gun and
 // is still migration evidence for an owned ship, not a general sound setting.
 const fighters=window.RiftFighters,selectedHull=()=>fighters?.selected()??'rift-fighter';
 const parkingIds=fighters?.ids??['rift-fighter','stocky-light-fighter','bastion-9'];
 const resetKeys=[
  'rift-runner.pilot-credits.v1',hullKey,shipKey,'rift-runner.ship-active-gun.v1',
  'rift-runner.fighter-fit.v1','rift-runner.engine-fit.v1','rift-runner.shield-fit.v1',
  'rift-runner.shot-sound.v1','rift-runner.mission-log.v1',
  'rift-runner.fighter-parking-access.v1',...parkingIds.map(id=>'rift-runner.fighter-parking.v1.'+id),key,
  ...(fighters?[fighters.selectionKey,...fighters.ids.filter(id=>id!==fighters.starter).flatMap(id=>[fighters.hullKey(id),fighters.buildKey(id),fighters.gunKey(id)])]:[])
 ];
 let deleteTarget=null,resetIncomplete=false,repairTimer;
 const shipGrid=byId('pilot-ship-grid'),hullArt=byId('pilot-hull-art'),hullCaption=byId('pilot-hull-caption'),hullStatus=byId('pilot-hull-status'),fittedPanel=byId('pilot-fitted-panel');
 const retest=byId('pilot-retest'),retestOpen=byId('pilot-retest-open'),retestForm=byId('pilot-retest-form');
 const retestCancel=byId('pilot-retest-cancel'),retestFeedback=byId('pilot-retest-feedback'),retestBack=byId('pilot-retest-back');
 const statusLink=byId('pilot-status-profile-link'),companyRow=byId('pilot-status-company');
 const companyName=byId('pilot-company-name'),companyAction=byId('pilot-company-action');
 const companyCreate=byId('pilot-company-create'),companyOnCreate=byId('pilot-company-on-create');
 const companyControls=byId('pilot-company-controls'),companySelect=byId('pilot-company-select');
 const vesselRow=byId('pilot-status-assigned-vessel'),assignedVessel=byId('pilot-assigned-vessel');
 for(const id of companies.keys()){
  const updateOptions=()=>{for(const select of [companyOnCreate,companySelect]){
   const option=Array.from(select.options??[]).find(item=>item.value===id);
   if(option)option.textContent=vesselLabel(id);
  }};
  updateOptions();
  registry?.load(id).then(record=>{
   if(record)identityRecords.set(id,record);
   updateOptions();
   renderIdentity(false);
  });
 }
 const companyNote=byId('pilot-company-note'),companyFeedback=byId('pilot-company-feedback');
 if(statusView){
  document.title='Player Status · Rift Runner';
  byId('profile-title').textContent='Player Status';
  byId('pilot-page').dataset.view='status';
  for(const id of ['pilot-fitted-panel','pilot-parts-disclosure','pilot-record-disclosure'])byId(id).open=false;
 }
 const enteredForRetest=!statusView&&window.location?.hash==='#starter-repair';
 let retestTarget=null;
 const balance=byId('pilot-balance'), build=byId('pilot-build-status'), detail=byId('pilot-build-detail');
 const kills=byId('pilot-kills'), rank=byId('pilot-rank'), fitted=byId('pilot-fitted-list');
 const slots=[['engine','Engine'],['core','Reactor core'],['battery','Battery'],['primary','Primary weapon'],['secondary','Secondary weapon'],['shield','Shield generator']];
 const empty=byId('pilot-parts-empty'), list=byId('pilot-parts-list');
 const number=value=>Number.isSafeInteger(value)&&value>=0;
 const walletBalance=value=>typeof value==='number'&&Number.isSafeInteger(value*2)&&value>=0&&value<=999999999;
 const rankLadder=[['cadet','Cadet',0],...(window.RiftMissions?.qualifications??[]).map(q=>[q.id,q.rank,q.kills])];
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
 function hasExistingProgress(){
  try{
   const w=window.RiftCredits?.getBuildState?.(),storage=window.localStorage;
   if(w&&(w.origin==='legacy'||walletBalance(w.balance)&&w.balance!==250||number(w.kills)&&w.kills>0||Array.isArray(w.owned)&&w.owned.length))return true;
   const hull=JSON.parse(storage.getItem(hullKey)),build=JSON.parse(storage.getItem(shipKey));
   return Boolean(hull?.version===1&&hull.hull==='rift-fighter'&&['damaged','repairing','repaired'].includes(hull.condition)||
    build?.version===1&&build.hull==='rift-fighter'&&slots.some(([slot])=>typeof build[slot]==='string'&&build[slot].length));
  }catch{return false;}
 }
 function renderIdentity(resetDraft=false){
  const profile=readProfile();
  mode=resetIncomplete?'blocked':profile.status==='saved'?(unlocked===profile.saved.salt?'edit':'unlock'):profile.status==='empty'?'create':'blocked';
  title.textContent=mode==='edit'?'Your character':mode==='unlock'?'Unlock profile':mode==='create'?'Create Character':'Profile unavailable';
  form.hidden=mode==='blocked'||(statusView&&mode!=='unlock');
  nameField.hidden=mode==='unlock';pinField.hidden=mode==='edit';lock.hidden=mode!=='edit';
  const named=mode==='edit'||statusView&&mode==='unlock';
  byId('pilot-page').dataset.identity=mode;
  name.hidden=!named;name.textContent=named?profile.saved.callsign:'';
  byId('pilot-pin-help').textContent=mode==='unlock'?'Enter your existing game PIN.':'Choose a new game PIN, not one you use elsewhere.';
  const avatarId=mode==='edit'?savedAvatar(profile.saved):null;
  const current=avatars.get(avatarId), canChoose=!statusView&&(mode==='create'||mode==='edit');
  portrait.hidden=!current;picker.hidden=!canChoose;
  if(current){
   portraitImage.setAttribute('src',current.src);portraitImage.setAttribute('alt','Fictional portrait of Pilot '+current.label);
   portraitCaption.textContent=current.title;
  }else{portraitImage.removeAttribute('src');portraitImage.removeAttribute('alt');portraitCaption.textContent='';}
  for(const option of avatarOptions){
   if(canChoose)option.image.setAttribute('src',option.art.src);else option.image.removeAttribute('src');
   option.radio.disabled=!canChoose;
   if(resetDraft||!canChoose)option.radio.checked=option.id===avatarId;
  }
  companyCreate.hidden=statusView||mode!=='create';
  if(resetDraft||companyCreate.hidden)companyOnCreate.value='';
  const keep=mode==='create'&&hasExistingProgress();
  createProgress.hidden=!keep;
  button.textContent=mode==='edit'?'Save profile':mode==='unlock'?'Unlock profile':keep?'Create profile and keep progress':'Create character';
  button.disabled=busy||(mode!=='edit'&&!cryptoReady());
  if(resetDraft){input.value=mode==='edit'?profile.saved.callsign:'';pin.value='';}
  for(const section of sections)section.hidden=mode!=='edit';
  if(mode!=='edit'&&statusView)for(const id of ['pilot-fitted-panel','pilot-parts-disclosure','pilot-record-disclosure','pilot-assignment-details'])byId(id).open=false;
  deletePanel.hidden=statusView||mode!=='edit';
  statusLink.hidden=!statusView||(mode!=='edit'&&mode!=='create');
  statusLink.textContent=mode==='create'?'Create character':'Manage character';
  const showCompany=statusView&&mode==='edit';
  companyRow.hidden=companyControls.hidden=companyNote.hidden=byId('pilot-assignment-details').hidden=!showCompany;
  if(vesselRow)vesselRow.hidden=!showCompany;
 if(showCompany){
   const id=profile.saved.companyVesselId;
   companyName.textContent=companies.has(id)?identity(id)?.guildLabel??'Unassigned guild':'Independent';
   if(assignedVessel)assignedVessel.textContent=vesselLabel(id)??'None';
   if(resetDraft||!companies.has(companySelect.value)&&companySelect.value!=='')companySelect.value=companies.has(id)?id:'';
  }else{
   companyFeedback.hidden=true;companyFeedback.textContent='';
   companyName.textContent='Independent';companySelect.value='';
  }
  deleteOpen.disabled=busy||!cryptoReady();
  if(mode!=='edit'&&deleteTarget)closeDelete(false);
  if(mode==='edit')renderWallet();else{closeRetest(false,true);clearRepairTimer();}
  if(resetIncomplete)announce('Deletion did not finish and some data could not be restored. Reload before continuing.','error');
  else if(mode==='blocked')announce(profile.status==='invalid'?'Existing profile data could not be read. It has not been overwritten.':'Browser storage is unavailable.','error');
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
 companyAction.addEventListener('click',()=>{
  if(!statusView||busy||mode!=='edit')return;
  const profile=readProfile();
  if(profile.status!=='saved'||unlocked!==profile.saved.salt){renderIdentity(true);return;}
  const updated={...profile.saved};
  const id=companySelect.value;
  if(id!==''&&!companies.has(id))return;
  if(id)updated.companyVesselId=id;
  else delete updated.companyVesselId;
  try{
   if(updated.companyVesselId!==profile.saved.companyVesselId)saveIfCurrent(profile.raw,updated);
   companyFeedback.textContent=id?vesselLabel(id)+' saved as your assigned vessel.':'You’re now independent.';
   companyFeedback.dataset.state='ok';
  }catch{
   companyFeedback.textContent='Could not save your assignment in this browser.';
   companyFeedback.dataset.state='error';
  }
  companyFeedback.hidden=false;
  renderIdentity(false);
 });
 function invalid(field,message){field.setAttribute('aria-invalid','true');field.focus();announce(message,'error');}
 form.addEventListener('submit',async event=>{
  event.preventDefault();
  if(busy||deleteTarget||mode==='blocked'||(statusView&&mode!=='unlock'))return;
  const profile=readProfile(),action=mode,stamp=epoch;
  if((action==='create'&&profile.status!=='empty')||(action!=='create'&&profile.status!=='saved')||(action==='edit'&&unlocked!==profile.saved.salt)){renderIdentity(true);return;}
  const callsign=action==='unlock'?null:clean(input.value),code=pin.value;
  const avatar=action==='unlock'?null:avatarOptions.find(option=>option.radio.checked)?.id??null;
  if(action!=='unlock'&&!callsign){invalid(input,'Enter a valid callsign using the characters listed above.');return;}
  if(action!=='edit'&&!/^[0-9]{4}$/.test(code)){invalid(pin,'Enter exactly four digits.');return;}
  const company=action==='create'?companyOnCreate.value:'';
  if(company&&!companies.has(company)){invalid(companyOnCreate,'Choose Pegasus, Bifrost, or Independent.');return;}
  if(action==='create'&&!avatar){invalid(avatarOptions[0].radio,'Choose a pilot portrait.');return;}
  pin.value='';busy=true;button.disabled=true;
  try{
   if(action==='create'){
    const salt=window.crypto.getRandomValues(new Uint8Array(16)),verifier=await derive(code,salt);
    if(epoch!==stamp)return;
    const created={version:2,callsign,salt:hex(salt),verifier,iterations,avatar};
    if(company)created.companyVesselId=company;
    saveIfCurrent(null,created);markSession(created.salt);
   }else if(action==='unlock'){
    const verifier=await derive(code,unhex(profile.saved.salt));
    if(epoch!==stamp)return;
    if(window.localStorage.getItem(key)!==profile.raw)throw Error('Profile changed');
    if(!equal(verifier,profile.saved.verifier)){invalid(pin,'That PIN did not match.');return;}
    markSession(profile.saved.salt);
   }else{
    const changed={...profile.saved,callsign};
    if(avatar)changed.avatar=avatar;
    else if(!Object.hasOwn(changed,'avatar'))changed.avatar=savedAvatar(profile.saved);
    saveIfCurrent(profile.raw,changed);
   }
   announce(action==='create'?'Character saved in this browser.':action==='unlock'?'Profile unlocked.':'Profile saved in this browser.');
  }catch{announce('Could not complete that action in this browser. Existing profile data was not replaced.','error');}
  finally{busy=false;renderIdentity(mode!=='create'||readProfile().status==='saved');if(action==='unlock')focusRetestRoute();}
 });
 for(const option of avatarOptions)option.radio.addEventListener('change',()=>avatarOptions[0].radio.removeAttribute('aria-invalid'));
 for(const field of [input,pin,companyOnCreate])field.addEventListener('input',()=>field.removeAttribute('aria-invalid'));
 lock.addEventListener('click',()=>{if(busy)return;if(deleteTarget)closeDelete(false);epoch++;markSession(null);announce('Profile locked.');renderIdentity(true);pin.focus();});
 function showDeleteFeedback(message){deleteFeedback.textContent=message;deleteFeedback.dataset.state='error';}
 function setDeleteBusy(value){
  busy=value;
  for(const control of [button,lock,deleteOpen,deletePin,deleteConfirm,deleteCancel,deleteButton])control.disabled=value;
 }
 function closeDelete(returnFocus){
  deleteTarget=null;deleteForm.hidden=true;deletePin.value='';deleteConfirm.checked=false;
  deletePin.removeAttribute('aria-invalid');deleteConfirm.removeAttribute('aria-invalid');deleteFeedback.textContent='';
  deleteOpen.setAttribute('aria-expanded','false');
  if(returnFocus)deleteOpen.focus();
 }
 function deleteSave(expectedRaw){
  const storage=window.localStorage,snapshot=new Map(),attempted=[];
  let previousGeneration,newGeneration;
  try{
   for(const id of resetKeys)snapshot.set(id,storage.getItem(id));
   if(snapshot.get(key)!==expectedRaw)return 'changed';
   previousGeneration=storage.getItem(generationKey);
   newGeneration=hex(window.crypto.getRandomValues(new Uint8Array(16)));
   if(newGeneration===previousGeneration)throw Error('Could not allocate a new save generation');
   storage.setItem(generationKey,newGeneration);
   if(storage.getItem(generationKey)!==newGeneration)throw Error('Could not verify save generation');
   for(const id of resetKeys){
    if(storage.getItem(generationKey)!==newGeneration||storage.getItem(key)!==expectedRaw||storage.getItem(id)!==snapshot.get(id))throw Error('Save changed');
    if(snapshot.get(id)===null)continue;
    attempted.push(id);storage.removeItem(id);
    if(storage.getItem(id)!==null)throw Error('Remove could not be verified');
   }
   if(storage.getItem(generationKey)!==newGeneration||resetKeys.some(id=>storage.getItem(id)!==null))throw Error('Reset could not be verified');
   return 'deleted';
  }catch{
   let restored=true;
   // Roll back only our removals and only while the key is still absent.
   // Browser storage has no multi-key transaction or guarantee across tabs.
   for(const id of attempted.reverse()){
    try{
     if(storage.getItem(generationKey)!==newGeneration){restored=false;break;}
     const current=storage.getItem(id),original=snapshot.get(id);
     if(current===null)storage.setItem(id,original);
     if(storage.getItem(id)!==original)restored=false;
    }catch{restored=false;}
   }
   if(restored&&newGeneration!==undefined){
    try{
     if(storage.getItem(generationKey)===newGeneration){
      if(previousGeneration===null)storage.removeItem(generationKey);else storage.setItem(generationKey,previousGeneration);
      if(storage.getItem(generationKey)!==previousGeneration)restored=false;
     }
    }catch{restored=false;}
   }
   return restored?'blocked':'partial';
  }
 }
 deleteOpen.addEventListener('click',()=>{
  const profile=readProfile();
  if(statusView||busy||mode!=='edit'||profile.status!=='saved'||unlocked!==profile.saved.salt)return;
  closeRetest(false,true);
  deleteTarget=profile.raw;deleteForm.hidden=false;deleteOpen.setAttribute('aria-expanded','true');
  deleteFeedback.textContent='';deletePin.focus();
 });
 deleteCancel.addEventListener('click',()=>{if(!busy)closeDelete(true);});
 deleteForm.addEventListener('keydown',event=>{if(event.key==='Escape'&&!busy){event.preventDefault();closeDelete(true);}});
 deletePin.addEventListener('input',()=>deletePin.removeAttribute('aria-invalid'));
 deleteConfirm.addEventListener('change',()=>deleteConfirm.removeAttribute('aria-invalid'));
 deleteForm.addEventListener('submit',async event=>{
  event.preventDefault();
  const profile=readProfile(),target=deleteTarget,stamp=epoch;
  if(busy||!target||mode!=='edit'||profile.status!=='saved'||unlocked!==profile.saved.salt)return;
  if(profile.raw!==target){closeDelete(false);showDeleteFeedback('This character changed. Review it before trying again.');renderIdentity(true);return;}
  if(!deleteConfirm.checked){deleteConfirm.setAttribute('aria-invalid','true');deleteConfirm.focus();showDeleteFeedback('Confirm that you understand what will be permanently deleted.');return;}
  const code=deletePin.value;
  if(!/^[0-9]{4}$/.test(code)){deletePin.setAttribute('aria-invalid','true');deletePin.focus();showDeleteFeedback('Enter exactly four digits.');return;}
  deletePin.value='';deleteFeedback.textContent='';setDeleteBusy(true);
  let focusPin=false,created=false;
  try{
   const verifier=await derive(code,unhex(profile.saved.salt));
   if(epoch!==stamp||deleteTarget!==target||unlocked!==profile.saved.salt)return;
   if(!equal(verifier,profile.saved.verifier)){deletePin.setAttribute('aria-invalid','true');showDeleteFeedback('That PIN did not match. Nothing was deleted.');focusPin=true;return;}
   const result=deleteSave(target);
   if(result==='deleted'){
    closeDelete(false);markSession(null);epoch++;created=true;
    announce('Character deleted. Create a new character to start with 250 credits and no ship.');
   }else{
    if(result==='partial')resetIncomplete=true;
    showDeleteFeedback(result==='partial'?'Deletion did not finish and some data could not be restored. Reload before continuing.':
     result==='changed'?'This character changed. Nothing was deleted. Close other Rift Runner tabs and try again.':
     'Deletion was blocked. Any removed data was restored. Close other Rift Runner tabs and try again.');
   }
  }catch{showDeleteFeedback('Could not verify the PIN. Nothing was deleted.');}
  finally{
   setDeleteBusy(false);renderIdentity(created);
   if(created)input.focus();else if(focusPin&&deleteTarget)deletePin.focus();
  }
 });
 function readBuild(origin,parts,id=selectedHull()){
  try{
   const storage=window.localStorage,raw=storage.getItem(fighters?.buildKey(id)??shipKey);
   if(raw!==null){
    const saved=JSON.parse(raw);
    return saved?.version===1&&saved.hull===id?saved:null;
   }
   if(origin!=='legacy'||id!=='rift-fighter')return null;
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
 function readHull(origin,ship,byPart,ids,id=selectedHull()){
  try{
   const raw=window.localStorage.getItem(fighters?.hullKey(id)??hullKey);
   if(raw!==null){
    const saved=JSON.parse(raw);
    if(saved?.version!==1||saved.hull!==id)return {condition:'unavailable'};
    const hp=Number.isFinite(saved.hullHp)&&Number.isFinite(saved.maxHullHp)&&saved.hullHp>=0&&saved.hullHp<saved.maxHullHp?
     {current:saved.hullHp,max:saved.maxHullHp}:null;
    if(saved.condition==='repairing'&&Number.isSafeInteger(saved.readyAt)&&saved.readyAt>0)return {condition:'repairing',readyAt:saved.readyAt,hp};
    if(saved.condition==='damaged'||saved.condition==='repaired')return {condition:saved.condition,raw,hp};
    return {condition:'unavailable'};
   }
   if(id!=='rift-fighter')return {condition:fighters?.owned(id)?'repaired':'unavailable',raw};
   // Older pilots and existing saves with an actual owned part fitted keep
   // their ship. V76's empty build shell on a new save is not ownership.
   const gameSlots={engine:'engine',core:'core',battery:'battery',primary:'weapon',secondary:'weapon',shield:'shield'};
   const olderFit=ship&&Object.entries(gameSlots).some(([slot,category])=>ids.has(ship[slot])&&byPart.get(ship[slot])?.category===category);
   return {condition:origin==='legacy'||olderFit?'repaired':'none',raw};
  }catch{return {condition:'unavailable'};}
 }
 function clearRepairTimer(){
  if(repairTimer!==undefined){window.clearTimeout?.(repairTimer);repairTimer=undefined;}
 }
 function showHull(hull){
  clearRepairTimer();
  const id=selectedHull(),craft=fighters?.get(id),name=craft?.name??'Rift-3 Fighter';
  const ready=hull.condition==='repaired',damaged=hull.condition==='damaged'||hull.condition==='repairing';
  shipGrid.hidden=!ready&&!damaged;fittedPanel.hidden=!ready;
  retest.hidden=statusView||!ready||id!=='rift-fighter';
  retestBack.hidden=statusView||!(ready||damaged||enteredForRetest);
  if(!ready||id!=='rift-fighter')closeRetest(false);
  if(ready||damaged){
   const source=id!=='rift-fighter'?craft.art:ready?'./fighter-winged.png?v=23':'./fighter-salvage-damaged.webp?v=77';
   if(hullArt.getAttribute('src')!==source)hullArt.setAttribute('src',source);
   hullArt.setAttribute('alt',ready?name:'Damaged '+name);
   hullCaption.textContent=ready?name:name+(id==='rift-fighter'?' / Salvage':' / Damaged');
  }else{hullArt.removeAttribute('src');hullArt.setAttribute('alt','');hullCaption.textContent='';}
  const hp=hull.hp?' Hull '+hull.hp.current+' / '+hull.hp.max+' HP.':'';
  if(ready)hullStatus.textContent=name+' owned.'+hp;
  else if(hull.condition==='damaged')hullStatus.textContent=name+(id==='rift-fighter'?' salvage':'')+' owned. Repair required before fitting.'+hp;
  else if(hull.condition==='repairing'){
   const seconds=Math.max(0,Math.ceil((hull.readyAt-Date.now())/1000));
   hullStatus.textContent=(seconds?name+' repair in progress. About '+Math.floor(seconds/60)+'m '+seconds%60+'s remaining.':
    name+' repair ready to finish at the Hangar.')+hp;
   if(seconds&&mode==='edit')repairTimer=window.setTimeout?.(()=>{if(mode==='edit')renderWallet();},1000);
  }else hullStatus.textContent=hull.condition==='unavailable'?'Ship ownership unavailable.':'No ship owned. Visit the Hangar to check for salvage.';
 }
 const sparrowId='sparrow-s2';
 function readSparrowFits(id,available){
  const rawFit=fighter=>{
   try{
    const raw=window.localStorage.getItem(fighters.buildKey(fighter));
    if(raw===null)return null;
    const fit=JSON.parse(raw);
    return fit?.version===1&&fit.hull===fighter?fit:undefined;
   }catch{return undefined;}
  };
  if(!available||!fighters)return {quantity:0,fit:null};
  let paid=0;
  try{paid=window.RiftCredits?.weaponQuantity?.(sparrowId)??0;}catch{}
  if(!Number.isSafeInteger(paid)||paid<0||paid>4)paid=0;
  const stock=fighter=>fighters.get(fighter)?.stockSparrows??0;
  const used=fighter=>{
   const declared=rawFit(fighter);
   const fitted=Number(declared?.primary===sparrowId)+Number(declared?.secondary===sparrowId);
   return Math.max(0,fitted-stock(fighter));
  };
  const hulls=fighters.ids.filter(fighter=>stock(fighter)>0&&fighters.owned(fighter));
  const reserved=hulls.filter(fighter=>fighter!==id).reduce((sum,fighter)=>sum+used(fighter),0);
  const quantity=Math.max(0,paid-reserved-(hulls.includes(id)?used(id):0));
  if(!hulls.includes(id))return {quantity,fit:null};
  const current=rawFit(id);
  const fit={primary:null,secondary:null};
  if(current===undefined)return {quantity,fit};
  const oldSize3=['blaster','ballistic','ak77'];
  const declared=current?[current.primary,current.secondary]:[];
  const legacy=current===null||!declared.includes(sparrowId)&&declared.some(gun=>oldSize3.includes(gun));
  for(const slot of ['primary','secondary']){
   if(legacy||current[slot]===sparrowId)fit[slot]=sparrowId;
  }
  if(fit.primary&&fit.secondary&&stock(id)+Math.max(0,paid-reserved)<2)fit.secondary=null;
  return {quantity,fit};
 }
 function readHangar(){
  let state,catalog;
  try{state=window.RiftCredits?.getBuildState?.();catalog=window.RiftCredits?.getCatalog?.();}catch{}
  const available=Boolean(state&&walletBalance(state.balance));
  const byPart=new Map(Array.isArray(catalog)?catalog.filter(part=>part&&typeof part.id==='string'&&typeof part.name==='string').map(part=>[part.id,part]):[]);
  const ids=new Set(Array.isArray(state?.owned)?state.owned:[]);
  const id=selectedHull(),ship=readBuild(state?.origin,byPart,id),sparrows=readSparrowFits(id,available);
  const hull=available?readHull(state.origin,ship,byPart,ids,id):{condition:'unavailable'};
  return {state,available,byPart,ids,ship,hull,sparrows};
 }
 function announceRetest(message,state='ok'){
  retestFeedback.textContent=message;retestFeedback.dataset.state=state;retestFeedback.hidden=!message;
 }
 function focusRetestRoute(){if(enteredForRetest&&mode==='edit')(!retest.hidden?retestOpen:retestBack).focus();}
 function closeRetest(restoreFocus,clear=false){
  retestTarget=null;retestForm.hidden=true;retestOpen.setAttribute('aria-expanded','false');
  if(clear)announceRetest('');
  if(restoreFocus&&!retest.hidden)retestOpen.focus();
 }
 retestOpen.addEventListener('click',()=>{
  const profile=readProfile(),{hull}=readHangar();
  if(selectedHull()!=='rift-fighter'||statusView||busy||deleteTarget||mode!=='edit'||profile.status!=='saved'||unlocked!==profile.saved.salt||hull.condition!=='repaired')return;
  retestTarget={profile:profile.raw,hull:hull.raw};retestForm.hidden=false;retestOpen.setAttribute('aria-expanded','true');
  announceRetest('');retestCancel.focus();
 });
 retestCancel.addEventListener('click',()=>closeRetest(true,true));
 retestForm.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();closeRetest(true,true);}});
 retestForm.addEventListener('submit',event=>{
  event.preventDefault();
  const target=retestTarget;
  if(!target||selectedHull()!=='rift-fighter'||busy||deleteTarget||mode!=='edit')return;
  closeRetest(false);
  try{
   const profile=readProfile(),storage=window.localStorage,{hull}=readHangar();
   if(profile.status!=='saved'||profile.raw!==target.profile||unlocked!==profile.saved.salt||
    hull.condition!=='repaired'||hull.raw!==target.hull||storage.getItem(key)!==target.profile||storage.getItem(hullKey)!==target.hull){
    announceRetest('This profile or ship changed. Nothing was changed here.','error');return;
   }
   const damaged=JSON.stringify({version:1,hull:'rift-fighter',condition:'damaged'});
   storage.setItem(hullKey,damaged);
   if(storage.getItem(hullKey)!==damaged)throw Error('Could not verify local save');
   announceRetest('Rift-3 marked damaged. Start the repair in the Hangar when ready.');
  }catch{announceRetest('Could not confirm the ship change. Check your ship before trying again.','error');}
  finally{renderIdentity(false);if(!retestFeedback.hidden)retestFeedback.focus?.();}
 });
 function renderWallet(){
  const starter=window.RiftMissions?.getStarter(),intercept=window.RiftMissions?.getIntercept()?.lodgedAt;
  const rendezvous=window.RiftRendezvous?.get()?.completedAt;
  const questList=byId('pilot-quest-list'),questEmpty=byId('pilot-quest-empty');
  const hasRecord=!!(starter||intercept||rendezvous);
  if(questList)questList.hidden=!hasRecord;
  if(questEmpty)questEmpty.hidden=hasRecord;
  for(const [id,when,verb] of [['starter',starter?.completedAt,'Lodged'],['intercept',intercept,'Lodged'],['rendezvous',rendezvous,'Completed']]){
   const entry=byId('pilot-'+id+'-quest'),date=byId('pilot-'+id+'-completed');
   if(entry)entry.hidden=!when;
   if(date)date.textContent=when?verb+' '+new Date(when).toLocaleDateString():'';
  }
  const {state,available,byPart,ids,ship,hull,sparrows}=readHangar();
  balance.textContent=available?format(state.balance):'—';
  const confirmedKills=available&&number(state.kills)?state.kills:0;
  kills.textContent=available?format(confirmedKills):'—';
  const qualifications=byId('pilot-rank-quests');
  qualifications?.replaceChildren();
  let tier=available?0:-1;
  if(available){
   for(let i=1;i<rankLadder.length;i++){
    const [id,label]=rankLadder[i],lodgedAt=window.RiftMissions?.getQualification?.(id)?.lodgedAt;
    if(!lodgedAt)break;
    tier=i;
    if(qualifications){
     const row=document.createElement('li'),title=document.createElement('strong'),date=document.createElement('small');
     title.textContent=label+' Qualification';date.textContent='Lodged '+new Date(lodgedAt).toLocaleDateString();
     row.append(title,date);qualifications.append(row);
    }
   }
  }
  if(qualifications)qualifications.hidden=tier<1;
  const nextRank=available?rankLadder[tier+1]:null,hint=byId('pilot-rank-hint'),hintText=byId('pilot-rank-hint-text');
  if(hint)hint.hidden=!nextRank||confirmedKills<nextRank[2];
  if(hintText)hintText.textContent=!nextRank||confirmedKills<nextRank[2]?'':nextRank[2]+(statusView?' kills: '+nextRank[1]+' qualification available.':' kills reached. Qualify for '+nextRank[1]+' with Admiral Bishop.');
  rank.textContent=rankLadder[tier]?.[1]??'—';
  const badge=byId('pilot-current-badge');
  if(badge){
   badge.hidden=tier<0;
   const insignia=byId('pilot-current-insignia');
   if(tier>=0){badge.dataset.tier=String(tier);insignia?.setAttribute('href','#pin-'+tier);}
   else{delete badge.dataset.tier;insignia?.removeAttribute('href');}
  }
  for(const id of ['pilot-badges-title','pilot-badges']){
   const group=byId(id);if(group)group.hidden=tier<0;
  }
  rankLadder.forEach((_,i)=>{
   const card=byId('pilot-badge-'+i);
   if(card){
    card.hidden=i>tier;
    if(i===tier)card.setAttribute('aria-current','true');else card.removeAttribute('aria-current');
   }
  });
  detail.textContent='';
  const equipped=new Set();
  showHull(hull);
  const fittedCategories={'engine':'engine','core':'core','battery':'battery','primary':'weapon','secondary':'weapon','shield':'shield'};
  let fittedRequired=0, primaryFitted=false;
  fitted.replaceChildren();
  for(const [slot,label] of (hull.condition==='repaired'?slots:[])){
   const weapon=fittedCategories[slot]==='weapon',wingMount=weapon&&sparrows.fit;
   const part=wingMount?byPart.get(sparrows.fit[slot]):ids.has(ship?.[slot])?byPart.get(ship[slot]):null;
   const active=part&&part.category===fittedCategories[slot]&&(wingMount?part.id===sparrowId:
    !equipped.has(part.id)&&(!weapon||(part.size??3)===3));
   const row=document.createElement('div'), term=document.createElement('dt'), value=document.createElement('dd');
   term.textContent=wingMount?(slot==='primary'?'Left':'Right')+' Size 2 wing mount':label;value.textContent=active?part.name:'Not fitted';
   if(active){equipped.add(part.id);if(['engine','core','battery'].includes(slot))fittedRequired++;if(slot==='primary'||wingMount)primaryFitted=true;}
   row.append(term,value);fitted.append(row);
  }
  if(!available)build.textContent='Build status unavailable';
  else if(hull.condition!=='repaired')build.textContent=hull.condition==='unavailable'?'Build status unavailable':hull.condition==='none'?'Claim a ship to start your build':'Repair required before fitting';
  else if(fittedRequired===3&&primaryFitted)build.textContent='Fighter build ready';
  else if(state.canBuild===true)build.textContent='Parts available to fit';
  else build.textContent='Fighter build not ready';
  if(available&&number(state.requiredReserve)&&state.requiredReserve>0)detail.textContent='Minimum cost of missing essentials: '+format(state.requiredReserve)+' CR.';
  const parts=[...ids].filter(id=>id!==sparrowId&&!equipped.has(id)).map(id=>byPart.get(id)).filter(Boolean);
  if(sparrows.quantity>0&&byPart.has(sparrowId))parts.push(byPart.get(sparrowId));
  list.replaceChildren();
  for(const part of parts){
   const row=document.createElement('li'),title=document.createElement('strong');
   title.textContent=part.name;row.append(title);
   if(typeof part.category==='string'){const category=document.createElement('small');category.textContent=part.id===sparrowId?'Size 2 · '+sparrows.quantity+' unfitted':part.category;row.append(category);}
   list.append(row);
  }
  list.hidden=parts.length===0;
  empty.hidden=parts.length!==0;
  empty.textContent=available&&Array.isArray(state.owned)?'No unfitted owned parts.':'Inventory unavailable.';
 }
 window.addEventListener('storage',event=>{
  if(event.key===key||event.key===null){epoch++;if(deleteTarget)closeDelete(false);if(retestTarget)closeRetest(false,true);renderIdentity(true);}
  else if(mode==='edit')renderWallet();
  else if(mode==='create')renderIdentity(false);
 });
 window.addEventListener('rift:walletchange',()=>{if(mode==='edit')renderWallet();else if(mode==='create')renderIdentity(false);});
 window.addEventListener('pageshow',()=>renderIdentity(false));
 renderIdentity(true);
 focusRetestRoute();
})();
