'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),test=require('node:test'),vm=require('node:vm');
const site=['../dist','..'].map(p=>path.join(__dirname,p)).find(p=>fs.existsSync(path.join(p,'carrier-crew.html')));
const read=name=>fs.readFileSync(path.join(site,name),'utf8');
const names=['Crew Berths','Common Room','Galley','Observation Lounge'];
const profileKey='rift-runner.pilot-profile.v1',unlockKey='rift-runner.pilot-profile.unlocked.v1';
const pilot={version:2,callsign:'Nova',avatar:'ellis',salt:'a'.repeat(32),verifier:'b'.repeat(64),iterations:310000};
function open({profile=null,unlocked=false,badStorage=false}={}){
 const node=(overrides={})=>({events:{},focus(){this.focused=true;},addEventListener(n,f){this.events[n]=f;},attrs:{},setAttribute(k,v){this.attrs[k]=v;},getAttribute(k){return this.attrs[k]??null;},removeAttribute(k){delete this.attrs[k];},...overrides});
 const prev=node(),next=node(),label=node({textContent:names[0]}),board=node(),honors=node(),modal=()=>node({open:false,showModal(){this.open=true;}}),ranks=modal(),distinction=modal(),enemies=node(),enemyList=modal(),classes=node(),shipChart=modal();
 const refs={'crew-prev':prev,'crew-next':next,'crew-room-label':label,'crew-pinboard':board,'crew-ranks':ranks,'crew-honors':honors,'crew-distinction':distinction,'crew-enemies':enemies,'crew-enemy-list':enemyList,'crew-classes':classes,'crew-ship-classes':shipChart};
 const slots=['front-left','front','front-right','side-left','line-abreast','echelon-left','trail','echelon-right'];
 const tiles=slots.map(id=>{
  const children={'.tile-occupant':node(),'.tile-position':node({textContent:id}),input:node()};
  return node({dataset:{formationTile:id},querySelector:sel=>children[sel]});
 });
 const centerText=node(),center=node({dataset:{},querySelector:()=>centerText}),mode=node({value:'test'}),movers=node(),placePlayer=node(),placeWingman=node();
 const pick={value:''},squadron=node(),formation=modal(),status=node(),form=node({elements:{namedItem:()=>pick},querySelectorAll:()=>tiles});
 Object.assign(refs,{'crew-squadron':squadron,'crew-formation':formation,'formation-status':status,'formation-form':form,'formation-mode':mode,
  'formation-center':center,'formation-mover':movers,'formation-move-player':placePlayer,'formation-move-wingman':placeWingman});
 const portrait=refs['crew-pilot-portrait']=node({hidden:true});
 const storage=new Map(profile===null?[]:[[profileKey,JSON.stringify(profile)]]),session=new Map(unlocked?[[unlockKey,pilot.salt]]:[]),storageWrites=[];
 const window=node({sessionStorage:{getItem:k=>session.get(k)??null},
  localStorage:{getItem(k){if(badStorage)throw Error('Blocked');return storage.get(k)??null;},
   setItem(k,v){storageWrites.push([k,v]);storage.set(k,v);}}});
 vm.runInNewContext(read('pilot-missions.js'),{window});
 const rooms=names.map((room,i)=>({dataset:{room},hidden:i!==0,contains:node=>i===1&&(node===board||node===classes)||i===0&&node===honors}));
 const document=node({querySelectorAll:()=>rooms,getElementById:id=>refs[id]});
 const liveScript=read('carrier-crew.html').match(/<script>([^]*?)<\/script>/);
 assert.ok(liveScript,'crew room controls are included with the page');
 vm.runInNewContext(liveScript[1],{document,window});
 return {prev,next,label,board,ranks,honors,distinction,enemies,enemyList,classes,shipChart,rooms,document,squadron,formation,status,form,pick,storage,tiles,center,centerText,mode,movers,placePlayer,placeWingman,portrait,session,storageWrites,window,api:window.RiftMissions,
  go:button=>button.events.click(),
  key(key,options={}){const e={key,preventDefault(){this.defaultPrevented=true;},...options};document.events.keydown(e);return !!e.defaultPrevented;},
  get room(){const visible=rooms.filter(r=>!r.hidden);assert.equal(visible.length,1);assert.equal(label.textContent,visible[0].dataset.room);return label.textContent;}
 };
}
test('carrier links to four distinct image-backed rooms and an in-world pinboard',()=>{
 const html=read('carrier-crew.html');
 assert.match(read('carrier.html'),/id="carrier-crew" href="\.\/carrier-crew\.html">Crew Quarters/);
 assert.deepEqual([...html.matchAll(/data-room="([^"]+)"/g)].map(m=>m[1]),names);
 assert.deepEqual([...html.matchAll(/<img src="\.\/(crew-[a-z]+\.webp)\?v=95"/g)].map(m=>m[1]),['crew-berths.webp','crew-common.webp','crew-galley.webp','crew-observation.webp']);
 assert.match(html,/data-room="Common Room"[\s\S]*?id="crew-pinboard"[\s\S]*?<\/section>/);
 assert.match(html,/aria-haspopup="dialog" aria-controls="crew-ranks"/);
 assert.match(html,/<form method="dialog"><button class="control" autofocus>Close/);
});
test('arrows cycle in both directions and keyboard navigation respects focus and modifiers',()=>{
 const q=open();assert.equal(q.room,'Crew Berths');
 q.go(q.prev);assert.equal(q.room,'Observation Lounge');
 q.go(q.next);assert.equal(q.room,'Crew Berths');
 assert.equal(q.key('ArrowRight'),true);assert.equal(q.room,'Common Room');
 q.document.activeElement=q.board;
 assert.equal(q.key('ArrowRight',{altKey:true}),false);assert.equal(q.room,'Common Room');
 assert.equal(q.key('ArrowRight'),true);assert.equal(q.room,'Galley');
 assert.equal(q.next.focused,true);
 q.go(q.next);assert.equal(q.room,'Observation Lounge');
 assert.equal(q.key('ArrowLeft'),true);assert.equal(q.room,'Galley');
 assert.equal(q.key('ArrowLeft'),true);assert.equal(q.room,'Common Room');
});
test('pinboard modal pauses keyboard room changes and restores focus on close',()=>{
 const q=open();q.go(q.next);q.go(q.board);assert.equal(q.ranks.open,true);
 assert.equal(q.key('ArrowRight'),false);assert.equal(q.room,'Common Room');
 q.ranks.open=false;q.ranks.events.close();assert.equal(q.board.focused,true);
});
test('pinboard matches the actual pilot profile ranks at every threshold',()=>{
 const html=read('carrier-crew.html');
 const rows=[...html.matchAll(/<div data-min-kills="(\d+)"><dt>([^<]+)<\/dt><dd>(\d+) kills<\/dd><\/div>/g)].map(m=>[+m[1],m[2],+m[3]]);
 assert.deepEqual(rows,[[0,'Cadet',0],[10,'Wingman',10],[25,'Ace',25],[50,'Flight Lead',50],[75,'Veteran',75],[150,'Vanguard',150],[300,'Rift Legend',300]]);
 const window={};
 vm.runInNewContext(read('pilot-missions.js'),{window});
 const qualifiers=Array.from(window.RiftMissions.qualifications,({kills,rank})=>[kills,rank,kills]);
 assert.deepEqual(qualifiers,rows.slice(1));
});
test('portrait rooms fill the viewport while controls stay overlaid',()=>{
 const html=read('carrier-crew.html'), css=read('carrier-crew.css');
 assert.match(html,/href="\.\/carrier-crew\.css\?v=165"/);
 assert.match(html,/viewport-fit=cover/);
 const rooms=[...html.matchAll(/<section class="room"[\s\S]*?<\/section>/g)];
 assert.equal(rooms.length,4);
 for(const [index,id] of ['berths','common','galley'].entries()){
  assert.match(rooms[index][0],new RegExp('class="room-lower room-lower-'+id+'" aria-hidden="true"'));
  assert.match(rooms[index][0],new RegExp('class="room-upper"[^]*crew-'+id+'\\.webp'));
  assert.match(css,new RegExp('room-lower-'+id+'\\{[^}]*crew-'+id+'-lower\\.webp\\?v=96'));
 }
 assert.match(rooms[3][0],/<source media="\(orientation: portrait\)" srcset="\.\/crew-observation-portrait\.webp\?v=97"/);
 assert.match(rooms[3][0],/<img src="\.\/crew-observation\.webp\?v=95"/);
 assert.ok(fs.existsSync(path.join(site,'crew-observation-portrait.webp')));
 assert.match(css,/\.room-observation-view img\{height:100%;object-fit:cover;[^}]*mask-image:none/);
 assert.match(rooms[1][0],/class="room-upper"[^]*id="crew-pinboard"/);
 assert.match(css,/height:100vh;height:100dvh;overflow:hidden/);
 assert.match(css,/\.room-stage,\.room\{position:absolute;inset:0;overflow:hidden\}/);
 assert.match(css,/\.quarters-header,\.room-nav\{position:absolute;z-index:2;/);
 for (const edge of ['top','right','bottom','left'])assert.ok(css.includes('safe-area-inset-'+edge));
 assert.match(css,/@media\(orientation:portrait\)\{\s*\.room-upper\{inset:0 0 auto;width:100%;transform:none\}/);
 assert.match(css,/mask-image:linear-gradient\(to bottom,#000 90%,transparent\)/);
});

test('the Berths honors plaque opens its own distinction without changing the rank pinboard',()=>{
 const q=open(); assert.equal(q.room,'Crew Berths');
 q.go(q.honors); assert.equal(q.distinction.open,true); assert.equal(q.ranks.open,false);
 assert.equal(q.key('ArrowRight'),false); assert.equal(q.room,'Crew Berths');
 q.distinction.open=false;q.distinction.events.close();assert.equal(q.honors.focused,true);
 const html=read('carrier-crew.html');
 assert.match(html,/<section class="room" data-room="Crew Berths"[^]*?id="crew-honors"[^]*?aria-controls="crew-distinction"[^]*?<\/section>/);
 assert.match(html,/<dialog class="distinction" id="crew-distinction"[^]*?Untouched Legend[^]*?all six waves[^]*?without taking any hull damage/);
});

test('Enemy Ships opens in Observation Lounge, blocks keyboard room changes and returns focus',()=>{
 const html=read('carrier-crew.html');
 assert.match(html,/data-room="Observation Lounge"[^]*id="crew-enemies"[^]*aria-haspopup="dialog" aria-controls="crew-enemy-list"/);
 const q=open();q.go(q.prev);
 assert.equal(q.room,'Observation Lounge');
 q.go(q.enemies);assert.equal(q.enemyList.open,true);
 assert.equal(q.key('ArrowLeft'),false);assert.equal(q.room,'Observation Lounge');
 q.enemyList.open=false;q.enemyList.events.close();assert.equal(q.enemies.focused,true);
});

test('rank board explains Captain qualification without changing the thresholds',()=>{
 assert.match(read('carrier-crew.html'),/At each kill milestone, ask the Captain for your next qualification\./);
});

test('Formation Deck renders two allied ships and the saved player name, and places each wing slot',()=>{
 const html=read('carrier-crew.html'),q=open();
 const room=html.split('data-room="Common Room"')[1].split('</section>')[0];
 assert.match(room,/id="crew-squadron"[^>]+aria-controls="crew-formation"/);
 assert.match(html,/pilot-missions\.js\?v=114/);
 assert.equal([...html.matchAll(/type="radio" name="formation"/g)].length,8);
 assert.equal([...html.matchAll(/class="formation-craft" src="\.\/fighter-winged\.png/g)].length,9);
 q.storage.set('rift-runner.pilot-profile.v1',JSON.stringify({version:2,callsign:'Andy'}));
 const tile=id=>q.tiles.find(t=>t.dataset.formationTile===id);
 q.go(q.next);q.go(q.squadron);
 assert.equal(q.formation.open,true);assert.equal(q.key('ArrowLeft'),false);
 assert.equal(q.centerText.textContent,'AI Lead');
 assert.equal(q.pick.value,'echelon-left');
 assert.equal(tile('echelon-left').querySelector('.tile-occupant').textContent,'Andy');
 assert.equal(tile('echelon-right').querySelector('.tile-occupant').textContent,'AI Wingman');
 q.pick.value='front-left';q.form.events.change();
 assert.equal(tile('front-left').dataset.occupant,'player');
 assert.equal(q.api.getSquadronTestLayout().player,'echelon-left','draft does not save');
 q.go(q.placeWingman);q.pick.value='front-left';q.form.events.change();
 assert.equal(tile('front-left').dataset.occupant,'wingman','occupied tile swaps the two slots');
 assert.equal(tile('echelon-right').dataset.occupant,'player');
 q.form.events.submit({preventDefault(){}});
 assert.equal(q.api.getSquadronTestLayout().wingman,'front-left');
 assert.equal(q.api.getSquadronTestLayout().player,'echelon-right');
 assert.match(q.status.textContent,/Formation saved for Wingman vs Vandul/);
 q.formation.open=false;q.formation.events.close();assert.equal(q.squadron.focused,true);
 q.go(q.squadron);assert.equal(q.pick.value,'echelon-right');
 q.mode.value='qualification';q.mode.events.change();
 assert.equal(q.centerText.textContent,'Andy');assert.equal(q.movers.hidden,true);
 q.pick.value='trail';q.form.events.change();q.form.events.submit({preventDefault(){}});
 assert.equal(q.api.getSquadronFormation(),'trail');
 assert.equal(q.api.getSquadronTestLayout().wingman,'front-left');
 q.pick.value='side-left';q.form.events.change();
 q.form.events.submit({submitter:{formMethod:'dialog'},preventDefault(){assert.fail('close should not save');}});
 assert.equal(q.api.getSquadronFormation(),'trail');
});

test('squadron preferences fall back safely and cannot be saved on a stale pilot',()=>{
 const q=open(),key='rift-runner.character-generation.v1';
 assert.equal(q.api.setSquadronFormation('bad-choice',null),false);
 assert.equal(q.api.setSquadronFormation('line-abreast',null),true);
 assert.equal(q.api.getSquadronFormation(),'line-abreast');
 q.storage.set(key,'new-pilot');
 assert.equal(q.api.getSquadronFormation(),'echelon-right');
 assert.equal(q.api.setSquadronFormation('trail',null),false);
 q.storage.set('rift-runner.squadron-formation.v1','garbage');
 assert.equal(q.api.getSquadronFormation(),'echelon-right');
});

test('three-ship layout rejects duplicate positions and never follows a deleted pilot',()=>{
 const q=open(),key='rift-runner.character-generation.v1';
 assert.equal(q.api.setSquadronTestLayout({player:'trail',wingman:'trail'},null),false);
 assert.equal(q.api.setSquadronTestLayout({player:'front',wingman:'trail'},null),true);
 assert.equal(q.api.getSquadronTestLayout().player,'front');
 q.storage.set(key,'replacement');
 assert.equal(q.api.getSquadronTestLayout().player,'echelon-left');
 assert.equal(q.api.setSquadronTestLayout({player:'front',wingman:'trail'},null),false);
});

test('Common Room Ship Classes opens a six-silhouette relative poster without replacing other boards',()=>{
 const html=read('carrier-crew.html'),css=read('carrier-crew.css'),q=open();
 const common=html.split('data-room="Common Room"')[1].split('</section>')[0];
 assert.match(common,/<button class="control class-board" id="crew-classes" type="button" aria-haspopup="dialog" aria-controls="crew-ship-classes">Ship Classes/);
 assert.match(common,/crew-pinboard/);assert.match(common,/crew-squadron/);
 const dialog=html.match(/<dialog id="crew-ship-classes"[\s\S]+?<\/dialog>/)[0];
 const classes=[...dialog.matchAll(/data-berth="([^"]+)" style="--length:(\d+)%"[\s\S]+?<strong>([^<]+)<\/strong><span>([^<]+)<\/span>/g)];
 assert.deepEqual(classes.map(m=>[m[3],m[1],m[4]]),[
  ['Rift-4 Fighter','internal','Internal hangar'],['Support Craft','internal','Internal hangar'],
  ['Corvette','rear','External rear deck only'],['Frigate','none','Not carrier-stowed'],
  ['Cruiser','none','Not carrier-stowed'],['Carrier','none','Hosts hangar · not stowed']
 ]);
 assert.ok(classes.every((m,i)=>!i||+m[2]>+classes[i-1][2]),'silhouettes grow in display size');
 const paths=[...dialog.matchAll(/<svg [^>]+><path d="([^"]+)"/g)].map(m=>m[1]);
 assert.equal(new Set(paths).size,6);
 assert.match(dialog,/class="poster-rift4-art"/);assert.match(dialog,/class="poster-carrier-art"/);
 assert.match(dialog,/aria-labelledby="crew-ship-classes-title" aria-describedby="crew-ship-classes-note"/);
 assert.deepEqual(classes.map(m=>+m[2]),[5,11,23,43,70,100]);
 assert.match(dialog,/about 20 Rift-4 hull lengths/);assert.match(dialog,/concept classes/);
 assert.match(dialog,/<form method="dialog"><button class="control" type="submit" autofocus>Close/);
 assert.match(css,/\.ship-poster\{width:min\(560px,calc\(100vw - 24px\)\);max-height:min\(90dvh/);
 q.go(q.next);q.go(q.classes);assert.equal(q.shipChart.open,true);assert.equal(q.formation.open,false);
 assert.equal(q.key('ArrowRight'),false);assert.equal(q.room,'Common Room');
 q.shipChart.open=false;q.shipChart.events.close();assert.equal(q.classes.focused,true);
 q.go(q.squadron);assert.equal(q.formation.open,true);
});


test('one unlocked selected avatar stays in the lower-left across all four rooms',()=>{
 const html=read('carrier-crew.html'),css=read('carrier-crew.css');
 assert.equal((html.match(/id="crew-pilot-portrait"/g)||[]).length,1);
 assert.match(html,/<\/section>\s*<\/div>\s*<img class="crew-pilot-portrait"[\s\S]*?<nav class="room-nav"/,'portrait is outside individual rooms');
 assert.match(css,/\.crew-pilot-portrait\{[^}]*safe-area-inset-left[^}]*129px \+ env\(safe-area-inset-bottom[^}]*pointer-events:none/);
 const q=open({profile:pilot,unlocked:true}),badge=q.portrait;
 assert.equal(badge.getAttribute('src'),'./pilot-003-ellis.webp?v=76','avatar selection, not callsign, controls the art');
 assert.equal(badge.alt,'Selected portrait for Pilot Nova');
 assert.equal(badge.hidden,true,'avoid broken or unloaded image');
 badge.events.load();
 for(const name of [...names,names[0]]){
  assert.equal(q.room,name);assert.equal(q.portrait,badge);assert.equal(badge.hidden,false);
  q.go(q.next);
 }
 assert.equal(q.storageWrites.length,0);
});

test('avatar refresh is read-only and locked, missing, unsupported or failed portraits remain hidden',()=>{
 for(const args of [{},{profile:pilot},{profile:pilot,unlocked:true,badStorage:true},
  {profile:{...pilot,avatar:'https://untrusted.invalid'},unlocked:true},{profile:{...pilot,callsign:' Bad'},unlocked:true}]){
  const q=open(args);assert.equal(q.portrait.hidden,true);assert.equal(q.portrait.getAttribute('src'),null);
 }
 const {avatar,...noSelection}=pilot;
 const q=open({profile:{...noSelection,callsign:'Andy'},unlocked:true});
 assert.equal(q.portrait.getAttribute('src'),'./pilot-001-andy.webp?v=75','same narrow legacy fallback as pilot profile');
 q.storage.set(profileKey,JSON.stringify({...pilot,avatar:'nia'}));q.window.events.storage({key:profileKey});
 assert.equal(q.portrait.getAttribute('src'),'./pilot-004-nia.webp?v=76');
 q.portrait.events.load();assert.equal(q.portrait.hidden,false);
 q.portrait.events.error();assert.equal(q.portrait.hidden,true);
 q.session.delete(unlockKey);q.window.events.pageshow();
 assert.equal(q.portrait.getAttribute('src'),null);assert.equal(q.portrait.alt,'');
 assert.deepEqual(q.storageWrites,[]);
});
