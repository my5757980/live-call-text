// Asks for a final result once the speaker has paused (FR-011).
// Found on Chrome 154 (test-log 2026-10-03): English results turn final about 1.4 s after
// speech, but Urdu results only turn final when the recognition session ends, about 14 s
// later. Calling stop() returns the final within about 0.2 s, and the lane restarts at once.
// A final that Chrome sends by itself cancels the request, so English is rarely touched.

export function createPauseFinalizer({ silenceMs = 1500, minLevel = 0.006, maxChars = 600 } = {}) {
  let lastSoundAt = null;
  let armed = false;          // an in-progress line is waiting for its final
  let pendingLength = 0;

  return {
    onResult({ final, text }) {
      armed = !final;
      pendingLength = final ? 0 : String(text ?? '').length;
    },

    // Returns true when the lane should be finalized now.
    sample(level, now) {
      if (level >= minLevel) lastSoundAt = now;
      if (!armed) return false;
      const paused = lastSoundAt !== null && now - lastSoundAt >= silenceMs;
      if (paused || pendingLength >= maxChars) {
        armed = false;
        pendingLength = 0;
        return true;
      }
      return false;
    },
  };
}
