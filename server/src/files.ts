import { realpathSync } from 'node:fs';
import { realpath, stat, lstat, mkdtemp, mkdir, link, rm } from 'node:fs/promises';
import { resolve, relative, isAbsolute, extname, dirname, join, basename } from 'node:path';
export class FilePolicy {
 readonly root:string;
 constructor(root:string){this.root=realpathSync(root);}
 private lexical(path:string){
  if(!path || path.includes('\0') || path.includes('\\') || path.includes(':') || isAbsolute(path))throw new Error('Use a relative filename inside your artwork folder.');
  if(path.split('/').some(p=>p==='..'||p===''||p.startsWith('.')))throw new Error('Hidden paths and traversal are not allowed.');
  const abs=resolve(this.root,path);this.contained(abs);return abs;
 }
 private contained(abs:string){const rel=relative(this.root,abs);if(rel.startsWith('..')||isAbsolute(rel)||!rel)throw new Error('Path must stay inside the artwork folder.');}
 async createUniqueDirectory(path:string){
  const base=this.lexical(path);const parts=relative(this.root,base).split('/');let parent=this.root;
  for(const part of parts.slice(0,-1)){parent=join(parent,part);try{await mkdir(parent,{mode:0o700});}catch(e){if((e as NodeJS.ErrnoException).code!=='EEXIST')throw e;const info=await lstat(parent);if(!info.isDirectory()||info.isSymbolicLink())throw new Error('Output through symlink directories is not allowed.');}if(await realpath(parent)!==parent)throw new Error('Output through symlink directories is not allowed.');}
  let candidate=base;let suffix=1;
  while(true){
   try{await mkdir(candidate,{mode:0o700});}
   catch(e){if((e as NodeJS.ErrnoException).code!=='EEXIST')throw e;const info=await lstat(candidate);if(!info.isDirectory()||info.isSymbolicLink())throw new Error('Output folder must not be a symlink or a file.');candidate=`${base}-${++suffix}`;continue;}
   const resolved=await realpath(candidate);this.contained(resolved);if(resolved!==candidate)throw new Error('Output through symlink directories is not allowed.');return relative(this.root,candidate);
  }
 }
 private extension(path:string,allowed:string[]){if(!allowed.includes(extname(path).toLowerCase()))throw new Error(`Expected file type: ${allowed.join(', ')}`);}
 async input(path:string,allowed:string[]){this.extension(path,allowed);const abs=await realpath(this.lexical(path));this.contained(abs);const s=await stat(abs);if(!s.isFile()||s.size>32*1024*1024)throw new Error('Input must be a file smaller than 32 MiB.');return abs;}
 async stage(path:string,allowed:string[]){
  this.extension(path,allowed);const dest=this.lexical(path);const parent=await realpath(dirname(dest));if(parent!==this.root)this.contained(parent);
  if(parent!==dirname(dest))throw new Error('Export through symlink directories is not allowed.');
  try{await lstat(dest);throw new Error('File already exists. Choose a new filename; exports never overwrite.');}catch(e){if((e as NodeJS.ErrnoException).code!=='ENOENT')throw e;}
  const stagingRoot=join(this.root,'.aseprite-mcp-tmp');await mkdir(stagingRoot,{recursive:true,mode:0o700});
  if((await lstat(stagingRoot)).isSymbolicLink() || await realpath(stagingRoot)!==stagingRoot)throw new Error('Unsafe staging directory.');
  const dir=await mkdtemp(join(stagingRoot,'export-'));const staged=join(dir,basename(dest));
  return {staged,cleanup:()=>rm(dir,{recursive:true,force:true}),commit:async()=>{
   if(await realpath(dirname(dest))!==parent)throw new Error('Export folder changed during operation.');
   const s=await lstat(staged);if(!s.isFile()||s.isSymbolicLink()||s.size>64*1024*1024)throw new Error('Invalid export output.');
   await link(staged,dest);return {path,bytes:s.size};
  }};
 }
}
