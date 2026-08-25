// Blown glass, synthesised. The other half of strike.ts: where a strike is an
// event that schedules its own decay and is forgotten, a blow is a voice that
// stays up until something takes it down.
//
// That difference is the whole risk in this module. Every other sound on the
// page is fire-and-forget, so a dropped reference costs nothing; here a
// dropped reference is a drone that will not stop. The defence is that there
// is only ever ONE voice, held in this module, and starting a second one
// releases the first --- so "stop everything" is always reachable, and a
// missed pointerup can leave at most one note sounding rather than a pile.

import { audioBus, noiseBuffer, wake } from "./audio.ts";

/** Long enough that the attack reads as breath arriving, not as a note switched on. */
const ATTACK_SECONDS = 0.12;
/** The tail after you stop blowing --- air in a vessel does not cut dead. */
const RELEASE_SECONDS = 0.2;
/** Well under a strike's peak: this sits for as long as you hold it. */
const PEAK_GAIN = 0.16;

type Voice = {
  release: () => void;
  bend: (hz: number) => void;
};

let live: Voice | undefined;

/** True while a blown note is sounding. Exposed so a test can hold the teardown. */
export function isBlowing(): boolean {
  return live !== undefined;
}

/**
 * Start blowing at `hz`, releasing whatever was already sounding.
 *
 * One voice at a time is a musical decision as well as a safety one: sweeping
 * across the rims hands this single voice from glass to glass, which glides
 * like a pan flute instead of stacking seven held notes into a chord nobody
 * asked for.
 */
export function startBlow(hz: number): void {
  const ctx = wake();
  const bus = audioBus();
  if (!bus) return;

  stopBlow();

  const now = ctx.currentTime;

  // Breath: white noise through a narrow bandpass at the resonance. This is
  // most of what a blown bottle IS --- turbulent air excited at one frequency
  // --- and it is why there is no contact transient here. The ear decides
  // "struck" from the first few milliseconds, so the surest way to say "not
  // struck" is to have nothing sharp at the front at all.
  const breath = ctx.createBufferSource();
  breath.buffer = noiseBuffer(ctx);
  breath.loop = true;

  const throat = ctx.createBiquadFilter();
  throat.type = "bandpass";
  throat.frequency.value = hz;
  throat.Q.value = 14;

  // A second, much wider band up top: the hiss of air over an edge that never
  // resolves into a pitch. Without it the bandpass alone reads as a synth pad.
  const air = ctx.createBufferSource();
  air.buffer = noiseBuffer(ctx);
  air.loop = true;
  const hiss = ctx.createBiquadFilter();
  hiss.type = "bandpass";
  hiss.frequency.value = Math.min(hz * 7, 8000);
  hiss.Q.value = 0.8;
  const hissLevel = ctx.createGain();
  hissLevel.gain.value = 0.1;

  // A weak sine underneath, only to give the pitch a centre the bandpass
  // cannot quite hold on its own. Loud enough to hear the note, quiet enough
  // that it never becomes the sine-wave whine that pouring used to be.
  const tone = ctx.createOscillator();
  tone.frequency.value = hz;
  const toneLevel = ctx.createGain();
  toneLevel.gain.value = 0.28;

  const env = ctx.createGain();
  env.gain.setValueAtTime(0.0001, now);
  env.gain.exponentialRampToValueAtTime(PEAK_GAIN, now + ATTACK_SECONDS);

  breath.connect(throat).connect(env);
  air.connect(hiss).connect(hissLevel).connect(env);
  tone.connect(toneLevel).connect(env);
  env.connect(bus);

  breath.start(now);
  air.start(now);
  tone.start(now);

  live = {
    bend: (next: number) => {
      const at = ctx.currentTime;
      // setTargetAtTime, not setValueAtTime: pouring while blowing should bend
      // the note the way a hand moves it, and a stepped frequency on a
      // sustained voice clicks audibly at every step.
      throat.frequency.setTargetAtTime(next, at, 0.03);
      hiss.frequency.setTargetAtTime(Math.min(next * 7, 8000), at, 0.03);
      tone.frequency.setTargetAtTime(next, at, 0.03);
    },
    release: () => {
      const at = ctx.currentTime;
      const end = at + RELEASE_SECONDS;
      // cancelScheduledValues first, then re-anchor at the CURRENT value: a
      // release fired mid-attack would otherwise ramp down from a peak the
      // envelope never actually reached, which is an audible swell on a note
      // you just let go of.
      env.gain.cancelScheduledValues(at);
      env.gain.setValueAtTime(Math.max(env.gain.value, 0.0001), at);
      env.gain.exponentialRampToValueAtTime(0.0001, end);
      breath.stop(end + 0.02);
      air.stop(end + 0.02);
      tone.stop(end + 0.02);
    },
  };
}

/** Bend the note that is sounding, if one is. Silent no-op if none is. */
export function bendBlow(hz: number): void {
  live?.bend(hz);
}

/**
 * Take the voice down. Safe to call when nothing is sounding, which is what
 * lets every one of the escape hatches in main.ts call it unconditionally.
 */
export function stopBlow(): void {
  const voice = live;
  live = undefined;
  voice?.release();
}
