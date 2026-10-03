---
id: 11
title: Start server and fix long-call stall
stage: green
date: 2026-10-03
surface: agent
model: claude-opus-5-5
feature: 001-live-call-text
branch: 001-live-call-text (no git repo)
user: Muhammad Yaseen
command: none (free-form request)
labels: ["dev-server","soak","stall","reliability","web-speech-api"]
links:
  spec: specs/001-live-call-text/spec.md
  ticket: null
  adr: null
  pr: null
files:
 - web/js/core/stall-watch.js
 - web/js/browser/recognizer.js
 - web/js/agent.js
 - tests/unit/stall-watch.test.js
 - specs/001-live-call-text/test-log.md
 - specs/001-live-call-text/research.md
 - specs/001-live-call-text/plan.md
tests:
 - npm run test:unit → 90 passed
 - npm run test:relay → 9 passed
 - npx playwright test --retries=0 → 30 passed, 2 skipped
 - 8-minute diagnostic soak → 26/26 rounds (before the fix it stalled)
---

## Prompt

server chalao

## Response snapshot

- **Server**: started `wrangler dev --port 8787` in the background; http://localhost:8787 answers 200.
- **Soak result**: the background 10-minute soak (T069) had failed at about 3 minutes, so I told the owner to wait before testing.
- **Diagnosis**: added localhost-only recognition event logging. A Chrome session can stop sending results while audio keeps arriving, with no error and no `end`. Some `stop()` calls also ended a session without a final for its in-progress text.
- **Fix** (test-first):
  - `core/stall-watch.js` restarts a lane after 3 s of sound with no result (8 s cooldown); 6 unit tests.
  - The runner turns a session's unfinished text into a final line when the session ends, and gained `restartNow()`.
- **Results**:
  - The 8-minute diagnostic soak passed 26/26 rounds; the stall watch fired twice.
  - Full regression green: unit 90, relay 9, e2e 30 (+2 skipped).
- **Pending**: the official 10-minute soak re-run is deferred until after the owner's real-call session, because it plays clips in a background browser.

## Outcome

- ✅ Impact: Long-call reliability fixed before the owner's single real-call test; the server is running for that test.
- 🧪 Tests: unit 90/90, relay 9/9, e2e 30/30 (+2 skipped), diagnostic soak 26/26
- 📁 Files: stall-watch.js (+ test), recognizer.js, agent.js, docs
- 🔁 Next prompts: owner runs the real-call checklists at http://localhost:8787; afterwards re-run `SOAK_MINUTES=10`
- 🧠 Reflection: Only the long soak exposed this Chrome behaviour. The 60-minute real-call check (T079) still matters.

## Evaluation notes (flywheel)

- Failure modes observed: silent Chrome session stall; `stop()` without a final.
- Graders run and results (PASS/FAIL): unit, relay and e2e PASS; diagnostic soak PASS after the fix
- Prompt variant (if applicable): none
- Next experiment (smallest change to try): Tune the stall-watch `minLevel`/`soundMs` with real call noise if false restarts show up in the event log.
