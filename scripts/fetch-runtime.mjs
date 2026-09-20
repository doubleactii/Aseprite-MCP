// Maintainer release step. Downloads official Node LTS and verifies its SHA256.
import {mkdir,writeFile,readFile,cp,chmod,mkdtemp,rm} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {unzipSync} from 'fflate';
const releases=await (await fetch('https://nodejs.org/dist/index.json')).json();const release=releases.find(r=>r.lts&&r.version.startsWith('v24.'));if(!release||!/^v24\.\d+\.\d+$/.test(release.version))throw new Error('No supported LTS runtime found.');
const os=process.platform==='win32'?'win':process.platform;if(!['win','darwin','linux'].includes(os)||!['arm64','x64'].includes(process.arch))throw new Error('Unsupported release target.');
const basename=`node-${release.version}-${os}-${process.arch}`;const filename=basename+(os==='win'?'.zip':'.tar.gz');const base=`https://nodejs.org/dist/${release.version}/`;
async function get(url){const response=await fetch(url);if(!response.ok)throw new Error(`${response.status}: ${url}`);return response;}
const sums=await (await get(base+'SHASUMS256.txt')).text();const expected=sums.split('\n').find(line=>line.endsWith('  '+filename))?.split(' ')[0];if(!expected)throw new Error('Runtime checksum missing.');
const bytes=Buffer.from(await (await get(base+filename)).arrayBuffer());const hash=createHash('sha256').update(bytes).digest('hex');if(hash!==expected)throw new Error('Runtime checksum mismatch.');
await mkdir('runtime',{recursive:true});const temp=await mkdtemp(join(tmpdir(),'aseprite-runtime-'));try{
 if(os==='win'){const files=unzipSync(bytes);for(const file of ['node.exe','LICENSE']){const content=files[basename+'/'+file];if(!content)throw new Error('Runtime archive missing '+file);await writeFile(join('runtime',file),content);}}
 else{const archive=join(temp,filename);await writeFile(archive,bytes);execFileSync('tar',['-xzf',archive,'-C',temp,basename+'/bin/node',basename+'/LICENSE']);await cp(join(temp,basename,'bin/node'),'runtime/node');await chmod('runtime/node',0o755);await cp(join(temp,basename,'LICENSE'),'runtime/LICENSE');}
 await writeFile('runtime/provenance.json',JSON.stringify({version:release.version,source:base+filename,sha256:hash,platform:process.platform,arch:process.arch},null,2)+'\n');console.log(`Verified ${release.version} (${hash})`);
}finally{await rm(temp,{recursive:true,force:true});}
