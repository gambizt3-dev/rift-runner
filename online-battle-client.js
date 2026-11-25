(() => {
 'use strict';
 function create(api,vessel,hull,side,show,mode){
  let issued=0,receipt=null,pending=false,next=0,failures=0,active=true,recovering=false;
  const resumable=typeof api.rejoin==='function';
  const accept=data=>{
   if(!active||!data?.self||!Number.isSafeInteger(data.lastSeq)||!Array.isArray(data.state?.ships)||!Array.isArray(data.state?.shots)||
     !Number.isSafeInteger(data.state.tick)||!data.state.ships.some(ship=>ship.id===data.self))return false;
   if(receipt&&(data.self!==receipt.self||data.state.instance!==receipt.state.instance||data.state.tick<receipt.state.tick))return false;
   issued=resumable?data.lastSeq:Math.max(issued,data.lastSeq);receipt=data;failures=0;recovering=false;show(data);return true;
  };
  return {
   async join(){try{return active&&accept(await api.join(vessel,hull,side,...(mode?[mode]:[])));}catch{return false;}},
   update(now,input){
    if(!active||!receipt||receipt.state.status==='complete'||pending||now<next)return;
    pending=true;next=now+170;
    const tryingRecovery=recovering;
    const missed=()=>{
     if(!active)return;
     if(resumable){recovering=true;if(tryingRecovery)next=now+1600;}
     show(receipt,++failures);
    };
    const seq=resumable?receipt.lastSeq+1:++issued;
    Promise.resolve().then(()=>!active?null:tryingRecovery?
     api.rejoin(vessel,hull):api.step(vessel,hull,{seq,turn:input.turn,thrust:input.thrust,strafe:input.strafe,fire:input.fire}))
     .then(data=>{if(active&&!accept(data))missed();},missed)
     .finally(()=>{pending=false;});
    return true;
   },
   leave(){active=false;return Promise.resolve(api.leave?.(vessel,hull)).catch(()=>null);},
   close(){active=false;}
  };
 }
 window.RiftOnlineBattleClient=Object.freeze({create});
})();
