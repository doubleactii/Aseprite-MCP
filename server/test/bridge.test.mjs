import test from 'node:test';
import assert from 'node:assert/strict';
import {once} from 'node:events';
import {createServer} from 'node:net';
import {createHmac,randomBytes} from 'node:crypto';
import {WebSocket} from 'ws';
import {Bridge} from '../build/bridge.js';
async function freePort(){const s=createServer();s.listen(0,'127.0.0.1');await once(s,'listening');const port=s.address().port;await new Promise(r=>s.close(r));return port;}
async function fixture(){const config={port:await freePort(),token:randomBytes(32).toString('hex')};const bridge=new Bridge(config);await bridge.listen();return {config,bridge};}
async function peer(config,token=config.token){const ws=new WebSocket(`ws://127.0.0.1:${config.port}/aseprite`);ws.on('error',()=>{});const [raw]=await once(ws,'message');const challenge=JSON.parse(raw.toString());assert.equal(challenge.proof,createHmac('sha256',config.token).update('server:'+challenge.nonce).digest('hex'));ws.send(JSON.stringify({type:'hello',proof:createHmac('sha256',token).update('client:'+challenge.nonce).digest('hex')}));return ws;}
test('mutual auth, request correlation, serial execution and reconnect',async()=>{
 const {config,bridge}=await fixture();try{
 const bad=await peer(config,'wrong');await once(bad,'close');assert.equal(bridge.status().connected,false);
 const ws=await peer(config);await once(ws,'message');assert.equal(bridge.status().connected,true);
 const message=once(ws,'message');const result=bridge.request({commands:[]});await assert.rejects(bridge.request({}),/running/);const [raw]=await message;const request=JSON.parse(raw.toString());
 ws.send(JSON.stringify({type:'result',id:'wrong',ok:true,result:'ignored'}));ws.send(JSON.stringify({type:'result',id:request.id,ok:true,result:{worked:true}}));assert.deepEqual(await result,{worked:true});
 const duplicate=await peer(config);await once(duplicate,'close');assert.equal(bridge.status().connected,true);
 ws.close();await once(ws,'close');await new Promise(r=>setTimeout(r,10));assert.equal(bridge.status().connected,false);
 const next=await peer(config);await once(next,'message');assert.equal(bridge.status().connected,true);next.terminate();
 }finally{await bridge.close();}
});
test('native origins are authenticated instead of rejected',async()=>{
 const {config,bridge}=await fixture();try{const ws=new WebSocket(`ws://127.0.0.1:${config.port}/aseprite`,{origin:'app://aseprite'});const [raw]=await once(ws,'message');const challenge=JSON.parse(raw.toString());ws.send(JSON.stringify({type:'hello',proof:createHmac('sha256',config.token).update('client:'+challenge.nonce).digest('hex')}));await once(ws,'message');assert.equal(bridge.status().connected,true);ws.terminate();}finally{await bridge.close();}
});
test('timeout is never replayed and requires explicit reconnect',async()=>{
 const {config,bridge}=await fixture();try{const ws=await peer(config);await once(ws,'message');let requests=0;ws.on('message',()=>requests++);await assert.rejects(bridge.request({},30),/NOT retried/);assert.equal(requests,1);await assert.rejects(bridge.request({}),/timed out/);assert.equal(bridge.status().needsReconnect,true);ws.terminate();}finally{await bridge.close();}
});
