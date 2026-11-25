'use strict';
(() => {
 // Coordinates are relative to the 350-unit Crosswind hull, with the pad
 // stripes on the centerline. The upper, middle, and lower mounts are paired.
 const mounts=Object.freeze([-53,15,81].flatMap(y=>[-1,1].map(side=>Object.freeze({side,x:side*37,y}))));
 const cooldown=1.25,halfArc=Math.PI/6,pulseSpacing=.12,pulseCount=3;
 const state=()=>({readyAt:0,lastSide:null,burst:null});
 function candidate(pose,target){
  const dx=target.x-pose.x,dy=target.y-pose.y,c=Math.cos(pose.heading),s=Math.sin(pose.heading);
  const x=dx*c+dy*s,y=-dx*s+dy*c;
  if(Math.abs(x)<42)return null;
  const side=x<0?-1:1;
  const traverse=Math.atan2(side*y,Math.abs(x));
  if(Math.abs(traverse)>halfArc+1e-10)return null;
  return {side,traverse:Math.max(-halfArc,Math.min(halfArc,traverse))};
 }
 function volley(pose,aim,pulse){
  const c=Math.cos(pose.heading),s=Math.sin(pose.heading);
  const angle=pose.heading+(aim.side<0?Math.PI:0)+aim.traverse;
  const shots=mounts.filter(m=>m.side===aim.side).map((m,cannon)=>{
   const x=pose.x+m.x*c-m.y*s+Math.cos(angle)*8,y=pose.y+m.x*s+m.y*c+Math.sin(angle)*8;
   return {x,y,a:angle,side:aim.side,cannon,pulse};
  });
  return {side:aim.side,shots,pulse};
 }
 function readyPose(pose,time){
  return pose&&[pose.x,pose.y,pose.heading,time].every(Number.isFinite);
 }
 function request(fire,pose,target,time,{deckBusy=false,random=null}={}){
  if(!fire||!readyPose(pose,time)||!target||![target.x,target.y].every(Number.isFinite)||
     deckBusy||fire.burst||time<fire.readyAt)return null;
  const aim=candidate(pose,target);if(!aim)return null;
  fire.lastSide=aim.side;fire.burst={...aim,index:1,nextAt:time+pulseSpacing};
  if(random){
   const burst=fire.burst={...aim,index:0,cannon:0,random,nextAt:time,pulseStartedAt:time};
   return staggeredShot(fire,pose,burst,time);
  }
  return volley(pose,aim,0);
 }
 function staggeredShot(fire,pose,burst,time){
  const pulse=burst.index,cannon=burst.cannon;
  if(cannon===0)burst.pulseStartedAt=time;
  const shot=volley(pose,burst,pulse).shots[cannon];
  const last=pulse===pulseCount-1&&cannon===2;
  const delay=()=>.026+.025*burst.random();
  if(last){fire.burst=null;fire.readyAt=time+cooldown;}
  else if(cannon===2){
   burst.index++;burst.cannon=0;
   burst.nextAt=Math.max(burst.pulseStartedAt+pulseSpacing,time+delay());
  }else{burst.cannon++;burst.nextAt=time+delay();}
  return {side:burst.side,pulse,shots:[shot],last};
 }
 function advance(fire,pose,time,{deckBusy=false}={}){
  if(!fire?.burst||!Number.isFinite(time))return null;
  if(!readyPose(pose,time)||deckBusy){fire.burst=null;fire.readyAt=time+cooldown;return null;}
  const burst=fire.burst;
  if(time+1e-9<burst.nextAt)return null;
  if(burst.random)return staggeredShot(fire,pose,burst,time);
  const fired=volley(pose,burst,burst.index++);
  if(burst.index===pulseCount){fire.burst=null;fire.readyAt=time+cooldown;}
  else burst.nextAt=time+pulseSpacing;
  return fired;
 }
 window.RiftRedGrinBroadside=Object.freeze({mounts,state,candidate,request,advance,cooldown,halfArc,pulseSpacing,pulseCount});
})();
