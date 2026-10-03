// Runs Chrome's SpeechRecognition for one side of the call, fed by an audio track
// (research.md R1, R5). Restart, pause and retry decisions come from core/lane-policy.js.
import { decide, initialLane, HEALTHY_AFTER_MS } from '../core/lane-policy.js';
import { summarizeResults } from '../core/transcript.js';

// If Chrome never sends `end` after abort()/stop() (seen when abort() comes before the
// session's `start` event), the runner replaces the session itself after this long.
const END_WATCHDOG_MS = 1500;

export function createLaneRunner({ side, track, lang, onResult, onState, onDebug, win = window }) {
  const Recognition = win.SpeechRecognition || win.webkitSpeechRecognition;
  let lane = initialLane(lang);
  let recognition = null;
  let running = false;
  let session = 0;
  let timer = null;
  let endWatchdog = null;
  let stopped = false;
  let restartAfterEnd = false;   // we aborted on purpose and want a fresh start
  let flushPending = null;       // turns the current session's unfinished text into a final line

  const report = (message) => onState?.({ side, ...lane, message });
  const debug = (what, extra = {}) => onDebug?.({ at: Date.now(), side, what, session, running, ...extra });

  function apply(event) {
    const d = decide(lane, event);
    debug('decide', { ev: event.type, err: event.error, action: d.action, delay: d.delayMs, state: d.state });
    lane = { state: d.state, retryStep: d.retryStep, pauseReason: d.pauseReason, lang: d.lang, offline: d.offline };
    report(d.message);
    if (d.action === 'restart') restart(d.delayMs);
    else if (d.action === 'stop') teardown();
  }

  // Ends the running session on purpose ('abort' drops pending text, 'stop' returns it as
  // final) and starts a new one as soon as `end` arrives, or after the watchdog.
  function endForRestart(method) {
    const rec = recognition;
    debug('endForRestart', { method });
    restartAfterEnd = true;
    try { rec[method](); } catch { /* already ending */ }
    clearTimeout(endWatchdog);
    endWatchdog = setTimeout(() => {
      if (stopped || recognition !== rec || !running) return;
      debug('watchdog');
      flushPending?.();
      try { rec.abort(); } catch { /* ignore */ }
      running = false;
      restartAfterEnd = false;
      recognition = null;          // late events from the old session are ignored
      startNow();
    }, END_WATCHDOG_MS);
  }

  function restart(delayMs) {
    clearTimeout(timer);
    if (running) {
      endForRestart('abort');
      return;
    }
    timer = setTimeout(startNow, delayMs);
  }

  function startNow() {
    if (stopped) return;
    if (track.readyState !== 'live') {
      apply({ type: 'error', error: 'audio-capture', trackEnded: true });
      return;
    }
    const rec = new Recognition();
    debug('startNow', { lang: lane.lang });
    rec.lang = lane.lang;
    rec.continuous = true;
    rec.interimResults = true;
    rec.maxAlternatives = 1;
    const mySession = ++session;
    // Chrome sometimes ends a session (our stop(), a silent failure) without sending a
    // final for the text it had shown as in progress. That text is kept as final.
    let pending = null;
    const flush = () => {
      if (!pending) return;
      const p = pending;
      pending = null;
      onResult({ side, session: mySession, resultIndex: p.index, text: p.text, final: true, lang: rec.lang });
    };
    flushPending = flush;
    // A session proves the speech service works by sending a result, or by running
    // HEALTHY_AFTER_MS without an error (see core/lane-policy.js).
    let healthySent = false;
    let sessionFailed = false;
    let healthyTimer = null;
    const sendHealthy = () => {
      if (recognition !== rec || healthySent || sessionFailed || stopped) return;
      healthySent = true;
      clearTimeout(healthyTimer);
      apply({ type: 'healthy' });
    };

    rec.onstart = () => {
      debug('onstart', { mine: recognition === rec });
      if (recognition !== rec) return;
      apply({ type: 'started' });
      healthyTimer = setTimeout(sendHealthy, HEALTHY_AFTER_MS);
    };
    rec.onresult = (e) => {
      if (recognition !== rec) return;
      sendHealthy();
      const { finals, interim } = summarizeResults(e.results, e.resultIndex);
      debug('result', { from: e.resultIndex, total: e.results.length, finals: finals.length, interim: interim ? interim.text.slice(-30) : null, finalText: finals.map((x) => x.text.slice(-30)).join(' | ') });
      for (const f of finals) {
        if (pending && f.index >= pending.index) pending = null;
        onResult({ side, session: mySession, resultIndex: f.index, text: f.text, final: true, lang: rec.lang });
      }
      if (interim) {
        pending = { index: interim.index, text: interim.text };
        onResult({ side, session: mySession, resultIndex: interim.index, text: interim.text, final: false, lang: rec.lang });
      }
    };
    rec.onerror = (e) => {
      debug('onerror', { err: e.error, mine: recognition === rec });
      if (recognition !== rec || stopped) return;
      sessionFailed = true;
      clearTimeout(healthyTimer);
      apply({ type: 'error', error: e.error, ours: restartAfterEnd, trackEnded: track.readyState !== 'live' });
    };
    rec.onend = () => {
      debug('onend', { mine: recognition === rec, restartAfterEnd });
      if (recognition !== rec) return;
      clearTimeout(healthyTimer);
      clearTimeout(endWatchdog);
      flush();
      running = false;
      if (stopped) return;
      if (restartAfterEnd) {
        restartAfterEnd = false;
        timer = setTimeout(startNow, 0);
        return;
      }
      apply({ type: 'end' });
    };

    recognition = rec;
    try {
      rec.start(track);   // the MediaStreamTrack overload (Chrome 133+)
      running = true;
    } catch {
      running = false;
      apply({ type: 'error', error: 'start-failed' });
    }
  }

  const onOffline = () => { if (!stopped) apply({ type: 'offline' }); };
  const onOnline = () => { if (!stopped) apply({ type: 'online' }); };

  function teardown() {
    stopped = true;
    clearTimeout(timer);
    clearTimeout(endWatchdog);
    win.removeEventListener('offline', onOffline);
    win.removeEventListener('online', onOnline);
    if (recognition) {
      try { recognition.abort(); } catch { /* already ended */ }
    }
    running = false;
  }

  return {
    start() {
      win.addEventListener('offline', onOffline);
      win.addEventListener('online', onOnline);
      apply({ type: 'start' });
    },
    setLang(newLang) {
      if (!stopped && newLang !== lane.lang) apply({ type: 'lang-change', lang: newLang });
    },
    // Ends the current session gracefully so Chrome returns the pending text as final,
    // then starts a new session at once (see core/pause-finalizer.js).
    // Replaces a session that has gone quiet while sound keeps arriving
    // (core/stall-watch.js).
    restartNow() {
      debug('restartNow', { restartAfterEnd });
      if (stopped || restartAfterEnd) return;
      if (running) endForRestart('abort');
      else {
        clearTimeout(timer);
        startNow();
      }
    },
    finalizeNow() {
      debug('finalizeNow', { restartAfterEnd });
      if (stopped || !running || restartAfterEnd) return;
      endForRestart('stop');
    },
    stop() {
      if (!stopped) apply({ type: 'stop' });
    },
    get state() { return { ...lane }; },
  };
}
