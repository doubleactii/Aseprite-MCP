import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { decodeVyi, inspectVyi, encodeManifest, prepareImport } from './vyi.js';
import { validateCommand } from './catalog.js';
import type { Config } from './config.js';
import type { Bridge } from './bridge.js';
import { FilePolicy } from './files.js';
export class Engine {
 readonly files:FilePolicy;
 constructor(private config:Config,private bridge:Pick<Bridge,'request'>){this.files=new FilePolicy(config.workspace);}
 async run(name:string,input:unknown){
  const {command:c,args}=validateCommand(name,input);
  if(c.effect==='unsafe'&&!this.config.allowLua)throw new Error('Arbitrary Lua is disabled. Enable it locally in config.json only if you accept full filesystem and process access.');
  if(c.input)args[c.input]=await this.files.input(args[c.input] as string,c.extensions!);
  if(name==='vyi.inspect')return inspectVyi(decodeVyi(await readFile(args.path as string,'utf8')));
  if(name==='vyi.import'){
   const data=decodeVyi(await readFile(args.path as string,'utf8'));const stage=await this.files.stage(`import-${randomUUID()}.json`,['.json']);
   try{const manifest=await prepareImport(data,args.icon as number,dirname(stage.staged));await writeFile(stage.staged,JSON.stringify(manifest));return await this.bridge.request({commands:[{name,args:{path:stage.staged,icon:args.icon}}],atomic:false});}finally{await stage.cleanup();}
  }
  if(name==='sprite.build_animation'){
   const exports=Array.isArray(args.exports)?args.exports:[];
   const baseName=typeof args.name==='string'&&args.name?args.name:'Animation';
   const extMap:Record<string,{file:string,ext:string}>={
    aseprite:{file:`${baseName}.aseprite`,ext:'.aseprite'},
    sheet:{file:`${baseName}-sheet.png`,ext:'.png'},
    metadata:{file:`${baseName}.json`,ext:'.json'},
    gif:{file:`${baseName}.gif`,ext:'.gif'},
    vyi:{file:`${baseName}.vyi`,ext:'.vyi'}
   };
   const stagedMap:Record<string,any>={};
   const stagedArgs:Record<string,string>={};
   for(const key of exports){
    const info=extMap[key];
    if(info){
     const stage=await this.files.stage(info.file,[info.ext]);
     stagedMap[key]=stage;
     stagedArgs[key]=stage.staged;
    }
   }
   args.exportPaths=stagedArgs;
   try{
    const result=await this.bridge.request({commands:[{name,args}],atomic:false});
    if(stagedMap.vyi&&result&&result.vyiManifest){
     await writeFile(stagedMap.vyi.staged,await encodeManifest(result.vyiManifest,dirname(stagedMap.vyi.staged)));
    }
    const committed:Record<string,{path:string,bytes:number}>={};
    for(const [key,stage] of Object.entries(stagedMap)){
     committed[key]=await stage.commit();
    }
    return {...result,files:committed};
   }finally{
    for(const stage of Object.values(stagedMap)){
     await stage.cleanup().catch(()=>{});
    }
   }
  }
  if(c.output){const stage=await this.files.stage(args[c.output] as string,c.extensions!);args[c.output]=stage.staged;
   try{const result=await this.bridge.request({commands:[{name,args}],atomic:false});if(name==='vyi.export')await writeFile(stage.staged,await encodeManifest(result,dirname(stage.staged)));return await stage.commit();}finally{await stage.cleanup();}
  }
  return this.bridge.request({commands:[{name,args}],atomic:false});
 }
 async batch(commands:{name:string;args?:unknown}[],dryRun=false){
  if(commands.length<1||commands.length>64)throw new Error('A batch needs 1–64 commands.');
  const parsed=commands.map(({name,args})=>{const p=validateCommand(name,args??{});if(!p.command.batch||p.command.effect!=='edit')throw new Error(`${name} must run individually. Batches allow undoable edits only.`);return {name,args:p.args};});
  if(Buffer.byteLength(JSON.stringify(parsed))>512*1024)throw new Error('Batch too large (512 KiB maximum).');
  if(dryRun)return {valid:true,commands:parsed.length,note:'Schemas checked. Canvas-dependent checks occur in Aseprite.'};
  return this.bridge.request({commands:parsed,atomic:true});
 }
}
