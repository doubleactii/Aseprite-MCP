# Vylocity VYI v1

Implemented from inspection of Active/doubleactii's installed Ase2Vyi exporter and its [published usage guide](https://doubleactii.itch.io/ase2vyi). The bridge does not execute or redistribute that extension's exporter. It produces the same version-1 tuple structure:

```text
{
  "v": 1,
  "i": [
    [name, width, height, previewDurationMs, previewPngBase64,
      [[pngBase64, durationMs], ...],
      [[stateName, firstPngBase64, firstDurationMs,
        [[nextPngBase64, nextDurationMs], ...]], ...]
    ]
  ]
}
```

All images are full-canvas PNGs, represented as bare base64 (no data-URL prefix). Empty frame/state lists are JSON arrays. Duration units are milliseconds.

## Export

Discover `vyi.export`, then execute, for example:

```json
{"name":"vyi.export","args":{"path":"hero.vyi","layers":["Body","Equipment"],"merge":false}}
```

- `merge: false`: each selected layer becomes an icon in the same file. Selected layer order follows the sprite stack. To get separate files, call the exporter separately with distinct filenames.
- `merge: true`: selected layers are composited bottom-to-top into one icon. Layer/cel opacity and layer blend modes are applied. Group effects are not applied; flatten a copy first if you need exact group compositing.
- Tags become named states. Untagged contiguous ranges become cel1, cel2, etc. Duplicate state names are rejected, including conflicts with generated names.
- Without tags, frames 2 onward form the base animation; the icon image is its preview frame. This matches ase2vyi, including its distinction between preview and animation frames.
- `_es_skipped_frame: true` in cel JSON data excludes that frame from animation. When merging, any selected layer's skip marker excludes that frame.
- `_es_main_image: true` selects the preview. If multiple merged layers have markers, the bottom-most selected layer wins. Otherwise frame 1 is used. A skipped frame can still be the preview.
- Marker commands preserve other JSON fields. They reject non-JSON user data rather than destroying it.
- Tags export chronologically, matching ase2vyi; v1 does not carry Aseprite playback-direction metadata. Create explicit frame order if reverse/ping-pong playback is needed.

The encoder uses isolated temporary PNGs and Node's base64 support. It never uses `os.execute`, shell deletion or shared predictable temporary filenames. Outputs never overwrite existing files.

## Import and inspection

`vyi.inspect` validates the entire file and reports names, dimensions, states and timings without returning the image blobs. `vyi.import` imports one chosen zero-based icon into a new RGB sprite. Its preview is frame 1. Named state timelines are concatenated with tags; the preview is marked skipped when states exist so it will not turn into an extra state on re-export. Importing an icon with both base animation frames and named states creates an additional `base` tag; this conversion is not byte-identical and may need a renamed tag if the file already uses `base`.

Limits: 32 MiB JSON; 24 MiB decoded PNG data; 16 million image pixels; 1024px per side; 512 frame images per icon in parsed input; 256 imported timeline frames. Export allows up to 32 selected layers and 512 unique rendered PNGs, subject to the editor's pixel-work budget.

Compatibility tests cover the tuple schema, embedded PNG dimensions, skip/preview metadata, timings, named states and export/import in Aseprite. A Vylocity engine import is a separate end-to-end acceptance check; it is not claimed as tested here.
