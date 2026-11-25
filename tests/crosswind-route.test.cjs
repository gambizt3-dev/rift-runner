'use strict';
const {readFileSync}=require('node:fs'),{runInNewContext}=require('node:vm'),assert=require('node:assert/strict'),test=require('node:test');
const root=new URL('../', 'file:'+__filename),read=f=>readFileSync(new URL(f,root),'utf8');
const src=read('galaxy-map.js'),html=read('galaxy-map.html');
test('Crosswind has an identity and the same repeating planet route across clients',()=>{
 const data=[['brine','Brine',303,755],['caldera','Caldera',848,871],['sable','Sable',1280,611],['talven','Talven',545,500]].map(([id,name,x,y])=>({id,name,x,y}));
 const ctx={data,crosswindClass:null};runInNewContext(src.slice(src.indexOf(' const crosswind=Object.freeze'),src.indexOf(' const pegasusId='))+'\nObject.assign(globalThis,{crosswind,crosswindRouteAt});',ctx);
 assert.equal(ctx.crosswind.captain,'Captain Nessa Rourke');assert.equal(ctx.crosswind.affiliation,'Free People');
 assert.equal(ctx.crosswind.id,'crosswind');assert.equal(ctx.crosswind.sector,'reach');
 let now=Date.UTC(2026,10,25);const start=now;
 for(const [i,from] of data.entries()){
  const to=data[(i+1)%data.length],ms=Math.max(40000,Math.hypot(to.x-from.x,to.y-from.y)*205);
  const p=ctx.crosswindRouteAt(now+ms*.5);assert.equal(p.from,from.name);assert.equal(p.to,to.name);
  assert.ok(Math.abs(p.x-((from.x+to.x)/2+76))<.001);assert.equal(p.arrived,false);
  assert.equal(ctx.crosswindRouteAt(now+ms+5000).arrived,true);now+=ms+11000;
 }
 assert.deepEqual(ctx.crosswindRouteAt(start),ctx.crosswindRouteAt(now));
 assert.match(html,/galaxy-map\.js\?v=chart-clean-1/);
 assert.match(src,/Free People · Crosswind/);
 assert.doesNotMatch(src.slice(src.indexOf('vessels=new Map('),src.indexOf('const vesselAt=')),/crosswind/);
});
