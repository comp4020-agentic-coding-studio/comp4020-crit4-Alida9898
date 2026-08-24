// Wiring: gestures and keys in, water levels and sound out.

import { beginPour, endPour, pourTo, strike } from "./strike.ts";
import { BOTTLE_COUNT, defaultWaterLevels, frequencyAt, snapToScale } from "./tuning.ts";

/** Where the water lives inside the glass artwork, in viewBox units. */
const SURFACE_TOP = 16;
const FLOOR = 156;
const DEPTH = FLOOR - SURFACE_TOP;

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
  const surface = glass.querySelector(".water");
  surface?.setAttribute("y", (FLOOR - height).toFixed(1));
  surface?.setAttribute("height", height.toFixed(1));
  glass.setAttribute("aria-valuenow", String(Math.round(level * 100)));
}

function ring(index: number, force: number): void {
  const level = water[index];
  const glass = glasses[index];
  if (level === undefined || !glass) return;

  strike(frequencyAt(level), force);
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
  // a delay on the one interaction that must feel instant.
  ring(index, 0.55);

  gesture = {
    mode: "undecided",
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

rack?.addEventListener("pointermove", (event: PointerEvent) => {
  if (!gesture) return;

  const dx = event.clientX - gesture.startX;
  const dy = event.clientY - gesture.startY;

  if (gesture.mode === "undecided") {
    if (Math.hypot(dx, dy) < INTENT_PX) return;
    gesture.mode = Math.abs(dy) > Math.abs(dx) ? "pouring" : "playing";
    if (gesture.mode === "pouring") beginPour(frequencyAt(gesture.startLevel));
  }

  if (gesture.mode === "pouring") {
    // Drag down to fill: the water follows the hand, which is the only mapping
    // that survives someone not reading anything.
    const level = Math.min(1, Math.max(0, gesture.startLevel + dy / POUR_TRAVEL_PX));
    water[gesture.glass] = level;
    paint(gesture.glass);
    pourTo(frequencyAt(level));
    return;
  }

  const index = glassAt(event.clientX, event.clientY);
  if (index !== undefined && index !== gesture.glass) {
    ring(index, forceFromSpeed(event.clientX - gesture.lastX, event.timeStamp - gesture.lastAt));
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
  // Free while pouring, in tune once you stop: you hear every pitch on the way
  // so the tuning is done by ear, and the note you land on is still one that
  // belongs with the others.
  water[glass] = snapToScale(water[glass] ?? 0);
  paint(glass);
  endPour();
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
    ring(digit - 1, 0.7);
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
      const direction = event.key === "ArrowDown" ? 1 : -1;
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
      ring(index, 0.7);
      break;
    default:
      return;
  }
  event.preventDefault();
});

// The markup ships pre-tuned, but repaint anyway so the two can never disagree.
glasses.forEach((_glass, index) => paint(index));
