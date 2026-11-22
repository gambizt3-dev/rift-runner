'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),test=require('node:test'),vm=require('node:vm');
const site=['../dist','..'].map(p=>path.join(__dirname,p)).find(p=>fs.existsSync(path.join(p,'carrier-crew.html')));
const read=name=>fs.readFileSync(path.join(site,name),'utf8');
const names=['Crew Berths','Common Room','Galley','Observation Lounge'];
function open(){
 const node=(overrides={})=>({events:{},focus(){this.focused=true;},addEventListener(n,f){this.events[n]=f;},...overrides});
 const prev=node(),next=node(),label=node({textContent:names[0]}),board=node(),ranks=node({open:false,showModal(){this.open=true;}});
 const refs={'crew-prev':prev,'crew-next':next,'crew-room-label':label,'crew-pinboard':board,'crew-ranks':ranks};
 const rooms=names.map((room,i)=>({dataset:{room},hidden:i!==0,contains:node=>i===1&&node===board}));
 const document=node({querySelectorAll:()=>rooms,getElementById:id=>refs[id]});
 vm.runInNewContext(read('carrier-crew.js'),{document});
 return {prev,next,label,board,ranks,rooms,document,
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
 assert.deepEqual(rows,[[0,'Cadet',0],[5,'Wingman',5],[25,'Ace',25],[75,'Veteran',75]]);
 const resolver=read('pilot-profile.js').match(/const rankFor=([^;]+);/);
 assert.ok(resolver,'pilot profile rank resolver is available for parity check');
 const rankFor=vm.runInNewContext(resolver[1]);
 for(let kills=0;kills<=100;kills++){
  const expected=[...rows].reverse().find(([minimum])=>kills>=minimum)[1];
  assert.equal(rankFor(kills),expected,'confirmed kills: '+kills);
 }
});
