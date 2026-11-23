import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const html=readFileSync(new URL('../dist/carrier-multicrew.html',import.meta.url),'utf8');
const script=html.match(/<script>([^]*?)<\/script>/)[1];
const publicOrigin='https://rift-runner.gambizt3.workers.dev';
const privateHost='rift-runner.boundlessghost16.chatgpt.site';
const path='/api/multicrew/vessels/';
const records={
 'rift-carrier':{id:'rift-carrier',name:'Pegasus',designation:'Rift Carrier',kind:'carrier',vesselClass:'Pegasus-class carrier',profession:'Military',admiral:'Bishop'},
 bifrost:{id:'bifrost',name:'Bifrost',designation:'Bifrost',kind:'carrier',vesselClass:'Bifrost-class carrier',profession:'Military',admiral:'Adruline'}
};

async function page({hostname='rift-runner.gambizt3.workers.dev',hash='',fail=[],record=records}={}){
 const listeners={},calls=[];
 const nodes=Object.fromEntries([...html.matchAll(/\bid="([^"]+)"/g)].map(match=>[match[1],{
  hidden:false,open:false,textContent:'',addEventListener(name,fn){this[name]=fn;}
 }]));
 nodes['multicrew-search'].parentElement={hidden:true};
 nodes['multicrew-search'].value='';
 nodes['multicrew-health'].hidden=true;
 const location={hostname,hash};
 await vm.runInNewContext(script,{
  document:{getElementById:id=>nodes[id]},window:{location,addEventListener(name,fn){listeners[name]=fn;}},
  async fetch(url,options){
   calls.push({url,...options});
   const id=url.split('/').at(-1);
   if(fail.includes(id))throw Error('Temporary offline');
   return {ok:true,json:async()=>({version:1,access:'guest',vessel:record[id]})};
  }
 });
 function search(text){nodes['multicrew-search'].value=text;nodes['multicrew-search'].input();}
 return {calls,nodes,search,location,listeners};
}

test('Bifrost gets a separate manifest, distinct silhouette, and a map link',async()=>{
 const {calls,nodes}=await page({hostname:privateHost,hash:'#bifrost'});
 assert.deepEqual(calls,Object.keys(records).map(id=>({url:publicOrigin+path+id,credentials:'omit',cache:'no-store',redirect:'error'})));
 assert.equal(nodes['multicrew-card'].open,false);
 assert.equal(nodes.bifrost.open,true);
 assert.equal(nodes['multicrew-vessel'].textContent,'Pegasus');
 assert.equal(nodes['bifrost-vessel'].textContent,'Bifrost');
 assert.equal(nodes['bifrost-admiral'].textContent,'Adruline');
 assert.equal(nodes['bifrost-class'].textContent,'Bifrost-class carrier');
 assert.equal(nodes['bifrost-profession'].textContent,'Military');
 const bifrostArt=html.match(/<details class="company-card" id="bifrost">([^]*?)<\/details>/)[1];
 assert.match(bifrostArt,/href="\.\/galaxy-map\.html\?vessel=bifrost"/);
 assert.match(bifrostArt,/<svg /);
 assert.doesNotMatch(bifrostArt,/Bishop|<img/);
});

test('Search filters both ships; a Bifrost deep link reveals its card',async()=>{
 const {nodes,search,location,listeners}=await page();
 for(const [query,pegasus,bifrost] of [['Military',true,true],['pegasus bishop',true,false],['adruline',false,true],['unknown',false,false]]){
  search(query);
  assert.equal(nodes['multicrew-card'].hidden,!pegasus);
  assert.equal(nodes.bifrost.hidden,!bifrost);
  assert.equal(nodes['multicrew-empty'].hidden,pegasus||bifrost);
 }
 location.hash='#bifrost';listeners.hashchange();
 assert.equal(nodes['multicrew-search'].value,'');
 assert.equal(nodes.bifrost.open,true);
 assert.equal(nodes.bifrost.hidden,false);
});

test('A partial outage or invalid record does not break the other directory entry',async()=>{
 const badBifrost={...records,bifrost:{...records.bifrost,id:'rift-carrier'}};
 for(const [ids,record,healthy,unhealthy,query] of [
  [['rift-carrier'],records,'bifrost','multicrew','Adruline'],
  [[],badBifrost,'multicrew','bifrost','Bishop']
 ]){
  const {nodes,search}=await page({fail:ids,record});
  assert.equal(nodes['multicrew-health'].hidden,false);
  assert.equal(nodes[healthy+'-state'].textContent,'Vessel registry connected.');
  assert.equal(nodes[unhealthy+'-state'].textContent,'Vessel registry unavailable.');
  assert.equal(nodes[unhealthy+'-admiral'].textContent,'Unavailable');
  assert.equal(nodes['multicrew-search'].parentElement.hidden,false);
  search(query);
  assert.equal(nodes['multicrew-empty'].hidden,true);
 }
});
