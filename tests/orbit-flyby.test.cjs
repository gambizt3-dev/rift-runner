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
const at=(x,phase='cruising')=>({x,y:720,sector:'reach',phase});
const orbit=()=>({world,frame,alpha:1,distance:375,dx:-375,dy:0});
test('a confirmed flyby slides the planet beyond the viewport, with no sudden fade at the map cutoff',()=>{
 const stream={orbit:orbit(),planetChart:at(1200),targetPlanet:null};
 step(stream,.25);assert.equal(view(stream.orbit).x,.24);
 stream.planetChart=at(1240);step(stream,.5);
 const early=view(stream.orbit);assert.ok(early.x<.24&&early.x>.20);assert.equal(early.fade,1);
 step(stream,5.5);
 const middle=view(stream.orbit);assert.ok(middle.x<0&&middle.x>-.75);assert.equal(middle.fade,1);
 step(stream,5.9);assert.ok(view(stream.orbit).x<-.70);
 step(stream,.2);assert.equal(stream.orbit,null);
});
test('stale data cannot move or erase a nearby planet; returning within range reels in an active pass',()=>{
 const stream={orbit:orbit(),planetChart:at(1330,'stale'),targetPlanet:null};
 step(stream,30);assert.equal(view(stream.orbit).x,.24);
 stream.planetChart=at(1330);step(stream,4);
 const x=view(stream.orbit).x;
 stream.planetChart=at(1400,'stale');step(stream,10);assert.equal(view(stream.orbit).x,x);
 stream.planetChart=at(1185);stream.targetPlanet={world,frame,distance:385,dx:-385,dy:0};step(stream,2);
 assert.equal(stream.orbit.pass,null);assert.equal(view(stream.orbit).x,.24);
});
test('a planet on the opposite side moves past the right edge; a new world waits for the old one',()=>{
 const next={world:{id:'verdan'},frame,distance:280,dx:280,dy:0};
 const stream={orbit:orbit(),planetChart:at(300),targetPlanet:next};
 step(stream,6);assert.ok(view(stream.orbit).x>.24);assert.equal(stream.orbit.world.id,'lyren');
 step(stream,6);assert.equal(stream.orbit.world.id,'verdan');assert.equal(stream.orbit.alpha,0);
});
