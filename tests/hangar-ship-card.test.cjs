'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const dist=['../dist','..'].map(p=>path.join(__dirname,p)).find(p=>fs.existsSync(path.join(p,'index.html')));
const read=name=>fs.readFileSync(path.join(dist,name),'utf8');
test('the default owned Rift-4 has a wide ship card instead of a dropdown',()=>{
 const h=read('index.html');const card=h.match(/<section id="hangar-ship-choice"[\s\S]*?<\/section>/)[0];
 assert.match(card,/aria-label="Your ship" hidden/);
 assert.match(card,/rift4-ship-card-v2\.webp" width="900" height="300"/);
 assert.match(card,/<strong id="hangar-ship-name">Rift-4 Fighter<\/strong>/);
 assert.doesNotMatch(card,/<select/);
 assert.equal((card.match(/<button[^>]+aria-label="(?:Previous|Next) owned ship" disabled/g)||[]).length,2);
 const art=fs.readFileSync(path.join(dist,'rift4-ship-card-v2.webp'));
 assert.equal(art.toString('ascii',0,4),'RIFF');
 assert.equal(art.toString('ascii',8,12),'WEBP');
});
test('compact loadout keeps controls and hides technical lines until Part details is open',()=>{
 const h=read('index.html'),css=read('style.css');
 assert.match(h,/<details id="fit-details" class="fit-guide"><summary>Part details<\/summary>/);
 assert.match(h,/id="fit-primary-picture"/);assert.match(h,/id="fit-repair-direct"/);
 assert.match(css,/\.hangar-loadout:not\(:has\(#fit-details\[open\]\)\) :is\(\.fit-slot>small,[^}]+\{display:none\}/);
});
