import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { JSDOM } from "jsdom";
import { describe, expect, it } from "vitest";

// The published spec for C4 "An instrument", turned into the checks a machine can
// hold. These read the built site, because the built site is what gets marked.
//
// What is NOT here, because no test can hold it — these are mine to answer at the
// crit, out loud, with the pod already having played the thing:
//
//   - "it is expressive": that two players sound *different in a way that matters*
//     is a judgement about music, not about parameters. The test below only holds
//     the mechanical floor — more than one axis of control.
//   - "a stranger can play it uninstructed": the test holds that the opening screen
//     is short enough to be an invitation rather than a manual. Whether it actually
//     invites is what the pod's first thirty seconds decide.
//   - latency and feel, and whether a gesture is expressive or just exhausting.
//   - "you can account for how you directed, grounded and corrected the work".

const dist = resolve("dist");
const shipped = readFileSync(resolve(dist, "index.html"), "utf8");
const doc = new JSDOM(shipped).window.document;

/** Everything the browser actually runs, concatenated. */
const bundles = readdirSync(resolve(dist, "assets"))
  .filter((name) => name.endsWith(".js"))
  .map((name) => readFileSync(resolve(dist, "assets", name), "utf8"))
  .join("\n");

describe("the browser is the instrument — sound is made live, not played back", () => {
  it("ships no audio files to play back", () => {
    const audio = readdirSync(dist, { recursive: true })
      .map(String)
      .filter((name) => /\.(mp3|wav|ogg|m4a|flac|aac|webm)$/i.test(name));
    expect(
      audio,
      `the site ships recorded audio (${audio.join(", ")}) — the spec asks for sound made in the page, not played back`,
    ).toEqual([]);
  });

  it("has no <audio> element to press play on", () => {
    expect(
      doc.querySelectorAll("audio").length,
      "an <audio> element is a player, not an instrument",
    ).toBe(0);
  });

  it("synthesises through the Web Audio API", () => {
    expect(
      /AudioContext/.test(bundles),
      "nothing in the shipped script reaches for an AudioContext, so the page cannot be making sound",
    ).toBe(true);
  });
});

describe("playable with whatever is at hand", () => {
  it("listens for pointer input, which is mouse and touch at once", () => {
    expect(
      /pointer(down|move|up)/.test(bundles),
      "no pointer listener in the shipped script — a mousedown-only instrument is silent on a phone, and the phone viewport counts in full",
    ).toBe(true);
  });

  it("listens for the keyboard", () => {
    expect(
      /key(down|up)/.test(bundles),
      "no keyboard listener in the shipped script — the spec asks for mouse, keyboard or touch, and the keyboard is also the accessible route in",
    ).toBe(true);
  });
});

describe("it is expressive", () => {
  // The mechanical floor only: one control that can only be on or off makes every
  // player sound the same. Two axes is the minimum for "two players sound
  // different"; whether the difference is worth hearing is the pod's call.
  it("gives the player more than one thing to vary", () => {
    const axes = doc.querySelectorAll(
      '[data-axis], input[type="range"], [role="slider"], [contenteditable], canvas, svg',
    );
    expect(
      axes.length,
      "found fewer than two continuous controls (range inputs, sliders, or a surface marked data-axis) — with one on/off control every player sounds the same",
    ).toBeGreaterThan(1);
  });
});

describe("there is no way to play it wrong", () => {
  it("keeps score of nothing and fails no one", () => {
    const text = doc.body.textContent ?? "";
    const forbidden = text.match(/\b(score|game over|you lose|you win|wrong|incorrect|try again|failed|attempts? left|lives)\b/i);
    expect(
      forbidden?.[0],
      `the page says "${forbidden?.[0]}" — the spec asks for no score and no fail state`,
    ).toBeUndefined();
  });
});

describe("a stranger can play it uninstructed", () => {
  // Not a proof that the opening invites — a proof that it doesn't *explain*. An
  // instrument that needs a paragraph read before the first sound has already lost
  // the pod's first thirty seconds. Tune the budget if the page earns it.
  const READING_BUDGET = 200;

  it("opens with an invitation, not a manual", () => {
    const opening = (doc.body.textContent ?? "").replace(/\s+/g, " ").trim();
    expect(
      opening.length,
      `the opening screen carries ${opening.length} characters of text; over ${READING_BUDGET} it is a manual, and the pod plays before it reads`,
    ).toBeLessThanOrEqual(READING_BUDGET);
  });

  it("puts something to act on in the markup, not only after a script runs", () => {
    const affordance = doc.querySelector(
      'button, input, [role="button"], [role="slider"], [tabindex]:not([tabindex="-1"]), canvas, svg',
    );
    expect(
      affordance,
      "the shipped HTML offers nothing to touch before the script runs, so a slow or failed load is a blank page",
    ).not.toBeNull();
  });
});
