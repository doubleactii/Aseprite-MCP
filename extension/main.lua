local ws,engine,pluginRef,config,crypto,connected,clientInfo
local connect
-- Liveness tracking: updated every time a TEXT heartbeat arrives from the bridge.
-- os.clock() is monotonic and works reliably in Aseprite's Lua runtime.
local lastHeartbeatAt = nil   -- nil = never received one
local HEARTBEAT_STALE_SEC = 60 -- warn if no heartbeat for this long

local function heartbeatAge()
 if not lastHeartbeatAt then return nil end
 return math.floor(os.clock() - lastHeartbeatAt)
end

local function connectionSummary()
 if not connected then
  return 'Disconnected — waiting for AI client.'
 end
 local age = heartbeatAge()
 if age == nil then
  return 'Connected — waiting for first heartbeat...'
 elseif age > HEARTBEAT_STALE_SEC then
  return ('Connected (STALE — last heartbeat %ds ago; bridge may be down)'):format(age)
 elseif age >= 5 then
  return ('Connected — last heartbeat %ds ago'):format(age)
 else
  return 'Connected — active'
 end
end

local function showConfig()
 if not config then app.alert('Run Setup first.');return end
 local d=Dialog{title='Aseprite MCP Pro — Local Configuration'}
 d:entry{id='workspace',label='Artwork folder',text=config.workspace}
 d:number{id='port',label='Bridge port',text=tostring(config.port),decimals=0}
 d:check{id='allowLua',label='Allow advanced Lua (asks every time)',selected=config.allowLua==true}
 d:check{id='autoOpenGenerated',label='Auto-open generated files',selected=config.autoOpenGenerated~=false}
 d:label{text='Aseprite-side changes apply immediately. Restart only if the AI app MCP config file changed.'}
 d:button{id='save',text='Save',onclick=function()
  local data=d.data;local port=tonumber(data.port)
  if not port or port<1024 or port>65535 or data.workspace=='' then app.alert('Enter a valid artwork folder and a port from 1024 to 65535.');return end
  config.workspace=data.workspace;config.port=port;config.allowLua=data.allowLua==true;config.autoOpenGenerated=data.autoOpenGenerated~=false
  local f=assert(io.open(pluginRef.path..'/connection.json','wb'));f:write(json.encode(config)..'\n');f:close()
  engine.workspace=config.workspace;engine.allowLua=config.allowLua;d:close();app.alert('Saved. Reconnect if the port changed.');connect()
 end}
 d:button{id='cancel',text='Cancel'};d:show()
end
local function read(path) local f=assert(io.open(path,'rb'),'Missing file: '..path);local text=f:read('*a');f:close();return text end
local function stop() connected=false;lastHeartbeatAt=nil;if ws then ws:close();ws=nil end end
connect=function()
 stop();if not config then app.alert('Run Aseprite MCP Pro Setup first, then restart Aseprite.');return end
 if not WebSocket then app.alert('This Aseprite build has no WebSocket support. Update Aseprite to a current 1.3 release with scripting enabled.');return end
 local verified=false
 ws=WebSocket{url='ws://127.0.0.1:'..config.port..'/aseprite',deflate=false,minreconnectwait=1,maxreconnectwait=4,onreceive=function(mt,data)
  if mt==WebSocketMessageType.OPEN then verified=false;connected=false
  elseif mt==WebSocketMessageType.CLOSE then
   connected=false;verified=false;lastHeartbeatAt=nil
   -- No blocking modal — auto-reconnect will fire after minreconnectwait seconds
  elseif mt==WebSocketMessageType.TEXT then
   if #data>1048576 then stop();return end
   local ok,m=pcall(function() return engine.plain(json.decode(data)) end);if not ok or type(m)~='table' then stop();return end
   if m.type=='challenge' then
    if type(m.nonce)~='string' or #m.nonce~=64 or type(m.proof)~='string' or m.proof~=crypto.hmac(config.token,'server:'..m.nonce) then stop();return end
    verified=true
    ws:sendText(json.encode{type='hello',proof=crypto.hmac(config.token,'client:'..m.nonce)})
   elseif m.type=='client' and type(m.client)=='table' then
    clientInfo=m.client
   elseif m.type=='ready' and m.protocol==1 and verified then
    connected=true
    lastHeartbeatAt=os.clock() -- treat ready as first heartbeat
    local who=(clientInfo and ((clientInfo.name or 'AI host')..(clientInfo.version and (' '..clientInfo.version) or '')) or 'Connected AI Client')
    -- Non-blocking status log (no modal)
    if app.isUIAvailable then
     -- Attempt to show a transient status bar message if the API is available
     pcall(function()
      if app.statusBar then app.statusBar:showMessage('AI Connected — '..who,3000)
      else app.alert{title='AI Connection',text='Connected: '..who} end
     end)
    end
   elseif m.type=='heartbeat' and connected then
    -- Application-level liveness signal from the bridge — update freshness timestamp.
    lastHeartbeatAt=os.clock()
    -- Acknowledge so the bridge knows Lua is alive too.
    if ws then ws:sendText(json.encode{type='heartbeat_ack',ts=m.ts}) end
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
 plugin:newCommand{id='AsepriteMcpStatus',title='Connection status',group='aseprite_mcp_menu',onclick=function()
  local who=(clientInfo and ((clientInfo.name or 'AI host')..(clientInfo.version and (' '..clientInfo.version) or '')) or (connected and 'Connected AI Client' or 'Not connected'))
  local summary=connectionSummary()
  app.alert{title='AI Connection Status',text={
   summary,
   'AI host: '..who,
   (engine.paused and 'Paused — AI control is paused.' or 'AI control is enabled.'),
   'Edits are undoable. Exports never replace files.',
   'Arbitrary Lua: '..(engine.allowLua and 'enabled, asks every time' or 'disabled')
  }}
 end}
 plugin:newCommand{id='AsepriteMcpConfig',title='Local configuration',group='aseprite_mcp_menu',onclick=showConfig}
 plugin:newCommand{id='AsepriteMcpDisconnect',title='Disconnect',group='aseprite_mcp_menu',onclick=stop}
 if config then connect() end
end
function exit(plugin) stop() end
