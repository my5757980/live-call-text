// Customer page entry (/v.html#<sid>): shows the agent's words live, nothing else
// (FR-025 to FR-028).
import { sidFromHash } from './core/link-session.js';
import { isRtl } from './core/prefs.js';
import { VIEWER_LABELS, VIEWER_NOTE } from './core/messages.js';
import { connectViewer } from './browser/viewer-client.js';

const statusEl = document.querySelector('[data-testid="v-status"]');
const transcript = document.querySelector('[data-testid="v-transcript"]');
const noteEl = document.querySelector('[data-testid="v-note"]');
const FOLLOW_PX = 60;

// The phone's screen stays on while there is something to read, where the browser allows
// it (Screen Wake Lock). Without it the screen switches off after a few seconds.
const KEEP_AWAKE = ['waiting', 'live', 'paused'];
let state = 'connecting';
let wakeLock = null;
let wakeBusy = false;
let wakeAgain = false;

async function keepScreenOn() {
  if (wakeBusy) {
    wakeAgain = true;   // the state changed while the browser was answering: check once more
    return;
  }
  wakeBusy = true;
  do {
    wakeAgain = false;
    const want = KEEP_AWAKE.includes(state) && document.visibilityState === 'visible';
    try {
      if (want && !wakeLock) {
        const lock = (await navigator.wakeLock?.request('screen')) ?? null;
        lock?.addEventListener?.('release', () => { if (wakeLock === lock) wakeLock = null; });
        wakeLock = lock;
      } else if (!want && wakeLock) {
        const lock = wakeLock;
        wakeLock = null;
        await lock.release();
      }
    } catch {
      // Not allowed or not supported: the page works the same without it.
    }
  } while (wakeAgain);
  wakeBusy = false;
}

function showStatus(next) {
  state = next;
  const label = VIEWER_LABELS[next];
  statusEl.dataset.state = next;
  statusEl.querySelector('.en').textContent = label.en;
  statusEl.querySelector('.ur').textContent = label.ur;
  keepScreenOn();
}

function showCaption(caption) {
  const follow = transcript.scrollHeight - transcript.scrollTop - transcript.clientHeight <= FOLLOW_PX;
  let el = transcript.querySelector(`[data-caption-id="${CSS.escape(caption.id)}"]`);
  if (!el) {
    el = document.createElement('p');
    el.className = 'v-line';
    el.dataset.testid = 'v-line';
    el.dataset.captionId = caption.id;
    const text = document.createElement('span');
    text.className = 'text';
    el.append(text);
    transcript.append(el);
  }
  const rtl = isRtl(caption.lang);
  el.lang = rtl ? 'ur' : 'en';
  el.dir = rtl ? 'rtl' : 'ltr';
  el.dataset.final = String(caption.final);
  el.querySelector('.text').textContent = caption.text;
  if (follow) transcript.scrollTop = transcript.scrollHeight;
}

noteEl.querySelector('.en').textContent = VIEWER_NOTE.en;
noteEl.querySelector('.ur').textContent = VIEWER_NOTE.ur;

// The screen lock is released by the browser when the page is hidden; ask again on return.
document.addEventListener('visibilitychange', keepScreenOn);
// Another link opened in this same tab belongs to another call: load it afresh.
window.addEventListener('hashchange', () => location.reload());

const sid = sidFromHash(location.hash);
showStatus('connecting');
if (!sid) {
  showStatus('invalid');
} else {
  connectViewer({ origin: location.origin, sid, onStatus: showStatus, onCaption: showCaption });
}
