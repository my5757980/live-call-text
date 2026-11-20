// What a recognition lane does next after each event (research.md R5, data-model Lane).
// Pure: the browser runner (browser/recognizer.js) carries out the returned action.
//
// Chrome always fires `end` after `error`, so errors only change the state and the
// following `end` decides when to restart. That avoids starting twice.
//
// Chrome fires `start` locally, before it reaches the speech service. So a pause is only
// cleared by `healthy`, which the runner sends on the first result or after a session
// has run 3 s without an error. While the browser is offline, nothing clears the pause.
//
// A session that ends normally (Chrome ends a quiet one after about 8 s) is replaced at
// once, so no first word falls into a gap. A session that ends before it started, or
// within a second with nothing heard ("quick"), did not work: those are retried more
// slowly, and the third in a row pauses the lane with the speech-service message.

export const RESTART_AFTER_END_MS = 0;
export const HEALTHY_AFTER_MS = 3000;
export const QUICK_END_MS = 1000;
export const QUICK_ENDS_BEFORE_PAUSE = 3;
export const RETRY_DELAYS_MS = Object.freeze([500, 1000, 2000, 3000]);

export const retryDelay = (step) => RETRY_DELAYS_MS[Math.min(step, RETRY_DELAYS_MS.length - 1)];

export const initialLane = (lang) => ({
  state: 'idle', retryStep: 0, pauseReason: null, lang, offline: false, quickEnds: 0,
});

const PAUSE_MESSAGES = { 'no-internet': 'W_NO_INTERNET', 'speech-service': 'W_SPEECH_SERVICE' };

function result(lane, changes, action = 'none', delayMs = 0) {
  const next = { ...lane, ...changes };
  const message = next.state === 'paused' ? PAUSE_MESSAGES[next.pauseReason] ?? null : null;
  return { ...next, action, delayMs, message };
}

const pause = (lane, reason) => result(lane, { state: 'paused', pauseReason: reason });

function onError(lane, event) {
  switch (event.error) {
    case 'network':
      return pause(lane, 'no-internet');
    case 'not-allowed':
    case 'service-not-allowed':
      return pause(lane, 'speech-service');
    case 'audio-capture':
      return event.trackEnded
        ? result(lane, { state: 'stopped', pauseReason: null, retryStep: 0 }, 'stop')
        : pause(lane, 'speech-service');
    case 'language-not-supported':
      return result(lane, { lang: 'en-US' });
    case 'start-failed': // start() threw, so no `end` event will follow
      return result(lane, { state: lane.state === 'paused' ? 'paused' : 'starting', retryStep: lane.retryStep + 1 },
        'restart', retryDelay(lane.retryStep));
    default: // no-speech, aborted and anything else: the following `end` restarts
      return result(lane, {});
  }
}

function onEnd(lane, event) {
  if (lane.state === 'paused') {
    return result(lane, { retryStep: lane.retryStep + 1 }, 'restart', retryDelay(lane.retryStep));
  }
  // The session never reached `start`: retry with the back-off steps.
  if (lane.state === 'starting') {
    const retryStep = lane.retryStep + 1;
    const failed = retryStep >= QUICK_ENDS_BEFORE_PAUSE
      ? { state: 'paused', pauseReason: 'speech-service' }
      : {};
    return result(lane, { ...failed, retryStep }, 'restart', retryDelay(lane.retryStep));
  }
  // The session started but ended at once with nothing heard.
  if (event.quick) {
    const quickEnds = (lane.quickEnds ?? 0) + 1;
    const failed = quickEnds >= QUICK_ENDS_BEFORE_PAUSE
      ? { state: 'paused', pauseReason: 'speech-service' }
      : { state: 'starting' };
    return result(lane, { ...failed, retryStep: quickEnds, quickEnds }, 'restart', retryDelay(quickEnds - 1));
  }
  return result(lane, { state: 'starting', retryStep: 0, quickEnds: 0 }, 'restart', RESTART_AFTER_END_MS);
}

export function decide(lane, event) {
  if (lane.state === 'stopped') return result(lane, {});
  switch (event.type) {
    case 'start':
      return result(lane, { state: 'starting' }, 'restart', 0);
    case 'started':
      return lane.state === 'paused'
        ? result(lane, {})
        : result(lane, { state: 'listening', retryStep: 0, pauseReason: null });
    case 'healthy':
      return lane.offline
        ? result(lane, {})
        : result(lane, { state: 'listening', retryStep: 0, pauseReason: null, quickEnds: 0 });
    case 'end':
      return onEnd(lane, event);
    case 'error':
      return onError(lane, event);
    case 'offline':
      return result(lane, { state: 'paused', pauseReason: 'no-internet', offline: true });
    case 'online':
      return lane.state === 'paused' && lane.pauseReason === 'no-internet'
        ? result(lane, { retryStep: 0, offline: false }, 'restart', 0)
        : result(lane, { offline: false });
    case 'lang-change':
      return result(lane, { lang: event.lang, state: lane.state === 'paused' ? 'paused' : 'starting' }, 'restart', 0);
    case 'stop':
      return result(lane, { state: 'stopped', pauseReason: null, retryStep: 0 }, 'stop');
    default:
      return result(lane, {});
  }
}
