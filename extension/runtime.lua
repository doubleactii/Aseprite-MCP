-- Schema validation is repeated inside Aseprite, before dispatch.
return function(M,catalog)
 local byName={};for _,c in ipairs(catalog) do byName[c.name]=c end
 local function plain(v,depth)
  depth=depth or 0;assert(depth<=32,'JSON nesting exceeds 32 levels');if type(v)=='userdata' or type(v)=='table' then local out={};if type(v)=='userdata' and tostring(v):match('^%s*%[') then for k,item in ipairs(v) do out[k]=plain(item,depth+1) end else for k,item in pairs(v) do out[k]=plain(item,depth+1) end end;return out end;return v
 end
 M.plain=plain
 local function validate(v,s,path)
  if v==nil and s.default~=nil then v=s.default end
  if s.type=='object' then
   assert(type(v)=='table',path..' must be an object');local out={};local required={};for _,k in ipairs(s.required or {}) do required[k]=true end
   for k,_ in pairs(v) do assert(s.properties[k],path..': unknown field '..tostring(k)) end
   for k,p in pairs(s.properties) do assert(v[k]~=nil or p.default~=nil or not required[k],path..': missing '..k);if v[k]~=nil or p.default~=nil then out[k]=validate(v[k],p,path..'.'..k) end end;return out
  elseif s.type=='array' then assert(type(v)=='table',path..' must be an array');assert(#v>=(s.minItems or 0) and #v<=(s.maxItems or 65536),path..' array size out of range');local out={};for i,item in ipairs(v) do out[i]=validate(item,s.items,path..'['..i..']') end;return out
  elseif s.type=='integer' or s.type=='number' then assert(type(v)=='number' and v==v and math.abs(v)<math.huge,path..' must be a finite number');if s.type=='integer' then assert(v%1==0,path..' must be an integer') end;assert(v>=(s.minimum or -math.huge) and v<=(s.maximum or math.huge),path..' out of range')
  elseif s.type=='string' then assert(type(v)=='string',path..' must be text');assert(#v>=(s.minLength or 0) and #v<=(s.maxLength or 1048576),path..' text length out of range')
  elseif s.type=='boolean' then assert(type(v)=='boolean',path..' must be boolean') end
  if s.enum then local found=false;for _,x in ipairs(s.enum) do if x==v then found=true end end;assert(found,path..' is not an allowed value') end;return v
 end
 function M.dispatch(payload)
  payload=plain(payload)
  assert(type(payload)=='table' and type(payload.commands)=='table','Invalid request');assert(#payload.commands>=1 and #payload.commands<=64,'Batch needs 1–64 commands');assert(not M.paused,'AI control is paused. Resume from File > AI Connection.');M.work=0
  local parsed={};for _,c in ipairs(payload.commands) do
   local spec=assert(byName[c.name],'Unknown command');assert(M.handlers[c.name],'Missing handler: '..c.name)
   if payload.atomic then assert(spec.batch and spec.effect=='edit','Command cannot be batched') else assert(#payload.commands==1,'Multiple commands need an atomic batch') end
   local args=validate(c.args or {},spec.parameters,c.name)
   if spec.input or spec.output then
    local path=args.path;local root=M.workspace and M.workspace:gsub('\\','/'):gsub('/$','')
    if root then local normalized=path:gsub('\\','/');assert(normalized:sub(1,#root+1)==root..'/' and not normalized:find('/%.%./') and not normalized:find('%z'),'File outside artwork folder') end
   end
   parsed[#parsed+1]={name=c.name,args=args,spec=spec}
  end
  local results={};local function run() for i,c in ipairs(parsed) do local result=M.handlers[c.name](c.args);if M.target and M.target.isValid then M.bounded(M.target) end;results[i]=result or {ok=true} end end
  local c=parsed[1];local transaction=payload.atomic or (c.spec.effect=='edit' and c.spec.batch)
  -- Selection and current-frame changes are not in Aseprite's undo history.
  local s=M.target and M.target.isValid and M.target or nil;local selection=s and Selection() or nil;local oldFrame=app.frame;local oldLayer=app.layer
  if selection then selection:add(s.selection) end
  local ok,err=pcall(function() if transaction then M.sprite();app.transaction('AI: '..(#parsed==1 and c.name or (#parsed..' edits')),run) else run() end end)
  if not ok then if s and s.isValid then s.selection=selection;app.sprite=s;pcall(function() app.frame=oldFrame;app.layer=oldLayer end) end;error(err,0) end
  app.refresh();if payload.atomic then return {completed=#parsed,undo='One undo step for artwork edits; selection/frame changes are editor state.'} end;return results[1]
 end
 M.validate=validate
 return M
end
