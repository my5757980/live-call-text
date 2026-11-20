// Asks for a final result once the speaker has paused (FR-011).
// Found on Chrome 154 (test-log 2026-10-03): English results turn final about 1.4 s after
// speech, but Urdu results only turn final when the recognition session ends, about 14 s
// later. Calling stop() returns the final within about 0.2 s, and the lane restarts at once.
// A final that Chrome sends by itself cancels the request.
//
// Two signs show that someone is still speaking: sound on the line, and text that is still
// changing. The sound check can miss a speaker on a noisy line; it then sees "silence"
// after every word and would end the session again and again (review 2026-11-12). So:
//   - normally: 1.5 s without sound, and the text unchanged for 1 s (late words arrive up
//     to a second after the sound);
//   - when the text keeps changing although no sound was detected: the sound check is not
//     working for this speaker, and only the text decides (unchanged for 2 s).

export function createPauseFinalizer({
  silenceMs = 1500, minLevel = 0.006, maxChars = 600, settleMs = 1000, textIdleMs = 2000,
} = {}) {
  let lastSoundAt = null;
  let lastSampleAt = null;
  let armed = false;          // an in-progress line is waiting for its final
  let pendingLength = 0;
  let lastText = null;
  let lastChangeAt = null;    // when the in-progress text last changed

  return {
    // `now` is on the same clock as sample(); it defaults to the latest sample time.
    onResult({ final, text }, now = lastSampleAt) {
      const value = String(text ?? '');
      armed = !final;
      pendingLength = final ? 0 : value.length;
      if (final) {
        lastText = null;
      } else if (value !== lastText) {
        lastText = value;
        lastChangeAt = now;
      }
    },

    // Returns true when the lane should be finalized now.
    sample(level, now) {
      lastSampleAt = now;
      if (level >= minLevel) lastSoundAt = now;
      if (!armed) return false;
      let due = pendingLength >= maxChars;
      if (!due) {
        const textIdle = lastChangeAt === null ? Infinity : now - lastChangeAt;
        const soundSeen = lastSoundAt !== null
          && (lastChangeAt === null || lastChangeAt - lastSoundAt <= silenceMs);
        due = soundSeen
          ? now - lastSoundAt >= silenceMs && textIdle >= settleMs
          : textIdle >= textIdleMs;
      }
      if (due) {
        armed = false;
        pendingLength = 0;
      }
      return due;
    },
  };
}
