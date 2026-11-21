'use strict';
// Direct harness boot for older isolated physics/audio tests. Production
// startup and its lack of a synthetic gesture are checked in carrier-launch.
// Mechanics/audio scenarios can begin with a charged battery. Real launch and
// energy-economy checks use untouched source (null) and start from zero.
function seedFlightFuel(source,he3=20){
 if(he3===null)return source;
 if(!Number.isFinite(he3)||he3<0||he3>20||source.split('maxHp,he3:0,inv:').length!==2)throw new Error('Invalid HE3 fixture');
 return source.replace('maxHp,he3:0,inv:','maxHp,he3:'+he3+',inv:');
}
function withFlightFixture(source){
 return seedFlightFuel(source).replace(/\}\)\(\);\s*$/,"globalThis.fixtureLaunch=(duel,event)=>{if(state!=='menu'||document.hidden||hangarDialog?.open)return;inputSource(event.pointerType==='touch'||event.pointerType==='pen');unlockAudio(undefined,event);start(duel);};})();");
}
function openFixture(sandbox,overlay,name,{isTrusted=true,duel=false}={}){
 const event={type:'click',isTrusted,pointerType:'touch',target:{closest:()=>({dataset:{rift:name}})}};
 if(name==='start'||name==='practice')sandbox.fixtureLaunch(duel&&name==='start',event);
 else overlay.handlers.click(event);
}
module.exports={withFlightFixture,openFixture,seedFlightFuel};
