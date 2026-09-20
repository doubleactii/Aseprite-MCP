local root=app.params.root;local out=app.params.out
local function read(p) local f=assert(io.open(p,'rb'));local s=f:read('*a');f:close();return s end
local M=dofile(root..'/extension/commands.lua');dofile(root..'/extension/vyi.lua')(M);dofile(root..'/extension/runtime.lua')(M,json.decode(read(root..'/extension/catalog.json')))
local inspected=M.dispatch{commands={{name='vyi.inspect',args={path=out..'/slime.vyi'}}},atomic=false};assert(inspected.version==1 and #inspected.icons==1)
local result=M.dispatch{commands={{name='vyi.import',args={path=out..'/import.json',icon=0}}},atomic=false};assert(result.width==32);assert(#result.frames==4);assert(result.tags[1].name=='idle');assert(result.tags[1].from==2);assert(result.tags[1].to==4)
local output=M.dispatch{commands={{name='vyi.export',args={path=out..'/roundtrip.vyi',layers={'Base'},merge=false}}},atomic=false};assert(#output.icons==1);assert(#output.icons[1].states==1);assert(#output.icons[1].states[1].frames==2);assert(output.icons[1].states[1].name=='idle');print('VYI ROUND TRIP OK')
