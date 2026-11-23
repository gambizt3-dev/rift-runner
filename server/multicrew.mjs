// Public vessel identity only. The current release deliberately exposes one vessel.
const MULTICREW_ID='rift-carrier',MULTICREW_PATH='/api/multicrew/vessels/'+MULTICREW_ID;
const multicrewHeaders={'cache-control':'no-store','x-content-type-options':'nosniff',
 'content-type':'application/json; charset=UTF-8','access-control-allow-origin':'https://rift-runner.boundlessghost16.chatgpt.site'};
const multicrewRead='SELECT vessel_id,designation,vessel_name,vessel_class,profession,admiral,vessel_kind FROM rift_multicrew_vessel WHERE vessel_id=?1';
const multicrewReply=(body,status=200,extra={})=>new Response(JSON.stringify(body),{status,headers:{...multicrewHeaders,...extra}});
const multicrewLabel=(value,max)=>typeof value==='string'&&value.length>0&&value.length<=max&&value===value.trim();
async function handleMulticrew(request,env){
 if(new URL(request.url).pathname!==MULTICREW_PATH)return null;
 if(request.method!=='GET')return multicrewReply({error:'METHOD_NOT_ALLOWED'},405,{allow:'GET'});
 const unavailable=()=>multicrewReply({error:'MULTICREW_UNAVAILABLE'},503,{'retry-after':'30'});
 if(!env?.GALAXY_DB?.prepare)return unavailable();
 try{
  const row=await env.GALAXY_DB.prepare(multicrewRead).bind(MULTICREW_ID).first();
  if(row?.vessel_id!==MULTICREW_ID||row.vessel_kind!=='carrier'||!multicrewLabel(row.designation,80)||
     (row.vessel_name!==null&&!multicrewLabel(row.vessel_name,80))||
     !multicrewLabel(row.vessel_class,60)||!multicrewLabel(row.profession,100)||
     (row.admiral!==null&&!multicrewLabel(row.admiral,64)))return unavailable();
  return multicrewReply({version:1,vessel:{id:row.vessel_id,designation:row.designation,name:row.vessel_name,kind:row.vessel_kind,
   vesselClass:row.vessel_class,profession:row.profession,admiral:row.admiral},access:'guest'});
 }catch{return unavailable();}
}
export {handleMulticrew,MULTICREW_PATH};
