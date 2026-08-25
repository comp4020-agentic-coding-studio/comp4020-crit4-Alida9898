import { describe, expect, it } from "vitest";
import { BEAT_SECONDS, MAX_NUDGE_SECONDS, quantizedDelay } from "../rhythm.ts";

// Contracts, not implementation: what the hidden pulse must be true of, so it
// survives me changing the tempo or the nudge window later.

describe("quantising a strike onto the hidden pulse", () => {
  it("never delays a strike past the nudge cap", () => {
    for (let now = 0; now < 3; now += 0.011) {
      expect(quantizedDelay(now, BEAT_SECONDS, MAX_NUDGE_SECONDS)).toBeLessThanOrEqual(
        MAX_NUDGE_SECONDS,
      );
    }
  });

  it("never rewinds a strike — the delay is never negative", () => {
    for (let now = 0; now < 3; now += 0.011) {
      expect(quantizedDelay(now, BEAT_SECONDS, MAX_NUDGE_SECONDS)).toBeGreaterThanOrEqual(0);
    }
  });

  it("lands exactly on the beat when the nearest one is within the cap", () => {
    const beat = 1;
    const maxNudge = 0.08;
    // A strike 50ms before a beat is well inside the cap, so it should be
    // held the rest of the way rather than merely nudged.
    const now = 2 - 0.05;
    const delay = quantizedDelay(now, beat, maxNudge);
    expect(now + delay).toBeCloseTo(2, 6);
  });

  it("plays immediately for a strike that just missed a beat, rather than waiting a whole cycle", () => {
    const beat = 1;
    const maxNudge = 0.08;
    // A strike 10ms after a beat has already missed it — the only honest
    // options are "now" or "a whole beat late", and later is worse.
    expect(quantizedDelay(2.01, beat, maxNudge)).toBe(0);
  });

  it("does not reach past the cap for a strike that lands mid-beat", () => {
    const beat = 1;
    const maxNudge = 0.08;
    // Dead centre between two beats: 0.5s from either. Snapping all the way
    // would be a half-second hold, audible as broken rather than in time.
    expect(quantizedDelay(2.5, beat, maxNudge)).toBe(maxNudge);
  });

  it("leaves a strike that already lands on the beat untouched", () => {
    expect(quantizedDelay(3, 1, 0.08)).toBe(0);
  });
});
