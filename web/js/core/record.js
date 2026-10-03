// The call record an agent saves after a call (spec FR-039, User Story 4): a plain text
// file with a header and every line as "[HH:MM:SS] Customer: …" / "[HH:MM:SS] Agent: …".
// Echo of the customer picked up by the agent's microphone (FR-038) is left out.

const LANG_NAMES = { 'en-US': 'English', 'ur-PK': 'Urdu' };
const SIDE_NAMES = { customer: 'Customer', agent: 'Agent' };

const pad = (n) => String(n).padStart(2, '0');
const dateOf = (ms) => {
  const d = new Date(ms);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
const timeOf = (ms) => {
  const d = new Date(ms);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
};

function durationOf(ms) {
  const total = Math.max(0, Math.round(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return h ? `${h} h ${m} min ${s} s` : `${m} min ${s} s`;
}

export function buildCallRecord({ call, lines, customerLang, agentLang, endedAt }) {
  const start = new Date(call.startedAt);
  const filename = `call-${dateOf(call.startedAt)}_${pad(start.getHours())}-${pad(start.getMinutes())}.txt`;
  const body = lines
    .filter((l) => !l.echo && String(l.text ?? '').trim())
    .sort((a, b) => a.at - b.at)
    .map((l) => `[${timeOf(l.at)}] ${SIDE_NAMES[l.side] ?? l.side}: ${l.text.trim()}`);
  const header = [
    'Live Call Text - call record',
    `Date: ${dateOf(call.startedAt)}`,
    `Started: ${timeOf(call.startedAt)}`,
    `Ended: ${endedAt ? timeOf(endedAt) : 'still running'}`,
    `Duration: ${endedAt ? durationOf(endedAt - call.startedAt) : 'still running'}`,
    `Customer language: ${LANG_NAMES[customerLang] ?? customerLang}`,
    `Agent language: ${LANG_NAMES[agentLang] ?? agentLang}`,
    '-'.repeat(48),
  ];
  return { filename, text: [...header, ...(body.length ? body : ['(no text)']), ''].join('\n') };
}
