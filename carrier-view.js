(() => {
 const picker=document.getElementById('carrier-views'),scene=document.getElementById('carrier-scene');
 const sky=document.querySelector?.('.carrier-view');
 const frames=['exterior','extra-1','mid-1','extra-2','mid-2','extra-3','top'].map(view=>document.getElementById('carrier-'+view+'-image'));
 const front=document.getElementById('carrier-front-image');
 const label=document.getElementById('carrier-angle-label'),motion=globalThis.matchMedia?.('(prefers-reduced-motion: reduce)');
 const last=frames.length-1,duration=1040,waitLimit=440;
 const parallax=[['near-x',-20],['near-y',36],['far-x',-8],['far-y',14]];
 if(!picker||!scene||!frames[0]||!frames[last]||!label)return;
 const usable=image=>!!image?.complete&&image.naturalWidth>0;
 const nameOf=end=>end===2?'front':end===1?'top':'exterior';
 const imageFor=end=>end===2?front:frames[end*last];
 let target=0,progress=0,available=[0],pending=null,previousTime=null,waiting=null;
 function selectActual(){
  const name=nameOf(target),radio=picker.querySelector('input[value="'+name+'"]');
  if(radio)radio.checked=true;
 }
 function render(){
  const frontVisible=target===2;
  if(front){
   front.hidden=!frontVisible;
   front.setAttribute('aria-hidden',String(!frontVisible));
  }
  if(frontVisible){
   for(const image of frames){
    if(!image)continue;
    image.hidden=true;
    image.setAttribute('aria-hidden','true');
   }
   if(sky)for(const [name,travel] of parallax)
    sky.style.setProperty('--carrier-sky-'+name,(-travel*.55).toFixed(2)+'px');
   return;
  }
  const eased=.5-.5*Math.cos(Math.PI*progress),sprite=eased*last,nearest=Math.round(sprite);
  if(sky){
   for(const [name,travel] of parallax)
    sky.style.setProperty('--carrier-sky-'+name,(travel*eased).toFixed(2)+'px');
  }
  const pose=Math.abs(sprite-nearest)<1e-8?nearest:sprite;
  let left=available[0],right=left;
  for(const index of available){
   right=index;
   if(index>=pose)break;
   left=index;
  }
  const mix=right===left?0:(pose-left)/(right-left);
  frames.forEach((image,index)=>{
   if(!image)return;
   const opacity=index===left?1-mix:index===right?mix:0,visible=opacity>0;
   image.hidden=!visible;
   image.style.opacity=String(opacity);
   image.setAttribute('aria-hidden',String(index!==target*last||!visible));
  });
  const lightAngle=pose<last/2?'exterior':'top';
  if(scene.dataset.lightAngle!==lightAngle)scene.dataset.lightAngle=lightAngle;
  scene.style.setProperty('--carrier-angle-illumination',(1-.78*Math.sin(Math.PI*progress)).toFixed(3));
 }
 function snap(){
  if(pending!==null)globalThis.cancelAnimationFrame?.(pending);
  pending=previousTime=null;progress=target===2?0:target;available=[progress*last];render();
 }
 function frame(now){
  pending=null;
  const elapsed=previousTime===null?0:Math.max(0,now-previousTime);previousTime=now;
  const step=Math.min(Math.abs(target-progress),elapsed/duration);
  progress+=Math.sign(target-progress)*step;
  if(Math.abs(target-progress)<1e-7){snap();return;}
  render();pending=globalThis.requestAnimationFrame(frame);
 }
 function travel(next,initial=false){
  const switchingFront=target===2||next===2;
  target=next;
  scene.dataset.angle=nameOf(next);
  label.textContent=next===2?'Front view':next===1?'Top view':'Exterior view';
  if(initial||switchingFront||motion?.matches||typeof globalThis.requestAnimationFrame!=='function'||progress===target||!usable(frames[0])||!usable(frames[last])){
   snap();return;
  }
  // Hold the selected subset and phase during a run. Missing optional poses
  // are skipped, and rapid reversals reuse the exact displayed blend.
  if(pending===null){
   available=frames.flatMap((image,index)=>usable(image)?[index]:[]);
   previousTime=globalThis.performance?.now?.()??null;
   pending=globalThis.requestAnimationFrame(frame);
  }
 }
 function clearWait(){
  if(!waiting)return;
  const {image,loaded,failed,timer}=waiting;
  waiting=null;
  image.removeEventListener('load',loaded);image.removeEventListener('error',failed);
  globalThis.clearTimeout(timer);
 }
 function waitForImage(image,next){
  if(!image||image.complete||typeof globalThis.setTimeout!=='function'){selectActual();return;}
  const request={image,
   loaded(){if(waiting!==request)return;clearWait();if(usable(image))travel(next);else selectActual();},
   failed(){if(waiting!==request)return;clearWait();selectActual();}};
  waiting=request;
  image.addEventListener('load',request.loaded);image.addEventListener('error',request.failed);
  request.timer=globalThis.setTimeout(request.failed,next===2?5000:waitLimit);
  image.fetchPriority='high';
 }
 function updateView(initial=false){
  const value=picker.querySelector('input[name="carrier-angle"]:checked')?.value;
  if(value!=='exterior'&&value!=='top'&&value!=='front')return;
  clearWait();
  const next=value==='front'?2:value==='top'?1:0,image=imageFor(next);
  if(initial){if(next!==0&&usable(image))travel(next,true);else{travel(0,true);selectActual();}return;}
  if(next===target)return;
  if(usable(image))travel(next);
  else waitForImage(image,next);
 }
 picker.addEventListener('change',()=>updateView());
 motion?.addEventListener?.('change',event=>{if(event.matches)snap();});
 updateView(true);
 picker.hidden=false;
})();
