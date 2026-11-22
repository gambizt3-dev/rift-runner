'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const site=['../dist','..'].map(p=>path.join(__dirname,p)).find(p=>fs.existsSync(path.join(p,'index.html')));
const read=name=>fs.readFileSync(path.join(site,name),'utf8');
test('Hangar repair uses distinct floor art; both bays fail closed and the progress bar has a label',()=>{
 const html=read('index.html'),css=read('style.css');
 assert.match(html,/<figure[^>]+id="hangar-damaged-bay"[^>]+hidden>[\s\S]*?hangar-floor\.webp[\s\S]*?fighter-salvage-damaged\.webp[^>]*>[\s\S]*?HULL DAMAGED/);
 assert.match(html,/<figure[^>]+id="hangar-repaired-bay"[^>]+hidden>[\s\S]*?fighter-winged\.png/);
 assert.match(html,/<section[^>]+id="hangar-player-loadout"[^>]+hidden>/);
 assert.match(html,/<div id="fit-repair-progress-wrap"[^>]+hidden>\s*<label for="fit-repair-progress">Repair progress<\/label>\s*<progress id="fit-repair-progress" max="100" value="0">/);
 assert.match(css,/#player-hangar-view>\[hidden\]/);
 assert.match(html,/takes? four minutes/);
});
