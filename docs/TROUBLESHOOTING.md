# Troubleshooting

**AI says Aseprite is disconnected**

Restart Aseprite after setup. Open your AI app; it starts the bridge automatically. In Aseprite, use File → Scripts → AI Connection → Connect / Reconnect. If you use multiple AI apps, close the other one: only one controls this bridge port at a time. Check script-access prompts in Aseprite. Ask your AI to call `aseprite_status`.

**The AI Connection menu is missing**

Run Setup again and restart Aseprite. Check Edit → Preferences → Extensions: Aseprite MCP Pro should be enabled. Custom/portable Aseprite builds may use a different user-data folder; copy the prepared extension and its connection.json into that build's extensions folder. Keep connection.json private.

**Port already in use**

Another MCP client may already be using port 19876. Close that client. If another unrelated app uses it, choose an unused local port in BOTH `~/.aseprite-mcp-pro/config.json` and the installed extension's `connection.json`, then restart both apps. Do not expose the bridge on a public interface.

**Setup cannot update an existing Codex entry**

Your original configuration is kept. Setup generates `~/.aseprite-mcp-pro/client-config.toml`. Replace only the old Aseprite entry with that generated block, or remove the old entry and rerun Setup. JSON clients have timestamped backups beside their config file.

**File already exists / folder missing**

Pick a new export filename. Files never overwrite existing artwork. Paths are relative to your artwork folder. Create desired subfolders in Finder/Explorer before exporting. For USB drives or network volumes that cannot create hard links, use a local artwork folder, then copy the finished files normally.

**Operation timed out**

Inspect your sprite before retrying. A timeout does not undo an operation that already ran. If the editor is responsive, reconnect from its AI Connection menu. Split large batches/canvases into smaller operations. Normal edits can be undone in Aseprite; avoid undoing unrelated manual work.

**Layer locked / indexed color / tilemap error**

Choose an unlocked RGB image layer. Convert indexed artwork in Aseprite before drawing. Native tilemap editing is not implemented; grid templates and native tileset management are available.

**VYI rejects a file**

Version 1, valid base64 PNG frames, matching canvas dimensions, unique state names and bounded sizes are required. Import one icon at a time. State/frame timelines totaling over 256 frames require splitting into smaller icons. If a `base` state already exists alongside a base animation, rename it before importing to avoid a state-name collision.

**Reference is too large**

Use a PNG at most 1024×1024 and 2 MiB. The reference tool reads from the chosen artwork folder, sends the image to your AI client, and does not paste it into the drawing.

**Uninstall**

Disable/remove Aseprite MCP Pro in Edit → Preferences → Extensions. Remove only `aseprite-mcp-pro` from your AI app's MCP settings, then remove `~/.aseprite-mcp-pro` and the downloaded application folder if desired. Leave your artwork folder intact. Existing config backups remain available beside the client settings.
