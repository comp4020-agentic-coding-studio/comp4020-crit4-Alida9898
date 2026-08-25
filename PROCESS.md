# Process overview

A rack of seven water glasses you tap to play and drag up/down to retune, all
synthesised live with Web Audio — no audio files ship. The idea is that
tuning by pouring water is something anyone can do with no musical knowledge
at all, so the instrument teaches itself as you play with it.

## The moments that mattered

1. **Pouring raised the water when it should have lowered it, and nothing
   caught it but a hand.** Dragging down was supposed to fill the glass, but
   an early version had the sign backwards — drag down, water rises. It still
   ran, still animated smoothly, and the test suite stayed green the whole
   time, because a `pointermove` handler with the arithmetic inline isn't
   something a unit test can reach without a real DOM and real pointer
   events. Instead of just flipping the sign and moving on, I pulled the
   whole calculation out into one pure function, `pouredLevel(startLevel, dy,
   travel)`, so the direction itself could be an assertion rather than
   something I'd have to re-notice by hand every time I touched the gesture
   code. I wrote the rule down in `CLAUDE.md` so the next gesture (a drag,
   scroll, or zoom with a sign in it) gets the same treatment by default
   instead of repeating the same silent bug.
   [`87840f9`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit4-Alida9898/commit/87840f91e11f10deb4908f15bf61d26e5a3c7a76)

2. **The instrument felt thin even once tapping and pouring both worked, and
   the reason was that nothing accumulated.** You'd tap a glass, it would
   ring, and that was the end of it — tuning one glass had no effect on
   anything beyond that glass. Rather than adding more visual polish to a
   design that was structurally thin, I added a hidden 100 BPM pulse and a
   pure `quantizedDelay(now, beat, maxNudge)` function that nudges a strike
   onto the beat by at most 80ms, so a tap always lands "in time" without the
   player having to know what a beat is. I didn't just trust that it felt
   right: I monkey-patched `OscillatorNode.start` in the live page and read
   the scheduled-time-minus-now delay across several real taps — 0, 0.08,
   0.08, 0, 0, 0, 0.0773, 0.048 — confirming every one landed inside `[0,
   0.08]` and the cap wasn't silently being exceeded.
   [`33d6a6f`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit4-Alida9898/commit/33d6a6f1def2d3dc2c95e5936ef07f2ba7fa1e0d)

3. **A full glass showed half a waterline ellipse instead of a whole one, and
   the obvious fixes (resize the ellipse, move it) would have been treating
   the symptom.** I traced it to the clip path's top edge: it closed with an
   implicit straight line back to the opposite rim point, so on a full glass
   that line sliced straight through the middle of the waterline ellipse,
   cropping the top half to nothing. The floor of the same clip path already
   used an arc for its closing edge and never showed the bug, which is what
   told me the top needed the same fix rather than a change to the ellipse
   itself. I gave the top the same kind of arc, sized to the rim ellipse, and
   checked it by re-running `pnpm check` (62/62), looking at both marking
   viewports, and running `ab a11y` to confirm the fix hadn't introduced a
   new violation.
   [`56a1a15`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit4-Alida9898/commit/56a1a152c17ffd98a7cff8b0f7732e05f160ecb0)

## Before you ship

`pnpm check` is green (62/62), `ab a11y` reports zero violations in Chrome at
both marking viewports, and contrast against the gradient/photo backgrounds is
hand-measured and recorded in `styles.css` where axe can't resolve it. Full
history and the decisions behind the shape of the instrument are in
`PLAN.md`.
