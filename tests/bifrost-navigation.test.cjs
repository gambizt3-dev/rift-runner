'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm');
const {readFileSync}=require('node:fs'),path=require('node:path');
const {setup}=require('./ballistic.test.cjs');
const read=file=>readFileSync(path.join(__dirname,'../dist',file),'utf8');

test('Bifrost exterior links open the matching index hangar or start on the Bifrost deck',async()=>{
 const html=read('carrier.html'),nodes=Object.fromEntries([...html.matchAll(/\bid="([^"]+)"/g)].map(m=>[m[1],{}]));
 nodes['carrier-scene-bifrost'].closest=()=>({dataset:{}});
 const window={location:{search:'?vessel=bifrost',hostname:'localhost'}};
 await vm.runInNewContext(read('vessel-exterior.js'),{window,URLSearchParams,
  document:{getElementById:id=>nodes[id]},fetch:async()=>({ok:false})});
 for(const [id,url] of [['carrier-hangar',nodes['carrier-hangar'].href],...['practice','solo-training','wingman-test','capital-test','escort'].map(id=>[id,'./index.html?launch='+id+'&vessel=bifrost&departure=carrier'])]){
  const address=new URL(url,'https://example.test/');
  const visits=[];
  assert.equal(address.pathname,'/index.html',id);
  const fit={engine:'stock-thruster',core:'weifer-he3-core',battery:'kestrel-h20-reserve-cell',primary:'blaster',secondary:null,shield:null};
  const owned=Object.values(fit).filter(Boolean);
  const sharedStorage=new Map([['rift-runner.character-generation.v1','test-pilot'],
   ['rift-runner.hull-owned.v1',JSON.stringify({version:1,hull:'rift-fighter',condition:'repaired'})],
   ['rift-runner.ship-build.v1',JSON.stringify({version:1,hull:'rift-fighter',...fit})]]);
  const q=setup({address:{search:address.search,replace:url=>visits.push(url)},flightShell:true,buildUI:true,sharedStorage,homeVessel:'bifrost',
   pilotCredits:{getBuildState:()=>({origin:'new',owned,kills:0}),owns:id=>owned.includes(id)}});
  if(id==='carrier-hangar'){
   assert.equal(q.el.hangar.open,true,id);
   q.click('close-hangar');
  }else{
   assert.notEqual(q.el.hangar.open,true,id);
   assert.equal(q.inspect().state,'play',id);
   assert.equal(q.inspect().capitalShip?.vessel?.id,'bifrost',id);
   q.click('return-main-menu');
  }
  assert.deepEqual(visits,['./carrier.html?vessel=bifrost'],id);
 }
});
