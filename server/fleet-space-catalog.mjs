import shipDefinitions from '../ship-definitions.js';
// Stable Armada IDs, not display names or Galaxy coordinates. A cruiser
// with launch/docking facilities can use this same room model. Do not add
// a cruiser until it has its own real Armada ID, berths and pad layout.
const flightDeck=(name,hullClass,layout,recoveryPad)=>Object.freeze({
 name,hullClass,recoveryPad,
 pads:Object.freeze(layout.map(([x,y],id)=>Object.freeze({id,x:900+x*3,y:1540+y*3})))
});
const pegasusHull=shipDefinitions.get('pegasus'),[frameWidth,frameHeight]=pegasusHull.frame,[artWidth,artHeight]=pegasusHull.asset;
const pegasusShip=Object.freeze({id:pegasusHull.id,x:900,y:1320,heading:-Math.PI/2,
 width:frameWidth*pegasusHull.x,height:frameHeight*pegasusHull.y});
const pegasusRoom=Object.freeze({name:'Pegasus',hullClass:'carrier',recoveryPad:3,layoutVersion:2,carrier:pegasusShip,
 pads:Object.freeze(pegasusHull.pads.map(([x,y],id)=>Object.freeze({
  id,x:pegasusShip.x+(x/artWidth-.5)*pegasusShip.width,y:pegasusShip.y+(y/artHeight-.5)*pegasusShip.height})))});
export const FLEET_SPACE_ROOMS=Object.freeze({
 'rift-carrier':pegasusRoom,
 bifrost:flightDeck('Bifrost','carrier',[[-77,71],[77,71],[-88,112],[88,112]],3)
});
