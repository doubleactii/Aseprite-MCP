import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,readFile,symlink,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {FilePolicy} from '../build/files.js';
import {Engine} from '../build/engine.js';
import {catalog,validateCommand} from '../build/catalog.js';
import {install,mergeJson,configureClient} from '../build/setup.js';
const temp=()=>mkdtemp(join(tmpdir(),'aseprite-test-'));
test('123 unique commands, 16 categories; strict schemas and bounds',()=>{
 assert.equal(catalog.length,123);assert.equal(new Set(catalog.map(c=>c.name)).size,123);assert.equal(new Set(catalog.map(c=>c.name.split('.')[0])).size,16);
 for(const args of [{width:0,height:32},{width:4096,height:32},{width:32,height:32,script:'evil'},{width:NaN,height:1}])assert.throws(()=>validateCommand('sprite.create',args));
 assert.throws(()=>validateCommand('__proto__',{}));assert.throws(()=>validateCommand('drawing.pixel',{x:0,y:0,color:'red'}));
});
test('files reject traversal, symlinks, hidden files, wrong types and overwrite',async()=>{
 const dir=await temp();try{const root=join(dir,'art');await mkdir(root);const files=new FilePolicy(root);await writeFile(join(root,'existing.png'),'old');
 for(const path of ['../outside.png','/tmp/x.png','a/../../x.png','.secret.png','x.exe','C:\\x.png','a//x.png'])await assert.rejects(files.stage(path,['.png']));
 await assert.rejects(files.stage('existing.png',['.png']),/exists/);
 await mkdir(join(dir,'outside'));await writeFile(join(dir,'outside','secret.png'),'secret');await symlink(join(dir,'outside'),join(root,'link'));
 await assert.rejects(files.input('link/secret.png',['.png']));await assert.rejects(files.stage('link/new.png',['.png']));
 const stage=await files.stage('new.png',['.png']);await writeFile(stage.staged,'new');assert.deepEqual(await stage.commit(),{path:'new.png',bytes:3});await stage.cleanup();assert.equal(await readFile(join(root,'new.png'),'utf8'),'new');
 const race=await files.stage('race.png',['.png']);await writeFile(race.staged,'new');await writeFile(join(root,'race.png'),'keep');await assert.rejects(race.commit());assert.equal(await readFile(join(root,'race.png'),'utf8'),'keep');await race.cleanup();
 }finally{await rm(dir,{recursive:true,force:true});}
});
test('entire batch validates before sending; unsafe Lua and file batches fail closed',async()=>{
 const root=await temp();let calls=0;const engine=new Engine({workspace:root,allowLua:false},{request:async()=>{calls++;return {ok:true};}});
 try{await assert.rejects(engine.batch([{name:'drawing.pixel',args:{x:0,y:0,color:'#ffffff'}},{name:'layer.delete',args:{}}]));assert.equal(calls,0);
 await assert.rejects(engine.run('editor.lua',{code:'os.execute("x")'}),/disabled/);
 await assert.rejects(engine.batch([{name:'export.png',args:{path:'x.png'}}]));assert.equal(calls,0);
 assert.equal((await engine.batch([{name:'drawing.pixel',args:{x:0,y:0,color:'#ffffff'}}],true)).valid,true);assert.equal(calls,0);
 await engine.batch([{name:'drawing.pixel',args:{x:0,y:0,color:'#ffffff'}}]);assert.equal(calls,1);
 }finally{await rm(root,{recursive:true,force:true});}
});
test('setup is repairable and preserves existing client settings',async()=>{
 const home=await temp();try{const options={workspace:join(home,'art'),configPath:join(home,'config','config.json'),extensionDir:join(home,'extensions','aseprite-mcp-pro')};
 const a=await install(options),b=await install(options);assert.equal(a.token,b.token);assert.equal(a.allowLua,false);
 assert.equal(JSON.parse(await readFile(join(options.extensionDir,'connection.json'),'utf8')).token,a.token);
 const file=join(home,'client.json');await writeFile(file,JSON.stringify({theme:'dark',mcpServers:{other:{command:'other'}}}));await mergeJson(file,{command:'node'});const result=JSON.parse(await readFile(file,'utf8'));assert.equal(result.theme,'dark');assert.equal(result.mcpServers.other.command,'other');
 await configureClient('codex',options.configPath,home);await configureClient('codex',options.configPath,home);const toml=await readFile(join(home,'.codex','config.toml'),'utf8');assert.equal(toml.match(/\[mcp_servers.aseprite-mcp-pro\]/g).length,1);
 }finally{await rm(home,{recursive:true,force:true});}
});
