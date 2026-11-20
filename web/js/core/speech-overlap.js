// How much of the agent's speaking time fell on moments when the customer was speaking
// too. Echo of the customer reaches the microphone WHILE the customer speaks, so it
// overlaps almost fully. An agent who says the customer's words back afterwards (to
// confirm a number, say) overlaps very little. The echo filter uses this to tell the two
// apart (FR-038, review 2026-11-12).

export function createSpeechOverlap({
  holdMs = 300,         // the customer counts as speaking this long around each detected moment
  minAgentMs = 500,     // with less agent speech than this, there is no answer
  keepMs = 30000,
  stepMs = 100,         // length of the first sample
  maxStepMs = 500,      // a late timer never counts for more than this
} = {}) {
  const samples = [];   // { t, dt, agent, customer }, oldest first
  let lastAt = null;

  return {
    // Call about every 100 ms with whether each side is speaking right now.
    sample({ agent, customer }, now) {
      const dt = lastAt === null ? stepMs : Math.min(Math.max(now - lastAt, 0), maxStepMs);
      lastAt = now;
      samples.push({ t: now, dt, agent: Boolean(agent), customer: Boolean(customer) });
      while (samples.length && now - samples[0].t > keepMs) samples.shift();
    },

    // The agent's speech between `from` and `to`: how long, and how much of it overlapped.
    // `ratio` is null when there was too little agent speech to judge.
    ratio(from, to) {
      const heard = samples
        .filter((s) => s.customer && s.t >= from - holdMs && s.t <= to + holdMs)
        .map((s) => s.t);
      let agentMs = 0;
      let overlapMs = 0;
      for (const s of samples) {
        if (!s.agent || s.t < from || s.t > to) continue;
        agentMs += s.dt;
        if (heard.some((t) => Math.abs(t - s.t) <= holdMs)) overlapMs += s.dt;
      }
      return { agentMs, overlapMs, ratio: agentMs >= minAgentMs ? overlapMs / agentMs : null };
    },
  };
}
