// How wide the glass actually is at a given height.
//
// The tumbler wall isn't a straight taper --- it bulges out at the belly and
// narrows again toward the floor (see the <clipPath id="vessel-clip"> and
// .wall path in index.html). A waterline ellipse drawn at one fixed width
// copies the rim's own width at every height, which is wrong everywhere the
// wall isn't exactly at the rim. Pure functions only, same reason as
// tuning.ts: no DOM, so spec/vessel.test.ts can hold the curve directly.

/** Centre of every glass, in viewBox units --- half the 70-wide artwork. */
const CENTRE_X = 35;

/**
 * The left wall's cubic Bezier, copied from index.html's `.wall`/
 * `vessel-clip` path (`M10 14 C4 45 4 82 16 112 ...`). Two files describing
 * one curve in two different languages, and nothing keeps them in sync
 * automatically --- if the wall in index.html moves, these points have to
 * move with it, the same way main.ts's RIM/FLOOR already do.
 */
const RIM_Y = 14;
const FLOOR_Y = 112;
const WALL_X = { p0: 10, p1: 4, p2: 4, p3: 16 };
const WALL_Y = { p0: RIM_Y, p1: 45, p2: 82, p3: FLOOR_Y };

/**
 * The rim ellipse's own width and squash --- what the waterline already
 * looked like before this file existed. Every other height's ellipse scales
 * by this same ratio, so a full glass (waterline at the rim) renders exactly
 * as it did before.
 */
const RIM_HALF_WIDTH = 25;
const RIM_SQUASH = 6 / RIM_HALF_WIDTH;

function cubicAt(t: number, p0: number, p1: number, p2: number, p3: number): number {
  const u = 1 - t;
  return u ** 3 * p0 + 3 * u ** 2 * t * p1 + 3 * u * t ** 2 * p2 + t ** 3 * p3;
}

/**
 * How far down the wall's curve (0 at the rim, 1 at the floor) height `y`
 * falls. The curve's y(t) climbs monotonically from rim to floor, so a
 * bisection search always converges --- no closed-form inverse of a cubic
 * needed.
 */
function paramAtY(y: number): number {
  const target = Math.min(FLOOR_Y, Math.max(RIM_Y, y));
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 30; i += 1) {
    const mid = (lo + hi) / 2;
    const midY = cubicAt(mid, WALL_Y.p0, WALL_Y.p1, WALL_Y.p2, WALL_Y.p3);
    if (midY < target) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

/**
 * Half the vessel's true width at height `y`: wider at the belly than the
 * rim, narrower again toward the floor. `y` outside [rim, floor] clamps to
 * whichever end it's past.
 */
export function halfWidthAtY(y: number): number {
  const t = paramAtY(y);
  const x = cubicAt(t, WALL_X.p0, WALL_X.p1, WALL_X.p2, WALL_X.p3);
  return CENTRE_X - x;
}

/**
 * The waterline ellipse's radii at height `y` --- `rx` from the vessel's own
 * width there, `ry` scaled by the rim ellipse's own squash, so the shape at
 * the rim is unchanged and every other height keeps the same proportions.
 */
export function surfaceRadiiAt(y: number): { rx: number; ry: number } {
  const rx = halfWidthAtY(y);
  return { rx, ry: rx * RIM_SQUASH };
}

// --- Where the rim ends and the body begins --------------------------------
//
// The rim blows and the body strikes, so this line decides which sound a
// touch makes. It is deliberately NOT the drawn rim: that ellipse spans y=8
// to y=20 of a 136-unit viewBox, about 9% of the height, which on a phone is
// a target a few pixels tall --- far under the ~44px a finger needs. So the
// zone is generous, and grows relative to the art when the art is small.

/** The rim's share of the glass on a large screen. */
const RIM_BAND = 0.25;
/** Never a target smaller than this, however small the glass is drawn. */
const RIM_FLOOR_PX = 28;
/** ...and never so greedy that the body becomes hard to hit instead. */
const RIM_CEILING = 0.4;

/**
 * How tall the blow zone is, in px, for art drawn `heightPx` tall.
 *
 * Split out from `isRimZone` so the size can be asserted directly: the whole
 * reason this is not a plain fraction is the phone case, where a fraction
 * gives a target too small to hit, and "too small" is a number rather than a
 * behaviour.
 */
export function rimBandHeight(heightPx: number): number {
  return Math.min(heightPx * RIM_CEILING, Math.max(heightPx * RIM_BAND, RIM_FLOOR_PX));
}

/**
 * Does a touch `offsetY` px below the top of the art land on the rim?
 *
 * Pure, and tested, for the same reason `pouredLevel()` is: a hit test that is
 * subtly wrong does not error --- the glass just sometimes makes the other
 * sound, which reads as a broken instrument rather than as a bug with a line
 * number.
 */
export function isRimZone(offsetY: number, heightPx: number): boolean {
  return offsetY >= 0 && offsetY < rimBandHeight(heightPx);
}
