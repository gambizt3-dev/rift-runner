'use strict';
const fs=require('node:fs'),path=require('node:path'),test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm');
const read=filename=>fs.readFileSync(path.join(__dirname,'../dist',filename),'utf8');
test('Corvette fitting stays isolated and has up to four Size 4 turrets with exactly two visual prongs',()=>{
 const context={window:{},document:{getElementById:()=>null}};
 vm.runInNewContext(read('corvette-modules.js'),context);
 const {modules,mounts,create}=context.window.RiftCorvette;
 assert.equal(modules.turret.size,4);
 assert.equal(modules.turret.barrels,2);assert.equal(modules.turret.ammo,'ballistic');assert.equal(modules.turret.damagePerRound,6);
 assert.deepEqual(read('corvette-twin-s4.svg').match(/data-prong="[^"]+"/g),['data-prong="port"','data-prong="starboard"']);
 assert.equal(new Set(mounts.map(mount=>mount.id)).size,4);
 assert.ok(mounts.every(mount=>mount.size===4&&mount.kind==='turret'));
 const setup=create();
 assert.equal(setup.fitted().length,4);
 assert.equal(setup.fit('port-forward',modules.turret.id),false,'no duplicate module in one socket');
 assert.equal(setup.remove('port-forward'),true);
 assert.equal(setup.fit('fighter-primary',modules.turret.id),false);
 assert.equal(setup.fit('starboard-forward','sparrow-s2'),false);
 assert.equal(setup.fit('port-forward',modules.turret.id),true);
 setup.remove('port-aft');assert.equal(create().fitted().length,4,'preview changes are not saved');
 for(const module of Object.values(modules))assert.ok(!read('pilot-credits.js').includes(module.id)&&!read('carrier-shop.html').includes(module.id));
});
test('Crew opens a dedicated preview with mobile tap targets and scoped back link',()=>{
 const html=read('corvette-loadout.html'), mounts=[...html.matchAll(/data-mount="([^"]+)"/g)].map(([,id])=>id);
 const node=()=>({attrs:{},classes:new Set(),style:{setProperty(key,val){this[key]=val;}},
  setAttribute(key,val){this.attrs[key]=val;},addEventListener(event,cb){this[event]=cb;}});
 const cards=mounts.map(id=>{
  const controls=Object.fromEntries(['[data-mount]','[data-fire]','input','output','[data-sight]','[data-volley]'].map(sel=>[sel,node()]));
  const volley=controls['[data-volley]'];volley.classList={add:c=>volley.classes.add(c),remove:c=>volley.classes.delete(c)};
  return {dataset:{bench:id},querySelector:sel=>controls[sel]};
 });
 const overlays=mounts.map(id=>Object.assign(node(),{dataset:{topMount:id}}));
 const nodes={'corvette-mounts':{querySelectorAll:()=>cards},'corvette-fit-status':{},'corvette-back':{}};
 vm.runInNewContext(read('corvette-modules.js'),{document:{getElementById:id=>nodes[id],querySelectorAll:()=>overlays},window:{performance:{now:()=>1000},location:{search:'?vessel=bifrost'}},URLSearchParams});
 assert.deepEqual(overlays.map(o=>o.hidden),[false,false,false,false]);
 assert.equal(nodes['corvette-fit-status'].textContent,'4 of 4 mounts fitted');
 cards.forEach((card,i)=>card.querySelector('input').input({target:{value:i*30-45}}));
 for(const card of cards)card.querySelector('[data-fire]').click();
 const effects=cards.map(card=>card.querySelector('[data-volley]'));
 assert.equal(effects.reduce((total,fx)=>total+Number(fx.attrs['data-projectiles']),0),8);
 assert.equal(effects.map(fx=>fx.style['--corvette-shot-aim']).join(','),'-45deg,-15deg,15deg,45deg');
 assert.deepEqual(overlays.map(o=>o.hidden),[false,false,false,false]);
 assert.equal(overlays.map(o=>o.style['--corvette-aim']).join(','),'-45deg,-15deg,15deg,45deg');
 assert.ok(cards.every(card=>card.querySelector('[data-fire]').attrs['aria-disabled']==='true'));
 cards[1].querySelector('[data-mount]').click();
 assert.deepEqual(overlays.map(o=>o.hidden),[false,true,false,false]);
 assert.equal(nodes['corvette-back'].href,'./carrier-crew.html?vessel=bifrost#crew-classes');
 assert.match(read('carrier-crew.html'),/href="\.\/corvette-loadout\.html" id="crew-corvette-loadout"/);
 assert.match(read('corvette-loadout.css'),/min-height:44px/);
 assert.match(html,/<h1>Resolute<\/h1><p>Corvette · Keel-4 hull · Captain Imani Rook<\/p>/);
 assert.match(html,/Nothing is bought, saved, or launched/);
});

test('a firing socket neither locks out nor resets another, including detach and refit',()=>{
 const context={window:{},document:{getElementById:()=>null}};
 vm.runInNewContext(read('corvette-modules.js'),context);
 const {modules,create}=context.window.RiftCorvette,bench=create();
 bench.fit('port-aft',modules.turret.id);
 assert.equal(bench.fire('port-forward',100).length,2);
 assert.equal(bench.fire('port-forward',400).length,0);
 assert.equal(bench.fire('port-aft',400).length,2);
 bench.remove('port-aft');bench.fit('port-aft',modules.turret.id);
 assert.equal(bench.fire('port-forward',950).length,2);
 assert.equal(bench.fire('port-aft',950).length,0);
 assert.equal(bench.fire('port-aft',1250).length,2);
});

test('Resolute loadout makes the approved top-down crop larger through a native tap expander',()=>{
 const html=read('corvette-loadout.html'),css=read('corvette-loadout.css');
 assert.match(html,/<details class="corvette-top-view">\s*<summary>[\s\S]*?Keel-4 · Top view[\s\S]*?src="\.\/corvette-rift4-scale-v6\.webp"[\s\S]*?<\/summary>/);
 assert.doesNotMatch(html,/corvette-class-concept/);
 assert.match(html,/corvette-loadout.css\?v=4/);
 assert.match(css,/aspect-ratio:196 \/ 475/);
 assert.match(css,/corvette-top-view\[open\] \.corvette-top-crop\{width:min\(100%,232px\)/);
 assert.equal((html.match(/data-fire/g)||[]).length,4);
 assert.equal((html.match(/data-top-mount="[^"]+" src="\.\/corvette-twin-s4\.svg"/g)||[]).length,4);
 assert.match(css,/port-forward"\]\{--socket-x:19\.898%;--socket-y:33\.474%/);
});
