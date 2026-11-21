'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),test=require('node:test'),vm=require('node:vm');
const site=['../dist','..'].map(p=>path.join(__dirname,p)).find(p=>fs.existsSync(path.join(p,'carrier.html')));
const read=name=>fs.readFileSync(path.join(site,name),'utf8');
const page=read('carrier.html'),css=read('carrier.css');
test('Carrier is a native same-directory Main Menu link, separate from arena and Hangar',()=>{
 const index=read('index.html'),menu=index.slice(index.indexOf('<section id="main-menu"'),index.indexOf('<div id="arena-screen"'));
 assert.match(menu,/<a\b[^>]*\bid="main-menu-carrier"\s+href="\.\/carrier\.html"[^>]*>\s*<span>Carrier<\/span>/);
 assert.match(menu,/<button[^>]+data-rift="hangar"/);
 assert.ok(!index.slice(index.indexOf('<div id="arena-screen"')).includes('href="./carrier.html"'));
 assert.match(page,/<a\b[^>]+href="\.\/index\.html"[^>]*>.*Main Menu<\/a>/);
});
test('Carrier is a silent static dock with two readable transparent 2:3 sprites',()=>{
 assert.match(page,/<main[^>]*aria-labelledby="carrier-title"/);
 assert.match(page,/<h1 id="carrier-title">Carrier<\/h1>/);
 assert.match(page,/>Hangar berth<\/p>/);
 assert.doesNotMatch(page,/fighter-winged\.png|class="carrier-fighter"/);
 for(const [art,alt] of [['carrier-scene.webp','Exterior view'],['carrier-top.webp','Direct top view']]){
  const image=page.split('\n').find(line=>line.includes('src="./'+art+'"'));
  assert.ok(image.includes('alt="'+alt));
  const webp=fs.readFileSync(path.join(site,art));
  assert.equal(webp.toString('ascii',0,4),'RIFF');
  assert.equal(webp.toString('ascii',8,12),'WEBP');
  assert.equal(webp.toString('ascii',12,16),'VP8X');
  assert.ok(webp[20]&0x10,'sprite includes transparent alpha');
  assert.equal(webp.readUIntLE(24,3)+1,1024);assert.equal(webp.readUIntLE(27,3)+1,1536);
 }
 assert.doesNotMatch(page,/<(?:audio|button|canvas|dialog)\b/i);
 assert.deepEqual(page.match(/<script[^>]*>/g),['<script src="./carrier-view.js?v=1" defer>']);
 assert.match(css,/object-fit:contain/);
 assert.match(css,/safe-area-inset-left/);assert.match(css,/safe-area-inset-bottom/);
});
test('toggle and both directions update only angle arts, without showing the player fighter',()=>{
 assert.match(page,/<fieldset class="carrier-views" id="carrier-views" hidden>/);
 assert.match(page,/<input type="radio" name="carrier-angle" value="exterior" checked>/);
 assert.match(page,/<input type="radio" name="carrier-angle" value="top">/);
 assert.match(page,/<img [^>]+id="carrier-top-image"[^>]+ hidden>/);
 assert.match(css,/\.carrier-hull\[hidden\],\.carrier-views\[hidden\]\{display:none\}/);
 assert.match(css,/\.carrier-views input:focus-visible\+span\{outline:/);
 const nodes={
  'carrier-scene':{dataset:{angle:'exterior'}},'carrier-exterior-image':{hidden:false},
  'carrier-top-image':{hidden:true},'carrier-angle-label':{textContent:'Exterior view'},
  'carrier-views':{hidden:true,querySelector(sel){assert.equal(sel,'input[name="carrier-angle"]:checked');return {value:angle};},
   addEventListener(event,fn){assert.equal(event,'change');onChange=fn;}}
 };
 let angle='exterior',onChange;
 vm.runInNewContext(read('carrier-view.js'),{document:{getElementById:id=>nodes[id]}});
 assert.equal(nodes['carrier-views'].hidden,false);
 const view=()=>[nodes['carrier-scene'].dataset.angle,nodes['carrier-exterior-image'].hidden,nodes['carrier-top-image'].hidden,nodes['carrier-angle-label'].textContent];
 assert.deepEqual(view(),['exterior',false,true,'Exterior view']);
 angle='top';onChange();assert.deepEqual(view(),['top',true,false,'Top view']);
 angle='invalid';onChange();assert.deepEqual(view(),['top',true,false,'Top view']);
 angle='exterior';onChange();assert.deepEqual(view(),['exterior',false,true,'Exterior view']);
 assert.match(css,/\.carrier-scene\{[^}]*position:relative;aspect-ratio:2 \/ 3/);
});
test('slow stars are separate and reduced motion freezes them; light overlays do not move or interact',()=>{
 assert.match(css,/\.carrier-view::before,\.carrier-view::after\{[^}]*animation:carrier-star-drift 31s/);
 assert.match(css,/radial-gradient\(circle/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)\{\.carrier-view::before,\.carrier-view::after\{animation:none\}\}/);
 assert.match(page,/<div class="carrier-scene"[^>]+>[\s\S]*?<div class="carrier-lights" aria-hidden="true">/);
 assert.match(page,/<span class="carrier-light-bridge"><\/span>/);
 assert.match(css,/\.carrier-scene\{[^}]*--bridge-y:37\.5%/);
 assert.match(css,/\.carrier-scene\[data-angle="top"\]\{[^}]*--bridge-y:40\.9%/);
 assert.match(css,/\.carrier-lights\{[^}]*pointer-events:none\}/);
 assert.deepEqual([...page.matchAll(/class="carrier-engine-glow engine-(\d)"/g)].map(x=>x[1]),['1','2','3','4']);
 assert.match(css,/\.carrier-scene\[data-angle="top"\]\{[^}]*--engine-1:35\.5%[^}]*--engine-y:94\.7%/);
 assert.doesNotMatch(css,/\.carrier-scene(?:[ \n]*|\[.*?\])\{[^}]*animation:/);
});
