import { mkdir, readFile, writeFile, copyFile, cp, access, stat, chmod, lstat, realpath, rm } from 'node:fs/promises';
import { homedir, platform } from 'node:os';
import { join, dirname, resolve } from 'node:path';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { randomBytes } from 'node:crypto';
import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import { configSchema, defaultConfig, loadConfig, type Config } from './config.js';
const project=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const exists=async(p:string)=>access(p).then(()=>true,()=>false);
export function extensionPath(home=homedir(),os=platform()){
 if(os==='win32')return join(process.env.APPDATA??join(home,'AppData','Roaming'),'Aseprite','extensions','aseprite-mcp-pro');
 if(os==='darwin')return join(home,'Library','Application Support','Aseprite','extensions','aseprite-mcp-pro');
 return join(process.env.XDG_CONFIG_HOME??join(home,'.config'),'aseprite','extensions','aseprite-mcp-pro');
}
async function safeDir(path:string){await mkdir(path,{recursive:true,mode:0o700});if((await lstat(path)).isSymbolicLink())throw new Error(`Refusing symlink directory: ${path}`);}
async function backup(path:string){if(await exists(path)){if((await lstat(path)).isSymbolicLink())throw new Error('Refusing to replace a symlink.');await copyFile(path,`${path}.backup-${Date.now()}`);}}
export async function mergeJson(file:string,entry:unknown){
 await safeDir(dirname(file));let value:Record<string,any>={};if(await exists(file)){value=JSON.parse(await readFile(file,'utf8'));if(!value||Array.isArray(value)||typeof value!=='object')throw new Error('Client config must be an object.');}
 if(value.mcpServers && (typeof value.mcpServers!=='object'||Array.isArray(value.mcpServers)))throw new Error('Client mcpServers config is invalid.');
 value.mcpServers={...value.mcpServers,'aseprite-mcp-pro':entry};await backup(file);await writeFile(file,JSON.stringify(value,null,2)+'\n',{mode:0o600});
}
export function clientEntry(configPath:string){const bundled=join(project,'runtime','node');const command=existsSync(bundled)?bundled:process.execPath;return {command,args:[join(project,'server','build','index.js')],env:{ASEPRITE_MCP_CONFIG:configPath}};}
export async function install(options:{workspace:string;configPath:string;extensionDir:string;port?:number}){
 await safeDir(options.workspace);const workspace=await realpath(options.workspace);await safeDir(dirname(options.configPath));
 let old:Config|undefined;
 if(await exists(options.configPath)){try{old=configSchema.parse(JSON.parse(await readFile(options.configPath,'utf8')))}catch{old=undefined;}}
 const config:Config={version:1,workspace,port:options.port??old?.port??19876,token:old?.token??randomBytes(32).toString('hex'),allowLua:false,autoOpenGenerated:old?.autoOpenGenerated??true};
 // Never replace another extension or a symlink. Existing connection secrets stay stable on repair.
 if(await exists(options.extensionDir)){const manifest=JSON.parse(await readFile(join(options.extensionDir,'package.json'),'utf8'));if(manifest.name!=='aseprite-mcp-pro')throw new Error('Destination belongs to another extension.');}
 await safeDir(options.extensionDir);
 for(const obs of ['clusters.lua']){const p=join(options.extensionDir,obs);if(await exists(p)&&!(await lstat(p)).isSymbolicLink())await rm(p,{force:true});}
 for(const name of ['__info.json','package.json','main.lua','commands.lua','runtime.lua','crypto.lua','vyi.lua','palettes.json','catalog.json']){const source=join(project,'extension',name);const dest=join(options.extensionDir,name);if(await exists(dest)&&(await lstat(dest)).isSymbolicLink())throw new Error('Refusing symlink extension file.');await copyFile(source,dest);const [expected,installed]=await Promise.all([readFile(source),readFile(dest)]);if(!expected.equals(installed))throw new Error(`Extension install verification failed for ${name}.`);}
 await backup(options.configPath);await writeFile(options.configPath,JSON.stringify(config,null,2)+'\n',{mode:0o600});await chmod(options.configPath,0o600);
 const connection=join(options.extensionDir,'connection.json');if(await exists(connection) && (await lstat(connection)).isSymbolicLink())throw new Error('Refusing a symlink connection file.');await writeFile(connection,JSON.stringify(config)+'\n',{mode:0o600});await chmod(connection,0o600);
 return config;
}
export async function configureClient(client:string,configPath:string,home=homedir()){
 const entry=clientEntry(configPath);
 if(client==='codex'){
  const file=join(home,'.codex','config.toml');await safeDir(dirname(file));const text=await exists(file)?await readFile(file,'utf8'):'';
  const block=`\n[mcp_servers.aseprite-mcp-pro]\ncommand = ${JSON.stringify(entry.command)}\nargs = ${JSON.stringify(entry.args)}\n\n[mcp_servers.aseprite-mcp-pro.env]\nASEPRITE_MCP_CONFIG = ${JSON.stringify(configPath)}\n`;
  if(text.includes('[mcp_servers.aseprite-mcp-pro]')){
   const cleaned=text
    .replace(/\n\[mcp_servers\.aseprite-mcp-pro\.env\][\s\S]*?(?=\n\[|\s*$)/g,'')
    .replace(/\n\[mcp_servers\.aseprite-mcp-pro\][\s\S]*?(?=\n\[|\s*$)/g,'')
    .replace(/\s*$/,'');
   const updated=cleaned+block;
   if(updated!==text){await backup(file);await writeFile(file,updated,{mode:0o600});}
   return file;
  }
  await backup(file);await writeFile(file,text+block,{mode:0o600});return file;
 }
 if(client==='claude-desktop'){
  const file=platform()==='darwin'?join(home,'Library','Application Support','Claude','claude_desktop_config.json'):platform()==='win32'?join(process.env.APPDATA??join(home,'AppData','Roaming'),'Claude','claude_desktop_config.json'):join(home,'.config','Claude','claude_desktop_config.json');await mergeJson(file,entry);return file;
 }
 if(client==='gemini'){const file=join(home,'.gemini','settings.json');await mergeJson(file,entry);return file;}
 if(client==='claude-code'){const file=join(home,'.claude.json');await mergeJson(file,entry);return file;}
 const file=join(dirname(configPath),'client-config.json');await writeFile(file,JSON.stringify({mcpServers:{'aseprite-mcp-pro':entry}},null,2));return file;
}
async function doctor(){
 console.log('\nAseprite MCP Pro — connection check\n');
 console.log(`Node: ${process.version}`);const config=await loadConfig();console.log(`Artwork folder: ${config.workspace}`);console.log(`Local bridge port: ${config.port}`);
 const dir=extensionPath();console.log(`Extension: ${await exists(join(dir,'main.lua'))?'installed':'missing — run Setup'}`);
 try{const extension=configSchema.parse(JSON.parse(await readFile(join(dir,'connection.json'),'utf8')));console.log(`Pairing: ${extension.token===config.token&&extension.port===config.port?'matches':'mismatch — run Setup again'}`);}catch{console.log('Pairing: missing — run Setup');}
 console.log('In your AI client, ask: “Check Aseprite status.”\nIf disconnected, restart Aseprite, then File → Scripts → AI Connection → Connect / Reconnect.');
}
async function main(){
 if(process.argv.includes('--doctor'))return doctor();
 if(Number(process.versions.node.split('.')[0])<22)throw new Error('Install Node.js 22 or newer, then reopen Setup.');
 const rl=createInterface({input:stdin,output:stdout});
 try{
  console.log('\n  ASEPRITE MCP PRO\n  Your imagination. Your editor. Connected.\n\nSetup installs the Aseprite extension and connects your AI app.\nNo account, API key, or administrator password is needed.\nKeep this application folder in its current location after setup.\n');
  const folder=(await rl.question(`1. Where should artwork be saved?\n   Press Enter for ${join(homedir(),'Pictures','AI Pixel Art')}\n> `)).trim()||join(homedir(),'Pictures','AI Pixel Art');
  console.log('\n2. Choose your AI app:\n   1  Codex\n   2  Claude Desktop\n   3  Claude Code\n   4  Gemini CLI\n   5  Another MCP app (generate configuration)');
  const choice=(await rl.question('> ')).trim()||'1';const clients:Record<string,string>={'1':'codex','2':'claude-desktop','3':'claude-code','4':'gemini','5':'other'};if(!clients[choice])throw new Error('Choose a number from 1 to 5. Reopen Setup to try again.');
  const configPath=defaultConfig();const dir=extensionPath();const client=clients[choice]!;
  await install({workspace:resolve(folder),configPath,extensionDir:dir});
  // Always provide fallback configurations, including when a client already has a conflicting entry.
  await configureClient('other',configPath);const entry=clientEntry(configPath);await writeFile(join(dirname(configPath),'client-config.toml'),`[mcp_servers.aseprite-mcp-pro]\ncommand = ${JSON.stringify(entry.command)}\nargs = ${JSON.stringify(entry.args)}\n[mcp_servers.aseprite-mcp-pro.env]\nASEPRITE_MCP_CONFIG = ${JSON.stringify(configPath)}\n`);
  const file=await configureClient(client,configPath);
  console.log(`\nReady. Your AI app configuration is at:\n${file}\n\n3. Restart Aseprite and your AI app.\n   If Aseprite asks for script access, allow this extension to access\n   its settings, your artwork folder, and the local connection.\n\nTry: “Create a 32×32 animated slime using Aseprite.”\n\nPause anytime: Aseprite → File → Scripts → AI Connection → Pause AI control.\nYour files stay local to this bridge; your AI app controls what it sends to its model.\n`);
 }finally{rl.close();}
}
if(process.argv[1] && resolve(process.argv[1])===fileURLToPath(import.meta.url))main().catch(e=>{console.error(`\nSetup could not finish: ${e.message}\nYour existing client settings have not been discarded. See docs/TROUBLESHOOTING.md.`);process.exitCode=1;});
