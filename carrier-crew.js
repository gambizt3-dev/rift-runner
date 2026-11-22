'use strict';
(() => {
 const rooms=[...document.querySelectorAll('[data-room]')];
 const get=id=>document.getElementById(id);
 const prev=get('crew-prev'),next=get('crew-next'),label=get('crew-room-label');
 const boards=[[get('crew-pinboard'),get('crew-ranks')],[get('crew-honors'),get('crew-distinction')],[get('crew-enemies'),get('crew-enemy-list')]];
 if(!rooms.length||!prev||!next||!label)return;
 let current=0;
 const navigate=step=>{
  const restoreFocus=rooms[current].contains(document.activeElement);
  current=(current+step+rooms.length)%rooms.length;
  rooms.forEach((room,i)=>{room.hidden=i!==current;});
  label.textContent=rooms[current].dataset.room;
  if(restoreFocus)(step<0?prev:next).focus({preventScroll:true});
 };
 prev.addEventListener('click',()=>navigate(-1));
 next.addEventListener('click',()=>navigate(1));
 document.addEventListener('keydown',e=>{
  if(e.defaultPrevented||boards.some(([,dialog])=>dialog?.open)||e.altKey||e.ctrlKey||e.metaKey||e.shiftKey)return;
  if(e.key==='ArrowLeft'||e.key==='ArrowRight'){
   e.preventDefault();
   navigate(e.key==='ArrowLeft'?-1:1);
  }
 });
 for(const [board,dialog] of boards){
  if(!board||!dialog)continue;
  board.addEventListener('click',()=>{if(!dialog.open)dialog.showModal();});
  dialog.addEventListener('close',()=>board.focus({preventScroll:true}));
 }
})();
