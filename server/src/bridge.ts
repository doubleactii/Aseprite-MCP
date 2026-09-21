import { createServer, type Server } from 'node:http';
import { randomBytes, randomUUID, createHmac, timingSafeEqual } from 'node:crypto';
import { WebSocketServer, WebSocket } from 'ws';
import type { Config } from './config.js';
export const MAX_MESSAGE=1024*1024;
export class Bridge {
 private http:Server;private wss:WebSocketServer;private peer?:WebSocket;private busy=false;private uncertain=false;private lastConnectionError?:string;
 private pending?:{id:string;resolve:(v:any)=>void;reject:(e:Error)=>void;timer:NodeJS.Timeout};
 private clientInfo?:{name:string;version:string};
 constructor(private config:Config,private timeoutMs=60000){
  this.http=createServer((_q,r)=>{r.writeHead(404);r.end();});
  this.wss=new WebSocketServer({noServer:true,maxPayload:MAX_MESSAGE,perMessageDeflate:false});
  this.http.on('upgrade',(req,socket,head)=>{
   // Authentication below is the trust boundary. Aseprite builds may send an
   // Origin header even though they are native clients, so do not reject it.
   const localHost=req.headers.host===`127.0.0.1:${this.config.port}`||req.headers.host===`localhost:${this.config.port}`;
   if(req.url!=='/aseprite' || !localHost){this.lastConnectionError=`Rejected local connection (host=${req.headers.host??'missing'}, path=${req.url??'missing'}).`;socket.end('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n');return;}
   if(this.wss.clients.size>=2){socket.destroy();return;}
   this.wss.handleUpgrade(req,socket,head,ws=>this.accept(ws));
  });
 }
 async listen(){
  const bind=()=>new Promise<void>((res,rej)=>{
   this.http.once('error',rej);
   this.http.listen(this.config.port,'127.0.0.1',()=>{this.http.off('error',rej);res();});
  });
  try{
   await bind();
  }catch(e:any){
   if(e?.code==='EADDRINUSE'){
    try{
     const {execSync}=await import('node:child_process');
     const pids=execSync(`lsof -t -i :${this.config.port}`,{encoding:'utf8',stdio:['pipe','pipe','ignore']}).trim().split('\n').filter(Boolean);
     for(const p of pids){
      const pid=Number(p);
      if(pid&&pid!==process.pid){
       try{process.kill(pid,'SIGTERM');}catch{}
      }
     }
     await new Promise(r=>setTimeout(r,500));
    }catch{}
    await bind();
   }else{
    throw e;
   }
  }
 }
 private accept(ws:WebSocket){
  let authenticated=false;const nonce=randomBytes(32).toString('hex');
  const timer=setTimeout(()=>ws.close(1008,'Authentication timeout'),3000);timer.unref();
  ws.on('error',()=>{});
  ws.send(JSON.stringify({type:'challenge',nonce,proof:createHmac('sha256',this.config.token).update('server:'+nonce).digest('hex')}));
  ws.on('message',(data,binary)=>{
   if(binary){ws.close(1008,'Text only');return;}
   let m:any;try{m=JSON.parse(data.toString());}catch{ws.close(1008,'Invalid JSON');return;}
   if(!m || typeof m!=='object'){ws.close(1008,'Invalid message');return;}
   if(!authenticated){
    const expected=createHmac('sha256',this.config.token).update('client:'+nonce).digest('hex');
    if(m.type!=='hello' || typeof m.proof!=='string' || !/^[a-f0-9]{64}$/.test(m.proof) || !timingSafeEqual(Buffer.from(m.proof),Buffer.from(expected))){this.lastConnectionError='Aseprite reached the bridge, but pairing authentication failed.';ws.close(1008,'Authentication failed');return;}
    if(this.peer){ws.close(1008,'One editor is already connected');return;}
    authenticated=true;clearTimeout(timer);this.peer=ws;this.uncertain=false;
    ws.send(JSON.stringify({type:'ready',protocol:1}));if(this.clientInfo)ws.send(JSON.stringify({type:'client',client:this.clientInfo}));return;
   }
   if(m.type==='result' && this.pending?.id===m.id){
    const p=this.pending!;this.pending=undefined;clearTimeout(p.timer);
    if(m.ok===true)p.resolve(m.result);else p.reject(new Error(typeof m.error==='string'?m.error.slice(0,1024):'Editor command failed'));
   }
  });
  ws.on('close',()=>{clearTimeout(timer);if(this.peer===ws){this.peer=undefined;this.fail('Aseprite disconnected. Inspect the artwork before retrying; the last edit may have completed.');}});
 }
 private fail(message:string){if(this.pending){clearTimeout(this.pending.timer);this.pending.reject(new Error(message));this.pending=undefined;}}
 status(){return {connected:this.peer?.readyState===WebSocket.OPEN,busy:this.busy,needsReconnect:this.uncertain,client:this.clientInfo,lastConnectionError:this.lastConnectionError};}
 setClientInfo(info:{name:string;version:string}|undefined){this.clientInfo=info;if(this.peer?.readyState===WebSocket.OPEN&&info)this.peer.send(JSON.stringify({type:'client',client:info}));}
 async request(payload:unknown):Promise<any>{
  if(this.busy)throw new Error('Another operation is running. Wait for it to finish.');
  if(this.uncertain)throw new Error('Previous operation timed out. Inspect Aseprite and reconnect from its AI Connection menu before continuing.');
  if(!this.peer || this.peer.readyState!==WebSocket.OPEN)throw new Error('Open Aseprite and choose File → AI Connection → Connect. Only one AI client can control this bridge at a time.');
  const id=randomUUID();const data=JSON.stringify({type:'request',id,payload});
  if(Buffer.byteLength(data)>MAX_MESSAGE)throw new Error('Request exceeds 1 MiB. Split it into smaller batches.');
  this.busy=true;
  try{return await new Promise((resolve,reject)=>{
   const timer=setTimeout(()=>{this.uncertain=true;this.fail('Editor timed out. The operation may have completed; it was NOT retried. Inspect Aseprite and reconnect.');},this.timeoutMs);
   this.pending={id,resolve,reject,timer};this.peer!.send(data,error=>{if(error)this.fail('Could not send to Aseprite. Reconnect before continuing.');});
  });}finally{this.busy=false;}
 }
 async close(){
  this.fail('Server stopped.');
  for(const ws of this.wss.clients)try{ws.terminate();}catch{}
  if(typeof (this.http as any).closeAllConnections==='function')try{(this.http as any).closeAllConnections();}catch{}
  await new Promise<void>(r=>this.wss.close(()=>r()));
  await new Promise<void>(r=>this.http.close(()=>r()));
 }
}
