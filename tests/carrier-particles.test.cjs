'use strict';
const assert=require('node:assert/strict'),test=require('node:test'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const site=['../dist','..'].map(p=>path.join(__dirname,p)).find(p=>fs.existsSync(path.join(p,'carrier.html')));
const read=name=>fs.readFileSync(path.join(site,name),'utf8');
const code=read('carrier-particles.js');
function rig({hidden=false,reduced=false,view={left:0,width:390,height:820},hull={left:12,width:366}}={}){
 const events={},docEvents={},jobs=new Map(),nodes=[];
 let now=0,serial=0,seed=38269;
 const math=Object.create(Math);
 math.random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 const layer={dataset:{},getBoundingClientRect:()=>view,append(node){nodes.push(node);}};
 const ship={getBoundingClientRect:()=>hull},motion={matches:reduced,addEventListener(name,fn){assert.equal(name,'change');this.change=fn;}};
 const document={hidden,
  getElementById:n=>n==='carrier-passers'?layer:n==='carrier-scene'?ship:null,
  createElement(tag){
   assert.equal(tag,'span');
   const css={},listeners={};
   return {hidden:false,css,style:{setProperty(k,v){css[k]=v;}},addEventListener(name,fn){listeners[name]=fn;},end(){listeners.animationend();}};
  },
  addEventListener(name,callback){docEvents[name]=callback;},
 };
 vm.runInNewContext(code,{
  Math:math,document,matchMedia:q=>{assert.match(q,/prefers-reduced-motion/);return motion;},
  addEventListener:(name,cb)=>events[name]=cb,
  setTimeout:(fn,delay)=>{jobs.set(++serial,{fn,due:now+delay,delay});return serial;},
  clearTimeout:id=>jobs.delete(id),
  requestAnimationFrame(){assert.fail('particles must never request a frame');}
 });
 const advance=()=>{
  const first=jobs.entries().next().value;assert.ok(first,'one particle timer');
  const [id,task]=first;jobs.delete(id);now=task.due;task.fn();return task;
 };
 return {layer,jobs,nodes,advance,
  reduce(on){motion.matches=on;motion.change();},
  hide(on){document.hidden=on;docEvents.visibilitychange();},
  pageHide(){events.pagehide();},
  pageShow(){events.pageshow();}
 };
}
const value=(node,name)=>parseFloat(node.css['--pass-'+name]);
test('seeded paths fall toward the stern with small outward slants, varying positions and depth',()=>{
 const q=rig(),observations=[];
 assert.equal(q.jobs.size,1);assert.equal(q.nodes.length,0);
 for(let i=0;i<20;i++){
  const timer=q.advance();
  assert.ok(timer.delay>=(i===0?930:1750)&&timer.delay<=(i===0?1580:3950));
  const [p]=q.nodes;assert.equal(p.hidden,false);assert.equal(q.nodes.length,1);
  const x=value(p,'left'),y=value(p,'top'),dx=value(p,'dx'),dy=value(p,'dy'),duration=value(p,'time'),alpha=value(p,'opacity');
  assert.ok(x>=5&&x<=385&&y>=820*.12-.1&&y<=820*.72+.1);
  assert.equal(Math.sign(dx),Math.sign(x-195));
  assert.ok(dy>=73&&dy<=220&&Math.abs(dx)<=22);
  assert.ok(Math.abs(value(p,'slant'))<=18&&Math.sign(value(p,'slant'))===-Math.sign(dx));
  assert.ok(duration>=650&&duration<=1280&&alpha>=.27&&alpha<=.61);
  observations.push([x,y,dx,dy,p.css['--pass-width']]);p.end();
  assert.equal(p.hidden,true);assert.equal(q.jobs.size,1);
 }
 assert.ok(new Set(observations.map(x=>x[0])).size>12);
 assert.ok(observations.some(x=>x[2]<0)&&observations.some(x=>x[2]>0));
 assert.deepEqual(new Set(observations.map(x=>x[4])),new Set(['1px','1.6px']));
});
test('particles stay bounded and reuse a finished slot even if animation completions are late',()=>{
 const q=rig();
 for(let n=0;n<10;n++)q.advance();
 assert.equal(q.nodes.length,4);assert.ok(q.nodes.every(p=>!p.hidden));
 const first=q.nodes[0],prior=first.css['--pass-top'];
 first.end();q.advance();
 assert.equal(q.nodes[0],first);assert.equal(first.hidden,false);assert.notEqual(first.css['--pass-top'],prior);
 assert.equal(q.nodes.length,4);assert.equal(q.jobs.size,1);
});
test('hidden, pagehide and reduced motion leave zero pending work and no stale particle',()=>{
 for(const initial of [{hidden:true},{reduced:true}]){
  const q=rig(initial);assert.equal(q.jobs.size,0);assert.equal(q.nodes.length,0);assert.equal(q.layer.dataset.parked,'true');
  if(initial.hidden)q.hide(false);else q.reduce(false);
  assert.equal(q.jobs.size,1);assert.equal(q.layer.dataset.parked,'false');
 }
 const q=rig();q.advance();const pending=q.jobs.values().next().value;
 q.hide(true);assert.equal(q.jobs.size,0);assert.ok(q.nodes.every(p=>p.hidden));assert.equal(q.layer.dataset.parked,'true');
 pending.fn();assert.equal(q.jobs.size,0);assert.ok(q.nodes.every(p=>p.hidden));
 q.hide(false);q.pageShow();assert.equal(q.jobs.size,1,'resume never duplicates the timer');
 q.advance();q.pageHide();assert.equal(q.jobs.size,0);assert.ok(q.nodes.every(p=>p.hidden));
 q.hide(false);assert.equal(q.jobs.size,0,'hidden page stays stopped until page show');
 q.pageShow();assert.equal(q.jobs.size,1);
 q.advance();q.reduce(true);assert.equal(q.jobs.size,0);assert.ok(q.nodes.every(p=>p.hidden));
 q.reduce(false);assert.equal(q.jobs.size,1);
});
test('decorative layer cannot intercept input; four static reduced-motion exhausts use each view’s engine anchors',()=>{
 const html=read('carrier.html'),css=read('carrier.css'),index=read('index.html');
 assert.match(html,/<div class="carrier-passers" id="carrier-passers" aria-hidden="true"><\/div>\s*<div class="carrier-art">/);
 assert.match(html,/<script src="\.\/carrier-particles\.js\?v=1" defer>/);
 assert.doesNotMatch(index,/carrier-particles\.js|carrier-passers|carrier-exhaust/);
 assert.match(css,/\.carrier-passers\{[^}]*pointer-events:none/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)\{\.carrier-passers\{display:none\}\}/);
 const exhaust=html.match(/<div class="carrier-exhaust" aria-hidden="true">([^<]*(?:<span[^>]*><\/span>){4})<\/div>/)?.[1];
 assert.deepEqual([...exhaust.matchAll(/class="engine-(\d)"/g)].map(m=>m[1]),['1','2','3','4']);
 assert.ok(html.indexOf('class="carrier-exhaust"')<html.indexOf('id="carrier-exterior-image"'),'plumes behind the hull');
 assert.match(css,/\.carrier-exhaust\{[^}]*--carrier-angle-illumination/);
 assert.match(css,/\.carrier-exhaust span\{[^}]*var\(--engine-y\)[^}]*carrier-exhaust-breathe/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)\{\.carrier-exhaust span\{animation:none\}\}/);
 assert.match(css,/\[data-parked="true"\][^{]*\.carrier-exhaust span\{animation-play-state:paused\}/);
 for(let i=1;i<=4;i++)assert.match(css,new RegExp('\\.engine-'+i+'\\{left:var\\(--engine-'+i+'\\)\\}'));
});
