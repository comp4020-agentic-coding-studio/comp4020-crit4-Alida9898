# Crit 4 — Water glasses

Deadline **2026-08-26 12:00** (two hours before the Wednesday session, group
yunlin). Written 2026-08-25, ~02:30.

## What it is

A rack of seven glasses. Tap one and it rings. Drag sideways across the rack
and it sweeps, faster drags hitting harder. Drag up and down on a glass to pour
water in or out — the pitch slides freely while you drag and settles onto the
nearest note of the pentatonic scale when you let go. Keyboard: `1`–`7` strike,
`←/→` walk the rack, `↑/↓` pour.

Everything is synthesised live with Web Audio. No audio files ship (the spec
tests fail the build if any ever do).

## Where it stands

`pnpm check` is green — 56 tests, including the five in `spec/instrument.test.ts`
that were red on purpose when the week started. `ab a11y` in Chrome reports zero
violations. Both marking viewports fit with no scroll.

**Not done, and all of it blocks submission:**

- `PROCESS.md` is still the template. `pnpm check:evidence` fails on it.
- `reflections/crit-4.md` does not exist. 150–300 words, first person, two set
  questions — this one has to be written by a human, not drafted and accepted.
- **Nothing has ever been pushed.** There are 9 local commits and the site has
  never deployed. CI only runs when the repo is public, and deploy is what
  counts as submission. Leave time for the run.

## The decisions, and why

### The instrument tunes itself by pouring — that is the whole differentiator

A xylophone, a glockenspiel, a set of bells and a rack of glasses are all "a row
of tuned things you hit". The single thing water glasses have that none of the
others do is that **you can retune them with a gesture that needs no musical
knowledge at all**. Someone who does not know what a semitone is knows exactly
what "more water" means.

That is the point of the form. Anything that makes pouring matter more is
probably worth doing; anything that treats it as decoration is missing why this
shape was chosen.

### More water rings LOWER

Struck, the water loads the glass wall and drops the frequency. (A *blown*
bottle is the opposite — the air column shortens.) This is inaudible as a bug:
an instrument tuned backwards still plays, it just lies about water. Pinned in
`spec/tuning.test.ts`, not left to a comment.

### Free while pouring, in tune on release

Dragging glides the pitch and rings the glass at each note it passes; letting go
settles onto the last note it rang. The chime-per-note came after the first
version held a sustained oscillator that "sounded like something screeching" —
an `OscillatorNode` defaults to a sine, and a steady pure tone next to a struck,
inharmonic, decaying voice is audibly a second instrument. It was also dishonest
feedback: the pitches in between are ones the glass cannot keep.

### The strike has a contact transient

Three sine partials rising out of silence is a tone appearing, not an object
being hit, and no amount of retuning the ratios fixes that — the ear decides
"struck" from the first few milliseconds. There is now a ~30ms band-passed noise
burst at contact, four partials, and a few cents of random detune per strike so
a fast sweep is not one sample seven times.

### The glasses are hand-written into `index.html`

Not built by script, so a failed or slow load still leaves something to touch —
and the spec checks read the shipped markup. `role="slider"` is not decoration:
the water level *is* the value, so arrow keys are already the right keys and a
screen reader already announces the right thing. `spec/page.test.ts` holds that
markup against `defaultWaterLevels()` so the no-script state cannot drift into a
lie. It caught a hand-rounding error on glass 5 within a minute of being written.

### Dark and lit, because glass is made of light

Flat fills read as a bar chart, which kills the one property the whole design
rests on: a stranger recognising a vessel and knowing to tap it. Gradients live
once in a `<defs>` block that all seven glasses point at.

## Abandoned: 八字纳音 (bazi / nayin)

The first direction was to derive a four-note drone from a birth chart. It was
planned in detail and thrown away before any of it was built, for a reason worth
keeping: **八字 is a constant, and a constant cannot be an instrument.** However
it was dressed up, "compute a scale from your birth time" is a random seed —
what the player then does has no causal relation to their chart, so "two players
sound different" would have been fabricated rather than true.

Water level does not have this problem. The player sets it, and it stays set.

## Rhythm: a hidden pulse taps quantise onto

The design felt thin, and the diagnosis was that **nothing accumulates** — you
tap, it rings, it is gone. Tuning changes one glass and has no consequence
beyond that glass. Pitch was already handled (pentatonic — nothing clashes);
**rhythm** was not: taps landed exactly when they landed, so it still sounded
like someone tapping at random.

Built: `rhythm.ts` holds a silent 100 BPM pulse and one pure function,
`quantizedDelay(now, beat, maxNudge)`, that holds a strike back by at most
80ms so it falls on the grid — never rewinding a strike that just missed a
beat (there is no scheduling audio in the past), never holding one longer than
the cap even when the true nearest beat is farther off. `strike()` takes an
optional `quantize` flag and shifts its whole schedule by that delay;
`spec/rhythm.test.ts` holds the cap, the no-rewind rule, and the exact-landing
case. Confirmed live in Chrome by monkey-patching `OscillatorNode.start` and
reading the scheduled-time-minus-now delta across several taps: 0, 0.08, 0.08,
0, 0, 0, 0.0773, 0.048 — always in `[0, 0.08]`, never maxed by default.

Only discrete "play this glass" actions are quantised — the initial tap, a
sweep across the rack, and the keyboard's digits/Enter/Space. Pouring's
per-note chime, the release settle-ring, and arrow-key water adjustment stay
un-nudged, because those are tied to a hand still moving or a gesture
confirming itself, not a "when did I mean to hit this" moment. This completes
the pour/tap split: *pour to choose which notes exist* (anyone can), *tap to
play* (quantised, so anyone is in time). Neither half needs musical knowledge.

Considered and rejected for now:

- **A looper.** Repetition adds no musicality; it is a musician's tool, not a
  thing that makes a non-musician sound good.
- **Call-and-response phrases.** Genuinely interesting, but bigger, and it risks
  the pod feeling like passengers rather than players — which would undercut
  "the browser is the instrument".
- **three.js.** Would look better and cost a great deal: a WebGL canvas is a
  blank rectangle to assistive tech, so the accessibility that currently comes
  free from seven `role="slider"` elements would have to be rebuilt as a
  parallel DOM layer. Also a first runtime dependency, a lockfile change, and a
  black screen if anything goes wrong in the crit room. Not before the gates are
  done, and if ever, on a branch.

## Shape and light: a tapered vessel, not a cylinder

A straight-sided rect read as a graduated cylinder — lab glassware, not
something you'd drink from — and the old highlight was one full-width gradient
rect with hard opacity bands across it, which looked like a ruler's markings
rather than light on a curved surface. Both were raised directly: "不要是一个
圆柱子" and "这个高光做得是挺丑的，就是有点实验室风格了。" Three.js was offered
and turned down (the same reasons as below still applied) in favour of fixing
this in SVG/CSS.

Fixed with two changes, both keeping the existing paint pipeline untouched:

- A single `<clipPath id="vessel-clip">` holds the tapered silhouette — narrower
  at the floor than the rim. `.cavity`, `.water`/`.water-base`, `.surface` and
  the highlights all clip to it, so every fill element crops to "glass-shaped"
  without touching the per-glass numeric water levels in `index.html` (still
  `defaultWaterLevels()`, still pinned by `spec/page.test.ts`) or `main.ts`'s
  paint logic. Only the ellipse radii at the floor (`cavity`, `water-base`,
  `reflect`) needed to shrink to match the taper visually.
- The one hard-banded `wall-sheen` gradient became two narrow, blurred,
  rounded streaks (`highlight-bright`, `highlight-dim`) — two thin lit curves
  read as glass; one wide shaded rectangle reads as a beaker even softened.

Also bumped `h1` from 0.8rem/`--muted` to a `clamp()` up to 2rem/600 weight/
`--ink`, raised earlier in the same request ("Water Glasses" 这个字太小了) and
folded into this pass rather than left for later. `--ink` on `--ground-lift`
hand-measures at 13.6:1 (AAA), recorded in `styles.css`.

Verified in both marking viewports (agent-browser, since the desktop's window
manager wouldn't actually shrink to 390 wide) and with `ab a11y`: 0 violations,
contrast still `incomplete` (expected — gradient ground, per the note below)
rather than a new failure.

## Warm redesign: a real photo, floating light, a beam, and ripples

Still "ugly" after the taper/highlight fix ("你既然做得很难看") --- the direction
was right but the palette (cool cyan/navy) and lighting were too clinical for
what the shape was supposed to feel like. Offered a menu of concrete
alternative directions in prose rather than building the first idea; the one
picked was warm/domestic, with four things named in the same message: a cozy
photo background, light floating in the air, a beam falling on the glasses,
and ripples spreading when a glass is struck ("温馨的家里，可能有光在浮动，有那
种有一束光打到杯子的感觉...敲击的时候，会有波纹荡漾开").

- **The photo is the player's own** (`public/scene.jpg`), not a stock or
  AI-sourced image --- offered to find one, but a real photo the player handed
  over sidesteps copyright/licensing entirely, which a scraped one would not
  have. Processed from their `IMG_7816.HEIC` with `sips` (orientation) and
  Python/Pillow (warm per-channel shift, +saturation, +contrast, resized to
  2400px longest side, JPEG q=82) since no ImageMagick/exiftool/ffmpeg exist on
  this machine. The HEIC original stays on disk but is gitignored --- it's a
  full-size personal photo with EXIF; only the processed derivative ships.
- **Palette moved from cyan/navy to amber/brown** (`:root` in `styles.css`).
  Contrast against a *photo* has no single lightest stop to hand-measure
  against the way a gradient does, so the check moved one layer down: the
  `body` scrim (a dark gradient painted over the photo) is kept opaque enough
  over the text band that its own colour dominates even the brightest pixel
  the photo could hand it there. Sampled the brightest pixel in the photo's
  top third, composited it under the scrim's *minimum* opacity across that
  band, and measured contrast against that composite --- written into the
  `:root` comment beside the values, same convention as before, adapted to a
  background that can't be read at a glance.
- **Floating light is five `.mote` spans**, `position: fixed` behind
  everything real, drifting bottom-to-top on a CSS keyframe. First pass was
  invisible: `--glow` (amber) at 0.2-0.35 opacity, blurred, is nearly the same
  hue as the sky it floats over --- confirmed by zooming into the exact
  coordinates the animation reported and seeing nothing. Fixed by giving the
  core a near-white fill with a wider amber `box-shadow` glow around it and
  raising the peak opacity to 0.85, so it reads as a lit particle rather than
  a smudge the same colour as the air. Also found and fixed an off-by-one: the
  five spans were styled `:nth-child(2)` through `:nth-child(6)`, leaving the
  first mote with no `left` at all (default position, stuck at the corner)
  and the fifth rule matching a sixth span that doesn't exist.
- **The beam is one `.beam` div** behind the rack, not one per glass ---
  a soft amber gradient continuing the photo's own sunbeam rather than
  lighting the glasses from an invented direction. Kept inside `main`, started
  well below the title so it never brightens the text band the contrast
  comment is measured against.
- **Ripples are two more clipped ellipses per glass** (`.ripple-1`,
  `.ripple-2`, offset 100ms apart), reusing the same `vessel-clip` as the
  water so neither ring draws outside the glass wall, and repainted to the
  waterline in `main.ts` alongside the bloom so they spread from wherever the
  water actually is. Not pulled into a pure function like the pour gesture:
  it's a CSS keyframe scale/opacity effect with no sign-sensitive arithmetic,
  so there's nothing a unit test would catch that a look wouldn't.

Verified in both marking viewports (`agent-browser`, since the desktop's
window manager wouldn't shrink to 390 wide) and `ab a11y`: 0 violations,
contrast `incomplete` as expected. The ripple was confirmed by dispatching a
synthetic `pointerdown`/`pointerup` and screenshotting mid-animation, since
computer-tool clicks in this environment don't reliably deliver a real
`pointerdown`.

## Tumbler shape and clear water

User's own words: "这个水的颜色太突兀了，不要这种蓝色，要那种透明一点的。 然后杯子的形状也改一下，改成那种矮一点的、稍微宽一点的玻璃杯，有一点弧度的那种圆弧形的。" — the water colour was too jarring, wanted something more transparent instead of that blue; the glass shape should be shorter, a bit wider, with a rounded arc to the wall.

- **`vessel-clip` rewritten from straight tapered sides to a curved barrel**
  (`viewBox` `64×194` → `70×136`; wall path now uses cubic Beziers pulled
  outward past both the rim and floor edges instead of straight `L` segments).
  Every glass shares this one `<clipPath>`, so redesigning it once reshaped
  all seven at once — water rect, surface ellipse, sheens and ripples all clip
  to it, nothing hand-set can draw outside the new silhouette.
- **`RIM`/`FLOOR` in `main.ts` moved from 16/164 to 14/112** to match the new
  viewBox — these are the numbers `paint()` uses at runtime to place the
  waterline, and they have to agree with the hand-written SVG or the two
  drift apart silently. `spec/page.test.ts`'s assertions are relational (equal
  floor across glasses, height proportional to level), not tied to specific
  pixel values, which is what made re-deriving seven glasses' worth of
  y/height/cy numbers by hand safe to verify: `pnpm check` passing is the
  proof the new geometry is internally consistent, not just that it typechecks.
- **`water-fill` gained `stop-opacity` (0.38–0.5) instead of just paling the
  hue.** A paler-but-opaque fill still reads as coloured glass; real water is
  barely a colour of its own; it's tinted by whatever is behind it. Partial
  opacity is what lets the photo bleed through the water the way light
  actually would.
- **`.surface` fill moved from `#b6f4ff` to `#eef7f8`** — same reasoning, the
  waterline should read as a lit edge on nearly-clear water, not a neon stripe.

Verified by zooming into the rendered rack at both marking viewports (the
curve reads as a tumbler, not a distorted flute), re-running `ab a11y` (still
0 violations, contrast still `incomplete` as expected against the photo), and
dispatching a synthetic strike to confirm the bloom/ripple still clip
correctly to the new wall shape.

## Things about this repo that cost time

- **Dev server is 5173**, not the 5177 in older notes — no `server` block in
  `vite.config.ts`.
- **`ab a11y` returns `incomplete`, not a pass, for contrast on this page**,
  because the ground is a gradient and axe cannot resolve one background colour.
  Nothing automatic covers it. Both text colours are hand-measured against the
  lightest point of the gradient and the numbers are written into `styles.css`
  next to the values. They go stale silently.
- **A gesture's direction cannot be tested from the event handler.** Dragging
  down used to raise the water — smooth, no error, suite fully green, found only
  by a hand. The arithmetic now lives in `pouredLevel()` in `tuning.ts` purely so
  the direction can be an assertion.
- `spec/starter.test.ts` was deleted when the starter page was replaced, as
  `spec/README.md` asks.
