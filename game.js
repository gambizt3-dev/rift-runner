'use strict';
(() => {
const canvas=document.getElementById('game'),hud=document.getElementById('hud'),overlay=document.getElementById('overlay'),shakeSwitch=document.getElementById('screen-shake');
if(!canvas||!hud||!overlay)return;
const g=canvas.getContext('2d',{alpha:false});
if(!g){overlay.textContent='This browser cannot display the game canvas.';return;}
const W=480,H=720,save='rift-runner.high-score.v1',TAU=Math.PI*2;
const clamp=(x,a,b)=>Math.min(b,Math.max(a,x)),rand=(a,b)=>a+Math.random()*(b-a);
const past=()=>{try{const x=Number(localStorage.getItem(save));return Number.isSafeInteger(x)&&x>=0?x:0;}catch{return 0;}};
const motion=window.matchMedia?.('(prefers-reduced-motion: reduce)');
if(shakeSwitch&&motion?.matches)shakeSwitch.checked=false;
motion?.addEventListener?.('change',e=>{if(e.matches&&shakeSwitch)shakeSwitch.checked=false;});
const stars=Array.from({length:150},(_,i)=>({x:(i*107+i*i*11)%W,y:(i*173+i*i*7)%H,r:i%17===0?1.65:i%3===0?1.04:.44,d:18+(i%13)*7,h:i%5===0?'#67c3d6':i%7===0?'#b853c2':'#b4d1ed'}));
let best=past(),state='menu',p,wave,score,remaining,spawnIn,shotDue,elapsed=0,last=0,flash=0,shake=0,frame=0,nextWaveIn=0,waveCue=0,movePtr=null,aimPtr=null,mousePtr=null,mousePoint=null,tapAim=null,scale=1,dx=0,dy=0,cssScale=1,viewW=1,viewH=1,hiDpi=1;
let shots=[],foeShots=[],foes=[],sparks=[],recoil=0,shotKick=0;
const kick=amount=>{shake=Math.max(shake,amount);};
const keys=new Set();
const has=(...a)=>a.some(k=>keys.has(k));
const fmt=n=>Math.floor(n).toLocaleString('en-AU');
const trail=['#68ffe0','#97f5f3','#c6e0ff'];
function updateHud(){
 hud.innerHTML='<span class="rift-stat">WAVE <b>'+String(wave??1).padStart(2,'0')+'</b></span><span class="rift-stat">HULL <b>'+(p?p.hp+' / '+p.max:'4 / 4')+'</b></span><span class="rift-stat">SCORE <b>'+fmt(score??0)+'</b></span><span class="rift-stat">BEST <b>'+fmt(best)+'</b></span>';
}
function button(label,action,id=''){return '<button type="button" class="rift-action" data-rift="'+action+'"'+(id?' id="'+id+'"':'')+'>'+label+'</button>';}
function menu(title,copy,action,label,kicker){
 overlay.hidden=false;overlay.innerHTML='<p class="rift-kicker">'+kicker+'</p><h2>'+title+'</h2><p>'+copy+'</p>'+button(label,action,action==='start'?'start':'');
}
function clearInput(){keys.clear();movePtr=null;aimPtr=null;mousePtr=null;mousePoint=null;tapAim=null;}
function record(){if(score>best){best=score;try{localStorage.setItem(save,String(best));}catch{}}}
function liveFocus(){canvas.focus({preventScroll:true});}
function start(){
 p={x:W/2,y:H*.82,hp:4,max:4,speed:245,damage:1,cool:.18,inv:0,vx:0,vy:0,aim:-Math.PI/2};
 score=0;wave=1;elapsed=0;flash=0;shake=0;recoil=0;shotKick=0;clearInput();
 beginWave();liveFocus();
}
function beginWave(){
 remaining=Math.min(30,5+wave*2);spawnIn=.25;shotDue=.12;shots=[];foeShots=[];foes=[];sparks=[];
 p.inv=Math.max(.4,p.inv);recoil=0;shotKick=0;nextWaveIn=0;waveCue=1.25;state='play';overlay.hidden=true;updateHud();
}
function dead(){
 state='dead';p.hp=0;record();clearInput();updateHud();
 menu('Signal lost','You reached wave '+wave+' with '+fmt(score)+' points.','start','Try again','RUN COMPLETE');
 overlay.querySelector('button')?.focus({preventScroll:true});
}
function pause(){
 if(state==='pause'){state='play';overlay.hidden=true;liveFocus();return;}
 if(state!=='play')return;
 state='pause';clearInput();menu('Flight paused','Your ship is holding its position.','resume','Resume flight','RUN PAUSED');
 overlay.querySelector('button')?.focus({preventScroll:true});
}
overlay.addEventListener('click',ev=>{
 const bt=ev.target.closest('[data-rift]');if(!bt)return;
 const a=bt.dataset.rift;
 if(a==='start'&&['menu','dead'].includes(state))start();
 else if(a==='resume'&&state==='pause')pause();
});
const keyAim=()=>[Number(has('ArrowRight'))-Number(has('ArrowLeft')),Number(has('ArrowDown'))-Number(has('ArrowUp'))];
const flightKeys=new Set(['KeyA','KeyW','KeyD','KeyS','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space']);
window.addEventListener('keydown',e=>{
 if(['Escape','KeyP'].includes(e.code)&&!e.repeat&&['play','pause'].includes(state)){e.preventDefault();pause();return;}
 if(state!=='play'||!flightKeys.has(e.code)||e.code==='Space'&&document.activeElement!==canvas)return;
 e.preventDefault();keys.add(e.code);
 if(!e.repeat&&e.code.startsWith('Arrow')){const [x,y]=keyAim();if(x||y)tapAim=p.aim=Math.atan2(y,x);}
 if(!e.repeat&&e.code==='Space')tapAim=p.aim;
},{passive:false});
window.addEventListener('keyup',e=>keys.delete(e.code));
window.addEventListener('blur',()=>{clearInput();if(state==='play')pause();});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&state==='play')pause();});
function fieldPoint(e){
 const box=canvas.getBoundingClientRect();
 return {x:(e.clientX-box.left-dx/hiDpi)/cssScale,y:(e.clientY-box.top-dy/hiDpi)/cssScale};
}
function angleTo(x,y){
 const vx=x-p.x,vy=y-p.y;
 return Math.hypot(vx,vy)>9?Math.atan2(vy,vx):p.aim;
}
function capture(e){try{canvas.setPointerCapture(e.pointerId);}catch{}}
canvas.addEventListener('pointerdown',e=>{
 if(state!=='play'||e.button>0)return;
 const field=fieldPoint(e);
 if(e.pointerType==='mouse'){
  if(mousePtr!==null)return;
  e.preventDefault();liveFocus();mousePtr=e.pointerId;mousePoint=field;p.aim=angleTo(field.x,field.y);tapAim=p.aim;capture(e);return;
 }
 if(field.x<W/2){
  if(movePtr)return;
  e.preventDefault();movePtr={id:e.pointerId,x:e.clientX,y:e.clientY};capture(e);
 }else{
  if(aimPtr)return;
  e.preventDefault();aimPtr={id:e.pointerId,x:e.clientX,y:e.clientY};p.aim=angleTo(field.x,field.y);tapAim=p.aim;capture(e);
 }
});
canvas.addEventListener('pointermove',e=>{
 if(state!=='play')return;
 if(e.pointerType==='mouse'){
  const q=fieldPoint(e);mousePoint=q;
  if(!aimPtr)p.aim=angleTo(q.x,q.y);return;
 }
 if(movePtr?.id===e.pointerId){
  e.preventDefault();const tx=(e.clientX-movePtr.x)/cssScale,ty=(e.clientY-movePtr.y)/cssScale;
  p.x=clamp(p.x+tx*1.15,21,W-21);p.y=clamp(p.y+ty*1.15,45,H-25);p.vx=tx*12;p.vy=ty*12;
  movePtr.x=e.clientX;movePtr.y=e.clientY;
 }else if(aimPtr?.id===e.pointerId){
  e.preventDefault();const ax=e.clientX-aimPtr.x,ay=e.clientY-aimPtr.y;
  if(Math.hypot(ax,ay)>7){p.aim=Math.atan2(ay,ax);if(tapAim!==null)tapAim=p.aim;}
 }
});
for(const event of ['pointercancel','pointerup','lostpointercapture'])canvas.addEventListener(event,e=>{
 if(movePtr?.id===e.pointerId)movePtr=null;
 if(aimPtr?.id===e.pointerId){aimPtr=null;if(event==='pointercancel')tapAim=null;}
 if(mousePtr===e.pointerId){mousePtr=null;if(event==='pointercancel')tapAim=null;}
});
function layout(){
 const box=canvas.getBoundingClientRect();
 hiDpi=Math.min(2.5,window.devicePixelRatio||1);viewW=Math.max(2,Math.round(box.width*hiDpi));viewH=Math.max(2,Math.round(box.height*hiDpi));
 if(canvas.width!==viewW)canvas.width=viewW;if(canvas.height!==viewH)canvas.height=viewH;
 scale=Math.min(viewW/W,viewH/H);cssScale=scale/hiDpi;dx=(viewW-W*scale)/2;dy=(viewH-H*scale)/2;
}
if(window.ResizeObserver)new ResizeObserver(layout).observe(canvas);else window.addEventListener('resize',layout);
function blast(x,y,tone,count=12,base=1){
 const n=motion?.matches?Math.ceil(count/3):count;
 for(let i=0;i<n;i++){
  const a=rand(0,TAU),v=rand(28,155)*base,life=rand(.12,.52);
  sparks.push({x,y,dx:Math.cos(a)*v,dy:Math.sin(a)*v,life,max:life,r:rand(1,3)*base,tone});
 }
 if(sparks.length>420)sparks.splice(0,sparks.length-420);
}
function enter(){
 const tank=(remaining+wave)%3===0,seed=rand(0,TAU),x=rand(45,W-45),hp=tank?3+Math.floor(wave/4):1+Math.floor(wave/7);
 foes.push({x,y:-25,center:x,seed,age:0,next:rand(1.05,2),tank,hp,max:hp,r:tank?19:13,speed:tank?38+wave*2:65+wave*4});
}
const hit=(a,b,r)=>Math.hypot(a.x-b.x,a.y-b.y)<r;
function damage(x,y){
 if(!p||p.inv>0)return;
 p.hp--;p.inv=.85;flash=.22;kick(.28);blast(x,y,'#ff79b1',26,1.2);
 updateHud();if(p.hp===0)dead();
}
function pew(f){
 const a=Math.atan2(p.y-f.y,p.x-f.x),fan=f.tank?[-.26,0,.26]:[0];
 for(const t of fan){
  const v=Math.min(f.tank?210+wave*8:150+wave*8,350);
  foeShots.push({x:f.x,y:f.y+9,vx:Math.cos(a+t)*v,vy:Math.sin(a+t)*v,heavy:f.tank});
 }
}
function simulate(dt){
 p.inv-=dt;spawnIn-=dt;shotDue-=dt;waveCue=Math.max(0,waveCue-dt);
 if(!movePtr){
  const x=Number(has('KeyD'))-Number(has('KeyA')),y=Number(has('KeyS'))-Number(has('KeyW')),m=Math.hypot(x,y)||1;
  p.vx=x/m*p.speed;p.vy=y/m*p.speed;p.x=clamp(p.x+p.vx*dt,21,W-21);p.y=clamp(p.y+p.vy*dt,42,H-24);
 }else p.vx*=Math.pow(.05,dt);
 if(nextWaveIn>0){nextWaveIn-=dt;if(nextWaveIn<=0){wave++;beginWave();}}
 if(remaining>0&&spawnIn<=0){enter();remaining--;spawnIn=Math.max(.33,1.04-wave*.055);}
 const [ax,ay]=keyAim();
 if(ax||ay)p.aim=Math.atan2(ay,ax);
 else if(!aimPtr&&mousePtr!==null&&mousePoint)p.aim=angleTo(mousePoint.x,mousePoint.y);
 if(shotDue<=0&&(ax||ay||aimPtr||mousePtr!==null||has('Space')||tapAim!==null)){
  const a=(ax||ay||aimPtr||mousePtr!==null||has('Space'))?p.aim:tapAim;
  const ux=Math.cos(a),uy=Math.sin(a);p.aim=a;
  shots.push({x:p.x+ux*20,y:p.y+uy*20,vx:ux*480,vy:uy*480,a,d:p.damage});
  tapAim=null;recoil=.10;if(shotKick<=0){kick(.065);shotKick=.21;}
  shotDue=p.cool;
 }
 for(const f of foes){
  f.age+=dt;
  if(f.tank&&f.y>120){f.y+=(124+20*Math.sin(f.age*.75)-f.y)*dt;f.x=clamp(f.center+Math.sin(f.age+f.seed)*65,23,W-23);}
  else{
   f.y+=f.speed*dt;
   f.x=clamp(f.center+Math.sin(f.age*(f.tank?1.1:2.2)+f.seed)*(f.tank?35:50),21,W-21);
  }
  if(f.age>f.next&&f.y>42&&f.y<p.y+10){pew(f);f.next=f.age+Math.max(.65,(f.tank?1.7:2.2)-wave*.07)+rand(0,.35);}
  if(hit(f,p,f.r+11)){f.hp=0;blast(f.x,f.y,'#ffae64',18);damage(p.x,p.y);}
  if(state!=='play')return;
 }
 for(const b of shots){b.y+=b.vy*dt;b.x+=b.vx*dt;for(const f of foes){
  if(f.hp<=0||!hit(f,b,f.r+3))continue;
  b.spent=true;f.hp-=b.d;blast(b.x,f.y,f.hp<=0?'#ffc47d':'#70ffe5',f.hp<=0?20:5,f.tank?1.22:1);
  if(f.hp<=0){kick(f.tank?.22:.14);score+=(f.tank?175:80)+wave*10;record();updateHud();}break;
 }}
 for(const b of foeShots){b.x+=b.vx*dt;b.y+=b.vy*dt;if(hit(b,p,12)){b.y=H+100;damage(p.x,p.y);if(state!=='play')return;}}
 shots=shots.filter(b=>!b.spent&&b.y>-25&&b.y<H+25&&b.x>-25&&b.x<W+25);
 foeShots=foeShots.filter(b=>b.y>-25&&b.y<H+25&&b.x>-25&&b.x<W+25);
 const missed=foes.some(f=>f.hp>0&&f.y>H+16);foes=foes.filter(f=>f.hp>0&&f.y<=H+16);
 if(missed){damage(p.x,p.y);if(state!=='play')return;}
 if(!remaining&&!foes.length&&nextWaveIn===0){score+=wave*120;record();updateHud();nextWaveIn=1.45;foeShots=[];}
}
function poly(points){g.beginPath();points.forEach(([x,y],i)=>i===0?g.moveTo(x,y):g.lineTo(x,y));g.closePath();g.fill();if(g.lineWidth)g.stroke();}
function shooter(x,y,a=-Math.PI/2,t=0){
 const push=state==='play'&&!motion?.matches?recoil*39:0;
 g.save();g.translate(x-Math.cos(a)*push,y-Math.sin(a)*push);g.rotate(a+Math.PI/2);g.globalAlpha=p?.inv>0&&Math.floor(t*16)%2===0?.48:1;
 g.fillStyle=trail[Math.floor(t*28)%trail.length];g.strokeStyle='#07313e';g.lineWidth=1;
 poly([[-7,11],[0,23+Math.sin(t*44)*4],[7,11]]);
 g.fillStyle='#137b89';g.strokeStyle='#71f2e2';g.lineWidth=1.5;
 poly([[0,-21],[20,12],[10,9],[7,14],[-7,14],[-10,9],[-20,12]]);
 g.fillStyle='#d5ffed';g.strokeStyle='#5bdcd9';g.lineWidth=1;
 poly([[0,-15],[6,3],[0,10],[-6,3]]);
 if(state==='play'&&recoil>0){g.globalAlpha=Math.min(1,recoil*10);g.fillStyle='#a5fff1';g.strokeStyle='#68e9dc';poly([[0,-37],[-3,-25],[-9,-24],[-2,-21],[0,-18],[2,-21],[9,-24],[3,-25]]);}
 g.restore();
}
function enemy(f,t){
 g.save();g.translate(f.x,f.y);g.rotate(Math.sin(t*2+f.seed)*.13);g.strokeStyle=f.tank?'#ffb468':'#ff9ac6';g.lineWidth=1.6;g.fillStyle=f.tank?'#4d2119':'#601e49';
 if(f.tank)poly([[-23,-10],[-12,-15],[-6,-8],[6,-8],[12,-15],[23,-10],[14,12],[0,16],[-14,12]]);
 else poly([[-15,-10],[-5,-5],[0,-12],[5,-5],[15,-10],[11,5],[0,14],[-11,5]]);
 g.fillStyle=f.tank?'#ffbb79':'#ff80bd';g.fillRect(-4,-3,8,8);
 if(f.max>1){g.fillStyle='#352838';g.fillRect(-15,-23,30,3);g.fillStyle=f.tank?'#ffac67':'#ff83b5';g.fillRect(-15,-23,30*Math.max(0,f.hp/f.max),3);}
 g.restore();
}
function drawAim(){
 const vx=Math.cos(p.aim),vy=Math.sin(p.aim),x=p.x+vx*62,y=p.y+vy*62;
 g.save();g.strokeStyle='rgba(146,255,230,.56)';g.lineWidth=1.35;g.setLineDash([3,5]);g.beginPath();
 g.moveTo(p.x+vx*28,p.y+vy*28);g.lineTo(x-vx*10,y-vy*10);g.stroke();g.setLineDash([]);
 g.beginPath();g.arc(x,y,7,0,TAU);g.moveTo(x-11,y);g.lineTo(x-5,y);g.moveTo(x+5,y);g.lineTo(x+11,y);g.moveTo(x,y-11);g.lineTo(x,y-5);g.moveTo(x,y+5);g.lineTo(x,y+11);g.stroke();g.restore();
}
function draw(t){
 g.setTransform(1,0,0,1,0,0);g.fillStyle='#050615';g.fillRect(0,0,viewW,viewH);
 g.setTransform(scale,0,0,scale,dx,dy);g.save();g.beginPath();g.rect(0,0,W,H);g.clip();
 let neb=g.createRadialGradient(W*.72,H*.4,24,W*.67,H*.43,H*.72);neb.addColorStop(0,'#261536');neb.addColorStop(.52,'#101a36');neb.addColorStop(1,'#07091b');
 g.fillStyle=neb;g.fillRect(0,0,W,H);
 g.globalAlpha=.27;g.lineWidth=1;g.strokeStyle='#4e4770';
 for(let i=0;i<7;i++){g.beginPath();g.ellipse(405,215,130+i*20,38+i*12,-.35,0,TAU);g.stroke();}
 g.globalAlpha=1;
 for(const a of stars){g.fillStyle=a.h;const y=(a.y+t*a.d)%H;g.globalAlpha=a.r>1?.64:.38;g.fillRect(a.x,y,a.r,a.r*(a.r>1?2:1));}
 g.globalAlpha=1;g.strokeStyle='#6d5180';g.lineWidth=2;g.strokeRect(2,2,W-4,H-4);
 if(shake>0&&(shakeSwitch?.checked??!motion?.matches))g.translate(Math.sin(t*71)*shake*16,Math.cos(t*64)*shake*13);
 if(!p||state==='menu'){shooter(W*.5,H*.74,-Math.PI/2,t);enemy({x:W*.18,y:H*.21,tank:false,max:1,seed:1},t);enemy({x:W*.79,y:H*.27,tank:true,max:3,hp:3,seed:2},t);}
 if(p&&state==='play')drawAim();
 if(p&&state!=='dead')shooter(p.x,p.y,p.aim,t);
 for(const f of foes)if(f.hp>0)enemy(f,t);
 for(const b of shots){g.save();g.translate(b.x,b.y);g.rotate(b.a);g.fillStyle='#3adac4';g.fillRect(-11,-2,16,4);g.fillStyle='#c6fff2';g.fillRect(-8,-.65,12,1.3);g.restore();}
 for(const b of foeShots){g.fillStyle=b.heavy?'#ffac68':'#ff66ae';g.beginPath();g.arc(b.x,b.y,b.heavy?4.1:3.3,0,TAU);g.fill();g.fillStyle='#fff0d8';g.fillRect(b.x-1,b.y-1,2,2);}
 for(const z of sparks){g.globalAlpha=z.life/z.max;g.fillStyle=z.tone;g.fillRect(z.x,z.y,z.r,z.r);}
 g.globalAlpha=1;
 if(state==='play'&&(nextWaveIn>0||waveCue>0)){
  g.fillStyle='rgba(9,13,27,.83)';g.fillRect(W/2-148,H*.45-23,296,48);g.lineWidth=1;g.strokeStyle='#477585';g.strokeRect(W/2-148,H*.45-23,296,48);g.textAlign='center';g.textBaseline='middle';g.fillStyle='#a3ffec';g.font='700 20px ui-monospace, monospace';g.fillText(nextWaveIn>0?'WAVE '+wave+' CLEARED':'WAVE '+String(wave).padStart(2,'0'),W/2,H*.45);
 }
 if(flash>0){g.strokeStyle='rgba(255,88,126,'+(!motion?.matches?flash*2:.3)+')';g.lineWidth=10;g.strokeRect(5,5,W-10,H-10);}
 g.restore();
}
function tick(now){
 const dt=Math.min(.032,Math.max(0,(now-(last||now))/1000));last=now;
 if(!document.hidden&&state!=='pause'){
  elapsed+=dt;flash=Math.max(0,flash-dt);shake=Math.max(0,shake-dt);recoil=Math.max(0,recoil-dt);shotKick=Math.max(0,shotKick-dt);
  if(state==='play')simulate(dt);
  for(const z of sparks){z.x+=z.dx*dt;z.y+=z.dy*dt;z.life-=dt;}
  sparks=sparks.filter(z=>z.life>0);
 }
 draw(elapsed);frame=requestAnimationFrame(tick);
}
layout();updateHud();menu('Rift Runner','Move and aim independently. Dodge enemy fire and survive as many waves as you can.','start','Launch run','ARCADE SURVIVAL');
frame=requestAnimationFrame(tick);
})();
