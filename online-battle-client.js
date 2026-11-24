(() => {
 'use strict';
 function create(api,vessel,hull,side,show){
  let issued=0,receipt=null,pending=false,next=0,failures=0,active=true;
  const accept=data=>{
   if(!active||!data?.self||!Number.isSafeInteger(data.lastSeq)||!Array.isArray(data.state?.ships)||!Array.isArray(data.state?.shots)||
     !Number.isSafeInteger(data.state.tick)||!data.state.ships.some(ship=>ship.id===data.self))return false;
   if(receipt&&(data.self!==receipt.self||data.state.instance!==receipt.state.instance||data.state.tick<receipt.state.tick))return false;
   issued=Math.max(issued,data.lastSeq);receipt=data;failures=0;show(data);return true;
  };
  return {
   async join(){try{return active&&accept(await api.join(vessel,hull,side));}catch{return false;}},
   update(now,input){
    if(!active||!receipt||receipt.state.status==='complete'||pending||now<next)return;
    pending=true;next=now+170;
    const seq=++issued;
    Promise.resolve().then(()=>active?api.step(vessel,hull,{seq,turn:input.turn,thrust:input.thrust,strafe:input.strafe,fire:input.fire}):null)
     .then(data=>{if(active&&!accept(data))show(receipt,++failures);},()=>{if(active)show(receipt,++failures);})
     .finally(()=>{pending=false;});
    return true;
   },
   close(){active=false;}
  };
 }
 window.RiftOnlineBattleClient=Object.freeze({create});
})();
