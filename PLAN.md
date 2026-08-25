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

`pnpm check` is green — 62 tests, including the five in `spec/instrument.test.ts`
that were red on purpose when the week started and the six in
`spec/vessel.test.ts` from round 4 below. `ab a11y` in Chrome reports zero
violations. Both marking viewports fit with no scroll.

`PROCESS.md` has real content citing real commits, `reflections/crit-4.md`
exists (150–300 words, written by hand, not drafted and accepted), and
everything is pushed — `pnpm check:evidence` passes and `git status -sb` shows
nothing ahead of `origin/main`. The repo is still private, so none of this has
triggered CI or a deploy yet; that only happens at `/ship`.

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

Three rounds on the same request, kept as one section rather than three,
since they're all the same shape/colour redesign settling into place.

**Round 1 — the ask.** "这个水的颜色太突兀了，不要这种蓝色，要那种透明一点的。
然后杯子的形状也改一下，改成那种矮一点的、稍微宽一点的玻璃杯，有一点弧度的那种
圆弧形的。" The water colour was too jarring (wanted something more
transparent instead of that blue); the glass should be shorter, a bit wider,
with a rounded arc to the wall.

- `vessel-clip` rewritten from straight tapered sides to a curved barrel
  (`viewBox` `64×194` → `70×136`; the wall path uses cubic Beziers pulled
  outward past the rim and floor edges instead of straight `L` segments).
  Every glass shares this one `<clipPath>`, so redesigning it once reshaped
  all seven — water rect, surface ellipse, sheens and ripples all clip to it.
- `RIM`/`FLOOR` in `main.ts` moved from 16/164 to 14/112 to match the new
  viewBox — `paint()` places the waterline off these at runtime, and they
  have to agree with the hand-written SVG or the two drift apart silently.
  `spec/page.test.ts`'s assertions are relational (equal floor across
  glasses, height proportional to level), which is what made re-deriving
  seven glasses' worth of y/height/cy numbers by hand safe to verify:
  `pnpm check` passing is proof the new geometry is internally consistent,
  not just that it typechecks.
- `water-fill` gained `stop-opacity` instead of just paling the hue — a
  paler-but-opaque fill still reads as coloured glass, and real water is
  barely a colour of its own, just whatever's tinting it from behind.

**Round 2 — two things missed.** "这个水和这个杯子的形状，它不是一体的。你只改了
杯子，你忘记改水怎么调了...这个杯底和杯子满的时候，这个颜色还是很奇怪...你这个
水的颜色，包括这个，太冷了" — the water and the glass shape didn't read as one
thing, and the colour, especially full or at the floor, still looked cold
against a warm background.

- `<rect class="water">` was still `x="10" width="50"`, sized for the old
  straight-sided flute. The new wall bulges to roughly x=6–64 at the belly,
  so the rect fell short of it — the clip path could only ever crop the
  rect, never fill it out to the wall, leaving a visible sliver of bare glass
  at the belly on every level. Fixed by widening the rect to `x="2"
  width="66"`, past the curve's actual extent, so the clip path alone
  determines the water's outline from then on.
- `water-fill`'s stops (`#eef6f7`/`#cfe4e8`/`#9fbac2`) were blue-grey even at
  low opacity — a cold tint regardless of what's behind it. Replaced with
  warm cream-to-tan stops (`#fbeedb`/`#e9cd9c`/`#c8a273`) from the same
  family as `--edge`/`--muted`. `.surface` and the strike-flash
  `#bloom-fill` had the same cold-cyan problem and got the same fix, since
  both sit directly on top of the water.

**Round 3 — the waterline ellipse itself was half-invisible on a full glass.**
"这个椭圆和杯子还是没对齐。这个杯子满的时候，这个一半椭圆一半有颜色，一半没颜
色" — the ellipse still didn't line up with the glass; on a full glass, half
the ellipse showed colour and half didn't.

- Root cause: `vessel-clip`'s top closed with an implicit straight line (the
  path's trailing `Z`, from the right rim point back to the left one at
  `y=14`) rather than a curve. `.surface`/`.ripple-1`/`.ripple-2` are ellipses
  centred exactly on that line when the glass is full, so the straight edge
  sliced each one through its own vertical centre — the upper half (`y=8` to
  `14`) fell outside the clip and showed bare background; only the lower half
  rendered. The floor already had this solved (its own closing edge is an
  arc, `A19 5 0 0 0 54 112`, which is why the floor never showed the same
  problem) — the top just never got the same treatment.
- Fixed by giving the top the same kind of arc, sized to match the rim
  ellipse exactly (`A25 6 0 0 0 10 14`) instead of the straight `Z` closure.
  The clip's top boundary now bulges up to `y=8`, enclosing the waterline
  ellipse whole instead of bisecting it — the same fix incidentally also
  corrects `.ripple-1`/`.ripple-2`, which sit at the same height and would
  have shown the same half-cut on a strike, just briefly enough not to have
  been reported yet.

Verified each round in both marking viewports and with `ab a11y` (0
violations throughout, contrast `incomplete` as expected against the photo),
plus a synthetic `pointerdown`/`pointerup` dispatch to check the bloom/ripple
against the new geometry — computer-tool clicks don't reliably deliver a real
`pointerdown` in this environment. `pnpm check` stayed green (56/56) through
all three rounds, which is what made re-deriving the geometry by hand each
time safe to trust rather than just hope.

**Round 4 — the waterline ellipse's width never changed, and it should.**
"你不觉得这个水面应该伴随着杯子的形状发生变化吗？你现在这个水面一直是一个形状
的，不对吧？" — shouldn't the water surface change shape along with the glass's
shape? Right now it's always drawn as one fixed shape, which is wrong.

Correct. `.surface`/`.ripple-1`/`.ripple-2` were all drawn at a constant
`rx="25" ry="6"` in every glass regardless of where their `cy` ended up — but
the tumbler wall (Round 1's Bezier curve) is wider at the belly than at the
rim, and narrower again at the floor, so a waterline sitting partway down the
glass should be a wider (or narrower) ellipse than the rim's own, not a copy
of it.

- `vessel.ts` is a new pure-function module, in `tuning.ts`'s style: it holds
  the wall's own left-side Bezier control points (copied from
  `vessel-clip`/`.wall` in `index.html`) and answers `halfWidthAtY(y)` by
  bisecting the curve's `y(t)` for the matching `t`, then reading `x(t)` off
  the same curve — no closed-form cubic inverse needed, since `y(t)` climbs
  monotonically from rim to floor. `surfaceRadiiAt(y)` pairs that width with
  a `ry` scaled by the rim ellipse's own squash (`6/25`), so a full glass
  renders pixel-identical to before this existed.
- `main.ts`'s `paint()` now calls `surfaceRadiiAt(line)` and sets `rx`/`ry`
  alongside `cy` on `.surface`, `.ripple-1` and `.ripple-2` — the same three
  elements Round 3 already fixed the vertical position of, so both fixes
  live in one loop now. `.bloom` keeps its fixed `r="27"`, deliberately: it's
  the light the strike throws, not the water's own disc, and was already
  drawn larger than the rim for glow bleed.
- The shipped `index.html` markup was re-derived glass by glass (via the same
  formula, run once through `node -e`) so the no-script state matches —
  glass 1 sits at the rim and is untouched (`rx="25" ry="6"`); glasses 2–7
  now range up to `rx="28.9" ry="6.9"` at the belly, narrowing back down
  again past it.
- `spec/vessel.test.ts` pins the curve as relationships, not hardcoded
  widths: equal to the rim exactly at the rim, narrower at the floor than the
  rim, wider in the middle than either end, changing smoothly rather than in
  jumps, clamped outside `[rim, floor]`, and the same `ry/rx` squash held at
  every height.

**Raised and deferred — a stemmed goblet instead of a tumbler.** "我突然觉得这
个杯子可以变成高脚杯，是不是？优雅 那种香槟的杯子" — the glass could become an
elegant, stemmed champagne-style glass instead. Real direction, but not for
today: with the 12:00 deadline this close and `PROCESS.md`/`reflections`/the
first push still outstanding, a stem-and-foot redesign is a much bigger
rewrite than anything above (new wall silhouette, a foot, a narrower bowl, the
water/waterline fit against all of it re-earned from scratch) — enough risk of
breaking a working, verified instrument to not be worth it this close to the
gate. Held as a stretch item, only if the gates below are clear with time
left over.

Verified Round 4 in both marking viewports and `ab a11y` (0 violations,
contrast `incomplete` as expected) plus a synthetic `pointerdown` on a
partway-filled glass to confirm the ripple/bloom sit on the widened ellipse
correctly. `pnpm check` is green at 62/62 (6 new in `spec/vessel.test.ts`).

## Planned, not built: blowing across the rim as a second mode

Raised after the gates were done and pushed: "可不可以加一个吹瓶口的那个，就是
两个模式...一个是敲，一个是吹瓶口." Written down here before any of it is built,
because it is three pieces of work (an inverted tuning, a second voice, a mode
control), not one.

### Why it earns its place rather than decorating

The test this plan already sets for itself is *does it make pouring matter
more*. Blowing passes it in the strongest possible way: **the same water level
means opposite things in the two modes.** Struck, water loads the wall and the
pitch falls. Blown, water shortens the air column and the pitch **rises**. So a
glass you poured to be the lowest note of the rack is the *highest* note the
moment you switch modes, and the rack you tuned into an ascending run plays
descending. That is not a second instrument bolted on — it is the same water
level being read twice, which makes the pour more load-bearing than it is now,
not less. It is also real physics rather than an invented rule, which is what
`tuning.ts`'s opening comment has said since the first commit without anything
in the app ever using it.

### The decisions

- **Mode is a visible two-state control, not a hidden gesture.** `pointerdown`
  already arbitrates three ways (tap / sweep / pour); a fourth hidden mode
  would fight the other three, and that class of bug is invisible — nothing
  errors, the gesture just occasionally does the wrong thing. A real `<button>`
  with `aria-pressed` also gets keyboard and screen-reader support for free,
  which matches how the seven `role="slider"` glasses already work.
- **`blownFrequencyAt(level)` is a pure function in `tuning.ts`, pinned by a
  test that asserts it moves opposite `frequencyAt` for the same input.** This
  is exactly the "inaudible as a bug" class that `pouredLevel()` exists for: an
  instrument tuned backwards still plays, it just lies about water. The test is
  the point of the function being separate.
- **The blown register sits lower than the struck one.** A blown bottle is a
  low woody note, not a bright ping. Reusing `EMPTY_HZ`/`FULL_HZ` would make the
  two modes sound like one instrument with a filter on it, which would waste
  the contrast the mode switch is for. Blown pitches still land on the same
  pentatonic degrees, so "no way to play it wrong" survives the switch.
- **The voice is sustained and breathy, with no contact transient.** Bandpassed
  noise at the resonant frequency plus a weak fundamental, ~120ms attack ramp,
  holds while held, ~200ms release. The strike's ~30ms noise burst is
  deliberately absent — the ear decides "struck" from the first few
  milliseconds, so leaving it out is most of what makes this read as blown.
- **The gesture is press-and-hold**, which is also the main risk (below).
  Pouring still works while a note sounds, and now bends the pitch audibly as
  the water moves — a better fit for a sustained voice than for a struck one.
  A horizontal sweep hands the single live voice to the glass under the finger
  rather than stacking voices, so it glides like a pan flute.
- **No quantisation in blow mode.** `quantizedDelay()` exists so a *tap* lands
  on the beat; a held note's musical content is its length and its bend, and an
  80ms delay on the attack of a note you are holding is just lag.

### The risk, named in advance

Every audio path in this project is currently fire-and-forget: `strike()`
schedules a decay and forgets the node. A held voice is the first thing that
has to be *torn down*, and a missed `pointerup` leaves a drone sounding with no
way to stop it — the worst possible failure in a crit room. `pointercancel`,
window `blur`, and `visibilitychange` all have to release it, not just
`pointerup`, and the same guard is needed against keyboard auto-repeat firing
`keydown` many times for one held key.

### How it ships

On a branch, not on `main`. `main` is currently green, pushed, and shippable;
this is the first change since the gates closed that could plausibly break a
working instrument, and the goblet redesign below was deferred for the same
reason. Merge only with `pnpm check` green and both modes confirmed by hand in
Chrome.

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
