'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=['../dist','..'].map(dir=>path.join(__dirname,dir)).find(dir=>fs.existsSync(path.join(dir,'index.html')));
test('Hangar keeps the starter default and shows the two approved shop fighters',()=>{
 const page=fs.readFileSync(path.join(root,'index.html'),'utf8');
 const owned=page.match(/<section id="hangar-ship-choice"[\s\S]*?<\/section>/)[0];
 assert.match(owned,/<input type="hidden" id="hangar-ship" value="rift-fighter">/);
 assert.equal((owned.match(/<button[^>]+ disabled>/g)||[]).length,2);
 assert.match(owned,/<figcaption><strong id="hangar-ship-name">Rift-3 Fighter<\/strong>/);
 const gallery=page.match(/<details class="hangar-fighter-concepts" id="hangar-fighter-concepts">([\s\S]*?)<\/details>/)[1];
 assert.match(gallery,/<summary>Fighter concepts<\/summary>/);
 assert.match(gallery,/Buy either fighter at the Carrier Shop\. Each keeps its own fittings and repair state\./);
 assert.doesNotMatch(gallery,/<(?:a|button|input|select)\b/);
 const files=[...gallery.matchAll(/<img src="\.\/([^"]+)" width="960" height="320"[^>]+loading="lazy"/g)].map(result=>result[1]);
 assert.deepEqual(files,['stocky-light-fighter-concept.webp','bastion-9-fleet-fighter-concept.webp']);
 for(const file of files){
  const art=fs.readFileSync(path.join(root,file));
  assert.equal(art.toString('ascii',8,12),'WEBP');
  assert.ok(art.length<150000,'concept preview is compressed');
 }
});
