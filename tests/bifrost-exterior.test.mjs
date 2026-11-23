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
 assert.equal(nodes['carrier-launch-capital-test'].href,'./index.html?launch=capital-test&vessel=bifrost');
 assert.equal(nodes['carrier-galaxy-map'].href,'./galaxy-map.html?vessel=bifrost');
 assert.equal(nodes['carrier-hangar'].href,'./index.html?hangar=carrier&vessel=bifrost');
 assert.equal(nodes['carrier-guild-directory'].href,'./carrier-multicrew.html#bifrost');
 assert.match(html,/data-pegasus-only[^>]*id="carrier-launch-(?:practice|escort)"/);
 assert.match(html,/<details class="carrier-interior"[^>]*data-pegasus-only>/);
 assert.match(css,/data-vessel="bifrost"[^{}]*\[data-pegasus-only\][^{}]*\{display:none\}/);
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
