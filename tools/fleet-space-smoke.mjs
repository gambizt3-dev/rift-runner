// Local-only two-pilot test. No production tokens, data or network calls.
import {createServer} from 'node:http';
import {readFileSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import {randomBytes} from 'node:crypto';
import {handleFighterParking} from '../server/fighter-parking.mjs';
import {handleFleetSpace} from '../server/fleet-space.mjs';
const port=Number(process.env.PORT||8792),origin='http://127.0.0.1:'+port,db=new DatabaseSync(':memory:');
const hull='rift-fighter',tokens=new Map();
const fixtures={atlas:'rift-carrier',nova:'rift-carrier',ember:'bifrost',comet:'bifrost'};
for(const file of ['006_fighter_parking','010_fleet_space'])
 db.exec(readFileSync(new URL('../migrations/'+file+'.sql',import.meta.url),'utf8'));
const env={GALAXY_DB:{prepare(sql){const q=db.prepare(sql);return {bind(...args){
 return {first:async()=>q.get(Object.fromEntries(args.map((a,i)=>[i+1,a])))??null};}};}}};
for(const [label,vessel] of Object.entries(fixtures)){
 const token=randomBytes(32).toString('hex');tokens.set(label,{token,vessel});
 const parked=await handleFighterParking(new Request(origin+'/api/fighter-parking/'+hull,{method:'PUT',
  headers:{authorization:'Bearer '+token,'content-type':'application/json'},body:JSON.stringify({vessel,expectedRevision:0})}),env);
 if(!parked.ok)throw Error(await parked.text());
}
const ui=readFileSync(new URL('./fleet-space-smoke.html',import.meta.url));
const server=createServer(async(req,res)=>{
 try{
  const url=new URL(req.url,origin);
  res.setHeader('Cache-Control','no-store');
  if(url.pathname==='/'){res.setHeader('Content-Type','text/html; charset=utf-8');res.end(ui);return;}
  if(url.pathname==='/fixture'){
   const fixture=tokens.get(url.searchParams.get('pilot'));
   res.statusCode=fixture?200:404;res.setHeader('Content-Type','application/json');res.end(JSON.stringify(fixture??{}));return;
  }
  if(!url.pathname.startsWith('/api/fleet-space/')){res.statusCode=404;res.end();return;}
  const chunks=[];let size=0;
  for await(const data of req){size+=data.length;if(size>1024){res.statusCode=413;res.end();return;}chunks.push(data);}
  const request=new Request(url,{method:req.method,headers:req.headers,
   ...(size&&req.method!=='GET'&&req.method!=='HEAD'?{body:Buffer.concat(chunks)}:{})});
  const reply=await handleFleetSpace(request,env);
  if(!reply){res.statusCode=404;res.end();return;}
  res.writeHead(reply.status,Object.fromEntries(reply.headers));res.end(await reply.text());
 }catch{res.statusCode=500;res.end('Local test failed');}
});
server.listen(port,'127.0.0.1',()=>console.log('Rift Runner local test:',origin));
