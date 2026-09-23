import { z } from 'zod';
import { TIMEOUT_READ, TIMEOUT_EDIT, TIMEOUT_EXPORT, TIMEOUT_HEAVY, TIMEOUT_DEFAULT } from './bridge.js';
export type Command = {name:string; description:string; schema:z.ZodObject; effect:'read'|'edit'|'file'|'unsafe'; batch:boolean; input?:string; output?:string; extensions?:string[]; timeout:number};
export const catalog: Command[] = [];
const n = (min:number,max:number) => z.number().int().min(min).max(max);
const size=n(1,1024), coord=n(-2048,2048), frame=n(1,256), name=z.string().min(1).max(80), color=z.string().regex(/^#[0-9a-fA-F]{6}([0-9a-fA-F]{2})?$/), path=z.string().min(1).max(512);
const point=z.object({x:coord,y:coord}).strict();
const rect={x:coord,y:coord,width:size,height:size};
const target={layer:name.optional(),frame:frame.optional()};
const region={...rect,...target};
const paint={color,...target};
const add=(category:string, action:string, description:string, fields:Record<string,z.ZodType>={}, options:Partial<Omit<Command,'name'|'description'|'schema'>>={})=>catalog.push({name:`${category}.${action}`,description,schema:z.object(fields).strict(),effect:'edit',batch:true,timeout:TIMEOUT_EDIT,...options});
const read={effect:'read' as const,timeout:TIMEOUT_READ}; const solo={batch:false};
const output=(extensions:string[],timeout=TIMEOUT_EXPORT)=>({effect:'file' as const,batch:false,output:'path',extensions,timeout});
const input=(extensions:string[])=>({batch:false,input:'path',extensions});
const imageExt=['.png','.aseprite','.ase','.gif'];
add('sprite','create','Create an RGB sprite; becomes the current AI target.',{width:size,height:size,name:name.optional()},solo);
add('sprite','info','Inspect the current AI target, layers, frames and tags.',{},read);
add('sprite','list','List open sprites; use select to explicitly target one.',{},read);
add('sprite','select','Select an open sprite by ID; all later edits target it.',{id:n(1,2147483647)},solo);
add('sprite','open','Open a file inside the chosen artwork folder.',{path},input(imageExt));
add('sprite','save','Save an Aseprite copy to a NEW file in the artwork folder.',{path},output(['.aseprite','.ase']));
add('sprite','resize','Resize all cels using nearest-neighbor sampling.',{width:size,height:size});
add('sprite','crop','Crop the canvas.',rect);
add('sprite','duplicate','Duplicate target into a new untitled sprite.',{},solo);
add('sprite','close','Close only an unmodified sprite. Save your work in the editor first.',{},solo);
add('sprite','build_animation','Create, draw, animate and export a multi-frame sprite in a single operation. Looping animations should follow the zero-pop system (closed orbits, harmonic cosine pulse, rotational symmetry discretization).',{
 name:name.default('Animation'),
 width:size,
 height:size,
 palette:z.array(color).min(1).max(256),
 layer:name.default('Main'),
 frameDuration:n(10,10000).default(120),
 frames:z.array(z.object({
  rle:z.string().min(1).max(65536).optional(),
  rows:z.array(z.array(n(-1,255)).min(1).max(1024)).min(1).max(1024).optional(),
  duration:n(10,10000).optional()
 }).strict()).min(1).max(256),
 tags:z.array(z.object({
  name,
  from:frame,
  to:frame,
  direction:z.enum(['FORWARD','REVERSE','PING_PONG','PING_PONG_REVERSE']).default('FORWARD')
 }).strict()).max(32).default([]),
 exports:z.array(z.enum(['aseprite','sheet','metadata','gif','vyi'])).max(5).default(['aseprite','sheet','gif','vyi']),
 sheetColumns:n(1,64).default(8),
 exportPaths:z.record(z.string(),path).optional()
},{...solo,timeout:TIMEOUT_HEAVY});
add('drawing','pixel','Set one pixel.',{x:coord,y:coord,...paint});
add('drawing','pixels','Draw many pixels in one operation.',{pixels:z.array(z.object({x:coord,y:coord,color}).strict()).min(1).max(16384),...target});
add('drawing','line','Draw a crisp integer line.',{x:coord,y:coord,x2:coord,y2:coord,...paint});
add('drawing','rectangle','Draw a rectangle outline.',{...rect,...paint});
add('drawing','filled_rectangle','Draw a solid rectangle.',{...rect,...paint});
add('drawing','ellipse','Draw an ellipse outline.',{...rect,...paint});
add('drawing','filled_ellipse','Draw a solid ellipse.',{...rect,...paint});
add('drawing','fill','Flood fill contiguous pixels in the target cel.',{x:coord,y:coord,...paint});
add('drawing','stroke','Draw connected points with a square brush.',{points:z.array(point).min(1).max(1024),size:n(1,32).default(1),...paint});
add('drawing','polygon','Draw a closed polygon outline.',{points:z.array(point).min(3).max(256),...paint});
add('drawing','clear','Clear selected pixels, or the entire cel if no selection.',target);
add('drawing','dither','Fill a rectangle with a two-color Bayer pattern.',{...region,color,color2:color,density:n(0,16).default(8)});
add('drawing','gradient','Draw a stepped two-color gradient.',{...region,color,color2:color,steps:n(2,32).default(4),axis:z.enum(['x','y']).default('y')});
add('drawing','symmetry','Draw pixels mirrored around the canvas center.',{pixels:z.array(z.object({x:coord,y:coord,color}).strict()).min(1).max(8192),axis:z.enum(['x','y','both']),...target});
add('drawing','pattern','Stamp an indexed pixel matrix. -1 is transparent/skip.',{x:coord,y:coord,rows:z.array(z.array(n(-1,255)).min(1).max(256)).min(1).max(256),colors:z.array(color).min(1).max(256),...target});
add('drawing','erase','Erase a rectangle to transparent.',region);
add('layer','list','List all layers, including nested groups.',{},read);
add('layer','add','Add a named image layer.',{name});
add('layer','delete','Delete a layer and its cels. Undoable.',{layer:name});
add('layer','rename','Rename a layer.',{layer:name,name});
add('layer','opacity','Set layer opacity from 0 to 255.',{layer:name,opacity:n(0,255)});
add('layer','blend','Set the layer blend mode.',{layer:name,mode:z.enum(['NORMAL','MULTIPLY','SCREEN','OVERLAY','DARKEN','LIGHTEN','ADDITION','SUBTRACT','DIFFERENCE'])});
add('layer','visibility','Show or hide a layer.',{layer:name,visible:z.boolean()});
add('layer','reorder','Set layer position within its parent (1 is bottom).',{layer:name,index:n(1,128)});
add('layer','group','Create a layer group.',{name});
add('layer','parent','Move a layer into a group, or the sprite root.',{layer:name,group:name.optional()});
add('layer','duplicate','Duplicate an image layer and all its cels.',{layer:name,name});
add('layer','flatten','Flatten visible layers. Undoable.',{});
add('animation','frames','List frame durations in milliseconds.',{},read);
add('animation','add','Append empty animation frames.',{count:n(1,64).default(1),duration:n(10,10000).default(100)});
add('animation','duplicate','Duplicate a frame immediately before its source.',{frame});
add('animation','delete','Delete one frame; keep at least one.',{frame});
add('animation','duration','Set frame duration in milliseconds.',{from:frame,to:frame,duration:n(10,10000)});
add('animation','select','Show a frame in the editor.',{frame});
add('animation','tags','List named animation ranges.',{},read);
add('animation','tag','Create a named animation range.',{name,from:frame,to:frame,direction:z.enum(['FORWARD','REVERSE','PING_PONG','PING_PONG_REVERSE']).default('FORWARD')});
add('animation','delete_tag','Delete an animation tag.',{name});
add('animation','rename_tag','Rename an animation tag.',{name,newName:name});
add('animation','interpolate','Append translated copies of a frame, interpolating a cel offset (not AI inbetweening).',{frame,layer:name,dx:coord,dy:coord,count:n(1,32)});
add('animation','preview','Export an animated GIF preview to a new file.',{path},output(['.gif'],TIMEOUT_EXPORT));
add('palette','list','List bundled palette names and attribution.',{},read);
add('palette','get','Read the target palette as hex colors.',{},read);
add('palette','set','Replace the palette with explicit colors.',{colors:z.array(color).min(1).max(256)});
add('palette','builtin','Apply a bundled palette.',{name:z.enum(['pico-8','endesga-32','slso8','sweetie-16','arne-16','resurrect-64','apollo','island-joy-16','na16','crimson'])});
add('palette','color','Change a zero-based palette entry.',{index:n(0,255),color});
add('palette','ramp','Replace palette with a linear RGB color ramp.',{from:color,to:color,steps:n(2,64)});
add('palette','sort','Sort palette by luminance. RGB artwork is unchanged.',{order:z.enum(['ascending','descending']).default('ascending')});
add('palette','import_image','Extract up to 256 exact colors from an image.',{path},input(['.png']));
add('palette','export','Export the palette as a PNG swatch strip.',{path},output(['.png'],TIMEOUT_EXPORT));
add('palette','nearest','Find the nearest palette color by RGB distance.',{color},read);
add('selection','rectangle','Replace selection with a rectangle.',rect);
add('selection','ellipse','Replace selection with an ellipse.',rect);
add('selection','color','Select matching RGBA pixels in a composited frame.',{color,frame:frame.optional()});
add('selection','invert','Invert selection within the canvas.',{});
add('selection','all','Select the whole canvas.',{});
add('selection','clear','Deselect.',{});
add('selection','bounds','Get selection bounds and whether empty.',{},read);
add('selection','translate','Move selection without moving pixels.',{dx:coord,dy:coord});
add('export','png','Export one composited frame as PNG.',{path,frame:frame.optional()},output(['.png'],TIMEOUT_EXPORT));
add('export','sheet','Export frames in a regular PNG grid.',{path,columns:n(1,64).default(8)},output(['.png'],TIMEOUT_EXPORT));
add('export','gif','Export the complete animation as GIF.',{path},output(['.gif'],TIMEOUT_EXPORT));
add('export','layer','Export one isolated image layer/frame as PNG.',{path,layer:name,frame:frame.optional()},output(['.png'],TIMEOUT_EXPORT));
add('export','tag','Export a named animation as GIF.',{path,name},output(['.gif'],TIMEOUT_EXPORT));
add('export','metadata','Export frame durations, layers and tags as JSON.',{path},output(['.json'],TIMEOUT_EXPORT));
add('vyi','export','Export Vylocity v1 icons, embedded PNG frames and named states. Separate icons per selected layer or merge them.',{path,layers:z.array(name).min(1).max(32),merge:z.boolean().default(false),name:name.optional()},{...output(['.vyi'],TIMEOUT_HEAVY)});
add('vyi','inspect','Inspect a VYI file without returning embedded images.',{path},{...input(['.vyi']),effect:'read',timeout:TIMEOUT_READ});
add('vyi','import','Import one VYI icon into a new sprite. State timelines are concatenated with tags.',{path,icon:n(0,127).default(0)},input(['.vyi']));
add('vyi','skip','Set the ase2vyi-compatible skip marker on a cel; preserve unrelated user data.',{...target,skip:z.boolean().default(true)});
add('vyi','preview','Mark a cel as its layer’s VYI preview. It can also be skipped from animation.',{...target});
add('analysis','colors','Return the most common composited RGBA colors.',{frame:frame.optional(),limit:n(1,64).default(16)},read);
add('analysis','compare','Compare two frames: changed pixel count and bounding box.',{from:frame,to:frame},read);
add('analysis','diff','Write a visual PNG of differences between frames.',{from:frame,to:frame,path},output(['.png']));
add('analysis','validate','Check animation durations, duplicate frames and empty frames.',{},read);
add('analysis','bounds','Find nontransparent bounds in a composited frame.',{frame:frame.optional()},read);
add('analysis','pixel','Read one composited RGBA pixel.',{x:coord,y:coord,frame:frame.optional()},read);
add('transform','flip','Flip the target cel.',{axis:z.enum(['x','y']),...target});
add('transform','rotate','Rotate the target cel inside the canvas; rectangular canvases may clip.',{degrees:z.enum(['90','180','270']),...target});
add('transform','shift','Shift the target cel, optionally wrapping canvas edges.',{dx:coord,dy:coord,wrap:z.boolean().default(true),...target});
add('transform','scale','Scale target cel with nearest-neighbor sampling from top-left.',{factor:n(1,8),...target});
add('templates','character','Create a character sprite with outline, base and shading layers plus idle/walk tags.',{width:size.default(32),height:size.default(32)},solo);
add('templates','tileset','Create a blank tile sheet with a matching grid.',{tileWidth:n(1,128).default(16),tileHeight:n(1,128).default(16),columns:n(1,8).default(4),rows:n(1,8).default(4)},solo);
add('templates','icon','Create a small RGB icon with base and highlights layers.',{size:n(8,128).default(32)},solo);
add('editor','status','Read Aseprite version, paused state and connection capabilities.',{},read);
add('editor','undo','Undo one editor operation on the AI target.',{},solo);
add('editor','redo','Redo one editor operation on the AI target.',{},solo);
add('editor','refresh','Refresh the editor display.',{},solo);
add('editor','lua','Advanced: arbitrary Lua. Disabled by default; requires local opt-in and an editor confirmation for EVERY call. Has full user privileges.',{code:z.string().min(1).max(32768)},{effect:'unsafe',batch:false});
add('cel','info','Inspect an image cel.',target,read);
add('cel','create','Create an empty cel on an image layer/frame.',target);
add('cel','delete','Delete a cel.',target);
add('cel','move','Move a cel to a canvas position.',{x:coord,y:coord,...target});
add('cel','opacity','Change cel opacity.',{opacity:n(0,255),...target});
add('cel','copy','Copy a cel to another frame on the same layer.',{...target,to:frame});
add('cel','clear','Clear cel pixels.',target);
add('slice','list','List slice bounds.',{},read);
add('slice','create','Create a named slice.',{name,...rect});
add('slice','delete','Delete a named slice.',{name});
add('slice','bounds','Set named slice bounds.',{name,...rect});
add('slice','pivot','Set slice pivot.',{name,x:coord,y:coord});
add('tileset','list','List native Aseprite tilesets.',{},read);
add('tileset','create','Create a native tileset with empty tiles.',{name,width:n(1,128),height:n(1,128),count:n(1,256).default(1)});
add('tileset','delete','Delete a tileset by one-based index.',{index:n(1,128)});
add('tileset','rename','Rename a native tileset.',{index:n(1,128),name});
add('tileset','grid','Set the sprite grid.',{width:size,height:size});
add('tileset','info','Inspect a native tileset.',{index:n(1,128)},read);
add('image','import','Import an image as a new layer in the target.',{path,name:name.default('Imported')},input(['.png']));
add('image','stamp','Stamp a PNG at a position in a target cel.',{path,x:coord,y:coord,...target},input(['.png']));
add('image','outline','Add a one-pixel exterior outline to a cel.',{color,...target});
add('image','replace_color','Replace exact RGBA matches.',{from:color,to:color,...target});
add('image','grayscale','Convert cel colors to luminance.',target);
add('image','threshold','Convert cel to two colors using luminance.',{threshold:n(0,255).default(128),dark:color.default('#000000'),light:color.default('#ffffff'),...target});
add('image','invert','Invert RGB channels while retaining alpha.',target);
export const byName=new Map(catalog.map(c=>[c.name,c]));
export function describe(c:Command){return {name:c.name,description:c.description,effect:c.effect,batch:c.batch,parameters:z.toJSONSchema(c.schema)};}
export function validateCommand(name:string,args:unknown){const c=byName.get(name);if(!c)throw new Error(`Unknown command: ${name}. Use aseprite_discover.`);return {command:c,args:c.schema.parse(args)};}
