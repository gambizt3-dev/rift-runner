const {test}=require('node:test');
const {strict:assert}=require('node:assert');
const {readFileSync}=require('node:fs');
const {join}=require('node:path');
const vm=require('node:vm');
const game=readFileSync(join(__dirname,'../dist/game.js'),'utf8');
const segment=(a,b)=>game.slice(game.indexOf(a),game.indexOf(b,game.indexOf(a)+a.length));
function fixture(){
 const craft={x:0,y:0,prevX:0,prevY:0,hp:110,allyShip:true};
 craft.hullSections=[{x:0,y:0,prevX:0,prevY:0,r:18,resoluteHull:craft}];
 const rings=[],ctx=vm.createContext({craft,rings,elapsed:0,resoluteFlightLength:100,arena:{left:-500,right:500,top:-500,bottom:500},p:{x:0,y:350,prevX:0,prevY:350,r:12},shots:[],vandulLasers:[],pirateCapitals:[],rangeTargets:[],capitalShip:null,escortShip:null,wingman:null,testLead:null,state:'play',guns:{ballistic:{kind:'ballistic'}},battleResolute:()=>null,fittedShield:()=>null,isFourWayBattle:()=>false,releaseProjectileVoice(){},burstRing(x,y,r,color){rings.push(color);},hitWithVandulLaser(b,target){b.life=0;target.hp-=b.damage;}});
 vm.runInContext(segment('function sweptCircle(', '// Optics are separate')+segment('const clashRadius=','const wingmanLeash='),ctx);
 return {craft,rings,at:t=>{ctx.elapsed=t;},fire(damage,{hostile=false,weapon,ally=false}={}){
  const b={x:-100,y:0,vx:200,vy:0,damage,weapon,life:3,ally};
  ctx[hostile?'vandulLasers':'shots'].push(b);vm.runInContext('sweepProjectiles(1,[],[],craft)',ctx);return b;
 }};
}
test('Resolute flashes and spends Aegis on player shots without friendly hull damage',()=>{
 const q=fixture();
 const first=q.fire(10,{weapon:'ballistic'});assert.equal(first.damage,5);assert.equal(first.spent,true);
 assert.equal(q.craft.aegis.hp,20);assert.equal(q.craft.hp,110);
 q.fire(25);assert.equal(q.craft.aegis.hp,0);assert.equal(q.craft.hp,110);
 assert.deepEqual(q.rings,['#79efff','#79efff']);
 q.at(1);q.fire(5);assert.equal(q.craft.aegis.hp,0);
 q.at(3);q.fire(5);assert.equal(q.craft.aegis.hp,20);assert.equal(q.craft.hp,110);
});
test('Aegis absorbs hostile hits first; excess damages Resolute and allied NPC shots do not trigger it',()=>{
 const q=fixture();
 q.fire(5,{ally:true});assert.equal(q.craft.aegis,undefined);
 q.fire(12,{hostile:true});assert.equal(q.craft.hp,110);assert.equal(q.craft.aegis.hp,13);
 q.fire(20,{hostile:true});assert.equal(q.craft.hp,103);assert.equal(q.craft.aegis.hp,0);
});
