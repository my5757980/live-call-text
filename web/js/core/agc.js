// Automatic gain for the recognition path (test-log Finding 7). Soft speech is raised
// towards a steady level, so Chrome's speech service hears it as clearly as normal
// speech (soft English went from 50% to 94% of words with a boost). The gain is held
// during silence and noise, and dropped quickly when someone speaks loudly; peaks above
// the target are handled by a compressor in the audio graph. Also tells speech from
// background noise (a simple voice-activity check with an adaptive noise floor).

export function createAgc({
  target = 0.1,        // speech RMS to aim for, about -20 dBFS (the normal test clips)
  maxGain = 40,        // at most +32 dB
  minGain = 1,         // never turns speech down; the compressor limits peaks
  absMin = 0.0002,     // RMS below this is silence, whatever the noise floor
  noiseRatio = 3,      // speech must be this many times above the noise floor
} = {}) {
  // The noise floor starts low and rises slowly, so a call that starts mid-sentence is
  // still heard as speech; steady background noise is learned within a few seconds.
  let floor = absMin;  // background-noise level
  let level = null;    // recent speech level
  let gain = 1;

  return {
    // rms: input level before the gain; dtMs: time since the last update.
    update(rms, dtMs = 100) {
      if (rms < floor) floor += (rms - floor) * 0.5;                       // follows quiet quickly
      else floor += (rms - floor) * Math.min(1, dtMs / 10000);             // rises over ~10 s

      const speech = rms > absMin && rms > floor * noiseRatio;
      if (speech) {
        level = level === null ? rms : level + (rms - level) * (rms > level ? 0.5 : 0.05);
        const desired = Math.min(maxGain, Math.max(minGain, target / level));
        gain += (desired - gain) * (desired < gain ? 0.6 : 0.15);          // down fast, up gently
      }
      return { gain, speech };
    },
    get gain() { return gain; },
  };
}
