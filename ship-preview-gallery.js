'use strict';
((root)=>{
 const byClass=Object.freeze({
   freighters:Object.freeze([
    ['Patrol Cutter','vessels',0,0],['Courier Refit','vessels',1,0],['Wayfarer','vessels',2,0],
    ['Prospector','vessels',0,1],['Bulwark','vessels',1,1]
   ]),
   corvettes:Object.freeze([
    ['Pilgrim','corvettes-a',0,0],['Keystone','corvettes-a',1,0],['Surveyor','corvettes-a',2,0],
    ['Tidelock','corvettes-a',0,1],['Hearth','corvettes-a',1,1],
    ['Beacon','corvettes-b',0,0],['Stonefin','corvettes-b',1,0],['Sentinel','corvettes-b',2,0],
    ['Arbor','corvettes-b',0,1],['Relay','corvettes-b',1,1]
   ]),
   frigates:Object.freeze([
    ['Pathfinder','frigates',0,0],['Forge','frigates',1,0],['Rampart','frigates',2,0],
    ['Haven','frigates',0,1],['Breakwater','frigates',1,1]
   ]),
   cruisers:Object.freeze([
    ['Sovereign','cruisers',0,0],['Iron Meridian','cruisers',1,0],['Longreach','cruisers',2,0]
   ])
 });
 const ns='http://www.w3.org/2000/svg';
 const createArt=(d,row)=>{
  const [name,sheet,col,band]=row,rows=sheet==='cruisers'?1:2;
  const svg=d.createElementNS(ns,'svg'),image=d.createElementNS(ns,'image');
  const divider=sheet==='vessels'?475:512;
  const top=band===1?divider:0,height=rows===1?1024:band===1?1024-divider:divider;
  svg.setAttribute('viewBox',[col*512,top,512,height].join(' '));
  svg.setAttribute('role','img');svg.setAttribute('aria-label','Top-down view of '+name);
  image.setAttribute('href','./ship-preview-'+sheet+'.webp?v=slim-1');
  image.setAttribute('width','1536');image.setAttribute('height','1024');
  image.setAttribute('preserveAspectRatio','none');svg.append(image);
  return svg;
 };
 function mount(d){
  for(const [group,rows] of Object.entries(byClass)){
   const list=d.querySelector('#shop-catalog-'+group+' .shop-catalog-list');
   if(!list)continue;
   rows.forEach((row,i)=>{
    const item=d.createElement('li'),button=d.createElement('button');
    item.className='shop-catalog-card ship-look-card';
    button.className='shop-ship-banner ship-look-button';button.type='button';
    button.dataset.shipLook=group+':'+i;
    button.setAttribute('aria-label','Top-down preview: '+row[0]);button.setAttribute('aria-haspopup','dialog');
    button.append(createArt(d,row));item.append(button);list.append(item);
   });
  }
 }
 const get=key=>{const [group,i]=String(key).split(':');return Object.hasOwn(byClass,group)&&/^\d+$/.test(i??'')?byClass[group][Number(i)]??null:null;};
 root.RiftShipPreviewGallery=Object.freeze({byClass,createArt,mount,get});
})(globalThis);
