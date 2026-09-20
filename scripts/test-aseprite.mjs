import {spawnSync} from 'node:child_process';
import {mkdirSync,readFileSync,writeFileSync,rmSync,cpSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {homedir} from 'node:os';
import {encodeManifest,decodeVyi,prepareImport} from '../server/build/vyi.js';
import {catalog} from '../server/build/catalog.js';
const bin=process.env.ASEPRITE_BIN??join(homedir(),'Library/Application Support/Steam/steamapps/common/Aseprite/Aseprite.app/Contents/MacOS/aseprite');
const root=resolve('.'),out=resolve('.local/aseprite-smoke');mkdirSync(out,{recursive:true});
function run(file){const r=spawnSync(bin,['--batch','--script-param',`root=${root}`,'--script-param',`out=${out}`,'--script',resolve(file)],{encoding:'utf8',timeout:60000});process.stdout.write(r.stdout??'');process.stderr.write(r.stderr??'');if(r.error)throw r.error;if(r.status!==0)throw new Error(`Aseprite test failed: ${file} (${r.status})`);}
rmSync(join(out,'result.json'),{force:true});run('scripts/smoke.lua');run('scripts/coverage.lua');
const result=JSON.parse(readFileSync(join(out,'result.json'),'utf8'));if(!result.rollback||result.passed<30)throw new Error('Smoke tests did not finish');
const manifest=JSON.parse(readFileSync(join(out,'vyi-manifest.json'),'utf8'));const raw=await encodeManifest(manifest,out);writeFileSync(join(out,'slime.vyi'),raw);const data=decodeVyi(raw);const imported=await prepareImport(data,0,out);writeFileSync(join(out,'import.json'),JSON.stringify(imported));run('scripts/vyi-roundtrip.lua');
const covered={...result.tested,...JSON.parse(readFileSync(join(out,'coverage.json'),'utf8')),'vyi.import':true,'vyi.inspect':true};const missing=catalog.filter(c=>!covered[c.name]);if(missing.length)throw new Error(`Untested commands: ${missing.map(c=>c.name).join(', ')}`);
cpSync('extension',join(out,'protocol-extension'),{recursive:true});writeFileSync(join(out,'protocol-extension','connection.json'),JSON.stringify({version:1,token:'a'.repeat(64),port:19876,workspace:out,allowLua:false}));run('scripts/protocol.lua');
console.log(`PASS: ${catalog.length} command paths exercised in Aseprite ${result.version}, including denied unsafe Lua; PNG/GIF/source/VYI exports, VYI round trip, strict validation and transaction rollback.`);
