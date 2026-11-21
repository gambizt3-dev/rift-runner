'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),test=require('node:test');
const site=['../dist','..'].map(p=>path.join(__dirname,p)).find(p=>fs.existsSync(path.join(p,'carrier.html')));
const read=name=>fs.readFileSync(path.join(site,name),'utf8');
test('Carrier is a native same-directory Main Menu link, separate from arena and Hangar',()=>{
 const index=read('index.html'),menu=index.slice(index.indexOf('<section id="main-menu"'),index.indexOf('<div id="arena-screen"'));
 assert.match(menu,/<a\b[^>]*\bid="main-menu-carrier"\s+href="\.\/carrier\.html"[^>]*>\s*<span>Carrier<\/span>/);
 assert.match(menu,/<button[^>]+data-rift="hangar"/);
 assert.ok(!index.slice(index.indexOf('<div id="arena-screen"')).includes('href="./carrier.html"'));
 assert.match(read('carrier.html'),/<a\b[^>]+href="\.\/index\.html"[^>]*>.*Main Menu<\/a>/);
});
test('Carrier is only a silent exterior scene, with a readable status and contained sprite',()=>{
 const page=read('carrier.html'),css=read('carrier.css');
 assert.match(page,/<main[^>]*aria-labelledby="carrier-title"/);
 assert.match(page,/<h1 id="carrier-title">Carrier<\/h1>/);
 assert.match(page,/Docked .*Hangar berth/);
 const image=page.match(/<img[^>]*src="\.\/carrier-scene\.webp"[^>]*>/)[0];
 assert.match(image,/alt="Overhead view[^"]+"/);
 const artPath=path.join(site,'carrier-scene.webp');
 const webp=fs.readFileSync(artPath);
 assert.equal(webp.toString('ascii',0,4),'RIFF');
 assert.equal(webp.toString('ascii',8,12),'WEBP');
 assert.equal(webp.toString('ascii',12,16),'VP8X');
 assert.ok(webp[20]&0x10,'sprite includes a transparent alpha channel');
 assert.equal(webp.readUIntLE(24,3)+1,1024);assert.equal(webp.readUIntLE(27,3)+1,1536);
 assert.doesNotMatch(page,/<(?:script|audio|button|canvas|dialog)\b/i);
 assert.match(css,/object-fit:contain/);
 assert.match(css,/safe-area-inset-left/);assert.match(css,/safe-area-inset-bottom/);
 assert.match(css,/radial-gradient\(circle/,'stars are furnished independently of the sprite');
});

test('the noninteractive docked fighter shares the art’s exact aspect-ratio frame',()=>{
 const page=read('carrier.html'),css=read('carrier.css');
 assert.match(page,/<div class="carrier-scene">\s*<img class="carrier-hull"[^>]+>\s*<img class="carrier-fighter"[^>]+src="\.\/fighter-winged\.png\?v=23"[^>]+alt=""[^>]*>/);
 assert.match(css,/\.carrier-scene\{[^}]*position:relative;aspect-ratio:2 \/ 3/);
 assert.match(css,/\.carrier-fighter\{[^}]*position:absolute;left:50%;top:73\.5%;width:11%/);
 assert.match(css,/\.carrier-fighter\{[^}]*pointer-events:none/);
});
