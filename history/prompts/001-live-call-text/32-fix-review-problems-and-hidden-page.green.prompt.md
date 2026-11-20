---
id: 32
title: Fix review problems and hidden page
stage: green
date: 2026-11-20
surface: agent
model: claude-opus-5-5
feature: 001-live-call-text
branch: main
user: Muhammad Yaseen
command: none (free-form request, continued)
labels: ["review-fixes","echo","pause-finalizer","stall-watch","hidden-page","worker-ticker","customer-link","relay-hardening","tdd"]
links:
  spec: specs/001-live-call-text/spec.md
  ticket: null
  adr: null
  pr: https://github.com/my5757980/live-call-text
files:
 - web/js/agent.js
 - web/js/browser/capture.js
 - web/js/browser/recognizer.js
 - web/js/browser/audio-graph.js
 - web/js/browser/relay-client.js
 - web/js/browser/viewer-client.js
 - web/js/browser/ticker.js (new)
 - web/js/browser/tick-worker.js (new)
 - web/js/core/speech-overlap.js (new)
 - web/js/core/echo-filter.js
 - web/js/core/pause-finalizer.js
 - web/js/core/stall-watch.js
 - web/js/core/lane-policy.js
 - web/js/core/transcript.js
 - web/js/core/link-session.js
 - web/js/core/messages.js
 - web/js/viewer.js
 - web/index.html
 - web/v.html
 - web/guide.html
 - web/_headers (new)
 - relay/src/index.js
 - relay/src/hub.js
 - relay/src/hub-logic.js
 - tests/unit/ (recognizer, relay-client, viewer-client, speech-overlap, ticker new; echo-filter, hub-logic, lane-policy, link-session, messages, pause-finalizer, stall-watch, transcript updated)
 - tests/relay/relay.test.js
 - tests/e2e/ (echo, us1-tab, us1-system-audio, us2-mic-problems, us3-link, helpers/stand-in-mic)
 - specs/001-live-call-text/ (spec, tasks, test-log, research, data-model, quickstart, contracts/ui-contract, contracts/relay-protocol, checklists/requirements)
 - README.md
 - package-lock.json (npm audit fix)
tests:
 - npm run test:unit → 180 passed, 0 failed
 - npm run test:relay → 13 passed, 0 failed
 - npx playwright test --retries=0 → 44 passed, 0 failed, 2 skipped (Chrome 157)
 - SOAK_MINUTES=10 soak → passed (11.3 min)
 - red runs first for every fix (unit 20 failing, relay 3 failing, e2e 5 failing, ticker/recognizer 16 failing, stall 2 failing, frame rate 1 failing)
 - temporary experiments: hidden page over the DevTools protocol, capture processing settings, screen-picture CPU, fast English re-check, echo event log
---

## Prompt

continue

(The owner's request was "haaa shuruu karoo jo jo maslayy haii fix karoo project 1oo% complete karoooo" (PHR 31). The work was interrupted several times; each time the owner sent "continue".)

## Response snapshot

Fixed every code problem from the 2026-11-12 review, test-first, and recorded everything in test-log and tasks (T093-T107):

- **English cut-off** (Finding 9): caused by Chrome's echo cancellation on the captured call sound; switched off (PHR 31).
- **Echo filter**: only words heard while the customer speaks count as echo, so a repeat-back is shown, also on the customer link. A possible echo is held back from the link and checked again (Finding 12, found in the final run).
- **Pause check**: watches the text too, so it no longer ends a session at every word on a noisy line.
- **Microphone unplugged mid-call**: shows a message, and the agent side comes back by itself.
- **Silent speech-service failure**: quick-ending sessions back off and pause with a message, and so do 3 fruitless stall restarts. Normal restarts happen at once, with no timer gap.
- **Stall watch**: counts only changing text as progress.
- **Customer link**:
  - a refused copy shows a message;
  - Copy retries a link that gave up;
  - waiting lines are paced so the relay keeps them.
- **Customer page**:
  - a damaged link shows "not valid";
  - a new link in the same tab loads its call;
  - the screen stays on while live;
  - an ended page stops listening.
- **Wording**: "Call audio is never recorded" replaces "Nothing is recorded".
- **Relay**:
  - Origin check before the hub;
  - viewers that send, and agents that flood, are closed;
  - no new viewers after 4 h;
  - CSP and security headers.
- **CPU**: the screen picture runs at 1 frame a second, about a third less CPU.
- **Hidden page** (Finding 10, measured over the DevTools protocol): Chrome ran the page's checks once a second. They now tick from a worker at 100 ms (500 runs in 50 s while hidden).
- **Fast English** re-measured: it stops on every path, the microphone included, so it is a speech-service limit. Kept as a known limit.
- **Other**: `npm audit fix` (0 vulnerabilities; Wrangler 4.165.0); spec FR-041 to FR-043 added and others amended; guide, quickstart, README and contracts updated.

Not done (needs the owner): real-call checklists, deploy (owner's Cloudflare login and approval), 60-minute call and agent trial, license choice, commit and push.

## Outcome

- ✅ Impact: All automated checks pass on today's Chrome. Long calls, hidden pages, echo, unplugged mics and link failures are handled and tested.
- 🧪 Tests: unit 180, relay 13, e2e 44 (+2 skipped), 10-minute soak passed
- 📁 Files: see the list above (46 changed, 9 new)
- 🔁 Next prompts: the owner approves a push to GitHub and the Cloudflare deploy; real-call tests with two people
- 🧠 Reflection: Running the full suite once more after "done" found Finding 12. The earlier green run had passed by timing luck, so repeat runs matter for timing-dependent features.

## Evaluation notes (flywheel)

- Failure modes observed:
  - a long relay red run hung (the test waited for a close that never came; it now has a 20 s limit);
  - one hidden-page run ended with "Stopped" for an unknown reason (not reproduced in 3 runs);
  - an echo line reached the customer link (fixed).
- Graders run and results (PASS/FAIL): unit PASS, relay PASS, e2e PASS, soak PASS
- Prompt variant (if applicable): none
- Next experiment (smallest change to try): Run the hidden-page DevTools check during a real call, and keep WhatsApp in front for 6 minutes.
