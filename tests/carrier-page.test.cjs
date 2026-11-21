'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),test=require('node:test'),vm=require('node:vm');
const site=['../dist','..'].map(p=>path.join(__dirname,p)).find(p=>fs.existsSync(path.join(p,'carrier.html')));
const read=name=>fs.readFileSync(path.join(site,name),'utf8');
const page=read('carrier.html'),css=read('carrier.css');
test('Carrier is a native same-directory Main Menu link, separate from arena and Hangar',()=>{
 const index=read('index.html'),menu=index.slice(index.indexOf('<section id="main-menu"'),index.indexOf('<div id="arena-screen"'));
 assert.match(menu,/<a\b[^>]*\bid="main-menu-carrier"\s+href="\.\/carrier\.html"[^>]*>\s*<span>Carrier<\/span>/);
 assert.match(menu,/<button[^>]+data-rift="hangar"/);
 assert.ok(!index.slice(index.indexOf('<div id="arena-screen"')).includes('href="./carrier.html"'));
 assert.match(page,/<a\b[^>]+href="\.\/index\.html"[^>]*>.*Main Menu<\/a>/);
});
test('Carrier starts silent with a static dock with two readable transparent endpoint sprites',()=>{
 assert.match(page,/<main[^>]*aria-labelledby="carrier-title"/);
 assert.match(page,/<h1 id="carrier-title">Carrier<\/h1>/);
 assert.match(page,/<a class="carrier-berth carrier-status" id="carrier-hangar" href="\.\/index\.html\?hangar=carrier">[\s\S]+?Hangar/);
 assert.doesNotMatch(page,/fighter-winged\.png|class="carrier-fighter"/);
 for(const [art,alt] of [['carrier-scene.webp','Exterior view'],['carrier-top.webp','Direct top view']]){
  const image=page.split('\n').find(line=>line.includes('src="./'+art+'"'));
  assert.ok(image.includes('alt="'+alt));
  const webp=fs.readFileSync(path.join(site,art));
  assert.equal(webp.toString('ascii',0,4),'RIFF');
  assert.equal(webp.toString('ascii',8,12),'WEBP');
  assert.equal(webp.toString('ascii',12,16),'VP8X');
  assert.ok(webp[20]&0x10,'sprite includes transparent alpha');
  assert.equal(webp.readUIntLE(24,3)+1,1024);assert.equal(webp.readUIntLE(27,3)+1,1536);
 }
 assert.doesNotMatch(page,/<(?:audio|canvas|dialog)\b/i);
 assert.deepEqual(page.match(/<script[^>]*>/g),['<script src="./pilot-credits.js?v=1" defer>','<script src="./carrier-view.js?v=4" defer>','<script src="./carrier-audio.js?v=4" defer>','<script src="./carrier-particles.js?v=1" defer>']);
 assert.match(css,/object-fit:contain/);
 assert.match(css,/safe-area-inset-left/);assert.match(css,/safe-area-inset-bottom/);
});
test('toggle and both directions update only angle arts, without showing the player fighter',()=>{
 assert.match(page,/<fieldset class="carrier-views" id="carrier-views" hidden>/);
 assert.match(page,/<input type="radio" name="carrier-angle" value="exterior" checked>/);
 assert.match(page,/<input type="radio" name="carrier-angle" value="top">/);
 assert.match(page,/<img [^>]+id="carrier-top-image"[^>]+ hidden>/);
 assert.match(css,/\.carrier-hull\[hidden\],\.carrier-views\[hidden\]\{display:none\}/);
 assert.match(css,/\.carrier-views input:focus-visible\+span\{outline:/);
 const q=carousel({reduced:true});
 assert.equal(q.nodes['carrier-views'].hidden,false);
 const view=()=>[q.scene.dataset.angle,q.sprites[0].hidden,q.sprites[6].hidden,q.nodes['carrier-angle-label'].textContent];
 assert.deepEqual(view(),['exterior',false,true,'Exterior view']);
 q.choose('top');assert.deepEqual(view(),['top',true,false,'Top view']);
 q.choose('invalid');assert.deepEqual(view(),['top',true,false,'Top view']);
 q.choose('exterior');assert.deepEqual(view(),['exterior',false,true,'Exterior view']);
 assert.match(css,/\.carrier-scene\{[^}]*position:relative;aspect-ratio:2 \/ 3/);
});
test('slow stars are separate and reduced motion freezes them; light overlays do not move or interact',()=>{
 assert.match(css,/animation:carrier-stars-near-down 74s linear infinite/);
 assert.match(css,/animation:carrier-stars-far-down 124s linear infinite/);
 assert.match(css,/calc\(var\(--sky-y,0px\) \+ 157px\)/);
 assert.match(css,/calc\(var\(--sky-y,0px\) \+ 141px\)/);
 assert.match(css,/radial-gradient\(circle/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)\{\.carrier-view::before,\.carrier-view::after\{animation:none\}\}/);
 assert.match(page,/<div class="carrier-scene"[^>]+>[\s\S]*?<div class="carrier-lights" aria-hidden="true">/);
 assert.match(page,/<span class="carrier-light-bridge"><\/span>/);
 assert.match(css,/\.carrier-scene\{[^}]*--bridge-y:37\.5%/);
 assert.match(css,/\.carrier-scene\[data-light-angle="top"\]\{[^}]*--bridge-y:40\.9%/);
 assert.match(css,/\.carrier-lights\{[^}]*pointer-events:none;opacity:var\(--carrier-angle-illumination,1\)\}/);
 assert.deepEqual([...page.matchAll(/class="carrier-engine-glow engine-(\d)"/g)].map(x=>x[1]),['1','2','3','4']);
 assert.match(css,/\.carrier-scene\[data-light-angle="top"\]\{[^}]*--engine-1:35\.5%[^}]*--engine-y:94\.7%/);
 assert.doesNotMatch(css,/\.carrier-scene(?:[ \n]*|\[.*?\])\{[^}]*animation:/);
});
const poseNames=['exterior','extra-1','mid-1','extra-2','mid-2','extra-3','top'];
function carousel({unloaded=[],broken=[],reduced=false,wantRAF=true}={}){
 let angle='exterior',now=0,onChange,serial=0;
 const jobs=new Map(),timers=new Map(),nodes={};
 const motion={matches:reduced,addEventListener(name,callback){assert.equal(name,'change');this.toggle=callback;}};
 const sprites=poseNames.map((view,i)=>nodes['carrier-'+view+'-image']={
  complete:!unloaded.includes(i),naturalWidth:unloaded.includes(i)||broken.includes(i)?0:1024,
  hidden:i!==0,style:{},attributes:{},listeners:{},
  setAttribute(name,val){this.attributes[name]=val;},
  addEventListener(name,callback){this.listeners[name]=callback;},
  removeEventListener(name,callback){if(this.listeners[name]===callback)delete this.listeners[name];}
 });
 const skyOffsets={},sky={style:{setProperty(k,v){skyOffsets[k]=v;}}};
 const vars={},scene=nodes['carrier-scene']={dataset:{angle:'exterior'},style:{setProperty(k,v){vars[k]=v;}}};
 nodes['carrier-angle-label']={textContent:'Exterior view'};
 nodes['carrier-views']={hidden:true,querySelector(sel){
  if(sel==='input[name="carrier-angle"]:checked')return {value:angle};
  const value=sel.match(/^input\[value="(exterior|top)"\]$/)?.[1];
  assert.ok(value,'only a fixed compatible radio may be restored');
  return {set checked(on){if(on)angle=value;}};
 },addEventListener(_,cb){onChange=cb;}};
 const sandbox={
  document:{getElementById:id=>nodes[id],querySelector:sel=>{assert.equal(sel,'.carrier-view');return sky;}},matchMedia:query=>{assert.match(query,/prefers-reduced-motion/);return motion;},
  performance:{now:()=>now},
  requestAnimationFrame:wantRAF?cb=>{jobs.set(++serial,cb);return serial;}:undefined,
  cancelAnimationFrame:id=>jobs.delete(id),
  setTimeout:(cb,ms)=>{timers.set(++serial,{cb,at:now+ms});return serial;},clearTimeout:id=>timers.delete(id)
 };
 vm.runInNewContext(read('carrier-view.js'),sandbox);
 const choose=value=>{angle=value;onChange();};
 const step=ms=>{now+=ms;const scheduled=[...jobs.values()];jobs.clear();
  for(const [id,{cb,at}] of timers)if(now>=at){timers.delete(id);cb();}
  scheduled.forEach(cb=>cb(now));
 };
 const layers=()=>sprites.map(s=>s.hidden?0:Number(s.style.opacity));
 const setReduced=on=>{motion.matches=on;motion.toggle({matches:on});};
 const resolve=(index,ok=true)=>{
  const image=sprites[index];image.complete=true;image.naturalWidth=ok?1024:0;
  image.listeners[ok?'load':'error']?.();
 };
 return {sprites,scene,nodes,vars,skyOffsets,step,choose,layers,setReduced,resolve,jobs,timers,selected:()=>angle};
}
const poseArray=i=>poseNames.map((_,index)=>Number(index===i));
test('markup loads all seven poses in angle order; interiors are decorative, transparent and aligned',()=>{
 const order=page.match(/id="carrier-(?:exterior|extra-\d|mid-\d|top)-image"/g);
 assert.deepEqual(order,poseNames.map(v=>'id="carrier-'+v+'-image"'));
 for(const position of poseNames.slice(1,-1)){
  const name='carrier-'+position+'.webp',image=page.split('\n').find(line=>line.includes('src="./'+name+'"'));
  assert.match(image,/alt="" aria-hidden="true" fetchpriority="low" hidden/);
  assert.match(image,/width="1024" height="1536"/);
  const art=fs.readFileSync(path.join(site,name));
  assert.equal(art.toString('ascii',8,16),'WEBPVP8X');
  assert.ok(art[20]&0x10);assert.equal(art.readUIntLE(24,3)+1,1024);assert.equal(art.readUIntLE(27,3)+1,1536);
 }
 assert.match(css,/\.carrier-hull\{\s*position:absolute;inset:0;/);
});
test('carrier visibly eases through each pose and translates back in exactly the same sequence',()=>{
 const q=carousel();assert.deepEqual(q.layers(),poseArray(0));
 q.choose('top');
 assert.equal(q.scene.dataset.angle,'top');assert.equal(q.nodes['carrier-angle-label'].textContent,'Top view');
 assert.equal(q.jobs.size,1);q.step(52);assert.ok(q.layers()[0]>.96,'ease gently off the first pose');
 const seen=new Set();
 for(let i=0;i<19;i++){
  q.step(52);q.layers().forEach((alpha,i)=>{if(alpha>0)seen.add(i);});
  assert.ok(q.layers().filter(alpha=>alpha>0).length<=2);
 }
 assert.deepEqual([...seen],[0,1,2,3,4,5,6]);
 assert.deepEqual(q.layers(),poseArray(6));assert.equal(q.jobs.size,0);
 assert.equal(q.vars['--carrier-angle-illumination'],'1.000');assert.equal(q.scene.dataset.lightAngle,'top');
 assert.equal(q.sprites[6].attributes['aria-hidden'],'false');
 for(const mid of q.sprites.slice(1,-1))assert.equal(mid.attributes['aria-hidden'],'true');
 q.choose('exterior');q.step(520);assert.deepEqual(q.layers(),poseArray(3));
 assert.ok(+q.vars['--carrier-angle-illumination']<.3);q.step(520);assert.deepEqual(q.layers(),poseArray(0));
});
test('rapid choice reversals keep the blend and one frame request',()=>{
 const q=carousel();
 q.choose('top');q.step(377);const before=q.layers();
 q.choose('exterior');assert.deepEqual(q.layers(),before);assert.equal(q.jobs.size,1);
 q.step(100);const pulled=q.layers();
 assert.notDeepEqual(pulled,before);
 q.choose('top');q.choose('exterior');q.choose('top');assert.equal(q.jobs.size,1);
 q.step(763);assert.deepEqual(q.layers(),poseArray(6));assert.equal(q.jobs.size,0);
});
test('optional slow and broken poses never cause a snap or jump; still animates with just endpoints',()=>{
 for(const variant of [{unloaded:[1,3],broken:[2,4,5]},{unloaded:[5],broken:[3]}]){
  const q=carousel(variant);q.choose('top');assert.equal(q.jobs.size,1);
  assert.deepEqual(q.layers(),poseArray(0));
  q.step(260);
  const layers=q.layers();
  assert.ok(layers.some((alpha,index)=>index!==0&&alpha>0));
  for(const index of [...variant.unloaded,...variant.broken])assert.equal(layers[index],0);
  const slow=variant.unloaded[0];q.resolve(slow);
  assert.deepEqual(q.layers(),layers,'late optional frame never alters an active run');
  q.step(260);assert.equal(q.layers()[slow],0);
  q.step(520);assert.deepEqual(q.layers(),poseArray(6));
  q.choose('exterior');assert.equal(q.jobs.size,1,'subsequent travel samples the newly loaded subset');
 }
});
test('a cold destination waits at most 440ms; ready arrival starts smoothly, timeout or error restores reliable view',()=>{
 const q=carousel({unloaded:[6]});
 q.choose('top');assert.deepEqual(q.layers(),poseArray(0));assert.equal(q.scene.dataset.angle,'exterior');
 assert.equal(q.timers.size,1);assert.equal(q.jobs.size,0);
 q.step(420);q.resolve(6);assert.equal(q.timers.size,0);assert.equal(q.jobs.size,1);
 assert.deepEqual(q.layers(),poseArray(0));q.step(520);assert.deepEqual(q.layers(),poseArray(3));
 q.step(520);assert.deepEqual(q.layers(),poseArray(6));
 for(const failure of ['timeout','error','broken','reversed']){
  const trial=carousel(failure==='broken'?{broken:[6]}:{unloaded:[6]});
  trial.choose('top');
  if(failure==='timeout')trial.step(440);
  if(failure==='error')trial.resolve(6,false);
  if(failure==='reversed')trial.choose('exterior');
  assert.equal(trial.selected(),'exterior');
  assert.equal(trial.scene.dataset.angle,'exterior');assert.deepEqual(trial.layers(),poseArray(0));
  assert.equal(trial.timers.size,0);assert.equal(trial.jobs.size,0);
  trial.resolve(6);trial.step(2000);assert.deepEqual(trial.layers(),poseArray(0),'no late restart');
  trial.choose('top');assert.equal(trial.jobs.size,1);trial.step(1040);assert.deepEqual(trial.layers(),poseArray(6));
 }
});
test('reduced motion and no animation API select a usable target directly, not a blank one',()=>{
 for(const options of [{reduced:true},{wantRAF:false}]){
  const q=carousel(options);q.choose('top');assert.deepEqual(q.layers(),poseArray(6));assert.equal(q.jobs.size,0);
  const slow=carousel({...options,unloaded:[6]});slow.choose('top');assert.deepEqual(slow.layers(),poseArray(0));
  slow.resolve(6);assert.deepEqual(slow.layers(),poseArray(6));assert.equal(slow.jobs.size,0);
 }
 const switched=carousel();switched.choose('top');switched.step(220);switched.setReduced(true);
 assert.deepEqual(switched.layers(),poseArray(6));assert.equal(switched.jobs.size,0);
});

test('angle-linked star parallax shares easing, survives reversal and snaps in reduced motion',()=>{
 const read=q=>['near-x','near-y','far-x','far-y'].map(key=>parseFloat(q.skyOffsets['--carrier-sky-'+key]));
 const q=carousel();
 assert.deepEqual(read(q),[0,0,0,0]);
 q.choose('top');q.step(260);
 const partly=read(q);assert.ok(partly[0]<-2.8&&partly[0]>-3.1);assert.ok(partly[1]>5&&partly[1]<5.5);
 q.step(260);assert.deepEqual(read(q),[-10,18,-4,7]);
 q.choose('exterior');assert.deepEqual(read(q),[-10,18,-4,7]);
 q.step(260);assert.deepEqual(read(q),partly);q.step(260);assert.deepEqual(read(q),[0,0,0,0]);
 const r=carousel({reduced:true});r.choose('top');assert.equal(r.jobs.size,0);assert.deepEqual(read(r),[-20,36,-8,14]);
 assert.match(css,/inset:-206px -56px -56px/);
 assert.match(css,/translate3d\(var\(--sky-x,0px\),var\(--sky-y,0px\),0\)/);
 assert.match(css,/--sky-x:var\(--carrier-sky-near-x,0px\)/);
 assert.match(css,/--sky-x:var\(--carrier-sky-far-x,0px\)/);
});
