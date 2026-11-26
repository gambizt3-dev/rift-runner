'use strict';
// Canonical hull geometry and installed weapon specs. Room state, camera
// zoom, UI scale, and simulator-only overrides do not belong in this catalog.
((root)=>{
 const freeze=Object.freeze;
 const pegasusFrame=freeze([292,438]),crosswindFrame=freeze([350*211/777,350]);
 const rift3=freeze({id:'rift-fighter',class:'fighter',frame:freeze([87.36,58.24]),art:freeze([480,320]),visible:freeze([394,266])});
 const riftSize=freeze({width:rift3.frame[0]*rift3.visible[0]/rift3.art[0],length:rift3.frame[1]*rift3.visible[1]/rift3.art[1]});
 const bayFighterScale=.33,resoluteLength=rift3.frame[1]*4.6;
 const crosswindBroadside=freeze({id:'crosswind-broadside',damage:22,speed:400});
 const resoluteTwinGun=freeze({id:'resolute-twin',damage:6,speed:520,cycle:1.05,barrelGap:.13,spreadMin:.25,spreadMax:1.2});
 const scaledHull=(id,name,shipClass,scale,chart,asset,alpha,frame,handling,shield,weapon=null)=>{
  const [aw,ah]=asset,[l,t,r,b]=alpha,[fw,fh]=frame;
  const width=scale*chart[1]/44*riftSize.width,length=scale*chart[0]/29*riftSize.length;
  return freeze({id,name,class:shipClass,scale,chart:freeze(chart),asset:freeze(asset),alpha:freeze(alpha),frame:freeze(frame),
   width,length,x:width/((r-l)*fw/aw),y:length/((b-t)*fh/ah),stern:(b/ah-.5)*fh,handling:freeze({name,...handling}),shield,weapon});
 };
 const pegasus=scaledHull('pegasus','Pegasus','carrier',.9,[605,278],[512,768],[97,7,416,733],pegasusFrame,{mass:85,max:91,accel:27,turn:.30},160);
 const crosswind=scaledHull('crosswind','Crosswind','frigate',1.875,[255,54],[215,780],[3,2,212,777],crosswindFrame,{mass:38,max:119,accel:38,turn:.47},110,crosswindBroadside);
 const resolute=scaledHull('resolute','Resolute','corvette',1.4,[137,37],[147,459],[0,0,147,459],[resoluteLength*147/459,resoluteLength],{mass:16,max:148,accel:53,turn:.68},75,resoluteTwinGun);
 const ships=freeze({[rift3.id]:rift3,pegasus,crosswind,resolute});
 const catalog=freeze({ships,riftSize,bayFighterScale,capitalShips:freeze([pegasus,crosswind,resolute]),get:id=>ships[id]});
 if(typeof module==='object'&&module.exports)module.exports=catalog;
 else root.RiftShipDefinitions=catalog;
})(typeof window==='object'?window:globalThis);
