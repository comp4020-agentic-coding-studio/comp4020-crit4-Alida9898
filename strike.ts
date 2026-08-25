// Struck glass, synthesised. Nothing here is a recording --- the spec asks for
// sound made in the page, and spec/instrument.test.ts fails the build if an
// audio file ever ships.

import { audioBus, noiseBuffer, wake } from "./audio.ts";
import { BEAT_SECONDS, MAX_NUDGE_SECONDS, quantizedDelay } from "./rhythm.ts";
import { brightness, strikeGain } from "./tuning.ts";

export { isAwake, wake } from "./audio.ts";

/**
 * A glass is INHARMONIC: its partials are not whole-number multiples of the
 * fundamental, which is exactly why it reads as glass and not as an organ pipe.
 * The upper partials also die first --- that short bright flare is the "ting"
 * of the strike itself, and flattening the decays is what makes synthesised
 * percussion sound like a doorbell.
 */
const PARTIALS = [
  { ratio: 1, decay: 2.4, level: 1 },
  { ratio: 2.71, decay: 1.1, level: 0.42 },
  { ratio: 4.32, decay: 0.55, level: 0.22 },
  { ratio: 5.43, decay: 0.28, level: 0.13 },
];

/**
 * `quantize` pulls a strike onto the hidden beat by up to `MAX_NUDGE_SECONDS`
 * — see rhythm.ts. Only a struck note (a tap, a sweep, a key) asks for it;
 * pouring's own chimes are tied to the hand still moving, so they stay
 * un-nudged rather than fighting a grid the player never asked for.
 */
export function strike(hz: number, force: number, quantize = false): void {
  const ctx = wake();
  const bus = audioBus();
  if (!bus) return;

  const rawNow = ctx.currentTime;
  const now = quantize ? rawNow + quantizedDelay(rawNow, BEAT_SECONDS, MAX_NUDGE_SECONDS) : rawNow;
  const peak = strikeGain(force);
  const bright = brightness(force);

  // The contact transient: the few milliseconds of the spoon actually touching
  // the glass, before anything has begun to ring. Without it the partials fade
  // up out of silence and the ear hears a tone appearing rather than an object
  // being hit -- which is why the first version sounded synthesised no matter
  // how the partials were tuned. This, not the ratios, is what says "struck".
  const tap = ctx.createBufferSource();
  tap.buffer = noiseBuffer(ctx);
  const colour = ctx.createBiquadFilter();
  colour.type = "bandpass";
  colour.frequency.value = Math.min(hz * 6, 9000);
  colour.Q.value = 1.1;
  const tapEnv = ctx.createGain();
  tapEnv.gain.setValueAtTime(peak * 0.55 * bright, now);
  tapEnv.gain.exponentialRampToValueAtTime(0.0001, now + 0.03);
  tap.connect(colour).connect(tapEnv).connect(bus);
  tap.start(now);
  tap.stop(now + 0.1);

  for (const partial of PARTIALS) {
    const osc = ctx.createOscillator();
    osc.frequency.value = hz * partial.ratio;
    // No two taps on a real glass are identical. A few cents of scatter stops
    // a fast sweep sounding like the same sample seven times.
    osc.detune.value = (Math.random() - 0.5) * 9;

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
