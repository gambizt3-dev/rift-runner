'use strict';
((root)=>{
 const entries=Object.freeze({
  navy:Object.freeze({name:'Federal Navy',kind:'Human faction',copy:'The organised human fleet. Pegasus and Bifrost patrol under their own admirals.'}),
  pirates:Object.freeze({name:'Pirates',kind:'Human faction',copy:'Raider crews. Blackwake is one of their ships; Corsair is an encounter, not a separate faction.'}),
  threnic:Object.freeze({name:'Threnic Concord',kind:'Alien faction',copy:'A nonhuman society that travels between rifts in linked ships. Its patrols pass through the Frontier even when no one is watching.'}),
  independent:Object.freeze({name:'Independent',kind:'Unaffiliated',copy:'The Free People: ordinary humans and unaffiliated players. Independent crews can found their own guilds and operate multicrew ships without joining a faction.'})
 });
 const byContact=Object.freeze({'rift-carrier':'navy',home:'navy',bifrost:'navy',blackwake:'pirates','pirate-hideout':'pirates','threnic-patrol':'threnic','wayfarer-armada':'independent'});
 const epoch=Date.UTC(2026,0,1),period=36*60*1000;
 const loop=(time,offset,cx,cy,rx,ry)=>{
  const phase=(((time-epoch+offset)%period+period)%period)/period*2*Math.PI;
  return {x:cx+rx*Math.cos(phase),y:cy+ry*Math.sin(phase)};
 };
 root.RiftGalaxyFactions=Object.freeze({entries,contact:id=>Object.hasOwn(byContact,id)?entries[byContact[id]]:null,
  patrol:(time=Date.now())=>loop(time,0,1380,805,550,360),
  armada:(time=Date.now())=>loop(time,period/3,1800,755,370,255)});
})(globalThis);
