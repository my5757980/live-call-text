// Detects a silently stuck recognition session (test-log Findings 6 and 9): someone has
// been speaking for `soundMs` and the session has made no progress in that time. The lane
// is then restarted. A cooldown stops repeated restarts during long non-speech noise.
//
// A quicker trigger (1.2 s without new results mid-speech) was tried for fast English
// (Finding 8). It cut working sessions short and made results worse, so it was removed.

// Three restarts in a row with no progress in between mean the speech service is not
// responding at all; `stuck` then lets the page say so (review 2026-11-20).

export function createStallWatch({
  soundMs = 3000, minLevel = 0.006, gapMs = 1000, cooldownMs = 8000, stuckAfter = 3,
} = {}) {
  let streakStart = null;       // start of the current stretch of sound
  let lastSoundAt = null;
  let lastResultAt = -Infinity;
  let lastKey;
  let lastRestartAt = -Infinity;
  let fruitless = 0;            // restarts since the last progress

  return {
    // `key` says what the result was (its line and text). A stuck session can keep sending
    // the same words, so a result that repeats the last one is not progress.
    onResult(now, key) {
      if (key !== undefined && key === lastKey) return;
      lastKey = key;
      lastResultAt = now;
      fruitless = 0;
    },

    get stuck() { return fruitless >= stuckAfter; },

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
        fruitless++;
        return true;
      }
      return false;
    },
  };
}
