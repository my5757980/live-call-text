---
id: 17
title: Customer words also shown as Agent
stage: misc
date: 2026-10-03
surface: agent
model: claude-opus-5-5
feature: 001-live-call-text
branch: 001-live-call-text (no git repo)
user: Muhammad Yaseen
command: none (free-form request)
labels: ["real-call","echo","headset","echoCancellation"]
links:
  spec: specs/001-live-call-text/spec.md
  ticket: null
  adr: null
  pr: null
files:
 - web/js/browser/capture.js
 - tests/e2e/helpers/stand-in-mic.js
 - tests/e2e/us2-agent-mic.spec.js
 - specs/001-live-call-text/research.md
 - specs/001-live-call-text/test-log.md
 - history/prompts/001-live-call-text/17-customer-words-also-as-agent.misc.prompt.md
tests:
 - us2-agent-mic (new echoCancellation check, red then green)
 - us2 + us3 e2e → 8 passed
 - real Chrome 154 check: the mic offers echoCancellation [true, false, "remote-only"]
---

## Prompt

achaa ya koi  error to nahii jab mayy agent bol raha huu to mujayy maeraaa text bhiii agent kayy namee sayy jo mayy bol raha huu likin jab customer bol rahaaa haiii tooo customer text mujayy show ho rahaa haii likin sath agent ban kar text bhi a rah haii kuee ya koi error haii deeplyy dekhoooo

## Response snapshot

- **Diagnosis**:
  - The code wiring is correct: the mic feeds the Agent side and the shared sound feeds the Customer side, as covered by the tests.
  - This laptop has only built-in Speakers and a built-in Microphone; no headset is connected.
  - So the customer's voice plays from the speakers, reaches the mic, and shows up as Agent text too. That is echo, the spec's "No headset" edge case, not a code bug.
- **Change** (test-first): the mic constraint now asks for `echoCancellation: "all"` (Chrome 141+).
  - A real Chrome 154 check on this laptop shows Windows only offers `[true, false, "remote-only"]`, so the fix there is a headset.
- **Records**: findings logged in research R4 and test-log.
- **Offer**: an optional duplicate-text filter, on request.

## Outcome

- ✅ Impact: Root cause confirmed (no headset); mic set to system-wide echo removal where Chrome supports it.
- 🧪 Tests: us2/us3 8/8 pass; the real-Chrome capability check is recorded
- 📁 Files: capture.js, stand-in-mic.js, us2-agent-mic.spec.js, research.md, test-log.md
- 🔁 Next prompts: re-test with earphones; optionally add the duplicate filter
- 🧠 Reflection: Checking the actual audio devices on the machine turned a guess into a confirmed cause.

## Evaluation notes (flywheel)

- Failure modes observed: echo from speakers into the mic without a headset
- Graders run and results (PASS/FAIL): e2e PASS; manual T076 PARTIAL
- Prompt variant (if applicable): none
- Next experiment (smallest change to try): Re-test with wired earphones.
