local ws,engine,pluginRef,config,crypto,connected
local function read(path) local f=assert(io.open(path,'rb'),'Missing file: '..path);local text=f:read('*a');f:close();return text end
local function stop() connected=false;if ws then ws:close();ws=nil end end
local function connect()
 stop();if not config then app.alert('Run Aseprite MCP Pro Setup first, then restart Aseprite.');return end
 if not WebSocket then app.alert('This Aseprite build has no WebSocket support. Update Aseprite to a current 1.3 release with scripting enabled.');return end
 local verified=false
 ws=WebSocket{url='ws://127.0.0.1:'..config.port..'/aseprite',deflate=false,minreconnectwait=1,maxreconnectwait=30,onreceive=function(mt,data)
  if mt==WebSocketMessageType.OPEN then verified=false;connected=false
  elseif mt==WebSocketMessageType.CLOSE then connected=false;verified=false
  elseif mt==WebSocketMessageType.TEXT then
   if #data>1048576 then stop();return end
   local ok,m=pcall(function() return engine.plain(json.decode(data)) end);if not ok or type(m)~='table' then stop();return end
   if m.type=='challenge' then
    if type(m.nonce)~='string' or #m.nonce~=64 or type(m.proof)~='string' or m.proof~=crypto.hmac(config.token,'server:'..m.nonce) then stop();return end
    verified=true
    ws:sendText(json.encode{type='hello',proof=crypto.hmac(config.token,'client:'..m.nonce)})
   elseif m.type=='ready' and m.protocol==1 and verified then connected=true
   elseif m.type=='request' and connected and type(m.id)=='string' then
    local success,result=pcall(engine.dispatch,m.payload)
    local response={type='result',id=m.id,ok=success};if success then response.result=result else response.error=tostring(result):sub(1,1024) end
    local encoded=json.encode(response);if #encoded>1048576 then encoded=json.encode{type='result',id=m.id,ok=false,error='Response exceeds 1 MiB.'} end
    if ws then ws:sendText(encoded) end
   end
  end
 end};ws:connect()
end
function init(plugin)
 pluginRef=plugin;local base=plugin.path..'/';engine=dofile(base..'commands.lua');dofile(base..'vyi.lua')(engine)
 engine.palettes=json.decode(read(base..'palettes.json'));dofile(base..'runtime.lua')(engine,json.decode(read(base..'catalog.json')));crypto=dofile(base..'crypto.lua')
 local ok,value=pcall(function() return json.decode(read(base..'connection.json')) end);if ok and type(value.token)=='string' and #value.token==64 and type(value.port)=='number' and value.port>=1024 and value.port<=65535 then config=value;engine.workspace=value.workspace;engine.allowLua=value.allowLua==true end
 engine.paused=plugin.preferences.paused==true
 plugin:newMenuGroup{id='aseprite_mcp_menu',title='AI Connection',group='file_scripts'}
 plugin:newCommand{id='AsepriteMcpConnect',title='Connect / Reconnect',group='aseprite_mcp_menu',onclick=connect}
 plugin:newCommand{id='AsepriteMcpPause',title='Pause AI control',group='aseprite_mcp_menu',onclick=function() engine.paused=not engine.paused;plugin.preferences.paused=engine.paused end,onchecked=function() return engine.paused end}
 plugin:newCommand{id='AsepriteMcpStatus',title='Connection status',group='aseprite_mcp_menu',onclick=function() app.alert{title='AI Connection',text={(connected and 'Connected to your local AI client.' or 'Waiting for AI client. Open your client to start the bridge.'),(engine.paused and 'AI control is paused.' or 'AI control is enabled.'),'Edits are undoable. Exports never replace files.','Arbitrary Lua: '..(engine.allowLua and 'enabled, asks every time' or 'disabled')}} end}
 plugin:newCommand{id='AsepriteMcpDisconnect',title='Disconnect',group='aseprite_mcp_menu',onclick=stop}
 if config then connect() end
end
function exit(plugin) stop() end
