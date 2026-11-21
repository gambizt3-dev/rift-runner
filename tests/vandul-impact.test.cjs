'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {setup,tick}=require('./ballistic.test.cjs');
async function used(cover=false){const q=setup();q.cover(cover);q.open('start');await tick();q.step();q.target(true);q.inspect().cones.splice(0);return q;}
function verticalLaser(q,x,y){q.inspect().vandulLasers.push({x,y,vx:0,vy:335,a:Math.PI/2,life:1,damage:2});}
test('Vandul has a fitted hull, drive and pulse laser; player hit pushes without increasing damage',async()=>{
 const q=await used(),{p,vandulLoadout:l,vandulProfile:v}=q.inspect();
 assert.equal(l.hull,'crescent-hull');assert.equal(l.engine,'vandul-drive');assert.equal(l.primary,'pulse-laser');
 assert.equal(l.secondary,null);assert.equal(l.shield,null);
 assert.equal(v.hullHp,20);assert.equal(v.weight,100);assert.equal(v.speed,63);assert.equal(v.driveBy.topSpeed,190);
 assert.equal(v.laser.damage,2);assert.ok(v.laser.push>0);
 const before=p.y;verticalLaser(q,p.x,p.y-20);q.step(5);
 assert.equal(p.hp,18);assert.ok(p.vy>10&&p.vy<40,'mass-scaled target movement');
 assert.ok(p.y>before+1);assert.equal(q.inspect().vandulLasers.length,0);
});
test('cone stops pulse and receives push and spin; asteroid still gets smallest material-scaled nudge',async()=>{
 const coneCase=await used(),{p,cones}=coneCase.inspect();
 const cone={x:p.x,y:p.y-75,r:15,vx:0,vy:0,angle:0,spin:0,wallFx:0,hitGlow:0,invMass:1};
 cones.push(cone);const originalY=cone.y;
 verticalLaser(coneCase,cone.x+7,cone.y-20);coneCase.step(7);
 assert.equal(p.hp,20);assert.ok(cone.vy>35);assert.ok(Math.abs(cone.spin)>.1);assert.ok(cone.y>originalY+2);
 const rockCase=await used(true),{asteroids}=rockCase.inspect(),rock=asteroids[1],before=rock.y;
 verticalLaser(rockCase,rock.x,rock.y-rock.r-5);rockCase.step(8);
 assert.ok(rock.vy>0&&rock.vy<4);assert.ok(rock.y>before);assert.equal(rockCase.inspect().p.hp,20);
});
