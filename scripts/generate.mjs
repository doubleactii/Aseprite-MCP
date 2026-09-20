import {catalog,describe} from '../server/build/catalog.js';
import {writeFile,readFile} from 'node:fs/promises';
if(catalog.length!==122 || new Set(catalog.map(c=>c.name)).size!==122)throw new Error(`Expected 122 unique commands, got ${catalog.length}`);
const descriptions=catalog.map(c=>({...describe(c),input:c.input,output:c.output}));
await writeFile('extension/catalog.json',JSON.stringify(descriptions,null,2)+'\n');
const categories=[...new Set(catalog.map(c=>c.name.split('.')[0]))];if(categories.length!==16)throw new Error('Expected 16 categories');
let doc='# Command reference\n\n122 commands in 16 categories, exposed through six compact MCP tools. Discover schemas on demand with `aseprite_discover`. Coordinates are zero-based; frame, layer-stack and tileset indices are one-based. Palette indices are zero-based. Canvas limit: 1024 × 1024. New sprites use RGB.\n';
for(const category of categories){doc+=`\n## ${category}\n\n| Command | Description | Effect | Batch |\n| --- | --- | --- | --- |\n`;for(const c of catalog.filter(c=>c.name.startsWith(category+'.')))doc+=`| \`${c.name}\` | ${c.description} | ${c.effect} | ${c.batch&&c.effect==='edit'?'yes':'no'} |\n`;}
await writeFile('docs/COMMANDS.md',doc);
