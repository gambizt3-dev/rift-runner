'use strict';
(()=>{
 const path='/api/galaxy/events/corsair',eventId=/^corsair:(reach|frontier):\d{1,16}$/;
 const generation='rift-runner.character-generation.v1',access='rift-runner.fighter-parking-access.v1';
 const defaults={credentials:'omit',cache:'no-store',redirect:'error'};
 const signal=()=>window.AbortSignal?.timeout?{signal:window.AbortSignal.timeout(3500)}:{};
 async function marker(){
  try{
   const r=await window.fetch(path,{...defaults,...signal()});if(!r.ok)return null;
   const {version,event:e}=await r.json();
   return version===1&&e?.status==='active'&&eventId.test(e.id)&&['reach','frontier'].includes(e.sector)&&
    [e.x,e.y,e.start].every(Number.isFinite)&&Array.isArray(e.joinable)?e:null;
  }catch{return null;}
 }
 function client(id){
  let pending=null,leaving=false;
  async function submit(action,hull,input={}){
   try{
    if(!eventId.test(id))return null;
    const s=window.localStorage,gen=s.getItem(generation),raw=s.getItem(access),key=JSON.parse(raw);
    if(!gen||key?.generation!==gen||!/^[0-9a-f]{64}$/.test(key?.bearer??''))return null;
    const r=await window.fetch(path+'/'+action,{...defaults,...signal(),method:'POST',...(action==='leave'?{keepalive:true}:{}),
     headers:{Authorization:'Bearer '+key.bearer,'Content-Type':'application/json'},
     body:JSON.stringify({eventId:id,hull,...input})});
    if(!r.ok||s.getItem(generation)!==gen||s.getItem(access)!==raw)return null;
    const d=await r.json();return d?.event?.id===id&&d.state?.instance===id?d:null;
   }catch{return null;}
  }
  async function play(action,hull,input){
   if(leaving)return null;
   const request=submit(action,hull,input);pending=request;
   try{return await request;}finally{if(pending===request)pending=null;}
  }
  const join=(v,h)=>play('join',h);
  return {join,rejoin:join,step:(v,h,input)=>play('step',h,input),
   async leave(v,h){if(leaving)return null;leaving=true;await pending;return submit('leave',h);}};
 }
 window.RiftGalaxyCorsair=Object.freeze({marker,client});
})();
