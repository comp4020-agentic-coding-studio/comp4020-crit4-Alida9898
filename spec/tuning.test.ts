import { describe, expect, it } from "vitest";
import {
  BOTTLE_COUNT,
  DEGREES_HZ,
  EMPTY_HZ,
  FULL_HZ,
  blownFrequencyAt,
  brightness,
  defaultWaterLevels,
  degreeIndexAt,
  frequencyAt,
  pouredLevel,
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

describe("blown, the water means the opposite thing", () => {
  // The whole reason blowing earns a place next to striking: it is the same
  // water level read a second time, the other way up. If these two ever ran
  // the same direction the mode would be a change of tone colour and nothing
  // more -- and NOTHING would say so, because both directions play fine.
  it("rings higher the fuller the glass gets", () => {
    for (let water = 0; water < 1; water += 0.05) {
      expect(
        blownFrequencyAt(water + 0.05),
        `filling from ${water.toFixed(2)} lowered the blown pitch — a BLOWN vessel rises as it fills, because it is the air that sounds and there is less of it`,
      ).toBeGreaterThan(blownFrequencyAt(water));
    }
  });

  it("runs opposite the struck mode at every level, not just at the ends", () => {
    for (let water = 0; water < 1; water += 0.05) {
      const struckRose = frequencyAt(water + 0.05) > frequencyAt(water);
      const blownRose = blownFrequencyAt(water + 0.05) > blownFrequencyAt(water);
      expect(blownRose, `both modes moved the same way at water ${water.toFixed(2)}`).toBe(
        !struckRose,
      );
    }
  });

  it("speaks an octave below the struck register, so the two are not one voice", () => {
    // An empty glass is the LOWEST blown note (most air) and the highest
    // struck one, which is the inversion stated as pitch rather than slope.
    expect(blownFrequencyAt(0)).toBeCloseTo(FULL_HZ / 2, 4);
    expect(blownFrequencyAt(1)).toBeCloseTo(EMPTY_HZ / 2, 4);
  });

  it("stays in a range a vessel could plausibly speak in", () => {
    for (let water = 0; water <= 1; water += 0.1) {
      expect(blownFrequencyAt(water)).toBeGreaterThan(100);
      expect(blownFrequencyAt(water)).toBeLessThan(600);
    }
  });

  it("shrugs off levels from outside the range", () => {
    expect(blownFrequencyAt(-5)).toBeCloseTo(blownFrequencyAt(0), 6);
    expect(blownFrequencyAt(99)).toBeCloseTo(blownFrequencyAt(1), 6);
  });

  it("keeps 'no way to play it wrong' true after the switch", () => {
    // Inverting the water level maps the pentatonic onto another mode of
    // itself, so the rack stays consonant blown even though the pitches are
    // a different set from the struck degrees. Held as the property that
    // matters -- no two notes a semitone apart -- rather than against a list.
    const semitones = defaultWaterLevels()
      .map((level) => 12 * Math.log2(blownFrequencyAt(level) / blownFrequencyAt(0)))
      .map((value) => Math.round(value));

    for (const a of semitones) {
      for (const b of semitones) {
        const apart = Math.abs(a - b) % 12;
        expect(
          apart === 1 || apart === 11,
          `blown, two glasses land ${apart} semitone(s) apart — a minor second in the rack means there IS a way to play it wrong`,
        ).toBe(false);
      }
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

describe("the waterline follows the hand", () => {
  // Found by playing it, not by a test: the first version sent the water UP
  // when the hand went DOWN. Both directions animate smoothly and neither
  // errors, so this is here to make sure it can only be found once.
  it("falls when you drag down", () => {
    expect(pouredLevel(0.5, 100, 200)).toBeLessThan(0.5);
  });

  it("rises when you drag up", () => {
    expect(pouredLevel(0.5, -100, 200)).toBeGreaterThan(0.5);
  });

  it("moves the waterline as far as the hand", () => {
    expect(pouredLevel(1, 220, 220)).toBeCloseTo(0, 6);
    expect(pouredLevel(0.5, -55, 220)).toBeCloseTo(0.75, 6);
  });

  it("cannot be dragged out of the glass", () => {
    expect(pouredLevel(0.5, 9999, 220)).toBe(0);
    expect(pouredLevel(0.5, -9999, 220)).toBe(1);
  });
});

// Pouring is silent now --- these no longer describe anything you can hear.
// They still matter: degreeIndexAt is what snapToScale settles a glass with,
// so this is the mapping the tuning gesture lands on, just without the chimes
// it used to announce on the way.
describe("the notes a pour passes through", () => {
  it("walks the scale one note at a time as the glass fills", () => {
    const seen = [];
    for (let water = 0; water <= 1; water += 0.002) seen.push(degreeIndexAt(water));

    const steps = [...new Set(seen)];
    expect(steps, "pouring should pass every note in the scale").toHaveLength(DEGREES_HZ.length);
    // Never skips and never doubles back: filling only ever lowers the pitch.
    for (let i = 1; i < steps.length; i += 1) {
      expect(steps[i]).toBe((steps[i - 1] ?? 0) - 1);
    }
  });

  it("agrees with where the glass settles", () => {
    for (let water = 0; water <= 1; water += 0.03) {
      expect(frequencyAt(snapToScale(water))).toBeCloseTo(DEGREES_HZ[degreeIndexAt(water)] ?? 0, 6);
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
