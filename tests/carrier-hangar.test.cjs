'use strict';
const assert=require('node:assert/strict'),test=require('node:test');
const {setup,tick}=require('./ballistic.test.cjs');
const link='?hangar=carrier';
function load({search=link,dialogSupported=true,initialHidden=false,failReturn=false}={}){
 const returned=[];
 const address={search,replace(url){if(failReturn)throw Error('Navigation unavailable');returned.push(url);}};
 const q=setup({address,dialogSupported,initialHidden,legacyArenaHangar:false});
 return {q,returned};
}
function stillDocked(q){
 assert.equal(q.inspect().state,'menu');
 assert.equal(q.el['arena-screen'].hidden,true);
 assert.equal(q.inspect().duelCountdown,0);
 assert.equal(q.inspect().vandul,null);
 assert.equal(q.inspect().practiceShots,0);
 assert.equal(q.graphs.length,0);
}
test('exact native linked route opens the existing playable Hangar; release returns only to Carrier',async()=>{
 const {q,returned}=load();
 assert.equal(q.el.hangar.open,true);
 assert.equal(q.focused,q.el['hangar-title']);
 assert.equal(q.el['close-hangar'].textContent,'Back to Carrier');
 assert.equal(q.el['close-hangar'].attrs['aria-label'],'Back to Carrier');
 q.choose('start');q.choose('practice');q.key('keydown','Space');q.step(285);stillDocked(q);
 q.fit('engine','test-thruster');assert.equal(q.inspect().fighterLoadout.engine,'test-thruster');
 await tick();q.click('close-hangar');
 assert.equal(q.el.hangar.open,false);
 assert.deepEqual(returned,['./carrier.html']);
 stillDocked(q);
 assert.equal(q.inspect().fighterLoadout.engine,'test-thruster');
});

test('hidden loading defers until visible; Escape closes nested picker before carrier return',()=>{
 const {q,returned}=load({initialHidden:true});
 assert.equal(q.el.hangar.open,false);stillDocked(q);
 q.hide(false);assert.equal(q.el.hangar.open,true);stillDocked(q);
 q.click('fit-primary-picture');assert.equal(q.el['fit-weapon-picker'].hidden,false);
 let prevented=false;
 q.el.hangar.handlers.cancel({preventDefault(){prevented=true;}});
 assert.equal(prevented,true);assert.equal(q.el['fit-weapon-picker'].hidden,true);
 assert.equal(q.el.hangar.open,true);assert.equal(returned.length,0);
 q.el.hangar.handlers.cancel({preventDefault(){assert.fail('ordinary Escape must close Hangar');}});
 q.el.hangar.close(); // Browser default action after cancel is not prevented.
 assert.deepEqual(returned,['./carrier.html']);
 q.hide(true);q.hide(false);assert.equal(q.el.hangar.open,false,'startup route is one-shot');
});

test('extra/query-like destinations never activate route; Main Menu Hangar retains existing behavior',()=>{
 for(const search of ['', '?return=https://outside.invalid','?hangar=carrier&return=https://outside.invalid','?hangar=%63arrier','?hangar=carrier%26foo=1']){
  const {q,returned}=load({search});
  assert.equal(q.el.hangar.open,false);
  q.choose('hangar');assert.equal(q.el.hangar.open,true);
  assert.equal(q.el['close-hangar'].textContent,'Back to menu');
  q.click('close-hangar');
  assert.deepEqual(returned,[]);assert.equal(q.focused,q.el['main-menu-hangar']);
  stillDocked(q);
 }
});

test('unsupported modal and failed return leave a working Main Menu fallback without flight',()=>{
 const noModal=load({dialogSupported:false});
 assert.equal(noModal.q.el.hangar.open,false);stillDocked(noModal.q);
 assert.deepEqual(noModal.returned,[]);
 const blocked=load({failReturn:true});
 assert.equal(blocked.q.el.hangar.open,true);
 blocked.q.click('close-hangar');
 assert.equal(blocked.q.el.hangar.open,false);assert.equal(blocked.q.focused,blocked.q.el['main-menu-hangar']);stillDocked(blocked.q);
 assert.deepEqual(blocked.returned,[]);
 blocked.q.choose('hangar');assert.equal(blocked.q.el['close-hangar'].textContent,'Back to menu');
});
