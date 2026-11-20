// Agent page entry: wires the pure core logic and the browser adapters to the DOM.
import { checkSupport, readEnv } from './core/support.js';
import { loadPrefs, savePrefs } from './core/prefs.js';
import { createTranscript } from './core/transcript.js';
import { pickMessage, HEADSET_REMINDER, PRIVACY_LINE } from './core/messages.js';
import { checkSource, shareErrorCode } from './core/source-check.js';
import { createSilenceWatch } from './core/silence-watch.js';
import { createPauseFinalizer } from './core/pause-finalizer.js';
import { createStallWatch } from './core/stall-watch.js';
import { createEchoFilter } from './core/echo-filter.js';
import { createSpeechOverlap } from './core/speech-overlap.js';
import { createLinkSession } from './core/link-session.js';
import { buildCallRecord } from './core/record.js';
import { createRelayClient } from './browser/relay-client.js';
import { startCallCapture, onTrackEnded, getMicrophone } from './browser/capture.js';
import { createAudioPath } from './browser/audio-graph.js';
import { createLaneRunner } from './browser/recognizer.js';
import { startTicker } from './browser/ticker.js';
import * as render from './browser/render.js';

const byId = (id) => document.querySelector(`[data-testid="${id}"]`);
const el = {
  start: byId('start'),
  stop: byId('stop'),
  status: byId('status'),
  customerLang: byId('customer-lang'),
  agentLang: byId('agent-lang'),
  meterCall: byId('meter-call'),
  meterMic: byId('meter-mic'),
  transcript: byId('transcript'),
  message: byId('message'),
  hint: byId('hint'),
  copyLink: byId('copy-link'),
  linkStatus: byId('link-status'),
  saveChat: byId('save-chat'),
  newCall: byId('new-call'),
  dialog: byId('unsaved-dialog'),
};

const isLocal = ['localhost', '127.0.0.1'].includes(location.hostname);
const params = new URLSearchParams(location.search);
// Tests play a deliberately quiet clip through the speakers; only on localhost may they boost it.
const testGain = isLocal ? Math.max(1, Number(params.get('testGain')) || 1) : 1;

const METER_SCALE = 3;            // speech after the AGC is about 0.1-0.3 RMS; scale it to fill the bar
const SILENCE_MIN_LEVEL = 0.002;  // raw RMS; a silent share is exactly 0
const METER_INTERVAL_MS = 100;

// Codes a new Start clears; browser-support errors stay.
const CLEARED_ON_START = [
  'E_SHARE_CANCELLED', 'E_NO_CALL_SOUND_SCREEN', 'E_NO_CALL_SOUND_WINDOW', 'E_NO_CALL_SOUND_TAB',
  'I_SHARING_STOPPED', 'W_MIC_BLOCKED', 'W_MIC_MISSING', 'W_NO_INTERNET', 'W_SPEECH_SERVICE',
  'I_LINK_COPIED', 'W_LINK_UNAVAILABLE', 'W_LINK_COPY_FAILED', 'I_CHAT_SAVED',
];

function storage() {
  try { return window.localStorage; } catch { return null; }
}

const transcript = createTranscript();
const active = new Set();                          // message codes currently true
const laneReasons = { customer: null, agent: null }; // pause reason per side
let callCount = 0;
let call = null;                                   // the call being listened to, if any
// The call whose chat is on screen (User Story 4): its times, languages and whether the
// agent has saved it since its last new line.
let shown = null;

function showMessages() {
  render.renderMessage(el.message, pickMessage([...active]));
}

function toggle(code, on) {
  if (on) active.add(code);
  else active.delete(code);
}

function setStatus(status) {
  render.renderStatus(el.status, status);
}

function listeningStatus() {
  const reason = laneReasons.customer;
  return reason ? { state: 'paused', pauseReason: reason } : { state: 'listening', source: call.source };
}

// "Speech service not responding": a lane paused for it, or sessions that keep going quiet
// while someone speaks (core/stall-watch.js `stuck`).
function speechServiceDown() {
  const stuck = Object.values(call?.stalls ?? {}).some((w) => w.stuck);
  return stuck || Object.values(laneReasons).includes('speech-service');
}

function onLaneState(side, lane) {
  laneReasons[side] = lane.state === 'paused' ? lane.pauseReason : null;
  const reasons = Object.values(laneReasons);
  toggle('W_NO_INTERNET', reasons.includes('no-internet'));
  toggle('W_SPEECH_SERVICE', speechServiceDown());
  showMessages();
  if (call && side === 'customer') setStatus(listeningStatus());
}

function onResult(callId, result) {
  // A session that is being stopped can still hand over its last words. If the agent has
  // already pressed New call, they must not land in the fresh conversation.
  if (!transcript.hasCall(callId)) return;
  const live = call?.id === callId ? call : null;
  if (live) {
    const t = performance.now();
    live.finalizers[result.side]?.onResult(result, t);
    // Only words that change count as progress for the stall watch (test-log Finding 9).
    live.stalls[result.side]?.onResult(t, `${result.session}:${result.resultIndex}:${result.text}`);
  }
  const now = Date.now();
  const { changed } = transcript.applyResult({ callId, ...result, at: now });
  for (let line of changed) {
    if (line.side === 'customer') {
      echo.noteCustomer(line, now);
      recheckAgentEcho(callId);
    } else {
      agentLastAt.set(line.id, now);
      if (!line.echo && isAgentEcho(line, now)) line = transcript.markEcho(line.id);
    }
    render.renderLine(el.transcript, line);
    if (line.side === 'agent' && live) sendAgentLine(live, line);
    if (shown?.id === callId && !line.echo) {
      shown.hasText = true;
      shown.saved = false;
    }
  }
  updateChatButtons();
}

// ---------- Echo filter (FR-038) ----------

const ECHO_HOLD_MS = 1500;       // ...for this long after the sound
const ECHO_SEND_DELAY_MS = 2000; // a possible echo's final line waits this long, then is checked again
const ECHO_MAYBE_MS = 4000;      // with too little Agent speech to judge, customer speech this recent counts
const ECHO_MIN_OVERLAP = 0.3;    // the same share core/echo-filter.js uses
const ECHO_RECHECK_MS = 6000;    // Agent lines this recent are re-checked on customer updates
const ECHO_LEAD_MS = 2000;       // a line's first words appear up to about 2 s after they are spoken
let echo = createEchoFilter();
let overlap = createSpeechOverlap();
const agentLastAt = new Map();   // Agent line id -> last update time
let customerSoundUntil = 0;

// Echo can only be recognised as the same words when both sides use one language.
const sameLanguage = () => el.customerLang.value === el.agentLang.value;

// Echo reaches the microphone while the customer is speaking. An agent who says the
// customer's words back afterwards overlaps very little, and is not echo.
function isAgentEcho(line, lastAt) {
  if (!sameLanguage()) return false;
  return echo.isEcho(line, lastAt, overlap.ratio(line.at - ECHO_LEAD_MS, lastAt).ratio);
}

function recheckAgentEcho(callId) {
  if (!sameLanguage()) return;
  const now = Date.now();
  for (const line of transcript.getLines(callId)) {
    if (line.side !== 'agent' || line.echo || now - line.at > ECHO_RECHECK_MS) continue;
    if (isAgentEcho(line, agentLastAt.get(line.id) ?? line.at)) {
      render.renderLine(el.transcript, transcript.markEcho(line.id));
    }
  }
}

// Whether an Agent line could still turn out to be echo: the customer is talking now, or
// the agent's words were spoken while the customer was speaking. The words of such a line
// can arrive late (a new recognition session, a slow result), after the customer's words
// that would show it is echo.
function mayBeEcho(line) {
  if (!sameLanguage()) return false;
  const now = Date.now();
  if (now < customerSoundUntil) return true;
  const share = overlap.ratio(line.at - ECHO_LEAD_MS, now).ratio;
  if (share === null) return now - (customerSoundUntil - ECHO_HOLD_MS) < ECHO_MAYBE_MS;
  return share >= ECHO_MIN_OVERLAP;
}

// Only the agent's own words go to the customer link (FR-026), never their echo. The
// in-progress words of a possible echo are not sent; its final line waits 2 s and is
// checked again against everything the customer has said by then.
function sendAgentLine(c, line) {
  if (!c.link || line.echo) return;
  clearTimeout(c.pendingSends.get(line.id));
  const send = (l) => c.link?.client.sendCaption({ id: l.id, text: l.text, final: l.final, lang: l.lang });
  if (!mayBeEcho(line)) {
    send(line);
    return;
  }
  if (!line.final) return;
  c.pendingSends.set(line.id, setTimeout(() => {
    c.pendingSends.delete(line.id);
    let latest = transcript.getLines(c.id).find((l) => l.id === line.id);
    if (!latest || call !== c) return;
    if (!latest.echo && isAgentEcho(latest, agentLastAt.get(latest.id) ?? latest.at)) {
      latest = transcript.markEcho(latest.id);
      render.renderLine(el.transcript, latest);
    }
    if (!latest.echo) send(latest);
  }, ECHO_SEND_DELAY_MS));
}

// ---------- Customer link (User Story 3) ----------

const LINK_SHOWS_URL = ['connecting', 'live', 'reconnecting'];
const FLASH_MS = 4000;
const FLASH_WARNING_MS = 8000;   // a warning needs longer to read
const flashTimers = new Map();

// Shows a short answer to what the agent just pressed (I_LINK_COPIED, I_CHAT_SAVED,
// W_LINK_COPY_FAILED) for a few seconds.
function flash(code, ms = FLASH_MS) {
  active.add(code);
  showMessages();
  clearTimeout(flashTimers.get(code));
  flashTimers.set(code, setTimeout(() => {
    active.delete(code);
    showMessages();
  }, ms));
}

function renderLink(link) {
  const s = el.linkStatus;
  if (!link) {
    s.dataset.state = 'off';
    s.textContent = '';
    delete s.dataset.url;
    return;
  }
  s.dataset.state = link.state;
  s.dataset.url = link.session.url;
  s.textContent = LINK_SHOWS_URL.includes(link.state) ? link.session.url : '';
}

function onLinkState(c, state) {
  if (!c.link) return;
  c.link.state = state;
  if (call === c) {
    toggle('W_LINK_UNAVAILABLE', state === 'unavailable');
    showMessages();
  }
  renderLink(c.link);
}

async function onCopyLink() {
  const c = call;
  if (!c) return;
  if (!c.link) {
    const session = await createLinkSession({ origin: location.origin });
    if (call !== c) return;
    c.link = { session, state: 'connecting', client: null };
    c.link.client = createRelayClient({ origin: location.origin, session, onState: (s) => onLinkState(c, s) });
    renderLink(c.link);
  } else {
    c.link.client.retry();   // if the link gave up after a long outage, try again now
  }
  try {
    await navigator.clipboard.writeText(c.link.session.url);
    active.delete('W_LINK_COPY_FAILED');
    flash('I_LINK_COPIED');
  } catch {
    // Chrome refused: the link stays on screen in link-status for copying by hand.
    active.delete('I_LINK_COPIED');
    flash('W_LINK_COPY_FAILED', FLASH_WARNING_MS);
  }
}

function backToReady(code) {
  if (code) active.add(code);
  showMessages();
  el.start.disabled = false;
  setStatus({ state: 'ready' });
}

// Start always begins a fresh conversation, after offering to save the last one (FR-040).
function onStartClick() {
  if (call || el.start.disabled) return;
  keepRecordThen(() => {
    clearChat();
    startCall();
  });
}

async function startCall() {
  if (call || el.start.disabled) return;
  CLEARED_ON_START.forEach((code) => active.delete(code));
  showMessages();
  el.start.disabled = true;
  setStatus({ state: 'choosing' });

  let capture;
  try {
    capture = await startCallCapture();   // must run inside the click (user activation)
  } catch (err) {
    backToReady(shareErrorCode(err));
    return;
  }

  const check = checkSource({
    audioTracks: capture.stream.getAudioTracks().length,
    displaySurface: capture.displaySurface,
  });
  if (!check.ok) {
    capture.stream.getTracks().forEach((t) => t.stop());
    backToReady(check.code);
    return;
  }
  beginCall(capture, check.source);
}

function beginCall(capture, source) {
  const id = `call-${++callCount}`;
  const startedAt = Date.now();
  transcript.startCall({ id, startedAt });
  render.renderSection(el.transcript, { id, startedAt });
  shown = {
    id, startedAt, endedAt: null,
    customerLang: el.customerLang.value, agentLang: el.agentLang.value,
    hasText: false, saved: false,
  };

  const audioContext = new AudioContext();
  audioContext.resume().catch(() => {});
  const customerPath = createAudioPath(audioContext, capture.audioTrack, { gain: testGain });
  const silence = createSilenceWatch({ thresholdMs: 20000, minLevel: SILENCE_MIN_LEVEL });
  silence.start(performance.now());

  call = {
    id, source, capture, audioContext, silence,
    lanes: {},
    paths: { customer: customerPath },
    finalizers: { customer: createPauseFinalizer() },
    stalls: { customer: createStallWatch() },
    pendingSends: new Map(),
  };
  call.lanes.customer = createLaneRunner({
    side: 'customer',
    track: customerPath.recognitionTrack,
    lang: el.customerLang.value,
    onResult: (r) => onResult(id, r),
    onState: (s) => onLaneState('customer', s),
    onDebug: debugLog,
  });
  call.detachEnded = onTrackEnded(capture.stream, () => stopCall('sharing-ended'));

  el.start.hidden = true;
  el.start.disabled = false;
  el.stop.hidden = false;
  el.copyLink.disabled = false;
  renderLink(null);
  setStatus({ state: 'listening', source });
  call.lanes.customer.start();
  // Ticks from a worker, so the checks keep their pace while the page is hidden.
  call.stopTicker = startTicker(tickMeters, METER_INTERVAL_MS);
  if (isLocal) window.__lct.state.capture = capture;
  updateChatButtons();
  startAgentSide(call);
}

// The agent's own words (User Story 2). Runs after the call is already listening, so a
// missing or blocked microphone never delays or stops customer captions (FR-017).
async function startAgentSide(c) {
  if (c.micStarting || c.lanes.agent) return;
  c.micStarting = true;
  const mic = await getMicrophone();
  c.micStarting = false;
  if (call !== c) {                       // the call stopped while Chrome was asking
    mic.stream?.getTracks().forEach((t) => t.stop());
    return;
  }
  toggle('W_MIC_BLOCKED', mic.code === 'W_MIC_BLOCKED');
  toggle('W_MIC_MISSING', mic.code === 'W_MIC_MISSING');
  showMessages();
  if (mic.code) {
    el.meterMic.dataset.state = 'unavailable';
    return;
  }
  c.micStream = mic.stream;
  c.paths.agent = createAudioPath(c.audioContext, mic.track, { gain: 1 });
  c.finalizers.agent = createPauseFinalizer();
  c.stalls.agent = createStallWatch();
  c.lanes.agent = createLaneRunner({
    side: 'agent',
    track: c.paths.agent.recognitionTrack,
    lang: el.agentLang.value,
    onResult: (r) => onResult(c.id, r),
    onState: (s) => onLaneState('agent', s),
    onDebug: debugLog,
  });
  c.lanes.agent.start();
  // A headset unplugged during the call ends its track.
  c.detachMicEnded = onTrackEnded(mic.stream, () => onMicEnded(c));
  el.meterMic.dataset.state = 'on';
}

function stopAgentSide(c) {
  c.detachMicEnded?.();
  c.detachMicEnded = null;
  c.lanes.agent?.stop();
  c.paths.agent?.stop();
  c.micStream?.getTracks().forEach((t) => t.stop());
  delete c.lanes.agent;
  delete c.paths.agent;
  delete c.finalizers.agent;
  delete c.stalls.agent;
  c.micStream = null;
  for (const line of transcript.finalizeOpen(c.id, 'agent')) render.renderLine(el.transcript, line);
}

// The microphone went away during the call. The Agent side stops and the page says so;
// customer captions go on (FR-017). The laptop may have another microphone, so the page
// tries again at once, and again whenever Chrome reports a device change.
function onMicEnded(c) {
  stopAgentSide(c);
  if (call !== c) return;
  render.renderMeter(el.meterMic, 0);
  el.meterMic.dataset.state = 'unavailable';
  active.add('W_MIC_MISSING');
  showMessages();
  startAgentSide(c);
}

function onDeviceChange() {
  if (call && active.has('W_MIC_MISSING')) startAgentSide(call);
}

// Pause and stall checks use each side's speech detection (adaptive to background noise)
// instead of a fixed loudness, so soft speakers are not mistaken for silence.
const SPEECH = 1;
const QUIET = 0;

function tickMeters() {
  if (!call) return;
  const now = performance.now();
  const customer = call.paths.customer;
  const level = customer.getLevel();
  const customerTalking = customer.isSpeech() ? SPEECH : QUIET;
  if (customerTalking) customerSoundUntil = Date.now() + ECHO_HOLD_MS;
  render.renderMeter(el.meterCall, level * METER_SCALE);
  render.renderHint(el.hint, call.silence.sample(level, now).showHint);
  if (call.finalizers.customer.sample(customerTalking, now)) call.lanes.customer.finalizeNow();
  if (call.stalls.customer.sample(customerTalking, now)) call.lanes.customer.restartNow();
  if (call.paths.agent) {
    const agentTalking = call.paths.agent.isSpeech() ? SPEECH : QUIET;
    overlap.sample({ agent: agentTalking === SPEECH, customer: customerTalking === SPEECH }, Date.now());
    render.renderMeter(el.meterMic, call.paths.agent.getLevel() * METER_SCALE);
    if (call.finalizers.agent.sample(agentTalking, now)) call.lanes.agent.finalizeNow();
    if (call.stalls.agent.sample(agentTalking, now)) call.lanes.agent.restartNow();
  }
  const down = speechServiceDown();
  if (down !== active.has('W_SPEECH_SERVICE')) {
    toggle('W_SPEECH_SERVICE', down);
    showMessages();
  }
}

function stopCall(reason) {
  if (!call) return;
  const c = call;
  call = null;
  c.stopTicker?.();
  c.detachEnded?.();
  c.detachMicEnded?.();
  c.pendingSends.forEach((timer) => clearTimeout(timer));
  c.link?.client.end();                    // the customer page shows "Call ended" (FR-028)
  el.copyLink.disabled = true;
  active.delete('W_LINK_UNAVAILABLE');
  active.delete('W_LINK_COPY_FAILED');
  active.delete('I_LINK_COPIED');
  Object.values(c.lanes).forEach((runner) => runner.stop());
  Object.values(c.paths).forEach((path) => path.stop());
  c.capture.stream.getTracks().forEach((t) => t.stop());
  c.micStream?.getTracks().forEach((t) => t.stop());
  c.audioContext.close().catch(() => {});
  for (const line of transcript.finalizeOpen(c.id)) render.renderLine(el.transcript, line);

  laneReasons.customer = null;
  laneReasons.agent = null;
  active.delete('W_NO_INTERNET');
  active.delete('W_SPEECH_SERVICE');
  if (reason === 'sharing-ended') active.add('I_SHARING_STOPPED');
  showMessages();
  render.renderHint(el.hint, false);
  render.renderMeter(el.meterCall, 0);
  render.renderMeter(el.meterMic, 0);
  el.meterMic.dataset.state = 'off';
  el.stop.hidden = true;
  el.start.hidden = false;
  el.start.disabled = false;
  setStatus({ state: 'stopped' });
  if (shown?.id === c.id) shown.endedAt = Date.now();
  updateChatButtons();
}

// ---------- Save chat and New call (User Story 4) ----------

let afterDialog = null;   // what to do once the agent answers "Save this call first?"

function updateChatButtons() {
  el.saveChat.disabled = !shown?.hasText;
  el.saveChat.classList.toggle('saved', Boolean(shown?.saved));
  el.saveChat.querySelector('.label').textContent = shown?.saved ? 'Saved' : 'Save chat';
  el.newCall.disabled = Boolean(call) || !shown;
}

function downloadText(filename, text) {
  const url = URL.createObjectURL(new Blob(['\ufeff', text], { type: 'text/plain;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

// Saves the shown call's chat as a text file on this laptop (FR-039). Nothing is uploaded.
function saveChat() {
  if (!shown?.hasText) return;
  const { filename, text } = buildCallRecord({
    call: shown,
    lines: transcript.getLines(shown.id),
    customerLang: shown.customerLang,
    agentLang: shown.agentLang,
    endedAt: shown.endedAt,
  });
  downloadText(filename, text);
  shown.saved = true;
  flash('I_CHAT_SAVED');
  updateChatButtons();
}

// Clears the conversation so the next call starts on an empty page (FR-040).
function clearChat() {
  transcript.clear();
  el.transcript.querySelectorAll('[data-testid="call-section"]').forEach((section) => section.remove());
  agentLastAt.clear();
  echo = createEchoFilter();
  overlap = createSpeechOverlap();
  shown = null;
  renderLink(null);
  updateChatButtons();
}

// Runs `next` at once if there is nothing unsaved; otherwise asks first (FR-040).
function keepRecordThen(next) {
  if (!shown?.hasText || shown.saved) {
    next();
    return;
  }
  afterDialog = next;
  el.dialog.showModal();
}

function answerDialog(choice) {
  const next = afterDialog;
  afterDialog = null;
  el.dialog.close();
  if (choice === 'cancel') return;
  if (choice === 'save') saveChat();
  next?.();   // still inside the agent's click, so Start can open Chrome's share window
}

// Test hook (localhost only): adds a final Customer line without audio.
let syntheticIndex = 0;
function addSyntheticLine(text) {
  const id = 'call-test';
  if (!transcript.getCalls().some((c) => c.id === id)) {
    const startedAt = Date.now();
    transcript.startCall({ id, startedAt });
    render.renderSection(el.transcript, { id, startedAt });
  }
  onResult(id, { side: 'customer', session: 1, resultIndex: syntheticIndex++, text, final: true, lang: 'en-US' });
}

// Localhost only: a short ring buffer of recognition events for diagnosing tests.
const debugLines = [];
function debugLog(entry) {
  if (!isLocal) return;
  debugLines.push(entry);
  if (debugLines.length > 400) debugLines.shift();
}

function boot() {
  byId('headset-reminder').textContent = HEADSET_REMINDER;
  byId('privacy-line').textContent = PRIVACY_LINE;
  render.enableAutoFollow(el.transcript);

  const prefs = loadPrefs(storage());
  el.customerLang.value = prefs.customerLang;
  el.agentLang.value = prefs.agentLang;
  const save = () => savePrefs(storage(), { customerLang: el.customerLang.value, agentLang: el.agentLang.value });
  el.customerLang.addEventListener('change', () => {
    save();
    call?.lanes.customer?.setLang(el.customerLang.value);   // FR-012
    if (call && shown?.id === call.id) shown.customerLang = el.customerLang.value;
  });
  el.agentLang.addEventListener('change', () => {
    save();
    call?.lanes.agent?.setLang(el.agentLang.value);         // FR-012
    if (call && shown?.id === call.id) shown.agentLang = el.agentLang.value;
  });

  el.start.addEventListener('click', onStartClick);
  el.saveChat.addEventListener('click', saveChat);
  el.newCall.addEventListener('click', () => keepRecordThen(clearChat));
  byId('dialog-save').addEventListener('click', () => answerDialog('save'));
  byId('dialog-discard').addEventListener('click', () => answerDialog('discard'));
  byId('dialog-cancel').addEventListener('click', () => answerDialog('cancel'));
  el.dialog.addEventListener('cancel', () => { afterDialog = null; });   // Esc key
  // Chrome's own "Leave site?" warning while a chat is not saved (FR-040).
  window.addEventListener('beforeunload', (e) => {
    if (shown?.hasText && !shown.saved) {
      e.preventDefault();
      e.returnValue = '';
    }
  });
  el.stop.addEventListener('click', () => stopCall('user'));
  el.copyLink.addEventListener('click', onCopyLink);
  window.addEventListener('pagehide', () => stopCall('pagehide'));
  // A microphone that was missing, or unplugged during the call, may be back.
  navigator.mediaDevices?.addEventListener?.('devicechange', onDeviceChange);

  setStatus({ state: 'ready' });

  const support = checkSupport(readEnv(window));
  if (!support.ok) {
    el.start.disabled = true;
    active.add(support.code);
    showMessages();
  }

  if (isLocal) {
    window.__lct = { transcript, render, el, testGain, state: {}, addSyntheticLine, log: debugLines };
  }
}

boot();
