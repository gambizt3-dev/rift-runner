import assert from 'node:assert/strict';
import fs from 'node:fs';
import {test} from 'node:test';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
const page=read('ship-catalogue.html'),shop=read('carrier-shop.html');
test('lists only the approved 6 corvettes, 5 frigates and 3 cruisers',()=>{
 for(const [name,count] of [['corvettes',6],['frigates',5],['cruisers',3]]){
  const section=page.match(new RegExp('<section id="'+name+'".*?</section>','s'))[0];
  assert.equal([...section.matchAll(/aria-haspopup="dialog"/g)].length,count);
 }
 assert.match(page,/Breakwater.*Twin hull/);
 assert.doesNotMatch(page,/data-shop-buy|data-shop-test|launch=|<section id="vessels"/);
});
test('art assets exist, thumbnails are within sheet, and dialogue script parses',()=>{
 for(const m of page.matchAll(/viewBox="(\d+) (\d+) (\d+) (\d+)"><image href="\.\/([^"]+)"/g)){
  assert.ok(Number(m[1])+Number(m[3])<=1536 && Number(m[2])+Number(m[4])<=1024);
  assert.ok(fs.existsSync(new URL('../'+m[5],import.meta.url)));
 }
 assert.equal([...page.matchAll(/viewBox=/g)].length,14);
 assert.match(shop,/href="\.\/ship-catalogue.html"/);
 const script=page.match(/<script>([\s\S]*?)<\/script>/)[1];
 assert.doesNotThrow(()=>new Function(script));
});
