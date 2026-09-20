-- All drawing edits replace cloned images so Aseprite can undo them.
local M={handlers={},target=nil,paused=false,allowLua=false,work=0}
local H=M.handlers
local function check(v,msg) if not v then error(msg,0) end return v end
local function spend(n) M.work=M.work+n;check(M.work<=8000000,'Operation exceeds pixel work budget; use smaller batches.') end
local function bounded(s) check(s.width<=1024 and s.height<=1024 and #s.frames<=256,'Sprite exceeds limits: 1024px per side / 256 frames.');check(s.width*s.height*math.max(1,#s.cels)<=16777216,'Sprite exceeds 16 million cel pixels.');return s end
local function sprite() local s=check(M.target and M.target.isValid and M.target,'No AI target. Create a sprite or use sprite.select first.');app.sprite=s;return bounded(s) end
local function rect(r) return Rectangle(r.x,r.y,r.width,r.height) end
local function bounds(r) return {x=r.x,y=r.y,width=r.width,height=r.height} end
local function allLayers(s) local out={};local function walk(ls) for _,l in ipairs(ls) do out[#out+1]=l;if l.isGroup then walk(l.layers) end end end;walk(s.layers);return out end
local function layer(s,name) local found=nil;for _,l in ipairs(allLayers(s)) do if l.name==name then check(not found,'Layer name is ambiguous. Rename duplicate layers.');found=l end end;return check(found,'Layer not found: '..tostring(name)) end
local function unique(s,name) for _,l in ipairs(allLayers(s)) do check(l.name~=name,'Layer name already exists.') end end
local function frame(s,f) f=f or (app.frame and app.frame.frameNumber) or 1;check(s.frames[f],'Frame does not exist.');return f end
local function target(a) local s=sprite();local l=a.layer and layer(s,a.layer) or app.layer or s.layers[1];check(l and l.isImage and not l.isTilemap,'Select an image layer.');check(l.isEditable,'Layer is locked.');return s,l,frame(s,a.frame) end
local function rgba(hex) check(type(hex)=='string' and (hex:match('^#%x%x%x%x%x%x$') or hex:match('^#%x%x%x%x%x%x%x%x$')),'Use #RRGGBB or #RRGGBBAA.');return app.pixelColor.rgba(tonumber(hex:sub(2,3),16),tonumber(hex:sub(4,5),16),tonumber(hex:sub(6,7),16),#hex==9 and tonumber(hex:sub(8,9),16) or 255) end
local pc=app.pixelColor
local function hex(p) return string.format('#%02x%02x%02x%02x',pc.rgbaR(p),pc.rgbaG(p),pc.rgbaB(p),pc.rgbaA(p)) end
local function rendered(s,f) spend(s.width*s.height);local im=Image(s.width,s.height,ColorMode.RGB);im:drawSprite(s,frame(s,f));return im end
local function canvas(a) local s,l,f=target(a);check(s.colorMode==ColorMode.RGB,'Drawing needs RGB color mode. Convert in Aseprite first.');spend(s.width*s.height);local im=Image(s.width,s.height,ColorMode.RGB);local c=l:cel(f);if c then im:drawImage(c.image,c.position) end;return s,l,f,im end
local function put(s,im,x,y,p) if x>=0 and y>=0 and x<s.width and y<s.height and (s.selection.isEmpty or s.selection:contains(Point(x,y))) then im:drawPixel(x,y,p) end end
local function commit(s,l,f,im) local c=l:cel(f);if c then c.image=im;c.position=Point(0,0) else s:newCel(l,f,im,Point(0,0)) end end
local function edit(a,fn) local s,l,f,im=canvas(a);fn(s,im);commit(s,l,f,im);return {changed=true} end
local function line(s,im,x,y,x2,y2,p,size)
 local dx=math.abs(x2-x);local sx=x<x2 and 1 or -1;local dy=-math.abs(y2-y);local sy=y<y2 and 1 or -1;local err=dx+dy;size=size or 1;spend((dx-dy+1)*size*size)
 while true do for by=0,size-1 do for bx=0,size-1 do put(s,im,x+bx,y+by,p) end end;if x==x2 and y==y2 then break end;local e=2*err;if e>=dy then err=err+dy;x=x+sx end;if e<=dx then err=err+dx;y=y+sy end end
end
local function region(a,s,fn) local x0=math.max(0,a.x);local y0=math.max(0,a.y);local x1=math.min(s.width-1,a.x+a.width-1);local y1=math.min(s.height-1,a.y+a.height-1);spend(math.max(0,x1-x0+1)*math.max(0,y1-y0+1));for y=y0,y1 do for x=x0,x1 do fn(x,y) end end end
local function meta(s)
 local layers,frames,tags={},{},{};for _,l in ipairs(allLayers(s)) do layers[#layers+1]={name=l.name,group=l.isGroup,visible=l.isVisible,opacity=l.opacity,index=l.stackIndex} end
 for i,f in ipairs(s.frames) do frames[#frames+1]={frame=i,duration=math.floor(f.duration*1000+0.5)} end
 for _,t in ipairs(s.tags) do tags[#tags+1]={name=t.name,from=t.fromFrame.frameNumber,to=t.toFrame.frameNumber,direction=t.aniDir} end
 return {id=s.id,width=s.width,height=s.height,modified=s.isModified,layers=layers,frames=frames,tags=tags}
end
local function create(w,h,name) check(w*h<=1048576,'Canvas too large.');local s=Sprite(w,h,ColorMode.RGB);M.target=s;if name then s.filename=name end;return s end
H['sprite.create']=function(a) return meta(create(a.width,a.height,a.name)) end
H['sprite.info']=function() return meta(sprite()) end
H['sprite.list']=function() local out={};for _,s in ipairs(app.sprites) do out[#out+1]={id=s.id,name=app.fs.fileName(s.filename),width=s.width,height=s.height} end;return out end
H['sprite.select']=function(a) for _,s in ipairs(app.sprites) do if s.id==a.id then bounded(s);M.target=s;app.sprite=s;return meta(s) end end;error('Sprite is no longer open.') end
H['sprite.open']=function(a) local s=check(app.open(a.path),'Could not open sprite.');M.target=s;return meta(bounded(s)) end
H['sprite.save']=function(a) sprite():saveCopyAs(a.path);return {saved=true} end
H['sprite.resize']=function(a) local s=sprite();check(a.width*a.height*math.max(1,#s.cels)<=16777216,'Resize exceeds memory limit.');s:resize(a.width,a.height) end
H['sprite.crop']=function(a) sprite():crop(rect(a)) end
H['sprite.duplicate']=function() local s=Sprite(sprite());M.target=s;return meta(s) end
H['sprite.close']=function() local s=sprite();check(not s.isModified,'Unsaved changes. Save in Aseprite before closing.');s:close();M.target=nil end
H['drawing.pixel']=function(a) return edit(a,function(s,im) put(s,im,a.x,a.y,rgba(a.color)) end) end
H['drawing.pixels']=function(a) return edit(a,function(s,im) for _,p in ipairs(a.pixels) do put(s,im,p.x,p.y,rgba(p.color)) end end) end
H['drawing.line']=function(a) return edit(a,function(s,im) line(s,im,a.x,a.y,a.x2,a.y2,rgba(a.color)) end) end
for _,kind in ipairs({'rectangle','filled_rectangle','ellipse','filled_ellipse','erase'}) do
 H['drawing.'..kind]=function(a) return edit(a,function(s,im)
  local p=kind=='erase' and 0 or rgba(a.color)
  region(a,s,function(x,y)
   local inside=true
   if kind=='rectangle' then inside=x==a.x or x==a.x+a.width-1 or y==a.y or y==a.y+a.height-1
   elseif kind:find('ellipse') then
    local rx=a.width/2;local ry=a.height/2;local cx=a.x+rx-0.5;local cy=a.y+ry-0.5
    local function within(xx,yy) return ((xx-cx)/rx)^2+((yy-cy)/ry)^2<=1 end
    inside=within(x,y);if kind=='ellipse' then inside=inside and not (within(x-1,y) and within(x+1,y) and within(x,y-1) and within(x,y+1)) end
   end
   if inside then put(s,im,x,y,p) end
  end)
 end) end
end
H['drawing.fill']=function(a) return edit(a,function(s,im)
 check(a.x>=0 and a.y>=0 and a.x<s.width and a.y<s.height,'Fill point outside canvas.');local old=im:getPixel(a.x,a.y);local p=rgba(a.color);if old==p then return end
 local start=a.y*s.width+a.x;local queue={start};local seen={[start]=true};local head,tail=1,1
 local function enqueue(x,y) if x>=0 and y>=0 and x<s.width and y<s.height then local key=y*s.width+x;if not seen[key] then seen[key]=true;tail=tail+1;queue[tail]=key end end end
 while head<=tail do local key=queue[head];queue[head]=nil;head=head+1;local x,y=key%s.width,math.floor(key/s.width);spend(1)
  if im:getPixel(x,y)==old and (s.selection.isEmpty or s.selection:contains(Point(x,y))) then im:drawPixel(x,y,p);enqueue(x+1,y);enqueue(x-1,y);enqueue(x,y+1);enqueue(x,y-1) end
 end
end) end
for _,kind in ipairs({'stroke','polygon'}) do H['drawing.'..kind]=function(a) return edit(a,function(s,im)
 local p=rgba(a.color);local prev=a.points[1];line(s,im,prev.x,prev.y,prev.x,prev.y,p,a.size)
 for i=2,#a.points do local v=a.points[i];line(s,im,prev.x,prev.y,v.x,v.y,p,a.size);prev=v end
 if kind=='polygon' then local first=a.points[1];line(s,im,prev.x,prev.y,first.x,first.y,p) end
end) end end
H['drawing.clear']=function(a) return edit(a,function(s,im) for y=0,s.height-1 do for x=0,s.width-1 do put(s,im,x,y,0) end end end) end
H['drawing.dither']=function(a) return edit(a,function(s,im) local b={0,8,2,10,12,4,14,6,3,11,1,9,15,7,13,5};local c1,c2=rgba(a.color),rgba(a.color2);region(a,s,function(x,y) put(s,im,x,y,b[(y%4)*4+x%4+1]<a.density and c2 or c1) end) end) end
local function mix(p,q,t) local function c(f) return math.floor(f(p)+(f(q)-f(p))*t+0.5) end;return pc.rgba(c(pc.rgbaR),c(pc.rgbaG),c(pc.rgbaB),c(pc.rgbaA)) end
H['drawing.gradient']=function(a) return edit(a,function(s,im) local p,q=rgba(a.color),rgba(a.color2);region(a,s,function(x,y) local t=a.axis=='x' and (x-a.x)/math.max(1,a.width-1) or (y-a.y)/math.max(1,a.height-1);t=math.floor(t*(a.steps-1)+0.5)/(a.steps-1);put(s,im,x,y,mix(p,q,t)) end) end) end
H['drawing.symmetry']=function(a) return edit(a,function(s,im) for _,v in ipairs(a.pixels) do local p=rgba(v.color);put(s,im,v.x,v.y,p);if a.axis~='y' then put(s,im,s.width-1-v.x,v.y,p) end;if a.axis~='x' then put(s,im,v.x,s.height-1-v.y,p) end;if a.axis=='both' then put(s,im,s.width-1-v.x,s.height-1-v.y,p) end end end) end
H['drawing.pattern']=function(a) return edit(a,function(s,im) local colors={};for i,c in ipairs(a.colors) do colors[i]=rgba(c) end;local w=#a.rows[1];for y,row in ipairs(a.rows) do check(#row==w,'Pattern rows must be equal length.');for x,index in ipairs(row) do if index>=0 then put(s,im,a.x+x-1,a.y+y-1,check(colors[index+1],'Pattern palette index out of range.')) end end end end) end
H['layer.list']=function() return meta(sprite()).layers end
H['layer.add']=function(a) local s=sprite();check(#allLayers(s)<128,'Layer limit reached.');unique(s,a.name);local l=s:newLayer();l.name=a.name;app.layer=l end
H['layer.delete']=function(a) local s=sprite();check(#allLayers(s)>1,'Keep at least one layer.');s:deleteLayer(layer(s,a.layer)) end
H['layer.rename']=function(a) local s=sprite();unique(s,a.name);layer(s,a.layer).name=a.name end
H['layer.opacity']=function(a) layer(sprite(),a.layer).opacity=a.opacity end
H['layer.blend']=function(a) layer(sprite(),a.layer).blendMode=check(BlendMode[a.mode],'Unknown blend mode.') end
H['layer.visibility']=function(a) layer(sprite(),a.layer).isVisible=a.visible end
H['layer.reorder']=function(a) local l=layer(sprite(),a.layer);check(a.index<=#l.parent.layers,'Layer index outside parent.');l.stackIndex=a.index end
H['layer.group']=function(a) local s=sprite();check(#allLayers(s)<128,'Layer limit reached.');unique(s,a.name);s:newGroup().name=a.name end
H['layer.parent']=function(a) local s=sprite();local l=layer(s,a.layer);local parent=a.group and layer(s,a.group) or s;check(parent==s or parent.isGroup,'Parent must be a group.');local p=parent;while p and p~=s do check(p~=l,'Group cycle is not allowed.');p=p.parent end;l.parent=parent end
H['layer.duplicate']=function(a) local s=sprite();local src=layer(s,a.layer);check(src.isImage and not src.isTilemap,'Duplicate supports image layers.');unique(s,a.name);check(#allLayers(s)<128,'Layer limit reached.');local l=s:newLayer();l.name=a.name;l.opacity=src.opacity;l.blendMode=src.blendMode;l.isVisible=src.isVisible;for _,c in ipairs(src.cels) do local nc=s:newCel(l,c.frame,Image(c.image),c.position);nc.opacity=c.opacity end;bounded(s) end
H['layer.flatten']=function() sprite():flatten() end
H['animation.frames']=function() return meta(sprite()).frames end
local function capacity(s,count) check(#s.frames+count<=256,'Frame limit reached.');check(s.width*s.height*math.max(1,#allLayers(s))*(#s.frames+count)<=16777216,'Animation exceeds memory limit.') end
H['animation.add']=function(a) local s=sprite();capacity(s,a.count);for i=1,a.count do s:newEmptyFrame(#s.frames+1).duration=a.duration/1000 end end
H['animation.duplicate']=function(a) local s=sprite();capacity(s,1);s:newFrame(frame(s,a.frame)) end
H['animation.delete']=function(a) local s=sprite();check(#s.frames>1,'Keep at least one frame.');s:deleteFrame(frame(s,a.frame)) end
H['animation.duration']=function(a) local s=sprite();check(a.from<=a.to,'Frame range is reversed.');frame(s,a.to);for i=a.from,a.to do s.frames[i].duration=a.duration/1000 end end
H['animation.select']=function(a) local s=sprite();app.frame=s.frames[frame(s,a.frame)] end
H['animation.tags']=function() return meta(sprite()).tags end
local function tag(s,name) for _,t in ipairs(s.tags) do if t.name==name then return t end end;error('Tag not found: '..name) end
H['animation.tag']=function(a) local s=sprite();check(a.from<=a.to,'Tag range is reversed.');frame(s,a.from);frame(s,a.to);for _,t in ipairs(s.tags) do check(t.name~=a.name,'Tag already exists.') end;local t=s:newTag(a.from,a.to);t.name=a.name;t.aniDir=AniDir[a.direction] end
H['animation.delete_tag']=function(a) local s=sprite();s:deleteTag(tag(s,a.name)) end
H['animation.rename_tag']=function(a) local s=sprite();for _,t in ipairs(s.tags) do check(t.name~=a.newName,'Tag already exists.') end;tag(s,a.name).name=a.newName end
H['animation.interpolate']=function(a) local s=sprite();capacity(s,a.count);local l=layer(s,a.layer);local c=check(l:cel(frame(s,a.frame)),'Source cel is empty.');local im=Image(c.image);local pos=c.position;for i=1,a.count do local f=s:newEmptyFrame(#s.frames+1);f.duration=s.frames[a.frame].duration;s:newCel(l,f,Image(im),Point(pos.x+math.floor(a.dx*i/a.count+0.5),pos.y+math.floor(a.dy*i/a.count+0.5))) end end
local function paletteColors(s) local out={};local p=s.palettes[1];for i=0,#p-1 do out[#out+1]=hex(p:getColor(i).rgbaPixel) end;return out end
local function setPalette(s,colors) local p=Palette(#colors);for i,c in ipairs(colors) do p:setColor(i-1,Color{rgbaPixel=rgba(c)}) end;s:setPalette(p) end
H['palette.list']=function() local out={};for _,p in ipairs(M.palettes) do out[#out+1]={name=p.name,author=p.author,source=p.source,colors=#p.colors} end;return out end
H['palette.get']=function() return paletteColors(sprite()) end
H['palette.set']=function(a) setPalette(sprite(),a.colors) end
H['palette.builtin']=function(a) for _,p in ipairs(M.palettes) do if p.name==a.name then setPalette(sprite(),p.colors);return end end;error('Unknown palette.') end
H['palette.color']=function(a) local s=sprite();local colors=paletteColors(s);check(a.index<#colors,'Palette index out of range.');colors[a.index+1]=a.color;setPalette(s,colors) end
H['palette.ramp']=function(a) local colors={};for i=0,a.steps-1 do colors[#colors+1]=hex(mix(rgba(a.from),rgba(a.to),i/(a.steps-1))) end;setPalette(sprite(),colors) end
local function lum(p) return pc.rgbaR(p)*0.2126+pc.rgbaG(p)*0.7152+pc.rgbaB(p)*0.0722 end
H['palette.sort']=function(a) local s=sprite();local colors=paletteColors(s);table.sort(colors,function(p,q) if a.order=='descending' then return lum(rgba(p))>lum(rgba(q)) end;return lum(rgba(p))<lum(rgba(q)) end);setPalette(s,colors) end
local function loadImage(path) local im=check(Image{fromFile=path},'Could not load image.');check(im.width<=1024 and im.height<=1024 and im.colorMode==ColorMode.RGB,'Image must be RGB, at most 1024px per side.');return im end
H['palette.import_image']=function(a) local im=loadImage(a.path);local colors,seen={},{};for p in im:pixels() do local v=p();if not seen[v] then check(#colors<256,'Image has more than 256 colors.');seen[v]=true;colors[#colors+1]=hex(v) end end;setPalette(sprite(),colors) end
H['palette.export']=function(a) local colors=paletteColors(sprite());local im=Image(#colors,1,ColorMode.RGB);for i,c in ipairs(colors) do im:drawPixel(i-1,0,rgba(c)) end;im:saveAs(a.path) end
H['palette.nearest']=function(a) local p=rgba(a.color);local best,dist,index=nil,math.huge,0;for i,c in ipairs(paletteColors(sprite())) do local q=rgba(c);local d=(pc.rgbaR(p)-pc.rgbaR(q))^2+(pc.rgbaG(p)-pc.rgbaG(q))^2+(pc.rgbaB(p)-pc.rgbaB(q))^2;if d<dist then best,dist,index=c,d,i-1 end end;return {color=best,index=index,distance=math.sqrt(dist)} end
H['selection.rectangle']=function(a) sprite().selection:select(rect(a)) end
H['selection.ellipse']=function(a) local s=sprite();local sel=Selection();region(a,s,function(x,y) if ((x-a.x+0.5-a.width/2)/(a.width/2))^2+((y-a.y+0.5-a.height/2)/(a.height/2))^2<=1 then sel:add(Rectangle(x,y,1,1)) end end);s.selection=sel end
H['selection.color']=function(a) local s=sprite();local im=rendered(s,a.frame);local p=rgba(a.color);local sel=Selection();for y=0,s.height-1 do local start=nil;for x=0,s.width do local match=x<s.width and im:getPixel(x,y)==p;if match and not start then start=x elseif not match and start then sel:add(Rectangle(start,y,x-start,1));start=nil end end end;s.selection=sel end
H['selection.invert']=function() local s=sprite();local sel=Selection(s.bounds);sel:subtract(s.selection);s.selection=sel end
H['selection.all']=function() local s=sprite();s.selection:select(s.bounds) end
H['selection.clear']=function() sprite().selection:deselect() end
H['selection.bounds']=function() local s=sprite();return {empty=s.selection.isEmpty,bounds=bounds(s.selection.bounds)} end
H['selection.translate']=function(a) local s=sprite();local sel=Selection();local b=s.selection.bounds;spend(b.width*b.height);for y=b.y,b.y+b.height-1 do for x=b.x,b.x+b.width-1 do if s.selection:contains(Point(x,y)) then sel:add(Rectangle(x+a.dx,y+a.dy,1,1)) end end end;sel:intersect(s.bounds);s.selection=sel end
H['export.png']=function(a) rendered(sprite(),a.frame):saveAs(a.path) end
H['export.sheet']=function(a) local s=sprite();local cols=math.min(a.columns,#s.frames);local rows=math.ceil(#s.frames/cols);check(cols*s.width*rows*s.height<=16777216,'Sheet exceeds 16 million pixels.');local im=Image(cols*s.width,rows*s.height,ColorMode.RGB);for i=1,#s.frames do im:drawImage(rendered(s,i),Point(((i-1)%cols)*s.width,math.floor((i-1)/cols)*s.height)) end;im:saveAs(a.path) end
H['export.gif']=function(a) sprite():saveCopyAs(a.path) end
H['animation.preview']=H['export.gif']
H['export.layer']=function(a) local s,l,f,im=canvas(a);im:saveAs(a.path) end
H['export.tag']=function(a) local s=sprite();local t=tag(s,a.name);local copy=Sprite(s);local ok,err=pcall(function() for i=#copy.frames,t.toFrame.frameNumber+1,-1 do copy:deleteFrame(i) end;for i=t.fromFrame.frameNumber-1,1,-1 do copy:deleteFrame(i) end;copy:saveCopyAs(a.path) end);copy:close();app.sprite=s;check(ok,err) end
local function write(path,text) local f=check(io.open(path,'wb'),'Could not write file.');f:write(text);f:close() end
H['export.metadata']=function(a) write(a.path,json.encode(meta(sprite()))) end
local function compare(s,from,to) local a,b=rendered(s,from),rendered(s,to);local count=0;local minx,miny,maxx,maxy=s.width,s.height,-1,-1;local diff=Image(s.width,s.height,ColorMode.RGB);for y=0,s.height-1 do for x=0,s.width-1 do if a:getPixel(x,y)~=b:getPixel(x,y) then count=count+1;minx=math.min(minx,x);miny=math.min(miny,y);maxx=math.max(maxx,x);maxy=math.max(maxy,y);diff:drawPixel(x,y,rgba('#ff4d8d')) end end end;return {changed=count,bounds=count>0 and {x=minx,y=miny,width=maxx-minx+1,height=maxy-miny+1} or nil},diff end
H['analysis.compare']=function(a) local result=compare(sprite(),a.from,a.to);return result end
H['analysis.diff']=function(a) local result,im=compare(sprite(),a.from,a.to);im:saveAs(a.path);return result end
H['analysis.colors']=function(a) local im=rendered(sprite(),a.frame);local counts={};for p in im:pixels() do local v=p();counts[v]=(counts[v] or 0)+1 end;local out={};for p,n in pairs(counts) do out[#out+1]={color=hex(p),count=n} end;table.sort(out,function(p,q) return p.count>q.count or (p.count==q.count and p.color<q.color) end);while #out>a.limit do table.remove(out) end;return out end
H['analysis.bounds']=function(a) local s=sprite();local im=rendered(s,a.frame);local x0,y0,x1,y1=s.width,s.height,-1,-1;for y=0,s.height-1 do for x=0,s.width-1 do if pc.rgbaA(im:getPixel(x,y))>0 then x0=math.min(x0,x);y0=math.min(y0,y);x1=math.max(x1,x);y1=math.max(y1,y) end end end;return {empty=x1<0,bounds=x1>=0 and {x=x0,y=y0,width=x1-x0+1,height=y1-y0+1} or nil} end
H['analysis.pixel']=function(a) local s=sprite();check(a.x>=0 and a.y>=0 and a.x<s.width and a.y<s.height,'Pixel outside canvas.');return {color=hex(rendered(s,a.frame):getPixel(a.x,a.y))} end
H['analysis.validate']=function() local s=sprite();local warnings={};local prev=nil;for i,f in ipairs(s.frames) do local im=rendered(s,i);if f.duration<0.02 then warnings[#warnings+1]='Frame '..i..' is shorter than 20ms.' end;if im:isEmpty() then warnings[#warnings+1]='Frame '..i..' is empty.' end;if prev and im.bytes==prev then warnings[#warnings+1]='Frame '..i..' duplicates its predecessor.' end;prev=im.bytes end;return {frames=#s.frames,warnings=warnings,valid=#warnings==0} end
for _,kind in ipairs({'flip','rotate','shift','scale'}) do H['transform.'..kind]=function(a) return edit(a,function(s,im)
 local src=Image(im);im:clear();for y=0,s.height-1 do for x=0,s.width-1 do local sx,sy=x,y
  if kind=='flip' then if a.axis=='x' then sx=s.width-1-x else sy=s.height-1-y end
  elseif kind=='shift' then sx=x-a.dx;sy=y-a.dy;if a.wrap then sx=sx%s.width;sy=sy%s.height end
  elseif kind=='scale' then sx=math.floor(x/a.factor);sy=math.floor(y/a.factor)
  elseif a.degrees=='180' then sx=s.width-1-x;sy=s.height-1-y
  elseif a.degrees=='90' then sx=y;sy=s.height-1-x else sx=s.width-1-y;sy=x end
  if sx>=0 and sy>=0 and sx<s.width and sy<s.height then im:drawPixel(x,y,src:getPixel(sx,sy)) end
 end end
end) end end
H['templates.character']=function(a) check(a.width*a.height*24<=16777216,'Character template exceeds memory limit.');local s=create(a.width,a.height,'Character');s.layers[1].name='Base';s:newLayer().name='Shading';s:newLayer().name='Outline';for i=2,8 do s:newEmptyFrame(i) end;local t=s:newTag(1,4);t.name='idle';t=s:newTag(5,8);t.name='walk';return meta(s) end
H['templates.tileset']=function(a) local s=create(a.tileWidth*a.columns,a.tileHeight*a.rows,'Tiles');s.gridBounds=Rectangle(0,0,a.tileWidth,a.tileHeight);s.layers[1].name='Tiles';return meta(s) end
H['templates.icon']=function(a) local s=create(a.size,a.size,'Icon');s.layers[1].name='Base';s:newLayer().name='Highlights';return meta(s) end
H['editor.status']=function() return {version=tostring(app.version),paused=M.paused,luaEnabled=M.allowLua,target=M.target and M.target.isValid and M.target.id or nil} end
H['editor.undo']=function() sprite();app.undo() end
H['editor.redo']=function() sprite();app.redo() end
H['editor.refresh']=function() app.refresh() end
H['editor.lua']=function(a) check(M.allowLua,'Lua execution is disabled in the local extension config.');check(app.isUIAvailable,'Lua needs an interactive approval.');local d=Dialog('Review AI Lua — full computer access');d:label{text='This code can read/write files and run programs.'};d:label{text='Only run code you understand and trust.'};d:textarea{id='code',text=a.code,width=640,height=300};d:button{id='cancel',text='Cancel'};d:button{id='run',text='Run once'};d:show{wait=true};check(d.data.run,'Lua execution cancelled.');local fn=check(load(a.code,'AI approved Lua','t',_G),'Invalid Lua.');fn();return {executed=true} end
H['cel.info']=function(a) local s,l,f=target(a);local c=l:cel(f);return c and {exists=true,position={x=c.position.x,y=c.position.y},width=c.image.width,height=c.image.height,opacity=c.opacity} or {exists=false} end
H['cel.create']=function(a) local s,l,f=target(a);check(not l:cel(f),'Cel already exists.');s:newCel(l,f) end
H['cel.delete']=function(a) local s,l,f=target(a);local c=l:cel(f);if c then s:deleteCel(c) end end
H['cel.move']=function(a) local s,l,f=target(a);check(l:cel(f),'Cel is empty.').position=Point(a.x,a.y) end
H['cel.opacity']=function(a) local s,l,f=target(a);check(l:cel(f),'Cel is empty.').opacity=a.opacity end
H['cel.copy']=function(a) local s,l,f=target(a);local c=check(l:cel(f),'Cel is empty.');frame(s,a.to);check(not l:cel(a.to),'Destination cel already exists.');local copy=s:newCel(l,a.to,Image(c.image),c.position);copy.opacity=c.opacity end
H['cel.clear']=H['drawing.clear']
local function slice(s,name) for _,sl in ipairs(s.slices) do if sl.name==name then return sl end end;error('Slice not found.') end
H['slice.list']=function() local out={};for _,sl in ipairs(sprite().slices) do out[#out+1]={name=sl.name,bounds=bounds(sl.bounds)} end;return out end
H['slice.create']=function(a) local s=sprite();check(#s.slices<256,'Slice limit reached.');for _,sl in ipairs(s.slices) do check(sl.name~=a.name,'Slice already exists.') end;local sl=s:newSlice(rect(a));sl.name=a.name end
H['slice.delete']=function(a) local s=sprite();s:deleteSlice(slice(s,a.name)) end
H['slice.bounds']=function(a) slice(sprite(),a.name).bounds=rect(a) end
H['slice.pivot']=function(a) slice(sprite(),a.name).pivot=Point(a.x,a.y) end
H['tileset.list']=function() local out={};for i,t in ipairs(sprite().tilesets) do out[#out+1]={index=i,name=t.name,count=#t} end;return out end
H['tileset.create']=function(a) local s=sprite();check(#s.tilesets<128,'Tileset limit reached.');local t=s:newTileset(Rectangle(0,0,a.width,a.height),a.count);t.name=a.name end
H['tileset.delete']=function(a) local s=sprite();local t=check(s.tilesets[a.index],'Tileset not found.');for _,l in ipairs(allLayers(s)) do check(not l.isTilemap or l.tileset~=t,'Tileset is used by a layer.') end;s:deleteTileset(t) end
H['tileset.rename']=function(a) check(sprite().tilesets[a.index],'Tileset not found.').name=a.name end
H['tileset.grid']=function(a) sprite().gridBounds=Rectangle(0,0,a.width,a.height) end
H['tileset.info']=function(a) local t=check(sprite().tilesets[a.index],'Tileset not found.');return {name=t.name,count=#t,width=t.grid.tileSize.width,height=t.grid.tileSize.height} end
H['image.import']=function(a) local s=sprite();unique(s,a.name);local im=loadImage(a.path);local l=s:newLayer();l.name=a.name;s:newCel(l,frame(s),im,Point(0,0)) end
H['image.stamp']=function(a) local src=loadImage(a.path);return edit(a,function(s,im) for y=0,src.height-1 do for x=0,src.width-1 do local p=src:getPixel(x,y);if pc.rgbaA(p)>0 then put(s,im,a.x+x,a.y+y,p) end end end end) end
H['image.outline']=function(a) return edit(a,function(s,im) local src=Image(im);local p=rgba(a.color);for y=0,s.height-1 do for x=0,s.width-1 do if pc.rgbaA(src:getPixel(x,y))==0 then local hit=false;for _,d in ipairs({{1,0},{-1,0},{0,1},{0,-1}}) do local xx,yy=x+d[1],y+d[2];if xx>=0 and yy>=0 and xx<s.width and yy<s.height and pc.rgbaA(src:getPixel(xx,yy))>0 then hit=true end end;if hit then put(s,im,x,y,p) end end end end end) end
for _,kind in ipairs({'replace_color','grayscale','threshold','invert'}) do H['image.'..kind]=function(a) return edit(a,function(s,im) local from=a.from and rgba(a.from);local to=a.to and rgba(a.to);for y=0,s.height-1 do for x=0,s.width-1 do local p=im:getPixel(x,y);local out=p;if kind=='replace_color' then if p==from then out=to end elseif kind=='invert' then out=pc.rgba(255-pc.rgbaR(p),255-pc.rgbaG(p),255-pc.rgbaB(p),pc.rgbaA(p)) elseif kind=='grayscale' then local v=math.floor(lum(p)+0.5);out=pc.rgba(v,v,v,pc.rgbaA(p)) elseif pc.rgbaA(p)>0 then local q=rgba(lum(p)<a.threshold and a.dark or a.light);out=pc.rgba(pc.rgbaR(q),pc.rgbaG(q),pc.rgbaB(q),pc.rgbaA(p)) end;put(s,im,x,y,out) end end end) end end
M.bounded=bounded;M.meta=meta;M.sprite=sprite;M.write=write;M.check=check;M.layer=layer;M.layers=allLayers;M.targetCel=target;M.create=create;M.spend=spend
return M
