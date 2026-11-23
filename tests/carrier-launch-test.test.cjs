'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=['../dist','..'].map(dir=>path.join(__dirname,dir)).find(dir=>fs.existsSync(path.join(dir,'carrier-launch-test.html')));
const {mount,sample,ships,flightTime,finishTime,aftClearY}=require(path.join(root,'carrier-launch-test.js'));
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
test('Missions links to an independent carrier spectator route, with no pilot, inventory, credits or arena hooks',()=>{
 const html=read('carrier-launch-test.html'),carrier=read('carrier.html'),css=read('carrier-launch-test.css');
 const missions=carrier.match(/<details class="carrier-missions"[^>]*>([\s\S]*?)<\/details>/)[1];
 assert.match(missions,/<a [^>]*id="carrier-launch-test" href="\.\/carrier-launch-test\.html">Launch \(test\)<\/a>/);
 assert.match(html,/<a [^>]*href="\.\/carrier.html">[^<]*Return to Carrier/);
 assert.equal((html.match(/href="#launch-rift-four"/g)||[]).length,3,'Rift-4 and two wingmen use the stock fighter');
 assert.match(html,/<image href="\.\/carrier-top.webp\?v=87" x="147" y="18" width="346" height="519"/);
 assert.doesNotMatch(html,/(?:pilot-credits|pilot-missions|game\.js|fire-button|fit-build-status)/);
 assert.doesNotMatch(read('carrier-launch-test.js'),/(?:localStorage|sessionStorage|fetch\(|document\.cookie|indexedDB)/);
 assert.match(css,/safe-area-inset-right/);assert.match(css,/prefers-reduced-motion:reduce/);
 assert.equal((html.match(/id="launch-craft-[0-5]"/g)||[]).length,6);
 for(const id of ['launch-rift-four','launch-hauler','launch-logistics','launch-fuel'])assert.match(html,new RegExp('href="#'+id+'"'));
});
test('six staggered paths start on the true pad, share one corridor safely and finish in distinct aft lanes',()=>{
 const phases=t=>sample(t).map(x=>x.phase),allStates=[];
 assert.deepEqual(phases(0),Array(6).fill('docked'));
 assert.deepEqual(phases(finishTime),Array(6).fill('clear'));
 for(let t=0;t<=finishTime+.025;t+=.025){
  const live=sample(t);allStates.push(live);
  assert.ok(live.filter(v=>v.phase==='departing').length<=1);
  for(let j=0;j<live.length;j++)for(let k=j+1;k<live.length;k++)
   assert.ok(Math.hypot(live[j].x-live[k].x,live[j].y-live[k].y)>22.5,'distinct hull clearances');
 }
 for(const [i,ship] of ships.entries()){
  const queued=sample(ship.start-.001)[i],depart=sample(ship.start)[i];
  assert.equal(queued.y,ship.parkedY);assert.equal(depart.y,ship.parkedY);
  assert.ok(depart.x>=288&&depart.x<=352&&depart.y>=386&&depart.y<=449);
  const aft=sample(ship.start+flightTime*.66)[i];
  assert.ok(Math.abs(aft.x-320)<1e-8&&Math.abs(aft.y-aftClearY)<1e-8);
  assert.ok(aft.y>18+519,'leaves hull before fanning out');
  const clear=sample(ship.start+flightTime)[i];
  assert.equal(clear.x,ship.laneX);assert.equal(clear.y,ship.clearY);
  const positions=allStates.map(v=>v[i].y);
  assert.ok(positions.every((y,k)=>k===0||y>=positions[k-1]-1e-9),'departs aft without oscillation');
 }
 assert.deepEqual(sample(finishTime).map(a=>a.x),[98,181,256,320,428,529]);
});
function fixture(reduced=false){
 const ids=['launch-player-marker','launch-play','launch-replay','launch-status','launch-clock','launch-progress',...ships.flatMap((_,i)=>['launch-phase-'+i,'launch-craft-'+i])];
 const nodes=Object.fromEntries(ids.map(id=>[id,{dataset:{},events:{},attrs:{},addEventListener(k,v){this.events[k]=v;},setAttribute(k,v){this.attrs[k]=v;},click(){this.events.click();}}]));
 const listeners={},doc={hidden:false,getElementById:id=>nodes[id],addEventListener:(name,fn)=>listeners[name]=fn};
 const windows={},media={matches:reduced,addEventListener(k,v){this[k]=v;}},frames=new Map();let counter=0,clock=0;
 const window={matchMedia:()=>media,requestAnimationFrame(fn){frames.set(++counter,fn);return counter;},cancelAnimationFrame:id=>frames.delete(id),addEventListener:(name,fn)=>windows[name]=fn};
 const scene=mount(doc,window);
 const walk=(ms=16,count=1)=>{while(count--){clock+=ms;for(const [id,fn] of [...frames]){frames.delete(id);fn(clock);}}};
 return {scene,nodes,walk,frames,hide(on){doc.hidden=on;listeners.visibilitychange();},pageHide:()=>windows.pagehide(),media};
}
test('live timers pause on request and background, explicitly resume, and replay from exact docked state',()=>{
 const {scene,nodes,walk,frames,hide,pageHide}=fixture(); const play=nodes['launch-play'],replay=nodes['launch-replay'];
 assert.equal(frames.size,1); assert.equal(play.textContent,'Pause');
 walk(16,100);assert.ok(scene.status().time>=1.5);assert.match(nodes['launch-status'].textContent,/Your Rift-4 departing/);
 const active=scene.status();
 play.click();assert.equal(play.textContent,'Resume');walk(5000,10);assert.equal(scene.status().time,active.time);
 play.click();walk(5000,1);assert.equal(scene.status().time,active.time,'no catch-up when resumed');
 walk(16,60);assert.ok(scene.status().time>active.time);
 hide(true);const held=scene.status().time;hide(false);walk(16,1000);
 assert.equal(scene.status().time,held);assert.equal(frames.size,0);
 play.click();walk(16,2400);assert.equal(nodes['launch-progress'].value,6);assert.equal(frames.size,0);assert.equal(play.disabled,true);
 replay.click();assert.deepEqual(scene.status().aircraft,sample(0));assert.equal(nodes['launch-progress'].value,0);assert.equal(frames.size,1);
 pageHide();assert.equal(frames.size,0);
});
test('Reduced Motion is manual and advances the same queue as static steps, with Replay',()=>{
 const {scene,nodes,walk,frames}=fixture(true),play=nodes['launch-play'];
 assert.equal(play.textContent,'Next departure');assert.equal(frames.size,0);
 walk(60000);assert.equal(scene.status().time,0);
 for(let i=1;i<=6;i++){play.click();assert.equal(nodes['launch-progress'].value,i);assert.equal(frames.size,0);}
 assert.equal(play.disabled,true);assert.match(nodes['launch-status'].textContent,/All six/);
 nodes['launch-replay'].click();assert.deepEqual(scene.status().aircraft,sample(0));assert.equal(frames.size,0);
});

test('player fighter grows to twice its previous display size after launch, with an upright tracking marker',()=>{
 const {nodes,walk}=fixture();
 const craft=nodes['launch-craft-0'],marker=nodes['launch-player-marker'];
 assert.match(read('carrier-launch-test.html'),/id="launch-player-marker"[\s\S]*?>YOU<\/text>/);
 assert.match(craft.attrs.transform,/scale\(1\.100\)$/);
 assert.equal(marker.attrs.transform,'translate(232.00 420.00)');
 walk(16,400);
 const clear=sample(finishTime)[0];
 assert.match(craft.attrs.transform,/scale\(2\.000\)$/);
 assert.equal(marker.attrs.transform,`translate(${(clear.x-65).toFixed(2)} ${clear.y.toFixed(2)})`);
 assert.equal(marker.dataset.phase,'clear');
 assert.ok(sample(finishTime).slice(1).every(ship=>ship.scale===1));
 assert.equal(sample(0)[0].scale,1.1);
 assert.equal(sample(ships[0].start+flightTime*.66)[0].scale,2);
});
