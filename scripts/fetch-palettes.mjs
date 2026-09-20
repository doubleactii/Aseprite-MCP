// Maintainer-only: refresh checked-in colors from their original source.
import {writeFile} from 'node:fs/promises';
const names=['pico-8','endesga-32','slso8','sweetie-16','arne-16','resurrect-64','apollo','island-joy-16','na16','crimson'];
const result=[];
for(const name of names){const source=`https://lospec.com/palette-list/${name}`;const r=await fetch(`${source}.json`);if(!r.ok)throw new Error(`${name}: ${r.status}`);const p=await r.json();if(!Array.isArray(p.colors)||!p.colors.every(c=>/^[a-f0-9]{6}$/i.test(c)))throw new Error(`Invalid palette ${name}`);result.push({name,author:p.author,source,colors:p.colors.map(c=>'#'+c)});}
await writeFile('extension/palettes.json',JSON.stringify(result,null,2)+'\n');
