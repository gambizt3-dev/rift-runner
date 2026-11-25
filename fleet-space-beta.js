'use strict';
(()=>{
const $=id=>document.getElementById(id),status=$('status'),canvas=document.querySelector('canvas'),g=canvas.getContext('2d');
const requested=new URLSearchParams(location.search).get('sortie');
const selectedEvent=/^corsair:(reach|frontier):\d{1,16}$/.test(requested??'')?requested:null;
let sortie=null;const siteGateY=160;
const keys=new Set(),genKey='rift-runner.character-generation.v1',tokenKey='rift-runner.fighter-parking-access.v1';
let token=null,vessel=null,hull=null,profile=null,generation=null,last=null,busy=false,connected=false,view=null;
function switchView(next){
 view=next;
 for(const id of ['hangar','fleet'])$(id).hidden=id!==next;
 if(next!=='fleet')keys.clear();
}
function showHangar(personal){
 if(selectedEvent&&personal.sortie?.eventId===selectedEvent){
  location.assign('./index.html?galaxy-event='+encodeURIComponent(selectedEvent));return;
 }
 sortie=selectedEvent;
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
 $('enter').disabled=!token||busy||connected;$('rejoin').disabled=!token||busy||connected;$('launch').disabled=busy||!connected||self?.phase!=='pad';$('leave').disabled=busy||!connected;
 const queued=last?.docking?.place;
 $('dock').disabled=busy||!connected||(!queued&&!last?.docking?.inRange);
 $('dock').textContent=queued?'Cancel Dock':'Request Docking';
 $('store').disabled=busy||!connected||self?.phase!=='pad';
 $('sortie').hidden=!sortie;
 $('sortie').disabled=busy||!connected||self?.phase!=='airborne'||self?.pad!==null||!(self.y<=siteGateY);
 $('sortie-note').hidden=!sortie;
 if(sortie)$('sortie-note').textContent='Launch and fly to the blue line at the top of the map, then cross into Corsair.';
 g.clearRect(0,0,canvas.width,canvas.height);
 const x=n=>n*canvas.width/1800,y=n=>n*canvas.height/2400;
 if(sortie){g.fillStyle='#7cd7ff';g.fillRect(0,y(siteGateY),canvas.width,2);g.fillText('CORSAIR APPROACH',8,y(siteGateY)-6);}
 const fleet=last?.state;
 if(fleet){
  const left=Math.min(...fleet.pads.map(p=>p.x))-45,right=Math.max(...fleet.pads.map(p=>p.x))+45,top=Math.min(...fleet.pads.map(p=>p.y))-160,bottom=Math.max(...fleet.pads.map(p=>p.y))+50;
  g.fillStyle='#223c53';g.fillRect(x(left),y(top),x(right-left),y(bottom-top));
  g.fillStyle='#a2cbe6';g.font='14px system-ui';g.fillText(fleet.name.toUpperCase(),x(left)+3,y(top)+18);
  const recovery=fleet.pads.find(p=>p.id===fleet.recoveryPad);
  g.strokeStyle='#ffaa6d70';g.beginPath();g.arc(x(recovery.x),y(recovery.y),x(38),0,Math.PI*2);g.stroke();
  fleet.pads.forEach(p=>{g.strokeStyle=p.id===fleet.recoveryPad?'#ffaa6d':'#77a8ae';g.strokeRect(x(p.x)-7,y(p.y)-7,14,14);});
 }
 for(const ship of last?.state.ships??[]){
  if(ship.phase==='stored')continue;
  g.save();g.translate(x(ship.x),y(ship.y));g.rotate(ship.heading);
  g.fillStyle=ship.id===last.self?'#65eeaf':'#94bdff';g.beginPath();g.moveTo(10,0);g.lineTo(-7,-6);g.lineTo(-4,0);g.lineTo(-7,6);g.closePath();g.fill();g.restore();
 }
}
async function action(kind,extra={}){
 if(busy||!token)return;
 busy=true;show();
 try{
  if(!current())throw Error('Your active pilot or fighter changed. Reload this page');
  const r=await fetch('/api/fleet-space/'+vessel+'/'+kind,{method:'POST',cache:'no-store',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify({hull,...extra}),credentials:'omit',redirect:'error',signal:AbortSignal.timeout(6000)});
  const data=await r.json();
  if(!current())throw Error('Your active pilot or fighter changed. Reload this page');
  if(!r.ok)throw Error(({LAUNCH_PADS_BUSY:'Launch pads are busy',ENTER_FLEET_FIRST:'Shared flight disconnected',PARKING_NOT_CONFIRMED:'No confirmed berth at this carrier',FLEET_BUSY:'The fleet is busy',FIGHTER_IN_BATTLE:'Your fighter is still in Corsair',FLY_TO_CORSAIR_GATE:'Fly to the Corsair gate first',EVENT_UNAVAILABLE:'Corsair is no longer available'})[data.error]??'Shared fleet is unavailable');
  if(kind==='status'){showHangar(data);return;}
  if(kind==='depart'&&data.sortie?.eventId===sortie){
   connected=false;switchView(null);status.textContent='Crossing into Corsair…';
   location.assign('./index.html?galaxy-event='+encodeURIComponent(sortie));return;
  }
  last=data;switchView('fleet');
  const self=data.state.ships.find(s=>s.id===data.self);
  connected=kind!=='disconnect'&&self.phase!=='stored';$('title').textContent=data.state.name+' shared fleet';
  if(self.phase==='stored'){
   switchView(null);status.textContent='Stored securely. Returning to your private hangar.';location.assign($('private-hangar').href);return;
  }
  const queue=data.docking.place?' · Docking queue #'+data.docking.place:'';
  status.textContent=connected?profile.name+' · '+self.phase+' · '+data.state.ships.length+' connected pilot(s)'+queue:'Disconnected. Reconnect to resume the same ship.';
 }catch(e){connected=false;keys.clear();status.textContent=(e.message||'Fleet unavailable')+'. You can retry.';}
 finally{busy=false;show();}
}
$('rejoin').onclick=$('enter').onclick=()=>action('enter');$('launch').onclick=()=>action('launch');$('leave').onclick=()=>action('disconnect');
$('dock').onclick=()=>action(last?.docking?.place?'cancel-dock':'dock');
$('store').onclick=()=>action('store');
$('sortie').onclick=()=>sortie&&action('depart',{eventId:sortie});
const steerKeys=['ArrowLeft','ArrowUp','ArrowRight'];
for(const type of ['keydown','keyup'])window.addEventListener(type,e=>{if(view!=='fleet'||!steerKeys.includes(e.key))return;e.preventDefault();if(type==='keydown')keys.add(e.key);else keys.delete(e.key);});
window.addEventListener('blur',()=>keys.clear());
for(const button of document.querySelectorAll('[data-key]')){
 button.onpointerdown=e=>{button.setPointerCapture(e.pointerId);keys.add(button.dataset.key);};
 button.onpointerup=button.onpointercancel=button.onlostpointercapture=()=>keys.delete(button.dataset.key);
}
setInterval(()=>{if(view==='fleet'&&connected&&!document.hidden)return action('step',{seq:last.lastSeq+1,turn:Number(keys.has('ArrowRight'))-Number(keys.has('ArrowLeft')),thrust:Number(keys.has('ArrowUp'))});},240);
show();
void (async()=>{
 try{
  const registry=window.RiftFighters,parking=window.RiftFighterParking;
  hull=registry?.selected();profile=registry?.get(hull);
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
