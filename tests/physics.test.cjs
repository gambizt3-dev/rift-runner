'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const text=fs.readFileSync(path.join(__dirname,fs.existsSync(path.join(__dirname,'../dist/game.js'))?'../dist/game.js':'../game.js'),'utf8');
const instrumented=text.replace(/\}\)\(\);\s*$/,"globalThis.inspect=()=>({state,p,cones,shots,thruster,engineTestUntil,movePtr,moveKey,autoLock,practiceHits,practiceShots,arena,sparks,rings});globalThis.fixture={sweptCircle,narrow:(list)=>{cones=list;shots=[];},ball:(b)=>shots.push(b)};})();");
function setup({pending=false}={}){
 let raf,clock=0,gesture=false,boxTarget=null;
 const events={},keys={},sounds=[],resumes=[],notes=[],storage=new Map();
 const elem=()=>({handlers:{},dataset:{},styles:{},hidden:false,checked:true,style:{setProperty(){}},addEventListener(k,f){this.handlers[k]=f;},getBoundingClientRect:()=>({width:480,height:720,left:0,top:0}),querySelector:()=>({focus(){}}),querySelectorAll:()=>Array.from({length:4},()=>({textContent:''})),focus(){},setPointerCapture(){},releasePointerCapture(){}});
 const draw=new Proxy({createRadialGradient:()=>({addColorStop(){}}),createLinearGradient:()=>({addColorStop(){}})},{get:(a,k)=>k in a?a[k]:()=>{}});
 const canvas=Object.assign(elem(),{getContext:()=>draw}),el={game:canvas,hud:elem(),overlay:elem(),'sound-on':elem(),'test-sound':elem(),'test-engine':elem(),'sound-status':elem(),'move-pad':elem(),'aim-pad':elem(),'fire-button':elem(),'aim-mode':elem(),'flight-deck':elem()};
 const buttons={};for(const d of ['n','ne','e','se','s','sw','w','nw'])buttons[d]={dataset:{move:d},closest:()=>buttons[d]};
 el['move-pad'].contains=b=>Object.values(buttons).includes(b);
 const document={activeElement:canvas,hidden:false,getElementById:k=>el[k],elementFromPoint:()=>boxTarget,addEventListener:(k,f)=>events[k]=f};
 const param=()=>({value:0,calls:[],setValueAtTime(...a){this.value=a[0];this.calls.push(['set',...a]);},linearRampToValueAtTime(...a){this.calls.push(['ramp',...a]);},exponentialRampToValueAtTime(...a){this.calls.push(['exp',...a]);},setTargetAtTime(...a){this.calls.push(['target',...a]);},cancelScheduledValues(t){this.calls.push(['cancel',t]);},cancelAndHoldAtTime(t){this.calls.push(['hold',t]);}});
 class Audio {
  constructor(){assert(gesture);this.state='suspended';this.destination={};this.sampleRate=8000;}
  get currentTime(){return clock/1000;}
  resume(){assert(gesture);if(!pending){this.state='running';return Promise.resolve();}return new Promise(resolve=>resumes.push(()=>{this.state='running';resolve();}));}
  decodeAudioData(){return Promise.resolve({duration:.26,recorded:true});}
  createGain(){return {gain:param(),connect(){},disconnect(){}};}
  createBiquadFilter(){return {frequency:param(),connect(){},disconnect(){}};}
  createOscillator(){const n={frequency:param(),connect(){},disconnect(){},start(){notes.push(this);},stop(){this.stopped=true;this.onended?.();}};return n;}
  createBufferSource(){return{connect(){},disconnect(){},start(){sounds.push(this.buffer?.recorded?'blaster':'noise');},stop(){this.onended?.();}};}
  createBuffer(ch,n){const b=new Float32Array(n);return {getChannelData:()=>b};}
 }
 const window={AudioContext:Audio,RIFT_BLASTER_MP3_BASE64:'AAECAwQFBgc=',devicePixelRatio:1,matchMedia:()=>({matches:false}),addEventListener:(k,f)=>keys[k]=f};
 const sandbox={window,document,atob,performance:{now:()=>clock},localStorage:{getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v)},requestAnimationFrame:f=>{raf=f;return 1;}};
 vm.runInNewContext(instrumented,sandbox);
 const user=f=>{gesture=true;try{return f();}finally{gesture=false;}};
 const step=(n=1)=>{while(n--)raf(clock+=16);};
 const open=name=>user(()=>el.overlay.handlers.click({pointerType:'touch',target:{closest:()=>({dataset:{rift:name}})}}));
 const point=(act,d,id=1)=>user(()=>{boxTarget=buttons[d];el['move-pad'].handlers[act]({target:buttons[d],pointerId:id,button:0,clientX:50,clientY:50,preventDefault(){}});});
 const key=(act,code)=>user(()=>keys[act]({code,repeat:false,preventDefault(){}}));
 const click=id=>user(()=>el[id].handlers.click());
 const mute=on=>user(()=>{el['sound-on'].checked=!on;el['sound-on'].handlers.change();});
 const hide=on=>{document.hidden=on;events.visibilitychange();};
 return {get:sandbox.inspect,fixture:sandbox.fixture,el,step,open,point,key,click,mute,hide,notes,resumes,sounds};
}
const later=()=>new Promise(setImmediate);
const cone=(id,x,y,vx=0,vy=0)=>({id,x,y,vx,vy,r:15,angle:0,spin:0,hitGlow:0,wallFx:0,invMass:1});
(async()=>{
 const q=setup();const initial=q.get();
 assert.equal(initial.state,'menu');assert.equal(initial.cones.length,8);assert.match(q.el.hud.innerHTML,/Reset field/);
 assert.equal(q.fixture.sweptCircle(-50,0,100,0,17),.33);assert.equal(q.fixture.sweptCircle(-50,19,100,0,17),null);
 assert.equal(q.fixture.sweptCircle(0,0,0,0,17),0);assert.equal(q.fixture.sweptCircle(-50,0,30,0,17),null);
 q.open('start');await later();const p=q.get().p;
 q.fixture.narrow([]);q.point('pointerdown','n');q.step(230);
 assert.equal(p.y,q.get().arena.top+p.r);assert.equal(p.vy,0);assert(q.get().thruster.driving);
 q.point('pointermove','s');q.step(11);assert(p.vy>150);const y=p.y;
 q.point('pointerup','s');q.step(7);assert(p.y>y+10);assert(!q.get().thruster.driving);
 // A glancing craft bump transfers physical momentum and torque.
 p.x=100;p.y=306;p.vx=210;p.vy=0;
 const bumped=cone(1,145,300);q.fixture.narrow([bumped]);q.step(15);
 assert(bumped.vx>100);assert.notEqual(bumped.spin,0);assert(p.vx<160);assert(Math.hypot(p.x-bumped.x,p.y-bumped.y)>=p.r+bumped.r-.015);
 // Cone-cone collision is not a scripted projectile-only effect.
 p.x=240;p.y=560;p.vx=0;p.vy=0;
 const left=cone(1,135,310,215,0),right=cone(2,169,315);
 q.fixture.narrow([left,right]);q.step(13);
 assert(right.vx>70);assert(left.vx<130);assert.notEqual(right.spin,0);assert(Math.hypot(left.x-right.x,left.y-right.y)>=30-.015);
 // Cone reflects from a wall; craft clamps only the obstructed component.
 const wallCone=cone(1,441,450,230,50);q.fixture.narrow([wallCone]);q.step(9);
 assert(wallCone.x<=q.get().arena.right-wallCone.r);assert(wallCone.vx<0);assert(wallCone.y>450);
 q.fixture.narrow([]);p.x=449;p.y=425;p.vx=240;p.vy=110;q.step(6);
 assert.equal(p.x,q.get().arena.right-p.r);assert.equal(p.vx,0);assert(p.vy>0);
 // Actual player input fires once, shifts the player physically in the exact
 // opposite direction. Direct aim does not fire automatically.
 p.x=240;p.y=520;p.vx=0;p.vy=0;
 const target=cone(1,240,393);q.fixture.narrow([target]);
 const audioBefore=q.sounds.length;q.step(10);assert.equal(q.get().shots.length,0);
 q.click('fire-button');
 assert.equal(q.get().practiceShots,1);assert.equal(q.get().shots.length,1);
 assert(p.vy>20);assert.deepEqual(q.sounds.slice(audioBefore),['blaster']);q.step(19);
 assert.equal(q.get().practiceHits,1);assert.equal(q.get().shots.length,0);assert(target.vy<0);assert(target.hitGlow>0);
 // A fast sweep crosses both cones inside one step, hits only the first, and
 // an off-centre hit makes it spin.
 p.x=240;p.y=550;p.vx=0;p.vy=0;
 const first=cone(1,130,292),last=cone(2,185,292);q.fixture.narrow([last,first]);
 q.fixture.ball({x:62,y:300,vx:24000,vy:0,a:0});q.step();
 assert.equal(q.get().practiceHits,2);assert(first.vx>100);assert(first.spin<0);assert.equal(last.vx,0);assert.equal(q.get().shots.length,0);
 assert(q.get().rings.length>0);assert(q.get().sparks.length>0);
 // Three contacts can steer, aim, and separately fire without stealing captures.
 assert.equal(q.el['aim-mode'].checked,false);
 q.fixture.narrow([]);q.point('pointerdown','w',1);q.step(5);
 const moveBefore=q.get().p.x;
 const e={pointerId:2,button:0,clientX:464,clientY:360,preventDefault(){}};
 q.el['aim-pad'].handlers.pointerdown(e);q.step(4);
 assert.equal(q.get().practiceShots,1);assert.equal(q.get().movePtr.id,1);
 const fire={pointerId:3,button:0,detail:1,pointerType:'touch',preventDefault(){}};
 q.el['fire-button'].handlers.pointerdown(fire);
 q.el['fire-button'].handlers.pointerup(fire);
 q.el['fire-button'].handlers.click(fire);
 assert.equal(q.get().practiceShots,2);assert(q.get().shots.at(-1).vx>500);
 q.el['aim-pad'].handlers.pointerup(e);
 assert.equal(q.get().practiceShots,2,'releasing the right pad cannot fire');
 assert.equal(q.get().p.aim,0,'heading remains on release');
 q.step(5);assert(q.get().p.x<moveBefore-10);q.point('pointerup','w',1);
 // Layout and V8 audio still respond after soft pause; reset is delegated.
 q.key('keydown','Escape');assert.equal(q.get().state,'pause');q.step(8);
 q.open('resume');assert.equal(q.get().state,'play');
 q.mute(true);q.click('test-engine');assert.equal(q.get().thruster,null);
 q.el.hud.handlers.click({target:{closest:()=>true}});
 assert.equal(q.get().cones.length,8);assert.equal(q.get().practiceHits,0);assert.equal(q.get().practiceShots,0);assert.equal(q.get().p.vx,0);assert.equal(q.get().p.vy,0);
 console.log('PASS cone-only stage, D-pad north exit/coast, glancing craft and cone impulses/spin, walls, real shot/recoil/audio, moving-circle sweep tunnelling/nearest impact, sparks, reset/pause, independent three-contact steer/aim/Blaster fire.');
})();
