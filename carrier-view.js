(() => {
 const picker=document.getElementById('carrier-views'),scene=document.getElementById('carrier-scene');
 const exterior=document.getElementById('carrier-exterior-image'),top=document.getElementById('carrier-top-image');
 const label=document.getElementById('carrier-angle-label');
 if(!picker||!scene||!exterior||!top||!label)return;
 function updateView(){
  const next=picker.querySelector('input[name="carrier-angle"]:checked')?.value;
  if(next!=='exterior'&&next!=='top')return;
  const overhead=next==='top';
  scene.dataset.angle=next;
  exterior.hidden=overhead;
  top.hidden=!overhead;
  label.textContent=overhead?'Top view':'Exterior view';
 }
 picker.addEventListener('change',updateView);
 updateView();
 picker.hidden=false;
})();
