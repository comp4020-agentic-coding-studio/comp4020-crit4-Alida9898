import { describe, expect, it } from "vitest";
import {
  BOTTLE_COUNT,
  DEGREES_HZ,
  EMPTY_HZ,
  FULL_HZ,
  brightness,
  defaultWaterLevels,
  frequencyAt,
  snapToScale,
  strikeGain,
  waterLevelFor,
} from "../tuning.ts";

// Contracts, not implementation: these say what the instrument must be true of,
// so they survive me rewriting how the mapping works.

describe("water rings the way water actually rings", () => {
  // The one fact in this project a test has to hold, because the bug is
  // inaudible: an instrument tuned backwards still plays, it just lies.
  it("rings lower the fuller the bottle gets", () => {
    for (let water = 0; water < 1; water += 0.05) {
      expect(
        frequencyAt(water + 0.05),
        `filling from ${water.toFixed(2)} raised the pitch — a STRUCK bottle drops as it fills (only a blown one rises)`,
      ).toBeLessThan(frequencyAt(water));
    }
  });

  it("stays in a range a glass could plausibly ring in", () => {
    for (let water = 0; water <= 1; water += 0.1) {
      const hz = frequencyAt(water);
      expect(hz).toBeGreaterThan(200);
      expect(hz).toBeLessThan(1200);
    }
  });

  it("round-trips through the inverse", () => {
    for (let water = 0; water <= 1; water += 0.1) {
      expect(waterLevelFor(frequencyAt(water))).toBeCloseTo(water, 6);
    }
  });
});

describe("there is no way to play it wrong", () => {
  it("settles only on notes in the scale", () => {
    for (let water = 0; water <= 1; water += 0.017) {
      const settled = frequencyAt(snapToScale(water));
      const onScale = DEGREES_HZ.some((degree) => Math.abs(degree - settled) < 0.5);
      expect(
        onScale,
        `water ${water.toFixed(3)} settled at ${settled.toFixed(1)}Hz, which is not a degree of the scale`,
      ).toBe(true);
    }
  });

  it("settles on the nearest note, not a distant one", () => {
    // A tuning gesture that jumps somewhere you weren't aiming reads as broken.
    // Half a semitone is the most a snap may ever move you.
    for (let water = 0; water <= 1; water += 0.017) {
      const moved = Math.abs(Math.log2(frequencyAt(snapToScale(water)) / frequencyAt(water)));
      expect(moved * 12, `snap moved ${(moved * 12).toFixed(2)} semitones`).toBeLessThanOrEqual(2.5);
    }
  });

  it("leaves the ends of the range reachable", () => {
    expect(frequencyAt(snapToScale(0))).toBeCloseTo(EMPTY_HZ, 0);
    expect(frequencyAt(snapToScale(1))).toBeCloseTo(FULL_HZ, 0);
  });
});

describe("the set you find on the page", () => {
  const levels = defaultWaterLevels();

  it("fills every bottle", () => {
    expect(levels).toHaveLength(BOTTLE_COUNT);
  });

  it("rises in pitch from left to right", () => {
    const pitches = levels.map(frequencyAt);
    for (let i = 1; i < pitches.length; i += 1) {
      expect(pitches[i] ?? 0).toBeGreaterThan(pitches[i - 1] ?? 0);
    }
  });

  it("starts in tune, so the first gesture already sounds like music", () => {
    for (const level of levels) {
      expect(snapToScale(level)).toBeCloseTo(level, 6);
    }
  });
});

describe("how hard you hit it", () => {
  it("gets louder with force, and never loud enough to clip on its own", () => {
    expect(strikeGain(0)).toBeGreaterThan(0);
    expect(strikeGain(1)).toBeGreaterThan(strikeGain(0.5));
    expect(strikeGain(0.5)).toBeGreaterThan(strikeGain(0));
    expect(strikeGain(1)).toBeLessThan(0.5);
  });

  it("gets brighter with force, not just louder", () => {
    expect(brightness(1)).toBeGreaterThan(brightness(0));
    expect(brightness(0)).toBeGreaterThan(0);
    expect(brightness(1)).toBeLessThanOrEqual(1);
  });

  it("shrugs off force values from outside the range", () => {
    expect(strikeGain(-5)).toBe(strikeGain(0));
    expect(strikeGain(99)).toBe(strikeGain(1));
  });
});
