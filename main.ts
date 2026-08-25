// Wiring: gestures and keys in, water levels and sound out.

import { strike } from "./strike.ts";
import {
  BOTTLE_COUNT,
  DEGREES_HZ,
  defaultWaterLevels,
  degreeIndexAt,
  frequencyAt,
  pouredLevel,
  snapToScale,
} from "./tuning.ts";

/** Where the water lives inside the glass artwork, in viewBox units. */
const RIM = 16;
const FLOOR = 164;
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

  const body = glass.querySelector(".water");
  body?.setAttribute("y", line.toFixed(1));
  body?.setAttribute("height", height.toFixed(1));
  // The ellipse at the waterline is what makes the shape read as a vessel with
  // liquid in it rather than a bar on a chart --- which matters more than it
  // sounds, because the whole design rests on a stranger knowing to tap it.
  glass.querySelector(".surface")?.setAttribute("cy", line.toFixed(1));
  // The strike bloom goes off at the waterline, so it follows it.
  glass.querySelector(".bloom")?.setAttribute("cy", line.toFixed(1));
  // An empty glass would otherwise keep a full ellipse of water on its floor.
  glass.querySelector(".water-base")?.setAttribute("opacity", level < 0.01 ? "0" : "1");

  glass.setAttribute("aria-valuenow", String(Math.round(level * 100)));
}

function ring(index: number, force: number, hz?: number, quantize = false): void {
  const level = water[index];
  const glass = glasses[index];
  if (level === undefined || !glass) return;

  strike(hz ?? frequencyAt(level), force, quantize);
  // A struck glass shivers. Restarting the animation means a fast sweep flashes
  // each glass separately instead of one long smear.
  glass.classList.remove("ringing");
  void glass.offsetWidth;
  glass.classList.add("ringing");
}

function glassAt(x: number, y: number): number | undefined {
  const hit = document.elementFromPoint(x, y)?.closest<HTMLElement>(".glass");
  const index = hit ? Number(hit.dataset["glass"]) : Number.NaN;
  return Number.isInteger(index) ? index : undefined;
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
  glass: number;
  startX: number;
  startY: number;
  startLevel: number;
  lastX: number;
  lastAt: number;
  lastDegree: number;
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

  // Touching a glass rings it, always and immediately --- that is the whole
  // cold-start promise, and making it wait to see if a drag follows would put
  // a delay on the one interaction that must feel instant. `quantize` is a
  // separate, much smaller thing: a ≤80ms nudge onto the hidden pulse, well
  // under what a hand can feel as lag.
  ring(index, 0.55, undefined, true);

  gesture = {
    mode: "undecided",
    glass: index,
    startX: event.clientX,
    startY: event.clientY,
    startLevel: water[index] ?? 0,
    lastX: event.clientX,
    lastAt: event.timeStamp,
    lastDegree: degreeIndexAt(water[index] ?? 0),
  };
  rack.setPointerCapture(event.pointerId);
  event.preventDefault();
});

rack?.addEventListener("pointermove", (event: PointerEvent) => {
  if (!gesture) return;

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

    // Ring on each note the water passes, in the glass's own voice.
    const degree = degreeIndexAt(level);
    if (degree !== gesture.lastDegree) {
      gesture.lastDegree = degree;
      ring(gesture.glass, 0.3, DEGREES_HZ[degree]);
    }
    return;
  }

  const index = glassAt(event.clientX, event.clientY);
  if (index !== undefined && index !== gesture.glass) {
    ring(
      index,
      forceFromSpeed(event.clientX - gesture.lastX, event.timeStamp - gesture.lastAt),
      undefined,
      true,
    );
    gesture.glass = index;
  }
  gesture.lastX = event.clientX;
  gesture.lastAt = event.timeStamp;
});

function release(): void {
  if (!gesture) return;
  const { mode, glass } = gesture;
  gesture = undefined;

  if (mode !== "pouring") return;
  // Settles onto the last note it rang, so the snap confirms what you just
  // heard instead of surprising you with somewhere you never went.
  water[glass] = snapToScale(water[glass] ?? 0);
  paint(glass);
  ring(glass, 0.5);
}

rack?.addEventListener("pointerup", release);
rack?.addEventListener("pointercancel", release);

// --- Keyboard --------------------------------------------------------------
//
// Up and down pour, left and right walk the rack. That is not quite the ARIA
// slider convention (which also wants left/right on the value) but these are
// VERTICAL sliders sitting in a row, so both axes already mean something on
// screen, and matching the screen beats matching the spec sheet here.

document.addEventListener("keydown", (event: KeyboardEvent) => {
  const digit = Number(event.key);
  if (Number.isInteger(digit) && digit >= 1 && digit <= BOTTLE_COUNT) {
    ring(digit - 1, 0.7, undefined, true);
    glasses[digit - 1]?.focus();
    return;
  }

  const focused = document.activeElement?.closest<HTMLElement>(".glass");
  if (!focused) return;
  const index = Number(focused.dataset["glass"]);
  if (!Number.isInteger(index)) return;

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
      ring(index, 0.4);
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
      ring(index, 0.7, undefined, true);
      break;
    default:
      return;
  }
  event.preventDefault();
});

// The markup ships pre-tuned, but repaint anyway so the two can never disagree.
glasses.forEach((_glass, index) => paint(index));
