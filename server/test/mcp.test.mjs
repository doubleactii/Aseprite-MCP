import test from 'node:test';
import assert from 'node:assert/strict';
import {Client} from '@modelcontextprotocol/client';
import {StdioClientTransport} from '@modelcontextprotocol/client/stdio';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {randomBytes} from 'node:crypto';
import {createServer} from 'node:net';
import {once} from 'node:events';
test('real SDK client negotiates stdio, discovers compact tools, reads guide, and reports disconnection',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'mcp-stdio-'));const net=createServer();net.listen(0,'127.0.0.1');await once(net,'listening');const port=net.address().port;await new Promise(r=>net.close(r));
 const config=join(dir,'config.json');await writeFile(config,JSON.stringify({version:1,port,token:randomBytes(32).toString('hex'),workspace:dir,allowLua:false}));
 const transport=new StdioClientTransport({command:process.execPath,args:[resolve('server/build/index.js')],env:{...process.env,ASEPRITE_MCP_CONFIG:config},stderr:'pipe'});const client=new Client({name:'test',version:'1'});
 try{await client.connect(transport);const tools=await client.listTools();assert.equal(tools.tools.length,6);assert.ok(JSON.stringify(tools).length<8000);
 const status=await client.callTool({name:'aseprite_status',arguments:{}});assert.equal(JSON.parse(status.content[0].text).connected,false);
 const discover=await client.callTool({name:'aseprite_discover',arguments:{names:['vyi.export']}});assert.equal(JSON.parse(discover.content[0].text)[0].name,'vyi.export');
 const guide=await client.readResource({uri:'aseprite://guide'});assert.match(guide.contents[0].text,/Reference images/);
 const result=await client.callTool({name:'aseprite_execute',arguments:{name:'sprite.create',args:{width:32,height:32}}});assert.equal(result.isError,true);assert.match(result.content[0].text,/Open Aseprite/);
 }finally{await client.close();await rm(dir,{recursive:true,force:true});}
});
