// The one AudioContext, its output bus, and the noise both voices are built
// from. Split out of strike.ts when blowing arrived: two voices that each made
// their own context would be two instruments the limiter could not balance
// against each other, and the second one would start out suspended.

let context: AudioContext | undefined;
let bus: DynamicsCompressorNode | undefined;
let noise: AudioBuffer | undefined;

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
    // Seven glasses can ring at once, and a held blow sits under all of them.
    // Everything routes through a compressor rather than straight to the
    // destination, because clipping is the one sound a listener reads as
    // "broken" rather than "loud".
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

/** Where every voice connects. Undefined only before the first `wake()`. */
export function audioBus(): DynamicsCompressorNode | undefined {
  return bus;
}

/**
 * White noise, made once and re-used --- the contact tap of a strike and the
 * breath of a blow are both this buffer, filtered differently.
 *
 * Two seconds, not the 0.1s the strike alone needed: the blow loops it, and a
 * short loop is periodic, which the ear hears as a buzz at the loop rate rather
 * than as air.
 */
export function noiseBuffer(ctx: AudioContext): AudioBuffer {
  if (!noise) {
    const length = Math.floor(ctx.sampleRate * 2);
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const samples = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) samples[i] = Math.random() * 2 - 1;
    noise = buffer;
  }
  return noise;
}
