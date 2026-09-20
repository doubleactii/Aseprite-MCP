# Aseprite MCP Pro

**Tell your AI what to draw. Watch it take shape in Aseprite.**

A local TypeScript MCP server and Lua extension for drawing pixel art, animation, and Vylocity `.vyi` export. **122 commands, 16 categories, six compact AI tools.** No cloud service, telemetry, paid API, or external image-generation service is built into the bridge. Your AI client handles the model connection and its own data policies.

## Start here

### Downloaded release — no coding required

1. Extract the release for your computer into a permanent folder. Do not run it from inside the ZIP or move it after setup.
2. Double-click **Setup.command** on macOS or **Setup.bat** on Windows. On Linux, run `./setup.sh`.
3. Press Enter to use the default artwork folder, then pick your AI app from the list.
4. Restart Aseprite and your AI app. If Aseprite asks about script access, allow this extension to read its settings, access your artwork folder, and connect to the local bridge.
5. Ask: **“Using Aseprite, create a 32×32 slime with a four-frame idle animation. Save the source and export it as VYI.”**

Releases bundle Node. Source checkouts need Node.js **22+** and internet access for the initial dependency install. Use a current **Aseprite 1.3** build with scripting and WebSocket support; tested with 1.3.18.5. Old 1.3 builds without WebSocket will show an upgrade message. Your AI app must support local stdio MCP servers; Codex, Claude Desktop, Claude Code and Gemini CLI setup options are included. A browser-only ChatGPT session does not directly launch local stdio servers.

On macOS an unsigned release may require opening Setup through Finder's **Open** action. Signing/notarizing production releases is still a maintainer release step; do not disable OS protections globally.

### From this source folder

Double-click the appropriate Setup file, or run:

```sh
npm ci --ignore-scripts
npm run build
npm run setup
```

Setup installs only this extension, generates pairing credentials and backs up client settings before adding its entry. No administrator password is required. The default artwork folder is `~/Pictures/AI Pixel Art`. Configuration lives in `~/.aseprite-mcp-pro/config.json`. Repair setup by running it again. Re-running setup switches advanced Lua back off.

## Working with your AI

- **Create:** “Draw a 32×32 forest ranger with a readable silhouette, six colors and a four-frame walk cycle.”
- **Use inspiration:** “Use references/mood.png for lighting and color mood. Design a new creature with a different silhouette, anatomy and details. Don’t trace it.” Put the reference PNG in your artwork folder first.
- **Export VYI:** “Export the Body and Equipment layers as separate icons in character.vyi. Use idle and walk tags as states.”
- **Inspect:** “Compare frames 1 and 2, then preview the canvas.”

The reference tool **views without importing pixels**. The guide asks the assistant to extract broad visual principles, plan a distinct design and review similarities. Direct import and stamping are separate, explicit asset-reuse operations. This is a workflow for originality, not an originality detector or legal certification. See [the reference workflow](skills/pixel-art/GUIDE.md#reference-images-and-original-work).

In Aseprite, use **File → Scripts → AI Connection** to view status, pause control or reconnect. The bridge targets an explicitly selected sprite, so switching tabs does not silently redirect AI edits.

## What is included

| Category | Examples |
| --- | --- |
| Sprite | Create, open, inspect, select, save a copy, resize, crop |
| Drawing | Shapes, fill, brush strokes, symmetry, dither, indexed patterns |
| Layer | Groups, order, opacity, blend modes, visibility |
| Animation | Frames, tags, timing, GIF preview, translated inbetween frames |
| Palette | Ten attributed Lospec palettes, ramps, sorting, exact image colors |
| Selection | Rectangles, ellipses, color, inversion, translation |
| Export | PNG, sprite sheet, GIF, isolated layer, tag animation, metadata |
| VYI | Export, inspect, import one icon, skip markers, preview markers |
| Analysis | Color frequency, pixel reads, frame comparison, visual diff, timing |
| Transform | Flip, right-angle rotation, wrapped shifts, integer scaling |
| Templates | Character, icon, tile grid |
| Editor | Status, undo, redo, refresh, opt-in Lua |
| Cel | Create, delete, copy, position, opacity |
| Slice | Named bounds and pivots |
| Tileset | Native tileset creation, inspection and grid settings |
| Image | Import, stamp, outline, color replacement, grayscale, threshold |

[Full generated command reference](docs/COMMANDS.md) · [VYI specification and compatibility](docs/VYI.md) · [Troubleshooting](docs/TROUBLESHOOTING.md)

## Designed for compact, bounded work

Only six tools appear in the AI tool list: status, discover, execute, batch, preview and reference. The model requests schemas only when needed. A batch carries up to 64 edits and returns a compact completion count; indexed matrices and strokes avoid per-pixel tool calls. PNG previews are opt-in. There is no claim of a fixed percentage token saving: cost depends on the model and artwork.

Transport uses uncompressed loopback WebSocket and stdio MCP. Work runs serially, with bounded payloads and pixel budgets. The editor refreshes once per request. RGB canvases are limited to 1024×1024, 256 frames and 16 million aggregate cel pixels; typical 16–64px sprites are recommended. Some operations impose smaller cumulative limits to keep the editor responsive.

## Security and recovery

- Listens on **127.0.0.1 only**. Browser origins are rejected. HMAC-SHA256 challenge/response authenticates both endpoints using a random 256-bit secret that is never put in URLs or tool responses.
- Strict schemas at the MCP boundary and repeated structural/range validation inside Aseprite. Unknown commands/fields are rejected.
- Files are confined to the chosen artwork folder. Hidden paths, traversal and symlink escapes are rejected. Exports are staged, then published without replacing existing files. Parent directories must already exist.
- Artwork batches use Aseprite transactions. Failed edits roll back. Selection/current-frame state is restored on failure but is not part of the editor's undo history.
- One editor and one request at a time. Timeout results are uncertain and **never automatically retried**; inspect the editor and reconnect.
- Arbitrary Lua is off. Enabling it requires changing local config in both locations, and each execution requires a visible Aseprite confirmation. It has full user privileges; it is not sandboxed.

[Threat model, limits and known tradeoffs](docs/SECURITY.md). Local malware running as your user can read your credentials; this is not an OS security boundary. Keep separate backups of important artwork.

## Development and verification

```sh
npm test                 # MCP SDK round trip, auth, files, installer, VYI validation
npm run test:aseprite    # Actual Aseprite API, rollback and VYI round-trip tests
node scripts/fetch-runtime.mjs # Fetch + checksum-verify official Node LTS
npm run package          # Host-specific release ZIP, bundled Node, extension archive
```

Set `ASEPRITE_BIN` if Aseprite is not at the detected macOS Steam path. Editor tests create artifacts only under `.local/aseprite-smoke`; they do not install the extension or edit your AI configuration. `npm run package` builds only for the current OS/CPU. Windows/Linux launchers are included in source but require builds and testing on those systems.

The original ase2vyi format reference is [Active's Ase2Vyi](https://doubleactii.itch.io/ase2vyi). Godot integration is intentionally absent. Palette and dependency acknowledgements are in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
