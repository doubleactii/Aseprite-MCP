import { createServer, type Server } from 'node:http';
import { randomBytes, randomUUID, createHmac, timingSafeEqual } from 'node:crypto';
import { WebSocketServer, WebSocket } from 'ws';
import type { Config } from './config.js';
export const MAX_MESSAGE=1024*1024;
export class Bridge {
 private http:Server;private wss:WebSocketServer;private peer?:WebSocket;private busy=false;private uncertain=false;
 private pending?:{id:string;resolve:(v:any)=>void;reject:(e:Error)=>void;timer:NodeJS.Timeout};
 constructor(private config:Config,private timeoutMs=15000){
  this.http=createServer((_q,r)=>{r.writeHead(404);r.end();});
  this.wss=new WebSocketServer({noServer:true,maxPayload:MAX_MESSAGE,perMessageDeflate:false});
  this.http.on('upgrade',(req,socket,head)=>{
   // Browser pages are never valid bridge peers, even on localhost.
   if(req.headers.origin || req.url!=='/aseprite' || req.headers.host!==`127.0.0.1:${this.config.port}`){socket.end('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n');return;}
   if(this.wss.clients.size>=2){socket.destroy();return;}
   this.wss.handleUpgrade(req,socket,head,ws=>this.accept(ws));
  });
 }
 async listen(){await new Promise<void>((res,rej)=>{this.http.once('error',rej);this.http.listen(this.config.port,'127.0.0.1',()=>{this.http.off('error',rej);res();});});}
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
    if(m.type!=='hello' || typeof m.proof!=='string' || !/^[a-f0-9]{64}$/.test(m.proof) || !timingSafeEqual(Buffer.from(m.proof),Buffer.from(expected))){ws.close(1008,'Authentication failed');return;}
    if(this.peer){ws.close(1008,'One editor is already connected');return;}
    authenticated=true;clearTimeout(timer);this.peer=ws;this.uncertain=false;
    ws.send(JSON.stringify({type:'ready',protocol:1}));return;
   }
   if(m.type==='result' && this.pending?.id===m.id){
    const p=this.pending!;this.pending=undefined;clearTimeout(p.timer);
    if(m.ok===true)p.resolve(m.result);else p.reject(new Error(typeof m.error==='string'?m.error.slice(0,1024):'Editor command failed'));
   }
  });
  ws.on('close',()=>{clearTimeout(timer);if(this.peer===ws){this.peer=undefined;this.fail('Aseprite disconnected. Inspect the artwork before retrying; the last edit may have completed.');}});
 }
 private fail(message:string){if(this.pending){clearTimeout(this.pending.timer);this.pending.reject(new Error(message));this.pending=undefined;}}
 status(){return {connected:this.peer?.readyState===WebSocket.OPEN,busy:this.busy,needsReconnect:this.uncertain};}
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
 async close(){this.fail('Server stopped.');for(const ws of this.wss.clients)ws.terminate();await new Promise<void>(r=>this.wss.close(()=>r()));await new Promise<void>(r=>this.http.close(()=>r()));}
}
