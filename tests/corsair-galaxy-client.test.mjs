import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const read=name=>readFileSync(new URL('../'+name,import.meta.url),'utf8');
const id='corsair:reach:500000',hull='rift-fighter',base='/api/galaxy/events/corsair';
function client(){
 const storage=new Map([['rift-runner.character-generation.v1','pilot'],
  ['rift-runner.fighter-parking-access.v1',JSON.stringify({generation:'pilot',bearer:'a'.repeat(64)})]]);
 const calls=[];
 const win={localStorage:{getItem:key=>storage.get(key)??null},fetch:async(path,opts)=>{
  calls.push({path,opts});
  return {ok:true,json:async()=>path===base?
   {version:1,event:{id,status:'active',sector:'reach',x:365,y:1160,start:500000,joinable:['rift-carrier']}}:
   {event:{id},state:{instance:id}}};
 }};
 runInNewContext(read('corsair-galaxy-client.js'),{window:win});
 return {api:win.RiftGalaxyCorsair,calls,storage};
}
test('the same occurrence ID goes from public marker to the game client, including explicit leave',async()=>{
 const {api,calls}=client(),marker=await api.marker();
 const game=api.client(marker.id);
 await game.join('rift-carrier',hull);
 await game.step('rift-carrier',hull,{seq:1,turn:0,thrust:0,strafe:0,fire:true});
 await game.leave('rift-carrier',hull);
 assert.equal(calls[0].opts.headers,undefined);
 assert.deepEqual(calls.slice(1).map(x=>x.path),[base+'/join',base+'/step',base+'/leave']);
 for(const {opts} of calls.slice(1)){
  const d=JSON.parse(opts.body);assert.equal(d.eventId,marker.id);assert.equal(d.hull,hull);assert.equal(d.vessel,undefined);
 }
 assert.equal(calls.at(-1).opts.keepalive,true);
});
test('an unrelated event or changed pilot cannot write combat input',async()=>{
 const {api,calls,storage}=client();
 assert.equal(await api.client('blackwake').join('rift-carrier',hull),null);
 storage.set('rift-runner.character-generation.v1','wrong');
 assert.equal(await api.client(id).join('rift-carrier',hull),null);
 assert.deepEqual(calls,[]);
});
test('existing Galaxy encounter pin and shared flight renderer are reused',()=>{
 const map=read('galaxy-map.js'),game=read('game.js');
 assert.match(map,/crossPin,'aria-label',cross\.coop\?'Corsair Cooperative Galaxy Event'/);
 assert.match(map,/\?galaxy-event='\+encodeURIComponent\(cross\.coop\.id\)/);
 assert.match(map,/if\(!cross\?\.coop&&shared\?\.status==='running'/);
 assert.match(game,/window\.RiftGalaxyCorsair\?\.client\?\.\(onlineGalaxyCorsair\)/);
 assert.match(game,/coopLeave=\(\)=>api\.leave\(berth\.parking\.vessel,id\)/);
 assert.match(read('index.html'),/corsair-galaxy-client\.js/);
 assert.match(read('galaxy-map.html'),/corsair-galaxy-client\.js/);
});
