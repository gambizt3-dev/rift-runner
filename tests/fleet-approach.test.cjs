'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../dist/fleet-approach.js'),'utf8');
const window={};vm.runInNewContext(source,{window});
const {plan,encounter}=window.RiftFleetApproach;
const at=(x,y,sector='reach',phase='cruising')=>({x,y,sector,phase});
test('each strategic bearing selects the matching encounter edge and opposite fleet exit',()=>{
 for(const [x,y,entryEdge,exitEdge,heading] of [
  [100,1160,'west','east',0],[600,1160,'east','west',Math.PI],
  [365,900,'north','south',Math.PI/2],[365,1380,'south','north',-Math.PI/2]
 ]){
  const route=plan(at(x,y));
  assert.deepEqual({...route},{entryEdge,exitEdge,heading});
  assert.ok(Object.isFrozen(route));
 }
 assert.ok(Object.isFrozen(encounter));
});
test('diagonals use dominant axis with a deterministic horizontal tie; sectors share one basis',()=>{
 assert.equal(plan(at(465,1060)).entryEdge,'east');
 assert.equal(plan(at(465,1059)).entryEdge,'north');
 assert.equal(plan(at(0,1150,'frontier')).entryEdge,'east');
 assert.equal(plan(at(2740,1150),{sector:'frontier',x:0,y:1150}).entryEdge,'west');
});
test('unready, invalid and effectively coincident samples do not invent a direction',()=>{
 for(const sample of [null,at(NaN,0),at(0,0,'ghost'),at(100,900,'reach','stale'),
  at(100,900,'reach','unavailable'),at(100,900,'reach','connecting'),at(365,1160),at(365.4,1160)]){
  assert.equal(plan(sample),null);
 }
 assert.equal(plan(at(0,0),{sector:'reach',x:-1,y:0}),null);
});
