(() => {
 const picker=document.getElementById('carrier-views'),scene=document.getElementById('carrier-scene');
 const frames=['exterior','mid-1','mid-2','top'].map(view=>document.getElementById('carrier-'+view+'-image'));
 const label=document.getElementById('carrier-angle-label'),motion=globalThis.matchMedia?.('(prefers-reduced-motion: reduce)');
 if(!picker||!scene||!frames[0]||!frames[3]||!label)return;
 const lastFrame=3,frameMs=240;
 let target=0,position=0,pending=null,previousTime=null;
 function render(){
  frames.forEach((image,index)=>{
   if(!image)return;
   const opacity=Math.max(0,1-Math.abs(position-index)),visible=opacity>0;
   image.hidden=!visible;
   if(image.style)image.style.opacity=String(opacity);
   image.setAttribute?.('aria-hidden',String(index!==target||!visible));
  });
  const lightAngle=position<1.5?'exterior':'top';
  if(scene.dataset.lightAngle!==lightAngle)scene.dataset.lightAngle=lightAngle;
  // The bridge, four engine glows and bay lights move while dimmed so
  // they stay attached to the silhouette at both end views.
  scene.style?.setProperty('--carrier-angle-illumination',(1-.78*Math.sin(Math.PI*position/lastFrame)).toFixed(3));
 }
 function snap(){
  if(pending!==null)globalThis.cancelAnimationFrame?.(pending);
  pending=previousTime=null;position=target;render();
 }
 function frame(now){
  pending=null;
  const elapsed=previousTime===null?0:Math.max(0,now-previousTime);previousTime=now;
  const step=Math.min(Math.abs(target-position),elapsed/frameMs);
  position+=Math.sign(target-position)*step;
  if(Math.abs(target-position)<1e-7){snap();return;}
  render();pending=globalThis.requestAnimationFrame(frame);
 }
 function updateView(initial=false){
  const next=picker.querySelector('input[name="carrier-angle"]:checked')?.value;
  if(next!=='exterior'&&next!=='top')return;
  target=next==='top'?lastFrame:0;
  scene.dataset.angle=next;
  label.textContent=next==='top'?'Top view':'Exterior view';
  const ready=frames.every(image=>image?.complete&&image.naturalWidth>0);
  if(initial||motion?.matches||!ready||typeof globalThis.requestAnimationFrame!=='function'||position===target){snap();return;}
  // There is only one RAF. Reversing changes its destination, not the
  // displayed blend or the loaded frame sequence.
  if(pending===null){
   previousTime=globalThis.performance?.now?.()??null;
   pending=globalThis.requestAnimationFrame(frame);
  }
 }
 picker.addEventListener('change',()=>updateView());
 motion?.addEventListener?.('change',event=>{if(event.matches)snap();});
 updateView(true);
 picker.hidden=false;
})();
