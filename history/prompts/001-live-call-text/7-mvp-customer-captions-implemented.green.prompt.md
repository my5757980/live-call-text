---
id: 7
title: MVP customer captions implemented
stage: green
date: 2026-10-03
surface: agent
model: claude-opus-5-5
feature: 001-live-call-text
branch: 001-live-call-text (no git repo)
user: Muhammad Yaseen
command: /sp.implement
labels: ["implement","mvp","us1","tdd","web-speech-api","urdu","playwright"]
links:
  spec: specs/001-live-call-text/spec.md
  ticket: null
  adr: null
  pr: null
files:
 - package.json
 - package-lock.json
 - wrangler.jsonc
 - .gitignore
 - playwright.config.js
 - web/index.html
 - web/css/app.css
 - web/js/agent.js
 - web/js/core/messages.js
 - web/js/core/support.js
 - web/js/core/prefs.js
 - web/js/core/transcript.js
 - web/js/core/lane-policy.js
 - web/js/core/source-check.js
 - web/js/core/silence-watch.js
 - web/js/core/pause-finalizer.js
 - web/js/browser/render.js
 - web/js/browser/audio-graph.js
 - web/js/browser/recognizer.js
 - web/js/browser/capture.js
 - tests/unit/messages.test.js
 - tests/unit/support.test.js
 - tests/unit/prefs.test.js
 - tests/unit/transcript.test.js
 - tests/unit/lane-policy.test.js
 - tests/unit/source-check.test.js
 - tests/unit/silence-watch.test.js
 - tests/unit/pause-finalizer.test.js
 - tests/e2e/helpers/chrome.js
 - tests/e2e/helpers/stand-in-mic.js
 - tests/e2e/helpers/system-audio.js
 - tests/e2e/foundation.spec.js
 - tests/e2e/us1-tab.spec.js
 - tests/e2e/us1-system-audio.spec.js
 - tests/e2e/us1-errors.spec.js
 - tests/fixtures/audio/ (en.mp3, ur.mp3, en-quiet.wav, ur-quiet.wav, README.md)
 - tests/fixtures/pages/whatsapp-standin.html
 - specs/001-live-call-text/tasks.md
 - specs/001-live-call-text/test-log.md
 - specs/001-live-call-text/research.md
 - specs/001-live-call-text/data-model.md
 - specs/001-live-call-text/plan.md
 - specs/001-live-call-text/contracts/ui-contract.md
tests:
 - npm run test:unit → 59 passed, 0 failed
 - npx playwright test --retries=0 → 16 passed, 0 failed (foundation 5, us1-tab 5, us1-errors 4, us1-system-audio 2)
---

## Prompt

/sp.implement

(The command was run with no text. As agreed, Claude built the MVP first, T001-T042, and stopped at T042, the manual real-call check with the owner.)

## Response snapshot

- Prerequisites: the checklist passed 16/16.
- Setup (T001-T011):
  - Folders, package.json, wrangler.jsonc (assets only until T061), .gitignore and the Playwright config.
  - Fixtures copied from the 2026-10-02 tests, plus quiet WAVs made with ffmpeg.
  - Stand-in WhatsApp tab, Chrome launch helpers, stand-in mic, and a system-audio player.
  - Toolchain: Node 24.5, Wrangler 4.147, Playwright 1.63, Chrome 154.
- Foundation (T012-T030), test-first: messages, support, prefs, transcript (with summarizeResults), lane-policy, the page shell, CSS, render, audio-graph, recognizer and the agent.js bootstrap.
- US1 (T031-T041), test-first: source-check, silence-watch, capture, and the full customer-side wiring in agent.js.
- Two real problems found and fixed through tests:
  1. Chrome 154 finalizes Urdu only at session end, about 14 s after speech. Added pause-finalizer.js: after a 1.5 s pause, `stop()` gets the final back in about 0.2 s, and the lane restarts at once.
  2. Chrome fires `start` before it reaches the speech service, so the status would flicker to Listening while offline. Added the `healthy` event and an offline flag to lane-policy.
- Results: unit 59/59; e2e 16/16 in a clean run with no retries. That covers the Urdu and English tabs, Urdu and English through system audio, all four error cases, the language switch, stop and new section, and auto-scroll.
- Stopped at T042, the manual real WhatsApp Web call with the owner, before starting US2.

## Outcome

- ✅ Impact: MVP (User Story 1) works: customer speech becomes live Customer lines for WhatsApp Web tabs and for Entire screen + system audio, in Urdu and English, with clear fixes for sharing problems.
- 🧪 Tests: 59 unit + 16 e2e passing; every red phase recorded in test-log.md
- 📁 Files: see the list above
- 🔁 Next prompts: T042 real WhatsApp Web call with the owner (`npm run dev`, http://localhost:8787); then continue /sp.implement for US2 (T043-T048) and US3 (T049-T066)
- 🧠 Reflection: The automated tests caught the Urdu-finalization behaviour and the offline status flicker before any real call. Both would have hurt agents in real use.

## Evaluation notes (flywheel)

- Failure modes observed:
  - A test-regex bug matched the contract header (fixed).
  - The tasks assumed `wrangler.jsonc` could name a `main` that doesn't exist yet (deferred to T061).
  - The `--use-fake-ui-for-media-stream` flag was dropped to protect the tab auto-select.
- Graders run and results (PASS/FAIL): unit PASS (59/59); e2e PASS (16/16)
- Prompt variant (if applicable): none
- Next experiment (smallest change to try): Tune the pause-finalizer `minLevel` against real call noise during T042.
