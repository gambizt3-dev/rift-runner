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
