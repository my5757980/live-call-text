// DOM rendering for the agent page (contracts/ui-contract.md).
import { isRtl } from '../core/prefs.js';
import { messageFor } from '../core/messages.js';

const SOURCE_TEXT = {
  tab: 'Listening to a browser tab',
  screen: "Listening to the laptop's sound",
  window: 'Listening to an app window',
};
const PAUSE_TEXT = {
  'no-internet': 'Paused: No internet',
  'speech-service': 'Paused: Speech service not responding',
};
const SIDE_LABEL = { customer: 'Customer', agent: 'Agent' };
const FOLLOW_PX = 40;

export function statusText({ state, source, pauseReason }) {
  switch (state) {
    case 'listening': return SOURCE_TEXT[source] ?? SOURCE_TEXT.screen;
    case 'paused': return PAUSE_TEXT[pauseReason] ?? 'Paused';
    case 'choosing': return 'Choose the call in the share window...';
    case 'stopped': return 'Stopped';
    default: return 'Ready';
  }
}

export function renderStatus(el, status) {
  el.dataset.state = status.state;
  el.textContent = statusText(status);
}

export function renderMessage(el, code) {
  if (!code) {
    el.hidden = true;
    el.textContent = '';
    delete el.dataset.code;
    delete el.dataset.level;
    return;
  }
  const { text, level } = messageFor(code);
  el.dataset.code = code;
  el.dataset.level = level;
  el.textContent = text;
  el.hidden = false;
}

export function renderHint(el, show) {
  if (show) {
    el.dataset.code = 'H_NO_CALL_SOUND';
    el.textContent = messageFor('H_NO_CALL_SOUND').text;
  }
  el.hidden = !show;
}

export function renderMeter(el, level) {
  const value = Math.max(0, Math.min(1, Number(level) || 0));
  el.dataset.level = value.toFixed(2);
  el.style.setProperty('--level', value);
}

// True while the view is at (or within 40 px of) the bottom (FR-010).
export const isNearBottom = (el) => el.scrollHeight - el.scrollTop - el.clientHeight <= FOLLOW_PX;

// Whether each transcript was following the newest text at the last scroll or update.
const following = new WeakMap();

// Keeps the newest line in view when the transcript box itself shrinks or grows (for
// example when a message banner appears above it), unless the agent has scrolled up.
export function enableAutoFollow(container) {
  following.set(container, true);
  container.addEventListener('scroll', () => following.set(container, isNearBottom(container)), { passive: true });
  new ResizeObserver(() => {
    if (following.get(container) !== false) container.scrollTop = container.scrollHeight;
  }).observe(container);
}

function keepFollowing(container, mutate) {
  const follow = isNearBottom(container);
  const result = mutate();
  if (follow) container.scrollTop = container.scrollHeight;
  following.set(container, follow);
  return result;
}

const timeText = (ms) => new Date(ms).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

export function renderSection(container, call) {
  return keepFollowing(container, () => {
    const section = document.createElement('section');
    section.className = 'call-section';
    section.dataset.testid = 'call-section';
    section.dataset.callId = call.id;
    const heading = document.createElement('h2');
    heading.className = 'call-time';
    heading.textContent = `Call started ${timeText(call.startedAt)}`;
    section.append(heading);
    container.append(section);
    return section;
  });
}

export function renderLine(container, line) {
  keepFollowing(container, () => {
    let el = container.querySelector(`[data-line-id="${CSS.escape(line.id)}"]`);
    if (!el) {
      const section = container.querySelector(`[data-call-id="${CSS.escape(line.callId)}"]`) ?? container;
      el = document.createElement('p');
      el.className = 'line';
      el.dataset.testid = 'line';
      el.dataset.lineId = line.id;
      el.dataset.side = line.side;
      const who = document.createElement('span');
      who.className = 'who';
      who.textContent = SIDE_LABEL[line.side] ?? line.side;
      const text = document.createElement('span');
      text.className = 'text';
      el.append(who, text);
      section.append(el);
    }
    const rtl = isRtl(line.lang);
    el.lang = rtl ? 'ur' : 'en';
    el.dir = rtl ? 'rtl' : 'ltr';
    el.dataset.lang = line.lang ?? '';
    el.dataset.at = String(line.at ?? '');
    el.dataset.final = String(Boolean(line.final));
    el.querySelector('.text').textContent = line.text;
    // Echo of the customer picked up by the agent's microphone stays hidden (FR-038).
    if (line.echo) {
      el.dataset.echo = 'true';
      el.hidden = true;
    }
  });
}
