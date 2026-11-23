'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),test=require('node:test'),vm=require('node:vm');
const site=['../dist','..'].map(p=>path.join(__dirname,p)).find(p=>fs.existsSync(path.join(p,'carrier-crew.html')));
const read=name=>fs.readFileSync(path.join(site,name),'utf8');
const names=['Crew Berths','Common Room','Galley','Observation Lounge','Refuelling Bay'];
const profileKey='rift-runner.pilot-profile.v1',unlockKey='rift-runner.pilot-profile.unlocked.v1';
const pilot={version:2,callsign:'Nova',avatar:'ellis',salt:'a'.repeat(32),verifier:'b'.repeat(64),iterations:310000};
function open({profile=null,unlocked=false,badStorage=false,rendezvous=null}={}){
 const node=(overrides={})=>({events:{},focus(){this.focused=true;},addEventListener(n,f){const current=this.events[n];this.events[n]=current?(...p)=>{current(...p);f(...p);}:f;},attrs:{},setAttribute(k,v){this.attrs[k]=v;},getAttribute(k){return this.attrs[k]??null;},removeAttribute(k){delete this.attrs[k];},...overrides});
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
 const resting=refs['crew-resting-pilot']=node({hidden:true}),restingArt=refs['crew-resting-art']=node();
 const restingName=refs['crew-resting-name']=node(),restingNote=refs['crew-resting-note']=node();
 const closeChat=node(),chat=refs['crew-pilot-chat']=node({open:false,showModal(){this.open=true;},querySelector:()=>closeChat});
 const chatTitle=refs['crew-chat-title']=node(),chatLine=refs['crew-chat-line']=node(),chatProgress=refs['crew-chat-progress']=node(),checkIn=refs['crew-chat-check-in']=node({hidden:true});
 const roster=refs['crew-wing-roster']=node({hidden:true}),rosterYou=refs['crew-wing-roster-you']=node();
 const readyWing=refs['crew-launch-wing']=node({hidden:true}),readyWingArt=refs['crew-launch-wing-art']=node({hidden:false});
 const storage=new Map(profile===null?[]:[[profileKey,JSON.stringify(profile)]]),session=new Map(unlocked?[[unlockKey,pilot.salt]]:[]),storageWrites=[];
 const window=node({RiftRendezvous:rendezvous,sessionStorage:{getItem:k=>session.get(k)??null},
  localStorage:{getItem(k){if(badStorage)throw Error('Blocked');return storage.get(k)??null;},
   setItem(k,v){storageWrites.push([k,v]);storage.set(k,v);}}});
 vm.runInNewContext(read('pilot-missions.js'),{window});
 const rooms=names.map((room,i)=>({dataset:{room},hidden:i!==0,contains:node=>i===1&&(node===board||node===classes)||i===0&&node===honors}));
 const document=node({querySelectorAll:()=>rooms,getElementById:id=>refs[id]});
 const liveScript=read('carrier-crew.html').match(/<script>([^]*?)<\/script>/);
 assert.ok(liveScript,'crew room controls are included with the page');
 vm.runInNewContext(liveScript[1],{document,window});
 document.events.DOMContentLoaded?.();
 return {readyWing,readyWingArt,roster,rosterYou,resting,restingArt,restingName,restingNote,closeChat,chat,chatTitle,chatLine,chatProgress,checkIn,prev,next,label,board,ranks,honors,distinction,enemies,enemyList,classes,shipChart,rooms,document,squadron,formation,status,form,pick,storage,tiles,center,centerText,mode,movers,placePlayer,placeWingman,portrait,session,storageWrites,window,api:window.RiftMissions,
  go:button=>button.events.click(),
  key(key,options={}){const e={key,preventDefault(){this.defaultPrevented=true;},...options};document.events.keydown(e);return !!e.defaultPrevented;},
  get room(){const visible=rooms.filter(r=>!r.hidden);assert.equal(visible.length,1);assert.equal(label.textContent,visible[0].dataset.room);return label.textContent;}
 };
}
test('carrier links to five distinct image-backed rooms and an in-world pinboard',()=>{
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
 q.go(q.prev);assert.equal(q.room,'Refuelling Bay');
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
 assert.match(html,/href="\.\/carrier-crew\.css\?v=211"/);
 assert.match(html,/viewport-fit=cover/);
 const rooms=[...html.matchAll(/<section class="room"[\s\S]*?<\/section>/g)];
 assert.equal(rooms.length,5);
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

test('Pegasus refuelling bay is a fifth full-bleed illustration, not a duplicate personal hangar',()=>{
 const html=read('carrier-crew.html'),css=read('carrier-crew.css'),q=open();
 const bay=html.match(/<section class="room" data-room="Refuelling Bay"[^]*?<\/section>/)[0];
 assert.match(bay,/crew-refuelling-bay\.webp\?v=183/);
 assert.match(bay,/Pegasus hangar.*Rift-4 fighters.*refuelling carts.*overhead launch hatch/);
 assert.ok(fs.existsSync(path.join(site,'crew-refuelling-bay.webp')));
 assert.doesNotMatch(bay,/<(?:button|form|a)\b/);
 assert.match(css,/\.room-refuelling-art\{[^}]*object-fit:cover/);
 assert.match(css,/@media\(min-aspect-ratio:3\/4\)[^]*?\.room-refuelling-art\{object-fit:contain/);
 q.go(q.prev);assert.equal(q.room,'Refuelling Bay');
 q.go(q.prev);assert.equal(q.room,'Observation Lounge');
 q.go(q.next);assert.equal(q.room,'Refuelling Bay');
 q.go(q.next);assert.equal(q.room,'Crew Berths');
});

test('Leena faces the pinboard at rest, turns on tap and returns focus when the chat closes',()=>{
 const html=read('carrier-crew.html'),css=read('carrier-crew.css'),q=open();
 assert.match(html,/wing-rendezvous\.js\?v=185/);
 assert.match(html,/id="crew-resting-pilot"[^>]*aria-controls="crew-pilot-chat"/);
 assert.match(html,/id="crew-chat-check-in"[^>]*>Saddle up<\/button>/);
 assert.match(css,/crew-resting-tag\{[^}]*min-height:44px/);
 assert.equal(q.resting.hidden,true);
 q.go(q.next);
 assert.equal(q.resting.hidden,false);assert.equal(q.restingName.textContent,'Leena');
 assert.equal(q.restingArt.getAttribute('src'),'./crew-pilot-aya-back.webp?v=185');
 assert.equal(q.resting.getAttribute('data-pilot'),'aya');
 q.restingArt.events.error();assert.equal(q.restingArt.hidden,true);assert.equal(q.resting.hidden,false);
 q.go(q.resting);assert.equal(q.chat.open,true);assert.equal(q.chatTitle.textContent,'Leena');
 assert.equal(q.restingArt.getAttribute('src'),'./crew-pilot-aya-resting.webp?v=185');
 assert.equal(q.chat.getAttribute('data-stage'),'pinboard');
 assert.equal(q.checkIn.hidden,true);assert.equal(q.key('ArrowLeft'),false);
 q.chat.open=false;q.chat.events.close();assert.equal(q.resting.focused,true);
 assert.equal(q.restingArt.getAttribute('src'),'./crew-pilot-aya-back.webp?v=185');
 q.go(q.next);q.go(q.next);
 assert.equal(q.restingName.textContent,'Tomas');assert.equal(q.restingArt.hidden,false);
 assert.equal(q.resting.getAttribute('data-room-slot'),'observation');
 assert.equal(q.restingArt.getAttribute('src'),'./crew-pilot-ellis-resting.webp?v=185');
 assert.match(css,/data-pilot=ellis[^}]*data-room-slot=observation[^}]*img\{[^}]*clip-path:polygon/);
 q.go(q.next);assert.equal(q.resting.hidden,true);
});

test('the saved room assignment and generation gate check-ins without disturbing room navigation',()=>{
 let state={acceptedAt:40,rooms:{aya:'common',ellis:'berths'},met:{aya:false,ellis:false},completedAt:null};
 const calls=[];
 const q=open({profile:pilot,rendezvous:{get:()=>state,generation:()=> 'flight-1',
  meet(id,room,generation,at){
   calls.push([id,room,generation,at]);const met={...state.met,[id]:true};
   return state={...state,met,completedAt:met.aya&&met.ellis?70:null};
  }
 }});
 assert.equal(q.restingName.textContent,'Tomas');assert.equal(q.restingNote.textContent,'Rendezvous');assert.equal(q.roster.hidden,true);
 q.go(q.resting);assert.equal(q.checkIn.hidden,false);assert.equal(q.chatProgress.textContent,'0 of 2 pilots checked in.');
 q.go(q.checkIn);assert.deepEqual(calls,[['ellis','berths','flight-1',40]]);
 assert.equal(q.restingNote.textContent,'Checked in');assert.equal(q.checkIn.hidden,true);
 assert.equal(q.chatProgress.textContent,'1 of 2 pilots checked in.');assert.equal(q.closeChat.focused,true);
 q.chat.open=false;q.chat.events.close();q.go(q.next);assert.equal(q.restingName.textContent,'Leena');q.go(q.resting);q.go(q.checkIn);
 assert.deepEqual(calls[1],['aya','common','flight-1',40]);assert.match(q.chatProgress.textContent,/Wing formed/);assert.equal(q.checkIn.hidden,true);
 assert.equal(q.roster.hidden,false);assert.equal(q.rosterYou.textContent,'Nova');
 assert.match(q.chatProgress.textContent,/Head to the Refuelling Bay/);
 assert.equal(q.resting.hidden,true);assert.equal(q.readyWing.hidden,true);
 assert.equal(q.readyWingArt.getAttribute('src'),null,'group art waits until the player enters the bay');
 q.chat.open=false;q.chat.events.close();assert.equal(q.next.focused,true);
 q.go(q.prev);assert.equal(q.room,'Crew Berths');assert.equal(q.resting.hidden,true);
 q.go(q.prev);assert.equal(q.room,'Refuelling Bay');assert.equal(q.readyWing.hidden,false);
 assert.equal(q.readyWingArt.getAttribute('src'),'./crew-wing-ready.webp?v=187');
 q.go(q.prev);assert.equal(q.room,'Observation Lounge');assert.equal(q.readyWing.hidden,true);assert.equal(q.resting.hidden,true);
 q.go(q.next);assert.equal(q.readyWing.hidden,false);
 state=null;q.window.events.pageshow();
 assert.equal(q.readyWing.hidden,true,'group does not follow a deleted or replaced save');
 assert.equal(q.roster.hidden,true);
});

test('the suited-up wing is a nonblocking scene element and does not launch or modify the squadron',()=>{
 const html=read('carrier-crew.html'),css=read('carrier-crew.css'),q=open();
 const element=html.match(/<figure id="crew-launch-wing"[^]*?<\/figure>/)[0];
 assert.match(element,/Leena &amp; Tomas <span>Ready to launch<\/span>/);
 assert.doesNotMatch(element,/<(?:a|button|form)\b/);
 assert.match(css,/\.crew-launch-wing\{[^}]*pointer-events:none/);
 assert.match(css,/@media\(orientation:portrait\)\{\s*\.crew-launch-wing\{[^}]*width:min\(65vw,310px\)[^}]*\}\s*\.crew-launch-wing img\{height:clamp\(105px,41dvh,360px\)\}/);
 q.go(q.prev);assert.equal(q.room,'Refuelling Bay');assert.equal(q.readyWing.hidden,true);
 assert.equal(q.readyWingArt.getAttribute('src'),null);
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
 const q=open();q.go(q.prev);q.go(q.prev);
 assert.equal(q.room,'Observation Lounge');
 q.go(q.enemies);assert.equal(q.enemyList.open,true);
 assert.equal(q.key('ArrowLeft'),false);assert.equal(q.room,'Observation Lounge');
 q.enemyList.open=false;q.enemyList.events.close();assert.equal(q.enemies.focused,true);
});

test('rank board explains Captain qualification without changing the thresholds',()=>{
 assert.match(read('carrier-crew.html'),/At each kill milestone, ask Admiral Bishop for your next qualification\./);
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
  ['Rift-4 Fighter','internal','Internal hangar'],['Ship','internal','Internal hangar'],
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
 assert.match(dialog,/<figure class="poster-corvette">\s*<img src="\.\/corvette-class-concept\.webp"[^>]*>\s*<figcaption>Corvette concept · Not playable<\/figcaption>/);
 assert.ok(fs.existsSync(path.join(site,'corvette-class-concept.webp')));
 assert.match(dialog,/<details class="poster-corvette-scale">\s*<summary>Compare Corvette and Rift-4<\/summary>[\s\S]+?src="\.\/corvette-rift4-scale-v2\.webp"[\s\S]+?4\.6 Rift-4 hull lengths long\.<\/figcaption>/);
 assert.ok(fs.existsSync(path.join(site,'corvette-rift4-scale-v2.webp')));
 assert.match(dialog,/<form method="dialog"><button class="control" type="submit" autofocus>Close/);
 assert.match(css,/\.ship-poster\{width:min\(560px,calc\(100vw - 24px\)\);max-height:min\(90dvh/);
 q.go(q.next);q.go(q.classes);assert.equal(q.shipChart.open,true);assert.equal(q.formation.open,false);
 assert.equal(q.key('ArrowRight'),false);assert.equal(q.room,'Common Room');
 q.shipChart.open=false;q.shipChart.events.close();assert.equal(q.classes.focused,true);
 q.go(q.squadron);assert.equal(q.formation.open,true);
});


test('one selected avatar without an unlock stays in the lower-left across all five rooms',()=>{
 const html=read('carrier-crew.html'),css=read('carrier-crew.css');
 assert.equal((html.match(/id="crew-pilot-portrait"/g)||[]).length,1);
 assert.match(html,/<\/section>\s*<\/div>\s*<img class="crew-pilot-portrait"[\s\S]*?<nav class="room-nav"/,'portrait is outside individual rooms');
 assert.match(css,/\.crew-pilot-portrait\{[^}]*safe-area-inset-left[^}]*129px \+ env\(safe-area-inset-bottom[^}]*pointer-events:none/);
 const q=open({profile:pilot}),badge=q.portrait;
 assert.equal(badge.getAttribute('src'),'./pilot-003-ellis.webp?v=76','avatar selection, not callsign, controls the art');
 assert.equal(badge.alt,'Your pilot portrait');
 assert.equal(badge.hidden,true,'avoid broken or unloaded image');
 badge.events.load();
 for(const name of [...names,names[0]]){
  assert.equal(q.room,name);assert.equal(q.portrait,badge);assert.equal(badge.hidden,false);
  q.go(q.next);
 }
 assert.equal(q.storageWrites.length,0);
});

test('avatar refresh is read-only and missing, unsupported or failed portraits remain hidden',()=>{
 for(const args of [{},{profile:pilot,unlocked:true,badStorage:true},
  {profile:{...pilot,avatar:'https://untrusted.invalid'},unlocked:true},{profile:{...pilot,callsign:' Bad'},unlocked:true}]){
  const q=open(args);assert.equal(q.portrait.hidden,true);assert.equal(q.portrait.getAttribute('src'),null);
 }
 const {avatar,...noSelection}=pilot;
 const q=open({profile:{...noSelection,callsign:'Andy'},unlocked:true});
 assert.equal(q.portrait.getAttribute('src'),'./pilot-001-andy-standing.webp?v=181','use Andy’s standing art for a legacy Andy profile');
 assert.equal(q.portrait.getAttribute('data-presentation'),'standing');
 q.storage.set(profileKey,JSON.stringify({...pilot,avatar:'nia'}));q.window.events.storage({key:profileKey});
 assert.equal(q.portrait.getAttribute('src'),'./pilot-004-nia.webp?v=76');
 assert.equal(q.portrait.getAttribute('data-presentation'),null);
 q.portrait.events.load();assert.equal(q.portrait.hidden,false);
 q.portrait.events.error();assert.equal(q.portrait.hidden,true);
 q.session.delete(unlockKey);q.window.events.pageshow();
 assert.equal(q.portrait.getAttribute('src'),'./pilot-004-nia.webp?v=76');
 q.portrait.complete=true;q.portrait.naturalWidth=72;q.window.events.pageshow();
 assert.equal(q.portrait.hidden,false,'a loaded portrait survives relaunch with no unlocked session');
 q.storage.delete(profileKey);q.window.events.storage({key:profileKey});
 assert.equal(q.portrait.hidden,true);
 assert.equal(q.portrait.getAttribute('src'),null);assert.equal(q.portrait.alt,'');
 assert.deepEqual(q.storageWrites,[]);
});

test('Andy is a substantially taller transparent character on every crew page, with badge fallback',()=>{
 const css=read('carrier-crew.css'),q=open({profile:{...pilot,callsign:'Andy',avatar:'andy'}}),sprite=q.portrait;
 const art=fs.readFileSync(path.join(site,'pilot-001-andy-standing.webp'));
 assert.equal(art.toString('ascii',8,12),'WEBP');
 assert.equal(art.toString('ascii',12,16),'VP8X');
 assert.ok(art[20]&0x10,'WebP advertises alpha transparency');
 assert.match(css,/\[data-presentation=standing\]\{[^}]*52dvh[^}]*background:transparent/);
 sprite.events.load();
 for(const name of names){assert.equal(q.room,name);assert.equal(sprite.hidden,false);assert.equal(sprite.getAttribute('data-presentation'),'standing');q.go(q.next);}
 sprite.events.error();
 assert.equal(sprite.getAttribute('src'),'./pilot-001-andy.webp?v=75');
 assert.equal(sprite.getAttribute('data-presentation'),null);
 sprite.events.load();assert.equal(sprite.hidden,false);
});

test('Crew Berths has a text-only, unlinked 20-slot mission order',()=>{
 const html=read('carrier-crew.html');
 const room=html.match(/<section class="room" data-room="Crew Berths"[\s\S]*?<\/section>/)[0];
 assert.match(room,/id="crew-mission-board"[^>]+aria-controls="crew-mission-notice"/);
 const poster=html.match(/<dialog class="mission-notice"[\s\S]*?<\/dialog>/)[0];
 const entries=[...poster.matchAll(/<li[^>]*>([^<]+)<\/li>/g)].map(m=>m[1]);
 assert.equal(entries.length,20);
 assert.deepEqual(entries.slice(0,4),['Outfit the Rift-4','Launch and Dock','Formation: Wing Rendezvous','Vandul Intercept']);
 assert.ok(entries.slice(4).every(name=>name==='Unassigned'));
 assert.doesNotMatch(poster,/<(?:a|img|svg)\b/);
 assert.match(html,/\[get\('crew-mission-board'\),get\('crew-mission-notice'\)\]/);
});
