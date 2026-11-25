'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=['../dist','..'].map(dir=>path.join(__dirname,dir)).find(dir=>fs.existsSync(path.join(dir,'index.html')));
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
test('Bison-2 and Swift-2 preserve saved hull IDs, fit and stats',()=>{
 const window={};
 vm.runInNewContext(read('fighter-registry.js'),{window});
 const bison=window.RiftFighters.get('stocky-light-fighter'),swift=window.RiftFighters.get('bastion-9');
 assert.match(bison.name,/Bison-2/);assert.match(swift.name,/Swift-2/);
 assert.deepEqual([bison.weaponSize,swift.weaponSize,bison.hullHp,swift.hullHp],[2,2,26,16]);
 assert.match(bison.cardArt,/stocky-light-fighter-concept\.webp\?v=2$/);
 for(const file of ['carrier.html','carrier-shop.html','pilot-credits.js','vessel-exterior.js','game.js']){
  assert.doesNotMatch(read(file),/Stocky-2|Bastion-2/,file);
  assert.match(read(file),/Bison-2/,file);assert.match(read(file),/Swift-2/,file);
 }
});
test('Hangar keeps the ordinary tap audio path without a dedicated sound button',()=>{
 const html=read('index.html'),game=read('game.js');
 assert.doesNotMatch(html,/id="hangar-engine-audio"/);
 assert.match(html,/id="hangar-test-engine"/);
 assert.match(game,/window\.RiftSoundActivation\?\.\(/);
 assert.match(game,/start:event=>unlockAudio\(refreshHangarEngineAudio,event\)/);
 assert.match(game,/soundSwitch\?\.addEventListener\('change'/);
});
test('temporary rentals remain distinct from owned selection',()=>{
 const game=read('game.js'),css=read('style.css');
 assert.match(game,/rental=available&&!active&&!owned/);
 assert.match(css,/#hangar-preview-actions\[hidden\],#hangar-preview-actions>\[hidden\]\{display:none!important\}/);
 assert.match(game,/hullId=id;[\s\S]{0,500}resetHangarFormation\(\)[\s\S]{0,160}scrollIntoView/);
 assert.match(game,/const art=trial\?\.art\?\?\(alternate\?hull.art:/);
});
test('formation remains in the Hangar and is not moved into the Cockpit',()=>{
 const html=read('index.html'),game=read('game.js');
 assert.match(html,/id="hangar-wing-mount">[\s\S]{0,450}id="hangar-formation-button"/);
 assert.doesNotMatch(html,/id="cockpit-wing-mount"/);
 assert.match(game,/const available=repaired&&!hangarTryHull&&!boarding&&!cockpitSession&&!aboardGuestHangar/);
});
