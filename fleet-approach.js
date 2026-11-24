'use strict';
(()=>{
 const sectorWidth=2750,sectorIndex=Object.freeze({reach:0,frontier:1});
 const encounter=Object.freeze({sector:'reach',x:365,y:1160});
 const routes=Object.freeze({
  west:Object.freeze({entryEdge:'west',exitEdge:'east',heading:0}),
  east:Object.freeze({entryEdge:'east',exitEdge:'west',heading:Math.PI}),
  north:Object.freeze({entryEdge:'north',exitEdge:'south',heading:Math.PI/2}),
  south:Object.freeze({entryEdge:'south',exitEdge:'north',heading:-Math.PI/2})
 });
 const known=point=>point&&Object.hasOwn(sectorIndex,point.sector)&&Number.isFinite(point.x)&&
  point.x>=0&&point.x<=sectorWidth&&Number.isFinite(point.y)&&point.y>=-850&&point.y<=2660;
 function plan(sample,point=encounter){
  if(!known(sample)||!['holding','cruising','transit'].includes(sample.phase)||!known(point))return null;
  // Chart Y increases south; Frontier is immediately east of the Outer Reach.
  const x=(sectorIndex[sample.sector]-sectorIndex[point.sector])*sectorWidth+sample.x-point.x;
  const y=sample.y-point.y;
  if(Math.max(Math.abs(x),Math.abs(y))<1)return null;
  // Freeze dominant-axis direction for each sortie. Exact diagonals use X.
  return routes[Math.abs(x)>=Math.abs(y)?(x<0?'west':'east'):(y<0?'north':'south')];
 }
 window.RiftFleetApproach=Object.freeze({plan,encounter});
})();
