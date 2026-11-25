'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),{readFileSync}=require('node:fs');
const source=readFileSync(require('node:path').join(__dirname,'../dist/game.js'),'utf8');
const begin=source.indexOf('const planetPassSeconds='),end=source.indexOf('function updateCruisePlanet(',begin);
const clamp=(x,a,b)=>Math.min(b,Math.max(a,x));
const smoothBerth=x=>{const y=clamp(x,0,1);return y*y*(3-2*y);};
const {advanceCruisePlanetPass:step,cruisePlanetViewport:view}=vm.runInNewContext(
 source.slice(begin,end)+'\n({advanceCruisePlanetPass,cruisePlanetViewport});',{clamp,smoothBerth}
);
const world={id:'lyren',x:800,y:720},frame=[0,0];
const position={x:900,y:720,sector:'reach',phase:'cruising'};
const near=(world)=>({world,frame,distance:100});
test('a nearby planet starts above the screen and drifts steadily down even while the map pose stays fixed',()=>{
 const stream={planetChart:position,targetPlanet:near(world)};
 step(stream,0);const first=view(stream.orbit);assert.equal(first.x,.24);assert.equal(first.y,-.64);
 step(stream,6);const second=view(stream.orbit);assert.ok(second.y>first.y);
 step(stream,6);const third=view(stream.orbit);assert.ok(Math.abs((third.y-second.y)-(second.y-first.y))<1e-9);assert.equal(third.fade,1);
 step(stream,11);assert.ok(view(stream.orbit).y>1);
 step(stream,1.01);assert.equal(stream.orbit,null);
 step(stream,2);assert.equal(stream.orbit,null,'no repeat while the same planet stays nearby');
});
test('stale chart data does not freeze an active pass or start a new planet',()=>{
 const stream={planetChart:position,targetPlanet:near(world)};
 step(stream,5);const y=view(stream.orbit).y;
 stream.planetChart={...position,phase:'stale'};
 stream.targetPlanet=near({id:'verdan'});
 step(stream,8);assert.ok(view(stream.orbit).y>y);assert.equal(stream.orbit.world.id,'lyren');
 step(stream,12);assert.equal(stream.orbit,null);
 step(stream,1);assert.equal(stream.orbit,null);
 stream.planetChart=position;step(stream,1);assert.equal(stream.orbit.world.id,'verdan');
});
test('leaving and re-entering range starts a new pass, without reversing the first one',()=>{
 const stream={planetChart:position,targetPlanet:near(world)};
 step(stream,12);const y=view(stream.orbit).y;
 stream.targetPlanet=null;step(stream,4);assert.ok(view(stream.orbit).y>y);
 stream.targetPlanet=near(world);step(stream,8);assert.equal(stream.orbit,null);
 step(stream,0);assert.equal(view(stream.orbit).y,-.64);
});
