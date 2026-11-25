'use strict';
((root)=>{
 const rows=[
  {id:'meridian-ring',name:'Meridian Ring',sector:'reach',x:1610,y:980,code:'Meridian orbit'},
  {id:'waypost-ring',name:'Waypost Ring',sector:'reach',x:650,y:720,code:'Outer Reach'},
  {id:'frontier-ring',name:'Frontier Ring',sector:'frontier',x:1230,y:930,code:'Frontier'}
 ];
 const stations=Object.freeze(rows.map(row=>Object.freeze({...row,type:'Orbital marketplace',market:true,
  copy:'A fixed orbital marketplace with a fly-through central opening. Pilots arriving here share the same local fleet map.'})));
 root.RiftMarketStations=Object.freeze({stations,range:260,gateY:160,returnY:2180,
  map:Object.freeze({width:1800,height:2400,x:900,y:1140,diameter:1140,innerRadius:245}),
  get(id){return stations.find(s=>s.id===id)??null;}});
})(globalThis);
