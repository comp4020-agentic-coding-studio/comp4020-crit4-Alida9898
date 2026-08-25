import { describe, expect, it } from "vitest";
import { halfWidthAtY, surfaceRadiiAt } from "../vessel.ts";

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
