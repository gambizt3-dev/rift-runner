'use strict';
(()=>{
 const generationKey='rift-runner.character-generation.v1';
 const tokenKey='rift-runner.fighter-parking-access.v1';
 const privateOrigin='rift-runner.boundlessghost16.chatgpt.site';
 const worker='https://rift-runner.gambizt3.workers.dev';
 const validVessel=id=>id==='rift-carrier'||id==='bifrost';
 const validBay=bay=>[1,2,4,6].includes(bay);
 const validRevision=rev=>Number.isSafeInteger(rev)&&rev>0;
 const unavailable=()=>({status:'unavailable',parking:null});
 const storage=()=>window.localStorage;
 const generation=()=>storage().getItem(generationKey)??null;
 const home=()=>{
  try{
   const profile=JSON.parse(storage().getItem('rift-runner.pilot-profile.v1'));
   if(profile?.version===2&&profile.companyVesselId==='bifrost')return 'bifrost';
  }catch{}
  return 'rift-carrier';
 };
 const key=id=>['rift-fighter','bastion-9','stocky-light-fighter'].includes(id)?'rift-runner.fighter-parking.v1.'+id:null;
 const record=(id,gen)=>{
  const item=key(id),entry=item&&JSON.parse(storage().getItem(item));
  if(entry?.version!==1||entry.hull!==id||entry.generation!==gen||!validVessel(entry.vessel))return null;
  if(entry.bay===undefined&&entry.revision===undefined)return {vessel:entry.vessel,bay:null,revision:null};
  if(validBay(entry.bay)&&validRevision(entry.revision))return {vessel:entry.vessel,bay:entry.bay,revision:entry.revision};
  return null;
 };
 const details=id=>{
  try{const item=record(id,generation());if(item)return item;}catch{}
  return {vessel:home(),bay:null,revision:null};
 };
 const get=id=>details(id).vessel;
 function access(gen,create){
  let item;
  try{item=JSON.parse(storage().getItem(tokenKey));}catch{}
  if(item?.generation===gen&&typeof item.bearer==='string'&&/^[0-9a-f]{64}$/.test(item.bearer))return item.bearer;
  if(!create||!window.crypto?.getRandomValues||generation()!==gen)return null;
  const bytes=window.crypto.getRandomValues(new Uint8Array(32));
  const bearer=Array.from(bytes,byte=>byte.toString(16).padStart(2,'0')).join('');
  storage().setItem(tokenKey,JSON.stringify({generation:gen,bearer}));
  return generation()===gen?access(gen,false):null;
 }
 function current(ctx){return generation()===ctx.gen&&access(ctx.gen,false)===ctx.bearer;}
 function remember(id,ctx,parking){
  if(!current(ctx))return false;
  if(!parking)return true; // Do not erase an un-migrated or previously cached parking record.
  const previous=record(id,ctx.gen);
  if(previous?.revision>parking.revision)return false;
  if(previous?.revision===parking.revision&&previous.vessel===parking.vessel&&previous.bay===parking.bay)return true;
  const raw=JSON.stringify({version:1,hull:id,generation:ctx.gen,...parking});
  storage().setItem(key(id),raw);
  return current(ctx)&&storage().getItem(key(id))===raw;
 }
 async function request(id,ctx,change){
  if(!ctx.bearer||!current(ctx))return unavailable();
  const base=window.location?.hostname===privateOrigin?worker:'';
  const headers={Authorization:'Bearer '+ctx.bearer};
  if(change)headers['Content-Type']='application/json';
  const response=await window.fetch(base+'/api/fighter-parking/'+id,{
   method:change?'PUT':'GET',cache:'no-store',credentials:'omit',redirect:'error',headers,
   ...(typeof window.AbortSignal?.timeout==='function'?{signal:window.AbortSignal.timeout(7000)}:{}),
   ...(change?{body:JSON.stringify(change)}:{})
  });
  const conflict=change&&response.status===409;
  if(response.status!==200&&!conflict)return unavailable();
  const data=await response.json(),p=data?.parking;
  const prior=change&&record(id,ctx.gen);
  const sameBooking=p&&prior?.vessel===p.vessel&&prior.bay===p.bay&&prior.revision===p.revision;
  if(data?.version!==1||data.hull!==id||
   p!==null&&(!validVessel(p?.vessel)||!validBay(p.bay)||!validRevision(p.revision))||
   change&&!conflict&&(!p||p.vessel!==change.vessel||(p.revision<change.expectedRevision||p.revision===change.expectedRevision&&!sameBooking)))return unavailable();
  const parking=p&&{vessel:p.vessel,bay:p.bay,revision:p.revision};
  if(!remember(id,ctx,parking))return unavailable();
  return {status:conflict?'conflict':'ok',parking};
 }
 async function hydrate(id,{migrate=false}={}){
  if(!key(id)||typeof window.fetch!=='function')return unavailable();
  try{
   const gen=generation(),legacy=record(id,gen),ctx={gen,bearer:access(gen,migrate&&legacy?.revision===null)};
   const incoming=await request(id,ctx);
   if(!migrate||incoming.status!=='ok'||incoming.parking!==null||legacy?.revision!==null||!current(ctx))return incoming;
   const latest=record(id,gen);
   return latest?.revision===null&&latest.vessel===legacy.vessel
    ?await request(id,ctx,{vessel:legacy.vessel,expectedRevision:0}):incoming;
  }catch{return unavailable();}
 }
 async function save(id,vessel,{expectedVessel,expectedRevision}={}){
  if(!key(id)||!validVessel(vessel)||typeof window.fetch!=='function')return unavailable();
  try{
   const gen=generation(),ctx={gen,bearer:access(gen,true)};
   const cached=record(id,gen);
   let revision=cached?.revision;
   if(revision==null){
    const incoming=await request(id,ctx);
    if(incoming.status!=='ok')return incoming;
    if(incoming.parking&&(expectedVessel&&incoming.parking.vessel!==expectedVessel||
      expectedRevision!==undefined&&incoming.parking.revision!==expectedRevision))
     return {status:'conflict',parking:incoming.parking};
    revision=incoming.parking?.revision??0;
   }
   if(expectedVessel&&cached?.revision&&cached.vessel!==expectedVessel||
      expectedRevision!==undefined&&revision!==expectedRevision)
    return {status:'conflict',parking:record(id,gen)};
   return await request(id,ctx,{vessel,expectedRevision:revision});
  }catch{return unavailable();}
 }
 window.RiftFighterParking=Object.freeze({home,get,key,details,hydrate,save});
})();
