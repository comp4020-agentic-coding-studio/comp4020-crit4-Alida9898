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

/**
 * Where a bottle comes to rest. Dragging is free --- you hear every pitch in
 * between, which is the whole point of tuning by ear --- and only the release
 * settles onto a degree. Compare in log space: a semitone is a semitone whether
 * it's down at C4 or up at C6.
 */
export function snapToScale(water: number): number {
  const hz = frequencyAt(water);
  let nearest = DEGREES_HZ[0] ?? FULL_HZ;
  let nearestDistance = Infinity;
  for (const degree of DEGREES_HZ) {
    const distance = Math.abs(Math.log2(hz / degree));
    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearest = degree;
    }
  }
  return waterLevelFor(nearest);
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
