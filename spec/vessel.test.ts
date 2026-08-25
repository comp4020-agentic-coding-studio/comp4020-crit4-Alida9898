import { describe, expect, it } from "vitest";
import { halfWidthAtY, isRimZone, rimBandHeight, surfaceRadiiAt } from "../vessel.ts";

// Contracts, not the exact curve: these say what the vessel must be true of,
// so they survive the wall being redrawn.

describe("the waterline is as wide as the glass actually is here", () => {
  it("matches the rim exactly at the rim, so a full glass is unchanged", () => {
    expect(halfWidthAtY(14)).toBeCloseTo(25, 1);
    expect(surfaceRadiiAt(14).ry).toBeCloseTo(6, 1);
  });

  it("is narrower at the floor than at the rim", () => {
    expect(halfWidthAtY(112)).toBeLessThan(halfWidthAtY(14));
  });

  it("bulges wider in the middle than at either end", () => {
    const middle = halfWidthAtY(63);
    expect(middle).toBeGreaterThan(halfWidthAtY(14));
    expect(middle).toBeGreaterThan(halfWidthAtY(112));
  });

  it("changes smoothly as the waterline moves, not in jumps", () => {
    let previous = halfWidthAtY(14);
    for (let y = 15; y <= 112; y += 1) {
      const width = halfWidthAtY(y);
      expect(Math.abs(width - previous), `jumped between y=${y - 1} and y=${y}`).toBeLessThan(1);
      previous = width;
    }
  });

  it("clamps to the rim or floor outside the vessel's own range", () => {
    expect(halfWidthAtY(0)).toBeCloseTo(halfWidthAtY(14), 6);
    expect(halfWidthAtY(500)).toBeCloseTo(halfWidthAtY(112), 6);
  });

  it("keeps the same squash at every height, so the shape stays one glass", () => {
    const ratio = (y: number) => {
      const { rx, ry } = surfaceRadiiAt(y);
      return ry / rx;
    };
    const rimRatio = ratio(14);
    for (let y = 14; y <= 112; y += 7) {
      expect(ratio(y)).toBeCloseTo(rimRatio, 6);
    }
  });
});

describe("the rim blows and the body strikes", () => {
  // A hit test that is subtly wrong never errors --- the glass just sometimes
  // makes the other sound, which a player reads as a broken instrument rather
  // than as a bug. So the band is held here rather than trusted to a look.

  it("puts the top of the glass on the rim and the middle on the body", () => {
    expect(isRimZone(2, 400)).toBe(true);
    expect(isRimZone(200, 400)).toBe(false);
    expect(isRimZone(399, 400)).toBe(false);
  });

  it("stays a quarter of the glass when the glass is big enough to spare it", () => {
    expect(rimBandHeight(400)).toBeCloseTo(100, 6);
    expect(isRimZone(99, 400)).toBe(true);
    expect(isRimZone(101, 400)).toBe(false);
  });

  it("keeps a finger-sized target on a phone, where a flat fraction would not", () => {
    // The whole reason this is not just `offsetY / height < 0.25`. Measured,
    // not guessed: at the 390x844 marking viewport the art comes out 92px
    // tall, and a quarter of that is 23px --- about half what a finger needs.
    const phone = 92;
    expect(phone * 0.25, "the case this function exists for has gone away").toBeLessThan(28);
    expect(rimBandHeight(phone)).toBeGreaterThanOrEqual(28);
  });

  it("never eats so much of the glass that striking gets hard instead", () => {
    for (const height of [40, 60, 93, 200, 400, 900]) {
      expect(
        rimBandHeight(height) / height,
        `the rim took ${((rimBandHeight(height) / height) * 100).toFixed(0)}% of a ${height}px glass`,
      ).toBeLessThanOrEqual(0.4);
    }
  });

  it("rejects a touch above the glass rather than counting it as the rim", () => {
    expect(isRimZone(-4, 400)).toBe(false);
  });
});
