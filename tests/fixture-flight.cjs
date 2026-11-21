'use strict';
// Direct harness boot for older isolated physics/audio tests. Production
// startup and its lack of a synthetic gesture are checked in carrier-launch.
function withFlightFixture(source){
 return source.replace(/\}\)\(\);\s*$/,"globalThis.fixtureLaunch=(duel,event)=>{if(state!=='menu'||document.hidden||hangarDialog?.open)return;inputSource(event.pointerType==='touch'||event.pointerType==='pen');unlockAudio(undefined,event);start(duel);};})();");
}
function openFixture(sandbox,overlay,name,{isTrusted=true,duel=false}={}){
 const event={type:'click',isTrusted,pointerType:'touch',target:{closest:()=>({dataset:{rift:name}})}};
 if(name==='start'||name==='practice')sandbox.fixtureLaunch(duel&&name==='start',event);
 else overlay.handlers.click(event);
}
module.exports={withFlightFixture,openFixture};
