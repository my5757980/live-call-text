// Detects a silently stuck recognition session (test-log Finding 6): someone has been
// speaking for `soundMs` and the session has sent no result in that time. The lane is
// then restarted. A cooldown stops repeated restarts during long non-speech noise.
//
// A quicker trigger (1.2 s without new results mid-speech) was tried for fast English
// (Finding 8). It cut working sessions short and made results worse, so it was removed.

export function createStallWatch({ soundMs = 3000, minLevel = 0.006, gapMs = 1000, cooldownMs = 8000 } = {}) {
  let streakStart = null;       // start of the current stretch of sound
  let lastSoundAt = null;
  let lastResultAt = -Infinity;
  let lastRestartAt = -Infinity;

  return {
    onResult(now) {
      lastResultAt = now;
    },

    // Returns true when the lane should be restarted now.
    sample(level, now) {
      if (level >= minLevel) {
        if (streakStart === null || now - lastSoundAt > gapMs) streakStart = now;
        lastSoundAt = now;
      }
      if (streakStart === null || now - lastSoundAt > gapMs) return false;
      const silentFor = lastSoundAt - Math.max(streakStart, lastResultAt);
      if (silentFor >= soundMs && now - lastRestartAt >= cooldownMs) {
        lastRestartAt = now;
        streakStart = null;
        return true;
      }
      return false;
    },
  };
}
