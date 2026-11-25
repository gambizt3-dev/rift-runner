import {test} from 'node:test';
import {readFileSync} from 'node:fs';
const read=name=>readFileSync(new URL('../'+name,import.meta.url),'utf8');

async function reconnectCase(code){
 const w={};Function('window',code)(w);
 const stepSeq=[],joins=[],seen=[];
 let lastSeq=73,tick=100,online=true,failRejoin=105,phase='running';
 const input={turn:0,thrust:1,strafe:0,fire:false};
 const packet=(self='stable-ship')=>({self,lastSeq,state:{instance:'corsair:reach:500000',tick:++tick,status:phase,ships:[{id:self,hp:9}],shots:[]}});
 const api={async join(){return packet();},async step(v,h,d){stepSeq.push(d.seq);if(!online)return null;lastSeq=d.seq;return packet();},
  async rejoin(){joins.push(1);if(failRejoin-- >0)return null;online=true;return packet();}};
 const session=w.RiftOnlineBattleClient.create(api,'rift-carrier','rift-fighter','allies',(p,n)=>seen.push([p,n]));
 const eq=(a,b)=>{if(JSON.stringify(a)!==JSON.stringify(b))throw Error(JSON.stringify([a,b]));};
 const settle=async()=>{for(let i=0;i<24;i++)await Promise.resolve();};
 eq(await session.join(),true);session.update(0,input);await settle();eq(stepSeq,[74]);
 online=false;session.update(13000,input);await settle();eq(stepSeq,[74,75]);
 for(let i=0;i<106;i++){session.update(15000+i*1800,input);await settle();}
 eq(joins.length,106);eq(stepSeq,[74,75]);eq(seen.at(-1)[0].self,'stable-ship');eq(seen.at(-1)[0].state.ships[0].hp,9);
 session.update(210000,input);await settle();eq(stepSeq,[74,75,75]);eq(seen.at(-1)[0].lastSeq,75);
}
async function leaveCase(code){
 const calls=[],token='a'.repeat(64);
 let resolveJoin;
 const wait=new Promise(r=>{resolveJoin=r;});
 const evt='corsair:reach:500000';
 const w={localStorage:{getItem(key){return key.includes('access')?JSON.stringify({generation:'g',bearer:token}):'g';}},async fetch(path){
  const action=path.split('/').at(-1);calls.push(action);
  if(action==='join')await wait;
  return {ok:true,json:async()=>({event:{id:evt},state:{instance:evt}})};
 }};
 Function('window',code)(w);
 const net=w.RiftGalaxyCorsair.client(evt);
 const pending=net.rejoin('rift-carrier','rift-fighter');
 const leaving=net.leave('rift-carrier','rift-fighter');
 if(await net.rejoin('rift-carrier','rift-fighter')!==null||calls.join(',')!=='join')throw Error('Leave did not stop reconnect');
 resolveJoin();await Promise.all([pending,leaving]);
 if(calls.join(',')!=='join,leave')throw Error(calls.join(','));
}

test('after a long phone pause, Corsair rejoins the same ship and resumes at the acknowledged input sequence',()=>reconnectCase(read('online-battle-client.js')));
test('explicit leave waits for the pending reconnect and prevents another join',()=>leaveCase(read('corsair-galaxy-client.js')));
