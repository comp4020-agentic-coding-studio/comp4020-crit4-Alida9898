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

`pnpm check` is green — 50 tests, including the five in `spec/instrument.test.ts`
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

## Open, and where we stopped

The design still feels thin, and the diagnosis we landed on is that **nothing
accumulates** — you tap, it rings, it is gone. Tuning changes one glass and has
no consequence beyond that glass.

The goal underneath is: *someone who cannot play music should be able to make
music here.* Pitch is already handled (pentatonic — nothing clashes). What is
not handled is **rhythm**: taps land exactly when they land, so it still sounds
like someone tapping at random.

**Next thing to try — quantisation (~40 min).** Run a hidden pulse and nudge
each strike onto the nearest beat (≤80ms, below notice). Not the player getting
tighter, the page aligning them — the reason a drum machine makes anyone sound
like a drummer. It also completes the pour gesture: *pour to choose which notes
exist* (anyone can), *tap to play* (quantised, so anyone is in time). Neither
half needs musical knowledge.

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
