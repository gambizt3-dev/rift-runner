'use strict';
(() => {
 const label=(value,max=80)=>typeof value==='string'&&value.length>0&&value.length<=max&&value===value.trim()&&!/[\u0000-\u001f\u007f]/.test(value);
 const id=value=>typeof value==='string'&&/^[a-z0-9][a-z0-9-]{0,63}$/.test(value);
 const unassigned='Unassigned guild';
 const configured={
  guilds:[{id:'federal-navy',name:'Federal Navy',type:'military'}],
  commanders:[{id:'bishop',name:'Bishop',title:'Admiral'},{id:'adaline',name:'Adaline',title:'Admiral'}],
  vessels:[
   {id:'rift-carrier',designation:'Rift Carrier',name:'Pegasus',kind:'carrier',vesselClass:'Pegasus-class carrier',profession:'Military',guildId:'federal-navy',commanderId:'bishop'},
   {id:'bifrost',designation:'Bifrost',name:'Bifrost',kind:'carrier',vesselClass:'Bifrost-class carrier',profession:'Military',guildId:'federal-navy',commanderId:'adaline'}
  ]
 };
 const identity=(vessel,guild,commander,status)=>Object.freeze({vessel,guild,commander,guildLabel:guild?.name??unassigned,status});
 function createModel({guilds=[],vessels=[],commanders=[]}={}){
  function index(records,normalize){
   const values=new Map();
   for(const item of records){
    const entry=normalize(item);
    if(!entry||values.has(entry.id))throw Error('Invalid or duplicate identity');
    values.set(entry.id,Object.freeze(entry));
   }
   return values;
  }
  const guildIndex=index(guilds,r=>id(r?.id)&&label(r.name)&&['military','merchant','independent'].includes(r.type)&&{id:r.id,name:r.name,type:r.type});
  const commanderIndex=index(commanders,r=>id(r?.id)&&label(r.name,64)&&label(r.title,30)&&{id:r.id,name:r.name,title:r.title});
  const vesselIndex=index(vessels,r=>{
   if(!id(r?.id)||!label(r.designation)||!label(r.name)||!id(r.kind)||!label(r.vesselClass,60)||!label(r.profession,100)||
    (r.guildId!=null&&!guildIndex.has(r.guildId))||(r.commanderId!=null&&!commanderIndex.has(r.commanderId)))return null;
   const crewRefs=r.crewRefs??[];
   if(!Array.isArray(crewRefs)||crewRefs.some(ref=>!id(ref))||new Set(crewRefs).size!==crewRefs.length)return null;
   return {id:r.id,locationVesselId:r.id,crewRefs:Object.freeze([...crewRefs]),designation:r.designation,name:r.name,kind:r.kind,vesselClass:r.vesselClass,profession:r.profession,
    guildId:r.guildId??null,commanderId:r.commanderId??null};
  });
  const get=key=>{
   const vessel=vesselIndex.get(key);
   return vessel?identity(vessel,guildIndex.get(vessel.guildId)??null,commanderIndex.get(vessel.commanderId)??null,'fallback'):null;
  };
  const listGuild=key=>guildIndex.has(key)?Object.freeze([...vesselIndex.values()].filter(r=>r.guildId===key).map(r=>get(r.id))):Object.freeze([]);
  function replaceVessel(oldId,next){
   const old=vesselIndex.get(oldId);
   if(!old||!id(next?.id)||vesselIndex.has(next.id)||(Object.hasOwn(next,'guildId')&&next.guildId!==old.guildId))throw Error('Invalid vessel replacement');
   // Registry-only operation: no crew, docking, fighters, or position transfer.
   return createModel({guilds:[...guildIndex.values()],commanders:[...commanderIndex.values()],
    vessels:[...vesselIndex.values()].filter(r=>r.id!==oldId).concat({...next,guildId:old.guildId,crewRefs:[]})});
  }
  return Object.freeze({get,listGuild,replaceVessel,ids:Object.freeze([...vesselIndex.keys()])});
 }
 const registry=createModel(configured),pending=new Map();
 const origin=window.location?.hostname==='rift-runner.boundlessghost16.chatgpt.site'?'https://rift-runner.gambizt3.workers.dev':'';
 function readRegistry(data,reference){
  const v=data?.vessel;
  if(data?.version!==1||data.access!=='guest'||v?.id!==reference.vessel.id||v.kind!==reference.vessel.kind||
   !label(v.designation)||!(v.name===null||label(v.name))||!label(v.vesselClass,60)||!label(v.profession,100)||
   !(v.admiral===null||label(v.admiral,64)))return null;
  const known=configured.commanders.find(c=>c.name===v.admiral);
  const commander=known?Object.freeze({...known}):v.admiral===null?null:Object.freeze({id:null,name:v.admiral,title:'Admiral'});
  const vessel=Object.freeze({...reference.vessel,name:v.name??v.designation,designation:v.designation,vesselClass:v.vesselClass,
   profession:v.profession,commanderId:commander?.id??null});
  // v1 API has no verified owning guild or membership information.
  return identity(vessel,reference.guild,commander,'live');
 }
 async function load(key){
  const reference=registry.get(key);
  if(!reference)return null;
  if(!pending.has(key)){
   const request=(async()=>{
    try{
     const reply=await window.fetch(origin+'/api/multicrew/vessels/'+key,{credentials:'omit',cache:'no-store',redirect:'error'});
     if(!reply.ok)return reference;
     return readRegistry(await reply.json(),reference)??reference;
    }catch{return reference;}
   })();
   pending.set(key,request);
   void request.then(()=>{if(pending.get(key)===request)pending.delete(key);});
  }
  return pending.get(key);
 }
 window.RiftVesselIdentity=Object.freeze({...registry,load,createModel});
})();
