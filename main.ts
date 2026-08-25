// Wiring: gestures and keys in, water levels and sound out.

import { bendBlow, startBlow, stopBlow } from "./blow.ts";
import { strike } from "./strike.ts";
import {
  BOTTLE_COUNT,
  blownFrequencyAt,
  defaultWaterLevels,
  frequencyAt,
  pouredLevel,
  snapToScale,
} from "./tuning.ts";
import { isRimZone, surfaceRadiiAt } from "./vessel.ts";

/** Where the water lives inside the glass artwork, in viewBox units. */
const RIM = 14;
const FLOOR = 112;
const DEPTH = FLOOR - RIM;

/** How far a pointer travels before we decide what gesture it is. */
const INTENT_PX = 6;
/** A full-height drag empties or fills a glass; below that it is proportional. */
const POUR_TRAVEL_PX = 220;

const rack = document.querySelector<HTMLElement>("#rack");
const glasses = [...document.querySelectorAll<HTMLElement>(".glass")];
const water = defaultWaterLevels();

function paint(index: number): void {
  const glass = glasses[index];
  const level = water[index];
  if (!glass || level === undefined) return;

  const height = level * DEPTH;
  const line = FLOOR - height;
  const { rx, ry } = surfaceRadiiAt(line);

  const body = glass.querySelector(".water");
  body?.setAttribute("y", line.toFixed(1));
  body?.setAttribute("height", height.toFixed(1));
  // The ellipse at the waterline is what makes the shape read as a vessel with
  // liquid in it rather than a bar on a chart --- which matters more than it
  // sounds, because the whole design rests on a stranger knowing to tap it.
  // Its rx/ry follow the vessel's own width at this height rather than the
  // rim's --- the wall bulges wider than the rim in the middle and narrows
  // past it near the floor, and a fixed-width ellipse ignored that entirely.
  // Ripples are the same ellipse, twice, spreading from wherever the water
  // actually is, so they get the same treatment.
  for (const selector of [".surface", ".ripple-1", ".ripple-2"]) {
    const ellipse = glass.querySelector(selector);
    ellipse?.setAttribute("cy", line.toFixed(1));
    ellipse?.setAttribute("rx", rx.toFixed(1));
    ellipse?.setAttribute("ry", ry.toFixed(1));
  }
  // The strike bloom goes off at the waterline, so it follows it.
  glass.querySelector(".bloom")?.setAttribute("cy", line.toFixed(1));
  // An empty glass would otherwise keep a full ellipse of water on its floor.
  glass.querySelector(".water-base")?.setAttribute("opacity", level < 0.01 ? "0" : "1");

  glass.setAttribute("aria-valuenow", String(Math.round(level * 100)));
}

/** Restart a one-shot animation. Without the reflow a fast sweep smears into one. */
function replay(glass: HTMLElement, name: string): void {
  glass.classList.remove(name);
  void glass.offsetWidth;
  glass.classList.add(name);
}

/**
 * Every call to this is now a strike the player MADE --- pouring is silent, so
 * there is no longer any such thing as a note the water rang on its way past.
 * `mallet` stays a parameter rather than becoming always-on because `ringing`
 * (the bloom and ripples) and `struck` (the rod) are still separate ideas: the
 * first is the glass responding, the second is the thing that hit it.
 */
function ring(index: number, force: number, hz?: number, quantize = false, mallet = false): void {
  const level = water[index];
  const glass = glasses[index];
  if (level === undefined || !glass) return;

  strike(hz ?? frequencyAt(level), force, quantize);
  replay(glass, "ringing");
  if (mallet) replay(glass, "struck");
}

/** Start (or hand over) the single blown voice, at this glass's air pitch. */
function blowInto(index: number): void {
  const level = water[index];
  const glass = glasses[index];
  if (level === undefined || !glass) return;

  for (const other of glasses) other.classList.remove("blowing");
  startBlow(blownFrequencyAt(level));
  glass.classList.add("blowing");
}

/** Every path out of a blown note, so none of them can leave one sounding. */
function hushBlow(): void {
  stopBlow();
  for (const glass of glasses) glass.classList.remove("blowing");
}

function glassAt(x: number, y: number): number | undefined {
  const hit = document.elementFromPoint(x, y)?.closest<HTMLElement>(".glass");
  const index = hit ? Number(hit.dataset["glass"]) : Number.NaN;
  return Number.isInteger(index) ? index : undefined;
}

/**
 * Rim or body, for a touch at viewport `y` on this glass.
 *
 * Measured against the ART's box rather than the `.glass` div's: the glass is
 * a flex child that stretches to the tallest in the row, so its box is taller
 * than the drawing inside it and a fraction of it would put the boundary
 * somewhere the player cannot see.
 */
function onRim(index: number, y: number): boolean {
  const art = glasses[index]?.querySelector(".glass-art");
  if (!art) return false;
  const box = art.getBoundingClientRect();
  return isRimZone(y - box.top, box.height);
}

// --- Pointer ---------------------------------------------------------------
//
// Tapping and pouring both begin with a finger landing on a glass, so the two
// have to be told apart by which way it moves first: mostly sideways is playing,
// mostly up-and-down is pouring. The decision is made once and then locked --- a
// gesture that keeps changing its mind mid-drag feels broken in a way that is
// very hard to trace back, because nothing errors.

type Gesture = {
  mode: "undecided" | "playing" | "pouring";
  /** Which sound this touch started, decided once by where it landed. */
  voice: "strike" | "blow";
  glass: number;
  startX: number;
  startY: number;
  startLevel: number;
  lastX: number;
  lastAt: number;
};

let gesture: Gesture | undefined;

/** Sweep speed becomes how hard the glasses are hit, in px/ms, softly capped. */
function forceFromSpeed(dx: number, dt: number): number {
  const speed = Math.abs(dx) / Math.max(dt, 8);
  return Math.min(1, 0.25 + speed * 0.45);
}

rack?.addEventListener("pointerdown", (event: PointerEvent) => {
  const index = glassAt(event.clientX, event.clientY);
  if (index === undefined) return;

  // Where you land decides which sound you get, and it is the glass's own
  // affordance doing the explaining: you hit the side of a glass, and you
  // blow across its mouth. Nothing needs a label, and no mode persists to be
  // wrong about later --- the next touch decides again from scratch.
  const voice = onRim(index, event.clientY) ? "blow" : "strike";

  // Touching a glass sounds it, always and immediately --- that is the whole
  // cold-start promise, and making it wait to see if a drag follows would put
  // a delay on the one interaction that must feel instant. `quantize` is a
  // separate, much smaller thing: a ≤80ms nudge onto the hidden pulse, well
  // under what a hand can feel as lag. A blow is never quantised: the nudge
  // exists so a TAP lands on the beat, and 80ms of it on the attack of a note
  // you are holding down is just lag.
  if (voice === "blow") blowInto(index);
  else ring(index, 0.55, undefined, true, true);

  gesture = {
    mode: "undecided",
    voice,
    glass: index,
    startX: event.clientX,
    startY: event.clientY,
    startLevel: water[index] ?? 0,
    lastX: event.clientX,
    lastAt: event.timeStamp,
  };
  rack.setPointerCapture(event.pointerId);
  event.preventDefault();
});

/**
 * The rim looks exactly like the rest of the glass, so with no hint at all
 * nobody finds it: you'd have to touch the top by accident and notice the
 * sound changed. Lighting it under the pointer turns that accident into an
 * invitation. Mouse-only by nature --- a finger has no hover --- so it is a
 * bonus on top of the animations, not the whole answer.
 */
function hint(index: number | undefined, y: number): void {
  for (const [at, glass] of glasses.entries()) {
    glass.classList.toggle("rim-hot", at === index && onRim(at, y));
  }
}

rack?.addEventListener("pointerleave", () => hint(undefined, 0));

rack?.addEventListener("pointermove", (event: PointerEvent) => {
  if (!gesture) {
    hint(glassAt(event.clientX, event.clientY), event.clientY);
    return;
  }
  hint(undefined, 0);

  const dx = event.clientX - gesture.startX;
  const dy = event.clientY - gesture.startY;

  if (gesture.mode === "undecided") {
    if (Math.hypot(dx, dy) < INTENT_PX) return;
    gesture.mode = Math.abs(dy) > Math.abs(dx) ? "pouring" : "playing";
  }

  if (gesture.mode === "pouring") {
    // You are dragging the waterline itself, so it has to end up under your
    // finger. The direction lives in pouredLevel() so a test can hold it.
    const level = pouredLevel(gesture.startLevel, dy, POUR_TRAVEL_PX);
    water[gesture.glass] = level;
    paint(gesture.glass);

    // Pouring itself is SILENT. It is a tuning gesture, not a playing one, and
    // it used to chime at every note the water crossed --- which meant setting
    // the rack up was the loudest thing on the page, and every adjustment
    // announced itself whether or not you wanted to hear it yet. You tune in
    // quiet, then you strike to hear what you built.
    //
    // A held blow is the one exception, and not really an exception: that note
    // is already sounding because your finger is on the rim, so the water
    // moving under it bends what is there rather than starting anything new.
    if (gesture.voice === "blow") bendBlow(blownFrequencyAt(level));
    return;
  }

  const index = glassAt(event.clientX, event.clientY);
  if (index !== undefined && index !== gesture.glass) {
    if (gesture.voice === "blow") {
      // Sweeping the rims hands the single voice along the rack rather than
      // starting a second one, so it glides like a pan flute instead of
      // stacking seven held notes into a chord nobody asked for.
      blowInto(index);
    } else {
      ring(
        index,
        forceFromSpeed(event.clientX - gesture.lastX, event.timeStamp - gesture.lastAt),
        undefined,
        true,
        true,
      );
    }
    gesture.glass = index;
  }
  gesture.lastX = event.clientX;
  gesture.lastAt = event.timeStamp;
});

function release(): void {
  if (!gesture) {
    // Not redundant: a blow started from the keyboard has no gesture, and a
    // pointerup that arrives after one was already cleared must still hush.
    hushBlow();
    return;
  }
  const { mode, voice, glass } = gesture;
  gesture = undefined;

  if (mode === "pouring") {
    // Still snaps to the scale --- the tuning is as correct as it ever was,
    // it just no longer announces itself. The waterline moving to its settled
    // height is the confirmation now, which is why paint() stays.
    water[glass] = snapToScale(water[glass] ?? 0);
    paint(glass);
    // A blow that is still sounding lands on the settled pitch before it goes,
    // rather than being cut off mid-slide.
    if (voice === "blow") bendBlow(blownFrequencyAt(water[glass] ?? 0));
  }

  if (voice === "blow") hushBlow();
}

rack?.addEventListener("pointerup", release);
rack?.addEventListener("pointercancel", release);

// The escape hatches. A strike schedules its own decay and cannot outlive the
// page, but a held blow can, so every way a hand can leave without a
// pointerup gets one: a tab switch, a window losing focus, a pointer capture
// broken by the browser. Each calls the same unconditional hush, because a
// stuck drone with no way to stop it is the worst failure this page has.
window.addEventListener("blur", release);
document.addEventListener("visibilitychange", () => {
  if (document.hidden) release();
});
rack?.addEventListener("lostpointercapture", release);

// --- Keyboard --------------------------------------------------------------
//
// Up and down pour, left and right walk the rack. That is not quite the ARIA
// slider convention (which also wants left/right on the value) but these are
// VERTICAL sliders sitting in a row, so both axes already mean something on
// screen, and matching the screen beats matching the spec sheet here.

document.addEventListener("keydown", (event: KeyboardEvent) => {
  const digit = Number(event.key);
  if (Number.isInteger(digit) && digit >= 1 && digit <= BOTTLE_COUNT) {
    ring(digit - 1, 0.7, undefined, true, true);
    glasses[digit - 1]?.focus();
    return;
  }

  const focused = document.activeElement?.closest<HTMLElement>(".glass");
  if (!focused) return;
  const index = Number(focused.dataset["glass"]);
  if (!Number.isInteger(index)) return;

  // A key has no coordinates, so the rim/body split cannot carry over: blowing
  // needs a binding of its own. `b` holds the note the way the rim does, and
  // `event.repeat` is the guard --- a held key fires keydown over and over,
  // which without this would tear down and restart the voice ~30 times a
  // second and sound like a stutter rather than a held note.
  if (event.key === "b" || event.key === "B") {
    if (!event.repeat) blowInto(index);
    event.preventDefault();
    return;
  }

  const step = event.shiftKey ? 0.01 : 0.04;

  switch (event.key) {
    case "ArrowUp":
    case "ArrowDown": {
      // Up adds water. Matches the drag, and matches the slider contract too:
      // aria-valuenow IS the water level, so an arrow that raised the water
      // while lowering the announced number would be its own bug.
      const direction = event.key === "ArrowUp" ? 1 : -1;
      water[index] = Math.min(1, Math.max(0, (water[index] ?? 0) + direction * step));
      paint(index);
      // Silent, like the drag it mirrors. Enter or Space strikes the glass if
      // you want to hear where the arrows have got you to.
      break;
    }
    case "ArrowLeft":
    case "ArrowRight": {
      const next = index + (event.key === "ArrowRight" ? 1 : -1);
      glasses[Math.min(glasses.length - 1, Math.max(0, next))]?.focus();
      break;
    }
    case "Enter":
    case " ":
      ring(index, 0.7, undefined, true, true);
      break;
    default:
      return;
  }
  event.preventDefault();
});

document.addEventListener("keyup", (event: KeyboardEvent) => {
  if (event.key === "b" || event.key === "B") hushBlow();
});

// The markup ships pre-tuned, but repaint anyway so the two can never disagree.
glasses.forEach((_glass, index) => paint(index));
