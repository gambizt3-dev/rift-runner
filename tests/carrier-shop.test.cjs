'use strict';
const assert=require('node:assert/strict'),test=require('node:test'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const site=['../dist','..'].map(p=>path.join(__dirname,p)).find(p=>fs.existsSync(path.join(p,'carrier-shop.html')));
const read=name=>fs.readFileSync(path.join(site,name),'utf8');
test('Carrier links to a dedicated Shop without adding any Main Menu or Arena shop action',()=>{
 const html=read('carrier.html'),index=read('index.html'),shop=read('carrier-shop.html');
 assert.match(html,/<a[^>]+id="carrier-shop" href="\.\/carrier-shop\.html">Shop<\/a>/);
 assert.match(html,/<div class="carrier-left-rail">\s*<div class="carrier-launch-actions" role="group" aria-label="Launch fighter">[\s\S]*?<\/div>\s*<a[^>]+id="carrier-shop"/,'link is outside the launch group');
 assert.doesNotMatch(index,/carrier-shop\.html|id="carrier-shop"/);
 assert.match(shop,/<a class="shop-back" href="\.\/carrier\.html">[^\n]+Back to Carrier<\/a>/);
 assert.match(read('carrier-audio.js'),/\['carrier-hangar','carrier-launch-practice','carrier-launch-vandul','carrier-shop'\]/);
});
test('Shop has responsive fixed artwork, safe-area responsive layout, and no invented stock or audio',()=>{
 const shop=read('carrier-shop.html'),css=read('carrier-shop.css');
 assert.match(shop,/<main[^>]+aria-labelledby="carrier-shop-title"/);
 assert.match(shop,/<h1 id="carrier-shop-title">Carrier Shop<\/h1>/);
 assert.match(shop,/<img src="\.\/carrier-shop\.webp\?v=64" width="1024" height="1536" alt="[^"]+" fetchpriority="high">/);
 assert.match(shop,/<source media="\(min-aspect-ratio: 5\/4\)" srcset="\.\/carrier-shop-wide\.webp"/);
 assert.match(shop,/>No stock listed yet<\/h2>/);
 assert.deepEqual(shop.match(/<script[^>]*>/g),['<script src="./pilot-credits.js?v=1" defer>']);
 assert.doesNotMatch(shop,/<audio\b|<button\b|<form\b|<canvas\b|arena-background|carrier-engine-loop/);
 assert.match(css,/env\(safe-area-inset-left/);assert.match(css,/env\(safe-area-inset-right/);
 assert.match(css,/env\(safe-area-inset-top/);assert.match(css,/env\(safe-area-inset-bottom/);
 assert.match(css,/min-block-size:100dvh/);assert.match(css,/object-fit:cover/);
 assert.match(css,/min-block-size:44px/);assert.match(css,/\.shop-back:focus-visible/);
 assert.doesNotMatch(css,/@keyframes|\banimation:/);
});
test('Shop reuses the exact read-only browser-local credits display',()=>{
 const html=read('carrier-shop.html'),nodes={
  'carrier-pilot-credits':{hidden:true},'carrier-credit-value':{textContent:'0'}
 };
 const balanceKey='rift-runner.pilot-credits.v1';
 let readCount=0;const events={};
 const window={localStorage:{getItem:key=>{assert.equal(key,balanceKey);readCount++;return '40';},setItem(){assert.fail('Shop must not write credits');}},addEventListener:(name,callback)=>{events[name]=callback;}};
 vm.runInNewContext(read('pilot-credits.js'),{window,document:{getElementById:id=>nodes[id]??null}});
 assert.match(html,/id="carrier-pilot-credits" aria-live="polite" aria-atomic="true"/);
 assert.equal(nodes['carrier-pilot-credits'].hidden,false);
 assert.equal(nodes['carrier-credit-value'].textContent,'40');
 events.pageshow();
 assert.equal(readCount,2);
});
