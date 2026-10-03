// "No call sound heard yet" hint (FR-008): shown when no call sound has arrived in the
// first 20 s after Start. Once sound has arrived, a quiet customer is normal, so the
// hint never comes back for that call.

export function createSilenceWatch({ thresholdMs = 20000, minLevel = 0.005 } = {}) {
  let startedAt = null;
  let heard = false;
  return {
    start(now) {
      startedAt = now;
      heard = false;
    },
    sample(level, now) {
      if (startedAt === null) return { showHint: false };
      if (!heard && level >= minLevel) heard = true;
      return { showHint: !heard && now - startedAt >= thresholdMs };
    },
  };
}
