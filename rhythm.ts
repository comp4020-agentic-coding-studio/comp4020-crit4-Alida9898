// A hidden pulse that taps quantise onto --- no metronome sound, no visible
// click track, just a grid that pulls a strike a few milliseconds tighter than
// the hand that threw it. This is what makes a rack of taps sound played
// rather than merely triggered.
//
// Pure functions only, same rule as tuning.ts: the arithmetic that decides
// timing lives here so spec/rhythm.test.ts can hold it, not in the pointer or
// keyboard handler where a sign error would be invisible again.

/** ~100 BPM. Fast enough that a quick sweep across the rack isn't held back. */
export const BEAT_SECONDS = 0.6;

/**
 * The most a strike may be delayed to land on the grid. Below the ~100ms most
 * people notice as input lag, so the nudge reads as good timing, not latency.
 */
export const MAX_NUDGE_SECONDS = 0.08;

/**
 * How long to hold a strike arriving at `now` so it falls on the nearest
 * multiple of `beat` --- capped at `maxNudge`.
 *
 * Two things this deliberately does NOT do:
 * - rewind a late strike: there is no such thing as scheduling audio in the
 *   past, so a strike that landed just after a beat plays immediately rather
 *   than waiting a whole `beat` for the next one.
 * - fully snap a strike that lands mid-beat: if the true nearest beat is
 *   farther away than `maxNudge`, the hold still stops at `maxNudge` — a
 *   longer hold would be audible as lag, which is a worse lie than landing
 *   slightly off the grid.
 */
export function quantizedDelay(now: number, beat: number, maxNudge: number): number {
  const nearestBeat = Math.round(now / beat) * beat;
  const toBeat = nearestBeat - now;
  return Math.min(maxNudge, Math.max(0, toBeat));
}
