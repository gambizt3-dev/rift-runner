const {test}=require('node:test');
const {strict:assert}=require('node:assert');
const {readFileSync}=require('node:fs');
const {join}=require('node:path');
const vm=require('node:vm');
const game=readFileSync(join(__dirname,'../dist/game.js'),'utf8');
test('Only fighters and vessels are eligible to dock at multicrew ships',()=>{
 const rules=game.match(/const dockableMulticrewClasses=[^\n]+\nconst canDockShipClass=[^\n]+/);
 assert.ok(rules);
 const policy=vm.runInNewContext(rules[0]+'\ncanDockShipClass');
 for(const host of ['corvette','frigate','cruiser','carrier']){
  for(const hull of ['fighter','vessel'])assert.equal(policy(hull,host),true);
  for(const hull of ['corvette','frigate','cruiser','carrier',undefined])assert.equal(policy(hull,host),false);
 }
 for(const host of ['fighter','vessel',undefined])assert.equal(policy('fighter',host),false);
 assert.match(game,/function capitalDockCheck\(\)\{[^\n]*\n[^\n]*canDockShipClass\(currentDockingShipClass\(\),c.vessel.hullClass\)/);
 assert.match(game,/function resoluteDockPose\(\)\{[\s\S]{0,390}canDockShipClass\(currentDockingShipClass\(\),'corvette'\)/);
});
