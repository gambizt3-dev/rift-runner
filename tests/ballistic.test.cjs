'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const {seedFlightFuel}=require('./fixture-flight.cjs');
const gamePath=['../dist/game.js','../game.js'].map(f=>path.join(__dirname,f)).find(f=>fs.existsSync(f));
const dir=path.dirname(gamePath),source=fs.readFileSync(gamePath,'utf8');
const files={blaster:'RIFT_BLASTER_MP3_BASE64',ballistic:'RIFT_BALLISTIC_MP3_BASE64'};
const encoded={};
for(const [name,global] of Object.entries(files)){
 const asset=fs.readFileSync(path.join(dir,name+'-sfx.js'),'utf8');
 const match=asset.match(new RegExp(global+"='([A-Za-z0-9+/]+={0,2})'"));
 assert.ok(match,name+' Base64 asset');
 encoded[global]=match[1];
 assert.equal(Buffer.from(match[1],'base64').toString('base64'),match[1],name+' canonical Base64');
 assert.deepEqual(Buffer.from(match[1],'base64'),fs.readFileSync(path.join(dir,name+'-test.mp3')),name+' same native and WebAudio source');
}
assert.notEqual(encoded.RIFT_BLASTER_MP3_BASE64,encoded.RIFT_BALLISTIC_MP3_BASE64);
function setup({saved,savedFit,savedEngine,sprite=false,aimAssist=false,missing=false,decodePending=false,resumePending=false,echoAsset=null,echoDecodePending=false,musicAsset=null,musicFetch=null,musicDecodePending=false,musicDuration=10.752,thrusterBytes=null,thrusterFetch=null,thrusterDecodePending=false,thrusterDuration=4.10,canvasArchive=false,legacyArenaHangar=true,canvasBox=null,dpr=1,reducedMotion=false,address=null,dialogSupported=true,initialHidden=false,fieldSeed=null,pilotCredits=null,loadPilotMissions=false,loadRendezvous=false,traceClashPaint=false,steeringTrace,flarePaint,exhaustPaint,heatPaint,allyPaint,onlineLabelPaint,resolutePaint,resoluteArtTrace,hullBarPaint,initialHe3=20,savedBuild,legacyShield,savedHull,wallNow,sharedStorage,sessionData,beforeStorageRead,buildUI=false,hangarAudioUI=false,userActivation=null,returnDockAudio=false,flightShell=false,cockpitUI=false,cockpitTabs=false,galaxyWatch,crossBattle,multiplayer,fleetApproach=false,orbitMasks,muzzlePaint,aimPaint,loadFighters=false,loadCredits=false,homeVessel,parkingAdapter,parkingCrypto=false,wingStats,redGrinSim=false}={}){
 let gesture=false,clock=0,raf,lastContext=0,timerId=0;
 const timers=new Map();
 const advanceTimers=ms=>{
  const finish=clock+ms;
  for(;;){
   const next=[...timers].filter(([,t])=>t.at<=finish).sort((a,b)=>a[1].at-b[1].at)[0];
   if(!next)break;
   const [id,t]=next;timers.delete(id);clock=Math.max(clock,t.at);t.f();
  }
  clock=finish;
 };
 const ends=new Map();
 const spriteFrames=[],sprites=[],dashPatterns=[],transforms=[],rectangles=[],shadows=[],radialPaint=[],strokePaint=[];let rotation=0,translation,warp,scaleXY,resolutePath=[],resoluteClip=[];
 const played=[],flightNotes=[],fallbackNotes=[],native=[],decodes=[],resumes=[],echoes=[],musicVoices=[],musicFetches=[],thrusterVoices=[],thrusterFetches=[],radioVoices=[],graphs=[],events={},keys={},storage=sharedStorage??new Map([['rift-runner.shot-sound.v1',saved],['rift-runner.fighter-fit.v1',savedFit],['rift-runner.engine-fit.v1',savedEngine],['rift-runner.ship-build.v1',savedBuild],['rift-runner.hull-owned.v1',savedHull],['rift-runner.iphone-audio.v1','on'],['rift-runner.aim-mode.v1','auto'],['rift-runner.aim-assist.v2',aimAssist?'on':undefined]]);
 if(homeVessel)storage.set('rift-runner.pilot-profile.v1',JSON.stringify({version:2,companyVesselId:homeVessel}));
 if(legacyShield!==undefined)storage.set('rift-runner.shield-fit.v1',legacyShield);
 const hudNumbers=Array.from({length:6},()=>({textContent:''}));
 let focused=null;
 const elem=()=>({handlers:{},dataset:{},attrs:{},hidden:false,value:'',checked:true,setAttribute(k,v){this.attrs[k]=v;},getAttribute(k){return this.attrs[k]??null;},removeAttribute(k){delete this.attrs[k];},setPointerCapture(i){this.capture=i;},releasePointerCapture(i){if(this.capture===i)this.capture=null;},style:{setProperty(k,v){this[k]=v;}},addEventListener(k,f){this.handlers[k]=f;},getBoundingClientRect:()=>({width:480,height:720,left:0,top:0}),querySelector:()=>({focus(){},prepend(node){node.parentNode=this;}}),querySelectorAll:()=>hudNumbers,focus(){focused=this;}});
 const draw=new Proxy({globalAlpha:1,beginPath(){if(resoluteArtTrace)resolutePath=[];},moveTo(x,y){if(resoluteArtTrace)resolutePath.push([x,y]);},lineTo(x,y){if(resoluteArtTrace)resolutePath.push([x,y]);},clip(){if(resoluteArtTrace)resoluteClip=[...resolutePath];},fill(){
  if(!flarePaint&&!exhaustPaint)return;
  const color=this.fillStyle?.stops?.[0]?.[1],paint={rotation,translation,scaleXY,alpha:this.globalAlpha,...this.fillStyle};
  if(flarePaint&&this.fillStyle?.stops?.at(-1)?.[1]==='#2e8ffd00')flarePaint.push(paint);
  if(exhaustPaint&&color==='#9aafbcba')exhaustPaint.push({kind:'smoke',...paint});
 },fillText(label,x,y){if(resolutePaint&&label.startsWith("RESOLUTE"))resolutePaint.push({label,x,y});if(onlineLabelPaint&&/^(ALLIED|OPPOSING|Allied NPC|Opposing NPC) /.test(label))onlineLabelPaint.push(label);if(heatPaint&&/^(HEAT|COOLING) /.test(label))heatPaint.push({label,x,y});if(allyPaint&&/^(ALLY|AI LEAD|LEENA|TOMAS)$/.test(label))allyPaint.push({label,x,y:y-24});},
 ellipse(x,y){if(heatPaint&&this.fillStyle==='#bac9d3')heatPaint.push({vent:true,x,y});},fillRect(x,y,w,h){
  if(hullBarPaint&&['#946a3e','#14252e','#fff0a6','#93e5f4'].includes(this.fillStyle))hullBarPaint.push({x,y,w,h,color:this.fillStyle});
  if(muzzlePaint&&this.fillStyle==='#ffcd76')muzzlePaint.push({translation,rotation});
  if(x===-1&&y===-1&&w===2&&h===2)shadows.push(translation);
  if(exhaustPaint&&this.fillStyle==='#cafff2')exhaustPaint.push({kind:'spark',x,y,w,h,alpha:this.globalAlpha});
 },arc(x,y,r){if(aimPaint)aimPaint.push({x,y,r,color:this.strokeStyle,alpha:this.globalAlpha});},scale(...v){scaleXY=v;},transform(...v){warp=v;},setTransform(...a){transforms.push(a);},rect(...a){rectangles.push(a);},setLineDash(pattern){dashPatterns.push(Array.from(pattern));},rotate(angle){rotation=angle;},translate(x,y){translation=[x,y];warp=undefined;},drawImage(asset,...bounds){if(resoluteArtTrace&&asset.src?.includes("corvette-rift4-scale-v6"))resoluteArtTrace.push({bounds,clip:resoluteClip});spriteFrames.push({asset,bounds,rotation,translation,alpha:this.globalAlpha,warp});},stroke(){if(traceClashPaint)strokePaint.push({color:this.strokeStyle,alpha:this.globalAlpha});},createRadialGradient(...args){
  if(!traceClashPaint&&!exhaustPaint&&!flarePaint)return {addColorStop(){}};
  const stops=[],pairs=[];radialPaint.push({args,stops});return {args,stops:pairs,addColorStop(where,color){stops.push(color);pairs.push([where,color]);}};
 },createLinearGradient:(...ends)=>{const stops=[];return {ends,stops,addColorStop(offset,color){stops.push([offset,color]);}};}},{get:(a,k)=>k in a?a[k]:()=>{}});
 const el=Object.fromEntries(['game','hud','overlay','flight-he3-meter','flight-he3-amount','flight-heat-meter','flight-heat-amount','flight-heat-eye','flight-heat-alert','compact-hull-value','main-menu','main-menu-carrier','main-menu-hangar','arena-screen','flight-population','game-cabinet','return-main-menu','arena-settings','flight-deck','vandul-countdown','vandul-duel-readout','capital-dock-hud','fleet-return-hud','fleet-return-status','fleet-return-action','fleet-repair-action','online-entry','online-title','online-back','online-brief','online-deployment','online-mode','online-join','online-hud','online-status','online-dispatch','cross-watch-hud','cross-watch-status','cross-watch-sound','cross-watch-back','cross-watch-unavailable','docking-comms','docking-comms-text','docking-control-voice','docking-return-voice','dockmaster-portrait','dockmaster-portrait-surprised','capital-dock-action','capital-store-action','capital-flight-map','resolute-drill','resolute-dock','resolute-dock-action','resolute-dock-store','resolute-dock-cancel','resolute-dock-note','flight-view','flight-view-fleet','flight-view-normal','flight-view-focus','fighter-transit-title','fighter-transit','fighter-transit-chart','fighter-transit-status','fighter-transit-abort','capital-hangar','capital-dock-status','capital-orbital-view','capital-docking-announcement','custom-range','custom-range-button','custom-range-readout','escort-hud','escort-action','escort-status','wingman-formation','wing-radio','wing-radio-caption','wing-radio-leena','wing-radio-tomas','asteroid-cover-on','sound-on','test-sound','test-engine','hangar-test-engine','sound-status','gun-blaster','gun-ballistic','gun-ak77','gun-sparrow-s2','phone-audio-tools','iphone-audio','test-phone-audio','fire-button','aim-mode','aim-pad','move-pad','main-thruster','surge-thruster-label','surge-status','hangar','open-hangar','close-hangar','hangar-title','player-hangar-view','hangar-canopy-rig','hangar-canopy-button','canopy-hint','fit-primary','fit-secondary','fit-engine','fit-status','fit-hull-stat','fit-weight-stat','fit-engine-stat','fit-primary-stat','fit-secondary-stat'].map(k=>[k,elem()]));
 for(const id of ['fit-weapon-picker','fighter-fit-grid','fit-picker-slot','fit-picker-done',
  ...['primary','secondary'].flatMap(slot=>['picture','image','empty','title'].map(part=>'fit-'+slot+'-'+part)),
  ...['blaster','ballistic','ak77','sparrow-s2','empty'].flatMap(gun=>['fit-pick-'+gun,'fit-pick-'+gun+'-status','fit-pick-'+gun+'-summary'])])el[id]=elem();
 if(redGrinSim)for(const id of ['sim-watch-hud','sim-watch-title','sim-watch-camera','sim-watch-pause','sim-watch-exit','hangar-watch-red-grin-simulator','hangar-watch-red-grin-escort','hangar-watch-fighter-battle','hangar-watch-scale-free-fly','hangar-watch-practice','hangar-watch-solo-training','hangar-red-grin-simulator','hangar-red-grin-escort','red-grin-stage-readout','hangar-scale-free-fly','hangar-fighter-battle','hangar-large-scale-battle','hangar-watch-large-scale-battle','fighter-scale-view','fighter-battle-readout','fighter-cross-action','scale-fly-readout','scale-fly-land','scale-fly-overview','scale-fly-pause','scale-fly-helm','scale-helm-dock','scale-fly-turn','scale-fly-guns','scale-fire-port','scale-fire-starboard','scale-turn-left','scale-turn-right','scale-auto-move','scale-helm-rift','scale-helm-pegasus','scale-helm-crosswind','scale-helm-resolute','flight-view','flight-view-fleet','flight-view-normal','flight-view-focus'])el[id]=elem();
 if(flightShell){
  for(const id of ['flight-details','arena-toolbar','reset-field','battle-stage'])el[id]=elem();
  for(const node of [el['flight-details'],el['arena-toolbar'],el['battle-stage']]){
   node.append=child=>{child.parentElement=node;};
  }
  el['flight-details'].append(el['vandul-duel-readout']);
  el['battle-stage'].append(el['wingman-formation']);
  el['flight-details'].append(el.hud);el['flight-details'].append(el['reset-field']);
 }
 if(cockpitUI){
  for(const id of ['guest-hangar-view','guest-hangar-local','guest-hangar-loaner','guest-hangar-note','guest-hangar-home','hangar-bay-heading','hangar-damaged-bay-label','hangar-repaired-bay-label','hangar-board','hangar-loaner','hangar-bay-actions','hangar-formation-room','hangar-formation-button','corsair-wing-panel','corsair-wing-slot','corsair-wing-status','formation-add-wing','formation-pad-picker','formation-pad-title','formation-pilot','formation-fighter','formation-pad-note','formation-pad-assign','formation-pad-remove','formation-pad-close','hangar-cockpit','cockpit-title','cockpit-scene-art','cockpit-scene-frame','freighter-cockpit-view','freighter-view-open','freighter-flight-art','flight-canopy','flight-action-strip','cockpit-order','cockpit-launch-status','cockpit-launch','cockpit-exit','cockpit-bridge','cockpit-quest-list','cockpit-mission','cockpit-add-mode','cockpit-add-mission','cockpit-mode-picker','cockpit-mission-picker','cockpit-close-mode','cockpit-close-mission','cockpit-plan-name','cockpit-remove-plan','hangar-ship-choice','hangar-ship','hangar-ship-caption','hangar-ship-prev','hangar-ship-next','hangar-ship-name','hangar-ship-banner-art','hangar-preview-actions','hangar-preview-select','hangar-preview-rent','hangar-return-loaner','fit-shop-link'])el[id]=elem();
  for(const id of ['hangar-wing-mount','cockpit-wing-mount']){el[id]=elem();el[id].appendChild=node=>{node.parentNode=el[id];};}
  for(const slot of ['front-left','front','front-right','side-left','line-abreast','echelon-left','trail','echelon-right']){
   const pad=el['wing-pad-'+slot]=elem(),art=el['wing-art-'+slot]=elem();
   pad.querySelector=()=>art;pad.setAttribute('aria-label',slot);
  }
  if(cockpitTabs)for(const id of ['cockpit-mode-solo','cockpit-mode-online','cockpit-category-label'])el[id]=elem();
  el['hangar-cockpit'].hidden=true;
  for(const id of ['cockpit-order','cockpit-mission'])el[id].replaceChildren=function(...children){this.groups=children.filter(child=>child.label);this.options=children.flatMap(child=>child.children??child);};
  el['cockpit-quest-list'].replaceChildren=function(...children){this.children=children;};
 }
 if(buildUI)for(const view of ['ready','damaged'])for(const bay of ['01','02','04','06'])el['hangar-ambient-'+view+'-'+bay]=elem();
 if(buildUI)for(const id of ['menu-build-status','fit-build-status','fit-core','fit-battery','fit-core-badge','fit-battery-badge','fit-shield','fit-aegis-option','fit-shield-stat','fit-claim-hull','fit-repair-hull','fit-repair-direct','hangar-fighter-art','fit-hull-recovery-status','fit-repair-progress-wrap','fit-repair-progress','hangar-damaged-bay','hangar-repaired-bay','hangar-player-loadout','fit-salvage-preview','fit-core-empty','fit-core-module','fit-battery-empty','fit-battery-module','fit-core-title','fit-core-spec','fit-battery-title','fit-battery-spec','fit-core-art','fit-battery-art'])el[id]=elem();
 el['fit-weapon-picker'].hidden=true;
 el['flight-heat-eye'].hidden=true;
 if(returnDockAudio)el['docking-return-voice'].dataset.voiceSrc='./dock-return-radio.mp3?v=154';
 for(const voice of [el['docking-control-voice'],el['docking-return-voice']]){
 Object.assign(voice,{plays:0,paused:true,currentTime:0,play(){
  assert.ok(gesture,'native docking voice must start in a trusted gesture');this.plays++;this.paused=false;return Promise.resolve();
 },pause(){this.paused=true;}});
 Object.defineProperty(voice,'src',{get(){return this.getAttribute('src')??'';}});
 }
 if(!legacyArenaHangar)delete el['open-hangar'];
 if(hangarAudioUI)for(const id of ['hangar-engine-audio','hangar-engine-status'])el[id]=elem();
 el.game.getContext=()=>draw;if(canvasBox)el.game.getBoundingClientRect=()=>canvasBox;
 Object.assign(el.hangar,{open:false,showModal(){this.open=true;},close(){if(this.open){this.open=false;this.handlers.close?.();}}});
 if(!dialogSupported)delete el.hangar.showModal;
 if(el['freighter-cockpit-view'])Object.assign(el['freighter-cockpit-view'],{open:false,showModal(){this.open=true;},close(){this.open=false;}});
 el['hangar-canopy-rig'].dataset.canopy='closed';
 const movePad=el['move-pad'],moveButtons=Object.fromEntries('nw n ne w e sw s se'.split(' ').map(dir=>{
  const b=elem();b.dataset.move=dir;b.closest=()=>b;return [dir,b];
 }));
 movePad.getBoundingClientRect=()=>({left:20,top:400,width:120,height:120});
 movePad.contains=node=>node===movePad||node===el['main-thruster']||Object.values(moveButtons).includes(node);
 movePad.querySelector=selector=>moveButtons[selector.split('"')[1]];
 el['wingman-formation'].hidden=true;el['wingman-formation'].disabled=true;
 el['wing-radio'].hidden=true;
 for(const pilot of ['leena','tomas']){const image=el['wing-radio-'+pilot];image.hidden=true;image.dataset.src='./wing-comms-'+pilot+'.webp?v=193';}
 const rack={firstElementChild:el['gun-blaster'],insertBefore(node){this.firstElementChild=node;}};
 el['gun-blaster'].parentElement=rack;el['gun-ballistic'].parentElement=rack;el['gun-ak77'].parentElement=rack;el['gun-sparrow-s2'].parentElement=rack;
 const document={activeElement:el.game,hidden:initialHidden,getElementById:k=>el[k],querySelector:s=>s==='.weapon-rack'?rack:null,addEventListener:(k,f)=>events[k]=f};
 if(canvasArchive)document.createElement=tag=>{
  assert.equal(tag,'canvas');const layer={fills:0};
  layer.getContext=()=>new Proxy({fill(){layer.fills++;}},{get:(o,k)=>k in o?o[k]:()=>{}});
  return layer;
 };
 if(orbitMasks)document.createElement=tag=>{
  assert.equal(tag,'canvas');
  const tile={masks:[]},ctx={
   drawImage(...args){tile.source=args;tile.composite=this.globalCompositeOperation;},
   createRadialGradient(...axis){const stops=[];this.fillAxis=axis;return {addColorStop:(...stop)=>stops.push(stop),stops};},
   save(){},restore(){},translate(...v){tile.translate=v;},rotate(v){tile.angle=v;},scale(...v){tile.scale=v;},
   fillRect(...box){tile.masks.push({axis:this.fillAxis,stops:this.fillStyle.stops,box});}
  };
  tile.getContext=()=>ctx;orbitMasks.push(tile);return tile;
 };
 if(cockpitUI){
  const fallback=document.createElement;
  document.createElement=tag=>tag==='optgroup'?{...elem(),children:[],append(...items){this.children.push(...items);}}:['option','li','button'].includes(tag)?elem():fallback?.(tag);
 }
 const param=()=>({value:0,sets:[],ramps:[],targets:[],setValueAtTime(...a){this.sets.push(a);},setTargetAtTime(...a){this.targets.push(a);},linearRampToValueAtTime(...a){this.ramps.push(a);},cancelScheduledValues(t){this.cancelled=t;},exponentialRampToValueAtTime(){},cancelAndHoldAtTime(){}});
 const record=()=>({connect(){},disconnect(){}});
 class Graph{
  constructor(){assert(gesture,'AudioContext constructed in a gesture');this.id=++lastContext;this.state='suspended';this.destination={};this.sampleRate=8000;this.handlers={};graphs.push(this);}
  addEventListener(name,handler){this.handlers[name]=handler;}
  get currentTime(){return clock/1000;}
  resume(){assert(gesture);const ok=()=>{this.state='running';};if(!resumePending){ok();return Promise.resolve();}return new Promise(resolve=>resumes.push(()=>{ok();resolve();}));}
  decodeAudioData(bytes,callback,onError){
   const data=Buffer.from(bytes).toString('base64');
   const name=data===encoded.RIFT_BALLISTIC_MP3_BASE64?'ballistic':data===encoded.RIFT_BLASTER_MP3_BASE64?'blaster':echoAsset&&Buffer.from(bytes).equals(echoAsset)?'echo':musicAsset&&Buffer.from(bytes).equals(musicAsset)?'music':thrusterBytes&&Buffer.from(bytes).equals(thrusterBytes)?'thruster':null;
   assert.ok(name,'recognized exact asset');
   const decoded={duration:name==='music'?musicDuration:name==='thruster'?thrusterDuration:name==='echo'?.98:name==='ballistic'?(echoAsset ? .18 : .836):.261,name,id:this.id};
   const item={name,id:this.id,finish:()=>callback(decoded),fail:()=>onError()};decodes.push(item);
   if(name==='music'?!musicDecodePending:name==='thruster'?!thrusterDecodePending:name==='echo'?!echoDecodePending:!decodePending){item.finish();return Promise.resolve(decoded);}
  }
  close(){this.state='closed';return Promise.resolve();}
  createGain(){return {...record(),gain:param()};}
  createBiquadFilter(){return {...record(),frequency:param()};}
  createOscillator(){return {...record(),frequency:param(),stops:[],start(t){
   this.begins=t;
   if([274,720].includes(this.frequency.sets[0]?.[0]))flightNotes.push(this);else{played.push('synth-tone');fallbackNotes.push(this);}
  },stop(t){this.stops.push(t);if(t===undefined){ends.delete(this);this.onended?.();}else ends.set(this,t*1000);},disconnect(){this.disconnected=true;}};}
  createBufferSource(){return {...record(),connect(node){this.level=node;},disconnect(){this.disconnected=true;},start(t,offset){
   if(['music','thruster'].includes(this.buffer?.name)){assert.equal(this.loop,true);this.startAt=t;this.offset=offset;this.stops=[];(this.buffer.name==='music'?musicVoices:thrusterVoices).push(this);return;}
   assert.notEqual(this.loop,true);
   if(this.buffer?.name==='echo'){this.startAt=t;this.stops=[];echoes.push(this);}
   else if(echoAsset&&this.buffer?.name)ends.set(this,(t+this.buffer.duration)*1000);
   if(this.level?.type==='bandpass'&&this.level.frequency.sets[0]?.[0]===1350)radioVoices.push(this);
   played.push(this.buffer?.name?this.buffer.name+':'+this.buffer.id:'synth-noise');
  },stop(t){
   if(!['echo','music','thruster'].includes(this.buffer?.name)){this.onended?.();return;}
   this.stops.push(t);
   if(t===undefined){ends.delete(this);this.onended?.();}else ends.set(this,t*1000);
  }};}
  createBuffer(ch,n){const b=new Float32Array(n);return {getChannelData:()=>b};}
 }
 class Native{
  constructor(src){assert(gesture);this.src=src;this.original=src;this.plays=0;this.pauses=0;native.push(this);}
  play(){assert(gesture,'native play synchronous in click');this.plays++;return new Promise(resolve=>{this.resolve=resolve;});}
  pause(){this.pauses++;}
  removeAttribute(name){if(name==='src')this.src='';}
  load(){}
 }
 const window={...encoded,navigator:{userAgent:'iPhone',audioSession:{type:'auto'},userActivation},AudioContext:Graph,Audio:Native,setTimeout:(f,delay)=>{const id=++timerId;timers.set(id,{f,at:clock+delay});return id;},clearTimeout:id=>timers.delete(id),devicePixelRatio:dpr,matchMedia:()=>({matches:reducedMotion}),addEventListener:(k,f)=>{const prev=keys[k];keys[k]=prev?(e=>{prev(e);f(e);}):f;}};
 if(address)window.location=address;
 if(sessionData)window.sessionStorage={getItem:k=>sessionData.get(k)??null,setItem(k,v){sessionData.set(k,String(v));}};
 if(pilotCredits)window.RiftCredits=pilotCredits;
 if(echoAsset)window.RIFT_BALLISTIC_BURST_ECHO_MP3_BASE64=echoAsset.toString('base64');
 if(musicFetch||thrusterFetch||wingStats)window.fetch=url=>{
  if(url.endsWith("/stats")&&wingStats)return wingStats(url);
  if(url==='./stock-thruster-loop.mp3'){thrusterFetches.push(url);return thrusterFetch?.(url)??Promise.resolve({ok:false});}
  assert.equal(url,'./arena-background-1.mp3?v=1');
  musicFetches.push(url);return musicFetch?.(url)??Promise.resolve({ok:false});
 };
 if(sprite)window.Image=class{
  constructor(){this.complete=false;this.naturalWidth=0;sprites.push(this);}
 };
 if(missing==='blaster')delete window.RIFT_BLASTER_MP3_BASE64;else if(missing)delete window.RIFT_BALLISTIC_MP3_BASE64;
 const random=Object.create(Math);
 if(fieldSeed!==null){let seed=fieldSeed>>>0;random.random=()=>{seed=(Math.imul(1664525,seed)+1013904223)>>>0;return seed/4294967296;};}
 const sandbox={window,document,steeringTrace,Math:random,atob,performance:{now:()=>clock},localStorage:{getItem:k=>{beforeStorageRead?.(k,storage);return storage.get(k);},setItem:(k,v)=>storage.set(k,v)},requestAnimationFrame:f=>{raf=f;return 1;}};
 if(redGrinSim)for(const file of ['frigate-hulls.js','red-grin-broadside.js'])vm.runInNewContext(fs.readFileSync(path.join(dir,file),'utf8'),sandbox);
 if(loadPilotMissions){window.localStorage=sandbox.localStorage;vm.runInNewContext(fs.readFileSync(path.join(dir,'pilot-missions.js'),'utf8'),sandbox);}
 if(loadRendezvous){window.localStorage=sandbox.localStorage;vm.runInNewContext(fs.readFileSync(path.join(dir,'wing-rendezvous.js'),'utf8'),sandbox);}
 if(fleetApproach)vm.runInNewContext(fs.readFileSync(path.join(dir,'fleet-approach.js'),'utf8'),sandbox);
 if(crossBattle)window.RiftCrossBattle=crossBattle;
 if(galaxyWatch){vm.runInNewContext(fs.readFileSync(path.join(dir,'galaxy-shared.js'),'utf8'),sandbox);window.RiftGalaxyState={watch:galaxyWatch};}
 if(loadCredits||loadFighters)window.localStorage={...sandbox.localStorage,getItem:key=>sandbox.localStorage.getItem(key)??null};
 if(loadCredits){vm.runInNewContext(fs.readFileSync(path.join(dir,'pilot-credits.js'),'utf8'),sandbox);}
 window.localStorage??=sandbox.localStorage;
 vm.runInNewContext(fs.readFileSync(path.join(dir,'fighter-parking.js'),'utf8'),sandbox);
 if(parkingAdapter)window.RiftFighterParking=parkingAdapter(window.RiftFighterParking,storage);
 if(parkingCrypto)window.crypto={getRandomValues(){}};
 if(loadFighters){vm.runInNewContext(fs.readFileSync(path.join(dir,'fighter-registry.js'),'utf8'),sandbox);}
 if(multiplayer){window.RiftMultiplayer=multiplayer;vm.runInNewContext(fs.readFileSync(path.join(dir,'online-battle-client.js'),'utf8'),sandbox);}
 if(wallNow)sandbox.Date=class extends Date{static now(){return wallNow();}};
 vm.runInNewContext(seedFlightFuel(source,initialHe3).replace(/\}\)\(\);\s*$/,"if(steeringTrace){const steer=applySteeringCorrection;applySteeringCorrection=(ship,dx,dy,ref,drive)=>{const before=[ship.vx,ship.vy];steer(ship,dx,dy,ref,drive);steeringTrace({ship,dx,dy,ref,drive,before,after:[ship.vx,ship.vy]});};}globalThis.inspect=()=>({shotSound:fighterLoadout.weapon,fighterLoadout:{...fighterLoadout},practiceShots,practiceHits,surgeUntil,surgeReadyAt,rangeTargets,rangeScore,rangeClock,state,flightMode,formationEscorts,inPlayerFireLane,flyWingman,resoluteFormation,blaster,ballistic,ballisticHold,p,shots,cones,rings,sparks,clashBursts,shake,movePtr,thrustPtr,movePulse,aimPtr,aimAssist,autoLock,projectileVoices,formationEngine:hangarFormationEngine,engineVoiceActive:thruster?.driving??false,fighterFit,engineProfiles,thruster,enginePress,fireBurst,burstCooldown,burstModes,vandul:vanduls[0]??null,vanduls,waveAdmitted,duelWave,vandulLasers,duelClock,duelCountdown,vandulIngress,duelResult,vandulProfile,vandulLoadout,vandulModules,asteroids,sceneryDebris,asteroidProfiles,wreckage,activeWrecks,archivedWrecks,wreckLayer,riftWrecks,duelKills,arena,launch,playerIngress,carrierArrival,missionDeparture,missionFlight,vandulEntry,blackwake,pirateCapitals,redGrinConvoy,scaleFlyShips,fighterBattle,simDirector,resoluteFlightLength,riftFourFlightLength,capitalArt,testLead,wingman,testLeadGuide,wingmanOrder,escortShip,escortCourse,escortPoint,escortVelocity,escortPathClear,capitalShip,capitalCourse,capitalCoursePose,resoluteFormation,resoluteFlightLength,capitalBerth,capitalPads,capitalLift,berthLift,storageProgress,capitalDockCheck,pendingCarrierSortie,berthLocal,berthWorld,berthVelocity,camera:flightCamera(),layoutStats:{scale,hiDpi,cssScale:scale/hiDpi,viewW,viewH}});globalThis.launchForTest=(duel,event)=>{if(state!=='menu'||document.hidden||hangarDialog?.open)return;inputSource(event.pointerType==='touch'||event.pointerType==='pen');unlockAudio(undefined,event);start(duel?vandulFlight:practiceFlight);};globalThis.hangarAmbientForTest={rollHangarAmbient,paintHangarAmbient};globalThis.wingDeckForTest={chooseRecoveryPad,wingLaunchWave,advanceCapitalTraffic,beginWingIntake,queueCarrierWingTwo,startCapitalCapture, setWing:craft=>{wingman=craft;}};globalThis.emitAllyShotForTest=emitAllyShot;globalThis.armFinalForTest=()=>{duelWave=6;waveAdmitted=3;duelKills=9;};globalThis.fieldForTest=(seed,occupied)=>buildDuelCover(occupied,coverRandom(seed));globalThis.targetForTest=(on,pair=false)=>{flightMode={...flightMode,duel:on,credits:flightMode.id==='practice'?on:flightMode.credits};duelEnabled=on;resetDuel(0);if(on){if(pair)duelWave=4;admitVandul(launch.x,launch.y-123.8);if(pair)admitVandul(launch.x+180,launch.y-123.8);}};})();"),sandbox);
 const act=f=>{gesture=true;try{return f();}finally{gesture=false;}};
 const click=(id,extra={})=>act(()=>el[id].handlers.click({type:'click',isTrusted:true,stopPropagation(){},...extra}));
 const pointer=(type,id=3,node='fire-button',x=240,y=360,extra={})=>act(()=>el[node].handlers[type]?.({type,isTrusted:true,button:0,pointerType:'touch',pointerId:id,isPrimary:id===16,clientX:x,clientY:y,target:el[node],preventDefault(){},...extra}));
 const canvasPointer=(type,x,y)=>act(()=>el.game.handlers[type]({type,isTrusted:true,button:0,pointerType:'mouse',pointerId:95,clientX:x,clientY:y,preventDefault(){}}));
 const outside=(type,extra)=>act(()=>keys[type]?.({type,isTrusted:true,pointerType:'touch',target:el.game,preventDefault(){},...extra}));
 const key=(type,code,repeat=false)=>act(()=>keys[type]({type,code,repeat,isTrusted:true,preventDefault(){}}));
 const choiceEvent=(name,pointerType)=>({type:'click',isTrusted:true,pointerType,target:{closest:()=>({dataset:{rift:name}})}});
 const menuAction=(name,pointerType='touch')=>act(()=>el['main-menu'].handlers.click(choiceEvent(name,pointerType)));
 // Legacy mechanics tests invoke a trusted fixture gesture; production launch
 // uses a freshly navigated exact Carrier route, covered by carrier-launch.test.
 const choose=(name,pointerType='touch')=>name==='hangar'?menuAction(name,pointerType):act(()=>{
  const event=choiceEvent(name,pointerType);
  if(name==='start'||name==='practice')sandbox.launchForTest(name==='start',event);
  else el.overlay.handlers.click(event);
 });
 // Ordinary mechanics fixtures run the deliberately enemy-free Practice mode.
 const open=(name,pointerType)=>choose(name==='start'?'practice':name,pointerType);
 const testEngine=(id,type,extra={})=>act(()=>el[id].handlers[type]({type,isTrusted:true,button:0,pointerType:'touch',pointerId:77,preventDefault(){},...extra}));
 const change=(id,key,value)=>act(()=>{el[id][key]=value;el[id].handlers.change({type:'change',isTrusted:true});});
 return {el,moveButtons,get focused(){return focused;},hudNumbers,rack,spriteFrames,sprites,dashPatterns,transforms,rectangles,shadows,radialPaint,strokePaint,fit:(slot,value)=>change('fit-'+slot,'value',value),click,open,choose,menuAction,armFinalForTest:sandbox.armFinalForTest,emitAllyShotForTest:sandbox.emitAllyShotForTest,fieldForTest:sandbox.fieldForTest,pointer,canvasPointer,outside,key,testEngine,blur:()=>keys.blur(),played,flightNotes,fallbackNotes,native,decodes,resumes,echoes,musicVoices,musicFetches,thrusterVoices,thrusterFetches,radioVoices,graphs,storage,inspect:sandbox.inspect,
  advanceTimers,hangarAmbientForTest:sandbox.hangarAmbientForTest,wingDeckForTest:sandbox.wingDeckForTest,mockRandom:value=>{random.random=()=>value;},skipFrames:ms=>{clock+=ms;},step:(n=1)=>{while(n--){clock+=16;for(const [osc,due] of ends){if(due<=clock){ends.delete(osc);osc.onended?.();}}raf(clock);}},change:(name)=>click('gun-'+name),
  mute:(on=true)=>change('sound-on','checked',!on),reset:()=>el['reset-field']?click('reset-field'):act(()=>el.hud.handlers.click({isTrusted:true,target:{closest:()=>true}})),assist:on=>change('aim-mode','checked',on),target:(on,pair=false)=>sandbox.targetForTest(on,pair),cover:on=>change('asteroid-cover-on','checked',on),hide:on=>{document.hidden=on;events.visibilitychange();},pageHide:()=>keys.pagehide(),pageShow:()=>keys.pageshow()};
}
const tick=()=>new Promise(setImmediate);
const arrive=q=>{for(let i=0;i<450&&!q.inspect().vandul;i++)q.step();return q.inspect().vandul;};
module.exports={setup,tick,arrive};
if(require.main===module)(async()=>{
 const q=setup({saved:'invalid'});
 assert.equal(q.el['gun-blaster'].attrs['aria-pressed'],'true');assert.equal(q.el['gun-ballistic'].attrs['aria-pressed'],'false');
 q.open('start');await tick();
 assert.deepEqual(q.decodes.map(({name,id})=>[name,id]),[['blaster',1],['ballistic',1]]);
 q.click('fire-button');assert.deepEqual(q.played,['blaster:1']);assert.equal(q.inspect().practiceShots,1);
 q.change('ballistic');assert.equal(q.storage.get('rift-runner.shot-sound.v1'),'ballistic');assert.equal(q.storage.get('rift-runner.iphone-audio.v1'),'on');
 assert.deepEqual(q.played,['blaster:1'],'select never autoplays');
 q.click('fire-button');assert.deepEqual(q.played,['blaster:1','ballistic:1']);assert.equal(q.inspect().practiceShots,2);
 q.click('test-sound');assert.deepEqual(q.played,['blaster:1','ballistic:1','ballistic:1']);assert.match(q.el['sound-status'].textContent,/A-Alkine requested/);
 assert.equal(q.inspect().practiceShots,2,'test does not fire a real shot');
 q.click('test-phone-audio');assert.equal(q.native[0].original,'./ballistic-test.mp3');assert.equal(q.native[0].plays,1);assert.equal(q.native[0].loop,false);assert.equal(q.played.length,3);
 q.change('blaster');assert.equal(q.native[0].pauses,1);q.native[0].resolve();await tick();assert.equal(q.el['sound-status'].textContent,'Sterling selected.');
 q.click('test-phone-audio');assert.equal(q.native[1].original,'./blaster-test.mp3');
 q.mute();assert.equal(q.native[1].pauses,1);q.click('test-phone-audio');q.click('test-sound');q.click('fire-button');
 assert.equal(q.native.length,2);assert.equal(q.played.length,3);
 const persisted=setup({saved:'ballistic'});assert.equal(persisted.el['gun-ballistic'].attrs['aria-pressed'],'true');assert.equal(persisted.decodes.length,0);
 persisted.click('test-sound');await tick();assert.deepEqual(persisted.played,['ballistic:1']);
 const missing=setup({saved:'ballistic',missing:true});
 missing.open('start');await tick();missing.click('test-sound');
 assert.deepEqual(missing.played,['synth-tone','synth-noise'],'fallback is one layered sound; never the incorrect recorded Blaster');assert.match(missing.el['sound-status'].textContent,/unavailable or loading/);
 assert.deepEqual(missing.fallbackNotes.map(n=>n.type),['triangle']);
 const missingBlaster=setup({missing:'blaster'});
 missingBlaster.click('test-sound');await tick();
 assert.deepEqual(missingBlaster.played,['synth-tone','synth-tone'],'energy fallback has no Ballistic noise crack');
 assert.deepEqual(missingBlaster.fallbackNotes.map(n=>n.type),['sine','triangle']);
 assert.deepEqual(missingBlaster.fallbackNotes.map(n=>n.frequency.sets[0][0]),[940,620]);
 const pending=setup({saved:'ballistic',decodePending:true,resumePending:true});
 pending.click('test-sound');pending.change('blaster');pending.change('ballistic');
 pending.decodes.forEach(row=>row.finish());pending.resumes.shift()();await tick();assert.deepEqual(pending.played,[]);
 pending.click('test-sound');assert.deepEqual(pending.played,['ballistic:1']);
 const stale=setup({saved:'ballistic',decodePending:true});
 stale.open('start');await tick();stale.hide(true);stale.hide(false);stale.open('resume');await tick();
 assert.deepEqual(stale.decodes.map(({id})=>id),[1,1,2,2]);stale.decodes[1].finish();assert.equal(stale.inspect().ballistic.buffer,null);
 stale.decodes[3].finish();stale.click('fire-button');assert.deepEqual(stale.played,['ballistic:2']);
 const held=setup({saved:'ballistic'});held.open('start');await tick();
 held.pointer('pointerdown');assert.equal(held.inspect().practiceShots,1);assert.equal(held.el['fire-button'].capture,3);
 held.pointer('pointerup');held.click('fire-button',{detail:1,pointerId:19});assert.equal(held.inspect().practiceShots,1,'tap emits one despite click following pointerup');
 held.pointer('pointerdown');held.step(33);assert.equal(held.inspect().practiceShots,5,'earlier tap and four repeats; re-press does not bypass the delay');assert.equal(held.played.filter(x=>x==='ballistic:1').length,5);
 held.pointer('pointercancel');held.step(50);assert.equal(held.inspect().practiceShots,5);
 held.pointer('pointerdown');held.step(4);held.change('blaster');held.click('fire-button',{detail:1,pointerId:3});held.step(35);
 assert.equal(held.inspect().ballisticHold,null);assert.equal(held.inspect().practiceShots,6,'switch stops repeats and suppresses old click');
 held.pointer('pointerdown');held.step(40);assert.equal(held.inspect().practiceShots,7,'Blaster fires on down but never repeats');
 held.pointer('pointerup');held.click('fire-button',{detail:1,pointerId:99});assert.equal(held.inspect().practiceShots,7);
 held.click('fire-button',{detail:0,pointerId:-1,pointerType:''});assert.equal(held.inspect().practiceShots,8,'keyboard/assistive click survives the pointer deduplication fence');
 held.step(13);held.pointer('pointerdown');held.pointer('pointercancel');held.click('fire-button',{detail:1,pointerId:23});held.step(30);
 assert.equal(held.inspect().practiceShots,9,'cancellation neither repeats nor admits a trailing click');
 held.pointer('pointerdown');held.pointer('pointerup');held.pointer('pointerdown');held.pointer('pointerup');
 assert.equal(held.inspect().practiceShots,10,'subsequent fast distinct presses respect Sterling cadence');
 held.step(13);held.pointer('pointerdown');held.pointer('pointerup');assert.equal(held.inspect().practiceShots,11);
 const cancelled=setup({saved:'ballistic'});cancelled.open('start');await tick();
 cancelled.pointer('pointerdown');cancelled.pointer('lostpointercapture');cancelled.step(50);
 assert.equal(cancelled.inspect().practiceShots,1);
 cancelled.pointer('pointerdown');cancelled.key('keydown','KeyP');cancelled.open('resume');cancelled.step(50);
 assert.equal(cancelled.inspect().practiceShots,2,'pause cancels hold');
 assert.equal(cancelled.el['aim-mode'].checked,false,'legacy Auto Aim setting does not take over V15');
 cancelled.pointer('pointerdown',16,'aim-pad',464,360);cancelled.step(20);
 assert.equal(cancelled.inspect().practiceShots,2,'aim never shoots on hold');
 cancelled.pointer('pointerdown',3);
 assert.ok(Math.abs(cancelled.inspect().shots.at(-1).a)<.032,'Ballistic fires close to aim-pad direction');
 cancelled.pointer('pointermove',16,'aim-pad',240,160);cancelled.step(8);
 assert.ok(Math.abs(cancelled.inspect().shots.at(-1).a-cancelled.inspect().p.aim)<.032,'Ballistic repeats along the actual nose mid-turn');
 cancelled.pointer('pointerup',16,'aim-pad',240,360);
 const count=cancelled.inspect().practiceShots;
 cancelled.step(8);
 assert.equal(cancelled.inspect().practiceShots,count+1,'releasing aim does not cancel separate Fire hold');
 assert.equal(cancelled.inspect().p.aim,-Math.PI/2,'aim release preserves last directional angle');
 assert.ok(Math.abs(cancelled.inspect().shots.at(-1).a+Math.PI/2)<.032,'Ballistic repeats toward the completed turn');
 cancelled.pointer('pointerup',3);cancelled.click('fire-button',{detail:1,pointerId:23});cancelled.step(20);
 assert.equal(cancelled.inspect().practiceShots,count+1,'no aim release shot and no duplicate Fire click');
 const assisted=setup({aimAssist:true});assisted.open('start');await tick();assisted.step(2);
 assert.ok(assisted.inspect().autoLock,'optional touch assist starts when explicitly enabled');
 assisted.pointer('pointerdown',16,'aim-pad',464,360);assisted.pointer('pointerup',16,'aim-pad');assisted.step(15);
 assert.equal(assisted.inspect().autoLock,null);
 assert.equal(assisted.inspect().p.aim,0);
 assisted.click('fire-button');assert.equal(assisted.inspect().shots.at(-1).a,0,'assist does not override the aimed heading');
 assisted.assist(false);assisted.assist(true);assisted.step(2);
 assert.ok(assisted.inspect().autoLock,'turning assist back on re-arms assist');
 const keyboard=setup({saved:'ballistic'});keyboard.open('start');await tick();
 keyboard.key('keydown','Space');keyboard.key('keydown','Space',true);keyboard.step(17);
 assert.equal(keyboard.inspect().practiceShots,3);keyboard.key('keyup','Space');keyboard.step(33);assert.equal(keyboard.inspect().practiceShots,3);
 keyboard.key('keydown','Space');keyboard.mute();keyboard.step(17);assert.equal(keyboard.inspect().practiceShots,6);
 assert.equal(keyboard.played.filter(x=>x==='ballistic:1').length,4,'mute does not stop hold but does silence it');
 keyboard.blur();keyboard.step(33);assert.equal(keyboard.inspect().practiceShots,6);assert.equal(keyboard.inspect().ballisticHold,null);
 keyboard.open('resume');keyboard.step(8);keyboard.key('keydown','Space');keyboard.hide(true);keyboard.hide(false);keyboard.open('resume');keyboard.step(40);
 assert.equal(keyboard.inspect().practiceShots,7,'hide releases hold; returning cannot resume fire');
 keyboard.key('keydown','Digit1');assert.equal(keyboard.inspect().shotSound,'blaster');
 keyboard.key('keydown','Space');keyboard.key('keydown','Space',true);keyboard.step(44);assert.equal(keyboard.inspect().practiceShots,8);
 function measure(name,switchTo){
  const sim=setup({saved:name});sim.open('start');
  const f=sim.inspect();f.p.x=240;f.p.y=360;f.p.vx=0;f.p.vy=0;f.p.aim=0;
  const cone=f.cones[0];f.cones.splice(1);cone.x=320;cone.y=360;cone.vx=0;cone.vy=0;
  sim.key('keydown','Space');sim.key('keyup','Space');const launch=sim.inspect();
  assert.equal(launch.shots[0].weapon,name);const kick=Math.round(Math.hypot(launch.p.vx,launch.p.vy));
  sim.change(switchTo);sim.step(10);
  assert.equal(sim.inspect().practiceHits,1);assert.equal(sim.inspect().shots.length,0);
  return [kick,cone.vx,sim.inspect().rings.at(-1).colour];
 }
 const lighter=measure('blaster','ballistic'),heavier=measure('ballistic','blaster');
 assert.deepEqual([lighter[0],heavier[0]],[20,34]);
 assert.ok(heavier[1]>lighter[1]*1.4);assert.notEqual(lighter[2],heavier[2]);
 console.log('PASS pointer/key hold, taps, cancellation, hide/blur, mute, selection and per-projectile recoil/impact.');
 console.log('PASS default, persistence, exact two assets, real shots, both test paths, mute, one voice/no autoplay, synth fallback, stale selection and retired decode.');
})().catch(e=>{console.error(e);process.exitCode=1;});
