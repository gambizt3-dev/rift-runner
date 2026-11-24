import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const read=file=>readFileSync(new URL('../dist/'+file,import.meta.url),'utf8');
const html=read('carrier.html'),code=read('vessel-exterior.js'),css=read('carrier.css');
const published={version:1,access:'guest',vessel:{id:'bifrost',kind:'carrier',name:'Bifrost',designation:'Bifrost',vesselClass:'Bifrost-class carrier',profession:'Military',admiral:'Adaline'}};
async function view({search='',stored=null,hostname='rift-runner.gambizt3.workers.dev',response=published,offline=false,parking,statsResponse,statsOpen=false}={}){
 const root={dataset:{}},calls=[],reads=[];
 const nodes=Object.fromEntries([...html.matchAll(/\bid="([^"]+)"/g)].map(match=>[match[1],{}]));
 for(const [_,id,href] of html.matchAll(/<a[^>]*\bid="([^"]+)"[^>]*\bhref="([^"]+)"/g)){
  const node=nodes[id];node.href=href;
  node.getAttribute=key=>node[key]??null;
  node.setAttribute=(key,value)=>{node[key]=value;};
 }
 nodes['carrier-scene-bifrost']={hidden:true,closest(selector){assert.equal(selector,'.carrier-view');return root;}};
 const panel=nodes['carrier-company'];panel.open=statsOpen;panel.addEventListener=(event,cb)=>panel[event]=cb;
 nodes['carrier-guild-portrait'].src='./captain-bridge-front.webp?v=94';
 const window={location:{search,hostname},localStorage:{getItem(key){reads.push(key);return key==='fixture-hull'?(parking?.cert??null):key==='fixture-build'?null:stored;},setItem(){assert.fail('No pilot edits in exterior');}}};
 if(parking){
  window.RiftCredits={getBuildState:()=>({origin:'new'})};
  window.RiftFighters={selected:()=>parking.hull,get:()=>({}),owned:()=>parking.owned!==false,starter:'rift-fighter',hullKey:()=> 'fixture-hull',buildKey:()=> 'fixture-build'};
  let berth=parking.vessel;
  window.RiftFighterParking={
   get:id=>id===parking.hull?berth:null,home:()=>parking.home,details:()=>({bay:parking.remote?null:6}),
   async hydrate(id,options){assert.equal(id,parking.hull);assert.equal(options.migrate,false);if(parking.remote)berth=parking.remote;}
  };
 }
 window.fetch=async(url,opt)=>{calls.push({url,...opt});if(offline)throw Error('Offline');return {ok:true,json:async()=>url.endsWith('/stats')?statsResponse:response};};
 vm.runInNewContext(read('guild-vessel-identity.js'),{window});
 await vm.runInNewContext(code,{document:{getElementById:id=>nodes[id]},window,URLSearchParams});
 return {root,nodes,calls,reads};
}

test('Only a selected Bifrost or a supported saved affiliation switches from Pegasus',async()=>{
 const stored=JSON.stringify({version:2,companyVesselId:'bifrost'});
 for(const params of [{},{stored:'invalid'},{stored:'{"version":3,"companyVesselId":"bifrost"}'},{search:'?vessel=rift-carrier',stored}]){
  const {root,nodes,calls}=await view(params);
  assert.equal(root.dataset.vessel,undefined);
  assert.equal(nodes['carrier-scene-bifrost'].hidden,true);
  assert.match(nodes['carrier-guild-portrait'].src,/bishop|captain-bridge/);
  assert.equal(calls.length,1);
  assert.match(calls[0].url,/rift-carrier$/);
 }
 const {root,nodes,calls,reads}=await view({stored});
 assert.deepEqual(reads,['rift-runner.pilot-profile.v1']);
 assert.equal(root.dataset.vessel,'bifrost');
 assert.equal(calls.length,1);
 assert.equal(nodes['carrier-scene-bifrost'].hidden,false);
 assert.equal(nodes['bifrost-exterior-image'].src,'./bifrost-carrier.webp');
 assert.equal(nodes['carrier-guild-portrait'].src,'./admiral-adaline.webp');
 assert.equal(nodes['carrier-galaxy-map'].href,'./galaxy-map.html?vessel=bifrost');
 assert.equal(nodes['carrier-hangar'].href,'./index.html?hangar=carrier&vessel=bifrost');
 assert.equal(nodes['carrier-guild-directory'].href,'./carrier-multicrew.html#bifrost');
 assert.doesNotMatch(html,/data-pegasus-only/);
 assert.match(css,/data-vessel="bifrost"] #carrier-views\{display:none\}/);
 for(const page of ['bridge','crew','shop'])assert.equal(nodes['carrier-'+page].href,'./carrier-'+page+'.html?vessel=bifrost');
 assert.doesNotMatch(html.match(/<div class="carrier-scene carrier-scene-bifrost"[^]*?<\/div>\s*<\/div>\s*<header/)[0],/engine-4/);
});

test('Bifrost accepts only its own public registry identity and honest offline fallback',async()=>{
 const {reads,calls,nodes}=await view({search:'?vessel=bifrost',hostname:'rift-runner.boundlessghost16.chatgpt.site'});
 assert.deepEqual(reads,[]);
 assert.deepEqual(calls,[{url:'https://rift-runner.gambizt3.workers.dev/api/multicrew/vessels/bifrost',credentials:'omit',cache:'no-store',redirect:'error'}]);
 assert.equal(nodes['carrier-guild-admiral'].textContent,'Admiral Adaline');
 assert.equal(nodes['carrier-guild-class'].textContent,'Bifrost-class carrier');
 assert.equal(nodes['carrier-guild-portrait'].hidden,false);
 const changed=await view({search:'?vessel=bifrost',response:{...published,vessel:{...published.vessel,name:'New Bifrost',admiral:'An Unknown Admiral'}}});
 assert.equal(changed.nodes['carrier-guild-vessel'].textContent,'New Bifrost');
 assert.equal(changed.nodes['carrier-company-name'].textContent,'Federal Navy');
 assert.equal(changed.nodes['carrier-guild-portrait'].hidden,true);
 for(const invalid of [{offline:true},{response:{...published,vessel:{...published.vessel,id:'rift-carrier'}}}]){
  const fallback=await view({...invalid,search:'?vessel=bifrost'});
  assert.equal(fallback.nodes['carrier-identity-name'].textContent,'Bifrost');
  assert.equal(fallback.nodes['carrier-guild-admiral'].textContent,'Admiral Adaline');
  assert.match(fallback.nodes['carrier-vessel-note'].textContent,/registry is unavailable/);
 }
});

async function visitInterior(page,{search='',stored=null}={}){
 const html=read('carrier-'+page+'.html'),links=[...html.matchAll(/<a\b[^>]+href="([^"]+)"/g)].map(([,path])=>({
  path:path.replaceAll('&amp;','&'),getAttribute(){return this.path;},setAttribute(_,value){this.path=value;}
 }));
 const nodes=Object.fromEntries([...html.matchAll(/\bid="([^"]+)"/g)].map(([,id])=>[id,{dataset:{},hidden:true,attrs:{},listeners:{},span:{},textContent:'',
  querySelector(sel){return sel==='span'?this.span:null;},
  setAttribute(key,val){this.attrs[key]=val;},removeAttribute(key){delete this.attrs[key];},
  addEventListener(event,cb){this.listeners[event]=cb;},focus(){this.focused=true;}
 }]));
 const interior={dataset:{},querySelector:()=>null,querySelectorAll(sel){return sel==='[data-vessel-prefix]'?[]:links.filter(l=>l.path==='./carrier.html'||l.path==='./carrier-crew.html'||l.path==='./carrier-shop.html'||l.path.startsWith('./index.html?hangar=carrier'));}};
 const forbidden=()=>assert.fail('A Bifrost room must not run Pegasus story progression or edit saves');
 const window={location:{search},localStorage:{getItem(){return stored;},setItem:forbidden},RiftMissions:{generation:forbidden},RiftRendezvous:{generation:forbidden}};
 const env=vm.createContext({document:{getElementById:id=>nodes[id],querySelector:()=>interior},window,URLSearchParams,fetch:forbidden});
 await vm.runInContext(code,env);
 return {interior,nodes,links,env};
}

test('Bifrost interiors retain navigation and explicit Pegasus overrides the local company',async()=>{
 const stored='{"version":2,"companyVesselId":"bifrost"}';
 for(const page of ['bridge','crew','shop']){
  for(const param of [{search:'?vessel=bifrost'},{stored}]){
   const {interior,links}=await visitInterior(page,param);
   assert.equal(interior.dataset.vessel,'bifrost');
   assert.ok(links.find(l=>l.path==='./carrier.html?vessel=bifrost'));
   if(page==='shop')assert.ok(links.find(l=>l.path==='./index.html?hangar=carrier&vessel=bifrost'));
  }
  const {interior,links}=await visitInterior(page,{search:'?vessel=rift-carrier',stored});
  assert.equal(interior.dataset.vessel,'rift-carrier');
  assert.ok(links.find(l=>l.path==='./carrier.html?vessel=rift-carrier'));
 }
});

test('Adaline opens separate written training; no Bishop story action, voice or rewards',async()=>{
 const {nodes,env,links}=await visitInterior('bridge',{search:'?vessel=bifrost'});
 vm.runInContext(read('carrier-bridge.js'),env);
 const captain=nodes['bridge-captain'],talk=nodes['bifrost-talk-action'],background=nodes['bifrost-bridge-interior'],integrated=nodes['bifrost-bridge-crew'],portrait=nodes['bifrost-bridge-admiral'];
 assert.match(read('carrier-bridge.html'),/<\/figure>\s*<button[^>]+id="bifrost-talk-action"/);
 assert.match(read('carrier-bridge.css'),/\.bridge\[data-vessel=bifrost\] \.captain span\{display:none\}/);
 assert.equal(integrated.src,'./bifrost-bridge-crew.webp');
 assert.equal(background.src,'./bifrost-bridge-interior.webp');
 assert.equal(background.hidden,true,'preserve fallback art until the new background loads');
 background.listeners.load();
 assert.equal(background.hidden,false);
 assert.equal(nodes['pegasus-bridge-interior'].hidden,true);
 assert.equal(portrait.hidden,false,'legacy portrait stays available if composite fails');
 integrated.listeners.load();
 assert.equal(integrated.hidden,false);
 assert.equal(background.hidden,true);
 assert.equal(portrait.hidden,true);
 background.listeners.load();
 assert.equal(background.hidden,true,'a late fallback load cannot cover the integrated scene');
 const styles=read('carrier-bridge.css');
 assert.match(styles,/@media\(prefers-reduced-motion:no-preference\)\{[\s\S]*?transform 460ms cubic-bezier\(\.2,\.76,\.23,1\)[\s\S]*?\[data-art=integrated\]\[data-talking=true\] \.scene-art\{transform:translate\(9%,8%\) scale\(1\.62\)\}/);
 assert.match(styles,/@media\(prefers-reduced-motion:reduce\)[^{]*\{\.scene-art\{transition:none;transform:none!important\}/);
 assert.equal(captain.tabIndex,-1);
 assert.equal(talk.hidden,false);
 assert.equal(captain.span.textContent,'Talk to Admiral Adaline');
 assert.equal(nodes['bifrost-bridge-admiral'].src,'./admiral-adaline.webp');
 assert.equal(nodes['captain-voice'].preload,'none');
 assert.equal(captain.hidden,false);
 captain.listeners.click();
 assert.equal(captain.attrs['aria-controls'],'bifrost-bridge-briefings');
 assert.equal(captain.attrs['aria-expanded'],'true');
 assert.equal(talk.attrs['aria-expanded'],'true');
 assert.equal(nodes['bridge-scene'].dataset.talking,'true');
 assert.equal(nodes['bifrost-bridge-briefings'].hidden,false);
 assert.equal(nodes['mission-accept'].listeners.click,undefined);
 assert.equal(nodes['bridge-mission'].hidden,true);
 assert.equal(nodes['bifrost-briefing-title'].focused,true);
 for(const mode of ['practice','solo-training','escort','wingman-test','capital-test'])
  assert.ok(links.find(l=>l.path==='./index.html?launch='+mode+'&vessel=bifrost&departure=carrier'));
 talk.listeners.click();
 assert.equal(nodes['bifrost-bridge-briefings'].hidden,true);
 assert.equal(captain.attrs['aria-expanded'],'false');
 assert.equal(talk.focused,true);
 assert.equal(nodes['bridge-scene'].dataset.talking,'false');
 talk.listeners.click();
 assert.equal(nodes['bridge-scene'].dataset.talking,'true');
 captain.listeners.click();
 assert.equal(nodes['bridge-scene'].dataset.talking,'false');
});

test('only the chosen vessel scene can occupy the centered exterior grid',async()=>{
 // Both scenes are intentionally siblings; withholding a scene visually is
 // not enough if it still occupies a row in the shared art grid.
 assert.match(html,/<div class="carrier-art">\s*<div class="carrier-scene" id="carrier-scene"/);
 assert.match(html,/<div class="carrier-scene carrier-scene-bifrost" id="carrier-scene-bifrost" hidden>/);
 const rule=css.match(/([^{}]+)\{display:none\}/g)
  .find(source=>source.includes('.carrier-scene[hidden]'));
 assert.ok(rule);
 assert.match(rule,/\.carrier-view\[data-vessel="bifrost"\] #carrier-scene,/);
 assert.match(rule,/\.carrier-view:not\(\[data-vessel="bifrost"\]\) #carrier-scene-bifrost,/);
 const chosen=await view({search:'?vessel=bifrost',offline:true});
 assert.equal(chosen.root.dataset.vessel,'bifrost');
 assert.equal(chosen.nodes['carrier-scene-bifrost'].hidden,false);
 const pegasus=await view({search:'?vessel=rift-carrier',stored:'{"version":2,"companyVesselId":"bifrost"}'});
 assert.equal(pegasus.root.dataset.vessel,undefined);
 assert.equal(pegasus.nodes['carrier-scene-bifrost'].hidden,true);
 assert.equal(pegasus.nodes['carrier-guild-directory'].href,'./carrier-multicrew.html#rift-carrier');
});

test('Deck Map offers scoped Hangar but does not duplicate its cockpit flight chooser',async()=>{
 const {nodes}=await view({search:'?vessel=bifrost',offline:true});
 assert.doesNotMatch(html,/Flight Shortcuts|launch=custom|carrier-custom-/);
 assert.equal(nodes['carrier-hangar'].href,'./index.html?hangar=carrier&vessel=bifrost');
});

test('unscoped Deck Map follows the active fighter berth while explicit carrier visits keep their own deck',async()=>{
 const pegasusProfile=JSON.stringify({version:2,companyVesselId:'rift-carrier'});
 const berth={home:'rift-carrier',vessel:'bifrost',hull:'bastion-9'};
 const parked=await view({stored:pegasusProfile,parking:berth});
 assert.equal(parked.root.dataset.vessel,'bifrost');
 assert.equal(parked.nodes['carrier-hangar'].href,'./index.html?hangar=carrier&vessel=bifrost');
 assert.equal(parked.nodes['carrier-bridge'].href,'./carrier-bridge.html?vessel=bifrost');
 assert.equal(parked.nodes['carrier-crew'].href,'./carrier-crew.html?vessel=bifrost');
 assert.equal(parked.nodes['carrier-shop'].href,'./carrier-shop.html?vessel=bifrost');
 const explicitPegasus=await view({search:'?vessel=rift-carrier',stored:pegasusProfile,parking:berth});
 assert.equal(explicitPegasus.root.dataset.vessel,undefined);
 const reverse=await view({stored:JSON.stringify({version:2,companyVesselId:'bifrost'}),
  parking:{home:'bifrost',vessel:'rift-carrier',hull:'bastion-9'}});
 assert.equal(reverse.root.dataset.vessel,undefined);
 assert.equal(reverse.nodes['carrier-hangar'].href,'./index.html?hangar=carrier&vessel=rift-carrier');
 assert.deepEqual(reverse.reads,[],'affiliation is not changed or used to override parked destination');
 const explicitBifrost=await view({search:'?vessel=bifrost',parking:{...berth,vessel:'rift-carrier'}});
 assert.equal(explicitBifrost.root.dataset.vessel,'bifrost');
 const noHull=await view({stored:pegasusProfile,parking:{...berth,owned:false}});
 assert.equal(noHull.root.dataset.vessel,undefined,'unowned hull cannot redirect the Deck');
 const validStarter=JSON.stringify({version:1,hull:'rift-fighter',condition:'repaired'});
 const remoteBifrost=await view({stored:pegasusProfile,parking:{home:'rift-carrier',hull:'rift-fighter',cert:validStarter,vessel:'rift-carrier',remote:'bifrost'}});
 assert.equal(remoteBifrost.root.dataset.vessel,'bifrost','missing verified cache restores via read-only hydrate');

});

test('Deck vessel specs describe the selected carrier’s fixed capabilities, including offline and guest visits',async()=>{
 const {nodes:pegasus}=await view({search:'?vessel=rift-carrier',offline:true,stored:'{"version":2,"companyVesselId":"bifrost"}'});
 const {nodes:bifrost}=await view({search:'?vessel=bifrost',offline:true});
 assert.equal(pegasus['carrier-spec-cruise'].textContent,'76 map units/s');
 assert.equal(bifrost['carrier-spec-cruise'].textContent,'68 map units/s');
 assert.match(html,/Fixed vessel specs[\s\S]*External flight pads<\/dt><dd>4 pads[\s\S]*4 assignable bays per pilot[\s\S]*Galaxy cruise target/);
 const route=readFileSync(new URL('../server/galaxy-carrier.mjs',import.meta.url),'utf8');
 assert.match(route,/GALAXY_CRUISE=76/);assert.match(route,/cruise=bifrost\?68:GALAXY_CRUISE/);
 const flight=read('game.js');
 for(const pads of ['capitalPads','bifrostPads'])assert.equal(JSON.parse(flight.split(pads+'=')[1].split(']],')[0]+']]') .length,4);
 assert.match(flight,/const deckCrew=\(testCarrier\?\[\]:\[-1,1\]\)/);
 assert.match(html,/Supply · starting stock<\/dt>[\s\S]*NPC pilots<\/dt><dd>2 assigned deck pilots[\s\S]*Player pilots aboard<\/dt>/);
 const parking=readFileSync(new URL('../server/fighter-parking.mjs',import.meta.url),'utf8');
 assert.match(parking,/PARKING_BAYS=new Set\(\[1,2,4,6\]\)/);
});

test('carrier panel checks aggregate stats only while open, with vessel validation and honest offline status',async()=>{
 const statsResponse={version:1,vesselId:'bifrost',supply:100,playerPilotsAboard:2};
 const {nodes,calls}=await view({search:'?vessel=bifrost',statsResponse});
 assert.equal(calls.length,1,'closed details does not fetch aggregate');
 const panel=nodes['carrier-company'];
 panel.open=true;await panel.toggle();
 assert.equal(calls.at(-1).url,'/api/multicrew/vessels/bifrost/stats');
 assert.equal(calls.at(-1).credentials,'omit');
 assert.equal(nodes['carrier-stat-supply'].textContent,'100 units');
 assert.equal(nodes['carrier-stat-pilots'].textContent,'2 with confirmed berths');
 for(const params of [{offline:true},{statsResponse:{...statsResponse,vesselId:'rift-carrier'}}]){
  const {nodes}=await view({search:'?vessel=bifrost',...params,statsOpen:true});
  assert.equal(nodes['carrier-stat-supply'].textContent,'Unavailable');
  assert.equal(nodes['carrier-stat-pilots'].textContent,'Unavailable');
 }
});
