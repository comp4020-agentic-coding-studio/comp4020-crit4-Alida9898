import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { JSDOM } from "jsdom";
import { describe, expect, it } from "vitest";
import { BOTTLE_COUNT, defaultWaterLevels } from "../tuning.ts";

// The glasses are hand-written into index.html so there is something to touch
// before any script runs. That is only worth doing if the no-script state tells
// the truth, so these hold the shipped markup against the tuning it claims.

const doc = new JSDOM(readFileSync(resolve("dist/index.html"), "utf8")).window.document;
const glasses = [...doc.querySelectorAll(".glass")];

function attr(element: Element, name: string): number {
  return Number(element.getAttribute(name));
}

describe("the rack you get before the script runs", () => {
  it("ships every glass", () => {
    expect(glasses).toHaveLength(BOTTLE_COUNT);
  });

  it("ships them already in tune", () => {
    const shipped = glasses.map((glass) => attr(glass, "aria-valuenow"));
    const intended = defaultWaterLevels().map((level) => Math.round(level * 100));
    expect(
      shipped,
      "the hand-written markup has drifted from defaultWaterLevels() — the page a stranger loads is not the instrument the code thinks it is",
    ).toEqual(intended);
  });

  it("draws the water where it says the water is", () => {
    // Checked as a relationship rather than against copied constants, so the
    // artwork can be redrawn without this going stale: every glass must agree
    // on where its floor is, and fill in proportion to the value it announces.
    const ratios = glasses.map((glass) => {
      const surface = glass.querySelector(".water");
      expect(surface, "a glass with no water to draw").not.toBeNull();
      if (!surface) return 0;

      const level = attr(glass, "aria-valuenow");
      const height = attr(surface, "height");
      expect(attr(surface, "y") + height, "this glass has a different floor to the others").toBeCloseTo(156, 1);
      return level === 0 ? Number.NaN : height / level;
    });

    for (const ratio of ratios.filter((value) => !Number.isNaN(value))) {
      expect(ratio, "the water heights are not proportional to the announced levels").toBeCloseTo(1.4, 1);
    }
  });

  it("names each glass for a screen reader, and makes it a value they can change", () => {
    for (const glass of glasses) {
      expect(glass.getAttribute("aria-label")?.trim()).toBeTruthy();
      expect(glass.getAttribute("role")).toBe("slider");
      expect(glass.getAttribute("tabindex")).toBe("0");
      expect(attr(glass, "aria-valuemin")).toBe(0);
      expect(attr(glass, "aria-valuemax")).toBe(100);
    }
  });
});
