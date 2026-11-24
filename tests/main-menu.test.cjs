'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {setup,tick,arrive}=require('./ballistic.test.cjs');
const title=q=>[q.el['main-menu'].hidden,q.el['arena-screen'].hidden,q.el['game-cabinet'].dataset.view];
const base=['../dist','..'].map(f=>path.join(__dirname,f)).find(f=>fs.existsSync(path.join(f,'index.html')));
test('initial menu is a dedicated screen with Deck Map, Hangar and Create Character choices',async()=>{
 const q=setup({legacyArenaHangar:false}),html=fs.readFileSync(path.join(base,'index.html'),'utf8'),style=fs.readFileSync(path.join(base,'style.css'),'utf8');
 assert.deepEqual(title(q),[false,true,'menu']);
 const screen=html.slice(html.indexOf('<section id="main-menu"'),html.indexOf('<div id="arena-screen"'));
 assert.match(screen,/id="main-menu-title"/);assert.match(screen,/id="main-menu-carrier"[^>]*><span>Deck Map/);
 assert.match(screen,/id="main-menu-pilot" href="\.\/pilot-profile\.html"><span>Create Character/);
 assert.match(screen,/id="main-menu-player-status" href="\.\/pilot-profile\.html\?view=status"><span>Player Status/);
 assert.match(screen,/id="main-menu-company-directory" href="\.\/carrier-multicrew\.html"><span>Guild Directory<\/span>/);
 assert.doesNotMatch(screen,/data-rift="(start|practice)"|Practice Alone|Fight Vandul/);assert.match(screen,/data-rift="hangar"[^>]*><span>Hangar/);
 q.menuAction('start');q.menuAction('practice');assert.equal(q.inspect().state,'menu');
 assert.doesNotMatch(screen,/id="(?:hud|game|fire-button)"/);assert.match(html,/<div id="arena-screen" hidden>/);assert.doesNotMatch(html,/id="open-hangar"/);
 assert.match(style,/#main-menu\[hidden\],#arena-screen\[hidden\]\{display:none!important\}/);
 q.step(460);q.reset();q.key('keydown','Space');q.step(120);
 assert.equal(q.inspect().state,'menu');assert.equal(q.inspect().duelCountdown,0);assert.equal(q.inspect().vandul,null);
 assert.equal(q.inspect().practiceShots,0);assert.equal(q.graphs.length,0);
 q.choose('hangar');assert.equal(q.el.hangar.open,true);assert.equal(q.el['close-hangar'].textContent,'Back to menu');
 q.step(225);assert.equal(q.inspect().state,'menu');assert.equal(q.inspect().duelCountdown,0);assert.equal(q.graphs.length,0);
 q.choose('start');assert.equal(q.inspect().state,'menu','modal blocks background choice');
 q.click('close-hangar');assert.deepEqual(title(q),[false,true,'menu']);
});
test('each mode launches deliberately; Main Menu clears the arena/audio without clearing saved fit',async()=>{
 const q=setup({legacyArenaHangar:false});q.choose('hangar');q.fit('engine','test-thruster');q.click('close-hangar');
 q.choose('start');await tick();assert.deepEqual(title(q),[true,false,'arena']);assert.equal(q.inspect().duelCountdown,3);assert.equal(q.graphs.length,1);
 assert.ok(arrive(q));assert.equal(q.inspect().vandul.hp,20);
 q.click('return-main-menu');assert.deepEqual(title(q),[false,true,'menu']);assert.equal(q.inspect().vandul,null);
 assert.equal(q.graphs[0].state,'closed');assert.equal(q.inspect().activeWrecks.length,0);
 assert.equal(q.inspect().fighterLoadout.engine,'test-thruster');q.step(450);assert.equal(q.inspect().duelCountdown,0);
 q.choose('practice');await tick();assert.equal(q.graphs.length,2);
 q.step(450);assert.equal(q.inspect().state,'play');assert.equal(q.inspect().vandul,null);
 assert.equal(Math.round(q.inspect().p.speed),117);
 assert.equal(q.el['open-hangar'],undefined);
 q.choose('hangar');assert.equal(q.el.hangar.open,false,'even a synthetic Menu→Hangar action may not open in battle');
 assert.equal(q.inspect().state,'play');
 q.key('keydown','KeyP');assert.match(q.el.overlay.innerHTML,/data-rift="main-menu"[^>]*>Main Menu/);
 q.choose('main-menu');assert.deepEqual(title(q),[false,true,'menu']);
 assert.equal(q.graphs[1].state,'closed');
});
test('loss offers Main Menu and permits one clean duel restart without ghost opponents',async()=>{
 const q=setup();q.choose('start');await tick();const old=arrive(q);assert.ok(old);
 Object.assign(q.inspect().p,{x:930,y:600,vx:255,vy:0,hp:1});q.step(2);
 assert.equal(q.inspect().state,'disabled');assert.match(q.el.overlay.innerHTML,/data-rift="main-menu"[^>]*>Main Menu/);
 q.choose('main-menu');assert.equal(q.inspect().duelKills,0);assert.equal(q.inspect().vandul,null);
 q.choose('start');await tick();assert.equal(q.inspect().p.hp,20);assert.notEqual(arrive(q),old);
 assert.equal(q.inspect().duelKills,0);
});
test('returning to menu retires an in-flight audio unlock and late completion cannot start the arena',async()=>{
 const q=setup({resumePending:true});q.choose('start');assert.equal(q.resumes.length,1);
 q.click('return-main-menu');const old=q.graphs[0];assert.equal(old.state,'closed');
 q.resumes[0]();await tick();q.step(400);
 assert.equal(q.inspect().state,'menu');assert.equal(q.inspect().vandul,null);assert.equal(q.inspect().duelCountdown,0);
 assert.equal(q.graphs.length,1);assert.equal(q.played.length,0);
});
test('arena gun buttons use art and retain accessible selection and burst feedback',async()=>{
 const html=fs.readFileSync(path.join(base,'index.html'),'utf8');
 const rack=html.match(/<div class="weapon-rack"[^>]*>([\s\S]*?)<\/div>/)[1];
 for(const [id,asset,name] of [['blaster','sterling','Sterling'],['ballistic','alkine','A-Alkine'],['ak77','ak77','AK77']]){
  const entry=rack.match(new RegExp('<button id="gun-'+id+'"([^>]*)>([^<]*<img[^>]+>)</button>'));
  assert.ok(entry,id+' battle button contains only an image');
  assert.ok(entry[1].includes('aria-label="'+name));assert.ok(entry[2].includes('/'+asset+'-module.webp'));
 }
 const q=setup();q.choose('practice');await tick();
 const button=q.el['gun-blaster'];button.textContent='art fixture';
 q.click('gun-blaster',{detail:1});q.step(6);q.click('gun-blaster',{detail:1});
 assert.equal(button.textContent,'art fixture','gun UI refresh does not erase its image');
 assert.match(button.attrs['aria-label'],/Sterling.*Burst/);
 assert.equal(button.dataset.burst,'true');
});
