---
id: 18
title: Echo filter without headset
stage: green
date: 2026-10-03
surface: agent
model: claude-opus-5-5
feature: 001-live-call-text
branch: 001-live-call-text (no git repo)
user: Muhammad Yaseen
command: none (free-form request)
labels: ["echo","headset","filter","tdd","FR-038"]
links:
  spec: specs/001-live-call-text/spec.md
  ticket: null
  adr: null
  pr: null
files:
 - web/js/core/echo-filter.js
 - web/js/core/transcript.js
 - web/js/browser/render.js
 - web/js/agent.js
 - tests/unit/echo-filter.test.js
 - tests/unit/transcript.test.js
 - tests/e2e/echo.spec.js
 - specs/001-live-call-text/spec.md (FR-038)
 - specs/001-live-call-text/tasks.md (T084)
 - specs/001-live-call-text/test-log.md
tests:
 - npm run test:unit → 99 passed
 - npx playwright test --retries=0 → 31 passed, 2 skipped
---

## Prompt

haaaaaaa

## Response snapshot

The owner agreed to the duplicate-text filter. Built test-first:
- `echo-filter.js`: an Agent line with at least 60% of its words in what the customer said within ±2.5 s counts as echo. Arabic yeh/kaf are normalised. Lines of one word are never judged. It only applies when both sides use the same language.
- `transcript.markEcho`; render hides echo lines (`data-echo`).
- `agent.js` re-checks recent Agent lines on every Customer update.
- Customer-link sending: while call sound is active, in-progress Agent words are held, and each final is sent after a 1.2 s re-check. Echo is never sent.
- Spec FR-038, task T084, and test-log updated.
- Results: unit 99/99; e2e 31 passed (+2 skipped).

## Outcome

- ✅ Impact: Without a headset, the customer's voice no longer shows up as Agent text when both sides use the same language.
- 🧪 Tests: unit 99, e2e 31
- 📁 Files: see the list above
- 🔁 Next prompts: the owner reloads the page (Ctrl+R) and re-tests the real call
- 🧠 Reflection: Echo in a different language can't be matched by text; the headset stays the real fix.

## Evaluation notes (flywheel)

- Failure modes observed: none in the tests
- Graders run and results (PASS/FAIL): PASS
- Prompt variant (if applicable): none
- Next experiment (smallest change to try): Watch for false hiding when the agent repeats the customer's words straight away.
