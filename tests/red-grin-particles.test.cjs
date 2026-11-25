const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const src=fs.readFileSync(new URL('../game.js','file:'+__filename),'utf8');
test('Red Grin uses compact round cloud and particles; the other turret stays unchanged',()=>{
 const calls=[],stops=[];
 const ctx={TAU:2*Math.PI,elapsed:1,motion:{matches:false},g:{globalAlpha:1,
 save(){},restore(){},rotate(){},createRadialGradient(){return {addColorStop(...x){stops.push(x);}};},
 beginPath(){},arc(...x){calls.push(x);},fill(){},fillRect(){throw Error('no streak rectangles');}}};
 const code=src.slice(src.indexOf('const redGrinCannonMotes='),src.indexOf('function paintRedGrinSolo('));
 vm.runInNewContext(code+'\npaintRedGrinCannonCloud({life:.5,cannon:1,pulse:2});',ctx);
 assert.equal(calls.length,6);assert.equal(stops.length,4);
 for(const [x,y,r] of calls){assert.ok(Math.abs(x)+r<=10);assert.ok(Math.abs(y)+r<=10);}
 assert.match(src,/if\(bolt.redGrinCannon\)\{\s*paintRedGrinCannonCloud\(bolt\);\s*\}else if\(bolt.blackwakeTurret\)/);
});
test('each firing nozzle emits its own drifting, expanding smoke cloud',()=>{
 const arcs=[],ctx={TAU:2*Math.PI,motion:{matches:false},sparks:[],
 g:{createRadialGradient(){return {addColorStop(){}}},beginPath(){},arc(...x){arcs.push(x)},fill(){}}};
 vm.runInNewContext(src.slice(src.indexOf('function emitRedGrinMuzzleClouds('),src.indexOf('const redGrinCannonMotes='))+
 '\nemitRedGrinMuzzleClouds([{x:20,y:30,a:0},{x:20,y:50,a:0},{x:20,y:70,a:0}]);',ctx);
 assert.equal(ctx.sparks.length,15);
 for(const y of [30,50,70])assert.equal(ctx.sparks.filter(s=>s.x===20&&s.y===y&&s.dx>0).length,5);
 for(const puff of ctx.sparks)assert.ok(puff.life<=.57&&puff.redGrinMuzzle);
 const puff=ctx.sparks[0];puff.life=puff.max/2;ctx.puff=puff;
 vm.runInNewContext('paintRedGrinMuzzlePuff(puff);',ctx);
 assert.ok(arcs[0][2]>puff.r*2);
});
test('cannon sits above music and the end of each burst gets two quieter echoes',()=>{
 const tones=[],impacts=[],ctx={duckArenaMusic(){impacts.push('duck')},cannonCrack(g){impacts.push(g)},tone(...x){tones.push(x)}};
 vm.runInNewContext(src.slice(src.indexOf('function playRedGrinCannonPulse('),src.indexOf('function emitRedGrinMuzzleClouds('))+'\nplayRedGrinCannonPulse(.55,false);playRedGrinCannonPulse(.55,true);',ctx);
 assert.equal(impacts.length,4);assert.ok(impacts[1]>.9&&impacts[1]<=1);
 assert.equal(tones.length,6);
 assert.deepEqual(tones.slice(-2).map(t=>t[5]),[.24,.45]);
 assert.ok(tones.at(-1)[4]<tones.at(-2)[4]&&tones.at(-2)[4]<tones[2][4]);
});
