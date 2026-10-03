// Calls and caption lines, kept in page memory only (data-model.md: Call, CaptionLine).
// Each side has at most one in-progress line; a final result replaces it (FR-011).

export function createTranscript() {
  const calls = [];
  const lines = new Map();     // line id -> line
  const open = new Map();      // `${callId}:${side}` -> id of the in-progress line
  let seq = 0;

  const copy = (line) => ({ ...line });

  function startCall({ id, startedAt }) {
    const call = { id, startedAt };
    calls.push(call);
    return { ...call };
  }

  function finalize(id, changed) {
    const line = lines.get(id);
    if (line && !line.final) {
      line.final = true;
      changed.push(copy(line));
    }
  }

  function applyResult({ callId, side, session, resultIndex, text, final, lang, at }) {
    const value = String(text ?? '').trim();
    if (!value) return { line: null, changed: [] };
    const id = `${callId}:${side}:${session}:${resultIndex}`;
    const key = `${callId}:${side}`;
    const changed = [];

    const openId = open.get(key);
    if (openId && openId !== id) {
      finalize(openId, changed);
      open.delete(key);
    }

    let line = lines.get(id);
    if (!line) {
      line = { id, callId, side, text: value, final: Boolean(final), lang, at, seq: seq++ };
      lines.set(id, line);
    } else if (line.final && !final) {
      return { line: copy(line), changed };   // a late interim after the final is ignored
    } else {
      line.text = value;
      line.final = Boolean(final);
      if (lang) line.lang = lang;
    }

    if (line.final) open.delete(key);
    else open.set(key, id);
    changed.push(copy(line));
    return { line: copy(line), changed };
  }

  // New call (FR-040): forgets every call and line, so nothing of the last call remains.
  function clear() {
    calls.length = 0;
    lines.clear();
    open.clear();
    seq = 0;
  }

  // Flags a line as echo of the customer (core/echo-filter.js); the flag survives updates.
  function markEcho(id) {
    const line = lines.get(id);
    if (!line) return null;
    line.echo = true;
    return copy(line);
  }

  function finalizeOpen(callId) {
    const changed = [];
    for (const [key, id] of open) {
      if (key.startsWith(`${callId}:`)) {
        finalize(id, changed);
        open.delete(key);
      }
    }
    return changed;
  }

  function getLines(callId) {
    return [...lines.values()]
      .filter((l) => !callId || l.callId === callId)
      .sort((a, b) => a.at - b.at || a.seq - b.seq)
      .map(copy);
  }

  const getCalls = () => calls.map((c) => ({ ...c }));

  return { startCall, applyResult, markEcho, finalizeOpen, getLines, getCalls, clear };
}

// Turns one SpeechRecognition result event into new final results plus one merged
// in-progress piece. Chrome lists finals first, then one or more interim pieces; the
// next final appears at the index of the first interim piece, so that index is the
// in-progress line's id and nothing gets duplicated.
export function summarizeResults(results, resultIndex = 0) {
  const finals = [];
  let interimIndex = -1;
  let interimText = '';
  for (let i = resultIndex; i < results.length; i++) {
    const result = results[i];
    const text = result?.[0]?.transcript ?? '';
    if (result.isFinal) {
      if (text.trim()) finals.push({ index: i, text: text.trim() });
    } else {
      if (interimIndex === -1) interimIndex = i;
      interimText += text;
    }
  }
  const interim = interimIndex >= 0 && interimText.trim()
    ? { index: interimIndex, text: interimText.trim() }
    : null;
  return { finals, interim };
}
