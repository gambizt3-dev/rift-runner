'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=['../dist','..'].map(dir=>path.join(__dirname,dir)).find(dir=>fs.existsSync(path.join(dir,'index.html')));
test('Hangar uses the ship arrows instead of a second gallery and discloses the loadout on demand',()=>{
 const page=fs.readFileSync(path.join(root,'index.html'),'utf8'),css=fs.readFileSync(path.join(root,'style.css'),'utf8');
 const owned=page.match(/<section id="hangar-ship-choice"[\s\S]*?<\/section>/)[0];
 assert.match(owned,/<input type="hidden" id="hangar-ship" value="rift-fighter">/);
 assert.equal((owned.match(/<button[^>]+ disabled>/g)||[]).length,2);
 assert.match(owned,/<figcaption><strong id="hangar-ship-name">Rift-3 Fighter<\/strong>/);
 assert.doesNotMatch(page,/Fighter concepts|hangar-fighter-concepts/);
 assert.match(page,/<details class="hangar-loadout" id="hangar-player-loadout" hidden>\s*<summary id="loadout-title">Loadout<\/summary>/);
 assert.match(page,/id="fighter-fit-grid"/);
 assert.match(css,/\.hangar-loadout:not\(\[open\]\)>:not\(summary\)\{display:none!important\}/);
});

test('fighter selector precedes the formation banner and the loadout remains last',()=>{
 const page=fs.readFileSync(path.join(root,'index.html'),'utf8'),css=fs.readFileSync(path.join(root,'style.css'),'utf8');
 const first=page.indexOf('id="hangar-ship-choice"'),second=page.indexOf('id="hangar-wing-mount"'),third=page.indexOf('id="hangar-player-loadout"');
 assert.ok(first>0&&first<second&&second<third);
 assert.match(page,/<summary class="wing-formation-banner"><strong>Wingman &amp; Formation<\/strong>/);
 assert.match(css,/wing-formation-banner\.webp/);
 assert.equal(fs.readFileSync(path.join(root,'wing-formation-banner.webp')).toString('ascii',8,12),'WEBP');
});
test('normal repairs take 60 seconds and destroyed hulls take four minutes',()=>{
 const game=fs.readFileSync(path.join(root,'game.js'),'utf8'),vm=require('node:vm');
 const lines=game.match(/const hullRepairDurationMs=[^\n]*\nconst hullRepairDuration=[^\n]*/)[0];
 const context=vm.runInNewContext(lines+';({partial:hullRepairDuration({hullHp:1}),destroyed:hullRepairDuration({hullHp:0})})');
 assert.equal(context.partial,60000);assert.equal(context.destroyed,240000);
 assert.ok(game.includes('![30000,partialHullRepairDurationMs].includes(cert.durationMs)'),'older repair receipts remain readable');
});
