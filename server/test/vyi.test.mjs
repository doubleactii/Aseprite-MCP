import test from 'node:test';
import assert from 'node:assert/strict';
import {decodeVyi,inspectVyi,prepareImport,pngSize} from '../build/vyi.js';
import {mkdtemp,rm,readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
// Valid transparent 1x1 PNG.
const png='iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVR42mNgAAIAAAUAAen63NgAAAAASUVORK5CYII=';
const fixture={v:1,i:[['hero',1,1,100,png,[],[['idle',png,80,[[png,120]]]]]]};
test('VYI v1 tuple layout preserves icon, state and per-frame timing',()=>{const v=decodeVyi(JSON.stringify(fixture));const info=inspectVyi(v);assert.deepEqual(info.icons[0].states[0],{name:'idle',frames:2,durations:[80,120]});assert.equal(v.i[0][4],png);});
test('VYI rejects invalid version, embedded non-PNG, wrong dimensions and duplicate state names',()=>{
 for(const change of [v=>v.v=2,v=>v.i[0][4]='aGVsbG8=',v=>v.i[0][1]=2,v=>v.i[0][6].push(v.i[0][6][0]),v=>v.i[0][3]=-1]){const v=structuredClone(fixture);change(v);assert.throws(()=>decodeVyi(JSON.stringify(v)));}
 assert.throws(()=>pngSize(Buffer.alloc(50)));
});
test('VYI import isolates preview from named animation states',async()=>{const dir=await mkdtemp(join(tmpdir(),'vyi-test-'));try{const result=await prepareImport(decodeVyi(JSON.stringify(fixture)),0,dir);assert.equal(result.frames.length,3);assert.equal(result.frames[0].preview,true);assert.equal(result.frames[0].skip,true);assert.deepEqual(result.tags,[{name:'idle',from:2,to:3}]);assert.deepEqual(pngSize(await readFile(result.frames[1].file)),{width:1,height:1});}finally{await rm(dir,{recursive:true,force:true});}});
