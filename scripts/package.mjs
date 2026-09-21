import {mkdir,cp,readFile,writeFile,chmod,readdir,stat,rm} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {createHash} from 'node:crypto';
import {zipSync} from 'fflate';
const runtime=JSON.parse(await readFile('runtime/provenance.json','utf8'));if(runtime.platform!==process.platform||runtime.arch!==process.arch)throw new Error('Runtime architecture mismatch; run node scripts/fetch-runtime.mjs');
const name=`aseprite-mcp-pro-${process.platform}-${process.arch}`;
await rm('dist',{recursive:true,force:true});const dest=resolve('dist',name);await mkdir(dest,{recursive:true});
for(const item of ['server/build','extension','skills','docs','README.md','Setup.command','Setup.bat','setup.sh','package.json','package-lock.json','node_modules','THIRD_PARTY_NOTICES.md'])await cp(item,join(dest,item),{recursive:true});
await mkdir(join(dest,'runtime'),{recursive:true});await cp('runtime/LICENSE',join(dest,'runtime','LICENSE'));await cp(join('runtime',process.platform==='win32'?'node.exe':'node'),join(dest,'runtime',process.platform==='win32'?'node.exe':'node'));await cp('runtime/provenance.json',join(dest,'runtime','provenance.json'));await chmod(join(dest,'runtime',process.platform==='win32'?'node.exe':'node'),0o755);
const extension={};for(const file of await readdir('extension'))if(file!=='connection.json')extension[file]=new Uint8Array(await readFile(join('extension',file)));
await writeFile('dist/aseprite-mcp-pro.aseprite-extension',zipSync(extension,{level:6}));
const files={};async function walk(dir,prefix){for(const entry of await readdir(dir,{withFileTypes:true})){const p=join(dir,entry.name),key=prefix+'/'+entry.name;if(entry.isDirectory())await walk(p,key);else if(entry.isFile()){const s=await stat(p);files[key]=[new Uint8Array(await readFile(p)),{os:3,attrs:(s.mode&0xffff)<<16}];}}}
await walk(dest,name);const zip=zipSync(files,{level:6});await writeFile(`dist/${name}.zip`,zip);await writeFile(`dist/${name}.zip.sha256`,createHash('sha256').update(zip).digest('hex')+`  ${name}.zip\n`);console.log(`Ready: dist/${name}.zip\nIncludes Node ${runtime.version}; no Node installation required.\nNative releases must be built on each target OS/architecture. Code signing is a separate release step.`);
