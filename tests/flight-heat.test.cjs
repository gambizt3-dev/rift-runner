'use strict';
const assert=require('node:assert/strict');
const test=require('node:test');
const {setup}=require('./ballistic.test.cjs');

const start=(options={})=>{
 const q=setup(options);
 q.open('start');q.step();
 return q;
};
const heat=q=>q.inspect().p.heat;
const fire=q=>q.click('fire-button');
const meter=q=>q.el['flight-heat-meter'].value;
const amount=q=>q.el['flight-heat-amount'].textContent;
const burst=(q,gun)=>{
 const select=()=>q.click('gun-'+gun,{detail:1,pointerType:'touch',pointerId:20});
 select();q.step(6);select();
};

test('overall heat measures successful normal shots only and cools in active flight',()=>{
 const q=start();
 assert.equal(meter(q),0);assert.equal(amount(q),'0 / 100');
 fire(q);assert.equal(heat(q),2);assert.equal(amount(q),'2 / 100');
 fire(q);assert.equal(heat(q),2,'cadence rejection adds no heat');
 q.step(13);fire(q);assert.equal(heat(q),4);
 q.step(21);assert.equal(heat(q),4,'short delay from last real shot');
 q.step(16);assert.ok(heat(q)>2&&heat(q)<2.2);
 q.step(25);assert.equal(heat(q),0);assert.equal(meter(q),0);
});

test('burst activation plus actual burst rounds add heat; empty burst attempts add none',()=>{
 const q=start();
 burst(q,'blaster');assert.equal(heat(q),0,'selecting a mode does not activate it');
 fire(q);assert.equal(heat(q),5.5);
 q.step(16);assert.equal(q.inspect().practiceShots,6);assert.equal(heat(q),18);
 fire(q);assert.equal(heat(q),18,'blocked during burst cooldown');
 const empty=start({initialHe3:null});
 burst(empty,'blaster');fire(empty);
 assert.equal(empty.inspect().practiceShots,0);assert.equal(heat(empty),0);
 empty.inspect().p.he3=1;
 fire(empty);empty.step(4);
 assert.equal(empty.inspect().practiceShots,1);assert.equal(heat(empty),5.5,'unfired burst rounds add no heat');
 assert.ok(empty.inspect().burstCooldown>0,'energy depletion still aborts the burst');
});

test('A-Alkine uses the same reduced heat per six-round burst',()=>{
 const q=start({saved:'ballistic'});
 burst(q,'ballistic');fire(q);q.step(16);
 assert.equal(q.inspect().practiceShots,6);
 assert.equal(heat(q),18);
});

test('heat saturates without changing firing; pause and hide freeze it; reset clears it',()=>{
 const q=start({saved:'ballistic',savedFit:JSON.stringify({version:1,primary:'ak77',secondary:'ballistic'})});
 q.change('ak77');
 assert.equal(q.inspect().fighterLoadout.weapon,'ak77');
 fire(q);q.step(38);assert.equal(q.inspect().practiceShots,18);assert.equal(heat(q),48);
 for(let i=0;i<2;i++){q.step(111);fire(q);q.step(38);}
 assert.equal(q.inspect().practiceShots,54);assert.equal(heat(q),100);assert.equal(amount(q),'100 / 100');
 q.key('keydown','KeyP');q.step(200);assert.equal(heat(q),100);
 q.open('resume');q.hide(true);q.step(200);assert.equal(heat(q),100);
 q.hide(false);q.open('resume');q.step(60);
 assert.ok(heat(q)<100&&heat(q)>90);
 q.reset();assert.equal(heat(q),0);assert.equal(amount(q),'0 / 100');
});
