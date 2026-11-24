'use strict';
(()=>{
 const starter='rift-fighter',selectionKey='rift-runner.selected-fighter.v1';
 const profiles=[
  {id:starter,name:'Rift-4 Fighter',cardArt:'./rift4-ship-card-v2.webp',art:'./fighter-winged.png?v=23',flightArt:'./fighter-winged.png?v=23',damageArt:'./fighter-salvage-damaged.webp?v=76',hullHp:20,weight:60,radius:15,thrustMultiplier:1,turnMultiplier:1,noseGun:true,weaponSize:3},
  {id:'stocky-light-fighter',name:'Stocky Light Fighter',cardArt:'./stocky-light-fighter-concept.webp',art:'./stocky-light-fighter.webp',flightArt:'./stocky-light-fighter.webp',damageArt:'./stocky-light-fighter.webp',hullHp:26,weight:76,radius:17,thrustMultiplier:1,turnMultiplier:.92,noseGun:false,weaponSize:2,stockSparrows:1},
  {id:'bastion-9',name:'Bastion-9 Fleet Fighter',cardArt:'./bastion-9-fleet-fighter-concept.webp',art:'./bastion-9-fighter.webp',flightArt:'./bastion-9-fighter.webp',damageArt:'./bastion-9-fighter.webp',hullHp:16,weight:49,radius:14,thrustMultiplier:1.05,turnMultiplier:1.08,noseGun:false,weaponSize:2,stockSparrows:1}
 ];
 const byId=new Map(profiles.map(profile=>[profile.id,Object.freeze(profile)]));
 const ids=Object.freeze([...byId.keys()]);
 const get=id=>byId.get(id);
 const owned=id=>id!==starter&&byId.has(id)&&window.RiftCredits?.ownsHull?.(id)===true;
 const key=(base,id)=>!byId.has(id)?null:id===starter?base:base+'.'+id;
 const buildKey=id=>key('rift-runner.ship-build.v1',id);
 const hullKey=id=>key('rift-runner.hull-owned.v1',id);
 const gunKey=id=>key('rift-runner.ship-active-gun.v1',id);
 const selected=()=>{
  try{const id=window.localStorage.getItem(selectionKey);return owned(id)?id:starter;}catch{return starter;}
 };
 const select=id=>{
  if(id!==starter&&!owned(id))return false;
  try{window.localStorage.setItem(selectionKey,id);return selected()===id;}catch{return false;}
 };
 window.RiftFighters=Object.freeze({ids,starter,selectionKey,get,owned,selected,select,buildKey,hullKey,gunKey});
})();
