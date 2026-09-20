-- Vylocity v1 wire format independently implemented from the ase2vyi exporter.
-- Compatibility reference: https://doubleactii.itch.io/ase2vyi (Active / doubleactii).
return function(M)
 local H=M.handlers;local check=M.check
 local SKIP,PREVIEW='_es_skipped_frame','_es_main_image'
 local function data(c)
  if not c or not c.data or c.data=='' then return {} end
  local ok,value=pcall(function() local value=json.decode(c.data);local out={};for k,v in pairs(value) do out[k]=v end;return out end);check(ok and type(value)=='table','Cel has non-JSON user data. Keep that data intact and use another cel for markers.');return value
 end
 local function marked(c,key) if not c then return false end;local ok,d=pcall(data,c);if ok then return d[key]==true end;return false end
 local function mark(c,key,value) local d=data(c);d[key]=value and true or nil;c.data=json.encode(d) end
 H['vyi.skip']=function(a) local s,l,f=M.targetCel(a);local c=l:cel(f) or s:newCel(l,f);mark(c,SKIP,a.skip) end
 H['vyi.preview']=function(a) local s,l,f=M.targetCel(a);local c=check(l:cel(f),'Preview cel is empty.');for _,other in ipairs(l.cels) do if marked(other,PREVIEW) then mark(other,PREVIEW,false) end end;mark(c,PREVIEW,true) end
 H['vyi.export']=function(a)
  local s=M.sprite();check(s.colorMode==ColorMode.RGB,'VYI export requires RGB mode.');local chosen,seen={},{};for _,name in ipairs(a.layers) do check(not seen[name],'Duplicate selected layer.');seen[name]=true;local l=M.layer(s,name);check(l.isImage and not l.isTilemap and #l.cels>0,'VYI export needs image layers with cels.');chosen[l.name]=true end
  local ordered={};for _,l in ipairs(M.layers(s)) do if chosen[l.name] then ordered[#ordered+1]=l end end
  local groups={};if a.merge then groups[1]=ordered else for _,l in ipairs(ordered) do groups[#groups+1]={l} end end
  local manifest={icons={}};local serial=0;local dir=app.fs.filePath(a.path)
  for _,layers in ipairs(groups) do
   local cache={};local function png(f)
    if cache[f] then return cache[f] end;M.spend(s.width*s.height);serial=serial+1;check(serial<=512,'VYI export is limited to 512 unique frame images.');local im=Image(s.width,s.height,ColorMode.RGB)
    for _,l in ipairs(layers) do local c=l:cel(f);if c then im:drawImage(c.image,c.position,math.floor(c.opacity*l.opacity/255),l.blendMode) end end
    local file='frame-'..serial..'.png';im:saveAs(app.fs.joinPath(dir,file));local r={file=file,duration=math.floor(s.frames[f].duration*1000+0.5)};cache[f]=r;return r
   end
   local function skipped(f) for _,l in ipairs(layers) do if marked(l:cel(f),SKIP) then return true end end;return false end
   local preview=1;local found=false;for _,l in ipairs(layers) do for _,c in ipairs(l.cels) do if marked(c,PREVIEW) then preview=c.frame.frameNumber;found=true;break end end;if found then break end end
   local icon={name=a.name or (#layers>1 and layers[1].name..'_merged' or layers[1].name),width=s.width,height=s.height,base=png(preview),frames={},states={}}
   check(not a.name or #groups==1,'A custom name requires a single icon.');local names={}
   local function state(name,from,to)
    local frames={};for f=from,to do if not skipped(f) then frames[#frames+1]=png(f) end end
    if #frames==0 then return end;check(not names[name],'Duplicate VYI state name: '..name);names[name]=true;local base=table.remove(frames,1);icon.states[#icon.states+1]={name=name,base=base,frames=frames}
   end
   if #s.tags>0 then
    local tagged={};for _,t in ipairs(s.tags) do state(t.name,t.fromFrame.frameNumber,t.toFrame.frameNumber);for f=t.fromFrame.frameNumber,t.toFrame.frameNumber do tagged[f]=true end end
    local start,index=nil,0;for f=1,#s.frames do if not tagged[f] then start=start or f;if f==#s.frames or tagged[f+1] then index=index+1;state('cel'..index,start,f);start=nil end end end
   else for f=2,#s.frames do if not skipped(f) then icon.frames[#icon.frames+1]=png(f) end end end
   manifest.icons[#manifest.icons+1]=icon
  end
  return manifest
 end
 H['vyi.inspect']=function(a) local f=check(io.open(a.path,'rb'),'Cannot open VYI.');local text=f:read('*a');f:close();check(#text<=33554432,'VYI too large.');local d=json.decode(text);check(d.v==1 and (type(d.i)=='table' or type(d.i)=='userdata'),'Unsupported VYI.');local icons={};for _,ic in ipairs(d.i) do icons[#icons+1]={name=ic[1],width=ic[2],height=ic[3]} end;return {version=1,icons=icons} end
 H['vyi.import']=function(a)
  -- Server validates every embedded PNG and writes this private import manifest.
  local f=check(io.open(a.path,'rb'),'Cannot open import manifest.');local d=json.decode(f:read('*a'));f:close();check(d.width<=1024 and d.height<=1024 and #d.frames<=256,'Import exceeds limits.');local old=M.target;local s=M.create(d.width,d.height,d.name)
  local ok,err=pcall(function()
   local l=s.layers[1];l.name=d.name
   for i,item in ipairs(d.frames) do if i>1 then s:newEmptyFrame(i) end;s.frames[i].duration=item.duration/1000;local im=Image{fromFile=item.file};check(im.width==d.width and im.height==d.height,'Wrong frame size.');local c=l:cel(i);if c then c.image=im;c.position=Point(0,0) else c=s:newCel(l,i,im,Point(0,0)) end;if item.preview then mark(c,PREVIEW,true) end;if item.skip then mark(c,SKIP,true) end end
   for _,tag in ipairs(d.tags) do local t=s:newTag(tag.from,tag.to);t.name=tag.name end
  end)
  if not ok then s:close();M.target=old;error(err,0) end;return M.meta(s)
 end
end
