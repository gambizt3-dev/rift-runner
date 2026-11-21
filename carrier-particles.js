(() => {
 const layer=document.getElementById('carrier-passers'),ship=document.getElementById('carrier-scene');
 if(!layer||!ship)return;
 const motion=globalThis.matchMedia?.('(prefers-reduced-motion: reduce)');
 const pool=[],limit=4;
 let timer=null,parked=false;
 const random=(low,high)=>low+(high-low)*Math.random();
 const active=()=>!parked&&!document.hidden&&!motion?.matches;
 function put(node,name,value){node.style.setProperty('--pass-'+name,value);}
 function flyBy(){
  const view=layer.getBoundingClientRect(),hull=ship.getBoundingClientRect();
  if(view.width<100||view.height<100||hull.width<=0)return;
  let dot=pool.find(node=>node.hidden);
  if(!dot){
   if(pool.length===limit)return;
   dot=document.createElement('span');dot.hidden=true;
   dot.addEventListener('animationend',()=>{dot.hidden=true;});
   layer.append(dot);pool.push(dot);
  }
  const side=Math.random()<.5?-1:1,near=Math.random()<.36;
  const center=hull.left-view.left+hull.width/2;
  const lane=Math.min(view.width*.44,hull.width*random(.31,.58));
  const x=Math.max(5,Math.min(view.width-5,center+side*lane)),y=view.height*random(.12,.72);
  const dy=near?random(120,220):random(73,120),dx=side*(near?random(10,22):random(4,12));
  put(dot,'left',x.toFixed(1)+'px');put(dot,'top',y.toFixed(1)+'px');
  put(dot,'dx',dx.toFixed(1)+'px');put(dot,'dy',dy.toFixed(1)+'px');
  put(dot,'slant',(-Math.atan2(dx,dy)*180/Math.PI).toFixed(1)+'deg');
  put(dot,'time',Math.round(near?random(650,940):random(880,1280))+'ms');
  put(dot,'length',(near?random(9,18):random(5,9)).toFixed(1)+'px');
  put(dot,'width',near?'1.6px':'1px');
  put(dot,'opacity',(near?random(.42,.61):random(.27,.43)).toFixed(2));
  dot.hidden=false;
 }
 function arm(first=false){
  if(!active()||timer!==null)return;
  const delay=first?random(930,1580):random(1750,3950);
  const id=globalThis.setTimeout(()=>{
   if(timer!==id)return;
   timer=null;
   if(!active())return;
   flyBy();arm();
  },Math.round(delay));
  timer=id;
 }
 function clear(){
  if(timer!==null)globalThis.clearTimeout(timer);
  timer=null;
  for(const node of pool)node.hidden=true;
 }
 function sync(){
  const inFlight=active();
  layer.dataset.parked=String(!inFlight);
  if(inFlight)arm(true);else clear();
 }
 document.addEventListener('visibilitychange',sync);
 globalThis.addEventListener('pagehide',()=>{parked=true;sync();});
 globalThis.addEventListener('pageshow',()=>{parked=false;sync();});
 motion?.addEventListener?.('change',sync);
 sync();
})();
