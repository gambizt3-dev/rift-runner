'use strict';
(() => {
 const data=[
  ['home','Pegasus','Carrier position','E–04',563,476,null,'Your squadron’s home berth in the Outer Reach.'],
  ['serein','Serein','Ocean planet','C–02',228,-213,'ocean','Temperate seas surround a broken chain of emerald islands.'],
  ['talven','Talven','Rocky planet','D–03',545,500,'rust','Rust-colored uplands and long canyons mark this rocky world.'],
  ['marrow','Marrow','Ringed giant','F–03',851,158,'rings','Broad amber rings surround a banded gas giant.'],
  ['nacre','Nacre','Ice planet','H–02',1085,-562,'ice','Glacial shelves glow pale blue over an icebound surface.'],
  ['sable','Sable','Storm world','I–04',1280,611,'violet','Violet clouds hide the surface beneath restless storms.'],
  ['caldera','Caldera','Volcanic planet','G–05',848,871,'lava','A dark crust splits into glowing rivers of stone.'],
  ['brine','Brine','Ocean planet','C–06',303,755,'ocean','Shallow turquoise water covers most of this quiet world.'],
  ['tallow','Tallow','Rocky planet','K–03',1530,-152,'rust','Broad rust plains and steep crater walls dominate the horizon.'],
  ['vesper','Vesper','Ringed giant','N–02',1925,-472,'rings','One narrow arc of warm rings catches light from the sector’s edge.'],
  ['morren','Morren','Ice planet','M–06',1620,965,'ice','A remote, blue-white world with long glacial fissures.'],
  ['hearth','Hearth','Volcanic planet','I–09',1120,1470,'lava','Crimson seams trace the breaks in weathered volcanic rock.'],
  ['iren','Iren','Ocean planet','M–10',1660,1840,'ocean','Wide ocean basins echo the deep teal of the neighboring stars.'],
  ['hollow','Hollow','Rocky planet','O–09',2060,1200,'rust','A plain of low craters ends in a broken grey escarpment.'],
  ['nyx','Nyx','Storm world','Q–05',2160,480,'violet','Purple storms band the dayside of this distant world.'],
  ['kel','Kel','Ice planet','S–03',2455,-560,'ice','The eastern edge of the chart holds this pale frozen planet.'],
  ['crook','Crook','Ringed giant','R–11',2290,2250,'rings','A gold-rimmed giant at the southern limit of the mapped Reach.'],
  ['lyren','Lyren','Ringed ice giant','F–N6',595,-623,'azure-rings','An ice-blue giant with thin rings that glow where they cross its shadow.'],
  ['verdan','Verdan','Forest planet','U–02',2510,110,'forest','An emerald canopy covers the lowlands. Pale river deltas are visible from orbit.'],
  ['siroc','Siroc','Desert planet','F–S7',518,2380,'dune','Sunlit dune seas hide long channels cut into ancient rock.'],
  ['kiva','Kiva','Ice moon','P–N6',2120,-213,'ice-moon','A small ice moon threaded with bright faults. It travels outside Vesper’s rings.'],
  ['cinder','Cinder','Volcanic moon','T–S7',2550,1915,'cinder-moon','A dark moon with red-hot fractures, far out on Crook’s southern chart.'],
  ['ironwake','Ironwake','Planet-sized asteroid','L–S8',1450,2380,'iron-body','A lopsided iron-and-stone body large enough to appear beside planets on the chart. Its longest ridge is bright with exposed metal.']
 ].map(([id,name,type,code,x,y,art,copy])=>({id,name,type,code,x,y,art,copy}));
 data.push({id:'pirates',name:'Corsair Cluster',type:'Pirate signal',code:'C–10',x:365,y:1160,poi:true,
  copy:'An intermittent signal flickers among a cluster of derelicts. The crew can survey it as the carrier passes.',
  survey:'Survey complete: The derelicts conceal an abandoned pirate relay. A cold beacon still repeats the old call sign: Blackwake.'});
 data.push({id:'south-moon',name:'Uncharted Moon',type:'Uncharted moon',code:'E–15',x:805,y:1920,art:'chart-moon',big:true,
  copy:'A large, cratered moon in the far south. Its radio band is silent and its charts carry no name.'});
 const frames={ocean:[0,0],lava:[50,0],rings:[100,0],ice:[0,100],violet:[50,100],rust:[100,100]};
 // Portrait cells are reused as atmospheric backdrops. Exclude nonplanet
 // signals, asteroids and moons; blank neighboring sectors remain blank.
 const flightArt=Object.freeze({forest:'ocean',dune:'rust','azure-rings':'ice'});
 function nearPlanet(pos,priorId){
  if(pos?.sector!=='reach'||!Number.isFinite(pos.x)||!Number.isFinite(pos.y))return null;
  let closest=null;
  for(const world of data){
   const art=frames[world.art]?world.art:flightArt[world.art];
   if(!art)continue;
   const dx=world.x-pos.x,dy=world.y-pos.y,distance=Math.hypot(dx,dy);
   if(distance>390)continue;
   const score=distance-(world.id===priorId?40:0);
   if(!closest||score<closest.score)closest={world,frame:frames[art],dx,dy,distance,score};
  }
  return closest;
 }
 for(const world of data)Object.freeze(world);
 for(const cell of Object.values(frames))Object.freeze(cell);
 window.RiftGalaxyCatalog=Object.freeze({worlds:Object.freeze(data),frames:Object.freeze(frames),nearPlanet});
 const worker='https://rift-runner.gambizt3.workers.dev';
 const paths=new Map([['rift-carrier','/api/galaxy/carrier'],['bifrost','/api/galaxy/vessels/bifrost']]);
 const now=()=>window.performance.now();
 const destinations=new Set(['Rift Rendezvous','Corsair Cluster','Uncharted Moon','Uncharted Frontier']);
 const bifrostDestinations=new Set(['Uncharted Frontier','Frontier Survey Arc','Outer Reach Sweep']);
 const target=(name,id)=>name===undefined||(id==='bifrost'?bifrostDestinations:destinations).has(name);
 const sector=id=>id==='reach'||id==='frontier';
 const num=(value,lo,hi)=>Number.isFinite(value)&&value>=lo&&value<=hi;
 const epoch=n=>Number.isSafeInteger(n)&&n>=0;
 const xy=(x,y)=>num(x,0,2750)&&num(y,-850,2660);
 function validate(data,id='rift-carrier'){
  const ship=data?.carrier,legs=data?.trajectory;
  if(data?.version!==1||!paths.has(id)||!epoch(data.serverTime)||ship?.id!==id||!sector(ship.sector)||
    !xy(ship.x,ship.y)||!num(ship.heading,0,360)||!num(ship.speed,0,123)||
    !['holding','cruising'].includes(ship.phase)||!target(ship.destination,id)||typeof ship.corsairSurveyed!=='boolean'||!Array.isArray(legs)||legs.length<1||legs.length>100)return null;
  let previous=null;
  for(const p of legs){
   if(!p||!sector(p.sector)||!epoch(p.startAt)||!epoch(p.endAt)||(previous!==null&&p.startAt!==previous)||p.endAt<=p.startAt||
    !target(p.destination,id)||!num(p.rampMs,0,(p.endAt-p.startAt)/2)||!num(p.heading,0,360)||!xy(p.fromX,p.fromY)||!xy(p.toX,p.toY))return null;
   const legLength=Math.hypot(p.toX-p.fromX,p.toY-p.fromY),legTime=p.endAt-p.startAt-p.rampMs;
   if(!p.rampMs?legLength!==0:1000*legLength/legTime>123)return null;
   previous=p.endAt;
  }
  const active=legs.find(p=>p.startAt<=data.serverTime&&p.endAt>data.serverTime);
  if(!active||active.sector!==ship.sector)return null;
  const exact=at(active,data.serverTime,ship.corsairSurveyed,false,id);
  if(Math.hypot(exact.x-ship.x,exact.y-ship.y)>.001||Math.abs(exact.speed-ship.speed)>.001)return null;
  return data;
 }
 function at(p,serverTime,corsairSurveyed,stale,id){
  const len=p.endAt-p.startAt,r=p.rampMs,t=Math.max(0,Math.min(len,serverTime-p.startAt));
  const area=r===0?0:t<r?t*t/(2*r):t>len-r?len-r-(len-t)**2/(2*r):t-r/2;
  const fraction=r?area/(len-r):0,d=Math.hypot(p.toX-p.fromX,p.toY-p.fromY);
  return {id,sector:p.sector,x:p.fromX+(p.toX-p.fromX)*fraction,y:p.fromY+(p.toY-p.fromY)*fraction,
   heading:p.heading,destination:p.destination,next:r&&!stale?{x:p.toX,y:p.toY}:null,phase:stale?'stale':r&&d?(p.toX<=0||p.toX>=2750?'transit':'cruising'):'holding',
   speed:r&&!stale?1000*d*Math.min(1,t/r,(len-t)/r)/(len-r):0,corsairSurveyed};
 }
 function watch(id='rift-carrier'){
  const path=paths.get(id);if(!path)return null;
  const url=(window.location?.hostname==='rift-runner.boundlessghost16.chatgpt.site'?worker:'.')+path;
  let state=null,mark=0,anchor=0,failed=false,pending=null,timer=null,closed=false;
  function schedule(ms){
   window.clearTimeout(timer);
   if(!document.hidden&&!closed)timer=window.setTimeout(refresh,ms);
  }
  async function refresh(){
   if(document.hidden||pending||closed)return;
   const request=new AbortController(),started=now();
   pending=request;
   const timeout=window.setTimeout(()=>request.abort(),6500);
   try{
    const reply=await window.fetch(url,{cache:'no-store',credentials:'omit',signal:request.signal});
    if(!reply.ok)throw Error('Galaxy unavailable');
    const data=validate(await reply.json(),id);
    if(!data)throw Error('Invalid carrier snapshot');
    if(closed||document.hidden||pending!==request||state&&data.serverTime<state.serverTime)return;
    mark=now();
    anchor=data.serverTime+Math.min(1200,(mark-started)/2);
    state=data;failed=false;
   }catch{if(!document.hidden)failed=true;}
   finally{
    window.clearTimeout(timeout);
    if(pending===request)pending=null;
    if(!document.hidden)schedule(failed?5000:16000);
   }
  }
  function wake(){
   if(closed)return;
   if(document.hidden){window.clearTimeout(timer);return;}
   const age=now()-mark;
   if(!state||age>2500){window.clearTimeout(timer);refresh();}
   else if(!pending)schedule(Math.max(1000,16000-age));
  }
  document.addEventListener('visibilitychange',wake);
  window.addEventListener('pageshow',wake);
  refresh();
  return Object.freeze({
   close(){
    closed=true;window.clearTimeout(timer);pending?.abort();
    document.removeEventListener?.('visibilitychange',wake);
    window.removeEventListener?.('pageshow',wake);
   },
   sample(time=now()){
    if(!state)return {phase:failed?'unavailable':'connecting'};
    const t=anchor+Math.max(0,time-mark),legs=state.trajectory,tail=legs.at(-1);
    const leg=legs.find(p=>p.startAt<=t&&t<p.endAt);
    if(leg)return at(leg,t,state.carrier.corsairSurveyed,false,id);
    if(t>=tail.endAt)return at(tail,tail.endAt,state.carrier.corsairSurveyed,true,id);
    return state.carrier;
   }
  });
 }
 window.RiftGalaxyState=Object.freeze({watch,validate});
})();
