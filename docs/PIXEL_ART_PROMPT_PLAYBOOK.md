# Pixel Art Prompt Playbook

This guide helps you get professional, organic pixel art from Aseprite MCP Pro. The MCP bridge performs precise edits in Aseprite; the model supplies visual decisions. Strong results come from a shared style contract, explicit geometry, small reviewable steps, and validation.

## 1. Project standard: a 32×32 world grid

Use **32×32 pixels as the default world cell**. Plan coordinates, anchors, collision footprints, tilesets, and variation sheets in multiples of 32.

| Asset | Recommended footprint | Anchor |
| --- | --- | --- |
| Terrain tile | 32×32 | Full cell |
| Small prop: crate, bush, barrel, rock | 32×32 | Bottom center |
| Medium prop | 64×64 | Bottom center |
| Tree | 64×96 (or 64×64 for a compact tree) | Trunk occupies bottom 32px row |
| Bridge | 96×64 or another multiple of 32 | Walkable deck and bank edges |
| Campfire | 32×32; use 32×64 only for a deliberately tall flame | Stone ring at bottom center |
| Character | 32×32 per grid cell; use 32×64 for a tall character | Feet on a cell boundary |

The grid is a production convention. Leave transparent padding inside a cell when a silhouette needs breathing room.

**Example prompt:**

```text
Create a 32×32 woodland signpost on the project’s 32×32 world grid. Keep the
post’s foot and collision point on the bottom-center anchor, leave two pixels
of transparent padding, and use separate Sign, Post, and GroundShadow layers.
```

## 2. Prompt anatomy

Write prompts in this order:

1. **Canvas and grid** — size, cell size, sheet layout, transparent padding.
2. **Style contract** — pixel scale, palette size, outline rule, cluster size, lighting.
3. **Material rules** — how grass, soil, wood, stone, metal, and water use values and hue shifts.
4. **Connectivity** — required edges, corners, transitions, anchors, and collision boundaries.
5. **Composition** — silhouette, asymmetry, negative space, and variation plan.
6. **Workflow** — layers, previews, comparisons, validation, and export.

Start a project with this short contract and reuse it:

```text
Style contract: crisp hand-placed pixels, no antialiasing or blur, 10–14 colors,
one warm upper-left light, cool blue-violet occlusion, readable silhouettes at
native size, irregular clusters with intentional negative space, and no uniform
random noise. World grid: 32×32. Every anchor and collision footprint uses
32px increments unless the prompt explicitly says otherwise.
```

**Example prompt:**

```text
Before drawing, write a style contract for a twilight swamp set: 12 colors,
cool blue-violet shadows, warm green highlights, upper-left light, chunky
clusters, irregular silhouettes, no antialiasing, and a 32×32 world grid.
Reuse that contract for every tile and prop in this request.
```

## 3. A production terrain tileset

```text
Create a production-ready 32×32 grass-and-soil terrain tileset in Aseprite.

Use the established style contract. Make a transparent 8×6 sheet; every cell
is exactly 32×32. Include solid grass, solid soil, four straight edges, four
outer corners, four inner corners, grass-to-path transitions in four directions,
three alternate edge variants, one plain collision/debug cell, and four
transparent decorative grass-tuft cells. Keep opposite edges compatible and
avoid repeating the same cluster pattern.

Layers: Base, Texture, Highlights, Details, CollisionGuide. Preview a 5×5 test
map using every legal corner and transition. Fix seams, doubled outlines,
one-pixel gaps, and collision mismatches before exporting a PNG sheet, JSON
metadata, and default VYI (`.vyi`). Validate that no pixel leaves its 32×32 cell.
```

Ask for variants after the base set is correct:

```text
Keep the existing style contract, geometry, palette roles, and 32×32 cells.
Add three alternate grass edges and two alternate soil clusters. Change cluster
placement and hue balance only. Preserve every adjacency and collision rule.
Preview the updated 5×5 board and redraw any pair that reads as a duplicate.
```

Use `templates.tileset`, `tileset.grid`, `analysis.diff`, and `aseprite_preview` to make the test board repeatable. A beautiful isolated tile is not production-ready until it works beside its neighbors.

**Example prompt:**

```text
Create the 5×5 terrain test board now. Place every straight edge, outer corner,
inner corner, and grass-to-path transition beside its legal neighbors. Preview
the board and report each seam or collision error before exporting.
```

## 4. Full variation sheets

Use `templates.prop_sheet` for repeated map objects. Its default cells are 32×32, with a shared grid and transparent background.

```text
Create a 4×4 variation sheet of 16 forest rocks on the 32×32 world grid.
Use one centered rock per cell, a shared bottom-center anchor, and at least
two transparent pixels around each silhouette. Make four round, four flat,
four jagged, two mossy, and two cracked rocks. Keep the same palette and light,
but vary width, height, cluster placement, and accent pixels. Use one cool
ground-shadow cluster. Do not make duplicates by recoloring. Preview the whole
sheet, identify repeated silhouettes, redraw them, and export PNG plus metadata.
```

For bushes, use round, flat, flowering, berry, shadowed, and autumn silhouettes. For crates, use closed, open, damaged, mossy, banded, stacked, and empty states. Fill eight cells, critique them, then fill the next eight so the model can maintain consistency without a huge one-shot request.

**Example prompt:**

```text
Fill cells 1–8 of the 4×4 prop sheet with distinct bushes. Compare their
silhouettes at native size, list any duplicates, redraw those cells, and only
then fill cells 9–16.
```

## 5. Ready-to-use prop prompts

### Crates, barrels, and signs

```text
Create six 32×32 transparent crate variants for the existing meadow contract:
closed, open, damaged, mossy, banded, and stacked. Keep each silhouette inside
a 28×28 safe area with a bottom-center shadow. Use three wood values, one warm
outline, and one accent nail color. Put artwork on Prop and the shadow on
GroundShadow. Preview all six in a 3×2 variation sheet.
```

```text
Create four 32×32 map props: closed barrel, open barrel, blue-banded barrel,
and a two-board sign. Use a shared bottom-center anchor, two-pixel shadow,
three wood values, and a single readable accent. Keep sign marks symbolic;
do not render tiny antialiased text.
```

### Tree

```text
Create a 64×96 deciduous tree on the 32×32 world grid. Use Canopy, Trunk,
GroundShadow, and Details layers. Make the canopy an irregular three-value
cluster with 5–7 silhouette notches, not a circle. Keep the trunk centered in
the bottom 32px row so the tree aligns to a map cell. Add two alternate canopy
variants and one autumn palette variant without changing the trunk anchor.
```

### Bushes and rocks

```text
Create eight 32×32 bush and rock props in the meadow style. Keep a shared
bottom-center anchor and a one-pixel cool ground shadow. Use clustered pixels,
not random noise. Vary silhouette rhythm and interior value grouping; do not
make trivial recolors. Label the cels bush_01…04 and rock_01…04.
```

### Campfire

```text
Create a 32×32 campfire with four animation frames at 100ms. Keep the stone
ring fixed in every frame; animate only logs, flame silhouette, and two embers.
Use Ring, Logs, Flame, and Embers layers; deep blue-violet outline; warm orange
core; pale yellow hottest cluster; restrained red accent. Anchor the ring to the
bottom center and validate that its collision footprint never changes.
```

### Bridge

```text
Create a 96×64 wooden bridge on the 32×32 grid with three spans and curved end
caps. Use Deck, Rails, Supports, WaterShadow, and Details layers. Keep the
walkable deck and bank anchors aligned to 32px cells. Make straight, left-bank,
right-bank, and water-only variants without changing collision geometry.
```

## 6. Overlays and longer animations

To add clothing or equipment, keep the base animation locked and create a new layer:

```text
Open the existing character animation. Inspect frame count, tags, layer names,
and base bounds. Lock Base. Create Shirt with animation.overlay so every Shirt
cel inherits the base frame positions and durations. Draw only the shirt; keep
feet, face anchor, and hands aligned while the garment deforms with each pose.
Preview idle, contact, and passing frames. Fix sliding hems and broken arm
holes. Export the combined sheet and separate Base/Shirt VYI icons.
```

To continue an animation:

```text
Extend the walk tag by four frames. Copy timing and overlay layers first, then
draw contact, down, passing, and up poses. Keep the root foot position fixed,
preserve the palette and light direction, preview before and after, and verify
that all original frames are unchanged.
```

**Example prompt:**

```text
Add a blue raincoat overlay to the existing four-frame walk cycle. Preserve
the base layer, feet, hands, and timing; use animation.overlay, draw only the
coat, preview contact and passing frames, and validate that no hem slides.
```

## 7. References and originality

Use `aseprite_reference` for inspiration. Ask the model to extract broad principles—palette temperature, light direction, material breakup, camera angle, and pose rhythm—then request a fresh silhouette, composition, and detail language. Combine multiple references when useful.

Do not ask for tracing, exact pixel sampling, distinctive character or logo copying, or trivial recoloring unless you own the source and explicitly want an adaptation. Record the source and permission when relevant. Review the result for overly similar silhouettes and revise them. This workflow supports original work, but it cannot guarantee legal clearance or prove a numerical similarity threshold.

**Example prompt:**

```text
Use the attached forest tileset only as inspiration. Describe its palette
temperature, lighting, edge rhythm, and material breakup, then design a new
32×32 grass tile with a different silhouette and cluster arrangement. Do not
trace, sample pixels, or reproduce distinctive marks.
```

## 8. Quality and token efficiency

Use a stronger multimodal model for the initial style contract and visual critique. A smaller model is usually excellent for deterministic tasks such as overlays, frame extension, cleanup, tagging, export, and validation when geometry and the style contract are explicit. Preview at native size after the silhouette, after shading, and before export—instead of after every stroke. At each milestone, identify and fix the biggest readability problem first. Generate variants only when they help compare meaningful design choices.

Always request named layers, explicit anchors, native-size previews, adjacency checks, collision validation, and the export formats you need (`.aseprite`, PNG sheet, JSON metadata, GIF, or VYI).

**Example prompt:**

```text
Work in three milestones: silhouette, shading, and final sheet. Preview at
native size only at those milestones, batch related edits, and after each
preview identify and fix the biggest readability problem first. Check palette,
anchors, duplicate variants, and export readiness. Finish with an .aseprite
source, PNG sheet, and JSON metadata.
```

## 9. Shading, Cluster Theory, and Procedural Anti-Patterns

Pixel art differs fundamentally from low-resolution raster graphics. Professional pixel art relies on **discrete pixel clusters**, **directional form lighting**, and **hue shifting**. When prompting or writing code generators, avoid the procedural math traps that produce artificial "CGI" or "programmer art" looks.

### The Core Principles

1. **Cluster Theory (No Orphan Pixels or Modulo Grids)**
   - Keep the brush footprint exactly **1×1 pixel**. Never use a 2-pixel brush. Build larger clusters through deliberate individual pixel placement or intentional shape fills; cluster size should vary with the form and display scale.
   - High-grade pixel art uses intentional shapes and connected color groups, while allowing a single pixel when it serves a clear purpose such as an eye glint, star, or small accent.
   - **Banned Anti-Pattern**: Never use algorithmic modulo patterns (e.g., `(x + y) % 3 === 0` or `x % 4 === 0 && y % 3 === 0`). These create mechanical halftone dots, pegboards, and noisy CGI dithering.
   - **Cluster Rule**: Pixels of the same color must touch along flat edges. Lone, isolated pixels ("orphans") create visual static and dirty textures unless they represent deliberate sub-pixel particle sparks or stars.

2. **Form Lighting vs. Pillow Shading**
   - **Banned Anti-Pattern**: Never pillow-shade. Pillow shading occurs when concentric bands of shade are wrapped around an object's perimeter towards a center highlight. This creates an ungrounded, inflatable plastic or gelatin appearance.
   - **Form Lighting**: Choose a single distinct light vector (conventionally **10:00 or 11:00 upper-left**). Treat the object as true 3D volumes (overlapping spheres, cylinders, cubes):
     - **Key Light (Highlight)**: High-exposure facets facing the light.
     - **Midtone**: The main body of the volume.
     - **Core Shadow & Terminator**: The band where form turns away from light.
     - **Occlusion Crevices**: The deepest cracks, underhangs, and contact points with dark ambient occlusion.

3. **Hue Shifting (Warm Light, Cool Shadow)**
   - Do not shade by simply lowering value/lightness or raising black.
   - **Highlights**: Shift the hue towards the light source's color temperature (typically warmer: green foliage shifts towards yellow-green; brown wood shifts toward golden amber).
   - **Shadows**: Shift the hue towards ambient environmental bounce (typically cooler: foliage shifts toward deep emerald/teal/navy; wood shifts toward purple-tinted umber).

4. **Organic Masses vs. Mathematical Bands**
   - **Banned Anti-Pattern**: Never use planar dot-product or linear formulas like `-(dx * 0.7 + dy * 0.7)`. These paint diagonal glossy sheen stripes across forms.
   - **Organic Canopy/Foliage**: Break trees, bushes, and clouds into 4–7 distinct, overlapping scalloped leaf lobes. Light each lobe individually as a small bulb, casting shadows onto the lobes beneath it.
   - **Organic Wood & Trunks**: Real pixel art trunks have twisting fibrous grooves, flared root buttresses, and asymmetric knots. Never draw rigid geometric cones, telephone poles, or flat rectangular box cutouts.

5. **Clean Contours and Selective Outlines (Sel-Out)**
   - **No Stragglers**: Outer contours must follow smooth integer staircases (e.g. 1-1-2-2-3-4-3-2-2-1-1). Eliminate jagged orphan steps or spike pixels.
   - **Sel-Out (Selective Outlining)**: Use dark, tinted outlines for exterior perimeters to separate from game backgrounds. On interior edges facing direct light, soften the outline with a dark midtone instead of pure black to let surfaces breathe.

6. **Ground Shadows**
   - Cast shadows are single, cohesive silhouettes projected opposite the light source (e.g., bottom-right).
   - Never use concentric rings of diminishing alpha transparency. Use a single solid shadow color (or clean solid alpha tone) with crisp edges and tiny grass tuft notches.

### Summary Comparison Table

| Feature | ❌ AI / Procedural Traps | ✅ Authentic Pixel Art Standard |
| --- | --- | --- |
| **Dithering / Texture** | Modulo checkerboards (`x % 3 == 0`), accidental noise, enlarged brush strokes | Intentional pixel clusters composed with a 1×1 brush, hand-placed notches |
| **Lighting** | Pillow shading (bands wrapping edges inwards) | Directional form lighting (10 o'clock sun, lit facets vs shadow facets) |
| **Gradients** | Diagonal dot-product sheen stripes, smooth mathematical blends | Layered organic cloud puffs, scalloped leaf masses |
| **Color Ramps** | Monochrome black/white lightness sliding | Rich hue shifting (warm yellow highlights, cool blue/purple shadows) |
| **Outlines** | Accidental 1px spikes ("stragglers"), blurry antialiasing | Crisp 1-2-3 staircase contours, selective interior outlining (sel-out) |
| **Cast Shadows** | Concentric transparent bullseye rings | Single cohesive solid silhouette, bottom-right offset, grass fringes |

## 10. VFX, Spell Effects, and Combat Feedback Playbook

Visual Effects (VFX) in pixel art are not soft alpha particles or post-processed shader blooms. Great 16-bit / retro-arcade VFX rely on **dynamic silhouette expansion**, **shape breakup**, **additive color temperature ramps** (dark outline $\rightarrow$ saturated body $\rightarrow$ luminous core $\rightarrow$ pure `#ffffff` hot center), and **anticipation $\rightarrow$ impact flash $\rightarrow$ dissipation timing**.

### Core VFX Animation Principles

1. **The Life Cycle of a Pixel Art Effect**:
   - **Anticipation / Ignition (1–2 frames, fast 50–70ms)**: Tiny bright spark, gathering charge lines, or windup silhouette.
   - **Impact / Flash (1 frame, 40–60ms)**: Maximum volume expansion. Often features pure white (`#ffffff`) or inverted color flash, accompanied by sharp impact stars, crescent shockwaves, or radial spike lines.
   - **Tear & Dissipation (2–4 frames, 70–100ms)**: The solid shape tears open into chunky decaying clusters, flying embers, hollow smoke rings, and dissipating sparks. Never dissolve into generic dither noise; break down into cohesive $2\times 2$ or $3\times 3$ droplet clusters.
2. **Impact Frames (The Anime "Koma" Technique)**:
   - For heavy punches, kicks, or critical spell hits, insert a 1-frame **stark negative or high-contrast silhouette impact** (e.g. black-and-white inversion or pure white burst with black sharp directional speed wedges).
3. **Additive vs. Solid Outlines**:
   - Explosions, magic beams, and fire do **not** use black `#000000` outlines. Their outer boundaries use deep saturated hues (e.g. deep crimson `#800c14` for fire, dark violet `#2e0854` for arcane, deep navy `#0b2847` for ice).
4. **Motion Indicators & Smears**:
   - Melee attacks (punches, kicks, slashes) need dynamic crescent arcs and motion smear wedges that follow the swing arc, with a blunt leading edge and a tapering trailing tail.

---

### Ready-to-Use VFX Prompts

#### 1. Elemental Spell Effects (Fire, Lightning, Ice)

```text
Create a 48×48 animated magical fireball projectile with 6 frames at 70ms on
the 32×32 world grid. Use Core, BodyFlame, TrailingEmbers, and Glow layers.
Frame 1-2: Gathering flame teardrop with swirling tongue tendrils.
Frame 3-4: Blazing flight pose with trailing flame wake and 3-4 flying spark clusters.
Frame 5-6: Flame tip flickers and billows forward.
Color ramp: deep crimson outline (#700d15), fiery red-orange (#d9381e), brilliant
warm gold (#f5a823), pale lemon (#ffe866), and pure white hot core (#ffffff).
No black outlines; use deep crimson contour. Loop seamlessly. Export .aseprite,
spritesheet, and .vyi.
```

```text
Create a 64×64 arcane lightning burst spell with 5 frames at 50ms. Use Flash,
MainBolts, SecondaryArcs, and ImpactSparks layers.
Frame 1: 1-frame gathering spark at center with radiating needle rays.
Frame 2: Massive zig-zag lightning strike spanning diagonal canvas with sharp 90-degree
notches, pure white 2px core (#ffffff), bright cyan body (#5ce6ff), and deep cobalt
border (#163d82).
Frame 3: Bolt forks into 4 jagged branches that tear outward.
Frame 4: Main bolt vanishes; residual static sparks and 2x2 spark dots linger.
Frame 5: Fading embers dissolve. High-contrast arcade timing.
```

```text
Create a 48×48 ice spike eruption spell with 5 frames at 80ms. Use GroundCracks,
IceSpikes, FrostGlow, and Shards layers.
Frame 1: Ground cracks radiate with glowing pale teal fissures.
Frame 2: Two jagged, crystalline ice spears burst upward with sharp 45-degree chisel
tips, catching 10 o'clock sun highlights.
Frame 3: Ice spears reach peak height; frosty mist puffs vent from base.
Frame 4: Deep fractures spider across the spears, emitting loose flying ice crystals.
Frame 5: Spears shatter into 4 falling diamond-shaped shards. Palette: dark navy
(#0e1b33), steel blue (#2d568c), vibrant glacial cyan (#68d2e8), pale ice (#dcf7ff).
```

#### 2. Radial Shockwaves, Rings, and AoE (Area of Effect)

```text
Create a 64×64 ground-stomp expanding shockwave ring on the 32×32 grid with 5
frames at 60ms. Viewed in 3/4 top-down perspective (perspective-foreshortened ellipse,
not a circle). Use GroundDust, ShockwaveRing, and RockDebris layers.
Frame 1: Impact center crater explosion (compressed flat oval 12x6 px) with flying
ground chunks.
Frame 2: Expanding double-banded elliptical shockwave (32x16 px) with 4-5 airborne
boulders trailing upward.
Frame 3: Wide shockwave ring (56x24 px) tearing into 8 jagged dust cloud puffs.
Frame 4: Ring breaks into dissipating 3x2 smoke puffs; rocks begin falling.
Frame 5: Dust wisps fade to transparent. Single cohesive tinted ground shadow under
debris.
```

```text
Create a 64×64 magical aura / summoning circle AoE with 4 looping frames at 100ms.
Perspective: 3/4 top-down isometric ellipse. Use Runes, PulsingRing, and FloatingMotes
layers. Deep amethyst (#2a0d45), vibrant magenta (#b31e8d), bright pink (#ff61c6),
and pure white glyph highlights. Inner runic symbols pulse in luminosity while outer
segmented energy ring rotates 45 degrees across the loop.
```

#### 3. Level-Up, Buff, and Healing Auras

```text
Create a 48×64 vertical level-up pillar of light with 6 frames at 70ms. Anchored
to bottom center so it overlays directly on a player character. Use GroundHalo,
LightColumns, SpiralingRibbons, and SparkleStars layers.
Frame 1: Radiant golden ground disc ignites at feet with ascending energy arrows.
Frame 2-3: Vertical translucent pillar of light surges upward past head height with
scalloped light flutes and two spiraling ribbon strands curling around the column.
Frame 4-5: Pillar expands and separates into sparkling 4-point star bursts drifting
skyward.
Frame 6: Final lingering gold dust particles. Warm celestial palette: amber shadow
(#69400f), radiant gold (#e6a817), sunlight yellow (#ffeb60), white core (#ffffff).
```

```text
Create a 32×48 regenerative healing swirl with 5 frames at 90ms. Use RisingLeaves,
EmeraldSpiral, and HolyGlow layers. Twirling helix of glowing emerald leaf motes
and soft teal sparkles that wrap around character torso from ground to sky.
Color ramp: deep forest (#0d381e), jade (#1fa35b), mint (#62f59e), white spark.
```

#### 4. Combat Impacts: Punches, Kicks, and Hit Indicators

```text
Create a 48×48 blunt impact punch effect (fighting-game style) with 4 frames
at 50ms. Use HitSparks, ShockLines, and ImpactStar layers.
Frame 1: High-impact star burst: 8-point asymmetric sharp star centered on the blow,
pure white core (#ffffff) with golden-orange bevel (#f59e0b) and crimson border
(#991b1b), accompanied by 4 horizontal speed streaks.
Frame 2: Star expands into a hollow spiky energy ring with 6 flying diamond spark pellets.
Frame 3: Ring snaps open into 3 dissipating crescent shockwave fragments.
Frame 4: Residual smoke wisp and 2 fading spark flecks. Punchy, visceral arcade feel.
```

```text
Create a 48×48 dynamic kick sweep impact with 4 frames at 60ms. Use SweepArc,
WindTrails, and ImpactDebris layers.
Frame 1: Wide 120-degree sweeping crescent blade trail with thick blunt head (4px wide)
tapering to a fine 1px curved tail.
Frame 2: Crescent splits into 3 parallel wind slices with trailing speed stripes and
two angular hit-burst stars at the focal contact point.
Frame 3: Slices disperse outward into trailing air curls.
Frame 4: Fading wind wisps dissolve. White highlight, cyan-blue wind palette.
```

```text
Create a 32×32 "Player Hit / Damage Taken" combat reaction indicator with 4
frames at 60ms. Use FlashOverlay, SlashSpatter, and ComicImpactMarks layers.
Frame 1: Bold red-and-white comic "POW" jagged starburst with diagonal slash scar
crossing center and two 3-pixel blood/energy droplet flecks.
Frame 2: Starburst expands and hollows; droplets fly outward by 4 pixels.
Frame 3: Crack lines retract; droplets shrink to single 1px fading dots.
Frame 4: Complete dissipation. High readability at 1x native scale.
```

#### 5. Anime-Style Impact Frames & Speed Motion Indicators

```text
Create a 64×64 anime impact frame (Koma cut) for a decisive critical blow with
3 frames at 40ms.
Frame 1 (Impact Flash): Inverted high-contrast black-and-white composition. Stark black
silhouette character center surrounded by explosive pure white radial lightning wedges
and diagonal speed hatching.
Frame 2 (Release): Blinding white canvas flash with deep violet (#1e053a) splintered
fracture fissures tearing across the screen center.
Frame 3 (Color Bloom): High-saturation chromatic shockwave ring (magenta #e11d48, cyan
#06b6d4, yellow #facc15) bursting outward.
Designed to be played at 24-30 fps for extreme visceral impact.
```

```text
Create a 48×48 radial speed lines overlay / dash burst with 4 looping frames
at 70ms. Centered vignette of sharp, inward-pointing speed needles with staggered
lengths (6px to 20px). Needles jitter and cycle dynamically, leaving the center
24x24 area transparent for the character sprite. Pure white (#ffffff) with pale
cyan trailing fringe (#cffafe).
```

#### 6. Screen Cracks & Critical Damage Indicators

```text
Create a 64×64 UI / screen glass shatter crack indicator for catastrophic hit or
shield break, with 5 frames at 60ms. Use ImpactPoint, Fractures, and GlassShards layers.
Frame 1: Spiderweb impact core: central white impact crater with 5 primary jagged
fracture lines spreading 16px outward.
Frame 2: Fractures branch with secondary hair cracks reaching screen edges; 6 triangular
glass shard facets pop loose with specular white edge glints.
Frame 3: Shards shift and rotate slightly outward, exposing dark cyan void cracks behind
them; secondary cracks widen.
Frame 4: Shards tumble downward; crack line opacity dims to translucent ice-blue.
Frame 5: Cracks fade out into subtle transparent hairline fractures.
```

```text
Create a 64×64 low-health vignette / pulsing hit indicator for top-down HUD with
4 looping frames at 120ms. Transparent center; perimeter borders lined with a jagged,
pulsing visceral crimson vein vignette (#450a0a dark red, #991b1b blood red, #dc2626
bright arterial pulse). Perimeter swells inward by 3px on pulse beat then contracts.
Seamless looping animation.
```

---


