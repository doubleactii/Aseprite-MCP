# Command reference

123 commands in 16 categories, exposed through six compact MCP tools. Discover schemas on demand with `aseprite_discover`. Coordinates are zero-based; frame, layer-stack and tileset indices are one-based. Palette indices are zero-based. Canvas limit: 1024 × 1024. New sprites use RGB.

## sprite

| Command | Description | Effect | Batch |
| --- | --- | --- | --- |
| `sprite.create` | Create an RGB sprite; becomes the current AI target. | edit | no |
| `sprite.info` | Inspect the current AI target, layers, frames and tags. | read | no |
| `sprite.list` | List open sprites; use select to explicitly target one. | read | no |
| `sprite.select` | Select an open sprite by ID; all later edits target it. | edit | no |
| `sprite.open` | Open a file inside the chosen artwork folder. | edit | no |
| `sprite.save` | Save an Aseprite copy to a NEW file in the artwork folder. | file | no |
| `sprite.resize` | Resize all cels using nearest-neighbor sampling. | edit | yes |
| `sprite.crop` | Crop the canvas. | edit | yes |
| `sprite.duplicate` | Duplicate target into a new untitled sprite. | edit | no |
| `sprite.close` | Close only an unmodified sprite. Save your work in the editor first. | edit | no |
| `sprite.build_animation` | Create, draw, animate and export a multi-frame sprite in a single operation. Groups outputs in generated/<sprite-name>/ by default; accepts a relative outputFolder. Looping animations should follow the zero-pop system (closed orbits, harmonic cosine pulse, rotational symmetry discretization). | edit | no |

## drawing

| Command | Description | Effect | Batch |
| --- | --- | --- | --- |
| `drawing.pixel` | Set one pixel. | edit | yes |
| `drawing.pixels` | Draw many pixels in one operation. | edit | yes |
| `drawing.line` | Draw a crisp integer line. | edit | yes |
| `drawing.rectangle` | Draw a rectangle outline. | edit | yes |
| `drawing.filled_rectangle` | Draw a solid rectangle. | edit | yes |
| `drawing.ellipse` | Draw an ellipse outline. | edit | yes |
| `drawing.filled_ellipse` | Draw a solid ellipse. | edit | yes |
| `drawing.fill` | Flood fill contiguous pixels in the target cel. | edit | yes |
| `drawing.stroke` | Draw connected points with a square brush. | edit | yes |
| `drawing.polygon` | Draw a closed polygon outline. | edit | yes |
| `drawing.clear` | Clear selected pixels, or the entire cel if no selection. | edit | yes |
| `drawing.dither` | Fill a rectangle with a two-color Bayer pattern. | edit | yes |
| `drawing.gradient` | Draw a stepped two-color gradient. | edit | yes |
| `drawing.symmetry` | Draw pixels mirrored around the canvas center. | edit | yes |
| `drawing.pattern` | Stamp an indexed pixel matrix. -1 is transparent/skip. | edit | yes |
| `drawing.erase` | Erase a rectangle to transparent. | edit | yes |

## layer

| Command | Description | Effect | Batch |
| --- | --- | --- | --- |
| `layer.list` | List all layers, including nested groups. | read | no |
| `layer.add` | Add a named image layer. | edit | yes |
| `layer.delete` | Delete a layer and its cels. Undoable. | edit | yes |
| `layer.rename` | Rename a layer. | edit | yes |
| `layer.opacity` | Set layer opacity from 0 to 255. | edit | yes |
| `layer.blend` | Set the layer blend mode. | edit | yes |
| `layer.visibility` | Show or hide a layer. | edit | yes |
| `layer.reorder` | Set layer position within its parent (1 is bottom). | edit | yes |
| `layer.group` | Create a layer group. | edit | yes |
| `layer.parent` | Move a layer into a group, or the sprite root. | edit | yes |
| `layer.duplicate` | Duplicate an image layer and all its cels. | edit | yes |
| `layer.flatten` | Flatten visible layers. Undoable. | edit | yes |

## animation

| Command | Description | Effect | Batch |
| --- | --- | --- | --- |
| `animation.frames` | List frame durations in milliseconds. | read | no |
| `animation.add` | Append empty animation frames. | edit | yes |
| `animation.duplicate` | Duplicate a frame immediately before its source. | edit | yes |
| `animation.delete` | Delete one frame; keep at least one. | edit | yes |
| `animation.duration` | Set frame duration in milliseconds. | edit | yes |
| `animation.select` | Show a frame in the editor. | edit | yes |
| `animation.tags` | List named animation ranges. | read | no |
| `animation.tag` | Create a named animation range. | edit | yes |
| `animation.delete_tag` | Delete an animation tag. | edit | yes |
| `animation.rename_tag` | Rename an animation tag. | edit | yes |
| `animation.interpolate` | Append translated copies of a frame, interpolating a cel offset (not AI inbetweening). | edit | yes |
| `animation.preview` | Export an animated GIF preview to a new file. | file | no |

## palette

| Command | Description | Effect | Batch |
| --- | --- | --- | --- |
| `palette.list` | List bundled palette names and attribution. | read | no |
| `palette.get` | Read the target palette as hex colors. | read | no |
| `palette.set` | Replace the palette with explicit colors. | edit | yes |
| `palette.builtin` | Apply a bundled palette. | edit | yes |
| `palette.color` | Change a zero-based palette entry. | edit | yes |
| `palette.ramp` | Replace palette with a linear RGB color ramp. | edit | yes |
| `palette.sort` | Sort palette by luminance. RGB artwork is unchanged. | edit | yes |
| `palette.import_image` | Extract up to 256 exact colors from an image. | edit | no |
| `palette.export` | Export the palette as a PNG swatch strip. | file | no |
| `palette.nearest` | Find the nearest palette color by RGB distance. | read | no |

## selection

| Command | Description | Effect | Batch |
| --- | --- | --- | --- |
| `selection.rectangle` | Replace selection with a rectangle. | edit | yes |
| `selection.ellipse` | Replace selection with an ellipse. | edit | yes |
| `selection.color` | Select matching RGBA pixels in a composited frame. | edit | yes |
| `selection.invert` | Invert selection within the canvas. | edit | yes |
| `selection.all` | Select the whole canvas. | edit | yes |
| `selection.clear` | Deselect. | edit | yes |
| `selection.bounds` | Get selection bounds and whether empty. | read | no |
| `selection.translate` | Move selection without moving pixels. | edit | yes |

## export

| Command | Description | Effect | Batch |
| --- | --- | --- | --- |
| `export.png` | Export one composited frame as PNG. | file | no |
| `export.sheet` | Export frames in a regular PNG grid. | file | no |
| `export.gif` | Export the complete animation as GIF. | file | no |
| `export.layer` | Export one isolated image layer/frame as PNG. | file | no |
| `export.tag` | Export a named animation as GIF. | file | no |
| `export.metadata` | Export frame durations, layers and tags as JSON. | file | no |

## vyi

| Command | Description | Effect | Batch |
| --- | --- | --- | --- |
| `vyi.export` | Export Vylocity v1 icons, embedded PNG frames and named states. Separate icons per selected layer or merge them. | file | no |
| `vyi.inspect` | Inspect a VYI file without returning embedded images. | read | no |
| `vyi.import` | Import one VYI icon into a new sprite. State timelines are concatenated with tags. | edit | no |
| `vyi.skip` | Set the ase2vyi-compatible skip marker on a cel; preserve unrelated user data. | edit | yes |
| `vyi.preview` | Mark a cel as its layer’s VYI preview. It can also be skipped from animation. | edit | yes |

## analysis

| Command | Description | Effect | Batch |
| --- | --- | --- | --- |
| `analysis.colors` | Return the most common composited RGBA colors. | read | no |
| `analysis.compare` | Compare two frames: changed pixel count and bounding box. | read | no |
| `analysis.diff` | Write a visual PNG of differences between frames. | file | no |
| `analysis.validate` | Check animation durations, duplicate frames and empty frames. | read | no |
| `analysis.bounds` | Find nontransparent bounds in a composited frame. | read | no |
| `analysis.pixel` | Read one composited RGBA pixel. | read | no |

## transform

| Command | Description | Effect | Batch |
| --- | --- | --- | --- |
| `transform.flip` | Flip the target cel. | edit | yes |
| `transform.rotate` | Rotate the target cel inside the canvas; rectangular canvases may clip. | edit | yes |
| `transform.shift` | Shift the target cel, optionally wrapping canvas edges. | edit | yes |
| `transform.scale` | Scale target cel with nearest-neighbor sampling from top-left. | edit | yes |

## templates

| Command | Description | Effect | Batch |
| --- | --- | --- | --- |
| `templates.character` | Create a character sprite with outline, base and shading layers plus idle/walk tags. | edit | no |
| `templates.tileset` | Create a blank tile sheet with a matching grid. | edit | no |
| `templates.icon` | Create a small RGB icon with base and highlights layers. | edit | no |

## editor

| Command | Description | Effect | Batch |
| --- | --- | --- | --- |
| `editor.status` | Read Aseprite version, paused state and connection capabilities. | read | no |
| `editor.undo` | Undo one editor operation on the AI target. | edit | no |
| `editor.redo` | Redo one editor operation on the AI target. | edit | no |
| `editor.refresh` | Refresh the editor display. | edit | no |
| `editor.lua` | Advanced: arbitrary Lua. Disabled by default; requires local opt-in and an editor confirmation for EVERY call. Has full user privileges. | unsafe | no |

## cel

| Command | Description | Effect | Batch |
| --- | --- | --- | --- |
| `cel.info` | Inspect an image cel. | read | no |
| `cel.create` | Create an empty cel on an image layer/frame. | edit | yes |
| `cel.delete` | Delete a cel. | edit | yes |
| `cel.move` | Move a cel to a canvas position. | edit | yes |
| `cel.opacity` | Change cel opacity. | edit | yes |
| `cel.copy` | Copy a cel to another frame on the same layer. | edit | yes |
| `cel.clear` | Clear cel pixels. | edit | yes |

## slice

| Command | Description | Effect | Batch |
| --- | --- | --- | --- |
| `slice.list` | List slice bounds. | read | no |
| `slice.create` | Create a named slice. | edit | yes |
| `slice.delete` | Delete a named slice. | edit | yes |
| `slice.bounds` | Set named slice bounds. | edit | yes |
| `slice.pivot` | Set slice pivot. | edit | yes |

## tileset

| Command | Description | Effect | Batch |
| --- | --- | --- | --- |
| `tileset.list` | List native Aseprite tilesets. | read | no |
| `tileset.create` | Create a native tileset with empty tiles. | edit | yes |
| `tileset.delete` | Delete a tileset by one-based index. | edit | yes |
| `tileset.rename` | Rename a native tileset. | edit | yes |
| `tileset.grid` | Set the sprite grid. | edit | yes |
| `tileset.info` | Inspect a native tileset. | read | no |

## image

| Command | Description | Effect | Batch |
| --- | --- | --- | --- |
| `image.import` | Import an image as a new layer in the target. | edit | no |
| `image.stamp` | Stamp a PNG at a position in a target cel. | edit | no |
| `image.outline` | Add a one-pixel exterior outline to a cel. | edit | yes |
| `image.replace_color` | Replace exact RGBA matches. | edit | yes |
| `image.grayscale` | Convert cel colors to luminance. | edit | yes |
| `image.threshold` | Convert cel to two colors using luminance. | edit | yes |
| `image.invert` | Invert RGB channels while retaining alpha. | edit | yes |
