import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const read=file=>readFileSync(new URL('../dist/'+file,import.meta.url),'utf8');
const html=read('carrier.html'),code=read('vessel-exterior.js'),css=read('carrier.css');
const published={version:1,access:'guest',vessel:{id:'bifrost',kind:'carrier',name:'Bifrost',designation:'Bifrost',vesselClass:'Bifrost-class carrier',profession:'Military',admiral:'Adaline'}};
async function view({search='',stored=null,hostname='rift-runner.gambizt3.workers.dev',response=published,offline=false}={}){
 const root={dataset:{}},calls=[],reads=[];
 const nodes=Object.fromEntries([...html.matchAll(/\bid="([^"]+)"/g)].map(match=>[match[1],{}]));
 nodes['carrier-scene-bifrost']={hidden:true,closest(selector){assert.equal(selector,'.carrier-view');return root;}};
 nodes['carrier-guild-portrait'].src='./captain-bridge-front.webp?v=94';
 const window={location:{search,hostname},localStorage:{getItem(key){reads.push(key);return stored;},setItem(){assert.fail('No pilot edits in exterior');}}};
 await vm.runInNewContext(code,{document:{getElementById:id=>nodes[id]},window,URLSearchParams,
  async fetch(url,opt){calls.push({url,...opt});if(offline)throw Error('Offline');return {ok:true,json:async()=>response};}
 });
 return {root,nodes,calls,reads};
}

test('Only a selected Bifrost or a supported saved affiliation switches from Pegasus',async()=>{
 const stored=JSON.stringify({version:2,companyVesselId:'bifrost'});
 for(const params of [{},{stored:'invalid'},{stored:'{"version":3,"companyVesselId":"bifrost"}'},{search:'?vessel=rift-carrier',stored}]){
  const {root,nodes,calls}=await view(params);
  assert.equal(root.dataset.vessel,undefined);
  assert.equal(nodes['carrier-scene-bifrost'].hidden,true);
  assert.match(nodes['carrier-guild-portrait'].src,/bishop|captain-bridge/);
  assert.equal(calls.length,0);
 }
 const {root,nodes,calls,reads}=await view({stored});
 assert.deepEqual(reads,['rift-runner.pilot-profile.v1']);
 assert.equal(root.dataset.vessel,'bifrost');
 assert.equal(calls.length,1);
 assert.equal(nodes['carrier-scene-bifrost'].hidden,false);
 assert.equal(nodes['bifrost-exterior-image'].src,'./bifrost-carrier.webp');
 assert.equal(nodes['carrier-guild-portrait'].src,'./admiral-adaline.webp');
 assert.equal(nodes['carrier-launch-capital-test'].href,'./index.html?launch=capital-test&vessel=bifrost&departure=carrier');
 assert.equal(nodes['carrier-galaxy-map'].href,'./galaxy-map.html?vessel=bifrost');
 assert.equal(nodes['carrier-hangar'].href,'./index.html?hangar=carrier&vessel=bifrost');
 assert.equal(nodes['carrier-guild-directory'].href,'./carrier-multicrew.html#bifrost');
 assert.doesNotMatch(html,/data-pegasus-only/);
 assert.match(css,/data-vessel="bifrost"] #carrier-views\{display:none\}/);
 for(const page of ['bridge','crew','shop'])assert.equal(nodes['carrier-'+page].href,'./carrier-'+page+'.html?vessel=bifrost');
 for(const [id,mode] of Object.entries({practice:'practice',escort:'escort',vandul:'solo-training','wingman-test':'wingman-test'}))
  assert.equal(nodes['carrier-launch-'+id].href,'./index.html?launch='+mode+'&vessel=bifrost&departure=carrier');
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
 assert.equal(changed.nodes['carrier-company-name'].textContent,'New Bifrost');
 assert.equal(changed.nodes['carrier-guild-portrait'].hidden,true);
 for(const invalid of [{offline:true},{response:{...published,vessel:{...published.vessel,id:'rift-carrier'}}}]){
  const fallback=await view({...invalid,search:'?vessel=bifrost'});
  assert.equal(fallback.nodes['carrier-identity-name'].textContent,'Bifrost');
  assert.equal(fallback.nodes['carrier-guild-admiral'].textContent,'Admiral Adaline');
  assert.match(fallback.nodes['carrier-vessel-note'].textContent,/Registry details unavailable/);
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
 const captain=nodes['bridge-captain'],talk=nodes['bifrost-talk-action'],background=nodes['bifrost-bridge-interior'];
 assert.match(read('carrier-bridge.html'),/<\/figure>\s*<button[^>]+id="bifrost-talk-action"/);
 assert.match(read('carrier-bridge.css'),/\.bridge\[data-vessel=bifrost\] \.captain span\{display:none\}/);
 assert.equal(background.src,'./bifrost-bridge-interior.webp');
 assert.equal(background.hidden,true,'preserve fallback art until the new background loads');
 background.listeners.load();
 assert.equal(background.hidden,false);
 assert.equal(nodes['pegasus-bridge-interior'].hidden,true);
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

test('Missions offers no-save Custom Mode test flights from both carrier exteriors',async()=>{
 const {nodes}=await view({search:'?vessel=bifrost',offline:true});
 const picker=html.match(/<details class="carrier-custom-mode">[^]*?<\/details>/)[0];
 assert.match(picker,/Custom Mode/);
 assert.match(picker,/No purchase needed; no save changes/);
 for(const fighter of ['bastion-9','stocky-light-fighter','rift-fighter']){
  assert.ok(picker.includes('launch=custom&amp;fighter='+fighter+'&amp;vessel=rift-carrier'));
  assert.equal(nodes['carrier-custom-'+fighter].href,'./index.html?launch=custom&fighter='+fighter+'&vessel=bifrost');
 }
});
