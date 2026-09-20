import { z } from 'zod';
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
const duration=z.number().finite().min(1).max(60000);
const image=z.string().min(1).max(4*1024*1024);
const frame=z.tuple([image,duration]);
const state=z.tuple([z.string().min(1).max(80),image,duration,z.array(frame).max(255)]);
const icon=z.tuple([z.string().min(1).max(80),z.number().int().min(1).max(1024),z.number().int().min(1).max(1024),duration,image,z.array(frame).max(255),z.array(state).max(128)]);
const schema=z.object({v:z.literal(1),i:z.array(icon).min(1).max(128)}).strict();
export type Vyi=z.infer<typeof schema>;
export function pngSize(bytes:Buffer){
 if(bytes.length<33||bytes.subarray(0,8).toString('hex')!=='89504e470d0a1a0a'||bytes.toString('ascii',12,16)!=='IHDR')throw new Error('Invalid PNG frame.');
 const width=bytes.readUInt32BE(16),height=bytes.readUInt32BE(20);
 if(width<1||height<1||width>1024||height>1024)throw new Error('PNG dimensions exceed 1024px.');return {width,height};
}
export function decodeVyi(raw:string):Vyi{
 if(Buffer.byteLength(raw)>32*1024*1024)throw new Error('VYI exceeds 32 MiB.');
 const v=schema.parse(JSON.parse(raw));let total=0,pixels=0;
 for(const ic of v.i){const [name,w,h,,base,frames,states]=ic;const names=new Set<string>();const images=[base,...frames.map(f=>f[0])];for(const st of states){if(names.has(st[0]))throw new Error('Duplicate VYI state name.');names.add(st[0]);images.push(st[1],...st[3].map(f=>f[0]));}
  if(images.length>512)throw new Error('Too many frames per VYI icon.');
  for(const img of images){if(!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(img))throw new Error('Invalid base64 PNG.');const bytes=Buffer.from(img,'base64');total+=bytes.length;pixels+=w*h;const size=pngSize(bytes);if(size.width!==w||size.height!==h)throw new Error(`Frame dimensions do not match icon ${name}.`);if(total>24*1024*1024||pixels>16777216)throw new Error('VYI exceeds decoded image budget.');}
 }return v;
}
export function inspectVyi(v:Vyi){return {version:v.v,icons:v.i.map(ic=>({name:ic[0],width:ic[1],height:ic[2],previewDuration:ic[3],baseFrames:ic[5].length+1,states:ic[6].map(s=>({name:s[0],frames:s[3].length+1,durations:[s[2],...s[3].map(f=>f[1])]}))}))};}
export async function encodeManifest(manifest:any,dir:string){
 if(!manifest||!Array.isArray(manifest.icons)||manifest.icons.length<1||manifest.icons.length>32)throw new Error('Invalid VYI export manifest.');
 const png=async(file:string)=>{if(!/^frame-\d+\.png$/.test(file))throw new Error('Invalid frame path.');return (await readFile(join(dir,file))).toString('base64');};
 const icons:any[]=[];
 for(const ic of manifest.icons){const frames=[];for(const f of ic.frames)frames.push([await png(f.file),f.duration]);const states=[];for(const s of ic.states){const extra=[];for(const f of s.frames)extra.push([await png(f.file),f.duration]);states.push([s.name,await png(s.base.file),s.base.duration,extra]);}icons.push([ic.name,ic.width,ic.height,ic.base.duration,await png(ic.base.file),frames,states]);}
 const raw=JSON.stringify({v:1,i:icons});decodeVyi(raw);return raw;
}
export async function prepareImport(v:Vyi,index:number,dir:string){
 const ic=v.i[index];if(!ic)throw new Error('VYI icon index out of range.');const frames:{file:string;duration:number;preview?:boolean;skip?:boolean}[]=[];const tags:{name:string;from:number;to:number}[]=[];
 async function add(img:string,ms:number,extra={}){if(frames.length>=256)throw new Error('Import exceeds 256 Aseprite frames.');const file=join(dir,`frame-${frames.length+1}.png`);await writeFile(file,Buffer.from(img,'base64'));frames.push({file,duration:ms,...extra});}
 await add(ic[4],ic[3],{preview:true,skip:ic[6].length>0});for(const f of ic[5])await add(f[0],f[1]);if(ic[6].length&&ic[5].length){if(ic[6].some(s=>s[0]==='base'))throw new Error('Rename the existing base state before importing an icon with a base animation.');tags.push({name:'base',from:1,to:frames.length});}
 for(const st of ic[6]){const from=frames.length+1;await add(st[1],st[2]);for(const f of st[3])await add(f[0],f[1]);tags.push({name:st[0],from,to:frames.length});}
 return {name:ic[0],width:ic[1],height:ic[2],frames,tags};
}
