# Model and workflow choices

The bridge does not generate art by itself. It gives an AI model a safe, structured way to inspect Aseprite, plan edits, batch them, preview milestones, and recover from mistakes. The model supplies the visual decisions: silhouette, palette, pose, timing, layering, and revision strategy. The bridge supplies deterministic execution, undoable transactions, alignment, export, and validation.

## Does a flagship model matter?

Quality depends on both the model and the workflow. A stronger model usually plans clearer silhouettes, uses fewer contradictory edits, notices proportion errors in previews, and revises more effectively. A smaller model can still produce good results when the task is constrained:

- start from `templates.character` or an existing base;
- use a limited palette and named layers;
- call `aseprite_discover` only for the commands it needs;
- make one decision per batch;
- preview at silhouette, finished frame, and animation milestones;
- ask it to inspect `analysis.bounds`, `analysis.colors`, `analysis.compare`, and `analysis.validate` before exporting.

Small models are particularly suitable for deterministic work such as aligned overlays, palette application, frame duplication, timing changes, VYI export, and “apply this exact pixel pattern” tasks. They are weaker at inventing a coherent character from a vague sentence, maintaining style over many poses, and deciding what to fix from a visual preview. A practical setup is to use a stronger model for the initial design brief and difficult revisions, then use a lower-cost model for mechanical edits and exports. Nothing in the MCP server requires a flagship model.

## Local models and no subscription

The server is model-agnostic and local. It does not require an AI subscription, but it also does not contain an AI model. A user needs an MCP-capable host that can talk to a model. Cloud clients provide the easiest setup. For a subscription-free setup, run a local model through Ollama (or another local inference server) and connect it through a host that supports both that model backend and MCP. The MCP server remains the same stdio process; only the host/model configuration changes.

Ollama alone is a model runtime, not a general MCP desktop client. Pair it with an MCP-capable local host or agent application. The host must be able to send tool calls and receive image previews; plain text-only local chat will not be able to see Aseprite previews. Check the chosen host's current MCP and Ollama support before distributing a one-click profile because those integrations change independently of this project.

Without any AI host, users can still install the Aseprite extension and use Aseprite normally, but there is no natural-language agent. The structured commands are intentionally not exposed as a second bespoke UI: Aseprite already provides the authoritative editor UI, and adding a second editor would duplicate state and increase risk.

## ASCII, detailed art, and references

ASCII is not a hard limit. The current system does not ask a model to serialize an entire image as ASCII. It uses shapes, pixel matrices, strokes, palette tools, layers, animation frames, and optional PNG previews. ASCII or a compact textual plan can be useful for a silhouette, but detailed results should be built from a layered plan and batched pixel/pattern operations. The model's visual ability comes from its image input and reasoning, not from ASCII alone.

For better art, provide a precise brief: canvas size, camera/view, silhouette, light direction, palette count, outline rule, materials, animation timing, and what must stay fixed. Use a reference image through `aseprite_reference` for mood, proportions, lighting, palette relationships, or pose principles. The tool returns the image to the host but never copies its pixels into the sprite. Ask the model to write an inspiration brief and a list of deliberate differences before drawing. Use multiple references for broad principles, and record creators/permissions when relevant.

Reference images can improve results, but they do not guarantee originality. Avoid requests to trace, reproduce a distinctive character or logo, copy an exact composition, or make a trivial recolor. Direct import, stamping, and exact palette extraction are separate asset-reuse operations and should be used only when the user has the rights and explicitly wants reuse.

## Recommended high-quality prompt

“Open `references/hero.png` as inspiration only. Create a new 48×48 character with a different silhouette, face, costume details, and composition. Preserve the reference’s cool rim-light idea and three-value shading structure, but use a 12-color palette with a warm accent. Put the base character on `Base`, shadows on `Shading`, and clothing on `Shirt`. Create idle (6 frames, 120ms) and walk (8 frames, 100ms) tags. Keep feet anchored and keep the shirt aligned to the base. Preview the silhouette, first finished frame, and the GIF. Compare frames for accidental jumps, validate timing, save a new `.aseprite`, and export a `.vyi` with separate Base and Shirt icons.”

## Extending and dressing an existing animation

For a base character, open or select the sprite and lock the base layer. Use `animation.overlay` to clone its cels into a new garment/effect layer; positions, frame numbers, and durations stay aligned automatically. The AI then edits only the overlay pixels. Use `animation.extend` to append copies of an existing range before asking the model to draw new poses. This is more reliable than asking a model to recreate the base character for every frame and costs fewer tool calls and tokens.
