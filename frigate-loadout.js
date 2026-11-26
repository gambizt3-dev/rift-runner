'use strict';
(() => {
 const hull=window.RiftFrigateHulls?.crosswind, variants=window.RiftFrigateVariants;
 if(!hull||!variants)return;
 const variant=new URLSearchParams(location.search).get('vessel')==='red-grin'?variants.redGrin:variants.crosswind;
 const name=document.getElementById('frigate-name');
 name.textContent=variant.name;
 document.title=variant.name+' · Frigate Loadout · Rift Runner';
 document.getElementById('frigate-affiliation').textContent=variant.affiliation;
 document.getElementById('frigate-class').textContent=hull.classLabel+(variant.id==='crosswind'?' · Captain Nessa Rourke':'');
 const art=document.getElementById('frigate-art');art.src=variant.art??hull.art;art.alt=variant.name+' top view';
 for(const node of document.querySelectorAll('[data-slot]'))node.textContent=variant.loadout[node.dataset.slot]??'Not configured';
})();