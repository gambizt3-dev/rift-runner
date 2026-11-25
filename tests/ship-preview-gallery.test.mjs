import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
import '../ship-preview-gallery.js';
const {byClass,get,createArt,mount}=globalThis.RiftShipPreviewGallery;
class Node{
 constructor(tag){this.tag=tag;this.a={};this.children=[];this.dataset={}}
 setAttribute(k,v){this.a[k]=String(v)}
 append(...nodes){this.children.push(...nodes)}
}
test('gallery offers exactly five vessels, ten corvettes, five frigates and three cruisers',()=>{
 assert.deepEqual(Object.values(byClass).map(items=>items.length),[5,10,5,3]);
 assert.equal(new Set(Object.values(byClass).flat().map(x=>x[0])).size,23);
 assert.equal(get('__proto__:0'),null);
 assert.equal(get('cruisers:3'),null);
});
test('each selectable card has one accessible top-down image and no gameplay control',()=>{
 const lists=Object.fromEntries(Object.keys(byClass).map(k=>[k,new Node('ul')]));
 const d={createElement:tag=>new Node(tag),createElementNS:(_,tag)=>new Node(tag),querySelector:s=>lists[s.split(' ')[0].replace('#shop-catalog-','')]};
 mount(d);
 for(const [klass,list] of Object.entries(lists)){
  assert.equal(list.children.length,byClass[klass].length);
  for(const [i,card] of list.children.entries()){
   const [button]=card.children,[svg]=button.children,[art]=svg.children;
   assert.equal(button.type,'button');
   assert.equal(button.dataset.shipLook,klass+':'+i);
   assert.equal(button.dataset.shopBuy,undefined);
   assert.equal(button.dataset.shopTest,undefined);
   assert.equal(button.a['aria-haspopup'],'dialog');
   assert.equal(svg.a['aria-label'],'Top-down view of '+byClass[klass][i][0]);
   assert.ok(existsSync(new URL('../'+art.a.href,import.meta.url)),art.a.href);
   const [x,y,w,h]=svg.a.viewBox.split(' ').map(Number);
   assert.ok(x>=0&&y>=0&&x+w<=1536&&y+h<=1024);
  }
 }
 assert.equal(createArt(d,get('cruisers:2')).a.viewBox,'1024 0 512 1024');
});
test('shop mounts artwork before the page wires picture dialogs and existing vessel trials remain untouched',()=>{
 const html=readFileSync(new URL('../carrier-shop.html',import.meta.url),'utf8');
 const js=readFileSync(new URL('../carrier-shop-talk.js',import.meta.url),'utf8');
 assert.ok(html.indexOf('ship-preview-gallery.js')<html.indexOf('carrier-shop-talk.js'));
 for(const key of Object.keys(byClass))assert.match(html,new RegExp('data-topic="'+key+'"'));
 assert.match(html,/data-civ-trial/);assert.match(js,/previewSpec.hidden=true/);
});
