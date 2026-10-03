// Limits in-progress caption updates sent to the relay to one per second per line;
// final lines go out at once (research.md R7, free-tier ledger R8).

export function createThrottle({ intervalMs = 1000, now = () => Date.now() } = {}) {
  const lastSent = new Map();   // line id -> time of the last send
  const pending = new Map();    // line id -> newest unsent in-progress caption

  return {
    // Returns the captions to send right now.
    offer(caption) {
      const t = now();
      if (caption.final) {
        pending.delete(caption.id);
        lastSent.delete(caption.id);
        return [caption];
      }
      const last = lastSent.get(caption.id);
      if (last === undefined || t - last >= intervalMs) {
        lastSent.set(caption.id, t);
        pending.delete(caption.id);
        return [caption];
      }
      pending.set(caption.id, caption);
      return [];
    },

    // Returns pending in-progress captions whose interval has passed.
    tick() {
      const t = now();
      const due = [];
      for (const [id, caption] of pending) {
        if (t - lastSent.get(id) >= intervalMs) {
          due.push(caption);
          lastSent.set(id, t);
          pending.delete(id);
        }
      }
      return due;
    },
  };
}
