import { createServer, type Server } from 'node:http';
import { randomBytes, randomUUID, createHmac, timingSafeEqual } from 'node:crypto';
import { WebSocketServer, WebSocket } from 'ws';
import type { Config } from './config.js';

export const MAX_MESSAGE = 1024 * 1024;

// Per-command-category timeout budgets (ms). Bridge.request() accepts an
// optional override so Engine can pass the command's timeout directly.
export const TIMEOUT_READ   = 10_000;   // read-only, instant
export const TIMEOUT_EDIT   = 20_000;   // simple drawing / layer / etc.
export const TIMEOUT_EXPORT = 60_000;   // single-file export
export const TIMEOUT_HEAVY  = 120_000;  // vyi.export, sprite.build_animation
export const TIMEOUT_DEFAULT = 20_000;

// Heartbeat: ping every N ms, close zombie connection if pong not received within PONG_WAIT ms.
// Also send an application-level TEXT heartbeat that Lua can observe for UI freshness tracking.
const PING_INTERVAL      = 15_000;
const PONG_WAIT          = 10_000;
const HEARTBEAT_INTERVAL = 30_000; // TEXT heartbeat visible to Lua

export class Bridge {
 private http: Server;
 private wss: WebSocketServer;
 private peer?: WebSocket;
 private busy = false;
 private uncertain = false;
 private lastConnectionError?: string;
 private pending?: { id: string; resolve: (v: any) => void; reject: (e: Error) => void; timer: NodeJS.Timeout };
 private clientInfo?: { name: string; version: string };
 private pingInterval?: NodeJS.Timeout;
 private pongTimer?: NodeJS.Timeout;
 private textHeartbeatInterval?: NodeJS.Timeout;

 constructor(private config: Config) {
  this.http = createServer((_q, r) => { r.writeHead(404); r.end(); });
  this.wss = new WebSocketServer({ noServer: true, maxPayload: MAX_MESSAGE, perMessageDeflate: false });
  this.http.on('upgrade', (req, socket, head) => {
   // Authentication below is the trust boundary. Aseprite builds may send an
   // Origin header even though they are native clients, so do not reject it.
   const localHost = req.headers.host === `127.0.0.1:${this.config.port}` || req.headers.host === `localhost:${this.config.port}`;
   if (req.url !== '/aseprite' || !localHost) {
    this.lastConnectionError = `Rejected local connection (host=${req.headers.host ?? 'missing'}, path=${req.url ?? 'missing'}).`;
    socket.end('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n');
    return;
   }
   if (this.wss.clients.size >= 2) { socket.destroy(); return; }
   this.wss.handleUpgrade(req, socket, head, ws => this.accept(ws));
  });
 }

 async listen() {
  const bind = () => new Promise<void>((res, rej) => {
   this.http.once('error', rej);
   this.http.listen(this.config.port, '127.0.0.1', () => { this.http.off('error', rej); res(); });
  });
  try {
   await bind();
  } catch (e: any) {
   if (e?.code === 'EADDRINUSE') {
    // Best-effort: kill any stale process on this port, then retry.
    try {
     const { exec } = await import('node:child_process');
     await new Promise<void>(resolve => {
      exec(`lsof -t -i :${this.config.port}`, (_, stdout) => {
       const pids = (stdout ?? '').trim().split('\n').filter(Boolean);
       for (const p of pids) {
        const pid = Number(p);
        if (pid && pid !== process.pid) try { process.kill(pid, 'SIGTERM'); } catch { /* ignore */ }
       }
       resolve();
      });
     });
     await new Promise(r => setTimeout(r, 600));
    } catch { /* ignore */ }
    await bind();
   } else {
    throw e;
   }
  }
 }

 private startHeartbeat(ws: WebSocket) {
  this.stopHeartbeat();
  // 1. WS protocol-level ping — detects TCP zombie connections.
  this.pingInterval = setInterval(() => {
   if (!this.peer || this.peer.readyState !== WebSocket.OPEN) return;
   this.pongTimer = setTimeout(() => {
    process.stderr.write('[aseprite-mcp] Pong timeout — zombie connection detected, forcing close for auto-reconnect\n');
    this.peer?.terminate();
   }, PONG_WAIT);
   this.peer.ping();
  }, PING_INTERVAL);
  this.pingInterval.unref();
  ws.on('pong', () => { clearTimeout(this.pongTimer); });

  // 2. Application-level TEXT heartbeat — visible to Lua for UI freshness tracking.
  // Lua responds with {type:'heartbeat_ack'} so both sides know the other is alive.
  this.textHeartbeatInterval = setInterval(() => {
   if (this.peer?.readyState === WebSocket.OPEN) {
    this.peer.send(JSON.stringify({ type: 'heartbeat', ts: Date.now() }));
   }
  }, HEARTBEAT_INTERVAL);
  this.textHeartbeatInterval.unref();
 }

 private stopHeartbeat() {
  clearInterval(this.pingInterval);
  clearTimeout(this.pongTimer);
  clearInterval(this.textHeartbeatInterval);
  this.pingInterval = undefined;
  this.pongTimer = undefined;
  this.textHeartbeatInterval = undefined;
 }

 private accept(ws: WebSocket) {
  let authenticated = false;
  const nonce = randomBytes(32).toString('hex');
  const authTimer = setTimeout(() => ws.close(1008, 'Authentication timeout'), 3000);
  authTimer.unref();
  ws.on('error', () => { /* absorbed; close event handles cleanup */ });
  ws.send(JSON.stringify({ type: 'challenge', nonce, proof: createHmac('sha256', this.config.token).update('server:' + nonce).digest('hex') }));
  ws.on('message', (data, binary) => {
   if (binary) { ws.close(1008, 'Text only'); return; }
   let m: any;
   try { m = JSON.parse(data.toString()); } catch { ws.close(1008, 'Invalid JSON'); return; }
   if (!m || typeof m !== 'object') { ws.close(1008, 'Invalid message'); return; }
   if (!authenticated) {
    const expected = createHmac('sha256', this.config.token).update('client:' + nonce).digest('hex');
    if (m.type !== 'hello' || typeof m.proof !== 'string' || !/^[a-f0-9]{64}$/.test(m.proof) || !timingSafeEqual(Buffer.from(m.proof), Buffer.from(expected))) {
     this.lastConnectionError = 'Aseprite reached the bridge, but pairing authentication failed.';
     ws.close(1008, 'Authentication failed');
     return;
    }
    if (this.peer) { ws.close(1008, 'One editor is already connected'); return; }
    authenticated = true;
    clearTimeout(authTimer);
    this.peer = ws;
    this.uncertain = false;  // auto-clear: reconnect resolves uncertain state
    this.startHeartbeat(ws);
    if (this.clientInfo) ws.send(JSON.stringify({ type: 'client', client: this.clientInfo }));
    ws.send(JSON.stringify({ type: 'ready', protocol: 1 }));
    return;
   }
   if (m.type === 'result' && this.pending?.id === m.id) {
    const p = this.pending!;
    this.pending = undefined;
    clearTimeout(p.timer);
    if (m.ok === true) p.resolve(m.result);
    else p.reject(new Error(typeof m.error === 'string' ? m.error.slice(0, 1024) : 'Editor command failed'));
   } else if (m.type === 'heartbeat_ack') {
    // Lua acknowledged our TEXT heartbeat — it is alive and responsive. No action needed.
   }
  });
  ws.on('close', () => {
   clearTimeout(authTimer);
   if (this.peer === ws) {
    this.stopHeartbeat();
    this.peer = undefined;
    // Auto-reconnect: Aseprite's WS will reconnect in 1–2 s and clear `uncertain` via accept().
    this.fail('Aseprite disconnected. Auto-reconnecting — if this persists use File → AI Connection → Connect.');
   }
  });
 }

 private fail(message: string) {
  if (this.pending) {
   clearTimeout(this.pending.timer);
   this.pending.reject(new Error(message));
   this.pending = undefined;
  }
 }

 status() {
  return {
   connected: this.peer?.readyState === WebSocket.OPEN,
   busy: this.busy,
   needsReconnect: this.uncertain,
   client: this.clientInfo,
   lastConnectionError: this.lastConnectionError,
  };
 }

 setClientInfo(info: { name: string; version: string } | undefined) {
  this.clientInfo = info;
  if (this.peer?.readyState === WebSocket.OPEN && info)
   this.peer.send(JSON.stringify({ type: 'client', client: info }));
 }

 async request(payload: unknown, timeoutMs = TIMEOUT_DEFAULT): Promise<any> {
  if (this.busy) throw new Error('Another operation is running. Wait for it to finish.');
  if (this.uncertain) throw new Error('Previous operation timed out. Aseprite is auto-reconnecting — wait a moment and retry.');
  if (!this.peer || this.peer.readyState !== WebSocket.OPEN)
   throw new Error('Open Aseprite and choose File → AI Connection → Connect. Only one AI client can control this bridge at a time.');
  const id = randomUUID();
  const data = JSON.stringify({ type: 'request', id, payload });
  if (Buffer.byteLength(data) > MAX_MESSAGE) throw new Error('Request exceeds 1 MiB. Split it into smaller batches.');
  this.busy = true;
  try {
   return await new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
     this.uncertain = true;
     this.fail('Editor timed out. The operation may have completed; it was NOT retried. Aseprite is auto-reconnecting — check Aseprite then retry.');
    }, timeoutMs);
    this.pending = { id, resolve, reject, timer };
    this.peer!.send(data, error => {
     if (error) this.fail('Could not send to Aseprite. Reconnecting...');
    });
   });
  } finally {
   this.busy = false;
  }
 }

 async close() {
  this.stopHeartbeat();
  this.fail('Server stopped.');
  for (const ws of this.wss.clients) try { ws.terminate(); } catch { /* ignore */ }
  if (typeof (this.http as any).closeAllConnections === 'function') try { (this.http as any).closeAllConnections(); } catch { /* ignore */ }
  await new Promise<void>(r => this.wss.close(() => r()));
  await new Promise<void>(r => this.http.close(() => r()));
 }
}
