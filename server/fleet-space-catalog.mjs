// Stable Armada IDs, not display names or Galaxy coordinates. A cruiser
// with launch/docking facilities can use this same room model. Do not add
// a cruiser until it has its own real Armada ID, berths and pad layout.
const flightDeck=(name,hullClass,layout,recoveryPad)=>Object.freeze({
 name,hullClass,recoveryPad,
 pads:Object.freeze(layout.map(([x,y],id)=>Object.freeze({id,x:900+x*3,y:1540+y*3})))
});
export const FLEET_SPACE_ROOMS=Object.freeze({
 'rift-carrier':flightDeck('Pegasus','carrier',[[-12,84],[12,84],[-12,128],[12,128]],3),
 bifrost:flightDeck('Bifrost','carrier',[[-77,71],[77,71],[-88,112],[88,112]],3)
});
