'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),test=require('node:test'),vm=require('node:vm');
const site=['../dist','..'].map(p=>path.join(__dirname,p)).find(p=>fs.existsSync(path.join(p,'carrier-crew.html')));
const read=name=>fs.readFileSync(path.join(site,name),'utf8');
const names=['Crew Berths','Common Room','Galley','Observation Lounge'];
function open(){
 const node=(overrides={})=>({events:{},focus(){this.focused=true;},addEventListener(n,f){this.events[n]=f;},...overrides});
 const prev=node(),next=node(),label=node({textContent:names[0]}),board=node(),honors=node(),modal=()=>node({open:false,showModal(){this.open=true;}}),ranks=modal(),distinction=modal(),enemies=node(),enemyList=modal();
 const refs={'crew-prev':prev,'crew-next':next,'crew-room-label':label,'crew-pinboard':board,'crew-ranks':ranks,'crew-honors':honors,'crew-distinction':distinction,'crew-enemies':enemies,'crew-enemy-list':enemyList};
 const rooms=names.map((room,i)=>({dataset:{room},hidden:i!==0,contains:node=>i===1&&node===board||i===0&&node===honors}));
 const document=node({querySelectorAll:()=>rooms,getElementById:id=>refs[id]});
 const liveScript=read('carrier-crew.html').match(/<script>([^]*?)<\/script>/);
 assert.ok(liveScript,'crew room controls are included with the page');
 vm.runInNewContext(liveScript[1],{document});
 return {prev,next,label,board,ranks,honors,distinction,enemies,enemyList,rooms,document,
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
 const resolver=read('pilot-profile.js').match(/const rankFor=([^;]+);/);
 assert.ok(resolver,'pilot profile rank resolver is available for parity check');
 const rankFor=vm.runInNewContext(resolver[1]);
 for(let kills=0;kills<=350;kills++){
  const expected=[...rows].reverse().find(([minimum])=>kills>=minimum)[1];
  assert.equal(rankFor(kills),expected,'confirmed kills: '+kills);
 }
});
test('portrait rooms fill the viewport while controls stay overlaid',()=>{
 const html=read('carrier-crew.html'), css=read('carrier-crew.css');
 assert.match(html,/href="\.\/carrier-crew\.css\?v=102"/);
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
