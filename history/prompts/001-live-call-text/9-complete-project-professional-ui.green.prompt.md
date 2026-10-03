---
id: 9
title: Complete project with professional UI
stage: green
date: 2026-10-03
surface: agent
model: claude-opus-5-5
feature: 001-live-call-text
branch: 001-live-call-text (no git repo)
user: Muhammad Yaseen
command: /sp.implement (continued)
labels: ["implement","us2","us3","relay","durable-objects","ui-ux","dark-mode","tdd"]
links:
  spec: specs/001-live-call-text/spec.md
  ticket: null
  adr: null
  pr: null
files:
 - web/index.html (redesigned)
 - web/css/app.css (design system, light and dark)
 - web/css/viewer.css
 - web/v.html
 - web/guide.html
 - web/js/agent.js
 - web/js/viewer.js
 - web/js/guide.js
 - web/js/core/link-session.js
 - web/js/core/protocol.js
 - web/js/core/throttle.js
 - web/js/browser/render.js
 - web/js/browser/recognizer.js
 - web/js/browser/capture.js
 - web/js/browser/relay-client.js
 - web/js/browser/viewer-client.js
 - relay/src/index.js
 - relay/src/hub.js
 - relay/src/hub-logic.js
 - wrangler.jsonc
 - tests/unit/link-session.test.js
 - tests/unit/protocol.test.js
 - tests/unit/throttle.test.js
 - tests/unit/hub-logic.test.js
 - tests/relay/relay.test.js
 - tests/e2e/us2-agent-mic.spec.js
 - tests/e2e/us2-mic-problems.spec.js
 - tests/e2e/us3-link.spec.js
 - tests/e2e/polish.spec.js
 - tests/e2e/layout.spec.js
 - tests/e2e/soak.spec.js
 - tests/e2e/visibility.spec.js
 - tests/e2e/us1-errors.spec.js
 - tests/e2e/helpers/chrome.js
 - specs/001-live-call-text/spec.md (FR-037)
 - specs/001-live-call-text/tasks.md
 - specs/001-live-call-text/test-log.md
 - specs/001-live-call-text/research.md
 - specs/001-live-call-text/plan.md
 - specs/001-live-call-text/quickstart.md
 - specs/001-live-call-text/contracts/ui-contract.md
tests:
 - npm run test:unit → 84 passed, 0 failed
 - npm run test:relay → 9 passed, 0 failed
 - npx playwright test --retries=0 → 30 passed, 2 skipped (soak opt-in, visibility fixme)
 - SOAK_MINUTES=10 soak → see test-log
 - npx wrangler deploy --dry-run → bundles OK (nothing uploaded)
---

## Prompt

nahii tuum poora project 1005 banaa doo aik bar hii poora test karayy gayyyyy ok or uiux is project ki abhii achii nahiiii uiux aik dam professional decent honii chiyaaaa karooo project complete  jaldiee karoooooo

## Response snapshot

- **Process**: Deferred T042 into the final real-call session (the owner wants one test at the end). Added FR-037 (professional look and feel) to the spec, and T081-T083 to tasks.
- **UI/UX redesign** (T081-T083):
  - **Shared design system**: a professional console with an app bar and status chip, a controls card, icon banners, a chat-style conversation (Customer left, Agent right, in-progress pulse, Urdu RTL, empty state), a customer-link card, and a footer.
  - **Themes**: light and dark via `prefers-color-scheme`.
  - **Customer page**: mobile-first, with a bilingual status chip.
  - **Guide**: Roman Urdu, in a card layout with numbered steps. Its message table is filled from the live catalog.
  - **Layout checks**: no horizontal scroll at 640 / 390 px, and contrast of at least 4.5:1 in both themes.
- **US2 (T043-T048)**:
  - The microphone side shares the Start click with the customer side; blocked or missing mics show warnings and customer captions continue.
  - **Finding 4**: Chrome may not fire `end` after an early abort. Added a 1.5 s watchdog to the runner.
- **US3 (T049-T066)**:
  - **Core**: link-session (token → sid hash, 4 h expiry), the protocol (schema-exact), and the throttle.
  - **Relay**: hub-logic plus the hub Durable Object (hibernation, tags and attachments, no storage, replacement on reconnect), and the Worker entry. `wrangler.jsonc` now has `main`, the DO binding and the SQLite migration.
  - **Clients**: relay-client ("live" only after the relay confirms, backoff for 60 s) and viewer-client (paused → ended after 60 s).
  - **Pages**: v.html and viewer.js; agent.js copies the link and sends only the agent's lines.
- **Polish (T067-T073)**:
  - **Guide**: guide.html is complete.
  - **Checks**: polish (headings, 22/24 px) and layout tests pass.
  - **Soak**: the soak test is opt-in.
  - **Visibility**: can't be measured under Playwright (Finding 5). Kept as fixme; it is now manual step 10.
  - **System-audio flag**: only the underscore spelling works.
  - **Full run**: unit 84/84, relay 9/9, e2e 30 passed (2 skipped).
  - **Deploy check**: the wrangler dry-run bundles.
- **Left for the owner**: T074-T080 (account and deploy with approval, the phone check, real-call checklists A-D, the agent trial).

## Outcome

- ✅ Impact: Every automated task is done. The product is feature-complete with a professional UI; only owner-gated and manual real-call tasks remain.
- 🧪 Tests: unit 84/84, relay 9/9, e2e 30/30 (+2 skipped), wrangler dry-run OK
- 📁 Files: see the list above
- 🔁 Next prompts: owner's single real-call test session (quickstart §5, A-D); then deploy approval (T074)
- 🧠 Reflection: Real browser tests found two Chrome behaviours that unit tests could not: the early-abort missing `end`, and visibility under automation.

## Evaluation notes (flywheel)

- Failure modes observed:
  - The mic warning hid the "no message" assumption in the offline test (test fixed).
  - The `~` part ids conflicted with the schema id pattern (changed to `:p1`).
  - Playwright `routeWebSocket` mocks report open first, so the relay-client now waits for the relay's `live` status.
- Graders run and results (PASS/FAIL): unit PASS, relay PASS, e2e PASS, layout/contrast PASS
- Prompt variant (if applicable): none
- Next experiment (smallest change to try): Tune the pause-finalizer `minLevel` from real call noise during the owner's test.
