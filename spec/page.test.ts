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
    // Held as relationships between the glasses rather than against numbers
    // copied out of the artwork, so the glass can be redrawn without this going
    // stale: they must agree on where the floor is, and each must fill in
    // proportion to the level it announces.
    const drawn = glasses.map((glass) => {
      const body = glass.querySelector(".water");
      const surface = glass.querySelector(".surface");
      expect(body, "a glass with no water to draw").not.toBeNull();
      expect(surface, "a glass with no waterline — it would read as a bar chart").not.toBeNull();

      const height = attr(body!, "height");
      const line = attr(body!, "y");
      // The lit ellipse has to sit exactly on top of the water, or the glass
      // looks like it is leaking.
      expect(attr(surface!, "cy"), "the waterline is drawn away from the water").toBeCloseTo(line, 1);

      return { floor: line + height, height, level: attr(glass, "aria-valuenow") };
    });

    const [first] = drawn;
    // Glass 1 is full, so its height IS the scale. Compared in viewBox units
    // rather than as a ratio: aria-valuenow is a whole percent, so the ratio
    // wobbles by more at the shallow end than a tight tolerance allows, while
    // the drawn error stays well under a unit either way.
    const perLevel = first!.height / first!.level;

    for (const glass of drawn) {
      expect(glass.floor, "this glass has a different floor to the others").toBeCloseTo(first!.floor, 1);
      expect(
        Math.abs(glass.height - perLevel * glass.level),
        "the water is drawn at a different level to the one announced",
      ).toBeLessThan(1);
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
