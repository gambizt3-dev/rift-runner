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
 const cooldownMs=850;
 const create=()=>{
  const mounted=new Map([[mounts[0].id,{aim:0,readyAt:0}]]);
  const cooldowns=new Map();
  return Object.freeze({
   fitted:()=>[...mounted.keys()],
   state(id){const turret=mounted.get(id);return turret?{...turret}:null;},
   fit(id,moduleId){
    if(moduleId!==modules.turret.id||mounted.has(id)||!mounts.some(m=>m.id===id&&m.kind==='turret'&&m.size===modules.turret.size))return false;
    mounted.set(id,{aim:0,readyAt:cooldowns.get(id)??0});return true;
   },
   remove:id=>mounted.delete(id),
   aim(id,degrees){
    const turret=mounted.get(id);
    if(!turret||!Number.isFinite(degrees))return false;
    turret.aim=Math.max(-180,Math.min(180,degrees));return true;
   },
   fire(id,now){
    const turret=mounted.get(id);
    if(!turret||!Number.isFinite(now)||now<turret.readyAt)return [];
    turret.readyAt=now+cooldownMs;cooldowns.set(id,turret.readyAt);
    return [-1,1].map(barrel=>({id,barrel,aim:turret.aim}));
   }
  });
 };
 window.RiftCorvette=Object.freeze({modules,mounts,create});
 const rig=document.getElementById('corvette-mounts');
 if(!rig)return;
 const preview=create(),status=document.getElementById('corvette-fit-status');
 const controls=[...rig.querySelectorAll('[data-bench]')];
 const topMounts=new Map([...document.querySelectorAll('[data-top-mount]')].map(img=>[img.dataset.topMount,img]));
 const now=()=>window.performance?.now?.()??Date.now();
 function update(card){
  const id=card.dataset.bench,fit=preview.state(id),label=mounts.find(m=>m.id===id).label;
  const button=card.querySelector('[data-mount]'),aim=card.querySelector('input'),fire=card.querySelector('[data-fire]');
  const sight=card.querySelector('[data-sight]'),reading=card.querySelector('output');
  button.setAttribute('aria-pressed',String(!!fit));button.disabled=false;
  button.textContent=fit?'Remove turret':'Fit turret';button.setAttribute('aria-label',button.textContent+' · '+label);
  const cooling=!!fit&&fit.readyAt>now();
  aim.disabled=!fit;fire.disabled=!fit;fire.setAttribute('aria-disabled',String(!fit||cooling));
  fire.textContent=cooling?'Recharging…':'Fire pair';
  sight.hidden=!fit;aim.value=fit?.aim??0;reading.textContent=(fit?.aim??0)+'°';
  const angle=(fit?.aim??0)+'deg',top=topMounts.get(id);
  sight.style.setProperty('--corvette-aim',angle);
  if(top){top.hidden=!fit;top.style.setProperty('--corvette-aim',angle);}
 }
 for(const card of controls){
  const id=card.dataset.bench,label=mounts.find(m=>m.id===id).label;
  card.querySelector('[data-mount]').addEventListener('click',()=>{
   if(!preview.remove(id))preview.fit(id,modules.turret.id);
   status.textContent=preview.fitted().length+' of 4 mounts fitted';update(card);
  });
  card.querySelector('input').addEventListener('input',event=>{
   if(preview.aim(id,Number(event.target.value)))update(card);
  });
  card.querySelector('[data-fire]').addEventListener('click',()=>{
   const pair=preview.fire(id,now());if(!pair.length)return;
   const effect=card.querySelector('[data-volley]');
   effect.style.setProperty('--corvette-shot-aim',pair[0].aim+'deg');
   effect.classList.remove('firing');void effect.offsetWidth;effect.classList.add('firing');
   effect.setAttribute('data-projectiles',String(pair.length));
   status.textContent=label+' · Both barrels fired';
   update(card);window.setTimeout?.(()=>update(card),cooldownMs+10);
  });
  update(card);
 }
 status.textContent=preview.fitted().length+' of 4 mounts fitted';
 const back=document.getElementById('corvette-back'),vessel=new URLSearchParams(window.location.search).get('vessel');
 if(vessel==='bifrost'||vessel==='rift-carrier')back.href='./carrier-crew.html?vessel='+vessel+'#crew-classes';
})();
