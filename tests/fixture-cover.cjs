'use strict';
// Fixed reference geometry for trajectory/material regressions only.
// The gameplay generator itself is separately exercised across seeded maps.
function stageClassicCover({asteroids,asteroidProfiles,sceneryDebris}){
 const slots=[[637,805,.58],[480,926,-.25],[342,770,.18]];
 asteroids.splice(0,asteroids.length,...asteroidProfiles.map((base,i)=>{
  const [x,y,phase]=slots[i],profile={...base,phase};
  return {x,y,asteroid:true,profile,r:profile.r,vx:0,vy:0,angle:phase,spin:0,wallFx:0,hitGlow:0,invMass:1/profile.mass,rockSign:i%2===0?1:-1};
 }));
 sceneryDebris.splice(0);
}
module.exports={stageClassicCover};
