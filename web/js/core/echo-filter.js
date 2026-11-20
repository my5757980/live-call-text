// Echo filter (FR-038). Without a headset the customer's voice from the laptop speakers
// reaches the microphone and is recognised again as Agent text. An Agent line counts as
// echo when at least 60% of its words appear in what the customer said at the same time.
// It only works when both sides use the same language setting: echo in another language
// comes out as different words, so the headset reminder stays the main fix.
//
// The same words alone are not proof: an agent often says the customer's words back to
// confirm them. Echo is heard while the customer is speaking; a repeat comes after. So when
// the caller knows how much of the agent's speech overlapped the customer's
// (core/speech-overlap.js) and it is less than 30%, the line is the agent's own.

const PUNCT = /[.,!?؟،۔;:"'“”‘’()[\]{}…-]/g;

export function words(text) {
  return String(text ?? '')
    .toLowerCase()
    .replace(/ي/g, 'ی')
    .replace(/ك/g, 'ک')
    .replace(PUNCT, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

export function createEchoFilter({ windowMs = 2500, minWords = 2, threshold = 0.6, minOverlap = 0.3 } = {}) {
  const customer = new Map();   // line id -> { at, lastAt, words }

  function noteCustomer(line, now = line.at) {
    const entry = customer.get(line.id) ?? { at: line.at, lastAt: now, words: new Set() };
    entry.words = new Set(words(line.text));
    entry.lastAt = Math.max(entry.lastAt, now);
    customer.set(line.id, entry);
    for (const [id, e] of customer) if (now - e.lastAt > windowMs * 4) customer.delete(id);
  }

  // `agentLastAt` is the latest time the Agent line changed; the two lines overlap in
  // time when their active periods come within windowMs of each other.
  // `overlap` is the share (0 to 1) of the agent's speech during which the customer was
  // speaking too, or null when that is not known.
  function isEcho(agentLine, agentLastAt = agentLine.at, overlap = null) {
    if (typeof overlap === 'number' && overlap < minOverlap) return false;
    const agentWords = words(agentLine.text);
    if (agentWords.length < minWords) return false;
    const heard = new Set();
    for (const e of customer.values()) {
      if (e.at - windowMs <= agentLastAt && agentLine.at <= e.lastAt + windowMs) {
        e.words.forEach((w) => heard.add(w));
      }
    }
    if (!heard.size) return false;
    const hits = agentWords.filter((w) => heard.has(w)).length;
    return hits / agentWords.length >= threshold;
  }

  return { noteCustomer, isEcho };
}
