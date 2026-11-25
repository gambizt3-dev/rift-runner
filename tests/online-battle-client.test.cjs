'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const read=name=>fs.readFileSync(path.join(__dirname,'../dist',name),'utf8');
const load=()=>{
 const sandbox={window:{}};
 vm.runInNewContext(read('online-battle-client.js'),sandbox);
 return sandbox.window.RiftOnlineBattleClient;
};
const flush=()=>new Promise(resolve=>setImmediate(resolve));
const state=(seq=4,tick=9,instance='exercise-a')=>({
 self:'our-ship',lastSeq:seq,state:{id:'blackwake',instance,status:'running',tick,
  ships:[{id:'our-ship',team:'pirate',x:180,y:210,hp:16},{id:'wing',team:'pirate',x:190,y:200,hp:20},{id:'foe',team:'ally',x:390,y:490,hp:1}],
  shots:[{id:'shot3',team:'ally',x:280,y:360,heading:1}]}
});

test('online flight sends input only, resumes at receipt sequence, and renders a single authoritative fleet snapshot',async()=>{
 const calls=[],renders=[],input={turn:.5,thrust:1,strafe:-.5,fire:true,hp:9999,damage:99,x:9000};
 let finished;
 const client=load().create({
  join:async(...args)=>{calls.push(args);return state();},
  step:(...args)=>{calls.push(args);return new Promise(resolve=>{finished=resolve;});}
 },'bifrost','rift-fighter','opposition',(data,failures)=>renders.push({data,failures}));
 assert.equal(await client.join(),true);
 assert.deepEqual(calls[0],['bifrost','rift-fighter','opposition']);
 assert.equal(client.update(200,input),true);
 assert.equal(client.update(999,input),undefined,'one request at a time');
 await flush();
 assert.deepEqual(JSON.parse(JSON.stringify(calls[1])),['bifrost','rift-fighter',{seq:5,turn:.5,thrust:1,strafe:-.5,fire:true}]);
 assert.equal(renders.length,1,'input does not change local hull position or damage');
 const result=state(5,10);result.state.ships[0].hp=9;finished(result);await flush();
 assert.equal(renders.at(-1).data.state.ships[0].hp,9);
 assert.equal(renders.at(-1).data.state.ships[1].team,'pirate');
 assert.equal(renders.at(-1).data.state.ships[2].team,'ally');
 assert.equal(client.update(210,input),undefined,'poll rate is bounded');
 client.update(500,input);await flush();finished(state(6,8));await flush();
 assert.equal(renders.at(-1).data.state.tick,10,'server snapshots cannot rewind local view');
 assert.equal(renders.at(-1).failures,1);
 client.update(800,input);await flush();finished(state(7,12,'other-exercise'));await flush();
 assert.equal(renders.at(-1).data.state.instance,'exercise-a','no replacement room on reconnect');
 client.update(1100,input);await flush();client.close();finished(state(8,13));await flush();
 assert.equal(renders.at(-1).data.state.tick,10,'abandoned page ignores late replies');
});

test('unavailable or refused joins do not open a local battle; completed snapshots stop sending input',async()=>{
 const client=load();
 let render=0,steps=0;
 assert.equal(await client.create({join:()=>null},'bifrost','rift-fighter','allies',()=>render++).join(),false);
 assert.equal(render,0);
 const complete=state();complete.state.status='complete';
 const joined=client.create({join:()=>complete,step(){steps++;}},'bifrost','rift-fighter','allies',()=>render++);
 assert.equal(await joined.join(),true);
 joined.update(500,{fire:true});await flush();
 assert.equal(steps,0);
 assert.equal(render,1);
});

test('both online routes reuse existing arena controls and bypass local flight and shot simulation',()=>{
 const index=read('index.html'),game=read('game.js');
 assert.match(index,/rift-multiplayer\.js[\s\S]*online-battle-client\.js[\s\S]*game\.js\?v=[0-9]+/);
 assert.match(index,/online-join[\s\S]*online-hud[\s\S]*aim-pad/);
 assert.match(game,/multiplayer=blackwake&side=\(allies\|opposition\)/);
 assert.match(game,/if\(onlineBattle\)updateOnlineBattle\(now,dt\)/);
 assert.match(game,/function fireShot[^{]+\{\s*if\(onlineBattle\)return false/);
 assert.match(game,/p\.hp=self\.hp;p\.maxHp=self\.maxHp/);
 assert.match(game,/mine\?'YOU':onlineBot\(ship\)/);
});

test('the actual arena connects two browsers to the same exercise, displays both pilot teams and keeps both career saves unchanged',async()=>{
 const {setup}=require('./ballistic.test.cjs');
 const fighters=[
  {id:'one',team:'ally',vessel:'rift-carrier',hull:'rift-fighter',x:850,y:1050,heading:0,hp:20,maxHp:20},
  {id:'two',team:'pirate',vessel:'bifrost',hull:'rift-fighter',x:930,y:1050,heading:Math.PI,hp:20,maxHp:20},
  {id:'ai',npc:true,team:'pirate',vessel:'blackwake',hull:'pirate-multicrew',x:910,y:1140,heading:0,hp:75,maxHp:75},
  {id:'navy',npc:true,name:'Navy Wingmate 1',team:'ally',vessel:'bifrost',hull:'rift-fighter',x:975,y:1100,heading:0,hp:20,maxHp:20}
 ];
 const calls=[],fit={engine:'stock-thruster',core:'weifer-he3-core',battery:'kestrel-h20-reserve-cell',primary:'blaster',secondary:null,shield:null};
 const view=(id,seq,tick)=>({self:id,lastSeq:seq,wingmatesAssigned:0,state:{id:'blackwake',instance:'both-pilots',tick,status:'running',ships:fighters.map(x=>({...x})),shots:[]}});
 const open=(side,vessel,id)=>{
  const generation='online-'+id,store=new Map([
   ['rift-runner.character-generation.v1',generation],
   ['rift-runner.hull-owned.v1',JSON.stringify({version:1,hull:'rift-fighter',condition:'repaired'})],
   ['rift-runner.ship-build.v1',JSON.stringify({version:1,hull:'rift-fighter',...fit})]
  ]),before=[...store];
  const labels=[];
  const q=setup({onlineLabelPaint:labels,traceClashPaint:true,cockpitUI:true,buildUI:true,sharedStorage:store,loadPilotMissions:true,flightShell:true,initialHe3:0,
   address:{search:'?multiplayer=blackwake&side='+side,origin:'https://rift.example'},
   pilotCredits:{getBuildState:()=>({origin:'new',owned:Object.values(fit).filter(Boolean),kills:25}),owns:()=>true},
   parkingAdapter:parking=>({...parking,hydrate:async(_h,options)=>{
    assert.equal(options.migrate,false);return {status:'ok',parking:{vessel,revision:2,bay:4}};
   }}),multiplayer:{
    join:async(...args)=>{calls.push(['join',...args]);return view(id,0,1);},
    step:async(_v,_h,input)=>{calls.push(['step',id,{...input}]);if(input.fire&&id==='one')fighters[1].hp=13;return view(id,input.seq,input.seq+1);}
   }
  });
  return {q,store,before,labels};
 };
 const a=open('allies','rift-carrier','one'),b=open('opposition','bifrost','two');
 assert.equal(a.q.el['online-entry'].hidden,false);
 a.q.click('online-join',{isTrusted:false});await flush();assert.equal(calls.length,0);
 assert.equal(a.q.el['online-deployment'].hidden,false);
 assert.equal(b.q.el['online-deployment'].hidden,true);
 a.q.el['online-mode'].value='wingmen';b.q.el['online-mode'].value='fleet';
 a.q.click('online-join');b.q.click('online-join');await flush();
 assert.deepEqual(calls,[['join','rift-carrier','rift-fighter','allies','wingmen'],['join','bifrost','rift-fighter','opposition','solo']]);
 assert.equal(a.q.inspect().state,'play');assert.equal(b.q.inspect().state,'play');
 assert.equal(a.q.el['online-dispatch'].textContent,'0 of 1 requested NPC pilots dispatched.');
 assert.equal(b.q.el['online-dispatch'].hidden,true);
 assert.match(a.q.el['online-status'].textContent,/1 opposing pilot · 1 allied NPC · 1 opposing NPC/);
 a.q.click('fire-button');assert.equal(a.q.inspect().shots.length,0,'click sends intent, never creates a local bullet');
 a.q.step(16);await flush();
 b.q.step(16);await flush();
 assert.ok(a.labels.includes('ALLIED NPC · Navy Wingmate 1'),a.labels.join(', '));
 assert.ok(b.labels.includes('OPPOSING NPC · Navy Wingmate 1'),b.labels.join(', '));
 assert.ok(a.labels.includes('OPPOSING PILOT'));
 assert.ok(b.labels.includes('OPPOSING PILOT'));
 const fired=calls.find(([type,id,input])=>type==='step'&&id==='one'&&input.fire);
 assert.ok(fired);
 assert.equal(b.q.inspect().p.hp,13,'opponent sees authoritative damage via the same exercise state');
 const smoke=q=>q.radialPaint.filter(fx=>fx.stops[0]==='#78838c');
 assert.equal(smoke(a.q).length,0,'no smoke above half health');
 fighters[1].hp=9;fighters[2].hp=30;
 a.q.step(15);b.q.step(15);await flush();
 a.q.step(22);b.q.step(22);
 for(const {q} of [a,b]){
  const view=smoke(q);
  assert.ok(view.some(fx=>Math.abs(fx.args[1]-1050)<8),'remote fighter smokes in both views');
  assert.ok(view.some(fx=>Math.abs(fx.args[1]-1140)<10),'server-damaged Blackwake smokes in both views');
 }
 assert.deepEqual([...a.store],a.before);assert.deepEqual([...b.store],b.before);
});
