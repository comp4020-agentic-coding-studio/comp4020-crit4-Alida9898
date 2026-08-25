// Water level <-> pitch, and the scale the bottles settle onto when you let go.
//
// Pure functions only: no DOM, no audio. Everything the ear can't check for me
// lives here so spec/tuning.test.ts can.

/**
 * Struck, not blown: the water loads the glass wall, so MORE water rings LOWER.
 * A blown bottle is the other way round --- the air column shortens as it fills.
 * This is the easiest thing in the project to get backwards and it is inaudible
 * as a bug (the instrument still "works", it just lies about water), so the
 * direction is pinned as a test rather than trusted to this comment.
 */
export const EMPTY_HZ = 1046.5; // C6, a dry glass
export const FULL_HZ = 261.6; // C4, two octaves of water

/** 宫商角徵羽 --- the pentatonic scale, as semitones above the tonic. */
const PENTATONIC = [0, 2, 4, 7, 9];

const OCTAVES = Math.round(Math.log2(EMPTY_HZ / FULL_HZ));

/**
 * Every pitch a bottle can settle on, ascending. Pentatonic is what makes "no
 * way to play it wrong" true rather than merely claimed: there is no interval
 * in here that clashes, so any set of bottles, struck in any order, is
 * consonant.
 */
export const DEGREES_HZ: readonly number[] = Array.from(
  { length: OCTAVES + 1 },
  (_unused, octave) => octave,
)
  .flatMap((octave) => PENTATONIC.map((semitone) => octave * 12 + semitone))
  .map((semitone) => FULL_HZ * 2 ** (semitone / 12))
  .filter((hz) => hz <= EMPTY_HZ + 0.5)
  .concat(EMPTY_HZ)
  .sort((a, b) => a - b);

export const BOTTLE_COUNT = 7;

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

/** Pitch is logarithmic, so water has to be too, or the top of the range is all one note. */
export function frequencyAt(water: number): number {
  return EMPTY_HZ * (FULL_HZ / EMPTY_HZ) ** clamp01(water);
}

/** The inverse: how full a bottle has to be to ring at this pitch. */
export function waterLevelFor(hz: number): number {
  return clamp01(Math.log(hz / EMPTY_HZ) / Math.log(FULL_HZ / EMPTY_HZ));
}

/** How far below the struck register a blown glass speaks. One octave. */
export const BLOWN_OCTAVES_DOWN = 1;

/**
 * Blown across the rim instead of struck, so the pitch runs the OTHER WAY:
 * more water rings HIGHER.
 *
 * Both standard models of a blown bottle agree, and both say the same thing:
 * as a Helmholtz resonator `f` goes as `1/sqrt(V)` where `V` is the *air*
 * above the water, and as a stopped pipe `f = v/4L` where `L` is the air
 * column's length. Either way it is the air that sounds, not the glass, so
 * adding water shortens what is ringing and the note goes up.
 *
 * Which is why this is `frequencyAt(1 - water)`: the `1 - water` is not an
 * algebraic trick to flip the curve, it is literally the air fraction, and
 * the struck curve read against air instead of water is already the blown
 * one. The octave down is a choice rather than physics --- a blown bottle is
 * a low woody note next to a bright ping, and sharing the struck register
 * would make the two modes sound like one instrument with a filter on it.
 *
 * This direction is the easiest thing in the project to get backwards and it
 * is inaudible as a bug (an instrument tuned backwards still plays, it just
 * lies about water), so spec/tuning.test.ts holds it against `frequencyAt`
 * rather than leaving it to this comment.
 */
export function blownFrequencyAt(water: number): number {
  return frequencyAt(1 - clamp01(water)) / 2 ** BLOWN_OCTAVES_DOWN;
}

/**
 * Which note this water level is closest to. Compared in log space, because a
 * semitone is a semitone whether it's down at C4 or up at C6.
 *
 * Pouring rings the glass each time this changes, which is the only honest
 * feedback to give: the pitches in between are ones the glass cannot keep, so
 * gliding through them promises something the instrument does not do.
 */
export function degreeIndexAt(water: number): number {
  const hz = frequencyAt(water);
  let nearest = 0;
  let nearestDistance = Infinity;
  DEGREES_HZ.forEach((degree, index) => {
    const distance = Math.abs(Math.log2(hz / degree));
    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearest = index;
    }
  });
  return nearest;
}

/**
 * Where the waterline ends up after a drag of `dy` pixels (positive is DOWN the
 * screen) starting from `startLevel`.
 *
 * A one-line sum, pulled out here only so its direction can be held by a test.
 * The first version added dy instead of subtracting it, so the surface fled
 * upward from a downward hand --- and nothing catches that but a hand, because
 * both versions animate smoothly and neither errors.
 */
export function pouredLevel(startLevel: number, dy: number, travel: number): number {
  return clamp01(startLevel - dy / travel);
}

/** Where a glass comes to rest when you take your hand off it. */
export function snapToScale(water: number): number {
  return waterLevelFor(DEGREES_HZ[degreeIndexAt(water)] ?? FULL_HZ);
}

/**
 * The set you find on the page. An ascending pentatonic run, so the first thing
 * a stranger does --- drag a hand across the row --- already sounds like music.
 * Ascending pitch means descending water, which reads left-to-right as a
 * staircase and quietly tells you what the water is for.
 */
export function defaultWaterLevels(): number[] {
  return DEGREES_HZ.slice(0, BOTTLE_COUNT).map(waterLevelFor);
}

/** Peak gain for one strike. Kept well under 1: seven of these can overlap. */
export function strikeGain(force: number): number {
  return 0.06 + 0.34 * clamp01(force) ** 1.6;
}

/**
 * How much of the upper, inharmonic partials a strike gets. A hard strike on
 * glass is not just a loud soft strike --- it is brighter, and leaving this
 * fixed is what makes synthesised percussion sound like a volume knob.
 */
export function brightness(force: number): number {
  return 0.25 + 0.75 * clamp01(force);
}
