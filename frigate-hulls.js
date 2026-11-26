'use strict';
(() => {
 // Ship identity, allegiance, equipment and paint belong to the variant,
 // not to the hull. NPCs using this hull need not belong to the same fleet.
 const slots=Object.freeze(['engine','generator','storage','weapons','shield'].map(id=>Object.freeze({id,required:true})));
 const defaults=Object.freeze({engine:'Frigate drive',generator:'Frigate He3 generator',storage:'Frigate reserve cell',weapons:'Variant-specific weapons',shield:'Frigate shield generator'});
 const createLoadout=(overrides={})=>({...defaults,...overrides});
 const crosswind=Object.freeze({
  id:'crosswind-class',classLabel:'Crosswind-class flight-deck frigate',
  art:'./blackwater-frigate.webp',length:350,width:350*211/777,
  slots,defaults,createLoadout,
  pads:Object.freeze([Object.freeze({x:-2,y:-71}),Object.freeze({x:-2,y:-5}),Object.freeze({x:-2,y:63}),Object.freeze({x:-2,y:100})])
 });
 window.RiftFrigateHulls=Object.freeze({crosswind});
 window.RiftFrigateVariants=Object.freeze({
  crosswind:Object.freeze({id:'crosswind',name:'Crosswind',affiliation:'Free People',hullId:crosswind.id,loadout:Object.freeze(createLoadout())}),
  redGrin:Object.freeze({id:'red-grin',name:'Red Grin',affiliation:'Pirates',
   hullId:crosswind.id,loadout:Object.freeze(createLoadout({weapons:'Red Grin broadside cannons'})),art:'./crosswind-red-grin.webp',status:'design-preview'})
 });
})();
