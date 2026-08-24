// Struck glass, synthesised. Nothing here is a recording --- the spec asks for
// sound made in the page, and spec/instrument.test.ts fails the build if an
// audio file ever ships.

import { brightness, strikeGain } from "./tuning.ts";

/**
 * A glass is INHARMONIC: its partials are not whole-number multiples of the
 * fundamental, which is exactly why it reads as glass and not as an organ pipe.
 * The upper partials also die first --- that short bright flare is the "ting"
 * of the strike itself, and flattening the decays is what makes synthesised
 * percussion sound like a doorbell.
 */
const PARTIALS = [
  { ratio: 1, decay: 2.6, level: 1 },
  { ratio: 2.71, decay: 0.9, level: 0.4 },
  { ratio: 5.43, decay: 0.35, level: 0.18 },
];

let context: AudioContext | undefined;
let bus: DynamicsCompressorNode | undefined;

/** Exposed so a test can assert nothing is running before the first gesture. */
export function isAwake(): boolean {
  return context !== undefined;
}

/**
 * The autoplay policy: no AudioContext exists until the player's first gesture.
 * Building it lazily beats building it at load and resuming later --- a context
 * created before any gesture starts out suspended, and some browsers will not
 * let that one back up on a later gesture.
 */
export function wake(): AudioContext {
  if (!context) {
    const ctx = new AudioContext();
    // Seven glasses can ring at once. Everything routes through a compressor
    // rather than straight to the destination, because clipping is the one
    // sound a listener reads as "broken" rather than "loud".
    const limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = -18;
    limiter.ratio.value = 6;
    limiter.attack.value = 0.003;
    limiter.release.value = 0.25;
    limiter.connect(ctx.destination);
    context = ctx;
    bus = limiter;
  }
  if (context.state === "suspended") void context.resume();
  return context;
}

export function strike(hz: number, force: number): void {
  const ctx = wake();
  if (!bus) return;

  const now = ctx.currentTime;
  const peak = strikeGain(force);
  const bright = brightness(force);

  for (const partial of PARTIALS) {
    const osc = ctx.createOscillator();
    osc.frequency.value = hz * partial.ratio;

    const env = ctx.createGain();
    const level = peak * partial.level * (partial.ratio === 1 ? 1 : bright);
    // A strike is a step, but a literal step is a click. 4ms is the shortest
    // attack that still reads as instantaneous without one.
    env.gain.setValueAtTime(0, now);
    env.gain.linearRampToValueAtTime(level, now + 0.004);
    // Exponential, because that is what a struck body does. The ramp aims just
    // below hearing rather than at zero, which is illegal on an exponential.
    env.gain.exponentialRampToValueAtTime(0.0001, now + partial.decay);

    osc.connect(env).connect(bus);
    osc.start(now);
    osc.stop(now + partial.decay + 0.05);
  }
}

// Pouring used to hold a sustained oscillator that glided with the water. It
// whined --- an OscillatorNode defaults to a sine, and a steady pure tone next
// to a struck, inharmonic, decaying voice is audibly a different instrument.
// Pouring now rings the glass itself on each note it passes (see main.ts), so
// there is only ever one voice on the page.
