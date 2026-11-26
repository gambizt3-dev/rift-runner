'use strict';
(()=>{
const $=id=>document.getElementById(id),status=$('status'),canvas=document.querySelector('canvas'),g=canvas.getContext('2d');
const keys=new Set(),genKey='rift-runner.character-generation.v1',tokenKey='rift-runner.fighter-parking-access.v1';
let token=null,vessel=null,hull=null,profile=null,generation=null,last=null,busy=false,connected=false,view=null;
const fleetArt=new Map();
const now=()=>globalThis.performance?.now?.()??Date.now();
const clamp=(n,a,b)=>Math.min(b,Math.max(a,n));
let overview=false,display=null,confirmedAt=0,stepAt=-Infinity,dirtyInput=false,lastFrame=0;
let animating=false,inFlightAction=null,pendingAction=null;
let stickTurn=0,lastThrustAt=-Infinity,lastTurnAt=-Infinity,lastTurn=0,driveHeading=0;
const angleDelta=(a,b)=>Math.atan2(Math.sin(b-a),Math.cos(b-a));
const flightInput=()=>({turn:clamp(Number(keys.has('ArrowRight'))-Number(keys.has('ArrowLeft'))+stickTurn,-1,1),thrust:Number(keys.has('ArrowUp'))});
function preview(frameTime){
 const fleet=last?.state,self=fleet?.ships.find(s=>s.id===last.self);
 if(!self||self.phase!=='airborne'||!connected||document.hidden){display=null;return;}
 const dt=Math.min(.04,Math.max(0,(frameTime-lastFrame)/1000));
 const {turn,thrust}=flightInput(),w=fleet.width??1800,h=fleet.height??2400;
 if(display?.id!==self.id||Math.hypot(display.x-self.x,display.y-self.y)>118){
  display={...self};lastThrustAt=lastTurnAt=-Infinity;
 }
 const authorityAge=Math.max(0,frameTime-confirmedAt);
 // Integrate from the last rendered pose. The previous implementation
 // reset the extrapolation clock with every reply and pulled the ship back.
 if(turn){lastTurnAt=frameTime;lastTurn=Math.sign(turn);}
 if(thrust){lastThrustAt=frameTime;driveHeading=display.heading;}
 const turnLock=frameTime-lastTurnAt<430?lastTurn:0;
 const angularError=angleDelta(display.heading,self.heading);
 const localTurn=authorityAge<400?turn*2.6:0;
 let rotation=localTurn+clamp(angularError*5,-1.8,1.8);
 if(turnLock&&rotation*turnLock<0)rotation=0;
 // Correction slows prediction without reversing a held turn.
 if(turn&&angularError*turn<-.48)rotation=0;
 if(!turn&&!turnLock)rotation=clamp(angularError*5,-.8,.8);
 display.heading+=rotation*dt;
 const vx=Math.cos(display.heading),vy=Math.sin(display.heading);
 const ex=self.x-display.x,ey=self.y-display.y;
 const error=Math.hypot(ex,ey);
 const catchup=error>1e-5?Math.min(thrust?110:70,error*(thrust?5:4))/error:0;
 const forwardError=ex*vx+ey*vy;
 const pace=thrust&&authorityAge<400?145*clamp(1+Math.min(0,forwardError)/58,0,1):0;
 let mx=vx*pace+ex*catchup,my=vy*pace+ey*catchup;
 if(frameTime-lastThrustAt<500){
  const nx=Math.cos(driveHeading),ny=Math.sin(driveHeading),along=mx*nx+my*ny;
  if(along<0){mx-=along*nx;my-=along*ny;}
 }
 display.x=clamp(display.x+mx*dt,24,w-24);
 display.y=clamp(display.y+my*dt,24,h-24);
}
function animate(frameTime){
 if(view!=='fleet'||document.hidden){animating=false;return;}
 preview(frameTime);lastFrame=frameTime;drawFleet();requestAnimationFrame(animate);
}
function startAnimation(){
 if(animating||view!=='fleet'||typeof requestAnimationFrame!=='function')return;
 animating=true;lastFrame=now();requestAnimationFrame(animate);
}
$('fleet-view').onclick=()=>{
 overview=!overview;$('fleet-view').textContent=overview?'Follow my fighter':'Fleet overview';
 $('fleet-view').setAttribute?.('aria-pressed',String(overview));drawFleet();
};
const dockRadio=$('dock-radio'),dockVoice=$('dock-radio-voice'),radioReplay=$('dock-radio-replay'),radioText=$('dock-radio-text');
let dockLine=0;
function clearDockRadio(){
 dockLine++;dockRadio.hidden=true;radioReplay.hidden=true;
 try{dockVoice.pause?.();}catch{}
}
async function playDockRadio(){
 const line=dockLine;
 if(dockRadio.hidden||document.hidden)return;
 radioReplay.hidden=true;
 try{
  if(typeof dockVoice.play!=='function')throw Error('Audio unavailable');
  dockVoice.currentTime=0;await dockVoice.play();
 }catch{if(line===dockLine&&!dockRadio.hidden)radioReplay.hidden=false;}
}
function reportDock(text,speak=false){
 clearDockRadio();dockRadio.hidden=false;radioText.textContent=text;
 if(speak)void playDockRadio();
}
radioReplay.onclick=playDockRadio;
function fleetSprite(url){
 if(!url||typeof window.Image!=='function')return null;
 if(!fleetArt.has(url)){const art=new window.Image();fleetArt.set(url,art);art.onload=()=>show();art.src=url;}
 const art=fleetArt.get(url);return art.complete&&art.naturalWidth?art:null;
}
function switchView(next){
 view=next;
 for(const id of ['hangar','fleet'])$(id).hidden=id!==next;
 if(next!=='fleet'){keys.clear();display=null;clearDockRadio();}else startAnimation();
}
function showHangar(personal){
 last=null;connected=false;switchView('hangar');
 $('hangar-title').textContent=personal.name+' · Flight deck';
 $('hangar-ship').textContent=profile.name+(personal.shipId?' · Ship '+personal.shipId.slice(0,8):'');
 $('enter').textContent=personal.phase==='stored'||personal.phase==='standby'?'Go to launch deck':'Resume shared flight';
 status.textContent='Confirmed berth aboard '+personal.name+'.';
}
function current(){
 return generation===localStorage.getItem(genKey)&&window.RiftFighters?.selected()===hull&&
  JSON.parse(localStorage.getItem(tokenKey))?.bearer===token;
}
function show(){
 const self=last?.state.ships.find(s=>s.id===last.self);
 const blocked=busy&&inFlightAction!=='step'||!!pendingAction;
 $('enter').disabled=!token||blocked||connected;$('rejoin').disabled=!token||blocked||connected;$('launch').disabled=blocked||!connected||self?.phase!=='pad';$('leave').disabled=blocked||!connected;
 const queued=last?.docking?.place;
 $('dock').disabled=blocked||!connected||(!queued&&!last?.docking?.inRange);
 $('dock').textContent=queued?'Cancel Dock':'Request Docking';
 $('store').disabled=blocked||!connected||self?.phase!=='pad';
 drawFleet();
}
function drawFleet(){
 g.clearRect(0,0,canvas.width,canvas.height);
 const fleet=last?.state,defs=window.RiftShipDefinitions;
 const fw=fleet?.width??1800,fh=fleet?.height??2400;
 const self=fleet?.ships.find(s=>s.id===last.self);
 const pilot=display?.id===self?.id&&self?.phase==='airborne'?display:self;
 const scale=overview||!pilot?Math.min(canvas.width/fw,canvas.height/fh):Math.min(canvas.width/550,canvas.height/685);
 const cw=canvas.width/scale,ch=canvas.height/scale;
 const left=pilot&&!overview?clamp(pilot.x-cw/2,0,Math.max(0,fw-cw)):(fw-cw)/2;
 const top=pilot&&!overview?clamp(pilot.y-ch*.58,0,Math.max(0,fh-ch)):(fh-ch)/2;
 const x=n=>(n-left)*scale,y=n=>(n-top)*scale;
 if(fleet){
  // Fixed world-space stars provide motion cues with the camera following the fighter.
  const grid=106;
  for(let col=Math.floor(left/grid);col<=Math.ceil((left+cw)/grid);col++)
   for(let row=Math.floor(top/grid);row<=Math.ceil((top+ch)/grid);row++){
    const hash=Math.imul(col+17,73856093)^Math.imul(row+19,19349663);
    g.fillStyle=hash&1?'#b5d3f04f':'#6687b44f';
    const size=hash&8?1.6:1;
    g.fillRect(x(col*grid+(hash&63)+12),y(row*grid+(hash>>>8&63)+12),size,size);
   }

  const carrier=fleet.carrier,model=carrier&&defs?.get(carrier.id);
  const art=carrier&&((!overview&&fleetSprite(model?.detailArt))||fleetSprite(model?.artUrl));
  if(carrier&&art)g.drawImage(art,x(carrier.x-carrier.width/2),y(carrier.y-carrier.height/2),carrier.width*scale,carrier.height*scale);
  else if(carrier){
   g.fillStyle='#223c53';g.fillRect(x(carrier.x-carrier.width*.27),y(carrier.y-carrier.height*.45),carrier.width*.54*scale,carrier.height*.9*scale);
  }else{
   const left=Math.min(...fleet.pads.map(p=>p.x))-45,right=Math.max(...fleet.pads.map(p=>p.x))+45,top=Math.min(...fleet.pads.map(p=>p.y))-160,bottom=Math.max(...fleet.pads.map(p=>p.y))+50;
   g.fillStyle='#223c53';g.fillRect(x(left),y(top),(right-left)*scale,(bottom-top)*scale);
  }
  const recovery=fleet.pads.find(p=>p.id===fleet.recoveryPad);
  g.strokeStyle='#ffaa6d70';g.beginPath();g.arc(x(recovery.x),y(recovery.y),38*scale,0,Math.PI*2);g.stroke();
  fleet.pads.forEach(p=>{g.strokeStyle=p.id===fleet.recoveryPad?'#ffaa6d':'#77a8ae';g.strokeRect(x(p.x)-7,y(p.y)-7,14,14);});
 }
 for(const actor of fleet?.ships??[]){
  if(actor.phase==='stored')continue;
  const ship=actor.id===pilot?.id?pilot:actor;
  const rift=defs?.get('rift-fighter'),parked=ship.phase==='pad'?(defs?.docking.parkedFighterScale??.33):1;
  const w=(rift?.frame[0]??87.36)*scale*parked,l=(rift?.frame[1]??58.24)*scale*parked;
  const art=fleetSprite((ship.hull==='rift-fighter'?rift?.artUrl:window.RiftFighters?.get(ship.hull)?.flightArt));
  g.save();g.translate(x(ship.x),y(ship.y));g.rotate(ship.heading+Math.PI/2);
  if(ship.id===last.self&&ship.phase==='airborne'&&connected&&flightInput().thrust){
   const stem=l*.34,length=Math.max(12,l*.92);
   const flame=g.createLinearGradient(0,stem,0,stem+length);
   flame.addColorStop(0,'#c6ffff');flame.addColorStop(.28,'#68d5ffb0');flame.addColorStop(1,'#2787ff00');
   g.fillStyle=flame;g.beginPath();g.moveTo(-w*.085,stem);g.lineTo(w*.085,stem);
   g.lineTo(0,stem+length);g.closePath();g.fill();
  }
  if(art)g.drawImage(art,-w/2,-l/2,w,l);
  else{
   g.fillStyle=ship.id===last.self?'#65eeaf':'#94bdff';g.beginPath();
   g.moveTo(0,-l/2);g.lineTo(w*.37,l*.43);g.lineTo(0,l*.17);g.lineTo(-w*.37,l*.43);g.closePath();g.fill();
  }
  g.restore();
 }
 // Annotate last so the carrier, pads and other ships cannot hide the pilot.
 if(pilot&&pilot.phase!=='stored'){
  const px=x(pilot.x),py=y(pilot.y);
  const labelX=Math.max(24,Math.min(canvas.width-24,px));
  const labelY=py<42?py+29:py-26;
  g.save();
  g.lineWidth=4;g.strokeStyle='#081421';g.beginPath();g.arc(px,py,17,0,Math.PI*2);g.stroke();
  g.lineWidth=2;g.strokeStyle='#83ffe0';g.stroke();
  g.fillStyle='#0a1b27';g.fillRect(labelX-21,labelY-10,42,20);
  g.strokeRect(labelX-21,labelY-10,42,20);
  g.font='bold 14px system-ui';g.textAlign='center';g.textBaseline='middle';g.fillStyle='#c5ffed';
  g.fillText('YOU',labelX,labelY);
  g.restore();
 }
}
async function action(kind,extra={}){
 if(!token)return;
 if(busy){if(inFlightAction==='step'&&kind!=='step'&&!pendingAction){pendingAction={kind,extra};show();}return;}
 busy=true;inFlightAction=kind;show();
 try{
  if(!current())throw Error('Your active pilot or fighter changed. Reload this page');
  const r=await fetch('/api/fleet-space/'+vessel+'/'+kind,{method:'POST',cache:'no-store',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify({hull,...extra}),credentials:'omit',redirect:'error',signal:AbortSignal.timeout(6000)});
  const data=await r.json();
  if(!current())throw Error('Your active pilot or fighter changed. Reload this page');
  if(!r.ok)throw Error(({LAUNCH_PADS_BUSY:'Launch pads are busy',ENTER_FLEET_FIRST:'Shared flight disconnected',PARKING_NOT_CONFIRMED:'No confirmed berth at this carrier',FLEET_BUSY:'The fleet is busy'})[data.error]??'Shared fleet is unavailable');
  if(kind==='status'){showHangar(data);return;}
  const previous=last?.state.ships.find(s=>s.id===last.self),wasQueued=last?.docking?.place;
  last=data;confirmedAt=now();switchView('fleet');
  const self=data.state.ships.find(s=>s.id===data.self);
  connected=kind!=='disconnect'&&self.phase!=='stored';
  if(self.phase!=='airborne'||!connected||previous?.phase!==self.phase){display=null;lastTurnAt=lastThrustAt=-Infinity;}
  $('title').textContent='Online Battle Fleet Map · '+data.state.name;
  if(self.phase==='stored'){
   switchView(null);status.textContent='Stored securely. Returning to your private hangar.';location.assign($('private-hangar').href);return;
  }
  if(kind==='launch'||kind==='disconnect'||kind==='cancel-dock')clearDockRadio();
  else if(previous?.phase==='airborne'&&self.phase==='pad')reportDock('Touchdown confirmed. You can launch again or store your ship.');
  else if(kind==='dock'&&data.docking.place)reportDock('Request received. Queue #'+data.docking.place+'. Fly to the recovery ring and slow down.',true);
  else if(wasQueued&&!data.docking.place&&self.phase==='airborne')reportDock('Docking request expired. Return to the recovery area to try again.');
  else if(data.docking.place&&data.docking.place!==wasQueued&&!dockRadio.hidden)radioText.textContent='Queue #'+data.docking.place+'. Hold near the recovery ring.';
  const queue=data.docking.place?' · Docking queue #'+data.docking.place:'';
  status.textContent=connected?profile.name+' · '+self.phase+' · '+data.state.ships.length+' connected pilot(s)'+queue:'Disconnected. Reconnect to resume the same ship.';
 }catch(e){connected=false;keys.clear();clearDockRadio();status.textContent=(e.message||'Fleet unavailable')+'. You can retry.';}
 finally{
  busy=false;inFlightAction=null;
  const next=pendingAction;pendingAction=null;show();
  if(next&&connected)void action(next.kind,next.extra);
  else if(dirtyInput)sendStep();
 }
}
$('rejoin').onclick=$('enter').onclick=()=>action('enter');$('launch').onclick=()=>action('launch');$('leave').onclick=()=>action('disconnect');
$('dock').onclick=()=>action(last?.docking?.place?'cancel-dock':'dock');
$('store').onclick=()=>action('store');
function sendStep(){
 if(view!=='fleet'||!connected||document.hidden||busy)return;
 dirtyInput=false;stepAt=now();
 return action('step',{seq:last.lastSeq+1,...flightInput()});
}
function inputChanged(){
 dirtyInput=true;return sendStep();
}
function changeKey(key,pressed){
 if(pressed===keys.has(key))return;
 if(pressed)keys.add(key);else keys.delete(key);
 return inputChanged();
}
function clearInput(){
 const active=keys.size||stickTurn;
 keys.clear();endStick();
 for(const button of document.querySelectorAll('[data-key]'))delete button.dataset.held;
 if(active)inputChanged();
}
const steerKeys=['ArrowLeft','ArrowUp','ArrowRight'];
for(const type of ['keydown','keyup'])window.addEventListener(type,e=>{
 if(view!=='fleet'||!steerKeys.includes(e.key))return;
 e.preventDefault();changeKey(e.key,type==='keydown');
});
window.addEventListener('blur',clearInput);
document.addEventListener?.('visibilitychange',()=>{if(document.hidden)clearInput();else startAnimation();});
for(const button of document.querySelectorAll('[data-key]')){
 button.oncontextmenu=button.onselectstart=e=>e.preventDefault();
 button.onpointerdown=e=>{
  e.preventDefault?.();
  try{button.setPointerCapture?.(e.pointerId);}catch{}
  button.dataset.held='true';
  return changeKey(button.dataset.key,true);
 };
 button.onpointerup=button.onpointercancel=button.onlostpointercapture=()=>{delete button.dataset.held;return changeKey(button.dataset.key,false);};
}
const stick=$('turn-stick');
let stickPointer=null;
function endStick(){
 const wasTurning=stickTurn!==0;
 stickPointer=null;stickTurn=0;
 stick.style?.setProperty('--turn-offset','0px');
 return wasTurning;
}
function aimStick(e){
 if(stickPointer!==e.pointerId)return;
 e.preventDefault?.();
 const rect=stick.getBoundingClientRect();
 const amount=clamp((e.clientX-rect.left-rect.width/2)/Math.max(1,rect.width*.36),-1,1);
 const next=Math.abs(amount)<.12?0:Math.round(amount*12)/12;
 const old=stickTurn;stickTurn=next;
 stick.style?.setProperty('--turn-offset',next*24+'px');
 if(old!==next&&(Math.sign(old)!==Math.sign(next)||now()-stepAt>=90))return inputChanged();
}
stick.onpointerdown=e=>{
 if(stickPointer!==null)return;
 e.preventDefault?.();stickPointer=e.pointerId;
 try{stick.setPointerCapture?.(e.pointerId);}catch{}
 return aimStick(e);
};
stick.onpointermove=aimStick;
stick.onpointerup=stick.onpointercancel=stick.onlostpointercapture=e=>{
 if(stickPointer===e.pointerId&&endStick())return inputChanged();
};
stick.oncontextmenu=stick.onselectstart=e=>e.preventDefault();
setInterval(()=>{
 const elapsed=now()-stepAt;
 if(dirtyInput||elapsed>=(keys.size||stickTurn?180:550))return sendStep();
},90);
show();
void (async()=>{
 try{
  const registry=window.RiftFighters,parking=window.RiftFighterParking;
  hull=registry?.selected();profile=registry?.get(hull);
  $('fleet-dash').src=hull==='bastion-9'?'./swift-2-flight-dash-rounded.webp':
   hull==='stocky-light-fighter'?'./bison-2-flight-dash.webp':'./rift-3-flight-dash.webp';
  generation=localStorage.getItem(genKey);
  const access=JSON.parse(localStorage.getItem(tokenKey));
  const cert=profile&&JSON.parse(localStorage.getItem(registry.hullKey(hull)));
  const fit=profile&&JSON.parse(localStorage.getItem(registry.buildKey(hull)));
  if(!profile||!generation||access?.generation!==generation||!/^[\da-f]{64}$/.test(access?.bearer??'')){
   status.textContent='Confirm your berth first. Dock and choose Store Inside in ordinary Free Flight, then return here.';return;
  }
  if(cert?.hull!==hull||cert.condition!=='repaired'||fit?.hull!==hull||
     !['engine','core','battery'].every(part=>typeof fit[part]==='string'&&window.RiftCredits?.owns?.(fit[part]))){
   status.textContent='Repair your selected fighter and fit its engine, generator and reserve cell in the hangar first.';return;
  }
  const found=await parking.hydrate(hull);
  if(found?.status!=='ok'||!['rift-carrier','bifrost'].includes(found.parking?.vessel)||!(found.parking.revision>0)){
   status.textContent='Confirm your berth first. Dock and choose Store Inside in ordinary Free Flight.';return;
  }
  token=access.bearer;vessel=found.parking.vessel;
  $('carrier-deck').href='./carrier.html?vessel='+vessel;
  $('private-hangar').href='./index.html?hangar=carrier&vessel='+vessel;
  await action('status');
 }catch{status.textContent='Could not reach shared fleet flight. Your saved fighter was not changed.';}
})();

})();
