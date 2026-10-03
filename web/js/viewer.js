// Customer page entry (/v.html#<sid>): shows the agent's words live, nothing else
// (FR-025 to FR-028).
import { isValidSid } from './core/link-session.js';
import { isRtl } from './core/prefs.js';
import { VIEWER_LABELS } from './core/messages.js';
import { connectViewer } from './browser/viewer-client.js';

const statusEl = document.querySelector('[data-testid="v-status"]');
const transcript = document.querySelector('[data-testid="v-transcript"]');
const FOLLOW_PX = 60;

function showStatus(state) {
  const label = VIEWER_LABELS[state];
  statusEl.dataset.state = state;
  statusEl.querySelector('.en').textContent = label.en;
  statusEl.querySelector('.ur').textContent = label.ur;
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

const sid = decodeURIComponent(location.hash.slice(1));
showStatus('connecting');
if (!isValidSid(sid)) {
  showStatus('invalid');
} else {
  connectViewer({ origin: location.origin, sid, onStatus: showStatus, onCaption: showCaption });
}
