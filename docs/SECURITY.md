# Security model

Protect against accidental AI mistakes, malicious browser pages, malformed commands and unrelated local processes that do not know the pairing secret. Do not claim protection from malware running as the same OS account, compromised dependencies, an already compromised editor, or unsafe Lua that the user explicitly approves.

## Trust boundaries

The AI client starts a stdio MCP server. The server listens only at 127.0.0.1 on the configured port (19876 by default). Aseprite connects to `/aseprite`; no browser Origin header is accepted. A fresh random challenge requires HMAC proofs with separate server/client domains before either side trusts commands. Credentials are stored in per-user files with mode 0600 on Unix; Windows uses the user's inherited account ACLs, which should be reviewed for shared machines. No token or artwork content is logged by the bridge. Input/output content can still be sent to a model by the chosen AI client.

Only one authenticated editor may connect. A second server cannot silently take the occupied port. A request is sent once with a random correlation ID. Disconnect rejects outstanding work. Timeout blocks further commands until an explicit editor reconnect; the result may already have changed the document. There is no replay queue.

Tool arguments use a strict allowlist and Zod schema. Lua repeats object/enum/length/numeric checks. Lua paths are accepted only after the Node filesystem policy resolves them. VYI import uses a server-generated manifest, not raw file-provided executable Lua. Base64 PNGs are size-checked before Aseprite decoding; they still pass through Aseprite's native PNG decoder, so keep Aseprite updated.

## Files

User paths are relative to a selected artwork root. Traversal, absolute paths, hidden path components and unsupported file types are refused. Reads resolve real paths and require containment. Export parents must exist and cannot resolve through symlinks. Temporary exports are made under a mode-0700 directory, then published with an exclusive hard link so existing files are not replaced, including a destination created during export. The temporary directory is removed afterward. Filesystems without hard-link support may need a local artwork folder (NTFS/APFS/ext4); the bridge fails rather than silently overwrite.

A same-user process can race filesystem entries or read credentials. Node and Lua do not share kernel file descriptors, so this is not a complete defense against a malicious same-user process. Large/crafted compressed images still exercise native decoding. No file handler provides a general shell command, arbitrary path write or network fetch. Reference PNGs are data, not instructions, and are never executed.

## Editor state and workload

The target must be explicitly created, opened or selected. Writes remain pinned to that sprite; an invalid/closed target fails. RGB image-layer edits only, 1024px canvas sides, 256 frames, bounded layers and aggregate pixel budgets. The protocol rejects >1 MiB messages. One request runs at a time; batches accept up to 64 commands. Drawing replaces image copies to preserve undo history; failed artwork transactions roll back. Selection state and current frame/layer are restored after failure because Aseprite does not include them in artwork undo history. Undo/redo commands apply to the latest history entry, which may be a human's edit.

Pixel budgets reduce accidental work, but native editor operations and approved Lua cannot be forcibly preempted by this bridge. A server timeout is not cancellation of an already executing editor command. Use File → Scripts → AI Connection → Pause AI control to prevent further operations. Restarting Aseprite resumes the remembered pause preference.

## Advanced Lua

Disabled in server config and extension connection config independently. Set `allowLua` to true in both only as a deliberate local decision; restart both programs. Each call shows the source in a review dialog with Cancel first. Once approved, Lua has the editor process's full filesystem/process privileges and can freeze the UI or bypass normal bridge path restrictions. Never treat this as sandboxed code. Run Setup again to disable it.

## Maintenance

Dependencies are locked. Installation uses `npm ci --ignore-scripts`. Verify release checksums and ship signed/notarized builds for public distribution. Security tests cover schema rejection, mutual authentication, origins, correlation, timeout handling, symlink escapes, traversal, overwrite races and secret-preserving setup repair. Tests are evidence, not a guarantee of security. No production penetration audit has been performed.
