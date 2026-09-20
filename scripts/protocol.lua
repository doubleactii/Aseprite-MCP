-- Exercise the shipped plugin lifecycle, auth gate and JSON messages inside Aseprite.
local root,out=app.params.root,app.params.out
local crypto=dofile(root..'/extension/crypto.lua')
assert(crypto.sha256('abc')=='ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad')
local token=string.rep('a',64);local captured={};local callback;local closed=false
WebSocket=function(options)
 callback=options.onreceive
 return {connect=function() callback(WebSocketMessageType.OPEN,'') end,close=function() closed=true end,sendText=function(_,text) captured[#captured+1]=json.decode(text) end}
end
local groups,commands={},{};local plugin={path=out..'/protocol-extension',preferences={},newMenuGroup=function(_,group)groups[#groups+1]=group end,newCommand=function(_,command)commands[command.id]=command end}
dofile(root..'/extension/main.lua');init(plugin);assert(#groups==1);assert(commands.AsepriteMcpPause)
-- An unauthenticated listener cannot skip the challenge and issue commands.
callback(WebSocketMessageType.TEXT,json.encode{type='ready',protocol=1})
callback(WebSocketMessageType.TEXT,json.encode{type='request',id='unauth',payload={commands={{name='sprite.create',args={width=8,height=8}}},atomic=false}})
assert(#captured==0,'Unauthenticated command was handled')
local nonce=string.rep('b',64)
callback(WebSocketMessageType.TEXT,json.encode{type='challenge',nonce=nonce,proof=crypto.hmac(token,'server:'..nonce)})
assert(#captured==1 and captured[1].proof==crypto.hmac(token,'client:'..nonce))
callback(WebSocketMessageType.TEXT,json.encode{type='ready',protocol=1})
callback(WebSocketMessageType.TEXT,json.encode{type='request',id='create',payload={commands={{name='sprite.create',args={width=8,height=8}}},atomic=false}})
assert(#captured==2 and captured[2].ok==true,tostring(captured[2]))
commands.AsepriteMcpPause.onclick();callback(WebSocketMessageType.TEXT,json.encode{type='request',id='paused',payload={commands={{name='drawing.pixel',args={x=0,y=0,color='#ffffff'}}},atomic=false}})
assert(#captured==3 and captured[3].ok==false)
exit(plugin);assert(closed);print('PLUGIN PROTOCOL OK: mutual auth gate, JSON commands, pause, lifecycle')
