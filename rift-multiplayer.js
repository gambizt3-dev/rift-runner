'use strict';
(()=>{
 const key='rift-runner.fighter-parking-access.v1',generationKey='rift-runner.character-generation.v1';
 const origin=window.location?.hostname==='rift-runner.boundlessghost16.chatgpt.site'?'https://rift-runner.gambizt3.workers.dev':'';
 const path='/api/multiplayer/battles/blackwake',instances=new Map();
 const options={credentials:'omit',cache:'no-store',redirect:'error'};
 const timeout=()=>typeof window.AbortSignal?.timeout==='function'?{signal:window.AbortSignal.timeout(5000)}:{};
 async function info(){
  try{
   const r=await window.fetch(origin+path,{...options,...timeout()});
   return r.ok?await r.json():null;
  }catch{return null;}
 }
 async function submit(action,vessel,hull,params,battle='blackwake'){
  try{
   const s=window.localStorage,generation=s.getItem(generationKey),raw=s.getItem(key),token=JSON.parse(raw);
   if(token?.generation!==generation||!/^[0-9a-f]{64}$/.test(token?.bearer??''))return null;
   const id=battle+':'+vessel+':'+hull,known=instances.get(id);
   if(action==='step'&&(!known||known.generation!==generation))return null;
   const body={vessel,hull,...params};
   if(action==='step')body.instance=known.instance;
   const r=await window.fetch(origin+(battle==='blackwake'?path:'/api/multiplayer/battles/corsair-test')+'/'+action,{...options,...timeout(),method:'POST',
    headers:{Authorization:'Bearer '+token.bearer,'Content-Type':'application/json'},body:JSON.stringify(body)});
   if(!r.ok)return null;
   const d=await r.json(),state=d?.state;
   if(s.getItem(generationKey)!==generation||s.getItem(key)!==raw)return null;
   if(action==='status')return ['open','waiting','seated','running','complete'].includes(d?.status)&&Number.isInteger(d.players)&&
    d.players>=0&&d.players<=2&&(d.status==='open'?d.instance===null:/^[\da-f-]{36}$/.test(d.instance??''))?d:null;
   if(d?.version!==1||state?.id!==battle||
    typeof d.self!=='string'||typeof state.instance!=='string'||!Number.isSafeInteger(d.lastSeq)||!Number.isSafeInteger(state.tick)||
    !Array.isArray(state.ships)||!state.ships.some(p=>p.id===d.self&&p.vessel===vessel&&p.hull===hull)||
    !Array.isArray(state.shots)||!['running','complete'].includes(state.status))return null;
   if(action==='step'&&(instances.get(id)!==known||state.instance!==known.instance))return null;
   if(action==='join'&&battle==='corsair-test'&&params.instance!==null&&params.instance!==state.instance)return null;
   if(action==='join')instances.set(id,{generation,instance:state.instance});
   return d;
  }catch{return null;}
 }
 function join(vessel,hull,side,mode){return submit('join',vessel,hull,mode===undefined?{side}:{side,mode});}
 function step(vessel,hull,{seq,turn,thrust,strafe,fire}){return submit('step',vessel,hull,{seq,turn,thrust,strafe,fire});}
 const corsair=Object.freeze({
  status:(v,h)=>submit('status',v,h,{},'corsair-test'),
  join:(v,h,instance)=>submit('join',v,h,{instance},'corsair-test'),
  step:(v,h,{seq,turn,thrust,strafe,fire})=>submit('step',v,h,{seq,turn,thrust,strafe,fire},'corsair-test')
 });
 window.RiftMultiplayer=Object.freeze({info,join,step,corsair});
})();
