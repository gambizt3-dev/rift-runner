'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {setup,tick}=require('./ballistic.test.cjs');

test('failed capture and release outside the pad re-center it, preserve heading, and allow the next aim',async()=>{
 const q=setup();q.open('start');await tick();
 const pad=q.el['aim-pad'];pad.setPointerCapture=()=>{throw Error('capture failed');};
 q.pointer('pointerdown',16,'aim-pad',464,360);
 assert.equal(pad.dataset.active,'true');
 q.outside('pointerup',{pointerId:3});
 assert.equal(q.inspect().aimPtr.id,16,'another thumb release must not reset aim');
 q.outside('pointerup',{pointerId:16});
 assert.equal(q.inspect().aimPtr,null);
 assert.equal(pad.style['--stick-x'],'0.0px');
 assert.equal(pad.style['--stick-y'],'0.0px');
 assert.equal(pad.dataset.active,undefined);
 assert.equal(q.inspect().p.aim,-Math.PI/2);q.step(16);assert.equal(q.inspect().p.aim,0);
 q.pointer('pointerdown',20,'aim-pad',240,160);
 assert.equal(q.inspect().p.aim,0);
 q.outside('pointercancel',{pointerId:20});q.step(16);assert.equal(q.inspect().p.aim,-Math.PI/2);
 assert.equal(q.inspect().aimPtr,null);
});

test('touch fallback resets only the aim thumb and never interrupts concurrent Ballistic fire',async()=>{
 const q=setup({saved:'ballistic'});q.open('start');await tick();
 const pad=q.el['aim-pad'],fire=q.el['fire-button'];
 const right={target:pad,identifier:1},left={target:fire,identifier:0};
 q.pointer('pointerdown',16,'aim-pad',240,520);
 q.pointer('pointerdown',3);
 q.outside('touchend',{changedTouches:[left],touches:[right]});
 assert.equal(q.inspect().aimPtr.id,16);
 q.outside('touchcancel',{changedTouches:[right],touches:[left]});
 assert.equal(q.inspect().aimPtr,null);
 assert.equal(pad.dataset.active,undefined);
 assert.equal(q.inspect().p.aim,-Math.PI/2);
 q.step(20);assert.ok(q.inspect().p.aim>0&&q.inspect().p.aim<Math.PI/2);
 assert.equal(q.inspect().practiceShots,3);
 q.pointer('pointerup',3);q.step(10);assert.equal(q.inspect().p.aim,Math.PI/2);
 q.pointer('pointerdown',24,'aim-pad',464,360);
 q.pointer('lostpointercapture',24,'aim-pad');
 assert.equal(q.inspect().aimPtr,null);
 q.pointer('pointerdown',25,'aim-pad',240,160);
 q.outside('touchend',{changedTouches:[right],touches:[]});
 assert.equal(q.inspect().aimPtr,null);
 q.step(29);assert.equal(q.inspect().p.aim,-Math.PI/2);
});
