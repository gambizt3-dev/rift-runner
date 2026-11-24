'use strict';
(()=>{
 const modules=Object.freeze({
  drive:Object.freeze({id:'corvette-keel-drive',name:'Keel Drive',role:'Corvette engine'}),
  core:Object.freeze({id:'corvette-keel-he3-generator',name:'Keel He3 Generator',role:'Corvette power generator'}),
  battery:Object.freeze({id:'corvette-keel-reserve-cell',name:'Keel Reserve Cell',role:'Corvette power storage'}),
  turret:Object.freeze({id:'corvette-twin-s4',name:'Twin Turret',role:'Detachable turret',size:4,barrels:2})
 });
 const mounts=Object.freeze(['port-forward','starboard-forward','port-aft','starboard-aft']
  .map((id,i)=>Object.freeze({id,size:4,kind:'turret',label:['Port forward','Starboard forward','Port aft','Starboard aft'][i]})));
 const create=()=>{
  let fitted=mounts[0].id;
  return Object.freeze({
   fitted:()=>fitted,
   fit(mountId,moduleId){
    if(!mounts.some(m=>m.id===mountId&&m.size===modules.turret.size&&m.kind==='turret')||moduleId!==modules.turret.id||fitted!==null)return false;
    fitted=mountId;return true;
   },
   remove(mountId){if(fitted!==mountId||fitted===null)return false;fitted=null;return true;}
  });
 };
 window.RiftCorvette=Object.freeze({modules,mounts,create});
 const rig=document.getElementById('corvette-mounts');
 if(!rig)return;
 const preview=create(),status=document.getElementById('corvette-fit-status');
 const controls=[...rig.querySelectorAll('button[data-mount]')];
 function render(){
  const active=preview.fitted();
  status.textContent=active?'1 of 4 mounts fitted · '+mounts.find(m=>m.id===active).label:'No turret fitted · choose an empty mount';
  for(const button of controls){
   const id=button.dataset.mount,attached=id===active;
   button.setAttribute('aria-pressed',String(attached));
   button.disabled=Boolean(active&&!attached);
   button.textContent=attached?'Remove turret':active?'Empty':'Fit turret';
   button.setAttribute('aria-label',button.textContent+' · '+mounts.find(m=>m.id===id).label);
  }
 }
 for(const button of controls)button.addEventListener('click',()=>{
  if(!preview.remove(button.dataset.mount))preview.fit(button.dataset.mount,modules.turret.id);
  render();
 });
 const back=document.getElementById('corvette-back'),vessel=new URLSearchParams(window.location.search).get('vessel');
 if(vessel==='bifrost'||vessel==='rift-carrier')back.href='./carrier-crew.html?vessel='+vessel+'#crew-classes';
 render();
})();
