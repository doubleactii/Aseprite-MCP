import { readFile, realpath, stat } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';
import { z } from 'zod';
export const configSchema=z.object({version:z.literal(1),token:z.string().regex(/^[a-f0-9]{64}$/),port:z.number().int().min(1024).max(65535),workspace:z.string().min(1),allowLua:z.boolean().default(false),autoOpenGenerated:z.boolean().default(true)}).strict();
export type Config=z.infer<typeof configSchema>;
export const defaultConfig=()=>join(homedir(),'.aseprite-mcp-pro','config.json');
export async function loadConfig(file=process.env.ASEPRITE_MCP_CONFIG ?? defaultConfig()):Promise<Config>{
 let raw;try{raw=await readFile(file,'utf8');}catch{throw new Error('Setup is not complete. Open Setup or run npm run setup.');}
 const config=configSchema.parse(JSON.parse(raw));config.workspace=await realpath(resolve(config.workspace));
 if(!(await stat(config.workspace)).isDirectory())throw new Error('Artwork folder is missing. Run Setup again.');
 return config;
}
