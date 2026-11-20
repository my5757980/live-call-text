// Calls `fn` about every `ms` milliseconds, also while the page is hidden.
//
// The agent page is often hidden behind WhatsApp or the dialer. Chrome then slows the
// page's own timers to once a second (measured on Chrome 157, 2026-11-20), and may slow
// them further after 5 minutes. The 100 ms checks (pause, stall and echo checks, the
// automatic gain) would then stop working, so their ticks come from a worker, whose timers
// keep their pace. If no worker can be started, the page's own timer is used.

const defaultWorker = () => new Worker(new URL('./tick-worker.js', import.meta.url));

export function startTicker(fn, ms, {
  createWorker = defaultWorker, setIntervalImpl = setInterval, clearIntervalImpl = clearInterval,
} = {}) {
  let stopped = false;
  let ticked = false;
  let fallback = null;
  let worker = null;

  const useTimer = () => {
    if (!stopped && fallback === null) fallback = setIntervalImpl(() => { if (!stopped) fn(); }, ms);
  };

  try {
    worker = createWorker();
  } catch {
    worker = null;
  }
  if (worker) {
    worker.onmessage = () => {
      if (stopped) return;
      ticked = true;
      fn();
    };
    worker.onerror = () => {
      if (ticked || stopped) return;   // it worked before: keep it
      try { worker.terminate(); } catch { /* already gone */ }
      useTimer();
    };
    worker.postMessage({ ms });
  } else {
    useTimer();
  }

  return () => {
    stopped = true;
    if (fallback !== null) clearIntervalImpl(fallback);
    try { worker?.terminate(); } catch { /* already gone */ }
  };
}
