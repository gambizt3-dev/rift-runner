'use strict';
(() => {
 // Ship identity, allegiance, equipment and paint belong to the variant,
 // not to the hull. NPCs using this hull need not belong to the same fleet.
 const crosswind=Object.freeze({
  id:'crosswind-class',classLabel:'Crosswind-class flight-deck frigate',
  art:'./blackwater-frigate.webp',length:350,width:350*211/777,
  pads:Object.freeze([Object.freeze({x:-2,y:-71}),Object.freeze({x:-2,y:-5}),Object.freeze({x:-2,y:63}),Object.freeze({x:-2,y:100})])
 });
 window.RiftFrigateHulls=Object.freeze({crosswind});
 window.RiftFrigateVariants=Object.freeze({
  redGrin:Object.freeze({id:'red-grin',name:'Red Grin',affiliation:'Pirates',
   hullId:crosswind.id,art:'./crosswind-red-grin.webp',status:'design-preview'})
 });
})();
