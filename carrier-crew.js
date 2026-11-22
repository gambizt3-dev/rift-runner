'use strict';
(() => {
 const rooms=[...document.querySelectorAll('[data-room]')];
 const get=id=>document.getElementById(id);
 const prev=get('crew-prev'),next=get('crew-next'),label=get('crew-room-label');
 const pinboard=get('crew-pinboard'),ranks=get('crew-ranks');
 if(!rooms.length||!prev||!next||!label||!pinboard||!ranks)return;
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
  if(e.defaultPrevented||ranks.open||e.altKey||e.ctrlKey||e.metaKey||e.shiftKey)return;
  if(e.key==='ArrowLeft'||e.key==='ArrowRight'){
   e.preventDefault();
   navigate(e.key==='ArrowLeft'?-1:1);
  }
 });
 pinboard.addEventListener('click',()=>{if(!ranks.open)ranks.showModal();});
 ranks.addEventListener('close',()=>pinboard.focus({preventScroll:true}));
})();
